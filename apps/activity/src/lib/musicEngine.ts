/**
 * musicEngine.ts
 * Client-side audio playback via Howler.js.
 * Plays mock catalog tracks locally; real Discord voice playback
 * goes through the backend voice runtime separately.
 *
 * Wired to the Zustand store for state sync.
 * Responds to window `conbot5:playback` events dispatched by sendPlaybackAction().
 */

import { Howl, Howler } from 'howler'
import { useConbotStore } from '../state/useConbotStore'
import type { Track } from '../state/types'
import { mockTracksFor } from './mockCatalog'

// ─── Catalog ──────────────────────────────────────────────────────────────────

const CATALOG: Track[] = mockTracksFor('local').map((t, i) => ({
  ...t,
  id: `local-${i}`,
  title: [
    'Neon Dreams - Starlight Pulse',
    'Prismatic Radiance Matrix',
    'Glass Current',
    'Late Room Signal',
    'Midnight Lo-Fi Wave',
  ][i] ?? t.title,
  artist: ['Neo_Groove', 'CONbot5', 'CONbot5', 'Milo North', 'Astra'][i] ?? 'CONbot5',
  durationMs: [244000, 242000, 196000, 245000, 218000][i] ?? 240000,
}))

// ─── Engine state ─────────────────────────────────────────────────────────────

let howl: Howl | null = null
let progressTimer: ReturnType<typeof setInterval> | null = null
let catalogIndex = 0

function stopProgressTimer() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
}

function startProgressTimer() {
  stopProgressTimer()
  progressTimer = setInterval(() => {
    if (!howl || !howl.playing()) return
    const pos = Math.floor((howl.seek() as number) * 1000)
    useConbotStore.getState().applyPatch({ positionMs: pos })
  }, 500)
}

function loadTrack(track: Track, autoplay = true) {
  if (howl) { howl.stop(); howl.unload() }
  stopProgressTimer()

  useConbotStore.getState().applyPatch({
    currentTrack: track,
    positionMs: 0,
    durationMs: track.durationMs,
    isPlaying: false,
  })

  // Only attempt audio if there's a sourceUrl — otherwise stay visual-only
  const src = (track as Track & { sourceUrl?: string }).sourceUrl
  if (!src) {
    if (autoplay) {
      useConbotStore.getState().applyPatch({ isPlaying: true })
    }
    return
  }

  howl = new Howl({
    src: [src],
    html5: true,
    volume: useConbotStore.getState().volume / 100,
    onplay() {
      useConbotStore.getState().applyPatch({ isPlaying: true })
      startProgressTimer()
    },
    onpause() {
      useConbotStore.getState().applyPatch({ isPlaying: false })
      stopProgressTimer()
    },
    onstop() {
      useConbotStore.getState().applyPatch({ isPlaying: false, positionMs: 0 })
      stopProgressTimer()
    },
    onend() {
      skipNext()
    },
    onloaderror(_id, err) {
      console.warn('[musicEngine] load error:', err)
    },
  })

  if (autoplay) howl.play()
}

function skipNext() {
  const store = useConbotStore.getState()
  const queue = store.queue

  if (queue.length > 0) {
    const [next, ...rest] = queue
    store.applyPatch({ queue: rest })
    loadTrack(next, true)
    return
  }

  // Loop through catalog
  catalogIndex = (catalogIndex + 1) % CATALOG.length
  loadTrack(CATALOG[catalogIndex], true)
}

function skipPrev() {
  catalogIndex = (catalogIndex - 1 + CATALOG.length) % CATALOG.length
  loadTrack(CATALOG[catalogIndex], true)
}

// ─── Event handler ────────────────────────────────────────────────────────────

function handlePlaybackEvent(event: Event) {
  const { type, payload } = (event as CustomEvent<{ type: string; payload?: Record<string, unknown> }>).detail
  const store = useConbotStore.getState()

  switch (type) {
    case 'playback:play': {
      if (howl && !howl.playing()) { howl.play(); break }
      if (!store.currentTrack) loadTrack(CATALOG[catalogIndex], true)
      else store.applyPatch({ isPlaying: true })
      break
    }
    case 'playback:pause': {
      if (howl?.playing()) howl.pause()
      else store.applyPatch({ isPlaying: false })
      break
    }
    case 'playback:skip':
      skipNext()
      break
    case 'playback:previous':
      skipPrev()
      break
    case 'playback:seek': {
      const ms = Number(payload?.positionMs ?? 0)
      if (howl) howl.seek(ms / 1000)
      store.applyPatch({ positionMs: ms })
      break
    }
    case 'playback:volume': {
      const vol = Math.max(0, Math.min(100, Number(payload?.volume ?? store.volume)))
      Howler.volume(vol / 100)
      if (howl) howl.volume(vol / 100)
      store.applyPatch({ volume: vol })
      break
    }
    case 'playback:shuffle': {
      store.applyPatch({ shuffleEnabled: !store.shuffleEnabled })
      break
    }
    case 'playback:loop': {
      const modes = ['off', 'one', 'all'] as const
      const next = modes[(modes.indexOf(store.loopMode) + 1) % modes.length]
      store.applyPatch({ loopMode: next })
      break
    }
    case 'playback:queue:add': {
      const track = payload?.track as Track | undefined
      if (!track) break
      const newQueue = [...store.queue, { ...track, queueId: `q_${Date.now()}` }]
      store.applyPatch({ queue: newQueue })
      break
    }
    case 'playback:load': {
      const track = payload?.track as Track | undefined
      if (track) { catalogIndex = 0; loadTrack(track, true) }
      break
    }
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

let booted = false

export function bootMusicEngine() {
  if (booted) return
  booted = true

  // Load first catalog track into store (silent — don't autoplay until user taps)
  const store = useConbotStore.getState()
  if (!store.currentTrack) {
    store.applyPatch({
      currentTrack: CATALOG[0],
      durationMs: CATALOG[0].durationMs,
      positionMs: 0,
    })
  }

  // Seed queue with remaining catalog tracks
  if (store.queue.length === 0) {
    store.applyPatch({
      queue: CATALOG.slice(1).map((t, i) => ({ ...t, queueId: `init-${i}` })),
    })
  }

  window.addEventListener('conbot5:playback', handlePlaybackEvent)
  console.log('[musicEngine] booted with', CATALOG.length, 'tracks')
}

export function teardownMusicEngine() {
  window.removeEventListener('conbot5:playback', handlePlaybackEvent)
  howl?.stop()
  howl?.unload()
  stopProgressTimer()
  booted = false
}

export { CATALOG }
