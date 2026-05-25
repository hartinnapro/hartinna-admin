import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = 'https://rudikdtnhwhbkeosonwc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZGlrZHRuaHdoYmtlb3NvbndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDcwNjMsImV4cCI6MjA5NDg4MzA2M30.tfC-8S8CzHsXztTJeq2KHZsX7HJI9sdE-_CZvnjdNsI'

// Query timeout: abort hanging DATA requests after 60 seconds.
// 60s (not 15s) is intentional — Supabase free-tier projects pause
// after inactivity and can take 15–25s to cold-start. A 15s cutoff
// was killing the very first query after a cold start, making the
// admin row lookup return null and triggering a false sign-out.
//
// Auth endpoints (/auth/*) are explicitly excluded — Supabase's own
// GoTrue client handles their retry/timeout logic internally, and
// aborting a token-refresh mid-flight has unpredictable side effects.
const QUERY_TIMEOUT_MS = 60_000

function fetchWithTimeout(input, init = {}) {
  const url = typeof input === 'string' ? input : (input?.url ?? '')

  // Never time out auth endpoints — GoTrue manages its own retry logic.
  if (url.includes('/auth/')) return fetch(input, init)

  // Respect an explicit signal from the caller (e.g. realtime websocket).
  if (init.signal) return fetch(input, init)

  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)

  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId))
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: fetchWithTimeout
  }
})
