import { Airplay, Heart, ListPlus, Pause, Play, Radio, Repeat2, ShieldCheck, Shuffle, SkipBack, SkipForward, Users, Volume2, Waves } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { GlassCapsule } from '../components/ui/GlassCapsule'
import { GlassButton } from '../components/ui/GlassButton'
import { sendPlaybackAction } from '../lib/playbackActions'
import { useConbotStore } from '../state/useConbotStore'
import { HomeSurface } from '../modules/home/HomeSurface'
import type { ActivityShellContext } from '../components/layout/AppShell'
import { QueuePanel } from '../components/queue/QueuePanel'

export function DashboardPage({ context }: { context: ActivityShellContext }) {
  const socketLabel = context.connectionStatus
  const currentTrack = useConbotStore((s) => s.currentTrack)
  const isPlaying = useConbotStore((s) => s.isPlaying)
  const session = useConbotStore((s) => s.session)

  const title = currentTrack?.title ?? 'Neon Dreams - Starlight Pulse'
  const artist = (currentTrack?.artist ?? currentTrack?.artists?.join(', ')) || 'Neo_Groove'

  return (
    <>
      <HomeSurface />

      {/* ── Status strip ─────────────────────────────────────────────── */}
      <div className="mb-6 mt-4 grid grid-cols-3 gap-3">
        {([
          [Users,       String(session.listeners || 24), 'Listeners'],
          [Radio,       socketLabel,                      'Core Sync'],
          [ShieldCheck, 'Compliant',                      'Media'],
        ] as const).map(([Icon, val, lbl]) => (
          <div key={lbl} className="stat-pill">
            <Icon className="mx-auto mb-1.5 h-4 w-4 text-[color:var(--neon-cyan)]" />
            <p className="stat-pill__value">{val}</p>
            <p className="stat-pill__label">{lbl}</p>
          </div>
        ))}
      </div>

      {/* ── Main layout: Now Playing | Vibe rooms | Queue ─────────────── */}
      <div className="dashboard-grid">

        {/* Left — vibe room cards stack */}
        <div className="vibe-side-stack">
          {[
            { name: 'Midnight Lo-Fi',   sub: 'Violet rain glass',   cls: 'portal-midnight',  active: false },
            { name: 'Cyberpunk Beats',  sub: 'Neon city glass',     cls: 'portal-vgm',       active: false },
            { name: 'Retro Synthwave',  sub: 'Sunset grid glass',   cls: 'portal-synthwave', active: true  },
          ].map((room) => (
            <div key={room.name} className={`vibe-side-card ${room.cls} ${room.active ? 'is-active' : ''}`}>
              <div className="portal-art">
                <div className="portal-rain" />
                <div className="portal-sun" />
                <div className="portal-grid-lines" />
                <div className="portal-vortex" />
              </div>
              <div className="vibe-side-card__content">
                <p className="vibe-side-card__name">{room.name}</p>
                <p className="vibe-side-card__sub">{room.sub}</p>
                <div className="vibe-side-card__user">
                  <div className="avatar-dot" />
                  <span>Neo_Groove</span>
                  {room.active && <i className="status-dot" />}
                  {room.active && <span className="active-label">Active</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Center — Now Playing stage */}
        <div className="now-playing-stage">
          <GlassCard className="now-playing-card">
            {/* Album art with waveform overlay */}
            <div className="album-art-wrap">
              <div className="album-art-frame">
                {/* Prismatic gradient art placeholder */}
                <div className="album-art-bg" />
                {/* Waveform bars overlay */}
                <div className="album-waveform">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const h = 24 + Math.sin(i * 0.72) * 18 + Math.cos(i * 1.3) * 12
                    return (
                      <span
                        key={i}
                        className="album-waveform__bar"
                        style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Track info */}
            <div className="np-info">
              <p className="np-label">Now Playing</p>
              <h2 className="np-title">{title}</h2>
              <p className="np-artist">{artist}</p>
            </div>

            {/* Progress bar */}
            <div className="np-progress-wrap">
              <div className="np-progress-track">
                <div className="np-progress-fill" style={{ width: '38%' }} />
                <div className="np-progress-thumb" style={{ left: '38%' }} />
              </div>
              <div className="np-progress-times">
                <span>1:32</span>
                <span>4:04</span>
              </div>
            </div>

            {/* Transport controls */}
            <div className="np-controls">
              <GlassButton className="np-btn" aria-label="Shuffle" onClick={() => sendPlaybackAction('playback:shuffle', { shuffleEnabled: true })}>
                <Shuffle className="h-4 w-4" />
              </GlassButton>
              <GlassButton className="np-btn" aria-label="Previous" onClick={() => sendPlaybackAction('playback:previous')}>
                <SkipBack className="h-4 w-4" />
              </GlassButton>
              <button
                className="np-play-btn"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={() => sendPlaybackAction(isPlaying ? 'playback:pause' : 'playback:play')}
              >
                {isPlaying
                  ? <Pause className="h-6 w-6 fill-current" />
                  : <Play  className="h-6 w-6 fill-current" />
                }
              </button>
              <GlassButton className="np-btn" aria-label="Next" onClick={() => sendPlaybackAction('playback:skip')}>
                <SkipForward className="h-4 w-4" />
              </GlassButton>
              <GlassButton className="np-btn" aria-label="Repeat" onClick={() => sendPlaybackAction('playback:loop', { loopMode: 'all' })}>
                <Repeat2 className="h-4 w-4" />
              </GlassButton>
            </div>

            {/* Volume + extras */}
            <div className="np-footer">
              <button className="np-icon-btn" aria-label="Favorite"><Heart className="h-4 w-4" /></button>
              <div className="np-vol">
                <Volume2 className="h-3.5 w-3.5 text-[color:var(--neon-cyan)]" />
                <div className="np-vol-track">
                  <div className="np-vol-fill" style={{ width: '72%' }} />
                </div>
              </div>
              <button className="np-icon-btn" aria-label="Output"><Airplay className="h-4 w-4" /></button>
              <button className="np-icon-btn" aria-label="Add to queue" onClick={() => sendPlaybackAction('playback:queue:add', { track: { id: `r-${Date.now()}`, title, artists: [artist], durationMs: 244000 } })}>
                <ListPlus className="h-4 w-4" />
              </button>
            </div>

            <div className="np-listeners">
              <Waves className="h-3.5 w-3.5 text-[color:var(--neon-cyan)]" />
              <span>Synced · {session.listeners || 24} listeners</span>
            </div>
          </GlassCard>
        </div>

        {/* Right — Queue */}
        <div className="queue-side">
          <QueuePanel />
        </div>
      </div>
    </>
  )
}
