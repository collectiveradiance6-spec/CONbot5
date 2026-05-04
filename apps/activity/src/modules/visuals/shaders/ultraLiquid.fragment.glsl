precision highp float;

varying vec2 vUv;
varying float vWave;

uniform float uTime;
uniform float uBass;
uniform float uMids;
uniform float uTreble;
uniform float uEnergy;
uniform float uBeatPulse;
uniform float uBpm;
uniform float uGlassRefraction;
uniform float uBloomIntensity;
uniform float uParallaxDepth;
uniform vec3 uVibePalette;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(1.85, 1.0);
  float t = uTime * 0.16;

  float flow = noise(p * 3.5 + vec2(t * 1.8, -t));
  float caustic = abs(sin((p.x + flow) * 18.0 + uTime * (1.0 + uBpm / 120.0)));
  caustic = pow(caustic, 18.0) * (0.25 + uTreble * 0.75);

  float riverA = smoothstep(0.035, 0.0, abs(sin(p.x * 4.5 + p.y * 2.4 + flow * 2.0 + uTime * (0.45 + uMids))));
  float riverB = smoothstep(0.028, 0.0, abs(sin(p.x * -3.2 + p.y * 5.0 + flow * 2.6 - uTime * (0.35 + uBass))));
  float centerGlow = smoothstep(0.85, 0.0, length(p)) * (0.16 + uEnergy * 0.34);

  vec3 deep = vec3(0.012, 0.026, 0.06);
  vec3 silk = vec3(0.72, 0.88, 0.94);
  vec3 cyan = vec3(0.12, 0.92, 1.0);
  vec3 pink = vec3(1.0, 0.16, 0.78);
  vec3 gold = vec3(1.0, 0.74, 0.24);
  vec3 violet = vec3(0.45, 0.25, 1.0);

  vec3 color = mix(deep, silk, smoothstep(-0.12, 0.42, vWave + flow * 0.32) * 0.42);
  color += cyan * riverA * (0.25 + uMids * 0.8);
  color += mix(pink, gold, uv.x) * riverB * (0.2 + uBass * 0.9);
  color += violet * centerGlow;
  color += vec3(1.0) * caustic * (0.12 + uBloomIntensity * 0.3);
  color += uVibePalette * centerGlow * uBeatPulse * 0.35;

  float edge = smoothstep(0.82, 0.18, length(p));
  float alpha = 0.86 + edge * 0.12;
  gl_FragColor = vec4(color, alpha);
}
