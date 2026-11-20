/* Ducks vs. Dogs 2 — game data: ducks, dogs, bosses, worlds, levels, shops. */
window.DVD = window.DVD || {};
(function (D) {
  'use strict';

  D.VERSION = '1.0.0';
  D.SAVE_KEY = 'ducks-vs-dogs-2-save-v1'; // separate from the original "ducks-vs-dogs-save-v1"
  D.COLS = 9;
  D.LANES = 5;
  D.BASE_SLOTS = 5;
  D.MAX_SLOTS = 8; // absolute maximum, never exceeded by anything

  /* ------------------------------------------------------------------ DUCKS */
  // kind drives behaviour in battle.js. cd = card cooldown (s). startCd = initial cooldown at level start.
  D.DUCKS = {
    bread: {
      name: 'Breadwinner', role: 'Producer', kind: 'producer', cost: 50, cd: 7.5, startCd: 0, hp: 300,
      prod: 25, interval: 24, first: 7,
      body: '#ffd84a', accent: '#ffffff', look: 'chef',
      desc: 'Bakes 25 crumbs every 24 seconds. Plant a few early and you will never run short.',
      tip: 'Put Breadwinners in the back columns, behind your attackers.',
      funny: 'Wakes up at 4 a.m. to proof the sourdough. Has never once been late. Will not stop talking about crust.',
      qp: { name: 'Bake Sale', desc: 'Instantly pops out 150 crumbs.' },
      source: 'start'
    },
    puddle: {
      name: 'Puddle Shooter', role: 'Attacker', kind: 'shooter', cost: 100, cd: 7.5, startCd: 0, hp: 300,
      dmg: 20, interval: 1.45, soak: 3,
      body: '#fff3b0', accent: '#3aa0ff', look: 'tank',
      desc: 'Squirts a water blob down its lane every 1.45s for 20 damage. Water soaks dogs (great with Zappy Drake).',
      tip: 'Cheap, dependable and stackable. Two per lane handles most early packs.',
      funny: 'Has been told it is "just a water pistol with feathers." It took this personally and practices every day.',
      qp: { name: 'Hydro Barrage', desc: 'Fires 40 rapid water blobs over 2.5 seconds.' },
      source: 'start'
    },
    reed: {
      name: 'Reed Guard', role: 'Wall', kind: 'wall', cost: 50, cd: 20, startCd: 10, hp: 4000,
      body: '#7cc36a', accent: '#c58c3b', look: 'reed',
      desc: 'A sturdy blocker with 4000 health. Dogs must chew through it before going further.',
      tip: 'Place in front of your attackers. Replace it before it falls.',
      funny: 'Wears a suit of woven cattails. Itchy, but very fashionable in the marsh.',
      qp: { name: 'Reed Armor', desc: 'Gains a 4000-point armor shell for 15 seconds.' },
      source: 'level:1-1'
    },
    snap: {
      name: 'Snapshell', role: 'Trap', kind: 'mine', cost: 25, cd: 20, startCd: 15, hp: 300,
      arm: 14, dmg: 1800,
      body: '#ffe27a', accent: '#d98ad2', look: 'shell',
      desc: 'Takes 14s to arm, then snaps shut on the first dog to step on it for 1800 damage. One use.',
      tip: 'Plant ahead of a dangerous lane early. While arming it can be chewed.',
      funny: 'A duckling hiding in a clam. The clam is not consulted and has many opinions about this arrangement.',
      qp: { name: 'Leaping Snap', desc: 'Arms instantly and leaps on the nearest dog in its lane within 3 tiles.' },
      source: 'level:1-2'
    },
    frost: {
      name: 'Frostbill', role: 'Slower', kind: 'shooter', cost: 175, cd: 7.5, startCd: 0, hp: 300,
      dmg: 20, interval: 1.45, slow: 0.5, slowTime: 4,
      body: '#bfe8ff', accent: '#4fb0e8', look: 'frost',
      desc: 'Shoots ice pellets (20 damage) that slow dogs by 50% for 4s. Soaked dogs freeze solid for 1s.',
      tip: 'One Frostbill per lane doubles the time all your other ducks get to shoot.',
      funny: 'Born in a freezer aisle. Thinks "room temperature" is a horror story.',
      qp: { name: 'Deep Freeze', desc: 'Freezes every dog in its lane and both neighbour lanes for 5 seconds.' },
      source: 'level:1-3'
    },
    lob: {
      name: 'Lob Mallard', role: 'Lobber', kind: 'lobber', cost: 125, cd: 7.5, startCd: 0, hp: 300,
      dmg: 35, interval: 2.8,
      body: '#c9a26b', accent: '#2f9e5a', look: 'mallard',
      desc: 'Lobs bread-bombs (35 damage) in an arc, over Screen-Door shields and straight onto the dog.',
      tip: 'Your answer to shield carriers. Also hits dogs hiding behind walls.',
      funny: 'Played catcher in the Pond Little League. Still can\'t throw straight, so it throws up.',
      qp: { name: 'Loaf Storm', desc: 'Lobs 6 giant loaves at the 6 toughest dogs on screen (120 each).' },
      source: 'shop:cart'
    },
    double: {
      name: 'Double Quack', role: 'Attacker', kind: 'shooter', cost: 200, cd: 7.5, startCd: 0, hp: 300,
      dmg: 20, interval: 1.45, shots: 2, soak: 3,
      body: '#ffe066', accent: '#ff7a45', look: 'twin',
      desc: 'Two nozzles, two blobs per volley: 40 damage every 1.45s. Soaks dogs like Puddle Shooter.',
      tip: 'Best value once your crumbs are flowing. Pairs well with Drum Drake.',
      funny: 'Says everything twice. Says everything twice.',
      qp: { name: 'Fan Spray', desc: 'Sprays a fan of water across 3 lanes for 4 seconds.' },
      source: 'level:1-5'
    },
    gusty: {
      name: 'Gusty Goldeneye', role: 'Pusher', kind: 'pusher', cost: 125, cd: 15, startCd: 5, hp: 400,
      range: 4, interval: 6, push: 1.0, dmg: 10,
      body: '#f4f1e6', accent: '#ffc531', look: 'gust',
      desc: 'Flaps a gust every 6s that pushes all dogs within 4 tiles back by 1 tile (10 damage).',
      tip: 'Buys time against Zoomie Whippets and big pushes. Does not affect bosses.',
      funny: 'Its golden eyes are not magical. It just blinks very dramatically.',
      qp: { name: 'Tornado Flap', desc: 'Blows every dog in its lane back 4 tiles.' },
      source: 'shop:cart'
    },
    patch: {
      name: 'Patchduck', role: 'Healer', kind: 'healer', cost: 75, cd: 15, startCd: 5, hp: 400,
      heal: 40, interval: 2,
      body: '#ffb3c7', accent: '#ffffff', look: 'patch',
      desc: 'Heals ducks in the surrounding 3×3 area for 40 health every 2 seconds.',
      tip: 'Put it behind a Reed Guard and the wall lasts much longer.',
      funny: 'Made entirely of donated quilt squares. Every patch has a story. Please do not ask.',
      qp: { name: 'Big Bandage', desc: 'Fully heals ducks within 2 tiles and makes them invulnerable for 3s.' },
      source: 'level:1-7'
    },
    lantern: {
      name: 'Lantern Loon', role: 'Revealer', kind: 'revealer', cost: 50, cd: 15, startCd: 0, hp: 300,
      revealCols: 2.5, revealLanes: 1,
      body: '#2d3142', accent: '#ffd34d', look: 'loon',
      desc: 'Lights up nearby tiles (5 columns × 3 lanes): clears fog and reveals hidden dogs so ducks can hit them.',
      tip: 'Place it mid-field. Sneaky Spaniels inside the light can be targeted.',
      funny: 'Afraid of the dark. Solved the problem permanently.',
      qp: { name: 'Sky Flare', desc: 'Reveals every dog, clears all fog for 20s and stuns dogs near it.' },
      source: 'level:2-1'
    },
    zappy: {
      name: 'Zappy Drake', role: 'Chain', kind: 'chain', cost: 175, cd: 7.5, startCd: 0, hp: 300,
      dmg: 24, interval: 2.2, chains: 4, jump: 2.2,
      body: '#b48cff', accent: '#ffe94d', look: 'zap',
      desc: 'Zaps the first dog in its lane; lightning jumps to 3 more nearby dogs in any lane (24 each). Soaked dogs take double.',
      tip: 'Combo: Puddle Shooters or Storm Duck soak dogs, Zappy deals double damage.',
      funny: 'Licked a battery as a duckling. Has not stopped buzzing since.',
      qp: { name: 'Thunder Chain', desc: 'A massive chain that hits up to 12 dogs for 150 each.' },
      source: 'level:2-2'
    },
    thistle: {
      name: 'Thistle Teal', role: 'Spikes', kind: 'spikes', cost: 100, cd: 7.5, startCd: 0, hp: 300,
      dps: 20,
      body: '#4ec3b5', accent: '#a35ad6', look: 'thistle',
      desc: 'Lies flat in a thistle nest. Dogs walk over it taking 20 damage per second. Forces Digger Dachshunds to surface and wrecks sleds.',
      tip: 'Dogs don\'t stop to bite it, but Bulldozer Bulldogs will flatten it.',
      funny: 'Enjoys a firm mattress. Very firm. Extremely pointy.',
      qp: { name: 'Bramble Burst', desc: 'Spikes erupt down its whole lane for 4s (60 damage per second).' },
      source: 'level:2-3'
    },
    boom: {
      name: 'Firecracker Duckling', role: 'Bomb', kind: 'bomb', cost: 150, cd: 35, startCd: 20, hp: 300,
      dmg: 1800,
      body: '#ff5a4a', accent: '#ffd23f', look: 'boom',
      desc: 'Explodes 1 second after placement, dealing 1800 damage to all dogs in a 3×3 area. Single use.',
      tip: 'Emergency button for clumps of dogs. No Quack Power needed — it IS the power.',
      funny: 'Was told to "go out with a bang." Took it literally. Reassembles itself backstage.',
      qp: null,
      source: 'level:2-5'
    },
    storm: {
      name: 'Storm Duck', role: 'Splash', kind: 'lobber', cost: 225, cd: 7.5, startCd: 0, hp: 300,
      dmg: 40, interval: 3.2, splash: 0.95, soak: 3,
      body: '#8a97b0', accent: '#5b6a86', look: 'storm',
      desc: 'Lobs a rain cloud: 40 damage to every dog within ~1 tile (any lane) and soaks them.',
      tip: 'Brilliant against packs. Soaked dogs take double damage from Zappy Drake.',
      funny: 'Carries its own personal weather. Is always slightly damp. Prefers not to talk about it.',
      qp: { name: 'Thunderstorm', desc: '8 lightning strikes on random dogs (250 splash damage each).' },
      source: 'level:2-7'
    },
    raft: {
      name: 'Lily Raft', role: 'Platform', kind: 'platform', cost: 25, cd: 7.5, startCd: 0, hp: 300,
      body: '#9be07a', accent: '#ff9ccc', look: 'raft',
      desc: 'Floats on water tiles. Other ducks can then be placed on top of it. Can only go on water.',
      tip: 'Required to build on canals. Dogs eat the duck on top first.',
      funny: 'Professional floater. Spends weekends as a very small island.',
      qp: { name: 'Splash Wave', desc: 'A wave knocks every dog in its lane back 2 tiles and soaks them.' },
      source: 'level:2-8'
    },
    bubble: {
      name: 'Bubbler', role: 'Stunner', kind: 'stunner', cost: 125, cd: 10, startCd: 5, hp: 300,
      interval: 6, stun: 3, dmg: 10,
      body: '#ff9fd8', accent: '#8fe3ff', look: 'bubble',
      desc: 'Every 6s traps the first dog in its lane in a bubble for 3 seconds (big dogs: half).',
      tip: 'Stops Tennis Terriers and Catapult Corgis from throwing while bubbled.',
      funny: 'Has never popped a bubble on purpose. Gets visibly upset when you do.',
      qp: { name: 'Bubble Bath', desc: 'Bubbles every dog in 3 lanes for 4 seconds.' },
      source: 'challenge:B2'
    },
    drum: {
      name: 'Drum Drake', role: 'Booster', kind: 'amp', cost: 100, cd: 10, startCd: 0, hp: 300,
      amp: 0.35,
      body: '#ff8a3d', accent: '#3d5cff', look: 'drum',
      desc: 'Keeps the beat: the 8 surrounding ducks attack 35% faster. Several drums don\'t stack on one duck.',
      tip: 'Sandwich it between Double Quacks for a duck-to-duck combo.',
      funny: 'Marches to the beat of its own drum. Also marches to everyone else\'s drum. Never stops marching.',
      qp: { name: 'Drum Solo', desc: 'Every duck on the field attacks twice as fast for 6 seconds.' },
      source: 'level:3-1'
    },
    shield: {
      name: 'Shield Shoveler', role: 'Protector', kind: 'protector', cost: 125, cd: 15, startCd: 5, hp: 400,
      shield: 300, interval: 15,
      body: '#7ad3ff', accent: '#ffd85a', look: 'shield',
      desc: 'Every 15s wraps the 4 neighbouring ducks (up, down, left, right) in a 300-point bubble shield.',
      tip: 'Protects producers and shooters from Tennis balls and catapult bones too.',
      funny: 'Its wide beak was designed for scooping. It now scoops danger away from friends.',
      qp: { name: 'Mega Bubble', desc: 'Shields every duck within 2 tiles for 1500.' },
      source: 'level:3-3'
    },
    longbill: {
      name: 'Longbill', role: 'Piercer', kind: 'piercer', cost: 150, cd: 7.5, startCd: 0, hp: 300,
      dmg: 30, interval: 2.6,
      body: '#e8dcc0', accent: '#5a3d2b', look: 'long',
      desc: 'Fires a piercing beak-beam down the lane: 30 damage to EVERY dog in it, straight through shields.',
      tip: 'Great vs. long lines of dogs and Screen-Door Shepherds.',
      funny: 'Its beak is 40% of its body length. Reads the newspaper from across the room.',
      qp: { name: 'Mega Beam', desc: 'A 400-damage beam through its lane and both neighbour lanes.' },
      source: 'level:3-6'
    },
    cocoa: {
      name: 'Cocoa Coot', role: 'Warmer', kind: 'warmer', cost: 150, cd: 7.5, startCd: 0, hp: 300,
      dmg: 30, interval: 3, splash: 0.6,
      body: '#6b4a3a', accent: '#ffffff', look: 'cocoa',
      desc: 'Lobs hot cocoa (30 splash) and keeps the 3×3 area warm: those ducks can\'t be frozen and thaw instantly.',
      tip: 'Essential in the Snowy Gardens when blizzards and snowballs fly.',
      funny: 'Always has a mug. Nobody has seen it drink from the mug. The mug is always full.',
      qp: { name: 'Cocoa Geyser', desc: 'Thaws every duck and lobs 5 cocoa blasts (200 each).' },
      source: 'level:4-1'
    },
    tall: {
      name: 'Tallneck Teal', role: 'Tall Wall', kind: 'wall', cost: 125, cd: 20, startCd: 10, hp: 3500, tall: true,
      body: '#3fb8a6', accent: '#ffe08a', look: 'tall',
      desc: 'A 3500-health wall too tall to jump. Pogo Poodles and pouncing dogs bonk into it.',
      tip: 'Also catches bones and tennis balls aimed at ducks behind it.',
      funny: 'Was a regular duck until it ate a whole bag of growth-formula duck feed. Doesn\'t regret it.',
      qp: { name: 'Stretch!', desc: 'Restores full health and gains +3000 extra health.' },
      source: 'level:4-4'
    },
    magnet: {
      name: 'Magnet Mallard', role: 'De-armorer', kind: 'magnet', cost: 100, cd: 7.5, startCd: 0, hp: 300,
      interval: 12, range: 5,
      body: '#d0d4dc', accent: '#ff3b3b', look: 'magnet',
      desc: 'Every 12s yanks metal (helmets, doors, pogo sticks, knight armor) off the nearest armored dog within 5 tiles.',
      tip: 'Turns Knight Mastiffs back into ordinary dogs.',
      funny: 'Its fridge door is covered in 300 helmets. They are not souvenirs; they are trophies.',
      qp: { name: 'Super Magnet', desc: 'Pulls metal off EVERY dog on screen.' },
      source: 'shop:emporium'
    },
    sour: {
      name: 'Sourdough Starter', role: 'Grower', kind: 'grower', cost: 25, cd: 7.5, startCd: 0, hp: 300,
      prod: 15, bigProd: 40, interval: 20, grow: 60,
      body: '#fff0d6', accent: '#d8a05a', look: 'sour',
      desc: 'Bakes 15 crumbs every 20s. After 60 seconds it rises into a Loaf Duck baking 40 crumbs instead.',
      tip: 'Cheap but slow. Plant it early and protect it.',
      funny: 'Is technically a living yeast culture shaped like a duck. Is very proud of its bubbles.',
      qp: { name: 'Rise & Shine', desc: 'Instantly grows into a Loaf Duck and bakes 75 crumbs.' },
      source: 'shop:emporium'
    },
    hammer: {
      name: 'Quackhammer', role: 'Melee', kind: 'melee', cost: 125, cd: 7.5, startCd: 0, hp: 1000,
      dmg: 60, interval: 1.6, range: 1.3,
      body: '#ffcf5a', accent: '#7b7f8c', look: 'hammer',
      desc: 'Sturdy (1000 health). Bonks every dog within 1.3 tiles ahead for 60 damage each 1.6s.',
      tip: 'A front-line brawler. Pair with Patchduck to keep it swinging.',
      funny: 'Took a correspondence course in "Assertive Communication." The final exam was a mallet.',
      qp: { name: 'Ground Slam', desc: '300 damage to every dog within 2 tiles in 3 lanes, stunning them 2s.' },
      source: 'level:5-2'
    }
  };
  D.DUCK_ORDER = ['bread', 'puddle', 'reed', 'snap', 'frost', 'lob', 'double', 'gusty', 'patch', 'lantern', 'zappy', 'thistle',
    'boom', 'storm', 'raft', 'bubble', 'drum', 'shield', 'longbill', 'cocoa', 'tall', 'magnet', 'sour', 'hammer'];
  D.ATTACK_KINDS = { shooter: 1, lobber: 1, chain: 1, piercer: 1, melee: 1, warmer: 1, bomb: 1, mine: 1, spikes: 1 };

  /* ------------------------------------------------------------------- DOGS */
  D.DOGS = {
    mutt: { name: 'Mutt', hp: 200, speed: 0.22, bite: 60, pts: 1, body: '#c98d4f', look: 'mutt',
      desc: 'A regular dog with a regular appetite. Walks straight at your ducks.', counter: 'Anything that shoots.',
      funny: 'Has no special skills. Has a very special heart. Also a very special appetite for duck bread.' },
    banner: { name: 'Banner Beagle', hp: 200, speed: 0.3, bite: 60, pts: 1, body: '#e3b072', look: 'banner',
      desc: 'Waves the flag that signals a huge pack is coming.', counter: 'Same as a Mutt — but get ready for its friends.',
      funny: 'Practised flag twirling for years. Nobody watches the twirling. Everyone watches the pack behind it.' },
    helmet: { name: 'Helmet Hound', hp: 200, helmet: 360, metal: true, speed: 0.22, bite: 60, pts: 2, body: '#a0703f', look: 'helmet',
      desc: 'A bike helmet absorbs 360 damage before the dog gets hurt.', counter: 'Focus fire, or Magnet Mallard steals the helmet.',
      funny: 'Safety first. Snacks second. Ducks third.' },
    runner: { name: 'Zoomie Whippet', hp: 180, speed: 0.62, bite: 60, pts: 1.5, body: '#d9d2c6', look: 'runner',
      desc: 'Has the zoomies. Runs nearly three times as fast as a Mutt.', counter: 'Frostbill slows it, Gusty Goldeneye pushes it back.',
      funny: 'Just heard the word "walk." Will not calm down for several hours.' },
    pogo: { name: 'Pogo Poodle', hp: 260, speed: 0.32, bite: 60, pts: 2.5, body: '#f2f2f2', look: 'pogo', metal: true,
      desc: 'Bounces right over the first duck it meets, then walks.', counter: 'Tallneck Teal blocks the jump. Magnet Mallard takes the pogo stick.',
      funny: 'Groomed for the show ring. Has chosen violence (bouncing) instead.' },
    door: { name: 'Screen-Door Shepherd', hp: 200, door: 750, metal: true, speed: 0.22, bite: 60, pts: 3, body: '#5b4636', look: 'door',
      desc: 'Holds a screen door that blocks 750 damage from straight shots.', counter: 'Lob Mallard and Storm Duck lob over it, Longbill pierces it, Magnet pulls it away.',
      funny: 'Took the door off the house so nobody could close it on him again.' },
    sneaky: { name: 'Sneaky Spaniel', hp: 260, speed: 0.26, bite: 60, pts: 2, body: '#6b7d4a', look: 'sneaky', hidden: true,
      desc: 'Camouflaged: shots pass through it until it is revealed by light or starts biting.', counter: 'Lantern Loon reveals it. Snapshell and Thistle Teal still get it.',
      funny: 'Wears a bush. Thinks you can\'t see it. You can see the tail. Please don\'t tell it.' },
    digger: { name: 'Digger Dachshund', hp: 260, speed: 0.32, bite: 60, pts: 2.5, body: '#9a5b2e', look: 'digger', burrow: true,
      desc: 'Tunnels under your defences and pops up near the pond (column 2).', counter: 'Thistle Teal forces it up early. Keep some firepower in the back columns.',
      funny: 'Long body, short legs, big plans.' },
    nurse: { name: 'Nurse Newfie', hp: 420, speed: 0.2, bite: 50, pts: 3, body: '#3b3b3b', look: 'nurse', heal: 15,
      desc: 'Heals nearby dogs 15 health per second.', counter: 'Kill it first: Longbill, Lob Mallard or a Firecracker.',
      funny: 'Fully licensed. Bedside manner: drool.' },
    snorkel: { name: 'Snorkel Lab', hp: 240, speed: 0.25, bite: 60, pts: 2, body: '#e4c27a', look: 'snorkel', swims: true,
      desc: 'Swims underwater on canal tiles where only lobs, traps and lightning can reach it.', counter: 'Lob Mallard, Storm Duck, Snapshell. It surfaces on dry land.',
      funny: 'Retrieved 4,000 tennis balls from the canal. Kept them all. Has a problem.' },
    skater: { name: 'Skater Schnauzer', hp: 280, speed: 0.4, bite: 60, pts: 2.5, body: '#8d8d8d', look: 'skater', laneChange: true,
      desc: 'Kickflips into a neighbouring lane every couple of tiles. An arrow shows where it is going.', counter: 'Spread your defence; Storm Duck and Zappy catch it in any lane.',
      funny: 'Rad. Gnarly. Also a good boy. Mostly rad.' },
    tennis: { name: 'Tennis Terrier', hp: 300, speed: 0.24, bite: 60, pts: 3, body: '#f0e2b6', look: 'tennis', ranged: 'ball',
      desc: 'Stops at range and serves tennis balls (45 damage) at your nearest duck in its lane, 8 times.', counter: 'Longbill and Lob Mallard outrange it. Bubbler stops its serve. Tallneck catches balls.',
      funny: 'Undefeated at Wimbledog. Banned from Wimbledog for eating the balls.' },
    samoyed: { name: 'Snowball Samoyed', hp: 340, speed: 0.22, bite: 60, pts: 3, body: '#fbfbff', look: 'samoyed', ranged: 'snow',
      desc: 'Throws snowballs that freeze a duck solid for 4 seconds.', counter: 'Cocoa Coot keeps ducks warm and thaws them.',
      funny: 'A cloud with legs. Throws snowballs because it believes it IS winter.' },
    husky: { name: 'Sled Husky', hp: 300, speed: 0.55, bite: 60, pts: 3.5, body: '#9aa6b8', look: 'husky', sled: true,
      desc: 'Rides a sled that flattens the first duck it hits (walls take 800 damage), then walks.', counter: 'Thistle Teal or Snapshell wreck the sled. A cheap Reed Guard absorbs it.',
      funny: 'Born to pull. Chose to ride. Respect the hustle.' },
    knight: { name: 'Knight Mastiff', hp: 300, helmet: 1100, metal: true, speed: 0.18, bite: 70, pts: 4.5, body: '#7a5a3a', look: 'knight',
      desc: 'Full plate armor absorbs 1100 damage. Slow but very tough.', counter: 'Magnet Mallard strips the armor. Firecracker cracks it open.',
      funny: 'Sir Barksalot of the Kennel Round Table. Sworn to protect the sacred squeaky toy.' },
    catapult: { name: 'Catapult Corgi', hp: 420, speed: 0.2, bite: 60, pts: 4, body: '#e08a3c', look: 'catapult', ranged: 'bone',
      desc: 'Parks its cart and lobs bones (70 damage) at the duck furthest BACK in its lane, 10 times.', counter: 'Bubbler, Longbill, Lob Mallard. Tallneck catches bones.',
      funny: 'Short legs, long arm. Engineering degree from the University of Fetch.' },
    bulldozer: { name: 'Bulldozer Bulldog', hp: 2400, speed: 0.16, bite: 0, smash: 600, pts: 10, body: '#b98e6a', look: 'bulldozer', big: true,
      desc: 'Huge. Smashes ducks for 600 damage. At half health it throws a Chihuahua deep into your defence.', counter: 'Firecracker + Snapshell + lots of slowing. Bubbler only works half as long.',
      funny: 'Weighs as much as a small car. Thinks it is a lap dog. Laps have suffered.' },
    chihuahua: { name: 'Chihuahua Cannonball', hp: 100, speed: 0.5, bite: 40, pts: 0.5, body: '#e8c39a', look: 'chihuahua',
      desc: 'Tiny, fast and very loud. Often arrives by air.', counter: 'Any shooter in the back column.',
      funny: 'Four pounds of pure opinion.' }
  };
  D.DOG_ORDER = ['mutt', 'banner', 'helmet', 'runner', 'pogo', 'door', 'sneaky', 'digger', 'nurse', 'snorkel', 'skater', 'tennis',
    'samoyed', 'husky', 'knight', 'catapult', 'bulldozer', 'chihuahua'];

  /* ----------------------------------------------------------------- BOSSES */
  // Each phase: hp fraction where it starts, attack list, attack cooldown, summon pool.
  D.BOSSES = {
    barkley: {
      name: 'Big Barkley', title: 'The Picnic Bandit', hp: 4000, look: 'barkley', body: '#b36a35',
      desc: 'A giant St. Bernard with a barrel of snacks. Barks lanes into silence and rolls barrels.',
      funny: 'Rescues hikers in the Alps. On weekends, rescues picnics from the people eating them.',
      phases: [
        { at: 1.0, say: 'WOOF! Picnic time!', attacks: ['summon', 'roll'], cd: 11, pool: { mutt: 3, helmet: 1 } },
        { at: 0.6, say: 'GRRR! More barrels!', attacks: ['summon', 'roll', 'bark'], cd: 9, pool: { mutt: 2, helmet: 2, runner: 1 } },
        { at: 0.3, say: 'BARK BARK BARK!!', attacks: ['roll', 'bark', 'summon', 'roll'], cd: 7, pool: { helmet: 2, runner: 2, pogo: 1, door: 1 } }
      ]
    },
    countess: {
      name: 'Countess Howlsworth', title: 'Mistress of the Mist', hp: 5200, look: 'countess', body: '#8c8fa8',
      desc: 'An elegant wolfhound who summons fog, sneaks dogs in and howls ducks to sleep.',
      funny: 'Howls at the moon every night. The moon has filed a noise complaint.',
      phases: [
        { at: 1.0, say: 'Ahh-ROOOO! The mist rises!', attacks: ['fog', 'summon', 'bark'], cd: 11, pool: { mutt: 2, sneaky: 2, helmet: 1 } },
        { at: 0.6, say: 'My hounds, dig!', attacks: ['summon', 'strike', 'bark', 'fog'], cd: 9, pool: { digger: 2, sneaky: 2, nurse: 1 } },
        { at: 0.3, say: 'The full moon! AROOOO!', attacks: ['strike', 'bark', 'summon', 'fog'], cd: 7, pool: { sneaky: 2, digger: 2, door: 1, nurse: 1 } }
      ]
    },
    salty: {
      name: 'Captain Salty', title: 'Seadog of the Seven Canals', hp: 6000, look: 'salty', body: '#4a6fa5',
      desc: 'A pirate seadog on a tugboat. Fires cannonballs at marked tiles and rolls barrels down lanes.',
      funny: 'Has sailed the seven canals. All seven are behind the same strip mall.',
      phases: [
        { at: 1.0, say: 'Arr! Fire the cannons!', attacks: ['strike', 'summon'], cd: 10, pool: { mutt: 2, snorkel: 2, helmet: 1 } },
        { at: 0.6, say: 'All paws on deck!', attacks: ['strike', 'roll', 'summon'], cd: 8.5, pool: { snorkel: 2, skater: 2, tennis: 1 } },
        { at: 0.3, say: 'Abandon... NOTHING! FIRE!', attacks: ['strike', 'strike', 'roll', 'summon'], cd: 7, pool: { tennis: 1, skater: 2, door: 1, snorkel: 2 } }
      ]
    },
    frostfang: {
      name: 'Frostfang', title: 'The Abominable Snow Pup', hp: 7000, look: 'frostfang', body: '#e9f4ff',
      desc: 'A giant fluffy snow dog. Breathes frost over whole columns and rolls snow boulders.',
      funny: 'Has never been warm. Has never wanted to be warm. Gets "brain freeze" from thinking about cocoa.',
      phases: [
        { at: 1.0, say: 'Brrrr-ARF!', attacks: ['freeze', 'summon', 'roll'], cd: 10, pool: { mutt: 2, samoyed: 1, husky: 1 } },
        { at: 0.6, say: 'AVALANCHE!', attacks: ['roll', 'freeze', 'summon', 'roll'], cd: 8.5, pool: { husky: 2, samoyed: 1, knight: 1 } },
        { at: 0.3, say: 'ETERNAL WINTER!!', attacks: ['freeze', 'roll', 'summon', 'strike'], cd: 7, pool: { husky: 2, knight: 1, samoyed: 2, runner: 1 } }
      ]
    },
    mech: {
      name: 'Dr. Woofenstein\'s Mega-Mutt Mech', title: 'The Final Fetch', hp: 9000, look: 'mech', body: '#7d8796',
      desc: 'The dogs\' ultimate machine. Fires laser lanes, rocket strikes and drops Bulldozers.',
      funny: 'Took nine years to build. Steered by a Dachshund on a Labrador\'s shoulders on a Chihuahua\'s shoulders.',
      phases: [
        { at: 1.0, say: 'MEGA-MUTT ONLINE.', attacks: ['laser', 'strike', 'summon'], cd: 9, pool: { helmet: 2, catapult: 1, door: 1, runner: 1 } },
        { at: 0.66, say: 'DEPLOYING HEAVY UNITS.', attacks: ['summon', 'laser', 'roll', 'strike'], cd: 8, pool: { bulldozer: 1, knight: 1, skater: 2 } },
        { at: 0.33, say: 'MAXIMUM WOOF!!!', attacks: ['laser', 'strike', 'roll', 'summon', 'freeze'], cd: 6.5, pool: { bulldozer: 1, knight: 1, catapult: 1, chihuahua: 3, sneaky: 1 } }
      ]
    }
  };

  /* ----------------------------------------------------------------- WORLDS */
  D.WORLDS = [
    { id: 1, name: 'Sunny Park', sub: 'Picnic lawns, fluffy clouds', boss: 'barkley', music: 0,
      t: { grassA: '#8fd16a', grassB: '#7cc35a', ground: '#6db04e', skyTop: '#7cc8ff', skyBot: '#d9f3ff', fog: '#cfefff', sun: 1.1, amb: 0.75, dirt: '#c99a63', pond: '#4fb7e8' } },
    { id: 2, name: 'Moonlit Marsh', sub: 'Fog, fireflies, things that dig', boss: 'countess', music: 1,
      t: { grassA: '#5f8f6a', grassB: '#527f5d', ground: '#3f6650', skyTop: '#1d2550', skyBot: '#5a5f9a', fog: '#4a5080', sun: 0.6, amb: 0.75, dirt: '#5d4b3a', pond: '#3a6f8f', night: true } },
    { id: 3, name: 'Boardwalk Canals', sub: 'Planks, water and currents', boss: 'salty', music: 2,
      t: { grassA: '#d9b07a', grassB: '#c99f68', ground: '#b88f5e', skyTop: '#ffb27a', skyBot: '#ffe7c4', fog: '#ffd9b0', sun: 1.05, amb: 0.75, dirt: '#9b7448', pond: '#3fa8d8', planks: true } },
    { id: 4, name: 'Snowy Gardens', sub: 'Ice, blizzards, snowballs', boss: 'frostfang', music: 3,
      t: { grassA: '#e4eef8', grassB: '#cfdcec', ground: '#eef4fb', skyTop: '#9fc3e8', skyBot: '#eef6ff', fog: '#e4eefa', sun: 0.95, amb: 0.85, dirt: '#b9c8da', pond: '#9fd8f0', snow: true } },
    { id: 5, name: 'Backyard Fortress', sub: 'The dogs\' elaborate stronghold', boss: 'mech', music: 4,
      t: { grassA: '#a8b56a', grassB: '#98a55c', ground: '#8a7a5a', skyTop: '#ff8e6e', skyBot: '#ffd29a', fog: '#f2b48a', sun: 1.0, amb: 0.7, dirt: '#8a6a4a', pond: '#4fa0c8', fortress: true } }
  ];

  /* ----------------------------------------------------------------- LEVELS */
  // obj codes: noGoose, keepAll (lose no ducks to dogs), maxN (never more than N ducks at once), noQP, noShovel
  const ALL = [0, 1, 2, 3, 4];
  const L = [];
  function lv(o) { o.lanes = o.lanes || ALL; o.mode = o.mode || 'normal'; o.env = o.env || {}; o.start = o.start == null ? 50 : o.start;
    o.sky = o.sky !== false; o.obj = o.obj || ['noGoose', 'keepAll']; L.push(o); return o; }

  // World 1 — Sunny Park
  lv({ id: '1-1', w: 1, n: 1, name: 'First Paddle', lanes: [2], waves: 4, pool: { mutt: 1 }, base: 1, grow: 0.34, flags: [3], start: 150,
    forced: ['puddle', 'bread'], tut: 'basics', reward: { duck: 'reed' }, coins: 100, obj: ['noGoose'],
    story: 'A lone Mutt is sniffing around the duck pond. Time to learn the ropes!' });
  lv({ id: '1-2', w: 1, n: 2, name: 'Three-Lane Lunch', lanes: [1, 2, 3], waves: 6, pool: { mutt: 1 }, base: 1, grow: 0.45, flags: [5], start: 50,
    tut: 'walls', reward: { duck: 'snap' }, coins: 100, story: 'More picnic blankets, more hungry Mutts. Reed Guards will hold the line.' });
  lv({ id: '1-3', w: 1, n: 3, name: 'Hard Hats', waves: 8, pool: { mutt: 3, helmet: 1 }, newDog: 'helmet', base: 1, grow: 0.55, flags: [7],
    tut: 'shovel', reward: { duck: 'frost' }, coins: 100, story: 'Helmet Hounds wear protection. Focus your fire!' });
  lv({ id: '1-4', w: 1, n: 4, name: 'Zoomies!', waves: 9, pool: { mutt: 3, helmet: 1, runner: 1.5 }, newDog: 'runner', base: 1.5, grow: 0.6, flags: [4, 8],
    tut: 'quack', reward: { coins: 150, shop: 'cart' }, coins: 120, story: 'Something is zooming across the lawn... and it smells like Quack Power.' });
  lv({ id: '1-5', w: 1, n: 5, name: 'Bounce House', waves: 9, pool: { mutt: 3, helmet: 1.5, runner: 1, pogo: 1.2 }, newDog: 'pogo', base: 1.5, grow: 0.7, flags: [4, 8],
    reward: { duck: 'double' }, coins: 120, obj: ['noGoose', 'max14'], story: 'Pogo Poodles bounce over the first duck in their way. Keep a second line!' });
  lv({ id: '1-6', w: 1, n: 6, name: 'Picnic Budget', mode: 'budget', start: 1300, sky: false, waves: 8, pool: { mutt: 3, helmet: 1.5, runner: 1, pogo: 1 }, base: 2, grow: 0.65, flags: [7],
    reward: { coins: 200 }, coins: 120, obj: ['noGoose', 'noShovel'], story: 'The picnic basket is all you get: 1300 crumbs, no crumbs from the sky, no baking.',
    rules: ['You start with 1300 crumbs.', 'No crumbs fall from the sky.', 'Producers (Breadwinner, Sourdough) do not bake here.'] });
  lv({ id: '1-7', w: 1, n: 7, name: 'Door-to-Door', waves: 10, pool: { mutt: 3, helmet: 1.5, runner: 1, pogo: 1, door: 1.2 }, newDog: 'door', base: 2, grow: 0.75, flags: [4, 9],
    reward: { duck: 'patch' }, coins: 130, story: 'Screen-Door Shepherds block straight shots. Lob over, pierce through, or out-damage the door.' });
  lv({ id: '1-8', w: 1, n: 8, name: 'Big Barkley\'s Picnic Raid', boss: 'barkley', pool: { mutt: 3, helmet: 1, runner: 1 }, start: 600, tut: 'boss',
    reward: { coins: 300 }, coins: 150, obj: ['noGoose', 'keepAll'], story: 'The biggest dog in the park wants ALL the bread. Beat Big Barkley to finish Sunny Park!' });
  lv({ id: 'B1', w: 1, n: 'B', bonus: true, after: '1-4', name: 'Bonus: Zoomie Rush', mode: 'rush', time: 120, start: 600, sky: true, waves: 6, pool: { runner: 3, mutt: 1 }, base: 3, grow: 0.9, flags: [5],
    waveGap: 12, reward: { coins: 300 }, coins: 0, obj: ['noGoose', 'max12'], story: 'A timed rush! Defeat every Zoomie before the 120-second timer runs out.',
    rules: ['Defeat every dog within 120 seconds.', 'You start with 600 crumbs.', 'Dogs arrive quickly.'] });

  // World 2 — Moonlit Marsh
  lv({ id: '2-1', w: 2, n: 1, name: 'Fog on the Bog', env: { fog: [6, 7, 8] }, waves: 9, pool: { mutt: 3, helmet: 1.5, runner: 1, pogo: 0.8 }, base: 2, grow: 0.7, flags: [4, 8],
    tut: 'fog', reward: { duck: 'lantern' }, coins: 125, story: 'A thick fog rolls over the marsh. You can\'t see what\'s coming — but your ducks still shoot.' });
  lv({ id: '2-2', w: 2, n: 2, name: 'Now You See Me', env: { fog: [6, 7, 8] }, waves: 9, pool: { mutt: 3, helmet: 1, sneaky: 1.5, door: 0.6 }, newDog: 'sneaky', base: 2, grow: 0.75, flags: [4, 8],
    tut: 'sneaky', reward: { duck: 'zappy' }, coins: 125, story: 'Sneaky Spaniels are camouflaged. Bring your new Lantern Loon to reveal them!' });
  lv({ id: '2-3', w: 2, n: 3, name: 'Tunnel Trouble', waves: 10, pool: { mutt: 3, helmet: 1.5, digger: 1.3, runner: 1 }, newDog: 'digger', base: 2.2, grow: 0.8, flags: [4, 9],
    reward: { duck: 'thistle' }, coins: 125, story: 'Digger Dachshunds tunnel under your ducks and pop up near the pond.' });
  lv({ id: '2-4', w: 2, n: 4, name: 'Duckling Daycare', mode: 'protect', protect: { ducklings: [[1, 0], [1, 2], [1, 4]] }, start: 200, waves: 9, pool: { mutt: 3, helmet: 1.5, sneaky: 1, digger: 1, pogo: 1 },
    base: 2.2, grow: 0.8, flags: [4, 8], reward: { coins: 150, shop: 'workshop' }, coins: 140, story: 'Three ducklings are napping by the reeds. If a single one is eaten, the level is lost!',
    rules: ['Protect the 3 sleeping ducklings in column 2.', 'If any duckling is eaten, you lose.', 'Ducklings cannot be removed.'] });
  lv({ id: '2-5', w: 2, n: 5, name: 'Night Shift', env: { fog: [5, 6, 7, 8] }, waves: 10, pool: { mutt: 3, helmet: 1.5, nurse: 1, sneaky: 1, door: 1 }, newDog: 'nurse', base: 2.4, grow: 0.85, flags: [4, 9],
    reward: { duck: 'boom' }, coins: 130, story: 'Nurse Newfies patch up the pack. Take them out first!' });
  lv({ id: '2-6', w: 2, n: 6, name: 'Borrowed Flock', mode: 'offered', offered: ['bread', 'puddle', 'frost', 'snap', 'lantern'], waves: 9,
    pool: { mutt: 3, helmet: 2, sneaky: 1, runner: 1 }, base: 2.4, grow: 0.8, flags: [4, 8], reward: { coins: 175 }, coins: 130,
    story: 'The marsh elders lend you a classic flock. Win with exactly these five ducks.',
    rules: ['Your team is fixed to the 5 offered ducks.', 'Uses 5 of your loadout slots.'] });
  lv({ id: '2-7', w: 2, n: 7, name: 'Marsh Madness', env: { fog: [5, 6, 7, 8] }, waves: 12, pool: { mutt: 3, helmet: 2, sneaky: 1, digger: 1, nurse: 0.8, door: 1, pogo: 1 },
    base: 2.6, grow: 0.9, flags: [5, 11], reward: { duck: 'storm' }, coins: 140, story: 'Everything the marsh can throw at you. Fog, sneaks, diggers and nurses.' });
  lv({ id: '2-8', w: 2, n: 8, name: 'Howl at the Moon', boss: 'countess', env: { fog: [7, 8] }, pool: { mutt: 3, helmet: 1, sneaky: 1 }, start: 800,
    reward: { duck: 'raft', coins: 400 }, coins: 150, obj: ['noGoose', 'keepAll'], story: 'Countess Howlsworth rules the marsh. Defeat her to reach the Boardwalk!' });
  lv({ id: 'B2', w: 2, n: 'B', bonus: true, after: '2-4', name: 'Bonus: Bubble Trouble', mode: 'offered', offered: ['bread', 'double', 'reed', 'bubble'], waves: 9,
    pool: { runner: 2, pogo: 2, mutt: 2, helmet: 1 }, base: 2.5, grow: 0.85, flags: [4, 8], reward: { duck: 'bubble', coins: 150 }, coins: 0, obj: ['noGoose', 'keepAll'],
    story: 'A mysterious pink duck offers to help. Win with its bubbles and it will join you!', rules: ['Your team is fixed to the 4 offered ducks.', 'Bubbler is on loan for this level.'] });

  // World 3 — Boardwalk Canals
  lv({ id: '3-1', w: 3, n: 1, name: 'Splash Zone', env: { water: [1, 3] }, waves: 9, pool: { mutt: 3, helmet: 2, runner: 1, pogo: 1 }, base: 2.4, grow: 0.8, flags: [4, 8],
    tut: 'water', reward: { duck: 'drum' }, coins: 150, story: 'Canals cut across the boardwalk. Ducks need a Lily Raft to build on water.' });
  lv({ id: '3-2', w: 3, n: 2, name: 'Current Events', env: { water: [1, 3], current: [1, 3] }, waves: 10, pool: { mutt: 3, helmet: 2, runner: 1, door: 1, sneaky: 0.5 }, base: 2.6, grow: 0.85, flags: [4, 9],
    tut: 'current', reward: { coins: 150 }, coins: 150, story: 'Strong currents carry dogs along the canals 60% faster. Hit them early!' });
  lv({ id: '3-3', w: 3, n: 3, name: 'Snorkel Season', env: { water: [1, 3] }, waves: 10, pool: { mutt: 3, helmet: 1.5, snorkel: 1.6, door: 1 }, newDog: 'snorkel', base: 2.6, grow: 0.9, flags: [4, 9],
    reward: { duck: 'shield' }, coins: 150, story: 'Snorkel Labs swim under the surface. Lobs and traps will get them.' });
  lv({ id: '3-4', w: 3, n: 4, name: 'Conveyor Boardwalk', mode: 'belt', belt: ['puddle', 'reed', 'lob', 'raft', 'boom'], env: { water: [2] }, sky: false, start: 0, waves: 9,
    pool: { mutt: 3, helmet: 2, snorkel: 1, runner: 1, door: 1 }, base: 2.6, grow: 0.85, flags: [4, 8], tut: 'belt', reward: { coins: 200, shop: 'emporium' }, coins: 150,
    obj: ['noGoose', 'keepAll'], story: 'The boardwalk fish-market belt delivers free duck cards. No crumbs needed!',
    rules: ['A supply belt delivers free duck cards.', 'No crumbs: ducks from the belt cost nothing.', 'Belt card types are limited by your loadout capacity.'] });
  lv({ id: '3-5', w: 3, n: 5, name: 'Skate Park', env: { water: [1, 3] }, waves: 10, pool: { mutt: 3, helmet: 1.5, skater: 1.5, snorkel: 1, pogo: 1 }, newDog: 'skater', base: 2.8, grow: 0.9, flags: [4, 9],
    reward: { coins: 175 }, coins: 150, story: 'Skater Schnauzers hop between lanes. Watch for the arrows!' });
  lv({ id: '3-6', w: 3, n: 6, name: 'Tennis Match', env: { water: [2], current: [2] }, waves: 10, pool: { mutt: 3, helmet: 2, tennis: 1.2, skater: 1, door: 1 }, newDog: 'tennis', base: 3, grow: 0.9, flags: [4, 9],
    reward: { duck: 'longbill' }, coins: 155, story: 'Tennis Terriers serve from long range. Protect your ducks or out-range them.' });
  lv({ id: '3-7', w: 3, n: 7, name: 'Rush Hour Ferry', mode: 'rush', time: 180, start: 900, env: { water: [1, 3] }, waves: 8, pool: { runner: 2, mutt: 2, snorkel: 1, skater: 1, helmet: 1 },
    base: 3.6, grow: 1, flags: [7], waveGap: 14, reward: { coins: 220 }, coins: 155, obj: ['noGoose', 'noQP'], story: 'The ferry unloads a rush of dogs. Clear them all before 180 seconds!',
    rules: ['Defeat every dog within 180 seconds.', 'You start with 900 crumbs.'] });
  lv({ id: '3-8', w: 3, n: 8, name: 'Captain Salty\'s Tugboat', boss: 'salty', env: { water: [1, 3] }, pool: { mutt: 3, snorkel: 1, helmet: 1 }, start: 900,
    reward: { coins: 500 }, coins: 160, obj: ['noGoose', 'keepAll'], story: 'A pirate seadog blocks the canal. Sink his schemes!' });
  lv({ id: 'B3', w: 3, n: 'B', bonus: true, after: '3-4', name: 'Bonus: Sandcastle Guard', mode: 'protect', protect: { tiles: [[1, 1], [1, 3], [2, 2]] }, env: { water: [0, 4] }, start: 200, waves: 9,
    pool: { mutt: 3, runner: 2, skater: 1, helmet: 1 }, base: 3, grow: 0.9, flags: [4, 8], reward: { coins: 350, unlock: 'goldgoose' }, coins: 0, obj: ['noGoose', 'max14'],
    story: 'Little sandcastles sit on the boardwalk. Don\'t let a single dog step on one!', rules: ['Don\'t let any dog step on a sandcastle tile.', 'Ducks can\'t be placed on sandcastles.'] });

  // World 4 — Snowy Gardens
  lv({ id: '4-1', w: 4, n: 1, name: 'Slippery Slope', env: { ice: [0, 2, 4] }, waves: 10, pool: { mutt: 3, helmet: 2, runner: 1, pogo: 1, door: 1 }, base: 3, grow: 0.9, flags: [4, 9],
    tut: 'ice', reward: { duck: 'cocoa' }, coins: 175, story: 'Icy lanes make dogs slide 40% faster. Freeze them back!' });
  lv({ id: '4-2', w: 4, n: 2, name: 'Brrrlizzard', env: { ice: [1, 3], blizzard: 32 }, waves: 10, pool: { mutt: 3, helmet: 2, runner: 1, door: 1, nurse: 0.5 }, base: 3, grow: 0.95, flags: [4, 9],
    tut: 'blizzard', reward: { coins: 175 }, coins: 175, story: 'Blizzards freeze ducks in the front columns. Cocoa Coots keep friends toasty.' });
  lv({ id: '4-3', w: 4, n: 3, name: 'Snowball Fight', env: { ice: [0, 4], blizzard: 40 }, waves: 10, pool: { mutt: 3, helmet: 2, samoyed: 1.3, runner: 1 }, newDog: 'samoyed', base: 3.1, grow: 0.95, flags: [4, 9],
    reward: { coins: 175 }, coins: 175, story: 'Snowball Samoyeds freeze ducks from range.' });
  lv({ id: '4-4', w: 4, n: 4, name: 'Mush!', env: { ice: [0, 1, 2, 3, 4] }, waves: 10, pool: { mutt: 3, helmet: 2, husky: 1.4, samoyed: 0.8 }, newDog: 'husky', base: 3.2, grow: 1, flags: [4, 9],
    reward: { duck: 'tall' }, coins: 180, story: 'Sled Huskies flatten the first duck they hit. Trap the sled!' });
  lv({ id: '4-5', w: 4, n: 5, name: 'Frozen Pantry', mode: 'budget', start: 1600, sky: false, env: { ice: [2], blizzard: 38 }, waves: 9, pool: { mutt: 3, helmet: 2, husky: 1, samoyed: 1, door: 1 },
    base: 3.2, grow: 0.95, flags: [4, 8], reward: { coins: 220 }, coins: 180, obj: ['noGoose', 'noShovel'], story: 'The pantry is frozen shut. 1600 crumbs is all you get.',
    rules: ['You start with 1600 crumbs.', 'No crumbs fall from the sky.', 'Producers do not bake here.'] });
  lv({ id: '4-6', w: 4, n: 6, name: 'Knight Shift', env: { ice: [0, 4], blizzard: 36 }, waves: 11, pool: { mutt: 3, helmet: 2, knight: 1, husky: 1, samoyed: 1, pogo: 1 }, newDog: 'knight', base: 3.4, grow: 1, flags: [5, 10],
    reward: { coins: 200 }, coins: 180, story: 'Knight Mastiffs are armored head to tail. Magnets and Firecrackers help!' });
  lv({ id: '4-7', w: 4, n: 7, name: 'Flowerbed Frost', mode: 'protect', protect: { tiles: [[1, 0], [1, 4], [2, 2]] }, env: { ice: [1, 3], blizzard: 40 }, start: 200, waves: 10,
    pool: { mutt: 3, helmet: 2, knight: 0.7, husky: 1, samoyed: 1, runner: 1 }, base: 3.4, grow: 1, flags: [4, 9], reward: { coins: 220 }, coins: 185,
    story: 'Prize winter roses grow in the garden. Not one paw may touch them!', rules: ['Don\'t let any dog step on a flowerbed tile.', 'Ducks can\'t be placed on flowerbeds.'] });
  lv({ id: '4-8', w: 4, n: 8, name: 'Frostfang\'s Lair', boss: 'frostfang', env: { ice: [0, 4] }, pool: { mutt: 3, husky: 1, helmet: 1 }, start: 1000,
    reward: { coins: 600 }, coins: 180, obj: ['noGoose', 'keepAll'], story: 'A giant snow pup guards the path to the dogs\' fortress.' });
  lv({ id: 'B4', w: 4, n: 'B', bonus: true, after: '4-4', name: 'Bonus: Duckling Ice Rink', mode: 'protect', protect: { ducklings: [[2, 1], [2, 3]] }, env: { ice: [0, 1, 2, 3, 4] }, start: 200, waves: 10,
    pool: { runner: 2, husky: 1.5, mutt: 2, samoyed: 1 }, base: 3.4, grow: 1, flags: [4, 9], reward: { coins: 400, unlock: 'crown' }, coins: 0, obj: ['noGoose', 'keepAll'],
    story: 'Two ducklings are learning to skate. Keep the huskies away from them!', rules: ['Protect the 2 skating ducklings.', 'If any duckling is eaten, you lose.'] });

  // World 5 — Backyard Fortress
  lv({ id: '5-1', w: 5, n: 1, name: 'Siege Begins', waves: 11, pool: { mutt: 3, helmet: 2, catapult: 1, door: 1, runner: 1, knight: 0.5 }, newDog: 'catapult', base: 3.6, grow: 1.05, flags: [5, 10],
    reward: { coins: 200 }, coins: 200, story: 'The fortress gate opens. Catapult Corgis lob bones at your back line.' });
  lv({ id: '5-2', w: 5, n: 2, name: 'Big Dog Energy', waves: 11, pool: { mutt: 3, helmet: 2, bulldozer: 0.5, chihuahua: 1, door: 1, pogo: 1 }, newDog: 'bulldozer', base: 3.8, grow: 1.1, flags: [5, 10],
    reward: { duck: 'hammer' }, coins: 200, story: 'The Bulldozer Bulldog is coming. Save your Firecrackers!' });
  lv({ id: '5-3', w: 5, n: 3, name: 'Moat & Mist', env: { water: [1, 3], fog: [5, 6, 7, 8] }, waves: 11, pool: { mutt: 3, helmet: 2, sneaky: 1, snorkel: 1, digger: 1, nurse: 1, catapult: 0.5 },
    base: 3.8, grow: 1.1, flags: [5, 10], reward: { coins: 220 }, coins: 200, story: 'The fortress moat is shrouded in mist.' });
  lv({ id: '5-4', w: 5, n: 4, name: 'Assembly Line', mode: 'belt', belt: ['double', 'tall', 'zappy', 'boom', 'frost', 'magnet', 'storm', 'hammer'], sky: false, start: 0, waves: 10,
    pool: { mutt: 3, helmet: 2, knight: 1, catapult: 1, pogo: 1, bulldozer: 0.3 }, base: 4, grow: 1.1, flags: [4, 9], reward: { coins: 240 }, coins: 200, obj: ['noGoose', 'keepAll'],
    story: 'A dog-factory conveyor belt — now delivering YOUR ducks. Up to your loadout capacity in types.',
    rules: ['A supply belt delivers free duck cards.', 'No crumbs: belt ducks cost nothing.', 'Belt card types are limited by your loadout capacity.'] });
  lv({ id: '5-5', w: 5, n: 5, name: 'Ice Bastion', env: { ice: [0, 2, 4], blizzard: 34 }, waves: 11, pool: { mutt: 3, helmet: 2, husky: 1, samoyed: 1, knight: 1, catapult: 0.7, skater: 1 },
    base: 4, grow: 1.15, flags: [5, 10], reward: { coins: 240 }, coins: 210, story: 'A frozen bastion with blizzard cannons.' });
  lv({ id: '5-6', w: 5, n: 6, name: 'Fortress Dash', mode: 'rush', time: 190, start: 1100, waves: 9, pool: { runner: 2, chihuahua: 2, skater: 1, helmet: 1, husky: 1 },
    base: 4.5, grow: 1.1, flags: [8], waveGap: 14, reward: { coins: 260 }, coins: 210, obj: ['noGoose', 'noQP'], story: 'A dash through the courtyard: clear the pack within 190 seconds.',
    rules: ['Defeat every dog within 190 seconds.', 'You start with 1100 crumbs.'] });
  lv({ id: '5-7', w: 5, n: 7, name: 'The Last Gate', env: { water: [2], fog: [6, 7, 8], ice: [0, 4] }, waves: 13, pool: { mutt: 3, helmet: 2, knight: 1, door: 1, catapult: 1, bulldozer: 0.4, sneaky: 1, tennis: 1, nurse: 1 },
    base: 4.2, grow: 1.15, flags: [6, 12], reward: { coins: 280 }, coins: 220, story: 'Every trick in the dog book, at once. One gate left!' });
  lv({ id: '5-8', w: 5, n: 8, name: 'The Final Fetch', boss: 'mech', pool: { mutt: 3, helmet: 2, runner: 1 }, start: 1200,
    reward: { coins: 1000 }, coins: 250, obj: ['noGoose', 'keepAll'], story: 'Dr. Woofenstein\'s Mega-Mutt Mech is the dogs\' last stand. Save the pond for good!' });
  lv({ id: 'B5', w: 5, n: 'B', bonus: true, after: '5-4', name: 'Bonus: Dogpile', mode: 'offered', offered: ['sour', 'longbill', 'tall', 'zappy', 'storm'], waves: 12,
    pool: { mutt: 3, knight: 1, door: 1, nurse: 1, catapult: 1, bulldozer: 0.4, chihuahua: 1 }, base: 4.5, grow: 1.15, flags: [5, 11], reward: { coins: 500, unlock: 'confetti' }, coins: 0, obj: ['noGoose', 'noQP'],
    story: 'The ultimate challenge with a strange borrowed squad.', rules: ['Your team is fixed to the 5 offered ducks.'] });

  D.LEVELS = L;
  D.LEVEL = {}; L.forEach(l => { D.LEVEL[l.id] = l; });
  D.CAMPAIGN = L.filter(l => !l.bonus).map(l => l.id);

  D.OBJ_TEXT = {
    noGoose: 'Don\'t let any Goose Patrol charge',
    keepAll: 'Don\'t let dogs defeat any duck',
    noQP: 'Win without Quack Power',
    noShovel: 'Never use the remove tool'
  };
  D.objText = function (o) { if (o.startsWith('max')) return 'Never have more than ' + o.slice(3) + ' ducks at once'; return D.OBJ_TEXT[o] || o; };
  D.OBJ_COINS = 40;

  /* ------------------------------------------------------------------ SHOPS */
  D.SHOPS = {
    cart: {
      name: 'The Traveling Duck Cart', keeper: 'Marigold Muscovy', unlock: '1-4', color: '#ff9f43',
      tag: 'New ducks & the first loadout expansion',
      intro: ['Yoo-hoo! Marigold Muscovy, traveling merchant, at your service!',
        'My cart has rolled across nine ponds and three parking lots. I\'ve got ducks you\'ve never met and a bigger team bag!',
        'Coins only, darling — no IOUs, no breadcrumbs, no buttons.'],
      greet: ['Fresh ducks! Hardly used!', 'Every duck comes with a 100% quack guarantee!', 'Don\'t mind the wheel, it squeaks for luck.',
        'Bigger team bag? You know you want it.', 'I once sold a duck to a duck. Long story.'],
      bye: 'Safe travels! Mind the puddles!'
    },
    workshop: {
      name: 'The Tinkerer\'s Workshop', keeper: 'Professor Gearbill', unlock: '2-4', color: '#4fa3ff',
      tag: 'Duck upgrades, defences & more loadout slots',
      intro: ['Ah! A visitor! Mind the springs — they bite. Professor Gearbill, inventor extraordinaire.',
        'I make ducks a little better. Not ridiculously better. Ethically better!',
        'Upgrades, pond defences, and — once you\'ve proven yourself — more loadout slots.'],
      greet: ['Have you tried turning the duck off and on again?', 'Careful, that wrench is load-bearing.',
        'Science! Feathers! Mild explosions!', 'Every upgrade is tested on at least one very brave duck.', 'Eureka! Oh wait, that\'s a sneeze.'],
      bye: 'Go forth and tinker!'
    },
    emporium: {
      name: 'The Curious Egg Emporium', keeper: 'Madame Ovella', unlock: '3-4', color: '#c86bff',
      tag: 'Specialist ducks, challenge rewards & cosmetics',
      intro: ['Welcome, little pondkeeper... Madame Ovella has been expecting you. The egg told me.',
        'In my Emporium you will find the unusual: specialist ducks, rewards for brave challengers, and finery for your flock.',
        'Choose wisely... or don\'t. The egg is not your mother.'],
      greet: ['The egg sees a great victory... and a small snack.', 'Ooooh, curious, curious.',
        'Every egg holds a secret. Most hold a duck.', 'I sense... coins in your pocket.', 'Do not tap the glass. The eggs are sleeping.'],
      bye: 'The egg will remember you.'
    }
  };
  D.SHOP_ORDER = ['cart', 'workshop', 'emporium'];

  // req: level id that must be cleared. needs: item id that must be owned first.
  D.ITEMS = [
    // Traveling Duck Cart
    { id: 'duck_lob', shop: 'cart', type: 'duck', duck: 'lob', price: 250, req: '1-4', title: 'Lob Mallard',
      change: 'Adds Lob Mallard to your collection: lobs 35-damage bread-bombs over shields.' },
    { id: 'duck_gusty', shop: 'cart', type: 'duck', duck: 'gusty', price: 400, req: '1-6', title: 'Gusty Goldeneye',
      change: 'Adds Gusty Goldeneye: pushes dogs within 4 tiles back 1 tile every 6s.' },
    { id: 'slot6', shop: 'cart', type: 'slot', slot: 6, price: 600, req: '1-8', title: 'Bigger Team Bag',
      change: 'Loadout capacity: 5 → 6 duck types per level.' },
    { id: 'crumbjar', shop: 'cart', type: 'perk', price: 300, req: '1-4', title: 'Crumb Jar',
      change: 'Start every crumb-based level with +50 crumbs (e.g. 50 → 100).' },
    // Tinkerer's Workshop
    { id: 'slot7', shop: 'workshop', type: 'slot', slot: 7, price: 1200, req: '2-8', needs: 'slot6', title: 'Expanded Team Satchel',
      change: 'Loadout capacity: 6 → 7 duck types per level.' },
    { id: 'slot8', shop: 'workshop', type: 'slot', slot: 8, price: 2000, req: '4-4', needs: 'slot7', title: 'Grand Team Trunk',
      change: 'Loadout capacity: 7 → 8 duck types per level (the maximum).' },
    { id: 'quickhands', shop: 'workshop', type: 'perk', price: 300, req: '2-4', title: 'Crumb Vacuum',
      change: 'Crumbs and coins on the field are collected automatically after 1.5 seconds.' },
    { id: 'extraqp', shop: 'workshop', type: 'perk', price: 600, req: '2-4', title: 'Quack Power Battery',
      change: 'Start each level with 2 Quack Power charges instead of 1. Max charges 3 → 4.' },
    { id: 'honk', shop: 'workshop', type: 'perk', price: 500, req: '2-6', title: 'Goose Honk Horns',
      change: 'When a Goose Patrol charges, dogs in the two neighbouring lanes within 3 tiles of the pond are knocked back 2 tiles.' },
    { id: 'sturdy', shop: 'workshop', type: 'perk', price: 400, req: '2-8', title: 'Reinforced Reeds',
      change: 'Reed Guard and Tallneck Teal get +25% health (Reed Guard 4000 → 5000).' },
    // Curious Egg Emporium
    { id: 'duck_magnet', shop: 'emporium', type: 'duck', duck: 'magnet', price: 700, req: '3-4', title: 'Magnet Mallard',
      change: 'Adds Magnet Mallard: rips helmets, doors and armor off dogs every 12s.' },
    { id: 'duck_sour', shop: 'emporium', type: 'duck', duck: 'sour', price: 600, req: '3-6', title: 'Sourdough Starter',
      change: 'Adds Sourdough Starter: a 25-crumb producer that grows into a 40-crumb Loaf Duck.' },
    { id: 'luckyegg', shop: 'emporium', type: 'perk', price: 500, req: 'B2', title: 'Lucky Egg (challenge reward)',
      change: 'Quack Power feathers drop from defeated dogs 4% → 7% of the time.' },
    { id: 'goldgoose', shop: 'emporium', type: 'cosmetic', price: 300, req: 'B3', title: 'Golden Goose Patrol (challenge reward)',
      change: 'Cosmetic: your Goose Patrol geese become shiny gold. No gameplay change.' },
    { id: 'hat_party', shop: 'emporium', type: 'cosmetic', price: 150, req: '3-4', hat: 'party', title: 'Party Hats',
      change: 'Cosmetic: ducks can wear party hats (choose in the Emporium). No gameplay change.' },
    { id: 'hat_top', shop: 'emporium', type: 'cosmetic', price: 250, req: '3-6', hat: 'top', title: 'Fancy Top Hats',
      change: 'Cosmetic: ducks can wear top hats. No gameplay change.' },
    { id: 'crown', shop: 'emporium', type: 'cosmetic', price: 400, req: 'B4', hat: 'crown', title: 'Royal Crowns (challenge reward)',
      change: 'Cosmetic: ducks can wear little gold crowns. No gameplay change.' },
    { id: 'confetti', shop: 'emporium', type: 'cosmetic', price: 300, req: 'B5', title: 'Champion Confetti (challenge reward)',
      change: 'Cosmetic: victories burst with extra rainbow confetti. No gameplay change.' }
  ];

  // Duck upgrades (Workshop): buy once, then choose option A or B any time (free to switch).
  D.UPGRADES = {
    bread: { price: 350, A: { name: 'Golden Crust', desc: 'Bakes 30 crumbs instead of 25.' }, B: { name: 'Early Riser', desc: 'First batch after 3s instead of 7s.' } },
    puddle: { price: 350, A: { name: 'Super Soaker', desc: 'Soak lasts 6s instead of 3s.' }, B: { name: 'Pressure Nozzle', desc: 'Fires every 1.25s instead of 1.45s.' } },
    reed: { price: 300, A: { name: 'Thorny Reeds', desc: 'Dogs biting it take 15 damage per second.' }, B: { name: 'Quick Weave', desc: 'Card cooldown 20s → 14s.' } },
    snap: { price: 300, A: { name: 'Quick Arm', desc: 'Arms in 8s instead of 14s.' }, B: { name: 'Big Snap', desc: 'Also hits dogs one tile ahead and behind.' } },
    frost: { price: 450, A: { name: 'Deep Chill', desc: 'Slow 50% → 65%.' }, B: { name: 'Ice Shards', desc: 'Damage 20 → 30.' } },
    lob: { price: 400, A: { name: 'Butter Bombs', desc: 'Every 3rd lob stuns the dog for 1s.' }, B: { name: 'Heavy Loaf', desc: 'Damage 35 → 50.' } },
    double: { price: 500, A: { name: 'Triple Threat', desc: 'Every 4th volley fires 3 blobs.' }, B: { name: 'Bargain Bill', desc: 'Cost 200 → 175 crumbs.' } },
    gusty: { price: 400, A: { name: 'Gale Force', desc: 'Push 1 → 1.5 tiles.' }, B: { name: 'Chill Wind', desc: 'Pushed dogs are slowed 30% for 3s.' } },
    patch: { price: 350, A: { name: 'Bandage Burst', desc: 'Heal 40 → 60 per pulse.' }, B: { name: 'Wide Wings', desc: 'Heals a 5×3 area (2 columns each side).' } },
    zappy: { price: 500, A: { name: 'Long Arc', desc: 'Chains 4 → 6 targets.' }, B: { name: 'Overcharge', desc: 'Damage 24 → 32.' } },
    storm: { price: 550, A: { name: 'Thunderhead', desc: 'Splash radius ~1 → ~1.4 tiles.' }, B: { name: 'Hailstones', desc: 'Hit dogs are also slowed 30% for 2s.' } },
    lantern: { price: 300, A: { name: 'Bright Beam', desc: 'Light reaches 1 more column each side.' }, B: { name: 'Dazzle', desc: 'Dogs in its light take +15% damage.' } }
  };
  D.UPGRADE_REQ = '2-4'; // workshop opening

  D.HATS = { none: 'No hats', party: 'Party Hats', top: 'Top Hats', crown: 'Royal Crowns' };

  /* -------------------------------------------------------------- TUTORIALS */
  D.COACH = 'Coach Quackers';
  D.TUTS = {
    basics: [
      { text: 'Welcome to the pond! I\'m Coach Quackers. Dogs want our bread. Let\'s defend it! Click the PUDDLE SHOOTER card up top.', wait: 'selectCard', arg: 'puddle', hl: 'card:puddle' },
      { text: 'Now click a grass tile in the glowing lane. Put it near the left, close to our pond.', wait: 'place', arg: 'puddle', hl: 'lane' },
      { text: 'Great! Ducks cost CRUMBS. Click the falling bread crumbs to collect them!', wait: 'collect' },
      { text: 'Breadwinners bake extra crumbs. Plant one now — more crumbs means more ducks!', wait: 'place', arg: 'bread', hl: 'card:bread' },
      { text: 'Each card has a cooldown after placing. Keep collecting and add more Puddle Shooters. Here come the Mutts!', wait: 'time', arg: 7 },
      { text: 'If a dog reaches the pond, that lane\'s GOOSE PATROL charges and clears the lane — but only once! Good luck!', wait: 'time', arg: 8 }
    ],
    walls: [{ text: 'New: REED GUARD! It\'s a sturdy wall. Put it in front of your shooters so dogs chew on it instead.', wait: 'time', arg: 9 }],
    shovel: [{ text: 'Placed a duck in the wrong spot? Use the REMOVE tool (shovel button, or press R) to clear a tile.', wait: 'time', arg: 9, hl: 'shovel' },
      { text: 'Helmet Hounds have a helmet that soaks up damage. Double up your shooters!', wait: 'time', arg: 7 }],
    quack: [{ text: 'QUACK POWER! You have charges (golden feathers). Click the Quack Power button, then click one of your ducks to trigger its special move!', wait: 'useQP', hl: 'qp' },
      { text: 'Every duck has its own special. Timing matters! Defeated dogs sometimes drop more feathers.', wait: 'time', arg: 7 }],
    boss: [{ text: 'BOSS FIGHT! Watch for red warnings — they show exactly where the next attack will land. Ducks in every lane can hit the boss.', wait: 'time', arg: 10 }],
    fog: [{ text: 'Fog hides the right side of the marsh. Dogs inside are hard to see, but your ducks can still hit them.', wait: 'time', arg: 9 }],
    sneaky: [{ text: 'Sneaky Spaniels are camouflaged — shots pass right through them! Place a LANTERN LOON so its light reveals them.', wait: 'time', arg: 10 }],
    water: [{ text: 'Canals! Ducks can\'t stand on water... unless you place a LILY RAFT first. Then put any duck on top of the raft.', wait: 'time', arg: 10 }],
    current: [{ text: 'See the arrows? Currents carry dogs along the canal 60% faster. Hit them before they reach your pond.', wait: 'time', arg: 9 }],
    belt: [{ text: 'A SUPPLY BELT! Cards slide in from the right. Click a card, then a tile. They\'re free — but you can\'t choose what comes next.', wait: 'time', arg: 10 }],
    ice: [{ text: 'Ice lanes! Dogs slide 40% faster on the shiny tiles. Slow them down or hit harder.', wait: 'time', arg: 9 }],
    blizzard: [{ text: 'When you see "BLIZZARD INCOMING", ducks in the front 3 columns freeze solid for a while. Cocoa Coots keep the 3×3 around them warm!', wait: 'time', arg: 11 }]
  };

  /* -------------------------------------------------------------- HELPERS */
  D.levelIndex = function (id) { return D.CAMPAIGN.indexOf(id); };
  D.worldLevels = function (w) { return L.filter(l => l.w === w); };
})(window.DVD);
