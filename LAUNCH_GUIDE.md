# CONbot5 SUPREME — Complete Launch Guide
# GitHub → Render → Cloudflare Pages → Discord Activity Verification
# ═══════════════════════════════════════════════════════════════════════

---

## PHASE 1 — GitHub Repo

1. Create repo at github.com/new
   - Name: `conbot5`
   - Private (recommended)
   - No template, no README (your files have one)

2. Push from local:
   ```bash
   cd /path/to/CONbot5
   git init
   git add .
   git commit -m "feat: CONbot5 Supreme v5.0 — initial"
   git remote add origin https://github.com/YOUR_USER/conbot5.git
   git branch -M main
   git push -u origin main
   ```

3. Repo structure Render expects:
   ```
   conbot5/
   ├── apps/
   │   ├── bot/src/index.js        ← Discord bot (worker)
   │   └── web/                    ← Vite web app (Cloudflare Pages)
   ├── services/
   │   ├── api/src/index.js        ← REST API (web service)
   │   └── ws/src/index.js         ← Socket.io WS (web service)
   ├── packages/
   │   ├── shared/                 ← Shared types
   │   └── ui/                     ← Glass design system
   ├── render.yaml                 ← Render IaC (all 3 services)
   └── .env.example
   ```

---

## PHASE 2 — Render Deployment (3 Services)

> render.yaml deploys all 3 at once. Alternatively, do each manually below.

### Option A — Blueprint (render.yaml, recommended)

1. Go to dashboard.render.com → New → Blueprint
2. Connect GitHub repo → select `conbot5`
3. Render reads render.yaml and creates:
   - `conbot5-bot`   (Background Worker, node, apps/bot)
   - `conbot5-api`   (Web Service, node, services/api) → auto-assigned URL
   - `conbot5-ws`    (Web Service, node, services/ws) → auto-assigned URL

4. After services create, go to each → Environment → Add env vars:

   **conbot5-bot (worker)**
   ```
   DISCORD_BOT_TOKEN       = <from Discord Dev Portal>
   DISCORD_CLIENT_ID       = <your app's client ID>
   DISCORD_GUILD_ID        = 1438103556610723922
   DJ_ROLE_ID              = <optional — DJ role snowflake>
   API_URL                 = https://conbot5-api.onrender.com
   API_BOT_TOKEN           = <generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   YOUTUBE_COOKIE          = <optional but strongly recommended — see .env.example>
   SPOTIFY_CLIENT_ID       = <optional>
   SPOTIFY_CLIENT_SECRET   = <optional>
   PULSE_INTERVAL          = 25000
   RECONNECT_DELAY         = 5000
   NODE_ENV                = production
   ```

   **conbot5-api (web service)**
   ```
   PORT                      = 10000
   API_BOT_TOKEN             = <same token as bot>
   DISCORD_CLIENT_ID         = <your app's client ID>
   DISCORD_CLIENT_SECRET     = <from Discord Dev Portal → OAuth2>
   DISCORD_ACTIVITY_REDIRECT = https://conbot5-api.onrender.com/activity/callback
   NODE_ENV                  = production
   ```

   **conbot5-ws (web service)**
   ```
   WS_PORT    = 10000
   API_URL    = https://conbot5-api.onrender.com
   NODE_ENV   = production
   ```

5. Force deploy each service: Manual Deploy → Deploy latest commit
6. Confirm health endpoints respond:
   - https://conbot5-api.onrender.com/health
   - https://conbot5-ws.onrender.com/health

### Option B — Manual (if render.yaml not used)

1. New → Background Worker → conbot5-bot
   - Runtime: Node
   - Root dir: apps/bot
   - Build: `npm install`
   - Start: `node src/index.js`

2. New → Web Service → conbot5-api
   - Runtime: Node
   - Root dir: services/api
   - Build: `npm install`
   - Start: `node src/index.js`
   - Health check: /health

3. New → Web Service → conbot5-ws
   - Runtime: Node
   - Root dir: services/ws
   - Build: `npm install`
   - Start: `node src/index.js`
   - Health check: /health

---

## PHASE 3 — Cloudflare Pages (Web Command Center)

1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect Git
2. Select `conbot5` repo → branch `main`
3. Build settings:
   - Framework: Vite
   - Build command: `npm run build:web`
   - Build output: `apps/web/dist`
   - Root dir: (leave empty)

4. Environment variables (Pages settings → Variables):
   ```
   VITE_API_URL     = https://conbot5-api.onrender.com
   VITE_WS_URL      = https://conbot5-ws.onrender.com
   VITE_GUILD_ID    = 1438103556610723922
   VITE_CLIENT_ID   = <your Discord app client ID>
   ```

5. Add `_headers` file to `apps/web/public/_headers` (see conbot5_additions/_headers)

6. Custom domain (optional):
   - Pages → Custom domains → Add `music.theconclavedominion.com`
   - Add CNAME in Cloudflare DNS: `music` → `conbot5.pages.dev`

7. After first deploy, note your Pages URL:
   `https://conbot5.pages.dev`

---

## PHASE 4 — Discord Developer Portal Setup

### 4.1 — Application basics

1. discord.com/developers/applications → select your bot app (or New Application → CONbot5)
2. General Information:
   - Name: CONbot5
   - Description: Supreme Music Intelligence Platform for The Conclave Dominion
   - Upload App Icon (512×512 min)
   - Privacy Policy URL: https://theconclavedominion.com/privacy (required for verification)
   - Terms of Service URL: https://theconclavedominion.com/terms (required for verification)

3. OAuth2 → General:
   - Add redirect URIs:
     ```
     https://conbot5-api.onrender.com/activity/callback
     https://conbot5-api.onrender.com/auth/discord/callback
     ```
   - Copy Client ID + Client Secret → add to Render conbot5-api env vars

4. Bot tab:
   - Reset token → copy → add to Render conbot5-bot as DISCORD_BOT_TOKEN
   - Enable: Presence Intent, Server Members Intent, Message Content Intent
   - Uncheck "Public Bot" if you want private-only

### 4.2 — Bot Verification (required for servers >100 members)

1. Left sidebar → App Verification
2. Complete the checklist — all items must be green:
   - Privacy Policy URL ✓ (set in step 4.1)
   - Terms of Service URL ✓
   - Identity verification via Stripe (you submit gov ID — Stripe holds it)
   - App must be in a Team (not solo account) — required for team-based verification
3. Create a Team if not done:
   - discord.com/developers/teams → New Team → CONbot5 Team
   - Transfer app ownership to team: App → Settings → Transfer to Team
4. Click "Verify App" once all items green
5. Review takes 1–5 business days

### 4.3 — Discord Activity (Embedded App — Launch Panel inside Discord)

> Activities let users open your web app as an iframe inside a voice channel

1. Left sidebar → Activities
2. Toggle Activities: ON
3. URL Mappings tab → Add mapping:
   - Prefix: `/`
   - Target: `https://conbot5.pages.dev` (or your Cloudflare Pages URL)
   - This routes `https://YOUR_APP_ID.discordsays.com/*` → your Cloudflare Pages app

4. Add second mapping for API:
   - Prefix: `/api`
   - Target: `https://conbot5-api.onrender.com`

5. Installation tab:
   - Install Link: Enable
   - Install Contexts: ☑ Guild Install, ☑ User Install
   - Default Install Settings → Scopes: `bot`, `applications.commands`
   - Bot Permissions: Connect, Speak, Use Voice Activity, Send Messages, Read Message History, Embed Links, Add Reactions

6. Entry Point Command (auto-created when Activities enabled):
   - Verify `/launch` command exists in Bot → Slash Commands
   - This is what users click in the App Launcher to open your Activity

7. Test Activity (before verification):
   - Activities only work in servers with <25 members while unverified
   - Add bot to a test server
   - Join voice channel → Rocket icon → Find CONbot5 → Launch

### 4.4 — Activity Verification (to go public)

1. App Verification → confirm base bot verification done first
2. Discovery tab appears after verification
3. Discovery Settings → fill:
   - Activity Name, description, screenshots (min 3), trailer video optional
   - Age restriction: No (unless your content warrants it)
   - Category: Music & Audio
   - Tags: music, bot, gaming, community
4. Discovery Status → Enable Discovery
5. Once enabled, Activity appears in App Launcher for all Discord users

---

## PHASE 5 — Bot Invite + Slash Command Registration

1. Invite bot to your server:
   - OAuth2 → URL Generator
   - Scopes: `bot`, `applications.commands`
   - Permissions: Administrator (or granular: Connect, Speak, Send Messages, Embed Links, Manage Messages, Read Message History, Add Reactions, Use Voice Activity)
   - Copy URL → paste in browser → select TheConclave Dominion

2. Register slash commands (bot does this on startup automatically via index.js)
   - If commands don't appear after invite, force register:
   ```bash
   # In apps/bot dir
   node -e "
   require('dotenv').config();
   const { REST, Routes } = require('discord.js');
   // commands array from index.js
   const rest = new REST({version:'10'}).setToken(process.env.DISCORD_BOT_TOKEN);
   rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), { body: [] })
     .then(()=>console.log('Commands cleared'))
   "
   ```
   - Then restart bot — it re-registers on boot

3. Verify in Discord: type `/` in any channel → CONbot5 commands should appear

---

## PHASE 6 — UptimeRobot (Keep Render alive)

Render free tier spins down after 15min inactivity. Fix it:

1. uptimerobot.com → Add Monitor
2. Type: HTTP(S)
3. URL: https://conbot5-api.onrender.com/health
4. Interval: 5 minutes
5. Repeat for conbot5-ws: https://conbot5-ws.onrender.com/health

---

## PHASE 7 — Launch Panel Integration (Conclave Dashboard)

To embed the Launch Panel in theconclavedominion.com:

```html
<!-- In any page that needs the music command panel -->
<script>
  window.CONBOT5_API_URL  = 'https://conbot5-api.onrender.com';
  window.CONBOT5_GUILD_ID = '1438103556610723922';
  window.CONBOT5_CLIENT_ID = 'YOUR_DISCORD_CLIENT_ID';
</script>
<!-- Inline or iframe the launch-panel.html -->
<iframe
  src="https://conbot5.pages.dev/launch-panel.html"
  style="width:100%;height:700px;border:none;border-radius:22px"
  allow="autoplay"
></iframe>
```

Or link directly from your nav: `https://conbot5.pages.dev`

---

## ENV VAR CHECKLIST (complete before first deploy)

| Var | Service | Source |
|-----|---------|--------|
| DISCORD_BOT_TOKEN | bot | Dev Portal → Bot → Reset Token |
| DISCORD_CLIENT_ID | bot, api | Dev Portal → General Info |
| DISCORD_CLIENT_SECRET | api | Dev Portal → OAuth2 |
| DISCORD_GUILD_ID | bot | Right-click server → Copy ID |
| API_BOT_TOKEN | bot, api | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| API_URL | bot | `https://conbot5-api.onrender.com` |
| DISCORD_ACTIVITY_REDIRECT | api | `https://conbot5-api.onrender.com/activity/callback` |
| YOUTUBE_COOKIE | bot | Browser DevTools → youtube.com cookies |
| VITE_API_URL | pages | `https://conbot5-api.onrender.com` |
| VITE_GUILD_ID | pages | 1438103556610723922 |
| VITE_CLIENT_ID | pages | your Discord client ID |

---

## ADDITIONAL FILES ADDED (conbot5_additions/)

| File | Location in repo | Purpose |
|------|-----------------|---------|
| `activity-token-route.js` | `services/api/src/activity.js` | Discord Activity OAuth2 token exchange |
| `launch-panel.html` | `apps/web/launch-panel.html` or `public/` | Full glass UI — Activity + standalone |
| `_headers` | `apps/web/public/_headers` | Cloudflare CSP + Discord iframe allowlist |
| `LAUNCH_GUIDE.md` | repo root | This file |

**Mount activity route in services/api/src/index.js:**
```js
const activity = require('./activity');
app.use('/activity', activity);
```

---

## DISCORD DESIGN SYSTEM RESOURCES (open-source, current 2025-26)

For extending CONbot5's visual system:

| Library | Use |
|---------|-----|
| `liquid-glass-react` (github.com/rdev) | Apple-spec liquid glass React components |
| `@discord/embedded-app-sdk` | Activity SDK — CDN or npm |
| Ein UI (ui.eindev.ir) | Shadcn-compatible liquid glass, dark-mode |
| shuding/liquid-glass | Pure JS+SVG filter implementation |
| liquidglass-kit.dev | Full developer toolkit, CSS + React |
| Framer Motion | Animation engine (already in stack) |
| Clash Display + DM Mono | Fonts (already in stack) |

---

*Generated: April 2026 — CONbot5 Supreme v5.0*
