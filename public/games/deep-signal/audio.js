const hz=m=>440*2**((m-69)/12);
export class OceanAudio{
 constructor(){this.effects=true;this.music=true;this.active=false;this.nodes=new Set();this.beat=0;this.nextBeat=0;}
 unlock(){try{if(!this.ctx||this.ctx.state==='closed')this.build();this.ctx.resume().catch(()=>{});}catch{}}
 build(){
  const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const c=this.ctx=new A();this.output=c.createGain();this.output.gain.value=.52;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-15;limiter.ratio.value=5;this.output.connect(limiter);limiter.connect(c.destination);
  this.fx=c.createGain();this.song=c.createGain();this.engine=c.createGain();this.fx.connect(this.output);this.song.connect(this.output);this.engine.connect(this.fx);this.engine.gain.value=0;
  const noise=c.createBuffer(1,c.sampleRate*6,c.sampleRate),data=noise.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.08)/1.025;data[i]=last;}
  this.noise=noise;const wash=c.createBufferSource(),filter=c.createBiquadFilter();wash.buffer=noise;wash.loop=true;filter.type='lowpass';filter.frequency.value=330;wash.connect(filter);filter.connect(this.engine);wash.start();
  this.motor=c.createOscillator();this.motor.type='triangle';this.motor.frequency.value=42;const motorGain=c.createGain();motorGain.gain.value=.22;this.motor.connect(motorGain);motorGain.connect(this.engine);this.motor.start();this.setOptions(this.effects,this.music);
 }
 setOptions(effects,music){this.effects=!!effects;this.music=!!music;if(!this.ctx)return;const now=this.ctx.currentTime;this.fx.gain.setTargetAtTime(this.effects?1:0,now,.04);this.song.gain.setTargetAtTime(this.music&&this.active?1:0,now,.12);if(!this.music)this.stopMusic();}
 setActive(active){active=!!active;if(this.active===active)return;this.active=active;if(!this.ctx)return;this.song.gain.setTargetAtTime(active&&this.music?1:0,this.ctx.currentTime,.18);if(!active){this.engine.gain.setTargetAtTime(0,this.ctx.currentTime,.08);this.stopMusic();}else this.nextBeat=this.ctx.currentTime+.08;}
 stopMusic(){if(this.ctx)this.song.gain.setTargetAtTime(0,this.ctx.currentTime,.035);for(const n of this.nodes){try{n.stop(this.ctx.currentTime+.18);}catch{}}this.nodes.clear();this.nextBeat=0;this.beat=0;}
 note(midi,at,duration,volume=.08,type='sine',bus=this.song,pan=0){
  const c=this.ctx,osc=c.createOscillator(),gain=c.createGain(),p=c.createStereoPanner();osc.type=type;osc.frequency.value=hz(midi);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+Math.min(.25,duration*.15));gain.gain.exponentialRampToValueAtTime(.0001,at+duration);p.pan.value=pan;osc.connect(gain);gain.connect(p);p.connect(bus);osc.start(at);osc.stop(at+duration+.02);if(bus===this.song)this.nodes.add(osc);osc.onended=()=>{this.nodes.delete(osc);osc.disconnect();gain.disconnect();p.disconnect();};
 }
 chirp(from,to,duration,volume=.16,delay=0,type='sine',pan=0){if(!this.ctx||!this.effects)return;const c=this.ctx,at=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain(),p=c.createStereoPanner();osc.type=type;osc.frequency.setValueAtTime(from,at);osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),at+duration);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);p.pan.value=pan;osc.connect(gain);gain.connect(p);p.connect(this.fx);osc.start(at);osc.stop(at+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();p.disconnect();};}
 noiseHit(duration=.3,volume=.4,frequency=500){if(!this.ctx||!this.effects)return;const c=this.ctx,at=c.currentTime,src=c.createBufferSource(),f=c.createBiquadFilter(),gain=c.createGain();src.buffer=this.noise;f.type='bandpass';f.frequency.value=frequency;f.Q.value=.7;gain.gain.setValueAtTime(volume,at);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);src.connect(f);f.connect(gain);gain.connect(this.fx);src.start(at);src.stop(at+duration);src.onended=()=>{src.disconnect();f.disconnect();gain.disconnect();};}
 event(kind){
  if(!this.ctx||this.ctx.state!=='running')return;
  if(kind==='ping'){this.chirp(1250,650,.6,.16);this.chirp(880,650,.45,.07,.25,'sine',-.65);this.chirp(720,520,.6,.035,.56,'sine',.65);}
  else if(kind==='pickup'){this.chirp(460,750,.16,.12);this.chirp(750,1130,.23,.08,.1);this.noiseHit(.09,.13,1800);}
  else if(kind==='hit'||kind==='mine'){this.noiseHit(.42,.65,kind==='mine'?130:420);this.chirp(95,32,.5,.25,0,'triangle');}
  else if(kind==='air'){this.chirp(620,520,.2,.13);this.chirp(620,520,.2,.13,.33);}
  else if(kind==='clear'){for(const [i,n]of [62,65,69,74].entries())this.chirp(hz(n),hz(n),.7,.1,i*.12);}
  else if(kind==='descend'){this.noiseHit(.7,.35,170);this.chirp(100,38,.8,.15);}
  else if(kind==='lost'){this.chirp(170,44,1.3,.2,0,'triangle');this.noiseHit(.7,.25,240);}
 }
 update(game){
  if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,now=c.currentTime;if(this.active){const speed=Math.hypot(game.vx,game.vy);this.motor.frequency.setTargetAtTime(38+speed*.32,now,.12);this.engine.gain.setTargetAtTime(.1+Math.min(1,speed/130)*.26,now,.1);}
  if(!this.active||!this.music)return;if(!this.nextBeat||this.nextBeat<now-.5){this.nextBeat=now+.05;this.song.gain.setTargetAtTime(1,now,.12);}
  // Original 32-beat theme: soft suspended chords, a slow bass and glassy replies.
  const roots=[50,46,53,48],melody=[7,10,7,14,12,7,3,5,7,2,0,7,10,7,3,2],step=60/74;
  while(this.nextBeat<now+.22){const b=this.beat++,bar=Math.floor(b/8)%4,root=roots[bar],at=this.nextBeat;
   if(b%8===0){const chord=bar===0?[0,3,7,14]:[0,4,7,14];for(let i=0;i<chord.length;i++)this.note(root+chord[i],at,step*8.4,.025,'sine',this.song,(i-1.5)*.35);this.note(root-12,at,step*5,.085,'sine');}
   if(b%2===0){const m=melody[Math.floor(b/2)%melody.length];this.note(root+12+m,at,step*2.9,.048,'sine',this.song,Math.sin(b)*.6);this.note(root+24+m,at+.18,step*1.5,.009,'sine',this.song,-.5);}
   if(game.level>3&&b%2===1)this.note(root-12,at,.19,.025,'triangle');
   this.nextBeat+=step;
  }
 }
 close(){this.stopMusic();if(this.ctx)this.ctx.close().catch(()=>{});}
}
