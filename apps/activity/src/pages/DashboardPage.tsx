import { Radio, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { GlassCard } from '../components/ui/GlassCard'
import { GlassCapsule } from '../components/ui/GlassCapsule'
import { NowPlayingPanel } from '../components/player/NowPlayingPanel'
import { QueuePanel } from '../components/queue/QueuePanel'
import { VisualizerPanel } from '../components/visualizers/VisualizerPanel'
import { DiscordStatusPanel } from '../components/discord/DiscordStatusPanel'
import { StudioControlsPanel } from '../components/studio/StudioControlsPanel'
import { LiveUsersPanel } from '../components/discord/LiveUsersPanel'
import type { ActivityShellContext } from '../components/layout/AppShell'
import { HomeSurface } from '../modules/home/HomeSurface'

export function DashboardPage({ context }: { context: ActivityShellContext }) {
  const socketLabel = context.connectionStatus

  return (
    <>
      <HomeSurface />

      <div className="mb-5 mt-5 grid gap-3 md:grid-cols-1">
        <GlassCard className="p-4">
          <div className="grid h-full grid-cols-3 gap-2">
          {[
            [Users, '24', 'listeners'],
            [Radio, socketLabel, 'core sync'],
            [ShieldCheck, 'Compliant', 'media'],
          ].map(([Icon, value, label]) => (
            <div key={String(label)} className="min-w-20 rounded-[1.4rem] bg-white/10 px-3 py-3 text-center">
              <Icon className="mx-auto mb-1 h-4 w-4 text-[color:var(--accent)]" />
              <p className="text-sm font-black text-[color:var(--text-main)]">{String(value)}</p>
              <p className="text-[.62rem] font-black uppercase tracking-[.16em] text-[color:var(--text-muted)]">{String(label)}</p>
            </div>
          ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid flex-1 gap-5 xl:grid-cols-[minmax(300px,.92fr)_minmax(390px,1.12fr)_minmax(320px,.8fr)] xl:items-stretch">
        <div className="flex flex-col gap-5">
          <NowPlayingPanel />
          <GlassCard className="flex-1 p-5">
            <div className="flex h-full flex-col justify-between">
              <div>
                <GlassCapsule>Dominion Dashboard</GlassCapsule>
                <h2 className="mt-5 text-2xl font-black tracking-tight text-[color:var(--mode-text)]">
                  Regular Discord voice rooms are the foundation. Vibe Room Portals add the themed layer when a mapped channel matches.
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--mode-muted)]">
                  Playback, queue, cinema, lyrics, and EQ stay available in any normal voice room, then inherit room identity only when the resolver confirms a themed portal.
                </p>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ['Any', 'voice room'],
                  ['Live', 'socket state'],
                  ['Guild', 'portal mappings'],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[1.35rem] border border-white/12 bg-white/10 p-4 text-center shadow-glass-inset"
                  >
                    <p className="text-xl font-black text-[color:var(--mode-text)]">{value}</p>
                    <p className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[color:var(--mode-muted)]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="flex flex-col gap-5">
          <VisualizerPanel />
          <StudioControlsPanel />
        </div>

        <div className="flex flex-col gap-5">
          <QueuePanel />
          <DiscordStatusPanel />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/10">
              <Sparkles className="h-5 w-5 text-[color:var(--accent)]" />
            </div>
            <div>
              <GlassCapsule>Material System</GlassCapsule>
              <p className="mt-2 text-sm font-semibold text-[color:var(--mode-muted)]">
                Day/night lighting and material skins stay separate so the app can feel bright, cinematic, or minimal without changing feature state.
              </p>
            </div>
          </div>
        </GlassCard>
        <LiveUsersPanel />
      </div>
    </>
  )
}
