// One metric's percentile against a benchmark level (HS/college/MLB), shown
// as a labelled progress bar. Visual language matches StatTile/DetailRow:
// muted label, tabular-nums value, rounded-full track.

function percentileColor(p) {
  if (p >= 80) return 'bg-primary'
  if (p >= 40) return 'bg-yellow-500'
  return 'bg-destructive'
}

function ordinal(n) {
  const v = n % 100
  if (v >= 11 && v <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

export function PercentileBar({ label, unit, value, places = 1, percentile }) {
  const formatted = value != null
    ? `${Number(value).toFixed(places)}${unit ? ` ${unit}` : ''}`
    : '—'

  return (
    <div className="py-2">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="flex items-baseline gap-2 tabular-nums">
          <span className="font-semibold">{formatted}</span>
          <span className="text-xs font-semibold text-primary">{ordinal(percentile)} pctl</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] ${percentileColor(percentile)}`}
          style={{ width: `${Math.max(2, Math.min(100, percentile))}%` }}
        />
      </div>
    </div>
  )
}
