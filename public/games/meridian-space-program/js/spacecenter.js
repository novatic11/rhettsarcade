'use strict';
// ---------- Space center: buildings on the Earth's surface ----------
const SpaceCenter = (function () {
  let group = null, active = false, hover = null, padRocket = null, padDesignKey = null;
  const nightMats = [], spots = [];
  const buildings = [];
  const cam = { yaw: -0.7, pitch: 0.32, dist: 1100, distT: 1100 };
  const camHelio = new V3();
  let enu = null;
  function std(c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75, metalness: 0.05 }, o || {})); }
  function windowsTex(w, h, cols, rows, base, lit) {
    return PartMesh.canvasTex(w, h, (g, W, H) => {
      g.fillStyle = base; g.fillRect(0, 0, W, H);
      const cw = W / cols, rh = H / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { g.fillStyle = Math.random() < lit ? '#ffd98a' : '#1e2833'; g.fillRect(c * cw + cw * 0.2, r * rh + rh * 0.25, cw * 0.6, rh * 0.5); }
    }, 'win' + w + cols + rows + base);
  }
  function build() {
    group = new THREE.Group();
    const E = World.vis.earth;
    // local east-north-up frame at the space center (body-fixed)
    const U = Terrain.kscDir.clone();
    const N = new V3(0, 1, 0).addScaledVector(U, -U.y).normalize();
    const Ea = new V3().crossVectors(N, U);
    const h = Terrain.kscAlt; // the plateau height (the terrain itself is sunk under the grass disc)
    enu = { U, N, E: Ea, origin: U.clone().multiplyScalar(Bodies.byId.earth.R + h) };
    group.position.copy(enu.origin);
    const m = new THREE.Matrix4().makeBasis(Ea, U, N.clone().negate());
    group.quaternion.setFromRotationMatrix(m);
    // local axes: x = east, y = up, z = south
    const T = PartMesh.canvasTex;
    const env = World.env;
    const M = (c, o) => std(c, Object.assign({ envMap: env, envMapIntensity: 0.5 }, o || {}));
    const rep = (t, x, y) => { const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); return c; };
    const grassT = T(512, 512, (g, w, h) => {
      g.fillStyle = '#4a5f34'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, r); const dk = Math.random() < 0.5; gr.addColorStop(0, dk ? 'rgba(40,58,28,0.1)' : 'rgba(110,128,62,0.09)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      for (let i = 0; i < 16000; i++) { const v = Math.random(); g.strokeStyle = `rgba(${55 + v * 60},${80 + v * 60},${35 + v * 25},0.5)`; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 2, y - 2 - Math.random() * 3); g.stroke(); }
    }, 'sc_grass2');
    const concT = T(256, 256, (g, w, h) => { g.fillStyle = '#9b9a95'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1800; i++) { const v = 130 + Math.random() * 50; g.fillStyle = `rgba(${v},${v},${v - 4},0.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } g.strokeStyle = 'rgba(40,40,40,.35)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, 'sc_conc');
    const asphT = T(256, 64, (g, w, h) => { g.fillStyle = '#3e4044'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const v = 50 + Math.random() * 30; g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); } g.fillStyle = '#e8d36a'; for (let x = 0; x < w; x += 32) g.fillRect(x, h / 2 - 1, 18, 2); g.fillStyle = '#ddd'; g.fillRect(0, 3, w, 2); g.fillRect(0, h - 5, w, 2); }, 'sc_asph');
    const ribT = T(256, 256, (g, w, h) => { g.fillStyle = '#d7dad6'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { g.fillStyle = '#c3c6c2'; g.fillRect(x, 0, 2, h); g.fillStyle = '#e8eae7'; g.fillRect(x + 3, 0, 2, h); } g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, h - 3, w, 3); }, 'sc_rib');
    const glassT = T(256, 256, (g, w, h) => { g.fillStyle = '#20324a'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(160,200,240,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#8b939b'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h); for (let y = 0; y < h; y += 42) g.fillRect(0, y, w, 3); }, 'sc_glass');
    const winT = (cols, rows, base, key) => T(256, 128, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const cw = w / cols, rh = h / rows; for (let r = 0; r < rows; r++) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, r * rh + rh * 0.86, w, 2); for (let c = 0; c < cols; c++) { g.fillStyle = Math.random() < 0.3 ? '#3d5470' : '#22344a'; g.fillRect(c * cw + cw * 0.15, r * rh + rh * 0.22, cw * 0.7, rh * 0.5); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(c * cw + cw * 0.15, r * rh + rh * 0.22, cw * 0.7, 2); } } }, 'sc_win' + key);
    // emissive twin of a window texture: random offices lit at night
    const winE = (cols, rows, key) => T(256, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const cw = w / cols, rh = h / rows; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (Math.random() < 0.55) { g.fillStyle = Math.random() < 0.8 ? '#ffcf7a' : '#cfe6ff'; g.fillRect(c * cw + cw * 0.15, r * rh + rh * 0.22, cw * 0.7, rh * 0.5); } }, 'sc_winE' + key);
    const lit = (mat, cols, rows, key) => { mat.emissiveMap = winE(cols, rows, key); mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = 0; nightMats.push(mat); return mat; };
    const D = MatKit.D;
    const repSet = (set, x, y) => { const o = {}; for (const k of ['map', 'normalMap', 'roughnessMap']) if (set[k]) { const t = set[k].clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); o[k] = t; } return o; };
    const grassSet = MatKit.make('sc_grass3', {
      w: 512, h: 512, normal: 2.2,
      color: (g, w, h) => { g.drawImage(grassT.image, 0, 0, w, h); D.blotch(g, w, h, 30, 'rgba(120,110,60,0.08)', 20, 70); },
      height: (g, w, h) => { for (let i = 0; i < 16000; i++) { const v = Math.round(D.rnd() * 255); g.strokeStyle = `rgba(${v},${v},${v},0.55)`; const x = D.rnd() * w, y = D.rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (D.rnd() - 0.5) * 2, y - 2 - D.rnd() * 3); g.stroke(); } D.lumps(g, w, h, 60, 10, 40, 0.25); },
      rough: (g, w, h) => D.fill(g, w, h, 'rgb(240,240,240)'),
    });
    const grass = MatKit.mat(repSet(grassSet, 60, 60), { roughness: 1, envMapIntensity: 0.15 });
    const concSet = MatKit.make('sc_conc3', {
      w: 512, h: 512, normal: 2.5,
      color: (g, w, h) => { D.fill(g, w, h, '#a19f99'); D.tint(g, w, h, 30000, [158, 156, 150], 30, 0.35, 2); D.blotch(g, w, h, 25, 'rgba(70,66,60,0.08)', 20, 90); D.blotch(g, w, h, 12, 'rgba(200,198,190,0.08)', 30, 90); g.fillStyle = 'rgba(50,50,50,0.4)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); g.fillRect(0, h / 2, w, 2); g.fillRect(w / 2, 0, 2, h); },
      height: (g, w, h) => { D.speckle(g, w, h, 30000, 128, 70, 0.35, 2); D.groove(g, 0, 1, w, 1, 4); D.groove(g, 1, 0, 1, h, 4); D.groove(g, 0, h / 2, w, h / 2, 3); D.groove(g, w / 2, 0, w / 2, h, 3); g.strokeStyle = '#555'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { let x = D.rnd() * w, y = D.rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (D.rnd() - 0.5) * 30; y += (D.rnd() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); } },
      rough: (g, w, h) => { D.fill(g, w, h, 'rgb(230,230,230)'); D.blotch(g, w, h, 10, 'rgba(160,160,160,0.3)', 30, 90); },
    });
    const concT2 = concSet.map;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1500, 96), grass);
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0.05; group.add(ground);
    const conc = MatKit.mat(repSet(concSet, 6, 6), { roughness: 1 });
    const asph = M(0xffffff, { map: asphT, roughness: 0.95, envMapIntensity: 0.2 });
    const metal = M(0xc9ccd0, { metalness: 0.75, roughness: 0.35, envMapIntensity: 1 });
    const darkMetal = M(0x3a3d42, { metalness: 0.6, roughness: 0.45 });
    const white = M(0xeceeec, { roughness: 0.55 });
    const glassN = MatKit.make('sc_glassN', { w: 256, h: 256, normal: 3, height: (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = '#e0e0e0'; g.fillRect(x, 0, 3, h); } for (let y = 0; y < h; y += 42) { g.fillStyle = '#e0e0e0'; g.fillRect(0, y, w, 3); } } });
    const glass = M(0xffffff, { map: glassT, normalMap: glassN.normalMap, metalness: 0.7, roughness: 0.08, envMapIntensity: 1.4 });
    const box = (w, h, d, mat, x, y, z, p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (p || group).add(m); return m; };
    const cylM = (rt, rb, h, seg, mat, x, y, z, p) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); (p || group).add(m); return m; };
    // roads with lane markings
    // each road sits a little higher than the last, so crossings and junctions never share a plane
    let roadN = 0;
    const road = (x1, z1, x2, z2, w) => {
      const L = Math.hypot(x2 - x1, z2 - z1);
      const t = asphT.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(L / 40, 1);
      const r = new THREE.Mesh(new THREE.BoxGeometry(L, 0.1, w), M(0xffffff, { map: t, roughness: 0.95, envMapIntensity: 0.15 }));
      r.position.set((x1 + x2) / 2, 0.12 + 0.03 * roadN++, (z1 + z2) / 2); r.rotation.y = -Math.atan2(z2 - z1, x2 - x1); group.add(r);
    };
    road(-260, 60, 380, -180, 14); road(-260, 60, -40, 300, 12); road(-40, 300, 260, 260, 12); road(260, 260, 380, -180, 10); road(380, -180, 520, -520, 16);
    // parking lots with cars
    const mergeG = (list) => { let n = 0; const ni = list.map(gg => gg.index ? gg.toNonIndexed() : gg); ni.forEach(gg => n += gg.attributes.position.count); const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0; for (const gg of ni) { pos.set(gg.attributes.position.array, o * 3); nor.set(gg.attributes.normal.array, o * 3); o += gg.attributes.position.count; } const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out; };
    const carBody = (() => { const s = new THREE.Shape(); s.moveTo(-2.2, 0.3); s.lineTo(2.1, 0.3); s.quadraticCurveTo(2.25, 0.32, 2.25, 0.6); s.lineTo(2.15, 0.95); s.lineTo(0.9, 1.0); s.lineTo(-2.0, 1.0); s.quadraticCurveTo(-2.22, 0.98, -2.22, 0.7); s.closePath(); const g2 = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 }); g2.translate(0, 0, -0.8); return g2; })();
    const carGlass = (() => { const s = new THREE.Shape(); s.moveTo(-1.6, 0); s.lineTo(0.8, 0); s.lineTo(0.2, 0.55); s.lineTo(-1.3, 0.55); s.closePath(); const g2 = new THREE.ExtrudeGeometry(s, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 }); g2.translate(0, 1.0, -0.7); return g2; })();
    const carWheels = mergeG([[-1.35, -0.85], [-1.35, 0.85], [1.35, -0.85], [1.35, 0.85]].map(([x, z]) => { const w = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16); w.rotateX(Math.PI / 2); w.translate(x, 0.34, z); return w; }));
    const carGeo = carBody;
    const lots = [[-120, 150, 70, 40], [190, 320, 70, 30], [-200, 260, 50, 30]];
    let carN = 0; lots.forEach(l => carN += Math.floor(l[2] / 3) * Math.floor(l[3] / 7));
    const cars = new THREE.InstancedMesh(carGeo, M(0xffffff, { metalness: 0.6, roughness: 0.3, envMapIntensity: 1.1 }), carN);
    const carsG = new THREE.InstancedMesh(carGlass, M(0x0d1217, { metalness: 0.9, roughness: 0.05, envMapIntensity: 1.5 }), carN);
    const carsW = new THREE.InstancedMesh(carWheels, M(0x151515, { roughness: 0.9 }), carN);
    const col = new THREE.Color(), mm = new THREE.Matrix4();
    let ci = 0;
    for (const [cx, cz, w, d] of lots) {
      box(w, 0.08, d, asph, cx, 0.1, cz);
      for (let x = 0; x < Math.floor(w / 3); x++) for (let z = 0; z < Math.floor(d / 7); z++) {
        if (Math.random() < 0.35) { mm.makeScale(0, 0, 0); cars.setMatrixAt(ci, mm); carsG.setMatrixAt(ci, mm); carsW.setMatrixAt(ci, mm); cars.setColorAt(ci, col.set(0x000000)); ci++; continue; }
        mm.makeRotationY(Math.PI / 2 + (Math.random() < 0.5 ? Math.PI : 0)); mm.scale(new V3(0.85, 0.85, 0.85)); mm.setPosition(cx - w / 2 + 1.5 + x * 3, 0.15, cz - d / 2 + 3.5 + z * 7);
        cars.setMatrixAt(ci, mm); carsG.setMatrixAt(ci, mm); carsW.setMatrixAt(ci, mm); cars.setColorAt(ci, col.setHSL(Math.random(), Math.random() < 0.5 ? 0.05 : 0.6, 0.25 + Math.random() * 0.5)); ci++;
      }
    }
    group.add(cars, carsG, carsW);
    // --- Assembly building: tall ribbed high bay, huge segmented door, low bay annex ---
    const vab = new THREE.Group(); vab.position.set(-260, 0, 60);
    const facade = T(512, 512, (g, w, h) => {
      g.fillStyle = '#d7dad6'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 8) { g.fillStyle = '#c3c6c2'; g.fillRect(x, 0, 2, h); }
      g.fillStyle = '#2b2f36'; g.fillRect(w * 0.3, h * 0.08, w * 0.4, h * 0.92);
      g.fillStyle = '#3a4048'; for (let y = h * 0.1; y < h; y += h * 0.06) g.fillRect(w * 0.3, y, w * 0.4, 3);
      g.strokeStyle = '#596270'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, h * 0.08); g.lineTo(w / 2, h); g.stroke();
      g.fillStyle = '#123a6e'; g.fillRect(w * 0.04, h * 0.1, w * 0.2, w * 0.2);
      g.strokeStyle = '#f2c230'; g.lineWidth = 8; g.beginPath(); g.ellipse(w * 0.14, h * 0.1 + w * 0.1, w * 0.08, w * 0.035, -0.4, 0, 7); g.stroke();
      g.fillStyle = '#f2f2ee'; g.beginPath(); g.arc(w * 0.14, h * 0.1 + w * 0.1, w * 0.025, 0, 7); g.fill();
      g.fillStyle = '#2b5ea8'; g.fillRect(0, h * 0.03, w, h * 0.025);
      g.fillStyle = '#20242a'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.fillText('MERIDIAN', w * 0.85, h * 0.2);
    }, 'sc_vabfront');
    const ribN = MatKit.make('sc_ribN', { w: 256, h: 256, normal: 4, height: (g, w, h) => { for (let x = 0; x < w; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, '#606060'); gr.addColorStop(0.35, '#d8d8d8'); gr.addColorStop(0.7, '#a0a0a0'); gr.addColorStop(1, '#606060'); g.fillStyle = gr; g.fillRect(x, 0, 8, h); } D.groove(g, 0, h - 2, w, h - 2, 3); } });
    const ribNorm = ribN.normalMap.clone(); ribNorm.needsUpdate = true; ribNorm.repeat.set(10, 12); ribNorm.wrapS = ribNorm.wrapT = THREE.RepeatWrapping;
    const side = M(0xffffff, { map: rep(ribT, 10, 12), normalMap: ribNorm, roughness: 0.55, metalness: 0.35, envMapIntensity: 0.7 });
    const front = M(0xffffff, { map: facade, roughness: 0.55 });
    const vb = new THREE.Mesh(new THREE.BoxGeometry(110, 150, 90), [side, side, M(0x6e7276, { roughness: 0.9 }), side, front, side]);
    vb.position.y = 75; vab.add(vb);
    box(112, 2.5, 92, darkMetal, 0, 151, 0, vab);                                   // roof parapet
    for (const x of [-56, 56]) for (const z of [-46, 46]) box(3, 152, 3, white, x, 76, z, vab);
    box(46, 1.2, 8, metal, 0, 140, 46, vab);                                       // door header
    const ann = lit(M(0xffffff, { map: winT(14, 4, '#c6c9c5', 'ann'), roughness: 0.6 }), 14, 4, 'ann');
    box(75, 40, 64, ann, 92, 20, 8, vab); box(77, 1.5, 66, darkMetal, 92, 40.5, 8, vab);
    box(18, 6, 10, glass, 92, 3, 41, vab); box(22, 0.8, 14, white, 92, 6.5, 43, vab); // entrance canopy
    for (let i = 0; i < 5; i++) cylM(1.2, 1.2, 4, 10, metal, 70 + i * 10, 42.8, -14, vab); // roof units
    box(110, 0.1, 30, conc, 0, 0.32, 60, vab);                                    // apron
    group.add(vab);
    // --- Research center: glass curtain wall, planetarium dome, observatory ---
    const rnd = new THREE.Group(); rnd.position.set(-40, 0, 300);
    box(110, 24, 46, lit(M(0xffffff, { map: winT(18, 3, '#e5e4df', 'lab'), roughness: 0.6 }), 18, 3, 'lab'), 0, 12, 0, rnd);
    box(60, 24.2, 4, glass, 15, 12, -21.5, rnd);
    box(112, 1.5, 48, darkMetal, 0, 24.7, 0, rnd);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(24, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2), M(0x9fc4e6, { metalness: 0.8, roughness: 0.12, envMapIntensity: 1.3 }));
    dome.position.set(-28, 25, 0); rnd.add(dome);
    const ribs = new THREE.Mesh(new THREE.SphereGeometry(24.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5b6470, wireframe: true }));
    ribs.position.copy(dome.position); rnd.add(ribs);
    cylM(25, 25, 1.2, 40, white, -28, 25, 0, rnd);
    cylM(9, 9, 16, 32, white, 40, 32, 5, rnd);
    const obsD = new THREE.Mesh(new THREE.SphereGeometry(9.6, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), metal); obsD.position.set(40, 40, 5); rnd.add(obsD);
    box(2.5, 9, 19.5, darkMetal, 40, 44, 5, rnd);                                   // observatory slit
    cylM(14, 14, 0.3, 40, conc, 0, 0.15, -45, rnd); cylM(6, 6, 0.6, 24, M(0x3b6b2e, { roughness: 1 }), 0, 0.3, -45, rnd);
    group.add(rnd);
    // --- Mission control: angled glass front, antenna farm on the roof ---
    const mc = new THREE.Group(); mc.position.set(260, 0, 260);
    box(84, 30, 48, lit(M(0xffffff, { map: winT(16, 4, '#d5d7d3', 'mc'), roughness: 0.6 }), 16, 4, 'mc'), 0, 15, 0, mc);
    const gf = new THREE.Mesh(new THREE.BoxGeometry(84, 22, 3), glass); gf.position.set(0, 22, -25.5); gf.rotation.x = 0.35; mc.add(gf);
    box(86, 1.5, 50, darkMetal, 0, 30.7, 0, mc);
    const mast = cylM(0.6, 1.2, 44, 8, metal, 32, 52, 12, mc);
    for (let y = 40; y < 72; y += 8) box(5, 0.3, 0.3, metal, 32, y, 12, mc);
    for (const [x, z, s] of [[-25, 10, 4], [-12, 12, 3], [5, 14, 3.5]]) {
      const d = new THREE.Group(); d.position.set(x, 32 + s, z);
      const prof = []; for (let i = 0; i <= 10; i++) { const r = s * i / 10; prof.push(new THREE.Vector2(r, r * r / (s * 2.4))); }
      d.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 32), M(0xf1f1ee, { side: THREE.DoubleSide, roughness: 0.4 })));
      d.rotation.x = -0.9; d.rotation.y = x * 0.1; cylM(0.4, 0.6, s, 8, metal, x, 31 + s / 2, z, mc); mc.add(d);
    }
    const scr = T(256, 128, (g, w, h) => { g.fillStyle = '#05080d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4fd1ff'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x < w; x++) g.lineTo(x, h / 2 + Math.sin(x / 20) * h * 0.3); g.stroke(); g.fillStyle = '#ffb43c'; g.font = 'bold 20px monospace'; g.fillText('T-00:00', 12, 26); }, 'sc_screen');
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), new THREE.MeshBasicMaterial({ map: scr })); sm.position.set(-24, 15, -24.2); sm.rotation.y = Math.PI; mc.add(sm);
    group.add(mc);
    // --- Tracking station: alt-azimuth dishes with back structure and subreflectors ---
    const ts = new THREE.Group(); ts.position.set(380, 0, -180);
    box(44, 14, 30, lit(M(0xffffff, { map: winT(10, 2, '#e2e2dc', 'ts'), roughness: 0.6 }), 10, 2, 'ts'), 0, 7, 0, ts);
    box(46, 1.2, 32, darkMetal, 0, 14.6, 0, ts);
    const dishMat = M(0xf4f4f1, { side: THREE.DoubleSide, roughness: 0.35, metalness: 0.2, envMapIntensity: 0.8 });
    const dishes = [];
    [[-60, 32, 24], [58, 22, 17], [4, -58, 20]].forEach(([x, z, R]) => {
      cylM(R * 0.42, R * 0.5, 2, 24, conc, x, 1, z, ts);
      const az = new THREE.Group(); az.position.set(x, 2, z); ts.add(az);
      cylM(R * 0.18, R * 0.24, R * 0.75, 16, white, 0, R * 0.37, 0, az);
      for (const s of [-1, 1]) box(1.2, R * 0.55, 2.2, white, s * R * 0.3, R * 0.95, 0, az);
      const d = new THREE.Group(); d.position.set(0, R * 1.1, 0);
      const prof = []; for (let i = 0; i <= 16; i++) { const r = R * i / 16; prof.push(new THREE.Vector2(r, r * r / (R * 2.4))); }
      d.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 56), dishMat));
      const back = new THREE.Mesh(new THREE.ConeGeometry(R * 0.7, R * 0.35, 12, 1, true), M(0xbfc3c7, { wireframe: true }));
      back.position.y = -R * 0.12; back.rotation.x = Math.PI; d.add(back);
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const p1 = new V3(Math.cos(a) * R * 0.62, R * 0.17, Math.sin(a) * R * 0.62), p2 = new V3(0, R * 0.6, 0); const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, p1.distanceTo(p2), 6), metal); leg.position.copy(p1).add(p2).multiplyScalar(0.5); leg.quaternion.setFromUnitVectors(new V3(0, 1, 0), p2.clone().sub(p1).normalize()); d.add(leg); }
      cylM(R * 0.08, R * 0.05, 0.6, 16, metal, 0, R * 0.6, 0, d);
      d.rotation.x = -0.75; az.add(d); dishes.push(az);
      az.rotation.y = Math.random() * 6;
    });
    group.add(ts);
    // --- Launch pad: concrete deck, flame trench, service tower, lightning masts, propellant spheres ---
    const lp = new THREE.Group(); lp.position.set(520, 0, -520);
    const deckT = T(512, 512, (g, w, h) => { g.drawImage(concT.image, 0, 0, w, h); g.strokeStyle = '#d8c23a'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w * 0.18, 0, 7); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2, h - 20); g.moveTo(20, h / 2); g.lineTo(w - 20, h / 2); g.stroke(); g.strokeStyle = 'rgba(30,30,30,.4)'; g.lineWidth = 2; for (let i = 0; i < w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, 'sc_deck');
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(42, 47, 3, 8), [M(0xffffff, { map: rep(concT, 8, 1), roughness: 0.95 }), M(0xffffff, { map: deckT, roughness: 0.92 }), conc]);
    deck.position.y = 1.5; deck.rotation.y = Math.PI / 8; lp.add(deck);
    box(8, 0.06, 28, M(0x2e2f31, { roughness: 1 }), 0, 3.02, 22, lp);
    for (const s of [-1, 1]) box(1.2, 1.4, 28, conc, s * 4.6, 3.7, 22, lp);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 40), conc); ramp.position.set(-22, 1.4, -48); ramp.rotation.x = 0.07; lp.add(ramp);
    const tower = new THREE.Group(); tower.position.set(-17, 3, 0);
    const steel = M(0xb84a2a, { roughness: 0.55, metalness: 0.45 });
    const beam = (x1, y1, z1, x2, y2, z2, w) => { const a = new V3(x1, y1, z1), b2 = new V3(x2, y2, z2); const L = a.distanceTo(b2); const m = new THREE.Mesh(new THREE.BoxGeometry(w, L, w), steel); m.position.copy(a).add(b2).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), b2.clone().sub(a).normalize()); tower.add(m); };
    const TH = 66;
    for (const [x, z] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) beam(x, 0, z, x, TH, z, 0.8);
    for (let y = 0; y < TH; y += 5.5) {
      beam(-3.5, y, -3.5, 3.5, y, -3.5, 0.35); beam(-3.5, y, 3.5, 3.5, y, 3.5, 0.35); beam(-3.5, y, -3.5, -3.5, y, 3.5, 0.35); beam(3.5, y, -3.5, 3.5, y, 3.5, 0.35);
      if (y + 5.5 <= TH) { beam(-3.5, y, -3.5, 3.5, y + 5.5, -3.5, 0.25); beam(3.5, y, 3.5, -3.5, y + 5.5, 3.5, 0.25); beam(-3.5, y, 3.5, -3.5, y + 5.5, -3.5, 0.25); beam(3.5, y, -3.5, 3.5, y + 5.5, 3.5, 0.25); }
    }
    for (const y of [24, 44]) { beam(3.5, y, 0, 13, y, 0, 0.6); box(3, 0.3, 2.5, darkMetal, 30, 3 + y, 0, lp); }
    box(9, 5, 9, M(0xeceeec), 0, TH + 2.5, 0, tower);
    box(3, TH, 3, M(0x8d9298, { metalness: 0.4, roughness: 0.6 }), 0, TH / 2, 0, tower);            // elevator core
    for (let y = 5.5; y < TH; y += 11) box(7.6, 0.25, 7.6, M(0x3a3d42, { metalness: 0.5 }), 0, y, 0, tower); // grated levels
    // crew access arm: walkway with railings and the white room at its tip
    const caY = TH - 12;
    box(10.5, 0.5, 2.2, darkMetal, 9, caY, 0, tower);
    for (const z of [-1.05, 1.05]) { box(10.5, 0.08, 0.08, metal, 9, caY + 1.1, z, tower); for (let x = 4.5; x <= 14; x += 1.5) box(0.08, 1.1, 0.08, metal, x, caY + 0.55, z, tower); }
    box(3, 2.8, 3, M(0xf2f2ee), 15.2, caY + 1.4, 0, tower);
    // tail-service and umbilical hoses drooping from the swing arms toward the vehicle
    const hoseM = M(0x1e1f22, { roughness: 0.8 });
    for (const y of [24, 44]) for (const z of [-0.6, 0.6]) { const c = new THREE.CatmullRomCurve3([new V3(13, y, z), new V3(14.6, y - 2.2, z * 1.5), new V3(15.6, y - 1.2, z * 1.2)]); tower.add(new THREE.Mesh(new THREE.TubeGeometry(c, 12, 0.18, 8), hoseM)); }
    // lightning mast on the tower and catenary wires to ground anchors
    cylM(0.25, 0.4, 14, 8, metal, 0, TH + 12, 0, tower);
    const wires = []; for (const [ax, az] of [[80, 60], [80, -60], [-90, 60], [-90, -60]]) wires.push(-17, TH + 21, 0, ax, 0.5, az);
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
    lp.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.6 })));
    lp.add(tower);
    // propellant feed lines from the storage spheres to the deck, on pipe stands
    for (const z of [-10, 20]) { const L = 70 - 30; const pl = cylM(0.45, 0.45, L, 10, metal, 50, 1.2, z * 0.6, lp); pl.rotation.z = Math.PI / 2; for (let x = 32; x < 70; x += 6) box(0.3, 1.2, 0.3, darkMetal, x, 0.6, z * 0.6, lp); }
    // sound-suppression water pipes ringing the deck
    const ringP = new THREE.Mesh(new THREE.TorusGeometry(40, 0.5, 8, 64), metal); ringP.rotation.x = Math.PI / 2; ringP.position.y = 3.6; lp.add(ringP);
    for (const [x, z] of [[34, 34], [-34, 34], [34, -34], [-34, -34]]) {
      cylM(0.35, 0.8, 80, 8, M(0xd0d2d4, { metalness: 0.5 }), x, 40, z, lp);
      // floodlights that switch on after dark
      const lamp = box(2.4, 1.2, 1.2, M(0xffffff, { emissive: new THREE.Color(0xfff2d0), emissiveIntensity: 0 }), x * 0.97, 34, z * 0.97, lp); nightMats.push(lamp.material);
      const sp = new THREE.SpotLight(0xffe8c8, 0, 260, 0.42, 0.7, 1); sp.position.set(x * 0.97, 34, z * 0.97); sp.target.position.set(0, 22, 0);
      lp.add(sp); lp.add(sp.target); spots.push(sp);
    }
    const sph = M(0xf0f0ec, { metalness: 0.3, roughness: 0.35, envMapIntensity: 0.9 });
    for (const [x, z, r] of [[70, -10, 9], [70, 20, 7]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), sph); s.position.set(x, r + 4, z); lp.add(s); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; cylM(0.35, 0.35, r + 4, 6, metal, x + Math.cos(a) * r * 0.8, (r + 4) / 2, z + Math.sin(a) * r * 0.8, lp); } }
    const wt = new THREE.Group(); wt.position.set(-70, 0, 30); lp.add(wt);
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.78; cylM(0.4, 0.4, 36, 6, metal, Math.cos(a) * 5, 18, Math.sin(a) * 5, wt); }
    cylM(7, 7, 10, 24, M(0xeceeec), 0, 41, 0, wt); const wtt = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3, 24), darkMetal); wtt.position.y = 47.5; wt.add(wtt);
    group.add(lp);
    // trees around the campus (kept off roads and buildings)
    // two tree shapes: tropical broadleaf (lumpy canopy) and slimmer conifers, lit and shadowed
    const lumpy = (geo, amt) => { const p = geo.attributes.position, d = new V3(); for (let i = 0; i < p.count; i++) { d.fromBufferAttribute(p, i); d.multiplyScalar(1 + amt * Noise.n3(d.x * 2.1 + 5, d.y * 2.1, d.z * 2.1)); p.setXYZ(i, d.x, d.y, d.z); } geo.computeVertexNormals(); return geo; };
    const tg = mergeG([[0, 2.7, 0, 1], [0.55, 2.35, 0.2, 0.7], [-0.5, 2.4, -0.25, 0.72], [0.1, 2.3, -0.6, 0.65], [-0.15, 3.15, 0.25, 0.6]].map(([x, y, z, s]) => { const sg = lumpy(new THREE.SphereGeometry(1, 12, 9), 0.25); sg.scale(s * 1.1, s * 0.9, s * 1.1); sg.translate(x, y, z); return sg; }));
    const cg = new THREE.ConeGeometry(0.9, 3.4, 9, 3); lumpy(cg, 0.1); cg.translate(0, 2.7, 0);
    const trunk = new THREE.CylinderGeometry(0.14, 0.22, 2.2, 7); trunk.translate(0, 1.1, 0);
    const NT = World.quality === 'low' ? 180 : 620;
    const leaf = M(0x4f7a35, { roughness: 0.9, envMapIntensity: 0.25 });
    const crowns = new THREE.InstancedMesh(tg, leaf, NT);
    const cones = new THREE.InstancedMesh(cg, M(0x34592b, { roughness: 0.9, envMapIntensity: 0.25 }), NT);
    const trunks = new THREE.InstancedMesh(trunk, M(0x5a4030, { roughness: 1, envMapIntensity: 0.1 }), NT);
    const tint = new THREE.Color();
    const keep = [[-260, 60, 120], [-40, 300, 90], [260, 260, 80], [380, -180, 110], [520, -520, 110], [-120, 150, 50], [190, 320, 45]];
    let k2 = 0;
    for (let tries = 0; tries < NT * 6 && k2 < NT; tries++) {
      const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 1250;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue;
      const s = 1.6 + Math.random() * 2.2;
      mm.makeRotationY(Math.random() * 6.28); mm.scale(new V3(s, s * (0.85 + Math.random() * 0.45), s)); mm.setPosition(x, 0, z);
      const conifer = Math.random() < 0.3;
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      crowns.setMatrixAt(k2, conifer ? zero : mm); cones.setMatrixAt(k2, conifer ? mm : zero); trunks.setMatrixAt(k2, mm);
      tint.setHSL(0.27 + Math.random() * 0.06, 0.35 + Math.random() * 0.2, 0.75 + Math.random() * 0.4); crowns.setColorAt(k2, tint); cones.setColorAt(k2, tint);
      k2++;
    }
    crowns.count = cones.count = trunks.count = k2;
    group.add(crowns, cones, trunks);
    // palms: curved trunk with ring scars and a crown of drooping, cut-out fronds
    const frondT = T(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#3d5a22'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); for (let x = 6; x < w - 4; x += 5) { const L = (h / 2 - 2) * Math.sin(Math.PI * x / w) * (0.8 + Math.random() * 0.2); g.strokeStyle = `rgb(${60 + Math.random() * 30},${100 + Math.random() * 40},${40 + Math.random() * 20})`; g.lineWidth = 2.2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + 6, h / 2 + s * L); g.stroke(); } } }, 'sc_frond');
    const frondGeo = mergeG(Array.from({ length: 9 }, (_, i) => { const p = new THREE.PlaneGeometry(3.4, 0.9, 6, 1); const pa = p.attributes.position; for (let k = 0; k < pa.count; k++) { const x = pa.getX(k) + 1.7; pa.setX(k, x); pa.setZ(k, -0.12 * x * x); } p.rotateX(-Math.PI / 2 + 0.25); p.rotateY(i / 9 * Math.PI * 2 + Math.random() * 0.3); p.translate(0, 7.2, 0); return p; }));
    { const uv = new Float32Array(frondGeo.attributes.position.count * 2); const tmp = Array.from({ length: 9 }, () => { const p = new THREE.PlaneGeometry(3.4, 0.9, 6, 1); return p.toNonIndexed().attributes.uv.array; }); let o = 0; for (const a of tmp) { uv.set(a, o); o += a.length; } frondGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
    const palmTrunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(0.15, 2.5, 0), new V3(0.5, 5, 0), new V3(0.9, 7.2, 0)]), 16, 0.2, 8, false);
    const NP = World.quality === 'low' ? 40 : 160;
    const palms = new THREE.InstancedMesh(palmTrunk, M(0x8a7a64, { roughness: 1, envMapIntensity: 0.1, map: T(64, 256, (g, w, h) => { g.fillStyle = '#857560'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 6) { g.fillStyle = 'rgba(60,50,40,0.5)'; g.fillRect(0, y, w, 2); } }, 'sc_palmbark') }), NP);
    const fronds = new THREE.InstancedMesh(frondGeo, M(0xffffff, { map: frondT, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, envMapIntensity: 0.2 }), NP);
    let kp = 0;
    for (let tries = 0; tries < NP * 8 && kp < NP; tries++) {
      const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 700, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr)) continue;
      const s = 0.8 + Math.random() * 0.5;
      mm.makeRotationY(Math.random() * 6.28); mm.scale(new V3(s, s * (0.9 + Math.random() * 0.4), s)); mm.setPosition(x, 0, z);
      palms.setMatrixAt(kp, mm); fronds.setMatrixAt(kp, mm); kp++;
    }
    palms.count = fronds.count = kp; group.add(palms, fronds);
    fronds.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: frondT, alphaTest: 0.5 }); // leaf-shaped shadows
    group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    ground.castShadow = false; crowns.receiveShadow = false;
    E.spin.add(group);
    const B = (id, name, desc, obj, labelY) => buildings.push({ id, name, desc, obj, labelY });
    B('editor', 'Assembly Building', 'Design, save and launch rockets', vab, 165);
    B('research', 'Research Center', 'Spend science on new technology', rnd, 55);
    B('missions', 'Mission Control', 'Choose missions and collect rewards', mc, 80);
    B('tracking', 'Tracking Station', 'See the Solar System and your spacecraft', ts, 50);
    B('launch', 'Launch Pad', 'Launch your current design', lp, 70);
    group.userData.dishes = dishes;
    group.userData.pad = lp;
  }
  function open() {
    if (!group) build();
    padBF();
    active = true;
    group.visible = true;
    $('#center').hidden = false;
    Sound.setMood('center');
    renderList(); updatePadRocket(); if (padRocket) padRocket.visible = true;
    Tutorial.show('center');
  }
  // called every frame near Earth: night 0 (day) .. 1 (full night)
  function lights(night) {
    if (!group) return;
    const k = smooth(0.35, 0.85, night);
    for (const m of nightMats) m.emissiveIntensity = k * (Post.enabled ? 2.2 : 1.1);
    for (const s of spots) s.intensity = k * 3.5;
  }
  function close() { active = false; $('#center').hidden = true; hideLabel(); if (padRocket) padRocket.visible = false; }
  // launch site in Earth body-fixed coordinates (the pad deck)
  function padBF() { if (!group) build(); const p = enu.origin.clone().addScaledVector(enu.E, 520).addScaledVector(enu.N, 520); Terrain.setPad(p, 3.05); return p; }
  function updatePadRocket() {
    const d = Save.prog.lastDesign;
    const key = d ? JSON.stringify(d.stack.map(n => n.pid)) + JSON.stringify(d).length : null;
    if (key === padDesignKey) return;
    padDesignKey = key;
    const lp = group.userData.pad;
    if (padRocket) { lp.remove(padRocket); PartMesh.disposeVessel(padRocket); padRocket = null; }
    if (!d || !d.stack.length) return;
    try {
      const v = Vessel.fromDesign(Design.clone(d), -1);
      padRocket = PartMesh.buildVessel(v);
      const ext = Vessel.extents(v);
      padRocket.position.y = 3 - ext.minY;
      lp.add(padRocket);
    } catch (e) { console.warn(e); }
  }
  function renderList() {
    const box = $('#bldList'); box.innerHTML = '';
    for (const b of buildings) {
      const btn = el('button', 'bld', `<b>${b.name}</b><span>${b.desc}</span>`);
      btn.onmouseenter = () => { hover = b; };
      btn.onmouseleave = () => { hover = null; };
      btn.onclick = () => openBuilding(b.id);
      box.appendChild(btn);
    }
    $('#scScience').textContent = fmtNum(Save.prog.science, 1);
  }
  function openBuilding(id) {
    Sound.fx.click();
    if (id === 'launch') { const d = Save.prog.lastDesign; if (!d || !d.stack.length) { toast('No design yet. Build a rocket in the Assembly Building first.', 'warn'); return; } Game.launchDesign(Design.clone(d)); return; }
    Game.goto(id);
  }
  function update(dt) {
    if (!active) return;
    Game.time += dt;
    Bodies.update(Game.time);
    const earth = Bodies.byId.earth;
    cam.dist = lerp(cam.dist, cam.distT, Math.min(1, dt * 5));
    if (!drag) cam.yaw += dt * 0.012;
    // camera in local ENU, then to inertial
    const tgtL = new V3(150, 30, -40);
    const cp = Math.cos(cam.pitch);
    const offL = new V3(Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp).multiplyScalar(cam.dist);
    const toBF = (l) => enu.origin.clone().addScaledVector(enu.E, l.x).addScaledVector(enu.U, l.y).addScaledVector(enu.N, -l.z);
    const tgtBF = toBF(tgtL), camBF = toBF(tgtL.clone().add(offL));
    const tgtH = Bodies.fromBF(earth, tgtBF, Game.time, new V3()).add(earth.pos);
    camHelio.copy(Bodies.fromBF(earth, camBF, Game.time, new V3()).add(earth.pos));
    const C = World.camera;
    C.position.set(0, 0, 0);
    C.up.copy(Bodies.fromBF(earth, enu.U, Game.time, new V3()).normalize());
    C.lookAt(tgtH.clone().sub(camHelio));
    C.near = 1; C.updateProjectionMatrix(); C.updateMatrixWorld();
    const fp = Bodies.fromBF(earth, toBF(new V3(150, 0, -150)), Game.time, new V3()).add(earth.pos).sub(camHelio);
    World.setFocus(fp, 720);
    World.update(camHelio, Game.time, earth, dt);
    for (const d of group.userData.dishes) d.rotation.y += dt * 0.05;
    // hover highlight
    for (const b of buildings) b.obj.traverse(o => { if (o.isMesh && o.material && o.material.emissive && !Array.isArray(o.material) && !nightMats.includes(o.material)) { o.material.emissive.setHex(b === hover ? 0x335577 : 0x000000); } });
    World.render();
    if (hover) showLabel(hover); else hideLabel();
    $('#scTime').textContent = fmtUT(Game.time);
  }
  function showLabel(b) {
    const p = new V3(); b.obj.getWorldPosition(p); p.add(new V3(0, 0, 0));
    const up = new V3(0, b.labelY, 0).applyQuaternion(group.getWorldQuaternion(new Q4()));
    p.add(up);
    p.project(World.camera);
    const L = $('#bldLabel');
    if (p.z > 1) { L.hidden = true; return; }
    L.hidden = false; L.innerHTML = `<b>${b.name}</b><span>${b.desc}</span>`;
    L.style.left = ((p.x * 0.5 + 0.5) * window.innerWidth) + 'px'; L.style.top = ((-p.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  }
  function hideLabel() { const L = $('#bldLabel'); if (L) L.hidden = true; }
  let drag = null;
  function pick(e) {
    const ndc = new THREE.Vector2(e.clientX / window.innerWidth * 2 - 1, -e.clientY / window.innerHeight * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, World.camera);
    for (const b of buildings) { if (rc.intersectObject(b.obj, true).length) return b; }
    return null;
  }
  function mouseDown(e) { if (!active) return; drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch, moved: false }; }
  function mouseMove(e) {
    if (!active) return;
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; cam.yaw = drag.yaw - dx * 0.005; cam.pitch = clamp(drag.pitch + dy * 0.004, 0.08, 1.3); return; }
    if (e.target === World.renderer.domElement) hover = pick(e);
  }
  function mouseUp(e) { if (!active) return; if (drag && !drag.moved && e.target === World.renderer.domElement) { const b = pick(e); if (b) openBuilding(b.id); } drag = null; }
  function wheel(e) { if (!active) return; cam.distT = clamp(cam.distT * Math.pow(1.001, e.deltaY), 250, 3000); }
  return { open, close, update, padBF, lights, mouseDown, mouseMove, mouseUp, wheel, renderList, get active() { return active; }, updatePadRocket };
})();
