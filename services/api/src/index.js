// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — API SERVICE v8.0
// REST + SSE + WebSocket + Discord OAuth (fixed redirect_uri)
// services/api/src/index.js
// ═══════════════════════════════════════════════════════════════════════
'use strict';
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const http     = require('http');
const https    = require('https');
const { WebSocketServer } = require('ws'); // npm install ws

const PORT           = parseInt(process.env.PORT || '3020');
const BOT_TOKEN      = process.env.API_BOT_TOKEN    || 'conbot5-internal';
const CLIENT_ID      = process.env.DISCORD_CLIENT_ID     || '';
const CLIENT_SECRET  = process.env.DISCORD_CLIENT_SECRET || '';
const HOME_GUILD     = process.env.HOME_GUILD_ID    || '1438103556610723922';
const WEB_URL        = process.env.WEB_URL          || 'https://conbot5.pages.dev';

// The registered Discord OAuth redirect on the Pages domain
// Cloudflare _worker.js proxies /api/auth/discord/callback → this server's /auth/web/callback
const OAUTH_REDIRECT = `${WEB_URL}/api/auth/discord/callback`;

const ADMIN_ROLE_NAMES = new Set([
  'TheConclave','Admin','Administrator','High Curator','Archmaestro',
  'Wildheart','Skywarden','Oracle of Veils','ForgeSmith',
  'Iron Vanguard','Gatekeeper','Veilcaster','Hazeweaver',
  'Moderator','Mod',
]);

const app    = express();
const server = http.createServer(app);

// ── CORS — allow Pages domain and localhost ────────────────────────────
app.use(cors({
  origin: (origin, cb) => cb(null, true), // allow all for SSE/WS
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// ── ACTIVITY ROUTE ────────────────────────────────────────────────────
try { const a = require('./activity'); app.use('/activity', a); }
catch(e) { console.warn('[API] activity route not found:', e.message); }

// ── IN-MEMORY STATE ────────────────────────────────────────────────────
const roomStates  = new Map(); // guildId → state
const pendingCmds = new Map(); // guildId → [{command,payload,ts}]
const sseClients  = new Map(); // guildId → Set<res>

// ── AUTH MIDDLEWARE ────────────────────────────────────────────────────
function botAuth(req, res, next) {
  if (req.headers['x-bot-token'] !== BOT_TOKEN)
    return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ═══════════════════════════════════════════════════════════════════════
// WEBSOCKET SERVER — realtime customization + command bus
// Clients connect to ws://conbot5-api.onrender.com/ws?guild=GUILD_ID
// ═══════════════════════════════════════════════════════════════════════
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Map(); // guildId → Set<ws>

wss.on('connection', (ws, req) => {
  const url     = new URL(req.url, 'ws://localhost');
  const guildId = url.searchParams.get('guild');

  if (!guildId) { ws.close(1008, 'guild param required'); return; }

  if (!wsClients.has(guildId)) wsClients.set(guildId, new Set());
  wsClients.get(guildId).add(ws);

  // Push current state immediately
  const state = roomStates.get(guildId);
  if (state) ws.send(JSON.stringify({ type: 'state', data: state }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      // Forward commands from WebSocket client into the pending queue
      if (msg.type === 'command' && msg.command) {
        const { command, ...payload } = msg;
        if (!pendingCmds.has(guildId)) pendingCmds.set(guildId, []);
        pendingCmds.get(guildId).push({ command, payload, ts: Date.now() });
        // Also broadcast optimistic state change back
        broadcastWS(guildId, { type: 'command_ack', command, ts: Date.now() });
      }
    } catch {}
  });

  ws.on('close',   () => wsClients.get(guildId)?.delete(ws));
  ws.on('error',   () => wsClients.get(guildId)?.delete(ws));

  // Keepalive ping
  const ping = setInterval(() => {
    if (ws.readyState === 1) ws.ping();
  }, 25_000);
  ws.on('close', () => clearInterval(ping));
});

function broadcastWS(guildId, data) {
  const clients = wsClients.get(guildId);
  if (!clients?.size) return;
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === 1) { try { ws.send(msg); } catch {} }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DISCORD HTTP HELPERS
// ═══════════════════════════════════════════════════════════════════════
function discordGet(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'discord.com',
      path:     `/api/v10${path}`,
      headers:  { Authorization: `Bearer ${token}`, 'User-Agent': 'CONbot5/8.0' },
    };
    https.get(opts, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error('Discord returned non-JSON')); }
      });
    }).on('error', reject);
  });
}

function discordPost(path, params) {
  return new Promise((resolve, reject) => {
    // Build URL-encoded body
    const body    = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const payload = Buffer.from(body, 'utf-8');

    const opts = {
      hostname: 'discord.com',
      path:     `/api/v10${path}`,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': payload.byteLength, // byte length, not char length
        'User-Agent':     'CONbot5/8.0',
      },
    };

    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Discord token exchange returned non-JSON: ${data.slice(0,200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function fetchMemberWithBot(guildId, userId) {
  const tok = process.env.DISCORD_BOT_TOKEN;
  if (!tok) return null;
  return new Promise(resolve => {
    const opts = {
      hostname: 'discord.com',
      path:     `/api/v10/guilds/${guildId}/members/${userId}`,
      headers:  { Authorization: `Bot ${tok}`, 'User-Agent': 'CONbot5/8.0' },
    };
    https.get(opts, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', async () => {
        try {
          const member = JSON.parse(body);
          const roles  = await fetchGuildRoles(guildId);
          member.roleNames = (member.roles || [])
            .map(id => roles.find(r => r.id === id)?.name)
            .filter(Boolean);
          resolve(member);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function fetchGuildRoles(guildId) {
  const tok = process.env.DISCORD_BOT_TOKEN;
  if (!tok) return [];
  return new Promise(resolve => {
    const opts = {
      hostname: 'discord.com',
      path:     `/api/v10/guilds/${guildId}/roles`,
      headers:  { Authorization: `Bot ${tok}`, 'User-Agent': 'CONbot5/8.0' },
    };
    https.get(opts, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve([]); } });
    }).on('error', () => resolve([]));
  });
}

function checkAdminRoles(roleNames = []) {
  return roleNames.some(n => ADMIN_ROLE_NAMES.has(n));
}

// ═══════════════════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════════════════
app.get('/health', (_, res) => res.json({
  status: 'ok', service: 'conbot5-api', version: '8.0.0',
  guilds:      roomStates.size,
  sseClients:  [...sseClients.values()].reduce((s, c) => s + c.size, 0),
  wsClients:   [...wsClients.values()].reduce((s, c) => s + c.size, 0),
  pendingCmds: [...pendingCmds.values()].reduce((s, c) => s + c.length, 0),
  ts: new Date().toISOString(),
}));

// ═══════════════════════════════════════════════════════════════════════
// DISCORD OAUTH
// Called by Cloudflare _worker.js proxy:
//   Pages /api/auth/discord/callback → this /auth/web/callback
// ═══════════════════════════════════════════════════════════════════════
app.get('/auth/web/callback', async (req, res) => {
  const { code, state: oauthState } = req.query;

  if (!code) {
    console.warn('[Auth] no code in callback');
    return res.redirect(`${WEB_URL}/?auth_error=no_code`);
  }
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('[Auth] DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET not set on Render');
    return res.redirect(`${WEB_URL}/?auth_error=misconfigured`);
  }

  try {
    // 1. Exchange code → access token
    // redirect_uri MUST exactly match what Discord saw in the /authorize URL
    const token = await discordPost('/oauth2/token', {
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  OAUTH_REDIRECT,
    });

    if (token.error) {
      console.error('[Auth] Discord token error:', token.error, token.error_description);
      return res.redirect(`${WEB_URL}/?auth_error=${encodeURIComponent(token.error)}`);
    }
    if (!token.access_token) {
      console.error('[Auth] no access_token:', JSON.stringify(token));
      return res.redirect(`${WEB_URL}/?auth_error=token_failed`);
    }

    // 2. Fetch user identity
    const user = await discordGet('/users/@me', token.access_token);

    // 3. Fetch guilds
    const allGuilds = await discordGet('/users/@me/guilds', token.access_token);

    // 4. Enrich each candidate guild with admin role info
    const enriched = await Promise.all(
      allGuilds
        .filter(g => g.id === HOME_GUILD || String(BigInt(g.permissions || '0') & BigInt(8)) !== '0')
        .slice(0, 20)
        .map(async g => {
          let isAdmin = false;
          let roleNames = [];
          try {
            // Check via Administrator permission bit first (fast)
            if (String(BigInt(g.permissions || '0') & BigInt(8)) !== '0') isAdmin = true;
            // If bot token available, get actual role names
            if (process.env.DISCORD_BOT_TOKEN) {
              const member = await fetchMemberWithBot(g.id, user.id);
              roleNames = member?.roleNames || [];
              if (!isAdmin) isAdmin = checkAdminRoles(roleNames);
            }
          } catch {}
          return { id: g.id, name: g.name, icon: g.icon, isAdmin, roles: roleNames };
        })
    );

    const safe = {
      id: user.id, username: user.username,
      global_name: user.global_name || user.username,
      avatar: user.avatar,
    };

    const userB64   = Buffer.from(JSON.stringify(safe)).toString('base64url');
    const guildsB64 = Buffer.from(JSON.stringify(enriched)).toString('base64url');

    // Auto-select home guild if it's the only one or user is in it
    const homeGuild = enriched.find(g => g.id === HOME_GUILD);
    if (homeGuild && enriched.length === 1) {
      return res.redirect(
        `${WEB_URL}/?guild=${homeGuild.id}&user=${userB64}&admin=${homeGuild.isAdmin}`
      );
    }

    res.redirect(`${WEB_URL}/?guilds=${guildsB64}&user=${userB64}`);

  } catch (err) {
    console.error('[Auth] callback error:', err.message);
    res.redirect(`${WEB_URL}/?auth_error=server_error`);
  }
});

// Role check endpoint
app.get('/auth/check-role', async (req, res) => {
  const { guild_id, user_id } = req.query;
  if (!guild_id || !user_id) return res.json({ admin: false });
  try {
    const member = await fetchMemberWithBot(guild_id, user_id);
    const admin  = checkAdminRoles(member?.roleNames || []);
    res.json({ admin, roles: member?.roleNames || [] });
  } catch {
    res.json({ admin: false, roles: [] });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// BOT STATE
// ═══════════════════════════════════════════════════════════════════════
app.post('/state/:guildId', botAuth, (req, res) => {
  const { guildId } = req.params;
  roomStates.set(guildId, { ...req.body, updatedAt: new Date().toISOString() });
  broadcastSSE(guildId, 'state', roomStates.get(guildId));
  broadcastWS(guildId, { type: 'state', data: roomStates.get(guildId) });
  res.json({ ok: true });
});

app.get('/state/:guildId', (req, res) => {
  const s = roomStates.get(req.params.guildId);
  if (!s) return res.json({ empty: true, guildId: req.params.guildId });
  res.json(s);
});

app.get('/admin/digest', botAuth, (_, res) => {
  const data = [...roomStates.entries()].map(([guildId, s]) => ({
    guildId, playing: !!s.current, track: s.current?.title?.slice(0, 60) || null,
    mood: s.mood, volume: s.volume, queue: s.queue?.length || 0,
    elapsed: s.elapsed || 0, paused: s.paused || false, updatedAt: s.updatedAt,
  }));
  res.json({ guilds: data.length, data });
});

app.get('/rooms', (_, res) => {
  res.json({ rooms: [...roomStates.entries()].map(([guildId, s]) => ({
    guildId, mood: s.mood, volume: s.volume, paused: s.paused,
    current: s.current?.title || null, queueLength: s.queue?.length || 0,
  }))});
});

// ═══════════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════════
function normalizeYtUrl(url) {
  if (!url) return null;
  const s = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (s) return `https://www.youtube.com/watch?v=${s[1]}`;
  const w = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (w) return `https://www.youtube.com/watch?v=${w[1]}`;
  return url;
}

const playdl = require('play-dl');
app.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ results: [] });
  try {
    const results = await playdl.search(q, { source: { youtube: 'video' }, limit: 8 });
    res.json({
      results: results.map(r => ({
        title:         r.title,
        url:           normalizeYtUrl(r.url) || r.url,
        durationInSec: r.durationInSec,
        thumbnail:     r.thumbnails?.[0]?.url || null,
        channel:       r.channel?.name || 'YouTube',
      }))
    });
  } catch (e) {
    console.error('[API] search:', e.message);
    res.json({ results: [], error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// COMMANDS — Web/WS sends, Bot polls
// ═══════════════════════════════════════════════════════════════════════
app.post('/commands/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { command, ...payload } = req.body;
  if (!command) return res.status(400).json({ error: 'command required' });
  if (!pendingCmds.has(guildId)) pendingCmds.set(guildId, []);
  pendingCmds.get(guildId).push({ command, payload, ts: Date.now() });
  res.json({ ok: true, queued: pendingCmds.get(guildId).length });
});

app.get('/commands/:guildId', botAuth, (req, res) => {
  const { guildId } = req.params;
  const cmds = (pendingCmds.get(guildId) || []).filter(c => Date.now() - c.ts < 30_000);
  pendingCmds.set(guildId, []);
  res.json({ commands: cmds });
});

// ═══════════════════════════════════════════════════════════════════════
// SSE
// ═══════════════════════════════════════════════════════════════════════
app.get('/events/:guildId', (req, res) => {
  const { guildId } = req.params;
  res.setHeader('Content-Type',                'text/event-stream');
  res.setHeader('Cache-Control',               'no-cache');
  res.setHeader('Connection',                  'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  if (!sseClients.has(guildId)) sseClients.set(guildId, new Set());
  sseClients.get(guildId).add(res);

  const s = roomStates.get(guildId);
  if (s) res.write(`data:${JSON.stringify({ type: 'state', data: s })}\n\n`);

  const hb = setInterval(() => res.write(':ping\n\n'), 25_000);
  req.on('close', () => { clearInterval(hb); sseClients.get(guildId)?.delete(res); });
});

function broadcastSSE(guildId, type, data) {
  const clients = sseClients.get(guildId);
  if (!clients?.size) return;
  const msg = `data:${JSON.stringify({ type, data })}\n\n`;
  for (const res of clients) { try { res.write(msg); } catch {} }
}

// ═══════════════════════════════════════════════════════════════════════
// PROGRESS TICK
// ═══════════════════════════════════════════════════════════════════════
setInterval(() => {
  for (const [guildId, state] of roomStates) {
    if (state.current && !state.paused) {
      state.elapsed = (state.elapsed || 0) + 1;
      const tick = { elapsed: state.elapsed, guildId };
      broadcastSSE(guildId, 'tick', tick);
      broadcastWS(guildId, { type: 'tick', data: tick });
    }
  }
}, 1000);

// ═══════════════════════════════════════════════════════════════════════
// STALE CLEANUP
// ═══════════════════════════════════════════════════════════════════════
setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [guildId, s] of roomStates) {
    if (new Date(s.updatedAt).getTime() < cutoff && !s.current) {
      roomStates.delete(guildId);
      pendingCmds.delete(guildId);
    }
  }
}, 30 * 60 * 1000);

server.listen(PORT, () => console.log(`🌐 CONbot5 API v8 on :${PORT}`));
module.exports = { app, server, wss };
