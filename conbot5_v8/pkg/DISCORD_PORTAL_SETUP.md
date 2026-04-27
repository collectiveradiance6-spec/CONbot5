# CONbot5 — Discord Developer Portal Setup Checklist
# collectiveradiance6-spec/CONbot5
# Run through this once — then it's done.

## 1. OAUTH2 → REDIRECTS
Add this exact URI (if not already listed):
  https://conbot5-api.onrender.com/auth/web/callback

Keep existing:
  https://conbot5.pages.dev/api/auth/discord/callback   ← used by _worker.js proxy
  https://conbot5.pages.dev/callback

## 2. INSTALLATION → DEFAULT INSTALL SETTINGS

Guild Install — Scopes (add BOTH):
  ✅ bot
  ✅ applications.commands

Guild Install — Bot Permissions (integer: 3214336):
  ✅ Connect         (voice)
  ✅ Speak           (voice)
  ✅ View Channels
  ✅ Send Messages
  ✅ Embed Links
  ✅ Read Message History
  ✅ Use Slash Commands
  ✅ Manage Messages  (for /clear)
  ✅ Add Reactions

User Install — Scopes:
  ✅ applications.commands

## 3. BOT → PRIVILEGED GATEWAY INTENTS (all ON)
  ✅ Presence Intent
  ✅ Server Members Intent
  ✅ Message Content Intent

## 4. ACTIVITIES → SETTINGS
  ✅ Enable Activities: ON
  Age Gate: OFF
  Supported Platforms: ✅ Web  ✅ iOS  ✅ Android

## 5. ACTIVITIES → URL MAPPINGS
Root Mapping:
  Prefix: /
  Target: conbot5.pages.dev

Proxy Path Mappings (click "Add Another URL Mapping"):
  Prefix: /api
  Target: conbot5-api.onrender.com

## 6. RENDER ENVIRONMENT VARIABLES (must all be set)
  DISCORD_BOT_TOKEN=<your bot token>
  DISCORD_CLIENT_ID=1496510504196116480
  DISCORD_CLIENT_SECRET=<from OAuth2 page — Reset Secret if needed>
  API_BOT_TOKEN=conbot5-internal
  HOME_GUILD_ID=1438103556610723922
  WEB_URL=https://conbot5.pages.dev
  YOUTUBE_COOKIE=<fresh cookie from browser>
  SPOTIFY_CLIENT_ID=<optional>
  SPOTIFY_CLIENT_SECRET=<optional>

## 7. CLOUDFLARE PAGES ENVIRONMENT VARIABLES
  CONBOT5_CLIENT_ID=1496510504196116480
  CONBOT5_GUILD_ID=1438103556610723922
  CONBOT5_API_URL=https://conbot5-api.onrender.com

## 8. DEPLOY ORDER
  1. Push musicEngine.js + api/src/index.js to GitHub
  2. Render auto-deploys bot + API
  3. Push apps/web/ to GitHub → Cloudflare Pages auto-deploys
  4. Test: visit https://conbot5.pages.dev → Sign in with Discord

## 9. OAUTH "INVALID FORM BODY" ROOT CAUSE (fixed)
Previous bug: frontend sent redirect_uri=https://conbot5-api.onrender.com/auth/web/callback
but that URL was NOT registered in Discord portal.

Fix applied:
  - _worker.js now proxies /api/* → Render
  - Frontend uses redirect_uri=https://conbot5.pages.dev/api/auth/discord/callback (registered ✅)
  - API's OAUTH_REDIRECT constant matches the registered URL exactly
  - discordPost() now uses Buffer.byteLength (not .length) for Content-Length header

## 10. BOT DEAFEN FIX
Previous bug: selfDeaf:true killed audio delivery. conn.subscribe() fired before Ready.

Fix applied:
  - selfDeaf: false
  - await entersState(conn, VoiceConnectionStatus.Ready, 15_000) before conn.subscribe()
  - Existing connection reused if healthy AND same channel
  - Stale connections explicitly destroyed before creating new one
