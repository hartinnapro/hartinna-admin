<template>
  <div class="page">

    <div class="page-header">
      <div>
        <h1 class="page-title">Partner Levels</h1>
        <div class="page-sub">伙伴等级 · Configure display labels for each partner tier</div>
      </div>
      <button class="btn-primary" @click="openAdd">+ Add Level</button>
    </div>

    <!-- Table -->
    <div class="card table-card">
      <div class="loading-center" v-if="loading">
        <div class="spinner"></div><span>Loading levels…</span>
      </div>

      <div class="empty-state" v-else-if="levels.length === 0">
        <svg width="40" height="40" fill="none" stroke="var(--primary)" stroke-width="1.5" viewBox="0 0 24 24" opacity="0.3">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        <h3>No levels configured</h3>
        <p>Add your first partner level to get started.</p>
      </div>

      <table class="data-table" v-else>
        <thead>
          <tr>
            <th style="width:80px">Order</th>
            <th style="width:100px">Code</th>
            <th>English Label</th>
            <th>Chinese Label</th>
            <th style="width:140px">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(lvl, i) in levels" :key="lvl.id">
            <td>
              <div class="order-btns">
                <button class="order-btn" @click="moveUp(i)"   :disabled="i === 0 || reordering" title="Move up">▲</button>
                <button class="order-btn" @click="moveDown(i)" :disabled="i === levels.length - 1 || reordering" title="Move down">▼</button>
              </div>
            </td>
            <td><span class="level-code-badge">{{ lvl.code }}</span></td>
            <td class="label-cell">{{ lvl.label_en }}</td>
            <td class="label-cell cn">{{ lvl.label_cn }}</td>
            <td>
              <div class="row-actions">
                <button class="btn-row-edit"   @click="openEdit(lvl)">Edit</button>
                <button class="btn-row-delete" @click="confirmDelete(lvl)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Add / Edit Drawer ───────────────────────────────────────── -->
    <div class="drawer-overlay" v-if="drawer.open" @click="closeDrawer"></div>
    <div class="drawer" :class="{ open: drawer.open }">
      <div class="drawer-header">
        <h3>{{ drawer.mode === 'add' ? 'Add Level' : 'Edit Level' }}</h3>
        <button class="drawer-close" @click="closeDrawer">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="drawer-body">
        <div class="form-group">
          <label class="form-label">Level Code <span class="req">*</span></label>
          <input
            v-model="form.code"
            type="text"
            class="form-input"
            placeholder="e.g. BM"
            maxlength="10"
            @input="form.code = form.code.toUpperCase()"
          />
          <div class="form-hint">Short code displayed to agents (2–5 uppercase letters)</div>
        </div>

        <div class="form-group">
          <label class="form-label">English Label <span class="req">*</span></label>
          <input v-model="form.label_en" type="text" class="form-input" placeholder="e.g. Branch Manager" />
        </div>

        <div class="form-group">
          <label class="form-label">Chinese Label <span class="req">*</span></label>
          <input v-model="form.label_cn" type="text" class="form-input" placeholder="e.g. 店长" />
        </div>

        <div class="form-error" v-if="formError">{{ formError }}</div>
      </div>

      <div class="drawer-footer">
        <button class="btn-secondary" @click="closeDrawer">Cancel</button>
        <button class="btn-primary" @click="saveLevel" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>

    <!-- ── Delete Confirmation ─────────────────────────────────────── -->
    <div class="modal-overlay" v-if="deleteTarget" @click="deleteTarget = null"></div>
    <div class="modal" v-if="deleteTarget">
      <div class="modal-icon">
        <svg width="28" height="28" fill="none" stroke="#D4276C" stroke-width="1.8" viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </div>
      <h3 class="modal-title">Delete Level</h3>
      <p class="modal-desc">
        Delete <strong>{{ deleteTarget.code }} — {{ deleteTarget.label_en }}</strong>?
      </p>
      <p class="modal-warn">
        ⚠ Members currently assigned this level will show a raw code until reassigned.
      </p>
      <div class="modal-footer">
        <button class="btn-secondary" @click="deleteTarget = null">Cancel</button>
        <button class="btn-danger" @click="doDelete" :disabled="deleting">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const TABLE = 'partner_level_configs'

const levels    = ref([])
const loading   = ref(true)
const reordering = ref(false)

// ── Drawer ──────────────────────────────────────────────────────────
const drawer = ref({ open: false, mode: 'add', editId: null })
const form   = ref({ code: '', label_en: '', label_cn: '' })
const formError = ref('')
const saving    = ref(false)

// ── Delete ──────────────────────────────────────────────────────────
const deleteTarget = ref(null)
const deleting     = ref(false)

// ── Load ─────────────────────────────────────────────────────────────
onMounted(loadLevels)

async function loadLevels() {
  loading.value = true
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('sort_order', { ascending: false })
  if (error) { console.error(error); loading.value = false; return }
  levels.value = data || []
  loading.value = false
}

// ── Drawer helpers ────────────────────────────────────────────────────
function openAdd() {
  form.value   = { code: '', label_en: '', label_cn: '' }
  formError.value = ''
  drawer.value = { open: true, mode: 'add', editId: null }
}

function openEdit(lvl) {
  form.value   = { code: lvl.code, label_en: lvl.label_en, label_cn: lvl.label_cn }
  formError.value = ''
  drawer.value = { open: true, mode: 'edit', editId: lvl.id }
}

function closeDrawer() {
  drawer.value.open = false
}

function validate() {
  if (!form.value.code.trim())     return 'Level code is required.'
  if (!form.value.label_en.trim()) return 'English label is required.'
  if (!form.value.label_cn.trim()) return 'Chinese label is required.'
  if (!/^[A-Z0-9]{1,10}$/.test(form.value.code)) return 'Code must be 1–10 uppercase letters or numbers.'

  // Duplicate code check (exclude self on edit)
  const dup = levels.value.find(l =>
    l.code === form.value.code &&
    (drawer.value.mode === 'add' || l.id !== drawer.value.editId)
  )
  if (dup) return `Code "${form.value.code}" is already in use.`

  return ''
}

async function saveLevel() {
  formError.value = validate()
  if (formError.value) return

  saving.value = true

  if (drawer.value.mode === 'add') {
    // New level gets sort_order = max + 1
    const maxOrder = levels.value.length ? levels.value[levels.value.length - 1].sort_order : 0
    const { error } = await supabase.from(TABLE).insert({
      code:       form.value.code.trim(),
      label_en:   form.value.label_en.trim(),
      label_cn:   form.value.label_cn.trim(),
      sort_order: maxOrder + 1
    })
    if (error) { formError.value = error.message; saving.value = false; return }
  } else {
    const { error } = await supabase.from(TABLE)
      .update({
        code:     form.value.code.trim(),
        label_en: form.value.label_en.trim(),
        label_cn: form.value.label_cn.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', drawer.value.editId)
    if (error) { formError.value = error.message; saving.value = false; return }
  }

  saving.value = false
  closeDrawer()
  loadLevels()
}

// ── Delete ────────────────────────────────────────────────────────────
function confirmDelete(lvl) {
  deleteTarget.value = lvl
}

async function doDelete() {
  deleting.value = true
  const { error } = await supabase.from(TABLE).delete().eq('id', deleteTarget.value.id)
  if (error) { alert(error.message); deleting.value = false; return }
  deleting.value = false
  deleteTarget.value = null
  loadLevels()
}

// ── Reorder (swap adjacent sort_order values) ──────────────────────
async function moveUp(i) {
  if (i === 0 || reordering.value) return
  await swapOrder(i, i - 1)
}
async function moveDown(i) {
  if (i === levels.value.length - 1 || reordering.value) return
  await swapOrder(i, i + 1)
}
async function swapOrder(a, b) {
  reordering.value = true
  const lvlA = levels.value[a]
  const lvlB = levels.value[b]
  const orderA = lvlA.sort_order
  const orderB = lvlB.sort_order

  // Use a temp value to avoid unique constraint conflict if any
  const temp = Math.max(...levels.value.map(l => l.sort_order)) + 999

  await supabase.from(TABLE).update({ sort_order: temp       }).eq('id', lvlA.id)
  await supabase.from(TABLE).update({ sort_order: orderA     }).eq('id', lvlB.id)
  await supabase.from(TABLE).update({ sort_order: orderB     }).eq('id', lvlA.id)

  reordering.value = false
  loadLevels()
}
</script>

<style scoped>
.page         { padding: 24px; }
.page-header  { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-title   { font-size: 22px; font-weight: 700; color: var(--text); }
.page-sub     { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

/* Table */
.table-card { overflow: hidden; }

.level-code-badge {
  display: inline-block;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 12px; font-weight: 700;
  letter-spacing: 0.06em;
  padding: 3px 10px;
  border-radius: 6px;
}

.label-cell { font-size: 13.5px; }
.label-cell.cn { letter-spacing: 0.03em; }

.order-btns { display: flex; flex-direction: column; gap: 2px; align-items: center; }
.order-btn {
  background: none; border: 1px solid var(--border);
  border-radius: 3px; padding: 1px 6px;
  cursor: pointer; color: var(--text-muted);
  font-size: 10px; line-height: 1.6;
  transition: all 0.12s;
}
.order-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.order-btn:disabled { opacity: 0.25; cursor: not-allowed; }

.row-actions { display: flex; gap: 6px; }
.btn-row-edit {
  padding: 4px 12px; font-size: 12.5px; font-weight: 500;
  border: 1px solid var(--border); border-radius: 5px;
  background: white; color: var(--text); cursor: pointer;
  transition: all 0.12s;
}
.btn-row-edit:hover { border-color: var(--primary); color: var(--primary); }
.btn-row-delete {
  padding: 4px 12px; font-size: 12.5px; font-weight: 500;
  border: 1px solid #FADBD8; border-radius: 5px;
  background: #FEF9F9; color: #C0392B; cursor: pointer;
  transition: all 0.12s;
}
.btn-row-delete:hover { background: #FADBD8; }

/* Drawer */
.drawer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35);
  z-index: 200;
}
.drawer {
  position: fixed; right: 0; top: 0; bottom: 0;
  width: 380px; background: white;
  box-shadow: -4px 0 32px rgba(0,0,0,0.12);
  z-index: 201;
  display: flex; flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
}
.drawer.open { transform: translateX(0); }

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}
.drawer-header h3 { font-size: 16px; font-weight: 600; color: var(--text); }
.drawer-close {
  background: none; border: none; cursor: pointer;
  color: var(--text-muted); padding: 4px;
  border-radius: 4px; display: flex; align-items: center;
  transition: color 0.12s;
}
.drawer-close:hover { color: var(--text); }

.drawer-body { flex: 1; padding: 20px; overflow-y: auto; }

.form-group   { margin-bottom: 18px; }
.form-label   { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.req          { color: var(--primary); }
.form-input {
  width: 100%; padding: 9px 12px; font-size: 14px;
  border: 1px solid var(--border); border-radius: 7px;
  background: #FAFAFA; color: var(--text);
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.form-input:focus {
  outline: none; border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(212,39,108,0.1);
  background: white;
}
.form-hint  { font-size: 11.5px; color: var(--text-muted); margin-top: 5px; }
.form-error { color: #C0392B; font-size: 12.5px; padding: 8px 12px; background: #FEF9F9; border-radius: 6px; border: 1px solid #FADBD8; }

.drawer-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 300;
}
.modal {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: white; border-radius: 12px;
  padding: 28px 28px 24px;
  width: 380px; max-width: calc(100vw - 32px);
  z-index: 301; text-align: center;
  box-shadow: 0 16px 48px rgba(0,0,0,0.18);
}
.modal-icon { margin-bottom: 12px; }
.modal-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
.modal-desc  { font-size: 14px; color: var(--text-muted); margin-bottom: 10px; }
.modal-warn  { font-size: 12.5px; color: #7A5510; background: var(--warning-bg); padding: 8px 12px; border-radius: 6px; margin-bottom: 4px; }
.modal-footer {
  display: flex; justify-content: center; gap: 10px; margin-top: 20px;
}
.btn-danger {
  padding: 9px 20px; font-size: 13.5px; font-weight: 600;
  background: #C0392B; color: white; border: none;
  border-radius: 8px; cursor: pointer; transition: background 0.15s;
}
.btn-danger:hover:not(:disabled) { background: #A93226; }
.btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
