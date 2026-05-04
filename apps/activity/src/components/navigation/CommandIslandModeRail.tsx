import { ChevronDown, ShieldCheck } from 'lucide-react'

export function CommandIslandModeRail({
  routeLabel,
  expanded,
  onToggle,
  admin,
}: {
  routeLabel: string
  expanded: boolean
  onToggle: () => void
  admin: boolean
}) {
  return (
    <div className="command-identity-strip">
      <span>{routeLabel}</span>
      {admin ? (
        <span className="command-admin-chip">
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin
        </span>
      ) : null}
      <button type="button" onClick={onToggle} aria-label={expanded ? 'Collapse command island' : 'Expand command island'}>
        <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} />
      </button>
    </div>
  )
}
