import { create } from 'zustand'
import type { ConbotState, RouteKey } from './types'

const defaultStudio: ConbotState['studio'] = {
  eq: [60, 170, 310, 600, 1000, 3000, 6000].map((hz) => ({ hz, gainDb: 0 })),
  compressor: { enabled: false, thresholdDb: -18, ratio: 3, attackMs: 12, releaseMs: 140, makeupGainDb: 0 },
  limiter: { enabled: true, ceilingDb: -1, releaseMs: 80 },
  reverb: { enabled: false, mix: 18, size: 46, damping: 55 },
  chorus: { enabled: false, depth: 22, rateHz: 1.2, mix: 18 },
  normalize: { enabled: true, targetLufs: -14 },
  crossfade: { enabled: false, seconds: 4 },
  filters: { timeStretch: 1, pitchShiftSemitones: 0, stereoWiden: 44, spectralBlur: 8 },
  gain: { inputDb: 0, outputDb: 0, masterVolume: 72 },
  spatial: { enabled: false, mode: 'stereo', roomSize: 36, listenerAngle: 0 },
  preset: 'neutral',
}

const defaultVisuals: ConbotState['visuals'] = {
  mode: 'liquidOcean',
  mediaMode: 'audio',
  energy: 0.58,
  bass: 0.52,
  lowMids: 0.48,
  mids: 0.44,
  highMids: 0.4,
  treble: 0.36,
  bpm: 92,
  beatPulse: 0.5,
  waveform: Array.from({ length: 96 }, (_, index) => 0.5 + Math.sin(index * 0.18) * 0.24),
  spectrum: Array.from({ length: 64 }, (_, index) => 0.28 + Math.abs(Math.sin(index * 0.23)) * 0.52),
  parallaxDepth: 0.35,
  cameraMotion: 0.32,
  reactiveLighting: true,
  glassRefraction: 0.62,
  bloomIntensity: 0.58,
  videoReactiveEnabled: true,
  podcastAmbientEnabled: true,
}

const initialState: ConbotState = {
  activeRoute: 'home',
  themeMode: 'night',
  connection: { connected: false, latencyMs: 0 },
  session: { listeners: 0, latencyMs: 0, globalActivity: true },
  currentTrack: {
    id: 'mock-conbot5-core',
    provider: 'mock',
    source: 'mock',
    title: 'Prismatic Radiance Matrix',
    artist: 'CONbot5',
    artists: ['CONbot5'],
    durationMs: 242000,
    positionMs: 0,
    artworkUrl: '/conbot5-logo-source.png',
    bpm: 127,
    genre: 'prismatic electronic',
  },
  queue: [],
  media: {
    source: 'mock',
    kind: 'audio',
    status: 'ready',
    activeItem: null,
  },
  cinema: {
    mode: 'visualizer',
    sourceKind: 'visualizer',
    title: 'Prismatic Theater',
    subtitle: 'Visualizer mode / compliant media surface',
    quality: 'auto',
    captionsEnabled: true,
    theaterDim: false,
    fullscreen: false,
    miniPlayer: false,
    syncStatus: 'local-only',
    aspectRatio: '16:9',
  },
  regularVoiceRooms: [
    {
      guildId: 'the-conclave',
      voiceChannelId: 'current-voice-channel',
      voiceChannelName: 'Current Discord Voice Room',
      listenerCount: 0,
      botConnected: false,
    },
  ],
  isPlaying: true,
  volume: 72,
  loopMode: 'off',
  shuffleEnabled: false,
  positionMs: 0,
  durationMs: 242000,
  studio: defaultStudio,
  visuals: defaultVisuals,
  vibeRooms: [],
  activeVibeRoomId: null,
  connectors: {},
}

type Store = ConbotState & {
  setActiveRoute: (route: RouteKey) => void
  applyPatch: (patch: Partial<ConbotState>) => void
  setSnapshot: (snapshot: Partial<ConbotState>) => void
  optimisticPatch: (patch: Partial<ConbotState>) => void
}

export const useConbotStore = create<Store>((set) => ({
  ...initialState,
  setActiveRoute: (activeRoute) => set({ activeRoute }),
  applyPatch: (patch) => set((state) => ({ ...state, ...patch })),
  setSnapshot: (snapshot) => set((state) => ({ ...state, ...snapshot })),
  optimisticPatch: (patch) => set((state) => ({ ...state, ...patch })),
}))
