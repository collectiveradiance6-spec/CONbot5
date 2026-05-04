import type { Server as SocketIOServer } from 'socket.io'
import type {
  ScopeKey,
  ScopedActivityState,
  SessionMember,
  Track,
  CinemaState,
  RegularRoomSettings,
  VibeRoomResolution,
  PlaybackState,
  RegularVoiceRoom,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/state.js'
import { makeScopeKey } from '../types/state.js'

// ─── Default Factories ───────────────────────────────────────────────────────

function defaultPlayback(): PlaybackState {
  return {
    isPlaying: false,
    volume: 72,
    loopMode: 'off',
    shuffleEnabled: false,
    positionMs: 0,
    durationMs: 0,
    currentTrack: null,
    queue: [],
  }
}

function defaultVoiceRoom(guildId: string, channelId: string): RegularVoiceRoom {
  return {
    voiceChannelId: channelId,
    voiceChannelName: 'Voice Room',
    guildId,
    listenerCount: 0,
    botConnected: false,
    connectionState: 'disconnected',
  }
}

function defaultRoomSettings(): RegularRoomSettings {
  return {
    permissions: {
      playMode: 'everyone',
      canGuestsQueue: true,
      canGuestsSkip: false,
      canGuestsControlVolume: true,
      canGuestsStopPlayback: false,
      voteSkipRequired: false,
      voteSkipThresholdPercent: 51,
    },
    queue: {
      queueEnabled: true,
      maxQueueLength: 50,
      maxTracksPerUser: 5,
      allowDuplicates: false,
      explicitAllowed: false,
      publicSafeOnly: true,
      allowExternalSources: true,
      allowUploads: false,
      allowImportedPlaylists: true,
      autoClearWhenEmpty: false,
      saveQueueWhenEmpty: true,
    },
    audio: {
      defaultVolume: 72,
      volumeCap: 100,
      defaultEqPreset: 'neutral',
      nightSafeMode: false,
      volumeNormalization: true,
      crossfadeMs: 0,
      voiceDuckingEnabled: false,
      visualizerSensitivity: 0.6,
    },
    cinemaAllowed: true,
    syncedWatchAllowed: true,
    lyricsAllowed: true,
  }
}

function defaultCinema(): CinemaState {
  return {
    mode: 'visualizer',
    sourceKind: 'visualizer',
    title: 'Prismatic Theater',
    quality: 'auto',
    captionsEnabled: true,
    theaterDim: false,
    fullscreen: false,
    miniPlayer: false,
    syncStatus: 'local-only',
    aspectRatio: '16:9',
  }
}

function defaultVibeResolution(guildId: string, channelId: string): VibeRoomResolution {
  return {
    mode: 'global',
    vibeRoom: null,
    themeKey: 'global-night',
    guildId,
    channelId,
  }
}

function createScope(guildId: string, channelId: string, instanceId: string): ScopedActivityState {
  const scopeKey = makeScopeKey(guildId, channelId, instanceId)
  return {
    scopeKey,
    guildId,
    channelId,
    instanceId,
    members: [],
    voiceRoom: defaultVoiceRoom(guildId, channelId),
    roomSettings: defaultRoomSettings(),
    playback: defaultPlayback(),
    vibeResolution: defaultVibeResolution(guildId, channelId),
    cinema: defaultCinema(),
    connectors: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// ─── Scoped State Store ───────────────────────────────────────────────────────

export class ScopedStateStore {
  private scopes = new Map<ScopeKey, ScopedActivityState>()
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null

  attach(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
    this.io = io
  }

  // ─── Scope Lifecycle ─────────────────────────────────────────────────────

  getOrCreate(guildId: string, channelId: string, instanceId = 'global'): ScopedActivityState {
    const key = makeScopeKey(guildId, channelId, instanceId)
    if (!this.scopes.has(key)) {
      this.scopes.set(key, createScope(guildId, channelId, instanceId))
    }
    return this.scopes.get(key)!
  }

  get(scopeKey: ScopeKey): ScopedActivityState | undefined {
    return this.scopes.get(scopeKey)
  }

  // Prune scopes with 0 members older than 30 minutes
  pruneStale(maxAgeMs = 30 * 60 * 1000) {
    const cutoff = Date.now() - maxAgeMs
    for (const [key, scope] of this.scopes) {
      if (scope.members.length === 0 && scope.createdAt < cutoff) {
        this.scopes.delete(key)
      }
    }
  }

  allScopes(): ScopedActivityState[] {
    return Array.from(this.scopes.values())
  }

  // ─── Member Management ───────────────────────────────────────────────────

  addMember(scopeKey: ScopeKey, member: SessionMember) {
    const scope = this.scopes.get(scopeKey)
    if (!scope) return
    scope.members = [...scope.members.filter((m) => m.userId !== member.userId), member]
    scope.voiceRoom.listenerCount = scope.members.length
    scope.updatedAt = Date.now()
    this.broadcastPresence(scopeKey)
  }

  removeMember(scopeKey: ScopeKey, userId: string) {
    const scope = this.scopes.get(scopeKey)
    if (!scope) return
    scope.members = scope.members.filter((m) => m.userId !== userId)
    scope.voiceRoom.listenerCount = scope.members.length
    scope.updatedAt = Date.now()
    this.broadcastPresence(scopeKey)
  }

  // ─── Playback Mutations ──────────────────────────────────────────────────

  setPlaying(scopeKey: ScopeKey, isPlaying: boolean) {
    return this.patchPlayback(scopeKey, { isPlaying })
  }

  setVolume(scopeKey: ScopeKey, volume: number) {
    return this.patchPlayback(scopeKey, { volume: Math.max(0, Math.min(100, volume)) })
  }

  seekTo(scopeKey: ScopeKey, positionMs: number) {
    return this.patchPlayback(scopeKey, { positionMs })
  }

  setCurrentTrack(scopeKey: ScopeKey, track: Track | null) {
    return this.patchPlayback(scopeKey, {
      currentTrack: track,
      positionMs: 0,
      durationMs: track?.durationMs ?? 0,
      isPlaying: track != null,
    })
  }

  enqueue(scopeKey: ScopeKey, track: Track) {
    const scope = this.scopes.get(scopeKey)
    if (!scope) return
    const maxLen = scope.roomSettings.queue.maxQueueLength
    if (scope.playback.queue.length >= maxLen) return
    scope.playback.queue = [...scope.playback.queue, { ...track, queueId: `q_${Date.now()}_${Math.random().toString(36).slice(2)}` }]
    scope.updatedAt = Date.now()
    this.broadcastPlayback(scopeKey)
  }

  dequeue(scopeKey: ScopeKey, queueId: string) {
    const scope = this.scopes.get(scopeKey)
    if (!scope) return
    scope.playback.queue = scope.playback.queue.filter((t) => t.queueId !== queueId)
    scope.updatedAt = Date.now()
    this.broadcastPlayback(scopeKey)
  }

  skipTrack(scopeKey: ScopeKey): Track | null {
    const scope = this.scopes.get(scopeKey)
    if (!scope) return null

    if (scope.playback.loopMode === 'one' && scope.playback.currentTrack) {
      scope.playback.positionMs = 0
      this.broadcastPlayback(scopeKey)
      return scope.playback.currentTrack
    }

    const next = scope.playback.queue[0] ?? null
    scope.playback.queue = scope.playback.queue.slice(1)
    scope.playback.currentTrack = next
    scope.playback.positionMs = 0
    scope.playback.durationMs = next?.durationMs ?? 0
    scope.playback.isPlaying = next != null
    scope.updatedAt = Date.now()
    this.broadcastPlayback(scopeKey)
    return next
  }

  patchPlayback(scopeKey: ScopeKey, patch: Partial<PlaybackState>) {
    const scope = this.scopes.get(scopeKey)
    if (!scope) return
    scope.playback = { ...scope.playback, ...patch }
    scope.updatedAt = Date.now()
    this.broadcastPlayback(scopeKey)
  }

  // ─── Cinema Mutations ────────────────────────────────────────────────────

  patchCinema(scopeKey: ScopeKey, patch: Partial<CinemaState>) {
    const scope = this.scopes.get(scopeKey)
    if (!scope) return
    scope.cinema = { ...scope.cinema, ...patch }
    scope.updatedAt = Date.now()
    this.io?.to(this.roomName('activity', scopeKey)).emit('cinema:state', {
      scopeKey,
      ...scope.cinema,
    })
  }

  // ─── Room Settings ───────────────────────────────────────────────────────

  patchRoomSettings(scopeKey: ScopeKey, patch: Partial<RegularRoomSettings>) {
    const scope = this.scopes.get(scopeKey)
    if (!scope) return
    scope.roomSettings = { ...scope.roomSettings, ...patch }
    scope.updatedAt = Date.now()
    this.io?.to(this.roomName('activity', scopeKey)).emit('room:settings', {
      scopeKey,
      settings: scope.roomSettings,
    })
  }

  // ─── Vibe Mutation ───────────────────────────────────────────────────────

  setVibeResolution(scopeKey: ScopeKey, resolution: VibeRoomResolution) {
    const scope = this.scopes.get(scopeKey)
    if (!scope) return
    scope.vibeResolution = resolution
    scope.updatedAt = Date.now()
    this.io?.to(this.roomName('activity', scopeKey)).emit('vibe:update', {
      scopeKey,
      resolution,
      ts: Date.now(),
    })
  }

  // ─── Voice Room State ────────────────────────────────────────────────────

  setBotConnected(guildId: string, channelId: string, connected: boolean) {
    for (const scope of this.scopes.values()) {
      if (scope.guildId === guildId && scope.channelId === channelId) {
        scope.voiceRoom.botConnected = connected
        scope.voiceRoom.connectionState = connected ? 'connected' : 'disconnected'
        scope.updatedAt = Date.now()
        this.broadcastStatePatch(scope.scopeKey, {
          voiceRoom: scope.voiceRoom,
        })
      }
    }
  }

  setVoiceChannelName(guildId: string, channelId: string, name: string) {
    for (const scope of this.scopes.values()) {
      if (scope.guildId === guildId && scope.channelId === channelId) {
        scope.voiceRoom.voiceChannelName = name
      }
    }
  }

  // ─── Broadcast Helpers ───────────────────────────────────────────────────

  private roomName(type: string, scopeKey: ScopeKey): string {
    return `${type}:${scopeKey}`
  }

  broadcastPlayback(scopeKey: ScopeKey) {
    const scope = this.scopes.get(scopeKey)
    if (!scope || !this.io) return
    this.io.to(this.roomName('activity', scopeKey)).emit('playback:update', {
      ...scope.playback,
      scopeKey,
      ts: Date.now(),
    })
  }

  broadcastPresence(scopeKey: ScopeKey) {
    const scope = this.scopes.get(scopeKey)
    if (!scope || !this.io) return
    this.io.to(this.roomName('activity', scopeKey)).emit('presence:update', {
      scopeKey,
      members: scope.members,
      ts: Date.now(),
    })
  }

  broadcastStatePatch(scopeKey: ScopeKey, changes: Partial<ScopedActivityState>) {
    if (!this.io) return
    this.io.to(this.roomName('activity', scopeKey)).emit('state:patch', {
      scopeKey,
      changes,
      ts: Date.now(),
    })
  }

  sendSnapshot(socketId: string, scopeKey: ScopeKey) {
    const scope = this.scopes.get(scopeKey)
    if (!scope || !this.io) return
    this.io.to(socketId).emit('state:snapshot', scope)
  }
}

export const scopedStore = new ScopedStateStore()
