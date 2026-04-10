import { supabase } from './supabase.js'

// username is stored as username@app.local so Supabase Auth is happy
const fake = u => `${u.trim().toLowerCase()}@moneydivider.app`

export async function signUp(username, password) {
  const { data, error } = await supabase.auth.signUp({
    email:    fake(username),
    password,
  })
  if (error) throw error
  return data.user
}

export async function signIn(username, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email:    fake(username),
    password,
  })
  if (error) throw error
  return data.user
}

export async function signOut() {
  await supabase.auth.signOut()
}

export function onAuthChange(cb) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null)
  })
}