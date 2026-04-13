import { supabase } from './supabase.js'

export async function loadSettlementState(sessionId) {
  const { data } = await supabase
    .from('settlement_state')
    .select('collector_id, checked_keys')
    .eq('session_id', sessionId)
    .single()
  if (!data) return { collectorId: null, checkedKeys: new Set() }
  return {
    collectorId: data.collector_id ?? null,
    checkedKeys: new Set(data.checked_keys ?? []),
  }
}

export async function saveSettlementState(sessionId, collectorId, checkedKeys) {
  await supabase
    .from('settlement_state')
    .upsert({
      session_id:   sessionId,
      collector_id: collectorId ?? null,
      checked_keys: [...checkedKeys],
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'session_id' })
}