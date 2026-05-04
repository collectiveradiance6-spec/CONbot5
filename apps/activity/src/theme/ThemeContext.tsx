import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  defaultTheme,
  lightingTokens,
  themes,
  type ConbotTheme,
  type LightingMode,
  type ThemeName,
} from './themes'

type ThemeContextValue = {
  theme: ConbotTheme
  themes: ConbotTheme[]
  lightingMode: LightingMode
  setThemeName: (name: ThemeName) => void
  setLightingMode: (mode: LightingMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(defaultTheme.name)
  const [lightingMode, setLightingMode] = useState<LightingMode>('night')
  const theme = useMemo(
    () => themes.find((item) => item.name === themeName) ?? defaultTheme,
    [themeName],
  )
  const lighting = lightingTokens[lightingMode]
  const isNight = lightingMode === 'night'

  return (
    <ThemeContext.Provider value={{ theme, themes, lightingMode, setLightingMode, setThemeName }}>
      <div
        className="conbot-theme-root"
        data-lighting={lightingMode}
        data-material={theme.name.toLowerCase().replaceAll(' ', '-')}
        style={
          {
            '--fluid-tint': isNight ? '#070a12' : theme.fluidTint,
            '--subsurface-glow': theme.subsurfaceGlow,
            '--card-tint': isNight ? 'rgba(9, 14, 28, .64)' : theme.cardTint,
            '--accent': theme.accent,
            '--accent-primary': theme.accent,
            '--accent-secondary': isNight ? '#ff4fe0' : '#ff7bdc',
            '--control-glow': theme.controlGlow,
            ...lighting,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useConbotTheme() {
  const value = useContext(ThemeContext)
  if (!value) {
    throw new Error('useConbotTheme must be used within ThemeProvider')
  }
  return value
}
