import { HIGH_CONFIDENCE_THRESHOLD } from '../lib/matching.js'

const COLORS = {
  high: '#1f6b5c', // pine
  possible: '#2f8f7a', // leaf
}

export default function ScoreRing({ score, size = 72, strokeWidth = 6 }) {
  const clamped = Math.min(100, Math.max(0, score))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const color = score >= HIGH_CONFIDENCE_THRESHOLD ? COLORS.high : COLORS.possible

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Match score ${score}%`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-mist"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-display font-bold text-ink"
          style={{ fontSize: size * 0.26 }}
        >
          {score}%
        </span>
      </div>
    </div>
  )
}
