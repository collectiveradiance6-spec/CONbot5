import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import type { RouteKey } from '../../state/types'

export type CommandRoute = {
  to: string
  label: string
  icon: LucideIcon
  route: RouteKey
  routeLabel: string
}

export function CommandIslandRouteRail({
  routes,
  onRoute,
}: {
  routes: CommandRoute[]
  onRoute: (route: RouteKey) => void
}) {
  return (
    <nav className="command-route-rail" aria-label="CONbot5 routes">
      {routes.map(({ to, label, icon: Icon, route }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={() => onRoute(route)}
          className="command-route-pill"
          data-route={route}
        >
          {({ isActive }) => (
            <span data-active={isActive ? 'true' : 'false'}>
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
