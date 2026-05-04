import type { VisualizerMode } from '../../state/types'

export type VisualizerOption = {
  mode: VisualizerMode
  label: string
  detail: string
}

export const visualizerOptions: VisualizerOption[] = [
  { mode: 'liquidOcean', label: 'Liquid Ocean', detail: 'WebGL liquid glass ocean' },
  { mode: 'glassWaveform', label: 'Glass Waveform', detail: 'Layered analyzer tube' },
  { mode: 'spectrumBars', label: 'Spectrum Chamber', detail: 'Premium EQ columns' },
  { mode: 'sonicHalo', label: 'Sonic Halo', detail: 'Circular pulse reactor' },
  { mode: 'canvasWorld', label: 'Canvas World', detail: 'CONbot5 living world' },
  { mode: 'videoReactive', label: 'Video Reactive', detail: 'Thumbnail driven lighting' },
  { mode: 'podcastAmbient', label: 'Podcast Ambient', detail: 'Warm reduced motion' },
]
