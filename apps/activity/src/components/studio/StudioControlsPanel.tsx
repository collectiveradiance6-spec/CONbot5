import { useState } from 'react'
import { Check, Gauge, SlidersHorizontal } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { GlassCapsule } from '../ui/GlassCapsule'

const bands = ['32', '64', '125', '250', '500', '1k', '4k']
const toggles = ['Limiter', 'Reverb', 'Chorus', 'Normalize', 'Crossfade']

function Dial({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid place-items-center rounded-[1.45rem] border border-white/58 bg-white/34 p-4 shadow-glass-soft">
      <div
        className="grid h-24 w-24 place-items-center rounded-full border border-white/70 bg-[conic-gradient(var(--accent)_0deg,rgba(255,255,255,.72)_0deg)] shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_12px_30px_rgba(86,112,145,.1)]"
        style={{ background: `conic-gradient(var(--accent) ${value * 3.6}deg, rgba(255,255,255,.68) 0deg)` }}
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-white/72 text-lg font-semibold text-ink shadow-glass-inset">
          {value}
        </div>
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-ink/45">{label}</p>
    </div>
  )
}

export function StudioControlsPanel() {
  const [enabled, setEnabled] = useState(() => new Set(['Limiter', 'Normalize']))

  const toggle = (label: string) => {
    setEnabled((current) => {
      const next = new Set(current)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <GlassCapsule>Studio</GlassCapsule>
        <SlidersHorizontal className="h-5 w-5 text-ink/42" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-[1.55rem] border border-white/58 bg-white/30 p-4 shadow-glass-inset">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink/60">
            <Gauge className="h-4 w-4 text-[color:var(--accent)]" />
            7-band EQ
          </div>
          <div className="grid grid-cols-7 gap-2">
            {bands.map((band, index) => {
              const level = [64, 78, 54, 70, 48, 82, 60][index]
              return (
                <div key={band} className="flex flex-col items-center gap-2">
                  <div className="flex h-40 w-full max-w-8 items-end rounded-full bg-white/54 p-1.5 shadow-glass-inset">
                    <div
                      className="w-full rounded-full bg-[linear-gradient(180deg,#fff,#9eeaff,#ffc8f2)] shadow-[0_0_18px_var(--control-glow)]"
                      style={{ height: `${level}%` }}
                    />
                  </div>
                  <span className="text-[0.62rem] font-bold text-ink/40">{band}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <Dial label="Volume" value={72} />
          <Dial label="Gain" value={18} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {toggles.map((label) => {
          const isEnabled = enabled.has(label)
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(label)}
              className={`flex h-12 items-center justify-center gap-2 rounded-full border text-xs font-bold transition ${
                isEnabled
                  ? 'border-white/80 bg-ink text-white shadow-[0_12px_30px_rgba(24,31,48,.14)]'
                  : 'border-white/58 bg-white/34 text-ink/52 hover:bg-white/58'
              }`}
            >
              {isEnabled && <Check className="h-3.5 w-3.5" />}
              {label}
            </button>
          )
        })}
      </div>
    </GlassCard>
  )
}
