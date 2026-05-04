import { ConbotLogo } from './ConbotLogo'
import type { Track } from '../../state/types'

function artistsForTrack(track: Track | null) {
  if (!track) return 'Ready for session'
  if (track.artist) return track.artist
  if (track.artists?.length) return track.artists.join(', ')
  return track.provider ?? track.source ?? 'CONbot5'
}

export function BrandCluster({ currentTrack }: { currentTrack: Track | null }) {
  return (
    <div className="brand-cluster">
      <ConbotLogo />
      <div className="min-w-0">
        <span className="block text-[.68rem] font-black uppercase tracking-[.2em] text-[color:var(--text-muted)]">CONbot5 Core</span>
        <strong className="block truncate text-sm font-black text-[color:var(--text-main)]">
          {currentTrack?.title ?? 'No active track'}
        </strong>
        <span className="block truncate text-[.7rem] font-bold text-[color:var(--text-muted)]">{artistsForTrack(currentTrack)}</span>
      </div>
    </div>
  )
}
