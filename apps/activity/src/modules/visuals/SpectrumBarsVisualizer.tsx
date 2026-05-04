import type { VisualState } from '../../state/types'

export function SpectrumBarsVisualizer({ visuals }: { visuals: VisualState }) {
  return (
    <div className="spectrum-chamber">
      {visuals.spectrum.map((value, index) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className="spectrum-column"
          style={{
            height: `${Math.max(12, value * 100)}%`,
            opacity: 0.58 + value * 0.4,
          }}
        />
      ))}
    </div>
  )
}
