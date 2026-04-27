/**
 * ═══════════════════════════════════════════════════════════════════
 *  CONbot5  —  WebSocket + REST API Server
 *  File: server.js  (runs alongside your Discord bot on Render)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  This file creates the bridge between your web dashboard and the
 *  Discord bot. The Cloudflare Worker connects here via WebSocket.
 *
 *  SETUP:
 *    1.  npm install express ws cors dotenv
 *    2.  Add to your .env (or Render env vars):
 *          PORT=3001
 *          INTERNAL_SECRET=any_long_random_string_here
 *          GUILD_ID=1438103556610723922
 *    3.  In your main bot file (index.js / bot.js), add at the bottom:
 *          const { startApiServer } = require('./server');
 *          startApiServer(client, player);
 *          // where `player` is your discord-player Player instance
 *    4.  In Render → your service → Environment → add those vars
 *
 *  HOW IT CONNECTS:
 *    Browser ──→ Cloudflare Worker (handles auth) ──→ THIS FILE (WebSocket)
 *                                                 ──→ THIS FILE (REST /api/*)
 *
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

require('dotenv').config();

const express    = require('express');
const { createServer } = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const cors       = require('cors');

// ── These are injected when startApiServer() is called ─────────
let _client = null;   // discord.js Client
let _player = null;   // discord-player Player  (or null if using Lavalink)

// ── Guild config store (in-memory; swap for DB if you want persistence) ──
const guildConfigs = new Map();

// ── WebSocket client registry: guildId → Set<AnnotatedWebSocket> ──
const guildClients = new Map();

// ── Log buffer (last 200 lines) ────────────────────────────────
const logBuffer = [];
const MAX_LOGS  = 200;


// ═══════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Broadcast a JSON payload to every connected WebSocket for a guild.
 * @param {string} guildId
 * @param {object} data
 * @param {boolean} [adminOnly=false]  – only send to admin connections
 */
function broadcast(guildId, data, adminOnly = false) {
  const clients = guildClients.get(guildId);
  if (!clients || clients.size === 0) return;
  const payload = JSON.stringify(data);
  for (const ws of clients) {
    if (adminOnly && !ws.isAdmin) continue;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/** Push a log line to buffer + broadcast to any admin clients streaming logs */
function pushLog(level, message, guildId = null) {
  const entry = { ts: Date.now(), level, message };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();

  const payload = JSON.stringify({ op: 'LOG', d: entry });
  // Broadcast to all guilds' admin clients who opted in to log streaming
  for (const [gid, clients] of guildClients) {
    if (guildId && gid !== guildId) continue;
    for (const ws of clients) {
      if (ws.isAdmin && ws.streamLogs && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }
}

/** Get the discord-player queue node for a guild */
function getNode(guildId) {
  if (!_player) return null;
  // discord-player v6
  return _player.nodes?.get(guildId) ?? null;
}

/** Format a discord-player Track into the shape the frontend expects */
function formatTrack(track) {
  if (!track) return null;
  return {
    title:      track.title      ?? 'Unknown',
    author:     track.author     ?? 'Unknown',
    duration:   track.durationMS ?? 0,
    thumbnail:  track.thumbnail  ?? null,
    url:        track.url        ?? '',
    sourceName: track.source     ?? 'unknown',
    requestedBy: track.requestedBy?.username ?? null,
  };
}

/** Format a full queue snapshot */
function formatQueue(node) {
  if (!node) return [];
  return node.tracks.toArray().map(formatTrack);
}

/** Format milliseconds → "m:ss" */
function fmtDur(ms) {
  if (!ms || ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Get default config for a guild */
function getConfig(guildId) {
  if (!guildConfigs.has(guildId)) {
    guildConfigs.set(guildId, {
      autoplay:         false,
      djMode:           false,
      nsfw:             false,
      mode247:          false,
      selfDeaf:         false,   // ← always false by default (the main fix)
      maxQueue:         0,
      maxDuration:      0,
      maxTracksPerUser: 5,
      defaultVolume:    70,
      musicChannelId:   null,
      logChannelId:     null,
      defaultVcId:      null,
      adminRoleIds:     [],
      djRoleIds:        [],
    });
  }
  return guildConfigs.get(guildId);
}


// ═══════════════════════════════════════════════════════════════
//  PLAYER STATE BROADCAST HELPERS
// ═══════════════════════════════════════════════════════════════

function broadcastPlayerUpdate(guildId) {
  const node    = getNode(guildId);
  const guild   = _client?.guilds.cache.get(guildId);
  const botMem  = guild?.members?.me;
  const vcSize  = botMem?.voice?.channel?.members?.size ?? 0;

  broadcast(guildId, {
    op: 'PLAYER_UPDATE',
    d: {
      playing:  node?.isPlaying() ?? false,
      paused:   node?.node?.state?.status === 'paused' ?? false,
      duration: node?.current?.durationMS ?? 0,
      position: node?.streamTime ?? 0,
      volume:   node?.volume ?? 70,
      queue:    formatQueue(node),
      listeners: Math.max(0, vcSize - 1), // subtract the bot itself
      currentTrack: formatTrack(node?.current),
    },
  });
}

function broadcastTrackStart(guildId, track) {
  broadcast(guildId, { op: 'TRACK_START', d: formatTrack(track) });
  broadcastPlayerUpdate(guildId);
}

function broadcastTrackEnd(guildId) {
  broadcast(guildId, { op: 'TRACK_END', d: {} });
}

function broadcastQueueUpdate(guildId) {
  const node = getNode(guildId);
  broadcast(guildId, {
    op: 'QUEUE_UPDATE',
    d: { tracks: formatQueue(node) },
  });
}

function broadcastVcUpdate(guildId, channelName) {
  broadcast(guildId, { op: 'VC_UPDATE', d: { channel: channelName } });
}

function broadcastStats(guildId) {
  const guild  = _client?.guilds.cache.get(guildId);
  const botMem = guild?.members?.me;
  const vcSize = botMem?.voice?.channel?.members?.size ?? 0;
  broadcast(guildId, {
    op: 'STATS',
    d: {
      listeners: Math.max(0, vcSize - 1),
      ping:      _client?.ws?.ping ?? 0,
      uptime:    _client?.uptime ?? 0,
    },
  });
}


// ═══════════════════════════════════════════════════════════════
//  INCOMING MESSAGE HANDLER  (from browser via Worker)
// ═══════════════════════════════════════════════════════════════

async function handleMessage(ws, msg) {
  const { op, guild_id } = msg;
  if (!op)        return sendError(ws, 'Missing op');
  if (!guild_id)  return sendError(ws, 'Missing guild_id');

  // ── Admin-only ops ──────────────────────────────────────────
  const ADMIN_OPS = new Set([
    'RESTART_BOT', 'CLEAR_ALL_QUEUES', 'LEAVE_ALL_VOICE',
    'RESET_GUILD_CONFIG', 'SAVE_GUILD_CONFIG', 'FORCE_PLAY',
    'UNDEAFEN', 'STREAM_LOGS', 'RUN_HEALTH_CHECKS',
    'GET_MEMBERS', 'GET_BOT_INFO',
  ]);

  if (ADMIN_OPS.has(op) && !ws.isAdmin) {
    return sendError(ws, 'Admin access required');
  }

  const node   = getNode(guild_id);
  const guild  = _client?.guilds.cache.get(guild_id);
  const config = getConfig(guild_id);

  pushLog('info', `[WS] op=${op} user=${ws.userId} guild=${guild_id}`);

  switch (op) {

    // ── Handshake ─────────────────────────────────────────────
    case 'IDENTIFY':
    case 'IDENTIFY_ADMIN':
      sendInitialState(ws, guild_id);
      break;

    case 'HEARTBEAT':
      safeSend(ws, { op: 'HEARTBEAT_ACK' });
      break;

    // ── Playback ──────────────────────────────────────────────
    case 'PLAY': {
      const query = msg.track || msg.query;
      if (!query) return sendError(ws, 'Missing track/query');

      // User must be in a voice channel
      const member = guild?.members.cache.get(ws.userId);
      const vc     = member?.voice?.channel;
      if (!vc) return sendError(ws, 'Join a voice channel first');

      // Queue limit check
      if (config.maxQueue > 0 && node && node.tracks.size >= config.maxQueue) {
        return sendError(ws, `Queue is full (max ${config.maxQueue})`);
      }

      try {
        const result = await _player.play(vc, query, {
          nodeOptions: {
            metadata: { channel: null },
            selfDeaf: false,  // ← THE FIX
            selfMute: false,
            volume:   config.defaultVolume ?? 70,
            leaveOnEmpty: !config.mode247,
            leaveOnEmptyCooldown: 60000,
            leaveOnEnd: !config.mode247,
          },
        });

        if (!result?.track) return sendError(ws, 'Track not found');

        safeSend(ws, { op: 'PLAY_ACK', d: { track: formatTrack(result.track) } });
        broadcastQueueUpdate(guild_id);
        pushLog('success', `Playing: ${result.track.title}`);
      } catch (e) {
        pushLog('error', `Play error: ${e.message}`);
        return sendError(ws, `Play failed: ${e.message}`);
      }
      break;
    }

    case 'PAUSE': {
      if (!node?.isPlaying()) return sendError(ws, 'Nothing is playing');
      node.node.pause();
      broadcastPlayerUpdate(guild_id);
      break;
    }

    case 'RESUME': {
      if (!node) return sendError(ws, 'No active player');
      node.node.resume();
      broadcastPlayerUpdate(guild_id);
      break;
    }

    case 'SKIP': {
      if (!node?.isPlaying()) return sendError(ws, 'Nothing to skip');
      node.skip();
      // TRACK_START will fire via player event
      break;
    }

    case 'PREVIOUS': {
      if (!node) return sendError(ws, 'No active player');
      // discord-player v6 history
      const history = node.history;
      if (!history || history.isEmpty()) return sendError(ws, 'No previous track');
      await history.back();
      break;
    }

    case 'STOP': {
      if (!node) return sendError(ws, 'No active player');
      node.delete();
      broadcastTrackEnd(guild_id);
      broadcastQueueUpdate(guild_id);
      break;
    }

    case 'SEEK': {
      const pos = parseInt(msg.position);
      if (isNaN(pos)) return sendError(ws, 'Invalid position');
      if (!node?.isPlaying()) return sendError(ws, 'Nothing is playing');
      node.node.seek(pos);
      break;
    }

    case 'VOLUME': {
      const vol = Math.min(200, Math.max(0, parseInt(msg.volume ?? 70)));
      if (!node) return sendError(ws, 'No active player');
      node.setVolume(vol);
      broadcastPlayerUpdate(guild_id);
      break;
    }

    case 'SHUFFLE':
    case 'SHUFFLE_QUEUE': {
      if (!node || node.tracks.size === 0) return sendError(ws, 'Queue is empty');
      node.tracks.shuffle();
      broadcastQueueUpdate(guild_id);
      safeSend(ws, { op: 'SHUFFLE_ACK' });
      break;
    }

    case 'CLEAR_QUEUE': {
      if (!node) return sendError(ws, 'No active player');
      node.tracks.clear();
      broadcastQueueUpdate(guild_id);
      break;
    }

    case 'LOOP_TRACK': {
      if (!node) return sendError(ws, 'No active player');
      // QueueRepeatMode: 0=OFF, 1=TRACK, 2=QUEUE, 3=AUTOPLAY
      const { QueueRepeatMode } = require('discord-player');
      node.setRepeatMode(msg.loop ? QueueRepeatMode.TRACK : QueueRepeatMode.OFF);
      broadcastPlayerUpdate(guild_id);
      break;
    }

    case 'LOOP_QUEUE': {
      if (!node) return sendError(ws, 'No active player');
      const { QueueRepeatMode } = require('discord-player');
      node.setRepeatMode(msg.loop ? QueueRepeatMode.QUEUE : QueueRepeatMode.OFF);
      broadcastPlayerUpdate(guild_id);
      break;
    }

    case 'AUTOPLAY': {
      if (!node) return sendError(ws, 'No active player');
      const { QueueRepeatMode } = require('discord-player');
      node.setRepeatMode(msg.enabled ? QueueRepeatMode.AUTOPLAY : QueueRepeatMode.OFF);
      config.autoplay = msg.enabled;
      broadcastPlayerUpdate(guild_id);
      break;
    }

    case 'JUMP': {
      const idx = parseInt(msg.index);
      if (isNaN(idx)) return sendError(ws, 'Invalid index');
      if (!node) return sendError(ws, 'No active player');
      node.node.jump(idx);
      break;
    }

    case 'SET_EQ': {
      if (!node) return sendError(ws, 'No active player');
      applyEQPreset(node, msg.preset);
      safeSend(ws, { op: 'EQ_ACK', d: { preset: msg.preset } });
      break;
    }

    // ── Voice ─────────────────────────────────────────────────
    case 'JOIN_VOICE': {
      const member = guild?.members.cache.get(ws.userId);
      const vc     = member?.voice?.channel;
      if (!vc) return sendError(ws, 'You must be in a voice channel to invite the bot');

      const { joinVoiceChannel } = require('@discordjs/voice');
      joinVoiceChannel({
        channelId:       vc.id,
        guildId:         guild_id,
        adapterCreator:  guild.voiceAdapterCreator,
        selfDeaf:        false,  // ← THE FIX
        selfMute:        false,
      });

      broadcastVcUpdate(guild_id, vc.name);
      safeSend(ws, { op: 'VC_JOINED', d: { channel: vc.name } });
      pushLog('info', `Joined voice: ${vc.name}`);
      break;
    }

    case 'LEAVE_VOICE': {
      if (!node) {
        // Try to disconnect via @discordjs/voice directly
        const { getVoiceConnection } = require('@discordjs/voice');
        getVoiceConnection(guild_id)?.destroy();
      } else {
        node.delete();
      }
      broadcastVcUpdate(guild_id, null);
      pushLog('info', `Left voice channel`);
      break;
    }

    case 'UNDEAFEN': {
      // Force the bot to undeafen itself in voice
      const botMember = guild?.members?.me;
      if (!botMember?.voice?.channel) return sendError(ws, 'Bot is not in a voice channel');
      try {
        await botMember.voice.setDeaf(false);
        await botMember.voice.setMute(false);
        broadcast(guild_id, {
          op: 'BOT_INFO',
          d: { selfDeaf: false, selfMute: false },
        }, true);
        pushLog('success', 'Bot undeafened successfully');
        safeSend(ws, { op: 'UNDEAFEN_ACK' });
      } catch (e) {
        return sendError(ws, 'Undeafen failed: ' + e.message);
      }
      break;
    }

    // ── Admin: Info ───────────────────────────────────────────
    case 'GET_BOT_INFO': {
      const botMember = guild?.members?.me;
      const vc        = botMember?.voice?.channel;
      safeSend(ws, {
        op: 'BOT_INFO',
        d: {
          botId:           _client?.user?.id ?? '—',
          ping:            _client?.ws?.ping ?? 0,
          uptime:          _client?.uptime ?? 0,
          voiceChannel:    vc?.name ?? null,
          voiceChannelId:  vc?.id   ?? null,
          selfDeaf:        botMember?.voice?.selfDeaf  ?? false,
          selfMute:        botMember?.voice?.selfMute  ?? false,
          guildName:       guild?.name ?? '—',
          memberCount:     guild?.memberCount ?? 0,
          lavalinkVersion: 'discord-player v6',
        },
      });
      break;
    }

    case 'GET_MEMBERS': {
      const members = guild?.members.cache;
      if (!members) return safeSend(ws, { op: 'MEMBERS', d: [] });

      const list = [...members.values()].slice(0, 50).map(m => ({
        id:       m.id,
        username: m.user.username,
        nick:     m.nickname ?? null,
        avatar:   m.user.avatar,
        topRole:  m.roles.highest.name,
        inVoice:  !!m.voice?.channel,
        vcName:   m.voice?.channel?.name ?? null,
        bot:      m.user.bot,
      }));

      safeSend(ws, { op: 'MEMBERS', d: list });
      break;
    }

    case 'GET_ROLES': {
      const roles = guild?.roles.cache;
      if (!roles) return safeSend(ws, { op: 'ROLES', d: [] });

      const list = [...roles.values()]
        .filter(r => r.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position }));

      safeSend(ws, { op: 'ROLES', d: list });
      break;
    }

    // ── Admin: Config ─────────────────────────────────────────
    case 'SAVE_GUILD_CONFIG': {
      if (!msg.config) return sendError(ws, 'Missing config');

      const allowed = [
        'autoplay','djMode','nsfw','mode247','selfDeaf',
        'maxQueue','maxDuration','maxTracksPerUser','defaultVolume',
        'musicChannelId','logChannelId','defaultVcId',
        'adminRoleIds','djRoleIds',
      ];

      const current = getConfig(guild_id);
      for (const key of allowed) {
        if (msg.config[key] !== undefined) {
          current[key] = msg.config[key];
        }
      }

      broadcast(guild_id, { op: 'GUILD_CONFIG', d: current });
      safeSend(ws, { op: 'SAVE_CONFIG_ACK' });
      pushLog('info', `Guild config saved by ${ws.userId}`);
      break;
    }

    case 'GET_GUILD_CONFIG': {
      safeSend(ws, { op: 'GUILD_CONFIG', d: getConfig(guild_id) });
      break;
    }

    case 'RESET_GUILD_CONFIG': {
      guildConfigs.delete(guild_id);
      const fresh = getConfig(guild_id);
      broadcast(guild_id, { op: 'GUILD_CONFIG', d: fresh }, true);
      pushLog('warn', `Guild config RESET by ${ws.userId}`);
      break;
    }

    // ── Admin: Danger zone ────────────────────────────────────
    case 'FORCE_PLAY': {
      const query = msg.query;
      if (!query) return sendError(ws, 'Missing query');

      // Find a voice channel — bot stays where it is or joins first available
      const botMember = guild?.members?.me;
      let vc = botMember?.voice?.channel;

      if (!vc) {
        // Join first voice channel with members
        vc = guild?.channels.cache.find(
          c => c.type === 2 /* VoiceChannel */ && c.members.size > 0
        ) ?? null;
      }

      if (!vc) return sendError(ws, 'No usable voice channel found');

      try {
        const result = await _player.play(vc, query, {
          nodeOptions: {
            selfDeaf: false,
            selfMute: false,
            volume: getConfig(guild_id).defaultVolume,
          },
        });
        broadcastQueueUpdate(guild_id);
        safeSend(ws, { op: 'FORCE_PLAY_ACK', d: { track: formatTrack(result.track) } });
        pushLog('warn', `FORCE_PLAY: ${result.track.title} by admin ${ws.userId}`);
      } catch (e) {
        return sendError(ws, 'Force play failed: ' + e.message);
      }
      break;
    }

    case 'CLEAR_ALL_QUEUES': {
      for (const [gid] of guildClients) {
        const n = getNode(gid);
        n?.tracks.clear();
        broadcastQueueUpdate(gid);
      }
      pushLog('warn', `ALL queues cleared by admin ${ws.userId}`);
      break;
    }

    case 'LEAVE_ALL_VOICE': {
      const { getVoiceConnection } = require('@discordjs/voice');
      for (const [gid] of guildClients) {
        getNode(gid)?.delete();
        getVoiceConnection(gid)?.destroy();
        broadcastVcUpdate(gid, null);
      }
      pushLog('warn', `Bot disconnected from ALL voice channels by admin ${ws.userId}`);
      break;
    }

    case 'RESTART_BOT': {
      pushLog('warn', `BOT RESTART triggered by admin ${ws.userId}`);
      // Broadcast to all clients so UIs show disconnecting
      for (const [gid] of guildClients) {
        broadcast(gid, { op: 'BOT_RESTARTING' });
      }
      // Give time for message to send, then exit
      // (Render will auto-restart the process)
      setTimeout(() => process.exit(0), 1500);
      break;
    }

    // ── Admin: Logs / Diagnostics ─────────────────────────────
    case 'STREAM_LOGS': {
      ws.streamLogs = true;
      // Send buffered logs immediately
      for (const entry of logBuffer) {
        safeSend(ws, { op: 'LOG', d: entry });
      }
      break;
    }

    case 'STOP_LOGS': {
      ws.streamLogs = false;
      break;
    }

    case 'RUN_HEALTH_CHECKS': {
      const botMember  = guild?.members?.me;
      const selfDeaf   = botMember?.voice?.selfDeaf ?? false;
      const gatewayOk  = _client?.ws?.status === 0; // 0 = READY

      safeSend(ws, {
        op: 'HEALTH_RESULTS',
        d: {
          gateway:    { pass: gatewayOk,   label: gatewayOk ? 'PASS' : 'FAIL — gateway not ready' },
          selfDeaf:   { pass: !selfDeaf,   label: selfDeaf ? 'FAIL — bot is deafened' : 'PASS' },
          playerLib:  { pass: !!_player,   label: _player  ? 'PASS' : 'FAIL — player not initialized' },
          guildFound: { pass: !!guild,     label: guild    ? 'PASS' : 'FAIL — guild not cached' },
        },
      });
      break;
    }

    default:
      sendError(ws, `Unknown op: ${op}`);
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function safeSend(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function sendError(ws, message) {
  safeSend(ws, { op: 'ERROR', d: { message } });
}

function sendInitialState(ws, guildId) {
  const node     = getNode(guildId);
  const guild    = _client?.guilds.cache.get(guildId);
  const botMem   = guild?.members?.me;
  const vcSize   = botMem?.voice?.channel?.members?.size ?? 0;
  const config   = getConfig(guildId);

  // Player state
  safeSend(ws, {
    op: 'PLAYER_UPDATE',
    d: {
      playing:      node?.isPlaying() ?? false,
      paused:       false,
      duration:     node?.current?.durationMS ?? 0,
      position:     node?.streamTime ?? 0,
      volume:       node?.volume ?? config.defaultVolume,
      queue:        formatQueue(node),
      listeners:    Math.max(0, vcSize - 1),
      currentTrack: formatTrack(node?.current),
    },
  });

  // Current track (if any)
  if (node?.current) {
    safeSend(ws, { op: 'TRACK_START', d: formatTrack(node.current) });
  }

  // Queue
  safeSend(ws, { op: 'QUEUE_UPDATE', d: { tracks: formatQueue(node) } });

  // VC status
  safeSend(ws, {
    op: 'VC_UPDATE',
    d: { channel: botMem?.voice?.channel?.name ?? null },
  });

  // Guild config (admin gets full config)
  if (ws.isAdmin) {
    safeSend(ws, { op: 'GUILD_CONFIG', d: config });
  }
}


// ═══════════════════════════════════════════════════════════════
//  EQ PRESETS
//  discord-player v6 uses AudioFilters, not raw Lavalink bands.
//  Switch the implementation block below depending on your setup.
// ═══════════════════════════════════════════════════════════════

function applyEQPreset(node, preset) {
  if (!node) return;

  // ── discord-player v6 (AudioFilters) ────────────────────────
  // First, reset all filters
  node.filters.ffmpeg.setInputArgs([]);

  const filterMap = {
    flat:      [],                                               // no filters
    bass:      ['bassboost_low'],                               // built-in
    nightcore: ['nightcore'],                                    // built-in
    vaporwave: ['vaporwave'],                                    // built-in
    earrape:   ['bassboost', 'normalizer'],
  };

  const filters = filterMap[preset] ?? [];
  if (filters.length > 0) {
    node.filters.ffmpeg.toggle(filters);
  }

  pushLog('info', `EQ preset set: ${preset}`);

  // ── Lavalink alternative (comment above, uncomment below) ───
  // const BANDS = {
  //   flat:      Array.from({ length: 15 }, (_, band) => ({ band, gain: 0 })),
  //   bass:      [ {band:0,gain:0.3}, {band:1,gain:0.25}, {band:2,gain:0.2},
  //                {band:3,gain:0.1}, {band:4,gain:0.05},
  //                ...Array.from({length:10},(_,i)=>({band:i+5,gain:0})) ],
  //   nightcore: [ ...Array.from({length:8},(_,i)=>({band:i,gain:0})),
  //                {band:8,gain:0.15}, {band:9,gain:0.2}, {band:10,gain:0.25},
  //                {band:11,gain:0.3}, {band:12,gain:0.35}, {band:13,gain:0.4},{band:14,gain:0.45}],
  //   vaporwave: [ {band:0,gain:0.1}, {band:1,gain:0.05}, {band:2,gain:0},
  //                {band:3,gain:-0.05}, {band:4,gain:-0.1}, {band:5,gain:-0.05},
  //                ...Array.from({length:9},(_,i)=>({band:i+6,gain:0})) ],
  //   earrape:   Array.from({ length: 15 }, (_, band) => ({ band, gain: 0.25 })),
  // };
  // node.player.node.updatePlayer({ guildId: node.guildId, playerOptions: { filters: { equalizer: BANDS[preset] ?? BANDS.flat } } });
}


// ═══════════════════════════════════════════════════════════════
//  EXPRESS REST API  (called by Cloudflare Worker)
// ═══════════════════════════════════════════════════════════════

function buildApp() {
  const app = express();

  app.use(cors({
    origin: [
      'https://conbot5.pages.dev',
      'https://*.conbot5.pages.dev',
    ],
    credentials: true,
  }));
  app.use(express.json());

  // Simple internal auth — Worker sends this header on every request
  app.use('/api', (req, res, next) => {
    const secret = req.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // ── GET /api/search  ───────────────────────────────────────
  app.get('/api/search', async (req, res) => {
    const { q, guild } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query param: q' });
    if (!_player) return res.status(503).json({ error: 'Player not ready' });

    try {
      const result = await _player.search(q, {
        requestedBy: null,
        searchEngine: detectSource(q),
      });

      if (!result || result.isEmpty()) {
        return res.json({ tracks: [] });
      }

      const tracks = (result.tracks ?? []).slice(0, 10).map(formatTrack);
      return res.json({ tracks, playlistInfo: result.playlist ?? null });
    } catch (e) {
      pushLog('error', `Search error: ${e.message}`);
      return res.status(500).json({ error: e.message });
    }
  });

  // ── GET /api/health  ──────────────────────────────────────
  app.get('/api/health', (req, res) => {
    res.json({
      status:    'ok',
      uptime:    process.uptime(),
      ping:      _client?.ws?.ping ?? null,
      guilds:    _client?.guilds?.cache?.size ?? 0,
      timestamp: Date.now(),
    });
  });

  // ── POST /api/admin/command  ──────────────────────────────
  app.post('/api/admin/command', async (req, res) => {
    const { op, guild_id, adminUserId, ...rest } = req.body;
    if (!op || !guild_id) return res.status(400).json({ error: 'Missing op or guild_id' });

    // Create a fake "admin" ws-like object to reuse handleMessage
    const fakeWs = {
      userId:    adminUserId ?? 'admin',
      isAdmin:   true,
      streamLogs: false,
      readyState: WebSocket.OPEN,
      _buffer:   [],
      send(data) { this._buffer.push(JSON.parse(data)); },
    };

    await handleMessage(fakeWs, { op, guild_id, ...rest });

    return res.json({ ok: true, responses: fakeWs._buffer });
  });

  return app;
}

/** Detect the best search engine from a URL or query string */
function detectSource(q) {
  if (/youtu\.be|youtube\.com/.test(q))  return 'youtube';
  if (/spotify\.com/.test(q))            return 'spotifySong';
  if (/soundcloud\.com/.test(q))         return 'soundcloud';
  return 'youtubeSearch';
}


// ═══════════════════════════════════════════════════════════════
//  WEBSOCKET SERVER
// ═══════════════════════════════════════════════════════════════

function buildWss(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url      = new URL(req.url, `http://localhost`);
    const userId   = url.searchParams.get('userId');
    const guildId  = url.searchParams.get('guild');
    const isAdmin  = url.searchParams.get('admin') === 'true';

    // The Worker already validated the JWT before forwarding here.
    // We trust the Worker. But we double-check required fields:
    if (!userId || !guildId) {
      ws.close(1008, 'Missing userId or guild params');
      return;
    }

    ws.userId    = userId;
    ws.guildId   = guildId;
    ws.isAdmin   = isAdmin;
    ws.streamLogs = false;
    ws.alive     = true;

    // Register
    if (!guildClients.has(guildId)) guildClients.set(guildId, new Set());
    guildClients.get(guildId).add(ws);

    pushLog('info', `WS connected: user=${userId} guild=${guildId} admin=${isAdmin}`);

    // Heartbeat ping/pong
    ws.on('pong', () => { ws.alive = true; });

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        await handleMessage(ws, msg);
      } catch (e) {
        safeSend(ws, { op: 'ERROR', d: { message: 'Malformed JSON' } });
      }
    });

    ws.on('close', (code, reason) => {
      guildClients.get(guildId)?.delete(ws);
      pushLog('info', `WS closed: user=${userId} code=${code}`);
    });

    ws.on('error', (e) => {
      pushLog('error', `WS error for ${userId}: ${e.message}`);
    });
  });

  // Heartbeat interval — drops dead connections every 30s
  const heartbeat = setInterval(() => {
    for (const clients of guildClients.values()) {
      for (const ws of clients) {
        if (!ws.alive) { ws.terminate(); clients.delete(ws); continue; }
        ws.alive = false;
        ws.ping();
      }
    }
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}


// ═══════════════════════════════════════════════════════════════
//  DISCORD-PLAYER EVENT HOOKS
//  Call hookPlayerEvents(player) after you create your Player.
// ═══════════════════════════════════════════════════════════════

function hookPlayerEvents(player) {
  if (!player?.events) {
    console.warn('[CONbot5 API] Player events not found — make sure you pass a discord-player Player instance');
    return;
  }

  player.events.on('playerStart', (queue, track) => {
    const guildId = queue.guild.id;
    pushLog('success', `Now playing: ${track.title} [${fmtDur(track.durationMS)}]`);
    broadcastTrackStart(guildId, track);
    // Send updated queue (current track removed from queue)
    broadcastQueueUpdate(guildId);
  });

  player.events.on('playerFinish', (queue) => {
    broadcastTrackEnd(queue.guild.id);
  });

  player.events.on('emptyQueue', (queue) => {
    const guildId = queue.guild.id;
    broadcastTrackEnd(guildId);
    broadcast(guildId, { op: 'QUEUE_EMPTY' });
    pushLog('info', `Queue empty for guild ${guildId}`);
  });

  player.events.on('playerSkip', (queue, track) => {
    const guildId = queue.guild.id;
    pushLog('info', `Skipped: ${track.title}`);
    broadcastPlayerUpdate(guildId);
  });

  player.events.on('playerError', (queue, error) => {
    const guildId = queue.guild.id;
    pushLog('error', `Player error: ${error.message}`);
    broadcast(guildId, { op: 'ERROR', d: { message: error.message } });
  });

  player.events.on('playerPause', (queue) => {
    broadcastPlayerUpdate(queue.guild.id);
  });

  player.events.on('playerResume', (queue) => {
    broadcastPlayerUpdate(queue.guild.id);
  });

  player.events.on('volumeChange', (queue, oldVol, newVol) => {
    broadcast(queue.guild.id, { op: 'VOLUME_CHANGE', d: { volume: newVol } });
  });

  player.events.on('audioTracksAdd', (queue) => {
    broadcastQueueUpdate(queue.guild.id);
  });

  player.events.on('audioTrackAdd', (queue) => {
    broadcastQueueUpdate(queue.guild.id);
  });

  // Stats broadcast every 5 seconds (position updates)
  setInterval(() => {
    for (const [guildId] of guildClients) {
      if (guildClients.get(guildId)?.size > 0) {
        broadcastStats(guildId);
        // Also broadcast position updates for progress bar
        const node = getNode(guildId);
        if (node?.isPlaying()) {
          broadcast(guildId, {
            op: 'POSITION',
            d: { position: node.streamTime, duration: node.current?.durationMS ?? 0 },
          });
        }
      }
    }
  }, 5_000);

  pushLog('success', 'Player events hooked successfully');
}


// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Start the API server.
 *
 * Call this from your main bot file AFTER the client is ready:
 *
 *   client.once('ready', () => {
 *     const { startApiServer } = require('./server');
 *     startApiServer(client, player);
 *   });
 *
 * @param {import('discord.js').Client} client
 * @param {import('discord-player').Player} player
 */
function startApiServer(client, player) {
  _client = client;
  _player = player;

  if (player) hookPlayerEvents(player);

  const app        = buildApp();
  const httpServer = createServer(app);
  buildWss(httpServer);

  const PORT = process.env.PORT ?? 3001;

  httpServer.listen(PORT, () => {
    pushLog('success', `CONbot5 API server listening on port ${PORT}`);
    console.log(`[CONbot5] API server ready on :${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[CONbot5] SIGTERM received, shutting down...');
    httpServer.close(() => process.exit(0));
  });

  return { broadcast, broadcastQueueUpdate, pushLog };
}

module.exports = { startApiServer, broadcast, broadcastQueueUpdate, pushLog };
