/* Square Off 2 — DOM UI: title, setup, workshop, cards, boss demos, pause, settings, guide, unlocks, summary, practice, tutorial */
'use strict';
(function () {
  const P = SO.PAL, M = SO.M, A = SO.ARENA, art = SO.art;
  const ui = SO.ui = { root: null, keyHandler: null, lockUntil: 0, sel: -1 };
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (k === 'style') el.style.cssText = v; else el.setAttribute(k, v === true ? '' : v); }
    for (const c of kids.flat(3)) { if (c == null || c === false) continue; el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); }
    return el;
  }
  ui.h = h;
  const app = (el, ...kids) => { for (const k of kids.flat(3)) if (k != null && k !== false) el.append(k); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const G = () => SO.game;
  const D = () => SO.save.data;
  function btn(label, fn, cls = '', key = null, attrs = {}) { return h('button', Object.assign({ class: 'btn ' + cls, onclick: e => { if (performance.now() < ui.lockUntil) return; SO.sfx.play('ui'); fn(e); } }, attrs), label, key ? h('span', { class: 'key' }, key) : null); }
  ui.btn = btn;
  ui.init = function () { ui.root = document.getElementById('ui'); ui.toastWrap = h('div', { class: 'toast-wrap' }); ui.root.appendChild(ui.toastWrap); };
  ui.set = function (el, keyHandler) { ui.root.innerHTML = ''; if (el) ui.root.appendChild(el); ui.root.appendChild(ui.toastWrap); ui.keyHandler = keyHandler || null; ui.sel = -1; };
  ui.onKey = function (e) { if (ui.keyHandler) ui.keyHandler(e); };
  ui.toast = function (html, kind = '', dur = 4.5) {
    const t = h('div', { class: 'toast-item ' + kind, html }); ui.toastWrap.appendChild(t);
    while (ui.toastWrap.children.length > 4) ui.toastWrap.removeChild(ui.toastWrap.firstChild);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 450); }, dur * 1000);
  };
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'SELECT'); };

  /* ---------- source names ---------- */
  SO.sourceName = function (src) {
    if (SO.WEAPONS[src]) return SO.WEAPONS[src].name;
    if (SO.BOSS_ATTACKS[src]) return SO.BOSS_ATTACKS[src].name;
    return ({ shoulder: 'Shoulder Charge', slam: 'Ground Pound', reflect: 'Mirror Dash', fusehead: 'Fuse Head', blocked: 'Ablative Plating', burn: 'Burn', bleed: 'Bleed', ram: 'Ram Plating', comet: 'Comet Form', dashvolley: 'Dash Volley', shrapnel: 'Shrapnel', critspark: 'Crit Sparks', blink: 'Blink Bomb', hazard: 'Arena hazard', reactive: 'Reactive Plating', vengeful: 'Vengeful Core', thorns: 'Thorns', bossquake: 'Landing Shockwave', bossphase: 'Echo Burst', bosscomet: 'Comet Trail', bosswreck: 'Wrecking Ball', bosschime: 'Chime Bell', bossshrapnel: 'Bounce Shrapnel', laser: 'Laser', boss: 'Boss', misc: 'Misc', lava: 'The Floor Is Lava', restless: 'Standing still', drain: 'Leaky Hull', featherlight: 'Too many hits (Featherlight)', clock: 'Out of time' })[src] || src;
  };

  /* ================= animated boss demos ================= */
  class Demo {
    constructor(canvas, cfg) {
      this.canvas = canvas; this.g = canvas.getContext('2d'); this.cfg = cfg; this.phase = 0; this.started = performance.now();
      this.reset(); G().demos.add(this);
    }
    makeWorld(bb) {
      const cfg = this.cfg; const B = SO.newBuild(); if (cfg.shoot) B.weapons.push({ id: 'blaster', mods: 1, evo: null });
      const W = new SO.World({ mode: 'demo', demo: true, quiet: true, god: true, round: cfg.round || 4, build: B, bb, arena: 'print', intro: 0, unfolded: true, noPhases: true, bossHp: 999999, mechanics: false, px: 330, py: A.B - 140 });
      W.state = 'fight'; let tx = 330;
      W.aiControl = (Pl) => { if (Math.abs(Pl.x - tx) < 30) tx = M.rand(180, 1100); const ty = A.B - 170 + Math.sin(W.time * 1.1) * 110; return { L: Pl.x > tx + 12, R: Pl.x < tx - 12, T: Pl.y > ty }; };
      W.aiDash = Pl => W.eShotsInCircle(Pl.x, Pl.y, 36).length > 0 && Math.random() < 0.5;
      if (cfg.attack) W.boss.director.forced = cfg.attack;
      W.boss.director.gcd = 0.35;
      return W;
    }
    reset() {
      const c = this.cfg; const useBefore = c.before && this.phase % 2 === 0;
      this.W = this.makeWorld(SO.clone(useBefore ? c.before : c.after)); this.cycle = 0; this.label = c.before ? (useBefore ? (c.labels ? c.labels[0] : 'NOW') : (c.labels ? c.labels[1] : 'UPGRADED')) : (c.label || '');
    }
    tick(dt) {
      if (!this.canvas.isConnected) { G().demos.delete(this); return; }
      dt = Math.min(dt, 0.05); const W = this.W;
      if (W.boss) W.mouseOverride = { x: W.boss.x, y: W.boss.y };
      try { W.update(dt); } catch (e) { console.error('demo', e); this.reset(); return; }
      this.cycle += dt;
      const busy = W.boss && W.boss.director.active.length > 0;
      if (this.cfg.before && this.cycle > (this.cfg.cycle || 5) && !busy) { this.phase++; this.reset(); }
      else if (!this.cfg.before && this.cycle > 14 && !busy) this.reset();
      this.render();
    }
    render() {
      const c = this.canvas, g = this.g;
      // crop to the playable arena so the pattern reads larger
      const vw = A.R - A.L + 20, vh = A.B - A.T + 30; const k = Math.max(c.width / vw, c.height / vh);
      const ox = -(A.L - 10) * k - (vw * k - c.width) / 2, oy = -(A.T - 20) * k - (vh * k - c.height) / 2;
      g.setTransform(k, 0, 0, k, ox, oy);
      this.W.draw(g);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.strokeStyle = P.ink; g.lineWidth = 4; g.strokeRect(2, 2, c.width - 4, c.height - 4);
      if (this.label) { const up = this.label !== 'NOW' && this.label !== (this.cfg.labels || [])[0]; const fs = Math.round(c.height * 0.1); g.font = `${fs}px ${art.FONT}`; const w = g.measureText(this.label).width + 14, hh = fs * 1.45; const y = c.height - hh - 7; g.fillStyle = up ? P.coral : P.cream; g.strokeStyle = P.ink; g.lineWidth = 3; g.fillRect(7, y, w, hh); g.strokeRect(7, y, w, hh); g.fillStyle = P.ink; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(this.label, 14, y + hh / 2 + 1); }
    }
  }
  SO.Demo = Demo;
  function demoCfgFor(id, bb) {
    const u = SO.BOSS_UP[id]; const after = SO.clone(bb); SO.applyBossUp(after, id);
    const owned = SO.bossAttackList(bb);
    if (u.kind === 'attack') return { after, attack: u.attack, label: 'NEW ATTACK' };
    if (u.kind === 'mod') return { before: bb, after, attack: u.attack };
    if (u.kind === 'chassis') return { after, label: SO.CHASSIS[u.chassis].name.toUpperCase(), shoot: true };
    const rep = { reactive: 'spread', vengeful: 'sweep', overclock: owned[owned.length - 1], rage: owned[owned.length - 1], combo: null, tempered: 'ring' }[u.passive];
    return { before: bb, after, shoot: true, attack: rep === undefined ? owned[0] : rep, labels: ['WITHOUT', 'WITH TRAIT'], cycle: 5.5 };
  }

  /* ================= cards ================= */
  function stackLine(cur, max) { return max >= 99 ? 'Repeatable' : 'Stack ' + (cur + 1) + '/' + max; }
  ui.playerCard = function (id, B, i, n) {
    const u = SO.PLAYER_UP[id]; const wdef = u.weapon ? SO.WEAPONS[u.weapon] : null;
    const el = h('div', { class: `card panel you rar-${u.rarity}`, 'data-i': i });
    const cv = h('canvas', { width: 300, height: 150 });
    art.cardArt(cv, wdef ? wdef.icon : (u.icon || u.cat), 'player', u.kind === 'evo' ? (g, w, hh) => { art.text(g, u.branch === 'a' ? 'A' : 'B', w - 20, 22, 22, P.warn, 'center', 5); } : null);
    const type = u.kind === 'new' ? 'New weapon' : u.kind === 'mod' ? wdef.name + ' mod' : u.kind === 'evo' ? 'Evolution · ' + wdef.name : SO.CAT_LABEL[u.cat];
    const ch = SO.upgradeChanges(B, id);
    const owned = B.weapons.filter(w => w.id !== u.weapon && SO.WEAPONS[w.id].tags.some(t => (u.tags || []).includes(t))).map(w => SO.WEAPONS[w.id].name);
    app(el,
      h('div', { class: 'ribbon' }, 'FOR YOU'), h('div', { class: 'key' }, i + 1), cv,
      h('div', { class: 'type' }, h('span', null, type), h('span', { class: 'r' }, u.rarity)),
      h('h3', null, u.name), h('p', { class: 'desc' }, u.desc),
      ch.length ? h('ul', { class: 'changes' }, ch.slice(0, n > 3 ? 4 : 6).map(c => h('li', null, h('span', null, c.label), h('b', { class: 'up' }, c.from != null ? `${c.from} → ${c.to}` : String(c.to))))) : null,
      h('div', { class: 'meta' },
        u.reqText ? h('div', { class: 'req ok' }, u.reqText(B)) : null,
        u.kind === 'evo' ? h('div', { class: 'branch' }, '⚠ Branch choice — permanently locks out ', h('b', null, u.other), ': ', u.otherDesc) : null,
        h('div', null, stackLine(B.counts[id] || 0, u.max)),
        owned.length ? h('div', null, 'Synergy with: ', h('b', null, owned.slice(0, 3).join(', '))) : null,
        h('div', null, (u.tags || []).slice(0, 4).map(t => h('span', { class: 'chip you' }, t))))
    );
    return el;
  };
  ui.bossCard = function (id, bb, B, i, round) {
    const u = SO.BOSS_UP[id];
    const el = h('div', { class: 'card panel boss', 'data-i': i });
    const cv = h('canvas', { width: 330, height: 172 });
    const type = u.kind === 'attack' ? 'New attack' : u.kind === 'mod' ? 'Attack mod · ' + SO.BOSS_ATTACKS[u.attack].name : u.kind === 'chassis' ? 'Chassis evolution' : 'Boss trait';
    const ch = SO.bossUpgradeChanges(bb, id, round + 1);
    const hints = SO.bossHints(id, B); const atkDef = u.attack ? SO.BOSS_ATTACKS[u.attack] : null;
    app(el,
      h('div', { class: 'ribbon' }, 'FOR THE BOSS'), h('div', { class: 'key' }, i + 1), cv,
      h('div', { class: 'type' }, h('span', null, type), h('span', { class: 'threat' }, 'THREAT ', h('i', null, '●'.repeat(u.threat)), '○'.repeat(Math.max(0, 5 - u.threat)))),
      h('h3', null, u.name), h('p', { class: 'desc' }, u.desc),
      ch.length ? h('ul', { class: 'changes' }, ch.slice(0, 5).map(c => h('li', null, h('span', null, c.label), h('b', { class: 'up' }, c.from != null ? `${c.from} → ${c.to}` : String(c.to))))) : null,
      h('div', { class: 'meta' },
        u.kind === 'attack' && atkDef.module ? h('div', null, '🔧 Breakable module: ', h('b', null, atkDef.module.name), ' — break it to disable this attack for 12s.') : null,
        u.kind === 'mod' ? h('div', { class: 'req ok' }, 'Modifies your boss\'s ' + atkDef.name) : null,
        u.max > 1 ? h('div', null, stackLine(bb.counts[id] || 0, u.max)) : null,
        hints.good.length ? h('div', { class: 'hint good' }, 'Your counter: ' + hints.good.join(', ')) : null,
        hints.bad.length ? h('div', { class: 'hint bad' }, 'Punishes your ' + hints.bad.join(' & ') + ' build') : null,
        hints.generic.length ? h('div', { class: 'hint neutral' }, 'Punishes ' + hints.generic.join(', ')) : null)
    );
    requestAnimationFrame(() => new Demo(cv, demoCfgFor(id, bb)));
    return el;
  };

  /* ================= build panels ================= */
  ui.playerPanel = function (B, title = 'YOUR BUILD') {
    const pips = w => '■'.repeat(1 + w.mods) + '□'.repeat(Math.max(0, SO.WEAPONS[w.id].mod.max - w.mods));
    const ups = Object.keys(B.counts).filter(id => SO.PLAYER_UP[id] && !SO.PLAYER_UP[id].weapon);
    return h('div', { class: 'ws-build panel you' }, h('h2', null, title), h('div', { class: 'ident' }, SO.buildIdentity(B)),
      h('div', { class: 'list scroll' },
        h('div', { class: 'sec' }, `WEAPONS ${B.weapons.length}/${B.maxWeapons}`),
        B.weapons.map(w => h('div', { class: 'wpn' }, h('div', { class: 'nm' }, SO.WEAPONS[w.id].name, ' ', h('span', { class: 'pips' }, pips(w))), w.evo ? h('div', { class: 'evo' }, '↳ ' + SO.WEAPONS[w.id].evos[w.evo].name) : null)),
        h('div', { class: 'sec' }, 'CORE'),
        h('div', { class: 'row' }, h('span', null, 'Max HP'), h('b', null, Math.round(B.s.maxHp))),
        B.s.shield ? h('div', { class: 'row' }, h('span', null, 'Shield'), h('b', null, B.s.shield)) : null,
        h('div', { class: 'row' }, h('span', null, 'Damage / Fire rate'), h('b', null, '×' + B.s.dmgMul.toFixed(2) + ' / ×' + B.s.rateMul.toFixed(2))),
        h('div', { class: 'row' }, h('span', null, 'Crit'), h('b', null, Math.round(B.s.critChance * 100) + '% ×' + B.s.critMul.toFixed(1))),
        h('div', { class: 'row' }, h('span', null, 'Dash'), h('b', null, B.f.noDash ? 'Locked (find Air dash)' : B.s.dashCharges + ' × ' + B.s.dashCd.toFixed(2) + 's')),
        h('div', { class: 'row' }, h('span', null, 'Utility [E]'), h('b', null, B.utility ? SO.UTILS[B.utility].name : '—')),
        ups.length ? h('div', { class: 'sec' }, 'UPGRADES') : null,
        ups.map(id => h('div', { class: 'row' }, h('span', null, SO.PLAYER_UP[id].name), h('b', null, B.counts[id] > 1 ? '×' + B.counts[id] : '')))));
  };
  ui.bossPanel = function (bb, round, title = 'BOSS BUILD') {
    const list = SO.bossAttackList(bb);
    return h('div', { class: 'ws-build panel boss' }, h('h2', null, title),
      h('div', { class: 'ident' }, SO.CHASSIS[bb.chassis].name + (bb.tier2 ? ' → ' + SO.CHASSIS[bb.tier2].name : '')),
      h('div', { class: 'list scroll' },
        h('div', { class: 'row' }, h('span', null, 'Next HP'), h('b', null, SO.bossHp(round, bb, 'standard', false))),
        h('div', { class: 'row' }, h('span', null, 'Armor'), h('b', null, Math.round(SO.bossArmor(bb) * 100) + '%')),
        h('div', { class: 'sec' }, 'ATTACKS ' + list.length),
        list.map(id => { const d = SO.BOSS_ATTACKS[id]; const m = (bb.attacks[id] || {}); const mods = (d.mods || []).filter(x => m[x.id]).map(x => x.name + (m[x.id] > 1 ? ' ×' + m[x.id] : '')); return h('div', { class: 'wpn' }, h('div', { class: 'nm' }, d.name, d.module ? ' 🔧' : ''), mods.map(x => h('div', { class: 'evo' }, '↳ ' + x))); }),
        Object.keys(bb.passives).length ? h('div', { class: 'sec' }, 'TRAITS') : null,
        Object.keys(bb.passives).map(k => h('div', { class: 'row' }, h('span', null, SO.BOSS_PASSIVES[k].name), h('b', null, bb.passives[k] > 1 ? '×' + bb.passives[k] : '')))));
  };

  /* ================= title ================= */
  ui.title = function () {
    const d = D(); const run = d.run; const g = G();
    g.toMenu();
    const resume = run ? btn(h('span', null, 'Resume Run', h('small', null, `${run.trial && SO.TRIALS[run.trial] ? 'Challenge: ' + SO.TRIALS[run.trial].name : run.mode === 'endless' ? 'Endless' : 'Standard'} · Round ${run.round}${run.phase === 'workshop' ? ' (workshop)' : ''} · ${SO.KITS[run.kit] ? SO.KITS[run.kit].name : ''}`)), () => g.resumeRun(), 'warn') : null;
    const el = h('div', { class: 'screen' },
      h('div', { class: 'title-wrap' },
        h('div', { class: 'logo' }, 'SQUARE', h('br'), 'OFF ', h('span', { class: 'two' }, '2')),
        h('div', { class: 'tagline' }, 'Upgrade yourself. Upgrade the boss. Survive what you built.'),
        h('div', { class: 'menu' },
          resume,
          btn(h('span', null, 'Standard Run', h('small', null, '10 rounds + a final confrontation' + (d.records.standardWins ? ` · ${d.records.standardWins} win(s)` : ''))), () => ui.runSetup('standard'), 'primary'),
          btn(h('span', null, 'Endless', h('small', null, 'Escalating rounds · Best: ' + (d.records.endlessBest ? 'Round ' + d.records.endlessBest : '—'))), () => ui.runSetup('endless'), 'boss'),
          btn(h('span', null, 'Challenges', h('small', null, 'Short twisted runs · ' + SO.TRIAL_ORDER.filter(SO.trialDone).length + '/' + SO.TRIAL_ORDER.length + ' cleared' + (d.unlocks.secretSeen ? ' · ' + SO.SECRET_TRIAL_ORDER.filter(SO.trialDone).length + '/' + SO.SECRET_TRIAL_ORDER.length + ' secret' : ''))), () => ui.challenges(), 'warn'),
          btn(h('span', null, 'Practice Workshop', h('small', null, 'Test weapons & boss patterns, no risk')), () => ui.practice()),
          h('div', { class: 'menu-row' },
            btn(d.unlocks.tutorialDone ? 'Tutorial' : 'Tutorial ★', () => g.startTutorial(), d.unlocks.tutorialDone ? '' : 'warn'),
            btn('Guide', () => ui.guide(ui.title)), btn('Unlocks', () => ui.unlocks()), btn('Settings', () => ui.settings(ui.title))))),
      h('div', { class: 'title-foot' }, 'A/D move · SPACE thrust · MOUSE aim (auto-fire) · SHIFT dash · E utility · ESC pause', h('br'), 'v' + SO.VERSION + ' · progress saves in this browser'));
    ui.set(el, e => { if (e.code === 'Enter' && run) g.resumeRun(); });
    if (!d.unlocks.tutorialDone) setTimeout(() => ui.toast('<b>New here?</b> The Tutorial takes about a minute and teaches dashing and warnings.', 'good', 6), 600);
  };

  ui.portrait = function (cv, k, locked) {
    const g = cv.getContext('2d'), w = cv.width, hh = cv.height; const C = SO.KITS[k];
    if (locked && C.secret) { g.fillStyle = '#1e1e26'; g.fillRect(0, 0, w, hh); art.text(g, '?', w / 2, hh / 2, w * 0.45, '#8a8a96', 'center', 6); g.lineWidth = 4; g.strokeStyle = P.ink; g.strokeRect(2, 2, w - 4, hh - 4); return; }
    g.fillStyle = locked ? '#2a2a3a' : P.blueDeep; g.fillRect(0, 0, w, hh);
    if (!locked) { g.fillStyle = SO.ROLE_COLOR[C.role]; g.globalAlpha = 0.22; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(w / 2, hh / 2); g.arc(w / 2, hh / 2, w, i / 12 * Math.PI * 2, (i + 0.5) / 12 * Math.PI * 2); g.fill(); } g.globalAlpha = 1; }
    const sc = w / 50; g.save(); g.scale(sc, sc);
    const look = { x: 25, y: 33, size: 31, bodyOff: -4, facing: 1, look: 0.3, sx: 1, sy: 1, thrusting: !locked && !(C.flags || {}).grounded, aim: -0.3 };
    if (locked) g.globalAlpha = 0.25;
    art.drawPlayer(g, look, { char: k, time: 0.3, noJet: !!(C.flags || {}).grounded });
    if (!locked && C.weapons.length && !(C.flags || {}).original) art.drawPlayerGuns(g, look, C.weapons.map(id => ({ id, recoil: 0 })), 0);
    g.restore();
    if (locked) { art.text(g, '?', w / 2, hh / 2, w * 0.4, P.cream, 'center', 6); }
    g.lineWidth = 4; g.strokeStyle = P.ink; g.strokeRect(2, 2, w - 4, hh - 4);
  };
  /* ================= run setup ================= */
  ui.runSetup = function (mode) {
    const d = D(); const g = G();
    let kit = (d.lastKit && d.unlocks.kits.includes(d.lastKit)) ? d.lastKit : 'tinkerer'; const chal = new Set((d.lastChallenges || []).filter(c => d.unlocks.challenges.includes(c)));
    const owned = k => d.unlocks.kits.includes(k);
    const ROLES = ['All', 'Classic', 'Twist', 'Hard Mode', 'Overhaul', 'Secret'];
    let hover = null, role = 'All', grid = null, detailSlot = null;
    const visible = () => SO.KIT_ORDER.filter(k => role === 'All' ? !SO.KITS[k].secret : SO.KITS[k].role === role);
    let pokes = 0;
    const choose = k => {
      if (k === 'glitch' && !owned(k)) {
        pokes++; const el = grid && grid.querySelector('.rchar.glitchy'); if (el) { el.classList.remove('poked'); void el.offsetWidth; el.classList.add('poked'); }
        if (pokes < 10) { SO.sfx.play(pokes > 6 ? 'zap' : 'deny'); if (pokes === 4) ui.toast('…something flickered.', '', 2); if (pokes === 8) ui.toast('<b>ERR_</b> st0p p0king', 'boss', 2); return; }
        const r = d.records; r.feats = r.feats || []; if (!r.feats.includes('glitch')) r.feats.push('glitch'); d.unlocks.kits.push('glitch'); SO.save.write();
        SO.sfx.play('break'); ui.toast('🔓 <b>Unlocked</b> character: Glitch', 'unlock', 6); kit = 'glitch'; hover = null; render(); return;
      }
      if (!owned(k)) { SO.sfx.play('deny'); return; } kit = k; hover = null; SO.sfx.play('select'); render(); };
    const showDetail = k => { if (hover === k) return; hover = k; const nd = detailFor(); detailSlot.replaceWith(nd); detailSlot = nd; };
    const start = () => { d.lastKit = kit; d.lastChallenges = [...chal]; SO.save.write(); if (d.run && !confirm('Starting a new run will replace your unfinished run. Continue?')) return; g.newRun(mode, kit, [...chal]); };
    const detailFor = () => {
      const show = hover || kit; const K = SO.KITS[show]; const lockedShow = !owned(show); const hide = lockedShow && K.secret;
      const big = h('canvas', { width: 220, height: 220 }); ui.portrait(big, show, hide);
      const chals = h('div', { class: 'chal-list' }, SO.CHALLENGE_ORDER.map(c => { const C = SO.CHALLENGES[c]; const locked = !d.unlocks.challenges.includes(c); return h('div', { class: 'chal2' + (chal.has(c) ? ' on' : '') + (locked ? ' locked' : ''), title: locked ? 'Win a Standard Run' : C.desc, onclick: () => { if (locked) return; chal.has(c) ? chal.delete(c) : chal.add(c); SO.sfx.play('select'); render(); } }, h('div', { class: 'box' }, chal.has(c) ? '✓' : locked ? '🔒' : ''), h('span', null, C.name)); }));
      return h('div', { class: 'cdetail panel' + (lockedShow ? ' is-locked' : '') },
        h('div', { class: 'dhead' }, big, h('div', null, h('h2', null, hide ? '???' : K.name), h('div', { class: 'ctitle' }, hide ? 'Classified' : K.title), h('span', { class: 'role', style: 'background:' + SO.ROLE_COLOR[K.role] + (K.role === 'Secret' ? ';color:#fff' : '') }, K.role), h('div', { class: 'stars' }, 'Difficulty ' + (hide ? '?????' : '★'.repeat(K.stars) + '☆'.repeat(5 - K.stars))))),
        h('p', { class: 'cdesc' }, hide ? 'Nothing is known about this character until it is unlocked.' : K.desc),
        hide ? null : h('ul', { class: 'traits' }, K.traits.map(t => h('li', null, t))),
        lockedShow ? h('div', { class: 'unlock-pop' }, '🔒 Unlock: ' + K.unlockText) : null,
        h('div', { class: 'sec2' }, 'MODIFIERS (optional)'), chals,
        h('div', { style: 'margin-top:auto;display:flex;justify-content:flex-end;padding-top:8px' }, btn('Start as ' + SO.KITS[kit].name, start, 'primary', 'Enter')));
    };
    const render = () => {
      const list = visible();
      const total = SO.KIT_ORDER.length, got = SO.KIT_ORDER.filter(owned).length;
      const tabs = h('div', { class: 'role-tabs' }, ROLES.map(r => {
        const n = r === 'All' ? SO.KIT_ORDER.filter(k => !SO.KITS[k].secret).length : SO.KIT_ORDER.filter(k => SO.KITS[k].role === r).length;
        return h('button', { class: 'role-tab' + (role === r ? ' on' : ''), style: r === 'All' ? '' : '--rc:' + SO.ROLE_COLOR[r], onclick: () => { role = r; SO.sfx.play('select'); if (r === 'Secret' && !d.unlocks.secretSeen) { d.unlocks.secretSeen = true; SO.save.write(); setTimeout(() => ui.toast('<b>…something shifted.</b> Secret challenges are now listed at the top of the Challenges page.', 'unlock', 7), 250); } render(); } }, r, h('span', null, n));
      }));
      const randomPick = () => { const pool = list.filter(owned).filter(k => k !== kit); if (!pool.length) { SO.sfx.play('deny'); return; } choose(pool[Math.floor(Math.random() * pool.length)]); };
      grid = h('div', { class: 'roster' }, list.map(k => {
        const C = SO.KITS[k]; const locked = !owned(k);
        const cv = h('canvas', { width: 112, height: 112 }); ui.portrait(cv, k, locked);
        return h('div', { class: 'rchar' + (kit === k ? ' sel' : '') + (locked ? ' locked' : '') + (k === 'glitch' && locked ? ' glitchy' : ''), style: '--rc:' + SO.ROLE_COLOR[C.role], title: locked ? (C.secret ? '???' : C.name) + ' — 🔒 ' + C.unlockText : C.name + ', ' + C.title, onclick: () => choose(k), onmouseenter: () => showDetail(k) },
          cv, h('div', { class: 'rname' }, locked ? '🔒 ' + (C.secret ? '???' : C.name) : C.name), h('div', { class: 'rstars' }, locked && C.secret ? '?' : '★'.repeat(C.stars)));
      }));
      grid.addEventListener('mouseleave', () => { if (hover) { hover = null; const nd = detailFor(); detailSlot.replaceWith(nd); detailSlot = nd; } });
      detailSlot = detailFor(); hover = null;
      ui.set(h('div', { class: 'screen solid' }, h('div', { class: 'page' },
        h('div', { class: 'page-head' }, h('h1', null, mode === 'endless' ? 'ENDLESS' : 'STANDARD RUN'), h('div', { class: 'muted', style: 'font-weight:700;max-width:520px' }, mode === 'endless' ? 'No final round — the boss keeps evolving until you drop. Records are saved per character.' : 'Ten rounds across five stages, ending in the Final Curtain. You can keep going after the ending.'), h('div', { class: 'spacer' }), btn('Back', ui.title, 'small', 'Esc')),
        h('div', { class: 'cselect' }, h('div', { class: 'cleft' },
          h('div', { class: 'roster-head' }, h('h2', { class: 'sec2', style: 'margin:0' }, 'CHOOSE YOUR CHARACTER'), h('span', { class: 'roster-count' }, got + '/' + total + ' unlocked'), h('div', { class: 'spacer' }), btn('🎲 Random', randomPick, 'small')),
          tabs, h('div', { class: 'roster-wrap panel' }, grid)), detailSlot))),
        e => {
          if (e.code === 'Escape') ui.title(); else if (e.code === 'Enter') start();
          else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
            e.preventDefault();
            const cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').length);
            const i = list.indexOf(kit); const di = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.code];
            let j = (i < 0 ? 0 : i + di); while (j >= 0 && j < list.length && !owned(list[j])) j += di;
            if ((j < 0 || j >= list.length) && Math.abs(di) > 1) { const step = Math.sign(di); j = i + step; while (j >= 0 && j < list.length && !owned(list[j])) j += step; }
            if (j >= 0 && j < list.length) { choose(list[j]); const el = grid.children[j]; if (el) el.scrollIntoView({ block: 'nearest' }); }
          }
        });
    };
    render();
  };

  /* ================= workshop ================= */
  ui.workshop = function () {
    const g = G(); const run = g.run; const ws = run.ws; const B = g.buildFor(run), bb = g.bossFor(run);
    const need = g.bossPicksNeeded(run), dbl = need > 1; const ptotal = (ws.picksP || []).length + (ws.step === 'player' ? 1 : 0) + (ws.bonus || 0); const rrAvail = g.rerollsAvail(run), freeRR = g.freeRerollReady(run);
    const chassisStep = g.chassisEligible(run);
    const steps = [['player', (ws.bonusTotal ? 'YOUR UPGRADES ×' + (1 + ws.bonusTotal) : 'YOUR UPGRADE'), 'you'], ['boss', dbl ? 'BOSS UPGRADES ×' + need : 'BOSS UPGRADE', 'boss']];
    if (chassisStep) steps.push(['chassis', 'BOSS EVOLUTION', 'boss']);
    steps.push(['review', 'REVIEW', 'rev']);
    const si = steps.findIndex(s => s[0] === ws.step);
    const halfheal = g.repairFrac(run) < 1;
    const nextHp = halfheal ? Math.round(Math.min(B.s.maxHp, run.hp != null ? run.hp : B.s.maxHp)) : B.s.maxHp;
    const head = h('div', { class: 'ws-head' },
      h('div', { class: 'ws-steps' }, steps.map((s, i) => h('div', { class: 'ws-step ' + (i === si ? 'on ' + s[2] : i < si ? 'done' : '') }, (i + 1) + ' · ' + s[1]))),
      h('div', { class: 'ws-heal' + (halfheal ? ' half' : '') }, halfheal ? `✚ PARTIAL REPAIR — ${nextHp}/${B.s.maxHp} HP` : `✚ HULL FULLY REPAIRED — ${B.s.maxHp}/${B.s.maxHp} HP`),
      h('div', { class: 'ws-rr' }, 'REROLLS ', h('b', null, run.rerolls), freeRR ? ' +1 FREE' : ''));
    let center;
    const offers = ws.step === 'player' ? ws.offersP : ws.step === 'boss' ? ws.offersB : ws.step === 'chassis' ? ws.offersC : null;
    const confirmSel = () => { if (ui.sel < 0 || performance.now() < ui.lockUntil || !offers) return; const id = offers[ui.sel]; SO.sfx.play('confirm'); g.workshopConfirm(id); };
    const select = i => { if (!offers || i < 0 || i >= offers.length || performance.now() < ui.lockUntil) return; ui.sel = i; SO.sfx.play('select'); document.querySelectorAll('.cards .card').forEach((c, j) => c.classList.toggle('sel', j === i)); const cb = document.getElementById('ws-confirm'); if (cb) { cb.disabled = false; cb.firstChild.textContent = 'Confirm: ' + (ws.step === 'player' ? SO.PLAYER_UP : SO.BOSS_UP)[offers[i]].name; } };
    const reroll = () => { if (ws.step === 'chassis' || ws.step === 'review' || rrAvail <= 0 || performance.now() < ui.lockUntil) { SO.sfx.play('deny'); return; } g.workshopReroll(); };
    if (ws.step === 'review') center = ui.reviewCenter(run, B, bb);
    else {
      const isBoss = ws.step !== 'player';
      const title = ws.step === 'player' ? h('h2', { class: 'ws-title' }, 'Choose an upgrade for ', h('span', { class: 'you' }, 'YOU'), ptotal > 1 ? ` (${(ws.picksP || []).length + 1}/${ptotal} — BONUS!)` : '')
        : ws.step === 'boss' ? h('h2', { class: 'ws-title' }, 'Now choose an upgrade for ', h('span', { class: 'boss' }, 'THE BOSS'), dbl ? ` (${(ws.bossPicks || []).length + 1}/${need})` : '')
          : h('h2', { class: 'ws-title' }, h('span', { class: 'boss' }, 'BOSS EVOLUTION'), ' — pick its new chassis');
      const sub = ws.step === 'player' ? 'Your upgrades are permanent for this run.' : ws.step === 'boss' ? 'You MUST pick one. It keeps every upgrade for the rest of the run. Watch the demos — previews show exactly what changes.' : 'Changes how it moves and fights. All attacks and traits you gave it come along.';
      const cards = h('div', { class: 'cards n' + offers.length }, offers.map((id, i) => { const c = isBoss ? ui.bossCard(id, bb, B, i, run.round) : ui.playerCard(id, B, i, offers.length); c.addEventListener('click', () => { if (ui.sel === i) confirmSel(); else select(i); }); return c; }));
      center = h('div', { class: 'ws-center' }, title, h('div', { class: 'ws-sub' }, sub), cards,
        h('div', { class: 'ws-actions' },
          ws.step !== 'chassis' ? btn(freeRR ? 'Reroll (FREE)' : 'Reroll (' + run.rerolls + ' left)', reroll, 'small', 'R', rrAvail <= 0 ? { disabled: true } : {}) : null,
          btn('Select a card', confirmSel, isBoss ? 'boss' : 'primary', 'Enter', { id: 'ws-confirm', disabled: true }),
          h('span', { class: 'hintline' }, 'Click a card (or 1–' + offers.length + ') to select · click again or Enter to confirm')));
    }
    const hist = h('div', { class: 'hist scroll' });
    const fillHist = q => { hist.innerHTML = ''; q = (q || '').toLowerCase(); const items = [...run.pUps.map(x => ({ ...x, who: 'you', u: SO.PLAYER_UP[x.id] })), ...run.bUps.map(x => ({ ...x, who: 'boss', u: SO.BOSS_UP[x.id] }))].filter(x => x.u).sort((a, b) => a.round - b.round);
      const f = items.filter(x => !q || x.u.name.toLowerCase().includes(q) || (x.u.desc || '').toLowerCase().includes(q) || x.who.includes(q) || ('r' + x.round) === q);
      if (!f.length) hist.append(h('span', { class: 'muted', style: 'font-size:12px' }, items.length ? 'No matches.' : 'Your build history will appear here.'));
      for (const x of f) hist.append(h('span', { class: 'h ' + x.who, title: x.u.desc }, 'R' + x.round + ' · ' + (x.who === 'you' ? 'YOU' : 'BOSS') + ' · ' + x.u.name)); };
    const search = h('input', { placeholder: 'Search build history… ( / )', oninput: e => fillHist(e.target.value) });
    fillHist('');
    const el = h('div', { class: 'ws' }, head,
      h('div', { class: 'ws-body' }, ui.playerPanel(B), center, ui.bossPanel(bb, run.round + 1)),
      h('div', { class: 'ws-foot' }, h('div', { class: 'panel' }, search, hist), btn('Save & Quit', () => { g.saveRun(); ui.title(); }, 'small')));
    ui.set(el, e => {
      if (typing()) { if (e.code === 'Escape') document.activeElement.blur(); return; }
      if (e.code === 'Slash') { e.preventDefault(); search.focus(); return; }
      if (ws.step === 'review') { if (e.code === 'Enter' || e.code === 'Space') { if (performance.now() >= ui.lockUntil) g.startNextRound(); } return; }
      const n = parseInt(e.key, 10); if (n >= 1 && n <= 4) select(n - 1);
      else if (e.code === 'ArrowLeft') select(Math.max(0, ui.sel - 1)); else if (e.code === 'ArrowRight') select(Math.min(offers.length - 1, ui.sel + 1));
      else if (e.code === 'Enter') confirmSel(); else if (e.code === 'KeyR') reroll();
    });
    ui.lockUntil = performance.now() + 650;
  };
  ui.reviewCenter = function (run, B, bb) {
    const g = G(); const ws = run.ws; const pick = ws.pickP ? SO.PLAYER_UP[ws.pickP] : null; const allPicks = (ws.picksP && ws.picksP.length ? ws.picksP : (ws.pickP ? [ws.pickP] : [])).map(id => SO.PLAYER_UP[id]); const bpicks = (ws.bossPicks || []).map(id => SO.BOSS_UP[id]); if (ws.pickC) bpicks.push(SO.BOSS_UP[ws.pickC]);
    const next = run.round + 1; const ar = SO.arenaForRound(next, run.mode); const A2 = SO.ARENAS[ar.id];
    const cv = h('canvas', { width: 520, height: 230 });
    const lastB = bpicks[bpicks.length - 1];
    if (lastB) requestAnimationFrame(() => { const before = SO.clone(bb); const bbBefore = g.bossFor(run, true); new Demo(cv, Object.assign(demoCfgFor(lastB.id, bbBefore), {})); });
    const youCv = h('canvas', { width: 520, height: 150 }); if (pick) art.cardArt(youCv, pick.weapon ? SO.WEAPONS[pick.weapon].icon : (pick.icon || pick.cat), 'player');
    const halfheal = g.repairFrac(run) < 1;
    const firstVisit = (next - 1) % 2 === 0 && next <= 10;
    return h('div', { class: 'ws-center' }, h('h2', { class: 'ws-title' }, 'REVIEW — Round ' + next + (run.mode === 'standard' && next === 10 ? ': THE FINAL CURTAIN' : '')),
      h('div', { class: 'review' },
        h('div', { class: 'panel' }, h('h2', { style: 'color:var(--teal-dark)' }, 'YOU GOT'), youCv, allPicks.length ? allPicks.map(u => h('div', null, h('b', { style: 'font-family:var(--head);font-size:20px' }, u.name), ' — ', h('span', { style: 'font-size:13px' }, u.desc))) : h('p', null, 'Resuming your saved build.')),
        h('div', { class: 'panel' }, h('h2', { style: 'color:var(--coral-dark)' }, 'THE BOSS GOT'), cv, bpicks.length ? bpicks.map(u => h('div', null, h('b', { style: 'font-family:var(--head);font-size:20px' }, u.name), ' — ', h('span', { style: 'font-size:13px' }, u.desc))) : h('p', null, 'Its current build carries over.'))),
      h('div', { class: 'next-info' }, halfheal ? 'Partial repair: ' : 'Hull fully repaired: ', h('b', null, (halfheal ? Math.round(Math.min(B.s.maxHp, run.hp != null ? run.hp : B.s.maxHp)) : B.s.maxHp) + '/' + B.s.maxHp + ' HP'), ' · Next stage: ', h('b', null, A2.name),
        firstVisit && A2.mechanicDesc ? h('div', null, '⚙ ' + A2.mechanicDesc) : null,
        ar.hazards && A2.hazardName ? h('div', null, '⚠ Hazard active: ', h('b', null, A2.hazardName), ' — ', A2.hazardDesc) : null),
      h('div', { class: 'ws-actions' }, btn('Start Round ' + next, () => g.startNextRound(), 'warn', 'Enter')));
  };

  /* ================= pause ================= */
  ui.pause = function () {
    const g = G(); const W = g.world; const mode = W ? W.mode : '';
    const el = h('div', { class: 'screen dim' }, h('div', { class: 'panel modal' }, h('h2', null, 'PAUSED'),
      h('div', { class: 'menu' },
        btn('Resume', () => g.resume(), 'primary', 'Esc'),
        btn('Settings', () => ui.settings(ui.pause)),
        btn('Weapon & Boss Guide', () => ui.guide(ui.pause)),
        mode === 'practice' ? btn('Back to Practice Setup', () => ui.practice()) : null,
        mode === 'tutorial' ? btn('Exit Tutorial', () => { g.endTutorial(false); }) : null,
        (mode === 'standard' || mode === 'endless' || mode === 'challenge') ? btn('Quit to Title', () => { g.saveRun(); ui.title(); }, 'boss') : null),
      (mode === 'standard' || mode === 'endless' || mode === 'challenge') ? h('p', { class: 'muted', style: 'font-size:12px;max-width:360px;margin:12px 0 0' }, 'Runs save automatically between rounds. Quitting now resumes from the start of Round ' + g.run.round + '.') : null,
      h('p', { class: 'muted', style: 'font-size:12px;margin:8px 0 0' }, 'A/D move · SPACE thrust · S fast-fall / drop · SHIFT dash (+direction) · E utility')));
    ui.set(el, e => { if (e.code === 'Escape' || e.code === 'KeyP') g.resume(); });
  };

  /* ================= settings ================= */
  ui.settings = function (back) {
    const s = D().settings; const g = G();
    const tog = (key, label, note) => { const t = h('div', { class: 'toggle' + (s[key] ? ' on' : ''), onclick: () => { s[key] = !s[key]; t.classList.toggle('on', !!s[key]); g.applySettings(); SO.save.write(); SO.sfx.play('ui'); } }); return h('div', { class: 'set' }, h('div', null, label, note ? h('small', null, note) : null), t); };
    const rng = (key, label, min, max, step, note, fmt = v => Math.round(v * 100) + '%') => { const out = h('b', null, fmt(s[key])); const r = h('input', { type: 'range', min, max, step, value: s[key], oninput: e => { s[key] = parseFloat(e.target.value); out.textContent = fmt(s[key]); g.applySettings(); SO.save.write(); } }); return h('div', { class: 'set' }, h('div', null, label, ' ', out, note ? h('small', null, note) : null), r); };
    const el = h('div', { class: 'screen dim' }, h('div', { class: 'panel modal', style: 'width:820px' }, h('h2', null, 'SETTINGS'),
      h('div', { class: 'settings' },
        rng('shake', 'Screen shake', 0, 1, 0.05, 'Set to 0% to disable entirely'),
        tog('reducedFlash', 'Reduced flashing', 'No white flashes; steady invulnerability & warnings'),
        tog('lightweight', 'Lightweight graphics', 'Chromebook mode: 1× resolution, no halftone, fewer particles'),
        rng('sfx', 'Sound effects volume', 0, 1, 0.05),
        rng('music', 'Music volume', 0, 1, 0.05, 'Menu, Standard, Endless & Practice themes'),
        tog('words', 'Comic impact words', 'POW!, KRAK!, BOOM! and friends'),
        tog('dmgNumbers', 'Damage numbers'),
        rng('friendlyAlpha', 'Your projectile opacity', 0.3, 1, 0.05, 'Lower it to see enemy bullets more easily'),
        tog('hitstop', 'Hit-stop', 'Tiny freeze-frames on heavy hits'),
        tog('boldHitbox', 'Bold hitbox ring', 'Adds a yellow ring around your hit core')),
      h('div', { style: 'display:flex;gap:12px;justify-content:space-between' },
        btn('Reset all progress…', () => { if (confirm('Erase ALL Square Off 2 progress, unlocks, records and the saved run? (Original Square Off saves are untouched.)')) { SO.save.reset(); g.applySettings(); ui.title(); } }, 'small boss'),
        btn('Back', () => back ? back() : ui.title(), 'primary', 'Esc'))));
    ui.set(el, e => { if (e.code === 'Escape') back ? back() : ui.title(); });
  };

  /* ================= guide ================= */
  ui.guide = function (back, tab = 'weapons') {
    const d = D(); let selId = null;
    const unlocked = id => !SO.WEAPONS[id].unlock || d.unlocks.weapons.includes(id);
    const render = () => {
      const tabs = h('div', { class: 'tabs' }, [['weapons', 'Weapons (30)'], ['boss', 'Boss Attacks'], ['chassis', 'Chassis'], ['gloss', 'How to read the fight']].map(([k, l]) => h('div', { class: 'tab' + (tab === k ? ' on' : ''), onclick: () => { tab = k; selId = null; render(); } }, l)));
      let list, detail;
      if (tab === 'weapons') {
        selId = selId || 'blaster';
        list = h('div', { class: 'gl panel scroll' }, SO.WEAPON_ORDER.map(id => { const w = SO.WEAPONS[id]; const cv = h('canvas', { width: 120, height: 60 }); art.cardArt(cv, w.icon, 'player'); return h('div', { class: 'gi' + (selId === id ? ' on' : '') + (unlocked(id) ? '' : ' lock'), onclick: () => { selId = id; render(); } }, cv, (unlocked(id) ? '' : '🔒 ') + w.name); }));
        const w = SO.WEAPONS[selId]; const p = w.calc({ id: selId, mods: 0, evo: null }, {}); const sh = w.show(p); const cv = h('canvas', { width: 360, height: 190 }); art.cardArt(cv, w.icon, 'player');
        detail = h('div', { class: 'gd panel scroll' }, h('h3', null, w.name), h('div', null, w.tags.map(t => h('span', { class: 'chip you' }, t))), cv, h('p', null, w.desc), !unlocked(selId) ? h('p', { class: 'unlock-pop' }, '🔒 Unlock: ' + SO.WEAPON_UNLOCK_TEXT[w.unlock]) : null,
          h('table', null, Object.keys(sh).map(k => h('tr', null, h('td', null, k), h('td', null, String(sh[k])))), h('tr', null, h('td', null, '≈ DPS'), h('td', null, Math.round(p.dps || 0)))),
          h('div', { class: 'evo' }, h('b', null, 'Mod — ' + w.mod.name + ' (×' + w.mod.max + '): '), w.mod.desc),
          h('div', { class: 'evo' }, h('b', null, 'Evolution A — ' + w.evos.a.name + ': '), w.evos.a.desc),
          h('div', { class: 'evo' }, h('b', null, 'Evolution B — ' + w.evos.b.name + ': '), w.evos.b.desc),
          h('p', { class: 'muted', style: 'font-size:12px' }, 'Evolutions need the weapon plus at least one mod. Picking one locks out the other for the run.'));
      } else if (tab === 'boss') {
        const ids = SO.BOSS_ATTACK_ORDER; selId = selId || 'spread';
        list = h('div', { class: 'gl panel scroll' }, ids.map(id => { const a = SO.BOSS_ATTACKS[id]; return h('div', { class: 'gi' + (selId === id ? ' on' : ''), onclick: () => { selId = id; render(); } }, a.name, a.chassisOnly ? h('div', { class: 'muted' }, '(chassis)') : null); }));
        const a = SO.BOSS_ATTACKS[selId]; const cv = h('canvas', { width: 380, height: 200 }); const bb = SO.newBossBuild(); bb.attacks = {}; bb.attacks[selId] = {};
        if (a.chassisOnly) { const map = { bombard: ['walker', 'siege'], sideguns: ['hover', 'fortress'], carousel: ['modular', 'carousel'], hydra: ['modular', 'hydra'], drip: ['crawler', 'dripper'], dive: ['stalker', 'hunter'], payload: ['stalker', 'shade'] }[selId]; bb.chassis = map[0]; bb.tier2 = map[1]; }
        requestAnimationFrame(() => new Demo(cv, { after: bb, attack: selId, label: a.name.toUpperCase() }));
        const sh = a.show(a.params({}, bb));
        detail = h('div', { class: 'gd panel scroll' }, h('h3', null, a.name), cv, h('p', null, a.desc), a.module ? h('p', null, '🔧 Breakable module: ', h('b', null, a.module.name)) : null,
          h('table', null, Object.keys(sh).map(k => h('tr', null, h('td', null, k), h('td', null, String(sh[k])))), h('tr', null, h('td', null, 'Director cost / cooldown'), h('td', null, a.cost + ' / ' + a.cd + 's')), a.big ? h('tr', null, h('td', null, 'Recovery window'), h('td', null, (a.recovery || 1.2) + 's exposed')) : null),
          a.mods.map(m => h('div', { class: 'evo' }, h('b', null, 'Mod — ' + m.name + ': '), m.desc)));
      } else if (tab === 'chassis') {
        const ids = Object.keys(SO.CHASSIS); selId = selId || 'proto';
        list = h('div', { class: 'gl panel scroll', style: 'grid-template-columns:repeat(2,1fr)' }, ids.map(id => h('div', { class: 'gi' + (selId === id ? ' on' : ''), onclick: () => { selId = id; render(); } }, SO.CHASSIS[id].name, h('div', { class: 'muted' }, SO.CHASSIS[id].tier === 2 ? 'Tier 2 · from ' + SO.CHASSIS[SO.CHASSIS[id].base].name : SO.CHASSIS[id].tier === 1 ? 'Tier 1 (after Round 3)' : 'Starting chassis'))));
        const c = SO.CHASSIS[selId]; const bb = SO.newBossBuild(); if (c.tier === 1) bb.chassis = selId; if (c.tier === 2) { bb.chassis = c.base; bb.tier2 = selId; if (c.grant) bb.attacks[c.grant] = {}; }
        const cv = h('canvas', { width: 380, height: 200 }); requestAnimationFrame(() => new Demo(cv, { after: bb, label: c.name.toUpperCase(), shoot: true }));
        detail = h('div', { class: 'gd panel' }, h('h3', null, c.name), cv, h('p', null, c.desc), h('p', { class: 'muted' }, 'After Round 3 you choose between three of the ten Tier-1 chassis; after Round 7, between its two Tier-2 upgrades. Every attack and trait carries over.'));
      } else {
        list = h('div', { class: 'gd panel scroll', style: 'grid-column:1/-1;font-size:14.5px' },
          h('h3', null, 'Reading the fight'),
          h('div', { class: 'evo' }, h('b', null, 'Red-pink shots with a dark outline'), ' are enemy projectiles. They are always drawn on top.'),
          h('div', { class: 'evo' }, h('b', null, 'Turquoise / cream shots'), ' are yours. Lower their opacity in Settings if the screen gets busy.'),
          h('div', { class: 'evo' }, h('b', null, 'Yellow & black stripes, dashed yellow lines and countdown rings'), ' are warnings. Something will happen there soon. Every dangerous attack shows one first.'),
          h('div', { class: 'evo' }, h('b', null, 'Your hitbox'), ' is the small white core in your body. Bullets that miss the core don\'t hurt. After a hit you get a moment of invulnerability.'),
          h('div', { class: 'evo' }, h('b', null, 'Touching the boss is safe'), ' unless it glows with hazard stripes (Ram Charge, Stomp).'),
          h('div', { class: 'evo' }, h('b', null, 'Dash'), ' (SHIFT + direction) makes you invulnerable for its duration. The ring under you shows its cooldown.'),
          h('div', { class: 'evo' }, h('b', null, 'Exposed core'), ' — after big attacks, module breaks and phase shifts, the boss vents and opens a hatch. It takes 50% more damage and ignores armor. Look for the "HIT!" burst.'),
          h('div', { class: 'evo' }, h('b', null, 'Weapon modules 🔧'), ' — some attacks mount breakable parts with their own HP bar. Breaking one disables that attack for 12s and staggers the boss. Your upgrade choices are never erased.'),
          h('div', { class: 'evo' }, h('b', null, 'Status effects'), ' — Burn & Bleed tick damage; Chill slows the boss and its attack timers; Soaked (ink) +12% damage taken; Magnetized pulls your metal shots; Cracked +10% damage taken.'),
          h('div', { class: 'evo' }, h('b', null, 'Attack director'), ' — the boss never stacks two zone attacks (lasers, barriers, sweeps) or a hazard with one, caps projectile speed and tracking, and always leaves an escape route.'));
        detail = null;
      }
      ui.set(h('div', { class: 'screen solid' }, h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('h1', null, 'GUIDE'), tabs, h('div', { class: 'spacer' }), btn('Back', () => back ? back() : ui.title(), 'small', 'Esc')), h('div', { class: 'guide', style: detail ? '' : 'grid-template-columns:1fr' }, list, detail))), e => { if (e.code === 'Escape') back ? back() : ui.title(); });
    };
    render();
  };

  /* ================= unlocks ================= */
  ui.unlocks = function () {
    const d = D(), u = d.unlocks, r = d.records;
    const render = () => {
      const paints = h('div', { class: 'paints' }, Object.keys(SO.PAINTS).map(k => { const lock = !u.cosmetics.includes(k); const cv = h('canvas', { width: 60, height: 60 }); const g = cv.getContext('2d'); g.fillStyle = P.blueDeep; g.fillRect(0, 0, 60, 60); art.drawPlayer(g, { x: 30, y: 34, size: 34, bodyOff: -4, facing: 1, look: 0, sx: 1, sy: 1 }, { paint: k, time: 0 });
        return h('div', { class: 'paint' + (d.settings.paint === k ? ' on' : '') + (lock ? ' lock' : ''), title: lock ? SO.COSMETIC_UNLOCKS[k] : '', onclick: () => { if (lock) return; d.settings.paint = k; SO.save.write(); SO.sfx.play('select'); render(); } }, cv, h('div', null, SO.PAINTS[k].label), lock ? h('div', { class: 'muted' }, '🔒 ' + SO.COSMETIC_UNLOCKS[k]) : null); }));
      const kits = h('div', { class: 'ulist' }, SO.KIT_ORDER.map(k => h('div', { class: 'it ' + (u.kits.includes(k) ? 'got' : 'lock') }, h('b', null, SO.KITS[k].secret && !u.kits.includes(k) ? '??? (Secret)' : SO.KITS[k].name), h('span', null, u.kits.includes(k) ? 'Unlocked' : '🔒 ' + SO.KITS[k].unlockText))));
      const wl = SO.WEAPON_ORDER.filter(id => SO.WEAPONS[id].unlock);
      const weps = h('div', { class: 'ulist' }, wl.map(id => h('div', { class: 'it ' + (u.weapons.includes(id) ? 'got' : 'lock') }, h('b', null, SO.WEAPONS[id].name), h('span', null, u.weapons.includes(id) ? 'In the pool' : '🔒 ' + SO.WEAPON_UNLOCK_TEXT[SO.WEAPONS[id].unlock]))));
      const chals = h('div', { class: 'ulist' }, SO.CHALLENGE_ORDER.map(c => h('div', { class: 'it ' + (u.challenges.includes(c) ? 'got' : 'lock') }, h('b', null, SO.CHALLENGES[c].name), h('span', null, u.challenges.includes(c) ? 'Available' : '🔒 Win a Standard Run'))));
      const recs = h('div', { class: 'ulist' }, [['Runs played', r.runs], ['Standard wins', r.standardWins], ['Best Standard round cleared', r.bestStandardRound || '—'], ['Endless best round cleared', r.endlessBest || '—'], ['Fastest win', r.fastestWin ? Math.round(r.fastestWin) + 's' : '—'], ['Bosses beaten', r.bossesBeaten], ['Modules broken', r.modulesBroken], ['Modifier wins', r.challengeWins], ['Challenges cleared', SO.TRIAL_ORDER.filter(SO.trialDone).length + '/' + SO.TRIAL_ORDER.length]].map(([a, b]) => h('div', { class: 'it' }, h('span', null, a), h('b', null, String(b)))),
        Object.keys(r.endlessBestKit || {}).length ? h('div', { class: 'it' }, h('span', null, 'Endless best by character'), h('b', null, Object.entries(r.endlessBestKit).map(([k, v]) => (SO.KITS[k] ? SO.KITS[k].name : k) + ' R' + v).join(' · '))) : null);
      ui.set(h('div', { class: 'screen solid' }, h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('h1', null, 'UNLOCKS & RECORDS'), h('div', { class: 'muted', style: 'font-weight:700' }, 'Progression unlocks options, never raw power. A fresh save can win.'), h('div', { class: 'spacer' }), btn('Back', ui.title, 'small', 'Esc')),
        h('div', { class: 'ul' }, h('div', { class: 'panel scroll' }, h('h2', null, 'PAINT JOBS'), paints, h('h2', { style: 'margin-top:12px' }, 'CHARACTERS'), kits, h('h2', { style: 'margin-top:12px' }, 'RUN MODIFIERS'), chals),
          h('div', { class: 'panel scroll' }, h('h2', null, 'RECORDS'), recs, h('h2', { style: 'margin-top:12px' }, 'WEAPON UNLOCKS'), weps)))), e => { if (e.code === 'Escape') ui.title(); });
    };
    render();
  };

  /* ================= summary & ending ================= */
  ui.summary = function (S) {
    const g = G();
    const bars = (obj, cls) => { const ent = Object.entries(obj).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 9); const mx = ent.length ? ent[0][1] : 1; return ent.length ? ent.map(([k, v]) => h('div', { class: 'barrow ' + cls }, h('span', null, SO.sourceName(k)), h('div', { class: 'b' }, h('i', { style: `width:${Math.max(3, v / mx * 100)}%` })), h('b', null, Math.round(v)))) : h('p', { class: 'muted' }, 'Nothing recorded.'); };
    const totalDealt = Object.values(S.dmgBySource).reduce((a, b) => a + b, 0), totalTaken = Object.values(S.dmgTaken).reduce((a, b) => a + b, 0);
    const mm = Math.floor(S.time / 60), ss = Math.round(S.time % 60);
    const el = h('div', { class: 'screen solid' }, h('div', { class: 'page' },
      h('div', { class: 'page-head' }, h('h1', null, S.trial ? (S.won ? 'CHALLENGE CLEARED!' : 'CHALLENGE FAILED') : S.won ? 'CURTAIN CALL!' : 'KNOCKED OUT'), h('div', { class: 'muted', style: 'font-weight:700;font-size:15px' }, (S.trial ? 'Challenge: ' + SO.TRIALS[S.trial].name : S.mode === 'endless' ? 'Endless' : 'Standard') + ' · ' + (SO.KITS[S.kit] ? SO.KITS[S.kit].name : '') + (S.challenges.length ? ' · ' + S.challenges.map(c => SO.CHALLENGES[c].name).join(', ') : '')), h('div', { class: 'spacer' }), btn(S.trial ? 'Retry Challenge' : 'Quick Restart', () => g.quickRestart(), 'primary', 'R'), S.trial ? btn('Challenges', () => ui.challenges(), 'small') : null, btn('Main Menu', ui.title, 'small', 'Esc')),
      h('div', { class: 'sum' },
        h('div', { class: 'panel scroll' }, h('h2', null, 'THE RUN'),
          h('div', { class: 'bigstat' }, h('div', null, h('b', null, S.roundsCleared), h('span', null, 'Rounds cleared')), h('div', null, h('b', null, mm + ':' + String(ss).padStart(2, '0')), h('span', null, 'Fight time')), h('div', null, h('b', null, S.modulesBroken), h('span', null, 'Modules broken'))),
          h('div', { class: 'bigstat' }, h('div', null, h('b', null, Math.round(totalDealt)), h('span', null, 'Damage dealt')), h('div', null, h('b', null, Math.round(totalTaken)), h('span', null, 'Damage taken'))),
          !S.won && S.killedBy ? h('div', { class: 'unlock-pop', style: 'background:var(--coral-light)' }, 'Defeated by: ' + SO.sourceName(S.killedBy) + ' in Round ' + S.lastRound) : null,
          S.newRecord ? h('div', { class: 'unlock-pop' }, '★ ' + S.newRecord) : null,
          S.trial && S.won ? h('div', { class: 'unlock-pop' }, S.trialNew ? '✓ First clear: ' + SO.TRIALS[S.trial].name + '!' : '✓ Cleared again: ' + SO.TRIALS[S.trial].name) : null,
          S.unlocks.map(t => h('div', { class: 'unlock-pop' }, '🔓 Unlocked ' + t)),
          h('h2', { style: 'margin-top:10px' }, 'DAMAGE TAKEN FROM'), bars(S.dmgTaken, 'boss')),
        h('div', { class: 'panel scroll' }, h('h2', null, 'YOUR BUILD — ', h('span', { style: 'color:var(--teal-dark)' }, S.identity)),
          h('div', { style: 'font-weight:700;font-size:13px;margin-bottom:6px' }, S.loadout || ''),
          h('div', { style: 'font-size:12.5px;margin-bottom:8px' }, S.pUps.map(x => h('span', { class: 'chip you' }, 'R' + x.round + ' ' + (SO.PLAYER_UP[x.id] ? SO.PLAYER_UP[x.id].name : x.id)))),
          h('h2', null, 'DAMAGE SOURCES'), bars(S.dmgBySource, '')),
        h('div', { class: 'panel scroll' }, h('h2', null, 'THE BOSS YOU BUILT'), h('div', { style: 'font-weight:700;margin-bottom:6px' }, S.chassis),
          h('div', { style: 'font-size:12.5px' }, S.bUps.length ? S.bUps.map(x => h('span', { class: 'chip boss' }, 'R' + x.round + ' ' + (SO.BOSS_UP[x.id] ? SO.BOSS_UP[x.id].name : x.id))) : h('span', { class: 'muted' }, 'It never got an upgrade.')),
          h('div', { style: 'margin-top:10px;font-size:13px' }, S.bossNote)))));
    ui.set(el, e => { if (e.code === 'KeyR') g.quickRestart(); else if (e.code === 'Escape') ui.title(); });
  };
  ui.ending = function (S) {
    const g = G();
    const el = h('div', { class: 'screen dim ending' }, h('div', { class: 'panel modal', style: 'width:640px;text-align:center' },
      h('div', { class: 'big ink-title' }, 'CURTAIN CALL!'),
      h('p', { style: 'font-size:17px;font-weight:700' }, S.bUps ? 'You beat the machine you built — all ' + S.bUps + ' upgrades of it.' : 'You beat the machine straight off the assembly line.'),
      h('p', { class: 'muted' }, 'Build: ' + S.identity + ' · Time: ' + Math.floor(S.time / 60) + ':' + String(Math.round(S.time % 60)).padStart(2, '0')),
      S.unlocks.length ? h('div', { style: 'max-height:150px;overflow:auto;text-align:left' }, h('b', null, '🔓 Unlocked: '), S.unlocks.map(t => h('span', { class: 'chip warnc' }, t))) : null,
      h('p', { class: 'muted', style: 'font-size:12.5px' }, 'Continue the Show keeps this run going with escalating rounds (records count toward Endless).'),
      h('div', { style: 'display:flex;gap:12px;justify-content:center;margin-top:14px' }, btn('Continue the Show', () => g.continueAfterFinale(), 'warn', 'Enter'), btn('Take a Bow (finish)', () => g.endRun(true), 'primary'))));
    ui.set(el, e => { if (e.code === 'Enter') g.continueAfterFinale(); });
  };

  /* ================= practice ================= */
  ui.practice = function () {
    const g = G(), d = D(); g.toMenu();
    const cfg = d.practiceCfg || (d.practiceCfg = { weapons: { blaster: 'base' }, attacks: { spread: 'base', ring: 'base' }, chassis: 'proto', tier2: '', arena: 'print', round: 3, god: true, infinite: true, hazards: false });
    const unlocked = id => !SO.WEAPONS[id].unlock || d.unlocks.weapons.includes(id) || SO.KIT_ORDER.some(k => d.unlocks.kits.includes(k) && SO.KITS[k].weapons.includes(id));
    const render = () => {
      const wcount = Object.values(cfg.weapons).filter(v => v && v !== 'off').length;
      const wg = h('div', { class: 'pgrid scroll' }, SO.WEAPON_ORDER.map(id => { const W2 = SO.WEAPONS[id]; const lock = !unlocked(id); const v = cfg.weapons[id] || 'off';
        const s = h('select', { onchange: e => { cfg.weapons[id] = e.target.value; if (Object.values(cfg.weapons).filter(x => x && x !== 'off').length > 6) { cfg.weapons[id] = 'off'; ui.toast('Max 6 weapons.', 'boss'); } render(); }, onclick: e => e.stopPropagation() }, [['off', 'Off'], ['base', 'Base'], ['mod', '+ ' + W2.mod.name], ['a', 'Evo A: ' + W2.evos.a.name], ['b', 'Evo B: ' + W2.evos.b.name]].map(([k, l]) => h('option', { value: k, selected: v === k ? true : null }, l)));
        if (lock) s.disabled = true;
        return h('div', { class: 'pw' + (v !== 'off' ? ' on' : '') + (lock ? ' lock' : '') }, h('span', null, (lock ? '🔒 ' : '') + W2.name), s); }));
      const ag = h('div', { class: 'pgrid scroll' }, SO.BOSS_ATTACK_ORDER.filter(id => !SO.BOSS_ATTACKS[id].chassisOnly).map(id => { const a = SO.BOSS_ATTACKS[id]; const v = cfg.attacks[id] || 'off';
        const opts = [['off', 'Off'], ['base', 'Base']]; a.mods.forEach((m, i) => opts.push(['m' + i, '+ ' + m.name])); opts.push(['all', 'All mods']);
        const s = h('select', { onchange: e => { cfg.attacks[id] = e.target.value; render(); } }, opts.map(([k, l]) => h('option', { value: k, selected: v === k ? true : null }, l)));
        return h('div', { class: 'pw boss' + (v !== 'off' ? ' on' : '') }, h('span', null, a.name), s); }));
      const t1 = ['proto'].concat(SO.CHASSIS_T1);
      const tier2s = Object.keys(SO.CHASSIS).filter(k => SO.CHASSIS[k].base === cfg.chassis);
      const sel = (label, val, opts, fn) => h('label', null, label + ' ', h('select', { onchange: e => { fn(e.target.value); render(); } }, opts.map(([k, l]) => h('option', { value: k, selected: String(val) === String(k) ? true : null }, l))));
      const tg = (key, label) => h('label', { style: 'display:flex;align-items:center;gap:6px;cursor:pointer', onclick: () => { cfg[key] = !cfg[key]; render(); } }, h('div', { class: 'toggle' + (cfg[key] ? ' on' : '') }), label);
      const start = () => { SO.save.write(); if (!wcount) { ui.toast('Pick at least one weapon.', 'boss'); return; } g.startPractice(cfg); };
      ui.set(h('div', { class: 'screen solid' }, h('div', { class: 'page' },
        h('div', { class: 'page-head' }, h('h1', null, 'PRACTICE WORKSHOP'), h('div', { class: 'muted', style: 'font-weight:700' }, 'No risk, no records. ESC in practice returns here.'), h('div', { class: 'spacer' }), btn('Back', ui.title, 'small', 'Esc'), btn('Start Practice', start, 'primary', 'Enter')),
        h('div', { class: 'prac' },
          h('div', { class: 'panel' }, h('h2', null, `YOUR WEAPONS (${wcount}/6)`), wg),
          h('div', { class: 'panel' }, h('h2', null, 'BOSS PATTERNS'), ag,
            h('div', { class: 'sel-row' }, sel('Chassis', cfg.chassis, t1.map(k => [k, SO.CHASSIS[k].name]), v => { cfg.chassis = v; cfg.tier2 = ''; }), tier2s.length ? sel('Tier 2', cfg.tier2, [['', 'None']].concat(tier2s.map(k => [k, SO.CHASSIS[k].name])), v => cfg.tier2 = v) : null),
            h('div', { class: 'sel-row' }, sel('Stage', cfg.arena, SO.ARENA_ORDER.map(k => [k, SO.ARENAS[k].name]), v => cfg.arena = v), sel('Round tuning', cfg.round, [[1, 'Round 1'], [3, 'Round 3'], [6, 'Round 6'], [10, 'Round 10']], v => cfg.round = +v)),
            h('div', { class: 'sel-row', style: 'gap:16px' }, tg('god', 'Invincible'), tg('infinite', 'Endless boss HP'), tg('hazards', 'Stage hazards')))))),
        e => { if (typing()) return; if (e.code === 'Escape') ui.title(); else if (e.code === 'Enter') start(); });
    };
    render();
  };

  /* ================= challenges ================= */
  ui.challenges = function () {
    const d = D(), g = G(); g.toMenu();
    const secretOn = !!d.unlocks.secretSeen;
    const order = (secretOn ? SO.SECRET_TRIAL_ORDER : []).concat(SO.TRIAL_ORDER);
    let sel = d.lastTrial && order.includes(d.lastTrial) ? d.lastTrial : order[0];
    let kit = d.unlocks.kits.includes(d.lastTrialKit) ? d.lastTrialKit : (d.unlocks.kits.includes(d.lastKit) ? d.lastKit : 'tinkerer');
    const rewardLine = T => {
      if (!T.reward) return null; const K = SO.KITS[T.reward]; const got = d.unlocks.kits.includes(T.reward);
      return h('div', { class: 'unlock-pop', style: got ? '' : 'background:#4a4a55;color:#fff' }, got ? '🔓 Reward: ' + K.name + ', ' + K.title + ' (unlocked)' : '🔒 Reward: ??? — a Secret character');
    };
    const start = () => {
      const T = SO.TRIALS[sel]; d.lastTrial = sel; d.lastTrialKit = kit; SO.save.write();
      if (d.run && !confirm('Starting a challenge will replace your unfinished run. Continue?')) return;
      g.newRun('challenge', T.rules.kit || kit, [], sel);
    };
    const render = () => {
      const T = SO.TRIALS[sel]; const done = SO.trialDone(sel);
      const card = id => { const C = SO.TRIALS[id]; return h('div', { class: 'tcard' + (C.secret ? ' secret' : '') + (id === sel ? ' on' : '') + (SO.trialDone(id) ? ' done' : ''), onclick: () => { sel = id; SO.sfx.play('select'); render(); } },
        h('div', { class: 'tname' }, C.name), h('div', { class: 'tmeta' }, C.rounds + ' rounds' + (C.secret ? ' · SECRET' : '') + (C.reward ? ' · ★' : '')), SO.trialDone(id) ? h('div', { class: 'tcheck' }, '✓') : null); };
      const kits = SO.KIT_ORDER.filter(k => d.unlocks.kits.includes(k));
      const kitSel = T.rules.kit ? h('b', null, SO.KITS[T.rules.kit].name + ' (fixed)')
        : h('select', { onchange: e => { kit = e.target.value; } }, kits.map(k => h('option', { value: k, selected: k === kit ? true : null }, SO.KITS[k].name + ', ' + SO.KITS[k].title)));
      ui.set(h('div', { class: 'screen solid' }, h('div', { class: 'page' },
        h('div', { class: 'page-head' }, h('h1', null, 'CHALLENGES'), h('div', { class: 'muted', style: 'font-weight:700;max-width:520px' }, 'Short runs of 3–5 rounds, each with a twist. Clear one to tick it off — some hand out characters.'), h('div', { class: 'spacer' }), btn('Back', ui.title, 'small', 'Esc')),
        h('div', { class: 'trials' },
          h('div', { class: 'panel scroll tlist' },
            secretOn ? h('h2', { class: 'tsec secret' }, 'SECRET CHALLENGES') : null, secretOn ? h('div', { class: 'tgrid' }, SO.SECRET_TRIAL_ORDER.map(card)) : null,
            h('h2', { class: 'tsec' }, 'CHALLENGES · ' + SO.TRIAL_ORDER.filter(SO.trialDone).length + '/' + SO.TRIAL_ORDER.length + ' CLEARED'), h('div', { class: 'tgrid' }, SO.TRIAL_ORDER.map(card))),
          h('div', { class: 'panel tdetail' + (T.secret ? ' secret' : '') },
            h('h2', null, T.name), h('div', { class: 'tmeta big' }, T.rounds + ' rounds' + (T.rules.startRound ? ' · starts at Round ' + T.rules.startRound : '') + (done ? ' · ✓ CLEARED' : '')),
            h('p', { class: 'cdesc' }, T.desc), rewardLine(T),
            h('div', { class: 'sec2' }, 'CHARACTER'), kitSel,
            h('p', { class: 'muted', style: 'font-size:12.5px' }, 'Challenge runs never change your Standard or Endless records. Quit any time from the pause menu.'),
            h('div', { style: 'margin-top:auto;display:flex;justify-content:flex-end;padding-top:8px' }, btn('Start Challenge', start, 'primary', 'Enter')))))),
        e => { if (typing()) return; if (e.code === 'Escape') ui.title(); else if (e.code === 'Enter') start(); });
    };
    render();
  };

  /* ================= tutorial overlay ================= */
  ui.tutorialBox = function (step, idx, total) {
    let box = document.getElementById('tutbox');
    if (!box) { box = h('div', { class: 'panel tut', id: 'tutbox' }); ui.root.insertBefore(box, ui.toastWrap); }
    box.innerHTML = '';
    box.append(h('h3', null, step.title), h('p', null, step.text), h('div', { class: 'prog' }, `Step ${idx + 1} / ${total}` + (step.progress ? ' · ' + step.progress() : '') + ' · ESC to pause/exit'));
  };
  ui.hudOnly = function () { ui.set(null, e => { if (e.code === 'Escape' || e.code === 'KeyP') G().pause(); }); };
})();
