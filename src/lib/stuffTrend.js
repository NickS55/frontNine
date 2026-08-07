// Flattens the backend's per-session { byPitchType: [{pitchType,count,stuffPlus}] }
// shape into the wide rows Recharts needs to drive one <Line> per pitch type
// (one column per pitch, keyed by its canonical label), plus the ordered list
// of pitch types to render lines for — most-thrown first, matching the
// Arsenal table's ordering.
export function buildStuffTrendSeries(trend) {
  const totalsByType = new Map()
  for (const point of trend) {
    for (const b of point.byPitchType ?? []) {
      totalsByType.set(b.pitchType, (totalsByType.get(b.pitchType) ?? 0) + b.count)
    }
  }
  const pitchTypes = [...totalsByType.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([pitchType]) => pitchType)

  const data = trend.map(point => {
    const byPitchType = point.byPitchType ?? []
    const row = { uploadId: point.uploadId, date: point.date, byPitchType }
    for (const b of byPitchType) row[b.pitchType] = b.stuffPlus
    return row
  })

  return { pitchTypes, data }
}
