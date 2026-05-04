import { useEffect, useState } from 'react'
import { BRAND } from '../../content/brandCopy'
import { GlassCard } from '../../components/ui/GlassCard'
import { GlassCapsule } from '../../components/ui/GlassCapsule'
import { RouteHeroHeader } from '../../components/layout/RouteHeroHeader'

export function HomeSurface() {
  const [ctaIndex, setCtaIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setCtaIndex((current) => (current + 1) % BRAND.ctas.length), 4200)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="home-surface">
      <RouteHeroHeader
        eyebrow={BRAND.matrixLabel}
        title={BRAND.productName}
        subtitle={BRAND.ctas[ctaIndex]}
        status={<GlassCapsule>{BRAND.domain}</GlassCapsule>}
      />

      <GlassCard className="brand-matrix-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <GlassCapsule>Dominion Dashboard</GlassCapsule>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-[color:var(--text-main)]">Prismatic Radiance Matrix</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[color:var(--mode-muted)]">
              The sealed command shell for regular Discord voice rooms first, Vibe Room Portals second, and premium media control throughout.
            </p>
          </div>
          <GlassCapsule>Core Session Online</GlassCapsule>
        </div>
        <div className="brand-value-matrix">
          {BRAND.valuePillars.map((pillar) => (
            <div key={pillar.title} className="brand-value-card">
              <strong>{pillar.title}</strong>
              <span>{pillar.subtitle}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
