/* Square Off 2 — boss attacks (20 families + chassis extras), boss upgrades (80+), attack director */
'use strict';
(function () {
  const P = SO.PAL, M = SO.M, A = SO.ARENA;
  const pc = n => Math.round(n * 100) + '%';

  /* ---------- attack run: tiny timeline scheduler ---------- */
  class AttackRun {
    constructor(def, id, p) { this.def = def; this.id = id; this.p = p; this.t = 0; this.ev = []; this.endAt = 99; this.done = false; this.spawned = []; this.onUpdate = null; this.hold = false; }
    at(t, fn) { this.ev.push({ t, fn }); this.ev.sort((a, b) => a.t - b.t); }
    end(t) { this.endAt = t; }
    track(o) { if (o) this.spawned.push(o); return o; }
    update(dt) {
      if (this.done) return;
      this.t += dt;
      while (this.ev.length && this.ev[0].t <= this.t) { const e = this.ev.shift(); try { e.fn(); } catch (err) { console.error(err); } }
      if (this.onUpdate) this.onUpdate(dt, this.t);
      if (this.t >= this.endAt && !this.ev.length) this.done = true;
    }
    cancel() { this.done = true; this.cancelled = true; this.ev = []; for (const o of this.spawned) if (o.cancelable !== false && o.phase === 'warn') o.dead = true; if (this.onCancel) this.onCancel(); }
  }
  SO.AttackRun = AttackRun;

  const aimP = (W, x, y) => { const t = W.targetPos(); return Math.atan2(t.y - y, t.x - x); };
  const ATK = SO.BOSS_ATTACKS = {};
  const ATK_ORDER = SO.BOSS_ATTACK_ORDER = [];
  function atk(d) { d.mods = d.mods || []; d.cost = d.cost || 0.6; d.cd = d.cd || 5; d.threat = d.threat || 2; d.punishes = d.punishes || []; d.counters = d.counters || []; ATK[d.id] = d; ATK_ORDER.push(d.id); }

  /* 1 Spread Cannon */
  atk({
    id: 'spread', name: 'Spread Cannon', slot: 'front', cost: 0.5, cd: 2.6, threat: 2, tags: ['bullets'], punishes: ['close'], counters: ['interceptor', 'mobility'],
    desc: 'Three aimed fans of bullets with a muzzle-glow warning.',
    module: null,
    mods: [{ id: 'barrels', name: 'Extra Barrels', desc: '+2 bullets per fan.', max: 2, threat: 2 }, { id: 'split', name: 'Splitter Shells', desc: 'The center bullet of each fan bursts into 6 fragments after 0.75s.', max: 1, threat: 2 }],
    params: m => ({ n: 5 + 2 * (m.barrels || 0), volleys: 3, speed: 300, split: !!m.split }),
    show: p => ({ 'Bullets per fan': p.n, Volleys: p.volleys, 'Splitter shells': p.split ? 'Yes' : 'No' }),
    start(R, W, b, p) {
      b.windup('spread', 0.42);
      for (let v = 0; v < p.volleys; v++) R.at(0.42 + v * 0.32, () => {
        const o = b.muzzle('spread'); const a0 = aimP(W, o.x, o.y); const step = Math.min(0.13, 1.3 / Math.max(1, p.n - 1));
        for (let i = 0; i < p.n; i++) {
          const s = W.eBullet(o.x, o.y, a0 + (i - (p.n - 1) / 2) * step, p.speed, { src: 'spread', metal: true });
          if (s && p.split && i === (p.n - 1) >> 1) { s.big = true; s.r = 10; s.timer = 0.75; s.onTimer = s2 => { for (let k = 0; k < 6; k++) W.eBullet(s2.x, s2.y, k / 6 * Math.PI * 2 + 0.3, 190, { src: 'spread', r: 5, kind: 'frag' }); s2.dead = true; }; }
        }
        b.recoil('spread'); W.sfx('eshot');
      });
      R.end(0.42 + p.volleys * 0.32);
    }
  });

  /* 2 Missile Pods */
  atk({
    id: 'missiles', name: 'Missile Pods', slot: 'shoulder', cost: 0.6, cd: 5.5, threat: 3, tags: ['homing'], punishes: ['stationary'], counters: ['interceptor', 'explosive', 'homing', 'chain'],
    desc: 'Launches homing missiles that turn slowly. They can be shot down (6 HP).',
    module: { name: 'Missile Pod' },
    mods: [{ id: 'salvo', name: 'Bigger Salvo', desc: '+2 missiles per launch.', max: 2, threat: 2 }, { id: 'cluster', name: 'Cluster Warheads', desc: 'Missiles that run out of fuel burst into 6 fragments. Shooting them down first prevents it.', max: 1, threat: 2 }],
    params: m => ({ n: 2 + 2 * (m.salvo || 0), cluster: !!m.cluster, turn: 2.2, speed: 300 }),
    show: p => ({ Missiles: p.n, 'Turn rate': p.turn + ' rad/s', 'Cluster burst': p.cluster ? '6 fragments' : 'No' }),
    start(R, W, b, p) {
      b.windup('missiles', 0.55);
      for (let i = 0; i < p.n; i++) R.at(0.55 + i * 0.11, () => {
        const o = b.muzzle('missiles'); const a = -Math.PI / 2 + (i % 2 ? 0.55 : -0.55) + M.rand(-0.2, 0.2);
        const s = W.eBullet(o.x, o.y, a, 170, { src: 'missiles', kind: 'missile', r: 7, dmg: 14, life: 5, hp: 6, metal: true, homing: p.turn, homeT: 3.4, accel: 220, maxSpeed: p.speed });
        if (s && p.cluster) s.onExpire = s2 => { for (let k = 0; k < 6; k++) W.eBullet(s2.x, s2.y, k / 6 * Math.PI * 2, 170, { src: 'missiles', r: 5, kind: 'frag' }); };
        W.sfx('eshot');
      });
      R.end(0.55 + p.n * 0.11 + 0.2);
    }
  });

  /* 3 Sweep Laser */
  atk({
    id: 'sweep', name: 'Sweep Laser', slot: 'top', cost: 1.2, cd: 8, threat: 3, big: true, recovery: 1.3, zone: true, tags: ['laser'], punishes: ['far', 'stationary'], counters: ['mobility'],
    desc: 'Paints a warning arc, then sweeps a beam across it. Dash through it or leave the arc. Vents afterwards (core exposed).',
    module: { name: 'Laser Dish' },
    mods: [{ id: 'twin', name: 'Twin Sweep', desc: 'A mirrored second beam sweeps at the same time.', max: 1, threat: 3 }, { id: 'wide', name: 'Wide Arc', desc: 'Sweep covers 110° (was 70°) but takes 2.0s (was 1.4s).', max: 1, threat: 2 }],
    params: m => ({ arc: m.wide ? 1.92 : 1.22, dur: m.wide ? 2.0 : 1.4, twin: !!m.twin, warn: 0.95 }),
    show: p => ({ 'Sweep arc': Math.round(p.arc * 57.3) + '°', 'Sweep time': p.dur + 's', Beams: p.twin ? 2 : 1 }),
    start(R, W, b, p) {
      R.hold = true; b.windup('sweep', p.warn);
      const o = b.muzzle('sweep'); const a = aimP(W, o.x, o.y); const dir = Math.random() < 0.5 ? 1 : -1;
      const a0 = a - dir * p.arc / 2, a1 = a + dir * p.arc / 2;
      R.track(W.eSweep({ follow: () => b.muzzle('sweep'), a0, a1, warn: p.warn, dur: p.dur, width: 18, src: 'sweep' }));
      if (p.twin) R.track(W.eSweep({ follow: () => b.muzzle('sweep'), a0: Math.PI - a0, a1: Math.PI - a1, warn: p.warn, dur: p.dur, width: 18, src: 'sweep' }));
      W.sfx('charge');
      R.at(p.warn, () => W.sfx('laser'));
      R.end(p.warn + p.dur + 0.1);
    }
  });

  /* 4 Grid Lasers */
  atk({
    id: 'grid', name: 'Grid Lasers', slot: 'top', cost: 1.0, cd: 9, threat: 3, zone: true, tags: ['laser'], punishes: ['stationary'], counters: ['mobility'],
    desc: 'Striped warning columns, then 5 vertical lasers fire for 0.45s. Wide gaps between them.',
    module: null,
    mods: [{ id: 'cross', name: 'Crosshatch', desc: 'A follow-up wave of 3 horizontal lasers.', max: 1, threat: 2 }, { id: 'shift', name: 'Shifting Grid', desc: 'A second vertical wave fires in the gaps of the first.', max: 1, threat: 2 }],
    params: m => ({ lines: 5, cross: !!m.cross, shift: !!m.shift, warn: 1.0, fire: 0.45 }),
    show: p => ({ 'Vertical lines': p.lines, Waves: 1 + (p.cross ? 1 : 0) + (p.shift ? 1 : 0), 'Warning time': p.warn + 's' }),
    start(R, W, b, p) {
      b.windup('grid', 0.5);
      const sp = (A.R - A.L) / p.lines, off = M.rand(0.2, 0.8) * sp;
      const wave = (xs, horiz) => () => { for (const v of xs) R.track(horiz ? W.eLaser({ x1: A.L, y1: v, x2: A.R, y2: v, width: 24, warn: p.warn, fire: p.fire, src: 'grid' }) : W.eLaser({ x1: v, y1: A.T, x2: v, y2: A.B, width: 24, warn: p.warn, fire: p.fire, src: 'grid' })); W.sfx('warn'); };
      const xs = []; for (let i = 0; i < p.lines; i++) xs.push(A.L + off + i * sp);
      R.at(0, wave(xs, false)); let t = p.warn + p.fire + 0.15;
      if (p.shift) { R.at(t, wave(xs.map(x => x + (x + sp / 2 < A.R ? sp / 2 : -sp / 2)), false)); t += p.warn + p.fire + 0.15; }
      if (p.cross) { const hs = (A.B - A.T) / 3, ho = M.rand(0.25, 0.75) * hs; R.at(t, wave([0, 1, 2].map(i => A.T + ho + i * hs), true)); t += p.warn + p.fire + 0.15; }
      R.end(t);
    }
  });

  /* 5 Mine Layer */
  atk({
    id: 'mines', name: 'Mine Dispenser', slot: 'bottom', cost: 0.5, cd: 6, threat: 2, tags: ['area'], punishes: ['grounded', 'close'], counters: ['interceptor', 'explosive', 'chain'],
    desc: 'Tosses mines that arm after 1s and detonate if you come within 85px (0.45s fuse). Shoot them (10 HP) to pop them safely.',
    module: { name: 'Mine Hopper' },
    mods: [{ id: 'more', name: 'Deep Hopper', desc: '+2 mines per toss and +2 max on field.', max: 2, threat: 1 }, { id: 'magnet', name: 'Magnetic Mines', desc: 'Armed mines creep toward you at 38 px/s.', max: 1, threat: 2 }],
    params: m => ({ n: 3 + 2 * (m.more || 0), max: 6 + 2 * (m.more || 0), magnet: !!m.magnet }),
    show: p => ({ 'Mines per toss': p.n, 'Max on field': p.max, Magnetic: p.magnet ? 'Yes' : 'No' }),
    start(R, W, b, p) {
      b.windup('mines', 0.3);
      R.at(0.3, () => {
        const alive = W.enemies.filter(e => e.emine && !e.dead).length; const n = Math.min(p.n, p.max - alive);
        const pts = []; const tp = W.targetPos();
        for (let i = 0; i < n; i++) {
          let x, y, tries = 0;
          do { x = M.rand(A.L + 50, A.R - 50); y = M.rand(A.T + 140, A.B - 30); tries++; } while (tries < 30 && (M.dist(x, y, tp.x, tp.y) < 130 || pts.some(q => M.dist(q.x, q.y, x, y) < 110)));
          pts.push({ x, y }); const o = b.muzzle('mines'); W.eAdd(SO.makeEMine(W, o.x, o.y, x, y, p.magnet));
        }
        W.sfx('eshot');
      });
      R.end(0.6);
    }
  });

  /* 6 Blade Orbit */
  atk({
    id: 'orbit', name: 'Blade Orbit', slot: 'ring', cost: 0.8, cd: 7, threat: 2, tags: ['area'], punishes: ['close'], counters: ['mobility', 'precision'],
    desc: 'Blades orbit the boss, expand out to the dashed ring, then contract. Slip between them.',
    module: null,
    mods: [{ id: 'more', name: 'Extra Blades', desc: '+2 orbiting blades.', max: 2, threat: 2 }, { id: 'fling', name: 'Flung Blades', desc: 'Instead of contracting, blades fly outward in all directions.', max: 1, threat: 2 }],
    params: m => ({ n: 4 + 2 * (m.more || 0), fling: !!m.fling, rMax: 250 }),
    show: p => ({ Blades: p.n, 'Max radius': p.rMax, Ending: p.fling ? 'Flung outward' : 'Contract' }),
    start(R, W, b, p) { R.track(W.eAdd(SO.makeOrbit(W, b, p))); R.end(4.2); }
  });

  /* 7 Delayed Charges */
  atk({
    id: 'bombs', name: 'Delayed Charges', slot: 'eye', cost: 0.8, cd: 7, threat: 3, tags: ['area'], punishes: ['stationary'], counters: ['mobility'],
    desc: 'Marks 4 spots around you (one right on you). Each explodes after a 1.4s countdown ring.',
    module: { name: 'Target Scope' },
    mods: [{ id: 'echo', name: 'Echo Detonation', desc: 'Each spot explodes again 0.8s later.', max: 1, threat: 2 }, { id: 'shrap', name: 'Shrapnel Marks', desc: 'Every explosion releases 6 slow fragments.', max: 1, threat: 2 }],
    params: m => ({ n: 4, echo: !!m.echo, shrap: !!m.shrap, r: 72, delay: 1.4 }),
    show: p => ({ Spots: p.n, 'Blast radius': p.r, Countdown: p.delay + 's', 'Second blast': p.echo ? 'Yes' : 'No' }),
    start(R, W, b, p) {
      b.windup('bombs', 0.3);
      const tp = W.targetPos(); const pts = [{ x: tp.x, y: tp.y }];
      let tries = 0;
      while (pts.length < p.n && tries++ < 80) { const a = Math.random() * Math.PI * 2, d = M.rand(150, 300); const x = M.clamp(tp.x + Math.cos(a) * d, A.L + 30, A.R - 30), y = M.clamp(tp.y + Math.sin(a) * d, A.T + 30, A.B - 20); if (pts.every(q => M.dist(q.x, q.y, x, y) > 145)) pts.push({ x, y }); }
      pts.forEach((q, i) => R.at(0.1 + i * 0.15, () => {
        R.track(W.eBlast(q.x, q.y, p.r, p.delay, 16, 'bombs', { shrap: p.shrap }));
        if (p.echo) R.at(0.1 + i * 0.15 + p.delay + 0.02, () => R.track(W.eBlast(q.x, q.y, p.r, 0.8, 16, 'bombs', { shrap: p.shrap })));
      }));
      R.end(0.1 + p.n * 0.15 + p.delay + (p.echo ? 0.9 : 0));
    }
  });

  /* 8 Returning Shots */
  atk({
    id: 'boomer', name: 'Returning Shots', slot: 'fins', cost: 0.6, cd: 5.5, threat: 2, tags: ['bullets'], punishes: ['close'], counters: ['interceptor'],
    desc: 'Shots burst outward, stop, blink, then fly back to the boss along the shown lines.',
    module: null,
    mods: [{ id: 'more', name: 'Wider Burst', desc: '+4 returning shots.', max: 2, threat: 1 }, { id: 'over', name: 'Overshoot', desc: 'Returning shots pass through the boss and keep going.', max: 1, threat: 2 }],
    params: m => ({ n: 6 + 4 * (m.more || 0), over: !!m.over, speed: 330 }),
    show: p => ({ Shots: p.n, Overshoot: p.over ? 'Yes' : 'No' }),
    start(R, W, b, p) {
      b.windup('boomer', 0.35);
      R.at(0.35, () => { const a0 = aimP(W, b.x, b.y) + Math.PI / p.n; for (let i = 0; i < p.n; i++) W.eBullet(b.x, b.y, a0 + i / p.n * Math.PI * 2, p.speed, { src: 'boomer', kind: 'boomer', r: 8, life: 6, ret: { phase: 0, t: 0, over: p.over }, owner: b }); W.sfx('eshot'); });
      R.end(1.2);
    }
  });

  /* 9 Moving Barrier */
  atk({
    id: 'barrier', name: 'Moving Barrier', slot: 'side', cost: 1.0, cd: 11, threat: 3, zone: true, tags: ['wall'], punishes: ['grounded'], counters: ['mobility'],
    desc: 'A wall crosses the whole arena. Fly through its marked gap (170px tall).',
    module: { name: 'Barrier Pylon' },
    mods: [{ id: 'double', name: 'Double Barrier', desc: 'A second wall crosses from the other side with its own gap.', max: 1, threat: 3 }, { id: 'shift', name: 'Shifting Gap', desc: 'The gap slides up and down (arrows show which way).', max: 1, threat: 2 }],
    params: m => ({ double: !!m.double, shift: !!m.shift, gap: 170, speed: 210 }),
    show: p => ({ Walls: p.double ? 2 : 1, 'Gap height': p.gap, 'Wall speed': p.speed, 'Gap moves': p.shift ? 'Yes' : 'No' }),
    start(R, W, b, p) {
      b.windup('barrier', 0.4);
      const tp = W.targetPos(); const fromLeft = tp.x > (A.L + A.R) / 2;
      R.track(W.eAdd(SO.makeBarrier(W, fromLeft, p)));
      if (p.double) R.track(W.eAdd(SO.makeBarrier(W, !fromLeft, p, true)));
      R.end(1.2 + (A.R - A.L) / p.speed);
    }
  });

  /* 10 Drone Hangar */
  atk({
    id: 'drones', name: 'Drone Hangar', slot: 'back', cost: 0.6, cd: 9, threat: 3, tags: ['minions'], punishes: ['precision'], counters: ['homing', 'chain', 'close', 'explosive'],
    desc: 'Launches gun drones (40 HP) that hover and fire aimed shots with a flash warning. Up to 4 at once, 14s each.',
    module: { name: 'Hangar Bay' },
    mods: [{ id: 'more', name: 'Bigger Hangar', desc: '+1 drone per launch and +1 max.', max: 2, threat: 2 }, { id: 'kami', name: 'Kamikaze Protocol', desc: 'Drones that run low or time out flash, show a dive line, then dive at you and explode.', max: 1, threat: 2 }],
    params: m => ({ n: 2 + (m.more || 0), max: 4 + (m.more || 0), kami: !!m.kami }),
    show: p => ({ 'Drones per launch': p.n, 'Max drones': p.max, Kamikaze: p.kami ? 'Yes' : 'No' }),
    start(R, W, b, p) {
      b.windup('drones', 0.45);
      R.at(0.45, () => { const alive = W.enemies.filter(e => e.edrone && !e.dead).length; for (let i = 0; i < Math.min(p.n, p.max - alive); i++) { const o = b.muzzle('drones'); W.eAdd(SO.makeEDrone(W, o.x, o.y, p, i)); } });
      R.end(0.8);
    }
  });

  /* 11 Ram Charge */
  atk({
    id: 'charge', name: 'Ram Charge', slot: 'ram', cost: 1.4, cd: 10, threat: 3, big: true, solo: true, recovery: 0.2, tags: ['contact'], punishes: ['close', 'melee'], counters: ['mobility'],
    desc: 'Hazard-striped boss locks a lane, then charges along it. Contact during the charge HURTS (22). Crashes into the wall and is stunned.',
    module: null,
    mods: [{ id: 'double', name: 'Rebound', desc: 'After the first impact, it re-aims (0.6s warning) and charges again.', max: 1, threat: 3 }, { id: 'wave', name: 'Crash Wave', desc: 'Each wall impact sprays a ring of 12 bullets.', max: 1, threat: 2 }],
    params: m => ({ double: !!m.double, wave: !!m.wave, speed: 820 }),
    show: p => ({ Charges: p.double ? 2 : 1, 'Charge speed': p.speed, 'Impact ring': p.wave ? '12 bullets' : 'No' }),
    start(R, W, b, p) {
      R.hold = true;
      const run = (t0, warn, last) => {
        let lane = null;
        R.at(t0, () => { b.charging = 'warn'; lane = R.track(W.eLane(b, warn, b.chassisDef.ground)); W.sfx('charge'); });
        R.at(t0 + warn, () => { b.charging = 'go'; b.dashTo(lane.a, p.speed, () => { b.charging = null; W.shake(10); W.sfx('boom'); W.word('KRASH!', b.x, b.y - b.size, 'boss'); if (p.wave) for (let k = 0; k < 12; k++) W.eBullet(b.x, b.y, k / 12 * Math.PI * 2, 210, { src: 'charge' }); if (last) b.stun(1.4); else run(R.t + 0.2, 0.6, true); }); });
      };
      run(0, 1.0, !p.double);
      R.end(0.5); R.endAt = 99; R.onUpdate = () => { if (!b.charging && b.stagger > 0 && R.t > 1.2) R.done = true; };
      R.onCancel = () => { b.charging = null; b.dashing = null; };
    }
  });

  /* 12 Ring Burst */
  atk({
    id: 'ring', name: 'Ring Burst', slot: 'crown', cost: 0.6, cd: 4.6, threat: 2, tags: ['bullets'], punishes: ['close'], counters: ['mobility', 'interceptor'],
    desc: 'Rings of 16 bullets with two marked gaps. Weave through or dash across.',
    module: null,
    mods: [{ id: 'more', name: 'Extra Ring', desc: '+1 ring per burst.', max: 2, threat: 1 }, { id: 'dense', name: 'Dense Rings', desc: '24 bullets per ring with 3-bullet gaps.', max: 1, threat: 2 }],
    params: m => ({ rings: 2 + (m.more || 0), n: m.dense ? 24 : 16, gap: m.dense ? 3 : 2, speed: 210 }),
    show: p => ({ Rings: p.rings, 'Bullets per ring': p.n, 'Gap width': p.gap + ' bullets' }),
    start(R, W, b, p) {
      b.windup('ring', 0.38);
      for (let r = 0; r < p.rings; r++) R.at(0.38 + r * 0.55, () => {
        const rot = Math.random() * Math.PI * 2; const g0 = Math.floor(Math.random() * p.n), g1 = (g0 + Math.floor(p.n / 2)) % p.n;
        for (let i = 0; i < p.n; i++) { const inGap = ((i - g0 + p.n) % p.n) < p.gap || ((i - g1 + p.n) % p.n) < p.gap; if (inGap) continue; W.eBullet(b.x, b.y, rot + i / p.n * Math.PI * 2, p.speed, { src: 'ring' }); }
        W.sfx('eshot');
      });
      R.end(0.38 + p.rings * 0.55);
    }
  });

  /* 13 Mortar Rain */
  atk({
    id: 'mortar', name: 'Mortar Rain', slot: 'back', cost: 0.9, cd: 8, threat: 3, tags: ['area'], punishes: ['grounded'], counters: ['mobility'],
    desc: 'Shells arc up; floor markers count down 1.3s before each lands (58 radius). Fly above the floor to stay clear.',
    module: { name: 'Mortar Tube' },
    mods: [{ id: 'more', name: 'Heavy Barrage', desc: '+3 shells per barrage.', max: 1, threat: 2 }, { id: 'fire', name: 'Fire Pools', desc: 'Shells leave burning ground (2.5s) where they land.', max: 1, threat: 2 }],
    params: m => ({ n: 5 + 3 * (m.more || 0), fire: !!m.fire, r: 58, delay: 1.3 }),
    show: p => ({ Shells: p.n, 'Blast radius': p.r, 'Fire pools': p.fire ? 'Yes' : 'No' }),
    start(R, W, b, p) {
      b.windup('mortar', 0.3);
      R.at(0.3, () => {
        const tp = W.targetPos(); const xs = [M.clamp(tp.x, A.L + 40, A.R - 40)]; let tries = 0;
        while (xs.length < p.n && tries++ < 100) { const x = M.rand(A.L + 40, A.R - 40); if (xs.every(q => Math.abs(q - x) > 110)) xs.push(x); }
        xs.forEach((x, i) => R.track(W.eMortar(b.muzzle('mortar'), x, p.delay + i * 0.08, p.r, p.fire)));
        W.sfx('heavy', 0.5);
      });
      R.end(0.3 + p.delay + p.n * 0.08);
    }
  });

  /* 14 Shockwave Stomp */
  atk({
    id: 'stomp', name: 'Shockwave Stomp', slot: 'legs', cost: 0.9, cd: 8, threat: 2, big: true, recovery: 1.0, tags: ['ground'], punishes: ['grounded'], counters: ['mobility'],
    desc: 'Drops to the floor and slams, sending shockwaves along the ground both ways. Be airborne. Vents afterwards.',
    module: null,
    mods: [{ id: 'double', name: 'Double Stomp', desc: 'Slams twice.', max: 1, threat: 2 }, { id: 'tall', name: 'Tall Waves', desc: 'Shockwaves are 64px tall (was 36).', max: 1, threat: 2 }],
    params: m => ({ double: !!m.double, h: m.tall ? 64 : 36, speed: 360 }),
    show: p => ({ Slams: p.double ? 2 : 1, 'Wave height': p.h, 'Wave speed': p.speed }),
    start(R, W, b, p) {
      R.hold = true;
      const slam = (t0) => {
        R.at(t0, () => { b.stompPhase = 'rise'; R.track(W.eWarn({ type: 'floor', x: b.x, h: p.h, dur: 0.9 })); W.sfx('charge'); });
        R.at(t0 + 0.9, () => { b.stompPhase = 'drop'; });
        R.at(t0 + 1.08, () => { b.stompPhase = 'impact'; W.shake(9); W.sfx('boom'); W.word('STOMP!', b.x, A.B - 90, 'boss'); for (const d of [-1, 1]) W.eAdd(SO.makeShock(W, b.x + d * b.size * 0.5, d, p)); });
      };
      slam(0); let t = 1.4; if (p.double) { slam(t); t += 1.4; }
      R.at(t, () => { b.stompPhase = 'recover'; });
      R.end(t + 0.3); R.onCancel = () => { b.stompPhase = null; };
      R.onEnd = () => { b.stompPhase = null; };
    }
  });

  /* 15 Flak Burst */
  atk({
    id: 'flak', name: 'Flak Burst', slot: 'shoulder', cost: 0.6, cd: 5.5, threat: 2, tags: ['bullets'], punishes: ['stationary'], counters: ['interceptor', 'mobility'],
    desc: 'Slow shells with a pulsing burst ring; after 0.9s each bursts into 8 fragments.',
    module: { name: 'Flak Battery' },
    mods: [{ id: 'more', name: 'Extra Shells', desc: '+2 shells per volley.', max: 1, threat: 2 }, { id: 'delayed', name: 'Delayed Fragments', desc: 'Fragments hang still for 0.4s, then accelerate to 300 px/s.', max: 1, threat: 2 }],
    params: m => ({ n: 3 + 2 * (m.more || 0), delayed: !!m.delayed, frags: 8 }),
    show: p => ({ Shells: p.n, 'Fragments each': p.frags, 'Delayed fragments': p.delayed ? 'Yes' : 'No' }),
    start(R, W, b, p) {
      b.windup('flak', 0.32);
      for (let i = 0; i < p.n; i++) R.at(0.32 + i * 0.13, () => {
        const o = b.muzzle('flak'); const a = aimP(W, o.x, o.y) + (i - (p.n - 1) / 2) * 0.28;
        const s = W.eBullet(o.x, o.y, a, 250, { src: 'flak', kind: 'shell', r: 10, big: true, timer: 0.9, burstR: 70, metal: true });
        if (s) s.onTimer = s2 => { for (let k = 0; k < p.frags; k++) { const fa = k / p.frags * Math.PI * 2 + 0.2; const f = W.eBullet(s2.x, s2.y, fa, p.delayed ? 0 : 230, { src: 'flak', r: 5, kind: 'frag', metal: true }); if (f && p.delayed) { f.hang = 0.4; f.hangA = fa; } } s2.dead = true; W.sfx('smallboom', 0.6); };
        W.sfx('eshot');
      });
      R.end(0.32 + p.n * 0.13 + 0.3);
    }
  });

  /* 16 Spiral Spinner */
  atk({
    id: 'spiral', name: 'Spiral Spinner', slot: 'crown', cost: 0.8, cd: 7.5, threat: 2, tags: ['bullets'], punishes: ['close'], counters: ['mobility', 'interceptor'],
    desc: 'Twin streams spiral out of the boss for 2.4s. Circle with the gaps.',
    module: { name: 'Spinner Nozzle' },
    mods: [{ id: 'more', name: 'Extra Arm', desc: '+1 spiral arm.', max: 1, threat: 2 }, { id: 'rev', name: 'Reverse Spin', desc: 'Halfway through, the spiral pauses and spins the other way.', max: 1, threat: 2 }],
    params: m => ({ arms: 2 + (m.more || 0), rev: !!m.rev, dur: 2.4, rate: 0.1, speed: 195, spin: 2.1 }),
    show: p => ({ Arms: p.arms, Duration: p.dur + 's', Reverses: p.rev ? 'Yes' : 'No' }),
    start(R, W, b, p) {
      b.windup('spiral', 0.45);
      let base = Math.random() * 7, acc = 0, dir = Math.random() < 0.5 ? 1 : -1, flipped = false, pause = 0;
      R.onUpdate = (dt, t) => {
        if (t < 0.45 || t > 0.45 + p.dur + (p.rev ? 0.25 : 0)) return;
        if (p.rev && !flipped && t > 0.45 + p.dur / 2) { flipped = true; dir *= -1; pause = 0.25; }
        if (pause > 0) { pause -= dt; return; }
        base += p.spin * dir * dt; acc += dt;
        while (acc >= p.rate) { acc -= p.rate; const o = b.muzzle('spiral'); for (let k = 0; k < p.arms; k++) W.eBullet(o.x, o.y, base + k / p.arms * Math.PI * 2, p.speed, { src: 'spiral', r: 6 }); }
      };
      R.end(0.45 + p.dur + (p.rev ? 0.3 : 0));
    }
  });

  /* 17 Gravity Snare */
  atk({
    id: 'snare', name: 'Gravity Snare', slot: 'coil', cost: 0.7, cd: 9, threat: 2, tags: ['control'], punishes: ['far', 'mobility'], counters: ['mobility'],
    desc: 'A swirling well appears near you and gently drags you in for 3s (always weaker than your own thrusters).',
    module: { name: 'Graviton Coil' },
    mods: [{ id: 'collapse', name: 'Collapse', desc: 'The well bursts into 10 bullets when it ends.', max: 1, threat: 2 }, { id: 'twin', name: 'Twin Wells', desc: 'A second well appears on your other side.', max: 1, threat: 2 }],
    params: m => ({ collapse: !!m.collapse, twin: !!m.twin, dur: 3, pull: 520 }),
    show: p => ({ Wells: p.twin ? 2 : 1, Duration: p.dur + 's', 'Collapse burst': p.collapse ? '10 bullets' : 'No' }),
    start(R, W, b, p) {
      b.windup('snare', 0.4);
      const tp = W.targetPos(); const a = Math.random() * Math.PI * 2, d = M.rand(170, 230);
      const mk = sgn => { const x = M.clamp(tp.x + Math.cos(a) * d * sgn, A.L + 60, A.R - 60), y = M.clamp(tp.y + Math.sin(a) * d * sgn, A.T + 60, A.B - 60); R.track(W.eAdd(SO.makeSnare(W, x, y, p))); };
      R.at(0.2, () => { mk(1); if (p.twin) mk(-1); });
      R.end(0.2 + 0.8 + p.dur);
    }
  });

  /* 18 Tracking Turret */
  atk({
    id: 'turret', name: 'Tracking Turret', slot: 'dome', cost: 0.5, cd: 4.2, threat: 2, tags: ['bullets'], punishes: ['far', 'stationary'], counters: ['mobility', 'interceptor'],
    desc: 'A dotted laser sight tracks you for 0.6s, locks, then a quick 4-shot burst follows the locked line.',
    module: { name: 'Turret Dome' },
    mods: [{ id: 'rapid', name: 'Rapid Feed', desc: '+2 shots per burst.', max: 1, threat: 1 }, { id: 'predict', name: 'Predictive Aim', desc: 'Aims where you\'re heading (lead capped at 0.35s).', max: 1, threat: 3 }],
    params: m => ({ n: 4 + 2 * (m.rapid || 0), predict: !!m.predict, speed: 390 }),
    show: p => ({ 'Shots per burst': p.n, 'Shot speed': p.speed, 'Predictive aim': p.predict ? 'Yes' : 'No' }),
    start(R, W, b, p) {
      const sight = R.track(W.eSight(() => b.muzzle('turret'), 0.6, 0.18, p.predict, p.speed));
      for (let i = 0; i < p.n; i++) R.at(0.78 + i * 0.08, () => { const o = b.muzzle('turret'); W.eBullet(o.x, o.y, sight.a, p.speed, { src: 'turret', r: 5.5, metal: true }); b.recoil('turret'); W.sfx('eshot'); });
      R.end(0.8 + p.n * 0.08);
    }
  });

  /* 19 Pinballs */
  atk({
    id: 'bouncer', name: 'Pinball Launcher', slot: 'side', cost: 0.8, cd: 9, threat: 2, tags: ['area'], punishes: ['close'], counters: ['interceptor', 'mobility'],
    desc: 'Launches heavy balls (never straight at you) that bounce around the arena for 6s.',
    module: { name: 'Ball Launcher' },
    mods: [{ id: 'more', name: 'Multiball', desc: '+2 balls per launch.', max: 1, threat: 2 }, { id: 'split', name: 'Splitting Balls', desc: 'Balls split in two on their 3rd bounce.', max: 1, threat: 2 }],
    params: m => ({ n: 3 + 2 * (m.more || 0), split: !!m.split, speed: 200 }),
    show: p => ({ Balls: p.n, 'Ball speed': p.speed, Splitting: p.split ? 'Yes' : 'No' }),
    start(R, W, b, p) {
      b.windup('bouncer', 0.4);
      R.at(0.4, () => { const ap = aimP(W, b.x, b.y); for (let i = 0; i < p.n; i++) { const a = ap + Math.PI * 0.35 + i / p.n * Math.PI * 1.3; const o = b.muzzle('bouncer'); W.eBullet(o.x, o.y, a, p.speed, { src: 'bouncer', kind: 'ball', r: 15, dmg: 16, big: true, life: 6, bounce: 99, split: p.split ? 3 : 0, metal: true }); } W.sfx('heavy', 0.5); });
      R.end(0.7);
    }
  });

  /* 20 Sniper Rail */
  atk({
    id: 'sniper', name: 'Sniper Rail', slot: 'rail', cost: 0.9, cd: 8, threat: 3, tags: ['laser'], punishes: ['far', 'precision'], counters: ['mobility'],
    desc: 'A sight line tracks you for 1.2s, freezes and flashes for 0.45s, then an instant rail fires along it. Move off the line.',
    module: { name: 'Rail Barrel' },
    mods: [{ id: 'double', name: 'Double Tap', desc: 'A quicker second shot follows (0.6s track).', max: 1, threat: 2 }, { id: 'rico', name: 'Ricochet Rail', desc: 'The rail bounces off one wall. The bounce is previewed.', max: 1, threat: 2 }],
    params: m => ({ double: !!m.double, rico: !!m.rico, track: 1.2, lock: 0.45 }),
    show: p => ({ Shots: p.double ? 2 : 1, 'Tracking time': p.track + 's', 'Lock warning': p.lock + 's', Ricochet: p.rico ? '1 wall' : 'No' }),
    start(R, W, b, p) {
      R.track(W.eRail(() => b.muzzle('sniper'), p.track, p.lock, p.rico, 20));
      let t = p.track + p.lock + 0.25;
      if (p.double) { R.at(t, () => R.track(W.eRail(() => b.muzzle('sniper'), 0.6, p.lock, p.rico, 20))); t += 0.6 + p.lock + 0.25; }
      R.end(t);
    }
  });

  /* ---- chassis-granted attacks ---- */
  atk({
    id: 'bombard', name: 'Bombard Stance', slot: 'back', cost: 0.6, cd: 11, threat: 2, chassisOnly: true, tags: ['area'], desc: 'Plants its legs and lobs 3 shells near you (floor markers).',
    params: () => ({ n: 3 }), show: p => ({ Shells: p.n }),
    start(R, W, b, p) { R.hold = true; R.at(0.4, () => { const tp = W.targetPos(); [-130, 0, 130].forEach((dx, i) => R.track(W.eMortar(b.muzzle('mortar'), M.clamp(tp.x + dx, A.L + 40, A.R - 40), 1.25 + i * 0.12, 54, false))); }); R.end(1.9); }
  });
  atk({
    id: 'sideguns', name: 'Wing Guns', slot: 'wing', cost: 0.3, cd: 3.4, threat: 1, chassisOnly: true, tags: ['bullets'], desc: 'Wing turrets fire aimed pairs.',
    params: () => ({}), show: () => ({ Shots: '2 × 2' }),
    start(R, W, b) { b.windup('sideguns', 0.3); for (let v = 0; v < 2; v++) R.at(0.3 + v * 0.3, () => { for (const s of [-1, 1]) { const x = b.x + s * b.size * 0.95, y = b.y; W.eBullet(x, y, aimP(W, x, y), 280, { src: 'sideguns', r: 5.5 }); } }); R.end(1); }
  });
  atk({
    id: 'carousel', name: 'Carousel Spin', slot: 'core', cost: 0.6, cd: 8, threat: 2, chassisOnly: true, tags: ['bullets'], desc: 'Segments spin up and spit bullets outward.',
    params: () => ({}), show: () => ({ Duration: '1.6s' }),
    start(R, W, b) { b.spinBoost = 1; let acc = 0; R.onUpdate = (dt, t) => { if (t < 0.4 || t > 2.0) return; acc += dt; while (acc > 0.16) { acc -= 0.16; for (const s of b.segments) { const a = M.ang(b.x, b.y, s.x, s.y); W.eBullet(s.x, s.y, a, 190, { src: 'carousel', r: 5.5 }); } } }; R.at(2.1, () => { b.spinBoost = 0; }); R.onCancel = () => { b.spinBoost = 0; }; R.end(2.1); }
  });
  atk({
    id: 'hydra', name: 'Hydra Strike', slot: 'core', cost: 0.6, cd: 7, threat: 2, chassisOnly: true, tags: ['contact'], desc: 'A segment detaches, shows its lunge line, and strikes (14 dmg).',
    params: () => ({}), show: () => ({ Damage: 14 }),
    start(R, W, b) { const seg = b.segments[Math.floor(Math.random() * b.segments.length)]; if (!seg) { R.end(0); return; } R.track(W.eAdd(SO.makeLunge(W, b, seg))); R.end(2.2); }
  });
  atk({
    id: 'drip', name: 'Acid Drip', slot: 'bottom', cost: 0.4, cd: 4.2, threat: 2, chassisOnly: true, tags: ['bullets'], desc: 'Sprays a fan of 7 acid drops straight out from the wall it clings to.',
    params: () => ({ n: 7 }), show: p => ({ Drops: p.n }),
    start(R, W, b, p) { b.windup('drip', 0.45); R.at(0.45, () => { const a = b.wallAway == null ? Math.PI / 2 : b.wallAway; for (let i = 0; i < p.n; i++) { const off = (i - (p.n - 1) / 2) * 0.17; W.eBullet(b.x + Math.cos(a) * b.h, b.y + Math.sin(a) * b.h, a + off, 190 + Math.abs(i - 3) * 14, { src: 'drip', r: 6.5 }); } W.sfx('eshot'); }); R.end(0.8); }
  });
  atk({
    id: 'dive', name: 'Hunter Dive', slot: 'bottom', cost: 1.2, cd: 7.5, threat: 3, big: true, solo: true, recovery: 0.6, chassisOnly: true, tags: ['contact'], desc: 'Flashes a warning, then dives straight at you. Contact during the dive hurts (18). It is exposed after.',
    params: () => ({ speed: 760 }), show: p => ({ 'Dive speed': p.speed, Damage: 18 }),
    start(R, W, b, p) {
      R.hold = true; let a = 0;
      R.at(0, () => { b.charging = 'warn'; W.sfx('charge'); });
      R.onUpdate = (dt, t) => { if (b.charging === 'warn') { const tp = W.targetPos(); a = M.ang(b.x, b.y, tp.x, tp.y); b.diveAim = a; } };
      R.at(0.7, () => { b.charging = 'go'; b.diveAim = null; b.dashTo(a, p.speed, () => { b.charging = null; W.shake(7); W.sfx('boom'); W.word('SWOOP!', b.x, b.y - b.size, 'boss'); }); });
      R.end(1.6); R.onCancel = () => { b.charging = null; b.dashing = null; b.diveAim = null; };
    }
  });
  atk({
    id: 'payload', name: 'Payload Drop', slot: 'bottom', cost: 0.6, cd: 8, threat: 2, chassisOnly: true, tags: ['area'], desc: 'Drops 3 shells on and beside your position (floor markers).',
    params: () => ({ n: 3 }), show: p => ({ Shells: p.n }),
    start(R, W, b) { b.windup('payload', 0.4); R.at(0.4, () => { const tp = W.targetPos(); [-110, 0, 110].forEach((dx, i) => R.track(W.eMortar(b.muzzle('payload'), M.clamp(tp.x + dx, A.L + 40, A.R - 40), 1.1 + i * 0.15, 50, false))); }); R.end(1.8); }
  });

  /* ---------------- enemy object factories ---------------- */
  SO.makeEMine = function (W, x0, y0, tx, ty, magnet) {
    return {
      emine: true, x: x0, y: y0, x0, y0, tx, ty, t: 0, hp: 10, r: 11, shootable: true, state: 'fly', fuse: 0, life: 7.5, magnet,
      update(dt) {
        this.t += dt;
        if (this.state === 'fly') { const k = Math.min(1, this.t / 0.6); this.x = M.lerp(this.x0, this.tx, k); this.y = M.lerp(this.y0, this.ty, k) - Math.sin(k * Math.PI) * 80; if (k >= 1) { this.state = 'arming'; this.t = 0; } return; }
        if (this.state === 'arming') { if (this.t > 1.0) { this.state = 'armed'; this.t = 0; } return; }
        if (this.state === 'armed') {
          if (this.magnet) { const tp = W.targetPos(); const a = M.ang(this.x, this.y, tp.x, tp.y); this.x += Math.cos(a) * 38 * dt; this.y += Math.sin(a) * 38 * dt; }
          if (W.playerNear(this.x, this.y, 85) || this.t > this.life) { this.state = 'fuse'; this.t = 0; W.sfx('warn', 0.6); }
          return;
        }
        if (this.state === 'fuse' && this.t >= 0.45) { this.dead = true; W.eBlastNow(this.x, this.y, 85, 16, 'mines'); }
      },
      onKilled() { W.fxPuff(this.x, this.y, 14, P.paperDeep); W.word('POP', this.x, this.y - 10, 'small'); },
      draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        if (this.state === 'armed' || this.state === 'fuse') {
          const fuse = this.state === 'fuse'; ctx.globalAlpha = fuse ? 0.9 : 0.55; ctx.setLineDash(fuse ? [] : [6, 6]); ctx.lineWidth = fuse ? 3 : 2; ctx.strokeStyle = P.warn;
          SO.art.circ(ctx, 0, 0, 85); ctx.stroke(); if (fuse) { ctx.globalAlpha = 0.18 + 0.15 * Math.sin(W.time * 40); ctx.fillStyle = P.warn; ctx.fill(); }
          ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); ctx.stroke(); }
        SO.art.inkCirc(ctx, 0, 0, 10, P.enemy, 2.5);
        ctx.fillStyle = this.state === 'fuse' || (this.state === 'armed' && W.time % 0.5 < 0.25) ? P.warn : P.enemyDark; SO.art.circ(ctx, 0, 0, 4); ctx.fill();
        ctx.restore();
      }
    };
  };
  SO.makeOrbit = function (W, b, p) {
    const o = {
      t: 0, blades: [], phase: 'warn', ang: Math.random() * 7, flung: false, b,
      update(dt) {
        this.t += dt; this.ang += dt * 1.7;
        let r;
        if (this.t < 1.0) r = 70; else if (this.t < 2.2) r = M.lerp(70, p.rMax, M.easeInOut((this.t - 1.0) / 1.2)); else if (this.t < 2.8) r = p.rMax; else if (!p.fling) r = M.lerp(p.rMax, 60, Math.min(1, (this.t - 2.8) / 1.2)); else r = p.rMax;
        this.phase = this.t < 1 ? 'warn' : 'live';
        if (p.fling && this.t >= 2.8 && !this.flung) { this.flung = true; for (let i = 0; i < p.n; i++) { const a = this.ang + i / p.n * Math.PI * 2; W.eBullet(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, a, 260, { src: 'orbit', kind: 'blade', r: 11, big: true, metal: true, life: 4 }); } this.dead = true; return; }
        this.blades = []; for (let i = 0; i < p.n; i++) { const a = this.ang + i / p.n * Math.PI * 2; this.blades.push({ x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r, a }); }
        if (this.t > 0.4) for (const bl of this.blades) W.hitPlayerCircle(bl.x, bl.y, 11, 14, 'orbit');
        if (this.t >= 4.0 || !b.alive) this.dead = true;
      },
      draw(ctx) {
        if (this.t < 1.0) { ctx.save(); ctx.globalAlpha = 0.7; ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeStyle = P.warn; SO.art.circ(ctx, b.x, b.y, p.rMax); ctx.stroke(); ctx.restore(); }
        for (const bl of this.blades) SO.drawEBlade(ctx, bl.x, bl.y, 11, W.time * 12, Math.min(1, this.t / 0.4));
      }
    };
    return o;
  };
  SO.drawEBlade = function (ctx, x, y, r, rot, k = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr = i % 2 ? r * 0.55 : r * 1.25; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
    ctx.fillStyle = P.enemy; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = P.ink; ctx.stroke();
    ctx.fillStyle = P.enemyCore; SO.art.circ(ctx, 0, 0, r * 0.3); ctx.fill(); ctx.restore();
  };
  SO.makeBarrier = function (W, fromLeft, p, second) {
    const dir = fromLeft ? 1 : -1; const base = M.rand(A.T + 130, A.B - 130);
    return {
      x: fromLeft ? A.L + 14 : A.R - 14, dir, t: 0, phase: 'warn', gapY: base, base, w: 26, seed: Math.random() * 7, shiftDir: Math.random() < 0.5 ? 1 : -1,
      update(dt) {
        this.t += dt;
        if (p.shift) this.gapY = M.clamp(this.base + Math.sin(this.t * 1.3 + this.seed) * 110 * this.shiftDir, A.T + p.gap / 2 + 10, A.B - p.gap / 2 - 10);
        if (this.t < 1.2) { this.phase = 'warn'; return; }
        this.phase = 'live'; this.x += dir * p.speed * dt;
        if (this.x < A.L - 30 || this.x > A.R + 30) { this.dead = true; return; }
        const g0 = this.gapY - p.gap / 2, g1 = this.gapY + p.gap / 2;
        if (g0 > A.T) W.hitPlayerRect(this.x, (A.T + g0) / 2, this.w / 2, (g0 - A.T) / 2, 18, 'barrier');
        if (g1 < A.B) W.hitPlayerRect(this.x, (g1 + A.B) / 2, this.w / 2, (A.B - g1) / 2, 18, 'barrier');
      },
      draw(ctx) {
        const warn = this.phase === 'warn'; const g0 = this.gapY - p.gap / 2, g1 = this.gapY + p.gap / 2;
        ctx.save();
        if (warn) { ctx.globalAlpha = 0.45 + 0.25 * Math.sin(W.time * 18); SO.art.hazardRect(ctx, this.x - this.w / 2, A.T, this.w, g0 - A.T); SO.art.hazardRect(ctx, this.x - this.w / 2, g1, this.w, A.B - g1); }
        else {
          for (const [y0, y1] of [[A.T, g0], [g1, A.B]]) { if (y1 <= y0) continue; SO.art.inkRect(ctx, this.x - this.w / 2, y0, this.w, y1 - y0, 3, P.enemy, 3); ctx.fillStyle = P.enemyCore; for (let y = y0 + 12; y < y1 - 8; y += 26) ctx.fillRect(this.x - 4, y, 8, 10); }
        }
        ctx.globalAlpha = 1; ctx.strokeStyle = P.warn; ctx.lineWidth = 4;
        // gap brackets + arrows
        const bx = this.x + this.dir * 34;
        ctx.beginPath(); ctx.moveTo(bx - 10, g0); ctx.lineTo(bx, g0); ctx.lineTo(bx, g1); ctx.lineTo(bx - 10, g1); ctx.stroke();
        SO.art.text(ctx, 'GAP', bx + this.dir * 4, this.gapY, 16, P.warn, this.dir > 0 ? 'left' : 'right', 4);
        if (p.shift) { const up = Math.cos(this.t * 1.3 + this.seed) * this.shiftDir < 0; SO.art.text(ctx, up ? '▲' : '▼', bx + this.dir * 4, this.gapY + (up ? -22 : 22), 16, P.warn, this.dir > 0 ? 'left' : 'right', 4); }
        ctx.restore();
      }
    };
  };
  SO.makeEDrone = function (W, x, y, p, i) {
    return {
      edrone: true, x, y, hp: 40, maxHp: 40, r: 14, shootable: true, t: 0, cd: 1.2 + i * 0.4, flash: 0, life: 14, hx: M.rand(A.L + 120, A.R - 120), hy: M.rand(A.T + 60, A.T + 260), state: 'fly', dive: null,
      update(dt) {
        this.t += dt;
        if (this.state === 'divewarn') { this.flash += dt; if (this.flash > 0.75) { this.state = 'dive'; } return; }
        if (this.state === 'dive') { this.x += Math.cos(this.dive) * 520 * dt; this.y += Math.sin(this.dive) * 520 * dt; if (this.x < A.L || this.x > A.R || this.y < A.T || this.y > A.B || W.playerNear(this.x, this.y, 30)) { this.dead = true; W.eBlastNow(this.x, this.y, 60, 16, 'drones'); } return; }
        if (t2hover(this, dt)) { }
        this.cd -= dt;
        if (this.cd <= 0.35 && this.cd + dt > 0.35) this.flash = 0.35;
        if (this.flash > 0) this.flash -= dt;
        if (this.cd <= 0) { this.cd = 1.8; const tp = W.targetPos(); W.eBullet(this.x, this.y, M.ang(this.x, this.y, tp.x, tp.y), 260, { src: 'drones', r: 5.5 }); }
        if (this.t > 6 && Math.random() < dt * 0.4) { this.hx = M.rand(A.L + 120, A.R - 120); this.hy = M.rand(A.T + 60, A.T + 280); }
        if (this.t > this.life || (p.kami && this.hp < this.maxHp * 0.5)) {
          if (p.kami) { const tp = W.targetPos(); this.dive = M.ang(this.x, this.y, tp.x, tp.y); this.state = 'divewarn'; this.flash = 0; W.sfx('warn'); }
          else this.dead = true;
        }
      },
      onKilled() { W.fxPuff(this.x, this.y, 18, P.paperDeep); W.word('BZZT!', this.x, this.y - 18, 'small'); },
      draw(ctx) {
        if (this.state === 'divewarn') { ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = P.warn; ctx.lineWidth = 6; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(this.x, this.y); const L = M.rayToWall(this.x, this.y, this.dive); ctx.lineTo(this.x + Math.cos(this.dive) * L, this.y + Math.sin(this.dive) * L); ctx.stroke(); ctx.restore(); }
        ctx.save(); ctx.translate(this.x, this.y + Math.sin(this.t * 6) * 2);
        const warnCol = this.flash > 0 || this.state === 'divewarn';
        SO.art.inkRect(ctx, -13, -9, 26, 18, 4, warnCol ? P.warn : P.coral, 2.5, P.blueMid);
        ctx.fillStyle = P.ink; ctx.fillRect(-18, -14, 12, 3); ctx.fillRect(6, -14, 12, 3);
        ctx.fillStyle = P.white; SO.art.circ(ctx, 0, 0, 4.5); ctx.fill(); ctx.fillStyle = P.ink; const tp = W.targetPos(); const a = M.ang(this.x, this.y, tp.x, tp.y); SO.art.circ(ctx, Math.cos(a) * 2, Math.sin(a) * 2, 2.2); ctx.fill();
        ctx.restore();
        SO.drawHpPips(ctx, this.x, this.y - 20, this.hp / this.maxHp, 26);
      }
    };
    function t2hover(d, dt) { d.x += (d.hx - d.x) * Math.min(1, dt * 1.5); d.y += (d.hy - d.y) * Math.min(1, dt * 1.5); return true; }
  };
  SO.drawHpPips = function (ctx, x, y, frac, w) { ctx.save(); ctx.fillStyle = P.ink; ctx.fillRect(x - w / 2 - 1, y - 3, w + 2, 6); ctx.fillStyle = P.coral; ctx.fillRect(x - w / 2, y - 2, w * M.clamp(frac, 0, 1), 4); ctx.restore(); };
  SO.makeShock = function (W, x, dir, p) {
    return {
      x, dir, t: 0, h: p.h,
      update(dt) { this.t += dt; this.x += dir * p.speed * dt; if (this.x < A.L - 20 || this.x > A.R + 20) this.dead = true; W.hitPlayerRect(this.x, A.B - this.h / 2, 16, this.h / 2, 16, 'stomp'); },
      draw(ctx) {
        ctx.save(); ctx.translate(this.x, A.B);
        SO.art.ink(ctx, () => { ctx.beginPath(); ctx.moveTo(-dir * 40, 0); ctx.quadraticCurveTo(-dir * 10, -this.h * 0.4, 0, -this.h); ctx.quadraticCurveTo(dir * 8, -this.h * 0.5, dir * 18, 0); ctx.closePath(); }, P.enemy, 3);
        ctx.fillStyle = P.enemyCore; ctx.beginPath(); ctx.moveTo(-dir * 18, 0); ctx.quadraticCurveTo(-dir * 4, -this.h * 0.3, 0, -this.h * 0.6); ctx.quadraticCurveTo(dir * 4, -this.h * 0.3, dir * 8, 0); ctx.fill();
        ctx.restore();
      }
    };
  };
  SO.makeSnare = function (W, x, y, p) {
    return {
      x, y, t: 0, phase: 'warn', dur: p.dur,
      update(dt) {
        this.t += dt;
        if (this.t < 0.8) { this.phase = 'warn'; return; }
        this.phase = 'live';
        W.pullPlayer(this.x, this.y, 340, p.pull, dt);
        if (this.t >= 0.8 + this.dur) { this.dead = true; if (p.collapse) for (let k = 0; k < 10; k++) W.eBullet(this.x, this.y, k / 10 * Math.PI * 2, 180, { src: 'snare' }); W.fxRing(this.x, this.y, 10, 60, P.enemy, 0.3); }
      },
      draw(ctx) {
        const live = this.phase === 'live'; ctx.save(); ctx.translate(this.x, this.y);
        ctx.globalAlpha = live ? 0.75 : 0.45 + 0.3 * Math.sin(W.time * 16);
        for (let i = 0; i < 3; i++) { ctx.strokeStyle = live ? P.enemy : P.warn; ctx.lineWidth = 3; ctx.beginPath(); const r = 340 * (1 - ((W.time * 0.7 + i / 3) % 1)); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.rotate(W.time * 5);
        ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 30; i++) { const a = i * 0.5, r = 2 + i * 0.8; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(r, 0); } ctx.stroke();
        ctx.restore();
      }
    };
  };
  SO.makeLunge = function (W, b, seg) {
    return {
      t: 0, phase: 'warn', seg, a: 0, x: seg.x, y: seg.y, sx: 0, sy: 0, tx: 0, ty: 0,
      update(dt) {
        this.t += dt;
        if (this.t < 0.75) { const tp = W.targetPos(); this.sx = seg.x; this.sy = seg.y; this.a = M.ang(seg.x, seg.y, tp.x, tp.y); this.len = Math.min(M.rayToWall(seg.x, seg.y, this.a), 520); seg.lunge = { x: seg.x, y: seg.y }; return; }
        this.phase = 'live';
        const k = this.t < 1.35 ? (this.t - 0.75) / 0.6 : Math.max(0, 1 - (this.t - 1.35) / 0.7);
        this.x = this.sx + Math.cos(this.a) * this.len * M.easeOut(k); this.y = this.sy + Math.sin(this.a) * this.len * M.easeOut(k);
        seg.lunge = { x: this.x, y: this.y };
        if (this.t < 1.35) W.hitPlayerCircle(this.x, this.y, 18, 14, 'hydra');
        if (this.t > 2.05) { this.dead = true; seg.lunge = null; }
      },
      draw(ctx) { if (this.phase === 'warn') { ctx.save(); ctx.globalAlpha = 0.65; ctx.strokeStyle = P.warn; ctx.lineWidth = 8; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(this.sx, this.sy); ctx.lineTo(this.sx + Math.cos(this.a) * this.len, this.sy + Math.sin(this.a) * this.len); ctx.stroke(); ctx.restore(); } },
      onRemove() { seg.lunge = null; }
    };
  };

  /* ---------------- passives & chassis ---------------- */
  SO.BOSS_PASSIVES = {
    armor: { name: 'Armor Plating', max: 2, threat: 2, desc: 'Takes 15% less damage (exposed core ignores armor).', punishes: ['bullet'], counters: ['crit', 'precision'] },
    reactive: { name: 'Reactive Plating', threat: 2, desc: 'After taking 6% of its max HP within 3s, sprays a ring of 8 slow bullets (3s cooldown).', punishes: ['close'], counters: ['mobility'] },
    regen: { name: 'Self-Sealing Hull', threat: 2, desc: 'Repairs 1.2% max HP per second after 3s without being hit (never past its last phase line).', punishes: ['explosive', 'precision'], counters: ['dot', 'drone', 'bullet'] },
    overclock: { name: 'Overclock', max: 2, threat: 3, desc: 'Attack cooldowns −12% and pauses between attacks −12%.', punishes: [], counters: ['interceptor', 'defense'] },
    thrusters: { name: 'Thruster Fins', threat: 1, desc: 'Moves 35% faster and repositions more often.', punishes: ['precision', 'explosive'], counters: ['homing', 'drone', 'chain'] },
    heavy: { name: 'Heavy Frame', max: 2, threat: 2, desc: '+22% max HP and a bigger body.', punishes: [], counters: ['dot', 'crit'] },
    tempered: { name: 'Tempered Rounds', threat: 2, desc: 'Enemy projectiles fly 12% faster (still capped at 520 px/s).', punishes: ['close'], counters: ['interceptor'] },
    deflector: { name: 'Deflector Bubble', threat: 2, desc: 'Every 9s, shimmers for 0.6s then raises a bubble for 1.6s that blocks your projectiles and beams.', punishes: ['bullet', 'beam'], counters: ['close', 'dot', 'melee'] },
    rage: { name: 'Rage Engine', threat: 3, desc: 'Below 40% HP: attacks 25% faster and can overlap more patterns.', punishes: [], counters: ['crit', 'explosive'] },
    scrap: { name: 'Scrap Shield', threat: 2, desc: '3 scrap plates (40 HP) orbit the boss and block your shots. They rebuild 8s after breaking.', punishes: ['bullet', 'precision'], counters: ['explosive', 'big', 'pierce', 'beam'] },
    flares: { name: 'Countermeasure Flares', threat: 1, desc: 'Every 5s pops flares that lure 35% of your homing projectiles away.', punishes: ['homing', 'drone'], counters: ['precision', 'beam'] },
    combo: { name: 'Combo Circuit', threat: 3, desc: 'The attack director may run one more pattern at once (+0.4 budget).', punishes: [], counters: ['interceptor', 'defense'] },
    selfrepair: { name: 'Module Foundry', threat: 1, desc: 'Weapon modules have +50% HP and come back online 40% faster.', punishes: ['precision'], counters: [] },
    vengeful: { name: 'Vengeful Core', threat: 2, desc: 'When its exposed core closes, fires a ring of 12 bullets with a gap.', punishes: ['close'], counters: ['mobility'] },
    escal: { name: 'Escalation Protocol', max: 30, threat: 1, fallback: true, desc: '+12% max HP and +4% projectile speed. (Shown when the pool runs dry.)', punishes: [], counters: [] }
  };
  SO.CHASSIS = {
    proto: { name: 'Prototype', desc: 'A hovering box with a lot to prove.', hp: 1, speed: 1, size: 96, tier: 0 },
    walker: { name: 'Iron Strider', desc: 'Heavily armored walking machine. +25% HP and +10% armor, but stays on the ground — the air above is yours.', hp: 1.25, armor: 0.1, speed: 0.75, size: 104, ground: true, tier: 1 },
    hover: { name: 'Sky Platform', desc: 'Nimble hovering weapons platform. −10% HP, but moves 60% faster and attacks 15% more often.', hp: 0.9, speed: 1.6, gcd: 0.85, size: 88, tier: 1 },
    modular: { name: 'Modular Construct', desc: 'A core with 3 rotating weapon segments. Attacks fire from the segments; the core opens briefly every 10s.', hp: 1.05, speed: 0.8, size: 82, segments: 3, tier: 1 },
    siege: { name: 'Siege Strider', base: 'walker', desc: 'Strider upgrade: plants its legs for a Bombard Stance (3 shells near you).', extra: 'bombard', hp: 1.1, tier: 2 },
    jugg: { name: 'Juggernaut', base: 'walker', desc: 'Strider upgrade: gains a ground Ram Charge (if it lacked one) and +10% more armor.', grant: 'charge', armor: 0.1, tier: 2 },
    fortress: { name: 'Sky Fortress', base: 'hover', desc: 'Platform upgrade: wing guns fire aimed pairs between patterns.', extra: 'sideguns', tier: 2 },
    interceptor: { name: 'Interceptor', base: 'hover', desc: 'Platform upgrade: afterburner dashes and +8% projectile speed.', speed: 1.2, bspeed: 1.08, tier: 2 },
    carousel: { name: 'Carousel', base: 'modular', desc: 'Construct upgrade: +2 segments that spin up to spit bullets.', extra: 'carousel', segments: 2, tier: 2 },
    hydra: { name: 'Hydra', base: 'modular', desc: 'Construct upgrade: segments detach and lunge at you along a marked line.', extra: 'hydra', tier: 2 },
    crawler: { name: 'Wall Crawler', desc: 'Skitters along the walls and ceiling instead of flying, firing from the edges of the arena. +10% HP.', move: 'crawl', hp: 1.1, speed: 1.05, size: 90, tier: 1 },
    hopper: { name: 'Pogo Hopper', desc: 'Bounces around the arena on a giant spring. Every landing sends a shockwave of bullets along the floor.', move: 'hop', hp: 1.05, speed: 1, size: 92, tier: 1 },
    phaser: { name: 'Phase Shifter', desc: 'Never moves — it teleports. A marker shows where it will reappear. −5% HP.', move: 'phase', hp: 0.95, speed: 1, size: 88, tier: 1 },
    orbiter: { name: 'Orbiter', desc: 'Circles the arena in a wide loop that never stops, even while it attacks.', move: 'orbit', hp: 1, speed: 1, size: 88, tier: 1 },
    pendulum: { name: 'Pendulum', desc: 'Hangs from a chain on the ceiling and swings back and forth, drifting toward you. +15% HP.', move: 'swing', hp: 1.15, speed: 1, size: 100, tier: 1 },
    stalker: { name: 'Stalker', desc: 'Hovers high and shadows you from above, sliding to stay over your head. −10% HP.', move: 'stalk', hp: 0.9, speed: 1.2, size: 86, tier: 1 },
    bumper: { name: 'Ricochet Box', desc: 'Flies in straight diagonal lines and bounces off every wall like a bumper car.', move: 'bounce', hp: 1.05, speed: 1, size: 90, tier: 1 },
    scuttler: { name: 'Scuttler', base: 'crawler', desc: 'Crawler upgrade: six legs, 45% faster, and switches walls far more often.', speed: 1.45, fx: { scuttle: true }, tier: 2 },
    dripper: { name: 'Acid Dripper', base: 'crawler', desc: 'Crawler upgrade: sprays fans of acid drops straight out from its wall.', extra: 'drip', tier: 2 },
    quake: { name: 'Quake Hopper', base: 'hopper', desc: 'Hopper upgrade: heavier landings with double shockwaves that shake the arena. +10% HP.', hp: 1.1, fx: { quake: true }, tier: 2 },
    skyhopper: { name: 'Sky Hopper', base: 'hopper', desc: 'Hopper upgrade: leaps much higher and double-jumps in midair to change direction.', fx: { doubleHop: true }, tier: 2 },
    blinkstorm: { name: 'Blink Storm', base: 'phaser', desc: 'Shifter upgrade: teleports twice as often with a shorter warning.', fx: { blink: true }, tier: 2 },
    echo: { name: 'Echo Shifter', base: 'phaser', desc: 'Shifter upgrade: leaves a burst of 10 bullets behind every time it teleports.', fx: { echoBurst: true }, tier: 2 },
    binary: { name: 'Binary Star', base: 'orbiter', desc: 'Orbiter upgrade: 2 weapon satellites circle it and fire its attacks. Its core opens every 10s.', segments: 2, tier: 2 },
    comet: { name: 'Comet', base: 'orbiter', desc: 'Orbiter upgrade: 35% faster, reverses direction without warning, and sheds a trail of slow bullets.', speed: 1.35, fx: { comet: true }, tier: 2 },
    wrecking: { name: 'Wrecking Ball', base: 'pendulum', desc: 'Pendulum upgrade: wider, faster swings. Touching it at full swing hurts (16). +10% HP.', hp: 1.1, fx: { wreck: true }, tier: 2 },
    chime: { name: 'Chime Bell', base: 'pendulum', desc: 'Pendulum upgrade: rings at the top of every swing, firing a fan of 5 bullets.', fx: { chime: true }, tier: 2 },
    hunter: { name: 'Hunter', base: 'stalker', desc: 'Stalker upgrade: tracks you tighter and periodically dives straight at you.', extra: 'dive', fx: { tight: true }, tier: 2 },
    shade: { name: 'Shade', base: 'stalker', desc: 'Stalker upgrade: drops shells right on top of you from above.', extra: 'payload', tier: 2 },
    pinball: { name: 'Pinball', base: 'bumper', desc: 'Ricochet upgrade: speeds up with every wall bounce (up to +70%) until it is stunned.', fx: { accel: true }, tier: 2 },
    shrapnel: { name: 'Shrapnel Box', base: 'bumper', desc: 'Ricochet upgrade: every wall bounce sprays 5 bullets back into the arena.', fx: { bounceBurst: true }, tier: 2 }
  };
  SO.CHASSIS_T1 = Object.keys(SO.CHASSIS).filter(k => SO.CHASSIS[k].tier === 1);

  SO.newBossBuild = () => ({ attacks: { spread: {}, ring: {} }, passives: {}, chassis: 'proto', tier2: null, counts: {} });

  /* ---------------- boss upgrade pool ---------------- */
  const BUPS = SO.BOSS_UPS = []; const BBY = SO.BOSS_UP = {};
  function bup(o) { o.max = o.max || 1; BUPS.push(o); BBY[o.id] = o; }
  for (const id of ATK_ORDER) {
    const d = ATK[id]; if (d.chassisOnly) continue;
    bup({ id: 'a_' + id, kind: 'attack', attack: id, name: d.name, threat: d.threat, desc: d.desc, punishes: d.punishes, counters: d.counters, req: bb => !bb.attacks[id], apply: bb => { bb.attacks[id] = {}; } });
    d.mods.forEach(m => bup({ id: 'am_' + id + '_' + m.id, kind: 'mod', attack: id, mod: m.id, name: m.name, threat: m.threat, max: m.max, desc: m.desc, punishes: d.punishes, counters: d.counters, req: bb => !!bb.attacks[id] && (bb.attacks[id][m.id] || 0) < m.max, apply: bb => { bb.attacks[id][m.id] = (bb.attacks[id][m.id] || 0) + 1; } }));
  }
  for (const k in SO.BOSS_PASSIVES) {
    const d = SO.BOSS_PASSIVES[k];
    const extra = {
      selfrepair: bb => SO.bossAttackList(bb).some(id => ATK[id] && ATK[id].module),
      flares: (bb, B) => !B || B.weapons.some(w => w.id === 'seeker' || (w.id === 'rocket' && w.evo === 'b') || (w.id === 'aegis' && w.evo === 'b'))
    }[k];
    bup({ id: 'bp_' + k, kind: 'passive', passive: k, name: d.name, threat: d.threat, max: d.max || 1, desc: d.desc, punishes: d.punishes, counters: d.counters, fallback: d.fallback, req: (bb, B) => !d.fallback && (bb.passives[k] || 0) < (d.max || 1) && (!extra || extra(bb, B)), apply: bb => { bb.passives[k] = (bb.passives[k] || 0) + 1; } });
  }
  for (const k in SO.CHASSIS) { if (k === 'proto') continue; const d = SO.CHASSIS[k]; bup({ id: 'ch_' + k, kind: 'chassis', chassis: k, name: d.name, threat: 3, desc: d.desc, punishes: [], counters: [], req: () => false, apply: bb => { if (d.tier === 1) bb.chassis = k; else { bb.tier2 = k; if (d.grant && !bb.attacks[d.grant]) bb.attacks[d.grant] = {}; } } }); }

  SO.applyBossUp = function (bb, id) { const u = BBY[id]; if (!u) return; u.apply(bb); bb.counts[id] = (bb.counts[id] || 0) + 1; };
  SO.bossAttackList = function (bb) {
    const list = Object.keys(bb.attacks).filter(k => ATK[k]);
    const t2 = bb.tier2 && SO.CHASSIS[bb.tier2]; if (t2 && t2.extra && !list.includes(t2.extra)) list.push(t2.extra);
    return list;
  };
  SO.bossHp = function (round, bb, mode, finale) {
    const r = round - 1; let hp = 1050 * (1 + 0.45 * r + 0.05 * r * r);
    const ch = SO.CHASSIS[bb.chassis]; hp *= ch.hp || 1; if (bb.tier2) hp *= SO.CHASSIS[bb.tier2].hp || 1;
    hp *= Math.pow(1.22, bb.passives.heavy || 0) * Math.pow(1.12, bb.passives.escal || 0) * (bb.hpMul || 1);
    if (finale) hp *= 1.2;
    if (mode === 'practice') hp = 4000;
    return Math.round(hp);
  };
  SO.bossArmor = bb => Math.min(0.5, 0.15 * (bb.passives.armor || 0) + (SO.CHASSIS[bb.chassis].armor || 0) + (bb.tier2 ? SO.CHASSIS[bb.tier2].armor || 0 : 0));
  SO.bossSheet = function (bb, round) {
    const oc = Math.pow(0.88, bb.passives.overclock || 0) * (bb.cdMul || 1);
    return {
      'Max HP (next round)': SO.bossHp(round, bb, 'standard', false), Armor: pc(SO.bossArmor(bb)), 'Attack cooldowns': pc(oc), Attacks: SO.bossAttackList(bb).length,
      Chassis: SO.CHASSIS[bb.chassis].name + (bb.tier2 ? ' → ' + SO.CHASSIS[bb.tier2].name : ''), 'Projectile speed': pc((bb.passives.tempered ? 1.12 : 1) * Math.pow(1.04, bb.passives.escal || 0) * (bb.bspeed || 1)), 'Attack damage': pc(bb.dmgMul || 1), 'Bullet size': '+' + (bb.bsize || 0) + 'px',
      'Pattern budget': '+' + ((bb.passives.combo ? 0.4 : 0)).toFixed(1)
    };
  };
  SO.attackParams = (id, bb) => ATK[id].params((bb.attacks && bb.attacks[id]) || {}, bb);
  SO.bossUpgradeChanges = function (bb, id, round) {
    const u = BBY[id]; if (!u || (u.kind === 'mod' && !bb.attacks[u.attack])) return []; const after = SO.clone(bb); SO.applyBossUp(after, id); const out = [];
    if (u.kind === 'attack') { const sh = ATK[u.attack].show(SO.attackParams(u.attack, after)); for (const k in sh) out.push({ label: k, to: sh[k] }); out.push({ label: 'Attacks', from: SO.bossAttackList(bb).length, to: SO.bossAttackList(after).length }); return out; }
    if (u.kind === 'mod') { const s0 = ATK[u.attack].show(SO.attackParams(u.attack, bb)), s1 = ATK[u.attack].show(SO.attackParams(u.attack, after)); for (const k in s1) if (String(s0[k]) !== String(s1[k])) out.push({ label: k, from: s0[k], to: s1[k] }); return out; }
    const a = SO.bossSheet(bb, round), b = SO.bossSheet(after, round); for (const k in b) if (String(a[k]) !== String(b[k])) out.push({ label: k, from: a[k], to: b[k] });
    return out;
  };
  SO.offerBoss = function (bb, rng, n, ctx) {
    const pool = BUPS.filter(u => u.kind !== 'chassis' && !!u.orig === !!ctx.orig && (bb.counts[u.id] || 0) < u.max && u.req(bb, ctx.B));
    const byKind = k => pool.filter(u => u.kind === k);
    const picks = [];
    const take = list => { const c = list.filter(u => !picks.includes(u)); if (!c.length) return null; const u = c[Math.floor(rng() * c.length)]; picks.push(u); return u; };
    // aim for one new attack, one mod, one passive/other — then balance threat
    const order = M.shuffle(['attack', 'mod', 'passive'], rng);
    if (ctx.round <= 2) order.sort((a, b) => (a === 'attack' ? -1 : b === 'attack' ? 1 : 0));
    for (const k of order) { if (picks.length >= n) break; take(byKind(k)); }
    while (picks.length < n && picks.length < pool.length) take(pool);
    // threat balancing: replace an outlier with something closer if possible
    if (picks.length === n) {
      const avg = picks.reduce((s, u) => s + u.threat, 0) / n;
      for (let i = 0; i < n; i++) if (Math.abs(picks[i].threat - avg) > 1.2) { const alt = pool.filter(u => !picks.includes(u) && Math.abs(u.threat - avg) <= 1); if (alt.length) picks[i] = alt[Math.floor(rng() * alt.length)]; }
    }
    while (picks.length < n) picks.push(BBY.bp_escal);
    return picks.map(u => u.id);
  };
  SO.chassisOptions = function (bb, rng) {
    if (bb.chassis === 'proto') return M.shuffle(SO.CHASSIS_T1.slice(), rng).slice(0, 3).map(k => 'ch_' + k);
    if (!bb.tier2) { const opts = Object.keys(SO.CHASSIS).filter(k => SO.CHASSIS[k].base === bb.chassis); return opts.map(k => 'ch_' + k); }
    return [];
  };
  // counter-play hints vs the player's build
  SO.bossHints = function (id, B) {
    const u = BBY[id]; const tags = SO.buildTags(B); const good = [], bad = [];
    for (const w of B.weapons) { const wt = SO.WEAPONS[w.id].tags; if ((u.counters || []).some(t => wt.includes(t))) good.push(SO.WEAPONS[w.id].name); }
    for (const t of (u.counters || [])) if (['mobility', 'defense', 'crit', 'dot'].includes(t) && tags[t] >= 2 && !good.includes(t)) good.push(t + ' upgrades');
    const P2 = { close: 'close-range', melee: 'melee', bullet: 'bullet', precision: 'precision', explosive: 'explosive', homing: 'homing', drone: 'drone', beam: 'beam', mobility: 'mobility' };
    for (const t of (u.punishes || [])) if (P2[t] && tags[t] >= 2) bad.push(P2[t]);
    const generic = (u.punishes || []).filter(t => ['stationary', 'grounded', 'far'].includes(t)).map(t => ({ stationary: 'standing still', grounded: 'staying on the floor', far: 'fighting from far away' })[t]);
    return { good: good.slice(0, 3), bad, generic };
  };

  /* ---------------- attack director ---------------- */
  class Director {
    constructor(W, b) { this.W = W; this.b = b; this.active = []; this.cds = {}; this.gcd = 1.6; this.recent = []; this.moved = []; this.campT = 0; }
    budget() {
      const W = this.W, b = this.b; let v = 1.0 + 0.12 * (W.round - 1); v = Math.min(v, 2.4);
      if (b.bb.passives.combo) v += 0.4; if (b.raging) v += 0.3; v += 0.2 * b.phaseIdx; if (W.challenges.includes('rush')) v += 0.3;
      if (W.finale) v += 0.2;
      return Math.min(v, 3.2);
    }
    load() { return this.active.reduce((s, r) => s + r.def.cost, 0); }
    zoneActive() { return this.active.some(r => r.def.zone); }
    cdMul() { const b = this.b; let m = Math.pow(0.88, b.bb.passives.overclock || 0); if (b.raging) m *= 0.75; if (this.W.challenges.includes('rush')) m *= 0.8; const ch = b.chassisDef; if (ch.gcd) m *= ch.gcd; return m * (this.W.bossCdMul || 1) * (b.bb.cdMul || 1); }
    cancelAll() { for (const r of this.active) r.cancel(); this.active = []; this.b.charging = null; this.b.stompPhase = null; }
    cancelAttack(id) { for (const r of this.active) if (r.id === id) r.cancel(); this.active = this.active.filter(r => !r.done); }
    holding() { return this.active.some(r => r.hold && !r.done); }
    update(dt) {
      const W = this.W, b = this.b;
      for (const r of this.active) r.update(dt);
      for (const r of this.active) if (r.done) { if (r.onEnd) r.onEnd(); if (r.def.big && !r.cancelled && b.alive) b.recover(r.def.recovery || 1.2); }
      this.active = this.active.filter(r => !r.done);
      // player-behaviour tracking
      const P = W.player; this.moved.push([W.time, P.x, P.y]); while (this.moved.length && W.time - this.moved[0][0] > 4) this.moved.shift();
      for (const k in this.cds) this.cds[k] -= dt;
      if (b.stagger > 0 || b.recovering > 0 || b.frozen > 0 || b.intro > 0 || !b.alive || W.demoHold) return;
      this.gcd -= dt; if (this.gcd > 0) return;
      const budget = this.budget(), used = this.load();
      const list = this.forced ? [this.forced] : b.attackIds;
      const cands = list.filter(id => {
        const d = ATK[id]; if (!d) return false;
        if ((this.cds[id] || 0) > 0) return false;
        if (b.moduleOffline(id)) return false;
        if (used + d.cost > budget + 1e-6 && this.active.length) return false;
        if (this.active.some(r => r.def.solo)) return false;
        if (d.solo && this.active.length) return false;
        if (d.zone && (this.zoneActive() || W.hazardBusy())) return false;
        if (this.active.some(r => r.id === id)) return false;
        if ((d.tags || []).includes('bullets') && W.eShots.length > 150) return false;
        return true;
      });
      if (!cands.length) { this.gcd = 0.15; return; }
      const wts = cands.map(id => this.weight(id));
      let tot = wts.reduce((a, c) => a + c, 0), r = Math.random() * tot, pick = cands[0];
      for (let i = 0; i < cands.length; i++) { r -= wts[i]; if (r <= 0) { pick = cands[i]; break; } }
      this.start(pick);
    }
    weight(id) {
      const W = this.W, P = W.player, b = this.b, d = ATK[id]; let w = 1;
      const i = this.recent.lastIndexOf(id); if (i >= 0) w *= i === this.recent.length - 1 ? 0.15 : 0.45;
      const dist = M.dist(P.x, P.y, b.x, b.y);
      const far = ['sniper', 'charge', 'snare', 'turret', 'missiles', 'drones'], near = ['ring', 'orbit', 'stomp', 'spiral', 'boomer', 'charge'], camp = ['bombs', 'mortar', 'grid', 'sniper', 'mines'];
      if (dist > 520 && far.includes(id)) w *= 1.7;
      if (dist < 230 && near.includes(id)) w *= 1.6;
      if (this.moved.length > 10) { const m0 = this.moved[0]; if (M.dist(m0[1], m0[2], P.x, P.y) < 140 && W.time - m0[0] > 3) { if (camp.includes(id)) w *= 2; } }
      if (P.grounded && ['stomp', 'mortar', 'barrier'].includes(id)) w *= 1.4;
      if (P.y < A.T + 220 && ['grid', 'sweep', 'spiral'].includes(id)) w *= 1.3;
      if (b.angry > 0 && d.threat >= 3) w *= 2;
      if (id === 'spread') w *= 0.8;
      return w;
    }
    start(id) {
      const W = this.W, b = this.b, d = ATK[id];
      const p = d.params((b.bb.attacks && b.bb.attacks[id]) || {}, b.bb);
      if (b.bb.tier2 === 'siege' && ['mortar', 'flak', 'missiles'].includes(id)) { if (p.n) p.n += 1; }
      const R = new AttackRun(d, id, p); d.start(R, W, b, p);
      this.active.push(R); this.recent.push(id); if (this.recent.length > 3) this.recent.shift();
      this.cds[id] = d.cd * this.cdMul() * (W.demoMode ? 0.4 : 1);
      this.gcd = (0.55 + Math.random() * 0.5) * this.cdMul() + (d.big ? 0.4 : 0);
      if (W.demoMode) this.gcd = 0.6;
      return R;
    }
  }
  SO.Director = Director;
})();
