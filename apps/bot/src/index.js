'use strict';
const http = require('http');
const { Client, GatewayIntentBits, REST, Routes, Events } = require('discord.js');
const env             = require('./config/env');
const { COMMANDS }    = require('./commands/registry');
const { registerRouter } = require('./interactions/router');
const { startApiSync }   = require('./bridge/apiSync');
const { startWebCommandPoll } = require('./bridge/webCommands');

// --- Discord client ---
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
  rest: { timeout: 15000 },
  allowedMentions: { parse: ['users', 'roles'], repliedUser: false },
});

// --- Command registration ---
async function registerCommands() {
  if (!env.DISCORD_CLIENT_ID) {
    console.warn('[Bot] CLIENT_ID missing — skipping command registration');
    return;
  }
  const rest = new REST().setToken(env.DISCORD_BOT_TOKEN);
  const body = COMMANDS.map(c => c.toJSON());
  try {
    if (env.DISCORD_GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), { body });
      console.log('[Bot] Registered ' + body.length + ' guild commands');
    } else {
      await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
      console.log('[Bot] Registered ' + body.length + ' global commands');
    }
  } catch (e) {
    console.error('[Bot] Command registration failed:', e.message);
  }
}

// --- Health server ---
const STATUS = { ready: false, readyAt: null };
http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(STATUS.ready ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status:    STATUS.ready ? 'ok' : 'starting',
      wsLatency: bot.ws.ping,
      uptime:    STATUS.readyAt ? Math.floor((Date.now() - STATUS.readyAt) / 1000) + 's' : '0s',
      heapMB:    Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      version:   'CONbot5 v6.0 Phoenix',
    }));
  } else {
    res.writeHead(404); res.end();
  }
}).listen(env.BOT_PORT, () => console.log('[Bot] Health: :' + env.BOT_PORT));

// --- Ready ---
bot.once(Events.ClientReady, async () => {
  STATUS.ready   = true;
  STATUS.readyAt = Date.now();
  console.log('[Bot] Online: ' + bot.user.tag + ' | Guild: ' + (env.DISCORD_GUILD_ID || 'global'));
  bot.user.setActivity('CONbot5 Supreme | /play', { type: 2 });
  await registerCommands();
  registerRouter(bot);
  startApiSync(bot);
  startWebCommandPoll(bot);
});

// --- Error guards ---
const IGNORE = ['Unknown interaction', 'Unknown Message', 'Missing Access', 'Cannot send', 'Unknown Channel', '429', 'rate limit'];
process.on('unhandledRejection', r => {
  const m = r?.message || String(r || '');
  if (!IGNORE.some(s => m.includes(s))) console.error('[Bot] Rejection:', m);
});
process.on('uncaughtException', (e, o) => console.error('[Bot] Exception [' + o + ']:', e.message));
process.on('SIGTERM', () => { bot.destroy(); setTimeout(() => process.exit(0), 2000); });

// --- Login with backoff ---
const BACKOFF = [5, 15, 30, 60, 120];
let attempt = 0;
async function login() {
  attempt++;
  try {
    await bot.login(env.DISCORD_BOT_TOKEN);
    attempt = 0;
  } catch (e) {
    const delay = BACKOFF[Math.min(attempt - 1, BACKOFF.length - 1)] * 1000;
    console.error('[Bot] Login attempt ' + attempt + ' failed: ' + e.message + ' — retry in ' + (delay / 1000) + 's');
    setTimeout(login, delay);
  }
}
login();

module.exports = bot;
