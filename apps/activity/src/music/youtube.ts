import { MockFirstMusicProvider } from './mockProvider'
import type { MusicProviderConfig } from './types'

export class YouTubeProvider extends MockFirstMusicProvider {
  private readonly apiKey?: string

  constructor(config: MusicProviderConfig = {}) {
    super('youtube', 'YouTube')
    this.apiKey = config.apiKey
  }

  hasOfficialApiAccess() {
    return Boolean(this.apiKey)
  }
}
