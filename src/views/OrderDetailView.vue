<template>
  <div class="page">
    <div class="page-header">
      <button class="btn btn-outline btn-sm" @click="$router.back()">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Orders
      </button>
    </div>

    <div class="loading-center" v-if="loading">
      <div class="spinner"></div><span>Loading order…</span>
    </div>

    <template v-else-if="order">
      <div class="order-header">
        <div>
          <h1 class="page-title">{{ order.order_no }}</h1>
          <div class="page-sub">{{ formatDate(order.created_at) }}</div>
        </div>
        <div class="header-actions">
          <span :class="['badge', 'badge-' + order.status]">
            <span class="badge-dot"></span>{{ statusLabel(order.status) }}
          </span>
          <button v-if="order.status === 'pending_review'" class="btn btn-success" @click="confirmOrder" :disabled="acting">
            ✓ Confirm Payment
          </button>
          <button v-if="order.status === 'confirmed'" class="btn btn-primary" @click="markPreparing" :disabled="acting">
            Mark as Preparing
          </button>
          <button v-if="order.status === 'preparing'" class="btn btn-success" @click="markComplete" :disabled="acting">
            Mark as Completed
          </button>
          <button
            v-if="['pending_review','confirmed','preparing'].includes(order.status)"
            class="btn btn-outline"
            @click="showReject = true"
            :disabled="acting"
          >Cancel Order</button>
        </div>
      </div>

      <div class="grid-2">
        <!-- Left column -->
        <div>
          <!-- Order items -->
          <div class="card section-card">
            <div class="section-title">Items Ordered</div>
            <table class="data-table">
              <thead><tr><th>Product</th><th>SKU</th><th>Unit Price</th><th>Qty</th><th>Subtotal</th></tr></thead>
              <tbody>
                <tr v-for="item in order.order_items" :key="item.id">
                  <td><span style="font-weight:500;">{{ item.product_name_snapshot }}</span></td>
                  <td style="color:var(--text-muted); font-size:12px;">{{ item.product_sku_snapshot }}</td>
                  <td>MYR {{ Number(item.unit_price_snapshot).toFixed(2) }}</td>
                  <td style="text-align:center;">{{ item.qty }}</td>
                  <td style="font-weight:600;">MYR {{ Number(item.subtotal).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="total-row">
              <span>Order Total</span>
              <span class="total-value">MYR {{ Number(order.total_amount).toFixed(2) }}</span>
            </div>
          </div>

          <!-- Payment proof -->
          <div class="card section-card">
            <div class="section-title">Payment Proof</div>
            <div v-if="order.payment_proof_url">
              <div class="proof-meta">Uploaded {{ formatDate(order.payment_proof_uploaded_at) }}</div>
              <div v-if="proofLoading" class="loading-center" style="padding:20px;">
                <div class="spinner"></div>
              </div>
              <div v-else-if="proofUrl">
                <img v-if="!proofIsPdf" :src="proofUrl" class="proof-img" alt="Payment proof" />
                <a v-else :href="proofUrl" target="_blank" class="btn btn-outline" style="margin-top:8px;">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  View PDF Receipt
                </a>
              </div>
            </div>
            <div v-else class="text-muted" style="padding:8px 0; font-size:13px;">No receipt uploaded</div>
          </div>

          <!-- Admin notes -->
          <div class="card section-card">
            <div class="section-title">Admin Notes</div>
            <textarea id="admin-notes" name="adminNotes" v-model="adminNotes" placeholder="Internal notes (not visible to member)…" rows="3"></textarea>
            <button class="btn btn-outline btn-sm" style="margin-top:8px;" @click="saveNotes" :disabled="savingNotes">
              {{ savingNotes ? 'Saving…' : 'Save Notes' }}
            </button>
          </div>
        </div>

        <!-- Right column -->
        <div>
          <!-- Member info -->
          <div class="card section-card">
            <div class="section-title">Member</div>
            <div class="info-row">
              <span class="info-label">Name</span>
              <span class="info-value">{{ order.members?.full_name || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone</span>
              <span class="info-value">{{ order.members?.phone || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Level</span>
              <span class="info-value">
                <span class="badge-level">{{ levelLabel(order.member_level_snapshot) }}</span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Region</span>
              <span class="info-value">{{ order.members?.region || '—' }}</span>
            </div>
          </div>

          <!-- Delivery info -->
          <div class="card section-card">
            <div class="section-title">Fulfillment</div>
            <div class="info-row">
              <span class="info-label">Method</span>
              <span class="info-value">{{ order.pickup_method === 'delivery' ? 'Delivery' : 'Self Pickup' }}</span>
            </div>
            <template v-if="order.pickup_method === 'delivery'">
              <div class="info-row" v-if="order.delivery_name">
                <span class="info-label">Recipient</span>
                <span class="info-value">{{ order.delivery_name }}</span>
              </div>
              <div class="info-row" v-if="order.delivery_phone">
                <span class="info-label">Phone</span>
                <span class="info-value">{{ order.delivery_phone }}</span>
              </div>
              <div class="info-row" v-if="order.delivery_address">
                <span class="info-label">Address</span>
                <span class="info-value">{{ order.delivery_address }}</span>
              </div>
            </template>
            <div class="info-row" v-if="order.remarks">
              <span class="info-label">Remarks</span>
              <span class="info-value">{{ order.remarks }}</span>
            </div>
          </div>

          <!-- Status history -->
          <div class="card section-card" v-if="order.reviewed_at || order.completed_at || order.cancelled_at">
            <div class="section-title">Timeline</div>
            <div class="timeline-item">
              <div class="tl-dot tl-done"></div>
              <div><div class="tl-label">Order Placed</div><div class="tl-time">{{ formatDate(order.created_at) }}</div></div>
            </div>
            <div class="timeline-item" v-if="order.reviewed_at">
              <div class="tl-dot tl-done"></div>
              <div><div class="tl-label">Payment Confirmed</div><div class="tl-time">{{ formatDate(order.reviewed_at) }}</div></div>
            </div>
            <div class="timeline-item" v-if="order.completed_at">
              <div class="tl-dot tl-done" style="background:var(--success);"></div>
              <div><div class="tl-label">Order Completed</div><div class="tl-time">{{ formatDate(order.completed_at) }}</div></div>
            </div>
            <div class="timeline-item" v-if="order.cancelled_at">
              <div class="tl-dot" style="background:var(--error);"></div>
              <div><div class="tl-label">Cancelled</div><div class="tl-time">{{ formatDate(order.cancelled_at) }}</div></div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Cancel modal -->
    <div class="modal-overlay" v-if="showReject" @click.self="showReject = false">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">Cancel Order</div>
          <button class="modal-close" @click="showReject = false">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Reason for cancellation</label>
            <textarea id="cancel-reason" name="cancelReason" v-model="cancelReason" placeholder="e.g. Payment proof invalid, insufficient stock…" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showReject = false">Keep Order</button>
          <button class="btn btn-danger" @click="cancelOrder" :disabled="acting">
            {{ acting ? 'Cancelling…' : 'Confirm Cancel' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const route  = useRoute()
const router = useRouter()

const order       = ref(null)
const loading     = ref(true)
const acting      = ref(false)
const savingNotes = ref(false)
const showReject  = ref(false)
const cancelReason = ref('')
const adminNotes  = ref('')
const proofUrl    = ref(null)
const proofLoading = ref(false)
const proofIsPdf  = ref(false)

const STATUS_LABELS = {
  pending_review: 'Pending Review', confirmed: 'Confirmed',
  preparing: 'Preparing', completed: 'Completed', cancelled: 'Cancelled'
}
const LEVEL_LABELS = {
  store_manager: 'Store Manager', director: 'Director',
  ceo: 'CEO', branch: 'Branch', exec_shareholder: 'Exec. Shareholder'
}

function statusLabel(s) { return STATUS_LABELS[s] || s }
function levelLabel(l)  { return LEVEL_LABELS[l] || l }
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

async function loadProof() {
  if (!order.value?.payment_proof_url) return
  proofLoading.value = true
  proofIsPdf.value   = order.value.payment_proof_url.endsWith('.pdf')
  const { data } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(order.value.payment_proof_url, 3600)
  proofUrl.value = data?.signedUrl || null
  proofLoading.value = false
}

async function saveNotes() {
  savingNotes.value = true
  await supabase.from('orders').update({ admin_notes: adminNotes.value }).eq('id', order.value.id)
  savingNotes.value = false
}

async function confirmOrder() {
  acting.value = true
  try {
    const { data: items } = await supabase.from('order_items').select('product_id, qty').eq('order_id', order.value.id)
    for (const item of items || []) {
      await supabase.rpc('rpc_inventory_reserve', { p_product_id: item.product_id, p_order_id: order.value.id, p_qty: item.qty })
    }
    await supabase.from('orders').update({ status: 'confirmed', reviewed_at: new Date().toISOString() }).eq('id', order.value.id)
    order.value.status = 'confirmed'
    order.value.reviewed_at = new Date().toISOString()
  } catch (e) { alert('Failed: ' + e.message) }
  finally { acting.value = false }
}

async function markPreparing() {
  acting.value = true
  await supabase.from('orders').update({ status: 'preparing' }).eq('id', order.value.id)
  order.value.status = 'preparing'
  acting.value = false
}

async function markComplete() {
  acting.value = true
  try {
    const { data: items } = await supabase.from('order_items').select('product_id, qty').eq('order_id', order.value.id)
    for (const item of items || []) {
      await supabase.rpc('rpc_inventory_deduct', { p_product_id: item.product_id, p_order_id: order.value.id, p_qty: item.qty })
    }
    await supabase.from('orders').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', order.value.id)
    order.value.status = 'completed'
    order.value.completed_at = new Date().toISOString()
  } catch (e) { alert('Failed: ' + e.message) }
  finally { acting.value = false }
}

async function cancelOrder() {
  acting.value = true
  try {
    const fromStage = order.value.status === 'pending_review' ? 'hold' : 'reserve'
    const { data: items } = await supabase.from('order_items').select('product_id, qty').eq('order_id', order.value.id)
    for (const item of items || []) {
      await supabase.rpc('rpc_inventory_release', { p_product_id: item.product_id, p_order_id: order.value.id, p_qty: item.qty, p_from_stage: fromStage })
    }
    await supabase.from('orders').update({
      status: 'cancelled', cancelled_at: new Date().toISOString(),
      cancel_by: 'admin', cancel_reason: cancelReason.value || 'Cancelled by admin'
    }).eq('id', order.value.id)
    order.value.status = 'cancelled'
    order.value.cancelled_at = new Date().toISOString()
    showReject.value = false
  } catch (e) { alert('Failed: ' + e.message) }
  finally { acting.value = false }
}

onMounted(async () => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *, members(full_name, phone, level, region),
      order_items(id, product_id, product_name_snapshot, product_sku_snapshot, unit_price_snapshot, qty, subtotal)
    `)
    .eq('id', route.params.id)
    .single()

  if (!error && data) {
    order.value      = data
    adminNotes.value = data.admin_notes || ''
    await loadProof()
  }
  loading.value = false
})
</script>

<style scoped>
.page { padding: 24px; }
.page-header { margin-bottom: 16px; }
.order-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px; gap: 16px; flex-wrap: wrap;
}
.page-title { font-size: 22px; font-weight: 700; color: var(--text); }
.page-sub   { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.grid-2 {
  display: grid; grid-template-columns: 1fr 360px; gap: 16px;
  align-items: start;
}

.section-card { padding: 18px; margin-bottom: 16px; }
.section-title {
  font-size: 11.5px; font-weight: 600; letter-spacing: 0.07em;
  text-transform: uppercase; color: var(--text-muted);
  margin-bottom: 14px;
}

.total-row {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 12px; margin-top: 4px;
  border-top: 1.5px solid var(--border);
  font-size: 15px; font-weight: 600;
}
.total-value { color: var(--primary); font-size: 18px; }

.proof-meta { font-size: 12px; color: var(--text-muted); margin-bottom: 10px; }
.proof-img  { width: 100%; border-radius: var(--radius-sm); border: 1px solid var(--border); }

.info-row {
  display: flex; justify-content: space-between;
  align-items: flex-start; margin-bottom: 8px;
  font-size: 13.5px;
}
.info-row:last-child { margin-bottom: 0; }
.info-label { color: var(--text-muted); flex-shrink: 0; margin-right: 12px; }
.info-value { color: var(--text); font-weight: 500; text-align: right; }

.timeline-item {
  display: flex; align-items: flex-start; gap: 10px;
  margin-bottom: 12px;
}
.timeline-item:last-child { margin-bottom: 0; }
.tl-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; background: var(--border); }
.tl-dot.tl-done { background: var(--primary); }
.tl-label { font-size: 13px; font-weight: 500; }
.tl-time  { font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }

.text-muted { color: var(--text-muted); font-size: 13px; }
</style>
