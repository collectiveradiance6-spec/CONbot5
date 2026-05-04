import { Router } from 'express'
import { scopedStore } from '../core/scopedStateStore.js'
import { makeScopeKey } from '../types/state.js'
import { voiceRuntime } from '../voice/voiceRuntime.js'

export const mediaRouter = Router()

function getScopeKey(req: { query: Record<string, unknown> }) {
  const guildId = String(req.query.guild_id || 'local-guild')
  const channelId = String(req.query.channel_id || 'local-channel')
  const instanceId = String(req.query.instance_id || 'global')
  return makeScopeKey(guildId, channelId, instanceId)
}

/**
 * GET /api/media/status
 */
mediaRouter.get('/status', (req, res) => {
  const scopeKey = getScopeKey(req)
  const scope = scopedStore.get(scopeKey)
  if (!scope) return res.json({ status: 'no_scope', scopeKey })

  res.json({
    scopeKey,
    botConnected: scope.voiceRoom.botConnected,
    connectionState: scope.voiceRoom.connectionState,
    isPlaying: scope.playback.isPlaying,
    currentTrack: scope.playback.currentTrack,
    connectors: scope.connectors,
  })
})

/**
 * GET /api/media/video/state
 */
mediaRouter.get('/video/state', (req, res) => {
  const scopeKey = getScopeKey(req)
  const scope = scopedStore.get(scopeKey)
  if (!scope) return res.json({ scopeKey, cinema: null })
  res.json({ scopeKey, cinema: scope.cinema })
})

/**
 * PATCH /api/media/video/state
 */
mediaRouter.patch('/video/state', (req, res) => {
  const { guildId, channelId, instanceId = 'global', ...patch } = req.body as {
    guildId: string
    channelId: string
    instanceId?: string
    [key: string]: unknown
  }
  if (!guildId || !channelId) return res.status(400).json({ error: 'guildId and channelId required' })
  const scopeKey = makeScopeKey(guildId, channelId, instanceId)
  scopedStore.patchCinema(scopeKey, patch as Parameters<typeof scopedStore.patchCinema>[1])
  res.json({ ok: true, scopeKey })
})

/**
 * GET /api/media/podcast/state
 */
mediaRouter.get('/podcast/state', (req, res) => {
  const scopeKey = getScopeKey(req)
  const scope = scopedStore.get(scopeKey)
  if (!scope) return res.json({ scopeKey, playback: null })
  res.json({
    scopeKey,
    playback: scope.playback,
    mediaKind: 'podcast',
  })
})

/**
 * PATCH /api/media/podcast/state
 */
mediaRouter.patch('/podcast/state', (req, res) => {
  const { guildId, channelId, instanceId = 'global', isPlaying, volume, positionMs } = req.body as {
    guildId: string
    channelId: string
    instanceId?: string
    isPlaying?: boolean
    volume?: number
    positionMs?: number
  }
  if (!guildId || !channelId) return res.status(400).json({ error: 'guildId and channelId required' })
  const scopeKey = makeScopeKey(guildId, channelId, instanceId)

  if (typeof isPlaying === 'boolean') scopedStore.setPlaying(scopeKey, isPlaying)
  if (typeof volume === 'number') scopedStore.setVolume(scopeKey, volume)
  if (typeof positionMs === 'number') scopedStore.seekTo(scopeKey, positionMs)

  res.json({ ok: true, scopeKey })
})

/**
 * POST /api/media/voice/join
 * Connect bot to a voice channel
 */
mediaRouter.post('/voice/join', async (req, res) => {
  const { guildId, channelId } = req.body as { guildId: string; channelId: string }
  if (!guildId || !channelId) return res.status(400).json({ error: 'guildId and channelId required' })

  const joined = await voiceRuntime.joinChannel(guildId, channelId)
  if (!joined) return res.status(500).json({ error: 'Failed to join voice channel' })

  res.json({ ok: true, guildId, channelId })
})

/**
 * POST /api/media/voice/leave
 */
mediaRouter.post('/voice/leave', async (req, res) => {
  const { guildId } = req.body as { guildId: string }
  if (!guildId) return res.status(400).json({ error: 'guildId required' })
  await voiceRuntime.leaveGuild(guildId)
  res.json({ ok: true, guildId })
})

/**
 * POST /api/media/play
 * Play a legal stream URL via bot
 */
mediaRouter.post('/play', (req, res) => {
  const { guildId, streamUrl, legalRoute } = req.body as {
    guildId: string
    streamUrl: string
    legalRoute: string
  }
  if (!guildId || !streamUrl) return res.status(400).json({ error: 'guildId and streamUrl required' })

  const ok = voiceRuntime.playStream(guildId, streamUrl, legalRoute)
  if (!ok) return res.status(400).json({ error: 'Stream rejected — not a legal route or bot not connected' })

  res.json({ ok: true })
})
