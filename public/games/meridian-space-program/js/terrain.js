'use strict';
// ---------- Planet maps (images + procedural), heights, and quadtree terrain ----------
// Continents and oceans for invented worlds: one noise field drives both the terrain height and the
// map colours, so coastlines in the texture line up with where the ground dips below sea level.
function continentNoise(b, x, y, z) {
  const s = strHash(b.id) % 97;
  return Noise.fbm(x * 1.6 + s, y * 1.6 + s * 0.3, z * 1.6, 6, 2.05, 0.52) + 0.25 * Noise.fbm(x * 5 + s, y * 5, z * 5 - s, 3, 2, 0.5);
}
const TexStore = (function () {
  const E = {};
  const SW = 1024, SH = 512;
  function entry(b) { return E[b.id] || (E[b.id] = { state: 'none', sampler: null, canvas: null, img: null, extra: {} }); }
  function loadImg(src) {
    return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'textures/' + src; });
  }
  function toSampler(source, w, h) {
    try {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.drawImage(source, 0, 0, w, h);
      return { w, h, data: g.getImageData(0, 0, w, h).data, canvas: c };
    } catch (e) { return null; }
  }
  // request map for a body; returns entry. cb(entry) when ready.
  function request(b, cb) {
    const e = entry(b);
    if (e.state === 'ready') { cb && cb(e); return e; }
    (e.waiters = e.waiters || []).push(cb);
    if (e.state !== 'none') return e;
    e.state = 'loading';
    const done = () => { e.state = 'ready'; (e.waiters || []).forEach(f => f && f(e)); e.waiters = []; };
    if (typeof b.tex === 'string') { // an image map; an object here is a style for a generated map
      loadImg(b.tex).then(im => {
        if (im) { e.img = im; e.sampler = toSampler(im, SW, SH); }
        if (!e.sampler) { genCanvas(b, 512, 256, (c) => { e.canvas = c; e.sampler = toSampler(c, 512, 256); e.fallback = true; done(); }); return; }
        if (b.id === 'earth') {
          Promise.all([loadImg('2k_earth_nightmap.jpg'), loadImg('2k_earth_clouds.jpg')]).then(([n, c]) => { e.extra.night = n; e.extra.clouds = c; e.extra.rough = earthRough(e.sampler); buildEarthMask(e); done(); });
        } else if (b.farTex) loadImg(b.farTex).then(im2 => { e.extra.far = im2; done(); });
        else if (b.rings && b.rings.tex) loadImg(b.rings.tex).then(im2 => { e.extra.ring = im2; done(); });
        else done();
      });
    } else {
      genCanvas(b, 1024, 512, (c) => { e.canvas = c; e.sampler = toSampler(c, 1024, 512); done(); });
    }
    return e;
  }
  function earthRough(s) {
    const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
    const g = c.getContext('2d'); const id = g.createImageData(s.w, s.h);
    for (let i = 0; i < s.w * s.h; i++) {
      const r = s.data[i * 4], gg = s.data[i * 4 + 1], bb = s.data[i * 4 + 2];
      const water = bb > r * 1.15 && bb > gg * 0.95 && r < 90;
      const v = water ? 90 : 245;
      id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255;
    }
    g.putImageData(id, 0, 0); return c;
  }
  function buildEarthMask(e) {
    const s = e.sampler, m = new Float32Array(s.w * s.h);
    for (let i = 0; i < s.w * s.h; i++) {
      const r = s.data[i * 4], g = s.data[i * 4 + 1], b = s.data[i * 4 + 2];
      m[i] = (b > r * 1.15 && b > g * 0.95 && r < 90) ? 0 : 1;
    }
    // blur twice for smooth coastlines
    const t = new Float32Array(m.length);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        let a = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) { const yy = clamp(y + dy, 0, s.h - 1); for (let dx = -1; dx <= 1; dx++) { a += m[yy * s.w + ((x + dx + s.w) % s.w)]; n++; } }
        t[y * s.w + x] = a / n;
      }
      m.set(t);
    }
    e.mask = m;
  }
  function sampleArr(arr, w, h, lat, lon, stride, ch) {
    let u = (lon + Math.PI) / (2 * Math.PI) * w - 0.5, v = (0.5 - lat / Math.PI) * h - 0.5;
    u = ((u % w) + w) % w; v = clamp(v, 0, h - 1.001);
    const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0, x1 = (x0 + 1) % w, y1 = Math.min(h - 1, y0 + 1);
    const i00 = (y0 * w + x0) * stride + ch, i10 = (y0 * w + x1) * stride + ch, i01 = (y1 * w + x0) * stride + ch, i11 = (y1 * w + x1) * stride + ch;
    return (arr[i00] * (1 - fx) + arr[i10] * fx) * (1 - fy) + (arr[i01] * (1 - fx) + arr[i11] * fx) * fy;
  }
  function color(b, lat, lon, out) {
    const e = E[b.id];
    if (!e || !e.sampler) { const c = new THREE.Color(b.color || '#888'); out[0] = c.r; out[1] = c.g; out[2] = c.b; return out; }
    const s = e.sampler;
    out[0] = sampleArr(s.data, s.w, s.h, lat, lon, 4, 0) / 255;
    out[1] = sampleArr(s.data, s.w, s.h, lat, lon, 4, 1) / 255;
    out[2] = sampleArr(s.data, s.w, s.h, lat, lon, 4, 2) / 255;
    return out;
  }
  function land(b, lat, lon) {
    const e = E[b.id];
    if (!e || !e.mask) return -1;
    return sampleArr(e.mask, e.sampler.w, e.sampler.h, lat, lon, 1, 0);
  }

  // ---------- procedural maps for worlds with no published map ----------
  function genCanvas(b, W, H, cb) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); const img = g.createImageData(W, H);
    const tx = b.tex || { base: hexToRgb(b.color), v: 0.08, cr: 0.4 };
    const seed = strHash(b.id) % 997;
    let y = 0;
    const d = new V3();
    const step = () => {
      const t0 = performance.now();
      while (y < H && performance.now() - t0 < 12) {
        const lat = (0.5 - (y + 0.5) / H) * Math.PI;
        for (let x = 0; x < W; x++) {
          const lon = ((x + 0.5) / W) * 2 * Math.PI - Math.PI;
          latLonToDir(lat, lon, d);
          const col = procColor(b, tx, d, lat, lon, seed);
          const i = (y * W + x) * 4;
          img.data[i] = clamp(col[0], 0, 1) * 255; img.data[i + 1] = clamp(col[1], 0, 1) * 255; img.data[i + 2] = clamp(col[2], 0, 1) * 255; img.data[i + 3] = 255;
        }
        y++;
      }
      if (y < H) setTimeout(step, 0); else { g.putImageData(img, 0, 0); cb(c); }
    };
    step();
  }
  function hexToRgb(h) { const c = new THREE.Color(h || '#888'); return [c.r, c.g, c.b]; }
  function angDist(lat1, lon1, lat2, lon2) { return Math.acos(clamp(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2), -1, 1)); }
  function procColor(b, tx, d, lat, lon, seed) {
    const x = d.x, y = d.y, z = d.z;
    const n1 = Noise.fbm(x * 3 + seed, y * 3, z * 3, 5, 2.1, 0.5);
    const n2 = Noise.fbm(x * 12, y * 12 + seed, z * 12, 3, 2.2, 0.5);
    let r, g, bl;
    const crater = (dens, sc) => Noise.craters(x * sc, y * sc, z * sc, seed + sc, dens);
    switch (tx.style) {
      case 'gas': {
        // latitude bands warped by turbulence, fine streaks, darker poles and an optional great storm
        const bands = tx.bands, n = tx.n || 8, turb = tx.turb || 0.8;
        const w = Noise.fbm(x * 2.5 + seed, y * 2.5, z * 2.5, 4, 2, 0.5) * turb * 0.1 + Noise.fbm(x * 9, y * 9 + seed, z * 9, 3, 2, 0.5) * turb * 0.035;
        const u = (Math.sin((lat + w) * n) * 0.5 + 0.5) * (bands.length - 1);
        const i0 = Math.min(bands.length - 2, Math.floor(u)), f = u - i0, c0 = bands[i0], c1 = bands[i0 + 1];
        r = lerp(c0[0], c1[0], f); g = lerp(c0[1], c1[1], f); bl = lerp(c0[2], c1[2], f);
        const st = Noise.fbm(x * 18, y * 70 + seed, z * 18, 3, 2, 0.5) * 0.06; r += st; g += st; bl += st;
        const pole = smooth(0.9, 1.45, Math.abs(lat)); r *= 1 - 0.3 * pole; g *= 1 - 0.3 * pole; bl *= 1 - 0.22 * pole;
        if (tx.spot) { const a = angDist(lat, lon, -0.38, 1.2); if (a < 0.24) { const k = smooth(0.24, 0.08, a) * (0.8 + 0.2 * Math.sin(a * 60 + Noise.fbm(x * 12, y * 12, z * 12, 2, 2, 0.5) * 4)); r = lerp(r, tx.spot[0], k); g = lerp(g, tx.spot[1], k); bl = lerp(bl, tx.spot[2], k); } }
        break;
      }
      case 'scorched': {
        // sun-blasted bare rock: dark basalt, pale dust streaks, fresh bright-rayed craters
        const base = tx.base || [0.35, 0.28, 0.24];
        r = base[0] + n1 * 0.09 + n2 * 0.03; g = base[1] + n1 * 0.08 + n2 * 0.03; bl = base[2] + n1 * 0.07 + n2 * 0.03;
        const dust = smooth(0.1, 0.45, Noise.fbm(x * 5 + 3, y * 5, z * 5, 4, 2, 0.5)); r = lerp(r, base[0] * 1.6, dust * 0.5); g = lerp(g, base[1] * 1.55, dust * 0.5); bl = lerp(bl, base[2] * 1.5, dust * 0.5);
        const c = crater(0.5, 9) * 0.08 + crater(0.6, 26) * 0.05; r += c; g += c; bl += c;
        break;
      }
      case 'lava': {
        // black crust split by glowing fissures, with molten lakes
        const base = tx.base || [0.2, 0.15, 0.13];
        r = base[0] + n1 * 0.05; g = base[1] + n1 * 0.04; bl = base[2] + n1 * 0.04;
        const crack = Noise.ridged(x * 7 + seed, y * 7, z * 7, 4), lake = Noise.fbm(x * 3, y * 3 + seed, z * 3, 4, 2, 0.5);
        const hot = Math.max(smooth(0.86, 0.95, crack), smooth(0.38, 0.5, lake));
        r = lerp(r, 1.0, hot); g = lerp(g, 0.42 + 0.25 * smooth(0.95, 1, crack), hot); bl = lerp(bl, 0.08, hot);
        const cool = smooth(0.25, 0.38, lake) * (1 - hot); r = lerp(r, 0.35, cool * 0.5); g = lerp(g, 0.12, cool * 0.5); bl = lerp(bl, 0.06, cool * 0.5);
        break;
      }
      case 'ice': {
        // blue-white ice sheets cut by dark fractures, wind-scoured patches and exposed rock
        r = 0.8 + n1 * 0.06; g = 0.86 + n1 * 0.05; bl = 0.92 + n1 * 0.04;
        const fr = smooth(0.9, 0.97, Noise.ridged(x * 8 + seed, y * 8, z * 8, 3)); r -= fr * 0.25; g -= fr * 0.18; bl -= fr * 0.08;
        const rock = smooth(0.32, 0.45, Noise.fbm(x * 4, y * 4 + seed, z * 4, 4, 2, 0.5)); r = lerp(r, 0.38, rock); g = lerp(g, 0.36, rock); bl = lerp(bl, 0.36, rock);
        const c = crater(0.25, 14) * 0.05; r += c; g += c; bl += c;
        break;
      }
      case 'venus': {
        // unbroken cloud deck: pale sulfur-yellow chevrons swept along the equator
        const w = Noise.fbm(x * 3 + seed, y * 3, z * 3, 5, 2, 0.5);
        const v = Math.sin(lat * 6 + w * 3 + Math.abs(lat) * 4) * 0.5 + 0.5;
        r = 0.86 + v * 0.06 + n2 * 0.04; g = 0.74 + v * 0.06 + n2 * 0.03; bl = 0.48 + v * 0.05;
        break;
      }
      case 'eyeball': {
        // tidally locked ocean world: open water under the star, everything else frozen
        if (!b._sub) { b._sub = Bodies.toBF(b, Bodies.relPos(b, 0).negate(), 0).normalize(); }
        const c = continentNoise(b, x, y, z) - (b.terrain ? b.terrain.sea || 0 : 0);
        const ang = Math.acos(clamp(d.dot(b._sub), -1, 1)), open = smooth(1.05, 0.85, ang + n1 * 0.12);
        if (c < 0) { const deep = smooth(0, -0.25, c); r = lerp(0.1, 0.03, deep); g = lerp(0.32, 0.14, deep); bl = lerp(0.42, 0.3, deep); }
        else { const hi = smooth(0.05, 0.35, c); r = lerp(0.4, 0.5, hi); g = lerp(0.36, 0.45, hi); bl = lerp(0.28, 0.4, hi); }
        const iceC = c < 0 ? [0.82, 0.88, 0.94] : [0.9, 0.92, 0.95];
        const night = smooth(1.8, 2.6, ang);
        r = lerp(iceC[0], r, open); g = lerp(iceC[1], g, open); bl = lerp(iceC[2], bl, open);
        r *= 1 - night * 0.25; g *= 1 - night * 0.2; bl *= 1 - night * 0.1;
        break;
      }
      case 'adrian': {
        // Adrian, from Project Hail Mary: its green comes from the clouds (see Clouds), not the ground.
        // Underneath: dark basalt and ochre highlands, wide grey-teal seas and polar ice.
        const c = continentNoise(b, x, y, z) - (b.terrain ? b.terrain.sea || 0 : 0);
        if (c < 0) { const deep = smooth(0, -0.3, c); r = lerp(0.16, 0.05, deep); g = lerp(0.26, 0.11, deep); bl = lerp(0.28, 0.16, deep); }
        else {
          const hi = smooth(0.05, 0.4, c), dust = smooth(-0.05, 0.3, Noise.fbm(x * 6 + 7, y * 6, z * 6, 4, 2, 0.5));
          r = lerp(0.3, 0.46, hi); g = lerp(0.27, 0.4, hi); bl = lerp(0.23, 0.33, hi);
          r = lerp(r, 0.55, dust * 0.5); g = lerp(g, 0.43, dust * 0.5); bl = lerp(bl, 0.27, dust * 0.5);
          r += n2 * 0.04; g += n2 * 0.04; bl += n2 * 0.03;
        }
        const pole = smooth(1.2, 1.45, Math.abs(lat) + n1 * 0.1); r = lerp(r, 0.8, pole); g = lerp(g, 0.84, pole); bl = lerp(bl, 0.82, pole);
        break;
      }
      case 'io': {
        // sulfur plains: pale yellow with soft orange, white SO2 frost and greenish-grey patches
        const p = Noise.fbm(x * 4, y * 4, z * 4 + 9, 6, 2.1, 0.55), q = Noise.fbm(x * 9 + 4, y * 9, z * 9, 4, 2, 0.5);
        r = 0.86; g = 0.79; bl = 0.46;
        const o = smooth(0.0, 0.35, p), w = smooth(-0.05, -0.35, p), gg = smooth(0.2, 0.45, q) * 0.5;
        r = lerp(r, 0.86, o); g = lerp(g, 0.56, o); bl = lerp(bl, 0.28, o);
        r = lerp(r, 0.95, w); g = lerp(g, 0.94, w); bl = lerp(bl, 0.82, w);
        r = lerp(r, 0.62, gg); g = lerp(g, 0.63, gg); bl = lerp(bl, 0.45, gg);
        r += n2 * 0.04; g += n2 * 0.04; bl += n2 * 0.03;
        // volcanic centres: small dark calderas, some with red plume rings
        const v = Noise.craters(x * 16, y * 16, z * 16, seed, 0.22);
        const dark = smooth(-0.55, -0.85, v), ring = smooth(-0.05, -0.25, v) * (1 - smooth(-0.35, -0.55, v));
        r = lerp(r, 0.72, ring * 0.6); g = lerp(g, 0.32, ring * 0.6); bl = lerp(bl, 0.18, ring * 0.6);
        r = lerp(r, 0.12, dark); g = lerp(g, 0.09, dark); bl = lerp(bl, 0.07, dark);
        const pol = smooth(0.9, 1.3, Math.abs(lat)); r = lerp(r, 0.58, pol * 0.6); g = lerp(g, 0.42, pol * 0.6); bl = lerp(bl, 0.3, pol * 0.6);
        break;
      }
      case 'europa': {
        // bright water ice crossed by reddish-brown lineae; darker, redder trailing hemisphere
        r = 0.9 + n2 * 0.03; g = 0.87 + n2 * 0.03; bl = 0.8 + n2 * 0.03;
        const trail = smooth(-0.2, 0.8, Math.cos(lon - Math.PI / 2) * Math.cos(lat)) * (0.5 + 0.5 * n1);
        r = lerp(r, 0.72, trail * 0.55); g = lerp(g, 0.6, trail * 0.55); bl = lerp(bl, 0.5, trail * 0.55);
        let line = 0;
        for (let k = 0; k < 3; k++) { const f = 3 + k * 4.5; const l = 1 - Math.abs(Noise.n3(x * f + k * 7, y * f, z * f - k * 3)); line = Math.max(line, smooth(0.965 - k * 0.006, 0.995, l) * (1 - k * 0.2)); }
        r = lerp(r, 0.6, line * 0.85); g = lerp(g, 0.4, line * 0.85); bl = lerp(bl, 0.3, line * 0.85);
        const chaos = smooth(0.3, 0.55, Noise.fbm(x * 5 + 5, y * 5, z * 5, 4, 2, 0.5)) * (0.6 + 0.4 * n2);
        r = lerp(r, 0.62, chaos * 0.45); g = lerp(g, 0.47, chaos * 0.45); bl = lerp(bl, 0.38, chaos * 0.45);
        break;
      }
      case 'ganymede': {
        // old dark terrain (Galileo Regio style) beside bright grooved terrain, frosty poles
        const regN = Noise.fbm(x * 2.2, y * 2.2, z * 2.2 + 4, 6, 2.1, 0.55);
        const reg = smooth(-0.15, 0.25, regN);
        const groove = 0.5 + 0.5 * Math.sin(x * 55 + y * 31 + Noise.fbm(x * 3, y * 3, z * 3, 3, 2, 0.5) * 16);
        const dk = [0.36, 0.32, 0.27], lt = [0.62 + groove * 0.05, 0.6 + groove * 0.05, 0.56 + groove * 0.04];
        r = lerp(dk[0], lt[0], reg) + n2 * 0.04; g = lerp(dk[1], lt[1], reg) + n2 * 0.04; bl = lerp(dk[2], lt[2], reg) + n2 * 0.035;
        const c = crater(0.3, 14), ray = smooth(0.1, 0.3, c); r += ray * 0.18; g += ray * 0.18; bl += ray * 0.19;
        const pol = smooth(0.9, 1.25, Math.abs(lat)); r = lerp(r, 0.78, pol * 0.6); g = lerp(g, 0.78, pol * 0.6); bl = lerp(bl, 0.8, pol * 0.6);
        break;
      }
      case 'titan': {
        r = 0.78 + n1 * 0.05; g = 0.55 + n1 * 0.05; bl = 0.25 + n1 * 0.03;
        const dune = smooth(0.6, 0.15, Math.abs(lat)) * smooth(-0.1, 0.25, Noise.fbm(x * 2, y * 2 + 1, z * 2, 3, 2, 0.5));
        r = lerp(r, 0.42, dune * 0.7); g = lerp(g, 0.28, dune * 0.7); bl = lerp(bl, 0.14, dune * 0.7);

        break;
      }
      case 'enceladus': {
        r = 0.93 + n2 * 0.04; g = 0.95 + n2 * 0.04; bl = 0.98;
        const c = crater(0.25, 10); if (lat > -0.5 && c < -0.3) { r -= 0.12; g -= 0.1; bl -= 0.06; }
        if (lat < -0.95) { const s = 0.5 + 0.5 * Math.sin(lon * 3 + x * 30 + Noise.fbm(x * 4, y * 4, z * 4, 2, 2, 0.5) * 3); if (s > 0.9) { r = 0.55; g = 0.72; bl = 0.88; } }
        break;
      }
      case 'iapetus': {
        const lead = Math.cos(lon + Math.PI / 2) * Math.cos(lat); // leading hemisphere centred at lon -90
        const dark = smooth(0.15, 0.45, lead + n1 * 0.15) * smooth(1.3, 0.9, Math.abs(lat));
        r = lerp(0.82, 0.16, dark) + n2 * 0.04; g = lerp(0.79, 0.12, dark) + n2 * 0.04; bl = lerp(0.74, 0.09, dark) + n2 * 0.03;
        const c = crater(0.5, 12); if (c < -0.4) { r *= 0.9; g *= 0.9; bl *= 0.9; }
        break;
      }
      case 'miranda': {
        const cell = Noise.fbm(x * 2, y * 2, z * 2 + 7, 2, 2, 0.5);
        const band = 0.5 + 0.5 * Math.sin(cell * 60);
        const reg = cell > 0.08 ? 1 : 0;
        r = 0.62 + n2 * 0.05 + reg * (band * 0.12 - 0.05); g = r - 0.01; bl = r - 0.02;
        break;
      }
      case 'triton': {
        const cell = Noise.craters(x * 30, y * 30, z * 30, seed, 0.9);
        r = 0.82 + n1 * 0.05 + cell * 0.04; g = 0.72 + n1 * 0.05 + cell * 0.04; bl = 0.68 + n1 * 0.04 + cell * 0.04;
        const cap = smooth(-0.15, -0.45, lat + Noise.fbm(x * 3, y * 3, z * 3, 3, 2, 0.5) * 0.25);
        r = lerp(r, 0.93, cap * 0.6); g = lerp(g, 0.87, cap * 0.6); bl = lerp(bl, 0.83, cap * 0.6);
        const streak = cap * smooth(0.9, 0.96, Noise.ridged(x * 18, y * 18, z * 18, 2)); r *= 1 - streak * 0.5; g *= 1 - streak * 0.52; bl *= 1 - streak * 0.54;
        break;
      }
      case 'pluto': {
        r = 0.72 + n1 * 0.08; g = 0.6 + n1 * 0.07; bl = 0.48 + n1 * 0.06;
        // Cthulhu: dark red equatorial band west of the heart
        const cth = smooth(0.45, 0.2, Math.abs(lat + 0.1)) * smooth(0.0, 0.4, Math.cos(lon - 100 * DEG));
        r = lerp(r, 0.32, cth); g = lerp(g, 0.16, cth); bl = lerp(bl, 0.1, cth);
        // the heart (Tombaugh Regio): western lobe Sputnik Planitia + eastern lobe
        const sp = sputnikF(lat, lon), east = smooth(0.38, 0.25, angDist(lat, lon, 2 * DEG, 212 * DEG - 2 * Math.PI));
        const heart = Math.max(sp, east * 0.85);
        r = lerp(r, 0.95, heart); g = lerp(g, 0.91, heart); bl = lerp(bl, 0.86, heart);
        if (sp > 0.5) { const cells = Noise.craters(x * 60, y * 60, z * 60, 5, 0.95); r += cells * 0.03; g += cells * 0.03; bl += cells * 0.03; }
        if (lat > 1.0) { r = lerp(r, 0.6, 0.4); g = lerp(g, 0.55, 0.4); bl = lerp(bl, 0.55, 0.4); }
        break;
      }
      case 'charon': {
        r = 0.6 + n1 * 0.06; g = 0.58 + n1 * 0.06; bl = 0.56 + n1 * 0.05;
        const m = smooth(1.05, 1.3, lat + n1 * 0.1); r = lerp(r, 0.45, m); g = lerp(g, 0.24, m); bl = lerp(bl, 0.17, m);
        const c = crater(0.45, 12); if (c > 0.2) { r += 0.08; g += 0.08; bl += 0.08; }
        break;
      }
      default: {
        const base = tx.base || [0.5, 0.5, 0.5];
        r = base[0] + n1 * (tx.v || 0.08) + n2 * 0.03; g = base[1] + n1 * (tx.v || 0.08) + n2 * 0.03; bl = base[2] + n1 * (tx.v || 0.08) + n2 * 0.03;
        const cr = tx.cr || 0.3;
        const c1 = crater(cr * 0.6, 7), c2 = crater(cr, 20);
        const sh = c1 * 0.08 + c2 * 0.05;
        r += sh; g += sh; bl += sh;
        if (tx.bright && c2 > 0.15) { r += 0.25; g += 0.25; bl += 0.25; }
        if (tx.herschel) { const a = angDist(lat, lon, 0, -112 * DEG); if (a < 0.4) { const q = a / 0.4; r += (q > 0.85 ? 0.08 : -0.06); g += (q > 0.85 ? 0.08 : -0.06); bl += (q > 0.85 ? 0.08 : -0.06); } }
        if (tx.wunda) { const a = angDist(lat, lon, -7.9 * DEG, -86.4 * DEG); if (a > 0.07 && a < 0.11) { r += 0.35; g += 0.34; bl += 0.32; } }
        if (tx.wisps && Math.cos(lon - Math.PI / 2) > 0.3 && Noise.ridged(x * 10, y * 10, z * 10, 2) > 0.9) { r += 0.2; g += 0.2; bl += 0.2; }
      }
    }
    // liquid lakes show dark from orbit, wherever the ground dips below the liquid level
    if (b.terrain && b.terrain.lakes && Terrain.height(b, d, 3000) < 0) { r = 0.07; g = 0.055; bl = 0.04; }
    return [r, g, bl];
  }
  function sputnikF(lat, lon) {
    // ellipse centred lat 20N, lon 178E; semi-axes ~20 deg (lat) x 15 deg (lon)
    let dl = lon - 178 * DEG; dl = Math.atan2(Math.sin(dl), Math.cos(dl));
    const q = Math.pow((lat - 20 * DEG) / (21 * DEG), 2) + Math.pow(dl * Math.cos(lat) / (15 * DEG), 2);
    return smooth(1.05, 0.85, q);
  }
  return { request, entry: b => E[b.id] || null, color, land, sputnikF, genCanvas };
})();

const Terrain = (function () {
  const tmp = new V3();
  const kscDir = latLonToDir(KSC.lat, KSC.lon);
  // ---------- height function (metres above the reference radius) ----------
  // Model the sea floor (instead of a flat sea) where a real water surface is drawn over it
  let seabed = false;
  function height(b, d, detail) {
    const t = b.terrain;
    if (!t) return 0;
    detail = detail || 1;
    const R = b.R, amp = t.amp, x = d.x, y = d.y, z = d.z;
    const seed = strHash(b.id) % 1000;
    let h = 0;
    if (t.earth) return earthH(b, d, detail);
    if (t.continents) {
      // invented ocean worlds: land rises from the same field the map is coloured with
      const c = continentNoise(b, x, y, z) - (t.sea || 0);
      h += c * amp * 1.6 + (c > 0 ? (Noise.ridged(x * 6, y * 6 + 2, z * 6, 3) - 0.4) * amp * 0.5 * smooth(0, 0.2, c) : 0);
    }
    if (amp > 0 && !t.continents) {
      h += Noise.fbm(x * 2.2 + 11, y * 2.2, z * 2.2, 4, 2.1, 0.5) * amp * 0.55;
      h += (Noise.ridged(x * 7, y * 7 + 3, z * 7, 3) - 0.45) * amp * 0.35 * (t.rough || 0.4);
    }
    const ll = (t.maria || t.ridge || t.dunes || t.sputnik || t.canyons) ? dirToLatLon(d) : null;
    if (t.maria && ll) { const br = texBright(b, ll.lat, ll.lon); const f = smooth(0.42, 0.3, br); h = lerp(h, -amp * 0.35 + h * 0.15, f); }
    if (t.canyons) {
      const c = Noise.ridged(x * 3 + 2, y * 3, z * 3, 3);
      h -= Math.pow(Math.max(0, c - 0.78) / 0.22, 2) * amp * 0.7;
      const a = angDistDir(d, 18.65 * DEG, -133.8 * DEG);
      if (a < 0.14) h += amp * 1.1 * Math.pow(1 - a / 0.14, 1.6);
    }
    if (t.volcanic) { const v = Noise.craters(x * 10, y * 10, z * 10, seed + 3, 0.25); h -= v * amp * 0.35; }
    if (t.lineae) { const l = Noise.ridged(x * 9, y * 9, z * 9, 2); h += smooth(0.88, 0.97, l) * amp * 0.5; }
    if (t.grooves) h += Math.sin(x * 60 + y * 40 + Noise.fbm(x * 3, y * 3, z * 3, 2, 2, 0.5) * 14) * amp * 0.06;
    if (t.dunes && ll) h += Math.sin(ll.lon * 160 + Noise.fbm(x * 4, y * 4, z * 4, 2, 2, 0.5) * 6) * amp * 0.12 * smooth(0.6, 0.1, Math.abs(ll.lat));
    if (t.ridge && ll) h += amp * 1.3 * Math.exp(-Math.pow(ll.lat / 0.035, 2)) * (0.6 + 0.4 * Noise.fbm(x * 6, y * 6, z * 6, 2, 2, 0.5));
    if (t.herschel) { const a = angDistDir(d, 0, -112 * DEG); if (a < 0.5) { const q = a / 0.33; h += q < 1 ? (q * q - 1) * amp * 1.6 + (q < 0.18 ? amp * 0.8 * (1 - q / 0.18) : 0) : Math.max(0, 0.4 * (1 - (q - 1) / 0.5)) * amp; } }
    if (t.cliffs) h += Math.floor(Noise.fbm(x * 3, y * 3, z * 3, 3, 2, 0.5) * 5) / 5 * amp * 0.6;
    if (t.cantaloupe) h += Noise.craters(x * 40, y * 40, z * 40, seed + 9, 0.9) * amp * 0.08;
    if (t.sputnik && ll) { const f = TexStore.sputnikF(ll.lat, ll.lon); h = lerp(h, -amp * 0.45 + Noise.craters(x * 80, y * 80, z * 80, 5, 0.95) * 15, f); }
    // craters across scales: only those larger than the requested detail
    if (t.cr > 0) {
      let s = 6;
      for (let i = 0; i < 7; i++, s *= 3) {
        if (R / s * 0.35 < detail * 2.5) break;
        h += Noise.craters(x * s, y * s, z * s, seed + i * 13, t.cr * (i < 1 ? 0.45 : 0.75)) * amp * (t.crAmp || 0.5) * Math.pow(6 / s, 0.72);
      }
    }
    if (b.shape) { const s = b.shape; h += R * (1 / Math.sqrt((x / s[0]) ** 2 + (y / s[2]) ** 2 + (z / s[1]) ** 2) - 1); }
    if (b.irregular) h += b.irregular * R * Noise.fbm(x * 1.3 + 3, y * 1.3, z * 1.3, 3, 2, 0.5);
    if (detail < 60 && amp > 0) h += Noise.fbm(x * R / 420, y * R / 420, z * R / 420, 3, 2, 0.5) * Math.min(amp * 0.03, 35);
    if (detail < 6) h += Noise.n3(x * R / 22, y * R / 22, z * R / 22) * 0.9;
    if (t.lakes) {
      // lakes and seas of liquid methane and ethane in polar basins (as on Titan); everywhere else is
      // lifted clear of the liquid level
      const lat = Math.asin(clamp(y, -1, 1)), polar = smooth(0.9, 1.2, Math.abs(lat));
      const basin = smooth(0.05, 0.45, Noise.fbm(x * 4 + 21, y * 4, z * 4 + 5, 4, 2.1, 0.5) + 0.25 * polar) * polar;
      h = h * 0.5 + amp * 0.6 - basin * amp * 2.2;
    }
    return h;
  }
  function angDistDir(d, lat, lon) { latLonToDir(lat, lon, tmp); return Math.acos(clamp(d.dot(tmp), -1, 1)); }
  function earthH(b, d, detail) {
    const x = d.x, y = d.y, z = d.z;
    const ang = Math.acos(clamp(d.dot(kscDir), -1, 1));
    const ll = dirToLatLon(d);
    const w = Noise.fbm(x * 40, y * 40, z * 40, 3, 2, 0.5) * 0.006;
    let mask = TexStore.land(b, ll.lat + w, ll.lon + w * 1.3);
    if (mask < 0) mask = smooth(-0.05, 0.1, Noise.fbm(x * 1.7, y * 1.7, z * 1.7, 4, 2, 0.5));
    mask = Math.max(mask, smooth(0.02, 0.008, ang));
    const coast = mask - 0.5;
    let h;
    if (coast > 0) {
      const m = Noise.ridged(x * 6, y * 6, z * 6, 4);
      const land = (0.06 + 0.94 * Math.pow(m, 2.4) * smooth(0.55, 0.95, mask)) * b.terrain.amp + Noise.fbm(x * 30, y * 30, z * 30, 3, 2, 0.5) * 90;
      h = smooth(0, 0.18, coast) * Math.max(land, 3) + 1;
      if (detail < 60) h += Noise.fbm(x * 1500, y * 1500, z * 1500, 3, 2, 0.5) * 12 * smooth(0, 0.2, coast);
      if (detail < 6) h += Noise.n3(x * 29000, y * 29000, z * 29000) * 0.4;
    } else h = -1800 * smooth(0, 0.25, -coast) - 3;
    // flat space-center plateau
    const f = smooth(0.0045, 0.0028, ang);
    h = lerp(h, KSC.alt, f);
    // sunk out of sight under the space center's flat grass disc (see kscDiscH)
    const Rk = b.R + KSC.alt;
    h -= KSC_SINK * smooth(KSC_DISC * 0.985 / Rk, KSC_DISC * 0.89 / Rk, ang);
    return h;
  }
  function texBright(b, lat, lon) { const c = TexStore.color(b, lat, lon, [0, 0, 0]); return (c[0] + c[1] + c[2]) / 3; }
  // The space center's grass is a flat disc laid on the curved plateau. If the terrain stayed right under it,
  // the two surfaces would come within centimetres and flicker (z-fighting), so the terrain is sunk 1.5 m
  // beneath the disc and physics stands on the disc itself.
  const KSC_DISC = 1500, KSC_SINK = 1.5;
  function kscDiscH(b, d) {
    const ang = Math.acos(clamp(d.dot(kscDir), -1, 1)), Rk = b.R + KSC.alt + 0.05;
    const s = Rk * Math.tan(ang);
    return s > KSC_DISC ? null : Math.sqrt(Rk * Rk + s * s) - b.R;
  }
  // launch pad deck: a raised concrete platform the physics treats as ground
  const pad = { dir: null, h: 0, ang: 0 };
  function setPad(bf, deck) { pad.dir = bf.clone().normalize(); pad.h = bf.length() + deck - Bodies.byId.earth.R; pad.ang = 44 / bf.length(); }
  function groundH(b, d, detail) {
    let h = height(b, d, detail);
    if (b.id === "earth") { const dh = kscDiscH(b, d); if (dh !== null) h = Math.max(h, dh); }
    if (b.id === "earth" && pad.dir && Math.acos(clamp(d.dot(pad.dir), -1, 1)) < pad.ang) h = Math.max(h, pad.h);
    return h;
  }
  // physics query: surface height and water flag at an inertial-relative position
  const _bf = new V3();
  function surface(b, rRel, t) {
    if (!b.solid) return { h: b.atm && b.atm.crush ? b.atm.crush : 0, water: false };
    Bodies.toBF(b, rRel, t, _bf).normalize();
    let h = groundH(b, _bf, 0.5);
    let water = false;
    if (b.ocean && h < 0) { h = 0; water = true; }
    return { h, water, dir: _bf };
  }

  // ---------- quadtree terrain ----------
  const FACES = [
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ].map(f => f.map(a => new V3(...a)));
  const N = 16;
  function faceDir(f, a, b, out) {
    const F = FACES[f];
    const ta = Math.tan(a * Math.PI / 4), tb = Math.tan(b * Math.PI / 4);
    return out.copy(F[0]).addScaledVector(F[1], ta).addScaledVector(F[2], tb).normalize();
  }
  let detailTex = null;
  function getDetailTex() {
    if (detailTex) return detailTex;
    const S = 256, c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d'); const id = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      // tileable: sample noise on a torus
      const a = x / S * Math.PI * 2, bb = y / S * Math.PI * 2;
      const v = Noise.fbm(Math.cos(a) * 2, Math.sin(a) * 2, Math.cos(bb) * 2 + Math.sin(bb) * 0.5, 5, 2.2, 0.55) * 0.5
        + Noise.fbm(Math.cos(a) * 6 + 3, Math.sin(a) * 6, Math.sin(bb) * 6 + Math.cos(bb) * 2, 3, 2, 0.5) * 0.35;
      const c2 = clamp(0.62 + v * 0.75, 0, 1) * 255;
      const i = (y * S + x) * 4; id.data[i] = c2; id.data[i + 1] = c2; id.data[i + 2] = c2; id.data[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    detailTex = new THREE.CanvasTexture(c); detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping; detailTex.anisotropy = 8;
    return detailTex;
  }
  function makeMaterial(b) {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: b.id === 'earth' ? 0.9 : 0.97, metalness: 0, map: getDetailTex() });
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 d1 = texture2D(map, vUv);
          vec4 d2 = texture2D(map, vUv * 0.071 + 0.31);
          vec4 d3 = texture2D(map, vUv * 0.0051 + 0.7);
          diffuseColor.rgb *= (d1.rgb * 0.55 + 0.55) * (d2.rgb * 0.7 + 0.45) * (d3.rgb * 0.6 + 0.55);
        #endif`);
    };
    return m;
  }
  const col = [0, 0, 0];
  function srgbToLin(c) { return Math.pow(c, 2.2); }
  function buildGeometry(b, f, a0, b0, s, center) {
    const R = b.R;
    const G = N + 3; // with border ring for normals
    const P = new Float64Array(G * G * 3);
    const H = new Float32Array(G * G);
    const D = new V3();
    const chunkM = R * s * Math.PI / 4;
    const detail = chunkM / N;
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      const a = a0 + (i - 1) / N * s, bb = b0 + (j - 1) / N * s;
      faceDir(f, a, bb, D);
      let h = height(b, D, detail);
      if (b.ocean && h < 0 && !(seabed && Water.has(b))) h = 0; // flat sea unless real water covers it
      const k = (j * G + i);
      H[k] = h;
      P[k * 3] = D.x * (R + h) - center.x; P[k * 3 + 1] = D.y * (R + h) - center.y; P[k * 3 + 2] = D.z * (R + h) - center.z;
    }
    const vcount = (N + 1) * (N + 1) + 4 * N;
    const pos = new Float32Array(vcount * 3), nor = new Float32Array(vcount * 3), cols = new Float32Array(vcount * 3), uvs = new Float32Array(vcount * 2);
    const tA = new V3(), tB = new V3(), nn = new V3(), dd = new V3();
    const uvScale = R * 0.785 / 24;
    const amp = (b.terrain && b.terrain.amp) || 500;
    let vi = 0;
    const grid = [];
    for (let j = 1; j <= N + 1; j++) for (let i = 1; i <= N + 1; i++) {
      const k = j * G + i;
      tA.set(P[(k + 1) * 3] - P[(k - 1) * 3], P[(k + 1) * 3 + 1] - P[(k - 1) * 3 + 1], P[(k + 1) * 3 + 2] - P[(k - 1) * 3 + 2]);
      tB.set(P[(k + G) * 3] - P[(k - G) * 3], P[(k + G) * 3 + 1] - P[(k - G) * 3 + 1], P[(k + G) * 3 + 2] - P[(k - G) * 3 + 2]);
      nn.crossVectors(tA, tB).normalize();
      pos[vi * 3] = P[k * 3]; pos[vi * 3 + 1] = P[k * 3 + 1]; pos[vi * 3 + 2] = P[k * 3 + 2];
      nor[vi * 3] = nn.x; nor[vi * 3 + 1] = nn.y; nor[vi * 3 + 2] = nn.z;
      // colour
      dd.set(P[k * 3] + center.x, P[k * 3 + 1] + center.y, P[k * 3 + 2] + center.z).normalize();
      const lat = Math.asin(clamp(dd.y, -1, 1)), lon = Math.atan2(-dd.z, dd.x);
      TexStore.color(b, lat, lon, col);
      let r = srgbToLin(col[0]), g = srgbToLin(col[1]), bl = srgbToLin(col[2]);
      const slope = 1 - clamp(nn.dot(dd), 0, 1);
      const hh = H[k];
      const varn = 0.88 + 0.24 * Noise.n3(dd.x * R / 900, dd.y * R / 900, dd.z * R / 900);
      if (b.id === 'earth') {
        if (hh <= 0.01 && b.ocean && !seabed) { r = 0.008; g = 0.03; bl = 0.08; }
        else if (hh < 0.5 && b.ocean) { const dpt = smooth(0, -260, hh); r = lerp(0.42, 0.012, dpt); g = lerp(0.38, 0.03, dpt); bl = lerp(0.26, 0.045, dpt); } // sand shelving into the deep
        else {
          const ang = Math.acos(clamp(dd.dot(kscDir), -1, 1));
          if (ang < 0.006) { const q = smooth(0.006, 0.004, ang); r = lerp(r, 0.05, q); g = lerp(g, 0.11, q); bl = lerp(bl, 0.03, q); }
          if (hh > 900 + Noise.n3(dd.x * 200, dd.y * 200, dd.z * 200) * 200 && Math.abs(lat) > 0.3) { const q = smooth(900, 1300, hh); r = lerp(r, 0.8, q); g = lerp(g, 0.82, q); bl = lerp(bl, 0.86, q); }
          if (slope > 0.25) { r = lerp(r, 0.12, 0.5); g = lerp(g, 0.1, 0.5); bl = lerp(bl, 0.08, 0.5); }
        }
      } else {
        const rock = smooth(0.18, 0.5, slope);
        r = lerp(r, r * 0.55, rock); g = lerp(g, g * 0.55, rock); bl = lerp(bl, bl * 0.58, rock);
        const hv = 0.9 + 0.2 * clamp(hh / amp, -1, 1);
        r *= hv; g *= hv; bl *= hv;
        if (b.ocean && seabed && hh < 0.5) { const dpt = smooth(0, -Math.max(60, amp * 0.6), hh); r = lerp(r * 0.8, r * 0.25, dpt); g = lerp(g * 0.8, g * 0.25, dpt); bl = lerp(bl * 0.8, bl * 0.3, dpt); } // the bed darkens with depth
      }
      cols[vi * 3] = r * varn; cols[vi * 3 + 1] = g * varn; cols[vi * 3 + 2] = bl * varn;
      const a = a0 + (i - 1) / N * s, bb = b0 + (j - 1) / N * s;
      uvs[vi * 2] = a * uvScale; uvs[vi * 2 + 1] = bb * uvScale;
      grid.push(vi);
      vi++;
    }
    const idx = [];
    const W = N + 1;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = j * W + i, bq = a + 1, c = a + W, dq = c + 1;
      idx.push(a, bq, c, bq, dq, c);
    }
    // skirts
    const skirt = chunkM * 0.04 + 5;
    const edge = [];
    for (let i = 0; i < N; i++) edge.push(i);                       // bottom row j=0
    for (let j = 0; j < N; j++) edge.push(j * W + N);               // right
    for (let i = N; i > 0; i--) edge.push(N * W + i);               // top
    for (let j = N; j > 0; j--) edge.push(j * W);                   // left
    const skStart = vi;
    for (const e of edge) {
      const x = pos[e * 3] + center.x, y = pos[e * 3 + 1] + center.y, z = pos[e * 3 + 2] + center.z;
      const l = Math.hypot(x, y, z);
      pos[vi * 3] = pos[e * 3] - x / l * skirt; pos[vi * 3 + 1] = pos[e * 3 + 1] - y / l * skirt; pos[vi * 3 + 2] = pos[e * 3 + 2] - z / l * skirt;
      nor[vi * 3] = nor[e * 3]; nor[vi * 3 + 1] = nor[e * 3 + 1]; nor[vi * 3 + 2] = nor[e * 3 + 2];
      cols[vi * 3] = cols[e * 3]; cols[vi * 3 + 1] = cols[e * 3 + 1]; cols[vi * 3 + 2] = cols[e * 3 + 2];
      uvs[vi * 2] = uvs[e * 2]; uvs[vi * 2 + 1] = uvs[e * 2 + 1];
      vi++;
    }
    const E = edge.length;
    for (let k = 0; k < E; k++) {
      const a = edge[k], bq = edge[(k + 1) % E], sa = skStart + k, sb = skStart + (k + 1) % E;
      idx.push(a, sa, bq, bq, sa, sb);
      idx.push(a, bq, sa, bq, sb, sa);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  }

  class QuadTerrain {
    constructor(body, quality) {
      this.b = body; this.q = quality;
      this.group = new THREE.Group();
      this.mat = makeMaterial(body);
      this.nodes = new Map();
      this.queue = [];
      this.visible = new Set();
      const leafTarget = quality === 'low' ? 6 : 3;
      this.maxL = clamp(Math.ceil(Math.log2(body.R * 2 * 0.785 / (N * leafTarget))), 2, 16);
      this.roots = [];
      for (let f = 0; f < 6; f++) { const n = this.node(f, 0, 0, 0); this.build(n); this.roots.push(n); }
    }
    node(f, L, i, j) {
      const key = f + ':' + L + ':' + i + ':' + j;
      let n = this.nodes.get(key);
      if (n) return n;
      const s = 2 / (1 << L), a0 = -1 + i * s, b0 = -1 + j * s;
      const c = faceDir(f, a0 + s / 2, b0 + s / 2, new V3());
      const hc = height(this.b, c, this.b.R * s / N);
      n = { key, f, L, i, j, a0, b0, s, dir: c.clone(), center: c.clone().multiplyScalar(this.b.R + Math.max(hc, this.b.ocean ? 0 : -1e9)), rad: this.b.R * s * 0.9, mesh: null, kids: null, used: 0, queued: false };
      this.nodes.set(key, n);
      return n;
    }
    build(n) {
      const geo = buildGeometry(this.b, n.f, n.a0, n.b0, n.s, n.center);
      const m = new THREE.Mesh(geo, this.mat);
      m.position.copy(n.center);
      m.visible = false; m.matrixAutoUpdate = true; m.receiveShadow = true;
      this.group.add(m);
      n.mesh = m; n.queued = false;
    }
    want(n, d) { if (!n.mesh && !n.queued) { n.queued = true; this.queue.push({ n, d }); } }
    update(camBF, now) {
      const R = this.b.R;
      const camR = camBF.length();
      const camDir = camBF.clone().divideScalar(camR);
      const alt = Math.max(1, camR - R);
      const horizon = Math.acos(clamp(R / (R + alt + this.b.maxTerrain), -1, 1)) + Math.acos(clamp(R / (R + this.b.maxTerrain + 100), -1, 1));
      const K = this.q === 'low' ? 1.7 : 2.3;
      const vis = new Set();
      const visit = (n) => {
        n.used = now;
        if (n.L >= 1) {
          const ang = Math.acos(clamp(camDir.dot(n.dir), -1, 1));
          if (ang - n.s * 0.8 > horizon) return;
        }
        const dist = camBF.distanceTo(n.center);
        const split = n.L < this.maxL && dist < n.rad * K;
        if (split) {
          if (!n.kids) n.kids = [0, 1, 2, 3].map(k => this.node(n.f, n.L + 1, n.i * 2 + (k & 1), n.j * 2 + (k >> 1)));
          let ready = true;
          for (const k of n.kids) { if (!k.mesh) { ready = false; this.want(k, camBF.distanceTo(k.center)); } }
          if (ready) { for (const k of n.kids) visit(k); return; }
        }
        if (n.mesh) vis.add(n); else this.want(n, dist);
      };
      for (const r of this.roots) visit(r);
      for (const n of this.visible) if (!vis.has(n) && n.mesh) n.mesh.visible = false;
      for (const n of vis) n.mesh.visible = true;
      this.visible = vis;
      // build queue
      this.queue.sort((a, b) => a.n.L - b.n.L || a.d - b.d);
      const budget = this.q === 'low' ? 3 : 6;
      const t0 = performance.now();
      let built = 0;
      while (this.queue.length && built < budget * 2 && (built < budget || performance.now() - t0 < 6)) {
        const { n } = this.queue.shift();
        if (n.mesh) continue;
        this.build(n); built++;
        if (performance.now() - t0 > 14) break;
      }
      // keep queue fresh
      if (this.queue.length > 200) { this.queue.forEach(q => q.n.queued = false); this.queue.length = 0; }
      // cleanup old meshes
      if (!this._lastClean || now - this._lastClean > 3) {
        this._lastClean = now;
        for (const [k, n] of this.nodes) {
          if (n.L > 0 && n.mesh && now - n.used > 8) { this.group.remove(n.mesh); n.mesh.geometry.dispose(); n.mesh = null; }
          if (n.L > 1 && !n.mesh && now - n.used > 15) { this.nodes.delete(k); }
        }
        for (const n of this.nodes.values()) if (n.kids && n.kids.some(k => !this.nodes.has(k.key))) n.kids = null;
      }
      return this.queue.length;
    }
    // 1 = solid; below that the surface blends over the far sphere while handing over to it
    setFade(f) {
      const m = this.mat, tr = f < 0.999;
      m.opacity = f; m.transparent = tr; m.depthWrite = true;
      this.group.visible = f > 0.001;
    }
    dispose() {
      for (const n of this.nodes.values()) if (n.mesh) { n.mesh.geometry.dispose(); }
      this.mat.dispose();
      if (this.group.parent) this.group.parent.remove(this.group);
    }
  }
  function setSeabed(x) { seabed = x; }
  return { setSeabed, kscAlt: KSC.alt, height, groundH, setPad, surface, texBright, inSputnik: (lat, lon) => TexStore.sputnikF(lat, lon) > 0.5, QuadTerrain, getDetailTex, kscDir };
})();
