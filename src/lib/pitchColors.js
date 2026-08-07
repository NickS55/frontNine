// Pitch-type colors, near-enough to the Statcast/TrackMan convention that a
// coach reading a broadcast overlay recognizes them here. Keys are the display
// labels the backend emits (see backNine/src/lib/pitchTypes.ts) plus the raw
// vendor labels the session pages still render straight from a CSV.
//
// Identity is never carried by color alone — every chart and table that uses
// these also prints the pitch name next to the swatch.
export const PITCH_COLORS = {
  'Four-Seam':     '#D93025',
  'Fastball':      '#D93025',
  'Sinker':        '#1A9BB5',
  'Two-Seam':      '#1A9BB5',
  'Cutter':        '#E8620A',
  'Slider':        '#E8930A',
  'Sweeper':       '#5E9E1A',
  'Slurve':        '#3E7BC4',
  'Curveball':     '#1A4FD6',
  'Knuckle Curve': '#1A4FD6',
  'Changeup':      '#C8A800',
  'Splitter':      '#7B3BB5',
  'Knuckleball':   '#8A6D3B',
  'Eephus':        '#888888',
  'Screwball':     '#A0522D',
  'Forkball':      '#7B3BB5',
  'Pitch Out':     '#888888',
  'Other':         '#888888',
  'Undefined':     '#aaaaaa',
}

export function pitchColor(type) {
  return PITCH_COLORS[type] ?? '#888888'
}

// Two-series line-chart colors for velocity trends, validated against the app's
// dark card surface (#061543) for lightness band, chroma, CVD separation and
// contrast. Do not swap these for brand tokens without re-validating.
export const CHART_SERIES = {
  avg: '#c38600',
  max: '#1485d7',
}
