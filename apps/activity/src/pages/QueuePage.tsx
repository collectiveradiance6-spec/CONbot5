import { QueuePanel } from '../components/queue/QueuePanel'
import { LiveUsersPanel } from '../components/discord/LiveUsersPanel'

export function QueuePage() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <QueuePanel />
      <LiveUsersPanel />
    </div>
  )
}
