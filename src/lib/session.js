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
  // ── Fast path ──────────────────────────────────────────────────────
  // If we already have a confirmed admin in state, return immediately
  // without touching the network. This makes every sidebar navigation
  // instant after the initial login load, and prevents the router guard
  // from ever blocking when the session is healthy.
  if (state.ready && state.admin) return state

  // If a load is already in progress, join it instead of starting another.
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      // getSession() can trigger an internal token refresh (network call).
      // Auth endpoints are excluded from fetchWithTimeout, so without this
      // race() guard the entire router guard could hang indefinitely when
      // Supabase is slow — making the sidebar appear frozen.
      const { data: { session } } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('[session] getSession timed out')), 10_000)
        )
      ])

      state.session = session

      if (session) {
        const { data: admin, error } = await supabase
          .from('admins')
          .select('id, role, full_name')
          .eq('id', session.user.id)
          .single()

        if (error) {
          // Network/timeout error — not a genuine sign-out.
          // Clear the promise so the next navigation retries from scratch.
          loadingPromise = null
          throw new Error(`[session] admin lookup failed: ${error.message}`)
        }

        // admin === null means the user exists in auth.users but has no
        // row in the admins table — genuine access-denied, not a network error.
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
// The SIGNED_IN handler was removed intentionally — it created a race
// condition where the router guard and the auth event both called
// loadSession() concurrently, with the event handler's version
// sometimes clobbering a valid loadingPromise mid-flight.
//
// Boot-up INITIAL_SESSION events are ignored via the !state.ready guard.
supabase.auth.onAuthStateChange((event) => {
  if (!state.ready) return   // ignore events fired before first load

  if (event === 'SIGNED_OUT') {
    resetSession()
  }
  // TOKEN_REFRESHED: access token rotated, admin row unchanged.
  // Update state.session for freshness but leave everything else alone.
  // No need to clear loadingPromise — fast path still returns immediately.
})

// ── Connection keep-alive ────────────────────────────────────────────
// Android/Windows PWAs can lose underlying network sockets during idle
// or backgrounding. A lightweight periodic ping keeps the connection
// pool warm without touching the auth state machine.

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

// Every 4 minutes while tab is visible.
setInterval(() => {
  if (!document.hidden) pingConnection()
}, HEARTBEAT_INTERVAL_MS)

// Ping immediately on tab resume so the first click after idle is fast.
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
