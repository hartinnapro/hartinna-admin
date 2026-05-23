<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Support Tickets</h1>
        <div class="page-sub">{{ totalCount }} total · {{ openCount }} open</div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <button
        v-for="tab in tabs" :key="tab.value"
        :class="['filter-tab', filter === tab.value ? 'active' : '']"
        @click="filter = tab.value"
      >
        {{ tab.label }}
        <span class="tab-count" v-if="tab.count !== undefined">{{ tab.count }}</span>
      </button>
      <div class="filter-spacer"></div>
      <input id="support-search" name="search" v-model="search" type="text" placeholder="Search name or email…" class="search-input" />
    </div>

    <!-- Table -->
    <div class="card table-card">
      <div class="loading-center" v-if="loading">
        <div class="spinner"></div>
        <span>Loading tickets…</span>
      </div>

      <div class="empty-state" v-else-if="filtered.length === 0">
        <svg width="40" height="40" fill="none" stroke="var(--primary)" stroke-width="1.5" viewBox="0 0 24 24" opacity="0.3">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>No tickets found</h3>
        <p>{{ filter === 'all' ? 'No support tickets yet.' : 'No tickets with this status.' }}</p>
      </div>

      <table class="data-table" v-else>
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Issue</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in filtered" :key="t.id"
            class="clickable"
            @click="openTicket(t)"
          >
            <td class="text-muted">{{ formatDate(t.created_at) }}</td>
            <td class="text-bold">{{ t.name }}</td>
            <td class="text-muted">{{ t.email }}</td>
            <td class="text-muted">{{ t.phone || '—' }}</td>
            <td>
              <div class="issue-preview">{{ t.issue }}</div>
            </td>
            <td>
              <span :class="['badge', 'badge-' + t.status]">
                <span class="badge-dot"></span>
                {{ statusLabel(t.status) }}
              </span>
            </td>
            <td @click.stop>
              <div class="action-btns">
                <button
                  v-if="t.status === 'open'"
                  class="btn btn-primary btn-sm"
                  @click.stop="updateStatus(t, 'in_progress')"
                  :disabled="actionLoading === t.id"
                >In Progress</button>
                <button
                  v-if="t.status === 'in_progress'"
                  class="btn btn-success btn-sm"
                  @click.stop="updateStatus(t, 'resolved')"
                  :disabled="actionLoading === t.id"
                >Resolve</button>
                <button
                  v-if="t.status === 'resolved'"
                  class="btn btn-outline btn-sm"
                  disabled
                >Resolved</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Ticket detail drawer -->
    <Transition name="drawer">
      <div class="drawer-overlay" v-if="selected" @click="selected = null">
        <div class="drawer" @click.stop>
          <div class="drawer-header">
            <div>
              <div class="drawer-title">Support Ticket</div>
              <div class="drawer-sub">{{ formatDate(selected.created_at) }}</div>
            </div>
            <button class="drawer-close" @click="selected = null">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="drawer-body">
            <!-- Status badge -->
            <div style="margin-bottom:20px;">
              <span :class="['badge', 'badge-' + selected.status]">
                <span class="badge-dot"></span>
                {{ statusLabel(selected.status) }}
              </span>
            </div>

            <!-- Submitter info -->
            <div class="detail-section">
              <div class="detail-label">Submitted By</div>
              <div class="detail-card">
                <div class="detail-row">
                  <span class="dl">Name</span>
                  <span class="dv">{{ selected.name }}</span>
                </div>
                <div class="detail-row">
                  <span class="dl">Email</span>
                  <span class="dv">{{ selected.email }}</span>
                </div>
                <div class="detail-row">
                  <span class="dl">Phone</span>
                  <span class="dv">{{ selected.phone || '—' }}</span>
                </div>
              </div>
            </div>

            <!-- Issue -->
            <div class="detail-section">
              <div class="detail-label">Issue Description</div>
              <div class="issue-box">{{ selected.issue }}</div>
            </div>

            <!-- Admin note -->
            <div class="detail-section">
              <div class="detail-label">Admin Note</div>
              <textarea id="admin-note" name="adminNote"
                v-model="adminNote"
                class="admin-note-input"
                placeholder="Add a note about this ticket…"
                rows="4"
              ></textarea>
              <button class="btn btn-outline btn-sm" style="margin-top:8px;" @click="saveNote" :disabled="savingNote">
                {{ savingNote ? 'Saving…' : 'Save Note' }}
              </button>
            </div>

            <!-- Actions -->
            <div class="detail-section" v-if="selected.status !== 'resolved'">
              <div class="detail-label">Update Status</div>
              <div class="action-btns">
                <button
                  v-if="selected.status === 'open'"
                  class="btn btn-primary"
                  @click="updateStatus(selected, 'in_progress')"
                  :disabled="actionLoading === selected.id"
                >Mark In Progress</button>
                <button
                  v-if="selected.status === 'in_progress'"
                  class="btn btn-success"
                  @click="updateStatus(selected, 'resolved')"
                  :disabled="actionLoading === selected.id"
                >Mark Resolved</button>
              </div>
            </div>

            <div class="resolved-note" v-if="selected.status === 'resolved' && selected.resolved_at">
              ✓ Resolved on {{ formatDate(selected.resolved_at) }}
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../lib/supabase'

const tickets      = ref([])
const loading      = ref(true)
const filter       = ref('all')
const search       = ref('')
const selected     = ref(null)
const actionLoading = ref(null)
const adminNote    = ref('')
const savingNote   = ref(false)

const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' }
function statusLabel(s) { return STATUS_LABELS[s] || s }

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const totalCount = computed(() => tickets.value.length)
const openCount  = computed(() => tickets.value.filter(t => t.status === 'open').length)
const inProgressCount = computed(() => tickets.value.filter(t => t.status === 'in_progress').length)

const tabs = computed(() => [
  { value: 'all',         label: 'All',         count: totalCount.value },
  { value: 'open',        label: 'Open',        count: openCount.value },
  { value: 'in_progress', label: 'In Progress', count: inProgressCount.value },
  { value: 'resolved',    label: 'Resolved' }
])

const filtered = computed(() => {
  let list = tickets.value
  if (filter.value !== 'all') list = list.filter(t => t.status === filter.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.issue?.toLowerCase().includes(q)
    )
  }
  return list
})

function openTicket(t) {
  selected.value = t
  adminNote.value = t.admin_note || ''
}

async function updateStatus(ticket, newStatus) {
  actionLoading.value = ticket.id
  try {
    const updates = { status: newStatus }
    if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString()

    const { error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticket.id)

    if (!error) {
      ticket.status = newStatus
      if (newStatus === 'resolved') ticket.resolved_at = updates.resolved_at
      if (selected.value?.id === ticket.id) selected.value = { ...ticket }
    }
  } finally {
    actionLoading.value = null
  }
}

async function saveNote() {
  if (!selected.value) return
  savingNote.value = true
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({ admin_note: adminNote.value.trim() || null })
      .eq('id', selected.value.id)

    if (!error) {
      selected.value.admin_note = adminNote.value.trim() || null
      const t = tickets.value.find(t => t.id === selected.value.id)
      if (t) t.admin_note = selected.value.admin_note
    }
  } finally {
    savingNote.value = false
  }
}

onMounted(async () => {
  const { data } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
  tickets.value = data || []
  loading.value = false
})
</script>

<style scoped>
.page { padding: 24px; }

.page-header { margin-bottom: 20px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--text); }
.page-sub    { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

/* Filter bar */
.filter-bar {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 16px; flex-wrap: wrap;
}
.filter-tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 20px;
  font-size: 12.5px; font-weight: 500;
  border: 1.5px solid var(--border);
  background: none; cursor: pointer;
  color: var(--text-muted); font-family: var(--font);
  transition: all 0.15s; white-space: nowrap;
}
.filter-tab:hover  { border-color: var(--primary); color: var(--primary); }
.filter-tab.active { background: var(--primary); border-color: var(--primary); color: white; }
.tab-count {
  background: rgba(255,255,255,0.25); color: inherit;
  font-size: 11px; font-weight: 700;
  padding: 1px 6px; border-radius: 10px;
}
.filter-tab:not(.active) .tab-count { background: var(--border); color: var(--text-muted); }
.filter-spacer { flex: 1; }
.search-input {
  padding: 7px 14px; border: 1.5px solid var(--border);
  border-radius: var(--radius-sm); font-family: var(--font);
  font-size: 13px; color: var(--text); outline: none;
  transition: border-color 0.15s; width: 220px;
}
.search-input:focus { border-color: var(--primary); }

/* Card / table */
.card { background: var(--card); border-radius: var(--radius); border: 1px solid var(--border); }
.table-card { overflow: hidden; }
.loading-center { display: flex; align-items: center; gap: 10px; padding: 40px; color: var(--text-muted); justify-content: center; }
.spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { padding: 48px; text-align: center; color: var(--text-muted); }
.empty-state h3 { font-size: 15px; color: var(--text); margin: 10px 0 4px; }
.empty-state p  { font-size: 13px; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left; padding: 11px 14px;
  font-size: 11.5px; font-weight: 600; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  background: #fdf5f9;
}
.data-table td { padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 13.5px; vertical-align: middle; }
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr.clickable { cursor: pointer; transition: background 0.12s; }
.data-table tbody tr.clickable:hover { background: #fef5f9; }

.text-muted  { color: var(--text-muted); }
.text-bold   { font-weight: 600; color: var(--text); }
.text-center { text-align: center; }

.issue-preview {
  max-width: 240px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
  color: var(--text-muted); font-size: 13px;
}

/* Status badges */
.badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
.badge-dot { width: 6px; height: 6px; border-radius: 50%; }
.badge-open        { background: #FEF3CD; color: #7A5510; } .badge-open .badge-dot        { background: #F0A500; }
.badge-in_progress { background: #D6EAF8; color: #154360; } .badge-in_progress .badge-dot { background: #2E86C1; }
.badge-resolved    { background: #D5F5E3; color: #145A32; } .badge-resolved .badge-dot    { background: #27AE60; }

.action-btns { display: flex; gap: 6px; flex-wrap: wrap; }

/* ── Drawer ──────────────────────────────────── */
.drawer-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 200; display: flex; justify-content: flex-end;
}
.drawer {
  width: 420px; height: 100%;
  background: var(--card);
  display: flex; flex-direction: column;
  box-shadow: -8px 0 32px rgba(0,0,0,0.12);
  overflow-y: auto;
}
.drawer-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; background: var(--card); z-index: 1;
}
.drawer-title { font-size: 17px; font-weight: 700; color: var(--text); }
.drawer-sub   { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.drawer-close {
  background: none; border: none; cursor: pointer;
  color: var(--text-muted); padding: 4px;
  transition: color 0.15s;
}
.drawer-close:hover { color: var(--text); }
.drawer-body { padding: 20px 24px; flex: 1; }

.detail-section { margin-bottom: 22px; }
.detail-label { font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
.detail-card { background: var(--bg); border-radius: var(--radius-sm); border: 1px solid var(--border); overflow: hidden; }
.detail-row { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid var(--border); font-size: 13.5px; }
.detail-row:last-child { border-bottom: none; }
.dl { color: var(--text-muted); }
.dv { font-weight: 500; color: var(--text); text-align: right; max-width: 60%; word-break: break-all; }

.issue-box {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 12px 14px;
  font-size: 13.5px; color: var(--text); line-height: 1.6;
  white-space: pre-wrap;
}

.admin-note-input {
  width: 100%; padding: 10px 12px;
  border: 1.5px solid var(--border); border-radius: var(--radius-sm);
  font-family: var(--font); font-size: 13.5px; color: var(--text);
  resize: vertical; outline: none; transition: border-color 0.15s;
  box-sizing: border-box;
}
.admin-note-input:focus { border-color: var(--primary); }
.admin-note-input::placeholder { color: var(--text-muted); }

.resolved-note {
  font-size: 13px; color: var(--success);
  background: var(--success-bg);
  padding: 10px 14px; border-radius: var(--radius-sm);
}

/* Drawer transition */
.drawer-enter-active { transition: opacity 0.22s ease; }
.drawer-leave-active { transition: opacity 0.18s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-active .drawer { animation: slide-in 0.26s cubic-bezier(0.34,1.3,0.64,1) both; }
.drawer-leave-active .drawer  { animation: slide-out 0.2s ease-in both; }
@keyframes slide-in  { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes slide-out { from { transform: translateX(0); }   to { transform: translateX(100%); } }
</style>
