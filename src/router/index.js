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

// Auth guard — admin is loaded once and cached in the session store
router.beforeEach(async (to) => {
  const s = await loadSession()

  if (to.meta.requiresAdmin && !s.admin) return '/login'
  if (to.meta.guest && s.admin) return '/orders'
})

export default router
