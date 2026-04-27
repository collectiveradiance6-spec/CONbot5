// ═══════════════════════════════════════════════════════════════════════
// CONbot5 Cloudflare Pages Worker v4
// KEY FIX: /api/auth/discord/callback → /auth/web/callback on Render
// ═══════════════════════════════════════════════════════════════════════
const RENDER = 'https://conbot5-api.onrender.com';

// Explicit path remaps (source → destination on Render)
const PATH_REMAP = {
  '/api/auth/discord/callback': '/auth/web/callback',
  '/api/auth/web/callback':     '/auth/web/callback',
  '/api/auth/callback':         '/auth/web/callback',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-bot-token',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Proxy /api/* → Render
    if (url.pathname.startsWith('/api/')) {
      // Check for explicit remaps first (critical for OAuth)
      const remapped = PATH_REMAP[url.pathname];
      const renderPath = remapped
        ? remapped
        : url.pathname.slice(4); // default: strip /api prefix

      const target = `${RENDER}${renderPath}${url.search}`;
      console.log(`[Worker] ${url.pathname} → ${target}`);

      const proxyReq = new Request(target, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? request.body : undefined,
        redirect: 'manual', // let OAuth redirects pass through
      });

      let resp;
      try {
        resp = await fetch(proxyReq);
      } catch (err) {
        return new Response(`API proxy error: ${err.message}`, { status: 502 });
      }

      // Pass Discord OAuth redirect straight back to browser
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get('location') || '/';
        return Response.redirect(loc, resp.status);
      }

      const h = new Headers(resp.headers);
      h.set('Access-Control-Allow-Origin', '*');
      return new Response(resp.body, { status: resp.status, headers: h });
    }

    // HTML injection
    const res = await env.ASSETS.fetch(request);
    const ct = res.headers.get('Content-Type') || '';
    if (!ct.includes('text/html')) return res;

    // Runtime env injection — values from Cloudflare Pages env vars
    const CLIENT_ID    = env.CONBOT5_CLIENT_ID    || '1496510504196116480';
    const GUILD_ID     = env.CONBOT5_GUILD_ID     || '1438103556610723922';
    const API_URL      = env.CONBOT5_API_URL      || RENDER;
    // OAuth redirect MUST match what's registered in Discord portal:
    // https://conbot5.pages.dev/api/auth/discord/callback
    // Worker remaps this → /auth/web/callback on Render (see PATH_REMAP above)
    const OAUTH_REDIR  = `https://conbot5.pages.dev/api/auth/discord/callback`;

    const inject = `<script>
/* CONbot5 runtime — injected by Cloudflare Worker v4 */
window.ENV_CLIENT_ID    = ${JSON.stringify(CLIENT_ID)};
window.ENV_GUILD_ID     = ${JSON.stringify(GUILD_ID)};
window.ENV_API_URL      = ${JSON.stringify(API_URL)};
window.ENV_OAUTH_REDIR  = ${JSON.stringify(OAUTH_REDIR)};
<\/script>`;

    const html = await res.text();
    const patched = html.replace('</head>', inject + '\n</head>');

    return new Response(patched, {
      status: res.status,
      headers: {
        ...Object.fromEntries(res.headers),
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'no-cache, no-store',
      },
    });
  },
};
