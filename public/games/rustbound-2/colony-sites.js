import {HOME_BODY,HOME_MOON} from './universe.js';
export const STARTER_BASES=Object.freeze([HOME_BODY,HOME_MOON]);

// Older saves received identical free buildings on every world. Remove only
// untouched generated colonies. Built colonies, stocked machines and work in
// progress remain intact; this never deletes player construction or cargo.
export function keepLegacyColony(raw,body,buildings){
 if(!Array.isArray(buildings)||STARTER_BASES.includes(body)||raw.starterBasePolicy===1)return buildings;
 const defaults={science:[-16,12],warehouse:[-19,-15],hangar:[23,-20],solar:[-25,15]};
 const generated=b=>b&&defaults[b.type]&&b.id===body+'-'+b.type&&b.x===defaults[b.type][0]&&b.z===defaults[b.type][1]&&!b.paid;
 const states=Object.values(raw.industry?.states?.[body]||{});
 const active=buildings.some(b=>!generated(b))||states.some(s=>s&&(s.produced>0||s.enabled===false||['input','output','stock'].some(k=>Object.values(s[k]||{}).some(v=>Number(v)>0))))||Object.values(raw.bases?.[body]?.ore||{}).some(v=>Number(v)>0)||raw.processing?.body===body||raw.progress?.flags?.some(f=>f.body===body);
 return active?buildings:buildings.filter(b=>!generated(b));
}
