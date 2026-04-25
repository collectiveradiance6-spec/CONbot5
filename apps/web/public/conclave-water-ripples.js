/* ═══════════════════════════════════════════════════════════════════════
   CONbot5 — CONCLAVE WATER RIPPLES
   Canvas 2D ripple effects — local + screen-wide
   apps/web/public/conclave-water-ripples.js
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  if (window.__CONBOT5_RIPPLES_READY__) return;
  window.__CONBOT5_RIPPLES_READY__ = true;

  /* ── CANVAS SETUP ───────────────────────────────────────────────────*/
  let canvas, ctx, W, H, dpr, raf, enabled = true;
  const ripples = [];

  function createCanvas() {
    canvas = document.getElementById("c5-ripple-layer");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "c5-ripple-layer";
      canvas.className = "c5-ripple-layer";
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText = [
        "position:fixed",
        "inset:0",
        "pointer-events:none",
        "z-index:9980",
        "mix-blend-mode:screen",
      ].join(";");
      document.body.appendChild(canvas);
    }
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize, { passive: true });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);
  }

  /* ── RIPPLE CLASS ───────────────────────────────────────────────────*/
  class Ripple {
    constructor(x, y, opts = {}) {
      this.x        = x;
      this.y        = y;
      this.maxR     = opts.maxR     || 180;
      this.duration = opts.duration || 700;
      this.opacity  = opts.opacity  || 0.16;
      this.color    = opts.color    || "86,217,255";
      this.rings    = opts.rings    || 2;
      this.inward   = opts.inward   || false;
      this.t        = 0;
      this.dead     = false;
    }

    tick(dt) {
      this.t += dt;
      if (this.t >= this.duration) this.dead = true;
    }

    draw(ctx) {
      const p    = Math.min(this.t / this.duration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out-cubic

      for (let i = 0; i < this.rings; i++) {
        const offset = i / this.rings;
        const rp     = Math.max(0, Math.min(1, p - offset * 0.28));
        const r      = this.inward
          ? this.maxR * (1 - rp)
          : this.maxR * rp;
        const alpha  = this.opacity * (1 - p) * (1 - offset * 0.4);

        if (r <= 0 || alpha <= 0) continue;

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${this.color},${alpha.toFixed(3)})`;
        ctx.lineWidth   = Math.max(0.5, 2 * (1 - p));
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /* ── ANIMATION LOOP ─────────────────────────────────────────────────*/
  let lastTs = 0;

  function loop(ts) {
    if (document.hidden) {
      raf = requestAnimationFrame(loop);
      return;
    }

    const dt = Math.min(ts - lastTs, 64);
    lastTs = ts;

    ctx.clearRect(0, 0, W, H);

    if (enabled && ripples.length) {
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].tick(dt);
        ripples[i].draw(ctx);
        if (ripples[i].dead) ripples.splice(i, 1);
      }
    }

    raf = requestAnimationFrame(loop);
  }

  /* ── SPAWN HELPERS ──────────────────────────────────────────────────*/
  function spawnRipple(x, y, opts) {
    if (!enabled) return;
    if (ripples.length > 18) return; // hard cap
    ripples.push(new Ripple(x, y, opts));
  }

  /* ── PUBLIC API ─────────────────────────────────────────────────────*/
  window.CONBOT5_RIPPLES = {
    /**
     * Local ripple at (x, y) — for hover/actor events
     */
    pulse(x, y, options = {}) {
      if (!enabled) return;
      spawnRipple(x, y, {
        maxR:     options.radius   || 120,
        duration: options.duration || 600,
        opacity:  options.opacity  || 0.14,
        color:    options.color    || "86,217,255",
        rings:    options.rings    || 2,
      });
    },

    /**
     * Burst type — "expand" | "collapse" | "splash"
     */
    burst(type = "expand", options = {}) {
      if (!enabled) return;
      const cx = options.x != null ? options.x : W / 2;
      const cy = options.y != null ? options.y : H / 2;

      if (type === "expand") {
        spawnRipple(cx, cy, {
          maxR:     options.maxR    || Math.max(W, H) * 0.55,
          duration: options.duration || 520,
          opacity:  options.opacity  || 0.10,
          color:    options.color    || "86,217,255",
          rings:    3,
        });
      } else if (type === "collapse") {
        spawnRipple(cx, cy, {
          maxR:     options.maxR    || Math.max(W, H) * 0.45,
          duration: options.duration || 420,
          opacity:  options.opacity  || 0.07,
          color:    options.color    || "139,92,255",
          rings:    2,
          inward:   true,
        });
      } else if (type === "splash") {
        spawnRipple(cx, cy, {
          maxR:     options.maxR    || 160,
          duration: options.duration || 800,
          opacity:  options.opacity  || 0.18,
          color:    options.color    || "255,59,206",
          rings:    3,
        });
      } else if (type === "soft") {
        spawnRipple(cx, cy, {
          maxR:     120,
          duration: 500,
          opacity:  0.09,
          color:    "86,217,255",
          rings:    1,
        });
      }
    },

    setEnabled(v) {
      enabled = !!v;
      if (!enabled) ctx.clearRect(0, 0, W, H);
    },

    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.remove();
      ripples.length = 0;
      delete window.CONBOT5_RIPPLES;
    }
  };

  /* ── INIT ───────────────────────────────────────────────────────────*/
  function init() {
    // Check reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      enabled = false;
    }

    // Check activity mode — reduce opacity
    try {
      if (window.self !== window.top) {
        window.CONBOT5_RIPPLES._baseOpacityScale = 0.5;
      }
    } catch (_) {}

    createCanvas();
    lastTs = performance.now();
    raf = requestAnimationFrame(loop);
    console.log("[C5 Ripples] Ready | enabled:", enabled);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
