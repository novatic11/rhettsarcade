const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hz=m=>440*2**((m-69)/12);

// Original, subdued bass-and-vibraphone stealth music with responsive tension.
export class GameAudio{
 constructor(){this.effects=true;this.music=true;this.active=false;this.voices=new Map();this.beat=0;this.nextBeat=0;this.lastStep=-100;this.lastAlert=-100;this.lastLaser=-100;this.tension=0;}
 unlock(){try{if(!this.ctx||this.ctx.state==='closed')this.build();const resumed=this.ctx?.resume();if(resumed?.catch)resumed.catch(()=>{});}catch{}}
 build(){
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
  const c=this.ctx=new Audio();this.master=c.createGain();this.master.gain.value=.58;this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-18;this.limiter.knee.value=16;this.limiter.ratio.value=4;this.limiter.attack.value=.005;this.limiter.release.value=.18;this.master.connect(this.limiter);this.limiter.connect(c.destination);
  this.fx=c.createGain();this.song=c.createGain();this.fx.connect(this.master);this.song.connect(this.master);
  this.noise=c.createBuffer(1,Math.ceil(c.sampleRate*1.5),c.sampleRate);const samples=this.noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  this.nextBeat=0;this.setOptions(this.effects,this.music);
 }
 setOptions(effectsEnabled,musicEnabled){this.effects=!!effectsEnabled;this.music=!!musicEnabled;if(!this.ctx)return;const now=this.ctx.currentTime;this.fx.gain.setTargetAtTime(this.active&&this.effects?1:0,now,.035);this.song.gain.setTargetAtTime(this.active&&this.music?1:0,now,.07);if(!this.effects)this.stopVoices('fx');if(!this.music){this.stopVoices('music');this.nextBeat=0;}else if(this.active&&!this.nextBeat)this.nextBeat=now+.04;}
 setActive(active){active=!!active;const changed=this.active!==active;this.active=active;if(!this.ctx)return;const now=this.ctx.currentTime;this.fx.gain.setTargetAtTime(active&&this.effects?1:0,now,.025);this.song.gain.setTargetAtTime(active&&this.music?1:0,now,.09);if(!active){this.stopVoices();this.nextBeat=0;this.lastPosition=null;}else if(changed||!this.nextBeat){this.nextBeat=now+.05;this.lastPosition=null;}}
 stopVoices(group){for(const [source,v]of this.voices){if(group&&v.group!==group)continue;try{source.stop(this.ctx.currentTime+.045);}catch{}this.voices.delete(source);}}
 register(source,nodes,group){const count=[...this.voices.values()].filter(v=>v.group===group).length;if(count>=(group==='music'?32:20)){const oldest=[...this.voices].find(([,v])=>v.group===group);if(oldest){try{oldest[0].stop();}catch{}this.voices.delete(oldest[0]);}}this.voices.set(source,{group,nodes});source.onended=()=>{this.voices.delete(source);for(const node of nodes)try{node.disconnect();}catch{}};}
 tone(from,to,length,volume=.1,delay=0,type='sine',group='fx',pan=0,attack=.005){const c=this.ctx;if(!c||c.state!=='running'||!this.active||(group==='fx'?!this.effects:!this.music))return;const at=c.currentTime+Math.max(0,delay),osc=c.createOscillator(),gain=c.createGain(),p=c.createStereoPanner();osc.type=type;osc.frequency.setValueAtTime(Math.max(20,from),at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),at+length);p.pan.value=clamp(pan,-1,1);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+Math.min(length*.25,attack));gain.gain.exponentialRampToValueAtTime(.0001,at+length);osc.connect(gain);gain.connect(p);p.connect(group==='music'?this.song:this.fx);this.register(osc,[osc,gain,p],group);osc.start(at);osc.stop(at+length+.02);}
 hit(length=.1,volume=.1,frequency=900,delay=0,group='fx',pan=0){const c=this.ctx;if(!c||c.state!=='running'||!this.active||(group==='fx'?!this.effects:!this.music))return;const at=c.currentTime+Math.max(0,delay),source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),p=c.createStereoPanner();source.buffer=this.noise;source.loop=length>1.3;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.75;p.pan.value=clamp(pan,-1,1);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.005);gain.gain.exponentialRampToValueAtTime(.0001,at+length);source.connect(filter);filter.connect(gain);gain.connect(p);p.connect(group==='music'?this.song:this.fx);this.register(source,[source,filter,gain,p],group);source.start(at,Math.random()*.1);source.stop(at+length+.02);}
 event(name,game={}){
  if(!this.ctx||!this.active||!this.effects)return;const now=this.ctx.currentTime;
  if(name==='pickup'){this.tone(660,990,.13,.08);this.tone(1320,1320,.25,.055,.07,'sine','fx',.2);this.hit(.04,.03,3500);}
  else if(name==='footstep'){
   if(now-this.lastStep<(game.sneaking?.36:.22))return;this.lastStep=now;const quiet=game.sneaking||game.hidden,zone=String(game.surface||game.board?.surface||'tile'),wood=/wood|timber|library|attic/i.test(zone),carpet=/carpet|office|hotel/i.test(zone),volume=quiet?.021:.05;
   this.hit(carpet?.065:.048,volume,carpet?430:wood?820:1600,0,'fx',Math.sin(now*8)*.18);this.tone(wood?120:carpet?85:180,wood?68:carpet?52:95,.065,volume*.7,0,'sine');
  }
  else if(name==='alert'){if(now-this.lastAlert<1.3)return;this.lastAlert=now;this.tone(400,620,.18,.08,0,'triangle');this.tone(520,780,.18,.06,.18,'triangle');}
  else if(name==='laser'){if(now-this.lastLaser<.3)return;this.lastLaser=now;this.tone(1800,240,.17,.065,0,'sawtooth');this.hit(.15,.06,4000);}
  else if(name==='key'){for(const [i,n]of [79,83,86].entries())this.tone(hz(n),hz(n),.19,.05,i*.065,'sine');}
  else if(name==='unlock'){this.hit(.055,.09,1800);this.tone(240,380,.09,.075,.025,'triangle');this.hit(.07,.07,480,.12);}
  else if(name==='locked'){this.hit(.07,.075,900);this.tone(130,100,.12,.055,.02,'triangle');}
  else if(name==='switch'){this.hit(.035,.095,3200);this.tone(760,540,.055,.04);}
  else if(name==='vault'){this.hit(.45,.12,190);this.tone(52,81,.55,.09,0,'triangle');this.tone(740,1110,.25,.05,.4);}
  else if(name==='smoke'){this.hit(.48,.14,2200);this.tone(110,40,.15,.05);}
  else if(name==='win'){for(const [i,n]of [62,65,69,74,77].entries())this.tone(hz(n),hz(n),.48,.065,i*.09,'sine','fx',i*.15-.3);}
  else if(name==='miss'){this.tone(240,120,.65,.12,0,'triangle');this.tone(185,92,.7,.08,.13,'sine');this.hit(.24,.09,440);}
 }
 update(game={},dt=0){
  const c=this.ctx;if(!c||c.state!=='running'||!this.active)return;const now=c.currentTime,playing=!game.status||game.status==='playing',alarm=clamp(Number(game.alarm)||0,0,1);this.tension+=(alarm-this.tension)*Math.min(1,Math.max(0,Number(dt)||1/60)*5);
  if(playing&&Number.isFinite(game.x)&&Number.isFinite(game.y)){const p=this.lastPosition;if(p&&Math.hypot(game.x-p.x,game.y-p.y)>.2&&!game.hidden)this.event('footstep',game);this.lastPosition={x:game.x,y:game.y};}
  if(!this.music)return;if(!this.nextBeat||this.nextBeat<now-.4){this.nextBeat=now+.05;this.song.gain.setTargetAtTime(1,now,.09);}
  const step=60/108/2,roots=[38,41,36,43],line=[0,null,7,10,null,7,3,null,0,3,null,7,10,null,7,2];let scheduled=0;
  while(this.nextBeat<now+.16&&scheduled++<4){const b=this.beat++,root=roots[Math.floor(b/16)%4],delay=this.nextBeat-now,m=line[b%16];
   if(b%4===0)this.tone(hz(root),hz(root)*.997,.22,.12,delay,'sine','music');
   if(b%8===6)this.tone(hz(root+7),hz(root+7),.16,.06,delay,'triangle','music');
   if(m!==null&&b%2===0)this.tone(hz(root+24+m),hz(root+24+m),.41,.032,delay,'sine','music',Math.sin(b*.8)*.5,.012);
   if(b%8===0){this.tone(hz(root+15),hz(root+15),1.5,.019,delay,'sine','music',-.55,.12);this.tone(hz(root+19),hz(root+19),1.5,.017,delay,'sine','music',.55,.12);}
   if(b%4===2)this.hit(.065,.019,1200,delay,'music',.3);
   if(b%2===1)this.hit(.025,.011,5900,delay,'music',-.35);
   if(this.tension>.2&&b%2===0)this.tone(hz(root+12),hz(root+12),.075,.025+this.tension*.025,delay,'triangle','music',b%4?-.2:.2);
   this.nextBeat+=step;
  }
 }
 close(){this.setActive(false);for(const node of [this.fx,this.song,this.master,this.limiter])try{node?.disconnect();}catch{}try{const closed=this.ctx?.close();if(closed?.catch)closed.catch(()=>{});}catch{}this.ctx=null;this.voices.clear();this.nextBeat=0;this.lastPosition=null;}
}
