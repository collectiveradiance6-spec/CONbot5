import type { VibeRoomMapping, VibeRoomResolution } from '../types/state.js'

// In-memory guild → vibe room mappings.
// Replace Map with Supabase queries when persistence is needed.

class VibeRoomStore {
  // guildId → voiceChannelId → VibeRoomMapping
  private guildMappings = new Map<string, Map<string, VibeRoomMapping>>()

  seed(mappings: VibeRoomMapping[]) {
    for (const m of mappings) {
      this.upsert(m)
    }
  }

  upsert(mapping: VibeRoomMapping) {
    if (!this.guildMappings.has(mapping.guildId)) {
      this.guildMappings.set(mapping.guildId, new Map())
    }
    this.guildMappings.get(mapping.guildId)!.set(mapping.voiceChannelId, {
      ...mapping,
      updatedAt: new Date().toISOString(),
    })
  }

  remove(guildId: string, voiceChannelId: string) {
    this.guildMappings.get(guildId)?.delete(voiceChannelId)
  }

  getForGuild(guildId: string): VibeRoomMapping[] {
    return Array.from(this.guildMappings.get(guildId)?.values() ?? [])
  }

  resolve(guildId: string, channelId: string): VibeRoomResolution {
    const channelMap = this.guildMappings.get(guildId)
    const vibeRoom = channelMap?.get(channelId) ?? null
    const active = vibeRoom?.enabled ? vibeRoom : null

    return {
      mode: active ? 'vibe' : 'global',
      vibeRoom: active,
      themeKey: active?.themeKey ?? 'global-night',
      guildId,
      channelId,
    }
  }

  resolveByKey(guildId: string, roomKey: string, channelId: string): VibeRoomResolution {
    const channelMap = this.guildMappings.get(guildId)
    let found: VibeRoomMapping | null = null
    if (channelMap) {
      for (const m of channelMap.values()) {
        if (m.roomKey === roomKey && m.enabled) {
          found = m
          break
        }
      }
    }
    return {
      mode: found ? 'vibe' : 'global',
      vibeRoom: found,
      themeKey: found?.themeKey ?? 'global-night',
      guildId,
      channelId,
    }
  }

  clearResolution(guildId: string, channelId: string): VibeRoomResolution {
    return {
      mode: 'global',
      vibeRoom: null,
      themeKey: 'global-night',
      guildId,
      channelId,
    }
  }
}

export const vibeRoomStore = new VibeRoomStore()

// Seed The Conclave default mappings
vibeRoomStore.seed([
  { guildId: 'the-conclave', roomKey: 'midnight-lofi', roomName: 'Midnight Lo-Fi', voiceChannelId: '1472492867451617411', themeKey: 'midnight-lofi', enabled: true },
  { guildId: 'the-conclave', roomKey: 'synthwave-lounge', roomName: 'Synthwave Lounge', voiceChannelId: '1498617184006443119', themeKey: 'synthwave-lounge', enabled: true },
  { guildId: 'the-conclave', roomKey: 'ambient-void', roomName: 'Ambient Void', voiceChannelId: '1498617328768647228', themeKey: 'ambient-void', enabled: true },
  { guildId: 'the-conclave', roomKey: 'raid-prep-boss-fights', roomName: 'Raid Prep & Boss Fights', voiceChannelId: '1438944767571398736', themeKey: 'raid-prep-boss-fights', enabled: true },
  { guildId: 'the-conclave', roomKey: 'party-room', roomName: 'Party Room', voiceChannelId: '1498617447442288681', themeKey: 'party-room', enabled: true },
  { guildId: 'the-conclave', roomKey: 'vgm-lounge', roomName: 'VGM Lounge', voiceChannelId: '1498617738527244319', themeKey: 'vgm-lounge', enabled: true },
  { guildId: 'the-conclave', roomKey: 'metal-forge', roomName: 'Metal Forge', voiceChannelId: '1498617972879523911', themeKey: 'metal-forge', enabled: true },
  { guildId: 'the-conclave', roomKey: 'chill-rnb', roomName: 'Chill R&B', voiceChannelId: '1498618065242296350', themeKey: 'chill-rnb', enabled: true },
])
