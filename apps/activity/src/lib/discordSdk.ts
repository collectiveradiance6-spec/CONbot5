import { useEffect, useState } from 'react'
import type { DiscordSDK } from '@discord/embedded-app-sdk'

export type DiscordConnectionMode = 'discord' | 'mock'
export type DiscordActivityStatus = 'mock' | 'ready' | 'unavailable' | 'error'

export interface DiscordUser {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  isBot: boolean
  isMuted: boolean
  isDeafened: boolean
}

export interface DiscordActivitySnapshot {
  mode: DiscordConnectionMode
  status: DiscordActivityStatus
  statusText: string
  serverId: string | null
  serverName: string
  voiceChannelId: string | null
  voiceChannelName: string
  users: DiscordUser[]
  activity: {
    name: string
    details: string
    state: string
    participantCount: number
  }
}

type DiscordSdkInstance = InstanceType<typeof DiscordSDK>

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined

export const mockDiscordSnapshot: DiscordActivitySnapshot = {
  mode: 'mock',
  status: 'mock',
  statusText: 'Browser mock data',
  serverId: 'mock-guild-conclave',
  serverName: 'The Conclave',
  voiceChannelId: 'mock-voice-studio',
  voiceChannelName: 'Listening Studio',
  users: [
    {
      id: 'mock-1',
      username: 'astra',
      displayName: 'Astra',
      avatarUrl: null,
      isBot: false,
      isMuted: false,
      isDeafened: false,
    },
    {
      id: 'mock-2',
      username: 'milo',
      displayName: 'Milo',
      avatarUrl: null,
      isBot: false,
      isMuted: true,
      isDeafened: false,
    },
    {
      id: 'mock-3',
      username: 'conbot5',
      displayName: 'CONbot5',
      avatarUrl: null,
      isBot: true,
      isMuted: false,
      isDeafened: false,
    },
  ],
  activity: {
    name: 'CONbot5',
    details: 'Co-listening dashboard',
    state: 'Mock session active',
    participantCount: 3,
  },
}

function isInsideDiscord() {
  const params = new URLSearchParams(window.location.search)

  return params.has('frame_id') && params.has('instance_id')
}

function avatarUrl(userId: string, avatarHash?: string | null) {
  if (!avatarHash) {
    return null
  }

  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=64`
}

function mockWith(statusText: string, status: DiscordActivityStatus = 'mock') {
  return {
    ...mockDiscordSnapshot,
    status,
    statusText,
  }
}

async function createDiscordSdk() {
  if (!DISCORD_CLIENT_ID || !isInsideDiscord()) {
    return null
  }

  const { DiscordSDK } = await import('@discord/embedded-app-sdk')
  const sdk = new DiscordSDK(DISCORD_CLIENT_ID, { disableConsoleLogOverride: true })
  await sdk.ready()

  return sdk
}

async function setDiscordActivity(sdk: DiscordSdkInstance, participantCount: number) {
  try {
    await sdk.commands.setActivity({
      activity: {
        type: 0,
        details: 'Co-listening dashboard',
        state: `${participantCount} listeners connected`,
        instance: true,
        party: {
          id: sdk.instanceId,
          size: [participantCount, Math.max(participantCount, 1)],
        },
      },
    })
  } catch {
    // Rich presence is best-effort and may be unavailable without the right scope.
  }
}

export async function getDiscordActivitySnapshot(): Promise<DiscordActivitySnapshot> {
  if (!DISCORD_CLIENT_ID) {
    return mockWith('Missing VITE_DISCORD_CLIENT_ID')
  }

  if (!isInsideDiscord()) {
    return mockWith('Not running inside Discord')
  }

  try {
    const sdk = await createDiscordSdk()

    if (!sdk) {
      return mockWith('Discord SDK unavailable')
    }

    const [channel, participantResponse] = await Promise.all([
      sdk.channelId ? sdk.commands.getChannel({ channel_id: sdk.channelId }) : Promise.resolve(null),
      sdk.commands.getActivityInstanceConnectedParticipants(),
    ])

    const voiceUsers =
      channel?.voice_states.map((voiceState) => ({
        id: voiceState.user.id,
        username: voiceState.user.username,
        displayName: voiceState.nick || voiceState.user.global_name || voiceState.user.username,
        avatarUrl: avatarUrl(voiceState.user.id, voiceState.user.avatar),
        isBot: voiceState.user.bot,
        isMuted: voiceState.voice_state.self_mute || voiceState.voice_state.mute,
        isDeafened: voiceState.voice_state.self_deaf || voiceState.voice_state.deaf,
      })) ?? []

    const participantUsers = participantResponse.participants.map((participant) => ({
      id: participant.id,
      username: participant.username,
      displayName: participant.nickname || participant.global_name || participant.username,
      avatarUrl: avatarUrl(participant.id, participant.avatar),
      isBot: participant.bot,
      isMuted: false,
      isDeafened: false,
    }))

    const users = voiceUsers.length > 0 ? voiceUsers : participantUsers
    await setDiscordActivity(sdk, users.length)

    return {
      mode: 'discord',
      status: 'ready',
      statusText: 'Connected to Discord',
      serverId: sdk.guildId,
      serverName: sdk.guildId ? `Server ${sdk.guildId}` : 'Direct activity',
      voiceChannelId: sdk.channelId,
      voiceChannelName: channel?.name || 'Current voice channel',
      users,
      activity: {
        name: 'CONbot5',
        details: 'Co-listening dashboard',
        state: `${users.length} listeners connected`,
        participantCount: users.length,
      },
    }
  } catch {
    return mockWith('Discord unavailable, showing browser mock data', 'error')
  }
}

export function useDiscordActivitySnapshot() {
  const [snapshot, setSnapshot] = useState<DiscordActivitySnapshot>(mockDiscordSnapshot)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    getDiscordActivitySnapshot()
      .then((nextSnapshot) => {
        if (isMounted) {
          setSnapshot(nextSnapshot)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { snapshot, isLoading }
}
