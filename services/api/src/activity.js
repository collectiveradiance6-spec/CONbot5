// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — Discord Activity Token Exchange Route
// Location: services/api/src/activity.js
// ═══════════════════════════════════════════════════════════════════════
'use strict';
const express = require('express');
const router  = express.Router();

const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_ACTIVITY_REDIRECT } = process.env;

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
    const r = await fetch('https://discord.com/api/oauth2/token', {
      method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:params,
    });
    const data = await r.json();
    if (!r.ok) { console.error('[Activity] token error:', data); return res.status(400).json({ error:'token exchange failed', detail:data }); }
    return res.json({ access_token: data.access_token });
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

router.get('/callback', (req, res) => res.send('OK — Activity OAuth2 callback.'));

router.get('/me', async (req, res) => {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Bearer token required' });
  try {
    const r = await fetch('https://discord.com/api/users/@me', { headers:{ Authorization:auth } });
    return res.json(await r.json());
  } catch(err) { return res.status(500).json({ error: err.message }); }
});

module.exports = router;
