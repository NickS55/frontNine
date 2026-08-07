// tjStuff+ color scale: 100 = MLB average, +10 ≈ one standard deviation
// better. Colored on the same red→blue percentile idea as Baseball Savant
// (blue = better). Shared by the session Stuff+ panel and the profile page's
// Stuff+ trend chart so both read the same value the same way.
export function stuffColor(v) {
  if (v == null) return 'var(--muted-foreground, #888)'
  // 85 → red, 100 → grey, 115 → blue
  const t = Math.max(0, Math.min(1, (v - 85) / 30))
  const hue = 8 + t * (222 - 8)   // 8 (red) → 222 (blue)
  return `hsl(${hue}, 68%, 48%)`
}
