/* Square Off 2 — compact in-game HUD drawn on the stage valance, plus crosshair & banners */
'use strict';
(function () {
  const P = SO.PAL, M = SO.M, A = SO.ARENA, art = SO.art;
  function bar(ctx, x, y, w, h, frac, col, back = P.blueDeep, trail = null) {
    ctx.fillStyle = P.ink; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
    if (trail != null && trail > frac) { ctx.fillStyle = P.cream; ctx.fillRect(x + w * frac, y, w * (trail - frac), h); }
    ctx.fillStyle = col; ctx.fillRect(x, y, w * M.clamp(frac, 0, 1), h);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x, y, w * M.clamp(frac, 0, 1), Math.max(2, h * 0.3));
  }
  function chip(ctx, x, y, text, bg, fg = P.ink) {
    ctx.font = `13px ${art.FONT}`; const w = ctx.measureText(text).width + 12;
    art.inkRect(ctx, x, y, w, 17, 4, bg, 2); ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 6, y + 9);
    return w + 5;
  }
  let bossTrail = 1, trailT = 0;
  SO.drawHUD = function (ctx, W) {
    const Pl = W.player, s = W.build.s, t = W.time, set = W.settings;
    ctx.save();
    // ---- player block ----
    ctx.save(); ctx.translate(38, 8);
    art.inkRect(ctx, 0, 2, 34, 34, 7, P.teal, 2.5); ctx.fillStyle = P.cream; ctx.fillRect(5, 7, 24, 12); ctx.fillStyle = P.ink; art.circ(ctx, 12, 13, 2.5); ctx.fill(); art.circ(ctx, 22, 13, 2.5); ctx.fill();
    const hpf = Pl.hp / Pl.maxHp; const low = hpf < 0.3;
    bar(ctx, 46, 4, 250, 18, hpf, low && !set.reducedFlash && Math.floor(t * 4) % 2 ? P.coral : low ? P.coral : P.teal);
    art.text(ctx, Math.ceil(Pl.hp) + ' / ' + Pl.maxHp, 290, 14, 15, P.cream, 'right', 4);
    art.text(ctx, 'HP', 52, 14, 14, P.cream, 'left', 4);
    if (Pl.maxShield > 0 || Pl.tempShield > 0) { const mx = Math.max(Pl.maxShield, 1); bar(ctx, 46, 28, 250 * Math.min(1, (Pl.maxShield + 20) / 120), 6, Pl.shield / mx, P.blueLight); if (Pl.tempShield > 0) { ctx.fillStyle = P.white; ctx.fillRect(46, 28, 250 * (Pl.tempShield / 120), 6); } }
    // dash pips
    const dx = 316; art.text(ctx, 'SHIFT', dx + (s.dashCharges - 1) * 11, 37, 11, P.cream, 'center', 3);
    for (let i = 0; i < s.dashCharges; i++) {
      const cx = dx + i * 22, cy = 14; const full = i < Pl.dashCharges;
      art.inkCirc(ctx, cx, cy, 9, full ? P.teal : P.blueDeep, 2.5);
      if (!full && i === Pl.dashCharges) { const k = 1 - Pl.dashCdT / s.dashCd; ctx.fillStyle = P.tealDark; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 7, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = full ? P.white : P.inkSoft; ctx.beginPath(); ctx.moveTo(cx - 4, cy - 3); ctx.lineTo(cx + 4, cy); ctx.lineTo(cx - 4, cy + 3); ctx.fill();
    }
    // utility
    const ux = dx + s.dashCharges * 22 + 10;
    if (W.build.utility) {
      const u = SO.UTILS[W.build.utility]; const ready = Pl.utilCharges > 0;
      art.inkRect(ctx, ux, 0, 40, 40, 6, ready ? P.blueMid : P.blueDeep, 2.5);
      if (!ready || Pl.utilCharges < s.utilCharges) { const k = Pl.utilCd / (u.cd * s.utilCdMul); ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = P.ink; ctx.beginPath(); ctx.moveTo(ux + 20, 20); ctx.arc(ux + 20, 20, 19, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.fill(); ctx.restore(); }
      art.text(ctx, 'E', ux + 20, 21, 22, ready ? P.warn : P.inkSoft, 'center', 4);
      if (s.utilCharges > 1) art.text(ctx, '×' + Pl.utilCharges, ux + 36, 34, 12, P.cream, 'center', 3);
      art.text(ctx, u.name.toUpperCase(), ux + 48, 12, 12, P.cream, 'left', 3);
      if (!ready) art.text(ctx, Math.ceil(Pl.utilCd) + 's', ux + 48, 28, 13, P.coralLight, 'left', 3); else art.text(ctx, 'READY', ux + 48, 28, 13, P.teal, 'left', 3);
    }
    // status chips
    let cx = 46; const cy = 40;
    if (Pl.overdriveT > 0) cx += chip(ctx, cx, cy, 'OVERDRIVE ' + Pl.overdriveT.toFixed(1), P.warn);
    if (Pl.frenzyT > 0) cx += chip(ctx, cx, cy, 'ADRENALINE', P.warn); else if (W.build.f.graze && Pl.graze > 0) cx += chip(ctx, cx, cy, 'GRAZE ' + Pl.graze + '/15', P.paper);
    if (W.build.f.heat) cx += chip(ctx, cx, cy, Pl.heatT > 0 ? 'OVERHEAT!' : 'HEAT ' + Math.round(Pl.heat * 100) + '%', Pl.heatT > 0 ? P.coral : P.paper);
    if (Pl.bubbleT > 0) cx += chip(ctx, cx, cy, 'BUBBLE', P.tealLight);
    if (W.dilateT > 0) cx += chip(ctx, cx, cy, 'SLOW-MO', '#bfe9ff');
    if (W.inSpotlight) cx += chip(ctx, cx, cy, 'SPOTLIGHT +15%', P.gold);
    if (Pl.spotterReady) cx += chip(ctx, cx, cy, 'SPOTTER READY', P.warn);
    if (Pl.slipT > 0 && W.build.f.slip) cx += chip(ctx, cx, cy, 'SLIPSTREAM', P.tealLight);
    if (Pl.inWater) cx += chip(ctx, cx, cy, 'WATER: SLOW', P.tealLight);
    if (W.build.f.bulwark) cx += chip(ctx, cx, cy, Pl.guardBroken > 0 ? 'GUARD BROKEN ' + Math.ceil(Pl.guardBroken) + 's' : 'GUARD ' + Math.floor(Pl.guard) + '/10', Pl.guardBroken > 0 ? P.coral : P.blueLight);
    if (W.build.f.grounded) cx += chip(ctx, cx, cy, Pl.grounded ? 'JUMPS 2' : 'JUMPS ' + Pl.jumps + (Pl.slamming ? ' · SLAM!' : ''), P.paper);
    if (W.contract) { const C = SO.CONTRACTS[W.contract.id]; const ok = C.check(W, W.round); cx += chip(ctx, cx, cy, 'CONTRACT: ' + C.text(W.round) + ' · ' + C.prog(W, W.round), ok ? P.green : P.warn); }
    ctx.restore();
    // ---- center: round ----
    const label = W.mode === 'practice' ? 'PRACTICE' : W.mode === 'tutorial' ? 'TUTORIAL' : (W.finale ? 'FINAL CURTAIN' : 'ROUND ' + W.round);
    art.text(ctx, label, 640, 22, 26, P.warn, 'center', 6);
    art.text(ctx, W.arena.name.toUpperCase() + (W.mode === 'endless' ? ' · ENDLESS' : ''), 640, 46, 12, P.cream, 'center', 3);
    // ---- boss block ----
    const b = W.boss;
    if (b) {
      const bx = 852, bw = 392; const f = b.hp / b.maxHp;
      trailT += 1 / 60; if (f > bossTrail || !b.alive) bossTrail = f; else if (trailT > 0.4) bossTrail = Math.max(f, bossTrail - 0.01);
      if (Math.abs(f - (W._lastBossF || 1)) > 0.0001) trailT = 0; W._lastBossF = f;
      const nm = (SO.CHASSIS[b.bb.chassis].name + (b.bb.tier2 ? ' · ' + SO.CHASSIS[b.bb.tier2].name : '')).toUpperCase() + '  MK-' + W.round;
      art.text(ctx, nm, bx + bw, 11, 12, P.coralLight, 'right', 3);
      bar(ctx, bx, 18, bw, 16, f, b.exposed > 0 ? P.warn : P.coral, P.blueDeep, bossTrail);
      ctx.strokeStyle = P.ink; ctx.lineWidth = 3; for (const ph of b.phases) { ctx.beginPath(); ctx.moveTo(bx + bw * ph, 14); ctx.lineTo(bx + bw * ph, 38); ctx.stroke(); }
      art.text(ctx, Math.ceil(b.hp), bx + 6, 27, 13, P.cream, 'left', 3);
      let sx = bx + bw; const chips = [];
      if (b.exposed > 0) chips.push(['EXPOSED ×1.5', P.warn]);
      if (b.armor > 0 && b.exposed <= 0) chips.push(['ARMOR ' + Math.round(b.armor * 100) + '%', P.blueLight]);
      if (b.st.burn.n) chips.push(['BURN ×' + b.st.burn.n, P.coralLight]);
      if (b.st.bleed.n) chips.push(['BLEED ×' + b.st.bleed.n, '#ff9e9e']);
      if (b.st.chill.n) chips.push(['CHILL ×' + b.st.chill.n, '#bfe9ff']);
      if (b.st.soaked > 0) chips.push(['SOAKED', P.blueLight]);
      if (b.st.magnet > 0) chips.push(['MAGNETIZED', P.coralLight]);
      if (b.st.cracked > 0) chips.push(['CRACKED', P.paper]);
      if (b.raging) chips.push(['RAGE', P.enemy]);
      if (b.deflectPhase() === 'on') chips.push(['BUBBLE UP', P.white]);
      const off = b.modules.filter(m => m.broken); for (const m of off) chips.push([m.name.toUpperCase() + ' OFF ' + Math.ceil(m.offT) + 's', P.green]);
      ctx.font = `13px ${art.FONT}`;
      for (let i = 0; i < chips.length; i++) {
        const [txt, col] = chips[i]; const w = ctx.measureText(txt).width + 12;
        if (sx - w - 5 < bx - 4) { const more = '+' + (chips.length - i); const mw = ctx.measureText(more).width + 12; chip(ctx, sx - mw - 5, 40, more, P.paper); break; }
        sx -= w + 5; chip(ctx, sx, 40, txt, col);
      }
    }
    ctx.restore();
    // ---- banners ----
    if (W.state === 'intro' && W.boss) { const k = 1 - W.boss.intro / 1.7; ctx.save(); ctx.globalAlpha = Math.min(1, k * 3); art.burst(ctx, 640, 300, 120, 14, W.finale ? P.coral : P.warn, t, 4); art.text(ctx, W.finale ? 'FINAL CURTAIN' : (W.mode === 'practice' ? 'PRACTICE' : 'ROUND ' + W.round), 640, 284, 44, P.cream, 'center', 8); art.text(ctx, 'GET READY', 640, 330, 20, P.ink, 'center', 0); ctx.restore(); }
    if (W.state === 'fight' && W.stateT < 0.8) { ctx.save(); ctx.globalAlpha = 1 - W.stateT / 0.8; const sc = 1 + W.stateT * 0.6; ctx.translate(640, 300); ctx.scale(sc, sc); art.text(ctx, 'FIGHT!', 0, 0, 70, P.coral, 'center', 10); ctx.restore(); }
    if (W.state === 'victory' && W.stateT > 0.6) { ctx.save(); ctx.globalAlpha = Math.min(1, (W.stateT - 0.6) * 3); art.burst(ctx, 640, 300, 150, 16, P.teal, t * 0.5, 4); art.text(ctx, W.finale && W.mode === 'standard' ? 'CURTAIN CALL!' : 'ROUND CLEAR!', 640, 290, 50, P.cream, 'center', 9); art.text(ctx, 'HULL FULLY REPAIRED', 640, 340, 18, P.ink, 'center', 0); ctx.restore(); }
    if (W.state === 'defeat') { ctx.save(); ctx.globalAlpha = Math.min(1, W.stateT * 2); art.burst(ctx, 640, 300, 130, 12, P.enemy, 0, 4); art.text(ctx, 'K.O.', 640, 300, 64, P.cream, 'center', 10); ctx.restore(); }
    // low HP edge
    if (Pl.hp > 0 && Pl.hp / Pl.maxHp < 0.25 && W.state === 'fight') { const a = set.reducedFlash ? 0.25 : 0.2 + 0.15 * Math.sin(t * 6); ctx.save(); ctx.strokeStyle = `rgba(255,47,99,${a})`; ctx.lineWidth = 16; ctx.strokeRect(A.L + 8, A.T + 8, A.R - A.L - 16, A.B - A.T - 16); ctx.restore(); }
    // crosshair
    if (W.state !== 'defeat' && !W.hideCrosshair) {
      const m = SO.input.mouse; ctx.save(); ctx.translate(m.x, m.y);
      ctx.strokeStyle = P.ink; ctx.lineWidth = 5; art.circ(ctx, 0, 0, 11); ctx.stroke(); ctx.strokeStyle = P.cream; ctx.lineWidth = 2.5; ctx.stroke();
      for (const [x1, y1, x2, y2] of [[-18, 0, -7, 0], [7, 0, 18, 0], [0, -18, 0, -7], [0, 7, 0, 18]]) { ctx.strokeStyle = P.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = P.cream; ctx.lineWidth = 2.5; ctx.stroke(); }
      ctx.fillStyle = P.coral; art.circ(ctx, 0, 0, 2.5); ctx.fill(); ctx.restore();
    }
  };
})();
