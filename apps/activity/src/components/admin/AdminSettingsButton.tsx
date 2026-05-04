import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'

export function AdminSettingsButton({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) return null

  return (
    <Link
      to="/settings"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/65 bg-white/45 px-4 text-sm font-semibold text-ink shadow-glass-soft backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/70"
    >
      <Settings className="h-4 w-4" />
      Admin Settings
    </Link>
  )
}
