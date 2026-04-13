/**
 * calculateBalances
 *  participants : [{ id, name }]
 *  bills        : [{ id, amount, payerId, participantIds: [...] }]
 *
 * Returns:
 *  paid  – how much each person actually paid out
 *  owed  – how much each person owes across all bills
 *  net   – paid - owed  (positive = is owed money, negative = owes money)
 */
export function calculateBalances(participants, bills) {
  const paid = {}
  const owed = {}
  participants.forEach(p => { paid[p.id] = 0; owed[p.id] = 0 })

  for (const bill of bills) {
    const n = bill.participantIds.length
    if (n === 0) continue

    const share = bill.amount / n

    // Payer gets credit for the full amount
    if (paid[bill.payerId] !== undefined) {
      paid[bill.payerId] += bill.amount
    }

    // Each participant owes their share
    for (const pid of bill.participantIds) {
      if (owed[pid] !== undefined) {
        owed[pid] += share
      }
    }
  }

  const net = {}
  participants.forEach(p => {
    net[p.id] = (paid[p.id] ?? 0) - (owed[p.id] ?? 0)
  })

  return { paid, owed, net }
}

/**
 * calculateSettlements
 * Uses a greedy creditor/debtor pass to minimise the number of transfers.
 *
 * Returns: [{ fromId, from, toId, to, amount }]
 */
export function calculateSettlements(participants, net) {
  const byId = Object.fromEntries(participants.map(p => [p.id, p.name]))

  const creditors = []
  const debtors   = []

  for (const p of participants) {
    const b = net[p.id] ?? 0
    if (b >  0.5) creditors.push({ id: p.id, amount:  b })
    if (b < -0.5) debtors.push  ({ id: p.id, amount: -b })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors  .sort((a, b) => b.amount - a.amount)

  const settlements = []
  let ci = 0, di = 0

  while (ci < creditors.length && di < debtors.length) {
    const transfer = Math.min(creditors[ci].amount, debtors[di].amount)

    if (transfer > 0.5) {
      settlements.push({
        fromId: debtors[di].id,
        from:   byId[debtors[di].id],
        toId:   creditors[ci].id,
        to:     byId[creditors[ci].id],
        amount: transfer,
      })
    }

    creditors[ci].amount -= transfer
    debtors[di].amount   -= transfer

    if (creditors[ci].amount < 0.5) ci++
    if (debtors[di].amount   < 0.5) di++
  }

  return settlements
}

// VND and USD formatting helpers
export function fmtVND(n) {
  return fmtCurrency(n, 'VND')
}

export function fmtCurrency(n, currency = 'VND') {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style:                 'currency',
      currency:              'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  }
  return new Intl.NumberFormat('vi-VN', {
    style:                 'currency',
    currency:              'VND',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}