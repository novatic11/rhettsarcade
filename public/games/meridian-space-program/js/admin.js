'use strict';
// ---------- Admin panel ----------
// Type A-D-M-I-N anywhere (outside a text field) to open it. Teleports, refills, cheats, program and world tools.
const Admin = (function () {
  let el = null, open = false, hud = null, hudOn = false, frames = 0, fpsT = performance.now(), fps = 0;
  const av = () => Game.vessels.find(v => v.id === Game.activeId);
  const say = (msg, kind) => { toast(msg, kind || 'good', 2600); if (el) el.querySelector('#adStatus').textContent = msg.replace(/<[^>]+>/g, ''); };
  const bodies = () => Bodies.list.filter(b => b.id !== 'sun');
  const fmtKm = m => m >= 1e6 ? fmtNum(m / 1000, 0) + ' km' : fmtNum(m / 1000, 1) + ' km';

  // a safe circular-orbit altitude: above the air and the mountains, well inside the sphere of influence
  function safeAlt(b) {
    let a = Math.max(b.atmH ? b.atmH * 1.25 : 0, (b.maxTerrain || 0) + Math.max(8000, b.R * 0.12));
    if (b.soi && isFinite(b.soi)) a = Math.min(a, (b.soi - b.R) * 0.5);
    return a;
  }

  // ---------- getting a vessel to work with ----------
  // In flight it is the active vessel; anywhere else the last design (or a starter rocket) is launched first.
  function ensureVessel() {
    if (Game.scene === 'flight' && av() && !av().dead) return av();
    const d = Save.prog.lastDesign ? Design.clone(Save.prog.lastDesign) : (typeof starterDesign === 'function' ? starterDesign('hopper') : null);
    if (!d) { say('Build a rocket in the Assembly Building first.', 'warn'); return null; }
    Game.launchDesign(d);
    return av();
  }
  function settle(v) {
    v.landed = false; v.splashed = false; v.landedBF = null; v.landedQ = null;
    v.w.set(0, 0, 0); v.throttle = 0; v.node = null; v.sas = true; v.sasMode = 'stab';
    Game.warpTarget = null; if (Game.scene === 'flight') Flight.setWarp(0);
    Phys.invalidate(v);
    if (Game.scene === 'flight') Flight.clearFx(); // old smoke would hang where the ship used to be
    if (v.log && v.log.soi) v.log.soi[v.body] = true;
    const B = Bodies.byId[v.body]; if (B.solid) TexStore.request(B);
  }

  // ---------- teleports ----------
  function toOrbit(bodyId, altM, incDeg) {
    const v = ensureVessel(); if (!v) return;
    const B = Bodies.byId[bodyId];
    let alt = altM > 0 ? altM : safeAlt(B);
    if (B.soi && isFinite(B.soi)) alt = Math.min(alt, B.soi * 0.9 - B.R);
    const ax = B.axis ? B.axis.clone() : new V3(0, 1, 0);
    // start over the day side: the direction of the star, flattened into the equatorial plane
    let e1 = B.type === 'star' ? new V3(1, 0, 0) : Bodies.toStar(B, B.pos, new V3());
    e1.addScaledVector(ax, -e1.dot(ax));
    if (e1.lengthSq() < 1e-6) e1 = new V3().crossVectors(ax, Math.abs(ax.z) < 0.9 ? new V3(0, 0, 1) : new V3(1, 0, 0));
    e1.normalize();
    const e2 = new V3().crossVectors(ax, e1).normalize();
    const i = (incDeg || 0) * DEG;
    const dir = e2.multiplyScalar(Math.cos(i)).addScaledVector(ax, Math.sin(i)).normalize();
    v.body = bodyId;
    v.r.copy(e1).multiplyScalar(B.R + alt);
    v.v.copy(dir).multiplyScalar(Math.sqrt(B.GM / (B.R + alt)));
    v.q.setFromUnitVectors(new V3(0, 1, 0), dir);
    settle(v);
    say(`${esc(v.name)} is in a ${fmtKm(alt)} circular orbit around ${B.name}.`);
  }
  function toSurface(bodyId, latDeg, lonDeg) {
    const B = Bodies.byId[bodyId];
    if (!B.solid) { say(`${B.name} has no solid surface to land on.`, 'warn'); return; }
    const v = ensureVessel(); if (!v) return;
    const U = latLonToDir((latDeg || 0) * DEG, (lonDeg || 0) * DEG, new V3()).normalize();
    placeLanded(v, B, U);
    say(`${esc(v.name)} is standing on ${B.name} at ${fmtNum(latDeg || 0, 1)}°, ${fmtNum(lonDeg || 0, 1)}°.`);
  }
  // stand a vessel upright on the ground at body-fixed direction U
  function placeLanded(v, B, U) {
    const N0 = Math.abs(U.y) > 0.98 ? new V3(1, 0, 0) : new V3(0, 1, 0);
    const N = N0.addScaledVector(U, -U.dot(N0)).normalize();
    const E = new V3().crossVectors(N, U);
    const ext = v.type === 'eva' ? { minY: -0.95 } : Vessel.extents(v);
    const h = Terrain.groundH(B, U, 0.5);
    const ground = (B.ocean && h < 0) ? 0 : h;
    v.body = B.id;
    settle(v);
    v.landedBF = U.clone().multiplyScalar(B.R + ground - ext.minY + 0.05);
    v.landedQ = new Q4().setFromRotationMatrix(new THREE.Matrix4().makeBasis(E, U, N.clone().negate()));
    v.landed = true; v.splashed = B.ocean && h < 0;
    Bodies.update(Game.time);
    Phys.rails(v, Game.time, Game.time, null);
  }
  function toVessel(id) {
    const o = Game.vessels.find(x => x.id === id);
    const v = av();
    if (!o || !v || o === v) { say('Pick another vessel to fly to.', 'warn'); return; }
    const B = Bodies.byId[o.body];
    if (o.landed && o.landedBF) {
      const U0 = o.landedBF.clone().normalize();
      const side = new V3(0, 1, 0).cross(U0); if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      const U = U0.clone().add(side.normalize().multiplyScalar(30 / B.R)).normalize();
      placeLanded(v, B, U);
    } else {
      v.body = o.body;
      const off = new V3().crossVectors(o.v, o.r).normalize().multiplyScalar(40);
      v.r.copy(o.r).add(off); v.v.copy(o.v); v.q.copy(o.q);
      settle(v);
    }
    v.target = { vessel: o.id };
    say(`Moved next to ${esc(o.name)} and set it as your target.`);
  }

  // ---------- vessel tools ----------
  function refill() {
    const v = av(); if (!v) { say('Fly a vessel first.', 'warn'); return; }
    for (const p of v.parts || []) { for (const k in p.cap) p.res[k] = p.cap[k]; const P = PARTS[p.pid]; if (P.ablator) p.ablator = P.ablator; }
    if (v.type === 'eva') v.prop = Eva.PROP_MAX;
    Phys.invalidate(v);
    say('Refilled every tank, battery, heat shield and jetpack.');
  }
  function repair() {
    const v = av(); if (!v) { say('Fly a vessel first.', 'warn'); return; }
    for (const p of v.parts || []) { p.temp = 288; if (p.chute && p.chute !== 'stowed') { p.chute = 'stowed'; } p.flamedOut = false; }
    v.uncontrolled = false; v.lostControl = false;
    say('Cooled every part and repacked the parachutes.');
  }
  function stopMotion() {
    const v = av(); if (!v || v.landed) { say(v ? 'Already on the ground.' : 'Fly a vessel first.', 'warn'); return; }
    const B = Bodies.byId[v.body];
    v.v.copy(Bodies.surfVel(B, v.r, new V3())); v.w.set(0, 0, 0);
    say('Stopped dead relative to the ground below.');
  }
  function circularize() {
    const v = av(); if (!v || v.landed) { say(v ? 'Take off first.' : 'Fly a vessel first.', 'warn'); return; }
    const B = Bodies.byId[v.body], up = v.r.clone().normalize();
    let hz = v.v.clone().addScaledVector(up, -v.v.dot(up));
    if (hz.lengthSq() < 1e-6) hz = new V3(0, 1, 0).cross(up);
    v.v.copy(hz.normalize().multiplyScalar(Math.sqrt(B.GM / v.r.length())));
    Phys.invalidate(v);
    say(`Circular orbit at ${fmtKm(v.r.length() - B.R)}.`);
  }
  function raise(dAlt) {
    const v = av(); if (!v || v.landed) { say(v ? 'Take off first.' : 'Fly a vessel first.', 'warn'); return; }
    const B = Bodies.byId[v.body], r0 = v.r.length(), r1 = Math.max(B.R + 1000, r0 + dAlt);
    v.r.multiplyScalar(r1 / r0); circularize();
  }
  function killRot() { const v = av(); if (v) { v.w.set(0, 0, 0); say('Rotation stopped.'); } }

  // ---------- program ----------
  function addScience(n) { Save.prog.science += n; Save.prog.totalScience = (Save.prog.totalScience || 0) + n; Save.save(); const s = document.getElementById('scScience'); if (s) s.textContent = fmtNum(Save.prog.science, 1); say(`+${fmtNum(n, 0)} science (now ${fmtNum(Save.prog.science, 0)}).`); }
  function unlockAll() { for (const t of TECH) Save.prog.tech[t.id] = true; Save.save(); say('Every technology and part is unlocked. Reopen the Assembly Building to see the new parts.'); }
  function crewReady() { Game.syncCrew(); for (const c of Save.prog.crew) if (c.status !== 'flight') c.status = 'ready'; Save.save(); say('Every astronaut not in flight is ready at the space center.'); }
  function finishMissions() {
    const ids = Object.keys(Save.prog.missions.active || {});
    if (!ids.length) { say('No accepted missions. Accept some in Mission Control first.', 'warn'); return; }
    let n = 0; for (const id of ids) { const m = MissionById[id]; if (m) { Game.complete(m); n++; } }
    Save.save(); say(`Completed ${n} mission${n === 1 ? '' : 's'}.`);
  }
  function setDayTime(target) {
    if (Game.scene === 'flight') { say('Change the time of day from the space center (it would desync your flight).', 'warn'); return; }
    const e = Bodies.byId.earth; let best = Game.time, be = target === 'noon' ? -2 : 2;
    for (let k = 0; k < 120; k++) { const t = Game.time + k * 300; Bodies.update(t); const up = Bodies.fromBF(e, Terrain.kscDir, t, new V3()); const el2 = up.dot(e.pos.clone().negate().normalize()); if (target === 'noon' ? el2 > be : el2 < be) { be = el2; best = t; } }
    if (target === 'sunset') { for (let k = 0; k < 120; k++) { const t = best + k * 120; Bodies.update(t); const up = Bodies.fromBF(e, Terrain.kscDir, t, new V3()); if (up.dot(e.pos.clone().negate().normalize()) < 0.08) { best = t; break; } } }
    Game.time = best; Bodies.update(Game.time);
    say(`Time set to ${target} at the space center.`);
  }

  // ---------- debug readout ----------
  function tickHud() {
    frames++;
    const now = performance.now();
    if (now - fpsT > 500) { fps = frames * 1000 / (now - fpsT); frames = 0; fpsT = now; }
    if (hudOn && hud) {
      const v = av(); let s = `${fmtNum(fps, 0)} fps · ${Game.scene}`;
      if (v && Game.scene === 'flight') { const B = Bodies.byId[v.body]; const sp = v.v.length(); s += ` · ${B.name} · alt ${fmtKm(v.r.length() - B.R)} · ${fmtNum(sp, 0)} m/s · hottest ${fmtNum((v.hottest || 0) * 100, 0)}%`; }
      if (Clouds.enabled) s += ` · clouds ${Clouds.cover >= 0 ? '+' : ''}${fmtNum(Clouds.cover * 100, 0)}%`;
      hud.textContent = s;
    }
    requestAnimationFrame(tickHud);
  }

  // ---------- panel ----------
  const CSS = `
    #adminPanel{position:fixed;top:56px;right:12px;width:340px;max-width:calc(100vw - 24px);max-height:calc(100vh - 72px);overflow:auto;z-index:950;
      background:var(--panel-solid);border:1px solid var(--line);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.5);color:var(--text);font:13px/1.35 var(--f-body);}
    #adminPanel header{position:sticky;top:0;display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--panel-solid);border-bottom:1px solid var(--line);z-index:1}
    #adminPanel header b{font:600 18px var(--f-display);letter-spacing:.06em;color:var(--signal);flex:1}
    #adminPanel header button{background:none;border:0;color:var(--muted);font-size:20px;cursor:pointer;line-height:1}
    #adminPanel section{padding:10px 12px;border-bottom:1px solid var(--line)}
    #adminPanel h4{margin:0 0 8px;font:600 12px var(--f-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
    #adminPanel .row{display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap}
    #adminPanel label{font-size:12px;color:var(--muted)}
    #adminPanel select,#adminPanel input[type=number]{background:#0a1320;color:var(--text);border:1px solid var(--line);border-radius:6px;padding:5px 6px;font:13px var(--f-body);min-width:0}
    #adminPanel select{flex:1}
    #adminPanel input[type=number]{width:74px}
    #adminPanel button.ab{background:#16263a;color:var(--text);border:1px solid var(--line);border-radius:6px;padding:6px 9px;font:500 12.5px var(--f-body);cursor:pointer}
    #adminPanel button.ab:hover{border-color:var(--cyan);color:#fff}
    #adminPanel button.ab.go{background:var(--signal);color:#1a1205;border-color:var(--signal);font-weight:600}
    #adminPanel .tog{display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer}
    #adminPanel .tog input{accent-color:var(--signal);width:16px;height:16px}
    #adminPanel .hint{font-size:11.5px;color:var(--muted);margin-top:4px}
    #adminPanel #adStatus{padding:8px 12px;font-size:12px;color:var(--good);min-height:1.2em}
    #adminPanel input[type=range]{flex:1;accent-color:var(--cyan)}
    #adminHud{position:fixed;left:50%;transform:translateX(-50%);bottom:6px;z-index:940;background:rgba(5,9,15,.75);color:#cfe3f7;font:12px var(--f-mono);padding:3px 10px;border-radius:6px;pointer-events:none;white-space:nowrap;max-width:96vw;overflow:hidden}
  `;
  function build() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'adminPanel'; el.hidden = true;
    const opt = b => `<option value="${b.id}"${b.id === 'earth' ? ' selected' : ''}>${b.name}</option>`;
    const opts = bodies().map(opt).join('');
    const solids = bodies().filter(b => b.solid).map(opt).join('');
    el.innerHTML = `
      <header><b>ADMIN TOOLS</b><button data-a="close" title="Close (Esc)">×</button></header>
      <section><h4>Teleport to orbit</h4>
        <div class="row"><select id="adBody">${opts}</select></div>
        <div class="row"><label>Altitude km</label><input type="number" id="adAlt" min="0" step="10" placeholder="auto"><label>Incl. °</label><input type="number" id="adInc" value="0" step="5"></div>
        <div class="row"><button class="ab go" data-a="orbit">Put in orbit</button><button class="ab" data-a="orbitSun">Orbit the Sun</button></div>
        <div class="row"><button class="ab" data-q="earth">Low Earth</button><button class="ab" data-q="moon">Moon</button><button class="ab" data-q="mars">Mars</button><button class="ab" data-q="jupiter">Jupiter</button><button class="ab" data-q="saturn">Saturn</button></div>
        <div class="hint" id="adAltHint"></div>
      </section>
      <section><h4>Teleport to the surface</h4>
        <div class="row"><select id="adLand">${solids}</select></div>
        <div class="row"><label>Lat °</label><input type="number" id="adLat" value="0" step="5"><label>Lon °</label><input type="number" id="adLon" value="0" step="5"></div>
        <div class="row"><button class="ab go" data-a="land">Land here</button><button class="ab" data-a="landRandom">Random spot</button></div>
      </section>
      <section><h4>Fly to another vessel</h4>
        <div class="row"><select id="adVes"></select><button class="ab" data-a="toVessel">Go</button></div>
      </section>
      <section><h4>Vessel</h4>
        <div class="row"><button class="ab go" data-a="refill">Refill everything</button><button class="ab" data-a="repair">Cool &amp; repack</button></div>
        <div class="row"><button class="ab" data-a="circ">Circularize</button><button class="ab" data-a="up">+100 km</button><button class="ab" data-a="down">−100 km</button></div>
        <div class="row"><button class="ab" data-a="stop">Stop dead</button><button class="ab" data-a="killrot">Kill rotation</button></div>
      </section>
      <section><h4>Cheats (your vessel only)</h4>
        <label class="tog"><input type="checkbox" data-c="fuel"> Infinite fuel, power and jetpack</label>
        <label class="tog"><input type="checkbox" data-c="god"> Indestructible (no crashes, burn-ups or breakage)</label>
        <label class="tog"><input type="checkbox" data-c="warp"> Time warp anywhere (even in air or near the ground)</label>
        <div class="row"><label>Thrust ×</label><input type="range" id="adThr" min="1" max="20" step="1" value="1"><span id="adThrV">1×</span></div>
      </section>
      <section><h4>Program</h4>
        <div class="row"><button class="ab" data-a="sci1">+1,000 science</button><button class="ab" data-a="sci2">+100,000</button></div>
        <div class="row"><button class="ab" data-a="tech">Unlock all tech</button><button class="ab" data-a="crew">Crew ready</button><button class="ab" data-a="missions">Finish missions</button></div>
      </section>
      <section><h4>World &amp; display</h4>
        <div class="row"><button class="ab" data-a="noon">Noon</button><button class="ab" data-a="sunset">Sunset</button><button class="ab" data-a="night">Midnight</button></div>
        <div class="row"><label>Clouds</label><input type="range" id="adCloud" min="-0.4" max="0.5" step="0.05" value="0"><span id="adCloudV">normal</span></div>
        <label class="tog"><input type="checkbox" id="adHud"> Show FPS and flight readout</label>
      </section>
      <div id="adStatus"></div>`;
    document.body.appendChild(el);
    hud = document.createElement('div'); hud.id = 'adminHud'; hud.hidden = true; document.body.appendChild(hud);
    const q = s => el.querySelector(s);
    const altHint = () => { const b = Bodies.byId[q('#adBody').value]; q('#adAltHint').textContent = `Auto altitude for ${b.name}: ${fmtKm(safeAlt(b))}${b.atmH ? ` (air ends at ${fmtKm(b.atmH)})` : ''}.`; };
    q('#adBody').onchange = altHint; altHint();
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const a = b.dataset.a, qk = b.dataset.q;
      const alt = parseFloat(q('#adAlt').value), inc = parseFloat(q('#adInc').value) || 0;
      if (qk) { q('#adBody').value = qk; altHint(); return toOrbit(qk, 0, 0); }
      const A = {
        close: hide, orbit: () => toOrbit(q('#adBody').value, isFinite(alt) ? alt * 1000 : 0, inc),
        orbitSun: () => {
          // a circular solar orbit just behind Earth, clear of its sphere of influence
          const v = ensureVessel(); if (!v) return;
          const E = Bodies.byId.earth, S = Bodies.byId.sun, fwd = E.vel.clone().normalize();
          v.body = 'sun'; v.r.copy(E.pos).addScaledVector(fwd, -E.soi * 3);
          const dir = fwd.clone().addScaledVector(v.r.clone().normalize(), -fwd.dot(v.r.clone().normalize())).normalize();
          v.v.copy(dir).multiplyScalar(Math.sqrt(S.GM / v.r.length())); v.q.setFromUnitVectors(new V3(0, 1, 0), dir); settle(v);
          say(`${esc(v.name)} is orbiting the Sun just behind Earth, ${fmtNum(v.r.length() / 1e9, 1)} million km out.`);
        },
        land: () => toSurface(q('#adLand').value, parseFloat(q('#adLat').value) || 0, parseFloat(q('#adLon').value) || 0),
        landRandom: () => { const la = Math.round((Math.random() * 120 - 60) * 10) / 10, lo = Math.round((Math.random() * 360 - 180) * 10) / 10; q('#adLat').value = la; q('#adLon').value = lo; toSurface(q('#adLand').value, la, lo); },
        toVessel: () => toVessel(+q('#adVes').value),
        refill, repair, circ: circularize, up: () => raise(100000), down: () => raise(-100000), stop: stopMotion, killrot: killRot,
        sci1: () => addScience(1000), sci2: () => addScience(100000), tech: unlockAll, crew: crewReady, missions: finishMissions,
        noon: () => setDayTime('noon'), sunset: () => setDayTime('sunset'), night: () => setDayTime('midnight'),
      };
      if (A[a]) { try { A[a](); } catch (err) { console.error(err); say('That did not work: ' + err.message, 'bad'); } refreshVessels(); }
    });
    el.querySelectorAll('[data-c]').forEach(cb => cb.onchange = () => { Cheats[cb.dataset.c] = cb.checked; say(`${cb.parentElement.textContent.trim()}: ${cb.checked ? 'on' : 'off'}.`, 'info'); });
    q('#adThr').oninput = () => { Cheats.thrust = +q('#adThr').value; q('#adThrV').textContent = Cheats.thrust + '×'; };
    q('#adCloud').oninput = () => { const x = +q('#adCloud').value; Clouds.cover = x; q('#adCloudV').textContent = x === 0 ? 'normal' : (x > 0 ? '+' : '') + Math.round(x * 100) + '%'; };
    q('#adHud').onchange = () => { hudOn = q('#adHud').checked; hud.hidden = !hudOn; };
    // typing in the panel must not fly the rocket
    el.addEventListener('keydown', e => { if (e.key !== 'Escape') e.stopPropagation(); });
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
  }
  function refreshVessels() {
    if (!el) return;
    const s = el.querySelector('#adVes'), cur = s.value;
    const list = Game.vessels.filter(o => !o.dead && o.id !== Game.activeId && o.type !== 'flag');
    s.innerHTML = list.length ? list.map(o => `<option value="${o.id}">${esc(o.name)} (${o.landed ? 'on ' : 'at '}${Bodies.byId[o.body].name})</option>`).join('') : '<option value="">No other vessels</option>';
    if (cur) s.value = cur;
  }
  function show() { if (!el) build(); el.hidden = false; open = true; refreshVessels(); el.querySelectorAll('[data-c]').forEach(cb => cb.checked = !!Cheats[cb.dataset.c]); }
  function hide() { if (el) el.hidden = true; open = false; }
  function toggle() { open ? hide() : show(); if (open) say('Admin tools open. Type ADMIN again or press Esc to close.', 'info'); }

  // ---------- the A-D-M-I-N trigger ----------
  // Runs before the game's own key handling. Once "a-d" has been typed, the following m, i and n are
  // swallowed so the secret word doesn't also open the map or fire RCS.
  let buf = '', lastT = 0;
  window.addEventListener('keydown', e => {
    if (open && e.key === 'Escape') { hide(); e.stopImmediatePropagation(); e.preventDefault(); return; }
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const k = (e.key || '').toLowerCase();
    const now = performance.now();
    if (now - lastT > 1500) buf = '';
    lastT = now;
    if ('admin'.startsWith(buf + k)) {
      buf += k;
      if (buf.length >= 3) { e.stopImmediatePropagation(); e.preventDefault(); }
      if (buf === 'admin') { buf = ''; toggle(); }
    } else buf = k === 'a' ? 'a' : '';
  }, true);
  requestAnimationFrame(tickHud);

  return { show, hide, toggle, toOrbit, toSurface, toVessel, refill, repair, get open() { return open; } };
})();
