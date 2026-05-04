import { useEffect, useRef } from 'react'

type Ribbon = {
  color: string
  phase: number
  speed: number
  width: number
  y: number
}

const ribbons: Ribbon[] = [
  { color: 'rgba(49,231,255,.58)', phase: 0.1, speed: 0.32, width: 3.2, y: 0.48 },
  { color: 'rgba(255,79,216,.55)', phase: 1.8, speed: 0.26, width: 3.8, y: 0.57 },
  { color: 'rgba(255,209,102,.42)', phase: 3.2, speed: 0.22, width: 2.8, y: 0.64 },
  { color: 'rgba(109,255,157,.38)', phase: 4.4, speed: 0.28, width: 2.4, y: 0.52 },
  { color: 'rgba(139,92,255,.54)', phase: 5.1, speed: 0.24, width: 4.4, y: 0.7 },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function AmbientOceanEngine() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef({ x: 0.5, y: 0.45, glow: 0 })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const move = (event: PointerEvent) => {
      pointerRef.current.x = event.clientX / window.innerWidth
      pointerRef.current.y = event.clientY / window.innerHeight
      root.style.setProperty('--ocean-x', `${event.clientX}px`)
      root.style.setProperty('--ocean-y', `${event.clientY}px`)
    }

    const down = () => {
      pointerRef.current.glow = 1
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', down)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !context) return

    let frame = 0
    let width = 0
    let height = 0
    const started = performance.now()

    const resize = () => {
      const ratio = clamp(window.devicePixelRatio || 1, 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const drawRibbon = (ribbon: Ribbon, time: number) => {
      context.save()
      context.globalCompositeOperation = 'screen'
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.shadowColor = ribbon.color
      context.shadowBlur = 24
      context.strokeStyle = ribbon.color
      context.lineWidth = ribbon.width
      context.beginPath()
      for (let x = -80; x <= width + 80; x += 18) {
        const norm = x / Math.max(width, 1)
        const drift = Math.sin(norm * 9 + time * ribbon.speed + ribbon.phase) * 42
        const swell = Math.cos(norm * 17 - time * ribbon.speed * 0.7 + ribbon.phase) * 18
        const y = height * ribbon.y + drift + swell
        if (x === -80) context.moveTo(x, y)
        else context.lineTo(x, y)
      }
      context.stroke()

      context.globalAlpha = 0.25
      context.lineWidth = ribbon.width * 5
      context.stroke()
      context.restore()
    }

    const render = (now: number) => {
      const time = (now - started) / 1000
      const isDay = document.querySelector('[data-lighting="day"]') !== null
      const pointer = pointerRef.current
      if (pointer.glow > 0.002) pointer.glow *= 0.92

      context.clearRect(0, 0, width, height)

      const base = context.createLinearGradient(0, 0, width, height)
      if (isDay) {
        base.addColorStop(0, '#f6fbff')
        base.addColorStop(0.42, '#eaf8ff')
        base.addColorStop(1, '#fff7fb')
      } else {
        base.addColorStop(0, '#000004')
        base.addColorStop(0.46, '#03000c')
        base.addColorStop(1, '#070014')
      }
      context.fillStyle = base
      context.fillRect(0, 0, width, height)

      const horizon = context.createRadialGradient(width * 0.5, height * 0.82, 0, width * 0.5, height * 0.82, width * 0.86)
      horizon.addColorStop(0, isDay ? 'rgba(140,220,255,.34)' : 'rgba(96,44,220,.36)')
      horizon.addColorStop(0.42, isDay ? 'rgba(255,120,230,.16)' : 'rgba(255,55,220,.18)')
      horizon.addColorStop(1, 'rgba(0,0,0,0)')
      context.fillStyle = horizon
      context.fillRect(0, 0, width, height)

      context.save()
      context.globalAlpha = isDay ? 0.48 : 0.72
      ribbons.forEach((ribbon) => drawRibbon(ribbon, time))
      context.restore()

      for (let band = 0; band < 8; band += 1) {
        context.save()
        context.globalAlpha = isDay ? 0.16 : 0.28
        context.strokeStyle = band % 2 ? 'rgba(255,255,255,.18)' : 'rgba(130,220,255,.18)'
        context.lineWidth = 1
        context.beginPath()
        for (let x = -60; x <= width + 60; x += 36) {
          const y = height * (0.44 + band * 0.055) + Math.sin(x * 0.009 + time * 0.18 + band) * (18 + band * 2)
          if (x === -60) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.stroke()
        context.restore()
      }

      const cursor = context.createRadialGradient(width * pointer.x, height * pointer.y, 0, width * pointer.x, height * pointer.y, 340 + pointer.glow * 240)
      cursor.addColorStop(0, `rgba(255,255,255,${isDay ? 0.18 + pointer.glow * 0.16 : 0.12 + pointer.glow * 0.24})`)
      cursor.addColorStop(0.35, 'rgba(49,231,255,.08)')
      cursor.addColorStop(1, 'rgba(0,0,0,0)')
      context.fillStyle = cursor
      context.fillRect(0, 0, width, height)

      frame = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    frame = requestAnimationFrame(render)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div ref={rootRef} className="ambient-ocean-engine" aria-hidden="true">
      <canvas ref={canvasRef} className="ambient-ocean-canvas" />
      <div className="ambient-ocean-depth" />
      <div className="ambient-ocean-grain" />
      <div className="ambient-ocean-spotlight" />
    </div>
  )
}
