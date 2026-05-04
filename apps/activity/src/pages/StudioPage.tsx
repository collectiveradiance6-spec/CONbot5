import { StudioControlsPanel } from '../components/studio/StudioControlsPanel'
import { NowPlayingPanel } from '../components/player/NowPlayingPanel'

export function StudioPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <StudioControlsPanel />
      <NowPlayingPanel />
    </div>
  )
}
