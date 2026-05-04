import type { MusicPlaylist, MusicProviderId, MusicTrack } from './types'

const sharedTracks: MusicTrack[] = [
  {
    id: 'mock-conbot5-core',
    provider: 'local',
    title: 'Prismatic Radiance Matrix',
    artists: ['CONbot5'],
    album: 'Dominion Audio Grid',
    durationMs: 242000,
    artworkUrl: '/conbot5-logo-source.png',
  },
  {
    id: 'glass-current',
    provider: 'local',
    title: 'Glass Current',
    artists: ['CONbot5'],
    album: 'Activity Sessions',
    durationMs: 196000,
    artworkUrl: '/src/assets/hero.png',
  },
  {
    id: 'late-room-signal',
    provider: 'local',
    title: 'Late Room Signal',
    artists: ['Milo North'],
    album: 'Voice Channel Sketches',
    durationMs: 245000,
    artworkUrl: '/src/assets/hero.png',
  },
]

export function mockTracksFor(provider: MusicProviderId): MusicTrack[] {
  return sharedTracks.map((track) => ({
    ...track,
    id: `${provider}:${track.id}`,
    provider,
    sourceUrl: provider === 'local' ? track.sourceUrl : undefined,
  }))
}

export function mockPlaylistFor(provider: MusicProviderId): MusicPlaylist {
  return {
    id: `${provider}:conbot5-room-mix`,
    provider,
    title: 'CONbot5 Room Mix',
    description: 'Mock-first playlist for dashboard development.',
    tracks: mockTracksFor(provider),
  }
}
