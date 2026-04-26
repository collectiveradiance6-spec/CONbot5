# CONbot5 — Bot Fixes & Backend Setup
# ══════════════════════════════════════════════════════════════

## Fix 1: selfDeaf — Why there's no audio

The bot joins voice channels with `selfDeaf: true` by default in most boilerplates.
This tells Discord the bot is deafened — it won't output audio properly.

### Locate this in your bot code (usually `commands/play.js` or `utils/voice.js`):

```js
// ❌ BROKEN — bot is deafened, no audio
const connection = joinVoiceChannel({
  channelId: voiceChannel.id,
  guildId: guild.id,
  adapterCreator: guild.voiceAdapterCreator,
  selfDeaf: true,    // ← DELETE THIS or set to false
  selfMute: false,
});

// ✅ CORRECT
const connection = joinVoiceChannel({
  channelId: voiceChannel.id,
  guildId: guild.id,
  adapterCreator: guild.voiceAdapterCreator,
  selfDeaf: false,   // ← Audio works now
  selfMute: false,
});
```

If using discord-player, check your `Player` instantiation:
```js
// discord-player — add this option
const player = new Player(client, {
  ytdlOptions: { filter: 'audioonly', highWaterMark: 1 << 25 },
  connectionOptions: {
    selfDeaf: false,   // ← critical
    selfMute: false,
  },
});
```

If using Lavalink/Shoukaku/Kazagumo, the voice connection is handled differently.
Search your codebase for `selfDeaf` and ensure it's `false` everywhere.

---

## Fix 2: WebSocket API Server (Express + ws)

Add this to your bot's main server file (`server.js` or `api/index.js`):

```js
const express = require('express');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Track clients per guild
const guildClients = new Map(); // guildId → Set<ws>

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const userId  = params.get('userId');
  const guildId = params.get('guild');
  const isAdmin = params.get('admin') === 'true';

  if (!userId || !guildId) { ws.close(1008, 'Missing params'); return; }

  // Register client
  if (!guildClients.has(guildId)) guildClients.set(guildId, new Set());
  guildClients.get(guildId).add(ws);

  ws.guildId = guildId;
  ws.userId  = userId;
  ws.isAdmin = isAdmin;

  // Send initial state
  sendInitialState(ws, guildId);

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw);
      await handleClientMessage(ws, msg);
    } catch {}
  });

  ws.on('close', () => {
    guildClients.get(guildId)?.delete(ws);
  });
});

// Broadcast to all clients in a guild
function broadcast(guildId, data) {
  const clients = guildClients.get(guildId);
  if (!clients) return;
  const payload = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(payload);
  });
}

async function handleClientMessage(ws, msg) {
  const { op, guild_id } = msg;

  // ── Admin-only ops ──────────────────────────────────────────
  const adminOps = ['RESTART_BOT','CLEAR_ALL_QUEUES','LEAVE_ALL_VOICE','RESET_GUILD_CONFIG',
                    'SAVE_GUILD_CONFIG','FORCE_PLAY','UNDEAFEN','STREAM_LOGS'];
  if (adminOps.includes(op) && !ws.isAdmin) {
    ws.send(JSON.stringify({ op: 'ERROR', d: { message: 'Admin access required' } }));
    return;
  }

  const player = getPlayer(guild_id); // your Lavalink/discord-player instance for this guild

  switch (op) {
    case 'IDENTIFY':
    case 'IDENTIFY_ADMIN':
      sendInitialState(ws, guild_id);
      break;

    case 'HEARTBEAT':
      ws.send(JSON.stringify({ op: 'HEARTBEAT_ACK' }));
      break;

    case 'PLAY': {
      const guild = client.guilds.cache.get(guild_id);
      const member = guild.members.cache.get(ws.userId);
      if (!member?.voice?.channel) {
        ws.send(JSON.stringify({ op: 'ERROR', d: { message: 'You must be in a voice channel' } }));
        return;
      }
      // Join voice if not already — KEY FIX: selfDeaf: false
      if (!player.connected) {
        await player.connect(member.voice.channel, { selfDeaf: false, selfMute: false });
      }
      await player.play(msg.track || msg.query);
      break;
    }

    case 'PAUSE':     player?.pause();       break;
    case 'RESUME':    player?.resume();      break;
    case 'SKIP':      player?.skip();        break;
    case 'PREVIOUS':  player?.previous?.();  break;
    case 'STOP':      player?.stop();        break;

    case 'VOLUME':
      player?.setVolume(Math.min(150, Math.max(0, msg.volume ?? 70)));
      break;

    case 'SEEK':
      player?.seek(msg.position);
      break;

    case 'SHUFFLE_QUEUE':
    case 'SHUFFLE':
      player?.shuffle?.();
      broadcastQueueUpdate(guild_id);
      break;

    case 'CLEAR_QUEUE':
      player?.clearQueue?.();
      broadcastQueueUpdate(guild_id);
      break;

    case 'LOOP_TRACK':
      player?.setRepeatMode?.(msg.loop ? 'track' : 'off');
      break;

    case 'LOOP_QUEUE':
      player?.setRepeatMode?.(msg.loop ? 'queue' : 'off');
      break;

    case 'AUTOPLAY':
      player?.setAutoplay?.(msg.enabled);
      break;

    case 'SET_EQ':
      applyEQPreset(player, msg.preset);
      break;

    case 'JOIN_VOICE': {
      const guild = client.guilds.cache.get(guild_id);
      const member = guild.members.cache.get(ws.userId);
      if (!member?.voice?.channel) {
        ws.send(JSON.stringify({ op: 'ERROR', d: { message: 'Join a voice channel first' } }));
        return;
      }
      // selfDeaf: false is critical here
      await player?.connect?.(member.voice.channel, { selfDeaf: false, selfMute: false });
      broadcastVcUpdate(guild_id, member.voice.channel.name);
      break;
    }

    case 'LEAVE_VOICE':
      player?.disconnect?.();
      broadcastVcUpdate(guild_id, null);
      break;

    case 'UNDEAFEN': {
      // Force undeafen the bot in voice
      const guild = client.guilds.cache.get(guild_id);
      const botMember = guild.members.me;
      if (botMember?.voice?.channel) {
        await botMember.voice.setSelfDeaf(false);
        await botMember.voice.setSelfMute(false);
      }
      break;
    }

    case 'GET_BOT_INFO':
      sendBotInfo(ws, guild_id);
      break;

    case 'GET_MEMBERS':
      sendMembers(ws, guild_id);
      break;

    case 'SAVE_GUILD_CONFIG':
      // Save to your DB/KV store
      await saveConfig(guild_id, msg.config);
      broadcast(guild_id, { op: 'GUILD_CONFIG', d: msg.config });
      break;

    case 'FORCE_PLAY':
      if (!ws.isAdmin) return;
      await player?.play(msg.query, { force: true });
      break;

    case 'STREAM_LOGS':
      if (!ws.isAdmin) return;
      ws.streamLogs = true;
      break;

    case 'RUN_HEALTH_CHECKS':
      if (!ws.isAdmin) return;
      sendHealthChecks(ws, guild_id);
      break;
  }
}

function sendInitialState(ws, guildId) {
  const player = getPlayer(guildId);
  ws.send(JSON.stringify({
    op: 'PLAYER_UPDATE',
    d: {
      playing: player?.isPlaying ?? false,
      paused:  player?.paused ?? false,
      duration: player?.currentTrack?.duration ?? 0,
      position: player?.position ?? 0,
      queue: [],
      listeners: 0,
    }
  }));
  if (player?.currentTrack) {
    ws.send(JSON.stringify({ op: 'TRACK_START', d: player.currentTrack }));
  }
}

function sendBotInfo(ws, guildId) {
  const guild = client.guilds.cache.get(guildId);
  const botMember = guild?.members?.me;
  ws.send(JSON.stringify({
    op: 'BOT_INFO',
    d: {
      botId: client.user.id,
      ping: client.ws.ping,
      uptime: client.uptime,
      voiceChannel: botMember?.voice?.channel?.name ?? null,
      selfDeaf: botMember?.voice?.selfDeaf ?? false,
      lavalinkVersion: '4.x',
    }
  }));
}

async function sendMembers(ws, guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const members = [...guild.members.cache.values()].slice(0, 50).map(m => ({
    id: m.id,
    username: m.user.username,
    nick: m.nickname,
    topRole: m.roles.highest.name,
    inVoice: !!m.voice?.channel,
  }));
  ws.send(JSON.stringify({ op: 'MEMBERS', d: members }));
}

function sendHealthChecks(ws, guildId) {
  const guild = client.guilds.cache.get(guildId);
  const botMember = guild?.members?.me;
  ws.send(JSON.stringify({
    op: 'HEALTH_CHECKS',
    d: {
      gateway: client.ws.status === 0, // READY
      selfDeaf: botMember?.voice?.selfDeaf ?? null,
    }
  }));
}

function broadcastQueueUpdate(guildId) {
  const player = getPlayer(guildId);
  broadcast(guildId, {
    op: 'QUEUE_UPDATE',
    d: { tracks: player?.queue ?? [] }
  });
}

function broadcastVcUpdate(guildId, channelName) {
  broadcast(guildId, { op: 'VC_UPDATE', d: { channel: channelName } });
}

// ── EQ Presets (Lavalink filters) ──────────────────────────────
function applyEQPreset(player, preset) {
  const presets = {
    flat:      Array(14).fill({ gain: 0 }),
    bass:      [
      {band:0,gain:0.2},{band:1,gain:0.15},{band:2,gain:0.1},{band:3,gain:0.05},
      ...Array(10).fill({gain:0})
    ],
    nightcore: [
      ...Array(8).fill({gain:0}),
      {band:8,gain:0.1},{band:9,gain:0.15},{band:10,gain:0.2},
      {band:11,gain:0.25},{band:12,gain:0.3},{band:13,gain:0.35}
    ],
    vaporwave: [
      {band:0,gain:0.1},{band:1,gain:0.05},{band:2,gain:0},{band:3,gain:-0.05},
      {band:4,gain:-0.1},{band:5,gain:-0.05},{band:6,gain:0},{band:7,gain:0.05},
      ...Array(6).fill({gain:0})
    ],
    earrape:   Array(14).fill({ gain: 0.25 }),
  };
  player?.setEqualizer?.(presets[preset] || presets.flat);
}

// ── REST endpoints ──────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const { q, guild } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });
  try {
    // Use your player's search method
    const player = getPlayer(guild);
    const results = await player?.search?.(q, { requestedBy: null });
    res.json({ tracks: results?.tracks?.slice(0,10) ?? [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/command', express.json(), async (req, res) => {
  // Already validated by Worker
  const { op, guild_id, ...rest } = req.body;
  // Handle op...
  res.json({ ok: true });
});

// ── Broadcast player events to all WebSocket clients ───────────
// Hook into your player events:
//
// player.events.on('playerStart', (queue, track) => {
//   broadcast(queue.guild.id, { op: 'TRACK_START', d: formatTrack(track) });
//   broadcast(queue.guild.id, { op: 'PLAYER_UPDATE', d: { playing: true, paused: false, ... } });
// });
//
// player.events.on('playerEnd', (queue) => {
//   broadcast(queue.guild.id, { op: 'TRACK_END', d: {} });
// });
//
// player.events.on('playerError', (queue, error) => {
//   broadcast(queue.guild.id, { op: 'ERROR', d: { message: error.message } });
// });

function formatTrack(track) {
  return {
    title: track.title,
    author: track.author,
    duration: track.durationMS,
    thumbnail: track.thumbnail,
    url: track.url,
    sourceName: track.source,
  };
}

function getPlayer(guildId) {
  // Replace with your actual player getter
  // For discord-player: return client.player.nodes.get(guildId);
  // For Lavalink:       return client.manager.players.get(guildId);
  return null;
}

async function saveConfig(guildId, config) {
  // Save to your DB
  // e.g. await db.collection('guilds').updateOne({ id: guildId }, { $set: config });
}

server.listen(process.env.PORT || 3000, () => {
  console.log('CONbot5 API server running');
});

module.exports = { broadcast, broadcastQueueUpdate };
```

---

## Fix 3: Cloudflare Worker wrangler.toml

```toml
name = "conbot5-api"
main = "worker/index.js"
compatibility_date = "2024-01-01"

[vars]
GUILD_ID = "1438103556610723922"
BOT_API_URL = "https://conbot5.onrender.com"
BOT_WS_URL  = "wss://conbot5.onrender.com/ws"

# Set these as secrets (never in wrangler.toml):
# wrangler secret put DISCORD_CLIENT_ID
# wrangler secret put DISCORD_CLIENT_SECRET
# wrangler secret put DISCORD_BOT_TOKEN
# wrangler secret put ADMIN_ROLE_IDS
# wrangler secret put JWT_SECRET
```

---

## Fix 4: Cloudflare Pages — pages.json / _routes.json

Add `_redirects` to your public/ folder:
```
/callback  /index.html  200
/admin/*   /admin.html  200
```

---

## Summary of changes

| Issue                    | Fix                                              |
|--------------------------|--------------------------------------------------|
| Bot deafened             | `selfDeaf: false` in `joinVoiceChannel()`        |
| Web app can't play music | WebSocket bridge + bot API server (Fix 2)        |
| No auth gate             | Discord OAuth2 via Cloudflare Worker (Fix 3)     |
| Admin controls exposed   | Role-gated `/admin.html` + Worker auth check     |
| Buttons not working      | WS.send() → bot command handlers                |
| Cheap UI                 | Full Apple-level redesign in `index.html`        |
