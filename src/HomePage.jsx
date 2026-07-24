import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Header } from './components/Header'
import { FloatingEquipment } from './components/FloatingEquipment'
import CoachDashboard from './CoachDashboard'
import { roleKey } from './OnboardingPage'
import { PENDING_INVITE_KEY } from './InvitePage'
import './App.css'

const BASE_URL = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'

const POSITION_LABELS = {
  pitcher: 'P', catcher: 'C', first_base: '1B', second_base: '2B',
  third_base: '3B', shortstop: 'SS', left_field: 'LF', center_field: 'CF',
  right_field: 'RF', designated_hitter: 'DH',
}

function scoreColorClass(score) {
  if (score == null) return 'text-muted-foreground'
  if (score >= 70) return 'text-primary'
  if (score >= 50) return 'text-yellow-500'
  return 'text-destructive'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function heightDisplay(cm) {
  const feet = Math.floor(cm / 30.48)
  const inches = Math.round((cm % 30.48) / 2.54)
  return `${feet}'${inches}"`
}

function sorenessColor(v) {
  if (v == null) return 'text-muted-foreground'
  if (v <= 3) return 'text-primary'
  if (v <= 6) return 'text-yellow-500'
  return 'text-destructive'
}

function readinessColor(v) {
  if (v == null) return 'text-muted-foreground'
  if (v >= 7) return 'text-primary'
  if (v >= 4) return 'text-yellow-500'
  return 'text-destructive'
}

function CheckInBar({ value, reversed = false }) {
  const pct = ((value - 1) / 9) * 100
  const color = reversed ? sorenessColor(value) : readinessColor(value)
  const barColor = color === 'text-primary' ? 'bg-primary' : color === 'text-yellow-500' ? 'bg-yellow-500' : 'bg-destructive'
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Red/yellow/green decision from the arm-status endpoint (Pitch Smart + ACWR).
const ALERT_LEVELS = {
  red:    { label: 'Rest',    banner: 'border-destructive/40 bg-destructive/10', badge: 'bg-destructive/15 text-destructive' },
  yellow: { label: 'Caution', banner: 'border-yellow-500/40 bg-yellow-500/10',   badge: 'bg-yellow-500/15 text-yellow-500' },
  green:  { label: 'Go',      banner: 'border-primary/40 bg-primary/10',         badge: 'bg-primary/15 text-primary' },
  gray:   { label: 'No data', banner: 'border-border bg-muted/30',               badge: 'bg-muted text-muted-foreground' },
}

function ArmStatusCard({ getToken, profileId, refreshKey }) {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchStatus() {
      try {
        const token = await getToken()
        const res = await fetch(`${BASE_URL}/players/${profileId}/arm-status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok && !cancelled) setStatus(await res.json())
      } catch {
        // non-critical card — stay hidden on error
      }
    }
    fetchStatus()
    return () => { cancelled = true }
  }, [getToken, profileId, refreshKey])

  if (!status?.alert) return null

  const level = ALERT_LEVELS[status.alert.level] ?? ALERT_LEVELS.gray
  const ps = status.pitchSmart

  return (
    <section className={`rounded-xl border p-6 ${level.banner}`}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Today's Arm Status</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${level.badge}`}>
          {level.label}
        </span>
      </div>
      <p className="text-sm font-medium">{status.alert.recommendation}</p>
      {status.alert.reasons.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {status.alert.reasons.map(reason => (
            <li key={reason}>• {reason}</li>
          ))}
        </ul>
      )}
      {ps?.ageBracket && (
        <p className="mt-2 text-xs text-muted-foreground">
          Pitch Smart {ps.ageBracket} · daily max {ps.dailyMaxPitches} pitches
          {ps.pitchesAvailableToday != null && ` · ${ps.pitchesAvailableToday} available today`}
        </p>
      )}
    </section>
  )
}

function CheckInCard({ getToken, onSaved }) {
  const [checkin, setCheckin] = useState(null)       // today's saved check-in
  const [loadingCheckin, setLoadingCheckin] = useState(true)
  const [editing, setEditing] = useState(false)
  const [soreness, setSoreness] = useState(3)
  const [readiness, setReadiness] = useState(8)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    async function fetchToday() {
      try {
        const token = await getToken()
        const res = await fetch(`${BASE_URL}/players/me/checkin/today`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setCheckin(data)
          setSoreness(data.soreness)
          setReadiness(data.readiness)
          setNotes(data.notes ?? '')
        }
        // 404 = no check-in yet, leave checkin null
      } finally {
        setLoadingCheckin(false)
      }
    }
    fetchToday()
  }, [getToken])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/players/me/checkin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ soreness, readiness, notes: notes.trim() || undefined }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save')
      }
      const data = await res.json()
      setCheckin(data)
      setEditing(false)
      if (onSaved) onSaved(data)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loadingCheckin) return null

  const showForm = !checkin || editing

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Daily Check-in</h2>
        {checkin && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Edit
          </button>
        )}
        {checkin && editing && (
          <button
            onClick={() => { setEditing(false); setSoreness(checkin.soreness); setReadiness(checkin.readiness); setNotes(checkin.notes ?? '') }}
            className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Saved state — summary view */}
      {!showForm && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm text-muted-foreground">Readiness</span>
            <CheckInBar value={checkin.readiness} />
            <span className={`w-10 text-right text-sm font-bold tabular-nums ${readinessColor(checkin.readiness)}`}>
              {checkin.readiness}/10
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm text-muted-foreground">Soreness</span>
            <CheckInBar value={checkin.soreness} reversed />
            <span className={`w-10 text-right text-sm font-bold tabular-nums ${sorenessColor(checkin.soreness)}`}>
              {checkin.soreness}/10
            </span>
          </div>
          {checkin.notes && (
            <p className="mt-1 text-sm text-muted-foreground italic">"{checkin.notes}"</p>
          )}
        </div>
      )}

      {/* Form — first check-in or editing */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {!checkin && (
            <p className="text-sm text-muted-foreground">How's your arm feeling today?</p>
          )}

          {/* Soreness slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium">Soreness</label>
              <span className={`text-sm font-bold tabular-nums ${sorenessColor(soreness)}`}>{soreness}/10</span>
            </div>
            <input
              type="range" min="1" max="10" step="1"
              value={soreness}
              onChange={e => setSoreness(Number(e.target.value))}
              className="w-full cursor-pointer accent-primary"
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
              <span>none</span><span>severe</span>
            </div>
          </div>

          {/* Readiness slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium">Readiness</label>
              <span className={`text-sm font-bold tabular-nums ${readinessColor(readiness)}`}>{readiness}/10</span>
            </div>
            <input
              type="range" min="1" max="10" step="1"
              value={readiness}
              onChange={e => setReadiness(Number(e.target.value))}
              className="w-full cursor-pointer accent-primary"
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
              <span>not ready</span><span>ready to go</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Notes <span className="font-normal text-muted-foreground">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything unusual? Tightness, fatigue, soreness location…"
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : checkin ? 'Update Check-in' : 'Log Check-in'}
          </button>
        </form>
      )}
    </section>
  )
}

export default function HomePage() {
  const { getToken } = useAuth()
  const { isSignedIn, isLoaded, user } = useUser()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [checkinVersion, setCheckinVersion] = useState(0)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { navigate('/sign-in'); return }

    async function fetchData() {
      try {
        const token = await getToken()
        const headers = { Authorization: `Bearer ${token}` }

        const profileRes = await fetch(`${BASE_URL}/players/me`, { headers })
        if (profileRes.status === 403) {
          // Not in users table yet — brand new user
          navigate('/onboarding')
          return
        }
        if (profileRes.status === 404) {
          let savedRole = user ? localStorage.getItem(roleKey(user.id)) : null
          if (!savedRole) {
            const meRes = await fetch(`${BASE_URL}/me`, { headers })
            if (meRes.ok) {
              const meData = await meRes.json()
              if (meData.role) {
                savedRole = meData.role
                if (user) localStorage.setItem(roleKey(user.id), meData.role)
              }
            }
          }
          if (!savedRole) { navigate('/onboarding'); return }
          setUserRole(savedRole)
          setLoading(false)
          return
        }
        if (!profileRes.ok) throw new Error(`HTTP ${profileRes.status}`)
        const playerData = await profileRes.json()
        setProfile(playerData)

        // Auto-accept a pending team invite (set when clicking an invite link before signing in)
        const pendingInvite = localStorage.getItem(PENDING_INVITE_KEY)
        if (pendingInvite) {
          localStorage.removeItem(PENDING_INVITE_KEY)
          navigate(`/invite/${pendingInvite}`)
          return
        }

        const sessionsRes = await fetch(
          `${BASE_URL}/players/${playerData.id}/bullpen-sessions`,
          { headers }
        )
        if (!sessionsRes.ok) throw new Error(`HTTP ${sessionsRes.status}`)
        const sessionsData = await sessionsRes.json()
        setSessions([...sessionsData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isLoaded, isSignedIn, getToken, navigate, user])

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        {loading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">{error}</p>}

        {!loading && !error && !profile && userRole === 'coach' && <CoachDashboard />}

        {!loading && !error && !profile && userRole === 'player' && (
          <div className="py-20 text-center">
            <p className="mb-2 text-lg font-semibold">Complete your profile</p>
            <p className="mb-5 text-sm text-muted-foreground">Set up your player profile to start tracking sessions.</p>
            <button
              onClick={() => navigate('/onboarding')}
              className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Set Up Profile →
            </button>
          </div>
        )}

        {!loading && !error && profile && (
          <div className="space-y-10">
            {/* Profile card */}
            <section className="flex items-start gap-5 rounded-xl border border-border bg-card p-6">
              {profile.profilePhotoUrl ? (
                <img
                  src={profile.profilePhotoUrl}
                  alt={profile.name}
                  className="h-20 w-20 shrink-0 rounded-full border-2 border-border object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary">
                  {profile.name?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold">{profile.name}</h1>
                  <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    Player
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    profile.status === 'active'   ? 'bg-primary/15 text-primary' :
                    profile.status === 'injured'  ? 'bg-destructive/15 text-destructive' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {profile.status}
                  </span>
                </div>

                {profile.positions?.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {profile.positions.map(pos => (
                      <span
                        key={pos}
                        className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground"
                      >
                        {POSITION_LABELS[pos] ?? pos}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  {profile.handedness && (
                    <span className="capitalize">{profile.handedness}-handed</span>
                  )}
                  {profile.yearsExperience != null && (
                    <span>{profile.yearsExperience} yr{profile.yearsExperience !== 1 ? 's' : ''} exp</span>
                  )}
                  {profile.heightCm != null && <span>{heightDisplay(profile.heightCm)}</span>}
                  {profile.weightKg != null && <span>{Math.round(profile.weightKg * 2.205)} lbs</span>}
                  {profile.homeCity && <span>{profile.homeCity}</span>}
                </div>
              </div>
            </section>

            <ArmStatusCard getToken={getToken} profileId={profile.id} refreshKey={checkinVersion} />

            <CheckInCard getToken={getToken} onSaved={() => setCheckinVersion(v => v + 1)} />

            {/* Best bullpens */}
            <section>
              <h2 className="mb-4 text-lg font-semibold">Recent Bullpens</h2>

              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => navigate(`/bullpen/${session.id}`)}
                      className="group cursor-pointer rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-md"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-muted-foreground">
                              {formatDate(session.startedAt ?? session.createdAt)}
                            </p>
                            {session.unreadFeedbackCount > 0 && (
                              <span
                                title={`${session.unreadFeedbackCount} new coach feedback`}
                                className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary"
                              />
                            )}
                          </div>
                          {session.pitchCount != null && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {session.pitchCount} pitch{session.pitchCount !== 1 ? 'es' : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Location Score
                          </span>
                          <span className={`text-2xl font-bold tabular-nums ${scoreColorClass(session.score)}`}>
                            {session.score != null ? session.score.toFixed(1) : '—'}
                          </span>
                        </div>
                      </div>

                      {session.notes && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">{session.notes}</p>
                      )}

                      <p className="mt-3 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        View details →
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
