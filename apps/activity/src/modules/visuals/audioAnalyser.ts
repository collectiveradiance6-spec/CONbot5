import type { VisualState } from '../../state/types'

export function createSimulatedVisualState(base: VisualState, time = performance.now()): VisualState {
  const t = time / 1000
  const bass = Math.max(0, Math.min(1, 0.55 + Math.sin(t * 1.45) * 0.22 + Math.sin(t * 0.37) * 0.08))
  const mids = Math.max(0, Math.min(1, 0.5 + Math.sin(t * 1.9 + 1.3) * 0.18))
  const treble = Math.max(0, Math.min(1, 0.48 + Math.sin(t * 2.7 + 0.6) * 0.16))
  const energy = Math.max(0, Math.min(1, bass * 0.42 + mids * 0.34 + treble * 0.24))

  return {
    ...base,
    energy,
    bass,
    lowMids: Math.max(0, Math.min(1, (bass + mids) / 2)),
    mids,
    highMids: Math.max(0, Math.min(1, (mids + treble) / 2)),
    treble,
    beatPulse: Math.max(0, Math.min(1, 0.5 + Math.sin(t * (base.bpm / 60) * Math.PI * 2) * 0.5)),
    waveform: Array.from({ length: 96 }, (_, index) => {
      const wave = Math.sin(index * 0.18 + t * 2.2) * bass * 0.28 + Math.sin(index * 0.47 + t * 3.1) * mids * 0.14
      return Math.max(0, Math.min(1, 0.5 + wave))
    }),
    spectrum: Array.from({ length: 64 }, (_, index) => {
      const band = index < 18 ? bass : index < 44 ? mids : treble
      return Math.max(0.05, Math.min(1, 0.2 + Math.abs(Math.sin(index * 0.25 + t * (1.2 + band))) * band))
    }),
  }
}
