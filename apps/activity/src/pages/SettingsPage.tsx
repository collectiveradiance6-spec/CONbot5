import { Bell, Captions, LayoutPanelTop, MoonStar, Shield, SlidersHorizontal, Volume2 } from 'lucide-react'
import type { ResolvedActivityContext } from '../lib/activityContext'
import { RouteHeroHeader } from '../components/layout/RouteHeroHeader'
import { GlassCapsule } from '../components/ui/GlassCapsule'
import { GlassCard } from '../components/ui/GlassCard'

type SettingsSection = {
  title: string
  eyebrow: string
  icon: typeof MoonStar
  items: string[]
}

const sections: SettingsSection[] = [
  {
    title: 'Appearance',
    eyebrow: 'Glass + theme',
    icon: MoonStar,
    items: ['Day shift / Night shift', 'Glass depth', 'Bloom strength', 'Face cycling speed', 'Theme intensity'],
  },
  {
    title: 'Audio Preferences',
    eyebrow: 'Playback behavior',
    icon: Volume2,
    items: ['Default volume', 'Preferred EQ preset', 'Night-safe mode', 'Volume normalization', 'Crossfade default'],
  },
  {
    title: 'Cinema Preferences',
    eyebrow: 'Watch Party defaults',
    icon: Captions,
    items: ['Default quality', 'Aspect ratio', 'Captions preference', 'Theater dim strength', 'Mini-player behavior'],
  },
  {
    title: 'Room Behavior',
    eyebrow: 'Voice room flow',
    icon: LayoutPanelTop,
    items: ['Auto-connect to current room', 'Ask before connecting', 'Prefer regular rooms first', 'Use room theme when available', 'Personal theme override'],
  },
  {
    title: 'Notifications',
    eyebrow: 'Signals',
    icon: Bell,
    items: ['Queue updates', 'Room invites', 'Watch Party sync alerts', 'Playback handoff', 'Maintenance notices'],
  },
  {
    title: 'Privacy',
    eyebrow: 'Profile + history',
    icon: Shield,
    items: ['Profile visibility', 'History retention', 'Clear history', 'Presence sharing', 'Connected account permissions'],
  },
]

const islandDefaults = [
  ['Dynamic nav island', 'Face-first'],
  ['Motion intensity', 'Reactive'],
  ['Visualizer intensity', 'Balanced'],
  ['Compact activity mode', 'Enabled'],
  ['Timezone', 'America/Chicago'],
  ['Accessibility', 'Ready'],
]

export function SettingsPage({ activityContext }: { activityContext: ResolvedActivityContext | null }) {
  return (
    <section className="release-page-shell">
      <RouteHeroHeader
        eyebrow="SYSTEM SETTINGS"
        title="System Settings"
        subtitle="Personal preferences for appearance, room behavior, playback defaults, accessibility, privacy, and the Dynamic Command Island."
        status={<GlassCapsule>{activityContext?.guildId ?? 'local preview'}</GlassCapsule>}
      />

      <GlassCard className="release-feature-panel p-6">
        <div className="release-feature-head">
          <div className="release-feature-icon">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <div>
            <GlassCapsule>System Settings</GlassCapsule>
            <h2>Personal command layer</h2>
          </div>
        </div>
        <div className="release-feature-grid">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <div key={section.title} className="rounded-[1.2rem] border border-white/12 bg-white/7 p-4">
                <div className="flex items-center gap-3">
                  <div className="release-feature-icon h-11 w-11 rounded-[1rem]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[color:var(--mode-muted)]">
                      {section.eyebrow}
                    </p>
                    <h3 className="mt-1 text-base font-black tracking-tight text-[color:var(--text-main)]">{section.title}</h3>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {section.items.map((item) => (
                    <div
                      key={item}
                      className="rounded-[0.95rem] border border-white/10 bg-white/6 px-3 py-2 text-[0.74rem] font-black uppercase tracking-[0.12em] text-[color:var(--mode-text)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </GlassCard>

      <GlassCard className="release-feature-panel p-6">
        <div className="release-feature-head">
          <div className="release-feature-icon">
            <LayoutPanelTop className="h-6 w-6" />
          </div>
          <div>
            <GlassCapsule>Island Defaults</GlassCapsule>
            <h2>Dynamic command shell behavior</h2>
          </div>
        </div>
        <div className="regular-room-grid">
          {islandDefaults.map(([label, value]) => (
            <span key={label}>
              {label}
              <br />
              {value}
            </span>
          ))}
        </div>
      </GlassCard>
    </section>
  )
}
