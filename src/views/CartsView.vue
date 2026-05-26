<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Active Carts</h1>
        <div class="page-sub">Members with items in cart — potential orders pending</div>
      </div>
    </div>

    <div class="card table-card">
      <div class="loading-center" v-if="loading">
        <div class="spinner"></div><span>Loading carts…</span>
      </div>
      <div class="empty-state" v-else-if="rows.length === 0">
        <svg width="40" height="40" fill="none" stroke="var(--primary)" stroke-width="1.5" viewBox="0 0 24 24" opacity="0.3">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <h3>No active carts</h3>
        <p>No members currently have items in their cart.</p>
      </div>
      <table class="data-table" v-else>
        <thead>
          <tr>
            <th>Member</th>
            <th>Level</th>
            <th>Region</th>
            <th>Items</th>
            <th>Cart Total</th>
            <th>Last Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.member_id" class="clickable" @click="$router.push(`/members/${r.member_id}`)">
            <td>
              <div class="member-name">{{ r.full_name }}</div>
              <div style="font-size:11.5px; color:var(--text-muted);">{{ r.phone }}</div>
            </td>
            <td><span class="badge-level">{{ levelLabel(r.level) }}</span></td>
            <td style="color:var(--text-muted);">{{ r.region }}</td>
            <td>
              <div class="items-preview">
                <span v-for="item in r.items.slice(0,3)" :key="item.product_id" class="item-chip">
                  {{ item.product_snapshot?.sku || '?' }} ×{{ item.qty }}
                </span>
                <span v-if="r.items.length > 3" class="item-chip more">+{{ r.items.length - 3 }} more</span>
              </div>
            </td>
            <td style="font-weight:600; color:var(--primary);">RM {{ r.total.toFixed(2) }}</td>
            <td style="font-size:12.5px; color:var(--text-muted);">{{ timeAgo(r.last_updated) }}</td>
            <td style="font-size:12.5px; color:var(--primary);">View →</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const rows    = ref([])
const loading = ref(true)

const LEVEL_LABELS = {
  store_manager: 'BM', director: 'MD', ceo: 'CEO',
  branch: 'BO', exec_shareholder: 'MP'
}
function levelLabel(l) { return LEVEL_LABELS[l] || l }

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  <  1)  return 'Just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  return `${days}d ago`
}

onMounted(async () => {
  const { data, error } = await supabase
    .from('cart_items')
    .select('member_id, product_id, qty, updated_at, product_snapshot, members(id, full_name, level, region, phone)')
    .order('updated_at', { ascending: false })

  if (error) { console.error(error); loading.value = false; return }

  // Group by member
  const byMember = {}
  for (const row of (data || [])) {
    const mid = row.member_id
    if (!byMember[mid]) {
      byMember[mid] = {
        member_id:    mid,
        full_name:    row.members?.full_name ?? '—',
        level:        row.members?.level ?? '',
        region:       row.members?.region ?? '—',
        phone:        row.members?.phone ?? '—',
        items:        [],
        total:        0,
        last_updated: row.updated_at
      }
    }
    const price = row.product_snapshot?.product_prices?.[0]?.price ?? 0
    byMember[mid].items.push(row)
    byMember[mid].total += price * row.qty
    if (row.updated_at > byMember[mid].last_updated) {
      byMember[mid].last_updated = row.updated_at
    }
  }

  // Sort by last_updated DESC
  rows.value = Object.values(byMember)
    .sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))

  loading.value = false
})
</script>

<style scoped>
.page        { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--text); }
.page-sub    { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

.member-name { font-weight: 500; }

.items-preview { display: flex; flex-wrap: wrap; gap: 4px; }
.item-chip {
  font-size: 11px; font-weight: 500;
  background: var(--primary-light); color: var(--primary);
  padding: 2px 7px; border-radius: 4px; white-space: nowrap;
}
.item-chip.more { background: #F0D6E4; color: var(--text-muted); }
</style>
