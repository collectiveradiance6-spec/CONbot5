# CONbot5 + AEGIS — Complete Deploy Guide
# GitHub → Render → Cloudflare → Discord Verification
# ═══════════════════════════════════════════════════════════════════════

---

## PHASE 0 — Prerequisites (Do these first)

```bash
# Verify Node 18+
node --version   # must be ≥ 18.0.0

# Generate API_BOT_TOKEN (shared secret between bot ↔ API)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Save this — you'll use it in multiple env vars
```

---

## PHASE 1 — GitHub

### 1A — Create the CONbot5 repo

1. Go to **github.com** → **New repository**
2. Name: `conbot5`
3. Private ✓, No template, No README
4. Click **Create repository**

### 1B — Push from local

```bash
cd /path/to/CONbot5   # your unzipped folder

git init
git add .
git commit -m "feat: CONbot5 Supreme v5.0 — initial"
git remote add origin https://github.com/YOUR_USERNAME/conbot5.git
git branch -M main
git push -u origin main
```

### 1C — Create the AEGIS repo (music removed)

```bash
# In your conclave-aegis-discord-core folder
# Replace bot.js with the new bot_no_music.js
cp bot_no_music.js bot.js

# Remove music.js — CONbot5 owns music now
rm music.js

# Also update package.json — remove music-related deps
# Remove: , @discordjs/opus, play-dl, ffmpeg-static, prism-media, libsodium-wrappers
# Those are now in CONbot5 only

git add .
git commit -m "feat: v10.2 — decouple music → CONbot5"
git push origin main
```

---

## PHASE 2 — Render Deployment

### 2A — CONbot5 Bot (Background Worker)

1. dash.render.com → **New** → **Background Worker**
2. Connect GitHub → select `conbot5`
3. Settings:
   - **Root Directory:** `apps/bot`
   - **Build:** `npm install`
   - **Start:** `node src/index.js`
   - **Plan:** Starter (upgrade to Standard for 24/7)

4. Environment Variables → Add all:

```
NODE_ENV                = production
BOT_PORT                = 3010
DISCORD_BOT_TOKEN       = [from Dev Portal → Bot → Reset Token]
DISCORD_CLIENT_ID       = [from Dev Portal → General Info → App ID]
DISCORD_GUILD_ID        = 1438103556610723922
DJ_ROLE_ID              = [optional — role snowflake, blank = everyone]
API_URL                 = https://conbot5-api.onrender.com  ← set after API deploys
API_BOT_TOKEN           = 
YOUTUBE_COOKIE          = 
SPOTIFY_CLIENT_ID       = 
SPOTIFY_CLIENT_SECRET   = 
PULSE_INTERVAL          = 25000
RECONNECT_DELAY         = 5000
```

### 2B — CONbot5 API (Web Service)

1. dash.render.com → **New** → **Web Service**
2. Connect GitHub → select `conbot5`
3. Settings:
   - **Root Directory:** `services/api`
   - **Build:** `npm install`
   - **Start:** `node src/index.js`
   - **Health Check Path:** `/health`
   - **Plan:** Starter

4. Environment Variables:
```
NODE_ENV      = production
PORT          = 10000
API_BOT_TOKEN = [same secret as above]
```

5. After deploy → copy the Render URL (e.g. `https://conbot5-api.onrender.com`)
6. Go back to the Bot service → update `API_URL` to this URL

### 2C — CONbot5 WebSocket (Web Service)

1. dash.render.com → **New** → **Web Service**
2. Connect GitHub → select `conbot5`
3. Settings:
   - **Root Directory:** `services/ws`
   - **Build:** `npm install`
   - **Start:** `node src/index.js`
   - **Health Check Path:** `/health`

4. Environment Variables:
```
NODE_ENV  = production
WS_PORT   = 10000
API_URL   = https://conbot5-api.onrender.com
```

### 2D — AEGIS Bot (Background Worker)

```
Build:  npm install
Start:  node bot.js
Plan:   Starter (already deployed — just push new bot.js)
```

Remove from AEGIS env vars (no longer needed):
- `MUSIC_RUNTIME_ENABLED`
- `MUSIC_FALLBACK_ENABLED`
- `MUSIC_API_URL`
- `MUSIC_DJ_ROLE_ID`
- `ROOM_PULSE_INTERVAL`
- `ROOM_RECONNECT_DELAY`
- `SPOTIFY_CLIENT_ID` (if only used for music)
- `YOUTUBE_COOKIE` (if only used for music)

### 2E — Keep Render Alive (UptimeRobot)

Render Starter plans sleep after 15 min. Fix for free:

1. Go to **uptimerobot.com** → New Monitor
2. Type: **HTTP(s)**
3. URL: `https://conbot5-api.onrender.com/health`
4. Interval: **5 minutes**
5. Repeat for: `https://conbot5-ws.onrender.com/health`

---

## PHASE 3 — Cloudflare Pages (Web Dashboard)

### 3A — Deploy Web Dashboard

1. **dash.cloudflare.com** → Workers & Pages → **Create** → **Pages** → **Connect to Git**
2. Select GitHub → select `conbot5` repo → branch `main`
3. Build settings:
   - **Framework:** None (Static HTML)
   - **Build command:** *(leave blank)*
   - **Build output:** `apps/web`
   - **Root directory:** *(leave blank)*
4. **Save and Deploy**

After deploy, your URL will be `https://conbot5.pages.dev`

### 3B — Custom Domain (optional)

1. Pages → **Custom domains** → Add `music.theconclavedominion.com`
2. In Cloudflare DNS → Add CNAME: `music` → `conbot5.pages.dev` (Proxy ON)
3. SSL/TLS → Full (strict)

### 3C — Access the Dashboard

```
https://conbot5.pages.dev?guild=1438103556610723922
```

Or open `apps/web/index.html` locally with the same ?guild= param for testing.

---

## PHASE 4 — Discord Developer Portal Setup

### 4A — Bot Application

1. Go to **discord.com/developers/applications**
2. Select your existing AEGIS bot app (or create new for CONbot5)
3. **Bot** tab:
   - Reset Token → copy → add to Render env
   - Enable: **Presence Intent** ✓, **Server Members Intent** ✓, **Message Content Intent** ✓
   - Public Bot: OFF (private guild bot)

4. **OAuth2** → General:
   - Add redirect URI: `https://conbot5-api.onrender.com/activity/callback`

5. **OAuth2** → URL Generator:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `8` (Administrator) or select manually:
     - View Channels, Send Messages, Embed Links, Attach Files
     - Manage Messages, Read Message History
     - Connect, Speak, Use Voice Activity
     - Manage Channels (]for monitor setup)
     - Manage Roles, Ban Members, Moderate Members
     - Add Reactions
   - Copy invite URL → paste in browser → invite to your server

6. **Installation** → Default Install Settings:
   - Scopes: `bot`, `applications.commands`

### 4B — Register Slash Commands

Commands register automatically on bot startup via `registerCommands()`.

To force re-register immediately:
```bash
cd apps/bot
DISCORD_BOT_TOKEN=xxx DISCORD_CLIENT_ID=xxx DISCORD_GUILD_ID=1438103556610723922 node -e "
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const rest = new REST({version:'10'}).setToken(process.env.DISCORD_BOT_TOKEN);
rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), {body:[]})
  .then(()=>console.log('Commands cleared — bot will re-register on next start'));
"
```

---

## PHASE 5 — Discord Bot Verification (for 100+ servers)

CONbot5 and AEGIS are guild-only bots for a single server, so verification is **optional** until you scale past 100 servers. But here's the complete process:

### 5A — Requirements Checklist

Before clicking Verify, all items must be green:

- [ ] **Privacy Policy URL** — `https://theconclavedominion.com/privacy`
- [ ] **Terms of Service URL** — `https://theconclavedominion.com/terms`
- [ ] **App must be in a Team** (not personal account)
- [ ] **Team owner must be 16+** with government ID
- [ ] Bot is in **less than 75 servers** (or already grew past that without verifying — still apply)

### 5B — Create a Developer Team

1. **discord.com/developers/teams** → **New Team**
2. Name: `CONbot5 Dev` or `Conclave Dev Team`
3. **Transfer app ownership** to team:
   - Your bot app → Settings → Transfer to Team → select your team

### 5C — Identity Verification (Stripe)

1. In your bot app → **App Verification** tab
2. Click **Start Verification**
3. You'll be redirected to **Stripe Identity**
4. Submit government-issued photo ID (driver's license, passport)
5. Wait for Stripe approval (usually hours, sometimes 1-2 days)

### 5D — Complete Verification Form

After Stripe approves:
1. Return to **App Verification** in Discord Dev Portal
2. Fill out the verification application form:
   - Bot description, use case, what data it collects
   - Describe how it uses each privileged intent
   - Server invite link for review (your test server)
3. Click **Submit**
4. Discord reviews within **1-5 business days**
5. You'll receive email at the team owner's address

### 5E — After Verification

- Your bot gets a blue ✓ verified checkmark in its tag
- Bot can now join more than 100 servers
- Bot is eligible for the **App Directory** listing

---

## PHASE 6 — Frontend Flush & Upgrade (theconclavedominion.com)

### 6A — Files to REMOVE from live site

These old files should be deleted or replaced:

```
OLD → DELETE:
- /music.html (if exists as standalone page)
- Any cached music-dashboard references

OLD → REPLACE with upgraded versions:
- index.html     → new liquid glass version
- ark.html       → upgraded server status embeds  
- Any page with embedded music widget → remove widget, add CONbot5 link
```

### 6B — Cloudflare Pages Flush (if site is on Cloudflare Pages)

1. **Cloudflare Dashboard** → Pages → your site
2. **Deployments** → Deploy latest commit (this wipes old files)
3. **Caching** → **Purge Cache** → **Purge Everything**

Or via CLI:
```bash
npx wrangler pages publish ./your-site-folder --project-name=theconclavedominion
```

### 6C — Cloudflare Cache Purge via API

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

### 6D — Add Music Button to Site

In any page that previously had music, add a link to CONbot5:

```html
<!-- Replace old music widget with this -->
<a href="https://conbot5.pages.dev?guild=1438103556610723922" 
   target="_blank"
   class="btn btn-primary">
  🎵 Open CONbot5 Music Center
</a>
```

---

## PHASE 7 — Verification Checklist

Run through these after full deploy:

```
BOT HEALTH
□ https://conbot5-api.onrender.com/health → returns {"status":"ok"}
□ https://conbot5-ws.onrender.com/health  → returns {"status":"ok"}
□ AEGIS bot health endpoint → {"version":"v10.2","music":"DECOUPLED"}

DISCORD COMMANDS
□ /play works in CONbot5 (music bot)
□ /wallet works in AEGIS (no music commands visible)
□ /aegis works for AI queries
□ /servers returns live cluster data
□ /order submits and creates DB record

WEB DASHBOARD
□ https://conbot5.pages.dev?guild=1438103556610723922 loads
□ Shows "CONNECTING" then "LIVE" status
□ Queue panel renders
□ Search works via /search endpoint
□ Genre browser loads 16 genres

CLOUDFLARE
□ theconclavedominion.com loads correctly
□ Old music pages removed or updated
□ Cache fully purged — no stale JS/CSS served

UPTIME ROBOT
□ API monitor pinging every 5 min
□ WS monitor pinging every 5 min
□ You receive alert emails if down
```

---

## ENVIRONMENT VARIABLE MASTER LIST

### CONbot5 Bot (apps/bot)
| Var | Required | Value |
|---|---|---|
| DISCORD_BOT_TOKEN | ✅ | From Dev Portal → Bot |
| DISCORD_CLIENT_ID | ✅ | From Dev Portal → General Info |
| DISCORD_GUILD_ID | ✅ | 1438103556610723922 |
| DJ_ROLE_ID | ❌ | Leave blank = everyone is DJ |
| API_URL | ✅ | Your Render API URL |
| API_BOT_TOKEN | ✅ | Generated random secret |
| YOUTUBE_COOKIE | ⚡ | Strongly recommended |
| SPOTIFY_CLIENT_ID | ❌ | Optional |
| SPOTIFY_CLIENT_SECRET | ❌ | Optional |

### CONbot5 API (services/api)
| Var | Required | Value |
|---|---|---|
| PORT | ✅ | 10000 (Render default) |
| API_BOT_TOKEN | ✅ | Same secret as above |
| NODE_ENV | ✅ | production |

### CONbot5 WS (services/ws)
| Var | Required | Value |
|---|---|---|
| WS_PORT | ✅ | 10000 |
| API_URL | ✅ | Your API Render URL |
| NODE_ENV | ✅ | production |

### AEGIS Bot (conclave-aegis-discord-core)
| Var | Keep | Notes |
|---|---|---|
| DISCORD_BOT_TOKEN | ✅ | |
| DISCORD_CLIENT_ID | ✅ | |
| DISCORD_GUILD_ID | ✅ | 1438103556610723922 |
| GROQ_API_KEY | ✅ | Free forever |
| SUPABASE_URL | ✅ | |
| SUPABASE_SERVICE_ROLE_KEY | ✅ | |
| AEGIS_CHANNEL_ID | ✅ | Auto-reply channel |
| ORDERS_CHANNEL_ID | ✅ | Order embeds |
| NITRADO_API_KEY | ✅ | Server monitor |
| MONITOR_STATUS_CHANNEL_ID | ✅ | After /monitor |
| MONITOR_MESSAGE_ID | ✅ | After /monitor |
| MUSIC_RUNTIME_ENABLED | ❌ | REMOVE — no longer needed |
| MUSIC_API_URL | ❌ | REMOVE — no longer needed |
| MUSIC_DJ_ROLE_ID | ❌ | REMOVE — no longer needed |
| YOUTUBE_COOKIE | ❌ | REMOVE from AEGIS |
| SPOTIFY_CLIENT_ID | ❌ | REMOVE from AEGIS |

---

## QUICK REFERENCE — Common Commands After Deploy

```bash
# Force command re-registration
node -e "require('./src/index.js')"  # bot registers on startup

# Check bot logs on Render
# Dashboard → conbot5-bot → Logs (real-time)

# Test API health
curl https://conbot5-api.onrender.com/health

# Test search proxy
curl "https://conbot5-api.onrender.com/search?q=lofi+hip+hop"

# Manual purge Cloudflare cache
# Cloudflare → Caching → Configuration → Purge Everything
```

