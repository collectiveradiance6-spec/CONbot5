# CONbot5 — System Architecture v5.0

## Overview

CONbot5 is a **supreme music intelligence platform** — a dedicated, self-evolving,
multi-surface music system that surpasses every commercial bot (Rythm, Groovy, Hydra)
in depth, UI quality, and administrative control.

## Services

| Service | Port | Role |
|---|---|---|
| `apps/bot`      | 3010 | Discord bot — commands, audio engine, voice |
| `services/api`  | 3020 | REST + SSE — state hub, search proxy, command queue |
| `services/ws`   | 3030 | Socket.io — real-time bidirectional gateway |
| `apps/web`      | 5173 | Liquid glass web dashboard |
| `apps/desktop`  | —    | Electron operator app |

## Data Flow

```
Discord Voice
    ↕
apps/bot  ──── (HTTP POST /state every 2s) ──→  services/api
    ↑                                                  ↓ (SSE stream)
    └──── (GET /commands every 2s) ──────────    apps/web
                                                 apps/desktop
                                                       ↓
                                               (POST /commands)
                                                       ↓
                                              services/api queue
                                                       ↓
                                           apps/bot polls & executes
```

## Engine Capabilities

- **Sources:** YouTube (title search + URL), Spotify (track + playlist + album), SoundCloud
- **Queue:** 500 tracks max, persistent across reconnects
- **History:** 100 tracks, browsable in UI
- **Vote skip:** 50% of voice members, or instant for DJ/requester
- **Mood Rooms:** 8 presets, 24/7 autoplay with watchdog reconnect
- **Genres:** 16 genres with curated search queries
- **EQ:** 5 presets with volume modifier engine
- **AutoPlay:** AI-similar track recommendation
- **Shuffle:** Fisher-Yates random queue reorder
- **Loop:** Track loop + queue loop modes

## UI Surfaces

### Web Dashboard (apps/web)
- Real-time via SSE events from API
- Full playback control panel
- Queue management (add, remove, reorder)
- Search with 8-result picker
- Genre browser + Mood Room selector
- EQ control
- Admin telemetry panel
- Liquid glass Apple-style hover panels

### Desktop App (apps/desktop)
- Electron wrapper around web dashboard
- System tray with quick controls
- Native menu bar with keyboard shortcuts
- Works offline from web server

### Discord Bot (apps/bot)
- Full slash command suite (27 commands)
- Interactive launchpad embed with buttons
- Live dashboard embed with progress bar
- Voice channel text panel
- All-member interaction (voice-gated)
- DJ role enforcement

## Self-Evolving Design

CONbot5 is designed to grow:

1. **Knowledge base:** Add Supabase `conbot5_knowledge` for AI context
2. **Redis:** Drop-in replacement for in-memory queue/state
3. **Lavalink:** Swap play-dl for Lavalink for enterprise-scale audio
4. **AI DJ:** Add OpenAI/Groq for intelligent track recommendations
5. **Lyrics:** Add Genius API key for real-time lyrics
6. **Analytics:** Add Grafana/Metabase connected to Supabase for usage intelligence
7. **Vector search:** Add pgvector for mood/genre similarity matching
