import type { ReactNode } from 'react'

export function RouteHeroHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  status,
}: {
  eyebrow: string
  title: string
  subtitle: string
  actions?: ReactNode
  status?: ReactNode
}) {
  return (
    <header className="route-hero-header">
      <div className="min-w-0">
        <p className="route-hero-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="route-hero-subtitle">{subtitle}</p>
      </div>
      <div className="route-hero-actions">
        {status}
        {actions}
      </div>
    </header>
  )
}
