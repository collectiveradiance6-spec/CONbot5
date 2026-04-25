'use strict';
require('dotenv').config();

// Hard required
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!DISCORD_BOT_TOKEN) {
  console.error('FATAL: DISCORD_BOT_TOKEN missing');
  process.exit(1);
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_GUILD_ID  = process.env.DISCORD_GUILD_ID  || '';

if (!DISCORD_CLIENT_ID) console.warn('WARN: DISCORD_CLIENT_ID not set — command registration may fail');
if (!DISCORD_GUILD_ID)  console.warn('WARN: DISCORD_GUILD_ID not set — state sync disabled');

const BOT_PORT    = parseInt(process.env.BOT_PORT    || '3010', 10);
const API_URL     = (process.env.API_URL   || 'http://localhost:3020').replace(/\/$/, '');
const WS_URL      = (process.env.WS_URL    || 'http://localhost:3030').replace(/\/$/, '');
const API_BOT_TOKEN = process.env.API_BOT_TOKEN || 'conbot5-internal';
const DJ_ROLE_ID  = process.env.DJ_ROLE_ID  || null;
const HOME_GUILD_ID = process.env.HOME_GUILD_ID || '1438103556610723922';

module.exports = {
  DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_GUILD_ID,
  BOT_PORT,
  API_URL,
  WS_URL,
  API_BOT_TOKEN,
  DJ_ROLE_ID,
  HOME_GUILD_ID,
};
