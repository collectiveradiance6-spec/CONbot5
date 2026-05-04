import { Router } from 'express'
import { vibeRoomStore } from '../lib/vibeRoomStore.js'

export const guildRouter = Router()

/**
 * GET /api/guilds/:guildId/vibe-rooms
 */
guildRouter.get('/:guildId/vibe-rooms', (req, res) => {
  const { guildId } = req.params
  const rooms = vibeRoomStore.getForGuild(guildId)
  res.json({ guildId, rooms })
})

/**
 * PUT /api/guilds/:guildId/vibe-rooms
 * Upsert a vibe room mapping (admin only)
 */
guildRouter.put('/:guildId/vibe-rooms', (req, res) => {
  const { guildId } = req.params
  const { voiceChannelId, roomKey, roomName, themeKey, enabled = true, studioPreset, visualMode } = req.body as {
    voiceChannelId: string
    roomKey: string
    roomName: string
    themeKey: string
    enabled?: boolean
    studioPreset?: string
    visualMode?: string
  }

  if (!voiceChannelId || !roomKey || !roomName || !themeKey) {
    return res.status(400).json({ error: 'Missing required fields: voiceChannelId, roomKey, roomName, themeKey' })
  }

  vibeRoomStore.upsert({
    guildId,
    voiceChannelId,
    roomKey,
    roomName,
    themeKey,
    enabled,
    studioPreset,
    visualMode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  res.json({ ok: true, guildId, roomKey })
})

/**
 * DELETE /api/guilds/:guildId/vibe-rooms/:voiceChannelId
 */
guildRouter.delete('/:guildId/vibe-rooms/:voiceChannelId', (req, res) => {
  const { guildId, voiceChannelId } = req.params
  vibeRoomStore.remove(guildId, voiceChannelId)
  res.json({ ok: true })
})

/**
 * GET /api/guilds/:guildId/vibe-rooms/resolve
 * Resolve a channel to its vibe room without joining
 */
guildRouter.get('/:guildId/vibe-rooms/resolve', (req, res) => {
  const { guildId } = req.params
  const channelId = String(req.query.channel_id || req.query.channelId || '')
  if (!channelId) return res.status(400).json({ error: 'channel_id required' })
  const resolution = vibeRoomStore.resolve(guildId, channelId)
  res.json(resolution)
})
