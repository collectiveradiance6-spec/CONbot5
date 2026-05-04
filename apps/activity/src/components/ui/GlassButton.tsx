import type { ButtonHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'quiet'
}

export function GlassButton({
  className,
  children,
  variant = 'quiet',
  ...props
}: GlassButtonProps) {
  return (
    <button
      type="button"
      className={twMerge(
        'glass-control inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold tracking-tight',
        'outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        variant === 'primary'
          ? 'border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,.22),rgba(18,28,48,.92)_42%,rgba(5,8,16,.96))] text-white shadow-[0_14px_34px_rgba(0,0,0,.26),0_0_32px_var(--control-glow,rgba(122,219,255,.28))] active:scale-[0.98] hover:brightness-110'
          : 'border-white/16 bg-[color:var(--mode-control)] text-[color:var(--mode-text)] shadow-glass-soft backdrop-blur-2xl active:scale-[0.98] hover:bg-white/16 hover:shadow-[0_14px_36px_rgba(0,0,0,.18),0_0_24px_var(--control-glow,rgba(122,219,255,.22))]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
