# CONbot5 — Discord Activity Approval Checklist
# ═══════════════════════════════════════════════════════════════════════

## Step 1 — Developer Portal Setup

1. Go to **discord.com/developers/applications** → your bot app
2. Left sidebar → **Activities** → toggle **ON**
3. **URL Mappings** tab → Add:
   - Prefix: `/`  →  Target: `https://conbot5.pages.dev`
   - Prefix: `/api`  →  Target: `https://conbot5-api.onrender.com`
4. **Installation** tab:
   - Install Contexts: ☑ Guild Install, ☑ User Install
   - Bot Permissions: Connect, Speak, Use Voice Activity, Send Messages, Embed Links

## Step 2 — Required Redirect URIs

In **OAuth2 → General**, add:
```
https://conbot5-api.onrender.com/activity/callback
https://conbot5-api.onrender.com/activity/token
```

## Step 3 — Cloudflare Pages Headers (already in _headers)

The `apps/web/public/_headers` file already includes:
```
/launch-panel.html
  Content-Security-Policy: frame-ancestors https://discord.com ...
```

## Step 4 — Environment Variables Required

In `services/api` on Render:
```
DISCORD_CLIENT_ID       = your app client ID
DISCORD_CLIENT_SECRET   = your app client secret  
DISCORD_ACTIVITY_REDIRECT = https://conbot5-api.onrender.com/activity/callback
```

In Cloudflare Pages (build env):
```
VITE_CLIENT_ID = your Discord client ID
```

## Step 5 — Test Before Submission

1. Add bot to a test server (<25 members while unverified)
2. Join a voice channel
3. Click Rocket 🚀 icon → find CONbot5 → Launch
4. Verify launch-panel.html loads inside Discord
5. Verify `/api/token` endpoint works (check browser console for errors)

## Step 6 — Activity Verification Submission

1. Bot must be **base-verified** first (Dev Portal → App Verification)
2. After base verification → **Discovery** tab appears
3. Fill out:
   - Activity name: CONbot5 Music Center
   - Description: Real-time music control panel for The Conclave Dominion
   - Category: Music & Audio
   - Screenshots: min 3 (take them from your voice channel test)
   - Age restriction: No
4. Enable Discovery → submit for review
5. Review: 3–7 business days

## What the Activity Token Route Does

`services/api/src/activity.js` handles:
- `POST /activity/token` — exchanges Discord auth code for access token (never exposes client_secret to frontend)
- `GET /activity/callback` — OAuth2 redirect placeholder
- `GET /activity/me` — proxies @me lookup

The frontend (`launch-panel.html`) calls `POST /api/token` via the Discord proxy URL:
`https://YOUR_APP_ID.discordsays.com/.proxy/api/activity/token`
