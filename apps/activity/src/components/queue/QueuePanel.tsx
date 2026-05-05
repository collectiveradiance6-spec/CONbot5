import { Clock3, GripVertical, Play, X } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { GlassCapsule } from '../ui/GlassCapsule'
import { useConbotStore } from '../../state/useConbotStore'
import { sendPlaybackAction } from '../../lib/playbackActions'
import { CATALOG } from '../../lib/musicEngine'

function fmtMs(ms: number) {
  return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`
}

export function QueuePanel() {
  const queue = useConbotStore(s => s.queue)
  const currentTrack = useConbotStore(s => s.currentTrack)

  // Show live queue, fallback to catalog preview
  const tracks = queue.length > 0 ? queue : CATALOG.slice(1).map((t, i) => ({ ...t, queueId: `cat-${i}` }))
  const totalMs = tracks.reduce((a, t) => a + t.durationMs, 0)

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-5">
        <GlassCapsule>Queue</GlassCapsule>
        <div className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs font-black text-[color:var(--conbot-muted)]">
          <Clock3 className="h-3.5 w-3.5" />
          {fmtMs(totalMs)}
        </div>
      </div>

      {currentTrack && (
        <div className="mb-3 rounded-2xl border border-[color:var(--neon-cyan)]/30 bg-[color:var(--neon-cyan)]/8 p-3">
          <p className="text-xs font-black uppercase tracking-wider text-[color:var(--neon-cyan)] mb-1">Now Playing</p>
          <p className="font-black text-[color:var(--conbot-text)] truncate">{currentTrack.title}</p>
          <p className="text-xs text-[color:var(--conbot-muted)] truncate">{currentTrack.artist ?? currentTrack.artists?.join(', ')}</p>
        </div>
      )}

      <div className="space-y-2">
        {tracks.slice(0, 8).map((t, i) => (
          <div key={t.queueId ?? t.id ?? i} className="queue-track-row group"
            onClick={() => sendPlaybackAction('playback:load', { track: t })}>
            <GripVertical className="h-4 w-4 flex-shrink-0 text-[color:var(--conbot-muted)] opacity-40 group-hover:opacity-70" />
            <div className="queue-track-art" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-[color:var(--conbot-text)]">{t.title}</p>
              <p className="truncate text-xs text-[color:var(--conbot-muted)]">{t.artist ?? t.artists?.join(', ')}</p>
            </div>
            <span className="text-xs font-black text-[color:var(--conbot-muted)]">{fmtMs(t.durationMs)}</span>
            <Play className="h-3.5 w-3.5 text-[color:var(--neon-cyan)] opacity-0 group-hover:opacity-100 flex-shrink-0 transition" />
            {queue.length > 0 && t.queueId && (
              <button type="button" onClick={e => { e.stopPropagation(); sendPlaybackAction('playback:dequeue', { queueId: t.queueId! }) }}
                className="opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                <X className="h-3.5 w-3.5 text-red-400" />
              </button>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
