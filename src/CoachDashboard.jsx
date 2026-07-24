import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

const BASE_URL = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'

const POSITION_LABELS = {
  pitcher: 'P', catcher: 'C', first_base: '1B', second_base: '2B',
  third_base: '3B', shortstop: 'SS', left_field: 'LF', center_field: 'CF',
  right_field: 'RF', designated_hitter: 'DH',
}

// Red/yellow/green decision from the workload endpoint's Pitch Smart + ACWR engine.
const ALERT_LEVELS = {
  red:    { label: 'Red',     badge: 'bg-destructive/15 text-destructive',  border: 'border-destructive/40' },
  yellow: { label: 'Caution', badge: 'bg-yellow-500/15 text-yellow-500',    border: 'border-yellow-500/40' },
  green:  { label: 'Good',    badge: 'bg-primary/15 text-primary',          border: 'border-primary/40' },
  gray:   { label: 'No data', badge: 'bg-muted text-muted-foreground',      border: 'border-border' },
}

// Fallback for responses from a backend that predates the alert field.
function alertOf(arm) {
  if (arm.alert) return arm.alert
  const level = arm.status === 'spike' ? 'red' : arm.status === 'undercooked' ? 'yellow'
    : arm.status === 'green' ? 'green' : 'gray'
  return { level, reasons: [], recommendation: null }
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  })
}

function ResendInviteButton({ inviteId }) {
  const { getToken } = useAuth()
  const [state, setState] = useState('idle') // 'idle' | 'sending' | 'sent' | 'error'

  async function handleResend() {
    if (state === 'sending' || state === 'sent') return
    setState('sending')
    try {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/teams/invite/${inviteId}/resend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setState(res.ok ? 'sent' : 'error')
      if (res.ok) setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
    }
  }

  return (
    <button
      onClick={handleResend}
      disabled={state === 'sending' || state === 'sent'}
      className={`shrink-0 cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-default ${
        state === 'sent'
          ? 'border-primary/30 text-primary'
          : state === 'error'
          ? 'border-destructive/30 text-destructive'
          : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
      }`}
    >
      {state === 'sending' ? '…' : state === 'sent' ? 'Sent!' : state === 'error' ? 'Failed' : 'Resend'}
    </button>
  )
}

function InviteForm({ teamId, onInvited }) {
  const { getToken } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | { error }
  const nameRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setStatus('sending')
    try {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/teams/${teamId}/players`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus({ error: data.error ?? `HTTP ${res.status}` })
        return
      }
      onInvited(data)
      setName('')
      setEmail('')
      setStatus('sent')
      setTimeout(() => setStatus(null), 3000)
      nameRef.current?.focus()
    } catch {
      setStatus({ error: 'Something went wrong. Please try again.' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Jane Smith"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="jane@example.com"
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={!name.trim() || !email.trim() || status === 'sending'}
        className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending…' : 'Send Invite'}
      </button>
      {status === 'sent' && (
        <p className="text-sm text-primary">Invite sent!</p>
      )}
      {status?.error && (
        <p className="text-sm text-destructive">{status.error}</p>
      )}
    </form>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${accent ?? 'text-foreground'}`}>{value}</p>
    </div>
  )
}

export default function CoachDashboard() {
  const { getToken } = useAuth()
  const navigate = useNavigate()

  const [teams, setTeams] = useState(null)
  const [teamId, setTeamId] = useState(null)
  const [roster, setRoster] = useState([])
  const [workload, setWorkload] = useState([])
  const [requests, setRequests] = useState([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reviewingId, setReviewingId] = useState(null)

  // Load roster, workload, and pending requests for one team
  const fetchTeamData = useCallback(async (id) => {
    setTeamLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }

      const [rosterRes, workloadRes, requestsRes] = await Promise.all([
        fetch(`${BASE_URL}/teams/${id}/players`, { headers }),
        fetch(`${BASE_URL}/teams/${id}/workload`, { headers }),
        fetch(`${BASE_URL}/teams/${id}/requests?status=pending`, { headers }),
      ])
      if (!rosterRes.ok) throw new Error(`HTTP ${rosterRes.status}`)
      if (!workloadRes.ok) throw new Error(`HTTP ${workloadRes.status}`)
      if (!requestsRes.ok) throw new Error(`HTTP ${requestsRes.status}`)

      setRoster(await rosterRes.json())
      setWorkload(await workloadRes.json())
      setRequests(await requestsRes.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setTeamLoading(false)
    }
  }, [getToken])

  const selectTeam = useCallback((id) => {
    setTeamId(id)
    fetchTeamData(id)
  }, [fetchTeamData])

  // Load the coach's teams once, then load the first team's data
  useEffect(() => {
    async function fetchTeams() {
      try {
        const token = await getToken()
        const headers = { Authorization: `Bearer ${token}` }

        const meRes = await fetch(`${BASE_URL}/me`, { headers })
        if (!meRes.ok) throw new Error(`HTTP ${meRes.status}`)
        const me = await meRes.json()

        const teamsRes = await fetch(`${BASE_URL}/coaches/${me.id}/teams`, { headers })
        if (!teamsRes.ok) throw new Error(`HTTP ${teamsRes.status}`)
        const memberships = await teamsRes.json()

        setTeams(memberships.map(m => m.team))
        if (memberships.length > 0) selectTeam(memberships[0].team.id)
      } catch (err) {
        setError(err.message)
        setTeams([])
      }
    }
    fetchTeams()
  }, [getToken, selectTeam])

  async function reviewRequest(requestId, status) {
    setReviewingId(requestId)
    try {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/teams/${teamId}/requests/${requestId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setRequests(prev => prev.filter(r => r.id !== requestId))
      if (status === 'accepted') fetchTeamData(teamId)
    } catch (err) {
      setError(err.message)
    } finally {
      setReviewingId(null)
    }
  }

  if (teams === null) {
    return <p className="text-muted-foreground">Loading…</p>
  }

  if (teams.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="mb-2 text-lg font-semibold">Coach Dashboard</p>
        <p className="text-sm text-muted-foreground">
          {error ?? "You're not on a team yet. Join or create a team to see your roster here."}
        </p>
      </div>
    )
  }

  const selectedTeam = teams.find(t => t.id === teamId)
  const activeRoster = roster.filter(p => !p.isPending)
  const redArms = workload.filter(w => alertOf(w).level === 'red')
  const cautionArms = workload.filter(w => alertOf(w).level === 'yellow')
  const soreArms = workload.filter(w => w.soreness != null && w.soreness >= 4)

  return (
    <div className="space-y-10">
      {/* Team header */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{selectedTeam?.name}</h1>
            <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Coach
            </span>
          </div>
          {selectedTeam?.level && (
            <p className="text-sm capitalize text-muted-foreground">{selectedTeam.level}</p>
          )}
        </div>

        {teams.length > 1 && (
          <select
            value={teamId ?? ''}
            onChange={e => selectTeam(e.target.value)}
            className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </section>

      {error && <p className="text-destructive">{error}</p>}

      {/* Summary stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Roster" value={activeRoster.length} />
        <StatCard
          label="Arms at Risk"
          value={redArms.length}
          accent={redArms.length > 0 ? 'text-destructive' : 'text-primary'}
        />
        <StatCard
          label="Sore Arms"
          value={soreArms.length}
          accent={soreArms.length > 0 ? 'text-yellow-500' : 'text-primary'}
        />
        <StatCard
          label="Pending Requests"
          value={requests.length}
          accent={requests.length > 0 ? 'text-yellow-500' : undefined}
        />
      </section>

      {/* Arm watch — riskiest first, straight from the workload endpoint */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Arm Watch</h2>

        {teamLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : workload.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pitchers on this team yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Pitcher</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">ACWR</th>
                  <th className="px-4 py-3 text-right font-medium">Throws (7d)</th>
                  <th className="px-4 py-3 text-right font-medium">Days Rest</th>
                  <th className="px-4 py-3 text-right font-medium">Avail. Today</th>
                  <th className="px-4 py-3 text-right font-medium">Readiness</th>
                  <th className="px-4 py-3 text-right font-medium">Soreness</th>
                </tr>
              </thead>
              <tbody>
                {workload.map(arm => {
                  const level = ALERT_LEVELS[alertOf(arm).level]
                  const today = new Date().toISOString().slice(0, 10)
                  const checkinDate = arm.readinessCheckDate ? String(arm.readinessCheckDate).slice(0, 10) : null
                  const checkinStale = checkinDate !== today
                  return (
                    <tr
                      key={arm.playerId}
                      onClick={() => navigate(`/coach/player/${arm.playerId}?teamId=${teamId}`)}
                      className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        {arm.jerseyNumber != null && (
                          <span className="mr-2 font-mono text-xs text-muted-foreground">#{arm.jerseyNumber}</span>
                        )}
                        {arm.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${level.badge}`}>
                          {level.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {arm.acwr != null ? arm.acwr.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{arm.throwsLast7d}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {arm.daysRest != null ? arm.daysRest : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {arm.pitchSmart?.pitchesAvailableToday != null ? (
                          <>
                            {arm.pitchSmart.pitchesAvailableToday}
                            <span className="text-xs text-muted-foreground"> / {arm.pitchSmart.dailyMaxPitches}</span>
                          </>
                        ) : '—'}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums ${checkinStale && arm.readiness != null ? 'text-muted-foreground' : ''}`}>
                        {arm.readiness != null ? (
                          <span title={checkinStale ? `Last check-in ${formatDate(checkinDate)}` : undefined}>
                            {arm.readiness}/10{checkinStale && ' ⚠️'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums ${
                        checkinStale ? 'text-muted-foreground' : arm.soreness != null && arm.soreness >= 4 ? 'font-semibold text-destructive' : ''
                      }`}>
                        {arm.soreness != null ? (
                          <span title={checkinStale ? `Last check-in ${formatDate(checkinDate)}` : undefined}>
                            {arm.soreness}/10{checkinStale && ' ⚠️'}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {!teamLoading && workload.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            ⚠️ Player hasn't checked in today — readiness/soreness shown is from their last check-in.
          </p>
        )}
      </section>

      {/* Pending join requests */}
      {requests.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Join Requests</h2>
          <div className="space-y-3">
            {requests.map(req => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <p className="text-sm font-medium">
                    {req.playerName ?? req.userEmail ?? 'Unknown'}
                    <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {req.role}
                    </span>
                    {req.jerseyNumber != null && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">#{req.jerseyNumber}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Requested {formatDate(req.requestedAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewRequest(req.id, 'accepted')}
                    disabled={reviewingId === req.id}
                    className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => reviewRequest(req.id, 'rejected')}
                    disabled={reviewingId === req.id}
                    className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Roster */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Roster</h2>

        {teamLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">No players on this team yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roster.map(player => (
              <div
                key={player.id}
                onClick={!player.isPending ? () => navigate(`/coach/player/${player.id}?teamId=${teamId}`) : undefined}
                className={`flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all ${
                  player.isPending
                    ? 'opacity-70'
                    : 'cursor-pointer hover:border-primary/50 hover:shadow-md'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-sm font-bold text-primary">
                  {player.jerseyNumber != null ? player.jerseyNumber : player.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{player.name}</p>
                  {player.isPending ? (
                    <>
                      <p className="truncate text-xs text-muted-foreground">{player.email}</p>
                      <p className="text-xs text-yellow-500">Invite pending</p>
                    </>
                  ) : player.positions.length > 0 ? (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {player.positions.map(pos => (
                        <span key={pos} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                          {POSITION_LABELS[pos] ?? pos}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {player.isPending && (
                  <ResendInviteButton inviteId={player.id} />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Invite player */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Invite Player</h2>
        <InviteForm teamId={teamId} onInvited={(player) => setRoster(prev => [...prev, player])} />
      </section>
    </div>
  )
}
