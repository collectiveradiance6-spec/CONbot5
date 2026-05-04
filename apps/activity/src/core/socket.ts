/**
 * socket.ts — Conbot5 socket singleton
 * Uses socket.io-client via createLiveSocket.
 * Wires all server events to the scoped store bridge.
 */

import { createLiveSocket, type LiveSocketMessage } from '../lib/liveSocket'
import type { WebSocketConnectionStatus } from '../config/env'
import { useConbotStore } from '../state/useConbotStore'
import { syncStoreFromMessage } from '../state/scopedStore'

let sharedSocket: ReturnType<typeof createLiveSocket> | null = null
let lastStatus: WebSocketConnectionStatus = 'Offline'

// ─── Socket Singleton ─────────────────────────────────────────────────────────

export function getConbotSocket(
  options: {
    onStatus?: (status: WebSocketConnectionStatus) => void
    onMessage?: (message: LiveSocketMessage) => void
  } = {}
) {
  // createLiveSocket now uses a shared Set of handlers so subsequent calls
  // register additional subscribers without dropping earlier ones (fixes P1)
  const instance = createLiveSocket({
    onStatus(status) {
      lastStatus = status
      useConbotStore.getState().applyPatch({
        connection: {
          ...useConbotStore.getState().connection,
          connected: status === 'Connected',
          socketId: instance.id,
        },
      })
      options.onStatus?.(status)
    },
    onMessage(message) {
      // Bridge to authoritative scoped store sync
      syncStoreFromMessage(message)
      options.onMessage?.(message)
    },
  })

  // Store reference for legacy sendConbotEvent / closeConbotSocket callers
  sharedSocket = instance

  // Deliver current status immediately to caller
  options.onStatus?.(lastStatus)

  return instance
}

// ─── Typed playback events ────────────────────────────────────────────────────

export function sendPlaybackEvent(
  type:
    | 'playback:play'
    | 'playback:pause'
    | 'playback:skip'
    | 'playback:seek'
    | 'playback:volume'
    | 'playback:enqueue'
    | 'playback:dequeue',
  payload: Record<string, unknown>
) {
  sharedSocket?.send({ type, payload })
}

export function sendConbotEvent(type: string, payload: Record<string, unknown> = {}) {
  sharedSocket?.send({ type, payload })
}

export function closeConbotSocket() {
  sharedSocket?.close()
  sharedSocket = null
  lastStatus = 'Offline'
}
