import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Header } from './components/Header'
import { FloatingEquipment } from './components/FloatingEquipment'
import './App.css'

const BASE_URL = 'https://backnine-production-eb29.up.railway.app'

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

export default function HomePage() {
  const { getToken } = useAuth()
  const { isSignedIn, isLoaded } = useUser()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
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
        if (profileRes.status === 404) { setLoading(false); return }
        if (!profileRes.ok) throw new Error(`HTTP ${profileRes.status}`)
        const playerData = await profileRes.json()
        setProfile(playerData)

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
  }, [isLoaded, isSignedIn, getToken, navigate])

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        {loading && <p className="text-muted-foreground">Loading…</p>}
        {error && <p className="text-destructive">{error}</p>}

        {!loading && !error && !profile && (
          <div className="py-20 text-center">
            <p className="mb-2 text-lg font-semibold">No player profile yet</p>
            <p className="text-sm text-muted-foreground">Set up your profile to get started.</p>
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
                          <p className="text-xs text-muted-foreground">
                            {formatDate(session.startedAt ?? session.createdAt)}
                          </p>
                          {session.pitchCount != null && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {session.pitchCount} pitch{session.pitchCount !== 1 ? 'es' : ''}
                            </p>
                          )}
                        </div>
                        <span className={`text-2xl font-bold tabular-nums ${scoreColorClass(session.score)}`}>
                          {session.score != null ? session.score.toFixed(1) : '—'}
                        </span>
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
