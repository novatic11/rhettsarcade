// Small original Web Audio synth shared in spirit by the remade arcade games.
// Sound only starts after a user gesture and stays silent while muted or paused.
export class Sfx{
 constructor(key){
  this.key=key;this.muted=false;this.music=true;this.ctx=null;this.paused=false;this.song=null;this.step=0;this.next=0;this.timer=0;
  try{const s=JSON.parse(localStorage.getItem(key)||'{}');this.muted=s.muted===true;this.music=s.music!==false;}catch{}
 }
 save(){try{localStorage.setItem(this.key,JSON.stringify({muted:this.muted,music:this.music}));}catch{}}
 unlock(){
  if(this.ctx){if(this.ctx.state==='suspended'&&!this.paused)this.ctx.resume().catch(()=>{});return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{this.ctx=new AC();}catch{return;}
  this.master=this.ctx.createGain();this.master.gain.value=this.muted?0:.55;this.master.connect(this.ctx.destination);
  this.fx=this.ctx.createGain();this.fx.gain.value=.8;this.fx.connect(this.master);
  this.bgm=this.ctx.createGain();this.bgm.gain.value=this.music?.32:0;this.bgm.connect(this.master);
  this.timer=setInterval(()=>this.schedule(),60);
 }
 setMuted(m){this.muted=m;this.save();if(this.master)this.master.gain.setTargetAtTime(m?0:.55,this.ctx.currentTime,.03);}
 setMusic(on){this.music=on;this.save();if(this.bgm)this.bgm.gain.setTargetAtTime(on?.32:0,this.ctx.currentTime,.05);}
 pause(p){this.paused=p;if(!this.ctx)return;if(p)this.ctx.suspend().catch(()=>{});else this.ctx.resume().catch(()=>{});}
 live(){return this.ctx&&!this.muted&&!this.paused&&this.ctx.state==='running';}
 tone(freq,dur=.12,o={}){
  if(!this.live())return;const c=this.ctx,t=c.currentTime+(o.delay||0),osc=c.createOscillator(),g=c.createGain();
  osc.type=o.type||'sine';osc.frequency.setValueAtTime(freq,t);if(o.slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq*o.slide),t+dur);
  const v=o.vol??.18;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+(o.attack||.006));g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  osc.connect(g);g.connect(o.bus||this.fx);osc.start(t);osc.stop(t+dur+.05);
 }
 noise(dur=.1,o={}){
  if(!this.live())return;const c=this.ctx,t=c.currentTime+(o.delay||0),len=Math.max(1,Math.floor(c.sampleRate*dur)),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;const src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
  src.buffer=buf;f.type=o.filter||'lowpass';f.frequency.value=o.freq||1800;const v=o.vol??.12;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0008,t+dur);
  src.connect(f);f.connect(g);g.connect(this.fx);src.start(t);
 }
 chord(freqs,dur,o={}){freqs.forEach((f,i)=>this.tone(f,dur,{...o,delay:(o.delay||0)+i*(o.spread||0)}));}
 // song: {bpm, steps:[[midi notes or null], ...], bass:[midi|null], wave, bassWave}
 play(song){if(this.song===song)return;this.song=song;this.step=0;this.next=this.ctx?this.ctx.currentTime+.1:0;}
 stop(){this.song=null;}
 schedule(){
  if(!this.ctx||!this.song||this.paused||this.ctx.state!=='running')return;
  const c=this.ctx,s=this.song,len=60/s.bpm/2;if(this.next<c.currentTime)this.next=c.currentTime+.05;
  while(this.next<c.currentTime+.25){
   const i=this.step%s.steps.length,notes=s.steps[i]||[],b=s.bass?.[i%s.bass.length];
   for(const n of notes)if(n!=null)this.note(n,len*(s.hold||1.6),s.wave||'triangle',s.vol||.05,this.next);
   if(b!=null)this.note(b,len*1.8,s.bassWave||'sine',s.bassVol||.09,this.next);
   if(s.hat&&i%2===1)this.hat(this.next);
   this.next+=len;this.step++;
  }
 }
 note(m,dur,wave,vol,t){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=wave;o.frequency.value=440*2**((m-69)/12);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.02);g.gain.exponentialRampToValueAtTime(.0005,t+dur);o.connect(g);g.connect(this.bgm);o.start(t);o.stop(t+dur+.05);}
 hat(t){const c=this.ctx,len=Math.floor(c.sampleRate*.03),buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=buf;f.type='highpass';f.frequency.value=7000;g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.0005,t+.03);s.connect(f);f.connect(g);g.connect(this.bgm);s.start(t);}
}
