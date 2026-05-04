export type ThemeMode = 'day' | 'night' | 'roygbiv' | 'auto'

export type RouteKey =
  | 'home'
  | 'now'
  | 'library'
  | 'media'
  | 'queue'
  | 'live'
  | 'studio'
  | 'visuals'
  | 'rooms'
  | 'playlists'
  | 'cinema'
  | 'equalizer'
  | 'lyrics'
  | 'profile'
  | 'history'
  | 'system'
  | 'settings'
  | 'admin'

export type AppPage =
  | 'now'
  | 'queue'
  | 'search'
  | 'rooms'
  | 'playlists'
  | 'cinema'
  | 'equalizer'
  | 'lyrics'
  | 'profile'
  | 'history'
  | 'library'
  | 'system'
  | 'admin'
  | 'settings'

export type CoreFace =
  | 'now-playing'
  | 'queue'
  | 'room'
  | 'search'
  | 'cinema'
  | 'lyrics'
  | 'profile'
  | 'history'
  | 'library'
  | 'system'
  | 'admin-alert'
  | 'collapse'

export type ShellMode = 'collapsed' | 'expanded' | 'cinema-expanded'

export type ConnectorStatus = 'connected' | 'missing_env' | 'disabled' | 'error' | 'ready' | 'not_configured' | 'configured' | 'unsupported'

export type Track = {
  id: string
  title: string
  artist?: string
  creator?: string
  artists?: string[]
  source?: 'spotify' | 'youtube' | 'soundcloud' | 'apple' | 'rss' | 'local' | 'mock'
  provider?: string
  durationMs: number
  positionMs?: number
  artworkUrl?: string
  bpm?: number
  genre?: string
  queueId?: string
}

export type EQBand = {
  hz: number
  gainDb: number
}

export type StudioDSPState = {
  eq: EQBand[]
  compressor: {
    enabled: boolean
    thresholdDb: number
    ratio: number
    attackMs: number
    releaseMs: number
    makeupGainDb: number
  }
  limiter: {
    enabled: boolean
    ceilingDb: number
    releaseMs: number
  }
  reverb: {
    enabled: boolean
    mix: number
    size: number
    damping: number
  }
  chorus: {
    enabled: boolean
    depth: number
    rateHz: number
    mix: number
  }
  normalize: {
    enabled: boolean
    targetLufs: number
  }
  crossfade: {
    enabled: boolean
    seconds: number
  }
  filters: {
    timeStretch: number
    pitchShiftSemitones: number
    stereoWiden: number
    spectralBlur: number
  }
  gain: {
    inputDb: number
    outputDb: number
    masterVolume: number
  }
  spatial: {
    enabled: boolean
    mode: 'stereo' | 'wide' | 'spatial' | 'cinematic'
    roomSize: number
    listenerAngle: number
  }
  preset: 'neutral' | 'lofi' | 'synthwave' | 'raid' | 'party' | 'vgm' | 'metal' | 'rnb' | 'custom'
}

export type VisualizerMode =
  | 'liquidOcean'
  | 'glassWaveform'
  | 'spectrumBars'
  | 'sonicHalo'
  | 'canvasWorld'
  | 'videoReactive'
  | 'podcastAmbient'

export type MediaMode = 'audio' | 'video' | 'podcast' | 'live' | 'radio'

export type VisualState = {
  mode: VisualizerMode
  mediaMode: MediaMode
  energy: number
  bass: number
  lowMids: number
  mids: number
  highMids: number
  treble: number
  bpm: number
  beatPulse: number
  waveform: number[]
  spectrum: number[]
  parallaxDepth: number
  cameraMotion: number
  reactiveLighting: boolean
  glassRefraction: number
  bloomIntensity: number
  videoReactiveEnabled: boolean
  podcastAmbientEnabled: boolean
}

export type CinemaMode = 'video' | 'visualizer' | 'lyrics' | 'ambient' | 'room-stage' | 'mini-player'

export type CinemaSourceKind =
  | 'conbot-video-library'
  | 'admin-approved-upload'
  | 'youtube-embed'
  | 'vimeo-embed'
  | 'personal-media-server'
  | 'external-link'
  | 'visualizer'
  | 'lyrics'

export type CinemaQuality = 'auto' | '4k' | '1080p' | '720p' | '480p'

export type CinemaState = {
  mode: CinemaMode
  sourceKind: CinemaSourceKind
  sourceId?: string
  title: string
  subtitle?: string
  quality: CinemaQuality
  captionsEnabled: boolean
  theaterDim: boolean
  fullscreen: boolean
  miniPlayer: boolean
  syncStatus: 'synced' | 'syncing' | 'local-only' | 'offline'
  aspectRatio: '16:9' | '21:9'
  roomId?: string
  trackId?: string
}

export type RegularVoiceRoom = {
  voiceChannelId: string
  voiceChannelName: string
  guildId: string
  listenerCount: number
  botConnected: boolean
  activeTrackId?: string
  activeQueueId?: string
  linkedTextChannelId?: string
}

export type RegularRoomPlaybackPermissions = {
  playMode: 'everyone' | 'dj-only' | 'admin-only' | 'host-only'
  canGuestsQueue: boolean
  canGuestsSkip: boolean
  canGuestsControlVolume: boolean
  canGuestsStopPlayback: boolean
  voteSkipRequired: boolean
  voteSkipThresholdPercent: number
}

export type RegularRoomQueueRules = {
  queueEnabled: boolean
  maxQueueLength: number
  maxTracksPerUser: number
  allowDuplicates: boolean
  explicitAllowed: boolean
  publicSafeOnly: boolean
  allowExternalSources: boolean
  allowUploads: boolean
  allowImportedPlaylists: boolean
  autoClearWhenEmpty: boolean
  saveQueueWhenEmpty: boolean
}

export type RegularRoomAudioDefaults = {
  defaultVolume: number
  volumeCap: number
  defaultEqPreset:
    | 'neutral'
    | 'lofi-soft'
    | 'synthwave-wide'
    | 'raid-punch'
    | 'party-bright'
    | 'ambient-deep'
    | 'metal-forge-heavy'
    | 'rnb-velvet'
    | 'night-safe'
    | 'voice-clear'
  nightSafeMode: boolean
  volumeNormalization: boolean
  crossfadeMs: number
  voiceDuckingEnabled: boolean
  visualizerSensitivity: number
}

export type RegularRoomCinemaDefaults = {
  cinemaAllowed: boolean
  roomStageAllowed: boolean
  lyricsAllowed: boolean
  captionsDefault: boolean
  explicitLyricsWarning: boolean
  autoVisualizerForAudio: boolean
  syncedWatchAllowed: boolean
}

export type RegularRoomThemeSettings = {
  themeMode: 'global' | 'track-palette' | 'room-accent' | 'minimal' | 'prismatic'
  accentColor?: string
  backgroundIntensity: number
  glassIntensity: number
  motionIntensity: number
}

export type VibeRoom = {
  id: string
  name: string
  emoji: string
  linkedVoiceChannelId?: string
  enabled: boolean
  themeMode: ThemeMode
  studioPreset: StudioDSPState['preset']
  visualMode: VisualState['mode']
}

export type SessionSyncState = {
  guildId?: string
  channelId?: string
  socketId?: string
  listeners: number
  latencyMs: number
  globalActivity: boolean
}

export type ConbotState = {
  activeRoute: RouteKey
  themeMode: ThemeMode
  connection: {
    connected: boolean
    latencyMs: number
    socketId?: string
  }
  session: SessionSyncState
  currentTrack: Track | null
  queue: Track[]
  media?: {
    source: 'youtube' | 'soundcloud' | 'spotify' | 'apple' | 'rss' | 'local' | 'mock'
    kind: MediaMode
    status: string
    activeItem: Track | null
  }
  cinema: CinemaState
  regularVoiceRooms: RegularVoiceRoom[]
  isPlaying: boolean
  volume: number
  loopMode: 'off' | 'one' | 'all'
  shuffleEnabled: boolean
  positionMs: number
  durationMs: number
  studio: StudioDSPState
  visuals: VisualState
  vibeRooms: VibeRoom[]
  activeVibeRoomId: string | null
  connectors: Record<string, ConnectorStatus>
}
