import { useState } from 'react'
import { LOAD_TYPES, INTENSITIES } from '../lib/loadTypes'

const BASE_URL = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'

// Create OR edit an assignment. Pass `assignment` to edit (PATCH); omit to create
// (POST). In the day-based model an assignment is "what you do that day", so a
// scheduled date is required and there is no throw-count target.
export function AssignWorkForm({ playerId, authToken, assignment, onSaved, onCancel }) {
  const isEdit = Boolean(assignment)
  const [form, setForm] = useState({
    title:     assignment?.title ?? '',
    loadType:  assignment?.loadType ?? 'bullpen',
    intensity: assignment?.intensity ?? 'high',
    dueDate:   assignment?.dueDate ? String(assignment.dueDate).slice(0, 10) : '',
    notes:     assignment?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit = form.title.trim() && form.dueDate && !saving

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        loadType: form.loadType,
        intensity: form.intensity,
        dueDate: form.dueDate,
        notes: form.notes.trim() || undefined,
      }
      const url = isEdit
        ? `${BASE_URL}/assignments/${assignment.id}`
        : `${BASE_URL}/players/${playerId}/assignments`
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Could not save assignment')
      }
      const saved = await res.json()
      onSaved?.(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-xl border border-border bg-card p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Focus</label>
        <input
          type="text"
          value={form.title}
          onChange={e => update('title', e.target.value)}
          placeholder="e.g. Glove-side fastball command"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
          <select
            value={form.loadType}
            onChange={e => update('loadType', e.target.value)}
            aria-label="Type"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {LOAD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Intensity</label>
          <select
            value={form.intensity}
            onChange={e => update('intensity', e.target.value)}
            aria-label="Intensity"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {INTENSITIES.map(i => <option key={i} value={i}>{i[0].toUpperCase() + i.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Scheduled day</label>
        <input
          type="date"
          value={form.dueDate}
          onChange={e => update('dueDate', e.target.value)}
          aria-label="Scheduled day"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Assign'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
