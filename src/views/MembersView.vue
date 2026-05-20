<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Members</h1>
        <div class="page-sub">{{ members.length }} registered agents</div>
      </div>
    </div>

    <div class="filter-bar">
      <select v-model="filterLevel" class="filter-select">
        <option value="">All Levels</option>
        <option value="store_manager">Store Manager</option>
        <option value="director">Director</option>
        <option value="ceo">CEO</option>
        <option value="branch">Branch</option>
        <option value="exec_shareholder">Exec. Shareholder</option>
      </select>
      <select v-model="filterRegion" class="filter-select">
        <option value="">All Regions</option>
        <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
      </select>
      <div class="filter-spacer"></div>
      <input v-model="search" type="text" placeholder="Search name, phone…" class="search-input" />
    </div>

    <div class="card table-card">
      <div class="loading-center" v-if="loading">
        <div class="spinner"></div><span>Loading members…</span>
      </div>
      <div class="empty-state" v-else-if="filtered.length === 0">
        <svg width="40" height="40" fill="none" stroke="var(--primary)" stroke-width="1.5" viewBox="0 0 24 24" opacity="0.3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <h3>No members found</h3>
        <p>Try adjusting your filters.</p>
      </div>
      <table class="data-table" v-else>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Level</th>
            <th>Region</th>
            <th>Joined</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in filtered" :key="m.id" class="clickable" @click="$router.push(`/members/${m.id}`)">
            <td>
              <div class="member-name">{{ m.full_name }}</div>
              <div style="font-size:11.5px; color:var(--text-muted);" v-if="m.referrer">
                Ref: {{ m.referrer.full_name }}
              </div>
            </td>
            <td style="color:var(--text-muted);">{{ m.phone }}</td>
            <td><span class="badge-level">{{ levelLabel(m.level) }}</span></td>
            <td style="color:var(--text-muted);">{{ m.region }}</td>
            <td style="color:var(--text-muted); font-size:12.5px;">{{ formatDate(m.created_at) }}</td>
            <td>
              <span :class="m.is_active ? 'status-active' : 'status-inactive'">
                {{ m.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td @click.stop>
              <select class="level-select" :value="m.level" @change="changeLevel(m, $event.target.value)">
                <option value="store_manager">Store Manager</option>
                <option value="director">Director</option>
                <option value="ceo">CEO</option>
                <option value="branch">Branch</option>
                <option value="exec_shareholder">Exec. Shareholder</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const members     = ref([])
const loading     = ref(true)
const search      = ref('')
const filterLevel  = ref('')
const filterRegion = ref('')

const LEVEL_LABELS = {
  store_manager: 'Store Manager', director: 'Director',
  ceo: 'CEO', branch: 'Branch', exec_shareholder: 'Exec. Shareholder'
}
function levelLabel(l)  { return LEVEL_LABELS[l] || l }
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

const regions = computed(() => [...new Set(members.value.map(m => m.region))].sort())

const filtered = computed(() => {
  let r = members.value
  if (filterLevel.value)  r = r.filter(m => m.level === filterLevel.value)
  if (filterRegion.value) r = r.filter(m => m.region === filterRegion.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    r = r.filter(m => m.full_name?.toLowerCase().includes(q) || m.phone?.includes(q))
  }
  return r
})

async function changeLevel(member, newLevel) {
  if (newLevel === member.level) return
  if (!confirm(`Change ${member.full_name}'s level to ${levelLabel(newLevel)}?`)) return
  const { error } = await supabase.from('members').update({ level: newLevel }).eq('id', member.id)
  if (error) { alert('Failed: ' + error.message); return }
  member.level = newLevel
}

onMounted(async () => {
  const { data } = await supabase
    .from('members')
    .select('id, full_name, phone, level, region, is_active, created_at, referrer_id, referrer:referrer_id(full_name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  members.value = data || []
  loading.value = false
})
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--text); }
.page-sub    { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

.filter-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.filter-select { width: auto; padding: 7px 28px 7px 10px; font-size: 13px; }
.filter-spacer { flex: 1; }
.search-input  { width: 220px; padding: 7px 12px; font-size: 13px; }

.table-card { overflow: hidden; }
.member-name { font-weight: 500; }

.status-active   { background: var(--success-bg); color: var(--success); font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
.status-inactive { background: #F2F3F4; color: #566573; font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }

.level-select { width: auto; padding: 4px 24px 4px 8px; font-size: 12.5px; }
</style>
