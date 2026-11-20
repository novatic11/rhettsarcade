/* Square Off 2 — World: simulation, collisions, damage pipeline, enemy attack primitives, effects */
'use strict';
(function () {
  const P = SO.PAL, M = SO.M, A = SO.ARENA, art = SO.art;
  const BULLET_CAP = 520, ESHOT_MAX = 260;
  const WORDSTYLE = {
    crit: { bg: P.warn, fg: P.coral, size: 24 }, boom: { bg: P.coral, fg: P.warn, size: 28 }, boss: { bg: P.blue, fg: P.coral, size: 30 },
    good: { bg: P.teal, fg: P.cream, size: 24 }, hurt: { bg: P.enemy, fg: P.cream, size: 24 }, cold: { bg: '#bfe9ff', fg: P.blue, size: 24 }, small: { bg: P.paper, fg: P.coralDark, size: 16 }
  };

  class World {
    constructor(o) {
      this.mode = o.mode || 'standard'; this.round = o.round || 1; this.finale = !!o.finale;
      this.build = o.build; this.bb = o.bb; this.challenges = o.challenges || [];
      this.settings = (SO.save.data && SO.save.data.settings) || SO.save.defaults().settings;
      this.demoMode = !!o.demo; this.quiet = !!o.quiet; this.godMode = !!o.god; this.practiceInfinite = !!o.infinite;
      this.time = 0; this.state = 'intro'; this.stateT = 0; this.result = null;
      this.pShots = []; this.eShots = []; this.enemies = []; this.allies = []; this.beamsE = []; this.fx = []; this.words = []; this.decals = [];
      this.ghosts = []; this.whips = []; this.lenses = []; this.flares = []; this.hazards = []; this.timers = []; this.pBeams = []; this.events = [];
      this.arenaId = o.arena || 'print'; this.arena = SO.ARENAS[this.arenaId]; this.arenaState = {};
      this.hazardsOn = !!o.hazards; this.mechanics = o.mechanics !== false;
      this.hazardT = this.arena.hazard ? this.arena.hazard.interval * 0.6 + 3 : 99;
      this.platforms = (this.arena.platforms || []).map(p => Object.assign({ h: 16 }, SO.clone(p), { x0: p.x, y0: p.y, dx: 0, dy: 0 }));
      this.waterY = null; this.floorPush = 0; this.inSpotlight = false;
      this.stats = { dmgBySource: {}, dmgTaken: {}, hitsTaken: 0, dashes: 0, utils: 0, modulesBroken: 0, time: 0, lastHitBy: null, crits: 0, peakHit: 0, erased: 0 };
      this.player = new SO.Player(this, this.build, { hp: o.playerHp, x: o.px, y: o.py });
      this.boss = o.noBoss ? null : new SO.Boss(this, this.bb, { hp: o.bossHp, intro: o.intro, noPhases: o.noPhases || o.infinite, unfolded: o.unfolded });
      if (!this.boss) this.state = 'fight';
      this.enemyScale = 1; this.dilateT = 0; this.decoy = null;
      this.shakeAmt = 0; this.shakeX = 0; this.shakeY = 0; this.hitstopT = 0; this.flashT = 0; this.hurtFlash = 0;
      this.wordCd = {}; this.echoHit = {}; this.grid = new Map(); this.mouseOverride = null; this.renderScale = 1;
      this.inkQuake = this.build.weapons.some(w => w.id === 'ink' && w.evo === 'a');
      this.twin = this.build.f.twin ? { x: 0, y: 0, ws: null } : null;
      this.controlLock = false; this.weaponsOff = false; this.bannerT = 0;
      this.bossHpMul = o.bossHpMul || 1; this.bossCdMul = o.bossCdMul || 1; this.contract = null;
      if (this.boss && this.bossHpMul !== 1 && !o.bossHp) { this.boss.maxHp = Math.round(this.boss.maxHp * this.bossHpMul); this.boss.hp = this.boss.maxHp; for (const m of this.boss.modules) { m.maxHp *= this.bossHpMul; m.hp = m.maxHp; } }
    }
    get mouse() { return this.mouseOverride || SO.input.mouse; }
    sfx(n, v) { if (!this.quiet) SO.sfx.play(n, v); }
    later(t, fn) { this.timers.push({ t, fn }); }

    /* ================= update ================= */
    update(dt) {
      if (this.hitstopT > 0) { this.hitstopT -= dt; this.updateFx(dt * 0.25); return; }
      let sdt = dt;
      if (this.state === 'victory') sdt = dt * (this.stateT < 0.9 ? 0.3 : 0.8);
      if (this.state === 'defeat') sdt = dt * 0.3;
      this.stateT += dt; this.time += sdt; if (this.state === 'fight') this.stats.time += sdt;
      if (this.state === 'intro' && (!this.boss || this.boss.intro <= 0)) { this.state = 'fight'; this.stateT = 0; }
      if (this.state === 'victory' && this.stateT > 2.4 && !this.result) this.result = 'win';
      if (this.state === 'defeat' && this.stateT > 1.7 && !this.result) this.result = 'lose';
      this.weaponsOff = this.state !== 'fight' || !!this.forceWeaponsOff;
      this.controlLock = this.state === 'victory' || this.state === 'defeat';
      this.dilateT = Math.max(0, this.dilateT - sdt);
      let es = 1; if (this.dilateT > 0) es *= 0.45; if (this.build.f.chrono && this.player.hp < this.player.maxHp * 0.35) es *= 0.7; this.enemyScale = es;
      const edt = sdt * es;
      if (this.decoy) { this.decoy.t -= sdt; if (this.decoy.t <= 0) this.decoy = null; }
      for (const tm of this.timers) { tm.t -= sdt; if (tm.t <= 0 && !tm.done) { tm.done = true; try { tm.fn(); } catch (e) { console.error(e); } } }
      this.timers = this.timers.filter(t => !t.done);
      // arena mechanics
      for (const p of this.platforms) { p.px = p.x; p.py = p.y; }
      if (this.mechanics && this.arena.update) this.arena.update(this, sdt);
      for (const p of this.platforms) { p.dx = p.x - p.px; p.dy = p.y - p.py; if (p.life != null) p.life -= sdt; }
      this.platforms = this.platforms.filter(p => p.life == null || p.life > 0);
      // actors
      this.pBeams.length = 0;
      if (this.state !== 'defeat') this.player.update(sdt);
      if (this.twin && this.state === 'fight') this.updateTwin(sdt);
      if (this.build.f.medkit && this.state === 'fight') { this.medkitT = (this.medkitT == null ? 8 : this.medkitT) - sdt; if (this.medkitT <= 0) { this.medkitT = 14; this.addAlly(SO.makeMedkit(this, M.clamp(this.player.x + M.rand(-220, 220), A.L + 40, A.R - 40))); } }
      if (this.boss) this.boss.update(sdt);
      for (const e of this.enemies) if (!e.dead) e.update(edt);
      this.enemies = this.enemies.filter(e => { if (e.dead && e.onRemove) e.onRemove(); return !e.dead; });
      this.updateEShots(edt);
      this.buildGrid();
      this.updatePShots(sdt);
      for (const a of this.allies) if (!a.dead) a.update(sdt);
      this.allies = this.allies.filter(a => !a.dead);
      for (const l of this.lenses) { l.t += sdt; if (l.t > l.life) l.dead = true; }
      this.lenses = this.lenses.filter(l => !l.dead);
      for (const f of this.flares) { f.t -= sdt; f.x += f.vx * sdt; f.y += f.vy * sdt; f.vy += 200 * sdt; }
      this.flares = this.flares.filter(f => f.t > 0);
      for (const b of this.beamsE) if (!b.dead) b.update(edt);
      this.beamsE = this.beamsE.filter(b => !b.dead);
      // hazards (scheduled through the director so they never stack with zone attacks)
      if (this.hazardsOn && this.arena.hazard && this.state === 'fight' && this.boss) {
        this.hazardT -= sdt;
        if (this.hazardT <= 0) { if (this.canHazard()) { this.hazards.push(this.arena.hazard.make(this)); this.hazardT = this.arena.hazard.interval * M.rand(0.85, 1.2); } else this.hazardT = 0.6; }
      }
      for (const h of this.hazards) if (!h.dead) h.update(sdt);
      this.hazards = this.hazards.filter(h => !h.dead);
      for (const g of this.ghosts) g.t += sdt; this.ghosts = this.ghosts.filter(g => g.t < g.dur);
      for (const w of this.whips) w.t += sdt; this.whips = this.whips.filter(w => w.t < 0.18);
      for (const d of this.decals) d.t += sdt; this.decals = this.decals.filter(d => d.t < 9);
      // practice: endless dummy HP
      if (this.practiceInfinite && this.boss && this.boss.hp < this.boss.maxHp * 0.15) this.boss.hp = this.boss.maxHp;
      this.updateFx(sdt);
    }
    canHazard() {
      const b = this.boss; if (!b || !b.alive || b.intro > 0) return false;
      const d = b.director; if (d.zoneActive() || d.active.some(r => r.def.solo)) return false;
      return d.load() <= d.budget() * 0.5 && !this.hazardBusy() && this.eShots.length < 90;
    }
    hazardBusy() { return this.hazards.some(h => !h.dead); }
    updateTwin(dt) {
      const P = this.player, tw = this.twin, b = this.boss; tw.x = (A.L + A.R) - P.x; tw.y = P.y;
      const ws = P.weapons[0]; if (!ws || !b || !b.alive || this.weaponsOff) return;
      if (!tw.ws || tw.ws.id !== ws.id) { const p = Object.assign({}, ws.p); for (const k of ['dmg', 'dps0', 'ldmg', 'kdmg', 'boom', 'impact', 'pump', 'nova', 'trail', 'zap', 'counter']) if (typeof p[k] === 'number') p[k] *= 0.6; tw.ws = { w: ws.w, id: ws.id, def: ws.def, p, cd: 0.3, recoil: 0 }; }
      const proxy = { x: tw.x, y: tw.y, gx: tw.x, gy: tw.y - 4, aim: M.ang(tw.x, tw.y - 4, b.x, b.y), vx: -P.vx, vy: P.vy, thrusting: P.thrusting, dashing: P.dashing, facing: b.x > tw.x ? 1 : -1, rateBoost: P.rateBoost, hitR: P.hitR, justHit: false, addTempShield() { }, restoreShield() { } };
      this.mouseOverride = { x: b.x, y: b.y };
      try { const d = tw.ws.def; if (d.update) d.update(this, proxy, tw.ws, tw.ws.p, dt); else { tw.ws.cd -= dt * P.rateBoost; if (tw.ws.cd <= 0) { d.fire(this, proxy, tw.ws, tw.ws.p); tw.ws.cd += 1 / tw.ws.p.rate; } } } catch (e) { console.error(e); }
      this.mouseOverride = null; tw.aim = proxy.aim;
    }

    /* ---------- enemy shots ---------- */
    targetPos() { return this.decoy || { x: this.player.x, y: this.player.y }; }
    bulletSpeed(v) {
      const bb = this.bb || { passives: {} };
      let m = Math.min(1.25, 1 + 0.025 * (this.round - 1)) * (bb.passives.tempered ? 1.12 : 1) * Math.pow(1.04, bb.passives.escal || 0) * (this.boss ? this.boss.chassisDef.bspeed : 1);
      return Math.min(BULLET_CAP, v * m);
    }
    eBullet(x, y, a, spd, o = {}) {
      if (this.eShots.length >= ESHOT_MAX || this.state !== 'fight') return null;
      const v = this.bulletSpeed(spd);
      const s = Object.assign({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 6, dmg: 12, life: 8, kind: 'orb', src: 'boss', age: 0, bounces: 0 }, o);
      if (s.maxSpeed) s.maxSpeed = Math.min(BULLET_CAP, this.bulletSpeed(s.maxSpeed));
      if (s.homing) s.homing = Math.min(2.6, s.homing);
      this.eShots.push(s); return s;
    }
    updateEShots(dt) {
      const P = this.player, f = this.build.f, b = this.boss;
      for (const s of this.eShots) {
        if (s.dead) continue;
        s.age += dt;
        if (s.hang > 0) { s.hang -= dt; s.vx = 0; s.vy = 0; if (s.hang <= 0) { const v = this.bulletSpeed(300); s.vx = Math.cos(s.hangA) * v; s.vy = Math.sin(s.hangA) * v; } }
        if (s.ret) {
          const r = s.ret; r.t += dt;
          if (r.phase === 0) { const k = Math.max(0, 1 - dt * 2.6); s.vx *= k; s.vy *= k; if (r.t > 1.0) { r.phase = 1; r.t = 0; s.vx = 0; s.vy = 0; } }
          else if (r.phase === 1) { if (r.t > 0.38) { r.phase = 2; r.t = 0; } }
          else if (r.phase === 2) { const o = s.owner; const a = M.ang(s.x, s.y, o.x, o.y); const sp = Math.min(this.bulletSpeed(380), 60 + r.t * 600); if (!r.locked) { s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; } if (M.dist(s.x, s.y, o.x, o.y) < 30) { if (r.over) { r.locked = true; s.life = Math.min(s.life, 1.6); } else s.dead = true; } }
        }
        if (s.homing && (s.homeT == null || s.homeT > 0)) { const tp = this.targetPos(); const cur = Math.atan2(s.vy, s.vx); const sp = Math.hypot(s.vx, s.vy); const na = M.turnToward(cur, M.ang(s.x, s.y, tp.x, tp.y), s.homing * dt); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; if (s.homeT != null) s.homeT -= dt; }
        if (s.accel) { const sp = Math.hypot(s.vx, s.vy); const ns = Math.min(s.maxSpeed || BULLET_CAP, sp + s.accel * dt); if (sp > 0) { s.vx *= ns / sp; s.vy *= ns / sp; } }
        if (b && b.lodestone > 0 && s.metal && b.alive) { const d = M.dist(s.x, s.y, b.x, b.y); if (d < 170) { const a = M.ang(s.x, s.y, b.x, b.y); s.vx = s.vx * (1 - dt * 4) + Math.cos(a) * 900 * dt; s.vy = s.vy * (1 - dt * 4) + Math.sin(a) * 900 * dt; if (d < b.h) { s.dead = true; this.hitBoss(4 * this.build.s.dmgMul, 'harpoon', s.x, s.y, { noWord: true }); this.fxSpark(s.x, s.y, P.coral, 4); continue; } } }
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        if (s.timer != null) { s.timer -= dt; if (s.timer <= 0) { s.timer = null; if (s.onTimer) s.onTimer(s); } }
        if (s.bounce) {
          let hit = false;
          if (s.x - s.r < A.L) { s.x = A.L + s.r; s.vx = Math.abs(s.vx); hit = true; } else if (s.x + s.r > A.R) { s.x = A.R - s.r; s.vx = -Math.abs(s.vx); hit = true; }
          if (s.y - s.r < A.T) { s.y = A.T + s.r; s.vy = Math.abs(s.vy); hit = true; } else if (s.y + s.r > A.B) { s.y = A.B - s.r; s.vy = -Math.abs(s.vy); hit = true; }
          if (hit) { s.bounces++; if (s.split && s.bounces === s.split && !s.isChild) { s.dead = true; for (const sg of [-1, 1]) { const a = Math.atan2(s.vy, s.vx) + sg * 0.5; this.eBullet(s.x, s.y, a, Math.hypot(s.vx, s.vy), { src: s.src, kind: 'ball', r: 10, dmg: 12, big: true, life: Math.max(1, s.life), bounce: 99, isChild: true, metal: true }); } continue; } }
        } else if (s.x < A.L - 40 || s.x > A.R + 40 || s.y < A.T - 60 || s.y > A.B + 40) { s.dead = true; continue; }
        if (s.life <= 0) { s.dead = true; if (s.onExpire) s.onExpire(s); continue; }
        // player collision & graze
        const d = M.dist(s.x, s.y, P.x, P.y);
        if (f.bulwark && P.guard > 0 && this.state === 'fight' && d < s.r + 50 && Math.abs(M.wrap(M.ang(P.x, P.gy, s.x, s.y) - P.aim)) < 0.96) { P.guardHit(s.big ? 3 : 1); this.killEShot(s, 'block'); this.fxSpark(s.x, s.y, P.warn, 3); continue; }
        if (d < s.r + P.hitR && this.state === 'fight') { if (P.hurt(s.dmg, s.src)) { s.dead = true; this.fxSpark(s.x, s.y, P.enemy, 5); } }
        else if (f.graze && !s.grazed && d < s.r + P.hitR + 34 && this.state === 'fight' && P.invuln <= 0) { s.grazed = true; P.graze++; this.sfx('graze'); if (P.graze >= 15) { P.graze = 0; P.frenzyT = 4; this.word('ADRENALINE!', P.x, P.y - 44, 'good'); } }
      }
      this.eShots = this.eShots.filter(s => !s.dead);
    }
    buildGrid() {
      const g = this.grid; g.clear();
      for (const s of this.eShots) { const k = ((s.x / 80) | 0) + ((s.y / 80) | 0) * 64; let c = g.get(k); if (!c) { c = []; g.set(k, c); } c.push(s); }
    }
    eShotsInCircle(x, y, r) {
      const out = []; const x0 = ((x - r - 20) / 80) | 0, x1 = ((x + r + 20) / 80) | 0, y0 = ((y - r - 20) / 80) | 0, y1 = ((y + r + 20) / 80) | 0;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const c = this.grid.get(cx + cy * 64); if (!c) continue; for (const s of c) if (!s.dead && M.dist2(x, y, s.x, s.y) < (r + s.r) * (r + s.r)) out.push(s); }
      return out;
    }
    eShotsInCone(x, y, a, half, range) { return this.eShotsInCircle(x, y, range).filter(s => Math.abs(M.wrap(M.ang(x, y, s.x, s.y) - a)) <= half); }
    killEShot(s, how) {
      if (!s || s.dead) return; s.dead = true; s.killed = how; this.stats.erased++;
      const SP = this.player; if (SP && this.build.f.sponge && SP.soakBank >= 0.5 && SP.hp < SP.maxHp && this.state === 'fight') { SP.soakBank -= 0.5; SP.hp = Math.min(SP.maxHp, SP.hp + 0.5); }
      const col = how === 'freeze' ? '#bfe9ff' : how === 'zap' ? P.warn : how === 'crush' ? P.violet : P.tealLight;
      if (this.fx.length < 500) { this.fx.push({ type: 'pop', x: s.x, y: s.y, t: 0, life: 0.22, size: s.r + 4, col }); }
    }

    /* ---------- enemy primitives ---------- */
    eAdd(o) { this.enemies.push(o); return o; }
    playerNear(x, y, r) { return M.dist(x, y, this.player.x, this.player.y) < r; }
    hitPlayerCircle(x, y, r, dmg, src) { if (M.dist(x, y, this.player.x, this.player.y) < r + this.player.hitR) return this.player.hurt(dmg, src); return false; }
    hitPlayerRect(cx, cy, hw, hh, dmg, src) { const P = this.player; if (M.circleRect(P.x, P.y, P.hitR, cx, cy, hw, hh)) return P.hurt(dmg, src); return false; }
    pullPlayer(x, y, range, pull, dt) { const P = this.player; const d = M.dist(x, y, P.x, P.y); if (d > range || d < 4 || P.dashing) return; const k = pull * (1 - d / range * 0.6); const a = M.ang(P.x, P.y, x, y); P.pullX += Math.cos(a) * k; P.pullY += Math.sin(a) * k; }
    eLaser(o) {
      const W = this; const L = Object.assign({ phase: 'warn', t: 0, dmg: 18, src: 'laser', width: 22 }, o);
      L.update = function (dt) { this.t += dt; if (this.t < this.warn) { this.phase = 'warn'; return; } if (this.phase === 'warn') W.sfx('laser', 0.6); this.phase = 'live'; if (this.t < this.warn + this.fire) { const P = W.player; if (M.segDist(P.x, P.y, this.x1, this.y1, this.x2, this.y2) < this.width / 2 + P.hitR) P.hurt(this.dmg, this.src); } else this.dead = true; };
      L.draw = function (ctx) { W.drawLaser(ctx, this.x1, this.y1, this.x2, this.y2, this.width, this.phase, this.t / this.warn); };
      this.beamsE.push(L); return L;
    }
    eSweep(o) {
      const W = this; const L = Object.assign({ phase: 'warn', t: 0, dmg: 20, width: 18 }, o);
      L.update = function (dt) {
        this.t += dt; const org = this.follow(); this.ox = org.x; this.oy = org.y;
        if (this.t < this.warn) { this.phase = 'warn'; this.a = this.a0; return; }
        this.phase = 'live'; const k = (this.t - this.warn) / this.dur; if (k >= 1) { this.dead = true; return; }
        this.a = M.lerp(this.a0, this.a1, M.easeInOut(k)); const len = M.rayToWall(this.ox, this.oy, this.a);
        this.ex = this.ox + Math.cos(this.a) * len; this.ey = this.oy + Math.sin(this.a) * len;
        const P = W.player; if (M.segDist(P.x, P.y, this.ox, this.oy, this.ex, this.ey) < this.width / 2 + P.hitR) P.hurt(this.dmg, this.src);
      };
      L.draw = function (ctx) {
        if (this.ox == null) return;
        if (this.phase === 'warn') {
          ctx.save(); const k = this.t / this.warn; ctx.globalAlpha = 0.16 + 0.1 * Math.sin(W.time * 20); ctx.fillStyle = P.warn;
          ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.arc(this.ox, this.oy, 1400, Math.min(this.a0, this.a1), Math.max(this.a0, this.a1)); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 0.85; ctx.setLineDash([16, 10]); ctx.lineWidth = 4; ctx.strokeStyle = P.warn; const l0 = M.rayToWall(this.ox, this.oy, this.a0);
          ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ox + Math.cos(this.a0) * l0, this.oy + Math.sin(this.a0) * l0); ctx.stroke(); ctx.setLineDash([]);
          const am = this.a0 + (this.a1 - this.a0) * 0.25, r = 120; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(this.ox, this.oy, r, Math.min(this.a0, am), Math.max(this.a0, am)); ctx.stroke();
          const tx = this.ox + Math.cos(am) * r, ty = this.oy + Math.sin(am) * r; const ta = am + Math.sign(this.a1 - this.a0) * Math.PI / 2; ctx.fillStyle = P.warn; ctx.beginPath(); ctx.moveTo(tx + Math.cos(ta) * 12, ty + Math.sin(ta) * 12); ctx.lineTo(tx + Math.cos(ta + 2.4) * 10, ty + Math.sin(ta + 2.4) * 10); ctx.lineTo(tx + Math.cos(ta - 2.4) * 10, ty + Math.sin(ta - 2.4) * 10); ctx.fill();
          ctx.restore(); return;
        }
        W.drawLaser(ctx, this.ox, this.oy, this.ex, this.ey, this.width, 'live', 1);
      };
      this.beamsE.push(L); return L;
    }
    eLane(b, warn, ground) {
      const W = this; const o = { phase: 'warn', t: 0, a: 0, update(dt) { this.t += dt; if (this.t < warn * 0.6) { const tp = W.targetPos(); this.a = M.ang(b.x, b.y, tp.x, tp.y); if (ground) this.a = Math.cos(this.a) >= 0 ? 0 : Math.PI; } if (this.t >= warn) this.dead = true; }, draw(ctx) { const len = M.rayToWall(b.x, b.y, this.a) + 20; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(this.a); const lock = this.t >= warn * 0.6; ctx.globalAlpha = lock ? 0.45 + 0.25 * Math.sin(W.time * 30) : 0.3; ctx.fillStyle = art.stripes(ctx); ctx.fillRect(0, -b.h, len, b.size); ctx.globalAlpha = 0.9; ctx.strokeStyle = P.warn; ctx.lineWidth = 3; ctx.strokeRect(0, -b.h, len, b.size); ctx.restore(); art.text(ctx, lock ? 'CHARGE!' : 'AIMING…', b.x, b.y - b.size - 16, 20, P.warn, 'center', 5); } };
      o.update(0); this.beamsE.push(o); return o;
    }
    eSight(originFn, track, lock, predict, speed) {
      const W = this; const o = {
        phase: 'warn', t: 0, a: 0, update(dt) {
          this.t += dt; const org = originFn(); this.ox = org.x; this.oy = org.y;
          if (this.t < track) { const P = W.player; let tx = P.x, ty = P.y; if (predict && !W.decoy) { const lead = Math.min(0.35, M.dist(org.x, org.y, P.x, P.y) / speed); tx += P.vx * lead; ty += P.vy * lead; } else if (W.decoy) { tx = W.decoy.x; ty = W.decoy.y; } this.a = M.ang(org.x, org.y, tx, ty); }
          if (this.t > track + lock + 0.6) this.dead = true;
        },
        draw(ctx) { if (this.ox == null || this.t > track + lock + 0.1) return; const len = M.rayToWall(this.ox, this.oy, this.a); const locked = this.t >= track; ctx.save(); ctx.globalAlpha = locked ? 0.95 : 0.55; ctx.strokeStyle = P.warn; ctx.lineWidth = locked ? 4 : 2; ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.moveTo(this.ox, this.oy); ctx.lineTo(this.ox + Math.cos(this.a) * len, this.oy + Math.sin(this.a) * len); ctx.stroke(); ctx.restore(); }
      };
      o.update(0); this.beamsE.push(o); return o;
    }
    eRail(originFn, track, lock, rico, dmg) {
      const W = this; const o = {
        phase: 'warn', t: 0, a: 0, segs: [], fired: false, update(dt) {
          this.t += dt; const org = originFn(); this.ox = org.x; this.oy = org.y;
          if (this.t < track) { const tp = W.targetPos(); this.a = M.ang(org.x, org.y, tp.x, tp.y); }
          // path (with optional single ricochet)
          this.segs = []; let x = this.ox, y = this.oy, a = this.a;
          for (let k = 0; k <= (rico ? 1 : 0); k++) { const l = M.rayToWall(x, y, a); const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; this.segs.push([x, y, x2, y2]); x = x2; y = y2; if (x <= A.L + 1 || x >= A.R - 1) a = Math.PI - a; else a = -a; }
          if (this.t >= track + lock && !this.fired) { this.fired = true; this.phase = 'live'; W.sfx('heavy', 1.2); W.shake(4); const P = W.player; for (const s of this.segs) if (M.segDist(P.x, P.y, s[0], s[1], s[2], s[3]) < 7 + P.hitR) { P.hurt(dmg, 'sniper'); break; } }
          if (this.t > track + lock + 0.22) this.dead = true;
        },
        draw(ctx) {
          const locked = this.t >= track; ctx.save();
          for (const s of this.segs) {
            if (this.phase === 'live') { W.drawLaser(ctx, s[0], s[1], s[2], s[3], 14, 'live', 1); continue; }
            ctx.globalAlpha = locked ? (0.6 + 0.4 * Math.sin(W.time * 40)) : 0.5; ctx.strokeStyle = locked ? P.warn : P.enemy; ctx.lineWidth = locked ? 5 : 2; ctx.setLineDash(locked ? [] : [10, 8]);
            ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
          }
          ctx.restore();
        }
      };
      o.update(0); this.beamsE.push(o); return o;
    }
    eBlast(x, y, r, delay, dmg, src, o = {}) {
      const W = this; const B = { phase: 'warn', t: 0, x, y, r, update(dt) { this.t += dt; if (this.t >= delay) { this.dead = true; W.eBlastNow(x, y, r, dmg, src); if (o.shrap) for (let k = 0; k < 6; k++) W.eBullet(x, y, k / 6 * Math.PI * 2 + 0.3, 150, { src, r: 5, kind: 'frag' }); } }, draw(ctx) { const k = this.t / delay; ctx.save(); ctx.globalAlpha = 0.18 + 0.12 * Math.sin(W.time * 25); ctx.fillStyle = P.warn; art.circ(ctx, x, y, r); ctx.fill(); ctx.globalAlpha = 0.95; ctx.lineWidth = 3; ctx.strokeStyle = P.warn; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 5; ctx.strokeStyle = P.enemy; ctx.beginPath(); ctx.arc(x, y, r * (1 - k) + 4, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } };
      this.beamsE.push(B); return B;
    }
    eBlastNow(x, y, r, dmg, src) {
      this.hitPlayerCircle(x, y, r - this.player.hitR * 0.5, dmg, src);
      this.fx.push({ type: 'eblast', x, y, t: 0, life: 0.35, size: r }); this.sfx('smallboom'); this.shake(3);
      for (let i = 0; i < 6; i++) this.fxPuff(x + M.rand(-r, r) * 0.5, y + M.rand(-r, r) * 0.5, 10, P.inkSoft);
    }
    eMortar(from, x, delay, r, fire) {
      const W = this; const fy = A.B; const o = {
        phase: 'warn', t: 0, x, update(dt) {
          this.t += dt;
          if (this.t >= delay && !this.hit) { this.hit = true; this.phase = 'live'; W.eBlastNow(x, fy, r, 16, 'mortar'); if (fire) this.fireT = 2.5; }
          if (this.hit) { if (this.fireT > 0) { this.fireT -= dt; W.hitPlayerRect(x, fy - 14, 48, 14, 10, 'mortar'); } else this.dead = true; }
        },
        draw(ctx) {
          if (!this.hit) {
            const k = this.t / delay; ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(W.time * 22); ctx.fillStyle = P.warn; ctx.beginPath(); ctx.ellipse(x, fy, r, r * 0.35, 0, Math.PI, 0); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = P.warn; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(x, fy, r, Math.PI, 0); ctx.stroke(); ctx.setLineDash([]);
            ctx.lineWidth = 5; ctx.strokeStyle = P.enemy; ctx.beginPath(); ctx.arc(x, fy, Math.max(4, r * (1 - k)), Math.PI, 0); ctx.stroke(); ctx.restore();
            if (k > 0.65) { const sy = M.lerp(A.T, fy - 10, (k - 0.65) / 0.35); art.inkCirc(ctx, x, sy, 9, P.enemy, 2.5); ctx.fillStyle = P.enemyCore; art.circ(ctx, x, sy, 3.5); ctx.fill(); }
          } else if (this.fireT > 0) { for (let i = 0; i < 5; i++) { const fx = x - 40 + i * 20, h = 14 + Math.abs(Math.sin(W.time * 12 + i)) * 12; ctx.fillStyle = i % 2 ? P.enemy : P.warn; ctx.beginPath(); ctx.moveTo(fx - 9, fy); ctx.quadraticCurveTo(fx, fy - h * 2, fx + 9, fy); ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.stroke(); } }
        }
      };
      this.fxShellUp(from.x, from.y); this.beamsE.push(o); return o;
    }
    eWarn(o) {
      const W = this; const w = Object.assign({ phase: 'warn', t: 0 }, o);
      w.update = function (dt) { this.t += dt; if (this.t >= this.dur) this.dead = true; };
      w.draw = function (ctx) { if (this.type !== 'floor') return; ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(W.time * 22); art.hazardRect(ctx, A.L, A.B - this.h, A.R - A.L, this.h, 1); ctx.globalAlpha = 1; for (const d of [-1, 1]) for (let i = 1; i < 6; i++) art.text(ctx, d > 0 ? '►' : '◄', this.x + d * i * 90, A.B - this.h - 18, 20, P.warn, 'center', 4); art.text(ctx, 'JUMP!', this.x, A.B - this.h - 46, 22, P.warn, 'center', 5); ctx.restore(); };
      this.beamsE.push(w); return w;
    }
    drawLaser(ctx, x1, y1, x2, y2, w, phase, k) {
      ctx.save(); ctx.lineCap = 'butt';
      if (phase === 'warn') {
        ctx.globalAlpha = 0.22 + 0.18 * Math.sin(this.time * 24); ctx.strokeStyle = art.stripes(ctx); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.globalAlpha = 0.9; ctx.strokeStyle = P.warn; ctx.lineWidth = 2; ctx.setLineDash([12, 8]); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 1; ctx.strokeStyle = P.enemy; ctx.lineWidth = Math.max(1, 3 * k); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      } else {
        ctx.strokeStyle = P.ink; ctx.lineWidth = w + 6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = P.enemy; ctx.lineWidth = w; ctx.stroke(); ctx.strokeStyle = P.enemyCore; ctx.lineWidth = Math.max(2, w * 0.35); ctx.stroke();
      }
      ctx.restore();
    }

    /* ---------- player projectiles ---------- */
    addShot(o) {
      const s = Object.assign({ r: 4, dmg: 5, life: 2, pierce: 0, bounce: 0, kind: 'bolt', src: 'misc', gen: 0, hitCd: 0.25, age: 0, eat: 0 }, o);
      if (this.pShots.length > 700) return s;
      this.pShots.push(s); return s;
    }
    updatePShots(dt) {
      const B = this.build, f = B.f, b = this.boss;
      const deflect = b && b.alive ? b.deflectPhase() : null; const bubbleR = b ? b.size * 0.95 + 18 : 0;
      for (const s of this.pShots) {
        if (s.dead) continue;
        s.age += dt; s.life -= dt;
        // stuck sticky charges / lodged shells
        if (s.stuck) {
          if (s.stuck.ref) { if (!s.stuck.ref.alive) { s.stuck = { wall: true }; } else { s.x = s.stuck.ref.x + s.stuck.ox; s.y = s.stuck.ref.y + s.stuck.oy; } }
          if (s.detonateNow || s.life <= 0.6) { s.dead = true; this.detonate(s, 0); }
          continue;
        }
        if (s.rang) { this.rangUpdate(s, dt); }
        else if (s.saw && s.saw.rolling) { this.sawRoll(s, dt); }
        else {
          if (s.accel) { const sp = Math.hypot(s.vx, s.vy); const ns = Math.min(s.maxSpeed || 900, sp + s.accel * dt); if (sp > 0) { s.vx *= ns / sp; s.vy *= ns / sp; } }
          if (s.drag) { const k = Math.max(0, 1 - s.drag * dt); s.vx *= k; s.vy *= k; }
          if (s.gravity) s.vy += s.gravity * dt;
          if (s.homing && b && b.alive) {
            let t = s.lure && s.lure.t > 0 ? s.lure : this.findTarget(s.x, s.y, { preferModules: s.preferModules });
            if (t) { const sp = Math.hypot(s.vx, s.vy); let ta = M.ang(s.x, s.y, t.x, t.y); if (s.wobble) ta += Math.sin(s.age * s.wobble + s.x) * 0.6; const na = M.turnToward(Math.atan2(s.vy, s.vx), ta, s.homing * dt); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; }
          } else if (s.metal && b && b.alive && b.st.magnet > 0 && !s.big) { const sp = Math.hypot(s.vx, s.vy); const na = M.turnToward(Math.atan2(s.vy, s.vx), M.ang(s.x, s.y, b.x, b.y), 2.2 * dt); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp; }
          s.x += s.vx * dt; s.y += s.vy * dt;
        }
        if (s.rainAt && s.age >= s.rainAt && s.onTimer && !s.rained) { s.rained = true; s.onTimer(this, s); if (s.dead) continue; }
        if (s.airburst && s.age > 0.08 && this.eShotsInCircle(s.x, s.y, 60).length) s.life = 0;
        if (s.detonateNow) { s.dead = true; this.detonate(s, 0); continue; }
        // lenses
        if (!s.lensed && this.lenses.length && !s.rang && !s.saw) for (const l of this.lenses) {
          if (M.dist2(s.x, s.y, l.x, l.y) < (l.r + s.r) * (l.r + s.r)) {
            s.lensed = true; const sp = Math.hypot(s.vx, s.vy), a = Math.atan2(s.vy, s.vx);
            if (l.focus) { s.dmg *= 1.8; s.pierce += 2; s.vx *= 1.3; s.vy *= 1.3; s.focused = true; if (s.explode) s.explode = Object.assign({}, s.explode, { dmg: s.explode.dmg * 1.8 }); }
            else if (s.gen < 2) { const n = l.split; for (let k = 1; k < n; k++) { const aa = a + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.32; const c = Object.assign({}, s, { vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, dmg: s.dmg * l.frac, hits: null, lensed: true, gen: s.gen + 1 }); if (s.explode) c.explode = Object.assign({}, s.explode, { dmg: s.explode.dmg * l.frac }); this.pShots.push(c); } s.dmg *= l.frac; if (s.explode) s.explode = Object.assign({}, s.explode, { dmg: s.explode.dmg * l.frac }); }
            this.fxRing(l.x, l.y, 6, l.r + 8, P.tealLight, 0.15); break;
          }
        }
        // walls
        if (!(s.saw && s.saw.rolling) && !s.rang) {
          const out = s.x - s.r < A.L || s.x + s.r > A.R || s.y - s.r < A.T || s.y + s.r > A.B;
          if (out) {
            if (s.saw && s.saw.roll && !s.bounce) { this.sawAttach(s); }
            else if (s.stick) { s.x = M.clamp(s.x, A.L + 4, A.R - 4); s.y = M.clamp(s.y, A.T + 4, A.B - 4); s.vx = s.vy = 0; s.stuck = { wall: true }; continue; }
            else if (s.bounce > 0) {
              if (s.x - s.r < A.L) { s.x = A.L + s.r; s.vx = Math.abs(s.vx); } else if (s.x + s.r > A.R) { s.x = A.R - s.r; s.vx = -Math.abs(s.vx); }
              if (s.y - s.r < A.T) { s.y = A.T + s.r; s.vy = Math.abs(s.vy); } else if (s.y + s.r > A.B) { s.y = A.B - s.r; s.vy = -Math.abs(s.vy); }
              s.bounce--; s.hits = null;
              if (s.razor) { const sp = Math.hypot(s.vx, s.vy); const ns = Math.min(1100, sp * 1.15); s.vx *= ns / sp; s.vy *= ns / sp; s.dmg *= 1.2; }
              if (s.splitDisc && s.gen < 2 && this.pShots.length < 600) { const a = Math.atan2(s.vy, s.vx) + 0.45, sp = Math.hypot(s.vx, s.vy); this.pShots.push(Object.assign({}, s, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: s.dmg * 0.8, gen: s.gen + 1, hits: null })); s.dmg *= 0.8; s.gen++; }
              this.fxSpark(s.x, s.y, P.tealLight, 2);
            } else if (s.explode) { s.dead = true; this.detonate(s, 0); continue; }
            else { s.dead = true; if (s.onDeath) s.onDeath(this, s); continue; }
          }
        }
        // interactions with enemy bullets
        const canEat = s.eat || (B.s.eater > 0 && !s.big && s.kind !== 'frag' && !s.stick && !s.explode && !s.noHit) || (f.heavyOrd && s.big);
        if (canEat && !s.noHit || s.eat) {
          const list = this.eShotsInCircle(s.x, s.y, s.r + 4);
          for (const e of list) {
            if (e.big && !s.big && !s.devour) continue;
            const chance = s.eat || (s.big && f.heavyOrd) ? 1 : B.s.eater; if (Math.random() > chance) { e.eatChecked = true; continue; }
            this.killEShot(e, s.freeze ? 'freeze' : s.devour ? 'crush' : 'eat');
            if (s.devour && (s.grown || 0) < 20) { s.grown = (s.grown || 0) + 1; s.r *= 1.05; s.dmg += 1; }
            if (s.eatN != null) { s.eatN--; if (s.eatN <= 0) { s.eat = 0; if (s.kind === 'frag') { s.dead = true; break; } break; } }
            if (!s.big && !s.eat) { s.dead = true; break; }
          }
          if (s.dead) continue;
        }
        if (s.skewer > 0) { for (const e of this.eShotsInCircle(s.x, s.y, s.r + 8)) { if (!e.metal || s.skewer <= 0) continue; this.killEShot(e, 'cut'); s.skewer--; } }
        // hits
        if (!s.noHit && b) {
          const r = s.r;
          if (deflect === 'on' && M.dist2(s.x, s.y, b.x, b.y) < (bubbleR + r) * (bubbleR + r) && !s.stuck) { s.dead = true; this.fxSpark(s.x, s.y, P.white, 3); if (this.canWord('tink', 0.5)) this.word('TINK', s.x, s.y - 12, 'small'); continue; }
          const targets = this.targetsInCircle(s.x, s.y, r);
          for (const t of targets) {
            if (s.dead) break;
            if (s.stick && t.kind !== 'boss' && t.kind !== 'module') continue;
            if (s.pierce > 0 || s.hits) { if (!s.hits) s.hits = new Map(); const last = s.hits.get(t.ref); if (last != null && this.time - last < (s.pierce >= 50 ? s.hitCd : 99)) continue; s.hits.set(t.ref, this.time); }
            const o = { proc: true, bonusCrit: s.bonusCrit, ignoreArmor: s.ignoreArmor, metal: s.metal, explosive: !!s.explode };
            if (s.src === 'echo') { if (!s.isEcho) this.echoHit[s.echoId] = this.time; else if (s.resonance && this.time - (this.echoHit[s.echoId] || -9) < 1.2) { o.resonance = true; if (this.canWord('res', 0.4)) this.word('RESONANCE!', s.x, s.y - 20, 'good'); } }
            if (s.stick && (t.kind === 'boss' || t.kind === 'module')) { s.stuck = { ref: b, ox: s.x - b.x, oy: s.y - b.y }; s.vx = s.vy = 0; break; }
            if (s.buster && (t.kind === 'boss' || t.kind === 'module')) { s.dead = true; const ox = s.x - b.x, oy = s.y - b.y; this.detonate(s, 0); this.later(0.5, () => { if (b.alive) this.explodeP(b.x + ox, b.y + oy, s.explode.r, s.explode.dmg, s.src, {}); }); break; }
            if (s.explode && !s.explode.onlyEnd) { s.dead = true; if (s.dmg) this.applyHit(t, s.dmg, s.src, s.x, s.y, o); this.detonate(s, 0); break; }
            if (s.dmg > 0) this.applyHit(t, s.dmg, s.src, s.x, s.y, o);
            if (s.crack && t.kind !== 'enemy') this.statusBoss('cracked', 1, 3);
            if (s.onHit) s.onHit(this, s, t);
            this.fxSpark(s.x, s.y, s.kind === 'needle' ? P.cream : P.tealLight, s.big ? 3 : 2);
            if (s.pierce > 0 && s.pierce < 50) { s.pierce--; if (s.pierce <= 0 && !s.hitCd) { } }
            else if (s.pierce < 50) { s.dead = true; if (s.onDeath) s.onDeath(this, s); break; }
          }
          if (s.dead) continue;
        }
        if (s.life <= 0) { s.dead = true; if (s.explode) this.detonate(s, 0); else if (s.onDeath) s.onDeath(this, s); else if (s.saw || s.kind === 'disc' || s.kind === 'rang') this.fxPuff(s.x, s.y, 8, P.cream); }
      }
      this.pShots = this.pShots.filter(s => !s.dead);
    }
    rangUpdate(s, dt) {
      const r = s.rang, P = this.player; r.t += dt; s.spin = (s.spin || 0) + dt * 18;
      if (r.out) {
        const sp = Math.hypot(s.vx, s.vy); const decel = (s.rangInit || (s.rangInit = sp)) * sp / (2 * r.range) * 1.0;
        const a = Math.atan2(s.vy, s.vx) + r.curve * dt; const ns = Math.max(0, sp - (s.rangInit * s.rangInit / (2 * r.range)) * dt);
        s.vx = Math.cos(a) * ns; s.vy = Math.sin(a) * ns; s.x += s.vx * dt; s.y += s.vy * dt;
        if (ns < 40) { r.out = false; r.hangT = r.hang; r.cx = s.x; r.cy = s.y; s.hits = null; }
      } else if (r.hangT > 0) { r.hangT -= dt; s.x = r.cx + Math.cos(r.t * 9) * 40; s.y = r.cy + Math.sin(r.t * 9) * 40; }
      else { r.back = (r.back || 0) + dt; const a = M.ang(s.x, s.y, P.x, P.gy); const sp = Math.min(900, 200 + r.back * 1400); s.x += Math.cos(a) * sp * dt; s.y += Math.sin(a) * sp * dt; if (M.dist(s.x, s.y, P.x, P.gy) < 24) s.dead = true; }
      s.x = M.clamp(s.x, A.L + s.r, A.R - s.r); s.y = M.clamp(s.y, A.T + s.r, A.B - s.r);
    }
    sawAttach(s) {
      const R = s.r; const L = A.L + R, Rr = A.R - R, T = A.T + R, Bt = A.B - R; s.x = M.clamp(s.x, L, Rr); s.y = M.clamp(s.y, T, Bt);
      const w = Rr - L, h = Bt - T; let u;
      if (s.y >= Bt - 1) u = s.x - L; else if (s.x >= Rr - 1) u = w + (Bt - s.y); else if (s.y <= T + 1) u = w + h + (Rr - s.x); else u = 2 * w + h + (s.y - T);
      const dir = (s.y >= Bt - 1 && s.vx < 0) || (s.x >= Rr - 1 && s.vy > 0) || (s.y <= T + 1 && s.vx > 0) || (s.x <= L + 1 && s.vy < 0) ? -1 : 1;
      s.saw.rolling = true; s.saw.u = u; s.saw.dir = dir; s.saw.per = 2 * (w + h); s.vx = s.vy = 0; s.gravity = 0; this.fxSpark(s.x, s.y, P.cream, 4);
    }
    sawRoll(s, dt) {
      const sw = s.saw, b = this.boss; s.spin = (s.spin || 0) + dt * 20 * sw.dir;
      if (b && b.alive && !sw.hopCd && M.dist(s.x, s.y, b.x, b.y) < 250 + b.h) { sw.rolling = false; sw.hopCd = 0.8; const a = M.ang(s.x, s.y, b.x, b.y); s.vx = Math.cos(a) * 620; s.vy = Math.sin(a) * 620; s.gravity = 900; return; }
      sw.u = ((sw.u + sw.roll * sw.dir * dt) % sw.per + sw.per) % sw.per;
      const R = s.r, L = A.L + R, Rr = A.R - R, T = A.T + R, Bt = A.B - R, w = Rr - L, h = Bt - T; let u = sw.u;
      if (u < w) { s.x = L + u; s.y = Bt; } else if ((u -= w) < h) { s.x = Rr; s.y = Bt - u; } else if ((u -= h) < w) { s.x = Rr - u; s.y = T; } else { u -= w; s.x = L; s.y = T + u; }
      if (Math.random() < dt * 20) this.fxSpark(s.x, s.y, P.warn, 1);
      if (sw.hopCd) sw.hopCd = Math.max(0, sw.hopCd - dt) || 0;
    }
    detonate(s, link) {
      const e = s.explode; if (!e) { if (s.onDeath) s.onDeath(this, s); return; }
      if (s.exploded) return; s.exploded = true; s.dead = true;
      const mult = 1 + (e.chain ? Math.min(6, link) * e.chain : 0);
      this.explodeP(s.x, s.y, e.r, e.dmg * mult, s.src, { cluster: e.cluster, ink: e.ink, soak: e.soak, link, chain: e.chain });
      if (s.onDeath) s.onDeath(this, s);
    }
    explodeP(x, y, r, dmg, src, o = {}) {
      const f = this.build.f;
      for (const t of this.targetsInCircle(x, y, r)) this.applyHit(t, dmg, src, x, y, { explosive: true, proc: !o.noProc, noProcVolatile: true });
      if (o.ink && this.boss && this.boss.alive && M.circleRect(x, y, r, this.boss.x, this.boss.y, this.boss.h, this.boss.h)) this.statusBoss('soaked', 1, 3, { soak: o.soak });
      if (o.cluster) for (let i = 0; i < o.cluster; i++) { const a = Math.random() * Math.PI * 2, sp = M.rand(160, 300); this.addShot({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, gravity: 700, dmg: 0, r: 4, life: M.rand(0.35, 0.6), kind: 'mini', src, gen: 1, explode: { r: 34, dmg: dmg * 0.3 } }); }
      // chain-detonate sticky charges in range
      for (const s of this.pShots) if (s.kind === 'sticky' && !s.dead && !s.exploded && M.dist2(x, y, s.x, s.y) < r * r) { s.chainQueued = true; s.dead = true; const l = (o.link || 0) + 1; this.later(0.06, () => { s.dead = false; s.exploded = false; this.detonate(s, l); s.dead = true; }); }
      if (f.shrap && !o.noShrap) for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.random(); this.addShot({ x, y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, dmg: 5 * this.build.s.dmgMul, r: 3, life: 0.35, kind: 'frag', src: 'shrapnel', eat: 1, eatN: 1, gen: 1 }); }
      if (f.chainEx && !o.secondary && Math.random() < 0.25) this.later(0.15, () => this.explodeP(x + M.rand(-r, r) * 0.5, y + M.rand(-r, r) * 0.5, r * 0.8, dmg * 0.5, src, { secondary: true, noShrap: true }));
      this.fx.push({ type: 'blast', x, y, t: 0, life: 0.32, size: r });
      if (!art.light) for (let i = 0; i < Math.min(6, r / 12); i++) this.fxPuff(x + M.rand(-r, r) * 0.4, y + M.rand(-r, r) * 0.4, 9, P.paperDeep);
      if (r >= 70 && this.canWord('boom', 0.5)) this.word(M.pick(['BOOM!', 'KA-BLAM!', 'BLAM!', 'KRAKOOM!']), x, y - r * 0.6, 'boom');
      this.shake(Math.min(6, r / 25)); this.sfx(r > 60 ? 'boom' : 'smallboom', r > 60 ? 0.6 : 1);
    }
    beamP(x, y, a, len, width, dps, src, dt, o = {}, depth = 0) {
      const L = Math.min(len, M.rayToWall(x, y, a)); const hit = this.rayCast(x, y, a, L);
      let end = hit ? hit.d : L, lens = null;
      if (depth === 0) for (const l of this.lenses) { const dx = l.x - x, dy = l.y - y; const t = dx * Math.cos(a) + dy * Math.sin(a); if (t > 0 && t < end) { const px = x + Math.cos(a) * t, py = y + Math.sin(a) * t; if (M.dist(px, py, l.x, l.y) < l.r) { end = t; lens = l; break; } } }
      const ex = x + Math.cos(a) * end, ey = y + Math.sin(a) * end;
      this.pBeams.push({ x1: x, y1: y, x2: ex, y2: ey, w: width, col: o.col || P.friend });
      if (lens) {
        const rem = len - end;
        if (lens.focus) this.beamP(lens.x, lens.y, a, rem, width * 1.25, dps * 1.6, src, dt, o, 1);
        else for (let k = 0; k < lens.split; k++) this.beamP(lens.x, lens.y, a + (k - (lens.split - 1) / 2) * 0.3, rem, width * 0.7, dps * lens.frac, src, dt, o, 1);
        return { kind: 'lens' };
      }
      if (hit && hit.kind !== 'bubble') { this.applyHit({ kind: hit.kind, ref: hit.ref, x: ex, y: ey }, dps * dt, src, ex, ey, { lowCrit: true, noWord: true, proc: false, beam: true }); if (Math.random() < dt * 25) this.fxSpark(ex, ey, P.tealLight, 2); }
      return hit;
    }
    rayCast(x, y, a, len) {
      const dx = Math.cos(a), dy = Math.sin(a); let best = null;
      const consider = (t, kind, ref) => { if (t != null && t >= 0 && t <= len && (!best || t < best.d)) best = { d: t, kind, ref }; };
      const rc = (cx, cy, r) => { const fx = x - cx, fy = y - cy; const b = fx * dx + fy * dy, c = fx * fx + fy * fy - r * r; if (c < 0) return 0; const disc = b * b - c; if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t >= 0 ? t : null; };
      const b = this.boss;
      if (b && b.alive && b.intro <= 0) {
        if (b.deflectPhase() === 'on') consider(rc(b.x, b.y, b.size * 0.95 + 18), 'bubble', b);
        for (const p of b.plates) if (p.hp > 0 && p.x != null) consider(rc(p.x, p.y, 15), 'plate', p);
        for (const m of b.modules) if (!m.broken) consider(rc(m.x, m.y, m.r), 'module', m);
        // slab test
        let t0 = -Infinity, t1 = Infinity; const mn = [b.x - b.h, b.y - b.h], mx = [b.x + b.h, b.y + b.h], o = [x, y], d = [dx, dy]; let ok = true;
        for (let i = 0; i < 2; i++) { if (Math.abs(d[i]) < 1e-9) { if (o[i] < mn[i] || o[i] > mx[i]) ok = false; } else { let ta = (mn[i] - o[i]) / d[i], tb = (mx[i] - o[i]) / d[i]; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); } }
        if (ok && t0 <= t1 && t1 >= 0) consider(Math.max(0, t0), 'boss', b);
      }
      for (const e of this.enemies) if (e.shootable && !e.dead && e.hp > 0) consider(rc(e.x, e.y, e.r), 'enemy', e);
      return best;
    }
    railP(x, y, a, len, dmg, src, o = {}) {
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len, b = this.boss; const hitR = (o.width || 7) / 2;
      const opts = { proc: true }; let hitAny = false;
      if (b && b.alive && b.intro <= 0) {
        const bub = b.deflectPhase() === 'on' && M.segDist(b.x, b.y, x, y, x2, y2) < b.size * 0.95 + 18;
        if (!bub) {
          for (const p of b.plates) if (p.hp > 0 && p.x != null && M.segDist(p.x, p.y, x, y, x2, y2) < 15 + hitR) this.applyHit({ kind: 'plate', ref: p, x: p.x, y: p.y }, dmg, src, p.x, p.y, opts);
          for (const m of b.modules) if (!m.broken && M.segDist(m.x, m.y, x, y, x2, y2) < m.r + hitR) { this.applyHit({ kind: 'module', ref: m, x: m.x, y: m.y }, dmg, src, m.x, m.y, Object.assign({}, opts, { crit: o.siege })); hitAny = true; }
          const r = this.rayCast(x, y, a, len); const hitsBody = M.segDist(b.x, b.y, x, y, x2, y2) < b.h + hitR;
          if (hitsBody) { const t = r && r.kind === 'boss' ? r.d : M.dist(x, y, b.x, b.y); const hx = x + Math.cos(a) * t, hy = y + Math.sin(a) * t; this.applyHit({ kind: 'boss', ref: b, x: hx, y: hy }, dmg, src, hx, hy, Object.assign({}, opts, { crit: o.siege && b.exposed > 0 })); hitAny = true; if (o.siege) { b.vx += Math.cos(a) * 320; b.x += Math.cos(a) * 24; b.clampToArena(); } }
        } else this.fxSpark(x2, y2, P.white, 4);
      }
      for (const e of this.enemies) if (e.shootable && !e.dead && e.hp > 0 && M.segDist(e.x, e.y, x, y, x2, y2) < e.r + hitR) this.applyHit({ kind: 'enemy', ref: e, x: e.x, y: e.y }, dmg, src, e.x, e.y, {});
      let n = 0; for (const s of this.eShots) { if (s.dead) continue; if (M.segDist(s.x, s.y, x, y, x2, y2) < s.r + hitR + 3) { if (s.hp > 0) { this.killEShot(s, 'zap'); continue; } if (!s.big && n < 3) { this.killEShot(s, 'zap'); n++; } } }
      this.fx.push({ type: 'rail', x: x, y: y, x2, y2, t: 0, life: o.siege ? 0.3 : 0.18, size: o.width || 7 });
      if (hitAny && o.siege) this.word('PIERCE!', x2 * 0.3 + b.x * 0.7, b.y - b.h - 30, 'crit');
    }

    /* ---------- targets ---------- */
    targetsInCircle(x, y, r) {
      const out = []; const b = this.boss;
      if (b && b.alive && b.intro <= 0) {
        for (const p of b.plates) if (p.hp > 0 && p.x != null && M.dist2(x, y, p.x, p.y) < (r + 15) * (r + 15)) out.push({ kind: 'plate', ref: p, x: p.x, y: p.y });
        for (const m of b.modules) if (!m.broken && M.dist2(x, y, m.x, m.y) < (r + m.r) * (r + m.r)) out.push({ kind: 'module', ref: m, x: m.x, y: m.y });
        if (M.circleRect(x, y, r, b.x, b.y, b.h, b.h)) out.push({ kind: 'boss', ref: b, x: M.clamp(x, b.x - b.h, b.x + b.h), y: M.clamp(y, b.y - b.h, b.y + b.h) });
      }
      for (const e of this.enemies) if (e.shootable && !e.dead && e.hp > 0 && M.dist2(x, y, e.x, e.y) < (r + e.r) * (r + e.r)) out.push({ kind: 'enemy', ref: e, x: e.x, y: e.y });
      for (const s of this.eShotsInCircle(x, y, r)) if (s.hp > 0) out.push({ kind: 'eshot', ref: s, x: s.x, y: s.y });
      return out;
    }
    targetsInCone(x, y, a, half, range) {
      const out = []; const b = this.boss;
      const ok = (px, py) => { const d = M.dist(x, y, px, py); return d <= range && (d < 26 || Math.abs(M.wrap(M.ang(x, y, px, py) - a)) <= half); };
      if (b && b.alive && b.intro <= 0) {
        for (const m of b.modules) if (!m.broken && ok(m.x, m.y)) out.push({ kind: 'module', ref: m, x: m.x, y: m.y });
        const cx = M.clamp(x, b.x - b.h, b.x + b.h), cy = M.clamp(y, b.y - b.h, b.y + b.h);
        const ax = M.clamp(x + Math.cos(a) * Math.min(range, M.dist(x, y, b.x, b.y)), b.x - b.h, b.x + b.h), ay = M.clamp(y + Math.sin(a) * Math.min(range, M.dist(x, y, b.x, b.y)), b.y - b.h, b.y + b.h);
        if (ok(cx, cy) || ok(ax, ay) || ok(b.x, b.y)) out.push({ kind: 'boss', ref: b, x: cx, y: cy });
        for (const p of b.plates) if (p.hp > 0 && p.x != null && ok(p.x, p.y)) out.push({ kind: 'plate', ref: p, x: p.x, y: p.y });
      }
      for (const e of this.enemies) if (e.shootable && !e.dead && e.hp > 0 && ok(e.x, e.y)) out.push({ kind: 'enemy', ref: e, x: e.x, y: e.y });
      for (const s of this.eShotsInCone(x, y, a, half, range)) if (s.hp > 0) out.push({ kind: 'eshot', ref: s, x: s.x, y: s.y });
      return out;
    }
    targetsInRect(cx, cy, hw, hh) {
      const out = []; const b = this.boss;
      if (b && b.alive && b.intro <= 0) {
        if (Math.abs(cx - b.x) < hw + b.h && Math.abs(cy - b.y) < hh + b.h) out.push({ kind: 'boss', ref: b, x: M.clamp(cx, b.x - b.h, b.x + b.h), y: M.clamp(cy, b.y - b.h, b.y + b.h) });
        for (const m of b.modules) if (!m.broken && M.circleRect(m.x, m.y, m.r, cx, cy, hw, hh)) out.push({ kind: 'module', ref: m, x: m.x, y: m.y });
      }
      for (const e of this.enemies) if (e.shootable && !e.dead && e.hp > 0 && M.circleRect(e.x, e.y, e.r, cx, cy, hw, hh)) out.push({ kind: 'enemy', ref: e, x: e.x, y: e.y });
      return out;
    }
    findTarget(x, y, o = {}) {
      const b = this.boss; let best = null, bs = Infinity;
      const consider = (kind, ref, tx, ty, d, score) => { if (o.exclude && ref === o.exclude) return; if (o.range && d > o.range) return; if (score < bs) { bs = score; best = { kind, ref, x: tx, y: ty }; } };
      if (b && b.alive && b.intro <= 0) {
        if (!o.modulesOnly) { const cx = M.clamp(x, b.x - b.h, b.x + b.h), cy = M.clamp(y, b.y - b.h, b.y + b.h); const d = M.dist(x, y, cx, cy); consider('boss', b, o.range ? cx : b.x, o.range ? cy : b.y, d, d); }
        for (const m of b.modules) if (!m.broken) { const d = Math.max(0, M.dist(x, y, m.x, m.y) - m.r); consider('module', m, m.x, m.y, d, d - (o.preferModules ? 2000 : 0)); }
      }
      if (o.enemies) for (const e of this.enemies) if (e.shootable && !e.dead && e.hp > 0) { const d = Math.max(0, M.dist(x, y, e.x, e.y) - e.r); consider('enemy', e, e.x, e.y, d, d); }
      return best;
    }

    /* ---------- damage pipeline ---------- */
    calcDamage(dmg, src, x, y, o, isModule) {
      const P = this.player, s = this.build.s, f = this.build.f, b = this.boss;
      let add = 0; const still = Math.abs(P.vx) < 40 && !P.dashing;
      if (!o.dot) {
        if (f.steady && still) add += 0.2;
        if (P.slipT > 0) add += 0.15;
        const dist = M.dist(P.x, P.y, b.x, b.y);
        if (f.longShot && dist > 250) add += Math.min(0.25, (dist - 250) / 25 * 0.01);
        if (s.pointBlank && dist < 220) add += s.pointBlank;
        if (f.reckless) add += Math.min(0.36, Math.floor((1 - P.hp / P.maxHp) * 10) * 0.04);
        if (f.momentum) { const sp = Math.hypot(P.vx, P.vy); if (sp > 150) add += Math.min(0.15, (sp - 150) / 20 * 0.01); }
        if (f.thrustSync && !P.thrusting && P.vy > 60) add += 0.1;
        if (this.inSpotlight) add += 0.15;
        if (f.blitz) add += this.stats.time < 12 ? 0.6 : this.stats.time > 45 ? -0.15 : 0;
        if (f.ember) { const fr = P.hp / P.maxHp; add += fr < 0.25 ? 0.7 : fr < 0.5 ? 0.25 : 0; }
        if (f.combo && !o.beam) { P.combo = (P.combo || 0) + 1; add += Math.min(0.3, Math.floor(P.combo / 10) * 0.02); if (P.combo % 10 === 0 && P.combo <= 150) this.word('COMBO ×' + P.combo, P.x, P.y - 60, 'good'); }
        if (f.static && P.staticN > 0 && !o.beam) { add += 0.5; P.staticN--; }
        if (o.metal && b.st.magnet > 0) add += 0.15;
      }
      let d = dmg * (1 + add);
      let cc = s.critChance + (o.bonusCrit || 0) + (f.steady && still ? 0.1 : 0); if (o.lowCrit) cc *= 0.5;
      let crit = !!o.crit || (!o.noCrit && !o.dot && Math.random() < cc);
      if (o.dot) crit = !!f.dotCrit && Math.random() < s.critChance;
      if (f.weakScan && (isModule || b.exposed > 0) && !o.dot) crit = true;
      let cm = s.critMul;
      if (P.spotterReady && !o.dot && !o.beam && !o.lowCrit) { crit = true; cm += 1; P.spotterReady = false; P.spotT = 5; }
      if (o.resonance) { crit = true; d *= 1.25; }
      if (crit) d *= cm; else if (f.allCrit && !o.dot) d *= 0.75;
      let vul = 1 + (b.st.soaked > 0 ? b.st.soakAmt : 0) + (b.st.cracked > 0 ? 0.1 : 0);
      if (f.acid) vul += Math.min(0.24, (b.st.burn.n + b.st.bleed.n) * 0.015);
      if (b.exposed > 0) vul *= 1.5;
      const armor = (b.exposed > 0 || o.ignoreArmor) ? 0 : b.armor; d *= vul * (1 - armor);
      if (f.paint && !o.dot && x != null && !isModule) { const px = b.x + b.paint.x * b.h, py = b.y + b.paint.y * b.h; if (M.dist(x, y, px, py) < 24) { d *= 1.6; if (this.canWord('paint', 0.6)) this.word('BULLSEYE!', px, py - 24, 'crit'); } }
      return { d, crit };
    }
    applyHit(t, dmg, src, x, y, o = {}) {
      if (!t || dmg <= 0) return 0;
      switch (t.kind) {
        case 'boss': return this.hitBoss(dmg, src, x, y, o);
        case 'module': return this.hitModule(t.ref, dmg, src, x, y, o);
        case 'plate': { const p = t.ref; p.hp -= dmg; if (p.hp <= 0) { p.hp = 0; p.regrow = 8; this.word('CLANG!', p.x, p.y - 16, 'small'); this.fxPuff(p.x, p.y, 12, P.paperDeep); } return dmg; }
        case 'enemy': { const e = t.ref; e.hp -= dmg * (o.explosive ? 1.5 : 1); this.addStat(src, Math.min(dmg, e.hp + dmg)); if (e.hp <= 0 && !e.dead) { e.dead = true; if (e.onKilled) e.onKilled(); } return dmg; }
        case 'eshot': { const s = t.ref; s.hp -= dmg; if (s.hp <= 0) { this.killEShot(s, 'shot'); if (this.canWord('shotdown', 0.6)) this.word('SHOT DOWN!', s.x, s.y - 16, 'small'); } return dmg; }
      }
      return 0;
    }
    hitBoss(dmg, src, x, y, o = {}) {
      const b = this.boss; if (!b || !b.alive || b.intro > 0 || this.state !== 'fight') return 0;
      const r = this.calcDamage(dmg, src, x, y, o, false);
      this.dealt(r.d, src, r.crit, x, y, o);
      b.takeDamage(r.d);
      this.procs(r.d, dmg, src, r.crit, x, y, o);
      return r.d;
    }
    hitModule(m, dmg, src, x, y, o = {}) {
      const b = this.boss; if (!b || !b.alive || this.state !== 'fight') return 0;
      if (m.broken) return this.hitBoss(dmg * 0.5, src, x, y, o);
      const r = this.calcDamage(dmg, src, x, y, o, true);
      const md = r.d * (this.inkQuake && b.st.soaked > 0 ? 2 : 1);
      m.hp -= md; m.hitFlash = 0.1;
      this.dealt(r.d, src, r.crit, x, y, o);
      b.takeDamage(r.d * 0.5);
      if (m.hp <= 0 && !m.broken && b.alive) this.breakModule(m);
      this.procs(r.d, dmg, src, r.crit, x, y, o);
      return r.d;
    }
    dotHit(dmg, kind) { const b = this.boss; if (!b || !b.alive || this.state !== 'fight') return; const r = this.calcDamage(dmg, kind, null, null, { dot: true }, false); this.dealt(r.d, kind, r.crit, b.x, b.y, { noWord: true, dot: true }); b.takeDamage(r.d); }
    dealt(d, src, crit, x, y, o) {
      this.addStat(src, d);
      const P = this.player, f = this.build.f;
      if (f.siphon && P.siphonRate < 3 && P.hp > 0) { const h = Math.min(d * 0.03, 3 - P.siphonRate); P.siphonRate += h; P.heal(h); }
      if (f.heat && P.heatT <= 0) { P.heat += d * 0.0025; if (P.heat >= 1) { P.heat = 0; P.heatT = 3; this.word('OVERHEAT!', P.x, P.y - 50, 'boom'); } }
      if (crit) {
        this.stats.crits++; if (!o.beam && !o.dot && !o.lowCrit) this.stats.critHits = (this.stats.critHits || 0) + 1;
        if (f.vamp && P.vampAcc < 4) { P.vampAcc += 0.5; P.hp = Math.min(P.maxHp, P.hp + 0.5); }
        if (!o.noWord && !o.dot && d > 14 && this.canWord('crit', 0.35)) this.word(M.pick(['KRAK!', 'POW!', 'WHAM!', 'CRUNCH!']), x, y - 24, 'crit');
        if (!o.dot && !o.beam) this.sfx('crit');
      } else if (!o.dot && !o.beam) this.sfx('hit');
      if (d > this.stats.peakHit) this.stats.peakHit = d;
      if (this.settings.dmgNumbers && !o.beam && d >= 3 && this.fx.length < 450) this.fx.push({ type: 'num', x: x + M.rand(-8, 8), y: y - 10, t: 0, life: 0.6, text: Math.round(d), col: crit ? P.warn : P.cream, size: crit ? 18 : 13 });
    }
    procs(d, raw, src, crit, x, y, o) {
      if (o.proc === false || o.dot) return;
      const s = this.build.s, f = this.build.f;
      if (s.burnChance && Math.random() < s.burnChance) this.statusBoss('burn', 1, s.burnDur);
      if (s.bleedChance && Math.random() < s.bleedChance) this.statusBoss('bleed', 1, 4);
      if (f.volatile && !o.explosive && !o.noProcVolatile && !o.secondary && Math.random() < 0.12) this.explodeP(x, y, 40, raw * 0.6, src, { secondary: true, noShrap: true, noProc: true });
      if (f.critSpark && crit && !o.spark) { const b = this.boss; const mods = b.modules.filter(m => !m.broken); const tg = mods.length ? M.pick(mods) : null; this.fxBolt([x, y, tg ? tg.x : b.x, tg ? tg.y : b.y], P.warn, 2); if (tg) this.hitModule(tg, raw * 0.3, 'critspark', tg.x, tg.y, { spark: true, proc: false, noCrit: true }); else this.hitBoss(raw * 0.3, 'critspark', b.x, b.y, { spark: true, proc: false, noCrit: true }); }
    }
    addStat(src, d) { this.stats.dmgBySource[src] = (this.stats.dmgBySource[src] || 0) + d; }
    breakModule(m) {
      const b = this.boss; m.broken = true; m.hp = 0; m.offT = 12 * (b.bb.passives.selfrepair ? 0.6 : 1);
      b.director.cancelAttack(m.id); b.stun(1.0); b.exposed = Math.max(b.exposed, 2.2); b.angry = 6;
      this.word('KRUNCH!', m.x, m.y - 30, 'boom'); this.shake(8); this.sfx('break'); this.flash(0.15);
      for (let i = 0; i < 10; i++) this.fx.push({ type: 'debris', x: m.x, y: m.y, vx: M.rand(-260, 260), vy: M.rand(-380, -60), t: 0, life: 0.9, size: M.rand(4, 9), rot: Math.random() * 6, col: M.pick([P.blue, P.blueMid, P.coral]) });
      this.stats.modulesBroken++;
      if (this.build.f.salvage) this.player.heal(15);
      this.events.push({ type: 'module', name: m.name, attack: m.id, off: m.offT });
    }
    statusBoss(kind, n, dur, o = {}) {
      const b = this.boss; if (!b || !b.alive) return; const st = b.st, s = this.build.s;
      if (kind === 'burn') { const cap = Math.max(s.burnMax, o.max || 0) + (this.build.weapons.some(w => w.id === 'flame' && w.evo === 'a') ? 5 : 0); st.burn.n = Math.min(cap, st.burn.n + n); st.burn.t = Math.max(st.burn.t, s.burnDur || dur); if (o.mult) st.burn.mult = Math.max(st.burn.mult, o.mult); }
      else if (kind === 'bleed') { st.bleed.n = Math.min(12, st.bleed.n + n); st.bleed.t = Math.max(st.bleed.t, dur); }
      else if (kind === 'chill') { st.chill.n = Math.min(o.max || 6, st.chill.n + n); st.chill.dec = 0; }
      else if (kind === 'magnet') st.magnet = Math.max(st.magnet, dur);
      else if (kind === 'soaked') { st.soaked = Math.max(st.soaked, dur); st.soakAmt = Math.max(0.12, o.soak || 0.12); }
      else if (kind === 'cracked') st.cracked = Math.max(st.cracked, dur);
    }
    reelBoss(P) {
      const b = this.boss; if (!b || b.reelCd > 0 || !b.alive) return; b.reelCd = 8;
      const a = M.ang(b.x, b.y, P.x, P.y); b.vx += Math.cos(a) * 520; b.vy += Math.sin(a) * 300;
      let cut = false; for (const r of b.director.active) if (!r.def.big && !r.def.solo && !r.done) { r.cancel(); cut = true; }
      b.director.active = b.director.active.filter(r => !r.done);
      if (cut) this.word('INTERRUPT!', b.x, b.y - b.size, 'good'); else this.word('REELED!', b.x, b.y - b.size, 'small');
    }
    spawnFlares(b) {
      for (let i = 0; i < 3; i++) this.flares.push({ x: b.x, y: b.y, vx: M.rand(-220, 220), vy: M.rand(-260, -120), t: 2 });
      const fl = this.flares.slice(-3);
      for (const s of this.pShots) if (s.seeking && !s.lure && Math.random() < 0.35) s.lure = M.pick(fl);
    }
    onBossDefeated() {
      if (this.state !== 'fight') return;
      this.state = 'victory'; this.stateT = 0; const b = this.boss;
      for (const s of this.eShots) { s.dead = true; this.fx.push({ type: 'confetti', x: s.x, y: s.y, vx: M.rand(-80, 80), vy: M.rand(-160, -40), t: 0, life: 1.2, size: 5, rot: Math.random() * 6, col: M.pick([P.teal, P.coral, P.warn, P.cream]) }); }
      this.eShots = []; for (const e of this.enemies) e.dead = true; for (const be of this.beamsE) be.dead = true; for (const h of this.hazards) h.dead = true;
      this.word('KA-BOOOM!', b.x, b.y - 30, 'boom'); this.shake(14); this.sfx('boom'); this.sfx('victory'); this.flash(0.5);
      for (let i = 0; i < 30; i++) this.fx.push({ type: 'debris', x: b.x + M.rand(-b.h, b.h), y: b.y + M.rand(-b.h, b.h), vx: M.rand(-420, 420), vy: M.rand(-600, -100), t: 0, life: 1.6, size: M.rand(6, 14), rot: Math.random() * 6, col: M.pick([P.coral, P.blue, P.blueMid, P.cream, P.coralDark]) });
      for (let i = 0; i < 8; i++) this.later(i * 0.12, () => this.fx.push({ type: 'blast', x: b.x + M.rand(-60, 60), y: b.y + M.rand(-60, 60), t: 0, life: 0.4, size: M.rand(50, 110), enemy: true }));
      this.events.push({ type: 'victory' });
    }
    onPlayerDefeated(src) {
      if (this.state !== 'fight') return; this.state = 'defeat'; this.stateT = 0; this.stats.killedBy = src;
      this.word('K.O.!', this.player.x, this.player.y - 50, 'hurt'); this.sfx('defeat'); this.shake(12);
      this.events.push({ type: 'defeat', src });
    }
    surfaceBelow(x, y) { let s = A.B; for (const p of this.platforms) if (x >= p.x && x <= p.x + p.w && p.y >= y - 4 && p.y < s) s = p.y; return s; }
    addPlatform(p) { this.platforms.push(Object.assign({ h: 16, dx: 0, dy: 0, x0: p.x }, p)); }
    addAlly(o) { this.allies.push(o); return o; }

    /* ---------- fx ---------- */
    canWord(key, cd = 0.3) { const t = this.wordCd[key] || -9; if (this.time - t < cd) return false; this.wordCd[key] = this.time; return true; }
    word(text, x, y, kind = 'small') {
      if (this.quiet || !this.settings.words) return;
      if (this.words.length >= 5 && kind === 'small') return;
      if (this.words.length >= 7) this.words.shift();
      const st = WORDSTYLE[kind] || WORDSTYLE.small;
      this.words.push({ text, x: M.clamp(x, A.L + 60, A.R - 60), y: M.clamp(y, A.T + 30, A.B - 20), t: 0, dur: kind === 'boss' ? 1.0 : 0.75, rot: M.rand(-0.18, 0.18), size: st.size, bg: st.bg, fg: st.fg });
    }
    floatText(text, x, y, col) { this.fx.push({ type: 'num', x, y, t: 0, life: 0.8, text, col, size: 16 }); }
    shake(a) { if (!this.quiet) this.shakeAmt = Math.max(this.shakeAmt, a); }
    hitstop(t) { if (this.settings.hitstop && !this.quiet) this.hitstopT = Math.max(this.hitstopT, t); }
    flash(a) { if (!this.settings.reducedFlash && !this.quiet) this.flashT = Math.max(this.flashT, a); }
    lim() { return art.light ? 220 : 520; }
    fxSpark(x, y, col, n = 3) { if (this.fx.length > this.lim()) return; for (let i = 0; i < n; i++) { const a = Math.random() * 7, sp = M.rand(80, 260); this.fx.push({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 0.18 + Math.random() * 0.12, col }); } }
    fxPuff(x, y, size, col) { if (this.fx.length > this.lim()) return; this.fx.push({ type: 'puff', x, y, vx: M.rand(-20, 20), vy: M.rand(-40, -10), t: 0, life: 0.5, size, col }); }
    fxSmokeAt(x, y) { if (Math.random() < 0.08) this.fxPuff(x + M.rand(-6, 6), y, 8, P.inkSoft); }
    fxRing(x, y, r0, r1, col, life) { this.fx.push({ type: 'ring', x, y, r0, r1, t: 0, life, col }); }
    fxBolt(pts, col, w = 2) { this.fx.push({ type: 'bolt', pts: pts.slice(), t: 0, life: 0.12, col, w, seed: Math.random() * 100 }); }
    fxFlame(x, y, vx, vy, blue) { if (this.fx.length > this.lim()) return; this.fx.push({ type: 'flame', x, y, vx, vy, t: 0, life: M.rand(0.18, 0.28), size: M.rand(6, 11), blue }); }
    fxJet(Pl) { if (this.fx.length > this.lim() || art.light) return; this.fx.push({ type: 'puff', x: Pl.x - Pl.facing * 18 + M.rand(-3, 3), y: Pl.y + 16, vx: M.rand(-20, 20), vy: 120, t: 0, life: 0.35, size: 5, col: P.paper }); }
    fxShellUp(x, y) { this.fx.push({ type: 'shellup', x, y, t: 0, life: 0.5 }); }
    updateFx(dt) {
      for (const f of this.fx) {
        f.t += dt;
        if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; }
        if (f.type === 'debris' || f.type === 'confetti') { f.vy += 900 * dt; f.rot += dt * 8; if (f.y > A.B - 4) { f.y = A.B - 4; f.vy *= -0.3; f.vx *= 0.6; } }
        if (f.type === 'spark') { f.vx *= 0.9; f.vy *= 0.9; }
        if (f.type === 'flame') { f.vx *= 1 - dt * 3; f.vy = f.vy * (1 - dt * 3) - 200 * dt; }
      }
      this.fx = this.fx.filter(f => f.t < f.life);
      for (const w of this.words) w.t += dt; this.words = this.words.filter(w => w.t < w.dur);
      this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30);
      const sh = this.shakeAmt * (this.settings.shake != null ? this.settings.shake : 0.7);
      this.shakeX = (Math.random() - 0.5) * sh * 2; this.shakeY = (Math.random() - 0.5) * sh * 2;
      this.flashT = Math.max(0, this.flashT - dt * 2); this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    }

    /* ================= draw ================= */
    draw(ctx) {
      const t = this.time, P2 = this.player, set = this.settings;
      ctx.save(); ctx.translate(this.shakeX, this.shakeY);
      // backdrop
      if (this.demoMode) { ctx.fillStyle = '#efe2c4'; ctx.fillRect(0, 0, SO.W, SO.H); ctx.fillStyle = art.halftone(ctx, 'rgba(27,26,46,0.1)', 14, 3); ctx.fillRect(0, 0, SO.W, SO.H); ctx.fillStyle = '#c9a774'; ctx.fillRect(0, A.B, SO.W, SO.H - A.B); ctx.fillStyle = P.ink; ctx.fillRect(0, A.B, SO.W, 5); }
      else {
        const bg = SO.arenaBg(this.arenaId, this.renderScale); const px = -(P2.x - 640) * 0.012;
        ctx.drawImage(bg, px - 8, -4, SO.W + 16, SO.H + 8);
        if (this.arena.live) this.arena.live(ctx, this);
        // depth haze: painted scenery recedes so platforms, warnings and shots pop
        ctx.fillStyle = this.arena.haze || 'rgba(21,35,56,0.25)'; ctx.fillRect(-20, -20, SO.W + 40, A.B - 16 + 20);
      }
      for (const d of this.decals) { ctx.save(); ctx.globalAlpha = Math.max(0, 0.7 * (1 - d.t / 9)); art.text(ctx, 'SQUARE OFF 2', d.x, d.y - 8, 18, P.blueDeep, 'center', 0); ctx.restore(); }
      for (const p of this.platforms) { if (this.arena.drawPlatform) this.arena.drawPlatform(ctx, p); else art.inkRect(ctx, p.x, p.y, p.w, 16, 3, P.paperDeep, 3); }
      for (const h of this.hazards) h.draw(ctx);
      // enemy telegraphs (under everything so actors stay readable)
      for (const be of this.beamsE) if (be.phase === 'warn') be.draw(ctx);
      for (const l of this.lenses) this.drawLens(ctx, l);
      for (const f of this.flares) { art.burst(ctx, f.x, f.y, 9, 6, P.warn, t * 9, 2); }
      if (this.boss) this.boss.draw(ctx);
      for (const e of this.enemies) e.draw(ctx);
      for (const a of this.allies) a.draw(ctx);
      for (const g of this.ghosts) { const k = g.t / g.dur; ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = P.tealLight; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); art.circ(ctx, g.x, g.y, 10 + 6 * (1 - k)); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + Math.cos(g.a) * 18, g.y + Math.sin(g.a) * 18); ctx.stroke(); ctx.restore(); }
      for (const ws of P2.weapons) if (ws.def.draw) ws.def.draw(ctx, this, P2, ws, ws.p);
      if (this.twin && this.twin.ws && this.twin.ws.def.draw) this.twin.ws.def.draw(ctx, this, P2, this.twin.ws, this.twin.ws.p);
      // friendly projectiles
      ctx.save(); ctx.globalAlpha = set.friendlyAlpha != null ? set.friendlyAlpha : 0.8;
      for (const s of this.pShots) this.drawPShot(ctx, s);
      for (const b of this.pBeams) { ctx.lineCap = 'round'; ctx.strokeStyle = P.blueDeep; ctx.lineWidth = b.w + 4; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); ctx.strokeStyle = b.col; ctx.lineWidth = b.w; ctx.stroke(); ctx.strokeStyle = P.white; ctx.lineWidth = Math.max(1.5, b.w * 0.35); ctx.stroke(); }
      for (const w of this.whips) { const k = w.t / 0.18; ctx.strokeStyle = P.warn; ctx.lineWidth = 6 * (1 - k) + 1; ctx.beginPath(); ctx.arc(w.x, w.y, w.r * (0.6 + 0.4 * k), w.a - w.half * (1 - k * 0.3), w.a + w.half * (1 - k * 0.3)); ctx.stroke(); ctx.strokeStyle = P.white; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
      if (this.twin) { ctx.save(); ctx.globalAlpha = 0.55; const tw = { x: this.twin.x, y: this.twin.y, size: P2.size, bodyOff: -4, facing: -P2.facing, look: this.twin.aim || 0, thrusting: P2.thrusting, dashing: P2.dashing, sx: P2.sx, sy: P2.sy, mood: 'focus', aim: this.twin.aim || 0 }; art.drawPlayer(ctx, tw, { paint: 'news', time: t }); ctx.restore(); }
      if (this.decoy && this.decoy.mirage) { ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.min(1, this.decoy.t); art.drawPlayer(ctx, { x: this.decoy.x, y: this.decoy.y + 4, size: P2.size, bodyOff: -4, facing: this.decoy.facing || 1, look: 0, sx: 1, sy: 1, mood: 'focus' }, { char: 'mirage', time: t }); ctx.restore(); }
      else if (this.decoy) { ctx.save(); ctx.globalAlpha = 0.8; art.inkRect(ctx, this.decoy.x - 18, this.decoy.y - 22, 36, 36, 4, '#c9a774', 3); art.text(ctx, '?', this.decoy.x, this.decoy.y - 4, 22, P.cream, 'center', 4); ctx.restore(); }
      if (this.state !== 'defeat' || Math.floor(t * 10) % 2) P2.draw(ctx);
      // enemy projectiles ON TOP of friendly ones for readability
      for (const s of this.eShots) this.drawEShot(ctx, s);
      for (const be of this.beamsE) if (be.phase !== 'warn') be.draw(ctx);
      if (this.arena.front && this.mechanics) this.arena.front(ctx, this);
      this.drawFx(ctx);
      for (const w of this.words) art.word(ctx, w);
      ctx.restore();
      if (!this.demoMode) SO.drawStageFrame(ctx, t, this.arena.accent);
      if (this.flashT > 0) { ctx.fillStyle = `rgba(255,250,240,${this.flashT * 0.5})`; ctx.fillRect(0, 0, SO.W, SO.H); }
      if (this.hurtFlash > 0) { const a = set.reducedFlash ? this.hurtFlash * 0.35 : this.hurtFlash; const g = ctx.createRadialGradient(640, 360, 300, 640, 360, 760); g.addColorStop(0, 'rgba(255,47,99,0)'); g.addColorStop(1, `rgba(255,47,99,${a * 0.55})`); ctx.fillStyle = g; ctx.fillRect(0, 0, SO.W, SO.H); }
      if (!this.demoMode && !this.attract && SO.drawHUD) SO.drawHUD(ctx, this);
    }
    drawLens(ctx, l) {
      const k = Math.min(1, l.t * 5) * Math.min(1, (l.life - l.t) * 3); ctx.save(); ctx.translate(l.x, l.y); ctx.scale(k, k); ctx.rotate(this.time * 0.6);
      ctx.globalAlpha = 0.25; ctx.fillStyle = P.tealLight; art.circ(ctx, 0, 0, l.r); ctx.fill(); ctx.globalAlpha = 0.95;
      art.ink(ctx, () => art.poly(ctx, [0, -l.r * 0.8, l.r * 0.7, l.r * 0.45, -l.r * 0.7, l.r * 0.45]), l.focus ? '#fff6c9' : '#d8fbff', 2.5);
      ctx.restore();
    }
    drawPShot(ctx, s) {
      const a = Math.atan2(s.vy, s.vx);
      switch (s.kind) {
        case 'bolt': case 'light': case 'echo': case 'slug': {
          const len = s.kind === 'slug' ? 22 : 14; ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
          ctx.fillStyle = s.kind === 'light' ? '#d8fbff' : s.kind === 'echo' ? 'rgba(157,245,236,0.6)' : P.friend; art.rr(ctx, -len, -s.r, len + s.r, s.r * 2, s.r); ctx.fill();
          if (s.kind === 'echo') { ctx.strokeStyle = P.teal; ctx.lineWidth = 1.5; ctx.stroke(); }
          ctx.fillStyle = P.white; art.rr(ctx, -len * 0.5, -s.r * 0.45, len * 0.5 + s.r * 0.6, s.r * 0.9, s.r * 0.45); ctx.fill(); ctx.restore(); break;
        }
        case 'pellet': case 'frag': ctx.fillStyle = s.src === 'shrapnel' || s.src === 'flak' ? P.tealLight : P.friend; art.circ(ctx, s.x, s.y, s.r); ctx.fill(); break;
        case 'needle': ctx.strokeStyle = P.white; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - Math.cos(a) * 12, s.y - Math.sin(a) * 12); ctx.stroke(); break;
        case 'rocket': case 'mini': {
          const L = s.kind === 'rocket' ? 16 : 10; ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
          ctx.fillStyle = P.warn; ctx.beginPath(); ctx.moveTo(-L, -3); ctx.lineTo(-L - 8 - Math.random() * 6, 0); ctx.lineTo(-L, 3); ctx.fill();
          art.ink(ctx, () => art.poly(ctx, [-L, -4, L * 0.4, -4, L * 0.8, 0, L * 0.4, 4, -L, 4]), P.cream, 2); ctx.fillStyle = P.teal; ctx.fillRect(L * 0.2, -3, 4, 6); ctx.restore(); break;
        }
        case 'seeker': case 'dart': ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); art.ink(ctx, () => art.poly(ctx, [8, 0, -6, -4.5, -3, 0, -6, 4.5]), P.friend, 1.5); ctx.restore(); break;
        case 'rang': ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin || 0); const rr = s.r; art.ink(ctx, () => { ctx.beginPath(); ctx.moveTo(-rr, rr * 0.5); ctx.quadraticCurveTo(0, -rr * 1.4, rr, rr * 0.5); ctx.quadraticCurveTo(0, -rr * 0.4, -rr, rr * 0.5); ctx.closePath(); }, P.tealLight, 2.5); ctx.restore(); break;
        case 'orb': ctx.save(); ctx.globalAlpha *= 0.45; ctx.fillStyle = P.violet; art.circ(ctx, s.x, s.y, s.r * 1.25); ctx.fill(); ctx.restore(); art.inkCirc(ctx, s.x, s.y, s.r, '#c9b8ff', 2.5); ctx.fillStyle = P.white; art.circ(ctx, s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.25); ctx.fill(); break;
        case 'wellorb': art.inkCirc(ctx, s.x, s.y, s.r, P.violet, 2); break;
        case 'saw': { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin || s.age * 20); ctx.beginPath(); for (let i = 0; i < 16; i++) { const aa = i / 16 * Math.PI * 2, r = i % 2 ? s.r * 0.75 : s.r; ctx.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); } ctx.closePath(); ctx.fillStyle = P.cream; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = P.blueDeep; ctx.stroke(); ctx.fillStyle = P.teal; art.circ(ctx, 0, 0, s.r * 0.3); ctx.fill(); ctx.restore(); break; }
        case 'disc': ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.age * 25); ctx.fillStyle = P.cream; ctx.beginPath(); ctx.ellipse(0, 0, s.r, s.r * 0.55, 0, 0, 7); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.blueDeep; ctx.stroke(); ctx.fillStyle = P.teal; art.circ(ctx, 0, 0, 2.5); ctx.fill(); ctx.restore(); break;
        case 'shell': case 'mortar': art.inkCirc(ctx, s.x, s.y, s.r, s.kind === 'mortar' ? P.blueMid : P.tealDark, 2); ctx.fillStyle = P.tealLight; art.circ(ctx, s.x, s.y, s.r * 0.4); ctx.fill(); break;
        case 'cryo': ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); art.ink(ctx, () => art.poly(ctx, [s.r * 1.6, 0, 0, -s.r, -s.r * 1.2, 0, 0, s.r]), '#d8f3ff', 1.5); ctx.restore(); break;
        case 'glob': ctx.fillStyle = P.blueDeep; art.circ(ctx, s.x, s.y, s.r); ctx.fill(); ctx.strokeStyle = P.tealLight; ctx.lineWidth = 1.5; ctx.stroke(); break;
        case 'harpoon': ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.strokeStyle = P.blueDeep; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(0, 0); ctx.stroke(); art.ink(ctx, () => art.poly(ctx, [10, 0, -2, -6, 1, 0, -2, 6]), P.tealLight, 2); ctx.restore(); ctx.strokeStyle = 'rgba(21,35,56,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(this.player.gx, this.player.gy); ctx.lineTo(s.x, s.y); ctx.stroke(); break;
        case 'sticky': { const blink = s.stuck && (s.dashDet ? Math.floor(this.time * 3) % 2 : (s.life < 1.4 && Math.floor(this.time * 12) % 2)); art.inkCirc(ctx, s.x, s.y, 6.5, P.teal, 2); ctx.fillStyle = blink ? P.warn : P.tealDark; art.circ(ctx, s.x, s.y, 2.5); ctx.fill(); break; }
        case 'blade': ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.age * 20); art.ink(ctx, () => art.poly(ctx, [s.r, 0, 0, s.r * 0.45, -s.r, 0, 0, -s.r * 0.45]), P.cream, 2); ctx.restore(); break;
        case 'napalm': art.inkCirc(ctx, s.x, s.y, s.r, P.warn, 1.5); break;
        default: ctx.fillStyle = P.friend; art.circ(ctx, s.x, s.y, s.r); ctx.fill();
      }
    }
    drawEShot(ctx, s) {
      const t = this.time;
      switch (s.kind) {
        case 'missile': { const a = Math.atan2(s.vy, s.vx); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.fillStyle = P.warn; ctx.beginPath(); ctx.moveTo(-10, -3); ctx.lineTo(-18 - Math.random() * 6, 0); ctx.lineTo(-10, 3); ctx.fill(); art.ink(ctx, () => art.poly(ctx, [-11, -5, 6, -5, 13, 0, 6, 5, -11, 5]), P.enemy, 2.5); ctx.fillStyle = P.enemyCore; ctx.fillRect(-4, -2, 6, 4); ctx.restore(); break; }
        case 'shell': { art.inkCirc(ctx, s.x, s.y, s.r, P.enemy, 3); ctx.fillStyle = P.enemyCore; art.circ(ctx, s.x, s.y, s.r * 0.4); ctx.fill(); if (s.timer != null && s.burstR) { ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 30); ctx.strokeStyle = P.warn; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]); art.circ(ctx, s.x, s.y, s.burstR * (0.4 + 0.6 * (1 - s.timer / 0.9))); ctx.stroke(); ctx.restore(); } break; }
        case 'ball': { art.inkCirc(ctx, s.x, s.y, s.r, P.enemy, 3); ctx.save(); ctx.globalAlpha = 0.9; ctx.strokeStyle = P.warn; ctx.lineWidth = 3; art.circ(ctx, s.x, s.y, s.r * 0.62); ctx.stroke(); ctx.restore(); ctx.fillStyle = P.enemyCore; art.circ(ctx, s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.22); ctx.fill(); if (s.life < 1) { ctx.globalAlpha = 1; } break; }
        case 'blade': SO.drawEBlade(ctx, s.x, s.y, s.r, s.age * 12, 1); break;
        case 'boomer': {
          art.inkCirc(ctx, s.x, s.y, s.r, P.enemy, 2.5); ctx.strokeStyle = P.enemyCore; ctx.lineWidth = 2; art.circ(ctx, s.x, s.y, s.r * 0.5); ctx.stroke();
          if (s.ret && s.ret.phase === 1 && s.owner) { ctx.save(); ctx.globalAlpha = 0.55; ctx.setLineDash([6, 6]); ctx.strokeStyle = P.warn; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.owner.x, s.owner.y); ctx.stroke(); ctx.restore(); }
          break;
        }
        default: {
          const r = s.r; ctx.fillStyle = P.ink; art.circ(ctx, s.x, s.y, r + 2.2); ctx.fill(); ctx.fillStyle = P.enemy; art.circ(ctx, s.x, s.y, r); ctx.fill();
          ctx.fillStyle = P.enemyCore; art.circ(ctx, s.x, s.y, r * 0.45); ctx.fill();
          if (s.big) { ctx.strokeStyle = P.warn; ctx.lineWidth = 2; art.circ(ctx, s.x, s.y, r + 4 + Math.sin(t * 20) * 1.5); ctx.stroke(); }
        }
      }
    }
    drawFx(ctx) {
      const t = this.time;
      for (const f of this.fx) {
        const k = f.t / f.life;
        switch (f.type) {
          case 'spark': ctx.strokeStyle = f.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * 0.03, f.y - f.vy * 0.03); ctx.stroke(); break;
          case 'puff': ctx.save(); ctx.globalAlpha = 0.6 * (1 - k); ctx.fillStyle = f.col; art.circ(ctx, f.x, f.y, f.size * (0.6 + k)); ctx.fill(); ctx.restore(); break;
          case 'pop': ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = 2.5; art.circ(ctx, f.x, f.y, f.size * (0.5 + k)); ctx.stroke(); for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.7; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * f.size * k, f.y + Math.sin(a) * f.size * k); ctx.lineTo(f.x + Math.cos(a) * f.size * (k + 0.5), f.y + Math.sin(a) * f.size * (k + 0.5)); ctx.stroke(); } ctx.restore(); break;
          case 'ring': ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.col; ctx.lineWidth = 4 * (1 - k) + 1; art.circ(ctx, f.x, f.y, M.lerp(f.r0, f.r1, M.easeOut(k))); ctx.stroke(); ctx.restore(); break;
          case 'bolt': { ctx.save(); ctx.strokeStyle = P.ink; ctx.lineWidth = f.w + 3; ctx.lineJoin = 'round'; const path = () => { ctx.beginPath(); for (let i = 0; i < f.pts.length - 2; i += 2) { const x1 = f.pts[i], y1 = f.pts[i + 1], x2 = f.pts[i + 2], y2 = f.pts[i + 3]; if (i === 0) ctx.moveTo(x1, y1); const n = 5; for (let j = 1; j <= n; j++) { const jj = j / n; const jit = j === n ? 0 : (Math.sin(f.seed + j * 12.9 + i) * 10); ctx.lineTo(M.lerp(x1, x2, jj) + jit * (y2 - y1) / (M.dist(x1, y1, x2, y2) + 1), M.lerp(y1, y2, jj) - jit * (x2 - x1) / (M.dist(x1, y1, x2, y2) + 1)); } } }; path(); ctx.stroke(); ctx.strokeStyle = f.col; ctx.lineWidth = f.w; ctx.stroke(); ctx.restore(); break; }
          case 'flame': { ctx.save(); ctx.globalAlpha = 0.85 * (1 - k); ctx.fillStyle = k < 0.3 ? (f.blue ? '#e8fbff' : P.warn) : (f.blue ? '#7fd4ff' : P.coral); art.circ(ctx, f.x, f.y, f.size * (0.6 + k * 0.8)); ctx.fill(); ctx.restore(); break; }
          case 'blast': {
            const r = f.size * M.easeOut(Math.min(1, k * 1.6)); ctx.save(); ctx.globalAlpha = 1 - k * 0.8;
            if (f.enemy) art.burst(ctx, f.x, f.y, r, 10, k < 0.4 ? P.warn : P.coral, f.x, 3);
            else { art.burst(ctx, f.x, f.y, r, 10, k < 0.35 ? P.white : P.tealLight, f.y, 3); ctx.globalAlpha *= 0.6; ctx.fillStyle = P.teal; art.circ(ctx, f.x, f.y, r * 0.5); ctx.fill(); }
            ctx.restore(); break;
          }
          case 'eblast': { const r = f.size * M.easeOut(Math.min(1, k * 1.8)); ctx.save(); ctx.globalAlpha = 1 - k * 0.7; art.burst(ctx, f.x, f.y, r, 11, k < 0.35 ? P.warn : P.enemy, f.x * 0.1, 3); ctx.restore(); break; }
          case 'debris': case 'confetti': ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = 1 - Math.max(0, k - 0.7) / 0.3; art.inkRect(ctx, -f.size / 2, -f.size / 2, f.size, f.size * (f.type === 'confetti' ? 0.5 : 1), 1, f.col, f.type === 'confetti' ? 0 : 2); ctx.restore(); break;
          case 'num': ctx.save(); ctx.globalAlpha = 1 - k; art.text(ctx, String(f.text), f.x, f.y - k * 24, f.size, f.col, 'center', 4); ctx.restore(); break;
          case 'rail': { ctx.save(); ctx.globalAlpha = 1 - k; ctx.lineCap = 'round'; ctx.strokeStyle = P.blueDeep; ctx.lineWidth = f.size + 6; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke(); ctx.strokeStyle = P.friend; ctx.lineWidth = f.size; ctx.stroke(); ctx.strokeStyle = P.white; ctx.lineWidth = f.size * 0.4; ctx.stroke(); ctx.restore(); break; }
          case 'shellup': { const y = f.y - k * 300; art.inkCirc(ctx, f.x, y, 7, P.enemy, 2); break; }
        }
      }
    }
  }
  SO.World = World;
  SO.makeMedkit = function (W, x) {
    return {
      x, y: A.T - 20, t: 0, landed: false, life: 10,
      update(dt) {
        this.t += dt; const floor = W.surfaceBelow(this.x, this.y) - 14;
        if (!this.landed) { this.y += 150 * dt; if (this.y >= floor) { this.y = floor; this.landed = true; } }
        else { this.life -= dt; if (this.life <= 0) this.dead = true; }
        const P = W.player; if (M.dist(P.x, P.y, this.x, this.y) < 34 && P.hp > 0) { P.heal(18); W.word('PATCHED UP!', this.x, this.y - 30, 'good'); this.dead = true; }
      },
      draw(ctx) {
        if (this.landed && this.life < 3 && Math.floor(this.life * 6) % 2) return;
        ctx.save(); ctx.translate(this.x, this.y);
        if (!this.landed) { ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(0, -40); ctx.lineTo(10, -12); ctx.stroke(); art.ink(ctx, () => { ctx.beginPath(); ctx.arc(0, -44, 18, Math.PI, 0); ctx.closePath(); }, P.cream, 2); }
        art.inkRect(ctx, -13, -11, 26, 22, 4, P.white, 2.5); ctx.fillStyle = P.green; ctx.fillRect(-3, -8, 6, 16); ctx.fillRect(-8, -3, 16, 6);
        ctx.restore();
      }
    };
  };
})();
