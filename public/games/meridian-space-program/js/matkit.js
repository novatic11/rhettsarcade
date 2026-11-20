'use strict';
// ---------- Procedural PBR texture kit ----------
// Each surface is painted three times on canvases: colour, height (turned into a normal map so panel
// seams, rivets, tiles and weave catch the light) and roughness (grime, polish and wear).
const MatKit = (function () {
  const cache = {};
  let seed = 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function texOf(c, srgb, rep) {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  }
  // greyscale height canvas -> tangent-space normal map (OpenGL convention, canvas rows run down)
  function normalFrom(hc, strength) {
    const w = hc.width, h = hc.height;
    const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
    const out = canvas(w, h), og = out.getContext('2d'), img = og.createImageData(w, h), d = img.data;
    const H = (x, y) => src[((((y % h) + h) % h) * w + (((x % w) + w) % w)) * 4];
    const k = strength / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k;
      const il = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (y * w + x) * 4;
      d[i] = (-dx * il * 0.5 + 0.5) * 255; d[i + 1] = (dy * il * 0.5 + 0.5) * 255; d[i + 2] = (il * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
    og.putImageData(img, 0, 0);
    return out;
  }
  // spec: { w, h, color(g,w,h), height(g,w,h)?, rough(g,w,h)?, normal: strength, rep: [x,y] }
  // returns { map, normalMap?, roughnessMap? }, cached by key
  function make(key, spec) {
    if (cache[key]) return cache[key];
    seed = 1 + [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483646, 7);
    const w = spec.w || 512, h = spec.h || 512, out = {};
    if (spec.color) { const c = canvas(w, h); spec.color(c.getContext('2d'), w, h); out.map = texOf(c, true, spec.rep); }
    if (spec.height) { const c = canvas(w, h); const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); spec.height(g, w, h); out.normalMap = texOf(normalFrom(c, spec.normal || 2), false, spec.rep); }
    if (spec.rough) { const c = canvas(w, h); spec.rough(c.getContext('2d'), w, h); out.roughnessMap = texOf(c, false, spec.rep); }
    return (cache[key] = out);
  }
  // MeshStandardMaterial from a texture set plus overrides
  function mat(set, o) {
    const p = Object.assign({ color: 0xffffff, roughness: 1, metalness: 0 }, o || {});
    if (set.map && !('map' in p)) p.map = set.map;
    if (set.normalMap) { p.normalMap = set.normalMap; p.normalScale = p.normalScale || new THREE.Vector2(1, 1); }
    if (set.roughnessMap) p.roughnessMap = set.roughnessMap;
    if (World.env && p.envMap === undefined) { p.envMap = World.env; p.envMapIntensity = p.envMapIntensity != null ? p.envMapIntensity : (p.metalness > 0.5 ? 1 : 0.5); }
    return new THREE.MeshStandardMaterial(p);
  }

  // ----- drawing helpers -----
  const D = {
    rnd,
    fill(g, w, h, c) { g.fillStyle = c; g.fillRect(0, 0, w, h); },
    // fine speckle: n dots of random grey around base value v (0..255), alpha a
    speckle(g, w, h, n, v, spread, a, size) { for (let i = 0; i < n; i++) { const k = Math.round(v + (rnd() - 0.5) * spread); g.fillStyle = `rgba(${k},${k},${k},${a})`; g.fillRect(rnd() * w, rnd() * h, size || 1, size || 1); } },
    // tinted speckle for colour maps
    tint(g, w, h, n, rgb, spread, a, size) { for (let i = 0; i < n; i++) { const k = (rnd() - 0.5) * spread; g.fillStyle = `rgba(${Math.round(rgb[0] + k)},${Math.round(rgb[1] + k)},${Math.round(rgb[2] + k)},${a})`; const s = (size || 1) * (0.5 + rnd()); g.fillRect(rnd() * w, rnd() * h, s, s); } },
    // soft blotches (weathering, dirt, sun fading)
    blotch(g, w, h, n, rgba, rMin, rMax) { for (let i = 0; i < n; i++) { const x = rnd() * w, y = rnd() * h, r = rMin + rnd() * (rMax - rMin); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) g.fillRect(x - r + ox, y - r + oy, 2 * r, 2 * r); } },
    // vertical rain/exhaust streaks
    streaks(g, w, h, n, rgba, len) { for (let i = 0; i < n; i++) { const x = rnd() * w, y = rnd() * h, l = len * (0.4 + rnd()); const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, rgba); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, 1 + rnd() * 2, l); } },
    // engraved line in a height map (dark groove with a light lip)
    groove(g, x1, y1, x2, y2, wdt) { g.lineCap = 'butt'; g.strokeStyle = '#3a3a3a'; g.lineWidth = wdt; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.strokeStyle = 'rgba(200,200,200,0.5)'; g.lineWidth = Math.max(1, wdt * 0.4); g.beginPath(); g.moveTo(x1 + wdt * 0.6, y1 + wdt * 0.6); g.lineTo(x2 + wdt * 0.6, y2 + wdt * 0.6); g.stroke(); },
    // raised dome (rivet, bolt head) in a height map
    bump(g, x, y, r, hi) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hi || '#e0e0e0'); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); },
    // smooth value noise layer drawn as many soft blobs (height maps)
    lumps(g, w, h, n, rMin, rMax, a) { for (let i = 0; i < n; i++) { const x = rnd() * w, y = rnd() * h, r = rMin + rnd() * (rMax - rMin), up = rnd() < 0.5; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, up ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) g.fillRect(x - r + ox, y - r + oy, 2 * r, 2 * r); } },
  };
  return { make, mat, D, normalFrom };
})();
