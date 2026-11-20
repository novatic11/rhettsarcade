// Original synthesized sound design. No samples or third-party tracks.
export class Studio{
 constructor(ctx,style){this.ctx=ctx;this.style=style;this.enabled=false;this.voices=0;this.beat=0;this.next=0;this.lastHit=0;this.bus=ctx.createGain();this.bus.gain.value=0;const limit=ctx.createDynamicsCompressor();limit.threshold.value=-15;limit.knee.value=14;limit.ratio.value=4;this.bus.connect(limit);limit.connect(ctx.destination);this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=this.noise.getChannelData(0);let smooth=0;for(let i=0;i<data.length;i++){smooth=.6*smooth+.4*(Math.random()*2-1);data[i]=smooth;}}
 active(on){if(on===this.enabled)return;this.enabled=on;const t=this.ctx.currentTime;this.bus.gain.cancelScheduledValues(t);this.bus.gain.setTargetAtTime(on?.42:0,t,.045);if(on)this.next=t+.12;}
 note(frequency,duration=.2,volume=.12,type='sine',delay=0,end=frequency){if(this.voices>28)return;const ctx=this.ctx,t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(frequency,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.bus);o.start(t);o.stop(t+duration+.01);this.voices++;o.onended=()=>{o.disconnect();g.disconnect();this.voices--;};}
 hiss(duration=.1,volume=.12,frequency=1300,delay=0){if(this.voices>28)return;const ctx=this.ctx,t=ctx.currentTime+delay,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=this.noise;f.type='bandpass';f.frequency.value=frequency;f.Q.value=.7;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);g.connect(this.bus);s.start(t);s.stop(t+duration+.02);this.voices++;s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();this.voices--;};}
 fx(event){if(!this.enabled)return;const e=typeof event==='string'?{type:event}:event,k=e.type,t=this.ctx.currentTime;
  if(this.style==='parcel'){
   if(k==='pack'||k==='beam'){this.note(105,.13,.35,'sine',0,45);this.hiss(.075,.36,800);this.note(540,.065,.07,'triangle',.025,350);}
   else if(k==='ship'||k==='clear'){const rise=Math.min(5,e.combo||1);[0,4,7,12].forEach((n,i)=>this.note(330*2**((n+rise)/12),.42,.13,'sine',i*.065));this.hiss(.32,.19,2700,.02);this.note(90,.23,.2,'triangle',0,42);}
   else if(k==='rotate'){this.hiss(.06,.17,1700);this.note(370,.08,.08,'triangle',0,600);}
   else if(k==='select'){this.note(440,.06,.07,'triangle');this.hiss(.035,.07,2300);}
   else if(k==='undo'){this.note(650,.16,.1,'sine',0,260);this.hiss(.11,.12,1100);}
   else if(k==='order'){this.hiss(.14,.14,2300);this.note(660,.1,.1,'sine',.07);this.note(880,.13,.09,'sine',.17);}
  }else if(this.style==='ricochet'){
   if(k==='hit'){if(t-this.lastHit<.025)return;this.lastHit=t;this.note(160+(e.bank||0)%5*24,.055,.3,'sine',0,65);this.hiss(.035,.25,2300);}
   else if(k==='launch'){this.note(150,.13,.28,'sine',0,45);this.hiss(.09,.24,1600);}
   else if(k==='pickup'){const f=660*2**((e.index||0)*3/12);this.note(f,.5,.17);this.note(f*2,.24,.05,'sine',.025);}
   else if(k==='clear'){this.note(440,.23,.12);this.note(660,.25,.1,'sine',.08);this.hiss(.1,.1,1800);}
  }else{
   if(k==='flip'){this.hiss(.13,.22,1100);this.note(75,.1,.1,'triangle',0,45);}
   else if(k==='report'){[520,650,780].forEach((f,i)=>this.note(f,.23,.1,'sine',i*.06));this.hiss(.07,.08,1800);}
   else if(k==='alarm'){this.note(120,.5,.18,'triangle',0,85);this.note(127,.5,.1,'sine');}
   else if(k==='beam')this.hiss(.06,.035,400);
  }
  if(k==='error'){this.note(145,.17,.12,'triangle',0,95);this.hiss(.05,.08,600);}
  if(k==='win'){[0,4,7,12,16].forEach((n,i)=>this.note(330*2**(n/12),.6,.12,'sine',i*.09));}
 }
 tick(){if(!this.enabled)return;const t=this.ctx.currentTime;if(this.next<t)this.next=t+.03;if(this.next>t+.12)return;const delay=this.next-t,b=this.beat++;
  if(this.style==='odd'){const roots=[55,51.91,48.99,51.91],f=roots[Math.floor(b/4)%4];this.note(f,2.7,.026,'sine',delay);this.note(f*1.502,2.5,.012,'sine',delay);if(b%4===2)this.note(f*4.01,1.7,.009,'triangle',delay);this.next+=1.5;}
  else{const parcel=this.style==='parcel',notes=parcel?[0,7,12,9,4,7,14,12]:[0,7,10,14,7,5,3,10],base=parcel?164.81:146.83;if(b%2===0)this.note(base*.5*2**([0,0,5,3][Math.floor(b/8)%4]/12),.5,.055,'sine',delay);this.note(base*2**(notes[b%8]/12),.5,.028,'sine',delay);if(b%4===0)this.hiss(.05,.018,3200,delay);this.next+=parcel?.42:.51;}
 }
}
