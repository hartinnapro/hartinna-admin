<template>
  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark">
          <img src="/hartinna_logo.png" alt="Hartinna Logo" class="brand-logo-img" />
        </div>
        <div class="brand-text-wrap">
          <img src="/hartinna_brand.png" alt="Hartinna Sdn Bhd" class="brand-name-img" />
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-label">Management</div>

        <RouterLink to="/orders" class="nav-item" :class="{ active: route.path.startsWith('/orders') }">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span>Orders</span>
          <span class="nav-badge" v-if="pendingCount > 0">{{ pendingCount }}</span>
        </RouterLink>

        <RouterLink to="/members" class="nav-item" :class="{ active: route.path.startsWith('/members') }">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Members</span>
        </RouterLink>

        <RouterLink to="/products" class="nav-item" :class="{ active: route.path.startsWith('/products') }">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span>Products</span>
        </RouterLink>

        <RouterLink to="/inventory" class="nav-item" :class="{ active: route.path.startsWith('/inventory') }">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          <span>Inventory</span>
        </RouterLink>

        <RouterLink to="/support" class="nav-item" :class="{ active: route.path.startsWith('/support') }">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>Support</span>
          <span class="nav-badge" v-if="supportCount > 0">{{ supportCount }}</span>
        </RouterLink>

        <div class="nav-section-label" style="margin-top:12px;">Settings</div>

        <RouterLink to="/partner-levels" class="nav-item" :class="{ active: route.path.startsWith('/partner-levels') }">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          <span>Partner Levels</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="admin-info">
          <div class="admin-avatar">{{ adminInitial }}</div>
          <div class="admin-details">
            <div class="admin-name">{{ adminName }}</div>
            <div class="admin-role">{{ adminRole }}</div>
          </div>
        </div>
        <button class="signout-btn" @click="signOut" title="Sign out">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { session } from '../lib/session'

const route  = useRoute()
const router = useRouter()

const pendingCount = ref(0)
const supportCount = ref(0)

// Admin info comes from the cached session store — no fetch needed here
const adminName = computed(() => session.admin?.full_name || '')
const adminRole = computed(() => {
  const r = session.admin?.role
  return r ? r.charAt(0).toUpperCase() + r.slice(1) + ' Admin' : ''
})
const adminInitial = computed(() => adminName.value ? adminName.value[0].toUpperCase() : 'A')

async function signOut() {
  await supabase.auth.signOut()
  router.push('/login')
}

onMounted(async () => {
  // Both badge counts fire in parallel instead of sequentially
  const [ordersRes, supportRes] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('support_tickets').select('id').eq('status', 'open')
  ])
  pendingCount.value = ordersRes.count || 0
  supportCount.value = supportRes.data?.length || 0
})
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  min-height: 100dvh;
}

/* ── Sidebar ─────────────────────────────────── */
.sidebar {
  width: var(--sidebar-w);
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0; top: 0; bottom: 0;
  z-index: 100;
}

.sidebar-brand {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.brand-mark {
  width: auto; height: 36px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}

.brand-logo-img {
  height: 36px; width: auto;
  object-fit: contain;
  filter: drop-shadow(0 1px 4px rgba(212,39,108,0.35));
}

.brand-text-wrap {
  display: flex; flex-direction: column; gap: 0;
  flex: 1; min-width: 0;
}

.brand-name-img {
  height: 28px; width: auto;
  max-width: 100%;
  object-fit: contain;
  object-position: left center;
  filter: brightness(1.05);
}

.brand-sub {
  font-size: 10px; color: rgba(255,255,255,0.35);
  letter-spacing: 0.07em; text-transform: uppercase;
  margin-top: 1px;
}

/* Nav */
.sidebar-nav {
  flex: 1; padding: 12px 0px 12px 10px;
  overflow-y: auto;
}

.nav-section-label {
  font-size: 10px; font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(255,255,255,0.3);
  padding: 8px 8px 4px;
  margin-bottom: 2px;
}

.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 8px 9px 10px;
  border-radius: var(--radius-sm);
  color: var(--sidebar-text);
  text-decoration: none;
  font-size: 13.5px; font-weight: 500;
  transition: all 0.15s;
  position: relative;
  margin-bottom: 2px;
}

.nav-item:hover  { background: rgba(255,255,255,0.07); color: white; }
.nav-item.active { background: var(--sidebar-active); color: white; }
.nav-item.active svg { color: var(--primary); }

.nav-badge {
  margin-left: auto;
  background: var(--primary);
  color: white; font-size: 10px; font-weight: 700;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
}

/* Footer */
.sidebar-footer {
  padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex; align-items: center; gap: 10px;
}

.admin-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(168,91,106,0.4);
  color: white; font-size: 13px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.admin-details { flex: 1; min-width: 0; }
.admin-name { font-size: 12.5px; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.admin-role { font-size: 11px; color: rgba(255,255,255,0.4); }

.signout-btn {
  background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.4); padding: 6px;
  border-radius: 4px; display: flex; align-items: center;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.signout-btn:hover { color: white; background: rgba(255,255,255,0.08); }

/* ── Main content ────────────────────────────── */
.main-content {
  margin-left: var(--sidebar-w);
  flex: 1;
  /* No internal scroll — let the window scroll naturally.
     This avoids iOS Safari quirks where overflow-y:auto containers
     preserve scrollTop across rotations and visually shift content. */
}
</style>
