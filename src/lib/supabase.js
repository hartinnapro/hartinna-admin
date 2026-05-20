import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = 'https://rudikdtnhwhbkeosonwc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZGlrZHRuaHdoYmtlb3NvbndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDcwNjMsImV4cCI6MjA5NDg4MzA2M30.tfC-8S8CzHsXztTJeq2KHZsX7HJI9sdE-_CZvnjdNsI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
