const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hz=m=>440*2**((m-69)/12);

// An original, lightly swung harbor tune. Everything is created after a gesture.
export class GameAudio{
 constructor(){this.effects=true;this.music=true;this.active=false;this.voices=new Map();this.beat=0;this.nextBeat=0;this.lastCreak=-100;this.lastStorm=-100;}
 unlock(){try{if(!this.ctx||this.ctx.state==='closed')this.build();const resume=this.ctx?.resume();if(resume?.catch)resume.catch(()=>{});}catch{}}
 build(){
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
  const c=this.ctx=new Audio(),master=this.master=c.createGain(),limiter=c.createDynamicsCompressor();master.gain.value=.58;limiter.threshold.value=-18;limiter.knee.value=15;limiter.ratio.value=4;limiter.attack.value=.005;limiter.release.value=.18;master.connect(limiter);limiter.connect(c.destination);this.limiter=limiter;
  this.fx=c.createGain();this.song=c.createGain();this.ambience=c.createGain();this.motorGain=c.createGain();this.fx.connect(master);this.song.connect(master);this.ambience.connect(this.fx);this.motorGain.connect(this.fx);this.ambience.gain.value=0;this.motorGain.gain.value=0;
  this.noise=c.createBuffer(1,Math.ceil(c.sampleRate*2),c.sampleRate);const samples=this.noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  const sea=this.sea=c.createBufferSource(),seaFilter=this.seaFilter=c.createBiquadFilter();sea.buffer=this.noise;sea.loop=true;seaFilter.type='lowpass';seaFilter.frequency.value=430;seaFilter.Q.value=.4;sea.connect(seaFilter);seaFilter.connect(this.ambience);sea.start();
  this.motor=c.createOscillator();this.motor.type='triangle';this.motor.frequency.value=62;this.motor.connect(this.motorGain);this.motor.start();this.nextBeat=0;this.setOptions(this.effects,this.music);
 }
 setOptions(effectsEnabled,musicEnabled){
  this.effects=!!effectsEnabled;this.music=!!musicEnabled;if(!this.ctx)return;const now=this.ctx.currentTime;
  this.fx.gain.setTargetAtTime(this.active&&this.effects?1:0,now,.035);this.song.gain.setTargetAtTime(this.active&&this.music?1:0,now,.07);
  if(!this.effects)this.stopVoices('fx');if(!this.music){this.stopVoices('music');this.nextBeat=0;}else if(this.active&&!this.nextBeat)this.nextBeat=now+.04;
 }
 setActive(active){
  active=!!active;const changed=this.active!==active;this.active=active;if(!this.ctx)return;
  const now=this.ctx.currentTime;this.fx.gain.setTargetAtTime(active&&this.effects?1:0,now,.025);this.song.gain.setTargetAtTime(active&&this.music?1:0,now,.09);
  if(!active){this.motorGain.gain.setTargetAtTime(0,now,.025);this.ambience.gain.setTargetAtTime(0,now,.045);this.stopVoices();this.nextBeat=0;}
  else if(changed||!this.nextBeat)this.nextBeat=now+.05;
 }
 stopVoices(group){for(const [source,v]of this.voices){if(group&&v.group!==group)continue;try{source.stop(this.ctx.currentTime+.045);}catch{}this.voices.delete(source);}}
 register(source,nodes,group){
  const count=[...this.voices.values()].filter(v=>v.group===group).length;
  if(count>=(group==='music'?32:20)){const oldest=[...this.voices].find(([,v])=>v.group===group);if(oldest){try{oldest[0].stop();}catch{}this.voices.delete(oldest[0]);}}
  this.voices.set(source,{group,nodes});source.onended=()=>{this.voices.delete(source);for(const node of nodes)try{node.disconnect();}catch{}};
 }
 tone(from,to,length,volume=.1,delay=0,type='sine',group='fx',pan=0,attack=.005){
  const c=this.ctx;if(!c||c.state!=='running'||!this.active||(group==='fx'?!this.effects:!this.music))return;
  const at=c.currentTime+Math.max(0,delay),osc=c.createOscillator(),gain=c.createGain(),p=c.createStereoPanner();osc.type=type;osc.frequency.setValueAtTime(Math.max(20,from),at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),at+length);p.pan.value=clamp(pan,-1,1);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+Math.min(length*.25,attack));gain.gain.exponentialRampToValueAtTime(.0001,at+length);osc.connect(gain);gain.connect(p);p.connect(group==='music'?this.song:this.fx);this.register(osc,[osc,gain,p],group);osc.start(at);osc.stop(at+length+.02);
 }
 hit(length=.1,volume=.1,frequency=900,delay=0,group='fx',pan=0){
  const c=this.ctx;if(!c||c.state!=='running'||!this.active||(group==='fx'?!this.effects:!this.music))return;
  const at=c.currentTime+Math.max(0,delay),source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),p=c.createStereoPanner();source.buffer=this.noise;source.loop=length>1.8;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.65;p.pan.value=clamp(pan,-1,1);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.006);gain.gain.exponentialRampToValueAtTime(.0001,at+length);source.connect(filter);filter.connect(gain);gain.connect(p);p.connect(group==='music'?this.song:this.fx);this.register(source,[source,filter,gain,p],group);source.start(at,Math.random()*.15);source.stop(at+length+.02);
 }
 event(name,game={}){
  if(!this.ctx||!this.active||!this.effects)return;const pan=clamp(((game.crate?.x??game.x??480)-480)/600,-.8,.8);
  if(name==='release'){this.hit(.07,.13,2300,0,'fx',pan);this.tone(430,270,.08,.09,.01,'triangle','fx',pan);}
  else if(name==='land'){this.tone(155,70,.19,.24,0,'sine','fx',pan);this.hit(.09,.23,670,0,'fx',pan);this.tone(830,420,.07,.025,.015,'triangle','fx',pan);if((game.delivered||0)%5===0&&game.delivered)this.tone(660,880,.2,.045,.13,'sine');}
  else if(name==='miss'){this.hit(.55,.35,600,0,'fx',pan);this.tone(220,45,.24,.12,0,'sine','fx',pan);this.hit(.3,.1,1800,.14,'fx',pan);}
  else if(name==='creak'){const now=this.ctx.currentTime;if(now-this.lastCreak<1.6)return;this.lastCreak=now;this.tone(61,95,.68,.09,0,'triangle','fx',pan,.06);this.hit(.5,.06,360,0,'fx',pan);}
  else if(name==='storm'){const now=this.ctx.currentTime;if(now-this.lastStorm<6)return;this.lastStorm=now;this.hit(1.1,.2,110);this.tone(43,25,1.15,.13,.04,'sine');}
  else if(name==='lost'){this.tone(196,73,.9,.16,0,'triangle');this.hit(.8,.2,170,.02);this.tone(146,55,.9,.1,.18,'sine');}
  else if(name==='win'){for(const [i,n]of [67,71,74,79].entries())this.tone(hz(n),hz(n),.35,.08,i*.1,'sine');}
 }
 update(game={},dt=0){
  const c=this.ctx;if(!c||c.state!=='running'||!this.active)return;const now=c.currentTime,playing=!game.status||game.status==='playing',speed=clamp(Math.abs(Number(game.v)||0)/210,0,1),roll=Math.abs(Number(game.roll)||0),weather=clamp((Number(game.delivered)||0)/80,0,1);
  this.motor.frequency.setTargetAtTime(52+speed*70,now,.07);this.motorGain.gain.setTargetAtTime(playing&&game.held&&speed>.025?.008+speed*.028:0,now,.06);this.ambience.gain.setTargetAtTime(playing?.016+Math.sin(now*.35)*.003+weather*.008:0,now,.2);this.seaFilter.frequency.setTargetAtTime(380+weather*320,now,.3);
  if(playing&&roll>.075&&Math.abs(Number(game.rollV)||0)>.02)this.event('creak',game);
  if(!this.music)return;if(!this.nextBeat||this.nextBeat<now-.4){this.nextBeat=now+.05;this.song.gain.setTargetAtTime(1,now,.09);}
  const step=60/94/2,roots=[48,53,50,55],melody=[7,null,12,9,7,4,null,2,4,7,9,null,12,7,4,2];let scheduled=0;
  while(this.nextBeat<now+.16&&scheduled++<4){const b=this.beat++,bar=Math.floor(b/16)%4,root=roots[bar],at=this.nextBeat,delay=at-now,swung=(b%2)*step*.13,n=melody[b%16];
   if(b%4===0)this.tone(hz(root-12),hz(root-12)*.997,.31,.11,delay,'sine','music');
   if(b%8===0){this.tone(hz(root+4),hz(root+4),1.08,.026,delay,'sine','music',-.45,.04);this.tone(hz(root+7),hz(root+7),1.08,.023,delay,'sine','music',.45,.04);}
   if(n!==null&&b%2===0)this.tone(hz(root+24+n),hz(root+24+n)*.999,.27,.048,delay+swung,'sine','music',Math.sin(b*.7)*.35);
   if(b%4===2)this.hit(.065,.018,1250,delay,'music',.4);
   if(b%2===1)this.hit(.025,.013,6200,delay+swung,'music',-.35);
   this.nextBeat+=step;
  }
 }
 close(){this.setActive(false);for(const n of [this.sea,this.motor])try{n?.stop();}catch{}for(const n of [this.sea,this.seaFilter,this.motor,this.motorGain,this.ambience,this.fx,this.song,this.master,this.limiter])try{n?.disconnect();}catch{}try{const closed=this.ctx?.close();if(closed?.catch)closed.catch(()=>{});}catch{}this.ctx=null;this.voices.clear();this.nextBeat=0;}
}
