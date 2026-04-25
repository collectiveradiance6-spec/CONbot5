'use strict';
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const env    = require('../config/env');
const Engine = require('../runtime/musicEngine');

const C  = { cyan: 0x56D9FF, mag: 0xFF6ADF, vio: 0x8B72FF, gold: 0xFFCE69, red: 0xFF4500, green: 0x35ED7E };
const FT = Engine.FT;

function base(title, color) {
  return new EmbedBuilder().setTitle(title).setColor(color || C.vio).setFooter(FT).setTimestamp();
}

function isDJ(member) {
  if (!env.DJ_ROLE_ID) return true;
  return member?.roles?.cache?.has(env.DJ_ROLE_ID) ||
         member?.permissions?.has(PermissionFlagsBits.ManageChannels);
}

// In-memory playlist store (upgrade to Supabase when ready)
const playlists = new Map();

// ============================================================
// PLAY / ADD / SEARCH
// ============================================================
async function handlePlay(interaction, bot) {
  const vc = interaction.member?.voice?.channel;
  if (!vc) return interaction.editReply('Join a voice channel first.');

  const query = interaction.options.getString('query');
  const state = Engine.getState(interaction.guildId);
  state.textChannelId = interaction.channelId;

  await Engine.ensureVC(state, vc, bot);

  if (/^https?:\/\//.test(query)) {
    await interaction.editReply('Loading: `' + query.slice(0, 80) + '`...');
    const result = await Engine.resolveTrack(query);
    if (!result) return interaction.editReply('Could not load URL.');

    if (Array.isArray(result)) {
      const valid = result.filter(Boolean);
      valid.forEach(t => {
        t.requestedBy = interaction.user.username;
        if (state.queue.length < 500) state.queue.push(t);
      });
      if (!state.current) await Engine.playNext(state, bot);
      return interaction.editReply({
        content: null,
        embeds: [new EmbedBuilder()
          .setColor(C.cyan)
          .setTitle('Playlist Added')
          .setDescription('Added **' + valid.length + '** tracks.')
          .setFooter(FT)],
      });
    }

    result.requestedBy = interaction.user.username;
    if (state.queue.length >= 500) return interaction.editReply('Queue full (500 max).');
    const wasEmpty = !state.current && state.queue.length === 0;
    state.queue.push(result);
    if (wasEmpty) await Engine.playNext(state, bot);
    return interaction.editReply({
      content: null,
      embeds: [new EmbedBuilder()
        .setColor(wasEmpty ? C.cyan : C.vio)
        .setTitle(wasEmpty ? 'Now Playing' : 'Added to Queue')
        .setDescription('[' + result.title + '](' + result.url + ')')
        .setThumbnail(result.thumbnail || null)
        .addFields(
          { name: 'Duration', value: Engine.fmtTime(result.duration), inline: true },
          { name: wasEmpty ? 'Source' : 'Position', value: wasEmpty ? (result.source || 'YouTube') : '#' + state.queue.length, inline: true }
        )
        .setFooter(FT)],
    });
  }

  await interaction.editReply('Searching: `' + query.slice(0, 80) + '`...');
  const results = await Engine.searchMultiple(query, 8);
  if (!results.length) {
    return interaction.editReply(
      'No results. If this keeps happening, YOUTUBE_COOKIE may need refreshing — or try a direct YouTube URL.'
    );
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('c5_search_pick')
    .setPlaceholder('Pick from ' + results.length + ' results...')
    .addOptions(results.slice(0, 8).map((r, idx) => ({
      label: (idx + 1) + '. ' + r.title.slice(0, 75),
      value: r.url,
      description: Engine.fmtTime(r.durationInSec) + ' - ' + (r.channel?.name?.slice(0, 40) || 'YouTube'),
    })));

  return interaction.editReply({
    embeds: [Engine.buildSearchEmbed(results.slice(0, 8), query)],
    components: [new ActionRowBuilder().addComponents(select)],
  });
}

async function handleSearch(interaction, bot) {
  const q = interaction.options.getString('query');
  const results = await Engine.searchMultiple(q, 8);
  if (!results.length) {
    return interaction.editReply(
      'No results. YOUTUBE_COOKIE may need refreshing — or try a direct YouTube URL.'
    );
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId('c5_search_pick')
    .setPlaceholder('Select a track...')
    .addOptions(results.slice(0, 8).map((r, i) => ({
      label: (i + 1) + '. ' + r.title.slice(0, 75),
      value: r.url,
      description: Engine.fmtTime(r.durationInSec) + ' - ' + (r.channel?.name?.slice(0, 40) || 'YouTube'),
    })));
  return interaction.editReply({
    embeds: [Engine.buildSearchEmbed(results.slice(0, 8), q)],
    components: [new ActionRowBuilder().addComponents(select)],
  });
}

// ============================================================
// QUEUE CONTROLS
// ============================================================
async function handleSkip(interaction, bot) {
  return Engine.cmdSkip(interaction, bot);
}

async function handleStop(interaction, bot) {
  return Engine.cmdStop(interaction, bot);
}

async function handlePause(interaction, bot) {
  if (!isDJ(interaction.member)) return interaction.editReply('DJ role required.');
  const state = Engine.getState(interaction.guildId);
  state.player?.pause(); state.paused = true;
  await Engine.updateDashboard(state, bot);
  return interaction.editReply('Paused.');
}

async function handleResume(interaction, bot) {
  if (!isDJ(interaction.member)) return interaction.editReply('DJ role required.');
  const state = Engine.getState(interaction.guildId);
  state.player?.unpause(); state.paused = false;
  await Engine.updateDashboard(state, bot);
  return interaction.editReply('Resumed.');
}

async function handleNowPlaying(interaction, bot) {
  const state   = Engine.getState(interaction.guildId);
  const elapsed = state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0;
  return interaction.editReply({ embeds: [Engine.buildNowPlayingEmbed(state, elapsed)] });
}

async function handleQueue(interaction, bot) {
  const state = Engine.getState(interaction.guildId);
  const page  = Math.max(0, (interaction.options.getInteger('page') || 1) - 1);
  return interaction.editReply({ embeds: [Engine.buildQueueEmbed(state, page)] });
}

async function handleHistory(interaction, bot) {
  const state = Engine.getState(interaction.guildId);
  return interaction.editReply({ embeds: [Engine.buildHistoryEmbed(state)] });
}

async function handleClear(interaction, bot) {
  if (!isDJ(interaction.member)) return interaction.editReply('DJ role required.');
  const state = Engine.getState(interaction.guildId);
  const n = state.queue.length;
  state.queue = []; state.moodBuffer = [];
  await Engine.updateDashboard(state, bot);
  return interaction.editReply('Cleared **' + n + '** track' + (n !== 1 ? 's' : '') + '.');
}

async function handleRemove(interaction, bot) {
  if (!isDJ(interaction.member)) return interaction.editReply('DJ role required.');
  const state = Engine.getState(interaction.guildId);
  const pos   = interaction.options.getInteger('position');
  if (pos < 1 || pos > state.queue.length) return interaction.editReply('Position 1-' + state.queue.length + '.');
  const [r] = state.queue.splice(pos - 1, 1);
  return interaction.editReply('Removed **' + r.title.slice(0, 80) + '**.');
}

async function handleMove(interaction, bot) {
  if (!isDJ(interaction.member)) return interaction.editReply('DJ role required.');
  const state = Engine.getState(interaction.guildId);
  const from  = interaction.options.getInteger('from') - 1;
  const to    = interaction.options.getInteger('to')   - 1;
  if (from < 0 || from >= state.queue.length || to < 0 || to >= state.queue.length) {
    return interaction.editReply('Positions 1-' + state.queue.length + '.');
  }
  const [t] = state.queue.splice(from, 1);
  state.queue.splice(to, 0, t);
  return interaction.editReply('Moved **' + t.title.slice(0, 60) + '** to position **' + (to + 1) + '**.');
}

// ============================================================
// PLAYBACK SETTINGS
// ============================================================
async function handleVolume(interaction, bot) {
  if (!isDJ(interaction.member)) return interaction.editReply('DJ role required.');
  const state = Engine.getState(interaction.guildId);
  const vol   = interaction.options.getInteger('level');
  state.volume = vol;
  const ps = state.player?.state;
  const eq = Engine.EQ[state.eq] || Engine.EQ.flat;
  if (ps?.resource?.volume) ps.resource.volume.setVolume((vol / 100) * eq.mod);
  await Engine.updateDashboard(state, bot);
  return interaction.editReply('Volume set to **' + vol + '%**');
}

async function handleLoop(interaction, bot) {
  const state = Engine.getState(interaction.guildId);
  const mode  = interaction.options.getString('mode') || 'track';
  if (mode === 'track')  { state.loop = !state.loop; state.loopQueue = false; }
  if (mode === 'queue')  { state.loopQueue = !state.loopQueue; state.loop = false; }
  if (mode === 'off')    { state.loop = false; state.loopQueue = false; }
  await Engine.updateDashboard(state, bot);
  const label = state.loop ? 'Loop track ON' : state.loopQueue ? 'Queue loop ON' : 'Loop OFF';
  return interaction.editReply(label);
}

async function handleShuffle(interaction, bot) {
  const state = Engine.getState(interaction.guildId);
  state.shuffle = !state.shuffle;
  if (state.shuffle && state.queue.length > 1) {
    for (let k = state.queue.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [state.queue[k], state.queue[j]] = [state.queue[j], state.queue[k]];
    }
  }
  await Engine.updateDashboard(state, bot);
  return interaction.editReply(state.shuffle ? 'Shuffle ON — queue randomized!' : 'Shuffle OFF');
}

async function handleAutoPlay(interaction, bot) {
  const state = Engine.getState(interaction.guildId);
  state.autoplay = !state.autoplay;
  await Engine.updateDashboard(state, bot);
  return interaction.editReply(state.autoplay ? 'AutoPlay ON' : 'AutoPlay OFF');
}

async function handleEQ(interaction, bot) {
  if (!isDJ(interaction.member)) return interaction.editReply('DJ role required.');
  const state  = Engine.getState(interaction.guildId);
  const preset = interaction.options.getString('preset');
  if (!Engine.EQ[preset]) return interaction.editReply('Unknown EQ preset.');
  state.eq = preset;
  const eq = Engine.EQ[preset];
  const ps = state.player?.state;
  if (ps?.resource?.volume) ps.resource.volume.setVolume((state.volume / 100) * eq.mod);
  await Engine.updateDashboard(state, bot);
  return interaction.editReply({ embeds: [new EmbedBuilder().setColor(C.cyan).setTitle('EQ Updated').setDescription('Preset: **' + eq.label + '**').setFooter(FT)] });
}

// ============================================================
// DISCOVERY
// ============================================================
async function handleBrowse(interaction, bot) {
  const state = Engine.getState(interaction.guildId);
  return interaction.editReply({
    embeds: [Engine.buildGenreEmbed()],
    components: Engine.buildGenreComponents(state),
  });
}

async function handleRoom(interaction, bot) {
  if (!isDJ(interaction.member)) return interaction.editReply('DJ role required.');
  const state = Engine.getState(interaction.guildId);
  const room  = interaction.options.getString('room');
  state.textChannelId = interaction.channelId;

  if (room === 'off') {
    state.mood = null; state.moodBuffer = []; state.autoplay = false;
    await Engine.updateDashboard(state, bot);
    return interaction.editReply('Mood room disabled.');
  }

  const preset = Engine.MOODS[room];
  if (!preset) return interaction.editReply('Unknown mood.');
  const vc = interaction.member?.voice?.channel;
  if (!vc) return interaction.editReply('Join a voice channel first.');

  state.mood = room; state.moodBuffer = []; state.volume = preset.vol;
  await Engine.ensureVC(state, vc, bot);
  if (!state.current || state.player?.state?.status !== 1) await Engine.playNext(state, bot);
  await Engine.updateDashboard(state, bot);

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(preset.color)
      .setTitle(preset.emoji + ' ' + preset.label + ' — Active')
      .setDescription('Uninterrupted 24/7 stream active. AEGIS auto-reconnects.')
      .addFields(
        { name: 'Volume', value: preset.vol + '%', inline: true },
        { name: 'Mode',   value: 'Infinite autoplay', inline: true }
      )
      .setFooter(FT)],
  });
}

// ============================================================
// PANELS
// ============================================================
async function handleDashboard(interaction, bot) {
  const state   = Engine.getState(interaction.guildId);
  const elapsed = state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0;
  state.dashboardChId = interaction.channelId;
  const msg = await interaction.editReply({
    embeds: [Engine.buildNowPlayingEmbed(state, elapsed)],
    components: Engine.buildDashboardComponents(state),
    fetchReply: true,
  });
  state.dashboardMsgId = msg.id;
}

async function handleLaunchpad(interaction, bot) {
  const state = Engine.getState(interaction.guildId);
  state.textChannelId  = interaction.channelId;
  state.launchpadChId  = interaction.channelId;
  const msg = await interaction.editReply({
    embeds: [Engine.buildLaunchpadEmbed(state, interaction.guild)],
    components: Engine.buildLaunchpadComponents(state),
    fetchReply: true,
  });
  state.launchpadMsgId = msg.id;
}

async function handleSession(interaction, bot) {
  const state = Engine.getState(interaction.guildId);
  return interaction.editReply({ embeds: [Engine.buildSessionEmbed(state, interaction.guild)], components: Engine.buildSessionComponents(state) });
}

async function handleAudioLab(interaction, bot) {
  const state = Engine.getState(interaction.guildId);
  return interaction.editReply({ embeds: [Engine.buildAudioLabEmbed(state)], components: Engine.buildAudioLabComponents(state) });
}

async function handleSmartMix(interaction, bot) {
  const state = Engine.getState(interaction.guildId);
  return interaction.editReply({ embeds: [Engine.buildSmartMixEmbed(state)], components: Engine.buildSmartMixComponents(state) });
}

// ============================================================
// PLAYLISTS
// ============================================================
async function handleSave(interaction, bot) {
  const state  = Engine.getState(interaction.guildId);
  const name   = interaction.options.getString('name');
  const tracks = [...(state.current ? [state.current] : []), ...state.queue];
  if (!tracks.length) return interaction.editReply('Nothing in queue to save.');
  const key = interaction.guildId + ':' + name.toLowerCase();
  playlists.set(key, tracks.slice(0, 200));
  return interaction.editReply('Playlist **' + name + '** saved (' + tracks.length + ' tracks).');
}

async function handleLoad(interaction, bot) {
  if (!isDJ(interaction.member)) return interaction.editReply('DJ role required.');
  const state = Engine.getState(interaction.guildId);
  const name  = interaction.options.getString('name');
  const key   = interaction.guildId + ':' + name.toLowerCase();
  const pl    = playlists.get(key);
  if (!pl) return interaction.editReply('Playlist **' + name + '** not found.');
  const vc = interaction.member?.voice?.channel;
  if (!vc) return interaction.editReply('Join a voice channel first.');
  state.textChannelId = interaction.channelId;
  await Engine.ensureVC(state, vc, bot);
  pl.forEach(t => {
    if (state.queue.length < 500) state.queue.push({ ...t, requestedBy: interaction.user.username });
  });
  if (!state.current) await Engine.playNext(state, bot);
  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(C.vio)
      .setTitle('Loaded: ' + name)
      .setDescription('Added **' + pl.length + '** tracks.')
      .setFooter(FT)],
  });
}

async function handlePlaylists(interaction, bot) {
  const prefix = interaction.guildId + ':';
  const list   = [...playlists.entries()]
    .filter(([k]) => k.startsWith(prefix))
    .map(([k, v]) => '`' + k.slice(prefix.length) + '` — ' + v.length + ' tracks');

  if (!list.length) return interaction.editReply('No saved playlists for this server.');

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(C.vio)
      .setTitle('Server Playlists')
      .setDescription(list.join('\n'))
      .setFooter(FT)],
  });
}

// ============================================================
// UTILITY
// ============================================================
async function handleSeek(interaction, bot) {
  return interaction.editReply('Seek requires re-streaming from timestamp. Add ffmpeg seek filters for full seek support.');
}

async function handleLyrics(interaction, bot) {
  const state = Engine.getState(interaction.guildId);
  const query = interaction.options.getString('query') || state.current?.title;
  if (!query) return interaction.editReply('Nothing playing and no query provided.');
  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(C.cyan)
      .setTitle('Lyrics — ' + query.slice(0, 60))
      .setDescription(
        'Lyrics integration requires a Genius API key.\n\n' +
        'Set `GENIUS_API_KEY` in your env file and the engine will fetch full lyrics.'
      )
      .addFields({ name: 'Quick Link', value: '[Search on Genius](https://genius.com/search?q=' + encodeURIComponent(query) + ')', inline: false })
      .setFooter(FT)],
  });
}

// ============================================================
// SYSTEM
// ============================================================
async function handlePing(interaction, bot) {
  const mem  = process.memoryUsage();
  const home = Engine.isHomeGuild(interaction.guildId);
  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(bot.ws.ping < 100 ? C.green : bot.ws.ping < 250 ? C.gold : C.red)
      .setTitle('CONbot5 System Status')
      .addFields(
        { name: 'WS Latency',   value: bot.ws.ping + 'ms',                                                         inline: true },
        { name: 'Uptime',       value: Math.floor(process.uptime() / 3600) + 'h ' + Math.floor((process.uptime() % 3600) / 60) + 'm', inline: true },
        { name: 'Memory',       value: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',                              inline: true },
        { name: 'Engine',       value: 'CONbot5 v6.0 Phoenix',                                                     inline: true },
        { name: 'Guild Tier',   value: home ? 'Dominion Home — Fully Unlocked' : 'Standard',                       inline: true }
      )
      .setFooter(FT)
      .setTimestamp()],
  });
}

async function handleHelp(interaction, bot) {
  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(C.vio)
      .setTitle('CONbot5 Supreme — Command Reference')
      .addFields(
        { name: 'Playback',   value: '`/play` `/add` `/search` `/skip` `/stop` `/pause` `/resume` `/np`', inline: false },
        { name: 'Queue',      value: '`/queue` `/history` `/clear` `/remove` `/move`',                   inline: false },
        { name: 'Controls',   value: '`/volume` `/loop` `/shuffle` `/autoplay` `/eq` `/seek`',            inline: false },
        { name: 'Discovery',  value: '`/browse` `/room`',                                                 inline: false },
        { name: 'Panels',     value: '`/dashboard` `/launchpad` `/session` `/audiolab` `/smartmix`',      inline: false },
        { name: 'Playlists',  value: '`/save` `/load` `/playlists`',                                      inline: false },
        { name: 'Extras',     value: '`/lyrics` `/ping` `/help` `/diagnosevoice`',                        inline: false }
      )
      .setDescription('> CONbot5 Supreme — All sources. No limits. Infinite audio.')
      .setFooter(FT)],
  });
}

async function handleDiagnoseVoice(interaction, bot) {
  return Engine.cmdDiagnoseVoice(interaction, bot);
}

// ============================================================
// DISPATCH TABLE
// ============================================================
const DISPATCH = {
  play:          handlePlay,
  add:           handlePlay,
  search:        handleSearch,
  skip:          handleSkip,
  stop:          handleStop,
  pause:         handlePause,
  resume:        handleResume,
  nowplaying:    handleNowPlaying,
  np:            handleNowPlaying,
  queue:         handleQueue,
  history:       handleHistory,
  clear:         handleClear,
  remove:        handleRemove,
  move:          handleMove,
  volume:        handleVolume,
  loop:          handleLoop,
  shuffle:       handleShuffle,
  autoplay:      handleAutoPlay,
  eq:            handleEQ,
  browse:        handleBrowse,
  room:          handleRoom,
  dashboard:     handleDashboard,
  launchpad:     handleLaunchpad,
  session:       handleSession,
  audiolab:      handleAudioLab,
  smartmix:      handleSmartMix,
  save:          handleSave,
  load:          handleLoad,
  playlists:     handlePlaylists,
  seek:          handleSeek,
  lyrics:        handleLyrics,
  ping:          handlePing,
  help:          handleHelp,
  diagnosevoice: handleDiagnoseVoice,
};

async function dispatch(interaction, bot) {
  const fn = DISPATCH[interaction.commandName];
  if (!fn) return interaction.editReply('Unknown command.');
  return fn(interaction, bot);
}

module.exports = { dispatch, playlists };
