'use strict';
// ---------- Vessel designs (editor model), layout, staging and performance ----------
// Design: { name, stack:[node], stages:[[uid]], nextUid }
// node:  { uid, pid, radials:[group], opts:{fill, limit} }
// group: { uid, sym, y (0 bottom..1 top of parent), ang (deg), conn: node|null, items:[node], anchor }
const Design = {
  empty(name) { return { name: name || 'Untitled Rocket', stack: [], stages: null, nextUid: 1 }; },
  node(d, pid) { return { uid: d.nextUid++, pid, radials: [], opts: {} }; },
  group(d, sym, y, ang, conn, items) { return { uid: d.nextUid++, sym, y, ang, conn: conn || null, items: items || [], anchor: 0 }; },
  clone(x) { return JSON.parse(JSON.stringify(x)); },
  walk(d, cb) {
    function wn(n, ctx) {
      if (cb(n, ctx) === false) return;
      for (const g of n.radials) {
        if (g.conn) wn(g.conn, { kind: 'conn', group: g, parent: n });
        g.items.forEach((it, i) => wn(it, { kind: 'item', group: g, index: i, parent: n }));
      }
    }
    d.stack.forEach((n, i) => wn(n, { kind: 'stack', index: i }));
  },
  find(d, uid) { let r = null; this.walk(d, (n, ctx) => { if (n.uid === uid) { r = { node: n, ctx }; return false; } }); return r; },
  findGroup(d, guid) { let r = null; this.walk(d, (n) => { for (const g of n.radials) if (g.uid === guid) r = { group: g, parent: n }; }); return r; },
  // reassign uids in a cloned subtree
  reuid(d, n) {
    n.uid = d.nextUid++;
    for (const g of n.radials) { g.uid = d.nextUid++; if (g.conn) this.reuid(d, g.conn); g.items.forEach(it => this.reuid(d, it)); }
    return n;
  },
  // Remove a node. Stack nodes are spliced out (neighbours join). Items/conn remove the whole radial group if it becomes empty.
  remove(d, uid) {
    const f = this.find(d, uid); if (!f) return null;
    const { node, ctx } = f;
    if (ctx.kind === 'stack') { d.stack.splice(ctx.index, 1); return node; }
    const g = ctx.group;
    if (ctx.kind === 'conn') { const pr = ctx.parent; pr.radials.splice(pr.radials.indexOf(g), 1); return node; }
    g.items.splice(ctx.index, 1);
    if (g.anchor >= g.items.length) g.anchor = Math.max(0, g.items.length - 1);
    if (!g.items.length && !g.conn) ctx.parent.radials.splice(ctx.parent.radials.indexOf(g), 1);
    return node;
  },
  partCount(d) { let c = 0; const fl = Layout.flatten(d); c = fl.insts.length; return c; },
};

// ---------- Layout: design -> part instances with positions ----------
const Layout = {
  radiusAt(part, y) { return part.rb + (part.r - part.rb) * clamp(y, 0, 1); },
  flatten(d) {
    const insts = [], links = [], byIid = {};
    const add = (inst) => { insts.push(inst); byIid[inst.iid] = inst; return inst; };
    // main stack
    let top = 0;
    const stackInsts = [];
    d.stack.forEach((n, i) => {
      const p = PARTS[n.pid];
      const inst = add({ iid: 'n' + n.uid, uid: n.uid, pid: n.pid, part: p, pos: new V3(0, top - p.h / 2, 0), ang: 0, axis: new V3(0, 0, 0), kind: 'stack', sidx: i, depth: 1, sym: 0, gid: 0, node: n });
      stackInsts.push(inst);
      top -= p.h;
      if (i > 0) links.push([stackInsts[i - 1].iid, inst.iid, inst.part.type === 'decoupler' ? 'dec' : '']);
    });
    // radials (recursive)
    const placeGroups = (n, inst) => {
      for (const g of n.radials) {
        const P = inst.part;
        const yAtt = inst.pos.y - P.h / 2 + g.y * P.h;
        const rp = P.surf ? (P.w || 0.2) : this.radiusAt(P, g.y);
        for (let k = 0; k < g.sym; k++) {
          const th = (g.ang + k * 360 / g.sym) * DEG + inst.ang;
          const dir = new V3(Math.sin(th), 0, Math.cos(th));
          const base = new V3(inst.pos.x, 0, inst.pos.z);
          if (P.surf) base.copy(inst.pos).setY(0).addScaledVector(new V3(Math.sin(inst.ang), 0, Math.cos(inst.ang)), (P.w || 0.2) * 0.5).addScaledVector(dir, -rp * 0); // surf-on-surf: rare
          let r0 = P.surf ? 0.05 : rp;
          let parentIid = inst.iid;
          let cw = 0;
          if (g.conn) {
            const cp = PARTS[g.conn.pid];
            cw = cp.w || 0.18;
            const ci = add({ iid: inst.iid + '/' + g.conn.uid + '.' + k, uid: g.conn.uid, pid: g.conn.pid, part: cp, pos: base.clone().addScaledVector(dir, r0).setY(yAtt), ang: th, kind: 'conn', depth: inst.depth + 1, sym: k, gid: g.uid, node: g.conn, mountR: r0 });
            links.push([inst.iid, ci.iid, 'rdec']);
            parentIid = ci.iid;
            placeGroups(g.conn, ci);
          }
          if (!g.items.length) continue;
          const allSurf = g.items.every(it => PARTS[it.pid].surf);
          if (allSurf) {
            g.items.forEach((it) => {
              const ip = PARTS[it.pid];
              const ii = add({ iid: inst.iid + '/' + it.uid + '.' + k, uid: it.uid, pid: it.pid, part: ip, pos: base.clone().addScaledVector(dir, r0 + cw).setY(yAtt), ang: th, kind: 'surf', depth: inst.depth + 1, sym: k, gid: g.uid, node: it, mountR: r0 + cw });
              links.push([parentIid, ii.iid, '']);
              placeGroups(it, ii);
            });
          } else {
            // side stack
            let rmax = 0, htot = 0;
            g.items.forEach(it => { const ip = PARTS[it.pid]; rmax = Math.max(rmax, ip.r, ip.rb); htot += ip.h; });
            const axis = base.clone().addScaledVector(dir, r0 + cw + rmax);
            // anchor centre at yAtt
            let y = 0; const tops = [];
            g.items.forEach(it => { tops.push(y); y -= PARTS[it.pid].h; });
            const an = clamp(g.anchor || 0, 0, g.items.length - 1);
            const anchorCenter = tops[an] - PARTS[g.items[an].pid].h / 2;
            const off = yAtt - anchorCenter;
            let prev = null;
            g.items.forEach((it, i) => {
              const ip = PARTS[it.pid];
              const ii = add({ iid: inst.iid + '/' + it.uid + '.' + k, uid: it.uid, pid: it.pid, part: ip, pos: axis.clone().setY(off + tops[i] - ip.h / 2), ang: th, kind: 'side', depth: inst.depth + 1, sym: k, gid: g.uid, node: it, sideAxis: axis.clone() });
              if (prev) links.push([prev.iid, ii.iid, ip.type === 'decoupler' ? 'dec' : '']);
              if (i === an) links.push([parentIid, ii.iid, '']);
              prev = ii;
              placeGroups(it, ii);
            });
          }
        }
      }
    };
    d.stack.forEach((n, i) => placeGroups(n, stackInsts[i]));
    // fairings: enclose everything above them
    insts.forEach(inst => {
      if (inst.part.type !== 'fairing' || inst.kind !== 'stack') return;
      const yb = inst.pos.y + inst.part.h / 2;
      let ytop = yb, rmax = inst.part.r;
      for (const o of insts) {
        if (o === inst) continue;
        const oy0 = o.pos.y - o.part.h / 2;
        if (oy0 >= yb - 0.01) {
          const ox = Math.hypot(o.pos.x, o.pos.z) + (o.part.surf ? (o.part.w || 0.2) : Math.max(o.part.r, o.part.rb));
          rmax = Math.max(rmax, ox);
          ytop = Math.max(ytop, o.pos.y + o.part.h / 2);
          o.inFairing = inst.iid;
        }
      }
      inst.fair = { h: Math.max(0.5, ytop - yb + 0.15), r: rmax + 0.08 };
    });
    // root = first command part
    let root = insts.find(i => PartUtil.isCommand(i.part)) || insts[0] || null;
    // bounds
    const b = new THREE.Box3();
    insts.forEach(i => {
      const p = i.part, w = p.surf ? (p.w || 0.2) : Math.max(p.r, p.rb);
      b.expandByPoint(new V3(i.pos.x - w, i.pos.y - p.h / 2, i.pos.z - w));
      b.expandByPoint(new V3(i.pos.x + w, i.pos.y + p.h / 2, i.pos.z + w));
    });
    return { insts, links, byIid, root: root ? root.iid : null, bounds: b };
  },
};

// ---------- Resources, connectivity and performance ----------
const Perf = {
  isBarrier(p) { return p.type === 'decoupler' || p.type === 'rdecoupler'; },
  // connected components over alive parts; barrier parts block fuel flow when forFuel
  components(insts, links, alive, forFuel) {
    const adj = {};
    for (const i of insts) if (alive(i)) adj[i.iid] = [];
    const byIid = {}; insts.forEach(i => byIid[i.iid] = i);
    for (const [a, b] of links) {
      if (!adj[a] || !adj[b]) continue;
      if (forFuel && (this.isBarrier(byIid[a].part) || this.isBarrier(byIid[b].part))) continue;
      adj[a].push(b); adj[b].push(a);
    }
    const comp = {}; let c = 0;
    for (const id in adj) {
      if (comp[id] != null) continue;
      const q = [id]; comp[id] = c;
      while (q.length) { const x = q.pop(); for (const y of adj[x]) if (comp[y] == null) { comp[y] = c; q.push(y); } }
      c++;
    }
    return comp;
  },
  initRes(inst) {
    const r = {}, cap = {};
    const p = inst.part, fill = inst.node && inst.node.opts && inst.node.opts.fill != null ? inst.node.opts.fill : 1;
    if (p.res) for (const k in p.res) { cap[k] = p.res[k]; r[k] = p.res[k] * fill; }
    if (p.ec) { cap.EC = p.ec; r.EC = p.ec; }
    return { r, cap };
  },
  // Simulate the stage sequence. env: {g, atm (0..1 pressure)}
  analyze(flat, stages, env) {
    const insts = flat.insts;
    if (!insts.length) return { stages: [], total: 0 };
    const alive = {}; insts.forEach(i => alive[i.iid] = true);
    const res = {}; insts.forEach(i => res[i.iid] = this.initRes(i).r);
    const active = new Set();
    const byUid = {}; insts.forEach(i => { (byUid[i.uid] = byUid[i.uid] || []).push(i); });
    let links = flat.links.slice();
    const rootIid = flat.root;
    const out = [];
    const massOf = () => { let m = 0; for (const i of insts) if (alive[i.iid]) { m += i.part.mass; for (const k in res[i.iid]) if (k !== 'EC') m += res[i.iid][k]; } return m; };
    const fire = (uidList, simulateOnly) => {
      const drop = new Set();
      let L = links;
      for (const uid of uidList) for (const inst of (byUid[uid] || [])) {
        if (!alive[inst.iid]) continue;
        const t = inst.part.type;
        if (t === 'decoupler') L = L.filter(l => !(l[1] === inst.iid && l[2] === 'dec'));
        if (t === 'rdecoupler') L = L.filter(l => !(l[1] === inst.iid && l[2] === 'rdec'));
      }
      const comp = this.components(insts, L, i => alive[i.iid], false);
      const rc = comp[rootIid];
      for (const i of insts) if (alive[i.iid] && comp[i.iid] !== rc) drop.add(i.iid);
      if (!simulateOnly) { links = L; drop.forEach(id => { alive[id] = false; active.delete(id); }); for (const uid of uidList) for (const inst of (byUid[uid] || [])) if (alive[inst.iid] && inst.part.eng) active.add(inst.iid); }
      return drop;
    };
    for (let s = 0; s < stages.length; s++) {
      fire(stages[s], false);
      const dropNext = s + 1 < stages.length ? fire(stages[s + 1], true) : new Set();
      let dv = 0, time = 0;
      const m0 = massOf();
      let F0 = 0, isp0 = 0, F0a = 0;
      for (let ev = 0; ev < 60; ev++) {
        const comp = this.components(insts, links, i => alive[i.iid], true);
        // pools
        const pools = {};
        for (const i of insts) if (alive[i.iid]) for (const k in res[i.iid]) if (k !== 'EC' && res[i.iid][k] > 1e-9) {
          const key = (i.part.type === 'srb' ? 'own' + i.iid : comp[i.iid]) + ':' + k;
          (pools[key] = pools[key] || { amt: 0, tanks: [], rate: 0 }).amt += res[i.iid][k];
          pools[key].tanks.push(i.iid);
        }
        const engs = [];
        for (const id of active) {
          if (!alive[id]) continue;
          const i = flat.byIid[id]; const e = i.part.eng;
          const keys = Object.keys(e.fuel).map(k => (i.part.type === 'srb' ? 'own' + id : comp[id]) + ':' + k);
          if (keys.some(k => !pools[k] || pools[k].amt <= 1e-9)) continue;
          const lim = i.node && i.node.opts && i.node.opts.limit != null ? i.node.opts.limit : 1;
          const ispA = lerp(e.ispV, e.ispA, env.atm);
          const F = e.thr * lim * (ispA / e.ispV);
          const mdot = e.thr * lim / (e.ispV * G0);
          engs.push({ id, F, Fv: e.thr * lim, mdot, keys, fuel: e.fuel, isp: ispA });
        }
        if (!engs.length) break;
        if (ev === 0) { F0 = engs.reduce((a, b) => a + b.F, 0); F0a = F0; }
        const relevant = engs.filter(e => dropNext.has(e.id));
        let mdotTot = 0, Ftot = 0;
        for (const e of engs) {
          mdotTot += e.mdot; Ftot += (env.atm > 0 ? e.F : e.Fv);
          const fs = Object.keys(e.fuel); const tot = fs.reduce((a, k) => a + e.fuel[k], 0);
          fs.forEach((k, j) => { pools[e.keys[j]].rate += e.mdot * e.fuel[k] / tot; });
        }
        let dt = Infinity;
        for (const k in pools) if (pools[k].rate > 0) dt = Math.min(dt, pools[k].amt / pools[k].rate);
        if (!isFinite(dt)) break;
        dt = Math.min(dt, 1e7);
        const m = massOf(), m1 = m - mdotTot * dt;
        if (mdotTot > 0 && m1 > 0) dv += (Ftot / mdotTot) * Math.log(m / m1);
        time += dt;
        if (!isp0) isp0 = Ftot / (mdotTot * G0);
        for (const k in pools) {
          const pl = pools[k]; if (!pl.rate) continue;
          const frac = clamp(pl.rate * dt / pl.amt, 0, 1);
          const rk = k.split(':')[1];
          for (const id of pl.tanks) res[id][rk] *= (1 - frac);
          if (frac > 0.999999) for (const id of pl.tanks) res[id][rk] = 0;
        }
        if (relevant.length) {
          // stop once the engines about to be dropped are dry
          const stillBurning = relevant.some(e => e.keys.every(k => { const [c, r] = k.split(':'); let a = 0; for (const id of (pools[k] ? pools[k].tanks : [])) a += res[id][r]; return a > 1e-9; }));
          if (!stillBurning) break;
        }
      }
      const m1 = massOf();
      out.push({ idx: s, dv, time, m0, m1, thrust: F0, twr: F0 / (m0 * env.g), isp: isp0 });
    }
    return { stages: out, total: out.reduce((a, b) => a + b.dv, 0) };
  },
  // Electricity budget
  power(flat) {
    let cap = 0, gen = 0, use = 0, engEC = 0, heat = 0, cool = 0, ant = null;
    for (const i of flat.insts) {
      const p = i.part;
      if (p.ec) cap += p.ec;
      if (p.gen && p.type !== 'solar') gen += p.gen;
      if (p.type === 'solar') gen += p.gen;
      if (p.ecUse && p.type !== 'wheel') use += p.ecUse;
      if (p.eng && p.eng.ec) engEC += p.eng.ec;
      if (p.eng && p.eng.heat) heat += p.eng.heat;
      if (p.type === 'reactor') heat += p.heat;
      if (p.cool) cool += p.cool;
      if (p.ant && (!ant || p.ant.range > ant.range)) ant = p.ant;
    }
    return { cap, gen, use, engEC, heat, cool, ant };
  },
};

// ---------- Auto staging ----------
const Staging = {
  auto(d) {
    const stages = [];
    const segs = [];
    let cur = [];
    // split main stack bottom-up into segments; a decoupler stays with the lower segment
    for (let i = d.stack.length - 1; i >= 0; i--) {
      cur.push(d.stack[i]);
      if (PARTS[d.stack[i].pid].type === 'decoupler') { segs.push({ nodes: cur, dec: d.stack[i] }); cur = []; }
    }
    if (cur.length) segs.push({ nodes: cur, dec: null });
    const collect = (nodes) => {
      const eng = [], rdec = [], chute = [], fair = [];
      const visit = (n, viaR) => {
        const p = PARTS[n.pid];
        if (p.type === 'engine' || p.type === 'srb') eng.push(n.uid);
        if (p.type === 'chute') chute.push(n.uid);
        if (p.type === 'fairing') fair.push(n.uid);
        for (const g of n.radials) {
          if (g.conn) { if (PARTS[g.conn.pid].type === 'rdecoupler') rdec.push(g.conn.uid); visit(g.conn, true); }
          g.items.forEach(it => visit(it, true));
        }
      };
      nodes.forEach(n => visit(n));
      return { eng, rdec, chute, fair };
    };
    const allChutes = [], fairings = [];
    let prevDec = null;
    segs.forEach((sg, k) => {
      // segment parts excluding its own decoupler (which belongs to the stage that separates it from the one above)
      const own = sg.nodes.filter(n => n !== sg.dec);
      const c = collect(own);
      const st = [];
      if (prevDec) st.push(prevDec.uid);
      st.push(...c.eng);
      if (st.length) stages.push(st);
      if (c.rdec.length) stages.push(c.rdec);
      allChutes.push(...c.chute);
      fairings.push(...c.fair);
      if (sg.dec) { const dc = collect([sg.dec]); allChutes.push(...dc.chute); }
      prevDec = sg.dec;
    });
    if (prevDec) stages.push([prevDec.uid]);
    if (fairings.length) stages.splice(Math.min(stages.length, 2), 0, fairings);
    if (allChutes.length) stages.push(allChutes);
    return stages.filter(s => s.length);
  },
  sync(d) {
    const stageable = new Set();
    Design.walk(d, n => { if (PartUtil.stageable(PARTS[n.pid])) stageable.add(n.uid); });
    if (!d.stages) { d.stages = this.auto(d); return; }
    // remove missing
    d.stages = d.stages.map(s => s.filter(u => stageable.has(u)));
    const present = new Set(); d.stages.forEach(s => s.forEach(u => present.add(u)));
    const missing = [...stageable].filter(u => !present.has(u));
    if (missing.length) {
      const auto = this.auto(d);
      for (const u of missing) {
        let idx = auto.findIndex(s => s.includes(u));
        if (idx < 0) idx = d.stages.length;
        // place next to an auto-stage neighbour if possible
        const neighbour = idx >= 0 && auto[idx] ? auto[idx].find(x => present.has(x)) : null;
        if (neighbour != null) { const si = d.stages.findIndex(s => s.includes(neighbour)); d.stages[si].push(u); }
        else { while (d.stages.length < idx) d.stages.push([]); d.stages.splice(Math.min(idx, d.stages.length), 0, [u]); }
        present.add(u);
      }
    }
    d.stages = d.stages.filter(s => s.length);
  },
};

// ---------- Problems and advice shown in the editor ----------
function checkDesign(d, flat, ana, pw) {
  const out = [];
  const add = (lvl, msg) => out.push({ lvl, msg });
  if (!flat.insts.length) { add('info', 'Drag a probe core or capsule from the parts list onto the blueprint to begin.'); return out; }
  const cmd = flat.insts.filter(i => PartUtil.isCommand(i.part));
  const probes = cmd.filter(i => i.part.type === 'probe');
  const pods = cmd.filter(i => i.part.type === 'pod');
  if (!cmd.length) add('err', 'No control: add a probe core or command pod. Nothing can steer this vessel.');
  const engines = flat.insts.filter(i => i.part.eng);
  if (!engines.length) add('err', 'No engines: this vessel can\'t leave the pad.');
  const st0 = ana.stages[0];
  if (engines.length && (!st0 || st0.thrust <= 0)) add('err', 'The first stage has no engine that can fire. Put an engine in Stage 1 (and give it fuel).');
  else if (st0 && st0.twr < 1) add('err', `Too heavy to lift off: first-stage thrust-to-weight is ${fmtNum(st0.twr, 2)}. It must be above 1 (aim for 1.3–2).`);
  else if (st0 && st0.twr < 1.2) add('warn', `Sluggish launch: thrust-to-weight ${fmtNum(st0.twr, 2)}. It will climb slowly and waste fuel.`);
  // fuel compatibility
  const comp = Perf.components(flat.insts, flat.links, () => true, true);
  for (const e of engines) {
    if (e.part.type === 'srb') continue;
    const need = Object.keys(e.part.eng.fuel);
    const have = new Set();
    for (const i of flat.insts) if (comp[i.iid] === comp[e.iid] && i.part.res && i.part.type !== 'srb') Object.keys(i.part.res).forEach(k => have.add(k));
    const miss = need.filter(k => !have.has(k));
    if (miss.length) {
      const others = [...have].filter(k => k !== 'EC' && k !== 'MP');
      if (others.length) add('err', `${e.part.name} needs ${miss.map(k => RES[k].name).join(' and ')}, but its tanks hold ${others.map(k => RES[k].name).join(', ')}. This engine needs a different fuel.`);
      else add('err', `${e.part.name} has no fuel tank connected. Stack a ${miss.map(k => RES[k].name).join('/')} tank directly above it (decouplers block fuel).`);
    }
  }
  // power
  const probeUse = probes.reduce((a, b) => a + (b.part.ecUse || 0), 0) + flat.insts.reduce((a, i) => a + (i.part.type === 'tank' && i.part.ecUse ? i.part.ecUse : 0), 0);
  if (probes.length && pw.gen <= 0) {
    const mins = pw.cap / Math.max(1e-6, probeUse + 0.05) / 60;
    if (mins < 30) add('warn', `No power source: batteries last about ${fmtNum(mins, 0)} min of probe operation. Add solar panels or more batteries.`);
    else add('info', `No power generation: batteries last about ${fmtNum(mins / 60, 1)} h. Fine for short flights.`);
  }
  if (pw.engEC > 0 && pw.gen < pw.engEC) add('warn', `Electric engines need ${fmtNum(pw.engEC, 1)} EC/s at full thrust; generation is ${fmtNum(pw.gen, 1)} EC/s. Batteries (${fmtInt(pw.cap)} EC) will run them for about ${fmtInt(pw.cap / Math.max(0.01, pw.engEC - pw.gen))} s.`);
  if (pw.heat > pw.cool) add(pw.heat > pw.cool * 2 ? 'warn' : 'info', `Waste heat ${fmtInt(pw.heat)} exceeds radiator capacity ${fmtInt(pw.cool)}. Long burns will overheat reactors and nuclear/fusion engines.`);
  if (flat.insts.some(i => i.part.id === 'trap_am') && pw.gen < 6) add('warn', 'The antimatter trap needs 6 EC/s forever. Without a reactor, containment will fail when batteries run dry.');
  // staging
  const staged = new Set(); (d.stages || []).forEach(s => s.forEach(u => staged.add(u)));
  const unst = engines.filter(e => !staged.has(e.uid));
  if (unst.length) add('warn', `${unst[0].part.name} is not in any stage, so it will never ignite.`);
  if (st0 && flat.insts.some(i => i.part.eng && i.part.eng.noAtm && (d.stages[0] || []).includes(i.uid))) add('err', 'Fusion and antimatter drives cannot run inside an atmosphere. Use conventional engines for Stage 1.');
  const chutes = flat.insts.filter(i => i.part.chute);
  if (pods.length && !chutes.length) add('warn', 'Crew aboard but no parachute: the capsule cannot land safely on Earth.');
  if (pods.length && !flat.insts.some(i => i.part.type === 'shield')) add('info', 'No heat shield: suborbital hops are fine, but returning from orbit will overheat the capsule.');
  if (!pw.ant || pw.ant.range < 6e7) add('info', 'Only the built-in antenna (5,000 km): add an antenna to transmit science from higher orbits or the Moon.');
  // size mismatch
  for (let i = 1; i < d.stack.length; i++) {
    const a = PARTS[d.stack[i - 1].pid], b = PARTS[d.stack[i].pid];
    if (Math.abs(a.rb - b.r) > 0.2 && a.type !== 'nose' && b.type !== 'shield') { add('info', `Size mismatch: ${a.name} (${PartUtil.sizeName(a.rb)}) sits on ${b.name} (${PartUtil.sizeName(b.r)}). An adapter reduces drag.`); break; }
  }
  const fins = flat.insts.filter(i => i.part.type === 'fin');
  if (st0 && st0.twr >= 1 && !fins.length && !flat.insts.some(i => i.part.torque >= 2)) add('info', 'No fins: the rocket may wobble or flip in thick air. Fins near the bottom keep it pointed.');
  if (!out.some(o => o.lvl === 'err')) add('ok', 'Ready to launch.');
  return out;
}

// ---------- Flight vessel objects ----------
const Vessel = {
  fromDesign(d, id) {
    const flat = Layout.flatten(d);
    Staging.sync(d);
    const parts = flat.insts.map(i => {
      const { r, cap } = Perf.initRes(i);
      const p = i.part;
      return {
        iid: i.iid, uid: i.uid, pid: i.pid, pos: i.pos.clone(), ang: i.ang, kind: i.kind, sym: i.sym, gid: i.gid,
        res: r, cap, temp: 288, ablator: p.ablator || 0, chute: p.chute ? 'stowed' : null, deployed: false, active: false,
        limit: i.node.opts && i.node.opts.limit != null ? i.node.opts.limit : 1, data: null, spent: false,
        fair: i.fair ? { h: i.fair.h, r: i.fair.r, on: true } : null, inFairing: i.inFairing || null, crew: [],
      };
    });
    const v = {
      id, name: d.name, type: 'ship', parts, links: flat.links.map(l => l.slice()), root: flat.root,
      stages: d.stages.map(s => s.slice()), stageIdx: 0,
      body: 'earth', r: new V3(), v: new V3(), q: new Q4(), w: new V3(),
      landed: true, splashed: false, landedBF: null, landedQ: null,
      throttle: 0, sas: true, sasMode: 'stab', rcs: false, log: Missions.newLog(), launchT: 0, design: Design.clone(d),
      node: null, target: null, situation: 'pad',
    };
    return v;
  },
  pmap(v) { if (!v._pm || v._pmN !== v.parts.length) { v._pm = {}; v.parts.forEach(p => v._pm[p.iid] = p); v._pmN = v.parts.length; } return v._pm; },
  mass(v) {
    let m = 0; const com = new V3();
    for (const p of v.parts) {
      const part = PARTS[p.pid];
      let pm = part.mass; for (const k in p.res) if (k !== 'EC') pm += p.res[k];
      m += pm; com.addScaledVector(p.pos, pm);
    }
    if (m > 0) com.divideScalar(m);
    return { m, com };
  },
  // bounding info in local frame
  extents(v) {
    let minY = Infinity, maxY = -Infinity, rad = 0;
    const pts = [];
    for (const p of v.parts) {
      const P = PARTS[p.pid];
      const w = P.surf ? (P.w || 0.2) : Math.max(P.r, P.rb);
      let h0 = p.pos.y - P.h / 2, h1 = p.pos.y + P.h / 2;
      if (P.type === 'leg') { h0 -= p.deployed ? P.h * 0.55 : 0; }
      minY = Math.min(minY, h0); maxY = Math.max(maxY, h1);
      const rr = Math.hypot(p.pos.x, p.pos.z) + w; rad = Math.max(rad, rr);
      pts.push(new V3(p.pos.x, h0, p.pos.z));
      if (P.type === 'leg' && p.deployed) { const d = new V3(Math.sin(p.ang), 0, Math.cos(p.ang)); pts.push(new V3(p.pos.x, h0, p.pos.z).addScaledVector(d, P.h * 0.5)); }
      if (!P.surf) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; pts.push(new V3(p.pos.x + Math.cos(a) * w, h0, p.pos.z + Math.sin(a) * w)); }
    }
    return { minY, maxY, rad, len: maxY - minY, pts };
  },
  // Only persistent state is saved; runtime caches (environment, meshes, fuel graphs) are rebuilt.
  KEYS: ['id', 'name', 'type', 'links', 'root', 'stages', 'stageIdx', 'body', 'landed', 'splashed', 'throttle', 'sas', 'sasMode', 'rcs', 'log', 'launchT', 'design', 'target', 'situation', 'biome', 'data', 'crewName', 'prop', 'jetpack', 'fromShip', 'epoch', 'walkPhase', 'lostControl', 'uncontrolled', 'speedMode', 'speedModeAuto', 'mergedInto', 'dead', 'deathMsg'],
  PKEYS: ['iid', 'uid', 'pid', 'ang', 'kind', 'sym', 'gid', 'res', 'cap', 'temp', 'ablator', 'chute', 'deployed', 'active', 'limit', 'data', 'spent', 'fair', 'inFairing', 'crew', 'q', 'ran'],
  toJSON(v) {
    const o = {};
    for (const k of this.KEYS) if (v[k] !== undefined) o[k] = v[k];
    o.r = v.r.toArray(); o.v = v.v.toArray(); o.q = v.q.toArray(); o.w = v.w.toArray();
    o.landedBF = v.landedBF ? v.landedBF.toArray() : null; o.landedQ = v.landedQ ? v.landedQ.toArray() : null;
    if (v.node) o.node = { t: v.node.t, pro: v.node.pro, nrm: v.node.nrm, rad: v.node.rad };
    o.parts = v.parts.map(p => { const q = {}; for (const k of this.PKEYS) if (p[k] !== undefined) q[k] = p[k]; q.pos = p.pos.toArray(); return q; });
    return JSON.parse(JSON.stringify(o));
  },
  fromJSON(o) {
    const v = Object.assign({}, o);
    v.r = new V3().fromArray(o.r); v.v = new V3().fromArray(o.v); v.q = new Q4().fromArray(o.q); v.w = new V3().fromArray(o.w);
    v.landedBF = o.landedBF ? new V3().fromArray(o.landedBF) : null; v.landedQ = o.landedQ ? new Q4().fromArray(o.landedQ) : null;
    v.parts = o.parts.map(p => Object.assign({}, p, { pos: new V3().fromArray(p.pos) }));
    v.links = o.links || []; v.stages = o.stages || []; v.log = o.log || Missions.newLog(); v.data = o.data || [];
    return v;
  },
  crewCount(v) { return v.parts.reduce((a, p) => a + (p.crew ? p.crew.length : 0), 0); },
  hasControl(v, ecOk) {
    for (const p of v.parts) { const P = PARTS[p.pid]; if (P.type === 'pod' && p.crew.length) return 'crew'; }
    for (const p of v.parts) { const P = PARTS[p.pid]; if (P.type === 'probe') return ecOk ? 'probe' : 'nopower'; }
    if (v.type === 'eva') return 'crew';
    return null;
  },
};

// ---------- Starter designs ----------
function starterDesign(kind) {
  const d = Design.empty();
  const N = pid => Design.node(d, pid);
  if (kind === 'hopper') {
    d.name = 'Pebble Hopper';
    const probe = N('probe_pebble'), srb = N('srb_sparrow');
    d.stack.push(N('nose_s'), probe, srb);
    srb.radials.push(Design.group(d, 3, 0.15, 0, null, [N('fin_basic')]));
    probe.radials.push(Design.group(d, 1, 0.5, 90, null, [N('sci_thermo')]));
    probe.radials.push(Design.group(d, 1, 0.5, 270, null, [N('bat_s')]));
  }
  Staging.sync(d);
  return d;
}
