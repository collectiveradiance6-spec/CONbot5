import { Airplay, ListPlus, Pause, Repeat2, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { GlassButton } from '../ui/GlassButton'
import { sendPlaybackAction } from '../../lib/playbackActions'
import { useConbotStore } from '../../state/useConbotStore'
import { BRAND } from '../../content/brandCopy'

export function BottomTransportBar() {
  const currentTrack = useConbotStore((state) => state.currentTrack)
  const title = currentTrack?.title ?? BRAND.matrixLabel
  const artist = currentTrack?.artist ?? currentTrack?.artists?.join(', ') ?? 'CONbot5'

  return (
    <div className="fixed bottom-5 left-1/2 z-30 w-[min(1040px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="flex items-center justify-between gap-3 rounded-[2rem] border border-white/14 bg-[color:var(--mode-nav)] px-3 py-3 shadow-[0_28px_90px_rgba(0,0,0,.34),inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-3xl">
        <div className="hidden items-center gap-3 pl-2 sm:flex">
          <div className="h-12 w-12 rounded-2xl bg-[linear-gradient(135deg,#ffffff,#38e8ff_42%,#ff50dc_72%,#ffd85f)] shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_0_34px_rgba(79,220,255,.22)]" />
          <div>
            <p className="text-sm font-black text-[color:var(--mode-text)]">{title}</p>
            <p className="text-xs font-bold text-[color:var(--mode-muted)]">{artist} / synced</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center gap-2 sm:flex-none">
          <GlassButton className="h-11 w-11 px-0" aria-label="Shuffle" onClick={() => sendPlaybackAction('playback:shuffle', { shuffleEnabled: true })}>
            <Shuffle className="h-4 w-4" />
          </GlassButton>
          <GlassButton className="h-11 w-11 px-0" aria-label="Previous track" onClick={() => sendPlaybackAction('playback:previous')}>
            <SkipBack className="h-4 w-4" />
          </GlassButton>
          <GlassButton variant="primary" className="h-14 w-14 px-0" aria-label="Pause" onClick={() => sendPlaybackAction('playback:pause')}>
            <Pause className="h-5 w-5 fill-current" />
          </GlassButton>
          <GlassButton className="h-11 w-11 px-0" aria-label="Next track" onClick={() => sendPlaybackAction('playback:skip')}>
            <SkipForward className="h-4 w-4" />
          </GlassButton>
          <GlassButton className="h-11 w-11 px-0" aria-label="Repeat" onClick={() => sendPlaybackAction('playback:loop', { loopMode: 'all' })}>
            <Repeat2 className="h-4 w-4" />
          </GlassButton>
        </div>

        <div className="hidden items-center gap-2 pr-2 md:flex">
          <div className="flex h-11 items-center gap-1 rounded-full border border-white/14 bg-white/10 px-3 shadow-glass-inset">
            {[30, 54, 78, 48, 66].map((height, index) => (
              <span
                key={index}
                className="w-1.5 rounded-full bg-[color:var(--accent)]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <GlassButton className="h-11 w-11 px-0" aria-label="Output device">
            <Airplay className="h-4 w-4" />
          </GlassButton>
          <GlassButton
            className="h-11 w-11 px-0"
            aria-label="Add to queue"
            onClick={() =>
              sendPlaybackAction('playback:queue:add', {
                track: {
                  id: `local-${Date.now()}`,
                  provider: 'local',
                  title: 'Requested Track',
                  artists: ['CONbot5'],
                  durationMs: 180000,
                },
              })
            }
          >
            <ListPlus className="h-4 w-4" />
          </GlassButton>
          <div className="flex h-11 w-32 items-center gap-2 rounded-full border border-white/14 bg-white/10 px-3 shadow-glass-inset">
            <Volume2 className="h-4 w-4 text-[color:var(--mode-muted)]" />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/16">
              <div className="h-full w-[72%] rounded-full bg-[color:var(--accent)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
