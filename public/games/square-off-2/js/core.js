/* Square Off 2 — core: namespace, math, rng, input, audio, persistence */
'use strict';
const SO = window.SO = {};
SO.VERSION = '1.0.0';
SO.W = 1280; SO.H = 720;
SO.ARENA = { L: 26, R: 1254, T: 66, B: 676 };

SO.PAL = {
  ink: '#1b1a2e', inkSoft: '#3a3850',
  cream: '#f4ead5', paper: '#efe2c4', paperDark: '#dccaa3', paperDeep: '#c9b48a',
  blue: '#23395b', blueDeep: '#152338', blueMid: '#34507d', blueLight: '#7c9cc9', blueFog: '#5b7299',
  coral: '#ff7a5c', coralDark: '#d9503b', coralLight: '#ffb09c',
  teal: '#22d3c5', tealDark: '#0f9a90', tealLight: '#9df5ec',
  warn: '#ffd23f', warnDark: '#d9a600',
  enemy: '#ff2f63', enemyDark: '#b3123f', enemyCore: '#fff4c9',
  friend: '#3ff3e2', friendCore: '#f2fffd',
  white: '#fffaf0', gold: '#f2b632', violet: '#7b5cff', green: '#7fdc6a'
};

/* ---------- math ---------- */
const M = SO.M = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a = 0, b = 1) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  dist2: (x1, y1, x2, y2) => (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1),
  ang: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
  wrap: a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; },
  approach: (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t),
  turnToward(cur, target, maxStep) { const d = M.wrap(target - cur); return cur + M.clamp(d, -maxStep, maxStep); },
  easeOut: t => 1 - (1 - t) * (1 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOutBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1; const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0; t = M.clamp(t, 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  },
  circleRect(cx, cy, r, rx, ry, rw, rh) { // rect given by center & half extents
    const dx = Math.abs(cx - rx), dy = Math.abs(cy - ry);
    if (dx > rw + r || dy > rh + r) return false;
    if (dx <= rw || dy <= rh) return true;
    return (dx - rw) * (dx - rw) + (dy - rh) * (dy - rh) <= r * r;
  },
  // ray from (x,y) dir a: distance to arena wall
  rayToWall(x, y, a, A = SO.ARENA) {
    const c = Math.cos(a), s = Math.sin(a); let t = 1e9;
    if (c > 1e-6) t = Math.min(t, (A.R - x) / c); else if (c < -1e-6) t = Math.min(t, (A.L - x) / c);
    if (s > 1e-6) t = Math.min(t, (A.B - y) / s); else if (s < -1e-6) t = Math.min(t, (A.T - y) / s);
    return Math.max(0, t);
  },
  fmt(n, d = 0) { if (typeof n !== 'number') return n; const p = Math.pow(10, d); return String(Math.round(n * p) / p); },
  pct: n => Math.round(n * 100) + '%',
  shuffle(arr, rng = Math.random) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
};

SO.RNG = function (seed) {
  let a = (seed >>> 0) || 1;
  const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.int = n => Math.floor(f() * n);
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.range = (lo, hi) => lo + f() * (hi - lo);
  return f;
};
SO.hash = function (str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
SO.clone = o => JSON.parse(JSON.stringify(o));

/* ---------- input ---------- */
SO.BINDS = {
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  thrust: ['Space', 'KeyW', 'ArrowUp'], dash: ['ShiftLeft', 'ShiftRight'],
  util: ['KeyE'], pause: ['Escape', 'KeyP']
};
SO.input = {
  keys: Object.create(null), buffer: Object.create(null),
  mouse: { cx: 0, cy: 0, x: 640, y: 360, down: false, moved: false },
  gameFocus: true, canvas: null,
  init(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', e => {
      SO.sfx.unlock();
      if (!e.repeat) this.buffer[e.code] = performance.now();
      this.keys[e.code] = true;
      if (this.gameFocus && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') e.preventDefault();
      }
      if (SO.onKey) SO.onKey(e);
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = Object.create(null); this.mouse.down = false; });
    window.addEventListener('mousemove', e => { this.mouse.cx = e.clientX; this.mouse.cy = e.clientY; this.mouse.moved = true; });
    window.addEventListener('mousedown', e => { SO.sfx.unlock(); if (e.button === 0) this.mouse.down = true; });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.mouse.down = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  },
  updateMouse() {
    const r = this.canvas.getBoundingClientRect();
    if (r.width > 0) {
      this.mouse.x = (this.mouse.cx - r.left) / r.width * SO.W;
      this.mouse.y = (this.mouse.cy - r.top) / r.height * SO.H;
    }
  },
  down(action) { const b = SO.BINDS[action]; for (let i = 0; i < b.length; i++) if (this.keys[b[i]]) return true; return false; },
  // buffered press: true if pressed within window ms; consumes
  take(action, windowMs = 130) {
    const b = SO.BINDS[action], now = performance.now();
    for (let i = 0; i < b.length; i++) { const t = this.buffer[b[i]]; if (t && now - t <= windowMs) { this.buffer[b[i]] = 0; return true; } }
    return false;
  },
  clearBuffer() { this.buffer = Object.create(null); }
};

/* ---------- audio (synthesized, no files needed) ---------- */
SO.sfx = {
  ctx: null, master: null, noiseBuf: null, last: Object.create(null), vol: 0.6, ok: false,
  unlock() {
    if (this.ok) { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.6; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.ok = true;
      if (SO.music) SO.music.onUnlock();
    } catch (e) { this.ok = false; }
  },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
  tone(type, f0, f1, dur, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay; const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, f0, f1, vol, q = 1, delay = 0, type = 'lowpass') {
    const c = this.ctx, t = c.currentTime + delay; const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.02);
  },
  play(name, v = 1) {
    if (!this.ok || this.vol <= 0) return;
    const gap = { shoot: 0.055, hit: 0.045, zap: 0.06, crit: 0.07, boom: 0.06, eshot: 0.07, graze: 0.08, beam: 0.09 }[name] || 0.02;
    const now = this.ctx.currentTime; if (this.last[name] && now - this.last[name] < gap) return; this.last[name] = now;
    try {
      switch (name) {
        case 'shoot': this.tone('square', 760, 380, 0.045, 0.035 * v); break;
        case 'heavy': this.tone('sawtooth', 220, 70, 0.16, 0.09 * v); this.noise(0.12, 2000, 300, 0.06 * v); break;
        case 'beam': this.tone('sawtooth', 980, 900, 0.08, 0.025 * v); break;
        case 'hit': this.noise(0.035, 4000, 1500, 0.05 * v, 1, 0, 'highpass'); break;
        case 'crit': this.tone('triangle', 1400, 700, 0.09, 0.07 * v); break;
        case 'boom': this.noise(0.4, 1400, 60, 0.22 * v); this.tone('sine', 110, 38, 0.35, 0.18 * v); break;
        case 'smallboom': this.noise(0.18, 2400, 200, 0.1 * v); break;
        case 'dash': this.noise(0.17, 600, 3200, 0.1 * v, 2, 0, 'bandpass'); break;
        case 'hurt': this.tone('square', 320, 110, 0.22, 0.13 * v); this.noise(0.12, 3000, 400, 0.08 * v); break;
        case 'warn': this.tone('triangle', 880, 860, 0.07, 0.06 * v); this.tone('triangle', 660, 650, 0.07, 0.06 * v, 0.09); break;
        case 'charge': this.tone('sawtooth', 120, 620, 0.5, 0.06 * v); break;
        case 'laser': this.tone('sawtooth', 300, 140, 0.45, 0.07 * v); this.noise(0.4, 900, 300, 0.06 * v, 3, 0, 'bandpass'); break;
        case 'eshot': this.tone('triangle', 420, 300, 0.06, 0.03 * v); break;
        case 'break': this.noise(0.3, 3000, 150, 0.2 * v); this.tone('square', 180, 50, 0.3, 0.1 * v); break;
        case 'zap': this.tone('square', 1800, 300, 0.06, 0.04 * v); break;
        case 'shield': this.tone('sine', 300, 700, 0.18, 0.08 * v); break;
        case 'heal': this.tone('sine', 520, 880, 0.2, 0.07 * v); this.tone('sine', 780, 1200, 0.2, 0.05 * v, 0.08); break;
        case 'graze': this.tone('sine', 1500, 1900, 0.05, 0.025 * v); break;
        case 'ui': this.tone('triangle', 520, 520, 0.05, 0.05 * v); break;
        case 'select': this.tone('triangle', 620, 880, 0.08, 0.07 * v); break;
        case 'confirm': [523, 659, 784].forEach((f, i) => this.tone('triangle', f, f, 0.12, 0.07 * v, i * 0.06)); break;
        case 'deny': this.tone('square', 200, 160, 0.12, 0.06 * v); break;
        case 'victory': [523, 659, 784, 1046].forEach((f, i) => this.tone('square', f, f, 0.16, 0.06 * v, i * 0.1)); break;
        case 'defeat': [392, 330, 262, 196].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.22, 0.08 * v, i * 0.16)); break;
        case 'util': this.tone('sine', 200, 900, 0.25, 0.09 * v); break;
        case 'stagger': this.tone('square', 600, 90, 0.4, 0.08 * v); break;
      }
    } catch (e) { /* ignore audio errors */ }
  }
};

/* ---------- persistence ---------- */
SO.SAVE_KEY = 'square-off-2-save-v1';
SO.save = {
  data: null,
  defaults() {
    return {
      v: 1,
      settings: { shake: 0.7, reducedFlash: false, lightweight: false, sfx: 0.55, music: 0.5, words: true, dmgNumbers: false, friendlyAlpha: 0.8, hitstop: true, boldHitbox: false, paint: 'classic' },
      records: { runs: 0, standardWins: 0, bestStandardRound: 0, endlessBest: 0, endlessBestKit: {}, modulesBroken: 0, bossesBeaten: 0, fastestWin: 0, chassisSeen: [], weaponsUsed: [], challengeWins: 0, totalDamage: 0, charsUsed: [] },
      unlocks: { kits: ['tinkerer', 'brawler', 'hex', 'penny', 'tempo', 'magpie', 'titan'], cosmetics: ['classic'], challenges: ['glass', 'rush', 'noreroll'], weapons: [], tutorialDone: false, seen: [] },
      run: null
    };
  },
  load() {
    let d = null;
    try { const raw = localStorage.getItem(SO.SAVE_KEY); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
    const def = this.defaults();
    if (!d || typeof d !== 'object') d = def;
    for (const k of ['settings', 'records', 'unlocks']) d[k] = Object.assign({}, def[k], d[k] || {});
    if (!('run' in d)) d.run = null;
    for (const k of (SO.KIT_START || ['hex'])) if (!d.unlocks.kits.includes(k)) d.unlocks.kits.push(k);
    d.unlocks.kits = d.unlocks.kits.map(k => k === 'mirror' ? 'medic' : k);
    if (d.run && d.run.kit === 'mirror') d.run.kit = 'medic';
    if (d.run && !(SO.KITS && SO.KITS[d.run.kit])) d.run.kit = 'tinkerer';
    this.data = d; return d;
  },
  write() { try { localStorage.setItem(SO.SAVE_KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; } },
  reset() { this.data = this.defaults(); this.write(); },
  get settings() { return this.data.settings; }
};
