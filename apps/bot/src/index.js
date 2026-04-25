// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — SUPREME DISCORD BOT v5.0
// Dedicated music intelligence. Surpasses Rythm in every dimension.
// ═══════════════════════════════════════════════════════════════════════
'use strict';
require('dotenv').config();

const http = require('http');
const {
  Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder,
  EmbedBuilder, PermissionFlagsBits, Events,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
} = require('discord.js');
const axios = require('axios');
const Engine = require('./runtime/musicEngine.js');

// ── ENV ────────────────────────────────────────────────────────────────
const {
  DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID,
} = process.env;

if (!DISCORD_BOT_TOKEN) { console.error('❌ DISCORD_BOT_TOKEN missing'); process.exit(1); }

const BOT_PORT   = parseInt(process.env.BOT_PORT || '3010');
const API_URL    = (process.env.API_URL || 'http://localhost:3020').replace(/\/$/, '');
const WS_URL     = (process.env.WS_URL  || 'http://localhost:3030').replace(/\/$/, '');

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildPresences,
  ],
  rest: { timeout:15000 },
  allowedMentions: { parse:['users','roles'], repliedUser:false },
});

// ── CONSTANTS ──────────────────────────────────────────────────────────
const C = { cyan:0x56D9FF, mag:0xFF6ADF, vio:0x8B72FF, gold:0xFFCE69, red:0xFF4500, green:0x35ED7E };
const FT = Engine.FT;
const base = (title, color=C.vio) => new EmbedBuilder().setTitle(title).setColor(color).setFooter(FT).setTimestamp();

// ── SLASH COMMANDS ─────────────────────────────────────────────────────
const COMMANDS = [
  // Music — core
  new SlashCommandBuilder().setName('play').setDescription('▶️ Play by song title or URL (YouTube/Spotify/SoundCloud)')
    .addStringOption(o=>o.setName('query').setDescription('Song name or URL').setRequired(true)),
  new SlashCommandBuilder().setName('search').setDescription('🔍 Search and pick from top 8 results')
    .addStringOption(o=>o.setName('query').setDescription('Search query').setRequired(true)),
  new SlashCommandBuilder().setName('skip').setDescription('⏭️ Skip / vote-skip current track'),
  new SlashCommandBuilder().setName('stop').setDescription('⏹️ Stop and clear queue (DJ only)'),
  new SlashCommandBuilder().setName('pause').setDescription('⏸️ Pause playback (DJ only)'),
  new SlashCommandBuilder().setName('resume').setDescription('▶️ Resume playback (DJ only)'),
  new SlashCommandBuilder().setName('nowplaying').setDescription('📊 Show current track panel'),
  new SlashCommandBuilder().setName('np').setDescription('📊 Now playing (alias)'),

  // Queue
  new SlashCommandBuilder().setName('queue').setDescription('📋 View queue')
    .addIntegerOption(o=>o.setName('page').setDescription('Page number').setRequired(false).setMinValue(1)),
  new SlashCommandBuilder().setName('history').setDescription('📜 View recently played tracks'),
  new SlashCommandBuilder().setName('clear').setDescription('🗑️ Clear queue (DJ only)'),
  new SlashCommandBuilder().setName('remove').setDescription('🗑️ Remove a track (DJ only)')
    .addIntegerOption(o=>o.setName('position').setDescription('Position in queue').setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName('move').setDescription('↕️ Move a track in queue (DJ only)')
    .addIntegerOption(o=>o.setName('from').setDescription('From position').setRequired(true).setMinValue(1))
    .addIntegerOption(o=>o.setName('to').setDescription('To position').setRequired(true).setMinValue(1)),

  // Controls
  new SlashCommandBuilder().setName('volume').setDescription('🔊 Set volume 0–100 (DJ only)')
    .addIntegerOption(o=>o.setName('level').setDescription('Volume level').setRequired(true).setMinValue(0).setMaxValue(100)),
  new SlashCommandBuilder().setName('loop').setDescription('🔂 Toggle loop mode')
    .addStringOption(o=>o.setName('mode').setDescription('Mode').setRequired(false).addChoices(
      {name:'Track', value:'track'},{name:'Queue', value:'queue'},{name:'Off', value:'off'},
    )),
  new SlashCommandBuilder().setName('shuffle').setDescription('🔀 Toggle shuffle'),
  new SlashCommandBuilder().setName('autoplay').setDescription('🤖 Toggle AutoPlay'),

  // Discovery
  new SlashCommandBuilder().setName('browse').setDescription('🎸 Open genre browser — 16 genres + Mood Rooms'),
  new SlashCommandBuilder().setName('room').setDescription('🎭 Activate a 24/7 Mood Room')
    .addStringOption(o=>o.setName('room').setDescription('Mood preset').setRequired(true).addChoices(
      {name:'❌ Off', value:'off'},
      {name:'🌙 Midnight Lo-Fi', value:'midnight-lofi'},
      {name:'🌊 Synthwave Lounge', value:'synthwave-lounge'},
      {name:'🌌 Ambient Void', value:'ambient-void'},
      {name:'⚔️ Raid Prep', value:'raid-prep'},
      {name:'🎉 Party Room', value:'party-room'},
      {name:'🎮 VGM Lounge', value:'vgm-lounge'},
      {name:'🔥 Metal Forge', value:'metal-forge'},
      {name:'💜 Chill R&B', value:'chill-rnb'},
    )),
  new SlashCommandBuilder().setName('eq').setDescription('🎛️ Equaliser preset (DJ only)')
    .addStringOption(o=>o.setName('preset').setDescription('EQ preset').setRequired(true).addChoices(
      {name:'⚖️ Flat (default)', value:'flat'},
      {name:'🔊 Bass Boost', value:'bassboost'},
      {name:'🌟 Nightcore', value:'nightcore'},
      {name:'🌊 Vaporwave', value:'vaporwave'},
      {name:'📢 Earrape ⚠️', value:'earrape'},
    )),

  // Dashboard
  new SlashCommandBuilder().setName('dashboard').setDescription('🎛️ Open live interactive music dashboard'),
  new SlashCommandBuilder().setName('launchpad').setDescription('🎛️ Open voice control panel'),

  // Playlists
  new SlashCommandBuilder().setName('save').setDescription('💾 Save current queue as playlist')
    .addStringOption(o=>o.setName('name').setDescription('Playlist name').setRequired(true)),
  new SlashCommandBuilder().setName('load').setDescription('📂 Load a saved playlist')
    .addStringOption(o=>o.setName('name').setDescription('Playlist name').setRequired(true)),
  new SlashCommandBuilder().setName('playlists').setDescription('📂 List saved playlists'),

  // Utility
  new SlashCommandBuilder().setName('seek').setDescription('⏩ Seek to position')
    .addIntegerOption(o=>o.setName('seconds').setDescription('Position in seconds').setRequired(true).setMinValue(0)),
  new SlashCommandBuilder().setName('lyrics').setDescription('🎤 Show lyrics for current or searched track')
    .addStringOption(o=>o.setName('query').setDescription('Track name (blank = current)').setRequired(false)),

  // Info
  new SlashCommandBuilder().setName('ping').setDescription('🏓 Bot latency and status'),
  new SlashCommandBuilder().setName('help').setDescription('📖 CONbot5 command reference'),
  new SlashCommandBuilder().setName('diagnosevoice').setDescription('🔬 Voice + stream diagnostics — troubleshoot playback'),
  new SlashCommandBuilder().setName('add').setDescription('➕ Add a song to queue (alias for /play)')\n    .addStringOption(o=>o.setName('query').setDescription('Song name or URL').setRequired(true)),
];

// ── COMMAND REGISTRATION ───────────────────────────────────────────────
async function registerCommands() {
  if (!DISCORD_CLIENT_ID) { console.warn('⚠️ CLIENT_ID missing — skipping command registration'); return; }
  const rest = new REST().setToken(DISCORD_BOT_TOKEN);
  try {
    const body = COMMANDS.map(c=>c.toJSON());
    if (DISCORD_GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), {body});
      console.log(`✅ Registered ${body.length} guild commands`);
    } else {
      await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {body});
      console.log(`✅ Registered ${body.length} global commands`);
    }
  } catch(e) { console.error('❌ Command registration:', e.message); }
}

// ── IN-MEMORY PLAYLIST STORE (upgrade to Redis/Supabase in production) ─
const playlists = new Map(); // `${guildId}:${name}` → track[]

// ── INTERACTION HANDLER ────────────────────────────────────────────────
bot.on(Events.InteractionCreate, async interaction => {
  try {

    // Buttons — launchpad
    if (interaction.isButton() && ['c5_launch_session','c5_launch_search','c5_launch_np','c5_launch_refresh'].includes(interaction.customId)) {
      await interaction.deferUpdate().catch(()=>{});
      await Engine.handleLaunchpadButton(interaction.customId, interaction, bot);
      const state = Engine.getState(interaction.guildId);
      if (interaction.customId === 'c5_launch_refresh' && state.launchpadMsgId && state.launchpadChId) {
        const ch = bot.channels.cache.get(state.launchpadChId);
        ch?.messages.fetch(state.launchpadMsgId).then(m=>m.edit({embeds:[Engine.buildLaunchpadEmbed(state,interaction.guild)],components:Engine.buildLaunchpadComponents(state)})).catch(()=>{});
      }
      return;
    }

    // Buttons
    if (interaction.isButton() && Engine.isButton(interaction.customId)) {
      return Engine.handleButton(interaction, bot);
    }
    // Selects
    if (interaction.isStringSelectMenu() && Engine.isSelect(interaction.customId)) {
      return Engine.handleSelect(interaction, bot);
    }

    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction.commandName;

    if ((cmd==='play'||cmd==='search') && !interaction.deferred) await interaction.deferReply();
    else if (!interaction.deferred) await interaction.deferReply();

    const state = Engine.getState(interaction.guildId);

    // ── PLAY / SEARCH ────────────────────────────────────────────────
    if (cmd==='play')   return await Engine.cmdPlay(interaction, bot);
    if (cmd==='search') {
      const q = interaction.options.getString('query');
      const results = await Engine.searchMultiple(q, 8);
      if (!results.length) return interaction.editReply('⚠️ No results found. If this keeps happening, the `YOUTUBE_COOKIE` env var may need refreshing — or try a direct YouTube URL.');
      const select = new StringSelectMenuBuilder().setCustomId('c5_search_pick')
        .setPlaceholder('🎵 Select a track...')
        .addOptions(results.slice(0,8).map((r,i)=>({
          label:`${i+1}. ${r.title.slice(0,75)}`, value:r.url,
          description:`${Engine.fmtTime(r.durationInSec)} · ${r.channel?.name?.slice(0,40)||'YouTube'}`,
        })));
      return interaction.editReply({embeds:[Engine.buildNowPlayingEmbed(state,0)], components:[new ActionRowBuilder().addComponents(select)]});
    }

    // ── SKIP ─────────────────────────────────────────────────────────
    if (cmd==='skip') return await Engine.cmdSkip(interaction, bot);

    // ── STOP ─────────────────────────────────────────────────────────
    if (cmd==='stop') return await Engine.cmdStop(interaction, bot);

    // ── PAUSE / RESUME ────────────────────────────────────────────────
    if (cmd==='pause') {
      const isDJ = !process.env.DJ_ROLE_ID || interaction.member?.roles?.cache?.has(process.env.DJ_ROLE_ID) || interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels);
      if (!isDJ) return interaction.editReply('⛔ DJ role required.');
      state.player?.pause(); state.paused=true;
      return interaction.editReply('⏸️ Paused.');
    }
    if (cmd==='resume') {
      const isDJ = !process.env.DJ_ROLE_ID || interaction.member?.roles?.cache?.has(process.env.DJ_ROLE_ID) || interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels);
      if (!isDJ) return interaction.editReply('⛔ DJ role required.');
      state.player?.unpause(); state.paused=false;
      return interaction.editReply('▶️ Resumed.');
    }

    // ── NOW PLAYING ───────────────────────────────────────────────────
    if (cmd==='nowplaying'||cmd==='np') {
      const elapsed = state.startedAt ? Math.floor((Date.now()-state.startedAt)/1000) : 0;
      return interaction.editReply({embeds:[Engine.buildNowPlayingEmbed(state,elapsed)]});
    }

    // ── QUEUE ─────────────────────────────────────────────────────────
    if (cmd==='queue') {
      const page = Math.max(0,(interaction.options.getInteger('page')||1)-1);
      return interaction.editReply({embeds:[Engine.buildQueueEmbed(state,page)]});
    }
    if (cmd==='history') return interaction.editReply({embeds:[Engine.buildHistoryEmbed(state)]});
    if (cmd==='clear') {
      const isDJ = !process.env.DJ_ROLE_ID || interaction.member?.roles?.cache?.has(process.env.DJ_ROLE_ID);
      if (!isDJ) return interaction.editReply('⛔ DJ role required.');
      const n=state.queue.length; state.queue=[]; state.moodBuffer=[];
      await Engine.updateDashboard(state, bot);
      return interaction.editReply(`🗑️ Cleared **${n}** track${n!==1?'s':''}.`);
    }
    if (cmd==='remove') {
      const isDJ = !process.env.DJ_ROLE_ID || interaction.member?.roles?.cache?.has(process.env.DJ_ROLE_ID);
      if (!isDJ) return interaction.editReply('⛔ DJ role required.');
      const pos = interaction.options.getInteger('position');
      if (pos<1||pos>state.queue.length) return interaction.editReply(`⚠️ Position 1–${state.queue.length}.`);
      const [r]=state.queue.splice(pos-1,1);
      return interaction.editReply(`✅ Removed **${r.title.slice(0,80)}**.`);
    }
    if (cmd==='move') {
      const isDJ = !process.env.DJ_ROLE_ID || interaction.member?.roles?.cache?.has(process.env.DJ_ROLE_ID);
      if (!isDJ) return interaction.editReply('⛔ DJ role required.');
      const from=interaction.options.getInteger('from')-1, to=interaction.options.getInteger('to')-1;
      if (from<0||from>=state.queue.length||to<0||to>=state.queue.length) return interaction.editReply(`⚠️ Positions 1–${state.queue.length}.`);
      const [t]=state.queue.splice(from,1); state.queue.splice(to,0,t);
      return interaction.editReply(`↕️ Moved **${t.title.slice(0,60)}** → position **${to+1}**.`);
    }

    // ── VOLUME ────────────────────────────────────────────────────────
    if (cmd==='volume') {
      const isDJ = !process.env.DJ_ROLE_ID || interaction.member?.roles?.cache?.has(process.env.DJ_ROLE_ID);
      if (!isDJ) return interaction.editReply('⛔ DJ role required.');
      const vol=interaction.options.getInteger('level');
      state.volume=vol;
      const ps=state.player?.state, eq=Engine.EQ[state.eq]||Engine.EQ.flat;
      if (ps?.resource?.volume) ps.resource.volume.setVolume((vol/100)*eq.mod);
      await Engine.updateDashboard(state, bot);
      return interaction.editReply(`🔊 Volume → **${vol}%**`);
    }

    // ── LOOP ──────────────────────────────────────────────────────────
    if (cmd==='loop') {
      const mode=interaction.options.getString('mode')||'track';
      if (mode==='track') { state.loop=!state.loop; await Engine.updateDashboard(state,bot); return interaction.editReply(state.loop?'🔂 Loop track **ON**':'🔂 Loop **OFF**'); }
      if (mode==='queue') { state.loopQueue=!state.loopQueue; await Engine.updateDashboard(state,bot); return interaction.editReply(state.loopQueue?'🔁 Queue loop **ON**':'🔁 Queue loop **OFF**'); }
      state.loop=false; state.loopQueue=false; await Engine.updateDashboard(state,bot);
      return interaction.editReply('🔂 Loop **OFF**');
    }

    // ── SHUFFLE ───────────────────────────────────────────────────────
    if (cmd==='shuffle') {
      state.shuffle=!state.shuffle;
      if (state.shuffle&&state.queue.length>1) {
        for(let k=state.queue.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[state.queue[k],state.queue[j]]=[state.queue[j],state.queue[k]];}
      }
      await Engine.updateDashboard(state, bot);
      return interaction.editReply(state.shuffle?'🔀 Shuffle **ON** — queue randomized!':'🔀 Shuffle **OFF**');
    }

    // ── AUTOPLAY ──────────────────────────────────────────────────────
    if (cmd==='autoplay') {
      state.autoplay=!state.autoplay;
      await Engine.updateDashboard(state, bot);
      return interaction.editReply(state.autoplay?'🤖 AutoPlay **ON**':'🤖 AutoPlay **OFF**');
    }

    // ── BROWSE ────────────────────────────────────────────────────────
    if (cmd==='browse') {
      return interaction.editReply({embeds:[Engine.buildGenreEmbed()], components:Engine.buildGenreComponents(state)});
    }

    // ── ROOM ──────────────────────────────────────────────────────────
    if (cmd==='room') {
      const isDJ = !process.env.DJ_ROLE_ID || interaction.member?.roles?.cache?.has(process.env.DJ_ROLE_ID);
      if (!isDJ) return interaction.editReply('⛔ DJ role required.');
      const room = interaction.options.getString('room');
      state.textChannelId = interaction.channelId;
      if (room==='off') {
        state.mood=null; state.moodBuffer=[]; state.autoplay=false;
        await Engine.updateDashboard(state,bot); return interaction.editReply('❌ Mood room disabled.');
      }
      const preset = Engine.MOODS[room];
      if (!preset) return interaction.editReply('⚠️ Unknown mood.');
      const vc = interaction.member?.voice?.channel;
      if (!vc) return interaction.editReply('⚠️ Join a voice channel first.');
      state.mood=room; state.moodBuffer=[]; state.volume=preset.vol;
      await Engine.ensureVC(state, vc, bot);
      if (!state.current||state.player?.state?.status!==1) await Engine.playNext(state,bot);
      await Engine.updateDashboard(state, bot);
      return interaction.editReply({embeds:[
        new EmbedBuilder().setColor(preset.color)
          .setTitle(`${preset.emoji} ${preset.label} Active`)
          .setDescription(`🔄 **Uninterrupted 24/7 stream active.**\nAEGIS auto-reconnects if disconnected.\n> 🎶 All voice members can add songs & vote-skip!`)
          .addFields({name:'🔊 Volume',value:`${preset.vol}%`,inline:true},{name:'🔁 Mode',value:'Infinite autoplay',inline:true})
          .setFooter(FT),
      ]});
    }

    // ── EQ ────────────────────────────────────────────────────────────
    if (cmd==='eq') {
      const isDJ = !process.env.DJ_ROLE_ID || interaction.member?.roles?.cache?.has(process.env.DJ_ROLE_ID);
      if (!isDJ) return interaction.editReply('⛔ DJ role required.');
      const preset=interaction.options.getString('preset'); state.eq=preset||'flat';
      const eq=Engine.EQ[state.eq]||Engine.EQ.flat;
      const ps=state.player?.state;
      if (ps?.resource?.volume) ps.resource.volume.setVolume((state.volume/100)*eq.mod);
      await Engine.updateDashboard(state, bot);
      return interaction.editReply({embeds:[new EmbedBuilder().setColor(C.cyan).setTitle('🎛️ EQ Updated').setDescription(`Preset set to **${eq.label}**`).setFooter(FT)]});
    }

    // ── DASHBOARD / LAUNCHPAD ─────────────────────────────────────────
    if (cmd==='dashboard') {
      const elapsed = state.startedAt ? Math.floor((Date.now()-state.startedAt)/1000) : 0;
      state.dashboardChId = interaction.channelId;
      const msg = await interaction.editReply({embeds:[Engine.buildNowPlayingEmbed(state,elapsed)],components:Engine.buildDashboardComponents(state),fetchReply:true});
      state.dashboardMsgId = msg.id;
      return;
    }
    if (cmd==='launchpad') {
      state.launchpadChId = interaction.channelId;
      const msg = await interaction.editReply({embeds:[Engine.buildControlPanel(state)],components:Engine.buildDashboardComponents(state),fetchReply:true});
      state.launchpadMsgId = msg.id;
      return;
    }

    // ── PLAYLISTS ─────────────────────────────────────────────────────
    if (cmd==='save') {
      const name=interaction.options.getString('name');
      const tracks=[...(state.current?[state.current]:[]),...state.queue];
      if (!tracks.length) return interaction.editReply('⚠️ Nothing in queue to save.');
      const key=`${interaction.guildId}:${name.toLowerCase()}`;
      playlists.set(key, tracks.slice(0,200));
      return interaction.editReply(`✅ Playlist **${name}** saved (${tracks.length} tracks).`);
    }
    if (cmd==='load') {
      const isDJ = !process.env.DJ_ROLE_ID || interaction.member?.roles?.cache?.has(process.env.DJ_ROLE_ID);
      if (!isDJ) return interaction.editReply('⛔ DJ role required.');
      const name=interaction.options.getString('name');
      const key=`${interaction.guildId}:${name.toLowerCase()}`;
      const pl=playlists.get(key);
      if (!pl) return interaction.editReply(`⚠️ Playlist **${name}** not found.`);
      const vc=interaction.member?.voice?.channel;
      if (!vc) return interaction.editReply('⚠️ Join a voice channel first.');
      state.textChannelId=interaction.channelId;
      await Engine.ensureVC(state,vc,bot);
      pl.forEach(t=>{ if(state.queue.length<500) state.queue.push({...t,requestedBy:interaction.user.username}); });
      if (!state.current) await Engine.playNext(state,bot);
      return interaction.editReply({embeds:[new EmbedBuilder().setColor(C.vio).setTitle(`📂 Loaded: ${name}`).setDescription(`Added **${pl.length}** tracks.`).setFooter(FT)]});
    }
    if (cmd==='playlists') {
      const prefix=`${interaction.guildId}:`;
      const list=[...playlists.entries()].filter(([k])=>k.startsWith(prefix)).map(([k,v])=>`• \`${k.slice(prefix.length)}\` — ${v.length} tracks`);
      if (!list.length) return interaction.editReply('📭 No saved playlists.');
      return interaction.editReply({embeds:[new EmbedBuilder().setColor(C.vio).setTitle('📂 Server Playlists').setDescription(list.join('\n')).setFooter(FT)]});
    }

    // ── SEEK ──────────────────────────────────────────────────────────
    if (cmd==='seek') {
      return interaction.editReply('⚠️ Seek requires re-streaming from timestamp. Upgrade the engine with ffmpeg seek filters for full seek support.');
    }

    // ── LYRICS ────────────────────────────────────────────────────────
    if (cmd==='lyrics') {
      const query = interaction.options.getString('query') || state.current?.title;
      if (!query) return interaction.editReply('⚠️ Nothing playing and no query provided.');
      return interaction.editReply({embeds:[new EmbedBuilder().setColor(C.cyan)
        .setTitle(`🎤 Lyrics — ${query.slice(0,60)}`)
        .setDescription('Lyrics integration requires a Genius API key.\n\nSet `GENIUS_API_KEY` in your `.env` file and the engine will fetch full lyrics.\n\nFor now: search `genius.com` for the track.')
        .addFields({name:'🔍 Quick Link', value:`[Search on Genius](https://genius.com/search?q=${encodeURIComponent(query)})`, inline:false})
        .setFooter(FT)]});
    }

    // ── DIAGNOSE VOICE ───────────────────────────────────────────────
    if (cmd==='diagnosevoice') return await Engine.cmdDiagnoseVoice(interaction, bot);

    // ── ADD (alias for play) ──────────────────────────────────────────
    if (cmd==='add') {
      interaction.options._hoistedOptions = interaction.options._hoistedOptions || [];
      // Reuse cmdPlay — it reads options.getString('query')
      return await Engine.cmdPlay(interaction, bot);
    }

    // ── PING ──────────────────────────────────────────────────────────
    if (cmd==='ping') {
      const mem = process.memoryUsage();
      const home = Engine.isHomeGuild(interaction.guildId);
      return interaction.editReply({embeds:[
        new EmbedBuilder().setColor(bot.ws.ping<100?C.green:bot.ws.ping<250?C.gold:C.red)
          .setTitle('🏓 CONbot5 System Status')
          .addFields(
            {name:'📡 WS Latency',   value:`${bot.ws.ping}ms`, inline:true},
            {name:'⏰ Uptime',        value:`${Math.floor(process.uptime()/3600)}h ${Math.floor((process.uptime()%3600)/60)}m`, inline:true},
            {name:'💾 Memory',        value:`${Math.round(mem.heapUsed/1024/1024)}MB`, inline:true},
            {name:'🔊 Active Queues', value:`${[...Engine.permanentRooms.values()].length} rooms`, inline:true},
            {name:'🎵 Engine',        value:'CONbot5 Supreme v6.0', inline:true},
            {name:'✨ Guild Tier',    value: home ? '🌈 Home Guild — Fully Unlocked' : 'Standard', inline:true},
          ).setFooter(FT).setTimestamp(),
      ]});
    }

    // ── HELP ──────────────────────────────────────────────────────────
    if (cmd==='help') {
      return interaction.editReply({embeds:[
        new EmbedBuilder().setColor(C.vio).setTitle('📖 CONbot5 Supreme — Command Reference')
          .addFields(
            {name:'▶️ Playback', value:'`/play` `/add` `/search` `/skip` `/stop` `/pause` `/resume` `/np`', inline:false},
            {name:'📋 Queue',    value:'`/queue` `/history` `/clear` `/remove` `/move`', inline:false},
            {name:'🎛️ Controls', value:'`/volume` `/loop` `/shuffle` `/autoplay` `/eq` `/seek`', inline:false},
            {name:'🎸 Discovery',value:'`/browse` `/room`', inline:false},
            {name:'🖥️ Dashboard', value:'`/dashboard` `/launchpad`', inline:false},
            {name:'📂 Playlists', value:'`/save` `/load` `/playlists`', inline:false},
            {name:'🎤 Extras',   value:'`/lyrics` `/ping` `/help` `/diagnosevoice`', inline:false},
          )
          .setDescription('> *CONbot5 Supreme — All sources. No limits. Infinite audio.*')
          .setFooter(FT),
      ]});
    }

  } catch(e) {
    const msg = e?.message || String(e||'');
    if (msg.includes('Unknown interaction')||msg.includes('429')||msg.includes('rate limit')) return;
    console.error(`❌ Command error:`, msg);
    try {
      if (interaction.deferred||interaction.replied) await interaction.editReply(`⚠️ ${msg.slice(0,200)}`);
      else await interaction.reply({content:`⚠️ ${msg.slice(0,200)}`, ephemeral:true});
    } catch {}
  }
});

// ── STATE → API SYNC ───────────────────────────────────────────────────
setInterval(async () => {
  if (!DISCORD_GUILD_ID) return;
  try {
    const state = Engine.getState(DISCORD_GUILD_ID);
    const elapsed = state.startedAt ? Math.floor((Date.now()-state.startedAt)/1000) : 0;
    await axios.post(`${API_URL}/state/${DISCORD_GUILD_ID}`, {
      current:    state.current || null,
      queue:      state.queue.slice(0,50),
      history:    state.history.slice(-20),
      volume:     state.volume,
      loop:       state.loop,
      loopQueue:  state.loopQueue,
      shuffle:    state.shuffle,
      autoplay:   state.autoplay,
      mood:       state.mood,
      paused:     state.paused,
      eq:         state.eq,
      elapsed,
      skipVotes:  [...state.skipVotes],
    }, {timeout:3000}).catch(()=>{});
  } catch {}
}, 2_000);

// ── WEB COMMAND POLL — bridges web dashboard → bot ─────────────────────
// Web/desktop POST to /commands/:guildId; bot polls and executes here
setInterval(async () => {
  if (!DISCORD_GUILD_ID) return;
  try {
    const r = await axios.get(`${API_URL}/commands/${DISCORD_GUILD_ID}`, {
      headers: { 'x-bot-token': process.env.API_BOT_TOKEN || 'conbot5-internal' },
      timeout: 3000,
    });
    const cmds = r.data?.commands || [];
    if (!cmds.length) return;
    const state = Engine.getState(DISCORD_GUILD_ID);

    for (const { command, payload } of cmds) {
      try {
        switch (command) {
          // ── PLAYBACK ──────────────────────────────────────────────
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
            clearInterval(state.progressTimer); state.player?.stop(true);
            state.connection?.destroy(); state.connection = null;
            try { bot.user.setActivity('🎵 CONbot5 Supreme | /play', {type:2}); } catch {}
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
              if (state.current) state.queue.unshift({...state.current});
              state.queue.unshift({...p});
              clearInterval(state.progressTimer); state.player?.stop();
            }
            break;
          // ── QUEUE ─────────────────────────────────────────────────
          case 'clear':
            state.queue = []; state.moodBuffer = [];
            await Engine.updateDashboard(state, bot);
            break;
          case 'remove': {
            const pos = parseInt(payload?.position) - 1;
            if (pos >= 0 && pos < state.queue.length) state.queue.splice(pos, 1);
            await Engine.updateDashboard(state, bot);
            break;
          }
          // ── CONTROLS ──────────────────────────────────────────────
          case 'volume': {
            const vol = Math.max(0, Math.min(100, parseInt(payload?.level) || 80));
            state.volume = vol;
            const ps = state.player?.state, eq = Engine.EQ[state.eq] || Engine.EQ.flat;
            if (ps?.resource?.volume) ps.resource.volume.setVolume((vol/100)*eq.mod);
            await Engine.updateDashboard(state, bot);
            break;
          }
          case 'shuffle':
            state.shuffle = !state.shuffle;
            if (state.shuffle && state.queue.length > 1) {
              for (let k=state.queue.length-1;k>0;k--) {
                const j=Math.floor(Math.random()*(k+1));
                [state.queue[k],state.queue[j]]=[state.queue[j],state.queue[k]];
              }
            }
            await Engine.updateDashboard(state, bot);
            break;
          case 'loop': {
            const mode = payload?.mode || 'track';
            if (mode==='track')  { state.loop=!state.loop; state.loopQueue=false; }
            if (mode==='queue')  { state.loopQueue=!state.loopQueue; state.loop=false; }
            if (mode==='off')    { state.loop=false; state.loopQueue=false; }
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
              const ps = state.player?.state, eq = Engine.EQ[preset];
              if (ps?.resource?.volume) ps.resource.volume.setVolume((state.volume/100)*eq.mod);
              await Engine.updateDashboard(state, bot);
            }
            break;
          }
          // ── MOOD / ROOM ────────────────────────────────────────────
          case 'mood':
          case 'room': {
            const room = payload?.room || payload?.mood;
            if (!room || room === 'off') {
              state.mood = null; state.moodBuffer = []; state.autoplay = false;
            } else if (Engine.MOODS[room]) {
              state.mood = room; state.moodBuffer = [];
              state.volume = Engine.MOODS[room].vol;
              if (!state.current || state.player?.state?.status !== 1) await Engine.playNext(state, bot);
            }
            await Engine.updateDashboard(state, bot);
            break;
          }
          // ── GENRE ─────────────────────────────────────────────────
          case 'genre': {
            const genre = Engine.GENRES[payload?.genre];
            if (!genre) break;
            const q = genre.q[Math.floor(Math.random()*genre.q.length)];
            const res = await Engine.searchMultiple(q, 10);
            const tracks = res.map(r=>Engine.mkTrack(r)).filter(t=>t&&t.duration>30&&t.duration<7200).slice(0,10);
            tracks.forEach(t=>{ t.requestedBy='Web'; if(state.queue.length<500) state.queue.push(t); });
            if (!state.current || state.player?.state?.status !== 1) await Engine.playNext(state, bot);
            else await Engine.updateDashboard(state, bot);
            break;
          }
        }
      } catch(e) { console.error(`[WebCmd] ${command}:`, e.message); }
    }
  } catch {}
}, 2_000);


// ── HEALTH SERVER ──────────────────────────────────────────────────────
const STATUS = { ready:false, readyAt:null };
http.createServer((req,res)=>{
  if (req.url==='/'||req.url==='/health') {
    res.writeHead(STATUS.ready?200:503,{'Content-Type':'application/json'});
    res.end(JSON.stringify({
      status:STATUS.ready?'ok':'starting',
      wsLatency:bot.ws.ping,
      uptime:STATUS.readyAt?Math.floor((Date.now()-STATUS.readyAt)/1000)+'s':'0s',
      heapMB:Math.round(process.memoryUsage().heapUsed/1024/1024),
      version:'CONbot5 v5.0',
    }));
  } else { res.writeHead(404); res.end(); }
}).listen(BOT_PORT, ()=>console.log(`💓 Health: :${BOT_PORT}`));

// ── READY ──────────────────────────────────────────────────────────────
bot.once(Events.ClientReady, async () => {
  STATUS.ready = true; STATUS.readyAt = Date.now();
  console.log(`\n🎵 CONbot5 Supreme v5.0 — ${bot.user.tag}`);
  console.log(`   Health: :${BOT_PORT} · Guild: ${DISCORD_GUILD_ID||'global'}`);
  bot.user.setActivity('🎵 CONbot5 Supreme | /play', {type:2});
  await registerCommands();
});

// ── PROCESS GUARDS ─────────────────────────────────────────────────────
const IGNORE = ['Unknown interaction','Unknown Message','Missing Access','Cannot send messages','Unknown Channel','429','rate limit'];
process.on('unhandledRejection', r => { const m=r?.message||String(r); if (!IGNORE.some(e=>m.includes(e))) console.error('❌ Rejection:',m); });
process.on('uncaughtException', (e,o) => console.error(`❌ Exception [${o}]:`,e.message));
process.on('SIGTERM', ()=>{ bot.destroy(); setTimeout(()=>process.exit(0),2000); });

// ── LOGIN ──────────────────────────────────────────────────────────────
const BACKOFF = [5,15,30,60,120];
let attempt = 0;
async function login() {
  attempt++;
  try { await bot.login(DISCORD_BOT_TOKEN); attempt=0; }
  catch(e) {
    const delay = BACKOFF[Math.min(attempt-1,BACKOFF.length-1)]*1000;
    console.error(`❌ Login attempt ${attempt} failed: ${e.message} — retry in ${delay/1000}s`);
    setTimeout(login, delay);
  }
}
login();

module.exports = bot;
