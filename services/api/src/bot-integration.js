/**
 * ═══════════════════════════════════════════════════════════════════
 *  HOW TO WIRE server.js INTO YOUR EXISTING BOT
 *  bot-integration-example.js  — copy the relevant parts into your bot
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Your existing bot file probably looks something like this.
 *  Add the three marked sections below.
 */

const { Client, GatewayIntentBits } = require('discord.js');
const { Player }                     = require('discord-player');

// ── [ADD 1] Require the API server ──────────────────────────────
const { startApiServer } = require('./server'); // ← add this line

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,    // ← needed for member list in admin panel
  ],
});

const player = new Player(client, {
  // ── [ADD 2] Ensure selfDeaf is false in player defaults ─────
  ytdlOptions: {
    quality: 'highestaudio',
    filter:  'audioonly',
    highWaterMark: 1 << 25,
  },
  // This is the CRITICAL fix — never deafen the bot
  connectionOptions: {
    selfDeaf: false,   // ← THE FIX
    selfMute: false,
  },
});

// Load extractors (youtube, spotify, soundcloud, etc.)
// discord-player v6:
player.extractors.loadDefault().then(() => {
  console.log('Extractors loaded');
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  // ── [ADD 3] Start the API server after bot is ready ──────────
  startApiServer(client, player);
  // That's it. The server.js handles everything else automatically.
});

// ── Your existing command handling (unchanged) ──────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  // ... your slash command handlers ...
});

client.login(process.env.DISCORD_TOKEN);


/*
 * ─────────────────────────────────────────────────────────────
 *  ALSO FIX: anywhere you call joinVoiceChannel manually
 * ─────────────────────────────────────────────────────────────
 *
 *  Search your whole codebase for "joinVoiceChannel" and make sure
 *  every call has selfDeaf: false.
 *
 *  ❌ Before:
 *  joinVoiceChannel({
 *    channelId: vc.id,
 *    guildId: guild.id,
 *    adapterCreator: guild.voiceAdapterCreator,
 *    // selfDeaf defaults to true in many versions — be explicit:
 *  });
 *
 *  ✅ After:
 *  joinVoiceChannel({
 *    channelId: vc.id,
 *    guildId: guild.id,
 *    adapterCreator: guild.voiceAdapterCreator,
 *    selfDeaf: false,   // ← always explicit
 *    selfMute: false,
 *  });
 *
 *  Also check your play command — discord-player's play() takes
 *  nodeOptions.selfDeaf which we handle in server.js's PLAY handler.
 *
 * ─────────────────────────────────────────────────────────────
 *  RENDER: package.json scripts should include:
 * ─────────────────────────────────────────────────────────────
 *
 *  "scripts": {
 *    "start": "node index.js"     ← or whatever your main file is
 *  }
 *
 *  Render env vars to add:
 *    PORT             = 3001
 *    INTERNAL_SECRET  = (same value as wrangler secret INTERNAL_SECRET)
 *    GUILD_ID         = 1438103556610723922
 *
 *  Render → your service → Settings → make sure:
 *    Start Command = node index.js  (or npm start)
 *    Health Check Path = /api/health
 *
 * ─────────────────────────────────────────────────────────────
 *  STEP BY STEP DEPLOYMENT ORDER
 * ─────────────────────────────────────────────────────────────
 *
 *  1. Add server.js to your bot repo root
 *  2. npm install express ws cors   (in your bot repo)
 *  3. Add the three lines to bot.js (marked [ADD 1], [ADD 2], [ADD 3])
 *  4. Fix all selfDeaf → false throughout the codebase
 *  5. Add PORT, INTERNAL_SECRET, GUILD_ID to Render env vars
 *  6. Push to GitHub → Render auto-deploys
 *  7. Once bot is deployed, note your Render URL (e.g. https://conbot5.onrender.com)
 *  8. Update wrangler.toml BOT_API_URL and BOT_WS_URL with that URL
 *  9. cd worker && wrangler deploy
 * 10. Note your Worker URL (e.g. conbot5-api.YOUR_SUBDOMAIN.workers.dev)
 * 11. Update CONFIG in index.html + admin.html:
 *       API_BASE: 'https://conbot5-api.YOUR_SUBDOMAIN.workers.dev'
 *       WS_URL:   'wss://conbot5-api.YOUR_SUBDOMAIN.workers.dev/ws'
 * 12. Deploy index.html + admin.html to Cloudflare Pages
 * 13. Add redirect URI in Discord Dev Portal:
 *       https://conbot5.pages.dev/callback
 * 14. Fill in CLIENT_ID in index.html CONFIG block
 * 15. Test login flow
 */
