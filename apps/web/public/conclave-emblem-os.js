/* ═══════════════════════════════════════════════════════════════════════
   CONbot5 — CONCLAVE EMBLEM OS
   Main emblem controller — injects DOM, handles open/close, tabs, API
   apps/web/public/conclave-emblem-os.js
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  if (window.__CONBOT5_EMBLEM_OS_READY__) return;
  window.__CONBOT5_EMBLEM_OS_READY__ = true;

  /* ── CONFIG ─────────────────────────────────────────────────────────*/
  const API_URL  = window.ENV_API_URL  || "https://conbot5-api.onrender.com";
  const GUILD_ID = window.ENV_GUILD_ID || (() => {
    try { return new URLSearchParams(window.location.search).get("guild") || ""; } catch (_) { return ""; }
  })();

  // Logo search order — no crash if all fail
  const LOGO_SRCS = [
    "/public/conbot5-logo.png",
    "/assets/conbot5-logo.png",
    "/logo.png",
    "https://cdn.discordapp.com/attachments/1439358672970060029/1497097504611635220/CONBOT5-e.png",
  ];

  /* ── STATE ──────────────────────────────────────────────────────────*/
  let isOpen      = false;
  let activeTab   = "now";
  let sessionState = "idle";
  let sseConn     = null;
  let nowPlaying  = null;
  let queue       = [];

  /* ── DOM REFS ───────────────────────────────────────────────────────*/
  let root, orb, hub, logoImg, hubBody, hubStatus;
  let tabButtons   = [];
  let tabPanels    = {};

  /* ── DOM INJECTION ──────────────────────────────────────────────────*/
  function inject() {
    if (document.getElementById("c5-emblem-os")) {
      root = document.getElementById("c5-emblem-os");
      wireExisting();
      return;
    }

    root = document.createElement("div");
    root.id = "c5-emblem-os";
    root.className = "c5-emblem-os";
    root.setAttribute("data-state", "minimized");

    root.innerHTML = `
      <button class="c5-emblem-orb" aria-label="Open CONbot5 command hub" aria-expanded="false">
        <span class="c5-emblem-glass"></span>
        <img class="c5-emblem-logo" alt="CONbot5" />
        <span class="c5-emblem-logo-fallback" style="display:none">C5</span>
        <span class="c5-emblem-caustic"></span>
      </button>

      <section class="c5-emblem-hub c5-liquid-glass" aria-label="CONbot5 command hub" role="dialog" aria-modal="false">
        <div class="c5-glass-rim"></div>
        <div class="c5-glass-scrim"></div>

        <header class="c5-hub-header">
          <div>
            <div class="c5-hub-title">CONbot5</div>
            <div class="c5-hub-status" id="c5-hub-status">Connecting…</div>
          </div>
          <button class="c5-hub-close" aria-label="Close hub" title="Close">✕</button>
        </header>

        <nav class="c5-hub-tabs" role="tablist" aria-label="CONbot5 sections">
          <button class="c5-hub-tab" role="tab" data-tab="now"       aria-selected="true"  id="c5-tab-now"       aria-controls="c5-panel-now">Now Playing</button>
          <button class="c5-hub-tab" role="tab" data-tab="queue"     aria-selected="false" id="c5-tab-queue"     aria-controls="c5-panel-queue">Queue</button>
          <button class="c5-hub-tab" role="tab" data-tab="playlists" aria-selected="false" id="c5-tab-playlists" aria-controls="c5-panel-playlists">Playlists</button>
          <button class="c5-hub-tab" role="tab" data-tab="sessions"  aria-selected="false" id="c5-tab-sessions"  aria-controls="c5-panel-sessions">Sessions</button>
          <button class="c5-hub-tab" role="tab" data-tab="settings"  aria-selected="false" id="c5-tab-settings"  aria-controls="c5-panel-settings">Settings</button>
        </nav>

        <div class="c5-hub-body" id="c5-hub-body">
          ${buildPanelNow()}
          ${buildPanelQueue()}
          ${buildPanelPlaylists()}
          ${buildPanelSessions()}
          ${buildPanelSettings()}
        </div>

        <footer class="c5-hub-actions">
          <button data-action="start-session">▶ Start Session</button>
          <button data-action="join-voice">🎙 Join Voice</button>
          <button data-action="smart-mix">✦ AI Mix</button>
          <button data-action="audio-lab">🎛 Audio Lab</button>
          <button data-action="diagnostics">⚙ Diagnostics</button>
        </footer>
      </section>
    `;

    document.body.appendChild(root);
    wireDOM();
    loadLogo();
    startSSE();
    setupSettingsInteractivity();
  }

  /* ── PANEL HTML ─────────────────────────────────────────────────────*/
  function buildPanelNow() {
    return `
    <div class="c5-tab-panel active" id="c5-panel-now" role="tabpanel" aria-labelledby="c5-tab-now">
      <div id="c5-np-art" style="width:100%;height:80px;border-radius:16px;background:linear-gradient(135deg,rgba(86,217,255,.12),rgba(139,92,255,.12));display:flex;align-items:center;justify-content:center;margin-bottom:10px;font-size:28px;opacity:.35;">♪</div>
      <div class="c5-hub-track-title" id="c5-np-title">No active track</div>
      <div class="c5-hub-track-sub"   id="c5-np-sub">Start a session or search for music</div>
      <div class="c5-hub-progress" id="c5-np-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="c5-hub-progress-fill" id="c5-np-fill" style="width:0%"></div>
      </div>
      <div class="c5-hub-controls">
        <button class="c5-hub-btn" data-cmd="previous" title="Previous" aria-label="Previous">⏮</button>
        <button class="c5-hub-btn primary" data-cmd="pause" id="c5-play-btn" title="Play/Pause" aria-label="Play or Pause">▶</button>
        <button class="c5-hub-btn" data-cmd="skip" title="Skip" aria-label="Skip">⏭</button>
        <button class="c5-hub-btn" data-cmd="stop" title="Stop" aria-label="Stop">⏹</button>
      </div>
      <div style="margin-top:10px">
        <div class="c5-hub-stat"><span class="c5-hub-stat-label">Queue</span><span class="c5-hub-stat-value" id="c5-np-queue">—</span></div>
        <div class="c5-hub-stat"><span class="c5-hub-stat-label">Connection</span><span class="c5-hub-stat-value" id="c5-np-conn"><span class="c5-hub-dot off"></span>Offline</span></div>
      </div>
    </div>`;
  }

  function buildPanelQueue() {
    return `
    <div class="c5-tab-panel" id="c5-panel-queue" role="tabpanel" aria-labelledby="c5-tab-queue">
      <div id="c5-queue-list"></div>
      <div class="c5-hub-empty" id="c5-queue-empty">
        <div class="c5-hub-empty-icon">🎵</div>
        Queue is empty. Add tracks to get started.
      </div>
    </div>`;
  }

  function buildPanelPlaylists() {
    return `
    <div class="c5-tab-panel" id="c5-panel-playlists" role="tabpanel" aria-labelledby="c5-tab-playlists">
      <div class="c5-hub-section">Saved Playlists</div>
      <div class="c5-hub-empty"><div class="c5-hub-empty-icon">📀</div>No saved playlists yet.</div>
      <div class="c5-hub-section" style="margin-top:14px">Recent Mixes</div>
      <div class="c5-hub-empty"><div class="c5-hub-empty-icon">✦</div>AI Mix generates on demand.</div>
    </div>`;
  }

  function buildPanelSessions() {
    return `
    <div class="c5-tab-panel" id="c5-panel-sessions" role="tabpanel" aria-labelledby="c5-tab-sessions">
      <div class="c5-hub-section">Active Session</div>
      <div id="c5-session-info">
        <div class="c5-hub-stat"><span class="c5-hub-stat-label">Status</span><span class="c5-hub-stat-value" id="c5-sess-status">Idle</span></div>
        <div class="c5-hub-stat"><span class="c5-hub-stat-label">Host</span><span class="c5-hub-stat-value" id="c5-sess-host">—</span></div>
        <div class="c5-hub-stat"><span class="c5-hub-stat-label">Voice Channel</span><span class="c5-hub-stat-value" id="c5-sess-vc">—</span></div>
        <div class="c5-hub-stat"><span class="c5-hub-stat-label">Listeners</span><span class="c5-hub-stat-value" id="c5-sess-listeners">—</span></div>
        <div class="c5-hub-stat"><span class="c5-hub-stat-label">Mode</span><span class="c5-hub-stat-value" id="c5-sess-mode">—</span></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="c5-hub-btn" style="flex:1;width:auto;border-radius:10px;padding:8px;" data-cmd="start-session">Start</button>
        <button class="c5-hub-btn" style="flex:1;width:auto;border-radius:10px;padding:8px;" data-cmd="join-voice">Join</button>
      </div>
    </div>`;
  }

  function buildPanelSettings() {
    return `
    <div class="c5-tab-panel" id="c5-panel-settings" role="tabpanel" aria-labelledby="c5-tab-settings">
      <div class="c5-hub-section">Background Mode</div>
      <div class="c5-mode-btns">
        <button class="c5-mode-btn active" data-mode="silk">Silk</button>
        <button class="c5-mode-btn" data-mode="dark">Dark</button>
        <button class="c5-mode-btn" data-mode="prism">Prism</button>
      </div>
      <div class="c5-hub-section">Appearance</div>
      <div class="c5-slider-row">
        <span class="c5-slider-label">Intensity</span>
        <input class="c5-slider" type="range" min="0" max="100" value="75" id="c5-s-intensity" aria-label="Background intensity">
      </div>
      <div class="c5-slider-row">
        <span class="c5-slider-label">Motion Level</span>
        <input class="c5-slider" type="range" min="0" max="100" value="60" id="c5-s-motion" aria-label="Motion level">
      </div>
      <div class="c5-hub-section" style="margin-top:12px">Accessibility</div>
      <div class="c5-toggle-row">
        <span class="c5-toggle-label">Reduced Motion</span>
        <button class="c5-toggle" id="c5-t-motion" role="switch" aria-checked="false" aria-label="Reduced motion"></button>
      </div>
      <div class="c5-toggle-row">
        <span class="c5-toggle-label">High Contrast</span>
        <button class="c5-toggle" id="c5-t-contrast" role="switch" aria-checked="false" aria-label="High contrast"></button>
      </div>
      <div class="c5-toggle-row">
        <span class="c5-toggle-label">Epilepsy Safe</span>
        <button class="c5-toggle" id="c5-t-epilepsy" role="switch" aria-checked="false" aria-label="Epilepsy safe mode"></button>
      </div>
    </div>`;
  }

  /* ── WIRE DOM ───────────────────────────────────────────────────────*/
  function wireDOM() {
    orb       = root.querySelector(".c5-emblem-orb");
    hub       = root.querySelector(".c5-emblem-hub");
    logoImg   = root.querySelector(".c5-emblem-logo");
    hubBody   = root.querySelector(".c5-hub-body");
    hubStatus = root.querySelector("#c5-hub-status");
    tabButtons = Array.from(root.querySelectorAll(".c5-hub-tab"));

    tabButtons.forEach(btn => {
      tabPanels[btn.dataset.tab] = root.querySelector(`#c5-panel-${btn.dataset.tab}`);
    });

    // Orb
    orb.addEventListener("click", toggle);
    orb.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });

    // Hover ripple
    orb.addEventListener("mouseenter", () => {
      if (window.CONBOT5_RIPPLES) {
        const r = orb.getBoundingClientRect();
        window.CONBOT5_RIPPLES.pulse(r.left + r.width / 2, r.top + r.height / 2, { radius: 80, opacity: 0.10 });
      }
      if (window.CONBOT5_ACTORS) window.CONBOT5_ACTORS.triggerEvent && setTimeout(() => {}, 0);
    });

    // Close button
    root.querySelector(".c5-hub-close").addEventListener("click", close);

    // Escape
    document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen) close(); });

    // Outside click
    document.addEventListener("click", e => {
      if (isOpen && !root.contains(e.target)) close();
    });

    // Tabs
    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => setTab(btn.dataset.tab));
    });

    // Footer action buttons
    root.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => handleAction(btn.dataset.action));
    });

    // Now Playing control buttons
    root.querySelectorAll("[data-cmd]").forEach(btn => {
      btn.addEventListener("click", () => sendCommand(btn.dataset.cmd));
    });

    // Visibility
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && window.CONBOT5_ACTORS) window.CONBOT5_ACTORS.setEnabled(false);
      else if (!document.hidden && window.CONBOT5_ACTORS) window.CONBOT5_ACTORS.setEnabled(true);
    });

    // Reduced motion watch
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", e => {
      if (window.CONBOT5_BG) window.CONBOT5_BG.setReducedMotion(e.matches);
    });
  }

  function wireExisting() {
    orb     = root.querySelector(".c5-emblem-orb");
    hub     = root.querySelector(".c5-emblem-hub");
    logoImg = root.querySelector(".c5-emblem-logo");
    if (orb) orb.addEventListener("click", toggle);
    tabButtons = Array.from(root.querySelectorAll(".c5-hub-tab"));
    tabButtons.forEach(btn => {
      tabPanels[btn.dataset.tab] = root.querySelector(`#c5-panel-${btn.dataset.tab}`);
      btn.addEventListener("click", () => setTab(btn.dataset.tab));
    });
    loadLogo();
    startSSE();
  }

  /* ── LOGO LOADER ────────────────────────────────────────────────────*/
  function loadLogo() {
    if (!logoImg) return;
    let idx = 0;
    function tryNext() {
      if (idx >= LOGO_SRCS.length) {
        logoImg.style.display = "none";
        const fallback = root.querySelector(".c5-emblem-logo-fallback");
        if (fallback) fallback.style.display = "";
        return;
      }
      logoImg.onerror = () => { idx++; tryNext(); };
      logoImg.src = LOGO_SRCS[idx];
      idx++;
    }
    tryNext();
  }

  /* ── OPEN / CLOSE ───────────────────────────────────────────────────*/
  function open() {
    if (isOpen) return;
    isOpen = true;
    root.setAttribute("data-state", "expanded");
    hub.classList.add("open");
    orb.setAttribute("aria-expanded", "true");
    if (window.CONBOT5_RIPPLES) {
      const r = orb.getBoundingClientRect();
      window.CONBOT5_RIPPLES.burst("expand", { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    if (window.CONBOT5_BG) window.CONBOT5_BG.pulse("expand");
    refreshNowPlaying();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    root.setAttribute("data-state", "minimized");
    hub.classList.remove("open");
    orb.setAttribute("aria-expanded", "false");
    if (window.CONBOT5_RIPPLES) {
      const r = orb.getBoundingClientRect();
      window.CONBOT5_RIPPLES.burst("collapse", { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
  }

  function toggle() { isOpen ? close() : open(); }

  /* ── TABS ───────────────────────────────────────────────────────────*/
  function setTab(tab) {
    activeTab = tab;
    tabButtons.forEach(btn => {
      const sel = btn.dataset.tab === tab;
      btn.setAttribute("aria-selected", String(sel));
    });
    Object.entries(tabPanels).forEach(([key, panel]) => {
      if (!panel) return;
      panel.classList.toggle("active", key === tab);
    });
    if (tab === "now") refreshNowPlaying();
    if (tab === "queue") refreshQueue();
    if (tab === "settings") refreshSettings();
  }

  /* ── SSE ────────────────────────────────────────────────────────────*/
  function startSSE() {
    if (!GUILD_ID || !API_URL) {
      setStatus("No guild ID");
      return;
    }
    try {
      sseConn = new EventSource(`${API_URL}/sse/${GUILD_ID}`);
      sseConn.onopen = () => setStatus("Connected", true);
      sseConn.onerror = () => {
        setStatus("Offline", false);
        setTimeout(() => { if (sseConn) { sseConn.close(); startSSE(); } }, 8000);
      };
      sseConn.addEventListener("playerUpdate", e => {
        try {
          const data = JSON.parse(e.data);
          handlePlayerUpdate(data);
        } catch (_) {}
      });
      sseConn.addEventListener("queueUpdate", e => {
        try {
          const data = JSON.parse(e.data);
          queue = data.queue || [];
          refreshQueue();
        } catch (_) {}
      });
      sseConn.onmessage = e => {
        try { handlePlayerUpdate(JSON.parse(e.data)); } catch (_) {}
      };
    } catch (_) {
      setStatus("SSE unavailable");
    }
  }

  function setStatus(text, online) {
    if (hubStatus) hubStatus.textContent = text;
    const connEl = document.getElementById("c5-np-conn");
    if (connEl) {
      const cls = online ? "on" : "off";
      connEl.innerHTML = `<span class="c5-hub-dot ${cls}"></span>${text}`;
    }
  }

  function handlePlayerUpdate(data) {
    nowPlaying = data.current || data.track || null;
    queue = data.queue || queue;
    if (isOpen && activeTab === "now") refreshNowPlaying();
    if (isOpen && activeTab === "queue") refreshQueue();
  }

  /* ── REFRESH NOW PLAYING ────────────────────────────────────────────*/
  function refreshNowPlaying() {
    const title  = document.getElementById("c5-np-title");
    const sub    = document.getElementById("c5-np-sub");
    const fill   = document.getElementById("c5-np-fill");
    const prog   = document.getElementById("c5-np-progress");
    const qEl    = document.getElementById("c5-np-queue");
    const playBtn = document.getElementById("c5-play-btn");

    if (!title) return;

    if (nowPlaying) {
      title.textContent = nowPlaying.title || nowPlaying.name || "Unknown Track";
      sub.textContent   = [nowPlaying.author, nowPlaying.source].filter(Boolean).join(" · ") || "Unknown artist";
      const pct = nowPlaying.progress != null ? nowPlaying.progress : 0;
      fill.style.width = `${Math.min(100, pct)}%`;
      if (prog) prog.setAttribute("aria-valuenow", String(Math.min(100, pct)));
      if (playBtn) playBtn.textContent = nowPlaying.paused ? "▶" : "⏸";
    } else {
      title.textContent = "No active track";
      sub.textContent   = "Start a session or search for music";
      fill.style.width  = "0%";
      if (playBtn) playBtn.textContent = "▶";
    }
    if (qEl) qEl.textContent = queue.length ? `${queue.length} tracks` : "—";
  }

  /* ── REFRESH QUEUE ──────────────────────────────────────────────────*/
  function refreshQueue() {
    const list  = document.getElementById("c5-queue-list");
    const empty = document.getElementById("c5-queue-empty");
    if (!list) return;
    list.innerHTML = "";
    if (!queue || queue.length === 0) {
      if (empty) empty.style.display = "";
      return;
    }
    if (empty) empty.style.display = "none";
    queue.slice(0, 5).forEach((track, i) => {
      const item = document.createElement("div");
      item.className = "c5-hub-queue-item";
      const dur = track.duration ? formatDur(track.duration) : "—";
      item.innerHTML = `
        <span class="c5-hub-queue-num">${i + 1}</span>
        <span class="c5-hub-queue-title">${esc(track.title || track.name || "Unknown")}</span>
        <span class="c5-hub-queue-dur">${dur}</span>`;
      list.appendChild(item);
    });
    if (queue.length > 5) {
      const more = document.createElement("div");
      more.className = "c5-hub-empty";
      more.style.fontSize = "10px";
      more.style.padding = "8px 0 0";
      more.textContent = `+${queue.length - 5} more tracks`;
      list.appendChild(more);
    }
  }

  /* ── SETTINGS INTERACTIVITY ─────────────────────────────────────────*/
  function setupSettingsInteractivity() {
    // Mode buttons
    root.querySelectorAll(".c5-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        root.querySelectorAll(".c5-mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        if (window.CONBOT5_BG) window.CONBOT5_BG.setMode(btn.dataset.mode);
      });
    });

    // Sliders
    const intensitySlider = document.getElementById("c5-s-intensity");
    const motionSlider    = document.getElementById("c5-s-motion");
    if (intensitySlider) intensitySlider.addEventListener("input", e => {
      if (window.CONBOT5_BG) window.CONBOT5_BG.setIntensity(parseInt(e.target.value) / 100);
    });
    if (motionSlider) motionSlider.addEventListener("input", e => {
      if (window.CONBOT5_BG) window.CONBOT5_BG.setMotionLevel(parseInt(e.target.value) / 100);
    });

    // Toggles
    function wireToggle(id, fn) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("click", () => {
        const on = el.getAttribute("aria-checked") !== "true";
        el.setAttribute("aria-checked", String(on));
        el.classList.toggle("on", on);
        fn(on);
      });
    }

    wireToggle("c5-t-motion",   v => { if (window.CONBOT5_BG) window.CONBOT5_BG.setReducedMotion(v); });
    wireToggle("c5-t-contrast", v => { if (window.CONBOT5_BG) window.CONBOT5_BG.setHighContrast(v); });
    wireToggle("c5-t-epilepsy", v => { if (window.CONBOT5_BG) window.CONBOT5_BG.setEpilepsySafe(v); });
  }

  function refreshSettings() {
    // Sync toggle states from BG orchestrator
    const bg = window.CONBOT5_BG;
    if (!bg) return;
    const html = document.documentElement;
    const rm = html.getAttribute("data-c5-reduced-motion") === "true";
    const hc = html.getAttribute("data-c5-high-contrast")  === "true";
    const ep = html.getAttribute("data-c5-epilepsy-safe")  === "true";
    const syncToggle = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.setAttribute("aria-checked", String(val));
      el.classList.toggle("on", val);
    };
    syncToggle("c5-t-motion",   rm);
    syncToggle("c5-t-contrast", hc);
    syncToggle("c5-t-epilepsy", ep);

    // Sync mode buttons
    const mode = html.getAttribute("data-c5-mode") || "silk";
    root.querySelectorAll(".c5-mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  }

  /* ── ACTIONS ────────────────────────────────────────────────────────*/
  function handleAction(action) {
    switch (action) {
      case "start-session": sendCommand("start-session"); break;
      case "join-voice":    sendCommand("join-voice");    break;
      case "smart-mix":     sendCommand("smart-mix");     break;
      case "audio-lab":     setTab("settings");           break;
      case "diagnostics":   showDiagnostics();            break;
    }
  }

  async function sendCommand(command, payload = {}) {
    if (!GUILD_ID || !API_URL) return;
    try {
      const res = await fetch(`${API_URL}/commands/${GUILD_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, payload }),
      });
      if (!res.ok) console.warn("[C5 Emblem] Command failed:", command, res.status);
    } catch (_) {
      // API offline — degrade silently
      console.warn("[C5 Emblem] API unreachable for command:", command);
    }
  }

  function showDiagnostics() {
    const body = document.getElementById("c5-hub-body");
    if (!body) return;
    const info = [
      `API: ${API_URL}`,
      `Guild: ${GUILD_ID || "—"}`,
      `SSE: ${sseConn ? (sseConn.readyState === 1 ? "OPEN" : "CLOSED") : "N/A"}`,
      `Ripples: ${!!window.CONBOT5_RIPPLES}`,
      `Actors: ${!!window.CONBOT5_ACTORS}`,
      `BG: ${!!window.CONBOT5_BG}`,
      `Mode: ${document.documentElement.getAttribute("data-c5-mode")}`,
      `Activity: ${document.documentElement.hasAttribute("data-c5-activity")}`,
    ];
    const diag = document.createElement("div");
    diag.style.cssText = "font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,.55);line-height:1.9;padding:12px 0;";
    diag.innerHTML = `<div style="color:rgba(86,217,255,.8);margin-bottom:8px;font-size:10px;font-weight:700;">Diagnostics</div>` +
      info.map(l => `<div>${esc(l)}</div>`).join("");
    // Temporarily show in body
    const existing = document.getElementById("c5-diag-panel");
    if (existing) { existing.remove(); return; }
    diag.id = "c5-diag-panel";
    body.prepend(diag);
    setTimeout(() => diag.remove(), 8000);
  }

  /* ── UTILS ──────────────────────────────────────────────────────────*/
  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDur(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  /* ── PUBLIC API ─────────────────────────────────────────────────────*/
  window.CONBOT5_EMBLEM = {
    open,
    close,
    toggle,
    setTab,
    setSessionState(state) {
      sessionState = state;
      const el = document.getElementById("c5-sess-status");
      if (el) el.textContent = state;
    },
    pulse(type, payload = {}) {
      if (window.CONBOT5_RIPPLES) window.CONBOT5_RIPPLES.burst(type, payload);
    },
    destroy() {
      if (sseConn) { sseConn.close(); sseConn = null; }
      if (root) root.remove();
      delete window.CONBOT5_EMBLEM;
    }
  };

  /* ── INIT ───────────────────────────────────────────────────────────*/
  function init() {
    inject();
    console.log("[C5 Emblem OS] Ready | guild:", GUILD_ID || "—", "| api:", API_URL);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
