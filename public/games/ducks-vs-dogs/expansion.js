export const NEW_DUCKS={
 pebble:{name:'Pebblebill',cost:175,hp:125,recharge:9,rate:3.2,damage:48,lob:true,radius:.85,blastRows:0,description:'Lobs a pebble into a group. Splash ignores armor and hits burrowed dogs.',color:'#b1afa1'},
 snow:{name:'Snowdrift',cost:225,hp:120,recharge:10,rate:2.1,damage:8,fan:true,cold:true,description:'A chilly fan of shots slows dogs across three lanes.',color:'#c4dbdc'},
 pepper:{name:'Pepperbeak',cost:225,hp:130,recharge:10,rate:2.7,damage:24,pierce:2,burn:5,description:'A hot jet pierces two dogs and leaves both burning.',color:'#c8917c'},
 rapid:{name:'Dart Duck',cost:150,hp:100,recharge:6,rate:.48,damage:9,description:'Rapid, light water darts catch fast pups. Buckets resist them.',color:'#93b7bf'},
 warden:{name:'Ironwing',cost:200,hp:1300,recharge:18,armor:.65,thorns:6,description:'An armored blocker takes 35% less damage and reflects a little back.',color:'#9baaad'},
 tempo:{name:'Tempo Teal',cost:175,hp:150,recharge:12,tempo:.2,description:'Nearby ducks attack 20% faster. Only the strongest tempo applies.',color:'#b4a7c3'},
 orchard:{name:'Orchard Duck',cost:125,hp:140,recharge:10,produce:14,harvest:50,description:'Bakes a basket of 50 crumbs every 14 seconds. A long-term investment.',color:'#b4bd8e'},
 mender:{name:'Moss Mender',cost:200,hp:170,recharge:12,heal:9,healAll:true,description:'Heals every injured duck within one lane and two squares, every 4 seconds.',color:'#93b9a3'},
 anchor:{name:'Anchorbill',cost:175,hp:160,recharge:9,rate:2.2,damage:24,root:.8,description:'Anchor shots stop a dog walking for 0.8s. Bosses resist the anchor.',color:'#91a4bc'},
 lantern:{name:'Lantern Duck',cost:100,hp:180,recharge:10,reveal:true,description:'Forces nearby Diggers to surface within one lane and 2.5 squares.',color:'#d4c596'},
 toll:{name:'Toll Teal',cost:150,hp:180,recharge:12,waveBonus:20,description:'Survive a wave for 20 extra crumbs. Only the best toll is paid.',color:'#bea880'},
 fencer:{name:'Reed Duelist',cost:175,hp:350,recharge:10,rate:.9,damage:55,melee:1.25,description:'Strikes one dog at close range. Place near the front and keep it healed.',color:'#a5baa3'},
 lookout:{name:'Lookout Duck',cost:175,hp:150,recharge:8,rate:2.2,damage:25,backward:true,description:'Fires forward and backward in its lane to catch dogs that slip past.',color:'#9badbc'},
 volley:{name:'Volley Mallard',cost:250,hp:145,recharge:12,rate:2,damage:11,fan:true,pellets:2,description:'Six shots per volley: two down each of three lanes.',color:'#b1b5cb'},
 comet:{name:'Comet Duck',cost:275,hp:120,recharge:14,rate:4,damage:45,lob:true,radius:.95,blastRows:1,description:'A slow comet splashes a small area across three lanes. Dogs can walk out of it.',color:'#baa3c6'},
 marshal:{name:'Pond Marshal',cost:300,hp:550,recharge:15,rate:1.8,damage:22,tempo:.15,description:'A sturdy front-line shooter that speeds nearby attacks by 15%. Tempo never stacks.',color:'#8eaaa9'}
};
const w=spec=>spec.map(([at,lane,type='mutt'])=>({at,lane,type}));
const level=(name,story,stage,crumbs,duck,row,col,text,waves)=>({name,story,stage,crumbs,rows:[0,1,2,3,4],steps:[{duck,row,col,text}],waves:waves.map(w)});
// These encounters are deliberately authored. Introductions give room to try the
// recruit; later waves pair its specialty with a threat that needs another duck.
export const NEW_LEVELS={
 pebble:level('Pebbles on the towpath','The pack is walking nose to tail along the canal. Pebblebill has a pocket full of smooth stones.',1,625,'pebble',2,2,'Place Pebblebill in lane 3. Its pebble lands where it aimed; cluster damage ignores shields and reaches underground dogs.',[
  [[6,2],[8,2],[21,0],[29,4],[37,1],[42,3]],
  [[5,2,'shield'],[7,2,'helmet'],[17,1,'burrower'],[24,3,'burrower'],[34,0,'runner'],[40,4,'runner']],
  [[5,1,'kennel'],[9,1,'helmet'],[17,3,'kennel'],[21,3,'helmet'],[31,2,'drummer'],[40,0,'scout'],[44,4,'scout']],
  [[5,2,'mastiff'],[8,2,'shield'],[18,0,'hopper'],[25,4,'hopper'],[34,1,'spitter'],[41,3,'spitter']]
 ]),
 snow:level('A cold front','The canal has frozen at the edges. Snowdrift keeps several paths slippery while your shooters do the heavy work.',1,650,'snow',2,2,'Place Snowdrift in lane 3 to chill lanes 2, 3 and 4. Frost stops Fence Hoppers from jumping; add stronger damage behind it.',[
  [[6,1],[9,2],[12,3],[25,0],[33,4]],
  [[5,1,'hopper'],[8,2,'sprinter'],[11,3,'hopper'],[24,0,'runner'],[30,4,'runner']],
  [[5,0,'sprinter'],[9,4,'sprinter'],[18,1,'howler'],[21,2,'hopper'],[24,3,'hopper'],[37,2,'shield']],
  [[5,1,'mastiff'],[10,3,'mastiff'],[20,2,'sprinter'],[28,0,'hopper'],[34,4,'hopper'],[43,2,'cleaner']]
 ]),
 pepper:level('The pepper patch','Two beagles can share a jet, but not an umbrella. Pepperbeak brings heat to the narrow paths.',1,650,'pepper',2,2,'Place Pepperbeak in lane 3. Its jet hits two dogs in a line and burns both. Washdogs can put out the flames.',[
  [[6,2,'helmet'],[9,2,'helmet'],[22,0],[30,4],[39,1],[44,3]],
  [[5,1,'shield'],[8,1,'helmet'],[17,3,'shield'],[20,3,'helmet'],[32,0,'scout'],[39,4,'scout']],
  [[5,2,'mastiff'],[9,2,'poodle'],[21,0,'helmet'],[27,4,'helmet'],[36,1,'runner'],[42,3,'runner']],
  [[5,1,'shield'],[9,1,'cleaner'],[18,3,'shield'],[22,3,'cleaner'],[34,2,'mastiff'],[43,0,'hopper'],[48,4,'hopper']]
 ]),
 rapid:level('Paws at a sprint','A whippet race has taken a wrong turn. Dart Duck trades a big splash for a steady stream of little darts.',0,625,'rapid',2,2,'Place Dart Duck in lane 3. Small, frequent shots catch fast pups; pair it with armor-piercing ducks against buckets.',[
  [[6,2,'scout'],[14,0],[21,4],[28,1,'scout'],[35,3,'scout']],
  [[5,0,'runner'],[12,4,'runner'],[20,2,'sprinter'],[29,1,'scout'],[33,3,'scout'],[40,2,'scout']],
  [[5,1,'kennel'],[13,3,'kennel'],[24,0,'sprinter'],[30,4,'sprinter'],[38,2,'drummer']],
  [[5,2,'helmet'],[12,1,'sprinter'],[19,3,'sprinter'],[28,0,'runner'],[33,4,'runner'],[42,2,'kennel']]
 ]),
 warden:level('The iron gate','The bite-happy dogs have reached the old lock gate. Ironwing stands firm, but a shield still needs a firing line.',2,700,'warden',2,5,'Place Ironwing in lane 3. Its armor reduces bites and spit by 35%; its small thorns reward holding a dog in place.',[
  [[6,2],[16,0],[24,4],[33,1],[40,3]],
  [[5,2,'leech'],[15,1,'mastiff'],[24,3,'mastiff'],[35,0,'thief'],[41,4,'thief']],
  [[5,1,'drummer'],[8,1,'leech'],[17,3,'leech'],[20,3,'drummer'],[31,2,'spitter'],[41,0,'hopper'],[46,4,'hopper']],
  [[5,2,'boss'],[18,0,'shield'],[25,4,'shield'],[33,1,'spitter'],[40,3,'spitter'],[48,2,'poodle']]
 ]),
 tempo:level('Keep the beat','A duck with a metronome insists that the pond needs better rhythm. The dog band has opinions of its own.',1,675,'tempo',2,1,'Place Tempo Teal near your shooting line. It speeds attacks within one lane and two squares by 20%. Tempo bonuses do not stack.',[
  [[7,2],[15,1],[22,3],[32,0],[39,4]],
  [[5,2,'drummer'],[8,1,'shield'],[11,3,'shield'],[25,0,'runner'],[32,4,'runner']],
  [[5,1,'mastiff'],[11,3,'mastiff'],[19,2,'howler'],[28,0,'hopper'],[35,4,'hopper'],[44,2,'poodle']],
  [[5,0,'helmet'],[10,4,'helmet'],[19,1,'kennel'],[25,3,'kennel'],[36,2,'drummer'],[44,2,'boss']]
 ]),
 orchard:level('The orchard shift','A patient gardener can feed a whole flock. Keep the new bakery safe long enough to collect its first basket.',0,650,'orchard',2,0,'Place Orchard Duck at the back of lane 3. It makes 50 crumbs every 14 seconds; protect that investment while it bakes.',[
  [[8,2],[18,0],[26,4],[35,1],[43,3]],
  [[5,0,'thief'],[13,4,'thief'],[22,1,'runner'],[30,3,'runner'],[40,2,'helmet']],
  [[5,2,'kennel'],[15,0,'leech'],[23,4,'leech'],[32,1,'spitter'],[40,3,'spitter']],
  [[5,1,'mastiff'],[13,3,'mastiff'],[25,0,'thief'],[31,4,'thief'],[40,2,'howler'],[46,2,'shield']]
 ]),
 mender:level('A little green medicine','Several lanes need care at once. Moss Mender can share the medicine, provided the ducks stay close enough.',2,700,'mender',2,3,'Place Moss Mender in lane 3. Every four seconds it heals all injured ducks within one lane and two squares, including itself.',[
  [[7,2],[16,1],[24,3],[34,0],[42,4]],
  [[5,1,'spitter'],[12,3,'spitter'],[22,2,'leech'],[32,0,'helmet'],[39,4,'helmet']],
  [[5,0,'spitter'],[12,4,'spitter'],[21,1,'drummer'],[24,2,'mastiff'],[27,3,'drummer'],[41,2,'poodle']],
  [[5,1,'boss'],[18,3,'mastiff'],[29,0,'burrower'],[35,4,'burrower'],[43,2,'spitter']]
 ]),
 anchor:level('Anchors away','The whippets think the long bridge is a racetrack. Anchorbill has other plans for their feet.',1,675,'anchor',2,2,'Place Anchorbill in lane 3. Its shots briefly stop walking, but do not stop biting. Big Bark shakes off the anchor sooner.',[
  [[7,2,'runner'],[17,0],[25,4],[34,1],[41,3]],
  [[5,2,'sprinter'],[14,1,'sprinter'],[22,3,'sprinter'],[32,0,'scout'],[38,4,'scout']],
  [[5,0,'hopper'],[12,4,'hopper'],[22,2,'howler'],[26,1,'sprinter'],[30,3,'sprinter'],[42,2,'shield']],
  [[5,2,'boss'],[19,0,'sprinter'],[26,4,'sprinter'],[34,1,'cleaner'],[41,3,'cleaner'],[48,2,'mastiff']]
 ]),
 lantern:level('Lights under the lawn','The ground keeps moving after sunset. Lantern Duck lights up the tunnels before the dogs reach your front line.',2,700,'lantern',2,4,'Place Lantern Duck in lane 3. Diggers surface within one lane and 2.5 squares, where your water shots can reach them.',[
  [[8,2,'burrower'],[18,1],[26,3],[35,0],[43,4]],
  [[5,1,'burrower'],[13,3,'burrower'],[23,0,'runner'],[30,4,'runner'],[40,2,'burrower']],
  [[5,0,'burrower'],[12,4,'burrower'],[22,2,'shield'],[26,1,'spitter'],[31,3,'spitter'],[43,2,'cleaner']],
  [[5,2,'boss'],[17,1,'burrower'],[23,3,'burrower'],[32,0,'burrower'],[38,4,'burrower'],[47,2,'poodle']]
 ]),
 toll:level('The crumb crossing','The flock is reopening the little toll bridge. Toll Teal pays a bonus only if it survives the entire wave.',0,700,'toll',2,0,'Place Toll Teal at the back of lane 3. It adds 20 crumbs at each wave clear. Multiple toll ducks pay only the highest bonus.',[
  [[8,2],[18,0],[26,4],[35,1],[43,3]],
  [[5,1,'thief'],[13,3,'thief'],[23,0,'switcher'],[30,4,'switcher'],[40,2,'helmet']],
  [[5,2,'kennel'],[14,1,'leech'],[22,3,'leech'],[32,0,'thief'],[39,4,'thief']],
  [[5,0,'mastiff'],[13,4,'mastiff'],[24,2,'drummer'],[29,1,'switcher'],[35,3,'switcher'],[46,2,'boss']]
 ]),
 fencer:level('Reeds at dawn','The path is too narrow for polite distance. Reed Duelist holds a short reach and a very sharp reed.',1,725,'fencer',2,5,'Place Reed Duelist near the front of lane 3. It strikes one nearby dog; keep a healer and ranged ducks behind it.',[
  [[8,2],[18,0],[26,4],[35,1],[43,3]],
  [[5,2,'helmet'],[14,1,'leech'],[22,3,'leech'],[32,0,'scout'],[39,4,'scout']],
  [[5,1,'shield'],[13,3,'shield'],[24,2,'mastiff'],[34,0,'spitter'],[41,4,'spitter']],
  [[5,2,'boss'],[18,0,'hopper'],[25,4,'hopper'],[34,1,'drummer'],[39,3,'helmet'],[47,2,'poodle']]
 ]),
 lookout:level('Watch your tail','The foxhounds are changing lanes and hoppers are jumping the queue. Lookout Duck never turns its back on a problem.',2,725,'lookout',2,3,'Place Lookout Duck in lane 3. It shoots both forward and backward, catching dogs behind the firing line.',[
  [[7,2,'hopper'],[17,0],[25,4],[34,1],[41,3]],
  [[5,1,'hopper'],[12,3,'hopper'],[22,2,'switcher'],[31,0,'runner'],[38,4,'runner']],
  [[5,0,'switcher'],[12,4,'switcher'],[22,1,'burrower'],[29,3,'burrower'],[40,2,'howler']],
  [[5,2,'mastiff'],[14,0,'hopper'],[21,4,'hopper'],[31,1,'switcher'],[37,3,'switcher'],[46,2,'boss']]
 ]),
 volley:level('Six at a time','Three lanes, two shots each, and one very busy duck. The puppy carriers are arriving in formation.',1,750,'volley',2,2,'Place Volley Mallard in the middle lane. Each attack sends two shots through lanes 2, 3 and 4; armor still reduces their damage.',[
  [[7,1],[10,2],[13,3],[27,0],[35,4]],
  [[5,1,'kennel'],[9,2,'kennel'],[13,3,'kennel'],[28,0,'runner'],[36,4,'runner']],
  [[5,0,'helmet'],[12,4,'helmet'],[22,1,'drummer'],[25,2,'scout'],[28,3,'kennel'],[40,2,'poodle']],
  [[5,1,'mastiff'],[10,3,'mastiff'],[20,2,'howler'],[29,0,'sprinter'],[35,4,'sprinter'],[44,2,'shield']]
 ]),
 comet:level('A sky full of splashes','The dogs have bunched up at the observatory. Comet Duck aims ahead, but fast paws can escape the landing zone.',2,775,'comet',2,2,'Place Comet Duck in lane 3. Its falling comet splashes three lanes, including burrowed dogs. Support it against scattered sprinters.',[
  [[7,1],[9,2],[11,3],[25,0],[33,4]],
  [[5,1,'shield'],[8,2,'drummer'],[11,3,'shield'],[25,0,'sprinter'],[32,4,'sprinter']],
  [[5,2,'kennel'],[8,1,'burrower'],[11,3,'burrower'],[24,0,'spitter'],[31,4,'spitter'],[42,2,'mastiff']],
  [[5,1,'mastiff'],[8,2,'poodle'],[11,3,'mastiff'],[27,0,'sprinter'],[34,4,'sprinter'],[45,2,'boss']]
 ]),
 marshal:level('The last park light','Every path leads back to the pond. The Pond Marshal joins the whole flock for one final stand at the closed gate.',2,850,'marshal',2,4,'Place Pond Marshal near the front of lane 3. Its sturdy body, water shots and 15% attack tempo help anchor a complete defense.',[
  [[7,0],[14,4],[21,1,'switcher'],[29,3,'switcher'],[39,2,'shield']],
  [[5,1,'mastiff'],[9,1,'cleaner'],[19,3,'kennel'],[28,0,'spitter'],[35,4,'spitter'],[45,2,'drummer']],
  [[5,0,'burrower'],[12,4,'burrower'],[21,2,'boss'],[31,1,'sprinter'],[38,3,'sprinter'],[48,2,'poodle']],
  [[5,1,'shield'],[9,2,'howler'],[13,3,'shield'],[25,0,'leech'],[32,4,'leech'],[43,2,'mastiff']],
  [[6,1,'boss'],[17,3,'boss'],[29,0,'switcher'],[35,4,'switcher'],[43,2,'kennel'],[49,2,'poodle'],[56,2,'cleaner']]
 ])
};
