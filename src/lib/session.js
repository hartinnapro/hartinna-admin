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

// ── Connection keep-alive ────────────────────────────────────────────
// Android/Windows PWAs can lose underlying network sockets during idle
// or backgrounding, causing subsequent Supabase queries to hang.
// These handlers keep the connection warm and force a fresh auth +
// connection cycle when the page returns to view.

const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000  // 4 minutes

async function refreshConnection() {
  if (!state.session) return  // No session, nothing to refresh
  try {
    await supabase.auth.refreshSession()
  } catch (e) {
    // Silent: refresh may legitimately fail (expired refresh token, no network).
    // Components making subsequent queries will surface their own errors.
    console.warn('[session] connection refresh failed:', e?.message || e)
  }
}

// Heartbeat: every 4 minutes while page is visible, refresh the token.
// This forces a real HTTP call to Supabase, keeping the connection pool alive.
setInterval(() => {
  if (!document.hidden) refreshConnection()
}, HEARTBEAT_INTERVAL_MS)

// Visibility resume: when returning to the tab after being hidden,
// refresh immediately to recover from any connection death during background.
let wasHidden = false
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    wasHidden = true
  } else if (wasHidden) {
    wasHidden = false
    refreshConnection()
  }
})

export { state as session }
