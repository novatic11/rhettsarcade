'use strict';
// ---------- Map view: orbits, trajectories, encounters, maneuver planning ----------
const MapView = (function () {
  let scene, camera, light, mode = 'flight', inited = false;
  const bodyMesh = {}, orbitLine = {};
  const camHelio = new V3();
  const cam = { yaw: 0.5, pitch: 0.35, dist: 5e6, distT: 5e6, focus: null };
  let trajLines = [], vesselMarks = {}, labels = [], labelPool = [], pred = null, nodePred = null, predT = 0;
  let vessel = null;
  const PCOL = [0x4fd1ff, 0xffa64f, 0xff5cd6, 0x8dff6a];

  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 1e15);
    light = new THREE.PointLight(0xffffff, 1.4, 0, 0); scene.add(light);
    scene.add(new THREE.AmbientLight(0x404a5a, 0.55));
    const stars = new THREE.Mesh(new THREE.SphereGeometry(1e6, 32, 16), new THREE.MeshBasicMaterial({ color: 0x3a3a3a, side: THREE.BackSide, depthWrite: false, depthTest: false }));
    stars.renderOrder = -1000; stars.rotation.x = 60 * DEG; stars.frustumCulled = false; scene.add(stars);
    new THREE.TextureLoader().load('textures/2k_stars_milky_way.jpg', t => { t.encoding = THREE.sRGBEncoding; stars.material.map = t; stars.material.needsUpdate = true; });
    for (const b of Bodies.list) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(b.R, 40, 20), b.type === 'star' ? new THREE.MeshBasicMaterial({ color: new THREE.Color(b.light || 0xffd27a) }) : new THREE.MeshLambertMaterial({ color: new THREE.Color(b.color) }));
      if (b.shape) m.scale.set(b.shape[0], b.shape[2], b.shape[1]);
      const tilt = new THREE.Group(); tilt.quaternion.copy(b.tiltQ); tilt.add(m);
      if (b.rings) { const rg = new THREE.RingGeometry(b.rings.inner * 100, b.rings.outer * 100, 96); const rm = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xcdbb94, transparent: true, opacity: b.rings.faint ? b.rings.faint * 0.5 : 0.55, side: THREE.DoubleSide, depthWrite: false })); rm.rotation.x = -Math.PI / 2; tilt.add(rm); }
      scene.add(tilt);
      bodyMesh[b.id] = { tilt, mesh: m, tex: false };
      if (b.parent) {
        const pts = Bodies.orbitPoints(b, b.e > 0.2 ? 512 : 256);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(b.color).lerp(new THREE.Color(0x8899aa), 0.4), transparent: true, opacity: 0.55, depthWrite: false }));
        ln.frustumCulled = false; scene.add(ln); orbitLine[b.id] = ln;
      }
    }
    bindUI();
    inited = true;
  }
  function enter(m, v) {
    if (!inited) init();
    mode = m; vessel = v || null;
    $('#mapUI').hidden = false;
    $('#nodePanel').hidden = m !== 'flight';
    if (v) { cam.focus = { vessel: v.id }; const B = Bodies.byId[v.body]; cam.distT = cam.dist = Math.max(B.R * 4, v.r.length() * 3); }
    else if (!cam.focus) { cam.focus = { body: 'earth' }; cam.dist = cam.distT = Bodies.byId.earth.R * 30; }
    predT = 0;
    renderNodePanel();
  }
  function exit() { $('#mapUI').hidden = true; clearLabels(); }
  function focusPos(out) {
    const f = cam.focus;
    if (f && f.vessel != null) { const v = Game.vessels.find(x => x.id === f.vessel); if (v) return out.copy(v.r).add(Bodies.byId[v.body].pos); cam.focus = { body: 'earth' }; }
    return out.copy(Bodies.byId[(cam.focus && cam.focus.body) || 'earth'].pos);
  }
  function focusBody() { const f = cam.focus; if (f && f.vessel != null) { const v = Game.vessels.find(x => x.id === f.vessel); return v ? Bodies.byId[v.body] : Bodies.byId.earth; } return Bodies.byId[f.body]; }

  // ---------- per-frame ----------
  function update(dt, v) {
    vessel = v || null;
    cam.dist = Math.exp(lerp(Math.log(cam.dist), Math.log(cam.distT), Math.min(1, dt * 8)));
    const target = focusPos(new V3());
    const fb = focusBody();
    const up = fb.axis.clone();
    const ref = new V3(1, 0, 0);
    const cp = Math.cos(cam.pitch);
    const off = new V3(Math.cos(cam.yaw) * cp, Math.sin(cam.pitch), Math.sin(cam.yaw) * cp).multiplyScalar(cam.dist);
    camHelio.copy(target).add(off);
    camera.position.set(0, 0, 0); camera.up.set(0, 1, 0);
    camera.lookAt(off.clone().negate());
    camera.aspect = window.innerWidth / window.innerHeight; camera.near = Math.max(1, cam.dist * 0.0005); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    // bodies
    const pxRad = window.innerHeight / (camera.fov * DEG);
    for (const b of Bodies.list) {
      const bm = bodyMesh[b.id];
      bm.tilt.position.copy(b.pos).sub(camHelio);
      bm.mesh.rotation.y = b.rot || 0;
      const d = bm.tilt.position.length();
      const px = b.R / Math.max(d, 1) * pxRad;
      if (!bm.tex && px > 4) { bm.tex = 'loading'; TexStore.request(b, (e) => { const src = e.sampler && e.sampler.canvas; if (src && b.type !== 'star') { const t = new THREE.CanvasTexture(src); t.encoding = THREE.sRGBEncoding; bm.mesh.material.map = t; bm.mesh.material.color.set(0xffffff); bm.mesh.material.needsUpdate = true; } else if (src) { bm.mesh.material.map = new THREE.CanvasTexture(src); bm.mesh.material.needsUpdate = true; } bm.tex = true; }); }
      if (orbitLine[b.id]) {
        const ln = orbitLine[b.id];
        ln.position.copy(b.parent.pos).sub(camHelio);
        // hide moon orbits when zoomed far out
        const dp = ln.position.length();
        ln.visible = !b.fixedPos && (b.a / Math.max(dp, 1) * pxRad > 18 || (b.parent.type === 'star' && b.a / Math.max(dp, 1) * pxRad > 3));
        ln.material.opacity = b.id === (fb && fb.id) ? 0.9 : 0.45;
      }
    }
    light.position.copy(Bodies.starOf(fb || Bodies.byId.sun).pos).sub(camHelio);
    // trajectory prediction
    predT -= dt;
    if (vessel && !vessel.landed && predT <= 0 && vessel.type !== 'flag') {
      predT = 0.35;
      const B = Bodies.byId[vessel.body];
      const tgt = vessel.target && vessel.target.body ? Bodies.byId[vessel.target.body] : null;
      pred = Orbit.predict(B, vessel.r, vessel.v, Game.time, { target: tgt, maxPatches: 3 });
      nodePred = vessel.node ? predictNode(vessel, vessel.node, tgt) : null;
      buildTraj();
      if (mode === 'flight') renderNodePanel(true);
    }
    if (vessel && vessel.landed) { clearTraj(); pred = null; }
    positionTraj();
    updateLabels();
  }
  function clearTraj() { trajLines.forEach(l => { scene.remove(l.obj); l.obj.geometry.dispose(); }); trajLines = []; }
  function lineFrom(pts, color, dashed) {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; });
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const mat = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 1, gapSize: 1, transparent: true, opacity: 0.9, depthWrite: false }) : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false });
    const l = new THREE.Line(geo, mat); l.frustumCulled = false; l.renderOrder = 30;
    if (dashed) { l.computeLineDistances(); }
    return l;
  }
  function buildTraj() {
    clearTraj();
    const add = (pr, dashed, offset) => {
      if (!pr) return;
      pr.patches.forEach((p, k) => {
        const B = p.body;
        // draw closed ellipse for full orbits
        let pts = p.pts;
        if (p.end === 'orbit' && p.el.e < 1 && p.el.ap < B.soi) pts = Orbit.conicPoints(p.el, 256, B.soi);
        const scaleDash = dashed ? Math.max(B.R * 0.08, (p.el.a > 0 ? p.el.a : B.R) * 0.02) : 0;
        const l = lineFrom(pts, dashed ? 0x63d7ff : PCOL[(k + offset) % PCOL.length], dashed);
        if (dashed) { l.material.dashSize = scaleDash; l.material.gapSize = scaleDash * 0.7; }
        scene.add(l);
        trajLines.push({ obj: l, body: B });
      });
    };
    add(pred, false, 0);
    add(nodePred, true, 1);
  }
  function positionTraj() { for (const t of trajLines) t.obj.position.copy(t.body.pos).sub(camHelio); }
  function predictNode(v, n, tgt) {
    const B = Bodies.byId[v.body];
    const r = new V3(), vv = new V3();
    Orbit.propagate(v.r, v.v, B.GM, Math.max(0, n.t - Game.time), r, vv);
    const bs = Orbit.basis(r, vv);
    const dv = bs.pro.multiplyScalar(n.pro).add(bs.nrm.multiplyScalar(n.nrm)).add(bs.rad.multiplyScalar(n.rad));
    if (!n.burning) n.dvRem = dv.clone();
    n.rN = r.clone();
    return Orbit.predict(B, r, vv.clone().add(dv), n.t, { target: tgt, maxPatches: 3 });
  }

  // ---------- labels ----------
  function clearLabels() { labelPool.forEach(l => l.hidden = true); }
  function getLabel(i) {
    if (!labelPool[i]) { const d = el('div', 'mlabel'); $('#mapLabels').appendChild(d); labelPool[i] = d; d.addEventListener('click', ev => { ev.stopPropagation(); if (d._onclick) d._onclick(); }); d.addEventListener('dblclick', ev => { ev.stopPropagation(); if (d._ondbl) d._ondbl(); }); }
    return labelPool[i];
  }
  function project(helio) { const p = helio.clone().sub(camHelio).applyMatrix4(camera.matrixWorldInverse); if (p.z > 0) return null; p.applyMatrix4(camera.projectionMatrix); return [(p.x * 0.5 + 0.5) * window.innerWidth, (-p.y * 0.5 + 0.5) * window.innerHeight]; }
  function updateLabels() {
    let i = 0;
    const put = (helio, html, cls, click, dbl) => {
      const s = project(helio); if (!s) return;
      if (s[0] < -50 || s[0] > window.innerWidth + 50 || s[1] < -20 || s[1] > window.innerHeight + 20) return;
      const L = getLabel(i++);
      L.hidden = false; const cn = 'mlabel ' + (cls || ''); if (L.className !== cn) L.className = cn; if (L._html !== html) { L._html = html; L.innerHTML = html; }
      L.style.transform = `translate(${Math.round(s[0])}px, ${Math.round(s[1])}px)`;
      L._onclick = click; L._ondbl = dbl;
    };
    const fb = focusBody();
    const pxRad = window.innerHeight / (camera.fov * DEG);
    for (const b of Bodies.list) {
      // show a body if its orbit is visible at this zoom, or it is the focus/its relatives
      // other star systems only label their planets when the camera is out there (otherwise they pile up on the star)
      const S = Bodies.starOf(b), sysOK = b.type === 'star' || S === Bodies.starOf(fb) || S.pos.distanceTo(camHelio) < 3e12;
      const rel = sysOK && (b === fb || b.parent === fb || b === fb.parent || b.type === 'star' || (b.type === 'planet' && b.parent === fb.parent) || (b.parent && b.parent.type !== 'star' && b.a / Math.max(1, b.parent.pos.distanceTo(camHelio)) * pxRad > 18) || ((b.type === 'dwarf' || b.type === 'candidate' || b.type === 'planet') && cam.dist > 2e9));
      if (!rel) continue;
      const tgt = vessel && vessel.target && vessel.target.body === b.id;
      put(b.pos, `<i style="background:${b.color}"></i><span>${b.name}</span>`, 'body' + (tgt ? ' tgt' : '') + (b === fb ? ' focus' : ''), () => showInfo(b), () => focus({ body: b.id }));
    }
    for (const o of Game.vessels) {
      if (o.dead || o.type === 'debris' && !(vessel && o.id === vessel.id)) continue;
      const B = Bodies.byId[o.body];
      const h = o.r.clone().add(B.pos);
      put(h, `<i class="ves ${o.type}"></i><span>${esc(o.name)}</span>`, 'ves' + (vessel && o.id === vessel.id ? ' me' : ''), () => showVesselInfo(o), () => focus({ vessel: o.id }));
    }
    // apsides, encounters, node
    const markPatch = (pr, isNode) => {
      if (!pr) return;
      pr.patches.forEach((p, k) => {
        const B = p.body, el = p.el;
        const t0 = p.t0;
        if (el.e < 1 && el.ap < B.soi) {
          const ap = Orbit.conicPoints(el, 2, B.soi);
          const P = el.ev.clone().normalize();
          if (el.e > 0.001) put(B.pos.clone().addScaledVector(P, -el.ap), `<b>Ap</b> ${fmtDist(el.ap - B.R)}${k === 0 && !isNode ? ` <em>${fmtTime(el.tAp, true)}</em>` : ''}`, 'apsis');
        }
        if (el.e > 0.001 && (el.tPe > 0 || el.e < 1)) {
          const P = el.ev.clone().normalize();
          const low = el.pe < B.R + B.atmH;
          put(B.pos.clone().addScaledVector(P, el.pe), `<b>Pe</b> ${fmtDist(el.pe - B.R)}${k === 0 && !isNode ? ` <em>${fmtTime(el.tPe, true)}</em>` : ''}${low && B.solid && el.pe < B.R ? ' <em class="bad">impact</em>' : low ? ' <em class="warn">in atmosphere</em>' : ''}`, 'apsis' + (low ? ' warn' : ''));
        }
        if (p.end === 'soi-enter' && pr.patches[k + 1]) { const nb = pr.patches[k + 1].body; const last = p.pts[p.pts.length - 1]; put(B.pos.clone().add(last), `<b>${nb.name} encounter</b> in ${fmtTime(p.t1 - Game.time, true)}<br>Pe ${fmtDist(pr.patches[k + 1].el.pe - nb.R)}`, 'enc'); }
        if (p.end === 'soi-exit') { const last = p.pts[p.pts.length - 1]; put(B.pos.clone().add(last), `Leaves ${B.name}`, 'enc'); }
        if (p.end === 'impact') { const last = p.pts[p.pts.length - 1]; put(B.pos.clone().add(last), `<b>Impact</b> in ${fmtTime(p.t1 - Game.time, true)}`, 'enc bad'); }
      });
      if (pr.closest && vessel && vessel.target && vessel.target.body) {
        const T = Bodies.byId[vessel.target.body];
        const c = pr.closest;
        const tp = Bodies.absPos(T, c.t, new V3());
        put(tp, `Closest approach<br><b>${fmtDist(c.inside ? c.dist - T.R : c.dist)}</b> in ${fmtTime(c.t - Game.time, true)}`, 'enc tgt');
      }
    };
    markPatch(pred, false);
    markPatch(nodePred, true);
    if (vessel && vessel.node && vessel.node.rN) put(vessel.node.rN.clone().add(Bodies.byId[vessel.body].pos), `<b>Maneuver</b> ${fmtNum(vessel.node.dvRem ? vessel.node.dvRem.length() : 0, 1)} m/s<br>in ${fmtTime(vessel.node.t - Game.time, true)}`, 'node');
    for (; i < labelPool.length; i++) labelPool[i].hidden = true;
  }
  function focus(f) {
    cam.focus = f;
    const b = f.body ? Bodies.byId[f.body] : null;
    if (b) cam.distT = b.type === 'star' ? (b.id === 'sun' ? 6e11 : b.children.reduce((a, c) => Math.max(a, c.a), 0) * 2.6) : Math.max(b.R * 4, b.children.length ? b.children.reduce((a, c) => Math.max(a, c.a), 0) * 2.4 : b.R * 6);
    else { const v = Game.vessels.find(x => x.id === f.vessel); if (v) cam.distT = Math.max(Bodies.byId[v.body].R * 3, v.r.length() * 2.5); }
  }
  // ---------- info panel ----------
  function showInfo(b) {
    const box = $('#mapInfo'); box.hidden = false;
    const canTarget = vessel && mode === 'flight' && b.id !== vessel.body && b.id !== 'sun';
    const kinds = { star: 'Star', planet: 'Planet', moon: 'Moon of ' + (b.parent && b.parent.name), dwarf: 'Dwarf planet (IAU recognised)', candidate: 'Dwarf-planet candidate (not IAU recognised)' };
    box.innerHTML = `<div class="mi-h"><b>${b.name}</b><button class="x" id="miClose">×</button></div><div class="mi-sub">${kinds[b.type]}</div>
      <p>${esc(b.fact)}</p>${b.mapNote ? `<p class="muted">Surface map: ${b.mapNote}.</p>` : ''}
      <div class="kv"><span>Radius</span><b>${fmtDist(b.R)}</b><span>Gravity</span><b>${fmtNum(b.g, b.g < 1 ? 3 : 2)} m/s²</b></div>
      <div class="kv"><span>Atmosphere</span><b>${b.atm ? (b.atm.trace ? 'trace' : fmtDist(b.atm.h) + ' high') : 'none'}</b><span>Surface</span><b>${b.solid ? 'solid' : b.type === 'star' ? 'plasma' : 'none (gas)'}</b></div>
      ${b.parent ? `<div class="kv"><span>Orbit</span><b>${fmtDist(b.a * (1 - b.e))} – ${fmtDist(b.a * (1 + b.e))}</b><span>Period</span><b>${fmtTime(b.period, true)}</b></div><div class="kv"><span>Eccentricity</span><b>${b.e.toFixed(3)}</b><span>Inclination</span><b>${fmtNum(b.inc / DEG, 1)}°</b></div><div class="kv"><span>Sphere of influence</span><b>${fmtDist(b.soi)}</b></div>` : ''}
      <div class="mi-btns"><button id="miFocus">Focus</button>${canTarget ? `<button id="miTarget">${vessel.target && vessel.target.body === b.id ? 'Clear target' : 'Set as target'}</button>` : ''}</div>`;
    $('#miClose').onclick = () => box.hidden = true;
    $('#miFocus').onclick = () => focus({ body: b.id });
    const tb = $('#miTarget'); if (tb) tb.onclick = () => { vessel.target = vessel.target && vessel.target.body === b.id ? null : { body: b.id }; predT = 0; showInfo(b); renderNodePanel(); };
  }
  function showVesselInfo(o) {
    const box = $('#mapInfo'); box.hidden = false;
    const B = Bodies.byId[o.body];
    const el2 = o.landed ? null : Orbit.elements(o.r, o.v, B.GM);
    const canTarget = vessel && mode === 'flight' && o.id !== vessel.id;
    box.innerHTML = `<div class="mi-h"><b>${esc(o.name)}</b><button class="x" id="miClose">×</button></div><div class="mi-sub">${o.type === 'eva' ? 'Astronaut' : o.type === 'flag' ? 'Flag' : o.type === 'debris' ? 'Debris' : 'Vessel'} · ${B.name}</div>
      ${el2 ? `<div class="kv"><span>Ap</span><b>${el2.ap < B.soi ? fmtDist(el2.ap - B.R) : 'escape'}</b><span>Pe</span><b>${fmtDist(el2.pe - B.R)}</b></div>` : `<p>${o.landed ? 'Landed' : ''}</p>`}
      <div class="mi-btns"><button id="miFocus">Focus</button>${canTarget ? `<button id="miTarget">${vessel.target && vessel.target.vessel === o.id ? 'Clear target' : 'Set as target'}</button>` : ''}${mode === 'tracking' && o.type !== 'flag' ? `<button id="miFly" class="primary">Fly</button>` : ''}</div>`;
    $('#miClose').onclick = () => box.hidden = true;
    $('#miFocus').onclick = () => focus({ vessel: o.id });
    const tb = $('#miTarget'); if (tb) tb.onclick = () => { vessel.target = vessel.target && vessel.target.vessel === o.id ? null : { vessel: o.id }; showVesselInfo(o); };
    const fb = $('#miFly'); if (fb) fb.onclick = () => Game.flyVessel(o.id);
  }

  // ---------- maneuver planner ----------
  function renderNodePanel(light) {
    if (mode !== 'flight') return;
    const box = $('#nodeBody'); const v = vessel;
    if (!v || v.type !== 'ship') { box._key = null; box.innerHTML = '<p class="muted">Board a vessel to plan maneuvers.</p>'; return; }
    if (v.landed) { box._key = null; box.innerHTML = '<p class="muted">Launch first. Maneuvers are planned from orbit or a trajectory.</p>'; return; }
    const B = Bodies.byId[v.body];
    const n = v.node;
    // Periodic refreshes keep the buttons in place and only update the live numbers;
    // rebuilding the buttons made them impossible to click.
    const key = n ? ['node', v.id, n.pro, n.nrm, n.rad, !!n.auto, n.t].join('|') : ['plan', v.id, v.target && v.target.body, B.id].join('|');
    if (light && n && document.activeElement && box.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    if (!n) {
      const tgt = v.target && v.target.body ? Bodies.byId[v.target.body] : null;
      if (light && box._key === key) return;
      box._key = key;
      box.innerHTML = `<div class="np-grid">
        <button data-np="ap">Node at apoapsis</button><button data-np="pe">Node at periapsis</button>
        <button data-np="circAp">Circularize at Ap</button><button data-np="circPe">Circularize at Pe</button>
        <button data-np="soon">Node in 2 min</button>
        ${B.parent && B.parent.type !== 'star' ? `<button data-np="home">Return to ${B.parent.name}</button>` : ''}
        ${tgt && tgt.type !== 'star' ? `<button data-np="xfer" class="primary">Plan transfer to ${tgt.name}</button>` : ''}
      </div>${tgt && tgt.type === 'star' ? `<p class="muted">${tgt.name} is too far away for a transfer orbit. Hold <b>TGT</b> on the navball and burn toward it, watch the closest-approach marker on your trajectory, then coast with the purple warp speeds.</p>` : tgt ? '' : '<p class="muted">Tip: click a planet or moon label and choose “Set as target” to unlock the transfer planner.</p>'}<div id="npMsg"></div>`;
      $$('[data-np]', box).forEach(b => b.onclick = () => planBasic(v, b.dataset.np));
      return;
    }
    const pr = Phys.getProps(v);
    let maxF = 0; for (const p of v.parts) { const P = PARTS[p.pid]; if (P.eng && p.active) maxF += P.eng.thr * p.limit; }
    const dvT = n.dvRem ? n.dvRem.length() : Math.hypot(n.pro, n.nrm, n.rad);
    const burn = maxF > 0 ? dvT * pr.m / maxF : Infinity;
    let res = '';
    if (nodePred && nodePred.patches.length) {
      const p0 = nodePred.patches[0], el = p0.el;
      res = el.e < 1 && el.ap < B.soi ? `Ap ${fmtDist(el.ap - B.R)} · Pe ${fmtDist(el.pe - B.R)}` : `Escapes ${B.name}`;
      const enc = nodePred.patches.find((p, i) => i > 0 && p.body !== B && p.body !== B.parent);
      if (enc) res += `<br><b>${enc.body.name} encounter</b> · Pe ${fmtDist(enc.el.pe - enc.body.R)}`;
      if (nodePred.closest && v.target && v.target.body) res += `<br>Closest approach to ${Bodies.byId[v.target.body].name}: ${fmtDist(nodePred.closest.inside ? nodePred.closest.dist - Bodies.byId[v.target.body].R : nodePred.closest.dist)}`;
    }
    const row = (k, label, col) => `<div class="np-row"><span style="color:${col}">${label}</span><button data-d="${k}:-100">−100</button><button data-d="${k}:-10">−10</button><button data-d="${k}:-1">−1</button><input data-k="${k}" type="number" step="1" value="${fmtNum(n[k], 1).replace(/,/g, '')}"><button data-d="${k}:1">+1</button><button data-d="${k}:10">+10</button><button data-d="${k}:100">+100</button></div>`;
    const html = `<div class="np-top"><b>Maneuver in ${fmtTime(n.t - Game.time)}</b><span>Δv ${fmtNum(dvT, 1)} m/s · burn ${isFinite(burn) ? fmtTime(burn, true) : 'no engines'}</span></div>
      ${row('pro', 'Prograde', '#d9f22c')}${row('nrm', 'Normal', '#c86bff')}${row('rad', 'Radial', '#4fd1ff')}
      <div class="np-row"><span>Time</span><button data-t="-600">−10m</button><button data-t="-60">−1m</button><button data-t="-10">−10s</button><button data-t="10">+10s</button><button data-t="60">+1m</button><button data-t="600">+10m</button></div>
      <div class="np-res">${res || '…'}</div>
      <div class="np-btns"><button id="npWarp">Warp to node</button><button id="npAuto" class="${n.auto ? 'on' : ''}">${n.auto ? 'Auto-burn ON' : 'Auto-burn'}</button><button id="npAim">Point at node</button><button id="npDel" class="danger">Delete</button></div>`;
    if (light && box._key === key && box.querySelector('.np-top')) {
      const t = document.createElement('div'); t.innerHTML = html;
      box.querySelector('.np-top').innerHTML = t.querySelector('.np-top').innerHTML;
      box.querySelector('.np-res').innerHTML = t.querySelector('.np-res').innerHTML;
      return;
    }
    box._key = key; box.innerHTML = html;
    $$('[data-d]', box).forEach(b => b.onclick = () => { const [k, d] = b.dataset.d.split(':'); n[k] += +d; n.burning = false; predT = 0; renderNodePanel(); });
    $$('[data-t]', box).forEach(b => b.onclick = () => { n.t = Math.max(Game.time + 5, n.t + +b.dataset.t); predT = 0; renderNodePanel(); });
    $$('input[data-k]', box).forEach(inp => inp.onchange = () => { n[inp.dataset.k] = +inp.value || 0; predT = 0; });
    $('#npWarp').onclick = () => { const lead = isFinite(burn) ? burn / 2 + 30 : 30; if (n.t - lead > Game.time + 1) Flight.warpTo(n.t - lead); };
    $('#npAuto').onclick = () => { n.auto = !n.auto; if (n.auto) { v.sas = true; v.sasMode = 'node'; } else v.throttle = 0; renderNodePanel(); };
    $('#npAim').onclick = () => { v.sas = true; v.sasMode = 'node'; v.sasHold = null; };
    $('#npDel').onclick = () => { v.node = null; nodePred = null; predT = 0; if (v.sasMode === 'node') v.sasMode = 'stab'; renderNodePanel(); };
  }
  function planBasic(v, kind) {
    const B = Bodies.byId[v.body];
    const el = Orbit.elements(v.r, v.v, B.GM);
    const node = { t: Game.time + 120, pro: 0, nrm: 0, rad: 0 };
    const stateAt = (t) => { const r = new V3(), vv = new V3(); Orbit.propagate(v.r, v.v, B.GM, t - Game.time, r, vv); return { r, v: vv }; };
    if (kind === 'ap' || kind === 'circAp') { if (!(el.e < 1 && el.ap < B.soi)) { msg('No apoapsis: you are escaping.'); return; } node.t = Game.time + el.tAp; }
    if (kind === 'pe' || kind === 'circPe') node.t = Game.time + Math.max(10, el.tPe);
    if (kind === 'circAp' || kind === 'circPe') {
      const s = stateAt(node.t);
      const rr = s.r.length();
      const vc = Math.sqrt(B.GM / rr);
      const bs = Orbit.basis(s.r, s.v);
      const vh = s.v.clone().addScaledVector(bs.rad, -s.v.dot(bs.rad));
      node.pro = vc - vh.length(); node.rad = -s.v.dot(bs.rad);
    }
    if (kind === 'home') { const res = planReturn(v); if (!res) { msg('Could not find a return trajectory from here. Try from a lower, circular orbit.'); return; } Object.assign(node, res); }
    if (kind === 'xfer') {
      msg('Planning transfer…');
      setTimeout(() => {
        const res = planTransfer(v, Bodies.byId[v.target.body]);
        if (!res) return;
        if (res.wait) { msg(`Next transfer window to ${Bodies.byId[v.target.body].name} opens in <b>${fmtTime(res.wait, true)}</b>. <button id="npWW">Warp to window</button>`); $('#npWW').onclick = () => Flight.warpTo(Game.time + res.wait); return; }
        if (res.fail) { msg(res.fail); return; }
        v.node = Object.assign({ t: 0, pro: 0, nrm: 0, rad: 0 }, res); predT = 0; renderNodePanel();
      }, 30);
      return;
    }
    v.node = node; predT = 0; renderNodePanel();
  }
  function msg(h) { const m = $('#npMsg'); if (m) m.innerHTML = h; }
  // score a candidate: closest approach (or periapsis error) after a prograde burn
  function evalBurn(v, t, dv, T, wantPe, nrm) {
    const B = Bodies.byId[v.body];
    const r = new V3(), vv = new V3();
    Orbit.propagate(v.r, v.v, B.GM, t - Game.time, r, vv);
    const bs = Orbit.basis(r, vv);
    const pr = Orbit.predict(B, r, vv.clone().addScaledVector(bs.pro, dv).addScaledVector(bs.nrm, nrm || 0), t, { target: T, maxPatches: 3, samples: 220 });
    if (!pr.closest) return { score: Infinity };
    const inside = pr.closest.inside;
    const d = inside ? Math.abs(pr.closest.dist - (wantPe || T.R + Math.max(T.atmH, T.maxTerrain) + T.R * 0.15)) : pr.closest.dist + T.soi;
    return { score: d, pr };
  }
  function planTransfer(v, T) {
    const B = Bodies.byId[v.body];
    const el = Orbit.elements(v.r, v.v, B.GM);
    if (!(el.e < 1 && el.ap < B.soi)) return { fail: 'Get into a stable orbit first, then plan the transfer.' };
    const r1 = v.r.length();
    if (T.parent === B) {
      const r2 = T.a;
      const dv0 = Math.sqrt(B.GM / r1) * (Math.sqrt(2 * r2 / (r1 + r2)) - 1);
      return searchBurn(v, T, dv0, el.period);
    }
    if (B.parent && T.parent === B.parent) {
      const P = B.parent;
      const ra = B.a, rb = T.a;
      const phaseReq = Math.PI * (1 - Math.pow((ra + rb) / (2 * rb), 1.5));
      const angB = Math.atan2(-Bodies.relPos(B, Game.time).z, Bodies.relPos(B, Game.time).x);
      const angT = Math.atan2(-Bodies.relPos(T, Game.time).z, Bodies.relPos(T, Game.time).x);
      let phase = ((angT - angB) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
      const rel = B.n - T.n;
      let wait = (phase - phaseReq) / rel;
      const syn = Math.abs(2 * Math.PI / rel);
      wait = ((wait % syn) + syn) % syn;
      if (wait > Math.max(el.period * 1.5, syn * 0.02)) return { wait: Math.max(0, wait - el.period) };
      const vinf = Math.abs(Math.sqrt(P.GM / ra) * (Math.sqrt(2 * rb / (ra + rb)) - 1));
      const dv0 = Math.sqrt(vinf * vinf + 2 * B.GM / r1) - Math.sqrt(B.GM / r1);
      return searchBurn(v, T, dv0, el.period);
    }
    if (T === B.parent) return planReturn(v) || { fail: 'Could not find a return trajectory.' };
    return { fail: `The planner handles moons of ${B.name} and worlds that share its parent. For ${T.name}, first travel to ${T.parent ? T.parent.name : 'the Sun'}\'s neighbourhood.` };
  }
  function searchBurn(v, T, dv0, period) {
    let best = { score: Infinity };
    const N = 48;
    for (let i = 0; i < N; i++) {
      const t = Game.time + 60 + period * i / N;
      for (const f of [0.97, 1.0, 1.03]) { const r = evalBurn(v, t, dv0 * f, T); if (r.score < best.score) best = Object.assign(r, { t, dv: dv0 * f }); }
    }
    if (!isFinite(best.score)) return { fail: `No encounter with ${T.name} found. Make your orbit more circular and in the same plane (equatorial), then try again.` };
    // refine
    // refine time, prograde and (for inclined targets) normal components
    let { t, dv } = best, nr = 0; best.nr = 0;
    let dt = period / N, ddv = dv0 * 0.03, dn = dv0 * 0.12;
    for (let it = 0; it < 24; it++) {
      for (const [a, b, c] of [[dt, 0, 0], [-dt, 0, 0], [0, ddv, 0], [0, -ddv, 0], [0, 0, dn], [0, 0, -dn]]) { const r = evalBurn(v, t + a, dv + b, T, null, nr + c); if (r.score < best.score) { best = Object.assign(r, { t: t + a, dv: dv + b, nr: nr + c }); } }
      t = best.t; dv = best.dv; nr = best.nr; dt *= 0.65; ddv *= 0.65; dn *= 0.65;
    }
    return { t: best.t, pro: best.dv, nrm: best.nr, rad: 0 };
  }
  function planReturn(v) {
    const B = Bodies.byId[v.body], P = B.parent;
    if (!P || P.type === 'star') return null;
    const el = Orbit.elements(v.r, v.v, B.GM);
    if (!(el.e < 1)) return null;
    const r1 = v.r.length();
    const vEsc = Math.sqrt(2 * B.GM / r1) - Math.sqrt(B.GM / r1);
    const wantPe = P.R + (P.atmH ? P.atmH * 0.45 : 30000);
    let best = { score: Infinity };
    for (let i = 0; i < 48; i++) {
      const t = Game.time + 60 + el.period * i / 48;
      for (const f of [1.05, 1.15, 1.3]) {
        const r = evalBurn(v, t, vEsc * f, P, wantPe);
        if (r.pr) { const pp = r.pr.patches.find(p => p.body === P); if (pp) { const s = Math.abs(pp.el.pe - wantPe); if (s < best.score) best = { score: s, t, dv: vEsc * f }; } }
      }
    }
    if (!isFinite(best.score)) return null;
    let { t, dv } = best, dt = el.period / 48, ddv = vEsc * 0.05;
    for (let it = 0; it < 16; it++) {
      for (const [a, b] of [[dt, 0], [-dt, 0], [0, ddv], [0, -ddv]]) { const r = evalBurn(v, t + a, dv + b, P, wantPe); if (r.pr) { const pp = r.pr.patches.find(p => p.body === P); if (pp) { const s = Math.abs(pp.el.pe - wantPe); if (s < best.score) best = { score: s, t: t + a, dv: dv + b }; } } }
      t = best.t; dv = best.dv; dt *= 0.6; ddv *= 0.6;
    }
    return { t: best.t, pro: best.dv, nrm: 0, rad: 0 };
  }

  // ---------- input ----------
  function bindUI() {
    const c = World.renderer.domElement;
    let d = null;
    c.addEventListener('pointerdown', e => { if (!isOpen()) return; d = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch }; });
    window.addEventListener('pointermove', e => { if (!d) return; cam.yaw = d.yaw + (e.clientX - d.x) * 0.006; cam.pitch = clamp(d.pitch + (e.clientY - d.y) * 0.006, -1.5, 1.5); });
    window.addEventListener('pointerup', () => d = null);
    c.addEventListener('wheel', e => { if (!isOpen()) return; const fb = focusBody(); cam.distT = clamp(cam.distT * Math.pow(1.0018, e.deltaY), fb.R * 1.3, 6e14); }, { passive: true });
    $('#mapFocusMe').onclick = () => { if (vessel) focus({ vessel: vessel.id }); };
    $('#mapFocusBody').onclick = () => { const fb = focusBody(); focus({ body: fb.id }); };
    $('#mapFocusUp').onclick = () => { const fb = focusBody(); if (fb.parent) focus({ body: fb.parent.id }); };
  }
  function isOpen() { return !$('#mapUI').hidden; }
  function render() {
    const R = World.renderer;
    R.setViewport(0, 0, window.innerWidth, window.innerHeight);
    R.clear();
    R.render(scene, camera);
  }
  function key(e) {
    if (!isOpen()) return false;
    if (e.code === 'Tab') { e.preventDefault(); const fb = focusBody(); const list = [vessel ? { vessel: vessel.id } : null, { body: fb.id }, fb.parent ? { body: fb.parent.id } : null].filter(Boolean); const i = list.findIndex(x => JSON.stringify(x) === JSON.stringify(cam.focus)); focus(list[(i + 1) % list.length]); return true; }
    return false;
  }
  return { init, enter, exit, update, render, key, focus, showInfo, renderNodePanel, get camHelio() { return camHelio; } };
})();
