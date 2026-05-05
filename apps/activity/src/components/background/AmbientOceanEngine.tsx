import { useEffect, useRef } from 'react'

type Wave = {
  hue: number
  sat: number
  light: number
  alpha: number
  phase: number
  speed: number
  amp: number
  freq: number
  y: number
  width: number
}

const WAVES: Wave[] = [
  { hue: 185, sat: 100, light: 65, alpha: 0.72, phase: 0.0, speed: 0.28, amp: 52, freq: 5.2, y: 0.52, width: 4 },
  { hue: 290, sat: 90,  light: 60, alpha: 0.68, phase: 1.4, speed: 0.22, amp: 44, freq: 6.8, y: 0.58, width: 5 },
  { hue: 45,  sat: 100, light: 70, alpha: 0.52, phase: 2.8, speed: 0.18, amp: 36, freq: 4.4, y: 0.65, width: 3.5 },
  { hue: 330, sat: 95,  light: 68, alpha: 0.62, phase: 4.1, speed: 0.25, amp: 48, freq: 7.2, y: 0.46, width: 4.5 },
  { hue: 140, sat: 80,  light: 62, alpha: 0.44, phase: 5.6, speed: 0.20, amp: 32, freq: 5.8, y: 0.72, width: 3 },
  { hue: 210, sat: 85,  light: 60, alpha: 0.38, phase: 0.9, speed: 0.15, amp: 28, freq: 8.4, y: 0.38, width: 2.5 },
  { hue: 0,   sat: 90,  light: 65, alpha: 0.34, phase: 3.3, speed: 0.30, amp: 22, freq: 9.6, y: 0.78, width: 2 },
]

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

export function AmbientOceanEngine() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ptrRef = useRef({ x: 0.5, y: 0.45, burst: 0 })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onMove = (e: PointerEvent) => {
      ptrRef.current.x = e.clientX / window.innerWidth
      ptrRef.current.y = e.clientY / window.innerHeight
      root.style.setProperty('--ocean-x', `${e.clientX}px`)
      root.style.setProperty('--ocean-y', `${e.clientY}px`)
    }
    const onDown = () => { ptrRef.current.burst = 1 }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !ctx) return

    let raf = 0
    let W = 0, H = 0
    const start = performance.now()

    const resize = () => {
      const dpr = clamp(devicePixelRatio || 1, 1, 2)
      W = innerWidth; H = innerHeight
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawWave = (w: Wave, t: number) => {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const col = `hsla(${w.hue},${w.sat}%,${w.light}%,${w.alpha})`
      ctx.shadowColor = col
      ctx.shadowBlur = 32
      ctx.strokeStyle = col
      ctx.lineWidth = w.width
      ctx.beginPath()
      for (let x = -100; x <= W + 100; x += 14) {
        const n = x / Math.max(W, 1)
        const a = Math.sin(n * w.freq + t * w.speed + w.phase) * w.amp
        const b = Math.cos(n * (w.freq * 1.7) - t * w.speed * 0.6 + w.phase) * (w.amp * 0.4)
        const y = H * w.y + a + b
        x === -100 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.globalAlpha = 0.18
      ctx.lineWidth = w.width * 7
      ctx.stroke()
      ctx.restore()
    }

    const render = (now: number) => {
      const t = (now - start) / 1000
      const ptr = ptrRef.current
      if (ptr.burst > 0.004) ptr.burst *= 0.91

      ctx.clearRect(0, 0, W, H)

      // Deep void base
      const bg = ctx.createLinearGradient(0, 0, W, H)
      bg.addColorStop(0,    '#000005')
      bg.addColorStop(0.38, '#020009')
      bg.addColorStop(0.72, '#05000f')
      bg.addColorStop(1,    '#000308')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Horizon chromatic bloom
      const bloom = ctx.createRadialGradient(W * 0.5, H * 0.78, 0, W * 0.5, H * 0.78, W * 0.9)
      bloom.addColorStop(0,    'rgba(80,30,180,.38)')
      bloom.addColorStop(0.28, 'rgba(255,50,200,.22)')
      bloom.addColorStop(0.58, 'rgba(30,180,255,.14)')
      bloom.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.fillStyle = bloom
      ctx.fillRect(0, 0, W, H)

      // Top-left corner accent
      const corner = ctx.createRadialGradient(W * 0.08, H * 0.12, 0, W * 0.08, H * 0.12, W * 0.38)
      corner.addColorStop(0,   'rgba(100,240,255,.18)')
      corner.addColorStop(0.5, 'rgba(80,100,255,.1)')
      corner.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = corner
      ctx.fillRect(0, 0, W, H)

      // All chromatic waves
      ctx.save()
      ctx.globalAlpha = 0.88
      WAVES.forEach(w => drawWave(w, t))
      ctx.restore()

      // Fine grid shimmer
      for (let band = 0; band < 6; band++) {
        ctx.save()
        ctx.globalAlpha = 0.14
        ctx.strokeStyle = 'rgba(255,255,255,.18)'
        ctx.lineWidth = 0.8
        ctx.beginPath()
        for (let x = -60; x <= W + 60; x += 32) {
          const y = H * (0.42 + band * 0.07) + Math.sin(x * 0.011 + t * 0.16 + band * 0.9) * (14 + band * 1.5)
          x === -60 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.restore()
      }

      // Pointer halo
      const px = W * ptr.x, py = H * ptr.y
      const halo = ctx.createRadialGradient(px, py, 0, px, py, 380 + ptr.burst * 260)
      halo.addColorStop(0,    `rgba(255,255,255,${0.14 + ptr.burst * 0.28})`)
      halo.addColorStop(0.3,  'rgba(80,220,255,.08)')
      halo.addColorStop(0.65, 'rgba(220,80,255,.06)')
      halo.addColorStop(1,    'rgba(0,0,0,0)')
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, W, H)

      // Grain overlay
      ctx.save()
      ctx.globalAlpha = 0.032
      ctx.fillStyle = 'rgba(255,255,255,1)'
      for (let i = 0; i < 360; i++) {
        const gx = Math.random() * W
        const gy = Math.random() * H
        ctx.fillRect(gx, gy, 1, 1)
      }
      ctx.restore()

      raf = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    raf = requestAnimationFrame(render)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={rootRef} className="ambient-ocean-engine" aria-hidden="true">
      <canvas ref={canvasRef} className="ambient-ocean-canvas" />
      <div className="ambient-ocean-depth" />
      <div className="ambient-ocean-spotlight" />
    </div>
  )
}
