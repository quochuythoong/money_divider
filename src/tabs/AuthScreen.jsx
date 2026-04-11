import { useState } from 'react'
import { G, btnBase } from '../styles/theme.js'
import { Input } from '../components/index.jsx'
import { signIn, signUp } from '../lib/auth.js'

export default function AuthScreen({ onGuest }) {
  const [mode,     setMode]     = useState('login')   // 'login' | 'signup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async () => {
    const u = username.trim()
    if (!u)             { setError('Username is required'); return }
    if (!password)      { setError('Password is required'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    try {
      if (mode === 'signup') await signUp(u, password)
      else                   await signIn(u, password)
      // onAuthChange in App.jsx picks up the new session automatically
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 380, width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>÷</div>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 32, color: G.text, marginBottom: 6 }}>
            Money<span style={{ color: G.accent }}>Divider</span>
          </h1>
          <p style={{ color: G.textMuted, fontSize: 13 }}>Split expenses fairly, with zero drama.</p>
        </div>

        {/* Card */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 16, padding: 28, marginBottom: 14 }}>

          {/* Mode toggle */}
          <div style={{ display: 'flex', background: G.surface, borderRadius: 9, padding: 3, marginBottom: 22 }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                ...btnBase, flex: 1, textAlign: 'center',
                background:  mode === m ? G.card : 'none',
                color:       mode === m ? G.text : G.textMuted,
                border:      mode === m ? `1px solid ${G.border}` : 'none',
                fontWeight:  mode === m ? 700 : 400,
                fontSize:    13,
              }}>
                {m === 'login' ? 'Log in' : 'Create account'}
              </button>
            ))}
          </div>

          <form autoComplete="off" onSubmit={e => e.preventDefault()}>
            <Input
              label="Username"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="your username"
              autoFocus
              autoComplete="off"
              name="md-username"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="••••••••"
              autoComplete="new-password"
              name="md-password"
            />
          </form>

          {error && <p style={{ color: G.red, fontSize: 12, marginBottom: 14, marginTop: -6 }}>{error}</p>}

          <button onClick={submit} disabled={loading} style={{
            ...btnBase, width: '100%', padding: 12, fontSize: 14,
            background: G.accent, color: '#000', fontWeight: 700,
            boxShadow: `0 0 24px ${G.accentGlow}`,
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? '…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </div>

        {/* Guest option */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={onGuest} style={{
            ...btnBase, background: 'none', border: `1px solid ${G.border}`,
            color: G.textMuted, width: '100%', padding: 11, fontSize: 13,
          }}>
            Use without account
            <span style={{ display: 'block', fontSize: 11, color: G.textDim, marginTop: 2 }}>
              Data is lost when you close or refresh the tab
            </span>
          </button>
        </div>

      </div>
    </div>
  )
}