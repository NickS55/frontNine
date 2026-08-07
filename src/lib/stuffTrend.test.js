import { describe, it, expect } from 'vitest'
import { buildStuffTrendSeries } from './stuffTrend'

describe('buildStuffTrendSeries', () => {
  const trend = [
    {
      uploadId: 'u1', date: '2026-07-10',
      byPitchType: [
        { pitchType: 'Four-Seam', count: 30, stuffPlus: 95 },
        { pitchType: 'Slider', count: 15, stuffPlus: 86.4 },
      ],
    },
    {
      uploadId: 'u2', date: '2026-07-30',
      byPitchType: [
        { pitchType: 'Four-Seam', count: 35, stuffPlus: 108.2 },
        { pitchType: 'Changeup', count: 5, stuffPlus: 90 },
      ],
    },
  ]

  it('orders pitch types by total count across the whole trend, most-thrown first', () => {
    const { pitchTypes } = buildStuffTrendSeries(trend)
    // Four-Seam: 30+35=65, Slider: 15, Changeup: 5
    expect(pitchTypes).toEqual(['Four-Seam', 'Slider', 'Changeup'])
  })

  it('flattens each session onto one column per pitch type it was thrown', () => {
    const { data } = buildStuffTrendSeries(trend)
    expect(data[0]).toMatchObject({ uploadId: 'u1', date: '2026-07-10', 'Four-Seam': 95, Slider: 86.4 })
    expect(data[0].Changeup).toBeUndefined()
    expect(data[1]).toMatchObject({ uploadId: 'u2', date: '2026-07-30', 'Four-Seam': 108.2, Changeup: 90 })
    expect(data[1].Slider).toBeUndefined()
  })

  it('keeps the raw byPitchType breakdown on each row for the tooltip', () => {
    const { data } = buildStuffTrendSeries(trend)
    expect(data[0].byPitchType).toEqual(trend[0].byPitchType)
  })

  it('returns no pitch types for an empty trend', () => {
    expect(buildStuffTrendSeries([])).toEqual({ pitchTypes: [], data: [] })
  })

  it('tolerates a point missing byPitchType rather than crashing', () => {
    // Guards against a frontend/backend version mismatch during a rolling
    // deploy — an older backend response has no byPitchType field at all.
    const mixed = [{ uploadId: 'u1', date: '2026-07-10' }, ...trend]
    expect(() => buildStuffTrendSeries(mixed)).not.toThrow()
    const { data } = buildStuffTrendSeries(mixed)
    expect(data[0].byPitchType).toEqual([])
  })
})
