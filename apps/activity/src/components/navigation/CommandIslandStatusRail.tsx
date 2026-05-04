import { DayNightToggle } from '../theme/DayNightToggle'
import { ConnectionStatus } from '../activity/ConnectionStatus'
import type { WebSocketConnectionStatus } from '../../config/env'

export function CommandIslandStatusRail({
  status,
  mode,
  latency,
  listeners,
}: {
  status: WebSocketConnectionStatus
  mode: string
  latency: number
  listeners: number
}) {
  return (
    <div className="command-mode-rail">
      <span className={`command-chip command-chip--${status.toLowerCase()}`}>{status}</span>
      <span className="command-chip">{mode}</span>
      <span className="command-chip">{latency || 0}ms</span>
      <span className="command-chip">{listeners || 0} listeners</span>
      <ConnectionStatus status={status} />
      <DayNightToggle />
    </div>
  )
}
