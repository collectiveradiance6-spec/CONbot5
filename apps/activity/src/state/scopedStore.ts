/**
 * scopedStore.ts
 * Bridges the authoritative backend ScopedActivityState → local Zustand store.
 * Handles snapshot hydration, incremental patches, and optimistic updates.
 */

import { useConbotStore } from './useConbotStore'
import type { ConbotState } from './types'
import type { LiveSocketMessage } from '../lib/liveSocket'

// Backend ScopedActivityState shape (subset we care about on the client)
type BackendScopedState = {
  scopeKey?: string
  playback?: {
    isPlaying?: boolean
    volume?: number
    loopMode?: 'off' | 'one' | 'all'
    shuffleEnabled?: boolean
    positionMs?: number
    durationMs?: number
    currentTrack?: ConbotState['currentTrack']
    queue?: ConbotState['queue']
  }
  voiceRoom?: {
    voiceChannelId?: string
    voiceChannelName?: string
    guildId?: string
    listenerCount?: number
    botConnected?: boolean
    connectionState?: string
  }
  members?: Array<{ userId: string; socketId: string; joinedAt: number; isAdmin: boolean }>
  cinema?: Partial<ConbotState['cinema']>
  vibeResolution?: {
    mode: 'global' | 'vibe'
    vibeRoom: { roomKey: string } | null
    themeKey: string
    guildId: string
    channelId: string
  }
  connectors?: ConbotState['connectors']
}

type PlaybackUpdate = BackendScopedState['playback'] & { scopeKey?: string; ts?: number }

function mapSnapshotToStore(data: BackendScopedState): Partial<ConbotState> {
  const patch: Partial<ConbotState> = {}

  if (data.playback) {
    const pb = data.playback
    if (pb.currentTrack !== undefined) patch.currentTrack = pb.currentTrack
    if (pb.queue !== undefined) patch.queue = pb.queue
    if (pb.isPlaying !== undefined) patch.isPlaying = pb.isPlaying
    if (pb.volume !== undefined) patch.volume = pb.volume
    if (pb.loopMode !== undefined) patch.loopMode = pb.loopMode
    if (pb.shuffleEnabled !== undefined) patch.shuffleEnabled = pb.shuffleEnabled
    if (pb.positionMs !== undefined) patch.positionMs = pb.positionMs
    if (pb.durationMs !== undefined) patch.durationMs = pb.durationMs
  }

  if (data.voiceRoom) {
    const vr = data.voiceRoom
    patch.regularVoiceRooms = [
      {
        voiceChannelId: vr.voiceChannelId ?? '',
        voiceChannelName: vr.voiceChannelName ?? 'Voice Room',
        guildId: vr.guildId ?? '',
        listenerCount: vr.listenerCount ?? 0,
        botConnected: vr.botConnected ?? false,
      },
    ]
  }

  if (data.cinema) {
    patch.cinema = { ...useConbotStore.getState().cinema, ...data.cinema }
  }

  if (data.vibeResolution) {
    patch.activeVibeRoomId = data.vibeResolution.vibeRoom?.roomKey ?? null
  }

  if (data.members) {
    patch.session = {
      ...useConbotStore.getState().session,
      listeners: data.members.length,
    }
  }

  if (data.connectors) {
    patch.connectors = data.connectors
  }

  return patch
}

// ─── Message handler: maps all server → store ─────────────────────────────────

export function syncStoreFromMessage(message: LiveSocketMessage) {
  const store = useConbotStore.getState()

  switch (message.type) {
    case 'state:snapshot': {
      const data = message.payload as BackendScopedState
      const mapped = mapSnapshotToStore(data)
      store.setSnapshot(mapped)
      break
    }

    case 'state:patch': {
      const { changes } = message.payload as { changes: BackendScopedState; scopeKey: string; ts: number }
      const mapped = mapSnapshotToStore(changes)
      store.applyPatch(mapped)
      break
    }

    case 'playback:state': {
      const pb = message.payload as PlaybackUpdate
      const update: Partial<ConbotState> = {}
      if (pb.currentTrack !== undefined) update.currentTrack = pb.currentTrack
      if (pb.queue !== undefined) update.queue = pb.queue
      if (pb.isPlaying !== undefined) update.isPlaying = pb.isPlaying
      if (pb.volume !== undefined) update.volume = pb.volume
      if (pb.loopMode !== undefined) update.loopMode = pb.loopMode
      if (pb.shuffleEnabled !== undefined) update.shuffleEnabled = pb.shuffleEnabled
      if (pb.positionMs !== undefined) update.positionMs = pb.positionMs
      if (pb.durationMs !== undefined) update.durationMs = pb.durationMs
      store.applyPatch(update)
      break
    }

    case 'presence:update': {
      const { members } = message.payload as { members: BackendScopedState['members']; scopeKey: string }
      if (members) {
        store.applyPatch({
          session: { ...store.session, listeners: members.length },
        })
      }
      break
    }

    case 'vibe:update': {
      const { resolution } = message.payload as { resolution: BackendScopedState['vibeResolution']; scopeKey: string }
      if (resolution) {
        store.applyPatch({ activeVibeRoomId: resolution.vibeRoom?.roomKey ?? null })
      }
      break
    }

    case 'cinema:state': {
      const cinema = message.payload as Partial<ConbotState['cinema']> & { scopeKey?: string }
      const { scopeKey: _sk, ...cinemaPatch } = cinema
      store.applyPatch({ cinema: { ...store.cinema, ...cinemaPatch } })
      break
    }

    case 'room:settings': {
      // Room settings — store for permission checks
      // Future: expose via useRoomSettings() hook
      break
    }
  }
}
