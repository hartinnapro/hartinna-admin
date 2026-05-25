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
    try {
      const { data: { session } } = await supabase.auth.getSession()
      state.session = session

      if (session) {
        const { data: admin, error } = await supabase
          .from('admins')
          .select('id, role, full_name')
          .eq('id', session.user.id)
          .single()

        if (error) {
          // The admins query failed (network hiccup, Supabase cold-start
          // overrun, timeout, etc.). This does NOT mean the user is
          // signed out — their Supabase session is still valid.
          // Clear the promise so the next navigation retries from scratch
          // instead of returning a cached null-admin state forever.
          loadingPromise = null
          throw new Error(`[session] admin lookup failed: ${error.message}`)
        }

        // admin is null when the signed-in Supabase user has no row in
        // the admins table — genuine access-denied, not a network error.
        state.admin = admin || null
      } else {
        state.admin = null
      }

      state.ready = true
      return state
    } catch (e) {
      // Clear the cached promise on any failure so the next navigation
      // can retry, rather than being stuck with a stale result forever.
      loadingPromise = null
      state.ready = false
      throw e
    }
  })()

  return loadingPromise
}

export function resetSession() {
  state.session = null
  state.admin   = null
  state.ready   = false
  loadingPromise = null
}

// ── Auth state listener ──────────────────────────────────────────────
// Only react to genuine sign-outs.
//
// The SIGNED_IN handler was removed intentionally. When the user logs
// in, LoginView calls router.push('/orders'), which fires the router
// guard, which calls loadSession() — that is the correct and only code
// path for re-hydrating the session after login. Having a second
// concurrent loadSession() triggered by the SIGNED_IN event created a
// race condition where the router guard could end up awaiting an
// abandoned promise whose result had state.admin = null (left over from
// a previous failed load), causing an immediate redirect back to /login
// even after a successful sign-in.
//
// Boot-up events (INITIAL_SESSION) are also ignored via the !state.ready
// guard — the router guard's first loadSession() call handles those.
supabase.auth.onAuthStateChange((event) => {
  if (!state.ready) return   // ignore events fired before first load

  if (event === 'SIGNED_OUT') {
    resetSession()
  }
  // TOKEN_REFRESHED: the access token changed but the admin row hasn't.
  // Update state.session so the heartbeat ping uses the freshest token,
  // but don't touch state.admin or loadingPromise.
})

// ── Connection keep-alive ────────────────────────────────────────────
// Android/Windows PWAs can lose underlying network sockets during idle
// or backgrounding, causing subsequent Supabase queries to hang.
// A lightweight periodic ping keeps the connection pool warm without
// touching the auth state machine.

const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000  // 4 minutes

async function pingConnection() {
  if (!state.session || !state.admin) return
  try {
    await supabase
      .from('admins')
      .select('id')
      .eq('id', state.admin.id)
      .single()
  } catch (e) {
    console.warn('[session] ping failed:', e?.message || e)
  }
}

// Heartbeat: every 4 minutes while the tab is visible.
setInterval(() => {
  if (!document.hidden) pingConnection()
}, HEARTBEAT_INTERVAL_MS)

// Visibility resume: ping immediately when the user returns to the tab.
let wasHidden = false
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    wasHidden = true
  } else if (wasHidden) {
    wasHidden = false
    pingConnection()
  }
})

export { state as session }
