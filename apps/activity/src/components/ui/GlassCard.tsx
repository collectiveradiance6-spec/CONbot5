import type { HTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

type GlassCardProps = HTMLAttributes<HTMLDivElement>

export function GlassCard({ className, children, ...props }: GlassCardProps) {
  const handlePointerMove: HTMLAttributes<HTMLDivElement>['onPointerMove'] = (event) => {
    props.onPointerMove?.(event)
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--glass-light-x', `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty('--glass-light-y', `${event.clientY - rect.top}px`)
  }

  const handlePointerLeave: HTMLAttributes<HTMLDivElement>['onPointerLeave'] = (event) => {
    props.onPointerLeave?.(event)
    event.currentTarget.style.setProperty('--glass-light-x', '20%')
    event.currentTarget.style.setProperty('--glass-light-y', '0%')
  }

  return (
    <div
      className={twMerge(
        'glass-material relative overflow-hidden rounded-[2rem] border border-white/62 bg-[color:var(--card-tint,rgba(255,255,255,.42))] shadow-glass backdrop-blur-[34px]',
        'before:pointer-events-none before:absolute before:inset-px before:rounded-[calc(2rem-1px)] before:border before:border-white/60',
        'after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_var(--glass-light-x,20%)_var(--glass-light-y,0%),rgba(255,255,255,.78),transparent_28%),linear-gradient(135deg,rgba(255,255,255,.42),transparent_34%,rgba(126,226,255,.11)_62%,rgba(255,203,244,.1))]',
        className,
      )}
      {...props}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="relative z-10">{children}</div>
    </div>
  )
}
