/* Ducks vs. Dogs 2 — battle engine: lanes, ducks, dogs, waves, Quack Power, Goose Patrol, bosses. */
(function (D) {
  'use strict';
  const T = window.THREE;
  const G = D.G, A = D.Audio, S = D.Save;
  const $ = id => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  function weightedPick(pool, rnd, filter) {
    const keys = Object.keys(pool).filter(filter || (() => true));
    if (!keys.length) return null;
    let tot = 0; keys.forEach(k => tot += pool[k]);
    let x = rnd() * tot;
    for (const k of keys) { x -= pool[k]; if (x <= 0) return k; }
    return keys[keys.length - 1];
  }

  const B = D.Battle = { active: false };
  B.genWaves = lv => genWaves(lv);

  /* ============================================================ WAVES */
  function genWaves(lv) {
    const rnd = seeded(lv.id + ':waves');
    const waves = [];
    for (let i = 0; i < lv.waves; i++) {
      const flag = (lv.flags || []).indexOf(i) >= 0;
      let pts = (lv.base * 0.9 + lv.grow * 0.72 * i) * ([1, 0.88, 0.8, 0.74, 0.7, 0.66][(lv.w || 1) - 1] || 1);
      if (flag) pts *= 1.9;
      const list = [];
      if (flag) list.push('banner');
      if (lv.newDog && i === 1) { list.push(lv.newDog); pts -= D.DOGS[lv.newDog].pts; }
      let guard = 0;
      while (pts > 0.45 && guard++ < 80) {
        const cap = i < 2 ? 1 : i < 4 ? 2.1 : 99;
        const k = weightedPick(lv.pool, rnd, d => D.DOGS[d].pts <= Math.max(1, pts + 0.6) && D.DOGS[d].pts <= cap && !(d === lv.newDog && i < 1));
        if (!k) break;
        list.push(k); pts -= D.DOGS[k].pts;
      }
      if (!list.length) list.push('mutt');
      waves.push({ dogs: list, flag, final: i === lv.waves - 1 });
    }
    return waves;
  }
  function endlessWave(n) {
    const pool = { mutt: 3 };
    if (n >= 2) { pool.helmet = 2; pool.runner = 1; }
    if (n >= 4) { pool.pogo = 1; pool.door = 1; }
    if (n >= 6 && S.owns('lantern')) pool.sneaky = 1;
    if (n >= 7) { pool.digger = 1; pool.nurse = 0.8; }
    if (n >= 9) { pool.skater = 1; pool.tennis = 0.8; }
    if (n >= 12) { pool.knight = 0.8; pool.husky = 1; pool.samoyed = 0.6; }
    if (n >= 15) { pool.catapult = 0.7; pool.bulldozer = 0.3; pool.chihuahua = 1; }
    if (B.lv && (B.lv.env.water || []).length && n >= 3) pool.snorkel = 1;
    if (n >= 10 && S.worldUnlocked(6)) { pool.phantom = 0.7; pool.mummy = 0.6; pool.balloon = 0.6; pool.werewoof = 0.4; }
    const flag = n % 5 === 0;
    let pts = 1.5 + n * 0.95 + Math.pow(n, 1.35) * 0.12;
    if (flag) pts *= 2;
    const list = flag ? ['banner'] : [];
    let guard = 0;
    while (pts > 0.45 && guard++ < 120) { const k = weightedPick(pool, Math.random, d => D.DOGS[d].pts <= pts + 0.6); if (!k) break; list.push(k); pts -= D.DOGS[k].pts; }
    return { dogs: list.length ? list : ['mutt'], flag, final: false };
  }

  /* ============================================================ START */
  B.start = function (lv, loadout, opts) {
    opts = opts || {};
    B.cleanup();
    B.lv = lv;
    B.mode = lv.mode;
    B.endless = lv.mode === 'endless';
    B.env = lv.env || {};
    B.t = 0; B.speed = S.data.settings.speed || 1; B.paused = false; B.over = false; B.endT = 0;
    B.active = true;
    B.capacity = S.capacity();
    B.crumbBased = lv.mode !== 'belt';
    B.crumbs = B.crumbBased ? (lv.start + (S.hasItem('crumbjar') ? 50 : 0)) : 0;
    B.qpEnabled = B.endless || lv.bonus || !!lv.rumble || D.levelIndex(lv.id) >= 3;
    B.qpMax = S.hasItem('extraqp') ? 4 : 3;
    B.qp = B.qpEnabled ? (S.hasItem('extraqp') ? 2 : 1) : 0;
    B.drumSolo = 0; B.flare = 0;
    B.stats = { goose: 0, lost: 0, maxDucks: 0, qp: 0, shovel: 0, coins: 0, kills: 0, bonks: 0 };
    // snacks (one-level boosts; they never touch loadout capacity)
    B.snacks = (opts.snacks || []).slice(0, 2);
    const snack = id => B.snacks.indexOf(id) >= 0;
    if (snack('headstart') && B.crumbBased) B.crumbs += 150;
    if (snack('muffin') && B.qpEnabled) B.qp = Math.min(B.qpMax, B.qp + 1);
    B.coinMult = snack('cookie') ? 2 : 1;
    B.hpMult = snack('pretzel') ? 1.2 : 1;
    B.mirror = 0; B.bonkCd = 0;
    B.rumble = lv.rumble ? { list: lv.rumble, idx: 0 } : null;
    B.sel = null;
    B.ducks = []; B.dogs = []; B.projs = []; B.pickups = []; B.hazards = []; B.tempFog = [];
    B.grid = [];
    for (let c = 0; c < D.COLS; c++) { B.grid[c] = []; for (let r = 0; r < D.LANES; r++) B.grid[c][r] = { duck: null, raft: null }; }
    B.gridDirty = true;
    B.water = {}; (B.env.water || []).forEach(r => B.water[r] = true);
    B.current = {}; (B.env.current || []).forEach(r => B.current[r] = true);
    B.ice = {}; (B.env.ice || []).forEach(r => B.ice[r] = true);
    B.protTiles = (lv.protect && lv.protect.tiles) || [];
    B.blizT = B.env.blizzard ? 26 : 0; B.blizWarn = 0;
    B.graves = {}; B.portals = []; B.syrup = [];

    // cards
    let team = loadout.slice();
    if (lv.mode === 'offered') team = lv.offered.slice(0, Math.min(D.MAX_SLOTS, B.capacity));
    if (lv.forced) team = lv.forced.slice();
    team = team.slice(0, Math.min(D.MAX_SLOTS, Math.max(B.capacity, lv.forced ? lv.forced.length : 0)));
    B.team = team;
    B.cards = team.map(id => ({ id, cost: duckCost(id), cdMax: duckCd(id), t: snack('espresso') ? 0 : (D.DUCKS[id].startCd || 0) }));
    B.belt = [];
    B.beltTypes = lv.mode === 'belt' ? lv.belt.slice(0, Math.min(D.MAX_SLOTS, B.capacity)) : [];
    B.beltT = 1.0; B.beltCount = 0;

    // waves
    if (B.endless) { B.waves = []; B.endlessWave = 0; }
    else if (!lv.boss) B.waves = genWaves(lv);
    else B.waves = [];
    B.waveIdx = -1;
    B.waveT = 0;
    B.nextWaveAt = lv.boss ? 10 : (lv.mode === 'rush' ? 4 : (lv.tut === 'basics' ? 26 : 24));
    B.waveHp = 1; B.pendingFlag = 0;
    B.spawnQueue = [];
    B.skyT = 3; B.timeLeft = lv.mode === 'rush' ? lv.time : 0;

    // scene
    G.clearStage();
    const world = lv.w || 1;
    B.root = G.buildBattlefield(world, lv);
    G.stageRoot.add(B.root);
    B.fog = B.root.userData.fog;
    B.hl = G.tileQuad('highlight', 0xffffff, 0.9); B.hl.visible = false; B.root.add(B.hl);
    B.laneHl = [];
    // haunted kennel: bone piles and portals
    (B.env.graves || []).forEach(([c, r]) => { if (lv.lanes.indexOf(r) >= 0) addGrave(c, r); });
    const PCOL = [0xc070ff, 0x5dffb0, 0xffb040];
    (B.env.portals || []).forEach((pr, k) => {
      const [a, b] = pr; const color = PCOL[k % PCOL.length];
      const ma = G.makePortal(color), mb = G.makePortal(color);
      ma.position.set(a[0], 0, G.laneZ(a[1])); mb.position.set(b[0], 0, G.laneZ(b[1])); mb.scale.setScalar(0.8);
      B.root.add(ma, mb);
      B.portals.push({ a: { c: a[0], r: a[1] }, b: { c: b[0], r: b[1] }, ma, mb });
    });
    // geese
    B.geese = [];
    for (let r = 0; r < D.LANES; r++) {
      if (lv.lanes.indexOf(r) < 0) { B.geese[r] = null; continue; }
      const m = G.makeGoose(S.hasItem('goldgoose'));
      m.position.set(-1.25, 0, G.laneZ(r)); m.rotation.y = -0.4; m.scale.setScalar(1.05);
      B.root.add(m);
      B.geese[r] = { state: 'ready', m, x: -1.25 };
    }
    // protect: ducklings
    if (lv.protect && lv.protect.ducklings) lv.protect.ducklings.forEach(([c, r]) => {
      const e = makeDuckEntity('duckling', c, r);
      e.m = G.makeDuckling(); e.m.position.set(c, 0.07, G.laneZ(r)); e.m.rotation.y = -0.5; e.m.scale.setScalar(1.3);
      B.root.add(e.m);
      B.grid[c][r].duck = e; B.ducks.push(e);
    });
    // boss
    B.boss = null;
    if (B.rumble) spawnBoss(B.rumble.list[0]);
    else if (lv.boss) spawnBoss(lv.boss);

    G.stage = {
      name: 'battle',
      fit: fitCamera,
      update: (dt) => B.frame(dt)
    };
    fitCamera();
    // tutorial
    B.tut = null;
    const tutKey = lv.tut;
    if (tutKey && D.TUTS[tutKey] && (!S.data.tutDone[tutKey] || opts.forceTut)) B.tut = { key: tutKey, steps: D.TUTS[tutKey], i: 0, t: 0 };
    B.hud.build();
    if (lv.rules && lv.rules.length) B.banner(lv.rules[0], 3.5, 'rule');
    else B.banner(lv.boss ? D.BOSSES[lv.boss].name.toUpperCase() + '!' : 'GET READY...', 2.5);
    if (B.tut) B.showTut();
    A.music(lv.boss || lv.rumble ? 6 : (D.WORLDS[world - 1].music));
    if (lv.tut === 'basics' && B.lv.lanes.length === 1) {
      // glowing lane for the very first lesson
      for (let c = 0; c < D.COLS; c++) { const q = G.tileQuad('highlight', 0xfff2a0, 0.5); q.position.set(c, 0.09, G.laneZ(lv.lanes[0])); B.root.add(q); B.laneHl.push(q); }
    }
  };

  function fitCamera() {
    const cam = G.camera;
    const a = cam.aspect;
    cam.fov = 32;
    const vf = cam.fov * Math.PI / 180;
    const hf = 2 * Math.atan(Math.tan(vf / 2) * a);
    const boss = B.active && B.boss;
    const W = boss ? 16.4 : 14.2;
    const dW = (W / 2) / Math.tan(hf / 2);
    const H = window.innerHeight, hud = Math.min(100, H * 0.22);
    const dH = 4.2 / Math.tan(vf / 2) * (H / (H - hud));
    const d = Math.max(dW, dH);
    const pitch = 0.92; // ~53 degrees down
    const tx = boss ? 4.5 : 3.7, tz = a < 1.3 ? 0.0 : -0.25;
    cam.position.set(tx, Math.sin(pitch) * d, tz + Math.cos(pitch) * d);
    cam.lookAt(tx, 0, tz);
    cam.setViewOffset(window.innerWidth, H, 0, -hud * 0.45, window.innerWidth, H);
    cam.updateProjectionMatrix();
    if (G.scene.fog) { G.scene.fog.near = d * 1.2; G.scene.fog.far = d * 3; }
  }

  function duckCost(id) {
    if (id === 'double' && S.upgrade('double') === 'B') return 175;
    return D.DUCKS[id].cost;
  }
  function duckCd(id) {
    if (id === 'reed' && S.upgrade('reed') === 'B') return 14;
    return D.DUCKS[id].cd;
  }
  function up(id, opt) { return S.upgrade(id) === opt; }

  /* ============================================================ ENTITIES */
  function makeDuckEntity(id, c, r) {
    if (id === 'duckling') return { id, def: { name: 'Duckling', kind: 'duckling', hp: 300 }, c, r, x: c, hp: 300, maxHp: 300, t: 0, alive: true, blocker: true, duckling: true, shield: 0, frozen: 0, stun: 0, invuln: 0, armor: 0, armorT: 0 };
    const def = D.DUCKS[id];
    let hp = def.hp;
    if ((id === 'reed' || id === 'tall') && S.hasItem('sturdy')) hp = Math.round(hp * 1.25);
    if (id === 'squeak' && up('squeak', 'B')) hp = 2600;
    hp = Math.round(hp * (B.hpMult || 1));
    return { id, def, c, r, x: c, hp, maxHp: hp, t: 0, cool: 0, alive: true, blocker: def.kind !== 'spikes' && def.kind !== 'spade', shield: 0, frozen: 0, stun: 0, invuln: 0, armor: 0, armorT: 0, volley: 0, amp: 0, warm: false };
  }

  function tileOk(id, c, r) {
    if (c < 0 || c >= D.COLS || r < 0 || r >= D.LANES) return 'Off the field';
    if (B.lv.lanes.indexOf(r) < 0) return 'This lane is closed';
    if (B.protTiles.some(p => p[0] === c && p[1] === r)) return 'Protected tile';
    if (B.portals.some(p => (p.a.c === c && p.a.r === r) || (p.b.c === c && p.b.r === r))) return 'Ducks cannot stand on a portal';
    const g = B.grid[c][r];
    if (B.graves[c + ',' + r]) return id === 'spade' ? (g.duck ? 'Tile occupied' : null) : 'A bone pile is in the way — Spade Scaup can dig it up';
    const water = B.water[r];
    if (id === 'raft') {
      if (!water) return 'Lily Rafts only float on water';
      if (g.raft) return 'There is already a raft here';
      return null;
    }
    if (water && !g.raft) return 'Place a Lily Raft on water first';
    if (g.duck) return g.duck.duckling ? 'A duckling is sleeping here' : 'Tile occupied';
    return null;
  }

  function placeDuck(id, c, r, free) {
    const e = makeDuckEntity(id, c, r);
    const m = G.makeDuck(id);
    const onRaft = id !== 'raft' && B.water[r];
    m.position.set(c, onRaft ? 0.1 : (id === 'raft' ? -0.04 : 0.07), G.laneZ(r));
    m.rotation.y = -0.5;
    m.scale.setScalar(id === 'raft' ? 1.05 : 1.28);
    m.userData.puff = 1;
    B.root.add(m);
    e.m = m;
    e.onRaft = onRaft;
    if (id === 'raft') B.grid[c][r].raft = e; else B.grid[c][r].duck = e;
    B.ducks.push(e);
    B.gridDirty = true;
    // kind setup
    const k = e.def.kind;
    if (k === 'producer') e.t = up('bread', 'B') ? 3 : e.def.first;
    if (k === 'grower') { e.t = e.def.interval; e.age = 0; }
    if (k === 'mine') e.t = up('snap', 'A') ? 8 : e.def.arm;
    if (k === 'bomb') e.t = 1.0;
    if (k === 'protector') e.t = 0.5;
    if (k === 'magnet') e.t = 1;
    if (k === 'pusher') e.t = 1.5;
    if (k === 'stunner') e.t = 1;
    if (k === 'coiner') { e.t = e.def.interval * 0.5; e.drops = 0; }
    if (k === 'rang' || k === 'twoway' || k === 'flamer') e.t = 0.4;
    if (k === 'sticky' || k === 'lure' || k === 'mimic') e.t = 1;
    if (k === 'spade') { e.digGrave = !!B.graves[c + ',' + r]; e.t = e.digGrave ? 2 : 3; e.armed = false; }
    A.play('place');
    A.play('quack', 0.9 + Math.random() * 0.4);
    G.fx('dust', c, 0.2, G.laneZ(r), { n: 4, spread: 0.5 });
    G.fx('leaf', c, 0.3, G.laneZ(r), { n: 3 });
    const count = B.ducks.filter(d => !d.duckling && d.id !== 'raft' && d.def.kind !== 'bomb').length;
    B.stats.maxDucks = Math.max(B.stats.maxDucks, count);
    B.tutEvent('place', id);
    return e;
  }

  function removeDuck(e, how) {
    if (!e.alive) return;
    e.alive = false;
    const g = B.grid[e.c][e.r];
    if (g.duck === e) g.duck = null;
    if (g.raft === e) g.raft = null;
    B.root.remove(e.m);
    if (e.iceBlock) e.iceBlock = null;
    const i = B.ducks.indexOf(e); if (i >= 0) B.ducks.splice(i, 1);
    B.gridDirty = true;
    const z = G.laneZ(e.r);
    if (how === 'eaten') {
      G.fx('puff', e.x, 0.35, z, { n: 3, spread: 0.4 });
      G.fx('feather', e.x, 0.5, z, { n: 2, spread: 0.4 });
      if (!e.duckling) B.stats.lost++;
      A.play('quack', 1.6);
      B.word(pick(['GULP!', 'CHOMP!', 'NOM!']), e.x, 0.8, z, 'bad');
      if (e.duckling) B.lose('A duckling was eaten!');
    } else if (how === 'shovel') {
      G.fx('dust', e.x, 0.2, z, { n: 4, spread: 0.5 });
      A.play('remove');
    }
  }
  B.removeDuck = removeDuck;

  function damageDuck(e, dmg) {
    if (!e.alive || e.invuln > 0) return;
    if (e.armor > 0) { const a = Math.min(e.armor, dmg); e.armor -= a; dmg -= a; }
    if (e.shield > 0) { const s = Math.min(e.shield, dmg); e.shield -= s; dmg -= s; if (e.shield <= 0 && e.bubbleS) { e.m.remove(e.bubbleS); e.bubbleS = null; G.fx('bubble', e.x, 0.5, G.laneZ(e.r)); } }
    if (dmg <= 0) return;
    e.hp -= dmg;
    e.m.userData.hurt = Math.min(1, e.m.userData.hurt + 0.4);
    if (e.hp <= 0) removeDuck(e, 'eaten');
  }

  /* ---------------------------------------------------------- DOGS */
  function spawnDog(type, lane, x, opt) {
    opt = opt || {};
    const def = D.DOGS[type];
    if (lane == null) lane = chooseLane(type);
    const d = {
      type, def, lane, x: x != null ? x : rand(10.25, 10.7), z: G.laneZ(lane), y: 0,
      hp: def.hp, maxHp: def.hp, helmet: def.helmet || 0, door: def.door || 0,
      speed: def.speed * rand(0.92, 1.08), dead: false, slow: 0, slowK: 1, freeze: 0, stun: 0, soak: 0,
      hidden: !!def.hidden, revealed: false, burrow: !!def.burrow, pogo: def.look === 'pogo', sled: !!def.sled,
      throws: def.ranged === 'bone' ? 10 : def.ranged === 'snow' ? 5 : def.ranged ? 8 : 0, throwT: 1.2,
      laneT: 0, laneTravel: 0, laneTarget: null, laneMove: 0, jump: null, biteT: 0, smashT: 1, thrown: false, flee: 0,
      flying: !!def.flies, balloon: def.balloon || 0, phantom: !!def.phantom, wrapped: !!def.mummy, burn: 0, portalCd: 0, were: def.were ? 0 : -1
    };
    const m = G.makeDog(type);
    G.prepDog(m);
    m.position.set(d.x, 0.07, d.z);
    m.rotation.y = Math.PI + 0.45;
    m.scale.setScalar(1.18);
    if (def.hidden) {
      m.traverse(o => { if (o.isMesh && o.material && !o.material.map) { o.material = o.material.clone(); o.material.transparent = true; } });
    }
    B.root.add(m);
    d.m = m;
    if (opt.fly) { d.jump = { from: opt.fromX, to: d.x, t: 0, dur: 0.9, h: 2.2 }; d.x = opt.fromX; }
    B.dogs.push(d);
    if (!S.data.seenDogs[type]) { S.data.seenDogs[type] = true; S.save(); B.dogIntro(type); }
    return d;
  }
  B.spawnDog = spawnDog;

  function chooseLane(type) {
    const lanes = B.lv.lanes;
    const def = D.DOGS[type];
    if (def.swims) { const w = lanes.filter(r => B.water[r]); if (w.length) return pick(w); }
    if (def.sled) { const ic = lanes.filter(r => B.ice[r]); if (ic.length && Math.random() < 0.65) return pick(ic); }
    // avoid stacking the same lane twice in a row
    let r = pick(lanes);
    if (lanes.length > 1 && r === B.lastLane && Math.random() < 0.6) r = pick(lanes);
    B.lastLane = r;
    return r;
  }

  function dogTargetable(d, how) {
    if (d.dead || d.flee) return false;
    if (d.jump && d.jump.h > 0.8) return how === 'area';
    if (d.burrow) return false;
    if (d.flying) return how === 'lob' || how === 'zap' || how === 'air' || how === 'pierce' || how === 'area';
    if (d.hidden && !d.revealed && !d.lit) return how === 'trap';
    if (d.submerged) return how === 'lob' || how === 'zap' || how === 'trap' || how === 'area';
    if (d.x > 10.1) return false;
    return true;
  }

  function hurtDog(d, dmg, o) {
    o = o || {};
    if (d.isBoss) { hurtBoss(dmg); return; }
    if (d.dead) return;
    if (d.dazzled) dmg *= 1.15;
    if (o.zap && d.soak > 0) dmg *= 2;
    // elements: bandages soak water, fire burns them off; ghosts hate fire
    if (o.water && d.wrapped) dmg *= 0.5;
    if (o.fire) {
      if (d.wrapped) { d.wrapped = false; const p = d.m.userData.parts; if (p.wraps) p.wraps.visible = false; (p.headWraps || []).forEach(w => w.visible = false); B.word('UNWRAPPED!', d.x, 1.3, d.z, 'hit'); dmg *= 2; }
      else if (d.def.mummy || d.phantom) dmg *= 2;
    }
    // balloon takes hits first
    if (d.flying && d.balloon > 0) {
      d.balloon -= dmg;
      d.m.userData.hurt = 0.3;
      if (d.balloon <= 0) popBalloon(d);
      return;
    }
    if (d.door > 0 && !o.lob && !o.pierce && !o.area) {
      d.door -= dmg; A.play('armor');
      if (d.door <= 0) dropArmor(d, 'CLANG!');
      d.m.userData.hurt = 0.4;
      return;
    }
    if (d.helmet > 0) {
      d.helmet -= dmg; A.play('armor');
      d.m.userData.hurt = 0.5;
      if (d.helmet <= 0) { const left = -d.helmet; d.helmet = 0; dropArmor(d, 'CLONK!'); if (left > 0) d.hp -= left; }
      return;
    }
    d.hp -= dmg;
    d.m.userData.hurt = 1;
    A.play('hit');
    if (Math.random() < 0.06) B.word(pick(['YIP!', 'OOF!', 'ARF?!', 'BONK!']), d.x, 1.1, d.z, 'hit');
    if (d.hp <= d.maxHp * 0.5 && d.type === 'bulldozer' && !d.thrown) throwChihuahua(d);
    if (d.were === 0 && d.hp > 0 && d.hp <= d.maxHp * 0.5) startTransform(d);
    if (d.hp <= 0) killDog(d);
  }

  function dropArmor(d, word) {
    const a = d.m.userData.parts.armor;
    if (a && a.visible) {
      a.visible = false;
      G.fx('star', d.x, 0.9, d.z, { n: 4 });
      G.fx('puff', d.x + 0.2, 0.7, d.z, { n: 2 });
    }
    if (d.type === 'pogo') d.pogo = false;
    d.door = 0; d.helmet = 0;
    if (word) B.word(word, d.x, 1.2, d.z, 'hit');
  }

  function killDog(d, how) {
    if (d.dead) return;
    d.dead = true; d.flee = 2.2;
    d.fleeType = how || (Math.random() < 0.5 ? 'run' : 'tumble');
    d.m.userData.parts.mouth.visible = true;
    B.stats.kills++;
    B.lastDeadPos = { x: d.x, z: d.z };
    A.play('yelp', d.def.big ? 0.6 : d.type === 'chihuahua' ? 1.5 : 1 + Math.random() * 0.2);
    if (Math.random() < 0.35) B.word(pick(['YELP!', 'WHIMPER!', 'AROOO!', 'EEP!', 'NOPE!', 'BYE!']), d.x, 1.2, d.z, 'yelp');
    G.fx('star', d.x, 0.8, d.z, { n: G.high() ? 5 : 3 });
    if (d.m.userData.parts.armor) d.m.userData.parts.armor.visible = false;
    if (d.m.userData.parts.mound) d.m.userData.parts.mound.visible = false;
    d.m.userData.parts.inner.visible = true;
    // drops
    const r = Math.random();
    const featherChance = S.hasItem('luckyegg') ? 0.07 : 0.04;
    if (B.qpEnabled && r < featherChance) spawnPickup('feather', d.x, 0.6, d.z);
    else if (r < featherChance + 0.04) spawnPickup('silver', d.x, 0.6, d.z);
    else if (r < featherChance + 0.045) spawnPickup('gold', d.x, 0.6, d.z);
  }

  function popBalloon(d) {
    d.flying = false; d.balloon = 0;
    const p = d.m.userData.parts; if (p.balloon) p.balloon.visible = false;
    d.stun = Math.max(d.stun, 1); d.fallY = 0.9;
    G.fx('star', d.x, 1.6, d.z, { n: 4 }); G.fx('puff', d.x, 1.5, d.z, { n: 2 });
    B.word('POP!', d.x, 1.8, d.z, 'big');
    A.play('pop');
  }
  function startTransform(d) {
    d.were = 1; d.stun = Math.max(d.stun, 1.6); d.transformT = 1.6;
    B.word('AWOOOO!', d.x, 1.6, d.z, 'warn');
    A.play('howl');
  }
  function finishTransform(d) {
    d.were = 2; d.speed = 0.45; d.biteMult = 2; d.hp = Math.min(d.maxHp, d.hp + 150);
    d.m.scale.setScalar(1.18 * 1.35);
    const p = d.m.userData.parts; if (p.fangs) p.fangs.visible = true;
    G.fx('dust', d.x, 0.4, d.z, { n: 6, spread: 0.6 });
  }
  function igniteDog(d, dps) {
    if (d.dead) return;
    if (d.soak > 0) { d.soak = 0; G.fx('puff', d.x, 0.8, d.z, { n: 2 }); return; } // steam: no burn
    d.burn = 3; d.burnDps = dps;
    if (d.freeze > 0) d.freeze = 0;
    if (d.hidden) d.revealed = true;
  }
  function addGrave(c, r) {
    const key = c + ',' + r;
    if (B.graves[key]) return;
    const m = G.makeGrave(); m.position.set(c, 0.07, G.laneZ(r)); m.rotation.y = -0.3;
    B.root.add(m);
    B.graves[key] = { c, r, m };
  }
  function removeGrave(c, r) {
    const key = c + ',' + r, g = B.graves[key];
    if (!g) return;
    B.root.remove(g.m); delete B.graves[key];
    G.fx('dust', c, 0.3, G.laneZ(r), { n: 6, spread: 0.6 });
  }
  function riseFromGraves(pool) {
    Object.values(B.graves).forEach((g, k) => {
      const type = weightedPick(pool, Math.random, t => D.DOGS[t].pts <= 3 && !D.DOGS[t].swims && !D.DOGS[t].big && !D.DOGS[t].flies);
      if (type) B.spawnQueue.push({ type, lane: g.r, x: g.c + 0.15, at: B.t + 0.5 + k * 0.4, grave: true });
    });
  }
  function addSyrup(c, r, dur) {
    if (c < 0 || c > 9) return;
    const old = B.syrup.find(s => s.c === c && s.r === r);
    if (old) { old.t = Math.max(old.t, dur); return; }
    const m = G.makeSyrup(); m.position.set(c, 0.09, G.laneZ(r)); B.root.add(m);
    B.syrup.push({ c, r, t: dur, m });
  }
  function onSyrup(d) { return B.syrup.some(s => s.r === d.lane && Math.abs(d.x - s.c) < 0.5); }
  function syrupK() { return up('syrup', 'A') ? 0.2 : 0.3; }

  function throwChihuahua(d) {
    d.thrown = true;
    const tx = Math.max(0.6, d.x - 3.2);
    spawnDog('chihuahua', d.lane, tx, { fly: true, fromX: d.x });
    B.word('YEET!', d.x, 1.8, d.z, 'warn');
    A.play('throw');
  }

  /* ---------------------------------------------------------- BOSS */
  function spawnBoss(id) {
    const def = D.BOSSES[id];
    const m = G.makeBoss(id);
    G.prepDog(m);
    m.position.set(10.25, 0.07, 0.1); m.rotation.y = Math.PI + 0.55;
    B.root.add(m);
    const hp = Math.round(def.hp * (B.lv.bossHpK || 1));
    B.boss = { id, def, hp, maxHp: hp, phase: 0, atkT: B.rumble && B.rumble.idx > 0 ? 8 : 22, ambT: 30, atkIdx: 0, m, isBoss: true, x: 9.6, dead: false, invuln: 0, anim: 0, hurtWord: 0 };
    A.play('boss');
  }
  function hurtBoss(dmg) {
    const b = B.boss; if (!b || b.dead) return;
    if (b.invuln > 0) dmg *= 0.25;
    b.hp -= dmg;
    b.m.userData.hurt = Math.min(1, b.m.userData.hurt + 0.15);
    b.hurtWord -= dmg;
    if (b.hurtWord < -400) { b.hurtWord = 0; B.word(pick(['OOF!', 'BONK!', 'GRR!', 'OUCH!']), 9.6, 2.8, rand(-1.5, 1.5), 'hit'); }
    // phase change
    const frac = b.hp / b.maxHp;
    const next = b.def.phases[b.phase + 1];
    if (next && frac <= next.at) {
      b.phase++; b.invuln = 1.5; b.atkT = 3.5; b.atkIdx = 0;
      B.banner(b.def.phases[b.phase].say, 2.6, 'boss');
      A.play('boss');
      b.anim = 1.2;
      for (let k = 0; k < 2 + b.phase; k++) B.spawnQueue.push({ type: weightedPick(b.def.phases[b.phase].pool, Math.random), at: B.t + k * 0.6 });
    }
    if (b.hp <= 0) {
      b.dead = true; b.deadT = 0;
      B.word('K.O.!', 9.4, 2.5, 0, 'big');
      A.play('yelp', 0.5); A.play('boom');
      G.fx('star', 9.6, 2, 0, { n: 14 });
      B.dogs.forEach(d => { if (!d.dead) killDog(d, 'run'); });
    }
  }
  B.bossTarget = { isBoss: true, x: 9.6 };

  function bossAttack() {
    const b = B.boss;
    const ph = b.def.phases[b.phase];
    const kind = ph.attacks[b.atkIdx % ph.attacks.length];
    b.atkIdx++;
    b.anim = 0.8;
    const laneScore = r => B.ducks.filter(e => e.r === r && !e.duckling).length + Math.random() * 0.5;
    const lanes = B.lv.lanes.slice();
    if (kind === 'summon') {
      const n = 2 + b.phase + (B.lv.w > 3 ? 1 : 0);
      for (let k = 0; k < n; k++) B.spawnQueue.push({ type: weightedPick(ph.pool, Math.random), at: B.t + k * 0.5 });
      B.word(b.id === 'mech' ? 'DEPLOY!' : b.id === 'salty' ? 'ALL HANDS!' : 'AROOO!', 9.6, 2.8, 0, 'warn');
      A.play('bark', 0.6);
    } else if (kind === 'roll' || kind === 'bark' || kind === 'laser') {
      const r = lanes.sort((a, c) => laneScore(c) - laneScore(a))[0];
      const quads = [];
      for (let c = 0; c < D.COLS; c++) { const q = G.tileQuad('warn', 0xffffff, 0.85); q.position.set(c, 0.1, G.laneZ(r)); B.root.add(q); quads.push(q); }
      B.hazards.push({ kind, r, t: kind === 'bark' ? 1.6 : 2.2, quads });
      B.word('!!', 8.4, 1.2, G.laneZ(r), 'warn');
      A.play('warn');
    } else if (kind === 'strike') {
      const targets = [];
      const withDucks = B.ducks.filter(e => !e.duckling && e.c >= 1);
      for (let k = 0; k < 3; k++) {
        let c, r;
        if (withDucks.length && Math.random() < 0.8) { const e = pick(withDucks); c = e.c; r = e.r; }
        else { c = Math.floor(rand(1, 8)); r = pick(lanes); }
        if (targets.some(t => t.c === c && t.r === r)) continue;
        const q = G.tileQuad('warn', 0xffffff, 0.9); q.position.set(c, 0.1, G.laneZ(r)); B.root.add(q);
        targets.push({ c, r, q });
      }
      B.hazards.push({ kind, t: 2.2, targets });
      A.play('warn');
    } else if (kind === 'freeze') {
      let best = 4, bestN = -1;
      for (let c = 2; c < D.COLS; c++) { const n = B.ducks.filter(e => e.c === c).length; if (n > bestN) { bestN = n; best = c; } }
      const quads = [];
      lanes.forEach(r => { const q = G.tileQuad('warn', 0x88ccff, 0.9); q.position.set(best, 0.1, G.laneZ(r)); B.root.add(q); quads.push(q); });
      B.hazards.push({ kind, c: best, t: 2.2, quads });
      B.word('BRRR!', best, 1.6, 0, 'warn');
      A.play('warn');
    } else if (kind === 'fog') {
      addTempFog(4, 14);
      B.word('MIST!', 6, 1.6, 0, 'warn');
    } else if (kind === 'curse') {
      const victims = B.ducks.filter(e => !e.duckling && e.alive).sort(() => Math.random() - 0.5).slice(0, 3);
      const quads = victims.map(e => { const q = G.tileQuad('warn', 0xb070ff, 0.9); q.position.set(e.c, 0.1, G.laneZ(e.r)); B.root.add(q); return q; });
      B.hazards.push({ kind, t: 1.8, quads, victims });
      B.word('BLEH!', 9.4, 2.6, 0, 'warn');
      A.play('ghost');
    } else if (kind === 'graves') {
      const spots = [];
      for (let k = 0; k < 12 && spots.length < 3; k++) {
        const c = 4 + Math.floor(Math.random() * 5), r = pick(lanes);
        if (B.graves[c + ',' + r] || B.grid[c][r].duck || B.grid[c][r].raft || spots.some(p => p.c === c && p.r === r)) continue;
        const q = G.tileQuad('warn', 0x9a9aa8, 0.9); q.position.set(c, 0.1, G.laneZ(r)); B.root.add(q);
        spots.push({ c, r, q });
      }
      B.hazards.push({ kind, t: 1.5, targets: spots, pool: ph.pool });
      B.word('RISE!', 7, 1.6, 0, 'warn');
      A.play('dig');
    }
  }

  function addTempFog(fromCol, dur) {
    for (let c = fromCol; c < D.COLS; c++) for (let r = 0; r < D.LANES; r++) {
      const s = G.sprite('cloudPuff', 1.6, { color: '#c8c8f0', opacity: 0 });
      s.position.set(c + rand(-0.3, 0.3), 0.6 + Math.random() * 0.2, G.laneZ(r) + rand(-0.3, 0.3));
      s.userData = { c, r, base: s.position.clone(), ph: Math.random() * 10, clear: 0, life: dur };
      s.renderOrder = 5;
      B.root.add(s); B.fog.push(s); B.tempFog.push(s);
    }
  }

  function resolveHazard(h) {
    const b = B.boss;
    const z = h.r != null ? G.laneZ(h.r) : 0;
    if (h.quads) h.quads.forEach(q => B.root.remove(q));
    if (h.kind === 'roll') {
      const look = { barkley: 'barrel', salty: 'barrel', frostfang: 'boulder', mech: 'bomb', countess: 'barrel' }[b ? b.id : 'barkley'];
      const m = new T.Group();
      if (look === 'boulder') G.P(m, 'sphere', '#ffffff', [0, 0.38, 0], 0.38, null, { outline: 0.05 });
      else if (look === 'bomb') { G.P(m, 'sphere', '#333344', [0, 0.32, 0], 0.32, null, { outline: 0.05 }); G.P(m, 'cyl', '#aa8844', [0, 0.68, 0], [0.04, 0.12, 0.04]); }
      else { G.P(m, 'cyl', '#a8743a', [0, 0.32, 0], [0.32, 0.6, 0.32], [Math.PI / 2, 0, 0], { outline: 0.05 }); G.P(m, 'cyl', '#555', [0, 0.32, 0], [0.33, 0.06, 0.33], [Math.PI / 2, 0, 0]); }
      m.position.set(9.4, 0, z);
      B.root.add(m);
      B.projs.push({ kind: 'roll', m, x: 9.4, r: h.r, look });
      A.play('whoosh');
    } else if (h.kind === 'bark') {
      B.ducks.filter(e => e.r === h.r).forEach(e => { e.stun = Math.max(e.stun, 4); G.fx('zzz', e.x, 0.9, z); });
      for (let c = 0; c < 9; c += 2) G.fx('ring', c, 0.5, z, { size: 1.2, color: 0xffe14d });
      B.word(b && b.id === 'countess' ? 'AROOOO!' : 'BARK!!', 4, 1.5, z, 'big');
      A.play('bark', 0.5);
    } else if (h.kind === 'laser') {
      G.beam(new T.Vector3(9.4, 0.5, z), new T.Vector3(-0.8, 0.4, z), 0xff3b3b, 0.18, 0.6);
      G.beam(new T.Vector3(9.4, 0.5, z), new T.Vector3(-0.8, 0.4, z), 0xffffff, 0.07, 0.6);
      B.ducks.filter(e => e.r === h.r).forEach(e => { damageDuck(e, 400); G.fx('star', e.x, 0.5, z, { n: 2 }); });
      B.word('ZZZAP!', 4, 1.2, z, 'big');
      A.play('zap'); A.play('boom');
    } else if (h.kind === 'curse') {
      h.victims.forEach(e => { if (!e.alive) return; e.stun = Math.max(e.stun, 6); G.fx('ring', e.x, 0.4, G.laneZ(e.r), { size: 1.2, color: 0xb070ff }); G.fx('zzz', e.x, 0.9, G.laneZ(e.r)); });
      B.word('CURSED!', 4, 1.4, 0, 'big');
    } else if (h.kind === 'graves') {
      h.targets.forEach(tg => {
        B.root.remove(tg.q);
        addGrave(tg.c, tg.r);
        const type = weightedPick(h.pool, Math.random, t => !D.DOGS[t].flies && !D.DOGS[t].big);
        if (type) B.spawnQueue.push({ type, lane: tg.r, x: tg.c + 0.15, at: B.t + 0.4, grave: true });
      });
    } else if (h.kind === 'strike') {
      h.targets.forEach(tg => {
        B.root.remove(tg.q);
        const m = new T.Group();
        const col = b && b.id === 'frostfang' ? '#ffffff' : b && b.id === 'countess' ? '#8a7aa8' : b && b.id === 'mech' ? '#d23a3a' : '#222';
        G.P(m, 'sphere', col, [0, 0, 0], 0.26, null, { outline: 0.06 });
        m.position.set(tg.c + 1.5, 5, G.laneZ(tg.r));
        B.root.add(m);
        B.projs.push({ kind: 'fall', m, c: tg.c, r: tg.r, t: 0, dur: 0.45 });
      });
    } else if (h.kind === 'freeze') {
      B.ducks.filter(e => e.c === h.c).forEach(e => freezeDuck(e, 6));
      for (let k = 0; k < 10; k++) G.fx('snow', h.c, rand(0.2, 1.5), rand(-2.5, 2.5));
      A.play('freeze');
    }
  }

  function freezeDuck(e, sec) {
    if (e.warm || e.duckling) return;
    e.frozen = Math.max(e.frozen, sec);
    if (!e.iceBlock) {
      const m = new T.Mesh(G.geo('box'), G.mat('#bfeaff', { t: 0.55 }));
      m.scale.set(0.7, e.def.tall ? 1.6 : 0.85, 0.7); m.position.y = e.def.tall ? 0.8 : 0.42;
      e.m.add(m); e.iceBlock = m;
    }
    G.fx('ice', e.x, 0.5, G.laneZ(e.r), { n: 3 });
  }

  /* ---------------------------------------------------------- PICKUPS */
  function spawnPickup(type, x, y, z, o) {
    o = o || {};
    const tex = { crumb: 'crumb', silver: 'silver', gold: 'coin', feather: 'feather', trophy: 'coin' }[type];
    if (type === 'silver' && o.value > 5) o.size = 0.55;
    const s = G.sprite(tex, type === 'trophy' ? 0.9 : type === 'crumb' ? (o.value > 25 ? 0.62 : 0.5) : 0.45);
    s.position.set(x, y, z);
    s.renderOrder = 6;
    B.root.add(s);
    const p = { type, s, x, y, z, vy: o.vy != null ? o.vy : 2.5, vx: o.vx != null ? o.vx : rand(-0.6, 0.6), land: o.land != null ? o.land : 0.35, t: 0, life: 14, landed: false, value: o.value || 0, sky: !!o.sky };
    B.pickups.push(p);
    return p;
  }

  function collectPickup(p, auto) {
    if (p.done) return;
    p.done = true;
    B.root.remove(p.s);
    const scr = G.toScreen(p.s.position.x, p.s.position.y, p.s.position.z);
    if (p.type === 'crumb') { B.crumbs += p.value; A.play('crumb'); B.flyIcon('crumb', scr, 'hud-crumbs'); B.tutEvent('collect'); }
    else if (p.type === 'silver' || p.type === 'gold') { const v = (p.value || (p.type === 'gold' ? 25 : 5)) * (B.coinMult || 1); B.stats.coins += v; A.play('coin'); B.flyIcon('coin', scr, 'hud-level'); B.word('+' + v, p.x, 1, p.z, 'coin'); }
    else if (p.type === 'feather') { B.qp = Math.min(B.qpMax, B.qp + 1); A.play('power'); B.flyIcon('feather', scr, 'tool-qp'); }
    else if (p.type === 'trophy') { B.win(); }
  }

  /* ============================================================ INPUT */
  B.pointer = { x: 0, y: 0, tile: null };
  B.onMove = function (sx, sy) {
    B.pointer.x = sx; B.pointer.y = sy;
    const g = G.pickGround(sx, sy);
    B.pointer.tile = g ? { c: Math.round(g.x), r: Math.round(g.z + 2) } : null;
  };
  B.onClick = function (sx, sy) {
    if (!B.active || B.paused || B.over) { if (B.over && B.trophy) collectPickup(B.trophy); return; }
    A.init();
    // pickups first (generous radius)
    const rad = Math.max(30, window.innerWidth / 38);
    let best = null, bd = rad;
    B.pickups.forEach(p => {
      if (p.done) return;
      const s = G.toScreen(p.s.position.x, p.s.position.y, p.s.position.z);
      const dd = Math.hypot(s.x - sx, s.y - sy);
      if (dd < bd) { bd = dd; best = p; }
    });
    if (best) { collectPickup(best); return; }
    if (B.mode === 'whack' && (!B.sel || B.sel.type !== 'card')) {
      let hit = null, hd = Math.max(46, window.innerWidth / 26);
      B.dogs.forEach(d => { if (d.dead || d.burrow) return; const s2 = G.toScreen(d.x, 0.55 + (d.y || 0), d.z); const dd = Math.hypot(s2.x - sx, s2.y - sy); if (dd < hd) { hd = dd; hit = d; } });
      if (hit && B.bonkCd <= 0) {
        B.bonkCd = 0.12;
        hurtDog(hit, 60, { area: true });
        hit.stun = Math.max(hit.stun, 0.25);
        B.stats.bonks++;
        G.fx('star', hit.x, 0.9, hit.z, { n: 3 });
        B.word(pick(['BONK!', 'BOP!', 'BONK!', 'THWACK!']), hit.x, 1.2, hit.z, 'hit');
        A.play('bonk');
        return;
      }
    }
    B.onMove(sx, sy);
    const tl = B.pointer.tile;
    if (!B.sel) { if (tl) B.inspect(tl); return; }
    if (!tl) return;
    const { c, r } = tl;
    if (B.sel.type === 'card' || B.sel.type === 'belt') {
      const id = B.sel.type === 'card' ? B.cards[B.sel.i].id : B.belt[B.sel.i].id;
      const why = tileOk(id, c, r);
      if (why) { A.play('deny'); B.toast(why); return; }
      if (B.sel.type === 'card') {
        const card = B.cards[B.sel.i];
        if (B.crumbs < card.cost || card.t > 0) { A.play('deny'); return; }
        B.crumbs -= card.cost;
        card.t = card.cdMax;
        placeDuck(id, c, r);
      } else {
        B.belt.splice(B.sel.i, 1);
        placeDuck(id, c, r);
      }
      B.select(null);
    } else if (B.sel.type === 'shovel') {
      if (c < 0 || c >= D.COLS || r < 0 || r >= D.LANES) return;
      const g = B.grid[c][r];
      const e = g.duck && !g.duck.duckling ? g.duck : g.raft;
      if (e) { removeDuck(e, 'shovel'); B.stats.shovel++; B.select(null); }
      else A.play('deny');
    } else if (B.sel.type === 'qp') {
      if (c < 0 || c >= D.COLS || r < 0 || r >= D.LANES) return;
      const g = B.grid[c][r];
      const e = g.duck && !g.duck.duckling && g.duck.def.qp ? g.duck : (g.raft && !g.duck ? g.raft : null);
      if (e && e.def.qp && B.qp > 0) { B.qp--; B.stats.qp++; quackPower(e); B.select(null); B.tutEvent('useQP'); }
      else { A.play('deny'); B.toast(e ? 'That duck has no Quack Power' : 'Click one of your ducks'); }
    }
  };
  B.select = function (sel) {
    if (sel && B.sel && sel.type === B.sel.type && sel.i === B.sel.i) sel = null;
    B.sel = sel;
    if (sel) A.play('click');
    if (sel && sel.type === 'card') B.tutEvent('selectCard', B.cards[sel.i].id);
    B.hud.dirty = true;
  };
  B.inspect = function (tl) {
    const g = B.grid[tl.c] && B.grid[tl.c][tl.r];
    if (!g) return;
    const e = g.duck || g.raft;
    if (e && !e.duckling) {
      const extra = e.def.kind === 'mine' ? (e.t > 0 ? ' · arming ' + Math.ceil(e.t) + 's' : ' · ARMED') : '';
      B.toast(e.def.name + ' — ' + Math.max(0, Math.ceil(e.hp)) + '/' + e.maxHp + ' HP' + (e.shield > 0 ? ' +' + Math.ceil(e.shield) + ' shield' : '') + extra);
    }
  };

  /* ============================================================ QUACK POWER */
  function quackPower(e, copied) {
    const z = G.laneZ(e.r);
    const q = e.def.qp;
    A.play('power'); A.play('quack', 1.2);
    G.fx('glow', e.x, 0.5, z, { size: 2.2 });
    G.fx('ring', e.x, 0.3, z, { size: 2.5, color: 0xffd23f });
    G.fx('sparkle', e.x, 0.8, z, { n: 6, spread: 0.8 });
    e.m.userData.puff = 1.5;
    B.word(q.name.toUpperCase() + '!', e.x, 1.5, z, 'power');
    e.frozen = 0; e.stun = 0;
    if (e.iceBlock) { e.m.remove(e.iceBlock); e.iceBlock = null; }
    const dogsIn = (lanes, minX) => B.dogs.filter(d => !d.dead && lanes.indexOf(d.lane) >= 0 && d.x >= (minX == null ? -2 : minX) && d.x < 10.4);
    switch (e.id) {
      case 'bread':
        for (let k = 0; k < 6; k++) spawnPickup('crumb', e.x, 0.6, z, { value: 25, vy: rand(2.5, 4), vx: rand(-1.4, 1.4) });
        break;
      case 'sour':
        e.grown = true; e.m.userData.parts.loaf.visible = true; e.m.userData.grow = 1.25;
        for (let k = 0; k < 3; k++) spawnPickup('crumb', e.x, 0.6, z, { value: 25, vy: rand(2.5, 4), vx: rand(-1.2, 1.2) });
        break;
      case 'puddle': e.barrage = { n: 40, t: 0, every: 2.5 / 40 }; break;
      case 'double': e.fan = 4; e.fanT = 0; break;
      case 'reed': e.armor = 4000; e.armorT = 15; break;
      case 'tall': e.hp = e.maxHp + 3000; e.maxHp += 3000; break;
      case 'snap': {
        e.t = 0;
        const target = dogsIn([e.r], e.x - 0.5).filter(d => d.x <= e.x + 3 && !d.burrow).sort((a, b) => a.x - b.x)[0];
        if (target) { e.m.position.x = target.x; e.x = target.x; snapMine(e, target); }
        break;
      }
      case 'frost':
        dogsIn([e.r - 1, e.r, e.r + 1]).forEach(d => { d.freeze = 5; G.fx('ice', d.x, 0.6, d.z, { n: 2 }); });
        A.play('freeze');
        break;
      case 'lob': {
        const targets = B.dogs.filter(d => dogTargetable(d, 'lob')).sort((a, b) => (b.hp + b.helmet + b.door) - (a.hp + a.helmet + a.door)).slice(0, 6);
        if (B.boss && !B.boss.dead && targets.length < 6) targets.push(B.boss);
        targets.forEach((d, k) => setTimeout(() => lob(e, d, 120, { big: true }), k * 120));
        break;
      }
      case 'gusty':
        dogsIn([e.r], e.x).forEach(d => { pushDog(d, 4); });
        for (let k = 0; k < 8; k++) G.fx('puff', e.x + k, 0.5, z, { n: 1 });
        A.play('whoosh');
        break;
      case 'patch':
        B.ducks.filter(o => Math.abs(o.c - e.c) <= 2 && Math.abs(o.r - e.r) <= 2).forEach(o => { o.hp = o.maxHp; o.invuln = 3; G.fx('heart', o.x, 0.8, G.laneZ(o.r)); });
        A.play('heal');
        break;
      case 'lantern':
        B.flare = 20;
        B.dogs.forEach(d => { if (d.hidden) d.revealed = true; if (Math.abs(d.x - e.x) < 1.6 && Math.abs(d.lane - e.r) <= 1) d.stun = Math.max(d.stun, 2); });
        G.fx('glow', e.x, 2, z, { size: 6, life: 1 });
        break;
      case 'zappy': {
        const targets = B.dogs.filter(d => dogTargetable(d, 'zap')).sort((a, b) => a.x - b.x).slice(0, 12);
        let from = new T.Vector3(e.x, 0.7, z);
        targets.forEach(d => { const to = new T.Vector3(d.x, 0.6, d.z); G.beam(from, to, 0xffe94d, 0.06, 0.4, 0.4); hurtDog(d, 150, { zap: true }); from = to; });
        if (B.boss && !B.boss.dead) { G.beam(from, new T.Vector3(9.6, 1.5, 0), 0xffe94d, 0.06, 0.4, 0.4); hurtBoss(300); }
        A.play('zap');
        break;
      }
      case 'thistle': e.bramble = 4; break;
      case 'storm': {
        for (let k = 0; k < 8; k++) setTimeout(() => {
          if (!B.active) return;
          const cands = B.dogs.filter(d => !d.dead && d.x < 10.2);
          let x, zz;
          if (cands.length) { const d = pick(cands); x = d.x; zz = d.z; } else if (B.boss && !B.boss.dead) { x = 9.6; zz = rand(-2, 2); } else return;
          G.beam(new T.Vector3(x, 6, zz), new T.Vector3(x, 0.2, zz), 0xfff27a, 0.1, 0.35, 0.6);
          areaDamage(x, zz, 1.0, 250, { area: true });
          G.fx('ring', x, 0.2, zz, { size: 2, color: 0xfff27a });
          A.play('zap'); A.play('boom');
        }, k * 220);
        break;
      }
      case 'longbill':
        [e.r - 1, e.r, e.r + 1].forEach(r => {
          if (r < 0 || r > 4) return;
          const zz = G.laneZ(r);
          G.beam(new T.Vector3(e.x + 0.3, 0.6, zz), new T.Vector3(11, 0.6, zz), 0xfff3a8, 0.16, 0.5);
          B.dogs.filter(d => d.lane === r && d.x > e.x - 0.3 && dogTargetable(d, 'pierce')).forEach(d => hurtDog(d, 400, { pierce: true }));
        });
        if (B.boss && !B.boss.dead) hurtBoss(400);
        A.play('zap');
        break;
      case 'raft':
        dogsIn([e.r]).forEach(d => { pushDog(d, 2); d.soak = 6; });
        G.fx('splash', e.x + 1, 0.4, z, { n: 6, spread: 2 });
        A.play('splash');
        break;
      case 'bubble':
        dogsIn([e.r - 1, e.r, e.r + 1]).forEach(d => bubbleDog(d, 4));
        A.play('bubble');
        break;
      case 'drum': B.drumSolo = 6; A.play('drum'); break;
      case 'shield':
        B.ducks.filter(o => Math.abs(o.c - e.c) <= 2 && Math.abs(o.r - e.r) <= 2).forEach(o => giveShield(o, 1500));
        break;
      case 'cocoa': {
        B.ducks.forEach(o => { o.frozen = 0; if (o.iceBlock) { o.m.remove(o.iceBlock); o.iceBlock = null; } });
        const targets = B.dogs.filter(d => dogTargetable(d, 'lob')).sort((a, b) => a.x - b.x).slice(0, 5);
        if (B.boss && !B.boss.dead && targets.length < 5) targets.push(B.boss);
        targets.forEach((d, k) => setTimeout(() => lob(e, d, 200, { cocoa: true, big: true }), k * 150));
        break;
      }
      case 'magnet':
        B.dogs.forEach(d => { if (!d.dead && (d.helmet > 0 && d.def.metal || d.door > 0 || d.pogo)) { stripMetal(e, d); } });
        break;
      case 'hammer':
        B.dogs.filter(d => !d.dead && Math.abs(d.lane - e.r) <= 1 && Math.abs(d.x - e.x) <= 2).forEach(d => { hurtDog(d, 300, { area: true }); d.stun = Math.max(d.stun, 2); });
        if (B.boss && !B.boss.dead && e.x >= 7) hurtBoss(300);
        G.fx('ring', e.x, 0.2, z, { size: 4, color: 0xffcf5a });
        G.fx('dust', e.x, 0.2, z, { n: 6, spread: 2 });
        A.play('smash');
        break;
      case 'piggy':
        for (let k = 0; k < 3; k++) spawnPickup('crumb', e.x, 0.6, z, { value: 25, vy: rand(2.5, 4), vx: rand(-1.2, 1.2) });
        spawnPickup('silver', e.x, 0.7, z, { value: up('piggy', 'A') ? 8 : 5, vy: 3.5 });
        A.play('coin');
        break;
      case 'boomer':
        [e.r - 1, e.r, e.r + 1].forEach(r => { if (B.lv.lanes.indexOf(r) >= 0) throwRang(e, r, 9.8 - e.x, 40, true); });
        break;
      case 'shiny': B.mirror = 10; G.fx('ring', 4, 0.6, 0, { size: 9, color: 0x9fe3ff }); A.play('ping'); break;
      case 'syrup':
        [e.r - 1, e.r, e.r + 1].forEach(r => { if (B.lv.lanes.indexOf(r) >= 0) for (let k = 1; k <= 4; k++) addSyrup(e.c + k, r, 12); });
        A.play('splash');
        break;
      case 'twisty': e.spin = 3; e.spinT = 0; break;
      case 'squeak':
        B.dogs.filter(d => !d.dead && Math.abs(d.lane - e.r) <= 1 && Math.abs(d.x - e.x) <= 3).forEach(d => { pushDog(d, 2.5); d.stun = Math.max(d.stun, 1); });
        G.fx('ring', e.x, 0.4, z, { size: 5, color: 0xffe600 });
        A.play('squeak'); A.play('whoosh');
        break;
      case 'spade': {
        const vics = dogsIn([e.r]).filter(d => Math.abs(d.x - e.x) <= 2 && !d.flying && !d.phantom).slice(0, 3);
        vics.forEach(d => { hurtDog(d, 300, { area: true }); d.stun = Math.max(d.stun, 5); G.fx('dust', d.x, 0.2, d.z, { n: 4 }); });
        A.play('dig');
        break;
      }
      case 'decoy':
        B.dogs.forEach(d => { if (!d.dead && !d.phantom && !d.flying && !d.def.big && d.lane !== e.r && Math.abs(d.lane - e.r) <= 2 && Math.abs(d.x - e.x) <= 4) lureDog(d, e.r); });
        e.invuln = 5;
        A.play('quack', 0.7);
        break;
      case 'sizzle':
        for (let k = 0; k < 10; k++) G.fx('glow', e.x + 0.5 + k * 0.9, 0.5, z, { size: 1.4, color: 0xff7a1a, life: 0.6 });
        B.dogs.forEach(d => { if (!d.dead && d.lane === e.r && d.x > e.x - 0.3 && d.x < 10.2 && !d.burrow) { hurtDog(d, 250, { fire: true, area: true }); igniteDog(d, 16); } });
        if (B.boss && !B.boss.dead) hurtBoss(250);
        A.play('flame');
        break;
      case 'copycat': {
        const behind = e.c > 0 ? B.grid[e.c - 1][e.r].duck : null;
        if (behind && behind.alive && behind.def.qp && behind.id !== 'copycat') { B.word('COPY THAT!', e.x, 1.9, z, 'power'); quackPower(behind, true); }
        else B.dogs.filter(d => !d.dead && d.lane === e.r && Math.abs(d.x - e.x) < 2).forEach(d => hurtDog(d, 120, { area: true }));
        break;
      }
    }
    if (!copied && S.hasItem('shootingstar')) {
      const tough = B.dogs.filter(d => !d.dead && d.x < 10.2).sort((a, b) => (b.hp + b.helmet + b.door) - (a.hp + a.helmet + a.door))[0];
      const tx = tough ? tough.x : 9.6, tz = tough ? tough.z : 0;
      if (tough || (B.boss && !B.boss.dead)) {
        G.beam(new T.Vector3(tx - 3, 7, tz - 2), new T.Vector3(tx, 0.4, tz), 0xfff6a0, 0.14, 0.5);
        G.fx('star', tx, 0.6, tz, { n: 6 });
        if (tough) hurtDog(tough, 300, { area: true }); else hurtBoss(300);
        B.word('SHOOTING STAR!', tx, 1.6, tz, 'power');
      }
    }
  }

  function lureDog(d, r) {
    if (d.laneTarget != null || d.laneMove > 0 || d.biting) return false;
    d.laneFrom = d.lane; d.laneTarget = r; d.laneMove = 0.6; d.laneTravel = 0;
    B.word('?!', d.x, 1.3, d.z, 'hit');
    return true;
  }
  function throwRang(e, r, range, dmg, big) {
    const m = projMesh('rang');
    if (big) m.scale.setScalar(1.5);
    const z = G.laneZ(r);
    m.position.set(e.x + 0.3, 0.6, z);
    B.root.add(m);
    B.projs.push({ kind: 'rang', m, x: e.x + 0.3, x0: e.x + 0.3, r, z, dmg, range, out: true, hitOut: [], hitIn: [], src: e });
    A.play('whoosh');
  }
  function flameAttack(e, range, dmg, burnDps) {
    const z = G.laneZ(e.r);
    let any = false;
    B.dogs.forEach(d => { if (!d.dead && d.lane === e.r && d.x >= e.x - 0.2 && d.x <= e.x + range && d.x < 10.1 && !d.burrow && !d.flying) { hurtDog(d, dmg, { fire: true, area: true }); igniteDog(d, burnDps); any = true; } });
    if (B.boss && !B.boss.dead && e.x + range >= 9.0) hurtBoss(dmg);
    for (let k = 0; k < 4; k++) G.fx('glow', e.x + 0.5 + k * range / 4, 0.55, z, { size: 1.0, color: 0xff8a2a, life: 0.35 });
    A.play('flame');
    return any;
  }
  // Copycat: do the basic attack of the duck behind, at reduced power
  function mimicAttack(e, src) {
    const k = src.def.kind, m = e.def.mult, z = G.laneZ(e.r);
    const ahead = how => firstDogAhead(e, how);
    switch (k) {
      case 'shooter': { if (!ahead('shot') && !bossInRange()) return false; shoot(e, src.id === 'frost' ? 'ice' : 'water', (src.def.dmg || 20) * m); return true; }
      case 'lobber': case 'warmer': { const t = ahead('lob') || (bossInRange() ? B.boss : null); if (!t) return false; lob({ x: e.x, r: e.r, id: src.id, def: src.def }, t, (src.def.dmg || 30) * m); return true; }
      case 'chain': { const t = ahead('zap'); if (!t) return false; G.beam(new T.Vector3(e.x, 0.7, z), new T.Vector3(t.x, 0.6, t.z), 0xffe94d, 0.05, 0.22, 0.35); hurtDog(t, src.def.dmg * m, { zap: true }); return true; }
      case 'piercer': { if (!ahead('pierce') && !bossInRange()) return false; G.beam(new T.Vector3(e.x + 0.4, 0.62, z), new T.Vector3(11, 0.62, z), 0xfff3a8, 0.06, 0.25); B.dogs.forEach(d => { if (d.lane === e.r && d.x > e.x - 0.3 && d.x < 10.1 && dogTargetable(d, 'pierce')) hurtDog(d, src.def.dmg * m, { pierce: true }); }); if (bossInRange()) hurtBoss(src.def.dmg * m); return true; }
      case 'melee': { const near = B.dogs.filter(d => d.lane === e.r && d.x >= e.x - 0.2 && d.x <= e.x + src.def.range && dogTargetable(d, 'melee')); if (!near.length) return false; near.forEach(d => hurtDog(d, src.def.dmg * m, { area: true })); return true; }
      case 'flamer': { const any = B.dogs.some(d => !d.dead && d.lane === e.r && d.x >= e.x - 0.2 && d.x <= e.x + src.def.range); if (!any) return false; flameAttack(e, src.def.range, src.def.dmg * m, src.def.burn); return true; }
      case 'rang': { if (!ahead('air')) return false; throwRang(e, e.r, src.def.range, src.def.dmg * m); return true; }
      case 'twoway': { const back = B.dogs.some(d => !d.dead && d.lane === e.r && d.x < e.x && d.x > -0.5 && dogTargetable(d, 'shot')); if (!ahead('shot') && !back) return false; shoot(e, 'water', 20 * m); shoot(e, 'water', 20 * m, 0, -1); return true; }
      case 'producer': case 'grower': if (B.mode === 'budget') return false; spawnPickup('crumb', e.x, 0.7, z, { value: 15, vy: 3 }); e.copyWait = 24; return true;
      default: { const t = B.dogs.find(d => !d.dead && d.lane === e.r && Math.abs(d.x - e.x) < 1.1 && dogTargetable(d, 'melee')); if (!t) return false; hurtDog(t, 20, { area: true }); return true; }
    }
  }

  /* ============================================================ COMBAT HELPERS */
  function pushDog(d, amt) {
    if (d.dead || d.isBoss) return;
    if (d.def.big) amt *= 0.5;
    d.x = Math.min(10.0, d.x + amt);
    d.biting = null;
    d.m.userData.hurt = 0.6;
  }
  function bubbleDog(d, sec) {
    if (d.dead) return;
    const s = d.def.big ? sec / 2 : sec;
    d.stun = Math.max(d.stun, s); d.bubbled = s;
    if (!d.bubbleS) { d.bubbleS = G.sprite('bubble', 1.1); d.bubbleS.position.y = 0.55; d.m.add(d.bubbleS); }
  }
  function giveShield(o, amt) {
    if (o.duckling) return;
    o.shield = Math.max(o.shield, amt);
    if (!o.bubbleS) { o.bubbleS = G.sprite('bubble', 1.05, { color: '#bfe8ff' }); o.bubbleS.position.y = 0.45; o.m.add(o.bubbleS); }
  }
  function stripMetal(mag, d) {
    if (d.def.metal && (d.helmet > 0 || d.door > 0 || d.pogo)) {
      const a = d.m.userData.parts.armor;
      dropArmor(d, 'YOINK!');
      // flying chunk toward the magnet
      const chunk = new T.Mesh(G.geo('box'), G.mat('#9aa3ad'));
      chunk.scale.setScalar(0.18);
      chunk.position.set(d.x, 0.8, d.z);
      B.root.add(chunk);
      B.projs.push({ kind: 'debris', m: chunk, sx: d.x, sz: d.z, tx: mag.x, tz: G.laneZ(mag.r), t: 0, dur: 0.5 });
      mag.m.userData.puff = 1;
      A.play('armor');
    }
  }
  function areaDamage(x, z, rad, dmg, o) {
    B.dogs.forEach(d => {
      if (d.dead || d.burrow) return;
      if (d.hidden && !d.revealed && !d.lit && !(o && o.trap)) return;
      if (Math.hypot(d.x - x, d.z - z) <= rad) hurtDog(d, dmg, o);
    });
    if (B.boss && !B.boss.dead && x > 8.4) hurtBoss(dmg);
  }

  // projectile meshes
  function projMesh(type) {
    const m = new T.Group();
    switch (type) {
      case 'water': G.P(m, 'sphere', '#5ec8ff', [0, 0, 0], [0.13, 0.11, 0.11], null, { outline: 0.15 }); G.P(m, 'sphere', '#e0f6ff', [0.04, 0.04, 0.04], 0.04, null, { basic: true }); break;
      case 'ice': G.P(m, 'sphere', '#cdf4ff', [0, 0, 0], 0.1, null, { outline: 0.15, e: '#336677' }); break;
      case 'loaf': G.P(m, 'sphere', '#d9893a', [0, 0, 0], [0.18, 0.12, 0.13], null, { outline: 0.1 }); G.P(m, 'box', '#f2d29a', [0, 0.1, 0], [0.04, 0.02, 0.18], [0, 0.4, 0]); break;
      case 'cloud': [[0, 0, 0, 0.14], [0.12, -0.02, 0, 0.1], [-0.12, -0.02, 0, 0.1]].forEach(c => G.P(m, 'sphere', '#7d8aa3', [c[0], c[1], c[2]], c[3], null, { outline: 0.06 })); break;
      case 'cocoa': G.P(m, 'sphere', '#6b4a3a', [0, 0, 0], 0.13, null, { outline: 0.12 }); G.P(m, 'sphere', '#ffffff', [0, 0.08, 0], [0.09, 0.04, 0.09]); break;
      case 'ball': G.P(m, 'sphere', '#d7ff3a', [0, 0, 0], 0.09, null, { outline: 0.15 }); break;
      case 'snow': G.P(m, 'sphere', '#ffffff', [0, 0, 0], 0.12, null, { outline: 0.12 }); break;
      case 'bone': { const s = G.sprite('bone', 0.4); m.add(s); m.userData.spin = s; break; }
      case 'rang': G.P(m, 'box', '#ff9f1c', [0.06, 0, 0], [0.2, 0.04, 0.06], [0, 0, 0.45], { outline: 0.1 }); G.P(m, 'box', '#ff9f1c', [-0.04, 0.07, 0], [0.2, 0.04, 0.06], [0, 0, -0.75], { outline: 0.1 }); break;
    }
    return m;
  }

  function shoot(e, type, dmg, dz, dir) {
    dir = dir || 1;
    const m = projMesh(type);
    const z = G.laneZ(e.r) + (dz || 0);
    m.position.set(e.x + 0.35 * dir, 0.55, z);
    B.root.add(m);
    B.projs.push({ kind: 'shot', type, m, x: e.x + 0.35 * dir, r: e.r, z, dmg, src: e, speed: 7 * dir, twinkle: S.hasItem('twinkle') });
  }

  function lob(e, target, dmg, o) {
    o = o || {};
    if (!B.active || !target || (target.dead && !target.isBoss)) return;
    const type = o.cocoa || e.id === 'cocoa' ? 'cocoa' : e.id === 'storm' ? 'cloud' : 'loaf';
    const m = projMesh(type);
    if (o.big) m.scale.setScalar(1.8);
    const sx = e.x + 0.1, sz = G.laneZ(e.r);
    m.position.set(sx, 0.8, sz);
    B.root.add(m);
    const tx = target.isBoss ? 9.6 : target.x;
    const dur = clamp(0.5 + Math.abs(tx - sx) * 0.09, 0.55, 1.2);
    B.projs.push({ kind: 'lob', type, m, sx, sz, target, t: 0, dur, dmg, src: e, o });
    A.play('throw');
  }

  function snapMine(e, target) {
    const big = up('snap', 'B');
    const z = G.laneZ(e.r);
    B.dogs.forEach(d => { if (!d.dead && d.lane === e.r && Math.abs(d.x - e.x) <= (big ? 1.3 : 0.6) && !d.burrow) hurtDog(d, e.def.dmg, { area: true }); });
    if (target && target.sled) target.sled = false;
    G.fx('star', e.x, 0.5, z, { n: 8 });
    G.fx('puff', e.x, 0.4, z, { n: 3, spread: 0.6 });
    B.word('SNAP!', e.x, 1.2, z, 'big');
    A.play('snap');
    removeDuck(e, 'used');
  }

  /* ============================================================ MAIN UPDATE */
  B.frame = function (rawDt) {
    if (!B.active) return;
    G.updateEnv(B.root, rawDt, B.t);
    if (B.paused) { B.hud.update(); return; }
    const steps = B.speed === 2 ? 2 : 1;
    for (let s = 0; s < steps; s++) B.step(rawDt);
    G.fxUpdate(rawDt * steps);
    G.beamUpdate(rawDt * steps);
    B.updateHover();
    B.hud.update();
    B.updateWords();
  };

  B.step = function (dt) {
    B.t += dt;
    if (B.gridDirty) recomputeGrid();
    if (B.over) { stepEnd(dt); return; }
    B.drumSolo = Math.max(0, B.drumSolo - dt);
    B.flare = Math.max(0, B.flare - dt);
    B.mirror = Math.max(0, B.mirror - dt);
    B.bonkCd = Math.max(0, B.bonkCd - dt);
    for (let i = B.syrup.length - 1; i >= 0; i--) { const sy = B.syrup[i]; sy.t -= dt; sy.m.material.opacity = Math.min(0.95, sy.t); if (sy.t <= 0) { B.root.remove(sy.m); B.syrup.splice(i, 1); } }
    B.portals.forEach(p => { p.ma.userData.spin.rotation.z += dt * 2; p.mb.userData.spin.rotation.z -= dt * 2; p.ma.userData.ring.rotation.y += dt; p.mb.userData.ring.rotation.y += dt; });
    // cards cooldown
    B.cards.forEach(c => { c.t = Math.max(0, c.t - dt); });
    // belt
    if (B.mode === 'belt') stepBelt(dt);
    // tutorial
    if (B.tut) stepTut(dt);
    // sky crumbs
    if (B.crumbBased && B.lv.sky) {
      B.skyT -= dt;
      if (B.skyT <= 0) {
        B.skyT = B.lv.tut === 'basics' ? 6 : rand(7.5, 9.5);
        const c = rand(0.5, 7.5), r = pick(B.lv.lanes);
        spawnPickup('crumb', c, 4.5, G.laneZ(r) + rand(-0.2, 0.2), { value: 25, vy: -0.9, vx: 0, sky: true, land: 0.35 });
      }
    }
    // rush timer
    if (B.mode === 'rush') { B.timeLeft -= dt; if (B.timeLeft <= 0) { B.timeLeft = 0; B.lose('Time ran out!'); return; } }
    // blizzard
    if (B.env.blizzard) stepBlizzard(dt);
    // waves
    stepWaves(dt);
    // spawn queue
    for (let i = B.spawnQueue.length - 1; i >= 0; i--) {
      const q = B.spawnQueue[i];
      if (B.t >= q.at) {
        B.spawnQueue.splice(i, 1);
        if (!q.type) continue;
        const d = spawnDog(q.type, q.lane, q.x);
        if (q.grave) { d.stun = 0.6; G.fx('dust', d.x, 0.3, d.z, { n: 6, spread: 0.6 }); G.fx('star', d.x, 0.8, d.z, { n: 2 }); if (Math.random() < 0.5) B.word('POP!', d.x, 1.1, d.z, 'hit'); A.play('dig'); }
        else if (B.boss) { d.x = rand(9.1, 9.6); G.fx('dust', d.x, 0.3, d.z, { n: 3 }); }
      }
    }
    // lighting (lantern / flare) + dazzle
    B.dogs.forEach(d => { d.lit = B.flare > 0; d.dazzled = false; });
    B.ducks.forEach(e => {
      if (e.id !== 'lantern' || !e.alive) return;
      const rc = e.def.revealCols + (up('lantern', 'A') ? 1 : 0);
      B.dogs.forEach(d => { if (Math.abs(d.x - e.x) <= rc && Math.abs(d.lane - e.r) <= e.def.revealLanes) { d.lit = true; if (up('lantern', 'B')) d.dazzled = true; } });
      B.fog.forEach(f => { if (Math.abs(f.userData.c - e.x) <= rc && Math.abs(f.userData.r - e.r) <= e.def.revealLanes) f.userData.clear = 0.3; });
    });
    if (B.flare > 0) B.fog.forEach(f => f.userData.clear = 0.3);
    // temp fog lifetimes
    for (let i = B.tempFog.length - 1; i >= 0; i--) {
      const f = B.tempFog[i]; f.userData.life -= dt;
      if (f.userData.life <= 0) { f.userData.clear = 1; if (f.material.opacity < 0.05) { B.root.remove(f); B.tempFog.splice(i, 1); B.fog.splice(B.fog.indexOf(f), 1); } }
    }
    // entities
    for (let i = B.ducks.length - 1; i >= 0; i--) { const e = B.ducks[i]; if (e && e.alive) stepDuck(e, dt); }
    for (let i = B.dogs.length - 1; i >= 0; i--) stepDog(B.dogs[i], dt);
    if (B.boss) stepBoss(dt);
    stepProjs(dt);
    stepPickups(dt);
    stepGeese(dt);
    stepHazards(dt);
    // protected tiles
    if (B.protTiles.length) B.dogs.forEach(d => {
      if (d.dead || d.burrow || (d.jump && d.jump.h > 0.5)) return;
      if (B.protTiles.some(p => p[1] === d.lane && Math.abs(d.x - p[0]) < 0.3)) B.lose('A dog trampled a protected tile!');
    });
    checkVictory();
  };

  function recomputeGrid() {
    B.gridDirty = false;
    B.ducks.forEach(e => {
      e.amp = 0; e.warm = false;
      B.ducks.forEach(o => {
        if (o === e || !o.alive) return;
        const near = Math.abs(o.c - e.c) <= 1 && Math.abs(o.r - e.r) <= 1;
        if (!near) return;
        if (o.id === 'drum') e.amp = o.def.amp;
        if (o.id === 'cocoa') e.warm = true;
      });
      if (e.id === 'cocoa') e.warm = true;
      if (e.warm && e.frozen > 0) { e.frozen = 0; if (e.iceBlock) { e.m.remove(e.iceBlock); e.iceBlock = null; } }
    });
  }

  function rate(e) { return (1 + (e.amp || 0)) * (B.drumSolo > 0 ? 2 : 1); }
  function firstDogAhead(e, how, maxX) {
    let best = null;
    B.dogs.forEach(d => {
      if (d.lane !== e.r || d.x < e.x - 0.3 || d.x > (maxX || 10.05)) return;
      if (!dogTargetable(d, how)) return;
      if (!best || d.x < best.x) best = d;
    });
    return best;
  }
  function bossInRange() { return B.boss && !B.boss.dead; }

  function stepDuck(e, dt) {
    const z = G.laneZ(e.r);
    e.invuln = Math.max(0, e.invuln - dt);
    if (e.armorT > 0) { e.armorT -= dt; if (e.armorT <= 0) e.armor = 0; }
    if (e.frozen > 0) { e.frozen -= dt; if (e.frozen <= 0 && e.iceBlock) { e.m.remove(e.iceBlock); e.iceBlock = null; G.fx('ice', e.x, 0.5, z, { n: 3 }); } }
    if (e.stun > 0) { e.stun -= dt; if (Math.random() < dt * 1.5) G.fx('zzz', e.x, 0.9, z); }
    const disabled = e.frozen > 0 || e.stun > 0;
    G.animDuck(e.m, dt, { frozen: e.frozen > 0, stun: e.stun > 0, armed: e.def.kind === 'mine' && e.t <= 0, sleep: e.duckling, rangOut: !!e.rangOut });
    if (e.armor > 0 && Math.random() < dt * 4) G.fx('sparkle', e.x + rand(-0.3, 0.3), rand(0.3, 0.8), z, { color: 0xffd23f });
    if (e.duckling) { if (Math.random() < dt * 0.6) G.fx('zzz', e.x, 0.6, z); return; }
    if (disabled) return;
    const def = e.def, k = def.kind;
    const r = rate(e);
    // special ongoing QP effects
    if (e.barrage) {
      e.barrage.t -= dt;
      while (e.barrage.t <= 0 && e.barrage.n > 0) { e.barrage.t += e.barrage.every; e.barrage.n--; shoot(e, 'water', 20, rand(-0.12, 0.12)); e.m.userData.puff = 0.6; if (e.barrage.n % 4 === 0) A.play('shoot'); }
      if (e.barrage.n <= 0) e.barrage = null;
    }
    if (e.fan > 0) {
      e.fan -= dt; e.fanT -= dt;
      if (e.fanT <= 0) { e.fanT = 0.12; [e.r - 1, e.r, e.r + 1].forEach(rr => { if (rr >= 0 && rr < 5 && B.lv.lanes.indexOf(rr) >= 0) { const fake = { x: e.x, r: rr }; shoot(fake, 'water', 20); } }); A.play('shoot'); e.m.userData.puff = 0.5; }
    }
    if (e.bramble > 0) {
      e.bramble -= dt;
      B.dogs.forEach(d => { if (!d.dead && d.lane === e.r && d.x < 10.1) { hurtDog(d, 60 * dt, { area: true }); if (d.burrow) surface(d); } });
      if (Math.random() < dt * 12) G.fx('leaf', rand(0, 9), 0.2, z);
    }
    switch (k) {
      case 'producer': case 'grower': {
        if (B.mode === 'budget') { if (Math.random() < dt * 0.3) G.fx('zzz', e.x, 0.9, z); break; }
        if (k === 'grower') { e.age = (e.age || 0) + dt; if (!e.grown && e.age >= def.grow) { e.grown = true; e.m.userData.parts.loaf.visible = true; e.m.userData.grow = 1.25; G.fx('sparkle', e.x, 0.7, z, { n: 5, spread: 0.5 }); B.word('RISEN!', e.x, 1.1, z, 'power'); } }
        e.t -= dt;
        if (e.t <= 0) {
          e.t = def.interval;
          let v = k === 'grower' ? (e.grown ? def.bigProd : def.prod) : def.prod;
          if (e.id === 'bread' && up('bread', 'A')) v = 30;
          spawnPickup('crumb', e.x, 0.7, z, { value: v, vy: 3, vx: rand(-0.6, 0.6), land: 0.35 });
          e.m.userData.puff = 1; e.m.userData.quack = 1;
          G.fx('glow', e.x, 0.6, z, { size: 1.2 });
        }
        break;
      }
      case 'shooter': {
        e.t -= dt * r;
        const target = firstDogAhead(e, 'shot');
        const isPuddleUp = e.id === 'puddle' && up('puddle', 'B');
        const interval = isPuddleUp ? 1.25 : def.interval;
        if (e.t <= 0 && (target || bossInRange())) {
          e.t = interval;
          e.volley++;
          const shots = def.shots || 1;
          const extra = e.id === 'double' && up('double', 'A') && e.volley % 4 === 0 ? 1 : 0;
          const type = e.id === 'frost' ? 'ice' : 'water';
          const dmg = e.id === 'frost' && up('frost', 'B') ? 30 : def.dmg;
          for (let s = 0; s < shots + extra; s++) {
            if (s === 0) shoot(e, type, dmg);
            else setTimeout(() => { if (e.alive && B.active) shoot(e, type, dmg); }, s * 140 / B.speed);
          }
          e.m.userData.puff = 1;
          A.play('shoot');
        }
        break;
      }
      case 'lobber': case 'warmer': {
        e.t -= dt * r;
        if (e.t <= 0) {
          const target = firstDogAhead(e, 'lob') || (bossInRange() ? B.boss : null);
          if (target) {
            e.t = def.interval;
            e.lobs = (e.lobs || 0) + 1;
            let dmg = def.dmg;
            if (e.id === 'lob' && up('lob', 'B')) dmg = 50;
            lob(e, target, dmg);
            e.m.userData.puff = 1;
          }
        }
        break;
      }
      case 'chain': {
        e.t -= dt * r;
        if (e.t <= 0) {
          let first = firstDogAhead(e, 'zap');
          if (!first && !bossInRange()) break;
          e.t = def.interval;
          const dmg = up('zappy', 'B') ? 32 : def.dmg;
          const chains = up('zappy', 'A') ? 6 : def.chains;
          let from = new T.Vector3(e.x + 0.2, 0.75, z);
          if (!first) { G.beam(from, new T.Vector3(9.5, 1.5, rand(-1, 1)), 0xffe94d, 0.05, 0.25, 0.4); hurtBoss(dmg); A.play('zap'); e.m.userData.puff = 1; break; }
          const hit = [first];
          let cur = first;
          for (let i = 1; i < chains; i++) {
            let nb = null, nd = def.jump;
            B.dogs.forEach(d => { if (hit.indexOf(d) >= 0 || !dogTargetable(d, 'zap')) return; const dd = Math.hypot(d.x - cur.x, d.z - cur.z); if (dd < nd) { nd = dd; nb = d; } });
            if (!nb) break;
            hit.push(nb); cur = nb;
          }
          hit.forEach(d => { const to = new T.Vector3(d.x, 0.6, d.z); G.beam(from, to, 0xffe94d, 0.05, 0.22, 0.35); from = to; hurtDog(d, dmg, { zap: true }); G.fx('bolt', d.x, 0.9, d.z); });
          e.m.userData.puff = 1;
          A.play('zap');
        }
        break;
      }
      case 'piercer': {
        e.t -= dt * r;
        if (e.t <= 0) {
          const target = firstDogAhead(e, 'pierce');
          if (!target && !bossInRange()) break;
          e.t = def.interval;
          G.beam(new T.Vector3(e.x + 0.4, 0.62, z), new T.Vector3(11, 0.62, z), 0xfff3a8, 0.07, 0.25);
          B.dogs.forEach(d => { if (d.lane === e.r && d.x > e.x - 0.3 && d.x < 10.1 && dogTargetable(d, 'pierce')) hurtDog(d, def.dmg, { pierce: true }); });
          if (bossInRange()) hurtBoss(def.dmg);
          e.m.userData.puff = 1;
          A.play('zap', 1.5);
        }
        break;
      }
      case 'melee': {
        e.t -= dt * r;
        if (e.t <= 0) {
          const near = B.dogs.filter(d => d.lane === e.r && d.x >= e.x - 0.2 && d.x <= e.x + def.range && dogTargetable(d, 'melee'));
          const bossNear = bossInRange() && e.x + def.range >= 9.0;
          if (!near.length && !bossNear) break;
          e.t = def.interval;
          near.forEach(d => { hurtDog(d, def.dmg, { area: true }); if (!d.def.big) d.x = Math.min(10, d.x + 0.12); });
          if (bossNear) hurtBoss(def.dmg);
          e.m.userData.puff = 1;
          G.fx('star', e.x + 0.6, 0.4, z, { n: 2 });
          if (Math.random() < 0.3) B.word('BONK!', e.x + 0.5, 1.1, z, 'hit');
          A.play('bonk');
        }
        break;
      }
      case 'pusher': {
        e.t -= dt * r;
        if (e.t <= 0) {
          const inRange = B.dogs.filter(d => !d.dead && d.lane === e.r && d.x >= e.x - 0.2 && d.x <= e.x + def.range && d.x < 10.1);
          if (!inRange.length) { e.t = 0.4; break; }
          e.t = def.interval;
          const amt = up('gusty', 'A') ? 1.5 : def.push;
          inRange.forEach(d => { pushDog(d, amt); hurtDog(d, def.dmg, { area: true }); if (up('gusty', 'B')) { d.slow = 3; d.slowK = 0.7; } });
          for (let i = 1; i <= 4; i++) G.fx('puff', e.x + i * 0.9, 0.5, z, { vx: 4, life: 0.5 });
          e.m.userData.puff = 1.4;
          A.play('whoosh');
          B.word('WHOOSH!', e.x + 1.5, 1, z, 'hit');
        }
        break;
      }
      case 'healer': {
        e.t -= dt;
        if (e.t <= 0) {
          e.t = def.interval;
          const wide = up('patch', 'B');
          const heal = up('patch', 'A') ? 60 : def.heal;
          let any = false;
          B.ducks.forEach(o => { if (Math.abs(o.c - e.c) <= (wide ? 2 : 1) && Math.abs(o.r - e.r) <= 1 && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + heal); any = true; G.fx('heart', o.x, 0.8, G.laneZ(o.r)); } });
          if (any) { e.m.userData.puff = 0.6; A.play('heal'); }
        }
        break;
      }
      case 'stunner': {
        e.t -= dt * r;
        if (e.t <= 0) {
          const target = firstDogAhead(e, 'shot');
          if (!target) { e.t = 0.3; break; }
          e.t = def.interval;
          bubbleDog(target, def.stun);
          hurtDog(target, def.dmg, { area: true });
          G.fx('bubble', e.x + 0.4, 0.6, z, { n: 3 });
          e.m.userData.puff = 1;
          A.play('bubble');
        }
        break;
      }
      case 'protector': {
        e.t -= dt;
        if (e.t <= 0) {
          e.t = def.interval;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
            const c = e.c + dc, rr = e.r + dr;
            if (c < 0 || c >= D.COLS || rr < 0 || rr >= D.LANES) return;
            const g = B.grid[c][rr];
            const o = g.duck || g.raft;
            if (o && o.alive) giveShield(o, def.shield);
          });
          e.m.userData.puff = 1;
        }
        break;
      }
      case 'magnet': {
        e.t -= dt;
        if (e.t <= 0) {
          let best = null, bd = def.range;
          B.dogs.forEach(d => {
            if (d.dead || d.x > 10.1 || !d.def.metal || !(d.helmet > 0 || d.door > 0 || d.pogo)) return;
            const dd = Math.hypot(d.x - e.x, (d.z - z)) - (d.lane === e.r ? 0.5 : 0);
            if (dd < bd) { bd = dd; best = d; }
          });
          if (best) { stripMetal(e, best); e.t = def.interval; } else e.t = 0.5;
        }
        break;
      }
      case 'mine': {
        if (e.t > 0) { e.t -= dt; if (e.t <= 0) { G.fx('sparkle', e.x, 0.5, z, { n: 3 }); B.word('ARMED!', e.x, 0.9, z, 'power'); } break; }
        const victim = B.dogs.find(d => !d.dead && d.lane === e.r && Math.abs(d.x - e.x) < 0.4 && !d.burrow && !(d.jump && d.jump.h > 0.6));
        if (victim) snapMine(e, victim);
        break;
      }
      case 'spikes': {
        B.dogs.forEach(d => {
          if (d.dead || d.lane !== e.r || Math.abs(d.x - e.x) > 0.5 || (d.jump && d.jump.h > 0.4)) return;
          if (d.burrow) surface(d);
          if (d.sled) { d.sled = false; dropArmor(d, 'CRASH!'); d.speed = d.def.speed * 0.45; A.play('smash'); }
          hurtDog(d, def.dps * dt, { area: true, trap: true });
          if (Math.random() < dt * 3) G.fx('leaf', d.x, 0.3, d.z);
        });
        break;
      }
      case 'coiner': {
        e.t -= dt;
        const maxD = up('piggy', 'B') ? 10 : def.maxDrops;
        if (e.t <= 0 && e.drops < maxD) {
          e.t = def.interval; e.drops++;
          spawnPickup('silver', e.x, 0.7, z, { value: up('piggy', 'A') ? 8 : def.coin, vy: 3 });
          e.m.userData.puff = 1; A.play('coin');
          if (e.drops >= maxD) B.word('BANK FULL!', e.x, 1.1, z, 'coin');
        }
        break;
      }
      case 'rang': {
        if (e.rangOut) break;
        e.t -= dt * r;
        if (e.t <= 0) {
          const range = up('boomer', 'A') ? 6 : def.range;
          const any = B.dogs.some(d => d.lane === e.r && d.x >= e.x - 0.2 && d.x <= e.x + range && dogTargetable(d, 'air')) || (bossInRange() && e.x + range >= 9);
          if (!any) { e.t = 0.3; break; }
          e.t = def.interval; e.rangOut = true;
          throwRang(e, e.r, range, up('boomer', 'B') ? 35 : def.dmg);
          e.m.userData.puff = 1;
        }
        break;
      }
      case 'sticky': {
        e.t -= dt * r;
        if (e.t <= 0) {
          const ahead = B.dogs.some(d => !d.dead && d.lane === e.r && d.x > e.x && d.x < 10.1);
          if (!ahead) { e.t = 0.5; break; }
          e.t = def.interval;
          addSyrup(e.c + 2, e.r, def.dur);
          if (up('syrup', 'B')) addSyrup(e.c + 3, e.r, def.dur);
          e.m.userData.puff = 1; A.play('splash');
          G.fx('splash', e.c + 2, 0.3, z, { n: 2, color: 0xd98a1c });
        }
        break;
      }
      case 'twoway': {
        e.t -= dt * r;
        if (e.spin > 0) {
          e.spin -= dt; e.spinT -= dt;
          if (e.spinT <= 0) {
            e.spinT = 0.15;
            [e.r - 1, e.r, e.r + 1].forEach(rr => { if (B.lv.lanes.indexOf(rr) >= 0) { const f = { x: e.x, r: rr, id: 'twisty' }; shoot(f, 'water', 20); shoot(f, 'water', 20, 0, -1); } });
            e.m.rotation.y += 1.2; A.play('shoot');
          }
          if (e.spin <= 0) e.m.rotation.y = -0.5;
        }
        if (e.t <= 0) {
          const fwd = firstDogAhead(e, 'shot') || bossInRange();
          const back = B.dogs.some(d => d.lane === e.r && d.x < e.x - 0.2 && d.x > -0.6 && dogTargetable(d, 'shot'));
          if (!fwd && !back) break;
          e.t = up('twisty', 'A') ? 1.2 : def.interval;
          if (fwd) shoot(e, 'water', def.dmg);
          if (back) shoot(e, 'water', up('twisty', 'B') ? 30 : def.dmg, 0, -1);
          e.m.userData.puff = 1; A.play('shoot');
        }
        break;
      }
      case 'lure': {
        e.t -= dt;
        if (e.t <= 0) {
          e.t = def.interval;
          const cand = B.dogs.filter(d => !d.dead && !d.phantom && !d.flying && !d.def.big && !d.burrow && Math.abs(d.lane - e.r) === 1 && d.x >= e.x - 0.2 && d.x <= e.x + def.range && d.laneTarget == null && !d.biting).sort((a, b) => a.x - b.x)[0];
          if (cand && lureDog(cand, e.r)) { e.m.userData.puff = 1; A.play('quack', 0.6); G.fx('heart', e.x, 1, z, { color: 0xffd84a }); }
        }
        break;
      }
      case 'flamer': {
        e.t -= dt * r;
        if (e.t <= 0) {
          const range = up('sizzle', 'A') ? 3.5 : def.range;
          const any = B.dogs.some(d => !d.dead && d.lane === e.r && d.x >= e.x - 0.2 && d.x <= e.x + range && d.x < 10.1 && !d.burrow && !d.flying) || (bossInRange() && e.x + range >= 9);
          if (!any) { e.t = 0.3; break; }
          e.t = def.interval;
          flameAttack(e, range, def.dmg, up('sizzle', 'B') ? 16 : def.burn);
          e.m.userData.puff = 1;
        }
        break;
      }
      case 'mimic': {
        if (e.copyWait > 0) { e.copyWait -= dt; break; }
        e.t -= dt * r;
        if (e.t <= 0) {
          const behind = e.c > 0 ? B.grid[e.c - 1][e.r].duck : null;
          const src = behind && behind.alive && behind.id !== 'copycat' && !behind.duckling ? behind : null;
          const did = mimicAttack(e, src || { def: { kind: 'none' } });
          e.t = did ? (src && src.def.interval && src.def.kind !== 'producer' && src.def.kind !== 'grower' ? Math.max(1, src.def.interval) : def.interval) : 0.3;
          if (did) e.m.userData.puff = 1;
        }
        break;
      }
      case 'spade': {
        if (!e.armed) {
          e.t -= dt;
          if (Math.random() < dt * 6) G.fx('dust', e.x + rand(-0.2, 0.2), 0.2, z);
          const sh = e.m.userData.parts.shovel; if (sh) sh.rotation.z = -0.25 + Math.sin(B.t * 12) * 0.4;
          if (e.t <= 0) {
            if (e.digGrave) {
              removeGrave(e.c, e.r);
              spawnPickup('crumb', e.x, 0.7, z, { value: 50, vy: 3 });
              B.word('FOUND CRUMBS!', e.x, 1.2, z, 'coin'); A.play('dig');
              removeDuck(e, 'used');
            } else {
              e.armed = true;
              const pp = e.m.userData.parts; pp.inner.visible = false; pp.hole.visible = true;
              B.word('PIT READY!', e.x, 1, z, 'power'); A.play('dig');
            }
          }
          break;
        }
        const v = B.dogs.find(d => !d.dead && d.lane === e.r && Math.abs(d.x - e.x) < 0.35 && !d.flying && !d.phantom && !d.burrow && !(d.jump && d.jump.h > 0.4));
        if (v) {
          hurtDog(v, def.dmg, { area: true });
          v.stun = Math.max(v.stun, def.stun); v.fallY = -0.4;
          G.fx('dust', e.x, 0.3, z, { n: 6, spread: 0.6 }); G.fx('star', e.x, 0.6, z, { n: 3 });
          B.word('WHOOPS!', e.x, 1.1, z, 'big'); A.play('dig');
          removeDuck(e, 'used');
        }
        break;
      }
      case 'bomb': {
        e.t -= dt;
        e.m.userData.puff = Math.max(e.m.userData.puff, 1 - e.t);
        if (e.t <= 0) {
          B.dogs.forEach(d => { if (!d.dead && Math.abs(d.x - e.x) <= 1.5 && Math.abs(d.lane - e.r) <= 1) hurtDog(d, def.dmg, { area: true }); });
          if (B.boss && !B.boss.dead && e.x >= 7.5) hurtBoss(900);
          G.fx('glow', e.x, 0.5, z, { size: 4, life: 0.6 });
          G.fx('star', e.x, 0.6, z, { n: 10 });
          G.fx('puff', e.x, 0.5, z, { n: 6, spread: 2.5 });
          B.word('KA-QUACK!', e.x, 1.4, z, 'big');
          A.play('boom');
          B.shake = 0.4;
          removeDuck(e, 'used');
        }
        break;
      }
    }
  }

  function surface(d) {
    d.burrow = false;
    d.stun = Math.max(d.stun, 0.6);
    const p = d.m.userData.parts;
    if (p.mound) p.mound.visible = false;
    p.inner.visible = true;
    G.fx('dust', d.x, 0.3, d.z, { n: 5, spread: 0.6 });
    B.word('POP!', d.x, 1, d.z, 'hit');
  }

  function terrainK(d) {
    if (d.x < 0 || d.x > 9.4) return 1;
    if (B.water[d.lane]) return B.current[d.lane] ? 1.6 : 0.8;
    if (B.ice[d.lane]) return 1.4;
    return 1;
  }

  function stepDog(d, dt) {
    const m = d.m, p = m.userData.parts;
    if (d.dead) {
      d.flee -= dt;
      if (d.fleeType === 'run') { d.x += 3.2 * dt; m.rotation.y = 0.45; if (Math.random() < dt * 6) G.fx('tear', d.x, 0.8, d.z); }
      else { d.x += 2.2 * dt; d.y = (d.y || 0) + (2.2 - (2.2 - d.flee) * 4) * dt; p.inner.rotation.z += dt * 9; }
      m.position.set(d.x, 0.07 + Math.max(-0.5, d.y || 0), d.z);
      G.animDog(m, dt, { walking: d.fleeType === 'run', flee: true, fast: true });
      if (d.flee <= 0 || d.x > 12) { B.root.remove(m); B.dogs.splice(B.dogs.indexOf(d), 1); }
      return;
    }
    // statuses
    d.slow = Math.max(0, d.slow - dt);
    d.freeze = Math.max(0, d.freeze - dt);
    d.soak = Math.max(0, d.soak - dt);
    if (d.stun > 0) { d.stun -= dt; if (Math.random() < dt * 3 && !d.bubbled) G.fx('star', d.x, 1.1, d.z, { vy: 0.5, life: 0.4 }); }
    if (d.bubbled > 0) { d.bubbled -= dt; if (d.bubbled <= 0 && d.bubbleS) { m.remove(d.bubbleS); d.bubbleS = null; G.fx('bubble', d.x, 0.6, d.z, { n: 3 }); A.play('pop'); } }
    if (d.soak > 0 && Math.random() < dt * 3) G.fx('splash', d.x + rand(-0.2, 0.2), 0.7, d.z, { size: 0.5 });
    const frozen = d.freeze > 0, stunned = d.stun > 0;
    d.portalCd = Math.max(0, d.portalCd - dt);
    if (d.burn > 0) {
      d.burn -= dt;
      d.hp -= (d.burnDps || 8) * dt;
      if (Math.random() < dt * 8) G.fx('glow', d.x + rand(-0.2, 0.2), 0.6 + Math.random() * 0.4, d.z, { size: 0.5, color: 0xff7a1a, life: 0.3 });
      if (d.were === 0 && d.hp > 0 && d.hp <= d.maxHp * 0.5) startTransform(d);
      if (d.hp <= 0) { killDog(d); return; }
    }
    if (d.transformT > 0) { d.transformT -= dt; d.m.scale.setScalar(1.18 * (1 + 0.35 * (1 - Math.max(0, d.transformT) / 1.6))); if (Math.random() < dt * 10) G.fx('dust', d.x, 0.5, d.z); if (d.transformT <= 0) finishTransform(d); }
    // hidden visuals
    if (d.def.hidden) {
      const vis = d.revealed || d.lit;
      const op = vis ? 1 : 0.28;
      if (d.lastOp !== op) { d.lastOp = op; m.traverse(o => { if (o.isMesh && o.material && o.material.transparent && !o.material.map) o.material.opacity = op; }); if (vis && !d.revealed && !d.toldLit) { d.toldLit = true; B.word('SPOTTED!', d.x, 1.2, d.z, 'hit'); } }
    }
    // burrow visuals
    if (p.mound) { p.mound.visible = d.burrow; p.inner.visible = !d.burrow; if (d.burrow && Math.random() < dt * 4) G.fx('dust', d.x, 0.15, d.z); }
    // submerged
    const onWater = B.water[d.lane] && d.x >= -0.4 && d.x <= 9.4;
    d.submerged = d.def.swims && onWater && !d.biting;
    // nurse heal
    if (d.def.heal && !frozen) B.dogs.forEach(o => { if (!o.dead && o !== d && Math.hypot(o.x - d.x, o.z - d.z) < 1.6 && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + d.def.heal * dt); if (Math.random() < dt * 2) G.fx('heart', o.x, 1, o.z, { size: 0.7 }); } });
    // jump in progress
    if (d.jump) {
      const j = d.jump; j.t += dt;
      const k = Math.min(1, j.t / j.dur);
      d.x = j.from + (j.to - j.from) * k;
      d.y = Math.sin(k * Math.PI) * j.h;
      j.hNow = d.y;
      if (k >= 1) { d.jump = null; d.y = 0; G.fx('dust', d.x, 0.2, d.z, { n: 3 }); }
      m.position.set(d.x, 0.07 + d.y, d.z);
      G.animDog(m, dt, { walking: false, lift: 0 });
      return;
    }
    // lane change (skater)
    if (d.laneMove > 0) {
      d.laneMove -= dt;
      const k = 1 - Math.max(0, d.laneMove) / 0.5;
      d.z = G.laneZ(d.laneFrom) + (G.laneZ(d.laneTarget) - G.laneZ(d.laneFrom)) * k;
      if (k >= 0.5) d.lane = d.laneTarget;
      if (d.laneMove <= 0) { d.z = G.laneZ(d.laneTarget); d.laneTarget = null; if (p.laneArrow) p.laneArrow.visible = false; }
    }
    // find contact duck
    let front = null;
    if (!d.burrow && !d.flying && !d.phantom) {
      let bx = -99;
      B.ducks.forEach(e => {
        if (!e.alive || e.r !== d.lane || !e.blocker) return;
        const g = B.grid[e.c][e.r];
        if (g.raft === e && g.duck) return; // raft hidden under a duck
        const dx = d.x - e.x;
        if (dx < 0.58 && dx > -0.3 && e.x > bx) { bx = e.x; front = e; }
      });
    }
    // special contact reactions
    if (front && !frozen && !stunned) {
      if (d.pogo && !onSyrup(d)) {
        if (front.def.tall) { d.pogo = false; dropArmor(d, 'BONK!'); d.stun = 1; A.play('bonk'); }
        else { d.pogo = false; d.jump = { from: d.x, to: front.x - 0.72, t: 0, dur: 0.75, h: 1.3 }; if (p.armor) p.armor.visible = false; B.word('BOING!', d.x, 1.5, d.z, 'hit'); A.play('bubble'); return; }
      } else if (d.sled) {
        d.sled = false; dropArmor(d, 'CRASH!');
        d.speed = d.def.speed * 0.45;
        if (front.def.kind === 'wall') damageDuck(front, 800); else damageDuck(front, 9999);
        G.fx('dust', d.x, 0.3, d.z, { n: 6, spread: 0.6 }); A.play('smash'); B.shake = 0.2;
        front = null;
      }
    }
    d.biting = front && !frozen ? front : null;
    if (d.biting && d.hidden) d.revealed = true;
    // ranged throwers stop at range
    let throwing = false;
    if (d.def.ranged && d.throws > 0 && !d.biting) {
      const stopX = d.def.ranged === 'bone' ? 8.2 : d.def.ranged === 'snow' ? 6.8 : 7.4;
      if (d.x <= stopX) {
        throwing = true;
        if (!frozen && !stunned) {
          d.throwT -= dt;
          if (d.throwT <= 0) {
            const inLane = B.ducks.filter(e => e.alive && e.r === d.lane && e.x < d.x);
            let target = null;
            if (inLane.length) {
              target = d.def.ranged === 'bone' ? inLane.reduce((a, b) => a.x < b.x ? a : b) : inLane.reduce((a, b) => a.x > b.x ? a : b);
              // tall ducks catch throws aimed past them
              const tall = inLane.filter(e => e.def.tall && e.x > target.x && e.x < d.x).sort((a, b) => b.x - a.x)[0];
              if (tall) target = tall;
            }
            if (target) {
              d.throwT = d.def.ranged === 'bone' ? 4 : d.def.ranged === 'snow' ? 6 : 3;
              d.throws--;
              const type = d.def.ranged === 'bone' ? 'bone' : d.def.ranged === 'snow' ? 'snow' : 'ball';
              const mm = projMesh(type); mm.position.set(d.x, 0.9, d.z); B.root.add(mm);
              const reflect = B.mirror > 0 || B.ducks.some(sd => sd.alive && sd.def.kind === 'reflector' && sd.stun <= 0 && sd.frozen <= 0 && Math.abs(sd.c - target.c) <= 1 && Math.abs(sd.r - target.r) <= 1);
              B.projs.push({ kind: 'enemy', type, m: mm, sx: d.x, sz: d.z, target, t: 0, dur: clamp(0.4 + (d.x - target.x) * 0.1, 0.5, 1.2), reflect, from: d });
              if (p.racket) p.racket.rotation.z = 0.8;
              if (p.catArm) p.catArm.rotation.z = -1.2;
              A.play('throw');
            } else { d.throwT = 1; throwing = false; d.throws = 0; }
          }
          if (p.racket) p.racket.rotation.z += (-0.4 - p.racket.rotation.z) * dt * 4;
          if (p.catArm) p.catArm.rotation.z += (0 - p.catArm.rotation.z) * dt * 3;
        }
      }
    }
    // biting / smashing
    if (d.biting && !stunned) {
      const e = d.biting;
      if (d.def.smash) {
        d.smashT -= dt;
        if (d.smashT <= 0) { d.smashT = 2.4; damageDuck(e, d.def.smash); B.word('SMASH!', e.x, 1.2, d.z, 'big'); A.play('smash'); G.fx('dust', e.x, 0.3, d.z, { n: 5, spread: 0.6 }); B.shake = 0.25; }
      } else {
        damageDuck(e, d.def.bite * (d.biteMult || 1) * dt);
        if (e.def.bouncer && !d.def.big && e.alive) {
          e.squeakT = (e.squeakT || 0) + dt;
          if (e.squeakT >= e.def.every) { e.squeakT = 0; pushDog(d, up('squeak', 'A') ? 1.2 : e.def.push); A.play('squeak'); B.word('SQUEAK!', e.x, 1.1, d.z, 'hit'); e.m.userData.puff = 1; }
        }
        d.biteT -= dt;
        if (d.biteT <= 0) { d.biteT = 0.9; if (Math.random() < 0.25) B.word(pick(['CHOMP', 'MUNCH', 'NOM']), e.x + 0.2, 0.9, d.z, 'chomp'); if (Math.random() < 0.3) A.play('bark', 1 + Math.random() * 0.3); }
      }
      if (e.id === 'reed' && up('reed', 'A')) hurtDog(d, 15 * dt, { area: true });
    }
    // bulldozer flattens spikes
    if (d.def.big) B.ducks.forEach(e => { if (e.alive && e.def.kind === 'spikes' && e.r === d.lane && Math.abs(e.x - d.x) < 0.4) { removeDuck(e, 'eaten'); } });
    // movement
    const moving = !d.biting && !throwing && !frozen && !stunned;
    if (moving) {
      let sp = d.speed * terrainK(d);
      if (d.slow > 0) sp *= d.slowK;
      if (!d.flying && onSyrup(d)) sp *= syrupK();
      d.x -= sp * dt;
      // skater lane change logic
      if (d.def.laneChange && d.x < 9.6 && d.laneTarget == null) {
        d.laneTravel += sp * dt;
        if (d.laneTravel > 2.2) {
          d.laneTravel = 0;
          const opts = [d.lane - 1, d.lane + 1].filter(r => B.lv.lanes.indexOf(r) >= 0);
          if (opts.length) { d.laneTarget = pick(opts); d.laneWarn = 1.0; p.laneArrow.visible = true; p.laneArrow.material.rotation = d.laneTarget > d.lane ? Math.PI / 2 : -Math.PI / 2; }
        }
      }
      if (d.burrow && d.x < 1.8) surface(d);
    }
    if (d.laneWarn > 0) { d.laneWarn -= dt; if (d.laneWarn <= 0) { d.laneFrom = d.lane; d.laneMove = 0.5; G.fx('dust', d.x, 0.2, d.z); } }
    // portals
    if (!d.flying && !d.burrow && d.portalCd <= 0 && B.portals.length) for (const pt of B.portals) {
      if (d.lane === pt.a.r && Math.abs(d.x - pt.a.c) < 0.15) {
        G.fx('glow', d.x, 0.5, d.z, { size: 1.6, color: 0xc070ff }); G.fx('sparkle', d.x, 0.6, d.z, { n: 3 });
        d.x = pt.b.c - 0.12; d.lane = pt.b.r; d.z = G.laneZ(pt.b.r);
        d.laneTarget = null; d.laneMove = 0; d.laneWarn = 0; d.biting = null; d.portalCd = 1.5;
        if (p.laneArrow) p.laneArrow.visible = false;
        G.fx('glow', d.x, 0.5, d.z, { size: 1.6, color: 0xc070ff });
        A.play('portal');
        break;
      }
    }
    // pond check
    if (d.x < -0.35) {
      const goose = B.geese[d.lane];
      if (goose && goose.state === 'ready') launchGoose(d.lane);
      else if ((!goose || goose.state === 'gone') && d.x < -1.0) B.lose('A dog reached the pond!');
    }
    let yOff = d.submerged ? -0.42 : 0;
    if (d.flying) yOff += 0.9 + Math.sin(B.t * 2 + d.x) * 0.08;
    if (d.fallY) { d.fallY += d.fallY > 0 ? -dt * 2 : dt * 0.1; if (Math.abs(d.fallY) < 0.03) d.fallY = 0; yOff += d.fallY; }
    m.position.set(d.x, 0.07 + yOff, d.z);
    if (d.submerged && Math.random() < dt * 2) G.fx('splash', d.x, 0.15, d.z, { size: 0.7 });
    G.animDog(m, dt, { walking: moving, biting: !!d.biting, frozen, stun: stunned, slow: d.slow > 0, fast: d.speed > 0.45 });
    if (frozen && !d.iceTint) { d.iceTint = true; if (!d.iceBlock) { d.iceBlock = new T.Mesh(G.geo('box'), G.mat('#bfeaff', { t: 0.5 })); d.iceBlock.scale.set(0.9, 0.9, 0.6); d.iceBlock.position.y = 0.45; m.add(d.iceBlock); } }
    if (!frozen && d.iceTint) { d.iceTint = false; if (d.iceBlock) { m.remove(d.iceBlock); d.iceBlock = null; } }
  }

  function launchGoose(r) {
    const g = B.geese[r];
    g.state = 'charging';
    B.stats.goose++;
    B.word('HONK!!', 0, 1.5, G.laneZ(r), 'big');
    A.play('honk');
    g.m.rotation.y = 0;
    if (S.hasItem('honk')) {
      [r - 1, r + 1].forEach(rr => B.dogs.forEach(d => { if (!d.dead && d.lane === rr && d.x < 3) pushDog(d, 2); }));
      G.fx('ring', 0, 0.5, G.laneZ(r), { size: 4, color: 0xffffff });
    }
  }
  function stepGeese(dt) {
    B.geese.forEach((g, r) => {
      if (!g) return;
      if (g.state === 'ready') { G.animDuck(g.m, dt, {}); return; }
      if (g.state !== 'charging') return;
      g.x += 7 * dt;
      g.m.position.x = g.x;
      g.m.position.y = 0.07 + Math.abs(Math.sin(g.x * 4)) * 0.15;
      G.animDuck(g.m, dt, { celebrate: false });
      g.m.userData.parts.wingL.rotation.x = Math.sin(B.t * 30) * 0.8; g.m.userData.parts.wingR.rotation.x = -Math.sin(B.t * 30) * 0.8;
      B.dogs.forEach(d => { if (!d.dead && d.lane === r && Math.abs(d.x - g.x) < 0.5) { killDog(d, 'tumble'); G.fx('star', d.x, 0.8, d.z, { n: 4 }); } });
      if (Math.random() < dt * 10) G.fx('dust', g.x - 0.3, 0.2, G.laneZ(r));
      if (g.x > 11.5) { g.state = 'gone'; B.root.remove(g.m); }
    });
  }

  function stepBoss(dt) {
    const b = B.boss;
    const m = b.m;
    b.invuln = Math.max(0, b.invuln - dt);
    if (b.dead) {
      b.deadT += dt;
      m.position.x += dt * 2.5; m.position.y += dt * (3 - b.deadT * 3);
      m.userData.parts.inner.rotation.z += dt * 2;
      if (b.deadT > 2.4 && !B.over) {
        if (B.rumble && B.rumble.idx < B.rumble.list.length - 1) nextRumbleBoss();
        else B.win();
      }
      G.animDog(m, dt, { flee: true });
      return;
    }
    b.anim = Math.max(0, b.anim - dt);
    G.animDog(m, dt, { walking: false, bark: b.anim > 0, biting: b.anim > 0 });
    m.position.y = 0.07 + Math.abs(Math.sin(B.t * 1.5)) * 0.08 + (b.anim > 0 ? Math.sin(b.anim * 8) * 0.12 : 0);
    if (b.id === 'salty') m.rotation.z = Math.sin(B.t * 1.2) * 0.04;
    b.atkT -= dt;
    if (b.atkT <= 0 && !B.over) { b.atkT = b.def.phases[b.phase].cd; bossAttack(); }
    b.ambT -= dt;
    if (b.ambT <= 0) {
      b.ambT = 22 - b.phase * 3;
      const pool = Object.assign({}, B.lv.pool);
      let pts = 2 + b.phase * 1.5 + (B.lv.w - 1) * 0.8;
      while (pts > 0.5) { const k = weightedPick(pool, Math.random, d => D.DOGS[d].pts <= pts + 0.5); if (!k) break; B.spawnQueue.push({ type: k, at: B.t + Math.random() * 3 }); pts -= D.DOGS[k].pts; }
    }
  }

  function nextRumbleBoss() {
    B.root.remove(B.boss.m);
    B.rumble.idx++;
    spawnBoss(B.rumble.list[B.rumble.idx]);
    B.crumbs += 400;
    B.qp = Math.min(B.qpMax, B.qp + 1);
    B.banner('NEXT: ' + B.boss.def.name.toUpperCase() + '!', 2.6, 'boss');
    B.hud.dirty = true;
  }

  function stepHazards(dt) {
    for (let i = B.hazards.length - 1; i >= 0; i--) {
      const h = B.hazards[i];
      h.t -= dt;
      const pulse = 0.55 + Math.sin(B.t * 14) * 0.35;
      (h.quads || []).forEach(q => q.material.opacity = pulse);
      (h.targets || []).forEach(tg => tg.q.material.opacity = pulse);
      if (h.t <= 0) { B.hazards.splice(i, 1); resolveHazard(h); }
    }
  }

  function stepProjs(dt) {
    for (let i = B.projs.length - 1; i >= 0; i--) {
      const p = B.projs[i];
      let done = false;
      if (p.kind === 'shot') {
        p.x += p.speed * dt;
        p.m.position.x = p.x;
        if (p.twinkle && Math.random() < dt * 6) G.fx('sparkle', p.x, 0.6, p.z, { color: 0xfff6a0 });
        // collide
        let hit = null;
        B.dogs.forEach(d => { if (d.lane === p.r && Math.abs(d.x - p.x) < 0.3 && dogTargetable(d, 'shot') && (!hit || d.x < hit.x)) hit = d; });
        if (hit) {
          hurtDog(hit, p.dmg, { water: p.type === 'water' });
          const src = p.src;
          if (src && src.id === 'frost') {
            if (hit.soak > 0) { hit.freeze = Math.max(hit.freeze, 1); }
            hit.slow = src.def.slowTime; hit.slowK = up('frost', 'A') ? 0.35 : 0.5;
            G.fx('snow', p.x, 0.6, p.z, { n: 2 });
          } else {
            hit.soak = Math.max(hit.soak, src && src.id === 'puddle' && up('puddle', 'A') ? 6 : 3);
            G.fx('splash', p.x, 0.6, p.z);
            A.play('splash');
          }
          done = true;
        } else if (B.boss && !B.boss.dead && p.x >= 9.1) { hurtBoss(p.dmg); G.fx('splash', p.x, 0.8, p.z); done = true; }
        else if (p.x > 11 || p.x < -1.5) done = true;
      } else if (p.kind === 'lob') {
        p.t += dt;
        const tg = p.target;
        const tx = tg.isBoss ? 9.5 : tg.x, tz = tg.isBoss ? p.sz : tg.z;
        const k = Math.min(1, p.t / p.dur);
        p.m.position.set(p.sx + (tx - p.sx) * k, 0.8 + Math.sin(k * Math.PI) * 2.0 - k * 0.3, p.sz + (tz - p.sz) * k);
        p.m.rotation.z -= dt * 8;
        if (k >= 1) {
          done = true;
          const src = p.src;
          const x = p.m.position.x, z = p.m.position.z;
          if (p.type === 'cloud') {
            const rad = up('storm', 'A') ? 1.4 : src.def.splash;
            B.dogs.forEach(d => { if (!d.dead && !d.burrow && Math.hypot(d.x - x, d.z - z) <= rad && (!d.hidden || d.revealed || d.lit)) { hurtDog(d, p.dmg, { lob: true, water: true }); d.soak = Math.max(d.soak, 3); if (up('storm', 'B')) { d.slow = 2; d.slowK = 0.7; } } });
            if (tg.isBoss) hurtBoss(p.dmg);
            G.fx('splash', x, 0.4, z, { n: 5, spread: 1.4 });
            G.fx('ring', x, 0.2, z, { size: rad * 2, color: 0x9fd8ff });
            A.play('splash');
          } else if (p.type === 'cocoa') {
            if (tg.isBoss) hurtBoss(p.dmg);
            B.dogs.forEach(d => { if (!d.dead && !d.burrow && Math.hypot(d.x - x, d.z - z) <= (p.o.big ? 0.8 : src.def.splash || 0.6) && (!d.hidden || d.revealed || d.lit)) hurtDog(d, p.dmg, { lob: true }); });
            G.fx('puff', x, 0.4, z, { n: 2, color: 0xa07050 });
            A.play('splash');
          } else {
            if (tg.isBoss) hurtBoss(p.dmg);
            else if (!tg.dead) {
              hurtDog(tg, p.dmg, { lob: true });
              if (src && src.id === 'lob' && up('lob', 'A') && (src.lobs % 3 === 0)) { tg.stun = Math.max(tg.stun, 1); B.word('BUTTERED!', tg.x, 1.1, tg.z, 'hit'); }
            }
            G.fx('crumbBits', x, 0.4, z, { n: 4 });
            G.fx('star', x, 0.5, z, { n: 1 });
          }
        }
      } else if (p.kind === 'enemy') {
        p.t += dt;
        const tg = p.target;
        const k = Math.min(1, p.t / p.dur);
        const tx = tg.x, tz = G.laneZ(tg.r);
        p.m.position.set(p.sx + (tx - p.sx) * k, 0.9 + Math.sin(k * Math.PI) * (p.type === 'bone' ? 2.4 : 1.2), p.sz + (tz - p.sz) * k);
        if (p.m.userData.spin) p.m.userData.spin.material.rotation += dt * 12;
        if (k >= 1) {
          done = true;
          if (p.reflect && p.from && !p.from.dead) {
            G.fx('sparkle', tx, 0.8, tz, { n: 3 }); B.word('PING!', tx, 1.2, tz, 'hit'); A.play('ping');
            const mm = projMesh(p.type); mm.position.set(tx, 0.9, tz); B.root.add(mm);
            B.projs.push({ kind: 'refl', type: p.type, m: mm, sx: tx, sz: tz, target: p.from, t: 0, dur: 0.55 });
          } else if (tg.alive) {
            if (p.type === 'snow') { freezeDuck(tg, 4); G.fx('snow', tx, 0.5, tz, { n: 4 }); A.play('freeze'); }
            else { damageDuck(tg, p.type === 'bone' ? 70 : 45); G.fx('star', tx, 0.6, tz, { n: 2 }); A.play('bonk'); }
          }
        }
      } else if (p.kind === 'refl') {
        p.t += dt;
        const tg = p.target, k = Math.min(1, p.t / p.dur);
        p.m.position.set(p.sx + (tg.x - p.sx) * k, 0.9 + Math.sin(k * Math.PI) * 1.0, p.sz + (tg.z - p.sz) * k);
        if (k >= 1) { done = true; if (!tg.dead) { hurtDog(tg, 90, { area: true }); G.fx('star', tg.x, 0.8, tg.z, { n: 3 }); A.play('bonk'); if (p.type === 'snow') tg.freeze = Math.max(tg.freeze, 2); } }
      } else if (p.kind === 'rang') {
        const sp = 6;
        if (p.out) { p.x += sp * dt; if (p.x >= p.x0 + p.range || p.x > 10.2) p.out = false; }
        else p.x -= sp * dt;
        p.m.position.set(p.x, 0.6, p.z);
        p.m.rotation.y += dt * 18;
        B.dogs.forEach(d => {
          if (d.lane !== p.r || Math.abs(d.x - p.x) > 0.35 || !dogTargetable(d, 'air')) return;
          const list = p.out ? p.hitOut : p.hitIn;
          if (list.indexOf(d) >= 0) return;
          list.push(d); hurtDog(d, p.dmg, { area: true }); G.fx('star', d.x, 0.7, d.z, { n: 1 });
        });
        if (p.out && B.boss && !B.boss.dead && p.x >= 9.1 && !p.bossHit) { p.bossHit = true; hurtBoss(p.dmg); }
        if (!p.out && p.x <= p.x0) { done = true; if (p.src) p.src.rangOut = false; }
      } else if (p.kind === 'debris') {
        p.t += dt;
        const k = Math.min(1, p.t / p.dur);
        p.m.position.set(p.sx + (p.tx - p.sx) * k, 0.8 + Math.sin(k * Math.PI) * 0.8, p.sz + (p.tz - p.sz) * k);
        p.m.rotation.x += dt * 10;
        if (k >= 1) { done = true; G.fx('sparkle', p.tx, 0.9, p.tz); }
      } else if (p.kind === 'roll') {
        p.x -= 5 * dt;
        p.m.position.x = p.x;
        p.m.rotation.z += dt * 12 * (p.look === 'barrel' ? 0 : 1);
        if (p.look === 'barrel') p.m.children.forEach(c => c.rotation.y += dt * 10);
        const hitDuck = B.ducks.find(e => e.alive && e.r === p.r && Math.abs(e.x - p.x) < 0.4 && !(B.grid[e.c][e.r].raft === e && B.grid[e.c][e.r].duck));
        if (hitDuck) {
          damageDuck(hitDuck, 1500);
          G.fx('star', p.x, 0.5, G.laneZ(p.r), { n: 6 }); G.fx('dust', p.x, 0.3, G.laneZ(p.r), { n: 5 });
          B.word(p.look === 'bomb' ? 'KABOOM!' : 'CRASH!', p.x, 1.2, G.laneZ(p.r), 'big');
          A.play(p.look === 'bomb' ? 'boom' : 'smash'); B.shake = 0.3;
          done = true;
        } else if (p.x < -1.5) done = true;
      } else if (p.kind === 'fall') {
        p.t += dt;
        const k = Math.min(1, p.t / p.dur);
        p.m.position.set(p.c + 1.5 * (1 - k), 5 * (1 - k) + 0.2, G.laneZ(p.r));
        if (k >= 1) {
          done = true;
          const g = B.grid[p.c][p.r];
          if (B.mirror > 0) { B.word('PING!', p.c, 1.1, G.laneZ(p.r), 'hit'); A.play('ping'); }
          else [g.duck, g.raft].forEach(e => { if (e && e.alive) damageDuck(e, 600); });
          G.fx('dust', p.c, 0.3, G.laneZ(p.r), { n: 6, spread: 0.8 }); G.fx('star', p.c, 0.5, G.laneZ(p.r), { n: 4 });
          B.word('BOOM!', p.c, 1.1, G.laneZ(p.r), 'big');
          A.play('boom'); B.shake = 0.25;
        }
      }
      if (done) { B.root.remove(p.m); B.projs.splice(i, 1); }
    }
  }

  function stepPickups(dt) {
    const auto = S.hasItem('quickhands');
    for (let i = B.pickups.length - 1; i >= 0; i--) {
      const p = B.pickups[i];
      if (p.done) { B.pickups.splice(i, 1); continue; }
      p.t += dt;
      if (!p.landed) {
        if (p.sky) { p.y += p.vy * dt; }
        else { p.vy -= 9 * dt; p.y += p.vy * dt; p.x += p.vx * dt; }
        if (p.y <= p.land && (p.sky || p.vy < 0)) { p.y = p.land; p.landed = true; p.t = 0; }
      } else {
        p.y = p.land + Math.abs(Math.sin(p.t * 3)) * 0.08;
        if (auto && p.type !== 'trophy' && p.t > 1.5) { collectPickup(p, true); continue; }
        if (p.type === 'trophy' && p.t > 3.5) { collectPickup(p, true); continue; }
        if (p.t > p.life - 2) p.s.material.opacity = Math.max(0, (p.life - p.t) / 2);
        if (p.t > p.life) { p.done = true; B.root.remove(p.s); continue; }
      }
      p.s.position.set(p.x, p.y, p.z);
      p.s.material.rotation = p.type === 'feather' ? Math.sin(p.t * 3) * 0.3 : 0;
    }
  }

  /* ---------------------------------------------------------- waves */
  function aliveHp() { let h = 0; B.dogs.forEach(d => { if (!d.dead) h += d.hp + d.helmet + d.door; }); return h; }

  function stepWaves(dt) {
    if (B.boss) return;
    B.waveT += dt;
    const total = B.endless ? Infinity : B.waves.length;
    if (B.waveIdx + 1 >= total) return;
    if (B.pendingFlag > 0) {
      B.pendingFlag -= dt;
      if (B.pendingFlag <= 0) launchWave();
      return;
    }
    const gap = B.lv.waveGap || 26;
    const early = B.waveIdx >= 0 && B.waveT >= 6 && aliveHp() <= B.waveHp * 0.3 && B.spawnQueue.length === 0;
    const firstReady = B.waveIdx < 0 && B.t >= B.nextWaveAt;
    if (firstReady || (B.waveIdx >= 0 && (B.waveT >= gap || early))) {
      const nextW = B.endless ? null : B.waves[B.waveIdx + 1];
      const nextFlag = B.endless ? ((B.endlessWave + 1) % 5 === 0) : (nextW.flag || nextW.final);
      if (nextFlag) {
        B.pendingFlag = 3.5;
        const isFinal = !B.endless && nextW.final;
        B.banner(isFinal ? 'FINAL PACK!' : 'A HUGE PACK IS APPROACHING!', 3.2, 'flag');
        A.play('wave');
      } else launchWave();
    }
  }
  function launchWave() {
    B.waveIdx++;
    B.waveT = 0;
    let w;
    if (B.endless) { B.endlessWave++; w = endlessWave(B.endlessWave); if (B.endlessWave > 1) B.banner('WAVE ' + B.endlessWave, 1.6); }
    else w = B.waves[B.waveIdx];
    if (B.waveIdx === 0 && !B.endless) { B.banner('THE DOGS ARE COMING!', 2.2); A.play('bark', 0.8); }
    const spread = w.flag ? 6 : 3.5;
    let hp = 0;
    w.dogs.forEach((type, k) => {
      const at = B.t + (type === 'banner' ? 0 : rand(0.2, spread)) + (w.flag ? 0.3 : 0);
      B.spawnQueue.push({ type, at });
      const d = D.DOGS[type]; hp += d.hp + (d.helmet || 0) + (d.door || 0);
    });
    B.waveHp = hp;
    if (B.env.graveRise && (B.env.graveRise === 'every' || w.flag || w.final) && Object.keys(B.graves).length) riseFromGraves(B.endless ? { mutt: 3, helmet: 1, runner: 1 } : B.lv.pool);
    B.hud.dirty = true;
  }

  function checkVictory() {
    if (B.over || B.endless || B.boss) return;
    if (B.waveIdx >= B.waves.length - 1 && B.spawnQueue.length === 0 && B.pendingFlag <= 0) {
      const alive = B.dogs.filter(d => !d.dead);
      if (!alive.length && !B.trophy) {
        const last = B.lastDeadPos || { x: 4, z: 0 };
        B.trophy = spawnPickup('trophy', clamp(last.x, 1, 8), 1.2, last.z, { vy: 3, land: 0.45 });
        B.word('VICTORY!', clamp(last.x, 1, 8), 1.8, last.z, 'big');
        B.over = true; B.overWin = true;
        B.endT = 0;
      }
    }
  }

  function stepBelt(dt) {
    B.beltT -= dt;
    if (B.beltT <= 0 && B.belt.length < 8 && B.beltTypes.length) {
      B.beltCount++;
      B.beltT = B.beltCount < 4 ? 2.2 : rand(4.2, 5.6);
      // weighted so that cheap utility cards come a bit more often
      B.belt.push({ id: pick(B.beltTypes), x: 1 });
      B.hud.dirty = true;
    }
    // slide left
    B.belt.forEach((c, i) => { const target = i * (1 / 8); c.x = Math.max(target, c.x - dt * 0.35); });
  }

  function stepBlizzard(dt) {
    if (B.blizWarn > 0) {
      B.blizWarn -= dt;
      if (Math.random() < dt * 30) G.fx('snow', rand(3, 10), rand(0.5, 3), rand(-2.5, 2.5), { vx: -3 });
      if (B.blizWarn <= 0) {
        B.ducks.filter(e => e.c >= 6).forEach(e => freezeDuck(e, 8));
        for (let k = 0; k < 30; k++) G.fx('snow', rand(5, 9), rand(0.2, 2), rand(-2.5, 2.5), { vx: -2 });
        A.play('freeze');
        B.word('FROZEN!', 7, 1.6, 0, 'warn');
      }
      return;
    }
    B.blizT -= dt;
    if (B.blizT <= 0) { B.blizT = B.env.blizzard; B.blizWarn = 3; B.banner('BLIZZARD INCOMING!', 2.5, 'warn'); A.play('whoosh'); }
  }

  /* ============================================================ END */
  B.lose = function (reason) {
    if (B.over) return;
    B.over = true; B.overWin = false; B.endT = 0; B.reason = reason;
    A.play('lose');
    B.banner(reason || 'The dogs got the bread!', 3, 'bad');
    B.select(null);
  };
  B.win = function () {
    if (B.endDone) return;
    if (!B.over) { B.over = true; B.overWin = true; B.endT = 0; }
    if (B.trophy && !B.trophy.done) { B.trophy.done = true; B.root.remove(B.trophy.s); }
    B.trophyTaken = true;
    if (!B.winSounded) { B.winSounded = true; A.play('win'); B.banner('POND SAVED!', 2.5, 'win'); for (let k = 0; k < (G.high() ? 40 : 18); k++) G.fx('confetti', rand(0, 8), 3, rand(-2, 2)); if (S.hasItem('confetti')) for (let k = 0; k < 40; k++) G.fx('confetti', rand(-1, 9), 4, rand(-2, 2)); }
  };
  function stepEnd(dt) {
    B.endT += dt;
    // keep the world alive a little
    B.ducks.forEach(e => G.animDuck(e.m, dt, { celebrate: B.overWin && B.trophyTaken }));
    B.dogs.slice().forEach(d => { if (d.dead) stepDog(d, dt); else G.animDog(d.m, dt, { bark: true }); });
    stepPickups(dt);
    stepProjs(dt);
    if (B.boss) stepBoss(dt);
    if (B.overWin && !B.trophyTaken) return; // wait for trophy click (auto after a moment)
    if (B.endT > (B.overWin ? 2.4 : 2.6) && !B.endDone) {
      B.endDone = true;
      const res = { win: B.overWin, level: B.lv, reason: B.reason, stats: B.stats, wave: B.endless ? B.endlessWave : 0 };
      D.UI.battleEnd(res);
    }
  }

  B.cleanup = function () {
    B.active = false;
    B.over = false; B.endDone = false; B.trophy = null; B.trophyTaken = false; B.winSounded = false; B.reason = null;
    if (B.hud && B.hud.hide) B.hud.hide();
    const w = $('words'); if (w) w.innerHTML = '';
    B.wordsLive = [];
  };

  /* ============================================================ TUTORIAL */
  B.showTut = function () {
    const st = B.tut && B.tut.steps[B.tut.i];
    const box = $('coach');
    document.querySelectorAll('.tut-hl').forEach(el => el.classList.remove('tut-hl'));
    if (!st) { box.classList.add('hidden'); if (B.tut) { S.data.tutDone[B.tut.key] = true; S.save(); } B.tut = null; return; }
    box.classList.remove('hidden');
    $('coach-text').textContent = st.text;
    $('coach-img').src = G.portrait('coach');
    if (st.hl) {
      let el = null;
      if (st.hl.startsWith('card:')) { const i = B.cards.findIndex(c => c.id === st.hl.slice(5)); el = document.querySelector('#hud-cards .card[data-i="' + i + '"]'); }
      else if (st.hl === 'shovel') el = $('tool-shovel');
      else if (st.hl === 'qp') el = $('tool-qp');
      if (el) el.classList.add('tut-hl');
    }
    B.tut.t = 0;
  };
  function stepTut(dt) {
    const st = B.tut.steps[B.tut.i];
    if (!st) return;
    B.tut.t += dt;
    if (st.wait === 'time' && B.tut.t >= st.arg) { B.tut.i++; B.showTut(); }
  }
  B.tutEvent = function (ev, arg) {
    if (!B.tut) return;
    const st = B.tut.steps[B.tut.i];
    if (!st) return;
    if (st.wait === ev && (st.arg == null || st.arg === arg)) {
      B.tut.i++;
      if (ev === 'place' && B.laneHl.length && arg === 'puddle') { /* keep glow until bread */ }
      if (B.tut.i >= 4) { B.laneHl.forEach(q => B.root.remove(q)); B.laneHl = []; }
      B.showTut();
    }
  };
  B.tutNext = function () { if (!B.tut) return; B.tut.i++; if (B.tut.i >= 4) { B.laneHl.forEach(q => B.root.remove(q)); B.laneHl = []; } B.showTut(); };
  B.skipTut = function () { if (!B.tut) return; B.tut.i = B.tut.steps.length; B.laneHl.forEach(q => B.root.remove(q)); B.laneHl = []; B.showTut(); };

  /* ============================================================ HUD + WORDS */
  B.wordsLive = [];
  B.word = function (text, x, y, z, cls) {
    const host = $('words');
    if (!host || B.wordsLive.length > (G.high() ? 14 : 8)) return;
    const el = document.createElement('div');
    el.className = 'word ' + (cls || '');
    el.textContent = text;
    el.style.setProperty('--rot', (Math.random() * 16 - 8).toFixed(1) + 'deg');
    host.appendChild(el);
    const w = { el, x, y, z, t: 0, life: cls === 'big' || cls === 'power' ? 1.4 : 1.0 };
    B.wordsLive.push(w);
    B.placeWord(w);
  };
  B.placeWord = function (w) {
    const s = G.toScreen(w.x, w.y + w.t * 0.6, w.z);
    w.el.style.transform = 'translate(' + s.x.toFixed(0) + 'px,' + s.y.toFixed(0) + 'px) translate(-50%,-50%) rotate(var(--rot))';
  };
  B.updateWords = function () {
    const dt = 1 / 60;
    for (let i = B.wordsLive.length - 1; i >= 0; i--) {
      const w = B.wordsLive[i];
      w.t += dt;
      if (w.t >= w.life) { w.el.remove(); B.wordsLive.splice(i, 1); continue; }
      B.placeWord(w);
      w.el.style.opacity = w.t > w.life - 0.3 ? ((w.life - w.t) / 0.3).toFixed(2) : '1';
    }
    // camera shake
    if (B.shake > 0) {
      B.shake = Math.max(0, B.shake - 1 / 60);
      G.camera.position.x += (Math.random() - 0.5) * B.shake * 0.3;
      G.camera.position.y += (Math.random() - 0.5) * B.shake * 0.3;
      if (B.shake <= 0) fitCamera();
    }
  };

  B.flyIcon = function (kind, from, toId) {
    const to = $(toId);
    if (!to) return;
    const r = to.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'fly fly-' + kind;
    el.style.left = from.x + 'px'; el.style.top = from.y + 'px';
    $('fly').appendChild(el);
    requestAnimationFrame(() => { el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = (r.top + r.height / 2) + 'px'; el.style.transform = 'translate(-50%,-50%) scale(0.6)'; });
    setTimeout(() => { el.remove(); to.classList.remove('bump'); void to.offsetWidth; to.classList.add('bump'); }, 520);
  };

  B.banner = function (text, sec, cls) {
    const el = $('banner');
    el.textContent = text;
    el.className = 'banner show ' + (cls || '');
    clearTimeout(B.bannerTO);
    B.bannerTO = setTimeout(() => { el.className = 'banner'; }, (sec || 2) * 1000);
  };
  B.toast = function (text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(B.toastTO);
    B.toastTO = setTimeout(() => el.classList.remove('show'), 1800);
  };
  B.dogIntro = function (type) {
    const d = D.DOGS[type];
    const el = $('dogpop');
    el.innerHTML = '<div class="dp-tag">NEW DOG!</div><img src="' + G.portrait('dog:' + type) + '" alt=""><div><b>' + d.name + '</b><p>' + d.desc + '</p><p class="dp-counter">Counter: ' + d.counter + '</p></div>';
    el.classList.add('show');
    A.play('bark', 1.1);
    clearTimeout(B.dogTO);
    B.dogTO = setTimeout(() => el.classList.remove('show'), 7000);
  };

  B.updateHover = function () {
    const tl = B.pointer.tile;
    let show = false;
    if (tl && B.sel && !B.over && tl.c >= 0 && tl.c < D.COLS && tl.r >= 0 && tl.r < D.LANES) {
      show = true;
      B.hl.position.set(tl.c, 0.1, G.laneZ(tl.r));
      let ok = true;
      if (B.sel.type === 'card' || B.sel.type === 'belt') {
        const id = B.sel.type === 'card' ? B.cards[B.sel.i].id : (B.belt[B.sel.i] || {}).id;
        ok = id && !tileOk(id, tl.c, tl.r);
      } else if (B.sel.type === 'shovel') { const g = B.grid[tl.c][tl.r]; ok = !!((g.duck && !g.duck.duckling) || g.raft); }
      else if (B.sel.type === 'qp') { const g = B.grid[tl.c][tl.r]; const e = g.duck || g.raft; ok = !!(e && e.def && e.def.qp && !e.duckling); }
      B.hl.material.color.set(ok ? (B.sel.type === 'qp' ? 0xffd23f : B.sel.type === 'shovel' ? 0xff9f43 : 0x9bff7a) : 0xff4a4a);
    }
    B.hl.visible = show;
    // glow valid QP targets
    if (B.sel && B.sel.type === 'qp') B.ducks.forEach(e => { if (e.def && e.def.qp && !e.duckling && Math.random() < 0.08) G.fx('sparkle', e.x + rand(-0.3, 0.3), rand(0.4, 1), G.laneZ(e.r), { color: 0xffd23f }); });
  };

  /* HUD DOM */
  B.hud = {
    dirty: true, last: {},
    build() {
      $('hud').classList.remove('hidden');
      const cards = $('hud-cards');
      cards.innerHTML = '';
      cards.classList.toggle('belt', B.mode === 'belt');
      if (B.mode !== 'belt') {
        B.cards.forEach((c, i) => {
          const d = D.DUCKS[c.id];
          const el = document.createElement('button');
          el.className = 'card';
          el.dataset.i = i;
          el.title = d.name + ' — ' + d.role + ' · ' + c.cost + ' crumbs · ' + c.cdMax + 's cooldown';
          el.innerHTML = '<img src="' + G.portrait('duck:' + c.id) + '" alt=""><span class="cost">' + c.cost + '</span><span class="cdmask"></span><kbd>' + (i + 1) + '</kbd><span class="cname">' + d.name + '</span>';
          el.addEventListener('pointerdown', ev => { ev.stopPropagation(); A.init(); B.select({ type: 'card', i }); });
          cards.appendChild(el);
        });
      }
      $('hud-crumbs').classList.toggle('hidden', !B.crumbBased);
      $('tool-qp').classList.toggle('hidden', !B.qpEnabled);
      $('hud-boss').classList.toggle('hidden', !B.boss);
      $('hud-progress').classList.toggle('hidden', !!B.boss || B.endless);
      $('hud-timer').classList.toggle('hidden', B.mode !== 'rush');
      $('hud-endless').classList.toggle('hidden', !B.endless);
      $('hud-level').textContent = B.endless ? 'Endless Pond' : (B.lv.bonus ? '' : B.lv.id + ' · ') + B.lv.name;
      if (B.boss) $('boss-name').textContent = B.boss.def.name;
      // progress flags
      const flags = $('prog-flags');
      flags.innerHTML = '';
      if (!B.boss && !B.endless) B.waves.forEach((w, i) => { if (w.flag || w.final) { const f = document.createElement('span'); f.className = 'pflag'; f.style.left = ((i + 1) / B.waves.length * 100) + '%'; flags.appendChild(f); } });
      this.last = {};
      this.dirty = true;
      $('btn-speed').textContent = B.speed === 2 ? '2×' : '1×';
      $('btn-speed').classList.toggle('on', B.speed === 2);
      this.update();
    },
    hide() { $('hud').classList.add('hidden'); $('coach').classList.add('hidden'); $('dogpop').classList.remove('show'); $('banner').className = 'banner'; },
    update() {
      const L = this.last;
      if (L.crumbs !== B.crumbs) { $('crumb-val').textContent = Math.floor(B.crumbs); L.crumbs = B.crumbs; }
      // cards
      if (B.mode !== 'belt') {
        const els = $('hud-cards').children;
        B.cards.forEach((c, i) => {
          const el = els[i]; if (!el) return;
          const cool = c.t > 0, cant = B.crumbs < c.cost;
          const key = (cool ? 1 : 0) + '|' + (cant ? 1 : 0) + '|' + (B.sel && B.sel.type === 'card' && B.sel.i === i ? 1 : 0) + '|' + Math.ceil(c.t * 10);
          if (el._k === key) return;
          el._k = key;
          el.classList.toggle('cool', cool);
          el.classList.toggle('cant', cant);
          el.classList.toggle('sel', !!(B.sel && B.sel.type === 'card' && B.sel.i === i));
          el.querySelector('.cdmask').style.height = (cool ? (c.t / c.cdMax * 100) : 0) + '%';
        });
      } else {
        const host = $('hud-cards');
        // rebuild belt cards when count changes, reposition each frame
        if (host.querySelectorAll('.beltcard').length !== B.belt.length || this.dirty) {
          host.innerHTML = '<div class="belt-strip"></div>';
          B.belt.forEach((c, i) => {
            const el = document.createElement('button');
            el.className = 'card beltcard';
            el.innerHTML = '<img src="' + G.portrait('duck:' + c.id) + '" alt=""><span class="cname">' + D.DUCKS[c.id].name + '</span>';
            el.addEventListener('pointerdown', ev => { ev.stopPropagation(); A.init(); B.select({ type: 'belt', i }); });
            host.appendChild(el);
          });
        }
        const kids = host.querySelectorAll('.beltcard');
        B.belt.forEach((c, i) => { const el = kids[i]; if (!el) return; el.style.left = (c.x * 100).toFixed(2) + '%'; el.classList.toggle('sel', !!(B.sel && B.sel.type === 'belt' && B.sel.i === i)); });
        if (B.sel && B.sel.type === 'belt' && !B.belt[B.sel.i]) B.sel = null;
      }
      this.dirty = false;
      // tools
      const selT = B.sel ? B.sel.type : '';
      if (L.selT !== selT) { $('tool-shovel').classList.toggle('sel', selT === 'shovel'); $('tool-qp').classList.toggle('sel', selT === 'qp'); document.body.classList.toggle('qp-mode', selT === 'qp'); L.selT = selT; }
      if (L.qp !== B.qp || L.qpMax !== B.qpMax) {
        let pips = '';
        for (let i = 0; i < B.qpMax; i++) pips += '<i class="' + (i < B.qp ? 'on' : '') + '"></i>';
        $('qp-pips').innerHTML = pips;
        $('tool-qp').classList.toggle('empty', B.qp <= 0);
        L.qp = B.qp; L.qpMax = B.qpMax;
      }
      // progress
      if (!B.boss && !B.endless) {
        const total = B.waves.length;
        const prog = B.waveIdx < 0 ? 0 : (B.waveIdx + 1) / total;
        if (L.prog !== prog) { $('prog-fill').style.width = (prog * 100) + '%'; $('prog-label').textContent = B.waveIdx < 0 ? 'Get ready' : 'Wave ' + (B.waveIdx + 1) + ' / ' + total; L.prog = prog; }
      }
      if (B.boss) {
        if (L.bossId !== B.boss.id) { $('boss-name').textContent = B.boss.def.name + (B.rumble ? ' (' + (B.rumble.idx + 1) + '/' + B.rumble.list.length + ')' : ''); L.bossId = B.boss.id; L.boss = -1; }
        const f = Math.max(0, B.boss.hp / B.boss.maxHp);
        if (L.boss !== f) { $('boss-fill').style.width = (f * 100) + '%'; $('boss-phase').textContent = 'Phase ' + (B.boss.phase + 1) + ' / ' + B.boss.def.phases.length; L.boss = f; }
      }
      if (B.mode === 'rush') { const s = Math.ceil(B.timeLeft); if (L.time !== s) { $('hud-timer').textContent = '⏱ ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); $('hud-timer').classList.toggle('low', s <= 20); L.time = s; } }
      if (B.endless && L.ew !== B.endlessWave) { $('hud-endless').textContent = 'Wave ' + Math.max(1, B.endlessWave) + ' · Best ' + S.data.endless.best; L.ew = B.endlessWave; }
      // geese indicator
      const gs = B.geese.map(g => g ? g.state[0] : '-').join('');
      if (L.gs !== gs) {
        L.gs = gs;
        $('hud-geese').innerHTML = B.geese.map((g, r) => g ? '<i class="' + (g.state === 'ready' ? 'on' : '') + '" title="Lane ' + (r + 1) + ' Goose Patrol"></i>' : '').join('');
      }
    }
  };

  // small hooks used by automated playtests
  B.debug = {
    collectAll() { B.pickups.slice().forEach(p => { if (!p.done && p.type !== 'trophy') collectPickup(p); }); },
    tileOk, place(id, c, r) { const card = B.cards.find(k => k.id === id); if (!card || card.t > 0 || B.crumbs < card.cost || tileOk(id, c, r)) return false; B.crumbs -= card.cost; card.t = card.cdMax; placeDuck(id, c, r); return true; },
    placeFree(id, c, r) { if (tileOk(id, c, r)) return false; placeDuck(id, c, r); return true; },
    qp(c, r) { const g = B.grid[c][r]; const e = g.duck || g.raft; if (!e || !e.def.qp || B.qp <= 0) return false; B.qp--; B.stats.qp++; quackPower(e); return true; }
  };

  B.setSpeed = function (s) { B.speed = s; S.data.settings.speed = s; S.save(); $('btn-speed').textContent = s === 2 ? '2×' : '1×'; $('btn-speed').classList.toggle('on', s === 2); };
})(window.DVD);
