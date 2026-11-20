// Original procedural score and sound design; no external recordings or downloads.
const TEMPO = 142;
const STEP_SECONDS = 60 / TEMPO / 4;
const ROOTS = [45,41,38,40,45,41,43,40];
const THIRDS = [3,4,3,4,3,4,4,4];
const MELODY = [0,null,7,null,12,10,7,null,3,null,7,null,0,3,7,null,12,null,10,null,7,3,0,null,7,null,3,null,2,3,7,null];
const midi = note => 440 * Math.pow(2,(note-69)/12);
const isFight = phase => phase==='combat'||phase==='countdown';
const isSilent = phase => phase==='paused'||phase==='hidden';

export function scoreStep(index,phase='combat'){
  const step=index%16,bar=Math.floor(index/16)%16,chord=Math.floor(bar/2)%8,root=ROOTS[chord],third=THIRDS[chord],events=[];
  const add=(instrument,note,length,volume,pan=0)=>events.push({instrument,note,length,volume,pan});
  if(isSilent(phase))return events;
  const fight=isFight(phase);
  if(step===0){add('pad',root+12,STEP_SECONDS*15,fight?.045:.065,-.2);add('pad',root+19,STEP_SECONDS*15,fight?.035:.045,.2);}
  if(fight){
    if(step%4===0||step===14&&bar%2===1)add('kick',36,.19,.34);
    if(step===4||step===12)add('snare',0,.15,.17);
    if(step%2===0)add('hat',0,step===14?.09:.036,step%4===2?.065:.043,step%4===2?.25:-.25);
    const bass=[0,null,0,7,0,null,12,null,0,null,7,null,0,12,null,7][step];
    if(bass!==null)add('bass',root-12+bass,STEP_SECONDS*.83,.18);
    if(step%2===0){const degrees=[0,third,7,12,7,third,14,7],n=degrees[(step/2+bar)%8];add('arp',root+24+n,STEP_SECONDS*.7,.055,step%4===0?-.35:.35);}
    const melody=MELODY[(bar%2)*16+step];
    if(melody!==null)add('lead',root+24+melody,STEP_SECONDS*(step%2?1:1.7),.075,Math.sin(bar)*.12);
  }else{
    if(step===0||step===8)add('bass',root-12,STEP_SECONDS*6,.09);
    if(step%4===0){const degree=[0,third,7,12][step/4];add('arp',root+24+degree,STEP_SECONDS*2.6,.06,step<8?-.3:.3);}
  }
  return events;
}

export class AudioDirector {
  constructor(options={}){
    this.contextFactory=options.contextFactory||(()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;return C?new C():null;});
    this.storage=options.storage===undefined?(()=>{try{return globalThis.localStorage;}catch{return null;}})():options.storage;
    this.timers=options.timers||{setInterval:(f,t)=>setInterval(f,t),clearInterval:id=>clearInterval(id)};
    this.effectsOn=true;this.musicOn=true;
    try{this.effectsOn=this.storage?.getItem('square-off-sound')!=='off';this.musicOn=this.storage?.getItem('square-off-music')!=='off';}catch{}
    this.context=null;this.phase='menu';this.hidden=false;this.timer=null;this.nextNote=0;this.step=0;this.scheduledSteps=0;this.musicVoices=new Set();this.effectsVoices=new Set();this.cooldowns=new Map();this.disposed=false;this.unsupported=false;this.engineActive=false;this.laserActive=false;
  }
  async unlock(){
    if(this.disposed)return false;
    try{
      if(!this.context){
        this.context=this.contextFactory();if(!this.context){this.unsupported=true;return false;}
        const c=this.context;
        this.master=c.createGain();this.master.gain.value=.62;
        const compressor=c.createDynamicsCompressor();compressor.threshold.value=-16;compressor.knee.value=20;compressor.ratio.value=4;compressor.attack.value=.004;compressor.release.value=.15;
        this.master.connect(compressor);compressor.connect(c.destination);
        this.musicBus=c.createGain();this.effectsBus=c.createGain();this.musicBus.connect(this.master);this.effectsBus.connect(this.master);
        this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=this.noise.getChannelData(0);let seed=8719,brown=0;
        for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;brown=(brown+white*.02)/1.02;data[i]=white*.72+brown*.28;}
        this.createLoops();this.nextNote=c.currentTime+.045;
        this.timer=this.timers.setInterval(()=>this.pump(),25);
      }
      if(this.context.state==='suspended'&&!this.hidden)await this.context.resume();
      this.updateMix();this.pump();return this.context.state==='running';
    }catch{this.unsupported=true;return false;}
  }
  gain(param,value,duration=.06){const now=this.context.currentTime;param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);param.linearRampToValueAtTime(value,now+duration);}
  createLoops(){
    const c=this.context;
    const noise=c.createBufferSource(),filter=c.createBiquadFilter();noise.buffer=this.noise;noise.loop=true;filter.type='lowpass';filter.frequency.value=520;this.engineGain=c.createGain();this.engineGain.gain.value=0;noise.connect(filter);filter.connect(this.engineGain);this.engineGain.connect(this.effectsBus);noise.start();this.engineSource=noise;
    const laser=c.createOscillator(),laserFilter=c.createBiquadFilter();laser.type='sawtooth';laser.frequency.value=95;laserFilter.type='lowpass';laserFilter.frequency.value=480;this.laserGain=c.createGain();this.laserGain.gain.value=0;laser.connect(laserFilter);laserFilter.connect(this.laserGain);this.laserGain.connect(this.effectsBus);laser.start();this.laserSource=laser;
  }
  updateMix(){
    if(!this.context)return;const silent=isSilent(this.phase)||this.hidden;
    this.gain(this.musicBus.gain,this.musicOn&&!silent?(isFight(this.phase)?.43:.32):0,.1);
    this.gain(this.effectsBus.gain,this.effectsOn&&!this.hidden?.8:0);
    this.gain(this.engineGain.gain,this.effectsOn&&!silent&&this.engineActive?.13:0);
    this.gain(this.laserGain.gain,this.effectsOn&&!silent&&this.laserActive?.035:0);
  }
  save(key,value){try{this.storage?.setItem(key,value?'on':'off');}catch{}}
  toggleEffects(){this.effectsOn=!this.effectsOn;this.save('square-off-sound',this.effectsOn);this.updateMix();return this.effectsOn;}
  toggleMusic(){this.musicOn=!this.musicOn;this.save('square-off-music',this.musicOn);if(!this.musicOn)this.cancelMusic();else if(this.context)this.nextNote=this.context.currentTime+.04;this.updateMix();this.pump();return this.musicOn;}
  setPhase(phase){
    if(phase===this.phase)return;const wasFight=isFight(this.phase);this.phase=phase;
    if(this.context&&(isSilent(phase)||wasFight!==isFight(phase))){this.cancelMusic();this.nextNote=this.context.currentTime+.04;}
    this.updateMix();this.pump();
  }
  setMotion(thrust,laser){const active=this.phase==='combat';thrust=!!thrust&&active;laser=!!laser&&active;if(thrust!==this.engineActive||laser!==this.laserActive){this.engineActive=thrust;this.laserActive=laser;this.updateMix();}}
  async setHidden(hidden){this.hidden=hidden;if(!this.context)return;this.cancelMusic();this.updateMix();try{if(hidden)await this.context.suspend();else{await this.context.resume();this.nextNote=this.context.currentTime+.04;this.pump();}}catch{}}
  route(node,bus,pan=0){
    const output=bus==='music'?this.musicBus:this.effectsBus;
    if(pan&&this.context.createStereoPanner){const p=this.context.createStereoPanner();p.pan.value=pan;node.connect(p);p.connect(output);}else node.connect(output);
  }
  track(source,group,ends){const set=group==='music'?this.musicVoices:this.effectsVoices;set.add(source);source.onended=()=>{set.delete(source);source.disconnect();};source.stop(ends);}
  synth(group,freq,start,length,type='triangle',volume=.05,end=freq,pan=0,cutoff=2800){
    const c=this.context,source=c.createOscillator(),filter=c.createBiquadFilter(),env=c.createGain();source.type=type;source.frequency.setValueAtTime(freq,start);source.frequency.exponentialRampToValueAtTime(Math.max(20,end),start+length);filter.type='lowpass';filter.frequency.value=cutoff;
    env.gain.setValueAtTime(.0001,start);env.gain.linearRampToValueAtTime(volume,start+Math.min(.012,length*.15));env.gain.exponentialRampToValueAtTime(.0001,start+length);
    source.connect(filter);filter.connect(env);this.route(env,group,pan);source.start(start);this.track(source,group,start+length+.015);
  }
  noiseHit(group,start,length,volume,frequency=2500,type='highpass',pan=0){
    const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),env=c.createGain();source.buffer=this.noise;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.6;env.gain.setValueAtTime(volume,start);env.gain.exponentialRampToValueAtTime(.0001,start+length);source.connect(filter);filter.connect(env);this.route(env,group,pan);source.start(start);this.track(source,group,start+length+.015);
  }
  instrument(event,time){
    const {instrument,note,length,volume,pan}=event;
    if(instrument==='kick'){this.synth('music',145,time,length,'sine',volume,44);return;}
    if(instrument==='snare'){this.noiseHit('music',time,length,volume,1500,'highpass');this.synth('music',180,time,.08,'triangle',volume*.4,85);return;}
    if(instrument==='hat'){this.noiseHit('music',time,length,volume,6500,'highpass',pan);return;}
    const wave=instrument==='bass'?'sawtooth':instrument==='pad'?'sine':instrument==='lead'?'triangle':'square';
    this.synth('music',midi(note),time,length,wave,volume,midi(note),pan,instrument==='bass'?650:instrument==='arp'?1800:3200);
  }
  pump(){
    const c=this.context;if(!c||c.state!=='running'||!this.musicOn||this.hidden||isSilent(this.phase)||this.disposed)return;
    if(this.nextNote<c.currentTime-.12)this.nextNote=c.currentTime+.03;
    while(this.nextNote<c.currentTime+.14){for(const event of scoreStep(this.step,this.phase))this.instrument(event,this.nextNote);this.step=(this.step+1)%256;this.scheduledSteps++;this.nextNote+=STEP_SECONDS;}
  }
  cancelMusic(){
    for(const source of this.musicVoices){try{source.stop(this.context.currentTime+.025);}catch{}}this.musicVoices.clear();
  }
  cue(name){
    if(!this.context||this.context.state!=='running'||!this.effectsOn||this.hidden||this.disposed)return;
    const t=this.context.currentTime;
    const notes=name==='victory'?[69,72,76,81]:name==='death'?[57,52,45,40]:name==='reroll'?[76,71,79,74]:name==='round'?[57,64,69]:[69,76];
    notes.forEach((n,i)=>this.synth('effects',midi(n),t+i*(name==='death'?.13:.075),name==='death'?.28:.18,'triangle',.08,midi(n),0,2200));
  }
  event(e){
    if(!this.context||this.context.state!=='running'||!this.effectsOn||this.hidden||this.disposed)return;
    const t=this.context.currentTime,key=e.type+':'+(e.weapon||e.attack||''),cooldown=e.type==='boss_hit'?.09:e.type==='shoot'?.085:.1;
    if(t-(this.cooldowns.get(key)??-99)<cooldown)return;this.cooldowns.set(key,t);
    const beep=(f,l=.08,v=.04,end=f,wave='triangle')=>this.synth('effects',f,t,l,wave,v,end);
    if(e.type==='shoot'){
      if(e.weapon==='shotgun'){this.noiseHit('effects',t,.105,.13,950,'lowpass');beep(150,.09,.075,65);}
      else if(e.weapon==='rocket'){this.noiseHit('effects',t,.18,.10,750,'lowpass');beep(240,.16,.08,70,'sawtooth');}
      else if(e.weapon==='burst')beep(720,.045,.025,300,'square');
      else if(e.weapon==='seeker')beep(510,.09,.04,940);
      else if(e.weapon==='plasma'){beep(100,.23,.1,480,'sawtooth');this.noiseHit('effects',t,.14,.05,1500,'bandpass');}
      else if(e.weapon==='boomerang'){this.noiseHit('effects',t,.13,.05,1800,'bandpass');beep(410,.13,.025,240);}
      else if(e.weapon==='needle')beep(1050,.026,.018,620,'square');
      else if(e.weapon==='coil'){this.noiseHit('effects',t,.08,.09,2400,'bandpass');beep(190,.1,.035,700,'sawtooth');}
      else if(e.weapon==='blades')beep(780,.04,.024,1200);
      else if(e.weapon==='railgun'){beep(160,.22,.11,1600,'sawtooth');this.noiseHit('effects',t,.1,.09,3300,'highpass');}
      else if(e.weapon==='flame')this.noiseHit('effects',t,.13,.04,650,'lowpass');
      else if(e.weapon==='grenade'){beep(180,.1,.075,65);this.noiseHit('effects',t,.08,.07,850,'lowpass');}
      else if(e.weapon==='disc'){beep(550,.17,.035,800,'sawtooth');this.noiseHit('effects',t,.12,.025,1900,'bandpass');}
      else if(e.weapon==='shard'){beep(960,.08,.04,650);beep(1440,.06,.02,1050);}
      else if(e.weapon==='poison')beep(320,.09,.03,160,'sine');
      else if(e.weapon==='gravity')beep(180,.3,.065,45,'sine');
      else if(e.weapon==='storm'){beep(720,.1,.05,1350);this.noiseHit('effects',t,.05,.04,2600,'highpass');}
      else if(e.weapon==='echo'){[0,.15,.25].forEach((offset,i)=>this.synth('effects',620-i*90,t+offset,.065,'triangle',.03,360));}
      else if(e.weapon==='drone')beep(1020,.045,.022,650,'square');
      else beep(570,.045,.028,180);
    }
    if(e.type==='boss_shoot'){
      if(e.attack==='laser')beep(130,.3,.05,300,'sawtooth');
      else if(e.attack==='missile'){beep(330,.2,.055,140);this.noiseHit('effects',t,.15,.05,800,'lowpass');}
      else if(e.attack==='ring'){beep(400,.2,.055,160);beep(650,.15,.03,260);}
      else if(e.attack==='spread'){this.noiseHit('effects',t,.09,.1,1000,'bandpass');beep(180,.1,.07,80);}
      else if(e.attack==='mines')beep(260,.15,.045,400);
      else if(e.attack==='spiral'||e.attack==='pulse')beep(430,.23,.055,180);
      else if(e.attack==='rain'){this.noiseHit('effects',t,.22,.08,3100,'highpass');beep(700,.13,.03,350);}
      else if(e.attack==='mortar')beep(100,.18,.09,50);
      else if(e.attack==='boomerang')this.noiseHit('effects',t,.17,.09,1600,'bandpass');
      else beep(210,.08,.07,90);
    }
    if(e.type==='warning'&&e.attack==='laser'){[0,.18,.36].forEach((offset,i)=>this.synth('effects',330+i*90,t+offset,.075,'sine',.05));}
    if(e.type==='warning'&&e.attack==='missile')beep(670,.09,.035,480);
    if(e.type==='boss_hit')beep(310,.026,.012,180);
    if(e.type==='player_hit'){this.noiseHit('effects',t,.18,.12,1200,'lowpass');beep(150,.22,.14,45,'sawtooth');}
    if(e.type==='shield_hit'){beep(940,.2,.075,240);beep(1250,.14,.04,600);}
    if(e.type==='explosion'){this.noiseHit('effects',t,.28,.24,1100,'lowpass');beep(140,.24,.15,35);}
    if(e.type==='dash'){this.noiseHit('effects',t,.12,.1,1600,'bandpass');beep(280,.1,.035,650);}
    if(e.type==='split'||e.type==='bounce')beep(650,.04,.018,900);
    if(e.type==='heal')beep(740,.14,.04,980);
    if(e.type==='blink')beep(850,.18,.045,220);
    if(e.type==='field')beep(240,.24,.04,80,'sine');
    if(e.type==='lightning'){this.noiseHit('effects',t,.15,.12,1800,'highpass');beep(170,.15,.055,65);}
    if(e.type==='victory'||e.type==='death')this.cue(e.type);
  }
  status(){return{effectsEnabled:this.effectsOn,musicEnabled:this.musicOn,contextState:this.context?.state||'awaiting interaction',musicPlaying:!!this.context&&this.context.state==='running'&&this.musicOn&&!this.hidden&&!isSilent(this.phase),phase:this.phase,scheduledSteps:this.scheduledSteps,unsupported:this.unsupported};}
  dispose(){if(this.disposed)return;this.disposed=true;if(this.timer!==null)this.timers.clearInterval(this.timer);if(!this.context)return;this.cancelMusic();for(const source of this.effectsVoices){try{source.stop();}catch{}}this.effectsVoices.clear();try{this.engineSource.stop();this.laserSource.stop();this.context.close();}catch{}}
}
