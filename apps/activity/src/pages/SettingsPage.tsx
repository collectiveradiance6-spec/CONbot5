import { useState } from 'react'
import type { ResolvedActivityContext } from '../lib/activityContext'
import { RouteHeroHeader } from '../components/layout/RouteHeroHeader'
import { GlassCapsule } from '../components/ui/GlassCapsule'
import { GlassCard } from '../components/ui/GlassCard'
import { useConbotTheme } from '../theme/ThemeContext'

function Toggle({ label, sub, on }: { label: string; sub?: string; on?: boolean }) {
  const [enabled, setEnabled] = useState(on ?? false)
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div>
        <p className="text-sm font-black text-[color:var(--conbot-text)]">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-[color:var(--conbot-muted)]">{sub}</p>}
      </div>
      <button type="button" onClick={() => setEnabled(e => !e)}
        className={`relative h-7 w-12 rounded-full border transition-all ${enabled ? 'border-[color:var(--neon-cyan)] bg-[rgba(49,231,255,.2)]' : 'border-white/20 bg-white/8'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}

function Slider({ label, value = 72, max = 100 }: { label: string; value?: number; max?: number }) {
  const [v, setV] = useState(value)
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex justify-between mb-2">
        <p className="text-sm font-black text-[color:var(--conbot-text)]">{label}</p>
        <span className="text-sm font-black text-[color:var(--neon-cyan)]">{v}</span>
      </div>
      <input type="range" min={0} max={max} value={v} onChange={e => setV(Number(e.target.value))}
        className="w-full h-1.5 rounded-full" style={{ accentColor: 'var(--neon-cyan)' }} />
    </div>
  )
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-xs font-black uppercase tracking-[.18em] text-[color:var(--conbot-muted)]">{children}</p>
}

export function SettingsPage({ activityContext }: { activityContext?: ResolvedActivityContext | null }) {
  const { lightingMode, setLightingMode } = useConbotTheme()

  return (
    <section className="release-page-shell">
      <RouteHeroHeader eyebrow="SYSTEM SETTINGS" title="System Settings" subtitle="Appearance, audio, cinema, room behavior, and privacy."
        status={<GlassCapsule>Personal</GlassCapsule>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard className="p-6">
          <Lbl>Appearance</Lbl>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm font-black text-[color:var(--conbot-text)]">Lighting Mode</p>
              <button type="button" onClick={() => setLightingMode(lightingMode === 'night' ? 'day' : 'night')}
                className="rounded-full border border-white/20 bg-white/8 px-4 py-1.5 text-xs font-black text-[color:var(--conbot-text)] hover:bg-white/14 transition">
                {lightingMode === 'night' ? '🌙 Night' : '☀️ Day'}
              </button>
            </div>
            <Toggle label="Reactive glow" sub="Audio-reactive background" on={true} />
            <Toggle label="Face cycling" sub="Auto-cycle nav island faces" on={true} />
            <Slider label="Glass depth" value={62} />
            <Slider label="Bloom intensity" value={58} />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <Lbl>Audio Preferences</Lbl>
          <div className="space-y-2">
            <Slider label="Default volume" value={72} />
            <Toggle label="Volume normalization" on={true} />
            <Toggle label="Night-safe mode" sub="Cap volume at 70%" />
            <Toggle label="Voice ducking" />
            <Slider label="Crossfade (s)" value={0} max={12} />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <Lbl>Notifications</Lbl>
          <div className="space-y-2">
            <Toggle label="Queue updates" on={true} />
            <Toggle label="Room invites" on={true} />
            <Toggle label="Watch Party sync" />
            <Toggle label="Maintenance notices" on={true} />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <Lbl>Privacy</Lbl>
          <div className="space-y-2">
            <Toggle label="Profile visibility" on={true} />
            <Toggle label="Share listening history" />
            <Toggle label="Presence sharing" on={true} />
          </div>
          {activityContext && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-[color:var(--conbot-muted)] font-mono">
              uid: {activityContext.userId} · guild: {activityContext.guildId}
            </div>
          )}
        </GlassCard>
      </div>
    </section>
  )
}
