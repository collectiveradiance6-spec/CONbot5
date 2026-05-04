import { useEffect, useRef } from 'react'

export type FluidAudioSignal = {
  bass?: number
  mid?: number
  treble?: number
}

type FluidReactiveBackgroundProps = {
  audioSignal?: FluidAudioSignal
  simulated?: boolean
}

const clampSignal = (value = 0) => Math.max(0, Math.min(1, value))

export function FluidReactiveBackground({
  audioSignal,
  simulated = true,
}: FluidReactiveBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef({ x: 0.5, y: 0.45, pulse: 0 })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const handlePointerMove = (event: PointerEvent) => {
      pointerRef.current.x = event.clientX / window.innerWidth
      pointerRef.current.y = event.clientY / window.innerHeight
      root.style.setProperty('--pointer-x', `${event.clientX}px`)
      root.style.setProperty('--pointer-y', `${event.clientY}px`)
    }

    const handlePointerDown = (event: PointerEvent) => {
      pointerRef.current.pulse = 1
      const node = document.createElement('span')
      node.className = 'pointer-ripple'
      node.style.left = `${event.clientX}px`
      node.style.top = `${event.clientY}px`
      root.appendChild(node)
      window.setTimeout(() => node.remove(), 900)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    let frame = 0
    let width = 0
    let height = 0
    const startedAt = performance.now()

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const render = (now: number) => {
      const elapsed = (now - startedAt) / 1000
      const isNight = document.documentElement.querySelector('[data-lighting="night"]') !== null
      const signal = audioSignal
        ? {
            bass: clampSignal(audioSignal.bass),
            mid: clampSignal(audioSignal.mid),
            treble: clampSignal(audioSignal.treble),
          }
        : simulated
          ? {
              bass: 0.48 + Math.sin(elapsed * 1.4) * 0.14,
              mid: 0.5 + Math.sin(elapsed * 0.9 + 1.2) * 0.12,
              treble: 0.52 + Math.sin(elapsed * 1.8 + 0.4) * 0.1,
            }
          : { bass: 0.45, mid: 0.45, treble: 0.45 }

      context.clearRect(0, 0, width, height)

      const base = context.createLinearGradient(0, 0, width, height)
      if (isNight) {
        base.addColorStop(0, '#050712')
        base.addColorStop(0.46, '#08111f')
        base.addColorStop(1, '#12071a')
      } else {
        base.addColorStop(0, '#ffffff')
        base.addColorStop(0.42, '#f8fdff')
        base.addColorStop(1, '#fffdf8')
      }
      context.fillStyle = base
      context.fillRect(0, 0, width, height)

      const drawGlow = (x: number, y: number, radius: number, color: string) => {
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, color)
        gradient.addColorStop(1, isNight ? 'rgba(5,7,18,0)' : 'rgba(255,255,255,0)')
        context.fillStyle = gradient
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      }

      drawGlow(width * (0.2 + Math.sin(elapsed * 0.12) * 0.05), height * 0.35, width * 0.42, `rgba(111,224,255,${isNight ? 0.26 + signal.mid * 0.18 : 0.18 + signal.mid * 0.12})`)
      drawGlow(width * 0.72, height * (0.22 + Math.cos(elapsed * 0.1) * 0.04), width * 0.36, `rgba(255,90,220,${isNight ? 0.2 + signal.treble * 0.16 : 0.16 + signal.treble * 0.1})`)
      drawGlow(width * 0.78, height * 0.8, width * 0.34, `rgba(255,211,92,${isNight ? 0.14 + signal.bass * 0.14 : 0.12 + signal.bass * 0.08})`)

      context.globalAlpha = 0.26 + signal.mid * 0.1
      for (let line = 0; line < 7; line += 1) {
        context.beginPath()
        const offset = line * height * 0.12
        for (let x = -40; x <= width + 40; x += 34) {
          const y =
            height * 0.48 +
            offset * 0.28 +
            Math.sin(x * 0.008 + elapsed * 0.42 + line) * (24 + signal.bass * 18) +
            Math.cos(x * 0.004 + elapsed * 0.24) * 18
          if (x === -40) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.strokeStyle =
          line % 3 === 0
            ? isNight ? 'rgba(68,224,255,.52)' : 'rgba(116,225,255,.42)'
            : line % 3 === 1
              ? isNight ? 'rgba(255,80,220,.4)' : 'rgba(255,190,240,.34)'
              : isNight ? 'rgba(255,210,88,.32)' : 'rgba(255,238,142,.3)'
        context.lineWidth = 1.2 + signal.treble * 0.8
        context.stroke()
      }
      context.globalAlpha = 1

      const pointer = pointerRef.current
      if (pointer.pulse > 0.01) pointer.pulse *= 0.92
      drawGlow(
        width * pointer.x,
        height * pointer.y,
        150 + pointer.pulse * 260,
        `rgba(255,255,255,${0.24 + pointer.pulse * 0.22})`,
      )

      frame = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    frame = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frame)
    }
  }, [audioSignal, simulated])

  return (
    <div
      ref={rootRef}
      className="fluid-background pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="fluid-canvas" />
      <div className="surface-sheen" />
      <div className="pointer-light" />
    </div>
  )
}
