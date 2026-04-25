// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — BG ENGINE v21 SUPREME
// WebGL GLSL fragment shader: silk-milk ocean + caustics + rainbow soul
// Tiers: HIGH=WebGL, MID=Canvas2D, LOW=CSS gradient
// ═══════════════════════════════════════════════════════════════════════

(function(){
'use strict';

const LOGO_URL = 'https://cdn.discordapp.com/attachments/1439358672970060029/1497097504611635220/CONBOT5-e.png';

// GLSL fragment shader
const FRAG_SRC = `
precision mediump float;
uniform float u_time;
uniform vec2  u_res;
uniform float u_intensity;
uniform float u_motion;
uniform float u_react;
uniform int   u_mode; // 0=dark 1=light

// Noise
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.,a=.5;
  for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.1+vec2(1.3,1.7);a*=.5;}
  return v;
}

// Rainbow soul gradient
vec3 rainbow(float t){
  t=fract(t);
  vec3 c=vec3(0);
  c+=vec3(.34,.85,1.)*(1.-abs(t-.0)*6.);
  c+=vec3(.55,.45,1.)*(1.-abs(t-.17)*6.);
  c+=vec3(1.,.42,.87)*(1.-abs(t-.33)*6.);
  c+=vec3(1.,.62,.23)*(1.-abs(t-.50)*6.);
  c+=vec3(.71,1.,.23)*(1.-abs(t-.67)*6.);
  c+=vec3(.34,.85,1.)*(1.-abs(t-.83)*6.);
  return clamp(c,0.,1.);
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);
  float t=u_time*u_motion;

  // Base field
  vec3 base;
  if(u_mode==1){
    // Light: silk-milk ocean
    base=mix(vec3(.95,.97,1.),vec3(.89,.94,1.),length(uv));
    base=mix(base,vec3(.98,.97,1.),smoothstep(.4,.8,uv.y+.5));
  } else {
    // Dark: navy-violet deep
    base=mix(vec3(.01,.02,.07),vec3(.05,.04,.16),length(uv)*.8);
    base=mix(base,vec3(.03,.02,.12),smoothstep(.3,.9,uv.y+.5));
  }

  // Caustics layer
  float cx=uv.x*.8,cy=uv.y*.8;
  float c1=fbm(vec2(cx+t*.05,cy+t*.03));
  float c2=fbm(vec2(cx-.04*t,cy+.06*t+1.3));
  float caustic=c1*c2*.5+.5;
  if(u_mode==1){
    base=mix(base,vec3(.75,.88,1.),caustic*.05*u_intensity);
  } else {
    base=mix(base,vec3(.22,.33,.80),caustic*.06*u_intensity);
  }

  // Rainbow soul layer — noise-displaced ribbon
  float warp=fbm(uv*1.8+t*.08)*.6;
  float rb_t=(uv.x*.5+uv.y*.3+warp+t*.04);
  vec3 rb=rainbow(rb_t);
  float rb_mask=pow(1.-abs(uv.y+sin(uv.x*2.+t*.15)*.2+warp*.3)*.9,2.5);
  rb_mask*=smoothstep(0.,.3,1.-length(uv*.5));
  float rb_bright=(u_mode==1)?.18:.26;
  rb_bright*=u_intensity*(1.+u_react*.4);
  base=mix(base,rb,rb_mask*rb_bright);

  // Vignette
  float vig=1.-smoothstep(.5,1.4,length(uv));
  base*=mix(.7,1.,vig);

  gl_FragColor=vec4(base,1.);
}`;

const VERT_SRC = `
attribute vec2 a_pos;
void main(){gl_Position=vec4(a_pos,0,1);}`;

class BGEngine {
  constructor(){
    this.canvas=null; this.gl=null; this.ctx=null;
    this.tier='NONE'; this.prog=null; this.raf=null;
    this.t=0; this.mode=0; // 0=dark 1=light
    this.params={bgIntensity:1,motionLevel:1,reactivity:.2,reduceMotion:false};
    this.uLocs={};
  }

  init(canvas){
    this.canvas=canvas;
    canvas.style.cssText='position:fixed;inset:0;z-index:0;pointer-events:none;width:100%;height:100%';
    this._resize();
    window.addEventListener('resize',()=>this._resize());

    // Try WebGL
    try {
      const gl=canvas.getContext('webgl')||canvas.getContext('experimental-webgl');
      if(!gl) throw new Error('no webgl');
      this.gl=gl; this.tier='HIGH';
      this._initGL();
      this._loopGL();
      return;
    } catch(e) { console.warn('[BGEngine] WebGL unavailable, falling back to Canvas2D'); }

    // Canvas2D fallback
    try {
      this.ctx=canvas.getContext('2d');
      if(!this.ctx) throw new Error('no 2d');
      this.tier='MID';
      this._loopCanvas();
      return;
    } catch(e) { console.warn('[BGEngine] Canvas2D unavailable'); }

    this.tier='LOW';
    document.body.style.background='linear-gradient(135deg,#03040a,#07091a,#0d1224)';
  }

  _resize(){
    const pr=window.devicePixelRatio||1;
    const w=window.innerWidth, h=window.innerHeight;
    this.canvas.width=Math.round(w*Math.min(pr,1.5));
    this.canvas.height=Math.round(h*Math.min(pr,1.5));
    this.canvas.style.width=w+'px'; this.canvas.style.height=h+'px';
    if(this.gl){this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
  }

  _initGL(){
    const gl=this.gl;
    const vs=this._shader(gl.VERTEX_SHADER,VERT_SRC);
    const fs=this._shader(gl.FRAGMENT_SHADER,FRAG_SRC);
    this.prog=gl.createProgram();
    gl.attachShader(this.prog,vs); gl.attachShader(this.prog,fs);
    gl.linkProgram(this.prog); gl.useProgram(this.prog);
    const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(this.prog,'a_pos');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    this.uLocs={
      time:gl.getUniformLocation(this.prog,'u_time'),
      res: gl.getUniformLocation(this.prog,'u_res'),
      intensity:gl.getUniformLocation(this.prog,'u_intensity'),
      motion:gl.getUniformLocation(this.prog,'u_motion'),
      react:gl.getUniformLocation(this.prog,'u_react'),
      mode:gl.getUniformLocation(this.prog,'u_mode'),
    };
  }

  _shader(type,src){
    const gl=this.gl;
    const s=gl.createShader(type);
    gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  _loopGL(){
    const gl=this.gl;
    const tick=(ms)=>{
      if(!this.params.reduceMotion) this.t=ms*.001;
      gl.uniform1f(this.uLocs.time,   this.t);
      gl.uniform2f(this.uLocs.res,    this.canvas.width,this.canvas.height);
      gl.uniform1f(this.uLocs.intensity, this.params.bgIntensity);
      gl.uniform1f(this.uLocs.motion,    this.params.reduceMotion?0:this.params.motionLevel);
      gl.uniform1f(this.uLocs.react,     this.params.reactivity);
      gl.uniform1i(this.uLocs.mode,      this.mode);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      this.raf=requestAnimationFrame(tick);
    };
    this.raf=requestAnimationFrame(tick);
  }

  _loopCanvas(){
    const c=this.ctx;
    const tick=(ms)=>{
      if(!this.params.reduceMotion) this.t=ms*.001;
      const w=this.canvas.width, h=this.canvas.height;
      c.clearRect(0,0,w,h);
      // Base gradient
      const grd=c.createLinearGradient(0,0,w,h);
      if(this.mode===1){
        grd.addColorStop(0,'#f2f7ff'); grd.addColorStop(.5,'#e8f0ff'); grd.addColorStop(1,'#fdfbff');
      } else {
        grd.addColorStop(0,'#03040a'); grd.addColorStop(.5,'#07091a'); grd.addColorStop(1,'#0d1224');
      }
      c.fillStyle=grd; c.fillRect(0,0,w,h);
      // Rainbow accent
      const rGrd=c.createLinearGradient(0,h*.3,w,h*.7);
      rGrd.addColorStop(0,'rgba(86,217,255,.12)');
      rGrd.addColorStop(.33,'rgba(255,106,223,.10)');
      rGrd.addColorStop(.66,'rgba(139,114,255,.08)');
      rGrd.addColorStop(1,'rgba(255,206,105,.07)');
      c.fillStyle=rGrd; c.fillRect(0,0,w,h);
      this.raf=requestAnimationFrame(tick);
    };
    this.raf=requestAnimationFrame(tick);
  }

  setMode(mode){
    this.mode = mode==='light' ? 1 : 0;
  }
  setParam(key,val){ this.params[key]=val; }
  destroy(){ if(this.raf) cancelAnimationFrame(this.raf); }
}

window.CONbotBG = new BGEngine();
})();
