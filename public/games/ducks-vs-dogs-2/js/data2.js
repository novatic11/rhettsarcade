/* Ducks vs. Dogs 2 — Expansion 1.1 "The Haunted Kennel": new ducks, dogs, world 6, shops, snacks, stars, trophies. */
(function (D) {
  'use strict';
  D.VERSION = '1.1.0';

  /* ------------------------------------------------------------ NEW DUCKS */
  Object.assign(D.DUCKS, {
    piggy: {
      name: 'Piggybank Pintail', role: 'Coin Saver', kind: 'coiner', cost: 75, cd: 15, startCd: 5, hp: 300,
      coin: 5, interval: 40, maxDrops: 6,
      body: '#f7a1c4', accent: '#ffcd2e', look: 'piggy',
      desc: 'Drops a 5-coin piece every 40 seconds (up to 6 per level). Coins are kept for the shops, even if you lose.',
      tip: 'Plant one early in a safe back corner on levels you find easy.',
      funny: 'Has been saving up for a pond of its own since it was an egg. It is currently at 14 coins.',
      qp: { name: 'Jackpot', desc: 'Shakes out 75 crumbs and one bonus coin piece.' },
      source: 'shop:cart'
    },
    boomer: {
      name: 'Boomerang Bufflehead', role: 'Returner', kind: 'rang', cost: 150, cd: 7.5, startCd: 0, hp: 300,
      dmg: 25, interval: 2.6, range: 4.5,
      body: '#2d2d3a', accent: '#ff9f1c', look: 'rang',
      desc: 'Throws a boomerang 4.5 tiles down its lane that hits every dog on the way out AND on the way back (25 each). Hits flying dogs.',
      tip: 'Great against packs and Balloon Beagles. Stand it a little behind the front line.',
      funny: 'Spent a gap year in Australia. Will not stop saying "g\'day".',
      qp: { name: 'Boomerang Blizzard', desc: 'Throws boomerangs the full length of its lane and both neighbour lanes (40 per hit).' },
      source: 'level:3-5'
    },
    shiny: {
      name: 'Shiny Shelduck', role: 'Reflector', kind: 'reflector', cost: 100, cd: 10, startCd: 5, hp: 400,
      reflect: 90,
      body: '#ffffff', accent: '#9fe3ff', look: 'shiny',
      desc: 'Tennis balls, bones and snowballs aimed at ducks in the 3×3 around it bounce back at the thrower for 90 damage.',
      tip: 'Turns Tennis Terriers, Catapult Corgis and Snowball Samoyeds against themselves.',
      funny: 'Polishes its mirror 40 times a day. Has never once looked at its own reflection. Too humble.',
      qp: { name: 'Mirror Dome', desc: 'For 10 seconds, every throw and boss strike anywhere bounces away harmlessly.' },
      source: 'level:4-3'
    },
    syrup: {
      name: 'Syrup Smew', role: 'Sticky', kind: 'sticky', cost: 100, cd: 7.5, startCd: 0, hp: 300,
      interval: 9, dur: 14, slowK: 0.3,
      body: '#f4f4f4', accent: '#d98a1c', look: 'syrup',
      desc: 'Every 9s pours a syrup puddle 2 tiles ahead. Dogs on syrup crawl at 30% speed and can\'t jump.',
      tip: 'Pair with Storm Duck or Boomerang: slow dogs bunch up into one big target.',
      funny: 'Breakfast is its favourite meal. Second breakfast is its second favourite.',
      qp: { name: 'Pancake Flood', desc: 'Syrup floods 4 tiles ahead in its lane and both neighbour lanes for 12s.' },
      source: 'level:4-6'
    },
    twisty: {
      name: 'Twisty Teal', role: 'Two-Way', kind: 'twoway', cost: 125, cd: 7.5, startCd: 0, hp: 300,
      dmg: 20, interval: 1.5,
      body: '#5fd0c0', accent: '#ff5a8a', look: 'twisty',
      desc: 'Shoots water both forwards and backwards (20 each). Handles dogs that land or pop up behind your line.',
      tip: 'Counters Digger Dachshunds, Chihuahua Cannonballs and Phantom Pups that slip past.',
      funny: 'Can\'t decide which way it\'s facing, so it faces both. It is very dizzy.',
      qp: { name: 'Spin Cycle', desc: 'Spins for 3 seconds, spraying water both ways in 3 lanes.' },
      source: 'level:5-1'
    },
    squeak: {
      name: 'Squeaky Rubber Duck', role: 'Bouncer', kind: 'wall', bouncer: true, cost: 75, cd: 15, startCd: 5, hp: 1800,
      push: 0.7, every: 1.2,
      body: '#ffe600', accent: '#ff7a1a', look: 'squeak',
      desc: 'A cheap 1800-health blocker. Every 1.2s a dog chewing on it is SQUEAKED back 0.7 tiles.',
      tip: 'Keeps dogs inside your shooters\' range longer. Big dogs and bosses don\'t bounce.',
      funny: 'Originally a bath toy. Escaped the tub during a bubble bath and never looked back.',
      qp: { name: 'Mega Squeak', desc: 'Knocks back every dog within 3 tiles in 3 lanes by 2.5 tiles and stuns them 1s.' },
      source: 'level:5-5'
    },
    spade: {
      name: 'Spade Scaup', role: 'Digger', kind: 'spade', cost: 50, cd: 15, startCd: 0, hp: 300,
      dmg: 250, stun: 5,
      body: '#7a6a5a', accent: '#c0c6cf', look: 'spade',
      desc: 'Placed on a bone pile: digs it up and finds 50 crumbs. On an empty tile: digs a pit that traps the next dog (250 damage, 5s stun).',
      tip: 'The only duck that can stand on bone piles. Clear them before dogs rise out of them!',
      funny: 'Dug to the other side of the world once. It was just more pond.',
      qp: { name: 'Sinkhole', desc: 'The pit swallows up to 3 dogs within 2 tiles in its lane (300 damage, 5s stun).' },
      source: 'level:6-1'
    },
    decoy: {
      name: 'Decoy Drake', role: 'Lure', kind: 'lure', cost: 75, cd: 20, startCd: 10, hp: 1500,
      interval: 3, range: 2.5,
      body: '#b07a45', accent: '#2f7a4a', look: 'decoy',
      desc: 'A sturdy wooden decoy (1500 health). Every 3s it lures a dog from a neighbouring lane into its own lane.',
      tip: 'Pull dogs into your strongest lane. Phantoms, flyers and big dogs ignore it.',
      funny: 'Has stood perfectly still since 1987. Is it alive? It will not say.',
      qp: { name: 'Irresistible!', desc: 'Lures every dog within 4 tiles from 2 lanes either side, and becomes invulnerable for 5s.' },
      source: 'level:6-4'
    },
    sizzle: {
      name: 'Sizzle Scoter', role: 'Flamer', kind: 'flamer', cost: 175, cd: 7.5, startCd: 0, hp: 300,
      dmg: 35, interval: 1.8, range: 2.5, burn: 8,
      body: '#2b2b33', accent: '#ff5a1a', look: 'sizzle',
      desc: 'Short-range flame (2.5 tiles): 35 damage to every dog in reach and sets them burning. Burns off camouflage. Soaked dogs only steam.',
      tip: 'Mummy Mastiffs and Phantom Pups take double damage from fire. Don\'t pair with water shooters in the same lane.',
      funny: 'Trained under Chef Brioche. Was asked to leave after toasting the toaster.',
      qp: { name: 'Inferno', desc: 'A flame wave down its entire lane: 250 damage, burning and reveal.' },
      source: 'shop:snack'
    },
    copycat: {
      name: 'Copycat Canvasback', role: 'Mimic', kind: 'mimic', cost: 150, cd: 10, startCd: 5, hp: 300,
      mult: 0.75, interval: 2,
      body: '#c9ccd4', accent: '#a0452a', look: 'copycat',
      desc: 'Copies the attack of the duck directly BEHIND it (one tile left) at 75% power. Its Quack Power copies that duck\'s Quack Power!',
      tip: 'Duck-to-duck combo: put it in front of your best attacker, or a Breadwinner for extra crumbs.',
      funny: 'Wears cat ears to confuse the dogs. It works more often than it should.',
      qp: { name: 'Copy That!', desc: 'Triggers the Quack Power of the duck behind it, for free.' },
      source: 'shop:observatory'
    }
  });
  D.DUCK_ORDER.push('piggy', 'boomer', 'shiny', 'syrup', 'twisty', 'squeak', 'spade', 'decoy', 'sizzle', 'copycat');
  Object.assign(D.ATTACK_KINDS, { rang: 1, twoway: 1, flamer: 1, mimic: 1 });

  /* ------------------------------------------------------------ NEW DOGS */
  Object.assign(D.DOGS, {
    phantom: { name: 'Phantom Pup', hp: 280, speed: 0.2, bite: 0, pts: 3, body: '#dfe8ff', look: 'phantom', phantom: true,
      desc: 'A spooky see-through pup that floats straight THROUGH your ducks without stopping.', counter: 'Raw damage, Twisty Teal behind your line, and fire (double damage).',
      funny: 'Not actually a ghost. Just a very pale pup in a bedsheet who learned to hover. Somehow.' },
    mummy: { name: 'Mummy Mastiff', hp: 500, speed: 0.18, bite: 60, pts: 3.5, body: '#d8c8a8', look: 'mummy', mummy: true,
      desc: 'Wrapped in bandages that soak up water: water shots deal half damage. Fire burns the bandages off.', counter: 'Sizzle Scoter, lobbers, Zappy Drake, Longbill.',
      funny: 'Fell into a toilet-paper aisle in 1922. Never fully recovered.' },
    werewoof: { name: 'Werewoof', hp: 400, speed: 0.22, bite: 60, pts: 4, body: '#8a7866', look: 'werewoof', were: true,
      desc: 'At half health it howls and transforms: much faster, bites twice as hard and heals 150.', counter: 'Burst it down quickly: Firecracker, Snapshell, Storm Duck.',
      funny: 'Perfectly polite on regular nights. Please do not show it the moon.' },
    balloon: { name: 'Balloon Beagle', hp: 200, balloon: 150, speed: 0.3, bite: 60, pts: 3, body: '#e3b072', look: 'balloonDog', flies: true,
      desc: 'Floats over your ducks on a balloon. Straight shots pass underneath until the balloon pops.', counter: 'Boomerang Bufflehead, lobbers, Zappy Drake, Longbill. Popped balloons drop the beagle.',
      funny: 'Wanted to see the world from above. Mostly sees the tops of ducks.' }
  });
  D.DOG_ORDER.push('phantom', 'mummy', 'werewoof', 'balloon');

  /* ------------------------------------------------------------ NEW BOSS */
  D.BOSSES.barkula = {
    name: 'Count Barkula', title: 'Lord of the Haunted Kennel', hp: 9500, look: 'barkula', body: '#2a2230',
    desc: 'A caped vampire hound. Raises bone piles full of dogs, curses your ducks and summons phantoms.',
    funny: 'Sleeps all day in a dog bed shaped like a coffin. Has never once fetched a stick. Too dignified.',
    phases: [
      { at: 1.0, say: 'Velcome to my kennel... BLEH!', attacks: ['graves', 'summon', 'curse'], cd: 10, pool: { mutt: 2, phantom: 2, helmet: 1 } },
      { at: 0.6, say: 'Rise, my pups! RISE!', attacks: ['graves', 'curse', 'summon', 'fog'], cd: 8.5, pool: { phantom: 2, mummy: 1, balloon: 2 } },
      { at: 0.3, say: 'The full moon is MINE! AROOO!', attacks: ['curse', 'graves', 'laser', 'summon', 'graves'], cd: 7, pool: { werewoof: 1, phantom: 2, balloon: 1, mummy: 1 } }
    ]
  };

  /* ------------------------------------------------------------ WORLD 6 */
  D.WORLDS.push({ id: 6, name: 'Haunted Kennel', sub: 'Bone piles, portals and spooky pups', boss: 'barkula', music: 7,
    t: { grassA: '#6f7f58', grassB: '#62714d', ground: '#4b4a3c', skyTop: '#2a1840', skyBot: '#c0607a', fog: '#4a3050', sun: 0.75, amb: 0.8, dirt: '#5a4636', pond: '#3f8a8f', night: true, spooky: true } });
  D.WORLDS[4].sub = 'The dogs\' elaborate stronghold';

  // retrofit: later levels now award the new ducks (old saves get them on load)
  D.LEVEL['3-5'].reward = { duck: 'boomer' };
  D.LEVEL['4-3'].reward = { duck: 'shiny' };
  D.LEVEL['4-6'].reward = { duck: 'syrup' };
  D.LEVEL['5-1'].reward = { duck: 'twisty' };
  D.LEVEL['5-5'].reward = { duck: 'squeak' };
  D.LEVEL['5-8'].story = 'Dr. Woofenstein\'s Mega-Mutt Mech guards the fortress. Beat it — but listen for that spooky howl…';

  const L = D.LEVELS;
  function lv(o) { o.lanes = o.lanes || [0, 1, 2, 3, 4]; o.mode = o.mode || 'normal'; o.env = o.env || {}; o.start = o.start == null ? 50 : o.start;
    o.sky = o.sky !== false; o.obj = o.obj || ['noGoose', 'keepAll']; L.push(o); return o; }
  lv({ id: '6-1', w: 6, n: 1, name: 'Bone Yard', env: { graves: [[6, 0], [7, 2], [5, 4], [8, 1], [6, 3]], graveRise: true }, waves: 10,
    pool: { mutt: 3, helmet: 2, runner: 1, door: 1 }, base: 4.2, grow: 1.1, flags: [4, 9], tut: 'graves', reward: { duck: 'spade' }, coins: 220,
    story: 'Bone piles litter the kennel lawn. During big waves, dogs pop right out of them!' });
  lv({ id: '6-2', w: 6, n: 2, name: 'Boo Crew', env: { graves: [[7, 1], [6, 3], [8, 4]], graveRise: true }, waves: 10,
    pool: { mutt: 3, helmet: 2, phantom: 1.4, sneaky: 0.8 }, newDog: 'phantom', base: 4.2, grow: 1.1, flags: [4, 9], reward: { coins: 240 }, coins: 220,
    story: 'Phantom Pups float straight through your ducks. Only damage will stop them!' });
  lv({ id: '6-3', w: 6, n: 3, name: 'Portal Panic', env: { portals: [[[7, 0], [4, 2]], [[6, 4], [3, 1]]] }, waves: 10,
    pool: { mutt: 3, helmet: 2, phantom: 1, skater: 1, runner: 1 }, base: 4.3, grow: 1.1, flags: [4, 9], tut: 'portals', reward: { coins: 240 }, coins: 225,
    story: 'Spooky portals zap dogs from one tile to another. Match the colours to see where they come out.' });
  lv({ id: '6-4', w: 6, n: 4, name: 'Wrapped Up', env: { graves: [[7, 0], [6, 2], [8, 3]], graveRise: true }, waves: 11,
    pool: { mutt: 3, mummy: 1.4, helmet: 1.5, nurse: 0.7, phantom: 0.6 }, newDog: 'mummy', base: 4.4, grow: 1.15, flags: [5, 10], reward: { duck: 'decoy' }, coins: 230,
    story: 'Mummy Mastiffs shrug off water. Bring fire, lobs or lightning!' });
  lv({ id: '6-5', w: 6, n: 5, name: 'Bonk-a-Pup', mode: 'whack', env: { graves: [[4, 0], [5, 2], [4, 4], [6, 1], [6, 3], [7, 0], [7, 4]], graveRise: 'every' }, start: 150, waves: 10,
    pool: { mutt: 3, runner: 2, helmet: 1, chihuahua: 1.5 }, base: 3.6, grow: 1.0, flags: [4, 9], tut: 'whack', reward: { coins: 260 }, coins: 230, obj: ['noGoose', 'max10'],
    story: 'A kennel carnival game! Dogs pop out of the bone piles every wave. Tap them to BONK them!',
    rules: ['Tap or click a dog to bonk it for 60 damage.', 'Dogs pop out of bone piles every wave.', 'Your ducks still help!'] });
  lv({ id: '6-6', w: 6, n: 6, name: 'Full Moon', env: { fog: [7, 8], graves: [[8, 0], [7, 3]], graveRise: true }, waves: 11,
    pool: { mutt: 3, werewoof: 1.2, helmet: 2, phantom: 1, mummy: 0.7 }, newDog: 'werewoof', base: 4.5, grow: 1.15, flags: [5, 10], reward: { coins: 260 }, coins: 235,
    story: 'It\'s a full moon. Werewoofs transform at half health — finish them fast!' });
  lv({ id: '6-7', w: 6, n: 7, name: 'Up, Up and Away', env: { portals: [[[7, 1], [4, 3]]], graves: [[8, 4], [6, 0]], graveRise: true }, waves: 12,
    pool: { mutt: 3, balloon: 1.5, helmet: 2, werewoof: 0.7, phantom: 0.8, catapult: 0.5 }, newDog: 'balloon', base: 4.6, grow: 1.2, flags: [5, 11], reward: { coins: 280 }, coins: 240,
    story: 'Balloon Beagles float over your defences. Pop those balloons!' });
  lv({ id: '6-8', w: 6, n: 8, name: 'Count Barkula\'s Castle', boss: 'barkula', env: { graves: [[8, 0], [8, 4]] }, pool: { mutt: 3, phantom: 1, balloon: 1 }, start: 1300,
    reward: { coins: 1500 }, coins: 300, obj: ['noGoose', 'keepAll'], story: 'The Count rules the Haunted Kennel. End this spooky siege once and for all!' });
  lv({ id: 'B6', w: 6, n: 'B', bonus: true, after: '6-4', name: 'Bonus: Midnight Hallway', mode: 'protect', protect: { tiles: [[1, 0], [1, 4], [2, 2]] },
    env: { portals: [[[7, 2], [5, 0]], [[7, 4], [5, 3]]] }, start: 250, waves: 10, pool: { mutt: 3, phantom: 1, runner: 2, mummy: 0.7 }, base: 4.2, grow: 1.1, flags: [4, 9],
    reward: { coins: 500 }, coins: 0, obj: ['noGoose', 'keepAll'], story: 'Guard the Count\'s prize rose beds while portals shuffle dogs around!',
    rules: ['Don\'t let any dog step on a rose bed.', 'Portals teleport dogs between tiles.'] });

  D.LEVEL = {}; L.forEach(l => { D.LEVEL[l.id] = l; });
  D.CAMPAIGN = L.filter(l => !l.bonus).map(l => l.id);

  // Boss Rumble: all six bosses back to back
  D.RUMBLE = {
    id: 'rumble', w: 5, n: '★', name: 'Boss Rumble', mode: 'rumble', boss: 'barkley', rumble: ['barkley', 'countess', 'salty', 'frostfang', 'mech', 'barkula'], bossHpK: 0.5,
    lanes: [0, 1, 2, 3, 4], env: {}, start: 1500, sky: true, obj: ['noGoose', 'keepAll'], pool: { mutt: 3, helmet: 2, runner: 1 },
    story: 'Every boss you\'ve beaten wants a rematch — one after another, at half strength. Between bouts you get +400 crumbs and a Quack Power charge.',
    rules: ['Six bosses in a row at half health.', '+400 crumbs and +1 Quack Power after each boss.', 'Your normal loadout capacity applies.'],
    reward: { coins: 1200 }
  };

  // Endless arenas
  D.ARENAS = [
    { w: 1, name: 'Sunny Park', env: {} },
    { w: 2, name: 'Moonlit Marsh', env: { fog: [6, 7, 8] } },
    { w: 3, name: 'Boardwalk Canals', env: { water: [1, 3] } },
    { w: 4, name: 'Snowy Gardens', env: { ice: [0, 4], blizzard: 40 } },
    { w: 5, name: 'Backyard Fortress', env: {} },
    { w: 6, name: 'Haunted Kennel', env: { graves: [[7, 1], [6, 3]], graveRise: true, portals: [[[7, 4], [4, 2]]] } }
  ];

  /* ------------------------------------------------------------ SHOPS */
  Object.assign(D.SHOPS, {
    snack: {
      name: 'Chef Brioche\'s Snack Bar', keeper: 'Chef Brioche', unlock: '4-2', color: '#ff7a8a',
      tag: 'One-level snacks & a sizzling chef duck',
      intro: ['Bonjour! Chef Brioche, pâtissier to the pond! Mind the flour — it gets everywhere.',
        'My snacks give your flock a little boost for ONE level. Eat them, they are gone. That is how snacks work, non?',
        'Bring one snack into a level from your Team Huddle. Buy my Lunchbox and you can bring two!'],
      greet: ['Fresh from the oven! Careful, very hot!', 'A duck cannot defend on an empty tummy.', 'My croissants have 64 layers. I counted.',
        'Sizzle Scoter? My old apprentice. Very talented. Very flammable.', 'Butter is not a food group. It is ALL the food groups.'],
      bye: 'Bon appétit!'
    },
    observatory: {
      name: 'The Starlight Observatory', keeper: 'Astro-Loon Nova', unlock: '5-2', color: '#4a5fd0', currency: 'stars',
      tag: 'Trade bonus-objective stars for rare finds',
      intro: ['Greetings, star-catcher. I am Astro-Loon Nova. I watch the sky so you don\'t have to.',
        'Every bonus objective you complete earns a ★ star. Here, stars are the only currency that matters.',
        'Rare ducks, cosmic perks, celestial hats… all for those who reach for the stars. Literally. Stars.'],
      greet: ['The constellation of the Great Duck is very bright tonight.', 'Mercury is in retrograde. So is that Mutt.',
        'Every star you earn is a tiny victory.', 'I named a star after you. It is the small wobbly one.', 'Space is big. The pond is bigger. To me.'],
      bye: 'May the stars guide your quacks.'
    }
  });
  D.SHOP_ORDER.push('snack', 'observatory');

  D.SNACKS = {
    headstart: { name: 'Head-Start Loaf', icon: '🥖', price: 60, desc: '+150 starting crumbs this level (crumb levels only).' },
    muffin: { name: 'Golden Feather Muffin', icon: '🧁', price: 80, desc: '+1 Quack Power charge at the start (up to your maximum).' },
    espresso: { name: 'Espresso Bean Bun', icon: '☕', price: 70, desc: 'Every duck card starts ready — no starting cooldowns.' },
    cookie: { name: 'Lucky Fortune Cookie', icon: '🥠', price: 50, desc: 'Coins you pick up this level are worth double.' },
    pretzel: { name: 'Sturdy Pretzel', icon: '🥨', price: 90, desc: 'All your ducks get +20% health this level.' }
  };
  D.SNACK_ORDER = ['headstart', 'muffin', 'espresso', 'cookie', 'pretzel'];
  D.SNACK_MAX = 5;

  D.ITEMS.push(
    { id: 'duck_piggy', shop: 'cart', type: 'duck', duck: 'piggy', price: 300, req: '2-2', title: 'Piggybank Pintail',
      change: 'Adds Piggybank Pintail: drops 5-coin pieces during battle (up to 6 per level).' },
    { id: 'duck_sizzle', shop: 'snack', type: 'duck', duck: 'sizzle', price: 650, req: '4-2', title: 'Sizzle Scoter',
      change: 'Adds Sizzle Scoter: short-range flames that burn dogs and burn off camouflage.' },
    { id: 'lunchbox', shop: 'snack', type: 'perk', price: 400, req: '4-2', title: 'Bigger Lunchbox',
      change: 'Snack slots: 1 → 2 per level. (Snacks never change your duck loadout capacity.)' },
    { id: 'duck_copycat', shop: 'observatory', type: 'duck', duck: 'copycat', price: 10, req: '5-2', title: 'Copycat Canvasback',
      change: 'Adds Copycat Canvasback: copies the attack and Quack Power of the duck behind it.' },
    { id: 'shootingstar', shop: 'observatory', type: 'perk', price: 8, req: '5-2', title: 'Shooting Star',
      change: 'Whenever you use Quack Power, a shooting star also hits the toughest dog for 300 damage.' },
    { id: 'compass', shop: 'observatory', type: 'perk', price: 5, req: '5-2', title: 'Star Compass',
      change: 'Team Huddle shows a full wave forecast: how many of each dog are coming.' },
    { id: 'hat_wizard', shop: 'observatory', type: 'cosmetic', price: 4, req: '5-2', hat: 'wizard', title: 'Starry Wizard Hats',
      change: 'Cosmetic: ducks can wear starry wizard hats (choose in the Emporium). No gameplay change.' },
    { id: 'twinkle', shop: 'observatory', type: 'cosmetic', price: 6, req: '5-2', title: 'Twinkle Trails',
      change: 'Cosmetic: your ducks\' shots leave little twinkling stars. No gameplay change.' }
  );
  D.SNACK_ORDER.forEach(id => {
    const s = D.SNACKS[id];
    D.ITEMS.push({ id: 'snack_' + id, shop: 'snack', type: 'snack', snack: id, price: s.price, req: '4-2', title: s.name, change: s.desc + ' One use. Hold up to ' + D.SNACK_MAX + '.' });
  });
  D.HATS.wizard = 'Wizard Hats';

  Object.assign(D.UPGRADES, {
    boomer: { price: 500, A: { name: 'Long Throw', desc: 'Range 4.5 → 6 tiles.' }, B: { name: 'Sharp Edge', desc: 'Damage 25 → 35 per hit.' } },
    sizzle: { price: 550, A: { name: 'Long Flame', desc: 'Flame reach 2.5 → 3.5 tiles.' }, B: { name: 'Hot Sauce', desc: 'Burning 8 → 16 damage per second.' } },
    syrup: { price: 400, A: { name: 'Extra Sticky', desc: 'Dogs on syrup move at 20% speed instead of 30%.' }, B: { name: 'Big Pour', desc: 'Each pour covers 2 tiles instead of 1.' } },
    twisty: { price: 450, A: { name: 'Fast Spin', desc: 'Fires every 1.2s instead of 1.5s.' }, B: { name: 'Back Splash', desc: 'Backward shots deal 30 instead of 20.' } },
    squeak: { price: 350, A: { name: 'Super Squeak', desc: 'Knockback 0.7 → 1.2 tiles.' }, B: { name: 'Thick Rubber', desc: 'Health 1800 → 2600.' } },
    piggy: { price: 400, A: { name: 'Big Savings', desc: 'Each coin piece is worth 8 instead of 5.' }, B: { name: 'Bigger Bank', desc: 'Up to 10 coin pieces per level instead of 6.' } }
  });

  /* ------------------------------------------------------------ TUTORIALS */
  Object.assign(D.TUTS, {
    graves: [{ text: 'Bone piles block your tiles, and in big waves dogs pop out of them! Your new SPADE SCAUP (after this level) can dig them up.', wait: 'time', arg: 10 }],
    portals: [{ text: 'Portals! A dog stepping into a portal pops out of the portal with the SAME COLOUR. Watch where they reappear.', wait: 'time', arg: 10 }],
    whack: [{ text: 'BONK-A-PUP! Tap or click any dog to bonk it for 60 damage. Your ducks still help — and keep collecting crumbs!', wait: 'time', arg: 10 }],
    rumble: [{ text: 'Boss Rumble! Each boss has half health, but they keep coming. After each one you get +400 crumbs and a Quack Power charge.', wait: 'time', arg: 10 }]
  });

  /* ------------------------------------------------------------ TROPHIES */
  // check(S) returns true when earned; reward is coins.
  const own = S => S.data.owned.length;
  const cleared = id => S => S.isCleared(id);
  D.TROPHIES = [
    { id: 't_first', name: 'First Paddle', desc: 'Win your first level.', coins: 50, check: S => Object.keys(S.data.cleared).length > 0 },
    { id: 't_duck10', name: 'Flock Starter', desc: 'Own 10 different ducks.', coins: 100, check: S => own(S) >= 10 },
    { id: 't_duck20', name: 'Flock Leader', desc: 'Own 20 different ducks.', coins: 200, check: S => own(S) >= 20 },
    { id: 't_duckall', name: 'Duck Collector', desc: 'Own every duck in the game.', coins: 600, check: S => own(S) >= D.DUCK_ORDER.length },
    { id: 't_w1', name: 'Park Ranger', desc: 'Beat Big Barkley (1-8).', coins: 100, check: cleared('1-8') },
    { id: 't_w2', name: 'Marsh Marshal', desc: 'Beat Countess Howlsworth (2-8).', coins: 150, check: cleared('2-8') },
    { id: 't_w3', name: 'Canal Captain', desc: 'Beat Captain Salty (3-8).', coins: 150, check: cleared('3-8') },
    { id: 't_w4', name: 'Snow Champion', desc: 'Beat Frostfang (4-8).', coins: 200, check: cleared('4-8') },
    { id: 't_w5', name: 'Fortress Breaker', desc: 'Beat the Mega-Mutt Mech (5-8).', coins: 250, check: cleared('5-8') },
    { id: 't_w6', name: 'Ghost Buster', desc: 'Beat Count Barkula (6-8).', coins: 400, check: cleared('6-8') },
    { id: 't_slot6', name: 'Bigger Bag', desc: 'Reach a loadout capacity of 6.', coins: 50, check: S => S.capacity() >= 6 },
    { id: 't_slot8', name: 'Full Trunk', desc: 'Reach the maximum loadout capacity of 8.', coins: 300, check: S => S.capacity() >= 8 },
    { id: 't_shops', name: 'Window Shopper', desc: 'Visit all five shops.', coins: 150, check: S => D.SHOP_ORDER.every(s => S.data.shopsSeen[s]) },
    { id: 't_star25', name: 'Star Gazer', desc: 'Earn 25 ★ stars from bonus objectives.', coins: 150, check: S => S.starsEarned() >= 25 },
    { id: 't_star75', name: 'Constellation', desc: 'Earn 75 ★ stars from bonus objectives.', coins: 400, check: S => S.starsEarned() >= 75 },
    { id: 't_perfect', name: 'Perfect Pond', desc: 'Complete both bonus objectives in one level.', coins: 75, check: S => Object.values(S.data.cleared).some(r => r.obj && r.obj.length >= 2 && r.obj.every(Boolean)) },
    { id: 't_qp25', name: 'Quack Attack', desc: 'Use Quack Power 25 times.', coins: 100, check: S => S.data.life.qp >= 25 },
    { id: 't_kill500', name: 'Dog Walker', desc: 'Send 500 dogs running home.', coins: 150, check: S => S.data.life.kills >= 500 },
    { id: 't_kill2500', name: 'Pack Leader', desc: 'Send 2500 dogs running home.', coins: 400, check: S => S.data.life.kills >= 2500 },
    { id: 't_end10', name: 'Endless Paddler', desc: 'Reach wave 10 in Endless Pond.', coins: 100, check: S => S.data.endless.best >= 10 },
    { id: 't_end25', name: 'Endless Legend', desc: 'Reach wave 25 in Endless Pond.', coins: 300, check: S => S.data.endless.best >= 25 },
    { id: 't_small', name: 'Small Squad', desc: 'Win a normal level with 3 or fewer duck types.', coins: 150, check: S => !!S.data.life.small },
    { id: 't_nobread', name: 'Crumb-Free Diet', desc: 'Win a normal level without any producer ducks.', coins: 150, check: S => !!S.data.life.nobread },
    { id: 't_nogooseboss', name: 'Goose on Holiday', desc: 'Beat a boss without any Goose Patrol charging.', coins: 200, check: S => !!S.data.life.nogooseboss },
    { id: 't_snack10', name: 'Snack Time', desc: 'Eat 10 snacks.', coins: 100, check: S => S.data.life.snacks >= 10 },
    { id: 't_upg6', name: 'Tinkerer', desc: 'Buy 6 duck upgrades.', coins: 200, check: S => Object.keys(S.data.upgrades).length >= 6 },
    { id: 't_bonk', name: 'Bonk Champion', desc: 'Bonk 100 dogs in Bonk-a-Pup levels.', coins: 100, check: S => S.data.life.bonks >= 100 },
    { id: 't_rumble', name: 'Rumble Royalty', desc: 'Clear the Boss Rumble.', coins: 500, check: cleared('rumble') }
  ];
})(window.DVD);
