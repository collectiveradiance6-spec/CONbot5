varying vec2 vUv;
varying float vWave;

uniform float uTime;
uniform float uBass;
uniform float uMids;
uniform float uTreble;

void main() {
  vUv = uv;
  vec3 pos = position;
  float waveA = sin(pos.x * 2.6 + uTime * (0.65 + uBass)) * 0.08 * uBass;
  float waveB = cos(pos.y * 3.4 + uTime * (0.45 + uMids)) * 0.055 * uMids;
  float waveC = sin((pos.x + pos.y) * 5.2 + uTime * 1.8) * 0.025 * uTreble;
  pos.z += waveA + waveB + waveC;
  vWave = waveA + waveB + waveC;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
