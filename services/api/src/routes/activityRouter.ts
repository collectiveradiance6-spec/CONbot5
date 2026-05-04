import { Router } from 'express'
import { vibeRoomStore } from '../lib/vibeRoomStore.js'
import { scopedStore } from '../core/scopedStateStore.js'
import { makeScopeKey } from '../types/state.js'

export const activityRouter = Router()

/**
 * GET /api/activity/context
 * Resolve guild+channel → activity context + vibe room resolution
 */
activityRouter.get('/context', (req, res) => {
  const guildId = String(req.query.guild_id || req.query.guildId || 'local-guild')
  const channelId = String(req.query.channel_id || req.query.channelId || 'local-channel')
  const userId = String(req.query.user_id || req.query.userId || 'local-user')
  const instanceId = String(req.query.instance_id || req.query.instanceId || 'global')
  const isAdmin = req.query.admin === 'true'
  const sessionId = String(req.query.session_id || req.query.sessionId || makeScopeKey(guildId, channelId, instanceId))

  const resolution = vibeRoomStore.resolve(guildId, channelId)

  res.json({
    guildId,
    channelId,
    userId,
    instanceId,
    sessionId,
    isAdmin,
    resolution,
  })
})

/**
 * GET /api/activity/state
 * Get current scoped state snapshot for a scope
 */
activityRouter.get('/state', (req, res) => {
  const guildId = String(req.query.guild_id || 'local-guild')
  const channelId = String(req.query.channel_id || 'local-channel')
  const instanceId = String(req.query.instance_id || 'global')
  const scopeKey = makeScopeKey(guildId, channelId, instanceId)

  const scope = scopedStore.get(scopeKey)
  if (!scope) {
    return res.status(404).json({ error: 'Scope not found', scopeKey })
  }

  res.json(scope)
})

/**
 * GET /api/activity/scopes
 * List active scopes (admin/debug)
 */
activityRouter.get('/scopes', (_req, res) => {
  const scopes = scopedStore.allScopes().map((s) => ({
    scopeKey: s.scopeKey,
    guildId: s.guildId,
    channelId: s.channelId,
    memberCount: s.members.length,
    isPlaying: s.playback.isPlaying,
    currentTrack: s.playback.currentTrack?.title ?? null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }))
  res.json({ scopes, count: scopes.length })
})
