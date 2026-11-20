/* Ducks vs. Dogs 2 — Expansion 1.1 graphics: new ducks, spooky dogs, Count Barkula, new shopkeepers, haunted scenery. */
(function (D) {
  'use strict';
  const T = window.THREE;
  const G = D.G;
  const P = (...a) => G.P(...a);
  const TAU = Math.PI * 2;

  /* ------------------------------------------------------------ textures */
  const baseInit = G.init;
  G.init = function (canvas) {
    baseInit(canvas);
    const X = G.tex, ct = G.canvasTex;
    X.flame = ct(64, g => {
      const gr = g.createRadialGradient(32, 40, 2, 32, 36, 28);
      gr.addColorStop(0, '#fff6b0'); gr.addColorStop(0.45, '#ffb02e'); gr.addColorStop(1, 'rgba(255,70,20,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.quadraticCurveTo(58, 34, 46, 54); g.quadraticCurveTo(32, 64, 18, 54); g.quadraticCurveTo(6, 34, 32, 2); g.fill();
    });
    X.syrup = ct(64, g => {
      g.fillStyle = 'rgba(196,112,24,0.92)'; G.blob(g, 32, 32, 26, 6, 0.12); g.fill();
      g.fillStyle = 'rgba(255,214,120,0.85)'; g.beginPath(); g.ellipse(24, 24, 9, 4, -0.5, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,240,200,0.9)'; g.beginPath(); g.arc(40, 36, 3, 0, TAU); g.fill();
    });
    X.swirl = ct(64, g => {
      g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) { g.beginPath(); for (let a = 0; a < 5; a += 0.1) { const r = 4 + a * 5; g.lineTo(32 + Math.cos(a + k * 2.1) * r, 32 + Math.sin(a + k * 2.1) * r); } g.stroke(); }
      g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 29, 0, TAU); g.stroke();
    });
    X.bat = ct(64, g => {
      g.fillStyle = '#2b1e3a'; g.beginPath(); g.moveTo(32, 26);
      g.quadraticCurveTo(20, 10, 2, 18); g.quadraticCurveTo(10, 26, 8, 36); g.quadraticCurveTo(18, 30, 24, 38); g.lineTo(32, 34);
      g.lineTo(40, 38); g.quadraticCurveTo(46, 30, 56, 36); g.quadraticCurveTo(54, 26, 62, 18); g.quadraticCurveTo(44, 10, 32, 26); g.fill();
      g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(29, 28, 1.6, 0, TAU); g.arc(35, 28, 1.6, 0, TAU); g.fill();
    });
    X.boneMark = ct(64, g => {
      g.fillStyle = '#f4efe0'; g.fillRect(18, 28, 28, 8);
      [[18, 28], [18, 36], [46, 28], [46, 36]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 6, 0, TAU); g.fill(); });
    });
  };

  /* ------------------------------------------------------------ ducks */
  const NEW_DUCK_LOOKS = {
    piggy(d) {
      const g = G.duckBase({ body: d.body });
      const i = g.userData.parts.inner;
      P(i, 'box', '#2b1e1a', [-0.06, 0.55, 0], [0.16, 0.02, 0.04]);
      const coin = P(i, 'cyl', d.accent, [-0.06, 0.64, 0], [0.09, 0.02, 0.09], [Math.PI / 2, 0, 0], { outline: 0.1 });
      P(i, 'torus', '#e88aa8', [-0.36, 0.42, 0], 0.05, [0, Math.PI / 2, 0]);
      P(g.userData.parts.head, 'sphere', '#e88aa8', [0.18, 0.02, 0], [0.04, 0.035, 0.05]);
      g.userData.parts.coin = coin;
      return g;
    },
    rang(d) {
      const g = G.duckBase({ body: d.body, headColor: '#3b2a5a' });
      const p = g.userData.parts;
      P(p.head, 'sphere', '#ffffff', [-0.06, 0.04, 0], [0.12, 0.12, 0.17]);
      P(p.inner, 'sphere', '#ffffff', [0.0, 0.3, 0], [0.24, 0.14, 0.275]);
      const rg = new T.Group(); rg.position.set(0.22, 0.42, 0.22); p.inner.add(rg);
      P(rg, 'box', d.accent, [0.08, 0, 0], [0.2, 0.04, 0.06], [0, 0, 0.45], { outline: 0.1 });
      P(rg, 'box', d.accent, [-0.02, 0.07, 0], [0.2, 0.04, 0.06], [0, 0, -0.75], { outline: 0.1 });
      p.rang = rg;
      return g;
    },
    shiny(d) {
      const g = G.duckBase({ body: d.body, headColor: '#1f4f3a', beak: '#e8473a' });
      const p = g.userData.parts;
      P(p.inner, 'torus', '#b5651d', [0.12, 0.38, 0], [0.16, 0.16, 0.22], [Math.PI / 2, 0, 0.3]);
      const mir = new T.Group(); mir.position.set(0.12, 0.36, 0.3); p.inner.add(mir);
      P(mir, 'cyl', '#c0c6cf', [0, 0, 0], [0.22, 0.03, 0.22], [Math.PI / 2, 0, 0], { outline: 0.06 });
      P(mir, 'cyl', d.accent, [0, 0, 0.02], [0.18, 0.02, 0.18], [Math.PI / 2, 0, 0], { basic: true });
      const sp = G.sprite('sparkle', 0.25); sp.position.set(0.06, 0.07, 0.06); mir.add(sp);
      p.mirror = mir; p.mirrorSpark = sp;
      return g;
    },
    syrup(d) {
      const g = G.duckBase({ body: d.body });
      const p = g.userData.parts;
      [-1, 1].forEach(s => P(p.head, 'box', '#1d1411', [0.1, 0.06, s * 0.1], [0.12, 0.05, 0.02]));
      P(p.head, 'sphere', '#ffffff', [-0.08, 0.15, 0], [0.12, 0.08, 0.06]);
      const bt = new T.Group(); bt.position.set(0.25, 0.42, 0.18); bt.rotation.z = -0.9; p.inner.add(bt);
      P(bt, 'cyl', d.accent, [0, 0, 0], [0.07, 0.2, 0.07], null, { outline: 0.1 });
      P(bt, 'cyl', '#c0392b', [0, 0.13, 0], [0.035, 0.06, 0.035]);
      P(bt, 'box', '#fff3c4', [0, 0, 0.07], [0.08, 0.08, 0.01]);
      p.bottle = bt;
      return g;
    },
    twisty(d) {
      const g = G.duckBase({ body: d.body });
      const p = g.userData.parts;
      P(p.head, 'dome', d.accent, [0, 0.08, 0], [0.18, 0.12, 0.18], null, { outline: 0.06 });
      P(p.head, 'cyl', '#555', [0, 0.22, 0], [0.015, 0.08, 0.015]);
      const prop = new T.Group(); prop.position.set(0, 0.26, 0); p.head.add(prop);
      P(prop, 'box', '#ffe14d', [0, 0, 0], [0.32, 0.01, 0.05]);
      P(prop, 'box', '#4fa3ff', [0, 0, 0], [0.05, 0.012, 0.32]);
      p.prop = prop;
      P(p.inner, 'cyl', '#3aa0ff', [-0.02, 0.44, 0], [0.09, 0.2, 0.09], null, { outline: 0.08 });
      P(p.inner, 'cyl', '#3aa0ff', [-0.32, 0.3, 0], [0.03, 0.18, 0.03], [0, 0, Math.PI / 2]);
      p.nozzle = P(p.head, 'cyl', '#3aa0ff', [0.27, -0.04, 0], [0.03, 0.12, 0.03], [0, 0, Math.PI / 2]);
      return g;
    },
    squeak(d) {
      const g = G.duckBase({ body: d.body, beak: d.accent, noFeet: true, scale: 1.12 });
      const p = g.userData.parts;
      p.body.scale.set(0.33, 0.27, 0.3);
      P(p.inner, 'sphere', '#fffbe0', [0.05, 0.42, 0.18], 0.05, null, { basic: true });
      P(p.inner, 'cyl', '#7fd0ff', [0, 0.03, 0], [0.4, 0.02, 0.36], null, { t: 0.6 });
      p.beak.scale.set(0.13, 0.04, 0.11);
      return g;
    },
    spade(d) {
      const g = G.duckBase({ body: d.body, headColor: '#3a3040' });
      const p = g.userData.parts;
      P(p.head, 'torus', '#d23a3a', [0, 0.07, 0], [0.18, 0.18, 0.22], [Math.PI / 2, 0, 0]);
      const sh = new T.Group(); sh.position.set(0.26, 0.3, 0.2); p.inner.add(sh);
      P(sh, 'cyl', '#8a5a2b', [0, 0.22, 0], [0.02, 0.45, 0.02]);
      P(sh, 'box', d.accent, [0, -0.04, 0], [0.12, 0.14, 0.02], null, { outline: 0.06 });
      sh.rotation.z = -0.25;
      p.shovel = sh;
      const hole = new T.Group(); hole.visible = false; g.add(hole);
      P(hole, 'cyl', '#1d140f', [0, 0.08, 0], [0.32, 0.02, 0.3]);
      P(hole, 'torus', '#7a5230', [0, 0.08, 0], [0.34, 0.32, 0.3], [Math.PI / 2, 0, 0]);
      [[0.3, 0.1], [-0.25, -0.2], [0.1, 0.32]].forEach(c => P(hole, 'sphere', '#8a6240', [c[0], 0.1, c[1]], 0.06));
      p.hole = hole;
      return g;
    },
    decoy(d) {
      const g = G.duckBase({ body: d.body, headColor: d.accent, beak: '#d9a441', noFeet: true, scale: 1.05 });
      const p = g.userData.parts;
      P(p.inner, 'cyl', '#6b4a2a', [0, 0.04, 0], [0.04, 0.12, 0.04]);
      P(p.inner, 'cyl', '#8a5a2b', [0, 0.0, 0], [0.32, 0.03, 0.3]);
      P(p.inner, 'box', '#ffffff', [0.1, 0.4, 0], [0.04, 0.02, 0.5]);
      P(p.inner, 'box', '#7a4a2a', [-0.12, 0.38, 0], [0.04, 0.02, 0.52]);
      g.userData.noBlink = true;
      const lure = G.sprite('heart', 0.25, { color: '#ffd84a' }); lure.position.set(0, 1.0, 0); lure.visible = false; p.inner.add(lure);
      p.lureIcon = lure;
      return g;
    },
    sizzle(d) {
      const g = G.duckBase({ body: d.body, beak: d.accent });
      const p = g.userData.parts;
      P(p.head, 'cyl', '#ffffff', [-0.02, 0.2, 0], [0.11, 0.2, 0.11], null, { outline: 0.08 });
      P(p.head, 'sphere', '#ffffff', [-0.02, 0.33, 0], [0.15, 0.08, 0.15]);
      P(p.inner, 'cone', '#d23a3a', [0.12, 0.43, 0], [0.13, 0.12, 0.2], [Math.PI, 0, 0]);
      P(p.head, 'sphere', '#ff8a3a', [0.24, -0.02, 0], 0.03, null, { basic: true });
      const fl = G.sprite('flame', 0.4); fl.position.set(0.5, -0.03, 0); fl.visible = false; p.head.add(fl);
      p.flame = fl;
      return g;
    },
    copycat(d) {
      const g = G.duckBase({ body: d.body, headColor: d.accent, beak: '#333333' });
      const p = g.userData.parts;
      [-1, 1].forEach(s => { P(p.head, 'cone', d.accent, [-0.02, 0.17, s * 0.09], [0.05, 0.11, 0.04], [s * 0.2, 0, 0]); P(p.head, 'cone', '#ff9bb0', [0.0, 0.17, s * 0.09], [0.025, 0.06, 0.02], [s * 0.2, 0, 0]); });
      [-1, 1].forEach(s => [0.03, -0.01].forEach(y => P(p.head, 'box', '#2b1e1a', [0.2, y - 0.03, s * 0.09], [0.004, 0.006, 0.1], [0, 0, 0])));
      P(p.inner, 'cyl', '#555', [-0.32, 0.42, 0], [0.02, 0.24, 0.02], [0, 0, 0.9]);
      const q = G.sprite('sparkle', 0.22, { color: '#c89cff' }); q.position.set(0, 0.9, 0); p.inner.add(q); p.copyIcon = q;
      return g;
    }
  };
  const NO_HAT = ['twisty', 'sizzle', 'spade', 'copycat', 'decoy'];
  const baseMakeDuck = G.makeDuck;
  G.makeDuck = function (id, o) {
    const d = D.DUCKS[id];
    if (!d || !NEW_DUCK_LOOKS[d.look]) return baseMakeDuck(id, o);
    o = o || {};
    const g = NEW_DUCK_LOOKS[d.look](d);
    const hat = o.hat != null ? o.hat : D.Save.data.hat;
    if (hat && hat !== 'none' && NO_HAT.indexOf(d.look) < 0 && g.userData.parts.head) G.addHat(g.userData.parts.head, hat);
    if (!o.noShadow) G.shadow(g, 0.38);
    g.userData.id = id; g.userData.look = d.look;
    return g;
  };

  /* ------------------------------------------------------------ dogs */
  function ghostify(g, op) {
    g.traverse(o => { if (o.isMesh && o.material && !o.material.map) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = op; o.material.depthWrite = false; } });
  }
  const NEW_DOG_LOOKS = {
    phantom(d) {
      const g = G.dogBase({ body: d.body, belly: '#ffffff', muzzle: '#ffffff' });
      const p = g.userData.parts;
      P(p.inner, 'dome', '#f4f7ff', [0, 0.38, 0], [0.42, 0.34, 0.27]);
      for (let k = 0; k < 5; k++) P(p.inner, 'cone', '#f4f7ff', [-0.32 + k * 0.16, 0.36, 0], [0.07, 0.14, 0.24], [Math.PI, 0, 0]);
      ghostify(g, 0.62);
      p.ghost = true;
      return g;
    },
    mummy(d) {
      const g = G.dogBase({ body: d.body, belly: '#e8dcc0', scale: 1.12 });
      const p = g.userData.parts;
      const wraps = new T.Group(); p.inner.add(wraps);
      for (let k = 0; k < 5; k++) P(wraps, 'torus', '#f6f0e0', [-0.24 + k * 0.12, 0.42, 0], [0.09, 0.22, 0.21], [0, Math.PI / 2, k * 0.3], { outline: 0.05 });
      [0, 1].forEach(k => { const t = P(p.head, 'torus', '#f6f0e0', [-0.03 + k * 0.07, 0.03 - k * 0.07, 0], [0.19, 0.19, 0.12], [0, Math.PI / 2, 0.4 - k * 0.7]); t.userData.wrap = true; });
      p.wraps = wraps;
      p.headWraps = p.head.children.filter(c => c.userData.wrap);
      return g;
    },
    werewoof(d) {
      const g = G.dogBase({ body: d.body, pointy: true, ear: '#5a4a3a', muzzle: '#c8b8a0' });
      const p = g.userData.parts;
      for (let k = 0; k < 5; k++) P(p.inner, 'cone', '#5a4a3a', [-0.25 + k * 0.12, 0.62, 0], [0.05, 0.14, 0.05], [0, 0, 0.5]);
      const fangs = new T.Group(); fangs.visible = false; p.head.add(fangs);
      [-1, 1].forEach(s => P(fangs, 'cone', '#ffffff', [0.2, -0.13, s * 0.04], [0.02, 0.06, 0.02], [Math.PI, 0, 0]));
      p.fangs = fangs;
      return g;
    },
    balloonDog(d) {
      const g = G.dogBase({ body: d.body, spot: '#3b2a1e', ear: '#7a4a2a', earLen: 1.3 });
      const p = g.userData.parts;
      const bal = new T.Group(); p.inner.add(bal);
      P(bal, 'cyl', '#ffffff', [0, 1.0, 0], [0.008, 0.85, 0.008]);
      P(bal, 'sphere', '#ff4a5a', [0, 1.6, 0], [0.3, 0.36, 0.3], null, { outline: 0.05 });
      P(bal, 'cone', '#ff4a5a', [0, 1.22, 0], [0.05, 0.06, 0.05], [Math.PI, 0, 0]);
      P(bal, 'sphere', '#ffffff', [0.1, 1.72, 0.18], 0.05, null, { basic: true });
      p.balloon = bal;
      return g;
    }
  };
  const baseMakeDog = G.makeDog;
  G.makeDog = function (id) {
    const d = D.DOGS[id];
    if (!d || !NEW_DOG_LOOKS[d.look]) return baseMakeDog(id);
    const g = NEW_DOG_LOOKS[d.look](d);
    G.shadow(g, 0.4);
    g.userData.id = id;
    return g;
  };

  const baseMakeBoss = G.makeBoss;
  G.makeBoss = function (id) {
    if (id !== 'barkula') return baseMakeBoss(id);
    const b = D.BOSSES[id];
    const g = G.dogBase({ body: b.body, belly: '#4a3a5a', muzzle: '#5a4a6a', pointy: true, ear: '#1a1420', scale: 2.6 });
    const p = g.userData.parts;
    P(p.inner, 'cone', '#7a1f3a', [-0.05, 0.48, 0], [0.34, 0.55, 0.3], [0, 0, 0.35], { outline: 0.03 });
    P(p.inner, 'cone', '#c0392b', [0.26, 0.66, 0], [0.16, 0.18, 0.2], [Math.PI, 0, 0.2]);
    P(p.inner, 'cyl', '#ffcf33', [0.33, 0.52, 0.1], [0.04, 0.01, 0.04], [Math.PI / 2, 0, 0], { e: '#553300' });
    [-1, 1].forEach(s => P(p.head, 'cone', '#ffffff', [0.18, -0.13, s * 0.05], [0.02, 0.06, 0.02], [Math.PI, 0, 0]));
    p.eyes.children.forEach((c, k) => { if (k % 3 === 1) c.material = G.mat('#ff2a2a', { basic: true }); });
    P(p.head, 'cone', '#1a1420', [-0.06, 0.15, 0], [0.08, 0.12, 0.02], [0, 0, 0.4]);
    G.shadow(g, 1.4);
    g.userData.id = id;
    return g;
  };

  /* ------------------------------------------------------------ keepers & shops */
  const baseKeeper = G.makeKeeper;
  G.makeKeeper = function (shop) {
    if (shop === 'snack') {
      const g = G.duckBase({ body: '#fff6e8', beak: '#ffb347', scale: 1.5 });
      const p = g.userData.parts;
      P(p.head, 'cyl', '#ffffff', [-0.02, 0.22, 0], [0.12, 0.24, 0.12], null, { outline: 0.06 });
      P(p.head, 'sphere', '#ffffff', [-0.02, 0.38, 0], [0.17, 0.1, 0.17], null, { outline: 0.06 });
      [-1, 1].forEach(s => P(p.head, 'sphere', '#5a3d2b', [0.2, -0.0, s * 0.06], [0.06, 0.02, 0.05], [s * 0.4, 0, 0.3]));
      P(p.inner, 'box', '#ff8aa8', [0.18, 0.28, 0], [0.12, 0.3, 0.36], null, { outline: 0.04 });
      const pin = new T.Group(); pin.position.set(0.32, 0.42, 0.24); p.inner.add(pin);
      P(pin, 'cyl', '#d9a066', [0, 0, 0], [0.05, 0.36, 0.05], [Math.PI / 2, 0, 0], { outline: 0.06 });
      G.shadow(g, 0.6);
      return g;
    }
    if (shop === 'observatory') {
      const g = G.duckBase({ body: '#2d3142', beak: '#555555', scale: 1.5 });
      const p = g.userData.parts;
      for (let k = 0; k < 8; k++) P(p.inner, 'sphere', '#ffffff', [-0.15 + (k % 4) * 0.08, 0.38 + Math.floor(k / 4) * 0.06, 0.24], 0.022);
      P(p.inner, 'cone', '#3a4fbf', [-0.08, 0.36, 0], [0.32, 0.5, 0.3], [0, 0, 0.3], { outline: 0.03 });
      P(p.eyes, 'sphere', '#ff3333', [0.15, 0.065, 0.095], 0.032);
      G.addHat(p.head, 'wizard');
      const tel = new T.Group(); tel.position.set(0.45, 0, 0.3); p.inner.add(tel);
      [0, 2.1, 4.2].forEach(a => P(tel, 'cyl', '#8a5a2b', [Math.cos(a) * 0.08, 0.2, Math.sin(a) * 0.08], [0.012, 0.42, 0.012], [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2]));
      P(tel, 'cyl', '#d4a017', [0.05, 0.5, 0], [0.05, 0.4, 0.05], [0, 0, -0.9], { outline: 0.08 });
      G.shadow(g, 0.6);
      return g;
    }
    return baseKeeper(shop);
  };

  const baseShopStage = G.shopStage;
  G.shopStage = function (shop) {
    if (shop !== 'snack' && shop !== 'observatory') return baseShopStage(shop);
    G.clearStage();
    G.applyTheme(D.WORLDS[0].t);
    const sky = shop === 'snack' ? { skyTop: '#ff8aa8', skyBot: '#ffe8d0' } : { skyTop: '#0d1440', skyBot: '#3a4fbf' };
    G.scene.background = G.skyDome(sky);
    G.scene.fog = null;
    const root = new T.Group(); G.stageRoot.add(root);
    P(root, 'cyl', shop === 'snack' ? '#f2c4b0' : '#25306a', [0, -0.1, 0], [5, 0.2, 3]);
    const anim = [];
    if (shop === 'snack') {
      const ctr = new T.Group(); ctr.position.set(1.6, 0, -0.9); root.add(ctr);
      P(ctr, 'box', '#ffffff', [0, 0.45, 0], [2.6, 0.9, 1], null, { outline: 0.02 });
      P(ctr, 'box', '#ff8aa8', [0, 0.45, 0.51], [2.6, 0.2, 0.02]);
      for (let k = 0; k < 7; k++) P(ctr, 'box', k % 2 ? '#ffffff' : '#ff6b8a', [-1.2 + k * 0.4, 2.0, 0], [0.4, 0.08, 1.3]);
      [-1, 1].forEach(s => P(ctr, 'cyl', '#c08060', [s * 1.25, 1.45, 0.5], [0.04, 1.1, 0.04]));
      // pastries
      [[-0.9, '#d9893a'], [-0.3, '#ffb3c7'], [0.3, '#f2c27a'], [0.9, '#8fd0ff']].forEach(([x, c], k) => {
        const pz = new T.Group(); pz.position.set(x, 0.95, 0.1); ctr.add(pz);
        if (k % 2) { P(pz, 'cyl', '#ffffff', [0, 0.06, 0], [0.12, 0.12, 0.12]); P(pz, 'dome', c, [0, 0.12, 0], 0.13, null, { outline: 0.06 }); P(pz, 'sphere', '#ff3b3b', [0, 0.26, 0], 0.03); }
        else P(pz, 'halfTorus', c, [0, 0.06, 0], [0.14, 0.14, 0.2], [Math.PI / 2, 0, 0], { outline: 0.06 });
        anim.push(pz);
      });
    } else {
      const obs = new T.Group(); obs.position.set(1.6, 0, -1.4); root.add(obs);
      P(obs, 'cyl', '#c9ccd8', [0, 0.6, 0], [1.1, 1.2, 1.1], null, { outline: 0.02 });
      P(obs, 'dome', '#e8ebf5', [0, 1.2, 0], 1.12, null, { outline: 0.02 });
      P(obs, 'box', '#25306a', [0, 1.7, 0.6], [0.3, 0.9, 0.3], [-0.5, 0, 0]);
      const scope = P(obs, 'cyl', '#d4a017', [0.3, 2.1, 0.5], [0.12, 1.2, 0.12], [-0.7, 0, -0.4], { outline: 0.05 });
      anim.push(scope);
      for (let k = 0; k < 40; k++) { const s = G.sprite('sparkle', 0.12 + Math.random() * 0.2, { color: '#fff6c8' }); s.position.set(-8 + Math.random() * 16, 2 + Math.random() * 5, -4 - Math.random() * 3); root.add(s); anim.push(s); }
      const moon = G.sprite('moon', 1.4); moon.position.set(-3, 4, -4); root.add(moon);
    }
    const keeper = G.makeKeeper(shop);
    keeper.position.set(-1.0, 0, 0.4); keeper.rotation.y = -0.35;
    root.add(keeper);
    G.stage = {
      name: 'shop', root, keeper, t: 0, talk: 0,
      fit() {
        const a = G.camera.aspect, wide = a > 1.2;
        G.camera.fov = 34;
        const dist = a < 1 ? 11 / a * 0.7 : 8.4;
        G.camera.position.set(wide ? 2.4 : 0.3, 2.3, dist); G.camera.lookAt(wide ? 2.4 : 0.3, 1.1, 0); G.camera.updateProjectionMatrix();
      },
      update(dt) {
        this.t += dt;
        G.animDuck(keeper, dt, {});
        if (this.talk > 0) { this.talk -= dt; keeper.userData.quack = Math.abs(Math.sin(this.t * 14)); }
        keeper.rotation.y = -0.35 + Math.sin(this.t * 0.8) * 0.1;
        anim.forEach((o, k) => { if (o.isSprite) o.material.opacity = 0.5 + Math.sin(this.t * 3 + k) * 0.5; else o.rotation.y = Math.sin(this.t * 1.5 + k) * 0.3; });
      }
    };
    G.stage.fit();
  };

  /* ------------------------------------------------------------ animation extras */
  const baseAnimDuck = G.animDuck;
  G.animDuck = function (m, dt, st) {
    const u = m.userData;
    if (u.noBlink) u.blink = 5;
    baseAnimDuck(m, dt, st);
    const p = u.parts;
    if (p.prop) p.prop.rotation.y += dt * (u.puff > 0 ? 30 : 6);
    if (p.flame) { p.flame.visible = u.puff > 0.2; p.flame.scale.setScalar(0.3 + u.puff * 0.5); }
    if (p.mirrorSpark) p.mirrorSpark.material.rotation += dt * 3;
    if (p.coin) p.coin.rotation.y += dt * 2;
    if (p.rang && st && st.rangOut != null) p.rang.visible = !st.rangOut;
    if (p.copyIcon) p.copyIcon.material.rotation += dt * 2;
  };
  const baseAnimDog = G.animDog;
  G.animDog = function (m, dt, st) {
    baseAnimDog(m, dt, st);
    const p = m.userData.parts;
    if (p.balloon && p.balloon.visible) { p.balloon.rotation.z = Math.sin(m.userData.phase * 2) * 0.12; }
    if (p.ghost) p.inner.position.y += 0.2 + Math.sin(m.userData.phase * 3) * 0.06;
  };

  /* ------------------------------------------------------------ haunted scenery & tile objects */
  G.makeGrave = function () {
    const g = new T.Group();
    P(g, 'dome', '#6b5a48', [0, 0.02, 0], [0.4, 0.14, 0.34], null, { outline: 0.05 });
    P(g, 'box', '#9a9aa8', [-0.12, 0.3, -0.05], [0.32, 0.42, 0.1], [0, 0.3, 0], { outline: 0.05 });
    P(g, 'cyl', '#9a9aa8', [-0.12, 0.51, -0.05], [0.16, 0.1, 0.16], [Math.PI / 2, 0.3, 0]);
    const mark = new T.Mesh(G.geo('plane'), new T.MeshBasicMaterial({ map: G.tex.boneMark, transparent: true, depthWrite: false }));
    mark.scale.setScalar(0.22); mark.position.set(-0.1, 0.33, 0.006); mark.rotation.y = 0.3; g.add(mark);
    [[0.18, 0.12], [0.08, 0.22]].forEach(([x, z]) => P(g, 'cyl', '#f4efe0', [x, 0.12, z], [0.025, 0.16, 0.025], [Math.PI / 2, 0, x * 3]));
    return g;
  };
  G.makePortal = function (color) {
    const g = new T.Group();
    const q = G.tileQuad('swirl', color, 0.95); q.scale.set(0.9, 0.9, 1); q.position.y = 0.09; g.add(q);
    const ring = P(g, 'torus', color, [0, 0.42, 0], [0.32, 0.38, 0.32], [0, 0.5, 0], { basic: true });
    const glow = G.sprite('glow', 1.0, { color }); glow.position.y = 0.4; g.add(glow);
    g.userData.spin = q; g.userData.ring = ring; g.userData.glow = glow;
    return g;
  };
  G.makeSyrup = function (w) {
    const q = G.tileQuad('syrup', 0xffffff, 0.95);
    q.scale.set(0.95 * (w || 1), 0.9, 1);
    return q;
  };

  const baseField = G.buildBattlefield;
  G.buildBattlefield = function (world, level) {
    const root = baseField(world, level);
    const t = (D.WORLDS[world - 1] || D.WORLDS[0]).t;
    if (t.spooky) spookyDecor(root);
    return root;
  };
  function spookyDecor(root) {
    // manor silhouette
    const manor = new T.Group(); manor.position.set(6, 0, -9); root.add(manor);
    P(manor, 'box', '#3a2f4a', [0, 1.6, 0], [6, 3.2, 1.5], null, { outline: 0.01 });
    P(manor, 'box', '#3a2f4a', [-2.4, 2.6, 0], [1.4, 5.2, 1.6]);
    P(manor, 'cone', '#2a2036', [-2.4, 5.8, 0], [1.1, 1.4, 1.1], [0, Math.PI / 4, 0]);
    P(manor, 'cone', '#2a2036', [0.6, 3.9, 0], [3.4, 1.5, 1.1], [0, Math.PI / 4, 0]);
    for (let k = 0; k < 6; k++) P(manor, 'box', '#ffd86a', [-1.6 + (k % 3) * 1.6, 1 + Math.floor(k / 3) * 1.2, 0.76], [0.4, 0.5, 0.02], null, { basic: true });
    P(manor, 'box', '#ffd86a', [-2.4, 4.2, 0.81], [0.35, 0.5, 0.02], null, { basic: true });
    // pumpkins & bats
    for (let k = 0; k < 7; k++) {
      const pk = new T.Group(); pk.position.set(-0.6 + k * 1.6, 0, -3.5 - (k % 2) * 0.3); root.add(pk);
      P(pk, 'sphere', '#ff8a1a', [0, 0.2, 0], [0.26, 0.2, 0.24], null, { outline: 0.05 });
      P(pk, 'cyl', '#3f7a2a', [0, 0.42, 0], [0.03, 0.08, 0.03]);
      if (k % 2 === 0) { const glow = G.sprite('glow', 0.5, { color: '#ffb84d' }); glow.position.set(0.05, 0.22, 0.22); pk.add(glow); }
    }
    const bats = [];
    for (let k = 0; k < (G.high() ? 6 : 3); k++) { const b = G.sprite('bat', 0.6); b.position.set(Math.random() * 12 - 2, 3 + Math.random() * 2, -6 - Math.random() * 3); b.userData.ph = Math.random() * 10; root.add(b); bats.push(b); }
    root.userData.bats = bats;
  }
  const baseUpdateEnv = G.updateEnv;
  G.updateEnv = function (root, dt, time) {
    baseUpdateEnv(root, dt, time);
    const bats = root.userData.bats;
    if (bats) bats.forEach(b => { b.userData.ph += dt; b.position.x += Math.cos(b.userData.ph * 0.6) * dt * 0.8; b.position.y += Math.sin(b.userData.ph * 3) * dt * 0.4; b.scale.x = 0.6 * (0.7 + Math.abs(Math.sin(b.userData.ph * 8)) * 0.3); });
  };

  const baseDiorama = G.diorama;
  G.diorama = function (worldIdx, opts) {
    baseDiorama(worldIdx, opts);
    const t = (D.WORLDS[(worldIdx || 1) - 1] || D.WORLDS[0]).t;
    if (t.spooky && G.stage && G.stage.root) {
      const root = G.stage.root;
      [[-4.2, 1.6], [4.4, 1.2], [0.4, -2.6]].forEach(([x, z]) => { const gr = G.makeGrave(); gr.position.set(x, 0, z); gr.scale.setScalar(1.2); root.add(gr); });
      [[-2.2, -2.4], [3, -2.6]].forEach(([x, z]) => { const pk = new T.Group(); pk.position.set(x, 0, z); root.add(pk); P(pk, 'sphere', '#ff8a1a', [0, 0.25, 0], [0.32, 0.25, 0.3], null, { outline: 0.05 }); P(pk, 'cyl', '#3f7a2a', [0, 0.52, 0], [0.04, 0.1, 0.04]); });
    }
  };
})(window.DVD);
