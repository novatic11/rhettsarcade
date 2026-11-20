export class PondSound{
 constructor(storage,Context=globalThis.AudioContext||globalThis.webkitAudioContext){this.Context=Context;this.enabled=true;this.active=false;this.context=null;this.sources=new Set();this.last=new Map();try{this.storage=storage||localStorage;this.enabled=this.storage.getItem('ducks-vs-dogs-muted')!=='true';}catch{}}
 unlock(){try{if(!this.Context)return;if(!this.context){this.context=new this.Context();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);}if(this.context.state==='suspended')this.context.resume().catch(()=>{});this.mix();}catch{this.Context=null;}}
 mix(){if(this.master)this.master.gain.setTargetAtTime(this.active&&this.enabled?.45:0,this.context.currentTime,.025);}
 setActive(value){if(this.active!==value){this.active=value;this.mix();}}
 toggle(){this.enabled=!this.enabled;try{this.storage?.setItem('ducks-vs-dogs-muted',String(!this.enabled));}catch{}this.mix();}
 tone(from,to,volume=.07,duration=.15,delay=0,type='sine'){const c=this.context;if(!c||c.state!=='running'||!this.enabled||!this.active||this.sources.size>=22)return;const o=c.createOscillator(),g=c.createGain(),at=c.currentTime+delay;o.type=type;o.frequency.setValueAtTime(from,at);o.frequency.exponentialRampToValueAtTime(Math.max(1,to),at+duration);g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(volume,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(this.master);this.sources.add(o);o.onended=()=>{this.sources.delete(o);o.disconnect();g.disconnect();};o.start(at);o.stop(at+duration+.03);}
 effect(type){const c=this.context;if(!c||!this.active)return;const rate={shoot:.12,bite:.3,defeat:.15,crumb:.2,income:.3}[type]||0;if(c.currentTime-(this.last.get(type)??-Infinity)<rate)return;this.last.set(type,c.currentTime);
  if(type==='place'){this.tone(590,380,.08,.11,0,'triangle');this.tone(470,320,.04,.10,.08,'triangle');}
  else if(type==='upgrade'){[440,660,880].forEach((n,i)=>this.tone(n,n,.055,.18,i*.08,'triangle'));}
  else if(type==='lightning'){this.tone(830,170,.045,.13,0,'sawtooth');}
  else if(type==='gust')this.tone(430,180,.045,.25,0,'triangle');
  else if(type==='thorns')this.tone(220,350,.025,.08,0,'triangle');
  else if(type==='spit')this.tone(360,130,.04,.13);
  else if(type==='lob'){this.tone(250,480,.035,.18,0,'triangle');}
  else if(type==='impact'){this.tone(220,70,.065,.24,0,'triangle');}
  else if(type==='slash'){this.tone(900,190,.035,.12);}
  else if(type==='reveal'){this.tone(700,1050,.025,.2);}
  else if(type==='wash'){this.tone(450,750,.035,.2);}
  else if(type==='bonus'||type==='refund')this.tone(1050,1300,.035,.12);
  else if(type==='steal')this.tone(360,220,.035,.13);
  else if(type==='heal'){this.tone(640,900,.025,.18);}
  else if(type==='shoot')this.tone(760,390,.022,.06);
  else if(type==='bite'){this.tone(145,85,.055,.12,0,'triangle');this.tone(120,75,.025,.1,.10,'triangle');}
  else if(type==='crumb'||type==='income'){this.tone(780,980,.045,.14);this.tone(1175,1175,.025,.13,.05);}
  else if(type==='defeat')this.tone(250,100,.04,.1,0,'triangle');
  else if(type==='splash'){this.tone(620,80,.12,.4,0,'triangle');this.tone(1100,250,.055,.25,.05);}
  else if(type==='patrol'){[660,520,660].forEach((n,i)=>this.tone(n,n*.7,.09,.13,i*.11,'triangle'));}
  else if(type==='wave'){this.tone(392,392,.055,.2);this.tone(494,494,.055,.2,.12);}
  else if(type==='clear'||type==='win'){[523,659,784,1047].forEach((n,i)=>this.tone(n,n,.06,.25,i*.09));}
  else if(type==='lose'){[392,330,220].forEach((n,i)=>this.tone(n,n*.8,.06,.28,i*.12));}
  else if(type==='remove')this.tone(300,180,.05,.12,0,'triangle');
 }
}
