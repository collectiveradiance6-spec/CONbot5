import type { VisualizerMode } from '../../state/types'
import { visualizerOptions } from './visualizerTypes'

export function VisualizerModeTabs({ mode, onChange }: { mode: VisualizerMode; onChange: (mode: VisualizerMode) => void }) {
  return (
    <div className="visualizer-mode-tabs">
      {visualizerOptions.map((option) => (
        <button
          key={option.mode}
          type="button"
          onClick={() => onChange(option.mode)}
          className={mode === option.mode ? 'is-active' : ''}
          title={option.detail}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
