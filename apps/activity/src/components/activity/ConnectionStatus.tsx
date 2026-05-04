import type { WebSocketConnectionStatus } from '../../config/env'

export function ConnectionStatus({ status }: { status: WebSocketConnectionStatus }) {
  const color = status === 'Connected' ? 'bg-emerald-300' : status === 'Reconnecting' ? 'bg-amber-300' : 'bg-slate-300'

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/62 bg-white/42 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/56 shadow-glass-soft backdrop-blur-2xl">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {status}
    </div>
  )
}
