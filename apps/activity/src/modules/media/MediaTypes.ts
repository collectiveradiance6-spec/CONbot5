export type MediaSource = 'youtube' | 'soundcloud' | 'spotify' | 'apple' | 'rss' | 'local' | 'mock'
export type MediaKind = 'audio' | 'video' | 'podcast' | 'live'
export type VideoPanelState = 'ready' | 'playing' | 'paused' | 'missing_env' | 'provider_unsupported' | 'metadata_only' | 'error'

export type ProviderCapability = {
  source: MediaSource
  audio: boolean
  video: boolean
  podcast: boolean
  metadataOnly: boolean
  requiresEnv: string[]
  status: 'ready' | 'missing_env' | 'disabled' | 'unsupported' | 'error'
}

export type MediaItem = {
  id: string
  source: MediaSource
  kind: MediaKind
  title: string
  creator?: string
  showName?: string
  thumbnailUrl?: string
  artworkUrl?: string
  durationMs?: number
  url?: string
  embedUrl?: string
  metadataOnly?: boolean
}

export type MediaState = {
  source: MediaSource
  kind: MediaKind
  status: VideoPanelState
  activeItem: MediaItem | null
  queue: MediaItem[]
  providers: ProviderCapability[]
}
