// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — DISCORD ACTIVITY TOKEN EXCHANGE ROUTE
// File: services/api/src/activity.js
// Mount in services/api/src/index.js:
//   const activity = require('./activity'); app.use('/activity', activity);
//
// Required env vars:
//   DISCORD_CLIENT_ID
//   DISCORD_CLIENT_SECRET
//   DISCORD_ACTIVITY_REDIRECT   (e.g. https://conbot5-api.onrender.com/activity/callback)
// ═══════════════════════════════════════════════════════════════════════
'use strict';

const express = require('express');
const router  = express.Router();

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_ACTIVITY_REDIRECT,
} = process.env;

// ── /activity/token ────────────────────────────────────────────────────
// Called by the Activity iframe via /.proxy/api/token or /api/token
// Receives the short-lived code from discordSdk.commands.authorize()
// Returns access_token to the frontend which then calls discordSdk.commands.authenticate()
router.post('/token', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  try {
    const params = new URLSearchParams({
      client_id:     DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  DISCORD_ACTIVITY_REDIRECT || 'http://localhost:3020/activity/callback',
    });

    const discordRes = await fetch('https://discord.com/api/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params,
    });

    const data = await discordRes.json();
    if (!discordRes.ok) {
      console.error('[Activity] token exchange failed:', data);
      return res.status(400).json({ error: 'token exchange failed', detail: data });
    }

    // Only forward access_token — never expose refresh_token or client_secret
    return res.json({ access_token: data.access_token });
  } catch (err) {
    console.error('[Activity] token route error:', err.message);
    return res.status(500).json({ error: 'internal error' });
  }
});

// ── /activity/callback ─────────────────────────────────────────────────
// OAuth2 redirect target — not used in Activity flow (Activities use code flow
// via discordSdk.commands.authorize), but required as a registered redirect URI.
router.get('/callback', (req, res) => {
  res.send('OK — Activity OAuth2 callback registered.');
});

// ── /activity/me ───────────────────────────────────────────────────────
// Proxy @me lookup so Activity iframe doesn't need direct Discord API access
router.get('/me', async (req, res) => {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Bearer token required' });

  try {
    const meRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: auth },
    });
    const data = await meRes.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
