/* Ducks vs. Dogs 2 — boot, main loop and input wiring. */
(function (D) {
  'use strict';
  const G = D.G, S = D.Save, A = D.Audio, B = D.Battle, UI = D.UI;
  const $ = id => document.getElementById(id);

  function fatal(msg) {
    const f = $('fatal');
    f.innerHTML = '<div class="modal-card"><h2>Uh-oh, the pond sprang a leak</h2><p>' + msg + '</p></div>';
    f.classList.remove('hidden');
  }

  function boot() {
    S.load();
    if (!window.THREE) { fatal('The 3D library failed to load. Make sure the <code>lib</code> folder sits next to index.html.'); return; }
    try { G.init($('gl')); }
    catch (e) { fatal('This browser could not start 3D graphics (WebGL). Try another browser or enable hardware acceleration.'); return; }
    $('load-msg').textContent = 'Painting the ducks…';
    UI.syncSoundBtn();
    bindInput();
    // let the loading card paint before the portrait pass
    setTimeout(() => {
      try { G.makePortraits(); } catch (e) { console.warn('portraits failed', e); }
      $('loading').classList.add('hidden');
      UI.title();
      requestAnimationFrame(loop);
    }, 60);
  }

  let last = performance.now();
  let fpsAcc = 0, fpsN = 0, lowWarned = false;
  function loop(now) {
    requestAnimationFrame(loop);
    const raw = (now - last) / 1000;
    last = now;
    const dt = Math.min(0.05, Math.max(0, raw));
    if (G.stage && G.stage.update) G.stage.update(dt);
    if (!B.active) { G.fxUpdate(dt); G.beamUpdate(dt); }
    G.render();
    // gentle hint if the device is struggling on High
    if (B.active && !B.paused && S.data.settings.gfx === 'high' && !lowWarned) {
      fpsAcc += raw; fpsN++;
      if (fpsN >= 180) { if (fpsN / fpsAcc < 28) { lowWarned = true; B.toast('Running slowly? Try Graphics: Low in the pause menu.'); } fpsAcc = 0; fpsN = 0; }
    }
  }

  function bindInput() {
    const cv = $('gl');
    cv.addEventListener('pointermove', e => { if (B.active) B.onMove(e.clientX, e.clientY); });
    cv.addEventListener('pointerdown', e => {
      A.init();
      if (!B.active) return;
      if (e.button === 2) { B.select(null); return; }
      B.onClick(e.clientX, e.clientY);
    });
    cv.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (el && !el.disabled) UI.act(el.dataset.act, el);
    });
    document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.set) UI.onSetting(e.target); });
    document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.set === 'muted') UI.onSetting(e.target); });
    document.addEventListener('pointerdown', () => A.init(), { once: false, passive: true });

    $('tool-shovel').addEventListener('pointerdown', e => { e.stopPropagation(); B.select({ type: 'shovel' }); });
    $('tool-qp').addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (B.qp <= 0) { A.play('deny'); B.toast('No Quack Power charges. Defeated dogs sometimes drop golden feathers!'); return; }
      B.select({ type: 'qp' });
      if (B.sel) B.toast('Click one of your ducks to unleash its Quack Power!');
    });
    $('btn-pause').addEventListener('click', () => UI.pause(true));
    $('btn-speed').addEventListener('click', () => { B.setSpeed(B.speed === 2 ? 1 : 2); A.play('click'); });
    $('btn-sound').addEventListener('click', () => { S.data.settings.muted = !S.data.settings.muted; S.save(); A.applyVolumes(); UI.syncSoundBtn(); });
    $('coach-next').addEventListener('click', () => B.tutNext());

    window.addEventListener('keydown', e => {
      if (!B.active || UI.screen !== 'battle') return;
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'p') { e.preventDefault(); UI.pause(!B.paused); return; }
      if (k === 'escape') { if (B.sel) B.select(null); else UI.pause(!B.paused); return; }
      if (B.paused || B.over) return;
      if (k >= '1' && k <= '8') {
        const i = +k - 1;
        if (B.mode === 'belt') { if (B.belt[i]) B.select({ type: 'belt', i }); }
        else if (B.cards[i]) B.select({ type: 'card', i });
      } else if (k === 'r' || k === 's') B.select({ type: 'shovel' });
      else if (k === 'q') { if (B.qp > 0) B.select({ type: 'qp' }); else A.play('deny'); }
      else if (k === 'f') B.setSpeed(B.speed === 2 ? 1 : 2);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && B.active && !B.paused && !B.over) UI.pause(true); });
  }

  window.addEventListener('beforeunload', () => S.save());
  window.addEventListener('pagehide', () => S.save());
  window.addEventListener('error', e => { console.error(e.error || e.message); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.DVD);
