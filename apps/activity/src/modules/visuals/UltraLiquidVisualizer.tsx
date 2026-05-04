import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { VisualState } from '../../state/types'
import fragmentShader from './shaders/ultraLiquid.fragment.glsl?raw'
import vertexShader from './shaders/ultraLiquid.vertex.glsl?raw'

function LiquidPlane({ visuals }: { visuals: VisualState }) {
  const material = useRef<any>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: visuals.bass },
      uMids: { value: visuals.mids },
      uTreble: { value: visuals.treble },
      uEnergy: { value: visuals.energy },
      uBeatPulse: { value: visuals.beatPulse },
      uBpm: { value: visuals.bpm },
      uThemeMode: { value: 1 },
      uGlassRefraction: { value: visuals.glassRefraction },
      uBloomIntensity: { value: visuals.bloomIntensity },
      uParallaxDepth: { value: visuals.parallaxDepth },
      uVibePalette: { value: new THREE.Vector3(0.12, 0.75, 1.0) },
    }),
    [],
  )

  useFrame(({ clock, pointer }) => {
    if (!material.current) return
    material.current.uniforms.uTime.value = clock.elapsedTime
    material.current.uniforms.uBass.value = visuals.bass
    material.current.uniforms.uMids.value = visuals.mids
    material.current.uniforms.uTreble.value = visuals.treble
    material.current.uniforms.uEnergy.value = visuals.energy
    material.current.uniforms.uBeatPulse.value = visuals.beatPulse
    material.current.uniforms.uBpm.value = visuals.bpm
    material.current.uniforms.uGlassRefraction.value = visuals.glassRefraction
    material.current.uniforms.uBloomIntensity.value = visuals.bloomIntensity
    material.current.uniforms.uParallaxDepth.value = visuals.parallaxDepth + pointer.x * 0.08
  })

  return (
    <mesh rotation-x={-0.72} position={[0, -0.12, 0]}>
      <planeGeometry args={[7.2, 4.6, 160, 96]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent />
    </mesh>
  )
}

export function UltraLiquidVisualizer({ visuals }: { visuals: VisualState }) {
  return (
    <Canvas className="visualizer-webgl" camera={{ position: [0, 1.1, 3.2], fov: 42 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#040712']} />
      <ambientLight intensity={0.5 + visuals.energy * 0.4} />
      <pointLight position={[1.8, 1.4, 1.8]} intensity={4} color="#65e8ff" />
      <pointLight position={[-1.8, 1.0, 1.6]} intensity={2.8} color="#ff4ed8" />
      <LiquidPlane visuals={visuals} />
    </Canvas>
  )
}
