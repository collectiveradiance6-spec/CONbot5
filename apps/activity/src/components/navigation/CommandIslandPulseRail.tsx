import { AudioLines } from 'lucide-react'

export function CommandIslandPulseRail({
  active,
  target,
  queueCount,
}: {
  active: boolean
  target: string
  queueCount: number
}) {
  return (
    <div className="command-pulse-rail">
      <AudioLines className="h-4 w-4 text-[color:var(--neon-cyan)]" />
      <div className="command-pulse-wave" aria-label="Session pulse">
        {Array.from({ length: 24 }).map((_, index) => (
          <span
            key={index}
            style={{
              height: `${active ? 14 + ((index * 11) % 28) : 9 + ((index * 7) % 10)}px`,
              opacity: active ? 0.9 : 0.45,
            }}
          />
        ))}
      </div>
      <span className="command-pulse-meta">{target} / {queueCount} queued</span>
    </div>
  )
}
