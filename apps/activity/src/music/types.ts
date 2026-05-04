export type MusicProviderId = 'spotify' | 'youtube' | 'soundcloud' | 'local'
export type PlaybackState = 'idle' | 'playing' | 'paused'

export interface MusicTrack {
  id: string
  provider: MusicProviderId
  title: string
  artists: string[]
  album?: string
  durationMs: number
  artworkUrl?: string
  sourceUrl?: string
  previewUrl?: string
}

export interface MusicPlaylist {
  id: string
  provider: MusicProviderId
  title: string
  description?: string
  tracks: MusicTrack[]
}

export interface MusicMetadata {
  provider: MusicProviderId
  state: PlaybackState
  currentTrack: MusicTrack | null
  positionMs: number
  updatedAt: string
}

export interface MusicSearchOptions {
  limit?: number
}

export interface MusicProviderAdapter {
  id: MusicProviderId
  label: string
  search(query: string, options?: MusicSearchOptions): Promise<MusicTrack[]>
  getTrack(trackId: string): Promise<MusicTrack | null>
  getPlaylist(playlistId: string): Promise<MusicPlaylist | null>
  play(trackId: string): Promise<MusicMetadata>
  pause(): Promise<MusicMetadata>
  seek(positionMs: number): Promise<MusicMetadata>
  getMetadata(): Promise<MusicMetadata>
}

export interface MusicProviderConfig {
  accessToken?: string
  apiKey?: string
  fetcher?: typeof fetch
}
