/* Square Off 2 — the player square: responsive movement, dash, utilities, damage */
'use strict';
(function () {
  const P = SO.PAL, M = SO.M, A = SO.ARENA, art = SO.art;

  class Player {
    constructor(W, B, opts = {}) {
      this.W = W; this.B = B; const s = B.s;
      this.x = opts.x != null ? opts.x : 360; this.y = opts.y != null ? opts.y : A.B - 40;
      this.vx = 0; this.vy = 0;
      this.maxHp = s.maxHp; this.hp = opts.hp != null ? Math.min(opts.hp, s.maxHp) : s.maxHp;
      this.maxShield = s.shield; this.shield = s.shield; this.tempShield = 0;
      this.dashCharges = s.dashCharges; this.dashCdT = 0; this.dashT = 0; this.dashInv = 0; this.dashDir = { x: 1, y: 0 }; this.dashSpeed = 980;
      this.invuln = 0; this.utilCharges = s.utilCharges; this.utilCd = 0;
      this.size = B.f.mega ? 48 : B.f.big ? 42 : B.f.tiny ? 26 : 36; this.bodyOff = -4; this.hitR = s.hitR;
      this.aim = 0; this.facing = 1; this.look = 0; this.sx = 1; this.sy = 1; this.blink = 0; this.nextBlink = 2;
      this.grounded = false; this.onFloor = false; this.thrusting = false; this.dashing = false;
      this.pullX = 0; this.pullY = 0; this.lastHurtT = -99; this.justHit = 0;
      this.overdriveT = 0; this.bubbleT = 0; this.slipT = 0; this.frenzyT = 0; this.graze = 0; this.heat = 0; this.heatT = 0;
      this.spotT = 5; this.spotterReady = false; this.lastStandUsed = false; this.reactCd = 0; this.vampAcc = 0;
      this.grapple = null; this.dropT = 0; this.platform = null; this.cometHit = false; this.ramT = 0; this.phaseLeft = 0;
      this.rateBoost = 1; this.hurtFace = 0; this.trail = []; this.inWater = false;
      this.ablative = s.ablative || 0; this.secondWindUsed = false; this.closeCallHealed = 0; this.siphonRate = 0;
      this.guard = 10; this.guardDelay = 0; this.guardBroken = 0; this.jumps = 0; this.slamming = false; this.reflectLeft = 0;
      this.pod = B.f.pod ? { x: this.x + 60, y: this.y - 90 } : null; this.podTarget = null;
      this.weapons = B.weapons.map(w => this.makeWS(w));
      this.gunList = this.weapons.map(ws => ws);
    }
    makeWS(w) { const def = SO.WEAPONS[w.id]; return { w, id: w.id, def, p: def.calc(w, SO.buildMul(this.B)), cd: Math.random() * 0.3, recoil: 0 }; }
    get gx() { return this.pod ? this.pod.x : this.x; }
    get gy() { return this.pod ? this.pod.y : this.y + this.bodyOff; }
    guardHit(n) { this.guard -= n; this.guardDelay = 1; if (this.guard <= 0) { this.guard = 0; this.guardBroken = 3; this.W.word('GUARD BROKEN', this.x, this.y - 50, 'hurt'); this.W.sfx('break', 0.5); } }
    get mood() { return this.hurtFace > 0 ? 'hurt' : (this.dashing ? 'focus' : 'idle'); }

    update(dt) {
      const W = this.W, I = SO.input, s = this.B.s, f = this.B.f;
      const ctrl = !W.controlLock && !W.aiControl;
      let L = ctrl && I.down('left'), R = ctrl && I.down('right'), U = ctrl && I.down('up'), D = ctrl && I.down('down'), T = ctrl && I.down('thrust');
      if (W.aiControl) { const ai = W.aiControl(this, dt); L = ai.L; R = ai.R; T = ai.T; D = false; U = false; }
      const m = W.mouse;
      if (this.pod) {
        let tx = m.x, ty = m.y; const by = this.y + this.bodyOff; if (M.dist(this.x, by, tx, ty) > 320) { const a = M.ang(this.x, by, tx, ty); tx = this.x + Math.cos(a) * 320; ty = by + Math.sin(a) * 320; }
        const pd = M.dist(this.pod.x, this.pod.y, tx, ty); if (pd > 0.5) { const a = M.ang(this.pod.x, this.pod.y, tx, ty), st = Math.min(pd, 620 * dt); this.pod.x += Math.cos(a) * st; this.pod.y += Math.sin(a) * st; }
        this.pod.x = M.clamp(this.pod.x, A.L + 12, A.R - 12); this.pod.y = M.clamp(this.pod.y, A.T + 12, A.B - 12);
        const t = W.boss && W.boss.alive ? W.findTarget(this.pod.x, this.pod.y, {}) : null; this.podTarget = t;
        this.aim = t ? M.ang(this.pod.x, this.pod.y, t.x, t.y) : M.ang(this.pod.x, this.pod.y, m.x, m.y);
        this.facing = this.pod.x >= this.x ? 1 : -1; this.look = M.ang(this.x, by, this.pod.x, this.pod.y);
      } else { this.aim = Math.atan2(m.y - this.gy, m.x - this.gx); this.facing = m.x >= this.x ? 1 : -1; this.look = this.aim; }
      if (f.bulwark) { if (this.guardBroken > 0) { this.guardBroken -= dt; if (this.guardBroken <= 0) this.guard = 10; } else { this.guardDelay -= dt; if (this.guardDelay <= 0) this.guard = Math.min(10, this.guard + 3 * dt); } }
      // timers
      this.dashInv = Math.max(0, this.dashInv - dt); this.invuln = Math.max(0, this.invuln - dt); this.dropT -= dt; this.justHit -= dt;
      this.hurtFace = Math.max(0, this.hurtFace - dt); this.reactCd = Math.max(0, this.reactCd - dt);
      for (const k of ['overdriveT', 'bubbleT', 'slipT', 'frenzyT', 'heatT']) this[k] = Math.max(0, this[k] - dt);
      if (this.dashCharges < s.dashCharges) { this.dashCdT -= dt; if (this.dashCdT <= 0) { this.dashCharges++; this.dashCdT = this.dashCharges < s.dashCharges ? s.dashCd : 0; if (W.state === 'fight') W.fxRing(this.x, this.y, 22, 8, P.teal, 0.18); } }
      if (this.B.utility && this.utilCharges < s.utilCharges) { this.utilCd -= dt; if (this.utilCd <= 0) { this.utilCharges++; this.utilCd = this.utilCharges < s.utilCharges ? SO.UTILS[this.B.utility].cd * s.utilCdMul : 0; } }
      if (f.spotter && !this.spotterReady) { this.spotT -= dt; if (this.spotT <= 0) this.spotterReady = true; }
      if (f.anchor) { this.plantT = Math.abs(this.vx) < 40 && !this.grapple ? (this.plantT || 0) + dt : 0; const was = this.planted; this.planted = this.plantT >= 0.4; if (this.planted && !was && W.state === 'fight') W.fxRing(this.x, this.y + 14, 10, 34, P.warn, 0.2); }
      if (f.sponge) this.soakBank = Math.min(5, (this.soakBank || 0) + dt * 5);
      if (f.mirage && W.state === 'fight') { this.mirT = (this.mirT == null ? 3 : this.mirT) - dt; if (this.mirT <= 0) { this.mirT = 5; W.decoy = { x: this.x, y: this.y + this.bodyOff, t: 1.5, mirage: true, facing: this.facing }; W.fxRing(this.x, this.y, 8, 40, '#9ad8ff', 0.25); } }
      if (this.maxShield > 0 && W.time - this.lastHurtT > s.shieldDelay) this.shield = Math.min(this.maxShield, this.shield + s.shieldRate * dt);
      this.siphonRate = Math.max(0, this.siphonRate - dt * 3);
      if (this.tempShield > 0 && W.time - this.lastHurtT > 4 && !f.overshield) this.tempShield = Math.max(0, this.tempShield - dt);
      if (s.regen && W.time - this.lastHurtT > 4 && this.hp > 0) { const nh = this.hp + s.regen * dt; if (nh > this.maxHp && f.overshield) this.tempShield = Math.min(30, this.tempShield + nh - this.maxHp); this.hp = Math.min(this.maxHp, nh); }
      this.vampAcc = Math.max(0, this.vampAcc - dt * 4);
      this.nextBlink -= dt; if (this.nextBlink <= 0) { this.blink = 0.12; this.nextBlink = M.rand(2, 5); } this.blink = Math.max(0, this.blink - dt);
      this.inWater = W.waterY != null && this.y > W.waterY;
      const heavy = W.challenges.includes('heavy');
      const dir = (R ? 1 : 0) - (L ? 1 : 0);
      if (ctrl && I.take('util')) this.useUtility();
      // grapple flight overrides physics
      if (this.grapple) {
        const g = this.grapple; g.t += dt; const a = M.ang(this.x, this.y, g.tx, g.ty); const d = M.dist(this.x, this.y, g.tx, g.ty); const st = Math.min(d, 1300 * dt);
        this.x += Math.cos(a) * st; this.y += Math.sin(a) * st; this.invuln = Math.max(this.invuln, 0.05);
        if (d < 12 || g.t > 0.5) { this.vx = Math.cos(a) * 320; this.vy = Math.sin(a) * 320; this.grapple = null; }
        this.collide(this.y + this.bodyOff + this.size / 2, false); this.updateWeapons(dt); return;
      }
      if (this.B.f.anchor) { if (ctrl && I.take('dash') && W.canWord('anch', 1.5)) W.word('ANCHORED', this.x, this.y - 44, 'small'); }
      else if (ctrl && I.take('dash') && this.dashCharges > 0 && this.dashT <= 0) this.startDash(dir, U, D);
      else if (W.aiDash && W.aiDash(this) && this.dashCharges > 0 && this.dashT <= 0) this.startDash(dir || this.facing, false, false);
      if (this.dashT > 0) {
        this.dashT -= dt; this.dashing = true; this.thrusting = false;
        this.vx = this.dashDir.x * this.dashSpeed; this.vy = this.dashDir.y * this.dashSpeed;
        this.trail.push({ x: this.x, y: this.y, t: 0.18 });
        if (this.dashT <= 0) { this.dashing = false; this.vx *= 0.42; this.vy *= 0.42; }
      } else {
        this.dashing = false;
        const maxSpd = 330 * s.speedMul * (this.slipT > 0 ? 1.35 : 1) * (this.inWater ? 0.78 : 1);
        if (dir) { let acc = this.grounded ? 3000 : 2300; if (Math.sign(this.vx) !== dir && Math.abs(this.vx) > 20) acc *= 1.8; if (Math.abs(this.vx) > maxSpd && Math.sign(this.vx) === dir) acc = 900; this.vx = M.approach(this.vx, dir * maxSpd, acc * dt); }
        else this.vx = M.approach(this.vx, 0, (this.grounded ? 2600 : 950) * dt);
        const g = 1500 * (heavy ? 1.35 : 1) * (this.inWater ? 0.45 : 1);
        if (f.grounded) {
          this.thrusting = false; if (this.grounded) { this.jumps = 2; if (ctrl) I.take('down', 1e7); }
          if (ctrl && I.take('thrust') && this.jumps > 0) { this.vy = -720 * Math.sqrt(s.thrustMul) * (this.inWater ? 0.75 : 1); this.jumps--; this.slamming = false; this.platform = null; this.sx = 0.8; this.sy = 1.25; W.fxPuff(this.x, this.y + 12, 9, P.paperDeep); W.sfx('dash', 0.4); }
          if (!this.grounded && ctrl && I.take('down') && !this.slamming) { this.slamming = true; this.vy = 1250; this.sx = 0.8; this.sy = 1.25; }
        }
        else this.thrusting = T;
        if (T && !f.grounded) { const ta = 2750 * s.thrustMul * (heavy ? 1.15 : 1) * (this.inWater ? 0.8 : 1); this.vy -= ta * dt; const maxUp = -420 * Math.sqrt(s.thrustMul); if (this.vy < maxUp) this.vy = M.approach(this.vy, maxUp, 3200 * dt); if (Math.random() < dt * 30) W.fxJet(this); }
        this.vy += g * dt * (f.grounded && T && this.vy < 0 ? 0.55 : 1);
        let term = D ? 760 : 540; if (f.hover && !T && !dir && !D) term = 190; if (this.inWater) term *= 0.5;
        if (this.vy > term && !this.slamming) this.vy = M.approach(this.vy, term, 2600 * dt);
        this.vx += this.pullX * dt; this.vy += this.pullY * dt;
      }
      this.pullX = 0; this.pullY = 0;
      for (const tr of this.trail) tr.t -= dt; this.trail = this.trail.filter(tr => tr.t > 0);
      // move & collide
      const prevBottom = this.y + this.bodyOff + this.size / 2;
      if (this.grounded && this.platform) { this.x += this.platform.dx || 0; this.y += this.platform.dy || 0; }
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.grounded && this.onFloor && W.floorPush && !this.dashing) this.x += W.floorPush * dt;
      this.collide(prevBottom, D);
      if (this.slamming && (this.grounded || this.dashing)) { const landed = this.grounded; this.slamming = false; if (landed) this.groundPound(); }
      // squash & stretch recovery
      if (this.thrusting && !this.dashing) { this.sx = M.lerp(this.sx, 0.94, dt * 10); this.sy = M.lerp(this.sy, 1.07, dt * 10); }
      else if (!this.grounded && this.vy > 300) { this.sx = M.lerp(this.sx, 0.95, dt * 8); this.sy = M.lerp(this.sy, 1.06, dt * 8); }
      else { this.sx = M.lerp(this.sx, 1, Math.min(1, dt * 12)); this.sy = M.lerp(this.sy, 1, Math.min(1, dt * 12)); }
      // dash interactions
      if (this.dashing && f.closeCall && this.closeCallHealed < 12) { for (const sh of W.eShotsInCircle(this.x, this.y, this.hitR + 18)) { if (sh.ccDone) continue; sh.ccDone = true; this.closeCallHealed += 2; this.heal(2); if (W.canWord('cc', 0.6)) W.word('CLOSE CALL!', this.x, this.y - 44, 'good'); if (this.closeCallHealed >= 12) break; } }
      if (this.dashing && this.reflectLeft > 0) {
        let n = 0;
        for (const sh of W.eShotsInCircle(this.x, this.y, this.hitR + 30)) {
          if (this.reflectLeft <= 0) break; W.killEShot(sh, 'eat'); this.reflectLeft--; n++;
          const tb = W.boss; const a = tb && tb.alive ? M.ang(sh.x, sh.y, tb.x, tb.y) : Math.atan2(-sh.vy, -sh.vx);
          W.addShot({ x: sh.x, y: sh.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, dmg: (12 + 2 * W.round) * s.dmgMul, r: 5, life: 2.5, homing: 7, maxSpeed: 950, accel: 900, kind: 'seeker', src: 'reflect', seeking: true });
        }
        if (n && W.canWord('refl', 0.4)) { W.word('REFLECT!', this.x, this.y - 44, 'good'); W.sfx('shield'); }
      }
      if (this.dashing && this.phaseLeft > 0) { for (const sh of W.eShotsInCircle(this.x, this.y, this.hitR + 16)) { if (this.phaseLeft <= 0) break; if (sh.big) continue; W.killEShot(sh, 'erase'); this.phaseLeft--; } }
      const b = W.boss;
      if (b && b.alive && b.intro <= 0) {
        const over = M.circleRect(this.x, this.gy, this.size * 0.45, b.x, b.y, b.h, b.h);
        if (this.dashing && (f.comet || f.shoulder) && !this.cometHit && over) { this.cometHit = true; const big = !!f.comet; W.hitBoss((big ? 90 : 40) * s.dmgMul, big ? 'comet' : 'shoulder', this.x, this.y, {}); b.stun(big ? 0.5 : 0.25); b.vx += this.dashDir.x * 420; W.word(big ? 'COMET!' : 'SHOULDER!', this.x, this.y - 40, 'good'); W.shake(6); }
        if (s.ram > 0 && over) { this.ramT += dt; if (this.ramT >= 0.1) { this.ramT -= 0.1; W.hitBoss(s.ram * 0.1, 'ram', this.x, this.y, { noWord: true, lowCrit: true }); b.vx += (b.x > this.x ? 1 : -1) * 60; W.fxSpark(this.x + (b.x - this.x) * 0.3, this.y, P.warn, 2); } }
      }
      // fire-rate boosts
      let rb = 1; if (this.overdriveT > 0) rb *= 1.6; if (this.frenzyT > 0) rb *= 1.4; if (f.thrustSync && this.thrusting) rb *= 1.2; if (this.heatT > 0) rb *= 2; if (this.planted) rb *= 1.4;
      this.rateBoost = rb;
      this.updateWeapons(dt);
    }
    updateWeapons(dt) {
      const W = this.W; if (W.weaponsOff) return;
      const prevM = W.mouseOverride; if (this.pod && this.podTarget) W.mouseOverride = { x: this.podTarget.x, y: this.podTarget.y };
      const jug = this.B.f.juggle && this.weapons.length > 1 ? Math.floor(W.time / 4) % this.weapons.length : -1;
      if (jug >= 0 && jug !== this.jugLast) { this.jugLast = jug; if (W.state === 'fight') W.word('★ ' + this.weapons[jug].def.name.toUpperCase(), this.x, this.y - 58, 'good'); }
      this.weapons.forEach((ws, wi) => { ws.jug = jug < 0 ? 1 : wi === jug ? 2.5 : 0.75; });
      for (const ws of this.weapons) {
        ws.recoil = Math.max(0, ws.recoil - dt * 6);
        try {
          if (ws.def.update) ws.def.update(W, this, ws, ws.p, dt);
          else { ws.cd -= dt * this.rateBoost * (ws.jug || 1); if (ws.cd <= 0) { ws.def.fire(W, this, ws, ws.p); ws.cd += 1 / ws.p.rate; if (ws.cd < -0.1) ws.cd = 0; } }
          if (ws.def.extra) ws.def.extra(W, this, ws, ws.p, dt);
        } catch (e) { console.error('weapon', ws.id, e); }
      }
      if (this.pod) W.mouseOverride = prevM;
    }
    groundPound() {
      const W = this.W, s = this.B.s; this.sx = 1.4; this.sy = 0.7; W.shake(6); W.sfx('boom', 0.6); W.fxRing(this.x, this.y + 12, 10, 150, P.warn, 0.3); W.word('SLAM!', this.x, this.y - 40, 'boom');
      for (const sh of W.eShotsInCircle(this.x, this.y, 140)) W.killEShot(sh, 'erase');
      const b = W.boss; if (b && b.alive && M.circleRect(this.x, this.y, 160, b.x, b.y, b.h, b.h)) { W.hitBoss(60 * s.dmgMul, 'slam', b.x, b.y + b.h, {}); b.vy -= 200; }
    }
    collide(prevBottom, D) {
      const W = this.W, half = this.size / 2;
      const wasGround = this.grounded, landV = this.vy; this.grounded = false; this.onFloor = false;
      if (this.x - half < A.L) { this.x = A.L + half; if (this.vx < 0) this.vx = 0; }
      if (this.x + half > A.R) { this.x = A.R - half; if (this.vx > 0) this.vx = 0; }
      if (this.y + this.bodyOff - half < A.T) { this.y = A.T + half - this.bodyOff; if (this.vy < 0) this.vy = 0; }
      const bot = this.y + this.bodyOff + half;
      if (bot >= A.B) { this.y = A.B - half - this.bodyOff; if (this.vy > 0) this.vy = 0; this.grounded = true; this.onFloor = true; this.platform = null; }
      else if (this.vy >= 0 && this.dropT <= 0 && !this.grapple) {
        for (const p of W.platforms) {
          if (this.x + half * 0.7 < p.x || this.x - half * 0.7 > p.x + p.w) continue;
          if (prevBottom <= p.y + 6 + Math.abs(p.dy || 0) && bot >= p.y) { this.y = p.y - half - this.bodyOff; this.vy = 0; this.grounded = true; this.platform = p; break; }
        }
      }
      if (!this.grounded) this.platform = null;
      if (this.grounded && !wasGround && landV > 260) { this.sx = 1.28; this.sy = 0.76; W.fxPuff(this.x - 12, this.y + 12, 7, P.paperDeep); W.fxPuff(this.x + 12, this.y + 12, 7, P.paperDeep); }
      if (this.grounded && this.platform && D && !this.dashing) this.dropT = 0.25;
    }
    startDash(dir, U, D) {
      const s = this.B.s, f = this.B.f, W = this.W;
      let dx = dir, dy = (D ? 1 : 0) - (U ? 1 : 0);
      if (!dx && !dy) dx = this.facing;
      const l = Math.hypot(dx, dy); this.dashDir = { x: dx / l, y: dy / l };
      this.dashT = 0.16 * (f.comet ? 1.6 : 1); this.dashSpeed = 980;
      this.dashInv = this.dashT + s.dashIframe - 0.1;
      this.dashCharges--; if (this.dashCdT <= 0) this.dashCdT = s.dashCd;
      this.phaseLeft = f.phase ? 6 : 0; this.reflectLeft = f.reflect ? 12 : 0; this.slamming = false; this.cometHit = false; this.dropT = Math.max(this.dropT, this.dashDir.y > 0.3 ? 0.2 : 0);
      if (f.slip) this.slipT = 1.2 + this.dashT;
      if (f.static) { this.staticN = 3; W.fxRing(this.x, this.y, 6, 40, P.warn, 0.25); }
      if (Math.abs(this.dashDir.x) > 0.5) { this.sx = 1.35; this.sy = 0.72; } else { this.sx = 0.75; this.sy = 1.3; }
      W.sfx('dash'); W.fxRing(this.x, this.y, 8, 30, P.tealLight, 0.2);
      if (f.dashVolley) for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; W.addShot({ x: this.gx, y: this.gy, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, dmg: 12 * s.dmgMul, r: 4, life: 0.8, kind: 'bolt', src: 'dashvolley' }); }
      for (const sh of W.pShots) if (sh.dashDet && !sh.dead && sh.age > 0.15) sh.detonateNow = true;
      W.stats.dashes++;
      if (W.onDash) W.onDash();
    }
    useUtility() {
      const u = this.B.utility, W = this.W, s = this.B.s; if (!u || this.utilCharges <= 0 || W.state !== 'fight') return;
      this.utilCharges--; if (this.utilCd <= 0) this.utilCd = SO.UTILS[u].cd * s.utilCdMul;
      W.sfx('util'); W.stats.utils++; if (W.onUtil) W.onUtil();
      switch (u) {
        case 'eraser': { for (const sh of W.eShots) if (!sh.dead && M.dist(sh.x, sh.y, this.x, this.y) < 230) W.killEShot(sh, 'erase'); W.fxRing(this.x, this.y, 20, 230, P.teal, 0.35); W.word('ERASED!', this.x, this.y - 44, 'good'); break; }
        case 'overdrive': this.overdriveT = 4; W.word('OVERDRIVE!', this.x, this.y - 44, 'good'); break;
        case 'bubble': this.bubbleT = 1.6; W.sfx('shield'); break;
        case 'blink': {
          const a = M.ang(this.x, this.y, W.mouse.x, W.mouse.y), d = Math.min(360, M.dist(this.x, this.y, W.mouse.x, W.mouse.y));
          const ox = this.x, oy = this.y; this.x = M.clamp(this.x + Math.cos(a) * d, A.L + 20, A.R - 20); this.y = M.clamp(this.y + Math.sin(a) * d, A.T + 30, A.B - 16);
          this.vx *= 0.3; this.vy = 0; this.invuln = Math.max(this.invuln, 0.3);
          W.explodeP(ox, oy, 90, 60 * s.dmgMul, 'blink', {}); W.fxRing(this.x, this.y, 34, 4, P.teal, 0.2); break;
        }
        case 'dilate': W.dilateT = 3; W.word('SLOW-MO!', this.x, this.y - 44, 'cold'); break;
        case 'decoy': W.decoy = { x: this.x, y: this.y, t: 3.5 }; W.word('OVER HERE!', this.x, this.y - 44, 'small'); break;
        case 'repair': this.heal(22); break;
        case 'grapple': { const a = M.ang(this.x, this.y, W.mouse.x, W.mouse.y), d = Math.min(420, M.dist(this.x, this.y, W.mouse.x, W.mouse.y)); this.grapple = { tx: M.clamp(this.x + Math.cos(a) * d, A.L + 20, A.R - 20), ty: M.clamp(this.y + Math.sin(a) * d, A.T + 30, A.B - 16), sx: this.x, sy: this.y, t: 0 }; break; }
      }
    }
    hurt(dmg, src) {
      const W = this.W, s = this.B.s, f = this.B.f;
      if (this.invuln > 0 || this.dashInv > 0 || this.bubbleT > 0 || this.grapple || W.state !== 'fight' || this.hp <= 0) return false;
      if (f.fireproof && src === 'hazard') { if (W.canWord('fp', 1)) W.word('FIREPROOF', this.x, this.y - 44, 'small'); return false; }
      W.stats.hitsTaken++;
      if (this.ablative > 0) { this.ablative--; this.invuln = s.iframes; this.lastHurtT = W.time; W.word('PLATE LOST', this.x, this.y - 44, 'small'); W.sfx('break', 0.4); for (let i = 0; i < 4; i++) W.fx.push({ type: 'debris', x: this.x, y: this.y, vx: SO.M.rand(-200, 200), vy: SO.M.rand(-300, -80), t: 0, life: 0.8, size: 6, rot: 0, col: P.blueLight }); W.stats.dmgTaken.blocked = W.stats.dmgTaken.blocked || 0; return true; }
      let d = W.godMode ? 0 : Math.max(1, Math.round(dmg * (s.dmgTakenMul || 1) * (this.planted ? 0.5 : 1)));
      if (f.mirage) this.mirT = Math.max(this.mirT || 0, 5);
      if (this.tempShield > 0) { const a = Math.min(this.tempShield, d); this.tempShield -= a; d -= a; }
      if (this.shield > 0) { const a = Math.min(this.shield, d); this.shield -= a; d -= a; if (this.shield <= 0 && a > 0) W.word('SHIELD DOWN', this.x, this.y - 60, 'small'); }
      this.hp -= d;
      W.stats.dmgTaken[src] = (W.stats.dmgTaken[src] || 0) + dmg; W.stats.lastHitBy = src;
      this.lastHurtT = W.time; this.invuln = s.iframes; this.justHit = 0.12; this.hurtFace = 0.5;
      if (f.reactive && this.reactCd <= 0) { this.reactCd = 6; for (const sh of W.eShots) if (!sh.dead && M.dist(sh.x, sh.y, this.x, this.y) < 160) W.killEShot(sh, 'erase'); W.fxRing(this.x, this.y, 10, 160, P.blueLight, 0.3); }
      if (f.fusehead) { this.invuln = s.iframes; W.explodeP(this.x, this.y, 120, 60 * s.dmgMul, 'fusehead', { noShrap: true }); for (const sh of W.eShotsInCircle(this.x, this.y, 120)) W.killEShot(sh, 'erase'); W.word('KABOOM!', this.x, this.y - 60, 'boom'); }
      if (f.thorns && W.boss && W.boss.alive) { W.hitBoss(45 * s.dmgMul, 'thorns', W.boss.x, W.boss.y, { noCrit: true }); W.word('THORNS!', W.boss.x, W.boss.y - W.boss.size, 'crit'); }
      if (f.combo) { if ((this.combo || 0) >= 10) W.word('COMBO LOST', this.x, this.y - 74, 'small'); this.combo = 0; }
      W.shake(7); W.hitstop(0.07); W.hurtFlash = 0.35; W.sfx('hurt'); W.word(M.pick(['OOF!', 'OUCH!', 'KLANG!', 'BONK!']), this.x, this.y - 44, 'hurt');
      if (f.secondWind && !this.secondWindUsed && this.hp > 0 && this.hp < this.maxHp * 0.3) { this.secondWindUsed = true; this.heal(30); W.word('SECOND WIND!', this.x, this.y - 60, 'good'); }
      if (this.hp <= 0) {
        if (f.lastStand && !this.lastStandUsed) { this.lastStandUsed = true; this.hp = 1; this.invuln = 2; W.word('LAST STAND!', this.x, this.y - 60, 'good'); }
        else { this.hp = 0; W.onPlayerDefeated(src); }
      }
      return true;
    }
    heal(n) { if (this.hp <= 0) return; const before = this.hp; if (this.B.f.overshield && this.hp + n > this.maxHp) this.tempShield = Math.min(30, this.tempShield + (this.hp + n - this.maxHp)); this.hp = Math.min(this.maxHp, this.hp + n); if (this.hp - before >= 1) { this.W.floatText('+' + Math.round(this.hp - before), this.x, this.y - 30, P.green); this.W.sfx('heal'); } }
    addTempShield(n, max) { this.tempShield = Math.min(max, this.tempShield + n); }
    restoreShield(n) { if (this.maxShield > 0) this.shield = Math.min(this.maxShield, this.shield + n); else this.heal(n * 0.5); }

    draw(ctx) {
      const W = this.W, t = W.time, set = W.settings;
      const surf = W.surfaceBelow(this.x, this.y);
      const hgt = M.clamp((surf - this.y) / 400, 0, 1);
      art.floorShadow(ctx, this.x, surf - 2, 20 * (1 - hgt * 0.5), 5 * (1 - hgt * 0.5), 0.45);
      for (const tr of this.trail) { ctx.save(); ctx.globalAlpha = tr.t * 2.5; art.inkRect(ctx, tr.x - this.size / 2, tr.y + this.bodyOff - this.size / 2, this.size, this.size, 7, P.tealLight, 0); ctx.restore(); }
      if (this.grapple) { ctx.save(); ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(this.x, this.gy); ctx.lineTo(this.grapple.tx, this.grapple.ty); ctx.stroke(); art.inkCirc(ctx, this.grapple.tx, this.grapple.ty, 6, P.warn, 2); ctx.restore(); }
      let alpha = 1;
      if (this.invuln > 0 && !this.dashing) alpha = set.reducedFlash ? 0.55 : ((Math.floor(t * 18) % 2) ? 0.35 : 0.95);
      ctx.save(); ctx.globalAlpha = alpha;
      art.drawPlayer(ctx, this, { paint: set.paint, time: t, char: this.B.char, noJet: !!this.B.f.grounded });
      if (!this.pod) art.drawPlayerGuns(ctx, this, this.gunList, t);
      ctx.restore();
      if (this.pod) {
        const pd = this.pod; ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(27,26,46,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x, this.y + this.bodyOff); ctx.lineTo(pd.x, pd.y); ctx.stroke(); ctx.restore();
        art.drawPlayerGuns(ctx, { x: pd.x, y: pd.y + 4, bodyOff: -4, aim: this.aim }, this.gunList, t);
        art.inkCirc(ctx, pd.x, pd.y, 10, P.gold, 2.5); ctx.fillStyle = P.ink; art.circ(ctx, pd.x + Math.cos(this.aim) * 3, pd.y + Math.sin(this.aim) * 3, 3); ctx.fill();
        ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pd.x - 13, pd.y - 13); ctx.lineTo(pd.x + 13, pd.y - 13); ctx.stroke();
      }
      if (this.B.f.bulwark) {
        const k = this.guard / 10, cy = this.y + this.bodyOff; ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = this.guardBroken > 0 ? 0.35 : 0.95;
        ctx.strokeStyle = P.ink; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(this.x, cy, 42, this.aim - 0.96, this.aim + 0.96); ctx.stroke();
        ctx.strokeStyle = this.guardBroken > 0 ? P.inkSoft : k > 0.4 ? P.blueLight : P.warn; ctx.lineWidth = 5; if (this.guardBroken > 0) ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
        if (k > 0) { ctx.strokeStyle = P.white; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.x, cy, 42, this.aim - 0.96 * k, this.aim + 0.96 * k); ctx.stroke(); }
        ctx.restore();
      }
      if (this.ablative > 0) { ctx.save(); ctx.strokeStyle = P.blueLight; ctx.lineWidth = 3; for (let i = 0; i < this.ablative; i++) { art.rr(ctx, this.x - this.size / 2 - 4 - i * 4, this.y + this.bodyOff - this.size / 2 - 4 - i * 4, this.size + 8 + i * 8, this.size + 8 + i * 8, 9); ctx.stroke(); } ctx.restore(); }
      if (this.bubbleT > 0) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = P.tealLight; art.circ(ctx, this.x, this.gy, 34); ctx.fill(); ctx.globalAlpha = 0.9; ctx.lineWidth = 3; ctx.strokeStyle = P.teal; ctx.stroke(); ctx.restore(); }
      if (this.overdriveT > 0 || this.frenzyT > 0 || this.heatT > 0) { ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = this.heatT > 0 ? P.coral : P.warn; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -t * 40; art.circ(ctx, this.x, this.gy, 30); ctx.stroke(); ctx.restore(); }
      // railgun charge lines etc.
      for (const ws of this.weapons) if (ws.def.drawCharge) ws.def.drawCharge(ctx, W, this, ws, ws.p);
      // visible hitbox core (always on top of body)
      art.drawCore(ctx, this.x, this.y, this.hitR, t, set.boldHitbox, this.invuln > 0 && !set.reducedFlash && (Math.floor(t * 18) % 2 === 0));
      // dash cooldown ring (under the player)
      const s = this.B.s;
      if (this.dashCharges < s.dashCharges) {
        const k = 1 - this.dashCdT / s.dashCd;
        ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(27,26,46,0.5)'; ctx.beginPath(); ctx.arc(this.x, this.gy, 27, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
        ctx.strokeStyle = this.dashCharges > 0 ? P.teal : P.warn; ctx.beginPath(); ctx.arc(this.x, this.gy, 27, Math.PI * 0.85, Math.PI * 0.85 - Math.PI * 0.7 * k, true); ctx.stroke(); ctx.restore();
      }
    }
  }
  SO.Player = Player;
})();
