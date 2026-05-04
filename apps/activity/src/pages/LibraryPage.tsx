import { GlassCard } from '../components/ui/GlassCard'
import { GlassCapsule } from '../components/ui/GlassCapsule'

export function LibraryPage() {
  return (
    <GlassCard className="p-6">
      <GlassCapsule>Library</GlassCapsule>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Provider search and saved sources</h1>
      <p className="mt-2 max-w-2xl text-sm font-semibold text-ink/48">
        Official provider connectors will route through the Render API. Mock search stays labeled until credentials are configured.
      </p>
    </GlassCard>
  )
}
