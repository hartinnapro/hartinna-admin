<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Products</h1>
        <div class="page-sub">{{ products.length }} products</div>
      </div>
      <button class="btn btn-primary" @click="openAdd">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Product
      </button>
    </div>

    <div class="card table-card">
      <div class="loading-center" v-if="loading"><div class="spinner"></div><span>Loading…</span></div>
      <table class="data-table" v-else>
        <thead>
          <tr>
            <th>SKU</th><th>Product</th><th style="width:60px;">Image</th>
            <th v-for="l in levels" :key="l.value" style="text-align:right;">{{ l.label }}</th>
            <th style="text-align:center;">Active</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td style="font-size:12px; color:var(--text-muted);">{{ p.sku }}</td>
            <td>
              <div style="font-weight:500; line-height:1.3;">{{ p.name }}</div>
              <div v-if="p.name_zh" style="font-size:12px; color:var(--text-muted); margin-top:2px;">{{ p.name_zh }}</div>
            </td>
            <td>
              <img v-if="p.image_url" :src="p.image_url" style="width:40px;height:40px;object-fit:cover;border-radius:6px;display:block;" :alt="p.name" />
              <div v-else style="width:40px;height:40px;border-radius:6px;background:var(--border);display:flex;align-items:center;justify-content:center;">
                <svg width="16" height="16" fill="none" stroke="var(--text-muted)" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
            </td>
            <td v-for="l in levels" :key="l.value" style="text-align:right; font-size:13px;">
              {{ priceFor(p, l.value) }}
            </td>
            <td style="text-align:center;">
              <button class="toggle-btn" :class="p.is_active ? 'toggle-on' : 'toggle-off'" @click="toggleActive(p)" :title="p.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'">
                <span class="toggle-knob"></span>
              </button>
            </td>
            <td>
              <button class="btn-icon" @click="openEdit(p)" title="Edit product">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Right-side drawer -->
    <Transition name="drawer-backdrop">
      <div class="drawer-overlay" v-if="showModal" @click.self="requestClose"></div>
    </Transition>
    <Transition name="drawer">
      <div class="drawer" v-if="showModal">
        <div class="drawer-body">
          <!-- Unsaved changes banner -->
          <Transition name="banner-slide">
            <div class="unsaved-banner" v-if="showUnsaved">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="flex-shrink:0">
                <circle cx="9" cy="9" r="9" fill="#FFF3E0"/>
                <circle cx="9" cy="9" r="7" stroke="#F57C00" stroke-width="1.5" fill="none"/>
                <rect x="8.1" y="4.5" width="1.8" height="5.5" rx="0.9" fill="#F57C00"/>
                <circle cx="9" cy="12.5" r="1" fill="#F57C00"/>
              </svg>
              <span class="unsaved-banner-text">Unsaved changes</span>
              <div class="unsaved-banner-btns">
                <button class="unsaved-btn-abandon" @click="forceClose">Abandon</button>
                <button class="unsaved-btn-save" @click="saveAndClose" :disabled="saving">
                  {{ saving ? 'Saving…' : 'Save' }}
                </button>
              </div>
            </div>
          </Transition>

          <div class="alert alert-error" v-if="formError">{{ formError }}</div>

          <!-- SKU + Sort # — 2:1 ratio -->
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div class="grid-form-21">
              <div class="inline-field" :class="{ 'input-dirty': isDirty('sku') }">
                <span class="inline-tag">SKU</span>
                <input id="f-sku" v-model="form.sku" placeholder="HPP-001" :disabled="!!editingId" />
              </div>
              <div class="inline-field" :class="{ 'input-dirty': isDirty('sort_order') }">
                <span class="inline-tag">Sort #</span>
                <input id="f-sort" v-model.number="form.sort_order" type="text" inputmode="numeric"
                  @keydown="onQtyKeydown" style="text-align:center;" />
              </div>
            </div>
            <div class="inline-field" :class="{ 'input-dirty': isDirty('name') }">
              <span class="inline-tag">EN</span>
              <input id="f-name" v-model="form.name" placeholder="Product name in English" />
            </div>
            <div class="inline-field" :class="{ 'input-dirty': isDirty('name_zh') }">
              <span class="inline-tag">CN</span>
              <input id="f-namezh" v-model="form.name_zh" placeholder="中文名称（可选）" />
            </div>
          </div>

          <!-- Description -->
          <div class="form-group" style="margin-top:12px;">
            <label for="f-desc">Description</label>
            <textarea id="f-desc" v-model="form.description" placeholder="Product description…" rows="3" :class="{ 'input-dirty': isDirty('description') }"></textarea>
          </div>

          <!-- Image (no label) -->
          <div class="form-group" style="margin-top:4px;">
            <div class="img-upload-area" :class="{ 'input-dirty': isDirty('image') }" @click="triggerFileInput" @dragover.prevent @drop.prevent="onDrop">
              <img v-if="imagePreview" :src="imagePreview" class="img-preview" alt="Product preview" />
              <div v-else class="img-placeholder">
                <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Click or drag an image here</span>
                <span class="img-hint">JPG / PNG · auto-compressed to ≤120 KB</span>
              </div>
              <button v-if="imagePreview" class="img-remove" @click.stop="removeImage" title="Remove image">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <input id="product-image" name="productImage" ref="fileInputRef" type="file" accept="image/*" style="display:none" @change="onFileChange" />
            <div v-if="uploadProgress" class="img-progress">
              <div class="img-progress-bar" :style="{ width: uploadProgress + '%' }"></div>
            </div>
          </div>

          <div class="divider"></div>
          <div style="font-size:13px; font-weight:600; color:var(--text-muted); margin-bottom:12px; letter-spacing:0.02em;">Pricing by Title</div>
          <div v-for="l in levels" :key="l.value" class="price-row">
            <span class="price-label">{{ l.label }}</span>
            <div class="price-fields">
              <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:11px;">Price (MYR)</label>
                <input
                  :id="`price-${l.value}`"
                  :name="`price-${l.value}`"
                  @keydown="onPriceKeydown($event, l.value)"
                  @input="onPriceInput($event, l.value)"
                  @blur="onPriceBlur($event, l.value)"
                  type="text" inputmode="decimal"
                  style="width:120px; text-align:right;"
                  :class="{ 'input-dirty': isPriceDirty(l.value, 'price'), 'input-error': priceError[l.value], 'shake': priceShake[l.value] }" />
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:11px;">Min. Qty</label>
                <input
                  :id="`qty-${l.value}`"
                  :name="`qty-${l.value}`"
                  @keydown="onQtyKeydown"
                  @input="onQtyInput($event, l.value)"
                  @blur="onQtyBlur($event, l.value)"
                  type="text" inputmode="numeric"
                  style="width:80px; text-align:center;"
                  :class="{ 'input-dirty': isPriceDirty(l.value, 'min_qty') }" />
              </div>
            </div>
          </div>
        </div>
        <div class="drawer-footer">
          <button class="btn btn-outline" @click="requestClose">Cancel</button>
          <button class="btn btn-primary" @click="saveProduct"
            :disabled="saving || !hasChanges() || Object.values(priceError).some(Boolean) || levels.some(l => !(form.prices[l.value]?.price > 0))">
            {{ saving ? 'Saving…' : (editingId ? 'Save Changes' : 'Add Product') }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Image crop / zoom editor -->
    <Transition name="drawer-backdrop">
      <div class="editor-overlay" v-if="editorMode" @click.self="cancelEditor" @wheel.prevent="onEditorWheel">
        <div class="editor-panel">
          <div class="editor-header">
            <span class="editor-title">Crop &amp; Zoom</span>
            <button class="modal-close" @click="cancelEditor">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <canvas ref="editorCanvasRef" class="editor-canvas"
            @mousedown="startDrag" @mousemove="onDrag" @mouseup="endDrag" @mouseleave="endDrag"
            @touchstart.prevent="startDragTouch" @touchmove.prevent="onDragTouch" @touchend="endDrag">
          </canvas>
          <div class="editor-zoom-row">
            <button class="editor-zoom-btn" @click="adjustZoom(-0.15)">−</button>
            <input id="editor-zoom" name="zoom" type="range" v-model.number="zoom" min="1" max="5" step="0.05"
              class="editor-slider" @input="renderEditor" />
            <button class="editor-zoom-btn" @click="adjustZoom(0.15)">+</button>
            <span class="editor-zoom-label">{{ Math.round(zoom * 100) }}%</span>
          </div>
          <div class="editor-footer">
            <button class="btn btn-outline" @click="cancelEditor">Cancel</button>
            <button class="btn btn-primary" @click="applyEditor">Use Photo</button>
          </div>
        </div>
      </div>
    </Transition>
    <!-- Unsaved changes banner (inline, no overlay) -->

    <!-- Image delete confirmation -->
    <Transition name="drawer-backdrop">
      <div class="confirm-overlay" v-if="showImgDeleteConfirm" @click.self="showImgDeleteConfirm = false">
        <div class="confirm-panel">
          <div class="confirm-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#FDE8F1"/>
              <circle cx="24" cy="24" r="18" stroke="#D4276C" stroke-width="2.5" fill="none"/>
              <path d="M17 17l14 14M31 17L17 31" stroke="#D4276C" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="confirm-title">Remove Image?</div>
          <div class="confirm-msg">
            The product image will be removed.<br>This change takes effect when you save.
          </div>
          <div class="confirm-footer">
            <button class="btn btn-outline" @click="showImgDeleteConfirm = false">Cancel</button>
            <button class="btn btn-danger" @click="doRemoveImage">Remove</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Low-price warning -->
    <Transition name="drawer-backdrop">
      <div class="confirm-overlay" v-if="priceWarnLevel" @click.self="priceWarnLevel = null">
        <div class="confirm-panel">
          <div class="confirm-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#FFF3E0"/>
              <circle cx="24" cy="24" r="18" stroke="#F57C00" stroke-width="2.5" fill="none"/>
              <rect x="22.5" y="13" width="3" height="14" rx="1.5" fill="#F57C00"/>
              <circle cx="24" cy="33" r="2" fill="#F57C00"/>
            </svg>
          </div>
          <div class="confirm-title">Unusually Low Price</div>
          <div class="confirm-msg">
            You entered a price of
            <span class="price-warn-val">MYR {{ formatPrice(priceWarnVal) }}</span>
            for <strong>{{ levels.find(l => l.value === priceWarnLevel)?.label }}</strong> on
          </div>
          <div class="confirm-names">
            <div class="confirm-name-en">{{ form.name }}</div>
            <div class="confirm-name-zh" v-if="form.name_zh">{{ form.name_zh }}</div>
          </div>
          <div class="confirm-msg" style="margin-top:4px;">
            This seems very low. Please confirm.
          </div>
          <div class="confirm-footer">
            <button class="btn btn-outline" @click="priceWarnLevel = null">Cancel</button>
            <button class="btn btn-primary" @click="priceWarnLevel = null">Confirm Anyway</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Deactivate confirmation -->
    <Transition name="drawer-backdrop">
      <div class="confirm-overlay" v-if="confirmTarget" @click.self="confirmTarget = null">
        <div class="confirm-panel">
          <div class="confirm-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#FDE8F1"/>
              <circle cx="24" cy="24" r="18" stroke="#D4276C" stroke-width="2.5" fill="none"/>
              <rect x="22.5" y="13" width="3" height="14" rx="1.5" fill="#D4276C"/>
              <circle cx="24" cy="33" r="2" fill="#D4276C"/>
            </svg>
          </div>
          <div class="confirm-title">Deactivate Product?</div>
          <div class="confirm-names">
            <div class="confirm-name-en">{{ confirmTarget?.name }}</div>
            <div class="confirm-name-zh" v-if="confirmTarget?.name_zh">{{ confirmTarget?.name_zh }}</div>
          </div>
          <div class="confirm-msg">
            will be hidden from all agents immediately.<br>You can reactivate it anytime.
          </div>
          <div class="confirm-footer">
            <button class="btn btn-outline" @click="confirmTarget = null">Cancel</button>
            <button class="btn btn-danger" @click="doToggle">Deactivate</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const products      = ref([])
const loading       = ref(true)
const showModal     = ref(false)
const saving        = ref(false)
const editingId     = ref(null)
const formError     = ref('')
const fileInputRef  = ref(null)
const imagePreview  = ref('')
const uploadProgress = ref(0)

const levels = [
  { value: 'store_manager',    label: 'BM'   },
  { value: 'director',         label: 'MD'   },
  { value: 'ceo',              label: 'CEO'  },
  { value: 'branch',           label: 'BO'   },
  { value: 'exec_shareholder', label: 'CORP' },
]

function emptyForm() {
  return {
    sku: '', name: '', name_zh: '', description: '', sort_order: 0,
    image_url: '',
    prices: Object.fromEntries(levels.map(l => [l.value, { price: 0, min_qty: 1 }]))
  }
}
const form = ref(emptyForm())

// Plain variable — keeps Blob outside Vue reactivity (avoids Proxy corruption)
let pendingImageFile = null

// ── Image handling ───────────────────────────────
function triggerFileInput() { fileInputRef.value?.click() }

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) handleImageFile(file)
  e.target.value = ''
}

function onDrop(e) {
  const file = e.dataTransfer.files?.[0]
  if (file && file.type.startsWith('image/')) handleImageFile(file)
}

const showImgDeleteConfirm = ref(false)

function removeImage() {
  if (form.value.image_url || imagePreview.value) {
    showImgDeleteConfirm.value = true   // ask confirmation for any existing image
  }
}

function doRemoveImage() {
  imagePreview.value   = ''
  form.value.image_url = ''
  pendingImageFile     = null
  showImgDeleteConfirm.value = false
}

// Open crop editor instead of compressing immediately
function handleImageFile(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      editorRawImg   = img
      zoom.value     = 1
      panX.value     = 0
      panY.value     = 0
      editorMode.value = true
      setTimeout(renderEditor, 30)
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

// ── Canvas crop / zoom editor ─────────────────────
const CANVAS_SIZE = 300
const OUTPUT_SIZE = 600

const editorMode      = ref(false)
const editorCanvasRef = ref(null)
let   editorRawImg    = null
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
let isDragging = false, lastX = 0, lastY = 0

function clampPan() {
  if (!editorRawImg) return
  const coverScale = Math.max(CANVAS_SIZE / editorRawImg.naturalWidth, CANVAS_SIZE / editorRawImg.naturalHeight)
  const scale = coverScale * zoom.value
  const maxX = (editorRawImg.naturalWidth  * scale - CANVAS_SIZE) / 2
  const maxY = (editorRawImg.naturalHeight * scale - CANVAS_SIZE) / 2
  panX.value = Math.max(-maxX, Math.min(maxX, panX.value))
  panY.value = Math.max(-maxY, Math.min(maxY, panY.value))
}

function renderEditor() {
  const canvas = editorCanvasRef.value
  if (!canvas || !editorRawImg) return
  canvas.width = canvas.height = CANVAS_SIZE
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  const img = editorRawImg
  const coverScale = Math.max(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight)
  const scale = coverScale * zoom.value
  const w = img.naturalWidth  * scale
  const h = img.naturalHeight * scale
  ctx.drawImage(img, (CANVAS_SIZE - w) / 2 + panX.value, (CANVAS_SIZE - h) / 2 + panY.value, w, h)
}

function adjustZoom(delta) {
  zoom.value = Math.max(1, Math.min(5, zoom.value + delta))
  clampPan()
  renderEditor()
}

function onEditorWheel(e)  { adjustZoom(e.deltaY < 0 ? 0.1 : -0.1) }
function startDrag(e)      { isDragging = true; lastX = e.clientX;         lastY = e.clientY }
function startDragTouch(e) { isDragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY }
function endDrag()         { isDragging = false }

function onDrag(e) {
  if (!isDragging) return
  panX.value += e.clientX - lastX; lastX = e.clientX
  panY.value += e.clientY - lastY; lastY = e.clientY
  clampPan()
  renderEditor()
}
function onDragTouch(e) {
  if (!isDragging) return
  panX.value += e.touches[0].clientX - lastX; lastX = e.touches[0].clientX
  panY.value += e.touches[0].clientY - lastY; lastY = e.touches[0].clientY
  clampPan()
  renderEditor()
}

function cancelEditor() { editorMode.value = false; editorRawImg = null }

async function applyEditor() {
  const src = editorCanvasRef.value
  if (!src) return
  const out = document.createElement('canvas')
  out.width = out.height = OUTPUT_SIZE
  out.getContext('2d').drawImage(src, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  // Binary-search compress to ≤120 KB
  let lo = 0.1, hi = 0.95, best = null
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2
    const b = await new Promise(r => out.toBlob(r, 'image/jpeg', mid))
    if (b && b.size <= 120 * 1024) { best = b; lo = mid } else { hi = mid }
  }
  const blob = best || await new Promise(r => out.toBlob(r, 'image/jpeg', 0.1))
  pendingImageFile   = blob
  imagePreview.value = URL.createObjectURL(blob)
  editorMode.value   = false
}

async function uploadImage(file, sku) {
  uploadProgress.value = 10
  const ext  = 'jpg'
  const path = `${sku}-${Date.now()}.${ext}`
  uploadProgress.value = 40

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true, contentType: 'image/jpeg' })

  if (error) throw error
  uploadProgress.value = 90

  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  uploadProgress.value = 100
  setTimeout(() => { uploadProgress.value = 0 }, 600)
  return data.publicUrl
}

const showUnsaved  = ref(false)
let   originalForm = null   // deep snapshot taken on drawer open

function snapshotForm() {
  originalForm = JSON.parse(JSON.stringify(form.value))
}

function isDirty(field) {
  if (!originalForm) return false
  if (field === 'image') return !!pendingImageFile || form.value.image_url !== (originalForm.image_url ?? '')
  return JSON.stringify(form.value[field]) !== JSON.stringify(originalForm[field])
}

function isPriceDirty(level, subfield) {
  if (!originalForm) return false
  return form.value.prices[level]?.[subfield] !== originalForm.prices?.[level]?.[subfield]
}

function hasChanges() {
  if (pendingImageFile) return true
  return JSON.stringify(form.value) !== JSON.stringify(originalForm)
}

function requestClose() {
  if (hasChanges()) { showUnsaved.value = true } else { forceClose() }
}

function forceClose() {
  showModal.value   = false
  showUnsaved.value = false
  pendingImageFile  = null
}

async function saveAndClose() {
  showUnsaved.value = false
  await saveProduct()
}

function formatPrice(val) {
  const n = parseFloat(val)
  if (isNaN(n)) return ''
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const PASS_KEYS = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']

function onPriceKeydown(e, level) {
  if (e.ctrlKey || e.metaKey) return

  // Delete = always wipe the field regardless of cursor position or value
  if (e.key === 'Delete') {
    e.preventDefault()
    form.value.prices[level].price = 0
    priceDisplay[level] = ''
    e.target.value = ''
    return
  }

  if (PASS_KEYS.includes(e.key)) return

  if (/^\d$/.test(e.key)) {
    const inp = e.target
    const stripped = inp.value.replace(/,/g, '')
    if (/^\d+\.00$/.test(stripped) && inp.selectionStart === inp.selectionEnd) {
      const dotPos = inp.value.indexOf('.')
      if (inp.selectionStart > dotPos) {
        // Cursor is inside .00 — park before the dot
        inp.setSelectionRange(dotPos, dotPos)
      } else if (stripped === '0.00') {
        // Value is exactly zero — select the '0' so digit replaces it (not appends to it)
        inp.setSelectionRange(0, dotPos)
      }
    }
    return
  }

  if (e.key === '.') {
    const cur = e.target.value.replace(/,/g, '')
    const isAutoInt = /^\d+\.00$/.test(cur)
    const hasUserDecimal = !isAutoInt && cur.includes('.')
    if (!hasUserDecimal) return
  }
  e.preventDefault()
}

function onQtyKeydown(e) {
  if (PASS_KEYS.includes(e.key) || e.ctrlKey || e.metaKey) return
  if (/^\d$/.test(e.key)) return
  e.preventDefault()
}

function onQtyInput(e, level) {
  // Show raw string as user types — don't coerce to 1 mid-input (the || 1 trick kills zero)
  const inp = e.target
  const digits = inp.value.replace(/\D/g, '')
  qtyDisplay[level] = digits
  inp.value = digits
  form.value.prices[level].min_qty = parseInt(digits, 10) || 0  // 0 is OK mid-type
}

function onQtyBlur(e, level) {
  // On blur: clamp to minimum 1
  const v = Math.max(1, parseInt(qtyDisplay[level], 10) || 1)
  form.value.prices[level].min_qty = v
  qtyDisplay[level] = String(v)
}

// priceDisplay: single source of truth for each price input's displayed value
const priceDisplay   = reactive({})
const qtyDisplay     = reactive({})
const priceWarnLevel = ref(null)
const priceWarnVal   = ref(0)
const priceError     = reactive({})   // level → true when price is 0
const priceShake     = reactive({})   // level → true during shake animation

function syncPriceDisplay() {
  for (const l of levels) {
    priceDisplay[l.value] = formatPrice(form.value.prices[l.value]?.price ?? 0)
    qtyDisplay[l.value]   = String(form.value.prices[l.value]?.min_qty ?? 1)
    priceError[l.value]   = false
    priceShake[l.value]   = false
  }
}

function onPriceFocus(e, level) {
  // Don't clear priceError here — keep red border until a valid value is committed
  const val = form.value.prices[level].price
  // Show raw numeric string; empty if 0 (user will type fresh)
  const rawStr = val > 0 ? String(parseFloat(val.toFixed(2))) : ''
  priceDisplay[level] = rawStr
  e.target.value = rawStr
  e.target.select()
}

function onPriceInput(e, level) {
  const inp = e.target
  let displayVal = inp.value

  // Strip commas first
  let raw = displayVal.replace(/,/g, '')

  // Detect "user typed . into our auto-formatted integer" → produces "234..00"
  if (raw.includes('..')) {
    // Extract just the integer part before the double-dot, add single decimal point
    raw = raw.split('..')[0] + '.'
  } else if (/^\d+\.00$/.test(raw)) {
    // Value matches our auto-appended .00 exactly → strip it, treat as integer
    raw = raw.slice(0, -3)
  }

  // Sanitize: remove any non-digit/dot chars, collapse multiple dots to first one only
  raw = raw.replace(/[^\d.]/g, '')
  const firstDot = raw.indexOf('.')
  if (firstDot !== -1) {
    raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '')
  }

  // Limit to 2 decimal places
  if (raw.includes('.')) {
    const [int, dec] = raw.split('.')
    raw = int + '.' + dec.slice(0, 2)
  }

  form.value.prices[level].price = parseFloat(raw) || 0
  // If there are no integer digits (e.g. ".00" left after backspacing) → clear to empty
  if (!raw || raw === '.' || raw.startsWith('.')) {
    priceDisplay[level] = ''
    inp.value = ''
    return
  }

  let display, cursor
  if (raw.includes('.')) {
    // User has typed a real decimal — format integer part, keep decimal as-is
    const [int, dec] = raw.split('.')
    const fmtInt = int ? Number(int).toLocaleString('en-MY') : '0'
    display = fmtInt + '.' + dec
    cursor = display.length
  } else {
    // Integer mode — auto-append .00, park cursor before it
    const fmtInt = raw ? Number(raw).toLocaleString('en-MY') : ''
    display = fmtInt + '.00'
    cursor = fmtInt.length
  }

  priceDisplay[level] = display
  inp.value = display
  inp.setSelectionRange(cursor, cursor)
}

function onPriceBlur(e, level) {
  const parsed = Math.round((parseFloat(String(priceDisplay[level] ?? '').replace(/,/g,'')) || 0) * 100) / 100

  if (parsed === 0) {
    const inp = e.target
    priceError[level] = true
    priceShake[level] = true                         // Vue adds .shake class reactively
    setTimeout(() => {
      priceShake[level] = false                      // Vue removes it after animation
      inp.focus()
      inp.select()
    }, 400)
    return
  }

  priceError[level] = false
  form.value.prices[level].price = parsed
  priceDisplay[level] = formatPrice(parsed)
  if (parsed > 0 && parsed < 2.01) {
    priceWarnLevel.value = level; priceWarnVal.value = parsed
  }
}

function priceFor(product, level) {
  const p = product.product_prices?.find(pp => pp.level === level)
  return p ? Number(p.price).toFixed(2) : '—'
}

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
  formError.value = ''
  imagePreview.value = ''
  pendingImageFile = null
  showModal.value = true
  snapshotForm()
  syncPriceDisplay()
}

function openEdit(product) {
  editingId.value = product.id
  form.value = {
    sku:         product.sku,
    name:        product.name,
    name_zh:     product.name_zh || '',
    description: product.description || '',
    sort_order:  product.sort_order,
    image_url:   product.image_url || '',
    prices:      Object.fromEntries(levels.map(l => {
      const p = product.product_prices?.find(pp => pp.level === l.value)
      return [l.value, { price: p?.price ?? 0, min_qty: p?.min_qty ?? 1 }]
    }))
  }
  formError.value = ''
  imagePreview.value = product.image_url || ''
  pendingImageFile = null
  showModal.value = true
  snapshotForm()
  syncPriceDisplay()
}

async function saveProduct() {
  formError.value = ''
  if (!form.value.sku || !form.value.name) { formError.value = 'SKU and Name are required.'; return }

  // Validate all prices > 0
  for (const l of levels) {
    if (!(form.value.prices[l.value].price > 0)) {
      formError.value = `Price for ${l.label} must be greater than zero.`
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
  }

  saving.value = true
  try {
    // Upload image if a new one was selected
    if (pendingImageFile) {
      form.value.image_url = await uploadImage(pendingImageFile, form.value.sku)
      pendingImageFile = null
    }

    let productId = editingId.value

    if (!productId) {
      const { data, error } = await supabase
        .from('products')
        .insert({ sku: form.value.sku, name: form.value.name, name_zh: form.value.name_zh, description: form.value.description, sort_order: form.value.sort_order, image_url: form.value.image_url })
        .select('id')
        .single()
      if (error) throw error
      productId = data.id
      await writeAuditLog('products', productId, 'INSERT', { sku: form.value.sku, name: form.value.name })
    } else {
      const { error: updateErr } = await supabase.from('products').update({
        name: form.value.name, name_zh: form.value.name_zh,
        description: form.value.description, sort_order: form.value.sort_order,
        image_url: form.value.image_url || null
      }).eq('id', productId)
      if (updateErr) throw updateErr
      await writeAuditLog('products', productId, 'UPDATE', { name: form.value.name, image_url: form.value.image_url })
    }

    // Upsert prices
    const priceRows = levels.map(l => ({
      product_id: productId,
      level:      l.value,
      price:      form.value.prices[l.value].price,
      min_qty:    form.value.prices[l.value].min_qty
    }))
    await supabase.from('product_prices').upsert(priceRows, { onConflict: 'product_id,level' })

    forceClose()
    await fetchProducts()
  } catch (e) { formError.value = e.message }
  finally { saving.value = false }
}

// ── Audit log ────────────────────────────────────
async function writeAuditLog(tableName, recordId, action, diff = null) {
  try {
    await supabase.rpc('fn_write_audit_log', {
      p_table_name: tableName,
      p_record_id:  recordId,
      p_action:     action,
      p_diff:       diff ?? {}
    })
  } catch (e) {
    console.warn('Audit log:', e.message)   // non-fatal
  }
}

// ── Active toggle with confirmation ──────────────
const confirmTarget = ref(null)

function toggleActive(product) {
  confirmTarget.value = product
  if (!product.is_active) doToggle()   // activate → no confirmation needed
  // deactivate → confirmation dialog appears, user clicks "Deactivate" → doToggle()
}

async function doToggle() {
  const target = confirmTarget.value
  if (!target) return
  const newVal = !target.is_active
  const { error } = await supabase.from('products').update({ is_active: newVal }).eq('id', target.id)
  if (!error) {
    await writeAuditLog('products', target.id, 'UPDATE', { is_active: { from: target.is_active, to: newVal } })
    target.is_active = newVal
  }
  confirmTarget.value = null
}


async function fetchProducts() {
  loading.value = true
  const { data } = await supabase
    .from('products')
    .select('*, product_prices(level, price, min_qty)')
    .is('deleted_at', null)
    .order('sort_order')
  products.value = data || []
  loading.value = false
}

onMounted(fetchProducts)
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--text); }
.page-sub    { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.table-card  { overflow: hidden; }
.section-title { font-size: 11.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-muted); }
.status-active   { background: var(--success-bg); color: var(--success); font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
.status-inactive { background: #F2F3F4; color: #566573; font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }

/* Toggle switch */
.toggle-btn {
  position: relative; display: inline-flex; align-items: center;
  width: 36px; height: 20px; border-radius: 10px; border: none;
  cursor: pointer; transition: background 0.22s ease; padding: 0;
  flex-shrink: 0;
}
.toggle-on  { background: #D4276C; }
.toggle-off { background: #CBD5E1; }
.toggle-knob {
  position: absolute; width: 14px; height: 14px; border-radius: 50%;
  background: #fff; top: 3px; transition: left 0.22s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.18);
}
.toggle-on  .toggle-knob { left: 18px; }
.toggle-off .toggle-knob { left: 3px; }

/* Icon-only edit button */
.btn-icon {
  width: 30px; height: 30px; border-radius: 7px;
  border: 1.5px solid var(--border); background: none;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.btn-icon:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-bg, #fdf0f5); }
.grid-form    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid-form-21 { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; }
.price-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid var(--border);
}
.price-row:last-child { border-bottom: none; }
.price-label { font-size: 13.5px; font-weight: 500; min-width: 100px; }
.price-fields { display: flex; gap: 12px; }

/* ── Image upload ──────────────────────────────── */
.img-upload-area {
  position: relative;
  border: 2px dashed var(--border);
  border-radius: 10px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.18s, background 0.18s;
  aspect-ratio: 1 / 1;
  width: 100%;
  max-width: 280px;
}
.img-upload-area:hover { border-color: var(--primary); background: var(--primary-bg, #fdf0f5); }

.img-placeholder {
  position: absolute;
  inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 24px;
  color: var(--text-muted); text-align: center;
  font-size: 13px;
}
.img-hint { font-size: 11px; color: var(--text-muted); opacity: 0.7; }

.img-preview {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; display: block;
}

.img-remove {
  position: absolute; top: 8px; right: 8px;
  width: 26px; height: 26px; border-radius: 50%;
  background: rgba(0,0,0,0.55); border: none;
  color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.img-remove:hover { background: rgba(0,0,0,0.8); }

.img-progress {
  height: 3px; background: var(--border);
  border-radius: 3px; margin-top: 6px; overflow: hidden;
}
.img-progress-bar {
  height: 100%; background: var(--primary);
  transition: width 0.3s ease; border-radius: 3px;
}

/* ── Inline label+value field ──────────────────── */
.inline-field {
  display: flex; align-items: center;
  border: 1px solid var(--border); border-radius: 9px;
  overflow: hidden; background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.inline-field:focus-within { border-color: var(--primary); }
.inline-tag {
  padding: 10px 12px; font-size: 11.5px; font-weight: 700;
  color: var(--text-muted); background: var(--bg, #f8f8f8);
  border-right: 1px solid var(--border); white-space: nowrap; flex-shrink: 0;
  letter-spacing: 0.04em;
}
.inline-field input {
  flex: 1; border: none; padding: 10px 12px;
  outline: none; font-size: 14px; background: transparent; min-width: 0;
}
/* Remove number spinners globally */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; appearance: textfield; }

.input-error {
  border-color: #e53e3e !important;
  box-shadow: 0 0 0 2px rgba(229,62,62,0.2), 0 4px 12px rgba(229,62,62,0.12) !important;
  background: #fff5f5 !important;
}

@keyframes shake {
  0%,100% { transform: translateX(0); }
  15%     { transform: translateX(-7px); }
  30%     { transform: translateX(7px); }
  45%     { transform: translateX(-5px); }
  60%     { transform: translateX(5px); }
  75%     { transform: translateX(-3px); }
  90%     { transform: translateX(3px); }
}
.shake { animation: shake 0.38s ease-in-out; }

.input-dirty {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 2px rgba(212,39,108,0.25), 0 4px 16px rgba(212,39,108,0.18) !important;
  background: #fff !important;
  position: relative;
  z-index: 1;
}

/* ── Unsaved changes banner ────────────────────── */
.unsaved-banner {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 10px;
  background: #FFF8F0; border: 1.5px solid #F57C00;
  border-radius: 10px; padding: 10px 14px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(245,124,0,0.12);
}
.unsaved-banner-text {
  flex: 1; font-size: 13px; font-weight: 600; color: #E65100;
}
.unsaved-banner-btns { display: flex; gap: 8px; flex-shrink: 0; }
.unsaved-btn-abandon {
  font-size: 12px; font-weight: 600; color: var(--text-muted);
  background: none; border: 1.5px solid var(--border);
  border-radius: 7px; padding: 5px 12px; cursor: pointer;
  transition: border-color 0.15s;
}
.unsaved-btn-abandon:hover { border-color: var(--text-muted); }
.unsaved-btn-save {
  font-size: 12px; font-weight: 600; color: #fff;
  background: #D4276C; border: none;
  border-radius: 7px; padding: 5px 12px; cursor: pointer;
  transition: opacity 0.15s;
}
.unsaved-btn-save:hover { opacity: 0.88; }
.unsaved-btn-save:disabled { opacity: 0.55; cursor: not-allowed; }

.banner-slide-enter-active, .banner-slide-leave-active {
  transition: all 0.22s ease;
  overflow: hidden;
}
.banner-slide-enter-from, .banner-slide-leave-to {
  opacity: 0; max-height: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0;
}
.banner-slide-enter-to, .banner-slide-leave-from { max-height: 80px; }

/* ── Deactivate confirmation ───────────────────── */
.confirm-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 400;
  display: flex; align-items: center; justify-content: center;
}
.confirm-panel {
  background: #fff; border-radius: 14px;
  padding: 28px 24px; width: 320px; max-width: 92vw;
  box-shadow: 0 16px 48px rgba(0,0,0,0.18);
  display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
}
.confirm-icon { margin-bottom: 2px; }
.confirm-title { font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
.confirm-names { display: flex; flex-direction: column; gap: 2px; }
.confirm-name-en { font-size: 14px; font-weight: 600; color: #D4276C; }
.confirm-name-zh { font-size: 14px; color: var(--text-muted); letter-spacing: 3px; }
.price-warn-val  { font-weight: 700; color: #D4276C; background: #FDE8F1; padding: 1px 6px; border-radius: 5px; }
.confirm-msg   { font-size: 13px; color: var(--text-muted); line-height: 1.6; }
.confirm-footer { display: flex; gap: 10px; margin-top: 8px; width: 100%; justify-content: center; }
.btn-danger {
  background: #D4276C; color: #fff; border: none;
  padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s;
}
.btn-danger:hover { opacity: 0.88; }

/* ── Crop / zoom editor ────────────────────────── */
.editor-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.65);
  z-index: 300;
  display: flex; align-items: center; justify-content: center;
}

.editor-panel {
  background: #fff; border-radius: 16px;
  padding: 20px; width: 340px;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}

.editor-header {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
}
.editor-title { font-size: 15px; font-weight: 700; color: var(--text); }

.editor-canvas {
  width: 300px; height: 300px;
  border-radius: 12px; display: block;
  cursor: grab; border: 1.5px solid var(--border);
  touch-action: none;
}
.editor-canvas:active { cursor: grabbing; }

.editor-zoom-row {
  display: flex; align-items: center; gap: 10px; width: 100%;
}
.editor-zoom-btn {
  width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid var(--border);
  background: none; font-size: 20px; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center; color: var(--text);
  transition: border-color 0.15s, color 0.15s;
}
.editor-zoom-btn:hover { border-color: var(--primary); color: var(--primary); }
.editor-slider { flex: 1; accent-color: var(--primary); cursor: pointer; }
.editor-zoom-label { font-size: 12px; color: var(--text-muted); min-width: 40px; text-align: right; }

.editor-footer {
  display: flex; gap: 10px; width: 100%; justify-content: flex-end;
}

/* ── Right-side drawer ─────────────────────────── */
.drawer-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 200;
}

.drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 480px; max-width: 95vw;
  background: var(--card, #fff);
  box-shadow: -8px 0 32px rgba(0,0,0,0.12);
  z-index: 201;
  display: flex; flex-direction: column;
}

.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.drawer-title {
  font-size: 17px; font-weight: 700; color: var(--text);
}

.drawer-body {
  flex: 1; overflow-y: auto;
  padding: 24px;
}

.drawer-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--card, #fff);
}

/* Drawer slide transition */
.drawer-enter-active,
.drawer-leave-active { transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1); }
.drawer-enter-from,
.drawer-leave-to    { transform: translateX(100%); }

/* Backdrop fade transition */
.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active { transition: opacity 0.25s ease; }
.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to    { opacity: 0; }
</style>
