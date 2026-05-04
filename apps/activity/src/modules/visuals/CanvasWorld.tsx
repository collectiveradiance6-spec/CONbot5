import type { VisualState } from '../../state/types'

export function CanvasWorld({ visuals }: { visuals: VisualState }) {
  return (
    <div className="canvas-world">
      <div className="canvas-world__atmosphere" />
      <div className="canvas-world__island" style={{ transform: `translateY(${Math.sin(visuals.beatPulse * Math.PI) * -8}px)` }}>
        <div className="canvas-world__rim" />
        <div className="canvas-world__core" />
        <div className="canvas-world__river canvas-world__river--a" />
        <div className="canvas-world__river canvas-world__river--b" />
        <div className="canvas-world__river canvas-world__river--c" />
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="canvas-world__tower"
            style={{
              left: `${20 + index * 6}%`,
              height: `${18 + visuals.spectrum[index * 4] * 64}px`,
            }}
          />
        ))}
      </div>
      <div className="canvas-world__reflection" />
      <div className="canvas-world__orbs">
        {Array.from({ length: 7 }).map((_, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <span key={index} style={{ transform: `rotate(${index * 51 + visuals.beatPulse * 28}deg) translateX(${120 + index * 4}px)` }} />
        ))}
      </div>
    </div>
  )
}
