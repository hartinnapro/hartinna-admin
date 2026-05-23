import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase'

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

// Auth guard
router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (to.meta.requiresAdmin) {
    if (!session) return '/login'
    const { data: admin } = await supabase
      .from('admins')
      .select('id, role, full_name')
      .eq('id', session.user.id)
      .single()
    if (!admin) return '/login'
  }

  if (to.meta.guest && session) {
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', session.user.id)
      .single()
    if (admin) return '/orders'
  }
})

export default router
