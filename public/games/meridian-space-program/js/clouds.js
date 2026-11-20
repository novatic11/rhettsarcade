'use strict';
// ---------- Volumetric clouds ----------
// A cover map sets where clouds are; a tileable 3D noise volume gives them puffy, ray-marched depth.
// Near the ground and up through the cloud deck they are real 3D volumes lit by the local star; farther
// away they cross-fade into a flat textured layer (Earth, Adrian, Iris) or into the planet's own map
// (Venus-like decks and gas giants, whose visible surface already is cloud).
const Clouds = (function () {
  let enabled = false, noiseTex = null, quality = 'high';
  const coverBias = { value: 0 }; // admin panel: shifts cloud cover everywhere
  const _m = new THREE.Matrix4(), _p = new V3(), _s = new V3(), _c = new THREE.Color();

  // Each cloudy world's look. base/top: altitude of the cloud layer (m). flat: altitude of a flat layer
  // seen from orbit (only where the planet map has no clouds of its own). map: how the cover map is made
  // ('surface' reuses the planet's own map, so gas giant clouds follow its bands and colours).
  // cov: [base cover, map threshold, map gain]. scale: noise cell sizes (m): cells, fields, detail.
  // stretch: squashes cells north-south so they streak east-west. shape: [lowest tops, base ramp, top softness].
  // drift: rotation of the cover (rad per game second). jet: east-west wind (m/s) alternating over `bands`.
  const gas = (o) => Object.assign({ map: 'surface', base: 4000, top: 46000, cov: [0.36, 0.12, 0.6], scale: [65000, 220000, 9000], stretch: 2.2, shape: [0.55, 0.12, 0.5], erode: 0.4, jet: 160, bands: 12, albedo: [0.85, 0.85, 0.85] }, o);
  const ice = (o) => gas(Object.assign({ top: 32000, cov: [0.42, 0.08, 0.45], scale: [55000, 200000, 8000], stretch: 2.6, jet: 260, bands: 6 }, o));
  const PROFILES = {
    earth: { base: 1500, top: 8500, flat: 4500, map: 'image', cov: [0.34, 0.08, 0.66], scale: [19000, 60000, 3200], shape: [0.35, 0.2, 0.45], erode: 0.4, drift: 1.2e-5, albedo: [1, 1, 1] },
    // Venus: a planet-wide sulfuric-acid deck, 45-70 km up, streaked by its fast-moving upper winds
    venus: { base: 44000, top: 68000, map: 'deck', cov: [0.48, 0.0, 0.48], scale: [48000, 170000, 7000], stretch: 2.4, shape: [0.88, 0.3, 0.72], erode: 0.3, drift: 1.8e-5, albedo: [1.0, 0.78, 0.45] },
    // Mars: thin water-ice cirrus and polar hoods
    mars: { base: 9000, top: 15000, map: 'cirrus', cov: [0.38, 0.05, 0.5], scale: [28000, 90000, 3600], stretch: 2.2, shape: [0.55, 0.35, 0.35], erode: 0.7, dens: 0.5, drift: 1e-5, albedo: [1, 0.94, 0.9] },
    // Titan: scattered methane cumulus under the orange haze
    titan: { base: 14000, top: 27000, haze: true, map: 'sparse', cov: [0.26, 0.1, 0.6], scale: [20000, 70000, 3500], shape: [0.4, 0.2, 0.45], erode: 0.45, drift: 6e-6, albedo: [1.0, 0.8, 0.56] },
    jupiter: gas({ bands: 14 }), saturn: gas({ albedo: [0.9, 0.88, 0.82], stretch: 3.8, bands: 10, jet: 220 }),
    uranus: ice({ albedo: [0.82, 0.86, 0.88] }), neptune: ice({ cov: [0.4, 0.05, 0.42], jet: 320 }),
    // Iris (Proxima b): towering storms boil up over the warm ocean under its star, thinning toward the ice
    proxima_b: { base: 1200, top: 9500, flat: 4500, map: 'eyeball', cov: [0.22, 0.1, 0.72], scale: [17000, 56000, 3000], shape: [0.3, 0.18, 0.42], erode: 0.4, drift: 0, albedo: [1, 1, 1] },
    proxima_c: ice({ top: 26000 }), proxima_e: gas({ bands: 11 }),
    // Shroud (Tau Ceti h): a Venus-like deck, a little more amber
    tauceti_h: { base: 40000, top: 64000, map: 'deck', cov: [0.5, 0.0, 0.46], scale: [44000, 160000, 6500], stretch: 2.0, shape: [0.86, 0.3, 0.7], erode: 0.32, drift: 1.4e-5, albedo: [1.0, 0.78, 0.48] },
    // Adrian: deep storm bands of green and yellow cloud (in the novel the planet looks green from space)
    adrian: { base: 2200, top: 12000, flat: 5500, map: 'storms', cov: [0.4, 0.1, 0.5], scale: [23000, 72000, 3600], shape: [0.3, 0.18, 0.45], erode: 0.45, drift: 1e-5, albedo: [0.62, 0.95, 0.4], albedo2: [1.0, 0.9, 0.34], hueScale: 140000 },
    tauceti_i: gas({ bands: 13 }), tauceti_j: ice({}),
    barnard_g: gas({ bands: 10 }), barnard_h: ice({ jet: 300 }),
    // Lantern: Titan-like methane clouds
    lantern: { base: 12000, top: 24000, haze: true, map: 'sparse', cov: [0.28, 0.1, 0.6], scale: [18000, 64000, 3200], shape: [0.4, 0.2, 0.45], erode: 0.45, drift: 8e-6, albedo: [1.0, 0.76, 0.5] },
  };
  // derived values: the layer's optics scale with its thickness so thick decks look like big cumulus, not fog
  function profileOf(b) {
    const P = PROFILES[b.id]; if (!P) return null;
    if (!P.thick) {
      P.thick = P.top - P.base; P.sig = 42 / P.thick * (P.dens || 1); P.ls = P.thick * 0.023; P.powder = P.thick * 0.043;
      P.shell = Math.max(2500, P.thick * 0.35); P.stretch = P.stretch || 1; P.jetW = (P.jet || 0) / b.R;
    }
    return P;
  }

  // Generated cover maps (grey, equirectangular, matching SphereGeometry UVs)
  function coverCanvas(b, P, W) {
    const H = W / 2, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), img = g.createImageData(W, H), D = img.data;
    const s = (strHash(b.id) % 997) * 0.13, F = Noise.fbm;
    let sub = null;
    if (P.map === 'eyeball') sub = Bodies.toBF(b, Bodies.relPos(b, 0).negate(), 0).normalize();
    for (let y = 0; y < H; y++) {
      const th = Math.PI * (y + 0.5) / H, st = Math.sin(th), dy = Math.cos(th), lat = Math.PI / 2 - th, al = Math.abs(lat);
      for (let x = 0; x < W; x++) {
        const ph = 2 * Math.PI * (x + 0.5) / W, dx = -st * Math.cos(ph), dz = st * Math.sin(ph);
        let v;
        switch (P.map) {
          case 'storms': {
            // wet tropics and storm tracks near 60°, dry belts near 30°, swirled by a warped field
            const w = F(dx * 2 + s, dy * 2, dz * 2, 3, 2, 0.5);
            const n = F(dx * 4 + w * 1.6, dy * 4 + s, dz * 4 + w, 5, 2.1, 0.5);
            v = smooth(-0.12, 0.42, n + (Math.cos(lat * 6) * 0.5) * 0.35);
            break;
          }
          case 'eyeball': {
            const a = Math.acos(clamp(dx * sub.x + dy * sub.y + dz * sub.z, -1, 1)), conv = smooth(1.8, 0.2, a);
            const n = F(dx * 4 + s, dy * 4, dz * 4, 5, 2.1, 0.5) + F(dx * 11, dy * 11 + s, dz * 11, 2, 2, 0.5) * 0.3;
            v = smooth(-0.1, 0.4, n + conv * 0.55 - 0.28) * (0.2 + 0.8 * conv);
            break;
          }
          case 'deck': {
            // chevrons swept along the equator, as in ultraviolet images of Venus
            const w = F(dx * 3 + s, dy * 3, dz * 3, 4, 2, 0.5);
            const c = Math.sin(lat * 6 + w * 3 + al * 4) * 0.5 + 0.5;
            v = 0.45 + c * 0.3 + F(dx * 9, dy * 9 + s, dz * 9, 3, 2, 0.5) * 0.35;
            break;
          }
          case 'cirrus': {
            const n = F(dx * 3 + s, dy * 10, dz * 3, 4, 2.1, 0.55);
            v = smooth(0.0, 0.45, n) * (0.35 + 0.65 * smooth(0.7, 1.15, al));
            break;
          }
          default: { // sparse
            const n = F(dx * 5 + s, dy * 5, dz * 5, 4, 2, 0.5);
            v = smooth(-0.05, 0.4, n) * (0.5 + 0.5 * smooth(0.5, 1.1, al));
          }
        }
        const k = (x + y * W) * 4, q = Math.round(clamp(v, 0, 1) * 255);
        D[k] = D[k + 1] = D[k + 2] = q; D[k + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }
  function coverTex(b, P, W) {
    const key = '_cloud' + W;
    if (!b[key]) b[key] = coverCanvas(b, P, W); // kept: regenerating costs a few hundred ms
    const t = new THREE.CanvasTexture(b[key]); t.anisotropy = 4; return t;
  }

  function init(renderer, q) { quality = q; enabled = q !== 'low' && renderer.capabilities.isWebGL2 && !!THREE.Data3DTexture; }

  // Tileable "Perlin-Worley" noise: billowy cells (inverted Worley) blended with smooth value noise.
  function buildNoise(S) {
    const rnd = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    const grids = [4, 8, 16].map(F => { const a = new Float32Array(F * F * F * 3); for (let i = 0; i < a.length; i++) a[i] = rnd(); return { F, a }; });
    const vals = [4, 8, 16].map(F => { const a = new Float32Array(F * F * F); for (let i = 0; i < a.length; i++) a[i] = rnd(); return { F, a }; });
    const wrap = (i, F) => ((i % F) + F) % F;
    function worley(x, y, z, g) {
      const F = g.F, fx = x * F, fy = y * F, fz = z * F, ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
      let m = 9;
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const cx = ix + dx, cy = iy + dy, cz = iz + dz, k = (wrap(cx, F) + wrap(cy, F) * F + wrap(cz, F) * F * F) * 3;
        const px = cx + g.a[k] - fx, py = cy + g.a[k + 1] - fy, pz = cz + g.a[k + 2] - fz;
        const d = px * px + py * py + pz * pz; if (d < m) m = d;
      }
      return Math.min(1, Math.sqrt(m));
    }
    function value(x, y, z, g) {
      const F = g.F, fx = x * F, fy = y * F, fz = z * F, ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
      const tx = fx - ix, ty = fy - iy, tz = fz - iz, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), sz = tz * tz * (3 - 2 * tz);
      const at = (a, b, c) => g.a[wrap(a, F) + wrap(b, F) * F + wrap(c, F) * F * F];
      const l = (a, b, t) => a + (b - a) * t;
      return l(l(l(at(ix, iy, iz), at(ix + 1, iy, iz), sx), l(at(ix, iy + 1, iz), at(ix + 1, iy + 1, iz), sx), sy),
        l(l(at(ix, iy, iz + 1), at(ix + 1, iy, iz + 1), sx), l(at(ix, iy + 1, iz + 1), at(ix + 1, iy + 1, iz + 1), sx), sy), sz);
    }
    const f = new Float32Array(S * S * S);
    let lo = 1e9, hi = -1e9;
    for (let z = 0; z < S; z++) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S, v = (y + 0.5) / S, w = (z + 0.5) / S;
      const wn = 1 - (0.625 * worley(u, v, w, grids[0]) + 0.25 * worley(u, v, w, grids[1]) + 0.125 * worley(u, v, w, grids[2]));
      const pn = 0.55 * value(u, v, w, vals[0]) + 0.3 * value(u, v, w, vals[1]) + 0.15 * value(u, v, w, vals[2]);
      const n = wn * 0.62 + pn * 0.38;
      f[x + y * S + z * S * S] = n; if (n < lo) lo = n; if (n > hi) hi = n;
    }
    const data = new Uint8Array(S * S * S);
    for (let i = 0; i < f.length; i++) data[i] = Math.round(255 * (f[i] - lo) / (hi - lo));
    const t = new THREE.Data3DTexture(data, S, S, S);
    t.format = THREE.RedFormat; t.type = THREE.UnsignedByteType;
    // mipmapped, so distant clouds blur into their average instead of sparkling
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
    t.unpackAlignment = 1; t.needsUpdate = true;
    return t;
  }

  const VS = `varying vec3 vLocal; varying vec3 vWorld;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vLocal = position; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * w;
    #include <logdepthbuf_vertex>
    }`;
  const FS = (STEPS) => `
    #define STEPS ${STEPS}
    uniform highp sampler3D uNoise; uniform sampler2D uMap;
    uniform vec3 uCam; uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uAmbTop; uniform vec3 uAmbBot; uniform vec3 uWind;
    uniform float uCoverBias;
    uniform float uRp; uniform float uRb; uniform float uRt; uniform float uFadeN; uniform float uFadeF; uniform float uVol; uniform float uTime;
    uniform vec3 uCov; uniform vec3 uScale; uniform vec3 uShape; uniform vec3 uAlbedo; uniform vec3 uAlbedo2; uniform float uHueScale;
    uniform float uStretch; uniform float uErode; uniform float uSig; uniform float uLs; uniform float uPowder;
    uniform float uJet; uniform float uBands; uniform float uMapAlb; uniform float uSteps; uniform float uPxAng; uniform float uJit;
    // texture level for noise of tile size 1/sc seen with a footprint of fp metres (64 texels per tile)
    float lodFor(float fp, float sc){ return log2(max(fp * sc * 64.0, 1.0)); }
    varying vec3 vLocal; varying vec3 vWorld;
    #include <logdepthbuf_pars_fragment>
    vec2 sph(vec3 ro, vec3 rd, float r){ float b = dot(ro, rd); float c = dot(ro, ro) - r * r; float h = b * b - c; if (h < 0.0) return vec2(1e9, -1e9); h = sqrt(h); return vec2(-b - h, -b + h); }
    // rgb: cloud colour, a: cover
    vec4 cover(vec3 p){
      vec3 d = normalize(p);
      vec2 uv = vec2(fract(atan(d.z, -d.x) / 6.2831853), 1.0 - acos(clamp(d.y, -1.0, 1.0)) / 3.14159265);
      vec3 m = textureLod(uMap, uv, 0.0).rgb;
      float mx = max(m.r, max(m.g, m.b));
      float g = mix(m.g, mx, uMapAlb);
      // a base cover breaks even the cloudiest regions into separate cells, with a few puffs over clear areas
      float c = clamp(uCov.x + smoothstep(uCov.y, 1.0, g) * uCov.z + uCoverBias, 0.0, 1.0);
      // on a gas giant the clouds take the hue of the band they sit in, darker in the belts
      vec3 hue = mix(vec3(1.0), m / max(mx, 0.04), 0.9) * mix(0.5, 1.0, smoothstep(0.05, 0.55, mx));
      // worlds with two cloud colours drift between them over broad regions
      vec3 alb = uAlbedo;
      if (uHueScale > 0.0) alb = mix(uAlbedo, uAlbedo2, smoothstep(0.3, 0.7, textureLod(uNoise, p / uHueScale, 4.0).r));
      return vec4(alb * mix(vec3(1.0), hue, uMapAlb), c);
    }
    float dens(vec3 p, float hf, float c, bool detail, float fp){
      float top = mix(uShape.x, 1.0, c);
      float hg = smoothstep(0.0, uShape.y, hf) * (1.0 - smoothstep(top * uShape.z, top, hf));
      if (hg <= 0.0) return 0.0;
      vec3 q = p;
      if (uJet != 0.0) {
        // zonal jets: alternate bands of latitude slide east and west past each other
        float a = uJet * uTime * sin(p.y / length(p) * uBands);
        float cs = cos(a), sn = sin(a);
        q = vec3(p.x * cs - p.z * sn, p.y, p.x * sn + p.z * cs);
      }
      q.y *= uStretch;
      // big cells grouped into larger fields
      float n = textureLod(uNoise, q * uScale.x + uWind * uTime, lodFor(fp, uScale.x)).r;
      n = n * 0.6 + textureLod(uNoise, q * uScale.y - uWind * uTime * 0.5, lodFor(fp, uScale.y)).r * 0.4;
      float cc = c * hg;
      float d = clamp((n - (1.0 - cc)) / max(cc, 0.08), 0.0, 1.0);
      if (detail && d > 0.0) {
        float e = textureLod(uNoise, q * uScale.z + uWind * uTime * 2.0, lodFor(fp, uScale.z)).r;
        d = clamp(d - (1.0 - d) * e * uErode, 0.0, 1.0);
      }
      return d * cc;
    }
    float hgp(float mu, float g){ float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * mu, 1.5); }
    void main(){
      vec3 ro = uCam; vec3 rd = normalize(vLocal - uCam);
      vec2 tt = sph(ro, rd, uRt);
      if (tt.x > tt.y || tt.y < 0.0) discard;
      float t0 = max(tt.x, 0.0), t1 = tt.y;
      vec2 tb = sph(ro, rd, uRb);
      if (length(ro) < uRb) t0 = max(t0, tb.y);
      else if (tb.x < tb.y && tb.x > 0.0) t1 = min(t1, tb.x);
      vec2 tg = sph(ro, rd, uRp);
      if (tg.x < tg.y && tg.x > 0.0) t1 = min(t1, tg.x);
      t1 = min(t1, uFadeF);
      if (t1 <= t0) discard;
      float span = t1 - t0;
      // per-pixel step offset hides banding up close; from far away it only shows as grain, so it fades out
      float jit = mix(0.5, fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453), uJit);
      float mu = dot(rd, uSun);
      float ph = min(mix(hgp(mu, 0.7), hgp(mu, -0.2), 0.45), 5.0) * 0.75 + 0.25;
      float T = 1.0; vec3 L = vec3(0.0); float tHit = -1.0;
      float thick = uRt - uRb;
      for (int i = 0; i < STEPS; i++) {
        if (float(i) >= uSteps) break;
        float f0 = (float(i) + jit) / uSteps;
        float t = t0 + span * f0 * (0.45 + 0.55 * f0);
        float ds = span * (0.45 + 1.1 * f0) / uSteps;
        vec3 p = ro + rd * t;
        float hf = (length(p) - uRb) / thick;
        if (hf < 0.0 || hf > 1.0) continue;
        vec4 cv = cover(p);
        float c = cv.a;
        if (c < 0.01) continue;
        float fp = t * uPxAng; // size of a pixel at this distance (m)
        float d = dens(p, hf, c, true, fp);
        if (d < 0.004) continue;
        if (tHit < 0.0) tHit = t;
        float sig = d * uSig;
        // light: a few growing steps toward the star
        float od = 0.0; vec3 lp = p; float ls = uLs;
        for (int j = 0; j < 4; j++) {
          lp += uSun * ls; float lh = (length(lp) - uRb) / thick;
          if (lh > 1.0) break;
          od += dens(lp, lh, c, false, max(fp, ls * 0.5)) * ls; ls *= 2.0;
        }
        od *= uSig;
        float sunE = exp(-od) + 0.3 * exp(-od * 0.25);
        sunE *= 1.0 - 0.55 * exp(-sig * uPowder);
        float pd = dot(p, uSun);
        if (pd < 0.0 && length(p - pd * uSun) < uRp) sunE = 0.0;
        vec3 S = (uSunCol * sunE * ph + mix(uAmbBot, uAmbTop, hf) * (0.6 + 0.4 * hf)) * cv.rgb;
        float st = exp(-sig * ds);
        L += T * S * (1.0 - st);
        T *= st;
        if (T < 0.02) break;
      }
      if (tHit < 0.0) discard;
      float k = (1.0 - smoothstep(uFadeN, uFadeF, tHit)) * uVol;
      if (k <= 0.0) discard;
      gl_FragColor = vec4(L * k, (1.0 - T) * k);
      #if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
        float w = tHit * -(viewMatrix * vec4(normalize(vWorld), 0.0)).z;
        gl_FragDepthEXT = log2(1.0 + max(w, 0.0)) * logDepthBufFC * 0.5;
      #endif
    }`;

  // v: the planet's World.vis entry. map: the cover map (the flat layer's alpha, a generated map, or the
  // planet's own map); own: whether the volume owns that texture and should dispose of it.
  function attach(v, P, map, own) {
    if (!enabled || v.vol || !P || !map) return;
    if (!noiseTex) noiseTex = buildNoise(64);
    const b = v.b;
    // shared with the flat layer's shader so the two cross-fade over the same distance band
    v.fade = v.fade || { uVolOn: { value: 0 }, uFadeN: { value: 4e4 }, uFadeF: { value: 8e4 } };
    const sc = P.scale;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uNoise: { value: noiseTex }, uMap: { value: map },
        uCam: { value: new V3() }, uSun: { value: new V3(1, 0, 0) }, uSunCol: { value: new V3(1, 1, 1) }, uAmbTop: { value: new V3() }, uAmbBot: { value: new V3() },
        uWind: { value: new V3(1, 0.05, 0.4).multiplyScalar(14 / 15000 * (P.jet ? 0.3 : 1)) },
        uCoverBias: coverBias, uRp: { value: b.R }, uRb: { value: b.R + P.base }, uRt: { value: b.R + P.top }, uFadeN: v.fade.uFadeN, uFadeF: v.fade.uFadeF, uVol: { value: 0 }, uTime: { value: 0 },
        uCov: { value: new V3(...P.cov) }, uScale: { value: new V3(1 / sc[0], 1 / sc[1], 1 / sc[2]) }, uShape: { value: new V3(...P.shape) }, uAlbedo: { value: new V3(...P.albedo) }, uAlbedo2: { value: new V3(...(P.albedo2 || P.albedo)) }, uHueScale: { value: P.hueScale || 0 },
        uStretch: { value: P.stretch }, uErode: { value: P.erode }, uSig: { value: P.sig }, uLs: { value: P.ls }, uPowder: { value: P.powder },
        uJet: { value: P.jetW }, uBands: { value: P.bands || 1 }, uMapAlb: { value: P.map === 'surface' ? 1 : 0 }, uSteps: { value: 56 }, uPxAng: { value: 0.001 }, uJit: { value: 1 },
      },
      vertexShader: VS, fragmentShader: FS(quality === 'high' ? 56 : 40),
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      side: THREE.BackSide,
    });
    v.vol = new THREE.Mesh(new THREE.SphereGeometry(b.R + P.top + P.shell, 160, 80), mat);
    v.vol.renderOrder = 9; v.vol.frustumCulled = false; v.vol.visible = false;
    // seen from above a thin sky, the volume sits behind the atmosphere's haze (renderOrder 10), which tints
    // distant clouds; a thick haze, or the whole air column drawn over clouds seen from below, would bury
    // them, so there (and on gas giants) the volume draws over the haze instead
    P.overHaze = P.map === 'surface' || !!(b.atm && b.atm.tauM > 0.5);
    v.volP = P; v.volOwn = own ? map : null;
    v.spin.add(v.vol);
    if (!v.clouds) return;
    // the flat layer fades out where the volume takes over
    const fade = v.fade, m = v.clouds.material;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      Object.assign(sh.uniforms, fade);
      sh.fragmentShader = 'uniform float uVolOn; uniform float uFadeN; uniform float uFadeF;\n' + sh.fragmentShader.replace('#include <alphamap_fragment>',
        '#include <alphamap_fragment>\n diffuseColor.a = mix(diffuseColor.a, smoothstep(0.2, 1.0, diffuseColor.a) * 0.75, uVolOn);\n diffuseColor.a *= mix(1.0, smoothstep(uFadeN, uFadeF, length(vViewPosition)), uVolOn);');
    };
    m.needsUpdate = true;
  }
  function detach(v) {
    if (!v.vol) return;
    v.spin.remove(v.vol); v.vol.geometry.dispose(); v.vol.material.dispose();
    if (v.volOwn) v.volOwn.dispose();
    v.vol = null; v.volOwn = null; v.fade.uVolOn.value = 0;
  }

  // camPos: heliocentric camera position; t: game time
  function update(v, camPos, camera, t) {
    if (!v.vol) return;
    const b = v.b, vol = v.vol, P = v.volP;
    vol.rotation.y = v.clouds ? v.clouds.rotation.y : (P.drift || 0) * t;
    const rel = _p.copy(camPos).sub(b.pos), alt = rel.length() - b.R;
    // the volume stays on from the surface out into space and hands over to the flat layer (or the
    // planet's own map) gradually, as single cloud cells shrink to a few pixels on screen
    const pxAng = camera.fov * DEG / Math.max(300, window.innerHeight), foot = Math.max(alt, 1) * pxAng;
    // (the noise tile holds cells about an eighth of its size; below a couple of pixels they only shimmer)
    // Worlds whose own map already shows their cloud deck (Venus-like decks, gas giants) hand over sooner:
    // a deck of cells a few pixels wide reads as grain against that map.
    const deck = P.map === 'surface' || P.map === 'deck' || P.haze; // (under a thick haze clouds can't be seen from space at all)
    const k = deck ? smooth(4, 8, P.scale[0] / 8 / foot) : smooth(1, 2.5, P.scale[0] / 8 / foot);
    vol.visible = k > 0.001 && (!v.clouds || v.clouds.visible !== false);
    v.fade.uVolOn.value = vol.visible && v.clouds ? k : 0;
    if (!vol.visible) return;
    const u = vol.material.uniforms;
    u.uVol.value = k; u.uPxAng.value = pxAng; u.uJit.value = 1 - smooth(P.top * 3, b.R * 0.5, alt);
    // fine erosion detail only where it is bigger than a pixel (finer, it just sparkles)
    u.uErode.value = P.erode * smooth(1.2, 3.5, P.scale[2] / foot);
    // fewer, longer steps once rays only cross the layer from far above
    u.uSteps.value = Math.round(lerp(quality === 'high' ? 56 : 40, quality === 'high' ? 32 : 24, smooth(P.top * 2, b.R * 0.6, alt)));
    const N = Math.max(45000, P.thick * 4) + Math.max(0, alt) * 1.5;
    v.fade.uFadeN.value = N; v.fade.uFadeF.value = N * 1.8;
    vol.updateWorldMatrix(true, false);
    _m.copy(vol.matrixWorld).invert();
    u.uCam.value.copy(camera.getWorldPosition(_s)).applyMatrix4(_m);
    const sunW = Bodies.toStar(b, b.pos, _s);
    u.uSun.value.copy(sunW).transformDirection(_m);
    // sunlight reddens as it crosses more air near the horizon; nights are lit by a faint sky glow
    const up = rel.normalize(), el = up.dot(sunW);
    const air = 1 / Math.max(0.06, el + 0.12);
    const tau = b.atm ? b.atm.tauR : [0.05, 0.12, 0.3];
    const lit = smooth(-0.12, 0.06, el), I = 2.4 * lit;
    // the local star's colour, relative to the Sun's (so Earth's clouds stay white)
    const star = Bodies.starOf(b);
    _c.set(star.light || 0xfff4e6); const sr = _c.r, sg = _c.g, sb = _c.b; _c.set(0xfff4e6);
    u.uSunCol.value.set(Math.exp(-tau[0] * air * 1.4) * I * sr / _c.r, Math.exp(-tau[1] * air * 1.4) * I * sg / _c.g, Math.exp(-tau[2] * air * 1.4) * I * sb / _c.b);
    const day = smooth(-0.2, 0.2, el), sky = b.sky || (b.gas ? (_c.set(b.color), [_c.r * 0.8, _c.g * 0.8, _c.b * 0.8]) : [0.42, 0.62, 0.95]);
    u.uAmbTop.value.set(sky[0] * 0.5 * day + 0.012, sky[1] * 0.5 * day + 0.016, sky[2] * 0.5 * day + 0.03);
    u.uAmbBot.value.set(0.26 * 0.5 * day + 0.006, 0.27 * 0.5 * day + 0.008, 0.25 * 0.5 * day + 0.014);
    u.uTime.value = (performance.now() / 1000) % 20000;
    // inside the shell, draw its far side; from above, its near side
    const side = alt < P.top + P.shell - 300 ? THREE.BackSide : THREE.FrontSide;
    if (vol.material.side !== side) { vol.material.side = side; vol.material.needsUpdate = true; }
    vol.renderOrder = P.overHaze || alt < P.top ? 11 : 9;
  }
  return { init, attach, detach, update, profileOf, coverTex, get enabled() { return enabled; }, get cover() { return coverBias.value; }, set cover(x) { coverBias.value = x; } };
})();
