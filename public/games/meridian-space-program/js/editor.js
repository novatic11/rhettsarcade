'use strict';
// ---------- Rocket Assembly Building ----------
const Editor = (function () {
  let d = null, hist = [], fut = [], sel = null, hover = null, sym = 2;
  let flat = null, anaV = null, anaA = null, pw = null, problems = [];
  let anaBody = 'earth', cat = 'command';
  let scene, cam, rocket, env;
  const orbit = { yaw: 0.6, pitch: 0.25, dist: 12, tx: 0, ty: 0, auto: true };
  const view = { s: 40, ox: 0, oy: 0, fit: true };
  let bp, bg, drag = null, active = false, previewRect = null;
  let rects = [];          // blueprint hit boxes
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  // ---------- setup ----------
  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1620);
    cam = new THREE.PerspectiveCamera(40, 1, 0.05, 2000);
    const key = new THREE.DirectionalLight(0xfff2e0, 1.6); key.position.set(5, 8, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9cc8ff, 0.7); rim.position.set(-6, 3, -5); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x1a1410, 0.55));
    // floor
    const fl = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ color: 0x1b242e, roughness: 0.8, metalness: 0.2 }));
    fl.rotation.x = -Math.PI / 2; fl.name = 'floor'; scene.add(fl);
    const grid = new THREE.PolarGridHelper(14, 16, 10, 64, 0x2c4660, 0x1f3245); grid.position.y = 0.02; grid.name = 'floor'; scene.add(grid);
    // environment for metals
    const pm = new THREE.PMREMGenerator(World.renderer);
    const envTex = PartMesh.canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fb8d8'); gr.addColorStop(0.5, '#e8eef5'); gr.addColorStop(0.55, '#5a5048'); gr.addColorStop(1, '#202020'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 'envgrad');
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    env = pm.fromEquirectangular(envTex).texture;
    scene.environment = env;
    bp = $('#bpCanvas'); bg = bp.getContext('2d');
    bindUI();
  }
  function snapshot() { return JSON.stringify(d); }
  function commit() { hist.push(snapshot()); if (hist.length > 120) hist.shift(); fut = []; }
  function undo() { if (!hist.length) return; fut.push(snapshot()); d = JSON.parse(hist.pop()); sel = null; refresh(); Sound.fx.click(); }
  function redo() { if (!fut.length) return; hist.push(snapshot()); d = JSON.parse(fut.pop()); sel = null; refresh(); Sound.fx.click(); }

  function open(design) {
    active = true;
    $('#editor').hidden = false;
    d = design ? Design.clone(design) : (Save.prog.lastDesign ? Design.clone(Save.prog.lastDesign) : Design.empty());
    hist = []; fut = []; sel = null; view.fit = true;
    $('#edName').value = d.name;
    Sound.setMood('editor');
    renderCatalog();
    refresh();
    Tutorial.show('editor');
  }
  function close() { active = false; $('#editor').hidden = true; Save.prog.lastDesign = Design.clone(d); Save.save(); }

  // ---------- recompute everything after a change ----------
  function refresh() {
    Staging.sync(d);
    flat = Layout.flatten(d);
    const B = Bodies.byId[anaBody];
    const atm = B.atm && !B.atm.trace ? Bodies.pressureAtm(B, 0) : 0;
    anaV = Perf.analyze(flat, d.stages, { g: B.g, atm: 0 });
    anaA = Perf.analyze(flat, d.stages, { g: B.g, atm: Math.min(atm, 1) });
    pw = Perf.power(flat);
    problems = checkDesign(d, flat, anaA, pw);
    build3D();
    renderStats(); renderStaging(); renderInspector(); renderProblems();
    renderCatalogState();
    drawBP();
    $('#edUndo').disabled = !hist.length; $('#edRedo').disabled = !fut.length;
    Save.prog.lastDesign = Design.clone(d);
  }

  // ---------- 3D preview ----------
  function build3D() {
    if (rocket) { scene.remove(rocket); }
    rocket = new THREE.Group();
    for (const inst of flat.insts) {
      const m = PartMesh.forInstance(inst);
      rocket.add(m);
    }
    // stand the rocket on the floor
    const b = flat.bounds;
    if (flat.insts.length) rocket.position.y = -b.min.y;
    scene.add(rocket);
    applyHighlight();
    if (flat.insts.length) {
      const h = b.max.y - b.min.y, w = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
      orbit.ty = h / 2; orbit.tx = 0;
      orbit.distT = Math.max(4, Math.max(h, w * 1.3) * 1.55);
      if (!orbit.dist || orbit.fresh !== flat.insts.length) { orbit.fresh = flat.insts.length; }
    }
  }
  function applyHighlight() {
    if (!rocket) return;
    for (const m of rocket.children) {
      const u = m.userData.uid;
      PartMesh.highlight(m, u === sel ? 0x2fd3ff : u === hover ? 0x335577 : null);
    }
  }
  function frame(dt) {
    if (!active) return;
    const el = $('#edPreview');
    const r = el.getBoundingClientRect();
    previewRect = r;
    const R = World.renderer;
    if (orbit.distT) orbit.dist = lerp(orbit.dist, orbit.distT * (orbit.zoom || 1) * Math.max(1, 1 / ((r.width / Math.max(1, r.height)) * 1.3)), Math.min(1, dt * 6));
    if (orbit.auto && !drag) orbit.yaw += dt * 0.15;
    const cp = Math.cos(orbit.pitch);
    cam.position.set(Math.sin(orbit.yaw) * cp * orbit.dist, orbit.ty + Math.sin(orbit.pitch) * orbit.dist, Math.cos(orbit.yaw) * cp * orbit.dist);
    cam.lookAt(0, orbit.ty, 0);
    cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix();
    // flames preview off; render into the preview rectangle
    const H = window.innerHeight;
    R.setScissorTest(true);
    R.setViewport(r.left, H - r.bottom, r.width, r.height);
    R.setScissor(r.left, H - r.bottom, r.width, r.height);
    R.clear();
    R.render(scene, cam);
    R.setScissorTest(false);
    R.setViewport(0, 0, window.innerWidth, window.innerHeight);
    if (drag && drag.over === 'bp') drawBP();
  }
  function pick3D(ev) {
    const r = previewRect; if (!r) return null;
    const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, cam);
    const hits = rc.intersectObjects(rocket ? rocket.children : [], true);
    for (const h of hits) { let o = h.object; while (o && o.userData.uid == null) o = o.parent; if (o) return o.userData.uid; }
    return null;
  }

  // ---------- blueprint ----------
  const X = x => view.ox + x * view.s, Y = y => view.oy - y * view.s;
  const IX = sx => (sx - view.ox) / view.s, IY = sy => (view.oy - sy) / view.s;
  function fitView() {
    const W = bp.clientWidth, H = bp.clientHeight;
    if (!flat || !flat.insts.length) { view.s = 60; view.ox = W / 2; view.oy = H * 0.35; return; }
    const b = flat.bounds;
    const w = Math.max(2, b.max.x - b.min.x + 2.4), h = Math.max(2, b.max.y - b.min.y + 2.4);
    view.s = clamp(Math.min((W - 40) / w, (H - 90) / h), 8, 160);
    view.ox = W / 2 - (b.min.x + b.max.x) / 2 * view.s;
    view.oy = (H - 50) / 2 + (b.min.y + b.max.y) / 2 * view.s;
  }
  function resizeBP() {
    const W = bp.clientWidth, H = bp.clientHeight, k = dpr();
    if (bp.width !== Math.round(W * k) || bp.height !== Math.round(H * k)) { bp.width = Math.round(W * k); bp.height = Math.round(H * k); }
    bg.setTransform(k, 0, 0, k, 0, 0);
  }
  function instScreen(inst) {
    const p = inst.part, sp = Sprites.get(inst.pid);
    const sin = Math.sin(inst.ang || 0), cos = Math.cos(inst.ang || 0);
    let cx, flip = false, sx = 1;
    if (p.surf) { cx = inst.pos.x; flip = sin < -0.01; sx = Math.max(0.25, Math.abs(sin)); }
    else cx = inst.pos.x;
    const depth = inst.kind === 'stack' ? 0 : inst.pos.z;
    const k = view.s / sp.k;
    const W = sp.W * k * sx, Hh = sp.H * k;
    const oxPx = (1 - sp.e.x0 * sp.k) * k * sx;
    const left = flip ? X(cx) - (W - oxPx) : X(cx) - oxPx;
    const top = Y(inst.pos.y) - (1 + sp.e.y1 * sp.k) * k;
    return { left, top, W, H: Hh, flip, depth, sp, back: depth < -0.05 && inst.kind !== 'stack' };
  }
  function drawGrid(W, H) {
    const gr = bg.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#174a86'); gr.addColorStop(1, '#0f3462');
    bg.fillStyle = gr; bg.fillRect(0, 0, W, H);
    const step = view.s >= 40 ? 0.25 : view.s >= 15 ? 0.5 : 1;
    const x0 = Math.floor(IX(0) / step) * step, x1 = IX(W), y0 = Math.floor(IY(H) / step) * step, y1 = IY(0);
    bg.lineWidth = 1;
    for (let x = x0; x <= x1; x += step) { const major = Math.abs(x - Math.round(x)) < 1e-6; bg.strokeStyle = major ? 'rgba(190,220,255,0.22)' : 'rgba(190,220,255,0.08)'; bg.beginPath(); bg.moveTo(Math.round(X(x)) + 0.5, 0); bg.lineTo(Math.round(X(x)) + 0.5, H); bg.stroke(); }
    for (let y = y0; y <= y1; y += step) { const major = Math.abs(y - Math.round(y)) < 1e-6; bg.strokeStyle = major ? 'rgba(190,220,255,0.22)' : 'rgba(190,220,255,0.08)'; bg.beginPath(); bg.moveTo(0, Math.round(Y(y)) + 0.5); bg.lineTo(W, Math.round(Y(y)) + 0.5); bg.stroke(); }
    bg.strokeStyle = 'rgba(220,240,255,0.35)'; bg.setLineDash([6, 4]); bg.beginPath(); bg.moveTo(X(0), 0); bg.lineTo(X(0), H); bg.stroke(); bg.setLineDash([]);
  }
  function drawBP() {
    if (!bp || !active) return;
    resizeBP();
    const W = bp.clientWidth, H = bp.clientHeight;
    if (view.fit) fitView();
    drawGrid(W, H);
    rects = [];
    const list = flat ? flat.insts.map(i => ({ i, s: instScreen(i) })) : [];
    list.sort((a, b) => a.s.depth - b.s.depth);
    const stageOf = {}; (d.stages || []).forEach((st, k) => st.forEach(u => stageOf[u] = k + 1));
    for (const { i, s } of list) {
      bg.globalAlpha = s.back ? 0.38 : 1;
      if (drag && drag.moving && drag.hideUid === i.uid) bg.globalAlpha = 0.15;
      bg.drawImage(s.flip ? s.sp.m : s.sp.c, s.left, s.top, s.W, s.H);
      bg.globalAlpha = 1;
      rects.push({ inst: i, x: s.left, y: s.top, w: s.W, h: s.H, back: s.back, depth: s.depth });
    }
    // selection / hover outlines
    for (const r of rects) {
      const u = r.inst.uid;
      if (u !== sel && u !== hover) continue;
      bg.strokeStyle = u === sel ? '#4ff0ff' : 'rgba(255,255,255,0.6)'; bg.lineWidth = u === sel ? 2 : 1;
      bg.setLineDash(u === sel ? [] : [4, 3]);
      bg.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4); bg.setLineDash([]);
    }
    // stage tags on engines/decouplers/chutes
    bg.font = '600 10px "IBM Plex Mono", monospace'; bg.textAlign = 'center'; bg.textBaseline = 'middle';
    const tagged = new Set();
    for (const r of rects) {
      const st = stageOf[r.inst.uid];
      if (!st || r.back || tagged.has(r.inst.uid)) continue;
      tagged.add(r.inst.uid);
      const x = r.x + r.w + 10, y = r.y + r.h / 2;
      bg.fillStyle = 'rgba(255,196,64,0.95)'; bg.beginPath(); bg.arc(x, y, 8, 0, 7); bg.fill();
      bg.fillStyle = '#0f3462'; bg.fillText(st, x, y + 0.5);
    }
    // dimension lines
    if (flat && flat.insts.length) {
      const b = flat.bounds;
      const xL = X(b.min.x) - 26, yT = Y(b.max.y), yB = Y(b.min.y);
      bg.strokeStyle = 'rgba(230,245,255,0.75)'; bg.fillStyle = 'rgba(230,245,255,0.9)'; bg.lineWidth = 1;
      bg.beginPath(); bg.moveTo(xL, yT); bg.lineTo(xL, yB); bg.moveTo(xL - 5, yT); bg.lineTo(xL + 5, yT); bg.moveTo(xL - 5, yB); bg.lineTo(xL + 5, yB); bg.stroke();
      bg.save(); bg.translate(xL - 8, (yT + yB) / 2); bg.rotate(-Math.PI / 2); bg.textAlign = 'center'; bg.fillText(fmtNum(b.max.y - b.min.y, 2) + ' m', 0, 0); bg.restore();
      const yW = yB + 18; bg.beginPath(); bg.moveTo(X(b.min.x), yW); bg.lineTo(X(b.max.x), yW); bg.moveTo(X(b.min.x), yW - 4); bg.lineTo(X(b.min.x), yW + 4); bg.moveTo(X(b.max.x), yW - 4); bg.lineTo(X(b.max.x), yW + 4); bg.stroke();
      bg.fillText(fmtNum(b.max.x - b.min.x, 2) + ' m', (X(b.min.x) + X(b.max.x)) / 2, yW + 11);
    } else {
      bg.fillStyle = 'rgba(230,245,255,0.75)'; bg.font = '500 14px "IBM Plex Sans", sans-serif'; bg.textAlign = 'center';
      bg.fillText('Drag a probe core or command pod here', W / 2, H * 0.42);
      bg.font = '12px "IBM Plex Sans", sans-serif'; bg.fillStyle = 'rgba(230,245,255,0.5)';
      bg.fillText('Every other part snaps onto it', W / 2, H * 0.42 + 22);
    }
    // drag ghost + snap marker
    if (drag && drag.over === 'bp') {
      const t = drag.target;
      if (t && t.mark) {
        bg.strokeStyle = '#5dff9a'; bg.lineWidth = 3; bg.shadowColor = '#5dff9a'; bg.shadowBlur = 10;
        bg.beginPath(); bg.moveTo(t.mark[0], t.mark[1]); bg.lineTo(t.mark[2], t.mark[3]); bg.stroke(); bg.shadowBlur = 0;
      }
      const sp = Sprites.get(drag.pid), p = PARTS[drag.pid];
      const k = view.s / sp.k;
      let gx = drag.mx, gy = drag.my, flip = false;
      if (t && t.ghost) { gx = t.ghost[0]; gy = t.ghost[1]; flip = !!t.ghost[2]; }
      const oxPx = (1 - sp.e.x0 * sp.k) * k, oyPx = (1 + sp.e.y1 * sp.k) * k;
      bg.globalAlpha = t ? 0.92 : 0.5;
      bg.drawImage(flip ? sp.m : sp.c, flip ? gx - (sp.W * k - oxPx) : gx - oxPx, gy - oyPx, sp.W * k, sp.H * k);
      bg.globalAlpha = 1;
      if (!t) { bg.fillStyle = 'rgba(255,150,150,0.95)'; bg.font = '12px "IBM Plex Sans", sans-serif'; bg.textAlign = 'center'; bg.fillText(drag.why || 'Move it onto a part to attach', drag.mx, drag.my + sp.H * k / 2 + 16); }
    }
    // title block
    const tbW = Math.min(260, W - 20), tbH = 56, tx = W - tbW - 10, ty = H - tbH - 10;
    bg.fillStyle = 'rgba(15,52,98,0.85)'; bg.fillRect(tx, ty, tbW, tbH);
    bg.strokeStyle = 'rgba(220,240,255,0.6)'; bg.lineWidth = 1; bg.strokeRect(tx + 0.5, ty + 0.5, tbW, tbH);
    bg.beginPath(); bg.moveTo(tx, ty + 20); bg.lineTo(tx + tbW, ty + 20); bg.moveTo(tx + tbW * 0.55, ty + 20); bg.lineTo(tx + tbW * 0.55, ty + tbH); bg.stroke();
    bg.textAlign = 'left'; bg.textBaseline = 'middle'; bg.fillStyle = 'rgba(230,245,255,0.95)'; bg.font = '600 11px "IBM Plex Mono", monospace';
    bg.fillText((d.name || 'UNTITLED').toUpperCase().slice(0, 30), tx + 8, ty + 10.5);
    bg.font = '10px "IBM Plex Mono", monospace'; bg.fillStyle = 'rgba(230,245,255,0.75)';
    const m = flat ? Vessel.mass({ parts: flat.insts.map(i => ({ pid: i.pid, pos: i.pos, res: Perf.initRes(i).r })) }).m : 0;
    bg.fillText(`MASS ${fmtNum(m, 2)} t`, tx + 8, ty + 31); bg.fillText(`PARTS ${flat ? flat.insts.length : 0}`, tx + 8, ty + 46);
    bg.fillText(`SCALE 1 m = ${Math.round(view.s)} px`, tx + tbW * 0.55 + 8, ty + 31); bg.fillText(`SYM ${sym}×`, tx + tbW * 0.55 + 8, ty + 46);
  }
  function hitBP(mx, my) {
    // front-most first
    const order = rects.slice().sort((a, b) => (b.back ? -1 : 0) - (a.back ? -1 : 0) || b.depth - a.depth);
    for (const r of order) if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return r;
    return null;
  }

  // ---------- snapping ----------
  function targetAt(pid, mx, my) {
    const p = PARTS[pid];
    const cmd = PartUtil.isCommand(p) || p.type === 'cabin';
    if (!d.stack.length) {
      if (!PartUtil.isCommand(p)) return { none: 'Start with a command pod or probe core' };
      return { type: 'root', ghost: [X(0), Y(0) + 0], mark: null };
    }
    let best = null, bestD = 1e9;
    const consider = (t, dist) => { if (dist < bestD) { bestD = dist; best = t; } };
    // 1) stack boundaries (main stack)
    if (!p.surf) {
      const stk = flat.insts.filter(i => i.kind === 'stack');
      const bounds = [];
      stk.forEach((i, k) => { if (k === 0) bounds.push({ y: i.pos.y + i.part.h / 2, idx: 0, r: Math.max(i.part.r, 0.3) }); bounds.push({ y: i.pos.y - i.part.h / 2, idx: k + 1, r: Math.max(i.part.rb, 0.3) }); });
      for (const b of bounds) {
        const sx = X(0), sy = Y(b.y), dx = Math.abs(mx - sx), dy = Math.abs(my - sy);
        if (dx < b.r * view.s + 30 && dy < 26) {
          const gy = b.idx === 0 ? sy - p.h / 2 * view.s : sy + p.h / 2 * view.s;
          consider({ type: 'stack', index: b.idx, ghost: [sx, gy], mark: [sx - b.r * view.s - 8, sy, sx + b.r * view.s + 8, sy] }, dy * 1.2 + dx * 0.1);
        }
      }
      // side stacks (boosters): top/bottom/between of the visible right-most copy
      const groups = {};
      for (const i of flat.insts) if (i.kind === 'side') { const key = i.gid + ':' + i.iid.split('/').slice(0, -1).join('/'); const sn = Math.sin(i.ang); if (!groups[i.gid] || sn > groups[i.gid].sn + 1e-6) groups[i.gid] = { sn, key, list: [] }; }
      for (const gid in groups) {
        const g = groups[gid];
        const its = flat.insts.filter(i => i.kind === 'side' && i.gid === +gid && Math.abs(Math.sin(i.ang) - g.sn) < 1e-6 && i.iid.split('/').slice(0, -1).join('/') === g.key.split(':')[1]);
        its.sort((a, b) => b.pos.y - a.pos.y);
        its.forEach((i, k) => {
          const ax = X(i.pos.x);
          const bnds = k === 0 ? [[i.pos.y + i.part.h / 2, 0], [i.pos.y - i.part.h / 2, 1]] : [[i.pos.y - i.part.h / 2, k + 1]];
          for (const [yy, idx] of bnds) {
            const sy = Y(yy), dx = Math.abs(mx - ax), dy = Math.abs(my - sy);
            if (dx < i.part.r * view.s + 24 && dy < 22) consider({ type: 'side', gid: +gid, index: idx, ghost: [ax, idx === 0 ? sy - p.h / 2 * view.s : sy + p.h / 2 * view.s], mark: [ax - i.part.r * view.s - 6, sy, ax + i.part.r * view.s + 6, sy] }, dy * 1.2 + dx * 0.1 + 2);
          }
        });
      }
    }
    // 2) radial attach on the side of a stack/side part, or onto a radial decoupler
    for (const r of rects) {
      const i = r.inst;
      if (r.back) continue;
      if (i.kind === 'conn' && !p.surf && p.type !== 'rdecoupler') {
        const g = Design.findGroup(d, i.gid);
        if (g && !g.group.items.length && mx > r.x - 10 && mx < r.x + r.w + 40 && my > r.y - 10 && my < r.y + r.h + 10) {
          const right = Math.sin(i.ang) >= 0;
          const edgeX = right ? r.x + r.w : r.x;
          const ax = right ? edgeX + Math.max(p.r, p.rb) * view.s : edgeX - Math.max(p.r, p.rb) * view.s;
          consider({ type: 'conn', gid: i.gid, ghost: [ax, Y(i.pos.y)], mark: [edgeX, r.y, edgeX, r.y + r.h] }, 4);
        }
        continue;
      }
      if (i.kind !== 'stack' && i.kind !== 'side') continue;
      const P = i.part;
      const axX = X(i.pos.x);
      const halfW = Math.max(P.r, P.rb) * view.s;
      const yTop = Y(i.pos.y + P.h / 2), yBot = Y(i.pos.y - P.h / 2);
      if (my < yTop - 2 || my > yBot + 2) continue;
      const off = mx - axX;
      if (Math.abs(off) > halfW + 70) continue;
      if (!p.surf && Math.abs(off) < halfW * 0.6) continue; // centre region is for stacking
      const right = off >= 0;
      let fy = clamp((IY(my) - (i.pos.y - P.h / 2)) / P.h, 0, 1);
      fy = Math.round(fy * 20) / 20;
      const yAtt = i.pos.y - P.h / 2 + fy * P.h;
      const rp = Layout.radiusAt(P, fy) * view.s;
      const edgeX = right ? axX + rp : axX - rp;
      const worldAng = right ? 90 : 270;
      const localAng = (worldAng - (i.ang || 0) / DEG + 720) % 360;
      let gx = edgeX;
      if (!p.surf) gx = right ? edgeX + Math.max(p.r, p.rb) * view.s : edgeX - Math.max(p.r, p.rb) * view.s;
      const dist = Math.max(0, Math.abs(off) - halfW) * 0.5 + 6;
      consider({ type: 'radial', uid: i.uid, y: fy, ang: localAng, ghost: [gx, Y(yAtt), !right], mark: [edgeX, Y(yAtt) - 12, edgeX, Y(yAtt) + 12] }, dist);
    }
    if (cmd && best && best.type === 'radial') return { none: 'Command parts go in the stack, not on the side' };
    if (p.type === 'rdecoupler' && best && best.type !== 'radial') return null;
    return best;
  }
  function place(pid, t, payload) {
    commit();
    const node = payload ? payload.node : Design.node(d, pid);
    if (payload && payload.conn) { /* moving a radial decoupler with boosters */ }
    if (t.type === 'root') d.stack.push(node);
    else if (t.type === 'stack') d.stack.splice(t.index, 0, node);
    else if (t.type === 'side') { const g = Design.findGroup(d, t.gid).group; g.items.splice(t.index, 0, node); if (t.index <= g.anchor && g.items.length > 1) g.anchor++; }
    else if (t.type === 'conn') { const g = Design.findGroup(d, t.gid).group; g.items.push(node); g.anchor = 0; }
    else if (t.type === 'radial') {
      const f = Design.find(d, t.uid); if (!f) return;
      const p = PARTS[pid];
      const s = PartUtil.isCommand(p) ? 1 : sym;
      let g;
      if (p.type === 'rdecoupler') g = Design.group(d, s, t.y, t.ang, node, payload && payload.items ? payload.items : []);
      else g = Design.group(d, s, t.y, t.ang, null, [node]);
      f.node.radials.push(g);
    }
    sel = node.uid;
    Sound.fx.snap();
    refresh();
  }

  // ---------- catalogue ----------
  function renderCatalog() {
    const tabs = $('#catTabs'); tabs.innerHTML = '';
    for (const [id, name] of CATS) {
      const b = el('button', 'cat-tab' + (id === cat ? ' on' : ''), `<span class="cat-ico" data-cat="${id}"></span><span class="cat-name">${name}</span>`);
      b.title = name; b.onclick = () => { cat = id; renderCatalog(); Sound.fx.click(); };
      tabs.appendChild(b);
    }
    const list = $('#catList'); list.innerHTML = '';
    const parts = Object.values(PARTS).filter(p => p.cat === cat);
    for (const p of parts) {
      const unlocked = Save.partUnlocked(p.id);
      const c = el('div', 'part-card' + (unlocked ? '' : ' locked'));
      c.dataset.pid = p.id;
      const ic = Sprites.icon(p.id, 56); ic.className = 'part-ico';
      c.appendChild(ic);
      const info = el('div', 'part-info', `<b>${esc(p.name)}</b><span>${partLine(p)}</span>`);
      c.appendChild(info);
      if (!unlocked) info.appendChild(el('div', 'lock', `🔒 ${esc(TechById[p.tech].name)}`));
      c.addEventListener('pointerdown', (ev) => startCatalogDrag(ev, p.id));
      c.addEventListener('mouseenter', () => showTip(c, p));
      c.addEventListener('mouseleave', hideTip);
      list.appendChild(c);
    }
    renderCatalogState();
  }
  function renderCatalogState() {
    const empty = !d || !d.stack.length;
    $$('#catList .part-card').forEach(c => { const p = PARTS[c.dataset.pid]; c.classList.toggle('gated', empty && !PartUtil.isCommand(p)); });
    $('#catHint').hidden = !empty;
  }
  function partLine(p) {
    const bits = [fmtMass(p.mass)];
    if (p.eng) bits.push(`${fmtInt(p.eng.thr)} kN`, `Isp ${fmtInt(p.eng.ispV)}`);
    if (p.res) bits.push(Object.keys(p.res).map(k => `${RES[k].short} ${p.res[k] < 0.01 ? fmtNum(p.res[k] * 1000, 1) + ' kg' : fmtNum(p.res[k], 2) + ' t'}`).join(' '));
    if (p.crew) bits.push(`${p.crew} crew`);
    if (p.ec && p.type === 'battery') bits.push(`${p.ec} EC`);
    if (p.gen) bits.push(`+${p.gen} EC/s`);
    if (p.ant) bits.push(`range ${fmtDist(p.ant.range)}`);
    if (p.exp) bits.push(EXPERIMENTS[p.exp].name);
    if (p.chute) bits.push('parachute');
    if (p.ablator) bits.push(`ablator ${p.ablator}`);
    return bits.join(' · ');
  }
  function showTip(anchor, p) {
    const t = $('#partTip');
    const size = p.surf ? 'surface mount' : `${PartUtil.sizeName(Math.max(p.r, p.rb))} ${fmtNum(Math.max(p.r, p.rb) * 2, 3)} m`;
    t.innerHTML = `<h4>${esc(p.name)}</h4><div class="tip-sub">${CATS.find(c => c[0] === p.cat)[1]} · ${size} · max ${fmtInt(p.maxTemp)} K</div>${p.desc ? `<p>${esc(p.desc)}</p>` : ''}<div class="tip-stats">${partLine(p)}</div>${!Save.partUnlocked(p.id) ? `<div class="tip-lock">Unlock in the Research Center: ${esc(TechById[p.tech].name)} (${TechById[p.tech].cost} science)</div>` : ''}`;
    const r = anchor.getBoundingClientRect();
    t.hidden = false;
    t.style.left = Math.min(window.innerWidth - 290, r.right + 8) + 'px';
    t.style.top = Math.min(window.innerHeight - t.offsetHeight - 8, r.top) + 'px';
  }
  function hideTip() { $('#partTip').hidden = true; }

  // ---------- dragging ----------
  function startCatalogDrag(ev, pid) {
    if (ev.button !== 0) return;
    if (!Save.partUnlocked(pid)) { toast(`${PARTS[pid].name} is locked. Research ${TechById[PARTS[pid].tech].name} first.`, 'warn'); return; }
    if (!d.stack.length && !PartUtil.isCommand(PARTS[pid])) { toast('Start with a command pod or probe core. Everything else attaches to it.', 'warn'); return; }
    ev.preventDefault();
    hideTip();
    drag = { pid, mx: 0, my: 0, sx: ev.clientX, sy: ev.clientY, from: 'cat', started: false, target: null };
    beginDragListeners();
  }
  function beginDragListeners() {
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd, { once: true });
  }
  function onDragMove(ev) {
    if (!drag) return;
    if (!drag.started && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 5) {
      drag.started = true;
      if (drag.from === 'bp' && drag.moveUid != null) pickUp();
      const gh = $('#dragGhost'); gh.innerHTML = ''; gh.appendChild(Sprites.icon(drag.pid, 70)); gh.hidden = false;
    }
    if (!drag.started) return;
    const r = bp.getBoundingClientRect();
    const inBP = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    const gh = $('#dragGhost');
    if (inBP) {
      drag.over = 'bp'; gh.hidden = true;
      drag.mx = ev.clientX - r.left; drag.my = ev.clientY - r.top;
      const t = targetAt(drag.pid, drag.mx, drag.my);
      drag.target = t && !t.none ? t : null; drag.why = t && t.none;
      drawBP();
    } else {
      if (drag.over === 'bp') { drag.over = null; drawBP(); }
      drag.over = null; drag.target = null;
      gh.hidden = false; gh.style.left = ev.clientX - 35 + 'px'; gh.style.top = ev.clientY - 35 + 'px';
      const cr = $('#catalog').getBoundingClientRect();
      gh.classList.toggle('trash', drag.moving && ev.clientX < cr.right);
    }
  }
  function pickUp() {
    // lift an existing part out of the design (its radial attachments come with it)
    drag.before = snapshot();
    const f = Design.find(d, drag.moveUid);
    if (!f) { drag = null; return; }
    if (f.ctx.kind === 'conn') {
      drag.payload = { node: f.node, items: f.ctx.group.items };
    } else drag.payload = { node: f.node };
    Design.remove(d, drag.moveUid);
    drag.moving = true;
    sel = null;
    flat = Layout.flatten(d);
    view.fit = false;
    drawBP();
  }
  function onDragEnd(ev) {
    window.removeEventListener('pointermove', onDragMove);
    $('#dragGhost').hidden = true; $('#dragGhost').classList.remove('trash');
    if (!drag) return;
    const dr = drag; drag = null;
    if (!dr.started) {
      if (dr.from === 'cat') clickAdd(dr.pid);
      return;
    }
    if (dr.target) {
      if (dr.moving) { const cur = dr.before; d = JSON.parse(JSON.stringify(d)); hist.push(cur); fut = []; placeNoCommit(dr.pid, dr.target, dr.payload); }
      else place(dr.pid, dr.target, null);
      view.fit = true; refresh();
      return;
    }
    if (dr.moving) {
      const cr = $('#catalog').getBoundingClientRect();
      if (ev.clientX < cr.right) { hist.push(dr.before); fut = []; Sound.fx.remove(); toast('Part removed', 'info', 1500); }
      else { d = JSON.parse(dr.before); toast('Parts must attach to the rocket. Returned it to its place.', 'info', 2200); }
      view.fit = true; refresh();
    }
  }
  function placeNoCommit(pid, t, payload) {
    const saveCommit = commit; // place() commits; we already pushed history
    hist.length; // no-op
    const node = payload.node;
    if (t.type === 'root') d.stack.push(node);
    else if (t.type === 'stack') d.stack.splice(t.index, 0, node);
    else if (t.type === 'side') { const g = Design.findGroup(d, t.gid).group; g.items.splice(t.index, 0, node); }
    else if (t.type === 'conn') { const g = Design.findGroup(d, t.gid).group; g.items.push(node); }
    else if (t.type === 'radial') {
      const f = Design.find(d, t.uid); if (!f) return;
      const p = PARTS[pid];
      const g = p.type === 'rdecoupler' ? Design.group(d, sym, t.y, t.ang, node, payload.items || []) : Design.group(d, sym, t.y, t.ang, null, [node]);
      f.node.radials.push(g);
    }
    sel = node.uid; Sound.fx.snap();
  }
  // click a catalogue card: add to the selected part, or the bottom of the stack
  function clickAdd(pid) {
    const p = PARTS[pid];
    if (!d.stack.length) { place(pid, { type: 'root' }); return; }
    const f = sel != null ? Design.find(d, sel) : null;
    if (p.surf || p.type === 'rdecoupler') {
      const host = f && (f.ctx.kind === 'stack' || (f.ctx.kind === 'item' && !PARTS[f.node.pid].surf)) ? f.node : d.stack[Math.floor(d.stack.length / 2)];
      place(pid, { type: 'radial', uid: host.uid, y: p.type === 'fin' || p.type === 'leg' ? 0.1 : 0.5, ang: 90 });
      return;
    }
    if (f && f.ctx.kind === 'stack') place(pid, { type: 'stack', index: f.ctx.index + 1 });
    else place(pid, { type: 'stack', index: d.stack.length });
  }

  // ---------- part actions ----------
  function removeSel() {
    if (sel == null) return;
    commit();
    Design.remove(d, sel); sel = null; Sound.fx.remove(); view.fit = true; refresh();
  }
  function duplicateSel() {
    if (sel == null) return;
    const f = Design.find(d, sel); if (!f) return;
    commit();
    if (f.ctx.kind === 'stack') { const c = Design.reuid(d, Design.clone(f.node)); d.stack.splice(f.ctx.index + 1, 0, c); sel = c.uid; }
    else {
      const g = f.ctx.group;
      const c = Design.clone(g); c.uid = d.nextUid++; if (c.conn) Design.reuid(d, c.conn); c.items.forEach(it => Design.reuid(d, it));
      c.ang = (c.ang + 180 / c.sym) % 360;
      f.ctx.parent.radials.push(c);
      sel = (c.conn || c.items[0]).uid;
    }
    Sound.fx.snap(); view.fit = true; refresh();
  }
  function moveStack(dir) {
    const f = sel != null ? Design.find(d, sel) : null;
    if (!f || f.ctx.kind !== 'stack') return;
    const i = f.ctx.index, j = i + dir;
    if (j < 0 || j >= d.stack.length) return;
    commit();
    [d.stack[i], d.stack[j]] = [d.stack[j], d.stack[i]];
    refresh();
  }
  function setSym(n) {
    sym = n;
    $$('.sym-btn').forEach(b => b.classList.toggle('on', +b.dataset.sym === n));
    // apply to the selected radial group too
    const f = sel != null ? Design.find(d, sel) : null;
    if (f && f.ctx.group && f.ctx.group.sym !== n && !PartUtil.isCommand(PARTS[f.node.pid])) { commit(); f.ctx.group.sym = n; refresh(); }
    else drawBP();
  }

  // ---------- panels ----------
  function renderStats() {
    const B = Bodies.byId[anaBody];
    const m = flat.insts.length ? Vessel.mass({ parts: flat.insts.map(i => ({ pid: i.pid, pos: i.pos, res: Perf.initRes(i).r })) }).m : 0;
    const twr = anaA.stages[0] ? anaA.stages[0].twr : 0;
    const dvA = anaV.total - (anaV.stages[0] ? anaV.stages[0].dv : 0) + (anaA.stages[0] ? anaA.stages[0].dv : 0);
    const crew = flat.insts.reduce((a, i) => a + (i.part.crew || 0), 0);
    const b = flat.bounds;
    $('#edStats').innerHTML = `
      <div class="stat big"><label>Δv vacuum</label><b>${fmtInt(anaV.total)}<small> m/s</small></b></div>
      <div class="stat big"><label>Δv from ${B.name} surface</label><b>${fmtInt(dvA)}<small> m/s</small></b></div>
      <div class="stat big ${twr < 1 && flat.insts.length ? 'bad' : twr < 1.2 ? 'warn' : ''}"><label>Liftoff TWR (${B.name})</label><b>${fmtNum(twr, 2)}</b></div>
      <div class="stat"><label>Mass</label><b>${fmtMass(m)}</b></div>
      <div class="stat"><label>Height</label><b>${flat.insts.length ? fmtNum(b.max.y - b.min.y, 1) : 0} m</b></div>
      <div class="stat"><label>Parts</label><b>${flat.insts.length}</b></div>
      <div class="stat"><label>Crew seats</label><b>${crew}</b></div>
      <div class="stat"><label>Power</label><b>${fmtInt(pw.cap)} EC · ${pw.gen > 0 ? '+' + fmtNum(pw.gen, 2) : '0'}/s</b></div>`;
  }
  function renderProblems() {
    const box = $('#edProblems'); box.innerHTML = '';
    for (const pr of problems.slice(0, 5)) box.appendChild(el('div', 'prob ' + pr.lvl, esc(pr.msg)));
  }
  function stageItemName(uid) {
    const f = Design.find(d, uid); if (!f) return '?';
    const n = f.ctx.group ? f.ctx.group.sym : 1;
    return { name: PARTS[f.node.pid].name, n, type: PARTS[f.node.pid].type };
  }
  function renderStaging() {
    const box = $('#stageList'); box.innerHTML = '';
    const stages = d.stages || [];
    stages.forEach((st, k) => {
      const a = anaV.stages[k], aa = anaA.stages[k];
      const s = el('div', 'stage');
      s.dataset.idx = k;
      s.innerHTML = `<div class="stage-h"><span class="stage-n">${k + 1}</span><span class="stage-m">${a && a.dv > 0 ? `Δv ${fmtInt(a.dv)} · TWR ${fmtNum(k === 0 ? aa.twr : a.twr, 2)}<br>${fmtTime(a.time, true)} burn` : k === 0 ? 'fires first' : ''}</span><span class="stage-btns"><button title="Move earlier" data-a="up">▲</button><button title="Move later" data-a="dn">▼</button></span></div>`;
      for (const uid of st) {
        const it = stageItemName(uid);
        const chip = el('div', 'chip t-' + it.type, `<i></i>${esc(it.name)}${it.n > 1 ? ` <em>×${it.n}</em>` : ''}`);
        chip.draggable = true; chip.dataset.uid = uid;
        chip.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(uid)); chip.classList.add('dragging'); });
        chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
        chip.addEventListener('click', () => { sel = uid; applyHighlight(); drawBP(); renderInspector(); });
        if (uid === sel) chip.classList.add('sel');
        s.appendChild(chip);
      }
      s.addEventListener('dragover', e => { e.preventDefault(); s.classList.add('over'); });
      s.addEventListener('dragleave', () => s.classList.remove('over'));
      s.addEventListener('drop', e => { e.preventDefault(); s.classList.remove('over'); moveToStage(+e.dataTransfer.getData('text/plain'), k); });
      const bu = s.querySelector('[data-a=up]'), bd = s.querySelector('[data-a=dn]');
      bu.disabled = k === 0; bd.disabled = k === stages.length - 1;
      bu.onclick = () => swapStage(k, k - 1);
      bd.onclick = () => swapStage(k, k + 1);
      box.appendChild(s);
    });
    const ns = el('div', 'stage new', '+ Drop here for a new stage');
    ns.addEventListener('dragover', e => { e.preventDefault(); ns.classList.add('over'); });
    ns.addEventListener('dragleave', () => ns.classList.remove('over'));
    ns.addEventListener('drop', e => { e.preventDefault(); moveToStage(+e.dataTransfer.getData('text/plain'), stages.length); });
    box.appendChild(ns);
  }
  function moveToStage(uid, k) {
    commit();
    d.stages = d.stages.map(s => s.filter(u => u !== uid));
    while (d.stages.length <= k) d.stages.push([]);
    d.stages[k].push(uid);
    d.stages = d.stages.filter(s => s.length);
    refresh();
  }
  function swapStage(a, b) {
    if (b < 0 || b >= d.stages.length) return;
    commit();
    [d.stages[a], d.stages[b]] = [d.stages[b], d.stages[a]]; refresh();
  }
  function renderInspector() {
    const box = $('#edInspector');
    const f = sel != null ? Design.find(d, sel) : null;
    if (!f) { box.hidden = true; return; }
    box.hidden = false;
    const p = PARTS[f.node.pid];
    const o = f.node.opts || (f.node.opts = {});
    let h = `<div class="insp-h"><b>${esc(p.name)}</b><button class="x" data-a="close" title="Deselect">×</button></div><div class="insp-sub">${partLine(p)}</div>`;
    if (p.res && Object.keys(p.res).some(k => k !== 'EC')) h += `<label class="sl">Fuel fill <input type="range" id="inFill" min="0" max="100" value="${Math.round((o.fill != null ? o.fill : 1) * 100)}"><span>${Math.round((o.fill != null ? o.fill : 1) * 100)}%</span></label>`;
    if (p.eng) h += `<label class="sl">Thrust limit <input type="range" id="inLim" min="10" max="100" value="${Math.round((o.limit != null ? o.limit : 1) * 100)}"><span>${Math.round((o.limit != null ? o.limit : 1) * 100)}%</span></label>`;
    if (f.ctx.group) h += `<div class="insp-row">Symmetry <span class="sym-mini">${[1, 2, 3, 4, 6, 8].map(n => `<button data-sym="${n}" class="${f.ctx.group.sym === n ? 'on' : ''}">${n}×</button>`).join('')}</span></div>
      <label class="sl">Height on part <input type="range" id="inY" min="0" max="100" value="${Math.round(f.ctx.group.y * 100)}"><span>${Math.round(f.ctx.group.y * 100)}%</span></label>`;
    h += `<div class="insp-btns"><button data-a="dup">Duplicate <kbd>Ctrl D</kbd></button><button data-a="del" class="danger">Remove <kbd>Del</kbd></button>${f.ctx.kind === 'stack' ? '<button data-a="up">Move up</button><button data-a="dn">Move down</button>' : ''}</div>`;
    box.innerHTML = h;
    box.querySelector('[data-a=close]').onclick = () => { sel = null; applyHighlight(); drawBP(); renderInspector(); };
    box.querySelector('[data-a=dup]').onclick = duplicateSel;
    box.querySelector('[data-a=del]').onclick = removeSel;
    const up = box.querySelector('[data-a=up]'); if (up) up.onclick = () => moveStack(-1);
    const dn = box.querySelector('[data-a=dn]'); if (dn) dn.onclick = () => moveStack(1);
    const slider = (id, fn) => { const s = $('#' + id); if (!s) return; s.addEventListener('pointerdown', () => commit()); s.addEventListener('input', () => { s.nextElementSibling.textContent = s.value + '%'; fn(+s.value / 100); refreshLight(); }); };
    slider('inFill', v => { o.fill = v; });
    slider('inLim', v => { o.limit = v; });
    slider('inY', v => { f.ctx.group.y = v; flat = Layout.flatten(d); build3D(); drawBP(); });
    $$('.sym-mini button', box).forEach(b => b.onclick = () => { commit(); f.ctx.group.sym = +b.dataset.sym; refresh(); });
  }
  function refreshLight() {
    const B = Bodies.byId[anaBody];
    anaV = Perf.analyze(flat, d.stages, { g: B.g, atm: 0 });
    anaA = Perf.analyze(flat, d.stages, { g: B.g, atm: Math.min(B.atm && !B.atm.trace ? Bodies.pressureAtm(B, 0) : 0, 1) });
    problems = checkDesign(d, flat, anaA, pw);
    renderStats(); renderProblems();
    $$('#stageList .stage').forEach((s, k) => { const a = anaV.stages[k]; const m = s.querySelector('.stage-m'); if (m && a) m.innerHTML = a.dv > 0 ? `Δv ${fmtInt(a.dv)} · TWR ${fmtNum(k === 0 ? anaA.stages[0].twr : a.twr, 2)}<br>${fmtTime(a.time, true)} burn` : ''; });
  }

  // ---------- saving & loading ----------
  function saveDesign() {
    d.name = ($('#edName').value || 'Untitled Rocket').trim();
    Save.prog.designs[d.name] = Design.clone(d);
    Save.save();
    toast(`Saved “${esc(d.name)}”`, 'good', 2000);
  }
  function openLoad() {
    const designs = Object.keys(Save.prog.designs).sort();
    const rows = designs.map(n => `<div class="load-row"><span>${esc(n)}</span><small>${Layout.flatten(Save.prog.designs[n]).insts.length} parts</small><button data-load="${esc(n)}">Load</button><button class="danger" data-del="${esc(n)}">Delete</button></div>`).join('') || '<p class="muted">No saved rockets yet. Name your design at the top and press Save.</p>';
    Modal.open('Load a rocket', `<div class="load-list">${rows}</div><h4>Starter designs</h4><div class="load-row"><span>Pebble Hopper</span><small>first sounding rocket</small><button data-starter="hopper">Load</button></div>`, [{ label: 'Close' }]);
    $$('[data-load]').forEach(b => b.onclick = () => { commit(); d = Design.clone(Save.prog.designs[b.dataset.load]); $('#edName').value = d.name; sel = null; view.fit = true; Modal.close(); refresh(); });
    $$('[data-del]').forEach(b => b.onclick = () => { delete Save.prog.designs[b.dataset.del]; Save.save(); openLoad(); });
    $$('[data-starter]').forEach(b => b.onclick = () => { commit(); d = starterDesign(b.dataset.starter); $('#edName').value = d.name; sel = null; view.fit = true; Modal.close(); refresh(); });
  }
  function launch() {
    d.name = ($('#edName').value || 'Untitled Rocket').trim();
    const errs = problems.filter(p => p.lvl === 'err');
    const go = () => { Save.prog.lastDesign = Design.clone(d); Save.prog.designs[d.name] = Design.clone(d); Save.save(); Game.launchDesign(Design.clone(d)); };
    if (!flat.insts.length) { toast('Build a rocket first.', 'warn'); return; }
    if (errs.length) Modal.open('Launch anyway?', `<p>This design has problems:</p><ul>${errs.map(e => `<li>${esc(e.msg)}</li>`).join('')}</ul>`, [{ label: 'Keep building' }, { label: 'Launch anyway', primary: true, fn: go }]);
    else go();
  }

  // ---------- input ----------
  function bindUI() {
    $('#edBack').onclick = () => Game.goto('center');
    $('#edNew').onclick = () => { commit(); d = Design.empty(); $('#edName').value = d.name; sel = null; view.fit = true; refresh(); };
    $('#edSave').onclick = saveDesign;
    $('#edLoad').onclick = openLoad;
    $('#edUndo').onclick = undo; $('#edRedo').onclick = redo;
    $('#edLaunch').onclick = launch;
    $('#edFit').onclick = () => { view.fit = true; drawBP(); };
    $('#edName').addEventListener('change', () => { d.name = $('#edName').value; drawBP(); });
    $$('.sym-btn').forEach(b => b.onclick = () => setSym(+b.dataset.sym));
    $('#stageReset').onclick = () => { commit(); d.stages = null; refresh(); toast('Staging reset to automatic', 'info', 1500); };
    const sel2 = $('#edBody');
    sel2.innerHTML = Bodies.list.filter(b => b.type !== 'star').map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    sel2.value = anaBody;
    sel2.onchange = () => { anaBody = sel2.value; refresh(); };
    // blueprint mouse
    let pan = null;
    bp.addEventListener('pointerdown', ev => {
      const r = bp.getBoundingClientRect(); const mx = ev.clientX - r.left, my = ev.clientY - r.top;
      if (ev.button === 1 || ev.button === 2 || (ev.button === 0 && ev.altKey)) { pan = { x: ev.clientX, y: ev.clientY, ox: view.ox, oy: view.oy }; view.fit = false; ev.preventDefault(); return; }
      const h = hitBP(mx, my);
      if (h) {
        sel = h.inst.uid; applyHighlight(); drawBP(); renderInspector(); renderStaging();
        drag = { pid: h.inst.pid, moveUid: h.inst.uid, from: 'bp', sx: ev.clientX, sy: ev.clientY, started: false, hideUid: h.inst.uid };
        beginDragListeners();
      } else { sel = null; applyHighlight(); drawBP(); renderInspector(); pan = { x: ev.clientX, y: ev.clientY, ox: view.ox, oy: view.oy, click: true }; }
    });
    window.addEventListener('pointermove', ev => {
      if (pan) { if (Math.hypot(ev.clientX - pan.x, ev.clientY - pan.y) > 4) { view.fit = false; pan.click = false; } view.ox = pan.ox + ev.clientX - pan.x; view.oy = pan.oy + ev.clientY - pan.y; if (!pan.click) drawBP(); return; }
      if (!active || drag) return;
      const r = bp.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
      const h = hitBP(ev.clientX - r.left, ev.clientY - r.top);
      const nh = h ? h.inst.uid : null;
      if (nh !== hover) { hover = nh; applyHighlight(); drawBP(); }
    });
    window.addEventListener('pointerup', () => { pan = null; });
    bp.addEventListener('contextmenu', e => e.preventDefault());
    bp.addEventListener('wheel', ev => {
      ev.preventDefault();
      const r = bp.getBoundingClientRect(); const mx = ev.clientX - r.left, my = ev.clientY - r.top;
      const wx = IX(mx), wy = IY(my);
      view.s = clamp(view.s * Math.pow(1.0015, -ev.deltaY), 6, 260); view.fit = false;
      view.ox = mx - wx * view.s; view.oy = my + wy * view.s;
      drawBP();
    }, { passive: false });
    // preview orbit
    const pv = $('#edPreview');
    let od = null;
    pv.addEventListener('pointerdown', ev => { od = { x: ev.clientX, y: ev.clientY, yaw: orbit.yaw, pitch: orbit.pitch, moved: false }; orbit.auto = false; pv.setPointerCapture(ev.pointerId); });
    pv.addEventListener('pointermove', ev => {
      if (od) { const dx = ev.clientX - od.x, dy = ev.clientY - od.y; if (Math.abs(dx) + Math.abs(dy) > 3) od.moved = true; orbit.yaw = od.yaw - dx * 0.008; orbit.pitch = clamp(od.pitch + dy * 0.006, -0.3, 1.35); return; }
      const u = pick3D(ev); if (u !== hover) { hover = u; applyHighlight(); drawBP(); }
    });
    pv.addEventListener('pointerup', ev => { if (od && !od.moved) { const u = pick3D(ev); sel = u; applyHighlight(); drawBP(); renderInspector(); renderStaging(); } od = null; });
    pv.addEventListener('wheel', ev => { ev.preventDefault(); orbit.zoom = clamp((orbit.zoom || 1) * Math.pow(1.0012, ev.deltaY), 0.25, 3); }, { passive: false });
    pv.addEventListener('dblclick', () => { orbit.auto = true; orbit.zoom = 1; });
  }
  function key(e) {
    if (!active || Modal.isOpen()) return false;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return false;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) { undo(); return true; }
    if (ctrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { redo(); return true; }
    if (ctrl && e.key.toLowerCase() === 'd') { duplicateSel(); return true; }
    if (ctrl && e.key.toLowerCase() === 's') { saveDesign(); return true; }
    if (e.key === 'Delete' || e.key === 'Backspace') { removeSel(); return true; }
    if (e.key === 'Escape') { sel = null; applyHighlight(); drawBP(); renderInspector(); return true; }
    if (e.key.toLowerCase() === 'x') { const ss = [1, 2, 3, 4, 6, 8]; setSym(ss[(ss.indexOf(sym) + (e.shiftKey ? ss.length - 1 : 1)) % ss.length]); return true; }
    if (e.key === 'ArrowUp') { moveStack(-1); return true; }
    if (e.key === 'ArrowDown') { moveStack(1); return true; }
    return false;
  }
  return { init, open, close, frame, key, get active() { return active; }, get design() { return d; }, onResize: () => { if (active) drawBP(); } };
})();
