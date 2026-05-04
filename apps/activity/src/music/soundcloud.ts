import { MockFirstMusicProvider } from './mockProvider'
import type { MusicProviderConfig } from './types'

export class SoundCloudProvider extends MockFirstMusicProvider {
  private readonly accessToken?: string

  constructor(config: MusicProviderConfig = {}) {
    super('soundcloud', 'SoundCloud')
    this.accessToken = config.accessToken
  }

  hasOfficialApiAccess() {
    return Boolean(this.accessToken)
  }
}
