import {HOME_BODY,localNames} from './universe.js';
import * as T from './vendor/three.module.js';
import {BODIES,landingPoint,length,sub} from './world.js';
import {discoveriesFor} from './expedition.js';
import {STARTER_PROJECTS,connectSuggestedPower} from './starter-path.js';
import {followSpotlight,buildTutorialAction,targetRect} from './tutorial-ui.js';

export class StarterGuide{
 constructor({demo,expedition,save,toast,sound}){
  Object.assign(this,{demo,expedition,save,toast,sound});
  this.root=document.createElement('aside');this.root.id='starter-guide';this.root.hidden=true;
  this.root.innerHTML='<div class="starter-heading"><span class="eyebrow">YOUR FIRST EXPEDITION</span><b id="starter-count"></b></div><div class="starter-dots" aria-hidden="true"></div><h3></h3><p></p><div class="starter-action-row"><button id="starter-action" class="primary"></button><button id="starter-extra" hidden></button><button id="starter-skip">Skip guide</button></div><small id="starter-reward"></small>';
  document.body.append(this.root);this.$=q=>this.root.querySelector(q);
  this.spot=document.createElement('div');this.spot.id='starter-spot';this.spot.hidden=true;document.body.append(this.spot);
  this.pin=document.createElement('div');this.pin.id='starter-waypoint';this.pin.hidden=true;this.pin.innerHTML='<i>◇</i><b></b><small></small>';document.body.append(this.pin);
  this.$('#starter-skip').onclick=()=>{const p=demo.campaign.firstSteps;p.status='skipped';p.dismissed=true;if(demo.campaign.progress.tutorial.status==='pending')demo.campaign.progress.tutorial.status='skipped';this.save();};
 }
 start(){this.demo.campaign.firstSteps.start();if(this.demo.campaign.firstSteps.current()?.id==='fuel')this.demo.campaign.firstSteps.fuelStarted=false;this.demo.campaign.progress.lesson=null;this.demo.campaign.progress.tutorial.status='skipped';this.save();}
 finishAction(){this.expedition.ui.toggle(false);this.expedition.ui.toggleBuild(false);this.expedition.factory.open(false);this.save();}
 pinTo(point,name){
  if(!point||this.demo.body!==HOME_BODY)return;this.pin.hidden=false;this.pin.querySelector('b').textContent=name;this.pin.querySelector('small').textContent=Math.round(length(sub(point,this.demo.position)))+' m';
  const p=new T.Vector3(...point).sub(this.expedition.origin),camera=this.expedition.camera,delta=p.clone().sub(camera.position),ahead=delta.dot(camera.getWorldDirection(new T.Vector3()))>0;p.project(camera);
  const edge=!ahead||Math.abs(p.x)>.83||Math.abs(p.y)>.65;this.pin.classList.toggle('at-edge',edge);this.pin.querySelector('i').textContent=edge?(p.x<0?'‹':'›'):'◇';
  this.pin.style.left=(edge?innerWidth*.5:Math.max(110,Math.min(innerWidth-110,(p.x*.5+.5)*innerWidth)))+'px';this.pin.style.top=(edge?Math.max(160,Math.min(innerHeight*.32,210)):Math.max(innerHeight*.35,Math.min(innerHeight*.7,(-p.y*.5+.5)*innerHeight)))+'px';
 }
 update({hidden}){
  const d=this.demo,c=d.campaign,path=c.firstSteps,project=path.current(),fuel=path.status==='active'&&project?.id==='fuel';
  this.root.hidden=hidden||['skipped','paused'].includes(path.status)||path.status==='done'&&path.dismissed;this.spot.hidden=true;this.pin.hidden=true;
  if(fuel){if(!path.fuelStarted){path.fuelStarted=true;c.progress.tutorial={status:'active',step:0};this.save();}else if(c.progress.tutorial.status==='skipped'){path.status='skipped';this.save();}this.root.hidden=true;return false;}
  this.root.classList.toggle('welcome',path.status==='pending');
  const owns=['pending','active'].includes(path.status)||path.status==='done'&&!path.dismissed;if(this.root.hidden)return owns;
  this.$('#starter-count').textContent=path.status==='pending'?'5 QUICK PROJECTS':path.claimed.size+' / 5';
  this.$('.starter-dots').innerHTML=STARTER_PROJECTS.map(p=>'<i class="'+(path.claimed.has(p.id)?'complete':p.id===project?.id?'current':'')+'"></i>').join('');
  this.root.querySelector('h3').textContent=path.status==='pending'?'A little power. A big beginning.':path.status==='done'?'Your colony is alive.':project.title;
  const action=this.$('#starter-action'),extra=this.$('#starter-extra');action.disabled=false;extra.hidden=true;this.$('#starter-reward').textContent=project&&path.status==='active'?'PROJECT REWARD · +'+project.reward+' CREDITS':'Real buildings. Real discoveries. Keep everything you make.';
  this.$('#starter-skip').textContent=path.status==='pending'?'Explore on my own':path.status==='done'?'Keep exploring':'Skip guide';
  let target=null,run=()=>{},text='',label='Show me';
  const kit=tab=>{this.expedition.factory.open(false);this.expedition.ui.toggleBuild(false);this.expedition.ui.tab=tab;this.expedition.ui.toggle(true);};
  if(path.status==='pending'){text='Start with one solar panel, turn a rock sample into money, then find a nearby discovery. Five small projects teach the basics and pay bonus credits. Skip whenever you like.';label='Let’s build something';run=()=>this.start();}
  else if(path.status==='done'){text='You have power, science income, and your own fuel. Choose your next adventure: build a mining line, design a ship, or fly to Luma. Your starter lander is already ready to fly.';label='Explore the Shipyard';run=()=>{path.dismissed=true;this.expedition.openYard();this.save();};extra.hidden=false;extra.textContent='Try mining';extra.onclick=()=>{path.dismissed=true;this.expedition.ui.toggleBuild(true);this.expedition.ui.$('#building-category').value='starter';this.expedition.ui.$('#building-category').onchange();this.save();};}
  else if(d.body!==HOME_BODY){text='Your opening projects are on Cinder. Explore freely, then return to your starting base when you want to continue.';label='Open system map';target='#map';run=()=>document.getElementById('map').click();}
  else if(project.id==='power'){
   const buildings=c.bases[HOME_BODY].buildings,solar=buildings.find(b=>b.type==='solar');
   if(!solar){const ui=this.expedition.ui,placing=!!this.expedition.colony.buildType,a=buildTutorialAction('solar',{placing,buildOpen:ui.buildOpen,cardVisible:!ui.$('[data-build="solar"]').hidden,pointer:{x:(this.expedition.pointer.x*.5+.5)*innerWidth,y:(-.5*this.expedition.pointer.y+.5)*innerHeight}});text=a.text+' A solar panel makes electricity; wires carry it to machines.';target=placing?'#placement-suggest':a.target;label=placing?'Use a clear spot · 75 credits':'Find Solar array · 75 credits';run=()=>{if(placing)this.expedition.placeSuggested();else{this.expedition.ui.toggleBuild(true);this.expedition.ui.$('#building-category').value='starter';this.expedition.ui.$('#building-category').onchange();}};}
   else{text='Nice. Now give that electricity somewhere to go. Connect your panel to the Warehouse’s battery and Science Processer. This shortcut builds the same visible wires as the manual tool.';label='Connect the starter base';target='#starter-action';run=()=>{const ids=buildings.filter(b=>b.type==='warehouse'||b.type==='science').map(b=>b.id),r=connectSuggestedPower(c,HOME_BODY,ids);this.toast(r.reason);if(r.ok){this.sound.event('attach');this.finishAction();}};}
  }else if(project.id==='sample'){
   const recording=c.job?.kind==='experiment';text=recording?'Recording your sample. Keep still until the progress bar fills. You only need to start the experiment once.':'Your first experiment is right under your boots. Open Field kit → Survey and take a Surface sample. It takes four seconds; hold still while it records.';label=recording?'Recording…':'Open Surface sample';action.disabled=recording;run=()=>kit('survey');target=recording?'#experiment-progress':targetRect('[data-experiment="sample"]')?'[data-experiment="sample"]':'#field-kit';
  }else if(project.id==='science'){
   const machine=c.bases[HOME_BODY].buildings.find(b=>b.type==='science'),range=machine?c.buildingDistance(HOME_BODY,machine,d.position):Infinity;
   if(machine)this.pinTo(landingPoint(HOME_BODY,machine.x,machine.z,3),'Science Processer');
   if(c.job?.kind==='process'){text='Your powered Processer is turning that sample into credits. Watch your balance—the first payout also completes this project.';label='Analyzing…';action.disabled=true;target='#experiment-progress';}
   else{text=range>14?'Follow the Science Processer marker. Bring your sample within 14 m, then open Field kit → Base to sell the science. WASD moves; Shift runs.':'You’re close enough. Open Field kit → Base and press Process returned experiments. The sample stays safely in the machine until analysis finishes.';label='Open science delivery';run=()=>kit('base');target=range<=14&&targetRect('#process-science')?'#process-science':range<=14?'#field-kit':null;}
  }else if(project.id==='discovery'){
   const probe=discoveriesFor(HOME_BODY).find(x=>x.type==='probe'),nearProbe=c.context(HOME_BODY,d.position).id===probe.id;this.pinTo(probe.position,'Fallen survey probe');
   text=!nearProbe?'There’s a fallen probe nearby. Follow its marker on foot, or walk to your rover and press R to drive. Step outside near the probe to scan it. Its artifact sample is worth much more than an ordinary rock.':d.mode==='rover'?'Park beside the probe, then press R to step outside. Your handheld scanner needs you on foot.':'Open Field kit → Survey and choose Artifact scan. Hold still while the scanner records your discovery. You can bring this sample back for another payday.';
   label=!nearProbe?'Mark the discovery':d.mode==='rover'?'Step outside':'Open Artifact scan';run=()=>{if(d.mode==='rover')document.getElementById('rover').click();else kit('survey');};if(!nearProbe)run=()=>{this.expedition.ui.toggle(false);this.expedition.ui.scan();};target=nearProbe&&d.mode==='foot'?(targetRect('[data-experiment="artifact"]')?'[data-experiment="artifact"]':'#field-kit'):null;
  }
  if(project?.id==='discovery'&&c.job?.kind==='experiment'){text='Hold still while your scanner records the probe. Watch the progress bar; you only need to start it once.';label='Recording…';action.disabled=true;target='#experiment-progress';}
  if(c.job&&this.expedition.factory.paused){text='Time is paused. Resume it so your experiment can finish.';label='Resume time';action.disabled=false;run=()=>document.getElementById('colony-pause').click();target='#colony-pause';}else if(c.job?.kind==='process'&&c.power(HOME_BODY).generation<.1&&c.power(HOME_BODY).battery<1){text='Solar panels need daylight. Wait for the next dawn to finish processing your sample.';label='Wait for daylight';action.disabled=false;run=()=>document.getElementById('warp-dawn').click();target='#warp-dawn';}
  this.root.querySelector('p').textContent=localNames(text);action.textContent=label;action.onclick=()=>{run();this.save();};
  if(target)followSpotlight(this.spot,this.root,target);else{this.root.removeAttribute('style');}
  return owns;
 }
}
