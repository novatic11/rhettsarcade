'use strict';
// ---------- Flight scene: camera, controls, visuals, HUD, science ----------
// Mouse = camera only. Keyboard flies: W/S pitch, A/D yaw, Q/E roll, Shift/Ctrl throttle,
// Z full / X cut, Space stage, T SAS, R RCS, G deploy, M map, , . warp, / stop warp.
const Flight = (function () {
  let active = false, map = false;
  const keys = {};
  const cam = { yaw: 2.4, pitch: 0.18, dist: 30, distT: 30, roll: 0 };
  // the last three (100 million to 10 billion times) exist for crossings between stars
  const WARP = [1, 2, 3, 4, 10, 50, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 10000000000];
  let warpIdx = 0;
  const loaded = new Map();
  let hudT = 0, logT = 0, nav = null, fx = null, xmit = null, shake = 0;
  let failureShown = false;
  const camHelio = new V3();
  const _a = new V3(), _b = new V3(), _c = new V3();
  const DT = 0.02;

  const av = () => Game.vessels.find(v => v.id === Game.activeId);
  function setActive(id) { Game.activeId = id; const v = av(); if (v) { cam.distT = defaultDist(v); } renderStagesFull(); }
  function defaultDist(v) { if (v.type === 'eva') return 5; const pr = Phys.getProps(v); return clamp(pr.L * 1.9 + pr.r * 3, 6, 140); }

  // ---------- start / stop ----------
  function start() {
    active = true; failureShown = false; map = false; warpIdx = 0;
    $('#flight').hidden = false; $('#mapUI').hidden = true;
    $('#fToastSlot').appendChild($('#toasts')); // messages flow under the altimeter instead of covering it
    $('#fhudMain').classList.remove('mapmode');
    if (!nav) initNavball();
    if (!fx) initFx();
    const v = av();
    if (v) { cam.dist = cam.distT = defaultDist(v); }
    Sound.setMood('flight');
    renderStagesFull();
    updateWarpUI();
    Tutorial.show('flight');
  }
  function stop() {
    active = false; map = false;
    $('#flight').hidden = true; $('#mapUI').hidden = true; $('#sciPanel').hidden = true;
    $('#flight').classList.remove('sci-open');
    document.body.appendChild($('#toasts'));
    for (const [id, L] of loaded) unloadVisual(id);
    loaded.clear();
    Sound.setEngine(0, 0, 0); Sound.setWind(0, 0);
    if (fx) fx.clear();
  }

  // ---------- input ----------
  function key(e, down) {
    if (!active) return false;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return false;
    const k = e.code;
    keys[k] = down;
    if (!down) return ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'].includes(k);
    if (Game.paused) return false;
    const v = av(); if (!v) return false;
    switch (k) {
      case 'Space': if (v.type === 'eva') return true; doStage(); return true;
      case 'KeyZ': v.throttle = 1; return true;
      case 'KeyX': v.throttle = 0; return true;
      case 'KeyT': if (v.type !== 'eva') { v.sas = !v.sas; v.sasHold = null; updateToggles(); } return true;
      case 'KeyR': if (v.type === 'eva') { v.jetpack = !v.jetpack; toast(v.jetpack ? 'Jetpack on' : 'Jetpack off', 'info', 1200); } else { v.rcs = !v.rcs; updateToggles(); } return true;
      case 'KeyG': if (v.type !== 'eva') toggleDeploy(v); return true;
      case 'KeyM': toggleMap(); return true;
      case 'KeyB': if (v.type === 'eva') board(v); return true;
      case 'KeyF': if (v.type === 'eva') grab(v); return true;
      case 'Period': setWarp(warpIdx + 1); return true;
      case 'Comma': setWarp(warpIdx - 1); return true;
      case 'Slash': setWarp(0); return true;
      case 'BracketRight': cycleVessel(1); return true;
      case 'BracketLeft': cycleVessel(-1); return true;
      case 'KeyV': cam.yaw = 2.4; cam.pitch = 0.18; cam.distT = defaultDist(v); return true;
      case 'F5': e.preventDefault(); Game.quickSave(); return true;
      case 'F9': e.preventDefault(); Game.quickLoad(); return true;
    }
    return false;
  }
  function ctlFromKeys(v) {
    const k = keys;
    const c = { pitch: 0, yaw: 0, roll: 0, trans: new V3(), move: new V3(), up: 0, jump: false, run: false };
    if (v.type === 'eva') {
      c.move.z = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
      c.move.x = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
      c.up = (k.ShiftLeft || k.ShiftRight ? 1 : 0) - (k.ControlLeft || k.ControlRight ? 1 : 0);
      c.run = !!(k.ShiftLeft || k.ShiftRight);
      c.jump = !!k.Space; if (k.Space) keys.Space = false;
      c.roll = (k.KeyE ? 1 : 0) - (k.KeyQ ? 1 : 0);
      const cq = World.camera.quaternion;
      c.camQ = cq.clone(); c.camFwd = new V3(0, 0, -1).applyQuaternion(cq); c.camUp = new V3(0, 1, 0).applyQuaternion(cq); c.camRight = new V3(1, 0, 0).applyQuaternion(cq);
      return c;
    }
    c.pitch = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
    c.yaw = (k.KeyA ? 1 : 0) - (k.KeyD ? 1 : 0);
    c.roll = (k.KeyQ ? 1 : 0) - (k.KeyE ? 1 : 0);
    if (v.rcs) c.trans.set((k.KeyL ? 1 : 0) - (k.KeyJ ? 1 : 0), (k.KeyH ? 1 : 0) - (k.KeyN ? 1 : 0), (k.KeyK ? 1 : 0) - (k.KeyI ? 1 : 0));
    return c;
  }
  // mouse: camera only
  let md = null;
  function mouseDown(e) { if (!active || map) return; md = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch }; }
  function mouseMove(e) {
    if (!md) return;
    const s = Save.prog.settings.sens || 1;
    cam.yaw = md.yaw - (e.clientX - md.x) * 0.006 * s;
    cam.pitch = clamp(md.pitch + (e.clientY - md.y) * 0.005 * s, -1.45, 1.45);
  }
  function mouseUp() { md = null; }
  function wheel(e) { if (!active || map) return; cam.distT = clamp(cam.distT * Math.pow(1.0015, e.deltaY), 2, 60000); }

  // ---------- actions ----------
  function doStage() {
    const v = av(); if (!v || v.type !== 'ship') return;
    if (v.landed && v.stageIdx === 0) { v.log.launched = true; Save.prog.stats.launches++; }
    const made = Phys.stage(v, Game.time);
    for (const nv of made) Game.vessels.push(nv);
    rebuildVisual(v);
    renderStagesFull();
    const st = v.stages[v.stageIdx - 1] || [];
    if (v.throttle === 0 && v.parts.some(p => st.includes(p.uid) && PARTS[p.pid].eng && !PARTS[p.pid].eng.srb)) toast('Engines lit, but the throttle is at zero. Press Shift (or Z for full).', 'warn', 3500);
  }
  function toggleDeploy(v) {
    let any = false, state = null;
    for (const p of v.parts) {
      const P = PARTS[p.pid];
      if (!P.deploy) continue;
      if (state === null) state = !p.deployed;
      const e = v.lastEnv;
      if (state && P.type === 'solar' && e && e.q > 3000) { toast(`${P.name} would be torn off at this speed. Deploy it in space.`, 'warn'); continue; }
      p.deployed = state; any = true;
    }
    if (any) { toast(state ? 'Deployed legs, panels and radiators' : 'Retracted deployables', 'info', 1500); Phys.invalidate(v); }
    else toast('Nothing to deploy on this vessel.', 'info', 1500);
  }
  function cycleVessel(dir) {
    const near = [...loaded.keys()].map(id => Game.vessels.find(v => v.id === id)).filter(v => v && !v.dead && v.type !== 'flag' && (v.type !== 'debris'));
    if (near.length < 2) return;
    const i = near.findIndex(v => v.id === Game.activeId);
    setActive(near[(i + dir + near.length) % near.length].id);
    toast(`Switched to ${esc(av().name)}`, 'info', 1500);
  }
  function startEVA(crewName) {
    const v = av(); if (!v) return;
    const e = v.lastEnv || Phys.env(v, Game.time);
    if (!v.landed && e.rho > 0.01 && e.vAir.length() > 30) { toast('Too fast to open the hatch in the atmosphere. Slow below 30 m/s or land first.', 'warn'); return; }
    if (warpIdx > 0) setWarp(0);
    const eva = Eva.create(v, crewName, Game.time);
    BlackBox.push('eva', { body: v.body, landed: !!v.landed });
    Game.vessels.push(eva);
    setActive(eva.id);
    const B = Bodies.byId[eva.body];
    const sp = !eva.landed;
    eva.log.eva[B.id] = eva.log.eva[B.id] || {};
    if (sp && (!B.atmH || (eva.r.length() - B.R) > B.atmH)) eva.log.eva[B.id].space = true;
    if (eva.landed) eva.log.eva[B.id].landed = true;
    const c = Save.prog.crew.find(c => c.name === crewName); if (c) c.evas++;
    Game.checkMissions(eva.log);
    Tutorial.show('eva');
    renderStagesFull();
  }
  function board(e) {
    let best = null, bd = 4.5;
    for (const id of loaded.keys()) {
      const o = Game.vessels.find(x => x.id === id); if (!o || o.type !== 'ship' || o.dead) continue;
      for (const p of o.parts) {
        const P = PARTS[p.pid]; if (!P.crew || p.crew.length >= P.crew) continue;
        const w = p.pos.clone().applyQuaternion(o.q).add(o.r);
        const d = w.distanceTo(e.r) - Math.max(P.r, P.rb);
        if (d < bd) { bd = d; best = { o, p }; }
      }
    }
    if (!best) { toast('No free seat within reach. Get closer to a capsule hatch.', 'info', 2000); return; }
    best.p.crew.push(e.crewName);
    best.o.data = (best.o.data || []).concat(e.data || []);
    e.dead = true;
    setActive(best.o.id);
    toast(`${esc(e.crewName)} boarded ${esc(best.o.name)}`, 'good', 2000);
  }
  function grab(e) {
    if (e.grab) { e.grab = null; return; }
    for (const id of loaded.keys()) {
      const o = Game.vessels.find(x => x.id === id); if (!o || o === e || o.dead || o.type === 'eva') continue;
      for (const p of o.parts) {
        const w = p.pos.clone().applyQuaternion(o.q).add(o.r);
        if (w.distanceTo(e.r) < Math.max(PARTS[p.pid].r || 0.3, 0.3) + 1.6) {
          e.grab = { id: o.id, local: e.r.clone().sub(o.r).applyQuaternion(o.q.clone().invert()) };
          toast(`Holding on to ${esc(o.name)}. Space lets go.`, 'info', 1800); return;
        }
      }
    }
    toast('Nothing within reach to grab.', 'info', 1500);
  }
  function plantFlag(e) {
    if (!e.landed) return;
    const B = Bodies.byId[e.body];
    const f = { id: Game.newVesselId(), name: `Flag: ${e.crewName} on ${B.name}`, type: 'flag', parts: [], links: [], stages: [], stageIdx: 0, body: e.body, r: e.r.clone().addScaledVector(e.r.clone().normalize(), -0.95), v: e.v.clone(), q: e.q.clone(), w: new V3(), landed: true, log: Missions.newLog() };
    f.r.add(new V3(1.2, 0, 0).applyQuaternion(e.q));
    Phys.setLandedFrame(f, Game.time);
    Game.vessels.push(f);
    e.log.flag[B.id] = true;
    Save.prog.flags.push({ body: B.id, crew: e.crewName, t: Game.time });
    toast(`Flag planted on ${B.name}`, 'good');
    Game.checkMissions(e.log);
  }

  // ---------- warp ----------
  function canRails(v) {
    if (!v) return 'No vessel';
    const B = Bodies.byId[v.body];
    if (v.landed || cheatOn(v, 'warp')) return null;
    const alt = v.r.length() - B.R;
    if (B.atmH && alt < B.atmH) return `Can't warp faster than 4× inside ${B.name}'s atmosphere.`;
    if (v.type === 'eva' && v.thrusting) return 'Stop the jetpack first.';
    if (B.solid && alt < B.maxTerrain + 500) return 'Too close to the surface for high time warp.';
    return null;
  }
  function setWarp(i) {
    i = clamp(i, 0, WARP.length - 1);
    const v = av();
    if (i >= 4) {
      const why = canRails(v);
      if (why) { toast(why, 'warn', 2200); i = Math.min(i, 3); }
      else if (v && v.throttle > 0 && v.type === 'ship') { v.throttle = 0; toast('Throttle cut for time warp.', 'info', 1500); }
    }
    warpIdx = i; updateWarpUI();
  }
  function updateWarpUI() {
    $$('#fWarp button[data-w]').forEach(b => b.classList.toggle('on', +b.dataset.w <= warpIdx));
    $('#fWarpRate').textContent = warpLabel(WARP[warpIdx]);
  }
  function warpLabel(w) { return w >= 1e9 ? (w / 1e9) + 'B×' : w >= 1e6 ? (w / 1e6) + 'M×' : w >= 1000 ? (w / 1000) + 'k×' : w + '×'; }
  function warpTo(t) { Game.warpTarget = t; setWarp(WARP.length - 1); }

  // ---------- main update ----------
  function update(dtR) {
    if (!active) return;
    const v = av();
    if (!Game.paused && v) {
      const rate = WARP[warpIdx];
      const sim = Math.min(dtR, 0.1) * rate;
      if (warpIdx < 4) physicsAdvance(sim, v);
      else railsAdvance(sim, v);
      afterStep(v, dtR);
    }
    Bodies.update(Game.time);
    if (map) MapView.update(dtR, av()); else updateCamera(dtR);
    updateLoaded();
    renderScene(dtR);
    hudT -= dtR; if (hudT <= 0) { hudT = 0.1; updateHUD(); }
  }
  function physicsAdvance(sim, v) {
    const steps = Math.max(1, Math.ceil(sim / DT));
    const h = sim / steps;
    const ctl = ctlFromKeys(v);
    if (v.type === 'ship') {
      const k = keys;
      const dThr = ((k.ShiftLeft || k.ShiftRight) ? 1 : 0) - ((k.ControlLeft || k.ControlRight) ? 1 : 0);
      v.throttle = clamp(v.throttle + dThr * Math.min(sim, 0.1) * 1.2 / Math.max(1, WARP[warpIdx]), 0, 1);
      if (v.node && v.node.auto) autoNode(v);
    }
    const none = { pitch: 0, yaw: 0, roll: 0, trans: new V3(), move: new V3(), up: 0 };
    for (let s = 0; s < steps; s++) {
      Game.time += h;
      Bodies.update(Game.time);
      for (const id of loaded.keys()) {
        const o = Game.vessels.find(x => x.id === id);
        if (!o || o.dead || o.type === 'flag') continue;
        const ev = Phys.step(o, Game.time, h, o === v ? ctl : none);
        if (ev.length) handleEvents(o, ev);
      }
    }
    for (const o of Game.vessels) if (!loaded.has(o.id)) o.epoch = Game.time;
  }
  function railsAdvance(sim, v) {
    const t0 = Game.time;
    let t1 = t0 + sim;
    if (Game.warpTarget && t1 >= Game.warpTarget) { t1 = Game.warpTarget; Game.warpTarget = null; setWarp(0); toast('Warp finished', 'info', 1200); }
    let stopAt = null, stopWhy = null;
    for (const id of loaded.keys()) {
      const o = Game.vessels.find(x => x.id === id); if (!o || o.dead) continue;
      const bodyBefore = o.body;
      const res = Phys.rails(o, t0, t1, o === v ? (why, vv, tt) => {
        if (why === 'soi') {
          toast(`Entered ${Bodies.byId[vv.body].name}'s sphere of influence`, 'info');
          // interstellar warps would carry a ship straight through a new system: drop back to 10M×
          if (WARP[warpIdx] > 1e7) { stopAt = tt; stopWhy = 'soi'; return tt; }
          return null;
        }
        stopAt = tt || t1; stopWhy = why; return tt;
      } : null);
      if (o === v && stopAt) {
        Game.time = stopAt;
        if (stopWhy === 'soi') { setWarp(11); toast('Warp slowed to 10M×: arrived in a new sphere of influence', 'info', 2600); }
        else { setWarp(0); toast('Time warp stopped: approaching ' + (Bodies.byId[v.body].atmH ? 'the atmosphere' : 'the surface'), 'info', 2200); }
      }
      if (o.body !== bodyBefore && o === v) v.log.soi[o.body] = true;
    }
    if (!stopAt) Game.time = t1;
    for (const o of Game.vessels) if (!loaded.has(o.id)) o.epoch = Game.time;
  }
  function afterStep(v, dtR) {
    // docking
    if (v.type === 'ship' && Phys.freePorts(v).length) for (const id of loaded.keys()) { const o = Game.vessels.find(x => x.id === id); if (o && o !== v && o.type === 'ship' && !o.dead && o.body === v.body && Phys.tryDock(v, o)) { toast(`Docked with ${esc(o.name)}!`, 'good'); Sound.fx.success(); rebuildVisual(v); renderStagesFull(); Game.checkMissions(v.log); } }
    // node countdown
    if (v.node && v.node.dvRem && v.node.dvRem.length() < 0.25 && v.node.burning) { v.node.burning = false; v.throttle = 0; toast('Maneuver complete', 'good', 2000); v.node = null; v.sasMode = 'stab'; v.sasHold = null; }
    // transmissions
    if (xmit) stepXmit(v, dtR * WARP[warpIdx]);
    logT -= dtR; if (logT <= 0) { logT = 0.25; updateLog(v); }
    // clean up vessels
    for (let i = Game.vessels.length - 1; i >= 0; i--) {
      const o = Game.vessels[i];
      if (o.dead) { if (loaded.has(o.id)) unloadVisual(o.id); loaded.delete(o.id); Game.vessels.splice(i, 1); continue; }
    }
    if (v.dead && !failureShown) onActiveLost(v);
  }
  function autoNode(v) {
    const n = v.node; if (!n || !n.dvRem) return;
    const pr = Phys.getProps(v);
    const eng = Phys.engines(v, Phys.env(v, Game.time), 0, false);
    let maxF = 0; for (const p of v.parts) { const P = PARTS[p.pid]; if (P.eng && p.active) maxF += P.eng.thr * p.limit; }
    const burn = maxF > 0 ? n.dvRem.length() * pr.m / maxF : 0;
    const tTo = n.t - Game.time;
    const fwd = new V3(0, 1, 0).applyQuaternion(v.q);
    const aligned = fwd.dot(n.dvRem.clone().normalize()) > 0.985;
    v.sas = true; v.sasMode = 'node';
    if (tTo <= burn / 2 && aligned) { v.throttle = clamp(n.dvRem.length() / Math.max(0.5, burn) * 2, 0.05, 1); n.burning = true; }
    else if (!n.burning) v.throttle = 0;
    if (n.burning && !aligned) v.throttle = 0;
  }
  // ---------- events ----------
  function handleEvents(v, evs) {
    for (const ev of evs) {
      if (v.dead) return;
      if (cheatOn(v, 'god') && (ev.kind === 'destroy' || ev.kind === 'overheat' || ev.kind === 'break' || ev.kind === 'chuteTorn')) continue;
      if (ev.kind === 'destroy') {
        v.dead = true; v.deathMsg = ev.msg; BlackBox.push('destroyed', { vessel: v.type, msg: String(ev.msg).slice(0, 160) });
        explode(v);
        if (v.id !== Game.activeId && v.type === 'ship') toast(`${esc(v.name)} was destroyed`, 'bad');
      } else if (ev.kind === 'overheat' || ev.kind === 'break') {
        const parts = ev.parts || [ev.p];
        if (!parts.length) continue;
        if (v.id === Game.activeId) toast(ev.msg, 'bad', 6000);
        v.lastFailMsg = ev.msg;
        const before = v.parts.length;
        for (const p of parts) explodeAt(v, p);
        const made = Phys.destroyParts(v, Game.time, parts.filter(p => v.parts.includes(p)));
        made.forEach(m => Game.vessels.push(m));
        if (v.dead || !v.parts.length) { v.dead = true; v.deathMsg = ev.msg; }
        else if (v.lostControl && v.id === Game.activeId) { v.deathMsg = ev.msg; v.uncontrolled = true; }
        if (before !== v.parts.length) rebuildVisual(v);
        renderStagesFull();
      } else if (ev.kind === 'chuteTorn') { if (v.id === Game.activeId) toast(ev.msg, 'warn', 4000); rebuildVisual(v); }
      else if (ev.kind === 'soi') {
        if (v.id === Game.activeId) { const B = Bodies.byId[v.body]; toast(`${ev.dir === 'enter' ? 'Entered' : 'Left for'} ${B.name}'s sphere of influence`, 'info'); v.log.soi[B.id] = true; Game.checkMissions(v.log); if (B.solid) TexStore.request(B); }
      }
    }
  }
  function onActiveLost(v) {
    failureShown = true;
    Sound.fx.fail();
    Save.prog.stats.lost++;
    // crew respawn at the space center
    for (const p of v.parts || []) for (const n of (p.crew || [])) { const c = Save.prog.crew.find(c => c.name === n); if (c) c.status = 'ready'; }
    if (v.type === 'eva') { const c = Save.prog.crew.find(c => c.name === v.crewName); if (c) c.status = 'ready'; }
    const msg = v.deathMsg || v.lastFailMsg || 'The vessel was lost.';
    Game.failure(msg);
  }

  // ---------- loaded vessels & visuals ----------
  function updateLoaded() {
    const v = av(); if (!v) return;
    const vB = Bodies.byId[v.body];
    const vh = _a.copy(v.r).add(vB.pos);
    for (const o of Game.vessels) {
      if (o.dead) continue;
      const oB = Bodies.byId[o.body];
      const oh = _b.copy(o.r).add(oB.pos);
      const d = oh.distanceTo(vh);
      const want = o === v || (d < 2500);
      if (want && !loaded.has(o.id)) {
        if (o.epoch != null && o.epoch < Game.time && !o.landed) Phys.rails(o, o.epoch, Game.time, null);
        if (o.landed) Phys.rails(o, Game.time, Game.time, null);
        loaded.set(o.id, buildVisual(o));
      } else if (!want && loaded.has(o.id)) {
        if (o.type === 'debris') { o.dead = true; }
        unloadVisual(o.id); loaded.delete(o.id); o.epoch = Game.time;
      }
    }
  }
  function buildVisual(o) {
    let g;
    if (o.type === 'eva') g = Eva.model();
    else if (o.type === 'flag') g = Eva.flagModel();
    else {
      g = PartMesh.buildVessel(o);
      // keep base transforms of animated bits so we can animate relative to them
      for (const iid in g.userData.anim) for (const k in g.userData.anim[iid]) { const ob = g.userData.anim[iid][k]; ob.userData.baseQ = ob.quaternion.clone(); ob.userData.baseS = ob.scale.clone(); }
    }
    World.scene.add(g);
    return { group: g };
  }
  function unloadVisual(id) { const L = loaded.get(id); if (!L) return; World.scene.remove(L.group); if (L.group.userData.mats) PartMesh.disposeVessel(L.group); }
  function rebuildVisual(o) { if (!loaded.has(o.id)) return; unloadVisual(o.id); loaded.set(o.id, buildVisual(o)); }

  // ---------- camera ----------
  function frameAt(v, out) {
    const B = Bodies.byId[v.body];
    const U = v.r.clone().normalize();
    let N = B.axis.clone().addScaledVector(U, -B.axis.dot(U));
    if (N.lengthSq() < 1e-8) N.set(1, 0, 0).addScaledVector(U, -U.x);
    N.normalize();
    const E = new V3().crossVectors(N, U);
    return { U, N, E };
  }
  function focusHelio(v, out) {
    const B = Bodies.byId[v.body];
    if (v.type === 'ship' || v.type === 'debris') { const pr = Phys.getProps(v); return Phys.comW(v, pr, out).add(B.pos); }
    return out.copy(v.r).add(B.pos);
  }
  function updateCamera(dt) {
    const v = av(); if (!v) return;
    cam.dist = lerp(cam.dist, cam.distT, Math.min(1, dt * 8));
    const f = frameAt(v);
    const target = focusHelio(v, new V3());
    const cp = Math.cos(cam.pitch);
    const off = new V3().addScaledVector(f.E, Math.sin(cam.yaw) * cp).addScaledVector(f.N, -Math.cos(cam.yaw) * cp).addScaledVector(f.U, Math.sin(cam.pitch)).multiplyScalar(cam.dist);
    camHelio.copy(target).add(off);
    // keep the camera above the ground
    const B = Bodies.byId[v.body];
    if (B.solid) {
      const rel = camHelio.clone().sub(B.pos);
      const alt = rel.length() - B.R;
      if (alt < B.maxTerrain + 200) {
        const s = Terrain.surface(B, rel, Game.time);
        // distant terrain is drawn with coarser tiles that can sit above the exact height, so keep more clearance far from the vessel
        const minR = B.R + s.h + 1.5 + Math.min(120, cam.dist * 0.05);
        if (rel.length() < minR) { rel.setLength(minR); camHelio.copy(rel).add(B.pos); }
      }
    }
    const C = World.camera;
    C.position.set(0, 0, 0);
    let up = f.U.clone();
    if (v.type === 'eva' && v.rollOff) up.applyAxisAngle(off.clone().normalize(), v.rollOff);
    C.up.copy(up);
    C.lookAt(target.clone().sub(camHelio));
    // buffeting during re-entry, max-Q and liftoff
    if (shake > 0 && !map) { const s = shake * Math.min(1, 40 / Math.max(cam.dist, 1)) ** 0.3; C.rotateX((Math.random() - 0.5) * s); C.rotateY((Math.random() - 0.5) * s); }
    C.near = clamp(cam.dist * 0.02, 0.05, 5); C.updateProjectionMatrix();
    C.updateMatrixWorld();
  }
  // ---------- rendering ----------
  const floatW = { h: 0, g: new V3() };
  function renderScene(dt) {
    const v = av();
    if (map) { MapView.render(); return; }
    if (v) { const L = v.type === "ship" || v.type === "debris" ? Phys.getProps(v).L : 2; World.setFocus(focusHelio(v, new V3()).sub(camHelio), Math.max(6, L * 0.7 + 4)); }
    World.update(camHelio, Game.time, v ? Bodies.byId[v.body] : null, dt);
    const time = performance.now() / 1000;
    let engLevel = 0, solid = 0, atmF = 0, heatGlow = 0, qd = 0;
    for (const [id, L] of loaded) {
      const o = Game.vessels.find(x => x.id === id); if (!o) continue;
      const B = Bodies.byId[o.body];
      L.group.position.copy(o.r).add(B.pos).sub(camHelio);
      L.group.quaternion.copy(o.q);
      // afloat: rise and fall with the swell and lean with its slope
      if (o.splashed && o.landed !== false && Water.has(B)) {
        const bf = Bodies.toBF(B, o.r, Game.time, new V3()), w = Water.sample(B, bf, floatW);
        const up = o.r.clone().normalize(), g = Bodies.fromBF(B, w.g, Game.time, new V3());
        g.addScaledVector(up, -g.dot(up));
        L.group.position.addScaledVector(up, w.h);
        const tilt = up.clone().sub(g.multiplyScalar(o.type === 'eva' ? 0.6 : 0.9)).normalize();
        L.group.quaternion.premultiply(new Q4().setFromUnitVectors(up, tilt));
      }
      if (o.type === 'eva') { if (o.rollOff) L.group.quaternion.multiply(new Q4().setFromAxisAngle(new V3(0, 0, 1), -o.rollOff * 0)); Eva.animate(L.group, o, dt); if (fx) fx.evaFx(o, L.group); continue; }
      if (o.type === 'flag') continue;
      const anim = L.group.userData.anim || {};
      let nozzleHeat = 0;
      const e = o.lastEnv;
      const atm = e ? e.atm : 0;
      const pm = Vessel.pmap(o);
      for (const iid in anim) {
        const a = anim[iid], p = pm[iid];
        if (!p) { for (const k in a) a[k].visible = false; continue; }
        const P = PARTS[p.pid];
        if (a.flame) {
          const on = (p.firing || 0) > 0 && !Game.paused;
          a.flame.visible = on;
          if (on) {
            const u = a.flame.userData;
            const thr = p.firing;
            const vac = 1 - clamp(atm * 3, 0, 1);
            const len = u.base * (0.45 + 0.55 * thr) * (1 + vac * 1.8) * (0.94 + Math.random() * 0.08);
            const wid = 1 + vac * 1.6;
            a.flame.scale.set(wid, len, wid);
            u.mat.uniforms.uTime.value = time; u.mat.uniforms.uI.value = (0.9 + 0.4 * thr) * (Post.enabled ? 1.7 : 1);
            u.mat.uniforms.uAtm.value = clamp(atm * 4, 0, 1);
            nozzleHeat = Math.max(nozzleHeat, thr);
            if (o.id === Game.activeId) { engLevel += thr * Math.min(1, P.eng.thr / 200 + 0.3); if (P.eng.srb) solid = 1; }
            if (e && e.rho > 0.02 && fx) fx.smoke(o, p, a.flame, P);
          }
        }
        if (a.glow) a.glow.material.color.setScalar(p.firing ? 1 : 0.15);
        if (a.canopy) {
          const st = p.chute;
          a.canopy.visible = st === 'semi' || st === 'open';
          if (a.canopy.visible && e) {
            const tgt = (a.canopy.userData.open = lerp(a.canopy.userData.open || 0.05, st === 'open' ? 1 : 0.22, Math.min(1, dt * 2)));
            a.canopy.scale.set(tgt, Math.max(tgt, 0.5), tgt);
            const dirW = e.vAir.lengthSq() > 1 ? e.vAir.clone().normalize().negate() : o.r.clone().normalize();
            const dl = dirW.applyQuaternion(o.q.clone().invert());
            a.canopy.quaternion.setFromUnitVectors(new V3(0, 1, 0), dl);
          }
        }
        if (a.legPivot) { const tgt = p.deployed ? 0.62 : 0; a.legPivot.userData.ang = lerp(a.legPivot.userData.ang || 0, tgt, Math.min(1, dt * 3)); a.legPivot.quaternion.copy(a.legPivot.userData.baseQ).multiply(new Q4().setFromAxisAngle(new V3(0, 0, 1), a.legPivot.userData.ang)); }
        if (a.deployed) { a.deployed.visible = !!p.deployed; if (a.stowed) a.stowed.visible = !p.deployed; }
        if (a.shell && p.fair && !p.fair.on) {
          a.shell.userData.t = (a.shell.userData.t || 0) + dt;
          const t = a.shell.userData.t;
          a.shell.children.forEach((h, i) => { h.rotation.z = (i ? 1 : -1) * Math.min(1.6, t * 1.2); h.position.x = (i ? 1 : -1) * t * 2.5; });
          if (t > 3) a.shell.visible = false;
        }
        if (a.statusLight) a.statusLight.visible = (time * 2 % 1) < 0.5;
      }
      // heat glow on the merged hull
      const hg = smooth(0.45, 1.0, o.hottest || 0);
      const envK = 0.3 + 0.7 * World.daylight;
      if (L.group.userData.mats) for (const m of L.group.userData.mats) {
        if (m.emissive) { m.emissive.setRGB(1.0 * hg, 0.32 * hg, 0.08 * hg); m.emissiveIntensity = 1.4 * hg; }
        // a firing engine's nozzle throat glows
        if (m.name === 'nozzleIn' && nozzleHeat > 0) { m.emissive.setRGB(1.0, 0.42, 0.12); m.emissiveIntensity = Math.max(1.4 * hg, nozzleHeat * (Post.enabled ? 2.5 : 0.8)); }
        if (m.envMap) m.envMapIntensity = m.metalness > 0.5 ? 1.0 : 0.6;
      }
      if (o.id === Game.activeId) { atmF = atm; heatGlow = clamp(Math.pow((o.heatFlux || 0) / 160, 0.75), 0, 1); qd = e ? e.q : 0; if (fx) { fx.plasma(o, L.group, heatGlow, e); fx.vapor(o, e); } shake = Game.paused ? 0 : heatGlow * 0.006 + clamp((qd - 25000) / 50000, 0, 1) * 0.003 + (e && e.alt < 300 ? engLevel * 0.0025 : 0); }
    }
    // particles move in simulated time, like the ship and the planet; under high (on-rails) warp a trail
    // would be meaningless, so it is cleared
    if (fx) { if (warpIdx >= 4) fx.clear(); else fx.update(dt, camHelio, Game.paused ? 0 : Math.min(dt, 0.1) * WARP[warpIdx]); }
    Sound.setEngine(Game.paused ? 0 : clamp(engLevel, 0, 1), solid, atmF);
    Sound.setWind(Game.paused ? 0 : qd, heatGlow);
    World.render();
    renderNavball();
  }

  // ---------- effects: smoke, plasma, explosions ----------
  function initFx() {
    const N = World.quality === 'low' ? 260 : 1800;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N), col = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const tex = PartMesh.canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 'puff');
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uScale: { value: window.innerHeight } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        uniform float uScale;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); float ps = size * uScale / max(-mv.z, 0.1); vA = alpha * clamp(ps * 0.5, 0.0, 1.0); gl_PointSize = clamp(ps, 1.0, 512.0); gl_Position = projectionMatrix * mv;
        #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `uniform sampler2D uTex; varying float vA; varying vec3 vC;
        #include <logdepthbuf_pars_fragment>
        void main(){
        #include <logdepthbuf_fragment>
        vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA); }`,
      transparent: true, depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 20;
    World.scene.add(pts);
    const P = [];
    for (let i = 0; i < N; i++) P.push({ life: 0, age: 0, pos: new V3(), vel: new V3(), s0: 1, s1: 1, c: [1, 1, 1], a0: 1, fire: false });
    let cursor = 0;
    // Particles never live in Sun-centred coordinates: a planet moves kilometres a second around its star,
    // so any difference between the time particles are stepped and the time the world is drawn at would
    // carry them off the ship (it did, as rows of separated smoke columns). Each particle belongs to the
    // body it was made near (B). Things carried by the air (air: true: smoke, embers, dust) live in that
    // body's rotating, ground-fixed frame and so stay over the ground they were left above; the rest
    // (explosions, jetpack puffs) live in its non-rotating frame and drift at their own velocity.
    // A vessel's own exhaust (anchor: the vessel, e.g. jetpack puffs) is stored relative to that vessel,
    // so it can never be left behind however fast the vessel moves. Debris carried along an orbit (base)
    // follows the game clock: its carrier motion, including the bend of the orbit, is worked out from the
    // time since it was made rather than added up frame by frame, so it stays in step with the vessels.
    // pos: Sun-centred position at spawn (or bf: a ground-fixed one); vel, g: world-frame vectors;
    // base: Sun-centred carrier velocity for non-air particles.
    const _w = new V3();
    const anchorPos = (a, out) => out.copy(a.r).add(Bodies.byId[a.body].pos);
    const spawn = (o) => {
      const p = P[cursor]; cursor = (cursor + 1) % N;
      p.drag = 0.8; p.base = null; p.g = null; p.B = null; p.air = false; p.bf = null; p.anchor = null; p.cg = null;
      Object.assign(p, o); p.age = 0;
      const B = p.B, t = Game.time;
      p.t0 = t;
      p.vel = o.vel ? o.vel.clone() : new V3();
      if (p.anchor) { p.pos = o.pos.clone().sub(anchorPos(p.anchor, _w)); p.base = null; p.air = false; return p; }
      if (!B) { p.pos = o.pos.clone(); p.base = o.base ? o.base.clone() : null; return p; }
      if (p.air) {
        p.pos = o.bf ? o.bf.clone() : Bodies.toBF(B, _w.copy(o.pos).sub(B.pos), t, new V3());
        Bodies.toBF(B, p.vel, t, p.vel);
        if (o.g) p.g = Bodies.toBF(B, o.g, t, new V3());
        p.base = null;
      } else {
        p.c0 = o.pos.clone().sub(B.pos); p.pos = new V3();
        p.base = o.base ? o.base.clone().sub(B.vel) : null;
        // gravity at the spawn point bends the carrier path like the orbit it was on
        const r2 = p.c0.lengthSq(); p.cg = p.base && r2 > 1 ? p.c0.clone().multiplyScalar(-B.GM / (r2 * Math.sqrt(r2))) : null;
      }
      return p;
    };
    // where a particle is now, Sun-centred
    const worldPos = (p, out) => {
      if (p.anchor) return anchorPos(p.anchor, out).add(p.pos);
      if (!p.B) return out.copy(p.pos);
      if (p.air) return Bodies.fromBF(p.B, p.pos, Game.time, out).add(p.B.pos);
      out.copy(p.c0).add(p.pos);
      if (p.base) { const tau = Math.max(0, Game.time - p.t0); out.addScaledVector(p.base, tau); if (p.cg) out.addScaledVector(p.cg, 0.5 * tau * tau); }
      return out.add(p.B.pos);
    };
    // ----- re-entry: a glowing bow shock wrapped around the leading face, streaming into a long plasma wake -----
    // Lathe profile in units of the vessel's width; +y points along the direction of travel.
    const shockProf = [[0, 0.42], [0.3, 0.38], [0.62, 0.27], [0.86, 0.12], [1.02, -0.05], [1.14, -0.3], [1.18, -0.7], [1.12, -1.2], [0.98, -1.8], [0.78, -2.6], [0.55, -3.6], [0.32, -4.8], [0.14, -6.0], [0.0, -7.0]].map(([r, y]) => new THREE.Vector2(r, y));
    const NOISE2 = `float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }`;
    const plasmaMat = new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 }, uT: { value: 0 }, uWake: { value: 1 }, uCol: { value: new V3(1, 0.42, 0.2) }, uTail: { value: new V3(0.9, 0.25, 0.45) }, uBoost: { value: 1 } },
      vertexShader: `uniform float uWake; varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vY;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main(){ vUv = uv; vY = position.y; vec3 p = position; if (p.y < 0.0) p.y *= uWake;
          vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(p, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;
        #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `uniform float uI; uniform float uT; uniform vec3 uCol; uniform vec3 uTail; uniform float uBoost; varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vY;
        #include <logdepthbuf_pars_fragment>
        ${NOISE2}
        void main(){
        #include <logdepthbuf_fragment>
          float along = clamp((0.42 - vY) / 7.42, 0.0, 1.0);
          float edge = pow(1.0 - abs(dot(normalize(vN), vV)), 1.4);
          float ang = vUv.x * 6.2831853;
          // streaks peel off the shock and flow back, flickering
          float s = n2(vec2(vUv.x * 28.0, along * 16.0 - uT * 9.0)) * 0.6 + n2(vec2(vUv.x * 64.0, along * 40.0 - uT * 23.0)) * 0.4;
          float streak = smoothstep(0.25, 0.85, s);
          float cap = 1.0 - smoothstep(0.0, 0.07, along);
          float sheath = 1.0 - smoothstep(0.02, 0.32, along);
          float wake = (1.0 - smoothstep(0.1, 1.0, along)) * smoothstep(0.0, 0.08, along);
          vec3 hot = vec3(1.0, 0.93, 0.85);
          vec3 c = mix(hot, uCol, smoothstep(0.0, 0.12, along));
          c = mix(c, uTail, smoothstep(0.2, 0.9, along));
          float a = cap * 0.8 + edge * sheath * (0.55 + 0.9 * streak) + wake * (0.25 + 0.75 * streak) * (0.45 + 0.55 * edge);
          a *= uI * (0.85 + 0.15 * sin(uT * 61.0 + ang * 3.0));
          gl_FragColor = vec4(c * a * uBoost, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const plasma = new THREE.Mesh(new THREE.LatheGeometry(shockProf, 48), plasmaMat); plasma.visible = false; plasma.renderOrder = 21; plasma.frustumCulled = false;
    World.scene.add(plasma);
    // the shock layer lights up the hull it surrounds
    const plasmaLight = new THREE.PointLight(0xff7a3a, 0, 60, 2); World.scene.add(plasmaLight);
    // ----- transonic vapor cones: a condensation collar that flickers around the hull near Mach 1 in moist air -----
    const coneProf = [[1.0, 0.05], [1.02, -0.02], [1.1, -0.18], [1.28, -0.45], [1.55, -0.8], [1.85, -1.15]].map(([r, y]) => new THREE.Vector2(r, y));
    const vaporMat = new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 }, uT: { value: 0 }, uSun: { value: new V3(0, 1, 0) }, uSunCol: { value: new V3(1, 1, 1) }, uAmb: { value: new V3(0.5, 0.55, 0.62) }, uSeed: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vY;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main(){ vUv = uv; vY = position.y; vN = normalize((modelMatrix * vec4(normal, 0.0)).xyz); vec4 w = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w;
        #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `uniform float uI; uniform float uT; uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uAmb; uniform float uSeed; varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vY;
        #include <logdepthbuf_pars_fragment>
        ${NOISE2}
        void main(){
        #include <logdepthbuf_fragment>
          float along = clamp((0.05 - vY) / 1.2, 0.0, 1.0);
          float grazing = 1.0 - abs(dot(normalize(vN), vV));
          float mist = n2(vec2(vUv.x * 22.0 + uSeed, along * 5.0 - uT * 6.0)) * 0.65 + n2(vec2(vUv.x * 60.0 - uSeed, along * 14.0 - uT * 15.0)) * 0.35;
          float a = smoothstep(0.0, 0.035, along) * (1.0 - smoothstep(0.08, 0.75, along)) * (0.15 + 0.85 * pow(grazing, 2.0));
          a *= (0.35 + 0.65 * smoothstep(0.25, 0.8, mist)) * uI * 0.6;
          float lit = 0.55 + 0.45 * max(dot(normalize(vN), uSun), 0.0);
          vec3 c = uSunCol * lit + uAmb;
          gl_FragColor = vec4(c * a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, side: THREE.DoubleSide,
    });
    const coneGeo = new THREE.LatheGeometry(coneProf, 48);
    const cones = [0, 1].map(i => { const m = new THREE.Mesh(coneGeo, vaporMat.clone()); m.material.uniforms.uSeed.value = i * 37.0; m.visible = false; m.renderOrder = 22; m.frustumCulled = false; World.scene.add(m); return m; });
    // re-entry plasma tint by atmosphere: air glows orange-pink, CO2 yellow-orange, nitrogen-methane violet
    const PLASMA_COL = { earth: [[1, 0.45, 0.22], [1, 0.32, 0.55]], mars: [[1, 0.55, 0.2], [1, 0.4, 0.15]], venus: [[1, 0.6, 0.25], [1, 0.45, 0.2]], titan: [[0.85, 0.4, 1], [0.55, 0.3, 1]], jupiter: [[1, 0.7, 0.45], [0.8, 0.5, 1]], saturn: [[1, 0.7, 0.45], [0.8, 0.5, 1]] };
    // How far the hull reaches along a world direction, and across it, from its centre of mass.
    function extents(o, pr, dir) {
      const ax = new V3(0, 1, 0).applyQuaternion(o.q);
      const c = Math.abs(ax.dot(dir)), s = Math.sqrt(Math.max(0, 1 - c * c));
      return { fwd: c * pr.L * 0.5 + s * pr.r, side: s * pr.L * 0.5 + c * pr.r };
    }
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffb060, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); flash.visible = false; World.scene.add(flash);
    let flashT = 0, flashP = null, flashSize = 10;
    fx = {
      smoke(o, part, flame, P) {
        if (World.quality === 'low' && Math.random() > 0.6) return;
        const B = Bodies.byId[o.body];
        const wp = new V3(); flame.getWorldPosition(wp); // relative to camera
        const helio = wp.add(camHelio);
        const dir = new V3(0, -1, 0).applyQuaternion(flame.getWorldQuaternion(new Q4()));
        const solidF = P.eng.srb ? 1 : 0;
        const big = Math.max(P.r, 0.3);
        // puffs are laid down by distance travelled over the ground, evenly along the path, so a fast
        // rocket leaves a continuous column (worked out in the ground-fixed frame the smoke lives in)
        const here = Bodies.toBF(B, helio.clone().sub(B.pos).addScaledVector(dir, big * 2), Game.time, new V3());
        const ud = flame.userData, last = ud.lastSmokeB === B.id ? ud.lastSmoke : null, spacing = big * 4, pts = [];
        const gap = last ? last.distanceTo(here) : Infinity;
        if (gap > 600) pts.push(here);
        else if (gap >= spacing) { const n = Math.min(4, Math.floor(gap / spacing)); for (let k = 1; k <= n; k++) pts.push(last.clone().lerp(here, k / n)); }
        else if (Math.random() < 0.35) pts.push(here);
        if (pts.length) { ud.lastSmoke = here; ud.lastSmokeB = B.id; }
        const dirBF = Bodies.toBF(B, dir, Game.time, new V3());
        for (const q of pts) spawn({ B, air: true, life: 4 + Math.random() * 4 + solidF * 4, bf: q.clone().addScaledVector(dirBF, Math.random() * big * 4), vel: new V3().addScaledVector(dir, 10 + Math.random() * 15).add(new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(4)), s0: big * 2.2, s1: big * (10 + solidF * 10), c: solidF ? [0.92, 0.9, 0.86] : [0.8, 0.78, 0.76], a0: 0.35 + solidF * 0.3, fire: false });
        if (Math.random() < 0.5) spawn({ B, air: true, life: 0.35, pos: helio.clone().addScaledVector(dir, big * 1.2), vel: new V3().addScaledVector(dir, 40), s0: big * 2, s1: big * 3, c: [1, 0.6, 0.25], a0: 0.6, fire: true });
      },
      boom(helio, size, base, B) {
        flashT = 0.6; flashSize = size * 5;
        flashP = spawn({ B, base, life: 0.6, pos: helio, s0: 0, s1: 0, a0: 0, drag: 0 }); // carries the flash along with the debris
        for (let i = 0; i < 40; i++) { const d = new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(); spawn({ B, base, life: 1.5 + Math.random() * 2, pos: helio, vel: d.multiplyScalar(size * (2 + Math.random() * 6)), s0: size * 0.8, s1: size * 3, c: i % 3 ? [1, 0.55, 0.15] : [0.35, 0.33, 0.32], a0: 0.9, fire: i % 3 !== 0 }); }
      },
      plasma(o, group, I, e) {
        if (I < 0.02 || !e || e.vAir.lengthSq() < 1 || o.type === 'eva') { plasma.visible = false; plasmaLight.intensity = 0; return; }
        const pr = Phys.getProps(o), B = Bodies.byId[o.body];
        const dir = e.vAir.clone().normalize();
        const ex = extents(o, pr, dir);
        const ch = Phys.comW(o, pr, new V3()).add(B.pos);
        const lead = ch.clone().addScaledVector(dir, ex.fwd);
        const W = ex.side * 1.18 + 0.25;
        plasma.visible = true;
        const u = plasmaMat.uniforms, now = performance.now() / 1000;
        u.uI.value = Math.min(1, I * 1.3); u.uT.value = now;
        u.uWake.value = 0.35 + 1.4 * I + Math.min(1.5, ex.fwd / W);
        u.uBoost.value = Post.enabled ? 1.2 + 1.6 * I : 1;
        const pc = PLASMA_COL[B.id] || PLASMA_COL.earth; u.uCol.value.set(...pc[0]); u.uTail.value.set(...pc[1]);
        plasma.position.copy(lead).sub(camHelio);
        plasma.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir);
        plasma.scale.set(W, W, W);
        plasmaLight.position.copy(lead).addScaledVector(dir, W * 0.3).sub(camHelio);
        plasmaLight.color.setRGB(pc[0][0], pc[0][1] * 1.1, pc[0][2] * 1.2);
        plasmaLight.intensity = I * (Post.enabled ? 9 : 4) * (0.9 + 0.1 * Math.sin(now * 53)); plasmaLight.distance = W * 10 + pr.L * 2;
        if (Game.paused) return;
        // glowing ablation embers shed from the leading face; they lag the hull and slow down in the air
        const right = new V3(1, 0, 0); if (Math.abs(dir.x) > 0.9) right.set(0, 0, 1); right.cross(dir).normalize(); const up2 = dir.clone().cross(right);
        const nE = World.quality === 'low' ? Math.round(I * 2) : Math.round(I * 7 + Math.random());
        for (let k = 0; k < nE; k++) {
          const a = Math.random() * Math.PI * 2, rr = W * (0.55 + Math.random() * 0.45);
          const p = lead.clone().addScaledVector(right, Math.cos(a) * rr).addScaledVector(up2, Math.sin(a) * rr).addScaledVector(dir, -W * 0.3);
          const hot = Math.random();
          spawn({ B, air: true, life: 0.4 + Math.random() * 0.8, pos: p, vel: e.vAir.clone().multiplyScalar(0.55 + Math.random() * 0.4).addScaledVector(right, Math.cos(a) * 30).addScaledVector(up2, Math.sin(a) * 30), drag: 2.5,
            s0: W * (0.08 + 0.1 * hot), s1: W * 0.02, c: Post.enabled ? [3.2, 1.5 + hot, 0.5 + hot * 0.6] : [1, 0.6, 0.3], a0: 0.9, fire: true });
        }
        // a thin smoke trail of ablated shield material at the hottest part of the descent
        if (I > 0.45 && Math.random() < I * 0.7) spawn({ B, air: true, life: 3 + Math.random() * 3, pos: lead.clone().addScaledVector(dir, -W), vel: e.vAir.clone().multiplyScalar(0.25), drag: 1.5, s0: W * 0.6, s1: W * 3.5, c: [0.32, 0.29, 0.27], a0: 0.22 * I, fire: false });
      },
      // astronaut: cold-gas puffs from the firing jetpack nozzles, and dust kicked up by each footstep
      evaFx(o, group) {
        if (Game.paused) return;
        const u = group.userData, B = Bodies.byId[o.body];
        const _p = new V3(), _q = new Q4();
        if (o.thrusting && u.plumes) for (const pl of u.plumes) {
          if (!pl.visible || Math.random() > 0.55) continue;
          pl.getWorldPosition(_p); const dir = new V3(0, -1, 0).applyQuaternion(pl.getWorldQuaternion(_q));
          spawn({ B, anchor: o, life: 0.5 + Math.random() * 0.4, pos: _p.clone().add(camHelio), vel: dir.multiplyScalar(4 + Math.random() * 3).add(new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.6)), drag: 1.2, s0: 0.05, s1: 0.45, c: [0.88, 0.93, 1], a0: 0.3, fire: false });
        }
        if (!o.landed || !u.boots) { u.lastStep = null; return; }
        const step = Math.floor((o.walkPhase || 0) / Math.PI);
        if (u.lastStep == null) { u.lastStep = step; return; }
        if (step === u.lastStep || (o.walkSpeed || 0) < 0.3) { u.lastStep = step; return; }
        u.lastStep = step;
        // airless or thin-air worlds throw up dust; Earth's grass and oceans don't
        if (B.id === 'earth' || o.splashed || (B.atm && !B.atm.trace && B.atm.rho0 > 1)) return;
        const foot = u.boots[step & 1]; foot.getWorldPosition(_p); const at = _p.clone().add(camHelio);
        const up = o.r.clone().normalize(), col = new THREE.Color(B.color), air = B.atm && !B.atm.trace ? 0.6 : 0;
        const g = up.clone().multiplyScalar(-B.g);
        const kick = Math.sqrt(2 * B.g * 0.25), fwd = o.v.clone().sub(Bodies.surfVel(B, o.r, new V3())).normalize();
        for (let k = 0; k < 10; k++) {
          const side = new V3(Math.random() - 0.5, 0, Math.random() - 0.5).addScaledVector(up, -new V3(Math.random() - 0.5, 0, Math.random() - 0.5).dot(up));
          spawn({ B, air: true, life: Math.min(3, 2 * kick / B.g + 0.3), pos: at.clone().addScaledVector(up, 0.02), vel: up.clone().multiplyScalar(kick * (0.5 + Math.random() * 0.6)).addScaledVector(fwd, 0.6).addScaledVector(side, 1.2), g, drag: air,
            s0: 0.1, s1: 0.4 + air * 0.6, c: [Math.min(1, col.r * 1.15), Math.min(1, col.g * 1.12), Math.min(1, col.b * 1.1)], a0: 0.7, fire: false });
        }
      },
      vapor(o, e) {
        const B = Bodies.byId[o.body];
        let I = 0;
        if (e && B.id === 'earth' && o.type !== 'eva' && !Game.paused) {
          const sp = e.vAir.length(), alt = Math.max(0, e.alt);
          const mach = sp / (340 - Math.min(alt, 11000) * 0.0041);
          I = smooth(0.84, 0.95, mach) * (1 - smooth(1.04, 1.2, mach)) * (1 - smooth(6000, 16000, alt));
          const t = performance.now() / 1000;
          I *= 0.75 + 0.25 * Math.sin(t * 31) * Math.sin(t * 17.3);
        }
        if (I < 0.02) { cones[0].visible = cones[1].visible = false; return; }
        const pr = Phys.getProps(o);
        const dir = e.vAir.clone().normalize();
        const ex = extents(o, pr, dir);
        const ch = Phys.comW(o, pr, new V3()).add(B.pos).sub(camHelio);
        const sunW = B.pos.clone().negate().normalize();
        const day = smooth(-0.1, 0.2, o.r.clone().normalize().dot(sunW));
        // the collar forms where the flow speeds up over the shoulder, and again near the base
        [[0.3, 1.0, 1.0], [-0.6, 1.05, 0.45]].forEach(([at, sz, k], i) => {
          const m = cones[i], u = m.material.uniforms;
          m.visible = true;
          m.position.copy(ch).addScaledVector(dir, ex.fwd * at);
          m.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir);
          const W = ex.side * 1.08 * sz + 0.15;
          m.scale.set(W, W * 0.8, W);
          u.uI.value = I * k; u.uT.value = performance.now() / 1000; u.uSun.value.copy(sunW);
          const L = Post.enabled ? 1.5 : 0.9; u.uSunCol.value.set(L * day, L * day * 0.98, L * day * 0.95); u.uAmb.value.set(0.25 + 0.2 * day, 0.28 + 0.24 * day, 0.34 + 0.3 * day);
        });
      },
      update(dt, camH, sdt) {
        if (sdt == null) sdt = Game.paused ? 0 : dt;
        const pa = geo.attributes.position.array, sa = geo.attributes.size.array, aa = geo.attributes.alpha.array, ca = geo.attributes.color.array;
        for (let i = 0; i < N; i++) {
          const p = P[i];
          if (p.age >= p.life) { aa[i] = 0; continue; }
          if (sdt > 0) { p.age += sdt; if (p.g) p.vel.addScaledVector(p.g, sdt); p.pos.addScaledVector(p.vel, sdt); if (p.base && !p.B) p.pos.addScaledVector(p.base, sdt); p.vel.multiplyScalar(1 - Math.min(1, sdt * p.drag)); }
          const t = p.age / p.life;
          worldPos(p, _w);
          pa[i * 3] = _w.x - camH.x; pa[i * 3 + 1] = _w.y - camH.y; pa[i * 3 + 2] = _w.z - camH.z;
          sa[i] = lerp(p.s0, p.s1, Math.sqrt(t));
          aa[i] = p.a0 * (1 - t) * (p.fire ? 1 : smooth(0, 0.1, t));
          ca[i * 3] = p.c[0]; ca[i * 3 + 1] = p.c[1]; ca[i * 3 + 2] = p.c[2];
        }
        geo.attributes.position.needsUpdate = geo.attributes.size.needsUpdate = geo.attributes.alpha.needsUpdate = geo.attributes.color.needsUpdate = true;
        mat.uniforms.uScale.value = window.innerHeight / (2 * Math.tan(World.camera.fov * DEG / 2));
        if (flashT > 0 && flashP) { flashT -= dt; flash.visible = true; flash.position.copy(worldPos(flashP, _w)).sub(camH); flash.scale.setScalar(flashSize * (1 + (0.6 - flashT) * 2)); flash.material.opacity = Math.max(0, flashT / 0.6); } else flash.visible = false;
      },
      live() { return P.filter(p => p.age < p.life && p.a0 > 0).map(p => ({ pos: worldPos(p, new V3()), air: p.air, anchor: p.anchor ? p.anchor.id : null, B: p.B && p.B.id, age: p.age })); },
      clear() { P.forEach(p => p.age = p.life = 0); geo.attributes.alpha.array.fill(0); geo.attributes.alpha.needsUpdate = true; plasma.visible = false; plasmaLight.intensity = 0; cones.forEach(m => m.visible = false); flash.visible = false; },
    };
  }
  function explode(v) {
    if (!fx) return;
    const B = Bodies.byId[v.body];
    const h = v.r.clone().add(B.pos);
    if (h.distanceTo(camHelio) < 30000) { fx.boom(h, v.type === 'eva' ? 1 : Math.max(2, Phys.getProps(v).L * 0.4), v.v.clone().add(B.vel), B); Sound.fx.explode(); }
  }
  function explodeAt(v, p) {
    if (!fx) return;
    const B = Bodies.byId[v.body];
    const h = p.pos.clone().applyQuaternion(v.q).add(v.r).add(B.pos);
    fx.boom(h, Math.max(1, PARTS[p.pid].h), v.v.clone().add(B.vel), B); Sound.fx.explode();
  }

  // ---------- navball ----------
  function initNavball() {
    const scene = new THREE.Scene();
    const c = new THREE.OrthographicCamera(-1.05, 1.05, 1.05, -1.05, 0.1, 10); c.position.set(0, 0, 3); c.lookAt(0, 0, 0);
    const tex = PartMesh.canvasTex(1024, 512, (g, W, H) => {
      const sky = g.createLinearGradient(0, 0, 0, H / 2); sky.addColorStop(0, '#163a6b'); sky.addColorStop(1, '#3f86c9');
      g.fillStyle = sky; g.fillRect(0, 0, W, H / 2);
      const gr = g.createLinearGradient(0, H / 2, 0, H); gr.addColorStop(0, '#9a6232'); gr.addColorStop(1, '#4a2c16');
      g.fillStyle = gr; g.fillRect(0, H / 2, W, H / 2);
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
      g.lineWidth = 1.5; g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = 'bold 15px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let lat = -80; lat <= 80; lat += 10) {
        if (!lat) continue;
        const y = H / 2 - lat / 180 * H;
        g.strokeStyle = lat > 0 ? 'rgba(255,255,255,0.45)' : 'rgba(255,230,200,0.45)';
        for (let x = 0; x < W; x += W / 24) { g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.stroke(); if (lat % 30 === 0) g.fillText(Math.abs(lat), x + 26, y); }
      }
      for (let hd = 0; hd < 360; hd += 15) {
        const u = ((Math.PI - hd * DEG) / (2 * Math.PI) % 1 + 1) % 1, x = u * W;
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = hd % 90 === 0 ? 3 : 1;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
        if (hd % 30 === 0) { g.fillStyle = hd % 90 === 0 ? '#ffd23f' : 'rgba(255,255,255,0.9)'; g.font = (hd % 90 === 0 ? 'bold 26px' : 'bold 16px') + ' monospace'; const lab = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[hd] || String(hd); g.fillText(lab, x, H / 2 - 16); g.fillText(lab, x, H / 2 + 18); }
      }
    }, 'navball');
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ map: tex }));
    scene.add(ball);
    nav = { scene, cam: c, ball, ov: $('#navOverlay').getContext('2d') };
  }
  function navBasis(v) {
    const f = frameAt(v);
    const M = new THREE.Matrix3().set(f.N.x, f.N.y, f.N.z, f.U.x, f.U.y, f.U.z, f.E.x, f.E.y, f.E.z);
    const fwd = new V3(0, 1, 0).applyQuaternion(v.q), right = new V3(1, 0, 0).applyQuaternion(v.q), top = new V3(0, 0, -1).applyQuaternion(v.q);
    const fb = fwd.clone().applyMatrix3(M), rb = right.clone().applyMatrix3(M), tb = top.clone().applyMatrix3(M);
    const R = new THREE.Matrix4().set(rb.x, rb.y, rb.z, 0, tb.x, tb.y, tb.z, 0, fb.x, fb.y, fb.z, 0, 0, 0, 0, 1);
    return { M, R, f, fwd };
  }
  function renderNavball() {
    const v = av(); if (!v || !nav || map) return;
    const elN = $('#navball'); const r = elN.getBoundingClientRect();
    if (r.width < 10) return;
    const vv = v.type === 'eva' ? { q: World.camera.quaternion.clone().multiply(new Q4().setFromAxisAngle(new V3(1, 0, 0), -Math.PI / 2)), r: v.r, body: v.body } : v;
    const nb = navBasis(vv.q ? Object.assign({}, v, { q: vv.q }) : v);
    nav.ball.quaternion.setFromRotationMatrix(nb.R);
    const Rr = World.renderer, H = window.innerHeight;
    Rr.setScissorTest(true);
    Rr.setViewport(r.left, H - r.bottom, r.width, r.height); Rr.setScissor(r.left, H - r.bottom, r.width, r.height);
    Rr.clearDepth();
    Rr.render(nav.scene, nav.cam);
    Rr.setScissorTest(false); Rr.setViewport(0, 0, window.innerWidth, window.innerHeight);
    // overlay markers
    const cv = $('#navOverlay'); const k = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(r.width * k)) { cv.width = Math.round(r.width * k); cv.height = Math.round(r.height * k); }
    const g = nav.ov; g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, r.width, r.height);
    const cx = r.width / 2, cy = r.height / 2, R = r.width / 2 * 0.95;
    const toScreen = (w) => { const b = w.clone().applyMatrix3(nb.M).applyMatrix4(nb.R); return b.z > 0 ? [cx + b.x * R, cy - b.y * R] : null; };
    const e = v.lastEnv || Phys.env(v, Game.time);
    const vel = v.speedMode === 'orbit' ? v.v : v.speedMode === 'target' && Phys.targetPos(v) ? v.v.clone().sub(targetVel(v) || new V3()) : e.vAir;
    const mark = (w, col, kind) => {
      if (!w || w.lengthSq() < 1e-6) return;
      const s = toScreen(w.clone().normalize()); if (!s) return;
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2;
      g.beginPath(); g.arc(s[0], s[1], 7, 0, Math.PI * 2); g.stroke();
      if (kind === 'pro') { g.beginPath(); g.arc(s[0], s[1], 1.8, 0, 7); g.fill(); [[0, -1], [1, 0], [-1, 0]].forEach(([a, b]) => { g.beginPath(); g.moveTo(s[0] + a * 7, s[1] + b * 7); g.lineTo(s[0] + a * 12, s[1] + b * 12); g.stroke(); }); }
      else if (kind === 'retro') { g.beginPath(); g.moveTo(s[0] - 5, s[1] - 5); g.lineTo(s[0] + 5, s[1] + 5); g.moveTo(s[0] + 5, s[1] - 5); g.lineTo(s[0] - 5, s[1] + 5); g.stroke(); }
      else if (kind === 'node') { g.beginPath(); g.moveTo(s[0] - 9, s[1]); g.lineTo(s[0], s[1] - 9); g.lineTo(s[0] + 9, s[1]); g.lineTo(s[0], s[1] + 9); g.closePath(); g.stroke(); }
      else { g.beginPath(); g.arc(s[0], s[1], 2.5, 0, 7); g.fill(); }
    };
    if (vel.lengthSq() > 0.01) { mark(vel, '#d9f22c', 'pro'); mark(vel.clone().negate(), '#d9f22c', 'retro'); }
    if (v.type !== 'eva') {
      const h = new V3().crossVectors(v.r, v.v);
      mark(h, '#c86bff', 'n'); mark(h.clone().negate(), '#c86bff', 'n');
      const tp = Phys.targetPos(v); if (tp) mark(tp.sub(v.r), '#ff7ad9', 't');
      if (v.node && v.node.dvRem) mark(v.node.dvRem, '#3fb8ff', 'node');
    }
    // fixed aircraft symbol
    g.strokeStyle = '#ffb000'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 26, cy); g.lineTo(cx - 9, cy); g.lineTo(cx, cy + 8); g.lineTo(cx + 9, cy); g.lineTo(cx + 26, cy); g.stroke();
    g.beginPath(); g.arc(cx, cy, 2.5, 0, 7); g.fillStyle = '#ffb000'; g.fill();
    // heading readout
    const fw = nb.fwd, f = nb.f;
    const hd = (Math.atan2(fw.dot(f.E), fw.dot(f.N)) / DEG + 360) % 360, pt = Math.asin(clamp(fw.dot(f.U), -1, 1)) / DEG;
    $('#navHdg').textContent = `HDG ${String(Math.round(hd)).padStart(3, '0')}°  PITCH ${pt >= 0 ? '+' : ''}${Math.round(pt)}°`;
  }
  function targetVel(v) {
    if (!v.target) return null;
    if (v.target.body) { const T = Bodies.byId[v.target.body]; return T.vel.clone().sub(Bodies.byId[v.body].vel); }
    const o = Game.vessels.find(x => x.id === v.target.vessel); if (!o) return null;
    return o.v.clone().add(Bodies.byId[o.body].vel).sub(Bodies.byId[v.body].vel);
  }

  // ---------- mission log & situation ----------
  function updateLog(v) {
    if (v.type === 'flag') return;
    const B = Bodies.byId[v.body];
    const alt = v.r.length() - B.R;
    const L = v.log;
    const nearPad = B.id === 'earth' && Math.acos(clamp(Bodies.toBF(B, v.r, Game.time, new V3()).normalize().dot(Terrain.kscDir), -1, 1)) < 0.0025;
    if (!L.launched && v.type === 'ship' && (!v.landed || !nearPad) && alt > KSC.alt + 20) { L.launched = true; }
    L.maxAlt[B.id] = Math.max(L.maxAlt[B.id] || 0, alt);
    L.maxSunDist = Math.max(L.maxSunDist || 0, v.r.clone().add(B.pos).length());
    if (!v.landed && alt > (B.atmH || 0) && (B.atmH || alt > B.maxTerrain)) L.space[B.id] = true;
    if (!v.landed) {
      const el = Orbit.elements(v.r, v.v, B.GM);
      if (el.e < 1 && el.pe > B.R + Math.max(B.atmH, B.maxTerrain) && el.ap < B.soi) L.orbit[B.id] = true;
    }
    L.soi[B.id] = true;
    if (v.landed && !nearPad && v.type !== 'debris') L.land[B.id] = true;
    if (v.type === 'ship' && Vessel.crewCount(v) > 0) L.crewed = true;
    // situation and biome
    const bf = Bodies.toBF(B, v.r, Game.time, new V3());
    const ll = dirToLatLon(bf);
    const h = B.solid ? Terrain.height(B, bf.clone().normalize(), 50) : 0;
    v.situation = Science.situation(B, alt, v.landed && !v.splashed, v.splashed, nearPad);
    v.biome = B.solid ? Science.biome(B, ll.lat, ll.lon, h, v.splashed || (B.ocean && h < 0)) : '';
    v.lat = ll.lat; v.lon = ll.lon;
    if (v.speedModeAuto !== false) v.speedMode = (B.atmH ? alt > B.atmH * 0.5 : alt > B.R * 0.05) && !v.landed ? 'orbit' : 'surface';
    Game.checkMissions(L);
  }

  // ---------- science ----------
  function sciList(v) {
    const items = [];
    if (v.type === 'eva') {
      items.push({ key: 'eva', exp: 'eva', name: 'EVA Report', src: 'You' });
      items.push({ key: 'sample', exp: 'sample', name: 'Surface Sample', src: 'You' });
    } else {
      if (Vessel.crewCount(v) > 0) items.push({ key: 'crew', exp: 'crew', name: 'Crew Report', src: 'Crew' });
      const seen = {};
      for (const p of v.parts) { const P = PARTS[p.pid]; if (P.exp) items.push({ key: p.iid, exp: P.exp, name: P.name, src: P.name, part: p }); }
    }
    return items;
  }
  function currentSubject(v, exp) {
    const B = Bodies.byId[v.body];
    return { B, sit: v.situation, biome: v.biome, subj: Science.subjectId(exp, B, v.situation, v.biome), label: Science.subjectLabel(exp, B, v.situation, v.biome), cap: Science.cap(exp, B, v.situation) };
  }
  function runExp(v, it) {
    const e = EXPERIMENTS[it.exp];
    const s = currentSubject(v, it.exp);
    if (!Science.canRun(it.exp, s.B, s.sit)) { toast(Science.whyNot(it.exp, s.B, s.sit), 'warn'); return; }
    v.data = v.data || [];
    if (it.part && (it.part.spent || v.data.some(d => d.from === it.key))) { toast(it.part.spent ? 'This instrument is spent. Recover it to reuse it.' : 'This instrument already holds a result. Transmit or discard it first.', 'info'); return; }
    if (!it.part && v.data.some(d => d.subj === s.subj)) { toast('You already hold this result.', 'info'); return; }
    const text = Science.resultText(it.exp, s.B, s.sit, s.biome, v.r.length() - s.B.R);
    v.data.push({ exp: it.exp, subj: s.subj, label: s.label, text, cap: s.cap, from: it.key, size: e.size });
    if (e.single && it.part) it.part.ran = true;
    Sound.fx.science();
    renderSci();
  }
  function antenna(v) {
    let best = null;
    for (const p of v.parts) { const P = PARTS[p.pid]; if (P.ant && (!best || P.ant.range > best.range)) best = P.ant; }
    if (v.type === 'eva') best = { range: 5e5, rate: 1, ecPerMit: 0 };
    return best;
  }
  function earthDist(v) { const B = Bodies.byId[v.body]; return v.r.clone().add(B.pos).distanceTo(Bodies.byId.earth.pos) - Bodies.byId.earth.R; }
  function transmit(v, idx) {
    const d = v.data[idx]; const ant = antenna(v);
    if (!ant) { toast('No antenna or command part to transmit with.', 'warn'); return; }
    const dist = earthDist(v);
    if (dist > ant.range) { toast(`Out of range: ${fmtDist(dist)} from Earth, but the best antenna reaches ${fmtDist(ant.range)}. Fit a bigger antenna or recover the data.`, 'warn', 5000); return; }
    if (xmit) { toast('Already transmitting.', 'info'); return; }
    xmit = { v, d, ant, done: 0 };
    renderSci();
  }
  function stepXmit(v, dt) {
    const x = xmit;
    if (x.v.dead || !x.v.data.includes(x.d)) { xmit = null; return; }
    const need = x.ant.ecPerMit * x.ant.rate * dt;
    if (need > 0 && Phys.ecTotals(x.v).a < need) { if (!x.warned) { toast('Transmission paused: not enough electric charge.', 'warn'); x.warned = true; } return; }
    if (need > 0) Phys.ecChange(x.v, -need);
    x.done += x.ant.rate * dt;
    if (x.done >= x.d.size) {
      const amt = Science.value(Save.prog, x.d.subj, x.d.cap, EXPERIMENTS[x.d.exp].xmit);
      Science.bank(Save.prog, x.d.subj, amt);
      x.v.data.splice(x.v.data.indexOf(x.d), 1);
      const p = x.v.parts.find(p => p.iid === x.d.from); if (p && EXPERIMENTS[x.d.exp].single) p.spent = true;
      x.v.log.sci = true;
      toast(`Transmitted ${esc(x.d.label)}: +${fmtNum(amt, 1)} science`, 'good', 3500);
      Sound.fx.success();
      Game.checkMissions(x.v.log);
      xmit = null; Save.save();
    }
    if ($('#sciPanel').hidden === false) renderSci();
  }
  function renderSci() {
    const v = av(); if (!v) return;
    const box = $('#sciBody');
    const B = Bodies.byId[v.body];
    const items = sciList(v);
    v.data = v.data || [];
    let h = `<div class="sci-where">${esc(Science.subjectLabel('temp', B, v.situation, v.biome).replace('Temperature Scan ', '').replace(/^./, c => c.toUpperCase()))}</div>`;
    if (!items.length) h += '<p class="muted">No instruments on this vessel. Add experiments from the Science category in the Assembly Building.</p>';
    for (const it of items) {
      const s = currentSubject(v, it.exp);
      const ok = Science.canRun(it.exp, s.B, s.sit);
      const holding = it.part ? v.data.some(d => d.from === it.key) : v.data.some(d => d.subj === s.subj);
      const spent = it.part && it.part.spent;
      const rec = Science.value(Save.prog, s.subj, s.cap, 1), tx = rec * EXPERIMENTS[it.exp].xmit;
      const state = spent ? '<span class="tag">spent</span>' : holding ? '<span class="tag">holding data</span>' : ok ? `<span class="val">≈ ${fmtNum(rec, 1)} recovered · ${fmtNum(tx, 1)} sent</span>` : `<span class="no">${esc(Science.whyNot(it.exp, s.B, s.sit))}</span>`;
      h += `<div class="sci-row"><div><b>${esc(EXPERIMENTS[it.exp].name)}</b><small>${esc(it.src)}</small>${state}</div><button data-run="${esc(it.key)}" ${!ok || holding || spent ? 'disabled' : ''}>Run</button></div>`;
    }
    if (v.type === 'eva') h += `<div class="sci-row"><div><b>Plant a flag</b><small>Mark your visit</small></div><button data-flag ${v.landed ? '' : 'disabled'}>Plant</button></div>`;
    if (v.data.length) {
      h += '<h4>Collected results</h4>';
      const ant = antenna(v);
      v.data.forEach((d, i) => {
        const rec = Science.value(Save.prog, d.subj, d.cap, 1), tx = rec * EXPERIMENTS[d.exp].xmit;
        const sending = xmit && xmit.d === d;
        h += `<div class="sci-data"><b>${esc(d.label)}</b><p>${esc(d.text)}</p><div class="sci-act"><span>Recover: ${fmtNum(rec, 1)} · Transmit: ${fmtNum(tx, 1)}</span>${sending ? `<div class="bar"><i></i></div>` : `<button data-tx="${i}" ${ant ? '' : 'disabled'}>Transmit</button><button data-dis="${i}" class="ghost">Discard</button>`}</div></div>`;
      });
    }
    // Only rebuild when the content changes; rebuilding every HUD tick replaced the buttons
    // between press and release, so clicks never landed.
    if (box._h !== h) { box._h = h; box.innerHTML = h; }
    const bar = box.querySelector('.bar i');
    if (bar && xmit) bar.style.width = Math.round(xmit.done / xmit.d.size * 100) + '%';
    if (!box._bound) {
      box._bound = true;
      box.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        const cv = av(); if (!cv) return;
        if (b.dataset.run != null) { const it = sciList(cv).find(i => i.key === b.dataset.run); if (it) runExp(cv, it); }
        else if (b.dataset.tx != null) transmit(cv, +b.dataset.tx);
        else if (b.dataset.dis != null) { cv.data.splice(+b.dataset.dis, 1); renderSci(); }
        else if (b.hasAttribute('data-flag')) plantFlag(cv);
      });
    }
  }

  // ---------- HUD ----------
  function renderStagesFull() {
    const v = av(); const box = $('#fStages'); if (!box) return;
    box.innerHTML = '';
    if (!v || v.type !== 'ship') return;
    const pm = Vessel.pmap(v);
    for (let k = v.stages.length - 1; k >= v.stageIdx; k--) {
      const st = v.stages[k];
      const s = el('div', 'fst' + (k === v.stageIdx ? ' next' : ''));
      s.innerHTML = `<span class="n">${k + 1}</span>`;
      const counts = {};
      for (const uid of st) { const p = v.parts.find(p => p.uid === uid); if (!p) continue; const P = PARTS[p.pid]; const key = P.type; counts[key] = counts[key] || { n: 0, name: P.name, type: P.type }; counts[key].n++; }
      for (const k2 in counts) s.appendChild(el('span', 'ic t-' + counts[k2].type, `<i></i>${counts[k2].n > 1 ? counts[k2].n : ''}`)).title = counts[k2].name;
      box.appendChild(s);
    }
    if (v.stageIdx >= v.stages.length) box.appendChild(el('div', 'fst done', 'All stages used'));
  }
  function updateToggles() {
    const v = av(); if (!v) return;
    $('#tSAS').classList.toggle('on', !!v.sas); $('#tRCS').classList.toggle('on', !!v.rcs);
    $$('.sasb').forEach(b => b.classList.toggle('on', v.sas && v.sasMode === b.dataset.mode));
  }
  function bar(label, a, c, col, unit) {
    const f = c > 0 ? clamp(a / c, 0, 1) : 0;
    return `<div class="rbar"><label>${label}</label><div class="rb"><i style="width:${(f * 100).toFixed(1)}%;background:${col}"></i></div><span>${unit(a)}</span></div>`;
  }
  // ---------- 2D trajectory brief ----------
  // The orbit drawn in its own plane, with the vessel at the top moving right: the body, a translucent
  // band for its atmosphere up to the edge of space, Ap/Pe markers and the impact point if there is one.
  // Altitude is drawn on its own scale (the planet keeps a fixed size and the space around it shows
  // altitude), so a low orbit or a suborbital hop stays clearly readable. The zoom eases toward what the
  // trajectory needs instead of jumping, and the orbit plane is held steady while it's ill-defined
  // (going straight up), so the picture doesn't flip.
  const traj = { span: 0, key: '', n: null, t: 0 };
  function drawTrajectory(v) {
    const c = $('#fTrajC'); if (!c || c.offsetParent === null) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = c.clientWidth, H = c.clientHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const B = Bodies.byId[v.body], mu = B.GM, R = B.R, atm = B.atmH || 0;
    const r = v.r.clone(), vel = v.landed ? new V3() : v.v.clone(), rl = r.length(), alt = rl - R;
    const u = r.clone().normalize();
    // orbit plane: the angular momentum, kept from the last frame when it is too small to trust
    const key = v.id + ':' + v.body;
    if (traj.key !== key) { traj.key = key; traj.span = 0; traj.n = null; }
    let hv = r.clone().cross(vel);
    const hOk = hv.length() > rl * vel.length() * 0.03 && vel.lengthSq() > 1;
    if (hOk) traj.n = hv.clone().normalize();
    let hn = traj.n ? traj.n.clone().addScaledVector(u, -traj.n.dot(u)) : null;
    if (!hn || hn.lengthSq() < 1e-6) hn = u.clone().cross(Math.abs(u.y) < 0.9 ? new V3(0, 1, 0) : new V3(1, 0, 0));
    hn.normalize();
    const w = hn.clone().cross(u).normalize();
    // orbit shape
    const h2 = r.clone().cross(vel).lengthSq(), p = h2 / mu;
    const ev = vel.clone().cross(r.clone().cross(vel)).divideScalar(mu).sub(u), e = ev.length();
    const e1 = e > 1e-6 ? ev.clone().normalize() : u.clone(), e2 = hn.clone().cross(e1);
    const rLim = isFinite(B.soi) ? B.soi : Math.max(rl * 3, R * 20);
    const ap = e < 1 ? p / (1 - e) : Infinity, pe = p / (1 + e); // apsis radii
    const closed = ap < rLim;
    const flying = !v.landed && h2 > 1;
    // how much altitude the view needs, eased toward over about a third of a second
    let want;
    if (!flying) want = Math.max(atm * 1.4, alt * 1.5, R * 0.08);
    else if (closed) want = Math.max(ap - R, alt, atm * 1.3) * 1.1;
    else want = Math.min(Math.max(alt * 2.2, atm * 1.3, R * 0.5), rLim - R);
    want = Math.max(want, R * 0.02, 1000);
    const now = performance.now() / 1000, dt = traj.t ? Math.min(0.5, now - traj.t) : 1; traj.t = now;
    traj.span = traj.span > 0 ? Math.exp(lerp(Math.log(traj.span), Math.log(want), 1 - Math.exp(-dt * 3))) : want;
    const span = traj.span;
    // screen mapping: the planet a fixed fraction of the panel, altitude spread over the rest
    const cx = W / 2, cy = H / 2, Rmax = Math.min(W, H) * 0.46;
    const pr = Rmax * clamp(R / (R + span), 0.3, 0.6);
    const rad = rr => pr + (Rmax - pr) * (rr - R) / span;
    const S = P => { const ang = Math.atan2(P.dot(w), P.dot(u)), q = rad(P.length()); return [cx + Math.sin(ang) * q, cy - Math.cos(ang) * q]; };
    // atmosphere band and its edge
    if (atm > 0) {
      const ar = Math.min(rad(R + atm), Rmax * 1.2), sc = B.sky || (B.id === 'earth' ? [0.42, 0.62, 0.95] : [0.6, 0.6, 0.65]);
      const col = sc.map(x => Math.round(x * 255)).join(',');
      const gr = g.createRadialGradient(cx, cy, pr, cx, cy, Math.max(pr + 1, ar));
      gr.addColorStop(0, `rgba(${col},0.45)`); gr.addColorStop(1, `rgba(${col},0.08)`);
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, Math.max(pr + 1, ar), 0, Math.PI * 2); g.fill();
      g.setLineDash([3, 3]); g.strokeStyle = 'rgba(160,200,255,0.75)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, Math.max(pr + 1, ar), 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      if (ar - pr > 6) { g.fillStyle = 'rgba(170,205,255,0.85)'; g.font = '9.5px ' + getComputedStyle(document.body).getPropertyValue('--f-mono'); g.textAlign = 'right'; g.fillText((B.id === 'earth' ? 'edge of space ' : 'air ends ') + fmtDist(atm), W - 4, H - 5); }
    }
    // the body
    const bc = new THREE.Color(B.color || '#888');
    const pg = g.createRadialGradient(cx - pr * 0.35, cy - pr * 0.35, pr * 0.1, cx, cy, pr);
    pg.addColorStop(0, '#' + bc.clone().lerp(new THREE.Color(1, 1, 1), 0.25).getHexString()); pg.addColorStop(1, '#' + bc.clone().multiplyScalar(0.45).getHexString());
    g.fillStyle = pg; g.beginPath(); g.arc(cx, cy, pr, 0, Math.PI * 2); g.fill();
    // the path, clipped to the panel's reach; the part under the ground isn't drawn
    if (flying) {
      g.strokeStyle = e < 1 && pe > R + atm ? '#4fd1ff' : e >= 1 ? '#b9a8ff' : '#ffb43c'; g.lineWidth = 1.6; g.beginPath();
      // stepped along the eccentric (or hyperbolic) anomaly, which spaces points evenly even on a
      // nearly straight-up path, where an even split of angles would miss it altogether
      const reach = Math.min(R + span * 1.15, rLim), A = Math.abs(p / (1 - e * e)), Bm = A * Math.sqrt(Math.abs(1 - e * e));
      const Fmax = e > 1 ? Math.acosh(clamp((reach / A + 1) / e, 1, 1e9)) : 0;
      let pen = false;
      for (let i = 0; i <= 360; i++) {
        let P;
        if (e < 1) { const E = -Math.PI + 2 * Math.PI * i / 360; P = e1.clone().multiplyScalar(A * (Math.cos(E) - e)).addScaledVector(e2, Bm * Math.sin(E)); }
        else { const F = -Fmax + 2 * Fmax * i / 360; P = e1.clone().multiplyScalar(A * (e - Math.cosh(F))).addScaledVector(e2, Bm * Math.sinh(F)); }
        const rr = P.length();
        if (!(rr > R) || rr > reach || !isFinite(rr)) { pen = false; continue; }
        const [x, y] = S(P);
        if (pen) g.lineTo(x, y); else { g.moveTo(x, y); pen = true; }
      }
      g.stroke();
    }
    // markers
    const mono = getComputedStyle(document.body).getPropertyValue('--f-mono');
    const mark = (P, label, col) => { const [x, y] = S(P); g.fillStyle = col; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); g.font = '10px ' + mono; g.textAlign = x > cx ? 'left' : 'right'; g.fillText(label, x + (x > cx ? 5 : -5), y + 3); };
    if (flying) {
      if (closed && ap - R <= span * 1.15) mark(e1.clone().multiplyScalar(-ap), 'Ap ' + fmtDist(ap - R), '#9fe0ff');
      if (pe > R) mark(e1.clone().multiplyScalar(pe), 'Pe ' + fmtDist(pe - R), '#9fe0ff');
      else if (e > 1e-6) {
        // impact: the next crossing of the surface along the direction of travel
        const cth = clamp((p / R - 1) / e, -1, 1), thv = Math.atan2(r.dot(e2), r.dot(e1));
        let best = null;
        for (const th of [Math.acos(cth), -Math.acos(cth)]) { const d = ((th - thv) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); if (isFinite(d) && (!best || d < best.d)) best = { th, d }; }
        if (best) {
          const [x, y] = S(e1.clone().multiplyScalar(R * Math.cos(best.th)).addScaledVector(e2, R * Math.sin(best.th)));
          g.strokeStyle = '#ff5f4f'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y + 4); g.moveTo(x + 4, y - 4); g.lineTo(x - 4, y + 4); g.stroke();
        }
      }
    }
    // the vessel: a bright dot with a short arrow along its motion
    const [vx, vy] = S(r);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(vx, vy, 3.5, 0, Math.PI * 2); g.fill();
    if (flying && vel.lengthSq() > 1) {
      // the vessel sits at the top, so along-track motion points right and climbing points up
      const d = vel.clone().normalize(), ax = d.dot(w), ay = -d.dot(u), l = Math.hypot(ax, ay) || 1;
      g.strokeStyle = '#ffffff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(vx, vy); g.lineTo(vx + ax / l * 14, vy + ay / l * 14); g.stroke();
    }
    $('#fTrajNote').textContent = v.landed ? (v.splashed ? 'splashed down' : 'landed') + ' · ' + B.name : e >= 1 ? 'escaping ' + B.name : pe <= R + atm ? (pe <= R ? 'will hit the surface' : 'dips into the air') : 'orbiting ' + B.name;
  }

  function updateHUD() {
    const v = av(); if (!v) return;
    drawTrajectory(v);
    const B = Bodies.byId[v.body];
    const alt = v.r.length() - B.R;
    const e = v.lastEnv || Phys.env(v, Game.time);
    $('#fUT').textContent = fmtUT(Game.time);
    const agl = v.agl != null && v.aglValid && B.solid ? Math.max(0, v.agl) : null;
    $('#fAlt').textContent = fmtDist(Game.altMode === 'agl' && agl != null ? agl : alt);
    $('#fAltMode').textContent = Game.altMode === 'agl' && agl != null ? 'Above ground' : 'Altitude';
    const spMode = v.speedMode || 'surface';
    let sp = spMode === 'orbit' ? v.v.length() : e.vAir.length();
    if (spMode === 'target' && targetVel(v)) sp = v.v.clone().sub(targetVel(v)).length();
    $('#fSpd').textContent = fmtSpeed(sp);
    $('#fSpdMode').textContent = { surface: 'Surface', orbit: 'Orbit', target: 'Target' }[spMode];
    $('#fVs').textContent = `↕ ${fmtSpeed(v.v.clone().sub(e.sv).dot(e.up))}`;
    $('#fSit').textContent = `${Science.subjectLabel('temp', B, v.situation || 'spaceLow', v.biome).replace('Temperature Scan ', '')}`;
    // orbit
    const el2 = Orbit.elements(v.r, v.v, B.GM);
    const apT = el2.e < 1 ? el2.tAp : null;
    $('#fOrbit').innerHTML = v.landed ? `<div class="kv"><span>Status</span><b>${v.splashed ? 'Splashed down' : 'Landed'} on ${B.name}</b></div>` : `
      <div class="kv"><span>Apoapsis</span><b>${el2.e < 1 && el2.ap < B.soi ? fmtDist(el2.ap - B.R) : 'escape'}</b><em>${apT != null && el2.ap < B.soi ? 'in ' + fmtTime(apT, true) : ''}</em></div>
      <div class="kv"><span>Periapsis</span><b class="${el2.pe - B.R < Math.max(B.atmH, 0) ? 'warn' : ''}">${fmtDist(el2.pe - B.R)}</b><em>${el2.tPe > 0 ? 'in ' + fmtTime(el2.tPe, true) : ''}</em></div>
      <div class="kv"><span>Inclination</span><b>${fmtNum(el2.inc / DEG, 1)}°</b><span>Period</span><b>${isFinite(el2.period) && el2.ap < B.soi ? fmtTime(el2.period, true) : '—'}</b></div>
      <div class="kv orbit-state">${orbitState(v, B, el2)}</div>`;
    // resources
    let rs = '';
    if (v.type === 'ship') {
      const tot = {}, cap = {};
      for (const p of v.parts) for (const k in p.cap) { tot[k] = (tot[k] || 0) + (p.res[k] || 0); cap[k] = (cap[k] || 0) + p.cap[k]; }
      for (const k of Object.keys(cap)) {
        if (k === 'EC') continue;
        rs += bar(RES[k].short, tot[k], cap[k], RES[k].color, a => a < 0.01 ? fmtNum(a * 1000, 1) + ' kg' : fmtNum(a, 2) + ' t');
      }
      if (cap.EC) rs += bar('EC', tot.EC, cap.EC, RES.EC.color, a => fmtInt(a) + ` <small>${(v.ecGen || 0) - (v.ecUse || 0) >= 0 ? '+' : ''}${fmtNum((v.ecGen || 0) - (v.ecUse || 0), 2)}/s</small>`);
      const hp = v.hotPart ? PARTS[v.hotPart.pid] : null;
      rs += bar('Heat', v.hottest || 0, 1, (v.hottest || 0) > 0.8 ? '#ff5a3c' : (v.hottest || 0) > 0.55 ? '#ffb13c' : '#79c2ff', a => hp ? `${Math.round(a * 100)}% <small>${esc(hp.name.split(' ').slice(-2).join(' '))}</small>` : '0%');
      if (v.parts.some(p => p.ablator > 0 || PARTS[p.pid].ablator)) { const sh = v.parts.filter(p => PARTS[p.pid].ablator); const a = sh.reduce((s, p) => s + p.ablator, 0), c = sh.reduce((s, p) => s + PARTS[p.pid].ablator, 0); rs += bar('Shield', a, c, '#c58b5a', x => fmtInt(x)); }
      const pr = Phys.getProps(v);
      let maxF = 0; for (const p of v.parts) { const P = PARTS[p.pid]; if (P.eng && p.active && !p.flamedOut) maxF += P.eng.thr * p.limit; }
      const g = B.GM / v.r.lengthSq();
      rs += `<div class="kv"><span>Mass</span><b>${fmtMass(pr.m)}</b><span>TWR</span><b>${fmtNum(maxF / (pr.m * g), 2)}</b><span>G</span><b>${fmtNum(v.gforce || 0, 1)}</b></div>`;
    } else if (v.type === 'eva') {
      rs += `<div class="kv"><span>Jetpack</span><b>${v.jetpack ? 'ON' : 'OFF'}</b><span>Mode</span><b>${v.grab ? 'holding on' : v.landed ? 'walking' : 'floating'}</b></div>`;
    }
    $('#fRes').innerHTML = rs;
    $('#fThr').style.height = (v.throttle * 100) + '%';
    $('#fThrTxt').textContent = Math.round(v.throttle * 100) + '%';
    // warnings
    const warn = [];
    if (v.noControlReason && v.type === 'ship') warn.push(v.noControlReason);
    if ((v.hottest || 0) > 0.8) warn.push(`Overheating: ${PARTS[v.hotPart.pid].name} at ${Math.round(v.hotPart.temp)} K`);
    if (v.uncontrolled) warn.push('Lost the command part: this wreck cannot be controlled. Revert or return to the space center.');
    $('#fWarn').innerHTML = warn.map(w => `<div>${esc(w)}</div>`).join('');
    // buttons
    const earthLanded = v.landed && B.id === 'earth' && v.type === 'ship';
    $('#bRecover').hidden = !earthLanded;
    $('#bEVA').hidden = !(v.type === 'ship' && Vessel.crewCount(v) > 0);
    $('#bUndock').hidden = !(v.type === 'ship' && v.links.some(l => l[2] === 'dock'));
    $('#bBoard').hidden = v.type !== 'eva';
    $('#bGrab').hidden = v.type !== 'eva';
    $('#evaHelp').hidden = v.type !== 'eva';
    $('#fBottom').hidden = v.type === 'eva';
    $('#mapUI').style.setProperty('--fbl', $('#fBL').offsetHeight + 'px');
    updateToggles();
    // missions tracker
    const act = Object.keys(Save.prog.missions.active).map(id => MissionById[id]).filter(Boolean).slice(0, 3);
    $('#fMissions').innerHTML = act.map(m => { const st = Save.prog.missions.active[m.id]; return `<div class="fm"><b>${esc(m.title)}</b>${m.obj.map((o, i) => `<div class="${st.done[i] || Missions.check(o, v.log) ? 'ok' : ''}">${st.done[i] || Missions.check(o, v.log) ? '✓' : '○'} ${esc(o.text)}</div>`).join('')}</div>`; }).join('');
    if (!$('#sciPanel').hidden) renderSci();
  }
  function orbitState(v, B, el) {
    if (v.landed) return '';
    if (el.e >= 1 || el.ap > B.soi) return `<span class="pill">Escaping ${B.name}</span>`;
    const safe = B.R + Math.max(B.atmH, B.maxTerrain);
    if (el.pe > safe) return `<span class="pill good">Stable orbit</span>`;
    if (B.atmH && el.pe > B.R) return `<span class="pill warn">Suborbital: periapsis inside the atmosphere</span>`;
    return `<span class="pill warn">Suborbital: will hit the ${B.solid ? 'surface' : 'depths'}</span>`;
  }
  function toggleMap() {
    map = !map;
    $('#mapUI').hidden = !map;
    $('#fhudMain').classList.toggle('mapmode', map);
    if (map) { MapView.enter('flight', av()); Tutorial.show('map'); } else MapView.exit();
  }
  function recover() {
    const v = av(); if (!v) return;
    let sci = 0;
    for (const d of v.data || []) { const amt = Science.value(Save.prog, d.subj, d.cap, 1); Science.bank(Save.prog, d.subj, amt); sci += amt; }
    // recovered instruments that held data count as science banked
    v.log.recovered = true;
    if (sci > 0) v.log.sci = true;
    const crew = [];
    for (const p of v.parts) for (const n of p.crew || []) { const c = Save.prog.crew.find(c => c.name === n); if (c) { c.status = 'ready'; c.flights++; crew.push(n); } }
    Game.checkMissions(v.log, true);
    Save.prog.stats.recovered++;
    v.dead = true;
    Sound.fx.success();
    const B = Bodies.byId.earth;
    Modal.open('Vessel recovered', `<p><b>${esc(v.name)}</b> was recovered ${v.splashed ? 'from the ocean' : 'on land'}.</p><ul><li>Science from returned data: <b>+${fmtNum(sci, 1)}</b></li>${crew.length ? `<li>Crew home safe: ${crew.map(esc).join(', ')}</li>` : ''}<li>Highest altitude: ${fmtDist(v.log.maxAlt.earth || 0)}</li></ul>`, [{ label: 'Return to Space Center', primary: true, fn: () => Game.goto('center') }]);
    Save.save();
  }
  function bindHUD() {
    $$('#fWarp button[data-w]').forEach(b => b.onclick = () => setWarp(+b.dataset.w));
    $('#fWarpStop').onclick = () => setWarp(0);
    $('#fAltMode').onclick = () => { Game.altMode = Game.altMode === 'agl' ? 'asl' : 'agl'; };
    $('#fSpdMode').onclick = () => { const v = av(); if (!v) return; v.speedModeAuto = false; v.speedMode = { surface: 'orbit', orbit: v.target ? 'target' : 'surface', target: 'surface' }[v.speedMode || 'surface']; };
    $$('.sasb').forEach(b => b.onclick = () => { const v = av(); if (!v || v.type !== 'ship') return; v.sas = true; v.sasMode = b.dataset.mode; v.sasHold = null; updateToggles(); });
    $('#tSAS').onclick = () => { const v = av(); if (v && v.type === 'ship') { v.sas = !v.sas; v.sasHold = null; updateToggles(); } };
    $('#tRCS').onclick = () => { const v = av(); if (v && v.type === 'ship') { v.rcs = !v.rcs; updateToggles(); } };
    $('#tDeploy').onclick = () => { const v = av(); if (v && v.type === 'ship') toggleDeploy(v); };
    $('#bStage').onclick = doStage;
    $('#bMap').onclick = toggleMap;
    $('#bSci').onclick = () => { const p = $('#sciPanel'); p.hidden = !p.hidden; $('#flight').classList.toggle('sci-open', !p.hidden); if (!p.hidden) renderSci(); };
    $('#sciClose').onclick = () => { $('#sciPanel').hidden = true; $('#flight').classList.remove('sci-open'); };
    $('#bRecover').onclick = recover;
    $('#bUndock').onclick = () => { const v = av(); const made = Phys.undock(v, Game.time); made.forEach(m => Game.vessels.push(m)); rebuildVisual(v); renderStagesFull(); toast('Undocked', 'info'); };
    $('#bBoard').onclick = () => { const v = av(); if (v && v.type === 'eva') board(v); };
    $('#bGrab').onclick = () => { const v = av(); if (v && v.type === 'eva') grab(v); };
    $('#bEVA').onclick = () => {
      const v = av(); if (!v) return;
      const crew = []; v.parts.forEach(p => (p.crew || []).forEach(n => crew.push(n)));
      if (crew.length === 1) { startEVA(crew[0]); return; }
      Modal.open('Who goes outside?', crew.map(n => `<button class="wide" data-eva="${esc(n)}">${esc(n)}</button>`).join(''), [{ label: 'Cancel' }]);
      $$('[data-eva]').forEach(b => b.onclick = () => { Modal.close(); startEVA(b.dataset.eva); });
    };
    $('#bQS').onclick = () => Game.quickSave();
    $('#bThrUp').onclick = () => { const v = av(); if (v) v.throttle = 1; };
    $('#bThrDn').onclick = () => { const v = av(); if (v) v.throttle = 0; };
    const tg = $('#fThrGauge');
    const setThr = (ev) => { const r = tg.getBoundingClientRect(); const v = av(); if (v && v.type === 'ship') v.throttle = clamp(1 - (ev.clientY - r.top) / r.height, 0, 1); };
    tg.addEventListener('pointerdown', ev => { setThr(ev); tg.setPointerCapture(ev.pointerId); tg.onpointermove = setThr; });
    tg.addEventListener('pointerup', () => { tg.onpointermove = null; });
  }
  return {
    start, stop, update, key, mouseDown, mouseMove, mouseUp, wheel, bindHUD, setWarp, warpTo, setActive, toggleMap,
    get active() { return active; }, get map() { return map; }, get camHelio() { return camHelio; }, get warpIdx() { return warpIdx; },
    loaded, rebuildVisual, renderStagesFull, frameAt, WARP, cam, clearFx: () => { if (fx) fx.clear(); }, fxLive: () => fx ? fx.live() : [],
  };
})();
