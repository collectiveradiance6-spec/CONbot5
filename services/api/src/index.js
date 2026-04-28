// services/api/src/index.js — CONbot5 Sovereign API v9
// Fixes: WS drops, OAuth redirect, selfDeaf, Activity URL
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const app = Fastify({ logger: false });
await app.register(cors, { origin: true, credentials: true });

const PORT        = process.env.PORT        || 3010;
const CLIENT_ID   = process.env.DISCORD_CLIENT_ID   || '1496510504196116480';
const CLIENT_SEC  = process.env.DISCORD_CLIENT_SECRET || '';
const BOT_TOKEN   = process.env.DISCORD_BOT_TOKEN   || '';
const WEB_URL     = process.env.WEB_URL     || 'https://conbot5.pages.dev';
const HOME_GUILD  = process.env.HOME_GUILD_ID || '1438103556610723922';

// REDIRECT must exactly match what's registered in Discord Developer Portal
const REDIRECT_URI = `${WEB_URL}/api/auth/discord/callback`;

const ADMIN_ROLES = new Set([
  'TheConclave','High Curator','Archmaestro','Wildheart',
  'Moderator','Admin','Administrator','Council','Staff','Bot Manager'
]);

/* ══════════════════════════════════════════════
   IN-MEMORY STATE
══════════════════════════════════════════════ */
const guilds    = new Map(); // guildId → { track, queue, users, progress, ts }
const wsClients = new Map(); // guildId → Set<ws>
const sseClients= new Map(); // guildId → Set<res>

function guildState(id) {
  if (!guilds.has(id)) guilds.set(id, {
    track: null, queue: [], users: [], progress: 0,
    playing: false, volume: 100, ts: Date.now()
  });
  return guilds.get(id);
}

function broadcast(guildId, payload) {
  const msg = JSON.stringify(payload);
  // WS
  (wsClients.get(guildId) || new Set()).forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
  // SSE
  (sseClients.get(guildId) || new Set()).forEach(res => {
    try { res.raw.write(`data: ${msg}\n\n`); } catch {}
  });
}

/* ══════════════════════════════════════════════
   HTTP SERVER + WS UPGRADE
══════════════════════════════════════════════ */
const server = http.createServer(app.server ? app.server._events.request : app.routing);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  if (u.pathname === '/ws') {
    wss.handleUpgrade(req, socket, head, ws => {
      const guildId =
  u.searchParams.get('guild') ||
  u.searchParams.get('guild_id') ||
  HOME_GUILD;
      if (!wsClients.has(guildId)) wsClients.set(guildId, new Set());
      wsClients.get(guildId).add(ws);

      // Send current state immediately on connect
      const g = guildState(guildId);
      ws.send(JSON.stringify({ type: 'stateSync', ...g }));

      ws.on('message', raw => {
        try {
          const msg = JSON.parse(raw);
          handleCommand(guildId, msg);
        } catch {}
      });

      ws.on('close', () => wsClients.get(guildId)?.delete(ws));
      ws.on('error', () => wsClients.get(guildId)?.delete(ws));

      // Ping-pong to detect dead connections (fixes dropping)
      const ping = setInterval(() => {
        if (ws.readyState === 1) ws.ping();
        else { clearInterval(ping); wsClients.get(guildId)?.delete(ws); }
      }, 25000);
      ws.on('pong', () => {}); // connection alive
    });
  } else {
    socket.destroy();
  }
});

/* ══════════════════════════════════════════════
   BOT COMMAND BUS (HTTP → Bot)
══════════════════════════════════════════════ */
const pendingCmds = new Map(); // guildId → [cmd,...]

function handleCommand(guildId, cmd) {
  if (!pendingCmds.has(guildId)) pendingCmds.set(guildId, []);
  pendingCmds.get(guildId).push({ ...cmd, ts: Date.now() });
  // Apply optimistic UI state
  const g = guildState(guildId);
  if (cmd.type === 'volume') g.volume = cmd.value;
  if (cmd.type === 'shuffle') g.shuffle = cmd.value;
  if (cmd.type === 'loop') g.loop = cmd.value;
}

/* ══════════════════════════════════════════════
   BOT POLL ENDPOINT (bot calls this every 500ms)
══════════════════════════════════════════════ */
app.get('/bot/poll/:guildId', async (req, reply) => {
  const { guildId } = req.params;
  const cmds = pendingCmds.get(guildId) || [];
  pendingCmds.set(guildId, []); // flush
  return { commands: cmds.filter(c => Date.now() - c.ts < 30000) };
});

/* ══════════════════════════════════════════════
   BOT STATE PUSH (bot POSTs state updates here)
══════════════════════════════════════════════ */
app.post('/bot/state/:guildId', async (req, reply) => {
  const { guildId } = req.params;
  const g = guildState(guildId);
  Object.assign(g, req.body, { ts: Date.now() });
  broadcast(guildId, { type: 'stateSync', ...g });
  return { ok: true };
});

app.post('/bot/event/:guildId', async (req, reply) => {
  const { guildId } = req.params;
  const evt = req.body;
  const g = guildState(guildId);

  if (evt.type === 'trackStart') {
    g.track = evt.track; g.progress = 0; g.playing = true; g.ts = Date.now();
  } else if (evt.type === 'trackEnd') {
    g.playing = false; g.progress = 0;
  } else if (evt.type === 'progress') {
    g.progress = evt.progress;
  } else if (evt.type === 'queue') {
    g.queue = evt.queue;
  } else if (evt.type === 'users') {
    g.users = evt.users;
  }

  broadcast(guildId, evt);
  return { ok: true };
});

/* ══════════════════════════════════════════════
   WEB → BOT COMMAND (frontend POSTs here)
══════════════════════════════════════════════ */
app.post('/commands/:guildId', async (req, reply) => {
  const { guildId } = req.params;
  handleCommand(guildId, req.body);
  broadcast(guildId, { type: 'cmdAck', cmd: req.body.type });
  return { ok: true };
});

/* ══════════════════════════════════════════════
   SSE (fallback for WS)
══════════════════════════════════════════════ */
app.get('/events/:guildId', async (req, reply) => {
  const { guildId } = req.params;
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('X-Accel-Buffering', 'no');
  reply.raw.write('retry: 3000\n\n');

  const g = guildState(guildId);
  reply.raw.write(`data: ${JSON.stringify({ type: 'stateSync', ...g })}\n\n`);

  if (!sseClients.has(guildId)) sseClients.set(guildId, new Set());
  sseClients.get(guildId).add(reply);

  req.raw.on('close', () => sseClients.get(guildId)?.delete(reply));
});

/* ══════════════════════════════════════════════
   DISCORD OAUTH2
══════════════════════════════════════════════ */
app.get('/auth/login', async (req, reply) => {
  const scope = encodeURIComponent('identify guilds guilds.members.read');
  const url = `https://discord.com/api/oauth2/authorize`
    + `?client_id=${CLIENT_ID}`
    + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
    + `&response_type=code`
    + `&scope=${scope}`;
  reply.redirect(url);
});

// Handles BOTH /auth/discord/callback AND /auth/web/callback
async function oauthCallback(req, reply) {
  const code = req.query.code;
  if (!code) return reply.redirect(`${WEB_URL}/?error=no_code`);

  try {
    // Exchange code for token
    const tokenRes = await discordFetch('POST', '/oauth2/token', null,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SEC,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      }).toString(),
      'application/x-www-form-urlencoded'
    );
    if (tokenRes.error) throw new Error(tokenRes.error_description || tokenRes.error);
    const { access_token } = tokenRes;

    // Get user
    const user = await discordFetch('GET', '/users/@me', access_token);
    // Get guilds
    const userGuilds = await discordFetch('GET', '/users/@me/guilds', access_token);
    const inHome = (userGuilds || []).some(g => g.id === HOME_GUILD);

    let isAdmin = false;
    if (inHome && BOT_TOKEN) {
      const member = await discordFetch('GET', `/guilds/${HOME_GUILD}/members/${user.id}`, null, null, null, BOT_TOKEN);
      const guildInfo = await discordFetch('GET', `/guilds/${HOME_GUILD}/roles`, null, null, null, BOT_TOKEN);
      const userRoleIds = new Set(member.roles || []);
      isAdmin = (guildInfo || []).some(r => userRoleIds.has(r.id) && ADMIN_ROLES.has(r.name));
    }

    const payload = Buffer.from(JSON.stringify({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      inGuild: inHome,
      isAdmin,
      ts: Date.now()
    })).toString('base64');

    reply.redirect(`${WEB_URL}/?auth=${payload}`);
  } catch (e) {
    console.error('[OAuth]', e.message);
    reply.redirect(`${WEB_URL}/?error=${encodeURIComponent(e.message)}`);
  }
}

app.get('/auth/discord/callback', oauthCallback);
app.get('/auth/web/callback', oauthCallback);
app.get('/api/auth/discord/callback', oauthCallback); // worker passthrough alias

/* ══════════════════════════════════════════════
   HEALTH
══════════════════════════════════════════════ */
app.get('/health', async () => ({
  status: 'ok',
  uptime: process.uptime(),
  guilds: guilds.size,
  wsClients: [...wsClients.values()].reduce((a, s) => a + s.size, 0),
  sseClients: [...sseClients.values()].reduce((a, s) => a + s.size, 0),
  pendingCmds: [...pendingCmds.values()].reduce((a, c) => a + c.length, 0)
}));

/* ══════════════════════════════════════════════
   STALE CLEANUP (every 30min)
══════════════════════════════════════════════ */
setInterval(() => {
  const cutoff = Date.now() - 4 * 3600 * 1000;
  for (const [id, g] of guilds) {
    if (!g.playing && g.ts < cutoff) guilds.delete(id);
  }
}, 30 * 60 * 1000);

/* ══════════════════════════════════════════════
   DISCORD API HELPER
══════════════════════════════════════════════ */
function discordFetch(method, path, userToken, body, contentType, botToken) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': contentType || 'application/json' };
    if (userToken) headers['Authorization'] = `Bearer ${userToken}`;
    if (botToken)  headers['Authorization'] = `Bot ${botToken}`;
    const opts = {
      hostname: 'discord.com',
      path: `/api/v10${path}`,
      method, headers
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/* ══════════════════════════════════════════════
   START
══════════════════════════════════════════════ */
await app.ready();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`💓 Health: :${PORT}`);
  console.log(`🎵 CONbot5 API v9 — Guild: ${HOME_GUILD}`);
  console.log(`🔗 WS: ws://localhost:${PORT}/ws?guild=GUILD_ID`);
  console.log(`🔐 OAuth redirect: ${REDIRECT_URI}`);
});
