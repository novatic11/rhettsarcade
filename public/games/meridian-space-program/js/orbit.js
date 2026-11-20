'use strict';
// ---------- Two-body orbital mechanics (patched conics) ----------
const Orbit = (function () {
  function stC(z) {
    if (z > 1e-6) return (1 - Math.cos(Math.sqrt(z))) / z;
    if (z < -1e-6) return (Math.cosh(Math.sqrt(-z)) - 1) / (-z);
    return 0.5 - z / 24;
  }
  function stS(z) {
    if (z > 1e-6) { const s = Math.sqrt(z); return (s - Math.sin(s)) / (s * s * s); }
    if (z < -1e-6) { const s = Math.sqrt(-z); return (Math.sinh(s) - s) / (s * s * s); }
    return 1 / 6 - z / 120;
  }
  const _r = new V3(), _v = new V3();
  // Universal-variable propagation. Writes into outR/outV. Returns false if it failed.
  function propagateRaw(r0, v0, mu, dt, outR, outV) {
    const ro = r0.length(), vo2 = v0.lengthSq();
    const vro = r0.dot(v0) / ro;
    const alpha = 2 / ro - vo2 / mu;
    const smu = Math.sqrt(mu);
    let x;
    if (alpha > 1e-12) x = smu * alpha * dt;
    else if (alpha < -1e-12) {
      const a = 1 / alpha, s = Math.sign(dt) || 1;
      const num = -2 * mu * alpha * dt;
      const den = r0.dot(v0) + s * Math.sqrt(-mu * a) * (1 - ro * alpha);
      x = s * Math.sqrt(-a) * Math.log(Math.max(1e-12, num / den));
      if (!isFinite(x)) x = smu * Math.abs(alpha) * dt;
    } else x = smu * dt / ro;
    let ok = false;
    for (let i = 0; i < 60; i++) {
      const x2 = x * x, z = alpha * x2, C = stC(z), S = stS(z);
      const F = ro * vro / smu * x2 * C + (1 - alpha * ro) * x2 * x * S + ro * x - smu * dt;
      const dF = ro * vro / smu * x * (1 - alpha * x2 * S) + (1 - alpha * ro) * x2 * C + ro;
      const ratio = F / dF;
      x -= ratio;
      if (!isFinite(x)) return false;
      if (Math.abs(ratio) < 1e-9 * Math.max(1, Math.abs(x))) { ok = true; break; }
    }
    if (!ok) return false;
    const x2 = x * x, z = alpha * x2, C = stC(z), S = stS(z);
    const f = 1 - x2 / ro * C, g = dt - x2 * x / smu * S;
    _r.copy(r0).multiplyScalar(f).addScaledVector(v0, g);
    const rm = _r.length();
    const fd = smu / (rm * ro) * (alpha * x2 * x * S - x), gd = 1 - x2 / rm * C;
    _v.copy(r0).multiplyScalar(fd).addScaledVector(v0, gd);
    if (!isFinite(_r.x) || !isFinite(_v.x)) return false;
    outR.copy(_r); outV.copy(_v);
    return true;
  }
  const _a = new V3(), _b = new V3();
  function propagate(r0, v0, mu, dt, outR, outV, depth) {
    depth = depth || 0;
    if (dt === 0) { outR.copy(r0); outV.copy(v0); return true; }
    // reduce elliptic time by whole periods
    const ro = r0.length(), alpha = 2 / ro - v0.lengthSq() / mu;
    if (alpha > 0) {
      const a = 1 / alpha, P = 2 * Math.PI * Math.sqrt(a * a * a / mu);
      if (Math.abs(dt) > P) dt = dt % P;
    }
    if (propagateRaw(r0, v0, mu, dt, outR, outV)) return true;
    if (depth > 8) { outR.copy(r0).addScaledVector(v0, dt); outV.copy(v0); return false; }
    const ra = new V3(), va = new V3();
    propagate(r0, v0, mu, dt / 2, ra, va, depth + 1);
    return propagate(ra, va, mu, dt / 2, outR, outV, depth + 1);
  }

  // Classical elements and convenient derived values
  function elements(r, v, mu) {
    const rm = r.length(), v2 = v.lengthSq();
    const h = new V3().crossVectors(r, v);
    const hm = h.length();
    const ev = new V3().copy(r).multiplyScalar(v2 - mu / rm).addScaledVector(v, -r.dot(v)).divideScalar(mu);
    const e = ev.length();
    const energy = v2 / 2 - mu / rm;
    const a = -mu / (2 * energy);
    const p = hm * hm / mu;
    const pe = p / (1 + e);
    const ap = e < 1 ? a * (1 + e) : Infinity;
    const inc = Math.acos(clamp(h.y / (hm || 1), -1, 1));
    // true anomaly
    let nu;
    if (e > 1e-9) { nu = Math.acos(clamp(ev.dot(r) / (e * rm), -1, 1)); if (r.dot(v) < 0) nu = 2 * Math.PI - nu; }
    else nu = 0;
    let period = Infinity, tPe = 0, tAp = Infinity;
    if (e < 1) {
      period = 2 * Math.PI * Math.sqrt(a * a * a / mu);
      const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2));
      let M = E - e * Math.sin(E); if (M < 0) M += 2 * Math.PI;
      const n = 2 * Math.PI / period;
      tPe = (2 * Math.PI - M) / n;
      tAp = ((Math.PI - M) / n + period) % period;
    } else if (e > 1) {
      const F = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu / 2));
      const M = e * Math.sinh(F) - F;
      const n = Math.sqrt(mu / (-a * -a * -a));
      tPe = -M / n; // negative if periapsis already passed
    }
    return { a, e, ev, h, hm, p, pe, ap, inc, nu, period, tPe, tAp, energy };
  }
  // Points along the conic, relative to body centre. nuMax limits hyperbolic arcs.
  function conicPoints(el, n, rMax) {
    const pts = [];
    let P = el.e > 1e-7 ? el.ev.clone().normalize() : null;
    const hn = el.h.clone().normalize();
    if (!P) { P = new V3(1, 0, 0); if (Math.abs(hn.x) > 0.9) P.set(0, 0, 1); P.addScaledVector(hn, -P.dot(hn)).normalize(); }
    const Q = new V3().crossVectors(hn, P);
    let n0 = 0, n1 = 2 * Math.PI;
    if (el.e >= 1 || el.ap > rMax) {
      const lim = el.e >= 1 ? Math.acos(-1 / el.e) - 1e-3 : Math.PI;
      let rl = Math.acos(clamp((el.p / rMax - 1) / el.e, -1, 1));
      const m = Math.min(lim, rl);
      n0 = -m; n1 = m;
    }
    for (let i = 0; i <= n; i++) {
      const nu = n0 + (n1 - n0) * i / n;
      const rr = el.p / (1 + el.e * Math.cos(nu));
      pts.push(new V3().copy(P).multiplyScalar(rr * Math.cos(nu)).addScaledVector(Q, rr * Math.sin(nu)));
    }
    return pts;
  }
  // Circular orbit speed and helpers
  function vCirc(mu, r) { return Math.sqrt(mu / r); }
  // Prograde / normal / radial basis for a state
  function basis(r, v) {
    const pro = v.clone().normalize();
    const nrm = new V3().crossVectors(r, v).normalize();
    const rad = new V3().crossVectors(pro, nrm).normalize(); // points roughly outward
    if (rad.dot(r) < 0) rad.negate();
    return { pro, nrm, rad };
  }

  // ---------- Patched-conic trajectory prediction ----------
  // Returns array of patches: {body, t0, t1, pts:[V3 rel body], end:'soi-exit'|'soi-enter'|'impact'|'orbit', el, closest:{} }
  const _rr = new V3(), _vv = new V3(), _cp = new V3(), _cp2 = new V3();
  function predict(body, r0, v0, t0, opts) {
    opts = opts || {};
    const patches = [];
    let b = body, r = r0.clone(), v = v0.clone(), t = t0;
    const maxP = opts.maxPatches || 3;
    const target = opts.target || null; // body object
    let closest = null;
    for (let k = 0; k < maxP; k++) {
      const el = elements(r, v, b.GM);
      const soi = b.soi;
      let horizon;
      if (el.e < 1 && el.ap < soi) horizon = el.period * (k === 0 ? 1 : 1);
      else {
        // time to reach SOI edge (or a long time if Sun)
        if (!isFinite(soi)) horizon = el.e < 1 ? el.period : 3e9;
        else horizon = timeToRadius(el, b.GM, soi, r, v);
      }
      horizon = Math.min(horizon, opts.maxTime || 4e9);
      const N = opts.samples || (b.id === 'sun' ? 700 : 360);
      const pts = [r.clone()];
      const times = [t];
      let end = 'orbit', next = null;
      let prevR = r.clone();
      const kids = b.children;
      const prevRel = kids.map(c => new V3().copy(prevR).sub(Bodies.relPos(c, t, _cp)));
      const surfR = b.R + (b.solid ? 0 : 0) + (b.atmH ? 0 : 0);
      for (let i = 1; i <= N; i++) {
        const ti = t + horizon * i / N;
        propagate(r, v, b.GM, ti - t, _rr, _vv);
        const cur = _rr.clone();
        // impact
        if (cur.length() < surfR + (b.gas ? b.atm.crush : 0)) {
          // refine
          let lo = times[times.length - 1], hi = ti;
          for (let j = 0; j < 30; j++) { const m = (lo + hi) / 2; propagate(r, v, b.GM, m - t, _rr, _vv); if (_rr.length() < surfR) hi = m; else lo = m; }
          propagate(r, v, b.GM, hi - t, _rr, _vv);
          pts.push(_rr.clone()); times.push(hi);
          end = 'impact'; break;
        }
        // children encounters (segment test)
        let entered = null;
        for (let ci = 0; ci < kids.length; ci++) {
          const c = kids[ci];
          const rel = new V3().copy(cur).sub(Bodies.relPos(c, ti, _cp));
          const pr = prevRel[ci];
          // closest point on segment pr->rel to origin
          const d = new V3().subVectors(rel, pr);
          const dd = d.lengthSq();
          let u = dd > 0 ? clamp(-pr.dot(d) / dd, 0, 1) : 0;
          const md = new V3().copy(pr).addScaledVector(d, u).length();
          if (target && c === target) {
            if (!closest || md < closest.dist) closest = { dist: md, t: times[times.length - 1] + (ti - times[times.length - 1]) * u, body: b, patch: k };
          }
          if (md < c.soi && !entered) entered = { c, u };
          prevRel[ci] = rel;
        }
        if (entered) {
          // bisect entry time
          const c = entered.c;
          let lo = times[times.length - 1], hi = ti;
          // ensure hi is inside
          let inside = false;
          for (let j = 0; j < 40; j++) {
            const m = lo + (hi - lo) * (j < 1 ? entered.u : 0.5);
            propagate(r, v, b.GM, m - t, _rr, _vv);
            const dist = _cp2.copy(_rr).sub(Bodies.relPos(c, m, _cp)).length();
            if (dist < c.soi) { hi = m; inside = true; } else lo = m;
          }
          if (inside) {
            propagate(r, v, b.GM, hi - t, _rr, _vv);
            pts.push(_rr.clone()); times.push(hi);
            const nr = _rr.clone().sub(Bodies.relPos(c, hi, _cp));
            const nv = _vv.clone().sub(Bodies.relVel(c, hi, _cp));
            next = { body: c, r: nr, v: nv, t: hi };
            end = 'soi-enter';
            break;
          }
        }
        pts.push(cur); times.push(ti);
        prevR = cur;
      }
      if (end === 'orbit' && isFinite(soi) && !(el.e < 1 && el.ap < soi)) {
        // reached SOI edge
        propagate(r, v, b.GM, horizon, _rr, _vv);
        if (_rr.length() >= soi * 0.98 && b.parent) {
          const P = b.parent;
          next = { body: P, r: _rr.clone().add(Bodies.relPos(b, t + horizon, _cp)), v: _vv.clone().add(Bodies.relVel(b, t + horizon, _cp)), t: t + horizon };
          end = 'soi-exit';
        }
      }
      if (target && target === b && k > 0) {
        // inside target SOI: closest = periapsis of this patch
        const pd = el.pe;
        if (!closest || pd < closest.dist) closest = { dist: pd, t: t + Math.max(0, el.tPe), body: b, patch: k, inside: true };
      }
      patches.push({ body: b, t0: t, t1: times[times.length - 1], pts, times, end, el, r0: r.clone(), v0: v.clone() });
      if (!next) break;
      b = next.body; r = next.r; v = next.v; t = next.t;
    }
    return { patches, closest };
  }
  function timeToRadius(el, mu, R, r, v) {
    // search forward for time when |r| reaches R (assumes outward-escaping or high orbits)
    let lo = 0, hi = 1000;
    const tr = new V3(), tv = new V3();
    for (let i = 0; i < 60; i++) { propagate(r, v, mu, hi, tr, tv); if (tr.length() >= R) break; lo = hi; hi *= 1.6; if (hi > 5e10) return hi; }
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; propagate(r, v, mu, m, tr, tv); if (tr.length() >= R) hi = m; else lo = m; }
    return hi;
  }
  return { propagate, elements, conicPoints, vCirc, basis, predict, timeToRadius };
})();
