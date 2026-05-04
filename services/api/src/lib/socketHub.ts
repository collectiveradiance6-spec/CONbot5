import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/state.js'
import { makeScopeKey } from '../types/state.js'
import { scopedStore } from '../core/scopedStateStore.js'
import { vibeRoomStore } from './vibeRoomStore.js'

// ─── Room name helpers ────────────────────────────────────────────────────────

export const rooms = {
  guild: (guildId: string) => `guild:${guildId}`,
  channel: (guildId: string, channelId: string) => `guild:${guildId}:channel:${channelId}`,
  activity: (scopeKey: string) => `activity:${scopeKey}`,
  voice: (guildId: string, channelId: string) => `voice:${guildId}:${channelId}`,
  vibe: (guildId: string, roomKey: string) => `vibe:${guildId}:${roomKey}`,
  user: (userId: string) => `user:${userId}`,
}

// ─── Create Socket Hub ────────────────────────────────────────────────────────

export function createSocketHub(httpServer: HTTPServer, corsOrigin: string | string[]) {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout: 5000,
  })

  // Attach io to scoped store so it can broadcast
  scopedStore.attach(io)

  // Stale scope pruning every 10 minutes
  setInterval(() => scopedStore.pruneStale(), 10 * 60 * 1000)

  // ─── Connection Handler ────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`)

    // ── activity:join ────────────────────────────────────────────────────────
    socket.on('activity:join', async (payload) => {
      const { guildId, channelId, userId, instanceId = 'global', isAdmin = false } = payload
      const scopeKey = makeScopeKey(guildId, channelId, instanceId)

      // Persist session data on socket
      socket.data = { userId, guildId, channelId, instanceId, scopeKey, isAdmin }

      // Join all relevant Socket.IO rooms
      await socket.join([
        rooms.guild(guildId),
        rooms.channel(guildId, channelId),
        rooms.activity(scopeKey),
        rooms.voice(guildId, channelId),
        rooms.user(userId),
      ])

      // Get/create scope
      const scope = scopedStore.getOrCreate(guildId, channelId, instanceId)

      // Resolve vibe room if guild mapping exists
      const vibeResolution = vibeRoomStore.resolve(guildId, channelId)
      if (vibeResolution.mode === 'vibe' && vibeResolution.vibeRoom) {
        await socket.join(rooms.vibe(guildId, vibeResolution.vibeRoom.roomKey))
        scopedStore.setVibeResolution(scopeKey, vibeResolution)
      }

      // Register member
      scopedStore.addMember(scopeKey, {
        userId,
        socketId: socket.id,
        joinedAt: Date.now(),
        isAdmin,
      })

      // Send authoritative snapshot to joining client
      scopedStore.sendSnapshot(socket.id, scopeKey)

      console.log(`[socket] ${userId} joined scope ${scopeKey}`)
    })

    // ── activity:leave ───────────────────────────────────────────────────────
    socket.on('activity:leave', (payload) => {
      const { guildId, channelId, userId } = payload
      const { instanceId = 'global' } = socket.data ?? {}
      const scopeKey = makeScopeKey(guildId, channelId, instanceId)
      scopedStore.removeMember(scopeKey, userId)
      console.log(`[socket] ${userId} left scope ${scopeKey}`)
    })

    // ── disconnect (clean up) ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { userId, scopeKey } = socket.data ?? {}
      if (userId && scopeKey) {
        scopedStore.removeMember(scopeKey, userId)
      }
      console.log(`[socket] disconnected: ${socket.id}`)
    })

    // ── state:request ────────────────────────────────────────────────────────
    socket.on('state:request', (payload) => {
      const scopeKey = payload.scopeKey ?? socket.data?.scopeKey
      if (!scopeKey) return
      scopedStore.sendSnapshot(socket.id, scopeKey)
    })

    // ── playback:play ────────────────────────────────────────────────────────
    socket.on('playback:play', ({ scopeKey }) => {
      if (!canControl(socket, scopeKey)) return sendError(socket, 'FORBIDDEN', 'Insufficient permissions')
      scopedStore.setPlaying(scopeKey, true)
    })

    // ── playback:pause ───────────────────────────────────────────────────────
    socket.on('playback:pause', ({ scopeKey }) => {
      if (!canControl(socket, scopeKey)) return sendError(socket, 'FORBIDDEN', 'Insufficient permissions')
      scopedStore.setPlaying(scopeKey, false)
    })

    // ── playback:skip ────────────────────────────────────────────────────────
    socket.on('playback:skip', ({ scopeKey }) => {
      if (!canSkip(socket, scopeKey)) return sendError(socket, 'FORBIDDEN', 'Insufficient permissions')
      scopedStore.skipTrack(scopeKey)
    })

    // ── playback:seek ────────────────────────────────────────────────────────
    socket.on('playback:seek', ({ scopeKey, positionMs }) => {
      if (!canControl(socket, scopeKey)) return sendError(socket, 'FORBIDDEN', 'Insufficient permissions')
      scopedStore.seekTo(scopeKey, positionMs)
    })

    // ── playback:volume ──────────────────────────────────────────────────────
    socket.on('playback:volume', ({ scopeKey, volume }) => {
      const scope = scopedStore.get(scopeKey)
      if (!scope) return
      // Enforce volume cap from room settings
      const cap = scope.roomSettings.audio.volumeCap
      const clamped = Math.min(volume, cap)
      if (!canControlVolume(socket, scopeKey)) return sendError(socket, 'FORBIDDEN', 'Insufficient permissions')
      scopedStore.setVolume(scopeKey, clamped)
    })

    // ── playback:enqueue ─────────────────────────────────────────────────────
    socket.on('playback:enqueue', ({ scopeKey, track }) => {
      const scope = scopedStore.get(scopeKey)
      if (!scope) return
      if (!scope.roomSettings.permissions.canGuestsQueue && !socket.data?.isAdmin) {
        return sendError(socket, 'FORBIDDEN', 'Queue is restricted')
      }
      scopedStore.enqueue(scopeKey, track)
    })

    // ── playback:dequeue ─────────────────────────────────────────────────────
    socket.on('playback:dequeue', ({ scopeKey, queueId }) => {
      if (!canControl(socket, scopeKey)) return sendError(socket, 'FORBIDDEN', 'Insufficient permissions')
      scopedStore.dequeue(scopeKey, queueId)
    })

    // ── cinema:update ────────────────────────────────────────────────────────
    socket.on('cinema:update', ({ scopeKey, patch }) => {
      const scope = scopedStore.get(scopeKey)
      if (!scope?.roomSettings.cinemaAllowed) return sendError(socket, 'FORBIDDEN', 'Cinema not allowed in this room')
      scopedStore.patchCinema(scopeKey, patch)
    })

    // ── room:settings:update ─────────────────────────────────────────────────
    socket.on('room:settings:update', ({ scopeKey, settings }) => {
      if (!socket.data?.isAdmin) return sendError(socket, 'FORBIDDEN', 'Admin only')
      scopedStore.patchRoomSettings(scopeKey, settings)
    })

    // ── vibe:select ──────────────────────────────────────────────────────────
    socket.on('vibe:select', async ({ scopeKey, roomKey }) => {
      if (!socket.data?.isAdmin) return sendError(socket, 'FORBIDDEN', 'Admin only')
      const { guildId, channelId } = socket.data
      const resolution = roomKey
        ? vibeRoomStore.resolveByKey(guildId, roomKey, channelId)
        : vibeRoomStore.clearResolution(guildId, channelId)
      scopedStore.setVibeResolution(scopeKey, resolution)
      if (resolution.mode === 'vibe' && resolution.vibeRoom) {
        await socket.join(rooms.vibe(guildId, resolution.vibeRoom.roomKey))
      }
    })
  })

  return io
}

// ─── Permission Helpers ────────────────────────────────────────────────────────

type AnySocket = {
  data?: Partial<SocketData>
  emit: (event: 'error', data: { code: string; message: string }) => boolean
}

function canControl(socket: AnySocket, scopeKey: string): boolean {
  if (!socket.data) return false
  if (socket.data.isAdmin) return true
  const scope = scopedStore.get(scopeKey)
  if (!scope) return false
  return scope.roomSettings.permissions.playMode === 'everyone'
}

function canSkip(socket: AnySocket, scopeKey: string): boolean {
  if (!socket.data) return false
  if (socket.data.isAdmin) return true
  const scope = scopedStore.get(scopeKey)
  if (!scope) return false
  return scope.roomSettings.permissions.canGuestsSkip
}

function canControlVolume(socket: AnySocket, scopeKey: string): boolean {
  if (!socket.data) return false
  if (socket.data.isAdmin) return true
  const scope = scopedStore.get(scopeKey)
  if (!scope) return false
  return scope.roomSettings.permissions.canGuestsControlVolume
}

function sendError(socket: AnySocket, code: string, message: string) {
  socket.emit('error', { code, message })
}
