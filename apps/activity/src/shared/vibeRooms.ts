export type ActivityMode = 'global' | 'vibe'

export type VibeRoomThemeKey =
  | 'global-day'
  | 'global-night'
  | 'global-roygbiv'
  | 'midnight-lofi'
  | 'synthwave-lounge'
  | 'ambient-void'
  | 'raid-prep-boss-fights'
  | 'party-room'
  | 'vgm-lounge'
  | 'metal-forge'
  | 'chill-rnb'

export type VibeRoomPreset = {
  roomKey: string
  roomName: string
  themeKey: VibeRoomThemeKey
}

export type VibeRoomMapping = VibeRoomPreset & {
  guildId: string
  voiceChannelId: string
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export type ActivityContext = {
  guildId: string
  channelId: string
  userId: string
  sessionId: string
  isAdmin: boolean
}

export type VibeRoomResolution = {
  mode: ActivityMode
  vibeRoom: VibeRoomMapping | null
  themeKey: VibeRoomThemeKey
  guildId: string
  channelId: string
}

export const globalThemeKeys: VibeRoomThemeKey[] = ['global-day', 'global-night', 'global-roygbiv']

export const vibeRoomPresets: VibeRoomPreset[] = [
  { roomKey: 'midnight-lofi', roomName: 'Midnight Lo-Fi', themeKey: 'midnight-lofi' },
  { roomKey: 'synthwave-lounge', roomName: 'Synthwave Lounge', themeKey: 'synthwave-lounge' },
  { roomKey: 'ambient-void', roomName: 'Ambient Void', themeKey: 'ambient-void' },
  { roomKey: 'raid-prep-boss-fights', roomName: 'Raid Prep & Boss fights', themeKey: 'raid-prep-boss-fights' },
  { roomKey: 'party-room', roomName: 'Party Room', themeKey: 'party-room' },
  { roomKey: 'vgm-lounge', roomName: 'VGM Lounge', themeKey: 'vgm-lounge' },
  { roomKey: 'metal-forge', roomName: 'Metal Forge', themeKey: 'metal-forge' },
  { roomKey: 'chill-rnb', roomName: 'Chill R&B', themeKey: 'chill-rnb' },
]

export const conclaveGuildId = 'the-conclave'

export const conclaveDefaultVibeRooms: VibeRoomMapping[] = [
  {
    guildId: conclaveGuildId,
    roomKey: 'midnight-lofi',
    roomName: 'Midnight Lo-Fi',
    voiceChannelId: '1472492867451617411',
    themeKey: 'midnight-lofi',
    enabled: true,
  },
  {
    guildId: conclaveGuildId,
    roomKey: 'synthwave-lounge',
    roomName: 'Synthwave Lounge',
    voiceChannelId: '1498617184006443119',
    themeKey: 'synthwave-lounge',
    enabled: true,
  },
  {
    guildId: conclaveGuildId,
    roomKey: 'ambient-void',
    roomName: 'Ambient Void',
    voiceChannelId: '1498617328768647228',
    themeKey: 'ambient-void',
    enabled: true,
  },
  {
    guildId: conclaveGuildId,
    roomKey: 'raid-prep-boss-fights',
    roomName: 'Raid Prep & Boss fights',
    voiceChannelId: '1438944767571398736',
    themeKey: 'raid-prep-boss-fights',
    enabled: true,
  },
  {
    guildId: conclaveGuildId,
    roomKey: 'party-room',
    roomName: 'Party Room',
    voiceChannelId: '1498617447442288681',
    themeKey: 'party-room',
    enabled: true,
  },
  {
    guildId: conclaveGuildId,
    roomKey: 'vgm-lounge',
    roomName: 'VGM Lounge',
    voiceChannelId: '1498617738527244319',
    themeKey: 'vgm-lounge',
    enabled: true,
  },
  {
    guildId: conclaveGuildId,
    roomKey: 'metal-forge',
    roomName: 'Metal Forge',
    voiceChannelId: '1498617972879523911',
    themeKey: 'metal-forge',
    enabled: true,
  },
  {
    guildId: conclaveGuildId,
    roomKey: 'chill-rnb',
    roomName: 'Chill R&B',
    voiceChannelId: '1498618065242296350',
    themeKey: 'chill-rnb',
    enabled: true,
  },
]

export function resolveVibeRoom(
  mappings: VibeRoomMapping[],
  guildId: string,
  channelId: string,
): VibeRoomResolution {
  const vibeRoom =
    mappings.find(
      (room) => room.guildId === guildId && room.voiceChannelId === channelId && room.enabled,
    ) ?? null

  return {
    mode: vibeRoom ? 'vibe' : 'global',
    vibeRoom,
    themeKey: vibeRoom?.themeKey ?? 'global-day',
    guildId,
    channelId,
  }
}
