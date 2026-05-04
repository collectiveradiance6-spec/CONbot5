import type { VisualState } from '../../state/types'

export function VideoReactiveVisualizer({ visuals }: { visuals: VisualState }) {
  return (
    <div className="video-reactive">
      <div className="video-reactive__screen">
        <div className="video-reactive__scan" />
        <div className="video-reactive__glow" style={{ opacity: 0.28 + visuals.energy * 0.44 }} />
      </div>
      <div className="video-reactive__bars">
        {visuals.spectrum.slice(0, 32).map((value, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <span key={index} style={{ height: `${20 + value * 74}%` }} />
        ))}
      </div>
    </div>
  )
}
