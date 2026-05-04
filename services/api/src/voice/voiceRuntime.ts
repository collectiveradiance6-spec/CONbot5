/**
 * Voice Runtime
 * Manages Discord bot voice connections per guild.
 * Requires: BOT_TOKEN env var + discord.js + @discordjs/voice
 *
 * Legal stream routing only:
 * - Owned/uploaded media
 * - Direct audio URLs (CDN, local server)
 * - RSS/podcast feeds (direct audio links only)
 * No scraping. No unauthorized proxying.
 */

import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  type VoiceConnection,
  type AudioPlayer,
  type AudioResource,
} from '@discordjs/voice'
import { Client, GatewayIntentBits, type VoiceBasedChannel } from 'discord.js'
import { scopedStore } from '../core/scopedStateStore.js'

type GuildVoiceSession = {
  connection: VoiceConnection
  player: AudioPlayer
  guildId: string
  channelId: string
  currentResource: AudioResource | null
}

class VoiceRuntime {
  private client: Client | null = null
  private sessions = new Map<string, GuildVoiceSession>() // guildId → session

  async init(token: string) {
    if (this.client) return

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
      ],
    })

    this.client.on('ready', () => {
      console.log(`[voice] Bot ready: ${this.client!.user?.tag}`)
    })

    // Track channel name updates for UI
    this.client.on('channelUpdate', (oldChannel, newChannel) => {
      if ('guildId' in newChannel && 'name' in newChannel) {
        scopedStore.setVoiceChannelName(newChannel.guildId, newChannel.id, newChannel.name)
      }
    })

    // Handle disconnections
    this.client.on('voiceStateUpdate', (_oldState, newState) => {
      if (newState.member?.id === this.client?.user?.id && !newState.channelId) {
        // Bot was disconnected/kicked
        const session = this.sessions.get(newState.guild.id)
        if (session) {
          scopedStore.setBotConnected(session.guildId, session.channelId, false)
          this.sessions.delete(newState.guild.id)
        }
      }
    })

    await this.client.login(token)
  }

  // ─── Join / Leave ───────────────────────────────────────────────────────────

  async joinChannel(guildId: string, channelId: string): Promise<boolean> {
    if (!this.client) return false

    try {
      const guild = await this.client.guilds.fetch(guildId)
      const channel = await guild.channels.fetch(channelId) as VoiceBasedChannel | null

      if (!channel || !channel.isVoiceBased()) return false

      // Leave existing session in this guild
      await this.leaveGuild(guildId)

      const connection = joinVoiceChannel({
        channelId,
        guildId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        adapterCreator: guild.voiceAdapterCreator as any,
        selfDeaf: false,
        selfMute: false,
      })

      await entersState(connection, VoiceConnectionStatus.Ready, 10_000)

      const player = createAudioPlayer()
      connection.subscribe(player)

      const session: GuildVoiceSession = {
        connection,
        player,
        guildId,
        channelId,
        currentResource: null,
      }

      player.on('error', (err) => {
        console.error(`[voice] Player error in ${guildId}:`, err.message)
        scopedStore.setBotConnected(guildId, channelId, false)
      })

      player.on(AudioPlayerStatus.Idle, () => {
        // Track ended — trigger skip logic
        const scopeKey = Array.from(scopedStore.allScopes())
          .find((s) => s.guildId === guildId && s.channelId === channelId)?.scopeKey
        if (scopeKey) {
          const next = scopedStore.skipTrack(scopeKey)
          if (next?.streamUrl) {
            this.playStream(guildId, next.streamUrl, next.legalRoute)
          }
        }
      })

      this.sessions.set(guildId, session)
      scopedStore.setBotConnected(guildId, channelId, true)
      scopedStore.setVoiceChannelName(guildId, channelId, channel.name)

      console.log(`[voice] Joined ${channel.name} in ${guildId}`)
      return true
    } catch (err) {
      console.error(`[voice] Failed to join ${guildId}:${channelId}:`, err)
      scopedStore.setBotConnected(guildId, channelId, false)
      return false
    }
  }

  async leaveGuild(guildId: string) {
    const session = this.sessions.get(guildId)
    if (!session) return
    session.player.stop(true)
    session.connection.destroy()
    this.sessions.delete(guildId)
    scopedStore.setBotConnected(guildId, session.channelId, false)
    console.log(`[voice] Left guild ${guildId}`)
  }

  // ─── Playback ───────────────────────────────────────────────────────────────

  /**
   * Play a direct audio stream URL.
   * Legal routes only: owned CDN, local media server, RSS audio files.
   */
  playStream(guildId: string, streamUrl: string, legalRoute?: string) {
    const session = this.sessions.get(guildId)
    if (!session) return false

    // Only allow known-legal routes
    const allowed = this.isLegalStreamUrl(streamUrl, legalRoute)
    if (!allowed) {
      console.warn(`[voice] Rejected non-legal stream URL for guild ${guildId}`)
      return false
    }

    try {
      const resource = createAudioResource(streamUrl, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      })

      resource.volume?.setVolume(0.72)
      session.currentResource = resource
      session.player.play(resource)
      console.log(`[voice] Playing stream in ${guildId}: ${streamUrl.slice(0, 60)}...`)
      return true
    } catch (err) {
      console.error(`[voice] Stream error in ${guildId}:`, err)
      return false
    }
  }

  setVolume(guildId: string, volumePercent: number) {
    const session = this.sessions.get(guildId)
    if (!session?.currentResource?.volume) return
    session.currentResource.volume.setVolume(volumePercent / 100)
  }

  pause(guildId: string) {
    this.sessions.get(guildId)?.player.pause()
  }

  resume(guildId: string) {
    this.sessions.get(guildId)?.player.unpause()
  }

  stop(guildId: string) {
    this.sessions.get(guildId)?.player.stop()
  }

  isConnected(guildId: string): boolean {
    return this.sessions.has(guildId)
  }

  // ─── Legal URL Validation ────────────────────────────────────────────────────

  private isLegalStreamUrl(url: string, route?: string): boolean {
    // Must be HTTPS
    if (!url.startsWith('https://')) return false

    // Explicitly approved routes
    if (route === 'local') return true
    if (route === 'rss') {
      // RSS direct audio links: validate extension
      return /\.(mp3|ogg|aac|m4a|opus|wav|flac)(\?.*)?$/i.test(url)
    }

    // Deny known unauthorized proxies
    const blocked = ['yt-dlp', 'youtube-dl', 'invidious', 'piped.']
    if (blocked.some((b) => url.includes(b))) return false

    // Default: require explicit legal route annotation
    return route === 'direct'
  }
}

export const voiceRuntime = new VoiceRuntime()

export async function initVoiceRuntime() {
  const token = process.env.BOT_TOKEN
  if (!token) {
    console.warn('[voice] BOT_TOKEN not set — voice runtime disabled')
    return
  }
  await voiceRuntime.init(token)
}
