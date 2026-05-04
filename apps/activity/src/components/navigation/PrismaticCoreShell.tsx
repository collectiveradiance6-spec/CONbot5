import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Captions, Clapperboard, History, ListMusic, Music2, Search, ServerCog, Settings, ShieldCheck, SlidersHorizontal, Upload, User, Waves } from 'lucide-react'
import { useConbotStore } from '../../state/useConbotStore'
import type { RouteKey } from '../../state/types'
import type { ActivityShellContext } from '../layout/AppShell'
import { buildCoreFaces, CoreFaceLayer, type CoreFace, type CoreFaceKey } from './CoreFaceLayer'
import { CommandIslandPulseRail } from './CommandIslandPulseRail'
import { CommandIslandRouteRail, type CommandRoute } from './CommandIslandRouteRail'
import { CommandIslandStatusRail } from './CommandIslandStatusRail'

const routes: CommandRoute[] = [
  { to: '/', label: 'Dominion', icon: Music2, route: 'home', routeLabel: 'DOMINION DASHBOARD' },
  { to: '/library-manager', label: 'Vault', icon: Upload, route: 'library', routeLabel: 'MEDIA VAULT' },
  { to: '/rooms', label: 'Portals', icon: Waves, route: 'rooms', routeLabel: 'VIBE ROOM PORTALS' },
  { to: '/queue', label: 'Queue', icon: ListMusic, route: 'queue', routeLabel: 'PRISMATIC MEDIA QUEUE' },
  { to: '/search', label: 'CONlight', icon: Search, route: 'media', routeLabel: 'CONLIGHT SEARCH' },
  { to: '/equalizer', label: 'EQ Studio', icon: SlidersHorizontal, route: 'equalizer', routeLabel: 'EQ STUDIO' },
  { to: '/watch-party', label: 'Watch', icon: Clapperboard, route: 'cinema', routeLabel: 'WATCH PARTY HUB' },
  { to: '/ledger', label: 'Ledger', icon: History, route: 'history', routeLabel: 'CONSHARE LEDGER' },
  { to: '/system', label: 'Terminal', icon: ServerCog, route: 'system', routeLabel: 'CORE TERMINAL' },
  { to: '/profile', label: 'Nexus', icon: User, route: 'profile', routeLabel: 'PROFILE-NEXUS' },
  { to: '/settings', label: 'Settings', icon: Settings, route: 'settings', routeLabel: 'SYSTEM SETTINGS' },
  { to: '/lyrics', label: 'Lyrics', icon: Captions, route: 'lyrics', routeLabel: 'LYRICS' },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, route: 'admin', routeLabel: 'ADMIN CONSOLE' },
]

function routeForPath(pathname: string) {
  return routes.find((route) => (route.to === '/' ? pathname === '/' : pathname.startsWith(route.to))) ?? routes[0]
}

function faceForRoute(route: RouteKey): CoreFaceKey {
  if (route === 'queue') return 'queue'
  if (route === 'media') return 'search'
  if (route === 'rooms') return 'room'
  if (route === 'cinema') return 'cinema'
  if (route === 'lyrics') return 'lyrics'
  if (route === 'profile') return 'profile'
  if (route === 'history') return 'history'
  if (route === 'library') return 'library'
  if (route === 'system' || route === 'live') return 'status'
  if (route === 'admin') return 'adminAlert'
  if (route === 'studio' || route === 'visuals' || route === 'equalizer') return 'ai'
  return 'nowPlaying'
}

export function PrismaticCoreShell({ context }: { context: ActivityShellContext }) {
  const location = useLocation()
  const navigate = useNavigate()
  const route = useMemo(() => routeForPath(location.pathname), [location.pathname])
  const setActiveRoute = useConbotStore((state) => state.setActiveRoute)
  const currentTrack = useConbotStore((state) => state.currentTrack)
  const queue = useConbotStore((state) => state.queue)
  const isPlaying = useConbotStore((state) => state.isPlaying)
  const session = useConbotStore((state) => state.session)
  const activeVibeRoomId = useConbotStore((state) => state.activeVibeRoomId)
  const [expanded, setExpanded] = useState(false)
  const [activeFace, setActiveFace] = useState<CoreFaceKey>(faceForRoute(route.route))

  const vibe = context.activityContext?.resolution.vibeRoom
  const activeVibeName = vibe?.roomName || activeVibeRoomId || 'Global Activity'
  const activityMode = activeVibeRoomId || vibe ? 'Vibe Room Active' : 'Global Activity'
  const isAdmin = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('admin') === 'true'
  const queueCount = queue.length
  const nextTrackTitle = queue[0]?.title || ''

  const faces = useMemo(
    () =>
      buildCoreFaces({
        currentTrack,
        status: context.connectionStatus,
        activeVibeName,
        queueCount,
        nextTrackTitle,
        listeners: session.listeners,
        latency: session.latencyMs,
        expanded,
      }),
    [activeVibeName, context.connectionStatus, currentTrack, expanded, nextTrackTitle, queueCount, session.latencyMs, session.listeners],
  )

  useEffect(() => {
    setActiveRoute(route.route)
    setActiveFace(faceForRoute(route.route))
  }, [route.route, setActiveRoute])

  useEffect(() => {
    if (context.connectionStatus === 'Offline' || context.connectionStatus === 'Reconnecting') {
      setActiveFace('status')
      return
    }
    if (isPlaying) setActiveFace('nowPlaying')
  }, [context.connectionStatus, isPlaying])

  useEffect(() => {
    if (queueCount > 0) {
      setActiveFace('queue')
      const timer = window.setTimeout(() => {
        if (isPlaying) setActiveFace('nowPlaying')
      }, 3200)
      return () => window.clearTimeout(timer)
    }
  }, [queueCount, isPlaying])

  const activateFace = (face: CoreFace) => {
    if (face.key === 'collapse') {
      setExpanded(false)
      setActiveFace(isPlaying ? 'nowPlaying' : 'status')
      return
    }
    setExpanded(true)
    if (face.route !== location.pathname) navigate(face.route)
  }

  return (
    <section
      className={`prismatic-core-shell dynamic-command-island ${expanded ? 'is-expanded' : 'is-compact'} ${context.connectionStatus === 'Offline' ? 'is-disconnected' : ''}`}
      data-face={activeFace}
      aria-label="CONbot5 Prismatic FaceDeck System"
    >
      <div className="core-glass-shell" aria-hidden="true" />
      <div className="audio-reactive-glow" aria-hidden="true" />
      <CoreFaceLayer
        activeFace={activeFace}
        faces={faces}
        expanded={expanded}
        isPlaying={isPlaying}
        onFaceChange={setActiveFace}
        onFaceActivate={activateFace}
      />
      <div className="command-deck-layer" data-open={expanded ? 'true' : 'false'}>
        <div className="core-nav-rail">
          <CommandIslandRouteRail routes={routes.filter((item) => isAdmin || item.route !== 'admin')} onRoute={setActiveRoute} />
        </div>
        <div className="core-page-viewport">
          <CommandIslandStatusRail status={context.connectionStatus} mode={activityMode} latency={session.latencyMs} listeners={session.listeners} />
          <CommandIslandPulseRail active={isPlaying} target="Activity" queueCount={queueCount} />
        </div>
      </div>
    </section>
  )
}
