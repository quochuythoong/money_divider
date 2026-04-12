import { useMemo } from 'react'
import { G, AVATAR_COLORS } from '../styles/theme.js'
import { Avatar, Badge, Empty } from '../components/index.jsx'
import { calculateBalances, fmtVND } from '../engine/calculator.js'

export default function SummaryTab({ participants, bills }) {
  // Normalise bills for the engine (need participantIds array)
  const normBills = useMemo(() =>
    bills.map(b => ({
      ...b,
      payerId:        b.payer_id,
      participantIds: b.participants.map(bp => bp.participant_id),
    })), [bills])

  const { paid, owed, net } = useMemo(
    () => calculateBalances(participants, normBills),
    [participants, normBills]
  )

  const totalExpenses = bills.reduce((s, b) => s + +b.amount, 0)

  if (participants.length === 0) {
    return <Empty icon="📊" text="Add participants and bills to see the summary." />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Sticky header */}
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontFamily: "'DM Serif Display', Georgia, serif", color: G.text, marginBottom: 4 }}>
          Summary
        </h2>
        <p style={{ color: G.textMuted, fontSize: 13 }}>
          Per-person breakdown across all {bills.length} {bills.length === 1 ? 'bill' : 'bills'} · Total: <span style={{ color: G.accent, fontWeight: 600 }}>{fmtVND(totalExpenses)}</span>
        </p>
      </div>

      {/* Per-person table */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 540 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${G.border}` }}>
              {['Person', 'Total Paid', 'Total Owed', 'Net Balance', 'Status'].map((h, idx) => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: idx === 0 ? 'left' : 'right',
                  color: G.textMuted, fontWeight: 500, fontSize: 11,
                  letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => {
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
              const n     = net[p.id]  ?? 0
              const pos   = n >  0.5
              const neg   = n < -0.5
              return (
                <tr key={p.id}
                  style={{ borderBottom: `1px solid ${G.border}18`, transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = G.surface}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={p.name} color={color} size={28} />
                      <span style={{ fontWeight: 600, color: G.text }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', color: G.green, fontWeight: 500 }}>
                    {fmtVND(paid[p.id] ?? 0)}
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', color: G.red, fontWeight: 500 }}>
                    {fmtVND(owed[p.id] ?? 0)}
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', fontWeight: 700, fontSize: 15 }}>
                    <span style={{ color: pos ? G.green : neg ? G.red : G.textMuted }}>
                      {pos ? '+' : ''}{fmtVND(n)}
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                    {pos ? <Badge color={G.green}>Gets back</Badge>
                         : neg ? <Badge color={G.red}>Owes</Badge>
                         : <Badge color={G.textMuted}>Even</Badge>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

      {/* Bill-by-bill breakdown */}
      {bills.length > 0 && (
        <>
          <h3 style={{ fontSize: 16, fontFamily: "'DM Serif Display', Georgia, serif", color: G.text, marginBottom: 14 }}>
            Bill Breakdown
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${G.border}` }}>
                  {['Bill', 'Amount', 'Paid By', 'Shared By', 'Per Person'].map((h, idx) => (
                    <th key={h} style={{
                      padding: '10px 14px',
                      textAlign: (idx === 1 || idx === 4) ? 'right' : 'left',
                      color: G.textMuted, fontWeight: 500, fontSize: 11,
                      letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => {
                  const payer = participants.find(p => p.id === bill.payer_id)
                  const parts = participants.filter(p => bill.participants.some(bp => bp.participant_id === p.id))
                  const share = +bill.amount / (parts.length || 1)
                  return (
                    <tr key={bill.id}
                      style={{ borderBottom: `1px solid ${G.border}18` }}
                      onMouseEnter={e => e.currentTarget.style.background = G.surface}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '12px 14px', color: G.text, fontWeight: 500 }}>{bill.title}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: G.accent, fontWeight: 600 }}>{fmtVND(+bill.amount)}</td>
                      <td style={{ padding: '12px 14px', color: G.blue }}>{payer?.name ?? '?'}</td>
                      <td style={{ padding: '12px 14px', color: G.textMuted, fontSize: 12 }}>{parts.map(p => p.name).join(', ')}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: G.textMuted }}>{fmtVND(share)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>{/* end scrollable content */}
    </div>
  )
}
