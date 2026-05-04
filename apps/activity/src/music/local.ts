import { MockFirstMusicProvider } from './mockProvider'

export class LocalProvider extends MockFirstMusicProvider {
  constructor() {
    super('local', 'Local Library')
  }
}
