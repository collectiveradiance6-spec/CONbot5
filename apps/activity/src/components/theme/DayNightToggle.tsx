import { Moon, Sun } from 'lucide-react'
import { useConbotTheme } from '../../theme/ThemeContext'
import { sendConbotEvent } from '../../core/socket'
import { useConbotStore } from '../../state/useConbotStore'

export function DayNightToggle() {
  const { lightingMode, setLightingMode } = useConbotTheme()
  const optimisticPatch = useConbotStore((state) => state.optimisticPatch)

  const updateLighting = (mode: typeof lightingMode) => {
    setLightingMode(mode)
    optimisticPatch({ themeMode: mode })
    sendConbotEvent('settings:theme:update', { themeMode: mode })
  }

  return (
    <div className="flex h-11 items-center rounded-full border border-white/18 bg-[color:var(--mode-control)] p-1 shadow-glass-soft backdrop-blur-2xl">
      {[
        { mode: 'day' as const, Icon: Sun, label: 'Day' },
        { mode: 'night' as const, Icon: Moon, label: 'Night' },
      ].map(({ mode, Icon, label }) => (
        <button
          key={mode as string}
          type="button"
          onClick={() => updateLighting(mode)}
          className={`flex h-9 items-center gap-2 rounded-full px-3 text-xs font-bold transition ${
            lightingMode === mode ? 'bg-ink text-white shadow-[0_10px_24px_rgba(0,0,0,.18)]' : 'text-[color:var(--mode-muted)] hover:bg-white/16'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
