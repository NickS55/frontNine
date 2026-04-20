import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from './components/Header'
import { FloatingEquipment } from './components/FloatingEquipment'
import './App.css'

const BASE_URL = 'https://backnine-production-eb29.up.railway.app'

const PITCH_TYPE_LABELS = {
  four_seam: '4-Seam', two_seam: '2-Seam', sinker: 'Sinker', cutter: 'Cutter',
  curveball: 'Curveball', knuckle_curve: 'Knuckle Curve', sweeper: 'Sweeper',
  slider: 'Slider', slurve: 'Slurve', changeup: 'Changeup', splitter: 'Splitter',
  screwball: 'Screwball', forkball: 'Forkball', knuckleball: 'Knuckleball',
  eephus: 'Eephus', pitch_out: 'Pitch Out',
}

// ── Scoring (mirrors backNine/src/lib/bullpenScoring.ts) ──────────────────────
const SCALE       = 25.0
const FALLBACK_AR = 1.25
const MAX_DIST    = 13.0
const INNER_HALF_X = 8.5
const INNER_HALF_Y = 10.5
const COMP_HALF_X  = 11.5
const COMP_HALF_Y  = 14.2

function pitchAR(pitch) {
  return pitch.viewWidth > 0 ? pitch.viewHeight / pitch.viewWidth : FALLBACK_AR
}

function pitchBreakdown(pitch) {
  if (pitch.resultX == null || pitch.resultY == null) return null
  const ar = pitchAR(pitch)
  const dx = (pitch.resultX - pitch.targetX) * SCALE
  const dy = (pitch.resultY - pitch.targetY) * SCALE * ar
  const distIn = Math.sqrt(dx * dx + dy * dy)
  const commandPts = Math.max(0, 60 * (1 - distIn / MAX_DIST))
  const xIn = Math.abs((pitch.resultX - 0.5) * SCALE)
  const yIn = Math.abs((pitch.resultY - 0.5) * SCALE * ar)
  let zonePts = 0
  if (xIn <= INNER_HALF_X && yIn <= INNER_HALF_Y) zonePts = 40
  else if (xIn <= COMP_HALF_X && yIn <= COMP_HALF_Y) zonePts = 20
  return { commandPts, zonePts, distIn, total: commandPts + zonePts }
}

function scoreColorClass(score) {
  if (score == null) return 'text-muted-foreground'
  if (score >= 70) return 'text-primary'
  if (score >= 50) return 'text-yellow-500'
  return 'text-destructive'
}

// ── Strike zone SVG ───────────────────────────────────────────────────────────
// Geometry mirrors StrikeZoneView.swift / bullpenScoring.ts constants.
// Normalized coords (0–1, 0–1) map directly to ZONE_W × ZONE_H pixels.
const ZONE_W  = 300
const ZONE_H  = 370
const INNER_W = ZONE_W * 0.68                          // 204  (17" zone)
const INNER_H = INNER_W * 1.235                        // ≈252 (aspect ratio)
const INNER_X = (ZONE_W - INNER_W) / 2                // 48
const INNER_Y = (ZONE_H - INNER_H) / 2                // ≈59
const COMP_ADD_X = ZONE_W * 0.12                       // 36  (3 baseballs)
const COMP_ADD_Y = COMP_ADD_X * (COMP_HALF_Y / COMP_HALF_X)  // ≈44.4
const COMP_W  = INNER_W + COMP_ADD_X * 2
const COMP_H  = INNER_H + COMP_ADD_Y * 2
const COMP_X  = (ZONE_W - COMP_W) / 2
const COMP_Y  = (ZONE_H - COMP_H) / 2

function StrikeZone({ pitch }) {
  const tx = pitch.targetX != null ? pitch.targetX * ZONE_W : null
  const ty = pitch.targetY != null ? pitch.targetY * ZONE_H : null
  const rx = pitch.resultX != null ? pitch.resultX * ZONE_W : null
  const ry = pitch.resultY != null ? pitch.resultY * ZONE_H : null

  return (
    <svg
      viewBox={`0 0 ${ZONE_W} ${ZONE_H}`}
      style={{ width: '100%', maxWidth: 220, aspectRatio: `${ZONE_W}/${ZONE_H}` }}
      className="rounded-lg"
    >
      {/* NC background */}
      <rect x={0} y={0} width={ZONE_W} height={ZONE_H} fill="var(--muted)" rx={8} />
      {/* Competitive zone (slightly lighter) */}
      <rect x={COMP_X} y={COMP_Y} width={COMP_W} height={COMP_H} fill="var(--background)" rx={4} />
      {/* Inner strike zone */}
      <rect x={INNER_X} y={INNER_Y} width={INNER_W} height={INNER_H}
        fill="var(--card)" stroke="#f97316" strokeWidth={2} rx={4} />
      {/* Grid lines at thirds */}
      {[1, 2].map(n => (
        <g key={n}>
          <line
            x1={INNER_X + (INNER_W * n) / 3} y1={INNER_Y}
            x2={INNER_X + (INNER_W * n) / 3} y2={INNER_Y + INNER_H}
            stroke="#f97316" strokeWidth={1} opacity={0.2}
          />
          <line
            x1={INNER_X} y1={INNER_Y + (INNER_H * n) / 3}
            x2={INNER_X + INNER_W} y2={INNER_Y + (INNER_H * n) / 3}
            stroke="#f97316" strokeWidth={1} opacity={0.2}
          />
        </g>
      ))}
      {/* Target — brown crosshair scope */}
      {tx != null && (
        <g transform={`translate(${tx},${ty})`}>
          <circle r={9} fill="none" stroke="#92400e" strokeWidth={1.5} />
          <line x1={-13} x2={-4}  y1={0} y2={0} stroke="#92400e" strokeWidth={1.5} />
          <line x1={4}   x2={13}  y1={0} y2={0} stroke="#92400e" strokeWidth={1.5} />
          <line x1={0}   x2={0}   y1={-13} y2={-4} stroke="#92400e" strokeWidth={1.5} />
          <line x1={0}   x2={0}   y1={4}   y2={13} stroke="#92400e" strokeWidth={1.5} />
          <circle r={2} fill="#92400e" />
        </g>
      )}
      {/* Result — filled primary circle */}
      {rx != null && (
        <g transform={`translate(${rx},${ry})`}>
          <circle r={9} fill="var(--primary)" opacity={0.9} />
          <circle r={3.5} fill="var(--primary-foreground)" />
        </g>
      )}
    </svg>
  )
}

// ── Pitch detail (expanded below a timeline row) ──────────────────────────────
function PitchDetail({ pitch, getToken }) {
  const [videoUrl, setVideoUrl]     = useState(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState(null)

  const breakdown = pitchBreakdown(pitch)

  useEffect(() => {
    if (!pitch.s3Key) return
    setVideoLoading(true)
    setVideoUrl(null)
    setVideoError(null)

    async function fetchVideo() {
      try {
        const token = await getToken()
        const encoded = encodeURIComponent(pitch.s3Key)
        const res = await fetch(`${BASE_URL}/bullpen/videos/view?s3Key=${encoded}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setVideoUrl(data.viewUrl)
      } catch (err) {
        setVideoError(err.message)
      } finally {
        setVideoLoading(false)
      }
    }

    fetchVideo()
  }, [pitch.id, pitch.s3Key, getToken])

  return (
    <div className="rounded-b-xl border border-t-0 border-border bg-card px-5 pb-5 pt-4">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">

        {/* Strike zone */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Strike Zone
          </p>
          <StrikeZone pitch={pitch} />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-amber-800" />
              Target
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
              Result
            </span>
          </div>
        </div>

        {/* Right column: video + stats */}
        <div className="flex-1 space-y-5 min-w-0">

          {/* Video */}
          {pitch.s3Key ? (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Video
              </p>
              {videoLoading && (
                <div className="flex h-36 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                  Loading…
                </div>
              )}
              {videoError && (
                <div className="flex h-36 items-center justify-center rounded-lg bg-muted text-sm text-destructive">
                  {videoError}
                </div>
              )}
              {videoUrl && (
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="w-full rounded-lg bg-black"
                  style={{ maxHeight: 260 }}
                />
              )}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              No video recorded
            </div>
          )}

          {/* Stats */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Details
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Type</dt>
                <dd className="font-medium">{PITCH_TYPE_LABELS[pitch.pitchType] ?? pitch.pitchType}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Velocity</dt>
                <dd className="font-medium">
                  {pitch.velocityMph != null ? `${pitch.velocityMph} mph` : '—'}
                </dd>
              </div>
              {breakdown != null && (
                <>
                  <div>
                    <dt className="text-xs text-muted-foreground">Command</dt>
                    <dd className="font-medium">{breakdown.commandPts.toFixed(1)} / 60</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Zone</dt>
                    <dd className="font-medium">{breakdown.zonePts} / 40</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Miss Distance</dt>
                    <dd className="font-medium">{breakdown.distIn.toFixed(1)}"</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Time</dt>
                <dd className="font-medium text-muted-foreground">
                  {pitch.pitchedAt
                    ? new Date(pitch.pitchedAt).toLocaleTimeString(undefined, {
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
function formatLongDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function BullpenSessionPage() {
  const { sessionId } = useParams()
  const { getToken } = useAuth()
  const { isSignedIn, isLoaded } = useUser()
  const navigate = useNavigate()

  const [session, setSession]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { navigate('/sign-in'); return }

    async function fetchSession() {
      try {
        const token = await getToken()
        const res = await fetch(`${BASE_URL}/bullpen-sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setSession(await res.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [isLoaded, isSignedIn, getToken, navigate, sessionId])

  const pitches = [...(session?.pitches ?? [])].sort((a, b) => a.pitchNumber - b.pitchNumber)

  function toggle(id) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <button
          onClick={() => navigate('/home')}
          className="mb-6 flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </button>

        {loading && <p className="text-muted-foreground">Loading…</p>}
        {error   && <p className="text-destructive">{error}</p>}

        {!loading && !error && session && (
          <div className="space-y-8">

            {/* Session header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="mb-1 text-2xl font-bold">Bullpen Session</h1>
                <p className="text-sm text-muted-foreground">
                  {formatLongDate(session.startedAt ?? session.createdAt)}
                </p>
                {session.notes && (
                  <p className="mt-2 max-w-lg text-sm text-muted-foreground">{session.notes}</p>
                )}
              </div>
              <div className="text-right">
                <p className="mb-0.5 text-xs text-muted-foreground">Session Score</p>
                <p className={`text-4xl font-bold tabular-nums ${scoreColorClass(session.score)}`}>
                  {session.score != null ? session.score.toFixed(1) : '—'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">out of 100</p>
              </div>
            </div>

            {/* Timeline */}
            {pitches.length > 0 && (
              <section>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {pitches.length} Pitch{pitches.length !== 1 ? 'es' : ''}
                </p>

                <div className="relative">
                  {/* Vertical connector line aligned to dot centers */}
                  <div
                    className="absolute top-5 bottom-5 w-px bg-border"
                    style={{ left: 19 }}
                    aria-hidden
                  />

                  <div className="space-y-2">
                    {pitches.map(pitch => {
                      const bd = pitchBreakdown(pitch)
                      const score = bd?.total ?? null
                      const isOpen = expandedId === pitch.id

                      return (
                        <div key={pitch.id} className="relative">
                          {/* Timeline node */}
                          <div
                            className={`absolute top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                              isOpen
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-card text-muted-foreground'
                            }`}
                            style={{ left: 0 }}
                          >
                            {pitch.pitchNumber}
                          </div>

                          {/* Row button */}
                          <button
                            onClick={() => toggle(pitch.id)}
                            className={`ml-12 flex w-[calc(100%-3rem)] cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-all border ${
                              isOpen
                                ? 'rounded-t-xl border-primary/40 bg-card border-b-0'
                                : 'rounded-xl border-border bg-card hover:border-primary/30'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {PITCH_TYPE_LABELS[pitch.pitchType] ?? pitch.pitchType}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {pitch.velocityMph != null ? `${pitch.velocityMph} mph` : 'No velocity'}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                              <div className="text-right">
                                <span className={`text-lg font-bold tabular-nums leading-none ${scoreColorClass(score)}`}>
                                  {score != null ? score.toFixed(1) : '—'}
                                </span>
                                <p className="text-[10px] text-muted-foreground">pts</p>
                              </div>
                              <span
                                className="text-muted-foreground transition-transform duration-200"
                                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}
                              >
                                ↓
                              </span>
                            </div>
                          </button>

                          {/* Expanded detail */}
                          {isOpen && (
                            <div className="ml-12">
                              <PitchDetail pitch={pitch} getToken={getToken} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
