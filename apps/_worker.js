// CONbot5 Cloudflare Pages Worker — injects runtime env vars into HTML
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const res = await env.ASSETS.fetch(request);

    // Only inject into HTML responses
    const ct = res.headers.get('Content-Type') || '';
    if (!ct.includes('text/html')) return res;

    const html = await res.text();
    const inject = `<script>
window.ENV_API_URL   = ${JSON.stringify(env.CONBOT5_API_URL   || 'https://conbot5-api.onrender.com')};
window.ENV_GUILD_ID  = ${JSON.stringify(env.CONBOT5_GUILD_ID  || '')};
window.ENV_CLIENT_ID = ${JSON.stringify(env.CONBOT5_CLIENT_ID || '')};
// Legacy aliases
window.CONBOT5_API_URL   = window.ENV_API_URL;
window.CONBOT5_GUILD_ID  = window.ENV_GUILD_ID;
window.CONBOT5_CLIENT_ID = window.ENV_CLIENT_ID;
<\/script>`;

    const patched = html.replace('</head>', inject + '</head>');
    return new Response(patched, {
      headers: { ...Object.fromEntries(res.headers), 'Content-Type': 'text/html;charset=UTF-8' },
      status: res.status,
    });
  }
};
