'use strict';
const { SlashCommandBuilder } = require('discord.js');

const COMMANDS = [

  // --- Playback core ---
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play by song title or URL (YouTube / Spotify / SoundCloud)')
    .addStringOption(o =>
      o.setName('query').setDescription('Song name or URL').setRequired(true)),

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a song to the queue (alias for /play)')
    .addStringOption(o =>
      o.setName('query').setDescription('Song name or URL').setRequired(true)),

  new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search and pick from top 8 results')
    .addStringOption(o =>
      o.setName('query').setDescription('Search query').setRequired(true)),

  new SlashCommandBuilder().setName('skip').setDescription('Skip or vote-skip the current track'),
  new SlashCommandBuilder().setName('stop').setDescription('Stop and clear queue (DJ only)'),
  new SlashCommandBuilder().setName('pause').setDescription('Pause playback (DJ only)'),
  new SlashCommandBuilder().setName('resume').setDescription('Resume playback (DJ only)'),
  new SlashCommandBuilder().setName('nowplaying').setDescription('Show the current track panel'),
  new SlashCommandBuilder().setName('np').setDescription('Now playing (alias)'),

  // --- Queue ---
  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the current queue')
    .addIntegerOption(o =>
      o.setName('page').setDescription('Page number').setRequired(false).setMinValue(1)),

  new SlashCommandBuilder().setName('history').setDescription('View recently played tracks'),

  new SlashCommandBuilder().setName('clear').setDescription('Clear the queue (DJ only)'),

  new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a track from the queue (DJ only)')
    .addIntegerOption(o =>
      o.setName('position').setDescription('Position in queue').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move a track in the queue (DJ only)')
    .addIntegerOption(o =>
      o.setName('from').setDescription('From position').setRequired(true).setMinValue(1))
    .addIntegerOption(o =>
      o.setName('to').setDescription('To position').setRequired(true).setMinValue(1)),

  // --- Controls ---
  new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set volume 0-100 (DJ only)')
    .addIntegerOption(o =>
      o.setName('level').setDescription('Volume level').setRequired(true).setMinValue(0).setMaxValue(100)),

  new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Toggle loop mode')
    .addStringOption(o =>
      o.setName('mode').setDescription('Mode').setRequired(false)
        .addChoices(
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' },
          { name: 'Off',   value: 'off'   }
        )),

  new SlashCommandBuilder().setName('shuffle').setDescription('Toggle shuffle'),
  new SlashCommandBuilder().setName('autoplay').setDescription('Toggle AutoPlay'),

  // --- Discovery ---
  new SlashCommandBuilder().setName('browse').setDescription('Open genre browser — 16 genres + Mood Rooms'),

  new SlashCommandBuilder()
    .setName('room')
    .setDescription('Activate a 24/7 Mood Room')
    .addStringOption(o =>
      o.setName('room').setDescription('Mood preset').setRequired(true)
        .addChoices(
          { name: 'Off',               value: 'off'              },
          { name: 'Midnight Lo-Fi',    value: 'midnight-lofi'    },
          { name: 'Synthwave Lounge',  value: 'synthwave-lounge' },
          { name: 'Ambient Void',      value: 'ambient-void'     },
          { name: 'Raid Prep',         value: 'raid-prep'        },
          { name: 'Party Room',        value: 'party-room'       },
          { name: 'VGM Lounge',        value: 'vgm-lounge'       },
          { name: 'Metal Forge',       value: 'metal-forge'      },
          { name: 'Chill R&B',         value: 'chill-rnb'        }
        )),

  new SlashCommandBuilder()
    .setName('eq')
    .setDescription('Equaliser preset (DJ only)')
    .addStringOption(o =>
      o.setName('preset').setDescription('EQ preset').setRequired(true)
        .addChoices(
          { name: 'Flat (default)', value: 'flat'      },
          { name: 'Bass Boost',     value: 'bassboost' },
          { name: 'Vocal Clarity',  value: 'vocal'     },
          { name: 'Crystal',        value: 'crystal'   },
          { name: 'Club',           value: 'club'      },
          { name: 'Night Drive',    value: 'nightdrive'},
          { name: 'Podcast',        value: 'podcast'   },
          { name: 'Cinema',         value: 'cinema'    },
          { name: 'Soft Silk',      value: 'silk'      },
          { name: 'Prism Surge',    value: 'prism'     },
          { name: 'Dominion Live',  value: 'dominion'  },
          { name: 'Nightcore',      value: 'nightcore' },
          { name: 'Vaporwave',      value: 'vaporwave' },
          { name: 'Earrape',        value: 'earrape'   }
        )),

  // --- Panels / Dashboard ---
  new SlashCommandBuilder().setName('dashboard').setDescription('Open live interactive music dashboard'),
  new SlashCommandBuilder().setName('launchpad').setDescription('Open the CONbot5 Prismatic Launchpad'),

  // --- Session ---
  new SlashCommandBuilder().setName('session').setDescription('View or manage the current listening session'),
  new SlashCommandBuilder().setName('audiolab').setDescription('Open the Audio Lab panel'),
  new SlashCommandBuilder().setName('smartmix').setDescription('Open the AI Smart Mix panel'),

  // --- Playlists ---
  new SlashCommandBuilder()
    .setName('save')
    .setDescription('Save current queue as a named playlist')
    .addStringOption(o =>
      o.setName('name').setDescription('Playlist name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('load')
    .setDescription('Load a saved playlist')
    .addStringOption(o =>
      o.setName('name').setDescription('Playlist name').setRequired(true)),

  new SlashCommandBuilder().setName('playlists').setDescription('List saved playlists for this server'),

  // --- Utility ---
  new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to position in current track')
    .addIntegerOption(o =>
      o.setName('seconds').setDescription('Position in seconds').setRequired(true).setMinValue(0)),

  new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Show lyrics for current or searched track')
    .addStringOption(o =>
      o.setName('query').setDescription('Track name (blank = current)').setRequired(false)),

  // --- Info / Diagnostics ---
  new SlashCommandBuilder().setName('ping').setDescription('Bot latency and system status'),
  new SlashCommandBuilder().setName('help').setDescription('CONbot5 command reference'),
  new SlashCommandBuilder().setName('diagnosevoice').setDescription('Voice and stream diagnostics — troubleshoot playback'),

];

module.exports = { COMMANDS };
