// ─── Scope ──────────────────────────────────────────────────────────────────

export type ScopeKey = string // `${guildId}:${channelId}:${instanceId}`

export function makeScopeKey(guildId: string, channelId: string, instanceId = 'global'): ScopeKey {
  return `${guildId}:${channelId}:${instanceId}`
}

export function parseScopeKey(key: ScopeKey): { guildId: string; channelId: string; instanceId: string } {
  const [guildId, channelId, instanceId = 'global'] = key.split(':')
  return { guildId, channelId, instanceId }
}

// ─── Track ───────────────────────────────────────────────────────────────────

export type TrackSource = 'youtube' | 'soundcloud' | 'spotify' | 'apple' | 'rss' | 'local' | 'mock'

export type Track = {
  id: string
  title: string
  artist?: string
  artists?: string[]
  source: TrackSource
  durationMs: number
  positionMs?: number
  artworkUrl?: string
  bpm?: number
  genre?: string
  queueId?: string
  streamUrl?: string // backend-resolved, never exposed to client
  legalRoute?: 'embed' | 'direct' | 'rss' | 'local'
}

// ─── Playback ────────────────────────────────────────────────────────────────

export type LoopMode = 'off' | 'one' | 'all'

export type PlaybackState = {
  isPlaying: boolean
  volume: number
  loopMode: LoopMode
  shuffleEnabled: boolean
  positionMs: number
  durationMs: number
  currentTrack: Track | null
  queue: Track[]
}

// ─── Voice Room ──────────────────────────────────────────────────────────────

export type VoiceRoomConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export type RegularVoiceRoom = {
  voiceChannelId: string
  voiceChannelName: string
  guildId: string
  listenerCount: number
  botConnected: boolean
  connectionState: VoiceRoomConnectionState
  activeTrackId?: string
  activeQueueId?: string
  linkedTextChannelId?: string
}

export type PlayMode = 'everyone' | 'dj-only' | 'admin-only' | 'host-only'

export type RoomPlaybackPermissions = {
  playMode: PlayMode
  canGuestsQueue: boolean
  canGuestsSkip: boolean
  canGuestsControlVolume: boolean
  canGuestsStopPlayback: boolean
  voteSkipRequired: boolean
  voteSkipThresholdPercent: number
}

export type RoomQueueRules = {
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

export type RoomAudioDefaults = {
  defaultVolume: number
  volumeCap: number
  defaultEqPreset: string
  nightSafeMode: boolean
  volumeNormalization: boolean
  crossfadeMs: number
  voiceDuckingEnabled: boolean
  visualizerSensitivity: number
}

export type RegularRoomSettings = {
  permissions: RoomPlaybackPermissions
  queue: RoomQueueRules
  audio: RoomAudioDefaults
  cinemaAllowed: boolean
  syncedWatchAllowed: boolean
  lyricsAllowed: boolean
}

// ─── Vibe Room ───────────────────────────────────────────────────────────────

export type VibeRoomMapping = {
  guildId: string
  roomKey: string
  roomName: string
  voiceChannelId: string
  themeKey: string
  enabled: boolean
  studioPreset?: string
  visualMode?: string
  createdAt?: string
  updatedAt?: string
}

export type VibeRoomResolution = {
  mode: 'global' | 'vibe'
  vibeRoom: VibeRoomMapping | null
  themeKey: string
  guildId: string
  channelId: string
}

// ─── Cinema ──────────────────────────────────────────────────────────────────

export type CinemaState = {
  mode: 'video' | 'visualizer' | 'lyrics' | 'ambient' | 'room-stage' | 'mini-player'
  sourceKind: 'youtube-embed' | 'vimeo-embed' | 'conbot-video-library' | 'visualizer' | 'lyrics'
  sourceId?: string
  title: string
  quality: 'auto' | '4k' | '1080p' | '720p' | '480p'
  captionsEnabled: boolean
  theaterDim: boolean
  fullscreen: boolean
  miniPlayer: boolean
  syncStatus: 'synced' | 'syncing' | 'local-only' | 'offline'
  aspectRatio: '16:9' | '21:9'
  roomId?: string
}

// ─── Session ─────────────────────────────────────────────────────────────────

export type ConnectorStatus = 'connected' | 'missing_env' | 'disabled' | 'error' | 'not_configured'

export type ConnectorMap = Record<string, ConnectorStatus>

export type SessionMember = {
  userId: string
  socketId: string
  joinedAt: number
  isAdmin: boolean
}

// ─── Scoped State ────────────────────────────────────────────────────────────

export type ScopedActivityState = {
  scopeKey: ScopeKey
  guildId: string
  channelId: string
  instanceId: string

  // Members in this activity instance
  members: SessionMember[]

  // Regular voice room (foundation)
  voiceRoom: RegularVoiceRoom
  roomSettings: RegularRoomSettings

  // Playback
  playback: PlaybackState

  // Vibe room overlay (optional)
  vibeResolution: VibeRoomResolution

  // Cinema sync
  cinema: CinemaState

  // Connectors
  connectors: ConnectorMap

  // Timestamps
  createdAt: number
  updatedAt: number
}

// ─── Socket Events ────────────────────────────────────────────────────────────

// Client → Server
export type ClientToServerEvents = {
  'activity:join': (payload: {
    guildId: string
    channelId: string
    userId: string
    sessionId?: string
    instanceId?: string
    isAdmin?: boolean
  }) => void
  'activity:leave': (payload: { guildId: string; channelId: string; userId: string }) => void
  'playback:play': (payload: { scopeKey: string }) => void
  'playback:pause': (payload: { scopeKey: string }) => void
  'playback:skip': (payload: { scopeKey: string }) => void
  'playback:seek': (payload: { scopeKey: string; positionMs: number }) => void
  'playback:volume': (payload: { scopeKey: string; volume: number }) => void
  'playback:enqueue': (payload: { scopeKey: string; track: Track }) => void
  'playback:dequeue': (payload: { scopeKey: string; queueId: string }) => void
  'cinema:update': (payload: { scopeKey: string; patch: Partial<CinemaState> }) => void
  'state:request': (payload: { scopeKey?: string }) => void
  'room:settings:update': (payload: { scopeKey: string; settings: Partial<RegularRoomSettings> }) => void
  'vibe:select': (payload: { scopeKey: string; roomKey: string | null }) => void
}

// Server → Client
export type ServerToClientEvents = {
  'state:snapshot': (snapshot: ScopedActivityState) => void
  'state:patch': (patch: { scopeKey: string; changes: Partial<ScopedActivityState>; ts: number }) => void
  'playback:update': (payload: PlaybackState & { scopeKey: string; ts: number }) => void
  'presence:update': (payload: { scopeKey: string; members: SessionMember[]; ts: number }) => void
  'vibe:update': (payload: { scopeKey: string; resolution: VibeRoomResolution; ts: number }) => void
  'media:state': (payload: { scopeKey: string; status: string; ts: number }) => void
  'cinema:state': (payload: { scopeKey: string } & CinemaState) => void
  'room:settings': (payload: { scopeKey: string; settings: RegularRoomSettings }) => void
  'error': (payload: { code: string; message: string }) => void
}

export type InterServerEvents = Record<string, never>
export type SocketData = {
  userId: string
  guildId: string
  channelId: string
  instanceId: string
  scopeKey: ScopeKey
  isAdmin: boolean
}
