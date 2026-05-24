// Single source of truth for the current session + admin record.
// Cached so router guard and AppLayout don't both re-fetch the admin row.

import { reactive } from 'vue'
import { supabase } from './supabase'

const state = reactive({
  session: null,
  admin: null,     // { id, role, full_name } or null
  ready: false
})

let loadingPromise = null

export async function loadSession() {
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const { data: { session } } = await supabase.auth.getSession()
    state.session = session

    if (session) {
      const { data: admin } = await supabase
        .from('admins')
        .select('id, role, full_name')
        .eq('id', session.user.id)
        .single()
      state.admin = admin || null
    } else {
      state.admin = null
    }

    state.ready = true
    return state
  })()

  return loadingPromise
}

export function resetSession() {
  state.session = null
  state.admin = null
  state.ready = false
  loadingPromise = null
}

// Refresh cache on real auth changes — but ignore initial-load events
// to avoid racing with the router guard's first loadSession() call.
supabase.auth.onAuthStateChange((event) => {
  // Skip boot-up events fired while the first load is still in flight
  if (!state.ready) return

  if (event === 'SIGNED_OUT') {
    resetSession()
  } else if (event === 'SIGNED_IN') {
    // Real login event after a previous sign-out — refresh the admin row
    loadingPromise = null
    loadSession()
  }
  // TOKEN_REFRESHED is intentionally ignored — the access token changed,
  // but the admin row hasn't, so no refetch is needed.
})

export { state as session }
