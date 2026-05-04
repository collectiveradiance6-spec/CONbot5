import type { LightingMode } from '../../theme/themes'

export type IslandStatus = 'disconnected' | 'connecting' | 'connected' | 'playing' | 'paused' | 'error' | 'queue-empty'

export type LivingIslandPlaybackState = {
  isPlaying?: boolean
  volume?: number
  bpm?: number
  positionMs?: number
  connectedUsers?: number
  status?: IslandStatus
  queueSize?: number
}

export type LivingIslandProps = {
  playbackState?: LivingIslandPlaybackState
  vibeRoomKey?: string | null
  vibeRoomName?: string | null
  lightingMode: LightingMode
  accent: string
  compact?: boolean
}

export type IslandProfile = {
  key: string
  label: string
  reactor: string
  riverA: string
  riverB: string
  riverC: string
  skyA: string
  skyB: string
  weather: 'rain' | 'grid' | 'stars' | 'storm' | 'confetti' | 'pixels' | 'embers' | 'mist'
  motion: number
}

export const islandProfiles: Record<string, IslandProfile> = {
  global: {
    key: 'global',
    label: 'Global Activity',
    reactor: '#5ee7ff',
    riverA: '#54e7ff',
    riverB: '#ff5ce8',
    riverC: '#ffd95a',
    skyA: 'rgba(6,12,28,.96)',
    skyB: 'rgba(19,9,34,.9)',
    weather: 'stars',
    motion: 1,
  },
  'midnight-lofi': {
    key: 'midnight-lofi',
    label: 'Midnight Lo-Fi',
    reactor: '#8fc8ff',
    riverA: '#6fb9ff',
    riverB: '#9bd7ff',
    riverC: '#ffd38a',
    skyA: 'rgba(7,13,34,.98)',
    skyB: 'rgba(18,22,48,.92)',
    weather: 'rain',
    motion: 0.62,
  },
  'synthwave-lounge': {
    key: 'synthwave-lounge',
    label: 'Synthwave Lounge',
    reactor: '#ff4fe0',
    riverA: '#21e7ff',
    riverB: '#ff45d7',
    riverC: '#8b5cff',
    skyA: 'rgba(12,6,32,.98)',
    skyB: 'rgba(4,20,42,.92)',
    weather: 'grid',
    motion: 1.12,
  },
  'ambient-void': {
    key: 'ambient-void',
    label: 'Ambient Void',
    reactor: '#b985ff',
    riverA: '#8c7bff',
    riverB: '#d883ff',
    riverC: '#7ee7ff',
    skyA: 'rgba(4,4,18,.98)',
    skyB: 'rgba(24,9,42,.92)',
    weather: 'stars',
    motion: 0.48,
  },
  'raid-prep-boss-fights': {
    key: 'raid-prep-boss-fights',
    label: 'Raid Prep',
    reactor: '#ff3b30',
    riverA: '#ffca55',
    riverB: '#ff4438',
    riverC: '#ff8a3d',
    skyA: 'rgba(24,7,8,.98)',
    skyB: 'rgba(42,20,5,.92)',
    weather: 'storm',
    motion: 1.35,
  },
  'party-room': {
    key: 'party-room',
    label: 'Party Room',
    reactor: '#fff15a',
    riverA: '#34f5ff',
    riverB: '#ff42e6',
    riverC: '#7cff62',
    skyA: 'rgba(10,8,34,.98)',
    skyB: 'rgba(30,6,50,.92)',
    weather: 'confetti',
    motion: 1.45,
  },
  'vgm-lounge': {
    key: 'vgm-lounge',
    label: 'VGM Lounge',
    reactor: '#57ff7a',
    riverA: '#3df7ff',
    riverB: '#b35cff',
    riverC: '#fff45d',
    skyA: 'rgba(4,12,26,.98)',
    skyB: 'rgba(13,6,40,.92)',
    weather: 'pixels',
    motion: 1.05,
  },
  'metal-forge': {
    key: 'metal-forge',
    label: 'Metal Forge',
    reactor: '#ff8a22',
    riverA: '#ffb02e',
    riverB: '#ff4d26',
    riverC: '#ffc46b',
    skyA: 'rgba(14,10,9,.98)',
    skyB: 'rgba(38,12,4,.94)',
    weather: 'embers',
    motion: 1.18,
  },
  'chill-rnb': {
    key: 'chill-rnb',
    label: 'Chill R&B',
    reactor: '#ff79d6',
    riverA: '#b67cff',
    riverB: '#ff7fd1',
    riverC: '#ffd1a1',
    skyA: 'rgba(16,7,28,.98)',
    skyB: 'rgba(38,12,40,.92)',
    weather: 'mist',
    motion: 0.7,
  },
}
