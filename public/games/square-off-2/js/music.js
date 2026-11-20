/* Square Off 2 — music: gapless looping themes + a procedurally rendered menu theme.
   Loop points were found by analysing the decoded audio: an exhaustive search of every jump from late
   in each song back to earlier material (chroma + timbre self-similarity, scored on seam quality AND how
   much of the song stays in the loop), then FFT waveform cross-correlation for the exact landing sample. Leading silence is skipped,
   fade-outs/endings are excluded, and the seam is blended with a one-beat crossfade into
   the audio that naturally precedes the loop start, so the wrap is inaudible. */
'use strict';
(function () {
  const TRACKS = SO.MUSIC_TRACKS = {
    // start: where playback begins (silence trimmed); loopStart/loopEnd in seconds of the original file
    main: { file: 'assets/music/main-theme.mp3', start: 4.0809, loopStart: 11.02014, loopEnd: 112.742, xfade: 0.397, label: '101.7s loop (the song\x27s unique final section and fade are excluded)', beat: 60 / 151 },
    endless: { file: 'assets/music/endless-theme.mp3', start: 0.04, fills: [{ at: 9.83, dur: 0.17, from: 9.83 - 0.6316 }], loopStart: 14.36864, loopEnd: 153.316, xfade: 0.632, label: '138.9s loop: everything after the intro build except the last 3.4s', beat: 60 / 95 },
    training: { file: 'assets/music/training-theme.mp3', start: 1.39, loopStart: 1.42, loopEnd: 116.42, xfade: 0.625, label: '115s loop: the whole song from its opening hit to just before the ending', beat: 60 / 96 },
    menu: { procedural: true }
  };

  const mus = SO.music = {
    want: null, cur: null, gain: null, cache: {}, loading: {}, duck: 1, vol: 0.5,
    ctx() { return SO.sfx.ctx; },
    setVol(v) { this.vol = v; if (this.gain) this.gain.gain.setTargetAtTime(v * this.duck, this.ctx().currentTime, 0.05); if (this.el) this.el.volume = Math.min(1, v * this.duck); },
    setDuck(d) { this.duck = d; this.setVol(this.vol); },
    play(name) { this.want = name; if (this.ctx() && SO.sfx.ok) this.apply(); },
    onUnlock() { if (this.want) this.apply(); },
    async apply() {
      const name = this.want; if (!name || (this.cur && this.cur.name === name)) return;
      const ac = this.ctx(); if (!ac) return;
      if (!this.gain) { this.gain = ac.createGain(); this.gain.gain.value = this.vol * this.duck; this.gain.connect(ac.destination); }
      let buf;
      try { buf = await this.load(name); } catch (e) { console.warn('music load failed, using fallback', name, e); return this.fallback(name); }
      if (this.want !== name || (this.cur && this.cur.name === name)) return;
      const old = this.cur; const t = ac.currentTime;
      this.stopCurrent(0.25);
      const src = ac.createBufferSource(); src.buffer = buf.buffer; src.loop = true; src.loopStart = buf.loopStart; src.loopEnd = buf.buffer.duration;
      const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + (old ? 0.8 : 0.4));
      src.connect(g); g.connect(this.gain); src.start(t + (old ? 0.15 : 0));
      this.cur = { name, src, g };
      // keep memory modest (Chromebooks): only the playing track + the menu loop stay decoded
      for (const k in this.cache) if (k !== name && k !== 'menu') delete this.cache[k];
    },
    // fade out and stop whatever is playing (Web Audio source or the <audio> fallback). Every track change goes through here.
    stopCurrent(fade = 0.2) {
      const c = this.cur; this.cur = null;
      if (c) { const ac = this.ctx(); const t = ac ? ac.currentTime : 0; try { c.g.gain.cancelScheduledValues && c.g.gain.cancelScheduledValues(t); c.g.gain.setTargetAtTime(0, t, fade); } catch (e) { } try { c.src.stop(t + fade * 6); } catch (e) { } }
      if (this.el && !(c && c.el === this.el)) { this.el.pause(); }
    },
    stop() { this.want = null; this.stopCurrent(0.2); if (this.el) this.el.pause(); },
    load(name) {
      if (this.cache[name]) return Promise.resolve(this.cache[name]);
      if (this.loading[name]) return this.loading[name];
      const T = TRACKS[name];
      const p = (T.procedural ? this.renderMenu() : fetch(T.file).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(ab => new Promise((res, rej) => this.ctx().decodeAudioData(ab, res, rej))).then(b => this.buildLoop(b, T)))
        .then(x => { this.cache[name] = x; delete this.loading[name]; return x; }, e => { delete this.loading[name]; throw e; });
      this.loading[name] = p; return p;
    },
    // trim the head, cut at loopEnd, and crossfade the last beat into the audio leading up to loopStart
    buildLoop(b, T) {
      const sr = b.sampleRate, ac = this.ctx();
      const S0 = Math.round(T.start * sr), LS = Math.round(T.loopStart * sr), LE = Math.round(T.loopEnd * sr), X = Math.round(T.xfade * sr);
      const len = LE - S0; const out = ac.createBuffer(b.numberOfChannels, len, sr);
      for (let c = 0; c < b.numberOfChannels; c++) {
        const src = b.getChannelData(c), dst = out.getChannelData(c);
        dst.set(src.subarray(S0, LE));
        // fill short silent pauses with the previous beat (keeps timing, removes the silence)
        for (const f of (T.fills || [])) { const A0 = Math.round(f.at * sr) - S0, D = Math.round(f.dur * sr), F0 = Math.round(f.from * sr), E = Math.round(0.02 * sr); for (let i = -E; i < D + E; i++) { const j = A0 + i; if (j < 0 || j >= len) continue; const w = i < 0 ? (i + E) / E : i >= D ? 1 - (i - D) / E : 1; dst[j] = dst[j] * (1 - w) + src[F0 + i] * w; } }
        for (let i = 0; i < X; i++) { const k = i / X, w = 0.5 - 0.5 * Math.cos(Math.PI * k); dst[len - X + i] = src[LE - X + i] * (1 - w) + src[LS - X + i] * w; }
        // fade in the very first samples so the trimmed head never clicks
        const FI = Math.round(0.03 * sr); for (let i = 0; i < FI; i++) dst[i] *= i / FI;
      }
      this.fillGaps(out, T.beat || 0.5, false, LS - S0);
      return { buffer: out, loopStart: (LS - S0) / sr };
    },
    // Any 10ms stretch quieter than -40 dB gets patched with the same moment one beat earlier (or later),
    // crossfaded over 15ms. Rhythm stays on the grid; silence never reaches the player.
    fillGaps(buf, beat, circular, loopStartSample = Infinity) {
      const sr = buf.sampleRate, N = buf.length, w = Math.round(sr * 0.01), B = Math.round(beat * sr), E = Math.round(sr * 0.015);
      const c0 = buf.getChannelData(0), c1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : c0;
      const db = p => { let s = 0; for (let i = p; i < p + w; i++) { const k = circular ? i % N : i; if (k >= N) break; const v = (c0[k] + c1[k]) * 0.5; s += v * v; } return 10 * Math.log10(s / w + 1e-12); };
      const runs = []; let st = -1; const startAt = circular ? 0 : Math.min(Math.round(sr * 0.06), loopStartSample); // once the loop has begun, every sample counts
      for (let p = startAt; p + w <= N; p += w) { if (db(p) < -40) { if (st < 0) st = p; } else if (st >= 0) { runs.push([st, p]); st = -1; } }
      if (st >= 0) runs.push([st, N]);
      const copy = [Float32Array.from(c0), c1 === c0 ? null : Float32Array.from(c1)];
      let filled = 0;
      for (const [a, b] of runs) {
        let off = -B; const loud = o => { let s = 0, n = 0; for (let i = a; i < b; i += 8) { let k = i + o; if (circular) k = ((k % N) + N) % N; if (k < 0 || k >= N) return -99; const v = (copy[0][k] + (copy[1] || copy[0])[k]) * 0.5; s += v * v; n++; } return 10 * Math.log10(s / Math.max(1, n) + 1e-12); };
        if (loud(-B) < -35) off = loud(B) > loud(-2 * B) ? B : -2 * B; if (loud(off) < -38) continue;
        for (let i = a - E; i < b + E; i++) { let k = i; if (circular) k = ((k % N) + N) % N; else if (k < 0 || k >= N) continue; let j = i + off; if (circular) j = ((j % N) + N) % N; else if (j < 0 || j >= N) continue;
          const g = i < a ? (i - (a - E)) / E : i >= b ? 1 - (i - b) / E : 1; const wgt = 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, g)));
          c0[k] = c0[k] * (1 - wgt) + copy[0][j] * wgt; if (copy[1]) c1[k] = c1[k] * (1 - wgt) + copy[1][j] * wgt; }
        filled++;
      }
      buf.gapsFilled = filled; return filled;
    },
    fallback(name) {
      // file:// pages can't fetch audio for gapless decoding; fall back to a plain looping <audio>
      const T = TRACKS[name]; if (!T || T.procedural) return;
      if (this.want !== name || (this.cur && this.cur.name === name)) return;
      this.stopCurrent(0.25); if (this.el) this.el.pause();
      const el = this.el = new Audio(T.file); el.loop = true; el.volume = Math.min(1, this.vol * this.duck); el.currentTime = T.start;
      el.addEventListener('timeupdate', () => { if (el.currentTime >= T.loopEnd - 0.05) el.currentTime = T.loopStart; });
      el.play().catch(() => { }); this.cur = { name, el, src: { stop() { el.pause(); } }, g: { gain: { setTargetAtTime() { } } } };
    },

    /* ---------- menu theme: 16 bars at 112 BPM, synthesized straight into a circular buffer ----------
       Every note, echo and drum tail is written modulo the loop length, so the end wraps into the start
       exactly the way it would sound if the song kept going: a mathematically seamless loop. */
    renderMenu() {
      const sr = 44100, bpm = 112, beat = 60 / bpm, bar = beat * 4, BARS = 16, N = Math.round(bar * BARS * sr);
      const L = new Float32Array(N), R = new Float32Array(N), lead = new Float32Array(N);
      const hz = m => 440 * Math.pow(2, (m - 69) / 12);
      let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 * 2 - 1;
      const add = (buf, i, v) => { buf[((i % N) + N) % N] += v; };
      const put = (i, v, pan) => { add(L, i, v * (1 - Math.max(0, pan))); add(R, i, v * (1 + Math.min(0, pan))); };
      // voices
      const note = (t, m, dur, type, vol, o = {}) => {
        const f = hz(m), i0 = Math.round(t * sr), n = Math.round((dur + (o.rel || 0.06)) * sr); let ph = 0, lp = 0; const cut = o.lp ? 1 - Math.exp(-2 * Math.PI * o.lp / sr) : 1;
        for (let i = 0; i < n; i++) {
          const tt = i / sr; const vib = o.vib && tt > 0.12 ? 1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * tt) : 1; ph += f * vib / sr; ph -= Math.floor(ph);
          let x = type === 'square' ? (ph < 0.5 ? 1 : -1) : type === 'triangle' ? 4 * Math.abs(ph - 0.5) - 1 : Math.sin(2 * Math.PI * ph);
          lp += (x - lp) * cut; x = lp;
          const att = Math.min(1, tt / (o.att || 0.006)); const sus = o.sus == null ? 0.35 : o.sus; let env = att * (sus + (1 - sus) * Math.exp(-tt / (o.dec || 0.08)));
          if (tt > dur) env *= Math.exp(-(tt - dur) / 0.03);
          const v = x * env * vol; put(i0 + i, v, o.pan || 0); if (o.send) add(lead, i0 + i, v);
        }
      };
      const kick = (t, v = 0.9) => { const i0 = Math.round(t * sr), n = Math.round(0.24 * sr); let ph = 0; for (let i = 0; i < n; i++) { const tt = i / sr; const f = 42 + 88 * Math.exp(-tt / 0.045); ph += f / sr; put(i0 + i, Math.sin(2 * Math.PI * ph) * v * Math.exp(-tt / 0.07), 0); } };
      const noise = (t, dur, vol, hp, lpHz, pan = 0) => { const i0 = Math.round(t * sr), n = Math.round(dur * 1.6 * sr); let a = 0, b = 0, prev = 0; const cl = 1 - Math.exp(-2 * Math.PI * lpHz / sr); for (let i = 0; i < n; i++) { const tt = i / sr; const w = rnd(); a += (w - a) * cl; let x = a; if (hp) { const y = x - prev; prev = x; x = y * 2.2; } put(i0 + i, x * vol * Math.exp(-tt / (dur / 3)), pan); } };
      const C = { C: [60, 64, 67], Am: [57, 60, 64], F: [57, 60, 65], G: [55, 59, 62], Dm: [57, 62, 65], Em: [55, 59, 64], G7: [55, 59, 65] };
      const Rt = { C: 36, Am: 45, F: 41, G: 43, Dm: 38, Em: 40, G7: 43 };
      const prog = ['C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'G7'];
      const _ = null;
      const mel = [
        [76, _, 79, _, 84, _, 79, 76], [81, _, 79, 76, 72, _, _, _], [77, _, 81, _, 84, _, 81, 77], [79, _, 83, 81, 79, _, 74, _],
        [76, 79, 84, 79, 76, 79, 84, 86], [84, _, 81, _, 76, _, _, _], [74, 77, 81, 77, 74, _, 77, _], [79, _, _, 83, 86, _, 83, _],
        [81, _, 77, _, 72, _, 77, 81], [83, _, 79, _, 74, _, 79, 83], [84, _, 83, _, 79, _, 76, _], [81, _, 76, _, 72, _, 76, _],
        [77, 81, 84, 81, 77, 81, 84, 89], [86, _, 83, _, 79, _, 83, _], [84, _, 79, _, 76, _, 72, _], [74, _, 77, _, 79, _, 83, _]
      ];
      const sw = beat * 0.06;
      for (let b = 0; b < BARS; b++) {
        const t0 = b * bar, ch = prog[b];
        for (let s = 0; s < 8; s++) {
          const t = t0 + s * beat / 2 + (s % 2 ? sw : 0);
          const bn = [Rt[ch], _, Rt[ch] + 7, _, Rt[ch] + 12, _, Rt[ch] + 7, Rt[ch] + 5][s]; if (bn != null) note(t, bn, beat * 0.42, 'triangle', 0.34, { sus: 0.5, dec: 0.12, lp: 1400 });
          if (s === 3 || s === 7) for (const n of C[ch]) note(t, n, beat * 0.22, 'square', 0.04, { lp: 1800, pan: -0.25, sus: 0.2, dec: 0.05 });
          const m = mel[b][s]; if (m != null) { let d = 1; while (s + d < 8 && mel[b][s + d] == null && d < 3) d++; note(t, m, beat * 0.5 * d * 0.9, 'square', 0.075, { lp: 2600, vib: d > 1, pan: 0.15, send: true, sus: 0.45, dec: 0.1 }); }
          if (s === 0 || s === 4) kick(t); if (s === 5 && b % 2 === 1) kick(t, 0.6);
          if (s === 2 || s === 6) noise(t, 0.13, 0.3, false, 3200);
          noise(t, s % 2 ? 0.05 : 0.03, s % 2 ? 0.16 : 0.08, true, 12000, 0.3);
          note(t + beat / 4, 96 + (s % 2 ? 0 : 3), 0.012, 'sine', 0.025, { pan: -0.4, rel: 0.01, att: 0.001, sus: 0 });
        }
        // soft sustained chord pad: a bed of sound under the staccato parts
        for (const n of C[ch]) note(t0, n - 12, bar - 0.02, 'triangle', 0.035, { att: 0.12, sus: 1, dec: 1, rel: 0.25, lp: 900 });
        if (b === 7 || b === 15) for (let k = 0; k < 4; k++) noise(t0 + bar - beat + k * beat / 4, 0.09, 0.16 + k * 0.05, false, 3000);
      }
      // circular ping-pong echo on the lead (dotted-eighth), wraps around the loop too
      const D = Math.round(beat * 0.75 * sr); for (let k = 1; k <= 4; k++) { const g = 0.22 * Math.pow(0.32, k - 1); for (let i = 0; i < N; i++) { const v = lead[((i - k * D) % N + N) % N] * g; if (k % 2) L[i] += v; else R[i] += v; } }
      let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
      const kk = 0.8 / (peak || 1); const ac = this.ctx(); const out = ac.createBuffer(2, N, sr); const o0 = out.getChannelData(0), o1 = out.getChannelData(1);
      for (let i = 0; i < N; i++) { o0[i] = L[i] * kk; o1[i] = R[i] * kk; }
      this.fillGaps(out, beat, true);
      return Promise.resolve({ buffer: out, loopStart: 0 });
    }
  };
})();
