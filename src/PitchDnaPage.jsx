import { useState } from 'react'
import { Header } from './components/Header'
import { MovementChart } from './components/MovementChart'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'

const PITCH_TYPES = [
  { value: 'FF', label: '4-Seam Fastball' },
  { value: 'SI', label: 'Sinker / 2-Seam' },
  { value: 'FC', label: 'Cutter' },
  { value: 'SL', label: 'Slider' },
  { value: 'ST', label: 'Sweeper' },
  { value: 'CU', label: 'Curveball' },
  { value: 'CH', label: 'Changeup' },
  { value: 'FS', label: 'Splitter' },
]

function headshot(mlbId) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,d_people:generic:headshot:83x83.png/v1/people/${mlbId}/headshot/83/current`
}

function StatRow({ label, user, mlb, unit = '' }) {
  if (user == null && mlb == null) return null
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-1.5 text-xs text-muted-foreground pr-3">{label}</td>
      <td className="py-1.5 text-xs font-medium text-center">{user != null ? `${user}${unit}` : '—'}</td>
      <td className="py-1.5 text-xs text-center text-muted-foreground">{mlb != null ? `${mlb}${unit}` : '—'}</td>
    </tr>
  )
}


function CompCard({ comp, input }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img
          src={headshot(comp.mlb_id)}
          alt={comp.player_name}
          className="w-14 h-14 rounded-full object-cover bg-muted border border-border"
          onError={e => { e.target.src = headshot('generic') }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{comp.player_name}</p>
          <p className="text-sm text-muted-foreground">{PITCH_TYPES.find(p => p.value === comp.pitch_type)?.label ?? comp.pitch_type}</p>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-primary">{comp.similarity_pct}%</span>
          <span className="text-xs text-muted-foreground">match</span>
        </div>
      </div>

      {/* Stat table */}
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left text-xs text-muted-foreground pb-1 font-normal"></th>
            <th className="text-center text-xs text-muted-foreground pb-1 font-normal">You</th>
            <th className="text-center text-xs text-muted-foreground pb-1 font-normal">MLB Avg</th>
          </tr>
        </thead>
        <tbody>
          <StatRow label="Velocity" user={input.velocity} mlb={comp.velocity_avg} unit=" mph" />
          <StatRow label="IVB" user={input.ivb} mlb={comp.ivb_avg} unit='"' />
          <StatRow label="HB" user={input.hb} mlb={comp.hb_avg} unit='"' />
          <StatRow label="Spin Rate" user={input.spin_rate || null} mlb={comp.spin_rate_avg} unit=" rpm" />
          <StatRow label="Spin Axis" user={input.spin_axis || null} mlb={comp.spin_axis_avg} unit="°" />
          <StatRow label="Extension" user={input.extension || null} mlb={comp.extension_avg} unit=" ft" />
        </tbody>
      </table>

      {/* Movement chart */}
      <MovementChart
        arsenal={comp.arsenal ?? []}
        userPitch={{ pitch_type: input.pitch_type, ivb: input.ivb, hb: input.hb, velocity: input.velocity }}
        handedness={input.handedness}
      />
    </div>
  )
}

export default function PitchDnaPage() {
  const [form, setForm] = useState({
    pitch_type: 'FF',
    handedness: 'R',
    velocity: '',
    ivb: '',
    hb: '',
    spin_rate: '',
    spin_axis: '',
    release_height: '',
    release_side: '',
    extension: '',
  })
  const [normalizeVelocity, setNormalizeVelocity] = useState(true)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function optNum(v) {
    const f = parseFloat(v)
    return isNaN(f) ? null : f
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setResults(null)
    setLoading(true)

    try {
      const body = {
        pitch_type: form.pitch_type,
        handedness: form.handedness,
        velocity: parseFloat(form.velocity),
        ivb: parseFloat(form.ivb),
        hb: parseFloat(form.hb),
        spin_rate: optNum(form.spin_rate),
        spin_axis: optNum(form.spin_axis),
        release_height: optNum(form.release_height),
        release_side: optNum(form.release_side),
        extension: optNum(form.extension),
        normalize_velocity: normalizeVelocity,
      }

      const res = await fetch(`${API_BASE}/pitch-dna/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json()
      setResults({ comps: data.comps, input: body })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Pitch DNA</h1>
          <p className="mt-1 text-muted-foreground">Enter your pitch metrics to find your closest MLB comp.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Pitch type + handedness */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Pitch Type</label>
                <select
                  value={form.pitch_type}
                  onChange={e => set('pitch_type', e.target.value)}
                  className={inputClass}
                >
                  {PITCH_TYPES.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Handedness</label>
                <div className="flex gap-2 mt-1">
                  {['R', 'L'].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => set('handedness', h)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors cursor-pointer ${
                        form.handedness === h
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      {h === 'R' ? 'RHP' : 'LHP'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Required fields */}
            <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Required</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Velocity (mph)</label>
                  <input type="number" step="0.1" placeholder="92.4" required value={form.velocity} onChange={e => set('velocity', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>IVB (in)</label>
                  <input type="number" step="0.1" placeholder="14.2" required value={form.ivb} onChange={e => set('ivb', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>HB (in) ±arm</label>
                  <input type="number" step="0.1" placeholder="8.5" required value={form.hb} onChange={e => set('hb', e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Optional fields */}
            <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Optional — improves matching</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Spin Rate (rpm)</label>
                  <input type="number" step="1" placeholder="2300" value={form.spin_rate} onChange={e => set('spin_rate', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Spin Axis (°)</label>
                  <input type="number" step="1" placeholder="210" value={form.spin_axis} onChange={e => set('spin_axis', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Release Height (ft)</label>
                  <input type="number" step="0.01" placeholder="6.0" value={form.release_height} onChange={e => set('release_height', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Release Side (ft)</label>
                  <input type="number" step="0.01" placeholder="-1.8" value={form.release_side} onChange={e => set('release_side', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Extension (ft)</label>
                  <input type="number" step="0.01" placeholder="6.5" value={form.extension} onChange={e => set('extension', e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Velocity normalization toggle */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Normalize for velocity</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {normalizeVelocity
                      ? 'Compares movement shape regardless of how hard you throw — recommended for youth/HS pitchers.'
                      : 'Compares raw numbers. Best when your velocity is similar to MLB.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNormalizeVelocity(v => !v)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    normalizeVelocity ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      normalizeVelocity ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Finding comps…' : 'Find My MLB Comp'}
            </button>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </form>

          {/* Results */}
          <div>
            {!results && !loading && (
              <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground text-sm">
                Your MLB comps will appear here.
              </div>
            )}

            {loading && (
              <div className="flex h-full min-h-48 items-center justify-center text-muted-foreground text-sm">
                Searching 1,958 pitcher/pitch combinations…
              </div>
            )}

            {results && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Top 3 comps · {results.comps[0]?.pitch_type} · {results.input.handedness === 'R' ? 'RHP' : 'LHP'}
                  {results.input.normalize_velocity ? ' · velocity normalized' : ''}
                </p>
                {results.comps.map(comp => (
                  <CompCard key={comp.mlb_id} comp={comp} input={results.input} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
