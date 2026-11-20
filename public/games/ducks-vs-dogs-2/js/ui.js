/* Ducks vs. Dogs 2 — menus: title, map, team huddle (loadout), shops, results, reveal, guide, settings. */
(function (D) {
  'use strict';
  const G = D.G, A = D.Audio, S = D.Save, B = D.Battle;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const UI = D.UI = { screen: null, world: 1, team: [], queue: [] };
  const ICON = { crumbjar: '🍞', quickhands: '🌀', extraqp: '🪶', honk: '📯', sturdy: '🌾', luckyegg: '🥚', goldgoose: '🏆', hat_party: '🎉', hat_top: '🎩', crown: '👑', confetti: '🎊',
    lunchbox: '🍱', shootingstar: '🌠', compass: '🧭', hat_wizard: '🧙', twinkle: '✨' };
  D.SNACK_ORDER.forEach(id => { ICON['snack_' + id] = D.SNACKS[id].icon; });
  const price = it => (D.SHOPS[it.shop].currency === 'stars' ? '★ ' : '<span class="coin-ico"></span>') + it.price;
  const wallet = it => D.SHOPS[it.shop].currency === 'stars' ? S.stars() : S.data.coins;

  /* ------------------------------------------------------------ screens */
  UI.show = function (name) {
    document.querySelectorAll('.screen').forEach(el => el.classList.toggle('hidden', el.id !== 'screen-' + name));
    UI.screen = name;
    document.body.dataset.screen = name;
  };
  UI.modal = function (html, cls) {
    const m = $('modal');
    m.innerHTML = '<div class="modal-card ' + (cls || '') + '">' + html + '</div>';
    m.classList.remove('hidden');
  };
  UI.closeModal = function () { $('modal').classList.add('hidden'); $('modal').innerHTML = ''; };
  function coinsHtml() {
    const showStars = S.shopUnlocked('observatory') || S.starsEarned() > 0;
    return '<div class="wallet"><div class="coins" id="coin-pill" title="Coins"><span class="coin-ico"></span><b>' + S.data.coins.toLocaleString() + '</b></div>' +
      (showStars ? '<div class="coins stars" title="Stars from bonus objectives (spend at the Starlight Observatory)"><span class="star-ico">★</span><b>' + S.stars() + '</b></div>' : '') + '</div>';
  }
  function trophyBadge() { const n = Object.values(S.data.trophies).filter(v => v === 'got').length; return n ? '<em class="badge">' + n + '</em>' : ''; }
  function portrait(key, cls) { return '<img class="' + (cls || 'pt') + '" src="' + G.portrait(key) + '" alt="">'; }
  function duckSourceText(id) {
    const src = D.DUCKS[id].source;
    if (src === 'start') return 'Starting duck';
    const [kind, val] = src.split(':');
    if (kind === 'level') return 'Reward for clearing level ' + val;
    if (kind === 'challenge') return 'Reward for bonus challenge ' + D.LEVEL[val].name.replace('Bonus: ', '');
    if (kind === 'shop') return 'Sold at ' + D.SHOPS[val].name;
    return '';
  }

  /* ------------------------------------------------------------ TITLE */
  UI.title = function () {
    B.cleanup();
    UI.show('title');
    G.diorama(1, { ducks: ['puddle', 'bread', 'frost', 'double'], dogs: ['mutt', 'pogo', 'helmet'] });
    A.music(5);
    const endless = S.endlessUnlocked();
    S.checkTrophies(); S.save();
    $('screen-title').innerHTML =
      '<div class="logo"><div class="logo-top">DUCKS</div><div class="logo-vs">vs.</div><div class="logo-bot">DOGS<span class="logo-2">2</span></div><div class="logo-sub">The Great Pond Defense</div></div>' +
      '<div class="title-btns">' +
      '<button class="btn big primary" data-act="play">' + (Object.keys(S.data.cleared).length ? 'Continue Adventure' : 'Start Adventure') + '</button>' +
      '<button class="btn" data-act="endless" ' + (endless ? '' : 'disabled title="Beat 2-8 to unlock"') + '>' + (endless ? '♾ Endless Pond' : '🔒 Endless Pond (beat 2-8)') + '</button>' +
      (S.rumbleUnlocked() ? '<button class="btn" data-act="rumble">👑 Boss Rumble</button>' : '') +
      '<div class="row"><button class="btn" data-act="guide">📖 Field Guide</button><button class="btn rel" data-act="trophies">🏆 Trophies' + trophyBadge() + '</button><button class="btn" data-act="settings">⚙ Settings</button></div>' +
      '</div>' + coinsHtml() +
      '<div class="title-foot">v' + D.VERSION + ' · Progress saves automatically on this browser' + (S.storageOk ? '' : ' (storage blocked: progress won\'t be kept)') + '</div>';
    UI.whatsNew();
  };
  UI.whatsNew = function () {
    const d = S.data;
    const veteran = Object.keys(d.cleared).length > 0;
    if (!veteran || d.seenV11) { d.seenV11 = true; S.save(); return; }
    d.seenV11 = true;
    const got = d.updateNote || [];
    d.updateNote = null; S.save();
    UI.modal('<div class="burst">UPDATE 1.1!</div><h2>The Haunted Kennel</h2>' +
      (got.length ? '<p><b>You already beat the levels that now award these new ducks — they\'re yours:</b></p><div class="row">' + got.map(id => '<div class="mini-duck">' + portrait('duck:' + id) + '<small>' + D.DUCKS[id].name + '</small></div>').join('') + '</div>' : '') +
      '<ul class="news"><li>🦆 10 new ducks (34 in all)</li><li>🏚 World 6: the Haunted Kennel — bone piles, portals, spooky pups and Count Barkula</li><li>🥐 Chef Brioche\'s Snack Bar (after 4-2) and ⭐ the Starlight Observatory (after 5-2)</li><li>🏆 Trophy Shelf, 👑 Boss Rumble, and Endless arenas</li></ul>' +
      '<button class="btn primary" data-act="closemodal">Let\'s go!</button>');
  };

  /* ------------------------------------------------------------ MAP */
  const NODE_POS = [[9, 74], [21, 50], [33, 72], [45, 46], [57, 70], [69, 44], [81, 66], [91, 36]];
  UI.map = function (world) {
    B.cleanup();
    if (world) UI.world = world;
    else UI.world = S.data.lastWorld || 1;
    if (!S.worldUnlocked(UI.world)) UI.world = 1;
    S.data.lastWorld = UI.world; S.checkTrophies(); S.save();
    UI.show('map');
    const W = D.WORLDS[UI.world - 1];
    G.diorama(UI.world, { ducks: worldDucks(UI.world), dogs: worldDogs(UI.world), lookY: 1.6 });
    A.music(W.music);
    const tabs = D.WORLDS.map(w => {
      const un = S.worldUnlocked(w.id);
      return '<button class="wtab ' + (w.id === UI.world ? 'on' : '') + '" data-act="world" data-w="' + w.id + '" ' + (un ? '' : 'disabled') + '>' + (un ? '' : '🔒 ') + w.id + '. ' + w.name + '</button>';
    }).join('');
    const lvls = D.worldLevels(UI.world);
    const main = lvls.filter(l => !l.bonus);
    const bonus = lvls.find(l => l.bonus);
    let path = '';
    NODE_POS.forEach((p, i) => { path += (i ? ' L ' : 'M ') + p[0] + ' ' + p[1]; });
    let nodes = '';
    main.forEach((l, i) => {
      const p = NODE_POS[i];
      const un = S.isUnlocked(l.id), cl = S.isCleared(l.id);
      const rec = S.data.cleared[l.id];
      const objDone = rec ? (rec.obj || []).filter(Boolean).length : 0;
      const rw = rewardBadge(l, cl);
      nodes += '<button class="node ' + (l.boss ? 'boss ' : '') + (cl ? 'cleared ' : '') + (un ? '' : 'locked ') + (un && !cl ? 'next' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%" data-act="level" data-id="' + l.id + '" ' + (un ? '' : 'disabled') + '>' +
        (l.boss ? portrait('boss:' + l.boss, 'node-boss') : '<span class="node-num">' + l.n + '</span>') +
        (cl ? '<span class="node-check">✓</span>' : '') +
        '<span class="node-stars">' + l.obj.map((o, k) => '<i class="' + (rec && rec.obj && rec.obj[k] ? 'on' : '') + '"></i>').join('') + '</span>' +
        (l.mode !== 'normal' && !l.boss ? '<span class="node-mode">' + modeLabel(l) + '</span>' : '') +
        rw + '</button>';
    });
    if (bonus) {
      const un = S.isUnlocked(bonus.id), cl = S.isCleared(bonus.id);
      nodes += '<button class="node bonus ' + (cl ? 'cleared ' : '') + (un ? '' : 'locked') + '" style="left:50%;top:13%" data-act="level" data-id="' + bonus.id + '" ' + (un ? '' : 'disabled') + ' title="' + (un ? '' : 'Clear ' + bonus.after + ' to unlock') + '">' +
        '<span class="node-num">★</span>' + (cl ? '<span class="node-check">✓</span>' : '') + '<span class="node-mode">' + (un ? 'BONUS' : '🔒 ' + bonus.after) + '</span>' + rewardBadge(bonus, cl) + '</button>';
    }
    // next duck teaser
    const nextDuckLv = D.LEVELS.find(l => l.reward && l.reward.duck && !S.isCleared(l.id) && !S.owns(l.reward.duck));
    const teaser = nextDuckLv ? '<div class="teaser">' + portrait('duck:' + nextDuckLv.reward.duck, 'teaser-pt silhouette') + '<div><small>NEXT NEW DUCK</small><b>' + D.DUCKS[nextDuckLv.reward.duck].name + '</b><span>Clear ' + (nextDuckLv.bonus ? nextDuckLv.name.replace('Bonus: ', '') : nextDuckLv.id) + '</span></div></div>' : '';
    const shops = D.SHOP_ORDER.map(id => {
      const sh = D.SHOPS[id];
      const un = S.shopUnlocked(id);
      const isNew = un && !S.data.shopsSeen[id];
      const deal = un && hasAffordable(id);
      return '<button class="shopbtn ' + (un ? '' : 'locked') + '" data-act="shop" data-shop="' + id + '" ' + (un ? '' : 'disabled') + ' style="--c:' + sh.color + '">' +
        (un ? portrait('keeper:' + id, 'shop-pt') : '<span class="shop-lock">🔒</span>') +
        '<span><b>' + (un ? sh.name : '???') + '</b><small>' + (un ? sh.tag : 'Opens after level ' + sh.unlock) + '</small></span>' +
        (isNew ? '<em class="badge new">NEW!</em>' : deal ? '<em class="badge">!</em>' : '') + '</button>';
    }).join('');
    $('screen-map').innerHTML =
      '<div class="topbar"><button class="btn small" data-act="title">⟵ Title</button><div class="map-title"><b>' + W.name + '</b><small>' + W.sub + '</small></div>' + coinsHtml() + '</div>' +
      '<div class="wtabs">' + tabs + '</div>' +
      '<div class="mapboard"><svg class="mappath" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="' + path + '"/></svg>' + nodes + '</div>' +
      '<div class="map-side">' + teaser +
      '<div class="shops">' + shops + '</div>' +
      '<div class="row"><button class="btn small" data-act="guide">📖 Guide</button><button class="btn small rel" data-act="trophies">🏆' + trophyBadge() + '</button>' +
      (S.endlessUnlocked() ? '<button class="btn small" data-act="endless">♾ Endless</button>' : '') +
      (S.rumbleUnlocked() ? '<button class="btn small" data-act="rumble">👑 Rumble</button>' : '') +
      '<button class="btn small" data-act="settings">⚙</button></div></div>';
  };
  function worldDucks(w) { const pool = [['puddle', 'bread', 'reed'], ['lantern', 'zappy', 'puddle'], ['raft', 'drum', 'boomer'], ['cocoa', 'shiny', 'syrup'], ['hammer', 'twisty', 'squeak'], ['spade', 'decoy', 'sizzle']][w - 1]; return pool.filter(id => S.owns(id)).concat(['puddle']).slice(0, 3); }
  function worldDogs(w) { return [['mutt', 'pogo'], ['sneaky', 'digger'], ['snorkel', 'skater'], ['husky', 'samoyed'], ['knight', 'catapult'], ['phantom', 'werewoof']][w - 1]; }
  function modeLabel(l) { return { budget: 'BUDGET', protect: 'PROTECT', rush: 'TIMED', offered: 'OFFERED', belt: 'BELT', whack: 'BONK!' }[l.mode] || ''; }
  function rewardBadge(l, cleared) {
    const r = l.reward || {};
    if (r.duck) return '<span class="node-reward ' + (cleared ? 'got' : '') + '" title="Reward: ' + D.DUCKS[r.duck].name + '">' + portrait('duck:' + r.duck, 'rw-pt') + '</span>';
    if (r.shop) return '<span class="node-reward shop ' + (cleared ? 'got' : '') + '" title="Opens ' + D.SHOPS[r.shop].name + '">🏪</span>';
    return '';
  }
  function hasAffordable(shop) {
    return D.ITEMS.some(it => it.shop === shop && it.type !== 'snack' && itemState(it).state === 'buy' && wallet(it) >= it.price) ||
      (shop === 'workshop' && Object.keys(D.UPGRADES).some(id => S.owns(id) && !S.upgrade(id) && S.data.coins >= D.UPGRADES[id].price && S.isCleared(D.UPGRADE_REQ)));
  }

  /* ------------------------------------------------------------ LOADOUT */
  UI.openLevel = function (id) {
    const lv = id === 'endless' ? UI.endlessLevel(S.data.endless.arena || 1) : id === 'rumble' ? D.RUMBLE : D.LEVEL[id];
    UI.lv = lv;
    UI.replaceIdx = null; UI.pendingAdd = null;
    const cap = S.capacity();
    let team = (S.data.loadout || []).filter(d => S.owns(d));
    if (!team.length) team = S.data.owned.slice(0, cap);
    team = team.slice(0, cap);
    UI.team = team;
    UI.info = team[0] || 'puddle';
    UI.loadout();
  };
  UI.endlessLevel = function (arena) {
    const ar = D.ARENAS.find(a => a.w === arena && S.worldUnlocked(a.w)) || D.ARENAS[0];
    return { id: 'endless', arena: ar.w, w: ar.w, n: '∞', name: 'Endless Pond — ' + ar.name, mode: 'endless', lanes: [0, 1, 2, 3, 4], env: JSON.parse(JSON.stringify(ar.env)), start: 150, sky: true, obj: [], pool: { mutt: 1, helmet: 1, runner: 1, pogo: 1, door: 1, digger: 1, nurse: 1, skater: 1, tennis: 1, knight: 1, husky: 1, catapult: 1, bulldozer: 1 }, story: 'Waves never stop, and every 5th one is a huge pack. How long can your pond hold out?', rules: ['Endless waves that grow stronger.', 'Your normal loadout capacity applies.', 'Earn 10 coins per wave survived.'] };
  };
  function fixedTeam(lv) {
    if (lv.forced) return lv.forced;
    if (lv.mode === 'offered') return lv.offered.slice(0, Math.min(D.MAX_SLOTS, S.capacity()));
    if (lv.mode === 'belt') return lv.belt.slice(0, Math.min(D.MAX_SLOTS, S.capacity()));
    return null;
  }
  function snackHtml(lv) {
    if (!S.shopUnlocked('snack') && !D.SNACK_ORDER.some(id => S.data.snacks[id] > 0)) return '';
    const slots = S.snackSlots();
    const sel = S.data.snackSel.filter(id => (S.data.snacks[id] || 0) > 0);
    const chips = D.SNACK_ORDER.map(id => {
      const n = S.data.snacks[id] || 0, on = sel.indexOf(id) >= 0;
      return '<button class="snack ' + (on ? 'on' : '') + '" data-act="snack" data-id="' + id + '" ' + (n ? '' : 'disabled') + ' title="' + esc(D.SNACKS[id].desc) + '"><span>' + D.SNACKS[id].icon + '</span><small>' + D.SNACKS[id].name + '</small><b>×' + n + '</b></button>';
    }).join('');
    return '<div class="snackbar"><div class="sel-head"><b class="small-head">Snacks ' + sel.length + '/' + slots + '</b><small>One-level boosts from Chef Brioche. Separate from your duck slots.</small></div><div class="snacks">' + chips + '</div></div>';
  }
  function forecastHtml(lv) {
    if (!S.hasItem('compass') || lv.boss || lv.rumble || lv.id === 'endless' || !lv.waves) return '';
    const waves = B.genWaves(lv), tot = {};
    waves.forEach(w => w.dogs.forEach(d => tot[d] = (tot[d] || 0) + 1));
    return '<h4>🧭 Wave forecast (' + waves.length + ' waves)</h4><div class="forecast">' + Object.keys(tot).map(k => '<span>' + portrait('dog:' + k, 'fc-pt') + '×' + tot[k] + '</span>').join('') + '</div>';
  }
  function arenaHtml(lv) {
    if (lv.id !== 'endless') return '';
    return '<h4>Arena</h4><div class="row arena">' + D.ARENAS.map(a => { const un = S.worldUnlocked(a.w); return '<button class="btn small ' + (lv.arena === a.w ? 'primary' : '') + '" data-act="arena" data-w="' + a.w + '" ' + (un ? '' : 'disabled') + '>' + (un ? '' : '🔒 ') + a.name + (S.data.endless.byArena[a.w] ? ' · ' + S.data.endless.byArena[a.w] : '') + '</button>'; }).join('') + '</div>';
  }
  UI.loadout = function () {
    const lv = UI.lv;
    UI.show('loadout');
    G.diorama(lv.w || 1, { ducks: (fixedTeam(lv) || UI.team).slice(0, 3), dogs: dogsOf(lv).slice(0, 2), lookY: 2.6 });
    const cap = S.capacity();
    const fixed = fixedTeam(lv);
    const team = fixed || UI.team;
    // slots
    let slots = '';
    for (let i = 0; i < D.MAX_SLOTS; i++) {
      if (i >= cap) {
        const how = i === 5 ? 'Bigger Team Bag · Duck Cart' : i === 6 ? 'Team Satchel · Workshop' : 'Grand Team Trunk · Workshop';
        slots += '<div class="slot locked" title="Locked: buy ' + how + '"><span>🔒</span><small>' + how + '</small></div>';
      } else if (team[i]) {
        slots += '<button class="slot filled ' + (UI.replaceIdx != null ? 'replace' : '') + (fixed ? ' fixed' : '') + '" data-act="slot" data-i="' + i + '">' + portrait('duck:' + team[i]) + '<b>' + D.DUCKS[team[i]].name + '</b>' + (fixed ? '' : '<i class="x">✕</i>') + '</button>';
      } else slots += '<div class="slot empty"><span>+</span></div>';
    }
    // collection
    let coll = '';
    D.DUCK_ORDER.forEach(id => {
      const own = S.owns(id);
      const inTeam = team.indexOf(id) >= 0;
      const isNew = S.data.newDucks[id];
      coll += '<button class="cc ' + (own ? '' : 'locked ') + (inTeam ? 'in ' : '') + (UI.info === id ? 'focus ' : '') + (UI.pendingAdd === id ? 'pending' : '') + '" data-act="coll" data-id="' + id + '" title="' + (own ? D.DUCKS[id].name : 'Locked — ' + duckSourceText(id)) + '">' +
        portrait('duck:' + id, own ? 'pt' : 'pt silhouette') + '<span class="cc-cost">' + (own ? D.DUCKS[id].cost : '?') + '</span>' +
        (isNew && own ? '<em class="badge new">NEW</em>' : '') + (own ? '' : '<span class="cc-lock">🔒</span>') + '</button>';
    });
    const info = duckInfoHtml(UI.info);
    const warns = fixed ? [] : teamWarnings(lv, team);
    const rules = lv.rules ? '<div class="rules"><b>⚠ Special rules</b><ul>' + lv.rules.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul></div>' : '';
    const fixedNote = fixed ? '<div class="fixed-note">' + (lv.forced ? 'Training level: your team is chosen for you.' : lv.mode === 'offered' ? 'Offered team: these ducks are lent to you for this level (' + team.length + ' of your ' + cap + ' slots).' : 'Supply belt: these duck types arrive on the belt (limited to your ' + cap + '-slot capacity). Your normal loadout is not used.') + '</div>' : '';
    const rec = S.data.cleared[lv.id];
    const objs = (lv.obj || []).map((o, k) => '<li class="' + (rec && rec.obj && rec.obj[k] ? 'done' : '') + '">' + (rec && rec.obj && rec.obj[k] ? '★' : '☆') + ' ' + esc(D.objText(o)) + ' <small>+' + D.OBJ_COINS + '</small></li>').join('');
    const rw = lv.reward || {};
    const firstClear = rec && rec.clears ? 'Replay reward: ' + replayCoins(lv) + ' coins' :
      'First victory: ' + ((lv.coins || 0) + (rw.coins || 0)) + ' coins' + (rw.duck ? ' + <b>' + D.DUCKS[rw.duck].name + '</b>' : '') + (rw.shop ? ' + opens <b>' + D.SHOPS[rw.shop].name + '</b>' : '');
    $('screen-loadout').innerHTML =
      '<div class="topbar"><button class="btn small" data-act="map">⟵ Map</button><div class="map-title"><b>' + (lv.bonus ? '' : lv.id === 'endless' ? '' : lv.id + ' · ') + esc(lv.name) + '</b><small>Team Huddle</small></div>' + coinsHtml() + '</div>' +
      '<div class="lo-grid">' +
      '<section class="panel lo-left"><p class="story">' + esc(lv.story || '') + '</p>' + rules +
      '<h4>Dogs spotted</h4><div class="dogprev">' + enemyPreview(lv) + '</div>' +
      (objs ? '<h4>Bonus objectives</h4><ul class="objs">' + objs + '</ul>' : '') +
      forecastHtml(lv) + arenaHtml(lv) +
      (lv.id !== 'endless' ? '<p class="firstclear">' + firstClear + '</p>' : '<p class="firstclear">Best: wave ' + S.data.endless.best + ' overall' + (S.data.endless.byArena[lv.arena] ? ' · ' + S.data.endless.byArena[lv.arena] + ' here' : '') + '</p>') + '</section>' +
      '<section class="panel lo-mid"><div class="sel-head"><b>Selected ' + team.length + '/' + cap + '</b><small>' + (cap < D.MAX_SLOTS ? 'Loadout capacity ' + cap + ' (max ' + D.MAX_SLOTS + ')' : 'Maximum capacity reached') + '</small></div>' +
      '<div class="slots">' + slots + '</div>' + fixedNote +
      (UI.replaceIdx === 'pick' ? '<div class="hint">Team full — click a team slot to swap in <b>' + D.DUCKS[UI.pendingAdd].name + '</b>, or click it again to cancel.</div>' : '') +
      '<div class="coll">' + coll + '</div>' +
      (warns.length ? '<div class="warns">' + warns.map(w => '<div>⚠ ' + w + '</div>').join('') + '</div>' : '') + snackHtml(lv) +
      '<div class="lo-actions">' + (fixed ? '' : '<button class="btn small" data-act="clearteam">Clear</button>') + '<button class="btn big primary" data-act="startbattle" ' + (team.length ? '' : 'disabled') + '>Defend the Pond! ▶</button></div></section>' +
      '<section class="panel lo-right">' + info + '</section></div>';
  };
  function replayCoins(lv) { return lv.rumble ? 200 : 25 + (lv.w || 1) * 5; }
  function dogsOf(lv) {
    if (lv.boss) return Object.keys(lv.pool);
    const set = Object.keys(lv.pool || {});
    if (lv.newDog && set.indexOf(lv.newDog) < 0) set.push(lv.newDog);
    return set;
  }
  function enemyPreview(lv) {
    let html = '';
    if (lv.rumble) return lv.rumble.map(id => '<div class="dp boss" title="' + esc(D.BOSSES[id].desc) + '">' + portrait('boss:' + id) + '<b>' + D.BOSSES[id].name + '</b><small>' + esc(D.BOSSES[id].title) + '</small></div>').join('');
    if (lv.boss) {
      const b = D.BOSSES[lv.boss];
      html += '<div class="dp boss" title="' + esc(b.desc) + '">' + portrait('boss:' + lv.boss) + '<b>' + b.name + '</b><small>BOSS · ' + esc(b.desc) + '</small></div>';
      const all = {};
      b.phases.forEach(p => Object.keys(p.pool).forEach(k => all[k] = 1));
      Object.keys(lv.pool).forEach(k => all[k] = 1);
      Object.keys(all).forEach(k => html += dogChip(k));
      return html;
    }
    if (lv.id === 'endless') return ['mutt', 'helmet', 'runner', 'pogo', 'door', 'digger', 'nurse', 'skater', 'knight', 'bulldozer'].concat(S.worldUnlocked(6) ? ['phantom', 'balloon'] : []).filter(k => S.data.seenDogs[k] || k === 'mutt').map(k => dogChip(k)).join('') + '<small>…and more as waves grow.</small>';
    dogsOf(lv).forEach(k => html += dogChip(k, k === lv.newDog));
    if ((lv.flags || []).length) html += dogChip('banner');
    return html;
  }
  function dogChip(k, isNew) {
    const d = D.DOGS[k];
    return '<div class="dp" title="' + esc(d.desc + ' Counter: ' + d.counter) + '">' + portrait('dog:' + k) + '<b>' + d.name + (isNew ? ' <em class="badge new">NEW</em>' : '') + '</b><small>' + esc(d.counter) + '</small></div>';
  }
  function duckInfoHtml(id) {
    const d = D.DUCKS[id];
    if (!d) return '';
    const own = S.owns(id);
    const upg = S.upgrade(id), U = D.UPGRADES[id];
    let cost = d.cost, cd = d.cd;
    if (id === 'double' && upg === 'B') cost = 175;
    if (id === 'reed' && upg === 'B') cd = 14;
    return '<div class="dinfo">' + portrait('duck:' + id, own ? 'big' : 'big silhouette') +
      '<h3>' + (own ? d.name : d.name) + '</h3><div class="role">' + d.role + '</div>' +
      '<div class="stats"><span>🍞 ' + cost + '</span><span>⏱ ' + cd + 's</span><span>❤ ' + d.hp + '</span></div>' +
      '<p>' + esc(d.desc) + '</p>' +
      (d.qp ? '<div class="qpbox"><b>🪶 Quack Power: ' + d.qp.name + '</b><span>' + esc(d.qp.desc) + '</span></div>' : '<div class="qpbox"><b>🪶 No Quack Power</b><span>It explodes on its own!</span></div>') +
      (U ? '<div class="upbox">' + (upg ? '🔧 Upgrade: <b>' + U[upg].name + '</b> — ' + esc(U[upg].desc) : '🔧 Upgrades available at the Tinkerer\'s Workshop') + '</div>' : '') +
      '<p class="tip">💡 ' + esc(d.tip) + '</p>' +
      (own ? '' : '<p class="lockinfo">🔒 ' + duckSourceText(id) + '</p>') + '</div>';
  }
  function teamWarnings(lv, team) {
    const w = [];
    const kinds = team.map(id => D.DUCKS[id].kind);
    const has = id => team.indexOf(id) >= 0;
    const dogs = lv.boss ? Object.keys(Object.assign({}, lv.pool, ...D.BOSSES[lv.boss].phases.map(p => p.pool))) : dogsOf(lv);
    const env = lv.env || {};
    if (lv.mode !== 'budget' && !has('bread') && !has('sour')) w.push('No crumb producer — you\'ll rely on falling crumbs only.');
    if (lv.mode === 'budget' && (has('bread') || has('sour'))) w.push('Producers don\'t bake in this level — that slot may be wasted.');
    if (!kinds.some(k => D.ATTACK_KINDS[k] && k !== 'mine' && k !== 'spikes' && k !== 'bomb')) w.push('No steady damage dealer! Traps alone rarely hold.');
    if (env.water && !has('raft')) w.push('Water tiles ahead: bring a Lily Raft to build on them.');
    if ((dogs.indexOf('sneaky') >= 0) && !has('lantern') && !has('thistle') && !has('snap')) w.push('Sneaky Spaniels ahead — a Lantern Loon reveals them.');
    if (dogs.indexOf('door') >= 0 && !has('lob') && !has('storm') && !has('longbill') && !has('magnet') && !has('cocoa')) w.push('Screen-Door Shepherds block straight shots — lobbers, Longbill or Magnet help.');
    if (env.blizzard && !has('cocoa') && S.owns('cocoa')) w.push('Blizzards will freeze your front ducks — Cocoa Coot keeps them warm.');
    if (dogs.indexOf('snorkel') >= 0 && !has('lob') && !has('storm') && !has('zappy') && !has('cocoa') && !has('snap')) w.push('Snorkel Labs swim under shots — bring something that lobs or zaps.');
    if (dogs.indexOf('balloon') >= 0 && !has('boomer') && !has('lob') && !has('storm') && !has('zappy') && !has('longbill') && !has('cocoa')) w.push('Balloon Beagles float over straight shots — bring Boomerang, lobbers, Zappy or Longbill.');
    if ((env.graves || []).length && !has('spade') && S.owns('spade')) w.push('Bone piles block tiles and spawn dogs — Spade Scaup digs them up.');
    if (dogs.indexOf('mummy') >= 0 && kinds.every(k => k === 'shooter' || !D.ATTACK_KINDS[k])) w.push('Mummy Mastiffs shrug off water — fire, lobs or lightning work better.');
    if (dogs.indexOf('phantom') >= 0 && !has('twisty') && S.owns('twisty')) w.push('Phantom Pups float through ducks — Twisty Teal can shoot them from behind.');
    if (team.length < S.capacity() && S.data.owned.length > team.length) w.push('You have ' + (S.capacity() - team.length) + ' empty slot(s).');
    return w;
  }

  /* ------------------------------------------------------------ BATTLE */
  UI.startBattle = function () {
    const lv = UI.lv;
    const fixed = fixedTeam(lv);
    if (!fixed) { S.data.loadout = UI.team.slice(0, S.capacity()); }
    UI.team.forEach(id => { delete S.data.newDucks[id]; });
    S.save();
    UI.lastTeam = fixed || UI.team.slice();
    const snacks = S.data.snackSel.filter(id => (S.data.snacks[id] || 0) > 0).slice(0, S.snackSlots());
    snacks.forEach(id => { S.data.snacks[id]--; });
    S.data.life.snacks += snacks.length;
    S.data.snackSel = snacks.filter(id => S.data.snacks[id] > 0);
    S.save();
    UI.show('battle');
    B.start(lv, UI.lastTeam, { snacks });
    if (snacks.length) B.toast('Snacks: ' + snacks.map(id => D.SNACKS[id].icon + ' ' + D.SNACKS[id].name).join(', '));
  };

  UI.pause = function (on) {
    if (!B.active || B.over) return;
    B.paused = on;
    $('pause').classList.toggle('hidden', !on);
    if (on) {
      const s = S.data.settings;
      $('pause').innerHTML = '<div class="modal-card pausecard"><h2>Paused</h2>' +
        '<button class="btn big primary" data-act="resume">Resume</button>' +
        '<button class="btn" data-act="restart">↻ Restart level</button>' +
        settingsHtml(true) +
        (B.tut ? '<button class="btn small" data-act="skiptut">Skip tutorial tips</button>' : '') +
        '<button class="btn" data-act="quit">⟵ Quit to map</button></div>';
    }
  };

  UI.battleEnd = function (res) {
    const lv = res.level;
    B.hud.hide();
    let html = '';
    const life = S.data.life;
    life.kills += res.stats.kills; life.qp += res.stats.qp; life.bonks += res.stats.bonks || 0;
    if (res.win) {
      life.wins++;
      const fixed = fixedTeam(lv);
      if (lv.mode === 'normal' && !fixed && UI.lastTeam.length <= 3) life.small = true;
      if (lv.mode === 'normal' && !fixed && !UI.lastTeam.some(id => D.DUCKS[id].kind === 'producer' || D.DUCKS[id].kind === 'grower')) life.nobread = true;
      if ((lv.boss || lv.rumble) && res.stats.goose === 0) life.nogooseboss = true;
    }
    if (lv.mode === 'endless') {
      const wave = res.wave || 0;
      const earned = Math.max(0, wave - 1) * 10 + res.stats.coins;
      const best = wave > S.data.endless.best;
      if (best) S.data.endless.best = wave;
      const ba = S.data.endless.byArena; if (wave > (ba[lv.arena] || 0)) ba[lv.arena] = wave;
      S.data.endless.runs++;
      S.addCoins(earned);
      S.save();
      html = '<h1 class="res-title bad">The pond fell!</h1><p class="res-sub">You held out until <b>wave ' + wave + '</b>' + (best ? ' — <b>NEW RECORD!</b>' : '') + '</p>' +
        '<div class="res-coins">+' + earned + ' coins</div>' + trophyNote() +
        '<div class="row"><button class="btn primary" data-act="retry">Try again</button><button class="btn" data-act="changeteam">Change team</button><button class="btn" data-act="map">Map</button></div>';
      UI.show('result');
      $('screen-result').innerHTML = '<div class="modal-card result">' + html + '</div>';
      return;
    }
    if (res.win) {
      const rec = S.data.cleared[lv.id] || { clears: 0, obj: [] };
      const first = !rec.clears;
      rec.clears++;
      const lines = [];
      let total = 0;
      if (first) { const c = (lv.coins || 0) + ((lv.reward && lv.reward.coins) || 0); lines.push([lv.rumble ? 'Boss Rumble champion' : 'First victory', c]); total += c; }
      else { const c = replayCoins(lv); lines.push(['Replay victory', c]); total += c; }
      const objRes = (lv.obj || []).map((o, k) => {
        const ok = objOk(o, res.stats);
        const newly = ok && !(rec.obj && rec.obj[k]);
        if (newly) { lines.push(['★ ' + D.objText(o), D.OBJ_COINS]); total += D.OBJ_COINS; }
        rec.obj = rec.obj || []; rec.obj[k] = rec.obj[k] || ok;
        return { o, ok, newly };
      });
      if (res.stats.coins) { lines.push(['Coins picked up', res.stats.coins]); total += res.stats.coins; }
      S.data.cleared[lv.id] = rec;
      S.addCoins(total);
      UI.queue = [];
      if (first && lv.reward) {
        if (lv.reward.duck && S.grantDuck(lv.reward.duck)) UI.queue.push({ type: 'duck', id: lv.reward.duck });
        if (lv.reward.shop) UI.queue.push({ type: 'shop', id: lv.reward.shop });
        if (lv.reward.unlock) UI.queue.push({ type: 'unlock', id: lv.reward.unlock });
      }
      if (first && lv.id === '2-8') UI.queue.push({ type: 'endless' });
      if (first && lv.id === '6-8') { S.data.finished = true; UI.queue.push({ type: 'finale' }); UI.queue.push({ type: 'note', title: 'Boss Rumble unlocked!', text: 'Every boss, back to back, at half strength. Find it on the map and title screen.', icon: 'boss:barkula' }); }
      if (first && lv.boss && lv.w < 6) UI.queue.push({ type: 'world', w: lv.w + 1 });
      if (first && lv.id === '5-8') UI.queue.push({ type: 'note', title: 'A spooky howl…', text: 'The Mech is scrap — but something is howling up on Haunted Kennel hill. A sixth world has appeared!', icon: 'boss:barkula' });
      // slot availability notes
      if (first && lv.id === '1-8') UI.queue.push({ type: 'note', title: 'A bigger team bag!', text: 'Marigold at the Traveling Duck Cart now sells the Bigger Team Bag: 6 duck types per level!', icon: 'keeper:cart' });
      if (first && lv.id === '2-8') UI.queue.push({ type: 'note', title: 'Seventh slot available', text: 'Professor Gearbill can now build the Expanded Team Satchel: 7 duck types per level!', icon: 'keeper:workshop' });
      if (first && lv.id === '4-4') UI.queue.push({ type: 'note', title: 'The Grand Team Trunk', text: 'The Workshop can now build the final loadout expansion: 8 duck types — the maximum!', icon: 'keeper:workshop' });
      S.save();
      const idx = D.CAMPAIGN.indexOf(lv.id);
      UI.nextId = !lv.bonus && idx >= 0 && idx < D.CAMPAIGN.length - 1 ? D.CAMPAIGN[idx + 1] : null;
      html = '<h1 class="res-title">POND SAVED!</h1><p class="res-sub">' + esc(lv.bonus || lv.rumble ? lv.name : lv.id + ' · ' + lv.name) + (first ? ' — first victory!' : '') + '</p>' +
        '<ul class="res-lines">' + lines.map(l => '<li><span>' + esc(l[0]) + '</span><b>+' + l[1] + '</b></li>').join('') + '</ul>' +
        '<div class="res-coins">+' + total + ' coins <small>(' + S.data.coins.toLocaleString() + ' total)</small></div>' +
        trophyNote() + (objRes.length ? '<ul class="objs res">' + objRes.map(r => '<li class="' + (r.ok ? 'done' : '') + '">' + (r.ok ? '★' : '☆') + ' ' + esc(D.objText(r.o)) + '</li>').join('') + '</ul>' : '') +
        (UI.queue.some(q => q.type === 'duck') ? '<div class="res-newduck">' + portrait('duck:' + UI.queue.find(q => q.type === 'duck').id, 'silhouette') + '<b>A new duck wants to join your flock!</b></div>' : '') +
        '<div class="row">' + (UI.queue.length ? '<button class="btn big primary" data-act="nextqueue">Continue ▶</button>' : (UI.nextId && S.isUnlocked(UI.nextId) ? '<button class="btn big primary" data-act="nextlevel">Next level ▶</button>' : '') + '<button class="btn" data-act="map">Map</button>') + '</div>';
    } else {
      if (res.stats.coins) S.addCoins(res.stats.coins);
      S.save();
      html = '<h1 class="res-title bad">THE DOGS GOT THROUGH!</h1><p class="res-sub">' + esc(res.reason || '') + '</p>' +
        '<div class="tips"><b>Coach Quackers says:</b><p>' + esc(defeatTip(lv)) + '</p></div>' +
        (res.stats.coins ? '<p>You keep the ' + res.stats.coins + ' coins you picked up.</p>' : '') +
        '<div class="row"><button class="btn big primary" data-act="retry">↻ Try again</button><button class="btn" data-act="changeteam">Change team</button><button class="btn" data-act="map">Map</button></div>';
    }
    UI.show('result');
    $('screen-result').innerHTML = '<div class="modal-card result">' + html + '</div>';
  };
  function trophyNote() {
    const got = S.checkTrophies();
    S.save();
    if (!got.length) return '';
    return '<div class="trophy-note">🏆 New trophy' + (got.length > 1 ? 'ies' : '') + ': <b>' + got.map(t => esc(t.name)).join(', ') + '</b><br><small>Claim the coin reward on the Trophy Shelf.</small></div>';
  }
  function objOk(o, st) {
    if (o === 'noGoose') return st.goose === 0;
    if (o === 'keepAll') return st.lost === 0;
    if (o === 'noQP') return st.qp === 0;
    if (o === 'noShovel') return st.shovel === 0;
    if (o.startsWith('max')) return st.maxDucks <= +o.slice(3);
    return false;
  }
  function defeatTip(lv) {
    const tips = [];
    const dogs = lv.boss ? [] : dogsOf(lv);
    if (dogs.indexOf('runner') >= 0) tips.push('Zoomie Whippets are fast — Frostbill slows them and Gusty Goldeneye pushes them back.');
    if (dogs.indexOf('pogo') >= 0) tips.push('Pogo Poodles jump the first duck. Keep a second duck behind your wall.');
    if (dogs.indexOf('door') >= 0) tips.push('Screen doors stop straight shots. Lob Mallard throws over them.');
    if (dogs.indexOf('sneaky') >= 0) tips.push('Can\'t hit the Spaniels? Light them up with a Lantern Loon.');
    if (dogs.indexOf('digger') >= 0) tips.push('Diggers pop up near the pond. Keep shooters in the back columns, or plant Thistle Teal.');
    if ((lv.env || {}).blizzard) tips.push('Place Cocoa Coots near your front line so blizzards can\'t freeze them.');
    if (lv.boss || lv.rumble) tips.push('Watch the red tiles: move or wall off the lane before the attack lands. Cheap Reed Guards soak rolling barrels.');
    if (dogs.indexOf('balloon') >= 0) tips.push('Pop Balloon Beagles with Boomerang Bufflehead, lobbers or Zappy Drake.');
    if (dogs.indexOf('phantom') >= 0) tips.push('Phantom Pups float through ducks. Stack damage, or put a Twisty Teal near the pond.');
    if ((lv.env || {}).graves) tips.push('Dig up bone piles with Spade Scaup before the big waves.');
    if (lv.mode === 'whack') tips.push('Click dogs to BONK them — and keep collecting crumbs between bonks!');
    tips.push('Plant 3–5 Breadwinners early: more crumbs means more ducks later.');
    tips.push('Use Quack Power when a big pack bunches up, not before.');
    return tips[Math.floor(Math.random() * Math.min(tips.length, 3))];
  }

  UI.nextQueue = function () {
    const q = UI.queue.shift();
    if (!q) { UI.afterQueue(); return; }
    if (q.type === 'duck') return UI.reveal(q.id);
    if (q.type === 'shop') {
      const sh = D.SHOPS[q.id];
      UI.show('result');
      $('screen-result').innerHTML = '<div class="modal-card result shopopen" style="--c:' + sh.color + '"><div class="burst">NEW SHOP OPEN!</div>' + portrait('keeper:' + q.id, 'keeper-big') +
        '<h2>' + sh.name + '</h2><p>' + esc(sh.keeper) + ' has set up shop on the map.</p><p class="tag">' + esc(sh.tag) + '</p>' +
        '<div class="row"><button class="btn big primary" data-act="shop" data-shop="' + q.id + '">Visit now</button><button class="btn" data-act="nextqueue">Later</button></div></div>';
      A.play('reveal');
      return;
    }
    if (q.type === 'unlock') {
      const it = D.ITEMS.find(i => i.id === q.id);
      UI.show('result');
      $('screen-result').innerHTML = '<div class="modal-card result"><div class="burst">CHALLENGE REWARD!</div><div class="bigicon">' + (ICON[q.id] || '🎁') + '</div><h2>' + esc(it.title) + '</h2><p>Now available at the Curious Egg Emporium.</p><div class="row"><button class="btn big primary" data-act="nextqueue">Continue ▶</button></div></div>';
      A.play('buy');
      return;
    }
    if (q.type === 'world') {
      const w = D.WORLDS[q.w - 1];
      UI.show('result');
      $('screen-result').innerHTML = '<div class="modal-card result"><div class="burst">NEW WORLD!</div><h2>' + q.w + '. ' + w.name + '</h2><p>' + w.sub + '</p><div class="row"><button class="btn big primary" data-act="nextqueue">Onward ▶</button></div></div>';
      UI.world = q.w; S.data.lastWorld = q.w; S.save();
      A.play('reveal');
      return;
    }
    if (q.type === 'endless') {
      UI.show('result');
      $('screen-result').innerHTML = '<div class="modal-card result"><div class="burst">UNLOCKED!</div><div class="bigicon">♾</div><h2>Endless Pond</h2><p>Survive wave after wave with your best loadout. Your record is saved, and every wave earns coins.</p><div class="row"><button class="btn big primary" data-act="nextqueue">Continue ▶</button></div></div>';
      return;
    }
    if (q.type === 'note') {
      UI.show('result');
      $('screen-result').innerHTML = '<div class="modal-card result">' + portrait(q.icon, 'keeper-big') + '<h2>' + esc(q.title) + '</h2><p>' + esc(q.text) + '</p><div class="row"><button class="btn big primary" data-act="nextqueue">Continue ▶</button></div></div>';
      return;
    }
    if (q.type === 'finale') {
      UI.show('result');
      G.diorama(1, { ducks: ['puddle', 'hammer', 'storm', 'frost'], dogs: ['chihuahua'] });
      $('screen-result').innerHTML = '<div class="modal-card result"><div class="burst">THE END?</div><h2>The pond is safe!</h2><p>Count Barkula has flapped off into the night, the Mech is scrap, and the dogs have agreed to a picnic truce (they still want the bread).</p><p>Thank you for playing Ducks vs. Dogs 2! Boss Rumble, Endless arenas, bonus challenges and the Trophy Shelf are waiting.</p><div class="row"><button class="btn big primary" data-act="nextqueue">Continue ▶</button></div></div>';
      A.play('win');
      return;
    }
    UI.nextQueue();
  };
  UI.afterQueue = function () {
    UI.map(UI.world);
  };

  UI.reveal = function (id) {
    const d = D.DUCKS[id];
    UI.show('reveal');
    G.revealStage(id);
    A.play('reveal');
    setTimeout(() => A.play('quack', 1.1), 600);
    $('screen-reveal').innerHTML = '<div class="reveal-card"><div class="burst">NEW DUCK!</div><h1>' + d.name + '</h1><div class="role">' + d.role + '</div>' +
      '<div class="stats"><span>🍞 ' + d.cost + ' crumbs</span><span>⏱ ' + d.cd + 's cooldown</span><span>❤ ' + d.hp + '</span></div>' +
      '<p>' + esc(d.desc) + '</p>' +
      (d.qp ? '<div class="qpbox"><b>🪶 Quack Power: ' + d.qp.name + '</b><span>' + esc(d.qp.desc) + '</span></div>' : '') +
      '<p class="tip">💡 ' + esc(d.tip) + '</p><p class="funny">“' + esc(d.funny) + '”</p>' +
      '<p class="joined">Added to your collection — try it in your next loadout!</p>' +
      '<button class="btn big primary" data-act="nextqueue">Awesome! ▶</button></div>';
  };

  /* ------------------------------------------------------------ SHOPS */
  function itemState(it) {
    if (it.type === 'snack') {
      if (!S.isCleared(it.req)) return { state: 'locked', why: 'Clear level ' + it.req };
      return (S.data.snacks[it.snack] || 0) >= D.SNACK_MAX ? { state: 'full' } : { state: 'buy' };
    }
    if (S.hasItem(it.id) || (it.type === 'duck' && S.owns(it.duck))) return { state: 'owned' };
    if (!S.isCleared(it.req)) return { state: 'locked', why: 'Clear ' + (D.LEVEL[it.req] && D.LEVEL[it.req].bonus ? D.LEVEL[it.req].name.replace('Bonus: ', 'bonus “') + '”' : 'level ' + it.req) };
    if (it.needs && !S.hasItem(it.needs)) { const n = D.ITEMS.find(i => i.id === it.needs); return { state: 'locked', why: 'Buy ' + n.title + ' first' }; }
    return { state: 'buy' };
  }
  UI.itemState = itemState;
  UI.shop = function (id, intro) {
    UI.shopId = id;
    UI.show('shop');
    G.shopStage(id);
    A.music(5);
    const sh = D.SHOPS[id];
    if (!S.data.shopsSeen[id]) { UI.shopIntro = 0; S.data.shopsSeen[id] = true; S.checkTrophies(); S.save(); }
    else if (!intro) UI.shopIntro = null;
    UI.renderShop();
  };
  UI.renderShop = function () {
    const id = UI.shopId, sh = D.SHOPS[id];
    let say = UI.shopSay || sh.greet[0];
    if (UI.shopIntro != null) say = sh.intro[UI.shopIntro];
    const items = D.ITEMS.filter(it => it.shop === id).map(it => {
      const st = itemState(it);
      const icon = it.type === 'duck' ? portrait('duck:' + it.duck, 'item-pt') : it.type === 'slot' ? '<span class="item-ico slotico">🎒<b>' + it.slot + '</b></span>' : '<span class="item-ico">' + (ICON[it.id] || '🎁') + '</span>';
      const afford = wallet(it) >= it.price;
      let btn;
      const held = it.type === 'snack' ? ' <em class="held">You have ' + (S.data.snacks[it.snack] || 0) + '/' + D.SNACK_MAX + '</em>' : '';
      if (st.state === 'owned') btn = '<button class="btn small owned" disabled>Owned ✓</button>';
      else if (st.state === 'full') btn = '<button class="btn small owned" disabled>Full ✓</button>';
      else if (st.state === 'locked') btn = '<button class="btn small" disabled>🔒 ' + esc(st.why) + '</button>';
      else btn = '<button class="btn small primary" data-act="buy" data-item="' + it.id + '" ' + (afford ? '' : 'disabled') + '>' + (afford ? 'Buy' : 'Need') + ' ' + price(it) + '</button>';
      return '<div class="item ' + st.state + '">' + icon + '<div class="item-body"><b>' + esc(it.title) + '</b><p>' + esc(it.change) + '</p>' + btn + held + '</div></div>';
    }).join('');
    let extra = '';
    if (id === 'workshop') {
      const reqOk = S.isCleared(D.UPGRADE_REQ);
      extra = '<h3>Duck upgrades <small>Buy once, then pick either option — switch any time for free.</small></h3><div class="upgrades">' +
        Object.keys(D.UPGRADES).map(dk => {
          const U = D.UPGRADES[dk], own = S.owns(dk), cur = S.upgrade(dk);
          let body;
          if (!own) body = '<p class="muted">🔒 Get ' + D.DUCKS[dk].name + ' first</p>';
          else if (!cur) body = '<div class="opts">' + ['A', 'B'].map(o => '<div class="opt"><b>' + U[o].name + '</b><span>' + esc(U[o].desc) + '</span></div>').join('') + '</div>' +
            '<button class="btn small primary" data-act="buyup" data-duck="' + dk + '" ' + (S.data.coins >= U.price && reqOk ? '' : 'disabled') + '>Buy <span class="coin-ico"></span>' + U.price + '</button>';
          else body = '<div class="opts">' + ['A', 'B'].map(o => '<button class="opt pick ' + (cur === o ? 'on' : '') + '" data-act="pickup" data-duck="' + dk + '" data-opt="' + o + '"><b>' + (cur === o ? '✓ ' : '') + U[o].name + '</b><span>' + esc(U[o].desc) + '</span></button>').join('') + '</div>';
          return '<div class="upg ' + (cur ? 'owned' : '') + '">' + portrait('duck:' + dk, own ? 'item-pt' : 'item-pt silhouette') + '<div class="item-body"><b>' + D.DUCKS[dk].name + (cur ? ' <em class="ownedtag">Upgraded</em>' : '') + '</b>' + body + '</div></div>';
        }).join('') + '</div>';
    }
    if (id === 'emporium') {
      const hats = ['none'].concat(D.ITEMS.filter(it => it.hat && S.hasItem(it.id)).map(it => it.hat));
      extra = '<h3>Wardrobe <small>Cosmetic only</small></h3><div class="row wardrobe">' + hats.map(h => '<button class="btn small ' + (S.data.hat === h ? 'primary' : '') + '" data-act="hat" data-hat="' + h + '">' + D.HATS[h] + '</button>').join('') + '</div>';
    }
    $('screen-shop').innerHTML =
      '<div class="topbar"><button class="btn small" data-act="map">⟵ Map</button><div class="map-title"><b>' + sh.name + '</b><small>' + sh.keeper + '</small></div>' + coinsHtml() + '</div>' +
      '<div class="shop-wrap"><div class="speech" data-act="talk"><b>' + sh.keeper + '</b><p>' + esc(say) + '</p>' + (UI.shopIntro != null ? '<small>Click to continue ▶</small>' : '<small>(click to chat)</small>') + '</div>' +
      '<div class="panel shop-items"><div class="items">' + items + '</div>' + extra + '</div></div>';
    if (G.stage && G.stage.name === 'shop') G.stage.talk = 1.2;
  };
  UI.buy = function (itemId) {
    const it = D.ITEMS.find(i => i.id === itemId);
    if (!it || itemState(it).state !== 'buy') return;
    UI.modal('<h2>Buy ' + esc(it.title) + '?</h2><p class="change">' + esc(it.change) + '</p><p>Price: <b>' + price(it) + '</b> · You have ' + wallet(it) + (D.SHOPS[it.shop].currency === 'stars' ? ' ★' : ' coins') + '</p>' +
      '<div class="row"><button class="btn primary" data-act="confirmbuy" data-item="' + it.id + '">Buy it!</button><button class="btn" data-act="closemodal">Not now</button></div>');
  };
  UI.confirmBuy = function (itemId) {
    const it = D.ITEMS.find(i => i.id === itemId);
    UI.closeModal();
    if (!it || itemState(it).state !== 'buy' || wallet(it) < it.price) { A.play('deny'); return; }
    if (D.SHOPS[it.shop].currency === 'stars') S.data.starsSpent += it.price; else S.data.coins -= it.price;
    if (it.type === 'snack') S.data.snacks[it.snack] = (S.data.snacks[it.snack] || 0) + 1;
    else S.data.items[it.id] = true;
    S.checkTrophies();
    if (it.type === 'duck') S.grantDuck(it.duck);
    if (it.hat) S.data.hat = it.hat;
    S.save();
    A.play('buy');
    const sh = D.SHOPS[UI.shopId];
    UI.shopSay = 'Pleasure doing business! ' + sh.bye;
    if (it.type === 'duck') { UI.queue = []; UI.afterQueue = () => { UI.afterQueue = () => UI.map(UI.world); UI.shop(UI.shopId); }; UI.reveal(it.duck); return; }
    if (it.type === 'slot') UI.modal('<div class="burst">LOADOUT EXPANDED!</div><h2>Capacity: ' + S.capacity() + ' duck types</h2><p>Your Team Huddle now shows ' + S.capacity() + ' open slots' + (S.capacity() >= D.MAX_SLOTS ? ' — that\'s the maximum!' : '.') + '</p><button class="btn primary" data-act="closemodal">Great!</button>');
    UI.renderShop();
  };
  UI.buyUpgrade = function (dk) {
    const U = D.UPGRADES[dk];
    if (!U || S.upgrade(dk) || !S.owns(dk)) return;
    UI.modal('<h2>Upgrade ' + D.DUCKS[dk].name + '?</h2><p class="change">Unlocks a choice of:<br>• <b>' + U.A.name + '</b>: ' + esc(U.A.desc) + '<br>• <b>' + U.B.name + '</b>: ' + esc(U.B.desc) + '<br>Starts with ' + U.A.name + '. You can switch any time for free.</p><p>Price: <span class="coin-ico"></span><b>' + U.price + '</b> · You have ' + S.data.coins + '</p>' +
      '<div class="row"><button class="btn primary" data-act="confirmup" data-duck="' + dk + '">Upgrade!</button><button class="btn" data-act="closemodal">Not now</button></div>');
  };
  UI.confirmUpgrade = function (dk) {
    const U = D.UPGRADES[dk];
    UI.closeModal();
    if (!U || S.upgrade(dk) || S.data.coins < U.price) { A.play('deny'); return; }
    S.data.coins -= U.price;
    S.data.upgrades[dk] = 'A';
    S.save(); A.play('buy');
    UI.shopSay = 'Eureka! ' + D.DUCKS[dk].name + ' is now a little bit better. Ethically!';
    UI.renderShop();
  };

  /* ------------------------------------------------------------ GUIDE */
  UI.guide = function (tab, sel) {
    UI.guideTab = tab || UI.guideTab || 'ducks';
    UI.show('guide');
    if (!G.stage || G.stage.name !== 'diorama') G.diorama(S.data.lastWorld || 1, {});
    let list = '', detail = '';
    if (UI.guideTab === 'ducks') {
      sel = sel || UI.guideSel || 'puddle';
      if (!D.DUCKS[sel]) sel = 'puddle';
      list = D.DUCK_ORDER.map(id => { const own = S.owns(id); return '<button class="cc ' + (own ? '' : 'locked ') + (sel === id ? 'focus' : '') + '" data-act="gsel" data-id="' + id + '">' + portrait('duck:' + id, own ? 'pt' : 'pt silhouette') + '</button>'; }).join('');
      const d = D.DUCKS[sel], own = S.owns(sel);
      detail = own ? duckInfoHtml(sel) + '<p class="funny">“' + esc(d.funny) + '”</p>' : '<div class="dinfo">' + portrait('duck:' + sel, 'big silhouette') + '<h3>???</h3><p class="lockinfo">🔒 ' + duckSourceText(sel) + '</p></div>';
    } else if (UI.guideTab === 'dogs') {
      sel = sel || UI.guideSel || 'mutt';
      if (!D.DOGS[sel]) sel = 'mutt';
      list = D.DOG_ORDER.map(id => { const seen = S.data.seenDogs[id]; return '<button class="cc ' + (seen ? '' : 'locked ') + (sel === id ? 'focus' : '') + '" data-act="gsel" data-id="' + id + '">' + portrait('dog:' + id, seen ? 'pt' : 'pt silhouette') + '</button>'; }).join('');
      const d = D.DOGS[sel];
      detail = S.data.seenDogs[sel] ? '<div class="dinfo">' + portrait('dog:' + sel, 'big') + '<h3>' + d.name + '</h3><div class="stats"><span>❤ ' + d.hp + (d.helmet ? ' +' + d.helmet + ' armor' : '') + (d.door ? ' +' + d.door + ' door' : '') + '</span><span>🐾 ' + speedWord(d.speed) + '</span></div><p>' + esc(d.desc) + '</p><div class="qpbox"><b>How to counter</b><span>' + esc(d.counter) + '</span></div><p class="funny">“' + esc(d.funny) + '”</p></div>'
        : '<div class="dinfo">' + portrait('dog:' + sel, 'big silhouette') + '<h3>???</h3><p class="lockinfo">Not spotted yet. Keep exploring!</p></div>';
    } else {
      sel = sel || UI.guideSel || 'barkley';
      if (!D.BOSSES[sel]) sel = 'barkley';
      const bossLv = id => D.LEVELS.find(l => l.boss === id);
      list = Object.keys(D.BOSSES).map(id => { const met = S.isUnlocked(bossLv(id).id); return '<button class="cc ' + (met ? '' : 'locked ') + (sel === id ? 'focus' : '') + '" data-act="gsel" data-id="' + id + '">' + portrait('boss:' + id, met ? 'pt' : 'pt silhouette') + '</button>'; }).join('');
      const b = D.BOSSES[sel], lvb = bossLv(sel), met = S.isUnlocked(lvb.id);
      detail = met ? '<div class="dinfo">' + portrait('boss:' + sel, 'big') + '<h3>' + b.name + '</h3><div class="role">' + b.title + ' · Level ' + lvb.id + '</div><p>' + esc(b.desc) + '</p><div class="qpbox"><b>Phases</b><span>' + b.phases.map((p, i) => 'Phase ' + (i + 1) + ': ' + p.attacks.filter((v, k, a) => a.indexOf(v) === k).map(attackName).join(', ')).join('<br>') + '</span></div><p class="funny">“' + esc(b.funny) + '”</p>' + (S.isCleared(lvb.id) ? '<p class="joined">Defeated ✓</p>' : '') + '</div>'
        : '<div class="dinfo">' + portrait('boss:' + sel, 'big silhouette') + '<h3>???</h3><p class="lockinfo">Reach level ' + lvb.id + ' to learn more.</p></div>';
    }
    UI.guideSel = sel;
    $('screen-guide').innerHTML = '<div class="topbar"><button class="btn small" data-act="back">⟵ Back</button><div class="map-title"><b>Duck &amp; Dog Field Guide</b><small>Practical notes and gossip</small></div>' + coinsHtml() + '</div>' +
      '<div class="gtabs">' + ['ducks', 'dogs', 'bosses'].map(t => '<button class="wtab ' + (UI.guideTab === t ? 'on' : '') + '" data-act="gtab" data-tab="' + t + '">' + { ducks: '🦆 Ducks (' + S.data.owned.length + '/' + D.DUCK_ORDER.length + ')', dogs: '🐕 Dogs (' + Object.keys(S.data.seenDogs).length + '/' + D.DOG_ORDER.length + ')', bosses: '👑 Bosses' }[t] + '</button>').join('') + '</div>' +
      '<div class="guide-grid"><div class="panel coll">' + list + '</div><div class="panel">' + detail + '</div></div>';
  };
  function speedWord(s) { return s >= 0.5 ? 'Very fast' : s >= 0.3 ? 'Quick' : s >= 0.21 ? 'Normal' : 'Slow'; }
  function attackName(a) { return { summon: 'summons dogs', roll: 'rolls objects down a lane', bark: 'stuns a lane', strike: 'strikes marked tiles', fog: 'summons fog', freeze: 'freezes a column', laser: 'lane laser' }[a] || a; }

  /* ------------------------------------------------------------ TROPHIES */
  UI.trophies = function () {
    if (UI.screen !== 'trophies') UI.trophyFrom = UI.screen;
    S.checkTrophies(); S.save();
    UI.show('trophies');
    if (!G.stage || G.stage.name !== 'diorama') G.diorama(S.data.lastWorld || 1, {});
    const T = D.TROPHIES, st = S.data.trophies;
    const done = T.filter(t => st[t.id]).length;
    const unclaimed = T.filter(t => st[t.id] === 'got');
    $('screen-trophies').innerHTML = '<div class="topbar"><button class="btn small" data-act="back">⟵ Back</button><div class="map-title"><b>Trophy Shelf</b><small>' + done + ' / ' + T.length + ' earned</small></div>' + coinsHtml() + '</div>' +
      '<div class="trophy-wrap panel">' + (unclaimed.length > 1 ? '<div class="row"><button class="btn primary" data-act="claimall">Claim all (' + unclaimed.reduce((a, t) => a + t.coins, 0) + ' coins)</button></div>' : '') +
      '<div class="trophy-grid">' + T.map(t => {
        const s2 = st[t.id];
        return '<div class="trophy ' + (s2 ? s2 : 'todo') + '"><span class="tro-ico">' + (s2 ? '🏆' : '🔒') + '</span><div><b>' + esc(t.name) + '</b><p>' + esc(t.desc) + '</p>' +
          (s2 === 'got' ? '<button class="btn small primary" data-act="claim" data-id="' + t.id + '">Claim <span class="coin-ico"></span>' + t.coins + '</button>' : s2 === 'claimed' ? '<small class="ok">Claimed ✓ (+' + t.coins + ')</small>' : '<small>Reward: ' + t.coins + ' coins</small>') + '</div></div>';
      }).join('') + '</div></div>';
  };

  /* ------------------------------------------------------------ SETTINGS */
  function settingsHtml(compact) {
    const s = S.data.settings;
    return '<div class="settings">' +
      '<label>🎵 Music <input type="range" min="0" max="1" step="0.05" value="' + s.music + '" data-set="music"></label>' +
      '<label>🔊 Sound effects <input type="range" min="0" max="1" step="0.05" value="' + s.sfx + '" data-set="sfx"></label>' +
      '<label class="chk"><input type="checkbox" data-set="muted" ' + (s.muted ? 'checked' : '') + '> Mute everything</label>' +
      '<div class="seg"><span>Graphics</span><button class="btn small ' + (s.gfx === 'high' ? 'primary' : '') + '" data-act="gfx" data-v="high">High</button><button class="btn small ' + (s.gfx === 'low' ? 'primary' : '') + '" data-act="gfx" data-v="low">Low (Chromebook)</button></div>' +
      (compact ? '' : '<div class="seg"><span>Battle speed</span><button class="btn small ' + (s.speed !== 2 ? 'primary' : '') + '" data-act="defspeed" data-v="1">Normal</button><button class="btn small ' + (s.speed === 2 ? 'primary' : '') + '" data-act="defspeed" data-v="2">Fast</button></div>') +
      '</div>';
  }
  UI.settings = function () {
    UI.prevScreen = UI.screen === 'settings' ? UI.prevScreen : UI.screen;
    UI.show('settings');
    $('screen-settings').innerHTML = '<div class="modal-card"><h2>Settings</h2>' + settingsHtml(false) +
      '<p class="muted small">Saves automatically to this browser under its own key (<code>' + D.SAVE_KEY + '</code>), separate from the original Ducks vs. Dogs.</p>' +
      '<p class="muted small">Keys in battle: 1–8 duck cards · R remove · Q Quack Power · F speed · Space/P pause · Esc cancel</p>' +
      '<div class="row"><button class="btn primary" data-act="back">Done</button><button class="btn danger" data-act="reset">Reset progress…</button></div></div>';
  };

  /* ------------------------------------------------------------ ACTIONS */
  UI.act = function (act, el) {
    A.init();
    const ds = el.dataset;
    switch (act) {
      case 'play': A.play('click'); UI.map(); break;
      case 'title': UI.title(); break;
      case 'map': UI.closeModal(); UI.map(UI.world); break;
      case 'world': UI.map(+ds.w); A.play('click'); break;
      case 'level': A.play('quack'); UI.openLevel(ds.id); break;
      case 'endless': UI.openLevel('endless'); break;
      case 'guide': UI.guideFrom = UI.screen; UI.guide(); break;
      case 'gtab': UI.guideSel = null; UI.guide(ds.tab); break;
      case 'gsel': A.play('click'); UI.guide(UI.guideTab, ds.id); break;
      case 'settings': UI.settings(); break;
      case 'trophies': UI.trophies(); break;
      case 'claim': case 'claimall': {
        const ids = act === 'claim' ? [ds.id] : D.TROPHIES.filter(t => S.data.trophies[t.id] === 'got').map(t => t.id);
        ids.forEach(id => { const t = D.TROPHIES.find(x => x.id === id); if (t && S.data.trophies[id] === 'got') { S.data.trophies[id] = 'claimed'; S.addCoins(t.coins); } });
        S.save(); A.play('buy'); UI.trophies();
        break;
      }
      case 'rumble': A.play('boss'); UI.openLevel('rumble'); break;
      case 'arena': S.data.endless.arena = +ds.w; S.save(); UI.openLevel('endless'); break;
      case 'snack': {
        const id = ds.id, sel = S.data.snackSel, at = sel.indexOf(id);
        if (at >= 0) sel.splice(at, 1);
        else if ((S.data.snacks[id] || 0) > 0) { if (sel.length >= S.snackSlots()) sel.shift(); sel.push(id); }
        S.save(); A.play('click'); UI.loadout();
        break;
      }
      case 'back':
        if (UI.screen === 'guide') { (UI.guideFrom === 'title' ? UI.title : UI.guideFrom === 'loadout' ? UI.loadout : () => UI.map(UI.world))(); }
        else if (UI.screen === 'trophies') { UI.trophyFrom === 'title' ? UI.title() : UI.map(UI.world); }
        else if (UI.screen === 'settings') { UI.prevScreen === 'title' ? UI.title() : UI.prevScreen === 'loadout' ? UI.loadout() : UI.map(UI.world); }
        break;
      case 'shop': A.play('click'); UI.shopSay = null; UI.shop(ds.shop); break;
      case 'talk': {
        const sh = D.SHOPS[UI.shopId];
        if (UI.shopIntro != null) { UI.shopIntro++; if (UI.shopIntro >= sh.intro.length) UI.shopIntro = null; }
        else UI.shopSay = sh.greet[Math.floor(Math.random() * sh.greet.length)];
        A.play('quack', 0.8 + Math.random() * 0.4);
        UI.renderShop();
        break;
      }
      case 'buy': UI.buy(ds.item); break;
      case 'confirmbuy': UI.confirmBuy(ds.item); break;
      case 'buyup': UI.buyUpgrade(ds.duck); break;
      case 'confirmup': UI.confirmUpgrade(ds.duck); break;
      case 'pickup': S.data.upgrades[ds.duck] = ds.opt; S.save(); A.play('click'); UI.renderShop(); break;
      case 'hat': S.data.hat = ds.hat; S.save(); A.play('click'); UI.renderShop(); break;
      case 'closemodal': UI.closeModal(); break;
      case 'slot': {
        const i = +ds.i;
        if (fixedTeam(UI.lv)) { UI.info = UI.team[i]; break; }
        if (UI.replaceIdx === 'pick' && UI.pendingAdd) { UI.team[i] = UI.pendingAdd; UI.info = UI.pendingAdd; UI.pendingAdd = null; UI.replaceIdx = null; A.play('quack'); }
        else { UI.info = UI.team[i]; UI.team.splice(i, 1); A.play('click'); }
        UI.loadout();
        break;
      }
      case 'coll': {
        const id = ds.id;
        UI.info = id;
        const fixed = fixedTeam(UI.lv);
        if (!fixed && S.owns(id)) {
          const at = UI.team.indexOf(id);
          if (at >= 0) { UI.team.splice(at, 1); A.play('click'); }
          else if (UI.team.length < S.capacity()) { UI.team.push(id); A.play('quack', 1 + Math.random() * 0.3); }
          else if (UI.pendingAdd === id) { UI.pendingAdd = null; UI.replaceIdx = null; }
          else { UI.pendingAdd = id; UI.replaceIdx = 'pick'; A.play('click'); }
        } else A.play('click');
        UI.loadout();
        break;
      }
      case 'clearteam': UI.team = []; UI.pendingAdd = null; UI.replaceIdx = null; UI.loadout(); break;
      case 'startbattle': A.play('honk'); UI.startBattle(); break;
      case 'resume': UI.pause(false); break;
      case 'restart': UI.pause(false); B.cleanup(); UI.show('battle'); B.start(UI.lv, UI.lastTeam); break;
      case 'quit': $('pause').classList.add('hidden'); B.paused = false; B.cleanup(); UI.map(UI.world); break;
      case 'skiptut': B.skipTut(); UI.pause(false); break;
      case 'retry': UI.show('battle'); B.start(UI.lv, UI.lastTeam); break;
      case 'changeteam': UI.loadout(); break;
      case 'nextlevel': UI.openLevel(UI.nextId); break;
      case 'nextqueue': UI.nextQueue(); break;
      case 'gfx':
        S.data.settings.gfx = ds.v; S.save();
        G.applyQuality();
        if (B.active) { el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('primary', b === el)); B.toast('Graphics: ' + (ds.v === 'high' ? 'High' : 'Low') + ' (fully applies on the next level)'); }
        else { if (UI.screen === 'settings') UI.settings(); }
        break;
      case 'defspeed': S.data.settings.speed = +ds.v; S.save(); UI.settings(); break;
      case 'reset':
        UI.modal('<h2>Reset all progress?</h2><p>This erases your Ducks vs. Dogs 2 campaign, coins, ducks, purchases and records. It does not touch the original game.</p><div class="row"><button class="btn danger" data-act="reset2">Yes, erase it</button><button class="btn" data-act="closemodal">Cancel</button></div>');
        break;
      case 'reset2': S.reset(); UI.closeModal(); UI.title(); break;
    }
  };

  UI.onSetting = function (el) {
    const k = el.dataset.set;
    const s = S.data.settings;
    if (k === 'muted') s.muted = el.checked; else s[k] = +el.value;
    S.save();
    A.applyVolumes();
    syncSoundBtn();
  };
  function syncSoundBtn() { const b = $('btn-sound'); if (b) b.textContent = S.data.settings.muted ? '🔇' : '🔊'; }
  UI.syncSoundBtn = syncSoundBtn;
})(window.DVD);
