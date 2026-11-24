/* Square Off 2 — secret characters, Square's classic (Square Off 1) upgrade pools, and Challenges */
'use strict';
(function () {
  const M = SO.M;
  SO.ROLE_COLOR.Secret = '#4a4a55';
  // Square Off 1 stores the best round it has seen cleared here (same site, same storage)
  SO.so1Best = () => { try { return Number(localStorage.getItem('square-off-best')) || 0; } catch (e) { return 0; } };

  /* ================= secret characters ================= */
  Object.assign(SO.KITS, {
    original: { name: 'Square', title: 'the Original', role: 'Secret', secret: true, stars: 3, icon: 'blaster',
      look: { body: '#d5ff63', dark: '#a6bf67', off: '#596446', plate: '#d5ff63', jet: '#596446', acc: null, original: true },
      desc: 'The square that started it all, straight out of the first Square Off. He plays by the old rules — and so does his boss.',
      traits: ['Peashooter (Blaster), no utility, and no dash until he finds Air Dash', 'Classic Upgrades: he draws ONLY from his own pool of Square Off 1 upgrades, modernized', 'Classic Boss: the boss starts with a single cannon and only gets Square Off 1 upgrades too — no chassis evolutions'],
      get unlockText() { const b = SO.so1Best(); return 'Beat Round 5 in the original Square Off (your best there: ' + (b ? 'Round ' + b : 'none yet') + ')'; }, weapons: ['blaster'], utility: null, ups: [], flags: { original: 1, noDash: 1 }, mods: B => { B.s.critChance = 0; } },
    vortrox: { name: 'Vortrox', title: 'the Wave', role: 'Secret', secret: true, stars: 4, icon: 'mobility',
      look: { body: '#3ad6ff', dark: '#1a7fb0', off: '#ff3fb4', plate: '#e8fbff', jet: '#152338', acc: 'wave' },
      desc: 'Doesn\'t fly — it zigzags. Hold thrust to slice upward on a sharp diagonal, let go to dive. No drift, no momentum.',
      traits: ['Blaster + Eraser Pulse', 'Wave Flight: hold SPACE to move straight up, release to move straight down — going up stops a fall instantly', 'Moves 1.2× faster'],
      unlockText: 'Clear the Featherlight challenge', weapons: ['blaster'], utility: 'eraser', ups: [], flags: { wave: 1 }, mods: B => { B.s.speedMul *= 1.2; } },
    lumen: { name: 'Lumen', title: 'the Lantern', role: 'Secret', secret: true, stars: 3, icon: 'prism',
      look: { body: '#ffe98a', dark: '#c9a43a', off: '#7b5cff', plate: '#fffaf0', jet: '#23395b', acc: 'lumen' },
      desc: 'Learned to fight with the lights out. Anything that drifts into her glow slows to a crawl.',
      traits: ['Prism Projector + Eraser Pulse', 'Lantern: enemy bullets within 150px of you move 40% slower'],
      unlockText: 'Clear the secret challenge Lights Out', weapons: ['prism'], utility: 'eraser', ups: [], flags: { lantern: 1 } },
    flip: { name: 'Flip', title: 'the Inverted', role: 'Secret', secret: true, stars: 4, icon: 'mobility',
      look: { body: '#ff9ad0', dark: '#c45a90', off: '#22d3c5', plate: '#fffaf0', jet: '#23395b', acc: 'flip' },
      desc: 'Spent too long upside down and decided to keep the trick. Gravity is a suggestion.',
      traits: ['Ricochet Disc + Blink Bomb', 'Gravity Flip: press S to flip gravity — fall up to the ceiling or back down', 'Thrust always pushes against your current gravity; platforms only catch you right-side up'],
      unlockText: 'Clear the secret challenge Upside Down', weapons: ['disc'], utility: 'blink', ups: [], flags: { flip: 1 } },
    tabby: { name: 'Tabby', title: 'the Nine Lives', role: 'Secret', secret: true, stars: 3, icon: 'defense',
      look: { body: '#f2a65a', dark: '#b8692a', off: '#1b1a2e', plate: '#fffaf0', jet: '#3a3850', acc: 'tabby' },
      desc: 'Survived the run where one hit meant the end. Now no single hit can ever take more than one life.',
      traits: ['Scattergun + Repair Kit', 'Nine Lives: you have 9 lives instead of HP — every hit costs exactly one life, however big', 'Repairs restore lives (25 HP = 1 life); max HP and shield upgrades add lives'],
      unlockText: 'Clear the secret challenge One and Done', weapons: ['scatter'], utility: 'repair', ups: [], flags: { lives: 1 } },
    dynamo: { name: 'Dynamo', title: 'the Perpetual', role: 'Secret', secret: true, stars: 3, icon: 'gatling',
      look: { body: '#9be36a', dark: '#5a9a32', off: '#ffd23f', plate: '#fffaf0', jet: '#152338', acc: 'dynamo' },
      desc: 'Couldn\'t stop moving, so it turned motion into firepower. Standing still is the only thing it\'s bad at.',
      traits: ['Gatling + Overdrive', 'Perpetual Motion: the faster you move, the faster you fire (up to +70%)', 'Standing still: weapons fire 35% slower'],
      unlockText: 'Clear the secret challenge Restless', weapons: ['gatling'], utility: 'overdrive', ups: [], flags: { dynamo: 1 } }
  });
  SO.SECRET_KITS = ['original', 'vortrox', 'lumen', 'flip', 'tabby', 'dynamo'];
  SO.KIT_ORDER.push(...SO.SECRET_KITS);

  /* ================= Square's classic player pool (Square Off 1, modernized) ================= */
  const UPS = SO.PLAYER_UPS, BY = SO.PLAYER_UP;
  function up(o) { o.max = o.max || 1; o.rarity = o.rarity || 'common'; o.tags = o.tags || []; o.req = o.req || (() => true); o.orig = true; UPS.push(o); BY[o.id] = o; }
  const wep = (B, id) => B.weapons.find(w => w.id === id);
  // [Square Off 1 name, Square Off 2 weapon, first upgrade name, second upgrade name, second kind]
  const CLASSIC_WEAPONS = [
    ['Peashooter', 'blaster', 'Extra barrel', 'Heavy rounds', 'dmg'], ['Shotgun', 'scatter', 'More pellets', 'Buckshot', 'dmg'], ['Rocket launcher', 'rocket', 'Big boom', 'Warhead', 'dmg'],
    ['Laser emitter', 'laser', 'Focused light', 'Hot beam', 'dmg'], ['Burst rifle', 'gatling', 'Longer burst', 'Hair trigger', 'rate'], ['Seeker pods', 'seeker', 'Swarm protocol', 'Lock on', 'dmg'],
    ['Plasma cannon', 'plasma', 'Event horizon', 'Unstable core', 'dmg'], ['Boomerang rack', 'boomerang', 'Two way street', 'Return to sender', 'dmg'], ['Needler', 'needle', 'Pin cushion', 'Stitching machine', 'rate'],
    ['Tesla coil', 'tesla', 'Long wire', 'Overvoltage', 'dmg'], ['Orbiting blades', 'blades', 'Saw halo', 'Sharp company', 'dmg'], ['Railgun', 'railgun', 'Capacitor bank', 'Overcharge', 'dmg'],
    ['Flamethrower', 'flame', 'Long flame', 'Napalm', 'dmg'], ['Grenade launcher', 'mortar', 'Demolition kit', 'Heavy shells', 'dmg'], ['Disc launcher', 'disc', 'Round trip', 'Sharpened rim', 'dmg'],
    ['Shard cannon', 'prism', 'Crystal garden', 'Hard light', 'dmg'], ['Gravity orbs', 'gravity', 'Deep space', 'Crushing pull', 'dmg'], ['Echo blaster', 'echo', 'Repeat yourself', 'Loud echo', 'dmg'],
    ['Drone wing', 'drones', 'Extra company', 'Armed escort', 'dmg']
  ];
  for (const [old, id, modName, powName, powKind] of CLASSIC_WEAPONS) {
    const d = SO.WEAPONS[id]; if (!d) continue;
    if (id !== 'blaster') up({ id: 'o_w_' + id, name: old, cat: 'weapon', kind: 'new', weapon: id, icon: d.icon, rarity: 'rare', tags: d.tags, desc: 'Adds the ' + d.name + ': ' + d.desc,
      reqText: B => 'Free weapon slot (' + B.weapons.length + '/' + B.maxWeapons + ')', req: B => !wep(B, id) && B.weapons.length < B.maxWeapons, apply: B => { B.weapons.push({ id, mods: 0, evo: null }); } });
    up({ id: 'o_m_' + id, name: modName, cat: 'weapon', kind: 'mod', weapon: id, icon: d.icon, max: d.mod.max, tags: d.tags, desc: old + ': ' + d.mod.desc,
      reqText: () => 'Requires ' + old, req: B => !!wep(B, id) && wep(B, id).mods < d.mod.max, apply: B => { wep(B, id).mods++; } });
    up({ id: 'o_p_' + id, name: powName, cat: 'weapon', kind: 'mod', weapon: id, icon: d.icon, max: 3, tags: d.tags, desc: powKind === 'rate' ? old + ' fires 25% faster.' : old + ' deals 30% more damage.',
      reqText: () => 'Requires ' + old, req: B => !!wep(B, id), apply: B => { const w = wep(B, id); if (powKind === 'rate') w.rateX = (w.rateX || 1) * 1.25; else w.dmgX = (w.dmgX || 1) * 1.3; } });
  }
  const noDash = B => !!B.f.noDash;
  up({ id: 'o_health', name: 'Bigger heart', cat: 'defense', icon: 'defense', max: 3, desc: '+30 maximum health.', apply: B => { B.s.maxHp += 30; } });
  up({ id: 'o_damage', name: 'Mean little square', cat: 'global', icon: 'global', max: 3, desc: 'All weapons deal 18% more damage.', apply: B => { B.s.dmgMul *= 1.18; } });
  up({ id: 'o_rate', name: 'Trigger happy', cat: 'global', icon: 'global', max: 3, desc: 'All weapons fire 15% faster.', apply: B => { B.s.rateMul *= 1.15; } });
  up({ id: 'o_speed', name: 'Featherweight', cat: 'mobility', icon: 'mobility', max: 3, desc: 'Move sideways 10% faster.', apply: B => { B.s.speedMul *= 1.1; } });
  up({ id: 'o_shield', name: 'Safety bubble', cat: 'defense', icon: 'defense', max: 3, desc: 'Block one additional hit each round. Recharges between rounds.', apply: B => { B.s.ablative += 1; } });
  up({ id: 'o_dash', name: 'Air dash', cat: 'mobility', icon: 'mobility', rarity: 'rare', desc: 'Unlock SHIFT: a quick dash in your movement direction. Briefly invulnerable.', req: noDash, apply: B => { B.f.noDash = 0; } });
  up({ id: 'o_armor', name: 'Soft landing', cat: 'defense', icon: 'defense', max: 4, desc: 'Take 10% less damage from every attack.', apply: B => { B.s.dmgTakenMul *= 0.9; } });
  up({ id: 'o_crit', name: 'Lucky shot', cat: 'crit', icon: 'crit', max: 5, desc: '+10% chance for attacks to critically strike.', apply: B => { B.s.critChance += 0.1; } });
  up({ id: 'o_critpow', name: 'Cruel luck', cat: 'crit', icon: 'crit', max: 3, desc: 'Critical hits deal an extra 35% damage.', reqText: () => 'Requires Lucky shot', req: B => B.s.critChance > 0, apply: B => { B.s.critMul += 0.35; } });
  up({ id: 'o_thrust', name: 'Hot engine', cat: 'mobility', icon: 'mobility', max: 4, desc: 'Upward thrust accelerates 12% harder.', apply: B => { B.s.thrustMul *= 1.12; } });
  up({ id: 'o_gravity', name: 'Cloud nine', cat: 'mobility', icon: 'mobility', max: 3, desc: 'Fall with 12% less gravity for finer control in the air.', apply: B => { B.s.gravMul *= 0.88; } });
  up({ id: 'o_dashrate', name: 'Quick getaway', cat: 'mobility', icon: 'mobility', max: 3, desc: 'Air dash recharges 18% sooner.', reqText: () => 'Requires Air dash', req: B => !noDash(B), apply: B => { B.s.dashCd *= 0.82; } });
  up({ id: 'o_dashlen', name: 'Long jump', cat: 'mobility', icon: 'mobility', max: 3, desc: 'Your air dash lasts 0.04 seconds longer.', reqText: () => 'Requires Air dash', req: B => !noDash(B), apply: B => { B.s.dashLen += 0.04; } });
  up({ id: 'o_climb', name: 'Skyward', cat: 'mobility', icon: 'mobility', max: 4, desc: 'Your maximum climbing speed increases by 12%.', apply: B => { B.s.climbMul *= 1.12; } });
  up({ id: 'o_regen', name: 'Self repair', cat: 'repair', icon: 'repair', max: 3, desc: 'Recover 0.5 HP every second during a fight, even while under fire.', apply: B => { B.s.oRegen += 0.5; } });
  up({ id: 'o_leech', name: 'Blood circuit', cat: 'repair', icon: 'repair', max: 3, desc: 'Every ten hits you land restore 2 HP.', apply: B => { B.s.oLeech += 1; } });
  up({ id: 'o_rage', name: 'Last stand', cat: 'close', icon: 'close', rarity: 'rare', desc: 'Deal 35% more damage while below half health.', apply: B => { B.f.oRage = 1; } });
  up({ id: 'o_close', name: 'Personal space', cat: 'close', icon: 'close', max: 4, desc: 'Deal 20% more damage while within 220px of the boss.', apply: B => { B.s.pointBlank += 0.2; } });
  up({ id: 'o_long', name: 'Keep your distance', cat: 'precision', icon: 'precision', max: 4, desc: 'Deal 20% more damage while over 400px from the boss.', apply: B => { B.s.oLong += 0.2; } });
  up({ id: 'o_focus', name: 'Steady hands', cat: 'precision', icon: 'precision', max: 4, desc: 'Deal 15% more damage while you are not using thrust.', apply: B => { B.s.oFocus += 0.15; } });
  up({ id: 'o_lifeline', name: 'Second wind', cat: 'repair', icon: 'repair', rarity: 'rare', desc: 'The first time each round you drop below 30% HP, instantly repair 30 HP.', req: B => !B.f.secondWind, apply: B => { B.f.secondWind = 1; } });

  /* ================= the classic boss pool (Square Off 1, modernized) ================= */
  const BUPS = SO.BOSS_UPS, BBY = SO.BOSS_UP, ATK = SO.BOSS_ATTACKS;
  function bup(o) { o.max = o.max || 1; o.orig = true; o.punishes = o.punishes || []; o.counters = o.counters || []; BUPS.push(o); BBY[o.id] = o; }
  SO.classicBossBuild = () => ({ attacks: { turret: {} }, passives: {}, chassis: 'proto', tier2: null, counts: {} });
  const stat = (id, name, desc, threat, max, fn) => bup({ id: 'ob_' + id, kind: 'passive', name, desc, threat, max, req: bb => (bb.counts['ob_' + id] || 0) < max, apply: fn });
  stat('health', 'Bigger problem', 'Boss maximum health +25%, on top of its normal growth.', 2, 3, bb => { bb.hpMul = (bb.hpMul || 1) * 1.25; });
  stat('damage', 'Sharp edges', 'All boss attacks deal 20% more damage.', 2, 3, bb => { bb.dmgMul = (bb.dmgMul || 1) * 1.2; });
  stat('rate', 'Impatient', 'Boss attacks recharge 12% faster.', 3, 3, bb => { bb.cdMul = (bb.cdMul || 1) * 0.88; });
  stat('speed', 'Hot shots', 'Boss bullets travel 12% faster (still under the speed cap).', 2, 3, bb => { bb.bspeed = (bb.bspeed || 1) * 1.12; });
  stat('size', 'Big trouble', 'All boss bullets grow 2px wider.', 1, 2, bb => { bb.bsize = (bb.bsize || 0) + 2; });
  const pas = (id, name, key) => { const d = SO.BOSS_PASSIVES[key]; bup({ id: 'ob_' + id, kind: 'passive', passive: key, name, desc: d.desc, threat: d.threat, punishes: d.punishes, counters: d.counters, req: bb => !bb.passives[key], apply: bb => { bb.passives[key] = 1; } }); };
  pas('move', 'Close company', 'thrusters'); pas('enrage', 'Bad temper', 'rage');
  const att = (id, name, key) => { const d = ATK[key]; bup({ id: 'ob_a_' + id, kind: 'attack', attack: key, name, desc: d.desc, threat: d.threat, punishes: d.punishes, counters: d.counters, req: bb => !bb.attacks[key], apply: bb => { bb.attacks[key] = {}; } }); };
  att('spread', 'Spread cannon', 'spread'); att('ring', 'Bullet halo', 'ring'); att('missile', 'Homing missile', 'missiles'); att('laser', 'Sweeping laser', 'sweep');
  att('mines', 'Floating mines', 'mines'); att('spiral', 'Spiral stream', 'spiral'); att('rain', 'Bullet rain', 'mortar'); att('cross', 'Crossfire', 'grid');
  att('mortar', 'Mortar shells', 'flak'); att('boomerang', 'Return fire', 'boomer'); att('dash', 'Rush hour', 'charge'); att('bounce', 'Ricochet', 'bouncer');
  const mod = (id, name, key, m) => { const d = ATK[key]; const md = d.mods.find(x => x.id === m); if (!md) return; bup({ id: 'ob_m_' + id, kind: 'mod', attack: key, mod: m, name, desc: md.desc, threat: md.threat, max: md.max, punishes: d.punishes, counters: d.counters, req: bb => !!bb.attacks[key] && (bb.attacks[key][m] || 0) < md.max, apply: bb => { bb.attacks[key][m] = (bb.attacks[key][m] || 0) + 1; } }); };
  mod('burst', 'Burst fire', 'turret', 'rapid'); mod('lead', 'Ahead of you', 'turret', 'predict');
  mod('extra', 'Extra barrels', 'spread', 'barrels'); mod('split', 'Split personality', 'spread', 'split');
  mod('halo', 'Bigger halo', 'ring', 'dense'); mod('heavyhalo', 'Heavy halo', 'ring', 'more');
  mod('mpair', 'Missile pair', 'missiles', 'salvo'); mod('mtrack', 'Persistent problem', 'missiles', 'cluster');
  mod('dbeam', 'Double beam', 'sweep', 'twin'); mod('wbeam', 'Wide beam', 'sweep', 'wide');
  mod('minefield', 'Minefield', 'mines', 'more'); mod('garden', 'Shrapnel garden', 'mines', 'magnet');
  mod('twinspiral', 'Twin spiral', 'spiral', 'more'); mod('endless', 'Endless spin', 'spiral', 'rev');
  mod('storm', 'Storm front', 'mortar', 'more'); mod('downpour', 'Downpour', 'mortar', 'fire');
  mod('crossp', 'Cross purposes', 'grid', 'cross'); mod('turning', 'Turning point', 'grid', 'shift');
  mod('frag', 'Fragmentation', 'flak', 'more'); mod('shellco', 'Shell company', 'flak', 'delayed');
  mod('backmore', 'Back for more', 'boomer', 'more'); mod('broad', 'Broad return', 'boomer', 'over');
  mod('rubber', 'Rubber bullets', 'bouncer', 'split'); mod('rebound', 'Hard reset', 'charge', 'double');

  /* ================= Challenges ================= */
  // rules: rounds, kit, mods (legacy run modifiers), maxHits, timeLimit, startRound, freeUps, pHp, pDmg, bossHp, bossDmg, noDash, noHeal, noNew,
  //        playerCards, ice, mirror, lava, drain, bigHitbox, hazards, hazardSpeed, fast, extraWeapons, bossStart, dark, invert, oneHp, restless
  const T = SO.TRIALS = {};
  const trial = (id, name, rounds, desc, rules, extra) => { T[id] = Object.assign({ id, name, rounds, desc, rules: Object.assign({ rounds }, rules) }, extra || {}); };
  trial('featherlight', 'Featherlight', 3, 'Clear 3 rounds taking fewer than 4 hits in total. The 4th hit ends the run.', { maxHits: 4 }, { reward: 'vortrox' });
  trial('purist', 'Peashooter Purist', 4, 'No new weapons are ever offered. Make your starting weapon count.', { noNew: true });
  trial('glassduel', 'Glass Duel', 3, 'You and the boss both fight with half your health.', { pHp: 0.5, bossHp: 0.5 });
  trial('clock', 'Against the Clock', 4, 'Win every round within 75 seconds or the run ends.', { timeLimit: 75 });
  trial('twofeet', 'Two Left Feet', 4, 'Your dash is disabled for the whole run.', { noDash: true });
  trial('bossrush', 'Boss Rush', 3, 'Start at Round 6. You both get 5 random upgrades, and the boss gets a random chassis.', { startRound: 6, freeUps: 5 });
  trial('ice', 'Black Ice', 4, 'Your movement slips and slides. Plan your stops early.', { ice: true });
  trial('mirror', 'Mirror World', 3, 'Left is right and right is left.', { mirror: true });
  trial('lava', 'The Floor Is Lava', 4, 'Standing on the arena floor burns you. Platforms and the air are safe.', { lava: true });
  trial('heavy', 'Heavy Hitters', 3, 'The boss deals double damage. You deal 50% more.', { bossDmg: 2, pDmg: 1.5 });
  trial('ironman', 'No Pit Stops', 5, 'No repairs between rounds. You start with 50% more max HP.', { noHeal: true, pHp: 1.5 });
  trial('double', 'Twice the Trouble', 4, 'The boss gets TWO upgrades every round.', { mods: ['double'] });
  trial('fastfwd', 'Fast Forward', 4, 'The whole fight runs 30% faster.', { fast: 1.3 });
  trial('mystery', 'Mystery Box', 5, 'You are offered only one card per workshop, and there are no rerolls.', { playerCards: 1, mods: ['noreroll'] });
  trial('leaky', 'Leaky Hull', 4, 'You lose 1.5 HP every second while fighting. You start with 50% more max HP.', { drain: 1.5, pHp: 1.5 });
  trial('bigtarget', 'Big Target', 3, 'Your hitbox is twice as large.', { bigHitbox: 2 });
  trial('stagefright', 'Stage Fright', 4, 'Stage hazards are on from Round 1 and strike twice as often.', { hazards: true, hazardSpeed: 2 });
  trial('armory', 'Armory Overload', 3, 'Start with 3 extra random weapons, but only 60% max HP.', { extraWeapons: 3, pHp: 0.6 });
  trial('redline', 'Redline', 4, 'The boss starts overclocked twice and with a Combo Circuit.', { bossStart: ['bp_overclock', 'bp_overclock', 'bp_combo'] });
  trial('leadboots', 'Lead Boots', 4, 'Gravity is 35% stronger and you only repair half your HP between rounds.', { mods: ['heavy', 'halfheal'] });
  // secret challenges (shown at the top once the Secret Characters tab has been opened)
  trial('lightsout', 'Lights Out', 3, 'The arena is pitch black. You can only see what is close to you.', { dark: true }, { secret: true, reward: 'lumen' });
  trial('upsidedown', 'Upside Down', 3, 'Gravity is reversed. You fall up, and thrust pushes you down.', { invert: true }, { secret: true, reward: 'flip' });
  trial('oneanddone', 'One and Done', 3, 'You have exactly 1 HP. Any hit ends the run.', { oneHp: true }, { secret: true, reward: 'tabby' });
  trial('restless', 'Restless', 4, 'Stay still for more than a second and you get hurt. Keep moving.', { restless: true }, { secret: true, reward: 'dynamo' });
  SO.TRIAL_ORDER = Object.keys(T).filter(k => !T[k].secret);
  SO.SECRET_TRIAL_ORDER = Object.keys(T).filter(k => T[k].secret);
  SO.trialDone = id => { const d = SO.save.data; return !!(d && (d.records.trials || []).includes(id)); };
})();
