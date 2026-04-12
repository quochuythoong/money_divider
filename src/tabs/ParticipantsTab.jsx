import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { G, AVATAR_COLORS, btnBase } from '../styles/theme.js'
import { Modal, Input, Avatar, Empty, Confirm, Spinner } from '../components/index.jsx'

export default function ParticipantsTab({ sessionId, participants, reload, loading, isGuest, guestApi }) {
  const [showModal, setShowModal]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)   // participant object | null
  const [name, setName]             = useState('')
  const [nameErr, setNameErr]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)   // participant object | null

  // ── Open / close ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setName(''); setNameErr(''); setEditTarget(null); setShowModal(true)
  }
  const openEdit = p => {
    setName(p.name); setNameErr(''); setEditTarget(p); setShowModal(true)
  }
  const close = () => { setShowModal(false) }

  // ── Save ─────────────────────────────────────────────────────────────────────
  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setNameErr('Name is required'); return }
    if (participants.some(p => p.name.toLowerCase() === trimmed.toLowerCase() && p.id !== editTarget?.id)) {
      setNameErr('A participant with this name already exists'); return
    }

    setSaving(true)
    try {
      if (isGuest) {
        if (editTarget) guestApi.updateParticipant(editTarget.id, trimmed)
        else            guestApi.addParticipant(trimmed)
      } else {
        if (editTarget) {
          const { error } = await supabase.from('participants').update({ name: trimmed }).eq('id', editTarget.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('participants').insert({ session_id: sessionId, name: trimmed })
          if (error) throw error
        }
      }
      await reload()
      close()
    } catch (e) {
      setNameErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!confirmDel) return
    try {
      if (isGuest) guestApi.deleteParticipant(confirmDel.id)
      else {
        const { error } = await supabase.from('participants').delete().eq('id', confirmDel.id)
        if (error) throw error
      }
      await reload()
    } catch (e) {
      alert('Could not delete – this person may be referenced by existing bills.')
    } finally {
      setConfirmDel(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Sticky header */}
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 22, fontFamily: "'DM Serif Display', Georgia, serif", color: G.text, marginBottom: 4 }}>
              Participants
            </h2>
            <p style={{ color: G.textMuted, fontSize: 13 }}>
              {participants.length} {participants.length === 1 ? 'person' : 'people'} in this group
            </p>
          </div>
          <button
            onClick={openAdd}
            style={{ ...btnBase, background: G.accent, color: '#000', fontWeight: 700, boxShadow: `0 0 22px ${G.accentGlow}` }}
          >
            + Add Person
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? <Spinner /> : participants.length === 0 ? (
          <Empty icon="👥" text="No participants yet. Add people to get started." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {participants.map((p, i) => {
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
              return (
                <div
                  key={p.id}
                  style={{
                    background:   G.card,
                    border:       `1px solid ${G.border}`,
                    borderRadius: 12,
                    padding:      '14px 16px',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          12,
                    transition:   'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = G.borderHi}
                  onMouseLeave={e => e.currentTarget.style.borderColor = G.border}
                >
                  <Avatar name={p.name} color={color} />
                  <span style={{ flex: 1, fontWeight: 600, color: G.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(p)}
                      style={{ ...btnBase, padding: '4px 9px', fontSize: 11, background: G.surface, color: G.textMuted, border: `1px solid ${G.border}` }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDel(p)}
                      style={{ ...btnBase, padding: '4px 9px', fontSize: 11, background: G.redBg, color: G.red, border: `1px solid ${G.red}33` }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <Modal title={editTarget ? 'Edit Participant' : 'Add Participant'} onClose={close}>
          <Input
            label="Full Name"
            value={name}
            error={nameErr}
            onChange={e => { setName(e.target.value); setNameErr('') }}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            placeholder="Enter name…"
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={close}   style={{ ...btnBase, background: G.surface, color: G.textMuted, border: `1px solid ${G.border}` }}>Cancel</button>
            <button onClick={save} disabled={saving}
              style={{ ...btnBase, background: G.accent, color: '#000', fontWeight: 700, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : editTarget ? 'Save' : 'Add'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <Confirm
          message={`Remove "${confirmDel.name}" from this group? This will also remove them from all bills.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}
