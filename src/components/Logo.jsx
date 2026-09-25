// "All Nine" ticket logomark. Two-color and self-contained: the "9" is the
// Archivo ExtraBold glyph converted to outlines (SIL OFL 1.1), so it renders
// identically without the font installed and carries no licensing question.
//
// Unlike the previous mark this does NOT use currentColor — the ticket body
// and the disc are fixed brand colors (--secondary #122555 / white), so a
// text-* class on it has no effect. Sized via height, e.g. `h-9 w-auto`.
// Source and regeneration pipeline live in the workspace root: generate-logo.js.
export function Logo({ className = '', title = 'All Nine Sports' }) {
  return (
    <svg
      viewBox="0 0 480 320"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      {/* ticket body: rounded rect with a semicircular notch bitten out of each side */}
      <path
        d="M 40 0 H 440 A 40 40 0 0 1 480 40 V 126 A 34 34 0 0 0 480 194 V 280 A 40 40 0 0 1 440 320 H 40 A 40 40 0 0 1 0 280 V 194 A 34 34 0 0 0 0 126 V 40 A 40 40 0 0 1 40 0 Z"
        fill="#122555"
      />
      {/* inset hairline, concentric with the notches */}
      <path
        d="M 40 15 H 440 A 25 25 0 0 1 465 40 V 113.35 A 49 49 0 0 0 465 206.65 V 280 A 25 25 0 0 1 440 305 H 40 A 25 25 0 0 1 15 280 V 206.65 A 49 49 0 0 0 15 113.35 V 40 A 25 25 0 0 1 40 15 Z"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="3"
      />
      <circle cx="240" cy="160" r="86" fill="#ffffff" />
      <path
        d="M239.25 219Q226.31 219 217.18 214.44Q208.05 209.87 203.16 201.57Q198.26 193.28 198.26 181.82H223.82Q223.82 187.47 225.56 191.37Q227.3 195.27 230.87 197.26Q234.44 199.25 239.42 199.25Q246.72 199.25 250.54 195.6Q254.36 191.95 255.77 184.65Q257.18 177.34 257.18 166.56Q255.02 168.71 251.2 170.87Q247.39 173.03 242.66 174.44Q237.93 175.85 232.95 175.85Q221.33 175.85 212.86 171.45Q204.4 167.05 199.75 158.92Q195.11 150.79 195.11 139.84Q195.11 127.55 200.58 118.84Q206.06 110.13 215.94 105.56Q225.81 101 238.76 101Q250.04 101 258.67 104.15Q267.3 107.31 273.11 113.95Q278.92 120.58 281.91 131.21Q284.89 141.83 284.89 156.93Q284.89 174.02 281.99 185.89Q279.08 197.76 273.36 205.06Q267.63 212.36 259.09 215.68Q250.54 219 239.25 219ZM239.25 157.59Q244.9 157.59 248.8 155.35Q252.7 153.11 254.6 149.05Q256.51 144.98 256.51 139.34Q256.51 133.69 254.6 129.55Q252.7 125.4 248.88 123.07Q245.06 120.75 239.25 120.75Q233.61 120.75 229.79 123.07Q225.98 125.4 223.98 129.46Q221.99 133.53 221.99 139.17Q221.99 144.81 223.9 148.96Q225.81 153.11 229.63 155.35Q233.44 157.59 239.25 157.59Z"
        fill="#122555"
      />
    </svg>
  )
}
