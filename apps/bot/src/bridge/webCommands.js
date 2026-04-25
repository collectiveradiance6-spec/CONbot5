'use strict';
const axios  = require('axios');
const env    = require('../config/env');
const Engine = require('../runtime/musicEngine');
const { AudioPlayerStatus } = require('@discordjs/voice');

function startWebCommandPoll(bot) {
  if (!env.DISCORD_GUILD_ID) return;

  setInterval(async () => {
    try {
      const r = await axios.get(
        env.API_URL + '/commands/' + env.DISCORD_GUILD_ID,
        { headers: { 'x-bot-token': env.API_BOT_TOKEN }, timeout: 3000 }
      );
      const cmds = r.data?.commands || [];
      if (!cmds.length) return;

      const state = Engine.getState(env.DISCORD_GUILD_ID);

      for (const { command, payload } of cmds) {
        try {
          await execWebCommand(command, payload, state, bot);
        } catch (e) {
          console.error('[WebCmd] ' + command + ':', e.message);
        }
      }
    } catch {}
  }, 2_000);
}

async function execWebCommand(command, payload, state, bot) {
  switch (command) {

    case 'play':
    case 'add': {
      const url = payload?.url || payload?.query;
      if (!url) break;
      const track = await Engine.resolveTrack(url);
      if (!track || Array.isArray(track)) break;
      track.requestedBy = payload?.requestedBy || 'Web';
      if (state.queue.length < 500) state.queue.push(track);
      if (!state.current) await Engine.playNext(state, bot);
      else await Engine.updateDashboard(state, bot);
      break;
    }

    case 'skip':
      state.player?.stop();
      break;

    case 'stop':
      state.queue = []; state.current = null; state.mood = null;
      state.moodBuffer = []; state.autoplay = false; state.paused = false;
      clearInterval(state.progressTimer);
      state.player?.stop(true);
      state.connection?.destroy(); state.connection = null;
      try { bot.user.setActivity('CONbot5 Supreme | /play', { type: 2 }); } catch {}
      await Engine.updateDashboard(state, bot);
      break;

    case 'pause':
      state.player?.pause(); state.paused = true;
      await Engine.updateDashboard(state, bot);
      break;

    case 'resume':
      state.player?.unpause(); state.paused = false;
      await Engine.updateDashboard(state, bot);
      break;

    case 'prev':
      if (state.history.length) {
        const p = state.history.pop();
        if (state.current) state.queue.unshift({ ...state.current });
        state.queue.unshift({ ...p });
        clearInterval(state.progressTimer);
        state.player?.stop();
      }
      break;

    case 'clear':
      state.queue = []; state.moodBuffer = [];
      await Engine.updateDashboard(state, bot);
      break;

    case 'remove': {
      const pos = parseInt(payload?.position, 10) - 1;
      if (pos >= 0 && pos < state.queue.length) state.queue.splice(pos, 1);
      await Engine.updateDashboard(state, bot);
      break;
    }

    case 'volume': {
      const vol = Math.max(0, Math.min(100, parseInt(payload?.level, 10) || 80));
      state.volume = vol;
      const ps = state.player?.state;
      const eq = Engine.EQ[state.eq] || Engine.EQ.flat;
      if (ps?.resource?.volume) ps.resource.volume.setVolume((vol / 100) * eq.mod);
      await Engine.updateDashboard(state, bot);
      break;
    }

    case 'shuffle':
      state.shuffle = !state.shuffle;
      if (state.shuffle && state.queue.length > 1) {
        for (let k = state.queue.length - 1; k > 0; k--) {
          const j = Math.floor(Math.random() * (k + 1));
          [state.queue[k], state.queue[j]] = [state.queue[j], state.queue[k]];
        }
      }
      await Engine.updateDashboard(state, bot);
      break;

    case 'loop': {
      const mode = payload?.mode || 'track';
      if (mode === 'track') { state.loop = !state.loop; state.loopQueue = false; }
      if (mode === 'queue') { state.loopQueue = !state.loopQueue; state.loop = false; }
      if (mode === 'off')   { state.loop = false; state.loopQueue = false; }
      await Engine.updateDashboard(state, bot);
      break;
    }

    case 'autoplay':
      state.autoplay = !state.autoplay;
      await Engine.updateDashboard(state, bot);
      break;

    case 'eq': {
      const preset = payload?.preset || 'flat';
      if (Engine.EQ[preset]) {
        state.eq = preset;
        const ps = state.player?.state;
        const eq = Engine.EQ[preset];
        if (ps?.resource?.volume) ps.resource.volume.setVolume((state.volume / 100) * eq.mod);
        await Engine.updateDashboard(state, bot);
      }
      break;
    }

    case 'mood':
    case 'room': {
      const room = payload?.room || payload?.mood;
      if (!room || room === 'off') {
        state.mood = null; state.moodBuffer = []; state.autoplay = false;
      } else if (Engine.MOODS[room]) {
        state.mood = room; state.moodBuffer = [];
        state.volume = Engine.MOODS[room].vol;
        if (!state.current || state.player?.state?.status !== AudioPlayerStatus.Playing) {
          await Engine.playNext(state, bot);
        }
      }
      await Engine.updateDashboard(state, bot);
      break;
    }

    case 'genre': {
      const genre = Engine.GENRES[payload?.genre];
      if (!genre) break;
      const q = genre.q[Math.floor(Math.random() * genre.q.length)];
      const res = await Engine.searchMultiple(q, 10);
      const tracks = res.map(r => Engine.mkTrack(r)).filter(t => t && t.duration > 30 && t.duration < 7200).slice(0, 10);
      tracks.forEach(t => { t.requestedBy = 'Web'; if (state.queue.length < 500) state.queue.push(t); });
      if (!state.current || state.player?.state?.status !== AudioPlayerStatus.Playing) {
        await Engine.playNext(state, bot);
      } else {
        await Engine.updateDashboard(state, bot);
      }
      break;
    }
  }
}

module.exports = { startWebCommandPoll };
