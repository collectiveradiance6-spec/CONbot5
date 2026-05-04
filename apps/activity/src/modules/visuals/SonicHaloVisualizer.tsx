import type { VisualState } from '../../state/types'

export function SonicHaloVisualizer({ visuals }: { visuals: VisualState }) {
  return (
    <div className="sonic-halo" style={{ '--halo-energy': visuals.energy } as Record<string, number>}>
      <div className="sonic-halo__ring sonic-halo__ring--outer" />
      <div className="sonic-halo__ring sonic-halo__ring--mid" />
      <div className="sonic-halo__ring sonic-halo__ring--inner" />
      <div className="sonic-halo__orb">
        <span>{Math.round(visuals.bpm)}</span>
        <small>BPM</small>
      </div>
      {Array.from({ length: 48 }).map((_, index) => (
        <i
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          style={{
            transform: `rotate(${index * 7.5}deg) translateY(-${120 + visuals.treble * 28}px)`,
            opacity: index % 3 === 0 ? visuals.treble : 0.36,
          }}
        />
      ))}
    </div>
  )
}
