import { createRouter, createWebHistory } from 'vue-router'
import { loadSession } from '../lib/session'

const routes = [
  {
    path: '/login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    component: () => import('../components/AppLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      { path: '',        redirect: '/orders' },
      { path: 'orders',           component: () => import('../views/OrdersView.vue') },
      { path: 'orders/:id',       component: () => import('../views/OrderDetailView.vue') },
      { path: 'carts',            component: () => import('../views/CartsView.vue') },
      { path: 'members',          component: () => import('../views/MembersView.vue') },
      { path: 'members/:id',      component: () => import('../views/MemberDetailView.vue') },
      { path: 'products',         component: () => import('../views/ProductsView.vue') },
      { path: 'inventory',        component: () => import('../views/InventoryView.vue') },
      { path: 'support',          component: () => import('../views/SupportView.vue') },
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Auth guard — session is loaded once and cached in the session store.
// loadSession() throws when the admins table query fails (e.g. Supabase
// cold-start, network blip). In that case we redirect to /login rather
// than letting the navigation hang. The promise is cleared on throw, so
// the next navigation will retry the full session load automatically.
router.beforeEach(async (to) => {
  let s
  try {
    s = await loadSession()
  } catch {
    // Could not confirm admin identity — send to login.
    // The cached promise was cleared by loadSession() on throw,
    // so the next navigation will try again from scratch.
    if (to.meta.guest) return true   // already heading to /login, let through
    return '/login'
  }

  if (to.meta.requiresAdmin && !s.admin) return '/login'
  if (to.meta.guest && s.admin) return '/orders'
})

export default router
