import { Grid3X3, ListMusic, Radio, Users } from 'lucide-react'
import { RouteHeroHeader } from '../../components/layout/RouteHeroHeader'
import { GlassButton } from '../../components/ui/GlassButton'
import { GlassCard } from '../../components/ui/GlassCard'
import { GlassCapsule } from '../../components/ui/GlassCapsule'
import { useConbotStore } from '../../state/useConbotStore'

type Portal = {
  key: string
  name: string
  track: string
  mood: string
  className: string
  listeners: number
}

const portals: Portal[] = [
  { key: 'midnight-lofi', name: 'Midnight Lo-Fi', track: 'Rainy Day Beats', mood: 'Violet rain glass', className: 'portal-midnight', listeners: 4 },
  { key: 'synthwave-lounge', name: 'Synthwave Lounge', track: 'Neon Highway', mood: 'Retro horizon pulse', className: 'portal-synthwave', listeners: 7 },
  { key: 'ambient-void', name: 'Ambient Void', track: 'Deep Space Silence', mood: 'Starfield drift', className: 'portal-void', listeners: 3 },
  { key: 'raid-prep-boss-fights', name: 'Raid Prep', track: 'Boss Gate Signal', mood: 'Crimson command storm', className: 'portal-raid', listeners: 12 },
  { key: 'party-room', name: 'Party Room', track: 'Spectrum Bounce', mood: 'Rainbow crowd glow', className: 'portal-party', listeners: 18 },
  { key: 'vgm-lounge', name: 'VGM Lounge', track: 'Pixel Starway', mood: 'Arcade neon grid', className: 'portal-vgm', listeners: 6 },
  { key: 'metal-forge', name: 'Metal Forge', track: 'Molten Core', mood: 'Lava glass forge', className: 'portal-metal', listeners: 5 },
  { key: 'chill-rnb', name: 'Chill R&B', track: 'Velvet Signal', mood: 'Violet rose haze', className: 'portal-rnb', listeners: 8 },
]

function PortalArtwork({ portal }: { portal: Portal }) {
  return (
    <div className={`portal-art ${portal.className}`}>
      <div className="portal-rain" />
      <div className="portal-sun" />
      <div className="portal-grid-lines" />
      <div className="portal-vortex" />
      <div className="portal-lava" />
      <div className="portal-spectrum" />
    </div>
  )
}

function VibePortalCard({ portal }: { portal: Portal }) {
  return (
    <GlassCard className={`vibe-portal-card ${portal.className}`}>
      <PortalArtwork portal={portal} />
      <div className="vibe-portal-content">
        <div>
          <h2>{portal.name}</h2>
          <p>{portal.mood}</p>
        </div>
        <div className="vibe-portal-dock">
          <div className="vibe-portal-thumb" />
          <div className="min-w-0">
            <strong>{portal.track}</strong>
            <span>{portal.listeners} listeners / active portal</span>
          </div>
          <div className="vibe-portal-actions">
            <button type="button" aria-label={`Open ${portal.name} grid`}><Grid3X3 className="h-4 w-4" /></button>
            <button type="button" aria-label={`Route audio to ${portal.name}`}><Radio className="h-4 w-4" /></button>
            <button type="button" aria-label={`Open ${portal.name} queue`}><ListMusic className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

export function VibeRoomPortalsPage() {
  const session = useConbotStore((state) => state.session)
  return (
    <section className="vibe-portals-page">
      <RouteHeroHeader
        eyebrow="VIBE ROOM PORTALS"
        title="CONbot5 Vibe Room Portals"
        subtitle="Optional themed spaces layered over the regular Discord voice-room foundation."
        status={<GlassCapsule>{session.globalActivity ? 'Global mode ready' : 'Vibe active'}</GlassCapsule>}
        actions={<GlassButton variant="primary"><Users className="h-4 w-4" /> Regular voice first</GlassButton>}
      />
      <div className="vibe-portal-grid">
        {portals.map((portal) => <VibePortalCard key={portal.key} portal={portal} />)}
      </div>
    </section>
  )
}
