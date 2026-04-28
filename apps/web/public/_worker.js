// apps/web/public/_worker.js — CONbot5 Cloudflare Worker v5
// Fixes: OAuth redirect path, Activity CORS headers, WS proxy

const API = 'https://conbot5-api.onrender.com';

// Explicit path remaps (highest priority)
const PATH_REMAP = {
  '/api/auth/discord/callback': '/auth/discord/callback',
  '/api/auth/web/callback':     '/auth/discord/callback',
  '/api/auth/callback':         '/auth/discord/callback',
  '/api/auth/login':            '/auth/login',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, search } = url;

    // Pass through static assets
    if (!pathname.startsWith('/api/') && !pathname.startsWith('/ws')) {
      return env.ASSETS.fetch(request);
    }

    // WebSocket upgrade — proxy to API WS
    if (request.headers.get('Upgrade') === 'websocket') {
      const wsUrl = `${API.replace('https://', 'wss://')}/ws${search}`;
      return fetch(wsUrl, request);
    }

    // Build API URL
    let apiPath;
    if (PATH_REMAP[pathname]) {
      apiPath = PATH_REMAP[pathname];
    } else {
      apiPath = pathname.replace(/^\/api/, '') || '/';
    }

    const apiUrl = `${API}${apiPath}${search}`;

    const apiReq = new Request(apiUrl, {
      method: request.method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
      redirect: 'manual', // Don't auto-follow OAuth redirects
    });

    let res = await fetch(apiReq);

    // If API redirects (OAuth flow), pass redirect through
    if (res.status >= 300 && res.status < 400) {
      return res;
    }

    // Add CORS + Activity headers
    const headers = new Headers(res.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Credentials', 'true');
    // Required for Discord Activity iframe
    headers.set('X-Frame-Options', 'ALLOWALL');
    headers.set('Content-Security-Policy', "frame-ancestors *");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers
    });
  }
};
