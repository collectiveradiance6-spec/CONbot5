/**
 * CONbot5 Cloudflare Worker
 * ─────────────────────────────────────────────────────────────
 * Handles:
 *   1. Discord OAuth2 token exchange (keeps client secret server-side)
 *   2. Token verification for protected routes
 *   3. WebSocket proxy bridging frontend ↔ Discord bot
 *   4. REST API routes for search, guild info, etc.
 *
 * Deploy:  wrangler deploy
 * Env vars (set in Cloudflare Dashboard or wrangler.toml):
 *   DISCORD_CLIENT_ID
 *   DISCORD_CLIENT_SECRET
 *   DISCORD_BOT_TOKEN
 *   GUILD_ID            = 1438103556610723922
 *   ADMIN_ROLE_IDS      = comma-separated role IDs
 *   BOT_WS_URL          = ws://your-bot-server:port/ws  (Render URL)
 *   BOT_API_URL         = https://your-bot-server.onrender.com
 *   JWT_SECRET          = any long random string
 * ─────────────────────────────────────────────────────────────
 */

const CORS = {
  'Access-Control-Allow-Origin': 'https://conbot5.pages.dev',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

function cors(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
  });
}

function err(msg, status = 400) {
  return cors({ error: msg }, status);
}

// ─── Simple JWT (HMAC-SHA256) ────────────────────────────────
async function signToken(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 7 * 86400000 }));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function verifyToken(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC', key, Uint8Array.from(atob(sig), c => c.charCodeAt(0)),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Discord API helpers ──────────────────────────────────────
async function discordFetch(path, token, opts = {}) {
  return fetch(`https://discord.com/api/v10${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

async function botFetch(path, env, opts = {}) {
  return fetch(`${env.BOT_API_URL}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

// ─── Auth middleware ──────────────────────────────────────────
async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7), env.JWT_SECRET);
}

async function requireAdmin(request, env) {
  const payload = await requireAuth(request, env);
  if (!payload) return null;
  const adminRoles = (env.ADMIN_ROLE_IDS || '').split(',').map(r => r.trim());
  const userRoles = payload.roles || [];
  if (!adminRoles.some(r => userRoles.includes(r))) return null;
  return payload;
}

// ─── Main fetch handler ───────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ── Auth routes ────────────────────────────────────────────

    // POST /auth/callback  — exchange Discord code for JWT
    if (path === '/auth/callback' && method === 'POST') {
      try {
        const { code, redirect_uri } = await request.json();

        // Exchange code for Discord access token
        const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: env.DISCORD_CLIENT_ID,
            client_secret: env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri,
          }),
        });

        if (!tokenRes.ok) return err('Discord token exchange failed', 401);
        const { access_token } = await tokenRes.json();

        // Fetch user info
        const userRes = await discordFetch('/users/@me', access_token);
        if (!userRes.ok) return err('Failed to fetch user', 401);
        const user = await userRes.json();

        // Fetch guild membership
        const memberRes = await discordFetch(
          `/users/@me/guilds/${env.GUILD_ID}/member`, access_token
        );

        let member = null;
        if (memberRes.ok) {
          member = await memberRes.json();
        } else {
          // Not in guild
          return cors({ error: 'Not a member of TheConclave Dominion' }, 403);
        }

        // Issue our own JWT (never expose Discord token to frontend)
        const jwt = await signToken({
          userId: user.id,
          username: user.username,
          avatar: user.avatar,
          nick: member.nick,
          roles: member.roles,
          guildId: env.GUILD_ID,
        }, env.JWT_SECRET);

        return cors({ access_token: jwt, user, member });
      } catch (e) {
        return err('Auth callback error: ' + e.message, 500);
      }
    }

    // GET /auth/verify  — check if JWT is still valid
    if (path === '/auth/verify') {
      const payload = await requireAuth(request, env);
      if (!payload) return err('Invalid or expired token', 401);
      return cors({ valid: true, userId: payload.userId });
    }

    // ── Protected routes ───────────────────────────────────────

    // GET /search?q=...&guild=...
    if (path === '/search') {
      const payload = await requireAuth(request, env);
      if (!payload) return err('Unauthorized', 401);

      const q = url.searchParams.get('q');
      if (!q) return err('Missing query');

      try {
        // Proxy to bot's search API
        const res = await botFetch(
          `/api/search?q=${encodeURIComponent(q)}&guild=${url.searchParams.get('guild') || env.GUILD_ID}`,
          env
        );
        if (!res.ok) return err('Search failed', 502);
        return cors(await res.json());
      } catch (e) {
        return err('Search error: ' + e.message, 502);
      }
    }

    // GET /guild/members  (admin only)
    if (path === '/guild/members') {
      const payload = await requireAdmin(request, env);
      if (!payload) return err('Admin access required', 403);

      try {
        const res = await fetch(
          `https://discord.com/api/v10/guilds/${env.GUILD_ID}/members?limit=100`,
          { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } }
        );
        if (!res.ok) return err('Failed to fetch members', 502);
        const members = await res.json();
        return cors({ members });
      } catch (e) {
        return err('Members error', 502);
      }
    }

    // GET /guild/roles  (admin only)
    if (path === '/guild/roles') {
      const payload = await requireAdmin(request, env);
      if (!payload) return err('Admin access required', 403);

      try {
        const res = await fetch(
          `https://discord.com/api/v10/guilds/${env.GUILD_ID}/roles`,
          { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } }
        );
        return cors(await res.json());
      } catch {
        return err('Roles error', 502);
      }
    }

    // POST /admin/command  (admin only)
    if (path === '/admin/command' && method === 'POST') {
      const payload = await requireAdmin(request, env);
      if (!payload) return err('Admin access required', 403);

      try {
        const body = await request.json();
        const res = await botFetch('/api/admin/command', env, {
          method: 'POST',
          body: JSON.stringify({ ...body, adminUserId: payload.userId }),
        });
        return cors(await res.json());
      } catch {
        return err('Command error', 502);
      }
    }

    // ── WebSocket proxy ────────────────────────────────────────
    // GET /ws  — upgrade to WebSocket, proxy to bot
    if (path === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }

      // Verify token from query param
      const token = url.searchParams.get('token');
      if (!token) return new Response('Missing token', { status: 401 });

      const payload = await verifyToken(token, env.JWT_SECRET);
      if (!payload) return new Response('Invalid token', { status: 401 });

      const isAdmin = url.searchParams.get('admin') === 'true';
      if (isAdmin) {
        const adminRoles = (env.ADMIN_ROLE_IDS || '').split(',').map(r => r.trim());
        if (!adminRoles.some(r => payload.roles?.includes(r))) {
          return new Response('Admin access required', { status: 403 });
        }
      }

      // Create WebSocket pair
      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      // Connect to bot's WS
      const botWsUrl = `${env.BOT_WS_URL}?userId=${payload.userId}&guild=${payload.guildId}&admin=${isAdmin}`;
      const botWs = new WebSocket(botWsUrl);

      // Forward client → bot
      server.addEventListener('message', e => {
        if (botWs.readyState === 1) botWs.send(e.data);
      });

      // Forward bot → client
      botWs.addEventListener('message', e => {
        if (server.readyState === 1) server.send(e.data);
      });

      // Handle closes
      server.addEventListener('close', () => botWs.close());
      botWs.addEventListener('close', () => {
        try { server.close(); } catch {}
      });
      botWs.addEventListener('error', () => {
        server.send(JSON.stringify({ op: 'ERROR', d: { message: 'Bot connection lost' } }));
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404, headers: CORS });
  },
};
