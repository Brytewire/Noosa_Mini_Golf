function Defs() {
  return (
    <defs>
      <marker id="tip" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
        <path d="M 0,0 L 6,3 L 0,6 Z" fill="white" />
      </marker>
    </defs>
  )
}

function Tee({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill="#FFC107" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="bold" fill="#333">T</text>
    </g>
  )
}

function Flag({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#1a1a1a" />
      <line x1={cx} y1={cy - 4} x2={cx} y2={cy - 24} stroke="#333" strokeWidth="2" />
      <polygon points={`${cx},${cy - 24} ${cx + 18},${cy - 17} ${cx},${cy - 10}`} fill="#E53935" />
    </g>
  )
}

// Layout 0 — straight
function Straight() {
  return (
    <svg viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <Defs />
      <rect width="240" height="280" fill="#e8f5e9" />
      <rect x="80" y="20" width="80" height="240" rx="12" fill="#66bb6a" stroke="#2e7d32" strokeWidth="6" />
      <line x1="120" y1="238" x2="120" y2="62" stroke="white" strokeWidth="3" strokeDasharray="8 5" markerEnd="url(#tip)" />
      <Tee cx={120} cy={248} />
      <Flag cx={120} cy={46} />
    </svg>
  )
}

// Layout 1 — dog-leg left (tee at bottom-right, hole at top-left)
function DogLegLeft() {
  return (
    <svg viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <Defs />
      <rect width="240" height="280" fill="#e8f5e9" />
      <polygon
        points="130,260 200,260 200,20 40,20 40,110 130,110"
        fill="#66bb6a"
        stroke="#2e7d32"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path
        d="M 165,248 L 165,115 Q 165,100 80,100 L 80,62"
        stroke="white"
        strokeWidth="3"
        strokeDasharray="8 5"
        markerEnd="url(#tip)"
      />
      <Tee cx={165} cy={256} />
      <Flag cx={80} cy={46} />
    </svg>
  )
}

// Layout 2 — dog-leg right (tee at bottom-left, hole at top-right)
function DogLegRight() {
  return (
    <svg viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <Defs />
      <rect width="240" height="280" fill="#e8f5e9" />
      <polygon
        points="40,260 110,260 110,110 200,110 200,20 40,20"
        fill="#66bb6a"
        stroke="#2e7d32"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path
        d="M 75,248 L 75,115 Q 75,100 160,100 L 160,62"
        stroke="white"
        strokeWidth="3"
        strokeDasharray="8 5"
        markerEnd="url(#tip)"
      />
      <Tee cx={75} cy={256} />
      <Flag cx={160} cy={46} />
    </svg>
  )
}

// Layout 3 — straight with obstacle
function WithObstacle() {
  return (
    <svg viewBox="0 0 240 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      <Defs />
      <rect width="240" height="280" fill="#e8f5e9" />
      <rect x="80" y="20" width="80" height="240" rx="12" fill="#66bb6a" stroke="#2e7d32" strokeWidth="6" />
      {/* Obstacle */}
      <rect x="104" y="118" width="32" height="44" rx="4" fill="#8d6e63" stroke="#5d4037" strokeWidth="2" />
      {/* Ball path curves left around obstacle */}
      <path
        d="M 120,238 L 120,165 Q 75,140 120,115 L 120,62"
        stroke="white"
        strokeWidth="3"
        strokeDasharray="8 5"
        markerEnd="url(#tip)"
      />
      <Tee cx={120} cy={248} />
      <Flag cx={120} cy={46} />
    </svg>
  )
}

const LAYOUTS = [Straight, DogLegLeft, DogLegRight, WithObstacle]

export function HoleMap({ hole }: { hole: number }) {
  const Layout = LAYOUTS[(hole - 1) % 4] ?? Straight
  return <Layout />
}
