'use strict';
// ---------- Cinematic rendering: HDR scene, bloom, filmic tone mapping, live sky reflections ----------
const Post = (function () {
  let R = null, enabled = false, hdr = null, levels = [], quad, qcam, mats = {}, w = 0, h = 0, pr = 1;
  const LEVELS = 5;
  const vs = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  function mk(fs, uniforms) { return new THREE.ShaderMaterial({ uniforms, vertexShader: vs, fragmentShader: fs, depthTest: false, depthWrite: false, toneMapped: false }); }
  function rt(width, height, msaa) {
    const t = new THREE.WebGLRenderTarget(Math.max(1, width), Math.max(1, height), { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!msaa });
    if (msaa) t.samples = 4;
    return t;
  }
  function init(renderer, q) {
    R = renderer;
    enabled = q !== 'low' && R.capabilities.isWebGL2;
    if (!enabled) return;
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // bright pass with a soft knee so only genuinely bright light blooms
    mats.bright = mk(`uniform sampler2D tex; uniform float thr; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = max(max(c.r, c.g), c.b);
        float k = clamp((l - thr + 0.5) / 1.0, 0.0, 1.0); float soft = k * k * 0.5;
        float m = max(soft, l - thr) / max(l, 1e-4); gl_FragColor = vec4(min(c * m, vec3(60.0)), 1.0); }`, { tex: { value: null }, thr: { value: 1.0 } });
    mats.copy = mk(`uniform sampler2D tex; uniform vec2 px; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tex, vUv + vec2(-px.x, -px.y)).rgb + texture2D(tex, vUv + vec2(px.x, -px.y)).rgb + texture2D(tex, vUv + vec2(-px.x, px.y)).rgb + texture2D(tex, vUv + vec2(px.x, px.y)).rgb; gl_FragColor = vec4(c * 0.25, 1.0); }`, { tex: { value: null }, px: { value: new THREE.Vector2() } });
    mats.blur = mk(`uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tex, vUv).rgb * 0.227027;
        c += (texture2D(tex, vUv + dir * 1.3846).rgb + texture2D(tex, vUv - dir * 1.3846).rgb) * 0.3162162;
        c += (texture2D(tex, vUv + dir * 3.2307).rgb + texture2D(tex, vUv - dir * 3.2307).rgb) * 0.0702703;
        gl_FragColor = vec4(c, 1.0); }`, { tex: { value: null }, dir: { value: new THREE.Vector2() } });
    mats.comp = mk(`uniform sampler2D tex; uniform sampler2D b0; uniform sampler2D b1; uniform sampler2D b2; uniform sampler2D b3; uniform sampler2D b4;
      uniform float bloom; uniform float exposure; uniform float vig; uniform float time; varying vec2 vUv;
      vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
      vec3 aces(vec3 c){ const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
        const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
        c = I * c; c = RRTAndODTFit(c); return clamp(O * c, 0.0, 1.0); }
      vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
      void main(){
        vec3 c = texture2D(tex, vUv).rgb;
        vec3 bl = texture2D(b0, vUv).rgb * 0.30 + texture2D(b1, vUv).rgb * 0.25 + texture2D(b2, vUv).rgb * 0.2 + texture2D(b3, vUv).rgb * 0.15 + texture2D(b4, vUv).rgb * 0.1;
        c += bl * bloom;
        c = aces(c * exposure / 0.6);
        vec2 d = vUv - 0.5; c *= 1.0 - vig * dot(d, d) * 1.6;
        c = toSRGB(c);
        float n = fract(sin(dot(vUv * 1000.0 + time, vec2(12.9898, 78.233))) * 43758.5453);
        c += (n - 0.5) / 255.0;
        gl_FragColor = vec4(c, 1.0); }`,
      { tex: { value: null }, b0: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, b4: { value: null }, bloom: { value: 0.55 }, exposure: { value: 0.82 }, vig: { value: 0.35 }, time: { value: 0 } });
    resize();
  }
  function resize() {
    if (!enabled) return;
    pr = R.getPixelRatio();
    w = Math.round(window.innerWidth * pr); h = Math.round(window.innerHeight * pr);
    if (hdr) hdr.dispose(); levels.forEach(l => { l.a.dispose(); l.b.dispose(); });
    hdr = rt(w, h, true);
    levels = [];
    let lw = Math.round(w / 2), lh = Math.round(h / 2);
    for (let i = 0; i < LEVELS; i++) { levels.push({ a: rt(lw, lh), b: rt(lw, lh), w: lw, h: lh }); lw = Math.max(1, lw >> 1); lh = Math.max(1, lh >> 1); }
  }
  function pass(mat, target) { quad.material = mat; R.setRenderTarget(target); R.render(quad, qcam); }
  // Renders the scene through the HDR chain to the screen.
  function render(scene, camera, opts) {
    const prevTM = R.toneMapping;
    R.setRenderTarget(hdr);
    R.setClearColor(0x000000, 1); R.clear();
    R.render(scene, camera);
    // bloom pyramid
    mats.bright.uniforms.tex.value = hdr.texture; mats.bright.uniforms.thr.value = opts && opts.thr != null ? opts.thr : 1.3;
    pass(mats.bright, levels[0].a);
    for (let i = 0; i < LEVELS; i++) {
      const L = levels[i];
      if (i > 0) { mats.copy.uniforms.tex.value = levels[i - 1].a.texture; mats.copy.uniforms.px.value.set(0.5 / levels[i - 1].w, 0.5 / levels[i - 1].h); pass(mats.copy, L.a); }
      mats.blur.uniforms.tex.value = L.a.texture; mats.blur.uniforms.dir.value.set(1 / L.w, 0); pass(mats.blur, L.b);
      mats.blur.uniforms.tex.value = L.b.texture; mats.blur.uniforms.dir.value.set(0, 1 / L.h); pass(mats.blur, L.a);
    }
    const u = mats.comp.uniforms;
    u.tex.value = hdr.texture;
    for (let i = 0; i < LEVELS; i++) u['b' + i].value = levels[i].a.texture;
    u.time.value = (performance.now() % 10000) / 10;
    u.bloom.value = opts && opts.bloom != null ? opts.bloom : 0.55;
    R.setRenderTarget(null);
    R.setViewport(0, 0, window.innerWidth, window.innerHeight);
    quad.material = mats.comp; R.render(quad, qcam);
    R.toneMapping = prevTM;
  }
  return { init, resize, render, get enabled() { return enabled; } };
})();

// ---------- Live environment lighting ----------
// A small HDR panorama of what surrounds the camera (sky, horizon, ground or planet below, the Sun)
// is rebuilt a few times a second and pre-filtered, so hulls and metal reflect their real surroundings.
const EnvLight = (function () {
  let R = null, pm = null, target = null, data = null, tex = null, last = 0, sig = '';
  const W = 64, H = 32;
  function init(renderer) {
    R = renderer;
    pm = new THREE.PMREMGenerator(R);
    data = new Float32Array(W * H * 4);
    tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType);
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    target = pm.fromEquirectangular(tex);
  }
  // p: { up (unit, world), sunDir (unit, world), sky [r,g,b], horizon [r,g,b], ground [r,g,b], day (0..1), planetAng (rad, angular radius of the body below when in space), inAtm (0..1) }
  function update(p, now) {
    if (!pm) return;
    const s = [p.sky, p.ground, p.horizon].map(c => c.map(x => x.toFixed(2)).join(',')).join('|') + p.day.toFixed(2) + p.up.toArray().map(x => x.toFixed(2)) + p.sunDir.toArray().map(x => x.toFixed(2)) + (p.planetAng || 0).toFixed(2);
    if (s === sig || now - last < 0.25) return;
    sig = s; last = now;
    const d = new V3();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      // three.js equirect convention
      const u = (x + 0.5) / W, v = (y + 0.5) / H;
      const phi = (u - 0.5) * 2 * Math.PI, th = (v - 0.5) * Math.PI;
      d.set(Math.cos(th) * Math.cos(phi), Math.sin(th), Math.cos(th) * Math.sin(phi));
      const e = d.dot(p.up), sd = d.dot(p.sunDir);
      let r, g, b;
      if (p.inAtm > 0.02) {
        // sky dome above, ground below, bright horizon band
        const hz = Math.exp(-Math.abs(e) * 6);
        if (e > 0) { r = lerp(p.sky[0], p.horizon[0], hz); g = lerp(p.sky[1], p.horizon[1], hz); b = lerp(p.sky[2], p.horizon[2], hz); }
        else { const k = Math.min(1, -e * 4); r = lerp(p.horizon[0], p.ground[0], k); g = lerp(p.horizon[1], p.ground[1], k); b = lerp(p.horizon[2], p.ground[2], k); }
        const sky = p.inAtm; r *= sky; g *= sky; b *= sky;
      } else { r = g = b = 0.0; }
      // the planet below fills part of the sky when in orbit
      if (p.planetAng > 0 && -e > Math.cos(p.planetAng)) { r = Math.max(r, p.ground[0]); g = Math.max(g, p.ground[1]); b = Math.max(b, p.ground[2]); }
      // the Sun: a hot core with a soft halo
      if (sd > 0.995) { const k = (sd - 0.995) / 0.005; r += 30 * k * p.sunVis; g += 28 * k * p.sunVis; b += 24 * k * p.sunVis; }
      else if (sd > 0.9) { const k = (sd - 0.9) / 0.095; r += 0.6 * k * k * p.sunVis; g += 0.5 * k * k * p.sunVis; b += 0.35 * k * k * p.sunVis; }
      const i = (y * W + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 1;
    }
    tex.needsUpdate = true;
    pm.fromEquirectangular(tex, target);
  }
  return { init, update, get texture() { return target ? target.texture : null; } };
})();
