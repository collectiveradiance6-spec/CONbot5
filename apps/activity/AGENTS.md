# CONbot5 / Futuristic Music Dashboard — Agent Instructions

## Mission
Upgrade CONbot5 into a Discord Activity music dashboard with:
1. A main Activity usable from any Discord voice channel.
2. Optional Vibe Rooms mapped per guild to specific voice channel IDs.
3. A performant liquid-glass music UI with day/night mode and room themes.
4. Backend APIs + WebSocket sync for room state, presence, playback, and settings.

## Core rule
Do not make Vibe Rooms replace the main activity.
The main activity must work in any voice channel.
Vibe Rooms are a second-layer enhancement for mapped themed channels.

## Conclave default Vibe Rooms
Use these only as default seed data for The Conclave guild, not global hardcoding:

- midnight-lofi: 🌙 Midnight Lo-Fi 🌙 — 1472492867451617411
- synthwave-lounge: 🌊 Synthwave Lounge 🌊 — 1498617184006443119
- ambient-void: 🌌 Ambient Void 🌌 — 1498617328768647228
- raid-prep-boss-fights: ⚔️ Raid Prep & Boss fights 😈 — 1438944767571398736
- party-room: 🎉 Party Room 🎉 — 1498617447442288681
- vgm-lounge: 🎮 VGM Lounge 🎮 — 1498617738527244319
- metal-forge: 🔥 Metal Forge 🔥 — 1498617972879523911
- chill-rnb: 💜 Chill R&B 💜 — 1498618065242296350

## Required architecture
- Frontend: React/Vite dashboard.
- Backend: Node/Express API.
- Realtime: WebSocket or Socket.IO.
- Database: Supabase for guild settings.
- Hosting: Cloudflare Pages for frontend, Render for backend.
- Do not introduce paid services unless unavoidable.

## Required database model
Create or verify a guild-specific Vibe Room settings table.

Required fields:
- guild_id
- room_key
- room_name
- voice_channel_id
- theme_key
- enabled
- created_at
- updated_at

Each guild must be able to map its own voice channel IDs.

## Required admin settings
Build an admin settings page where guild admins can:
- View all Vibe Room presets.
- Assign each preset to a voice channel.
- Enable/disable each room.
- Pick a theme per room.
- Save settings per guild.

## Runtime behavior
When activity loads:
1. Detect guild_id and current voice channel_id.
2. Load guild Vibe Room settings.
3. If current channel matches a mapped room, activate that room theme.
4. If no mapped room matches, run normal global activity mode.
5. Never block normal activity use because no room is mapped.

## Performance requirements
Fix current lag.
- No giant stacked fake-scroll pages.
- Use real routing/tabs.
- Use transform/opacity animations only.
- Avoid animating top/left/height.
- Limit blur layers.
- Background engine must use canvas/WebGL, not hundreds of DOM nodes.
- Do not re-render player state globally every tick.
- Isolate room state from global app state.

## UI requirements
- Liquid-glass panels.
- Day/night switcher.
- Room-specific themes.
- Compact Discord Activity layout.
- Full dashboard layout.
- Equalizer/audio visualizer area.
- Queue, now playing, room presence, controls.

## Files to inspect first
Before editing, inspect:
- package.json files
- apps/web or frontend app structure
- services/api or backend structure
- existing socket/music engine files
- existing env usage
- existing routing
- existing Supabase client

## Implementation order
1. Audit current file structure.
2. Identify frontend entry, backend entry, music engine, and settings storage.
3. Add data model/types for Vibe Rooms.
4. Add Supabase migration or SQL file.
5. Add backend endpoints:
   - GET /api/guilds/:guildId/vibe-rooms
   - PUT /api/guilds/:guildId/vibe-rooms
   - GET /api/activity/context
6. Add WebSocket room events:
   - activity:join
   - vibe:join
   - vibe:update
   - playback:update
   - presence:update
7. Add admin settings UI.
8. Add runtime room resolver.
9. Refactor UI routing/tabs for performance.
10. Add verification notes and test checklist.

## Done means
- App still works in any voice channel.
- Conclave defaults are available.
- Other guilds can configure their own voice channel IDs.
- Activity mode and Vibe Room mode are visually distinct.
- No major scroll lag.
- Build passes.
- Existing bot/backend behavior is not broken.
## Protected assets
The CONbot5 logo and official Conclave visual marks are protected assets.

Agents must not:
- regenerate them
- compress them
- redraw them
- merge them into the background
- alter spelling
- apply destructive CSS filters
- use mix-blend-mode
- use masking/clipping
- reduce opacity
- flatten into canvas/background images

All brand marks must be displayed through a dedicated ProtectedLogo component.
# CONbot5 Agent Rules

CONbot5 is a Discord Activity music dashboard. The logo is not the hero. The main hero is the right-side floating island / living audio-reactive world.

The main Activity must work in any Discord voice channel. Vibe Rooms are optional second-layer presets mapped per guild.

Use Cloudflare Pages for frontend, Render for backend, and Supabase for persistence.

Do not hardcode Conclave Vibe Room channel IDs globally. Use them only as seed defaults.

Do not put production localhost URLs in committed code.

All provider secrets must stay backend-only.