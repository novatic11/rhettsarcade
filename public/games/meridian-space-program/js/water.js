'use strict';
// ---------- Seas and lakes ----------
// Near the surface of a world with liquid on it, a real water surface is laid over the terrain (whose
// sea floor is then modelled, not flattened): a disc of the sphere centred under the camera, dense in
// the middle and reaching to the horizon. Rolling waves move its vertices up close; finer ripples only
// bend the light. It is a physically based material, so the sky reflects in it, the Sun glints off it
// and it gets more mirror-like toward the horizon, and it is clear enough to see the shallows through.
// Floating things (splashed-down capsules, swimming astronauts) ride the same waves (see sample()).
const Water = (function () {
  // Wave positions are measured in body-fixed metres wrapped every P metres per axis, and every wave
  // repeats exactly over P, so waves stay precise and seamless anywhere on a planet.
  const P = 8192;
  // per world: deep and shallow colour (linear), wave height (m), roughness, how see-through
  const LIQ = {
    earth: { deep: [0.004, 0.03, 0.055], amp: 0.55, rough: 0.085, opacity: 0.82 },
    adrian: { deep: [0.01, 0.04, 0.04], amp: 0.75, rough: 0.09, opacity: 0.86 },
    proxima_b: { deep: [0.004, 0.022, 0.06], amp: 0.95, rough: 0.09, opacity: 0.85 },
    // liquid methane and ethane: dark, clear and nearly still (Titan's lakes are mirror-smooth)
    titan: { deep: [0.01, 0.007, 0.004], amp: 0.04, rough: 0.07, opacity: 0.97, env: 0.55, slow: 0.3 },
    lantern: { deep: [0.012, 0.008, 0.005], amp: 0.05, rough: 0.07, opacity: 0.97, env: 0.55, slow: 0.3 },
  };
  const has = (b) => !!(b && b.ocean && LIQ[b.id]);
  // wave sets as integer wave vectors (so each repeats over P), spread across directions and lengths
  const mk = (lens, seed) => {
    const r = mulberry(seed), out = [];
    for (const L of lens) {
      const d = new V3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), k = P / L;
      const m = new V3(Math.round(d.x * k), Math.round(d.y * k), Math.round(d.z * k));
      out.push({ k: m.multiplyScalar(2 * Math.PI / P), len: L });
    }
    return out;
  };
  const SWELL = mk([97, 71, 53, 37, 26, 18, 12, 8.5], 4021); // moves the surface
  const RIPPLE = mk([5.3, 3.4, 2.2, 1.4], 77); // only lights it
  const clock = () => (performance.now() / 1000) % 3600;
  // amplitude and angular speed of each wave for a world (deep water: w = sqrt(g k))
  function spectrum(b, set, scale) {
    const L = LIQ[b.id], slow = L.slow || 1;
    return set.map(w => { const k = w.k.length(); return { k: w.k, a: scale * Math.pow(w.len / set[0].len, 1.15), w: Math.sqrt(b.g * k) * slow }; });
  }

  let mesh = null, mat = null, body = null, capAng = 0, built = 0;
  const _m3 = new THREE.Matrix3(), _m4 = new THREE.Matrix4(), _q = new Q4(), _v = new V3(), _o = new V3();
  const U = {
    uTime: { value: 0 }, uR: { value: 1 }, uOrigin: { value: new V3() }, uRot: { value: new THREE.Matrix3() }, uBF2View: { value: new THREE.Matrix3() },
    uFadeR: { value: 3000 }, uFade: { value: 1 }, uSub: { value: new V3(1, 0, 0) }, uOpen: { value: 0 },
    uWk: { value: Array.from({ length: 8 }, () => new V3()) }, uWa: { value: new Array(8).fill(0) }, uWw: { value: new Array(8).fill(0) },
    uRk: { value: Array.from({ length: 4 }, () => new V3()) }, uRa: { value: new Array(4).fill(0) }, uRw: { value: new Array(4).fill(0) },
  };
  function makeMaterial() {
    const m = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.85, depthWrite: true });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      const decl = `uniform float uTime; uniform float uR; uniform vec3 uOrigin; uniform mat3 uRot; uniform mat3 uBF2View; uniform float uFadeR; uniform float uFade;
        uniform vec3 uSub; uniform float uOpen; uniform vec3 uWk[8]; uniform float uWa[8]; uniform float uWw[8]; uniform vec3 uRk[4]; uniform float uRa[4]; uniform float uRw[4];
        varying vec3 vWaterP; varying float vWaterD; varying vec3 vWaterN;\n`;
      sh.vertexShader = decl + sh.vertexShader
        .replace('#include <beginnormal_vertex>', `
          vec3 wl = position;
          vec3 nrmL = normalize(wl + vec3(0.0, uR, 0.0));
          vec3 pBF = uOrigin + uRot * wl;
          float fd = 1.0 - smoothstep(uFadeR * 0.35, uFadeR, length(wl.xz));
          float hgt = 0.0; vec3 gBF = vec3(0.0);
          for (int i = 0; i < 8; i++) { float ph = dot(uWk[i], pBF) - uWw[i] * uTime; hgt += uWa[i] * sin(ph); gBF += uWa[i] * cos(ph) * uWk[i]; }
          vec3 gL = transpose(uRot) * gBF * fd;
          vec3 objectNormal = normalize(nrmL - (gL - dot(gL, nrmL) * nrmL));
          vWaterP = pBF; vWaterD = length(wl); vWaterN = uRot * nrmL;
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3( tangent.xyz );
          #endif`)
        .replace('#include <begin_vertex>', `vec3 transformed = vec3(position) + nrmL * hgt * fd;`);
      sh.fragmentShader = decl + sh.fragmentShader
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          {
            float rf = 1.0 - smoothstep(40.0, 320.0, vWaterD);
            vec3 g2 = vec3(0.0);
            for (int i = 0; i < 4; i++) { float ph = dot(uRk[i], vWaterP) - uRw[i] * uTime; g2 += uRa[i] * cos(ph) * uRk[i]; }
            vec3 gv = uBF2View * g2 * rf;
            normal = normalize(normal - (gv - dot(gv, normal) * normal));
          }`)
        .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
          diffuseColor.a *= uFade;
          // a locked eyeball world: open water only under its star, ice beyond (the ice is in the terrain)
          if (uOpen > 0.0) diffuseColor.a *= smoothstep(cos(uOpen + 0.08), cos(uOpen - 0.08), dot(normalize(vWaterN), uSub));`);
    };
    return m;
  }
  // the disc of sphere under the camera: rings closer together near the middle, out to angle `ang`
  function buildCap(R, ang) {
    const RINGS = 70, SEG = 160, a0 = Math.min(4 / R, ang / 1000);
    const q = Math.pow(ang / a0, 1 / (RINGS - 1));
    const pos = [0, 0, 0], idx = [];
    for (let i = 0; i < RINGS; i++) {
      const th = a0 * Math.pow(q, i), st = Math.sin(th), ct = Math.cos(th);
      for (let j = 0; j < SEG; j++) { const ph = j / SEG * Math.PI * 2; pos.push(R * st * Math.cos(ph), R * ct - R, R * st * Math.sin(ph)); }
    }
    for (let j = 0; j < SEG; j++) idx.push(0, 1 + (j + 1) % SEG, 1 + j);
    for (let i = 0; i < RINGS - 1; i++) for (let j = 0; j < SEG; j++) {
      const a = 1 + i * SEG + j, b2 = 1 + i * SEG + (j + 1) % SEG, c = a + SEG, d = b2 + SEG;
      idx.push(a, b2, c, b2, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => i % 3 === 1 ? 1 : 0), 3));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new V3(), R * ang * 1.5 + 1000);
    return g;
  }

  // b: the body whose terrain is active (or null); spin: its body-fixed group; camBF: camera in body-fixed
  // coordinates; fade: how solid the near terrain is (0..1); camera: for the view-space ripples
  function update(b, spin, camBF, fade, camera, quality) {
    if (!has(b) || quality === 'low' || fade <= 0.001) { if (mesh) mesh.visible = false; return; }
    const L = LIQ[b.id], R = b.R, alt = camBF.length() - R;
    if (!mat) mat = makeMaterial();
    if (body !== b) {
      body = b;
      if (mesh && mesh.parent) mesh.parent.remove(mesh);
      if (!mesh) { mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.renderOrder = 4; mesh.frustumCulled = false; }
      spin.add(mesh); capAng = 0;
      mat.color.setRGB(...L.deep); mat.roughness = L.rough; mat.opacity = L.opacity; mat.envMap = World.env; mat.envMapIntensity = L.env || 1; mat.needsUpdate = true;
      const sw = spectrum(b, SWELL, L.amp / 2.2), rp = spectrum(b, RIPPLE, Math.max(0.02, L.amp * 0.05));
      sw.forEach((w, i) => { U.uWk.value[i].copy(w.k); U.uWa.value[i] = w.a; U.uWw.value[i] = w.w; });
      rp.forEach((w, i) => { U.uRk.value[i].copy(w.k); U.uRa.value[i] = w.a; U.uRw.value[i] = w.w; });
      U.uR.value = R;
      U.uOpen.value = b.tex && b.tex.style === 'eyeball' ? 0.95 : 0;
    }
    if (U.uOpen.value > 0) { if (!b._sub) b._sub = Bodies.toBF(b, Bodies.relPos(b, 0).negate(), 0).normalize(); U.uSub.value.copy(b._sub); }
    // reach the horizon, and rebuild the disc only when that changes a lot
    const want = clamp(Math.acos(clamp(R / (R + Math.max(alt, 50) + 3000), -1, 1)) * 1.15, 0.004, 1.3);
    if (!capAng || want > capAng * 1.12 || want < capAng * 0.7) { capAng = want; mesh.geometry.dispose(); mesh.geometry = buildCap(R, capAng); }
    mesh.visible = true;
    const up = _v.copy(camBF).normalize();
    mesh.quaternion.setFromUnitVectors(_o.set(0, 1, 0), up);
    mesh.position.copy(up).multiplyScalar(R);
    // wave coordinates of the disc's centre, wrapped exactly (in double precision) to the wave period
    const c = mesh.position, wrap = x => x - Math.floor(x / P) * P;
    U.uOrigin.value.set(wrap(c.x), wrap(c.y), wrap(c.z));
    U.uRot.value.setFromMatrix4(_m4.makeRotationFromQuaternion(mesh.quaternion));
    U.uFadeR.value = clamp(alt * 4 + 600, 600, 6000);
    U.uFade.value = fade;
    U.uTime.value = clock();
    mesh.updateMatrixWorld(true);
    // body-fixed directions to view space, for the ripple normals
    _m4.multiplyMatrices(camera.matrixWorldInverse, spin.matrixWorld);
    U.uBF2View.value.setFromMatrix4(_m4);
  }
  function hide() { if (mesh) mesh.visible = false; }

  // Wave height (m) and its slope at a body-fixed point, for things floating on the water
  const cache = {};
  function sample(b, bf, out) {
    out = out || { h: 0, g: new V3() };
    out.h = 0; out.g.set(0, 0, 0);
    if (!has(b)) return out;
    const L = LIQ[b.id], sw = cache[b.id] || (cache[b.id] = spectrum(b, SWELL, L.amp / 2.2)), t = clock();
    const wrap = x => x - Math.floor(x / P) * P, px = wrap(bf.x), py = wrap(bf.y), pz = wrap(bf.z);
    for (const w of sw) { const ph = w.k.x * px + w.k.y * py + w.k.z * pz - w.w * t; out.h += w.a * Math.sin(ph); out.g.addScaledVector(w.k, w.a * Math.cos(ph)); }
    return out;
  }
  return { update, hide, sample, has, LIQ };
})();
