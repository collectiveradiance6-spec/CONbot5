'use strict';
const axios = require('axios');
const env   = require('../config/env');
const Engine = require('../runtime/musicEngine');

function startApiSync(bot) {
  if (!env.DISCORD_GUILD_ID) {
    console.warn('[ApiSync] DISCORD_GUILD_ID not set — state sync disabled');
    return;
  }

  setInterval(async () => {
    try {
      const state   = Engine.getState(env.DISCORD_GUILD_ID);
      const elapsed = state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0;
      await axios.post(
        env.API_URL + '/state/' + env.DISCORD_GUILD_ID,
        {
          current:   state.current || null,
          queue:     state.queue.slice(0, 50),
          history:   state.history.slice(-20),
          volume:    state.volume,
          loop:      state.loop,
          loopQueue: state.loopQueue,
          shuffle:   state.shuffle,
          autoplay:  state.autoplay,
          mood:      state.mood,
          paused:    state.paused,
          eq:        state.eq,
          elapsed,
          skipVotes: [...state.skipVotes],
        },
        {
          headers:  { 'x-bot-token': env.API_BOT_TOKEN },
          timeout:  3000,
        }
      ).catch(() => {});
    } catch {}
  }, 2_000);
}

module.exports = { startApiSync };
