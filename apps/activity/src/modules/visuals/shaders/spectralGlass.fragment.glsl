precision highp float;
varying vec2 vUv;
void main() {
  vec3 color = mix(vec3(0.05,0.08,0.14), vec3(0.3,0.9,1.0), vUv.y);
  gl_FragColor = vec4(color, 1.0);
}
