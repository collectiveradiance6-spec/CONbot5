import 'dotenv/config'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import { createSocketHub } from './lib/socketHub.js'
import { activityRouter } from './routes/activityRouter.js'
import { guildRouter } from './routes/guildRouter.js'
import { mediaRouter } from './routes/mediaRouter.js'
import { musicRouter, studioRouter, visualsRouter, connectorsRouter } from './routes/featureRouters.js'
import { initVoiceRuntime } from './voice/voiceRuntime.js'

const PORT = parseInt(process.env.PORT || '5000', 10)
const NODE_ENV = process.env.NODE_ENV || 'development'

// ─── CORS Origins ──────────────────────────────────────────────────────────────

const allowedOrigins: string[] = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://conbot5.pages.dev',
  ...(process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? []),
]

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express()
const httpServer = createServer(app)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || NODE_ENV === 'development') {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`))
    }
  },
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))

// ─── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    env: NODE_ENV,
    ts: Date.now(),
    version: '1.0.0',
  })
})

// ─── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/activity', activityRouter)
app.use('/api/guilds', guildRouter)
app.use('/api/media', mediaRouter)
app.use('/api/music', musicRouter)
app.use('/api/studio', studioRouter)
app.use('/api/visuals', visualsRouter)
app.use('/api/connectors', connectorsRouter)

// ─── 404 ────────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api] unhandled error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

// ─── Socket.IO Hub ────────────────────────────────────────────────────────────

createSocketHub(httpServer, allowedOrigins)

// ─── Boot ──────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, async () => {
  console.log(`[conbot5-api] listening on port ${PORT} (${NODE_ENV})`)

  // Boot voice runtime if token available
  await initVoiceRuntime()

  console.log('[conbot5-api] ready')
})

export { app, httpServer }
