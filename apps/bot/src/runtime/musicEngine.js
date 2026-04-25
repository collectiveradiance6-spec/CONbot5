// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — MUSIC ENGINE v5.0 SUPREME
// Surpasses Rythm: multi-source, URL validation, mood rooms, EQ,
// vote-skip, title search, autoplay, 500-track queue, 100-track history
// ═══════════════════════════════════════════════════════════════════════
'use strict';

const {
  joinVoiceChannel, createAudioPlayer, createAudioResource,
  AudioPlayerStatus, VoiceConnectionStatus, entersState,
  getVoiceConnection, NoSubscriberBehavior, StreamType,
} = require('@discordjs/voice');
const playdl = require('play-dl');
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, PermissionFlagsBits,
} = require('discord.js');

// ── CONSTANTS ──────────────────────────────────────────────────────────
const MAX_QUEUE        = 500;
const HISTORY_MAX      = 100;
const VOTE_THRESHOLD   = 0.5;
const YT_SKIP_DELAY    = 1200;
const YT_GATE_COOLDOWN = 15_000;
const SEARCH_LIMIT     = 8;
const PULSE_MS         = parseInt(process.env.PULSE_INTERVAL || '25000');
const RECONNECT_MS     = parseInt(process.env.RECONNECT_DELAY || '5000');
const DJ_ROLE          = process.env.DJ_ROLE_ID || null;

// ── COOKIE INJECTION ───────────────────────────────────────────────────
try {
  const cookie = process.env.YOUTUBE_COOKIE || '';
  if (cookie && typeof playdl.setToken === 'function') {
    playdl.setToken({ youtube: { cookie } });
    console.log('🍪 YT cookie injected');
  }
} catch {}

// ── BOT GATE DETECTION ─────────────────────────────────────────────────
function isValidHttpUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isBotGate(err) {
  const m = String(err?.message || err || '');
  return /sign in to confirm/i.test(m) || /not a bot/i.test(m) || /while getting info/i.test(m);
}

// ── GENRE CATALOG ──────────────────────────────────────────────────────
const GENRES = {
  lofi:       { label:'🌙 Lo-Fi',        color:0x7B2FFF, q:['lofi hip hop chill study beats 1hr','midnight lofi focus mix deep'] },
  synthwave:  { label:'🌊 Synthwave',     color:0xFF4CD2, q:['synthwave retrowave mix 2024','outrun neon night drive 80s'] },
  ambient:    { label:'🌌 Ambient',       color:0x00D4FF, q:['dark ambient space music 1hr','cosmic ambient meditation focus'] },
  epicbattle: { label:'⚔️ Epic Battle',   color:0xFF4500, q:['epic battle orchestral cinematic','boss fight music intense dramatic'] },
  hiphop:     { label:'🎤 Hip-Hop',       color:0xFFB800, q:['hip hop beats instrumental 2024','chill hip hop playlist best'] },
  electronic: { label:'⚡ Electronic',    color:0x00FF88, q:['electronic edm gaming mix 2024','progressive house techno focus'] },
  rock:       { label:'🎸 Rock',          color:0xFF6B35, q:['rock gaming music hard mix','alternative rock greatest hits'] },
  jazz:       { label:'🎷 Jazz',          color:0xC9A96E, q:['smooth jazz instrumental cafe','jazz focus study music piano'] },
  classical:  { label:'🎻 Classical',     color:0xE8D5B7, q:['epic orchestral classical music','cinematic classical dramatic'] },
  kpop:       { label:'🌸 K-Pop',         color:0xFF69B4, q:['kpop playlist 2024 best hits','kpop bts blackpink trending'] },
  vgm:        { label:'🎮 VGM / OST',     color:0x4ECDC4, q:['video game soundtrack best ost','iconic gaming ost collection'] },
  party:      { label:'🎉 Party / Hype',  color:0xFFD700, q:['party mix 2024 hype energy','best party songs club hits'] },
  metal:      { label:'🔥 Metal',         color:0x8B0000, q:['heavy metal power gaming mix','best metal songs headbang'] },
  rnb:        { label:'💜 R&B / Soul',    color:0x9B59B6, q:['rnb soul music playlist chill','smooth rnb neo soul vibes'] },
  country:    { label:'🤠 Country',       color:0xD2691E, q:['country music best hits 2024','country pop playlist modern'] },
  reggae:     { label:'🌴 Reggae',        color:0x2ECC71, q:['reggae best hits chill summer','roots reggae classic dancehall'] },
};

// ── MOOD PRESETS ───────────────────────────────────────────────────────
const MOODS = {
  'midnight-lofi':    { label:'🌙 Midnight Lo-Fi',  genre:'lofi',       vol:60, color:0x7B2FFF, emoji:'🌙' },
  'synthwave-lounge': { label:'🌊 Synthwave Lounge', genre:'synthwave',  vol:70, color:0xFF4CD2, emoji:'🌊' },
  'ambient-void':     { label:'🌌 Ambient Void',     genre:'ambient',    vol:50, color:0x00D4FF, emoji:'🌌' },
  'raid-prep':        { label:'⚔️ Raid Prep',         genre:'epicbattle', vol:85, color:0xFF4500, emoji:'⚔️' },
  'party-room':       { label:'🎉 Party Room',        genre:'party',      vol:80, color:0xFFD700, emoji:'🎉' },
  'vgm-lounge':       { label:'🎮 VGM Lounge',        genre:'vgm',        vol:65, color:0x4ECDC4, emoji:'🎮' },
  'metal-forge':      { label:'🔥 Metal Forge',       genre:'metal',      vol:80, color:0x8B0000, emoji:'🔥' },
  'chill-rnb':        { label:'💜 Chill R&B',         genre:'rnb',        vol:65, color:0x9B59B6, emoji:'💜' },
};

// ── EQ PRESETS ─────────────────────────────────────────────────────────
const EQ = {
  flat:      { label:'⚖️ Flat',      mod:1.0 },
  bassboost: { label:'🔊 Bass+',     mod:1.15 },
  nightcore: { label:'🌟 Nightcore', mod:0.9  },
  vaporwave: { label:'🌊 Vapor',     mod:0.85 },
  earrape:   { label:'📢 Earrape',   mod:1.5  },
};

// ── STATE ──────────────────────────────────────────────────────────────
const guildStates    = new Map();
const permanentRooms = new Map();

class MusicState {
  constructor(gid) {
    this.guildId       = gid;
    this.queue         = [];
    this.history       = [];
    this.current       = null;
    this.player        = null;
    this.connection    = null;
    this.voiceChannelId = null;
    this.textChannelId  = null;
    this.dashboardMsgId = null;
    this.dashboardChId  = null;
    this.launchpadMsgId = null;
    this.launchpadChId  = null;
    this.volume        = 80;
    this.loop          = false;
    this.loopQueue     = false;
    this.shuffle       = false;
    this.autoplay      = false;
    this.mood          = null;
    this.moodBuffer    = [];
    this.eq            = 'flat';
    this.skipVotes     = new Set();
    this.startedAt     = null;
    this.paused        = false;
    this.progressTimer = null;
    this.client        = null;
    this._lastGate     = 0;
    this._wsCallback   = null; // called after every state change
  }
}

function getState(gid) {
  if (!guildStates.has(gid)) guildStates.set(gid, new MusicState(gid));
  return guildStates.get(gid);
}

// ── HELPERS ────────────────────────────────────────────────────────────
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}
function progBar(cur, tot, len=20) {
  const f = tot>0 ? Math.round(Math.min(cur/tot,1)*len) : 0;
  return '█'.repeat(f) + '░'.repeat(len-f);
}
const FT = { text:'CONbot5 Supreme • Music Intelligence', iconURL:'https://theconclavedominion.com/conclave-badge.png' };

function isDJ(member) {
  if (!DJ_ROLE) return true;
  return member?.roles?.cache?.has(DJ_ROLE) || member?.permissions?.has(PermissionFlagsBits.ManageChannels);
}
function isInVoice(member, state) {
  if (!state.voiceChannelId) return false;
  return !!member?.guild?.channels?.cache?.get(state.voiceChannelId)?.members?.has(member.id);
}
function vcSize(state, guild) {
  return guild?.channels?.cache?.get(state.voiceChannelId)?.members?.filter(m=>!m.user.bot).size || 1;
}

// ── TRACK ──────────────────────────────────────────────────────────────
function mkTrack(yt, url=null, src='youtube', thumb=null) {
  const rawUrl = url || yt?.url || yt?.link || null;
  if (!rawUrl || !rawUrl.startsWith('http')) return null;
  return {
    title:     yt?.title || 'Unknown Track',
    url:       rawUrl,
    duration:  yt?.durationInSec ?? yt?.duration ?? 0,
    thumbnail: thumb || yt?.thumbnails?.[0]?.url || null,
    source:    src,
    ytId:      yt?.id || null,
    addedAt:   Date.now(),
  };
}

async function resolveTrack(query) {
  try {
    const isUrl = /^https?:\/\//.test(query);
    if (isUrl) {
      // Normalize before any playdl call — prevents "Invalid URL" from youtu.be or malformed params
      const normalized = normalizeYouTubeUrl(query) || query;
      if (query.includes('spotify.com')) {
        const sp = await playdl.spotify(query).catch(()=>null);
        if (!sp) return null;
        if (sp.type === "track") {
  const yt = await playdl.search(`${sp.name} ${sp.artists?.[0]?.name || ""}`, {
    source: { youtube: "video" },
    limit: 1,
  });

  if (!yt[0]) return null;

  const mapped = mkTrack(yt[0], yt[0].url, "youtube", sp.thumbnail?.url);
  if (mapped) {
    mapped.spotifyUrl = query;
    mapped.source = "spotify→youtube";
    mapped.title = `${sp.name} — ${sp.artists?.[0]?.name || "Spotify"}`;
  }

  return mapped;
}
        if (sp.type==='playlist'||sp.type==='album') {
          const all = await sp.all_tracks();
          return all.slice(0,100).map(t => mkTrack({title:`${t.name} — ${t.artists?.[0]?.name||''}`, url:t.url, durationInSec:t.durationInSec||0, thumbnails:[{url:t.thumbnail?.url}]}, t.url, 'spotify'));
        }
        return null;
      }
      if (query.includes('soundcloud.com')) {
        const sc = await playdl.soundcloud(normalized);
        return { title:sc.name, url:normalized, duration:sc.durationInSec||0, thumbnail:sc.thumbnail||null, source:'soundcloud', addedAt:Date.now() };
      }
      if (query.includes('list=')) {
        const pl = await playdl.playlist_info(normalized, {incomplete:true}).catch(()=>null);
        if (pl) { const v = await pl.all_videos(); return v.slice(0,100).map(r=>mkTrack(r)).filter(Boolean); }
      }
      const info = await playdl.video_info(normalized);
      const d = info.video_details;
      return mkTrack(d, normalized, 'youtube');
    }
    const res = await playdl.search(query, {source:{youtube:'video'}, limit:1});
    return res[0] ? mkTrack(res[0]) : null;
  } catch (e) { console.error('[Engine] resolve:', e.message); return null; }
}

async function searchMultiple(q, limit=SEARCH_LIMIT) {
  try {
    const res = await playdl.search(q, {source:{youtube:'video'}, limit});
    // Normalize all result URLs so stream() gets valid watch URLs
    for (const r of res) {
      if (r.url) r.url = normalizeYouTubeUrl(r.url) || r.url;
    }
    return res;
  } catch (e) {
    console.error('[Engine] searchMultiple:', e.message);
    // Likely YouTube token issue — log actionable hint
    if (e.message?.toLowerCase().includes('sign in') || e.message?.toLowerCase().includes('token') || e.message?.toLowerCase().includes('cookie')) {
      console.warn('[Engine] ⚠️  Set YOUTUBE_COOKIE env var to fix search failures. See https://github.com/play-dl/play-dl#setup');
    }
    return [];
  }
}

function normalizeYouTubeUrl(url) {
  if (!url) return null;
  // youtu.be/ID → full watch URL
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) return `https://www.youtube.com/watch?v=${short[1]}`;
  // Already a watch URL — strip extra params that confuse playdl
  const watch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watch) return `https://www.youtube.com/watch?v=${watch[1]}`;
  // SoundCloud / direct — return as-is
  return url;
}

async function getStream(track) {
  const original = track?.url;
  const canonical = normalizeYouTubeUrl(original);

  if (!isValidHttpUrl(canonical)) {
    throw new Error(`Invalid track URL: ${String(original || "missing")}`);
  }

  if (canonical.includes("spotify.com")) {
    throw new Error("Spotify links need metadata resolution before playback");
  }

  const opts = {
    quality: 2,
    precache: 3,
    discordPlayerCompatibility: true,
  };

  try {
    return await playdl.stream(canonical, opts);
  } catch (e1) {
    console.warn("[Engine] stream primary failed:", e1.message);

    try {
      return await playdl.stream(canonical, { ...opts, quality: 1 });
    } catch (e2) {
      console.warn("[Engine] stream fallback failed:", e2.message);

      throw e2;
    }
  }
}

// ── MOOD BUFFER ────────────────────────────────────────────────────────
async function getMoodTrack(state) {
  if (state.moodBuffer.length) return state.moodBuffer.shift();
  const mood  = MOODS[state.mood]; if (!mood) return null;
  const genre = GENRES[mood.genre]; if (!genre) return null;
  try {
    const q   = genre.q[Math.floor(Math.random()*genre.q.length)];
    const res = await playdl.search(q, {source:{youtube:'video'}, limit:10});
    state.moodBuffer = res.map(r=>mkTrack(r)).filter(t=>t && t.duration>60 && t.duration<7200);
    for (let i=state.moodBuffer.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [state.moodBuffer[i],state.moodBuffer[j]]=[state.moodBuffer[j],state.moodBuffer[i]];
    }
    return state.moodBuffer.shift()||null;
  } catch { return null; }
}

// ── PLAYBACK ───────────────────────────────────────────────────────────
async function playNext(state, client) {
  if (!state.connection || !state.voiceChannelId) return;

  if (state.current) {
    state.history.push({...state.current, playedAt:new Date().toISOString()});
    if (state.history.length > HISTORY_MAX) state.history.shift();
  }

  let track = null;
  if (state.loop && state.current) {
    track = state.current;
  } else if (state.queue.length) {
    if (state.shuffle) {
      const idx = Math.floor(Math.random()*state.queue.length);
      track = state.queue.splice(idx,1)[0];
    } else { track = state.queue.shift(); }
    if (state.loopQueue && state.current) state.queue.push(state.current);
  } else if (state.mood) {
    track = await getMoodTrack(state);
  } else if (state.autoplay && state.current) {
    const terms = state.current.title.split(' ').slice(0,4).join(' ');
    const res = await playdl.search(`${terms} similar mix`, {source:{youtube:'video'}, limit:5}).catch(()=>[]);
    const candidates = res.map(r=>mkTrack(r)).filter(t=>t && !state.history.some(h=>h.url===t.url));
    track = candidates[0] || null;
  }

  if (!track || !track.url || !track.url.startsWith('http')) {
    if (track) console.warn('[Engine] Skipping invalid URL track:', track.title);
    state.current=null; state.paused=false;
    await updateDashboard(state, client);
    return;
  }

  state.current   = {...track, startTime:Date.now(), requestedBy:track.requestedBy||'AutoPlay'};
  state.startedAt = Date.now();
  state.paused    = false;
  state.skipVotes.clear();

  // update bot status
  try { client.user.setActivity(`🎵 ${track.title.slice(0,120)}`, {type:2}); } catch {}
  // notify WS
  if (state._wsCallback) state._wsCallback('track_start', state);

  try {
    const stream   = await getStream(track);
    const eq       = EQ[state.eq] || EQ.flat;
    const resource = createAudioResource(stream.stream, {inputType:stream.type||StreamType.Opus, inlineVolume:true});
    resource.volume?.setVolume((state.volume/100)*eq.mod);
    state.player.play(resource);

    clearInterval(state.progressTimer);
    let elapsed = 0;
    state.progressTimer = setInterval(async() => {
      if (!state.paused) elapsed += 15;
      await updateDashboard(state, client, elapsed);
      if (state._wsCallback) state._wsCallback('tick', {guildId:state.guildId, elapsed});
    }, 15_000);

    await updateDashboard(state, client, 0);
    await postNowPlaying(state, client);

  } catch (e) {
    console.error('[Engine] playNext stream:', e.message);
    clearInterval(state.progressTimer);
    const ch = client.channels.cache.get(state.textChannelId);
    const now = Date.now();
    if (isBotGate(e)) {
      if (now - state._lastGate > YT_GATE_COOLDOWN) {
        state._lastGate = now;
        ch?.send('⚠️ YouTube bot-gate — skipping. Try a Spotify/SoundCloud URL.').catch(()=>{});
      }
    } else {
      ch?.send(`⚠️ Track failed: \`${e.message.slice(0,80)}\` — skipping.`).catch(()=>{});
    }
    state.current=null; state.paused=false;
    await updateDashboard(state, client, 0);
    setTimeout(()=>playNext(state, client), YT_SKIP_DELAY);
  }
}

// ── VOICE CONNECTION ───────────────────────────────────────────────────
async function ensureVC(state, vc, client) {
  const ex = getVoiceConnection(state.guildId);
  if (ex && state.connection===ex) return ex;

  const conn = joinVoiceChannel({
    channelId: vc.id, guildId: state.guildId,
    adapterCreator: vc.guild.voiceAdapterCreator,
    selfDeaf:true, selfMute:false,
  });

  state.connection     = conn;
  state.voiceChannelId = vc.id;
  state.client         = client;

  if (!state.player) {
    state.player = createAudioPlayer({behaviors:{noSubscriber:NoSubscriberBehavior.Pause}});
    state.player.on(AudioPlayerStatus.Idle, () => {
      clearInterval(state.progressTimer);
      try { client.user.setActivity('🎵 CONbot5 Supreme | /play', {type:2}); } catch {}
      setTimeout(()=>playNext(state, client), 300);
    });
    state.player.on('error', e => {
      console.error('[Engine] player err:', e.message);
      clearInterval(state.progressTimer);
      state.current=null; state.paused=false;
      setTimeout(()=>playNext(state, client), YT_SKIP_DELAY);
    });
  }

  conn.subscribe(state.player);

  conn.on(VoiceConnectionStatus.Disconnected, async() => {
    try {
      await Promise.race([
        entersState(conn, VoiceConnectionStatus.Signalling, 5_000),
        entersState(conn, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      if (state.mood||state.autoplay||permanentRooms.has(state.guildId)) {
        setTimeout(async()=>{
          try {
            const g  = client.guilds.cache.get(state.guildId);
            const ch = g?.channels.cache.get(state.voiceChannelId);
            if (ch) { await ensureVC(state,ch,client); if(!state.current||state.player?.state?.status!==AudioPlayerStatus.Playing) await playNext(state,client); }
          } catch {}
        }, RECONNECT_MS);
      } else { conn.destroy(); state.connection=null; }
    }
  });

  return conn;
}

// ── EMBED BUILDERS ─────────────────────────────────────────────────────
function buildNowPlayingEmbed(state, elapsed=0) {
  const t    = state.current;
  const mood = state.mood ? MOODS[state.mood] : null;
  const eq   = EQ[state.eq] || EQ.flat;
  const color = mood?.color ?? 0x56D9FF;

  const p   = t ? Math.min(elapsed/Math.max(t.duration,1)*100, 100) : 0;
  const bar = t ? progBar(elapsed, t.duration) : '─'.repeat(20);
  const time = t ? `${fmtTime(elapsed)} / ${fmtTime(t.duration)}` : '0:00 / 0:00';

  const badges = [
    state.loop      ? '`🔂 LOOP`'    : null,
    state.loopQueue ? '`🔁 Q-LOOP`'  : null,
    state.shuffle   ? '`🔀 SHUFFLE`' : null,
    state.autoplay  ? '`🤖 AUTO`'    : null,
    state.paused    ? '`⏸ PAUSED`'  : null,
    state.eq !== 'flat' ? `\`${eq.label}\`` : null,
    mood ? `\`${mood.emoji} ${mood.label}\`` : null,
  ].filter(Boolean).join(' ');

  const nextUp = state.queue.slice(0,3).map((x,i)=>`\`${i+1}.\` ${x.title.slice(0,44)}`).join('\n') || '_Queue empty — search or pick a genre_';

  const emb = new EmbedBuilder()
    .setColor(color)
    .setAuthor({name:'🎵 CONbot5 Supreme — Now Playing', iconURL:'https://theconclavedominion.com/conclave-badge.png'})
    .setTimestamp().setFooter(FT);

  if (t) {
    emb.setTitle(t.title.slice(0,256)).setURL(t.url)
       .setThumbnail(t.thumbnail || 'https://theconclavedominion.com/conclave-badge.png')
       .setDescription([
         `\`${bar}\` **${Math.round(p)}%**`,
         `\`${time}\``,
         '',
         badges || '▶️ Playing',
         '',
         `🔊 **Vol** ${state.volume}%  ·  📋 **Queue** ${state.queue.length}  ·  📜 **History** ${state.history.length}`,
       ].join('\n'))
       .addFields(
         {name:'🎶 Up Next', value:nextUp, inline:false},
         {name:'🎤 Added by', value:t.requestedBy||'AutoPlay', inline:true},
         {name:'📡 Source', value:(t.source||'YouTube').toUpperCase(), inline:true},
         {name:'⏱️ Duration', value:fmtTime(t.duration), inline:true},
       );
  } else {
    emb.setTitle('⏹️ Nothing Playing')
       .setDescription('Type `/play <song name>` to start streaming.\nOr browse genres and Mood Rooms below.\n> *CONbot5 Supreme — All sources, zero limits*');
  }
  return emb;
}

function buildControlPanel(state) {
  const mood  = state.mood ? MOODS[state.mood] : null;
  const color = mood?.color ?? 0x56D9FF;
  const t     = state.current;
  const emb   = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${mood?.emoji??'🎛️'} CONbot5 — Control Panel`)
    .setFooter({...FT, text:`${FT.text} · All voice members can interact`})
    .setTimestamp();
  if (t) {
    emb.setDescription(`**▶️ ${t.title.slice(0,80)}**\nby **${t.requestedBy||'AutoPlay'}**`).setThumbnail(t.thumbnail||null);
  } else {
    emb.setDescription('_Idle — use controls below or `/play <song name>`_');
  }
  emb.addFields(
    {name:'📋 Queue', value:`${state.queue.length} track${state.queue.length!==1?'s':''}`, inline:true},
    {name:'🔊 Volume', value:`${state.volume}%`, inline:true},
    {name:'🎭 Mood', value:mood?.label||'Manual', inline:true},
    {name:'🔂 Loop', value:state.loop?'Track':state.loopQueue?'Queue':'Off', inline:true},
    {name:'🔀 Shuffle', value:state.shuffle?'ON':'Off', inline:true},
    {name:'🤖 AutoPlay', value:state.autoplay?'ON':'Off', inline:true},
  );
  return emb;
}

function buildDashboardComponents(state) {
  const playing = state.player?.state?.status === AudioPlayerStatus.Playing;
  const hasQ    = state.queue.length > 0 || !!state.current;
  const r1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('c5_prev')     .setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c5_playpause').setEmoji(playing?'⏸️':'▶️').setStyle(playing?ButtonStyle.Primary:ButtonStyle.Success).setDisabled(!hasQ),
    new ButtonBuilder().setCustomId('c5_skip')     .setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(!hasQ),
    new ButtonBuilder().setCustomId('c5_stop')     .setEmoji('⏹️').setStyle(ButtonStyle.Danger).setDisabled(!hasQ),
    new ButtonBuilder().setCustomId('c5_refresh')  .setEmoji('🔄').setStyle(ButtonStyle.Secondary),
  );
  const r2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('c5_vol_dn').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c5_vol_up').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c5_loop')  .setEmoji('🔂').setStyle(state.loop?ButtonStyle.Success:ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c5_loopq') .setEmoji('🔁').setStyle(state.loopQueue?ButtonStyle.Success:ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c5_shuffle').setEmoji('🔀').setStyle(state.shuffle?ButtonStyle.Success:ButtonStyle.Secondary),
  );
  const r3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('c5_queue')   .setLabel('📋 Queue')  .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c5_history') .setLabel('📜 History').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c5_autoplay').setLabel('🤖 Auto')   .setStyle(state.autoplay?ButtonStyle.Success:ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c5_browse')  .setLabel('🎸 Browse') .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c5_clear')   .setLabel('🗑️ Clear')  .setStyle(ButtonStyle.Danger).setDisabled(!state.queue.length),
  );
  const r4 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('c5_mood').setPlaceholder('🎭 Mood Room — 24/7 autoplay...')
      .addOptions([
        {label:'❌ Off — Manual Queue', value:'off', emoji:'❌'},
        ...Object.entries(MOODS).map(([k,v])=>({label:v.label, value:k, emoji:v.emoji, default:state.mood===k})),
      ]),
  );
  return [r1,r2,r3,r4];
}

function buildSearchEmbed(results, query) {
  return new EmbedBuilder()
    .setColor(0x56D9FF)
    .setTitle(`🔍 "${query.slice(0,60)}"`)
    .setDescription(results.map((r,i)=>`**${i+1}.** [${r.title.slice(0,64)}](${r.url})\n└ \`${fmtTime(r.durationInSec)}\` · ${r.channel?.name||'YouTube'}`).join('\n\n'))
    .setFooter({...FT, text:`${results.length} results · Select one below`});
}

function buildQueueEmbed(state, page=0) {
  const PER = 10, total = state.queue.length, pages = Math.ceil(total/PER)||1;
  const slice = state.queue.slice(page*PER,(page+1)*PER);
  const totalDur = state.queue.reduce((s,t)=>s+(t.duration||0),0);
  const emb = new EmbedBuilder().setColor(0x56D9FF)
    .setTitle(`📋 Queue · ${total} Track${total!==1?'s':''} · ${fmtTime(totalDur)} total`)
    .setFooter({text:`Page ${page+1}/${pages} · ${FT.text}`}).setTimestamp();
  if (!total) { emb.setDescription('_Queue empty. Use `/play <song name>` or browse genres!_'); return emb; }
  emb.setDescription(slice.map((t,i)=>`**${page*PER+i+1}.** [${t.title.slice(0,52)}](${t.url}) \`${fmtTime(t.duration)}\` · ${t.requestedBy||'Auto'}`).join('\n'));
  if (state.current) emb.addFields({name:'▶️ Now Playing', value:`[${state.current.title.slice(0,70)}](${state.current.url})`});
  return emb;
}

function buildHistoryEmbed(state) {
  const h = [...state.history].reverse().slice(0,20);
  if (!h.length) return new EmbedBuilder().setColor(0x56D9FF).setTitle('📜 History').setDescription('_No tracks played yet._').setFooter(FT);
  return new EmbedBuilder().setColor(0x56D9FF)
    .setTitle(`📜 Play History · ${state.history.length} tracks`)
    .setDescription(h.map((t,i)=>`\`${i+1}.\` [${t.title.slice(0,55)}](${t.url}) · ${t.requestedBy||'Auto'}`).join('\n'))
    .setFooter(FT).setTimestamp();
}

function buildGenreEmbed() {
  return new EmbedBuilder().setColor(0x56D9FF).setTitle('🎸 CONbot5 Genre Browser')
    .setDescription('Pick a genre to instantly load 10 tracks, or select a **Mood Room** for 24/7 infinite autoplay.\n> 🎶 All voice members can add songs & vote-skip!')
    .addFields(
      {name:'🎸 Genres (16)', value:Object.values(GENRES).map(g=>g.label).join(' · '), inline:false},
      {name:'🎭 Mood Rooms', value:Object.values(MOODS).map(m=>`${m.emoji} ${m.label}`).join(' · '), inline:false},
    ).setFooter(FT).setTimestamp();
}

function buildGenreComponents(state) {
  const entries = Object.entries(GENRES);
  return [
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('c5_genre_a').setPlaceholder('🎸 Pick a genre...')
      .addOptions(entries.slice(0,8).map(([k,v])=>({label:v.label, value:k})))),
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('c5_genre_b').setPlaceholder('🎸 More genres...')
      .addOptions(entries.slice(8).map(([k,v])=>({label:v.label, value:k})))),
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('c5_mood').setPlaceholder('🎭 Or pick a 24/7 Mood Room...')
      .addOptions([{label:'❌ Off',value:'off',emoji:'❌'}, ...Object.entries(MOODS).map(([k,v])=>({label:v.label,value:k,emoji:v.emoji,default:state.mood===k}))])),
  ];
}

// ── MESSAGE MANAGEMENT ─────────────────────────────────────────────────
async function postNowPlaying(state, client) {
  const ch = client.channels.cache.get(state.textChannelId); if (!ch) return;
  try { await ch.send({embeds:[buildNowPlayingEmbed(state,0)]}); } catch {}
}

async function updateDashboard(state, client, elapsed) {
  if (elapsed===undefined) elapsed = state.startedAt ? Math.floor((Date.now()-state.startedAt)/1000) : 0;
  const updates = [];
  if (state.launchpadMsgId && state.launchpadChId) {
    const ch = client.channels.cache.get(state.launchpadChId);
    if (ch) updates.push(ch.messages.fetch(state.launchpadMsgId).then(m=>m.edit({embeds:[buildControlPanel(state)],components:buildDashboardComponents(state)})).catch(()=>{}));
  }
  if (state.dashboardMsgId && state.dashboardChId) {
    const ch = client.channels.cache.get(state.dashboardChId);
    if (ch) updates.push(ch.messages.fetch(state.dashboardMsgId).then(m=>m.edit({embeds:[buildNowPlayingEmbed(state,elapsed)],components:buildDashboardComponents(state)})).catch(()=>{}));
  }
  await Promise.allSettled(updates);
}

// ── COMMAND HANDLERS ───────────────────────────────────────────────────
async function cmdPlay(i, client) {
  const vc = i.member?.voice?.channel;
  if (!vc) return i.editReply('⚠️ Join a voice channel first!');
  const query = i.options.getString('query');
  const state = getState(i.guildId);
  state.textChannelId = i.channelId;
  await ensureVC(state, vc, client);

  if (/^https?:\/\//.test(query)) {
    await i.editReply(`🔍 Loading: \`${query.slice(0,80)}\`...`);
    const result = await resolveTrack(query);
    if (!result) return i.editReply('⚠️ Could not load URL.');
    if (Array.isArray(result)) {
      const valid = result.filter(Boolean);
      valid.forEach(t=>{ if(state.queue.length<MAX_QUEUE) state.queue.push({...t,requestedBy:i.user.username}); });
      if (!state.current) await playNext(state, client);
      return i.editReply({content:null, embeds:[new EmbedBuilder().setColor(0x56D9FF).setTitle('📂 Playlist Added').setDescription(`Added **${valid.length}** tracks.`).setFooter(FT)]});
    }
    result.requestedBy = i.user.username;
    if (state.queue.length>=MAX_QUEUE) return i.editReply('⚠️ Queue full (500 max).');
    state.queue.push(result);
    const wasEmpty = state.queue.length===1 && !state.current;
    if (wasEmpty) await playNext(state, client);
    return i.editReply({content:null, embeds:[new EmbedBuilder()
      .setColor(wasEmpty?0x00D4FF:0x56D9FF)
      .setTitle(wasEmpty?'▶️ Now Playing':'📋 Added to Queue')
      .setDescription(`**[${result.title}](${result.url})**`)
      .setThumbnail(result.thumbnail||null)
      .addFields({name:'⏱️ Duration',value:fmtTime(result.duration),inline:true},{name:wasEmpty?'📡 Source':'📍 Position',value:wasEmpty?(result.source||'YouTube'):`#${state.queue.length}`,inline:true})
      .setFooter(FT)]});
  }

  await i.editReply(`🔍 Searching: \`${query.slice(0,80)}\`...`);
  const results = await searchMultiple(query, SEARCH_LIMIT);
  if (!results.length) return i.editReply('⚠️ No results found. If this keeps happening, the `YOUTUBE_COOKIE` env var may need refreshing — or try a direct YouTube URL.');

  const select = new StringSelectMenuBuilder().setCustomId('c5_search_pick')
    .setPlaceholder(`🎵 Pick from ${results.length} results...`)
    .addOptions(results.slice(0,8).map((r,idx)=>({
      label:`${idx+1}. ${r.title.slice(0,75)}`,
      value:r.url,
      description:`${fmtTime(r.durationInSec)} · ${r.channel?.name?.slice(0,40)||'YouTube'}`,
    })));

  return i.editReply({embeds:[buildSearchEmbed(results.slice(0,8),query)], components:[new ActionRowBuilder().addComponents(select)]});
}

async function cmdSkip(i, client) {
  const state = getState(i.guildId);
  if (!state.current) return i.editReply('⚠️ Nothing playing.');
  if (isDJ(i.member)||state.current.requestedBy===i.user.username) {
    clearInterval(state.progressTimer); const s=state.current.title; state.player?.stop();
    return i.editReply({embeds:[new EmbedBuilder().setColor(0xFFB800).setDescription(`⏭️ Skipped **${s.slice(0,80)}**`).setFooter(FT)]});
  }
  if (!isInVoice(i.member,state)) return i.editReply('⚠️ Join the voice channel to vote!');
  const need = Math.ceil(vcSize(state,i.guild)*VOTE_THRESHOLD);
  state.skipVotes.add(i.user.id);
  if (state.skipVotes.size>=need) {
    clearInterval(state.progressTimer); const s=state.current.title; state.player?.stop();
    return i.editReply({embeds:[new EmbedBuilder().setColor(0xFFB800).setDescription(`⏭️ Vote skip passed! Skipped **${s.slice(0,80)}**`).setFooter(FT)]});
  }
  return i.editReply(`🗳️ Skip vote: **${state.skipVotes.size}/${need}**. ${need-state.skipVotes.size} more needed.`);
}

async function cmdStop(i, client) {
  if (!isDJ(i.member)) return i.editReply('⛔ DJ role required.');
  const state = getState(i.guildId);
  state.queue=[]; state.current=null; state.mood=null; state.moodBuffer=[]; state.autoplay=false; state.paused=false;
  clearInterval(state.progressTimer); state.player?.stop(true); state.connection?.destroy(); state.connection=null;
  try { client.user.setActivity('🎵 CONbot5 Supreme | /play', {type:2}); } catch {}
  await updateDashboard(state, client);
  return i.editReply('⏹️ Stopped. Queue cleared. Disconnected.');
}

async function handleButton(i, client) {
  const state = getState(i.guildId);
  await i.deferUpdate().catch(()=>{});
  const id = i.customId, dj = isDJ(i.member), inV = isInVoice(i.member,state);

  if (id==='c5_playpause') {
    if (!dj&&!inV) return;
    const s = state.player?.state?.status;
    if (s===AudioPlayerStatus.Playing) { state.player.pause(); state.paused=true; }
    else if (s===AudioPlayerStatus.Paused) { state.player.unpause(); state.paused=false; }
  } else if (id==='c5_skip') {
    if (!inV) return;
    const need = Math.ceil(vcSize(state,i.guild)*VOTE_THRESHOLD);
    if (dj||state.current?.requestedBy===i.user.username) { clearInterval(state.progressTimer); state.player?.stop(); }
    else {
      state.skipVotes.add(i.user.id);
      if (state.skipVotes.size>=need) { clearInterval(state.progressTimer); state.player?.stop(); }
      else try { await i.followUp({content:`🗳️ Skip vote: **${state.skipVotes.size}/${need}**`,ephemeral:true}); } catch {}
    }
  } else if (id==='c5_stop') {
    if (!dj) return;
    state.queue=[]; state.current=null; state.mood=null; state.moodBuffer=[]; state.autoplay=false; state.paused=false;
    clearInterval(state.progressTimer); state.player?.stop(true); state.connection?.destroy(); state.connection=null;
    try { client.user.setActivity('🎵 CONbot5 Supreme | /play', {type:2}); } catch {}
  } else if (id==='c5_prev') {
    if (!dj&&!inV) return;
    if (state.history.length) { const p=state.history.pop(); if(state.current) state.queue.unshift({...state.current}); state.queue.unshift({...p}); clearInterval(state.progressTimer); state.player?.stop(); }
  } else if (id==='c5_shuffle') {
    if (!inV) return;
    state.shuffle=!state.shuffle;
    if (state.shuffle&&state.queue.length>1) { for(let k=state.queue.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[state.queue[k],state.queue[j]]=[state.queue[j],state.queue[k]];} }
  } else if (id==='c5_loop') { if (!dj&&!inV) return; state.loop=!state.loop; }
  else if (id==='c5_loopq') { if (!dj) return; state.loopQueue=!state.loopQueue; }
  else if (id==='c5_autoplay') { if (!dj) return; state.autoplay=!state.autoplay; }
  else if (id==='c5_vol_dn') {
    if (!dj) return;
    state.volume=Math.max(0,state.volume-10);
    const ps=state.player?.state, eq=EQ[state.eq]||EQ.flat;
    if (ps?.resource?.volume) ps.resource.volume.setVolume((state.volume/100)*eq.mod);
  } else if (id==='c5_vol_up') {
    if (!dj) return;
    state.volume=Math.min(100,state.volume+10);
    const ps=state.player?.state, eq=EQ[state.eq]||EQ.flat;
    if (ps?.resource?.volume) ps.resource.volume.setVolume((state.volume/100)*eq.mod);
  } else if (id==='c5_clear') { if (!dj) return; state.queue=[]; state.moodBuffer=[]; }
  else if (id==='c5_queue') { try { await i.followUp({embeds:[buildQueueEmbed(state,0)],ephemeral:true}); } catch {} }
  else if (id==='c5_history') { try { await i.followUp({embeds:[buildHistoryEmbed(state)],ephemeral:true}); } catch {} }
  else if (id==='c5_browse') { try { await i.followUp({embeds:[buildGenreEmbed()],components:buildGenreComponents(state),ephemeral:true}); } catch {} }
  // c5_refresh — just re-render below

  await updateDashboard(state, client);
}

async function handleSelect(i, client) {
  await i.deferUpdate().catch(()=>{});
  const id=i.customId, value=i.values[0], state=getState(i.guildId);

  if (id==='c5_mood') {
    if (!isDJ(i.member)) return;
    if (value==='off') { state.mood=null; state.moodBuffer=[]; }
    else {
      const p=MOODS[value]; if (!p) return;
      state.mood=value; state.moodBuffer=[]; state.volume=p.vol;
      const vc=i.member?.voice?.channel; if (vc) await ensureVC(state,vc,client);
      if (!state.current||state.player?.state?.status!==AudioPlayerStatus.Playing) await playNext(state,client);
    }
    await updateDashboard(state,client); return;
  }

  if (id==='c5_genre_a'||id==='c5_genre_b') {
    if (!isInVoice(i.member,state)&&!isDJ(i.member)) return;
    const genre=GENRES[value]; if (!genre) return;
    const q=genre.q[Math.floor(Math.random()*genre.q.length)];
    const res=await searchMultiple(q,10);
    const tracks=res.map(r=>mkTrack(r)).filter(t=>t&&t.duration>30&&t.duration<7200).slice(0,10);
    tracks.forEach(t=>{ t.requestedBy=i.user.username; if(state.queue.length<MAX_QUEUE) state.queue.push(t); });
    const vc=i.member?.voice?.channel; if (vc) await ensureVC(state,vc,client);
    if (!state.current||state.player?.state?.status!==AudioPlayerStatus.Playing) await playNext(state,client);
    else await updateDashboard(state,client);
    try { await i.followUp({content:`🎸 Added **${tracks.length}** tracks from ${genre.label}!`,ephemeral:true}); } catch {}
    return;
  }

  if (id==='c5_search_pick') {
    const track=await resolveTrack(value);
    if (!track||Array.isArray(track)) return;
    track.requestedBy=i.user.username;
    const wasPlaying = !!state.current && state.player?.state?.status===AudioPlayerStatus.Playing;
    if (state.queue.length<MAX_QUEUE) state.queue.push(track);
    // Capture position BEFORE playNext() may shift() this track out of the queue
    const qPos = state.queue.length;
    const vc=i.member?.voice?.channel; if (vc) await ensureVC(state,vc,client);
    if (!wasPlaying) await playNext(state,client);
    else await updateDashboard(state,client);
    const posLabel = wasPlaying ? `#${qPos}` : '▶️ Now Playing';
    try { await i.followUp({content:`✅ **${track.title.slice(0,80)}** added at position ${posLabel}`,ephemeral:true}); } catch {}
    return;
  }

  if (id==='c5_eq') {
    if (!isDJ(i.member)) return;
    state.eq=value;
    const eq=EQ[value]||EQ.flat;
    const ps=state.player?.state;
    if (ps?.resource?.volume) ps.resource.volume.setVolume((state.volume/100)*eq.mod);
    await updateDashboard(state,client);
    try { await i.followUp({content:`🎛️ EQ set to **${eq.label}**`,ephemeral:true}); } catch {}
  }
}

// Global watchdog
setInterval(async()=>{
  for (const [gid,rooms] of permanentRooms) {
    const state=guildStates.get(gid); if (!state?.client) continue;
    const conn=getVoiceConnection(gid);
    if (!conn||conn.state?.status===VoiceConnectionStatus.Disconnected) {
      try {
        const g=state.client.guilds.cache.get(gid);
        const vc=g?.channels.cache.get(rooms[0]?.voiceChannelId);
        if (vc) { await ensureVC(state,vc,state.client); if(!state.current||state.player?.state?.status!==AudioPlayerStatus.Playing) await playNext(state,state.client); }
      } catch {}
    }
  }
  for (const [gid,state] of guildStates) {
    if (!state.client||(!state.mood&&!state.autoplay)) continue;
    const conn=getVoiceConnection(gid);
    if (!conn&&state.voiceChannelId) {
      try {
        const g=state.client.guilds.cache.get(gid);
        const vc=g?.channels.cache.get(state.voiceChannelId);
        if (vc) { await ensureVC(state,vc,state.client); if(!state.current||state.player?.state?.status!==AudioPlayerStatus.Playing) await playNext(state,state.client); }
      } catch {}
    }
  }
}, PULSE_MS);

module.exports = {
  getState, ensureVC, playNext, resolveTrack, searchMultiple,
  cmdPlay, cmdSkip, cmdStop, handleButton, handleSelect,
  buildNowPlayingEmbed, buildControlPanel, buildDashboardComponents,
  buildQueueEmbed, buildHistoryEmbed, buildGenreEmbed, buildGenreComponents,
  updateDashboard, postNowPlaying, mkTrack, fmtTime, progBar,
  GENRES, MOODS, EQ, FT, permanentRooms,
  isButton:  id => id?.startsWith('c5_') && !['c5_mood','c5_genre_a','c5_genre_b','c5_search_pick','c5_eq'].includes(id),
  isSelect:  id => ['c5_mood','c5_genre_a','c5_genre_b','c5_search_pick','c5_eq'].includes(id),
};
