import type { ActivityShellContext } from '../layout/AppShell'
import { PrismaticCoreShell } from './PrismaticCoreShell'

export function DynamicCommandIsland({ context }: { context: ActivityShellContext }) {
  return <PrismaticCoreShell context={context} />
}
