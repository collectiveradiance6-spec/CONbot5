// ═══════════════════════════════════════════════════════════════════════
// CONbot5 FRONTEND PATCH v8
// Drop this <script> block into index.html BEFORE the closing </body>
// It patches: Discord OAuth redirect_uri, WebSocket command bus,
//             bg-engine panel effects, activity launch iframe
// ═══════════════════════════════════════════════════════════════════════

/* ── DISCORD LOGIN — FIXED redirect_uri ────────────────────────────────
   The redirect must use the Cloudflare Pages URL that _worker.js proxies.
   window.ENV_OAUTH_REDIR is injected by _worker.js at runtime.
   Fallback: use the registered Pages redirect directly.
   ─────────────────────────────────────────────────────────────────── */
window.discordLogin = function() {
  const clientId = window.ENV_CLIENT_ID || '1496510504196116480';

  // This URI must exactly match a registered redirect in Discord portal.
  // _worker.js proxies  conbot5.pages.dev/api/auth/discord/callback
  //                  →  conbot5-api.onrender.com/auth/web/callback
  const redirectUri = window.ENV_OAUTH_REDIR
    || 'https://conbot5.pages.dev/api/auth/discord/callback';

  const state = Math.random().toString(36).slice(2);
  localStorage.setItem('c5st', state);

  // Scopes: identify (user info) + guilds (server list) + guilds.members.read (role check)
  const scope = 'identify guilds';

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope,
    state,
    guild_id:      window.ENV_GUILD_ID || '1438103556610723922',
    // Prompt select_account forces guild picker even if already logged in
    prompt:        'none',
  });

  window.location.href = `https://discord.com/oauth2/authorize?${params}`;
};

/* ── WEBSOCKET CLIENT — realtime customization ─────────────────────────
   Connects in addition to SSE. WS is bidirectional:
   • client → server: {type:'command', command:'volume', level:80}
   • server → client: {type:'state'|'tick'|'command_ack', ...}
   ─────────────────────────────────────────────────────────────────── */
(function initWebSocket() {
  let ws = null;
  let reconnectTimer = null;
  let failCount = 0;

  function connect() {
    const apiUrl = (window.ENV_API_URL || 'https://conbot5-api.onrender.com')
      .replace(/^http/, 'ws');           // http→ws, https→wss
    const guild  = window.GID || localStorage.getItem('c5g') || '';
    if (!guild) return;

    const url = `${apiUrl}/ws?guild=${guild}`;

    try { ws = new WebSocket(url); }
    catch { return; }

    ws.onopen = () => {
      failCount = 0;
      console.log('[WS] connected');
      // Tell bg-engine to animate (connected = playing state cue)
      if (window.CONbotBG) CONbotBG.setParam('reactivity', 0.25);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'state') {
          // Merge into global ST and re-render without waiting for SSE
          if (window.ST !== undefined) {
            window.ST = { ...(window.ST || {}), ...msg.data };
            if (typeof window.render === 'function') window.render();
          }
        }
        if (msg.type === 'tick') {
          if (window.ST) {
            window.ST.elapsed = msg.data.elapsed;
            if (typeof window.updP === 'function') window.updP();
            if (typeof window.refreshHubState === 'function') window.refreshHubState();
          }
        }
      } catch {}
    };

    ws.onclose = () => {
      failCount++;
      const delay = Math.min(30_000, 2_000 * Math.pow(1.4, failCount));
      reconnectTimer = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }

  // Expose global WS command sender so cmd() can use WS when available
  window.wsSend = function(command, payload = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'command', command, ...payload }));
      return true;
    }
    return false;
  };

  // Boot WS after auth resolves
  const origBoot = window.boot;
  window.boot = function() {
    connect();
    if (typeof origBoot === 'function') origBoot();
  };

  // Also try connecting if guild is already set
  if (localStorage.getItem('c5g')) {
    setTimeout(connect, 1000);
  }
})();

/* ── CMD OVERRIDE — prefer WS, fallback to HTTP POST ───────────────────
   If the WebSocket is open we get zero-latency button response.
   ─────────────────────────────────────────────────────────────────── */
(function patchCmd() {
  const origCmd = window.cmd;
  window.cmd = async function(command, payload = {}) {
    if (window.wsSend(command, payload)) {
      // WS sent — optimistic update for volume
      if (command === 'volume' && payload.level !== undefined) {
        const v = payload.level;
        ['vsl','fvol','lv','adVolSl'].forEach(id => {
          const e = document.getElementById(id);
          if (e && e.tagName === 'INPUT') e.value = v;
        });
        ['vval','lvv','adVolV'].forEach(id => {
          const e = document.getElementById(id);
          if (e) e.textContent = v + '%';
        });
        if (window.ST) window.ST.volume = v;
      }
      return;
    }
    // Fallback to HTTP
    if (typeof origCmd === 'function') return origCmd(command, payload);
  };
})();

/* ── BG ENGINE — panel glass interaction effects ───────────────────────
   When mouse enters a glass panel, intensify local bloom.
   When a button fires a command, pulse a ripple from that element.
   ─────────────────────────────────────────────────────────────────── */
(function initPanelEffects() {
  // Panel hover → local reactivity spike
  document.querySelectorAll('.gl').forEach(panel => {
    panel.addEventListener('mouseenter', () => {
      if (window.CONbotBG) CONbotBG.setParam('reactivity',
        parseFloat(CONbotBG.params?.reactivity || 0) + 0.12
      );
    });
    panel.addEventListener('mouseleave', () => {
      const playing = window.ST?.current && !window.ST?.paused;
      if (window.CONbotBG) CONbotBG.setParam('reactivity', playing ? 0.8 : 0.18);
    });
  });

  // Button click → radial glow pulse on the canvas
  document.querySelectorAll('.tb, .abn, .gbtn, .mbtn, .eqb, .m-btn, .g-btn, .eq-btn, .hub-btn, .hub-action').forEach(btn => {
    btn.addEventListener('click', function(e) {
      // Ripple on button itself
      const ripple = document.createElement('span');
      const rect   = btn.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height) * 2;
      ripple.style.cssText = `
        position:absolute;pointer-events:none;border-radius:50%;
        width:${size}px;height:${size}px;
        left:${e.clientX - rect.left - size/2}px;
        top:${e.clientY - rect.top - size/2}px;
        background:radial-gradient(circle,rgba(77,223,255,.35),transparent 70%);
        animation:rippleOut 0.45s ease-out forwards;
      `;
      if (!document.getElementById('c5RippleStyle')) {
        const s = document.createElement('style');
        s.id = 'c5RippleStyle';
        s.textContent = '@keyframes rippleOut{from{transform:scale(0);opacity:1}to{transform:scale(1);opacity:0}}';
        document.head.appendChild(s);
      }
      btn.style.position = btn.style.position || 'relative';
      btn.style.overflow  = 'hidden';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);

      // Spike bg reactivity
      if (window.CONbotBG) {
        CONbotBG.setParam('reactivity', 0.95);
        setTimeout(() => {
          const playing = window.ST?.current && !window.ST?.paused;
          CONbotBG.setParam('reactivity', playing ? 0.8 : 0.18);
        }, 600);
      }
    });
  });
})();

/* ── DISCORD ACTIVITY LAUNCH ──────────────────────────────────────────
   When the user is inside Discord Activity, the embed shows the hub.
   If accessed from a regular browser, the full OS view loads normally.
   ─────────────────────────────────────────────────────────────────── */
(function detectActivityContext() {
  // Discord embeds the activity in an iframe with ?guild= from the SDK
  const p = new URLSearchParams(location.search);
  const inIframe = window.self !== window.top;

  if (inIframe && p.get('guild')) {
    // Running as Discord Activity — open hub immediately, hide nav/foot
    document.addEventListener('DOMContentLoaded', () => {
      const nav  = document.querySelector('.nav');
      const foot = document.querySelector('.foot');
      const hub  = document.getElementById('hub');
      if (nav)  nav.style.display  = 'none';
      if (foot) foot.style.display = 'none';
      if (hub && typeof window.openHub === 'function') {
        // Small delay to let boot() finish
        setTimeout(window.openHub, 800);
      }
      // Compact grid for Activity iframe
      document.documentElement.style.setProperty('--nav', '0px');
      document.documentElement.style.setProperty('--island-h', '60px');
    });
  }
})();

console.log('[CONbot5 v8] patch loaded — WS + OAuth + panel effects active');
