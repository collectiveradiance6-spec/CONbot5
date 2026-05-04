import { apiRequest } from './apiClient'
import type { ActivityContext, VibeRoomResolution } from '../shared/vibeRooms'

export type ResolvedActivityContext = ActivityContext & {
  resolution: VibeRoomResolution
}

const localFallback: ResolvedActivityContext = {
  guildId: 'local-guild',
  channelId: 'local-channel',
  userId: 'local-user',
  sessionId: 'local-guild:local-channel',
  isAdmin: true,
  resolution: {
    mode: 'global',
    vibeRoom: null,
    themeKey: 'global-day',
    guildId: 'local-guild',
    channelId: 'local-channel',
  },
}

export function getActivityQueryContext() {
  const params = new URLSearchParams(window.location.search)
  return {
    guildId: params.get('guild_id') || params.get('guildId') || undefined,
    channelId: params.get('channel_id') || params.get('channelId') || undefined,
    userId: params.get('user_id') || params.get('userId') || undefined,
    sessionId: params.get('session_id') || params.get('sessionId') || undefined,
    isAdmin: params.get('admin') === 'true',
  }
}

export async function resolveActivityContext(): Promise<ResolvedActivityContext> {
  const query = getActivityQueryContext()
  const search = new URLSearchParams()
  if (query.guildId) search.set('guild_id', query.guildId)
  if (query.channelId) search.set('channel_id', query.channelId)
  if (query.userId) search.set('user_id', query.userId)
  if (query.sessionId) search.set('session_id', query.sessionId)
  if (query.isAdmin) search.set('admin', 'true')

  return apiRequest(`/api/activity/context?${search.toString()}`, {
    mockData: {
      ...localFallback,
      ...query,
      guildId: query.guildId || localFallback.guildId,
      channelId: query.channelId || localFallback.channelId,
      userId: query.userId || localFallback.userId,
      sessionId: query.sessionId || `${query.guildId || localFallback.guildId}:${query.channelId || localFallback.channelId}`,
    },
  })
}
