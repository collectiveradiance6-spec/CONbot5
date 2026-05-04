import { VisualizerPanel } from '../components/visualizers/VisualizerPanel'
import { FloatingIslandScene } from '../components/visuals/FloatingIslandScene'
import { GlassCard } from '../components/ui/GlassCard'
import { GlassCapsule } from '../components/ui/GlassCapsule'
import { GlassButton } from '../components/ui/GlassButton'
import { islandProfiles } from '../components/visuals/LivingIslandTypes'

const islandControls = [
  ['Detail level', 'Low', 'Medium', 'Ultra'],
  ['Motion', 'Reduced', 'Normal', 'Reactive'],
  ['Weather', 'Off', 'Auto', 'Full'],
  ['Rivers', 'Subtle', 'Bright', 'Audio'],
  ['Reactor', 'Soft', 'Pulse', 'Bass'],
  ['Camera', 'Static', 'Parallax', 'Cinematic'],
]

export function VisualsPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <FloatingIslandScene />
      <VisualizerPanel />
      <GlassCard className="p-5 xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <GlassCapsule>Island Settings</GlassCapsule>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-[color:var(--mode-text)]">Floating world controls</h1>
            <p className="mt-2 text-sm font-semibold text-[color:var(--mode-muted)]">
              Controls are UI-ready for detail, weather, rivers, reactor intensity, listener orbs, and low-performance mode.
            </p>
          </div>
          <GlassButton>Reset visuals</GlassButton>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {islandControls.map(([label, ...options]) => (
            <div key={label} className="rounded-[1.5rem] border border-white/12 bg-white/10 p-3">
              <p className="px-2 text-xs font-black uppercase tracking-[.15em] text-[color:var(--mode-muted)]">{label}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {options.map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    className={`h-10 rounded-full border text-xs font-black transition ${
                      index === options.length - 1
                        ? 'border-white/20 bg-white text-slate-950'
                        : 'border-white/12 bg-white/10 text-[color:var(--mode-muted)] hover:bg-white/16'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="p-5 xl:col-span-2">
        <GlassCapsule>Theme Preview</GlassCapsule>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Object.values(islandProfiles).map((profile) => (
            <div key={profile.key} className="rounded-[1.5rem] border border-white/12 bg-white/10 p-4">
              <div
                className="h-12 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${profile.riverA}, ${profile.riverB}, ${profile.riverC})`,
                  boxShadow: `0 0 28px ${profile.reactor}55`,
                }}
              />
              <p className="mt-3 text-sm font-black text-[color:var(--mode-text)]">{profile.label}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[.14em] text-[color:var(--mode-muted)]">{profile.weather}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
