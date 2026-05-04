import { useEffect, useMemo, useRef, useState } from 'react'
import { Captions, ChevronLeft, ChevronRight, Clapperboard, ListMusic, Radio, Search, ServerCog, SlidersHorizontal, Sparkles, UserRound, Waves } from 'lucide-react'
import type { WebSocketConnectionStatus } from '../../config/env'
import { BRAND } from '../../content/brandCopy'
import type { Track } from '../../state/types'

export type CoreFaceKey =
  | 'nowPlaying'
  | 'status'
  | 'room'
  | 'queue'
  | 'ai'
  | 'search'
  | 'cinema'
  | 'lyrics'
  | 'profile'
  | 'history'
  | 'library'
  | 'adminAlert'
  | 'collapse'

export type CoreFace = {
  key: CoreFaceKey
  eyebrow: string
  title: string
  detail: string
  meta: string
  tone: 'cyan' | 'violet' | 'pink' | 'gold' | 'green' | 'danger'
  icon: typeof Radio
  route: string
}

type CoreFaceLayerProps = {
  activeFace: CoreFaceKey
  faces: CoreFace[]
  expanded: boolean
  isPlaying: boolean
  onFaceChange: (face: CoreFaceKey) => void
  onFaceActivate: (face: CoreFace) => void
}

export function buildCoreFaces({
  currentTrack,
  status,
  activeVibeName,
  queueCount,
  nextTrackTitle,
  listeners,
  latency,
  expanded,
}: {
  currentTrack: Track | null
  status: WebSocketConnectionStatus
  activeVibeName: string
  queueCount: number
  nextTrackTitle: string
  listeners: number
  latency: number
  expanded: boolean
}): CoreFace[] {
  const title = currentTrack?.title || BRAND.matrixLabel
  const artist = currentTrack?.artist || currentTrack?.creator || BRAND.productName
  const baseFaces: CoreFace[] = [
    {
      key: 'nowPlaying',
      eyebrow: 'Dominion Dashboard',
      title,
      detail: `${artist} / ${activeVibeName}`,
      meta: `${listeners || 0} listening`,
      tone: 'cyan',
      icon: Radio,
      route: '/now',
    },
    {
      key: 'queue',
      eyebrow: 'Prismatic Media Queue',
      title: `${queueCount} tracks loaded`,
      detail: nextTrackTitle ? `Next: ${nextTrackTitle}` : 'Awaiting queue command',
      meta: 'Vote skip available',
      tone: 'gold',
      icon: ListMusic,
      route: '/queue',
    },
    {
      key: 'room',
      eyebrow: 'Vibe Room Portals',
      title: activeVibeName,
      detail: activeVibeName === 'Global Activity' ? 'Normal voice-channel activity mode' : 'Room theme active',
      meta: `${listeners || 0} listeners`,
      tone: 'violet',
      icon: Waves,
      route: '/rooms',
    },
    {
      key: 'status',
      eyebrow: 'Core Terminal',
      title: status === 'Connected' ? 'Prismatic Core Online' : status === 'Reconnecting' ? 'Core Reconnecting' : 'Core Attention',
      detail: `Voice linked / Queue synced / ${status}`,
      meta: `${latency || 0}ms latency`,
      tone: status === 'Offline' ? 'danger' : 'green',
      icon: ServerCog,
      route: '/system',
    },
    {
      key: 'ai',
      eyebrow: 'EQ Studio',
      title: 'Prismatic mix controls',
      detail: 'Equalizer, room tone, crossfade, spatial spread, and visualizer response',
      meta: 'Audio control',
      tone: 'pink',
      icon: SlidersHorizontal,
      route: '/equalizer',
    },
    {
      key: 'search',
      eyebrow: 'CONlight Search',
      title: 'Find title, playlist, artist, or room mood',
      detail: 'Music, video, creator, album, and saved-media lookup',
      meta: 'Tap to focus media',
      tone: 'cyan',
      icon: Search,
      route: '/search',
    },
    {
      key: 'cinema',
      eyebrow: 'Watch Party Hub',
      title: 'Prismatic Theater',
      detail: 'Video, visualizer, lyrics, ambient, and room-stage modes',
      meta: 'Glass screen',
      tone: 'violet',
      icon: Clapperboard,
      route: '/watch-party',
    },
    {
      key: 'lyrics',
      eyebrow: 'Lyrics Theater',
      title: 'Track companion ready',
      detail: 'Synced-ready layout with luminous text fallback',
      meta: 'Lyrics',
      tone: 'pink',
      icon: Captions,
      route: '/lyrics',
    },
    {
      key: 'profile',
      eyebrow: 'ProFile-Nexus',
      title: 'Identity and social connector portal',
      detail: 'Presence, roles, rooms, preferences, and privacy',
      meta: 'User',
      tone: 'green',
      icon: UserRound,
      route: '/profile',
    },
    {
      key: 'history',
      eyebrow: 'CONshare Ledger',
      title: 'Shared media activity ledger',
      detail: 'Playback, search, rooms, playlists, cinema, and lyrics',
      meta: 'Recall',
      tone: 'gold',
      icon: ListMusic,
      route: '/ledger',
    },
    {
      key: 'library',
      eyebrow: 'Media Vault',
      title: 'Saved media library and guild playlists',
      detail: 'Uploads, approvals, metadata, room tags, and public-safe flags',
      meta: 'Vault',
      tone: 'cyan',
      icon: Search,
      route: '/library-manager',
    },
    {
      key: 'adminAlert',
      eyebrow: 'Admin Alert',
      title: 'Operational control layer',
      detail: 'Regular voice rooms, Vibe Rooms, queue, media, roles, and logs',
      meta: 'Admin',
      tone: 'danger',
      icon: ServerCog,
      route: '/admin',
    },
  ]

  if (!expanded) return baseFaces

  return [
    ...baseFaces,
    {
      key: 'collapse',
      eyebrow: 'Collapse Core',
      title: 'Return to live face',
      detail: 'Compress the command deck back into sealed mode',
      meta: 'Close deck',
      tone: 'violet',
      icon: Sparkles,
      route: '#collapse',
    },
  ]
}

export function CoreFaceLayer({
  activeFace,
  faces,
  expanded,
  isPlaying,
  onFaceChange,
  onFaceActivate,
}: CoreFaceLayerProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [interacting, setInteracting] = useState(false)
  const activeIndex = Math.max(0, faces.findIndex((face) => face.key === activeFace))
  const active = faces[activeIndex] ?? faces[0]

  const cycle = (direction: 1 | -1) => {
    const next = (activeIndex + direction + faces.length) % faces.length
    onFaceChange(faces[next].key)
  }

  useEffect(() => {
    if (interacting || expanded) return
    const timer = window.setInterval(() => cycle(1), isPlaying ? 8500 : 7600)
    return () => window.clearInterval(timer)
  }, [activeIndex, expanded, interacting, isPlaying, faces])

  const handleWheel = (event: React.WheelEvent) => {
    if (Math.abs(event.deltaX) + Math.abs(event.deltaY) < 12) return
    setInteracting(true)
    cycle(event.deltaY > 0 || event.deltaX > 0 ? 1 : -1)
    window.setTimeout(() => setInteracting(false), 1200)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') cycle(1)
    if (event.key === 'ArrowLeft') cycle(-1)
    if (event.key === 'Enter' && active) onFaceActivate(active)
  }

  const toneClass = useMemo(() => `core-face-layer tone-${active?.tone ?? 'cyan'}`, [active?.tone])

  return (
    <div className={toneClass} onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}>
      <button className="core-face-arrow" type="button" aria-label="Previous CONbot5 face" onClick={() => cycle(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        ref={viewportRef}
        className="core-face-viewport"
        role="button"
        tabIndex={0}
        onClick={() => active && onFaceActivate(active)}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      >
        <div className="core-face-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {faces.map((face) => {
            const Icon = face.icon
            const selected = face.key === activeFace
            return (
              <article key={face.key} className="core-face" data-active={selected ? 'true' : 'false'} data-face={face.key}>
                <div className="core-face-orb" aria-hidden="true">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="core-face-copy">
                  <span>{face.eyebrow}</span>
                  <strong>{face.title}</strong>
                  <small>{face.detail}</small>
                </div>
                <div className="core-face-meta">
                  <span>{face.meta}</span>
                  <i aria-hidden="true" />
                </div>
              </article>
            )
          })}
        </div>
      </div>
      <button className="core-face-arrow" type="button" aria-label="Next CONbot5 face" onClick={() => cycle(1)}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
