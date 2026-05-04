import { Pause, Search, SlidersHorizontal } from 'lucide-react'
import { GlassButton } from '../ui/GlassButton'
import { GlassCard } from '../ui/GlassCard'
import { GlassCapsule } from '../ui/GlassCapsule'

export function FloatingIslandScene() {
  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <GlassCapsule>Floating Island Preview</GlassCapsule>
          <h2 className="mt-3 text-2xl font-black tracking-[-.03em] text-[color:var(--text-main)]">
            Dynamic command capsule
          </h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs font-black uppercase tracking-[.14em] text-[color:var(--text-muted)]">
          VisionOS style
        </span>
      </div>

      <div className="mt-5 rounded-[3rem] border border-white/12 bg-[color:var(--island-bg)] p-4 shadow-[0_30px_100px_var(--shadow-color),0_0_70px_var(--island-glow)] backdrop-blur-3xl">
        <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="h-20 w-20 rounded-[1.6rem] bg-[linear-gradient(135deg,#ffffff,#42eaff,#ff4fe0,#ffd95a)]" />
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[color:var(--text-muted)]">Expanded mode</p>
            <p className="mt-2 text-xl font-black text-[color:var(--text-main)]">Now Playing / Queue / Media / Studio</p>
            <div className="mt-3 flex h-9 items-center gap-1 rounded-full bg-white/8 px-3">
              {Array.from({ length: 22 }).map((_, index) => (
                <span
                  key={index}
                  className="w-1.5 rounded-full bg-[color:var(--waveform-color)]"
                  style={{ height: `${9 + ((index * 11) % 22)}px` }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <GlassButton className="h-11 w-11 px-0"><Pause className="h-4 w-4 fill-current" /></GlassButton>
            <GlassButton className="h-11 w-11 px-0"><Search className="h-4 w-4" /></GlassButton>
            <GlassButton className="h-11 w-11 px-0"><SlidersHorizontal className="h-4 w-4" /></GlassButton>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
