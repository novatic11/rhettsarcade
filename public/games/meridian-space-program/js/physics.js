'use strict';
// ---------- Flight physics: forces, engines, heat, staging, contact, rails ----------
// Vessel frame: +Y nose, +X right, -Z top. v.r is the position of the vessel's local
// origin relative to its SOI body (inertial axes); v.v its velocity.
// Admin-panel cheats; they only ever apply to the vessel you are flying.
const Cheats = { god: false, fuel: false, thrust: 1, warp: false };
const cheatOn = (v, k) => !!(Cheats[k] && v && typeof Game !== 'undefined' && v.id === Game.activeId);
const Phys = (function () {
  const _a = new V3(), _b = new V3(), _c = new V3(), _q = new Q4(), _m = new THREE.Matrix4();
  const Y = new V3(0, 1, 0);
  const frameQ = (B, t, out) => { out = out || new Q4(); return out.setFromAxisAngle(Y, Bodies.rotAngle(B, t)).premultiply(B.tiltQ); };
  // ----- cached mass properties -----
  function props(v) {
    if (v.type === 'eva') return { m: 0.094, com: new V3(), L: 1.8, r: 0.35, I: 0.05, Iroll: 0.03, ext: { minY: -0.95, maxY: 0.95, pts: [new V3(0, -0.95, 0)], rad: 0.4, len: 1.9 } };
    const { m, com } = Vessel.mass(v);
    const ext = Vessel.extents(v);
    const L = Math.max(0.5, ext.len), r = Math.max(0.3, ext.rad);
    return { m, com, L, r, I: m * (L * L / 12 + r * r / 4) + 0.01, Iroll: m * r * r / 2 + 0.01, ext };
  }
  function partQ(p) { return p.q ? _q.fromArray(p.q) : null; }
  function partDir(v, p, out) { out.set(0, 1, 0); if (p.q) out.applyQuaternion(new Q4().fromArray(p.q)); return out.applyQuaternion(v.q); }
  // COM in world (relative to body)
  function comW(v, pr, out) { return (out || new V3()).copy(pr.com).applyQuaternion(v.q).add(v.r); }
  // ----- topology -----
  function components(v, forFuel) { return Perf.components(v.parts.map(p => ({ iid: p.iid, part: PARTS[p.pid] || { type: 'x' } })), v.links, () => true, forFuel); }
  function invalidate(v) { v._fuel = null; v._props = null; v._pm = null; }
  function fuelComp(v) { if (!v._fuel) v._fuel = components(v, true); return v._fuel; }
  // ----- electricity: one shared pool -----
  function ecTotals(v) { let a = 0, c = 0; for (const p of v.parts) if (p.cap.EC) { a += p.res.EC || 0; c += p.cap.EC; } return { a, c }; }
  function ecChange(v, amt) {
    // positive adds, negative drains; returns amount actually applied
    if (amt < 0 && cheatOn(v, 'fuel')) return amt;
    let { a, c } = ecTotals(v);
    if (amt < 0 && a <= 0) return 0;
    const target = clamp(a + amt, 0, c);
    const k = c > 0 ? target / c : 0;
    for (const p of v.parts) if (p.cap.EC) p.res.EC = p.cap.EC * k;
    return target - a;
  }
  // drain resource from the tanks an engine can reach
  function poolAmount(v, p, res) {
    if (PARTS[p.pid].type === 'srb') return p.res[res] || 0;
    const fc = fuelComp(v), c = fc[p.iid];
    let s = 0; for (const q of v.parts) if (fc[q.iid] === c && q.res[res] > 0 && PARTS[q.pid].type !== 'srb') s += q.res[res];
    return s;
  }
  function drain(v, p, res, amt) {
    if (cheatOn(v, 'fuel')) return;
    if (PARTS[p.pid].type === 'srb') { p.res[res] = Math.max(0, (p.res[res] || 0) - amt); return; }
    const fc = fuelComp(v), c = fc[p.iid];
    let s = 0; const ts = [];
    for (const q of v.parts) if (fc[q.iid] === c && q.res[res] > 0 && PARTS[q.pid].type !== 'srb') { s += q.res[res]; ts.push(q); }
    if (s <= 0) return;
    const k = Math.max(0, 1 - amt / s);
    for (const q of ts) q.res[res] *= k;
  }
  function sunInfo(v) {
    const B = Bodies.byId[v.body], S = Bodies.starOf(B);
    const helio = _a.copy(v.r).add(B.pos);
    const dReal = helio.distanceTo(S.pos);
    // a dimmer star acts like the Sun seen from farther away: same flux and temperature formulas
    const dSun = dReal / Math.sqrt(S.lum || 1);
    // shadow test against current body (and parent planet when orbiting a moon)
    const toSun = _b.copy(S.pos).sub(helio).normalize();
    let lit = true;
    for (const C of [B, B.parent]) {
      if (!C || C.type === 'star') continue;
      const rel = _c.copy(helio).sub(C.pos);
      const t = -rel.dot(toSun);
      if (t < 0) { const perp = rel.clone().addScaledVector(toSun, t).length(); if (perp < C.R) lit = false; }
    }
    return { dSun, lit, flux: Math.min(6, Math.pow(1.496e10 / dSun, 2)) };
  }
  // ----- per-step environment -----
  function env(v, t) {
    const B = Bodies.byId[v.body];
    const rl = v.r.length();
    const alt = rl - B.R;
    const rho = Bodies.density(B, Math.max(alt, -1e5));
    const up = _a.copy(v.r).divideScalar(rl).clone();
    const sv = Bodies.surfVel(B, v.r, new V3());
    const vAir = v.v.clone().sub(sv);
    return { B, alt, rho, up, vAir, sv, atm: B.atm && !B.atm.trace ? clamp(rho / 1.225, 0, 1) : 0, q: 0.5 * rho * vAir.lengthSq() };
  }

  // ----- engines -----
  function engines(v, e, dt, apply) {
    let F = new V3(), Fmag = 0, ecNeed = 0, heat = 0, solid = 0, firing = [];
    const fwd = new V3();
    for (const p of v.parts) {
      const P = PARTS[p.pid];
      if (!P.eng || !p.active) continue;
      if (P.deploy && !p.deployed) continue; // light sail: no thrust until the membrane is out
      const E = P.eng;
      const thr = E.srb ? 1 : v.throttle;
      p.firing = 0;
      if (thr <= 0) continue;
      if (E.noAtm && e.rho > 0.0005) { if (apply && !p.warnedAtm) { p.warnedAtm = true; toast(`${P.name} cannot run inside an atmosphere.`, 'warn'); } continue; }
      p.warnedAtm = false;
      const fuels = Object.keys(E.fuel); const tot = fuels.reduce((a, k) => a + E.fuel[k], 0);
      const mdot = E.thr * p.limit * thr / (E.ispV * G0);
      let ok = true;
      for (const k of fuels) if (poolAmount(v, p, k) <= 1e-9) ok = false;
      if (E.ec) { const { a } = ecTotals(v); if (a < E.ec * thr * dt + 0.01) { ok = false; if (apply && !p.warnedEc) { p.warnedEc = true; toast(`${P.name} has no power: it needs ${E.ec} EC/s.`, 'warn'); } } else p.warnedEc = false; }
      if (!ok) { if (apply && !p.flamedOut) { p.flamedOut = true; if (!E.ec) toast(`${P.name} flamed out: out of fuel.`, 'info', 2500); } continue; }
      p.flamedOut = false;
      const isp = lerp(E.ispV, E.ispA, e.atm);
      const f = E.thr * p.limit * thr * (isp / E.ispV) * (cheatOn(v, 'thrust') ? Cheats.thrust : 1);
      partDir(v, p, fwd);
      F.addScaledVector(fwd, f); Fmag += f;
      if (E.srb) solid += f;
      p.firing = thr;
      firing.push(p);
      if (apply) {
        for (const k of fuels) drain(v, p, k, mdot * dt * E.fuel[k] / tot);
        if (E.ec) ecChange(v, -E.ec * thr * dt);
      }
      if (E.heat) heat += E.heat * thr;
    }
    if (apply && firing.length) invalidateMass(v);
    return { F, Fmag, solid, heat, firing };
  }
  function invalidateMass(v) { v._props = null; }
  function getProps(v) { if (!v._props) v._props = props(v); return v._props; }

  // ----- aerodynamics -----
  function aero(v, e, pr) {
    const fwd = _b.set(0, 1, 0).applyQuaternion(v.q).clone();
    const sp = e.vAir.length();
    const out = { drag: new V3(), torque: new V3(), cdA: 0, aoa: 0, fwdDot: 1 };
    if (e.rho <= 0 || sp < 0.01) return out;
    const dir = e.vAir.clone().divideScalar(sp);
    const c = clamp(fwd.dot(dir), -1, 1);
    out.fwdDot = c; out.aoa = Math.acos(c);
    // reference areas
    let rmax = 0.3, fins = 0, top = null, bottom = null;
    for (const p of v.parts) {
      const P = PARTS[p.pid];
      if (P.type === 'fin') fins += P.stab;
      if (p.inFairing && fairingOn(v, p.inFairing)) continue;
      if (!P.surf) rmax = Math.max(rmax, Math.hypot(p.pos.x, p.pos.z) + Math.max(P.r, P.rb));
      if (!top || p.pos.y > top.pos.y) top = p;
      if (!bottom || p.pos.y < bottom.pos.y) bottom = p;
    }
    for (const p of v.parts) if (p.fair && p.fair.on) rmax = Math.max(rmax, p.fair.r);
    const Af = Math.PI * rmax * rmax;
    const nose = top && ['nose', 'pod', 'probe', 'chute'].includes(PARTS[top.pid].type) || v.parts.some(p => p.fair && p.fair.on);
    const cdF = c > 0 ? (nose ? 0.32 : 0.75) : 1.05;
    const side = pr.L * 2 * rmax;
    let cdA = cdF * Af * c * c + 0.9 * side * (1 - c * c);
    // parachutes
    for (const p of v.parts) {
      const P = PARTS[p.pid];
      if (!P.chute) continue;
      if (p.chute === 'semi') cdA += P.chute.area * (P.chute.drogue ? 0.6 : 0.06);
      if (p.chute === 'open') cdA += P.chute.area;
    }
    if (v.type === 'eva') cdA = 0.8;
    out.cdA = cdA;
    out.drag.copy(dir).multiplyScalar(-e.q * cdA / 1000); // kN
    // weathervane torque: + aligns nose into the airflow (fins), - flips (bare capsules fly heat-shield first)
    const Cs = fins * 0.9 - 0.25;
    const axis = new V3().crossVectors(fwd, dir);
    const s = axis.length();
    if (s > 1e-6) {
      axis.divideScalar(s);
      const k = e.q * Af * pr.L * Cs * 0.06 / 1000 * Math.sin(out.aoa) * (c > 0 ? 1 : -1);
      out.torque.copy(axis).multiplyScalar(k);
    }
    // open chutes pull the vessel upright behind them
    if (v.parts.some(p => p.chute === 'open' || p.chute === 'semi')) { const ax2 = new V3().crossVectors(fwd, dir.clone().negate()); out.torque.addScaledVector(ax2, e.q * 0.02); }
    return out;
  }
  function fairingOn(v, iid) { const f = Vessel.pmap(v)[iid]; return f && f.fair && f.fair.on; }

  // ----- attitude control -----
  function control(v, e, dt, ctl, pr, eng, aeroT) {
    const ctrl = Vessel.hasControl(v, ecTotals(v).a > 0.01);
    let torque = 0;
    if (ctrl === 'crew' || ctrl === 'probe') {
      for (const p of v.parts) { const P = PARTS[p.pid]; if (P.torque && P.type !== 'rcs') torque += P.torque; if (P.type === 'rcs' && v.rcs && poolAmount(v, p, 'MP') > 0) torque += P.torque; if (P.ctrl) torque += e.q * P.ctrl * 0.00012; }
      if (eng.Fmag > 0) for (const p of eng.firing) { const P = PARTS[p.pid]; if (P.eng.gimbal) torque += P.eng.thr * p.limit * Math.sin(P.eng.gimbal * DEG) * Math.abs(p.pos.y - pr.com.y) * 0.8; }
    }
    if (ctrl === 'probe' || ctrl === 'crew') v.noControlReason = null; else v.noControlReason = ctrl === 'nopower' ? 'No power: the probe core cannot steer.' : 'No command part: this vessel cannot be controlled.';
    const amax = torque / pr.I, rmax = torque / pr.Iroll;
    const w = v.w; // local angular velocity
    let u = new V3(ctl.pitch, ctl.roll, ctl.yaw);
    const manual = u.lengthSq() > 0;
    // SAS
    let des = null;
    if (!manual && v.sas && ctrl && ctrl !== 'nopower') {
      const tgt = sasTarget(v, e);
      if (tgt) {
        const fwd = new V3(0, 1, 0).applyQuaternion(v.q);
        const err = new V3().crossVectors(fwd, tgt);
        const ang = Math.acos(clamp(fwd.dot(tgt), -1, 1));
        if (err.lengthSq() < 1e-12 && ang > 3) err.set(1, 0, 0).applyQuaternion(v.q);
        err.normalize().multiplyScalar(ang);
        const loc = err.applyQuaternion(v.q.clone().invert());
        des = new V3(loc.x, 0, loc.z).multiplyScalar(1.6);
        const lim = Math.sqrt(2 * Math.max(amax, 0.02) * Math.max(ang, 1e-4));
        if (des.length() > lim) des.setLength(lim);
      } else des = new V3(0, 0, 0);
      if (!v.sasHold && v.sasMode === 'stab') v.sasHold = v.q.clone();
    }
    if (manual) v.sasHold = null;
    if (v.sas && v.sasMode === 'stab' && !manual && v.sasHold && !des) des = new V3();
    const wEC = (ctrl === 'probe' || ctrl === 'crew');
    let used = 0;
    if (manual) {
      if (wEC) { w.x += u.x * amax * dt; w.z += u.z * amax * dt; w.y += u.y * rmax * dt; used = u.length(); }
    } else if (des && wEC) {
      const dx = des.x - w.x, dz = des.z - w.z, dy = -w.y;
      w.x += clamp(dx * 4, -amax, amax) * dt; w.z += clamp(dz * 4, -amax, amax) * dt; w.y += clamp(dy * 4, -rmax, rmax) * dt;
      used = Math.min(1, (Math.abs(dx) + Math.abs(dz)) * 2);
    }
    // wheels consume charge while working
    if (used > 0) for (const p of v.parts) { const P = PARTS[p.pid]; if (P.type === 'wheel') ecChange(v, -P.ecUse * used * dt); if (P.type === 'rcs' && v.rcs) drain(v, p, 'MP', 0.0004 * used * dt); }
    // aero torque (world) -> local
    if (aeroT.lengthSq() > 0) { const lt = aeroT.clone().applyQuaternion(v.q.clone().invert()); w.x += lt.x / pr.I * dt; w.z += lt.z / pr.I * dt; w.y += lt.y / pr.Iroll * dt; }
    // aerodynamic damping and limits
    const damp = 1 / (1 + e.q * 1e-5 * dt);
    w.multiplyScalar(damp);
    if (w.length() > 2.5) w.setLength(2.5);
    // integrate rotation about the COM
    const cw = comW(v, pr);
    const dq = new Q4().setFromEuler(new THREE.Euler(w.x * dt, w.y * dt, w.z * dt, 'XYZ'));
    v.q.multiply(dq).normalize();
    v.r.copy(cw).sub(pr.com.clone().applyQuaternion(v.q));
    return ctrl;
  }
  const _t = new V3();
  function sasTarget(v, e) {
    const B = Bodies.byId[v.body];
    const vo = v.speedMode === 'orbit' ? v.v : e.vAir;
    switch (v.sasMode) {
      case 'stab': return v.sasHold ? new V3(0, 1, 0).applyQuaternion(v.sasHold) : null;
      case 'pro': return vo.lengthSq() > 0.01 ? vo.clone().normalize() : null;
      case 'retro': return vo.lengthSq() > 0.01 ? vo.clone().normalize().negate() : null;
      case 'nrm': return new V3().crossVectors(v.r, v.v).normalize();
      case 'anti': return new V3().crossVectors(v.r, v.v).normalize().negate();
      case 'radout': { const b = Orbit.basis(v.r, v.v); return b.rad; }
      case 'radin': { const b = Orbit.basis(v.r, v.v); return b.rad.negate(); }
      case 'up': return v.r.clone().normalize();
      case 'target': { const T = targetPos(v); return T ? T.sub(v.r).normalize() : null; }
      case 'node': return v.node && v.node.dvRem && v.node.dvRem.lengthSq() > 1e-6 ? v.node.dvRem.clone().normalize() : null;
    }
    return null;
  }
  function targetPos(v) {
    if (!v.target) return null;
    if (v.target.body) { const T = Bodies.byId[v.target.body]; const B = Bodies.byId[v.body]; return T.pos.clone().sub(B.pos); }
    const o = Game.vessels.find(x => x.id === v.target.vessel); if (!o) return null;
    const B = Bodies.byId[v.body], OB = Bodies.byId[o.body];
    return o.r.clone().add(OB.pos).sub(B.pos);
  }

  // ----- heat -----
  function heatStep(v, e, dt, aer, eng, events) {
    const sp = e.vAir.length();
    const si = sunInfo(v);
    const Tamb = Bodies.ambientTemp(e.B, e.alt, si.dSun) * (si.lit ? 1 : 0.85);
    const Tstag = Tamb + (e.rho > 0 ? sp * sp / 2008 : 0);
    const hrate = 7e-4 * Math.sqrt(Math.max(e.rho, 0)) * sp;
    let lead = null, mode = 'side';
    if (e.rho > 0 && sp > 50) {
      if (aer.fwdDot > 0.5) mode = 'nose'; else if (aer.fwdDot < -0.5) mode = 'tail';
      let best = -1e9;
      for (const p of v.parts) {
        if (p.inFairing && fairingOn(v, p.inFairing)) continue;
        const y = mode === 'nose' ? p.pos.y + PARTS[p.pid].h / 2 : -(p.pos.y - PARTS[p.pid].h / 2);
        if (mode !== 'side' && y > best && !PARTS[p.pid].surf) { best = y; lead = p; }
      }
    }
    let shielded = false;
    if (lead && PARTS[lead.pid].type === 'shield' && lead.ablator > 0) shielded = true;
    v.heatFlux = Tstag > 700 ? hrate * (Tstag - 700) : 0;
    // waste heat from reactors/engines
    let cool = 0, wheat = eng.heat;
    for (const p of v.parts) { const P = PARTS[p.pid]; if (P.cool && (!P.deploy || p.deployed)) cool += P.cool; if (P.type === 'reactor' && p.reactorOn !== false) wheat += P.heat; }
    const excess = Math.max(0, wheat - cool);
    let hottest = 0, hotPart = null;
    for (const p of v.parts) {
      const P = PARTS[p.pid];
      let rate;
      const enclosed = p.inFairing && fairingOn(v, p.inFairing);
      if (enclosed) rate = hrate * 0.02;
      else if (mode === 'side') rate = hrate * 0.55;
      else if (p === lead) rate = hrate;
      else rate = hrate * (shielded ? 0.025 : 0.14);
      let target = Tstag;
      if (rate > 0 && target > p.temp) p.temp += (target - p.temp) * Math.min(1, rate * dt);
      else p.temp += (Tamb - p.temp) * Math.min(1, (0.012 + rate) * dt);
      if (p === lead && shielded) {
        const burn = Math.max(0, p.temp - 1300) * hrate * 0.05 * dt;
        p.ablator = Math.max(0, p.ablator - burn);
        p.temp = Math.min(p.temp, 1650 + (p.ablator <= 0 ? 2000 : 0));
      }
      if (excess > 0 && (P.eng && P.eng.heat && p.firing || P.type === 'reactor')) p.temp += excess * 0.25 * dt;
      const fr = p.temp / P.maxTemp;
      if (fr > hottest) { hottest = fr; hotPart = p; }
      if (p.temp > P.maxTemp) { if (cheatOn(v, 'god')) p.temp = P.maxTemp * 0.98; else events.push({ kind: 'overheat', p, msg: overheatMsg(v, p, P, mode, shielded, excess) }); }
    }
    v.hottest = hottest; v.hotPart = hotPart; v.heatMode = mode; v.shielded = shielded; v.wasteHeat = { gen: wheat, cool };
  }
  function overheatMsg(v, p, P, mode, shielded, excess) {
    if (excess > 0 && (P.eng || P.type === 'reactor')) return `${P.name} overheated from waste heat (${fmtInt(p.temp)} K, limit ${fmtInt(P.maxTemp)} K). Add radiators or burn in shorter bursts.`;
    if (Bodies.byId[v.body].type === 'star') return `${P.name} melted this close to the Sun (${fmtInt(p.temp)} K). Stay farther out.`;
    const fix = v.parts.some(q => PARTS[q.pid].type === 'shield') ? 'Point the heat shield into the airflow (hold Retrograde) and come in shallower.' : 'Add a heat shield below the capsule, hold Retrograde, and enter at a shallower angle.';
    return `${P.name} burned up during atmospheric entry (${fmtInt(p.temp)} K, limit ${fmtInt(P.maxTemp)} K). ${fix}`;
  }

  // ----- parachutes -----
  function chutes(v, e, events) {
    const sp = e.vAir.length();
    for (const p of v.parts) {
      const P = PARTS[p.pid];
      if (!P.chute || !p.chute || p.chute === 'stowed' || p.chute === 'cut') continue;
      const safe = P.chute.drogue ? 600 : 250;
      const ground = v.agl != null ? v.agl : e.alt;
      if (p.chute === 'armed') {
        if (e.rho > 0.004 && sp < safe) { p.chute = P.chute.drogue ? 'open' : 'semi'; Sound.fx.chute(); toast(`${P.name} ${P.chute.drogue ? 'opened' : 'semi-deployed'}`, 'info', 1800); }
      } else if (p.chute === 'semi') {
        if (ground < 1000 || (sp < 60 && ground < 3000)) { p.chute = 'open'; Sound.fx.chute(); toast(`${P.name} fully open`, 'info', 1800); }
        if (sp > safe * 1.8) { p.chute = 'cut'; events.push({ kind: 'chuteTorn', p, msg: `${P.name} was torn away: opened at ${fmtInt(sp)} m/s.` }); }
      } else if (p.chute === 'open') {
        if (sp > (P.chute.drogue ? 900 : 380)) { p.chute = 'cut'; events.push({ kind: 'chuteTorn', p, msg: `${P.name} was ripped off at ${fmtInt(sp)} m/s.` }); }
      }
    }
  }

  // ----- surface contact -----
  function contact(v, e, t, pr, events) {
    const B = e.B;
    if (!B.solid) {
      if (B.atm && e.alt < B.atm.crush) events.push({ kind: 'destroy', msg: `Crushed in ${B.name}'s deep atmosphere. Gas giants have no surface: the pressure keeps rising until the hull fails.` });
      if (B.type === 'star' && e.alt < 0) events.push({ kind: 'destroy', msg: 'Flew into the Sun.' });
      v.agl = e.alt; return;
    }
    if (e.alt > B.maxTerrain + pr.L + 50) { v.agl = e.alt - Math.max(0, B.terrain ? 0 : 0); v.aglValid = false; return; }
    const s = Terrain.surface(B, v.r, t);
    const up = e.up;
    let minProj = Infinity;
    for (const pt of pr.ext.pts) { const d = _c.copy(pt).applyQuaternion(v.q).add(v.r).sub(v.r).dot(up); if (d < minProj) minProj = d; }
    const groundR = B.R + s.h;
    const agl = v.r.dot(up) + minProj - groundR;
    v.agl = agl; v.aglValid = true; v.waterBelow = s.water;
    if (agl > 0) return;
    const vRel = v.v.clone().sub(e.sv);
    const vn = vRel.dot(up), vt = vRel.clone().addScaledVector(up, -vn).length();
    let impact = Math.sqrt(Math.max(0, -vn) ** 2 + vt * vt * 0.5);
    if (cheatOn(v, 'god')) impact = Math.min(impact, 0.4); // indestructible: every touchdown is a gentle one
    let tol = 5;
    const legs = v.parts.filter(p => PARTS[p.pid].type === 'leg' && p.deployed);
    if (legs.length >= 3) tol = Math.min(...legs.map(p => PARTS[p.pid].tol));
    else { let low = null; for (const p of v.parts) if (!low || p.pos.y < low.pos.y) low = p; tol = low ? PARTS[low.pid].tol : 6; }
    if (v.type === 'eva') tol = 14;
    if (s.water) tol *= 1.5;
    // push out of the ground
    v.r.addScaledVector(up, -agl);
    if (impact > tol * 2.2) { events.push({ kind: 'destroy', msg: `Crashed into ${s.water ? 'the ocean' : B.name} at ${fmtNum(impact, 1)} m/s. ${legs.length >= 3 ? 'The legs' : 'This vessel'} can survive about ${fmtNum(tol, 0)} m/s. ${B.atm && !B.atm.trace ? 'Use parachutes or a braking burn.' : 'Burn retrograde to slow down before touchdown.'}` }); return; }
    if (impact > tol) {
      // lose the lowest parts, then settle
      let lowY = Infinity; for (const p of v.parts) lowY = Math.min(lowY, p.pos.y - PARTS[p.pid].h / 2);
      const broken = v.parts.filter(p => p.pos.y - PARTS[p.pid].h / 2 < lowY + 0.4 && p.iid !== v.root);
      events.push({ kind: 'break', parts: broken, msg: `Hard landing at ${fmtNum(impact, 1)} m/s broke ${broken.length} part${broken.length === 1 ? '' : 's'} (safe limit ${fmtNum(tol, 0)} m/s).` });
    }
    if (impact < 0.5 || Math.abs(vn) < 0.6 || impact <= tol) {
      // land: match the rotating surface
      v.v.copy(e.sv);
      v.landed = true; v.splashed = !!s.water;
      v.w.set(0, 0, 0);
      setLandedFrame(v, t);
      if (impact > 1) Sound.fx.thud();
    } else {
      v.v.copy(e.sv).addScaledVector(up, Math.max(0, -vn) * 0.2);
    }
  }
  function setLandedFrame(v, t) {
    const B = Bodies.byId[v.body];
    const fq = frameQ(B, t).invert();
    v.landedBF = v.r.clone().applyQuaternion(fq);
    v.landedQ = fq.clone().multiply(v.q);
  }
  function landedStep(v, t, dt, ctl, eng) {
    const B = Bodies.byId[v.body];
    const fq = frameQ(B, t);
    // keep on the ground (terrain can refine after loading)
    const pr = getProps(v);
    if (B.solid) {
      const dir = v.landedBF.clone().normalize();
      let h = Terrain.groundH(B, dir, 0.5); let water = false;
      if (B.ocean && h < 0) { h = 0; water = true; }
      let minProj = Infinity;
      const qBF = v.landedQ;
      for (const pt of pr.ext.pts) { const d = _c.copy(pt).applyQuaternion(qBF).dot(dir); if (d < minProj) minProj = d; }
      const r0 = v.landedBF.dot(dir);
      const target = B.R + h - minProj;
      v.landedBF.addScaledVector(dir, (target - r0));
      // legs (or a wide base) keep it upright; ease toward local vertical
      const upL = new V3(0, 1, 0).applyQuaternion(qBF);
      if (upL.dot(dir) < 0.9995 && (v.parts.some(p => PARTS[p.pid].type === 'leg' && p.deployed) || v.type === 'eva' || upL.dot(dir) > 0.5)) {
        const corr = new Q4().setFromUnitVectors(upL, dir);
        const qq = new Q4().slerp(corr, Math.min(1, dt * 1.5));
        v.landedQ.premultiply(qq).normalize();
      }
      v.splashed = water;
    }
    v.r.copy(v.landedBF).applyQuaternion(fq);
    v.q.copy(fq).multiply(v.landedQ);
    v.v.copy(Bodies.surfVel(B, v.r, new V3()));
    // liftoff when thrust beats weight
    if (eng && eng.Fmag > 0) {
      const up = v.r.clone().normalize();
      const g = B.GM / v.r.lengthSq();
      const a = eng.F.dot(up) / pr.m;
      if (a > g * 1.0) { v.landed = false; v.splashed = false; v.v.addScaledVector(up, 0.5); v.r.addScaledVector(up, 0.05); }
    }
  }

  // ----- SOI transitions -----
  function soiCheck(v, t) {
    const B = Bodies.byId[v.body];
    if (v.r.length() > B.soi && B.parent) {
      v.r.add(Bodies.relPos(B, t, _a)); v.v.add(Bodies.relVel(B, t, _b));
      v.body = B.parent.id; return 'exit';
    }
    for (const c of B.children) {
      const rel = _a.copy(v.r).sub(Bodies.relPos(c, t, _b));
      if (rel.length() < c.soi) {
        v.r.copy(rel); v.v.sub(Bodies.relVel(c, t, _b));
        v.body = c.id; return 'enter';
      }
    }
    return null;
  }

  // ----- full physics step for a loaded vessel -----
  function step(v, t, dt, ctl) {
    const events = [];
    if (v.dead) return events;
    const B = Bodies.byId[v.body];
    if (v.type === 'eva') return Eva.step(v, t, dt, ctl, events);
    const pr = getProps(v);
    const e = env(v, t);
    const eng = engines(v, e, dt, true);
    if (v.landed) {
      landedStep(v, t, dt, ctl, eng);
      powerStep(v, dt, events);
      if (v.landed) { heatStep(v, env(v, t), dt, { fwdDot: 1 }, eng, events); return events; }
    }
    const aer = aero(v, e, pr);
    control(v, e, dt, ctl, pr, eng, aer.torque);
    // translation (RCS translate)
    const acc = new V3();
    if (v.rcs && ctl.trans && ctl.trans.lengthSq() > 0) {
      let thr = 0; for (const p of v.parts) if (PARTS[p.pid].type === 'rcs' && poolAmount(v, p, 'MP') > 0) { thr += PARTS[p.pid].rcs; drain(v, p, 'MP', 0.0005 * dt); }
      if (thr > 0) acc.addScaledVector(ctl.trans.clone().applyQuaternion(v.q), thr / pr.m);
    }
    const rl = v.r.length();
    acc.addScaledVector(v.r, -B.GM / (rl * rl * rl));
    acc.addScaledVector(eng.F, 1 / pr.m).addScaledVector(aer.drag, 1 / pr.m);
    v.gforce = (eng.F.length() + aer.drag.length()) / pr.m / G0;
    if (v.node && v.node.dvRem && eng.Fmag > 0) v.node.dvRem.addScaledVector(eng.F, -dt / pr.m);
    v.v.addScaledVector(acc, dt);
    v.r.addScaledVector(v.v, dt);
    chutes(v, e, events);
    heatStep(v, e, dt, aer, eng, events);
    powerStep(v, dt, events);
    contact(v, env(v, t), t, pr, events);
    const s = soiCheck(v, t);
    if (s) events.push({ kind: 'soi', dir: s });
    v.lastAero = aer; v.lastEnv = e; v.lastEng = eng;
    return events;
  }
  function powerStep(v, dt, events) {
    let gen = 0, use = 0;
    const si = sunInfo(v);
    for (const p of v.parts) {
      const P = PARTS[p.pid];
      if (P.type === 'solar' && (!P.deploy || p.deployed) && si.lit) gen += P.gen * si.flux * (P.deploy ? 1 : 0.7);
      if (P.type === 'rtg') gen += P.gen;
      if (P.type === 'reactor') gen += P.gen;
      if (P.ecUse && P.type !== 'wheel') use += P.ecUse;
    }
    const { a, c } = ecTotals(v);
    for (const p of v.parts) {
      const P = PARTS[p.pid];
      if (P.type === 'fuelcell' && c > 0 && a / c < 0.9 && poolAmount(v, p, 'LFO') > 0) { gen += P.gen; drain(v, p, 'LFO', P.burn.LFO * dt); }
    }
    v.ecGen = gen; v.ecUse = use; v.sunlit = si.lit; v.sunFlux = si.flux;
    ecChange(v, (gen - use) * dt);
    // antimatter containment
    for (const p of v.parts) if (p.pid === 'trap_am' && p.res.AM > 1e-7 && ecTotals(v).a <= 0.01) events.push({ kind: 'destroy', msg: 'Antimatter containment failed: the Penning trap lost power. Keep a reactor or generator running at all times.' });
  }

  // ----- staging -----
  function stage(v, t) {
    if (v.stageIdx >= v.stages.length) { toast('No more stages.', 'info', 1500); return []; }
    const uids = new Set(v.stages[v.stageIdx]);
    v.stageIdx++;
    const made = [];
    Sound.fx.stage();
    const pm = Vessel.pmap(v);
    const decs = [];
    for (const p of v.parts) {
      if (!uids.has(p.uid)) continue;
      const P = PARTS[p.pid];
      if (P.eng) { p.active = true; if (v.throttle <= 0 && !P.eng.srb) { } }
      if (P.type === 'decoupler' || P.type === 'rdecoupler') decs.push(p);
      if (P.chute && p.chute === 'stowed') { p.chute = 'armed'; toast(`${P.name} armed: it will open once the air is thick enough and you are below ${P.chute.drogue ? 600 : 250} m/s.`, 'info', 3500); }
      if (P.type === 'fairing' && p.fair && p.fair.on) { p.fair.on = false; v.fairingJettison = (v.fairingJettison || []).concat([p.iid]); }
    }
    if (v.landed && v.parts.some(p => uids.has(p.uid) && PARTS[p.pid].eng)) v.launched = true;
    for (const p of decs) {
      const P = PARTS[p.pid];
      const flag = P.type === 'decoupler' ? 'dec' : 'rdec';
      v.links = v.links.filter(l => !(l[1] === p.iid && l[2] === flag));
    }
    if (decs.length) made.push(...split(v, t, 1.6, decs));
    invalidate(v);
    return made;
  }
  // split off disconnected components into new vessels; returns new vessels
  function split(v, t, impulse, sources) {
    const comp = Perf.components(v.parts.map(p => ({ iid: p.iid, part: PARTS[p.pid] })), v.links, () => true, false);
    let rootC = comp[v.root];
    if (rootC == null) {
      const cmd = v.parts.find(p => PartUtil.isCommand(PARTS[p.pid]));
      if (cmd) { v.root = cmd.iid; rootC = comp[cmd.iid]; } else { v.root = v.parts[0] ? v.parts[0].iid : null; rootC = v.root ? comp[v.root] : null; }
    }
    const groups = {};
    for (const p of v.parts) { const c = comp[p.iid]; if (c === rootC) continue; (groups[c] = groups[c] || []).push(p); }
    const out = [];
    const prMain = getProps(v);
    for (const c in groups) {
      const ps = groups[c];
      const ids = new Set(ps.map(p => p.iid));
      const nv = {
        id: Game.newVesselId(), name: v.name + ' debris', type: 'debris', parts: ps, links: v.links.filter(l => ids.has(l[0]) && ids.has(l[1])),
        root: (ps.find(p => PartUtil.isCommand(PARTS[p.pid])) || ps[0]).iid, stages: [], stageIdx: 0,
        body: v.body, r: v.r.clone(), v: v.v.clone(), q: v.q.clone(), w: new V3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.3),
        landed: false, throttle: 0, sas: false, sasMode: 'stab', rcs: false, log: Missions.newLog(), situation: '',
      };
      if (ps.some(p => PartUtil.isCommand(PARTS[p.pid]))) { nv.type = 'ship'; nv.name = v.name + ' ' + (ps.some(p => PARTS[p.pid].type === 'pod') ? 'Lander' : 'Probe'); nv.stages = v.stages.slice(v.stageIdx).map(s => s.filter(u => ps.some(p => p.uid === u))).filter(s => s.length); nv.sas = true; nv.log = JSON.parse(JSON.stringify(v.log)); }
      // push apart along the separating axis
      const cm = Vessel.mass(nv).com, cmMain = prMain.com;
      const dir = cm.clone().sub(cmMain); if (dir.lengthSq() < 1e-6) dir.set(0, -1, 0); dir.normalize().applyQuaternion(v.q);
      const mA = prMain.m, mB = Vessel.mass(nv).m;
      nv.v.addScaledVector(dir, impulse * mA / (mA + mB));
      v.v.addScaledVector(dir, -impulse * mB / (mA + mB));
      out.push(nv);
    }
    if (out.length) { const keep = new Set(); for (const p of v.parts) if (comp[p.iid] === rootC) keep.add(p.iid); v.parts = v.parts.filter(p => keep.has(p.iid)); v.links = v.links.filter(l => keep.has(l[0]) && keep.has(l[1])); }
    invalidate(v);
    return out;
  }
  function destroyParts(v, t, parts) {
    const ids = new Set(parts.map(p => p.iid));
    const cmdBefore = v.parts.some(p => PartUtil.isCommand(PARTS[p.pid]));
    v.parts = v.parts.filter(p => !ids.has(p.iid));
    v.links = v.links.filter(l => !ids.has(l[0]) && !ids.has(l[1]));
    invalidate(v);
    if (!v.parts.length) { v.dead = true; return []; }
    if (ids.has(v.root)) v.root = null;
    const made = split(v, t, 0.5);
    if (cmdBefore && !v.parts.some(p => PartUtil.isCommand(PARTS[p.pid]))) v.lostControl = true;
    return made;
  }

  // ----- on-rails propagation (time warp & unloaded vessels) -----
  function rails(v, t0, t1, stopCb) {
    if (v.landed) { const B = Bodies.byId[v.body]; const fq = frameQ(B, t1); v.r.copy(v.landedBF).applyQuaternion(fq); v.q.copy(fq).multiply(v.landedQ); v.v.copy(Bodies.surfVel(B, v.r, new V3())); return null; }
    // Fast path: a closed orbit that stays clear of the ground, the air, the edge of the sphere of influence
    // and every moon's sphere of influence never changes, so jump straight to t1 (whole periods dropped).
    {
      const B = Bodies.byId[v.body], rl = v.r.length(), en = v.v.lengthSq() / 2 - B.GM / rl;
      if (en < 0 && t1 - t0 > 600) {
        const a = -B.GM / (2 * en), hh = _a.copy(v.r).cross(v.v).lengthSq(), e = Math.sqrt(Math.max(0, 1 - hh / (B.GM * a)));
        const pe = a * (1 - e), ap = a * (1 + e);
        let clear = pe - B.R > B.atmH + B.maxTerrain + 1000 && (!isFinite(B.soi) || ap < B.soi * 0.95);
        if (clear) for (const c of B.children) { const cmax = c.a * (1 + (c.e || 0)) + c.soi, cmin = c.a * (1 - (c.e || 0)) - c.soi; if (!(cmax < pe || cmin > ap)) { clear = false; break; } }
        if (clear) { const P = 2 * Math.PI * Math.sqrt(a * a * a / B.GM); Orbit.propagate(v.r, v.v, B.GM, (t1 - t0) % P, v.r, v.v); return null; }
      }
    }
    let t = t0, guard = 0;
    while (t < t1 && guard++ < 20000) {
      const B = Bodies.byId[v.body];
      const rl = v.r.length(), sp = v.v.length();
      const alt = rl - B.R;
      let h = t1 - t;
      // keep steps small enough to notice SOI changes and the ground
      let minD = isFinite(B.soi) ? B.soi - rl : 1e15;
      for (const c of B.children) { const d = _a.copy(v.r).sub(Bodies.relPos(c, t, _b)).length() - c.soi; minD = Math.min(minD, d); }
      h = Math.min(h, Math.max(2, Math.abs(minD) * 0.25 / Math.max(sp, 1)));
      h = Math.min(h, Math.max(2, (alt - B.atmH - B.maxTerrain) * 0.3 / Math.max(sp, 1)));
      Orbit.propagate(v.r, v.v, B.GM, h, v.r, v.v);
      t += h;
      const s = soiCheck(v, t);
      if (s && stopCb) { const r = stopCb('soi', v, t); if (r != null) return r; }
      const B2 = Bodies.byId[v.body];
      const a2 = v.r.length() - B2.R;
      if (B2.atmH && a2 < B2.atmH && stopCb) return stopCb('atm', v, t);
      if (a2 < B2.maxTerrain + 300 && stopCb) return stopCb('ground', v, t);
      if (!stopCb && a2 < (B2.solid ? 0 : (B2.atm && B2.atm.crush) || 0)) { v.dead = true; v.deathMsg = `Impacted ${B2.name} while unattended.`; return t; }
    }
    return null;
  }
  // docking
  function portFace(v, p) {
    const P = PARTS[p.pid];
    const pm = Vessel.pmap(v);
    let up = true;
    for (const l of v.links) { const o = l[0] === p.iid ? pm[l[1]] : l[1] === p.iid ? pm[l[0]] : null; if (o && o.pos.y > p.pos.y) up = false; }
    const dirL = new V3(0, up ? 1 : -1, 0); if (p.q) dirL.applyQuaternion(new Q4().fromArray(p.q));
    const posL = p.pos.clone().addScaledVector(dirL, P.h / 2);
    return { posW: posL.clone().applyQuaternion(v.q).add(v.r), dirW: dirL.clone().applyQuaternion(v.q), dirL, posL };
  }
  function freePorts(v) { const docked = new Set(); v.links.forEach(l => { if (l[2] === 'dock') { docked.add(l[0]); docked.add(l[1]); } }); return v.parts.filter(p => PARTS[p.pid].type === 'dock' && !docked.has(p.iid)); }
  function tryDock(a, b) {
    for (const pa of freePorts(a)) for (const pb of freePorts(b)) {
      if (Math.abs(PARTS[pa.pid].r - PARTS[pb.pid].r) > 0.05) continue;
      const fa = portFace(a, pa), fb = portFace(b, pb);
      const dist = fa.posW.distanceTo(fb.posW), align = fa.dirW.dot(fb.dirW);
      const rv = a.v.distanceTo(b.v);
      if (dist < 0.6 && align < -0.92 && rv < 1.2) { merge(a, b, pa, pb); return true; }
    }
    return false;
  }
  function merge(a, b, pa, pb) {
    const qa = a.q.clone().invert();
    for (const p of b.parts) {
      const w = p.pos.clone().applyQuaternion(b.q).add(b.r);
      const local = w.sub(a.r).applyQuaternion(qa);
      const pq = new Q4(); if (p.q) pq.fromArray(p.q);
      const nq = qa.clone().multiply(b.q).multiply(pq);
      // fold the radial angle into the full orientation
      const yaw = new Q4().setFromAxisAngle(Y, (p.ang || 0));
      const full = nq.clone().multiply(yaw);
      a.parts.push(Object.assign(p, { pos: local, q: full.toArray(), ang: 0, iid: 'd' + b.id + ':' + p.iid }));
    }
    b.links.forEach(l => a.links.push(['d' + b.id + ':' + l[0], 'd' + b.id + ':' + l[1], l[2]]));
    a.links.push([pa.iid, 'd' + b.id + ':' + pb.iid, 'dock']);
    a.stages = a.stages.slice(a.stageIdx).concat(b.stages.slice(b.stageIdx)); a.stageIdx = 0;
    a.v.multiplyScalar(0.5).addScaledVector(b.v, 0.5);
    a.log.docked = true;
    b.dead = true; b.mergedInto = a.id;
    invalidate(a);
  }
  function undock(v, t) {
    const dl = v.links.find(l => l[2] === 'dock'); if (!dl) return [];
    v.links = v.links.filter(l => l !== dl);
    const made = split(v, t, 0.4);
    made.forEach(m => { m.type = m.parts.some(p => PartUtil.isCommand(PARTS[p.pid])) ? 'ship' : 'debris'; });
    return made;
  }
  return { step, stage, split, destroyParts, rails, soiCheck, env, getProps, invalidate, ecTotals, ecChange, sunInfo, frameQ, setLandedFrame, engines, tryDock, undock, freePorts, poolAmount, comW, targetPos, sasTarget };
})();
