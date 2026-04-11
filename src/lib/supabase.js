import { createClient } from '@supabase/supabase-js'

const url = window.__SUPABASE_URL__ || import.meta.env.VITE_SUPABASE_URL
const key = window.__SUPABASE_ANON_KEY__ || import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = !!(url && key)

export const supabase = isConfigured
  ? createClient(url, key)
  : null