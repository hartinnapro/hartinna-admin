<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Inventory</h1>
        <div class="page-sub">Current stock levels</div>
      </div>
    </div>

    <div class="card table-card">
      <div class="loading-center" v-if="loading"><div class="spinner"></div><span>Loading…</span></div>
      <table class="data-table" v-else>
        <thead>
          <tr>
            <th>Product</th>
            <th style="text-align:right;">Available</th>
            <th style="text-align:right;">Held</th>
            <th style="text-align:right;">Reserved</th>
            <th style="text-align:right;">Total</th>
            <th>Alert</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in inventory" :key="item.product_id">
            <td>
              <div style="font-weight:500;">{{ item.products?.name }}</div>
              <div style="font-size:11.5px; color:var(--text-muted);">{{ item.products?.sku }}</div>
            </td>
            <td style="text-align:right; font-weight:600;" :class="item.qty_available <= item.low_stock_threshold ? 'low-stock' : ''">
              {{ item.qty_available }}
            </td>
            <td style="text-align:right; color:var(--text-muted);">{{ item.qty_held }}</td>
            <td style="text-align:right; color:var(--text-muted);">{{ item.qty_reserved }}</td>
            <td style="text-align:right; font-weight:500;">{{ item.qty_available + item.qty_held + item.qty_reserved }}</td>
            <td>
              <span class="low-badge" v-if="item.qty_available <= item.low_stock_threshold">⚠ Low Stock</span>
            </td>
            <td>
              <button class="btn btn-outline btn-sm" @click="openStockIn(item)">+ Stock In</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Recent transactions -->
    <div class="card section-card" style="margin-top:16px;">
      <div class="section-title" style="margin-bottom:14px;">Recent Transactions</div>
      <table class="data-table">
        <thead><tr><th>Product</th><th>Type</th><th>Qty</th><th>Available After</th><th>Notes</th><th>Date</th></tr></thead>
        <tbody>
          <tr v-for="txn in transactions" :key="txn.id">
            <td style="font-size:13px;">{{ txn.products?.name }}</td>
            <td><span :class="['txn-type', 'txn-' + txn.txn_type]">{{ txnLabel(txn.txn_type) }}</span></td>
            <td style="font-weight:500;" :class="txn.qty_delta > 0 ? 'qty-in' : 'qty-out'">
              {{ txn.qty_delta > 0 ? '+' : '' }}{{ txn.qty_delta }}
            </td>
            <td style="color:var(--text-muted);">{{ txn.qty_available_after }}</td>
            <td style="font-size:12px; color:var(--text-muted);">{{ txn.notes || '—' }}</td>
            <td style="font-size:12px; color:var(--text-muted);">{{ formatDate(txn.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Stock In Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Stock In — {{ selectedItem?.products?.name }}</div>
          <button class="modal-close" @click="showModal = false">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="alert alert-error" v-if="stockError">{{ stockError }}</div>
          <div class="form-group">
            <label>Quantity Received *</label>
            <input v-model.number="stockForm.qty" type="number" min="1" placeholder="0" />
          </div>
          <div class="form-group">
            <label>Unit Cost Price (MYR)</label>
            <input v-model.number="stockForm.cost" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div class="form-group">
            <label>Notes</label>
            <input v-model="stockForm.notes" placeholder="e.g. Batch #001, Supplier X" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showModal = false">Cancel</button>
          <button class="btn btn-success" @click="addStock" :disabled="stockSaving">
            {{ stockSaving ? 'Saving…' : 'Add Stock' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const inventory    = ref([])
const transactions = ref([])
const loading      = ref(true)
const showModal    = ref(false)
const stockSaving  = ref(false)
const stockError   = ref('')
const selectedItem = ref(null)
const stockForm    = ref({ qty: 1, cost: 0, notes: '' })

const TXN_LABELS = {
  purchase_in:   'Purchase In',
  order_hold:    'Order Hold',
  order_reserve: 'Reserved',
  order_deduct:  'Deducted',
  order_release: 'Released',
  return_in:     'Return In',
  damage:        'Damage',
  manual_adjust: 'Adjustment'
}
function txnLabel(t)  { return TXN_LABELS[t] || t }
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function openStockIn(item) {
  selectedItem.value = item
  stockForm.value    = { qty: 1, cost: 0, notes: '' }
  stockError.value   = ''
  showModal.value    = true
}

async function addStock() {
  stockError.value = ''
  if (!stockForm.value.qty || stockForm.value.qty < 1) { stockError.value = 'Quantity must be at least 1.'; return }

  stockSaving.value = true
  const { data: { session } } = await supabase.auth.getSession()
  const { data: admin } = await supabase.from('admins').select('full_name').eq('id', session.user.id).single()

  const { error } = await supabase.rpc('rpc_inventory_purchase_in', {
    p_product_id:  selectedItem.value.product_id,
    p_qty:         stockForm.value.qty,
    p_cost_price:  stockForm.value.cost || null,
    p_notes:       stockForm.value.notes || 'Stock in',
    p_admin_id:    session.user.id,
    p_admin_name:  admin?.full_name || 'Admin'
  })

  if (error) { stockError.value = error.message }
  else {
    showModal.value = false
    await fetchData()
  }
  stockSaving.value = false
}

async function fetchData() {
  loading.value = true
  const { data: inv } = await supabase
    .from('inventory')
    .select('*, products(name, sku)')
    .order('product_id')
  inventory.value = inv || []

  const { data: txn } = await supabase
    .from('inventory_transactions')
    .select('*, products(name, sku)')
    .order('created_at', { ascending: false })
    .limit(30)
  transactions.value = txn || []
  loading.value = false
}

onMounted(fetchData)
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--text); }
.page-sub    { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.table-card  { overflow: hidden; }
.section-card { padding: 18px; overflow: hidden; }
.section-title { font-size: 11.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-muted); }
.low-stock { color: var(--error); }
.low-badge { background: var(--error-bg); color: var(--error); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
.txn-type { font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: var(--bg); color: var(--text-muted); }
.txn-purchase_in, .txn-return_in { background: var(--success-bg); color: var(--success); }
.txn-order_deduct, .txn-damage   { background: var(--error-bg); color: var(--error); }
.qty-in  { color: var(--success); }
.qty-out { color: var(--error); }
</style>
