'use strict';
// ---------- Modal dialogs ----------
const Modal = {
  open(title, html, buttons) {
    const m = $('#modal');
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = html;
    const f = $('#modalFoot'); f.innerHTML = '';
    (buttons || [{ label: 'OK' }]).forEach(b => {
      const btn = el('button', b.primary ? 'primary' : '', esc(b.label));
      btn.onclick = () => { if (!b.keep) Modal.close(); if (b.fn) b.fn(); };
      f.appendChild(btn);
    });
    m.hidden = false;
  },
  close() { $('#modal').hidden = true; },
  isOpen() { return !$('#modal').hidden; },
};

// ---------- First-visit tips ----------
const TIPS = {
  center: ['Welcome to the Meridian Space Program', 'This is your space center. Click a building (or use the list on the left).<br><b>Assembly Building</b>: design rockets. <b>Mission Control</b>: your first mission is waiting. <b>Research Center</b>: spend science on new parts. <b>Tracking Station</b>: the Solar System and your spacecraft.'],
  editor: ['Building a rocket', 'Drag parts from the list onto the <b>blueprint</b> (the blue grid). Start with a probe core or capsule: everything else must snap onto a part already on the rocket.<br>• Drop on the top or bottom edge to stack, on the side to mount radially (symmetry with <b>X</b>).<br>• Drag a part to move it; drop it back on the list to delete it.<br>• <b>Ctrl+Z / Ctrl+Y</b> undo and redo. Staging is in the right column.<br>Short on ideas? <b>Load → Pebble Hopper</b> gives you a ready-made first rocket.'],
  flight: ['Flight controls', '<b>Space</b> fires the next stage. <b>Shift / Ctrl</b> throttle, <b>Z</b> full, <b>X</b> cut.<br><b>W/S</b> pitch, <b>A/D</b> yaw, <b>Q/E</b> roll. <b>T</b> SAS (holds your heading), <b>R</b> RCS, <b>G</b> legs and panels.<br>The <b>mouse moves the camera only</b>: drag to look around, wheel to zoom.<br><b>M</b> map, <b>,</b> and <b>.</b> time warp, <b>/</b> stop warp, <b>F5/F9</b> quicksave and load, <b>Esc</b> pause.'],
  map: ['The map', 'The bright line is your path. <b>Ap</b> is your highest point, <b>Pe</b> your lowest. Reaching high is not orbit: you are in orbit when <b>Pe is above the atmosphere</b> (70 km at Earth).<br>Click a planet or moon label, choose <b>Set as target</b>, then use <b>Plan transfer</b> in the maneuver panel. <b>Auto-burn</b> flies the burn for you.'],
  eva: ['Spacewalk', '<b>W/A/S/D</b> move relative to the camera. <b>Shift</b> up, <b>Ctrl</b> down (jetpack). <b>Q/E</b> roll. <b>R</b> toggles the jetpack. On the ground, <b>Shift</b> runs and <b>Space</b> jumps.<br><b>F</b> grabs a nearby vessel, <b>Space</b> lets go. <b>B</b> boards a capsule with a free seat.<br>Open <b>Science</b> for EVA reports, surface samples and flags.'],
  research: ['Research Center', 'Each node costs science. Lines show prerequisites. Click a node to see what it unlocks. The Interstellar tab holds starship tech (fusion, antimatter, sails, ramjets), unlocked after Nuclear Power.'],
  missions: ['Mission Control', 'Accept missions to track them during flights. Rewards are paid in science. Missions with a recovery objective must be completed in one flight that ends safely on Earth.'],
  tracking: ['Tracking Station', 'Every spacecraft in flight appears here. Click <b>Fly</b> to take control. Use the time warp buttons to wait for transfer windows. Click any world for real facts about it.'],
};
const Tutorial = {
  show(key) {
    const P = Save.prog;
    if (!P.settings.hints || P.tutorial[key] || !TIPS[key]) return;
    const t = $('#tip');
    $('#tipTitle').textContent = TIPS[key][0];
    $('#tipBody').innerHTML = TIPS[key][1];
    t.hidden = false;
    $('#tipOk').onclick = () => { P.tutorial[key] = true; t.hidden = true; Save.save(); };
    $('#tipOff').onclick = () => { P.settings.hints = false; t.hidden = true; Save.save(); };
  },
};

// ---------- Game state machine ----------
const Game = {
  scene: 'loading', vessels: [], activeId: null, time: 0, paused: false, altMode: 'asl', warpTarget: null, launchSnap: null,
  newVesselId() { return Save.prog.nextVesselId++; },
  // Anyone marked "in flight" who is not aboard a vessel or out on EVA is back at the space center.
  syncCrew() {
    const aboard = new Set();
    for (const v of this.vessels) { if (v.dead) continue; if (v.type === 'eva' && v.crewName) aboard.add(v.crewName); for (const p of v.parts || []) for (const n of p.crew || []) aboard.add(n); }
    for (const c of Save.prog.crew) { if (aboard.has(c.name)) c.status = 'flight'; else if (c.status === 'flight') c.status = 'ready'; }
  },
  goto(s) {
    if (typeof BlackBox !== 'undefined') BlackBox.push('scene', { to: s });
    const cur = this.scene;
    if (cur === s) return;
    if (cur === 'flight') { Flight.stop(); this.persist(); this.activeId = null; }
    if (cur === 'center') SpaceCenter.close();
    if (cur === 'editor') Editor.close();
    if (cur === 'research') Research.close();
    if (cur === 'missions') MissionControl.close();
    if (cur === 'tracking') Tracking.close();
    this.paused = false; $('#pause').hidden = true; $('#tip').hidden = true;
    this.scene = s;
    document.body.dataset.scene = s;
    if (s === 'center') { this.syncCrew(); SpaceCenter.open(); }
    if (s === 'editor') Editor.open();
    if (s === 'research') Research.open();
    if (s === 'missions') MissionControl.open();
    if (s === 'tracking') Tracking.open();
    if (s === 'flight') Flight.start();
    Save.save();
  },
  persist() {
    Save.prog.vessels = this.vessels.filter(v => !v.dead && v.type !== 'debris').map(v => Vessel.toJSON(v));
    Save.prog.time = this.time;
    Save.save();
  },
  snapshot() { return { time: this.time, activeId: this.activeId, vessels: this.vessels.filter(v => !v.dead).map(v => Vessel.toJSON(v)), crew: JSON.parse(JSON.stringify(Save.prog.crew)) }; },
  restore(s) {
    if (this.scene === 'flight') Flight.stop();
    this.time = s.time; this.vessels = s.vessels.map(o => Vessel.fromJSON(o)); this.activeId = s.activeId;
    if (s.crew) Save.prog.crew = s.crew;
    Bodies.update(this.time);
    this.scene = 'flight'; document.body.dataset.scene = 'flight';
    $('#center').hidden = true; $('#editor').hidden = true; $('#tracking').hidden = true;
    this.paused = false; $('#pause').hidden = true;
    Flight.start();
  },
  quickSave() { if (this.scene !== 'flight') return; if (Save.quickSave(this.snapshot())) toast('Quicksaved (F9 to load)', 'good', 1800); },
  quickLoad() { const s = Save.quickLoad(); if (!s) { toast('No quicksave yet. Press F5 during a flight.', 'info'); return; } Modal.close(); this.restore(s); toast('Quicksave loaded', 'info', 1500); },
  launchDesign(d) {
    Staging.sync(d);
    // clear anything still sitting on the pad
    const padBF = SpaceCenter.padBF();
    const earth = Bodies.byId.earth;
    for (let i = this.vessels.length - 1; i >= 0; i--) {
      const o = this.vessels[i];
      if (o.body === 'earth' && o.landed && o.landedBF && o.landedBF.distanceTo(padBF) < 120) { this.vessels.splice(i, 1); toast(`Cleared ${esc(o.name)} from the pad`, 'info', 2000); }
    }
    this.syncCrew();
    const v = Vessel.fromDesign(d, this.newVesselId());
    // crew
    const free = Save.freeCrew(99);
    for (const p of v.parts) { const P = PARTS[p.pid]; if (P.crew) { while (p.crew.length < P.crew && free.length) { const c = free.shift(); c.status = 'flight'; p.crew.push(c.name); } } }
    if (v.parts.some(p => PARTS[p.pid].crew) && !Vessel.crewCount(v)) toast('No astronauts available: the capsule flies empty.', 'warn');
    // stand it on the pad deck
    const U = padBF.clone().normalize();
    const N = new V3(0, 1, 0).addScaledVector(U, -U.y).normalize();
    const E = new V3().crossVectors(N, U);
    const ext = Vessel.extents(v);
    v.landedBF = U.clone().multiplyScalar(padBF.length() + 3.05 - ext.minY);
    v.landedQ = new Q4().setFromRotationMatrix(new THREE.Matrix4().makeBasis(E, U, N.clone().negate()));
    v.landed = true; v.body = 'earth'; v.launchT = this.time; v.data = [];
    Bodies.update(this.time);
    Phys.rails(v, this.time, this.time, null);
    v.sas = true; v.sasMode = 'stab';
    this.vessels.push(v);
    this.activeId = v.id;
    this.launchSnap = this.snapshot();
    this.launchDesignCopy = Design.clone(d);
    this.goto('flight');
  },
  flyVessel(id) {
    const v = this.vessels.find(x => x.id === id); if (!v) return;
    Phys.rails(v, v.epoch != null ? v.epoch : this.time, this.time, null);
    this.activeId = id; this.launchSnap = this.snapshot(); this.launchDesignCopy = v.design || null;
    this.goto('flight');
  },
  failure(msg) {
    const btns = [];
    if (this.launchSnap) btns.push({ label: 'Revert to launch', primary: true, fn: () => this.restore(JSON.parse(JSON.stringify(this.launchSnap))) });
    if (this.launchDesignCopy) btns.push({ label: 'Back to assembly', fn: () => { this.vessels = this.vessels.filter(v => v.id !== this.activeId); this.goto('editor'); } });
    if (Save.quickLoad()) btns.push({ label: 'Load quicksave', fn: () => this.quickLoad() });
    btns.push({ label: 'Space Center', fn: () => this.goto('center') });
    btns.push({ label: 'Keep watching' });
    Modal.open('Vessel lost', `<p class="fail-msg">${esc(msg)}</p><p class="muted">Crew are rescued and return to the space center. Reverting puts you back on the pad with nothing lost.</p>`, btns);
  },
  checkMissions(log, recovered) {
    const P = Save.prog;
    for (const id of Object.keys(P.missions.active)) {
      const m = MissionById[id]; if (!m) continue;
      const st = P.missions.active[id];
      const hasRec = m.obj.some(o => o.t === 'recover');
      if (hasRec) {
        if (recovered && m.obj.every(o => Missions.check(o, log))) this.complete(m);
        continue;
      }
      m.obj.forEach((o, i) => { if (!st.done[i] && Missions.check(o, log)) { st.done[i] = true; if (m.obj.length > 1) toast(`Objective complete: ${esc(o.text)}`, 'good', 2500); } });
      if (st.done.every(Boolean)) this.complete(m);
    }
  },
  complete(m) {
    const P = Save.prog;
    delete P.missions.active[m.id];
    P.missions.done[m.id] = true;
    P.science += m.reward; P.totalScience = (P.totalScience || 0) + m.reward;
    Sound.fx.success();
    toast(`<b>Mission complete: ${esc(m.title)}</b> +${m.reward} science`, 'good', 5000);
    // auto-accept the next missions so new players always have a goal
    for (const n of Missions.available(P)) if (!P.missions.active[n.id] && Object.keys(P.missions.active).length < 3 && n.req.includes(m.id)) P.missions.active[n.id] = { done: n.obj.map(() => false) };
    Save.save();
  },
};

// ---------- settings & pause ----------
const GAME_VERSION = '1.0';
// ---------- title screen ----------
const Title = {
  open() {
    const P = Save.prog;
    const fresh = !P.stats.launches && !Object.keys(P.missions.done).length && !P.vessels.length && !P.totalScience;
    $('#tContinue').textContent = fresh ? 'Start your program' : 'Continue';
    $('#tNew').hidden = fresh;
    const flying = Game.vessels.filter(v => !v.dead && v.type !== 'flag' && v.type !== 'debris').length;
    $('#tMeta').innerHTML = fresh ? 'Build rockets, earn science and explore a scaled-down Solar System, and beyond it, the nearest stars.'
      : `${esc(fmtUT(Game.time).split(' ').slice(0, 2).join(' '))} · <b>${fmtNum(P.science, 0)}</b> science · ${Object.keys(P.missions.done).length} of ${MISSIONS.length} missions done${flying ? ` · ${flying} vessel${flying === 1 ? '' : 's'} in flight` : ''}`;
    $('#tVer').textContent = `v${GAME_VERSION} · best with a keyboard and mouse`;
    $('#title').hidden = false; $('#center').hidden = true; $('#tip').hidden = true;
    setTimeout(() => $('#tContinue').focus(), 50);
  },
  close() {
    $('#title').hidden = true;
    if (Game.scene === 'center') { $('#center').hidden = false; Tutorial.show('center'); }
  },
  get isOpen() { return !$('#title').hidden; },
  bind() {
    $('#tContinue').onclick = () => { Sound.fx && Sound.fx.click && Sound.fx.click(); Title.close(); };
    $('#tNew').onclick = () => Modal.open('Start a new program?', '<p>This erases your science, research, missions, rocket designs and every flight in progress. It cannot be undone.</p><p class="muted">Want a copy first? Settings → Backup → Export save.</p>', [{ label: 'Cancel' }, { label: 'Erase and start over', primary: true, fn: () => { Save.reset(); location.reload(); } }]);
    $('#tHow').onclick = () => $('#scHelp').click();
    $('#tSettings').onclick = () => openSettings();
    $('#tCredits').onclick = () => Title.credits();
    $('#scMenu').onclick = () => Title.open();
  },
  credits() {
    Modal.open('Credits', `<div class="credits">
      <p><b>Meridian Space Program</b> v${GAME_VERSION}</p>
      <h4>Planet maps</h4><p>Solar System Scope (solarsystemscope.com/textures), licensed under CC BY 4.0, based on NASA mission imagery. The Ceres, Haumea, Makemake and Eris maps are artist's impressions. Worlds without a published map, and every world beyond the Solar System, use maps generated in your browser.</p>
      <h4>3D engine</h4><p>three.js r149, MIT License.</p>
      <h4>Fonts</h4><p>Barlow Condensed, IBM Plex Sans and IBM Plex Mono, SIL Open Font License 1.1, served by Google Fonts.</p>
      <h4>Sound and music</h4><p>Synthesized live in your browser with the Web Audio API.</p>
      <h4>Stars and exoplanets</h4><p>Proxima Centauri, Tau Ceti and Barnard's Star use published stellar properties and sky positions. Real and candidate exoplanets use their reported orbits and masses; their surfaces, and every other planet and moon in those systems, are invented.</p>
      <h4>Adrian</h4><p>Inspired by the planet Adrian in <i>Project Hail Mary</i> by Andy Weir (2021); details from the Project Hail Mary Wiki (CC BY-SA). A fan tribute, not affiliated with the author or publisher.</p>
    </div>`, [{ label: 'Close', primary: true }]);
  },
};
function exportSave() {
  Game.persist && Game.scene === 'flight' ? Game.persist() : Save.save();
  const blob = new Blob([JSON.stringify(Save.prog)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `meridian-save-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Save exported. Keep the file somewhere safe.', 'good');
}
function importSave(file) {
  const rd = new FileReader();
  rd.onload = () => {
    let p = null; try { p = JSON.parse(rd.result); } catch (e) { p = null; }
    if (!p || p.version !== 1 || !p.missions || !p.tech) { toast('That file is not a Meridian save.', 'bad'); return; }
    Modal.open('Load this save?', `<p>Replace your current program with the one in <b>${esc(file.name)}</b>?</p>`, [{ label: 'Cancel' }, { label: 'Load it', primary: true, fn: () => { try { localStorage.setItem(Save.KEY, JSON.stringify(p)); Save.prog = p; window.__noSaveOnUnload = true; location.reload(); } catch (e) { toast('Could not store the save: browser storage is full or blocked.', 'bad'); } } }]);
  };
  rd.readAsText(file);
}
function openSettings() {
  const S = Save.prog.settings;
  Modal.open('Settings', `
    <div class="set-row"><label for="setQ">Graphics</label><select id="setQ"><option value="auto">Automatic</option><option value="high">High</option><option value="low">Light (Chromebooks, older laptops)</option></select></div>
    <div class="set-row"><label for="setSfx">Sound effects</label><input id="setSfx" type="range" min="0" max="100" value="${Math.round(S.sfx * 100)}"></div>
    <div class="set-row"><label for="setMus">Music</label><input id="setMus" type="range" min="0" max="100" value="${Math.round(S.music * 100)}"></div>
    <div class="set-row"><label for="setSens">Camera sensitivity</label><input id="setSens" type="range" min="30" max="250" value="${Math.round((S.sens || 1) * 100)}"></div>
    <div class="set-row"><label for="setHints">Show tips</label><input id="setHints" type="checkbox" ${S.hints ? 'checked' : ''}></div>
    <p class="muted">Graphics changes apply after reloading the page. The current mode is <b>${World.quality}</b>.</p>
    <details><summary>Controls</summary><div class="controls-ref">${TIPS.flight[1]}<br><br><b>EVA:</b> ${TIPS.eva[1]}<br><br><b>Editor:</b> drag parts, X symmetry, Ctrl+D duplicate, Delete remove, Ctrl+Z/Y undo/redo, ↑/↓ reorder stack part.</div></details>
    <details><summary>Backup</summary><p>Your progress is saved in this browser automatically. Export a file to keep a copy or move it to another computer.</p><div class="backup-row"><button id="setExport">Export save</button><button id="setImport">Import save…</button><input id="setImportFile" type="file" accept=".json,application/json" hidden></div>
      <p class="muted">If the game ever closes or freezes, a crash report of its last minute is kept here.</p><div class="backup-row"><button id="setCrash">Copy crash report</button></div></details>
    <details><summary>Reset progress</summary><p>This erases science, research, missions, rocket designs and all flights.</p><button id="setReset" class="danger">Erase everything</button></details>`,
    [{ label: 'Close', primary: true }]);
  $('#setQ').value = S.quality;
  $('#setQ').onchange = () => { S.quality = $('#setQ').value; Save.save(); toast('Reload the page to apply the new graphics mode.', 'info'); };
  $('#setSfx').oninput = () => { S.sfx = $('#setSfx').value / 100; Sound.setVolumes(S.sfx, S.music); Save.save(); };
  $('#setMus').oninput = () => { S.music = $('#setMus').value / 100; Sound.setVolumes(S.sfx, S.music); Save.save(); };
  $('#setSens').oninput = () => { S.sens = $('#setSens').value / 100; Save.save(); };
  $('#setHints').onchange = () => { S.hints = $('#setHints').checked; if (S.hints) Save.prog.tutorial = {}; Save.save(); };
  $('#setExport').onclick = exportSave;
  $('#setCrash').onclick = () => {
    const txt = BlackBox.report();
    if (!txt) { toast('No crash report recorded yet.', 'info'); return; }
    const done = () => toast('Crash report copied. Paste it into your bug report.', 'good');
    const show = () => Modal.open('Crash report', '<p>Copy this text into your bug report:</p><textarea readonly style="width:100%;height:220px;font:11px var(--f-mono)">' + esc(txt) + '</textarea>', [{ label: 'Close', primary: true }]);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, show); else show();
  };
  $('#setImport').onclick = () => $('#setImportFile').click();
  $('#setImportFile').onchange = (e) => { const f = e.target.files && e.target.files[0]; if (f) importSave(f); };
  $('#setReset').onclick = () => { Modal.open('Erase all progress?', '<p>This cannot be undone.</p>', [{ label: 'Cancel' }, { label: 'Erase', primary: true, fn: () => { Save.reset(); window.__noSaveOnUnload = true; location.reload(); } }]); };
}
function togglePause(force) {
  if (Game.scene !== 'flight') return;
  Game.paused = force != null ? force : !Game.paused;
  $('#pause').hidden = !Game.paused;
  Sound.pauseAll(Game.paused);
}

// ---------- black box ----------
// A small flight recorder kept in browser storage: what the game was doing over its last minute or so,
// and any errors. If the page dies (a crash, or a freeze the browser gives up on), the next start says
// so, and the report can be copied from Settings > Backup to help track the problem down.
const BlackBox = (function () {
  const KEY = 'msp-blackbox', RUN = 'msp-running', LAST = 'msp-blackbox-last';
  const log = [];
  let frames = 0, worstFrame = 0, unexpected = false;
  try {
    // still marked as running: the last session never closed normally
    if (localStorage.getItem(RUN) === '1' && localStorage.getItem(KEY)) { localStorage.setItem(LAST, localStorage.getItem(KEY)); unexpected = true; }
    localStorage.setItem(RUN, '1');
  } catch (e) { /* storage blocked: nothing to record into */ }
  function push(kind, data) {
    log.push(Object.assign({ t: +(performance.now() / 1000).toFixed(1), kind }, data || {}));
    if (log.length > 80) log.splice(0, log.length - 80);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ version: GAME_VERSION, at: new Date().toISOString(), ua: navigator.userAgent, log })); } catch (e) { /* full or blocked */ } }
  function frame(ms) { frames++; if (ms > worstFrame) worstFrame = ms; }
  function beat() {
    const g = typeof Game !== 'undefined' ? Game : null, v = g && g.vessels && g.vessels.find(x => x.id === g.activeId), B = v && Bodies.byId[v.body];
    const R = typeof World !== 'undefined' ? World.renderer : null;
    push('beat', {
      scene: g && g.scene, map: typeof Flight !== 'undefined' && Flight.map, warp: typeof Flight !== 'undefined' ? Flight.warpIdx : null,
      vessel: v ? v.type : null, body: v ? v.body : null, alt: v && B ? Math.round(v.r.length() - B.R) : null,
      landed: v ? !!v.landed : null, fps: Math.round(frames / 2), worstFrameMs: Math.round(worstFrame),
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
      geometries: R ? R.info.memory.geometries : null, textures: R ? R.info.memory.textures : null,
    });
    frames = 0; worstFrame = 0;
    save();
  }
  setInterval(beat, 2000);
  window.addEventListener('beforeunload', () => { try { localStorage.setItem(RUN, '0'); } catch (e) { /* ignore */ } });
  function report() { try { return localStorage.getItem(unexpected ? LAST : KEY) || localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  return { push, frame, save, report, get unexpected() { return unexpected; } };
})();

// ---------- boot ----------
// Anything that slips past the frame loop's own guard: tell the player once in a while, keep playing.
(function () {
  let lastErr = 0;
  const report = (msg) => { console.error(msg); BlackBox.push('error', { msg: String(msg).slice(0, 300) }); BlackBox.save(); const now = Date.now(); if (now - lastErr < 30000 || typeof toast !== 'function') return; lastErr = now; toast('Something went wrong (' + esc(String(msg).slice(0, 90)) + '). Your progress is saved; if things look broken, save and reload the page.', 'bad', 7000); };
  window.addEventListener('error', e => { if (e.filename && !/\/js\//.test(e.filename)) return; report(e.message); });
  window.addEventListener('unhandledrejection', e => report(e.reason && e.reason.message || e.reason));
})();

(function boot() {
  const prog = Save.load();
  let q = window.arcadeSettings?.profile==='chromebook'?'low':prog.settings.quality;
  // Automatic picks High unless the device is clearly weak; screen size alone no longer forces Light mode.
  if (q === 'auto') q = ((navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency || 8) <= 2) ? 'low' : 'high';
  Game.time = prog.time || 0;
  if (!Object.keys(prog.missions.active).length && !Object.keys(prog.missions.done).length) prog.missions.active.m_first = { done: [false] };
  Bodies.update(Game.time);
  World.init($('#gl'), q);
  // If the graphics driver resets (a GPU hang, a driver update, too little video memory), WebGL loses
  // everything it held. Save straight away and reload, rather than leaving a frozen or blank page.
  $('#gl').addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    BlackBox.push('contextLost'); BlackBox.save();
    try { if (Game.scene === 'flight') Game.persist(); else Save.save(); } catch (err) { console.error(err); }
    window.__noSaveOnUnload = true; // the save above is the good one
    Modal.open('Graphics reset', '<p>Your graphics driver reset, so the game is reloading. Your progress has been saved.</p>', [{ label: 'Reload now', primary: true, fn: () => location.reload() }]);
    setTimeout(() => location.reload(), 2500);
  });
  Game.vessels = (prog.vessels || []).map(o => Vessel.fromJSON(o));
  Game.vessels.forEach(v => v.epoch = Game.time);
  Editor.init(); Flight.bindHUD(); Research.bind(); MissionControl.bind(); Tracking.bind(); MapView.init();
  Sound.setVolumes(prog.settings.sfx, prog.settings.music);
  // load the Earth map first: its coastlines shape the terrain at the space center
  const ld = $('#loadMsg');
  ld.textContent = 'Loading Earth…';
  TexStore.request(Bodies.byId.earth, (e) => {
    ld.textContent = e.fallback ? 'Earth map unavailable (open the game from a web server). Using generated terrain.' : 'Ready';
    $('#loading').classList.add('done');
    setTimeout(() => $('#loading').hidden = true, 700);
    Game.goto('center');
    Title.bind(); Title.open();
    if (BlackBox.unexpected) setTimeout(() => toast('The game closed unexpectedly last time. Your progress was saved, and a crash report is in Settings → Backup → Copy crash report.', 'info', 9000), 1200);
  });
  TexStore.request(Bodies.byId.moon);
  // input
  const canvas = $('#gl');
  const startAudio = () => { if (!Sound.ready) { Sound.init(); Sound.setVolumes(Save.prog.settings.sfx, Save.prog.settings.music); } Sound.resume(); };
  window.addEventListener('pointerdown', startAudio);
  window.addEventListener('keydown', startAudio);
  canvas.addEventListener('pointerdown', e => { if (Game.scene === 'flight') Flight.mouseDown(e); if (Game.scene === 'center') SpaceCenter.mouseDown(e); });
  window.addEventListener('pointermove', e => { if (Game.scene === 'flight') Flight.mouseMove(e); if (Game.scene === 'center') SpaceCenter.mouseMove(e); });
  window.addEventListener('pointerup', e => { if (Game.scene === 'flight') Flight.mouseUp(e); if (Game.scene === 'center') SpaceCenter.mouseUp(e); });
  canvas.addEventListener('wheel', e => { if (Game.scene === 'flight') Flight.wheel(e); if (Game.scene === 'center') SpaceCenter.wheel(e); }, { passive: true });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (Modal.isOpen()) { if (e.key === 'Escape') Modal.close(); return; }
    if (Title.isOpen) { if (e.key === 'Enter' && document.activeElement && document.activeElement.closest('#title')) return; if (e.key === 'Enter' || e.key === 'Escape') { Title.close(); e.preventDefault(); } return; }
    if (e.key === 'Escape' && Game.scene === 'center') { Title.open(); e.preventDefault(); return; }
    if (e.key === 'Escape') {
      if (Game.scene === 'flight') { if (Flight.map) Flight.toggleMap(); else togglePause(); }
      else if (Game.scene !== 'center' && Game.scene !== 'editor') Game.goto('center');
      e.preventDefault(); return;
    }
    if (Game.scene === 'editor' && Editor.key(e)) { e.preventDefault(); return; }
    if (Game.scene === 'flight' || Game.scene === 'tracking') { if (MapView.key(e)) return; }
    if (Game.scene === 'flight' && Flight.key(e, true)) e.preventDefault();
  });
  window.addEventListener('keyup', e => { if (Game.scene === 'flight') Flight.key(e, false); });
  window.addEventListener('blur', () => { if (Game.scene === 'flight') togglePause(true); });
  window.addEventListener('resize', () => Editor.onResize());
  // top-level buttons
  $$('[data-settings]').forEach(b => b.onclick = openSettings);
  $('#pResume').onclick = () => togglePause(false);
  $('#pSettings').onclick = openSettings;
  $('#pQS').onclick = () => Game.quickSave();
  $('#pQL').onclick = () => Game.quickLoad();
  $('#pRevert').onclick = () => { if (Game.launchSnap) Game.restore(JSON.parse(JSON.stringify(Game.launchSnap))); };
  $('#pEditor').onclick = () => { if (Game.launchDesignCopy) { const id = Game.activeId; Game.vessels = Game.vessels.filter(v => v.id !== id || !v.landed); } Game.goto('editor'); };
  $('#pCenter').onclick = () => Game.goto('center');
  $('#bPause').onclick = () => togglePause();
  $('#scHelp').onclick = () => Modal.open('How to play', `<p>Build rockets in the <b>Assembly Building</b>, launch them, and run experiments to earn <b>science</b>. Spend science in the <b>Research Center</b> to unlock better parts, and take on harder missions in <b>Mission Control</b>.</p>
      <p><b>The scale:</b> worlds are 1/10 of their real size with real surface gravity, so orbital speeds are about a third of real values (low Earth orbit ≈ 2.3 km/s). Distances are squeezed even more to keep trips short: the Moon is about 22,000 km away and Neptune about 11 times Earth's distance from the Sun instead of 30. Orbits keep their real shapes and tilts.</p>
      <p><b>Getting to orbit:</b> climb straight up to ~10 km, tip east (heading 90°) gradually, keep raising your apoapsis to ~80 km, then coast to it and burn prograde until the periapsis rises above 70 km.</p>
      <p><b>Coming home:</b> burn retrograde until the periapsis is ~35 km, stage away everything except the capsule and heat shield, hold <b>Retrograde</b>, and the parachute opens by itself once you slow down.</p>
      <p><b>Reading your path:</b> the Trajectory panel on the right of the flight screen shows your orbit side-on. Blue means a stable orbit, orange means it dips into the air or hits the ground (a red ✕ marks the impact point), purple means you're escaping. The shaded band is the atmosphere and the dashed ring is where space begins.</p>
      <p><b>Other stars:</b> Proxima Centauri, Barnard's Star and Tau Ceti lie far beyond Neptune. Research the Interstellar tab in the Research Center, build a fusion or antimatter starship, target a star in the map, hold <b>TGT</b> and burn, then coast with the purple warp speeds (100M× to 10B×). Warp slows down by itself when you arrive.</p>
      <h4>Controls</h4><div class="controls-ref">${TIPS.flight[1]}<br><br><b>EVA:</b> ${TIPS.eva[1]}</div>
      <p class="muted">Planet maps: Solar System Scope (solarsystemscope.com/textures), CC BY 4.0. Dwarf-planet maps from that set are artist's impressions. Moons without published maps use generated surfaces based on their known features.</p>`, [{ label: 'Close', primary: true }]);
  // frame loop
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    BlackBox.frame(now - last);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const R = World.renderer;
    try {
      if (Game.scene === 'center') SpaceCenter.update(dt);
      else if (Game.scene === 'editor') { R.setClearColor(0x0b1220, 1); R.clear(); Editor.frame(dt); }
      else if (Game.scene === 'flight') Flight.update(dt);
      else if (Game.scene === 'tracking') Tracking.update(dt);
      else if (Game.scene === 'view' && Game.viewFrame) Game.viewFrame(dt);
      else { R.setClearColor(0x06090f, 1); R.clear(); }
    } catch (err) { console.error(err); BlackBox.push('error', { msg: String(err && err.stack || err).slice(0, 400) }); if (!Game._errShown) { Game._errShown = true; toast('Something went wrong: ' + esc(err.message), 'bad', 8000); } }
  }
  requestAnimationFrame(loop);
  setInterval(() => { if (Game.scene !== 'flight') Save.save(); else Game.persist(); }, 30000);
  window.addEventListener('beforeunload', () => { if (window.__noSaveOnUnload) return; if (Game.scene === 'flight') Game.persist(); else Save.save(); });
})();
