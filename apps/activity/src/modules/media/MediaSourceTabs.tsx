import { Film, Music2, Podcast, Radio, ShieldCheck } from 'lucide-react'
import { sendConbotEvent } from '../../core/socket'
import type { MediaSource } from './MediaTypes'

const sources: Array<{ source: MediaSource; label: string; icon: typeof Film }> = [
  { source: 'youtube', label: 'YouTube', icon: Film },
  { source: 'rss', label: 'Podcasts', icon: Podcast },
  { source: 'soundcloud', label: 'SoundCloud', icon: Radio },
  { source: 'spotify', label: 'Spotify meta', icon: ShieldCheck },
  { source: 'mock', label: 'Mock', icon: Music2 },
]

export function MediaSourceTabs({ activeSource, onSource }: { activeSource: MediaSource; onSource: (source: MediaSource) => void }) {
  const selectSource = (source: MediaSource) => {
    onSource(source)
    sendConbotEvent('media:source:set', { source })
  }

  return (
    <div className="media-source-tabs">
      {sources.map(({ source, label, icon: Icon }) => (
        <button key={source} type="button" className={activeSource === source ? 'is-active' : ''} onClick={() => selectSource(source)}>
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
