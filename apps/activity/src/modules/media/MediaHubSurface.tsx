import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { GlassCapsule } from '../../components/ui/GlassCapsule'
import { apiRequest } from '../../lib/apiClient'
import { useConbotStore } from '../../state/useConbotStore'
import { VisualizerSurface } from '../visuals/VisualizerSurface'
import { MediaQueuePanel } from './MediaQueuePanel'
import { MediaSourceTabs } from './MediaSourceTabs'
import type { MediaItem, MediaSource, MediaState } from './MediaTypes'
import { PodcastPanel } from './PodcastPanel'
import { VideoPanel } from './VideoPanel'

const fallbackMedia: MediaState = {
  source: 'mock',
  kind: 'video',
  status: 'ready',
  activeItem: null,
  queue: [],
  providers: [],
}

export function MediaHubSurface() {
  const [query, setQuery] = useState('cinematic synthwave podcast')
  const [media, setMedia] = useState<MediaState>(fallbackMedia)
  const optimisticPatch = useConbotStore((state) => state.optimisticPatch)

  useEffect(() => {
    apiRequest<MediaState>('/api/media/status', { mockData: fallbackMedia }).then((data) => {
      setMedia(data)
      optimisticPatch({ media: { source: data.source, kind: data.kind, status: data.status, activeItem: data.activeItem as never } })
    })
  }, [optimisticPatch])

  const setSource = async (source: MediaSource) => {
    const data = await apiRequest<MediaState>('/api/media/source', {
      method: 'POST',
      body: JSON.stringify({ source }),
      mockData: { ...media, source },
    })
    setMedia(data)
  }

  const search = async () => {
    const data = await apiRequest<{ results: MediaItem[] }>(`/api/media/search?q=${encodeURIComponent(query)}`, {
      mockData: { results: media.queue },
    })
    setMedia((current) => ({ ...current, queue: data.results }))
  }

  return (
    <div className="media-hub-surface">
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <GlassCapsule>Media Hub</GlassCapsule>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-[color:var(--text-main)]">Video, podcast, and legal media routing</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[color:var(--text-muted)]">
              YouTube embed, RSS podcast, SoundCloud, uploads, and metadata-only provider routes are labeled by capability before playback.
            </p>
          </div>
          <GlassCapsule>{media.source} / {media.status}</GlassCapsule>
        </div>
        <MediaSourceTabs activeSource={media.source} onSource={setSource} />
        <div className="media-search-row">
          <Search className="h-4 w-4" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search video, podcast, SoundCloud, or RSS route" />
          <GlassButton variant="primary" onClick={search}>Search</GlassButton>
        </div>
      </GlassCard>

      <main className="media-grid">
        <VideoPanel media={media} />
        <PodcastPanel media={media} />
        <MediaQueuePanel media={media} />
        <VisualizerSurface preferredMode={media.kind === 'podcast' ? 'podcastAmbient' : media.kind === 'video' ? 'videoReactive' : undefined} />
      </main>
    </div>
  )
}
