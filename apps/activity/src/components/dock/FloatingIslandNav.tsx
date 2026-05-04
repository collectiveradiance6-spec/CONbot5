import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, Library, ListMusic, Radio, SlidersHorizontal, Sparkles, Wand2 } from 'lucide-react'
import { GlassButton } from '../ui/GlassButton'

const navItems = [
  { label: 'Home', icon: Home },
  { label: 'Library', icon: Library },
  { label: 'Queue', icon: ListMusic },
  { label: 'Live', icon: Radio },
  { label: 'Studio', icon: SlidersHorizontal },
  { label: 'Visuals', icon: Sparkles },
  { label: 'Settings', icon: Wand2 },
]

export function FloatingIslandNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [active, setActive] = useState('Home')

  return (
    <motion.nav
      layout
      className="fixed left-1/2 top-5 z-30"
      style={{ x: '-50%' }}
      aria-label="CONbot5"
    >
      <motion.div
        layout
        className="glass-material relative overflow-hidden rounded-full border border-white/72 bg-white/50 p-2 shadow-glass backdrop-blur-[38px] before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:bg-[linear-gradient(115deg,rgba(255,255,255,.76),transparent_28%,rgba(124,225,255,.24)_48%,rgba(255,199,244,.2)_68%,transparent_82%)] after:pointer-events-none after:absolute after:inset-x-8 after:-bottom-8 after:h-14 after:rounded-full after:bg-[radial-gradient(ellipse,var(--control-glow),transparent_68%)] after:blur-2xl"
        animate={{ borderRadius: isOpen ? 999 : 999, scale: isOpen ? 1 : 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <div className="relative z-10 flex items-center gap-2">
          <GlassButton
            aria-expanded={isOpen}
            aria-controls="floating-island-nav"
            className={`h-12 ${isOpen ? 'px-5' : 'w-12 px-0'} overflow-hidden transition-[width,padding] duration-500`}
            onClick={() => setIsOpen((value) => !value)}
          >
            <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/70 bg-[#05070b] shadow-[inset_0_0_12px_rgba(255,255,255,.22),0_0_18px_var(--control-glow,rgba(125,215,255,.75))]">
              <motion.span
                className="absolute left-1.5 top-1.5 h-1 w-1 rounded-[2px] bg-cyan-200 shadow-[8px_2px_0_#ffd3f5,14px_10px_0_#fff28b,5px_15px_0_#b9ffd0]"
                animate={{ x: [0, 2, -1, 0], y: [0, -1, 1, 0], opacity: [0.8, 1, 0.72, 0.9] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.span
                className="absolute bottom-1.5 left-2 h-1 w-4 rounded-sm bg-white/70"
                animate={{ scaleX: [0.75, 1, 0.84], opacity: [0.54, 0.88, 0.62] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.span
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(125,229,255,.25),transparent_58%)]"
                animate={{ scale: [0.6, 1.22], opacity: [0.4, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
              />
            </span>
            <motion.span
              className="whitespace-nowrap"
              animate={{ width: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
            >
              CONbot5 Core
            </motion.span>
          </GlassButton>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                id="floating-island-nav"
                className="hidden items-center gap-1 md:flex"
                initial={{ opacity: 0, width: 0, x: -10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, width: 'auto', x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, width: 0, x: -8, filter: 'blur(8px)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              >
                {navItems.map(({ label, icon: Icon }) => (
                  <motion.button
                    key={label}
                    type="button"
                    className="relative flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-ink/62 transition hover:text-ink"
                    initial={{ opacity: 0, y: 7 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    onClick={() => setActive(label)}
                  >
                    {active === label && (
                      <motion.span
                        layoutId="active-nav-capsule"
                        className="absolute inset-0 rounded-full bg-ink shadow-[0_12px_30px_rgba(24,31,48,.16),inset_0_1px_0_rgba(255,255,255,.16)]"
                        transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-2 ${active === label ? 'text-white' : ''}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              className="mt-2 grid grid-cols-2 gap-1 md:hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {navItems.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className={`flex h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition ${
                    active === label ? 'bg-ink text-white' : 'bg-white/32 text-ink/62'
                  }`}
                  onClick={() => setActive(label)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.nav>
  )
}
