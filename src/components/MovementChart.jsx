const PITCH_COLORS = {
  FF: '#D93025',
  SI: '#1A9BB5',
  FC: '#E8620A',
  SL: '#E8930A',
  ST: '#5E9E1A',
  CU: '#1A4FD6',
  CH: '#C8A800',
  FS: '#7B3BB5',
}

const PITCH_NAMES = {
  FF: '4-Seam',
  SI: 'Sinker',
  FC: 'Cutter',
  SL: 'Slider',
  ST: 'Sweeper',
  CU: 'Curve',
  CH: 'Change',
  FS: 'Splitter',
}

const CX = 125
const CY = 128
const MAX_IN = 24
const R = 108           // SVG px for 24"
const SCALE = R / MAX_IN

function toSvg(hb, ivb) {
  // arm-side always plotted to the right (positive hb = right)
  const x = CX + hb * SCALE
  const y = CY - ivb * SCALE
  // clamp to edge of circle
  const dx = x - CX, dy = y - CY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > R) {
    const ratio = R / dist
    return { x: CX + dx * ratio, y: CY + dy * ratio, clipped: true }
  }
  return { x, y, clipped: false }
}

export function MovementChart({ arsenal, userPitch, handedness }) {
  const rings = [6, 12, 18, 24]

  // Sort arsenal by pitch count descending for z-order (most common on bottom)
  const sortedArsenal = [...(arsenal ?? [])].sort((a, b) => (b.pitch_count ?? 0) - (a.pitch_count ?? 0))

  const armLabel = handedness === 'R' ? '3B' : '1B'
  const gloveLabel = handedness === 'R' ? '1B' : '3B'

  return (
    <div>
      {/* Top direction label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: '#5a6a7a',
        marginBottom: 2,
        textTransform: 'uppercase',
      }}>
        <span style={{ color: '#8a9aaa' }}>◄ {gloveLabel}</span>
        <span style={{ flex: 1, borderTop: '1px dashed #b0bec8', margin: '0 4px' }} />
        <span style={{ fontSize: 9, color: '#5a6a7a' }}>MOVES TOWARD</span>
        <span style={{ flex: 1, borderTop: '1px dashed #b0bec8', margin: '0 4px' }} />
        <span style={{ color: '#8a9aaa' }}>{armLabel} ►</span>
      </div>

      <svg viewBox="0 0 250 256" width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <radialGradient id="mvt-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dff0f8" />
            <stop offset="70%" stopColor="#cce5f2" />
            <stop offset="100%" stopColor="#b8d8ec" />
          </radialGradient>
          <clipPath id="mvt-clip">
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
          <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <circle cx={CX} cy={CY} r={R} fill="url(#mvt-bg)" />

        {/* Grid rings */}
        {rings.map(r => (
          <circle
            key={r}
            cx={CX} cy={CY} r={r * SCALE}
            fill="none"
            stroke="white"
            strokeWidth={r === 24 ? 1.5 : 0.8}
            strokeOpacity={r === 24 ? 0.9 : 0.6}
          />
        ))}

        {/* Crosshairs */}
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY}
          stroke="white" strokeWidth={1} strokeOpacity={0.75} />
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R}
          stroke="white" strokeWidth={1} strokeOpacity={0.75} />

        {/* Ring inch labels — shown at NE position */}
        {[6, 12, 18].map(r => (
          <text key={r}
            x={CX + r * SCALE * 0.707 + 2}
            y={CY - r * SCALE * 0.707 + 3}
            fontSize={7.5} fill="rgba(30,60,90,0.45)" fontWeight={600}
          >{r}"</text>
        ))}

        {/* More rise / more drop */}
        <text x={CX} y={CY - R + 11} textAnchor="middle"
          fontSize={7.5} fill="rgba(30,60,90,0.45)" fontWeight={700} letterSpacing="0.06em">
          ▲ MORE RISE
        </text>
        <text x={CX} y={CY + R - 4} textAnchor="middle"
          fontSize={7.5} fill="rgba(30,60,90,0.45)" fontWeight={700} letterSpacing="0.06em">
          ▼ MORE DROP
        </text>

        {/* Arsenal dots (clipped to circle) */}
        <g clipPath="url(#mvt-clip)">
          {sortedArsenal.map(pitch => {
            if (pitch.hb_avg == null || pitch.ivb_avg == null) return null
            const { x, y } = toSvg(pitch.hb_avg, pitch.ivb_avg)
            const color = PITCH_COLORS[pitch.pitch_type] ?? '#888'
            const isMatch = pitch.pitch_type === userPitch?.pitch_type
            return (
              <circle
                key={pitch.pitch_type}
                cx={x} cy={y}
                r={isMatch ? 9 : 7}
                fill={color}
                fillOpacity={isMatch ? 0.92 : 0.72}
                stroke="white"
                strokeWidth={isMatch ? 1.5 : 0.8}
              />
            )
          })}
        </g>

        {/* User pitch marker */}
        {userPitch?.hb != null && userPitch?.ivb != null && (() => {
          const { x, y } = toSvg(userPitch.hb, userPitch.ivb)
          const color = PITCH_COLORS[userPitch.pitch_type] ?? '#333'
          return (
            <g>
              {/* Outer dashed ring */}
              <circle cx={x} cy={y} r={15}
                fill="none" stroke={color} strokeWidth={1.5}
                strokeDasharray="4 3" strokeOpacity={0.7} />
              {/* White dot with colored border */}
              <circle cx={x} cy={y} r={9}
                fill="white" stroke={color} strokeWidth={2.5} />
              <text x={x} y={y + 3.5} textAnchor="middle"
                fontSize={6.5} fontWeight={800} fill={color} letterSpacing="0.02em">
                YOU
              </text>
            </g>
          )
        })()}

        {/* Outer border ring */}
        <circle cx={CX} cy={CY} r={R}
          fill="none" stroke="rgba(90,130,160,0.3)" strokeWidth={1} />
      </svg>

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 10px',
        justifyContent: 'center',
        marginTop: 4,
        padding: '0 4px',
      }}>
        {sortedArsenal.filter(p => p.hb_avg != null).map(pitch => {
          const isMatch = pitch.pitch_type === userPitch?.pitch_type
          return (
            <div key={pitch.pitch_type} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: isMatch ? 1 : 0.7,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: PITCH_COLORS[pitch.pitch_type] ?? '#888',
                flexShrink: 0,
                outline: isMatch ? `2px solid ${PITCH_COLORS[pitch.pitch_type]}` : 'none',
                outlineOffset: 1,
              }} />
              <span style={{ fontSize: 9.5, color: '#4a5a6a', fontWeight: isMatch ? 700 : 500, whiteSpace: 'nowrap' }}>
                {PITCH_NAMES[pitch.pitch_type] ?? pitch.pitch_type}
                {pitch.velocity_avg != null
                  ? <span style={{ color: '#7a8a9a', fontWeight: 400 }}> {pitch.velocity_avg}</span>
                  : null}
              </span>
            </div>
          )
        })}
        {/* User pitch in legend if not already in arsenal */}
        {userPitch && !sortedArsenal.find(p => p.pitch_type === userPitch.pitch_type) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'white',
              border: `2px solid ${PITCH_COLORS[userPitch.pitch_type] ?? '#333'}`,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 9.5, color: '#4a5a6a', fontWeight: 700 }}>
              You ({userPitch.velocity} mph)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
