// The movement/break plot from the TrackMan session page, generalized.
//
// Same geometry and styling either way — only what a dot means changes:
//   · session page → one dot per pitch thrown
//   · profile page → one larger dot per pitch type, at its career average
//   · comp overlay → a hollow ring for the MLB pitcher beside the filled dot
//
// Axes are induced vertical break (up = more ride) against horizontal break,
// always drawn from the pitcher's perspective with arm side to the right.

const CX = 125
const CY = 125
const R = 108
const MAX_IN = 24
const SCALE = R / MAX_IN

/** Break in inches → SVG coords, clamped to the outer ring. */
function toSvg(hb, ivb) {
  const x = CX + hb * SCALE
  const y = CY - ivb * SCALE
  const dx = x - CX, dy = y - CY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > R) {
    const ratio = R / dist
    return { x: CX + dx * ratio, y: CY + dy * ratio }
  }
  return { x, y }
}

/**
 * points: [{ id, hb, ivb, color, r?, filled?, label? }]
 *   filled === false draws a hollow ring — used for the MLB comparison arm.
 */
export function BreakPlot({ points = [], handedness, activeId = null, onHover }) {
  const rings = [6, 12, 18, 24]
  const armLabel   = handedness === 'L' ? '3B' : '1B'
  const gloveLabel = handedness === 'L' ? '1B' : '3B'
  const interactive = typeof onHover === 'function'

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
          <clipPath id="break-plot-clip"><circle cx={CX} cy={CY} r={R} /></clipPath>
        </defs>

        <circle cx={CX} cy={CY} r={R} fill="rgba(255,255,255,0.03)" />

        {rings.map(ring => (
          <circle key={ring} cx={CX} cy={CY} r={ring * SCALE}
            fill="none" stroke="rgba(255,255,255,0.1)"
            strokeWidth={ring === MAX_IN ? 1.5 : 0.8} />
        ))}
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY}
          stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} />
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R}
          stroke="rgba(255,255,255,0.15)" strokeWidth={0.8} />

        {[6, 12, 18].map(ring => (
          <text key={ring}
            x={CX + ring * SCALE * 0.707 + 2}
            y={CY - ring * SCALE * 0.707 + 3}
            fontSize={7} fill="rgba(255,255,255,0.25)" fontWeight={600}>{ring}"</text>
        ))}

        <g clipPath="url(#break-plot-clip)">
          {points.map(p => {
            if (p.hb == null || p.ivb == null) return null
            const { x, y } = toSvg(p.hb, p.ivb)
            const isActive = activeId != null && activeId === p.id
            const radius = (p.r ?? 4) + (isActive ? 2 : 0)
            const hollow = p.filled === false
            return (
              <g key={p.id}>
                <circle
                  cx={x} cy={y} r={radius}
                  fill={hollow ? 'none' : p.color}
                  fillOpacity={hollow ? 1 : isActive ? 1 : 0.75}
                  stroke={hollow ? p.color : isActive ? 'white' : 'none'}
                  strokeWidth={hollow ? 2 : 1.5}
                  strokeDasharray={hollow ? '3 2' : undefined}
                  style={interactive ? { cursor: 'pointer' } : undefined}
                  onMouseEnter={interactive ? () => onHover(p.id) : undefined}
                  onMouseLeave={interactive ? () => onHover(null) : undefined}
                />
                {p.label && (
                  <text
                    x={x} y={y - radius - 4} textAnchor="middle"
                    fontSize={8} fontWeight={700} fill="rgba(255,255,255,0.75)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {p.label}
                  </text>
                )}
              </g>
            )
          })}
        </g>

        <text x={CX} y={CY - R + 11} textAnchor="middle"
          fontSize={7} fill="rgba(255,255,255,0.25)" fontWeight={700} letterSpacing="0.06em">
          ▲ MORE RISE
        </text>
        <text x={CX} y={CY + R - 4} textAnchor="middle"
          fontSize={7} fill="rgba(255,255,255,0.25)" fontWeight={700} letterSpacing="0.06em">
          ▼ MORE DROP
        </text>
      </svg>
    </div>
  )
}
