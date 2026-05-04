import { Router } from 'express'
import { scopedStore } from '../core/scopedStateStore.js'
import { makeScopeKey } from '../types/state.js'

// ─── Music Router ─────────────────────────────────────────────────────────────

export const musicRouter = Router()

musicRouter.get('/state', (req, res) => {
  const guildId = String(req.query.guild_id || 'local-guild')
  const channelId = String(req.query.channel_id || 'local-channel')
  const instanceId = String(req.query.instance_id || 'global')
  const scope = scopedStore.get(makeScopeKey(guildId, channelId, instanceId))
  res.json({
    playback: scope?.playback ?? null,
    voiceRoom: scope?.voiceRoom ?? null,
  })
})

// ─── Studio Router ────────────────────────────────────────────────────────────

export const studioRouter = Router()

studioRouter.get('/state', (req, res) => {
  const guildId = String(req.query.guild_id || 'local-guild')
  const channelId = String(req.query.channel_id || 'local-channel')
  const instanceId = String(req.query.instance_id || 'global')
  // Studio state is per-scope in future — for now return defaults
  res.json({
    scopeKey: makeScopeKey(guildId, channelId, instanceId),
    studio: {
      eq: [60, 170, 310, 600, 1000, 3000, 6000].map((hz) => ({ hz, gainDb: 0 })),
      compressor: { enabled: false, thresholdDb: -18, ratio: 3, attackMs: 12, releaseMs: 140, makeupGainDb: 0 },
      limiter: { enabled: true, ceilingDb: -1, releaseMs: 80 },
      reverb: { enabled: false, mix: 18, size: 46, damping: 55 },
      chorus: { enabled: false, depth: 22, rateHz: 1.2, mix: 18 },
      normalize: { enabled: true, targetLufs: -14 },
      crossfade: { enabled: false, seconds: 4 },
      filters: { timeStretch: 1, pitchShiftSemitones: 0, stereoWiden: 44, spectralBlur: 8 },
      gain: { inputDb: 0, outputDb: 0, masterVolume: 72 },
      spatial: { enabled: false, mode: 'stereo', roomSize: 36, listenerAngle: 0 },
      preset: 'neutral',
    },
  })
})

// ─── Visuals Router ───────────────────────────────────────────────────────────

export const visualsRouter = Router()

visualsRouter.get('/state', (req, res) => {
  const guildId = String(req.query.guild_id || 'local-guild')
  const channelId = String(req.query.channel_id || 'local-channel')
  const instanceId = String(req.query.instance_id || 'global')
  res.json({
    scopeKey: makeScopeKey(guildId, channelId, instanceId),
    visuals: {
      mode: 'liquidOcean',
      mediaMode: 'audio',
      energy: 0.58,
      bass: 0.52,
      bpm: 92,
    },
  })
})

// ─── Connectors Router ────────────────────────────────────────────────────────

export const connectorsRouter = Router()

connectorsRouter.get('/status', (_req, res) => {
  const botToken = process.env.BOT_TOKEN
  const spotifyId = process.env.SPOTIFY_CLIENT_ID
  const ytKey = process.env.YOUTUBE_API_KEY
  const scClientId = process.env.SOUNDCLOUD_CLIENT_ID

  res.json({
    connectors: {
      discord_bot: botToken ? 'connected' : 'missing_env',
      spotify: spotifyId ? 'configured' : 'missing_env',
      youtube: ytKey ? 'configured' : 'missing_env',
      soundcloud: scClientId ? 'configured' : 'missing_env',
      apple_music: 'not_configured',
      local_media: 'connected',
    },
  })
})
