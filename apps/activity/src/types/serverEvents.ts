/**
 * serverEvents.ts
 * Frontend-side mirror of the backend Socket.IO event contracts.
 * Keep in sync with services/api/src/types/state.ts
 */

import type { ConbotState } from '../state/types'

export type ScopedSnapshot = {
  scopeKey: string
  guildId: string
  channelId: string
  instanceId: string
  members: Array<{ userId: string; socketId: string; joinedAt: number; isAdmin: boolean }>
  voiceRoom: {
    voiceChannelId: string
    voiceChannelName: string
    guildId: string
    listenerCount: number
    botConnected: boolean
    connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
  }
  playback: {
    isPlaying: boolean
    volume: number
    loopMode: 'off' | 'one' | 'all'
    shuffleEnabled: boolean
    positionMs: number
    durationMs: number
    currentTrack: ConbotState['currentTrack']
    queue: ConbotState['queue']
  }
  cinema: ConbotState['cinema']
  vibeResolution: {
    mode: 'global' | 'vibe'
    vibeRoom: { roomKey: string; roomName: string; themeKey: string } | null
    themeKey: string
    guildId: string
    channelId: string
  }
  connectors: ConbotState['connectors']
  createdAt: number
  updatedAt: number
}

// Server → Client events
export interface ServerToClientEvents {
  'state:snapshot': (snapshot: ScopedSnapshot) => void
  'state:patch': (patch: { scopeKey: string; changes: Partial<ScopedSnapshot>; ts: number }) => void
  'playback:update': (state: ScopedSnapshot['playback'] & { scopeKey: string; ts: number }) => void
  'presence:update': (data: { scopeKey: string; members: ScopedSnapshot['members']; ts: number }) => void
  'vibe:update': (data: { scopeKey: string; resolution: ScopedSnapshot['vibeResolution']; ts: number }) => void
  'media:state': (data: { scopeKey: string; status: string; ts: number }) => void
  'cinema:state': (data: Partial<ConbotState['cinema']> & { scopeKey: string }) => void
  'room:settings': (data: { scopeKey: string; settings: unknown }) => void
  'error': (data: { code: string; message: string }) => void
}

// Client → Server events
export interface ClientToServerEvents {
  'activity:join': (payload: {
    guildId: string
    channelId: string
    userId: string
    sessionId?: string
    instanceId?: string
    isAdmin?: boolean
  }) => void
  'activity:leave': (payload: { guildId: string; channelId: string; userId: string }) => void
  'playback:play': (payload: { scopeKey: string }) => void
  'playback:pause': (payload: { scopeKey: string }) => void
  'playback:skip': (payload: { scopeKey: string }) => void
  'playback:seek': (payload: { scopeKey: string; positionMs: number }) => void
  'playback:volume': (payload: { scopeKey: string; volume: number }) => void
  'playback:enqueue': (payload: { scopeKey: string; track: ConbotState['queue'][number] }) => void
  'playback:dequeue': (payload: { scopeKey: string; queueId: string }) => void
  'cinema:update': (payload: { scopeKey: string; patch: Partial<ConbotState['cinema']> }) => void
  'state:request': (payload: { scopeKey?: string }) => void
  'room:settings:update': (payload: { scopeKey: string; settings: unknown }) => void
  'vibe:select': (payload: { scopeKey: string; roomKey: string | null }) => void
}
