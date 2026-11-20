/* Square Off 2 — boss entity: chassis movement, modules, statuses, passives, and evolving artwork */
'use strict';
(function () {
  const P = SO.PAL, M = SO.M, A = SO.ARENA, art = SO.art;
  const ATK = SO.BOSS_ATTACKS;
  const MOUNTS = {
    front: [[1.02, 0.12]], shoulder: [[0.62, -1.06], [-0.62, -1.06]], top: [[0, -1.18]], bottom: [[0, 1.1]], back: [[-1.0, -0.5]],
    side: [[-1.06, 0.48], [1.06, 0.48]], eye: [[-0.66, -0.98]], ring: [[0, 0]], fins: [[-1.06, 0.82]], ram: [[1.04, 0.62]], crown: [[0.0, -1.1]],
    legs: [[0.5, 1.04]], coil: [[-1.08, -0.1]], dome: [[0.32, -1.1]], rail: [[1.06, -0.42]], wing: [[1.2, 0.0]], core: [[0, 0]]
  };
  const SPARE = [[-0.95, 0.95], [0.95, 0.95], [-0.3, -1.12], [0.85, -0.85], [-1.08, 0.2], [1.08, -0.15], [0, 1.1], [-0.9, -0.95]];

  class Boss {
    constructor(W, bb, opts = {}) {
      this.W = W; this.bb = bb; this.alive = true;
      const base = SO.CHASSIS[bb.chassis]; const t2 = bb.tier2 ? SO.CHASSIS[bb.tier2] : {};
      this.chassisDef = { ground: !!base.ground, speed: (base.speed || 1) * (t2.speed || 1), gcd: (base.gcd || 1), segments: (base.segments || 0) + (t2.segments || 0), bspeed: t2.bspeed || 1, move: base.move || null, fx: Object.assign({}, base.fx, t2.fx) };
      this.size = base.size * (1 + 0.08 * (bb.passives.heavy || 0));
      this.maxHp = opts.hp || SO.bossHp(W.round, bb, W.mode, W.finale); this.hp = this.maxHp;
      this.armor = SO.bossArmor(bb);
      this.x = (A.L + A.R) / 2 + (opts.x || 0); this.groundY = A.B - this.size / 2 - (this.chassisDef.ground ? 46 : 0);
      this.y = this.chassisDef.ground ? this.groundY : A.T + 170; this.homeY = this.y;
      this.vx = 0; this.vy = 0; this.tx = this.x; this.ty = this.y; this.retarget = 1.5;
      this.attackIds = SO.bossAttackList(bb);
      this.st = { burn: { n: 0, t: 0, mult: 1 }, bleed: { n: 0, t: 0 }, chill: { n: 0, dec: 0 }, soaked: 0, soakAmt: 0.12, magnet: 0, cracked: 0 };
      this.dotT = 0; this.exposed = 0; this.stagger = 0; this.recovering = 0; this.frozen = 0; this.intro = opts.intro == null ? 1.7 : opts.intro;
      this.phaseIdx = 0; this.phases = opts.noPhases ? [] : [0.66, 0.33]; this.angry = 0; this.raging = false;
      this.face = { look: 0, blink: 0, mood: 'idle', hurt: 0, nextBlink: 2 }; this.facing = -1; this.flip = -1;
      this.sx = 1; this.sy = 1; this.wind = {}; this.rec = {}; this.unfold = {}; this.walk = 0; this.charging = null; this.dashing = null; this.stompPhase = null;
      this.lastHitT = -9; this.dmgWindow = []; this.reactCd = 0; this.lodestone = 0; this.reelCd = 0; this.spinBoost = 0;
      this.deflT = Math.random() * 4; this.flareT = 3; this.paint = { x: 0.3, y: 0.2 }; this.paintT = 0; this.wasExposed = false;
      this.segAng = 0; this.segments = []; this.coreOpenT = 0;
      for (let i = 0; i < this.chassisDef.segments; i++) this.segments.push({ i, x: this.x, y: this.y, ids: [] });
      // mounts & modules
      this.mount = {}; const used = new Set(); let spare = 0;
      this.attackIds.forEach((id, k) => {
        if (this.segments.length && !['orbit', 'stomp', 'charge', 'carousel', 'hydra', 'sideguns', 'drip', 'dive', 'payload'].includes(id)) { this.segments[k % this.segments.length].ids.push(id); this.mount[id] = { seg: k % this.segments.length }; return; }
        const slot = (ATK[id] && ATK[id].slot) || 'front'; const opts2 = MOUNTS[slot] || [];
        let m = opts2.find(o => !used.has(o.join())); if (!m) { while (spare < SPARE.length && used.has(SPARE[spare].join())) spare++; m = SPARE[spare % SPARE.length]; spare++; }
        used.add(m.join()); this.mount[id] = { mx: m[0], my: m[1], slot };
      });
      const mhp = Math.max(80, this.maxHp * 0.07) * (bb.passives.selfrepair ? 1.5 : 1);
      this.modules = this.attackIds.filter(id => ATK[id] && ATK[id].module).map(id => ({ id, name: ATK[id].module.name, hp: mhp, maxHp: mhp, r: 16, broken: false, offT: 0, x: this.x, y: this.y, hitFlash: 0 }));
      this.plates = [];
      if (bb.passives.scrap) for (let i = 0; i < 3; i++) this.plates.push({ i, hp: 40, maxHp: 40, regrow: 0 });
      this.director = new SO.Director(W, this);
      for (const id of this.attackIds) this.unfold[id] = opts.unfolded ? 1 : 0;
      this.introUnfold = 0;
    }
    get h() { return this.size / 2; }
    get timeScale() { if (this.frozen > 0) return 0; return 1 - Math.min(0.4, this.st.chill.n * 0.045); }
    moduleOffline(id) { const m = this.modules.find(m => m.id === id); return !!(m && m.broken); }
    windup(id, dur) { this.wind[id] = dur; this.wind[id + '_max'] = dur; }
    recoil(id) { this.rec[id] = 1; this.sx = 1.06; this.sy = 0.95; }
    mountPos(id) {
      const mt = this.mount[id];
      if (!mt) return { x: this.x, y: this.y, a: 0 };
      if (mt.seg != null) { const s = this.segments[mt.seg]; const L = s.lunge || s; return { x: L.x, y: L.y, a: M.ang(this.x, this.y, s.x, s.y) }; }
      return { x: this.x + mt.mx * this.h * this.facing * this.sx, y: this.y + mt.my * this.h * this.sy };
    }
    muzzle(id) { return this.mountPos(id); }
    recover(t) { this.recovering = Math.max(this.recovering, t); this.exposed = Math.max(this.exposed, t); }
    stun(t) { if (this.bnc) this.bnc.boost = 1; this.stagger = Math.max(this.stagger, t); this.exposed = Math.max(this.exposed, t + 0.4); this.W.sfx('stagger'); }
    freeze(t) { this.frozen = Math.max(this.frozen, t); this.exposed = Math.max(this.exposed, t); this.W.word('FREEZE!', this.x, this.y - this.size, 'cold'); }
    dashTo(a, speed, cb) { this.dashing = { a, speed, cb, t: 0 }; if (this.chassisDef.ground) this.dashing.a = Math.cos(a) >= 0 ? 0 : Math.PI; }
    hitbox() { return { x: this.x, y: this.y, hw: this.h, hh: this.h }; }
    // damage entry (already multiplied); returns true if died
    takeDamage(dmg, info = {}) {
      if (!this.alive || this.intro > 0) return false;
      this.hp -= dmg; this.lastHitT = this.W.time; this.face.hurt = 0.18;
      this.dmgWindow.push([this.W.time, dmg]);
      if (this.hp <= 0) { this.hp = 0; this.alive = false; this.director.cancelAll(); this.W.onBossDefeated(); return true; }
      const frac = this.hp / this.maxHp;
      while (this.phaseIdx < this.phases.length && frac <= this.phases[this.phaseIdx]) {
        this.phaseIdx++; this.director.cancelAll(); this.dashing = null; this.stun(1.6); this.exposed = 2.4;
        this.W.word('GEAR SHIFT!', this.x, this.y - this.size, 'boss'); this.W.shake(8); this.W.flash(0.25);
        if (this.W.build.f.salvage) this.W.player.heal(5);
        this.W.events.push({ type: 'phase', idx: this.phaseIdx });
      }
      return false;
    }
    update(dt) {
      const W = this.W, bb = this.bb;
      if (!this.alive) return;
      // timers
      for (const k in this.wind) if (!k.endsWith('_max')) this.wind[k] = Math.max(0, this.wind[k] - dt);
      for (const k in this.rec) this.rec[k] = Math.max(0, this.rec[k] - dt * 4);
      if (this.intro > 0) { this.intro -= dt; this.introUnfold += dt; this.attackIds.forEach((id, i) => { this.unfold[id] = M.clamp((this.introUnfold - 0.35 - i * 0.12) / 0.45, 0, 1); }); }
      else for (const id of this.attackIds) this.unfold[id] = 1;
      this.stagger = Math.max(0, this.stagger - dt); this.recovering = Math.max(0, this.recovering - dt); this.frozen = Math.max(0, this.frozen - dt);
      const wasExp = this.exposed > 0; this.exposed = Math.max(0, this.exposed - dt);
      if (wasExp && this.exposed <= 0 && bb.passives.vengeful && this.alive) { const g = Math.floor(Math.random() * 12); for (let k = 0; k < 12; k++) if (k !== g && k !== (g + 1) % 12) W.eBullet(this.x, this.y, k / 12 * Math.PI * 2, 200, { src: 'vengeful' }); }
      this.angry = Math.max(0, this.angry - dt); this.reactCd = Math.max(0, this.reactCd - dt); this.reelCd = Math.max(0, this.reelCd - dt);
      this.raging = !!bb.passives.rage && this.hp < this.maxHp * 0.4;
      this.lodestone = Math.max(0, this.lodestone - dt);
      // statuses
      this.statusUpdate(dt);
      // passives
      if (bb.passives.regen && W.time - this.lastHitT > 3 && this.hp > 0) { const cap = this.maxHp * (this.phaseIdx === 0 ? 1 : this.phases[this.phaseIdx - 1]); this.hp = Math.min(cap, this.hp + this.maxHp * 0.012 * dt); }
      if (bb.passives.reactive) { while (this.dmgWindow.length && W.time - this.dmgWindow[0][0] > 3) this.dmgWindow.shift(); const sum = this.dmgWindow.reduce((s, d) => s + d[1], 0); if (sum >= this.maxHp * 0.06 && this.reactCd <= 0) { this.reactCd = 3; this.dmgWindow = []; for (let k = 0; k < 8; k++) W.eBullet(this.x, this.y, k / 8 * Math.PI * 2 + 0.2, 160, { src: 'reactive' }); W.word('ZAP-BACK!', this.x, this.y - this.size, 'boss'); } }
      else while (this.dmgWindow.length > 30) this.dmgWindow.shift();
      if (bb.passives.deflector) this.deflT += dt;
      if (bb.passives.flares) { this.flareT -= dt; if (this.flareT <= 0) { this.flareT = 5; W.spawnFlares(this); } }
      for (const p of this.plates) { if (p.hp <= 0) { p.regrow -= dt; if (p.regrow <= 0) p.hp = p.maxHp; } }
      if (W.build.f.paint) { this.paintT -= dt; if (this.paintT <= 0) { this.paintT = 4; this.paint = { x: M.rand(-0.7, 0.7), y: M.rand(-0.7, 0.7) }; } }
      // modules
      for (const m of this.modules) { m.hitFlash = Math.max(0, m.hitFlash - dt); if (m.broken) { m.offT -= dt; if (m.offT <= 0) { m.broken = false; m.hp = m.maxHp; W.word('ONLINE', m.x, m.y - 20, 'small'); } } }
      // movement
      this.moveUpdate(dt * (this.frozen > 0 ? 0 : 1));
      // segments
      if (this.segments.length) {
        this.coreOpenT += dt;
        const open = (this.coreOpenT % 10) > 8; if (open && this.intro <= 0 && this.alive && this.exposed < 0.1 && (this.coreOpenT % 10) < 8.05) { this.exposed = 2; W.word('CORE OPEN!', this.x, this.y - this.size, 'good'); }
        this.segAng += dt * (0.6 + (this.spinBoost ? 3 : 0)) * this.timeScale;
        const rad = this.size * (open ? 1.45 : 1.05);
        this.segRad = M.lerp(this.segRad || rad, rad, Math.min(1, dt * 5));
        this.segments.forEach((s, i) => { const a = this.segAng + i / this.segments.length * Math.PI * 2; s.x = this.x + Math.cos(a) * this.segRad; s.y = this.y + Math.sin(a) * this.segRad; });
      }
      for (const m of this.modules) { const p = this.mountPos(m.id); m.x = p.x; m.y = p.y; }
      // face
      const tp = W.targetPos(); this.face.look = M.ang(this.x, this.y, tp.x, tp.y);
      const nf = tp.x >= this.x ? 1 : -1; if (!this.dashing) this.facing = nf;
      this.flip = M.approach(this.flip, this.facing, dt * 8);
      this.face.hurt = Math.max(0, this.face.hurt - dt);
      this.face.nextBlink -= dt; if (this.face.nextBlink <= 0) { this.face.blink = 0.12; this.face.nextBlink = M.rand(1.5, 4); } this.face.blink = Math.max(0, this.face.blink - dt);
      this.sx = M.lerp(this.sx, 1, Math.min(1, dt * 10)); this.sy = M.lerp(this.sy, 1, Math.min(1, dt * 10));
      // director (attack timing slowed by chill/freeze and by player time effects)
      if (this.intro <= 0) this.director.update(dt * this.timeScale * W.enemyScale);
    }
    statusUpdate(dt) {
      const W = this.W, s = this.st, B = W.build;
      if (s.burn.n > 0) { s.burn.t -= dt; if (s.burn.t <= 0) s.burn.n = 0; }
      if (s.bleed.n > 0) { s.bleed.t -= dt; if (s.bleed.t <= 0) s.bleed.n = 0; }
      if (s.chill.n > 0) { s.chill.dec += dt; if (s.chill.dec > 0.9) { s.chill.dec = 0; s.chill.n--; } }
      s.soaked = Math.max(0, s.soaked - dt); s.magnet = Math.max(0, s.magnet - dt); s.cracked = Math.max(0, s.cracked - dt);
      this.dotT += dt;
      if (this.dotT >= 0.25) {
        this.dotT -= 0.25;
        if (s.burn.n > 0) W.dotHit(s.burn.n * 4 * s.burn.mult * 0.25, 'burn');
        if (s.bleed.n > 0) W.dotHit(s.bleed.n * 1.5 * 0.25, 'bleed');
      }
    }
    moveUpdate(dt) {
      const W = this.W, ch = this.chassisDef; const h = this.h;
      const spd = 170 * ch.speed * (this.bb.passives.thrusters ? 1.35 : 1) * this.timeScale;
      if (this.intro > 0) { const k = M.clamp(1 - this.intro / 1.7, 0, 1); this.y = M.lerp(A.T - 160, this.homeY, M.easeOutBack(Math.min(1, k * 1.4))); return; }
      if (this.dashing) {
        const d = this.dashing; d.t += dt; const ds = d.speed * dt;
        this.x += Math.cos(d.a) * ds; this.y += Math.sin(d.a) * ds; this.sx = 1.12; this.sy = 0.9;
        const hitWall = this.x - h <= A.L || this.x + h >= A.R || this.y - h <= A.T || this.y + h >= A.B - (ch.ground ? 46 : 0);
        this.clampToArena();
        if (this.charging === 'go') W.hitPlayerRect(this.x, this.y, h, h, 22, 'charge');
        if (hitWall || d.t > 2.4) { this.dashing = null; this.sx = 0.8; this.sy = 1.18; if (d.cb) d.cb(); }
        return;
      }
      if (this.stompPhase) {
        const floor = A.B - h;
        if (this.stompPhase === 'rise') { this.y = M.lerp(this.y, Math.max(A.T + h, this.homeY - (ch.ground ? 60 : 30)), Math.min(1, dt * 6)); this.sy = 1.08; }
        else if (this.stompPhase === 'drop' || this.stompPhase === 'impact') { this.y = Math.min(floor, this.y + 1600 * dt); if (this.y >= floor) { this.sx = 1.25; this.sy = 0.78; } }
        else if (this.stompPhase === 'recover') this.y = M.lerp(this.y, this.homeY, Math.min(1, dt * 3));
        return;
      }
      if (this.stagger > 0 || this.frozen > 0) { this.vx *= 1 - Math.min(1, dt * 4); if (!ch.ground) this.vy = M.lerp(this.vy, 30, Math.min(1, dt * 3)); this.x += this.vx * dt; this.y += this.vy * dt; this.clampToArena(); return; }
      if (ch.move === 'orbit' || ch.move === 'swing') { this.moveCustom(dt, spd); return; }
      if (this.director.holding()) { this.vx *= 1 - Math.min(1, dt * 5); this.vy *= 1 - Math.min(1, dt * 5); this.x += this.vx * dt; this.y += this.vy * dt; this.clampToArena(); return; }
      if (ch.move) { this.moveCustom(dt, spd); return; }
      this.retarget -= dt;
      if (this.retarget <= 0) {
        const thr = this.bb.passives.thrusters ? 0.7 : 1; const tp = W.targetPos();
        if (ch.ground) { this.tx = M.clamp(tp.x + M.rand(-380, 380), A.L + h + 20, A.R - h - 20); this.ty = this.groundY; this.retarget = M.rand(2, 3.5) * thr; }
        else if (ch.speed > 1.3) { this.tx = M.rand(A.L + h + 30, A.R - h - 30); this.ty = M.rand(A.T + h + 30, A.T + 270); this.retarget = M.rand(1.1, 2.0) * thr; }
        else { this.tx = M.rand(A.L + h + 60, A.R - h - 60); this.ty = M.rand(A.T + h + 40, A.T + (this.segments.length ? 300 : 280)); this.retarget = M.rand(2, 3.4) * thr; }
        // don't park right on top of the player
        if (Math.abs(this.tx - tp.x) < 90 && Math.abs(this.ty - tp.y) < 140) this.tx += (this.tx < (A.L + A.R) / 2 ? 1 : -1) * 220;
        this.homeY = this.ty;
      }
      const ax = M.clamp((this.tx - this.x) * 6 - this.vx * 3.2, -900, 900), ay = ch.ground ? 0 : M.clamp((this.ty - this.y) * 6 - this.vy * 3.2, -900, 900);
      this.vx = M.clamp(this.vx + ax * dt, -spd, spd); this.vy = ch.ground ? 0 : M.clamp(this.vy + ay * dt, -spd, spd);
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (ch.ground) { this.y = this.groundY; this.walk += Math.abs(this.vx) * dt; }
      else this.y += Math.sin(W.time * 2.2) * 6 * dt * 4;
      this.clampToArena();
    }
    /* ---- movement for the newer chassis (each one gets its own way of getting around) ---- */
    moveCustom(dt, spd) {
      const W = this.W, ch = this.chassisDef, fx = ch.fx, h = this.h, tp = W.targetPos();
      const L = A.L + h, R = A.R - h, T = A.T + h, B = A.B - h;
      const ease = k => Math.min(1, dt * k), thr = this.bb.passives.thrusters ? 0.7 : 1, live = this.intro <= 0 && this.alive;
      const ox = this.x, oy = this.y, track = () => { this.vx = (this.x - ox) / Math.max(dt, 1e-4); this.vy = (this.y - oy) / Math.max(dt, 1e-4); };
      switch (ch.move) {
        case 'crawl': {
          // a U-shaped track: up the left wall, across the ceiling, down the right wall
          const gap = 26, cl = L + gap, cr = R - gap, ct = T + gap;
          const low = A.B - h - 130, l1 = Math.max(10, low - ct), l2 = cr - cl, tot = l1 * 2 + l2;
          const at = s => { s = M.clamp(s, 0, tot); if (s < l1) return { x: cl, y: low - s, wall: 'L' }; if (s < l1 + l2) return { x: cl + (s - l1), y: ct, wall: 'T' }; return { x: cr, y: ct + (s - l1 - l2), wall: 'R' }; };
          if (this.crawlS == null) { this.crawlS = l1 + M.clamp(this.x - cl, 0, l2); this.crawlT = this.crawlS; this.retarget = 0.4; }
          this.retarget -= dt;
          if (this.retarget <= 0) {
            this.crawlT = Math.random() < 0.55 ? l1 + M.clamp(tp.x - cl + M.rand(-240, 240), 0, l2) : (tp.x < (A.L + A.R) / 2 ? M.rand(0, l1) : l1 + l2 + M.rand(0, l1));
            this.retarget = M.rand(1.6, 3) * (fx.scuttle ? 0.55 : 1) * thr;
          }
          this.crawlS = M.approach(this.crawlS, this.crawlT, spd * 1.15 * dt);
          const p = at(this.crawlS); this.wall = p.wall; this.wallAway = p.wall === 'L' ? 0 : p.wall === 'R' ? Math.PI : Math.PI / 2;
          this.x = M.lerp(this.x, p.x, ease(10)); this.y = M.lerp(this.y, p.y, ease(10)); track();
          this.walk += Math.hypot(this.x - ox, this.y - oy);
          break;
        }
        case 'hop': {
          const floor = B - 28;
          if (this.hopVy == null) { this.hopVy = 0; this.hopWait = 0.5; this.air = true; }
          if (!this.air && this.y < floor - 30) { this.air = true; this.hopVy = 0; }
          if (this.air) {
            this.hopVy += 1500 * dt; this.x += this.vx * dt; this.y += this.hopVy * dt;
            if ((this.x <= L && this.vx < 0) || (this.x >= R && this.vx > 0)) this.vx = -this.vx * 0.8;
            if (this.y < T) { this.y = T; this.hopVy = Math.abs(this.hopVy) * 0.3; }
            if (fx.doubleHop && this.canDouble && this.hopVy > 60) { this.canDouble = false; this.hopVy = -560; this.vx = (tp.x > this.x ? 1 : -1) * M.rand(160, 280) * (spd / 170); this.sx = 0.85; this.sy = 1.2; W.fxPuff(this.x, this.y + h + 20, 14, P.paperDeep); }
            if (this.y >= floor) { this.y = floor; this.air = false; this.hopVy = 0; this.vx = 0; this.hopWait = M.rand(0.45, 0.95) * thr; this.hopLand(); }
          } else {
            this.y = M.lerp(this.y, floor, ease(12)); this.vx = 0; this.vy = 0; this.hopWait -= dt;
            this.coil = M.clamp(1 - this.hopWait * 2, 0, 1);
            if (this.hopWait <= 0) {
              const tx = M.clamp(tp.x + M.rand(-320, 320), L + 20, R - 20), vy = fx.doubleHop ? -900 : -780, flight = 2 * -vy / 1500;
              this.vx = M.clamp((tx - this.x) / flight, -spd * 2.4, spd * 2.4); this.hopVy = vy; this.air = true; this.canDouble = !!fx.doubleHop; this.coil = 0; this.sx = 0.82; this.sy = 1.22;
            }
          }
          break;
        }
        case 'phase': {
          if (this.phaseT == null) { this.phaseT = 1.6; this.tele = null; }
          this.y += Math.sin(W.time * 2.2) * 6 * dt * 4; this.vx = 0; this.vy = 0;
          if (this.tele) {
            this.tele.t -= dt; this.teleFade = M.clamp(this.tele.t / this.tele.dur, 0, 1);
            if (this.tele.t <= 0) {
              const px = this.x, py = this.y; this.x = this.tele.x; this.y = this.tele.y; this.tele = null; this.teleFade = null; this.sx = 0.6; this.sy = 1.4;
              W.sfx('zap'); for (let i = 0; i < 5; i++) { W.fxPuff(px + M.rand(-h, h), py + M.rand(-h, h), 14, P.violet); W.fxPuff(this.x + M.rand(-h, h), this.y + M.rand(-h, h), 12, P.violet); }
              if (fx.echoBurst && live) for (let k = 0; k < 10; k++) W.eBullet(px, py, k / 10 * Math.PI * 2 + 0.15, 165, { src: 'bossphase', r: 6 });
              this.phaseT = M.rand(2.4, 3.8) * (fx.blink ? 0.5 : 1) * thr;
            }
          } else {
            this.phaseT -= dt;
            if (this.phaseT <= 0 && live) {
              let x = 0, y = 0;
              for (let i = 0; i < 8; i++) { x = M.rand(L + 30, R - 30); y = M.rand(T + 20, A.T + 300); if (M.dist(x, y, tp.x, tp.y) > 260 && Math.abs(x - this.x) > 200) break; }
              const dur = fx.blink ? 0.42 : 0.65; this.tele = { x, y, t: dur, dur };
            }
          }
          break;
        }
        case 'orbit': {
          const cx = (A.L + A.R) / 2, cy = A.T + (A.B - A.T) * 0.4, rx = (A.R - A.L) / 2 - h - 40, ry = Math.max(80, (A.B - A.T) * 0.4 - h - 20);
          if (this.orbA == null) { this.orbA = Math.atan2((this.y - cy) / ry, (this.x - cx) / rx); this.orbDir = 1; this.orbRevT = M.rand(3, 6); }
          this.orbA += spd / Math.max(rx, ry) * 1.15 * dt * this.orbDir * (this.director.holding() ? 0.5 : 1);
          if (fx.comet && live) {
            this.orbRevT -= dt; if (this.orbRevT <= 0) { this.orbDir *= -1; this.orbRevT = M.rand(2.5, 5); this.sx = 1.2; this.sy = 0.85; }
            this.trailT = (this.trailT || 0) - dt; if (this.trailT <= 0) { this.trailT = 0.42; W.eBullet(this.x, this.y, this.orbA, 55, { src: 'bosscomet', r: 6.5 }); }
          }
          this.x = M.lerp(this.x, cx + Math.cos(this.orbA) * rx, ease(5)); this.y = M.lerp(this.y, cy + Math.sin(this.orbA) * ry, ease(5)); track();
          break;
        }
        case 'swing': {
          if (this.pivX == null) { this.pivX = this.x; this.swT = 0; }
          const len = Math.min((A.B - A.T) * 0.56, 360), amp = fx.wreck ? 1.0 : 0.72, per = fx.wreck ? 2.5 : 3.2;
          this.swT += dt * (this.director.holding() ? 0.6 : 1) * (spd / 170);
          const w = this.swT * Math.PI * 2 / per, th = amp * Math.sin(w);
          this.pivX = M.approach(this.pivX, M.clamp(tp.x, A.L + 240, A.R - 240), 60 * dt);
          this.x = M.lerp(this.x, this.pivX + Math.sin(th) * len, ease(8)); this.y = M.lerp(this.y, A.T + Math.cos(th) * len, ease(8)); track();
          const pk = Math.cos(w) >= 0 ? 1 : -1;
          if (fx.chime && live && this.lastPk != null && pk !== this.lastPk) { const a0 = M.ang(this.x, this.y, tp.x, tp.y); for (let i = 0; i < 5; i++) W.eBullet(this.x, this.y + h * 0.8, a0 + (i - 2) * 0.22, 230, { src: 'bosschime', r: 6 }); this.sx = 1.15; this.sy = 0.9; W.sfx('eshot'); }
          this.lastPk = pk;
          if (fx.wreck && live && Math.hypot(this.vx, this.vy) > 300) W.hitPlayerRect(this.x, this.y, h, h, 16, 'bosswreck');
          break;
        }
        case 'stalk': {
          const k = fx.tight ? 3.4 : 1.7, cap = spd * (fx.tight ? 1.8 : 1.4);
          const tx = M.clamp(tp.x + Math.sin(W.time * 0.9) * 70, L, R), ty = T + 72 + Math.sin(W.time * 1.7) * 14;
          const ax = M.clamp((tx - this.x) * k * 3 - this.vx * 2.6, -1500, 1500), ay = M.clamp((ty - this.y) * 6 - this.vy * 3.2, -900, 900);
          this.vx = M.clamp(this.vx + ax * dt, -cap, cap); this.vy = M.clamp(this.vy + ay * dt, -cap, cap);
          this.x += this.vx * dt; this.y += this.vy * dt;
          break;
        }
        case 'bounce': {
          if (!this.bnc) { const a = M.rand(0.45, 1.05) * (Math.random() < 0.5 ? 1 : -1); this.bnc = { a: Math.random() < 0.5 ? a : Math.PI - a, boost: 1 }; }
          const b = this.bnc, v = spd * 1.15 * b.boost, bottom = A.B - h - 90;
          this.vx = Math.cos(b.a) * v; this.vy = Math.sin(b.a) * v; this.x += this.vx * dt; this.y += this.vy * dt;
          let hit = null;
          if (this.x <= L && this.vx < 0) { this.x = L; b.a = Math.PI - b.a; hit = 0; } else if (this.x >= R && this.vx > 0) { this.x = R; b.a = Math.PI - b.a; hit = Math.PI; }
          if (this.y <= T && this.vy < 0) { this.y = T; b.a = -b.a; hit = Math.PI / 2; } else if (this.y >= bottom && this.vy > 0) { this.y = bottom; b.a = -b.a; hit = -Math.PI / 2; }
          if (hit != null) {
            this.sx = 1.2; this.sy = 0.82; W.fxSpark(this.x - Math.cos(hit) * h, this.y - Math.sin(hit) * h, P.warn, 4);
            if (fx.accel) b.boost = Math.min(1.7, b.boost + 0.1);
            if (fx.bounceBurst && live) { for (let i = 0; i < 5; i++) W.eBullet(this.x, this.y, hit + (i - 2) * 0.32, 205, { src: 'bossshrapnel', r: 5.5 }); W.sfx('eshot'); }
          }
          break;
        }
      }
      this.clampToArena();
    }
    hopLand() {
      const W = this.W, fx = this.chassisDef.fx; this.sx = 1.3; this.sy = 0.74;
      W.shake(fx.quake ? 9 : 4); W.sfx(fx.quake ? 'boom' : 'smallboom');
      for (let i = 0; i < 4; i++) W.fxPuff(this.x + M.rand(-this.h, this.h), A.B - 8, 14, P.paperDeep);
      if (this.intro > 0 || !this.alive) return;
      for (const s of [-1, 1]) {
        W.eBullet(this.x + s * this.h, A.B - 16, s > 0 ? 0 : Math.PI, 250, { src: 'bossquake', r: 7.5 });
        if (fx.quake) { W.eBullet(this.x + s * this.h, A.B - 18, s > 0 ? -0.28 : Math.PI + 0.28, 220, { src: 'bossquake', r: 7.5 }); W.eBullet(this.x + s * this.h, A.B - 18, s > 0 ? -0.6 : Math.PI + 0.6, 200, { src: 'bossquake', r: 7.5 }); }
      }
      if (fx.quake) W.word('QUAKE!', this.x, this.y - this.size, 'boss');
    }
    clampToArena() { const h = this.h; this.x = M.clamp(this.x, A.L + h, A.R - h); this.y = M.clamp(this.y, A.T + h, A.B - h - (this.chassisDef.ground && !this.stompPhase ? 46 : 0)); }

    /* ---------------- drawing ---------------- */
    draw(ctx) {
      const W = this.W, t = W.time, h = this.h, S = this.size;
      const floorY = A.B;
      // floor shadow
      const sh = M.clamp(1 - (floorY - (this.y + h)) / 500, 0.25, 1);
      art.floorShadow(ctx, this.x, floorY - 3, h * 1.3 * sh, 9 * sh, 0.5);
      // telegraph for charge lane is drawn elsewhere; charging outline here
      if (this.tele) { const k = 1 - this.tele.t / this.tele.dur; ctx.save(); ctx.translate(this.tele.x, this.tele.y); ctx.rotate(t * 3); ctx.globalAlpha = 0.45 + 0.45 * k; ctx.setLineDash([10, 8]); ctx.lineWidth = 4; ctx.strokeStyle = P.violet; const s = h * (1.6 - 0.6 * k); art.rr(ctx, -s, -s, s * 2, s * 2, 12); ctx.stroke(); ctx.restore(); }
      if (this.diveAim != null && this.charging === 'warn') { ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 30); ctx.strokeStyle = P.warn; ctx.lineWidth = 6; ctx.setLineDash([16, 10]); ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(this.diveAim) * 900, this.y + Math.sin(this.diveAim) * 900); ctx.stroke(); ctx.restore(); }
      if (this.chassisDef.move === 'swing' && this.pivX != null) { ctx.save(); ctx.strokeStyle = P.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(this.pivX, A.T); ctx.lineTo(this.x, this.y - h); ctx.stroke(); ctx.strokeStyle = P.paperDeep; ctx.lineWidth = 3; ctx.setLineDash([9, 5]); ctx.stroke(); ctx.restore(); art.inkRect(ctx, this.pivX - 22, A.T - 4, 44, 14, 4, P.blueMid, 3); }
      ctx.save(); ctx.translate(this.x, this.y);
      if (this.teleFade != null) ctx.globalAlpha = 0.2 + 0.8 * this.teleFade;
      const dead = !this.alive;
      // segments ring
      if (this.segments.length) { ctx.save(); ctx.setLineDash([6, 8]); ctx.lineWidth = 3; ctx.strokeStyle = P.blueMid; art.circ(ctx, 0, 0, this.segRad || S); ctx.stroke(); ctx.restore(); }
      ctx.scale(this.sx, this.sy);
      const fl = this.flip; // -1..1 horizontal facing (for mounts we use facing sign)
      // back attachments
      for (const id of this.attackIds) { const mt = this.mount[id]; if (!mt || mt.seg != null) continue; if (mt.slot === 'back' || mt.slot === 'ring') this.drawAttach(ctx, id, mt, t); }
      // chassis under-parts
      this.drawChassis(ctx, t);
      // body
      const hot = this.charging || (this.stompPhase && this.stompPhase !== 'recover');
      const bodyCol = this.frozen > 0 ? '#bfe9ff' : (this.face.hurt > 0.1 ? P.coralLight : P.coral);
      art.ink(ctx, () => art.rr(ctx, -h, -h, S, S, 12), bodyCol, 4, P.blueMid);
      ctx.save(); art.rr(ctx, -h, -h, S, S, 12); ctx.clip();
      ctx.beginPath(); ctx.moveTo(-h, h * 0.2); ctx.lineTo(h, -h * 0.35); ctx.lineTo(h, h); ctx.lineTo(-h, h); ctx.closePath(); art.shade(ctx, 0.35, P.coralDark, 5, 1.6);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-h + 8, -h + 6, S * 0.5, 4);
      if (hot) { ctx.globalAlpha = 0.55 + 0.3 * Math.sin(t * 30); ctx.fillStyle = art.stripes(ctx); ctx.fillRect(-h, h * 0.45, S, h * 0.55); ctx.globalAlpha = 1; }
      ctx.restore();
      if (hot) { ctx.lineWidth = 5; ctx.strokeStyle = P.warn; art.rr(ctx, -h - 5, -h - 5, S + 10, S + 10, 15); ctx.stroke(); }
      // armor panels / heavy bolts
      const armorLv = (this.bb.passives.armor || 0) + (this.chassisDef.ground ? 1 : 0);
      if (armorLv) { for (let i = 0; i < armorLv; i++) { const yy = -h + 10 + i * 14; art.inkRect(ctx, -h - 6, yy + h * 0.6, 12, h * 0.55, 3, P.blueLight, 2.5); art.inkRect(ctx, h - 6, yy + h * 0.6, 12, h * 0.55, 3, P.blueLight, 2.5); } }
      ctx.fillStyle = P.ink; const bolts = 4 + 2 * (this.bb.passives.heavy || 0);
      for (let i = 0; i < bolts; i++) { const a = i / bolts * Math.PI * 2 + 0.4; art.circ(ctx, Math.cos(a) * (h - 7) * 1.0, Math.sin(a) * (h - 7) * 1.0, 2.4); ctx.fill(); }
      // passive decorations
      this.drawPassives(ctx, t);
      // face
      this.drawFace(ctx, t);
      // exposed core hatch
      if (this.exposed > 0 || (this.segments.length && this.exposed > 0)) {
        const k = Math.min(1, this.exposed * 4);
        art.inkRect(ctx, -h * 0.42, h * 0.18, h * 0.84, h * 0.62, 6, P.blueDeep, 3);
        ctx.save(); ctx.globalAlpha = k; art.inkCirc(ctx, 0, h * 0.49, h * 0.22 * (1 + 0.08 * Math.sin(t * 14)), P.cream, 3); art.inkCirc(ctx, 0, h * 0.49, h * 0.1, P.teal, 2);
        ctx.restore();
        ctx.save(); ctx.translate(0, -h - 34 + Math.sin(t * 9) * 4); art.burst(ctx, 0, 0, 22, 8, P.teal, t, 3); art.text(ctx, 'HIT!', 0, 1, 15, P.ink, 'center', 0); ctx.restore();
      } else {
        art.inkRect(ctx, -h * 0.42, h * 0.18, h * 0.84, h * 0.62, 6, P.coralDark, 3);
        ctx.strokeStyle = P.ink; ctx.lineWidth = 2; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-h * 0.34, h * 0.18 + i * h * 0.155); ctx.lineTo(h * 0.34, h * 0.18 + i * h * 0.155); ctx.stroke(); }
      }
      // front attachments
      for (const id of this.attackIds) { const mt = this.mount[id]; if (!mt || mt.seg != null) continue; if (mt.slot !== 'back' && mt.slot !== 'ring') this.drawAttach(ctx, id, mt, t); }
      // statuses
      this.drawStatus(ctx, t);
      ctx.restore();
      // segments with their attachments
      for (const s of this.segments) {
        const L = s.lunge || s;
        ctx.save(); ctx.translate(L.x, L.y);
        if (s.lunge) { ctx.save(); ctx.strokeStyle = P.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s.x - L.x, s.y - L.y); ctx.lineTo(0, 0); ctx.stroke(); ctx.restore(); }
        const ss = S * 0.36; const hot2 = !!s.lunge;
        art.inkRect(ctx, -ss, -ss, ss * 2, ss * 2, 6, hot2 ? P.warn : P.blueLight, 3, P.coral);
        ctx.save(); art.rr(ctx, -ss, -ss, ss * 2, ss * 2, 6); ctx.clip(); ctx.beginPath(); ctx.rect(-ss, 0, ss * 2, ss); art.shade(ctx, 0.3, P.blueDeep); ctx.restore();
        s.ids.forEach((id, j) => { const a = M.ang(this.x, this.y, s.x, s.y); ctx.save(); ctx.rotate(a); ctx.translate(ss * 0.4, (j - (s.ids.length - 1) / 2) * ss * 0.8); this.drawAttachGfx(ctx, id, ss / 30, t, true); ctx.restore(); });
        ctx.restore();
      }
      // modules (HP pips + broken state)
      for (const m of this.modules) {
        if (m.broken) { ctx.save(); ctx.globalAlpha = 0.85; art.inkCirc(ctx, m.x, m.y, 12, P.inkSoft, 2); W.fxSmokeAt(m.x, m.y); art.text(ctx, Math.ceil(m.offT) + 's', m.x, m.y - 22, 13, P.cream, 'center', 3); ctx.restore(); }
        else if (m.hp < m.maxHp || this.W.showModules) { SO.drawHpPips(ctx, m.x, m.y - 24, m.hp / m.maxHp, 30); }
        if (m.hitFlash > 0) { ctx.save(); ctx.globalAlpha = m.hitFlash * 4; ctx.strokeStyle = P.white; ctx.lineWidth = 3; art.circ(ctx, m.x, m.y, m.r + 3); ctx.stroke(); ctx.restore(); }
      }
      // deflector bubble
      const dp = this.deflectPhase();
      if (dp) { ctx.save(); const R = this.size * 0.95 + 18; ctx.globalAlpha = dp === 'warn' ? 0.35 + 0.3 * Math.sin(t * 40) : 0.32; ctx.fillStyle = P.blueLight; art.circ(ctx, this.x, this.y, R); ctx.fill(); ctx.globalAlpha = dp === 'warn' ? 0.8 : 0.9; ctx.setLineDash(dp === 'warn' ? [8, 6] : []); ctx.lineWidth = 3; ctx.strokeStyle = dp === 'warn' ? P.warn : P.white; ctx.stroke(); ctx.restore(); }
      // scrap plates
      this.platePositions().forEach(p => { if (p.hp <= 0) return; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); art.inkRect(ctx, -14, -9, 28, 18, 3, P.paperDeep, 2.5); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(6, 3); ctx.stroke(); ctx.restore(); SO.drawHpPips(ctx, p.x, p.y - 16, p.hp / p.maxHp, 22); });
      // target painter
      if (this.W.build.f.paint && this.alive) { const px = this.x + this.paint.x * h, py = this.y + this.paint.y * h; ctx.save(); ctx.strokeStyle = P.warn; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px - 9, py - 9); ctx.lineTo(px + 9, py + 9); ctx.moveTo(px + 9, py - 9); ctx.lineTo(px - 9, py + 9); ctx.stroke(); ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
    }
    deflectPhase() { if (!this.bb.passives.deflector || this.exposed > 0 || !this.alive) return null; const c = this.deflT % 9; if (c < 0.6) return 'warn'; if (c < 2.2) return 'on'; return null; }
    platePositions() { const out = []; this.plates.forEach((p, i) => { const a = this.W.time * 1.1 + i / 3 * Math.PI * 2; p.x = this.x + Math.cos(a) * (this.size * 0.85 + 26); p.y = this.y + Math.sin(a) * (this.size * 0.85 + 26); p.a = a + Math.PI / 2; out.push(p); }); return out; }
    drawChassis(ctx, t) {
      const h = this.h, ch = this.bb.chassis, t2 = this.bb.tier2;
      if (ch === 'walker') {
        const ph = this.walk * 0.05;
        for (const s of [-1, 1]) {
          const lift = Math.max(0, Math.sin(ph + (s > 0 ? Math.PI : 0))) * 10;
          ctx.save(); ctx.translate(s * h * 0.55, h - 4);
          art.inkRect(ctx, -9, 0, 18, 30 - lift * 0.4, 4, P.blue, 3);
          art.inkRect(ctx, -16 + s * 4, 26 - lift, 32, 14, 5, P.blueMid, 3, P.coral);
          art.inkCirc(ctx, 0, 2, 7, P.paperDeep, 2.5);
          ctx.restore();
        }
        if (t2 === 'siege') { art.inkRect(ctx, -h * 0.3, -h - 26, h * 0.6, 24, 4, P.blueMid, 3); art.inkRect(ctx, -6, -h - 46, 12, 22, 3, P.blue, 3); }
        if (t2 === 'jugg') { art.ink(ctx, () => art.poly(ctx, [h * this.facing, -h * 0.6, (h + 26) * this.facing, 0, h * this.facing, h * 0.6]), P.paperDeep, 3); }
      } else if (ch === 'hover') {
        for (const s of [-1, 1]) {
          ctx.save(); ctx.translate(s * (h + 16), 2); ctx.rotate(s * 0.08 + this.vx * 0.0006);
          art.inkRect(ctx, -22, -9, 44, 18, 6, P.blueLight, 3, P.coral);
          ctx.fillStyle = P.ink; ctx.save(); ctx.scale(1, 0.3); art.circ(ctx, 0, 40, 18); ctx.globalAlpha = 0.4; ctx.fill(); ctx.restore();
          ctx.lineWidth = 3; ctx.strokeStyle = P.ink; const sp = t * 30; ctx.beginPath(); ctx.moveTo(Math.cos(sp) * 18, 13); ctx.lineTo(-Math.cos(sp) * 18, 13); ctx.stroke();
          ctx.restore();
        }
        art.inkRect(ctx, -h * 0.45, h - 4, h * 0.9, 14, 4, P.blue, 3);
        const fl = 12 + Math.sin(t * 50) * 4; ctx.fillStyle = P.warn; ctx.beginPath(); ctx.moveTo(-h * 0.3, h + 10); ctx.lineTo(0, h + 10 + fl); ctx.lineTo(h * 0.3, h + 10); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
        if (t2 === 'interceptor') for (const s of [-1, 1]) art.ink(ctx, () => art.poly(ctx, [s * (h + 30), -6, s * (h + 70), -26, s * (h + 38), 8]), P.coralLight, 3);
        if (t2 === 'fortress') for (const s of [-1, 1]) { art.inkRect(ctx, s * (h + 16) - 9, -24, 18, 16, 4, P.blueMid, 2.5); const a = M.ang(this.x + s * h, this.y, this.W.targetPos().x, this.W.targetPos().y); ctx.save(); ctx.translate(s * (h + 16), -16); ctx.rotate(a); art.inkRect(ctx, 0, -3, 18, 6, 2, P.blue, 2); ctx.restore(); }
      } else if (ch === 'modular') {
        art.inkCirc(ctx, 0, 0, h * 0.25, P.blueDeep, 3);
      } else if (this.chassisDef.move) {
        this.drawNewChassis(ctx, t, h, ch, t2);
      } else {
        // prototype thruster
        art.inkRect(ctx, -h * 0.35, h - 6, h * 0.7, 16, 4, P.blue, 3);
        const fl = 14 + Math.sin(t * 40) * 5; ctx.fillStyle = P.warn; ctx.beginPath(); ctx.moveTo(-h * 0.22, h + 10); ctx.lineTo(0, h + 10 + fl); ctx.lineTo(h * 0.22, h + 10); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.beginPath(); ctx.moveTo(h * 0.5, -h); ctx.lineTo(h * 0.62, -h - 22); ctx.stroke(); art.inkCirc(ctx, h * 0.62, -h - 24, 5, P.warn, 2);
      }
    }
    drawNewChassis(ctx, t, h, ch, t2) {
      const fx = this.chassisDef.fx;
      const leg = (x1, y1, x2, y2, x3, y3) => { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.strokeStyle = P.ink; ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = P.blue; ctx.lineWidth = 4.5; ctx.stroke(); art.inkCirc(ctx, x3, y3, 6, P.paperDeep, 2.5); };
      if (ch === 'crawler') {
        const d = this.wall === 'L' ? [-1, 0] : this.wall === 'R' ? [1, 0] : [0, -1], tn = [-d[1], d[0]];
        const offs = fx.scuttle ? [-0.85, 0, 0.85] : [-0.7, 0.7];
        offs.forEach((o, i) => {
          const wig = Math.sin(this.walk * 0.08 + i * 2) * 8;
          const bx = tn[0] * o * h * 0.8, by = tn[1] * o * h * 0.8;
          const fx2 = d[0] * (h + 26) + tn[0] * (o * h * 1.3 + wig), fy2 = d[1] * (h + 26) + tn[1] * (o * h * 1.3 + wig);
          const kx = (bx + fx2) / 2 + tn[0] * o * 22 - d[0] * 6, ky = (by + fy2) / 2 + tn[1] * o * 22 - d[1] * 6;
          leg(bx, by, kx, ky, fx2, fy2);
          leg(-bx * 0.2 - d[0] * h * 0.2, -by * 0.2 - d[1] * h * 0.2, -tn[0] * o * h * 1.25 - d[0] * h * 0.4, -tn[1] * o * h * 1.25 - d[1] * h * 0.4, -tn[0] * o * h * 1.15 - d[0] * h * 0.95, -tn[1] * o * h * 1.15 - d[1] * h * 0.95);
        });
        if (t2 === 'dripper') { ctx.save(); ctx.rotate(this.wallAway == null ? Math.PI / 2 : this.wallAway); art.inkRect(ctx, h - 6, -14, 22, 28, 6, P.green, 3); ctx.fillStyle = P.green; for (let i = 0; i < 2; i++) { const k = (t * 1.5 + i * 0.5) % 1; art.circ(ctx, h + 22 + k * 26, -6 + i * 12, 5 * (1 - k * 0.5)); ctx.fill(); } ctx.restore(); }
      } else if (ch === 'hopper') {
        const c = this.air ? 1.15 : 1 - 0.55 * (this.coil || 0), len = 30 * c;
        ctx.save(); ctx.translate(0, h - 4);
        ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); for (let i = 1; i <= 6; i++) ctx.lineTo(i % 2 ? -16 : 16, i * len / 6.5); ctx.lineTo(0, len); ctx.strokeStyle = P.ink; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = P.paperDeep; ctx.lineWidth = 4; ctx.stroke();
        const fw = t2 === 'quake' ? 64 : 46; art.inkRect(ctx, -fw / 2, len, fw, 12, 4, t2 === 'quake' ? P.paperDeep : P.blueMid, 3, P.coral);
        if (t2 === 'quake') { ctx.save(); art.rr(ctx, -fw / 2, len, fw, 12, 4); ctx.clip(); ctx.globalAlpha = 0.6; ctx.fillStyle = art.stripes(ctx); ctx.fillRect(-fw / 2, len, fw, 12); ctx.restore(); }
        ctx.restore();
        if (t2 === 'skyhopper') for (const s of [-1, 1]) { const fl = Math.sin(t * (this.air ? 22 : 4)) * 0.35; ctx.save(); ctx.translate(s * h, -h * 0.3); ctx.rotate(s * (-0.4 + fl)); art.ink(ctx, () => art.poly(ctx, [0, 0, s * 44, -18, s * 40, 4, s * 22, 12]), P.cream, 3); ctx.restore(); }
      } else if (ch === 'phaser') {
        ctx.save(); ctx.globalAlpha *= 0.85; ctx.lineWidth = 3.5; ctx.strokeStyle = P.violet; ctx.setLineDash([12, 9]);
        for (let i = 0; i < 2; i++) { ctx.save(); ctx.rotate((i ? -1 : 1) * t * 1.4 + i); ctx.beginPath(); ctx.ellipse(0, 0, h * 1.45, h * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
        ctx.restore();
        if (t2 === 'blinkstorm') { ctx.strokeStyle = P.warn; ctx.lineWidth = 3; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * (h + 8), -h * 0.6); ctx.lineTo(s * (h + 20), -h * 0.2); ctx.lineTo(s * (h + 10), -h * 0.1); ctx.lineTo(s * (h + 24), h * 0.35); ctx.stroke(); } }
        if (t2 === 'echo') { ctx.save(); for (let i = 1; i <= 2; i++) { ctx.globalAlpha = 0.3 / i; ctx.strokeStyle = P.violet; ctx.lineWidth = 3; const s = h + 10 * i + (t * 20 % 10); art.rr(ctx, -s, -s, s * 2, s * 2, 14); ctx.stroke(); } ctx.restore(); }
      } else if (ch === 'orbiter') {
        ctx.save(); ctx.rotate(-0.3); ctx.lineWidth = 9; ctx.strokeStyle = P.ink; ctx.beginPath(); ctx.ellipse(0, 0, h * 1.7, h * 0.42, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 4.5; ctx.strokeStyle = P.gold; ctx.stroke(); ctx.restore();
        if (t2 === 'comet') { const a = Math.atan2(-this.vy, -this.vx); ctx.save(); ctx.rotate(a); const fl = 1 + 0.15 * Math.sin(t * 40); art.ink(ctx, () => art.poly(ctx, [h * 0.5, -h * 0.75, h * 0.5 + h * 1.6 * fl, 0, h * 0.5, h * 0.75]), P.warn, 3); art.ink(ctx, () => art.poly(ctx, [h * 0.6, -h * 0.4, h * 0.6 + h * 0.9 * fl, 0, h * 0.6, h * 0.4]), P.cream, 0); ctx.restore(); }
      } else if (ch === 'pendulum') {
        art.inkRect(ctx, -h * 0.35, -h - 18, h * 0.7, 20, 5, P.blueMid, 3);
        art.inkCirc(ctx, 0, -h - 18, 9, P.paperDeep, 3);
        if (t2 === 'wrecking') { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; const cx = Math.cos(a) * h * 1.05, cy = Math.sin(a) * h * 1.05; ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); art.ink(ctx, () => art.poly(ctx, [0, -9, 22, 0, 0, 9]), P.paperDeep, 3); ctx.restore(); } }
        if (t2 === 'chime') { art.ink(ctx, () => { ctx.beginPath(); ctx.moveTo(-h * 0.8, h * 0.7); ctx.quadraticCurveTo(-h * 1.05, h * 1.3, -h * 1.1, h * 1.35); ctx.lineTo(h * 1.1, h * 1.35); ctx.quadraticCurveTo(h * 1.05, h * 1.3, h * 0.8, h * 0.7); ctx.closePath(); }, P.gold, 3); art.inkCirc(ctx, Math.sin(t * 6) * 10, h * 1.45, 9, P.blueMid, 3); }
      } else if (ch === 'stalker') {
        for (const s of [-1, 1]) { ctx.lineCap = 'round'; ctx.strokeStyle = P.ink; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(s * h * 0.45, -h); ctx.quadraticCurveTo(s * h * 0.7, -h - 30, s * h * 0.55 + Math.sin(t * 3 + s) * 6, -h - 44); ctx.stroke(); ctx.strokeStyle = P.blueMid; ctx.lineWidth = 3; ctx.stroke(); art.inkCirc(ctx, s * h * 0.55 + Math.sin(t * 3 + s) * 6, -h - 46, 8, P.warn, 2.5); }
        for (let i = 0; i < 5; i++) { const x = -h * 0.8 + i * h * 0.4, l = 18 + Math.sin(t * 5 + i) * 6; art.ink(ctx, () => art.poly(ctx, [x - 9, h - 6, x + 9, h - 6, x, h + l]), t2 === 'shade' ? P.ink : P.blueDeep, 2.5); }
        if (t2 === 'hunter') for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * h * 0.6, h); art.ink(ctx, () => art.poly(ctx, [-8, 0, 8, 0, s * 14, 26, 0, 14]), P.paperDeep, 3); ctx.restore(); }
        if (t2 === 'shade') art.inkRect(ctx, -h * 0.4, h - 2, h * 0.8, 14, 4, P.ink, 3, P.coral);
      } else if (ch === 'bumper') {
        const boost = this.bnc ? this.bnc.boost : 1;
        art.inkRect(ctx, -h - 12, -h - 12, h * 2 + 24, h * 2 + 24, 22, t2 === 'pinball' ? P.teal : P.coralLight, 4);
        if (t2 === 'pinball') for (let i = 0; i < 8; i++) { const lit = i < Math.round((boost - 1) / 0.7 * 8); const a = i / 8 * Math.PI * 2; art.inkCirc(ctx, Math.cos(a) * (h + 6) * 1.12, Math.sin(a) * (h + 6) * 1.12, 5, lit ? P.warn : P.cream, 2); }
        if (t2 === 'shrapnel') for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) art.ink(ctx, () => art.poly(ctx, [sx2 * (h + 4), sy2 * (h - 12), sx2 * (h + 26), sy2 * (h + 26), sx2 * (h - 12), sy2 * (h + 4)]), P.paperDeep, 3);
      }
    }
    drawPassives(ctx, t) {
      const h = this.h, p = this.bb.passives;
      if (p.overclock) for (let i = 0; i < p.overclock; i++) { art.inkRect(ctx, -h + 6 + i * 16, -h - 20, 10, 20, 2, P.blueMid, 2.5); ctx.fillStyle = 'rgba(244,234,213,0.7)'; art.circ(ctx, -h + 11 + i * 16, -h - 26 - (t * 30 % 12), 5 + (t * 30 % 12) * 0.3); ctx.fill(); }
      if (p.thrusters) for (const s of [-1, 1]) art.ink(ctx, () => art.poly(ctx, [s * h, h * 0.3, s * (h + 18), h * 0.85, s * h, h * 0.85]), P.blueLight, 2.5);
      if (p.regen) { art.inkRect(ctx, h - 18, -h + 8, 10, 22, 3, P.green, 2); }
      if (p.tempered) { ctx.fillStyle = P.gold; for (let i = 0; i < 5; i++) { art.circ(ctx, -h * 0.6 + i * h * 0.3, h * 0.95, 3.5); ctx.fill(); } }
      if (p.flares) art.inkRect(ctx, -h - 4, -h * 0.2, 8, 16, 2, P.warn, 2);
      if (p.combo) { ctx.strokeStyle = P.teal; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-h + 8, -h * 0.1); ctx.lineTo(-h * 0.5, -h * 0.1); ctx.lineTo(-h * 0.5, h * 0.1); ctx.stroke(); }
      if (p.selfrepair) { ctx.save(); ctx.translate(-h * 0.85, h * 0.85); ctx.rotate(Math.sin(t * 3) * 0.4); art.inkRect(ctx, -3, -14, 6, 14, 2, P.paperDeep, 2); ctx.restore(); }
      if (p.vengeful) for (let i = 0; i < 4; i++) { const x = -h * 0.45 + i * h * 0.3; art.ink(ctx, () => art.poly(ctx, [x - 4, h * 0.18, x, h * 0.05, x + 4, h * 0.18]), P.enemy, 1.5); }
      if (this.raging) { for (const s of [-1, 1]) art.ink(ctx, () => art.poly(ctx, [s * h * 0.55, -h, s * h * 0.8, -h - 22, s * h * 0.9, -h]), P.enemy, 2.5); }
    }
    drawFace(ctx, t) {
      const h = this.h, f = this.face, look = f.look;
      const mood = this.stagger > 0 || this.frozen > 0 ? 'dizzy' : this.exposed > 0 ? 'worried' : (this.charging || this.angry > 0 || this.raging) ? 'angry' : this.director.active.length ? 'focus' : 'idle';
      const ex = h * 0.36, ey = -h * 0.32, ew = h * 0.24, eh = h * 0.3;
      art.inkRect(ctx, -h * 0.8, -h * 0.72, h * 1.6, h * 0.8, 10, P.cream, 3);
      for (const s of [-1, 1]) {
        const cx = s * ex, cy = ey;
        if (f.blink > 0 && mood !== 'dizzy') { ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.beginPath(); ctx.moveTo(cx - ew, cy); ctx.lineTo(cx + ew, cy); ctx.stroke(); continue; }
        ctx.fillStyle = P.white; ctx.beginPath(); ctx.ellipse(cx, cy, ew, eh, 0, 0, 7); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
        if (mood === 'dizzy') { ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * 0.7 + t * 10 * s, r = 1 + i * 0.6; i ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + r, cy); } ctx.stroke(); }
        else {
          const pr = mood === 'angry' ? ew * 0.5 : ew * 0.58; const lx = Math.cos(look) * ew * 0.42, ly = Math.sin(look) * eh * 0.4;
          ctx.fillStyle = this.raging ? P.enemy : P.ink; art.circ(ctx, cx + lx, cy + ly, pr); ctx.fill();
          ctx.fillStyle = P.white; art.circ(ctx, cx + lx - pr * 0.35, cy + ly - pr * 0.4, pr * 0.3); ctx.fill();
        }
        // brows
        ctx.lineWidth = 5; ctx.strokeStyle = P.ink; ctx.beginPath();
        const by = cy - eh - 4;
        if (mood === 'angry' || mood === 'focus') { ctx.moveTo(cx - ew * s, by - 6); ctx.lineTo(cx + ew * s, by + (mood === 'angry' ? 6 : 2)); }
        else if (mood === 'worried') { ctx.moveTo(cx - ew * s, by + 4); ctx.lineTo(cx + ew * s, by - 6); }
        else { ctx.moveTo(cx - ew, by); ctx.lineTo(cx + ew, by - 2); }
        ctx.stroke();
      }
      if (mood === 'worried') { ctx.fillStyle = P.blueLight; ctx.beginPath(); ctx.moveTo(h * 0.75, -h * 0.6); ctx.quadraticCurveTo(h * 0.86, -h * 0.4, h * 0.75, -h * 0.34); ctx.quadraticCurveTo(h * 0.64, -h * 0.4, h * 0.75, -h * 0.6); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke(); }
      // mouth
      ctx.lineWidth = 3.5; ctx.strokeStyle = P.ink; ctx.beginPath();
      if (mood === 'angry') { ctx.moveTo(-h * 0.3, -h * 0.02); for (let i = 1; i <= 6; i++) ctx.lineTo(-h * 0.3 + i * h * 0.1, -h * 0.02 + (i % 2 ? -6 : 0)); }
      else if (mood === 'dizzy' || mood === 'worried') { ctx.ellipse(0, -h * 0.03, h * 0.1, 5, 0, 0, 7); }
      else { ctx.moveTo(-h * 0.22, -h * 0.05); ctx.quadraticCurveTo(0, -h * 0.05 + (mood === 'focus' ? 0 : 4), h * 0.22, -h * 0.05); }
      ctx.stroke();
    }
    drawStatus(ctx, t) {
      const h = this.h, s = this.st;
      if (s.burn.n > 0) for (let i = 0; i < Math.min(5, s.burn.n); i++) { const x = -h + (i + 0.5) * this.size / 5, y = -h - 4 - Math.abs(Math.sin(t * 9 + i)) * 8; ctx.fillStyle = s.burn.mult > 1 ? '#7fd4ff' : P.coral; ctx.beginPath(); ctx.moveTo(x - 6, y + 8); ctx.quadraticCurveTo(x, y - 14, x + 6, y + 8); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = P.ink; ctx.stroke(); }
      if (s.chill.n > 0) { ctx.save(); ctx.globalAlpha = Math.min(0.6, s.chill.n * 0.08); ctx.fillStyle = '#bfe9ff'; art.rr(ctx, -h, -h, this.size, this.size, 12); ctx.fill(); ctx.restore(); }
      if (s.soaked > 0) { ctx.fillStyle = P.blueDeep; for (let i = 0; i < 4; i++) { const x = -h * 0.7 + i * h * 0.45; const L = 10 + ((t * 20 + i * 7) % 14); ctx.fillRect(x, h - 4, 5, L); art.circ(ctx, x + 2.5, h - 4 + L, 4); ctx.fill(); } }
      if (s.magnet > 0) { ctx.save(); ctx.strokeStyle = P.coral; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); art.circ(ctx, 0, 0, h * 1.35 + Math.sin(t * 10) * 3); ctx.stroke(); ctx.restore(); art.text(ctx, 'U', h + 8, -h - 6, 16, P.coral, 'center', 4); }
      if (s.cracked > 0) { ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-h * 0.2, -h); ctx.lineTo(-h * 0.05, -h * 0.75); ctx.lineTo(-h * 0.25, -h * 0.55); ctx.stroke(); }
    }
    drawAttach(ctx, id, mt, t) {
      const h = this.h; const sc = this.size / 96; const k = M.easeOutBack(this.unfold[id] || 0);
      if (k <= 0.01) return;
      ctx.save(); ctx.translate(mt.mx * h * this.facing, mt.my * h); ctx.scale(k, k);
      this.drawAttachGfx(ctx, id, sc, t, false); ctx.restore();
    }
    drawAttachGfx(ctx, id, sc, t, onSeg) {
      const W = this.W; const w = this.wind[id] || 0, wm = this.wind[id + '_max'] || 1; const r = this.rec[id] || 0;
      const glow = w > 0 ? 1 - w / wm : 0; const f = onSeg ? 1 : this.facing;
      const m = this.modules.find(mm => mm.id === id); const broken = m && m.broken;
      const tp = W.targetPos();
      const aimA = () => { const mp = this.mountPos(id); return M.ang(mp.x, mp.y, tp.x, tp.y); };
      ctx.save(); ctx.scale(sc, sc);
      if (broken) ctx.globalAlpha *= 0.55;
      const col = broken ? P.inkSoft : P.blue, col2 = broken ? P.inkSoft : P.blueMid;
      const G = (x, y, rr) => { if (glow > 0) { ctx.save(); ctx.globalAlpha = 0.4 + glow * 0.6; art.inkCirc(ctx, x, y, rr * (0.6 + glow * 0.6), P.warn, 2); ctx.restore(); } };
      switch (id) {
        case 'spread': { ctx.save(); if (!onSeg) ctx.rotate(aimA() - (f > 0 ? 0 : Math.PI)); ctx.scale(f, 1); for (const dy of [-8, 0, 8]) art.inkRect(ctx, 2 - r * 6, dy - 3.5, 30, 7, 2, col, 2.5); art.inkRect(ctx, -8, -14, 14, 28, 4, col2, 3); G(32, 0, 12); ctx.restore(); break; }
        case 'missiles': { art.inkRect(ctx, -18, -16, 36, 26, 4, col2, 3, P.coral); for (let i = 0; i < 4; i++) { const x = -11 + (i % 2) * 14, y = -9 + Math.floor(i / 2) * 11; art.inkCirc(ctx, x + 4, y + 2, 4.5, glow > 0.3 ? P.warn : P.enemy, 2); } if (glow > 0) { ctx.fillStyle = P.ink; ctx.fillRect(-18, -22 - glow * 6, 36, 5); } G(0, -4, 22); break; }
        case 'sweep': { art.inkRect(ctx, -6, -6, 12, 14, 2, col, 3); ctx.save(); ctx.translate(0, -10); art.ink(ctx, () => { ctx.beginPath(); ctx.ellipse(0, 0, 22, 9, 0, Math.PI, 0); ctx.closePath(); }, P.blueLight, 3); art.inkCirc(ctx, 0, -3, 4, glow > 0 ? P.warn : P.enemy, 2); ctx.restore(); G(0, -12, 18); break; }
        case 'grid': { for (const s of [-1, 1]) { art.inkRect(ctx, s * 10 - 3, -26, 6, 26, 2, col, 2.5); art.inkCirc(ctx, s * 10, -28, 5, glow > 0 ? P.warn : P.teal, 2); } break; }
        case 'mines': { art.inkRect(ctx, -16, -4, 32, 18, 4, col2, 3); art.ink(ctx, () => art.poly(ctx, [-12, 14, 12, 14, 6, 22, -6, 22]), col, 2.5); art.inkCirc(ctx, 0, 4, 5, P.enemy, 2); G(0, 18, 12); break; }
        case 'orbit': { ctx.save(); ctx.globalAlpha *= 0.85; ctx.lineWidth = 4; ctx.strokeStyle = P.ink; art.circ(ctx, 0, 0, this.h * 1.25 / sc); ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = P.blueLight; ctx.stroke(); ctx.restore(); for (let i = 0; i < 4; i++) { const a = t * 0.8 + i * Math.PI / 2; SO.drawEBlade(ctx, Math.cos(a) * this.h * 1.25 / sc, Math.sin(a) * this.h * 1.25 / sc, 7, t * 5, 1); } break; }
        case 'bombs': { art.inkRect(ctx, -12, -12, 24, 24, 6, col2, 3); art.inkCirc(ctx, 0, 0, 8, P.cream, 2.5); ctx.fillStyle = glow > 0 ? P.warn : P.enemy; art.circ(ctx, 0, 0, 3.5); ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke(); break; }
        case 'boomer': { for (const s of [-1, 1]) { ctx.save(); ctx.scale(s, 1); art.ink(ctx, () => { ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(26, -6, 22, 14); ctx.quadraticCurveTo(14, 2, 0, 6); ctx.closePath(); }, P.blueLight, 2.5); ctx.restore(); } G(0, 0, 16); break; }
        case 'barrier': { art.inkRect(ctx, -8, -24, 16, 44, 3, col, 3); ctx.save(); art.rr(ctx, -6, -20, 12, 36, 2); ctx.clip(); ctx.fillStyle = art.stripes(ctx); ctx.fillRect(-6, -20, 12, 36); ctx.restore(); G(0, -26, 12); break; }
        case 'drones': { art.inkRect(ctx, -22, -16, 30, 30, 4, col2, 3); art.inkRect(ctx, -18 + glow * 10, -10, 18, 18, 2, P.ink, 0); ctx.fillStyle = P.coral; ctx.fillRect(-15, -7, 10, 12); G(-6, 0, 16); break; }
        case 'charge': { ctx.save(); ctx.scale(f, 1); art.ink(ctx, () => art.poly(ctx, [-4, -16, 22, -6, 26, 0, 22, 6, -4, 16]), P.paperDeep, 3); ctx.save(); art.poly(ctx, [-4, -16, 22, -6, 26, 0, 22, 6, -4, 16]); ctx.clip(); ctx.fillStyle = art.stripes(ctx); ctx.globalAlpha = 0.6; ctx.fillRect(-4, -16, 30, 32); ctx.restore(); ctx.restore(); break; }
        case 'ring': { art.inkRect(ctx, -28, -8, 56, 12, 5, col2, 3); for (let i = 0; i < 5; i++) art.inkCirc(ctx, -22 + i * 11, -10, 4, glow > 0 ? P.warn : P.enemy, 2); break; }
        case 'mortar': { ctx.save(); ctx.rotate(-0.5 * f); art.inkRect(ctx, -8, -34 - r * 4, 16, 34, 3, col, 3); art.inkRect(ctx, -10, -38 - r * 4, 20, 8, 2, col2, 2.5); ctx.restore(); G(0, -30, 12); break; }
        case 'stomp': { for (const s of [-1, 1]) { art.inkRect(ctx, s * 18 - 6, -4, 12, 18, 2, col, 2.5); art.inkRect(ctx, s * 18 - 10, 12, 20, 8, 2, P.paperDeep, 2.5); } break; }
        case 'flak': { art.inkRect(ctx, -16, -12, 32, 22, 4, col2, 3); ctx.save(); if (!onSeg) ctx.rotate(aimA()); art.inkRect(ctx, 6, -9, 18, 7, 2, col, 2); art.inkRect(ctx, 6, 2, 18, 7, 2, col, 2); ctx.restore(); G(0, 0, 14); break; }
        case 'spiral': { ctx.save(); ctx.rotate(t * (glow > 0 ? 14 : 2)); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); art.inkRect(ctx, 2, -4, 16, 8, 3, i % 2 ? col2 : P.coralLight, 2); } ctx.restore(); art.inkCirc(ctx, 0, 0, 6, P.warn, 2); break; }
        case 'snare': { ctx.strokeStyle = P.ink; ctx.lineWidth = 6; ctx.beginPath(); for (let i = 0; i < 5; i++) ctx.ellipse(0, -14 + i * 7, 12, 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = P.violet; ctx.lineWidth = 3; ctx.stroke(); G(0, 0, 16); break; }
        case 'turret': { art.ink(ctx, () => { ctx.beginPath(); ctx.arc(0, 4, 15, Math.PI, 0); ctx.closePath(); }, col2, 3); ctx.save(); ctx.translate(0, -2); if (!onSeg) ctx.rotate(aimA()); art.inkRect(ctx, 0, -3.5, 24 - r * 5, 7, 2, col, 2.5); ctx.restore(); break; }
        case 'bouncer': { art.inkRect(ctx, -12, -16, 24, 32, 6, col2, 3); art.inkCirc(ctx, 0, -14, 9, glow > 0 ? P.warn : P.enemy, 2.5); break; }
        case 'sniper': { ctx.save(); if (!onSeg) ctx.rotate(aimA()); art.inkRect(ctx, -6, -5, 52, 10, 2, col, 3); art.inkRect(ctx, 6, -14, 16, 8, 3, col2, 2.5); art.inkCirc(ctx, 50, 0, 4, P.enemy, 2); ctx.restore(); break; }
        case 'sideguns': case 'drip': case 'dive': case 'payload': break;
        default: art.inkRect(ctx, -10, -10, 20, 20, 4, col2, 3);
      }
      if (broken) { ctx.globalAlpha = 1; ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(0, 2); ctx.lineTo(-4, 8); ctx.lineTo(10, 14); ctx.stroke(); }
      ctx.restore();
    }
  }
  SO.Boss = Boss;
})();
