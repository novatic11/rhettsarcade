import {nearestBody,length,sub} from './world.js';
import {wormholePoint,ENTRY_RANGE} from './wormholes.js';
import {dockPose} from './stations.js';

// Fast distant transfers retain the same quarter-second physics steps. Resolve
// the cap again between those steps so a fast frame cannot skip an approach.
export function autopilotWarp(demo,maxWarp=720){
 const g=demo.guidance;if(!g||demo.mode!=='flight'||demo.docking||demo.landing)return 1;
 const altitude=nearestBody(demo.ship).altitude;
 let warp=altitude>100000?720:altitude>10000?240:altitude>2500?48:altitude>400?8:1;
 if(g.kind==='orbit')warp=Math.min(warp,12);
 if(g.stage==='LANDING')warp=altitude>500?16:altitude>80?6:altitude>8?2:1;
 const point=g.waypoints?.[g.index];
 if(point){const gap=length(sub(point,demo.ship));warp=Math.min(warp,gap<350?4:gap<2500?16:gap<10000?48:gap<30000?120:720);}
 if(g.portal){const gap=length(sub(wormholePoint(g.portal,demo.campaign.elapsed),demo.ship));warp=Math.min(warp,gap<ENTRY_RANGE*1.4?1:gap<6000?4:gap<20000?24:720);}
 if(g.stationId){const station=demo.campaign.stations.get(g.stationId);if(!station)return 1;const gap=length(sub(dockPose(station,g.dockId,demo.campaign.elapsed).position,demo.ship));warp=Math.min(warp,gap<1500?1:gap<8000?4:gap<30000?24:240);}
 return Math.max(1,Math.min(warp,maxWarp));
}
