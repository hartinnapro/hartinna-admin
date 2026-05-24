import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = 'https://rudikdtnhwhbkeosonwc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZGlrZHRuaHdoYmtlb3NvbndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDcwNjMsImV4cCI6MjA5NDg4MzA2M30.tfC-8S8CzHsXztTJeq2KHZsX7HJI9sdE-_CZvnjdNsI'

// Query timeout: abort hanging requests after 15 seconds.
// On Android/Windows PWAs, network sockets can die during idle/background,
// causing Supabase queries to hang forever. This forces them to fail fast
// so the UI can show a clear error or trigger a reconnect, rather than
// spinning indefinitely.
const QUERY_TIMEOUT_MS = 15000

function fetchWithTimeout(input, init = {}) {
  // Respect an explicit signal from the caller (e.g. realtime / abort controller)
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
