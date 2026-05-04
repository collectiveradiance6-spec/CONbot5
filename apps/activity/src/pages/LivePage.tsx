import { DiscordStatusPanel } from '../components/discord/DiscordStatusPanel'
import { LiveUsersPanel } from '../components/discord/LiveUsersPanel'
import { GlassCard } from '../components/ui/GlassCard'
import { GlassCapsule } from '../components/ui/GlassCapsule'
import type { ActivityShellContext } from '../components/layout/AppShell'

export function LivePage({ context }: { context: ActivityShellContext }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <DiscordStatusPanel />
      <LiveUsersPanel />
      <GlassCard className="p-5 xl:col-span-2">
        <GlassCapsule>Session Sync</GlassCapsule>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ['Session', context.activityContext?.sessionId ?? 'loading'],
            ['Guild', context.activityContext?.guildId ?? 'loading'],
            ['Channel', context.activityContext?.channelId ?? 'loading'],
            ['Socket', context.connectionStatus],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.3rem] border border-white/58 bg-white/34 p-4 shadow-glass-soft">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink/42">{label}</p>
              <p className="mt-2 truncate text-sm font-bold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
