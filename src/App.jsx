import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import { G, btnBase } from './styles/theme.js'
import { Modal, Input, Spinner } from './components/index.jsx'
import ParticipantsTab from './tabs/ParticipantsTab.jsx'
import BillsTab        from './tabs/BillsTab.jsx'
import SummaryTab      from './tabs/SummaryTab.jsx'
import SettlementTab   from './tabs/SettlementTab.jsx'

const SESSION_KEY = 'md_session_id'

const TABS = [
  { id: 'participants', label: 'People',     icon: '👥' },
  { id: 'bills',        label: 'Bills',      icon: '🧾' },
  { id: 'summary',      label: 'Summary',    icon: '📊' },
  { id: 'settlement',   label: 'Settlement', icon: '💸' },
]

// ─── Session picker / creator ─────────────────────────────────────────────────
function SessionScreen({ onSession }) {
  const [sessions,  setSessions]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showNew,   setShowNew]   = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newErr,    setNewErr]    = useState('')
  const [creating,  setCreating]  = useState(false)

  useEffect(() => {
    supabase.from('sessions').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setSessions(data ?? []); setLoading(false) })
  }, [])

  const create = async () => {
    const name = newName.trim()
    if (!name) { setNewErr('Name is required'); return }
    setCreating(true)
    const { data, error } = await supabase.from('sessions').insert({ name }).select().single()
    if (error) { setNewErr(error.message); setCreating(false); return }
    onSession(data)
  }

  const del = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this group and all its data?')) return
    await supabase.from('sessions').delete().eq('id', id)
    setSessions(s => s.filter(x => x.id !== id))
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 460, width: '100%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>÷</div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 34, color: G.text, marginBottom: 8 }}>
            Money<span style={{ color: G.accent }}>Divider</span>
          </h1>
          <p style={{ color: G.textMuted, fontSize: 14 }}>Split expenses fairly, with zero drama.</p>
        </div>

        {/* Session list */}
        {loading ? <Spinner /> : (
          <>
            {sessions.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: G.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Your groups</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => onSession(s)}
                      style={{
                        background:   G.card, border: `1px solid ${G.border}`, borderRadius: 10,
                        padding:      '14px 16px', cursor: 'pointer', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center',
                        transition:   'border-color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = G.accent}
                      onMouseLeave={e => e.currentTarget.style.borderColor = G.border}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: G.text }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: G.textMuted, marginTop: 2 }}>
                          {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={e => del(s.id, e)}
                        style={{ ...btnBase, padding: '4px 8px', fontSize: 11, background: 'none', color: G.textDim, border: 'none' }}
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { setShowNew(true); setNewName(''); setNewErr('') }}
              style={{
                ...btnBase, width: '100%', padding: '13px', fontSize: 14,
                background: G.accent, color: '#000', fontWeight: 700,
                boxShadow: `0 0 28px ${G.accentGlow}`,
              }}
            >
              + New Group
            </button>
          </>
        )}
      </div>

      {showNew && (
        <Modal title="New Expense Group" onClose={() => setShowNew(false)}>
          <Input label="Group Name" value={newName} error={newErr}
            onChange={e => { setNewName(e.target.value); setNewErr('') }}
            onKeyDown={e => e.key === 'Enter' && create()}
            autoFocus placeholder="e.g. Weekend Trip, Office Lunch…" />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={() => setShowNew(false)} style={{ ...btnBase, background: G.surface, color: G.textMuted, border: `1px solid ${G.border}` }}>Cancel</button>
            <button onClick={create} disabled={creating}
              style={{ ...btnBase, background: G.accent, color: '#000', fontWeight: 700, opacity: creating ? 0.6 : 1 }}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Main App Shell ───────────────────────────────────────────────────────────
export default function App() {
  const [session,      setSession]      = useState(null)
  const [tab,          setTab]          = useState('participants')
  const [participants, setParticipants] = useState([])
  const [bills,        setBills]        = useState([])
  const [loading,      setLoading]      = useState(false)

  // Restore last session
  useEffect(() => {
    const id = localStorage.getItem(SESSION_KEY)
    if (id) {
      supabase.from('sessions').select('*').eq('id', id).single()
        .then(({ data }) => { if (data) setSession(data) })
    }
  }, [])

  // Persist chosen session
  const openSession = s => {
    localStorage.setItem(SESSION_KEY, s.id)
    setSession(s)
  }

  // Load participants + bills whenever session changes
  const reload = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const [{ data: ps }, { data: bs }] = await Promise.all([
        supabase.from('participants').select('*').eq('session_id', session.id).order('created_at'),
        supabase
          .from('bills')
          .select('*, participants:bill_participants(participant_id)')
          .eq('session_id', session.id)
          .order('created_at'),
      ])
      setParticipants(ps ?? [])
      setBills(bs ?? [])
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { reload() }, [reload])

  // ── No session selected yet ──────────────────────────────────────────────────
  if (!session) return <SessionScreen onSession={openSession} />

  // ── Session active ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: G.bg }}>
      {/* Top bar */}
      <div style={{
        background:    G.surface,
        borderBottom:  `1px solid ${G.border}`,
        position:      'sticky',
        top:            0,
        zIndex:         50,
        padding:        '0 20px',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {/* Logo + session name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7, background: G.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, color: '#000',
            }}>÷</div>
            <div>
              <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 700, fontSize: 17, color: G.text }}>
                Money<span style={{ color: G.accent }}>Divider</span>
              </span>
              <span style={{ marginLeft: 10, fontSize: 12, color: G.textMuted }}>/ {session.name}</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                ...btnBase,
                padding:       '10px 14px',
                background:    'none',
                color:         tab === t.id ? G.accent : G.textMuted,
                border:        'none',
                borderBottom:  tab === t.id ? `2px solid ${G.accent}` : '2px solid transparent',
                borderRadius:  0,
                fontWeight:    tab === t.id ? 700 : 400,
                fontSize:      13,
              }}>
                <span style={{ marginRight: 5 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Back button */}
          <button
            onClick={() => { setSession(null); localStorage.removeItem(SESSION_KEY) }}
            style={{ ...btnBase, padding: '6px 12px', background: 'none', color: G.textMuted, border: `1px solid ${G.border}`, fontSize: 12 }}
          >
            ← Groups
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
        {tab === 'participants' && (
          <ParticipantsTab
            sessionId={session.id}
            participants={participants}
            reload={reload}
            loading={loading}
          />
        )}
        {tab === 'bills' && (
          <BillsTab
            sessionId={session.id}
            participants={participants}
            bills={bills}
            reload={reload}
            loading={loading}
          />
        )}
        {tab === 'summary' && (
          <SummaryTab participants={participants} bills={bills} />
        )}
        {tab === 'settlement' && (
          <SettlementTab participants={participants} bills={bills} />
        )}
      </div>
    </div>
  )
}
