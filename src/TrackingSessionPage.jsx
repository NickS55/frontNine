import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from './components/Header'
import { FloatingEquipment } from './components/FloatingEquipment'

const BASE_URL = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'

// ── Pitch type colors (TrackMan full names) ───────────────────────────────────

const PITCH_COLORS = {
  'Four-Seam':     '#D93025',
  'Fastball':      '#D93025',
  'Sinker':        '#1A9BB5',
  'Two-Seam':      '#1A9BB5',
  'Cutter':        '#E8620A',
  'Slider':        '#E8930A',
  'Sweeper':       '#5E9E1A',
  'Curveball':     '#1A4FD6',
  'Knuckle Curve': '#1A4FD6',
  'Changeup':      '#C8A800',
  'Splitter':      '#7B3BB5',
  'Other':         '#888888',
  'Undefined':     '#aaaaaa',
}

function pitchColor(type) {
  return PITCH_COLORS[type] ?? '#888888'
}

// ── Plate location chart ──────────────────────────────────────────────────────
// Catcher's perspective: positive side = catcher's right
// Strike zone: width = 17" = 1.417 ft, height varies by batter

const PL_W = 260
const PL_H = 300
const PL_SCALE = 52     // px per foot
const PL_CX = PL_W / 2  // 130 — center of plate
const PL_BASE = PL_H - 20  // ground y

// Convert plate_loc coords to SVG
function plToSvg(side, height) {
  return {
    x: PL_CX + side * PL_SCALE,
    y: PL_BASE - height * PL_SCALE,
  }
}

// Strike zone constants (feet)
const SZ_HALF_W  = 0.708  // plate half-width (17"/2) + ball radius
const SZ_BOT     = 1.5
const SZ_TOP     = 3.5

function PlateChart({ pitches, activePitch, onHover }) {
  const szLeft  = PL_CX - SZ_HALF_W * PL_SCALE
  const szRight = PL_CX + SZ_HALF_W * PL_SCALE
  const szTop   = PL_BASE - SZ_TOP * PL_SCALE
  const szBot   = PL_BASE - SZ_BOT * PL_SCALE
  const szW     = szRight - szLeft
  const szH     = szBot - szTop

  // Nine-zone grid lines
  const vThird  = szW / 3
  const hThird  = szH / 3

  return (
    <svg viewBox={`0 0 ${PL_W} ${PL_H}`} width="100%" style={{ display: 'block' }}>
      {/* Background */}
      <rect width={PL_W} height={PL_H} fill="hsl(220 13% 9%)" rx="8" />

      {/* Shadow zone (loose ball area outside zone) */}
      <rect
        x={szLeft - 8} y={szTop - 8}
        width={szW + 16} height={szH + 16}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1}
        rx="2"
      />

      {/* Strike zone */}
      <rect
        x={szLeft} y={szTop}
        width={szW} height={szH}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={1.5}
      />

      {/* Nine-zone grid */}
      <line x1={szLeft + vThird}  y1={szTop} x2={szLeft + vThird}  y2={szBot}
        stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
      <line x1={szLeft + vThird*2} y1={szTop} x2={szLeft + vThird*2} y2={szBot}
        stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
      <line x1={szLeft} y1={szTop + hThird}  x2={szRight} y2={szTop + hThird}
        stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
      <line x1={szLeft} y1={szTop + hThird*2} x2={szRight} y2={szTop + hThird*2}
        stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />

      {/* Home plate shape */}
      <polygon
        points={`${PL_CX - 21},${PL_BASE} ${PL_CX + 21},${PL_BASE} ${PL_CX + 21},${PL_BASE + 10} ${PL_CX},${PL_BASE + 16} ${PL_CX - 21},${PL_BASE + 10}`}
        fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth={1}
      />

      {/* Height labels */}
      <text x={4} y={szTop + 4}  fontSize={7.5} fill="rgba(255,255,255,0.3)" dominantBaseline="hanging">3.5'</text>
      <text x={4} y={szBot - 2}  fontSize={7.5} fill="rgba(255,255,255,0.3)">1.5'</text>

      {/* Pitch dots */}
      {pitches.map((p, i) => {
        if (p.plateLocHeight == null || p.plateLocSide == null) return null
        const { x, y } = plToSvg(p.plateLocSide, p.plateLocHeight)
        const color = pitchColor(p.taggedPitchType)
        const isActive = activePitch === i
        return (
          <circle
            key={i}
            cx={x} cy={y}
            r={isActive ? 6 : 4.5}
            fill={color}
            fillOpacity={isActive ? 1 : 0.78}
            stroke={isActive ? 'white' : color}
            strokeWidth={isActive ? 1.5 : 0.5}
            style={{ cursor: 'pointer', transition: 'r 0.1s' }}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
          />
        )
      })}

      {/* Zone label */}
      <text x={PL_CX} y={szTop - 6} textAnchor="middle"
        fontSize={7.5} fill="rgba(255,255,255,0.3)" letterSpacing="0.08em" fontWeight={600}>
        STRIKE ZONE
      </text>

      {/* Side labels */}
      <text x={8}       y={PL_H / 2} fontSize={7.5} fill="rgba(255,255,255,0.25)" dominantBaseline="middle">IN</text>
      <text x={PL_W - 8} y={PL_H / 2} fontSize={7.5} fill="rgba(255,255,255,0.25)" dominantBaseline="middle" textAnchor="end">OUT</text>
    </svg>
  )
}

// ── Movement chart (individual pitch scatter) ─────────────────────────────────

const MV_CX = 125
const MV_CY = 125
const MV_R  = 108
const MV_SCALE = MV_R / 24  // 24 inches max

function mvToSvg(hb, ivb) {
  const x = MV_CX + hb * MV_SCALE
  const y = MV_CY - ivb * MV_SCALE
  const dx = x - MV_CX, dy = y - MV_CY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > MV_R) {
    const r = MV_R / dist
    return { x: MV_CX + dx * r, y: MV_CY + dy * r }
  }
  return { x, y }
}

function MovementPlot({ pitches, activePitch, onHover, handedness }) {
  const rings = [6, 12, 18, 24]
  const armLabel   = handedness === 'L' ? '3B' : '1B'
  const gloveLabel = handedness === 'L' ? '1B' : '3B'

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
        color: '#5a6a7a', marginBottom: 2, textTransform: 'uppercase',
      }}>
        <span style={{ color: '#8a9aaa' }}>◄ {gloveLabel}</span>
        <span style={{ flex: 1, borderTop: '1px dashed #333', margin: '0 4px' }} />
        <span style={{ fontSize: 9, color: '#5a6a7a' }}>MOVES TOWARD</span>
        <span style={{ flex: 1, borderTop: '1px dashed #333', margin: '0 4px' }} />
        <span style={{ color: '#8a9aaa' }}>{armLabel} ►</span>
      </div>

      <svg viewBox="0 0 250 250" width="100%" style={{ display: 'block' }}>
        <rect width={250} height={250} fill="hsl(220 13% 9%)" rx="8" />
        <defs>
          <clipPath id="mv-clip"><circle cx={MV_CX} cy={MV_CY} r={MV_R} /></clipPath>
        </defs>

        <circle cx={MV_CX} cy={MV_CY} r={MV_R} fill="rgba(255,255,255,0.03)" />

        {rings.map(r => (
          <circle key={r} cx={MV_CX} cy={MV_CY} r={r * MV_SCALE}
            fill="none" stroke="rgba(255,255,255,0.1)"
            strokeWidth={r === 24 ? 1.5 : 0.8} />
        ))}
        <line x1={MV_CX - MV_R} y1={MV_CY} x2={MV_CX + MV_R} y2={MV_CY}
          stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} />
        <line x1={MV_CX} y1={MV_CY - MV_R} x2={MV_CX} y2={MV_CY + MV_R}
          stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} />

        {[6, 12, 18].map(r => (
          <text key={r}
            x={MV_CX + r * MV_SCALE * 0.707 + 2}
            y={MV_CY - r * MV_SCALE * 0.707 + 3}
            fontSize={7} fill="rgba(255,255,255,0.25)" fontWeight={600}>{r}"</text>
        ))}

        <g clipPath="url(#mv-clip)">
          {pitches.map((p, i) => {
            if (p.horzBreak == null || p.inducedVertBreak == null) return null
            const { x, y } = mvToSvg(p.horzBreak, p.inducedVertBreak)
            const color = pitchColor(p.taggedPitchType)
            const isActive = activePitch === i
            return (
              <circle key={i} cx={x} cy={y}
                r={isActive ? 6 : 4}
                fill={color}
                fillOpacity={isActive ? 1 : 0.75}
                stroke={isActive ? 'white' : 'none'}
                strokeWidth={1.5}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
              />
            )
          })}
        </g>

        <text x={MV_CX} y={MV_CY - MV_R + 11} textAnchor="middle"
          fontSize={7} fill="rgba(255,255,255,0.25)" fontWeight={700} letterSpacing="0.06em">
          ▲ MORE RISE
        </text>
        <text x={MV_CX} y={MV_CY + MV_R - 4} textAnchor="middle"
          fontSize={7} fill="rgba(255,255,255,0.25)" fontWeight={700} letterSpacing="0.06em">
          ▼ MORE DROP
        </text>
      </svg>
    </div>
  )
}

// ── Pitch tooltip ─────────────────────────────────────────────────────────────

function PitchTooltip({ pitch }) {
  if (!pitch) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg min-w-[140px]">
      <p className="mb-1 font-semibold" style={{ color: pitchColor(pitch.taggedPitchType) }}>
        {pitch.taggedPitchType ?? 'Unknown'}
      </p>
      {pitch.relSpeed != null && <p className="text-muted-foreground">Velo: <span className="text-foreground font-medium">{Number(pitch.relSpeed).toFixed(1)} mph</span></p>}
      {pitch.spinRate != null && <p className="text-muted-foreground">Spin: <span className="text-foreground font-medium">{Math.round(pitch.spinRate)} rpm</span></p>}
      {pitch.inducedVertBreak != null && <p className="text-muted-foreground">IVB: <span className="text-foreground font-medium">{Number(pitch.inducedVertBreak).toFixed(1)}"</span></p>}
      {pitch.horzBreak != null && <p className="text-muted-foreground">HB: <span className="text-foreground font-medium">{Number(pitch.horzBreak).toFixed(1)}"</span></p>}
      {pitch.pitchCall && <p className="text-muted-foreground mt-1">{pitch.pitchCall}</p>}
    </div>
  )
}

// ── Pitch mix table ───────────────────────────────────────────────────────────

function PitchMixTable({ pitches }) {
  const byType = {}
  for (const p of pitches) {
    const t = p.taggedPitchType ?? 'Unknown'
    if (!byType[t]) byType[t] = { count: 0, velos: [], spins: [], ivbs: [], hbs: [] }
    byType[t].count++
    if (p.relSpeed != null)         byType[t].velos.push(Number(p.relSpeed))
    if (p.spinRate != null)         byType[t].spins.push(Number(p.spinRate))
    if (p.inducedVertBreak != null) byType[t].ivbs.push(Number(p.inducedVertBreak))
    if (p.horzBreak != null)        byType[t].hbs.push(Number(p.horzBreak))
  }

  function avg(arr) {
    if (!arr.length) return null
    return arr.reduce((a, b) => a + b, 0) / arr.length
  }

  const rows = Object.entries(byType).sort((a, b) => b[1].count - a[1].count)
  const total = pitches.length

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-right font-medium">Count</th>
            <th className="px-4 py-3 text-right font-medium">%</th>
            <th className="px-4 py-3 text-right font-medium">Avg Velo</th>
            <th className="px-4 py-3 text-right font-medium">Avg Spin</th>
            <th className="px-4 py-3 text-right font-medium">IVB</th>
            <th className="px-4 py-3 text-right font-medium">HB</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([type, stats]) => {
            const color = pitchColor(type)
            const veloAvg  = avg(stats.velos)
            const spinAvg  = avg(stats.spins)
            const ivbAvg   = avg(stats.ivbs)
            const hbAvg    = avg(stats.hbs)
            return (
              <tr key={type} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="font-medium text-foreground">{type}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{stats.count}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {((stats.count / total) * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                  {veloAvg != null ? veloAvg.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                  {spinAvg != null ? Math.round(spinAvg) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                  {ivbAvg != null ? ivbAvg.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                  {hbAvg != null ? hbAvg.toFixed(1) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TrackingSessionPage() {
  const { uploadId } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()

  const [pitches, setPitches]    = useState([])
  const [loading, setLoading]    = useState(true)
  const [error, setError]        = useState(null)
  const [activePitch, setActive] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const res   = await fetch(`${BASE_URL}/tracking-uploads/${uploadId}/pitches`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setPitches(await res.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [uploadId, getToken])

  const hoverPitch = activePitch != null ? pitches[activePitch] : null

  // Detect handedness from most common pitcher in data
  const handedness = 'R' // TrackMan doesn't always export this in pitches; default RHP

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>

        {loading && <p className="text-muted-foreground">Loading…</p>}
        {error   && <p className="text-destructive">{error}</p>}

        {!loading && !error && (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold">Tracking Session</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {pitches.length} pitches · TrackMan
              </p>
            </div>

            {/* Charts — location + movement side by side */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Plate location */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pitch Location</p>
                <div className="relative">
                  <PlateChart pitches={pitches} activePitch={activePitch} onHover={setActive} />
                  {hoverPitch && (
                    <div className="pointer-events-none absolute right-2 top-2">
                      <PitchTooltip pitch={hoverPitch} />
                    </div>
                  )}
                </div>
              </div>

              {/* Movement */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pitch Movement</p>
                <div className="relative">
                  <MovementPlot pitches={pitches} activePitch={activePitch} onHover={setActive} handedness={handedness} />
                  {hoverPitch && (
                    <div className="pointer-events-none absolute right-2 top-2">
                      <PitchTooltip pitch={hoverPitch} />
                    </div>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pitch Types</p>
                <div className="flex flex-col gap-2.5 pt-1">
                  {[...new Set(pitches.map(p => p.taggedPitchType).filter(Boolean))].map(type => {
                    const count = pitches.filter(p => p.taggedPitchType === type).length
                    return (
                      <div key={type} className="flex items-center gap-2 text-sm">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: pitchColor(type) }} />
                        <span className="text-foreground font-medium">{type}</span>
                        <span className="ml-auto text-muted-foreground tabular-nums">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Pitch mix table */}
            <div>
              <h2 className="mb-3 text-lg font-semibold">Pitch Mix</h2>
              <PitchMixTable pitches={pitches} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
