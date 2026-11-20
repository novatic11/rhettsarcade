/* Ducks vs. Dogs 2 — synthesized sound effects and music (no audio files needed). */
(function (D) {
  'use strict';

  const A = {
    ctx: null, master: null, sfx: null, mus: null, noiseBuf: null,
    musicTimer: null, theme: null, step: 0, nextTime: 0, lastPlay: {},

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
      this.mus = this.ctx.createGain(); this.mus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      if (this.pendingTheme != null) this.music(this.pendingTheme);
    },

    applyVolumes() {
      if (!this.ctx) return;
      const s = D.Save.data.settings;
      this.master.gain.value = s.muted ? 0 : 1;
      this.sfx.gain.value = s.sfx * 0.6;
      this.mus.gain.value = s.music * 0.22;
    },

    // ---------- primitives
    tone(freq, dur, type, vol, slideTo, delay, dest) {
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || this.sfx);
      o.start(t); o.stop(t + dur + 0.05);
      return o;
    },
    noise(dur, vol, filterType, freq, q, delay, dest, freqTo) {
      const c = this.ctx, t = c.currentTime + (delay || 0);
      const src = c.createBufferSource(); src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter(); f.type = filterType || 'lowpass'; f.frequency.setValueAtTime(freq || 1000, t); f.Q.value = q || 1;
      if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(vol || 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(dest || this.sfx);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    },

    play(name, p) {
      if (!this.ctx || D.Save.data.settings.muted) return;
      const now = this.ctx.currentTime;
      // simple rate limit per sound so swarms don't clip
      const minGap = { hit: 0.05, shoot: 0.06, bark: 0.25, quack: 0.12, splash: 0.05, zap: 0.08, pop: 0.04 }[name] || 0.02;
      if (this.lastPlay[name] && now - this.lastPlay[name] < minGap) return;
      this.lastPlay[name] = now;
      p = p || 1;
      switch (name) {
        case 'quack': {
          const o = this.tone(520 * p, 0.16, 'sawtooth', 0.12, 330 * p);
          this.tone(260 * p, 0.14, 'square', 0.05, 180 * p, 0.0);
          break;
        }
        case 'bark':
          this.tone(220 * p, 0.12, 'square', 0.12, 120 * p);
          this.noise(0.1, 0.12, 'bandpass', 900 * p, 2);
          break;
        case 'yelp':
          this.tone(700 * p, 0.22, 'triangle', 0.14, 1300 * p);
          this.tone(1200 * p, 0.2, 'sine', 0.06, 600, 0.18);
          break;
        case 'shoot': this.noise(0.08, 0.12, 'bandpass', 1400, 3, 0, null, 500); this.tone(600, 0.06, 'sine', 0.05, 300); break;
        case 'splash': this.noise(0.18, 0.12, 'lowpass', 2400, 1, 0, null, 400); break;
        case 'hit': this.tone(180, 0.07, 'square', 0.06, 90); break;
        case 'armor': this.tone(1200, 0.08, 'square', 0.05, 900); this.tone(1700, 0.1, 'sine', 0.04, 1500, 0.02); break;
        case 'pop': this.tone(800, 0.08, 'sine', 0.12, 1600); break;
        case 'crumb': this.tone(880, 0.07, 'triangle', 0.12); this.tone(1320, 0.1, 'triangle', 0.1, 0, 0.06); break;
        case 'coin': this.tone(1320, 0.08, 'square', 0.06); this.tone(1980, 0.18, 'square', 0.06, 0, 0.07); break;
        case 'place': this.tone(160, 0.12, 'sine', 0.25, 90); this.noise(0.08, 0.1, 'lowpass', 600); break;
        case 'remove': this.noise(0.2, 0.15, 'bandpass', 500, 1, 0, null, 200); this.tone(300, 0.15, 'triangle', 0.1, 150); break;
        case 'deny': this.tone(200, 0.1, 'square', 0.08); this.tone(150, 0.15, 'square', 0.08, 0, 0.09); break;
        case 'click': this.tone(660, 0.05, 'triangle', 0.1, 880); break;
        case 'boom': this.noise(0.7, 0.4, 'lowpass', 900, 1, 0, null, 60); this.tone(110, 0.5, 'sine', 0.35, 30); break;
        case 'zap': this.tone(1600, 0.12, 'sawtooth', 0.06, 200); this.noise(0.12, 0.08, 'highpass', 3000); break;
        case 'freeze': this.tone(2000, 0.3, 'sine', 0.06, 3200); this.noise(0.3, 0.06, 'highpass', 5000); break;
        case 'whoosh': this.noise(0.45, 0.18, 'bandpass', 400, 1.5, 0, null, 1600); break;
        case 'honk':
          this.tone(330, 0.25, 'sawtooth', 0.14, 300); this.tone(392, 0.3, 'sawtooth', 0.12, 350, 0.2); break;
        case 'snap': this.noise(0.08, 0.3, 'highpass', 1500); this.tone(90, 0.2, 'square', 0.2, 40); break;
        case 'bubble': this.tone(400, 0.12, 'sine', 0.1, 900); this.tone(600, 0.1, 'sine', 0.08, 1200, 0.08); break;
        case 'heal': this.tone(660, 0.15, 'sine', 0.06, 990); this.tone(990, 0.2, 'sine', 0.05, 1320, 0.1); break;
        case 'drum': this.tone(120, 0.15, 'sine', 0.2, 60); this.noise(0.05, 0.08, 'highpass', 4000, 1, 0.12); break;
        case 'bonk': this.tone(300, 0.1, 'square', 0.1, 120); this.tone(900, 0.1, 'sine', 0.06, 1500, 0.05); break;
        case 'smash': this.noise(0.4, 0.3, 'lowpass', 500, 1, 0, null, 80); this.tone(80, 0.3, 'square', 0.15, 40); break;
        case 'wave': this.tone(196, 0.5, 'sawtooth', 0.1, 196); this.tone(294, 0.6, 'sawtooth', 0.08, 294, 0.15); this.tone(392, 0.8, 'sawtooth', 0.08, 392, 0.3); break;
        case 'warn': this.tone(880, 0.12, 'square', 0.06); this.tone(660, 0.12, 'square', 0.06, 0, 0.15); break;
        case 'power':
          [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.1, 0, i * 0.05));
          this.noise(0.4, 0.06, 'bandpass', 2000, 1, 0, null, 5000); break;
        case 'buy': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.16, 'square', 0.05, 0, i * 0.07)); break;
        case 'win': [523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.13, 0, i * 0.13)); break;
        case 'lose': [392, 370, 349, 262].forEach((f, i) => this.tone(f, 0.35, 'sawtooth', 0.08, f * 0.95, i * 0.25)); break;
        case 'reveal': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.1, 0, i * 0.09)); break;
        case 'boss': this.tone(80, 1.2, 'sawtooth', 0.15, 60); this.tone(120, 1.2, 'square', 0.06, 90, 0.1); break;
        case 'throw': this.noise(0.15, 0.08, 'bandpass', 900, 2, 0, null, 2000); break;
        case 'squeak': this.tone(1200, 0.12, 'square', 0.08, 1800); this.tone(1700, 0.1, 'square', 0.06, 1100, 0.1); break;
        case 'flame': this.noise(0.4, 0.14, 'bandpass', 600, 0.8, 0, null, 2400); break;
        case 'portal': this.tone(300, 0.4, 'sine', 0.1, 1200); this.tone(600, 0.4, 'triangle', 0.05, 200, 0.05); break;
        case 'howl': this.tone(300, 0.9, 'sawtooth', 0.08, 700); this.tone(310, 0.9, 'sine', 0.08, 680, 0.05); break;
        case 'ghost': this.tone(500, 0.6, 'sine', 0.05, 250); this.tone(520, 0.6, 'sine', 0.04, 260, 0.1); break;
        case 'dig': this.noise(0.25, 0.15, 'lowpass', 700, 1, 0, null, 200); this.tone(140, 0.1, 'square', 0.06, 90, 0.12); break;
        case 'ping': this.tone(1800, 0.2, 'sine', 0.1, 2400); this.tone(2600, 0.15, 'sine', 0.05, 0, 0.05); break;
        default: this.tone(440, 0.05, 'sine', 0.05);
      }
    },

    // ---------- music: tiny step sequencer per theme
    THEMES: [
      { bpm: 112, root: 60, scale: [0, 2, 4, 7, 9], bass: [0, 0, 5, 7], lead: 'triangle', swing: 0 },   // park
      { bpm: 92, root: 57, scale: [0, 3, 5, 7, 10], bass: [0, 5, 3, 7], lead: 'sine', swing: 0.1 },     // marsh
      { bpm: 120, root: 62, scale: [0, 2, 4, 7, 9], bass: [0, 7, 5, 4], lead: 'square', swing: 0.15 },  // boardwalk
      { bpm: 100, root: 64, scale: [0, 2, 4, 7, 11], bass: [0, 4, 5, 7], lead: 'sine', swing: 0 },      // snowy
      { bpm: 128, root: 55, scale: [0, 3, 5, 6, 7, 10], bass: [0, 0, 3, 5], lead: 'sawtooth', swing: 0 },// fortress
      { bpm: 104, root: 60, scale: [0, 2, 4, 5, 7, 9], bass: [0, 5, 7, 5], lead: 'triangle', swing: 0.08 }, // menu
      { bpm: 140, root: 52, scale: [0, 1, 3, 5, 7, 8], bass: [0, 0, 1, 0], lead: 'sawtooth', swing: 0 },  // boss
      { bpm: 96, root: 57, scale: [0, 3, 6, 7, 10], bass: [0, 6, 3, 7], lead: 'triangle', swing: 0.18 }  // haunted kennel
    ],
    music(themeIdx) {
      this.pendingTheme = themeIdx;
      if (!this.ctx) return;
      if (this.theme === themeIdx && this.musicTimer) return;
      this.stopMusic();
      this.theme = themeIdx;
      const th = this.THEMES[themeIdx] || this.THEMES[0];
      // deterministic melody pattern per theme
      let seed = themeIdx * 977 + 13;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      this.pattern = [];
      for (let i = 0; i < 32; i++) this.pattern.push(rnd() < 0.62 ? th.scale[Math.floor(rnd() * th.scale.length)] + (rnd() < 0.25 ? 12 : 0) : null);
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.musicTimer = setInterval(() => this.schedule(th), 60);
    },
    stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; this.theme = null; },
    schedule(th) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const stepDur = 60 / th.bpm / 2;
      while (this.nextTime < this.ctx.currentTime + 0.25) {
        const s = this.step % 32;
        const t = this.nextTime - this.ctx.currentTime + (s % 2 ? th.swing * stepDur : 0);
        const midi = n => 440 * Math.pow(2, (n - 69) / 12);
        if (s % 4 === 0) {
          const b = th.bass[Math.floor(s / 8) % th.bass.length];
          this.tone(midi(th.root - 24 + b), stepDur * 3.5, 'sine', 0.35, 0, Math.max(0, t), this.mus);
        }
        const n = this.pattern[s];
        if (n != null) this.tone(midi(th.root + n), stepDur * 1.6, th.lead, th.lead === 'sawtooth' || th.lead === 'square' ? 0.07 : 0.16, 0, Math.max(0, t), this.mus);
        if (s % 2 === 0) this.noise(0.04, s % 8 === 4 ? 0.1 : 0.04, 'highpass', 6000, 1, Math.max(0, t), this.mus);
        if (s % 8 === 0) this.tone(90, 0.12, 'sine', 0.3, 45, Math.max(0, t), this.mus);
        this.step++;
        this.nextTime += stepDur;
      }
    }
  };

  D.Audio = A;
})(window.DVD);
