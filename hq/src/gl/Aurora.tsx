import { useEffect, useRef } from "react";

/* ‏אורורה ב-WebGL אמיתי: שדה ערפילי ברונזה שנע לאט, מחושב פר-פיקסל ב-GPU.
   ‏simplex-ish value noise בשיידר — בלי ספריות. נכשל ⟶ נעלם בשקט (הרקע
   ‏הכהה של ה-CSS נשאר). reduced-motion ⟶ פריים סטטי אחד. */
const FRAG = `
precision mediump float;
uniform vec2 u_res; uniform float u_t;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y); }
float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.55; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy/u_res; uv.x *= u_res.x/u_res.y;
  float t = u_t*.025;
  float n1 = fbm(uv*1.6 + vec2(t*.7, -t*.4));
  float n2 = fbm(uv*2.6 - vec2(t*.3, t*.55) + 7.0);
  float glow = smoothstep(.45,.95,n1) * .8 + smoothstep(.55,1.0,n2)*.5;
  /* ‏מוקד אור עליון-שמאלי (ימין ויזואלי ב-RTL) שנודד לאט */
  vec2 focus = vec2(.15+.06*sin(t*.9), 1.05);
  float halo = 1.0 - smoothstep(0.0, 1.15, distance(vec2(uv.x, uv.y), focus));
  vec3 bronze = vec3(0.85,0.66,0.36);
  vec3 deep   = vec3(0.56,0.35,0.08);
  vec3 col = bronze*glow*halo*.34 + deep*glow*.10 + bronze*halo*.055;
  /* ‏נשימה כללית עדינה */
  col *= .9 + .1*sin(u_t*.35);
  gl_FragColor = vec4(col, 1.0);
}`;
const VERT = `attribute vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }`;

export default function Aurora() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!; let raf = 0, dead = false;
    const gl = cv.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;
    const sh = (t: number, src: string) => { const s = gl.createShader(t)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(pr, "u_res"), uT = gl.getUniformLocation(pr, "u_t");
    const size = () => { const d = Math.min(devicePixelRatio, 1.5) * .5; /* ‏חצי רזולוציה — ערפל ממילא, וסוללה חשובה */
      cv.width = innerWidth * d; cv.height = innerHeight * d; gl.viewport(0, 0, cv.width, cv.height); };
    size(); addEventListener("resize", size);
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    const frame = () => { if (dead) return;
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uT, (performance.now() - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still) raf = requestAnimationFrame(frame); };
    frame();
    return () => { dead = true; cancelAnimationFrame(raf); removeEventListener("resize", size); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: -1 }} aria-hidden />;
}
