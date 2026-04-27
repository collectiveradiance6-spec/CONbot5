// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — BG ENGINE v22 APEX
// 7-layer: base field → caustics → rainbow soul → energy blobs →
//          smoke tendrils → energy veins → prism dust + beat pulse
// Tiers: HIGH=WebGL GLSL, MID=Canvas2D, LOW=CSS gradient
// Music-reactive: u_react drives pulse radius + blob scale + vein glow
// ═══════════════════════════════════════════════════════════════════════

(function () {
'use strict';

const VERT_SRC = `
attribute vec2 a_pos;
void main(){gl_Position=vec4(a_pos,0.,1.);}
`;

const FRAG_SRC = `
precision mediump float;
uniform float u_time;
uniform vec2  u_res;
uniform float u_intensity;
uniform float u_motion;
uniform float u_react;
uniform int   u_mode;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float hash1(float n){return fract(sin(n)*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
             mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.,a=.5;
  for(int i=0;i<6;i++){v+=a*noise(p);p=p*2.1+vec2(1.3,1.7);a*=.48;}
  return v;
}
float fbm3(vec2 p){
  float v=0.,a=.5;
  for(int i=0;i<3;i++){v+=a*noise(p);p=p*2.+vec2(.7,1.3);a*=.5;}
  return v;
}

vec3 rainbow(float t){
  t=fract(t);
  vec3 c=vec3(0.);
  c+=vec3(.34,.85,1.) *max(0.,1.-abs(t-.00)*6.);
  c+=vec3(.55,.45,1.) *max(0.,1.-abs(t-.17)*6.);
  c+=vec3(1.,.42,.87)*max(0.,1.-abs(t-.33)*6.);
  c+=vec3(1.,.62,.23)*max(0.,1.-abs(t-.50)*6.);
  c+=vec3(.71,1.,.23)*max(0.,1.-abs(t-.67)*6.);
  c+=vec3(.34,.85,1.) *max(0.,1.-abs(t-.83)*6.);
  return clamp(c,0.,1.);
}

float blob(vec2 uv,vec2 ctr,float rad,float soft){
  return 1.-smoothstep(rad-soft,rad+soft,length(uv-ctr));
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);
  float t=u_time*u_motion;

  // L0 BASE
  vec3 base;
  if(u_mode==1){
    base=mix(vec3(.96,.98,1.),vec3(.90,.95,1.),length(uv)*.9);
    base=mix(base,vec3(.99,.98,1.),smoothstep(.4,.9,uv.y+.5));
  } else {
    base=mix(vec3(.012,.016,.07),vec3(.045,.035,.16),length(uv)*.85);
    base=mix(base,vec3(.022,.018,.10),smoothstep(.3,.95,uv.y+.5));
  }

  // L1 CAUSTICS
  float w1=fbm(uv*1.6+vec2(t*.07,t*.04));
  float w2=fbm(uv*1.4-vec2(t*.05,t*.06)+1.7);
  float caustic=w1*w2*.5+.5;
  float rings=sin((caustic-.5)*24.+t*.5)*sin((caustic-.5)*17.-t*.3);
  rings=clamp(rings*.5+.5,0.,1.);
  float cB=(u_mode==1?.06:.09)*u_intensity;
  if(u_mode==1){base=mix(base,vec3(.72,.88,1.),caustic*cB);base+=vec3(.6,.85,1.)*rings*.022*u_intensity;}
  else{base=mix(base,vec3(.18,.28,.82),caustic*cB);base+=vec3(.34,.55,1.)*rings*.03*u_intensity;}

  // L2 RAINBOW RIBBONS
  float wRb=fbm(uv*1.8+t*.08)*.65;
  float rbt=uv.x*.5+uv.y*.28+wRb+t*.045;
  float rbMask=pow(max(0.,1.-abs(uv.y+sin(uv.x*2.+t*.18)*.22+wRb*.32)*.88),2.6);
  rbMask*=smoothstep(0.,.3,1.-length(uv*.5));
  float rbt2=rbt+.35;
  float rbMask2=pow(max(0.,1.-abs(uv.y-.18+sin(uv.x*1.5-t*.14)*.18+wRb*.22)*.95),3.);
  rbMask2*=smoothstep(0.,.25,1.-length(uv*.55));
  float rbB=(u_mode==1?.15:.27)*u_intensity*(1.+u_react*.45);
  base=mix(base,rainbow(rbt),rbMask*rbB);
  base=mix(base,rainbow(rbt2),rbMask2*rbB*.5);

  // L3 ENERGY BLOBS
  float bA=.55;
  vec2 b0=vec2(sin(t*.21)*bA,cos(t*.17)*bA*.6);
  vec2 b1=vec2(cos(t*.13)*bA*.8,sin(t*.23+1.1)*bA);
  vec2 b2=vec2(sin(t*.19+2.1)*bA*.7,cos(t*.11+.8)*bA*.9);
  vec2 b3=vec2(cos(t*.25+1.5)*bA*.5,sin(t*.16+2.8)*bA*.7);
  float bM=(u_mode==1?.07:.12)*u_intensity*(1.+u_react*.6);
  float bRx=u_react*.09;
  vec3 bc0=u_mode==1?vec3(.35,.75,1.):vec3(.22,.44,1.);
  vec3 bc1=u_mode==1?vec3(1.,.40,.80):vec3(1.,.26,.73);
  vec3 bc2=u_mode==1?vec3(.60,.38,1.):vec3(.54,.30,1.);
  vec3 bc3=u_mode==1?vec3(1.,.75,.22):vec3(1.,.55,.18);
  base+=bc0*blob(uv,b0,.38+bRx,.22)*bM;
  base+=bc1*blob(uv,b1,.42+bRx*.8,.26)*bM*.8;
  base+=bc2*blob(uv,b2,.30+bRx,.18)*bM*.7;
  base+=bc3*blob(uv,b3,.35+bRx,.20)*bM*.6;

  // L4 SMOKE TENDRILS
  vec2 q=vec2(fbm(uv+vec2(t*.04,t*.03)),fbm(uv+vec2(1.7,9.2)+t*.035));
  vec2 r=vec2(fbm(uv+2.*q+vec2(1.7,9.2)+t*.069),fbm(uv+2.*q+vec2(8.3,2.8)+t*.051));
  float smoke=fbm(uv+2.*r);
  vec3 smokeC=u_mode==1?vec3(.45,.72,1.):vec3(.28,.38,.95);
  base=mix(base,smokeC,smoke*(u_mode==1?.04:.06)*u_intensity);

  // L5 ENERGY VEINS
  float vn1=abs(fbm3(uv*3.+t*.06)-.5)*2.;
  float vn2=abs(fbm3(uv*2.4-t*.04+vec2(1.8,0.))-.5)*2.;
  float veins=pow(max(0.,1.-vn1*.7),4.)*pow(max(0.,1.-vn2*.8),3.);
  vec3 veinC=rainbow(fract(rbt*.7+t*.025));
  base=mix(base,veinC,veins*(u_mode==1?.05:.09)*u_intensity*(1.+u_react*.3));

  // L6 PRISM DUST
  vec2 pG=uv*18.;
  vec2 pId=floor(pG);
  float phase=hash(pId)*6.28+hash(pId+vec2(1.,0.))*2.+t;
  float gSz=.15+hash(pId+vec2(0.,1.))*.25;
  float glint=pow(max(0.,1.-length(fract(pG)-.5)/gSz),3.)*(.5+.5*sin(phase));
  glint*=smoothstep(.4,.0,length(uv));
  base=mix(base,rainbow(hash(pId)*.7+t*.02),glint*(u_mode==1?.06:.10)*u_intensity*(1.+u_react*.5));

  // BEAT PULSE
  float pulse=u_react*.18*max(0.,1.-length(uv)*1.2)*(.5+.5*sin(t*12.5));
  base+=pulse*rainbow(t*.08)*(u_mode==1?.28:.50);

  // VIGNETTE
  float vig=1.-smoothstep(.5,1.5,length(uv));
  base*=mix(.62,1.,vig);

  // READABILITY CENTRE MUTE
  base=mix(base*(u_mode==1?1.02:.84),base,smoothstep(0.,.3,length(uv)*.7));

  gl_FragColor=vec4(clamp(base,0.,1.),1.);
}
`;

class BGEngine {
  constructor() {
    this.canvas = null; this.gl = null; this.ctx = null;
    this.tier = 'NONE'; this.prog = null; this.raf = null;
    this.t = 0; this.mode = 0;
    this.params = { bgIntensity: 1, motionLevel: 1, reactivity: 0.2, reduceMotion: false };
    this.uLocs = {};
    this._hidden = false;
  }

  init(canvas) {
    this.canvas = canvas;
    canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;width:100%;height:100%';
    this._resize();
    window.addEventListener('resize', () => this._resize());
    document.addEventListener('visibilitychange', () => { this._hidden = document.hidden; });

    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) throw new Error('no webgl');
      this.gl = gl; this.tier = 'HIGH';
      this._initGL(); this._loopGL(); return;
    } catch { console.warn('[BGEngine] WebGL unavailable → Canvas2D'); }

    try {
      this.ctx = canvas.getContext('2d');
      if (!this.ctx) throw new Error('no 2d');
      this.tier = 'MID'; this._loopCanvas(); return;
    } catch { console.warn('[BGEngine] Canvas2D unavailable'); }

    this.tier = 'LOW';
    document.body.style.background = 'linear-gradient(135deg,#03040a,#07091a,#0d1224)';
  }

  _resize() {
    const pr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width  = Math.round(w * pr);
    this.canvas.height = Math.round(h * pr);
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  _initGL() {
    const gl = this.gl;
    const vs = this._shader(gl.VERTEX_SHADER, VERT_SRC);
    const fs = this._shader(gl.FRAGMENT_SHADER, FRAG_SRC);
    this.prog = gl.createProgram();
    gl.attachShader(this.prog, vs); gl.attachShader(this.prog, fs);
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.prog));
    gl.useProgram(this.prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.uLocs = {
      time:      gl.getUniformLocation(this.prog, 'u_time'),
      res:       gl.getUniformLocation(this.prog, 'u_res'),
      intensity: gl.getUniformLocation(this.prog, 'u_intensity'),
      motion:    gl.getUniformLocation(this.prog, 'u_motion'),
      react:     gl.getUniformLocation(this.prog, 'u_react'),
      mode:      gl.getUniformLocation(this.prog, 'u_mode'),
    };
  }

  _shader(type, src) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  _loopGL() {
    const gl = this.gl;
    const tick = (ms) => {
      if (!this._hidden) {
        if (!this.params.reduceMotion) this.t = ms * 0.001;
        gl.uniform1f(this.uLocs.time,      this.t);
        gl.uniform2f(this.uLocs.res,       this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uLocs.intensity, this.params.bgIntensity);
        gl.uniform1f(this.uLocs.motion,    this.params.reduceMotion ? 0 : this.params.motionLevel);
        gl.uniform1f(this.uLocs.react,     this.params.reactivity);
        gl.uniform1i(this.uLocs.mode,      this.mode);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  _loopCanvas() {
    const c = this.ctx;
    const tick = (ms) => {
      if (!this._hidden) {
        if (!this.params.reduceMotion) this.t = ms * 0.001;
        const w = this.canvas.width, h = this.canvas.height;
        c.clearRect(0, 0, w, h);
        const grd = c.createLinearGradient(0, 0, w, h);
        if (this.mode === 1) {
          grd.addColorStop(0, '#f2f7ff'); grd.addColorStop(.5, '#e8f0ff'); grd.addColorStop(1, '#fdfbff');
        } else {
          grd.addColorStop(0, '#03040a'); grd.addColorStop(.5, '#07091a'); grd.addColorStop(1, '#0d1224');
        }
        c.fillStyle = grd; c.fillRect(0, 0, w, h);

        const react = this.params.reactivity;
        const alpha = (this.mode === 1 ? 0.07 : 0.11) * this.params.bgIntensity * (1 + react * 0.4);
        const blobDefs = [
          { dx: 0.30, dy: 0.20, r: 200, lc: ['rgba(86,200,255,', 'rgba(150,100,255,'] },
          { dx: -0.20, dy: 0.35, r: 250, lc: ['rgba(255,100,210,', 'rgba(255,180,50,'] },
          { dx: 0.15, dy: -0.25, r: 180, lc: ['rgba(80,220,255,', 'rgba(100,255,180,'] },
        ];
        blobDefs.forEach((b, i) => {
          const bx = (Math.sin(this.t * b.dx + i * 1.1) * 0.4 + 0.5) * w;
          const by = (Math.cos(this.t * b.dy + i * 1.4) * 0.35 + 0.5) * h;
          const br = b.r * (1 + react * 0.25) * this.params.bgIntensity;
          const g = c.createRadialGradient(bx, by, 0, bx, by, br);
          g.addColorStop(0, b.lc[0] + alpha + ')');
          g.addColorStop(1, b.lc[1] + '0)');
          c.fillStyle = g; c.fillRect(0, 0, w, h);
        });

        const rGrd = c.createLinearGradient(0, h * .3, w, h * .7);
        const ra = (this.mode === 1 ? 0.09 : 0.14) * this.params.bgIntensity * (1 + react * 0.4);
        rGrd.addColorStop(0, `rgba(86,217,255,${ra})`);
        rGrd.addColorStop(.33, `rgba(255,106,223,${ra * .8})`);
        rGrd.addColorStop(.66, `rgba(139,114,255,${ra * .7})`);
        rGrd.addColorStop(1, `rgba(86,217,255,${ra})`);
        c.fillStyle = rGrd; c.fillRect(0, 0, w, h);
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  setMode(mode) { this.mode = (mode === 'light') ? 1 : 0; }
  setParam(key, val) { this.params[key] = val; }
  destroy() { if (this.raf) cancelAnimationFrame(this.raf); }
}

window.CONbotBG = new BGEngine();
})();
