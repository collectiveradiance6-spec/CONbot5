/**
 * liveSocket.ts — Socket.IO client
 * Replaces raw WebSocket singleton.
 * Fixes P1: multi-subscriber support via handler Sets instead of single callbacks.
 *
 * Connection rooms are joined server-side via `activity:join`.
 */

import { io, type Socket } from 'socket.io-client'
import { appConfig, type WebSocketConnectionStatus } from '../config/env'

export type LiveSocketMessage<TPayload = unknown> = {
  type: string
  payload: TPayload
}

export type StatusHandler = (status: WebSocketConnectionStatus) => void
export type MessageHandler = (message: LiveSocketMessage) => void

type LiveSocketOptions = {
  onStatus?: StatusHandler
  onMessage?: MessageHandler
  maxReconnectMs?: number
}

// ─── Multi-subscriber registries (fixes P1 singleton drop) ───────────────────

const statusHandlers = new Set<StatusHandler>()
const messageHandlers = new Set<MessageHandler>()

let currentStatus: WebSocketConnectionStatus = 'Offline'

function notifyStatus(status: WebSocketConnectionStatus) {
  currentStatus = status
  for (const h of statusHandlers) h(status)
}

function notifyMessage(msg: LiveSocketMessage) {
  for (const h of messageHandlers) h(msg)
}

// ─── Socket singleton ─────────────────────────────────────────────────────────

let socket: Socket | null = null

function getSocketUrl(): string {
  const raw = appConfig.wsUrl
  // socket.io-client expects http(s):// not ws(s)://
  return raw.replace(/^ws(s?):\/\//, 'http$1://')
}

function initSocket() {
  if (socket?.connected || socket?.active) return

  try {
    socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 750,
      reconnectionDelayMax: 15000,
      reconnectionAttempts: Infinity,
      withCredentials: true,
      autoConnect: true,
    })

    socket.on('connect', () => {
      notifyStatus('Connected')
    })

    socket.on('disconnect', (reason: string) => {
      const status: WebSocketConnectionStatus =
        reason === 'io server disconnect' ? 'Offline' : 'Reconnecting'
      notifyStatus(status)
    })

    socket.on('connect_error', () => {
      notifyStatus('Reconnecting')
    })

    // Bridge all server events to generic LiveSocketMessage handlers
    const bridgeEvent = (type: string) => (payload: unknown) => {
      notifyMessage({ type, payload })
    }

    socket.on('state:snapshot', bridgeEvent('state:snapshot'))
    socket.on('state:patch', bridgeEvent('state:patch'))
    socket.on('playback:update', bridgeEvent('playback:state'))
    socket.on('presence:update', bridgeEvent('presence:update'))
    socket.on('vibe:update', bridgeEvent('vibe:update'))
    socket.on('media:state', bridgeEvent('media:state'))
    socket.on('cinema:state', bridgeEvent('cinema:state'))
    socket.on('room:settings', bridgeEvent('room:settings'))
    socket.on('error', (err: unknown) => notifyMessage({ type: 'socket:error', payload: err }))

  } catch (err) {
    console.error('[socket] init failed, running mock:', err)
    notifyStatus('Mock')
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function createLiveSocket(options: LiveSocketOptions = {}) {
  if (options.onStatus) {
    statusHandlers.add(options.onStatus)
    // Deliver current status immediately to new subscriber
    options.onStatus(currentStatus)
  }
  if (options.onMessage) {
    messageHandlers.add(options.onMessage)
  }

  initSocket()

  return {
    send(message: LiveSocketMessage) {
      if (!socket) return
      // Map legacy message.type → socket.io event name
      const type = message.type as string
      if (type && socket.connected) {
        socket.emit(type, message.payload)
      }
    },

    close() {
      if (options.onStatus) statusHandlers.delete(options.onStatus)
      if (options.onMessage) messageHandlers.delete(options.onMessage)
      // Only disconnect when zero subscribers remain
      if (statusHandlers.size === 0 && messageHandlers.size === 0) {
        socket?.disconnect()
        socket = null
        currentStatus = 'Offline'
      }
    },

    get id() {
      return socket?.id
    },
    get connected() {
      return socket?.connected ?? false
    },
  }
}
