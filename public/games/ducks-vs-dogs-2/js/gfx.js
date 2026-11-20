/* Ducks vs. Dogs 2 — 3D graphics: renderer, toy-like models, environments, 2D-in-3D effects. */
(function (D) {
  'use strict';
  const T = window.THREE;
  const G = D.G = {};
  const TAU = Math.PI * 2;

  G.high = () => window.arcadeSettings?.profile !== 'chromebook' && D.Save.data.settings.gfx === 'high';

  /* =========================================================== RENDERER */
  G.init = function (canvas) {
    const high = G.high();
    G.renderer = new T.WebGLRenderer({ canvas, antialias: high, powerPreference: high ? 'high-performance' : 'low-power' });
    G.renderer.setClearColor(0x9fd8ff, 1);
    G.applyQuality();
    G.scene = new T.Scene();
    G.camera = new T.PerspectiveCamera(34, 1, 0.1, 200);
    G.hemi = new T.HemisphereLight(0xffffff, 0x88aa66, 0.75);
    G.sun = new T.DirectionalLight(0xffffff, 1.0);
    G.sun.position.set(-4, 12, 8);
    G.scene.add(G.hemi, G.sun);
    G.stageRoot = new T.Group();
    G.scene.add(G.stageRoot);
    G.raycaster = new T.Raycaster();
    G.groundPlane = new T.Plane(new T.Vector3(0, 1, 0), -0.1);
    buildTextures();
    G.fxInit();
    G.resize();
    window.addEventListener('resize', G.resize);
  };

  G.applyQuality = function () {
    const dpr = window.devicePixelRatio || 1;
    G.renderer.setPixelRatio(G.high() ? Math.min(dpr, 2) : Math.min(dpr, 1) * 0.85);
    G.matCache = {}; // new materials pick up the chosen shading model
    if (G.camera) G.resize();
  };

  G.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    G.renderer.setSize(w, h, false);
    G.camera.aspect = w / h;
    if (G.stage && G.stage.fit) G.stage.fit(); else G.camera.updateProjectionMatrix();
  };

  G.render = function () { G.renderer.render(G.scene, G.camera); };

  // world → screen pixels
  const _v = new T.Vector3();
  G.toScreen = function (x, y, z) {
    _v.set(x, y, z).project(G.camera);
    return { x: (_v.x * 0.5 + 0.5) * window.innerWidth, y: (-_v.y * 0.5 + 0.5) * window.innerHeight, behind: _v.z > 1 };
  };
  // screen → ground (y = 0.1)
  const _p = new T.Vector3(), _ndc = new T.Vector2();
  G.pickGround = function (sx, sy) {
    _ndc.set(sx / window.innerWidth * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    G.raycaster.setFromCamera(_ndc, G.camera);
    return G.raycaster.ray.intersectPlane(G.groundPlane, _p) ? { x: _p.x, z: _p.z } : null;
  };

  /* =========================================================== MATERIALS */
  let gradientMap = null;
  function toonGradient() {
    if (gradientMap) return gradientMap;
    const data = new Uint8Array([90, 175, 255]);
    gradientMap = new T.DataTexture(data, 3, 1, T.LuminanceFormat);
    gradientMap.minFilter = gradientMap.magFilter = T.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;
    return gradientMap;
  }
  G.matCache = {};
  G.mat = function (color, opt) {
    opt = opt || {};
    const key = color + '|' + (opt.e || '') + '|' + (opt.t || '') + '|' + (opt.basic ? 1 : 0);
    if (G.matCache[key] && !opt.unique) return G.matCache[key];
    let m;
    if (opt.basic) m = new T.MeshBasicMaterial({ color });
    else if (G.high()) m = new T.MeshToonMaterial({ color, gradientMap: toonGradient() });
    else m = new T.MeshLambertMaterial({ color });
    if (opt.e) { m.emissive = new T.Color(opt.e); }
    if (opt.t) { m.transparent = true; m.opacity = opt.t; m.depthWrite = false; }
    if (!opt.unique) G.matCache[key] = m;
    return m;
  };
  const outlineMat = new T.MeshBasicMaterial({ color: 0x2b1e1a, side: T.BackSide });

  /* =========================================================== GEOMETRY */
  const GEO = {};
  function geo(k) {
    if (GEO[k]) return GEO[k];
    const lo = !G.high();
    const s = lo ? 10 : 18, h = lo ? 8 : 14;
    switch (k) {
      case 'sphere': GEO[k] = new T.SphereGeometry(1, s, h); break;
      case 'dome': GEO[k] = new T.SphereGeometry(1, s, h / 2, 0, TAU, 0, Math.PI / 2); break;
      case 'cyl': GEO[k] = new T.CylinderGeometry(1, 1, 1, lo ? 8 : 14); break;
      case 'cone': GEO[k] = new T.ConeGeometry(1, 1, lo ? 8 : 12); break;
      case 'box': GEO[k] = new T.BoxGeometry(1, 1, 1); break;
      case 'torus': GEO[k] = new T.TorusGeometry(1, 0.3, 6, lo ? 12 : 18); break;
      case 'halfTorus': GEO[k] = new T.TorusGeometry(1, 0.28, 6, 14, Math.PI); break;
      case 'plane': GEO[k] = new T.PlaneGeometry(1, 1); break;
      case 'tile': GEO[k] = new T.BoxGeometry(0.96, 0.14, 0.96); break;
      case 'disc': GEO[k] = new T.CylinderGeometry(1, 1, 0.05, lo ? 14 : 24); break;
    }
    return GEO[k];
  }
  G.geo = geo;

  // mesh part helper
  function P(parent, g, color, pos, scl, rot, opt) {
    const m = new T.Mesh(geo(g), (opt && opt.mat) || G.mat(color, opt));
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (scl) { if (typeof scl === 'number') m.scale.setScalar(scl); else m.scale.set(scl[0], scl[1], scl[2]); }
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    if (opt && opt.outline && G.high()) {
      const o = new T.Mesh(geo(g), outlineMat);
      o.scale.setScalar(1 + opt.outline);
      m.add(o);
    }
    parent.add(m);
    return m;
  }
  G.P = P;

  /* =========================================================== CANVAS TEXTURES */
  G.tex = {};
  function canvasTex(size, draw, w, h) {
    const c = document.createElement('canvas');
    c.width = w || size; c.height = h || size;
    const g = c.getContext('2d');
    draw(g, c.width, c.height);
    const t = new T.CanvasTexture(c);
    t.minFilter = T.LinearFilter;
    t.generateMipmaps = false;
    t.image_canvas = c;
    return t;
  }
  function star(g, cx, cy, r1, r2, n) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? r2 : r1, a = i * Math.PI / n - Math.PI / 2;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
  }
  function ink(g, w) { g.lineWidth = w || 4; g.strokeStyle = '#2b1e1a'; g.lineJoin = 'round'; g.stroke(); }
  function blob(g, cx, cy, r, bumps, jit) {
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i / 40 * TAU;
      const rr = r * (1 + Math.sin(a * bumps) * jit);
      g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    g.closePath();
  }
  function buildTextures() {
    const X = G.tex;
    X.star = canvasTex(64, (g) => { star(g, 32, 33, 28, 12, 5); g.fillStyle = '#ffe14d'; g.fill(); ink(g, 4); });
    X.sparkle = canvasTex(64, (g) => { star(g, 32, 32, 30, 6, 4); g.fillStyle = '#fffbe0'; g.fill(); });
    X.splash = canvasTex(64, (g) => {
      g.fillStyle = '#7fd0ff'; blob(g, 32, 32, 18, 7, 0.35); g.fill(); ink(g, 3);
      g.fillStyle = '#d8f3ff'; g.beginPath(); g.arc(26, 26, 5, 0, TAU); g.fill();
    });
    X.puff = canvasTex(64, (g) => {
      const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.fill();
    });
    X.cloudPuff = canvasTex(128, (g) => {
      g.fillStyle = '#ffffff';
      [[64, 70, 34], [36, 76, 24], [92, 76, 26], [50, 50, 26], [80, 52, 24]].forEach(c => { g.beginPath(); g.arc(c[0], c[1], c[2], 0, TAU); g.fill(); });
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(160,170,210,0.35)'; g.fillRect(0, 80, 128, 48);
    });
    X.crumb = canvasTex(64, (g) => {
      g.fillStyle = '#e8a64a'; blob(g, 32, 34, 22, 5, 0.12); g.fill(); ink(g, 4);
      g.fillStyle = '#ffe6a8'; blob(g, 30, 30, 13, 4, 0.15); g.fill();
      g.fillStyle = '#fff8e6'; g.beginPath(); g.arc(24, 24, 4, 0, TAU); g.fill();
    });
    X.coin = canvasTex(64, (g) => {
      g.fillStyle = '#ffcd2e'; g.beginPath(); g.arc(32, 32, 26, 0, TAU); g.fill(); ink(g, 4);
      g.strokeStyle = '#e09a00'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 18, 0, TAU); g.stroke();
      star(g, 32, 33, 11, 5, 5); g.fillStyle = '#fff3a8'; g.fill();
    });
    X.silver = canvasTex(64, (g) => {
      g.fillStyle = '#dfe6ee'; g.beginPath(); g.arc(32, 32, 24, 0, TAU); g.fill(); ink(g, 4);
      star(g, 32, 33, 10, 4, 5); g.fillStyle = '#ffffff'; g.fill();
    });
    X.feather = canvasTex(64, (g) => {
      g.save(); g.translate(32, 32); g.rotate(-0.6);
      g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(0, -2, 11, 26, 0, 0, TAU); g.fill(); ink(g, 3);
      g.strokeStyle = '#d98f00'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 28); g.lineTo(0, -24); g.stroke();
      g.restore();
      star(g, 48, 14, 9, 3, 4); g.fillStyle = '#fff'; g.fill();
    });
    X.heart = canvasTex(64, (g) => {
      g.fillStyle = '#ff6b9a'; g.beginPath(); g.moveTo(32, 54);
      g.bezierCurveTo(4, 36, 8, 8, 32, 20); g.bezierCurveTo(56, 8, 60, 36, 32, 54); g.fill(); ink(g, 4);
    });
    X.snow = canvasTex(64, (g) => {
      g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { g.save(); g.translate(32, 32); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, -24); g.lineTo(0, 24); g.stroke(); g.restore(); }
    });
    X.bolt = canvasTex(64, (g) => {
      g.fillStyle = '#ffe94d'; g.beginPath(); g.moveTo(36, 4); g.lineTo(14, 36); g.lineTo(30, 36); g.lineTo(24, 60); g.lineTo(50, 24); g.lineTo(34, 24); g.closePath(); g.fill(); ink(g, 3);
    });
    X.zzz = canvasTex(64, (g) => { g.font = 'bold 40px sans-serif'; g.fillStyle = '#fff'; g.strokeStyle = '#2b1e1a'; g.lineWidth = 5; g.strokeText('z', 18, 46); g.fillText('z', 18, 46); });
    X.shadow = canvasTex(64, (g) => {
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });
    X.glow = canvasTex(64, (g) => {
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.4, 'rgba(255,220,110,0.5)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    });
    X.ring = canvasTex(64, (g) => { g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(32, 32, 26, 0, TAU); g.stroke(); });
    X.bubble = canvasTex(64, (g) => {
      g.fillStyle = 'rgba(190,240,255,0.35)'; g.beginPath(); g.arc(32, 32, 28, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(22, 20, 7, 4, -0.6, 0, TAU); g.fill();
    });
    X.leaf = canvasTex(64, (g) => { g.fillStyle = '#6ccf4e'; g.beginPath(); g.ellipse(32, 32, 12, 24, 0.7, 0, TAU); g.fill(); ink(g, 3); });
    X.dust = canvasTex(64, (g) => {
      const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30);
      gr.addColorStop(0, 'rgba(200,170,130,0.95)'); gr.addColorStop(1, 'rgba(200,170,130,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.fill();
    });
    X.tear = canvasTex(64, (g) => { g.fillStyle = '#7fd0ff'; g.beginPath(); g.moveTo(32, 6); g.quadraticCurveTo(54, 40, 32, 56); g.quadraticCurveTo(10, 40, 32, 6); g.fill(); ink(g, 3); });
    X.ice = canvasTex(64, (g) => { g.fillStyle = '#c8f0ff'; g.beginPath(); g.moveTo(32, 4); g.lineTo(46, 32); g.lineTo(32, 60); g.lineTo(18, 32); g.closePath(); g.fill(); ink(g, 3); });
    X.confetti = canvasTex(32, (g) => { g.fillStyle = '#ffffff'; g.fillRect(6, 10, 20, 12); });
    X.arrow = canvasTex(64, (g) => { g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(40, 14); g.lineTo(22, 32); g.lineTo(40, 50); g.stroke(); });
    X.bone = canvasTex(64, (g) => {
      g.fillStyle = '#fffaf0';
      g.fillRect(16, 26, 32, 12);
      [[16, 26], [16, 38], [48, 26], [48, 38]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 8, 0, TAU); g.fill(); });
      g.strokeStyle = '#2b1e1a'; g.lineWidth = 3; g.strokeRect(16, 26, 32, 12);
    });
    X.warn = canvasTex(64, (g) => {
      g.fillStyle = 'rgba(255,40,40,0.85)'; g.fillRect(0, 0, 64, 64);
      g.strokeStyle = 'rgba(255,230,120,0.9)'; g.lineWidth = 7;
      for (let i = -64; i < 128; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); }
      g.strokeStyle = 'rgba(160,0,0,0.9)'; g.lineWidth = 6; g.strokeRect(3, 3, 58, 58);
    });
    X.warn.wrapS = X.warn.wrapT = T.RepeatWrapping;
    X.highlight = canvasTex(64, (g) => {
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 6; g.fillStyle = 'rgba(255,255,255,0.28)';
      g.beginPath(); g.rect(5, 5, 54, 54); g.fill(); g.stroke();
    });
    X.firefly = canvasTex(32, (g) => {
      const gr = g.createRadialGradient(16, 16, 1, 16, 16, 15);
      gr.addColorStop(0, 'rgba(255,255,190,1)'); gr.addColorStop(1, 'rgba(200,255,120,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    });
    X.moon = canvasTex(128, (g) => {
      g.fillStyle = '#fff6cc'; g.beginPath(); g.arc(64, 64, 52, 0, TAU); g.fill(); ink(g, 5);
      g.fillStyle = '#efe2a8'; [[44, 50, 9], [80, 76, 12], [70, 40, 6]].forEach(c => { g.beginPath(); g.arc(c[0], c[1], c[2], 0, TAU); g.fill(); });
    });
    X.sunTex = canvasTex(128, (g) => {
      star(g, 64, 64, 60, 46, 12); g.fillStyle = '#ffd84a'; g.fill(); ink(g, 4);
      g.fillStyle = '#ffe98a'; g.beginPath(); g.arc(64, 64, 38, 0, TAU); g.fill(); ink(g, 4);
      g.fillStyle = '#2b1e1a'; g.beginPath(); g.arc(52, 58, 4, 0, TAU); g.arc(76, 58, 4, 0, TAU); g.fill();
      g.beginPath(); g.arc(64, 70, 12, 0.2, Math.PI - 0.2); g.lineWidth = 4; g.stroke();
    });
    // paper-cutout decorations: drawn with a white border so they read like stickers
    X.cutCloud = canvasTex(256, (g) => {
      const pts = [[128, 84, 46], [80, 96, 36], [176, 96, 38], [104, 66, 34], [154, 62, 36], [52, 104, 22], [206, 106, 22]];
      g.fillStyle = '#ffffff'; g.strokeStyle = '#2b1e1a'; g.lineWidth = 6;
      pts.forEach(c => { g.beginPath(); g.arc(c[0], c[1], c[2] + 5, 0, TAU); g.stroke(); });
      pts.forEach(c => { g.beginPath(); g.arc(c[0], c[1], c[2] + 3, 0, TAU); g.fill(); });
      g.fillStyle = '#e4f1ff'; g.fillRect(40, 108, 180, 26);
    }, 256, 140);
    X.cutFlower = canvasTex(64, (g) => {
      g.strokeStyle = '#3f8f3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(32, 60); g.lineTo(32, 30); g.stroke();
      g.fillStyle = '#ff7ab8'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(32 + Math.cos(a) * 10, 22 + Math.sin(a) * 10, 8, 0, TAU); g.fill(); }
      g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(32, 22, 7, 0, TAU); g.fill(); ink(g, 2);
    });
    X.cutFlower2 = canvasTex(64, (g) => {
      g.strokeStyle = '#3f8f3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(32, 60); g.lineTo(32, 30); g.stroke();
      g.fillStyle = '#ffffff'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.ellipse(32 + Math.cos(a) * 10, 22 + Math.sin(a) * 10, 7, 4, a, 0, TAU); g.fill(); }
      g.fillStyle = '#ffb627'; g.beginPath(); g.arc(32, 22, 6, 0, TAU); g.fill(); ink(g, 2);
    });
    X.cattail = canvasTex(64, (g) => {
      g.strokeStyle = '#4f7f3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(30, 64); g.lineTo(32, 8); g.stroke();
      g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(32, 22, 6, 13, 0, 0, TAU); g.fill(); ink(g, 2);
    });
    X.snowflakeBig = X.snow;
    X.pawFlag = canvasTex(64, (g) => {
      g.fillStyle = '#ff5a4a'; g.fillRect(0, 0, 64, 44);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 26, 9, 0, TAU); g.fill();
      [[20, 14], [28, 9], [36, 9], [44, 14]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 4, 0, TAU); g.fill(); });
    }, 64, 64, 44);
    X.screen = canvasTex(64, (g) => {
      g.fillStyle = 'rgba(200,210,220,0.55)'; g.fillRect(0, 0, 64, 64);
      g.strokeStyle = 'rgba(80,90,100,0.7)'; g.lineWidth = 1;
      for (let i = 0; i < 64; i += 5) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); }
    });
    X.planks = canvasTex(128, (g) => {
      g.fillStyle = '#c99a5e'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#8a6239'; g.lineWidth = 4;
      for (let y = 0; y <= 128; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
      g.fillStyle = '#8a6239'; [[20, 16], [100, 48], [60, 80], [12, 112]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 2.5, 0, TAU); g.fill(); });
    });
    X.planks.wrapS = X.planks.wrapT = T.RepeatWrapping;
    X.iceTile = canvasTex(64, (g) => {
      g.fillStyle = '#9fd6f2'; g.fillRect(0, 0, 64, 64);
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(10, 50); g.lineTo(30, 30); g.moveTo(34, 54); g.lineTo(54, 34); g.stroke();
    });
  }

  /* =========================================================== 2D-IN-3D FX */
  G.fxInit = function () {
    G.fxPool = []; G.fxLive = [];
    G.fxRoot = new T.Group();
    G.scene.add(G.fxRoot);
  };
  function getSprite() {
    let s = G.fxPool.pop();
    if (!s) { s = new T.Sprite(new T.SpriteMaterial({ map: G.tex.star, transparent: true, depthWrite: false })); G.fxRoot.add(s); }
    s.visible = true;
    return s;
  }
  // spawn a flat 2D effect inside the 3D world
  G.fx = function (type, x, y, z, o) {
    o = o || {};
    const lim = G.high() ? 260 : 110;
    if (G.fxLive.length > lim) return;
    const n = o.n || 1;
    for (let i = 0; i < n; i++) {
      const s = getSprite();
      const p = { s, t: 0, life: 0.6, vx: 0, vy: 0, vz: 0, g: 0, s0: 0.3, s1: 0.3, spin: 0, fade: true, a: 1 };
      s.material.color.set(o.color || 0xffffff);
      s.material.rotation = 0;
      switch (type) {
        case 'splash': s.material.map = G.tex.splash; p.life = 0.35; p.s0 = 0.25; p.s1 = 0.6; break;
        case 'star':
          s.material.map = G.tex.star; p.life = 0.7; p.s0 = p.s1 = 0.2 + Math.random() * 0.12;
          p.vx = (Math.random() - 0.5) * 3; p.vy = 1.5 + Math.random() * 2; p.vz = (Math.random() - 0.5) * 2; p.g = 6; p.spin = (Math.random() - 0.5) * 10; break;
        case 'sparkle': s.material.map = G.tex.sparkle; p.life = 0.5; p.s0 = 0.4; p.s1 = 0.05; p.spin = 3; break;
        case 'puff': s.material.map = G.tex.puff; p.life = 0.6; p.s0 = 0.3; p.s1 = 0.9; p.vy = 0.5; p.a = 0.8; break;
        case 'dust': s.material.map = G.tex.dust; p.life = 0.7; p.s0 = 0.3; p.s1 = 0.8; p.vx = (Math.random() - 0.5); p.vy = 0.4; break;
        case 'heart': s.material.map = G.tex.heart; p.life = 0.9; p.s0 = 0.2; p.s1 = 0.28; p.vy = 0.9; p.vx = (Math.random() - 0.5) * 0.4; break;
        case 'snow': s.material.map = G.tex.snow; p.life = 0.9; p.s0 = 0.22; p.s1 = 0.1; p.vx = (Math.random() - 0.5) * 2; p.vy = Math.random() * 1.5; p.vz = (Math.random() - 0.5) * 2; p.spin = 3; break;
        case 'bolt': s.material.map = G.tex.bolt; p.life = 0.35; p.s0 = 0.5; p.s1 = 0.3; break;
        case 'zzz': s.material.map = G.tex.zzz; p.life = 1.4; p.s0 = 0.15; p.s1 = 0.32; p.vy = 0.5; p.vx = 0.25; break;
        case 'bubble': s.material.map = G.tex.bubble; p.life = 1.0; p.s0 = 0.1; p.s1 = 0.3; p.vy = 0.8; p.vx = (Math.random() - 0.5) * 0.5; break;
        case 'leaf': s.material.map = G.tex.leaf; p.life = 0.9; p.s0 = p.s1 = 0.18; p.vx = (Math.random() - 0.5) * 2; p.vy = 1 + Math.random(); p.g = 3; p.spin = 6; break;
        case 'ice': s.material.map = G.tex.ice; p.life = 0.6; p.s0 = p.s1 = 0.2; p.vx = (Math.random() - 0.5) * 3; p.vy = 1.5 + Math.random() * 1.5; p.vz = (Math.random() - 0.5) * 2; p.g = 7; p.spin = 8; break;
        case 'tear': s.material.map = G.tex.tear; p.life = 0.6; p.s0 = p.s1 = 0.14; p.vx = (Math.random() - 0.5) * 1.5; p.vy = 1.5; p.g = 6; break;
        case 'crumbBits': s.material.map = G.tex.crumb; p.life = 0.6; p.s0 = p.s1 = 0.12; p.vx = (Math.random() - 0.5) * 3; p.vy = 2 + Math.random(); p.vz = (Math.random() - 0.5) * 2; p.g = 8; break;
        case 'confetti': {
          s.material.map = G.tex.confetti; p.life = 2.2; p.s0 = p.s1 = 0.12;
          s.material.color.setHSL(Math.random(), 0.85, 0.6);
          p.vx = (Math.random() - 0.5) * 5; p.vy = 3 + Math.random() * 4; p.vz = (Math.random() - 0.5) * 3; p.g = 5; p.spin = (Math.random() - 0.5) * 12; break;
        }
        case 'ring': s.material.map = G.tex.ring; p.life = 0.5; p.s0 = 0.2; p.s1 = o.size || 2; break;
        case 'glow': s.material.map = G.tex.glow; p.life = 0.5; p.s0 = 0.6; p.s1 = o.size || 1.6; break;
        case 'feather': s.material.map = G.tex.feather; p.life = 0.8; p.s0 = 0.3; p.s1 = 0.5; p.vy = 1; p.spin = 2; break;
      }
      if (o.life) p.life = o.life;
      if (o.size && type !== 'ring' && type !== 'glow') { p.s0 *= o.size; p.s1 *= o.size; }
      if (o.vx != null) p.vx = o.vx; if (o.vy != null) p.vy = o.vy;
      s.position.set(x + (o.spread ? (Math.random() - 0.5) * o.spread : 0), y + (o.spread ? Math.random() * o.spread * 0.5 : 0), z + (o.spread ? (Math.random() - 0.5) * o.spread : 0));
      s.scale.setScalar(p.s0);
      s.material.opacity = p.a;
      G.fxLive.push(p);
    }
  };
  G.fxUpdate = function (dt) {
    for (let i = G.fxLive.length - 1; i >= 0; i--) {
      const p = G.fxLive[i];
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { p.s.visible = false; G.fxPool.push(p.s); G.fxLive.splice(i, 1); continue; }
      p.vy -= p.g * dt;
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      p.s.scale.setScalar(p.s0 + (p.s1 - p.s0) * k);
      p.s.material.rotation += p.spin * dt;
      p.s.material.opacity = p.fade ? p.a * Math.min(1, (1 - k) * 2.5) : p.a;
    }
  };
  G.fxClear = function () {
    G.fxLive.forEach(p => { p.s.visible = false; G.fxPool.push(p.s); });
    G.fxLive = [];
  };

  // persistent sprite helper (pickups, glows, shadows)
  G.sprite = function (tex, scale, opt) {
    const m = new T.SpriteMaterial({ map: G.tex[tex] || tex, transparent: true, depthWrite: false });
    if (opt && opt.color) m.color.set(opt.color);
    if (opt && opt.opacity != null) m.opacity = opt.opacity;
    const s = new T.Sprite(m);
    if (Array.isArray(scale)) s.scale.set(scale[0], scale[1], 1); else s.scale.setScalar(scale || 1);
    return s;
  };
  G.shadow = function (parent, r) {
    const m = new T.Mesh(geo('plane'), new T.MeshBasicMaterial({ map: G.tex.shadow, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.075; m.scale.set(r * 2, r * 2, 1);
    m.renderOrder = 1;
    parent.add(m);
    return m;
  };
  // flat overlay square on a tile
  G.tileQuad = function (tex, color, opacity) {
    const m = new T.Mesh(geo('plane'), new T.MeshBasicMaterial({ map: G.tex[tex], color: color || 0xffffff, transparent: true, opacity: opacity == null ? 1 : opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 2;
    return m;
  };

  // beam / lightning segment that fades
  G.beams = [];
  G.beam = function (a, b, color, width, life, zig) {
    const pts = [a];
    const segs = zig ? 4 : 1;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push(new T.Vector3(a.x + (b.x - a.x) * t + (Math.random() - 0.5) * zig, a.y + (b.y - a.y) * t + (Math.random() - 0.5) * zig, a.z + (b.z - a.z) * t + (Math.random() - 0.5) * zig));
    }
    pts.push(b);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1];
      const len = p0.distanceTo(p1);
      const m = new T.Mesh(geo('cyl'), new T.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false }));
      m.scale.set(width, len, width);
      m.position.copy(p0).add(p1).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3().subVectors(p1, p0).normalize());
      G.fxRoot.add(m);
      G.beams.push({ m, t: 0, life: life || 0.25 });
    }
  };
  G.beamUpdate = function (dt) {
    for (let i = G.beams.length - 1; i >= 0; i--) {
      const b = G.beams[i]; b.t += dt;
      b.m.material.opacity = 1 - b.t / b.life;
      if (b.t >= b.life) { G.fxRoot.remove(b.m); b.m.material.dispose(); G.beams.splice(i, 1); }
    }
  };

  /* =========================================================== DUCK MODELS */
  // Common cute duck body. Faces +x. Returns group with userData.parts.
  function duckBase(o) {
    const g = new T.Group();
    const inner = new T.Group(); g.add(inner);
    const body = o.body, s = o.scale || 1;
    inner.scale.setScalar(s);
    const parts = { inner };
    parts.body = P(inner, 'sphere', body, [0, 0.29, 0], [0.31, 0.26, 0.27], null, { outline: 0.06 });
    P(inner, 'sphere', shade(body, 1.12), [0.08, 0.24, 0], [0.22, 0.17, 0.22]); // belly
    P(inner, 'cone', body, [-0.3, 0.42, 0], [0.09, 0.2, 0.09], [0, 0, 1.0]); // tail
    const neckY = o.neck || 0;
    if (neckY) P(inner, 'cyl', body, [0.14, 0.45 + neckY / 2, 0], [0.08, neckY + 0.1, 0.08]);
    const head = new T.Group(); head.position.set(0.15, 0.56 + neckY, 0); inner.add(head);
    parts.head = head;
    P(head, 'sphere', o.headColor || body, [0, 0, 0], 0.18, null, { outline: 0.07 });
    const beakC = o.beak || '#ff9f1c';
    const bl = o.beakLen || 1;
    parts.beak = P(head, 'sphere', beakC, [0.17 * (0.85 + bl * 0.15), -0.03, 0], [0.11 * bl, 0.045, 0.085]);
    parts.beakLow = P(head, 'sphere', shade(beakC, 0.85), [0.15 * (0.85 + bl * 0.15), -0.065, 0], [0.09 * bl, 0.03, 0.07]);
    // eyes (blinkable)
    const eyes = new T.Group(); head.add(eyes); parts.eyes = eyes;
    [-1, 1].forEach(side => {
      P(eyes, 'sphere', '#ffffff', [0.11, 0.06, side * 0.085], [0.055, 0.065, 0.05]);
      P(eyes, 'sphere', '#1d1411', [0.15, 0.065, side * 0.095], [0.03, 0.04, 0.03]);
      P(eyes, 'sphere', '#ffffff', [0.17, 0.08, side * 0.1], 0.01, null, { basic: true });
    });
    if (G.high()) [-1, 1].forEach(side => P(head, 'sphere', '#ff9bb0', [0.08, -0.04, side * 0.14], [0.04, 0.025, 0.02]));
    // wings
    parts.wingL = P(inner, 'sphere', shade(body, 0.9), [-0.04, 0.32, 0.24], [0.18, 0.11, 0.05], [0, 0, -0.3]);
    parts.wingR = P(inner, 'sphere', shade(body, 0.9), [-0.04, 0.32, -0.24], [0.18, 0.11, 0.05], [0, 0, -0.3]);
    // feet
    if (!o.noFeet) [-1, 1].forEach(side => P(inner, 'sphere', '#ff9f1c', [0.08, 0.03, side * 0.11], [0.09, 0.025, 0.06]));
    g.userData = { parts, kind: 'duck', phase: Math.random() * 10, blink: 1 + Math.random() * 3, puff: 0, hurt: 0, quack: 0, sc: s };
    return g;
  }

  function shade(hex, k) {
    const c = new T.Color(hex);
    c.r = Math.min(1, c.r * k); c.g = Math.min(1, c.g * k); c.b = Math.min(1, c.b * k);
    return '#' + c.getHexString();
  }
  G.shade = shade;

  function addHat(head, hat) {
    if (!hat || hat === 'none') return;
    const h = new T.Group(); h.position.set(-0.02, 0.17, 0); head.add(h);
    if (hat === 'party') {
      P(h, 'cone', '#ff4fa3', [0, 0.1, 0], [0.08, 0.2, 0.08]);
      P(h, 'sphere', '#ffe14d', [0, 0.21, 0], 0.035);
    } else if (hat === 'top') {
      P(h, 'cyl', '#222233', [0, 0.01, 0], [0.13, 0.02, 0.13]);
      P(h, 'cyl', '#222233', [0, 0.1, 0], [0.085, 0.17, 0.085]);
      P(h, 'cyl', '#d23a3a', [0, 0.04, 0], [0.088, 0.035, 0.088]);
    } else if (hat === 'wizard') {
      P(h, 'cone', '#3a4fbf', [0, 0.13, 0], [0.11, 0.28, 0.11], [0, 0, -0.25]);
      P(h, 'cyl', '#3a4fbf', [0, 0.0, 0], [0.15, 0.015, 0.15]);
      P(h, 'sphere', '#ffe14d', [0.03, 0.12, 0.08], 0.025, null, { basic: true });
      P(h, 'sphere', '#ffe14d', [-0.03, 0.2, -0.05], 0.02, null, { basic: true });
    } else if (hat === 'crown') {
      P(h, 'cyl', '#ffcf33', [0, 0.04, 0], [0.09, 0.07, 0.09], null, { e: '#553300' });
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; P(h, 'cone', '#ffcf33', [Math.cos(a) * 0.07, 0.11, Math.sin(a) * 0.07], [0.025, 0.06, 0.025]); }
    }
  }

  G.duckBase = duckBase; G.addHat = addHat; G.canvasTex = canvasTex; G.star = star; G.ink = ink; G.blob = blob;
  G.makeDuck = function (id, o) {
    o = o || {};
    const d = D.DUCKS[id] || D.DUCKS.puddle;
    const look = d.look;
    let g;
    const B = d.body, A = d.accent;
    switch (look) {
      case 'chef': {
        g = duckBase({ body: B });
        const h = g.userData.parts.head;
        P(h, 'cyl', '#ffffff', [-0.02, 0.17, 0], [0.12, 0.08, 0.12]);
        P(h, 'sphere', '#ffffff', [-0.02, 0.26, 0], [0.16, 0.1, 0.16], null, { outline: 0.08 });
        P(g.userData.parts.inner, 'cyl', '#d9893a', [0.25, 0.25, 0.12], [0.05, 0.22, 0.05], [0, 0, 1.3]); // baguette
        break;
      }
      case 'tank': {
        g = duckBase({ body: B });
        const i = g.userData.parts.inner;
        P(i, 'cyl', A, [-0.2, 0.42, 0], [0.11, 0.26, 0.11], [0, 0, 0.4], { outline: 0.08 });
        P(i, 'sphere', '#d8f0ff', [-0.27, 0.56, 0], 0.07);
        g.userData.parts.nozzle = P(g.userData.parts.head, 'cyl', A, [0.27, -0.04, 0], [0.035, 0.12, 0.035], [0, 0, Math.PI / 2]);
        break;
      }
      case 'reed': {
        g = duckBase({ body: B });
        const i = g.userData.parts.inner;
        for (let k = 0; k < 6; k++) P(i, 'cyl', '#5f9e45', [-0.18 + (k % 3) * 0.08, 0.5, (k < 3 ? 1 : -1) * 0.12], [0.025, 0.42, 0.025], [(k < 3 ? 0.3 : -0.3), 0, 0.2]);
        P(i, 'sphere', '#8b5a2b', [-0.1, 0.72, 0.13], [0.03, 0.08, 0.03]);
        P(i, 'sphere', '#8b5a2b', [-0.02, 0.74, -0.12], [0.03, 0.08, 0.03]);
        P(g.userData.parts.head, 'dome', A, [0, 0.04, 0], [0.2, 0.15, 0.2], null, { outline: 0.06 });
        P(i, 'cyl', '#c9a35a', [0.3, 0.3, 0], [0.2, 0.04, 0.2], [0, 0, Math.PI / 2]); // woven shield
        break;
      }
      case 'shell': {
        g = new T.Group();
        const inner = new T.Group(); g.add(inner);
        const lowShell = P(inner, 'dome', A, [0, 0.12, 0], [0.34, 0.14, 0.3], [Math.PI, 0, 0], { outline: 0.05 });
        const top = new T.Group(); top.position.set(-0.28, 0.13, 0); inner.add(top);
        P(top, 'dome', A, [0.28, 0, 0], [0.34, 0.16, 0.3], null, { outline: 0.05 });
        for (let k = -2; k <= 2; k++) P(top, 'cyl', shade(A, 0.8), [0.28 + k * 0.06, 0.08, 0], [0.012, 0.3, 0.012], [Math.PI / 2, 0, k * 0.25]);
        top.rotation.z = 0.5;
        const head = new T.Group(); head.position.set(0.05, 0.22, 0); inner.add(head);
        P(head, 'sphere', B, [0, 0, 0], 0.13, null, { outline: 0.07 });
        const eyes = new T.Group(); head.add(eyes);
        [-1, 1].forEach(s => { P(eyes, 'sphere', '#fff', [0.08, 0.04, s * 0.06], 0.04); P(eyes, 'sphere', '#1d1411', [0.11, 0.045, s * 0.065], 0.022); });
        P(head, 'sphere', '#ff9f1c', [0.13, -0.02, 0], [0.07, 0.03, 0.06]);
        const light = P(inner, 'sphere', '#ff3030', [-0.12, 0.33, 0], 0.035, null, { basic: true });
        g.userData = { parts: { inner, head, eyes, top, light, body: lowShell }, kind: 'duck', phase: Math.random() * 10, blink: 2, puff: 0, hurt: 0, quack: 0 };
        break;
      }
      case 'frost': {
        g = duckBase({ body: B, beak: '#7fd3ff' });
        const h = g.userData.parts.head;
        for (let k = 0; k < 5; k++) P(h, 'cone', '#e8fbff', [-0.04 + Math.cos(k / 5 * TAU) * 0.08, 0.2, Math.sin(k / 5 * TAU) * 0.08], [0.035, 0.12, 0.035], null, { e: '#336677' });
        P(g.userData.parts.inner, 'torus', A, [0.12, 0.43, 0], [0.13, 0.13, 0.2], [Math.PI / 2, 0, 0]);
        P(g.userData.parts.inner, 'box', A, [0.05, 0.33, 0.17], [0.06, 0.16, 0.04], [0, 0, 0.3]);
        break;
      }
      case 'mallard': {
        g = duckBase({ body: B, headColor: A });
        P(g.userData.parts.inner, 'torus', '#ffffff', [0.14, 0.45, 0], [0.12, 0.12, 0.16], [Math.PI / 2, 0, 0]);
        const i = g.userData.parts.inner;
        P(i, 'cyl', '#a8743a', [-0.18, 0.5, 0], [0.13, 0.12, 0.13], null, { outline: 0.07 });
        [[-0.2, 0.6, 0.04], [-0.14, 0.61, -0.04], [-0.24, 0.6, -0.05]].forEach(p => P(i, 'sphere', '#f2c27a', p, 0.06));
        g.userData.parts.spoon = P(i, 'cyl', '#7a5230', [-0.05, 0.62, 0], [0.02, 0.35, 0.02], [0, 0, 0.6]);
        break;
      }
      case 'twin': {
        g = duckBase({ body: B });
        const p = g.userData.parts;
        p.head.position.z = 0.12; p.head.rotation.y = -0.15;
        // second head
        const h2 = new T.Group(); h2.position.set(0.15, 0.54, -0.13); h2.rotation.y = 0.15; p.inner.add(h2);
        P(h2, 'sphere', B, [0, 0, 0], 0.16, null, { outline: 0.07 });
        P(h2, 'sphere', '#ff9f1c', [0.16, -0.03, 0], [0.1, 0.04, 0.08]);
        const e2 = new T.Group(); h2.add(e2);
        [-1, 1].forEach(s => { P(e2, 'sphere', '#fff', [0.1, 0.05, s * 0.075], 0.05); P(e2, 'sphere', '#1d1411', [0.14, 0.055, s * 0.085], 0.028); });
        p.head2 = h2; p.eyes2 = e2;
        [p.head, h2].forEach(h => P(h, 'box', '#222', [0.15, 0.07, 0], [0.04, 0.05, 0.2]));
        P(p.inner, 'cyl', A, [-0.18, 0.44, 0], [0.1, 0.22, 0.14], [0, 0, 0.4]);
        break;
      }
      case 'gust': {
        g = duckBase({ body: B });
        const p = g.userData.parts;
        p.wingL.scale.set(0.28, 0.16, 0.06); p.wingR.scale.set(0.28, 0.16, 0.06);
        p.wingL.material = G.mat(A); p.wingR.material = G.mat(A);
        [-1, 1].forEach(s => { P(p.head, 'torus', '#8a5a2b', [0.06, 0.1, s * 0.07], 0.045, [0, Math.PI / 2, 0]); P(p.head, 'sphere', '#bfe8ff', [0.07, 0.1, s * 0.07], 0.035); });
        P(p.head, 'cyl', '#8a5a2b', [0, 0.1, 0], [0.18, 0.03, 0.18], [Math.PI / 2, 0, 0]);
        P(p.eyes, 'sphere', A, [0.15, 0.065, 0.095], 0.032); P(p.eyes, 'sphere', A, [0.15, 0.065, -0.095], 0.032);
        break;
      }
      case 'patch': {
        g = duckBase({ body: B });
        const i = g.userData.parts.inner;
        const cols = ['#7fd3ff', '#ffe14d', '#9be07a', '#c89cff', '#ff9f43'];
        [[0.1, 0.38, 0.2], [-0.15, 0.3, 0.22], [0.02, 0.18, 0.24], [-0.1, 0.42, -0.2], [0.12, 0.25, -0.22]].forEach((p, k) => P(i, 'sphere', cols[k], p, [0.08, 0.07, 0.03], [0, 0, k]));
        const h = g.userData.parts.head;
        P(h, 'torus', '#ffffff', [0, 0.1, 0], [0.17, 0.17, 0.2], [Math.PI / 2, 0, 0]);
        P(h, 'box', '#ff3b3b', [0.15, 0.12, 0.03], [0.02, 0.07, 0.025]);
        P(h, 'box', '#ff3b3b', [0.15, 0.12, 0.03], [0.02, 0.025, 0.07]);
        break;
      }
      case 'loon': {
        g = duckBase({ body: B, beak: '#333333' });
        const i = g.userData.parts.inner;
        for (let k = 0; k < 8; k++) P(i, 'sphere', '#ffffff', [-0.15 + (k % 4) * 0.08, 0.38 + Math.floor(k / 4) * 0.06, 0.24], 0.025);
        P(i, 'torus', '#ffffff', [0.14, 0.45, 0], [0.12, 0.12, 0.15], [Math.PI / 2, 0, 0]);
        P(g.userData.parts.eyes, 'sphere', '#ff3333', [0.15, 0.065, 0.095], 0.032);
        P(i, 'cyl', '#5a3d2b', [0.32, 0.5, 0.12], [0.015, 0.5, 0.015], [0, 0, -0.2]);
        P(i, 'cyl', '#5a3d2b', [0.38, 0.72, 0.12], [0.06, 0.03, 0.06]);
        const lamp = P(i, 'sphere', A, [0.38, 0.64, 0.12], [0.07, 0.08, 0.07], null, { basic: true });
        const glow = G.sprite('glow', 0.7); glow.position.set(0.38, 0.64, 0.12); i.add(glow);
        g.userData.parts.lamp = lamp; g.userData.parts.glow = glow;
        break;
      }
      case 'zap': {
        g = duckBase({ body: B });
        const h = g.userData.parts.head;
        for (let k = 0; k < 4; k++) P(h, 'cone', A, [-0.1 + k * 0.06, 0.2 - Math.abs(k - 1.5) * 0.02, 0], [0.04, 0.16, 0.025], [0, 0, 0.4 - k * 0.1], { e: '#554400' });
        const i = g.userData.parts.inner;
        P(i, 'cyl', '#444455', [-0.2, 0.44, 0], [0.09, 0.22, 0.09], [0, 0, 0.4], { outline: 0.08 });
        P(i, 'cyl', A, [-0.26, 0.56, 0], [0.05, 0.05, 0.05], [0, 0, 0.4]);
        break;
      }
      case 'thistle': {
        g = new T.Group();
        const inner = new T.Group(); g.add(inner);
        P(inner, 'cyl', '#6b4a2a', [0, 0.06, 0], [0.38, 0.08, 0.38]);
        for (let k = 0; k < 14; k++) {
          const a = k / 14 * TAU;
          P(inner, 'cone', k % 2 ? A : '#5d8f3a', [Math.cos(a) * 0.32, 0.18, Math.sin(a) * 0.32], [0.04, 0.22, 0.04], [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4]);
        }
        const body = P(inner, 'sphere', B, [0, 0.16, 0], [0.26, 0.12, 0.22], null, { outline: 0.06 });
        const head = new T.Group(); head.position.set(0.18, 0.2, 0); inner.add(head);
        P(head, 'sphere', B, [0, 0, 0], 0.13, null, { outline: 0.07 });
        const eyes = new T.Group(); head.add(eyes);
        [-1, 1].forEach(s => { P(eyes, 'sphere', '#fff', [0.08, 0.04, s * 0.06], 0.04); P(eyes, 'sphere', '#1d1411', [0.11, 0.035, s * 0.065], 0.022); });
        P(head, 'sphere', '#ff9f1c', [0.13, -0.02, 0], [0.08, 0.03, 0.06]);
        g.userData = { parts: { inner, head, eyes, body }, kind: 'duck', phase: Math.random() * 10, blink: 2, puff: 0, hurt: 0, quack: 0 };
        break;
      }
      case 'boom': {
        g = duckBase({ body: B, scale: 0.78 });
        const h = g.userData.parts.head;
        P(h, 'cyl', '#333', [-0.03, 0.22, 0], [0.02, 0.12, 0.02], [0, 0, 0.3]);
        const spark = G.sprite('sparkle', 0.25); spark.position.set(-0.06, 0.3, 0); h.add(spark);
        g.userData.parts.spark = spark;
        P(g.userData.parts.inner, 'torus', A, [0, 0.3, 0], [0.3, 0.3, 0.5], [Math.PI / 2, 0, 0]);
        break;
      }
      case 'storm': {
        g = duckBase({ body: B });
        const cloud = new T.Group(); cloud.position.set(0.05, 1.0, 0); g.userData.parts.inner.add(cloud);
        [[0, 0, 0, 0.16], [0.13, -0.02, 0, 0.12], [-0.13, -0.02, 0, 0.12], [0.05, 0.08, 0.05, 0.11], [-0.05, 0.06, -0.06, 0.1]].forEach(c => P(cloud, 'sphere', A, [c[0], c[1], c[2]], c[3], null, { outline: 0.05 }));
        P(cloud, 'cone', '#ffe94d', [0.02, -0.18, 0.04], [0.03, 0.12, 0.03], [0, 0, 0.3], { basic: true });
        g.userData.parts.cloud = cloud;
        break;
      }
      case 'raft': {
        g = new T.Group();
        const inner = new T.Group(); g.add(inner);
        const pad = P(inner, 'cyl', B, [0, 0.05, 0], [0.44, 0.05, 0.44], null, { outline: 0.04 });
        P(inner, 'box', '#4aa3d8', [0.3, 0.06, 0.15], [0.2, 0.06, 0.06], [0, 0.6, 0]);
        P(inner, 'sphere', A, [-0.25, 0.12, -0.2], 0.07); P(inner, 'sphere', '#ffe14d', [-0.25, 0.17, -0.2], 0.03);
        const head = new T.Group(); head.position.set(0.28, 0.14, -0.2); inner.add(head);
        P(head, 'sphere', '#ffe27a', [0, 0, 0], 0.1);
        const eyes = new T.Group(); head.add(eyes);
        [-1, 1].forEach(s => { P(eyes, 'sphere', '#1d1411', [0.07, 0.03, s * 0.05], [0.02, 0.008, 0.02]); });
        P(head, 'sphere', '#ff9f1c', [0.1, -0.02, 0], [0.06, 0.025, 0.05]);
        g.userData = { parts: { inner, head, eyes, body: pad }, kind: 'duck', phase: Math.random() * 10, blink: 2, puff: 0, hurt: 0, quack: 0, flat: true };
        break;
      }
      case 'bubble': {
        g = duckBase({ body: B });
        const i = g.userData.parts.inner;
        P(i, 'cyl', '#c08040', [0.3, 0.5, 0.12], [0.015, 0.36, 0.015], [0, 0, -0.5]);
        P(i, 'torus', A, [0.42, 0.68, 0.12], 0.07, [0, Math.PI / 2, 0]);
        const b = G.sprite('bubble', 0.26); b.position.set(0.5, 0.85, 0.12); i.add(b); g.userData.parts.bub = b;
        P(g.userData.parts.head, 'sphere', '#ff5fae', [-0.03, 0.17, 0], [0.09, 0.05, 0.09]);
        break;
      }
      case 'drum': {
        g = duckBase({ body: B });
        const h = g.userData.parts.head;
        P(h, 'cyl', A, [-0.02, 0.2, 0], [0.11, 0.2, 0.11], null, { outline: 0.08 });
        P(h, 'cyl', '#ffd34d', [-0.02, 0.11, 0], [0.115, 0.03, 0.115]);
        P(h, 'sphere', '#ff3b3b', [-0.02, 0.36, 0], [0.04, 0.08, 0.04]);
        const i = g.userData.parts.inner;
        g.userData.parts.drum = P(i, 'cyl', '#ffffff', [0.22, 0.24, 0.05], [0.16, 0.14, 0.16], [0.2, 0, 0.3], { outline: 0.06 });
        P(i, 'cyl', '#d23a3a', [0.22, 0.24, 0.05], [0.165, 0.04, 0.165], [0.2, 0, 0.3]);
        g.userData.parts.stick = P(i, 'cyl', '#8a5a2b', [0.18, 0.46, 0.18], [0.015, 0.25, 0.015], [0.3, 0, -0.6]);
        break;
      }
      case 'shield': {
        g = duckBase({ body: B, beakLen: 1.5 });
        g.userData.parts.beak.scale.set(0.16, 0.05, 0.14);
        const i = g.userData.parts.inner;
        g.userData.parts.shieldDisc = P(i, 'cyl', A, [0.05, 0.32, 0.3], [0.2, 0.04, 0.2], [Math.PI / 2, 0, 0], { outline: 0.06 });
        P(i, 'sphere', '#ffffff', [0.05, 0.32, 0.33], [0.06, 0.06, 0.02]);
        break;
      }
      case 'long': {
        g = duckBase({ body: B, beak: '#ffb347', beakLen: 2.6 });
        P(g.userData.parts.head, 'torus', '#d4a017', [0.15, 0.065, 0.1], 0.04, [0, Math.PI / 2, 0]);
        P(g.userData.parts.head, 'box', A, [-0.02, 0.15, 0], [0.24, 0.05, 0.22]);
        P(g.userData.parts.head, 'cyl', A, [-0.02, 0.2, 0], [0.09, 0.08, 0.09]);
        break;
      }
      case 'cocoa': {
        g = duckBase({ body: B, beak: '#ffffff' });
        const h = g.userData.parts.head;
        P(h, 'sphere', '#ffffff', [0.1, 0.07, 0], [0.06, 0.07, 0.05]);
        P(h, 'dome', '#d23a3a', [-0.02, 0.06, 0], [0.18, 0.15, 0.18]);
        P(h, 'sphere', '#ffffff', [-0.04, 0.22, 0], 0.05);
        const i = g.userData.parts.inner;
        P(i, 'cyl', '#ffffff', [0.3, 0.3, 0.12], [0.07, 0.12, 0.07], null, { outline: 0.1 });
        P(i, 'cyl', '#5a3a20', [0.3, 0.36, 0.12], [0.06, 0.01, 0.06]);
        const steam = G.sprite('puff', 0.18, { opacity: 0.6 }); steam.position.set(0.3, 0.48, 0.12); i.add(steam); g.userData.parts.steam = steam;
        break;
      }
      case 'tall': {
        g = duckBase({ body: B, neck: 0.62 });
        const i = g.userData.parts.inner;
        for (let k = 0; k < 4; k++) P(i, 'torus', A, [0.14, 0.52 + k * 0.15, 0], [0.09, 0.09, 0.12], [Math.PI / 2, 0, 0]);
        break;
      }
      case 'magnet': {
        g = duckBase({ body: B });
        const i = g.userData.parts.inner;
        const mg = new T.Group(); mg.position.set(-0.05, 0.98, 0); i.add(mg);
        P(mg, 'halfTorus', A, [0, 0, 0], 0.16, [0, 0, 0], { outline: 0.06 });
        P(mg, 'box', '#e8e8e8', [0.16, -0.04, 0], [0.09, 0.07, 0.09]);
        P(mg, 'box', '#e8e8e8', [-0.16, -0.04, 0], [0.09, 0.07, 0.09]);
        P(i, 'cyl', '#888', [-0.05, 0.8, 0], [0.02, 0.2, 0.02]);
        g.userData.parts.magnet = mg;
        break;
      }
      case 'sour': {
        g = duckBase({ body: B, scale: 0.92 });
        const i = g.userData.parts.inner;
        for (let k = 0; k < 3; k++) P(i, 'box', A, [-0.1 + k * 0.1, 0.52, 0], [0.03, 0.02, 0.2], [0, 0.4, 0]);
        const loaf = new T.Group(); i.add(loaf); loaf.visible = false;
        P(loaf, 'sphere', '#b8742f', [0, 0.47, 0], [0.32, 0.12, 0.27], null, { outline: 0.06 });
        for (let k = 0; k < 3; k++) P(loaf, 'box', '#f2d29a', [-0.12 + k * 0.12, 0.58, 0], [0.04, 0.02, 0.22], [0, 0.5, 0]);
        g.userData.parts.loaf = loaf;
        break;
      }
      case 'hammer': {
        g = duckBase({ body: B, scale: 1.08 });
        const h = g.userData.parts.head;
        P(h, 'dome', '#ffb000', [0, 0.05, 0], [0.2, 0.15, 0.2], null, { outline: 0.06 });
        P(h, 'cyl', '#ffb000', [0.04, 0.06, 0], [0.24, 0.015, 0.24]);
        const arm = new T.Group(); arm.position.set(0.05, 0.38, 0.2); g.userData.parts.inner.add(arm);
        P(arm, 'cyl', '#8a5a2b', [0, 0.25, 0], [0.025, 0.5, 0.025]);
        P(arm, 'cyl', A, [0, 0.5, 0], [0.1, 0.24, 0.1], [Math.PI / 2, 0, 0], { outline: 0.06 });
        arm.rotation.z = 0.5;
        g.userData.parts.arm = arm;
        break;
      }
      default: g = duckBase({ body: B });
    }
    // cosmetic hat (only on ducks with a normal head)
    const hat = o.hat != null ? o.hat : D.Save.data.hat;
    if (hat && hat !== 'none' && ['chef', 'reed', 'drum', 'cocoa', 'hammer', 'frost', 'zap', 'shell', 'thistle', 'raft', 'long', 'twisty', 'sizzle', 'spade', 'copycat', 'decoy'].indexOf(look) < 0 && g.userData.parts.head) addHat(g.userData.parts.head, hat);
    if (!o.noShadow) G.shadow(g, look === 'raft' ? 0.5 : 0.38);
    g.userData.id = id;
    g.userData.look = look;
    return g;
  };

  // small helpers models
  G.makeDuckling = function () {
    const g = duckBase({ body: '#ffe066', scale: 0.55 });
    g.userData.parts.eyes.scale.y = 0.15; // sleepy
    P(g, 'cyl', '#c9a35a', [0, 0.04, 0], [0.32, 0.05, 0.32]); // nest
    G.shadow(g, 0.32);
    return g;
  };

  G.makeGoose = function (gold) {
    const body = gold ? '#ffd84a' : '#ffffff';
    const g = duckBase({ body, neck: 0.3, beak: '#ff8c1a', scale: 1.05 });
    const h = g.userData.parts.head;
    P(h, 'cyl', '#2f4fa8', [-0.01, 0.15, 0], [0.14, 0.07, 0.14]);
    P(h, 'cyl', '#1d2f6a', [0.08, 0.12, 0], [0.12, 0.015, 0.14]);
    P(h, 'sphere', '#ffd84a', [0.12, 0.17, 0], 0.025, null, { basic: true });
    if (gold) { const s = G.sprite('sparkle', 0.3); s.position.set(0, 0.6, 0.2); g.add(s); }
    G.shadow(g, 0.38);
    return g;
  };

  G.makeCoach = function () {
    const g = duckBase({ body: '#ffe066' });
    const h = g.userData.parts.head;
    P(h, 'dome', '#e53935', [0, 0.05, 0], [0.19, 0.12, 0.19]);
    P(h, 'cyl', '#e53935', [0.13, 0.06, 0], [0.12, 0.015, 0.12]);
    P(g.userData.parts.inner, 'cyl', '#c0c0c0', [0.25, 0.42, 0.1], [0.03, 0.08, 0.03], [0, 0, Math.PI / 2]);
    return g;
  };

  /* =========================================================== DOG MODELS */
  function dogBase(o) {
    const g = new T.Group();
    const inner = new T.Group(); g.add(inner);
    inner.scale.setScalar(o.scale || 1);
    const C = o.body, C2 = o.belly || shade(o.body, 1.25);
    const parts = { inner, legs: [] };
    const bl = o.bodyLen || 1, legH = o.legH || 0.28;
    const by = legH + 0.14;
    parts.body = P(inner, 'sphere', C, [0, by, 0], [0.34 * bl, 0.21, 0.2], null, { outline: 0.06 });
    P(inner, 'sphere', C2, [0.1, by - 0.06, 0], [0.22 * bl, 0.12, 0.16]);
    if (o.spot) P(inner, 'sphere', o.spot, [-0.08, by + 0.1, 0.1], [0.14, 0.1, 0.12]);
    // legs
    [[0.2 * bl, 0.11], [0.2 * bl, -0.11], [-0.22 * bl, 0.11], [-0.22 * bl, -0.11]].forEach((p, k) => {
      const leg = new T.Group(); leg.position.set(p[0], by - 0.04, p[1]); inner.add(leg);
      P(leg, 'cyl', C, [0, -legH / 2, 0], [0.055, legH, 0.055]);
      P(leg, 'sphere', C2, [0.03, -legH + 0.01, 0], [0.07, 0.04, 0.06]);
      parts.legs.push(leg);
    });
    // tail
    const tail = new T.Group(); tail.position.set(-0.32 * bl, by + 0.06, 0); inner.add(tail);
    P(tail, 'cyl', C, [0, 0.12, 0], [0.035, 0.24, 0.035]);
    if (o.tailPom) P(tail, 'sphere', o.tailPom, [0, 0.25, 0], 0.07);
    tail.rotation.z = 0.7;
    parts.tail = tail;
    // head
    const head = new T.Group(); head.position.set(0.3 * bl, by + 0.22, 0); inner.add(head);
    parts.head = head;
    P(head, 'sphere', C, [0, 0, 0], [0.19, 0.18, 0.18], null, { outline: 0.07 });
    P(head, 'sphere', o.muzzle || C2, [0.15, -0.05, 0], [0.12, 0.085, 0.1]);
    P(head, 'sphere', '#1a1210', [0.26, -0.02, 0], [0.04, 0.035, 0.045]);
    parts.mouth = P(head, 'sphere', '#ff7a8a', [0.16, -0.12, 0], [0.06, 0.03, 0.05]);
    parts.mouth.visible = false;
    const eyes = new T.Group(); head.add(eyes); parts.eyes = eyes;
    [-1, 1].forEach(s => {
      P(eyes, 'sphere', '#ffffff', [0.11, 0.06, s * 0.08], [0.05, 0.055, 0.045]);
      P(eyes, 'sphere', '#1d1411', [0.145, 0.06, s * 0.085], [0.028, 0.034, 0.028]);
      P(eyes, 'sphere', '#ffffff', [0.16, 0.075, s * 0.09], 0.009, null, { basic: true });
    });
    // brows (expressive)
    parts.brows = [];
    [-1, 1].forEach(s => parts.brows.push(P(head, 'box', '#2b1e1a', [0.12, 0.13, s * 0.08], [0.02, 0.018, 0.07], [s * 0.25, 0, 0])));
    // ears
    parts.ears = [];
    [-1, 1].forEach(s => {
      const ear = new T.Group(); ear.position.set(-0.02, 0.1, s * 0.15); head.add(ear);
      if (o.pointy) P(ear, 'cone', o.ear || shade(C, 0.8), [0, 0.08, 0], [0.06, 0.16, 0.04]);
      else P(ear, 'sphere', o.ear || shade(C, 0.75), [0, -0.08, 0], [0.06, 0.12 * (o.earLen || 1), 0.035]);
      ear.rotation.x = s * (o.pointy ? -0.2 : 0.35);
      parts.ears.push(ear);
    });
    g.userData = { parts, kind: 'dog', phase: Math.random() * 10, blink: 2 + Math.random() * 2, hurt: 0, walk: 0, bite: 0 };
    return g;
  }

  G.dogBase = dogBase;
  G.makeDog = function (id) {
    const d = D.DOGS[id] || D.DOGS.mutt;
    let g;
    const B = d.body;
    switch (d.look) {
      case 'mutt': g = dogBase({ body: B, spot: '#8a5a2b' }); break;
      case 'banner': {
        g = dogBase({ body: B, spot: '#3b2a1e', ear: '#7a4a2a', earLen: 1.3 });
        const i = g.userData.parts.inner;
        P(i, 'cyl', '#8a5a2b', [0.0, 0.85, 0.12], [0.02, 1.0, 0.02]);
        const flag = new T.Mesh(geo('plane'), new T.MeshBasicMaterial({ map: G.tex.pawFlag, side: T.DoubleSide }));
        flag.scale.set(0.42, 0.3, 1); flag.position.set(-0.2, 1.2, 0.12); i.add(flag);
        g.userData.parts.flag = flag;
        break;
      }
      case 'helmet': {
        g = dogBase({ body: B });
        const h = g.userData.parts.head;
        const hel = new T.Group(); h.add(hel);
        P(hel, 'dome', '#e53935', [0, 0.06, 0], [0.21, 0.16, 0.21], null, { outline: 0.06 });
        P(hel, 'box', '#ffffff', [0, 0.18, 0], [0.24, 0.025, 0.04]);
        g.userData.parts.armor = hel;
        break;
      }
      case 'runner': {
        g = dogBase({ body: B, legH: 0.38, bodyLen: 1.15, pointy: false, earLen: 0.7 });
        const h = g.userData.parts.head;
        P(h, 'torus', '#ff3b7a', [0, 0.06, 0], [0.18, 0.18, 0.28], [Math.PI / 2, 0, 0]);
        g.userData.parts.legs.forEach(l => P(l, 'sphere', '#ff3b7a', [0.03, -0.37, 0], [0.08, 0.045, 0.065]));
        break;
      }
      case 'pogo': {
        g = dogBase({ body: B, tailPom: '#ffffff', ear: '#ffffff' });
        const p = g.userData.parts;
        P(p.head, 'sphere', '#ffffff', [-0.02, 0.17, 0], 0.11, null, { outline: 0.08 });
        p.legs.forEach(l => P(l, 'sphere', '#ffffff', [0, -0.15, 0], 0.07));
        const pogo = new T.Group(); p.inner.add(pogo);
        P(pogo, 'cyl', '#9aa3ad', [0.05, 0.25, 0.22], [0.025, 0.7, 0.025]);
        P(pogo, 'torus', '#555', [0.05, 0.05, 0.22], [0.06, 0.06, 0.1], [Math.PI / 2, 0, 0]);
        P(pogo, 'box', '#333', [0.05, 0.58, 0.22], [0.25, 0.03, 0.04]);
        p.armor = pogo;
        P(p.head, 'sphere', '#ff8fc8', [-0.12, 0.08, 0.15], 0.04);
        break;
      }
      case 'door': {
        g = dogBase({ body: B, spot: '#c98d4f', pointy: true, ear: '#3b2a1e' });
        const p = g.userData.parts;
        const door = new T.Group(); door.position.set(0.55, 0.5, 0.02); p.inner.add(door);
        P(door, 'box', '#e9e2d0', [0, 0, 0], [0.05, 0.85, 0.6], null, { outline: 0.03 });
        const scr = new T.Mesh(geo('plane'), new T.MeshBasicMaterial({ map: G.tex.screen, transparent: true, side: T.DoubleSide }));
        scr.scale.set(0.48, 0.32, 1); scr.rotation.y = Math.PI / 2; scr.position.set(0.03, 0.15, 0); door.add(scr);
        P(door, 'sphere', '#d4a017', [0.04, -0.05, 0.22], 0.03);
        p.armor = door;
        break;
      }
      case 'sneaky': {
        g = dogBase({ body: B, spot: '#4f6038' });
        const p = g.userData.parts;
        const bush = new T.Group(); p.inner.add(bush);
        [[0, 0.62, 0, 0.2], [0.15, 0.55, 0.1, 0.15], [-0.15, 0.58, -0.08, 0.16], [0.05, 0.72, -0.1, 0.13], [-0.12, 0.66, 0.12, 0.13]].forEach(c => P(bush, 'sphere', '#3f8a3a', [c[0], c[1], c[2]], c[3]));
        P(p.head, 'box', '#222', [0.13, 0.06, 0], [0.04, 0.05, 0.22]);
        p.bush = bush;
        break;
      }
      case 'digger': {
        g = dogBase({ body: B, bodyLen: 1.5, legH: 0.16, earLen: 1.3 });
        const p = g.userData.parts;
        P(p.head, 'dome', '#ffcc00', [0, 0.06, 0], [0.2, 0.14, 0.2], null, { outline: 0.06 });
        P(p.head, 'sphere', '#ffffcc', [0.14, 0.12, 0], 0.045, null, { basic: true });
        P(p.inner, 'cyl', '#8a5a2b', [-0.1, 0.5, 0.18], [0.02, 0.5, 0.02], [0.3, 0, 0.8]);
        P(p.inner, 'box', '#9aa3ad', [-0.28, 0.66, 0.24], [0.12, 0.16, 0.03], [0.3, 0, 0.8]);
        const mound = new T.Group(); g.add(mound); mound.visible = false;
        P(mound, 'dome', '#7a5230', [0, 0, 0], [0.35, 0.2, 0.3], null, { outline: 0.05 });
        P(mound, 'sphere', '#8a6240', [0.2, 0.05, 0.1], 0.07);
        P(mound, 'sphere', '#8a6240', [-0.2, 0.04, -0.12], 0.06);
        p.mound = mound;
        break;
      }
      case 'nurse': {
        g = dogBase({ body: B, scale: 1.18, belly: '#555555' });
        const h = g.userData.parts.head;
        P(h, 'box', '#ffffff', [-0.01, 0.2, 0], [0.18, 0.08, 0.22], null, { outline: 0.06 });
        P(h, 'box', '#ff3b3b', [0.08, 0.2, 0.0], [0.015, 0.05, 0.03]);
        P(h, 'box', '#ff3b3b', [0.08, 0.2, 0.0], [0.015, 0.02, 0.07]);
        const ring = G.sprite('ring', 1.3, { color: '#8cffb0', opacity: 0.45 }); ring.position.y = 0.4; g.add(ring);
        g.userData.parts.aura = ring;
        break;
      }
      case 'snorkel': {
        g = dogBase({ body: B });
        const h = g.userData.parts.head;
        [-1, 1].forEach(s => P(h, 'torus', '#ff7a1a', [0.11, 0.06, s * 0.08], 0.05, [0, Math.PI / 2, 0]));
        P(h, 'cyl', '#ff7a1a', [-0.05, 0.25, 0.14], [0.025, 0.36, 0.025]);
        P(h, 'cyl', '#ff7a1a', [0.0, 0.42, 0.14], [0.03, 0.05, 0.03]);
        break;
      }
      case 'skater': {
        g = dogBase({ body: B, muzzle: '#e8e8e8' });
        const p = g.userData.parts;
        P(p.head, 'box', '#e8e8e8', [0.15, -0.14, 0], [0.12, 0.08, 0.1]); // beard
        P(p.head, 'dome', '#2fa84f', [-0.02, 0.06, 0], [0.19, 0.13, 0.19]);
        P(p.head, 'box', '#2fa84f', [-0.18, 0.06, 0], [0.14, 0.02, 0.12]);
        const board = new T.Group(); p.inner.add(board);
        P(board, 'box', '#ff5a4a', [0, 0.06, 0], [0.75, 0.035, 0.24], null, { outline: 0.05 });
        [[0.25, 0.1], [0.25, -0.1], [-0.25, 0.1], [-0.25, -0.1]].forEach(w => P(board, 'sphere', '#ffe14d', [w[0], 0.02, w[1]], 0.035));
        p.inner.position.y = 0.06;
        p.board = board;
        const arrow = G.sprite(G.tex.arrow, 0.5, { color: '#ffef5a' }); arrow.position.set(0, 1.25, 0); arrow.visible = false; g.add(arrow);
        p.laneArrow = arrow;
        break;
      }
      case 'tennis': {
        g = dogBase({ body: B, spot: '#d9b77a' });
        const p = g.userData.parts;
        P(p.head, 'box', '#3ac46a', [0.1, 0.13, 0], [0.22, 0.02, 0.24]);
        P(p.head, 'torus', '#ffffff', [0, 0.1, 0], [0.18, 0.18, 0.2], [Math.PI / 2, 0, 0]);
        const rk = new T.Group(); rk.position.set(0.2, 0.55, 0.22); p.inner.add(rk);
        P(rk, 'cyl', '#5a3d2b', [0, 0, 0], [0.02, 0.25, 0.02]);
        P(rk, 'torus', '#3a7bd5', [0, 0.22, 0], [0.1, 0.13, 0.1], [0, Math.PI / 2, 0]);
        rk.rotation.z = -0.4;
        p.racket = rk;
        break;
      }
      case 'samoyed': {
        g = dogBase({ body: B, pointy: true, ear: '#ffffff' });
        const p = g.userData.parts;
        [[0, 0.52, 0.12], [0.12, 0.55, -0.1], [-0.15, 0.5, 0.1], [-0.05, 0.62, -0.08]].forEach(c => P(p.inner, 'sphere', '#ffffff', c, 0.12));
        P(p.inner, 'torus', '#ff3b3b', [0.28, 0.58, 0], [0.12, 0.12, 0.16], [Math.PI / 2, 0, 0.3]);
        p.ball = P(p.inner, 'sphere', '#ffffff', [0.38, 0.4, 0.2], 0.08, null, { outline: 0.1 });
        break;
      }
      case 'husky': {
        g = dogBase({ body: B, belly: '#ffffff', muzzle: '#ffffff', pointy: true, ear: '#6b7688' });
        const p = g.userData.parts;
        [-1, 1].forEach(s => P(p.head, 'sphere', '#9fe0ff', [0.12, 0.08, s * 0.08], [0.03, 0.05, 0.05]));
        P(p.head, 'box', '#333', [0.06, 0.08, 0], [0.04, 0.03, 0.34]);
        const sled = new T.Group(); p.inner.add(sled);
        P(sled, 'box', '#b5651d', [0, 0.1, 0], [0.8, 0.07, 0.4], null, { outline: 0.04 });
        P(sled, 'box', '#d23a3a', [-0.25, 0.25, 0], [0.12, 0.25, 0.38]);
        [-1, 1].forEach(s => P(sled, 'box', '#888', [0.04, 0.03, s * 0.17], [0.86, 0.025, 0.03]));
        P(sled, 'cyl', '#888', [0.44, 0.08, 0], [0.04, 0.38, 0.04], [Math.PI / 2, 0, 0]);
        p.inner.position.y = 0.1;
        p.armor = sled; p.sled = sled;
        break;
      }
      case 'knight': {
        g = dogBase({ body: B, scale: 1.12 });
        const p = g.userData.parts;
        const arm = new T.Group(); p.inner.add(arm);
        P(arm, 'sphere', '#b8c0cc', [0, 0.48, 0], [0.36, 0.2, 0.23], null, { outline: 0.05 });
        const hel = new T.Group(); hel.position.copy(p.head.position); arm.add(hel);
        P(hel, 'sphere', '#b8c0cc', [0, 0.02, 0], [0.21, 0.2, 0.2], null, { outline: 0.05 });
        P(hel, 'box', '#333', [0.18, 0.04, 0], [0.04, 0.03, 0.22]);
        P(hel, 'cone', '#e53935', [-0.05, 0.27, 0], [0.05, 0.18, 0.05], [0, 0, -0.4]);
        p.armor = arm;
        break;
      }
      case 'catapult': {
        g = dogBase({ body: B, legH: 0.16, pointy: true, earLen: 1.4, belly: '#ffffff' });
        const p = g.userData.parts;
        const cart = new T.Group(); cart.position.set(-0.55, 0, 0); p.inner.add(cart);
        P(cart, 'box', '#8a5a2b', [0, 0.18, 0], [0.42, 0.1, 0.36], null, { outline: 0.04 });
        [-1, 1].forEach(s => P(cart, 'cyl', '#5a3d2b', [0, 0.1, s * 0.2], [0.1, 0.03, 0.1], [Math.PI / 2, 0, 0]));
        const arm = new T.Group(); arm.position.set(0.1, 0.25, 0); cart.add(arm);
        P(arm, 'cyl', '#a8743a', [-0.18, 0.08, 0], [0.025, 0.42, 0.025], [0, 0, 1.2]);
        P(arm, 'dome', '#5a3d2b', [-0.36, 0.17, 0], [0.08, 0.05, 0.08], [Math.PI, 0, 0]);
        p.catArm = arm;
        break;
      }
      case 'bulldozer': {
        g = dogBase({ body: B, scale: 1.75, legH: 0.22, muzzle: '#e8d0b8' });
        const p = g.userData.parts;
        P(p.head, 'sphere', '#e8d0b8', [0.12, -0.1, 0.08], [0.08, 0.08, 0.08]);
        P(p.head, 'sphere', '#e8d0b8', [0.12, -0.1, -0.08], [0.08, 0.08, 0.08]);
        P(p.head, 'dome', '#ffb000', [-0.02, 0.07, 0], [0.2, 0.13, 0.2], null, { outline: 0.06 });
        P(p.inner, 'torus', '#333', [0.24, 0.5, 0], [0.13, 0.13, 0.17], [Math.PI / 2, 0, 0.3]);
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; P(p.inner, 'cone', '#ddd', [0.24 + Math.cos(a) * 0.02, 0.5 + Math.sin(a) * 0.13, Math.cos(a) * 0.13], [0.025, 0.06, 0.025], [0, 0, a]); }
        p.brows.forEach(b => b.scale.set(0.03, 0.03, 0.1));
        break;
      }
      case 'chihuahua': {
        g = dogBase({ body: B, scale: 0.62, pointy: true, ear: '#d9a87a' });
        g.userData.parts.ears.forEach(e => e.scale.setScalar(1.7));
        g.userData.parts.eyes.scale.setScalar(1.3);
        break;
      }
      default: g = dogBase({ body: B });
    }
    G.shadow(g, d.big ? 0.7 : 0.4);
    g.userData.id = id;
    return g;
  };

  /* =========================================================== BOSS MODELS */
  G.makeBoss = function (id) {
    const b = D.BOSSES[id];
    let g;
    if (id === 'barkley') {
      g = dogBase({ body: b.body, belly: '#ffffff', muzzle: '#ffffff', spot: '#ffffff', scale: 2.6, earLen: 1.3 });
      const p = g.userData.parts;
      const barrel = new T.Group(); barrel.position.set(0.32, 0.38, 0); p.inner.add(barrel);
      P(barrel, 'cyl', '#a8743a', [0, 0, 0], [0.1, 0.16, 0.1], [Math.PI / 2, 0, 0], { outline: 0.06 });
      P(barrel, 'cyl', '#555', [0, 0, 0], [0.105, 0.03, 0.105], [Math.PI / 2, 0, 0]);
    } else if (id === 'countess') {
      g = dogBase({ body: b.body, legH: 0.38, bodyLen: 1.15, pointy: true, scale: 2.5, ear: '#6b6e88' });
      const p = g.userData.parts;
      const cape = P(p.inner, 'cone', '#6a2c91', [-0.05, 0.45, 0], [0.32, 0.5, 0.28], [0, 0, 0.3], { outline: 0.03 });
      P(p.inner, 'torus', '#d4a017', [0.22, 0.6, 0], [0.11, 0.11, 0.15], [Math.PI / 2, 0, 0.3]);
      P(p.head, 'cyl', '#d4a017', [-0.02, 0.17, 0], [0.12, 0.04, 0.12]);
      const moon = G.sprite('moon', 0.18); moon.position.set(-0.02, 0.28, 0); p.head.add(moon);
      p.cape = cape;
    } else if (id === 'salty') {
      g = new T.Group();
      const inner = new T.Group(); g.add(inner);
      inner.scale.setScalar(2.2);
      const boat = new T.Group(); inner.add(boat);
      P(boat, 'box', '#c0392b', [0, 0.18, 0], [0.9, 0.3, 0.55], null, { outline: 0.03 });
      P(boat, 'box', '#ffffff', [0, 0.35, 0], [0.92, 0.05, 0.57]);
      P(boat, 'cone', '#c0392b', [0.6, 0.18, 0], [0.28, 0.3, 0.28], [0, 0, -Math.PI / 2]);
      P(boat, 'cyl', '#333', [0.38, 0.48, 0.18], [0.07, 0.35, 0.07], [0, 0, -1.2]);
      P(boat, 'cyl', '#8a5a2b', [-0.3, 0.75, 0], [0.03, 0.9, 0.03]);
      const flag = new T.Mesh(geo('plane'), new T.MeshBasicMaterial({ map: G.tex.pawFlag, side: T.DoubleSide, color: '#333333' }));
      flag.scale.set(0.35, 0.25, 1); flag.position.set(-0.46, 1.05, 0); boat.add(flag);
      const dog = dogBase({ body: b.body, muzzle: '#ffffff' });
      dog.position.set(0.0, 0.25, 0); inner.add(dog);
      const h = dog.userData.parts.head;
      P(h, 'cone', '#222', [-0.02, 0.17, 0], [0.24, 0.12, 0.24]);
      P(h, 'box', '#222', [0.13, 0.06, 0.06], [0.03, 0.06, 0.07]);
      const parts = dog.userData.parts; parts.inner = inner;
      g.userData = { parts, kind: 'dog', phase: 0, blink: 2, hurt: 0, walk: 0, bite: 0, boat };
    } else if (id === 'frostfang') {
      g = dogBase({ body: b.body, belly: '#ffffff', muzzle: '#ffffff', pointy: true, ear: '#cfe6ff', scale: 2.7 });
      const p = g.userData.parts;
      for (let k = 0; k < 6; k++) P(p.inner, 'cone', '#9fe0ff', [-0.25 + k * 0.08, 0.62, (k % 2 ? 0.05 : -0.05)], [0.04, 0.16, 0.04], [0, 0, 0.2], { e: '#224466' });
      [[0, 0.55, 0.12], [0.12, 0.58, -0.1], [-0.15, 0.5, 0.1]].forEach(c => P(p.inner, 'sphere', '#ffffff', c, 0.13));
      p.eyes.children.forEach((c, k) => { if (k % 3 === 1) c.material = G.mat('#33aaff'); });
    } else {
      // mech
      g = new T.Group();
      const inner = new T.Group(); g.add(inner); inner.scale.setScalar(2.4);
      P(inner, 'box', '#7d8796', [0, 0.55, 0], [0.7, 0.45, 0.6], null, { outline: 0.03 });
      P(inner, 'box', '#ffcc00', [0, 0.55, 0.31], [0.5, 0.08, 0.02]);
      const legs = [];
      [[0.2, 0.2], [0.2, -0.2], [-0.2, 0.2], [-0.2, -0.2]].forEach(l => { const leg = new T.Group(); leg.position.set(l[0], 0.35, l[1]); inner.add(leg); P(leg, 'cyl', '#59616e', [0, -0.15, 0], [0.07, 0.3, 0.07]); P(leg, 'box', '#3d434d', [0.04, -0.31, 0], [0.18, 0.05, 0.12]); legs.push(leg); });
      [-1, 1].forEach(s => P(inner, 'cyl', '#59616e', [0.32, 0.6, s * 0.36], [0.07, 0.4, 0.07], [0, 0, Math.PI / 2]));
      const dome = P(inner, 'sphere', '#bfe8ff', [0.1, 0.92, 0], 0.26, null, { t: 0.45 });
      const pilot = dogBase({ body: '#9a5b2e', earLen: 1.3 }); pilot.scale.setScalar(0.6); pilot.position.set(0.0, 0.72, 0); inner.add(pilot);
      P(pilot.userData.parts.head, 'torus', '#ffffff', [0.02, 0.06, 0], [0.2, 0.2, 0.25], [Math.PI / 2, 0, 0]);
      const parts = pilot.userData.parts; parts.inner = inner; parts.legs = legs;
      g.userData = { parts, kind: 'dog', phase: 0, blink: 2, hurt: 0, walk: 0, bite: 0, dome };
    }
    G.shadow(g, 1.4);
    g.userData.id = id;
    return g;
  };

  /* =========================================================== SHOPKEEPERS */
  G.makeKeeper = function (shop) {
    let g;
    if (shop === 'cart') {
      g = duckBase({ body: '#ffffff', beak: '#e85d3a', scale: 1.5 });
      const p = g.userData.parts;
      P(p.head, 'sphere', '#e8473a', [0.12, 0.0, 0.08], [0.06, 0.06, 0.04]);
      P(p.head, 'dome', '#ff9f43', [0, 0.05, 0], [0.19, 0.12, 0.19], null, { outline: 0.06 });
      P(p.head, 'sphere', '#ff9f43', [-0.18, 0.05, 0], [0.06, 0.03, 0.05]);
      P(p.inner, 'box', '#8a5a2b', [-0.28, 0.42, 0], [0.18, 0.32, 0.36], null, { outline: 0.04 });
      P(p.inner, 'sphere', '#5b8def', [-0.36, 0.62, 0], [0.13, 0.08, 0.1]);
    } else if (shop === 'workshop') {
      g = duckBase({ body: '#9fb7c9', beak: '#ffb347', scale: 1.5 });
      const p = g.userData.parts;
      [-1, 1].forEach(s => { P(p.head, 'torus', '#5a3d2b', [0.1, 0.08, s * 0.08], 0.05, [0, Math.PI / 2, 0]); P(p.head, 'sphere', '#9ff0ff', [0.11, 0.08, s * 0.08], 0.042, null, { t: 0.7 }); });
      P(p.head, 'cyl', '#5a3d2b', [0, 0.08, 0], [0.19, 0.03, 0.19]);
      P(p.head, 'sphere', '#ffffff', [-0.1, 0.17, 0], [0.08, 0.06, 0.1]); // wild hair tuft
      const wrench = new T.Group(); wrench.position.set(0.25, 0.4, 0.25); p.inner.add(wrench);
      P(wrench, 'cyl', '#9aa3ad', [0, 0.15, 0], [0.025, 0.32, 0.025]);
      P(wrench, 'torus', '#9aa3ad', [0, 0.33, 0], 0.05);
      wrench.rotation.z = -0.5;
      P(p.inner, 'box', '#8a5a2b', [0.0, 0.18, 0], [0.5, 0.06, 0.52]);
    } else {
      g = duckBase({ body: '#c89cff', beak: '#ffcf5a', scale: 1.5 });
      const p = g.userData.parts;
      P(p.head, 'sphere', '#7b2fbf', [-0.01, 0.14, 0], [0.19, 0.13, 0.19], null, { outline: 0.06 });
      P(p.head, 'sphere', '#ffd34d', [0.13, 0.15, 0], 0.035, null, { e: '#664400' });
      P(p.inner, 'torus', '#ff9fd8', [0.12, 0.43, 0], [0.13, 0.13, 0.2], [Math.PI / 2, 0, 0]);
      const egg = P(p.inner, 'sphere', '#bfe8ff', [0.45, 0.45, 0.1], [0.11, 0.14, 0.11], null, { t: 0.6 });
      P(p.inner, 'cyl', '#5a3d2b', [0.45, 0.25, 0.1], [0.06, 0.2, 0.06]);
      const glow = G.sprite('glow', 0.5, { color: '#c8a0ff' }); glow.position.set(0.45, 0.45, 0.1); p.inner.add(glow);
      p.egg = egg;
    }
    G.shadow(g, 0.6);
    return g;
  };

  /* =========================================================== ANIMATION */
  G.animDuck = function (m, dt, st) {
    const u = m.userData, p = u.parts;
    u.phase += dt;
    st = st || {};
    const t = u.phase;
    // blink
    u.blink -= dt;
    let eyeY = 1;
    if (u.blink < 0) { eyeY = 0.1; if (u.blink < -0.12) u.blink = 2 + Math.random() * 3.5; }
    if (p.eyes && !st.sleep) { p.eyes.scale.y = st.frozen ? 0.4 : eyeY; if (p.eyes2) p.eyes2.scale.y = eyeY; }
    // puff (attack) & hurt squash
    u.puff = Math.max(0, u.puff - dt * 4);
    u.hurt = Math.max(0, u.hurt - dt * 5);
    u.quack = Math.max(0, u.quack - dt * 4);
    const wob = st.frozen || st.stun ? 0 : Math.sin(t * 2.2) * 0.05;
    const s = 1 + u.puff * 0.18;
    const sc = (u.sc || 1) * (u.grow || 1);
    p.inner.scale.set(s * (1 + u.hurt * 0.15) * sc, s * (1 - u.hurt * 0.15) * sc, s * sc);
    p.inner.rotation.z = wob;
    if (!u.flat) p.inner.position.y = Math.abs(Math.sin(t * 2.2)) * 0.02 + (st.celebrate ? Math.abs(Math.sin(t * 9)) * 0.35 : 0);
    if (st.celebrate) p.inner.rotation.y += dt * 8;
    if (p.beakLow) p.beakLow.position.y = -0.065 - u.quack * 0.05;
    if (p.wingL && !st.frozen) { const f = st.celebrate ? Math.sin(t * 20) * 0.6 : Math.sin(t * 2.2) * 0.08; p.wingL.rotation.x = f; p.wingR.rotation.x = -f; }
    if (p.head && !st.frozen) p.head.rotation.z = Math.sin(t * 1.3) * 0.06 + u.puff * 0.2;
    if (p.cloud) { p.cloud.position.y = 1.0 + Math.sin(t * 2) * 0.05; p.cloud.rotation.y += dt * 0.6; }
    if (p.spark) p.spark.material.rotation += dt * 9;
    if (p.glow) p.glow.material.opacity = 0.7 + Math.sin(t * 5) * 0.2;
    if (p.steam) { p.steam.position.y = 0.48 + (t * 0.3 % 0.2); p.steam.material.opacity = 0.6 - (t * 0.3 % 0.2) * 3; }
    if (p.bub) { p.bub.position.y = 0.85 + (t * 0.4 % 0.4); p.bub.material.opacity = 1 - (t * 0.4 % 0.4) * 2.5; }
    if (p.stick) p.stick.rotation.z = -0.6 + Math.max(0, Math.sin(t * 6)) * 0.5 * (u.puff > 0 ? 2 : 0.4);
    if (p.arm) p.arm.rotation.z = 0.5 - u.puff * 2.2;
    if (p.magnet) p.magnet.rotation.y = Math.sin(t) * 0.3;
    if (p.top) p.top.rotation.z = st.armed ? 0.08 + Math.sin(t * 3) * 0.04 : 0.6;
    if (p.light) p.light.visible = st.armed ? (Math.sin(t * 8) > 0) : false;
  };

  G.animDog = function (m, dt, st) {
    const u = m.userData, p = u.parts;
    st = st || {};
    u.phase += dt;
    u.hurt = Math.max(0, u.hurt - dt * 5);
    const speedK = st.frozen ? 0 : (st.slow ? 0.5 : 1);
    if (st.walking) u.walk += dt * 9 * speedK * (st.fast ? 1.8 : 1);
    const w = u.walk;
    const moving = st.walking && !st.frozen && !st.stun;
    p.legs.forEach((l, k) => { l.rotation.z = moving ? Math.sin(w + (k % 2 === (k < 2 ? 0 : 1) ? 0 : Math.PI)) * 0.6 : 0; });
    p.inner.position.y = (moving ? Math.abs(Math.sin(w)) * 0.06 : 0) + (st.lift || 0);
    if (p.tail) p.tail.rotation.x = Math.sin(u.phase * (st.flee ? 30 : 10)) * 0.5;
    p.ears && p.ears.forEach((e, k) => { e.rotation.z = Math.sin(w * 0.5 + k) * 0.15 + (st.flee ? 0.8 : 0); });
    // bite lunge
    if (st.biting && !st.frozen && !st.stun) {
      const b = Math.max(0, Math.sin(u.phase * 8));
      p.head.rotation.z = -b * 0.35; p.head.position.x = p.head.userData.x0 + b * 0.06;
      p.mouth.visible = b > 0.3;
    } else { p.head.rotation.z = st.flee ? 0.3 : 0; p.head.position.x = p.head.userData.x0; p.mouth.visible = !!st.flee || !!st.bark; }
    // blink
    u.blink -= dt;
    let ey = 1; if (u.blink < 0) { ey = 0.1; if (u.blink < -0.12) u.blink = 2 + Math.random() * 3; }
    p.eyes.scale.y = st.stun ? 0.2 : ey * (p.eyes.userData.s0 || 1);
    // angry brows when biting
    p.brows.forEach((b, k) => { b.rotation.x = (k ? -1 : 1) * (st.biting ? 0.6 : st.flee ? -0.5 : 0.25); });
    const sq = u.hurt * 0.2;
    p.inner.scale.set(u.s0 * (1 + sq), u.s0 * (1 - sq), u.s0 * (1 + sq * 0.5));
  };
  // remember rest positions so animation can offset them
  G.prepDog = function (m) {
    const p = m.userData.parts;
    p.head.userData.x0 = p.head.position.x;
    p.eyes.userData.s0 = p.eyes.scale.y;
    m.userData.s0 = p.inner.scale.x;
  };

  /* =========================================================== ENVIRONMENTS */
  // Lane z position (lane 0 = far/top, 4 = near/bottom)
  G.laneZ = r => (r - 2) * 1.0;

  function tree(parent, x, z, t, s) {
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s || 1); parent.add(g);
    if (t.snow) {
      P(g, 'cyl', '#7a5230', [0, 0.3, 0], [0.08, 0.6, 0.08]);
      [0.7, 1.05, 1.35].forEach((y, k) => { P(g, 'cone', '#2f7a4a', [0, y, 0], [0.5 - k * 0.12, 0.6, 0.5 - k * 0.12], null, { outline: 0.04 }); P(g, 'cone', '#ffffff', [0, y + 0.18, 0], [0.32 - k * 0.08, 0.25, 0.32 - k * 0.08]); });
    } else if (t.night) {
      P(g, 'cyl', '#4a3a30', [0, 0.6, 0], [0.1, 1.2, 0.1]);
      P(g, 'cyl', '#4a3a30', [0.25, 1.1, 0], [0.04, 0.6, 0.04], [0, 0, -0.8]);
      P(g, 'cyl', '#4a3a30', [-0.2, 0.95, 0], [0.04, 0.5, 0.04], [0, 0, 0.9]);
      P(g, 'sphere', '#3a5a4a', [0, 1.35, 0], [0.45, 0.32, 0.45], null, { outline: 0.04 });
    } else {
      P(g, 'cyl', '#8a5a2b', [0, 0.35, 0], [0.09, 0.7, 0.09]);
      const c = t.fortress ? '#7a9a4a' : '#5cbf4a';
      P(g, 'sphere', c, [0, 0.95, 0], [0.5, 0.45, 0.5], null, { outline: 0.04 });
      P(g, 'sphere', shade(c, 1.15), [0.18, 1.12, 0.15], [0.28, 0.25, 0.28]);
    }
    return g;
  }
  function cutout(parent, tex, x, y, z, w, h, opt) {
    const m = new T.Mesh(geo('plane'), new T.MeshBasicMaterial({ map: G.tex[tex], transparent: true, alphaTest: 0.1, side: T.DoubleSide, color: (opt && opt.color) || 0xffffff }));
    m.scale.set(w, h, 1); m.position.set(x, y, z);
    if (opt && opt.ry != null) m.rotation.y = opt.ry;
    parent.add(m);
    return m;
  }
  G.cutout = cutout;

  function skyDome(t) {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, t.skyTop); gr.addColorStop(1, t.skyBot);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const tex = new T.CanvasTexture(c);
    return tex;
  }

  function applyTheme(t) {
    G.scene.background = skyDome(t);
    G.scene.fog = new T.Fog(t.fog, 24, 70);
    G.hemi.color.set(t.night ? '#9aa8ff' : '#ffffff');
    G.hemi.groundColor.set(t.night ? '#334455' : '#88aa66');
    G.hemi.intensity = t.amb * 0.62;
    G.sun.intensity = t.sun * 0.6;
    G.sun.color.set(t.night ? '#c8d0ff' : '#fff6e0');
  }
  G.applyTheme = applyTheme; G.tree = tree; G.skyDome = skyDome;

  function pondAndScenery(root, t, world) {
    // big ground
    const ground = P(root, 'box', t.ground, [4, -0.12, 0], [40, 0.2, 26]);
    // pond on the left
    const pond = P(root, 'cyl', t.pond, [-2.6, -0.01, 0], [2.2, 0.08, 4.0], null, { e: shade(t.pond, 0.12) });
    P(root, 'cyl', t.dirt, [-2.6, -0.04, 0], [2.4, 0.06, 4.2]);
    for (let k = 0; k < 10; k++) {
      const z = -3.6 + k * 0.8;
      P(root, 'cyl', '#4f9a3a', [-0.75 + (k % 2) * 0.12, 0.25, z], [0.03, 0.5, 0.03]);
      P(root, 'sphere', '#7a4a2a', [-0.75 + (k % 2) * 0.12, 0.48, z], [0.04, 0.09, 0.04]);
    }
    [[-2.2, -1.5], [-3.2, 0.8], [-1.8, 2.4], [-3.0, -3]].forEach(p => {
      P(root, 'cyl', '#5cbf4a', [p[0], 0.05, p[1]], [0.3, 0.02, 0.3]);
      P(root, 'sphere', '#ff9ccc', [p[0] + 0.05, 0.1, p[1]], 0.07);
    });
    // duck house on the pond
    const house = new T.Group(); house.position.set(-3.1, 0, -1.8); root.add(house);
    P(house, 'box', '#ffefc2', [0, 0.35, 0], [0.7, 0.5, 0.6], null, { outline: 0.03 });
    P(house, 'cone', '#e85d3a', [0, 0.82, 0], [0.62, 0.45, 0.62], [0, Math.PI / 4, 0], { outline: 0.03 });
    P(house, 'cyl', '#3a2a20', [0.36, 0.32, 0], [0.13, 0.02, 0.13], [0, 0, Math.PI / 2]);
    // back scenery
    const backZ = -4.3;
    if (t.night) {
      const moon = G.sprite('moon', 3); moon.position.set(9, 6, -12); root.add(moon);
      for (let k = 0; k < (G.high() ? 18 : 8); k++) {
        const f = G.sprite('firefly', 0.25); f.position.set(-2 + Math.random() * 13, 0.5 + Math.random() * 1.5, -4 + Math.random() * 8); root.add(f);
        f.userData.fly = Math.random() * 10; root.userData.flies = root.userData.flies || []; root.userData.flies.push(f);
      }
      for (let k = 0; k < 14; k++) cutout(root, 'cattail', -1 + k * 0.85, 0.45, backZ + 0.3 + (k % 2) * 0.2, 0.6, 0.9);
    } else if (t.snow) {
      const sun = G.sprite('sunTex', 2.4); sun.position.set(-5, 7, -12); root.add(sun);
      for (let k = 0; k < 5; k++) {
        const sm = new T.Group(); sm.position.set(-1 + k * 2.6, 0, backZ - 0.3); root.add(sm);
        P(sm, 'sphere', '#ffffff', [0, 0.3, 0], 0.3, null, { outline: 0.04 }); P(sm, 'sphere', '#ffffff', [0, 0.72, 0], 0.2, null, { outline: 0.05 });
        P(sm, 'cone', '#ff8c1a', [0.18, 0.72, 0.1], [0.04, 0.16, 0.04], [0, 0, -Math.PI / 2]);
        P(sm, 'sphere', '#222', [0.14, 0.78, 0.1], 0.025);
        if (k % 2) P(sm, 'cyl', '#d23a3a', [0, 0.92, 0], [0.12, 0.12, 0.12]);
      }
    } else {
      const sun = G.sprite('sunTex', 2.4); sun.position.set(-5, 7.5, -12); root.add(sun);
      for (let k = 0; k < 14; k++) cutout(root, k % 2 ? 'cutFlower' : 'cutFlower2', -1 + k * 0.85, 0.3, backZ + 0.4 + (k % 3) * 0.15, 0.45, 0.45);
    }
    // trees / props around
    const ts = [[-4.5, -5.5, 1.3], [1, -6, 1.1], [5, -6.5, 1.4], [9, -6, 1.2], [12.5, -4, 1.3], [13, 2, 1.2], [-5, 4, 1.1], [12, 5.5, 1]];
    ts.forEach(p => tree(root, p[0], p[1], t, p[2]));
    // paper clouds
    const clouds = [];
    for (let k = 0; k < 5; k++) {
      const c = cutout(root, 'cutCloud', -6 + k * 5.5, 5 + (k % 2) * 1.2, -11 - (k % 3), 3.2, 1.75, { color: t.night ? '#8890c8' : '#ffffff' });
      c.userData.drift = 0.15 + k * 0.03; clouds.push(c);
    }
    root.userData.clouds = clouds;
    // dog side: themed entrance on the right
    if (t.fortress) {
      for (let k = -3; k <= 3; k++) {
        if (k === 0) continue;
        P(root, 'box', '#9a8a7a', [11.3, 0.7, k * 1.05], [0.6, 1.4, 0.95], null, { outline: 0.02 });
        P(root, 'box', '#8a7a6a', [11.3, 1.5, k * 1.05], [0.3, 0.2, 0.3]);
      }
      [-4.2, 4.2].forEach(z => {
        P(root, 'cyl', '#8a7a6a', [11.4, 1.3, z], [0.6, 2.6, 0.6], null, { outline: 0.03 });
        P(root, 'cone', '#c0392b', [11.4, 2.95, z], [0.75, 0.8, 0.75]);
        const flag = new T.Mesh(geo('plane'), new T.MeshBasicMaterial({ map: G.tex.pawFlag, side: T.DoubleSide }));
        flag.scale.set(0.6, 0.42, 1); flag.position.set(11.7, 3.7, z); root.add(flag);
        P(root, 'cyl', '#5a3d2b', [11.4, 3.6, z], [0.02, 0.6, 0.02]);
      });
    } else if (t.planks) {
      for (let k = 0; k < 6; k++) P(root, 'cyl', '#8a6239', [-0.4 + k * 2.2, 0.4, -3.2], [0.1, 0.9, 0.1]);
      P(root, 'box', '#8a6239', [4.5, 0.75, -3.2], [11, 0.06, 0.06]);
      const lamp = new T.Group(); lamp.position.set(12, 0, -3.5); root.add(lamp);
      P(lamp, 'cyl', '#333', [0, 1, 0], [0.05, 2, 0.05]); P(lamp, 'sphere', '#fff3b0', [0, 2.05, 0], 0.15, null, { basic: true });
      // ferris wheel cutout far back
      const fw = new T.Group(); fw.position.set(7, 3.5, -14); root.add(fw);
      P(fw, 'torus', '#ff7a8a', [0, 0, 0], 2.4, null, {});
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; P(fw, 'box', '#ffe14d', [Math.cos(a) * 2.4, Math.sin(a) * 2.4, 0], [0.4, 0.35, 0.3]); }
      root.userData.ferris = fw;
    } else {
      // hedge & doghouse
      for (let k = -2; k <= 2; k++) P(root, 'sphere', t.snow ? '#e8f4ff' : t.night ? '#3a5a4a' : '#4fae45', [11.2, 0.3, k * 1.6 + 0.8], [0.4, 0.38, 0.55], null, { outline: 0.03 });
      const dh = new T.Group(); dh.position.set(12.4, 0, -2.6); root.add(dh);
      P(dh, 'box', '#d9534f', [0, 0.45, 0], [0.9, 0.8, 0.9], null, { outline: 0.03 });
      P(dh, 'cone', '#8a5a2b', [0, 1.1, 0], [0.8, 0.55, 0.8], [0, Math.PI / 4, 0]);
      P(dh, 'box', '#2b1e1a', [-0.46, 0.35, 0], [0.02, 0.45, 0.35]);
    }
    if (world === 1) {
      // picnic blanket & basket
      const pb = P(root, 'box', '#ff6b6b', [12.6, 0.02, 3.2], [1.5, 0.03, 1.2]);
      P(root, 'box', '#ffffff', [12.6, 0.035, 3.2], [1.5, 0.03, 0.25]);
      P(root, 'box', '#c08040', [12.4, 0.2, 3.1], [0.4, 0.3, 0.3], null, { outline: 0.04 });
    }
    return ground;
  }

  /* Battlefield: tiles, water, ice, fog, protected tiles. */
  G.buildBattlefield = function (world, level) {
    const W = D.WORLDS[world - 1] || D.WORLDS[0];
    const t = W.t;
    applyTheme(t);
    const root = new T.Group();
    const env = level.env || {};
    pondAndScenery(root, t, world);
    const tiles = [];
    const waterMat = G.mat(t.night ? '#2f6f9a' : '#3fa8e0', { e: t.night ? '#0a2233' : '#0b3a55' });
    const iceMat = new (G.high() ? T.MeshToonMaterial : T.MeshLambertMaterial)({ color: 0xffffff, map: G.tex.iceTile, gradientMap: G.high() ? toonGradient() : undefined });
    const plankMat = t.planks ? new (G.high() ? T.MeshToonMaterial : T.MeshLambertMaterial)({ color: 0xffffff, map: G.tex.planks, gradientMap: G.high() ? toonGradient() : undefined }) : null;
    const currents = [];
    for (let c = 0; c < D.COLS; c++) {
      tiles[c] = [];
      for (let r = 0; r < D.LANES; r++) {
        const active = level.lanes.indexOf(r) >= 0;
        const water = (env.water || []).indexOf(r) >= 0;
        const ice = (env.ice || []).indexOf(r) >= 0;
        let m;
        if (!active) {
          m = new T.Mesh(geo('tile'), G.mat(shade(t.dirt, 0.9)));
          m.position.set(c, -0.02, G.laneZ(r));
        } else if (water) {
          m = new T.Mesh(geo('tile'), waterMat);
          m.position.set(c, -0.06, G.laneZ(r));
          m.scale.set(1.04, 1, 1.0);
        } else if (ice) {
          m = new T.Mesh(geo('tile'), iceMat);
          m.position.set(c, 0, G.laneZ(r));
        } else if (plankMat) {
          m = new T.Mesh(geo('tile'), plankMat);
          m.position.set(c, 0, G.laneZ(r));
        } else {
          m = new T.Mesh(geo('tile'), G.mat((c + r) % 2 ? t.grassA : t.grassB));
          m.position.set(c, 0, G.laneZ(r));
        }
        root.add(m);
        tiles[c][r] = m;
      }
    }
    // water trough edges + current arrows
    (env.water || []).forEach(r => {
      if (level.lanes.indexOf(r) < 0) return;
      [-0.5, 0.5].forEach(dz => P(root, 'box', t.planks ? '#8a6239' : '#7a6a5a', [4, 0.06, G.laneZ(r) + dz], [9.4, 0.08, 0.06]));
      if ((env.current || []).indexOf(r) >= 0) {
        for (let k = 0; k < 6; k++) {
          const a = G.tileQuad('arrow', 0xffffff, 0.8); a.scale.set(0.5, 0.5, 1); a.position.set(k * 1.6, 0.03, G.laneZ(r)); root.add(a);
          currents.push(a);
        }
      }
    });
    // edge of field on right: dirt path where dogs enter
    P(root, 'box', t.dirt, [9.9, -0.05, 0], [1.6, 0.12, 5.2]);
    // pond entrance stones
    for (let r = 0; r < 5; r++) P(root, 'sphere', '#b8b0a0', [-0.62, 0.04, G.laneZ(r) + 0.35], [0.12, 0.06, 0.1]);
    // fog puffs
    const fog = [];
    (env.fog || []).forEach(c => {
      for (let r = 0; r < D.LANES; r++) {
        const n = G.high() ? 3 : 2;
        for (let k = 0; k < n; k++) {
          const s = G.sprite('cloudPuff', 1.5 + Math.random() * 0.4, { color: t.night ? '#c8c8f0' : '#f0f0ff', opacity: 0.92 });
          s.position.set(c + (Math.random() - 0.5) * 0.6, 0.55 + Math.random() * 0.25, G.laneZ(r) + (Math.random() - 0.5) * 0.6);
          s.userData = { c, r, base: s.position.clone(), ph: Math.random() * 10, clear: 0 };
          s.renderOrder = 5;
          root.add(s); fog.push(s);
        }
      }
    });
    // protected tiles
    const protTiles = [];
    if (level.protect && level.protect.tiles) {
      level.protect.tiles.forEach(([c, r]) => {
        const g = new T.Group(); g.position.set(c, 0.07, G.laneZ(r)); root.add(g);
        if (t.planks) {
          P(g, 'cyl', '#f2d29a', [0, 0.12, 0], [0.32, 0.22, 0.32], null, { outline: 0.04 });
          P(g, 'cyl', '#f2d29a', [0, 0.32, 0], [0.18, 0.2, 0.18]);
          P(g, 'cone', '#ff5a4a', [0, 0.55, 0], [0.06, 0.12, 0.06]);
        } else {
          P(g, 'cyl', '#7a5230', [0, 0.05, 0], [0.42, 0.08, 0.42]);
          for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; P(g, 'cyl', '#3f8f3a', [Math.cos(a) * 0.2, 0.14, Math.sin(a) * 0.2], [0.015, 0.2, 0.015]); P(g, 'sphere', t.snow ? '#ff4f6a' : '#ff7ab8', [Math.cos(a) * 0.2, 0.26, Math.sin(a) * 0.2], 0.07, null, { outline: 0.1 }); }
        }
        const hl = G.tileQuad('highlight', 0xffd84a, 0.8); hl.position.set(0, 0.0, 0); g.add(hl);
        protTiles.push(g);
      });
    }
    root.userData.tiles = tiles; root.userData.fog = fog; root.userData.currents = currents;
    return root;
  };

  G.updateEnv = function (root, dt, time) {
    const u = root.userData;
    if (u.clouds) u.clouds.forEach(c => { c.position.x += c.userData.drift * dt; if (c.position.x > 20) c.position.x = -10; });
    if (u.flies) u.flies.forEach(f => { f.userData.fly += dt; f.position.y += Math.sin(f.userData.fly * 2) * 0.004; f.position.x += Math.cos(f.userData.fly * 0.7) * 0.004; f.material.opacity = 0.5 + Math.sin(f.userData.fly * 4) * 0.5; });
    if (u.currents) u.currents.forEach(a => { a.position.x -= dt * 0.8; if (a.position.x < -0.4) a.position.x += 9.6; });
    if (u.ferris) u.ferris.rotation.z += dt * 0.15;
    if (u.fog) u.fog.forEach(s => {
      const d = s.userData; d.ph += dt;
      s.position.x = d.base.x + Math.sin(d.ph * 0.5) * 0.15;
      const target = d.clear > 0 ? 0.0 : 0.92;
      s.material.opacity += (target - s.material.opacity) * Math.min(1, dt * 3);
      d.clear = Math.max(0, d.clear - dt);
    });
  };

  /* =========================================================== MENU STAGES */
  G.clearStage = function () {
    G.camera.clearViewOffset();
    G.fxClear();
    G.beams.forEach(b => G.fxRoot.remove(b.m)); G.beams = [];
    while (G.stageRoot.children.length) G.stageRoot.remove(G.stageRoot.children[0]);
    G.stage = null;
  };

  // A floating toy island diorama used behind menus.
  G.diorama = function (worldIdx, opts) {
    G.clearStage();
    opts = opts || {};
    const W = D.WORLDS[(worldIdx || 1) - 1];
    const t = W.t;
    applyTheme(t);
    const root = new T.Group(); G.stageRoot.add(root);
    const isle = P(root, 'cyl', t.grassA, [0, -0.2, 0], [6.5, 0.4, 4.2], null, { outline: 0.02 });
    P(root, 'cyl', t.dirt, [0, -0.75, 0], [6.3, 0.8, 4.0]);
    P(root, 'cone', shade(t.dirt, 0.8), [0, -1.9, 0], [5.6, 1.6, 3.6], [Math.PI, 0, 0]);
    P(root, 'cyl', t.pond, [-3.1, 0.01, 0.6], [1.6, 0.04, 1.4], null, { e: shade(t.pond, 0.12) });
    [[-5, -1.8, 1], [4.6, -2.2, 1.1], [-1.6, -3, 0.9], [2.2, -3.1, 0.8]].forEach(p => tree(root, p[0], p[1], t, p[2]));
    const clouds = [];
    for (let k = 0; k < 4; k++) { const c = cutout(root, 'cutCloud', -9 + k * 6, 4.5 + (k % 2), -8, 3.2, 1.75, { color: t.night ? '#8890c8' : '#ffffff' }); c.userData.drift = 0.2 + k * 0.05; clouds.push(c); }
    root.userData.clouds = clouds;
    if (t.night) { const moon = G.sprite('moon', 2.5); moon.position.set(6, 5, -9); root.add(moon); }
    else { const sun = G.sprite('sunTex', 2); sun.position.set(-6, 5.5, -9); root.add(sun); }
    const actors = [];
    (opts.ducks || ['puddle', 'bread', 'frost']).forEach((id, k) => {
      const m = G.makeDuck(id); m.position.set(-4.4 + k * 0.95, 0, 0.9 + (k % 2) * 0.7); m.rotation.y = -0.5; m.scale.setScalar(1.25); root.add(m); actors.push({ m, duck: true });
    });
    (opts.dogs || ['mutt', 'pogo']).forEach((id, k) => {
      const m = G.makeDog(id); G.prepDog(m); m.position.set(2.7 + k * 1.0, 0, 0.7 + (k % 2) * 0.7); m.rotation.y = Math.PI + 0.5; m.scale.setScalar(1.25); root.add(m); actors.push({ m, duck: false });
    });
    G.stage = {
      name: 'diorama', root, actors, t: 0,
      fit() {
        const a = G.camera.aspect;
        const dist = a < 1 ? 15 / a * 0.75 : 13;
        G.camera.fov = 34; G.camera.position.set(0, dist * 0.42, dist); G.camera.lookAt(0, opts.lookY || 0.6, 0); G.camera.updateProjectionMatrix();
      },
      update(dt) {
        this.t += dt;
        root.rotation.y = Math.sin(this.t * 0.15) * 0.12;
        actors.forEach(a => a.duck ? G.animDuck(a.m, dt, {}) : G.animDog(a.m, dt, { walking: false, bark: Math.sin(this.t * 2 + a.m.position.x) > 0.9 }));
        G.updateEnv(root, dt, this.t);
      }
    };
    G.stage.fit();
  };

  G.shopStage = function (shop) {
    G.clearStage();
    applyTheme(D.WORLDS[0].t);
    const colors = { cart: ['#ffcf8a', '#ff9f43'], workshop: ['#b9d7f0', '#4f7fbf'], emporium: ['#e8c8ff', '#7b2fbf'] }[shop];
    G.scene.background = skyDome({ skyTop: colors[1], skyBot: colors[0] });
    G.scene.fog = null;
    const root = new T.Group(); G.stageRoot.add(root);
    P(root, 'cyl', shade(colors[0], 0.85), [0, -0.1, 0], [5, 0.2, 3]);
    if (shop === 'cart') {
      const cart = new T.Group(); cart.position.set(1.6, 0, -0.8); root.add(cart);
      P(cart, 'box', '#b5651d', [0, 0.6, 0], [2.2, 0.7, 1.1], null, { outline: 0.02 });
      [-1, 1].forEach(s => { P(cart, 'cyl', '#5a3d2b', [s * 0.7, 0.3, 0.6], [0.32, 0.06, 0.32], [Math.PI / 2, 0, 0], { outline: 0.05 }); });
      for (let k = 0; k < 6; k++) P(cart, 'box', k % 2 ? '#ffffff' : '#ff5a4a', [-0.92 + k * 0.37, 1.75, 0], [0.37, 0.08, 1.3]);
      [-1, 1].forEach(s => P(cart, 'cyl', '#5a3d2b', [s * 1.0, 1.25, 0.5], [0.04, 1.1, 0.04]));
      ['lob', 'gusty', 'puddle'].forEach((id, k) => { const d = G.makeDuck(id, { hat: 'none', noShadow: true }); d.position.set(-0.6 + k * 0.6, 0.95, 0.2); d.scale.setScalar(0.7); d.rotation.y = -0.4; cart.add(d); });
    } else if (shop === 'workshop') {
      const bench = new T.Group(); bench.position.set(1.6, 0, -0.9); root.add(bench);
      P(bench, 'box', '#8a5a2b', [0, 0.8, 0], [2.4, 0.12, 1], null, { outline: 0.02 });
      [-1, 1].forEach(s => P(bench, 'box', '#5a3d2b', [s * 1.05, 0.4, 0], [0.12, 0.8, 0.8]));
      const gears = [];
      [[-0.6, 1.5, 0.28], [0.15, 1.85, 0.36], [0.85, 1.45, 0.22]].forEach(gp => { const gg = P(bench, 'torus', '#9aa3ad', [gp[0], gp[1], -0.4], gp[2], null, { outline: 0.05 }); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; P(gg, 'box', '#9aa3ad', [Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0], [0.35, 0.35, 0.5], [0, 0, a]); } gears.push(gg); });
      root.userData.gears = gears;
      P(bench, 'cyl', '#ff5a4a', [0.6, 1.0, 0.1], [0.15, 0.3, 0.15]);
      P(bench, 'sphere', '#ffe14d', [-0.4, 0.95, 0.1], 0.13, null, { e: '#553300' });
    } else {
      const tent = new T.Group(); tent.position.set(1.4, 0, -1.2); root.add(tent);
      P(tent, 'cone', '#7b2fbf', [0, 1.6, 0], [2.0, 2.4, 1.6], null, { outline: 0.02 });
      P(tent, 'box', '#3a1a5a', [0, 0.7, 0.9], [1.0, 1.4, 0.05]);
      const eggs = [];
      for (let k = 0; k < 5; k++) { const e = P(root, 'sphere', ['#ffd84a', '#8fe3ff', '#ff9fd8', '#9be07a', '#ffffff'][k], [-0.4 + k * 0.55, 0.25, 1.1], [0.16, 0.21, 0.16], null, { outline: 0.06 }); eggs.push(e); }
      root.userData.eggs = eggs;
      for (let k = 0; k < 10; k++) { const s = G.sprite('sparkle', 0.2 + Math.random() * 0.2, { color: '#ffe8ff' }); s.position.set(-3 + Math.random() * 6, 1 + Math.random() * 3, -2 + Math.random()); root.add(s); }
    }
    const keeper = G.makeKeeper(shop);
    keeper.position.set(-1.0, 0, 0.4); keeper.rotation.y = -0.35;
    root.add(keeper);
    G.stage = {
      name: 'shop', root, keeper, t: 0, talk: 0,
      fit() {
        const a = G.camera.aspect;
        const wide = a > 1.2;
        G.camera.fov = 34;
        const dist = a < 1 ? 11 / a * 0.7 : 8.4;
        G.camera.position.set(wide ? 2.4 : 0.3, 2.3, dist); G.camera.lookAt(wide ? 2.4 : 0.3, 1.1, 0); G.camera.updateProjectionMatrix();
      },
      update(dt) {
        this.t += dt;
        G.animDuck(keeper, dt, {});
        if (this.talk > 0) { this.talk -= dt; keeper.userData.quack = Math.abs(Math.sin(this.t * 14)); }
        keeper.rotation.y = -0.35 + Math.sin(this.t * 0.8) * 0.1;
        if (root.userData.gears) root.userData.gears.forEach((g, k) => g.rotation.z += dt * (k % 2 ? -1 : 1));
        if (root.userData.eggs) root.userData.eggs.forEach((e, k) => { e.rotation.z = Math.sin(this.t * 3 + k) * 0.15; });
        if (keeper.userData.parts.egg && Math.random() < dt * 2) G.fx('sparkle', keeper.position.x + 0.65, 0.7, 0.55, { color: 0xe0c0ff });
      }
    };
    G.stage.fit();
  };

  G.revealStage = function (duckId) {
    G.clearStage();
    applyTheme(D.WORLDS[0].t);
    G.scene.background = skyDome({ skyTop: '#ffb84d', skyBot: '#fff2c4' });
    G.scene.fog = null;
    const root = new T.Group(); G.stageRoot.add(root);
    P(root, 'cyl', '#ffffff', [0, 0.1, 0], [1.3, 0.25, 1.3], null, { outline: 0.03 });
    P(root, 'cyl', '#ffd84a', [0, 0.25, 0], [1.1, 0.06, 1.1]);
    const rays = [];
    for (let k = 0; k < 12; k++) {
      const r = new T.Mesh(geo('plane'), new T.MeshBasicMaterial({ color: k % 2 ? '#fff6c8' : '#ffe08a', transparent: true, opacity: 0.6, side: T.DoubleSide, depthWrite: false }));
      r.scale.set(0.9, 12, 1); r.position.set(0, 0, -4); r.rotation.z = k / 12 * TAU; root.add(r); rays.push(r);
    }
    const duck = G.makeDuck(duckId); duck.position.set(0, 0.3, 0); duck.scale.setScalar(1.9); root.add(duck);
    G.stage = {
      name: 'reveal', root, duck, t: 0,
      fit() {
        const a = G.camera.aspect;
        G.camera.fov = 34;
        const dist = a < 1 ? 10 / a * 0.6 : 7;
        G.camera.position.set(a > 1.2 ? 2.2 : 0, 2.0, dist); G.camera.lookAt(a > 1.2 ? 2.2 : 0, 1.0, 0); G.camera.updateProjectionMatrix();
      },
      update(dt) {
        this.t += dt;
        duck.rotation.y = -0.5 + Math.sin(this.t * 0.9) * 0.6;
        G.animDuck(duck, dt, { celebrate: this.t < 1.2 });
        if (this.t > 1.2) duck.userData.parts.inner.rotation.y *= 0.9;
        rays.forEach((r, k) => { r.rotation.z += dt * 0.2; });
        if (Math.random() < dt * 6) G.fx('confetti', (Math.random() - 0.5) * 4, 3.5, 0, { vy: 0 });
        if (Math.random() < dt * 3) G.fx('sparkle', (Math.random() - 0.5) * 2.5, 0.8 + Math.random() * 2, 0.5);
      }
    };
    G.stage.fit();
  };

  /* =========================================================== PORTRAITS */
  // Renders each model once to an image for cards, guides and the map.
  G.portraits = {};
  G.makePortraits = function () {
    const size = 160;
    let r;
    try {
      r = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    } catch (e) { return; }
    r.setSize(size, size);
    r.setPixelRatio(1);
    const sc = new T.Scene();
    sc.add(new T.HemisphereLight(0xffffff, 0x99aa88, 0.55));
    const dl = new T.DirectionalLight(0xffffff, 0.62); dl.position.set(-2, 4, 5); sc.add(dl);
    const cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
    const box = new T.Box3(), ctr = new T.Vector3(), sz = new T.Vector3();
    const shoot = (key, m, yaw, zoom) => {
      m.rotation.y = yaw;
      m.traverse(o => { if (o.isMesh && o.material && o.material.map === G.tex.shadow) o.visible = false; });
      sc.add(m);
      box.setFromObject(m); box.getCenter(ctr); box.getSize(sz);
      const rad = Math.max(sz.x, sz.y, sz.z) * 0.62 * (zoom || 1);
      cam.position.set(ctr.x + rad * 0.15, ctr.y + rad * 0.35, ctr.z + rad * 3.6);
      cam.lookAt(ctr);
      r.render(sc, cam);
      G.portraits[key] = r.domElement.toDataURL();
      sc.remove(m);
    };
    D.DUCK_ORDER.forEach(id => { const m = G.makeDuck(id, { hat: 'none', noShadow: true }); G.animDuck(m, 0.01, {}); shoot('duck:' + id, m, -0.55); });
    D.DOG_ORDER.forEach(id => { const m = G.makeDog(id); G.prepDog(m); shoot('dog:' + id, m, Math.PI + 0.55); });
    Object.keys(D.BOSSES).forEach(id => { const m = G.makeBoss(id); G.prepDog(m); shoot('boss:' + id, m, Math.PI + 0.5); });
    D.SHOP_ORDER.forEach(id => { const m = G.makeKeeper(id); shoot('keeper:' + id, m, -0.4, 0.85); });
    { const m = G.makeCoach(); shoot('coach', m, -0.45, 0.9); }
    { const m = G.makeGoose(false); shoot('goose', m, -0.5); }
    r.dispose();
    if (r.forceContextLoss) r.forceContextLoss();
  };
  G.portrait = function (key) { return G.portraits[key] || ''; };
})(window.DVD);
