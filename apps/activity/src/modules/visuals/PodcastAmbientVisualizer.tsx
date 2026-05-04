import type { VisualState } from '../../state/types'

export function PodcastAmbientVisualizer({ visuals }: { visuals: VisualState }) {
  return (
    <div className="podcast-ambient">
      <div className="podcast-ambient__orb" style={{ transform: `scale(${0.92 + visuals.energy * 0.08})` }} />
      <div className="podcast-ambient__wave">
        {visuals.waveform.slice(0, 56).map((value, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <span key={index} style={{ height: `${18 + value * 52}%` }} />
        ))}
      </div>
      <p>Transcript channel ready / chapter markers idle</p>
    </div>
  )
}
