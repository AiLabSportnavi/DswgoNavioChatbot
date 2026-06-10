/* ──────────────────────────────────────────────────────────────────────────
   RobotBrain — a modern, animated neural "robot brain" for the hero backdrop.
   Pure SVG + CSS (no deps). Decorative only: pointer-events-none, aria-hidden.
   Brand green #95c11e drives the glow; warm #ec6607 accents a few synapses.
   ────────────────────────────────────────────────────────────────────────── */

const GREEN = '#95c11e'
const ORANGE = '#ec6607'

/* Neural nodes laid out in a rough brain silhouette (viewBox 0 0 400 400). */
const NODES: { x: number; y: number; r: number }[] = [
  { x: 200, y: 200, r: 9 }, // core
  { x: 150, y: 140, r: 5 },
  { x: 255, y: 135, r: 5 },
  { x: 120, y: 205, r: 4 },
  { x: 285, y: 210, r: 4 },
  { x: 165, y: 265, r: 5 },
  { x: 245, y: 268, r: 5 },
  { x: 200, y: 110, r: 4 },
  { x: 200, y: 300, r: 4 },
  { x: 110, y: 150, r: 3 },
  { x: 300, y: 160, r: 3 },
  { x: 130, y: 280, r: 3 },
  { x: 275, y: 285, r: 3 },
  { x: 90, y: 230, r: 3 },
  { x: 320, y: 235, r: 3 },
  { x: 175, y: 175, r: 3 },
  { x: 230, y: 180, r: 3 },
  { x: 190, y: 240, r: 3 },
]

/* Synapses: [from, to, accent?] — index into NODES. */
const EDGES: [number, number, boolean?][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 15], [0, 16], [0, 17],
  [1, 7], [2, 7], [1, 9, true], [2, 10], [1, 3], [2, 4],
  [3, 13], [4, 14], [3, 5], [4, 6],
  [5, 8], [6, 8], [5, 11], [6, 12, true],
  [7, 15], [7, 16], [15, 17], [16, 17], [8, 17],
  [9, 13], [10, 14], [11, 13, true], [12, 14],
]

export default function RobotBrain({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    >
      {/* scoped keyframes */}
      <style>{`
        @keyframes rb-spin   { to { transform: rotate(360deg); } }
        @keyframes rb-spinR  { to { transform: rotate(-360deg); } }
        @keyframes rb-core   { 0%,100% { opacity:.55; transform:scale(1); } 50% { opacity:1; transform:scale(1.12); } }
        @keyframes rb-pulse  { 0%,100% { opacity:.25; } 50% { opacity:.9; } }
        @keyframes rb-flow   { to { stroke-dashoffset: -28; } }
        @keyframes rb-float  { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-14px); } }
        @media (prefers-reduced-motion: reduce) {
          .rb-anim { animation: none !important; }
        }
      `}</style>

      <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="rb-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.45" />
            <stop offset="45%" stopColor={GREEN} stopOpacity="0.12" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rb-node" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dff0a6" />
            <stop offset="60%" stopColor={GREEN} />
            <stop offset="100%" stopColor="#5f7d12" />
          </radialGradient>
          <filter id="rb-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* soft ambient glow behind everything */}
        <circle cx="200" cy="200" r="190" fill="url(#rb-glow)" />

        {/* slowly counter-rotating dashed orbit rings */}
        <g style={{ transformOrigin: '200px 200px' }} className="rb-anim" >
          <g className="rb-anim" style={{ transformOrigin: '200px 200px', animation: 'rb-spin 60s linear infinite' }}>
            <circle cx="200" cy="200" r="160" fill="none" stroke={GREEN} strokeOpacity="0.18" strokeWidth="1" strokeDasharray="2 10" />
          </g>
          <g className="rb-anim" style={{ transformOrigin: '200px 200px', animation: 'rb-spinR 90s linear infinite' }}>
            <circle cx="200" cy="200" r="178" fill="none" stroke={ORANGE} strokeOpacity="0.12" strokeWidth="1" strokeDasharray="1 16" />
          </g>
        </g>

        {/* the breathing brain itself, gently floating */}
        <g className="rb-anim" style={{ transformOrigin: '200px 200px', animation: 'rb-float 9s ease-in-out infinite' }}>
          {/* synapses */}
          <g strokeLinecap="round" fill="none">
            {EDGES.map(([a, b, accent], i) => {
              const A = NODES[a]
              const B = NODES[b]
              return (
                <line
                  key={i}
                  x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                  stroke={accent ? ORANGE : GREEN}
                  strokeWidth={accent ? 1.4 : 1}
                  strokeDasharray="4 5"
                  className="rb-anim"
                  style={{
                    animation: `rb-flow ${2.4 + (i % 5) * 0.5}s linear infinite, rb-pulse ${3 + (i % 4)}s ease-in-out ${i * 0.12}s infinite`,
                    strokeOpacity: 0.5,
                  }}
                />
              )
            })}
          </g>

          {/* nodes */}
          {NODES.map((n, i) => {
            const isCore = i === 0
            return (
              <g key={i}>
                {isCore && (
                  <circle
                    cx={n.x} cy={n.y} r={26}
                    fill={GREEN} fillOpacity="0.35" filter="url(#rb-blur)"
                    className="rb-anim"
                    style={{ transformOrigin: `${n.x}px ${n.y}px`, animation: 'rb-core 3.2s ease-in-out infinite' }}
                  />
                )}
                <circle
                  cx={n.x} cy={n.y} r={n.r}
                  fill={isCore ? 'url(#rb-node)' : '#cfe88a'}
                  className="rb-anim"
                  style={{
                    transformOrigin: `${n.x}px ${n.y}px`,
                    animation: `rb-pulse ${2.6 + (i % 5) * 0.4}s ease-in-out ${i * 0.18}s infinite`,
                  }}
                />
              </g>
            )
          })}

          {/* traveling signal pulses along a couple of synapses */}
          {[[1, 0], [0, 6], [3, 0], [0, 2]].map(([a, b], i) => {
            const A = NODES[a]
            const B = NODES[b]
            return (
              <circle key={`s${i}`} r="2.6" fill="#eaffb0" className="rb-anim">
                <animateMotion
                  dur={`${2.2 + i * 0.6}s`}
                  repeatCount="indefinite"
                  path={`M${A.x},${A.y} L${B.x},${B.y}`}
                />
              </circle>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
