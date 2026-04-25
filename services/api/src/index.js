// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — API SERVICE v5.0
// REST endpoints: state push/pull, search proxy, admin digest
// ═══════════════════════════════════════════════════════════════════════
'use strict';
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const http    = require('http');
const playdl  = require('play-dl');

const PORT     = parseInt(process.env.PORT || process.env.API_PORT || '3020');
const BOT_TOKEN = process.env.API_BOT_TOKEN || 'conbot5-internal';

const app    = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

try { const activity = require('./activity'); app.use('/activity', activity); } catch(e) { console.warn('[API] activity route:', e.message); }

// ── IN-MEMORY STATE (keyed by guildId) ────────────────────────────────
const roomStates = new Map();
const pendingCmds = new Map(); // guildId → [{command,payload,ts}]

// ── AUTH MIDDLEWARE ────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers['x-bot-token'];
  if (token !== BOT_TOKEN) return res.status(401).json({error:'Unauthorized'});
  next();
}

// ── HEALTH ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status:'ok', service:'conbot5-api', version:'6.0.0',
  guilds: roomStates.size,
  sseClients: [...sseClients.values()].reduce((s,c)=>s+c.size,0),
  pendingCmds: [...pendingCmds.values()].reduce((s,c)=>s+c.length,0),
  ts: new Date().toISOString(),
}));

// ── STALE STATE CLEANUP — purge guilds inactive > 4h ──────────────────
setInterval(()=>{
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [guildId, state] of roomStates) {
    if (new Date(state.updatedAt).getTime() < cutoff && !state.current) {
      roomStates.delete(guildId);
      pendingCmds.delete(guildId);
      console.log(`[API] purged stale state: ${guildId}`);
    }
  }
}, 30 * 60 * 1000);

// ── STATE: Bot pushes every 2s ─────────────────────────────────────────
app.post('/state/:guildId', auth, (req, res) => {
  const { guildId } = req.params;
  roomStates.set(guildId, { ...req.body, updatedAt: new Date().toISOString() });
  // Broadcast to any SSE listeners
  broadcastSSE(guildId, 'state', roomStates.get(guildId));
  res.json({ ok:true });
});

// ── STATE: Web dashboard pulls ─────────────────────────────────────────
app.get('/state/:guildId', (req, res) => {
  const state = roomStates.get(req.params.guildId);
  if (!state) return res.json({ empty:true, guildId:req.params.guildId });
  res.json(state);
});

// ── ADMIN DIGEST: compressed multi-guild overview ─────────────────────
app.get('/admin/digest', auth, (_, res) => {
  const digest = [...roomStates.entries()].map(([guildId, s]) => ({
    guildId,
    playing: !!s.current,
    track:   s.current?.title?.slice(0,60) || null,
    mood:    s.mood,
    volume:  s.volume,
    queue:   s.queue?.length || 0,
    elapsed: s.elapsed || 0,
    paused:  s.paused || false,
    updatedAt: s.updatedAt,
  }));
  res.json({ guilds: digest.length, data: digest });
});

// ── ROOMS: List all active rooms ───────────────────────────────────────
app.get('/rooms', (_, res) => {
  const rooms = [...roomStates.entries()].map(([guildId, s]) => ({
    guildId, mood:s.mood, volume:s.volume, paused:s.paused,
    current:s.current?.title || null, queueLength:s.queue?.length||0,
  }));
  res.json({ rooms });
});

// ── SEARCH: Proxy so web UI can search without exposing token ──────────
function normalizeYtUrl(url) {
  if (!url) return null;
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) return `https://www.youtube.com/watch?v=${short[1]}`;
  const watch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watch) return `https://www.youtube.com/watch?v=${watch[1]}`;
  return url;
}

app.get('/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q.trim()) return res.json({ results:[] });
  try {
    const results = await playdl.search(q, {source:{youtube:'video'}, limit:8});
    res.json({ results: results.map(r => ({
      title:         r.title,
      url:           normalizeYtUrl(r.url) || r.url,
      durationInSec: r.durationInSec,
      thumbnail:     r.thumbnails?.[0]?.url || null,
      channel:       r.channel?.name || 'YouTube',
    }))});
  } catch(e) {
    console.error('[API] search:', e.message);
    res.json({ results:[], error: e.message });
  }
});

// ── COMMANDS: Web/Desktop sends commands → Bot polls these ────────────
app.post('/commands/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { command, ...payload } = req.body;
  if (!command) return res.status(400).json({error:'command required'});
  if (!pendingCmds.has(guildId)) pendingCmds.set(guildId, []);
  pendingCmds.get(guildId).push({ command, payload, ts:Date.now() });
  res.json({ ok:true, queued:pendingCmds.get(guildId).length });
});

app.get('/commands/:guildId', auth, (req, res) => {
  const { guildId } = req.params;
  const cmds = pendingCmds.get(guildId) || [];
  pendingCmds.set(guildId, []);
  res.json({ commands: cmds.filter(c=>Date.now()-c.ts<30_000) });
});

// ── SSE: Real-time push to web dashboard ──────────────────────────────
const sseClients = new Map(); // guildId → Set of res objects

app.get('/events/:guildId', (req, res) => {
  const { guildId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  if (!sseClients.has(guildId)) sseClients.set(guildId, new Set());
  sseClients.get(guildId).add(res);

  // Send current state immediately
  const state = roomStates.get(guildId);
  if (state) res.write(`data:${JSON.stringify({type:'state',data:state})}\n\n`);

  const heartbeat = setInterval(()=>res.write(':ping\n\n'), 25_000);
  req.on('close', ()=>{ clearInterval(heartbeat); sseClients.get(guildId)?.delete(res); });
});

function broadcastSSE(guildId, type, data) {
  const clients = sseClients.get(guildId);
  if (!clients?.size) return;
  const msg = `data:${JSON.stringify({type,data})}\n\n`;
  for (const res of clients) { try { res.write(msg); } catch {} }
}

// ── PROGRESS TICK: push elapsed every second via SSE ──────────────────
setInterval(()=>{
  for (const [guildId, state] of roomStates) {
    if (state.current && !state.paused) {
      state.elapsed = (state.elapsed||0) + 1;
      broadcastSSE(guildId, 'tick', {elapsed:state.elapsed, guildId});
    }
  }
}, 1000);

server.listen(PORT, ()=>console.log(`🌐 CONbot5 API on :${PORT}`));
module.exports = { app, server };

// ── SEARCH: expanded limit + channel info ─────────────────────────────
// (Already defined above — this block intentionally empty, route is live)
