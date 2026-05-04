import { Film, Play, ShieldAlert } from 'lucide-react'
import { GlassButton } from '../../components/ui/GlassButton'
import { sendConbotEvent } from '../../core/socket'
import type { MediaState } from './MediaTypes'

export function VideoPanel({ media }: { media: MediaState }) {
  const item = media.activeItem?.kind === 'video' ? media.activeItem : media.queue.find((entry) => entry.kind === 'video') ?? null
  const supported = media.status !== 'missing_env' && media.status !== 'provider_unsupported'

  return (
    <section className="media-video-panel">
      <div className="media-panel-header">
        <span><Film className="h-4 w-4" /> Video Panel</span>
        <strong>{media.source} / {media.status}</strong>
      </div>
      <div className="video-glass-frame">
        {item?.embedUrl && supported ? (
          <iframe src={item.embedUrl} title={item.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
        ) : (
          <div className="video-placeholder">
            <ShieldAlert className="h-9 w-9" />
            <p>{supported ? 'Thumbnail mode ready' : 'Provider missing env or unsupported'}</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[color:var(--text-main)]">{item?.title ?? 'No video selected'}</h2>
          <p className="mt-1 text-xs font-black uppercase tracking-[.16em] text-[color:var(--text-muted)]">
            {item?.creator ?? 'Official embed / legal route only'} / {item?.durationMs ? `${Math.round(item.durationMs / 1000)}s` : 'duration pending'}
          </p>
        </div>
        <GlassButton
          variant="primary"
          disabled={!item || item.metadataOnly}
          onClick={() => item && sendConbotEvent('media:play', { item })}
        >
          <Play className="h-4 w-4" />
          Play route
        </GlassButton>
      </div>
    </section>
  )
}
