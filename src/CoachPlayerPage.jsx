import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ComposedChart, Bar, Cell, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { Header } from './components/Header'
import { FloatingEquipment } from './components/FloatingEquipment'
import { TrackingUpload } from './components/TrackingUpload'
import { Toast } from './components/Toast'

const BASE_URL = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'

const POSITION_LABELS = {
  pitcher: 'P', catcher: 'C', first_base: '1B', second_base: '2B',
  third_base: '3B', shortstop: 'SS', left_field: 'LF', center_field: 'CF',
  right_field: 'RF', designated_hitter: 'DH',
}

const WORKLOAD_STATUS = {
  spike:                { label: 'Spike',      badge: 'bg-destructive/15 text-destructive',    dot: 'bg-destructive' },
  green:                { label: 'Good',       badge: 'bg-primary/15 text-primary',            dot: 'bg-primary' },
  undercooked:          { label: 'Under',      badge: 'bg-yellow-500/15 text-yellow-500',      dot: 'bg-yellow-500' },
  insufficient_history: { label: 'No history', badge: 'bg-muted text-muted-foreground',        dot: 'bg-muted-foreground' },
}

// Mirrors backend's throw_load_type enum (backNine/src/migrations/021_throwing_workload.sql),
// minus 'game' — a coach assigns training, not a scheduled game.
const LOAD_TYPES = [
  { value: 'bullpen',     label: 'Bullpen' },
  { value: 'long_toss',   label: 'Long Toss' },
  { value: 'flat_ground', label: 'Flat Ground' },
  { value: 'plyo',        label: 'Plyo / Weighted' },
  { value: 'warmup',      label: 'Warm-up' },
  { value: 'recovery',    label: 'Recovery' },
  { value: 'pulldown',    label: 'Pull-downs' },
  { value: 'live_ab',     label: 'Live ABs' },
  { value: 'other',       label: 'Other' },
]

// Mirrors backend's throw_intensity enum.
const INTENSITIES = ['low', 'medium', 'high', 'max']

function loadTypeLabel(value) {
  return LOAD_TYPES.find(t => t.value === value)?.label ?? value
}

function throwUnitLabel(loadType) {
  return loadType === 'bullpen' ? 'pitches' : 'throws'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function heightDisplay(cm) {
  const feet = Math.floor(cm / 30.48)
  const inches = Math.round((cm % 30.48) / 2.54)
  return `${feet}'${inches}"`
}

function scoreColorClass(score) {
  if (score == null) return 'text-muted-foreground'
  if (score >= 70) return 'text-primary'
  if (score >= 50) return 'text-yellow-500'
  return 'text-destructive'
}

function restDays(lastOutingStr) {
  if (!lastOutingStr) return null
  const days = Math.floor((Date.now() - new Date(lastOutingStr)) / 86_400_000)
  return days
}

export default function CoachPlayerPage() {
  const { profileId } = useParams()
  const [searchParams] = useSearchParams()
  const teamId = searchParams.get('teamId')
  const navigate = useNavigate()
  const { getToken } = useAuth()

  const [player, setPlayer] = useState(null)
  const [sessions, setSessions] = useState([])
  const [workload, setWorkload] = useState(null)
  const [throwingLoad, setThrowingLoad] = useState([])
  const [trackingUploads, setTrackingUploads] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authToken, setAuthToken] = useState(null)
  const [showUploadPanel, setShowUploadPanel] = useState(false)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignForm, setAssignForm] = useState({
    title: '', loadType: 'bullpen', intensity: 'high', targetThrowCount: 25, notes: '', dueDate: '',
  })
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)
  const [toast, setToast] = useState(null) // { message, onUndo }

  useEffect(() => {
    async function fetchAll() {
      try {
        const token = await getToken()
        setAuthToken(token)
        const headers = { Authorization: `Bearer ${token}` }

        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        const fromDate = ninetyDaysAgo.toISOString().slice(0, 10)

        const [profileRes, sessionsRes, loadRes, uploadsRes, assignmentsRes] = await Promise.all([
          fetch(`${BASE_URL}/players/${profileId}`, { headers }),
          fetch(`${BASE_URL}/players/${profileId}/bullpen-sessions`, { headers }),
          fetch(`${BASE_URL}/players/${profileId}/throwing-load?from=${fromDate}`, { headers }),
          fetch(`${BASE_URL}/players/${profileId}/tracking-uploads`, { headers }),
          fetch(`${BASE_URL}/players/${profileId}/assignments`, { headers }),
        ])

        if (!profileRes.ok) throw new Error(`Could not load player profile (${profileRes.status})`)
        const profileData = await profileRes.json()
        setPlayer(profileData)

        if (sessionsRes.ok) {
          const sessData = await sessionsRes.json()
          setSessions([...sessData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
        }

        if (loadRes.ok) {
          setThrowingLoad(await loadRes.json())
        }

        if (uploadsRes.ok) {
          setTrackingUploads(await uploadsRes.json())
        }

        if (assignmentsRes.ok) {
          setAssignments(await assignmentsRes.json())
        }

        if (teamId) {
          const wlRes = await fetch(`${BASE_URL}/teams/${teamId}/workload`, { headers })
          if (wlRes.ok) {
            const wlData = await wlRes.json()
            const entry = wlData.find(p => p.playerId === profileId)
            if (entry) setWorkload(entry)
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [profileId, teamId, getToken])

  function showToast(message, onUndo) {
    setToast({ message, onUndo })
  }

  async function deleteSession(session) {
    setSessions(prev => prev.filter(s => s.id !== session.id))
    await fetch(`${BASE_URL}/bullpen-sessions/${session.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    showToast('Bullpen session deleted', async () => {
      await fetch(`${BASE_URL}/bullpen-sessions/${session.id}/restore`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setSessions(prev => [...prev, session].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      ))
      setToast(null)
    })
  }

  async function deleteUpload(upload) {
    setTrackingUploads(prev => prev.filter(u => u.id !== upload.id))
    await fetch(`${BASE_URL}/players/${profileId}/tracking-uploads/${upload.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    showToast('Tracking session deleted', async () => {
      await fetch(`${BASE_URL}/players/${profileId}/tracking-uploads/${upload.id}/restore`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setTrackingUploads(prev => [...prev, upload].sort((a, b) =>
        new Date(b.createdAt ?? b.sessionDate) - new Date(a.createdAt ?? a.sessionDate)
      ))
      setToast(null)
    })
  }

  async function createAssignment(e) {
    e.preventDefault()
    if (!assignForm.title.trim()) return
    setIsSavingAssignment(true)
    try {
      const res = await fetch(`${BASE_URL}/players/${profileId}/assignments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: assignForm.title.trim(),
          loadType: assignForm.loadType,
          intensity: assignForm.intensity,
          targetThrowCount: Number(assignForm.targetThrowCount) || 1,
          notes: assignForm.notes.trim() || undefined,
          dueDate: assignForm.dueDate || undefined,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setAssignments(prev => [created, ...prev])
        setAssignForm({ title: '', loadType: 'bullpen', intensity: 'high', targetThrowCount: 25, notes: '', dueDate: '' })
        setShowAssignForm(false)
      }
    } finally {
      setIsSavingAssignment(false)
    }
  }

  async function cancelAssignment(assignment) {
    setAssignments(prev => prev.filter(a => a.id !== assignment.id))
    await fetch(`${BASE_URL}/assignments/${assignment.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    })
    showToast('Assignment canceled', async () => {
      await fetch(`${BASE_URL}/assignments/${assignment.id}/restore`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setAssignments(prev => [assignment, ...prev].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      ))
      setToast(null)
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />
      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.onUndo}
          onDismiss={() => setToast(null)}
        />
      )}

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </button>

        {loading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">{error}</p>}

        {!loading && !error && player && (
          <div className="space-y-10">
            {/* Profile card */}
            <section className="flex items-start gap-5 rounded-xl border border-border bg-card p-6">
              {player.profilePhotoUrl ? (
                <img
                  src={player.profilePhotoUrl}
                  alt={player.name}
                  className="h-20 w-20 shrink-0 rounded-full border-2 border-border object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary">
                  {player.name?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold">{player.name}</h1>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    player.status === 'active'  ? 'bg-primary/15 text-primary' :
                    player.status === 'injured' ? 'bg-destructive/15 text-destructive' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {player.status}
                  </span>
                </div>

                {player.positions?.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {player.positions.map(pos => (
                      <span key={pos} className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
                        {POSITION_LABELS[pos] ?? pos}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  {player.handedness && <span className="capitalize">{player.handedness}-handed</span>}
                  {player.yearsExperience != null && <span>{player.yearsExperience} yr{player.yearsExperience !== 1 ? 's' : ''} exp</span>}
                  {player.heightCm != null && <span>{heightDisplay(player.heightCm)}</span>}
                  {player.weightKg != null && <span>{Math.round(player.weightKg * 2.205)} lbs</span>}
                  {player.homeCity && <span>{player.homeCity}</span>}
                  {player.dateOfBirth && <span>DOB {formatDateShort(player.dateOfBirth)}</span>}
                </div>

                {(player.email || player.phone) && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {player.email && <a href={`mailto:${player.email}`} className="text-primary hover:underline">{player.email}</a>}
                    {player.phone && <a href={`tel:${player.phone}`} className="text-muted-foreground hover:text-foreground">{player.phone}</a>}
                  </div>
                )}
              </div>
            </section>

            {/* Assigned work */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Assigned Work</h2>
                <button
                  onClick={() => setShowAssignForm(v => !v)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/50 transition-colors"
                >
                  {showAssignForm ? 'Cancel' : '+ Assign Work'}
                </button>
              </div>

              {showAssignForm && (
                <form
                  onSubmit={createAssignment}
                  className="mb-6 space-y-3 rounded-xl border border-border bg-card p-5"
                >
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Focus</label>
                    <input
                      type="text"
                      required
                      value={assignForm.title}
                      onChange={e => setAssignForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Glove-side fastball command"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
                      <select
                        value={assignForm.loadType}
                        onChange={e => setAssignForm(f => ({ ...f, loadType: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        {LOAD_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Intensity</label>
                      <select
                        value={assignForm.intensity}
                        onChange={e => setAssignForm(f => ({ ...f, intensity: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        {INTENSITIES.map(i => (
                          <option key={i} value={i}>{i[0].toUpperCase() + i.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        {throwUnitLabel(assignForm.loadType)[0].toUpperCase() + throwUnitLabel(assignForm.loadType).slice(1)}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={assignForm.targetThrowCount}
                        onChange={e => setAssignForm(f => ({ ...f, targetThrowCount: e.target.value }))}
                        className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Due date (optional)</label>
                      <input
                        type="date"
                        value={assignForm.dueDate}
                        onChange={e => setAssignForm(f => ({ ...f, dueDate: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
                    <textarea
                      value={assignForm.notes}
                      onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingAssignment}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {isSavingAssignment ? 'Assigning…' : 'Assign'}
                  </button>
                </form>
              )}

              {assignments.length === 0 && !showAssignForm ? (
                <p className="text-sm text-muted-foreground">No work assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {assignments.filter(a => a.status === 'open').map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            {loadTypeLabel(a.loadType)}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {a.intensity}
                          </span>
                        </div>
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.completedThrowCount} / {a.targetThrowCount} {throwUnitLabel(a.loadType)}
                          {a.dueDate && ` · due ${formatDate(a.dueDate)}`}
                        </p>
                      </div>
                      <button
                        onClick={() => cancelAssignment(a)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                        aria-label="Cancel assignment"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {assignments.filter(a => a.status === 'completed').map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 opacity-70">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium line-through">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.completedThrowCount} / {a.targetThrowCount} {throwUnitLabel(a.loadType)} · completed
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Arm status */}
            {workload && (
              <section>
                <h2 className="mb-4 text-lg font-semibold">Arm Status</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <ArmStat
                    label="ACWR"
                    value={workload.acwr != null ? workload.acwr.toFixed(2) : '—'}
                    sub={(() => {
                      const ws = WORKLOAD_STATUS[workload.status]
                      return (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ws.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ws.dot}`} />
                          {ws.label}
                        </span>
                      )
                    })()}
                  />
                  <ArmStat label="Throws (7d)" value={workload.throws7d ?? '—'} />
                  <ArmStat
                    label="Rest Days"
                    value={restDays(workload.lastOuting) ?? '—'}
                    sub={workload.lastOuting ? <span className="text-xs text-muted-foreground">Last {formatDateShort(workload.lastOuting)}</span> : null}
                  />
                  <ArmStat
                    label="Soreness"
                    value={workload.soreness != null ? `${workload.soreness}/10` : '—'}
                    accent={workload.soreness >= 7 ? 'text-destructive' : workload.soreness >= 4 ? 'text-yellow-500' : undefined}
                  />
                </div>
                {workload.readiness != null && (
                  <div className="mt-3 flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">Readiness</p>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${
                          workload.readiness >= 7 ? 'bg-primary' :
                          workload.readiness >= 4 ? 'bg-yellow-500' : 'bg-destructive'
                        }`}
                        style={{ width: `${(workload.readiness / 10) * 100}%` }}
                      />
                    </div>
                    <p className="w-8 text-right text-sm font-medium tabular-nums">{workload.readiness}/10</p>
                  </div>
                )}
              </section>
            )}

            {/* Throwing load chart */}
            <section>
              <h2 className="mb-4 text-lg font-semibold">Throwing Load</h2>
              <WorkloadChart throwingLoad={throwingLoad} sessions={sessions} />
            </section>

            {/* Velocity + score over time */}
            <section>
              <h2 className="mb-4 text-lg font-semibold">Performance Trends</h2>
              <PerformanceChart sessions={sessions} />
            </section>

            {/* All sessions — bullpen + tracking uploads merged */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Sessions</h2>
                <button
                  onClick={() => setShowUploadPanel(v => !v)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/50 transition-colors"
                >
                  {showUploadPanel ? 'Cancel' : '+ Upload CSV'}
                </button>
              </div>

              {showUploadPanel && (
                <div className="mb-6">
                  <TrackingUpload
                    playerId={profileId}
                    authToken={authToken}
                    onSuccess={async () => {
                      setShowUploadPanel(false)
                      const token = await getToken()
                      const res = await fetch(`${BASE_URL}/players/${profileId}/tracking-uploads`, {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                      if (res.ok) setTrackingUploads(await res.json())
                    }}
                  />
                </div>
              )}

              {(() => {
                const merged = [
                  ...sessions.map(s => ({
                    _type: 'bullpen',
                    _sortDate: new Date(s.startedAt ?? s.createdAt),
                    id: s.id,
                    date: formatDate(s.startedAt ?? s.createdAt),
                    pitchCount: s.pitchCount,
                    score: s.score,
                    notes: s.notes,
                  })),
                  ...trackingUploads.map(u => ({
                    _type: 'tracking',
                    _sortDate: new Date(u.sessionDate ?? u.createdAt),
                    id: u.id,
                    date: u.sessionDate ?? formatDate(u.createdAt),
                    pitchCount: u.pitchCount,
                    deviceType: u.deviceType,
                    filename: u.filename,
                    notes: u.notes,
                  })),
                ].sort((a, b) => b._sortDate - a._sortDate)

                if (merged.length === 0 && !showUploadPanel) {
                  return <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
                }

                return (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {merged.map(item => item._type === 'bullpen' ? (
                      <button
                        key={item.id}
                        onClick={() => navigate(`/bullpen/${item.id}`)}
                        className="group cursor-pointer rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-md"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{item.date}</p>
                            {item.pitchCount != null && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {item.pitchCount} pitch{item.pitchCount !== 1 ? 'es' : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold tabular-nums ${scoreColorClass(item.score)}`}>
                              {item.score != null ? Number(item.score).toFixed(1) : '—'}
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); deleteSession(sessions.find(s => s.id === item.id)) }}
                              className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                              aria-label="Delete session"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Bullpen
                        </span>
                        {item.notes && (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.notes}</p>
                        )}
                        <p className="mt-3 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          View details →
                        </p>
                      </button>
                    ) : (
                      <button
                        key={item.id}
                        className="group w-full rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-amber-500/40 hover:bg-card/80"
                        onClick={() => navigate(`/tracking-uploads/${item.id}`)}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{item.date}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.pitchCount} pitch{item.pitchCount !== 1 ? 'es' : ''}
                            </p>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); deleteUpload(trackingUploads.find(u => u.id === item.id)) }}
                            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                            aria-label="Delete session"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                            </svg>
                          </button>
                        </div>
                        <span className="inline-block rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                          {item.deviceType ?? 'Tracking'}
                        </span>
                        {item.notes && (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.notes}</p>
                        )}
                        <p className="mt-3 text-xs font-medium text-amber-500 opacity-0 transition-opacity group-hover:opacity-100">
                          View pitches →
                        </p>
                      </button>
                    ))}
                  </div>
                )
              })()}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

// Workload unit weights — proxy for elbow torque by throw type and effort level.
// Type multipliers reflect typical distance/context; intensity modifiers use the
// non-linear curve from research (50% effort ≈ 75% max torque).
const TYPE_MULT = {
  recovery:    0.50,
  warmup:      0.60,
  plyo:        0.75,
  flat_ground: 0.85,
  long_toss:   1.00,
  live_ab:     1.10,
  pulldown:    1.30,
  other:       0.80,
}
const INTENSITY_MOD = { low: 0.75, medium: 0.88, high: 0.95, max: 1.00 }

// EWMA decay constants (λ = 2 / (span + 1))
const λA = 2 / 8   // 0.250  — ~7-day acute
const λC = 2 / 29  // ≈0.069 — ~28-day chronic

function sessionUnits(loadType, intensity, count) {
  return count * (TYPE_MULT[loadType] ?? 0.80) * (INTENSITY_MOD[intensity] ?? 0.88)
}

const INTENSITY_RANK = { low: 1, medium: 2, high: 3, max: 4 }
const INTENSITY_COLOR = { low: '#22c55e', medium: '#d4a843', high: '#f97316', max: '#e05530' }

function buildChartData(throwingLoad, sessions) {
  const dailyThrows    = {}
  const dailyUnits     = {}
  const dailyIntRank   = {}  // highest intensity rank seen that day

  throwingLoad.forEach(e => {
    const d = String(e.loadDate).slice(0, 10)
    dailyThrows[d]  = (dailyThrows[d]  || 0) + (e.throwCount || 0)
    dailyUnits[d]   = (dailyUnits[d]   || 0) + sessionUnits(e.loadType, e.intensity, e.throwCount || 0)
    const rank = INTENSITY_RANK[e.intensity] ?? 2
    dailyIntRank[d] = Math.max(dailyIntRank[d] || 0, rank)
  })
  sessions.forEach(s => {
    if (!s.pitchCount) return
    const d = String(s.startedAt ?? s.createdAt).slice(0, 10)
    dailyThrows[d]  = (dailyThrows[d]  || 0) + s.pitchCount
    // Bullpen: type=mound(1.0), intensity=high(0.95)
    dailyUnits[d]   = (dailyUnits[d]   || 0) + s.pitchCount * 1.0 * 0.95
    dailyIntRank[d] = Math.max(dailyIntRank[d] || 0, 3)  // bullpens = high
  })

  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))

  // Run EWMA over 90 days to seed the values; display only the last 56
  let ewmaA = 0, ewmaC = 0
  const all = []
  for (let i = 89; i >= 0; i--) {
    const date = new Date(todayUTC)
    date.setUTCDate(todayUTC.getUTCDate() - i)
    const ds     = date.toISOString().slice(0, 10)
    const units  = dailyUnits[ds]  || 0
    const throws = dailyThrows[ds] || 0

    ewmaA = λA * units + (1 - λA) * ewmaA
    ewmaC = λC * units + (1 - λC) * ewmaC

    const rank = dailyIntRank[ds] || 0
    const dominantIntensity = rank === 4 ? 'max' : rank === 3 ? 'high' : rank === 2 ? 'medium' : rank === 1 ? 'low' : null
    all.push({
      date: ds,
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      throws,
      units: Math.round(units * 10) / 10,
      dominantIntensity,
      // Only show ACWR once chronic has enough signal (>1 wu/day avg)
      acwr: ewmaC > 1 ? Math.round((ewmaA / ewmaC) * 100) / 100 : null,
    })
  }
  return all.slice(-56)
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const throws = payload.find(p => p.dataKey === 'throws')?.value
  const acwr   = payload.find(p => p.dataKey === 'acwr')?.value
  const units  = payload[0]?.payload?.units
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {throws != null && throws > 0 && (
        <p className="text-muted-foreground">
          Throws: <span className="font-semibold text-foreground">{throws}</span>
          {units != null && units > 0 && (
            <span className="ml-1 opacity-60">· {units} wu</span>
          )}
        </p>
      )}
      {acwr != null && (
        <p className="text-muted-foreground">
          ACWR:{' '}
          <span className={`font-semibold ${acwr > 1.3 ? 'text-destructive' : acwr < 0.8 ? 'text-yellow-500' : 'text-primary'}`}>
            {acwr.toFixed(2)}
          </span>
        </p>
      )}
    </div>
  )
}

function WorkloadChart({ throwingLoad, sessions }) {
  const data = buildChartData(throwingLoad, sessions)
  if (!data.some(d => d.throws > 0)) {
    return <p className="text-sm text-muted-foreground">No throwing data in the last 8 weeks.</p>
  }
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Last 8 weeks — bars = daily throws (left axis), line = ACWR (right axis)</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {[['low','#22c55e'],['med','#d4a843'],['high','#f97316'],['max','#e05530']].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: color }} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 ml-2">
            <span className="inline-block h-px w-5" style={{ background: '#d4a843' }} />
            ACWR
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 8, right: 48, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#8ea0bc' }}
            tickLine={false}
            axisLine={false}
            interval={6}
          />
          <YAxis
            yAxisId="throws"
            orientation="left"
            tick={{ fontSize: 10, fill: '#8ea0bc' }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <YAxis
            yAxisId="acwr"
            orientation="right"
            domain={[0, 2]}
            ticks={[0, 0.8, 1.3, 2]}
            tick={{ fontSize: 10, fill: '#8ea0bc' }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine
            yAxisId="acwr" y={1.3}
            stroke="#e05530" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: '1.3', position: 'insideRight', fontSize: 9, fill: '#e05530', dx: 6 }}
          />
          <ReferenceLine
            yAxisId="acwr" y={0.8}
            stroke="#d4a843" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: '0.8', position: 'insideRight', fontSize: 9, fill: '#d4a843', dx: 6 }}
          />
          <Bar yAxisId="throws" dataKey="throws" radius={[2, 2, 0, 0]} maxBarSize={16}>
            {data.map((d, i) => (
              <Cell key={i} fill={INTENSITY_COLOR[d.dominantIntensity] ?? '#4a6ccc'} />
            ))}
          </Bar>
          <Line
            yAxisId="acwr"
            dataKey="acwr"
            type="monotone"
            stroke="#d4a843"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#d4a843' }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-0.5 text-[10px] text-muted-foreground">
        <span style={{ color: '#e05530' }}>— — spike (&gt;1.3)</span>
        <span style={{ color: '#d4a843' }}>— — undercooked (&lt;0.8)</span>
        <span className="ml-auto opacity-60">EWMA ACWR · throws weighted by type &amp; intensity</span>
      </div>
    </div>
  )
}

// ── Performance chart (velocity + score over time) ────────────────────────────

function PerformanceChart({ sessions }) {
  const data = sessions
    .filter(s => s.fbVelocity != null || s.score != null)
    .map(s => ({
      label: new Date(s.startedAt ?? s.createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric',
      }),
      velo:  s.fbVelocity != null ? Number(s.fbVelocity) : null,
      score: s.score != null ? Number(s.score) : null,
    }))
    .reverse()

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">No bullpen session data yet.</p>
  }

  const fbVelos = data.map(d => d.velo).filter(Boolean)
  const veloMin = fbVelos.length ? Math.floor(Math.min(...fbVelos) - 2) : 80
  const veloMax = fbVelos.length ? Math.ceil(Math.max(...fbVelos) + 2) : 100

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Per bullpen session — FB velocity (left) and location score (right)</p>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-px w-5 rounded" style={{ background: '#4a9eff' }} />
            FB Velo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-px w-5 rounded" style={{ background: '#a78bfa' }} />
            Score
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 8, right: 48, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#8ea0bc' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="velo"
            orientation="left"
            domain={[veloMin, veloMax]}
            tick={{ fontSize: 10, fill: '#8ea0bc' }}
            tickLine={false}
            axisLine={false}
            width={32}
            unit=" mph"
            tickFormatter={v => v}
          />
          <YAxis
            yAxisId="score"
            orientation="right"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 10, fill: '#8ea0bc' }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(220 13% 12%)',
              border: '1px solid hsl(220 13% 22%)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#8ea0bc', marginBottom: 4 }}
            formatter={(value, name) =>
              name === 'velo'
                ? [`${Number(value).toFixed(1)} mph`, 'FB Velo']
                : [`${Number(value).toFixed(1)}`, 'Score']
            }
          />
          <Line
            yAxisId="velo"
            dataKey="velo"
            type="monotone"
            stroke="#4a9eff"
            strokeWidth={2}
            dot={{ r: 3, fill: '#4a9eff', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          <Line
            yAxisId="score"
            dataKey="score"
            type="monotone"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function ArmStat({ label, value, sub, accent }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ?? 'text-foreground'}`}>{value}</p>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  )
}
