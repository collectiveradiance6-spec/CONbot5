export { LocalProvider } from './local'
export { MockFirstMusicProvider } from './mockProvider'
export { SoundCloudProvider } from './soundcloud'
export { SpotifyProvider } from './spotify'
export { YouTubeProvider } from './youtube'
export type {
  MusicMetadata,
  MusicPlaylist,
  MusicProviderAdapter,
  MusicProviderConfig,
  MusicProviderId,
  MusicSearchOptions,
  MusicTrack,
  PlaybackState,
} from './types'

import { LocalProvider } from './local'
import { SoundCloudProvider } from './soundcloud'
import { SpotifyProvider } from './spotify'
import type { MusicProviderAdapter, MusicProviderConfig, MusicProviderId } from './types'
import { YouTubeProvider } from './youtube'

export function createMusicProviders(config: Partial<Record<MusicProviderId, MusicProviderConfig>> = {}): Record<MusicProviderId, MusicProviderAdapter> {
  return {
    spotify: new SpotifyProvider(config.spotify),
    youtube: new YouTubeProvider(config.youtube),
    soundcloud: new SoundCloudProvider(config.soundcloud),
    local: new LocalProvider(),
  }
}
