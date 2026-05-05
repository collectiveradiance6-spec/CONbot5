import { useState } from 'react'
import {
  Activity, Music2, Play, Plus, Search, ServerCog, ShieldCheck,
  SlidersHorizontal, Star, Trash2, Upload, User, History as HistoryIcon, ListMusic,
  X,
} from 'lucide-react'
import { RouteHeroHeader } from '../components/layout/RouteHeroHeader'
import { GlassCard } from '../components/ui/GlassCard'
import { GlassCapsule } from '../components/ui/GlassCapsule'
import { GlassButton } from '../components/ui/GlassButton'
import { useConbotStore } from '../state/useConbotStore'
import { useDiscordActivitySnapshot } from '../lib/discordSdk'
import { sendPlaybackAction } from '../lib/playbackActions'
import { CATALOG } from '../lib/musicEngine'

function PageWrap({ children }: { children: React.ReactNode }) {
  return <section className="release-page-shell">{children}</section>
}

function GlassPanel({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <GlassCard className={`p-6 ${className}`}>{children}</GlassCard>
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-xs font-black uppercase tracking-[.18em] text-[color:var(--conbot-muted)]">{children}</p>
}

function Toggle({ label, sub, on }: { label: string; sub?: string; on?: boolean }) {
  const [enabled, setEnabled] = useState(on ?? false)
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div>
        <p className="text-sm font-black text-[color:var(--conbot-text)]">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-[color:var(--conbot-muted)]">{sub}</p>}
      </div>
      <button type="button" onClick={() => setEnabled(e => !e)}
        className={`relative h-7 w-12 rounded-full border transition-all ${enabled ? 'border-[color:var(--neon-cyan)] bg-[rgba(49,231,255,.2)]' : 'border-white/20 bg-white/8'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}

function Slider({ label, value = 72, max = 100 }: { label: string; value?: number; max?: number }) {
  const [v, setV] = useState(value)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex justify-between mb-2">
        <p className="text-sm font-black text-[color:var(--conbot-text)]">{label}</p>
        <span className="text-sm font-black text-[color:var(--neon-cyan)]">{v}</span>
      </div>
      <input type="range" min={0} max={max} value={v} onChange={e => setV(Number(e.target.value))}
        className="w-full h-1.5 rounded-full" style={{ accentColor: 'var(--neon-cyan)' }} />
    </div>
  )
}

function initials(name: string) { return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() }

// ── Now Playing ──────────────────────────────────────────────────────────────
export function NowPlayingPage() {
  const track = useConbotStore(s => s.currentTrack)
  const isPlaying = useConbotStore(s => s.isPlaying)
  const queue = useConbotStore(s => s.queue)
  const posMs = useConbotStore(s => s.positionMs)
  const durMs = useConbotStore(s => s.durationMs)
  const title = track?.title ?? 'Neon Dreams - Starlight Pulse'
  const artist = track?.artist ?? track?.artists?.join(', ') ?? 'Neo_Groove'
  const pct = durMs > 0 ? (posMs / durMs) * 100 : 38
  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`

  return (
    <PageWrap>
      <RouteHeroHeader eyebrow="NOW PLAYING" title={title} subtitle={`${artist} · ${queue.length} queued`} status={<GlassCapsule>{isPlaying ? '▶ Playing' : '⏸ Paused'}</GlassCapsule>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <GlassPanel>
          <Lbl>Track</Lbl>
          <div className="album-art-frame mx-auto mb-4" style={{ width: '100%', maxWidth: 240 }}>
            <div className="album-art-bg" />
            <div className="album-waveform">
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className="album-waveform__bar" style={{ height: `${20 + Math.sin(i * 0.8) * 14}%`, animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          </div>
          <p className="text-center font-black text-[color:var(--conbot-text)]">{title}</p>
          <p className="text-center text-sm text-[color:var(--conbot-muted)] mt-1">{artist}</p>
        </GlassPanel>
        <GlassPanel>
          <Lbl>Playback</Lbl>
          <div className="np-progress-wrap mb-6">
            <div className="np-progress-track">
              <div className="np-progress-fill" style={{ width: `${pct}%` }} />
              <div className="np-progress-thumb" style={{ left: `${pct}%` }} />
            </div>
            <div className="np-progress-times"><span>{fmt(posMs)}</span><span>{fmt(durMs)}</span></div>
          </div>
          <div className="np-controls mb-6">
            <GlassButton className="np-btn" onClick={() => sendPlaybackAction('playback:previous')}>⏮</GlassButton>
            <button className="np-play-btn" onClick={() => sendPlaybackAction(isPlaying ? 'playback:pause' : 'playback:play')}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <GlassButton className="np-btn" onClick={() => sendPlaybackAction('playback:skip')}>⏭</GlassButton>
          </div>
          <Slider label="Volume" value={72} />
        </GlassPanel>
        <GlassPanel>
          <Lbl>Up Next</Lbl>
          <div className="space-y-2">
            {(queue.length > 0 ? queue : CATALOG.slice(1)).slice(0, 5).map((t, i) => (
              <button key={t.id ?? i} type="button" onClick={() => sendPlaybackAction('playback:load', { track: t })}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10 transition">
                <span className="text-xs font-black text-[color:var(--conbot-muted)] w-5">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[color:var(--conbot-text)]">{t.title}</p>
                  <p className="truncate text-xs text-[color:var(--conbot-muted)]">{t.artist ?? t.artists?.join(', ')}</p>
                </div>
              </button>
            ))}
          </div>
        </GlassPanel>
      </div>
    </PageWrap>
  )
}

// ── Search ───────────────────────────────────────────────────────────────────
export function SearchPage() {
  const [query, setQuery] = useState('')
  const results = CATALOG.filter(t => !query || t.title?.toLowerCase().includes(query.toLowerCase()) || t.artist?.toLowerCase().includes(query.toLowerCase()))
  return (
    <PageWrap>
      <RouteHeroHeader eyebrow="CONLIGHT SEARCH" title="CONlight Search" subtitle="Find music, playlists, creators, and saved media." status={<GlassCapsule>Live catalog</GlassCapsule>} />
      <GlassPanel className="mb-5">
        <div className="flex items-center gap-3 rounded-2xl border border-white/14 bg-white/5 px-4 py-3">
          <Search className="h-5 w-5 text-[color:var(--neon-cyan)]" />
          <input type="text" placeholder="Search tracks, artists..." value={query} onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[color:var(--conbot-text)] placeholder-[color:var(--conbot-muted)] outline-none text-sm font-black" />
          {query && <button onClick={() => setQuery('')}><X className="h-4 w-4 text-[color:var(--conbot-muted)]" /></button>}
        </div>
      </GlassPanel>
      <div className="space-y-3">
        {results.map((t, i) => (
          <GlassCard key={i} className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl flex-shrink-0" style={{ background: 'linear-gradient(135deg,#31e7ff,#ff4fd8,#ffd166)' }} />
              <div className="min-w-0 flex-1">
                <p className="font-black text-[color:var(--conbot-text)]">{t.title}</p>
                <p className="text-sm text-[color:var(--conbot-muted)]">{t.artist ?? t.artists?.join(', ')}</p>
              </div>
              <div className="flex gap-2">
                <GlassButton onClick={() => sendPlaybackAction('playback:load', { track: t })}><Play className="h-4 w-4" /></GlassButton>
                <GlassButton onClick={() => sendPlaybackAction('playback:queue:add', { track: t })}><Plus className="h-4 w-4" /></GlassButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </PageWrap>
  )
}

// ── Playlists ────────────────────────────────────────────────────────────────
export function PlaylistsPage() {
  const playlists = [
    { name: 'CONbot5 Room Mix', count: 12, mood: 'Prismatic Radiance' },
    { name: 'Late Night Dominion', count: 8, mood: 'Midnight Lo-Fi' },
    { name: 'Raid Prep Weapons', count: 15, mood: 'Metal Forge' },
    { name: 'Chill Frequency', count: 10, mood: 'Ambient Void' },
  ]
  return (
    <PageWrap>
      <RouteHeroHeader eyebrow="PLAYLISTS" title="Guild Playlists" subtitle="Saved media, imported playlists, and portal presets."
        status={<GlassCapsule>{playlists.length} playlists</GlassCapsule>}
        actions={<GlassButton variant="primary"><Plus className="h-4 w-4" /> New Playlist</GlassButton>} />
      <div className="grid gap-4 sm:grid-cols-2">
        {playlists.map(pl => (
          <GlassCard key={pl.name} className="p-5">
            <div className="mb-3 h-24 w-full rounded-2xl" style={{ background: 'linear-gradient(135deg,rgba(49,231,255,.3),rgba(255,79,216,.3))' }} />
            <p className="font-black text-[color:var(--conbot-text)]">{pl.name}</p>
            <p className="text-sm text-[color:var(--conbot-muted)] mt-1">{pl.count} tracks · {pl.mood}</p>
            <div className="mt-3 flex gap-2">
              <GlassButton variant="primary" className="flex-1"><Play className="h-4 w-4" /> Play</GlassButton>
              <GlassButton><ListMusic className="h-4 w-4" /></GlassButton>
            </div>
          </GlassCard>
        ))}
      </div>
    </PageWrap>
  )
}

// ── Equalizer ────────────────────────────────────────────────────────────────
export function EqualizerPage() {
  const bands = [60, 170, 310, 600, 1000, 3000, 6000]
  const labels = ['Bass', 'Lo-Mid', 'Mid', 'Hi-Mid', '1K', '3K', 'Treble']
  const [vals, setVals] = useState(bands.map(() => 0))
  const presets = ['Neutral', 'Lo-Fi', 'Synthwave', 'Raid', 'Ambient', 'Metal', 'Voice']

  return (
    <PageWrap>
      <RouteHeroHeader eyebrow="EQ STUDIO" title="EQ Studio" subtitle="Equalizer, reverb, spatial audio, normalization, and crossfade."
        status={<GlassCapsule>DSP Active</GlassCapsule>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_.72fr]">
        <GlassPanel>
          <Lbl>Equalizer Bands</Lbl>
          <div className="flex items-end justify-between gap-2" style={{ height: 180 }}>
            {bands.map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs font-black text-[color:var(--neon-cyan)]">{vals[i] >= 0 ? '+' : ''}{vals[i]}</span>
                <div className="flex-1 w-full flex items-center justify-center">
                  <input type="range" min={-12} max={12} value={vals[i]}
                    onChange={e => setVals(v => v.map((x, j) => j === i ? Number(e.target.value) : x))}
                    className="eq-slider" style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '100%', height: '100%' }} />
                </div>
                <span className="text-xs text-[color:var(--conbot-muted)]">{labels[i]}</span>
              </div>
            ))}
          </div>
        </GlassPanel>
        <div className="space-y-4">
          <GlassPanel>
            <Lbl>Presets</Lbl>
            <div className="grid grid-cols-2 gap-2">
              {presets.map(p => (
                <button key={p} type="button" onClick={() => setVals(bands.map(() => 0))}
                  className="rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-xs font-black text-[color:var(--conbot-text)] hover:bg-white/12 transition text-left">
                  {p}
                </button>
              ))}
            </div>
          </GlassPanel>
          <GlassPanel>
            <Lbl>Processing</Lbl>
            <div className="space-y-2">
              <Toggle label="Normalization" sub="-14 LUFS" on={true} />
              <Toggle label="Night Safe" sub="Cap at 70%" />
              <Toggle label="Voice Ducking" />
              <Slider label="Crossfade (s)" value={0} max={12} />
            </div>
          </GlassPanel>
        </div>
      </div>
    </PageWrap>
  )
}

// ── Lyrics ───────────────────────────────────────────────────────────────────
export function LyricsPage() {
  const track = useConbotStore(s => s.currentTrack)
  const posMs = useConbotStore(s => s.positionMs)
  const lines = [
    { t: 0,     text: 'Through the prismatic void we rise' },
    { t: 8000,  text: 'Neon signals cross the night' },
    { t: 16000, text: 'Every frequency aligned' },
    { t: 24000, text: 'Radiance matrix burning bright' },
    { t: 32000, text: 'Glass currents flowing deep' },
    { t: 40000, text: 'Synchronized in frequency' },
    { t: 48000, text: 'The dominion never sleeps' },
    { t: 56000, text: 'Our signal echoes endlessly' },
  ]
  const activeIdx = lines.reduce((acc, l, i) => (posMs >= l.t ? i : acc), 0)

  return (
    <PageWrap>
      <RouteHeroHeader eyebrow="LYRICS" title="Lyrics Theater" subtitle={track?.title ?? 'No track loaded'} status={<GlassCapsule>Synced</GlassCapsule>} />
      <GlassPanel>
        <div className="space-y-4 py-4">
          {lines.map((line, i) => (
            <p key={i} className={`text-center text-xl font-black transition-all duration-500 ${i === activeIdx ? 'text-white scale-105' : i < activeIdx ? 'text-[color:var(--conbot-muted)] opacity-50' : 'text-[color:var(--conbot-muted)] opacity-40'}`}>
              {line.text}
            </p>
          ))}
        </div>
      </GlassPanel>
    </PageWrap>
  )
}

// ── Profile ──────────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { snapshot } = useDiscordActivitySnapshot()
  const me = snapshot.users[0]
  return (
    <PageWrap>
      <RouteHeroHeader eyebrow="PROFILE-NEXUS" title="ProFile-Nexus" subtitle="Identity, social connectors, presence, and privacy." status={<GlassCapsule>{snapshot.mode}</GlassCapsule>} />
      <div className="grid gap-5 lg:grid-cols-[.6fr_1fr]">
        <GlassPanel>
          <Lbl>Identity</Lbl>
          <div className="text-center">
            <div className="mx-auto mb-4 h-24 w-24 rounded-full grid place-items-center text-2xl font-black text-white" style={{ background: 'linear-gradient(135deg,#31e7ff,#ff4fd8)' }}>
              {me ? initials(me.displayName) : 'U'}
            </div>
            <p className="font-black text-lg text-[color:var(--conbot-text)]">{me?.displayName ?? 'CONbot5 User'}</p>
            <p className="text-sm text-[color:var(--conbot-muted)]">@{me?.username ?? 'user'}</p>
            <div className="mt-3 flex justify-center gap-2 flex-wrap">
              <GlassCapsule>The Conclave</GlassCapsule>
              <GlassCapsule>Member</GlassCapsule>
            </div>
          </div>
        </GlassPanel>
        <div className="space-y-4">
          <GlassPanel>
            <Lbl>Connected Server</Lbl>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <Activity className="h-5 w-5 text-[color:var(--neon-cyan)]" />
              <div>
                <p className="font-black text-[color:var(--conbot-text)]">{snapshot.serverName}</p>
                <p className="text-xs text-[color:var(--conbot-muted)]">{snapshot.voiceChannelName}</p>
              </div>
            </div>
          </GlassPanel>
          <GlassPanel>
            <Lbl>Privacy</Lbl>
            <div className="space-y-2">
              <Toggle label="Show in activity feed" on={true} />
              <Toggle label="Share listening history" />
              <Toggle label="Public profile" on={true} />
            </div>
          </GlassPanel>
        </div>
      </div>
    </PageWrap>
  )
}

// ── History / CONshare Ledger ─────────────────────────────────────────────────
export function HistoryPage() {
  const entries = [
    { user: 'Neo_Groove', action: 'shared', item: 'Synthwave Sunset', type: 'Track', time: '2h ago', avatar: 'NG' },
    { user: 'AstraWave', action: 'queued', item: 'Neon Highway', type: 'Track', time: '3h ago', avatar: 'AW' },
    { user: 'Dyberdoswnn', action: 'shared', item: 'Future City Drone Footage', type: 'Video', time: '4h ago', avatar: 'DY' },
    { user: 'TechnoQueen', action: 'added', item: 'Prismatic Radiance Matrix', type: 'Track', time: '5h ago', avatar: 'TQ' },
  ]
  return (
    <PageWrap>
      <RouteHeroHeader eyebrow="CONSHARE LEDGER" title="CONshare Ledger" subtitle="Shared media, history, and activity feed." status={<GlassCapsule>{entries.length} entries</GlassCapsule>} />
      <div className="space-y-3">
        {entries.map((e, i) => (
          <GlassCard key={i} className="p-4">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-full flex-shrink-0 grid place-items-center text-sm font-black text-white" style={{ background: 'linear-gradient(135deg,#31e7ff,#8b5cff)' }}>
                {e.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-[color:var(--conbot-text)]">
                  <span className="text-[color:var(--neon-cyan)]">{e.user}</span>{' '}{e.action}{' '}
                  <span className="text-white">"{e.item}"</span>
                </p>
                <p className="text-xs text-[color:var(--conbot-muted)] mt-1">{e.type} · {e.time}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <GlassButton onClick={() => sendPlaybackAction('playback:queue:add', { track: { id: `h-${i}`, title: e.item, artist: e.user, durationMs: 200000 } })}><Play className="h-3.5 w-3.5" /></GlassButton>
                <GlassButton><Star className="h-3.5 w-3.5" /></GlassButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </PageWrap>
  )
}

// ── Library / Media Vault ─────────────────────────────────────────────────────
export function LibraryManagerPage() {
  const items = CATALOG.map(t => ({ ...t, size: '4.2 MB', format: 'MP3', safe: true }))
  return (
    <PageWrap>
      <RouteHeroHeader eyebrow="MEDIA VAULT" title="Media Vault" subtitle="Saved media, approved uploads, metadata, and portal tags."
        status={<GlassCapsule>{items.length} items</GlassCapsule>}
        actions={<GlassButton variant="primary"><Upload className="h-4 w-4" /> Upload</GlassButton>} />
      <div className="space-y-3">
        {items.map((item, i) => (
          <GlassCard key={i} className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl flex-shrink-0 grid place-items-center" style={{ background: 'rgba(49,231,255,.1)', border: '1px solid rgba(49,231,255,.3)' }}>
                <Music2 className="h-5 w-5 text-[color:var(--neon-cyan)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-[color:var(--conbot-text)]">{item.title}</p>
                <p className="text-xs text-[color:var(--conbot-muted)]">{item.artist} · {item.format} · {item.size}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.safe && <GlassCapsule>✓ Safe</GlassCapsule>}
                <GlassButton onClick={() => sendPlaybackAction('playback:load', { track: item })}><Play className="h-4 w-4" /></GlassButton>
                <GlassButton><Trash2 className="h-4 w-4 text-red-400" /></GlassButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </PageWrap>
  )
}

// ── System Core Terminal ──────────────────────────────────────────────────────
export function SystemCorePage() {
  const connection = useConbotStore(s => s.connection)
  const session = useConbotStore(s => s.session)
  const isPlaying = useConbotStore(s => s.isPlaying)
  const queue = useConbotStore(s => s.queue)
  const { snapshot } = useDiscordActivitySnapshot()

  const metrics = [
    { label: 'Socket', value: connection.connected ? 'Connected' : 'Offline', ok: connection.connected },
    { label: 'Latency', value: `${session.latencyMs || 0}ms`, ok: true },
    { label: 'Listeners', value: String(session.listeners || 0), ok: true },
    { label: 'Queue', value: `${queue.length} tracks`, ok: true },
    { label: 'Playback', value: isPlaying ? 'Active' : 'Idle', ok: isPlaying },
    { label: 'Discord', value: snapshot.status, ok: snapshot.status === 'ready' || snapshot.status === 'mock' },
    { label: 'Voice Channel', value: snapshot.voiceChannelName, ok: true },
    { label: 'Server', value: snapshot.serverName, ok: true },
  ]

  const logs = [
    '[00:00:01] CONbot5 Core Terminal initialized',
    '[00:00:02] Socket.IO hub connecting...',
    '[00:00:03] Activity context resolved',
    '[00:00:04] Discord SDK initialized',
    '[00:00:05] Music engine booted · 5 tracks',
    '[00:00:06] Vibe Room store seeded · 8 portals',
    '[00:00:07] State hydration complete',
  ]

  return (
    <PageWrap>
      <RouteHeroHeader eyebrow="CORE TERMINAL" title="Core Terminal" subtitle="WebSocket, bot health, voice, audio, and runtime diagnostics."
        status={<GlassCapsule>{connection.connected ? '● Online' : '● Offline'}</GlassCapsule>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassPanel>
          <Lbl>System Metrics</Lbl>
          <div className="space-y-2">
            {metrics.map(m => (
              <div key={m.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
                <p className="text-sm font-black text-[color:var(--conbot-muted)]">{m.label}</p>
                <p className={`text-sm font-black ${m.ok ? 'text-[color:var(--neon-cyan)]' : 'text-red-400'}`}>{m.value}</p>
              </div>
            ))}
          </div>
        </GlassPanel>
        <GlassPanel>
          <Lbl>Runtime Log</Lbl>
          <div className="font-mono text-xs space-y-1.5 rounded-2xl border border-white/10 bg-black/40 p-4 max-h-80 overflow-y-auto">
            {logs.map((log, i) => <p key={i} className="text-[color:var(--neon-cyan)] opacity-80">{log}</p>)}
          </div>
        </GlassPanel>
      </div>
    </PageWrap>
  )
}

// ── Admin Console ─────────────────────────────────────────────────────────────
export function AdminConsolePage() {
  const rooms = useConbotStore(s => s.regularVoiceRooms)
  const vibeRooms = useConbotStore(s => s.vibeRooms)

  return (
    <PageWrap>
      <RouteHeroHeader eyebrow="ADMIN CONSOLE" title="Dominion Control" subtitle="Voice rooms, Vibe Rooms, queue governance, and runtime control."
        status={<GlassCapsule>{rooms.length} voice room</GlassCapsule>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassPanel>
          <Lbl>Regular Voice Rooms</Lbl>
          <div className="space-y-2">
            {rooms.map(r => (
              <div key={r.voiceChannelId} className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/5 px-4 py-3">
                <div>
                  <p className="font-black text-[color:var(--conbot-text)]">{r.voiceChannelName}</p>
                  <p className="text-xs text-[color:var(--conbot-muted)]">{r.listenerCount} listeners · {r.botConnected ? 'Bot connected' : 'Bot not connected'}</p>
                </div>
                <GlassCapsule>{r.botConnected ? 'Active' : 'Idle'}</GlassCapsule>
              </div>
            ))}
          </div>
        </GlassPanel>
        <GlassPanel>
          <Lbl>Permissions</Lbl>
          <div className="space-y-2">
            <Toggle label="Guest queue" sub="Allow non-DJs to queue" on={true} />
            <Toggle label="Vote skip" sub="51% threshold" />
            <Toggle label="Cinema allowed" on={true} />
            <Toggle label="Explicit content" />
            <Slider label="Queue limit per user" value={5} max={20} />
          </div>
        </GlassPanel>
        {vibeRooms.length > 0 && (
          <GlassPanel className="lg:col-span-2">
            <Lbl>Vibe Room Mappings</Lbl>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {vibeRooms.map(vr => (
                <div key={vr.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="font-black text-sm text-[color:var(--conbot-text)]">{vr.name}</p>
                  <p className="text-xs text-[color:var(--conbot-muted)] mt-1">{vr.enabled ? '● Active' : '○ Disabled'}</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        )}
      </div>
    </PageWrap>
  )
}
