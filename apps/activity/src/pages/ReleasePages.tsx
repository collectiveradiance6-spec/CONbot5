import { History, ListMusic, Music2, Search, ServerCog, ShieldCheck, SlidersHorizontal, Upload, User } from 'lucide-react'
import { RouteHeroHeader } from '../components/layout/RouteHeroHeader'
import { GlassCard } from '../components/ui/GlassCard'
import { GlassCapsule } from '../components/ui/GlassCapsule'
import { useConbotStore } from '../state/useConbotStore'

function ReleasePageShell({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  items,
}: {
  eyebrow: string
  title: string
  subtitle: string
  icon: typeof Music2
  items: string[]
}) {
  return (
    <section className="release-page-shell">
      <RouteHeroHeader eyebrow={eyebrow} title={title} subtitle={subtitle} status={<GlassCapsule>Backend-ready surface</GlassCapsule>} />
      <GlassCard className="release-feature-panel p-6">
        <div className="release-feature-head">
          <div className="release-feature-icon"><Icon className="h-6 w-6" /></div>
          <div>
            <GlassCapsule>{eyebrow}</GlassCapsule>
            <h2>{title}</h2>
          </div>
        </div>
        <div className="release-feature-grid">
          {items.map((item) => <span key={item}>{item}</span>)}
        </div>
      </GlassCard>
    </section>
  )
}

export function NowPlayingPage() {
  const track = useConbotStore((state) => state.currentTrack)
  return (
    <ReleasePageShell
      eyebrow="NOW PLAYING"
      title={track?.title || 'Prismatic Radiance Matrix'}
      subtitle={`${track?.artist || 'CONbot5'} · artwork reactor, waveform, route actions, lyrics, cinema, and source controls.`}
      icon={Music2}
      items={['Artwork Reactor', 'Animated waveform', 'Seek + controls', 'Open Lyrics', 'Open Cinema', 'Route to Vibe Room']}
    />
  )
}

export function SearchPage() {
  return <ReleasePageShell eyebrow="CONLIGHT SEARCH" title="CONlight Search" subtitle="Search music, videos, playlists, creators, albums, saved media, imported links, and CONbot5-owned sources." icon={Search} items={['Spotlight search', 'Source filters', 'Play now', 'Add to queue', 'Add to portal', 'History capture']} />
}

export function PlaylistsPage() {
  return <ReleasePageShell eyebrow="MEDIA VAULT" title="Guild Playlists" subtitle="Saved media library, guild playlists, approved imports, and playlist routing without unsupported extraction." icon={ListMusic} items={['Paste URL', 'Import metadata', 'Save playlist', 'Convert to queue', 'Portal playlist', 'Route warnings']} />
}

export function EqualizerPage() {
  return <ReleasePageShell eyebrow="EQ STUDIO" title="EQ Studio" subtitle="Audio customization for equalizer presets, bass, treble, spatial audio, normalization, crossfade, reverb, and visualizer response." icon={SlidersHorizontal} items={['Bass', 'Low Mid', 'Mid', 'Treble', 'Limiter', 'Room profiles']} />
}

export function LyricsPage() {
  return <ReleasePageShell eyebrow="LYRICS" title="Lyrics Theater" subtitle="Synced-ready and unsynced lyric companion with cinema overlay support." icon={Music2} items={['Current line', 'Unsynced fallback', 'Text size', 'Cinema Lyrics', 'Attribution', 'Unavailable state']} />
}

export function ProfilePage() {
  return <ReleasePageShell eyebrow="PROFILE-NEXUS" title="ProFile-Nexus" subtitle="Personal profile portal for avatar, bio, platforms, Discord connectors, friends, followed feeds, and live guild relationships." icon={User} items={['Avatar', 'Display name', 'Bio', 'Platforms', 'Friends', 'Privacy']} />
}

export function HistoryPage() {
  return <ReleasePageShell eyebrow="CONSHARE LEDGER" title="CONshare Ledger" subtitle="Shared media activity: who shared what, submitted links, imported playlists, accepted media, rejected media, and share history." icon={History} items={['Shared media', 'Submitted links', 'Accepted media', 'Rejected media', 'Replay', 'Audit trail']} />
}

export function LibraryManagerPage() {
  return <ReleasePageShell eyebrow="MEDIA VAULT" title="Media Vault" subtitle="Saved media library, guild playlists, approved uploads, metadata, portal tags, and public-safe governance." icon={Upload} items={['Saved library', 'Guild playlists', 'Metadata editor', 'Portal tags', 'Duplicate warning', 'Public-safe flag']} />
}

export function SystemCorePage() {
  return <ReleasePageShell eyebrow="CORE TERMINAL" title="Core Terminal" subtitle="Advanced system layer for bot connection, Discord Activity, WebSocket status, service health, command logs, and runtime diagnostics." icon={ServerCog} items={['WebSocket', 'API', 'Voice', 'Audio', 'Command logs', 'Reconnect']} />
}

export function AdminConsolePage() {
  const rooms = useConbotStore((state) => state.regularVoiceRooms)
  return (
    <section className="release-page-shell">
      <RouteHeroHeader eyebrow="ADMIN CONSOLE" title="Dominion Control" subtitle="Operational controls for regular voice rooms first, Vibe Rooms second, and global maintenance." status={<GlassCapsule>{rooms.length} regular room</GlassCapsule>} />
      <GlassCard className="release-feature-panel p-6">
        <div className="release-feature-head">
          <div className="release-feature-icon"><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <GlassCapsule>Regular Voice Rooms</GlassCapsule>
            <h2>Default Discord voice support</h2>
          </div>
        </div>
        <div className="regular-room-grid">
          {['Detection', 'Playback permissions', 'Queue rules', 'Audio defaults', 'Cinema / Lyrics defaults', 'Theme defaults'].map((item) => <span key={item}>{item}</span>)}
        </div>
      </GlassCard>
    </section>
  )
}
