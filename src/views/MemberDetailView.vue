<template>
  <div class="page">
    <div class="page-header">
      <button class="btn btn-outline btn-sm" @click="$router.back()">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Members
      </button>
    </div>

    <div class="loading-center" v-if="loading">
      <div class="spinner"></div><span>Loading member…</span>
    </div>

    <template v-else-if="member">
      <div class="member-header">
        <div class="member-avatar">{{ member.full_name[0] }}</div>
        <div>
          <h1 class="page-title">{{ member.full_name }}</h1>
          <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
            <span class="badge-level">{{ levelLabel(member.level) }}</span>
            <span style="color:var(--text-muted); font-size:13px;">{{ member.region }}</span>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div>
          <div class="card section-card">
            <div class="section-title">Account Info</div>
            <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">{{ member.full_name }}</span></div>
            <div class="info-row"><span class="info-label">Phone</span><span class="info-value">{{ member.phone }}</span></div>
            <div class="info-row"><span class="info-label">Region</span><span class="info-value">{{ member.region }}</span></div>
            <div class="info-row"><span class="info-label">Level</span><span class="info-value"><span class="badge-level">{{ levelLabel(member.level) }}</span></span></div>
            <div class="info-row"><span class="info-label">Joined</span><span class="info-value">{{ formatDate(member.created_at) }}</span></div>
            <div class="info-row"><span class="info-label">Status</span><span class="info-value">{{ member.is_active ? '✅ Active' : '❌ Inactive' }}</span></div>
            <div class="info-row" v-if="member.referrer"><span class="info-label">Referred by</span><span class="info-value">{{ member.referrer.full_name }}</span></div>
          </div>

          <!-- Change level -->
          <div class="card section-card">
            <div class="section-title">Change Level</div>
            <div class="form-group">
              <label>Member Level</label>
              <div class="select-wrap">
                <select v-model="newLevel">
                  <option value="store_manager">Store Manager</option>
                  <option value="director">Director</option>
                  <option value="ceo">CEO</option>
                  <option value="branch">Branch</option>
                  <option value="exec_shareholder">Exec. Shareholder</option>
                </select>
              </div>
            </div>
            <button class="btn btn-primary btn-sm" @click="saveLevel" :disabled="savingLevel">
              {{ savingLevel ? 'Saving…' : 'Update Level' }}
            </button>
            <div class="alert alert-success" v-if="levelSaved" style="margin-top:10px; margin-bottom:0;">Level updated successfully.</div>
          </div>
        </div>

        <div>
          <!-- Order stats -->
          <div class="card section-card">
            <div class="section-title">Order Summary</div>
            <div class="stats-grid">
              <div class="stat-item"><div class="stat-val">{{ stats.total }}</div><div class="stat-lbl">Total Orders</div></div>
              <div class="stat-item"><div class="stat-val">{{ stats.completed }}</div><div class="stat-lbl">Completed</div></div>
              <div class="stat-item"><div class="stat-val">MYR {{ stats.spent }}</div><div class="stat-lbl">Total Spent</div></div>
            </div>
          </div>

          <!-- Recent orders -->
          <div class="card section-card">
            <div class="section-title">Recent Orders</div>
            <div v-if="orders.length === 0" style="font-size:13px; color:var(--text-muted);">No orders yet.</div>
            <table class="data-table" v-else>
              <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="o in orders" :key="o.id" class="clickable" @click="$router.push(`/orders/${o.id}`)">
                  <td style="font-weight:500; color:var(--primary);">{{ o.order_no }}</td>
                  <td style="font-size:12.5px; color:var(--text-muted);">{{ formatDate(o.created_at) }}</td>
                  <td>MYR {{ Number(o.total_amount).toFixed(2) }}</td>
                  <td><span :class="['badge', 'badge-' + o.status]"><span class="badge-dot"></span>{{ statusLabel(o.status) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()

const member      = ref(null)
const orders      = ref([])
const loading     = ref(true)
const newLevel    = ref('')
const savingLevel = ref(false)
const levelSaved  = ref(false)

const LEVEL_LABELS = { store_manager: 'Store Manager', director: 'Director', ceo: 'CEO', branch: 'Branch', exec_shareholder: 'Exec. Shareholder' }
const STATUS_LABELS = { pending_review: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing', completed: 'Completed', cancelled: 'Cancelled' }

function levelLabel(l)  { return LEVEL_LABELS[l] || l }
function statusLabel(s) { return STATUS_LABELS[s] || s }
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

const stats = computed(() => {
  const total     = orders.value.filter(o => o.status !== 'cancelled').length
  const completed = orders.value.filter(o => o.status === 'completed').length
  const spent     = orders.value.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total_amount), 0)
  return { total, completed, spent: spent.toFixed(0) }
})

async function saveLevel() {
  savingLevel.value = true; levelSaved.value = false
  const { error } = await supabase.from('members').update({ level: newLevel.value }).eq('id', member.value.id)
  if (!error) { member.value.level = newLevel.value; levelSaved.value = true; setTimeout(() => levelSaved.value = false, 3000) }
  else alert('Failed: ' + error.message)
  savingLevel.value = false
}

onMounted(async () => {
  const { data: m } = await supabase
    .from('members')
    .select('*, referrer:referrer_id(full_name)')
    .eq('id', route.params.id)
    .single()

  if (m) { member.value = m; newLevel.value = m.level }

  const { data: o } = await supabase
    .from('orders')
    .select('id, order_no, status, total_amount, created_at')
    .eq('member_id', route.params.id)
    .order('created_at', { ascending: false })
    .limit(10)

  orders.value = o || []
  loading.value = false
})
</script>

<style scoped>
.page { padding: 24px; }
.page-header { margin-bottom: 16px; }
.member-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.member-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--primary-light); color: var(--primary);
  font-size: 22px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.page-title { font-size: 22px; font-weight: 700; color: var(--text); }
.grid-2 { display: grid; grid-template-columns: 1fr 360px; gap: 16px; align-items: start; }
.section-card { padding: 18px; margin-bottom: 16px; }
.section-title { font-size: 11.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 14px; }
.info-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; font-size: 13.5px; }
.info-row:last-child { margin-bottom: 0; }
.info-label { color: var(--text-muted); flex-shrink: 0; margin-right: 12px; }
.info-value { color: var(--text); font-weight: 500; text-align: right; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.stat-item { background: var(--bg); border-radius: var(--radius-sm); padding: 12px; text-align: center; }
.stat-val  { font-size: 18px; font-weight: 700; color: var(--primary); }
.stat-lbl  { font-size: 11px; color: var(--text-muted); margin-top: 3px; }
</style>
