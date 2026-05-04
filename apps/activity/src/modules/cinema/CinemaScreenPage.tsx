import { Captions, Expand, Film, MonitorPlay, Moon, Search, ShieldCheck, Tv } from 'lucide-react'
import { RouteHeroHeader } from '../../components/layout/RouteHeroHeader'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { GlassCapsule } from '../../components/ui/GlassCapsule'
import { useConbotStore } from '../../state/useConbotStore'
import type { CinemaMode, CinemaQuality, CinemaSourceKind } from '../../state/types'

const modes: { mode: CinemaMode; label: string }[] = [
  { mode: 'video', label: 'Video' },
  { mode: 'visualizer', label: 'Visualizer' },
  { mode: 'lyrics', label: 'Lyrics' },
  { mode: 'ambient', label: 'Ambient' },
  { mode: 'room-stage', label: 'Room Stage' },
  { mode: 'mini-player', label: 'Mini' },
]

const sourceKinds: { source: CinemaSourceKind; label: string; note: string }[] = [
  { source: 'conbot-video-library', label: 'CONbot5 Video Library', note: 'Owned / approved catalog' },
  { source: 'admin-approved-upload', label: 'Admin Uploads', note: 'Moderated media vault' },
  { source: 'youtube-embed', label: 'Official YouTube Embed', note: 'Iframe route only' },
  { source: 'vimeo-embed', label: 'Official Vimeo Embed', note: 'Embed route only' },
  { source: 'personal-media-server', label: 'Personal Media Server', note: 'Connector placeholder' },
  { source: 'external-link', label: 'External Watch Link', note: 'Launch link only' },
  { source: 'visualizer', label: 'Visualizer Mode', note: 'Audio reactive stage' },
  { source: 'lyrics', label: 'Lyrics Theater', note: 'Synced/unsynced text' },
]

const qualities: CinemaQuality[] = ['auto', '4k', '1080p', '720p', '480p']

function CinemaModeTabs() {
  const cinema = useConbotStore((state) => state.cinema)
  const optimisticPatch = useConbotStore((state) => state.optimisticPatch)
  return (
    <div className="cinema-mode-tabs">
      {modes.map((item) => (
        <button
          key={item.mode}
          type="button"
          className={cinema.mode === item.mode ? 'is-active' : ''}
          onClick={() => optimisticPatch({ cinema: { ...cinema, mode: item.mode } })}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function CinemaSourceSelector() {
  const cinema = useConbotStore((state) => state.cinema)
  const optimisticPatch = useConbotStore((state) => state.optimisticPatch)
  return (
    <GlassCard className="cinema-side-panel p-5">
      <GlassCapsule>Sources</GlassCapsule>
      <div className="cinema-source-list">
        {sourceKinds.map((item) => (
          <button
            key={item.source}
            type="button"
            className={cinema.sourceKind === item.source ? 'is-active' : ''}
            onClick={() => optimisticPatch({ cinema: { ...cinema, sourceKind: item.source } })}
          >
            <span>{item.label}</span>
            <small>{item.note}</small>
          </button>
        ))}
      </div>
    </GlassCard>
  )
}

function CinemaQualityControls() {
  const cinema = useConbotStore((state) => state.cinema)
  const optimisticPatch = useConbotStore((state) => state.optimisticPatch)
  return (
    <div className="cinema-control-strip">
      {qualities.map((quality) => (
        <button
          key={quality}
          type="button"
          className={cinema.quality === quality ? 'is-active' : ''}
          onClick={() => optimisticPatch({ cinema: { ...cinema, quality } })}
        >
          {quality}
        </button>
      ))}
      <button type="button" className={cinema.captionsEnabled ? 'is-active' : ''} onClick={() => optimisticPatch({ cinema: { ...cinema, captionsEnabled: !cinema.captionsEnabled } })}>
        Captions
      </button>
      <button type="button" className={cinema.theaterDim ? 'is-active' : ''} onClick={() => optimisticPatch({ cinema: { ...cinema, theaterDim: !cinema.theaterDim } })}>
        Theater
      </button>
      <button type="button" className={cinema.aspectRatio === '21:9' ? 'is-active' : ''} onClick={() => optimisticPatch({ cinema: { ...cinema, aspectRatio: cinema.aspectRatio === '16:9' ? '21:9' : '16:9' } })}>
        {cinema.aspectRatio}
      </button>
    </div>
  )
}

function CinemaCaptionsLayer() {
  const cinema = useConbotStore((state) => state.cinema)
  if (!cinema.captionsEnabled) return null
  return <div className="cinema-captions-layer">Captions ready · luminous theater text</div>
}

function VideoGlassScreen() {
  const cinema = useConbotStore((state) => state.cinema)
  return (
    <GlassCard className={`video-glass-screen ${cinema.aspectRatio === '21:9' ? 'is-wide' : ''} ${cinema.theaterDim ? 'is-theater' : ''}`}>
      <div className="video-glass-search">
        <Search className="h-4 w-4" />
        <span>Search full video titles, visualizers, lyrics, and room stages</span>
      </div>
      <div className="video-glass-stage">
        <div className="video-glass-icon">
          {cinema.mode === 'lyrics' ? <Captions className="h-10 w-10" /> : cinema.mode === 'room-stage' ? <ShieldCheck className="h-10 w-10" /> : <MonitorPlay className="h-10 w-10" />}
        </div>
        <div>
          <GlassCapsule>PRISMATIC THEATER</GlassCapsule>
          <h2>{cinema.title}</h2>
          <p>{cinema.subtitle || 'Floating refractive glass screen / compliant source route'}</p>
        </div>
      </div>
      <CinemaCaptionsLayer />
      <div className="cinema-wave-wrap" aria-hidden="true">
        {Array.from({ length: 36 }).map((_, index) => <span key={index} style={{ height: `${14 + ((index * 9) % 48)}px` }} />)}
      </div>
    </GlassCard>
  )
}

function WatchlistPanel() {
  return (
    <GlassCard className="cinema-side-panel p-5">
      <GlassCapsule>Watchlist</GlassCapsule>
      <div className="cinema-mini-list">
        <span>Prismatic Visualizer Set</span>
        <span>Room Stage: Synthwave</span>
        <span>Lyrics Theater Queue</span>
      </div>
    </GlassCard>
  )
}

function RecentlyWatchedPanel() {
  return (
    <GlassCard className="cinema-side-panel p-5">
      <GlassCapsule>Recently Watched</GlassCapsule>
      <div className="cinema-mini-list">
        <span>Core Frequency Visual</span>
        <span>Dominion Signal Stage</span>
        <span>Ambient Ocean Loop</span>
      </div>
    </GlassCard>
  )
}

export function CinemaScreenPage() {
  const cinema = useConbotStore((state) => state.cinema)
  return (
    <section className="cinema-screen-page">
      <RouteHeroHeader
        eyebrow="CINEMA CORE"
        title="Cinema Screen"
        subtitle="A compliant glass theater for approved video, official embeds, lyrics, visualizers, and room-stage modes."
        status={<GlassCapsule>{cinema.syncStatus}</GlassCapsule>}
        actions={<GlassButton variant="primary"><Expand className="h-4 w-4" /> Fullscreen-ready</GlassButton>}
      />
      <GlassCard className="cinema-command-bar p-4">
        <span><Film className="h-4 w-4" /> {cinema.sourceKind}</span>
        <span><Tv className="h-4 w-4" /> {cinema.quality}</span>
        <span><Moon className="h-4 w-4" /> Dim {cinema.theaterDim ? 'on' : 'off'}</span>
      </GlassCard>
      <CinemaModeTabs />
      <main className="cinema-grid">
        <CinemaSourceSelector />
        <div className="cinema-center">
          <VideoGlassScreen />
          <CinemaQualityControls />
        </div>
        <aside className="cinema-side-stack">
          <WatchlistPanel />
          <RecentlyWatchedPanel />
        </aside>
      </main>
    </section>
  )
}
