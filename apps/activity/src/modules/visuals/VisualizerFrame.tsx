import type { ReactNode } from 'react'

export function VisualizerFrame({ children }: { children: ReactNode }) {
  return (
    <div className="visualizer-frame">
      <div className="visualizer-frame__reflection" />
      <div className="visualizer-frame__content">{children}</div>
    </div>
  )
}
