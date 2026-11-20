import {HOME_BODY,HOME_MOON,HOME_SYSTEM} from './universe.js';
import {BODIES,systemAt} from './system.js';

export class BeginnerUI{
 constructor({demo,settings,onAssist,onOpen,onGuide,onFlight,onRecover,onManual}){
  Object.assign(this,{demo,settings,onOpen});
  const choice=document.createElement('section');choice.id='explorer-choice';
  choice.innerHTML='<label><input id="explorer-assist" type="checkbox"><span><b>Explorer assist</b><small>RECOMMENDED FOR NEW PLAYERS</small></span></label><p>Optional landing checks, forgiving crashes, and free ship recovery with 40% fuel. Turn it off whenever you want the full flying challenge.</p><button id="beginner-menu-help">New here? Start here</button>';
  document.querySelector('#start').before(choice);
  choice.querySelector('input').checked=settings.explorerAssist;
  choice.querySelector('input').onchange=e=>{settings.explorerAssist=e.target.checked;demo.explorerAssist=e.target.checked;onAssist();};
  choice.querySelector('button').onclick=()=>this.open();
  const help=document.createElement('button');help.id='beginner-help';help.textContent='Help & rescue';help.onclick=()=>this.open();document.querySelector('#help').before(help);
  this.root=document.createElement('dialog');this.root.id='beginner-dialog';this.root.setAttribute('aria-labelledby','beginner-title');
  this.root.innerHTML=`<div class="beginner-heading"><span class="eyebrow">YOUR SPACE ADVENTURE / START HERE</span><button id="beginner-close" aria-label="Close help">✕</button></div><h2 id="beginner-title">You don’t need to be a rocket scientist.</h2><p>You’re an astronaut with a ship and a small base. Explore worlds, bring home discoveries, and build machines that earn money and make fuel. Start with one small adventure.</p><ol><li><b>Get comfortable.</b> WASD moves you. Drag to look around. E gets in your nearby ship; Shift + E gets out.</li><li><b>Try the base.</b> The guided projects show exactly where to click, pay rewards, and can be skipped. Your first solar panel powers ${BODIES[HOME_BODY].name}’s base.</li><li><b>Take a trip.</b> “Fly to ${BODIES[HOME_MOON].name}” handles takeoff, steering and braking. No electricity needed. Explorer assist also lets autopilot handle the landing.</li></ol><div id="beginner-context" role="status"></div><div class="beginner-actions"><button id="beginner-guide" class="primary">Show me the first projects</button><button id="beginner-flight">First flight: ${BODIES[HOME_MOON].name}</button><button id="beginner-recover">Recover my ship</button><button id="beginner-manual" hidden>Take manual control</button></div><p class="beginner-footnote">Your progress saves automatically. Journal has optional quests and research. Build, Shipyard and the larger factories can wait until you’re curious.</p>`;
  document.body.append(this.root);this.$=s=>this.root.querySelector(s);
  this.$('#beginner-close').onclick=()=>this.root.close();
  for(const [id,action]of [['guide',onGuide],['flight',onFlight],['recover',onRecover],['manual',onManual]])this.$('#beginner-'+id).onclick=()=>{this.root.close();action();};
  this.root.addEventListener('close',()=>onOpen(false));
  addEventListener('keydown',e=>{if(!this.visible)return;e.stopImmediatePropagation();},true);
 }
 get visible(){return this.root.open;}
 open(){if(this.visible)return;this.onOpen(true);const d=this.demo;
  this.$('#beginner-context').textContent=d.explorerAssist?'EXPLORER ASSIST ON · A rough landing keeps your fuel. Recover my ship is free, repairs your hull, and supplies at least 40% fuel. There’s no rescue cooldown.': 'FULL CHALLENGE · Crashes can empty your fuel and damage your ship. Recovery costs up to 150 credits and has a five-minute cooldown. Enable Explorer assist in the main menu for a gentler adventure.';
  this.$('#beginner-flight').disabled=systemAt(d.ship)!==HOME_SYSTEM;this.$('#beginner-flight').title=systemAt(d.ship)!==HOME_SYSTEM?'This first trip starts in your home system. Use System view to choose a local world here.':'';
  this.$('#beginner-recover').disabled=!d.rescueStatus().ok;
  this.$('#beginner-recover').title=d.rescueStatus().reason;
  this.$('#beginner-manual').hidden=!d.guidance;
  this.root.showModal();this.$('#beginner-guide').focus();
 }
}
