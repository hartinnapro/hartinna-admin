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
            <th>SKU</th><th>Product</th>
            <th v-for="l in levels" :key="l.value" style="text-align:right;">{{ l.label }}</th>
            <th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td style="font-size:12px; color:var(--text-muted);">{{ p.sku }}</td>
            <td style="font-weight:500;">{{ p.name }}</td>
            <td v-for="l in levels" :key="l.value" style="text-align:right; font-size:13px;">
              {{ priceFor(p, l.value) }}
            </td>
            <td>
              <span :class="p.is_active ? 'status-active' : 'status-inactive'">
                {{ p.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-outline btn-sm" @click="openEdit(p)">Edit</button>
                <button class="btn btn-outline btn-sm" @click="toggleActive(p)">
                  {{ p.is_active ? 'Deactivate' : 'Activate' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <div class="modal-title">{{ editingId ? 'Edit Product' : 'Add Product' }}</div>
          <button class="modal-close" @click="showModal = false">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="alert alert-error" v-if="formError">{{ formError }}</div>
          <div class="grid-form">
            <div class="form-group">
              <label>SKU *</label>
              <input v-model="form.sku" placeholder="e.g. HPP-001" :disabled="!!editingId" />
            </div>
            <div class="form-group">
              <label>Sort Order</label>
              <input v-model.number="form.sort_order" type="number" min="0" />
            </div>
          </div>
          <div class="form-group">
            <label>Product Name *</label>
            <input v-model="form.name" placeholder="Product name in English" />
          </div>
          <div class="form-group">
            <label>Chinese Name</label>
            <input v-model="form.name_zh" placeholder="中文名称（可选）" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="form.description" placeholder="Product description…" rows="2"></textarea>
          </div>

          <div class="divider"></div>
          <div class="section-title" style="margin-bottom:12px;">Pricing by Member Level</div>
          <div v-for="l in levels" :key="l.value" class="price-row">
            <span class="price-label">{{ l.label }}</span>
            <div class="price-fields">
              <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:11px;">Price (MYR)</label>
                <input v-model.number="form.prices[l.value].price" type="number" min="0" step="0.01" style="width:120px;" />
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:11px;">Min. Qty</label>
                <input v-model.number="form.prices[l.value].min_qty" type="number" min="1" style="width:80px;" />
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showModal = false">Cancel</button>
          <button class="btn btn-primary" @click="saveProduct" :disabled="saving">
            {{ saving ? 'Saving…' : (editingId ? 'Save Changes' : 'Add Product') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const products  = ref([])
const loading   = ref(true)
const showModal = ref(false)
const saving    = ref(false)
const editingId = ref(null)
const formError = ref('')

const levels = [
  { value: 'store_manager',   label: 'Store Mgr' },
  { value: 'director',        label: 'Director' },
  { value: 'ceo',             label: 'CEO' },
  { value: 'branch',          label: 'Branch' },
  { value: 'exec_shareholder',label: 'Exec. SH' },
]

function emptyForm() {
  return {
    sku: '', name: '', name_zh: '', description: '', sort_order: 0,
    prices: Object.fromEntries(levels.map(l => [l.value, { price: 0, min_qty: 1 }]))
  }
}
const form = ref(emptyForm())

function priceFor(product, level) {
  const p = product.product_prices?.find(pp => pp.level === level)
  return p ? `MYR ${Number(p.price).toFixed(2)}` : '—'
}

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
  formError.value = ''
  showModal.value = true
}

function openEdit(product) {
  editingId.value = product.id
  form.value = {
    sku:         product.sku,
    name:        product.name,
    name_zh:     product.name_zh || '',
    description: product.description || '',
    sort_order:  product.sort_order,
    prices:      Object.fromEntries(levels.map(l => {
      const p = product.product_prices?.find(pp => pp.level === l.value)
      return [l.value, { price: p?.price ?? 0, min_qty: p?.min_qty ?? 1 }]
    }))
  }
  formError.value = ''
  showModal.value = true
}

async function saveProduct() {
  formError.value = ''
  if (!form.value.sku || !form.value.name) { formError.value = 'SKU and Name are required.'; return }

  saving.value = true
  try {
    let productId = editingId.value

    if (!productId) {
      const { data, error } = await supabase
        .from('products')
        .insert({ sku: form.value.sku, name: form.value.name, name_zh: form.value.name_zh, description: form.value.description, sort_order: form.value.sort_order })
        .select('id')
        .single()
      if (error) throw error
      productId = data.id
    } else {
      await supabase.from('products').update({
        name: form.value.name, name_zh: form.value.name_zh,
        description: form.value.description, sort_order: form.value.sort_order
      }).eq('id', productId)
    }

    // Upsert prices
    const priceRows = levels.map(l => ({
      product_id: productId,
      level:      l.value,
      price:      form.value.prices[l.value].price,
      min_qty:    form.value.prices[l.value].min_qty
    }))
    await supabase.from('product_prices').upsert(priceRows, { onConflict: 'product_id,level' })

    showModal.value = false
    await fetchProducts()
  } catch (e) { formError.value = e.message }
  finally { saving.value = false }
}

async function toggleActive(product) {
  const newVal = !product.is_active
  await supabase.from('products').update({ is_active: newVal }).eq('id', product.id)
  product.is_active = newVal
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
.grid-form { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.price-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; border-bottom: 1px solid var(--border);
}
.price-row:last-child { border-bottom: none; }
.price-label { font-size: 13.5px; font-weight: 500; min-width: 100px; }
.price-fields { display: flex; gap: 12px; }
</style>
