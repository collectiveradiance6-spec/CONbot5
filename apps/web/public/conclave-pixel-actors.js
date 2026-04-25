/* ═══════════════════════════════════════════════════════════════════════
   CONbot5 — CONCLAVE PIXEL ACTORS
   Tiny animated silhouettes around the emblem — feel "underwater"
   apps/web/public/conclave-pixel-actors.js
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  if (window.__CONBOT5_ACTORS_READY__) return;
  window.__CONBOT5_ACTORS_READY__ = true;

  /* ── CONFIG ─────────────────────────────────────────────────────────*/
  const CFG = {
    DESKTOP_W: 340, DESKTOP_H: 240,
    COMPACT_W: 220, COMPACT_H: 160,
    DESKTOP_COUNT: 4,
    COMPACT_COUNT: 2,
    EVENT_INTERVAL_MIN: 12000,
    EVENT_INTERVAL_MAX: 24000,
  };

  let canvas, ctx, W, H, dpr, raf, enabled = true;
  let actors = [];
  let isCompact = false;
  let isActivity = false;
  let nextEventAt = 0;
  let activeEvent = false;

  /* ── DETECT CONTEXT ─────────────────────────────────────────────────*/
  function detectContext() {
    try {
      isActivity = new URLSearchParams(window.location.search).has("activity") || window.self !== window.top;
    } catch (_) { isActivity = true; }
    isCompact = window.innerWidth < 600 || isActivity;
  }

  /* ── CANVAS SETUP ───────────────────────────────────────────────────*/
  function createCanvas() {
    canvas = document.getElementById("c5-pixel-actors");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "c5-pixel-actors";
      canvas.className = "c5-pixel-actors";
      canvas.setAttribute("aria-hidden", "true");
    }
    ctx = canvas.getContext("2d");
    resize();
  }

  function attachToEmblem() {
    const orb = document.querySelector(".c5-emblem-orb");
    if (orb && !canvas.parentElement) {
      orb.appendChild(canvas);
    } else if (!canvas.parentElement) {
      document.body.appendChild(canvas);
    }
  }

  function resize() {
    isCompact = window.innerWidth < 600 || isActivity;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = isCompact ? CFG.COMPACT_W : CFG.DESKTOP_W;
    H = isCompact ? CFG.COMPACT_H : CFG.DESKTOP_H;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    canvas.style.cssText += [
      ";position:absolute",
      "top:50%",
      "left:50%",
      "transform:translate(-50%,-50%)",
      "pointer-events:none",
      "z-index:1",
    ].join(";");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── ACTOR CLASS ────────────────────────────────────────────────────*/
  const STATES = ["idle", "walk", "wave", "dive", "slip", "submerged", "return"];

  class Actor {
    constructor(id) {
      this.id       = id;
      this.x        = 30 + Math.random() * (W - 60);
      this.y        = H * 0.55 + Math.random() * (H * 0.3);
      this.baseY    = this.y;
      this.dir      = Math.random() < 0.5 ? 1 : -1;
      this.speed    = 0.18 + Math.random() * 0.14;
      this.state    = "idle";
      this.stateT   = 0;
      this.stateDur = 2000 + Math.random() * 3000;
      this.frame    = 0;
      this.frameT   = 0;
      this.alpha    = 0.35 + Math.random() * 0.15;
      this.scale    = 0.78 + Math.random() * 0.18;
      this.submerge = 0; // 0–1
      this.wobble   = Math.random() * Math.PI * 2;
    }

    setState(s, dur) {
      this.state    = s;
      this.stateT   = 0;
      this.stateDur = dur || (1500 + Math.random() * 2000);
    }

    tick(dt) {
      this.stateT  += dt;
      this.frameT  += dt;
      this.wobble  += dt * 0.0012;
      if (this.frameT > 280) { this.frame = (this.frame + 1) % 4; this.frameT = 0; }

      switch (this.state) {
        case "walk":
          this.x += this.dir * this.speed * (dt / 16);
          if (this.x < 12 || this.x > W - 12) this.dir *= -1;
          break;
        case "wave":
          this.y = this.baseY + Math.sin(this.wobble * 2) * 3;
          break;
        case "dive":
          this.submerge = Math.min(1, this.stateT / 600);
          this.y = this.baseY + this.submerge * 18;
          this.alpha = 0.4 * (1 - this.submerge * 0.65);
          if (this.stateT > 2200) this.setState("return", 800);
          break;
        case "submerged":
          this.submerge = 1;
          this.y = this.baseY + 18 + Math.sin(this.wobble) * 4;
          this.alpha = 0.12 + Math.sin(this.wobble * 1.3) * 0.05;
          if (this.stateT > this.stateDur) this.setState("return", 800);
          break;
        case "return":
          this.submerge = Math.max(0, 1 - this.stateT / 800);
          this.y = this.baseY + this.submerge * 18;
          this.alpha = 0.35 + (1 - this.submerge) * 0.1;
          if (this.stateT > 800) { this.submerge = 0; this.setState("idle"); }
          break;
        case "slip":
          this.x += this.dir * this.speed * 2.5 * (dt / 16);
          this.y  = this.baseY + Math.sin(this.stateT * 0.008) * 6;
          if (this.stateT > this.stateDur) this.setState("idle");
          break;
        case "idle":
        default:
          this.y = this.baseY + Math.sin(this.wobble) * 2.5;
          if (this.stateT > this.stateDur) this._nextState();
          break;
      }

      if (this.stateT > this.stateDur && !["dive","submerged","return","slip"].includes(this.state)) {
        this._nextState();
      }
    }

    _nextState() {
      const r = Math.random();
      if (r < 0.40)      this.setState("idle",  2000 + Math.random() * 2000);
      else if (r < 0.72) this.setState("walk",  1500 + Math.random() * 2000);
      else if (r < 0.88) this.setState("wave",  1200 + Math.random() * 1800);
      else               this.setState("slip",  800  + Math.random() * 600);
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y);
      ctx.scale(this.dir * this.scale, this.scale);

      const s = this.submerge;
      const legOff = [0, 2, 0, -2][this.frame];

      // Body — tiny black silhouette pixel-person
      // Head
      ctx.fillStyle = "#0a0a14";
      ctx.beginPath();
      ctx.arc(0, -14, 4, 0, Math.PI * 2);
      ctx.fill();

      // Torso
      ctx.fillRect(-3, -10, 6, 8);

      // Arms
      if (this.state === "wave") {
        // One arm raised
        ctx.fillRect(-6, -10, 3, 2);
        ctx.fillRect(-9, -14, 3, 2);
        ctx.fillRect(3, -10, 3, 6);
      } else {
        ctx.fillRect(-6, -10, 3, 6);
        ctx.fillRect(3, -10, 3, 6);
      }

      // Legs
      ctx.fillRect(-3, -2, 2, 6 + legOff);
      ctx.fillRect(1, -2, 2, 6 - legOff);

      // Cyan/magenta edge glow (chromatic aberration feel)
      ctx.globalAlpha = this.alpha * (0.45 - s * 0.25);
      ctx.shadowColor  = s > 0.3 ? "rgba(86,217,255,0.8)" : "rgba(86,217,255,0.6)";
      ctx.shadowBlur   = s > 0.3 ? 10 : 6;
      ctx.fillStyle    = "rgba(86,217,255,0.15)";
      ctx.beginPath();
      ctx.arc(0, -14, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Caustic line overlay when submerged
      if (s > 0.1) {
        ctx.globalAlpha = this.alpha * s * 0.55;
        ctx.strokeStyle = "rgba(86,217,255,0.45)";
        ctx.lineWidth   = 0.75;
        ctx.beginPath();
        ctx.moveTo(-8, -14 + s * 6);
        ctx.lineTo( 8, -14 + s * 6);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /* ── EVENT SYSTEM ───────────────────────────────────────────────────*/
  function scheduleNextEvent() {
    nextEventAt = Date.now() + CFG.EVENT_INTERVAL_MIN +
      Math.random() * (CFG.EVENT_INTERVAL_MAX - CFG.EVENT_INTERVAL_MIN);
  }

  function triggerEvent() {
    if (activeEvent || actors.length === 0) return;
    activeEvent = true;

    const actor = actors[Math.floor(Math.random() * actors.length)];
    const r = Math.random();

    if (r < 0.4) {
      actor.setState("wave", 2000);
      // Notify ripple system
      if (window.CONBOT5_RIPPLES) {
        window.CONBOT5_RIPPLES.pulse(
          canvas.getBoundingClientRect().left + actor.x * actor.scale,
          canvas.getBoundingClientRect().top  + actor.y * actor.scale,
          { radius: 60, opacity: 0.12, color: "86,217,255" }
        );
      }
    } else if (r < 0.72) {
      actor.setState("dive", 600);
      if (window.CONBOT5_RIPPLES) {
        window.CONBOT5_RIPPLES.burst("splash", {
          x: canvas.getBoundingClientRect().left + actor.x,
          y: canvas.getBoundingClientRect().top  + actor.y,
        });
      }
      setTimeout(() => { actor.setState("submerged", 1400); }, 700);
    } else {
      actor.setState("slip", 900);
    }

    setTimeout(() => { activeEvent = false; scheduleNextEvent(); }, 4000);
  }

  /* ── LOOP ───────────────────────────────────────────────────────────*/
  let lastTs = 0;

  function loop(ts) {
    if (document.hidden) { raf = requestAnimationFrame(loop); return; }

    const dt = Math.min(ts - lastTs, 64);
    lastTs = ts;

    ctx.clearRect(0, 0, W, H);

    if (enabled) {
      actors.forEach(a => { a.tick(dt); a.draw(ctx); });

      if (Date.now() > nextEventAt) triggerEvent();
    }

    raf = requestAnimationFrame(loop);
  }

  /* ── SPAWN ACTORS ───────────────────────────────────────────────────*/
  function spawnActors() {
    const count = isCompact
      ? (isActivity ? 1 : CFG.COMPACT_COUNT)
      : CFG.DESKTOP_COUNT;
    actors = Array.from({ length: count }, (_, i) => new Actor(i));
    scheduleNextEvent();
  }

  /* ── PUBLIC ─────────────────────────────────────────────────────────*/
  window.CONBOT5_ACTORS = {
    setEnabled(v) { enabled = !!v; if (!enabled) ctx.clearRect(0, 0, W, H); },
    triggerEvent,
    destroy() {
      cancelAnimationFrame(raf);
      canvas.remove();
      actors = [];
      delete window.CONBOT5_ACTORS;
    }
  };

  /* ── INIT ───────────────────────────────────────────────────────────*/
  function init() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      enabled = false;
    }
    detectContext();

    createCanvas();
    attachToEmblem();

    // Re-attach after emblem OS injects its DOM
    setTimeout(() => {
      attachToEmblem();
      resize();
    }, 400);

    spawnActors();
    window.addEventListener("resize", () => {
      resize();
      actors = [];
      spawnActors();
    }, { passive: true });

    lastTs = performance.now();
    raf = requestAnimationFrame(loop);
    console.log("[C5 Actors] Ready | count:", actors.length, "| enabled:", enabled);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
