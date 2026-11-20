'use strict';
// ---------- Procedural 3D models for parts ----------
// Every part is modelled after real hardware: regeneratively cooled engine bells with turbopumps and
// propellant ducts, tiled capsule back-shells with recessed windows, segmented solid boosters with aft
// skirts, stringer-ribbed tanks with cable raceways. Surfaces use colour + normal + roughness maps (MatKit).
const PartMesh = (function () {
  const M = {};
  const texCache = {};
  function canvasTex(w, h, draw, key) {
    if (key && texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (key) texCache[key] = t;
    return t;
  }
  function std(o) { return new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.55, metalness: 0.1, envMap: World.env || null, envMapIntensity: 0.5 }, o)); }

  // ---------- surface library ----------
  function paintSet(key, rgb, grime) {
    const D = MatKit.D;
    return MatKit.make('paint_' + key, {
      w: 256, h: 256, normal: 1.2,
      color: (g, w, h) => { D.fill(g, w, h, `rgb(${rgb})`); const c = rgb.split(',').map(Number); D.tint(g, w, h, 2500, c, 10, 0.25, 1); if (grime) D.blotch(g, w, h, 8, 'rgba(60,55,50,0.05)', 20, 70); },
      height: (g, w, h) => D.speckle(g, w, h, 5000, 128, 60, 0.35, 2),
      rough: (g, w, h) => { D.fill(g, w, h, 'rgb(150,150,150)'); D.blotch(g, w, h, 14, 'rgba(200,200,200,0.25)', 15, 60); },
    });
  }
  function initMats() {
    if (M.white) return;
    const D = MatKit.D, mk = MatKit.make, mat = MatKit.mat;
    // painted aluminium skin, a 1 m x 1 m patch: 50 cm panels, riveted seams, stringer ribs, faint rain streaks
    const hull = mk('hull', {
      w: 512, h: 512, normal: 3,
      color: (g, w, h) => {
        D.fill(g, w, h, '#ebebe6');
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const k = D.rnd() * 8 - 4; g.fillStyle = `rgba(${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${k > 0 ? 250 : 0},${Math.abs(k) / 100})`; g.fillRect(i * w / 2, j * h / 2, w / 2, h / 2); }
        D.tint(g, w, h, 6000, [232, 232, 226], 12, 0.25, 1.5);
        D.streaks(g, w, h, 50, 'rgba(95,90,82,0.06)', 220);
        D.blotch(g, w, h, 12, 'rgba(70,66,60,0.035)', 30, 110);
        g.fillStyle = 'rgba(60,60,60,0.28)'; for (const x of [0, w / 2]) g.fillRect(x, 0, 2, h); for (const y of [0, h / 2]) g.fillRect(0, y, w, 2);
        g.fillStyle = 'rgba(80,80,80,0.22)'; for (const x of [0, w / 2]) for (let y = 6; y < h; y += 14) { g.fillRect(x + 6, y, 2, 2); g.fillRect(x - 8, y, 2, 2); } for (const y of [0, h / 2]) for (let x = 6; x < w; x += 14) { g.fillRect(x, y + 6, 2, 2); g.fillRect(x, y - 8, 2, 2); }
      },
      height: (g, w, h) => {
        for (let x = 32; x < w; x += 64) { const gr = g.createLinearGradient(x - 8, 0, x + 8, 0); gr.addColorStop(0, 'rgba(128,128,128,0)'); gr.addColorStop(0.5, 'rgba(175,175,175,0.9)'); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.fillRect(x - 8, 0, 16, h); }
        for (const x of [0, w / 2, w]) D.groove(g, x, 0, x, h, 3); for (const y of [0, h / 2, h]) D.groove(g, 0, y, w, y, 3);
        for (const x of [0, w / 2]) for (let y = 6; y < h; y += 14) { D.bump(g, x + 7, y + 1, 3); D.bump(g, x - 7, y + 1, 3); }
        for (const y of [0, h / 2]) for (let x = 6; x < w; x += 14) { D.bump(g, x + 1, y + 7, 3); D.bump(g, x + 1, y - 7, 3); }
        D.speckle(g, w, h, 9000, 128, 40, 0.3, 2);
      },
      rough: (g, w, h) => { D.fill(g, w, h, 'rgb(128,128,128)'); D.blotch(g, w, h, 16, 'rgba(190,190,190,0.25)', 30, 120); D.streaks(g, w, h, 40, 'rgba(200,200,200,0.2)', 200); },
    });
    M.hull = mat(hull, { roughness: 0.95, metalness: 0.08, normalScale: new THREE.Vector2(0.8, 0.8) });
    M.white = mat(paintSet('white', '233,233,228', true), { roughness: 0.9, metalness: 0.06 });
    M.paint = M.white;
    M.offwhite = mat(paintSet('offwhite', '214,215,210', true), { roughness: 0.95, metalness: 0.06 });
    M.grey = mat(paintSet('grey', '150,156,162', true), { roughness: 0.8, metalness: 0.2 });
    M.dark = mat(paintSet('dark', '46,49,54', false), { roughness: 0.85, metalness: 0.4 });
    M.black = mat(paintSet('black', '22,23,24', false), { roughness: 1, metalness: 0.1 });
    M.frame = mat(paintSet('frame', '50,54,60', false), { roughness: 0.7, metalness: 0.65 });
    // brushed aluminium / stainless
    const brushed = mk('brushed', {
      w: 256, h: 256, normal: 0.8,
      color: (g, w, h) => { D.fill(g, w, h, '#c4c8cd'); for (let i = 0; i < 900; i++) { const v = 170 + D.rnd() * 60; g.fillStyle = `rgba(${v},${v + 2},${v + 6},0.25)`; g.fillRect(0, D.rnd() * h, w, 1); } },
      height: (g, w, h) => { for (let i = 0; i < 700; i++) { const v = 100 + D.rnd() * 56; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(0, D.rnd() * h, w, 1); } },
      rough: (g, w, h) => { D.fill(g, w, h, 'rgb(85,85,85)'); for (let i = 0; i < 500; i++) { const v = 60 + D.rnd() * 70; g.fillStyle = `rgba(${v},${v},${v},0.4)`; g.fillRect(0, D.rnd() * h, w, 1); } },
    });
    M.metal = mat(brushed, { roughness: 1, metalness: 0.95 });
    M.chrome = std({ color: 0xe4e7ea, roughness: 0.12, metalness: 1, envMapIntensity: 1.2 });
    M.copper = mat(brushed, { color: 0xd08a5a, roughness: 0.9, metalness: 1 });
    // crinkled multi-layer insulation (gold Kapton and silver)
    const mli = (key, base, lo, hi) => mk(key, {
      w: 512, h: 512, normal: 5,
      color: (g, w, h) => { D.fill(g, w, h, base); for (let i = 0; i < 1400; i++) { const k = D.rnd(); g.fillStyle = `rgba(${Math.round(lo[0] + (hi[0] - lo[0]) * k)},${Math.round(lo[1] + (hi[1] - lo[1]) * k)},${Math.round(lo[2] + (hi[2] - lo[2]) * k)},0.55)`; const x = D.rnd() * w, y = D.rnd() * h, s = 10 + D.rnd() * 40; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (D.rnd() - 0.5) * s, y + (D.rnd() - 0.5) * s); g.lineTo(x + (D.rnd() - 0.5) * s, y + (D.rnd() - 0.5) * s); g.fill(); } g.fillStyle = 'rgba(40,30,10,0.35)'; for (let x = 0; x < w; x += 128) g.fillRect(x, 0, 2, h); },
      height: (g, w, h) => { for (let i = 0; i < 1800; i++) { const v = Math.round(D.rnd() * 255); g.fillStyle = `rgba(${v},${v},${v},0.35)`; const x = D.rnd() * w, y = D.rnd() * h, s = 8 + D.rnd() * 36; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (D.rnd() - 0.5) * s, y + (D.rnd() - 0.5) * s); g.lineTo(x + (D.rnd() - 0.5) * s, y + (D.rnd() - 0.5) * s); g.fill(); } for (let x = 0; x < w; x += 128) D.groove(g, x, 0, x, h, 3); },
      rough: (g, w, h) => { D.fill(g, w, h, 'rgb(70,70,70)'); D.speckle(g, w, h, 3000, 90, 80, 0.4, 6); },
    });
    M.gold = mat(mli('mli_gold', '#c9972e', [150, 105, 30], [255, 214, 120]), { roughness: 1.6, metalness: 0.7, envMapIntensity: 1.1 });
    M.silver = mat(mli('mli_silver', '#b9bcc0', [130, 132, 138], [240, 242, 246]), { roughness: 1.6, metalness: 0.65, envMapIntensity: 1.1 });
    // quilted thermal blanket (engine heat shields)
    const quilt = mk('quilt', {
      w: 256, h: 256, normal: 4, rep: [3, 3],
      color: (g, w, h) => { D.fill(g, w, h, '#d6d2c6'); D.tint(g, w, h, 3000, [214, 210, 198], 18, 0.3, 2); g.strokeStyle = 'rgba(90,85,75,0.45)'; g.lineWidth = 1.5; for (let i = -w; i < 2 * w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); } D.blotch(g, w, h, 6, 'rgba(60,50,40,0.08)', 20, 60); },
      height: (g, w, h) => { for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { D.bump(g, x + 16, y, 15, '#d8d8d8'); D.bump(g, x, y + 16, 15, '#d8d8d8'); } },
      rough: (g, w, h) => D.fill(g, w, h, 'rgb(200,200,200)'),
    });
    M.blanket = mat(quilt, { roughness: 1, metalness: 0.25, side: THREE.DoubleSide });
    // spray-on foam insulation (popcorn texture)
    const foam = mk('sofi', {
      w: 512, h: 512, normal: 6,
      color: (g, w, h) => { D.fill(g, w, h, '#c8692b'); D.blotch(g, w, h, 30, 'rgba(150,70,25,0.18)', 30, 120); D.blotch(g, w, h, 20, 'rgba(230,140,70,0.15)', 20, 90); D.tint(g, w, h, 14000, [200, 106, 45], 40, 0.35, 2); g.fillStyle = 'rgba(80,40,15,0.25)'; for (let y = 0; y < h; y += 128) g.fillRect(0, y, w, 2); },
      height: (g, w, h) => { D.lumps(g, w, h, 900, 2, 7, 0.5); D.lumps(g, w, h, 60, 15, 40, 0.25); },
      rough: (g, w, h) => D.fill(g, w, h, 'rgb(235,235,235)'),
    });
    M.foam = mat(foam, { roughness: 1, metalness: 0 });
    // carbon-fibre weave (interstages, overwrapped pressure vessels)
    const carbon = mk('carbon', {
      w: 256, h: 256, normal: 2.5, rep: [6, 6],
      color: (g, w, h) => { D.fill(g, w, h, '#1a1b1d'); const s = 16; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { const a = ((x + y) / s) % 2 === 0; const gr = a ? g.createLinearGradient(x, y, x + s, y) : g.createLinearGradient(x, y, x, y + s); gr.addColorStop(0, '#26282c'); gr.addColorStop(0.5, '#5a5f66'); gr.addColorStop(1, '#26282c'); g.fillStyle = gr; g.fillRect(x + 0.5, y + 0.5, s - 1, s - 1); } },
      height: (g, w, h) => { const s = 16; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) D.bump(g, x + s / 2, y + s / 2, s * 0.6, '#c8c8c8'); },
      rough: (g, w, h) => D.fill(g, w, h, 'rgb(90,90,90)'),
    });
    M.carbon = mat(carbon, { roughness: 0.6, metalness: 0.2, envMapIntensity: 0.9 });
    // capsule back-shell: thermal tiles with soot washing up from the heat shield
    const tiles = mk('podtiles', {
      w: 1024, h: 512, normal: 3,
      color: (g, w, h) => {
        D.fill(g, w, h, '#6f7276');
        for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) { const v = 128 + D.rnd() * 26; g.fillStyle = `rgb(${v},${v + 2},${v + 5})`; g.fillRect(x + 1, y + 1, 15, 15); }
        D.tint(g, w, h, 20000, [170, 172, 176], 26, 0.2, 1.5);
        const gr = g.createLinearGradient(0, h, 0, h * 0.55); gr.addColorStop(0, 'rgba(38,30,24,0.75)'); gr.addColorStop(1, 'rgba(38,30,24,0)'); g.fillStyle = gr; g.fillRect(0, h * 0.55, w, h * 0.45);
        for (let i = 0; i < 140; i++) { const x = D.rnd() * w, l = h * (0.15 + D.rnd() * 0.35); const sg = g.createLinearGradient(0, h, 0, h - l); sg.addColorStop(0, 'rgba(30,24,20,0.35)'); sg.addColorStop(1, 'rgba(30,24,20,0)'); g.fillStyle = sg; g.fillRect(x, h - l, 2 + D.rnd() * 5, l); }
      },
      height: (g, w, h) => { for (let x = 0; x <= w; x += 16) D.groove(g, x, 0, x, h, 1.5); for (let y = 0; y <= h; y += 16) D.groove(g, 0, y, w, y, 1.5); D.speckle(g, w, h, 20000, 128, 50, 0.3, 2); },
      rough: (g, w, h) => { D.fill(g, w, h, 'rgb(175,175,175)'); g.fillStyle = 'rgba(240,240,240,0.6)'; for (let x = 0; x <= w; x += 16) g.fillRect(x - 1, 0, 2, h); for (let y = 0; y <= h; y += 16) g.fillRect(0, y - 1, w, 2); },
    });
    M.pod = mat(tiles, { roughness: 1, metalness: 0.35, envMapIntensity: 0.7 });
    // ablative heat shield: honeycomb-filled Avcoat, charred at the rim
    const avcoat = mk('avcoat', {
      w: 512, h: 512, normal: 3.5, rep: [5, 3],
      color: (g, w, h) => {
        D.fill(g, w, h, '#7b5a3b'); D.blotch(g, w, h, 30, 'rgba(40,25,15,0.25)', 20, 80); D.tint(g, w, h, 12000, [120, 88, 58], 30, 0.3, 2);
        g.strokeStyle = 'rgba(55,38,24,0.55)'; g.lineWidth = 1.5; const s = 12;
        for (let row = 0, y = 0; y < h + s; row++, y += s * 1.5) for (let x = (row % 2) * s * 0.866; x < w + s; x += s * 1.732) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * s, y + Math.sin(a) * s); } g.closePath(); g.stroke(); }
      },
      height: (g, w, h) => { g.strokeStyle = '#d0d0d0'; g.lineWidth = 2; const s = 12; for (let row = 0, y = 0; y < h + s; row++, y += s * 1.5) for (let x = (row % 2) * s * 0.866; x < w + s; x += s * 1.732) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * s, y + Math.sin(a) * s); } g.closePath(); g.stroke(); } D.lumps(g, w, h, 200, 4, 14, 0.25); },
      rough: (g, w, h) => D.fill(g, w, h, 'rgb(240,240,240)'),
    });
    M.shield = mat(avcoat, { roughness: 1, metalness: 0 });
    // regeneratively cooled nozzle: hundreds of brazed tubes, heat-tinted near the throat (v = 0)
    const regen = mk('regen', {
      w: 512, h: 256, normal: 5,
      color: (g, w, h) => {
        const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#7d5236'); gr.addColorStop(0.18, '#6a4c56'); gr.addColorStop(0.35, '#58565e'); gr.addColorStop(1, '#8e9196'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 4) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, 0, 1, h); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 2, 0, 1, h); }
        D.streaks(g, w, h, 60, 'rgba(40,30,25,0.12)', 120);
      },
      height: (g, w, h) => { for (let x = 0; x < w; x += 4) { const gr = g.createLinearGradient(x, 0, x + 4, 0); gr.addColorStop(0, '#606060'); gr.addColorStop(0.5, '#d0d0d0'); gr.addColorStop(1, '#606060'); g.fillStyle = gr; g.fillRect(x, 0, 4, h); } },
      rough: (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgb(150,150,150)'); gr.addColorStop(1, 'rgb(95,95,95)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
    });
    M.nozzle = mat(regen, { roughness: 1, metalness: 0.85, side: THREE.DoubleSide }); M.nozzle.name = 'nozzle';
    // radiatively cooled extension (niobium / carbon-carbon), dark with stiffener seams
    const ext = mk('nozext', {
      w: 256, h: 256, normal: 2,
      color: (g, w, h) => { D.fill(g, w, h, '#2c2b2b'); D.tint(g, w, h, 6000, [48, 46, 46], 16, 0.4, 2); const gr = g.createLinearGradient(0, h, 0, h * 0.6); gr.addColorStop(0, 'rgba(120,70,40,0.35)'); gr.addColorStop(1, 'rgba(120,70,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
      height: (g, w, h) => { for (let y = 0; y < h; y += 64) D.groove(g, 0, y, w, y, 3); D.speckle(g, w, h, 4000, 128, 40, 0.3, 2); },
      rough: (g, w, h) => D.fill(g, w, h, 'rgb(120,120,120)'),
    });
    M.nozzleExt = mat(ext, { roughness: 1, metalness: 0.75, side: THREE.DoubleSide }); M.nozzleExt.name = 'nozzle';
    M.nozzleIn = std({ color: 0x2e241f, roughness: 0.75, metalness: 0.5, side: THREE.BackSide }); M.nozzleIn.name = 'nozzleIn';
    // solid-motor exit cone: wrapped carbon-phenolic tape
    const abl = mk('ablative', {
      w: 256, h: 256, normal: 2.5,
      color: (g, w, h) => { D.fill(g, w, h, '#2b2420'); for (let y = 0; y < h; y += 6) { const v = 30 + D.rnd() * 18; g.fillStyle = `rgb(${v + 8},${v + 2},${v - 2})`; g.fillRect(0, y, w, 4); } D.tint(g, w, h, 4000, [60, 50, 44], 30, 0.3, 2); },
      height: (g, w, h) => { for (let y = 0; y < h; y += 6) { g.fillStyle = '#a0a0a0'; g.fillRect(0, y, w, 3); } },
      rough: (g, w, h) => D.fill(g, w, h, 'rgb(220,220,220)'),
    });
    M.ablative = mat(abl, { roughness: 1, metalness: 0.05 });
    // chamber: brushed steel with brazed jacket bands
    M.chamber = mat(brushed, { color: 0xb3a596, roughness: 0.85, metalness: 0.95 });
    // solar cells
    const solar = mk('solarcells', {
      w: 512, h: 256, normal: 2, rep: [1, 1],
      color: (g, w, h) => {
        D.fill(g, w, h, '#c9ccd2'); const cw = 32, ch = 32;
        for (let y = 0; y < h; y += ch) for (let x = 0; x < w; x += cw) { const gr = g.createLinearGradient(x, y, x + cw, y + ch); const v = D.rnd() * 10; gr.addColorStop(0, `rgb(${18 + v},${30 + v},${74 + v})`); gr.addColorStop(1, `rgb(${30 + v},${44 + v},${104 + v})`); g.fillStyle = gr; g.fillRect(x + 1.5, y + 1.5, cw - 3, ch - 3); g.fillStyle = 'rgba(200,205,215,0.35)'; for (let k = 4; k < ch - 2; k += 4) g.fillRect(x + 1.5, y + k, cw - 3, 0.6); g.fillStyle = 'rgba(210,214,222,0.8)'; g.fillRect(x + cw * 0.33, y + 1.5, 1, ch - 3); g.fillRect(x + cw * 0.66, y + 1.5, 1, ch - 3); }
      },
      height: (g, w, h) => { for (let x = 0; x <= w; x += 32) D.groove(g, x, 0, x, h, 2); for (let y = 0; y <= h; y += 32) D.groove(g, 0, y, w, y, 2); },
      rough: (g, w, h) => { D.fill(g, w, h, 'rgb(45,45,45)'); g.fillStyle = 'rgb(160,160,160)'; for (let x = 0; x <= w; x += 32) g.fillRect(x - 1, 0, 3, h); for (let y = 0; y <= h; y += 32) g.fillRect(0, y - 1, w, 3); },
    });
    M.solar = mat(solar, { roughness: 1, metalness: 0.35, envMapIntensity: 1.1 });
    M.solarBack = mat(paintSet('solarback', '206,208,204', false), { roughness: 0.9, metalness: 0.2 });
    // radiator panels with fluid channels
    const rad = mk('radpanel', {
      w: 128, h: 512, normal: 3,
      color: (g, w, h) => { D.fill(g, w, h, '#e6e8ea'); g.fillStyle = 'rgba(150,154,160,0.6)'; for (let x = 6; x < w; x += 16) g.fillRect(x, 0, 3, h); D.blotch(g, w, h, 6, 'rgba(90,90,90,0.05)', 20, 60); },
      height: (g, w, h) => { for (let x = 6; x < w; x += 16) { const gr = g.createLinearGradient(x - 2, 0, x + 5, 0); gr.addColorStop(0, '#808080'); gr.addColorStop(0.5, '#e0e0e0'); gr.addColorStop(1, '#808080'); g.fillStyle = gr; g.fillRect(x - 2, 0, 7, h); } },
      rough: (g, w, h) => D.fill(g, w, h, 'rgb(90,90,90)'),
    });
    M.radiator = mat(rad, { roughness: 1, metalness: 0.4, side: THREE.DoubleSide });
    // parachute nylon: alternating gores with a ripstop grid
    const nylon = mk('ripstop', {
      w: 512, h: 128, normal: 1.5,
      color: (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#efece4' : '#e2602a'; g.fillRect(i * w / 16, 0, w / 16, h); } g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 16; i++) g.fillRect(i * w / 16, 0, 2, h); },
      height: (g, w, h) => { g.fillStyle = '#a8a8a8'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 1, h); for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1); },
      rough: (g, w, h) => D.fill(g, w, h, 'rgb(210,210,210)'),
    });
    M.canopy = mat(nylon, { roughness: 1, metalness: 0, side: THREE.DoubleSide });
    M.chuteCover = mat(paintSet('chute', '214,92,40', false), { roughness: 0.85 });
    M.glass = std({ color: 0x0c1218, roughness: 0.04, metalness: 0.9, envMapIntensity: 1.6 });
    M.stripes = std({ color: 0xffffff, roughness: 0.6, map: canvasTex(256, 32, (g, w, h) => { g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c230'; for (let x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 16 + h, h); g.lineTo(x + h, h); g.fill(); } }, 'stripes') });
    M.rubber = std({ color: 0x1a1a1a, roughness: 0.95, metalness: 0 });
    M.ionGlow = new THREE.MeshBasicMaterial({ color: 0x5ab8ff });
    M.amGlow = new THREE.MeshBasicMaterial({ color: 0xff5ccf });
    M.line = new THREE.LineBasicMaterial({ color: 0x333333 });
  }

  // ---------- geometry helpers ----------
  // cylinder whose end caps get flat (planar) UVs instead of the default swirl
  function cyl(rt, rb, h, seg, mat, open) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, seg || 32, 1, !!open);
    if (!open) { const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) if (Math.abs(n.getY(i)) > 0.99) uv.setXY(i, p.getX(i) + 0.5, p.getZ(i) + 0.5); }
    return new THREE.Mesh(geo, mat);
  }
  function lathe(profile, mat, seg) { return new THREE.Mesh(new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(Math.max(0.0005, p[0]), p[1])), seg || 32), mat); }
  function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
  function sph(r, mat, s) { return new THREE.Mesh(new THREE.SphereGeometry(r, s || 24, Math.max(8, (s || 24) / 2)), mat); }
  function put(o, x, y, z) { o.position.set(x, y, z); return o; }
  // A band wrapped round a cylinder of radius r. It is open-ended, so it has no end caps to share a plane with
  // the body's ends, and it stands proud of the body by more than the body's polygon facets dip, so the two
  // surfaces never sit at the same depth (no z-fighting).
  function band(r, hgt, mat, y, seg) { const R = r + 0.004 + r * 0.008; return put(cyl(R, R, hgt, seg || 64, mat, true), 0, y || 0, 0); }
  function roundRectPath(P, w, h, rr) { rr = Math.min(rr, w / 2 - 1e-4, h / 2 - 1e-4); const x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2; P.moveTo(x0 + rr, y0); P.lineTo(x1 - rr, y0); P.absarc(x1 - rr, y0 + rr, rr, -Math.PI / 2, 0); P.lineTo(x1, y1 - rr); P.absarc(x1 - rr, y1 - rr, rr, 0, Math.PI / 2); P.lineTo(x0 + rr, y1); P.absarc(x0 + rr, y1 - rr, rr, Math.PI / 2, Math.PI); P.lineTo(x0, y0 + rr); P.absarc(x0 + rr, y0 + rr, rr, Math.PI, Math.PI * 1.5); return P; }
  function ring(r, t, mat, y, seg) { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, seg || 48), mat); m.rotation.x = Math.PI / 2; m.position.y = y || 0; return m; }
  // rounded box (extruded rounded rectangle), centred, depth along z
  const rbCache = {};
  function rbox(w, h, d, rr, mat) {
    const key = [w, h, d, rr].map(v => v.toFixed(3)).join();
    let geo = rbCache[key];
    if (!geo) {
      rr = Math.min(rr, w / 2 - 1e-4, h / 2 - 1e-4);
      const b = Math.min(rr * 0.6, d * 0.3);
      const s = new THREE.Shape(), x0 = -w / 2 + b, y0 = -h / 2 + b, x1 = w / 2 - b, y1 = h / 2 - b, r2 = Math.max(0.0005, rr - b);
      s.moveTo(x0 + r2, y0); s.lineTo(x1 - r2, y0); s.absarc(x1 - r2, y0 + r2, r2, -Math.PI / 2, 0); s.lineTo(x1, y1 - r2); s.absarc(x1 - r2, y1 - r2, r2, 0, Math.PI / 2);
      s.lineTo(x0 + r2, y1); s.absarc(x0 + r2, y1 - r2, r2, Math.PI / 2, Math.PI); s.lineTo(x0, y0 + r2); s.absarc(x0 + r2, y0 + r2, r2, Math.PI, Math.PI * 1.5);
      geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 4 });
      geo.translate(0, 0, -(d - 2 * b) / 2);
      // box-project UVs at 1 unit = 1 m so paint textures sit at a sensible scale
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + p.getZ(i), p.getY(i));
      rbCache[key] = geo;
    }
    return new THREE.Mesh(geo, mat);
  }
  // cylinder between two points
  function strut(a, b, rad, mat, seg) {
    const L = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, L, seg || 8), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  }
  // bent pipe through points
  function pipe(pts, rad, mat) {
    const c = new THREE.CatmullRomCurve3(pts.map(p => p.isVector3 ? p : new V3(p[0], p[1], p[2])), false, 'centripetal');
    return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(8, pts.length * 6), rad, 8, false), mat);
  }
  // tile the hull skin at a constant world scale (u around the circumference, v along the height)
  function hullUV(mesh, r, h) {
    const uv = mesh.geometry.attributes.uv;
    const around = Math.max(1, Math.round(r * 2 * Math.PI));
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * around, uv.getY(i) * h);
    return mesh;
  }
  // a lathe's v runs along the profile; rescale to metres so tiled skins keep their size
  function latheUV(mesh, r, len) { return hullUV(mesh, r, len); }
  // outward normal of a cone wall from (rb, yb) to (rt, yt) at azimuth t
  function coneNormal(rb, yb, rt, yt, t) { const n = new V3(Math.cos(t) * (yt - yb), rb - rt, Math.sin(t) * (yt - yb)); return n.normalize(); }
  // place an object on a surface point facing along n (object's +z = n)
  function face(o, p, n) { o.position.copy(p); o.lookAt(p.clone().add(n)); return o; }
  // the cable raceway that runs up every stage, lined up part to part
  const RACE = 2.35;
  function raceway(g, r, y0, y1, mat) {
    const w = 0.035 + r * 0.05, d = 0.02 + r * 0.025;
    const m = box(w, y1 - y0, d, mat || M.offwhite);
    m.position.set(Math.cos(RACE) * (r + d / 2), (y0 + y1) / 2, Math.sin(RACE) * (r + d / 2)); m.rotation.y = -RACE + Math.PI / 2;
    g.add(m);
  }
  // window: framed, recessed, reflective
  // window: a frame with a real opening; the glass sits 12 mm back inside it and 6 mm clear of the hull
  function windowAt(g, p, n, w, hgt) {
    const rr = Math.min(w, hgt) * 0.3;
    const s = roundRectPath(new THREE.Shape(), w + 0.04, hgt + 0.04, rr + 0.02); s.holes.push(roundRectPath(new THREE.Path(), w, hgt, rr));
    const fg = new THREE.ExtrudeGeometry(s, { depth: 0.026, bevelEnabled: false, curveSegments: 6 }); fg.translate(0, 0, -0.008);
    g.add(face(new THREE.Mesh(fg, M.frame), p, n));
    g.add(face(new THREE.Mesh(new THREE.ShapeGeometry(roundRectPath(new THREE.Shape(), w, hgt, rr), 6), M.glass), p.clone().addScaledVector(n, 0.006), n));
  }
  // RCS quad: four little bells on a rounded housing (x = outward)
  function rcsQuad(g, x, y, z, ang, s, housingMat) {
    const q = new THREE.Group(); q.position.set(x, y, z); q.rotation.y = ang;
    const hb = rbox(0.13 * s, 0.17 * s, 0.11 * s, 0.025 * s, housingMat || M.offwhite); hb.rotation.y = Math.PI / 2; hb.position.x = 0.045 * s; q.add(hb);
    const bell = [[0.004, 0], [0.012, -0.012], [0.024, -0.045]].map(p => [p[0] * s, p[1] * s]);
    for (const [dy, dz, rx, rz] of [[0.085, 0, 0, Math.PI], [-0.085, 0, 0, 0], [0, 0.065, -Math.PI / 2, 0], [0, -0.065, Math.PI / 2, 0]]) {
      const b = lathe(bell, M.dark, 12); b.position.set(0.05 * s, dy * s, dz * s); b.rotation.set(rx, 0, rz); q.add(b);
    }
    const n2 = lathe(bell, M.dark, 12); n2.position.set(0.1 * s, 0, 0); n2.rotation.z = Math.PI / 2; q.add(n2);
    g.add(q);
  }

  // ---- exhaust flame material ----
  const flameVS = `
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vUv = uv; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv;
    #include <logdepthbuf_vertex>
    }`;
  // Turbulent plume: white-hot core at the nozzle cooling to the fuel's colour, rolling noise,
  // and shock diamonds that only form in air (uAtm). HDR values feed the bloom pass.
  const flameFS = `
    uniform vec3 uCore; uniform vec3 uOuter; uniform float uTime; uniform float uI; uniform float uAtm;
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    #include <logdepthbuf_pars_fragment>
    float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vnoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
    void main(){
      #include <logdepthbuf_fragment>
      float along = 1.0 - vUv.y;
      float rim = abs(dot(normalize(vN), normalize(vV)));
      float n = vnoise(vec3(vUv.x * 7.0, along * 9.0 - uTime * 28.0, uTime * 2.0));
      float n2 = vnoise(vec3(vUv.x * 19.0, along * 24.0 - uTime * 47.0, 3.1));
      float body = pow(rim, 1.25) * pow(1.0 - along, 1.0 + 0.9 * (1.0 - uAtm)) * (0.7 + 0.6 * n);
      float core = pow(rim, 3.5) * pow(1.0 - along, 2.6);
      float dia = uAtm * smoothstep(0.55, 1.0, 0.5 + 0.5 * cos(along * 36.0)) * pow(1.0 - along, 1.5) * pow(rim, 2.0);
      vec3 col = uOuter * body * (0.8 + 0.4 * n2) + uCore * (core * 2.2 + dia * 1.8);
      float a = clamp(body + core, 0.0, 1.0);
      gl_FragColor = vec4(col * uI, a * uI);
    }`;
  const FLAME_COLORS = {
    LFO: [[1.0, 0.86, 0.55], [1.0, 0.45, 0.12]], SF: [[1.0, 0.9, 0.7], [1.0, 0.5, 0.15]], LH2: [[0.8, 0.9, 1.0], [0.4, 0.6, 1.0]],
    XE: [[0.6, 0.85, 1.0], [0.3, 0.45, 1.0]], DHE: [[1.0, 0.7, 1.0], [0.75, 0.3, 1.0]], AM: [[1.0, 0.95, 1.0], [0.85, 0.45, 1.0]], MP: [[1, 1, 1], [0.8, 0.8, 0.8]],
  };
  function flameMat(fuel) {
    const c = FLAME_COLORS[fuel] || FLAME_COLORS.LFO;
    return new THREE.ShaderMaterial({
      uniforms: { uCore: { value: new THREE.Color(...c[0]) }, uOuter: { value: new THREE.Color(...c[1]) }, uTime: { value: 0 }, uI: { value: 1 }, uAtm: { value: 1 } },
      vertexShader: flameVS, fragmentShader: flameFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
  }
  function addFlame(g, p, nozzleR, y, count) {
    const fuel = Object.keys(p.eng.fuel)[0];
    const mat = flameMat(fuel);
    const fl = new THREE.Group(); fl.name = 'flame'; fl.visible = false;
    const offs = count > 1 ? [[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]] : [[0, 0]];
    for (const o of offs) {
      // unit-length cone: top at 0 going down to -1
      const geo = new THREE.CylinderGeometry(nozzleR * 0.95, nozzleR * 1.6, 1, 24, 6, true); geo.translate(0, -0.5, 0);
      const m1 = new THREE.Mesh(geo, mat);
      const geo2 = new THREE.CylinderGeometry(nozzleR * 0.55, nozzleR * 0.25, 1, 16, 4, true); geo2.translate(0, -0.5, 0);
      const m2 = new THREE.Mesh(geo2, mat);
      const sub = new THREE.Group(); sub.add(m1, m2); sub.position.set(o[0] * (count > 1 ? p.r * 0.95 : 0), 0, o[1] * (count > 1 ? p.r * 0.95 : 0));
      fl.add(sub);
    }
    fl.position.y = y;
    fl.userData = { mat, base: nozzleR * (p.eng.vac ? 9 : 6) + 1.2, fuel };
    g.add(fl);
  }

  // ---------- liquid engine ----------
  // Bell contour: fast expansion just past the throat that straightens toward the exit (a Rao-style bell).
  function bellProf(throat, exit, L, n) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push([throat + (exit - throat) * (1 - Math.pow(1 - t, 1.85)), -t * L]); } return pts; }
  // One engine: injector/chamber, throat, bell (with a dark radiatively cooled extension on vacuum engines),
  // hat-band stiffeners, turbopump with its exhaust, propellant ducts and gimbal actuators.
  function liquidEngine(g, cx, cz, yTop, yThroat, yExit, throat, exit, vac, s, opts) {
    opts = opts || {};
    const e = new THREE.Group(); e.position.set(cx, 0, cz); g.add(e);
    const chR = throat * 1.75, cH = yTop - yThroat;
    // injector dome + combustion chamber converging to the throat
    e.add(put(lathe([[0.001, 0], [chR * 0.55, -cH * 0.02], [chR * 0.9, -cH * 0.12], [chR, -cH * 0.22], [chR, -cH * 0.62], [throat * 1.25, -cH * 0.9], [throat, -cH]], M.chamber, 28), 0, yTop, 0));
    e.add(ring(chR * 1.02, 0.006 + throat * 0.06, M.metal, yTop - cH * 0.3, 28));
    e.add(ring(chR * 1.02, 0.006 + throat * 0.06, M.metal, yTop - cH * 0.55, 28));
    // bell
    const L = yThroat - yExit;
    const prof = bellProf(throat, exit, L, 22);
    if (vac) {
      const k = 9; // regenerative section, then the dark extension
      const a = lathe(prof.slice(0, k + 1), M.nozzle, 40); a.position.y = yThroat; e.add(a);
      const b = lathe(prof.slice(k), M.nozzleExt, 40); b.position.y = yThroat; e.add(b);
      e.add(ring(prof[k][0] + 0.004, 0.008 + exit * 0.02, M.metal, yThroat + prof[k][1], 40));
    } else {
      const a = lathe(prof, M.nozzle, 40); a.position.y = yThroat; e.add(a);
      e.add(ring(exit + 0.004, 0.008 + exit * 0.035, M.chamber, yExit + 0.004, 40)); // exit manifold
    }
    const inner = lathe(prof.map(q => [q[0] * 0.965, q[1]]), M.nozzleIn, 40); inner.position.y = yThroat; e.add(inner);
    for (const t of vac ? [0.62, 0.82] : [0.3, 0.62]) { const i = Math.round(t * 22); e.add(ring(prof[i][0] + 0.003, 0.004 + exit * 0.015, M.frame, yThroat + prof[i][1], 40)); }
    if (opts.simple) return e;
    // turbopump beside the chamber, its exhaust duct running down past the bell
    const tpR = 0.02 + throat * 0.45, tpx = chR + tpR * 1.25;
    e.add(put(cyl(tpR, tpR, cH * 0.75, 16, M.chamber), tpx, yTop - cH * 0.42, tpR * 0.4));
    e.add(put(new THREE.Mesh(new THREE.TorusGeometry(tpR * 1.05, tpR * 0.35, 8, 20), M.metal), tpx, yTop - cH * 0.75, tpR * 0.4));
    e.add(put(sph(tpR * 0.9, M.chamber, 14), tpx, yTop - cH * 0.05, tpR * 0.4));
    const exY = yThroat - L * 0.55, exX = prof[12][0] + tpR * 0.9;
    e.add(pipe([[tpx, yTop - cH * 0.85, tpR * 0.4], [tpx + tpR * 0.3, yThroat - L * 0.1, tpR * 0.5], [exX, exY, tpR * 0.6]], tpR * 0.32, M.nozzleExt));
    e.add(put(lathe([[tpR * 0.32, 0], [tpR * 0.4, -tpR * 0.4], [tpR * 0.55, -tpR * 1.1]], M.nozzleExt, 12), exX, exY, tpR * 0.6));
    // propellant ducts from the tank interface down to the pump and the injector
    const dR = 0.012 + throat * 0.16;
    e.add(pipe([[-chR * 0.6, yTop + s * 0.22, chR * 0.9], [-chR * 1.15, yTop - cH * 0.1, chR * 0.6], [tpx * 0.2, yTop - cH * 0.6, chR * 1.1], [tpx, yTop - cH * 0.62, tpR * 1.2]], dR, M.metal));
    e.add(pipe([[tpx, yTop - cH * 0.3, -tpR * 0.6], [chR * 0.6, yTop + s * 0.05, -chR * 0.5], [0, yTop + s * 0.02, 0]], dR * 0.8, M.metal));
    // gimbal actuators
    for (const a of [0.6, 2.2]) e.add(strut(new V3(Math.cos(a) * chR * 2.1, yTop + s * 0.25, Math.sin(a) * chR * 2.1), new V3(Math.cos(a) * chR * 1.05, yTop - cH * 0.45, Math.sin(a) * chR * 1.05), 0.008 + throat * 0.07, M.chrome, 10));
    return e;
  }

  // ---------- interstellar drives ----------
  // Everything below the engine's mounting skirt (yMount) down to its base.
  function exoticEngine(g, p, yMount) {
    const h = p.h, r = p.r, yb = -h / 2, span = yMount - yb;
    switch (p.look) {
      case 'sail': {
        // drum holding the folded membrane; deployed: four carbon booms and a 16 m reflective square
        g.add(put(cyl(r * 0.8, r * 0.8, span * 0.7, 32, M.white), 0, yMount - span * 0.35, 0));
        g.add(band(r * 0.8, span * 0.1, M.frame, yMount - span * 0.1));
        g.add(put(cyl(r * 0.3, r * 0.4, span * 0.3, 24, M.metal), 0, yb + span * 0.15, 0));
        const st = new THREE.Group(); st.name = 'stowed'; st.add(put(cyl(r * 0.52, r * 0.52, span * 0.22, 24, M.silver), 0, yb + span * 0.11, 0)); g.add(st);
        const dep = new THREE.Group(); dep.name = 'deployed'; dep.visible = false;
        const S2 = 8, y = yb - 0.4;
        const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2 * S2, 2 * S2, 10, 10), std({ color: 0xe8ebef, metalness: 0.5, roughness: 0.32, side: THREE.DoubleSide, envMapIntensity: 1.2 }));
        const pa = sheet.geometry.attributes.position;
        for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getY(i); pa.setZ(i, -0.35 * (1 - (x * x + z * z) / (2 * S2 * S2))); }
        sheet.geometry.computeVertexNormals(); sheet.rotation.x = -Math.PI / 2; sheet.position.y = y; dep.add(sheet);
        for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) dep.add(strut(new V3(0, yb, 0), new V3(sx * S2, y + 0.05, sz * S2), 0.035, M.carbon, 6));
        g.add(dep);
        break;
      }
      case 'ramjet': {
        // fusion core and nozzle; the magnetic scoop is three superconducting hoops on a flared truss
        g.add(put(cyl(r * 0.45, r * 0.45, span * 0.5, 32, M.chamber), 0, yMount - span * 0.25, 0));
        const hoops = [[1.7, 0.08], [1.35, 0.22], [1.0, 0.36]];
        for (const [k, f] of hoops) g.add(put(new THREE.Mesh(new THREE.TorusGeometry(r * k, 0.08 + r * 0.03, 12, 72), M.copper).rotateX(Math.PI / 2), 0, yMount - span * f, 0));
        for (let i = 0; i < 6; i++) {
          const t = i / 6 * Math.PI * 2, at = (k, f) => new V3(Math.cos(t) * r * k, yMount - span * f, Math.sin(t) * r * k);
          g.add(strut(at(0.95, 0), at(1.7, 0.08), 0.05, M.frame));
          for (let j = 0; j < hoops.length - 1; j++) g.add(strut(at(...hoops[j]), at(...hoops[j + 1]), 0.04, M.frame));
          g.add(strut(at(1.0, 0.36), at(0.45, 0.5), 0.04, M.frame));
        }
        liquidEngine(g, 0, 0, yMount - span * 0.5, yMount - span * 0.58, yb, r * 0.25, r * 0.85, true, span * 0.3, { simple: true });
        addFlame(g, { eng: { fuel: { DHE: 1 }, vac: true }, r }, r * 0.8, yb + 0.02, 1);
        break;
      }
      case 'pulse': {
        // pellet injector feeding a huge open reaction hemisphere ringed with field coils
        g.add(put(cyl(r * 0.35, r * 0.45, span * 0.3, 24, M.chamber), 0, yMount - span * 0.15, 0));
        const Rb = r * 0.98, yTop = yMount - span * 0.28, Rd = yTop - yb;
        const bowl = []; for (let i = 0; i <= 18; i++) { const a = i / 18 * Math.PI / 2; bowl.push([Math.max(0.02, Math.sin(a) * Rb), yTop - Rd * (1 - Math.cos(a))]); }
        g.add(lathe(bowl, M.nozzle, 64)); g.add(lathe(bowl.map(q => [q[0] * 0.96, q[1] - 0.02]), M.nozzleIn, 64));
        for (const a of [0.45, 0.8, 1.2]) g.add(ring(Math.sin(a) * Rb + 0.06, 0.07 + r * 0.025, M.copper, yTop - Rd * (1 - Math.cos(a)), 64));
        for (let i = 0; i < 8; i++) { const t = (i + 0.5) / 8 * Math.PI * 2; g.add(strut(new V3(Math.cos(t) * r * 0.9, yMount, Math.sin(t) * r * 0.9), new V3(Math.cos(t) * Rb * 0.75, yTop - Rd * 0.3, Math.sin(t) * Rb * 0.75), 0.05, M.frame)); }
        addFlame(g, p, Rb * 0.9, yb + 0.02, 1);
        break;
      }
      case 'beamcore': {
        // annihilation chamber, then a magnetic nozzle: copper coils widening down a truss
        g.add(put(sph(r * 0.4, M.silver, 28), 0, yMount - span * 0.15, 0));
        const n = 6;
        for (let i = 0; i < n; i++) { const f = i / (n - 1); g.add(ring(r * (0.35 + 0.6 * f), 0.05 + r * 0.04, M.copper, yMount - span * (0.3 + 0.66 * f), 56)); }
        for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; g.add(strut(new V3(Math.cos(t) * r * 0.85, yMount, Math.sin(t) * r * 0.85), new V3(Math.cos(t) * r * 0.98, yb + 0.05, Math.sin(t) * r * 0.98), 0.035, M.frame)); g.add(strut(new V3(Math.cos(t) * r * 0.85, yMount, Math.sin(t) * r * 0.85), new V3(0, yMount - span * 0.15, 0), 0.03, M.frame)); }
        addFlame(g, p, r * 0.7, yb + 0.05, 1);
        break;
      }
      case 'photon': {
        // a gold parabolic gamma-ray mirror facing aft, the annihilation point glowing at its focus
        const Rm = r, depth = span * 0.55, yTop = yMount - span * 0.12;
        const prof = []; for (let i = 0; i <= 20; i++) { const x = Rm * i / 20; prof.push([Math.max(0.02, x), yTop - depth * (x / Rm) ** 2]); }
        g.add(lathe(prof, std({ color: 0xe8c070, metalness: 1, roughness: 0.12, side: THREE.DoubleSide, envMapIntensity: 1.4 }), 72));
        g.add(ring(Rm, 0.05 + r * 0.02, M.frame, yTop - depth, 72));
        const yF = yTop - Rm * Rm / (4 * depth);
        g.add(put(sph(r * 0.12, M.amGlow, 16), 0, yF, 0));
        for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2; g.add(strut(new V3(Math.cos(t) * Rm, yTop - depth, Math.sin(t) * Rm), new V3(0, yF, 0), 0.03, M.frame)); }
        g.add(put(cyl(r * 0.4, r * 0.5, span * 0.12, 24, M.chamber), 0, yMount - span * 0.06, 0));
        addFlame(g, p, Rm * 0.9, yTop - depth + 0.02, 1);
        break;
      }
    }
  }

  // ---------- parts ----------
  function buildPart(p, inst, opts) {
    initMats();
    const S = !!(opts && opts.seamless);
    const g = new THREE.Group();
    const h = p.h, r = p.r, rb = p.rb;
    switch (p.type) {
      case 'probe': {
        if (p.id === 'probe_pebble') {
          // spherical micro-probe: gold blanket body, aluminium belt, whip antennas, sun sensors
          g.add(sph(r * 0.93, M.gold, 32));
          g.add(ring(r * 0.94, 0.03, M.metal, 0, 40));
          for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2 + 0.4; const base = new V3(Math.cos(t) * r * 0.72, r * 0.55, Math.sin(t) * r * 0.72); g.add(strut(base, base.clone().add(new V3(Math.cos(t) * 0.4, 0.75, Math.sin(t) * 0.4)), 0.006, M.metal, 6)); g.add(put(sph(0.014, M.metal, 8), base.x, base.y, base.z)); }
          for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2; const b = face(rbox(0.09, 0.07, 0.05, 0.012, M.silver), new V3(Math.cos(t) * r * 0.9, -r * 0.2, Math.sin(t) * r * 0.9), new V3(Math.cos(t), -0.2, Math.sin(t)).normalize()); g.add(b); }
          g.add(put(cyl(r * 0.45, r * 0.55, 0.06, 24, M.frame), 0, -h / 2 + 0.03, 0));
        } else {
          // avionics bus: polygonal frame, gold blanket panels, boxes, star tracker and a status light
          const seg = p.id === 'probe_octo' ? 8 : p.id === 'probe_hex' ? 6 : 32;
          g.add(cyl(r * 0.96, r * 0.96, h * 0.72, seg, p.id === 'probe_ring' ? M.silver : M.gold));
          g.add(put(cyl(r, r, h * 0.13, Math.max(seg, 32), M.frame), 0, h * 0.43, 0));
          g.add(put(cyl(r, r, h * 0.13, Math.max(seg, 32), M.frame), 0, -h * 0.43, 0));
          for (let i = 0; i < seg; i++) { const t = (i + 0.5) / seg * Math.PI * 2; g.add(put(box(0.025, h * 0.72, 0.025, M.metal), Math.cos(t) * r * 0.965, 0, Math.sin(t) * r * 0.965)); }
          const nb = seg >= 8 ? 4 : 3;
          for (let i = 0; i < nb; i++) { const t = (i / nb) * Math.PI * 2 + 0.3; const bw = Math.min(0.22, r * 0.5); const b = rbox(bw, h * 0.42, 0.06, 0.012, i % 2 ? M.offwhite : M.dark); face(b, new V3(Math.cos(t) * (r * 0.96 + 0.03), 0, Math.sin(t) * (r * 0.96 + 0.03)), new V3(Math.cos(t), 0, Math.sin(t))); g.add(b); }
          const st = new THREE.Group(); st.position.set(r * 0.55, h * 0.5, -r * 0.35); st.rotation.z = -0.5;
          st.add(cyl(0.035, 0.035, 0.07, 14, M.dark)); st.add(put(cyl(0.06, 0.04, 0.07, 14, M.black, true), 0, 0.065, 0)); g.add(st);
          const l = put(sph(0.022, new THREE.MeshBasicMaterial({ color: 0x55ff99 }), 8), -r * 0.6, h * 0.5 + 0.01, r * 0.2); l.name = 'statusLight'; g.add(l);
        }
        break;
      }
      case 'pod': case 'cabin': {
        if (p.id === 'pod_mk1' || p.id === 'pod_triad') {
          // Capsule: blunt cone with a rounded heat-shield shoulder, tiled back-shell, recessed windows,
          // RCS thruster ports, side hatch with handrails, forward bay cover and docking tunnel.
          const s = rb / 0.625;
          const yb = -h / 2, yt = h / 2 - 0.1 * s, shoulder = 0.06 * s;
          const prof = [[0.001, yb], [rb * 0.9, yb], [rb - shoulder * 0.3, yb + shoulder * 0.25], [rb, yb + shoulder * 0.7], [rb * 0.995, yb + shoulder * 1.2]];
          const cone0 = prof[prof.length - 1];
          prof.push([r * 1.02, yt - 0.03 * s], [r * 0.97, yt], [r * 0.8, yt + 0.005], [0.001, yt + 0.005]);
          const body = lathe(prof, M.pod, 64); g.add(body);
          const tunnelR = r * 0.62;
          g.add(put(cyl(tunnelR, tunnelR * 1.05, 0.1 * s, 40, M.pod), 0, yt + 0.05 * s, 0));
          g.add(ring(tunnelR * 1.02, 0.012 * s, M.metal, yt + 0.1 * s, 40));
          for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; g.add(put(box(0.02 * s, 0.03 * s, 0.03 * s, M.frame), Math.cos(t) * tunnelR * 1.03, yt + 0.09 * s, Math.sin(t) * tunnelR * 1.03)); }
          // windows: rounded trapezoids facing out of the cone wall
          const nw = p.crew === 1 ? 2 : 4, yWin = yb + (yt - yb) * 0.6;
          const radAt = y => cone0[0] + (r - cone0[0]) * (y - cone0[1]) / (yt - cone0[1]);
          for (let i = 0; i < nw; i++) {
            const t = Math.PI / 2 + (i - (nw - 1) / 2) * (p.crew === 1 ? 0.5 : 0.42);
            const n = coneNormal(cone0[0], cone0[1], r, yt, t), rr = radAt(yWin);
            windowAt(g, new V3(Math.cos(t) * rr, yWin, Math.sin(t) * rr).addScaledVector(n, 0.004), n, 0.13 * s, 0.15 * s);
          }
          // side hatch with handrails
          const ht = -Math.PI / 2, yH = yb + (yt - yb) * 0.42, nH = coneNormal(cone0[0], cone0[1], r, yt, ht), rH = radAt(yH);
          const hp = new V3(Math.cos(ht) * rH, yH, Math.sin(ht) * rH);
          g.add(face(rbox(0.36 * s, 0.42 * s, 0.018, 0.05 * s, M.grey), hp.clone().addScaledVector(nH, 0.004), nH));
          g.add(face(rbox(0.1 * s, 0.1 * s, 0.02, 0.03 * s, M.glass), hp.clone().addScaledVector(nH, 0.012).add(new V3(0, 0.08 * s, 0)), nH));
          for (const dx of [-0.21, 0.21]) { const a = hp.clone().add(new V3(dx * s, -0.12 * s, 0)).addScaledVector(nH, 0.03), b = hp.clone().add(new V3(dx * s, 0.12 * s, 0)).addScaledVector(nH, 0.03); g.add(strut(a, b, 0.008 * s, M.chrome, 6)); }
          // RCS thruster ports in pairs around the shell
          for (let i = 0; i < 6; i++) {
            const t = i / 6 * Math.PI * 2 + 0.26, yR = yb + (yt - yb) * 0.78, n = coneNormal(cone0[0], cone0[1], r, yt, t), rr2 = radAt(yR);
            for (const off of [-0.05, 0.05]) { const pp = new V3(Math.cos(t + off) * rr2, yR, Math.sin(t + off) * rr2).addScaledVector(n, 0.005); const port = face(new THREE.Mesh(new THREE.CircleGeometry(0.022 * s, 14), M.black), pp, n); g.add(port); g.add(face(new THREE.Mesh(new THREE.RingGeometry(0.021 * s, 0.03 * s, 14), M.frame), pp.clone().addScaledVector(n, 0.003), n)); }
          }
          // umbilical panel and a flush antenna
          const tu = Math.PI * 0.12, nU = coneNormal(cone0[0], cone0[1], r, yt, tu), yU = yb + (yt - yb) * 0.25, rU = radAt(yU);
          g.add(face(rbox(0.12 * s, 0.09 * s, 0.02, 0.015, M.dark), new V3(Math.cos(tu) * rU, yU, Math.sin(tu) * rU), nU));
          g.add(band(rb, 0.03 * s, M.frame, yb + 0.015 * s));
        } else if (p.id === 'pod_lander') {
          // lander crew cab: faceted aluminium shell, angled triangular windows, gold-blanketed base,
          // RCS quads on outriggers, docking tunnel and a rendezvous antenna
          const fac = std({ color: 0xa9adb3, roughness: 0.55, metalness: 0.75, flatShading: true, map: MatKit.make('hull', {}).map });
          g.add(put(cyl(r * 0.92, r * 0.98, h * 0.55, 8, fac), 0, h * 0.05, 0));
          g.add(put(cyl(r * 0.7, r * 0.92, h * 0.12, 8, fac), 0, h * 0.385, 0));
          g.add(put(cyl(r * 0.98, r * 0.86, h * 0.25, 8, M.gold), 0, -h * 0.35, 0));
          g.add(put(cyl(r * 0.4, r * 0.42, h * 0.12, 32, M.offwhite), 0, h * 0.5 - h * 0.06, 0));
          g.add(ring(r * 0.41, 0.012, M.metal, h * 0.5, 32));
          for (const sgn of [-1, 1]) {
            // centred on a facet of the 8-sided cab and seated on its plane
            const t = Math.PI / 2 + sgn * Math.PI / 8, Ry = r * (0.98 - 0.06 * (0.2 + 0.225) / 0.55), fd = Ry * Math.cos(Math.PI / 8);
            const n = new V3(Math.cos(t), (0.06 * r / (0.55 * h)) * Math.cos(Math.PI / 8), Math.sin(t)).normalize();
            const triPts = [[-0.11, -0.08], [0.11, -0.08], [sgn * 0.09, 0.12]], cxT = sgn * 0.03, cyT = -0.013;
            const tri = new THREE.Shape(); triPts.forEach(([x, y], k) => tri[k ? 'lineTo' : 'moveTo'](x, y)); tri.closePath();
            const frameS = new THREE.Shape(); triPts.forEach(([x, y], k) => frameS[k ? 'lineTo' : 'moveTo'](cxT + (x - cxT) * 1.22, cyT + (y - cyT) * 1.22)); frameS.closePath();
            const hole = new THREE.Path(); [...triPts].reverse().forEach(([x, y], k) => hole[k ? 'lineTo' : 'moveTo'](x, y)); hole.closePath(); frameS.holes.push(hole);
            const tg = new THREE.ExtrudeGeometry(frameS, { depth: 0.026, bevelEnabled: false }); tg.translate(0, 0, -0.01);
            const p0 = new V3(Math.cos(t) * (fd + 0.004), h * 0.2, Math.sin(t) * (fd + 0.004));
            g.add(face(new THREE.Mesh(tg, M.frame), p0, n));
            g.add(face(new THREE.Mesh(new THREE.ShapeGeometry(tri), M.glass), p0.clone().addScaledVector(n, 0.002), n));
          }
          for (let i = 0; i < 4; i++) { const t = i / 4 * Math.PI * 2 + Math.PI / 4; const x = Math.cos(t) * (r + 0.12), z = Math.sin(t) * (r + 0.12); g.add(strut(new V3(Math.cos(t) * r * 0.9, h * 0.15, Math.sin(t) * r * 0.9), new V3(x, h * 0.15, z), 0.015, M.frame)); rcsQuad(g, x, h * 0.15, z, -t, 1, M.silver); }
          const dsh = lathe([[0.001, 0], [0.08, 0.012], [0.16, 0.05]], std({ color: 0xe8e8e4, roughness: 0.4, side: THREE.DoubleSide }), 24); dsh.position.set(-r * 0.55, h * 0.62, -r * 0.3); dsh.rotation.set(0.6, 0, 0.4); g.add(dsh);
          g.add(strut(new V3(-r * 0.45, h * 0.44, -r * 0.25), new V3(-r * 0.55, h * 0.62, -r * 0.3), 0.012, M.metal));
        } else {
          // habitat cabin: ribbed hull, a band of windows, handrails, end rings
          const bodyM = cyl(r, rb || r, h, 48, M.hull); hullUV(bodyM, r, h); g.add(bodyM);
          for (let i = 0; i < 8; i++) { const t = (i + 0.5) / 8 * Math.PI * 2; const n = new V3(Math.cos(t), 0, Math.sin(t)); windowAt(g, n.clone().multiplyScalar(r + 0.004).setY(h * 0.12), n, 0.16 * (r / 0.6), 0.2 * (r / 0.6)); }
          for (let i = 0; i < 4; i++) { const t = i / 4 * Math.PI * 2; for (const y of [-h * 0.3, h * 0.38]) g.add(strut(new V3(Math.cos(t) * (r + 0.05), y - 0.2, Math.sin(t) * (r + 0.05)), new V3(Math.cos(t) * (r + 0.05), y + 0.2, Math.sin(t) * (r + 0.05)), 0.012, M.chrome, 6)); }
          for (const y of [h / 2 - 0.04, -h / 2 + 0.04]) g.add(band(r, 0.08, M.frame, y));
          raceway(g, r, -h / 2 + 0.08, h / 2 - 0.08);
        }
        break;
      }
      case 'tank': {
        if (p.surf) {
          const rr = p.w / 2;
          if (p.res.MP) { g.add(put(sph(rr, M.carbon, 24), rr + 0.03, 0, 0)); g.add(put(ring(rr * 1.01, 0.012, M.metal, 0, 32), rr + 0.03, 0, 0)); }
          else { const t = new THREE.Mesh(new THREE.CapsuleGeometry(rr, h - 2 * rr, 8, 24), M.hull); t.position.x = rr + 0.03; g.add(t); for (const y of [-h * 0.3, h * 0.3]) g.add(put(new THREE.Mesh(new THREE.TorusGeometry(rr * 1.01, 0.012, 6, 32), M.metal).rotateX(Math.PI / 2), rr + 0.03, y, 0)); }
          for (const y of [-h * 0.3, h * 0.3]) g.add(put(box(0.06, 0.05, 0.08, M.frame), 0.03, y, 0));
          g.add(pipe([[0.02, -h * 0.4, 0.04], [0.06, -h * 0.45, 0.06], [rr * 0.6, -h * 0.47, 0.05]], 0.012, M.metal));
        } else if (p.shape === 'sphere') {
          // composite-overwrapped pressure vessel on a strut cradle
          g.add(sph(r * 0.88, M.carbon, 32));
          g.add(ring(r * 0.9, 0.02, M.metal, 0, 40));
          for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; g.add(strut(new V3(Math.cos(t) * r * 0.97, (i % 2 ? 1 : -1) * h * 0.45, Math.sin(t) * r * 0.97), new V3(Math.cos(t) * r * 0.88, 0, Math.sin(t) * r * 0.88), 0.012, M.frame)); }
          for (const y of [h / 2 - 0.02, -h / 2 + 0.02]) g.add(ring(r * 0.95, 0.02, M.frame, y, 40));
        } else if (p.shape === 'xenon') {
          g.add(lathe([[0.001, h / 2], [r * 0.55, h / 2 - 0.01], [r * 0.88, h / 2 - r * 0.35], [r * 0.92, h / 2 - r * 0.6], [r * 0.92, -h / 2 + r * 0.6], [r * 0.88, -h / 2 + r * 0.35], [r * 0.55, -h / 2 + 0.01], [0.001, -h / 2]], M.carbon, 40));
          for (const y of [-h / 4, h / 4]) g.add(ring(r * 0.93, 0.02, M.metal, y, 40));
          for (const y of [h / 2 - 0.02, -h / 2 + 0.02]) g.add(ring(r * 0.97, 0.025, M.frame, y, 40));
          g.add(pipe([[0, h / 2, 0], [r * 0.3, h / 2 + 0.02, r * 0.2], [r * 0.6, h / 2 - 0.05, r * 0.5]], 0.012, M.metal));
        } else if (p.shape === 'cryo') {
          g.add(cyl(r * 0.98, r * 0.98, h * 0.94, 48, M.gold));
          for (let i = 0; i < 5; i++) g.add(ring(r, 0.025, M.metal, -h / 2 + (i + 0.5) * h / 5, 48));
          for (const y of [h / 2 - 0.03, -h / 2 + 0.03]) g.add(put(cyl(r, r, 0.06, 48, M.frame), 0, y, 0));
          g.add(pipe([[r * 1.02, h * 0.45, 0], [r * 1.06, 0, 0.05], [r * 1.02, -h * 0.45, 0]], 0.02, M.chrome));
        } else if (p.shape === 'trap') {
          g.add(cyl(r * 0.78, r * 0.78, h * 0.9, 40, M.dark));
          for (const y of [-h * 0.3, 0, h * 0.3]) g.add(put(new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, 0.07, 14, 48), M.copper).rotateX(Math.PI / 2), 0, y, 0));
          for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; g.add(put(box(0.04, h * 0.9, 0.04, M.metal), Math.cos(t) * r * 0.82, 0, Math.sin(t) * r * 0.82)); }
          g.add(put(new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, 0.025, 8, 48), M.amGlow).rotateX(Math.PI / 2), 0, h * 0.15, 0));
          for (const y of [h / 2 - 0.03, -h / 2 + 0.03]) g.add(put(cyl(r, r, 0.06, 48, M.frame), 0, y, 0));
        } else {
          // propellant tank: skin with stringers, end rings, raceway and (on big stages) a pressurisation line
          const skin = p.foam ? M.foam : p.foil ? M.gold : M.hull;
          const body = cyl(r, r, h, Math.max(48, Math.round(r * 64)), skin);
          if (skin === M.hull) hullUV(body, r, h); else if (skin === M.foam) hullUV(body, r * 0.5, h * 0.5);
          g.add(body);
          if (!S) for (const y of [h / 2 - 0.025, -h / 2 + 0.025]) g.add(band(r, 0.05, M.frame, y));
          if (p.stripe) g.add(band(r, Math.min(0.25, h * 0.08), std({ color: new THREE.Color(p.stripe), roughness: 0.7 }), h / 2 - h * 0.12));
          raceway(g, r, -h / 2 + 0.005, h / 2 - 0.005, p.foam ? M.foam : null);
          if (r >= 0.6 && h > 1.2) { const t = RACE + 0.5, pr = r + 0.03 + r * 0.02; g.add(put(cyl(0.02 + r * 0.02, 0.02 + r * 0.02, h - 0.01, 10, p.foam ? M.foam : M.offwhite), Math.cos(t) * pr, 0, Math.sin(t) * pr)); for (let y = -h / 2 + 0.4; y < h / 2 - 0.2; y += 0.9) g.add(put(box(0.05, 0.035, 0.05, M.frame), Math.cos(t) * (pr - 0.015), y, Math.sin(t) * (pr - 0.015))); }
        }
        break;
      }
      case 'engine': {
        const e = p.eng;
        if (p.surf) {
          // radial vernier: mount plate, small chamber and bell on a gimbal yoke
          g.add(put(rbox(0.06, h * 0.7, 0.13, 0.015, M.frame), 0.03, 0.04, 0));
          const yTop = 0.1, yTh = -0.02, yEx = -0.2;
          liquidEngine(g, 0.13, 0, yTop, yTh, yEx, 0.025, 0.085, false, 0.15, { simple: true });
          g.add(strut(new V3(0.06, 0.1, 0), new V3(0.13, 0.08, 0), 0.012, M.frame));
          addFlame(g, { eng: e, r: 0.09 }, 0.085, yEx, 1); g.children[g.children.length - 1].position.x = 0.13;
          break;
        }
        if (p.id === 'eng_ion') {
          // gridded ion thruster: discharge chamber, magnet rings, glowing accelerator grid, power unit
          g.add(put(cyl(r * 0.9, r * 0.8, h * 0.55, 32, M.silver), 0, h * 0.15, 0));
          for (const y of [h * 0.3, h * 0.05]) g.add(ring(r * 0.91, 0.015, M.metal, y, 32));
          g.add(put(cyl(r * 0.96, r * 0.96, h * 0.3, 40, M.chamber, true), 0, -h * 0.25, 0));
          g.add(ring(r * 0.95, 0.03, M.frame, -h * 0.4, 40));
          const grid = new THREE.Mesh(new THREE.CircleGeometry(r * 0.86, 40), M.ionGlow); grid.rotation.x = Math.PI / 2; grid.position.y = -h * 0.38; grid.name = 'glow'; g.add(grid);
          g.add(put(rbox(r * 0.7, h * 0.35, r * 0.4, 0.02, M.offwhite), r * 0.55, h * 0.3, 0));
          g.add(put(cyl(0.012, 0.012, h * 0.6, 8, M.metal).rotateZ(0.5), r * 0.75, 0, r * 0.4));
          addFlame(g, p, r * 0.85, -h / 2, 1);
          break;
        }
        const cluster = e.cluster || 1;
        const special = ['eng_ntr', 'eng_fusion', 'eng_am'].includes(p.id);
        const mountH = special ? h * 0.55 : h * 0.34;
        const yMount = h / 2 - mountH * 0.32;            // bottom of the mounting skirt
        // mounting skirt (continues the stage above) and the quilted heat-shield blanket under it
        const skirt = cyl(r, r, h / 2 - yMount, 48, S ? M.hull : M.white, true); skirt.position.y = (h / 2 + yMount) / 2; if (S) hullUV(skirt, r, h / 2 - yMount); g.add(skirt);
        if (!S) g.add(band(r, 0.04, M.frame, h / 2 - 0.02));
        raceway(g, r, yMount + 0.01, h / 2 - 0.005);
        const bg = new THREE.RingGeometry(r * 0.2, r * 0.995, 48, 2), bp = bg.attributes.position, buv = bg.attributes.uv;
        for (let i = 0; i < bp.count; i++) buv.setXY(i, bp.getX(i) * 1.5, bp.getY(i) * 1.5); // planar, so the quilting stays square
        const blanket = new THREE.Mesh(bg, M.blanket); blanket.rotation.x = Math.PI / 2; blanket.position.y = yMount - 0.002; g.add(blanket);
        if (p.look) { exoticEngine(g, p, yMount); break; }
        const yGim = h / 2 - mountH * (special ? 0.9 : 0.62);
        if (p.id === 'eng_ntr') {
          // reactor vessel with radiation shadow shield, hydrogen turbopumps and plumbing
          g.add(put(cyl(r * 0.62, r * 0.62, 0.05, 32, M.dark), 0, yMount - 0.04, 0));
          g.add(put(cyl(r * 0.5, r * 0.5, mountH * 0.55, 32, M.metal), 0, yMount - 0.07 - mountH * 0.275, 0));
          g.add(put(cyl(r * 0.505, r * 0.505, mountH * 0.12, 32, M.stripes), 0, yMount - 0.07 - mountH * 0.2, 0));
          for (const sgn of [-1, 1]) { g.add(put(cyl(r * 0.12, r * 0.12, mountH * 0.3, 14, M.chamber), sgn * r * 0.7, yMount - mountH * 0.3, 0)); g.add(pipe([[sgn * r * 0.7, yMount - mountH * 0.45, 0], [sgn * r * 0.6, yGim, r * 0.15], [0, yGim - mountH * 0.05, r * 0.5]], 0.03, M.metal)); }
          const yTh = h / 2 - mountH;
          liquidEngine(g, 0, 0, yGim, yTh, -h / 2, r * 0.22, r * 0.92, true, mountH, { simple: true });
          addFlame(g, p, r * 0.9, -h / 2 + 0.02, 1);
          break;
        }
        if (p.id === 'eng_fusion' || p.id === 'eng_am') {
          // magnetic confinement: superconducting coil rings on a truss, reaction chamber, magnetic nozzle
          const n = p.id === 'eng_am' ? 4 : 3;
          for (let i = 0; i < n; i++) { const y = yMount - mountH * (0.18 + i * 0.22); g.add(put(new THREE.Mesh(new THREE.TorusGeometry(r * (0.62 + i * 0.05), 0.11, 16, 56), M.copper).rotateX(Math.PI / 2), 0, y, 0)); g.add(ring(r * (0.62 + i * 0.05) + 0.11, 0.02, M.silver, y, 56)); }
          for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; g.add(strut(new V3(Math.cos(t) * r * 0.9, yMount, Math.sin(t) * r * 0.9), new V3(Math.cos(t) * r * 0.82, -h / 2 + mountH * 0.15, Math.sin(t) * r * 0.82), 0.045, M.frame)); }
          g.add(put(cyl(r * 0.35, r * 0.35, mountH * 0.8, 32, M.chamber), 0, yMount - mountH * 0.45, 0));
          if (p.id === 'eng_am') g.add(put(new THREE.Mesh(new THREE.TorusGeometry(r * 0.38, 0.05, 8, 36), M.amGlow).rotateX(Math.PI / 2), 0, yMount - mountH * 0.5, 0));
          liquidEngine(g, 0, 0, h / 2 - mountH * 0.95, h / 2 - mountH, -h / 2, r * 0.3, r * 0.95, true, mountH, { simple: true });
          addFlame(g, p, r * 0.9, -h / 2 + 0.02, 1);
          break;
        }
        // thrust structure: struts from the skirt down to the gimbal block
        const nS = cluster > 1 ? 8 : 6;
        for (let i = 0; i < nS; i++) { const t = (i + 0.5) / nS * Math.PI * 2; g.add(strut(new V3(Math.cos(t) * r * 0.85, yMount, Math.sin(t) * r * 0.85), new V3(Math.cos(t) * r * (cluster > 1 ? 0.55 : 0.2), yGim + 0.02, Math.sin(t) * r * (cluster > 1 ? 0.55 : 0.2)), 0.008 + r * 0.018, M.frame)); }
        const yTh = h / 2 - mountH;
        if (cluster > 1) {
          g.add(put(cyl(r * 0.75, r * 0.75, 0.05, 32, M.frame), 0, yGim + 0.02, 0));
          for (const [ox, oz] of [[0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]) liquidEngine(g, ox * r * 0.95, oz * r * 0.95, yGim, yTh, -h / 2, r * 0.12, r * 0.42, false, mountH * 0.3, { simple: true });
          for (let i = 0; i < 4; i++) { const t = i / 4 * Math.PI * 2 + Math.PI / 4; g.add(put(cyl(r * 0.07, r * 0.07, mountH * 0.4, 12, M.chamber), Math.cos(t) * r * 0.25, yGim - mountH * 0.15, Math.sin(t) * r * 0.25)); }
          addFlame(g, p, r * 0.42 * 0.95, -h / 2 + 0.02, cluster);
        } else {
          g.add(put(cyl(r * 0.18, r * 0.2, 0.06 + r * 0.05, 20, M.frame), 0, yGim + 0.03, 0));
          const exit = r * (e.vac ? 0.95 : 0.8);
          liquidEngine(g, 0, 0, yGim, yTh, -h / 2, r * 0.22, exit, !!e.vac, mountH);
          addFlame(g, p, exit * 0.95, -h / 2 + 0.02, 1);
        }
        break;
      }
      case 'srb': {
        // solid booster: painted steel case segments, field joints, attach rings, systems tunnel,
        // forward closure, flared aft skirt with hold-down posts, and an ablative exit cone
        const yAft = -h / 2 + h * 0.085, yTop = h / 2 - Math.min(0.12, h * 0.04);
        const caseM = cyl(r, r, yTop - yAft, 56, M.hull); caseM.position.y = (yTop + yAft) / 2; hullUV(caseM, r, yTop - yAft); g.add(caseM);
        g.add(put(cyl(r * 0.35, r, h / 2 - yTop, 48, M.grey), 0, (h / 2 + yTop) / 2, 0));
        g.add(put(cyl(r * 0.36, r * 0.36, 0.02, 24, M.frame), 0, h / 2, 0));
        const segs = Math.max(2, Math.round(h / 1.2));
        for (let i = 1; i < segs; i++) { const y = yAft + (yTop - yAft) * i / segs; g.add(ring(r * 1.004, 0.012 + r * 0.014, M.grey, y, 56)); g.add(ring(r * 1.002, 0.006 + r * 0.006, M.frame, y + 0.03 + r * 0.03, 56)); }
        // black roll-pattern quadrants near the top for tracking cameras
        const rollM = std({ color: 0x151515, roughness: 0.8 });
        const rollR = r + 0.004 + r * 0.008;
        for (let q = 0; q < 2; q++) { const rb2 = new THREE.Mesh(new THREE.CylinderGeometry(rollR, rollR, Math.min(0.35, h * 0.07), 16, 1, true, q * Math.PI, Math.PI / 2), rollM); rb2.position.y = yTop - h * 0.06; g.add(rb2); }
        for (const y of [yTop - h * 0.14, yAft + h * 0.12]) { g.add(ring(r * 1.01, 0.02 + r * 0.02, M.frame, y, 56)); g.add(put(rbox(0.08 + r * 0.06, 0.06 + r * 0.04, 0.08, 0.01, M.frame), -r - 0.04, y, 0)); }
        const tun = rbox(0.05 + r * 0.04, yTop - yAft - h * 0.1, 0.04 + r * 0.02, 0.012, M.offwhite); tun.position.set(0, (yTop + yAft) / 2, r + 0.015 + r * 0.01); g.add(tun);
        g.add(lathe([[r, yAft + 0.02], [r * 1.02, yAft], [r * 1.16, -h / 2 + 0.03], [r * 1.16, -h / 2], [r * 0.4, -h / 2]], M.white, 56));
        for (let i = 0; i < 4; i++) { const t = i / 4 * Math.PI * 2 + Math.PI / 4; g.add(put(box(0.06 + r * 0.06, 0.05, 0.06 + r * 0.06, M.frame), Math.cos(t) * r * 1.1, -h / 2 + 0.025, Math.sin(t) * r * 1.1)); }
        const nz = lathe([[r * 0.34, 0], [r * 0.36, -h * 0.01], [r * 0.48, -h * 0.035], [r * 0.62, -h * 0.065], [r * 0.7, -h * 0.08]], M.ablative, 40); nz.position.y = -h / 2 + h * 0.05; g.add(nz);
        g.add(ring(r * 0.38, 0.02 + r * 0.02, M.rubber, -h / 2 + h * 0.05, 32));
        addFlame(g, p, r * 0.62, -h / 2 - h * 0.03, 1);
        break;
      }
      case 'decoupler': {
        // carbon interstage ring, separation plane with frangible bolts and pyro boxes
        const b = cyl(r, r, h, 56, M.carbon); g.add(b);
        g.add(band(r, h * 0.18, M.stripes, -h * 0.18));
        g.add(ring(r * 1.004, 0.006 + r * 0.006, M.metal, h * 0.12, 56));
        const nb = Math.max(10, Math.round(r * 22));
        for (let i = 0; i < nb; i++) { const t = i / nb * Math.PI * 2; const bo = cyl(0.01 + r * 0.008, 0.01 + r * 0.008, 0.016, 6, M.chrome); bo.rotation.z = Math.PI / 2; bo.rotation.y = -t; bo.position.set(Math.cos(t) * r * 1.008, h * 0.3, Math.sin(t) * r * 1.008); g.add(bo); }
        for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2 + 0.5; g.add(face(rbox(0.06 + r * 0.04, h * 0.5, 0.03, 0.008, M.dark), new V3(Math.cos(t) * (r + 0.012), 0, Math.sin(t) * (r + 0.012)), new V3(Math.cos(t), 0, Math.sin(t)))); }
        break;
      }
      case 'rdecoupler': {
        const w = p.w;
        g.add(put(rbox(w * 0.6, h, 0.16, 0.03, M.white), w * 0.3, 0, 0));
        g.add(put(rbox(w * 0.45, h * 0.92, 0.2, 0.03, M.frame), w * 0.7, 0, 0));
        g.add(put(box(w * 0.08, h * 0.95, 0.205, M.stripes), w * 0.52, 0, 0));
        for (const y of [-h * 0.35, 0, h * 0.35]) g.add(put(cyl(0.022, 0.022, 0.06, 10, M.chrome).rotateZ(Math.PI / 2), w * 0.98, y, 0));
        break;
      }
      case 'adapter': {
        const a = cyl(r, rb, h, 56, S ? M.hull : M.white); hullUV(a, (r + rb) / 2, h); g.add(a);
        if (!S) { g.add(band(r, 0.04, M.frame, h / 2 - 0.02)); g.add(band(rb, 0.04, M.frame, -h / 2 + 0.02)); }
        break;
      }
      case 'struct': {
        // open truss: machined end rings joined by a warren of tubes
        for (const y of [h / 2 - 0.04, -h / 2 + 0.04]) { g.add(put(cyl(r * 0.97, r * 0.97, 0.08, 48, M.frame, true), 0, y, 0)); g.add(ring(r * 0.97, 0.025, M.metal, y, 48)); }
        const n = 10;
        for (let i = 0; i < n; i++) { const t0 = i / n * Math.PI * 2, t1 = (i + 0.5) / n * Math.PI * 2, t2 = (i + 1) / n * Math.PI * 2, R = r * 0.94;
          const a = new V3(Math.cos(t0) * R, -h / 2 + 0.08, Math.sin(t0) * R), b = new V3(Math.cos(t1) * R, h / 2 - 0.08, Math.sin(t1) * R), c = new V3(Math.cos(t2) * R, -h / 2 + 0.08, Math.sin(t2) * R);
          g.add(strut(a, b, 0.02, M.metal)); g.add(strut(b, c, 0.02, M.metal)); }
        break;
      }
      case 'fairing': {
        g.add(cyl(r, r, h, 48, M.carbon));
        g.add(ring(r * 1.004, 0.012, M.metal, h / 2 - 0.02, 48));
        if (inst && inst.fair) {
          const fr = inst.fair.r, fh = inst.fair.h;
          const prof = [];
          const cyl1 = fh * 0.62;
          prof.push([r, 0]);
          prof.push([fr, Math.min(0.3, fh * 0.1)]);
          prof.push([fr, cyl1]);
          for (let i = 1; i <= 12; i++) { const t = i / 12; prof.push([fr * Math.cos(t * Math.PI / 2 * 0.98) * (1 - t * 0.04), cyl1 + (fh - cyl1) * Math.sin(t * Math.PI / 2)]); }
          prof.push([0.001, fh]);
          const shell = new THREE.Group(); shell.name = 'shell';
          const fm = MatKit.mat(MatKit.make('hull', {}), { roughness: 0.95, metalness: 0.08, side: THREE.DoubleSide });
          for (let s = 0; s < 2; s++) {
            const half = new THREE.Mesh(new THREE.LatheGeometry(prof.map(q => new THREE.Vector2(q[0], q[1])), 32, s * Math.PI, Math.PI), fm);
            hullUV(half, fr * 0.5, fh);
            half.position.y = h / 2; half.userData.half = s;
            // separation rail along each seam
            for (const ea of [s * Math.PI, s * Math.PI + Math.PI]) { const rail = box(0.03, cyl1, 0.03, M.frame); rail.position.set(Math.sin(ea) * (fr + 0.01), cyl1 / 2, Math.cos(ea) * (fr + 0.01)); half.add(rail); }
            shell.add(half);
          }
          g.add(shell);
        }
        break;
      }
      case 'dock': {
        // androgynous docking system: collar, capture ring with three guide petals, latches, target
        g.add(put(cyl(r * 0.96, r, h * 0.5, 48, M.grey), 0, -h * 0.25, 0));
        g.add(put(cyl(r * 0.8, r * 0.85, h * 0.25, 48, M.metal), 0, h * 0.1, 0));
        g.add(ring(r * 0.8, 0.03, M.chrome, h * 0.22, 48));
        for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2; const pt = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.86, h * 0.55, 16, 1, true, t - 0.32, 0.64), M.offwhite); pt.position.y = h * 0.4; pt.material.side = THREE.DoubleSide; g.add(pt); }
        for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; g.add(put(box(0.03, 0.04, 0.03, M.frame), Math.cos(t) * r * 0.9, h * 0.0, Math.sin(t) * r * 0.9)); }
        g.add(put(cyl(r * 0.15, r * 0.15, 0.02, 20, M.white), 0, h * 0.2, 0));
        break;
      }
      case 'nose': {
        // tangent ogive with a metal tip and a pitot probe
        // tangent ogive: arc of radius rho through the tip, tangent to the body at the base
        const prof = []; const N = 28, L = h * 0.97, rho = (rb * rb + L * L) / (2 * rb);
        for (let i = 0; i <= N; i++) { const x = L * i / N; prof.push([Math.max(0.0015, Math.sqrt(Math.max(0, rho * rho - x * x)) + rb - rho), -h / 2 + x]); }
        prof.push([0.001, -h / 2 + L]);
        const n = lathe(prof, S ? M.hull : M.white, 48); latheUV(n, rb, h); g.add(n);
        g.add(put(sph(rb * 0.07, M.metal, 16), 0, h / 2 - h * 0.03, 0));
        g.add(put(cyl(0.004 + rb * 0.008, 0.006 + rb * 0.01, h * 0.08, 8, M.chrome), 0, h / 2 + h * 0.02, 0));
        if (!S) g.add(band(rb, 0.04, M.frame, -h / 2 + 0.02));
        raceway(g, rb * 0.985, -h / 2 + 0.005, -h / 2 + h * 0.35);
        break;
      }
      case 'fin': {
        // swept fin with an airfoil section, metal leading edge, root fillet and fasteners
        const w = p.w;
        const sh = new THREE.Shape();
        sh.moveTo(0, -h / 2); sh.lineTo(w, -h / 2 - h * 0.05); sh.lineTo(w, -h / 2 + h * 0.3); sh.lineTo(0, h / 2); sh.closePath();
        const th = 0.012 + w * 0.02;
        const geo = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: th * 0.9, bevelSize: th * 0.9, bevelSegments: 3, curveSegments: 4 }); geo.translate(0, 0, -th / 2);
        const fm = new THREE.Mesh(geo, p.ctrl ? M.grey : M.white); g.add(fm);
        const le = strut(new V3(0.0, h / 2, 0), new V3(w, -h / 2 + h * 0.3, 0), th * 1.1, M.metal, 8); g.add(le);
        g.add(put(rbox(0.05, h * 0.92, th * 6, 0.02, M.frame), 0.02, 0, 0));
        for (let y = -h / 2 + 0.06; y < h / 2 - 0.05; y += 0.08) for (const z of [-th * 3, th * 3]) g.add(put(sph(0.008, M.chrome, 6), 0.03, y, z));
        if (p.ctrl) { const flap = box(w * 0.85, 0.06, th * 2.2, M.dark); flap.position.set(w * 0.52, -h / 2 + 0.02, 0); flap.name = 'flap'; g.add(flap); g.add(put(cyl(0.012, 0.012, w * 0.9, 8, M.chrome).rotateZ(Math.PI / 2), w * 0.5, -h / 2 + 0.06, 0)); }
        break;
      }
      case 'wheel': {
        g.add(cyl(r, r, h, 48, M.dark));
        for (const y of [h / 2 - 0.01, -h / 2 + 0.01]) g.add(ring(r * 0.995, 0.012, M.metal, y, 48));
        for (let i = 0; i < 4; i++) { const t = i / 4 * Math.PI * 2 + Math.PI / 4; g.add(face(rbox(r * 0.45, h * 0.6, 0.04, 0.01, M.silver), new V3(Math.cos(t) * (r + 0.015), 0, Math.sin(t) * (r + 0.015)), new V3(Math.cos(t), 0, Math.sin(t)))); }
        for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; g.add(put(sph(0.012, M.chrome, 6), Math.cos(t) * r * 1.0, h * 0.3, Math.sin(t) * r * 1.0)); }
        break;
      }
      case 'rcs': rcsQuad(g, 0, 0, 0, 0, 1.25, M.white); break;
      case 'battery': {
        if (p.surf) { g.add(put(rbox(p.w, h, 0.15, 0.015, M.dark), p.w / 2, 0, 0)); for (let y = -h * 0.35; y <= h * 0.36; y += h * 0.1) g.add(put(box(p.w * 0.9, 0.006, 0.17, M.metal), p.w / 2, y, 0)); g.add(put(box(p.w * 0.5, h * 0.12, 0.164, std({ color: 0x3ad17a, roughness: 0.5 })), p.w / 2, h * 0.38, 0)); }
        else { g.add(cyl(r * 0.96, r * 0.96, h, 48, M.frame)); const n = Math.max(6, Math.round(r * 12)); for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; g.add(face(rbox(r * 2 * Math.PI / n * 0.85, h * 0.78, 0.05, 0.01, i % 3 === 0 ? M.offwhite : M.dark), new V3(Math.cos(t) * r * 0.97, 0, Math.sin(t) * r * 0.97), new V3(Math.cos(t), 0, Math.sin(t)))); } for (const y of [h / 2 - 0.015, -h / 2 + 0.015]) g.add(band(r * 0.96, 0.03, M.metal, y)); }
        break;
      }
      case 'solar': {
        const pw = p.id === 'solar_large' ? 1.6 : p.id === 'solar_deploy' ? 0.5 : 0.3;
        const panel = (len, wid, x) => { const pg = new THREE.Group(); const f = box(len, 0.006, wid, M.solarBack); pg.add(f); const c = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.96, wid * 0.94), M.solar); c.rotation.x = -Math.PI / 2; c.position.y = 0.01; const uv = c.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len * 2, uv.getY(i) * wid * 4); pg.add(c); const c2 = c.clone(); c2.rotation.x = Math.PI / 2; c2.position.y = -0.01; pg.add(c2); for (const z of [-wid / 2, wid / 2]) pg.add(put(box(len, 0.02, 0.015, M.metal), 0, 0, z)); pg.position.x = x; return pg; };
        if (!p.deploy) { const pan = panel(h, pw, 0); pan.rotation.z = Math.PI / 2; pan.position.x = 0.025; g.add(pan); g.add(put(rbox(0.03, h * 0.3, 0.06, 0.008, M.frame), 0.015, 0, 0)); }
        else {
          g.add(put(rbox(0.09, h * 0.55, 0.2, 0.02, M.offwhite), 0.045, 0, 0));
          g.add(put(cyl(0.035, 0.035, 0.08, 14, M.metal).rotateZ(Math.PI / 2), 0.1, 0, 0));
          const st = new THREE.Group(); st.name = 'stowed'; st.add(put(rbox(0.07, h, pw * 0.42, 0.01, M.solarBack), 0.12, 0, 0)); st.add(put(box(0.072, h * 0.98, 0.01, M.frame), 0.12, 0, pw * 0.21)); g.add(st);
          const dep = new THREE.Group(); dep.name = 'deployed'; dep.visible = false;
          const len = p.id === 'solar_large' ? 7 : 2.4, nPan = p.id === 'solar_large' ? 5 : 3, gap = 0.04, pl = (len - gap * (nPan - 1)) / nPan;
          dep.add(strut(new V3(0.1, 0, 0), new V3(0.1 + len + 0.1, 0, 0), 0.018, M.metal));
          for (let i = 0; i < nPan; i++) { const x = 0.16 + pl / 2 + i * (pl + gap); dep.add(panel(pl, pw * 2.2, x)); if (i) dep.add(put(cyl(0.012, 0.012, pw * 2.2, 8, M.chrome).rotateX(Math.PI / 2), x - pl / 2 - gap / 2, 0, 0)); }
          g.add(dep);
        }
        break;
      }
      case 'rtg': {
        // finned radioisotope generator on a bracket
        const cx = p.w / 2 + 0.02;
        g.add(put(cyl(0.075, 0.075, h * 0.9, 20, M.dark), cx, 0, 0));
        for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; const f = box(0.008, h * 0.82, 0.11, M.grey); f.position.set(cx + Math.cos(t) * 0.12, 0, Math.sin(t) * 0.12); f.rotation.y = -t; g.add(f); }
        for (const y of [h * 0.45, -h * 0.45]) g.add(put(cyl(0.18, 0.18, 0.025, 24, M.frame), cx, y, 0));
        g.add(put(rbox(0.06, 0.12, 0.12, 0.01, M.grey), 0.03, 0, 0));
        g.add(strut(new V3(0.03, 0.05, 0), new V3(cx - 0.08, h * 0.2, 0), 0.012, M.frame)); g.add(strut(new V3(0.03, -0.05, 0), new V3(cx - 0.08, -h * 0.2, 0), 0.012, M.frame));
        break;
      }
      case 'fuelcell': {
        g.add(put(rbox(p.w, h, 0.24, 0.025, M.offwhite), p.w / 2, 0, 0));
        for (let i = 0; i < 5; i++) g.add(put(box(p.w * 0.7, 0.012, 0.245, M.frame), p.w / 2, -h * 0.3 + i * h * 0.15, 0));
        g.add(pipe([[p.w * 0.85, h * 0.4, 0.12], [p.w * 0.95, 0, 0.14], [p.w * 0.85, -h * 0.4, 0.12]], 0.015, M.metal));
        g.add(put(cyl(0.03, 0.03, 0.04, 10, M.dark).rotateX(Math.PI / 2), p.w * 0.3, h * 0.35, 0.13));
        break;
      }
      case 'reactor': {
        g.add(cyl(r * 0.95, r * 0.95, h * 0.85, 48, M.silver));
        g.add(put(cyl(r, r * 0.95, h * 0.08, 48, M.dark), 0, h / 2 - h * 0.04, 0));
        g.add(put(cyl(r * 0.95, r, h * 0.08, 48, M.dark), 0, -h / 2 + h * 0.04, 0));
        g.add(band(r * 0.95, h * 0.12, M.stripes, h * 0.25));
        for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; const f = box(0.015, h * 0.6, 0.35, M.radiator); f.position.set(Math.cos(t) * (r + 0.17), -h * 0.08, Math.sin(t) * (r + 0.17)); f.rotation.y = -t; g.add(f); }
        for (let i = 0; i < 4; i++) { const t = i / 4 * Math.PI * 2 + 0.4; g.add(pipe([[Math.cos(t) * r * 0.96, h * 0.3, Math.sin(t) * r * 0.96], [Math.cos(t) * (r + 0.08), h * 0.2, Math.sin(t) * (r + 0.08)], [Math.cos(t) * (r + 0.1), -h * 0.3, Math.sin(t) * (r + 0.1)]], 0.02, M.metal)); }
        break;
      }
      case 'radiator': {
        if (!p.deploy) { g.add(put(box(0.02, h, 0.6, M.radiator), 0.03, 0, 0)); g.add(put(box(0.03, h, 0.03, M.frame), 0.03, 0, 0.3)); g.add(put(box(0.03, h, 0.03, M.frame), 0.03, 0, -0.3)); }
        else {
          g.add(put(rbox(0.09, 0.4, 0.2, 0.02, M.grey), 0.045, 0, 0));
          const st = new THREE.Group(); st.name = 'stowed'; st.add(put(rbox(0.08, 0.5, 0.3, 0.01, M.radiator), 0.13, 0, 0)); g.add(st);
          const dep = new THREE.Group(); dep.name = 'deployed'; dep.visible = false;
          const n = 3, pl = h / n;
          for (let i = 0; i < n; i++) { const pn = box(pl - 0.03, 0.015, 0.9, M.radiator); pn.position.set(0.12 + pl / 2 + i * pl, 0, 0); dep.add(pn); dep.add(put(box(pl - 0.03, 0.03, 0.03, M.frame), 0.12 + pl / 2 + i * pl, 0, 0.45)); }
          dep.add(strut(new V3(0.1, 0, -0.45), new V3(0.12 + h, 0, -0.45), 0.015, M.metal));
          g.add(dep);
        }
        break;
      }
      case 'antenna': {
        if (p.id === 'ant_whip') {
          g.add(put(cyl(0.03, 0.04, 0.06, 12, M.dark), 0.025, -h / 2 + 0.03, 0));
          g.add(put(new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 12), M.metal).rotateX(Math.PI / 2), 0.03, -h / 2 + 0.07, 0));
          for (let i = 0; i < 3; i++) g.add(put(cyl(0.006 - i * 0.0015, 0.008 - i * 0.0015, h * 0.32, 6, M.chrome), 0.03, -h / 2 + 0.09 + h * 0.31 * (i + 0.5), 0));
          g.add(put(sph(0.01, M.dark, 8), 0.03, h / 2 + 0.02, 0));
        } else {
          // parabolic dish with rim, back ribs, feed horn on a tripod and a gimballed mount
          const R = p.w / 2, f = R * 0.65;
          const dg = new THREE.Group(); dg.position.x = 0.14; dg.rotation.z = -Math.PI / 2;
          const prof = []; for (let i = 0; i <= 14; i++) { const rr = R * i / 14; prof.push([rr, rr * rr / (4 * f)]); }
          dg.add(lathe(prof, std({ color: 0xeeeeea, roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide }), 40));
          dg.add(ring(R, 0.01 + R * 0.01, M.frame, R * R / (4 * f), 40));
          for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; const rib = box(R * 0.95, 0.012, 0.012, M.frame); rib.position.set(Math.cos(t) * R * 0.48, R * 0.06 - 0.01, Math.sin(t) * R * 0.48); rib.rotation.y = -t; rib.rotation.z = 0.15; dg.add(rib); }
          for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2; dg.add(strut(new V3(Math.cos(t) * R * 0.82, R * 0.17, Math.sin(t) * R * 0.82), new V3(0, f * 0.9, 0), 0.006, M.metal, 6)); }
          dg.add(put(lathe([[0.001, 0], [R * 0.08, 0.005], [R * 0.12, -R * 0.03]], M.metal, 20), 0, f * 0.9, 0));
          dg.add(put(cyl(R * 0.05, R * 0.04, R * 0.2, 12, M.dark), 0, R * 0.08, 0));
          g.add(dg);
          g.add(put(rbox(0.12, 0.14, 0.14, 0.02, M.grey), 0.06, 0, 0));
          g.add(put(cyl(0.035, 0.035, 0.05, 14, M.metal).rotateZ(Math.PI / 2), 0.12, 0, 0));
        }
        break;
      }
      case 'science': {
        const w = p.w || 0.15;
        if (!p.surf) {
          // materials bay: drum with hinged doors
          g.add(cyl(r, r, h, 48, M.hull)); hullUV(g.children[0], r, h);
          for (let i = 0; i < 4; i++) { const t = i / 4 * Math.PI * 2 + 0.4; g.add(face(rbox(r * 0.8, h * 0.7, 0.025, 0.02, M.grey), new V3(Math.cos(t) * (r + 0.008), 0, Math.sin(t) * (r + 0.008)), new V3(Math.cos(t), 0, Math.sin(t)))); }
          for (const y of [h / 2 - 0.02, -h / 2 + 0.02]) g.add(band(r, 0.04, M.frame, y));
          break;
        }
        if (p.id === 'is_telescope') {
          g.add(put(rbox(0.2, h * 0.4, 0.3, 0.03, M.offwhite), 0.1, 0, 0));
          g.add(put(cyl(0.32, 0.32, h * 0.8, 40, M.gold), 0.55, 0, 0));
          g.add(put(cyl(0.36, 0.36, h * 0.25, 40, M.silver, true), 0.55, h * 0.48, 0));
          g.add(band(0.32, 0.04, M.frame, -h * 0.4).translateX(0.55));
          g.add(put(new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), M.glass).rotateX(-Math.PI / 2), 0.55, h * 0.36, 0));
          break;
        }
        const bw = Math.min(w, 0.18);
        g.add(put(rbox(bw, h * 0.6, 0.15, 0.02, M.offwhite), bw / 2, 0, 0));
        g.add(put(box(bw * 0.6, h * 0.08, 0.164, M.frame), bw / 2, h * 0.22, 0));
        const ex = p.exp;
        if (ex === 'temp') { g.add(put(cyl(0.006, 0.006, h, 6, M.chrome), 0.13, 0, 0)); g.add(put(sph(0.012, M.dark, 8), 0.13, h / 2, 0)); }
        if (ex === 'pres') { g.add(put(cyl(0.06, 0.06, 0.03, 20, M.dark).rotateZ(Math.PI / 2), 0.13, 0, 0)); g.add(put(new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), M.glass).rotateY(Math.PI / 2), 0.151, 0, 0)); }
        if (ex === 'photo') { g.add(put(cyl(0.05, 0.06, 0.12, 20, M.dark).rotateZ(Math.PI / 2), 0.22, 0, 0)); g.add(put(new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), M.glass).rotateY(Math.PI / 2), 0.286, 0, 0)); }
        if (ex === 'exposure') { g.add(put(cyl(0.09, 0.09, h * 0.8, 24, M.metal), 0.1, 0, 0)); g.add(put(cyl(0.095, 0.095, 0.04, 24, M.chuteCover), 0.1, h * 0.4, 0)); }
        if (ex === 'rad') g.add(put(cyl(0.025, 0.025, h * 1.1, 10, M.copper), 0.14, 0, 0));
        if (ex === 'mag') { g.add(strut(new V3(0.1, 0, 0), new V3(w + 0.08, 0, 0), 0.01, M.carbon)); g.add(put(sph(0.035, M.dark, 12), w + 0.08, 0, 0)); }
        if (ex === 'seis') g.add(put(cyl(0.01, 0.03, h * 0.5, 8, M.metal), 0.1, -h * 0.45, 0));
        if (ex === 'atmo') g.add(put(cyl(0.02, 0.07, 0.12, 16, M.metal).rotateZ(-Math.PI / 2), 0.24, 0.05, 0));
        if (ex === 'grav') g.add(put(sph(0.08, M.gold, 20), 0.18, 0.05, 0));
        if (ex === 'spec') { g.add(put(cyl(0.06, 0.07, 0.28, 20, M.dark).rotateZ(Math.PI / 2), 0.3, 0.05, 0)); g.add(put(cyl(0.075, 0.075, 0.02, 20, M.metal).rotateZ(Math.PI / 2), 0.44, 0.05, 0)); }
        if (ex === 'drill') { g.add(put(cyl(0.025, 0.006, h * 0.9, 10, M.metal), 0.25, -h * 0.25, 0)); g.add(put(rbox(0.12, h * 0.4, 0.12, 0.02, M.grey), 0.25, h * 0.25, 0)); }
        break;
      }
      case 'chute': {
        if (p.surf) { g.add(put(cyl(0.11, 0.12, h, 24, M.chuteCover), 0.12, 0, 0)); g.add(put(cyl(0.115, 0.115, 0.04, 24, M.dark), 0.12, h / 2, 0)); g.add(put(rbox(0.04, h * 0.8, 0.08, 0.01, M.frame), 0.01, 0, 0)); }
        else {
          g.add(put(cyl(r * 0.72, rb, h * 0.8, 48, M.offwhite), 0, -h * 0.1, 0));
          g.add(put(cyl(lerp(rb, r * 0.72, 0.55) * 1.012 + 0.003, lerp(rb, r * 0.72, 0.4) * 1.012 + 0.003, h * 0.12, 64, M.chuteCover, true), 0, -h * 0.1, 0));
          g.add(put(lathe([[r * 0.72, 0], [r * 0.6, h * 0.08], [r * 0.3, h * 0.13], [0.001, h * 0.14]], M.white, 48), 0, h * 0.3, 0));
          for (const y of [-h * 0.3, h * 0.1]) g.add(ring(lerp(rb, r * 0.72, (y + h * 0.5) / (h * 0.8)) * 1.01, 0.008, M.frame, y, 48));
          g.add(band(rb, 0.03, M.frame, -h / 2 + 0.015));
        }
        // canopy (hidden until deployed): gored dome with a vent and a reinforced skirt band
        const can = new THREE.Group(); can.name = 'canopy'; can.visible = false;
        const R = Math.sqrt(p.chute.area / Math.PI) * 0.62;
        const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 10, 0, Math.PI * 2, 0.06, Math.PI * 0.4), M.canopy);
        dome.position.y = R * 1.7; can.add(dome);
        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(R * Math.sin(0.46 * Math.PI), R * Math.sin(0.46 * Math.PI) * 0.99, R * 0.05, 32, 1, true), M.canopy);
        skirt.position.y = R * 1.7 + R * Math.cos(0.46 * Math.PI) - R * 0.02; can.add(skirt);
        const lp = []; for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; lp.push(0, 0, 0, Math.cos(t) * R * 0.95, R * 1.7 + R * 0.1, Math.sin(t) * R * 0.95); }
        const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
        can.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.6 })));
        can.position.set(p.surf ? 0.12 : 0, h / 2, 0); can.userData.R = R;
        g.add(can);
        break;
      }
      case 'shield': {
        if (p.id === 'is_whipple') {
          for (let i = 0; i < 3; i++) g.add(put(cyl(r * (1 - i * 0.02), r * (1 - i * 0.02), 0.025, 64, i ? M.metal : M.silver), 0, -h / 2 + 0.02 + i * h * 0.3, 0));
          g.add(put(cyl(r * 0.94, r * 0.94, h * 0.2, 64, M.offwhite), 0, h / 2 - h * 0.1, 0));
          for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; g.add(put(cyl(0.025, 0.025, h * 0.9, 6, M.frame), Math.cos(t) * r * 0.9, 0, Math.sin(t) * r * 0.9)); }
          break;
        }
        // slightly convex ablative dish on a metal carrier ring
        const sh = lathe([[0.001, -h / 2 - 0.06 * r], [r * 0.45, -h / 2 - 0.045 * r], [r * 0.85, -h / 2 - 0.01], [r * 0.97, -h / 2 + 0.02], [r, -h / 2 + 0.06], [r, h / 2 - 0.02], [0.001, h / 2 - 0.02]], M.shield, 64);
        g.add(sh);
        g.add(put(cyl(r * 1.004, r * 1.004, h * 0.35, 64, M.frame), 0, h / 2 - h * 0.18, 0));
        for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; g.add(put(sph(0.01 + r * 0.008, M.chrome, 6), Math.cos(t) * r * 1.006, h / 2 - h * 0.18, Math.sin(t) * r * 1.006)); }
        break;
      }
      case 'leg': {
        // landing leg: fairing housing, primary strut with a chrome shock-absorber piston,
        // secondary A-frame braces and a crushable footpad
        const s = h / 0.8;
        g.add(put(rbox(0.09 * s, h * 0.4, 0.15 * s, 0.025, M.offwhite), 0.045 * s, h * 0.28, 0));
        const piv = new THREE.Group(); piv.name = 'legPivot'; piv.position.set(0.07 * s, h * 0.45, 0);
        piv.add(put(cyl(0.045 * s, 0.04 * s, h * 0.5, 14, M.grey), 0, -h * 0.26, 0));
        piv.add(ring(0.047 * s, 0.006 * s, M.frame, -h * 0.5, 14));
        piv.add(put(cyl(0.024 * s, 0.024 * s, h * 0.42, 14, M.chrome), 0, -h * 0.7, 0));
        for (const z of [-0.06, 0.06]) piv.add(strut(new V3(-0.04 * s, -h * 0.05, z * s), new V3(0.01 * s, -h * 0.62, 0), 0.012 * s, M.frame, 6));
        piv.add(put(sph(0.035 * s, M.metal, 12), 0, -h * 0.92, 0));
        const foot = lathe([[0.001, 0.035 * s], [0.07 * s, 0.03 * s], [0.13 * s, 0.0], [0.145 * s, -0.02 * s], [0.001, -0.025 * s]], M.gold, 28); foot.position.y = -h; piv.add(foot);
        g.add(piv);
        break;
      }
      default: g.add(cyl(r || 0.3, rb || 0.3, h, 24, M.grey));
    }
    g.traverse(o => { if (o.isMesh && !(o.material && o.material.isShaderMaterial)) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  // mesh for an instance (with fairing & orientation)
  function forInstance(inst, opts) {
    const p = PARTS[inst.pid];
    const g = buildPart(p, inst, opts);
    const root = new THREE.Group();
    root.add(g);
    root.position.copy(inst.pos);
    if (inst.ang || p.surf || inst.kind === 'side' || inst.kind === 'conn' || inst.kind === 'surf') root.rotation.y = (inst.ang || 0) - Math.PI / 2;
    root.userData = { iid: inst.iid, uid: inst.uid, pid: inst.pid };
    return root;
  }
  // highlight by swapping materials to emissive clones
  const hiCache = new Map();
  function hiMat(m, color) {
    const key = m.uuid + color;
    if (hiCache.has(key)) return hiCache.get(key);
    const c = m.clone();
    if (c.emissive) { c.emissive = new THREE.Color(color); c.emissiveIntensity = 0.45; }
    hiCache.set(key, c);
    return c;
  }
  function highlight(obj, color) {
    obj.traverse(o => {
      if (!o.isMesh || o.material.type === 'ShaderMaterial') return;
      if (!o.userData.baseMat) o.userData.baseMat = o.material;
      o.material = color ? hiMat(o.userData.baseMat, color) : o.userData.baseMat;
    });
  }
  // ---------- one continuous mesh per vessel ----------
  // Static geometry of every part is baked into a single mesh per material so the launched
  // rocket reads as one vehicle. Moving bits (flames, chutes, legs, panels, fairing halves) stay separate.
  const ANIM = new Set(["flame", "canopy", "legPivot", "stowed", "deployed", "shell", "glow", "statusLight"]);
  function mergeGeos(list) {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of list) {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += c;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    return geo;
  }
  function buildVessel(v) {
    const root = new THREE.Group();
    const buckets = new Map();
    const anim = {};
    for (const p of v.parts) {
      const pr = forInstance({ pos: p.pos, ang: p.ang, kind: p.kind, fair: p.fair, iid: p.iid, pid: p.pid }, { seamless: true });
      pr.updateMatrixWorld(true);
      const a = anim[p.iid] = {};
      const moving = [];
      pr.traverse(o => { if (ANIM.has(o.name)) moving.push(o); });
      for (const o of moving) {
        const m = o.matrixWorld.clone();
        o.parent.remove(o);
        m.decompose(o.position, o.quaternion, o.scale);
        root.add(o); a[o.name] = o;
      }
      pr.updateMatrixWorld(true);
      pr.traverse(o => {
        if (!o.isMesh) return;
        let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
        if (g.index) g = g.toNonIndexed();
        if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        const k = o.material;
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(g);
      });
    }
    const mats = [];
    for (const [mat, list] of buckets) {
      const mm = mat.clone(); mats.push(mm);
      const mesh = new THREE.Mesh(mergeGeos(list), mm);
      mesh.castShadow = true; mesh.receiveShadow = true;
      list.forEach(g => g.dispose());
      root.add(mesh);
    }
    root.userData.anim = anim; root.userData.mats = mats;
    return root;
  }
  function disposeVessel(g) {
    g.traverse(o => { if (o.isMesh && o.parent === g && !o.userData.keep) { o.geometry.dispose(); } });
    (g.userData.mats || []).forEach(m => m.dispose());
  }
  return { forInstance, buildPart, highlight, initMats, flameMat, canvasTex, M, buildVessel, disposeVessel };
})();
