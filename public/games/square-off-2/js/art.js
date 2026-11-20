/* Square Off 2 — art: mechanical comic-book drawing kit (ink outlines, halftone, misprint offset) */
'use strict';
(function () {
  const P = SO.PAL, M = SO.M;
  const art = SO.art = { light: false };
  const patCache = new WeakMap();

  art.FONT = '"Impact","Haettenschweiler","Arial Black","Franklin Gothic Heavy","Trebuchet MS",sans-serif';

  art.dotTile = function (color, spacing, dot) {
    const c = document.createElement('canvas'); c.width = c.height = spacing;
    const g = c.getContext('2d'); g.fillStyle = color;
    g.beginPath(); g.arc(spacing / 2, spacing / 2, dot, 0, 7); g.fill();
    g.beginPath(); g.arc(0, 0, dot * 0.7, 0, 7); g.arc(spacing, 0, dot * 0.7, 0, 7); g.arc(0, spacing, dot * 0.7, 0, 7); g.arc(spacing, spacing, dot * 0.7, 0, 7); g.fill();
    return c;
  };
  art.halftone = function (ctx, color = P.ink, spacing = 6, dot = 1.5) {
    let m = patCache.get(ctx); if (!m) { m = {}; patCache.set(ctx, m); }
    const k = color + spacing + '_' + dot;
    if (!m[k]) m[k] = ctx.createPattern(art.dotTile(color, spacing, dot), 'repeat');
    return m[k];
  };
  art.stripeTile = null;
  art.stripes = function (ctx) {
    let m = patCache.get(ctx); if (!m) { m = {}; patCache.set(ctx, m); }
    if (!m.__stripes) {
      const c = document.createElement('canvas'); c.width = c.height = 24; const g = c.getContext('2d');
      g.fillStyle = P.warn; g.fillRect(0, 0, 24, 24); g.fillStyle = P.ink;
      g.beginPath(); g.moveTo(0, 24); g.lineTo(12, 0); g.lineTo(24, 0); g.lineTo(12, 24); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-12, 24); g.lineTo(0, 0); g.lineTo(0, 12); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(24, 12); g.lineTo(24, 24); g.lineTo(18, 24); g.closePath(); g.fill();
      m.__stripes = ctx.createPattern(c, 'repeat');
    }
    return m.__stripes;
  };

  art.paperCanvas = null;
  art.init = function () {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = Math.random(); const v = n < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = Math.random() < 0.12 ? 18 : 0;
    }
    g.putImageData(img, 0, 0);
    g.globalAlpha = 0.05; g.strokeStyle = '#7a6040';
    for (let i = 0; i < 30; i++) { g.beginPath(); const y = Math.random() * 256; g.moveTo(0, y); g.bezierCurveTo(80, y + M.rand(-6, 6), 170, y + M.rand(-6, 6), 256, y + M.rand(-4, 4)); g.stroke(); }
    art.paperCanvas = c;
  };
  art.paperPattern = function (ctx) {
    let m = patCache.get(ctx); if (!m) { m = {}; patCache.set(ctx, m); }
    if (!m.__paper) m.__paper = ctx.createPattern(art.paperCanvas, 'repeat');
    return m.__paper;
  };

  /* ---- paths ---- */
  art.rr = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  };
  art.circ = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); };
  art.poly = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); };

  // ink fill with misregistered offset layer
  art.ink = function (ctx, pathFn, fill, lw = 3, off = null, stroke = P.ink) {
    if (off && !art.light) {
      ctx.save(); ctx.translate(2.2, 1.8); pathFn(); ctx.globalAlpha *= 0.5; ctx.fillStyle = off; ctx.fill(); ctx.restore();
    }
    pathFn(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); }
  };
  art.inkRect = (ctx, x, y, w, h, r, fill, lw = 3, off = null) => art.ink(ctx, () => art.rr(ctx, x, y, w, h, r), fill, lw, off);
  art.inkCirc = (ctx, x, y, r, fill, lw = 3, off = null) => art.ink(ctx, () => art.circ(ctx, x, y, r), fill, lw, off);

  // halftone shade inside current path (caller sets path)
  art.shade = function (ctx, alpha = 0.35, color = P.ink, spacing = 5, dot = 1.2) {
    if (art.light) { ctx.save(); ctx.globalAlpha *= alpha * 0.4; ctx.fillStyle = color; ctx.fill(); ctx.restore(); return; }
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = art.halftone(ctx, color, spacing, dot); ctx.fill(); ctx.restore();
  };
  art.floorShadow = function (ctx, x, y, rx, ry, alpha = 0.5) {
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    art.shade(ctx, alpha, P.blueDeep, 5, 1.6); ctx.restore();
  };

  art.burst = function (ctx, x, y, r, n, fill, rot = 0, lw = 3) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + i / (n * 2) * Math.PI * 2; const rr = i % 2 ? r * 0.62 : r * (0.92 + ((i * 37) % 7) / 40);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = P.ink; ctx.stroke(); }
  };

  art.text = function (ctx, txt, x, y, size, fill = P.cream, align = 'center', lw = 0, stroke = P.ink, base = 'middle') {
    ctx.font = `${size}px ${art.FONT}`; ctx.textAlign = align; ctx.textBaseline = base;
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(txt, x, y); }
    ctx.fillStyle = fill; ctx.fillText(txt, x, y);
  };
  // comic impact word
  art.word = function (ctx, w) {
    const t = w.t / w.dur; const s = t < 0.18 ? M.easeOutBack(t / 0.18) : 1; const a = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(w.x, w.y - t * 18); ctx.rotate(w.rot); ctx.scale(s, s);
    art.burst(ctx, 0, 0, w.size * 1.25, 9, w.bg, w.rot * 3, 3);
    art.text(ctx, w.text, 0, 2, w.size, w.fg, 'center', 6);
    ctx.restore();
  };

  art.hazardRect = function (ctx, x, y, w, h, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = art.stripes(ctx); ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.strokeRect(x, y, w, h); ctx.restore();
  };

  /* ---------- player ---------- */
  const PAINTS = SO.PAINTS = {
    classic: { body: P.teal, dark: P.tealDark, off: P.blueMid, plate: P.cream, jet: P.blue, label: 'Character colours' },
    coral: { body: '#ff9e7a', dark: P.coralDark, off: P.teal, plate: P.cream, jet: P.blueDeep, label: 'Coral Swap' },
    blueprint: { body: '#4f7cc4', dark: '#2a4f8c', off: '#9fd6ff', plate: '#e5f1ff', jet: '#1a2f55', label: 'Blueprint' },
    gold: { body: '#f2c14e', dark: '#b8862a', off: P.coral, plate: P.cream, jet: P.ink, label: 'Gold Leaf' },
    news: { body: '#d9d2c2', dark: '#8f8879', off: '#555', plate: '#fffaf0', jet: '#2b2b2b', label: 'Newsprint' },
    mint: { body: '#9ee6a8', dark: '#4e9e62', off: P.violet, plate: P.cream, jet: P.blueDeep, label: 'Mint Condition' }
  };

  art.drawPlayer = function (ctx, p, o = {}) {
    const chr = o.char && SO.KITS ? SO.KITS[o.char] : null;
    const paint = (o.paint && o.paint !== 'classic' && PAINTS[o.paint]) ? PAINTS[o.paint] : (chr ? chr.look : PAINTS.classic);
    const S = (p.size || 36) * (o.scale || 1);
    const h = S / 2; const t = o.time || 0;
    ctx.save();
    ctx.translate(p.x, p.y + (p.bodyOff || -4));
    // squash & stretch anchored at center
    ctx.scale(p.sx || 1, p.sy || 1);
    const face = p.facing || 1;
    // jetpack (behind)
    const jx = -face * (h + 3);
    ctx.save();
    if (o.noJet) ctx.globalAlpha = 0;
    art.inkRect(ctx, jx - 7, -h + 4, 14, S - 10, 4, paint.jet, 2.5);
    art.inkRect(ctx, jx - 6, h - 8, 5, 8, 2, P.blueMid, 2); art.inkRect(ctx, jx + 1, h - 8, 5, 8, 2, P.blueMid, 2);
    if (p.thrusting || p.dashing) {
      const fl = (p.dashing ? 22 : 14) + Math.sin(t * 60) * 4;
      for (const ox of [-3.5, 3.5]) {
        ctx.beginPath(); ctx.moveTo(jx + ox - 4, h); ctx.quadraticCurveTo(jx + ox, h + fl * 1.2, jx + ox + 4, h); ctx.closePath();
        ctx.fillStyle = P.warn; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(jx + ox - 2, h); ctx.quadraticCurveTo(jx + ox, h + fl * 0.6, jx + ox + 2, h); ctx.fillStyle = P.white; ctx.fill();
      }
    }
    ctx.restore();
    // body
    art.ink(ctx, () => art.rr(ctx, -h, -h, S, S, 7), paint.body, 3.2, paint.off);
    ctx.save(); art.rr(ctx, -h, -h, S, S, 7); ctx.clip();
    ctx.beginPath(); ctx.moveTo(-h, h * 0.25); ctx.lineTo(h, -h * 0.2); ctx.lineTo(h, h); ctx.lineTo(-h, h); ctx.closePath();
    art.shade(ctx, 0.35, paint.dark, 4, 1.3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-h + 4, -h + 3, S * 0.45, 3);
    ctx.restore();
    // rivets
    ctx.fillStyle = P.ink; for (const [rx, ry] of [[-h + 5, h - 5], [h - 5, h - 5]]) { art.circ(ctx, rx, ry, 1.6); ctx.fill(); }
    // face plate + eyes
    const look = p.look || 0; const lx = Math.cos(look) * 2.4, ly = Math.sin(look) * 2.2;
    const blink = p.blink > 0;
    const mood = p.mood || 'idle';
    art.inkRect(ctx, -h + 5, -h + 5, S - 10, S * 0.42, 5, paint.plate, 2.2);
    for (const ex of [-6.5, 6.5]) {
      const cx = ex + face * 1.5, cy = -h + 5 + S * 0.21;
      if (blink || mood === 'hurt') {
        ctx.lineWidth = 2.5; ctx.strokeStyle = P.ink; ctx.beginPath();
        if (mood === 'hurt') { ctx.moveTo(cx - 3.5, cy - 3); ctx.lineTo(cx + 3.5, cy); ctx.lineTo(cx - 3.5, cy + 3); }
        else { ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy); }
        ctx.stroke();
      } else {
        ctx.fillStyle = P.white; ctx.beginPath(); ctx.ellipse(cx, cy, 4.2, 5, 0, 0, 7); ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = P.ink; ctx.stroke();
        ctx.fillStyle = P.ink; art.circ(ctx, cx + lx, cy + ly, 2.3); ctx.fill();
        ctx.fillStyle = P.white; art.circ(ctx, cx + lx - 0.8, cy + ly - 1, 0.8); ctx.fill();
      }
      if (mood === 'focus' || p.dashing) { ctx.lineWidth = 2.4; ctx.strokeStyle = P.ink; ctx.beginPath(); ctx.moveTo(cx - 5, cy - 7 + (ex * face < 0 ? 0 : 2)); ctx.lineTo(cx + 5, cy - 7 + (ex * face < 0 ? 2 : 0)); ctx.stroke(); }
    }
    if (chr) art.accessory(ctx, chr.look.acc, h, t, face);
    ctx.restore();
  };
  // character accessories (drawn in body space, h = half body size)
  art.accessory = function (ctx, acc, h, t, face) {
    const line = (pts, lw = 2.5, col = P.ink) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.stroke(); };
    switch (acc) {
      case 'pip': line([h * 0.4, -h, h * 0.6, -h - 11]); art.inkCirc(ctx, h * 0.6, -h - 13, 3.5, P.warn, 2); break;
      case 'brick': art.ink(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -h + 3, h * 0.92, h * 0.5, 0, Math.PI, 0); ctx.closePath(); }, P.warn, 2.5); art.inkRect(ctx, -h - 4, -h + 1, h * 2 + 8, 5, 2, P.warnDark, 2); line([0, -h - h * 0.45, 0, -h + 2], 2); break;
      case 'hex': for (const sx of [-1, 1]) art.ink(ctx, () => art.poly(ctx, [sx * h * 0.35, -h + 1, sx * h * 0.75, -h - 12, sx * h * 0.7, -h + 1]), P.coral, 2); ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 8); ctx.strokeStyle = P.violet; ctx.lineWidth = 3; art.rr(ctx, -h - 4, -h - 4, h * 2 + 8, h * 2 + 8, 9); ctx.stroke(); ctx.restore(); break;
      case 'nova': art.inkRect(ctx, -h - 2, -h + 9, h * 2 + 4, 4, 1, P.blueDeep, 1.5); line([-h * 0.5, -h, -h * 0.7, -h - 9]); art.ink(ctx, () => { ctx.beginPath(); ctx.ellipse(-h * 0.72, -h - 11, 7, 3.5, -0.4, 0, 7); }, P.teal, 2); break;
      case 'ballast': for (const sx of [-1, 1]) art.inkRect(ctx, sx * h * 0.5 - 8, h - 3, 16, 9, 3, P.inkSoft, 2.5); art.inkCirc(ctx, 0, -h + 1, 4, P.coral, 2); break;
      case 'bulwark': art.inkRect(ctx, -4, -h - 12, 8, 14, 3, P.coral, 2); art.inkRect(ctx, -h, -h - 2, h * 2, 6, 2, P.blueMid, 2); break;
      case 'twins': for (const sx of [-1, 1]) art.ink(ctx, () => art.poly(ctx, [h * 0.45, -h - 2, h * 0.45 + sx * 9, -h - 8, h * 0.45 + sx * 9, -h + 4]), P.violet, 2); art.inkCirc(ctx, h * 0.45, -h - 2, 2.5, P.violet, 1.5); break;
      case 'kaboom': { ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = P.ink; ctx.beginPath(); ctx.moveTo(0, -h); ctx.quadraticCurveTo(6, -h - 10, 2, -h - 16); ctx.stroke(); ctx.restore(); art.burst(ctx, 2, -h - 18, 5 + Math.sin(t * 30) * 1.5, 5, P.warn, t * 9, 1.5); break; }
      case 'cinder': for (let i = -1; i <= 1; i++) { const fh = 10 + Math.sin(t * 14 + i * 2) * 3 + (i === 0 ? 4 : 0); art.ink(ctx, () => { ctx.beginPath(); ctx.moveTo(i * h * 0.45 - 5, -h + 2); ctx.quadraticCurveTo(i * h * 0.45, -h - fh * 1.6, i * h * 0.45 + 5, -h + 2); ctx.closePath(); }, i === 0 ? P.warn : P.coral, 2); } break;
      case 'spark': ctx.save(); ctx.globalAlpha = 0.8; line([-h + 4, h * 0.2, -h * 0.2, h - 3], 2.5, P.white); line([-h * 0.35, h * 0.35, h * 0.2, h - 3], 2, P.white); ctx.restore(); art.burst(ctx, h - 2, -h + 2, 5 + Math.sin(t * 6) * 1.5, 4, P.white, t, 1.5); break;
      case 'tally': art.ink(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -h + 1, h * 1.25, 4, 0, 0, 7); }, '#8a6440', 2.5); art.inkRect(ctx, -h * 0.55, -h - 11, h * 1.1, 12, 4, '#a87d4f', 2.5); ctx.fillStyle = P.coral; ctx.fillRect(-h * 0.55, -h - 3, h * 1.1, 3); break;
      case 'medic': art.ink(ctx, () => { ctx.beginPath(); ctx.moveTo(-h * 0.7, -h + 2); ctx.lineTo(-h * 0.55, -h - 9); ctx.lineTo(h * 0.55, -h - 9); ctx.lineTo(h * 0.7, -h + 2); ctx.closePath(); }, P.white, 2.5); ctx.fillStyle = P.enemy; ctx.fillRect(-2, -h - 7, 4, 8); ctx.fillRect(-5, -h - 4.5, 10, 3); break;
      case 'dice': ctx.fillStyle = P.enemy; for (const [dx, dy] of [[-0.5, 0.35], [0, 0.6], [0.5, 0.85]]) { art.circ(ctx, dx * h, dy * h, 2.6); ctx.fill(); } break;
      case 'mirage': ctx.save(); for (let i = 1; i <= 2; i++) { ctx.globalAlpha = 0.28 / i; ctx.strokeStyle = '#9ad8ff'; ctx.lineWidth = 2.5; const o = i * 5 + Math.sin(t * 4) * 1.5; art.rr(ctx, -h - o * face, -h, h * 2, h * 2, 6); ctx.stroke(); } ctx.restore(); art.ink(ctx, () => art.poly(ctx, [-h * 0.6, -h + 1, -h * 0.3, -h - 9, 0, -h - 2, h * 0.3, -h - 9, h * 0.6, -h + 1]), '#ff7ad8', 2); break;
      case 'anchor': { for (const [lw, col] of [[5.5, P.ink], [2.6, P.gold]]) { line([0, -h + 2, 0, -h - 13], lw, col); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, -h - 5, 8, 0.2, Math.PI - 0.2); ctx.stroke(); line([-6, -h - 9, 6, -h - 9], lw, col); } art.inkCirc(ctx, 0, -h - 16, 3.5, P.gold, 2); for (const sx of [-1, 1]) art.inkRect(ctx, sx * h * 0.55 - 8, h - 3, 16, 7, 2, P.inkSoft, 2); break; }
      case 'blitz': { art.inkRect(ctx, -h - 1, -h + 1, h * 2 + 2, 6, 3, P.white, 1.8); ctx.fillStyle = P.enemy; ctx.fillRect(-h, -h + 2.5, h * 2, 2.5); for (let i = 0; i < 2; i++) line([-face * (h + 3), -h + 3 + i * 5, -face * (h + 13 + i * 5), -h + 1 + i * 6], 2.5, P.white); break; }
      case 'ember': { const fh = 14 + Math.sin(t * 16) * 3; art.ink(ctx, () => { ctx.beginPath(); ctx.moveTo(-7, -h + 2); ctx.quadraticCurveTo(-9, -h - fh * 0.6, 0, -h - fh * 1.2); ctx.quadraticCurveTo(9, -h - fh * 0.6, 7, -h + 2); ctx.closePath(); }, P.warn, 2); art.ink(ctx, () => { ctx.beginPath(); ctx.moveTo(-3, -h + 2); ctx.quadraticCurveTo(0, -h - fh * 0.6, 3, -h + 2); ctx.closePath(); }, P.white, 1.2); break; }
      case 'juggler': for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.1; art.inkCirc(ctx, Math.cos(a) * h * 0.8, -h - 9 + Math.sin(a) * 4 - Math.abs(Math.sin(a)) * 6, 3.6, [P.coral, P.teal, P.warn][i], 1.6); } art.ink(ctx, () => art.poly(ctx, [-h * 0.5, -h + 1, -h * 0.25, -h - 6, 0, -h + 1, h * 0.25, -h - 6, h * 0.5, -h + 1]), P.violet, 1.8); break;
      case 'sponge': ctx.fillStyle = 'rgba(160,120,40,0.55)'; for (const [x, y, r] of [[-0.55, 0.35, 2.6], [0.1, 0.62, 3.2], [0.6, 0.3, 2.2], [-0.2, 0.85, 1.8], [0.55, 0.82, 2.4]]) { art.circ(ctx, x * h, y * h, r); ctx.fill(); } art.ink(ctx, () => { ctx.beginPath(); ctx.ellipse(-h * 0.5, -h - 4, 5, 6, 0, 0, 7); }, '#bfe9ff', 1.5); break;
      case 'underdog': art.inkRect(ctx, -h * 0.85, -h - 1, h * 1.7, 5, 2, P.coral, 2); line([-h * 0.85, -h + 1, -h - 7, -h + 7], 3, P.coral); line([-h * 0.85, -h + 1, -h - 5, -h - 4], 3, P.coral); ctx.fillStyle = P.white; ctx.fillRect(h * 0.35, h * 0.35, 9, 3); ctx.fillRect(h * 0.35 + 3, h * 0.35 - 3, 3, 9); break;
      case 'glitch': { const g = Math.sin(t * 23) > 0.75; ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = '#7fff8a'; for (let i = 0; i < 4; i++) { const y = -h + ((i * 13 + Math.floor(t * 9) * 7) % (h * 2)); ctx.fillRect(-h - (g ? 6 : 2), y, h * 2 + (g ? 10 : 4), 2); } ctx.restore(); if (g) { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#ff2f63'; ctx.fillRect(-h + 3, -h * 0.2, h * 2, 4); ctx.restore(); } art.ink(ctx, () => art.poly(ctx, [-h * 0.2, -h + 1, -h * 0.05, -h - 10, h * 0.15, -h - 4, h * 0.3, -h - 12, h * 0.35, -h + 1]), '#7fff8a', 1.6); break; }
      case 'penny': art.inkRect(ctx, -h * 0.75, -h - 1, h * 1.5, 4, 1.5, P.ink, 2); art.inkRect(ctx, -h * 0.45, -h - 15, h * 0.9, 15, 2, P.ink, 2); ctx.fillStyle = P.gold; ctx.fillRect(-h * 0.45, -h - 5, h * 0.9, 3); art.inkCirc(ctx, h * 0.55, h * 0.45, 4.5, P.gold, 2); break;
      case 'tempo': { ctx.lineWidth = 4.5; ctx.strokeStyle = P.ink; ctx.beginPath(); ctx.arc(0, -h + 6, h + 1, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.lineWidth = 2.2; ctx.strokeStyle = P.blueMid; ctx.stroke(); for (const sx of [-1, 1]) art.inkRect(ctx, sx * (h + 1) - 4, -h + 4, 8, 12, 3, P.coral, 2); const b = Math.sin(t * 9) > 0 ? 1 : 0; ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * b; ctx.fillStyle = P.ink; art.circ(ctx, h + 8, -h - 6 - b * 2, 2.6); ctx.fill(); ctx.fillRect(h + 9.6, -h - 15 - b * 2, 1.6, 9); ctx.restore(); break; }
      case 'magpie': art.ink(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -h + 2, h * 0.85, h * 0.45, 0, Math.PI, 0); ctx.closePath(); }, P.blueDeep, 2.5); art.inkRect(ctx, -h * 0.9, -h, h * 1.8, 4, 1.5, P.coral, 1.8); art.ink(ctx, () => art.poly(ctx, [h * 0.35, -h - 10, h * 0.5, -h - 4, h * 0.35, -h + 1, h * 0.2, -h - 4]), P.teal, 1.8); break;
      case 'titan': art.ink(ctx, () => art.poly(ctx, [-h * 0.8, -h + 2, -h * 0.8, -h - 8, -h * 0.4, -h - 3, 0, -h - 13, h * 0.4, -h - 3, h * 0.8, -h - 8, h * 0.8, -h + 2]), P.gold, 2.5); art.inkCirc(ctx, 0, -h - 4, 2.4, P.enemy, 1.5); break;
      case 'forge': art.inkRect(ctx, -h - 1, -h + 1, h * 2 + 2, 5, 2, '#3a3850', 1.8); for (const sx of [-1, 1]) art.inkCirc(ctx, sx * h * 0.42, -h + 3, 5, P.warn, 2); line([-h * 0.42 - 2, -h + 1, -h * 0.42 + 2, -h + 1], 1.5, P.white); break;
      case 'rime': art.ink(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -h + 1, h * 0.95, 6, 0, Math.PI, 0); ctx.closePath(); }, P.white, 2); for (const x of [-0.6, -0.15, 0.35, 0.75]) art.ink(ctx, () => art.poly(ctx, [x * h - 3, -h + 1, x * h + 3, -h + 1, x * h, -h + 9]), '#bfe9ff', 1.5); break;
      case 'glimmer': for (const [x, hh, c] of [[-0.45, 12, '#e8d8ff'], [0, 18, P.white], [0.45, 10, '#bfe9ff']]) art.ink(ctx, () => art.poly(ctx, [x * h - 5, -h + 1, x * h, -h - hh, x * h + 5, -h + 1]), c, 2); ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 7); art.burst(ctx, h * 0.8, -h - 8, 4, 4, P.white, t, 1.2); ctx.restore(); break;
      case 'streak': for (let i = 0; i < 3; i++) line([-face * (h + 4), -h * 0.5 + i * h * 0.5, -face * (h + 14 + i * 4), -h * 0.5 + i * h * 0.5], 2.5, P.ink); art.ink(ctx, () => { ctx.beginPath(); ctx.moveTo(-6, -h + 1); ctx.quadraticCurveTo(-face * 12, -h - 14, -face * 18, -h - 10); ctx.quadraticCurveTo(-face * 6, -h - 4, 6, -h + 1); ctx.closePath(); }, P.coral, 2); break;
      case 'wisp': ctx.save(); ctx.globalAlpha = 0.65; for (let i = -1; i <= 1; i++) { const l = 9 + Math.sin(t * 8 + i * 1.7) * 3; art.ink(ctx, () => { ctx.beginPath(); ctx.moveTo(i * h * 0.55 - 5, h - 2); ctx.quadraticCurveTo(i * h * 0.55, h + l * 1.4, i * h * 0.55 + 5, h - 2); ctx.closePath(); }, '#d8f0f0', 1.8); } ctx.restore(); break;
      case 'halo': { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = P.gold; ctx.beginPath(); ctx.ellipse(0, -h - 9 + Math.sin(t * 3) * 1.5, h * 0.9, 6, 0, 0, 7); ctx.fill(); ctx.restore(); ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.beginPath(); ctx.ellipse(0, -h - 9 + Math.sin(t * 3) * 1.5, h * 0.7, 4, 0, 0, 7); ctx.stroke(); ctx.lineWidth = 2.2; ctx.strokeStyle = P.gold; ctx.stroke(); break; }
      case 'bramble': for (const [x, a] of [[-0.3, -0.6], [0.25, 0.5]]) { ctx.save(); ctx.translate(x * h, -h + 1); ctx.rotate(a); art.ink(ctx, () => { ctx.beginPath(); ctx.ellipse(0, -7, 4, 8, 0, 0, 7); }, '#8ad85a', 1.8); ctx.restore(); } for (const sx of [-1, 1]) for (const y of [-0.2, 0.4]) art.ink(ctx, () => art.poly(ctx, [sx * h, y * h - 4, sx * (h + 7), y * h, sx * h, y * h + 4]), '#c94a6a', 1.5); break;
      case 'volt': line([h * 0.2, -h, h * 0.45, -h - 8, h * 0.15, -h - 11, h * 0.45, -h - 20], 4.5, P.ink); line([h * 0.2, -h, h * 0.45, -h - 8, h * 0.15, -h - 11, h * 0.45, -h - 20], 2.2, P.warn); if (Math.sin(t * 13) > 0.6) art.burst(ctx, h * 0.45, -h - 21, 4, 4, P.warn, t, 1.2); break;
      case 'mote': line([0, -h, 0, -h - 7], 2.4, '#3a7a2a'); for (const sx of [-1, 1]) art.ink(ctx, () => { ctx.beginPath(); ctx.ellipse(sx * 5, -h - 8, 5, 2.6, sx * -0.4, 0, 7); }, '#8ad85a', 1.5); break;
      case 'glint': { const cx = 6.5 + face * 1.5, cy = -h + 5 + h * 0.42; ctx.lineWidth = 2.6; ctx.strokeStyle = P.gold; art.circ(ctx, cx, cy, 6.5); ctx.stroke(); line([cx + 4.5, cy + 4.5, cx + 7, cy + 14], 1.4, P.gold); art.ink(ctx, () => art.poly(ctx, [-h * 0.6, -h + 1, -h * 0.9, -h - 12, -h * 0.35, -h + 1]), P.enemy, 1.8); break; }
      case 'fang': ctx.fillStyle = P.white; ctx.strokeStyle = P.ink; ctx.lineWidth = 1.4; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 4 - 2.5, -h + 5 + h * 0.84); ctx.lineTo(sx * 4 + 2.5, -h + 5 + h * 0.84); ctx.lineTo(sx * 4, -h + 11 + h * 0.84); ctx.closePath(); ctx.fill(); ctx.stroke(); } art.ink(ctx, () => art.poly(ctx, [-h - 2, -h * 0.1, -h - 2, -h - 6, -h * 0.4, -h + 2]), '#5a1a34', 2); art.ink(ctx, () => art.poly(ctx, [h + 2, -h * 0.1, h + 2, -h - 6, h * 0.4, -h + 2]), '#5a1a34', 2); break;
    }
  };

  // hitbox core (drawn at exact hitbox center, unscaled)
  art.drawCore = function (ctx, x, y, r, t, bold, flashing) {
    ctx.save();
    const pulse = 1 + Math.sin(t * 8) * 0.12;
    ctx.globalAlpha = 0.9;
    if (bold) { ctx.lineWidth = 3; ctx.strokeStyle = P.warn; art.circ(ctx, x, y, r + 5); ctx.stroke(); }
    ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.fillStyle = flashing ? P.coral : P.white; art.circ(ctx, x, y, r * 0.62 * pulse); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5; ctx.strokeStyle = P.blueDeep; art.circ(ctx, x, y, r); ctx.stroke();
    ctx.restore();
  };

  // weapon attachments on player
  art.drawPlayerGuns = function (ctx, p, weapons, t) {
    const a = p.aim || 0; const n = Math.min(weapons.length, 6);
    ctx.save(); ctx.translate(p.x, p.y + (p.bodyOff || -4));
    for (let i = n - 1; i >= 0; i--) {
      const w = weapons[i]; const def = SO.WEAPONS[w.id]; if (!def || !def.barrel) continue;
      const off = i === 0 ? 0 : (i % 2 ? -1 : 1) * (8 + Math.floor((i - 1) / 2) * 7);
      const recoil = (w.recoil || 0) * 6;
      ctx.save(); ctx.rotate(a); ctx.translate(0, off * 0.9);
      const len = (def.barrel || 22) * (i === 0 ? 1 : 0.7) - recoil; const wd = (def.bw || 7) * (i === 0 ? 1 : 0.75);
      art.inkRect(ctx, 6, -wd / 2, len, wd, 2.5, i === 0 ? P.blue : P.blueMid, 2.2);
      ctx.fillStyle = def.tint || P.teal; ctx.fillRect(6 + len - 5, -wd / 2 + 1.5, 4, wd - 3);
      ctx.restore();
    }
    ctx.restore();
  };

  /* ---------- icons (illustrations for cards) ---------- */
  const IC = {};
  function line(ctx, pts, lw = 3, col = P.ink) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
  IC.blaster = c => { art.inkRect(c, -18, -8, 30, 13, 3, P.blue); art.inkRect(c, -8, 3, 9, 14, 2, P.blueMid); art.inkRect(c, 12, -5, 10, 7, 2, P.teal); };
  IC.scatter = c => { art.inkRect(c, -20, -7, 26, 14, 4, P.blue); art.inkRect(c, 6, -10, 8, 20, 2, P.blueMid); for (const [x, y] of [[20, -10], [24, 0], [20, 10]]) art.inkCirc(c, x, y, 3.5, P.teal, 2); };
  IC.rocket = c => { c.rotate(-0.6); art.ink(c, () => art.poly(c, [-16, -6, 10, -6, 20, 0, 10, 6, -16, 6]), P.cream); art.ink(c, () => art.poly(c, [-16, -6, -22, -12, -10, -6]), P.coral, 2); art.ink(c, () => art.poly(c, [-16, 6, -22, 12, -10, 6]), P.coral, 2); art.inkCirc(c, 2, 0, 3, P.teal, 2); };
  IC.laser = c => { art.inkRect(c, -22, -8, 16, 16, 3, P.blue); c.fillStyle = P.teal; c.fillRect(-6, -3, 30, 6); line(c, [-6, -3, 24, -3, 24, 3, -6, 3], 2); };
  IC.seeker = c => { c.lineWidth = 3; c.strokeStyle = P.ink; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(-20, 14); c.quadraticCurveTo(-10, -18, 14, -8); c.stroke(); c.setLineDash([]); c.save(); c.translate(14, -8); c.rotate(0.3); art.ink(c, () => art.poly(c, [-8, -4, 6, 0, -8, 4]), P.teal, 2); c.restore(); };
  IC.boomerang = c => { art.ink(c, () => { c.beginPath(); c.moveTo(-18, 10); c.quadraticCurveTo(0, -24, 18, 10); c.quadraticCurveTo(0, -8, -18, 10); c.closePath(); }, P.coral); };
  IC.railgun = c => { art.inkRect(c, -22, -9, 44, 6, 2, P.blue); art.inkRect(c, -22, 3, 44, 6, 2, P.blue); c.fillStyle = P.teal; c.fillRect(-18, -2, 40, 4); };
  IC.tesla = c => { art.inkRect(c, -8, -4, 16, 22, 3, P.blue); for (let i = 0; i < 3; i++) art.inkRect(c, -11, -2 + i * 6, 22, 3, 1, P.gold, 1.5); art.inkCirc(c, 0, -10, 6, P.teal); line(c, [6, -12, 14, -18, 10, -10, 20, -16], 2.5, P.warn); };
  IC.blades = c => { art.inkCirc(c, 0, 0, 6, P.blue); for (let i = 0; i < 3; i++) { const a = i * 2.09; c.save(); c.rotate(a); art.ink(c, () => art.poly(c, [12, -4, 22, 0, 12, 6, 8, 0]), P.cream, 2); c.restore(); } c.lineWidth = 2; c.setLineDash([3, 4]); c.strokeStyle = P.ink; art.circ(c, 0, 0, 16); c.stroke(); c.setLineDash([]); };
  IC.gravity = c => { c.lineWidth = 3; c.strokeStyle = P.violet; c.beginPath(); for (let i = 0; i < 40; i++) { const a = i * 0.45, r = 2 + i * 0.5; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(r, 0); } c.stroke(); art.inkCirc(c, 0, 0, 5, P.ink, 0); };
  IC.drones = c => { art.inkRect(c, -9, -6, 18, 12, 3, P.teal); line(c, [-9, -6, -16, -12], 2); line(c, [9, -6, 16, -12], 2); c.fillStyle = P.ink; c.fillRect(-21, -14, 10, 2.5); c.fillRect(11, -14, 10, 2.5); art.inkCirc(c, 0, 0, 2.5, P.white, 1.5); };
  IC.harpoon = c => { c.rotate(-0.5); line(c, [-22, 0, 10, 0], 3); art.ink(c, () => art.poly(c, [10, -7, 22, 0, 10, 7, 13, 0]), P.cream, 2.5); c.strokeStyle = P.coral; c.lineWidth = 2; c.beginPath(); c.moveTo(-22, 0); c.bezierCurveTo(-26, 12, -14, 14, -18, 20); c.stroke(); };
  IC.prism = c => { art.ink(c, () => art.poly(c, [0, -16, 15, 12, -15, 12]), '#cdf6ff'); line(c, [-24, 0, -8, 0], 3, P.white); line(c, [8, 2, 24, -8], 2.5, P.teal); line(c, [8, 4, 24, 4], 2.5, P.warn); line(c, [8, 6, 24, 14], 2.5, P.coral); };
  IC.saw = c => { c.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 13 : 18; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = P.cream; c.fill(); c.lineWidth = 2.5; c.strokeStyle = P.ink; c.stroke(); art.inkCirc(c, 0, 0, 5, P.blue, 2); };
  IC.echo = c => { c.globalAlpha = 0.45; art.inkCirc(c, -10, 0, 6, P.teal, 2); c.globalAlpha = 1; art.inkCirc(c, 10, 0, 6, P.teal, 2.5); c.lineWidth = 2.5; c.strokeStyle = P.ink; for (const r of [10, 15]) { c.beginPath(); c.arc(10, 0, r, -0.8, 0.8); c.stroke(); } };
  IC.sticky = c => { art.ink(c, () => { c.beginPath(); c.moveTo(-14, 8); c.bezierCurveTo(-18, -14, 14, -18, 14, 4); c.bezierCurveTo(16, 14, -10, 18, -14, 8); }, P.coral); line(c, [8, -10, 14, -18], 2.5); art.burst(c, 16, -20, 5, 5, P.warn, 0, 1.5); art.inkCirc(c, -3, 0, 3, P.warn, 1.5); };
  IC.flak = c => { art.burst(c, 4, -2, 16, 8, P.warn, 0.2, 2.5); art.inkCirc(c, 4, -2, 6, P.coral, 2); for (let i = 0; i < 5; i++) { const a = i * 1.25; line(c, [Math.cos(a) * 18 + 4, Math.sin(a) * 18 - 2, Math.cos(a) * 23 + 4, Math.sin(a) * 23 - 2], 2); } };
  IC.flame = c => { art.ink(c, () => { c.beginPath(); c.moveTo(0, 18); c.bezierCurveTo(-18, 10, -12, -6, -4, -18); c.bezierCurveTo(-2, -8, 6, -8, 6, -16); c.bezierCurveTo(16, -4, 16, 12, 0, 18); }, P.coral); art.ink(c, () => { c.beginPath(); c.moveTo(0, 15); c.bezierCurveTo(-8, 10, -6, 0, -1, -6); c.bezierCurveTo(4, 2, 8, 6, 0, 15); }, P.warn, 2); };
  IC.needle = c => { for (let i = -1; i <= 1; i++) { line(c, [-18, i * 8 - 2, 16, i * 8 + 2], 2.5); art.ink(c, () => art.poly(c, [16, i * 8 - 1, 22, i * 8 + 3, 16, i * 8 + 5]), P.cream, 1.5); } };
  IC.mortar = c => { c.save(); c.rotate(-0.7); art.inkRect(c, -6, -2, 26, 12, 3, P.blue); c.restore(); art.inkRect(c, -14, 10, 20, 8, 2, P.blueMid); c.lineWidth = 2; c.setLineDash([3, 3]); c.strokeStyle = P.ink; c.beginPath(); c.moveTo(6, -14); c.quadraticCurveTo(18, -26, 24, -4); c.stroke(); c.setLineDash([]); };
  IC.cryo = c => { c.strokeStyle = '#bfe9ff'; for (let i = 0; i < 3; i++) { c.save(); c.rotate(i * Math.PI / 3); line(c, [0, -18, 0, 18], 5, P.ink); line(c, [0, -18, 0, 18], 2.5, '#bfe9ff'); line(c, [-5, -12, 0, -8, 5, -12], 2, P.ink); line(c, [-5, 12, 0, 8, 5, 12], 2, P.ink); c.restore(); } };
  IC.pulse = c => { for (const [r, col] of [[6, P.teal], [12, null], [18, null]]) { c.lineWidth = 3; c.strokeStyle = P.ink; art.circ(c, 0, 0, r); if (col) { c.fillStyle = col; c.fill(); } c.stroke(); } };
  IC.disc = c => { art.ink(c, () => { c.beginPath(); c.ellipse(4, 0, 14, 7, -0.3, 0, 7); }, P.cream); art.inkCirc(c, 4, 0, 3, P.teal, 1.5); line(c, [-22, -2, -12, -4], 2); line(c, [-22, 6, -12, 4], 2); };
  IC.whip = c => { c.lineWidth = 4; c.strokeStyle = P.ink; c.beginPath(); c.moveTo(-18, 14); c.bezierCurveTo(-6, -20, 10, 20, 20, -12); c.stroke(); c.lineWidth = 2; c.strokeStyle = P.coral; c.stroke(); art.inkRect(c, -22, 10, 8, 10, 2, P.blue, 2); art.burst(c, 20, -12, 6, 5, P.warn, 0, 1.5); };
  IC.jet = c => { art.inkRect(c, -10, -16, 20, 20, 4, P.blue); art.inkRect(c, -7, 4, 14, 5, 2, P.blueMid); IC.flame2(c, 0, 12); };
  IC.flame2 = (c, x, y) => { art.ink(c, () => { c.beginPath(); c.moveTo(x - 7, y); c.quadraticCurveTo(x, y + 18, x + 7, y); c.closePath(); }, P.warn, 2); };
  IC.minelayer = c => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(c, [Math.cos(a) * 10, Math.sin(a) * 10, Math.cos(a) * 17, Math.sin(a) * 17], 3); } art.inkCirc(c, 0, 0, 11, P.teal); art.inkCirc(c, 0, 0, 3, P.warn, 1.5); };
  IC.gatling = c => { for (let i = -1; i <= 1; i++) art.inkRect(c, -10, i * 6 - 2.5, 32, 5, 2, P.blue, 2); art.inkRect(c, -20, -11, 14, 22, 4, P.blueMid); art.inkCirc(c, -13, 0, 4, P.teal, 1.5); };
  IC.plasma = c => { c.save(); c.globalAlpha = 0.4; art.inkCirc(c, 0, 0, 19, P.violet, 0); c.restore(); art.inkCirc(c, 0, 0, 13, '#b9a6ff'); art.inkCirc(c, -3, -3, 4, P.white, 0); };
  IC.aegis = c => { art.ink(c, () => { c.beginPath(); c.moveTo(0, -14); c.lineTo(11, -9); c.lineTo(9, 6); c.lineTo(0, 13); c.lineTo(-9, 6); c.lineTo(-11, -9); c.closePath(); }, P.teal); for (const a of [0.4, 2.5, 4.4]) art.inkCirc(c, Math.cos(a) * 20, Math.sin(a) * 20, 4.5, P.cream, 2); };
  IC.ink = c => { art.ink(c, () => { c.beginPath(); c.moveTo(0, -18); c.bezierCurveTo(10, -4, 14, 4, 12, 9); c.bezierCurveTo(8, 18, -8, 18, -12, 9); c.bezierCurveTo(-14, 4, -10, -4, 0, -18); }, P.blueDeep); art.inkCirc(c, -4, 6, 3, P.blueLight, 0); };
  // categories
  IC.mobility = c => { art.ink(c, () => { c.beginPath(); c.moveTo(-18, 10); c.quadraticCurveTo(-6, -18, 18, -14); c.quadraticCurveTo(6, -6, 10, 2); c.quadraticCurveTo(-2, 0, -18, 10); }, P.teal); line(c, [-20, 16, -6, 12], 2.5); };
  IC.defense = c => { art.ink(c, () => { c.beginPath(); c.moveTo(0, -18); c.lineTo(15, -11); c.lineTo(12, 7); c.lineTo(0, 17); c.lineTo(-12, 7); c.lineTo(-15, -11); c.closePath(); }, P.blueLight); art.ink(c, () => { c.beginPath(); c.moveTo(0, -10); c.lineTo(8, -6); c.lineTo(6, 4); c.lineTo(0, 9); c.closePath(); }, P.cream, 2); };
  IC.repair = c => { c.save(); c.rotate(-0.8); art.inkRect(c, -4, -4, 8, 26, 3, P.blueMid); art.ink(c, () => { c.beginPath(); c.arc(0, -10, 10, 0.6, Math.PI * 2 - 0.6 + Math.PI); }, P.cream); c.restore(); art.ink(c, () => art.poly(c, [10, -4, 14, -4, 14, 0, 18, 0, 18, 4, 14, 4, 14, 8, 10, 8, 10, 4, 6, 4, 6, 0, 10, 0]), P.green, 2); };
  IC.crit = c => { for (const [r, col] of [[18, P.cream], [12, P.coral], [6, P.cream]]) art.inkCirc(c, 0, 0, r, col, 2.5); art.burst(c, 0, 0, 5, 4, P.warn, 0, 1.5); };
  IC.dot = c => { IC.flame(c); };
  IC.precision = c => { c.lineWidth = 3; c.strokeStyle = P.ink; art.circ(c, 0, 0, 14); c.stroke(); line(c, [-20, 0, -6, 0], 3); line(c, [6, 0, 20, 0], 3); line(c, [0, -20, 0, -6], 3); line(c, [0, 6, 0, 20], 3); art.inkCirc(c, 0, 0, 3, P.coral, 1.5); };
  IC.close = c => { art.burst(c, 0, 0, 19, 7, P.warn, 0.3, 2.5); art.inkRect(c, -9, -7, 18, 14, 4, P.cream, 2.5); line(c, [-3, -7, -3, 0], 2); line(c, [3, -7, 3, 0], 2); };
  IC.interact = c => { art.inkCirc(c, -6, 4, 9, P.enemy, 2.5); art.inkCirc(c, -6, 4, 3, P.enemyCore, 0); line(c, [-16, -6, 4, 14], 4, P.ink); line(c, [-16, -6, 4, 14], 2, P.teal); art.ink(c, () => art.poly(c, [6, -16, 20, -8, 6, -2]), P.teal, 2); };
  IC.global = c => { c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 13 : 18; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = P.blueLight; c.fill(); c.lineWidth = 2.5; c.strokeStyle = P.ink; c.stroke(); art.inkCirc(c, 0, 0, 6, P.cream, 2.5); };
  IC.utility = c => { art.inkRect(c, -14, -14, 28, 28, 6, P.blue); art.text(c, 'E', 0, 1, 22, P.warn, 'center', 4); };
  IC.transform = c => { art.burst(c, 0, 0, 20, 5, P.gold, -Math.PI / 2, 2.5); art.inkCirc(c, 0, 0, 5, P.white, 2); };
  IC.boss = c => { art.inkRect(c, -15, -15, 30, 30, 5, P.coral); art.inkCirc(c, -6, -3, 4, P.white, 1.5); art.inkCirc(c, 6, -3, 4, P.white, 1.5); };
  art.ICONS = IC;

  art.icon = function (ctx, key, x, y, s = 1) {
    const f = IC[key] || IC.global; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); f(ctx); ctx.restore();
  };

  // card illustration panel (halftone sunburst + icon)
  art.cardArt = function (canvas, key, theme = 'player', extra = null) {
    const g = canvas.getContext('2d'); const w = canvas.width, h = canvas.height;
    g.clearRect(0, 0, w, h);
    const bg = theme === 'boss' ? '#3b2236' : P.blueDeep;
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h / 2);
    const rays = 14; for (let i = 0; i < rays; i++) { g.beginPath(); g.moveTo(0, 0); const a0 = i / rays * Math.PI * 2, a1 = a0 + Math.PI / rays; g.arc(0, 0, w, a0, a1); g.closePath(); g.fillStyle = theme === 'boss' ? 'rgba(255,122,92,0.16)' : 'rgba(34,211,197,0.14)'; g.fill(); }
    g.restore();
    g.fillStyle = art.halftone(g, theme === 'boss' ? 'rgba(255,122,92,0.35)' : 'rgba(157,245,236,0.25)', 7, 1.6); g.fillRect(0, h * 0.55, w, h * 0.45);
    const s = Math.min(w, h) / 56;
    art.icon(g, key, w / 2, h / 2, s);
    if (extra) extra(g, w, h);
    g.lineWidth = 4; g.strokeStyle = P.ink; g.strokeRect(2, 2, w - 4, h - 4);
  };
})();
