import { ListPlus, Podcast } from 'lucide-react'
import { GlassButton } from '../../components/ui/GlassButton'
import { sendConbotEvent } from '../../core/socket'
import { useConbotStore } from '../../state/useConbotStore'
import type { MediaState } from './MediaTypes'

export function PodcastPanel({ media }: { media: MediaState }) {
  const optimisticPatch = useConbotStore((state) => state.optimisticPatch)
  const visuals = useConbotStore((state) => state.visuals)
  const item = media.activeItem?.kind === 'podcast' ? media.activeItem : media.queue.find((entry) => entry.kind === 'podcast') ?? null

  const enableAmbient = () => {
    optimisticPatch({ visuals: { ...visuals, mode: 'podcastAmbient', mediaMode: 'podcast', energy: 0.34, bpm: 68 } })
    sendConbotEvent('visuals:mode:set', { mode: 'podcastAmbient', mediaMode: 'podcast' })
  }

  return (
    <section className="podcast-panel">
      <div className="media-panel-header">
        <span><Podcast className="h-4 w-4" /> Podcast / RSS</span>
        <strong>rss / ambient</strong>
      </div>
      <div className="podcast-artwork">
        <Podcast className="h-12 w-12" />
      </div>
      <h2>{item?.title ?? 'No podcast episode selected'}</h2>
      <p>{item?.showName ?? 'RSS enclosure playback available when a valid feed item is selected'}</p>
      <div className="chapter-strip">
        {['Intro', 'Signal', 'Deep Dive', 'Outro'].map((chapter) => <span key={chapter}>{chapter}</span>)}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <GlassButton onClick={enableAmbient}>Ambient mode</GlassButton>
        <GlassButton disabled={!item} onClick={() => item && sendConbotEvent('media:queue:add', { item })}>
          <ListPlus className="h-4 w-4" />
          Add episode
        </GlassButton>
      </div>
      <div className="transcript-placeholder">Transcript placeholder / chapter metadata will appear here when provider data exists.</div>
    </section>
  )
}
