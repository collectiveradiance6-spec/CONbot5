/**
 * ═══════════════════════════════════════════════════════════════════
 *  CONbot5  —  Cloudflare Worker  (worker/index.js)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  WHAT THIS FILE DOES:
 *  ────────────────────
 *  This Worker sits between your web frontend (conbot5.pages.dev) and
 *  your Discord bot (running on Render). It handles THREE jobs:
 *
 *    1. OAUTH  — Exchanges Discord auth codes for a signed JWT.
 *                Your client secret NEVER touches the browser.
 *
 *    2. REST   — Proxies API calls (search, guild info, admin commands)
 *                from the browser to your bot server, adding auth checks.
 *
 *    3. WEBSOCKET — Upgrades browser connections to WebSocket and
 *                   forwards them to the bot server at BOT_WS_URL.
 *                   Auth is checked before the upgrade is allowed.
 *
 *  HOW TO DEPLOY:
 *  ─────────────
 *  1.  npm install -g wrangler
 *  2.  wrangler login
 *  3.  Copy wrangler.toml (see end of this file) → your worker/ folder
 *  4.  Set secrets (run each of these one time):
 *        wrangler secret put DISCORD_CLIENT_SECRET
 *        wrangler secret put DISCORD_BOT_TOKEN
 *        wrangler secret put JWT_SECRET           ← any 64-char random string
 *        wrangler secret put INTERNAL_SECRET      ← same value as bot .env
 *        wrangler secret put ADMIN_ROLE_IDS       ← comma-separated role IDs
 *  5.  wrangler deploy
 *
 *  WHERE TO FIND VALUES:
 *  ─────────────────────
 *  DISCORD_CLIENT_ID     → Discord Dev Portal → Your App → OAuth2 → General
 *  DISCORD_CLIENT_SECRET → Same page, "Client Secret" (click Reset if needed)
 *  DISCORD_BOT_TOKEN     → Discord Dev Portal → Your App → Bot → Token
 *  GUILD_ID              → 1438103556610723922  (already in wrangler.toml)
 *  ADMIN_ROLE_IDS        → Discord → Server Settings → Roles → right-click role → Copy ID
 *                          (enable Developer Mode in Discord settings first)
 *  JWT_SECRET            → Run in terminal:  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
 *  INTERNAL_SECRET       → Same as JWT_SECRET or a different random string
 *  BOT_WS_URL            → Your Render service URL, e.g. wss://conbot5.onrender.com/ws
 *  BOT_API_URL           → e.g. https://conbot5.onrender.com
 *
 *  AFTER DEPLOYMENT, update CONFIG in index.html + admin.html:
 *    API_BASE:  'https://conbot5-api.YOUR_SUBDOMAIN.workers.dev'
 *    WS_URL:    'wss://conbot5-api.YOUR_SUBDOMAIN.workers.dev/ws'
 *
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

// ── CORS headers — only allow your Pages domain ─────────────────
function corsHeaders(origin) {
  const allowed = ['https://conbot5.pages.dev'];
  const ok = allowed.includes(origin) || (origin ?? '').endsWith('.conbot5.pages.dev');
  return {
    'Access-Control-Allow-Origin':      ok ? origin : 'https://conbot5.pages.dev',
    'Access-Control-Allow-Methods':     'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':     'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age':           '86400',
  };
}

function json(body, status = 200, extraHeaders = {}, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
      ...extraHeaders,
    },
  });
}

function apiError(message, status = 400, origin = '') {
  return json({ error: message }, status, {}, origin);
}


// ═══════════════════════════════════════════════════════════════
//  JWT  (HMAC-SHA256, no external library needed in Workers)
// ═══════════════════════════════════════════════════════════════

/** Sign a payload → return a JWT string */
async function signJwt(payload, secret) {
  const enc    = new TextEncoder();
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = b64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,  // 7 days
  }));
  const msg    = `${header}.${body}`;
  const key    = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return `${msg}.${b64url(sig)}`;
}

/** Verify a JWT → return payload object, or null if invalid/expired */
async function verifyJwt(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    );

    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
    const valid    = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(`${header}.${body}`));
    if (!valid) return null;

    const payload = JSON.parse(atob(body.replace(/-/g,'+').replace(/_/g,'/')));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;  // expired

    return payload;
  } catch {
    return null;
  }
}

/** Base64url encode (works for strings and ArrayBuffers) */
function b64url(data) {
  const str = typeof data === 'string'
    ? data
    : String.fromCharCode(...new Uint8Array(data));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}


// ═══════════════════════════════════════════════════════════════
//  AUTH HELPERS
// ═══════════════════════════════════════════════════════════════

/** Extract + verify the Bearer token from Authorization header */
async function getAuth(request, env) {
  const auth = request.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  return verifyJwt(auth.slice(7), env.JWT_SECRET);
}

/** Same as getAuth but also checks admin role membership */
async function getAdminAuth(request, env) {
  const payload = await getAuth(request, env);
  if (!payload) return null;

  const adminRoles = (env.ADMIN_ROLE_IDS ?? '').split(',').map(r => r.trim()).filter(Boolean);
  const userRoles  = payload.roles ?? [];

  if (!adminRoles.some(r => userRoles.includes(r))) return null;
  return payload;
}


// ═══════════════════════════════════════════════════════════════
//  BOT SERVER PROXY HELPERS
// ═══════════════════════════════════════════════════════════════

/** Call your Render bot server's REST API */
async function botApi(path, env, opts = {}) {
  const url = `${env.BOT_API_URL}${path}`;
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type':       'application/json',
      'x-internal-secret':  env.INTERNAL_SECRET,  // ← matches server.js middleware
      ...(opts.headers ?? {}),
    },
  });
}


// ═══════════════════════════════════════════════════════════════
//  DISCORD API HELPERS
// ═══════════════════════════════════════════════════════════════

async function discordApi(path, accessToken) {
  return fetch(`https://discord.com/api/v10${path}`, {
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

async function discordBotApi(path, env, opts = {}) {
  return fetch(`https://discord.com/api/v10${path}`, {
    ...opts,
    headers: {
      Authorization:  `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
  });
}


// ═══════════════════════════════════════════════════════════════
//  MAIN ROUTER
// ═══════════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;
    const origin = request.headers.get('Origin') ?? '';

    // ── CORS preflight ───────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // ─────────────────────────────────────────────────────────
    //  ROUTE: POST /auth/callback
    //
    //  Called by the frontend after Discord redirects back with ?code=
    //  We exchange the code for a Discord access token, fetch the user's
    //  guild membership, and issue our own short-lived JWT.
    //  The Discord access token is NEVER sent to the browser.
    // ─────────────────────────────────────────────────────────
    if (path === '/auth/callback' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return apiError('Invalid JSON', 400, origin); }

      const { code, redirect_uri } = body;
      if (!code)         return apiError('Missing code',         400, origin);
      if (!redirect_uri) return apiError('Missing redirect_uri', 400, origin);

      // ── Step 1: Exchange code for Discord access token ─────
      const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type:    'authorization_code',
          code,
          redirect_uri,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error('Discord token exchange failed:', err);
        return apiError('Discord token exchange failed', 401, origin);
      }

      const { access_token, token_type } = await tokenRes.json();

      // ── Step 2: Fetch Discord user ─────────────────────────
      const userRes = await discordApi('/users/@me', access_token);
      if (!userRes.ok) return apiError('Failed to fetch Discord user', 401, origin);
      const user = await userRes.json();

      // ── Step 3: Verify guild membership + get roles ────────
      const memberRes = await discordApi(
        `/users/@me/guilds/${env.GUILD_ID}/member`,
        access_token
      );

      if (!memberRes.ok) {
        // User is not in the guild
        return json({
          error: 'not_in_guild',
          message: 'You must be a member of TheConclave Dominion to use this dashboard.',
        }, 403, {}, origin);
      }

      const member = await memberRes.json();

      // ── Step 4: Issue our signed JWT ───────────────────────
      //    We embed what we need in the token so we don't have to
      //    look it up on every request.
      const jwt = await signJwt({
        userId:   user.id,
        username: user.username,
        avatar:   user.avatar,
        nick:     member.nick ?? null,
        roles:    member.roles,         // array of role ID strings
        guildId:  env.GUILD_ID,
      }, env.JWT_SECRET);

      // Return the JWT + safe user data to the frontend
      return json({ access_token: jwt, user, member }, 200, {}, origin);
    }


    // ─────────────────────────────────────────────────────────
    //  ROUTE: GET /auth/verify
    //
    //  Frontend calls this on page load to check if its stored
    //  JWT is still valid (not expired, not tampered).
    // ─────────────────────────────────────────────────────────
    if (path === '/auth/verify' && method === 'GET') {
      const payload = await getAuth(request, env);
      if (!payload) return apiError('Invalid or expired token', 401, origin);

      return json({
        valid:    true,
        userId:   payload.userId,
        username: payload.username,
        guildId:  payload.guildId,
        roles:    payload.roles,
      }, 200, {}, origin);
    }


    // ─────────────────────────────────────────────────────────
    //  ROUTE: GET /search?q=...&guild=...
    //
    //  Proxies search queries to the bot server.
    //  Any authenticated member can search.
    // ─────────────────────────────────────────────────────────
    if (path === '/search' && method === 'GET') {
      const payload = await getAuth(request, env);
      if (!payload) return apiError('Unauthorized', 401, origin);

      const q     = url.searchParams.get('q');
      const guild = url.searchParams.get('guild') ?? env.GUILD_ID;
      if (!q) return apiError('Missing search query', 400, origin);

      try {
        const res = await botApi(`/api/search?q=${encodeURIComponent(q)}&guild=${guild}`, env);
        if (!res.ok) return apiError('Search failed', 502, origin);
        return json(await res.json(), 200, {}, origin);
      } catch (e) {
        console.error('Search proxy error:', e);
        return apiError('Bot server unreachable', 503, origin);
      }
    }


    // ─────────────────────────────────────────────────────────
    //  ROUTE: GET /guild/members  (admin only)
    //
    //  Returns the guild member list directly from Discord.
    // ─────────────────────────────────────────────────────────
    if (path === '/guild/members' && method === 'GET') {
      const payload = await getAdminAuth(request, env);
      if (!payload) return apiError('Admin role required', 403, origin);

      try {
        const res = await discordBotApi(
          `/guilds/${env.GUILD_ID}/members?limit=100`,
          env
        );
        if (!res.ok) return apiError('Discord API error', 502, origin);
        const members = await res.json();

        // Scrub sensitive fields
        const safe = members.map(m => ({
          id:       m.user.id,
          username: m.user.username,
          nick:     m.nick ?? null,
          avatar:   m.user.avatar,
          roles:    m.roles,
          joined:   m.joined_at,
        }));

        return json({ members: safe }, 200, {}, origin);
      } catch (e) {
        return apiError('Members fetch failed', 502, origin);
      }
    }


    // ─────────────────────────────────────────────────────────
    //  ROUTE: GET /guild/roles  (admin only)
    // ─────────────────────────────────────────────────────────
    if (path === '/guild/roles' && method === 'GET') {
      const payload = await getAdminAuth(request, env);
      if (!payload) return apiError('Admin role required', 403, origin);

      try {
        const res = await discordBotApi(`/guilds/${env.GUILD_ID}/roles`, env);
        if (!res.ok) return apiError('Discord API error', 502, origin);
        return json(await res.json(), 200, {}, origin);
      } catch {
        return apiError('Roles fetch failed', 502, origin);
      }
    }


    // ─────────────────────────────────────────────────────────
    //  ROUTE: POST /admin/command  (admin only)
    //
    //  Sends a command to the bot server's admin REST endpoint.
    //  The Worker checks admin role before forwarding.
    // ─────────────────────────────────────────────────────────
    if (path === '/admin/command' && method === 'POST') {
      const payload = await getAdminAuth(request, env);
      if (!payload) return apiError('Admin role required', 403, origin);

      let body;
      try { body = await request.json(); } catch { return apiError('Invalid JSON', 400, origin); }

      try {
        const res = await botApi('/api/admin/command', env, {
          method: 'POST',
          body: JSON.stringify({ ...body, adminUserId: payload.userId }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          return apiError(`Bot returned ${res.status}: ${errBody}`, 502, origin);
        }
        return json(await res.json(), 200, {}, origin);
      } catch (e) {
        return apiError('Bot server unreachable', 503, origin);
      }
    }


    // ─────────────────────────────────────────────────────────
    //  ROUTE: GET /health
    //
    //  Public health check — no auth required.
    // ─────────────────────────────────────────────────────────
    if (path === '/health') {
      try {
        const botRes = await botApi('/api/health', env);
        const botData = botRes.ok ? await botRes.json() : null;
        return json({
          worker:    'ok',
          bot:       botData,
          timestamp: Date.now(),
        }, 200, {}, origin);
      } catch {
        return json({ worker: 'ok', bot: null, error: 'Bot unreachable' }, 200, {}, origin);
      }
    }


    // ─────────────────────────────────────────────────────────
    //  ROUTE: GET /ws  (WebSocket upgrade)
    //
    //  This is the main real-time channel.
    //
    //  Flow:
    //    1. Check for WebSocket upgrade header
    //    2. Verify JWT from query param (browsers can't set headers on WS)
    //    3. If admin=true, also verify admin role
    //    4. Create a WebSocketPair (client ↔ server ends)
    //    5. Connect to the bot server's WS
    //    6. Pipe messages both ways
    // ─────────────────────────────────────────────────────────
    if (path === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader?.toLowerCase() !== 'websocket') {
        return new Response('This endpoint requires a WebSocket upgrade', {
          status: 426,
          headers: { 'Upgrade': 'websocket', ...corsHeaders(origin) },
        });
      }

      // Get token from query param (browsers send WS without custom headers)
      const token   = url.searchParams.get('token');
      const guild   = url.searchParams.get('guild') ?? env.GUILD_ID;
      const isAdmin = url.searchParams.get('admin') === 'true';

      if (!token) {
        return new Response('Missing token query parameter', { status: 401 });
      }

      // Verify JWT
      const payload = await verifyJwt(token, env.JWT_SECRET);
      if (!payload) {
        return new Response('Invalid or expired token', { status: 401 });
      }

      // Admin check
      if (isAdmin) {
        const adminRoles = (env.ADMIN_ROLE_IDS ?? '').split(',').map(r => r.trim()).filter(Boolean);
        if (!adminRoles.some(r => payload.roles?.includes(r))) {
          return new Response('Admin role required', { status: 403 });
        }
      }

      // Create the WebSocket pair the Worker API gives us
      // `client` is returned to the browser, `server` we control
      const { 0: client, 1: server } = new WebSocketPair();
      server.accept();

      // Connect to bot server WebSocket
      const botWsUrl = new URL(env.BOT_WS_URL);
      botWsUrl.searchParams.set('userId',  payload.userId);
      botWsUrl.searchParams.set('guild',   guild);
      botWsUrl.searchParams.set('admin',   String(isAdmin));

      let botWs;
      try {
        botWs = new WebSocket(botWsUrl.toString());
      } catch (e) {
        server.send(JSON.stringify({ op: 'ERROR', d: { message: 'Bot server connection failed' } }));
        server.close(1011, 'Bot WS connect error');
        return new Response(null, { status: 101, webSocket: client });
      }

      // ── Browser → Bot ──────────────────────────────────────
      server.addEventListener('message', (event) => {
        if (botWs.readyState === WebSocket.OPEN) {
          botWs.send(event.data);
        }
      });

      // ── Bot → Browser ──────────────────────────────────────
      botWs.addEventListener('message', (event) => {
        if (server.readyState === WebSocket.OPEN) {
          server.send(event.data);
        }
      });

      // ── Cleanup on browser disconnect ──────────────────────
      server.addEventListener('close', (event) => {
        if (botWs.readyState === WebSocket.OPEN || botWs.readyState === WebSocket.CONNECTING) {
          botWs.close(1000, 'Client disconnected');
        }
      });

      // ── Cleanup on bot disconnect ──────────────────────────
      botWs.addEventListener('close', (event) => {
        if (server.readyState === WebSocket.OPEN) {
          server.send(JSON.stringify({
            op: 'BOT_DISCONNECTED',
            d: { code: event.code, reason: 'Bot server closed connection' },
          }));
          server.close(1011, 'Bot server disconnected');
        }
      });

      // ── Bot connection error ───────────────────────────────
      botWs.addEventListener('error', (event) => {
        if (server.readyState === WebSocket.OPEN) {
          server.send(JSON.stringify({
            op: 'ERROR',
            d: { message: 'Lost connection to bot server. Reconnecting...' },
          }));
        }
      });

      // Return the client side of the WebSocket pair to the browser
      return new Response(null, { status: 101, webSocket: client });
    }

    // ── 404 for anything else ────────────────────────────────
    return json({ error: 'Not found', path }, 404, {}, origin);
  },
};


/*
 * ═══════════════════════════════════════════════════════════════
 *  wrangler.toml
 *  ─────────────────────────────────────────────────────────────
 *  Save this as  worker/wrangler.toml  (same folder as index.js)
 *
 *  DO NOT put secrets in wrangler.toml — use `wrangler secret put`
 * ═══════════════════════════════════════════════════════════════

name = "conbot5-api"
main = "index.js"
compatibility_date = "2024-09-23"

# Workers with WebSocket outbound connections need the
# "nodejs_compat" flag for the WebSocket class
compatibility_flags = ["nodejs_compat"]

[vars]
# Public-safe values only — no secrets here
DISCORD_CLIENT_ID = "YOUR_DISCORD_CLIENT_ID"
GUILD_ID          = "1438103556610723922"
BOT_API_URL       = "https://conbot5.onrender.com"
BOT_WS_URL        = "wss://conbot5.onrender.com/ws"

# Secrets (set with: wrangler secret put SECRET_NAME)
# DISCORD_CLIENT_SECRET  ← from Discord Dev Portal
# DISCORD_BOT_TOKEN      ← from Discord Dev Portal → Bot tab
# JWT_SECRET             ← random 64-char string (node -e "require('crypto').randomBytes(64).toString('hex')" | pbcopy)
# INTERNAL_SECRET        ← same value you set in Render env as INTERNAL_SECRET
# ADMIN_ROLE_IDS         ← e.g. "123456789,987654321" (right-click role in Discord → Copy ID)

[[routes]]
pattern = "conbot5-api.YOUR_SUBDOMAIN.workers.dev/*"
zone_name = ""

 * ═══════════════════════════════════════════════════════════════
 *  package.json for the worker (worker/package.json)
 * ═══════════════════════════════════════════════════════════════

{
  "name": "conbot5-worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":    "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}

 * ═══════════════════════════════════════════════════════════════
 *  Render environment variables for your bot service
 *  (Render Dashboard → your service → Environment)
 * ═══════════════════════════════════════════════════════════════

  PORT              = 3001
  INTERNAL_SECRET   = (same as wrangler secret INTERNAL_SECRET)
  GUILD_ID          = 1438103556610723922
  NODE_ENV          = production

 * ═══════════════════════════════════════════════════════════════
 *  Discord Developer Portal checklist
 *  discord.com/developers/applications → your bot app
 * ═══════════════════════════════════════════════════════════════

  1. OAuth2 → General:
       - Add redirect URI: https://conbot5.pages.dev/callback
       - Scopes needed: identify, guilds.members.read

  2. OAuth2 → URL Generator (to build your login URL):
       - Scopes: identify, guilds.members.read
       - No bot permissions needed for OAuth

  3. Bot → Privileged Gateway Intents (enable all three):
       - Presence Intent        ✓
       - Server Members Intent  ✓
       - Message Content Intent ✓

  4. Make sure bot is in the guild with a role that can:
       - Read channels
       - Connect to voice
       - Speak in voice
       - Deafen Members (needed for UNDEAFEN command)

 */
