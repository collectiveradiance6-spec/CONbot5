import { Bot, Mic, MicOff, VolumeX } from 'lucide-react'
import { useDiscordActivitySnapshot } from '../../lib/discordSdk'
import { GlassCard } from '../ui/GlassCard'
import { GlassCapsule } from '../ui/GlassCapsule'

function initials(displayName: string) {
  return displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function LiveUsersPanel() {
  const { snapshot, isLoading } = useDiscordActivitySnapshot()

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <GlassCapsule>Live Users</GlassCapsule>
        <span className="text-xs font-semibold uppercase tracking-[.14em] text-ink/45">
          {isLoading ? 'Syncing' : `${snapshot.users.length} online`}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {snapshot.users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 rounded-2xl bg-white/35 p-3 shadow-glass-inset">
            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/65 text-sm font-bold text-ink/64">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(user.displayName)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-ink">{user.displayName}</div>
              <div className="truncate text-xs font-semibold text-ink/45">@{user.username}</div>
            </div>

            <div className="flex items-center gap-1 text-ink/42">
              {user.isBot && <Bot className="h-4 w-4" aria-label="Bot user" />}
              {user.isMuted ? <MicOff className="h-4 w-4" aria-label="Muted" /> : <Mic className="h-4 w-4" aria-label="Unmuted" />}
              {user.isDeafened && <VolumeX className="h-4 w-4" aria-label="Deafened" />}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
