// ═══════════════════════════════════════════════════════════════════════
// CONbot5 Cloudflare Pages Worker v3
// • Injects runtime env vars into HTML
// • Proxies /api/* → Render API (fixes Discord OAuth redirect_uri mismatch)
// • Handles CORS preflight for API proxy
// ═══════════════════════════════════════════════════════════════════════
const RENDER_API = 'https://conbot5-api.onrender.com';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── CORS PREFLIGHT ─────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin':  '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-bot-token',
          'Access-Control-Max-Age':       '86400',
        },
      });
    }

    // ── /api/* PROXY → RENDER ──────────────────────────────────────────
    // This is critical: Discord OAuth registered redirect is
    //   https://conbot5.pages.dev/api/auth/discord/callback
    // We proxy that to:
    //   https://conbot5-api.onrender.com/auth/web/callback
    if (url.pathname.startsWith('/api/')) {
      const apiPath    = url.pathname.slice(4); // strip /api prefix
      const targetUrl  = `${RENDER_API}${apiPath}${url.search}`;

      const proxyReq = new Request(targetUrl, {
        method:  request.method,
        headers: request.headers,
        body:    request.method !== 'GET' && request.method !== 'HEAD'
                   ? request.body
                   : undefined,
        redirect: 'manual', // pass Discord redirects straight through
      });

      let proxyRes;
      try {
        proxyRes = await fetch(proxyReq);
      } catch (err) {
        return new Response(`API proxy error: ${err.message}`, { status: 502 });
      }

      // If Render returns a redirect (OAuth callback → frontend), follow it
      if (proxyRes.status >= 300 && proxyRes.status < 400) {
        const location = proxyRes.headers.get('location') || '/';
        return Response.redirect(location, proxyRes.status);
      }

      const headers = new Headers(proxyRes.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(proxyRes.body, {
        status:  proxyRes.status,
        headers,
      });
    }

    // ── HTML INJECTION ─────────────────────────────────────────────────
    const res = await env.ASSETS.fetch(request);
    const ct  = res.headers.get('Content-Type') || '';
    if (!ct.includes('text/html')) return res;

    const CLIENT_ID = env.CONBOT5_CLIENT_ID || '1496510504196116480';
    const GUILD_ID  = env.CONBOT5_GUILD_ID  || '1438103556610723922';
    const API_URL   = env.CONBOT5_API_URL   || RENDER_API;

    // The OAuth redirect MUST point to the Pages /api/ prefix
    // so the worker above can proxy it to Render's /auth/web/callback
    const OAUTH_REDIRECT = `https://conbot5.pages.dev/api/auth/discord/callback`;

    const inject = `<script>
/* CONbot5 runtime config — injected by Cloudflare Worker */
window.ENV_API_URL      = ${JSON.stringify(API_URL)};
window.ENV_GUILD_ID     = ${JSON.stringify(GUILD_ID)};
window.ENV_CLIENT_ID    = ${JSON.stringify(CLIENT_ID)};
window.ENV_OAUTH_REDIR  = ${JSON.stringify(OAUTH_REDIRECT)};
/* legacy aliases */
window.CONBOT5_API_URL   = window.ENV_API_URL;
window.CONBOT5_GUILD_ID  = window.ENV_GUILD_ID;
window.CONBOT5_CLIENT_ID = window.ENV_CLIENT_ID;
<\/script>`;

    const html    = await res.text();
    const patched = html.replace('</head>', inject + '</head>');

    return new Response(patched, {
      status:  res.status,
      headers: {
        ...Object.fromEntries(res.headers),
        'Content-Type':  'text/html;charset=UTF-8',
        'Cache-Control': 'no-cache, no-store',
      },
    });
  },
};
