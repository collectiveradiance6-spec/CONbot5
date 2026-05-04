import type { VisualState } from '../../state/types'

export function GlassWaveformVisualizer({ visuals }: { visuals: VisualState }) {
  const points = visuals.waveform.map((value, index) => {
    const x = (index / (visuals.waveform.length - 1)) * 100
    const y = 50 - (value - 0.5) * 76
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="glass-waveform">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="glassWaveformStroke" x1="0" x2="1">
            <stop stopColor="#43e9ff" />
            <stop offset=".48" stopColor="#ffffff" />
            <stop offset=".72" stopColor="#ff4fd8" />
            <stop offset="1" stopColor="#ffd166" />
          </linearGradient>
        </defs>
        <polyline className="wave-shadow" points={points} />
        <polyline className="wave-main" points={points} />
        <polyline className="wave-shine" points={points} />
      </svg>
    </div>
  )
}
