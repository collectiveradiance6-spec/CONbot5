import { MockFirstMusicProvider } from './mockProvider'
import type { MusicProviderConfig } from './types'

export class SpotifyProvider extends MockFirstMusicProvider {
  private readonly accessToken?: string

  constructor(config: MusicProviderConfig = {}) {
    super('spotify', 'Spotify')
    this.accessToken = config.accessToken
  }

  hasOfficialApiAccess() {
    return Boolean(this.accessToken)
  }
}
