/* Square Off 2 — game controller: loop, runs, workshop flow, saving, unlocks, tutorial, practice */
'use strict';
(function () {
  const P = SO.PAL, M = SO.M, A = SO.ARENA, art = SO.art;
  const G = SO.game = { state: 'boot', world: null, run: null, demos: new Set(), attract: null, scale: 1, last: 0 };
  const D = () => SO.save.data;

  G.init = function () {
    SO.save.load(); art.init();
    G.canvas = document.getElementById('game'); G.ctx = G.canvas.getContext('2d', { alpha: false });
    SO.input.init(G.canvas); SO.ui.init();
    G.applySettings();
    window.addEventListener('resize', G.resize); G.resize();
    window.addEventListener('blur', () => { if (G.state === 'play') G.pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') G.pause(); });
    SO.onKey = e => SO.ui.onKey(e);
    G.makeAttract();
    SO.ui.title();
    requestAnimationFrame(G.loop);
  };
  G.applySettings = function () {
    const s = D().settings; const was = art.light; art.light = !!s.lightweight; SO.sfx.setVol(s.sfx); if (SO.music) SO.music.setVol(s.music != null ? s.music : 0.5);
    if (was !== art.light) G.resize();
  };
  G.resize = function () {
    const W = window.innerWidth, H = window.innerHeight; const k = Math.min(W / SO.W, H / SO.H);
    const cw = Math.floor(SO.W * k), ch = Math.floor(SO.H * k), left = Math.floor((W - cw) / 2), top = Math.floor((H - ch) / 2);
    const c = G.canvas; c.style.width = cw + 'px'; c.style.height = ch + 'px'; c.style.left = left + 'px'; c.style.top = top + 'px';
    const dpr = art.light ? 1 : Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(320, Math.round(cw * dpr)); c.height = Math.max(180, Math.round(ch * dpr));
    G.scale = c.width / SO.W;
    const ui = document.getElementById('ui'); ui.style.transform = `translate(${left}px, ${top}px) scale(${k})`;
  };
  G.makeAttract = function () {
    const B = SO.newBuild(); B.weapons.push({ id: 'blaster', mods: 1, evo: null }, { id: 'blades', mods: 0, evo: null });
    const bb = SO.newBossBuild(); bb.attacks.missiles = {}; bb.attacks.sweep = {}; bb.passives.armor = 1;
    const W = new SO.World({ mode: 'demo', quiet: true, god: true, round: 3, build: B, bb, arena: SO.M.pick(SO.ARENA_ORDER), intro: 0, unfolded: true, noPhases: true, bossHp: 999999, px: 900, py: A.B - 200 });
    W.state = 'fight'; let tx = 900;
    W.aiControl = (Pl) => { if (Math.abs(Pl.x - tx) < 30) tx = M.rand(620, 1150); const ty = A.B - 200 + Math.sin(W.time * 0.9) * 120; return { L: Pl.x > tx + 12, R: Pl.x < tx - 12, T: Pl.y > ty }; };
    W.aiDash = Pl => W.eShotsInCircle(Pl.x, Pl.y, 34).length > 0;
    W.hideCrosshair = true; W.attract = true;
    G.attract = W;
  };
  G.runMusic = run => run.mode === 'endless' || run.continued || run.round > 10 ? 'endless' : 'main';
  G.toMenu = function () { SO.music.play('menu'); SO.music.setDuck(1); G.state = 'menu'; G.world = null; if (!G.attract || G.attract.time > 90) G.makeAttract(); };

  /* ---------------- loop ---------------- */
  G.loop = function (ts) {
    requestAnimationFrame(G.loop);
    const now = ts / 1000; let dt = Math.min(0.05, Math.max(0, now - (G.last || now))); G.last = now;
    SO.input.updateMouse();
    const ctx = G.ctx;
    try {
      if (G.state === 'play' && G.world) {
        const steps = Math.max(1, Math.ceil(dt / (1 / 90)));
        for (let i = 0; i < steps; i++) G.world.update(dt / steps);
        G.afterUpdate();
      } else if (G.state === 'menu' && G.attract) {
        if (G.attract.boss) G.attract.mouseOverride = { x: G.attract.boss.x, y: G.attract.boss.y };
        G.attract.update(dt);
      }
      ctx.setTransform(G.scale, 0, 0, G.scale, 0, 0);
      const drawW = (G.state === 'play' || G.state === 'pause') ? G.world : (G.state === 'menu' ? G.attract : null);
      if (drawW) { drawW.renderScale = Math.min(G.scale, 1.5); drawW.hideCrosshair = drawW.attract || G.state !== 'play'; drawW.draw(ctx); if (G.state === 'menu') { ctx.fillStyle = 'rgba(16,26,43,0.35)'; ctx.fillRect(0, 0, SO.W, SO.H); } }
      else { ctx.fillStyle = P.blueDeep; ctx.fillRect(0, 0, SO.W, SO.H); }
    } catch (e) { console.error(e); }
    for (const d of G.demos) { try { d.tick(dt); } catch (e) { console.error(e); G.demos.delete(d); } }
  };
  G.afterUpdate = function () {
    const W = G.world; if (!W) return;
    while (W.events.length) {
      const ev = W.events.shift();
      if (ev.type === 'module') {
        D().records.modulesBroken++;
        SO.ui.toast(`<b>${ev.name.toUpperCase()} BROKEN!</b> ${SO.BOSS_ATTACKS[ev.attack].name} is offline for ${Math.round(ev.off)}s. The boss is staggered — hit its core!`, 'good', 4);
      } else if (ev.type === 'phase') SO.ui.toast(`<b>GEAR SHIFT!</b> The boss enters phase ${ev.idx + 1} and can overlap more patterns. Its core is open — punish it!`, 'boss', 4);
    }
    if (G.tutorial) G.tutorialTick();
    if (W.result) { const r = W.result; W.result = null; if (W.mode === 'tutorial') G.endTutorial(r === 'win'); else if (W.mode === 'practice') G.practiceEnded(r); else G.roundEnded(r); }
  };
  G.pause = function () { if (G.state !== 'play') return; G.state = 'pause'; SO.music.setDuck(0.4); SO.input.clearBuffer(); SO.ui.pause(); };
  G.resume = function () {
    if (!G.world) { SO.ui.title(); return; }
    G.state = 'play'; SO.music.setDuck(1); SO.input.clearBuffer(); SO.ui.hudOnly(); if (G.tutorial) G.tutorialShow();
  };

  /* ---------------- builds ---------------- */
  G.buildFor = function (run) {
    const B = SO.newBuild(); const K = SO.KITS[run.kit] || SO.KITS.tinkerer;
    const weapons = K.random ? [run.kitRandom.weapon] : K.weapons;
    for (const id of weapons) B.weapons.push({ id, mods: 0, evo: null });
    B.utility = K.random ? run.kitRandom.utility : K.utility;
    for (const id of (K.random ? run.kitRandom.ups : K.ups)) SO.applyPlayerUp(B, id);
    if (K.hpMod) B.s.maxHp += K.hpMod;
    B.char = run.kit; Object.assign(B.f, K.flags || {}); if (K.mods) K.mods(B, run);
    if (B.f.glitch) { const pool = SO.GLITCH_FORMS.filter(id => !run.pUps.some(x => x.id === id)); if (pool.length) { const id = pool[Math.floor(SO.RNG((run.seed ^ (run.round * 7919)) >>> 0)() * pool.length)]; B.glitchForm = id; SO.applyPlayerUp(B, id); } }
    for (const x of run.pUps) SO.applyPlayerUp(B, x.id);
    if (run.challenges.includes('glass')) B.s.maxHp = Math.max(25, Math.round(B.s.maxHp * 0.5));
    return B;
  };
  G.repairFrac = run => Math.min(run.challenges.includes('halfheal') ? 0.5 : 1, (((SO.KITS[run.kit] || {}).flags || {}).lowRepair) ? 0.25 : 1);
  G.bossFor = function (run, excludeCurrent) {
    const bb = SO.newBossBuild();
    if (run.challenges.includes('armored')) SO.applyBossUp(bb, 'bp_armor');
    if (run.kitRandom && run.kitRandom.bossUp) SO.applyBossUp(bb, run.kitRandom.bossUp);
    for (const x of run.bUps) { if (excludeCurrent && x.round === run.round) continue; SO.applyBossUp(bb, x.id); }
    return bb;
  };
  G.saveRun = function () { if (!G.run) return; D().run = G.run; SO.save.write(); };

  /* ---------------- runs ---------------- */
  G.newRun = function (mode, kit, challenges) {
    const d = D(); const seed = (Math.random() * 2147483647) | 0;
    const K = SO.KITS[kit];
    const run = { v: 1, mode, kit, challenges: challenges.slice(), seed, round: 1, rerolls: challenges.includes('noreroll') ? 0 : 3 + (K.rerolls || 0), pUps: [], bUps: [], phase: 'ready', hp: null, ws: null, stats: { dmgBySource: {}, dmgTaken: {}, modulesBroken: 0, time: 0, rounds: [] }, kitRandom: null, continued: false, rrGain: {} };
    if (K.random) {
      const rng = SO.RNG(seed + 77);
      const pool = SO.WEAPON_ORDER.filter(id => SO.weaponUnlocked(id, { unlockedWeapons: d.unlocks.weapons }));
      const weapon = rng.pick(pool);
      const B = SO.newBuild(); B.weapons.push({ id: weapon, mods: 0, evo: null });
      const gen = SO.PLAYER_UPS.filter(u => !u.weapon && !u.fallback && u.cat !== 'transform' && u.cat !== 'utility' && u.req(B, {}) === true);
      const ups = []; while (ups.length < 2) { const u = rng.pick(gen); if (!ups.includes(u.id)) ups.push(u.id); }
      const utility = rng.pick(Object.keys(SO.UTILS));
      const bossUp = SO.offerBoss(SO.newBossBuild(), rng, 3, { round: 1 })[0];
      run.kitRandom = { weapon, ups, utility, bossUp };
    }
    d.records.runs++; d.records.charsUsed = d.records.charsUsed || []; if (!d.records.charsUsed.includes(kit)) d.records.charsUsed.push(kit);
    G.run = run; G.lastCfg = { mode, kit, challenges: challenges.slice() };
    G.checkUnlocks();
    G.startRound();
  };
  G.resumeRun = function () {
    const d = D(); if (!d.run) return; G.run = d.run; G.lastCfg = { mode: G.run.mode, kit: G.run.kit, challenges: G.run.challenges.slice() };
    if (G.run.phase === 'workshop' && G.run.ws) { G.state = 'workshop'; G.world = null; SO.music.play(G.runMusic(G.run)); SO.ui.workshop(); }
    else G.startRound();
  };
  G.startRound = function () {
    const run = G.run, d = D(); const B = G.buildFor(run), bb = G.bossFor(run);
    const ar = SO.arenaForRound(run.round, run.mode); const finale = run.mode === 'standard' && run.round === 10 && !run.continued;
    const hp = G.repairFrac(run) < 1 && run.hp != null ? Math.min(B.s.maxHp, run.hp) : null;
    const KF = (SO.KITS[run.kit] || {}).flags || {};
    G.world = new SO.World({ mode: run.mode, round: run.round, build: B, bb, arena: ar.id, hazards: ar.hazards, challenges: run.challenges, finale, playerHp: hp, bossHpMul: KF.hex ? 1.3 : 1, bossCdMul: KF.hex ? 0.85 : 1 });
    if (B.glitchForm) setTimeout(() => SO.ui.toast('<b>GLITCH:</b> this round you are running <b>' + SO.PLAYER_UP[B.glitchForm].name + '</b>.', 'boss', 6), 700);
    if (KF.tally) { const hasMod = G.world.boss.modules.length > 0; const keys = Object.keys(SO.CONTRACTS).filter(k => !SO.CONTRACTS[k].needsModule || hasMod); const id = SO.RNG(run.seed ^ SO.hash('c' + run.round)).pick(keys); run.contract = id; G.world.contract = { id, round: run.round }; setTimeout(() => SO.ui.toast('<b>CONTRACT:</b> ' + SO.CONTRACTS[id].text(run.round) + '. Pays a bonus pick + 1 reroll.', 'unlock', 7), 1200); }
    run.phase = 'ready'; run.ws = null; G.saveRun(); SO.music.play(G.runMusic(run)); SO.music.setDuck(1);
    const rec = d.records; if (!rec.chassisSeen.includes(bb.chassis)) rec.chassisSeen.push(bb.chassis);
    for (const w of B.weapons) if (!rec.weaponsUsed.includes(w.id)) rec.weaponsUsed.push(w.id);
    SO.save.write();
    G.state = 'play'; SO.input.clearBuffer(); SO.ui.hudOnly();
    // contextual first-time tips
    const seen = d.unlocks.seen; const tip = (key, html, kind = 'good') => { if (!seen.includes(key)) { seen.push(key); SO.save.write(); setTimeout(() => SO.ui.toast(html, kind, 7), 900); return true; } return false; };
    const A2 = SO.ARENAS[ar.id];
    if (run.round === 1) tip('dash', '<b>Dash early!</b> SHIFT + a direction makes you briefly invulnerable. Your hitbox is the white core.');
    if (G.world.boss.modules.length) tip('modules', '<b>Breakable module 🔧</b> Some boss weapons have their own HP bar. Break one to shut that attack off for 12s.');
    if (A2.mechanicDesc && (run.round - 1) % 2 === 0) SO.ui.toast('<b>' + A2.name + '</b> — ' + A2.mechanicDesc, '', 6);
    if (ar.hazards && A2.hazardName) tip('hz_' + ar.id, '<b>New hazard: ' + A2.hazardName + '</b> — ' + A2.hazardDesc + ' Hazards never fire during the boss\'s big zone attacks.', 'boss');
    if (finale) SO.ui.toast('<b>THE FINAL CURTAIN</b> — everything you gave it, all at once. Good luck.', 'boss', 6);
  };
  G.roundEnded = function (result) {
    const W = G.world, run = G.run, d = D(); const st = run.stats;
    for (const k in W.stats.dmgBySource) st.dmgBySource[k] = (st.dmgBySource[k] || 0) + W.stats.dmgBySource[k];
    for (const k in W.stats.dmgTaken) st.dmgTaken[k] = (st.dmgTaken[k] || 0) + W.stats.dmgTaken[k];
    st.modulesBroken += W.stats.modulesBroken; st.time += W.stats.time; st.rounds.push({ round: run.round, time: W.stats.time, won: result === 'win' });
    const feats = d.records.feats = d.records.feats || []; const feat = k => { if (!feats.includes(k)) feats.push(k); };
    st.erased = (st.erased || 0) + (W.stats.erased || 0); if (st.erased >= 300) feat('sponge');
    if (result !== 'win') { if (run.round === 1) feat('knockout'); G.endRun(false, W.stats.killedBy || W.stats.lastHitBy); return; }
    if (W.stats.hitsTaken === 0) feat('flawless');
    if (W.stats.dashes === 0) feat('nodash');
    if (W.stats.time < 20) feat('speedrun');
    if (W.player.hp > 0 && W.player.hp <= 10) feat('clutch');
    if (W.build.weapons.length >= 6) feat('sixguns');
    d.records.bossesBeaten++; d.records.totalDamage += Object.values(W.stats.dmgBySource).reduce((a, b) => a + b, 0);
    if (run.mode === 'standard') d.records.bestStandardRound = Math.max(d.records.bestStandardRound, run.round);
    else { d.records.endlessBest = Math.max(d.records.endlessBest, run.round); d.records.endlessBestKit[run.kit] = Math.max(d.records.endlessBestKit[run.kit] || 0, run.round); }
    if (run.mode === 'standard' && run.continued) d.records.endlessBest = Math.max(d.records.endlessBest, run.round);
    if (W.contract) { const C = SO.CONTRACTS[W.contract.id]; run.bountyPaid = !!C.check(W, run.round); SO.ui.toast(run.bountyPaid ? '<b>CONTRACT PAID!</b> Bonus pick + 1 reroll.' : '<b>Contract failed.</b> No bounty this round.', run.bountyPaid ? 'good' : 'boss', 5); }
    if (G.repairFrac(run) < 1) { const mx = W.player.maxHp; run.hp = Math.min(mx, W.player.hp + mx * G.repairFrac(run)); }
    const un = G.checkUnlocks(); un.forEach(t => SO.ui.toast('🔓 <b>Unlocked</b> ' + t, 'unlock', 6));
    run.unlocksEarned = (run.unlocksEarned || []).concat(un);
    if (run.mode === 'standard' && run.round === 10 && !run.continued) {
      d.records.standardWins++; if (!d.records.fastestWin || st.time < d.records.fastestWin) d.records.fastestWin = st.time;
      if (run.challenges.length) d.records.challengeWins++;
      const un2 = G.checkUnlocks(); run.unlocksEarned = run.unlocksEarned.concat(un2);
      SO.save.write(); G.state = 'ending'; G.world = null;
      SO.ui.ending({ bUps: run.bUps.length, identity: SO.buildIdentity(G.buildFor(run)), time: st.time, unlocks: run.unlocksEarned });
      run.phase = 'workshop'; G.saveRun();
      return;
    }
    G.enterWorkshop();
  };
  G.continueAfterFinale = function () { G.run.continued = true; G.enterWorkshop(); };
  G.genOffers = function (kind) {
    const run = G.run, ws = run.ws; const B = G.buildFor(run), bb = G.bossFor(run);
    const rng = SO.RNG(run.seed ^ SO.hash(kind + ':' + run.round + ':' + (ws.rolls || 0) + ':' + ((ws.bossPicks || []).length)));
    if (kind === 'player') return SO.offerPlayer(B, rng, B.s.cards, { round: run.round, unlockedWeapons: D().unlocks.weapons, exclude: ws.offersP || [] });
    if (kind === 'boss') return SO.offerBoss(bb, rng, 3, { round: run.round, B });
    return SO.chassisOptions(bb, rng);
  };
  G.enterWorkshop = function () {
    const run = G.run;
    if (!run.challenges.includes('noreroll') && run.round % 3 === 0 && !run.rrGain[run.round]) { run.rrGain[run.round] = 1; run.rerolls++; setTimeout(() => SO.ui.toast('<b>+1 reroll</b> for clearing Round ' + run.round + '.', 'good'), 400); }
    const KF = (SO.KITS[run.kit] || {}).flags || {};
    if ((KF.hex || KF.bank) && !run.challenges.includes('noreroll')) { run.rerolls++; }
    const bonus = (KF.hex && run.round % 2 === 0 ? 1 : 0) + (run.bountyPaid ? 1 : 0); if (run.bountyPaid) run.rerolls++; run.bountyPaid = false;
    run.phase = 'workshop'; run.ws = { step: 'player', rolls: 0, bossPicks: [], picksP: [], bonus, bonusTotal: bonus };
    run.ws.offersP = G.genOffers('player');
    G.saveRun(); G.state = 'workshop'; G.world = null; SO.music.play(G.runMusic(run)); SO.music.setDuck(1); SO.ui.workshop();
  };
  G.workshopReroll = function () {
    const run = G.run, ws = run.ws; if (G.rerollsAvail(run) <= 0) return;
    if (G.freeRerollReady(run)) ws.freeUsed = true; else run.rerolls--;
    ws.rolls = (ws.rolls || 0) + 1;
    if (ws.step === 'player') ws.offersP = G.genOffers('player'); else if (ws.step === 'boss') ws.offersB = G.genOffers('boss');
    G.saveRun(); SO.sfx.play('select'); SO.ui.workshop();
  };
  G.workshopConfirm = function (id) {
    const run = G.run, ws = run.ws;
    if (ws.step === 'player') {
      run.pUps.push({ id, round: run.round }); ws.pickP = id; (ws.picksP = ws.picksP || []).push(id); if (id === 'R_hoard') run.rerolls += 2;
      if (ws.bonus > 0) { ws.bonus--; ws.rolls = (ws.rolls || 0) + 1; ws.offersP = G.genOffers('player'); G.saveRun(); SO.ui.workshop(); return; }
      ws.step = 'boss'; ws.rolls = 0; ws.offersB = G.genOffers('boss');
    } else if (ws.step === 'boss') {
      run.bUps.push({ id, round: run.round }); ws.bossPicks.push(id);
      if (ws.bossPicks.length < G.bossPicksNeeded(run)) ws.offersB = G.genOffers('boss');
      else if (G.chassisEligibleNow(run)) { ws.step = 'chassis'; ws.offersC = G.genOffers('chassis'); }
      else ws.step = 'review';
    } else if (ws.step === 'chassis') { run.bUps.push({ id, round: run.round }); ws.pickC = id; ws.step = 'review'; }
    G.saveRun(); SO.ui.workshop();
  };
  G.chassisEligibleNow = function (run) { if (run.round !== 3 && run.round !== 7) return false; const bb = G.bossFor(run); if (run.round === 3 && bb.chassis !== 'proto') return false; return SO.chassisOptions(bb, SO.RNG(1)).length > 0; };
  G.bossPicksNeeded = run => (run.challenges.includes('double') ? 2 : 1) + (((SO.KITS[run.kit] || {}).flags || {}).tally && run.round % 3 === 0 ? 1 : 0);
  G.freeRerollReady = run => !!(((SO.KITS[run.kit] || {}).flags || {}).freeReroll && run.ws && !run.ws.freeUsed && (run.ws.step === 'player' || run.ws.step === 'boss'));
  G.rerollsAvail = run => run.rerolls + (G.freeRerollReady(run) ? 1 : 0);
  G.chassisEligible = run => G.chassisEligibleNow(run) || !!(run.ws && run.ws.pickC);
  G.startNextRound = function () { if (!G.run || !G.run.ws || G.run.ws.step !== 'review') return; G.run.round++; G.run.ws = null; G.startRound(); };
  G.endRun = function (won, killedBy) {
    const run = G.run, d = D(); if (!run) { SO.ui.title(); return; }
    const B = G.buildFor(run), bb = G.bossFor(run);
    const cleared = run.stats.rounds.filter(r => r.won).length;
    const un = G.checkUnlocks(); const unlocks = (run.unlocksEarned || []).concat(un);
    let newRecord = null;
    if (run.mode === 'endless' && cleared && cleared >= d.records.endlessBest) newRecord = 'Endless record: Round ' + cleared + ' cleared!';
    const S = { mode: run.mode, kit: run.kit, challenges: run.challenges, won, killedBy, roundsCleared: cleared, lastRound: run.round, time: run.stats.time, dmgBySource: run.stats.dmgBySource, dmgTaken: run.stats.dmgTaken, modulesBroken: run.stats.modulesBroken,
      pUps: run.pUps, bUps: run.bUps, identity: SO.buildIdentity(B),
      loadout: B.weapons.map(w => SO.WEAPONS[w.id].name + (w.evo ? ' (' + SO.WEAPONS[w.id].evos[w.evo].name + ')' : w.mods ? ' +' + w.mods : '')).join(' · ') + (B.utility ? ' · [E] ' + SO.UTILS[B.utility].name : ''), chassis: SO.CHASSIS[bb.chassis].name + (bb.tier2 ? ' → ' + SO.CHASSIS[bb.tier2].name : '') + ' · ' + SO.bossAttackList(bb).length + ' attacks', unlocks, newRecord,
      bossNote: won ? 'You picked every one of these upgrades — and still won.' : 'Every part of it was your choice. Maybe next time, skip the ' + (killedBy && SO.BOSS_ATTACKS[killedBy] ? SO.BOSS_ATTACKS[killedBy].name : 'mean one') + '?' };
    d.run = null; SO.save.write(); G.run = null; G.world = null; G.state = 'summary'; SO.music.play('menu'); SO.music.setDuck(1);
    SO.ui.summary(S);
  };
  G.quickRestart = function () { const c = G.lastCfg; if (!c) { SO.ui.title(); return; } const d = D(); const kit = d.unlocks.kits.includes(c.kit) ? c.kit : 'tinkerer'; G.newRun(c.mode, kit, c.challenges.filter(x => d.unlocks.challenges.includes(x))); };

  G.checkUnlocks = function () {
    const d = D(), u = d.unlocks, r = d.records; const out = [];
    const kit = k => { if (!u.kits.includes(k)) { u.kits.push(k); out.push('character: ' + SO.KITS[k].name); } };
    const wep = ids => ids.forEach(id => { if (!u.weapons.includes(id)) { u.weapons.push(id); out.push('weapon: ' + SO.WEAPONS[id].name); } });
    const ch = ids => ids.forEach(id => { if (!u.challenges.includes(id)) { u.challenges.push(id); out.push('challenge: ' + SO.CHALLENGES[id].name); } });
    const cos = id => { if (!u.cosmetics.includes(id)) { u.cosmetics.push(id); out.push('paint job: ' + SO.PAINTS[id].label); } };
    const best = Math.max(r.bestStandardRound, r.endlessBest);
    if (best >= 2) kit('medic');
    if (best >= 3) { kit('droner'); wep(['saw', 'echo']); }
    if (best >= 4) kit('ballast');
    if (best >= 5) wep(['prism', 'harpoon']);
    if (best >= 6) kit('pyro');
    if (best >= 7) wep(['cryo', 'whip']);
    if (best >= 8) kit('spark');
    if (r.modulesBroken >= 10) { kit('demo'); wep(['sticky', 'ink']); }
    if (r.runs >= 3) { kit('bulwark'); wep(['aegis', 'minelayer']); }
    if (r.bossesBeaten >= 15) kit('tally');
    if ((r.charsUsed || []).length >= 5) kit('gambler');
    if (best >= 5) kit('forge');
    if (best >= 7) kit('rime');
    if (best >= 9) kit('glimmer');
    if (r.standardWins >= 1) kit('streak');
    if (r.runs >= 5) kit('wisp');
    if (r.runs >= 10) kit('halo');
    if (r.bossesBeaten >= 5) kit('bramble');
    if (r.bossesBeaten >= 30) kit('fang');
    if (r.modulesBroken >= 25) kit('volt');
    if (r.endlessBest >= 8) kit('mote');
    if (r.challengeWins >= 1) kit('glint');
    if ((r.charsUsed || []).length >= 10) kit('duo');
    const F = r.feats || [];
    if (F.includes('flawless')) kit('mirage');
    if (F.includes('nodash')) kit('anchor');
    if (F.includes('speedrun')) kit('blitz');
    if (F.includes('clutch')) kit('ember');
    if (F.includes('sixguns')) kit('juggler');
    if (F.includes('sponge')) kit('sponge');
    if (F.includes('knockout')) kit('underdog');
    if (F.includes('glitch')) kit('glitch');
    if (r.standardWins >= 1) { wep(['plasma', 'jet']); ch(['double', 'heavy', 'halfheal', 'armored']); cos('gold'); }
    if (r.endlessBest >= 11) cos('blueprint');
    if (r.chassisSeen.filter(c => c !== 'proto').length >= 3) cos('news');
    if (r.challengeWins >= 1) cos('coral');
    if (r.bossesBeaten >= 25) cos('mint');
    SO.save.write(); return out;
  };

  /* ---------------- practice ---------------- */
  G.startPractice = function (cfg) {
    const B = SO.newBuild(); B.maxWeapons = 6; B.utility = 'eraser';
    for (const id in cfg.weapons) { const v = cfg.weapons[id]; if (!v || v === 'off') continue; const w = { id, mods: v === 'base' ? 0 : 1, evo: (v === 'a' || v === 'b') ? v : null }; B.weapons.push(w); B.counts['w_' + id] = 1; }
    const bb = SO.newBossBuild(); bb.attacks = {};
    for (const id in cfg.attacks) { const v = cfg.attacks[id]; if (!v || v === 'off') continue; const a = SO.BOSS_ATTACKS[id]; const m = {}; if (v === 'all') a.mods.forEach(x => m[x.id] = x.max); else if (v[0] === 'm') { const x = a.mods[+v.slice(1)]; if (x) m[x.id] = 1; } bb.attacks[id] = m; }
    bb.chassis = cfg.chassis || 'proto'; bb.tier2 = cfg.tier2 || null; if (bb.tier2 && SO.CHASSIS[bb.tier2].grant && !bb.attacks[SO.CHASSIS[bb.tier2].grant]) bb.attacks[SO.CHASSIS[bb.tier2].grant] = {};
    G.practiceCfg = cfg; SO.music.play('training'); SO.music.setDuck(1);
    G.world = new SO.World({ mode: 'practice', round: cfg.round || 3, build: B, bb, arena: cfg.arena, hazards: !!cfg.hazards, challenges: [], god: !!cfg.god, infinite: !!cfg.infinite });
    G.state = 'play'; SO.input.clearBuffer(); SO.ui.hudOnly();
    SO.ui.toast('<b>Practice</b> — ESC for the menu. Nothing here affects your records.', '', 4);
  };
  G.practiceEnded = function (r) { SO.ui.toast(r === 'win' ? '<b>Boss down!</b> Back to the setup.' : '<b>K.O.</b> — back to the setup.', r === 'win' ? 'good' : 'boss'); SO.ui.practice(); };

  /* ---------------- tutorial ---------------- */
  G.startTutorial = function () {
    const B = SO.newBuild(); B.weapons.push({ id: 'blaster', mods: 0, evo: null }); B.utility = 'eraser';
    const bb = SO.newBossBuild(); bb.attacks = {};
    G.world = new SO.World({ mode: 'tutorial', round: 1, build: B, bb, arena: 'print', hazards: false, challenges: [], god: true, bossHp: 2600, noPhases: true });
    const W = G.world; W.forceWeaponsOff = true; SO.music.play('training'); SO.music.setDuck(1);
    let moved = 0, lastX = W.player.x, thrustT = 0, dmg0 = 0, dashes = 0, attacks = 0, utilUsed = false, stepT = 0;
    W.onDash = () => dashes++; W.onUtil = () => { utilUsed = true; };
    const setAttacks = ids => { W.boss.attackIds = ids; W.boss.director.cds = {}; W.boss.director.gcd = 0.8; };
    const origStart = W.boss.director.start.bind(W.boss.director); W.boss.director.start = id => { attacks++; return origStart(id); };
    const steps = [
      { title: 'MOVE', text: 'Use A / D (or ← / →) to move left and right.', enter() { }, done: () => moved > 500, progress: () => Math.min(100, Math.round(moved / 5)) + '%' },
      { title: 'THRUST', text: 'Hold SPACE to fire your jetpack upward. Let go to fall. (S drops faster and through platforms.)', done: () => thrustT > 1.2, progress: () => Math.min(100, Math.round(thrustT / 1.2 * 100)) + '%' },
      { title: 'AIM & FIRE', text: 'Aim with the mouse. Your weapons fire automatically. Hit the training boss!', enter() { W.forceWeaponsOff = false; dmg0 = W.boss.maxHp - W.boss.hp; }, done: () => (W.boss.maxHp - W.boss.hp) - dmg0 > 160, progress: () => Math.min(100, Math.round(((W.boss.maxHp - W.boss.hp) - dmg0) / 1.6)) + '%' },
      { title: 'DASH', text: 'Press SHIFT (with a direction key) to dash. You are invulnerable while dashing. The ring under you shows the cooldown.', enter() { dashes = 0; }, done: () => dashes >= 3, progress: () => dashes + '/3' },
      { title: 'WARNINGS', text: 'Yellow-black stripes and dashed yellow lines are WARNINGS. Move off the lines before they fire!', enter() { attacks = 0; setAttacks(['grid', 'sniper']); }, done: () => attacks >= 3 && W.boss.director.active.length === 0, progress: () => Math.min(attacks, 3) + '/3 attacks' },
      { title: 'YOUR HITBOX', text: 'Only the small white core in your body can be hit. Weave through the ring gaps — or dash through them.', enter() { attacks = 0; setAttacks(['ring']); }, done: () => attacks >= 3 && W.boss.director.active.length === 0, progress: () => Math.min(attacks, 3) + '/3 bursts' },
      { title: 'UTILITY', text: 'Press E to use your utility. Eraser Pulse wipes nearby enemy bullets.', enter() { utilUsed = false; setAttacks(['spread', 'ring']); }, done: () => utilUsed, progress: () => utilUsed ? 'done' : 'press E' },
      { title: 'FINISH IT', text: 'Exposed cores ("HIT!") take +50% damage. Finish the training boss!', enter() { setAttacks(['spread']); W.boss.hp = Math.min(W.boss.hp, 420); W.boss.exposed = 4; }, done: () => false, progress: () => Math.ceil(W.boss.hp) + ' HP left' }
    ];
    G.tutorial = { steps, i: 0, W, tick: dt => { const P2 = W.player; moved += Math.abs(P2.x - lastX); lastX = P2.x; if (P2.thrusting) thrustT += dt; } };
    setAttacks([]);
    G.state = 'play'; SO.input.clearBuffer(); SO.ui.hudOnly(); G.tutorialShow();
  };
  G.tutorialShow = function () { const T = G.tutorial; if (!T) return; const s = T.steps[T.i]; SO.ui.tutorialBox(s, T.i, T.steps.length); };
  G.tutorialTick = function () {
    const T = G.tutorial; if (!T || T.W !== G.world) return;
    T.tick(1 / 60); T.refresh = (T.refresh || 0) + 1; if (T.refresh % 10 === 0) G.tutorialShow();
    const s = T.steps[T.i];
    if (!s.entered) { s.entered = true; if (s.enter) s.enter(); }
    if (s.done()) { T.i++; SO.sfx.play('confirm'); if (T.i >= T.steps.length) return; T.steps[T.i].entered = false; G.tutorialShow(); }
  };
  G.endTutorial = function (won) {
    const d = D(); G.tutorial = null; G.world = null;
    if (won) { d.unlocks.tutorialDone = true; SO.save.write(); }
    const box = document.getElementById('tutbox'); if (box) box.remove();
    if (won) {
      const h = SO.ui.h;
      G.state = 'menu'; G.toMenu();
      SO.ui.set(h('div', { class: 'screen dim' }, h('div', { class: 'panel modal', style: 'width:640px' }, h('h2', null, 'TRAINING COMPLETE'),
        h('p', { style: 'font-size:16px;font-weight:700' }, 'Now the real twist: after every victory you choose an upgrade for YOURSELF — and one for THE BOSS.'),
        h('p', null, 'Both sides keep everything for the whole run. You heal fully between rounds. Card demos show exactly what each boss upgrade does, so choose the threats your build can handle.'),
        h('p', { class: 'muted' }, 'You are building the enemy you will have to survive.'),
        h('div', { style: 'display:flex;gap:12px;margin-top:12px' }, SO.ui.btn('Start a Standard Run', () => SO.ui.runSetup('standard'), 'primary', 'Enter'), SO.ui.btn('Title', SO.ui.title, 'small')))), e => { if (e.code === 'Enter') SO.ui.runSetup('standard'); else if (e.code === 'Escape') SO.ui.title(); });
    } else SO.ui.title();
  };

  window.addEventListener('DOMContentLoaded', G.init);
})();
