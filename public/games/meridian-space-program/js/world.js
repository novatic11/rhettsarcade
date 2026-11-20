'use strict';
// ---------- 3D world: renderer, planets, atmospheres, rings, stars, terrain LOD ----------
const World = (function () {
  let renderer, scene, camera, sunLight, ambient, hemi, stars, sunGlow, env = null;
  const sfocus = { pos: new V3(), r: 30, on: false };
  const vis = {};
  let quality = 'high';
  const camPos = new V3();       // heliocentric camera position (double)
  const _v = new V3(), _w = new V3();
  let activeTerrain = null, daylight = 0;
  let scatter = null;
  let t0 = performance.now();

  const atmVS = `
    varying vec3 vWorld;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
    #include <logdepthbuf_vertex>
    }`;
  const atmFS = (NS, NL) => `
    #define NS ${NS}
    #define NL ${NL}
    uniform float uNS;
    uniform vec3 uC; uniform float uRa; uniform vec3 uSun; uniform vec3 uBetaR; uniform float uBetaM; uniform vec3 uMieCol; uniform float uH; uniform float uSunI; uniform float uInvR; uniform float uOut; uniform float uG; uniform float uLin;
    varying vec3 vWorld;
    #include <logdepthbuf_pars_fragment>
    vec2 rs(vec3 ro, vec3 rd, vec3 c, float r){ vec3 oc = ro - c; float b = dot(oc, rd); float cc = dot(oc, oc) - r*r; float h = b*b - cc; if (h < 0.0) return vec2(1e9, -1e9); h = sqrt(h); return vec2(-b - h, -b + h); }
    void main(){
      #include <logdepthbuf_fragment>
      vec3 rd = normalize(vWorld);
      vec2 ta = rs(vec3(0.0), rd, uC, uRa);
      if (ta.x > ta.y || ta.y < 0.0) discard;
      float t0 = max(ta.x, 0.0), t1 = ta.y;
      vec2 tp = rs(vec3(0.0), rd, uC, 1.0);
      if (tp.x < tp.y && tp.y > 0.0) t1 = min(t1, max(tp.x, 0.0));
      float seg = (t1 - t0) / uNS;
      vec3 sum = vec3(0.0); float od = 0.0;
      for (int i = 0; i < NS; i++) {
        if (float(i) >= uNS) break;
        vec3 p = rd * (t0 + seg * (float(i) + 0.5));
        float h = length(p - uC) - 1.0;
        float d = exp(-max(h, 0.0) / uH) * seg;
        od += d;
        vec2 sh = rs(p, uSun, uC, 0.998);
        if (sh.x < sh.y && sh.x > 0.0) continue;
        vec2 tl = rs(p, uSun, uC, uRa);
        float sl = max(tl.y, 0.0) / float(NL); float odl = 0.0;
        for (int j = 0; j < NL; j++) { vec3 q = p + uSun * (sl * (float(j) + 0.5)); odl += exp(-max(length(q - uC) - 1.0, 0.0) / uH) * sl; }
        vec3 att = exp(-(uBetaR + uBetaM * uMieCol * 0.0 + vec3(uBetaM)) * (od + odl));
        sum += d * att;
      }
      float mu = dot(rd, uSun);
      float pR = 0.0597 * (1.0 + mu * mu);
      float g = uG; float g2 = g * g;
      float pM = 0.1194 * ((1.0 - g2) * (1.0 + mu * mu)) / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * mu, 1.5));
      vec3 col = uSunI * sum * (uBetaR * pR + uBetaM * uMieCol * pM);
      // Blending happens on display-encoded colour, which exaggerates faint haze. From space,
      // shape the curve so the disc stays clear while the limb keeps its glow.
      // (only needed when blending happens on display-encoded colour, i.e. without the HDR pipeline)
      col = mix(col, col * col * 0.55, uOut * (1.0 - uLin));
      vec3 tr = exp(-(uBetaR + vec3(uBetaM)) * od);
      float a = clamp(1.0 - (tr.r + tr.g + tr.b) / 3.0, 0.0, 1.0) * (1.0 - 0.6 * uOut * (1.0 - uLin));
      gl_FragColor = vec4(col, a);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`;
  const ringVS = `
    varying vec2 vUv; varying vec3 vWorld;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w;
    #include <logdepthbuf_vertex>
    }`;
  // Rings: a thin sheet of ice and dust. The profile texture holds colour (rgb) and how opaque the sheet
  // is seen face-on (a); that becomes an optical depth, and light is worked out with single scattering
  // in a thin layer: the sunlit face reflects, the unlit face glows where sunlight filters through (thin
  // parts bright, dense parts dark, as in Cassini's views), the sheet thickens toward edge-on, dusty rings
  // light up when backlit, and the planet's shadow falls across them with a soft edge.
  const ringFS = `
    uniform sampler2D uMap; uniform vec3 uSun; uniform vec3 uC; uniform float uR; uniform vec3 uN;
    uniform float uSpan; uniform float uSunI; uniform float uDust; uniform float uArcs; uniform vec3 uE1; uniform vec3 uTint; uniform float uNear;
    varying vec2 vUv; varying vec3 vWorld;
    #include <logdepthbuf_pars_fragment>
    float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
    float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
    void main(){
      #include <logdepthbuf_fragment>
      vec4 t = texture2D(uMap, vec2(vUv.x, 0.5));
      float a0 = clamp(t.a, 0.0, 0.985);
      float tau = -log(1.0 - a0);
      // fine ringlets (radial, in km), faded out where they would be smaller than a pixel
      float km = vUv.x * uSpan / 1000.0, px = fwidth(km);
      float fine = n1(km / 40.0) * 0.5 + n1(km / 9.0) * 0.3 + n1(km / 2.5) * 0.2;
      tau *= mix(1.0, 0.45 + 1.1 * fine, smoothstep(30.0, 3.0, px));
      // Neptune-style arcs: clumps along the outermost ring
      if (uArcs > 0.0) { vec3 rel0 = vWorld - uC; float ang = atan(dot(rel0, cross(uN, uE1)), dot(rel0, uE1)); float arc = smoothstep(0.82, 0.97, sin(ang * 3.0 + 1.3) * 0.5 + 0.5); tau *= mix(1.0, 0.25 + 4.0 * arc, uArcs * smoothstep(0.9, 0.97, vUv.x)); }
      vec3 V = normalize(vWorld);
      float muV = max(abs(dot(V, uN)), 0.012), muS = max(abs(dot(uSun, uN)), 0.02);
      float alpha = 1.0 - exp(-tau / muV);
      bool litFace = dot(-V, uN) * dot(uSun, uN) > 0.0;
      float refl = litFace ? muS / (muS + muV) * (1.0 - exp(-tau * (1.0 / muS + 1.0 / muV)))
                           : muS / max(abs(muS - muV), 0.002) * abs(exp(-tau / muS) - exp(-tau / muV));
      // icy particles throw light back toward the Sun a little; fine dust throws it forward strongly
      float cph = dot(V, uSun);
      float phase = 0.75 + 0.35 * max(-cph, 0.0) + uDust * 6.0 * pow(max(cph, 0.0), 10.0);
      vec3 rel = vWorld - uC; float s = dot(rel, uSun);
      float shadow = s < 0.0 ? smoothstep(uR * 0.985, uR * 1.03, length(rel - s * uSun)) : 1.0;
      vec3 col = t.rgb * uTint;
      vec3 L = col * (uSunI * refl * phase * shadow + 0.012 * alpha);
      // close by, the sheet gives way to the individual chunks drawn around the camera
      if (uNear > 0.0) { float k = smoothstep(uNear * 0.35, uNear, length(vWorld)); L *= k; alpha *= k; }
      gl_FragColor = vec4(L, alpha);
      #include <encodings_fragment>
    }`;

  // Ring profiles for systems without a photographed one: colour and face-on opacity across the ring,
  // from inner to outer edge. Real systems follow their known structure; invented ones look the part.
  function ringProfile(b) {
    const N = 2048, data = new Uint8Array(N * 4), st = b.rings.style || 'dusty';
    const lo = b.rings.inner, hi = b.rings.outer, km = i => lo + (hi - lo) * (i + 0.5) / N;
    const rnd = mulberry(strHash(b.id));
    const narrow = (list, col) => (i) => { const r = km(i), px = (hi - lo) / N; let a = 0; for (const [c, w, op] of list) { const d = Math.abs(r - c); a = Math.max(a, op * clamp(1 - (d - w / 2) / px, 0, 1) * Math.min(1, w / px)); } return [col, a]; };
    let f;
    if (st === 'uranus') {
      // the 13 known narrow rings (km from the centre, width km, opacity); epsilon is the widest
      f = narrow([[41837, 2, 0.3], [42234, 2, 0.3], [42571, 2, 0.35], [44718, 7, 0.4], [45661, 8, 0.4], [47176, 2, 0.25], [47627, 3, 0.4], [48300, 6, 0.45], [50023, 2, 0.2], [51149, 58, 0.75]], [0.32, 0.32, 0.34]);
      const g = f; f = (i) => { const [c, a] = g(i); return [c, Math.max(a, 0.012)]; }; // faint dust between them
    } else if (st === 'neptune') {
      f = (i) => { const r = km(i); let a = 0.006;
        if (r < 43000) a = 0.015; // Galle: broad and faint
        a = Math.max(a, 0.06 * Math.exp(-((r - 53200) ** 2) / (2 * 60 ** 2))); // Le Verrier
        if (r > 53200 && r < 57200) a = Math.max(a, 0.02); // Lassell
        a = Math.max(a, 0.07 * Math.exp(-((r - 57200) ** 2) / (2 * 40 ** 2))); // Arago
        a = Math.max(a, 0.1 * Math.exp(-((r - 62900) ** 2) / (2 * 25 ** 2))); // Adams, with its arcs
        return [[0.36, 0.3, 0.28], a]; };
    } else if (st === 'single') {
      f = (i) => { const x = (i + 0.5) / N; return [[0.7, 0.68, 0.66], 0.45 * Math.sin(Math.PI * x) ** 0.6]; };
    } else if (st === 'icy') {
      // broad icy rings: a faint inner ring, a dense middle ring, a dark gap, an outer ring with a narrow gap
      const tint = b.rings.tint || [0.86, 0.8, 0.7], gaps = [0.08 + rnd() * 0.05, 0.62 + rnd() * 0.06];
      f = (i) => { const x = (i + 0.5) / N; let a;
        if (x < 0.22) a = 0.08 + 0.12 * x / 0.22;
        else if (x < gaps[1]) a = 0.55 + 0.35 * Math.sin((x - 0.22) / (gaps[1] - 0.22) * Math.PI) ** 0.5;
        else if (x < gaps[1] + 0.06) a = 0.02;
        else a = 0.45 * (1 - smooth(0.9, 1, x));
        if (Math.abs(x - 0.9) < 0.006) a = 0.03;
        a *= 0.85 + 0.3 * Noise.fbm(x * 40, 0.5, strHash(b.id) % 100, 3, 2.2, 0.55);
        const sh = 0.85 + 0.25 * a; return [[tint[0] * sh, tint[1] * sh, tint[2] * sh], clamp(a, 0, 0.97)]; };
    } else {
      // dusty: a broad, faint sheet with soft bands
      const tint = b.rings.tint || [0.6, 0.62, 0.66];
      f = (i) => { const x = (i + 0.5) / N; const a = (b.rings.faint || 0.15) * (0.4 + 0.6 * Math.sin(Math.PI * x) ** 0.7) * (0.7 + 0.6 * Noise.fbm(x * 18, 0.3, 7, 3, 2, 0.5)); return [tint, clamp(a, 0, 0.9)]; };
    }
    for (let i = 0; i < N; i++) { const [c, a] = f(i); data[i * 4] = Math.round(clamp(c[0], 0, 1) * 255); data[i * 4 + 1] = Math.round(clamp(c[1], 0, 1) * 255); data[i * 4 + 2] = Math.round(clamp(c[2], 0, 1) * 255); data[i * 4 + 3] = Math.round(clamp(a, 0, 1) * 255); }
    const t = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; // mipmaps: no shimmer far away
    return t;
  }

  function init(canvas, q) {
    quality = q;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== 'low', logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(q === 'low' ? Math.min(1, window.devicePixelRatio) * 0.85 : Math.min(window.devicePixelRatio, 1.75));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.autoClear = false;
    renderer.shadowMap.enabled = q !== "low";
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x8fb4e0, 0);
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 1e15);
    // The Sun is far enough away that one directional light serves every nearby object;
    // it follows the camera focus so it can cast crisp shadows from rockets and buildings.
    sunLight = new THREE.DirectionalLight(0xfff4e6, 1.6);
    sunLight.castShadow = q !== "low";
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.03;
    scene.add(sunLight); scene.add(sunLight.target);
    Post.init(renderer, q);
    Clouds.init(renderer, q);
    Terrain.setSeabed(q !== 'low');
    try { EnvLight.init(renderer); env = EnvLight.texture; } catch (e) { console.warn('live reflections unavailable', e); }
    if (!env) env = makeEnv();
    ambient = new THREE.AmbientLight(0x404858, 0.18); scene.add(ambient);
    hemi = new THREE.HemisphereLight(0x9fc4ff, 0x3a3020, 0); scene.add(hemi);
    // stars
    const sg = new THREE.SphereGeometry(1e6, 48, 24);
    stars = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x777777, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false }));
    stars.renderOrder = -1000; stars.rotation.x = 60 * DEG; stars.frustumCulled = false;
    scene.add(stars);
    new THREE.TextureLoader().load('textures/2k_stars_milky_way.jpg', (t) => { t.encoding = THREE.sRGBEncoding; stars.material.map = t; stars.material.needsUpdate = true; });
    for (const b of Bodies.list) vis[b.id] = makeBody(b);
    window.addEventListener('resize', resize);
  }
  // soft sky / ground environment for reflections on hulls and metal
  function makeEnv() {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256;
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "#2a4f86"); gr.addColorStop(0.42, "#9cc2ea"); gr.addColorStop(0.5, "#e8eef4"); gr.addColorStop(0.53, "#6d6458"); gr.addColorStop(1, "#1d1a17");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
    const sg = g.createRadialGradient(140, 70, 0, 140, 70, 60); sg.addColorStop(0, "rgba(255,250,235,1)"); sg.addColorStop(1, "rgba(255,250,235,0)");
    g.fillStyle = sg; g.fillRect(60, 0, 170, 150);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const e = pm.fromEquirectangular(t).texture; pm.dispose();
    return e;
  }
  function setFocus(posRel, r) { sfocus.pos.copy(posRel); sfocus.r = r; sfocus.on = true; }
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    Post.resize();
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  }
  function glowTex() {
    return PartMesh.canvasTex(256, 256, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.08, 'rgba(255,236,190,0.9)'); gr.addColorStop(0.25, 'rgba(255,200,120,0.28)'); gr.addColorStop(0.6, 'rgba(255,160,80,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, 'sunglow');
  }
  function makeBody(b) {
    const root = new THREE.Group();
    const tilt = new THREE.Group(); tilt.quaternion.copy(b.tiltQ); root.add(tilt);
    const spin = new THREE.Group(); tilt.add(spin);
    const segs = quality === 'low' ? [48, 24] : [96, 48];
    const small = b.R < 30000;
    const geo = new THREE.SphereGeometry(b.R, small ? 48 : segs[0], small ? 24 : segs[1]);
    if (b.irregular || b.shape) {
      const p = geo.attributes.position, d = new V3();
      for (let i = 0; i < p.count; i++) { d.fromBufferAttribute(p, i).normalize(); const h = Terrain.height(b, d, b.R / 30); d.multiplyScalar(b.R + h); p.setXYZ(i, d.x, d.y, d.z); }
      geo.computeVertexNormals();
    }
    let mat;
    if (b.type === 'star') mat = new THREE.MeshBasicMaterial({ color: 0xffe2a8, fog: false });
    else mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(b.color), roughness: 1, metalness: 0, fog: false });
    const sphere = new THREE.Mesh(geo, mat);
    spin.add(sphere);
    const v = { b, root, tilt, spin, sphere, atm: null, ring: null, clouds: null, tex: 'none', px: 0 };
    if (b.type === 'star') {
      v.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(b.light || 0xffffff), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      root.add(v.glow);
      if (b.id === 'sun') sunGlow = v.glow;
    }
    if (b.atm) {
      b.visAtm = Math.min(b.atm.h, b.R * 0.22); // visible haze depth (Titan's gameplay atmosphere is deeper than it looks)
      const ag = new THREE.SphereGeometry(b.R + b.visAtm, quality === 'low' ? 48 : 96, quality === 'low' ? 24 : 48);
      const H = b.atm.H / b.R;
      const am = new THREE.ShaderMaterial({
        uniforms: {
          uC: { value: new V3() }, uRa: { value: (b.R + b.visAtm) / b.R }, uSun: { value: new V3(1, 0, 0) },
          uBetaR: { value: new V3(...b.atm.tauR).divideScalar(H) }, uBetaM: { value: b.atm.tauM / H }, uMieCol: { value: new V3(...b.atm.mie) },
          uNS: { value: 16 }, uH: { value: H }, uSunI: { value: 16 }, uInvR: { value: 1 / b.R }, uOut: { value: 0 }, uLin: { value: Post.enabled ? 1 : 0 }, uG: { value: b.atm.tauM > 1 ? 0.2 : 0.76 },
        },
        vertexShader: atmVS, fragmentShader: atmFS(quality === 'low' ? 18 : 32, quality === 'low' ? 3 : 4),
        transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        side: THREE.FrontSide,
      });
      v.atm = new THREE.Mesh(ag, am); v.atm.renderOrder = 10;
      tilt.add(v.atm);
    }
    if (b.rings) {
      const inner = b.rings.inner * 1000 * SCALE, outer = b.rings.outer * 1000 * SCALE;
      const rg = new THREE.RingGeometry(inner, outer, 384, 1);
      const pos = rg.attributes.position, uv = rg.attributes.uv;
      for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (r - inner) / (outer - inner), 0.5); }
      const map = { value: b.rings.tex ? null : ringProfile(b) };
      const rm = new THREE.ShaderMaterial({
        uniforms: { uMap: map, uSun: { value: new V3() }, uC: { value: new V3() }, uR: { value: b.R }, uN: { value: new V3(0, 1, 0) }, uE1: { value: new V3(1, 0, 0) },
          uSpan: { value: outer - inner }, uSunI: { value: 3.2 }, uTint: { value: b.rings.tex ? new V3(1.08, 0.98, 0.84) : new V3(1, 1, 1) }, uNear: { value: 0 }, uDust: { value: b.rings.style === 'icy' || b.rings.tex ? 0.15 : 1 }, uArcs: { value: b.rings.style === 'neptune' ? 1 : 0 } },
        vertexShader: ringVS, fragmentShader: ringFS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      });
      rm.extensions = { derivatives: true };
      rm.visible = !!map.value;
      v.ring = new THREE.Mesh(rg, rm); v.ring.rotation.x = -Math.PI / 2; v.ring.renderOrder = 5;
      tilt.add(v.ring);
      // the rings' shadow on the planet: from each point, follow the sunlight to the ring plane and dim it
      // by however much of the ring it passes through there
      v.ringShade = { uRingN: { value: new V3() }, uRingC: { value: new V3() }, uRingSun: { value: new V3() }, uRingIn: { value: inner }, uRingOut: { value: outer }, uRingMap: map };
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, v.ringShade);
        sh.fragmentShader = 'uniform vec3 uRingN; uniform vec3 uRingC; uniform vec3 uRingSun; uniform float uRingIn; uniform float uRingOut; uniform sampler2D uRingMap;\n' + sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
          {
            vec3 P = -vViewPosition; float dn = dot(uRingSun, uRingN);
            if (abs(dn) > 1e-4) {
              float s = dot(uRingC - P, uRingN) / dn;
              if (s > 0.0) {
                float u = (length(P + uRingSun * s - uRingC) - uRingIn) / (uRingOut - uRingIn);
                if (u > 0.0 && u < 1.0) {
                  float a = clamp(texture2D(uRingMap, vec2(u, 0.5)).a, 0.0, 0.985);
                  float sh = exp(log(1.0 - a) / abs(dn));
                  reflectedLight.directDiffuse *= sh; reflectedLight.directSpecular *= sh;
                }
              }
            }
          }`);
      };
    }
    scene.add(root);
    return v;
  }
  function setDetail(v, hi) {
    const b = v.b, n = hi ? [320, 160] : (b.R < 30000 ? [48, 24] : [96, 48]);
    v.sphere.geometry.dispose(); v.sphere.geometry = new THREE.SphereGeometry(b.R, n[0], n[1]);
    if (v.atm) { v.atm.geometry.dispose(); v.atm.geometry = new THREE.SphereGeometry(b.R + b.visAtm, hi ? 256 : 96, hi ? 128 : 48); }
    v.hiGeo = hi;
  }
  function texFrom(source, lowRes) {
    let t;
    if (lowRes && source.width > 1024) {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 512; c.getContext('2d').drawImage(source, 0, 0, 1024, 512);
      t = new THREE.CanvasTexture(c);
    } else if (source instanceof HTMLCanvasElement) t = new THREE.CanvasTexture(source);
    else { t = new THREE.Texture(source); t.needsUpdate = true; }
    t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    return t;
  }
  // cloud alpha must stay linear (not sRGB-decoded) or the layer turns grey and heavy
  function cloudAlpha(img) { const c = document.createElement("canvas"); c.width = 2048; c.height = 1024; c.getContext("2d").drawImage(img, 0, 0, 2048, 1024); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; }
  function applyTex(v) {
    const e = TexStore.entry(v.b); if (!e) return;
    const low = quality === 'low';
    const src = (v.b.farTex && e.extra.far) ? e.extra.far : (e.img && !e.fallback ? e.img : e.canvas);
    if (!src) return;
    const m = v.sphere.material;
    m.map = texFrom(src, low); m.color.set(0xffffff);
    if (v.b.type === 'star') { m.color.setRGB(...(v.b.starTint || [3.2, 2.75, 2.2])); m.toneMapped = false; }
    if (v.b.id === 'earth') {
      if (e.extra.night) { m.emissiveMap = texFrom(e.extra.night, low); m.emissive = new THREE.Color(0xffd7a0); m.emissiveIntensity = 1.2; }
      if (e.extra.rough) { m.roughnessMap = new THREE.CanvasTexture(e.extra.rough); m.roughness = 1; m.metalness = 0; }
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uSunView = v.sunView = v.sunView || { value: new V3() };
        sh.fragmentShader = 'uniform vec3 uSunView;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `
          #ifdef USE_EMISSIVEMAP
            vec4 emissiveColor = texture2D( emissiveMap, vUv );
            float nd = dot(normalize(vNormal), uSunView);
            totalEmissiveRadiance *= emissiveColor.rgb * smoothstep(0.1, -0.25, nd);
          #endif`);
      };
    }
    // clouds: a flat layer seen from orbit where the planet's map has none of its own, and a volume up close
    const cp = Clouds.profileOf(v.b);
    if (cp && quality !== 'low' && !v.clouds && !v.vol) {
      const alpha = cp.map === 'image' ? (e.extra.clouds ? cloudAlpha(e.extra.clouds) : null) : cp.flat ? Clouds.coverTex(v.b, cp, 768) : null;
      if (alpha) {
        const cg = new THREE.SphereGeometry(v.b.R + cp.flat, 96, 48);
        const fc = cp.albedo2 ? cp.albedo.map((x, i) => (x + cp.albedo2[i]) / 2) : cp.albedo;
        const cm = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...fc), alphaMap: alpha, transparent: true, depthWrite: false, roughness: 1, side: THREE.DoubleSide, fog: false });
        v.clouds = new THREE.Mesh(cg, cm); v.clouds.renderOrder = 8; v.spin.add(v.clouds); v.cloudAlt = cp.flat;
      }
      if (cp.map === 'surface') Clouds.attach(v, cp, m.map, false);
      else if (alpha) Clouds.attach(v, cp, alpha, false);
      else if (cp.map !== 'image') Clouds.attach(v, cp, Clouds.coverTex(v.b, cp, 256), true);
    }
    if (v.ring && e.extra.ring) { const rt = texFrom(e.extra.ring, false); v.ring.material.uniforms.uMap.value = rt; v.ring.material.visible = true; m.needsUpdate = true;
      // a lookup of the photographed profile for the close-up chunks
      const im = e.extra.ring, cv = document.createElement('canvas'); cv.width = im.width; cv.height = 1; const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0, im.width, 1); v.ringTable = cx.getImageData(0, 0, im.width, 1).data; }
    m.needsUpdate = true;
    v.tex = 'ready';
  }
  function dropTex(v) {
    const m = v.sphere.material;
    ['map', 'emissiveMap', 'roughnessMap'].forEach(k => { if (m[k]) { m[k].dispose(); m[k] = null; } });
    m.color.set(v.b.color); m.needsUpdate = true;
    Clouds.detach(v);
    if (v.clouds) { v.spin.remove(v.clouds); v.clouds.geometry.dispose(); v.clouds.material.alphaMap.dispose(); v.clouds = null; }
    v.tex = 'none';
  }

  // ---------- per-frame update ----------
  // cam: heliocentric camera position. focus: body whose surface/terrain may be active.
  function update(cam, t, focus, dt) {
    camPos.copy(cam);
    const now = performance.now() / 1000;
    const H = renderer.domElement.clientHeight || window.innerHeight;
    const pxPerRad = H / (camera.fov * DEG);
    for (const b of Bodies.list) {
      const v = vis[b.id];
      _v.copy(b.pos).sub(camPos);
      v.root.position.copy(_v);
      v.spin.rotation.y = b.rot;
      const dist = _v.length();
      v.dist = dist;
      v.px = (b.R / Math.max(dist, b.R * 1.001)) * pxPerRad * 2;
      if (quality !== 'low' && b.type !== 'star' && !b.irregular && !b.shape) {
        const hi = v.px > 500 || (!!v.hiGeo && v.px > 350);
        if (hi !== !!v.hiGeo) setDetail(v, hi);
      }
      // texture streaming
      if (v.px > 5 && v.tex === 'none') { v.tex = 'loading'; TexStore.request(b, () => { if (v.tex === 'loading') applyTex(v); }); }
      if (v.px < 1.5 && v.tex === 'ready' && b.id !== 'earth') { v.lowSince = v.lowSince || now; if (now - v.lowSince > 12) dropTex(v); } else v.lowSince = 0;
      // atmosphere uniforms
      if (v.atm) {
        const u = v.atm.material.uniforms;
        u.uC.value.copy(_v).divideScalar(b.R);
        Bodies.toStar(b, b.pos, _w); u.uSun.value.copy(_w);
        const inside = dist < (b.R + b.visAtm) * 0.999;
        // full-strength sky from inside; from space a gentler haze so the surface stays readable
        const camAlt = dist - b.R;
        const inF = smooth(b.atm.h * 1.6, b.atm.h * 0.4, camAlt);
        u.uSunI.value = lerp(Post.enabled ? 7 : 10, 16, inF) * (b.atm.trace ? 0.7 : 1);
        u.uOut.value = (1 - inF) * (b.atm.tauM > 1 ? 0.1 : 1); // thick hazes (Venus, Titan) stay opaque
        // more samples as you climb: from space the limb is a thin, bright band that needs them most
        u.uNS.value = Math.round(lerp(quality === 'low' ? 12 : 16, quality === 'low' ? 18 : 32, smooth(b.atm.h * 0.5, b.atm.h * 2, camAlt)));
        const side = inside ? THREE.BackSide : THREE.FrontSide;
        if (v.atm.material.side !== side) { v.atm.material.side = side; v.atm.material.needsUpdate = true; }
        v.atm.visible = v.px > 0.8;
      }
      if (v.ring) {
        const u = v.ring.material.uniforms;
        u.uC.value.copy(_v); Bodies.toStar(b, b.pos, u.uSun.value); u.uN.value.set(0, 1, 0).applyQuaternion(b.tiltQ); u.uE1.value.set(1, 0, 0).applyQuaternion(b.tiltQ);
        u.uSunI.value = Post.enabled ? 3.2 : 1.6;
        v.ring.visible = v.px > 0.5;
        // the same geometry seen from the planet's surface, in view space, for its ring shadows
        const rs = v.ringShade, vi = camera.matrixWorldInverse;
        rs.uRingN.value.copy(u.uN.value).transformDirection(vi); rs.uRingSun.value.copy(u.uSun.value).transformDirection(vi); rs.uRingC.value.copy(_v).applyMatrix4(vi);
      }
      if (v.clouds) {
        v.clouds.rotation.y = t * (v.volP ? v.volP.drift || 0 : 1.2e-5);
        // seen from below, clouds glow with scattered daylight instead of showing an unlit underside
        const below = dist < b.R + (v.cloudAlt || 4500);
        const sunUp = clamp(_v.clone().negate().normalize().dot(Bodies.toStar(b, b.pos, _w)) * -1, -1, 1);
        const m = v.clouds.material;
        if (below) { const day = smooth(-0.15, 0.3, -sunUp); m.emissive.setRGB(0.62 * day, 0.64 * day, 0.68 * day).multiply(m.color); m.opacity = 0.75; }
        else { m.emissive.setRGB(0, 0, 0); m.opacity = 1; }
      }
      if (v.vol) Clouds.update(v, camPos, camera, t);
      if (v.sunView) v.sunView.value.copy(b.pos).negate().normalize().transformDirection(camera.matrixWorldInverse);
      v.sphere.visible = v.px > 0.3 || b.type === 'star';
      // star glare: a big halo nearby, shrinking to a bright point across interstellar distances
      if (v.glow) { const far = smooth(2e12, 3e13, dist); v.glow.scale.setScalar(Math.max(b.R * 9, dist * lerp(0.06, 0.004 * Math.pow(b.lum || 1, 0.18), far))); }
    }
    // sunlight: a directional light aimed from the local star (the one whose system we're in) through the focus point
    const lightStar = Bodies.starOf(focus || Bodies.byId.sun), sv = vis[lightStar.id];
    sunLight.color.set(lightStar.light || 0xfff4e6);
    const sunDir = _w.copy(sv.root.position).sub(sfocus.on ? sfocus.pos : new V3()).normalize();
    const R = Math.max(8, sfocus.r);
    sunLight.target.position.copy(sfocus.on ? sfocus.pos : new V3());
    sunLight.position.copy(sunLight.target.position).addScaledVector(sunDir, R * 4 + 50);
    const sc = sunLight.shadow.camera;
    if (sc.right !== R) {
      sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 1; sc.far = R * 8 + 100; sc.updateProjectionMatrix();
      // offset shadow lookups by about one and a half shadow-map texels so surfaces don't shadow themselves in stripes (acne)
      sunLight.shadow.normalBias = Math.max(0.02, (2 * R / sunLight.shadow.mapSize.x) * 1.5); sunLight.shadow.bias = -0.0002;
    }
    sunLight.target.updateMatrixWorld();
    // terrain LOD for focus body
    updateTerrain(focus, t, now);
    updateRingField(t);
    // sky / fog / ambient from the body we're in
    sky(focus, t);
    stars.position.set(0, 0, 0);
  }
  const _bf = new V3();
  function switchAlt(b) { return b.R < 30000 ? Math.max(b.R * 2.5, 3000) : clamp(b.R * 0.4, 25000, 160000); }
  function updateTerrain(b, t, now) {
    let want = null;
    if (b && b.solid) {
      const alt = _v.copy(camPos).sub(b.pos).length() - b.R;
      const sa = switchAlt(b);
      if (alt < sa * 1.5 || (activeTerrain && activeTerrain.b === b && alt < sa * 1.6)) want = b;
    }
    if (!want) Water.hide();
    if (activeTerrain && activeTerrain.b !== want) {
      vis[activeTerrain.b.id].sphere.visible = true; vis[activeTerrain.b.id].sphere.scale.setScalar(1);
      activeTerrain.dispose(); activeTerrain = null;
      if (scatter) { scatter.group.parent && scatter.group.parent.remove(scatter.group); scatter = null; }
    }
    if (want && !activeTerrain) {
      const e = TexStore.entry(want);
      if (!e || e.state !== 'ready') { TexStore.request(want); }
      else {
        activeTerrain = new Terrain.QuadTerrain(want, quality);
        vis[want.id].spin.add(activeTerrain.group);
        // (no announcement: it is a technical detail, and it fired over the title screen)
      }
    }
    if (activeTerrain) {
      const v = vis[want.id];
      Bodies.toBF(want, _v.copy(camPos).sub(want.pos), t, _bf);
      activeTerrain.update(_bf, now);
      // the near surface fades out over the textured sphere as you climb (and in as you descend); the
      // sphere sits a little lower meanwhile so the two never fight over the same depth
      const alt = _bf.length() - want.R, sa = switchAlt(want);
      const f = smooth(sa * 1.5, sa, alt);
      activeTerrain.setFade(f);
      Water.update(want, v.spin, _bf, f, camera, quality);
      v.sphere.visible = f < 0.999;
      v.sphere.scale.setScalar(f > 0.001 ? 1 - Math.min(0.004, 2500 / want.R) : 1);
      if (v.tex === 'ready' && want.id !== 'earth' && !v.texParked) { v.texParked = true; }
      updateScatter(want, _bf);
    }
  }
  // ---------- ring particles up close ----------
  // Inside a ring the sheet becomes what it is: tumbling chunks of ice. Each chunk keeps its own orbit
  // (radius, starting angle, height in the sheet), moving at the Kepler speed for its radius, so a ship
  // orbiting within the ring drifts slowly among them. Chunks are found by hashing cells of (radius,
  // starting angle) around the camera, so the same chunk is always in the same place.
  let ringField = null;
  const RF_N = 2600;
  const _q = new Q4(), _m4 = new THREE.Matrix4(), _sc = new V3(), _pp = new V3(), _ax = new V3();
  function updateRingField(t) {
    let b = null;
    for (const c of Bodies.list) if (c.rings && vis[c.id].ring && vis[c.id].dist < c.rings.outer * 1000 * SCALE * 1.02) { b = c; break; }
    const hide = () => { if (ringField) ringField.mesh.visible = false; };
    if (!b || quality === 'low') return hide();
    const inner = b.rings.inner * 1000 * SCALE, outer = b.rings.outer * 1000 * SCALE;
    const rel = _pp.copy(camPos).sub(b.pos);
    const n = new V3(0, 1, 0).applyQuaternion(b.tiltQ), e1 = new V3(1, 0, 0).applyQuaternion(b.tiltQ), e2 = new V3(0, 0, 1).applyQuaternion(b.tiltQ);
    const hc = rel.dot(n), x = rel.dot(e1), z = rel.dot(e2), rc = Math.hypot(x, z);
    const CELL = 120, REACH = 5, THICK = 30;
    const ringU = vis[b.id].ring.material.uniforms;
    ringU.uNear.value = 0;
    if (Math.abs(hc) > CELL * REACH || rc < inner || rc > outer) return hide();
    ringU.uNear.value = CELL * REACH * 1.2 * smooth(CELL * REACH, CELL * REACH * 0.5, Math.abs(hc));
    // how dense the ring is here, from its profile
    const prof = vis[b.id].ring.material.uniforms.uMap.value;
    const tbl = vis[b.id].ringTable || (prof && prof.image && prof.image.data);
    let dens = 0.4;
    if (tbl) { const N = tbl.length / 4, i = clamp(Math.floor((rc - inner) / (outer - inner) * N), 0, N - 1); dens = tbl[i * 4 + 3] / 255; }
    if (!ringField) {
      const geo = new THREE.IcosahedronGeometry(1, 1), p = geo.attributes.position, d = new V3();
      for (let i = 0; i < p.count; i++) { d.fromBufferAttribute(p, i); d.multiplyScalar(1 + 0.25 * Noise.n3(d.x * 1.7, d.y * 1.7, d.z * 1.7)); p.setXYZ(i, d.x, d.y * 0.8, d.z); }
      geo.computeVertexNormals();
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.75, metalness: 0, flatShading: true }), RF_N);
      mesh.frustumCulled = false; scene.add(mesh);
      ringField = { mesh, b: null };
    }
    if (ringField.b !== b) { ringField.b = b; const tint = b.rings.tint || (b.rings.style === 'uranus' || b.rings.style === 'neptune' ? [0.32, 0.31, 0.3] : [0.9, 0.86, 0.8]); ringField.mesh.material.color.setRGB(...tint); }
    if (!(dens > 0.02)) return hide();
    const thc = Math.atan2(z, x), GM = b.GM, mesh = ringField.mesh;
    let k = 0;
    const r0c = Math.floor(rc / CELL);
    for (let ir = -REACH; ir <= REACH && k < RF_N; ir++) {
      const ri = r0c + ir, rMid = (ri + 0.5) * CELL, om = Math.sqrt(GM / (rMid * rMid * rMid)), dth = CELL / rMid;
      const jc = Math.floor((thc - om * t) / dth);
      for (let jj = -REACH; jj <= REACH && k < RF_N; jj++) {
        const j = jc + jj, cnt = Math.round(dens * 9 * hash3i(ri, j, 0, 91) + dens * 3);
        for (let q = 0; q < cnt && k < RF_N; q++) {
          const r = (ri + hash3i(ri, j, q, 1)) * CELL, th = (j + hash3i(ri, j, q, 2)) * dth + Math.sqrt(GM / (r * r * r)) * t;
          const h = (hash3i(ri, j, q, 3) - 0.5) * 2 * THICK * (0.4 + 0.6 * dens);
          _pp.copy(b.pos).sub(camPos).addScaledVector(e1, r * Math.cos(th)).addScaledVector(e2, r * Math.sin(th)).addScaledVector(n, h);
          if (_pp.lengthSq() > (CELL * REACH) ** 2) continue;
          const size = 0.4 + Math.pow(hash3i(ri, j, q, 4), 4) * 11;
          _ax.set(hash3i(ri, j, q, 5) - 0.5, hash3i(ri, j, q, 6) - 0.5, hash3i(ri, j, q, 7) - 0.5).normalize();
          _q.setFromAxisAngle(_ax, hash3i(ri, j, q, 8) * 6.283 + t * 0.05 * (hash3i(ri, j, q, 9) - 0.5));
          _m4.compose(_pp, _q, _sc.set(size, size * (0.6 + 0.4 * hash3i(ri, j, q, 10)), size)); mesh.setMatrixAt(k++, _m4);
        }
      }
    }
    mesh.count = k; mesh.instanceMatrix.needsUpdate = true; mesh.visible = k > 0;
  }
  // ---------- rocks & trees near the camera ----------
  function updateScatter(b, camBF) {
    const alt = camBF.length() - b.R;
    if (quality === 'low' || alt > 2500) { if (scatter) scatter.group.visible = false; return; }
    if (!scatter || scatter.b !== b) {
      if (scatter && scatter.group.parent) scatter.group.parent.remove(scatter.group);
      // weathered boulder: smooth low-frequency lumps, a few sharper facets, flattened base
      const rockGeo = new THREE.SphereGeometry(1, 24, 16);
      const p = rockGeo.attributes.position, d = new V3();
      for (let i = 0; i < p.count; i++) { d.fromBufferAttribute(p, i); const s = 1 + 0.22 * Noise.n3(d.x * 1.2 + 3, d.y * 1.2, d.z * 1.2) + 0.06 * Noise.n3(d.x * 3.5, d.y * 3.5, d.z * 3.5); d.multiplyScalar(s); d.y = d.y > 0 ? d.y * 0.7 : d.y * 0.35; p.setXYZ(i, d.x, d.y, d.z); }
      rockGeo.computeVertexNormals();
      const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }), 900);
      rocks.castShadow = true; rocks.receiveShadow = true;
      const group = new THREE.Group(); group.add(rocks);
      let trees = null;
      if (b.id === 'earth') {
        const tg = new THREE.ConeGeometry(1, 3, 7); tg.translate(0, 1.5, 0);
        trees = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0x1f3d1a, roughness: 0.9, flatShading: true }), 700);
        group.add(trees);
      }
      vis[b.id].spin.add(group);
      scatter = { b, group, rocks, trees, anchor: new V3(1e20, 0, 0) };
    }
    scatter.group.visible = true;
    if (scatter.anchor.distanceTo(camBF) < 30) return;
    scatter.anchor.copy(camBF);
    const R = b.R, cell = 6, rad = 170;
    const dir = camBF.clone().normalize();
    const base = dir.clone().multiplyScalar(R);
    scatter.group.position.copy(base);
    const ll = dirToLatLon(dir);
    const dLat = cell / R, dLon = cell / (R * Math.max(0.05, Math.cos(ll.lat)));
    const n = Math.ceil(rad / cell);
    const li = Math.floor(ll.lat / dLat), lo = Math.floor(ll.lon / dLon);
    const m4 = new THREE.Matrix4(), q = new Q4(), s = new V3(), pos = new V3(), up = new V3(0, 1, 0), dd = new V3();
    let rc = 0, tc = 0;
    const seed = strHash(b.id) % 1000;
    const rockP = b.id === 'earth' ? 0.02 : b.terrain && b.terrain.cr > 0.4 ? 0.34 : 0.2;
    for (let a = -n; a <= n; a++) for (let c2 = -n; c2 <= n; c2++) {
      const ia = li + a, ic = lo + c2;
      const hsh = hash3i(ia, ic, 0, seed);
      const isRock = hsh < rockP, isTree = b.id === 'earth' && hsh > 0.93;
      if (!isRock && !isTree) continue;
      const lat = (ia + hash3i(ia, ic, 1, seed)) * dLat, lon = (ic + hash3i(ia, ic, 2, seed)) * dLon;
      latLonToDir(lat, lon, dd);
      if (dd.distanceTo(dir) * R > rad) continue;
      let h = Terrain.height(b, dd, 2);
      if (b.ocean && h <= 1) continue;
      if (b.id === 'earth' && Math.acos(clamp(dd.dot(Terrain.kscDir), -1, 1)) < 0.0062) continue;
      pos.copy(dd).multiplyScalar(R + h).sub(base);
      q.setFromUnitVectors(up, dd);
      if (isRock && rc < 900) {
        const sz = 0.1 + Math.pow(hash3i(ia, ic, 3, seed), 5) * 2.4;
        q.multiply(new Q4().setFromAxisAngle(up, hsh * 50));
        s.set(sz, sz, sz);
        m4.compose(pos.addScaledVector(dd, -sz * 0.15), q, s); scatter.rocks.setMatrixAt(rc, m4);
        // tint each rock from the ground it sits on, slightly darker and varied
        const gcol = TexStore.color(b, lat, lon, [0, 0, 0]); const vk = 0.55 + hash3i(ia, ic, 5, seed) * 0.35;
        scatter.rocks.setColorAt(rc++, new THREE.Color(Math.pow(gcol[0], 2.2) * vk, Math.pow(gcol[1], 2.2) * vk, Math.pow(gcol[2], 2.2) * vk));
      } else if (isTree && scatter.trees && tc < 700) {
        const col = TexStore.color(b, lat, lon, [0, 0, 0]);
        if (col[1] < col[0] * 0.95 || col[1] < col[2]) continue;
        const sz = 1.5 + hash3i(ia, ic, 4, seed) * 3;
        s.set(sz * 0.6, sz, sz * 0.6);
        m4.compose(pos, q, s); scatter.trees.setMatrixAt(tc++, m4);
      }
    }
    scatter.rocks.count = rc; scatter.rocks.instanceMatrix.needsUpdate = true; if (scatter.rocks.instanceColor) scatter.rocks.instanceColor.needsUpdate = true;
    if (scatter.trees) { scatter.trees.count = tc; scatter.trees.instanceMatrix.needsUpdate = true; }
  }
  // ---------- sky colour, fog, ambient ----------
  const SKY = { earth: [0.42, 0.62, 0.95], mars: [0.78, 0.58, 0.4], venus: [0.85, 0.66, 0.38], titan: [0.75, 0.48, 0.2], jupiter: [0.8, 0.7, 0.55], saturn: [0.85, 0.75, 0.5], uranus: [0.55, 0.8, 0.85], neptune: [0.3, 0.45, 0.9], pluto: [0.3, 0.4, 0.6], triton: [0.3, 0.35, 0.45] };
  function sky(b, t) {
    let fogD = 0, day = 0, inAtm = 0;
    const fogC = new THREE.Color(0x000000);
    if (b && b.atm) {
      const rel = _v.copy(camPos).sub(b.pos);
      const alt = rel.length() - b.R;
      const rho = Bodies.density(b, Math.max(alt, 0));
      const rel0 = rho / b.atm.rho0;
      const up = rel.normalize();
      const sunDir = Bodies.toStar(b, b.pos, _w);
      const el = up.dot(sunDir);
      day = smooth(-0.18, 0.15, el);
      inAtm = clamp(Math.pow(rel0, 0.35), 0, 1) * (b.atm.trace ? 0.1 : 1);
      const sc = SKY[b.id] || b.sky || [0.5, 0.5, 0.5];
      const thick = Math.min(1, b.atm.tauM * 0.3 + (b.atm.tauR[2] || 0));
      fogC.setRGB(sc[0] * day * 0.9, sc[1] * day * 0.9, sc[2] * day * 0.9);
      const vis = b.id === 'earth' ? 70000 : b.id === 'venus' ? 9000 : b.id === 'titan' ? 12000 : b.id === 'mars' ? 40000 : 50000;
      fogD = b.atm.trace ? 0 : rel0 * (1 / vis) * (0.4 + thick);
    }
    scene.fog.color.copy(fogC); scene.fog.density = fogD;
    if (b && b.id === 'earth' && typeof SpaceCenter !== 'undefined') SpaceCenter.lights(1 - day);
    // live reflections: sky above, ground or the planet below, and the Sun
    if (b) {
      const rel = _v.copy(camPos).sub(b.pos), dist = rel.length(), up = rel.clone().divideScalar(dist);
      const sunDir = Bodies.toStar(b, camPos, new V3());
      const sc = SKY[b.id] || b.sky || [0.4, 0.4, 0.45];
      const el = up.dot(sunDir);
      const lit = clamp(el * 0.9 + 0.15, 0.03, 1);
      const gc = new THREE.Color(b.color); const ground = [gc.r * lit * 0.9, gc.g * lit * 0.9, gc.b * lit * 0.9];
      const sky = [sc[0] * day * 1.1, sc[1] * day * 1.1, sc[2] * day * 1.2];
      const horizon = [lerp(sky[0], 0.95, 0.5) * day, lerp(sky[1], 0.95, 0.5) * day, lerp(sky[2], 0.98, 0.5) * day];
      // is the Sun hidden behind the body?
      const tca = -rel.dot(sunDir); let sunVis = 1;
      if (tca > 0 && rel.clone().addScaledVector(sunDir, tca).length() < b.R) sunVis = 0;
      const planetAng = b.type === 'star' ? 0 : Math.asin(clamp(b.R / dist, 0, 1));
      EnvLight.update({ up, sunDir, sky, horizon, ground, day, inAtm, planetAng, sunVis }, performance.now() / 1000);
    }
    daylight = inAtm * day;
    // daylight sky fill, plus faint bluish moon/skyglow so nights are dark but readable
    hemi.intensity = inAtm * (day * 0.55 + (1 - day) * 0.09);
    if (b && (SKY[b.id] || b.sky)) { const sc = SKY[b.id] || b.sky; hemi.color.setRGB(lerp(0.35, sc[0], day), lerp(0.45, sc[1], day), lerp(0.75, sc[2], day)); }
    else hemi.color.setRGB(0.04, 0.045, 0.06);
    // sunlit ground bounces light up onto nearby rocks and spacecraft (matters most on airless worlds)
    hemi.groundColor.setRGB(0.23, 0.19, 0.15);
    if (b && b.solid) {
      const rel = _v.copy(camPos).sub(b.pos), alt = rel.length() - b.R;
      const el = rel.normalize().dot(Bodies.toStar(b, b.pos, _w));
      const near = smooth(30000, 3000, alt) * clamp(el * 1.5 + 0.1, 0, 1);
      if (near > 0) {
        const gc = new THREE.Color(b.id === "earth" ? 0x55663c : b.color);
        hemi.groundColor.setRGB(gc.r, gc.g, gc.b);
        hemi.intensity = Math.max(hemi.intensity, near * 0.6);
      }
    }
    ambient.intensity = 0.1 + inAtm * day * 0.15;
    stars.material.color.setScalar(0.55 * (1 - inAtm * day * 0.97));
  }
  function render(sc, cam, opts) {
    if (Post.enabled) return Post.render(sc || scene, cam || camera, opts);
    renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(sc || scene, cam || camera);
  }
  function setQuality(q) { quality = q; }
  return {
    init, update, render, resize, setQuality,
    get renderer() { return renderer; }, get env() { return env; }, setFocus, get daylight() { return daylight; }, get scene() { return scene; }, get camera() { return camera; },
    get quality() { return quality; }, vis, camPos, get terrain() { return activeTerrain; },
  };
})();
