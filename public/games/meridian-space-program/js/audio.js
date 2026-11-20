'use strict';
// ---------- Synthesised sound effects and generative music (Web Audio) ----------
const Sound = (function () {
  let ctx = null, master, sfx, music, noiseBuf, reverb;
  let engine = null, wind = null, started = false;
  const st = { sfxVol: 0.8, musicVol: 0.45, mood: 'center' };
  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = st.sfxVol; sfx.connect(master);
    music = ctx.createGain(); music.gain.value = st.musicVol * 0.5; music.connect(master);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    // simple generated reverb
    reverb = ctx.createConvolver();
    const rl = ctx.sampleRate * 3.5, rb = ctx.createBuffer(2, rl, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = rb.getChannelData(c); for (let i = 0; i < rl; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6); }
    reverb.buffer = rb;
    const rg = ctx.createGain(); rg.gain.value = 0.55; reverb.connect(rg); rg.connect(music);
    buildEngine(); buildWind();
    started = true;
    scheduleMusic();
  }
  function noiseSrc() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
  function buildEngine() {
    const n = noiseSrc();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; lp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = 0;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 42;
    const og = ctx.createGain(); og.gain.value = 0;
    const olp = ctx.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 160;
    n.connect(lp); lp.connect(g); g.connect(sfx);
    osc.connect(olp); olp.connect(og); og.connect(sfx);
    n.start(); osc.start();
    // crackle for solids
    const n2 = noiseSrc(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.8;
    const cg = ctx.createGain(); cg.gain.value = 0; n2.connect(bp); bp.connect(cg); cg.connect(sfx); n2.start();
    engine = { lp, g, og, osc, cg };
  }
  function buildWind() {
    const n = noiseSrc();
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0;
    n.connect(bp); bp.connect(g); g.connect(sfx); n.start();
    wind = { bp, g };
  }
  // level 0..1, solid 0..1, atm 0..1 (vacuum muffles)
  function setEngine(level, solid, atm) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const v = clamp(level, 0, 1);
    const muff = 0.35 + 0.65 * atm;
    engine.g.gain.setTargetAtTime(v * 0.9 * muff, t, 0.08);
    engine.og.gain.setTargetAtTime(v * 0.35 * muff, t, 0.08);
    engine.lp.frequency.setTargetAtTime(220 + 1300 * v * (0.4 + 0.6 * atm), t, 0.1);
    engine.osc.frequency.setTargetAtTime(36 + 22 * v, t, 0.2);
    engine.cg.gain.setTargetAtTime(solid * v * 0.25 * muff * (0.6 + 0.4 * Math.random()), t, 0.03);
  }
  function setWind(q, heat) {
    if (!ctx) return;
    const t = ctx.currentTime;
    wind.g.gain.setTargetAtTime(clamp(q / 40000, 0, 0.5) + clamp(heat, 0, 1) * 0.35, t, 0.15);
    wind.bp.frequency.setTargetAtTime(400 + clamp(q / 50, 0, 1600) + heat * 600, t, 0.2);
  }
  function burst(dur, freq, gain, type) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.15), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(f); f.connect(g); g.connect(sfx); n.start(t); n.stop(t + dur + 0.05);
  }
  function tone(freq, dur, gain, type, dest) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  const fx = {
    click() { tone(880, 0.06, 0.05, 'triangle'); },
    snap() { tone(320, 0.08, 0.12, 'square'); burst(0.08, 3000, 0.15, 'highpass'); },
    remove() { tone(220, 0.12, 0.08, 'triangle'); },
    stage() { burst(0.35, 900, 0.7); tone(70, 0.3, 0.35, 'sine'); },
    explode() { burst(2.2, 1800, 1.2); tone(45, 1.4, 0.6, 'sine'); },
    chute() { burst(0.6, 2500, 0.35, 'bandpass'); },
    success() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.5, 0.06, 'sine'), i * 110)); },
    fail() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.5, 0.07, 'triangle'), i * 160)); },
    science() { [784, 988, 1175].forEach((f, i) => setTimeout(() => tone(f, 0.35, 0.05, 'sine'), i * 80)); },
    thud() { burst(0.25, 400, 0.6); },
    jet() { burst(0.12, 2600, 0.04, 'highpass'); },
  };
  // ---- generative ambient music ----
  const MOODS = {
    center: { root: 57, scale: [0, 2, 4, 7, 9], tempo: 2.4 },
    editor: { root: 55, scale: [0, 2, 5, 7, 9], tempo: 2.0 },
    flight: { root: 50, scale: [0, 3, 5, 7, 10], tempo: 3.0 },
    space: { root: 48, scale: [0, 2, 7, 9, 11], tempo: 3.6 },
    research: { root: 60, scale: [0, 4, 7, 9, 11], tempo: 2.2 },
  };
  let musicTimer = null, chordIdx = 0;
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  function pad(freqs, dur) {
    const t = ctx.currentTime;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    lp.connect(g); g.connect(music); g.connect(reverb);
    for (const f of freqs) for (const det of [-6, 5]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = 0.25; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.1);
    }
  }
  function bell(f) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.76;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(reverb); g.connect(music);
    o.start(t); o2.start(t); o.stop(t + 3.6); o2.stop(t + 3.6);
  }
  function scheduleMusic() {
    if (musicTimer) clearTimeout(musicTimer);
    const step = () => {
      if (!ctx) return;
      const m = MOODS[st.mood] || MOODS.center;
      if (st.musicVol > 0.001) {
        const prog = [0, 3, 4, 2];
        const deg = prog[chordIdx % 4]; chordIdx++;
        const sc = m.scale;
        const notes = [0, 2, 4].map(k => { const i = deg + k; return m.root + sc[i % sc.length] + 12 * Math.floor(i / sc.length); });
        pad(notes.map(midi), m.tempo * 4);
        const nb = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < nb; i++) setTimeout(() => { if (ctx && st.musicVol > 0.001) bell(midi(m.root + 24 + sc[Math.floor(Math.random() * sc.length)] + (Math.random() < 0.3 ? 12 : 0))); }, (Math.random() * m.tempo * 3.5) * 1000);
      }
      musicTimer = setTimeout(step, m.tempo * 4 * 1000 * 0.8);
    };
    step();
  }
  return {
    init, fx, setEngine, setWind,
    get ready() { return !!ctx; },
    setVolumes(s, m) { st.sfxVol = s; st.musicVol = m; if (ctx) { sfx.gain.value = s; music.gain.value = m * 0.5; } },
    setMood(m) { st.mood = m; },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    pauseAll(p) { if (!ctx) return; if (p) master.gain.setTargetAtTime(0.25, ctx.currentTime, 0.1); else master.gain.setTargetAtTime(1, ctx.currentTime, 0.1); },
  };
})();
