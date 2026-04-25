'use strict';
const { Events } = require('discord.js');
const { dispatch } = require('../commands/handlers');
const Engine = require('../runtime/musicEngine');

// Button IDs that belong to the launchpad flow
const LAUNCHPAD_BTNS = new Set([
  'c5_launch_session',
  'c5_launch_join',
  'c5_launch_search',
  'c5_launch_now',
  'c5_launch_queue',
  'c5_launch_audio',
  'c5_launch_moods',
  'c5_launch_genres',
  'c5_launch_diag',
  'c5_launch_refresh',
]);

// Select IDs handled by Engine.handleSelect
const ENGINE_SELECTS = new Set([
  'c5_mood',
  'c5_genre_a',
  'c5_genre_b',
  'c5_search_pick',
  'c5_eq',
  'c5_mix_mood',
  'c5_mix_genre',
  'c5_mix_energy',
]);

function registerRouter(bot) {
  bot.on(Events.InteractionCreate, async interaction => {
    try {
      // --- Button ---
      if (interaction.isButton()) {
        const id = interaction.customId;

        if (LAUNCHPAD_BTNS.has(id)) {
          await interaction.deferUpdate().catch(() => {});
          await handleLaunchpadButton(id, interaction, bot);
          return;
        }

        if (Engine.isButton(id)) {
          return Engine.handleButton(interaction, bot);
        }

        return;
      }

      // --- Select menu ---
      if (interaction.isStringSelectMenu()) {
        const id = interaction.customId;
        if (ENGINE_SELECTS.has(id)) {
          return Engine.handleSelect(interaction, bot);
        }
        return;
      }

      // --- Slash command ---
      if (!interaction.isChatInputCommand()) return;

      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }

      await dispatch(interaction, bot);

    } catch (err) {
      const msg = err?.message || String(err || '');
      const IGNORE = ['Unknown interaction', 'Unknown Message', 'Missing Access', '429', 'rate limit'];
      if (IGNORE.some(s => msg.includes(s))) return;
      console.error('[Router] error:', msg);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply('Error: ' + msg.slice(0, 200));
        } else {
          await interaction.reply({ content: 'Error: ' + msg.slice(0, 200), ephemeral: true });
        }
      } catch {}
    }
  });
}

async function handleLaunchpadButton(id, interaction, bot) {
  const state = Engine.getState(interaction.guildId);

  if (id === 'c5_launch_session' || id === 'c5_launch_join') {
    const vc = interaction.member?.voice?.channel;
    if (!vc) {
      await interaction.followUp({ content: 'Join a voice channel first.', ephemeral: true }).catch(() => {});
      return;
    }
    state.textChannelId = interaction.channelId;
    await Engine.ensureVC(state, vc, bot).catch(() => {});
    if (!state.current && state.queue.length) await Engine.playNext(state, bot);
    await interaction.followUp({ content: 'Session started. Use `/play` or pick a Mood Room.', ephemeral: true }).catch(() => {});

  } else if (id === 'c5_launch_search') {
    await interaction.followUp({ content: 'Use `/play <song name>` or `/search <query>` to add music.', ephemeral: true }).catch(() => {});

  } else if (id === 'c5_launch_now') {
    const elapsed = state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0;
    await interaction.followUp({ embeds: [Engine.buildNowPlayingEmbed(state, elapsed)], ephemeral: true }).catch(() => {});

  } else if (id === 'c5_launch_queue') {
    await interaction.followUp({ embeds: [Engine.buildQueueEmbed(state, 0)], ephemeral: true }).catch(() => {});

  } else if (id === 'c5_launch_audio') {
    await interaction.followUp({ embeds: [Engine.buildAudioLabEmbed(state)], components: Engine.buildAudioLabComponents(state), ephemeral: true }).catch(() => {});

  } else if (id === 'c5_launch_moods') {
    const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
    const { MOODS } = Engine;
    const select = new StringSelectMenuBuilder()
      .setCustomId('c5_mood')
      .setPlaceholder('Pick a Mood Room...')
      .addOptions([
        { label: 'Off — Manual Queue', value: 'off', emoji: '❌' },
        ...Object.entries(MOODS).map(([k, v]) => ({ label: v.label, value: k, emoji: v.emoji, default: state.mood === k })),
      ]);
    await interaction.followUp({ embeds: [Engine.buildLaunchpadEmbed(state, interaction.guild)], components: [new ActionRowBuilder().addComponents(select)], ephemeral: true }).catch(() => {});

  } else if (id === 'c5_launch_genres') {
    await interaction.followUp({ embeds: [Engine.buildGenreEmbed()], components: Engine.buildGenreComponents(state), ephemeral: true }).catch(() => {});

  } else if (id === 'c5_launch_diag') {
    const diag = Engine.buildDiagnosticsEmbed(state, interaction.guildId);
    await interaction.followUp({ embeds: [diag], ephemeral: true }).catch(() => {});

  } else if (id === 'c5_launch_refresh') {
    // Just update the launchpad in place
  }

  // Always re-render launchpad in place
  if (state.launchpadMsgId && state.launchpadChId) {
    const ch = bot.channels.cache.get(state.launchpadChId);
    if (ch) {
      ch.messages.fetch(state.launchpadMsgId)
        .then(m => m.edit({
          embeds: [Engine.buildLaunchpadEmbed(state, interaction.guild)],
          components: Engine.buildLaunchpadComponents(state),
        }))
        .catch(() => {});
    }
  }
}

module.exports = { registerRouter };
