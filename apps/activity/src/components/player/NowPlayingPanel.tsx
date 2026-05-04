import { Heart, Pause, SkipBack, SkipForward, Waves } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { GlassButton } from '../ui/GlassButton'
import { GlassCapsule } from '../ui/GlassCapsule'
import { sendPlaybackAction } from '../../lib/playbackActions'
import { useConbotStore } from '../../state/useConbotStore'
import { BRAND } from '../../content/brandCopy'

export function NowPlayingPanel() {
  const currentTrack = useConbotStore((state) => state.currentTrack)
  const title = currentTrack?.title ?? BRAND.matrixLabel
  const artist = currentTrack?.artist ?? currentTrack?.artists?.join(', ') ?? 'CONbot5'

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between gap-4">
        <GlassCapsule>Now Playing</GlassCapsule>
        <GlassButton className="h-10 w-10 px-0" aria-label="Favorite track">
          <Heart className="h-4 w-4" />
        </GlassButton>
      </div>

      <div className="mt-8 flex justify-center">
        <div className="relative h-56 w-56 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#ffffff,#c8f4ff_34%,#ffd8f6_68%,#fff3a8)] shadow-[inset_0_0_50px_rgba(255,255,255,.88),0_24px_60px_rgba(88,117,148,.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,.86),transparent_30%),radial-gradient(circle_at_62%_70%,rgba(255,255,255,.62),transparent_28%)]" />
          <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/60 bg-white/34 p-3 backdrop-blur-2xl">
            <p className="text-sm font-semibold text-ink">Core Signal</p>
            <p className="mt-1 text-xs font-medium text-ink/45">{BRAND.matrixLabel}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm font-medium text-ink/52">{artist} / server-authoritative sync</p>
      </div>

      <div className="mt-7">
        <div className="slider-shimmer flex h-16 items-center gap-1 rounded-[1.25rem] border border-white/58 bg-white/34 px-3 shadow-glass-inset">
          {Array.from({ length: 38 }).map((_, index) => {
            const height = 18 + ((index * 17) % 42)
            const active = index < 24
            return (
              <span
                key={index}
                className={`w-full rounded-full ${active ? 'bg-[color:var(--accent)]' : 'bg-ink/12'}`}
                style={{ height, animationDelay: `${index * 45}ms` }}
              />
            )
          })}
        </div>
        <div className="mt-3 flex justify-between text-xs font-semibold text-ink/42">
          <span>2:18</span>
          <span>3:42</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        <GlassButton
          className="h-11 w-11 px-0"
          aria-label="Previous track"
          onClick={() => sendPlaybackAction('playback:previous')}
        >
          <SkipBack className="h-4 w-4" />
        </GlassButton>
        <GlassButton
          variant="primary"
          className="h-12 w-12 px-0"
          aria-label="Pause"
          onClick={() => sendPlaybackAction('playback:pause')}
        >
          <Pause className="h-5 w-5 fill-current" />
        </GlassButton>
        <GlassButton className="h-11 w-11 px-0" aria-label="Next track" onClick={() => sendPlaybackAction('playback:skip')}>
          <SkipForward className="h-4 w-4" />
        </GlassButton>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-ink/54">
        <Waves className="h-4 w-4 text-sky-400" />
        Synced with 24 listeners
      </div>
    </GlassCard>
  )
}
