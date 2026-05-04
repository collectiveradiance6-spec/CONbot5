import { Trash2 } from 'lucide-react'
import { GlassButton } from '../../components/ui/GlassButton'
import { sendConbotEvent } from '../../core/socket'
import type { MediaState } from './MediaTypes'

export function MediaQueuePanel({ media }: { media: MediaState }) {
  return (
    <section className="media-queue-panel">
      <div className="media-panel-header">
        <span>Media Queue</span>
        <strong>{media.queue.length} items</strong>
      </div>
      <div className="grid gap-2">
        {media.queue.map((item) => (
          <div key={item.id} className="media-queue-row">
            <div>
              <p>{item.title}</p>
              <span>{item.source} / {item.kind}{item.metadataOnly ? ' / metadata only' : ''}</span>
            </div>
            <GlassButton className="h-9 w-9 px-0" aria-label="Remove media item" onClick={() => sendConbotEvent('media:queue:remove', { id: item.id })}>
              <Trash2 className="h-4 w-4" />
            </GlassButton>
          </div>
        ))}
      </div>
    </section>
  )
}
