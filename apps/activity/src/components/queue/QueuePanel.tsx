import { Clock3, GripVertical } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { GlassCapsule } from '../ui/GlassCapsule'

const tracks = [
  ['Solar Bloom', 'Nia Vale', '3:16'],
  ['Pearl Frequency', 'Kaito Drift', '4:02'],
  ['Afterimage Choir', 'Muse Circuit', '2:57'],
  ['Soft Launch', 'Vellum', '3:34'],
  ['Glass House Orbit', 'Omni Blue', '5:11'],
]

export function QueuePanel() {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <GlassCapsule>Queue</GlassCapsule>
        <div className="flex items-center gap-1.5 rounded-full bg-white/36 px-3 py-2 text-xs font-bold text-ink/45 shadow-glass-inset">
          <Clock3 className="h-3.5 w-3.5" />
          18 min
        </div>
      </div>

      <div className="mt-7 space-y-3">
        {tracks.map(([title, artist, duration], index) => (
          <button
            key={title}
            type="button"
            className="group flex w-full items-center gap-3 rounded-[1.45rem] border border-white/52 bg-white/34 p-3 text-left shadow-glass-soft transition hover:bg-white/60"
          >
            <GripVertical className="h-4 w-4 shrink-0 text-ink/24 transition group-hover:text-ink/40" />
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#ffffff,#e0f8ff,#ffe4fb)] text-sm font-bold text-ink/50 shadow-glass-inset">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{title}</p>
              <p className="mt-1 truncate text-xs font-medium text-ink/45">{artist}</p>
            </div>
            <span className="text-xs font-semibold text-ink/38">{duration}</span>
          </button>
        ))}
      </div>
    </GlassCard>
  )
}
