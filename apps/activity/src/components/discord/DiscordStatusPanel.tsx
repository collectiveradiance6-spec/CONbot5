import { Activity, Hash, Radio, Server } from 'lucide-react'
import { useDiscordActivitySnapshot } from '../../lib/discordSdk'
import { GlassCard } from '../ui/GlassCard'
import { GlassCapsule } from '../ui/GlassCapsule'

export function DiscordStatusPanel() {
  const { snapshot, isLoading } = useDiscordActivitySnapshot()
  const statusLabel = isLoading ? 'Checking Discord' : snapshot.statusText

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <GlassCapsule>Discord</GlassCapsule>
        <span className="rounded-full bg-white/45 px-3 py-1 text-xs font-bold uppercase tracking-[.14em] text-ink/50">
          {snapshot.mode}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-3 rounded-2xl bg-white/35 p-3 shadow-glass-inset">
          <Server className="h-5 w-5 shrink-0 text-sky-500" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-ink">{snapshot.serverName}</div>
            <div className="truncate text-xs font-semibold text-ink/45">{snapshot.serverId || 'No server id'}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/35 p-3 shadow-glass-inset">
          <Hash className="h-5 w-5 shrink-0 text-fuchsia-500" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-ink">{snapshot.voiceChannelName}</div>
            <div className="truncate text-xs font-semibold text-ink/45">{snapshot.voiceChannelId || 'No channel id'}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/35 p-3 shadow-glass-inset">
          <Activity className="h-5 w-5 shrink-0 text-emerald-500" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-ink">{snapshot.activity.details}</div>
            <div className="truncate text-xs font-semibold text-ink/45">{snapshot.activity.state}</div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink/54">
        <Radio className="h-4 w-4 text-rose-500" />
        {statusLabel}
      </div>
    </GlassCard>
  )
}
