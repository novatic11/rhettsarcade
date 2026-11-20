export const WIDTH = 1280, HEIGHT = 720, PLAYER_SIZE = 28, BOSS_SIZE = 84;
export const WEAPON_NAMES = {gun:'Peashooter',shotgun:'Shotgun',rocket:'Rockets',laser:'Laser',burst:'Burst rifle',seeker:'Seekers',plasma:'Plasma cannon',boomerang:'Boomerangs',needle:'Needler',coil:'Tesla coil',blades:'Orbiting blades',railgun:'Railgun',flame:'Flamethrower',grenade:'Grenade launcher',disc:'Disc launcher',shard:'Shard cannon',poison:'Poison darts',gravity:'Gravity orbs',storm:'Storm bow',echo:'Echo blaster',drone:'Drone wing'};
export const ATTACK_NAMES = {gun:'Single shot',spread:'Spread shot',ring:'Bullet ring',missile:'Homing missile',laser:'Sweeping laser',mines:'Floating mines',spiral:'Spiral stream',rain:'Bullet rain',cross:'Crossfire',mortar:'Mortar shells',boomerang:'Return fire',pulse:'Pulse waves'};
const TAU = Math.PI * 2;
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const angleTo = (a,b) => Math.atan2(b.y-a.y,b.x-a.x);
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const wrapAngle = a => Math.atan2(Math.sin(a),Math.cos(a));
const emit = (g,type,data={}) => { if(g.events.length<80)g.events.push({type,...data}); };
function weapon(id){return {id,level:1,timer:0,damage:1,rate:1,speed:1,pellets:0,radius:0,bounces:0,tracking:1,range:1,returnDamage:1,explosion:1};}
function attack(id){return {id,level:1,timer:.9,damage:1,rate:1,speed:1,count:0,duration:0,width:0,tracking:0,spin:0,barrels:1};}
export function createGame(random=Math.random){
  const g={phase:'menu',round:1,time:0,random,projectiles:[],telegraphs:[],beams:[],mines:[],events:[],choices:[],history:[],rerolls:1,selectedPlayer:null,selectedBoss:null,totalDamage:0,kills:0,lastPhase:null,countdown:0,
    player:{x:260,y:450,vx:0,vy:0,size:PLAYER_SIZE,maxHp:30,hp:30,damage:1,fireRate:1,speed:310,invulnerable:0,shield:0,shieldMax:0,dashUnlocked:false,dashCooldown:0,dashTime:0,dashRecharge:1.5,dashLength:.16,armor:0,crit:0,critPower:1.6,thrust:1,gravity:1,climb:1,regen:0,leech:0,leechTimer:0,hitCount:0,rage:false,closeDamage:0,longDamage:0,focus:0,lifeline:false,lifelineUsed:false,thrusting:false,weaponList:[weapon('gun')],flash:0},
    boss:{x:940,y:300,vx:0,vy:0,size:BOSS_SIZE,maxHp:400,hp:400,hpMultiplier:1,damage:10,damageMultiplier:1,fireRate:1,bulletSpeed:1,speed:290,speedMultiplier:1,burst:1,extra:0,bounces:0,split:0,bulletSize:0,bulletLife:0,lead:0,enrage:false,dash:false,teleport:false,teleportTimer:6,moveTimer:2.5,dashTime:0,flash:0,burnTime:0,burnDamage:0,poisonTime:0,poisonDamage:0,attackList:[attack('gun')]},
    aim:{x:940,y:300},playerBeam:null,arcs:[],emitters:[],traces:[],fields:[],strikes:[]};
  return g;
}
function setupRound(g){
  const p=g.player,b=g.boss;
  p.x=260;p.y=470;p.vx=0;p.vy=0;p.hp=p.maxHp;p.invulnerable=0;p.shield=p.shieldMax;p.dashCooldown=0;p.dashTime=0;p.flash=0;p.lifelineUsed=false;p.leechTimer=0;p.hitCount=0;
  b.x=950;b.y=290;b.vx=0;b.vy=0;b.maxHp=nextBossHealth(g,g.round);b.hp=b.maxHp;b.speed=290*b.speedMultiplier*(1+Math.min(.055,(g.round-1)*.005));b.damage=(10+Math.floor((g.round-1)/4)*2)*b.damageMultiplier;b.flash=0;b.moveTimer=2.5;b.dashTime=0;b.teleportTimer=6;b.burnTime=b.poisonTime=b.burnDamage=b.poisonDamage=0;b.statusTick=0;
  g.projectiles=[];g.telegraphs=[];g.beams=[];g.mines=[];g.playerBeam=null;g.arcs=[];g.emitters=[];g.traces=[];g.fields=[];g.strikes=[];g.time=0;
  p.weaponList.forEach(w=>w.timer=.12);
  b.attackList.forEach((a,i)=>a.timer=1+i*.65);
}
export function startRun(g){
  const next=createGame(g.random);Object.assign(g,next);setupRound(g);g.phase='countdown';g.countdown=1.6;emit(g,'round',{round:g.round});
}
export function nextRound(g){
  if(g.phase!=='ready')throw new Error('Choose both upgrades before starting the next round.');
  g.round++;setupRound(g);g.phase='countdown';g.countdown=1.6;emit(g,'round',{round:g.round});
}
export function togglePause(g){
  if(g.phase==='paused'){g.phase=g.lastPhase;g.lastPhase=null;return true;}
  if(g.phase==='combat'||g.phase==='countdown'){g.lastPhase=g.phase;g.phase='paused';return true;}return false;
}
function definition(id,title,description,type,symbol,apply,available=()=>true){return{id,title,description,type,symbol,apply,available};}
const hasWeapon=(g,id)=>g.player.weaponList.some(w=>w.id===id);
const hasAttack=(g,id)=>g.boss.attackList.some(a=>a.id===id);
const findWeapon=(g,id)=>g.player.weaponList.find(w=>w.id===id);
const findAttack=(g,id)=>g.boss.attackList.find(a=>a.id===id);
const P=[
  definition('p_health','Bigger heart','+30 maximum health. Start the next round fully healed.','HEALTH','♥',g=>g.player.maxHp+=30),
  definition('p_damage','Mean little square','All weapons deal 18% more damage.','DAMAGE','↗',g=>g.player.damage*=1.18),
  definition('p_rate','Trigger happy','All weapons fire 15% faster.','FIRE RATE','»',g=>g.player.fireRate*=1.15),
  definition('p_speed','Featherweight','Move sideways 10% faster. Thrust stays familiar.','MOVEMENT','≋',g=>g.player.speed*=1.1,g=>g.player.speed<490),
  definition('p_shotgun','Shotgun','Add a shotgun. Six pellets fan toward your cursor.','NEW WEAPON','⋗',g=>g.player.weaponList.push(weapon('shotgun')),g=>!hasWeapon(g,'shotgun')),
  definition('p_rocket','Rocket launcher','Add slow, hard-hitting rockets with explosive impact.','NEW WEAPON','◆',g=>g.player.weaponList.push(weapon('rocket')),g=>!hasWeapon(g,'rocket')),
  definition('p_laser','Laser emitter','Add a narrow beam that follows your aim.','NEW WEAPON','━',g=>g.player.weaponList.push(weapon('laser')),g=>!hasWeapon(g,'laser')),
  definition('p_burst','Burst rifle','Add a rifle that fires rapid three-shot bursts.','NEW WEAPON','≡',g=>g.player.weaponList.push(weapon('burst')),g=>!hasWeapon(g,'burst')),
  definition('p_twin','Extra barrel','Your peashooter fires one additional bullet per shot.','PEASHOOTER','Ⅱ',g=>findWeapon(g,'gun').pellets++,g=>findWeapon(g,'gun').pellets<4),
  definition('p_heavy','Heavy rounds','Peashooter bullets grow larger and deal 30% more damage.','PEASHOOTER','●',g=>{const w=findWeapon(g,'gun');w.damage*=1.3;w.radius=Math.min(5,w.radius+1);w.level++;}),
  definition('p_bounce','Rubber rounds','Peashooter bullets can bounce off one additional wall.','PEASHOOTER','⌁',g=>findWeapon(g,'gun').bounces++,g=>findWeapon(g,'gun').bounces<3),
  definition('p_shotgun_more','More pellets','Your shotgun gains two pellets and 10% more damage.','SHOTGUN','⋙',g=>{const w=findWeapon(g,'shotgun');w.pellets+=2;w.damage*=1.1;w.level++;},g=>hasWeapon(g,'shotgun')),
  definition('p_rocket_more','Big boom','Rockets deal 35% more damage with a larger explosion.','ROCKETS','✦',g=>{const w=findWeapon(g,'rocket');w.damage*=1.35;w.level++;},g=>hasWeapon(g,'rocket')),
  definition('p_laser_more','Focused light','Your laser deals 30% more damage and burns brighter.','LASER','═',g=>{const w=findWeapon(g,'laser');w.damage*=1.3;w.level++;},g=>hasWeapon(g,'laser')),
  definition('p_burst_more','Longer burst','Your rifle fires one more shot per burst.','BURST RIFLE','≣',g=>{const w=findWeapon(g,'burst');w.pellets++;w.level++;},g=>hasWeapon(g,'burst')&&findWeapon(g,'burst').pellets<5),
  definition('p_shield','Safety bubble','Block one additional hit each round. Recharges between rounds.','DEFENSE','◎',g=>g.player.shieldMax++,g=>g.player.shieldMax<4),
  definition('p_dash','Air dash','Unlock Shift: a quick dash in your movement direction. Briefly invulnerable.','NEW ABILITY','↠',g=>g.player.dashUnlocked=true,g=>!g.player.dashUnlocked),
  definition('p_armor','Soft landing','Take 10% less damage from every attack. Stacks up to 40% reduction.','DEFENSE','▣',g=>g.player.armor=Math.min(.4,g.player.armor+.1),g=>g.player.armor<.4),
  definition('p_crit','Lucky shot','Gain a 10% chance for attacks to critically strike.','DAMAGE','✧',g=>g.player.crit=Math.min(.6,g.player.crit+.1),g=>g.player.crit<.6),
  definition('p_crit_power','Cruel luck','Critical hits deal an extra 35% of base damage.','DAMAGE','✷',g=>g.player.critPower+=.35,g=>g.player.crit>0),
  definition('p_thrust','Hot engine','Upward thrust accelerates 12% harder.','MOVEMENT','↑',g=>g.player.thrust*=1.12,g=>g.player.thrust<1.6),
  definition('p_gravity','Cloud nine','Fall with 12% less gravity for finer control in the air.','MOVEMENT','☁',g=>g.player.gravity*=.88,g=>g.player.gravity>.55),
  definition('p_dash_rate','Quick getaway','Air dash recharges 18% sooner.','AIR DASH','↠',g=>g.player.dashRecharge*=.82,g=>g.player.dashUnlocked&&g.player.dashRecharge>.65),
  definition('p_dash_length','Long jump','Your air dash lasts 0.04 seconds longer.','AIR DASH','⟶',g=>g.player.dashLength+=.04,g=>g.player.dashUnlocked&&g.player.dashLength<.28),
  definition('p_climb','Skyward','Your maximum climbing speed increases by 12%.','MOVEMENT','⇈',g=>g.player.climb*=1.12,g=>g.player.climb<1.6),
  definition('p_regen','Self repair','Recover 1 HP every four seconds during a fight.','DEFENSE','+',g=>g.player.regen+=.25,g=>g.player.regen<1),
  definition('p_leech','Blood circuit','Every ten hits restore 1 HP, at most once every 1.5 seconds.','DEFENSE','♥',g=>g.player.leech++,g=>g.player.leech<3),
  definition('p_rage','Last stand','Deal 35% more damage while below half health.','DAMAGE','!',g=>g.player.rage=true,g=>!g.player.rage),
  definition('p_close','Personal space','Deal 20% more damage while within 250 pixels of the boss.','DAMAGE','⊙',g=>g.player.closeDamage+=.2,g=>g.player.closeDamage<1),
  definition('p_long','Keep your distance','Deal 20% more damage while over 400 pixels from the boss.','DAMAGE','↔',g=>g.player.longDamage+=.2,g=>g.player.longDamage<1),
  definition('p_focus','Steady hands','Deal 15% more damage while you are not using thrust.','DAMAGE','⊕',g=>g.player.focus+=.15,g=>g.player.focus<.75),
  definition('p_lifeline','Second wind','Once per round, restore 25% max HP when health falls below 30%.','DEFENSE','♡',g=>g.player.lifeline=true,g=>!g.player.lifeline),
  definition('p_seeker','Seeker pods','Add two guided shots that curve toward the boss.','NEW WEAPON','⌖',g=>g.player.weaponList.push(weapon('seeker')),g=>!hasWeapon(g,'seeker')),
  definition('p_plasma','Plasma cannon','Add a heavy orb. Its impact deals splash damage and clears nearby bullets.','NEW WEAPON','◈',g=>g.player.weaponList.push(weapon('plasma')),g=>!hasWeapon(g,'plasma')),
  definition('p_boomerang','Boomerang rack','Throw a blade toward your aim, then hit again as it returns to you.','NEW WEAPON','⌁',g=>g.player.weaponList.push(weapon('boomerang')),g=>!hasWeapon(g,'boomerang')),
  definition('p_needle','Needler','Add a very fast stream of fine, high-speed needles.','NEW WEAPON','⁝',g=>g.player.weaponList.push(weapon('needle')),g=>!hasWeapon(g,'needle')),
  definition('p_coil','Tesla coil','Zap the boss when it is within 400 pixels and near your aim.','NEW WEAPON','ϟ',g=>g.player.weaponList.push(weapon('coil')),g=>!hasWeapon(g,'coil')),
  definition('p_blades','Orbiting blades','Two blades orbit you and slice the boss at close range.','NEW WEAPON','✥',g=>g.player.weaponList.push(weapon('blades')),g=>!hasWeapon(g,'blades')),
  definition('p_seeker_pair','Swarm protocol','Your seeker pods launch one extra guided shot.','SEEKERS','⋮',g=>{const w=findWeapon(g,'seeker');w.pellets++;w.level++;},g=>hasWeapon(g,'seeker')&&findWeapon(g,'seeker').pellets<4),
  definition('p_seeker_track','Lock on','Seekers turn 25% faster and deal 15% more damage.','SEEKERS','⌖',g=>{const w=findWeapon(g,'seeker');w.tracking*=1.25;w.damage*=1.15;w.level++;},g=>hasWeapon(g,'seeker')),
  definition('p_plasma_size','Event horizon','Plasma explosions are 25% wider and clear more enemy bullets.','PLASMA','◉',g=>{const w=findWeapon(g,'plasma');w.explosion*=1.25;w.level++;},g=>hasWeapon(g,'plasma')&&findWeapon(g,'plasma').explosion<2.5),
  definition('p_plasma_power','Unstable core','Plasma impacts and splash damage deal 30% more damage.','PLASMA','✷',g=>{const w=findWeapon(g,'plasma');w.damage*=1.3;w.level++;},g=>hasWeapon(g,'plasma')),
  definition('p_boomerang_pair','Two way street','Throw one extra boomerang each volley.','BOOMERANGS','⌁',g=>{const w=findWeapon(g,'boomerang');w.pellets++;w.level++;},g=>hasWeapon(g,'boomerang')&&findWeapon(g,'boomerang').pellets<3),
  definition('p_boomerang_return','Return to sender','Returning boomerangs deal 40% more damage.','BOOMERANGS','↶',g=>{const w=findWeapon(g,'boomerang');w.returnDamage*=1.4;w.level++;},g=>hasWeapon(g,'boomerang')),
  definition('p_needle_pair','Pin cushion','Needler volleys gain one additional needle.','NEEDLER','Ⅱ',g=>{const w=findWeapon(g,'needle');w.pellets++;w.level++;},g=>hasWeapon(g,'needle')&&findWeapon(g,'needle').pellets<3),
  definition('p_needle_rate','Stitching machine','Your needler fires 25% faster.','NEEDLER','»',g=>{const w=findWeapon(g,'needle');w.rate*=1.25;w.level++;},g=>hasWeapon(g,'needle')),
  definition('p_coil_range','Long wire','Tesla coil range increases by 25%.','TESLA COIL','ϟ',g=>{const w=findWeapon(g,'coil');w.range*=1.25;w.level++;},g=>hasWeapon(g,'coil')&&findWeapon(g,'coil').range<2),
  definition('p_coil_power','Overvoltage','Tesla coil zaps deal 35% more damage.','TESLA COIL','ϟ',g=>{const w=findWeapon(g,'coil');w.damage*=1.35;w.level++;},g=>hasWeapon(g,'coil')),
  definition('p_blades_more','Saw halo','Add one more orbiting blade.','ORBITING BLADES','✥',g=>{const w=findWeapon(g,'blades');w.pellets++;w.level++;},g=>hasWeapon(g,'blades')&&findWeapon(g,'blades').pellets<5),
  definition('p_blades_power','Sharp company','Orbiting blades deal 35% more damage.','ORBITING BLADES','✦',g=>{const w=findWeapon(g,'blades');w.damage*=1.35;w.level++;},g=>hasWeapon(g,'blades')),
  definition('p_railgun','Railgun','Fire a precise, instant shot across the arena every 1.5 seconds.','NEW WEAPON','⟶',g=>g.player.weaponList.push(weapon('railgun')),g=>!hasWeapon(g,'railgun')),
  definition('p_flame','Flamethrower','Spray a short cone of fire toward your aim. Hits keep the boss burning for two seconds.','NEW WEAPON','♨',g=>g.player.weaponList.push(weapon('flame')),g=>!hasWeapon(g,'flame')),
  definition('p_grenade','Grenade launcher','Lob arcing grenades. They explode on impact or after a short fuse.','NEW WEAPON','✹',g=>g.player.weaponList.push(weapon('grenade')),g=>!hasWeapon(g,'grenade')),
  definition('p_disc','Disc launcher','Launch a large saw disc that ricochets twice and can hit the boss again.','NEW WEAPON','✺',g=>g.player.weaponList.push(weapon('disc')),g=>!hasWeapon(g,'disc')),
  definition('p_shard','Shard cannon','Fire a crystal that splits into five smaller shots after a short flight.','NEW WEAPON','⋔',g=>g.player.weaponList.push(weapon('shard')),g=>!hasWeapon(g,'shard')),
  definition('p_poison','Poison darts','Fire twin darts that poison the boss for three seconds. Repeated hits refresh the poison.','NEW WEAPON','⋮',g=>g.player.weaponList.push(weapon('poison')),g=>!hasWeapon(g,'poison')),
  definition('p_gravity_orb','Gravity orbs','Send an orb toward your cursor. It creates a damaging field that bends enemy bullets inward.','NEW WEAPON','⊛',g=>g.player.weaponList.push(weapon('gravity')),g=>!hasWeapon(g,'gravity')),
  definition('p_storm','Storm bow','Fire an arrow that calls down a second lightning hit after it lands.','NEW WEAPON','ϟ',g=>g.player.weaponList.push(weapon('storm')),g=>!hasWeapon(g,'storm')),
  definition('p_echo','Echo blaster','Fire a shot, followed by two echoes from offset positions. All three converge on your aim.','NEW WEAPON','≋',g=>g.player.weaponList.push(weapon('echo')),g=>!hasWeapon(g,'echo')),
  definition('p_drone','Drone wing','Two tiny drones circle you and fire toward your cursor.','NEW WEAPON','▫',g=>g.player.weaponList.push(weapon('drone')),g=>!hasWeapon(g,'drone')),
  definition('p_railgun_more','Capacitor bank','Railgun shots deal 35% more damage and fire 15% faster.','RAILGUN','⟶',g=>{const w=findWeapon(g,'railgun');w.damage*=1.35;w.rate*=1.15;w.level++;},g=>hasWeapon(g,'railgun')),
  definition('p_flame_more','Long flame','Flames reach 25% farther and deal 15% more damage.','FLAMETHROWER','♨',g=>{const w=findWeapon(g,'flame');w.range*=1.25;w.damage*=1.15;w.level++;},g=>hasWeapon(g,'flame')&&findWeapon(g,'flame').range<2),
  definition('p_grenade_more','Demolition kit','Grenade explosions become 30% wider.','GRENADES','✹',g=>{const w=findWeapon(g,'grenade');w.explosion*=1.3;w.level++;},g=>hasWeapon(g,'grenade')&&findWeapon(g,'grenade').explosion<2.5),
  definition('p_disc_more','Round trip','Discs gain one additional wall bounce and 15% more damage.','DISCS','↻',g=>{const w=findWeapon(g,'disc');w.bounces++;w.damage*=1.15;w.level++;},g=>hasWeapon(g,'disc')&&findWeapon(g,'disc').bounces<3),
  definition('p_shard_more','Crystal garden','Each crystal splits into two additional shards.','SHARD CANNON','⋔',g=>{const w=findWeapon(g,'shard');w.pellets+=2;w.level++;},g=>hasWeapon(g,'shard')&&findWeapon(g,'shard').pellets<6),
  definition('p_poison_more','Venom reserve','Poison darts and their lingering poison deal 30% more damage.','POISON DARTS','⋮',g=>{const w=findWeapon(g,'poison');w.damage*=1.3;w.level++;},g=>hasWeapon(g,'poison')),
  definition('p_gravity_more','Deep space','Gravity fields become 25% wider and deal 20% more damage.','GRAVITY ORBS','⊛',g=>{const w=findWeapon(g,'gravity');w.explosion*=1.25;w.damage*=1.2;w.level++;},g=>hasWeapon(g,'gravity')&&findWeapon(g,'gravity').explosion<2.5),
  definition('p_storm_more','Thunderhead','Storm arrows and follow-up lightning deal 30% more damage.','STORM BOW','ϟ',g=>{const w=findWeapon(g,'storm');w.damage*=1.3;w.level++;},g=>hasWeapon(g,'storm')),
  definition('p_echo_more','Repeat yourself','Add one extra echo to every volley.','ECHO BLASTER','≋',g=>{const w=findWeapon(g,'echo');w.pellets++;w.level++;},g=>hasWeapon(g,'echo')&&findWeapon(g,'echo').pellets<3),
  definition('p_drone_more','Extra company','Add one more armed drone to your wing.','DRONE WING','▫',g=>{const w=findWeapon(g,'drone');w.pellets++;w.level++;},g=>hasWeapon(g,'drone')&&findWeapon(g,'drone').pellets<3),
];
const B=[
  definition('b_health','Bigger problem','Boss maximum health increases by 25%, on top of the automatic 30% round growth.','HEALTH','♥',g=>g.boss.hpMultiplier*=1.25),
  definition('b_damage','Sharp edges','All boss attacks deal 20% more damage.','DAMAGE','↗',g=>g.boss.damageMultiplier*=1.2),
  definition('b_rate','Impatient','Boss attacks recharge 12% faster.','ATTACK RATE','»',g=>g.boss.fireRate*=1.12),
  definition('b_speed','Hot shots','Boss projectiles travel 12% faster.','BULLET SPEED','≋',g=>g.boss.bulletSpeed*=1.12,g=>g.boss.bulletSpeed<1.9),
  definition('b_spread','Spread cannon','Add a five-bullet fan aimed at your position.','NEW ATTACK','⋗',g=>g.boss.attackList.push(attack('spread')),g=>!hasAttack(g,'spread')),
  definition('b_ring','Bullet halo','Add an expanding ring of twelve bullets.','NEW ATTACK','◉',g=>g.boss.attackList.push(attack('ring')),g=>!hasAttack(g,'ring')),
  definition('b_missile','Homing missile','Add a slow missile that tracks you briefly, then flies straight.','NEW ATTACK','◆',g=>g.boss.attackList.push(attack('missile')),g=>!hasAttack(g,'missile')),
  definition('b_laser','Sweeping laser','Add a sweeping beam. A thin warning line shows its path first.','NEW ATTACK','━',g=>g.boss.attackList.push(attack('laser')),g=>!hasAttack(g,'laser')),
  definition('b_mines','Floating mines','Add two mines that arm, then burst into bullets.','NEW ATTACK','✦',g=>g.boss.attackList.push(attack('mines')),g=>!hasAttack(g,'mines')),
  definition('b_burst','Burst fire','The original cannon fires two extra bullets in sequence.','CANNON','≡',g=>g.boss.burst+=2,g=>g.boss.burst<7),
  definition('b_extra','Extra barrels','Cannon and spread attacks gain two additional bullets.','PROJECTILES','Ⅱ',g=>g.boss.extra+=2,g=>g.boss.extra<8),
  definition('b_bounce','Ricochet','Boss bullets bounce off one additional wall.','PROJECTILES','⌁',g=>g.boss.bounces++,g=>g.boss.bounces<2),
  definition('b_split','Split personality','Cannon bullets divide into three after a short flight.','CANNON','⋔',g=>g.boss.split=1,g=>!g.boss.split),
  definition('b_spread_more','Wide load','Spread cannon gains two bullets and attacks 10% faster.','SPREAD CANNON','⋙',g=>{const a=findAttack(g,'spread');a.count+=2;a.rate*=1.1;a.level++;},g=>hasAttack(g,'spread')),
  definition('b_ring_more','Bigger halo','Bullet rings gain four bullets, with gaps still left between them.','BULLET HALO','◎',g=>{const a=findAttack(g,'ring');a.count+=4;a.level++;},g=>hasAttack(g,'ring')&&findAttack(g,'ring').count<16),
  definition('b_laser_more','Double beam','The laser fires two parallel, sweeping beams.','SWEEPING LASER','═',g=>{const a=findAttack(g,'laser');a.barrels=2;a.level++;},g=>hasAttack(g,'laser')&&findAttack(g,'laser').barrels===1),
  definition('b_missile_more','Missile pair','Launch two homing missiles with a short gap between them.','HOMING MISSILE','◇',g=>{const a=findAttack(g,'missile');a.barrels=2;a.level++;},g=>hasAttack(g,'missile')&&findAttack(g,'missile').barrels===1),
  definition('b_dash','Rush hour','Boss occasionally makes a warned dash toward your position. Body contact remains safe.','MOVEMENT','↠',g=>g.boss.dash=true,g=>!g.boss.dash),
  definition('b_spiral','Spiral stream','Add a rotating stream of bullets. Thread through the moving gaps.','NEW ATTACK','＠',g=>g.boss.attackList.push(attack('spiral')),g=>!hasAttack(g,'spiral')),
  definition('b_rain','Bullet rain','Marked lanes at the top of the arena release falling bullets.','NEW ATTACK','⇣',g=>g.boss.attackList.push(attack('rain')),g=>!hasAttack(g,'rain')),
  definition('b_cross','Crossfire','Add three bursts of a rotating, four-way bullet cross.','NEW ATTACK','✚',g=>g.boss.attackList.push(attack('cross')),g=>!hasAttack(g,'cross')),
  definition('b_mortar','Mortar shells','A slow shell flies toward your marked position, then bursts into eight bullets.','NEW ATTACK','◈',g=>g.boss.attackList.push(attack('mortar')),g=>!hasAttack(g,'mortar')),
  definition('b_boomerang','Return fire','Add curved blades that fly out, then return toward the boss.','NEW ATTACK','⌁',g=>g.boss.attackList.push(attack('boomerang')),g=>!hasAttack(g,'boomerang')),
  definition('b_pulse','Pulse waves','Add a ring of bullets, followed by a second ring with rotated gaps.','NEW ATTACK','◎',g=>g.boss.attackList.push(attack('pulse')),g=>!hasAttack(g,'pulse')),
  definition('b_spiral_arms','Twin spiral','Add a second arm to the spiral stream. Further stacks add another arm.','SPIRAL STREAM','＠',g=>{const a=findAttack(g,'spiral');a.count++;a.level++;},g=>hasAttack(g,'spiral')&&findAttack(g,'spiral').count<2),
  definition('b_spiral_time','Endless spin','Spiral streams last 0.7 seconds longer.','SPIRAL STREAM','↻',g=>{const a=findAttack(g,'spiral');a.duration+=.7;a.level++;},g=>hasAttack(g,'spiral')&&findAttack(g,'spiral').duration<2.1),
  definition('b_rain_lanes','Storm front','Bullet rain gains two falling lanes.','BULLET RAIN','⇣',g=>{const a=findAttack(g,'rain');a.count+=2;a.level++;},g=>hasAttack(g,'rain')&&findAttack(g,'rain').count<6),
  definition('b_rain_waves','Downpour','Each rain attack sends one extra bullet down every lane.','BULLET RAIN','⋮',g=>{const a=findAttack(g,'rain');a.duration++;a.level++;},g=>hasAttack(g,'rain')&&findAttack(g,'rain').duration<3),
  definition('b_cross_more','Cross purposes','Crossfire fires one extra four-way burst.','CROSSFIRE','✚',g=>{const a=findAttack(g,'cross');a.count++;a.level++;},g=>hasAttack(g,'cross')&&findAttack(g,'cross').count<4),
  definition('b_cross_spin','Turning point','The cross rotates 10 degrees farther with each burst.','CROSSFIRE','↻',g=>{const a=findAttack(g,'cross');a.spin+=Math.PI/18;a.level++;},g=>hasAttack(g,'cross')&&findAttack(g,'cross').spin<Math.PI/3),
  definition('b_mortar_shards','Fragmentation','Mortar explosions release four extra bullets.','MORTAR SHELLS','✦',g=>{const a=findAttack(g,'mortar');a.count+=4;a.level++;},g=>hasAttack(g,'mortar')&&findAttack(g,'mortar').count<12),
  definition('b_mortar_pair','Shell company','Fire one additional mortar shell per volley.','MORTAR SHELLS','◇',g=>{const a=findAttack(g,'mortar');a.duration++;a.level++;},g=>hasAttack(g,'mortar')&&findAttack(g,'mortar').duration<2),
  definition('b_boomerang_more','Back for more','Return fire gains two additional blades.','RETURN FIRE','⌁',g=>{const a=findAttack(g,'boomerang');a.count+=2;a.level++;},g=>hasAttack(g,'boomerang')&&findAttack(g,'boomerang').count<6),
  definition('b_boomerang_size','Broad return','Returning blades grow one pixel wider and deal 15% more damage.','RETURN FIRE','↶',g=>{const a=findAttack(g,'boomerang');a.width++;a.damage*=1.15;a.level++;},g=>hasAttack(g,'boomerang')&&findAttack(g,'boomerang').width<4),
  definition('b_pulse_more','Crowded circle','Pulse rings gain four bullets each.','PULSE WAVES','◉',g=>{const a=findAttack(g,'pulse');a.count+=4;a.level++;},g=>hasAttack(g,'pulse')&&findAttack(g,'pulse').count<12),
  definition('b_pulse_wave','Third wheel','Pulse attacks gain one extra delayed ring.','PULSE WAVES','◎',g=>{const a=findAttack(g,'pulse');a.duration++;a.level++;},g=>hasAttack(g,'pulse')&&findAttack(g,'pulse').duration<2),
  definition('b_size','Big trouble','All boss bullets grow one pixel wider.','PROJECTILES','●',g=>g.boss.bulletSize++,g=>g.boss.bulletSize<3),
  definition('b_linger','Long goodbye','Boss bullets stay in the arena one second longer.','PROJECTILES','◷',g=>g.boss.bulletLife++,g=>g.boss.bulletLife<3),
  definition('b_move','Close company','Boss movement speed increases by 10%.','MOVEMENT','↔',g=>g.boss.speedMultiplier*=1.1,g=>g.boss.speedMultiplier<1.4),
  definition('b_lead','Ahead of you','The cannon and spread shot aim 0.18 seconds ahead of your movement.','TARGETING','⌖',g=>g.boss.lead+=.18,g=>g.boss.lead<.7),
  definition('b_enrage','Bad temper','Below half health, the boss attacks 20% faster.','ATTACK RATE','!',g=>g.boss.enrage=true,g=>!g.boss.enrage),
  definition('b_mines_more','Minefield','Floating mine attacks plant two extra mines.','FLOATING MINES','✦',g=>{const a=findAttack(g,'mines');a.count+=2;a.level++;},g=>hasAttack(g,'mines')&&findAttack(g,'mines').count<4),
  definition('b_mines_shards','Shrapnel garden','Mine explosions release four additional bullets.','FLOATING MINES','✷',g=>{const a=findAttack(g,'mines');a.width+=4;a.level++;},g=>hasAttack(g,'mines')&&findAttack(g,'mines').width<12),
  definition('b_missile_tracking','Persistent problem','Homing missiles track you for 0.6 seconds longer.','HOMING MISSILE','⌖',g=>{const a=findAttack(g,'missile');a.tracking+=.6;a.level++;},g=>hasAttack(g,'missile')&&findAttack(g,'missile').tracking<1.8),
  definition('b_laser_time','Slow burn','Sweeping lasers stay active 0.4 seconds longer.','SWEEPING LASER','━',g=>{const a=findAttack(g,'laser');a.duration+=.4;a.level++;},g=>hasAttack(g,'laser')&&findAttack(g,'laser').duration<1.2),
  definition('b_laser_width','Wide beam','Sweeping lasers become four pixels wider.','SWEEPING LASER','═',g=>{const a=findAttack(g,'laser');a.width+=4;a.level++;},g=>hasAttack(g,'laser')&&findAttack(g,'laser').width<12),
  definition('b_gun_power','Heavy cannon','The original cannon deals 30% more damage.','CANNON','●',g=>{const a=findAttack(g,'gun');a.damage*=1.3;a.level++;}),
  definition('b_spread_speed','Fast fan','Spread shot bullets travel 15% faster.','SPREAD CANNON','»',g=>{const a=findAttack(g,'spread');a.speed*=1.15;a.level++;},g=>hasAttack(g,'spread')&&findAttack(g,'spread').speed<1.8),
  definition('b_ring_size','Heavy halo','Halo bullets grow one pixel wider and travel 10% slower.','BULLET HALO','◉',g=>{const a=findAttack(g,'ring');a.width++;a.speed*=.9;a.level++;},g=>hasAttack(g,'ring')&&findAttack(g,'ring').width<3),
  definition('b_teleport','Blink drive','Every six seconds, the boss jumps to a marked position. Body contact is safe.','MOVEMENT','◇',g=>g.boss.teleport=true,g=>!g.boss.teleport),
];
export const UPGRADE_COUNTS={player:P.length,boss:B.length};
export function nextBossHealth(g,round=g.round+1){return Math.round(400*Math.pow(1.3,round-1)*g.boss.hpMultiplier);}
const STAT_LABELS={maxHp:'Maximum HP',damage:'Damage',damageMultiplier:'Attack damage',fireRate:'Fire rate',speed:'Move speed',shieldMax:'Hits blocked',dashUnlocked:'Air dash',dashRecharge:'Dash cooldown',dashLength:'Dash duration',armor:'Damage reduction',crit:'Critical chance',critPower:'Critical damage',thrust:'Thrust power',gravity:'Gravity',climb:'Climb speed',regen:'HP / second',leech:'HP / ten hits',rage:'Low-health damage',closeDamage:'Close-range bonus',longDamage:'Long-range bonus',focus:'No-thrust bonus',lifeline:'Second wind',bulletSpeed:'Bullet speed',speedMultiplier:'Move speed',burst:'Cannon burst',extra:'Extra bullets',bounces:'Wall bounces',split:'Split bullets',bulletSize:'Bullet size',bulletLife:'Bullet lifetime',lead:'Aim prediction',enrage:'Low-health frenzy',dash:'Boss dash',teleport:'Blink drive',pellets:'Extra shots',radius:'Bullet size',rate:'Fire rate',tracking:'Tracking',range:'Range',returnDamage:'Return damage',explosion:'Blast radius',count:'Extra projectiles',duration:'Extra duration',width:'Extra width',spin:'Rotation',barrels:'Launchers'};
const PERCENT_STATS=new Set(['damage','damageMultiplier','fireRate','armor','crit','critPower','thrust','gravity','climb','closeDamage','longDamage','focus','bulletSpeed','speedMultiplier','rate','returnDamage','explosion','range']);
function statText(key,value){if(typeof value==='boolean')return value?'Active':'Inactive';if(PERCENT_STATS.has(key))return Math.round(value*100)+'%';if(['dashRecharge','dashLength','lead','bulletLife','duration'].includes(key))return Number(value.toFixed(2))+'s';if(['radius','bulletSize','width'].includes(key))return value+'px';if(key==='spin')return Math.round(value*180/Math.PI)+'°';return Number(value.toFixed(2)).toLocaleString();}
export function upgradeDetails(g,u,side){
  const clone={...g,player:JSON.parse(JSON.stringify(g.player)),boss:JSON.parse(JSON.stringify(g.boss))};u.apply(clone);
  const before=side==='player'?g.player:g.boss,after=side==='player'?clone.player:clone.boss,list=side==='player'?'weaponList':'attackList',names=side==='player'?WEAPON_NAMES:ATTACK_NAMES;
  const changes=[];let target=side==='player'?'Your whole build':'Boss build',kind=u.type==='NEW ABILITY'?'ability':'stat';
  if(after[list].length>before[list].length){kind=side==='player'?'weapon':'attack';target=names[after[list].at(-1).id];changes.push({label:side==='player'?'Weapons':'Attack patterns',before:String(before[list].length),after:String(after[list].length)});}
  for(const key of Object.keys(STAT_LABELS)){if(typeof before[key]!=='undefined'&&before[key]!==after[key])changes.push({label:STAT_LABELS[key],before:statText(key,before[key]),after:statText(key,after[key])});}
  if(before.hpMultiplier!==after.hpMultiplier)changes.push({label:'Next boss HP',before:nextBossHealth(g).toLocaleString(),after:nextBossHealth(clone).toLocaleString()});
  before[list].forEach((old,i)=>{const w=after[list][i];if(JSON.stringify(old)!==JSON.stringify(w)){kind='mod';target=names[w.id];for(const key of Object.keys(STAT_LABELS)){if(typeof old[key]!=='undefined'&&old[key]!==w[key])changes.push({label:STAT_LABELS[key],before:statText(key,old[key]),after:statText(key,w[key])});}}});
  const stack=1+g.history.filter(h=>h.id===u.id).length;
  return{kind,target,stack,changes:changes.slice(0,3)};
}
export function upgradePool(g,side){return(side==='player'?P:B).filter(u=>u.available(g));}
export function offerUpgrades(g,side,exclude=[]){
  let pool=upgradePool(g,side);const fresh=pool.filter(u=>!exclude.includes(u.id));if(fresh.length>=3)pool=fresh;
  const shuffled=[...pool];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(g.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  return shuffled.slice(0,3);
}
export function reroll(g){
  if(!['upgrade_player','upgrade_boss'].includes(g.phase))throw new Error('Reroll is only available during upgrade selection.');
  if(g.rerolls<1)throw new Error('Your shared reroll has already been spent.');
  g.choices=offerUpgrades(g,g.phase==='upgrade_player'?'player':'boss',g.choices.map(u=>u.id));g.rerolls=0;emit(g,'reroll');return g.choices;
}
export function chooseUpgrade(g,index){
  if(!['upgrade_player','upgrade_boss'].includes(g.phase))throw new Error('There are no upgrades to choose right now.');
  if(!Number.isInteger(index)||index<0||index>=g.choices.length)throw new Error('Choose one of the three offered upgrades.');
  const side=g.phase==='upgrade_player'?'player':'boss',u=g.choices[index];
  if(!u.available(g))throw new Error('That upgrade is no longer available.');
  u.apply(g);g.history.push({side,id:u.id,title:u.title,round:g.round});emit(g,'upgrade',{side,title:u.title});
  if(side==='player'){g.player.hp=g.player.maxHp;g.selectedPlayer=u;g.phase='upgrade_boss';g.choices=offerUpgrades(g,'boss');}
  else{g.selectedBoss=u;g.choices=[];g.phase='ready';}return u;
}
function winRound(g){
  g.boss.hp=0;g.kills++;g.player.hp=g.player.maxHp;g.player.shield=g.player.shieldMax;g.phase='upgrade_player';g.rerolls=1;g.selectedPlayer=null;g.selectedBoss=null;g.choices=offerUpgrades(g,'player');
  g.projectiles=[];g.telegraphs=[];g.beams=[];g.mines=[];g.emitters=[];g.arcs=[];g.traces=[];g.fields=[];g.strikes=[];g.playerBeam=null;g.boss.burnTime=g.boss.poisonTime=0;emit(g,'victory',{x:g.boss.x,y:g.boss.y,round:g.round});
}
function hurtBoss(g,damage,x,y){
  if(g.phase!=='combat')return;g.boss.hp=Math.max(0,g.boss.hp-damage);g.totalDamage+=damage;g.boss.flash=.05;emit(g,'boss_hit',{x,y,damage});
  const p=g.player;p.hitCount++;if(p.leech&&p.hitCount>=10&&p.leechTimer<=0){p.hp=Math.min(p.maxHp,p.hp+p.leech);p.hitCount=0;p.leechTimer=1.5;emit(g,'heal',{x:p.x,y:p.y});}if(g.boss.hp<=0)winRound(g);
}
function hurtPlayer(g,damage,x,y){
  const p=g.player;if(p.invulnerable>0||g.phase!=='combat')return;
  if(p.shield>0){p.shield--;p.invulnerable=.75;emit(g,'shield_hit',{x:p.x,y:p.y});return;}
  p.hp=Math.max(0,p.hp-damage*(1-p.armor));p.invulnerable=.85;p.flash=.2;emit(g,'player_hit',{x:p.x,y:p.y,damage});
  if(p.lifeline&&!p.lifelineUsed&&p.hp<p.maxHp*.3){p.lifelineUsed=true;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.25);emit(g,'heal',{x:p.x,y:p.y});}
  if(p.hp<=0){g.phase='dead';g.playerBeam=null;emit(g,'death',{x:p.x,y:p.y,round:g.round});}
}
function addBullet(g,owner,x,y,angle,speed,damage,kind='bullet',opts={}){
  if(g.projectiles.length>=650)return;
  const enemy=owner==='boss';g.projectiles.push({owner,x,y,px:x,py:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,speed,damage,kind,life:6,age:0,bounces:0,split:false,delay:0,...opts,radius:(opts.radius??(enemy?5:3))+(enemy?g.boss.bulletSize:0),life:(opts.life??6)+(enemy?g.boss.bulletLife:0)});
}
function outgoing(g,base){const p=g.player,d=distance(p,g.boss);let bonus=1;if(p.rage&&p.hp<p.maxHp*.5)bonus+=.35;if(d<250)bonus+=p.closeDamage;if(d>400)bonus+=p.longDamage;if(!p.thrusting)bonus+=p.focus;return base*p.damage*bonus*(g.random()<p.crit?p.critPower:1);}
export function bladePositions(g,w){return Array.from({length:2+w.pellets},(_,i)=>{const a=g.time*3.8+i/(2+w.pellets)*TAU;return{x:g.player.x+Math.cos(a)*65,y:g.player.y+Math.sin(a)*65,angle:a};});}
export function dronePositions(g,w){return Array.from({length:2+w.pellets},(_,i)=>{const a=g.time*1.8+i/(2+w.pellets)*TAU;return{x:clamp(g.player.x+Math.cos(a)*52,25,WIDTH-25),y:clamp(g.player.y-34+Math.sin(a)*24,25,HEIGHT-25)};});}
function playerFire(g,dt){
  const p=g.player,ang=angleTo(p,g.aim);g.playerBeam=null;
  for(const w of p.weaponList){
    w.timer-=dt;const rate=p.fireRate*w.rate;
    if(w.id==='laser'){
      g.playerBeam={x:p.x,y:p.y,angle:ang,level:w.level};
      if(w.timer<=0){w.timer=.1/rate;const dx=Math.cos(ang),dy=Math.sin(ang),proj=(g.boss.x-p.x)*dx+(g.boss.y-p.y)*dy,cross=Math.abs((g.boss.x-p.x)*dy-(g.boss.y-p.y)*dx);if(proj>0&&cross<g.boss.size*.47)hurtBoss(g,outgoing(g,3.3*w.damage),g.boss.x,g.boss.y);}
      continue;
    }
    if(w.id==='blades'){if(w.timer<=0&&bladePositions(g,w).some(q=>distance(q,g.boss)<g.boss.size*.47+10)){w.timer=.3/rate;hurtBoss(g,outgoing(g,10*w.damage),g.boss.x,g.boss.y);emit(g,'shoot',{weapon:w.id,x:p.x,y:p.y});}if(g.phase!=='combat')return;continue;}
    if(w.id==='coil'){if(w.timer<=0&&distance(p,g.boss)<400*w.range&&Math.abs(wrapAngle(angleTo(p,g.boss)-ang))<.6){w.timer=.65/rate;g.arcs.push({x:p.x,y:p.y,ex:g.boss.x,ey:g.boss.y,life:.16});hurtBoss(g,outgoing(g,24*w.damage),g.boss.x,g.boss.y);emit(g,'shoot',{weapon:w.id,x:p.x,y:p.y});}if(g.phase!=='combat')return;continue;}
    if(w.timer>0)continue;
    const muzzle={x:p.x+Math.cos(ang)*21,y:p.y+Math.sin(ang)*21};
    if(w.id==='gun'){
      w.timer=.22/rate;const n=1+w.pellets;
      for(let i=0;i<n;i++)addBullet(g,'player',muzzle.x,muzzle.y,ang+(i-(n-1)/2)*.08,780,outgoing(g,12*w.damage),'bullet',{radius:3+w.radius,bounces:w.bounces});
    }else if(w.id==='shotgun'){
      w.timer=.9/rate;const n=6+w.pellets;
      for(let i=0;i<n;i++)addBullet(g,'player',muzzle.x,muzzle.y,ang+(i-(n-1)/2)*.09,660+(g.random()-.5)*100,outgoing(g,7*w.damage),'pellet',{radius:2.8,life:1.4});
    }else if(w.id==='rocket'){
      w.timer=1.5/rate;addBullet(g,'player',muzzle.x,muzzle.y,ang,440,outgoing(g,55*w.damage),'rocket',{radius:6,level:w.level});
    }else if(w.id==='burst'){
      w.timer=.8/rate;for(let i=0;i<3+w.pellets;i++)addBullet(g,'player',muzzle.x,muzzle.y,ang,880,outgoing(g,8*w.damage),'burst',{delay:i*.055});
    }else if(w.id==='seeker'){
      w.timer=1.15/rate;for(let i=0;i<2+w.pellets;i++)addBullet(g,'player',muzzle.x,muzzle.y,ang+(i-(1+w.pellets)/2)*.3,470,outgoing(g,16*w.damage),'seeker',{homingTime:4,turn:2.2*w.tracking,radius:4});
    }else if(w.id==='plasma'){
      w.timer=1.8/rate;addBullet(g,'player',muzzle.x,muzzle.y,ang,360,outgoing(g,48*w.damage),'plasma',{radius:11,blast:90*w.explosion});
    }else if(w.id==='boomerang'){
      w.timer=1.1/rate;for(let i=0;i<1+w.pellets;i++)addBullet(g,'player',muzzle.x,muzzle.y,ang+(i-w.pellets/2)*.18,650,outgoing(g,18*w.damage),'boomerang',{radius:7,returnAt:.55,returnDamage:w.returnDamage,life:2.8,lastHit:-1});
    }else if(w.id==='needle'){
      w.timer=.1/rate;for(let i=0;i<1+w.pellets;i++)addBullet(g,'player',muzzle.x,muzzle.y,ang+(i-w.pellets/2)*.055,1150,outgoing(g,4*w.damage),'needle',{radius:1.8,life:1.4});
    }else if(w.id==='railgun'){
      w.timer=1.5/rate;g.traces.push({x:muzzle.x,y:muzzle.y,angle:ang,length:1500,life:.2,total:.2,kind:'railgun'});const dx=Math.cos(ang),dy=Math.sin(ang),projection=(g.boss.x-p.x)*dx+(g.boss.y-p.y)*dy,cross=Math.abs((g.boss.x-p.x)*dy-(g.boss.y-p.y)*dx);if(projection>0&&cross<g.boss.size*.47+3)hurtBoss(g,outgoing(g,64*w.damage),g.boss.x,g.boss.y);
    }else if(w.id==='flame'){
      w.timer=.075/rate;const a=ang+(g.random()-.5)*.34;addBullet(g,'player',muzzle.x,muzzle.y,a,420,outgoing(g,2.8*w.damage),'flame',{radius:6,life:.55*w.range,statusDamage:outgoing(g,8*w.damage)});
    }else if(w.id==='grenade'){
      w.timer=1.25/rate;addBullet(g,'player',muzzle.x,muzzle.y,ang,520,outgoing(g,44*w.damage),'grenade',{radius:7,gravity:400,vy:Math.sin(ang)*520-100,fuse:1.15,blast:100*w.explosion,life:1.3});
    }else if(w.id==='disc'){
      w.timer=1.15/rate;addBullet(g,'player',muzzle.x,muzzle.y,ang,580,outgoing(g,24*w.damage),'disc',{radius:12,bounces:2+w.bounces,life:5.2,lastHit:-1});
    }else if(w.id==='shard'){
      w.timer=1.1/rate;addBullet(g,'player',muzzle.x,muzzle.y,ang,520,outgoing(g,24*w.damage),'shard',{radius:7,shards:5+w.pellets,shardDamage:outgoing(g,8*w.damage),openAt:.28});
    }else if(w.id==='poison'){
      w.timer=.9/rate;for(const offset of[-.055,.055])addBullet(g,'player',muzzle.x,muzzle.y,ang+offset,750,outgoing(g,8*w.damage),'poison',{radius:2.5,statusDamage:outgoing(g,10*w.damage),life:2});
    }else if(w.id==='gravity'){
      w.timer=2.1/rate;addBullet(g,'player',muzzle.x,muzzle.y,ang,300,outgoing(g,9*w.damage),'gravity',{radius:9,fuse:clamp(distance(muzzle,g.aim)/300,.2,1.7),blast:100*w.explosion,life:1.9});
    }else if(w.id==='storm'){
      w.timer=1.15/rate;addBullet(g,'player',muzzle.x,muzzle.y,ang,920,outgoing(g,18*w.damage),'storm',{radius:3,lightning:outgoing(g,26*w.damage),life:1.5});
    }else if(w.id==='echo'){
      w.timer=.85/rate;addBullet(g,'player',muzzle.x,muzzle.y,ang,760,outgoing(g,14*w.damage),'echo');for(let i=0;i<2+w.pellets;i++){const offset=(i%2?1:-1)*(42+Math.floor(i/2)*18),x=p.x-Math.sin(ang)*offset,y=p.y+Math.cos(ang)*offset;addBullet(g,'player',x,y,angleTo({x,y},g.aim),760,outgoing(g,10*w.damage),'echo',{delay:.15+i*.1});}
    }else if(w.id==='drone'){
      w.timer=.5/rate;for(const q of dronePositions(g,w))addBullet(g,'player',q.x,q.y,angleTo(q,g.aim),820,outgoing(g,7*w.damage),'drone',{radius:2.5,life:2});
    }
    emit(g,'shoot',{weapon:w.id,x:muzzle.x,y:muzzle.y});
    if(g.phase!=='combat')break;
  }
}
function queueAttack(g,a){
  const b=g.boss,warning=a.id==='laser'?1.05:['rain','mortar'].includes(a.id)?.85:a.id==='gun'?.24:.38;
  const t={...a,x:b.x,y:b.y,angle:angleTo(b,g.player),time:warning,total:warning,target:{x:g.player.x,y:g.player.y}};
  if(a.id==='rain'){const n=6+a.count,gap=Math.floor(g.random()*n);t.lanes=Array.from({length:n},(_,i)=>60+i*(WIDTH-120)/(n-1)).filter((_,i)=>i!==gap);}
  g.telegraphs.push(t);
  const intervals={gun:.82,spread:2.4,ring:3.2,missile:3.7,laser:4.9,mines:4.2,spiral:4.8,rain:4.3,cross:3.8,mortar:4.4,boomerang:3.4,pulse:4.1},roundPressure=1+Math.min(.9,(g.round-1)*.065),frenzy=b.enrage&&b.hp<b.maxHp*.5?1.2:1;
  a.timer=intervals[a.id]/(b.fireRate*a.rate*roundPressure*frenzy);emit(g,'warning',{attack:a.id});
}
function fireAttack(g,t){
  const b=g.boss,x=b.x,y=b.y,prediction={x:g.player.x+g.player.vx*b.lead,y:g.player.y+g.player.vy*b.lead},ang=t.id==='gun'||t.id==='spread'?angleTo(b,prediction):t.angle,speed=340*b.bulletSpeed*(t.speed??1),dmg=b.damage*(t.damage??1);
  function fan(n,step,base=ang,kind='enemy',delay=0){const muzzle=Math.min(49,distance(b,g.player)*.45);for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*step;addBullet(g,'boss',x+Math.cos(a)*muzzle,y+Math.sin(a)*muzzle,a,speed,dmg,kind,{bounces:b.bounces,split:kind==='enemy'&&!!b.split,delay});}}
  if(t.id==='gun'){for(let j=0;j<b.burst;j++)fan(1+b.extra,.1,ang,'enemy',j*.16);}
  if(t.id==='spread')fan(5+b.extra+t.count,.16,ang,'spread');
  if(t.id==='ring'){const n=12+t.count,offset=g.time*.45;for(let i=0;i<n;i++){const a=offset+i/n*TAU;addBullet(g,'boss',x+Math.cos(a)*49,y+Math.sin(a)*49,a,speed*.8,dmg,'ring',{bounces:b.bounces,radius:5.5+t.width});}}
  if(t.id==='missile'){for(let i=0;i<t.barrels;i++)addBullet(g,'boss',x,y,ang+(i-(t.barrels-1)/2)*.16,240*b.bulletSpeed,dmg*1.3,'missile',{radius:8,homingTime:2+t.tracking,delay:i*.4});}
  if(t.id==='laser'){for(let i=0;i<t.barrels;i++)g.beams.push({angle:ang+(i-(t.barrels-1)/2)*.28,life:1.4+t.duration,age:0,sweep:Math.sin(g.time)>0?.28:-.28,width:12+t.width,damage:dmg*1.5});}
  if(t.id==='mines'){for(let i=0;i<2+t.count;i++){const a=ang+i/(2+t.count)*TAU;g.mines.push({x:clamp(t.target.x+Math.cos(a)*140,80,WIDTH-80),y:clamp(t.target.y+Math.sin(a)*140,80,HEIGHT-80),age:0,life:3.2,damage:dmg,shards:8+t.width});}}
  if(t.id==='spiral')g.emitters.push({angle:ang,timer:0,life:2.1+t.duration,arms:1+t.count,speed:speed*.8,damage:dmg});
  if(t.id==='rain'){for(const lane of t.lanes)for(let j=0;j<1+t.duration;j++)addBullet(g,'boss',lane,28,Math.PI/2,speed*.82,dmg,'rain',{delay:j*.28,bounces:b.bounces});}
  if(t.id==='cross'){for(let j=0;j<3+t.count;j++)for(let i=0;i<4;i++)addBullet(g,'boss',x,y,ang+i/4*TAU+j*(.18+t.spin),speed*.85,dmg,'cross',{delay:j*.24,bounces:b.bounces});}
  if(t.id==='mortar'){for(let i=0;i<1+t.duration;i++)addBullet(g,'boss',x,y,ang+(i-t.duration/2)*.18,260*b.bulletSpeed,dmg,'mortar',{radius:10,fuse:Math.max(.35,distance(b,t.target)/(260*b.bulletSpeed)),shards:8+t.count,life:4});}
  if(t.id==='boomerang'){for(let i=0;i<3+t.count;i++)addBullet(g,'boss',x,y,ang+(i-(2+t.count)/2)*.22,speed,dmg,'boomerang',{radius:7+t.width,returnAt:.95,life:3.4});}
  if(t.id==='pulse'){const n=10+t.count;for(let j=0;j<2+t.duration;j++)for(let i=0;i<n;i++)addBullet(g,'boss',x,y,ang+i/n*TAU+j*Math.PI/n,speed*.65,dmg,'pulse',{delay:j*.45,bounces:b.bounces});}
  if(t.id==='dash'){b.dashVX=Math.cos(ang)*600;b.dashVY=Math.sin(ang)*600;b.dashTime=.4;}
  if(t.id==='teleport'){b.x=t.target.x;b.y=t.target.y;b.vx=b.vy=0;emit(g,'blink',{x:b.x,y:b.y});}
  emit(g,'boss_shoot',{attack:t.id,x,y});
}
function segmentDistance(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy,t=len?clamp(((px-ax)*dx+(py-ay)*dy)/len,0,1):0;return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));}
function movePlayer(g,dt,input){
  const p=g.player;p.thrusting=!!input.thrust;p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);p.leechTimer=Math.max(0,p.leechTimer-dt);const side=(input.right?1:0)-(input.left?1:0);p.vx+=(side*p.speed-p.vx)*Math.min(1,dt*17);
  p.dashCooldown=Math.max(0,p.dashCooldown-dt);p.dashTime=Math.max(0,p.dashTime-dt);
  if(input.dash&&p.dashUnlocked&&p.dashCooldown<=0){p.dashCooldown=p.dashRecharge;p.dashTime=p.dashLength;p.dashDirection=side||(Math.cos(angleTo(p,g.aim))>=0?1:-1);p.invulnerable=Math.max(p.invulnerable,p.dashLength+.06);emit(g,'dash',{x:p.x,y:p.y});}
  if(p.dashTime>0){p.vx=p.dashDirection*850;p.vy*=.85;}else p.vy=clamp(p.vy+(input.thrust?-840*p.thrust:920*p.gravity)*dt,-340*p.climb,390);
  p.x=clamp(p.x+p.vx*dt,32,WIDTH-32);p.y=clamp(p.y+p.vy*dt,32,HEIGHT-34);
  if(p.y<=32||p.y>=HEIGHT-34)p.vy=0;
  p.invulnerable=Math.max(0,p.invulnerable-dt);p.flash=Math.max(0,p.flash-dt);
}
function moveBoss(g,dt){
  const b=g.boss;b.flash=Math.max(0,b.flash-dt);b.moveTimer-=dt;b.teleportTimer-=dt;
  if(b.teleport&&b.teleportTimer<=0){const a=g.random()*TAU;g.telegraphs.push({id:'teleport',level:1,x:b.x,y:b.y,time:.9,total:.9,target:{x:clamp(g.player.x+Math.cos(a)*230,100,WIDTH-100),y:clamp(g.player.y+Math.sin(a)*230,100,HEIGHT-100)}});b.teleportTimer=6;emit(g,'warning',{attack:'teleport'});}
  const target={x:clamp(g.player.x+Math.cos(g.time*.7)*160,100,WIDTH-100),y:clamp(g.player.y+Math.sin(g.time*.55)*130,100,HEIGHT-100)};
  if(b.dashTime>0){b.dashTime-=dt;b.vx=b.dashVX;b.vy=b.dashVY;}
  else{
    const dx=target.x-b.x,dy=target.y-b.y,len=Math.hypot(dx,dy),speed=Math.min(b.speed,len*2.5);
    const vx=len>1?dx/len*speed:0,vy=len>1?dy/len*speed:0;b.vx+=(vx-b.vx)*Math.min(1,dt*3.5);b.vy+=(vy-b.vy)*Math.min(1,dt*3.5);
    if(b.dash&&b.moveTimer<0){g.telegraphs.push({id:'dash',level:1,x:b.x,y:b.y,angle:angleTo(b,g.player),time:.6,total:.6,target:{x:g.player.x,y:g.player.y}});b.moveTimer=4.5;emit(g,'warning',{attack:'dash'});}
  }
  b.x=clamp(b.x+b.vx*dt,70,WIDTH-70);b.y=clamp(b.y+b.vy*dt,70,HEIGHT-70);
}
function updateProjectiles(g,dt){
  const spawned=[];
  const openCrystal=q=>{if(q.opened)return;q.opened=true;q.life=0;const base=Math.atan2(q.vy,q.vx);for(let i=0;i<q.shards;i++){const a=base+(i-(q.shards-1)/2)*.105,s=780;spawned.push({owner:'player',kind:'crystal',x:q.x,y:q.y,px:q.x,py:q.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,speed:s,damage:q.shardDamage,radius:3,life:1.5,age:0,delay:0,bounces:0});}emit(g,'split',{x:q.x,y:q.y,owner:'player'});};
  const explodeGrenade=q=>{if(q.exploded)return;q.exploded=true;q.life=0;if(distance(q,g.boss)<q.blast+g.boss.size*.47)hurtBoss(g,q.damage,q.x,q.y);emit(g,'explosion',{x:q.x,y:q.y,owner:'player',radius:q.blast});};
  const plantField=q=>{if(q.planted)return;q.planted=true;q.life=0;g.fields.push({x:clamp(q.x,25,WIDTH-25),y:clamp(q.y,25,HEIGHT-25),radius:q.blast,life:2.4,total:2.4,timer:0,damage:q.damage});if(g.fields.length>24)g.fields.shift();emit(g,'field',{x:q.x,y:q.y});};
  for(const q of g.projectiles){
    if(q.delay>0){q.delay-=dt;continue;}
    q.px=q.x;q.py=q.y;q.life-=dt;q.age+=dt;
    if((q.kind==='missile'||q.kind==='seeker')&&q.age<q.homingTime){const target=q.owner==='player'?g.boss:g.player,desired=angleTo(q,target),a=Math.atan2(q.vy,q.vx),turn=q.turn??1.45,next=a+clamp(wrapAngle(desired-a),-dt*turn,dt*turn);q.vx=Math.cos(next)*q.speed;q.vy=Math.sin(next)*q.speed;}
    if(q.kind==='boomerang'&&q.age>=q.returnAt){q.returning=true;const target=q.owner==='player'?g.player:g.boss,a=angleTo(q,target);q.vx=Math.cos(a)*q.speed;q.vy=Math.sin(a)*q.speed;if(distance(q,target)<20)q.life=0;}
    if(q.gravity)q.vy+=q.gravity*dt;
    if(q.owner==='boss')for(const field of g.fields){const d=distance(q,field);if(d<field.radius&&d>8){q.vx+=(field.x-q.x)/d*240*dt;q.vy+=(field.y-q.y)/d*240*dt;}}
    q.x+=q.vx*dt;q.y+=q.vy*dt;
    if(q.bounces>0&&(q.x<20||q.x>WIDTH-20||q.y<20||q.y>HEIGHT-20)){
      if(q.x<20||q.x>WIDTH-20){q.vx*=-1;q.x=clamp(q.x,20,WIDTH-20);}if(q.y<20||q.y>HEIGHT-20){q.vy*=-1;q.y=clamp(q.y,20,HEIGHT-20);}q.bounces--;emit(g,'bounce',{x:q.x,y:q.y});
    }
    if(q.split&&q.age>1.15){q.life=0;const a=Math.atan2(q.vy,q.vx);for(const da of[-.28,0,.28])spawned.push({owner:'boss',x:q.x,y:q.y,px:q.x,py:q.y,vx:Math.cos(a+da)*q.speed,vy:Math.sin(a+da)*q.speed,speed:q.speed,damage:q.damage,kind:'split',radius:4,life:4,age:0,bounces:0,split:false,delay:0});emit(g,'split',{x:q.x,y:q.y});}
    if(q.kind==='mortar'&&q.age>=q.fuse&&!q.exploded){q.exploded=true;q.life=0;for(let i=0;i<q.shards;i++){const a=i/q.shards*TAU,s=230*g.boss.bulletSpeed;spawned.push({owner:'boss',x:q.x,y:q.y,px:q.x,py:q.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,speed:s,damage:q.damage,kind:'shrapnel',radius:4+g.boss.bulletSize,life:4+g.boss.bulletLife,age:0,bounces:g.boss.bounces,split:false,delay:0});}emit(g,'explosion',{x:q.x,y:q.y,owner:'boss'});}
    if(q.kind==='shard'&&q.age>=q.openAt)openCrystal(q);
    if(q.kind==='grenade'&&q.age>=q.fuse)explodeGrenade(q);
    if(q.kind==='gravity'&&q.age>=q.fuse)plantField(q);
    if(g.phase!=='combat')break;
    if(q.x<-40||q.x>WIDTH+40||q.y<-40||q.y>HEIGHT+40)q.life=0;
    if(q.life<=0)continue;
    if(q.owner==='player'){
      const b=g.boss,r=b.size*.47+q.radius;
      if(segmentDistance(b.x,b.y,q.px,q.py,q.x,q.y)<r&&(!['boomerang','disc'].includes(q.kind)||q.age-q.lastHit>.4)){
        if(q.kind==='grenade'){explodeGrenade(q);if(g.phase!=='combat')break;continue;}
        if(q.kind==='gravity'){plantField(q);continue;}
        if(q.kind==='boomerang'||q.kind==='disc')q.lastHit=q.age;else q.life=0;hurtBoss(g,q.damage*(q.returning?(q.returnDamage??1):1),q.x,q.y);
        if(g.phase==='combat'){
          if(q.kind==='shard')openCrystal(q);
          if(q.kind==='flame'){b.burnTime=2;b.burnDamage=Math.max(b.burnDamage,q.statusDamage);}
          if(q.kind==='poison'){b.poisonTime=3;b.poisonDamage=Math.max(b.poisonDamage,q.statusDamage);}
          if(q.kind==='storm'){g.strikes.push({time:.3,damage:q.lightning});if(g.strikes.length>40)g.strikes.shift();emit(g,'storm_warning',{x:b.x,y:b.y});}
        }
        if(q.kind==='plasma'){if(g.phase==='combat'){for(const enemy of g.projectiles)if(enemy.owner==='boss'&&distance(q,enemy)<q.blast)enemy.life=0;hurtBoss(g,q.damage*.5,q.x,q.y);}emit(g,'explosion',{x:q.x,y:q.y,owner:'player',radius:q.blast});}
        if(q.kind==='rocket')emit(g,'explosion',{x:q.x,y:q.y,level:q.level,owner:'player'});
      }
    }else if(segmentDistance(g.player.x,g.player.y,q.px,q.py,q.x,q.y)<10+q.radius){q.life=0;hurtPlayer(g,q.damage,q.x,q.y);}
    if(g.phase!=='combat')break;
  }
  if(g.phase==='combat')g.projectiles=g.projectiles.filter(q=>q.life>0).concat(spawned).slice(-650);
}
export function updateGame(g,dt,input={}){
  g.events=[];dt=clamp(dt,0,.035);
  if(Number.isFinite(input.aimX)&&Number.isFinite(input.aimY))g.aim={x:input.aimX,y:input.aimY};
  if(g.phase==='countdown'){g.countdown-=dt;if(g.countdown<=0){g.phase='combat';emit(g,'combat_start');}return;}
  if(g.phase!=='combat')return;
  g.time+=dt;movePlayer(g,dt,input);moveBoss(g,dt);playerFire(g,dt);if(g.phase!=='combat')return;
  g.arcs=g.arcs.filter(a=>(a.life-=dt)>0);
  g.traces=g.traces.filter(t=>(t.life-=dt)>0);
  const boss=g.boss;boss.statusTick=(boss.statusTick??0)-dt;
  if(boss.statusTick<=0){boss.statusTick=.25;const damage=(boss.burnTime>0?boss.burnDamage:0)+(boss.poisonTime>0?boss.poisonDamage:0);if(damage>0)hurtBoss(g,damage*.25,boss.x,boss.y);}
  boss.burnTime=Math.max(0,boss.burnTime-dt);boss.poisonTime=Math.max(0,boss.poisonTime-dt);if(!boss.burnTime)boss.burnDamage=0;if(!boss.poisonTime)boss.poisonDamage=0;
  if(g.phase!=='combat')return;
  for(const field of [...g.fields]){field.life-=dt;field.timer-=dt;if(field.timer<=0){field.timer=.3;if(distance(field,boss)<field.radius+boss.size*.4)hurtBoss(g,field.damage,field.x,field.y);}if(g.phase!=='combat')return;}
  g.fields=g.fields.filter(f=>f.life>0);
  for(const strike of [...g.strikes]){strike.time-=dt;if(strike.time<=0){g.traces.push({x:boss.x,y:20,ex:boss.x,ey:boss.y,life:.22,total:.22,kind:'lightning'});hurtBoss(g,strike.damage,boss.x,boss.y);emit(g,'lightning',{x:boss.x,y:boss.y});}if(g.phase!=='combat')return;}
  g.strikes=g.strikes.filter(s=>s.time>0);
  for(const a of g.boss.attackList){a.timer-=dt;if(a.timer<=0)queueAttack(g,a);}
  for(const t of g.telegraphs){t.time-=dt;t.x=g.boss.x;t.y=g.boss.y;if(t.id==='gun'||t.id==='spread')t.angle=angleTo(g.boss,g.player);if(t.time<=0)fireAttack(g,t);}
  g.telegraphs=g.telegraphs.filter(t=>t.time>0);
  for(const beam of g.beams){beam.age+=dt;beam.life-=dt;beam.angle+=beam.sweep*dt;const b=g.boss,dx=Math.cos(beam.angle),dy=Math.sin(beam.angle),projection=(g.player.x-b.x)*dx+(g.player.y-b.y)*dy,cross=Math.abs((g.player.x-b.x)*dy-(g.player.y-b.y)*dx);if(projection>45&&cross<beam.width/2+9)hurtPlayer(g,beam.damage,g.player.x,g.player.y);}
  g.beams=g.beams.filter(beam=>beam.life>0);
  for(const m of g.mines){m.age+=dt;m.life-=dt;if(m.age>1&&distance(m,g.player)<23)hurtPlayer(g,m.damage,m.x,m.y);if(m.life<=0){const n=m.shards??8;for(let i=0;i<n;i++)addBullet(g,'boss',m.x,m.y,i/n*TAU,190*g.boss.bulletSpeed,m.damage,'mine',{radius:5});emit(g,'explosion',{x:m.x,y:m.y,owner:'boss'});}}
  g.mines=g.mines.filter(m=>m.life>0);
  for(const s of g.emitters){s.life-=dt;s.timer-=dt;s.angle+=dt*2.4;if(s.timer<=0){s.timer=.13;for(let i=0;i<s.arms;i++)addBullet(g,'boss',g.boss.x,g.boss.y,s.angle+i/s.arms*TAU,s.speed,s.damage,'spiral',{bounces:g.boss.bounces,radius:4.5});}}
  g.emitters=g.emitters.filter(s=>s.life>0);
  if(g.phase==='combat')updateProjectiles(g,dt);
}
export function snapshot(g){return{phase:g.phase,round:g.round,rerolls:g.rerolls,upgradeTypes:UPGRADE_COUNTS,player:{health:Math.ceil(g.player.hp),maximumHealth:g.player.maxHp,weapons:g.player.weaponList.map(w=>({name:WEAPON_NAMES[w.id],level:w.level})),upgrades:g.history.filter(h=>h.side==='player').map(h=>h.title)},boss:{health:Math.ceil(g.boss.hp),maximumHealth:g.boss.maxHp,nextRoundHealth:nextBossHealth(g),attacks:g.boss.attackList.map(a=>({name:ATTACK_NAMES[a.id],level:a.level})),upgrades:g.history.filter(h=>h.side==='boss').map(h=>h.title)},choices:g.choices.map((u,i)=>({index:i,id:u.id,name:u.title,description:u.description,...upgradeDetails(g,u,g.phase==='upgrade_player'?'player':'boss')})),roundsCleared:g.kills};}
