export const DIFFICULTIES={
 easy:{name:'Easy',health:.9,speed:.9,crumbs:1,starting:1,description:'A gentler campaign: dogs have 10% less health and move 10% slower. Full breadcrumbs.'},
 normal:{name:'Normal',health:1.2,speed:1,crumbs:.8,starting:.9,description:'Dogs have 20% more health and their usual speed. 10% fewer starting crumbs and 20% less passive income, wave rewards and dog rewards.'},
 hard:{name:'Hard',health:1.6,speed:1.2,crumbs:.65,starting:.75,description:'Dogs have 60% more health and move 20% faster. 25% fewer starting crumbs and 35% less passive income, wave rewards and dog rewards.'}
};
export const ORIGINAL_BALANCE={name:'Original',health:1,speed:1,crumbs:1,starting:1};
export function balanceFor(game){return game.mode==='campaign'?(DIFFICULTIES[game.difficulty]||ORIGINAL_BALANCE):ORIGINAL_BALANCE;}
export function difficultyName(game){return balanceFor(game).name;}
export function chooseDifficulty(value){return Object.hasOwn(DIFFICULTIES,value)?value:'normal';}
