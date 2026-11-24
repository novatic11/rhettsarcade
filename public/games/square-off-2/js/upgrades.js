/* Square Off 2 — player build model, upgrade pool (180+), kits, utilities, challenges */
'use strict';
(function () {
  const M = SO.M;
  const f2 = n => (Math.round(n * 100) / 100).toString();
  const pc = n => Math.round(n * 100) + '%';

  SO.newBuild = function () {
    return {
      weapons: [], maxWeapons: 5, utility: null, counts: {}, history: [],
      s: {
        maxHp: 100, shield: 0, dmgMul: 1, rateMul: 1, spreadMul: 1, sizeMul: 1, pSpeedMul: 1, areaMul: 1, bounceAdd: 0,
        critChance: 0.05, critMul: 2, dashCharges: 1, dashCd: 1.1, dashIframe: 0.22, thrustMul: 1, speedMul: 1, iframes: 1.0, hitR: 8,
        shieldDelay: 3, shieldRate: 14, regen: 0, utilCdMul: 1, utilCharges: 1, cards: 3,
        burnChance: 0, burnMax: 5, burnDur: 3, bleedChance: 0, pointBlank: 0, ram: 0, eater: 0, dmgTakenMul: 1, ablative: 0,
        gravMul: 1, climbMul: 1, dashLen: 0, oRegen: 0, oLeech: 0, oLong: 0, oFocus: 0
      },
      f: {}
    };
  };
  // flatten build → runtime multipliers used by weapons
  SO.buildMul = B => ({ dmgMul: B.s.dmgMul, rateMul: B.s.rateMul, spreadMul: B.s.spreadMul, sizeMul: B.s.sizeMul, pSpeedMul: B.s.pSpeedMul, areaMul: B.s.areaMul, bounceAdd: B.s.bounceAdd });
  // per-weapon multipliers (Square the Original's classic weapon upgrades)
  SO.weaponMul = (B, w) => { const m = SO.buildMul(B); if (w && w.dmgX) m.dmgMul *= w.dmgX; if (w && w.rateX) m.rateMul *= w.rateX; return m; };
  SO.weaponParams = (w, B) => SO.WEAPONS[w.id].calc(w, SO.weaponMul(B, w));

  const has = (B, id) => B.weapons.some(w => w.id === id);
  const wep = (B, id) => B.weapons.find(w => w.id === id);
  const hasTag = (B, tag) => B.weapons.some(w => (SO.WEAPONS[w.id].tags || []).includes(tag));
  const hasAny = (B, ids) => B.weapons.some(w => ids.includes(w.id));
  SO.hasWeapon = has;

  const UPS = SO.PLAYER_UPS = [];
  const BY = SO.PLAYER_UP = {};
  function up(o) { o.max = o.max || 1; o.rarity = o.rarity || 'common'; o.tags = o.tags || []; o.req = o.req || (() => true); UPS.push(o); BY[o.id] = o; }

  /* ---------------- weapon upgrades (generated: 30 × 4 = 120) ---------------- */
  SO.WEAPON_UNLOCK_TEXT = { r3: 'Clear Round 3 in any run', r5: 'Clear Round 5 in any run', r7: 'Clear Round 7 in any run', mods: 'Break 10 boss modules (total)', runs: 'Play 3 runs', win: 'Win a Standard Run' };
  SO.weaponUnlocked = (id, ctx) => { const d = SO.WEAPONS[id]; if (!d.unlock) return true; return !!(ctx && ctx.unlockedWeapons && ctx.unlockedWeapons.includes(id)); };
  for (const id of SO.WEAPON_ORDER) {
    const d = SO.WEAPONS[id];
    up({
      id: 'w_' + id, name: d.name, cat: 'weapon', kind: 'new', weapon: id, icon: d.icon, rarity: 'rare', tags: d.tags, desc: d.desc,
      reqText: B => 'Free weapon slot (' + B.weapons.length + '/' + B.maxWeapons + ')',
      req: (B, ctx) => !has(B, id) && B.weapons.length < B.maxWeapons && SO.weaponUnlocked(id, ctx),
      apply: B => { B.weapons.push({ id, mods: 0, evo: null }); }
    });
    up({
      id: 'wm_' + id, name: d.mod.name, cat: 'weapon', kind: 'mod', weapon: id, icon: d.icon, max: d.mod.max, tags: d.tags, desc: d.mod.desc,
      reqText: () => 'Requires ' + d.name, req: B => has(B, id) && wep(B, id).mods < d.mod.max,
      apply: B => { wep(B, id).mods++; }
    });
    for (const k of ['a', 'b']) {
      const o = k === 'a' ? 'b' : 'a';
      up({
        id: 'we_' + id + '_' + k, name: d.evos[k].name, cat: 'evolution', kind: 'evo', branch: k, weapon: id, icon: d.icon, rarity: 'rare', tags: d.tags, desc: d.evos[k].desc,
        other: d.evos[o].name, otherDesc: d.evos[o].desc,
        reqText: () => d.name + ' with ' + d.mod.name + ' ×1+', req: B => { const w = wep(B, id); return !!w && !w.evo && w.mods >= 1; },
        apply: B => { wep(B, id).evo = k; }
      });
    }
  }

  /* ---------------- general upgrades ---------------- */
  // mobility
  up({ id: 'm_dash2', name: 'Twin Thrusters', cat: 'mobility', icon: 'mobility', max: 2, tags: ['mobility'], desc: '+1 dash charge. Charges refill one at a time.', apply: B => { B.s.dashCharges++; } });
  up({ id: 'm_dashcd', name: 'Quick Vents', cat: 'mobility', icon: 'mobility', max: 2, tags: ['mobility'], desc: 'Dash cooldown −18%.', apply: B => { B.s.dashCd *= 0.82; } });
  up({ id: 'm_jets', name: 'Turbo Jets', cat: 'mobility', icon: 'mobility', max: 2, tags: ['mobility'], desc: '+20% thrust power and +12% horizontal speed.', apply: B => { B.s.thrustMul *= 1.2; B.s.speedMul *= 1.12; } });
  up({ id: 'm_hover', name: 'Gyro Stabilizer', cat: 'mobility', icon: 'mobility', tags: ['mobility', 'precision'], desc: 'When you aren\'t thrusting or holding a direction, you fall 65% slower. Hover and aim.', apply: B => { B.f.hover = 1; } });
  up({ id: 'm_slip', name: 'Slipstream', cat: 'mobility', icon: 'mobility', rarity: 'rare', tags: ['mobility'], desc: 'After each dash: +35% move speed and +15% damage for 1.2s.', apply: B => { B.f.slip = 1; } });
  up({ id: 'm_phase', name: 'Phase Dash', cat: 'mobility', icon: 'mobility', rarity: 'rare', tags: ['mobility', 'interceptor'], desc: 'Dashing erases up to 6 enemy bullets you pass through. +0.1s dash invulnerability.', apply: B => { B.f.phase = 1; B.s.dashIframe += 0.1; } });
  up({ id: 'm_momentum', name: 'Momentum Engine', cat: 'mobility', icon: 'mobility', tags: ['mobility'], desc: '+1% damage per 20 px/s of speed above 150 (max +15%). Keep moving.', apply: B => { B.f.momentum = 1; } });
  // defense
  up({ id: 'd_shield', name: 'Plate Shield', cat: 'defense', icon: 'defense', max: 3, tags: ['defense'], desc: '+20 shield. Shield absorbs damage first and refills after 3s without being hit.', apply: B => { B.s.shield += 20; } });
  up({ id: 'd_regen', name: 'Capacitor Regen', cat: 'defense', icon: 'defense', tags: ['defense'], desc: 'Shield starts refilling after 1.8s (was 3s) and refills 50% faster.', reqText: () => 'Requires a shield', req: B => B.s.shield > 0, apply: B => { B.s.shieldDelay = 1.8; B.s.shieldRate *= 1.5; } });
  up({ id: 'd_hp', name: 'Reinforced Hull', cat: 'defense', icon: 'defense', max: 3, tags: ['defense'], desc: '+20 max HP.', apply: B => { B.s.maxHp += 20; } });
  up({ id: 'd_iframes', name: 'Grace Frames', cat: 'defense', icon: 'defense', tags: ['defense'], desc: 'Invulnerability after taking a hit +0.4s.', apply: B => { B.s.iframes += 0.4; } });
  up({ id: 'd_last', name: 'Last Stand', cat: 'defense', icon: 'defense', rarity: 'rare', tags: ['defense'], desc: 'Once per round, a lethal hit leaves you at 1 HP with 2s of invulnerability.', apply: B => { B.f.lastStand = 1; } });
  up({ id: 'd_reactive', name: 'Reactive Shell', cat: 'defense', icon: 'defense', rarity: 'rare', tags: ['defense', 'interceptor'], desc: 'When you take damage, erase all enemy bullets within 160px (6s cooldown).', apply: B => { B.f.reactive = 1; } });
  up({ id: 'd_small', name: 'Compact Core', cat: 'defense', icon: 'defense', rarity: 'rare', tags: ['defense', 'mobility'], desc: 'Hitbox radius −20%. Thread tighter gaps.', apply: B => { B.s.hitR *= 0.8; } });
  // new health & defense upgrades
  const healSrc = B => B.s.regen > 0 || B.f.vamp || B.f.siphon || B.f.medkit || B.f.closeCall || B.f.salvage || B.f.secondWind || B.utility === 'repair';
  up({ id: 'd_ablative', name: 'Ablative Plating', cat: 'defense', icon: 'defense', max: 2, tags: ['defense'], desc: 'The first hit you take each round is completely absorbed by a plate that peels off. Stacks: one plate per stack.', apply: B => { B.s.ablative += 1; } });
  up({ id: 'd_heavy', name: 'Heavy Chassis', cat: 'defense', icon: 'defense', max: 2, tags: ['defense'], desc: '+40 max HP, but you move 6% slower.', apply: B => { B.s.maxHp += 40; B.s.speedMul *= 0.94; } });
  up({ id: 'd_shell', name: 'Hardened Shell', cat: 'defense', icon: 'defense', max: 2, tags: ['defense'], desc: 'Take 15% less damage from every source.', apply: B => { B.s.dmgTakenMul *= 0.85; } });
  up({ id: 'd_closecall', name: 'Close Call', cat: 'defense', icon: 'defense', tags: ['defense', 'mobility'], desc: 'Dashing through an enemy bullet repairs 2 HP (up to 12 HP per round). Turns dodging into healing.', apply: B => { B.f.closeCall = 1; } });
  up({ id: 'r_secondwind', name: 'Second Wind', cat: 'repair', icon: 'repair', rarity: 'rare', tags: ['defense'], desc: 'The first time each round you drop below 30% HP, instantly repair 30 HP.', apply: B => { B.f.secondWind = 1; } });
  up({ id: 'r_siphon', name: 'Siphon Coils', cat: 'repair', icon: 'repair', rarity: 'rare', tags: ['defense'], desc: 'Repair 3% of all damage you deal (max 3 HP per second).', apply: B => { B.f.siphon = 1; } });
  up({ id: 'r_medkit', name: 'Medkit Drops', cat: 'repair', icon: 'repair', tags: ['defense'], desc: 'Every 14s of fighting, a medkit parachutes onto the stage near you. Grab it to repair 18 HP (it lasts 10s).', apply: B => { B.f.medkit = 1; } });
  up({ id: 'r_overshield', name: 'Overshield Capacitor', cat: 'repair', icon: 'repair', rarity: 'rare', tags: ['defense'], desc: 'Healing past your max HP becomes temporary shield (up to 30) that doesn\'t decay.', reqText: () => 'Requires a healing source', req: healSrc, apply: B => { B.f.overshield = 1; } });
  // repair
  up({ id: 'r_field', name: 'Field Repair', cat: 'repair', icon: 'repair', max: 2, tags: ['defense'], desc: 'After 4s without taking damage, repair 1.5 HP/s.', apply: B => { B.s.regen += 1.5; } });
  up({ id: 'r_vamp', name: 'Vampire Rivets', cat: 'repair', icon: 'repair', rarity: 'rare', tags: ['crit'], desc: 'Critical hits repair 0.5 HP (max 4 HP per second).', apply: B => { B.f.vamp = 1; } });
  up({ id: 'r_salvage', name: 'Salvage Kit', cat: 'repair', icon: 'repair', tags: ['defense'], desc: 'Breaking a boss module repairs 15 HP. Staggering the boss repairs 5 HP.', apply: B => { B.f.salvage = 1; } });
  // crit
  up({ id: 'c_chance', name: 'Keen Optics', cat: 'crit', icon: 'crit', max: 3, tags: ['crit', 'precision'], desc: '+8% critical hit chance.', apply: B => { B.s.critChance += 0.08; } });
  up({ id: 'c_dmg', name: 'Heavy Hitter', cat: 'crit', icon: 'crit', max: 2, tags: ['crit'], desc: '+50% critical hit damage.', apply: B => { B.s.critMul += 0.5; } });
  up({ id: 'c_weak', name: 'Weak-Point Scanner', cat: 'crit', icon: 'crit', rarity: 'rare', tags: ['crit', 'precision'], desc: 'Hits on weapon modules and exposed cores always crit.', apply: B => { B.f.weakScan = 1; } });
  up({ id: 'c_spark', name: 'Crit Sparks', cat: 'crit', icon: 'crit', rarity: 'rare', tags: ['crit', 'chain'], desc: 'Crits fling a spark at a random module (or the boss) for 30% of the hit. Sparks can\'t trigger sparks.', apply: B => { B.f.critSpark = 1; } });
  up({ id: 'c_spot', name: 'Spotter Lens', cat: 'crit', icon: 'crit', tags: ['crit', 'precision'], desc: 'Every 5s your next hit is a guaranteed crit with +100% crit damage.', apply: B => { B.f.spotter = 1; } });
  // DoT
  const hasBurn = B => B.s.burnChance > 0 || hasAny(B, ['flame', 'jet']);
  const hasDot = B => hasBurn(B) || B.s.bleedChance > 0 || hasAny(B, ['needle']);
  up({ id: 't_burn', name: 'Incendiary Rounds', cat: 'dot', icon: 'dot', max: 2, tags: ['dot'], desc: '12% of your hits add a Burn stack (4 dmg/s for 3s, stacks to 5).', apply: B => { B.s.burnChance += 0.12; } });
  up({ id: 't_bleed', name: 'Serrated Rounds', cat: 'dot', icon: 'dot', max: 2, tags: ['dot'], desc: '10% of your hits add a Bleed stack (1.5 dmg/s for 4s, stacks to 12).', apply: B => { B.s.bleedChance += 0.10; } });
  up({ id: 't_wild', name: 'Wildfire', cat: 'dot', icon: 'dot', rarity: 'rare', tags: ['dot'], desc: 'Burn stacks cap at 10 (was 5) and last 1.5s longer.', reqText: () => 'Requires a Burn source', req: hasBurn, apply: B => { B.s.burnMax = 10; B.s.burnDur += 1.5; } });
  up({ id: 't_acid', name: 'Corrosive Compound', cat: 'dot', icon: 'dot', tags: ['dot'], desc: 'Each Burn/Bleed stack on the boss makes it take +1.5% damage from everything (max +24%).', reqText: () => 'Requires a Burn or Bleed source', req: hasDot, apply: B => { B.f.acid = 1; } });
  up({ id: 't_crit', name: 'Hemorrhage Logic', cat: 'dot', icon: 'dot', rarity: 'rare', tags: ['dot', 'crit'], desc: 'Burn and Bleed ticks can crit.', reqText: () => 'Requires a Burn or Bleed source', req: hasDot, apply: B => { B.f.dotCrit = 1; } });
  // precision
  up({ id: 'p_steady', name: 'Steady Hands', cat: 'precision', icon: 'precision', tags: ['precision'], desc: 'While you\'re not moving horizontally: +20% damage and +10% crit chance.', apply: B => { B.f.steady = 1; } });
  up({ id: 'p_long', name: 'Long Shot', cat: 'precision', icon: 'precision', tags: ['precision'], desc: '+1% damage per 25px of distance beyond 250px from the boss (max +25%).', apply: B => { B.f.longShot = 1; } });
  up({ id: 'p_calib', name: 'Calibrated Barrels', cat: 'precision', icon: 'precision', tags: ['precision'], desc: 'Weapon spread −35% and projectile speed +15%.', apply: B => { B.s.spreadMul *= 0.65; B.s.pSpeedMul *= 1.15; } });
  up({ id: 'p_paint', name: 'Target Painter', cat: 'precision', icon: 'precision', rarity: 'rare', tags: ['precision', 'crit'], desc: 'Paints a ✕ on the boss hull that moves every 4s. Hits landing within 24px of it deal +60%.', apply: B => { B.f.paint = 1; } });
  // close range
  up({ id: 'k_point', name: 'Point Blank', cat: 'close', icon: 'close', max: 2, tags: ['close'], desc: '+30% damage while within 220px of the boss.', apply: B => { B.s.pointBlank += 0.3; } });
  up({ id: 'k_ram', name: 'Ram Plating', cat: 'close', icon: 'close', max: 2, tags: ['close', 'melee'], desc: 'Touching the boss deals 50 damage/s and jolts it. Ordinary contact stays safe for you.', apply: B => { B.s.ram += 50; } });
  up({ id: 'k_graze', name: 'Adrenaline Graze', cat: 'close', icon: 'close', rarity: 'rare', tags: ['close', 'mobility'], desc: 'Enemy bullets passing within 40px of your core without hitting build Adrenaline. At 15: +40% fire rate for 4s.', apply: B => { B.f.graze = 1; } });
  up({ id: 'k_reckless', name: 'Reckless Engine', cat: 'close', icon: 'close', tags: ['close'], desc: '+4% damage for every 10% HP you\'re missing (max +36%).', apply: B => { B.f.reckless = 1; } });
  // projectile interactions
  up({ id: 'x_eater', name: 'Bullet-Eater Rounds', cat: 'interact', icon: 'interact', max: 2, tags: ['interceptor', 'bullet'], desc: 'Your small shots have a 20% chance to destroy enemy bullets they touch.', reqText: () => 'Requires a small-shot weapon', req: B => B.weapons.some(w => SO.WEAPONS[w.id].tags.includes('bullet') || ['seeker', 'drones', 'prism', 'harpoon'].includes(w.id)), apply: B => { B.s.eater += 0.2; } });
  up({ id: 'x_heavy', name: 'Heavy Ordnance', cat: 'interact', icon: 'interact', tags: ['interceptor', 'big'], desc: 'Your large projectiles (rockets, mortars, orbs, saws, discs, boomerangs, launched blades, ink globs) destroy enemy bullets they touch.', reqText: () => 'Requires a large-projectile weapon', req: B => hasTag(B, 'big'), apply: B => { B.f.heavyOrd = 1; } });
  up({ id: 'x_bounce', name: 'Ricochet Coating', cat: 'interact', icon: 'interact', max: 2, tags: ['bounce', 'bullet'], desc: '+1 wall bounce for bolts, pellets, needles, light and echo shots.', reqText: () => 'Requires a bullet weapon', req: B => B.weapons.some(w => SO.WEAPONS[w.id].calc(w, {}).bounceable), apply: B => { B.s.bounceAdd += 1; } });
  up({ id: 'x_volatile', name: 'Volatile Rounds', cat: 'interact', icon: 'interact', rarity: 'rare', tags: ['explosive'], desc: 'Non-explosive hits have a 12% chance to pop a mini-blast (40px) for 60% of the hit. Blasts don\'t re-trigger this.', apply: B => { B.f.volatile = 1; } });
  up({ id: 'x_shrap', name: 'Shrapnel Casings', cat: 'interact', icon: 'interact', tags: ['explosive', 'interceptor'], desc: 'Your explosions release 4 shards (5 dmg) that destroy enemy bullets.', reqText: () => 'Requires an explosive weapon', req: B => hasTag(B, 'explosive') || B.f.volatile, apply: B => { B.f.shrap = 1; } });
  up({ id: 'x_chain', name: 'Chain Reaction', cat: 'interact', icon: 'interact', rarity: 'rare', tags: ['explosive', 'chain'], desc: 'Your explosions have a 25% chance to set off one extra blast nearby at 50% damage (extra blasts never chain).', reqText: () => 'Requires an explosive weapon', req: B => hasTag(B, 'explosive'), apply: B => { B.f.chainEx = 1; } });
  const DEPLOY = ['saw', 'sticky', 'minelayer', 'drones', 'aegis', 'prism', 'gravity'];
  up({ id: 'x_rods', name: 'Lightning Rods', cat: 'interact', icon: 'interact', tags: ['chain', 'deploy'], desc: 'Your deployed objects (saws, charges, mines, lenses, drones, satellites, wells) zap the boss for 6 damage every 0.5s within 250px.', reqText: () => 'Requires a deployable weapon', req: B => hasAny(B, DEPLOY), apply: B => { B.f.rods = 1; } });
  // global weapon
  up({ id: 'g_rate', name: 'Overclocked Feed', cat: 'global', icon: 'global', max: 3, desc: 'All weapons fire 12% faster.', apply: B => { B.s.rateMul *= 1.12; } });
  up({ id: 'g_dmg', name: 'Heavy Caliber', cat: 'global', icon: 'global', max: 3, desc: 'All weapon damage +10%.', apply: B => { B.s.dmgMul *= 1.1; } });
  up({ id: 'g_rack', name: 'Weapon Rack', cat: 'global', icon: 'global', rarity: 'rare', desc: '+1 weapon slot (6 total).', reqText: () => 'Requires 3+ weapons', req: B => B.weapons.length >= 3 && B.maxWeapons < 6, apply: B => { B.maxWeapons++; } });
  up({ id: 'g_dashvolley', name: 'Dash Volley', cat: 'global', icon: 'global', tags: ['mobility'], desc: 'Every dash fires a ring of 10 bolts (12 dmg each).', apply: B => { B.f.dashVolley = 1; } });
  up({ id: 'g_thrust', name: 'Jet-Synced Triggers', cat: 'global', icon: 'global', tags: ['mobility'], desc: 'While thrusting: +20% fire rate. While falling: +10% damage.', apply: B => { B.f.thrustSync = 1; } });
  up({ id: 'g_area', name: 'Wide Barrels', cat: 'global', icon: 'global', max: 2, tags: ['big'], desc: '+20% projectile size and +20% blast radius.', apply: B => { B.s.sizeMul *= 1.2; B.s.areaMul *= 1.2; } });
  // utilities
  const UT = SO.UTILS = {
    eraser: { name: 'Eraser Pulse', cd: 16, desc: 'Erase every enemy bullet within 230px.' },
    overdrive: { name: 'Overdrive', cd: 15, desc: '+60% fire rate for 4s.' },
    bubble: { name: 'Bubble Shield', cd: 18, desc: 'Block all damage for 1.6s.' },
    blink: { name: 'Blink Bomb', cd: 11, desc: 'Teleport toward the cursor (max 360px), leaving a 60-damage blast behind.' },
    dilate: { name: 'Time Dilation', cd: 20, desc: 'Enemy projectiles and boss attack timers run at 45% speed for 3s.' },
    decoy: { name: 'Cardboard Decoy', cd: 16, desc: 'Drop a decoy that the boss aims at instead of you for 3.5s.' },
    repair: { name: 'Repair Kit', cd: 24, desc: 'Repair 22 HP instantly.' },
    grapple: { name: 'Grapple Hook', cd: 5, desc: 'Yank yourself toward the cursor (max 420px), invulnerable while flying.' }
  };
  for (const k in UT) up({
    id: 'u_' + k, name: UT[k].name, cat: 'utility', icon: 'utility', util: k, tags: ['utility'], desc: '[E] ' + UT[k].desc + ' Cooldown ' + UT[k].cd + 's.',
    reqText: B => B.utility ? 'Replaces ' + UT[B.utility].name : 'Equips to [E]', req: B => B.utility !== k, apply: B => { B.utility = k; }
  });
  up({ id: 'u_cool', name: 'Utility Capacitor', cat: 'utility', icon: 'utility', max: 2, tags: ['utility'], desc: 'Utility cooldown −25%.', reqText: () => 'Requires a utility', req: B => !!B.utility, apply: B => { B.s.utilCdMul *= 0.75; } });
  up({ id: 'u_double', name: 'Twin Charge', cat: 'utility', icon: 'utility', rarity: 'rare', tags: ['utility'], desc: 'Your utility holds 2 charges.', reqText: () => 'Requires a utility', req: B => !!B.utility, apply: B => { B.s.utilCharges = 2; } });
  // transformations (epic, unique)
  up({ id: 'R_glass', name: 'Glass Square', cat: 'transform', icon: 'transform', rarity: 'epic', tags: ['close'], desc: 'Max HP halved. All damage ×1.5. High risk, high reward.', apply: B => { B.s.maxHp = Math.max(30, Math.round(B.s.maxHp * 0.5)); B.s.dmgMul *= 1.5; B.f.glass = 1; } });
  up({ id: 'R_twin', name: 'Twin Square', cat: 'transform', icon: 'transform', rarity: 'epic', tags: ['drone'], desc: 'A mirrored twin copies your movement across the arena and fires your first weapon at 60% damage. It can\'t be hurt.', apply: B => { B.f.twin = 1; } });
  up({ id: 'R_mega', name: 'Mega Square', cat: 'transform', icon: 'transform', rarity: 'epic', tags: ['close', 'melee'], desc: 'Body ×1.35 (hitbox unchanged), +20% damage, +40 ram damage/s, −8% speed.', apply: B => { B.f.mega = 1; B.s.dmgMul *= 1.2; B.s.ram += 40; B.s.speedMul *= 0.92; } });
  up({ id: 'R_chrono', name: 'Clutch Chronometer', cat: 'transform', icon: 'transform', rarity: 'epic', tags: ['defense'], desc: 'Below 35% HP, enemy projectiles and boss attacks move 30% slower.', apply: B => { B.f.chrono = 1; } });
  up({ id: 'R_heat', name: 'Overheat Core', cat: 'transform', icon: 'transform', rarity: 'epic', desc: 'Dealing damage builds Heat. At full Heat, every weapon fires twice as fast for 3s.', apply: B => { B.f.heat = 1; } });
  up({ id: 'R_comet', name: 'Comet Form', cat: 'transform', icon: 'transform', rarity: 'epic', tags: ['mobility', 'melee'], desc: 'Dashes travel 60% farther. Dashing through the boss deals 90 damage and staggers it briefly.', apply: B => { B.f.comet = 1; } });
  up({ id: 'R_hoard', name: 'Hoarder\'s Bench', cat: 'transform', icon: 'transform', rarity: 'epic', desc: '+2 rerolls now. Your workshop shows 4 cards for you from now on.', apply: B => { B.s.cards = 4; B.bonusRerolls = (B.bonusRerolls || 0) + 2; } });
  // fallback (endless)
  up({ id: 'f_overhaul', name: 'Field Overhaul', cat: 'global', icon: 'global', max: 99, fallback: true, desc: '+5% damage and +5 max HP. (Shown when the pool runs dry.)', req: () => false, apply: B => { B.s.dmgMul *= 1.05; B.s.maxHp += 5; } });

  SO.CAT_LABEL = { weapon: 'Weapon', evolution: 'Evolution', mobility: 'Mobility', defense: 'Defense', repair: 'Repair', crit: 'Critical', dot: 'Damage over time', precision: 'Precision', close: 'Close range', interact: 'Projectile control', global: 'Arsenal', utility: 'Utility', transform: 'Transformation' };

  /* ---------------- apply / derived ---------------- */
  SO.applyPlayerUp = function (B, id) {
    const u = BY[id]; if (!u) return;
    u.apply(B); B.counts[id] = (B.counts[id] || 0) + 1;
  };
  SO.buildSheet = function (B) {
    const s = B.s;
    return {
      'Max HP': Math.round(s.maxHp), 'Shield': s.shield, 'Damage': '×' + f2(s.dmgMul), 'Fire rate': '×' + f2(s.rateMul),
      'Crit chance': pc(s.critChance), 'Crit damage': '×' + f2(s.critMul), 'Dash charges': s.dashCharges, 'Dash cooldown': f2(s.dashCd) + 's',
      'Dash invulnerability': f2(s.dashIframe) + 's', 'Move speed': pc(s.speedMul), 'Thrust': pc(s.thrustMul), 'Hitbox radius': f2(s.hitR) + 'px',
      'Post-hit invulnerability': f2(s.iframes) + 's', 'Spread': pc(s.spreadMul), 'Projectile speed': pc(s.pSpeedMul), 'Projectile size': pc(s.sizeMul), 'Blast radius': pc(s.areaMul),
      'Extra wall bounces': s.bounceAdd, 'Weapon slots': B.maxWeapons, 'Burn on hit': pc(s.burnChance), 'Bleed on hit': pc(s.bleedChance), 'Burn stack cap': s.burnMax,
      'Shield refill delay': s.shield ? f2(s.shieldDelay) + 's' : '—', 'Repair': s.regen ? f2(s.regen) + ' HP/s' : '—', 'Utility cooldown': pc(s.utilCdMul), 'Utility charges': s.utilCharges,
      'Close-range bonus': '+' + pc(s.pointBlank), 'Ram damage': s.ram ? s.ram + '/s' : '—', 'Bullet-eat chance': pc(s.eater), 'Workshop cards': s.cards, 'Damage taken': pc(s.dmgTakenMul), 'Ablative plates': s.ablative,
      'Gravity': pc(s.gravMul), 'Climb speed': pc(s.climbMul), 'Dash length': f2(0.16 + s.dashLen) + 's', 'Constant repair': s.oRegen ? f2(s.oRegen) + ' HP/s' : '—', 'Repair per 10 hits': s.oLeech ? 2 * s.oLeech + ' HP' : '—', 'Long-range bonus': '+' + pc(s.oLong), 'No-thrust bonus': '+' + pc(s.oFocus)
    };
  };
  // exact change list for an upgrade
  SO.upgradeChanges = function (B, id) {
    const u = BY[id]; if (!u) return [];
    if (u.weapon && u.kind !== 'new' && !B.weapons.some(w => w.id === u.weapon)) return [];
    const after = SO.clone(B); SO.applyPlayerUp(after, id);
    const out = [];
    if (u.kind === 'new') {
      const w = { id: u.weapon, mods: 0, evo: null }; const p = SO.weaponParams(w, B); const sh = SO.WEAPONS[u.weapon].show(p);
      for (const k in sh) out.push({ label: k, to: sh[k] });
      out.push({ label: '≈ DPS', to: Math.round(p.dps || 0) });
      out.push({ label: 'Weapon slots', from: B.weapons.length + '/' + B.maxWeapons, to: (B.weapons.length + 1) + '/' + B.maxWeapons });
      return out;
    }
    if (u.weapon) {
      const w0 = B.weapons.find(w => w.id === u.weapon), w1 = after.weapons.find(w => w.id === u.weapon);
      const p0 = SO.weaponParams(w0, B), p1 = SO.weaponParams(w1, after);
      const s0 = SO.WEAPONS[u.weapon].show(p0), s1 = SO.WEAPONS[u.weapon].show(p1);
      for (const k in s1) if (String(s0[k]) !== String(s1[k])) out.push({ label: k, from: s0[k] == null ? '—' : s0[k], to: s1[k] });
      for (const k in s0) if (!(k in s1)) out.push({ label: k, from: s0[k], to: '—' });
      const d0 = Math.round(p0.dps || 0), d1 = Math.round(p1.dps || 0); if (d0 !== d1) out.push({ label: '≈ DPS', from: d0, to: d1 });
      return out;
    }
    const a = SO.buildSheet(B), b = SO.buildSheet(after);
    for (const k in b) if (String(a[k]) !== String(b[k])) out.push({ label: k, from: a[k], to: b[k] });
    // ripple into weapons for global multipliers
    if (['g_rate', 'g_dmg', 'g_area', 'p_calib', 'x_bounce', 'R_glass', 'R_mega', 'f_overhaul', 'o_damage', 'o_rate'].includes(id)) {
      for (const w of B.weapons.slice(0, 3)) {
        const p0 = SO.weaponParams(w, B), p1 = SO.weaponParams(after.weapons.find(x => x.id === w.id), after);
        const d0 = Math.round(p0.dps || 0), d1 = Math.round(p1.dps || 0); if (d0 !== d1) out.push({ label: SO.WEAPONS[w.id].name + ' ≈DPS', from: d0, to: d1 });
      }
    }
    if (u.util) out.push({ label: '[E] Utility', from: B.utility ? SO.UTILS[B.utility].name : 'none', to: SO.UTILS[u.util].name });
    return out;
  };
  SO.buildTags = function (B) {
    const t = {};
    for (const w of B.weapons) for (const g of SO.WEAPONS[w.id].tags) t[g] = (t[g] || 0) + 2 + w.mods + (w.evo ? 1 : 0);
    for (const id in B.counts) { const u = BY[id]; if (!u || u.weapon) continue; for (const g of u.tags) t[g] = (t[g] || 0) + B.counts[id]; }
    return t;
  };
  const IDENT = [
    [['close', 'melee'], 'Reckless Brawler'], [['drone', 'deploy'], 'Drone Commander'], [['precision', 'pierce', 'crit'], 'Precision Marksman'],
    [['explosive', 'chain'], 'Chain-Reaction Demolitionist'], [['interceptor', 'defense', 'control'], 'Bullet Warden'], [['dot'], 'Pyro-Chemist'],
    [['beam', 'lens'], 'Light Bender'], [['bullet', 'metal'], 'Lead Storm'], [['mobility'], 'Jet Acrobat'], [['big', 'bounce'], 'Ricochet Artist']
  ];
  SO.buildIdentity = function (B) {
    const t = SO.buildTags(B); let best = null, bs = 0;
    for (const [tags, name] of IDENT) { const s = tags.reduce((a, g) => a + (t[g] || 0), 0); if (s > bs) { bs = s; best = name; } }
    if (!best || bs < 3) return 'Fresh Off the Press';
    return best;
  };

  /* ---------------- offers ---------------- */
  const RW = { common: 1, rare: 0.6, epic: 0.2 };
  SO.offerPlayer = function (B, rng, n, ctx) {
    const pool = UPS.filter(u => !u.fallback && !!u.orig === !!B.f.original && !(ctx.noNew && u.kind === 'new') && (B.counts[u.id] || 0) < u.max && u.req(B, ctx) === true);
    const picks = [];
    const weight = u => {
      let w = RW[u.rarity] || 1;
      if (u.kind === 'new') w *= ctx.round <= 3 ? 1.8 : 0.9;
      if (u.kind === 'evo') w *= 1.6;
      if (u.kind === 'mod') w *= 1.3;
      if (u.cat === 'utility' && !B.utility) w *= 1.5;
      if (B.f.healthBias && (u.cat === 'defense' || u.cat === 'repair')) w *= 3;
      if (u.cat === 'utility' && B.utility && u.util) w *= 0.35;
      if (ctx.exclude && ctx.exclude.includes(u.id)) w *= 0.05;
      return w;
    };
    const avail = pool.slice();
    while (picks.length < n && avail.length) {
      const newCount = picks.filter(p => p.kind === 'new').length;
      const utilCount = picks.filter(p => p.cat === 'utility').length;
      const cand = avail.filter(u => !(u.kind === 'new' && newCount >= 2) && !(u.cat === 'utility' && utilCount >= 1) && !(u.kind === 'evo' && picks.some(p => p.weapon === u.weapon && p.kind === 'evo')));
      if (!cand.length) break;
      let tot = 0; for (const u of cand) tot += weight(u);
      let r = rng() * tot, chosen = cand[0];
      for (const u of cand) { r -= weight(u); if (r <= 0) { chosen = u; break; } }
      picks.push(chosen); avail.splice(avail.indexOf(chosen), 1);
    }
    // Patch the Medic: guarantee at least one health/defense card
    if (B.f.healthBias && !picks.some(p => p.cat === 'defense' || p.cat === 'repair')) { const hp = avail.filter(u => u.cat === 'defense' || u.cat === 'repair'); if (hp.length) picks[picks.length - 1] = hp[Math.floor(rng() * hp.length)]; }
    while (picks.length < n) picks.push(BY.f_overhaul);
    return picks.map(u => u.id);
  };

  /* ---------------- kits ---------------- */
  /* ---------------- characters (starting kits) ----------------
     role: 'Classic' (pure drafting), 'Twist' (small rule change), 'Hard Mode' (harder for bigger rewards), 'Overhaul' (new way to play) */
  SO.KITS = {
    tinkerer: { name: 'Pip', title: 'the Tinkerer', role: 'Classic', stars: 1, icon: 'blaster',
      look: { body: '#22d3c5', dark: '#0f9a90', off: '#34507d', plate: '#f4ead5', jet: '#23395b', acc: 'pip' },
      desc: 'The original square. No gimmicks — just good drafting.',
      traits: ['Blaster + Eraser Pulse', '+2 rerolls', 'Spare Parts: the first reroll in every workshop is free'],
      unlockText: 'Available from the start', weapons: ['blaster'], utility: 'eraser', ups: [], rerolls: 2, flags: { freeReroll: 1 } },
    brawler: { name: 'Brick', title: 'the Bruiser', role: 'Twist', stars: 2, icon: 'scatter',
      look: { body: '#ff9a5c', dark: '#c45a2c', off: '#23395b', plate: '#f4ead5', jet: '#3a3850', acc: 'brick' },
      desc: 'A big, heavy square who wins fights up close.',
      traits: ['Scattergun + Ram Plating + Overdrive', '+40 max HP, bigger body, 8% slower', 'Shoulder Charge: dashing through the boss deals 40 damage and jolts it'],
      unlockText: 'Available from the start', weapons: ['scatter'], utility: 'overdrive', ups: ['k_ram'], hpMod: 40, flags: { shoulder: 1, big: 1 }, mods: B => { B.s.speedMul *= 0.92; } },
    hex: { name: 'Hex', title: 'the Overclocked', role: 'Hard Mode', stars: 4, icon: 'transform',
      look: { body: '#7b5cff', dark: '#4a2fc0', off: '#ff7a5c', plate: '#f4ead5', jet: '#152338', acc: 'hex' },
      desc: 'Runs everything at redline — including the boss. Harder fights, much bigger workshop hauls.',
      traits: ['Blaster + Overdrive, 80 max HP', 'Boss has +30% HP and attacks 15% faster', 'REWARD: 4 cards per pick, +1 reroll every round, and a BONUS pick every 2nd round'],
      unlockText: 'Available from the start', weapons: ['blaster'], utility: 'overdrive', ups: [], hpMod: -20, flags: { hex: 1 }, mods: B => { B.s.cards = 4; } },
    droner: { name: 'Nova', title: 'the Puppeteer', role: 'Overhaul', stars: 3, icon: 'drones',
      look: { body: '#f2c14e', dark: '#b8862a', off: '#22d3c5', plate: '#fffaf0', jet: '#23395b', acc: 'nova' },
      desc: 'Never holds a gun. ALL her weapons ride on a remote pod that follows your cursor and auto-aims.',
      traits: ['Blaster + Cardboard Decoy, −20 max HP', 'Remote Pod: weapons fire from the pod (it trails your cursor, max 320px away) at the nearest target', 'Your body is just the hitbox — dodge with one hand, place the pod with the other'],
      unlockText: 'Clear Round 3', weapons: ['blaster'], utility: 'decoy', ups: [], hpMod: -20, flags: { pod: 1 } },
    ballast: { name: 'Ballast', title: 'the Grounded', role: 'Overhaul', stars: 3, icon: 'mortar',
      look: { body: '#9aa6b8', dark: '#5d6a80', off: '#ff7a5c', plate: '#f4ead5', jet: '#3a3850', acc: 'ballast' },
      desc: 'No jetpack. Jump, double-jump and ground-pound your way through the fight.',
      traits: ['Mortar + Bubble Shield, +40 max HP, +1 dash charge', 'SPACE jumps (press again in the air to double-jump; hold for height)', 'Ground Pound: press S in the air to slam down — 60 damage to a nearby boss and erases bullets around you'],
      unlockText: 'Clear Round 4', weapons: ['mortar'], utility: 'bubble', ups: [], hpMod: 40, flags: { grounded: 1 }, mods: B => { B.s.dashCharges += 1; } },
    bulwark: { name: 'Bulwark', title: 'the Shieldbearer', role: 'Overhaul', stars: 2, icon: 'defense',
      look: { body: '#7c9cc9', dark: '#34507d', off: '#ffd23f', plate: '#f4ead5', jet: '#152338', acc: 'bulwark' },
      desc: 'Carries a big shield that faces your cursor and blocks bullets from the front.',
      traits: ['Gatling + Repair Kit, +20 max HP', 'Guard Shield: blocks enemy shots in a 110° arc toward your cursor (10 guard; big shots cost 3; refills after 1s)', 'Heavy: weapons fire 15% slower, move 10% slower'],
      unlockText: 'Play 3 runs', weapons: ['gatling'], utility: 'repair', ups: [], hpMod: 20, flags: { bulwark: 1 }, mods: B => { B.s.rateMul *= 0.85; B.s.speedMul *= 0.9; } },
    demo: { name: 'Kaboom', title: 'the Demolitionist', role: 'Twist', stars: 2, icon: 'sticky',
      look: { body: '#ff7a5c', dark: '#d9503b', off: '#ffd23f', plate: '#f4ead5', jet: '#23395b', acc: 'kaboom' },
      desc: 'Lives for the chain reaction. Literally explodes when hurt.',
      traits: ['Sticky Charges + Shrapnel Casings + Blink Bomb', 'Fuse Head: when you take damage you explode (60 damage, 120 radius) and erase nearby bullets'],
      unlockText: 'Break 10 boss modules (total)', weapons: ['sticky'], utility: 'blink', ups: ['x_shrap'], flags: { fusehead: 1 } },
    pyro: { name: 'Cinder', title: 'the Firestarter', role: 'Twist', stars: 2, icon: 'flame',
      look: { body: '#ffb09c', dark: '#d9503b', off: '#ffd23f', plate: '#fffaf0', jet: '#3a3850', acc: 'cinder' },
      desc: 'Point-blank arsonist who shrugs off the stage itself.',
      traits: ['Pilot Flame + Incendiary Rounds + Grapple Hook', 'Fireproof: arena hazards can\'t hurt you', 'Burn stacks cap 5 higher'],
      unlockText: 'Clear Round 6', weapons: ['flame'], utility: 'grapple', ups: ['t_burn'], flags: { fireproof: 1 }, mods: B => { B.s.burnMax += 5; } },
    spark: { name: 'Spark', title: 'the Reflector', role: 'Overhaul', stars: 4, icon: 'prism',
      look: { body: '#d8fbff', dark: '#7c9cc9', off: '#ff7a5c', plate: '#ffffff', jet: '#34507d', acc: 'spark' },
      desc: 'Starts UNARMED. Her mirror-plated dash turns the boss\'s own bullets into homing shots.',
      traits: ['No weapon, Bubble Shield, only 3 weapon slots ever', 'Mirror Dash: bullets you dash through fly back at the boss as homing shots (up to 12 per dash, damage grows each round)', '2 dash charges, 0.7s cooldown'],
      unlockText: 'Clear Round 8', weapons: [], utility: 'bubble', ups: [], flags: { reflect: 1 }, mods: B => { B.maxWeapons = 3; B.s.dashCharges = 2; B.s.dashCd = 0.7; } },
    medic: { name: 'Patch', title: 'the Medic', role: 'Twist', stars: 1, icon: 'repair',
      look: { body: '#f4f1e8', dark: '#b9b2a0', off: '#ff2f63', plate: '#e8f7ff', jet: '#34507d', acc: 'medic' },
      desc: 'Hits soft, refuses to go down. Built to outlast the boss rather than outgun it.',
      traits: ['Blaster + Repair Kit', '+60 max HP (160 total), but all your damage is 25% lower', 'Bedside Manner: health & defense upgrades show up 3× as often — and at least one is offered every workshop'],
      unlockText: 'Clear Round 2', weapons: ['blaster'], utility: 'repair', ups: [], hpMod: 60, flags: { healthBias: 1 }, mods: B => { B.s.dmgMul *= 0.75; } },
    tally: { name: 'Tally', title: 'the Bounty Hunter', role: 'Hard Mode', stars: 4, icon: 'railgun',
      look: { body: '#c9a774', dark: '#8a6440', off: '#23395b', plate: '#f4ead5', jet: '#3a3850', acc: 'tally' },
      desc: 'Takes a contract every round. Pay out and the workshop gets generous; slack off and the boss gets fed.',
      traits: ['Railgun + Time Dilation', 'CONTRACT each round (e.g. take ≤30 damage, win fast, break a module)', 'REWARD: completed contract = a BONUS pick + 1 reroll', 'RISK: every 3rd round the boss gets TWO upgrades'],
      unlockText: 'Beat 15 bosses (total)', weapons: ['railgun'], utility: 'dilate', ups: [], flags: { tally: 1 } },
    gambler: { name: 'Dice', title: 'the Gambler', role: 'Hard Mode', stars: 3, icon: 'transform',
      look: { body: '#fffaf0', dark: '#c9b48a', off: '#ff2f63', plate: '#f4ead5', jet: '#1b1a2e', acc: 'dice' },
      desc: 'Everything is random — your start AND the boss\'s.',
      traits: ['Random weapon, utility and 2 random upgrades', 'The boss starts with 1 random upgrade', '5 rerolls, and the first reroll each workshop is free'],
      unlockText: 'Play as 5 different characters', weapons: [], utility: null, ups: [], rerolls: 3, random: true, flags: { freeReroll: 1 } },
    penny: { name: 'Penny', title: 'the Banker', role: 'Classic', stars: 1, icon: 'global',
      look: { body: '#7fd88a', dark: '#3f9a52', off: '#ffd23f', plate: '#fffaf0', jet: '#23395b', acc: 'penny' },
      desc: 'Saves up for the good stuff. Fewer bullets, more choices.',
      traits: ['Blaster + Eraser Pulse', 'Interest: +1 reroll every workshop', 'Thrifty: all your damage is 10% lower'],
      unlockText: 'Available from the start', weapons: ['blaster'], utility: 'eraser', ups: [], flags: { bank: 1 }, mods: B => { B.s.dmgMul *= 0.9; } },
    tempo: { name: 'Tempo', title: 'the Rhythm', role: 'Twist', stars: 2, icon: 'global',
      look: { body: '#ff8fc8', dark: '#c4508a', off: '#23395b', plate: '#fffaf0', jet: '#3a3850', acc: 'tempo' },
      desc: 'Keeps the beat. The longer she goes without getting hit, the harder she hits.',
      traits: ['Blaster + Overdrive', 'Combo: every 10 hits in a row adds +2% damage (max +30%)', 'Getting hit drops the combo to zero'],
      unlockText: 'Available from the start', weapons: ['blaster'], utility: 'overdrive', ups: [], flags: { combo: 1 } },
    magpie: { name: 'Magpie', title: 'the Collector', role: 'Classic', stars: 1, icon: 'global',
      look: { body: '#5b6b8c', dark: '#34405a', off: '#22d3c5', plate: '#f4ead5', jet: '#152338', acc: 'magpie' },
      desc: 'Can\'t resist a shiny new weapon. Starts with a bigger bench and a bigger rack.',
      traits: ['Blaster + Eraser Pulse', 'Hoarder\'s Bench: 4 cards per pick and +2 rerolls', '6 weapon slots, but −10% damage'],
      unlockText: 'Available from the start', weapons: ['blaster'], utility: 'eraser', ups: ['R_hoard'], rerolls: 2, mods: B => { B.maxWeapons = 6; B.s.dmgMul *= 0.9; } },
    titan: { name: 'Titan', title: 'the Colossus', role: 'Twist', stars: 2, icon: 'close',
      look: { body: '#c98a5c', dark: '#8a5432', off: '#ffd23f', plate: '#f4ead5', jet: '#3a3850', acc: 'titan' },
      desc: 'An enormous square who walks right up to the boss and leans on it.',
      traits: ['Scattergun + Bubble Shield + Mega Square + Ram Plating', '+30 max HP, big body (same small hitbox)', 'Touching the boss grinds it down'],
      unlockText: 'Available from the start', weapons: ['scatter'], utility: 'bubble', ups: ['R_mega', 'k_ram'], hpMod: 30 },
    forge: { name: 'Forge', title: 'the Smith', role: 'Twist', stars: 2, icon: 'gatling',
      look: { body: '#e0703c', dark: '#a8421c', off: '#3a3850', plate: '#f4ead5', jet: '#23395b', acc: 'forge' },
      desc: 'Runs hot on purpose. Builds heat with every hit, then unloads.',
      traits: ['Gatling + Overdrive', 'Overheat Core: dealing damage builds Heat; at full Heat every weapon fires twice as fast for 3s'],
      unlockText: 'Clear Round 5', weapons: ['gatling'], utility: 'overdrive', ups: ['R_heat'] },
    rime: { name: 'Rime', title: 'the Frostbite', role: 'Twist', stars: 2, icon: 'cryo',
      look: { body: '#bfe9ff', dark: '#6aa8d0', off: '#23395b', plate: '#ffffff', jet: '#34507d', acc: 'rime' },
      desc: 'Slows the whole fight down — especially when things get scary.',
      traits: ['Cryo Sprayer + Time Dilation', 'Clutch Chronometer: below 35% HP, enemy shots and boss attacks move 30% slower'],
      unlockText: 'Clear Round 7', weapons: ['cryo'], utility: 'dilate', ups: ['R_chrono'] },
    glimmer: { name: 'Glimmer', title: 'the Glass Cannon', role: 'Hard Mode', stars: 4, icon: 'prism',
      look: { body: '#e8d8ff', dark: '#9a7ad8', off: '#ff2f63', plate: '#ffffff', jet: '#34507d', acc: 'glimmer' },
      desc: 'Hits like a truck. Shatters like a window.',
      traits: ['Prism Projector + Bubble Shield', 'Glass Square: max HP halved, all damage ×1.5', 'REWARD: 4 cards per pick'],
      unlockText: 'Clear Round 9', weapons: ['prism'], utility: 'bubble', ups: ['R_glass'], mods: B => { B.s.cards = 4; } },
    streak: { name: 'Streak', title: 'the Comet', role: 'Overhaul', stars: 3, icon: 'mobility',
      look: { body: '#ffd23f', dark: '#c49a1c', off: '#ff2f63', plate: '#fffaf0', jet: '#23395b', acc: 'streak' },
      desc: 'Fights by ramming through the boss at full speed. The dash IS the weapon.',
      traits: ['Blaster + Grapple Hook, −10 max HP, +1 dash charge', 'Comet Form: longer dashes; dashing through the boss deals 90 damage and staggers it', 'Dash Volley: every dash fires a ring of 10 bolts'],
      unlockText: 'Win a Standard Run', weapons: ['blaster'], utility: 'grapple', ups: ['R_comet', 'g_dashvolley'], hpMod: -10, mods: B => { B.s.dashCharges += 1; } },
    wisp: { name: 'Wisp', title: 'the Phantom', role: 'Twist', stars: 3, icon: 'mobility',
      look: { body: '#d8f0f0', dark: '#8ab8c0', off: '#7b5cff', plate: '#ffffff', jet: '#34507d', acc: 'wisp' },
      desc: 'Fragile, but almost impossible to pin down.',
      traits: ['Boomerang + Blink Bomb, −30 max HP', '3 dash charges, 0.8s cooldown', 'Phase Dash + Slipstream: dashes erase bullets and boost you afterward'],
      unlockText: 'Play 5 runs', weapons: ['boomerang'], utility: 'blink', ups: ['m_phase', 'm_slip'], hpMod: -30, mods: B => { B.s.dashCharges = 3; B.s.dashCd = 0.8; } },
    halo: { name: 'Halo', title: 'the Guardian', role: 'Classic', stars: 1, icon: 'defense',
      look: { body: '#fff3c4', dark: '#d8b860', off: '#22d3c5', plate: '#ffffff', jet: '#34507d', acc: 'halo' },
      desc: 'Protected from every angle. The easiest square to keep alive.',
      traits: ['Aegis Satellites + Bubble Shield, +10 max HP', '+20 shield that refills', 'Last Stand: once per round, a lethal hit leaves you at 1 HP'],
      unlockText: 'Play 10 runs', weapons: ['aegis'], utility: 'bubble', ups: ['d_shield', 'd_last'], hpMod: 10 },
    bramble: { name: 'Bramble', title: 'the Thorny', role: 'Twist', stars: 2, icon: 'close',
      look: { body: '#6fae4a', dark: '#3f7a2a', off: '#c94a6a', plate: '#f4ead5', jet: '#3a3850', acc: 'bramble' },
      desc: 'Every time the boss lands a hit, it gets stung right back.',
      traits: ['Arc Whip + Repair Kit, +20 max HP', 'Thorns: whenever you take damage, the boss takes 45 damage'],
      unlockText: 'Beat 5 bosses (total)', weapons: ['whip'], utility: 'repair', ups: [], hpMod: 20, flags: { thorns: 1 } },
    volt: { name: 'Volt', title: 'the Live Wire', role: 'Twist', stars: 3, icon: 'tesla',
      look: { body: '#4fd0ff', dark: '#1f8ac0', off: '#ffd23f', plate: '#fffaf0', jet: '#152338', acc: 'volt' },
      desc: 'Stores up a charge every time she dashes and dumps it into the boss.',
      traits: ['Tesla Coil + Overdrive', 'Static Charge: after each dash, your next 3 hits deal +50% damage', '+8% critical hit chance'],
      unlockText: 'Break 25 boss modules (total)', weapons: ['tesla'], utility: 'overdrive', ups: ['c_chance'], flags: { static: 1 } },
    mote: { name: 'Mote', title: 'the Tiny', role: 'Twist', stars: 3, icon: 'mobility',
      look: { body: '#a8e05a', dark: '#6aa02a', off: '#ff7a5c', plate: '#fffaf0', jet: '#23395b', acc: 'mote' },
      desc: 'Barely there. Slips through gaps nobody else can fit through.',
      traits: ['Seeker Darts + Blink Bomb, −40 max HP', 'Tiny: much smaller body and a 40% smaller hitbox', '+10% move speed'],
      unlockText: 'Reach Round 8 in Endless', weapons: ['seeker'], utility: 'blink', ups: [], hpMod: -40, flags: { tiny: 1 }, mods: B => { B.s.hitR *= 0.6; B.s.speedMul *= 1.1; } },
    glint: { name: 'Glint', title: 'the Sharpshooter', role: 'Twist', stars: 3, icon: 'precision',
      look: { body: '#f2f2f2', dark: '#a0a0b0', off: '#ff2f63', plate: '#e8f7ff', jet: '#1b1a2e', acc: 'glint' },
      desc: 'Every shot is a critical hit or a waste. Stand still and make them count.',
      traits: ['Laser Lance + Time Dilation', 'Dead Eye: +25% critical hit chance, but hits that don\'t crit deal 25% less', 'Steady Hands + Long Shot'],
      unlockText: 'Win a run with a challenge on', weapons: ['laser'], utility: 'dilate', ups: ['p_steady', 'p_long'], flags: { allCrit: 1 }, mods: B => { B.s.critChance += 0.25; } },
    fang: { name: 'Fang', title: 'the Vampire', role: 'Hard Mode', stars: 4, icon: 'repair',
      look: { body: '#8a3a5a', dark: '#5a1a34', off: '#ffd23f', plate: '#f4ead5', jet: '#1b1a2e', acc: 'fang' },
      desc: 'Can only heal by drinking the boss dry. Fragile at first, unstoppable once she gets going.',
      traits: ['Needle Gun + Blink Bomb, −30 max HP', 'Siphon Coils + Vampire Rivets: heal from damage and crits', 'RISK: no repairs between rounds (only 25%)', 'REWARD: +1 reroll every round'],
      unlockText: 'Beat 30 bosses (total)', weapons: ['needle'], utility: 'blink', ups: ['r_siphon', 'r_vamp'], hpMod: -30, flags: { bank: 1, lowRepair: 1 } },
    duo: { name: 'Duo', title: 'the Twins', role: 'Overhaul', stars: 3, icon: 'transform',
      look: { body: '#b48cff', dark: '#7a50c8', off: '#22d3c5', plate: '#fffaf0', jet: '#23395b', acc: 'twins' },
      desc: 'Two squares, one brain. A mirrored twin copies every move from the other side of the arena.',
      traits: ['Blaster + Cardboard Decoy, −10 max HP', 'Twin Square: your twin mirrors you across the arena and fires your first weapon at 60% damage. It can\'t be hurt'],
      unlockText: 'Play as 10 different characters', weapons: ['blaster'], utility: 'decoy', ups: ['R_twin'], hpMod: -10 },
    mirage: { name: 'Mirage', title: 'the Illusionist', role: 'Overhaul', stars: 3, icon: 'transform',
      look: { body: '#9ad8ff', dark: '#5a8ac8', off: '#ff7ad8', plate: '#ffffff', jet: '#34507d', acc: 'mirage' },
      desc: 'Never quite where the boss thinks. Leaves afterimages that soak up its aim.',
      traits: ['Ricochet Disc + Cardboard Decoy, −20 max HP', 'Afterimage: every 5s you leave a copy of yourself behind; the boss aims at it for 1.5s', 'Getting hit delays the next afterimage'],
      unlockText: 'FEAT: win a round without getting hit once', weapons: ['disc'], utility: 'decoy', ups: [], hpMod: -20, flags: { mirage: 1 } },
    anchor: { name: 'Anchor', title: 'the Immovable', role: 'Overhaul', stars: 3, icon: 'defense',
      look: { body: '#4a6a8a', dark: '#2a4060', off: '#ffd23f', plate: '#f4ead5', jet: '#152338', acc: 'anchor' },
      desc: 'Can\'t dash. Doesn\'t need to. Plants its feet and turns into a turret.',
      traits: ['Flak Cannon + Bubble Shield, +40 max HP', 'NO DASH at all', 'Planted: hold still for 0.4s to take 50% less damage and fire 40% faster'],
      unlockText: 'FEAT: win a round without dashing', weapons: ['flak'], utility: 'bubble', ups: [], hpMod: 40, flags: { anchor: 1 } },
    blitz: { name: 'Blitz', title: 'the Speedrunner', role: 'Twist', stars: 3, icon: 'mobility',
      look: { body: '#ff5a6a', dark: '#c02a3a', off: '#ffd23f', plate: '#fffaf0', jet: '#23395b', acc: 'blitz' },
      desc: 'Goes all in at the opening bell. If the boss survives the rush, it\'s a long day.',
      traits: ['Scattergun + Overdrive, +15% move speed', 'Opening Rush: +60% damage for the first 12s of every round', 'Overtime: −15% damage after 45s'],
      unlockText: 'FEAT: win a round in under 20 seconds', weapons: ['scatter'], utility: 'overdrive', ups: [], flags: { blitz: 1 }, mods: B => { B.s.speedMul *= 1.15; } },
    ember: { name: 'Ember', title: 'the Last Spark', role: 'Hard Mode', stars: 4, icon: 'flame',
      look: { body: '#ffb84a', dark: '#c0701a', off: '#ff2f63', plate: '#fffaf0', jet: '#3a3850', acc: 'ember' },
      desc: 'Burns brightest when nearly out. Lives on the edge on purpose.',
      traits: ['Pilot Flame + Repair Kit, −20 max HP', 'Last Spark: +25% damage below 50% HP, +70% below 25%', 'Slow Burn: repairs 1.5 HP/s after 4s without being hit'],
      unlockText: 'FEAT: win a round with 10 HP or less left', weapons: ['flame'], utility: 'repair', ups: ['r_field'], hpMod: -20, flags: { ember: 1 } },
    juggler: { name: 'Juggler', title: 'the Showoff', role: 'Twist', stars: 3, icon: 'global',
      look: { body: '#ffd8e8', dark: '#d88aa8', off: '#7b5cff', plate: '#ffffff', jet: '#23395b', acc: 'juggler' },
      desc: 'Three weapons from the start, and they take turns in the spotlight.',
      traits: ['Blaster + Scattergun + Seeker Darts + Eraser Pulse', 'Spotlight: every 4s a different weapon fires 2.5× faster; the others fire 25% slower', '6 weapon slots'],
      unlockText: 'FEAT: win a round holding 6 weapons', weapons: ['blaster', 'scatter', 'seeker'], utility: 'eraser', ups: [], flags: { juggle: 1 }, mods: B => { B.maxWeapons = 6; } },
    sponge: { name: 'Sponge', title: 'the Absorber', role: 'Overhaul', stars: 2, icon: 'interact',
      look: { body: '#ffe27a', dark: '#c8a83a', off: '#3a8ae0', plate: '#fffaf0', jet: '#23395b', acc: 'sponge' },
      desc: 'Soaks up bullets for a living. Every one it destroys patches a little damage.',
      traits: ['Gatling + Eraser Pulse', 'Soak: every enemy bullet you destroy repairs 0.5 HP (max 5 HP per second)', 'Phase Dash + Bullet-Eater Rounds'],
      unlockText: 'FEAT: destroy 300 enemy bullets in one run', weapons: ['gatling'], utility: 'eraser', ups: ['m_phase', 'x_eater'], flags: { sponge: 1 } },
    underdog: { name: 'Underdog', title: 'the Comeback Kid', role: 'Hard Mode', stars: 4, icon: 'close',
      look: { body: '#c8b8a0', dark: '#8a7a60', off: '#ff7a5c', plate: '#f4ead5', jet: '#3a3850', acc: 'underdog' },
      desc: 'Starts out tiny and scrappy. Gets tougher every single round it survives.',
      traits: ['Blaster + Repair Kit', 'Starts at 60 max HP and 70% damage', 'Grows: +12 max HP and +9% damage for every round cleared (no limit)'],
      unlockText: 'FEAT: get knocked out in Round 1', weapons: ['blaster'], utility: 'repair', ups: [], hpMod: -40, flags: { underdog: 1 }, mods: (B, run) => { const r = Math.max(0, ((run && run.round) || 1) - 1); B.s.maxHp += 12 * r; B.s.dmgMul *= 0.7 * Math.pow(1.09, r); } },
    glitch: { name: 'Glitch', title: 'the Corrupted', role: 'Overhaul', stars: 4, icon: 'transform',
      look: { body: '#3a3a4a', dark: '#1b1a2e', off: '#7fff8a', plate: '#d8ffe0', jet: '#152338', acc: 'glitch' },
      desc: 'Something got into its code. Every round it rewrites itself.',
      traits: ['Blaster + Blink Bomb', 'Corrupted: every round it gains a random Transformation for that round only', 'You find out which one when the round starts'],
      unlockText: 'SECRET: poke around on this screen…', weapons: ['blaster'], utility: 'blink', ups: [], flags: { glitch: 1 } }
  };
  SO.GLITCH_FORMS = ['R_glass', 'R_twin', 'R_mega', 'R_chrono', 'R_heat', 'R_comet'];
  SO.KIT_ORDER = ['tinkerer', 'brawler', 'hex', 'penny', 'tempo', 'magpie', 'titan', 'medic', 'droner', 'ballast', 'bulwark', 'forge', 'pyro', 'rime', 'spark', 'glimmer', 'streak', 'wisp', 'halo', 'bramble', 'demo', 'volt', 'mote', 'tally', 'glint', 'fang', 'gambler', 'duo', 'mirage', 'anchor', 'blitz', 'ember', 'juggler', 'sponge', 'underdog', 'glitch'];
  SO.KIT_START = ['tinkerer', 'brawler', 'hex', 'penny', 'tempo', 'magpie', 'titan'];
  SO.ROLE_COLOR = { Classic: '#22d3c5', Twist: '#ffd23f', 'Hard Mode': '#ff2f63', Overhaul: '#7b5cff' };
  SO.CONTRACTS = {
    clean: { text: r => 'Take 30 damage or less', check: (W) => SO.sumObj(W.stats.dmgTaken) <= 30, prog: W => Math.round(SO.sumObj(W.stats.dmgTaken)) + '/30 dmg' },
    quick: { text: r => 'Win within ' + (40 + 8 * r) + 's', check: (W, r) => W.stats.time <= 40 + 8 * r, prog: (W, r) => Math.ceil(Math.max(0, 40 + 8 * r - W.stats.time)) + 's left' },
    wrecker: { text: () => 'Break a weapon module', check: W => W.stats.modulesBroken >= 1, prog: W => W.stats.modulesBroken + '/1', needsModule: true },
    still: { text: () => 'Win using 4 dashes or fewer', check: W => W.stats.dashes <= 4, prog: W => W.stats.dashes + '/4 dashes' },
    crits: { text: () => 'Land 25 critical hits', check: W => W.stats.critHits >= 25, prog: W => (W.stats.critHits || 0) + '/25 crits' }
  };
  SO.sumObj = o => Object.values(o || {}).reduce((a, b) => a + b, 0);

  SO.CHALLENGES = {
    glass: { name: 'Glass Jaw', desc: 'Your max HP is halved all run.' },
    rush: { name: 'Rush Hour', desc: 'Boss attacks come 20% faster and it may overlap more patterns.' },
    noreroll: { name: 'No Take-Backs', desc: 'No rerolls at all.' },
    double: { name: 'Double Trouble', desc: 'The boss gets TWO upgrades every round. You still pick both.' },
    heavy: { name: 'Heavy Gravity', desc: 'Gravity +35%. Thrust +15% to compensate.' },
    halfheal: { name: 'Thin Margins', desc: 'You only repair 50% of max HP between rounds.' },
    armored: { name: 'Pre-Plated', desc: 'The boss starts the run with Armor Plating.' }
  };
  SO.CHALLENGE_ORDER = ['glass', 'rush', 'noreroll', 'double', 'heavy', 'halfheal', 'armored'];

  SO.COSMETIC_UNLOCKS = { classic: 'Default', coral: 'Win a run with a challenge active', blueprint: 'Reach Round 12 in Endless', gold: 'Win a Standard Run', news: 'Fight 3 different chassis types', mint: 'Beat 25 bosses (total)' };
})();
