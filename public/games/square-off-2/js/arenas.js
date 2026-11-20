/* Square Off 2 — arenas: painted miniature stage sets, layouts, gradual hazards */
'use strict';
(function () {
  const P = SO.PAL, M = SO.M, A = SO.ARENA, art = SO.art;
  const ARENAS = SO.ARENAS = {};
  SO.ARENA_ORDER = ['print', 'factory', 'flooded', 'theater', 'drafting'];
  SO.arenaForRound = (round, mode) => {
    const i = Math.floor((round - 1) / 2) % 5; const id = SO.ARENA_ORDER[i];
    const firstVisit = round <= 10;
    return { id, hazards: !firstVisit || (round - 1) % 2 === 1, mechanics: true };
  };

  /* ---------- shared painting helpers ---------- */
  function paperWall(g, w, h, top, bot) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (!art.light) { g.fillStyle = art.halftone(g, 'rgba(27,26,46,0.08)', 9, 2); g.fillRect(0, 0, w, h); }
  }
  function boards(g, w, y, h, col) {
    g.fillStyle = col; g.fillRect(0, y, w, h);
    g.strokeStyle = 'rgba(27,26,46,0.55)'; g.lineWidth = 2;
    for (let x = -40; x < w; x += 92) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y + h); g.stroke(); }
    g.beginPath(); g.moveTo(0, y + 2); g.lineTo(w, y + 2); g.lineWidth = 4; g.strokeStyle = P.ink; g.stroke();
    if (!art.light) { g.fillStyle = art.halftone(g, 'rgba(27,26,46,0.25)', 6, 1.6); g.fillRect(0, y + h * 0.4, w, h * 0.6); }
  }
  function lightPool(g, x, y, rx, ry, a = 0.22) {
    g.save(); const gr = g.createRadialGradient(x, y, 4, x, y, rx); gr.addColorStop(0, `rgba(255,248,220,${a})`); gr.addColorStop(1, 'rgba(255,248,220,0)'); g.fillStyle = gr; g.scale(1, ry / rx); g.beginPath(); g.arc(x, y * rx / ry, rx, 0, 7); g.fill(); g.restore();
  }
  function spotCone(g, x, y0, y1, w0, w1, a = 0.12) {
    g.save(); const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, `rgba(255,246,214,${a * 1.6})`); gr.addColorStop(1, `rgba(255,246,214,${a * 0.3})`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x - w0, y0); g.lineTo(x + w0, y0); g.lineTo(x + w1, y1); g.lineTo(x - w1, y1); g.closePath(); g.fill(); g.restore();
  }
  function poster(g, x, y, w, h, rot, bg, txt, sub) {
    g.save(); g.translate(x, y); g.rotate(rot); art.inkRect(g, -w / 2, -h / 2, w, h, 2, bg, 3, P.blueLight);
    art.text(g, txt, 0, -h * 0.12, Math.min(28, w / (txt.length * 0.55)), P.cream, 'center', 5); if (sub) art.text(g, sub, 0, h * 0.25, 12, P.ink, 'center', 0);
    g.fillStyle = P.ink; art.circ(g, -w / 2 + 6, -h / 2 + 6, 3); g.fill(); art.circ(g, w / 2 - 6, -h / 2 + 6, 3); g.fill(); g.restore();
  }
  function gear(ctx, x, y, r, teeth, rot, fill, lw = 3) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) { const a = i / (teeth * 2) * Math.PI * 2; const rr = i % 2 ? r : r * 0.82; ctx.lineTo(Math.cos(a - 0.08) * rr, Math.sin(a - 0.08) * rr); ctx.lineTo(Math.cos(a + 0.08) * rr, Math.sin(a + 0.08) * rr); }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = P.ink; ctx.stroke();
    art.inkCirc(ctx, 0, 0, r * 0.32, P.paperDeep, lw * 0.8); ctx.restore();
  }
  SO.drawGear = gear;
  function chain(ctx, x, y0, y1) { ctx.save(); ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5; for (let y = y0; y < y1; y += 12) { ctx.beginPath(); ctx.ellipse(x, y + 6, 3.5, 6, 0, 0, 7); ctx.stroke(); } ctx.restore(); }

  // stage frame: proscenium pillars + valance + stage lip (drawn on top of play area edges)
  SO.drawStageFrame = function (ctx, t, accent = P.coral) {
    ctx.save();
    // pillars
    for (const [x, w] of [[0, A.L], [A.R, SO.W - A.R]]) { ctx.fillStyle = P.blueDeep; ctx.fillRect(x, 0, w, SO.H); ctx.fillStyle = P.blue; ctx.fillRect(x + 4, 0, w - 8, SO.H); ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, -2, w - 3, SO.H + 4); }
    // valance
    ctx.fillStyle = P.blueDeep; ctx.fillRect(0, 0, SO.W, A.T);
    ctx.beginPath(); ctx.moveTo(0, A.T - 14); for (let x = 0; x <= SO.W; x += 40) ctx.quadraticCurveTo(x + 20, A.T + 8, x + 40, A.T - 14); ctx.lineTo(SO.W, 0); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = accent; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.stroke();
    ctx.fillStyle = P.coralDark; ctx.fillRect(0, 0, SO.W, A.T - 30); ctx.strokeRect(-2, -2, SO.W + 4, A.T - 28);
    ctx.fillStyle = P.gold; for (let x = 20; x < SO.W; x += 40) { art.circ(ctx, x, A.T - 22, 3.2); ctx.fill(); }
    // stage lip
    ctx.fillStyle = P.blueDeep; ctx.fillRect(0, A.B, SO.W, SO.H - A.B); ctx.fillStyle = P.coralDark; ctx.fillRect(0, A.B + 4, SO.W, 8); ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, A.B + 1.5); ctx.lineTo(SO.W, A.B + 1.5); ctx.stroke();
    ctx.fillStyle = P.gold; for (let x = 60; x < SO.W; x += 160) { ctx.beginPath(); ctx.moveTo(x - 16, SO.H); ctx.lineTo(x, A.B + 18); ctx.lineTo(x + 16, SO.H); ctx.fill(); }
    ctx.restore();
  };

  /* ---------------- 1. Printing Workshop ---------------- */
  ARENAS.print = {
    name: 'The Printing Workshop', haze: 'rgba(244,234,213,0.42)', sub: 'Rollers, type cases and fresh ink', accent: P.coral,
    hazardName: 'Press Stamp', hazardDesc: 'A giant stamp slams down a striped column after a 1.4s warning.',
    platforms: [{ x: 170, y: 520, w: 210 }, { x: 900, y: 520, w: 210 }, { x: 545, y: 400, w: 190 }],
    paint(g, w, h) {
      paperWall(g, w, h, '#f6ecd6', '#e8d6b2');
      // posters
      poster(g, 150, 170, 150, 190, -0.06, P.coral, 'SQUARE', 'OFF 2 — TONIGHT');
      poster(g, 1130, 180, 140, 170, 0.05, P.blue, 'BOSS!', 'BUILT BY YOU');
      poster(g, 330, 270, 100, 120, 0.08, P.teal, 'INK', 'fresh daily');
      // drying lines with sheets
      g.strokeStyle = P.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 110); g.quadraticCurveTo(640, 150, 1240, 110); g.stroke();
      for (let i = 0; i < 9; i++) { const x = 160 + i * 115, y = 110 + Math.sin(i / 8 * Math.PI) * 38 + 4; art.inkRect(g, x - 26, y, 52, 64, 2, i % 3 === 0 ? '#fff6e2' : i % 3 === 1 ? P.paperDark : '#ffe0d6', 2); g.fillStyle = 'rgba(27,26,46,0.35)'; for (let k = 0; k < 4; k++) g.fillRect(x - 18, y + 12 + k * 10, 36 - k * 6, 4); }
      // press machine silhouettes (mid layer)
      for (const [x, s] of [[640, 1], [1010, 0.72], [260, 0.78]]) {
        g.save(); g.translate(x, 600); g.scale(s, s);
        art.inkRect(g, -170, -250, 340, 250, 10, P.blueMid, 4, P.blueDeep);
        art.inkRect(g, -190, -280, 380, 46, 8, P.blue, 4);
        art.inkRect(g, -140, -200, 280, 120, 6, P.blueDeep, 3);
        g.fillStyle = 'rgba(244,234,213,0.18)'; g.fillRect(-120, -180, 240, 18);
        g.restore();
      }
      lightPool(g, 640, 640, 420, 60, 0.3); spotCone(g, 640, 0, 680, 60, 300, 0.1);
      boards(g, w, A.B - 16, 80, '#b98d5c');
    },
    live(ctx, W) {
      const t = W.time;
      for (const [x, s] of [[640, 1], [1010, 0.72], [260, 0.78]]) {
        for (const dx of [-80, 80]) { gear(ctx, x + dx * s, 600 - 140 * s, 36 * s, 10, t * (dx > 0 ? 1.2 : -1.2), P.paperDeep, 3); }
        // paper feeding through
        ctx.save(); ctx.beginPath(); ctx.rect(x - 140 * s, 600 - 200 * s, 280 * s, 120 * s); ctx.clip(); ctx.fillStyle = P.cream; const off = (t * 60 * s) % (90 * s);
        for (let k = -1; k < 4; k++) { const px = x - 140 * s + k * 90 * s + off; ctx.fillRect(px, 600 - 150 * s, 70 * s, 22 * s); ctx.fillStyle = 'rgba(255,122,92,0.5)'; ctx.fillRect(px + 8 * s, 600 - 144 * s, 30 * s, 8 * s); ctx.fillStyle = P.cream; }
        ctx.restore();
      }
    },
    drawPlatform(ctx, p) { art.inkRect(ctx, p.x, p.y, p.w, 18, 3, '#c4955f', 3, P.coral); ctx.fillStyle = P.ink; for (let x = p.x + 14; x < p.x + p.w - 10; x += 26) { ctx.fillRect(x, p.y + 5, 14, 8); } art.inkRect(ctx, p.x + 10, p.y + 18, 14, A.B - p.y - 18, 2, '#8a6440', 2); art.inkRect(ctx, p.x + p.w - 24, p.y + 18, 14, A.B - p.y - 18, 2, '#8a6440', 2); },
    hazard: { interval: 13, make: W => SO.makeStamp(W) }
  };
  SO.makeStamp = function (W) {
    const tp = W.player; const wdt = 150; const x = M.clamp(tp.x + M.rand(-60, 60), A.L + wdt / 2, A.R - wdt / 2);
    return {
      phase: 'warn', t: 0, x, w: wdt, y: A.T - 160,
      update(dt) {
        this.t += dt;
        if (this.t < 1.4) { this.phase = 'warn'; this.y = A.T - 160 + (this.t / 1.4) * 40; return; }
        this.phase = 'live';
        if (this.t < 1.55) { this.y = M.lerp(A.T - 120, A.B - 120, (this.t - 1.4) / 0.15); }
        else if (this.t < 1.6) { if (!this.slammed) { this.slammed = true; W.shake(8); W.sfx('boom', 0.7); W.word('THUNK!', this.x, A.B - 150, 'boss'); W.decals.push({ type: 'print', x: this.x, y: A.B - 4, t: 0 }); } this.y = A.B - 120; }
        else if (this.t < 2.0) this.y = A.B - 120;
        else this.y = M.lerp(A.B - 120, A.T - 200, (this.t - 2.0) / 0.5);
        if (this.t > 1.45 && this.t < 2.0) W.hitPlayerRect(this.x, (A.T + this.y + 120) / 2, this.w / 2 - 6, (this.y + 120 - A.T) / 2, 15, 'hazard');
        if (this.t > 2.5) this.dead = true;
      },
      draw(ctx) {
        if (this.phase === 'warn') { ctx.save(); ctx.globalAlpha = 0.25 + 0.25 * Math.sin(this.t * 20); SO.art.hazardRect(ctx, this.x - this.w / 2, A.T, this.w, A.B - A.T); ctx.restore(); SO.art.text(ctx, '! STAMP !', this.x, A.B - 30, 20, P.warn, 'center', 5); }
        ctx.save(); ctx.translate(this.x, this.y);
        art.inkRect(ctx, -12, -400, 24, 300, 3, P.blueMid, 3);
        art.inkRect(ctx, -this.w / 2, -100, this.w, 90, 8, P.blue, 4, P.coral); art.inkRect(ctx, -this.w / 2 + 8, -12, this.w - 16, 22, 3, P.ink, 0);
        art.text(ctx, 'SQ2', 0, -55, 34, P.cream, 'center', 5); ctx.restore();
      }
    };
  };

  /* ---------------- 2. Suspended Factory ---------------- */
  ARENAS.factory = {
    name: 'Suspended Factory', haze: 'rgba(21,35,56,0.32)', sub: 'Chain-hung platforms over a conveyor floor', accent: P.teal,
    hazardName: 'Crate Drop', hazardDesc: 'Crates fall on a marked spot (1.3s), then serve as temporary platforms.',
    mechanicDesc: 'The conveyor floor pushes you while grounded. It flips direction every 12s (arrows warn first).',
    platforms: [{ x: 120, y: 470, w: 180, chain: true }, { x: 980, y: 470, w: 180, chain: true }, { x: 520, y: 330, w: 240, chain: true, swing: 1 }],
    paint(g, w, h) {
      paperWall(g, w, h, '#3c5a86', '#20324f');
      g.strokeStyle = 'rgba(244,234,213,0.25)'; g.lineWidth = 6;
      for (let x = 0; x < w; x += 160) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x + 80, 260); g.lineTo(x + 160, 70); g.stroke(); }
      g.fillStyle = 'rgba(244,234,213,0.22)'; g.fillRect(0, 64, w, 10); g.fillRect(0, 256, w, 10);
      // big windows
      for (const x of [220, 640, 1060]) { art.inkRect(g, x - 110, 300, 220, 200, 6, '#f6d98a', 4, P.coral); g.strokeStyle = P.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 300); g.lineTo(x, 500); g.moveTo(x - 110, 400); g.lineTo(x + 110, 400); g.stroke(); lightPool(g, x, 620, 200, 40, 0.25); }
      // pipes
      g.lineCap = 'round'; for (const [x, c] of [[110, '#8f6f88'], [1170, '#4f7f8a']]) { g.strokeStyle = 'rgba(27,26,46,0.7)'; g.lineWidth = 16; g.beginPath(); g.moveTo(x, 64); g.lineTo(x, 680); g.stroke(); g.strokeStyle = c; g.lineWidth = 10; g.stroke(); }
      g.lineCap = 'butt';
      spotCone(g, 300, 64, 680, 30, 200, 0.08); spotCone(g, 980, 64, 680, 30, 200, 0.08);
    },
    live(ctx, W) {
      const t = W.time;
      // hook rail
      ctx.fillStyle = P.ink; ctx.fillRect(A.L, A.T + 18, A.R - A.L, 6);
      for (let i = 0; i < 4; i++) { const x = A.L + ((t * 60 + i * 330) % (A.R - A.L)); chain(ctx, x, A.T + 24, A.T + 110); ctx.strokeStyle = P.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, A.T + 122, 10, -0.2, Math.PI * 1.1); ctx.stroke(); }
      // conveyor floor
      const dir = W.arenaState.conv || 1; const off = (t * 90 * dir) % 40;
      ctx.fillStyle = '#4b4b5e'; ctx.fillRect(A.L, A.B - 14, A.R - A.L, 14);
      ctx.fillStyle = P.warn; for (let x = A.L - 40 + off; x < A.R; x += 40) { ctx.beginPath(); ctx.moveTo(x, A.B - 14); ctx.lineTo(x + 14, A.B - 14); ctx.lineTo(x + 6, A.B); ctx.lineTo(x - 8, A.B); ctx.fill(); }
      ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.strokeRect(A.L, A.B - 14, A.R - A.L, 14);
      for (let x = A.L + 30; x < A.R; x += 120) gear(ctx, x, A.B - 7, 9, 8, t * 6 * dir, P.paperDeep, 2);
      if (W.arenaState.flipWarn > 0) { const nd = -dir; for (let x = A.L + 80; x < A.R; x += 220) art.text(ctx, nd > 0 ? '►►' : '◄◄', x, A.B - 40, 26, P.warn, 'center', 5); }
    },
    update(W, dt) {
      const s = W.arenaState; if (!s.conv) { s.conv = Math.random() < 0.5 ? 1 : -1; s.flipT = 12; }
      s.flipT -= dt; s.flipWarn = s.flipT < 1.5 ? 1 : 0; if (s.flipT <= 0) { s.flipT = 12; s.conv *= -1; }
      W.floorPush = 85 * s.conv;
      for (const p of W.platforms) if (p.swing) { p.x = p.x0 + Math.sin(W.time * 0.7) * 140; }
    },
    drawPlatform(ctx, p) {
      if (p.chain) { chain(ctx, p.x + 16, A.T, p.y); chain(ctx, p.x + p.w - 16, A.T, p.y); }
      if (p.crate) { art.inkRect(ctx, p.x, p.y, p.w, p.h, 4, '#c98d4b', 3, P.coral); ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.w, p.y + p.h); ctx.moveTo(p.x + p.w, p.y); ctx.lineTo(p.x, p.y + p.h); ctx.stroke(); if (p.life < 1.5) art.text(ctx, '!', p.x + p.w / 2, p.y - 14, 18, P.warn, 'center', 4); return; }
      art.inkRect(ctx, p.x, p.y, p.w, 16, 3, P.blueLight, 3, P.teal); ctx.fillStyle = P.ink; for (let x = p.x + 10; x < p.x + p.w - 6; x += 18) { art.circ(ctx, x, p.y + 8, 2.2); ctx.fill(); }
    },
    hazard: { interval: 11, make: W => SO.makeCrate(W) }
  };
  SO.makeCrate = function (W) {
    const x = M.clamp(W.player.x + M.rand(-120, 120), A.L + 60, A.R - 60), size = 70;
    return {
      phase: 'warn', t: 0, x, y: A.T - 80, size,
      update(dt) {
        this.t += dt;
        if (this.t < 1.3) { this.phase = 'warn'; return; }
        this.phase = 'live'; this.y += 900 * dt * Math.min(1, (this.t - 1.3) * 4);
        W.hitPlayerRect(this.x, this.y, size / 2, size / 2, 15, 'hazard');
        const groundY = A.B - 14 - size / 2;
        if (this.y >= groundY) { this.y = groundY; this.dead = true; W.shake(5); W.sfx('smallboom'); W.word('CLUNK!', this.x, this.y - 50, 'small'); W.addPlatform({ x: this.x - size / 2, y: this.y - size / 2, w: size, h: size, crate: true, life: 7 }); }
      },
      draw(ctx) {
        if (this.phase === 'warn') { ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.t * 20); ctx.setLineDash([10, 8]); ctx.strokeStyle = P.warn; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(this.x, A.T); ctx.lineTo(this.x, A.B - 14); ctx.stroke(); ctx.restore(); art.floorShadow(ctx, this.x, A.B - 14, 46 * Math.min(1, this.t), 10, 0.8); SO.art.hazardRect(ctx, this.x - 35, A.B - 26, 70, 10, 0.8); }
        art.inkRect(ctx, this.x - size / 2, this.y - size / 2, size, size, 4, '#c98d4b', 3, P.coral);
      }
    };
  };

  /* ---------------- 3. Flooded Machine Room ---------------- */
  ARENAS.flooded = {
    name: 'Flooded Machine Room', haze: 'rgba(16,48,60,0.32)', sub: 'Leaky pipes, gauges and rising water', accent: P.teal,
    hazardName: 'Steam Vents', hazardDesc: 'A floor vent bubbles for 1.3s, then blasts a steam column.',
    mechanicDesc: 'Water slows you (and your fall). The level rises and falls slowly.',
    platforms: [{ x: 90, y: 440, w: 200 }, { x: 990, y: 440, w: 200 }, { x: 470, y: 520, w: 340 }, { x: 560, y: 300, w: 160 }],
    paint(g, w, h) {
      paperWall(g, w, h, '#2f6f78', '#173b4a');
      for (let x = 60; x < w; x += 260) { art.inkCirc(g, x + 60, 190, 48, '#9fe3d9', 5, P.blueDeep); g.strokeStyle = P.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 30, 170); g.lineTo(x + 80, 160); g.stroke(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.fillStyle = P.paperDeep; art.circ(g, x + 60 + Math.cos(a) * 56, 190 + Math.sin(a) * 56, 4); g.fill(); } }
      g.lineCap = 'round';
      for (const [x, c] of [[180, P.coral], [470, P.cream], [820, P.coral], [1110, P.cream]]) { g.strokeStyle = P.ink; g.lineWidth = 34; g.beginPath(); g.moveTo(x, 64); g.lineTo(x, 300); g.lineTo(x + 70, 360); g.lineTo(x + 70, 700); g.stroke(); g.strokeStyle = c; g.lineWidth = 26; g.stroke(); }
      g.lineCap = 'butt';
      spotCone(g, 640, 64, 680, 50, 260, 0.08);
    },
    live(ctx, W) {
      const t = W.time;
      for (const [x, y] of [[330, 340], [960, 330]]) { art.inkCirc(ctx, x, y, 30, P.cream, 4); ctx.save(); ctx.translate(x, y); ctx.rotate(-2 + Math.sin(t * 1.7 + x) * 0.6 + 1.2); ctx.strokeStyle = P.enemyDark; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke(); ctx.restore(); }
      for (let i = 0; i < 10; i++) { const x = 100 + i * 117, y = A.B - ((t * 40 + i * 77) % 300); ctx.strokeStyle = 'rgba(244,234,213,0.6)'; ctx.lineWidth = 2; art.circ(ctx, x + Math.sin(t * 2 + i) * 6, y, 4 + (i % 3)); ctx.stroke(); }
    },
    update(W, dt) { W.waterY = A.B - 95 + Math.sin(W.time * 0.25) * 35; },
    front(ctx, W) {
      const y = W.waterY; if (y == null) return;
      ctx.save(); ctx.globalAlpha = 0.42; ctx.fillStyle = '#3fd6c8'; ctx.beginPath(); ctx.moveTo(A.L, A.B);
      for (let x = A.L; x <= A.R; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.03 + W.time * 2.4) * 4);
      ctx.lineTo(A.R, A.B); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = P.cream; ctx.lineWidth = 3; ctx.beginPath(); for (let x = A.L; x <= A.R; x += 20) { const yy = y + Math.sin(x * 0.03 + W.time * 2.4) * 4; x === A.L ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke();
      ctx.restore();
    },
    drawPlatform(ctx, p) { ctx.lineCap = 'round'; ctx.strokeStyle = P.ink; ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(p.x + 6, p.y + 9); ctx.lineTo(p.x + p.w - 6, p.y + 9); ctx.stroke(); ctx.strokeStyle = P.paperDeep; ctx.lineWidth = 13; ctx.stroke(); ctx.lineCap = 'butt'; for (const x of [p.x + 20, p.x + p.w - 20]) art.inkRect(ctx, x - 6, p.y - 2, 12, 22, 2, P.coral, 2); },
    hazard: { interval: 10, make: W => SO.makeVent(W) }
  };
  SO.makeVent = function (W) {
    const x = M.clamp(W.player.x + M.rand(-90, 90), A.L + 60, A.R - 60);
    return {
      phase: 'warn', t: 0, x, w: 70, h: 330,
      update(dt) {
        this.t += dt;
        if (this.t < 1.3) { this.phase = 'warn'; if (Math.random() < 0.4) W.fxPuff(this.x + M.rand(-20, 20), A.B - 10, 6, P.cream); return; }
        this.phase = 'live'; if (!this.blown) { this.blown = true; W.sfx('laser', 0.5); W.word('HISSS!', this.x, A.B - this.h - 20, 'small'); }
        if (this.t < 2.1) W.hitPlayerRect(this.x, A.B - this.h / 2, this.w / 2, this.h / 2, 14, 'hazard');
        if (this.t > 2.4) this.dead = true;
      },
      draw(ctx) {
        art.inkRect(ctx, this.x - 30, A.B - 12, 60, 12, 2, P.blueMid, 3);
        if (this.phase === 'warn') { ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * Math.sin(this.t * 22); SO.art.hazardRect(ctx, this.x - this.w / 2, A.B - this.h, this.w, this.h); ctx.restore(); return; }
        const k = this.t < 2.1 ? 1 : 1 - (this.t - 2.1) / 0.3;
        ctx.save(); ctx.globalAlpha = 0.85 * k;
        for (let i = 0; i < 8; i++) { const yy = A.B - (i / 8) * this.h - ((this.t * 300) % (this.h / 8)); art.inkCirc(ctx, this.x + Math.sin(i * 1.7 + this.t * 9) * 10, yy, 22 + i * 2, P.cream, 2.5); }
        ctx.restore();
      }
    };
  };

  /* ---------------- 4. Clockwork Theater ---------------- */
  ARENAS.theater = {
    name: 'Clockwork Theater', haze: 'rgba(26,20,44,0.3)', sub: 'Gears, curtains and a drifting spotlight', accent: P.coral,
    hazardName: 'Sandbag Drop', hazardDesc: 'Rigging drops sandbags on marked shadows after 1.3s.',
    mechanicDesc: 'Two gear platforms orbit the stage. Stand in the drifting SPOTLIGHT for +15% damage.',
    platforms: [{ x: 180, y: 440, w: 150, orbit: { cx: 360, cy: 430, r: 110, sp: 0.55, ph: 0 } }, { x: 900, y: 440, w: 150, orbit: { cx: 920, cy: 430, r: 110, sp: -0.55, ph: Math.PI } }],
    paint(g, w, h) {
      paperWall(g, w, h, '#3a2a4f', '#1d1830');
      // painted skyline flat
      // painted skyline flat: soft silhouette (no ink, slanted roofs) so it never reads as a ledge
      g.fillStyle = '#342b52'; for (let x = 60; x < w; x += 90) { const hh = 120 + ((x * 37) % 130); g.beginPath(); g.moveTo(x, 640); g.lineTo(x, 560 - hh + 18); g.lineTo(x + 35, 560 - hh); g.lineTo(x + 70, 560 - hh + 18); g.lineTo(x + 70, 640); g.closePath(); g.fill(); }
      for (let x = 60; x < w; x += 90) { const hh = 120 + ((x * 37) % 130); g.fillStyle = 'rgba(246,217,138,0.55)'; for (let k = 0; k < 4; k++) g.fillRect(x + 12 + (k % 2) * 28, 560 - hh + 30 + Math.floor(k / 2) * 30, 14, 14); }
      art.inkCirc(g, 640, 240, 120, P.cream, 6, P.coral); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.fillStyle = P.ink; g.fillRect(640 + Math.cos(a) * 100 - 3, 240 + Math.sin(a) * 100 - 8, 6, 16); }
      // curtains
      for (const s of [0, 1]) { g.save(); if (s) { g.translate(w, 0); g.scale(-1, 1); } const gr = g.createLinearGradient(0, 0, 200, 0); gr.addColorStop(0, P.coralDark); gr.addColorStop(1, P.coral); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 60); g.lineTo(230, 60); g.quadraticCurveTo(150, 360, 200, 700); g.lineTo(0, 700); g.closePath(); g.fill(); g.lineWidth = 4; g.strokeStyle = P.ink; g.stroke(); for (let x = 30; x < 200; x += 40) { g.strokeStyle = 'rgba(27,26,46,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 70); g.quadraticCurveTo(x - 20, 380, x + 10, 690); g.stroke(); } g.restore(); }
      boards(g, w, A.B - 16, 80, '#a0663f');
    },
    live(ctx, W) {
      const t = W.time;
      ctx.save(); ctx.translate(640, 240); ctx.strokeStyle = P.ink; ctx.lineCap = 'round';
      ctx.rotate(t * 0.5); ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -85); ctx.stroke(); ctx.rotate(-t * 0.5 + t * 0.05); ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -55); ctx.stroke(); ctx.restore(); ctx.lineCap = 'butt';
      gear(ctx, 470, 130, 46, 12, t * 0.8, P.gold, 3); gear(ctx, 545, 92, 28, 9, -t * 1.3, P.paperDeep, 3); gear(ctx, 820, 120, 40, 11, -t * 0.9, P.gold, 3);
      const s = W.arenaState; if (s.spot != null) { const x = s.spot; ctx.save(); const gr = ctx.createLinearGradient(0, A.T, 0, A.B); gr.addColorStop(0, 'rgba(255,240,180,0.32)'); gr.addColorStop(1, 'rgba(255,240,180,0.12)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - 18, A.T); ctx.lineTo(x + 18, A.T); ctx.lineTo(x + 110, A.B); ctx.lineTo(x - 110, A.B); ctx.closePath(); ctx.fill(); ctx.restore(); lightPool(ctx, x, A.B - 6, 110, 18, 0.4); }
    },
    update(W, dt) {
      const s = W.arenaState; if (s.spot == null) { s.spot = 640; s.spv = 70; }
      s.spot += s.spv * dt; if (s.spot < A.L + 150 || s.spot > A.R - 150) s.spv *= -1;
      for (const p of W.platforms) if (p.orbit) { const o = p.orbit; const a = W.time * o.sp + o.ph; p.x = o.cx + Math.cos(a) * o.r - p.w / 2; p.y = o.cy + Math.sin(a) * o.r * 0.6; }
      const P2 = W.player; const k = (P2.y - A.T) / (A.B - A.T); W.inSpotlight = Math.abs(P2.x - s.spot) < 18 + 92 * k;
    },
    drawPlatform(ctx, p) { gear(ctx, p.x + p.w / 2, p.y + 18, p.w / 2 + 4, 14, p.x * 0.03, P.gold, 3); art.inkRect(ctx, p.x, p.y, p.w, 14, 4, P.paperDeep, 3, P.coral); },
    hazard: { interval: 12, make: W => SO.makeSandbags(W) }
  };
  SO.makeSandbags = function (W) {
    const xs = []; const base = W.player.x; xs.push(M.clamp(base + M.rand(-40, 40), A.L + 40, A.R - 40));
    let tries = 0; while (xs.length < 3 && tries++ < 50) { const x = M.rand(A.L + 40, A.R - 40); if (xs.every(q => Math.abs(q - x) > 160)) xs.push(x); }
    return {
      phase: 'warn', t: 0, bags: xs.map(x => ({ x, y: A.T - 40, done: false })),
      update(dt) {
        this.t += dt; if (this.t < 1.3) { this.phase = 'warn'; return; } this.phase = 'live';
        for (const b of this.bags) { if (b.done) continue; b.y += 1000 * dt; W.hitPlayerRect(b.x, b.y, 20, 22, 15, 'hazard'); if (b.y >= A.B - 22) { b.done = true; W.fxPuff(b.x, A.B - 10, 22, P.paperDeep); W.sfx('smallboom'); } }
        if (this.bags.every(b => b.done)) this.dead = true;
      },
      draw(ctx) {
        for (const b of this.bags) {
          if (this.phase === 'warn') { art.floorShadow(ctx, b.x, A.B - 6, 30 * Math.min(1, this.t + 0.2), 8, 0.8); ctx.save(); ctx.globalAlpha = 0.6; ctx.setLineDash([6, 8]); ctx.strokeStyle = P.warn; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, A.T); ctx.lineTo(b.x, A.B - 10); ctx.stroke(); ctx.restore(); }
          if (b.done) continue; ctx.save(); ctx.translate(b.x, b.y); ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -400); ctx.stroke();
          art.ink(ctx, () => { ctx.beginPath(); ctx.moveTo(-8, -22); ctx.quadraticCurveTo(-26, 4, -16, 22); ctx.lineTo(16, 22); ctx.quadraticCurveTo(26, 4, 8, -22); ctx.closePath(); }, '#c7a46b', 3); art.text(ctx, '50', 0, 6, 14, P.ink, 'center', 0); ctx.restore();
        }
      }
    };
  };

  /* ---------------- 5. The Drafting Table ---------------- */
  ARENAS.drafting = {
    name: 'The Enormous Drafting Table', haze: 'rgba(24,56,104,0.3)', sub: 'Blueprints, sliding rulers and a giant compass', accent: P.blueLight,
    hazardName: 'Compass Sweep', hazardDesc: 'A giant compass previews an arc for 1.5s, then its pencil draws it in damaging graphite.',
    mechanicDesc: 'Ruler platforms slide back and forth across the sheet.',
    platforms: [{ x: 140, y: 480, w: 260, slide: { amp: 120, sp: 0.5, ph: 0 } }, { x: 880, y: 480, w: 260, slide: { amp: 120, sp: 0.5, ph: Math.PI } }, { x: 520, y: 340, w: 240, slide: { amp: 200, sp: 0.35, ph: 1 } }],
    paint(g, w, h) {
      paperWall(g, w, h, '#2f5f9e', '#1f4378');
      g.strokeStyle = 'rgba(200,225,255,0.25)'; g.lineWidth = 1; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = 'rgba(220,240,255,0.55)'; g.lineWidth = 3; g.strokeRect(120, 120, 420, 300); g.beginPath(); g.arc(860, 300, 150, 0, 7); g.stroke(); g.beginPath(); g.moveTo(860, 150); g.lineTo(860, 450); g.moveTo(710, 300); g.lineTo(1010, 300); g.stroke();
      art.text(g, 'SQ-2  BOSS ASSY.  REV. ∞', 330, 460, 22, 'rgba(220,240,255,0.7)', 'center', 0);
      g.save(); g.translate(1120, 520); g.rotate(-0.35); art.inkRect(g, -170, -14, 340, 28, 4, '#f2c14e', 4, P.coral); art.inkRect(g, 120, -14, 50, 28, 2, '#ff9e9e', 3); g.fillStyle = P.ink; g.beginPath(); g.moveTo(-170, -14); g.lineTo(-200, 0); g.lineTo(-170, 14); g.fill(); g.restore();
      g.save(); g.translate(170, 560); g.rotate(0.2); art.inkRect(g, -60, -24, 120, 48, 10, '#ff9e9e', 4, P.blueMid); g.restore();
      art.ink(g, () => art.poly(g, [990, 640, 1170, 640, 990, 470]), 'rgba(160,220,255,0.45)', 4);
      boards(g, w, A.B - 16, 80, '#d8c39a');
    },
    live(ctx, W) {
      const t = W.time; const s = W.arenaState;
      ctx.save(); ctx.translate(640, A.T + 2); const ang = s.compA != null ? s.compA : Math.sin(t * 0.3) * 0.3;
      ctx.rotate(ang); art.inkRect(ctx, -6, 0, 12, 60, 3, P.paperDeep, 3); art.inkCirc(ctx, 0, 0, 14, P.gold, 3); ctx.restore();
    },
    update(W, dt) { for (const p of W.platforms) if (p.slide) { const o = p.slide; p.x = p.x0 + Math.sin(W.time * o.sp + o.ph) * o.amp; } },
    drawPlatform(ctx, p) { art.inkRect(ctx, p.x, p.y, p.w, 18, 2, '#f6e7b4', 3, P.blueMid); ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5; for (let x = p.x + 6, i = 0; x < p.x + p.w - 4; x += 10, i++) { ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(x, p.y + (i % 5 ? 5 : 10)); ctx.stroke(); } },
    hazard: { interval: 13, make: W => SO.makeCompass(W) }
  };
  SO.makeCompass = function (W) {
    const cx = 640, cy = A.T; const tp = W.player; let R = M.clamp(M.dist(cx, cy, tp.x, tp.y) + M.rand(-40, 40), 260, 560);
    const a0 = Math.PI * 0.12, a1 = Math.PI * 0.88; const dir = Math.random() < 0.5 ? 1 : -1;
    const start = dir > 0 ? a0 : a1, end = dir > 0 ? a1 : a0;
    return {
      phase: 'warn', t: 0, R, drawn: [],
      update(dt) {
        this.t += dt; W.arenaState.compA = (this.t < 1.5 ? start : M.lerp(start, end, M.clamp((this.t - 1.5) / 1.2, 0, 1))) - Math.PI / 2;
        if (this.t < 1.5) { this.phase = 'warn'; return; }
        this.phase = 'live';
        const k = M.clamp((this.t - 1.5) / 1.2, 0, 1); const a = M.lerp(start, end, k);
        this.drawn.push({ a, t: this.t });
        this.drawn = this.drawn.filter(d => this.t - d.t < 0.6);
        for (const d of this.drawn) { const x = cx + Math.cos(d.a) * R, y = cy + Math.sin(d.a) * R; W.hitPlayerCircle(x, y, 12, 14, 'hazard'); }
        if (this.t > 1.5 + 1.2 + 0.6) { this.dead = true; W.arenaState.compA = null; }
      },
      draw(ctx) {
        if (this.phase === 'warn') { ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.t * 18); ctx.setLineDash([14, 10]); ctx.strokeStyle = P.warn; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, R, Math.min(start, end), Math.max(start, end)); ctx.stroke(); ctx.restore(); return; }
        ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = P.ink; ctx.lineWidth = 14;
        ctx.beginPath(); this.drawn.forEach((d, i) => { const x = cx + Math.cos(d.a) * R, y = cy + Math.sin(d.a) * R; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
        ctx.strokeStyle = P.enemy; ctx.lineWidth = 6; ctx.stroke();
        const last = this.drawn[this.drawn.length - 1]; if (last) { ctx.save(); ctx.translate(cx + Math.cos(last.a) * R, cy + Math.sin(last.a) * R); ctx.rotate(last.a + Math.PI / 2); art.inkRect(ctx, -6, -40, 12, 40, 2, P.gold, 3); ctx.restore(); }
        ctx.strokeStyle = P.ink; ctx.lineWidth = 4; if (last) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(last.a) * R, cy + Math.sin(last.a) * R); ctx.stroke(); }
        ctx.restore();
      }
    };
  };

  /* ---------- background cache (rebuilt on resize / quality change) ---------- */
  const cache = {};
  SO.arenaBg = function (id, scale) {
    const key = id + '@' + scale + (art.light ? 'L' : 'F');
    if (cache[key]) return cache[key];
    for (const k in cache) if (k.startsWith(id + '@')) delete cache[k];
    const c = document.createElement('canvas'); c.width = Math.round(SO.W * scale); c.height = Math.round(SO.H * scale);
    const g = c.getContext('2d'); g.scale(scale, scale); ARENAS[id].paint(g, SO.W, SO.H);
    if (!art.light) { g.save(); g.globalAlpha = 1; g.fillStyle = art.paperPattern(g); g.fillRect(0, 0, SO.W, SO.H); g.restore(); }
    cache[key] = c; return c;
  };
})();
