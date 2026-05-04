import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AmbientOceanEngine } from '../background/AmbientOceanEngine'
import { BottomTransportBar } from '../player/BottomTransportBar'
import { ThemeProvider } from '../../theme/ThemeContext'
import type { LiveSocketMessage } from '../../lib/liveSocket'
import { resolveActivityContext, type ResolvedActivityContext } from '../../lib/activityContext'
import type { WebSocketConnectionStatus } from '../../config/env'
import { DynamicCommandIsland } from '../navigation/DynamicCommandIsland'
import { BrandStatusChip } from '../brand/BrandStatusChip'
import { closeConbotSocket, getConbotSocket } from '../../core/socket'

export type ActivityShellContext = {
  activityContext: ResolvedActivityContext | null
  connectionStatus: WebSocketConnectionStatus
  lastMessage: LiveSocketMessage | null
  scopeKey: string | null
}

export function AppShell({
  children,
}: {
  children: (context: ActivityShellContext) => ReactNode
}) {
  const [activityContext, setActivityContext] = useState<ResolvedActivityContext | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<WebSocketConnectionStatus>('Offline')
  const [lastMessage, setLastMessage] = useState<LiveSocketMessage | null>(null)
  const [scopeKey, setScopeKey] = useState<string | null>(null)

  useEffect(() => {
    let closed = false
    let liveSocket: ReturnType<typeof getConbotSocket> | null = null
    let currentContext: ResolvedActivityContext | null = null

    // ── Playback action bridge from child components ─────────────────────────
    const handlePlaybackAction = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string; payload?: Record<string, unknown> }>).detail
      if (!detail || !currentContext || !liveSocket) return
      liveSocket.send({
        type: detail.type,
        payload: {
          ...detail.payload,
          sessionId: currentContext.sessionId,
          guildId: currentContext.guildId,
          channelId: currentContext.channelId,
          userId: currentContext.userId,
          // Include scope key so backend can route to correct scope
          scopeKey: `${currentContext.guildId}:${currentContext.channelId}:global`,
        },
      })
    }

    window.addEventListener('conbot5:playback', handlePlaybackAction)

    resolveActivityContext().then((context) => {
      if (closed) return
      currentContext = context
      setActivityContext(context)

      const key = `${context.guildId}:${context.channelId}:global`
      setScopeKey(key)

      liveSocket = getConbotSocket({
        onStatus: setConnectionStatus,
        onMessage: setLastMessage,
      })

      // ── Authoritative activity join handshake ──────────────────────────────
      // Server responds with state:snapshot for this scope
      liveSocket.send({
        type: 'activity:join',
        payload: {
          guildId: context.guildId,
          channelId: context.channelId,
          userId: context.userId,
          sessionId: context.sessionId,
          instanceId: 'global',
          isAdmin: context.isAdmin,
        },
      })

      // Request full snapshot (belt-and-suspenders)
      liveSocket.send({
        type: 'state:request',
        payload: { scopeKey: key },
      })
    })

    return () => {
      closed = true
      if (currentContext && liveSocket) {
        liveSocket.send({
          type: 'activity:leave',
          payload: {
            guildId: currentContext.guildId,
            channelId: currentContext.channelId,
            userId: currentContext.userId,
          },
        })
      }
      closeConbotSocket()
      window.removeEventListener('conbot5:playback', handlePlaybackAction)
    }
  }, [])

  const shellContext = useMemo(
    () => ({ activityContext, connectionStatus, lastMessage, scopeKey }),
    [activityContext, connectionStatus, lastMessage, scopeKey],
  )

  return (
    <ThemeProvider>
      <main
        className="relative min-h-screen overflow-hidden bg-pearl text-[color:var(--text-main)]"
        data-vibe={activityContext?.resolution.vibeRoom?.roomKey ?? 'global'}
      >
        <AmbientOceanEngine />

        <section className="relative z-10 flex min-h-screen w-full flex-col px-4 pb-36 pt-5 sm:px-6 lg:px-8">
          <header className="top-command-shell">
            <BrandStatusChip />
            <DynamicCommandIsland context={shellContext} />
          </header>
          <div className="route-content-shell">{children(shellContext)}</div>
        </section>

        <BottomTransportBar />
      </main>
    </ThemeProvider>
  )
}
