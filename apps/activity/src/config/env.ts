type AppEnvironment = 'local' | 'production' | 'preview'

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const appEnv = (import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'local') as AppEnvironment

const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
const defaultApiBaseUrl = appEnv === 'production' ? 'https://conbot5-api.onrender.com' : 'http://localhost:5000'
const defaultAppBaseUrl = appEnv === 'production' ? 'https://conbot5.pages.dev' : 'http://localhost:5173'

function normalizeWsUrl(value?: string) {
  const fallback = appEnv === 'production' ? 'wss://conbot5-api.onrender.com/ws' : 'ws://localhost:5000/ws'
  const raw = value || fallback

  if (isSecure && raw.startsWith('ws://') && !raw.includes('localhost')) {
    return raw.replace('ws://', 'wss://')
  }

  return raw
}

export const appConfig = {
  appEnv,
  appBaseUrl: trimTrailingSlash(import.meta.env.VITE_APP_BASE_URL || defaultAppBaseUrl),
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl),
  wsUrl: normalizeWsUrl(import.meta.env.VITE_WS_URL),
  publicSiteUrl: trimTrailingSlash(
    import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_APP_BASE_URL || defaultAppBaseUrl,
  ),
  discordActivityUrl: trimTrailingSlash(import.meta.env.VITE_APP_BASE_URL || defaultAppBaseUrl),
}

export type WebSocketConnectionStatus = 'Connected' | 'Reconnecting' | 'Mock' | 'Offline'
