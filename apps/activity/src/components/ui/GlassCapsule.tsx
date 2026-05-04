import type { HTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

type GlassCapsuleProps = HTMLAttributes<HTMLDivElement>

export function GlassCapsule({ className, children, ...props }: GlassCapsuleProps) {
  return (
    <div
      className={twMerge(
        'inline-flex w-fit items-center rounded-full border border-white/70 bg-white/48 px-3.5 py-2 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-ink/55 shadow-glass-soft backdrop-blur-2xl',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
