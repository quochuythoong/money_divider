import { G, btnBase } from '../styles/theme.js'

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, color = G.accent }) {
  return (
    <span style={{
      background:    color + '22',
      color,
      padding:       '2px 8px',
      borderRadius:  20,
      fontSize:      11,
      fontWeight:    600,
      letterSpacing: '0.03em',
      whiteSpace:    'nowrap',
    }}>
      {children}
    </span>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: `2px solid ${G.border}`,
        borderTopColor: G.accent,
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div
      style={{
        position:       'fixed', inset: 0,
        background:     'rgba(0,0,0,0.72)',
        zIndex:         200,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: window.innerWidth < 768 ? 'flex-end' : 'center',
        padding:        window.innerWidth < 768 ? 0 : 16,
        backdropFilter: 'blur(5px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background:    G.card,
          border:        `1px solid ${G.borderHi}`,
          borderRadius:  16,
          padding:       '24px 18px',
          maxWidth:      width,
          width:         '100%',
          maxHeight:     '85dvh',
          overflowY:     'auto',
          boxShadow:     '0 32px 80px rgba(0,0,0,0.7)',
          // Mobile: stick to bottom like a sheet
          alignSelf:     window.innerWidth < 768 ? 'flex-end' : 'center',
          borderBottomLeftRadius:  window.innerWidth < 768 ? 0 : 16,
          borderBottomRightRadius: window.innerWidth < 768 ? 0 : 16,
          marginBottom:  0,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: G.text, fontFamily: "'DM Serif Display', Georgia, serif" }}>
            {title}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: G.textMuted, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '0 2px' }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, error, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 11, color: G.textMuted, marginBottom: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <input
        style={{
          width:        '100%',
          background:   G.surface,
          border:       `1px solid ${error ? G.red : G.border}`,
          borderRadius: 8,
          padding:      '9px 12px',
          color:        G.text,
          fontSize:     14,
          fontFamily:   'inherit',
          outline:      'none',
          transition:   'border-color 0.15s',
        }}
        onFocus={e  => e.target.style.borderColor = G.accent}
        onBlur={e   => e.target.style.borderColor = error ? G.red : G.border}
        {...props}
      />
      {error && <p style={{ color: G.red, fontSize: 11, marginTop: 4 }}>{error}</p>}
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 11, color: G.textMuted, marginBottom: 5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <select
        style={{
          width:        '100%',
          background:   G.surface,
          border:       `1px solid ${G.border}`,
          borderRadius: 8,
          padding:      '9px 12px',
          color:        G.text,
          fontSize:     14,
          fontFamily:   'inherit',
          outline:      'none',
          cursor:       'pointer',
        }}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

// ─── MultiSelect (toggle chips) ───────────────────────────────────────────────
export function MultiSelect({ label, options, selected, onChange }) {
  const toggle = id =>
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])

  const allOn = options.length > 0 && options.every(o => selected.includes(o.value))

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: G.textMuted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label} <span style={{ color: G.accent }}>({selected.length})</span>
        </label>
        <button
          type="button"
          onClick={() => onChange(allOn ? [] : options.map(o => o.value))}
          style={{ ...btnBase, padding: '2px 8px', fontSize: 11, background: 'none', color: G.accent, border: 'none', cursor: 'pointer' }}
        >
          {allOn ? 'None' : 'All'}
        </button>
      </div>
      <div style={{
        display:      'flex',
        flexWrap:     'wrap',
        gap:          7,
        background:   G.surface,
        border:       `1px solid ${G.border}`,
        borderRadius: 8,
        padding:      10,
        minHeight:    46,
      }}>
        {options.map(opt => {
          const on = selected.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              style={{
                ...btnBase,
                padding:    '4px 12px',
                fontSize:   12,
                background: on ? G.accent         : G.card,
                color:      on ? '#000'           : G.textMuted,
                border:     `1px solid ${on ? G.accent : G.border}`,
                fontWeight: on ? 700 : 400,
              }}
            >
              {opt.label}
            </button>
          )
        })}
        {options.length === 0 && (
          <span style={{ color: G.textDim, fontSize: 12 }}>Add participants first</span>
        )}
      </div>
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, color, size = 34 }) {
  return (
    <div style={{
      width:          size,
      height:         size,
      borderRadius:   '50%',
      background:     color + '1e',
      border:         `1.5px solid ${color}44`,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontSize:       size * 0.38,
      fontWeight:     700,
      color,
      flexShrink:     0,
    }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function Empty({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px', color: G.textMuted }}>
      <div style={{ fontSize: 44, marginBottom: 14, opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
export function Confirm({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Confirm" onClose={onCancel} width={360}>
      <p style={{ color: G.textMuted, fontSize: 14, marginBottom: 24 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel}  style={{ ...btnBase, background: G.surface, color: G.textMuted, border: `1px solid ${G.border}` }}>Cancel</button>
        <button onClick={onConfirm} style={{ ...btnBase, background: G.redBg,   color: G.red,       border: `1px solid ${G.red}44`, fontWeight: 700 }}>Delete</button>
      </div>
    </Modal>
  )
}
