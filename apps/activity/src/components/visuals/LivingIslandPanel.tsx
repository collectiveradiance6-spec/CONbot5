import { Activity, AlertTriangle, RadioTower, Sparkles } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { GlassCapsule } from '../ui/GlassCapsule'
import { useConbotTheme } from '../../theme/ThemeContext'
import { FloatingIslandWorld } from './FloatingIslandWorld'
import { islandProfiles, type LivingIslandPlaybackState } from './LivingIslandTypes'

type LivingIslandPanelProps = {
  playbackState?: LivingIslandPlaybackState
  vibeRoomKey?: string | null
  vibeRoomName?: string | null
  compact?: boolean
}

function resolveStatus(playbackState?: LivingIslandPlaybackState) {
  if (playbackState?.status) return playbackState.status
  if (playbackState?.queueSize === 0) return 'queue-empty'
  if (playbackState?.isPlaying) return 'playing'
  return 'connected'
}

function statusCopy(status: string) {
  if (status === 'playing') return 'Playing'
  if (status === 'paused') return 'Paused'
  if (status === 'connecting') return 'Booting'
  if (status === 'disconnected') return 'Offline'
  if (status === 'error') return 'Needs attention'
  if (status === 'queue-empty') return 'Low energy'
  return 'Connected'
}

export function IslandStatusBadge({ status, vibeRoomName }: { status: string; vibeRoomName?: string | null }) {
  const isError = status === 'error' || status === 'disconnected'
  const Icon = isError ? AlertTriangle : status === 'playing' ? Activity : RadioTower

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[.14em] text-[color:var(--mode-text)] shadow-glass-soft backdrop-blur-2xl">
      <Icon className={`h-3.5 w-3.5 ${isError ? 'text-red-300' : 'text-[color:var(--accent)]'}`} />
      {statusCopy(status)}
      {vibeRoomName ? <span className="hidden text-[color:var(--mode-muted)] sm:inline">/ {vibeRoomName}</span> : null}
    </div>
  )
}

const controlGroups = [
  ['Detail', 'Medium'],
  ['Motion', 'Reactive'],
  ['Weather', 'Auto'],
  ['Orbs', 'On'],
  ['Camera', 'Parallax'],
  ['Vibe', 'Auto'],
]

export function IslandAtmosphereLayer() {
  return null
}

export function IslandLandmass() {
  return null
}

export function IslandReactorCore() {
  return null
}

export function IslandAudioRivers() {
  return null
}

export function IslandEqualizerTowers() {
  return null
}

export function IslandListenerOrbs() {
  return null
}

export function IslandReflection() {
  return null
}

export function LivingIslandPanel({ playbackState, vibeRoomKey, vibeRoomName, compact = false }: LivingIslandPanelProps) {
  const { lightingMode, theme } = useConbotTheme()
  const status = resolveStatus(playbackState)
  const profile = islandProfiles[vibeRoomKey ?? 'global'] ?? islandProfiles.global

  return (
    <GlassCard className="relative min-h-[430px] overflow-visible p-5 xl:min-h-[520px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <GlassCapsule>Living Island</GlassCapsule>
          <h2 className="mt-3 text-2xl font-black tracking-[-.03em] text-[color:var(--mode-text)]">Music world</h2>
        </div>
        <IslandStatusBadge status={status} vibeRoomName={vibeRoomName ?? profile.label} />
      </div>

      <div className="relative -mx-4 mt-4 h-[360px] overflow-visible sm:h-[420px]">
        <div className="absolute inset-x-0 top-0 h-full scale-[1.04] overflow-hidden rounded-[2.2rem] border border-white/12 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_40px_140px_rgba(0,0,0,.32)]">
          <FloatingIslandWorld
            playbackState={playbackState}
            vibeRoomKey={vibeRoomKey}
            vibeRoomName={vibeRoomName}
            lightingMode={lightingMode}
            accent={theme.accent}
            compact={compact}
          />
        </div>
        <div className="pointer-events-none absolute -bottom-7 left-1/2 h-24 w-[72%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(74,226,255,.26),rgba(255,80,220,.12)_42%,transparent_72%)] blur-2xl" />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {[
          ['Core', status === 'playing' ? 'Pulse' : 'Idle'],
          ['Rivers', status === 'paused' ? 'Slow' : 'Flow'],
          ['Orbs', String(playbackState?.connectedUsers ?? 5)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/12 bg-white/10 px-3 py-3 text-center">
            <p className="text-sm font-black text-[color:var(--mode-text)]">{value}</p>
            <p className="mt-1 text-[.62rem] font-black uppercase tracking-[.16em] text-[color:var(--mode-muted)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {controlGroups.map(([label, value]) => (
          <button
            key={label}
            type="button"
            className="rounded-full border border-white/12 bg-white/10 px-3 py-2 text-left text-[.66rem] font-black uppercase tracking-[.13em] text-[color:var(--mode-muted)] transition hover:bg-white/16"
          >
            <span className="text-[color:var(--mode-text)]">{label}</span> / {value}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[color:var(--mode-muted)]">
        <Sparkles className="h-3.5 w-3.5 text-[color:var(--accent)]" />
        {profile.label} / {lightingMode} lighting / canvas world / capped orbs
      </div>
    </GlassCard>
  )
}
