import { Palette } from 'lucide-react'
import { useConbotTheme } from '../../theme/ThemeContext'
import { sendConbotEvent } from '../../core/socket'

export function ThemeSwitcher() {
  const { theme, themes, setThemeName } = useConbotTheme()

  const updateTheme = (name: typeof theme.name) => {
    setThemeName(name)
    sendConbotEvent('admin:material:update', { materialTheme: name })
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-full border border-white/62 bg-white/36 p-2 shadow-glass-soft backdrop-blur-2xl">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/52 text-ink/45 shadow-glass-inset">
        <Palette className="h-4 w-4" />
      </div>
      {themes.map((item) => (
        <button
          key={item.name}
          type="button"
          onClick={() => updateTheme(item.name)}
          className={`h-9 shrink-0 rounded-full px-3 text-xs font-bold transition ${
            theme.name === item.name ? 'bg-ink text-white' : 'text-ink/48 hover:bg-white/58 hover:text-ink'
          }`}
        >
          {item.name}
        </button>
      ))}
    </div>
  )
}
