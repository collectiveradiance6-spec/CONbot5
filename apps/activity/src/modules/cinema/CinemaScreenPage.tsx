import { useState } from 'react'
import { Captions, Expand, Film, MonitorPlay, Moon, Search, ShieldCheck, Tv } from 'lucide-react'
import { RouteHeroHeader } from '../../components/layout/RouteHeroHeader'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { GlassCapsule } from '../../components/ui/GlassCapsule'
import { useConbotStore } from '../../state/useConbotStore'
import type { CinemaMode, CinemaQuality, CinemaSourceKind } from '../../state/types'

const MODES: { mode: CinemaMode; label: string }[] = [
  { mode: 'video',       label: 'Video'       },
  { mode: 'visualizer',  label: 'Visualizer'  },
  { mode: 'lyrics',      label: 'Lyrics'      },
  { mode: 'ambient',     label: 'Ambient'     },
  { mode: 'room-stage',  label: 'Room Stage'  },
  { mode: 'mini-player', label: 'Mini'        },
]

const SOURCE_KINDS: { source: CinemaSourceKind; label: string; note: string }[] = [
  { source: 'youtube-embed',         label: 'YouTube Embed',          note: 'Official iframe only' },
  { source: 'vimeo-embed',           label: 'Vimeo Embed',            note: 'Embed route only'    },
  { source: 'conbot-video-library',  label: 'CONbot5 Video Library',  note: 'Owned catalog'       },
  { source: 'admin-approved-upload', label: 'Admin Uploads',          note: 'Moderated vault'     },
  { source: 'visualizer',            label: 'Visualizer Mode',        note: 'Audio reactive'      },
  { source: 'lyrics',                label: 'Lyrics Theater',         note: 'Synced text'         },
]

const QUALITIES: CinemaQuality[] = ['auto', '4k', '1080p', '720p', '480p']

// Legal YouTube video IDs for demo embed (official music videos / live sessions)
const DEMO_VIDEOS = [
  { id: 'jfKfPfyJRdk', title: 'lofi hip hop radio - beats to relax/study to' },
  { id: 'DWcJFNfaw9c', title: 'Chillhop Music - Jazz & Lofi Hip Hop' },
  { id: '5qap5aO4i9A', title: 'lofi hip hop radio 📚' },
]

function CinemaModeTabs() {
  const cinema = useConbotStore(s => s.cinema)
  const optimisticPatch = useConbotStore(s => s.optimisticPatch)
  return (
    <div className="cinema-mode-tabs">
      {MODES.map(item => (
        <button key={item.mode} type="button"
          className={cinema.mode === item.mode ? 'is-active' : ''}
          onClick={() => optimisticPatch({ cinema: { ...cinema, mode: item.mode } })}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

function VideoScreen() {
  const cinema = useConbotStore(s => s.cinema)
  const optimisticPatch = useConbotStore(s => s.optimisticPatch)
  const [ytUrl, setYtUrl] = useState('')
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  function extractYouTubeId(url: string): string | null {
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/embed\/([^?]+)/,
    ]
    for (const p of patterns) {
      const m = url.match(p)
      if (m?.[1]) return m[1]
    }
    return null
  }

  function handleYtSubmit() {
    const id = extractYouTubeId(ytUrl)
    if (id) {
      setActiveVideo(id)
      optimisticPatch({ cinema: { ...cinema, mode: 'video', sourceKind: 'youtube-embed', syncStatus: 'synced' } })
    }
    setSearchOpen(false)
    setYtUrl('')
  }

  const showEmbed = cinema.mode === 'video' && (cinema.sourceKind === 'youtube-embed' || cinema.sourceKind === 'vimeo-embed') && activeVideo

  return (
    <GlassCard className={`video-glass-screen ${cinema.aspectRatio === '21:9' ? 'is-wide' : ''} ${cinema.theaterDim ? 'is-theater' : ''} relative overflow-hidden`}>
      {/* Search overlay */}
      <div className={`video-glass-search ${searchOpen ? 'opacity-100 translate-y-0' : ''}`} onClick={() => setSearchOpen(true)}>
        <Search className="h-4 w-4 flex-shrink-0" />
        {searchOpen ? (
          <input type="text" autoFocus placeholder="Paste YouTube URL..."
            value={ytUrl} onChange={e => setYtUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleYtSubmit()}
            className="flex-1 bg-transparent outline-none text-sm font-black text-[color:var(--conbot-text)] placeholder-[color:var(--conbot-muted)]"
            onClick={e => e.stopPropagation()} />
        ) : (
          <span>Search YouTube · paste link · or pick a demo below</span>
        )}
        {searchOpen && ytUrl && (
          <button type="button" onClick={handleYtSubmit}
            className="rounded-full bg-[color:var(--neon-cyan)] px-3 py-1 text-xs font-black text-black">
            Play
          </button>
        )}
      </div>

      {/* YouTube iframe */}
      {showEmbed ? (
        <iframe
          key={activeVideo}
          src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0`}
          title="CONbot5 Cinema"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0 rounded-[2rem]"
        />
      ) : (
        <>
          {/* Stage placeholder */}
          <div className="video-glass-stage">
            <div className="video-glass-icon">
              {cinema.mode === 'lyrics'     ? <Captions className="h-10 w-10" /> :
               cinema.mode === 'room-stage' ? <ShieldCheck className="h-10 w-10" /> :
                                              <MonitorPlay className="h-10 w-10" />}
            </div>
            <div>
              <GlassCapsule>PRISMATIC THEATER</GlassCapsule>
              <h2>{cinema.title}</h2>
              <p className="text-[color:var(--conbot-muted)] mt-2">Paste a YouTube link above · or pick a demo stream below</p>
            </div>
            {/* Demo stream buttons */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {DEMO_VIDEOS.map(v => (
                <button key={v.id} type="button" onClick={() => { setActiveVideo(v.id); optimisticPatch({ cinema: { ...cinema, mode: 'video', sourceKind: 'youtube-embed', syncStatus: 'synced', title: v.title } }) }}
                  className="rounded-full border border-white/16 bg-white/8 px-4 py-2 text-xs font-black text-[color:var(--conbot-text)] hover:bg-white/16 transition">
                  ▶ {v.title.slice(0, 32)}…
                </button>
              ))}
            </div>
          </div>

          {/* Waveform decoration */}
          <div className="cinema-wave-wrap" aria-hidden="true">
            {Array.from({ length: 36 }).map((_, i) => (
              <span key={i} style={{ height: `${14 + ((i * 9) % 48)}px` }} />
            ))}
          </div>
        </>
      )}

      {cinema.captionsEnabled && !showEmbed && (
        <div className="cinema-captions-layer">Captions ready · luminous theater text</div>
      )}
    </GlassCard>
  )
}

function SourceSelector() {
  const cinema = useConbotStore(s => s.cinema)
  const optimisticPatch = useConbotStore(s => s.optimisticPatch)
  return (
    <GlassCard className="p-5">
      <GlassCapsule>Sources</GlassCapsule>
      <div className="cinema-source-list">
        {SOURCE_KINDS.map(item => (
          <button key={item.source} type="button"
            className={cinema.sourceKind === item.source ? 'is-active' : ''}
            onClick={() => optimisticPatch({ cinema: { ...cinema, sourceKind: item.source } })}>
            <span>{item.label}</span>
            <small>{item.note}</small>
          </button>
        ))}
      </div>
    </GlassCard>
  )
}

function QualityBar() {
  const cinema = useConbotStore(s => s.cinema)
  const optimisticPatch = useConbotStore(s => s.optimisticPatch)
  return (
    <div className="cinema-control-strip">
      {QUALITIES.map(q => (
        <button key={q} type="button" className={cinema.quality === q ? 'is-active' : ''}
          onClick={() => optimisticPatch({ cinema: { ...cinema, quality: q } })}>{q}</button>
      ))}
      <button type="button" className={cinema.captionsEnabled ? 'is-active' : ''}
        onClick={() => optimisticPatch({ cinema: { ...cinema, captionsEnabled: !cinema.captionsEnabled } })}>
        Captions
      </button>
      <button type="button" className={cinema.theaterDim ? 'is-active' : ''}
        onClick={() => optimisticPatch({ cinema: { ...cinema, theaterDim: !cinema.theaterDim } })}>
        Theater
      </button>
      <button type="button" className={cinema.aspectRatio === '21:9' ? 'is-active' : ''}
        onClick={() => optimisticPatch({ cinema: { ...cinema, aspectRatio: cinema.aspectRatio === '16:9' ? '21:9' : '16:9' } })}>
        {cinema.aspectRatio}
      </button>
    </div>
  )
}

export function CinemaScreenPage() {
  const cinema = useConbotStore(s => s.cinema)
  return (
    <section className="cinema-screen-page">
      <RouteHeroHeader eyebrow="WATCH PARTY HUB" title="Cinema Screen"
        subtitle="YouTube embeds, compliant video, visualizers, lyrics, and room-stage modes."
        status={<GlassCapsule>{cinema.syncStatus}</GlassCapsule>}
        actions={<GlassButton variant="primary"><Expand className="h-4 w-4" /> Theater Mode</GlassButton>} />

      <GlassCard className="cinema-command-bar p-4">
        <span><Film className="h-4 w-4" /> {cinema.sourceKind}</span>
        <span><Tv className="h-4 w-4" /> {cinema.quality}</span>
        <span><Moon className="h-4 w-4" /> Dim {cinema.theaterDim ? 'on' : 'off'}</span>
      </GlassCard>

      <CinemaModeTabs />

      <main className="cinema-grid">
        <SourceSelector />
        <div className="cinema-center">
          <VideoScreen />
          <QualityBar />
        </div>
        <aside className="cinema-side-stack">
          <GlassCard className="p-5">
            <GlassCapsule>Watchlist</GlassCapsule>
            <div className="cinema-mini-list">
              <span>Prismatic Visualizer Set</span>
              <span>Room Stage: Synthwave</span>
              <span>Lyrics Theater Queue</span>
            </div>
          </GlassCard>
          <GlassCard className="p-5">
            <GlassCapsule>Recently Watched</GlassCapsule>
            <div className="cinema-mini-list">
              <span>Core Frequency Visual</span>
              <span>Dominion Signal Stage</span>
              <span>Ambient Ocean Loop</span>
            </div>
          </GlassCard>
        </aside>
      </main>
    </section>
  )
}
