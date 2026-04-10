import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { G, CATEGORIES, CAT_COLORS, btnBase } from '../styles/theme.js'
import { Modal, Input, Select, MultiSelect, Badge, Empty, Confirm, Spinner } from '../components/index.jsx'
import { fmtVND } from '../engine/calculator.js'

const BLANK = {
  title:          '',
  amount:         '',
  payerId:        '',
  participantIds: [],
  category:       'Food',
  notes:          '',
}

export default function BillsTab({ sessionId, participants, bills, reload, loading, isGuest, guestApi }) {
  const [showModal, setShowModal]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]             = useState(BLANK)
  const [errors, setErrors]         = useState({})
  const [saving, setSaving]         = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const set = patch => setForm(f => ({ ...f, ...patch }))

  // ── Open ─────────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm({
      ...BLANK,
      payerId:        participants[0]?.id ?? '',
      participantIds: participants.map(p => p.id),
    })
    setErrors({}); setEditTarget(null); setShowModal(true)
  }

  const openEdit = bill => {
    setForm({
      title:          bill.title,
      amount:         String(bill.amount),
      payerId:        bill.payer_id,
      participantIds: bill.participants.map(p => p.participant_id),
      category:       bill.category ?? 'Food',
      notes:          bill.notes ?? '',
    })
    setErrors({}); setEditTarget(bill); setShowModal(true)
  }

  const close = () => setShowModal(false)

  // ── Validate ─────────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.title.trim())                  e.title  = 'Title is required'
    if (!form.amount || isNaN(+form.amount)) e.amount = 'Enter a valid amount'
    if (+form.amount <= 0)                   e.amount = 'Amount must be greater than 0'
    if (!form.payerId)                       e.payer  = 'Select a payer'
    if (form.participantIds.length === 0)    e.parts  = 'Select at least one participant'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (isGuest) {
        const billData = {
          title: form.title.trim(), amount: +form.amount, payer_id: form.payerId,
          category: form.category, notes: form.notes.trim() || null,
          participant_ids: form.participantIds,
        }
        if (editTarget) guestApi.updateBill(editTarget.id, billData)
        else            guestApi.addBill(billData)
      } else {
        if (editTarget) {
          const { error: billErr } = await supabase.from('bills').update({
            title: form.title.trim(), amount: +form.amount, payer_id: form.payerId,
            category: form.category, notes: form.notes.trim() || null,
          }).eq('id', editTarget.id)
          if (billErr) throw billErr
          await supabase.from('bill_participants').delete().eq('bill_id', editTarget.id)
          const { error: bpErr } = await supabase.from('bill_participants').insert(
            form.participantIds.map(pid => ({ bill_id: editTarget.id, participant_id: pid }))
          )
          if (bpErr) throw bpErr
        } else {
          const { data: inserted, error: billErr } = await supabase.from('bills').insert({
            session_id: sessionId, title: form.title.trim(), amount: +form.amount,
            payer_id: form.payerId, category: form.category, notes: form.notes.trim() || null,
          }).select().single()
          if (billErr) throw billErr
          const { error: bpErr } = await supabase.from('bill_participants').insert(
            form.participantIds.map(pid => ({ bill_id: inserted.id, participant_id: pid }))
          )
          if (bpErr) throw bpErr
        }
      }
    } catch (e) {
      setErrors(err => ({ ...err, _server: e.message }))
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    try {
      if (isGuest) guestApi.deleteBill(confirmDel.id)
      else {
        const { error } = await supabase.from('bills').delete().eq('id', confirmDel.id)
        if (error) throw error
      }
      await reload()
    } catch (e) {
      alert(e.message)
    } finally {
      setConfirmDel(null)
    }
  }

  const total = bills.reduce((s, b) => s + +b.amount, 0)

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontFamily: "'DM Serif Display', Georgia, serif", color: G.text, marginBottom: 4 }}>
            Bills &amp; Expenses
          </h2>
          <p style={{ color: G.textMuted, fontSize: 13 }}>
            {bills.length} {bills.length === 1 ? 'bill' : 'bills'}
            {bills.length > 0 && <> · Total: <span style={{ color: G.accent, fontWeight: 600 }}>{fmtVND(total)}</span></>}
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={participants.length === 0}
          title={participants.length === 0 ? 'Add participants first' : ''}
          style={{
            ...btnBase,
            background: G.accent, color: '#000', fontWeight: 700,
            boxShadow: `0 0 22px ${G.accentGlow}`,
            opacity: participants.length === 0 ? 0.4 : 1,
            cursor:  participants.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          + Add Bill
        </button>
      </div>

      {loading ? <Spinner /> : bills.length === 0 ? (
        <Empty icon="🧾" text={participants.length === 0 ? 'Add participants first, then add bills.' : 'No bills yet. Add your first expense.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bills.map(bill => {
            const payer   = participants.find(p => p.id === bill.payer_id)
            const parts   = participants.filter(p => bill.participants.some(bp => bp.participant_id === p.id))
            const share   = +bill.amount / (parts.length || 1)
            const catCol  = CAT_COLORS[bill.category] ?? G.textMuted

            return (
              <div
                key={bill.id}
                style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: '16px 20px', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = G.borderHi}
                onMouseLeave={e => e.currentTarget.style.borderColor = G.border}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: G.text }}>{bill.title}</span>
                      <Badge color={catCol}>{bill.category}</Badge>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: G.textMuted }}>
                      <span>💳 <span style={{ color: G.text, fontWeight: 600 }}>{payer?.name ?? '?'}</span> paid</span>
                      <span>👥 {parts.map(p => p.name).join(', ') || '—'}</span>
                      {bill.notes && <span>📝 {bill.notes}</span>}
                    </div>
                    <div style={{ marginTop: 7, fontSize: 11, color: G.textDim }}>
                      {fmtVND(share)} / person × {parts.length} {parts.length === 1 ? 'person' : 'people'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 19, fontWeight: 700, color: G.accent, fontFamily: "'DM Serif Display', Georgia, serif" }}>
                      {fmtVND(+bill.amount)}
                    </span>
                    <button
                      onClick={() => openEdit(bill)}
                      style={{ ...btnBase, padding: '5px 10px', fontSize: 11, background: G.surface, color: G.textMuted, border: `1px solid ${G.border}` }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDel(bill)}
                      style={{ ...btnBase, padding: '5px 10px', fontSize: 11, background: G.redBg, color: G.red, border: `1px solid ${G.red}33` }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editTarget ? 'Edit Bill' : 'Add Bill'} onClose={close}>
          <Input  label="Title"  value={form.title}    error={errors.title}
            onChange={e => set({ title: e.target.value })} placeholder="e.g. Dinner at Nhà Hàng Ngon" autoFocus />
          <Input  label="Amount (VND)" type="number" value={form.amount} error={errors.amount}
            onChange={e => set({ amount: e.target.value })} placeholder="e.g. 120000" />
          <Select label="Category" value={form.category} onChange={e => set({ category: e.target.value })}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select label="Paid by" value={form.payerId} onChange={e => set({ payerId: e.target.value })}>
            {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          {errors.payer && <p style={{ color: G.red, fontSize: 11, marginTop: -10, marginBottom: 10 }}>{errors.payer}</p>}
          <MultiSelect
            label="Participants who share this bill"
            options={participants.map(p => ({ value: p.id, label: p.name }))}
            selected={form.participantIds}
            onChange={ids => set({ participantIds: ids })}
          />
          {errors.parts && <p style={{ color: G.red, fontSize: 11, marginTop: -10, marginBottom: 10 }}>{errors.parts}</p>}
          <Input  label="Notes (optional)" value={form.notes}
            onChange={e => set({ notes: e.target.value })} placeholder="Optional notes…" />
          {errors._server && <p style={{ color: G.red, fontSize: 12, marginBottom: 10 }}>{errors._server}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={close} style={{ ...btnBase, background: G.surface, color: G.textMuted, border: `1px solid ${G.border}` }}>Cancel</button>
            <button onClick={save} disabled={saving}
              style={{ ...btnBase, background: G.accent, color: '#000', fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : editTarget ? 'Save' : 'Add Bill'}
            </button>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Confirm
          message={`Delete "${confirmDel.title}"? This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}
