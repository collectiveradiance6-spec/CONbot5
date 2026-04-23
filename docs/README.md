# 🎵 CONbot5 — Supreme Music Intelligence v5.0

> **Surpasses Rythm in every dimension.** Multi-source, self-evolving, liquid glass UI, vote control, 500-track queue, 16 genres, 8 Mood Rooms, EQ, admin compression, real-time web + desktop dashboard.

---

## Architecture

```
CONbot5/
├── apps/
│   ├── bot/         Discord music bot — full command suite
│   ├── web/         Liquid glass web dashboard (SSE real-time)
│   └── desktop/     Electron desktop operator app
├── services/
│   ├── api/         REST + SSE state bridge
│   └── ws/          Socket.io real-time gateway
└── .env.example     All environment variables documented
```

---

## Quick Start

```bash
cp .env.example .env
# Fill in DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, API_BOT_TOKEN

# Install all
npm install

# Dev (all services)
npm run dev

# Or individual:
npm run start:bot    # Discord bot
npm run start:api    # API service
npm run start:ws     # WebSocket gateway
npm run start:web    # Web dashboard (http://localhost:5173?guild=YOUR_GUILD_ID)
npm run start:desktop # Desktop app
```

---

## Deploy to Render

1. Push to GitHub
2. Create services from `render.yaml`:
   - `conbot5-bot` → Background Worker
   - `conbot5-api` → Web Service
   - `conbot5-ws`  → Web Service
3. Set all env vars in Render Dashboard
4. Set `API_URL` in bot env to your `conbot5-api` Render URL

---

## Feature Matrix vs Rythm

| Feature | Rythm | CONbot5 |
|---|---|---|
| YouTube search | ✅ | ✅ Title search + 8 results picker |
| Spotify | ✅ | ✅ Track + playlist + album |
| SoundCloud | ✅ | ✅ |
| Queue size | 500 | **500** |
| History | Limited | **100 tracks** |
| Vote skip | ✅ | ✅ + requester instant skip |
| EQ presets | Basic | **5 presets** |
| Mood Rooms | ❌ | **8 Rooms — 24/7 autoplay** |
| Genre Browser | ❌ | **16 genres** |
| Web dashboard | ❌ | **✅ Real-time liquid glass** |
| Desktop app | ❌ | **✅ Electron operator** |
| Admin digest | ❌ | **✅ Compressed telemetry** |
| Auto-reconnect | Partial | **✅ Heartbeat watchdog** |
| Bot activity | Static | **✅ Updates to now playing** |
| All-member control | Limited | **✅ Voice members can add/vote** |

---

## Bot Commands

| Command | Description |
|---|---|
| `/play <name or URL>` | Play by title (shows 8-result picker) or URL |
| `/search <query>` | Search and pick |
| `/skip` | Skip / vote-skip |
| `/stop` | Stop everything |
| `/pause` / `/resume` | Pause/resume |
| `/np` | Now playing panel |
| `/queue [page]` | View queue |
| `/history` | View history |
| `/volume <0-100>` | Set volume |
| `/loop [track/queue/off]` | Loop modes |
| `/shuffle` | Toggle shuffle |
| `/autoplay` | Toggle AutoPlay |
| `/eq <preset>` | EQ preset |
| `/browse` | Genre browser |
| `/room <mood>` | 24/7 Mood Room |
| `/dashboard` | Live dashboard panel |
| `/launchpad` | Voice control panel |
| `/save <name>` | Save playlist |
| `/load <name>` | Load playlist |
| `/playlists` | List playlists |
| `/lyrics [query]` | Lyrics search |
| `/ping` | System status |
| `/help` | Command reference |
