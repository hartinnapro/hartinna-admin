<template>
  <div class="page">
    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Orders</h1>
        <div class="page-sub">{{ totalCount }} total orders</div>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="filter-bar">
      <button
        v-for="tab in tabs" :key="tab.value"
        :class="['filter-tab', filter === tab.value ? 'active' : '']"
        @click="setFilter(tab.value)"
      >
        {{ tab.label }}
        <span class="tab-count" v-if="tab.count !== undefined">{{ tab.count }}</span>
      </button>
      <div class="filter-spacer"></div>
      <input v-model="search" type="text" placeholder="Search order no. or member…" class="search-input" />
    </div>

    <!-- Table -->
    <div class="card table-card">
      <div class="loading-center" v-if="loading">
        <div class="spinner"></div>
        <span>Loading orders…</span>
      </div>

      <div class="empty-state" v-else-if="filtered.length === 0">
        <svg width="40" height="40" fill="none" stroke="var(--primary)" stroke-width="1.5" viewBox="0 0 24 24" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h3>No orders found</h3>
        <p>{{ filter === 'all' ? 'No orders have been placed yet.' : 'No orders with this status.' }}</p>
      </div>

      <table class="data-table" v-else>
        <thead>
          <tr>
            <th>Order No.</th>
            <th>Member</th>
            <th>Date</th>
            <th>Items</th>
            <th>Total</th>
            <th>Pickup</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in filtered"
            :key="order.id"
            class="clickable"
            @click="goDetail(order.id)"
          >
            <td><span class="order-no">{{ order.order_no }}</span></td>
            <td>
              <div class="member-name">{{ order.members?.full_name || '—' }}</div>
              <div class="member-level">
                <span class="badge-level">{{ levelLabel(order.members?.level) }}</span>
              </div>
            </td>
            <td class="text-muted">{{ formatDate(order.created_at) }}</td>
            <td class="text-center">{{ order.order_items?.length ?? 0 }}</td>
            <td class="text-bold">MYR {{ Number(order.total_amount).toFixed(2) }}</td>
            <td class="text-muted">{{ order.pickup_method === 'delivery' ? '🚚 Delivery' : '🏠 Pickup' }}</td>
            <td>
              <span :class="['badge', 'badge-' + order.status]">
                <span class="badge-dot"></span>
                {{ statusLabel(order.status) }}
              </span>
            </td>
            <td @click.stop>
              <div class="action-btns">
                <button
                  v-if="order.status === 'pending_review'"
                  class="btn btn-success btn-sm"
                  @click.stop="confirmOrder(order)"
                  :disabled="actionLoading === order.id"
                >Confirm</button>
                <button
                  v-if="order.status === 'confirmed'"
                  class="btn btn-primary btn-sm"
                  @click.stop="markPreparing(order)"
                  :disabled="actionLoading === order.id"
                >Preparing</button>
                <button
                  v-if="order.status === 'preparing'"
                  class="btn btn-success btn-sm"
                  @click.stop="markComplete(order)"
                  :disabled="actionLoading === order.id"
                >Complete</button>
                <button
                  v-if="['pending_review','confirmed','preparing'].includes(order.status)"
                  class="btn btn-outline btn-sm"
                  @click.stop="cancelOrder(order)"
                  :disabled="actionLoading === order.id"
                >Cancel</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const orders = ref([])
const loading = ref(true)
const filter  = ref('all')
const search  = ref('')
const actionLoading = ref(null)

const STATUS_LABELS = {
  pending_review: 'Pending Review',
  confirmed:      'Confirmed',
  preparing:      'Preparing',
  completed:      'Completed',
  cancelled:      'Cancelled'
}

const LEVEL_LABELS = {
  store_manager:   'Store Mgr',
  director:        'Director',
  ceo:             'CEO',
  branch:          'Branch',
  exec_shareholder:'Exec. SH'
}

function statusLabel(s) { return STATUS_LABELS[s] || s }
function levelLabel(l)  { return LEVEL_LABELS[l] || l }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const totalCount = computed(() => orders.value.length)

const statusCounts = computed(() => {
  const counts = {}
  orders.value.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })
  return counts
})

const tabs = computed(() => [
  { value: 'all',            label: 'All',     count: orders.value.length },
  { value: 'pending_review', label: 'Pending', count: statusCounts.value.pending_review || 0 },
  { value: 'confirmed',      label: 'Confirmed' },
  { value: 'preparing',      label: 'Preparing' },
  { value: 'completed',      label: 'Completed' },
  { value: 'cancelled',      label: 'Cancelled' },
])

const filtered = computed(() => {
  let result = orders.value
  if (filter.value !== 'all') result = result.filter(o => o.status === filter.value)
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    result = result.filter(o =>
      o.order_no?.toLowerCase().includes(q) ||
      o.members?.full_name?.toLowerCase().includes(q) ||
      o.members?.phone?.includes(q)
    )
  }
  return result
})

function setFilter(val) { filter.value = val }
function goDetail(id)   { router.push(`/orders/${id}`) }

async function fetchOrders() {
  loading.value = true
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_no, status, total_amount, pickup_method, created_at,
      members(full_name, phone, level),
      order_items(id)
    `)
    .order('created_at', { ascending: false })

  if (!error) orders.value = data || []
  loading.value = false
}

async function confirmOrder(order) {
  actionLoading.value = order.id
  try {
    // Update status
    await supabase.from('orders').update({
      status: 'confirmed', reviewed_at: new Date().toISOString()
    }).eq('id', order.id)

    // Reserve inventory for each item
    const { data: items } = await supabase
      .from('order_items')
      .select('product_id, qty')
      .eq('order_id', order.id)

    for (const item of items || []) {
      await supabase.rpc('rpc_inventory_reserve', {
        p_product_id: item.product_id,
        p_order_id:   order.id,
        p_qty:        item.qty
      })
    }

    order.status = 'confirmed'
  } catch (e) { alert('Failed: ' + e.message) }
  finally { actionLoading.value = null }
}

async function markPreparing(order) {
  actionLoading.value = order.id
  try {
    await supabase.from('orders').update({ status: 'preparing' }).eq('id', order.id)
    order.status = 'preparing'
  } catch (e) { alert('Failed: ' + e.message) }
  finally { actionLoading.value = null }
}

async function markComplete(order) {
  actionLoading.value = order.id
  try {
    const { data: items } = await supabase
      .from('order_items')
      .select('product_id, qty')
      .eq('order_id', order.id)

    for (const item of items || []) {
      await supabase.rpc('rpc_inventory_deduct', {
        p_product_id: item.product_id,
        p_order_id:   order.id,
        p_qty:        item.qty
      })
    }

    await supabase.from('orders').update({
      status: 'completed', completed_at: new Date().toISOString()
    }).eq('id', order.id)

    order.status = 'completed'
  } catch (e) { alert('Failed: ' + e.message) }
  finally { actionLoading.value = null }
}

async function cancelOrder(order) {
  if (!confirm(`Cancel order ${order.order_no}? This will release reserved stock.`)) return
  actionLoading.value = order.id
  try {
    const fromStage = order.status === 'pending_review' ? 'hold' : 'reserve'
    const { data: items } = await supabase
      .from('order_items')
      .select('product_id, qty')
      .eq('order_id', order.id)

    for (const item of items || []) {
      await supabase.rpc('rpc_inventory_release', {
        p_product_id: item.product_id,
        p_order_id:   order.id,
        p_qty:        item.qty,
        p_from_stage: fromStage
      })
    }

    await supabase.from('orders').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_by: 'admin'
    }).eq('id', order.id)

    order.status = 'cancelled'
  } catch (e) { alert('Failed: ' + e.message) }
  finally { actionLoading.value = null }
}

onMounted(fetchOrders)
</script>

<style scoped>
.page { padding: 24px; }

.page-header {
  display: flex; justify-content: space-between;
  align-items: flex-start; margin-bottom: 20px;
}
.page-title { font-size: 22px; font-weight: 700; color: var(--text); }
.page-sub   { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

.filter-bar {
  display: flex; align-items: center; gap: 4px;
  margin-bottom: 16px; flex-wrap: wrap;
}

.filter-tab {
  padding: 6px 14px; border-radius: 20px;
  font-size: 13px; font-weight: 500;
  cursor: pointer; border: 1.5px solid var(--border);
  background: white; color: var(--text-muted);
  transition: all 0.15s; display: flex; align-items: center; gap: 6px;
}
.filter-tab:hover  { border-color: var(--primary); color: var(--primary); }
.filter-tab.active { background: var(--primary); border-color: var(--primary); color: white; }
.filter-tab.active .tab-count { background: rgba(255,255,255,0.25); }

.tab-count {
  background: var(--primary-light); color: var(--primary);
  font-size: 10.5px; font-weight: 700;
  padding: 1px 6px; border-radius: 10px;
  min-width: 18px; text-align: center;
}

.filter-spacer { flex: 1; }

.search-input {
  width: 240px; padding: 7px 12px;
  font-size: 13px;
}

.table-card { overflow: hidden; }

.order-no  { font-weight: 600; font-size: 13px; color: var(--primary); }
.member-name { font-weight: 500; }
.member-level { margin-top: 2px; }
.text-muted  { color: var(--text-muted); }
.text-center { text-align: center; }
.text-bold   { font-weight: 600; }

.action-btns {
  display: flex; gap: 6px; align-items: center;
}
</style>
