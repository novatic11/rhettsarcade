export const DUCK_KEYS=['1','2','3','4','5','6','7','8','9','0','q','w','e','t','y','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n'];
export const PAGE_SIZE=8;
export function pageFor(deck,type){return Math.max(0,Math.floor(deck.indexOf(type)/PAGE_SIZE));}
