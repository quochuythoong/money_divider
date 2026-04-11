import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import { onAuthChange, signOut } from './lib/auth.js'
import { G, btnBase } from './styles/theme.js'
import { Modal, Input, Spinner } from './components/index.jsx'
import { isConfigured } from './lib/supabase.js'
import { useIsMobile } from './lib/useIsMobile.js'
import AuthScreen      from './tabs/AuthScreen.jsx'
import ParticipantsTab from './tabs/ParticipantsTab.jsx'
import BillsTab        from './tabs/BillsTab.jsx'
import SummaryTab      from './tabs/SummaryTab.jsx'
import SettlementTab   from './tabs/SettlementTab.jsx'

// ─── Setup guide (shown when .env is missing) ─────────────────────────────
function SetupGuide() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>⚙️</div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, color: G.text, marginBottom: 8 }}>
            Setup Required
          </h1>
          <p style={{ color: G.textMuted, fontSize: 14 }}>
            Supabase credentials are missing. Follow these steps:
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { n: 1, title: 'Create a free Supabase project', body: 'Go to supabase.com → New Project. Takes about 1 minute.' },
            { n: 2, title: 'Run the database schema', body: 'In Supabase → SQL Editor, paste and run the contents of supabase_schema.sql from this repo.' },
            { n: 3, title: 'Copy your credentials', body: 'Supabase → Settings → API → copy Project URL and anon public key.' },
            { n: 4, title: 'Create your .env file', body: 'Copy .env.example → .env and paste your URL and key into the two variables.' },
            { n: 5, title: 'Restart the app', body: 'Run npm run dev again. This screen will be replaced by the login page.' },
          ].map(step => (
            <div key={step.n} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: G.accentGlow, border: `1px solid ${G.accent}44`, color: G.accent, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{step.n}</div>
              <div>
                <div style={{ fontWeight: 600, color: G.text, marginBottom: 4 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: G.textMuted }}>{step.body}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: G.textDim }}>
          Full instructions in README.md
        </p>
      </div>
    </div>
  )
}

const TABS = [
  { id: 'participants', label: 'People',     icon: '👥' },
  { id: 'bills',        label: 'Bills',      icon: '🧾' },
  { id: 'summary',      label: 'Summary',    icon: '📊' },
  { id: 'settlement',   label: 'Settlement', icon: '💸' },
]

// ─── Guest storage (localStorage only, no Supabase) ──────────────────────────
const GUEST_KEY = 'md_guest_data'

function loadGuest() {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY)) ?? { sessions: [], participants: [], bills: [] } }
  catch { return { sessions: [], participants: [], bills: [] } }
}
function saveGuest(data) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(data))
}
function clearGuest() {
  localStorage.removeItem(GUEST_KEY)
}

// clear guest data on tab/window close
window.addEventListener('beforeunload', clearGuest)
clearGuest()

// ─── Tiny uid for guest mode ──────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9)

// ─── Session picker ───────────────────────────────────────────────────────────
function SessionScreen({ user, isGuest, onSession, onSignOut }) {
  const [sessions,  setSessions]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showNew,   setShowNew]   = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newErr,    setNewErr]    = useState('')
  const [creating,  setCreating]  = useState(false)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    if (isGuest) {
      setSessions(loadGuest().sessions)
    } else {
      const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false })
      setSessions(data ?? [])
    }
    setLoading(false)
  }, [isGuest])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const create = async () => {
    const name = newName.trim()
    if (!name) { setNewErr('Name is required'); return }
    setCreating(true)
    try {
      if (isGuest) {
        const g = loadGuest()
        const s = { id: uid(), name, created_at: new Date().toISOString() }
        g.sessions.push(s)
        saveGuest(g)
        onSession(s)
      } else {
        const { data, error } = await supabase
          .from('sessions')
          .insert({ name, user_id: user.id })
          .select().single()
        if (error) throw error
        onSession(data)
      }
    } catch (e) { setNewErr(e.message) }
    finally { setCreating(false) }
  }

  const del = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this group and all its data?')) return
    if (isGuest) {
      const g = loadGuest()
      g.sessions     = g.sessions.filter(s => s.id !== id)
      g.participants = g.participants.filter(p => p.session_id !== id)
      g.bills        = g.bills.filter(b => b.session_id !== id)
      saveGuest(g)
      setSessions(s => s.filter(x => x.id !== id))
    } else {
      await supabase.from('sessions').delete().eq('id', id)
      setSessions(s => s.filter(x => x.id !== id))
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 460, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>÷</div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 32, color: G.text, marginBottom: 6 }}>
            Money<span style={{ color: G.accent }}>Divider</span>
          </h1>
          <p style={{ color: G.textMuted, fontSize: 13 }}>
            {isGuest ? '⚠️ Guest mode — data clears on refresh' : `Logged in as `}
            {!isGuest && <strong style={{ color: G.accent }}>{user?.email?.replace('@moneyivider.app','')?.replace('@moneyivider.app','')?.replace('@moneyivider.app','')?.split('@')[0]}</strong>}
          </p>
        </div>

        {loading ? <Spinner /> : (
          <>
            {sessions.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ color: G.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Your groups</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sessions.map(s => (
                    <div key={s.id} onClick={() => onSession(s)} style={{
                      background: G.card, border: `1px solid ${G.border}`, borderRadius: 10,
                      padding: '14px 16px', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'border-color 0.15s',
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
                      <button onClick={e => del(s.id, e)} style={{ ...btnBase, padding: '4px 8px', fontSize: 11, background: 'none', color: G.textDim, border: 'none' }}>🗑</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => { setShowNew(true); setNewName(''); setNewErr('') }} style={{
              ...btnBase, width: '100%', padding: 13, fontSize: 14,
              background: G.accent, color: '#000', fontWeight: 700,
              boxShadow: `0 0 28px ${G.accentGlow}`, marginBottom: 10,
            }}>
              + New Group
            </button>

            <button onClick={onSignOut} style={{
              ...btnBase, width: '100%', padding: 10, fontSize: 13,
              background: 'none', border: `1px solid ${G.border}`, color: G.textMuted,
            }}>
              {isGuest ? 'Back to login' : 'Sign out'}
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

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user,         setUser]         = useState(undefined)  // undefined = loading
  const [isGuest,      setIsGuest]      = useState(false)
  const [session,      setSession]      = useState(null)
  const [tab,          setTab]          = useState('participants')
  const [participants, setParticipants] = useState([])
  const [bills,        setBills]        = useState([])
  const [loading,      setLoading]      = useState(false)

  const isMobile = useIsMobile()

  // Listen for Supabase auth changes
  useEffect(() => {
    const { data: { subscription } } = onAuthChange(u => setUser(u))
    return () => subscription.unsubscribe()
  }, [])

  const handleGuest = () => { setIsGuest(true); setUser(null) }

  const handleSignOut = () => {
    if (!isGuest) signOut()
    clearGuest()
    setIsGuest(false)
    setSession(null)
    setParticipants([])
    setBills([])
  }

  // ── Load data ──────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      if (isGuest) {
        const g = loadGuest()
        setParticipants(g.participants.filter(p => p.session_id === session.id))
        // Attach synthetic bill_participants shape
        const rawBills = g.bills.filter(b => b.session_id === session.id)
        setBills(rawBills.map(b => ({ ...b, participants: (b.participant_ids ?? []).map(pid => ({ participant_id: pid })) })))
      } else {
        const [{ data: ps }, { data: bs }] = await Promise.all([
          supabase.from('participants').select('*').eq('session_id', session.id).order('created_at'),
          supabase.from('bills').select('*, participants:bill_participants(participant_id)').eq('session_id', session.id).order('created_at'),
        ])
        setParticipants(ps ?? [])
        setBills(bs ?? [])
      }
    } finally { setLoading(false) }
  }, [session, isGuest])

  useEffect(() => { reload() }, [reload])

  if (!isConfigured) return <SetupGuide />

  // ── Still checking auth ────────────────────────────────────────────────────
  if (user === undefined) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
  }

  // ── Not logged in and not guest → show auth screen ─────────────────────────
  if (!user && !isGuest) return <AuthScreen onGuest={handleGuest} />

  // ── No session chosen yet → show session picker ────────────────────────────
  if (!session) {
    return (
      <SessionScreen
        user={user}
        isGuest={isGuest}
        onSession={setSession}
        onSignOut={handleSignOut}
      />
    )
  }

  // ── Guest CRUD helpers (mirror Supabase API shape) ─────────────────────────
  const guestApi = {
    addParticipant: (name) => {
      const p = { id: uid(), session_id: session.id, name, created_at: new Date().toISOString() }
      const g = loadGuest(); g.participants.push(p); saveGuest(g)
      return p
    },
    updateParticipant: (id, name) => {
      const g = loadGuest(); const p = g.participants.find(x => x.id === id); if (p) p.name = name; saveGuest(g)
    },
    deleteParticipant: (id) => {
      const g = loadGuest()
      g.participants = g.participants.filter(x => x.id !== id)
      g.bills = g.bills.map(b => ({ ...b, participant_ids: (b.participant_ids ?? []).filter(pid => pid !== id) }))
      saveGuest(g)
    },
    addBill: (bill) => {
      const b = { id: uid(), session_id: session.id, ...bill, created_at: new Date().toISOString() }
      const g = loadGuest(); g.bills.push(b); saveGuest(g); return b
    },
    updateBill: (id, bill) => {
      const g = loadGuest(); const b = g.bills.find(x => x.id === id); if (b) Object.assign(b, bill); saveGuest(g)
    },
    deleteBill: (id) => {
      const g = loadGuest(); g.bills = g.bills.filter(x => x.id !== id); saveGuest(g)
    },
  }

  // ── Session active ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: G.bg }}>
      <div style={{
        background:    G.surface,
        borderBottom:  `1px solid ${G.border}`,
        position:      'sticky',
        top:            0,
        zIndex:         50,
        padding:        '0 20px',
        paddingTop:     'env(safe-area-inset-top)',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Row 1: Logo + Groups button always top right */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: G.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#000' }}>÷</div>
              <div>
                <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 700, fontSize: 17, color: G.text }}>
                  Money<span style={{ color: G.accent }}>Divider</span>
                </span>
                {!isMobile && <span style={{ marginLeft: 10, fontSize: 12, color: G.textMuted }}>/ {session.name}</span>}
              </div>
              {isGuest && <span style={{ fontSize: 11, background: G.accentGlow, color: G.accent, padding: '2px 8px', borderRadius: 20, border: `1px solid ${G.accent}44` }}>Guest</span>}
            </div>
            <button
              onClick={() => setSession(null)}
              style={{ ...btnBase, padding: '6px 12px', background: 'none', color: G.textMuted, border: `1px solid ${G.border}`, fontSize: 12 }}
            >
              ← Groups
            </button>
          </div>

          {/* Row 2: session name on mobile, tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: 0, overflowX: 'auto', paddingBottom: 0 }}>
            {isMobile && (
              <span style={{ fontSize: 12, color: G.textMuted, paddingRight: 12, whiteSpace: 'nowrap' }}>/ {session.name}</span>
            )}
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                ...btnBase, padding: isMobile ? '8px 10px' : '10px 14px', background: 'none',
                color: tab === t.id ? G.accent : G.textMuted, border: 'none',
                borderBottom: tab === t.id ? `2px solid ${G.accent}` : '2px solid transparent',
                borderRadius: 0, fontWeight: tab === t.id ? 700 : 400,
                fontSize: isMobile ? 12 : 13, whiteSpace: 'nowrap',
              }}>
                <span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px', paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
        {tab === 'participants' && <ParticipantsTab sessionId={session.id} participants={participants} reload={reload} loading={loading} isGuest={isGuest} guestApi={guestApi} />}
        {tab === 'bills'        && <BillsTab        sessionId={session.id} participants={participants} bills={bills} reload={reload} loading={loading} isGuest={isGuest} guestApi={guestApi} />}
        {tab === 'summary'     && <SummaryTab      participants={participants} bills={bills} />}
        {tab === 'settlement'  && <SettlementTab   participants={participants} bills={bills} />}
      </div>
    </div>
  )
}