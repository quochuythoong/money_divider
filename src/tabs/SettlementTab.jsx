import { useMemo, useState, useRef } from 'react'
import { G, AVATAR_COLORS, btnBase } from '../styles/theme.js'
import { Avatar, Empty } from '../components/index.jsx'
import { calculateBalances, calculateSettlements, fmtVND } from '../engine/calculator.js'
import { useIsMobile } from '../lib/useIsMobile.js'
import html2canvas from 'html2canvas'

export default function SettlementTab({ participants, bills }) {
  // ── NEW: checkbox state (set of settlement keys that are "done") ──────────
  const [checkedKeys, setCheckedKeys] = useState(new Set())

  // ── NEW: collector mode ───────────────────────────────────────────────────
  const [collectorId, setCollectorId] = useState(null)   // null = off

  // ── NEW: QR image ─────────────────────────────────────────────────────────
  const [qrImage, setQrImage] = useState(null)
  const fileInputRef = useRef()

  // ── const ref ─────────────────────────────────────────────────────────────
  const isMobile = useIsMobile()
  const captureRef = useRef()

  // ── Existing: normalise bills ─────────────────────────────────────────────
  const normBills = useMemo(() =>
    bills.map(b => ({
      ...b,
      payerId:        b.payer_id,
      participantIds: b.participants.map(bp => bp.participant_id),
    })), [bills])

  const { net } = useMemo(
    () => calculateBalances(participants, normBills),
    [participants, normBills]
  )

  // ── NEW: collector-mode settlements ───────────────────────────────────────
  // When a collector is chosen, every person who owes money pays the collector,
  // and the collector pays every person who is owed money.
  const collectorSettlements = useMemo(() => {
    if (!collectorId) return null
    const result = []
    for (const p of participants) {
      if (p.id === collectorId) continue
      const n = net[p.id] ?? 0
      if (n < -0.5) {
        // p owes money → pays collector
        result.push({
          key:    `${p.id}→${collectorId}`,
          fromId: p.id,
          from:   p.name,
          toId:   collectorId,
          to:     participants.find(x => x.id === collectorId)?.name ?? '?',
          amount: Math.ceil(-n / 1000) * 1000, // Round up to nearest 1000 VND
        })
      } else if (n > 0.5) {
        // p is owed money → collector pays them
        result.push({
          key:    `${collectorId}→${p.id}`,
          fromId: collectorId,
          from:   participants.find(x => x.id === collectorId)?.name ?? '?',
          toId:   p.id,
          to:     p.name,
          amount: Math.ceil(n / 1000) * 1000, // Round up to nearest 1000 VND
        })
      }
    }
    return result
  }, [collectorId, participants, net])

  // ── Existing: normal optimal settlements ─────────────────────────────────
  const normalSettlements = useMemo(
    () => calculateSettlements(participants, net).map((s, i) => ({
      ...s,
      key: `${s.fromId}→${s.toId}→${i}`,
    })),
    [participants, net]
  )

  // Active list depends on mode
  const settlements = collectorId ? collectorSettlements : normalSettlements

  const total = bills.reduce((s, b) => s + +b.amount, 0)

  const colorOf = id => {
    const idx = participants.findIndex(p => p.id === id)
    return AVATAR_COLORS[idx % AVATAR_COLORS.length] ?? G.textMuted
  }

  // ── NEW: toggle a checkbox ────────────────────────────────────────────────
  const toggleCheck = key => {
    setCheckedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── NEW: QR image pick ────────────────────────────────────────────────────
  const handleQrPick = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setQrImage(ev.target.result)
    reader.readAsDataURL(file)
  }

  // ── NEW: save settlements as image ───────────────────────────────────────
  const saveImage = async () => {
    if (!captureRef.current) return
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: G.bg,
        scale: 2, // retina quality
        useCORS: true,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = 'settlements.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      alert('Could not save image: ' + e.message)
    }
  }

  if (participants.length === 0) {
    return <Empty icon="💸" text="Add participants and bills to calculate settlements." />
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontFamily: "'DM Serif Display', Georgia, serif", color: G.text, marginBottom: 4 }}>
        Settlement
      </h2>
      <p style={{ color: G.textMuted, fontSize: 13, marginBottom: 24 }}>
        Minimum transfers to settle all debts
      </p>

      {/* ── NEW: Collector toolbar ────────────────────────────────────────── */}
      <div style={{
        background:   collectorId ? G.accentGlow : G.card,
        border:       `1px solid ${collectorId ? G.accent + '55' : G.border}`,
        borderRadius: 10,
        padding:      '12px 16px',
        marginBottom: 20,
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        flexWrap:     'wrap',
      }}>
        <span style={{ fontSize: 13, color: collectorId ? G.accent : G.textMuted, fontWeight: 600 }}>
          🏦 Collector mode
        </span>
        <span style={{ fontSize: 12, color: G.textMuted, flex: 1 }}>
          {collectorId
            ? 'Everyone pays the collector, who then pays out.'
            : 'Choose one person to collect all money on behalf of the group.'}
        </span>
        {/* Dropdown — only visible when mode is on */}
        {collectorId && (
          <select
            value={collectorId}
            onChange={e => setCollectorId(e.target.value)}
            style={{
              background: G.surface, border: `1px solid ${G.border}`,
              borderRadius: 7, padding: '6px 10px', color: G.text,
              fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            }}
          >
            {participants.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        {/* Toggle button */}
        <button
          onClick={() => {
            if (collectorId) {
              setCollectorId(null)
            } else {
              setCollectorId(participants[0]?.id ?? null)
            }
            setCheckedKeys(new Set())   // reset checkboxes on mode switch
          }}
          style={{
            padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit', fontWeight: 700,
            background: collectorId ? G.red      : G.accent,
            color:      collectorId ? G.redBg    : '#000',
            background: collectorId ? '#3a1a1a'  : G.accent,
            color:      collectorId ? G.red       : '#000',
          }}
        >
          {collectorId ? 'Turn off' : 'Turn on'}
        </button>
      </div>
      
      {/* Settlements + QR — side by side on desktop, stacked on mobile */}
      <div ref={captureRef} style={{
        display:          'flex',
        flexDirection:    isMobile ? 'column' : 'row',
        gap:              24,
        alignItems:       'flex-start',
        marginBottom:     32,
        background:       G.bg,
        padding:          16,
        borderRadius:     12,
      }}>

        {/* Left: settlement cards */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {settlements.length === 0 && (
            <div style={{
              background: G.greenBg, border: `1px solid ${G.green}33`,
              borderRadius: 12, padding: '20px 24px',
              textAlign: 'center', color: G.green,
            }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>✓</div>
              <div style={{ fontWeight: 600 }}>Everyone is settled up!</div>
              <div style={{ fontSize: 13, marginTop: 4, opacity: 0.7 }}>No payments required.</div>
            </div>
          )}
          {settlements.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {settlements.map(s => {
                const done = checkedKeys.has(s.key)
                return (
                  <div key={s.key} style={{
                    background: G.card, border: `1px solid ${G.border}`,
                    borderRadius: 12, padding: '16px 22px',
                    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                    transition: 'border-color 0.15s, opacity 0.2s',
                    opacity: done ? 0.35 : 1,
                    filter: done ? 'blur(2px)' : 'none',
                    userSelect: done ? 'none' : 'auto',
                  }}
                    onMouseEnter={e => { if (!done) e.currentTarget.style.borderColor = G.borderHi }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = G.border }}
                  >
                    <input
                      type="checkbox" checked={done}
                      onChange={() => toggleCheck(s.key)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: 17, height: 17, accentColor: G.green, cursor: 'pointer', flexShrink: 0, filter: 'none', opacity: 1 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={s.from} color={colorOf(s.fromId)} size={32} />
                      <div>
                        <div style={{ fontWeight: 700, color: G.text, fontSize: 14 }}>{s.from}</div>
                        <div style={{ fontSize: 11, color: G.red }}>owes</div>
                      </div>
                    </div>
                    <div style={{ color: G.textDim, fontSize: 20, flexShrink: 0, margin: '0 4px' }}>→</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <Avatar name={s.to} color={colorOf(s.toId)} size={32} />
                      <div>
                        <div style={{ fontWeight: 700, color: G.text, fontSize: 14 }}>{s.to}</div>
                        <div style={{ fontSize: 11, color: G.green }}>receives</div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 20, fontWeight: 700, color: G.accent,
                      fontFamily: "'DM Serif Display', Georgia, serif",
                      flexShrink: 0, background: G.accentGlow,
                      padding: '6px 16px', borderRadius: 8,
                    }}>
                      {fmtVND(s.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* QR code box — right on desktop, bottom on mobile */}
        <div style={{ flexShrink: 0, width: isMobile ? '100%' : 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Bank QR Code
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleQrPick} />
          <div
            onClick={() => fileInputRef.current.click()}
            style={{
              width: isMobile ? '100%' : 260,
              height: isMobile ? 220 : 260,
              boxSizing: 'border-box',
              border: `2px dashed ${qrImage ? G.accent + '88' : G.border}`,
              borderRadius: 16, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden',
              transition: 'border-color 0.2s', background: G.card, position: 'relative',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = G.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = qrImage ? G.accent + '88' : G.border}
          >
            {qrImage ? (
              <>
                <img src={qrImage} alt="Bank QR" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}
                >
                  <span style={{ color: G.text, fontSize: 12, fontWeight: 600 }}>Change image</span>
                </div>
              </>
            ) : (
              <>
                <span style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>📷</span>
                <span style={{ fontSize: 12, color: G.textMuted, textAlign: 'center', padding: '0 16px' }}>Input Bank QR Code</span>
                <span style={{ fontSize: 11, color: G.textDim, marginTop: 4 }}>click to browse</span>
              </>
            )}
          </div>

          <button
            onClick={saveImage}
            style={{
              ...btnBase,
              width:          '100%',
              background:     G.surface,
              color:          G.accent,
              border:         `1px solid ${G.accent}44`,
              fontSize:       13,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            7,
            }}
          >
            📷 Save as Image
          </button>

        </div>{/* end QR column */}

      </div>{/* end flex row */}

      {/* Stats row — existing */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total Expenses',   value: fmtVND(total),      color: G.accent  },
          { label: 'Transfers Needed', value: settlements.length,  color: G.blue    },
          { label: 'Participants',     value: participants.length,  color: G.green   },
          { label: 'Bills',            value: bills.length,         color: G.purple  },
        ].map(item => (
          <div key={item.label} style={{
            background: G.card, border: `1px solid ${G.border}`,
            borderRadius: 12, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 11, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, color: item.color, fontFamily: "'DM Serif Display', Georgia, serif" }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}