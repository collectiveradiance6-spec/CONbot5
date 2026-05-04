import { useEffect, useMemo, useRef } from 'react'
import { islandProfiles, type IslandProfile, type LivingIslandProps } from './LivingIslandTypes'

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const bigint = Number.parseInt(normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r},${g},${b},${alpha})`
}

function drawRoundedRectPath(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function resolveState(props: LivingIslandProps) {
  const playback = props.playbackState
  if (playback?.status) return playback.status
  if (playback?.queueSize === 0) return 'queue-empty'
  if (playback?.isPlaying) return 'playing'
  return 'connected'
}

function drawAtmosphere(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  profile: IslandProfile,
  isDay: boolean,
  intensity: number,
) {
  const sky = context.createLinearGradient(0, 0, width, height)
  if (isDay) {
    sky.addColorStop(0, '#f8fdff')
    sky.addColorStop(0.56, '#dff7ff')
    sky.addColorStop(1, '#fff8ee')
  } else {
    sky.addColorStop(0, profile.skyA)
    sky.addColorStop(0.55, profile.skyB)
    sky.addColorStop(1, 'rgba(2,5,14,.98)')
  }
  context.fillStyle = sky
  context.fillRect(0, 0, width, height)

  const horizon = context.createRadialGradient(width * 0.5, height * 0.56, 0, width * 0.5, height * 0.56, width * 0.5)
  horizon.addColorStop(0, hexToRgba(profile.reactor, isDay ? 0.2 : 0.28 * intensity))
  horizon.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = horizon
  context.fillRect(0, 0, width, height)

  if (profile.weather === 'grid') {
    context.save()
    context.globalAlpha = isDay ? 0.16 : 0.32
    context.strokeStyle = hexToRgba(profile.riverA, 0.78)
    context.lineWidth = 1
    const horizonY = height * 0.62
    for (let i = 0; i < 10; i += 1) {
      const y = horizonY + i * i * 2.6
      context.beginPath()
      context.moveTo(width * 0.05, y)
      context.lineTo(width * 0.95, y)
      context.stroke()
    }
    for (let i = -8; i <= 8; i += 1) {
      context.beginPath()
      context.moveTo(width * 0.5, horizonY)
      context.lineTo(width * (0.5 + i * 0.08), height)
      context.stroke()
    }
    context.restore()
  }

  const particleCount = profile.weather === 'confetti' ? 52 : profile.weather === 'rain' ? 42 : profile.weather === 'storm' ? 18 : 34
  for (let i = 0; i < particleCount; i += 1) {
    const seed = i * 97.13
    const x = (seed % width) + Math.sin(time * 0.3 + i) * 8
    const y = ((seed * 1.7 + time * (profile.weather === 'rain' ? 80 : 18) * profile.motion) % (height + 60)) - 30
    context.save()
    if (profile.weather === 'rain') {
      context.strokeStyle = 'rgba(160,210,255,.28)'
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x - 7, y + 18)
      context.stroke()
    } else if (profile.weather === 'embers') {
      context.fillStyle = `rgba(255,130,34,${0.18 + (i % 5) * 0.04})`
      context.beginPath()
      context.arc(x, height - ((y + time * 20) % height), 1.2 + (i % 3), 0, Math.PI * 2)
      context.fill()
    } else if (profile.weather === 'confetti' || profile.weather === 'pixels') {
      context.fillStyle = [profile.riverA, profile.riverB, profile.riverC][i % 3]
      context.globalAlpha = profile.weather === 'pixels' ? 0.45 : 0.55
      context.fillRect(x, y, profile.weather === 'pixels' ? 4 : 3, profile.weather === 'pixels' ? 4 : 8)
    } else {
      context.fillStyle = i % 2 ? hexToRgba(profile.riverB, isDay ? 0.16 : 0.28) : 'rgba(255,255,255,.28)'
      context.beginPath()
      context.arc(x, y, 0.8 + (i % 3) * 0.45, 0, Math.PI * 2)
      context.fill()
    }
    context.restore()
  }

  if (profile.weather === 'storm') {
    context.save()
    context.globalAlpha = 0.22 + Math.max(0, Math.sin(time * 5)) * 0.28
    context.strokeStyle = hexToRgba(profile.riverC, 0.9)
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(width * 0.75, height * 0.08)
    context.lineTo(width * 0.68, height * 0.22)
    context.lineTo(width * 0.74, height * 0.24)
    context.lineTo(width * 0.62, height * 0.45)
    context.stroke()
    context.restore()
  }
}

function drawReflection(context: CanvasRenderingContext2D, width: number, height: number, profile: IslandProfile, isDay: boolean, energy: number) {
  const reflection = context.createRadialGradient(width * 0.52, height * 0.76, 0, width * 0.52, height * 0.76, width * 0.36)
  reflection.addColorStop(0, isDay ? 'rgba(255,255,255,.34)' : hexToRgba(profile.reactor, 0.22 + energy * 0.12))
  reflection.addColorStop(0.45, isDay ? hexToRgba(profile.riverA, 0.12) : hexToRgba(profile.riverB, 0.14))
  reflection.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = reflection
  context.beginPath()
  context.ellipse(width * 0.52, height * 0.76, width * 0.34, height * 0.08, 0, 0, Math.PI * 2)
  context.fill()
}

function islandPath(context: CanvasRenderingContext2D, width: number, height: number, bob: number) {
  const cx = width * 0.52
  const cy = height * 0.47 + bob
  context.beginPath()
  context.moveTo(cx - width * 0.34, cy - height * 0.025)
  context.lineTo(cx - width * 0.27, cy - height * 0.095)
  context.lineTo(cx - width * 0.16, cy - height * 0.128)
  context.lineTo(cx - width * 0.05, cy - height * 0.102)
  context.lineTo(cx + width * 0.06, cy - height * 0.142)
  context.lineTo(cx + width * 0.19, cy - height * 0.108)
  context.lineTo(cx + width * 0.31, cy - height * 0.048)
  context.lineTo(cx + width * 0.35, cy + height * 0.032)
  context.lineTo(cx + width * 0.23, cy + height * 0.09)
  context.lineTo(cx + width * 0.08, cy + height * 0.118)
  context.lineTo(cx - width * 0.08, cy + height * 0.102)
  context.lineTo(cx - width * 0.22, cy + height * 0.115)
  context.lineTo(cx - width * 0.35, cy + height * 0.055)
  context.closePath()
}

function drawIslandRim(context: CanvasRenderingContext2D, width: number, height: number, bob: number, profile: IslandProfile, isDay: boolean) {
  const cx = width * 0.52
  const cy = height * 0.47 + bob
  context.save()
  context.strokeStyle = isDay ? 'rgba(255,255,255,.82)' : 'rgba(156,230,255,.34)'
  context.lineWidth = 6
  context.lineJoin = 'round'
  islandPath(context, width, height, bob)
  context.stroke()
  context.strokeStyle = hexToRgba(profile.reactor, isDay ? 0.16 : 0.45)
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(cx - width * 0.32, cy + height * 0.055)
  context.lineTo(cx - width * 0.2, cy + height * 0.115)
  context.lineTo(cx - width * 0.05, cy + height * 0.12)
  context.lineTo(cx + width * 0.1, cy + height * 0.105)
  context.lineTo(cx + width * 0.26, cy + height * 0.07)
  context.stroke()
  context.restore()
}

function drawLandmass(context: CanvasRenderingContext2D, width: number, height: number, profile: IslandProfile, isDay: boolean, bob: number, energy: number) {
  const cx = width * 0.52
  const cy = height * 0.47 + bob

  context.save()
  context.shadowBlur = isDay ? 22 : 46
  context.shadowColor = hexToRgba(profile.reactor, isDay ? 0.28 : 0.55)

  const underside = context.createLinearGradient(0, cy + height * 0.02, 0, cy + height * 0.24)
  underside.addColorStop(0, isDay ? 'rgba(92,126,156,.9)' : 'rgba(5,9,18,.98)')
  underside.addColorStop(0.58, hexToRgba(profile.reactor, isDay ? 0.2 : 0.42 + energy * 0.14))
  underside.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = underside
  context.beginPath()
  context.moveTo(cx - width * 0.31, cy + height * 0.052)
  context.lineTo(cx - width * 0.2, cy + height * 0.21)
  context.lineTo(cx - width * 0.1, cy + height * 0.135)
  context.lineTo(cx - width * 0.02, cy + height * 0.24)
  context.lineTo(cx + width * 0.08, cy + height * 0.13)
  context.lineTo(cx + width * 0.19, cy + height * 0.205)
  context.lineTo(cx + width * 0.31, cy + height * 0.04)
  context.lineTo(cx + width * 0.2, cy + height * 0.092)
  context.lineTo(cx + width * 0.04, cy + height * 0.118)
  context.lineTo(cx - width * 0.13, cy + height * 0.108)
  context.closePath()
  context.fill()

  context.strokeStyle = hexToRgba(profile.reactor, isDay ? 0.22 : 0.5)
  context.lineWidth = 1
  for (let shard = -3; shard <= 3; shard += 1) {
    context.beginPath()
    context.moveTo(cx + shard * width * 0.07, cy + height * 0.09)
    context.lineTo(cx + shard * width * 0.05, cy + height * (0.15 + (Math.abs(shard) % 2) * 0.05))
    context.stroke()
  }

  const landGradient = context.createLinearGradient(cx - width * 0.2, cy - height * 0.12, cx + width * 0.22, cy + height * 0.1)
  landGradient.addColorStop(0, isDay ? 'rgba(255,255,255,.92)' : 'rgba(33,45,68,.94)')
  landGradient.addColorStop(0.44, isDay ? 'rgba(190,241,255,.76)' : 'rgba(15,25,44,.96)')
  landGradient.addColorStop(1, isDay ? 'rgba(255,229,250,.72)' : 'rgba(55,28,65,.9)')
  context.fillStyle = landGradient
  islandPath(context, width, height, bob)
  context.fill()
  drawIslandRim(context, width, height, bob, profile, isDay)

  context.save()
  islandPath(context, width, height, bob)
  context.clip()
  context.strokeStyle = isDay ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.08)'
  context.lineWidth = 1
  for (let facet = 0; facet < 12; facet += 1) {
    context.beginPath()
    context.moveTo(cx - width * 0.28 + facet * width * 0.052, cy - height * 0.11)
    context.lineTo(cx - width * 0.22 + facet * width * 0.046, cy + height * 0.1)
    context.stroke()
  }
  if (profile.key === 'metal-forge') {
    context.strokeStyle = 'rgba(255,116,28,.72)'
    context.lineWidth = 2
    for (let crack = 0; crack < 4; crack += 1) {
      context.beginPath()
      context.moveTo(cx - width * 0.16 + crack * width * 0.09, cy - height * 0.07)
      context.lineTo(cx - width * 0.12 + crack * width * 0.08, cy + height * 0.02)
      context.lineTo(cx - width * 0.16 + crack * width * 0.08, cy + height * 0.07)
      context.stroke()
    }
  }
  context.restore()

  context.restore()
}

function drawAudioRivers(context: CanvasRenderingContext2D, width: number, height: number, time: number, profile: IslandProfile, bob: number, energy: number, speed: number) {
  const cx = width * 0.52
  const cy = height * 0.47 + bob
  const colors = [profile.riverA, profile.riverB, profile.riverC]
  context.save()
  context.lineCap = 'round'
  context.shadowBlur = 18 + energy * 18
  islandPath(context, width, height, bob)
  context.clip()
  for (let river = 0; river < 3; river += 1) {
    context.beginPath()
    for (let p = 0; p <= 1; p += 0.045) {
      const direction = river === 1 ? -1 : 1
      const x = cx + direction * (p - 0.08) * width * (0.25 + river * 0.04)
      const y = cy - height * (0.02 + river * 0.024) + Math.sin(p * 12 + time * speed + river) * (4 + energy * 3)
      if (p === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    context.strokeStyle = hexToRgba(colors[river], 0.66 + energy * 0.24)
    context.shadowColor = colors[river]
    context.lineWidth = 2.4 + energy * 1.6
    context.stroke()
  }
  context.restore()
}

function drawEqualizerTowers(context: CanvasRenderingContext2D, width: number, height: number, time: number, profile: IslandProfile, bob: number, energy: number, reduced: boolean) {
  const cx = width * 0.52
  const cy = height * 0.47 + bob
  context.save()
  context.shadowBlur = 12
  context.shadowColor = profile.reactor
  for (let i = -5; i <= 5; i += 1) {
    if (i === 0) continue
    const amp = reduced ? 0.45 : 0.45 + Math.abs(Math.sin(time * (1.4 + Math.abs(i) * 0.12) + i)) * energy
    const towerHeight = height * (0.05 + amp * 0.1)
    const spread = profile.weather === 'pixels' ? 0.041 : 0.037
    const x = cx + i * width * spread
    const baseY = cy - height * (0.062 + Math.abs(i) * 0.003)
    const y = baseY - towerHeight
    context.fillStyle = 'rgba(0,0,0,.2)'
    drawRoundedRectPath(context, x - 6, baseY - 2, 12, 8, 4)
    context.fill()
    const gradient = context.createLinearGradient(x, y, x, y + towerHeight)
    gradient.addColorStop(0, hexToRgba(profile.reactor, 0.88))
    gradient.addColorStop(1, 'rgba(255,255,255,.12)')
    context.fillStyle = gradient
    drawRoundedRectPath(context, x - 4.5, y, 9, towerHeight, profile.weather === 'pixels' ? 1 : 4)
    context.fill()
    context.strokeStyle = 'rgba(255,255,255,.16)'
    context.lineWidth = 1
    context.stroke()
  }
  context.restore()
}

function drawReactor(context: CanvasRenderingContext2D, width: number, height: number, profile: IslandProfile, bob: number, energy: number, state: string, time: number) {
  const cx = width * 0.52
  const cy = height * 0.39 + bob
  const pulse = state === 'playing' ? 1 + Math.sin(time * 4) * 0.12 + energy * 0.18 : state === 'paused' ? 0.72 : state === 'queue-empty' ? 0.55 : 0.92
  context.save()
  context.shadowBlur = 34 * pulse
  context.shadowColor = state === 'error' ? '#ff453a' : profile.reactor
  context.save()
  context.translate(cx, cy)
  context.rotate(Math.sin(time * 0.7) * 0.08)
  context.fillStyle = hexToRgba(state === 'error' ? '#ff453a' : profile.reactor, 0.58)
  context.beginPath()
  context.moveTo(0, -width * 0.065 * pulse)
  context.lineTo(width * 0.045 * pulse, 0)
  context.lineTo(0, width * 0.07 * pulse)
  context.lineTo(-width * 0.045 * pulse, 0)
  context.closePath()
  context.fill()
  context.strokeStyle = 'rgba(255,255,255,.72)'
  context.lineWidth = 1
  context.stroke()
  context.restore()

  const core = context.createRadialGradient(cx, cy, 0, cx, cy, width * 0.08 * pulse)
  core.addColorStop(0, 'rgba(255,255,255,.96)')
  core.addColorStop(0.22, hexToRgba(state === 'error' ? '#ff453a' : profile.reactor, 0.88))
  core.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = core
  context.beginPath()
  context.arc(cx, cy, width * 0.065 * pulse, 0, Math.PI * 2)
  context.fill()

  context.strokeStyle = hexToRgba(profile.reactor, 0.52)
  context.lineWidth = 1.5
  for (let ring = 0; ring < 3; ring += 1) {
    const r = width * (0.085 + ring * 0.035 + (state === 'connecting' ? ((time * 0.02) % 0.03) : 0))
    context.globalAlpha = 0.46 - ring * 0.1
    context.beginPath()
    context.arc(cx, cy, r, 0, Math.PI * 2)
    context.stroke()
  }
  context.restore()
}

function drawListenerOrbs(context: CanvasRenderingContext2D, width: number, height: number, time: number, profile: IslandProfile, bob: number, count: number, energy: number) {
  const cx = width * 0.52
  const cy = height * 0.43 + bob
  const visible = Math.min(Math.max(count, 3), 18)
  context.save()
  for (let i = 0; i < visible; i += 1) {
    const angle = time * (0.34 + energy * 0.16) + i * ((Math.PI * 2) / visible)
    const orbitX = width * (0.25 + (i % 3) * 0.018)
    const orbitY = height * (0.115 + (i % 2) * 0.016)
    const x = cx + Math.cos(angle) * orbitX
    const y = cy + Math.sin(angle) * orbitY
    context.globalAlpha = 0.5 + Math.sin(angle) * 0.16
    context.shadowBlur = 14
    context.shadowColor = i % 2 ? profile.riverB : profile.riverA
    context.fillStyle = i % 2 ? profile.riverB : profile.riverA
    context.beginPath()
    context.arc(x, y, 3.2 + (i % 3) * 0.7, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
}

export function FloatingIslandWorld(props: LivingIslandProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const profile = useMemo(() => islandProfiles[props.vibeRoomKey ?? 'global'] ?? islandProfiles.global, [props.vibeRoomKey])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    let frame = 0
    let width = 0
    let height = 0
    let visible = true
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const start = performance.now()

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, props.compact ? 1.15 : 1.5)
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting)
    })
    observer.observe(canvas)

    const render = (now: number) => {
      if (!visible) {
        frame = requestAnimationFrame(render)
        return
      }

      const elapsed = (now - start) / 1000
      const state = resolveState(props)
      const reduced = media.matches
      const isDay = props.lightingMode === 'day'
      const volume = Math.max(0, Math.min(1, (props.playbackState?.volume ?? 72) / 100))
      const bpm = props.playbackState?.bpm ?? 92
      const active = state === 'playing'
      const stateEnergy = state === 'disconnected' ? 0.12 : state === 'queue-empty' ? 0.22 : state === 'paused' ? 0.38 : active ? 0.78 : 0.52
      const energy = Math.min(1, stateEnergy + volume * 0.22)
      const speed = reduced ? 0.12 : (active ? bpm / 64 : 0.28) * profile.motion
      const time = reduced ? 1 : elapsed
      const bob = Math.sin(time * (active ? 0.85 : 0.34) * profile.motion) * (height * 0.012)

      context.clearRect(0, 0, width, height)
      drawAtmosphere(context, width, height, time, profile, isDay, energy)
      drawReflection(context, width, height, profile, isDay, energy)
      drawListenerOrbs(context, width, height, time, profile, bob, props.playbackState?.connectedUsers ?? 5, energy)
      drawLandmass(context, width, height, profile, isDay, bob, energy)
      drawEqualizerTowers(context, width, height, time, profile, bob, energy, reduced || state === 'paused' || state === 'queue-empty')
      drawAudioRivers(context, width, height, time, profile, bob, energy, speed)
      drawReactor(context, width, height, profile, bob, energy, state, time)

      if (state === 'queue-empty') {
        context.save()
        context.fillStyle = isDay ? 'rgba(20,30,50,.58)' : 'rgba(255,255,255,.58)'
        context.font = '700 13px Inter, system-ui'
        context.textAlign = 'center'
        context.fillText('Add music to wake the island', width * 0.5, height * 0.88)
        context.restore()
      }

      frame = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    frame = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [profile, props])

  return <canvas ref={canvasRef} className="h-full w-full" aria-label="Living audio-reactive floating island world" />
}
