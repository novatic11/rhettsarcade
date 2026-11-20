import {PARTS} from './blueprints.js';
// Resolve a tutorial action on every frame, including nested panels and scroll.
// Coordinates are viewport coordinates, matching fixed-position spotlights.
export function targetRect(target){
 if(target&&Number.isFinite(target.x)&&Number.isFinite(target.y))return {left:target.x-24,top:target.y-24,width:48,height:48};
 const el=typeof target==='string'?document.querySelector(target):target;
 if(!el||el.closest('[hidden]')||getComputedStyle(el).display==='none'||getComputedStyle(el).visibility==='hidden')return null;
 const r=el.getBoundingClientRect();if(!r.width||!r.height)return null;
 let left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);
 for(let parent=el.parentElement;parent;parent=parent.parentElement){const style=getComputedStyle(parent),p=parent.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(style.overflowX)){left=Math.max(left,p.left);right=Math.min(right,p.right);}if(/auto|scroll|hidden|clip/.test(style.overflowY)){top=Math.max(top,p.top);bottom=Math.min(bottom,p.bottom);}}
 return right>left&&bottom>top?{left,top,width:right-left,height:bottom-top}:null;
}
export function followSpotlight(spot,prompt,target){
 const el=typeof target==='string'?document.querySelector(target):null;
 if(el&&spot.followed!==el&&!el.closest('[hidden]')){el.scrollIntoView({block:'nearest',inline:'nearest'});spot.followed=el;}
 const r=targetRect(target);spot.hidden=!r;if(!r)return false;
 const size=Math.min(160,Math.max(64,Math.hypot(r.width,r.height)+18)),x=r.left+r.width/2,y=r.top+r.height/2;
 Object.assign(spot.style,{width:size+'px',height:size+'px',left:x+'px',top:y+'px'});
 // A button within this card (such as venting full tanks) must not make the
 // card chase its own position on successive frames.
 if(el&&prompt.contains(el))return true;
 const width=Math.min(320,innerWidth-24),height=Math.min(prompt.offsetHeight||170,innerHeight-24),gap=size/2+16;
 let left=Math.max(12,Math.min(innerWidth-width-12,x-width/2)),top=y-gap-height;
 if(top<12)top=y+gap;
 if(top+height>innerHeight-12){top=Math.max(12,Math.min(innerHeight-height-12,y-height/2));left=x>innerWidth/2?Math.max(12,x-gap-width):Math.min(innerWidth-width-12,x+gap);}
 Object.assign(prompt.style,{position:'fixed',width:width+'px',left:left+'px',right:'auto',top:top+'px',maxHeight:(innerHeight-24)+'px',overflowY:'auto'});
 return true;
}

// Small actions prevent the old guide from pointing at a closed toolbar button
// for an entire multi-click operation. The player still makes every connection.
export function buildTutorialAction(type,view){
 if(view.placing)return {target:view.pointer||'#placement-cancel',text:'Move the green building preview onto clear ground, then click to place it. Red means that spot is blocked. Right-drag to change your view.'};
 if(!view.buildOpen)return {target:'#build-toggle',text:'Open Build to choose your next building.'};
 if(!view.cardVisible)return {target:'#building-category',text:'Choose All buildings in the category list so you can find this building.'};
 return {target:'[data-build="'+type+'"]',text:'Choose '+({solar:'Solar array',gaswell:'Gas Drill',refueler:'Refueler Station'}[type]||type)+', then move the preview onto clear terrain near your base.'};
}
export function wireTutorialAction({open,mode,expanded,from,to,source,destination,channel='power',sourceName,destinationName}){
 if(!open)return {target:'#colony-open',text:'Open Colony to connect '+sourceName+' to '+destinationName+'.'};
 if(mode!==channel)return {target:'[data-network="'+channel+'"]',text:'Choose '+(channel==='power'?'Power wire':'Resource pipe')+'. You can click the matching world ports, or follow the list controls below.'};
 if(!expanded)return {target:'#connection-editor summary',text:'Open Connect using lists. This makes it easy to choose the exact two ports.'};
 if(from!==source)return {target:'#connection-from',text:'Set From to '+sourceName+'.'};
 if(to!==destination)return {target:'#connection-to',text:'Set To to '+destinationName+'.'};
 return {target:'#connect-lists',text:'Press Connect selected ports to join '+sourceName+' → '+destinationName+'.'};
}

export function ventTutorialFuel(demo){
 if(demo.campaign.progress.tutorial.status!=='active'||demo.campaign.progress.tutorial.step!==7||demo.mode==='flight')return {ok:false,reason:'Complete the fuel line and land before the fuel test.'};
 let vented=0;
 if(demo.vehicle){for(const part of demo.vehicle.blueprint.parts)if(!PARTS[part.type].solid&&!demo.vehicle.removed.has(part.id)&&demo.vehicle.fuel[part.id]>0){vented=Math.min(2,demo.vehicle.fuel[part.id]);demo.vehicle.fuel[part.id]-=vented;break;}demo.fuel=demo.vehicle.stats().fuelPercent;}
 else{vented=Math.min(2,demo.fuel);demo.fuel-=vented;}
 return {ok:vented>0,reason:vented?'Vented a little propellant. Attach the fuel hose to replace it.':'Your liquid tanks already have room for the fuel test.'};
}
