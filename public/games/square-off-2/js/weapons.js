/* Square Off 2 — 30 player weapon families, each with a mod and two branching evolutions */
'use strict';
(function () {
  const P = SO.PAL, M = SO.M;
  const WEAPONS = SO.WEAPONS = {};
  const ORDER = SO.WEAPON_ORDER = [];
  const f1 = n => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
  const f2 = n => (Math.round(n * 100) / 100).toString();
  const pc = n => Math.round(n * 100) + '%';
  function def(d) { if (d.barrel == null) d.barrel = 22; d.bw = d.bw || 7; WEAPONS[d.id] = d; ORDER.push(d.id); }
  // apply global build multipliers
  function fin(p, B) {
    B = B || {};
    if (p.dmg != null) p.dmg *= (B.dmgMul || 1);
    if (p.dps0 != null) p.dps0 *= (B.dmgMul || 1);
    if (p.rate != null) p.rate *= (B.rateMul || 1);
    if (p.spread != null) p.spread *= (B.spreadMul || 1);
    if (p.speed != null) p.speed *= (B.pSpeedMul || 1);
    if (p.rad != null) p.rad *= (B.areaMul || 1);
    p.size = (p.size || 1) * (B.sizeMul || 1);
    p.bounce = (p.bounce || 0) + (p.bounceable ? (B.bounceAdd || 0) : 0);
    p.dps = (p.dmg || 0) * (p.rate || 0) * (p.count || 1) + (p.dps0 || 0);
    return p;
  }
  function gun(P, a, d = 16) { return { x: P.gx + Math.cos(a) * d, y: P.gy + Math.sin(a) * d }; }
  function shot(W, P, a, spd, o) { const g = gun(P, a); return W.addShot(Object.assign({ x: g.x, y: g.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd }, o)); }
  function lob(W, x, y, tx, ty, T, g, o) { return W.addShot(Object.assign({ x, y, vx: (tx - x) / T, vy: (ty - y) / T - 0.5 * g * T, gravity: g }, o)); }
  const rs = s => (Math.random() - 0.5) * s;

  /* 1 Blaster */
  def({
    id: 'blaster', name: 'Blaster', icon: 'blaster', tint: P.teal, tags: ['bullet', 'metal'],
    desc: 'Reliable auto-firing bolts. A solid all-rounder.',
    mod: { name: 'Twin Barrel', desc: '+1 parallel bolt per shot.', max: 2 },
    evos: {
      a: { name: 'Pulse Rifle', desc: 'Fires 60% faster and bolts pierce 1 target, but each bolt deals 20% less.' },
      b: { name: 'Flight Repeater', desc: 'Pattern follows your flight: 3-way spread while thrusting (side bolts 50%), an 8-way ring while dashing (60%), single shot otherwise. +10% fire rate.' }
    },
    calc(w, B) { const p = { rate: 6, dmg: 7, count: 1 + w.mods, pierce: 0, speed: 900, spread: 0.035, bounceable: true }; if (w.evo === 'a') { p.rate *= 1.6; p.dmg *= 0.8; p.pierce = 1; p.speed = 1150; } if (w.evo === 'b') p.rate *= 1.1; return fin(p, B); },
    show: p => ({ Damage: f1(p.dmg), 'Fire rate': f1(p.rate) + '/s', Barrels: p.count, Pierce: p.pierce, Bounces: p.bounce }),
    fire(W, P, ws, p) {
      let angs = [0], ring = false;
      if (ws.w.evo === 'b') { if (P.dashing) { ring = true; angs = [0, 1, 2, 3, 4, 5, 6, 7].map(i => i * Math.PI / 4); } else if (P.thrusting) angs = [-0.18, 0, 0.18]; }
      for (const da of angs) {
        const a = (ring ? da : P.aim + da) + rs(p.spread); const side = !ring && da !== 0 ? 0.5 : ring ? 0.6 : 1;
        for (let i = 0; i < p.count; i++) {
          const off = (i - (p.count - 1) / 2) * 7;
          const s = shot(W, P, a, p.speed, { dmg: p.dmg * side, r: 4 * p.size, life: 1.2, pierce: p.pierce, bounce: p.bounce, kind: 'bolt', src: 'blaster', metal: true });
          s.x += Math.cos(a + Math.PI / 2) * off; s.y += Math.sin(a + Math.PI / 2) * off;
        }
      }
      W.sfx('shoot');
    }
  });

  /* 2 Scattergun */
  def({
    id: 'scatter', name: 'Scattergun', icon: 'scatter', tint: P.warn, tags: ['bullet', 'metal', 'close'], barrel: 18, bw: 10,
    desc: 'Short-range pellet blast. Brutal up close, weak at range.',
    mod: { name: 'Choke Bore', desc: '+2 pellets and 15% tighter spread.', max: 2 },
    evos: {
      a: { name: 'Armor-Breaker', desc: 'Fires one heavy slug (95% of the whole blast) that ignores armor, pierces 2, and Cracks the boss (+10% damage taken for 3s). Needs aim.' },
      b: { name: 'Ricochet Spray', desc: '+50% pellets in a very wide cone; pellets bounce off walls twice and fly longer. Each pellet deals 20% less.' }
    },
    calc(w, B) {
      const p = { rate: 1.35, dmg: 6, count: 6 + 2 * w.mods, spread: 0.5 * Math.pow(0.85, w.mods), speed: 820, life: 0.42, bounceable: true };
      if (w.evo === 'a') { p.dmg = p.dmg * p.count * 0.95; p.count = 1; p.spread = 0.02; p.rate *= 0.9; p.pierce = 2; p.speed = 1000; p.life = 0.9; }
      if (w.evo === 'b') { p.count = Math.round(p.count * 1.5); p.spread = 0.95; p.bounce = 2; p.life = 0.95; p.dmg *= 0.8; }
      fin(p, B); p.dps = p.dmg * p.count * p.rate * (w.evo === 'a' ? 1 : 0.7); return p;
    },
    show: p => ({ Damage: f1(p.dmg) + (p.count > 1 ? ' ×' + p.count : ''), 'Fire rate': f2(p.rate) + '/s', Spread: f2(p.spread) + ' rad', Pierce: p.pierce || 0, Bounces: p.bounce }),
    fire(W, P, ws, p) {
      const slug = ws.w.evo === 'a';
      for (let i = 0; i < p.count; i++) {
        const a = P.aim + (p.count > 1 ? (i / (p.count - 1) - 0.5) * p.spread + rs(0.06) : rs(p.spread));
        shot(W, P, a, p.speed * M.rand(0.85, 1.1), { dmg: p.dmg, r: (slug ? 8 : 3.5) * p.size, life: p.life * M.rand(0.85, 1.1), drag: slug ? 0 : 1.6, bounce: p.bounce, pierce: p.pierce || 0, kind: slug ? 'slug' : 'pellet', src: 'scatter', metal: true, ignoreArmor: slug, crack: slug });
      }
      ws.recoil = 1; W.sfx(slug ? 'heavy' : 'shoot', 1.4);
    }
  });

  /* 3 Rocket Pod */
  def({
    id: 'rocket', name: 'Rocket Pod', icon: 'rocket', tint: P.coral, tags: ['explosive', 'big'], barrel: 20, bw: 11,
    desc: 'Accelerating rockets that explode on impact.',
    mod: { name: 'Bigger Payload', desc: '+25% blast radius and +20% damage.', max: 2 },
    evos: {
      a: { name: 'Cluster Rockets', desc: 'Each blast scatters 5 bomblets (30% damage each, small blasts). Great vs. big targets.' },
      b: { name: 'Swarm Pods', desc: 'Fires 4 small homing rockets (35% damage each, smaller blasts). Never misses, less burst.' }
    },
    calc(w, B) { const p = { rate: 0.85, dmg: 30 * Math.pow(1.2, w.mods), rad: 70 * Math.pow(1.25, w.mods), speed: 760 }; if (w.evo === 'b') { p.count = 4; p.dmg *= 0.35; p.rad *= 0.55; } fin(p, B); p.dps = p.dmg * p.rate * (p.count || 1) * (w.evo === 'a' ? 2.2 : 1); return p; },
    show: p => ({ 'Blast damage': f1(p.dmg) + (p.count ? ' ×' + p.count : ''), 'Blast radius': Math.round(p.rad), 'Fire rate': f2(p.rate) + '/s' }),
    fire(W, P, ws, p) {
      const cl = ws.w.evo === 'a', sw = ws.w.evo === 'b';
      const n = sw ? p.count : 1;
      for (let i = 0; i < n; i++) {
        const a = P.aim + (sw ? (i - 1.5) * 0.35 : 0);
        shot(W, P, a, sw ? 380 : 200, {
          dmg: 0, r: (sw ? 5 : 7) * p.size, life: 2.4, accel: sw ? 900 : 1300, maxSpeed: p.speed, homing: sw ? 5 : 0, kind: sw ? 'mini' : 'rocket', src: 'rocket', big: !sw,
          explode: { r: p.rad, dmg: p.dmg, cluster: cl ? 5 : 0 }
        });
      }
      ws.recoil = 1; W.sfx('heavy', 0.6);
    }
  });

  /* 4 Laser Lance */
  def({
    id: 'laser', name: 'Laser Lance', icon: 'laser', tint: P.teal, tags: ['beam', 'precision'], barrel: 24,
    desc: 'Continuous beam toward your cursor. Stops on the first thing it hits.',
    mod: { name: 'Focusing Crystal', desc: '+25% damage per second and +80 beam length.', max: 2 },
    evos: {
      a: { name: 'Overcharge Beam', desc: 'Damage ramps +15%/s while the beam stays on the boss (max +120%). Thicker. Resets if you look away.' },
      b: { name: 'Trident Laser', desc: 'Three beams in a fan, each at 55% damage. Easier to hit, lower focus.' }
    },
    calc(w, B) { const p = { dps0: 36 * Math.pow(1.25, w.mods), len: 520 + 80 * w.mods, width: 8 }; if (w.evo === 'a') p.width = 14; if (w.evo === 'b') { p.beams = 3; p.dps0 *= 0.55; } fin(p, B); p.dps = p.dps0 * (p.beams || 1) * (w.evo === 'b' ? 0.75 : 1); return p; },
    show: p => ({ 'Damage/sec': f1(p.dps0) + (p.beams ? ' ×3' : ''), Length: Math.round(p.len) }),
    update(W, P, ws, p, dt) {
      const evoA = ws.w.evo === 'a';
      const angs = ws.w.evo === 'b' ? [-0.2, 0, 0.2] : [0];
      let hitBoss = false;
      for (const da of angs) {
        const a = P.aim + da; const g = gun(P, a, 20);
        const mult = evoA ? 1 + Math.min(1.2, (ws.ramp || 0) * 0.15) : 1;
        const r = W.beamP(g.x, g.y, a, p.len, p.width * p.size, p.dps0 * mult * P.rateBoost, 'laser', dt, { col: evoA && ws.ramp > 2 ? P.white : P.friend });
        if (r && (r.kind === 'boss' || r.kind === 'module')) hitBoss = true;
      }
      ws.ramp = hitBoss ? (ws.ramp || 0) + dt : Math.max(0, (ws.ramp || 0) - dt * 4);
      if (Math.random() < dt * 8) W.sfx('beam');
    }
  });

  /* 5 Seeker Darts */
  def({
    id: 'seeker', name: 'Seeker Darts', icon: 'seeker', tint: P.teal, tags: ['homing'],
    desc: 'Homing darts that curve into the boss. Aim matters less.',
    mod: { name: 'Extra Seeker', desc: '+1 dart per volley.', max: 2 },
    evos: {
      a: { name: 'Hunter-Killer', desc: 'Faster darts with +25% crit chance that hunt weapon modules first.' },
      b: { name: 'Swarm Nest', desc: 'Double the darts at 60% damage each, with erratic swarming paths.' }
    },
    calc(w, B) { const p = { rate: 1.5, count: 2 + w.mods, dmg: 11, speed: 420, turn: 4.5 }; if (w.evo === 'a') { p.speed = 600; p.turn = 6; p.crit = 0.25; } if (w.evo === 'b') { p.count *= 2; p.dmg *= 0.6; } fin(p, B); p.dps = p.dmg * p.count * p.rate * 0.95; return p; },
    show: p => ({ Damage: f1(p.dmg) + ' ×' + p.count, 'Fire rate': f2(p.rate) + '/s', 'Bonus crit': pc(p.crit || 0) }),
    fire(W, P, ws, p) {
      for (let i = 0; i < p.count; i++) {
        const a = P.aim + (i - (p.count - 1) / 2) * 0.5 + rs(0.2);
        shot(W, P, a, p.speed * 0.7, { dmg: p.dmg, r: 4.5 * p.size, life: 3, homing: p.turn, maxSpeed: p.speed, accel: 500, kind: 'seeker', src: 'seeker', bonusCrit: p.crit || 0, preferModules: ws.w.evo === 'a', wobble: ws.w.evo === 'b' ? 6 : 0, seeking: true });
      }
      W.sfx('shoot', 0.8);
    }
  });

  /* 6 Boomerang */
  def({
    id: 'boomerang', name: 'Boomerang', icon: 'boomerang', tint: P.coral, tags: ['big', 'pierce'],
    desc: 'Thrown blade that returns to you, hitting on the way out and back.',
    mod: { name: 'Wide Arc', desc: '+30% size and +20% range.', max: 2 },
    evos: {
      a: { name: 'Twinrang', desc: 'Throws two boomerangs that curve on opposite arcs.' },
      b: { name: 'Orbitrang', desc: 'Hangs at max range for 1.5s, grinding anything in its loop, then returns. Slower throws.' }
    },
    calc(w, B) { const p = { rate: 0.9, dmg: 18, range: 380 * Math.pow(1.2, w.mods), size: Math.pow(1.3, w.mods) }; if (w.evo === 'a') p.count = 2; if (w.evo === 'b') { p.rate *= 0.8; p.hang = 1.5; } fin(p, B); p.dps = p.dmg * p.rate * 2 * (p.count || 1) * (p.hang ? 3 : 1) * 0.7; return p; },
    show: p => ({ Damage: f1(p.dmg) + (p.count ? ' ×2' : ''), Range: Math.round(p.range), Size: pc(p.size), 'Throw rate': f2(p.rate) + '/s' }),
    fire(W, P, ws, p) {
      const n = p.count || 1;
      for (let i = 0; i < n; i++) {
        const curve = n > 1 ? (i ? 1 : -1) * 1.4 : 0;
        shot(W, P, P.aim, p.range * 2.6, { dmg: p.dmg, r: 13 * p.size, life: 6, pierce: 999, hitCd: p.hang ? 0.15 : 0.22, kind: 'rang', src: 'boomerang', big: true, rang: { range: p.range, curve, hang: p.hang || 0, out: true, t: 0 }, drag: 0 });
      }
      W.sfx('shoot', 1);
    }
  });

  /* 7 Railgun */
  def({
    id: 'railgun', name: 'Railgun', icon: 'railgun', tint: P.white, tags: ['precision', 'pierce'], barrel: 32, bw: 6,
    desc: 'Charges, then fires an instant piercing rail. Shreds 3 enemy bullets along its line.',
    mod: { name: 'Capacitor', desc: '15% faster charge and +10% damage.', max: 2 },
    evos: {
      a: { name: 'Gauss Repeater', desc: 'Charges in 0.5s for smaller rails (26 dmg) that bounce off one wall.' },
      b: { name: 'Siege Rail', desc: 'Huge 2.2s charge for a 210-damage rail that always crits modules and exposed cores and knocks the boss back.' }
    },
    calc(w, B) { const p = { charge: 1.4 * Math.pow(0.85, w.mods), dmg: 75 * Math.pow(1.1, w.mods) }; if (w.evo === 'a') { p.charge = 0.5 * Math.pow(0.85, w.mods); p.dmg = 26 * Math.pow(1.1, w.mods); p.ricochet = 1; } if (w.evo === 'b') { p.charge = 2.2 * Math.pow(0.85, w.mods); p.dmg = 210 * Math.pow(1.1, w.mods); } p.rate = 1 / p.charge; fin(p, B); p.charge = 1 / p.rate; p.dps = p.dmg * p.rate * 0.85; return p; },
    show: p => ({ Damage: f1(p.dmg), 'Charge time': f2(p.charge) + 's', Ricochets: p.ricochet || 0 }),
    update(W, P, ws, p, dt) {
      ws.ch = (ws.ch || 0) + dt * P.rateBoost;
      if (ws.ch >= p.charge) {
        ws.ch = 0; ws.recoil = 1;
        const siege = ws.w.evo === 'b';
        let x = P.gx, y = P.gy, a = P.aim, bounces = p.ricochet || 0;
        for (let k = 0; k <= bounces; k++) {
          const len = M.rayToWall(x, y, a);
          W.railP(x, y, a, len, p.dmg, 'railgun', { siege, width: siege ? 16 : 7 });
          x += Math.cos(a) * len; y += Math.sin(a) * len;
          const A = SO.ARENA; if (x <= A.L + 1 || x >= A.R - 1) a = Math.PI - a; else a = -a;
        }
        if (siege) { W.shake(6); W.sfx('heavy', 1.5); } else W.sfx('heavy', 0.8);
      }
    },
    drawCharge(ctx, W, P, ws, p) {
      const t = (ws.ch || 0) / p.charge; if (t < 0.15) return;
      ctx.save(); ctx.globalAlpha = 0.25 + t * 0.5; ctx.strokeStyle = P_FRIEND(); ctx.lineWidth = 1 + t * 2; ctx.setLineDash([10, 8]);
      const len = M.rayToWall(P.gx, P.gy, P.aim) * Math.min(1, t * 1.2);
      ctx.beginPath(); ctx.moveTo(P.gx, P.gy); ctx.lineTo(P.gx + Math.cos(P.aim) * len, P.gy + Math.sin(P.aim) * len); ctx.stroke(); ctx.restore();
    }
  });
  const P_FRIEND = () => SO.PAL.friend;

  /* 8 Tesla Coil */
  def({
    id: 'tesla', name: 'Tesla Coil', icon: 'tesla', tint: P.warn, tags: ['chain', 'close'], barrel: 12, bw: 12,
    desc: 'Auto-zaps the nearest target within range and arcs to one more. No aiming needed — get close.',
    mod: { name: 'Bigger Coil', desc: '+80 zap range and +10% damage.', max: 2 },
    evos: {
      a: { name: 'Storm Coil', desc: 'Zaps twice as often and each zap fries up to 3 enemy bullets in range.' },
      b: { name: 'Arc Conductor', desc: 'Zaps route through your deployed objects (saws, charges, drones, lenses, mines, satellites); each conductor adds +25% damage (max 4).' }
    },
    calc(w, B) { const p = { interval: 0.5, range: 300 + 80 * w.mods, dmg: 18 * Math.pow(1.1, w.mods), chains: 1 }; if (w.evo === 'a') p.interval = 0.25; p.rate = 1 / p.interval; fin(p, B); p.interval = 1 / p.rate; p.dps = p.dmg * p.rate * 1.2; return p; },
    show: p => ({ Damage: f1(p.dmg), 'Zaps/sec': f2(p.rate), Range: Math.round(p.range) }),
    update(W, P, ws, p, dt) {
      ws.cd = (ws.cd || 0) - dt * P.rateBoost; if (ws.cd > 0) return;
      const tgt = W.findTarget(P.gx, P.gy, { range: p.range, enemies: true }); if (!tgt) { ws.cd = 0.08; return; }
      ws.cd = p.interval;
      let pts = [P.gx, P.gy - 6], mult = 1;
      if (ws.w.evo === 'b') {
        const cond = W.allies.filter(o => o.conductor && !o.dead).sort((a, b) => M.dist2(a.x, a.y, tgt.x, tgt.y) - M.dist2(b.x, b.y, tgt.x, tgt.y));
        let used = 0, cx = P.gx, cy = P.gy;
        for (const o of cond) { if (used >= 4) break; if (M.dist(cx, cy, o.x, o.y) < 320) { pts.push(o.x, o.y); cx = o.x; cy = o.y; used++; o.zapT = 0.2; } }
        mult += 0.25 * used;
      }
      pts.push(tgt.x, tgt.y);
      W.applyHit(tgt, p.dmg * mult, 'tesla', tgt.x, tgt.y, { proc: true });
      W.fxBolt(pts, P.warn, 3);
      // chain
      const t2 = W.findTarget(tgt.x, tgt.y, { range: 220, enemies: true, exclude: tgt.ref });
      if (t2) { W.applyHit(t2, p.dmg * mult * 0.6, 'tesla', t2.x, t2.y, {}); W.fxBolt([tgt.x, tgt.y, t2.x, t2.y], P.warn, 2); }
      if (ws.w.evo === 'a') { let n = 0; for (const s of W.eShotsInCircle(P.gx, P.gy, p.range)) { if (n >= 3) break; if (!s.big) { W.fxBolt([P.gx, P.gy, s.x, s.y], P.tealLight, 1.5); W.killEShot(s, 'zap'); n++; } } }
      W.sfx('zap');
    }
  });

  /* 9 Orbit Blades */
  def({
    id: 'blades', name: 'Orbit Blades', icon: 'blades', tint: P.cream, tags: ['orbit', 'close', 'interceptor'], barrel: 0,
    desc: 'Blades circle you, cutting the boss on contact. Each blade blocks one enemy bullet, then recharges in 2s.',
    mod: { name: 'Extra Blade', desc: '+1 orbiting blade.', max: 2 },
    evos: {
      a: { name: 'Buzzsaw Halo', desc: 'Wider orbit (110), +50% damage, bigger blades, block recharge 1s.' },
      b: { name: 'Blade Launcher', desc: 'Every 1.5s one blade launches at your cursor (30 dmg, pierces 3) and regrows. Orbit becomes ranged.' }
    },
    calc(w, B) { const p = { count: 3 + w.mods, radius: 72, dmg: 14, recharge: 2, bsize: 1 }; if (w.evo === 'a') { p.radius = 110; p.dmg *= 1.5; p.bsize = 1.5; p.recharge = 1; } if (w.evo === 'b') { p.launch = 1.5; p.ldmg = 30; } fin(p, B); if (p.ldmg) p.ldmg *= (B.dmgMul || 1); p.dps = p.dmg * 4 * 0.5 + (p.ldmg ? p.ldmg / p.launch : 0); return p; },
    show: p => ({ Blades: p.count, Damage: f1(p.dmg), 'Orbit radius': Math.round(p.radius), 'Block recharge': p.recharge + 's', Launch: p.launch ? f1(p.ldmg) + ' / 1.5s' : '—' }),
    update(W, P, ws, p, dt) {
      if (!ws.bl) ws.bl = [];
      while (ws.bl.length < p.count) ws.bl.push({ block: 1, grow: 1, hit: new Map() });
      ws.bl.length = p.count;
      ws.spin = (ws.spin || 0) + dt * 3.2;
      const r = p.radius * p.size;
      ws.lt = (ws.lt || 0) + dt * P.rateBoost;
      for (let i = 0; i < ws.bl.length; i++) {
        const b = ws.bl[i]; const a = ws.spin + i / ws.bl.length * Math.PI * 2;
        b.x = P.x + Math.cos(a) * r; b.y = P.y + Math.sin(a) * r; b.a = a;
        b.grow = Math.min(1, b.grow + dt / 1.5);
        if (b.block < 1) b.block = Math.min(1, b.block + dt / p.recharge);
        if (b.grow < 1) continue;
        const br = 9 * p.bsize * p.size;
        for (const t of W.targetsInCircle(b.x, b.y, br)) {
          const last = b.hit.get(t.ref) || -9; if (W.time - last < 0.25) continue;
          b.hit.set(t.ref, W.time); W.applyHit(t, p.dmg, 'blades', b.x, b.y, { proc: true }); W.fxSpark(b.x, b.y, P.cream, 3);
        }
        if (b.block >= 1) { const es = W.eShotsInCircle(b.x, b.y, br + 4); for (const s of es) { if (s.big) continue; W.killEShot(s, 'cut'); b.block = 0; break; } }
      }
      if (p.launch && ws.lt >= p.launch) {
        const b = ws.bl.find(b => b.grow >= 1); if (b) { ws.lt = 0; b.grow = 0; const a = M.ang(b.x, b.y, W.mouse.x, W.mouse.y); W.addShot({ x: b.x, y: b.y, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, dmg: p.ldmg, r: 9 * p.size, life: 1.2, pierce: 3, kind: 'blade', src: 'blades', big: true, metal: true }); W.sfx('shoot'); }
      }
    },
    draw(ctx, W, P, ws, p) {
      if (!ws.bl) return;
      for (const b of ws.bl) {
        if (b.x == null) continue; const s = 9 * p.bsize * p.size * Math.max(0.2, b.grow);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a * 3);
        SO.art.ink(ctx, () => SO.art.poly(ctx, [s, 0, 0, s * 0.45, -s, 0, 0, -s * 0.45]), b.block >= 1 ? P.cream : P.paperDeep, 2);
        if (b.block >= 1) { ctx.fillStyle = P.teal; SO.art.circ(ctx, 0, 0, 2.5); ctx.fill(); }
        ctx.restore();
      }
    }
  });

  /* 10 Gravity Well */
  def({
    id: 'gravity', name: 'Gravity Well', icon: 'gravity', tint: P.violet, tags: ['control', 'interceptor'], barrel: 16, bw: 12,
    desc: 'Launches an orb that becomes a well at your cursor: it drags in and crushes enemy bullets and grinds the boss (25 dmg/s).',
    mod: { name: 'Event Horizon', desc: '+25% well radius and +1s duration.', max: 2 },
    evos: {
      a: { name: 'Singularity', desc: 'The well collapses into a blast: 70 damage +4 per bullet it swallowed (max +120).' },
      b: { name: 'Repulsor Field', desc: 'The well forms around YOU instead, pushing away and slowing enemy bullets for 2.5s. Defensive.' }
    },
    calc(w, B) { const p = { rate: 0.33, rad: 150 * Math.pow(1.25, w.mods), dur: 3 + w.mods, dps0: 25 }; if (w.evo === 'b') { p.rad = 140 * Math.pow(1.2, w.mods); p.dur = 2.5 + w.mods * 0.5; } if (w.evo === 'a') p.boom = 70; fin(p, B); if (p.boom) p.boom *= (B.dmgMul || 1); p.dps = p.dps0 * p.dur * p.rate * 0.6 + (p.boom ? p.boom * p.rate : 0); return p; },
    show: p => ({ Radius: Math.round(p.rad), Duration: f1(p.dur) + 's', 'Grind dmg/s': f1(p.dps0), 'Collapse blast': p.boom ? f1(p.boom) + '+' : '—', 'Cast rate': f2(p.rate) + '/s' }),
    fire(W, P, ws, p) {
      if (ws.w.evo === 'b') { W.addAlly(SO.makeWell(W, P.x, P.y, p, true)); W.sfx('util'); return; }
      const d = Math.min(520, M.dist(P.gx, P.gy, W.mouse.x, W.mouse.y));
      shot(W, P, P.aim, 420, { dmg: 0, r: 8, life: d / 420, kind: 'wellorb', src: 'gravity', noHit: true, onDeath: (W, s) => W.addAlly(SO.makeWell(W, s.x, s.y, p, false)) });
      W.sfx('shoot');
    }
  });

  /* 11 Drone Bay */
  def({
    id: 'drones', name: 'Drone Bay', icon: 'drones', tint: P.teal, tags: ['drone'], barrel: 0,
    desc: 'Little drones follow you and shoot the boss on their own.',
    mod: { name: 'Extra Drone', desc: '+1 drone.', max: 2 },
    evos: {
      a: { name: 'Gunship Wing', desc: 'Drones fire 3-round bursts with laser sights (about +50% drone damage overall).' },
      b: { name: 'Kamikaze Bay', desc: 'Drones dive into the boss for 45 explosive damage, then rebuild in 2s at your side.' }
    },
    calc(w, B) { const p = { count: 2 + w.mods, interval: 0.6, dmg: 8 }; if (w.evo === 'a') { p.burst = 3; p.interval = 1.2; } if (w.evo === 'b') { p.kdmg = 45; } p.rate = 1 / p.interval; fin(p, B); if (p.kdmg) p.kdmg *= (B.dmgMul || 1); p.interval = 1 / p.rate; p.dps = p.kdmg ? p.kdmg * p.count / 3.4 : p.dmg * (p.burst || 1) * p.rate * p.count; return p; },
    show: p => ({ Drones: p.count, Damage: p.kdmg ? f1(p.kdmg) + ' (dive)' : f1(p.dmg) + (p.burst ? ' ×3' : ''), Interval: p.kdmg ? '—' : f2(p.interval) + 's' }),
    update(W, P, ws, p, dt) {
      if (!ws.dr) ws.dr = [];
      while (ws.dr.length < p.count) { const d = { x: P.x, y: P.y, cd: Math.random() * 0.5, st: 'follow', reb: 0, conductor: true, ally: true }; ws.dr.push(d); }
      ws.dr.length = p.count;
      ws.dr.forEach((d, i) => {
        const home = { x: P.x + Math.cos(W.time * 1.4 + i * 2.1) * 46, y: P.y - 34 + Math.sin(W.time * 2 + i) * 10 };
        if (d.st === 'rebuild') { d.reb -= dt; d.x = P.x; d.y = P.y; if (d.reb <= 0) d.st = 'follow'; return; }
        if (d.st === 'dive') {
          const t = W.findTarget(d.x, d.y, {}); if (!t) { d.st = 'follow'; return; }
          const a = M.ang(d.x, d.y, t.x, t.y); d.x += Math.cos(a) * 620 * dt; d.y += Math.sin(a) * 620 * dt; d.a = a;
          if (M.dist(d.x, d.y, t.x, t.y) < 30 || W.targetsInCircle(d.x, d.y, 10).length) { W.explodeP(d.x, d.y, 60, p.kdmg, 'drones', {}); d.st = 'rebuild'; d.reb = 2; }
          return;
        }
        d.x += (home.x - d.x) * Math.min(1, dt * 7); d.y += (home.y - d.y) * Math.min(1, dt * 7);
        d.cd -= dt * P.rateBoost;
        const t = W.findTarget(d.x, d.y, { range: 900 });
        if (t) d.a = M.ang(d.x, d.y, t.x, t.y);
        if (d.cd <= 0 && t) {
          if (p.kdmg) { d.st = 'dive'; d.cd = 1.4; return; }
          d.cd = p.interval;
          for (let k = 0; k < (p.burst || 1); k++) {
            W.later(k * 0.07, () => { W.addShot({ x: d.x, y: d.y, vx: Math.cos(d.a) * 720, vy: Math.sin(d.a) * 720, dmg: p.dmg, r: 3.5, life: 1.4, kind: 'pellet', src: 'drones' }); });
          }
        }
      });
    },
    draw(ctx, W, P, ws, p) {
      if (!ws.dr) return;
      for (const d of ws.dr) {
        if (d.st === 'rebuild') continue;
        ctx.save(); ctx.translate(d.x, d.y);
        if (ws.w.evo === 'a' && d.a != null) { ctx.save(); ctx.globalAlpha = 0.3; ctx.strokeStyle = P.friend; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(d.a) * 160, Math.sin(d.a) * 160); ctx.stroke(); ctx.restore(); }
        SO.art.inkRect(ctx, -8, -6, 16, 12, 3, d.st === 'dive' ? P.warn : P.teal, 2);
        ctx.fillStyle = P.ink; ctx.fillRect(-12, -10, 8, 2); ctx.fillRect(4, -10, 8, 2);
        ctx.fillStyle = P.white; SO.art.circ(ctx, Math.cos(d.a || 0) * 2, 0, 2.2); ctx.fill();
        ctx.restore();
      }
    }
  });

  /* 12 Magnetic Harpoon */
  def({
    id: 'harpoon', name: 'Magnetic Harpoon', icon: 'harpoon', tint: P.coral, tags: ['metal', 'control', 'precision'], barrel: 26, bw: 6, unlock: 'r5',
    desc: 'Harpoon that Magnetizes the boss for 4s: your METAL projectiles curve toward it and deal +15%. Skewers enemy metal shots in its path.',
    mod: { name: 'Barbed Tip', desc: '+40% harpoon damage and +2s Magnetized.', max: 2 },
    evos: {
      a: { name: 'Reel-In', desc: 'Hits yank the boss toward you and interrupt its current normal attack (once per 8s).' },
      b: { name: 'Lodestone', desc: 'A Magnetized boss drags enemy METAL shots within 170px into itself, crushing them for 4 damage each.' }
    },
    calc(w, B) { const p = { rate: 0.6, dmg: 22 * Math.pow(1.4, w.mods), mark: 4 + 2 * w.mods, speed: 950 }; fin(p, B); p.dps = p.dmg * p.rate; return p; },
    show: p => ({ Damage: f1(p.dmg), 'Magnetize time': p.mark + 's', 'Fire rate': f2(p.rate) + '/s' }),
    fire(W, P, ws, p) {
      shot(W, P, P.aim, p.speed, { dmg: p.dmg, r: 6, life: 1.2, kind: 'harpoon', src: 'harpoon', metal: true, skewer: 3, onHit: (W, s, t) => { if (t.kind === 'boss' || t.kind === 'module') { W.statusBoss('magnet', 1, p.mark); if (ws.w.evo === 'a') W.reelBoss(P); if (ws.w.evo === 'b') W.boss.lodestone = p.mark; } } });
      ws.recoil = 1; W.sfx('shoot', 1.2);
    }
  });

  /* 13 Prism Projector */
  def({
    id: 'prism', name: 'Prism Projector', icon: 'prism', tint: '#cdf6ff', tags: ['beam', 'lens'], unlock: 'r5',
    desc: 'Fires light bolts and deploys a lens at your cursor every 6s. ANY of your shots or beams crossing a lens split into 3 (60% each).',
    mod: { name: 'Clear Glass', desc: 'Lenses last +3s and bolts deal +20%.', max: 2 },
    evos: {
      a: { name: 'Kaleidoscope', desc: 'Lenses split into 5 (45% each), deploy every 4s and two can exist at once.' },
      b: { name: 'Focus Lens', desc: 'Lenses no longer split: shots passing through gain +80% damage, +2 pierce and +30% speed; beams +60%.' }
    },
    calc(w, B) { const p = { rate: 2.5, dmg: 10 * Math.pow(1.2, w.mods), speed: 820, lensT: 5 + 3 * w.mods, lensEvery: 6, max: 1, split: 3, frac: 0.6 }; if (w.evo === 'a') { p.split = 5; p.frac = 0.45; p.lensEvery = 4; p.max = 2; } if (w.evo === 'b') { p.split = 0; p.focus = true; } fin(p, B); p.dps = p.dmg * p.rate * 1.4; return p; },
    show: p => ({ 'Bolt damage': f1(p.dmg), 'Fire rate': f2(p.rate) + '/s', 'Lens split': p.focus ? 'Focus +80%' : p.split + ' × ' + pc(p.frac), 'Lens time': p.lensT + 's', 'Max lenses': p.max }),
    fire(W, P, ws, p) { shot(W, P, P.aim + rs(0.03), p.speed, { dmg: p.dmg, r: 4 * p.size, life: 1.2, kind: 'light', src: 'prism', bounceable: true }); W.sfx('shoot', 0.7); },
    extra(W, P, ws, p, dt) {
      ws.lens = (ws.lens == null ? p.lensEvery - 0.5 : ws.lens) + dt;
      if (ws.lens >= p.lensEvery) {
        ws.lens = 0; const mine = W.lenses.filter(l => !l.dead);
        while (mine.length >= p.max) { mine.shift().dead = true; }
        const A = SO.ARENA; W.lenses.push({ x: M.clamp(W.mouse.x, A.L + 30, A.R - 30), y: M.clamp(W.mouse.y, A.T + 30, A.B - 30), r: 26, t: 0, life: p.lensT, split: p.split, frac: p.frac, focus: !!p.focus, conductor: true });
        W.sfx('shield');
      }
    }
  });

  /* 14 Saw Wheel */
  def({
    id: 'saw', name: 'Saw Wheel', icon: 'saw', tint: P.cream, tags: ['deploy', 'big', 'metal'], unlock: 'r3', bw: 9,
    desc: 'Lobs saw wheels that roll along the arena\'s walls, floor and ceiling for 6s, hopping at the boss when it comes close. Max 3.',
    mod: { name: 'Serrated', desc: '+30% damage and +1 max saw.', max: 2 },
    evos: {
      a: { name: 'Grinder Wheel', desc: 'Saws 80% bigger, last 10s, +40% damage, roll slower.' },
      b: { name: 'Pinball Saw', desc: 'Saws ignore the walls\' tracks and ricochet freely around the arena (8 bounces) at high speed.' }
    },
    calc(w, B) { const p = { rate: 0.5, dmg: 16 * Math.pow(1.3, w.mods), max: 3 + w.mods, life: 6, roll: 420, ssize: 1 }; if (w.evo === 'a') { p.ssize = 1.8; p.life = 10; p.dmg *= 1.4; p.roll = 300; } if (w.evo === 'b') { p.pin = 8; } fin(p, B); p.dps = p.dmg * 2 * Math.min(p.max, p.rate * p.life); return p; },
    show: p => ({ Damage: f1(p.dmg), 'Max saws': p.max, Lifetime: p.life + 's', Size: pc(p.ssize * p.size) }),
    fire(W, P, ws, p) {
      const mine = W.pShots.filter(s => s.kind === 'saw' && !s.dead); if (mine.length >= p.max) { mine[0].life = Math.min(mine[0].life, 0.3); }
      const pin = !!p.pin;
      shot(W, P, P.aim, pin ? 640 : 620, { dmg: p.dmg, r: 13 * p.ssize * p.size, life: p.life, pierce: 999, hitCd: 0.2, kind: 'saw', src: 'saw', big: true, metal: true, gravity: pin ? 0 : 260, bounce: pin ? p.pin : 0, saw: { roll: pin ? 0 : p.roll }, conductor: true });
      W.sfx('shoot', 1.2);
    }
  });

  /* 15 Echo Gun */
  def({
    id: 'echo', name: 'Echo Gun', icon: 'echo', tint: P.tealLight, tags: ['bullet', 'precision'], unlock: 'r3',
    desc: 'Each shot leaves a ghost marker; 0.8s later an echo fires the same shot again from that spot (70% damage).',
    mod: { name: 'Clear Signal', desc: '+30% echo damage and +10% shot damage.', max: 2 },
    evos: {
      a: { name: 'Double Echo', desc: 'A second echo repeats the shot again at 1.6s.' },
      b: { name: 'Resonance', desc: 'Echoes that hit within 1.2s of the original shot hitting deal +25% damage and always crit.' }
    },
    calc(w, B) { const p = { rate: 2, dmg: 14 * Math.pow(1.1, w.mods), echo: 0.7 + 0.3 * w.mods, speed: 860, bounceable: true }; if (w.evo === 'a') p.echoes = 2; fin(p, B); p.dps = p.dmg * p.rate * (1 + p.echo * (p.echoes || 1)) * 0.85; return p; },
    show: p => ({ Damage: f1(p.dmg), 'Echo damage': pc(p.echo), Echoes: p.echoes || 1, 'Fire rate': f2(p.rate) + '/s' }),
    fire(W, P, ws, p) {
      const g = gun(P, P.aim), a = P.aim;
      const id = Math.random();
      const mk = (x, y, mult, echo) => W.addShot({ x, y, vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed, dmg: p.dmg * mult, r: 4.5 * p.size, life: 1.2, kind: echo ? 'echo' : 'bolt', src: 'echo', bounce: p.bounce, echoId: id, isEcho: echo, resonance: ws.w.evo === 'b' });
      mk(g.x, g.y, 1, false);
      const n = p.echoes || 1;
      for (let i = 1; i <= n; i++) {
        W.ghosts.push({ x: g.x, y: g.y, a, t: 0, dur: 0.8 * i });
        W.later(0.8 * i, () => { mk(g.x, g.y, p.echo, true); W.fxRing(g.x, g.y, 4, 16, P.tealLight, 0.25); });
      }
      W.sfx('shoot', 0.9);
    }
  });

  /* 16 Sticky Charges */
  def({
    id: 'sticky', name: 'Sticky Charges', icon: 'sticky', tint: P.coral, tags: ['explosive', 'deploy', 'chain'], unlock: 'mods', bw: 9,
    desc: 'Charges stick to the boss or walls and blow after 2.5s. A blast sets off nearby charges instantly, each link +15% damage.',
    mod: { name: 'Extra Charge', desc: '+1 charge per volley.', max: 2 },
    evos: {
      a: { name: 'Daisy Chain', desc: 'Chain bonus becomes +35% per link and blasts are 20% bigger.' },
      b: { name: 'Dead Man\'s Switch', desc: 'Charges wait (up to 12s) until you DASH, then all detonate with +50% damage.' }
    },
    calc(w, B) { const p = { rate: 0.8, count: 1 + w.mods, dmg: 34, rad: 80, fuse: 2.5, chain: 0.15 }; if (w.evo === 'a') { p.chain = 0.35; p.rad *= 1.2; } if (w.evo === 'b') { p.fuse = 12; p.dash = true; p.dmg *= 1.5; } fin(p, B); p.dps = p.dmg * p.count * p.rate * 1.15; return p; },
    show: p => ({ 'Blast damage': f1(p.dmg) + ' ×' + p.count, 'Blast radius': Math.round(p.rad), 'Chain bonus': '+' + pc(p.chain) + '/link', Trigger: p.dash ? 'On dash' : p.fuse + 's fuse' }),
    fire(W, P, ws, p) {
      const live = W.pShots.filter(s => s.kind === 'sticky' && !s.dead); if (live.length > 14) return;
      for (let i = 0; i < p.count; i++) shot(W, P, P.aim + (i - (p.count - 1) / 2) * 0.16, 640, { dmg: 0, r: 6, life: p.fuse + 0.6, kind: 'sticky', src: 'sticky', gravity: 500, stick: true, fuse: p.fuse, dashDet: !!p.dash, conductor: true, explode: { r: p.rad, dmg: p.dmg, chain: p.chain } });
      W.sfx('shoot', 0.8);
    }
  });

  /* 17 Flak Cannon */
  def({
    id: 'flak', name: 'Flak Cannon', icon: 'flak', tint: P.warn, tags: ['explosive', 'interceptor'], bw: 10,
    desc: 'Shells burst at your cursor (max 340px) into 8 shards. Each shard destroys an enemy bullet it touches.',
    mod: { name: 'Dense Shrapnel', desc: '+4 shards per burst.', max: 2 },
    evos: {
      a: { name: 'Airburst Screen', desc: 'Shells burst early near enemy bullets, +2 shards, and each shard can destroy 2 bullets. A wall of defense.' },
      b: { name: 'Heavy Flak', desc: 'Shell impact deals 30 in a small blast and shards deal +50% damage.' }
    },
    calc(w, B) { const p = { rate: 1, shards: 8 + 4 * w.mods, dmg: 6, range: 340 }; if (w.evo === 'a') { p.shards += 2; p.eat = 2; } if (w.evo === 'b') { p.dmg *= 1.5; p.impact = 30; } fin(p, B); if (p.impact) p.impact *= (B.dmgMul || 1); p.dps = (p.dmg * p.shards * 0.4 + (p.impact || 0)) * p.rate; return p; },
    show: p => ({ Shards: p.shards, 'Shard damage': f1(p.dmg), 'Impact blast': p.impact ? f1(p.impact) : '—', 'Bullets per shard': p.eat || 1 }),
    fire(W, P, ws, p) {
      const d = M.clamp(M.dist(P.gx, P.gy, W.mouse.x, W.mouse.y), 60, p.range);
      shot(W, P, P.aim, 640, { dmg: p.impact ? 0 : 8, r: 6 * p.size, life: d / 640, kind: 'shell', src: 'flak', airburst: ws.w.evo === 'a', onDeath: (W, s) => {
        if (p.impact) W.explodeP(s.x, s.y, 50, p.impact, 'flak', { small: true });
        for (let i = 0; i < p.shards; i++) { const a = i / p.shards * Math.PI * 2 + Math.random() * 0.3; W.addShot({ x: s.x, y: s.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, dmg: p.dmg, r: 3, life: 0.36, kind: 'frag', src: 'flak', eat: 1, eatN: p.eat || 1, gen: 1 }); }
        W.fxSpark(s.x, s.y, P.warn, 6); W.sfx('smallboom');
      } });
    }
  });

  /* 18 Flamethrower */
  def({
    id: 'flame', name: 'Pilot Flame', icon: 'flame', tint: P.coral, tags: ['dot', 'close'], bw: 11, barrel: 18,
    desc: 'Short-range cone of fire (200px). 35% chance per tick to add a Burn stack (4 dmg/s each, 3s, max 5).',
    mod: { name: 'Pressurized Tank', desc: '+60 range and +20% damage.', max: 2 },
    evos: {
      a: { name: 'Napalm', desc: 'Also lobs sticky napalm every 0.6s that adds 2 Burn stacks. Burn cap +5.' },
      b: { name: 'Blue Flame', desc: '40% longer flame, Burn deals double, and the cone melts enemy bullets inside it.' }
    },
    calc(w, B) { const p = { range: 200 + 60 * w.mods, dps0: 30 * Math.pow(1.2, w.mods), half: 0.32, burnChance: 0.35 }; if (w.evo === 'b') { p.range *= 1.4; p.blue = true; } if (w.evo === 'a') p.napalm = 0.6; fin(p, B); p.dps = p.dps0 + 12; return p; },
    show: p => ({ 'Damage/sec': f1(p.dps0), Range: Math.round(p.range), 'Burn chance/tick': pc(p.burnChance), Napalm: p.napalm ? 'every 0.6s' : '—' }),
    update(W, P, ws, p, dt) {
      ws.tick = (ws.tick || 0) + dt * P.rateBoost;
      const a = P.aim, g = gun(P, a, 20);
      for (let i = 0; i < (SO.art.light ? 1 : 2); i++) { const aa = a + rs(p.half * 1.6); const sp = p.range * M.rand(2.4, 3.2); W.fxFlame(g.x, g.y, Math.cos(aa) * sp + P.vx * 0.5, Math.sin(aa) * sp + P.vy * 0.5, p.blue); }
      if (ws.tick >= 0.1) {
        ws.tick -= 0.1;
        for (const t of W.targetsInCone(g.x, g.y, a, p.half, p.range)) {
          W.applyHit(t, p.dps0 * 0.1, 'flame', t.x, t.y, { proc: false, noWord: true, lowCrit: true });
          if (t.kind !== 'enemy' && Math.random() < p.burnChance) W.statusBoss('burn', 1, 3, { mult: p.blue ? 2 : 1 });
        }
        if (p.blue) for (const s of W.eShotsInCone(g.x, g.y, a, p.half, p.range)) if (!s.big) W.killEShot(s, 'melt');
      }
      if (p.napalm) { ws.nap = (ws.nap || 0) + dt; if (ws.nap >= p.napalm) { ws.nap = 0; shot(W, P, a, 520, { dmg: 4, r: 6, life: 1.5, gravity: 700, kind: 'napalm', src: 'flame', onHit: (W) => { W.statusBoss('burn', 2, 3); } }); } }
    }
  });

  /* 19 Needle Gun */
  def({
    id: 'needle', name: 'Needle Gun', icon: 'needle', tint: P.cream, tags: ['bullet', 'dot', 'metal'], bw: 5, barrel: 26,
    desc: 'Very fast stream of needles. Every 4th hit adds Bleed (1.5 dmg/s per stack, 4s, max 12).',
    mod: { name: 'Barbed Needles', desc: 'Bleed every 3rd hit and +10% damage.', max: 2 },
    evos: {
      a: { name: 'Hemorrhage Pump', desc: 'At 12 Bleed stacks, all stacks burst for 80 damage (can crit).' },
      b: { name: 'Flechette Storm', desc: '2 needles per shot (75% damage each), +10% fire rate, wider spread.' }
    },
    calc(w, B) { const p = { rate: 14, dmg: 2.2 * Math.pow(1.1, w.mods), speed: 1300, spread: 0.06, bleedEvery: w.mods ? 3 : 4, bounceable: true }; if (w.evo === 'b') { p.count = 2; p.rate *= 1.1; p.dmg *= 0.75; p.spread = 0.16; } if (w.evo === 'a') p.pump = 80; fin(p, B); if (p.pump) p.pump *= (B.dmgMul || 1); p.dps = p.dmg * p.rate * (p.count || 1) * 0.85 + 12; return p; },
    show: p => ({ Damage: f1(p.dmg) + (p.count ? ' ×2' : ''), 'Fire rate': f1(p.rate) + '/s', 'Bleed every': p.bleedEvery + ' hits', Burst: p.pump ? f1(p.pump) : '—' }),
    fire(W, P, ws, p) {
      for (let i = 0; i < (p.count || 1); i++) shot(W, P, P.aim + rs(p.spread), p.speed, { dmg: p.dmg, r: 2.5, life: 0.9, kind: 'needle', src: 'needle', metal: true, bounce: p.bounce, onHit: (W, s, t) => { if (t.kind === 'enemy') return; ws.hits = (ws.hits || 0) + 1; if (ws.hits % p.bleedEvery === 0) { W.statusBoss('bleed', 1, 4); if (p.pump && W.boss.st.bleed.n >= 12) { W.boss.st.bleed.n = 0; W.applyHit({ kind: 'boss', ref: W.boss, x: W.boss.x, y: W.boss.y }, p.pump, 'needle', W.boss.x, W.boss.y, { proc: false }); W.word('SPLURT!', W.boss.x, W.boss.y - 40, 'crit'); } } } });
      W.sfx('shoot', 0.5);
    }
  });

  /* 20 Mortar */
  def({
    id: 'mortar', name: 'Mortar', icon: 'mortar', tint: P.blueLight, tags: ['explosive', 'big'], bw: 11, barrel: 16,
    desc: 'Lobs shells that land on your cursor and explode (90 radius). Lead your target.',
    mod: { name: 'Wider Blast', desc: '+25% blast radius and +15% damage.', max: 2 },
    evos: {
      a: { name: 'Carpet Shelling', desc: 'Three shells (65% damage each) land in a line along your aim. Hard to dodge, easy to land.' },
      b: { name: 'Bunker Buster', desc: 'Shells that hit the boss lodge in it and explode twice. 25% slower fire.' }
    },
    calc(w, B) { const p = { rate: 0.7, dmg: 40 * Math.pow(1.15, w.mods), rad: 90 * Math.pow(1.25, w.mods), flight: 0.8 }; if (w.evo === 'a') { p.count = 3; p.dmg *= 0.65; } if (w.evo === 'b') { p.rate *= 0.75; p.dmg *= 1.1; p.buster = true; } fin(p, B); p.dps = p.dmg * p.rate * (p.count || 1) * 0.6 * (p.buster ? 1.7 : 1); return p; },
    show: p => ({ 'Blast damage': f1(p.dmg) + (p.count ? ' ×3' : ''), 'Blast radius': Math.round(p.rad), 'Fire rate': f2(p.rate) + '/s', 'Double blast': p.buster ? 'Yes' : 'No' }),
    fire(W, P, ws, p) {
      const n = p.count || 1; const A = SO.ARENA;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 90;
        const tx = M.clamp(W.mouse.x + Math.cos(P.aim) * off, A.L + 10, A.R - 10), ty = M.clamp(W.mouse.y + Math.sin(P.aim) * off, A.T + 10, A.B - 4);
        lob(W, P.gx, P.gy - 10, tx, ty, p.flight, 1400, { dmg: 0, r: 7 * p.size, life: p.flight, kind: 'mortar', src: 'mortar', big: true, lobbed: true, buster: !!p.buster, explode: { r: p.rad, dmg: p.dmg } });
      }
      ws.recoil = 1; W.sfx('heavy', 0.7);
    }
  });

  /* 21 Cryo Sprayer */
  def({
    id: 'cryo', name: 'Cryo Sprayer', icon: 'cryo', tint: '#bfe9ff', tags: ['control', 'bullet'], unlock: 'r7',
    desc: 'Frost shards Chill the boss: each stack slows its movement AND attack timing by 4.5% (max 6 stacks). Stacks melt over time.',
    mod: { name: 'Deep Freeze', desc: '+1 max Chill stack and +15% damage.', max: 2 },
    evos: {
      a: { name: 'Shatter', desc: 'At max Chill the boss freezes solid for 1.2s with its core exposed (10s cooldown).' },
      b: { name: 'Frost Field', desc: 'Shards also freeze enemy bullets they touch, leaving them harmless.' }
    },
    calc(w, B) { const p = { rate: 3, dmg: 6 * Math.pow(1.15, w.mods), speed: 760, maxChill: 6 + w.mods, spread: 0.08 }; if (w.evo === 'a') p.shatter = true; if (w.evo === 'b') p.frost = true; fin(p, B); p.dps = p.dmg * p.rate * 0.9; return p; },
    show: p => ({ Damage: f1(p.dmg), 'Fire rate': f2(p.rate) + '/s', 'Max Chill': p.maxChill + ' (' + Math.round(p.maxChill * 4.5) + '% slow)' }),
    fire(W, P, ws, p) {
      shot(W, P, P.aim + rs(p.spread), p.speed, { dmg: p.dmg, r: 4.5 * p.size, life: 1.1, kind: 'cryo', src: 'cryo', eat: p.frost ? 1 : 0, eatN: p.frost ? 1 : undefined, freeze: p.frost, onHit: (W, s, t) => { if (t.kind === 'enemy') return; W.statusBoss('chill', 1, 0, { max: p.maxChill }); if (p.shatter && W.boss.st.chill.n >= p.maxChill && W.time > (ws.shatterT || 0)) { ws.shatterT = W.time + 10; W.boss.freeze(1.2); } } });
      W.sfx('shoot', 0.6);
    }
  });

  /* 22 Pulse Ring */
  def({
    id: 'pulse', name: 'Pulse Emitter', icon: 'pulse', tint: P.teal, tags: ['interceptor', 'close'], barrel: 0,
    desc: 'Every 2.5s emits a ring (220 radius) that hits the boss for 30 and erases up to 6 enemy bullets.',
    mod: { name: 'Amplifier', desc: '+60 radius and +4 bullets erased.', max: 2 },
    evos: {
      a: { name: 'Shockwave', desc: 'Huge ring (×1.7 radius) with double damage, every 3.5s.' },
      b: { name: 'Heartbeat', desc: 'Pulses twice in quick succession; each pulse grants 4 temporary shield (max 20).' }
    },
    calc(w, B) { const p = { interval: 2.5, rad: 220 + 60 * w.mods, dmg: 30, erase: 6 + 4 * w.mods }; if (w.evo === 'a') { p.rad *= 1.7; p.dmg *= 2; p.interval = 3.5; } if (w.evo === 'b') p.double = true; p.rate = 1 / p.interval; fin(p, B); p.interval = 1 / p.rate; p.dps = p.dmg * p.rate * (p.double ? 2 : 1) * 0.6; return p; },
    show: p => ({ Damage: f1(p.dmg) + (p.double ? ' ×2' : ''), Radius: Math.round(p.rad), Erases: p.erase, Interval: f2(p.interval) + 's' }),
    update(W, P, ws, p, dt) {
      ws.cd = (ws.cd == null ? 1 : ws.cd) - dt * P.rateBoost; if (ws.cd > 0) return; ws.cd = p.interval;
      const go = () => { W.addAlly(SO.makePulse(W, P, p)); if (p.double) P.addTempShield(4, 20); W.sfx('shield'); };
      go(); if (p.double) W.later(0.3, go);
    }
  });

  /* 23 Ricochet Disc */
  def({
    id: 'disc', name: 'Ricochet Disc', icon: 'disc', tint: P.cream, tags: ['big', 'pierce', 'bounce'], bw: 9,
    desc: 'Piercing discs that bounce off walls 4 times.',
    mod: { name: 'Rebound Rims', desc: '+2 bounces.', max: 2 },
    evos: {
      a: { name: 'Splitter Disc', desc: 'Discs split in two on each bounce (up to 2 generations), children deal 80%.' },
      b: { name: 'Razor Disc', desc: 'Each bounce adds +15% speed and +20% damage.' }
    },
    calc(w, B) { const p = { rate: 1.2, dmg: 14, speed: 640, bounces: 4 + 2 * w.mods, bounceable: true }; if (w.evo === 'a') p.split = true; if (w.evo === 'b') p.razor = true; fin(p, B); p.dps = p.dmg * p.rate * (p.split ? 2.4 : p.razor ? 1.9 : 1.4); return p; },
    show: p => ({ Damage: f1(p.dmg), Bounces: p.bounces + p.bounce, 'Fire rate': f2(p.rate) + '/s' }),
    fire(W, P, ws, p) { shot(W, P, P.aim, p.speed, { dmg: p.dmg, r: 9 * p.size, life: 4, pierce: 999, hitCd: 0.3, bounce: p.bounces + p.bounce, kind: 'disc', src: 'disc', big: true, metal: true, splitDisc: p.split, razor: p.razor }); W.sfx('shoot'); }
  });

  /* 24 Arc Whip */
  def({
    id: 'whip', name: 'Arc Whip', icon: 'whip', tint: P.warn, tags: ['close', 'melee'], unlock: 'r7', barrel: 10,
    desc: 'Cracks a 140° electric arc toward your cursor (170 range) for heavy damage. Get in close.',
    mod: { name: 'Longer Lash', desc: '+50 range and +10% damage.', max: 2 },
    evos: {
      a: { name: 'Chain Flail', desc: 'Each crack also destroys up to 10 enemy bullets inside the arc.' },
      b: { name: 'Thunder Lash', desc: 'Hits fork lightning into the nearest module or drone for 50% damage.' }
    },
    calc(w, B) { const p = { rate: 1.6, dmg: 28 * Math.pow(1.1, w.mods), range: 170 + 50 * w.mods, half: 1.22 }; fin(p, B); p.dps = p.dmg * p.rate; return p; },
    show: p => ({ Damage: f1(p.dmg), Range: Math.round(p.range), 'Fire rate': f2(p.rate) + '/s' }),
    fire(W, P, ws, p) {
      const a = P.aim;
      W.whips.push({ x: P.gx, y: P.gy, a, r: p.range, half: p.half, t: 0 });
      for (const t of W.targetsInCone(P.gx, P.gy, a, p.half, p.range)) {
        W.applyHit(t, p.dmg, 'whip', t.x, t.y, { proc: true });
        if (ws.w.evo === 'b' && t.kind === 'boss') { const t2 = W.findTarget(t.x, t.y, { range: 400, enemies: true, exclude: W.boss, modulesOnly: true }); if (t2) { W.applyHit(t2, p.dmg * 0.5, 'whip', t2.x, t2.y, {}); W.fxBolt([t.x, t.y, t2.x, t2.y], P.warn, 3); } }
      }
      if (ws.w.evo === 'a') { let n = 0; for (const s of W.eShotsInCone(P.gx, P.gy, a, p.half, p.range)) { if (n++ >= 10) break; if (!s.big) W.killEShot(s, 'cut'); } }
      W.sfx('zap', 1.4);
    }
  });

  /* 25 Jet Burner */
  def({
    id: 'jet', name: 'Jet Burner', icon: 'jet', tint: P.warn, tags: ['close', 'dot', 'mobility'], unlock: 'win', barrel: 0,
    desc: 'Weaponizes your jetpack: thrusting blasts a flame column below you (60 dmg/s) and spits a fireball at your cursor every 0.35s; dashing leaves burning trails.',
    mod: { name: 'Hotter Exhaust', desc: '+30% damage and +50 flame length.', max: 2 },
    evos: {
      a: { name: 'Afterburner Lance', desc: 'While thrusting you also spray a forward flame cone toward your cursor (30 dmg/s).' },
      b: { name: 'Comet Trail', desc: 'Dash trails detonate after 0.4s (50 radius, 35 damage each).' }
    },
    calc(w, B) { const p = { dps0: 60 * Math.pow(1.3, w.mods), range: 160 + 50 * w.mods, trail: 40 }; fin(p, B); p.trail *= (B.dmgMul || 1); p.dps = p.dps0 * 0.5; return p; },
    show: p => ({ 'Exhaust dmg/s': f1(p.dps0), 'Exhaust length': Math.round(p.range), 'Trail dmg/s': f1(p.trail) }),
    update(W, P, ws, p, dt) {
      ws.tick = (ws.tick || 0) + dt;
      if (P.thrusting) {
        ws.fb = (ws.fb || 0) + dt * P.rateBoost;
        if (ws.fb >= 0.35) { ws.fb = 0; shot(W, P, P.aim + rs(0.08), 620, { dmg: 10 * (p.dps0 / 60), r: 6 * p.size, life: 0.9, kind: 'napalm', src: 'jet', onHit: (W2, s, t) => { if (t.kind !== 'enemy' && Math.random() < 0.3) W2.statusBoss('burn', 1, 3); } }); }
        if (Math.random() < 0.8) W.fxFlame(P.x + rs(14), P.y + 16, rs(60), p.range * 2.6, false);
        if (ws.w.evo === 'a') { const g = gun(P, P.aim, 18); W.fxFlame(g.x, g.y, Math.cos(P.aim) * 480 + rs(80), Math.sin(P.aim) * 480 + rs(80), false); }
      }
      if (ws.tick >= 0.1) {
        ws.tick -= 0.1;
        if (P.thrusting) {
          for (const t of W.targetsInRect(P.x, P.y + 14 + p.range / 2, 22, p.range / 2)) { W.applyHit(t, p.dps0 * 0.1, 'jet', t.x, t.y, { noWord: true, lowCrit: true }); if (t.kind !== 'enemy' && Math.random() < 0.2) W.statusBoss('burn', 1, 3); }
          if (ws.w.evo === 'a') for (const t of W.targetsInCone(P.gx, P.gy, P.aim, 0.3, 180)) W.applyHit(t, 3, 'jet', t.x, t.y, { noWord: true, lowCrit: true });
        }
      }
      if (P.dashing) { ws.tr = (ws.tr || 0) + dt; if (ws.tr > 0.035) { ws.tr = 0; W.addAlly(SO.makeFirePatch(W, P.x, P.y, p.trail, ws.w.evo === 'b')); } }
    }
  });

  /* 26 Mine Layer */
  def({
    id: 'minelayer', name: 'Mine Layer', icon: 'minelayer', tint: P.teal, tags: ['explosive', 'deploy'], unlock: 'runs', barrel: 0,
    desc: 'Drops a proximity mine every 1.2s where you are (max 6). Mines slowly float upward and blow when the boss gets within 100px.',
    mod: { name: 'Bigger Magazine', desc: '+3 max mines and +15% damage.', max: 2 },
    evos: {
      a: { name: 'Seeker Mines', desc: 'Armed mines slowly drift toward the boss.' },
      b: { name: 'Barrier Mines', desc: 'Mines absorb enemy bullets that touch them (3 each) before popping. Build a minefield wall.' }
    },
    calc(w, B) { const p = { interval: 1.2, max: 6 + 3 * w.mods, dmg: 40 * Math.pow(1.15, w.mods), rad: 80 }; if (w.evo === 'a') p.seek = true; if (w.evo === 'b') p.absorb = 3; p.rate = 1 / p.interval; fin(p, B); p.interval = 1 / p.rate; p.dps = p.dmg * p.rate * 0.6; return p; },
    show: p => ({ 'Blast damage': f1(p.dmg), 'Max mines': p.max, 'Drop interval': f2(p.interval) + 's' }),
    fire(W, P, ws, p) {
      const mines = W.allies.filter(o => o.pmine && !o.dead); if (mines.length >= p.max) mines[0].boom = true;
      W.addAlly(SO.makePMine(W, P.x, P.y + 6, p));
    }
  });

  /* 27 Gatling */
  def({
    id: 'gatling', name: 'Gatling', icon: 'gatling', tint: P.warn, tags: ['bullet', 'metal'], bw: 11, barrel: 26,
    desc: 'Spins up from 4 to 18 shots/s over ~2s. Spread grows with spin. Dashing or getting hit halves the spin.',
    mod: { name: 'Spin Motor', desc: '50% faster spin-up and +20% max fire rate.', max: 2 },
    evos: {
      a: { name: 'Vulcan', desc: 'Max fire rate 28/s with smaller bullets (2.6 dmg). Pure volume.' },
      b: { name: 'Heavy Repeater', desc: 'Max fire rate 10/s, but 8 damage, pierce 1 and no spread growth.' }
    },
    calc(w, B) { const p = { min: 4, max: 18 * Math.pow(1.2, w.mods), dmg: 3.2, spin: 0.5 * Math.pow(1.5, w.mods), spread: 0.04, grow: 0.12, bounceable: true }; if (w.evo === 'a') { p.max = 28 * Math.pow(1.2, w.mods); p.dmg = 2.6; } if (w.evo === 'b') { p.max = 10 * Math.pow(1.2, w.mods); p.dmg = 8; p.pierce = 1; p.grow = 0; p.spread = 0.03; } p.rate = p.max; fin(p, B); const k = p.rate / p.max; p.max *= k; p.min *= k; p.dps = p.dmg * p.max * 0.85; return p; },
    show: p => ({ Damage: f1(p.dmg), 'Max fire rate': f1(p.max) + '/s', 'Spin-up': f1(1 / p.spin) + 's', Pierce: p.pierce || 0 }),
    update(W, P, ws, p, dt) {
      ws.s = Math.min(1, (ws.s || 0) + dt * p.spin);
      if (P.dashing || P.justHit) ws.s = Math.min(ws.s, 0.5);
      const rate = p.min + (p.max - p.min) * ws.s;
      ws.cd = (ws.cd || 0) - dt * rate * P.rateBoost;
      while (ws.cd <= 0) { ws.cd += 1; shot(W, P, P.aim + rs(p.spread + p.grow * ws.s), 1000, { dmg: p.dmg, r: (ws.w.evo === 'a' ? 2.6 : ws.w.evo === 'b' ? 4.5 : 3.2) * p.size, life: 1, pierce: p.pierce || 0, kind: 'pellet', src: 'gatling', metal: true, bounce: p.bounce }); ws.recoil = 0.5; W.sfx('shoot', 0.45); }
    }
  });

  /* 28 Plasma Orb */
  def({
    id: 'plasma', name: 'Plasma Orb', icon: 'plasma', tint: P.violet, tags: ['big', 'pierce'], unlock: 'win', bw: 12, barrel: 18,
    desc: 'Slow, huge orbs that pass through everything, scorching whatever they overlap (9 dmg every 0.15s).',
    mod: { name: 'Bigger Orb', desc: '+30% orb size and +15% damage.', max: 2 },
    evos: {
      a: { name: 'Nova Orb', desc: 'Orbs explode at the end of their path (120 radius, 60 damage).' },
      b: { name: 'Devourer', desc: 'Orbs eat enemy bullets they touch, growing +5% size and +1 damage each (max 20).' }
    },
    calc(w, B) { const p = { rate: 0.5, dmg: 9 * Math.pow(1.15, w.mods), osize: Math.pow(1.3, w.mods), speed: 260 }; if (w.evo === 'a') p.nova = 60; if (w.evo === 'b') p.devour = true; fin(p, B); if (p.nova) p.nova *= (B.dmgMul || 1); p.dps = p.dmg / 0.15 * p.rate * 0.9 + (p.nova || 0) * p.rate * 0.6; return p; },
    show: p => ({ 'Tick damage': f1(p.dmg), 'Orb size': pc(p.osize * p.size), 'Fire rate': f2(p.rate) + '/s', 'End blast': p.nova ? f1(p.nova) : '—' }),
    fire(W, P, ws, p) {
      shot(W, P, P.aim, p.speed, { dmg: p.dmg, r: 18 * p.osize * p.size, life: 3, pierce: 999, hitCd: 0.15, kind: 'orb', src: 'plasma', big: true, devour: p.devour, eat: p.devour ? 1 : 0, eatN: 20, explode: p.nova ? { r: 120, dmg: p.nova, onlyEnd: true } : null });
      W.sfx('heavy', 0.5);
    }
  });

  /* 29 Aegis Satellites */
  def({
    id: 'aegis', name: 'Aegis Satellites', icon: 'aegis', tint: P.blueLight, tags: ['interceptor', 'drone', 'defense'], unlock: 'runs', barrel: 0,
    desc: '2 satellites orbit close and intercept enemy bullets (3 charges each, +1 charge per 2s). They also zap the boss (4 dmg, 2/s).',
    mod: { name: 'Extra Satellite', desc: '+1 satellite.', max: 2 },
    evos: {
      a: { name: 'Bastion', desc: '6 charges per satellite, and each interception restores 1 shield (or 0.5 HP if you have none).' },
      b: { name: 'Counter-Battery', desc: 'Each interception fires a homing dart back at the boss (12 dmg).' }
    },
    calc(w, B) { const p = { count: 2 + w.mods, charges: 3, regen: 2, zap: 4 }; if (w.evo === 'a') p.charges = 6; if (w.evo === 'b') p.counter = 12; fin(p, B); p.zap *= (B.dmgMul || 1); if (p.counter) p.counter *= (B.dmgMul || 1); p.dps = p.zap * 2 * p.count + (p.counter ? p.counter * 0.5 * p.count : 0); return p; },
    show: p => ({ Satellites: p.count, 'Charges each': p.charges, 'Zap damage': f1(p.zap), 'Counter dart': p.counter ? f1(p.counter) : '—' }),
    update(W, P, ws, p, dt) {
      if (!ws.sat) ws.sat = [];
      while (ws.sat.length < p.count) ws.sat.push({ c: p.charges, rg: 0, zp: Math.random() * 0.5, conductor: true });
      ws.sat.length = p.count;
      ws.spin = (ws.spin || 0) + dt * 2.4;
      ws.sat.forEach((s, i) => {
        const a = -ws.spin + i / ws.sat.length * Math.PI * 2; s.x = P.x + Math.cos(a) * 50; s.y = P.y + Math.sin(a) * 50;
        if (s.c < p.charges) { s.rg += dt; if (s.rg >= p.regen) { s.rg = 0; s.c++; } }
        if (s.c > 0) {
          for (const e of W.eShotsInCircle(s.x, s.y, 26)) {
            if (e.big) continue; W.killEShot(e, 'block'); s.c--; s.flash = 0.15;
            if (ws.w.evo === 'a') P.restoreShield(1);
            if (p.counter) W.addShot({ x: s.x, y: s.y, vx: 0, vy: -300, dmg: p.counter, r: 3.5, life: 2, homing: 7, maxSpeed: 650, accel: 800, kind: 'seeker', src: 'aegis', seeking: true });
            if (s.c <= 0) break;
          }
        }
        s.zp -= dt * P.rateBoost; if (s.zp <= 0) { s.zp = 0.5; const t = W.findTarget(s.x, s.y, { range: 380 }); if (t) { W.applyHit(t, p.zap, 'aegis', t.x, t.y, { noWord: true }); W.fxBolt([s.x, s.y, t.x, t.y], P.tealLight, 1.2); } }
        if (s.flash) s.flash = Math.max(0, s.flash - dt);
      });
    },
    draw(ctx, W, P, ws, p) {
      if (!ws.sat) return;
      for (const s of ws.sat) {
        if (s.x == null) continue;
        ctx.save(); ctx.translate(s.x, s.y);
        SO.art.inkCirc(ctx, 0, 0, 6.5, s.flash ? P.white : s.c > 0 ? P.blueLight : P.inkSoft, 2);
        for (let k = 0; k < p.charges; k++) { const a = k / p.charges * Math.PI * 2 + W.time * 3; ctx.fillStyle = k < s.c ? P.teal : 'rgba(0,0,0,0.25)'; SO.art.circ(ctx, Math.cos(a) * 10, Math.sin(a) * 10, 1.8); ctx.fill(); }
        ctx.restore();
      }
    }
  });

  /* 30 Ink Blotter */
  def({
    id: 'ink', name: 'Ink Blotter', icon: 'ink', tint: P.blueLight, tags: ['control', 'big'], unlock: 'mods', bw: 10,
    desc: 'Arcing ink globs splash (50 radius) and Soak the boss: +12% damage taken from everything for 3s.',
    mod: { name: 'Thick Ink', desc: '+30% splash radius and +4% Soak bonus.', max: 2 },
    evos: {
      a: { name: 'Inkquake', desc: 'Soaked weapon modules take double damage from all sources.' },
      b: { name: 'Ink Rain', desc: 'Globs burst at the top of their arc into 4 droplets (60% damage, smaller splashes).' }
    },
    calc(w, B) { const p = { rate: 1.1, dmg: 18, rad: 55 * Math.pow(1.3, w.mods), soak: 0.12 + 0.04 * w.mods, speed: 720 }; if (w.evo === 'a') p.quake = true; if (w.evo === 'b') p.rain = true; fin(p, B); p.dps = p.dmg * p.rate * (p.rain ? 2 : 1) + 8; return p; },
    show: p => ({ 'Splash damage': f1(p.dmg), 'Splash radius': Math.round(p.rad), 'Soak bonus': '+' + pc(p.soak), 'Fire rate': f2(p.rate) + '/s' }),
    fire(W, P, ws, p) {
      const mk = (x, y, vx, vy, mult, rad) => W.addShot({ x, y, vx, vy, gravity: 480, dmg: 0, r: 7 * mult, life: 2, kind: 'glob', src: 'ink', big: mult > 0.7, explode: { r: rad, dmg: p.dmg * mult, ink: true, soak: p.soak, quake: p.quake } });
      const g = gun(P, P.aim); const vx = Math.cos(P.aim) * p.speed, vy = Math.sin(P.aim) * p.speed - 90;
      const s = mk(g.x, g.y, vx, vy, 1, p.rad);
      if (p.rain) { s.rainAt = Math.max(0.15, Math.min(0.45, -vy / 480)); s.onTimer = (W, s) => { for (let i = 0; i < 4; i++) mk(s.x, s.y, s.vx + (i - 1.5) * 110, s.vy - 40, 0.6, p.rad * 0.7); s.dead = true; s.quiet = true; }; }
      W.sfx('shoot', 0.8);
    }
  });

  /* ---------- weapon-owned allies (factories used above) ---------- */
  SO.makeWell = function (W, x, y, p, repulse) {
    return {
      x, y, t: 0, dur: p.dur, rad: p.rad, dps: p.dps0, captured: 0, repulse, boom: p.boom, tick: 0, conductor: true,
      update(dt) {
        this.t += dt; if (repulse) { this.x = W.player.x; this.y = W.player.y; }
        for (const s of W.eShotsInCircle(this.x, this.y, this.rad)) {
          if (s.unpullable) continue;
          const a = M.ang(this.x, this.y, s.x, s.y), d = M.dist(this.x, this.y, s.x, s.y);
          if (repulse) { s.vx = s.vx * (1 - dt * 2) + Math.cos(a) * 900 * dt; s.vy = s.vy * (1 - dt * 2) + Math.sin(a) * 900 * dt; }
          else { s.vx = s.vx * (1 - dt * 3) - Math.cos(a - 0.6) * 1400 * dt; s.vy = s.vy * (1 - dt * 3) - Math.sin(a - 0.6) * 1400 * dt; if (d < 22 && !s.big) { W.killEShot(s, 'crush'); this.captured++; } }
        }
        this.tick += dt; if (this.tick >= 0.25) { this.tick -= 0.25; for (const t of W.targetsInCircle(this.x, this.y, this.rad)) W.applyHit(t, this.dps * 0.25, 'gravity', t.x, t.y, { noWord: true, lowCrit: true }); }
        if (this.t >= this.dur) { this.dead = true; if (this.boom) W.explodeP(this.x, this.y, this.rad, this.boom + Math.min(30, this.captured) * 4, 'gravity', { big: true }); }
      },
      draw(ctx) {
        const k = Math.min(1, this.t * 4) * (this.t > this.dur - 0.3 ? (this.dur - this.t) / 0.3 : 1);
        ctx.save(); ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = SO.PAL.violet; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); const rr = this.rad * (((W.time * (repulse ? 0.8 : -0.8) + i / 3) % 1 + 1) % 1); ctx.arc(this.x, this.y, rr, 0, 7); ctx.stroke(); }
        ctx.globalAlpha = 0.18 * k; ctx.fillStyle = SO.PAL.violet; SO.art.circ(ctx, this.x, this.y, this.rad); ctx.fill();
        ctx.globalAlpha = k; SO.art.inkCirc(ctx, this.x, this.y, 9 + Math.sin(W.time * 12) * 2, repulse ? SO.PAL.tealLight : SO.PAL.ink, 2);
        ctx.restore();
      }
    };
  };
  SO.makePulse = function (W, P, p) {
    return {
      x: P.x, y: P.y, t: 0, dur: 0.35, rad: p.rad * (p.size || 1), dmg: p.dmg, erase: p.erase, done: false, hitBoss: false,
      update(dt) {
        this.t += dt; this.x = W.player.x; this.y = W.player.y;
        const r = this.rad * M.easeOut(Math.min(1, this.t / this.dur));
        if (!this.hitBoss) for (const t of W.targetsInCircle(this.x, this.y, r)) { if (t.kind === 'boss') this.hitBoss = true; W.applyHit(t, this.dmg, 'pulse', t.x, t.y, { proc: true }); if (t.kind === 'boss') break; }
        for (const s of W.eShotsInCircle(this.x, this.y, r)) { if (this.erase <= 0) break; if (s.big) continue; W.killEShot(s, 'erase'); this.erase--; }
        if (this.t >= this.dur + 0.15) this.dead = true;
      },
      draw(ctx) { const k = Math.min(1, this.t / this.dur); ctx.save(); ctx.globalAlpha = 1 - Math.max(0, (this.t - this.dur) / 0.15) * 0.9; ctx.strokeStyle = SO.PAL.teal; ctx.lineWidth = 6 * (1 - k) + 2; SO.art.circ(ctx, this.x, this.y, this.rad * M.easeOut(k)); ctx.stroke(); ctx.restore(); }
    };
  };
  SO.makeFirePatch = function (W, x, y, dps, comet) {
    return {
      x, y, t: 0, dur: comet ? 0.4 : 1.2, tick: 0,
      update(dt) {
        this.t += dt; this.tick += dt;
        if (this.tick >= 0.2) { this.tick = 0; for (const t of W.targetsInCircle(this.x, this.y, 26)) W.applyHit(t, dps * 0.2, 'jet', t.x, t.y, { noWord: true, lowCrit: true }); }
        if (this.t >= this.dur) { this.dead = true; if (comet) W.explodeP(this.x, this.y, 50, 35 * (W.build.s.dmgMul || 1), 'jet', { small: true }); }
      },
      draw(ctx) { const k = 1 - this.t / this.dur; ctx.save(); ctx.globalAlpha = 0.85 * k; SO.art.inkCirc(ctx, this.x, this.y, 10 + 6 * k, comet ? SO.PAL.warn : SO.PAL.coral, 2); ctx.restore(); }
    };
  };
  SO.makePMine = function (W, x, y, p) {
    return {
      x, y, t: 0, arm: 0.5, life: 15, pmine: true, conductor: true, absorb: p.absorb || 0, boom: false, vy: 40,
      update(dt) {
        this.t += dt; this.vy = this.t < this.arm ? this.vy * (1 - dt * 3) : -45; this.y = Math.max(SO.ARENA.T + 20, this.y + this.vy * dt);
        if (p.seek && this.t > this.arm) { const b = W.boss; if (b && b.alive) { const a = M.ang(this.x, this.y, b.x, b.y); this.x += Math.cos(a) * 60 * dt; this.y += Math.sin(a) * 60 * dt; } }
        if (this.absorb > 0) for (const s of W.eShotsInCircle(this.x, this.y, 14)) { if (s.big) continue; W.killEShot(s, 'block'); this.absorb--; if (this.absorb <= 0) { this.boom = true; break; } }
        if (this.t > this.arm && W.targetsInCircle(this.x, this.y, 100).some(t => t.kind !== 'enemy' || t.ref.hp > 0)) this.boom = true;
        if (this.boom || this.t > this.life) { this.dead = true; W.explodeP(this.x, this.y, p.rad, p.dmg, 'minelayer', {}); }
      },
      draw(ctx) {
        const armed = this.t > this.arm; ctx.save(); ctx.translate(this.x, this.y);
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + this.t; ctx.strokeStyle = SO.PAL.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.stroke(); }
        SO.art.inkCirc(ctx, 0, 0, 8, p.absorb ? SO.PAL.blueLight : SO.PAL.teal, 2);
        ctx.fillStyle = armed && (W.time * 4 % 1) < 0.5 ? SO.PAL.white : SO.PAL.tealDark; SO.art.circ(ctx, 0, 0, 2.5); ctx.fill();
        ctx.restore();
      }
    };
  };
})();
