import { mockPlaylistFor, mockTracksFor } from './mockCatalog'
import type { MusicMetadata, MusicPlaylist, MusicProviderAdapter, MusicProviderId, MusicSearchOptions, MusicTrack } from './types'

export class MockFirstMusicProvider implements MusicProviderAdapter {
  readonly id: MusicProviderId
  readonly label: string

  protected currentTrack: MusicTrack | null = null
  protected positionMs = 0
  protected state: MusicMetadata['state'] = 'idle'
  protected readonly tracks: MusicTrack[]
  protected readonly playlist: MusicPlaylist

  constructor(id: MusicProviderId, label: string) {
    this.id = id
    this.label = label
    this.tracks = mockTracksFor(id)
    this.playlist = mockPlaylistFor(id)
  }

  async search(query: string, options?: MusicSearchOptions) {
    const normalizedQuery = query.trim().toLowerCase()
    const matches = normalizedQuery
      ? this.tracks.filter((track) => `${track.title} ${track.artists.join(' ')} ${track.album ?? ''}`.toLowerCase().includes(normalizedQuery))
      : this.tracks

    return matches.slice(0, options?.limit ?? 10)
  }

  async getTrack(trackId: string) {
    return this.tracks.find((track) => track.id === trackId || track.id.endsWith(`:${trackId}`)) ?? null
  }

  async getPlaylist(playlistId: string) {
    return playlistId === this.playlist.id || playlistId === 'conbot5-room-mix' ? this.playlist : null
  }

  async play(trackId: string) {
    this.currentTrack = (await this.getTrack(trackId)) ?? this.tracks[0] ?? null
    this.state = this.currentTrack ? 'playing' : 'idle'
    this.positionMs = 0

    return this.getMetadata()
  }

  async pause() {
    this.state = this.currentTrack ? 'paused' : 'idle'

    return this.getMetadata()
  }

  async seek(positionMs: number) {
    const durationMs = this.currentTrack?.durationMs ?? 0
    this.positionMs = Math.min(Math.max(positionMs, 0), durationMs)

    return this.getMetadata()
  }

  async getMetadata(): Promise<MusicMetadata> {
    return {
      provider: this.id,
      state: this.state,
      currentTrack: this.currentTrack,
      positionMs: this.positionMs,
      updatedAt: new Date().toISOString(),
    }
  }
}
