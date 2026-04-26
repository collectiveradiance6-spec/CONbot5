// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — API SERVICE v7.0
// REST + SSE + Discord OAuth web auth + Role-gated admin
// services/api/src/index.js
// ═══════════════════════════════════════════════════════════════════════
'use strict';
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const http     = require('http');
const https    = require('https');
const playdl   = require('play-dl');

const PORT          = parseInt(process.env.PORT || process.env.API_PORT || '3020');
const BOT_TOKEN     = process.env.API_BOT_TOKEN || 'conbot5-internal';
const CLIENT_ID     = process.env.DISCORD_CLIENT_ID  || '';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const HOME_GUILD    = process.env.HOME_GUILD_ID || '1438103556610723922';

// Admin role names — any of these in the target guild = admin access
const ADMIN_ROLE_NAMES = new Set([
  'TheConclave','Admin','Administrator','High Curator','Archmaestro',
  'Wildheart','Skywarden','Oracle of Veils','ForgeSmith',
  'Iron Vanguard','Gatekeeper','Veilcaster','Hazeweaver',
  'Moderator','Mod',
]);

const app    = express();
const server = http.createServer(app);

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ── ACTIVITY ROUTE ────────────────────────────────────────────────────
try { const activity = require('./activity'); app.use('/activity', activity); }
catch(e) { console.warn('[API] activity route:', e.message); }

// ── STATE STORE ────────────────────────────────────────────────────────
const roomStates  = new Map();
const pendingCmds = new Map();
const sseClients  = new Map();

// ── BOT AUTH MIDDLEWARE ────────────────────────────────────────────────
function botAuth(req, res, next) {
  const token = req.headers['x-bot-token'];
  if (token !== BOT_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── DISCORD HTTP HELPER ───────────────────────────────────────────────
function discordGet(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v10${path}`,
      headers: { Authorization: `Bearer ${token}` },
    };
    https.get(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error('Invalid JSON from Discord')); }
      });
    }).on('error', reject);
  });
}

function discordPost(path, body) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(new URLSearchParams(body).toString());
    const options = {
      hostname: 'discord.com',
      path: `/api/v10${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': payload.length,
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── HEALTH ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok', service: 'conbot5-api', version: '7.0.0',
  guilds: roomStates.size,
  sseClients: [...sseClients.values()].reduce((s, c) => s + c.size, 0),
  pendingCmds: [...pendingCmds.values()].reduce((s, c) => s + c.length, 0),
  ts: new Date().toISOString(),
}));

// ══════════════════════════════════════════════════════════════════════
// DISCORD OAUTH — WEB AUTH FLOW
// Flow: frontend → discord.com/oauth2/authorize → this callback
// Returns: user info + guilds + admin roles → redirect to frontend
// ══════════════════════════════════════════════════════════════════════

/**
 * GET /auth/web/callback?code=xxx&state=xxx&guild_id=xxx
 *
 * Discord redirects here after user authorizes.
 * We exchange code → access token → fetch user + guilds + member roles.
 * We then redirect to the frontend with encoded user/guild data.
 */
app.get('/auth/web/callback', async (req, res) => {
  const { code, guild_id } = req.query;

  if (!code) {
    return res.redirect('/?auth_error=no_code');
  }
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn('[Auth] DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET not set');
    return res.redirect('/?auth_error=misconfigured');
  }

  try {
    // 1. Exchange code for access token
    const REDIR = `${req.protocol}://${req.get('host')}/auth/web/callback`;
    const token = await discordPost('/oauth2/token', {
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIR,
    });

    if (!token.access_token) {
      console.error('[Auth] token exchange failed:', token);
      return res.redirect('/?auth_error=token_failed');
    }

    // 2. Fetch user identity
    const user = await discordGet('/users/@me', token.access_token);

    // 3. Fetch guilds the user is in
    const guilds = await discordGet('/users/@me/guilds', token.access_token);

    // 4. Determine admin status for each guild
    //    Discord OAuth doesn't give member roles — we use bot token to check
    //    For the home guild we check member roles via bot
    const enrichedGuilds = await Promise.all(
      guilds
        .filter(g => g.id === HOME_GUILD || (guild_id && g.id === guild_id))
        .slice(0, 15)
        .map(async g => {
          let isAdmin = false;
          let roles = [];
          try {
            // Use bot token if available to check member roles
            if (process.env.DISCORD_BOT_TOKEN && g.id) {
              const member = await fetchMemberWithBot(g.id, user.id);
              roles = member?.roles || [];
              isAdmin = checkAdminRoles(member?.roles || [], member?.roleNames || []);
            }
            // Fallback: check permissions bitfield (0x8 = Administrator)
            if (!isAdmin && g.permissions) {
              const perms = BigInt(g.permissions);
              isAdmin = (perms & BigInt(0x8)) !== BigInt(0);
            }
          } catch { /* ignore role fetch failures */ }
          return { id: g.id, name: g.name, icon: g.icon, isAdmin, roles };
        })
    );

    // 5. Build safe user object (no tokens in frontend)
    const safeUser = {
      id:            user.id,
      username:      user.username,
      discriminator: user.discriminator || '0',
      avatar:        user.avatar,
      global_name:   user.global_name || user.username,
    };

    // 6. Redirect to frontend with encoded data
    const frontendBase = process.env.WEB_URL || req.get('origin') || 'https://conbot5.pages.dev';
    const userB64   = Buffer.from(JSON.stringify(safeUser)).toString('base64url');
    const guildsB64 = Buffer.from(JSON.stringify(enrichedGuilds)).toString('base64url');

    // If only one guild and it has CONbot5 → auto-select
    const targetGuild = enrichedGuilds.find(g => g.id === HOME_GUILD)
      || enrichedGuilds[0];

    if (targetGuild && enrichedGuilds.length === 1) {
      return res.redirect(
        `${frontendBase}?guild=${targetGuild.id}&user=${userB64}&admin=${targetGuild.isAdmin}`
      );
    }

    return res.redirect(
      `${frontendBase}?guilds=${guildsB64}&user=${userB64}`
    );

  } catch (err) {
    console.error('[Auth] callback error:', err.message);
    res.redirect('/?auth_error=server_error');
  }
});

// Check member roles against admin role names
function checkAdminRoles(roleIds, roleNames) {
  if (!roleNames) return false;
  return roleNames.some(name => ADMIN_ROLE_NAMES.has(name));
}

// Fetch guild member using bot token (role names require fetching guild roles too)
async function fetchMemberWithBot(guildId, userId) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return null;
  return new Promise((resolve) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v10/guilds/${guildId}/members/${userId}`,
      headers: { Authorization: `Bot ${botToken}` },
    };
    https.get(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', async () => {
        try {
          const member = JSON.parse(body);
          // Also fetch guild roles to get names
          const guildRoles = await fetchGuildRoles(guildId);
          const roleNames = (member.roles || [])
            .map(id => guildRoles.find(r => r.id === id)?.name)
            .filter(Boolean);
          resolve({ ...member, roleNames });
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function fetchGuildRoles(guildId) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return [];
  return new Promise((resolve) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v10/guilds/${guildId}/roles`,
      headers: { Authorization: `Bot ${botToken}` },
    };
    https.get(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve([]); } });
    }).on('error', () => resolve([]));
  });
}

/**
 * GET /auth/check-role?guild_id=xxx&user_id=xxx
 * Checks if a user has admin role in the guild. Used by frontend.
 */
app.get('/auth/check-role', async (req, res) => {
  const { guild_id, user_id } = req.query;
  if (!guild_id || !user_id) return res.json({ admin: false });
  try {
    const member = await fetchMemberWithBot(guild_id, user_id);
    const admin  = checkAdminRoles(member?.roles || [], member?.roleNames || []);
    res.json({ admin, roles: member?.roleNames || [] });
  } catch {
    res.json({ admin: false, roles: [] });
  }
});

// ══════════════════════════════════════════════════════════════════════
// BOT STATE ENDPOINTS
// ══════════════════════════════════════════════════════════════════════

app.post('/state/:guildId', botAuth, (req, res) => {
  const { guildId } = req.params;
  roomStates.set(guildId, { ...req.body, updatedAt: new Date().toISOString() });
  broadcastSSE(guildId, 'state', roomStates.get(guildId));
  res.json({ ok: true });
});

app.get('/state/:guildId', (req, res) => {
  const state = roomStates.get(req.params.guildId);
  if (!state) return res.json({ empty: true, guildId: req.params.guildId });
  res.json(state);
});

// ── ADMIN DIGEST ───────────────────────────────────────────────────────
app.get('/admin/digest', botAuth, (_, res) => {
  const digest = [...roomStates.entries()].map(([guildId, s]) => ({
    guildId,
    playing:   !!s.current,
    track:     s.current?.title?.slice(0, 60) || null,
    mood:      s.mood,
    volume:    s.volume,
    queue:     s.queue?.length || 0,
    elapsed:   s.elapsed || 0,
    paused:    s.paused || false,
    updatedAt: s.updatedAt,
  }));
  res.json({ guilds: digest.length, data: digest });
});

// ── ROOMS ──────────────────────────────────────────────────────────────
app.get('/rooms', (_, res) => {
  const rooms = [...roomStates.entries()].map(([guildId, s]) => ({
    guildId, mood: s.mood, volume: s.volume, paused: s.paused,
    current: s.current?.title || null, queueLength: s.queue?.length || 0,
  }));
  res.json({ rooms });
});

// ── SEARCH ─────────────────────────────────────────────────────────────
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
  if (!q.trim()) return res.json({ results: [] });
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

// ── COMMANDS ───────────────────────────────────────────────────────────
// Public — anyone in the guild can send commands
app.post('/commands/:guildId', (req, res) => {
  const { guildId } = req.params;
  const { command, ...payload } = req.body;
  if (!command) return res.status(400).json({ error: 'command required' });
  if (!pendingCmds.has(guildId)) pendingCmds.set(guildId, []);
  pendingCmds.get(guildId).push({ command, payload, ts: Date.now() });
  res.json({ ok: true, queued: pendingCmds.get(guildId).length });
});

// Bot polls this to get pending web commands
app.get('/commands/:guildId', botAuth, (req, res) => {
  const { guildId } = req.params;
  const cmds = pendingCmds.get(guildId) || [];
  pendingCmds.set(guildId, []);
  res.json({ commands: cmds.filter(c => Date.now() - c.ts < 30_000) });
});

// ── SSE ────────────────────────────────────────────────────────────────
app.get('/events/:guildId', (req, res) => {
  const { guildId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  if (!sseClients.has(guildId)) sseClients.set(guildId, new Set());
  sseClients.get(guildId).add(res);

  const state = roomStates.get(guildId);
  if (state) res.write(`data:${JSON.stringify({ type: 'state', data: state })}\n\n`);

  const hb = setInterval(() => res.write(':ping\n\n'), 25_000);
  req.on('close', () => { clearInterval(hb); sseClients.get(guildId)?.delete(res); });
});

function broadcastSSE(guildId, type, data) {
  const clients = sseClients.get(guildId);
  if (!clients?.size) return;
  const msg = `data:${JSON.stringify({ type, data })}\n\n`;
  for (const res of clients) { try { res.write(msg); } catch {} }
}

// ── PROGRESS TICK ──────────────────────────────────────────────────────
setInterval(() => {
  for (const [guildId, state] of roomStates) {
    if (state.current && !state.paused) {
      state.elapsed = (state.elapsed || 0) + 1;
      broadcastSSE(guildId, 'tick', { elapsed: state.elapsed, guildId });
    }
  }
}, 1000);

// ── STALE CLEANUP ──────────────────────────────────────────────────────
setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [guildId, state] of roomStates) {
    if (new Date(state.updatedAt).getTime() < cutoff && !state.current) {
      roomStates.delete(guildId);
      pendingCmds.delete(guildId);
    }
  }
}, 30 * 60 * 1000);

server.listen(PORT, () => console.log(`🌐 CONbot5 API v7 on :${PORT}`));
module.exports = { app, server };
