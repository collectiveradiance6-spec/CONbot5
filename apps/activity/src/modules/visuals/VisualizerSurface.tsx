import { useEffect } from 'react'
import { AudioLines, Maximize2 } from 'lucide-react'
import { GlassCard } from '../../components/ui/GlassCard'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCapsule } from '../../components/ui/GlassCapsule'
import { sendConbotEvent } from '../../core/socket'
import { useConbotStore } from '../../state/useConbotStore'
import type { VisualizerMode } from '../../state/types'
import { createSimulatedVisualState } from './audioAnalyser'
import { CanvasWorld } from './CanvasWorld'
import { GlassWaveformVisualizer } from './GlassWaveformVisualizer'
import { PodcastAmbientVisualizer } from './PodcastAmbientVisualizer'
import { SonicHaloVisualizer } from './SonicHaloVisualizer'
import { SpectrumBarsVisualizer } from './SpectrumBarsVisualizer'
import { UltraLiquidVisualizer } from './UltraLiquidVisualizer'
import { VideoReactiveVisualizer } from './VideoReactiveVisualizer'
import { VisualizerFrame } from './VisualizerFrame'
import { VisualizerModeTabs } from './VisualizerModeTabs'

function VisualizerRenderer({ mode }: { mode: VisualizerMode }) {
  const visuals = useConbotStore((state) => state.visuals)

  if (mode === 'glassWaveform') return <GlassWaveformVisualizer visuals={visuals} />
  if (mode === 'spectrumBars') return <SpectrumBarsVisualizer visuals={visuals} />
  if (mode === 'sonicHalo') return <SonicHaloVisualizer visuals={visuals} />
  if (mode === 'canvasWorld') return <CanvasWorld visuals={visuals} />
  if (mode === 'videoReactive') return <VideoReactiveVisualizer visuals={visuals} />
  if (mode === 'podcastAmbient') return <PodcastAmbientVisualizer visuals={visuals} />
  return <UltraLiquidVisualizer visuals={visuals} />
}

export function VisualizerSurface({ preferredMode }: { preferredMode?: VisualizerMode }) {
  const visuals = useConbotStore((state) => state.visuals)
  const latency = useConbotStore((state) => state.session.latencyMs)
  const optimisticPatch = useConbotStore((state) => state.optimisticPatch)

  useEffect(() => {
    let frame = 0
    const render = (time: number) => {
      optimisticPatch({ visuals: createSimulatedVisualState(useConbotStore.getState().visuals, time) })
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frame)
  }, [optimisticPatch])

  useEffect(() => {
    if (preferredMode && preferredMode !== visuals.mode) {
      optimisticPatch({ visuals: { ...visuals, mode: preferredMode } })
    }
  }, [optimisticPatch, preferredMode, visuals])

  const changeMode = (mode: VisualizerMode) => {
    const mediaMode = mode === 'videoReactive' ? 'video' : mode === 'podcastAmbient' ? 'podcast' : visuals.mediaMode
    optimisticPatch({ visuals: { ...visuals, mode, mediaMode } })
    sendConbotEvent('visuals:mode:set', { mode, mediaMode })
  }

  return (
    <GlassCard className="visualizer-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <GlassCapsule>Visualizer</GlassCapsule>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-[color:var(--text-main)]">Ultra liquid audio engine</h2>
        </div>
        <GlassButton className="h-10 w-10 px-0" aria-label="Expand visualizer">
          <Maximize2 className="h-4 w-4" />
        </GlassButton>
      </div>

      <VisualizerModeTabs mode={visuals.mode} onChange={changeMode} />

      <VisualizerFrame>
        <VisualizerRenderer mode={visuals.mode} />
      </VisualizerFrame>

      <div className="visualizer-footer">
        <span className="flex items-center gap-2">
          <AudioLines className="h-4 w-4 text-[color:var(--accent-primary)]" />
          {visuals.mode}
        </span>
        <span>{Math.round(visuals.bpm)} BPM</span>
        <span>Energy {Math.round(visuals.energy * 100)}%</span>
        <span>Bass {Math.round(visuals.bass * 100)}%</span>
        <span>Mids {Math.round(visuals.mids * 100)}%</span>
        <span>Treble {Math.round(visuals.treble * 100)}%</span>
        <span>Latency {latency || 0}ms</span>
      </div>
    </GlassCard>
  )
}
