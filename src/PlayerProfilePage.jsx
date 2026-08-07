import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { Header } from './components/Header'
import { FloatingEquipment } from './components/FloatingEquipment'
import { BreakPlot } from './components/BreakPlot'
import { VelocityNormalizeToggle } from './components/VelocityNormalizeToggle'
import { PercentileBar } from './components/PercentileBar'
import { pitchColor, CHART_SERIES } from './lib/pitchColors'
import { buildStuffTrendSeries } from './lib/stuffTrend'
import { LEVEL_OPTIONS, LEVEL_LABELS } from './lib/benchmarkLevels'

const BASE_URL = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'

const POSITION_LABELS = {
  pitcher: 'P', catcher: 'C', first_base: '1B', second_base: '2B',
  third_base: '3B', shortstop: 'SS', left_field: 'LF', center_field: 'CF',
  right_field: 'RF', designated_hitter: 'DH',
}

const WINDOW_OPTIONS = [30, 60, 90]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  // Backend sends calendar days as YYYY-MM-DD; parse as local so the label
  // doesn't slip a day for anyone west of UTC.
  const d = String(dateStr).length === 10
    ? new Date(`${dateStr}T00:00:00`)
    : new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const d = String(dateStr).length === 10
    ? new Date(`${dateStr}T00:00:00`)
    : new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
}

function heightDisplay(cm) {
  const feet = Math.floor(cm / 30.48)
  const inches = Math.round((cm % 30.48) / 2.54)
  return `${feet}'${inches}"`
}

/** `null`-safe number formatting — every metric on this page can be missing. */
function fmt(value, places = 1, suffix = '') {
  if (value == null) return '—'
  return `${Number(value).toFixed(places)}${suffix}`
}

function fmtInt(value, suffix = '') {
  if (value == null) return '—'
  return `${Math.round(value)}${suffix}`
}

/** Signed break/release values read better with an explicit + on the arm side. */
function fmtSigned(value, places = 1, suffix = '') {
  if (value == null) return '—'
  const n = Number(value)
  return `${n > 0 ? '+' : ''}${n.toFixed(places)}${suffix}`
}

function scoreColorClass(score) {
  if (score == null) return 'text-muted-foreground'
  if (score >= 70) return 'text-primary'
  if (score >= 50) return 'text-yellow-500'
  return 'text-destructive'
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ label, value, unit, hint, trend, accent = false }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className={`text-3xl font-bold tabular-nums ${accent ? 'text-primary' : 'text-foreground'}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {trend != null && trend !== 0 && (
          <span className={`text-xs font-semibold tabular-nums ${trend > 0 ? 'text-primary' : 'text-destructive'}`}>
            {trend > 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  )
}

// ── Velocity trend ────────────────────────────────────────────────────────────

function VeloTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{formatDate(label)}</p>
      {payload.map(entry => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}
          <span className="ml-auto font-semibold tabular-nums text-foreground">
            {entry.value == null ? '—' : `${Number(entry.value).toFixed(1)} mph`}
          </span>
        </p>
      ))}
      {payload[0]?.payload?.pitches != null && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {payload[0].payload.pitches} pitches tracked
        </p>
      )}
    </div>
  )
}

function VeloTrendChart({ trend, onSelect }) {
  // Both series are mph on one axis — never a second y-scale.
  const data = trend.filter(t => t.avgFb != null || t.maxFb != null)
  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Two or more tracked sessions with fastballs are needed to plot a trend.
      </p>
    )
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 4, left: -16 }}
          onClick={e => {
            const uploadId = e?.activePayload?.[0]?.payload?.uploadId
            if (uploadId) onSelect(uploadId)
          }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            stroke="var(--border)"
          />
          <YAxis
            domain={['dataMin - 2', 'dataMax + 2']}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            stroke="var(--border)"
            width={44}
            unit=" mph"
          />
          <Tooltip content={<VeloTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)', paddingTop: 4 }}
            iconType="plainline"
          />
          <Line
            type="monotone" dataKey="maxFb" name="Peak FB"
            stroke={CHART_SERIES.max} strokeWidth={2}
            dot={{ r: 3, fill: CHART_SERIES.max, strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
            connectNulls
          />
          <Line
            type="monotone" dataKey="avgFb" name="Avg FB"
            stroke={CHART_SERIES.avg} strokeWidth={2}
            dot={{ r: 3, fill: CHART_SERIES.avg, strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Stuff+ trend ──────────────────────────────────────────────────────────────

function StuffTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const byPitchType = payload[0]?.payload?.byPitchType ?? []
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{formatDate(label)}</p>
      {byPitchType.map(b => (
        <p key={b.pitchType} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: pitchColor(b.pitchType) }} />
          {b.pitchType}
          <span className="ml-auto font-semibold tabular-nums text-foreground">
            {b.stuffPlus == null ? '—' : Math.round(b.stuffPlus)}
          </span>
        </p>
      ))}
    </div>
  )
}

function StuffDot({ cx, cy, stroke }) {
  if (cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={3.5} fill={stroke} stroke="var(--card)" strokeWidth={1.5} />
}

function StuffTrendChart({ trend, onSelect }) {
  if (trend.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Two or more graded sessions are needed to plot a Stuff+ trend.
      </p>
    )
  }

  const { pitchTypes, data } = buildStuffTrendSeries(trend)

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 4, left: -16 }}
          onClick={e => {
            const uploadId = e?.activePayload?.[0]?.payload?.uploadId
            if (uploadId) onSelect(uploadId)
          }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            stroke="var(--border)"
          />
          <YAxis
            domain={['dataMin - 5', 'dataMax + 5']}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            stroke="var(--border)"
            width={40}
          />
          <ReferenceLine
            y={100}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{ value: 'MLB avg', position: 'insideTopRight', fill: 'var(--muted-foreground)', fontSize: 11 }}
          />
          <Tooltip content={<StuffTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)', paddingTop: 4 }}
            iconType="plainline"
          />
          {pitchTypes.map(pitchType => (
            <Line
              key={pitchType}
              type="monotone" dataKey={pitchType} name={pitchType}
              stroke={pitchColor(pitchType)} strokeWidth={2}
              dot={<StuffDot />}
              activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function StuffTrendCard({ stuffTrend, onSelect }) {
  if (stuffTrend === 'loading') {
    return <p className="py-4 text-sm text-muted-foreground">Loading Stuff+…</p>
  }
  if (stuffTrend === 'unavailable') {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Stuff+ scoring isn’t configured for this environment.
      </p>
    )
  }
  if (stuffTrend === 'error' || !stuffTrend) {
    return <p className="py-4 text-sm text-muted-foreground">Couldn’t load Stuff+. Refresh to try again.</p>
  }
  if (stuffTrend.trend.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No graded sessions yet — Stuff+ needs a TrackMan CSV upload with release and movement data.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <StuffTrendChart trend={stuffTrend.trend} onSelect={onSelect} />
      <p className="text-xs text-muted-foreground">
        {stuffTrend.model?.name ?? 'tjStuff+'} · 100 = MLB average, higher = nastier.
      </p>
    </div>
  )
}

// ── Arsenal ───────────────────────────────────────────────────────────────────

function ArsenalTable({ arsenal }) {
  if (arsenal.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">No tracked pitches yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table aria-label="Arsenal" className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-3 text-left font-medium">Pitch</th>
            <th className="px-3 py-3 text-right font-medium">Usage</th>
            <th className="px-3 py-3 text-right font-medium">Avg Velo</th>
            <th className="px-3 py-3 text-right font-medium">Peak</th>
            <th className="px-3 py-3 text-right font-medium">Spin</th>
            <th className="px-3 py-3 text-right font-medium">IVB</th>
            <th className="px-3 py-3 text-right font-medium">HB</th>
            <th className="px-3 py-3 text-right font-medium">Ext</th>
            <th className="px-3 py-3 text-right font-medium">Strike%</th>
            <th className="px-3 py-3 text-right font-medium">Whiff%</th>
          </tr>
        </thead>
        <tbody>
          {arsenal.map(p => (
            <tr key={p.pitchType} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-3">
                <span className="flex items-center gap-2 font-medium">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: pitchColor(p.pitchType) }}
                  />
                  {p.pitchType}
                </span>
                <span className="ml-[18px] text-xs text-muted-foreground">
                  {p.pitches} thrown
                </span>
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                {fmt(p.usagePct, 1, '%')}
              </td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums">{fmt(p.avgVelo)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmt(p.maxVelo)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmtInt(p.avgSpin)}</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmtSigned(p.avgIvb, 1, '"')}</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmtSigned(p.avgHb, 1, '"')}</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmt(p.avgExtension, 1, "'")}</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmt(p.strikePct, 1, '%')}</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmt(p.whiffPct, 1, '%')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 px-3 text-xs text-muted-foreground">
        IVB = induced vertical break, HB = horizontal break (+ = arm side), Ext = release extension.
        Career totals across every tracked session.
      </p>
    </div>
  )
}

// ── Movement profile ──────────────────────────────────────────────────────────

/** player_profiles handedness → the R/L the break plot and MLB data use. */
function handCode(handedness) {
  if (handedness === 'right') return 'R'
  if (handedness === 'left') return 'L'
  return null
}

function MovementProfile({ arsenal, handedness }) {
  const plotted = arsenal.filter(p => p.avgIvb != null && p.avgHb != null)

  if (plotted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No break data yet — movement comes from a TrackMan or Rapsodo upload.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,280px)_1fr] sm:items-center">
      <BreakPlot
        handedness={handedness}
        points={plotted.map(p => ({
          id:    p.pitchType,
          hb:    p.avgHb,
          ivb:   p.avgIvb,
          color: pitchColor(p.pitchType),
          // Career averages, so a bigger mark than the per-pitch session view.
          r:     7,
        }))}
      />

      {/* Legend — identity is carried by the name, not the swatch alone. */}
      <ul className="space-y-2">
        {plotted.map(p => (
          <li key={p.pitchType} className="flex items-center gap-2.5 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: pitchColor(p.pitchType) }}
            />
            <span className="font-medium">{p.pitchType}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">
              {fmtSigned(p.avgIvb, 1, '"')} IVB · {fmtSigned(p.avgHb, 1, '"')} HB
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── MLB comparisons ───────────────────────────────────────────────────────────

function headshot(mlbId) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,d_people:generic:headshot:83x83.png/v1/people/${mlbId}/headshot/83/current`
}

const COMP_EMPTY_COPY = {
  no_tracked_pitches:     'Upload a tracked session to see which MLB arms this player matches.',
  insufficient_pitch_data:'Not enough tracked pitches of any one type yet to make a fair comparison.',
  handedness_unknown:     'Set this player’s handedness on their profile to enable MLB comparisons.',
}

/** One MLB arm matched to one of the player's pitches. */
function CompCard({ match, player, pitchType }) {
  const rows = [
    { label: 'Velo', mine: player.velocity, theirs: match.velocity_avg, places: 1, unit: ' mph' },
    { label: 'IVB',  mine: player.ivb,      theirs: match.ivb_avg,      places: 1, unit: '"', signed: true },
    { label: 'HB',   mine: player.hb,       theirs: match.hb_avg,       places: 1, unit: '"', signed: true },
    { label: 'Spin', mine: player.spinRate, theirs: match.spin_rate_avg, places: 0, unit: '' },
  ]

  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="mb-3 flex items-center gap-3">
        <img
          src={headshot(match.mlb_id)}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full border border-border bg-muted object-cover"
          onError={e => { e.currentTarget.style.visibility = 'hidden' }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{match.player_name}</p>
          <p className="text-xs text-muted-foreground">{pitchType}</p>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xl font-bold tabular-nums text-primary">{match.similarity_pct}%</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">match</span>
        </div>
      </div>

      <table aria-label={`${match.player_name} comparison`} className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="pb-1 text-left font-normal" />
            <th className="pb-1 text-right font-normal">Player</th>
            <th className="pb-1 text-right font-normal">MLB</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label} className="border-t border-border/40">
              <td className="py-1 text-muted-foreground">{r.label}</td>
              <td className="py-1 text-right font-medium tabular-nums">
                {r.signed ? fmtSigned(r.mine, r.places, r.unit) : fmt(r.mine, r.places, r.unit)}
              </td>
              <td className="py-1 text-right tabular-nums text-muted-foreground">
                {r.signed ? fmtSigned(r.theirs, r.places, r.unit) : fmt(r.theirs, r.places, r.unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CompGroup({ group, handedness }) {
  const color = pitchColor(group.pitchType)
  const top = group.matches[0]

  return (
    <div className="border-t border-border pt-5 first:border-0 first:pt-0">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <h3 className="font-semibold">{group.pitchType}</h3>
        <span className="text-xs text-muted-foreground">
          {group.pitches} thrown · {fmt(group.player.velocity)} mph
        </span>
      </div>

      {group.matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No MLB {group.pitchType.toLowerCase()} data on file for this handedness yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start">
          {/* Player's break, filled; the closest MLB arm's, hollow. */}
          <div>
            <BreakPlot
              handedness={handedness}
              points={[
                { id: 'player', hb: group.player.hb, ivb: group.player.ivb, color, r: 7 },
                { id: 'comp', hb: top.hb_avg, ivb: top.ivb_avg, color, r: 7, filled: false },
              ]}
            />
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">solid</span> = this player ·{' '}
              <span className="font-semibold text-foreground">dashed</span> = {top.player_name}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.matches.map(match => (
              <CompCard
                key={`${match.mlb_id}-${match.pitch_type}`}
                match={match}
                player={group.player}
                pitchType={group.pitchType}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// `comps` is 'loading' until the request settles, then either the payload or
// 'error'. Collapsing those into one falsy value made a pending fetch look
// like a failure.
function MlbComparisons({ comps, handedness }) {
  if (comps === 'loading') {
    return <p className="py-4 text-sm text-muted-foreground">Finding comparable MLB arms…</p>
  }
  if (comps === 'error' || !comps) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Couldn’t load comparisons. Refresh to try again.
      </p>
    )
  }
  if (comps.comps.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {COMP_EMPTY_COPY[comps.reason] ?? 'No comparisons available yet.'}
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {comps.comps.map(group => (
        <CompGroup key={group.pitchType} group={group} handedness={handedness} />
      ))}
      <p className="text-xs text-muted-foreground">
        Matched on movement shape{comps.normalized ? ', normalized to a 90 mph reference so break is compared independently of velocity' : ' and raw velocity'}.
        Career averages vs. 2026 MLB {handedness === 'L' ? 'left' : 'right'}-handers.
      </p>
    </div>
  )
}

// ── Benchmark percentiles ────────────────────────────────────────────────────

const METRIC_PLACES = { velocity: 1, spinRate: 0, ivb: 1, hb: 1, extension: 2 }

/** A metric's percentile at the active level — college drills into the chosen division. */
function percentileFor(metric, level, division) {
  if (level === 'college') return metric.percentiles.college?.[division] ?? null
  return metric.percentiles[level]
}

function BenchmarkCard({ benchmarks, level, onLevelChange, division, onDivisionChange }) {
  const divisions = benchmarks && benchmarks !== 'loading' && benchmarks !== 'error'
    ? benchmarks.collegeDivisions ?? []
    : []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-fit items-center gap-1 rounded-lg border border-border p-1">
          {LEVEL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onLevelChange(opt.value)}
              className={`cursor-pointer rounded px-3 py-1 text-xs font-semibold transition-colors ${
                level === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {level === 'college' && divisions.length > 0 && (
          <select
            value={division}
            onChange={e => onDivisionChange(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
          >
            {divisions.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        )}
      </div>

      {benchmarks === 'loading' && (
        <p className="py-4 text-sm text-muted-foreground">Loading benchmarks…</p>
      )}
      {(benchmarks === 'error' || !benchmarks) && (
        <p className="py-4 text-sm text-muted-foreground">Couldn’t load benchmarks. Refresh to try again.</p>
      )}
      {benchmarks && benchmarks !== 'loading' && benchmarks !== 'error' && (
        benchmarks.pitches.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Throw at least 15 tracked pitches of one type to unlock benchmark percentiles.
          </p>
        ) : (
          <div className="space-y-5">
            {benchmarks.pitches.map(p => {
              const shown = p.metrics
                .map(m => ({ ...m, percentile: percentileFor(m, level, division) }))
                .filter(m => m.percentile != null)
              if (shown.length === 0) return null
              return (
                <div key={p.pitchType} className="border-t border-border pt-4 first:border-0 first:pt-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: pitchColor(p.pitchType) }}
                    />
                    <h3 className="font-semibold">{p.pitchType}</h3>
                    <span className="text-xs text-muted-foreground">{p.pitches} thrown</span>
                  </div>
                  {shown.map(m => (
                    <PercentileBar
                      key={m.metric}
                      label={m.label}
                      unit={m.unit}
                      value={m.value}
                      places={METRIC_PLACES[m.metric] ?? 1}
                      percentile={m.percentile}
                    />
                  ))}
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground">
              {level === 'mlb'
                ? 'Ranked against real 2026 MLB per-pitcher averages for pitches with enough MLB comparables.'
                : `${LEVEL_LABELS[level]} percentiles are estimates from published aggregate benchmarks, not a full distribution — movement (IVB/HB/extension) isn't publicly available at this level, so only velocity and spin rate show.`}
            </p>
          </div>
        )
      )}
    </div>
  )
}

// ── Small labelled rows used by the detail cards ──────────────────────────────

function DetailRow({ label, value, note }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="font-semibold tabular-nums">{value}</span>
        {note && <span className="ml-2 text-xs text-muted-foreground">{note}</span>}
      </span>
    </div>
  )
}

function Card({ title, children, action }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlayerProfilePage() {
  const { profileId: routeProfileId } = useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()

  const [player, setPlayer] = useState(null)
  const [stats, setStats] = useState(null)
  const [comps, setComps] = useState('loading')
  const [normalizeVelocity, setNormalizeVelocity] = useState(true)
  const [benchmarks, setBenchmarks] = useState('loading')
  const [benchmarkLevel, setBenchmarkLevel] = useState('high_school')
  const [collegeDivision, setCollegeDivision] = useState('d1_mid')
  const [stuffTrend, setStuffTrend] = useState('loading')
  const [windowDays, setWindowDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const token = await getToken()
        const headers = { Authorization: `Bearer ${token}` }

        // No :profileId in the URL means "my own profile" — resolve it first.
        let profile = null
        if (routeProfileId) {
          const res = await fetch(`${BASE_URL}/players/${routeProfileId}`, { headers })
          if (!res.ok) throw new Error(`Could not load this player (${res.status})`)
          profile = await res.json()
        } else {
          const res = await fetch(`${BASE_URL}/players/me`, { headers })
          if (res.status === 404) { navigate('/onboarding'); return }
          if (!res.ok) throw new Error(`Could not load your profile (${res.status})`)
          profile = await res.json()
        }
        if (cancelled) return
        setPlayer(profile)

        const statsRes = await fetch(
          `${BASE_URL}/players/${profile.id}/profile-stats?days=${windowDays}`,
          { headers },
        )
        if (!statsRes.ok) throw new Error(`Could not load performance stats (${statsRes.status})`)
        if (cancelled) return
        setStats(await statsRes.json())
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll()
    return () => { cancelled = true }
  }, [routeProfileId, windowDays, getToken, navigate])

  // Comps are career-based, so they don't move with the window filter and get
  // their own effect. A failure here degrades that one card — the rest of the
  // profile is already on screen and stays there.
  const playerId = player?.id
  useEffect(() => {
    if (!playerId) return
    let cancelled = false

    async function fetchComps() {
      // Reset here rather than in the effect body so switching profiles doesn't
      // briefly show the previous player's comps.
      setComps('loading')
      try {
        const token = await getToken()
        const res = await fetch(
          `${BASE_URL}/players/${playerId}/comps?normalizeVelocity=${normalizeVelocity}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        if (!cancelled) setComps(await res.json())
      } catch {
        if (!cancelled) setComps('error')
      }
    }

    fetchComps()
    return () => { cancelled = true }
  }, [playerId, normalizeVelocity, getToken])

  // Benchmarks are career-based like comps — one fetch covers all three
  // levels, since only the client-side selection of which to display changes.
  useEffect(() => {
    if (!playerId) return
    let cancelled = false

    async function fetchBenchmarks() {
      setBenchmarks('loading')
      try {
        const token = await getToken()
        const res = await fetch(
          `${BASE_URL}/players/${playerId}/benchmarks`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        if (!cancelled) setBenchmarks(await res.json())
      } catch {
        if (!cancelled) setBenchmarks('error')
      }
    }

    fetchBenchmarks()
    return () => { cancelled = true }
  }, [playerId, getToken])

  // Stuff+ grading needs an S3 read plus a call to an external model service
  // per ungraded session, so this is slower than the other cards and gets its
  // own effect — a failure or an unconfigured model shouldn't block anything
  // else on the page.
  useEffect(() => {
    if (!playerId) return
    let cancelled = false

    async function fetchStuffTrend() {
      setStuffTrend('loading')
      try {
        const token = await getToken()
        const res = await fetch(
          `${BASE_URL}/players/${playerId}/stuff-trend`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (res.status === 503) { if (!cancelled) setStuffTrend('unavailable'); return }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        if (!cancelled) setStuffTrend(await res.json())
      } catch {
        if (!cancelled) setStuffTrend('error')
      }
    }

    fetchStuffTrend()
    return () => { cancelled = true }
  }, [playerId, getToken])

  const hasTracked = (stats?.totals?.trackedPitches ?? 0) > 0

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {loading && <p className="text-muted-foreground">Loading profile…</p>}
        {error && !loading && <p className="text-destructive">{error}</p>}

        {!loading && !error && player && stats && (
          <div className="space-y-8">
            {/* ── Identity ── */}
            <section className="flex flex-wrap items-start gap-5 rounded-xl border border-border bg-card p-6">
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
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">{player.name}</h1>
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
                  {player.yearsExperience != null && (
                    <span>{player.yearsExperience} yr{player.yearsExperience !== 1 ? 's' : ''} exp</span>
                  )}
                  {player.heightCm != null && <span>{heightDisplay(player.heightCm)}</span>}
                  {player.weightKg != null && <span>{Math.round(player.weightKg * 2.205)} lbs</span>}
                  {player.homeCity && <span>{player.homeCity}</span>}
                </div>

                {stats.totals.lastTrackedDate && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {stats.totals.trackedPitches.toLocaleString()} tracked pitches over{' '}
                    {stats.totals.trackedSessions} session{stats.totals.trackedSessions !== 1 ? 's' : ''}
                    {' · '}last tracked {formatDate(stats.totals.lastTrackedDate)}
                  </p>
                )}
              </div>

              {/* One filter row, above the data it filters. */}
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border p-1">
                {WINDOW_OPTIONS.map(days => (
                  <button
                    key={days}
                    onClick={() => setWindowDays(days)}
                    className={`cursor-pointer rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                      windowDays === days
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </section>

            {!hasTracked && (
              <section className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="mb-1 text-lg font-semibold">No tracked pitches yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload a TrackMan or Rapsodo CSV to fill in velocity, movement and command averages.
                  Bullpen sessions and daily check-ins below still count.
                </p>
              </section>
            )}

            {/* ── Headline numbers ── */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile
                label="Avg Fastball"
                value={fmt(stats.velocity.fastballAvg)}
                unit="mph"
                accent
                trend={stats.velocity.fbTrend}
                hint={
                  stats.velocity.fbTrend != null
                    ? `vs prior ${stats.windowDays}d`
                    : 'career average'
                }
              />
              <StatTile
                label="Top Velo"
                value={fmt(stats.velocity.topVelo)}
                unit="mph"
                hint={
                  stats.velocity.recentFbMax != null
                    ? `${fmt(stats.velocity.recentFbMax)} in last ${stats.windowDays}d`
                    : null
                }
              />
              <StatTile
                label="Strike Rate"
                value={fmt(stats.command.strikePct, 1)}
                unit="%"
                hint={
                  stats.command.firstPitchStrikePct != null
                    ? `${fmt(stats.command.firstPitchStrikePct, 0)}% first-pitch`
                    : null
                }
              />
              <StatTile
                label="Whiff Rate"
                value={fmt(stats.command.whiffPct, 1)}
                unit="%"
                hint={stats.command.swings > 0 ? `on ${stats.command.swings} swings` : null}
              />
            </section>

            {/* ── Velocity trend ── */}
            <Card
              title="Fastball Velocity by Session"
              action={
                stats.veloTrend.length > 1 && (
                  <span className="text-xs text-muted-foreground">click a point to open the session</span>
                )
              }
            >
              <VeloTrendChart
                trend={stats.veloTrend}
                onSelect={uploadId => navigate(`/tracking-uploads/${uploadId}`)}
              />
            </Card>

            {/* ── Stuff+ trend ── */}
            <Card
              title="Stuff+ Over Time"
              action={
                stuffTrend !== 'loading' && stuffTrend !== 'error' && stuffTrend !== 'unavailable'
                && stuffTrend?.trend?.length > 1 && (
                  <span className="text-xs text-muted-foreground">click a point to open the session</span>
                )
              }
            >
              <StuffTrendCard
                stuffTrend={stuffTrend}
                onSelect={uploadId => navigate(`/tracking-uploads/${uploadId}`)}
              />
            </Card>

            {/* ── Arsenal ── */}
            <Card title="Arsenal">
              <ArsenalTable arsenal={stats.arsenal} />
            </Card>

            {/* ── Benchmarks ── */}
            <Card
              title="Benchmarks"
              action={<span className="text-xs text-muted-foreground">career averages vs. level norms</span>}
            >
              <BenchmarkCard
                benchmarks={benchmarks}
                level={benchmarkLevel}
                onLevelChange={setBenchmarkLevel}
                division={collegeDivision}
                onDivisionChange={setCollegeDivision}
              />
            </Card>

            {/* ── Movement ── */}
            <Card
              title="Movement Profile"
              action={<span className="text-xs text-muted-foreground">career averages, pitcher's view</span>}
            >
              <MovementProfile arsenal={stats.arsenal} handedness={handCode(player.handedness)} />
            </Card>

            {/* ── MLB comps ── */}
            <Card
              title="MLB Comparisons"
              action={
                <button
                  onClick={() => navigate('/pitch-dna')}
                  className="cursor-pointer text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Manual lookup →
                </button>
              }
            >
              <div className="space-y-5">
                <VelocityNormalizeToggle
                  value={normalizeVelocity}
                  onChange={setNormalizeVelocity}
                  disabled={comps === 'loading'}
                />
                <MlbComparisons comps={comps} handedness={handCode(player.handedness)} />
              </div>
            </Card>

            {/* ── Detail cards ── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card title="Release Point">
                <DetailRow label="Height" value={fmt(stats.release.avgRelHeight, 2, ' ft')} />
                <DetailRow
                  label="Side"
                  value={fmtSigned(stats.release.avgRelSide, 2, ' ft')}
                  note={
                    stats.release.avgRelSide == null ? null
                      : stats.release.avgRelSide < 0 ? '3B side' : '1B side'
                  }
                />
                <DetailRow label="Extension" value={fmt(stats.release.avgExtension, 2, ' ft')} />
              </Card>

              <Card title="Command">
                <DetailRow label="Strike rate" value={fmt(stats.command.strikePct, 1, '%')} />
                <DetailRow label="In-zone rate" value={fmt(stats.command.zonePct, 1, '%')} />
                <DetailRow
                  label="First-pitch strike"
                  value={fmt(stats.command.firstPitchStrikePct, 1, '%')}
                  note={stats.command.firstPitches > 0 ? `${stats.command.firstPitches} PA` : null}
                />
              </Card>

              <Card title="Results">
                <DetailRow
                  label="K / BB"
                  value={`${stats.outcomes.strikeouts} / ${stats.outcomes.walks}`}
                  note={stats.outcomes.kbbRatio != null ? `${stats.outcomes.kbbRatio.toFixed(2)} ratio` : null}
                />
                <DetailRow
                  label="Avg exit velo"
                  value={fmt(stats.outcomes.avgExitSpeed, 1, ' mph')}
                  note={stats.outcomes.battedBalls > 0 ? `${stats.outcomes.battedBalls} BBE` : null}
                />
                <DetailRow label="Hard-hit rate" value={fmt(stats.outcomes.hardHitPct, 1, '%')} />
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card title="Bullpen Sessions">
                {stats.bullpen.sessions === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">No bullpen sessions logged yet.</p>
                ) : (
                  <>
                    <DetailRow
                      label="Avg location score"
                      value={
                        <span className={scoreColorClass(stats.bullpen.avgScore)}>
                          {fmt(stats.bullpen.avgScore)}
                        </span>
                      }
                      note={`best ${fmt(stats.bullpen.bestScore)}`}
                    />
                    <DetailRow
                      label="Sessions"
                      value={stats.bullpen.sessions}
                      note={`${stats.bullpen.pitches} pitches`}
                    />
                    <DetailRow
                      label="Velocity"
                      value={fmt(stats.bullpen.avgVelo, 1, ' mph')}
                      note={stats.bullpen.maxVelo != null ? `peak ${fmt(stats.bullpen.maxVelo)}` : null}
                    />
                  </>
                )}
              </Card>

              <Card title={`Arm Feel · last ${stats.windowDays} days`}>
                {stats.readiness.checkins === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">
                    No check-ins in this window.
                  </p>
                ) : (
                  <>
                    <DetailRow label="Avg readiness" value={fmt(stats.readiness.avgReadiness, 1, ' / 10')} />
                    <DetailRow label="Avg soreness" value={fmt(stats.readiness.avgSoreness, 1, ' / 10')} />
                    <DetailRow
                      label="Check-ins"
                      value={stats.readiness.checkins}
                      note={`last ${formatDate(stats.readiness.lastCheck)}`}
                    />
                  </>
                )}
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
