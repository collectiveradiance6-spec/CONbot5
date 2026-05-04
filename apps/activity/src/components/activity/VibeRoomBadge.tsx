import type { VibeRoomResolution } from '../../shared/vibeRooms'

export function VibeRoomBadge({ resolution }: { resolution: VibeRoomResolution | null }) {
  const mode = resolution?.mode ?? 'global'
  const label = resolution?.vibeRoom?.roomName ?? 'Global Activity'

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/62 bg-white/42 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/56 shadow-glass-soft backdrop-blur-2xl">
      <span className={`h-2.5 w-2.5 rounded-full ${mode === 'vibe' ? 'bg-[color:var(--accent)]' : 'bg-emerald-300'}`} />
      {label}
    </div>
  )
}
