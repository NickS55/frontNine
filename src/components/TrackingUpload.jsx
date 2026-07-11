import { useRef, useState } from 'react'
import Papa from 'papaparse'

// ── TrackMan column → normalized field name ───────────────────────────────────

const TM_MAP = {
  PitchNo:            'pitchNumber',
  TaggedPitchType:    'taggedPitchType',
  AutoPitchType:      'autoPitchType',
  PitchCall:          'pitchCall',
  KorBB:              'kOrBB',
  BatterSide:         'batterSide',
  Inning:             'inning',
  'Top/Bottom':       'topBottom',
  Balls:              'balls',
  Strikes:            'strikes',
  Outs:               'outs',
  RelSpeed:           'relSpeed',
  SpinRate:           'spinRate',
  SpinAxis:           'spinAxis',
  Tilt:               'tilt',
  RelHeight:          'relHeight',
  RelSide:            'relSide',
  Extension:          'extension',
  VertBreak:          'vertBreak',
  InducedVertBreak:   'inducedVertBreak',
  HorzBreak:          'horzBreak',
  PlateLocHeight:     'plateLocHeight',
  PlateLocSide:       'plateLocSide',
  ZoneSpeed:          'zoneSpeed',
  ZoneTime:           'zoneTime',
  ExitSpeed:          'exitSpeed',
  Angle:              'launchAngle',
  Date:               '_date',
}

const NUMERIC_FIELDS = new Set([
  'pitchNumber','inning','balls','strikes','outs',
  'relSpeed','spinRate','spinAxis','relHeight','relSide','extension',
  'vertBreak','inducedVertBreak','horzBreak','plateLocHeight','plateLocSide',
  'zoneSpeed','zoneTime','exitSpeed','launchAngle',
])

// Required TrackMan headers for device detection
const TM_REQUIRED = ['RelSpeed', 'SpinRate', 'InducedVertBreak', 'TaggedPitchType']

function detectDevice(headers) {
  if (TM_REQUIRED.every(h => headers.includes(h))) return 'trackman'
  return null
}

function parseRow(raw, map) {
  const pitch = {}
  for (const [csvCol, field] of Object.entries(map)) {
    const val = raw[csvCol]
    if (val === undefined || val === '' || val === 'NA') continue
    if (NUMERIC_FIELDS.has(field)) {
      const n = parseFloat(val)
      if (!isNaN(n)) pitch[field] = n
    } else {
      pitch[field] = val
    }
  }
  return pitch
}

function extractSessionDate(rows) {
  for (const r of rows) {
    const d = r._date
    if (d) {
      // TrackMan Date is typically "YYYY-MM-DD" or "M/D/YYYY"
      const parsed = new Date(d)
      if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
    }
  }
  return null
}

// ── Preview table ─────────────────────────────────────────────────────────────

const PREVIEW_COLS = [
  { key: 'pitchNumber',      label: '#' },
  { key: 'taggedPitchType',  label: 'Type' },
  { key: 'pitchCall',        label: 'Call' },
  { key: 'relSpeed',         label: 'Velo' },
  { key: 'spinRate',         label: 'Spin' },
  { key: 'inducedVertBreak', label: 'IVB' },
  { key: 'horzBreak',        label: 'HB' },
  { key: 'plateLocHeight',   label: 'LocH' },
  { key: 'plateLocSide',     label: 'LocS' },
]

function PreviewTable({ pitches }) {
  const rows = pitches.slice(0, 10)
  return (
    <div className="overflow-x-auto rounded-lg border border-border text-xs">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {PREVIEW_COLS.map(c => (
              <th key={c.key} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              {PREVIEW_COLS.map(c => (
                <td key={c.key} className="px-3 py-1.5 text-foreground tabular-nums">
                  {p[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pitches.length > 10 && (
        <p className="px-3 py-2 text-muted-foreground text-center">
          …and {pitches.length - 10} more pitches
        </p>
      )}
    </div>
  )
}

// ── Pitch type badge colors ───────────────────────────────────────────────────

function pitchTypeSummary(pitches) {
  const counts = {}
  for (const p of pitches) {
    const t = p.taggedPitchType ?? 'Unknown'
    counts[t] = (counts[t] || 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

// ── Main component ────────────────────────────────────────────────────────────

export function TrackingUpload({ playerId, authToken, onSuccess }) {
  const inputRef = useRef(null)
  const [state, setState] = useState('idle') // idle | parsed | uploading | done | error
  const [parsed, setParsed] = useState(null)   // { pitches, filename, sessionDate, device }
  const [error, setError]   = useState(null)
  const [notes, setNotes]   = useState('')

  function handleFile(file) {
    if (!file) return
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const csvText = e.target.result
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete({ data, meta }) {
          const device = detectDevice(meta.fields ?? [])
          if (!device) {
            setError('Unrecognised file format. Expected a TrackMan CSV (must contain RelSpeed, SpinRate, InducedVertBreak, TaggedPitchType columns).')
            return
          }

          const pitches = data.map(row => parseRow(row, TM_MAP))
          const sessionDate = extractSessionDate(pitches)
          const clean = pitches.map(({ _date, ...rest }) => rest)

          setParsed({ pitches: clean, csvText, filename: file.name, sessionDate, device })
          setState('parsed')
        },
        error(err) {
          setError(`Parse error: ${err.message}`)
        },
      })
    }
    reader.readAsText(file)
  }

  async function handleSubmit() {
    if (!parsed) return
    setState('uploading')
    setError(null)

    try {
      const apiBase = import.meta.env.VITE_API_BASE ?? 'https://backnine-production-eb29.up.railway.app'
      const res = await fetch(`${apiBase}/players/${playerId}/tracking-uploads`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deviceType:  parsed.device,
          filename:    parsed.filename,
          csvText:     parsed.csvText,
          sessionDate: parsed.sessionDate,
          notes:       notes || undefined,
          pitches:     parsed.pitches,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      setState('done')
      onSuccess?.()
    } catch (err) {
      setError(err.message)
      setState('parsed')
    }
  }

  function reset() {
    setState('idle')
    setParsed(null)
    setError(null)
    setNotes('')
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (state === 'done') {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <p className="text-lg font-semibold text-foreground">Session uploaded</p>
        <p className="text-sm text-muted-foreground">
          {parsed?.pitches.length} pitches from {parsed?.filename}
        </p>
        <button
          onClick={reset}
          className="text-sm text-primary underline underline-offset-2"
        >
          Upload another
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Drop zone / file picker */}
      {state === 'idle' && (
        <label
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card px-6 py-10 cursor-pointer hover:border-primary/50 transition-colors"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
        >
          <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-sm font-medium text-foreground">Drop TrackMan CSV or click to browse</span>
          <span className="text-xs text-muted-foreground">.csv files only</span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </label>
      )}

      {/* Parsed preview */}
      {(state === 'parsed' || state === 'uploading') && parsed && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">{parsed.filename}</p>
              <p className="text-sm text-muted-foreground">
                {parsed.pitches.length} pitches · {parsed.device}
                {parsed.sessionDate && ` · ${parsed.sessionDate}`}
              </p>
            </div>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
              Change file
            </button>
          </div>

          {/* Pitch type breakdown */}
          <div className="flex flex-wrap gap-2">
            {pitchTypeSummary(parsed.pitches).map(([type, count]) => (
              <span key={type}
                className="rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-foreground">
                {type} <span className="text-muted-foreground">×{count}</span>
              </span>
            ))}
          </div>

          {/* Preview table */}
          <PreviewTable pitches={parsed.pitches} />

          {/* Notes */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={state === 'uploading'}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {state === 'uploading' ? 'Uploading…' : `Save ${parsed.pitches.length} pitches`}
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
