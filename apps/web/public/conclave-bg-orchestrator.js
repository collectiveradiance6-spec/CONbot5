/* ═══════════════════════════════════════════════════════════════════════
   CONbot5 — CONCLAVE BACKGROUND ORCHESTRATOR
   Manages silk/dark/prism modes, accessibility flags, coordinates bg-engine
   apps/web/public/conclave-bg-orchestrator.js
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  if (window.__CONBOT5_BG_ORCHESTRATOR_READY__) return;
  window.__CONBOT5_BG_ORCHESTRATOR_READY__ = true;

  /* ── STATE ──────────────────────────────────────────────────────────── */
  const STATE = {
    mode: "silk",
    intensity: 0.75,
    reactivity: 0.5,
    motionLevel: 0.6,
    reducedMotion: false,
    highContrast: false,
    epilepsySafe: false,
    isActivity: false,
    lastPulse: 0,
  };

  const html = document.documentElement;

  /* ── DETECT DISCORD ACTIVITY ─────────────────────────────────────────*/
  function detectActivity() {
    try {
      const p = new URLSearchParams(window.location.search);
      STATE.isActivity =
        p.has("activity") ||
        p.has("guild") ||
        window.self !== window.top;
    } catch (_) {
      STATE.isActivity = true;
    }
    if (STATE.isActivity) {
      html.setAttribute("data-c5-activity", "true");
      STATE.motionLevel = Math.min(STATE.motionLevel, 0.35);
      STATE.intensity = Math.min(STATE.intensity, 0.55);
    }
  }

  /* ── ACCESSIBILITY DETECTION ─────────────────────────────────────────*/
  function detectA11y() {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    STATE.reducedMotion = mq.matches;
    applyA11yAttrs();
    mq.addEventListener("change", (e) => {
      STATE.reducedMotion = e.matches;
      applyA11yAttrs();
      syncBgEngine();
      if (window.CONBOT5_RIPPLES) window.CONBOT5_RIPPLES.setEnabled(!e.matches);
    });

    const hcMq = window.matchMedia("(prefers-contrast: more)");
    STATE.highContrast = hcMq.matches;
    applyA11yAttrs();
    hcMq.addEventListener("change", (e) => {
      STATE.highContrast = e.matches;
      applyA11yAttrs();
    });
  }

  function applyA11yAttrs() {
    html.setAttribute("data-c5-reduced-motion", String(STATE.reducedMotion));
    html.setAttribute("data-c5-high-contrast",  String(STATE.highContrast));
    html.setAttribute("data-c5-epilepsy-safe",  String(STATE.epilepsySafe));
    html.setAttribute("data-c5-mode",           STATE.mode);
  }

  /* ── SYNC WITH EXISTING BG-ENGINE ───────────────────────────────────*/
  function syncBgEngine() {
    try {
      if (window.bgEngine) {
        if (typeof window.bgEngine.setMode      === "function") window.bgEngine.setMode(STATE.mode);
        if (typeof window.bgEngine.setIntensity === "function") window.bgEngine.setIntensity(STATE.intensity);
        if (typeof window.bgEngine.setMotion    === "function") window.bgEngine.setMotion(STATE.reducedMotion ? 0 : STATE.motionLevel);
      }
      if (window.BG_ENGINE) {
        const e = window.BG_ENGINE;
        if (typeof e.setMode      === "function") e.setMode(STATE.mode);
        if (typeof e.setIntensity === "function") e.setIntensity(STATE.intensity);
      }
    } catch (_) {/* bg-engine absent — fine */}
  }

  /* ── VISIBILITY PAUSE ───────────────────────────────────────────────*/
  document.addEventListener("visibilitychange", () => {
    html.setAttribute("data-c5-hidden", String(document.hidden));
  });

  /* ── PUBLIC API ─────────────────────────────────────────────────────*/
  window.CONBOT5_BG = {
    get mode()        { return STATE.mode; },
    get intensity()   { return STATE.intensity; },
    get reactivity()  { return STATE.reactivity; },
    get motionLevel() { return STATE.motionLevel; },

    setMode(mode) {
      if (!["silk", "dark", "prism"].includes(mode)) return;
      STATE.mode = mode;
      applyA11yAttrs();
      syncBgEngine();
      // Store preference
      try { localStorage.setItem("c5-mode", mode); } catch (_) {}
    },

    setIntensity(v) {
      STATE.intensity = Math.max(0, Math.min(1, v));
      html.style.setProperty("--c5-bg-intensity", STATE.intensity);
      syncBgEngine();
    },

    setReactivity(v) {
      STATE.reactivity = Math.max(0, Math.min(1, v));
      html.style.setProperty("--c5-bg-reactivity", STATE.reactivity);
    },

    setMotionLevel(v) {
      STATE.motionLevel = Math.max(0, Math.min(1, v));
      html.style.setProperty("--c5-motion-level", STATE.motionLevel);
      syncBgEngine();
    },

    setReducedMotion(v) {
      STATE.reducedMotion = !!v;
      applyA11yAttrs();
      if (window.CONBOT5_RIPPLES) window.CONBOT5_RIPPLES.setEnabled(!v);
    },

    setHighContrast(v) {
      STATE.highContrast = !!v;
      applyA11yAttrs();
    },

    setEpilepsySafe(v) {
      STATE.epilepsySafe = !!v;
      applyA11yAttrs();
    },

    pulse(type = "soft", options = {}) {
      if (STATE.reducedMotion || STATE.epilepsySafe) return;
      const now = Date.now();
      const minGap = STATE.epilepsySafe ? 500 : 80;
      if (now - STATE.lastPulse < minGap) return;
      STATE.lastPulse = now;
      if (window.CONBOT5_RIPPLES) {
        window.CONBOT5_RIPPLES.burst(type, options);
      }
    },

    destroy() {
      html.removeAttribute("data-c5-mode");
      html.removeAttribute("data-c5-reduced-motion");
      html.removeAttribute("data-c5-high-contrast");
      html.removeAttribute("data-c5-epilepsy-safe");
      html.removeAttribute("data-c5-activity");
      html.removeAttribute("data-c5-hidden");
      delete window.CONBOT5_BG;
    }
  };

  /* ── INIT ───────────────────────────────────────────────────────────*/
  function init() {
    detectActivity();
    detectA11y();

    // Restore saved mode
    try {
      const saved = localStorage.getItem("c5-mode");
      if (saved && ["silk", "dark", "prism"].includes(saved)) {
        STATE.mode = saved;
      }
    } catch (_) {}

    applyA11yAttrs();

    // CSS custom properties for intensity/motion
    html.style.setProperty("--c5-bg-intensity",  STATE.intensity);
    html.style.setProperty("--c5-bg-reactivity", STATE.reactivity);
    html.style.setProperty("--c5-motion-level",  STATE.motionLevel);

    // Delay sync to allow bg-engine to load first
    setTimeout(syncBgEngine, 300);
    console.log("[C5 BG] Orchestrator ready | mode:", STATE.mode, "| activity:", STATE.isActivity);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
