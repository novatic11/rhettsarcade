// Entity definitions are data-driven. A new type can reuse a behaviour role or
// provide update(game, entity, dt, senses) and return true to handle its own AI.
export const ENTITY_TYPES={
 wanderer:{role:'wanderer',vision:24,hearing:.65,walk:1.45,pursuit:4.6,damage:26,range:1.15,weight:1,biomes:[0,1,2,3,6,7]},
 listener:{role:'listener',vision:7,hearing:1.45,walk:1.5,pursuit:4.7,damage:30,range:1.2,weight:.8,biomes:[1,5,7]},
 watcher:{role:'watcher',vision:38,hearing:0,walk:1.25,pursuit:2.5,damage:12,range:3,weight:.18,biomes:[0,3,4,6,8]},
 stalker:{role:'stalker',vision:32,hearing:.8,walk:2.3,pursuit:4.8,damage:24,range:1.15,weight:.065,biomes:[2,3,4,6,7,8]}
};
