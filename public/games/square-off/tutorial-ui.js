
function createQuickTutorial(config){
 const prompt=document.createElement('dialog');prompt.className='tutorial-prompt';prompt.setAttribute('aria-label',config.title+' tutorial');
 const box=document.createElement('section');box.className='quick-tutorial';box.hidden=true;box.setAttribute('aria-label','Interactive tutorial');box.innerHTML='<small class="tutorial-counter"></small><h2></h2><p role="status" aria-live="polite"></p><button type="button">Skip tutorial</button>';
 const replay=document.createElement('button');replay.type='button';replay.className='tutorial-replay';replay.textContent='Tutorial';replay.setAttribute('aria-label','Replay '+config.title+' tutorial');document.body.append(prompt,box,replay);
 let active=false,step=0,highlight=null,signals=new Set();
 const clear=()=>{highlight?.classList.remove('tutorial-highlight');highlight=null;};
 const close=()=>{if(prompt.open)prompt.close();};
 function show(){clear();signals.clear();const item=config.steps[step];box.querySelector('small').textContent='LEARN BY DOING · '+(step+1)+' / '+config.steps.length;box.querySelector('h2').textContent=item.title;box.querySelector('p').textContent=item.text;highlight=item.target?.();highlight?.classList.add('tutorial-highlight');item.enter?.();}
 function finish(completed){const wasActive=active;active=false;replay.hidden=false;document.body.classList.remove("tutorial-active");box.hidden=true;clear();close();config.remember(completed?'done':'skipped');config.onEnd?.(completed,wasActive);if(completed){prompt.innerHTML='<small>YOU’RE READY</small><h2></h2><p></p><button type="button">Let’s play</button>';prompt.querySelector('h2').textContent=config.title+' basics: learned.';prompt.querySelector('p').textContent=config.finish;prompt.querySelector('button').onclick=close;prompt.showModal();}}
 function offer(){if(active||prompt.open)return;prompt.innerHTML='<small>QUICK START</small>'+(config.recommended?'<strong class="tutorial-recommendation">HEAVILY RECOMMENDED</strong>':'')+'<h2>Learn by playing?</h2><p></p><div class="tutorial-prompt-actions"><button type="button" class="tutorial-start">Start tutorial</button><button type="button" class="tutorial-skip">Skip tutorial</button></div>';prompt.querySelector('p').textContent=config.intro;prompt.querySelector('.tutorial-start').onclick=()=>{close();active=true;replay.hidden=true;document.body.classList.add("tutorial-active");step=0;config.onStart?.();box.hidden=false;show();};prompt.querySelector('.tutorial-skip').onclick=()=>finish(false);prompt.showModal();}
 prompt.addEventListener('keydown',e=>e.stopPropagation());box.addEventListener('keydown',e=>e.stopPropagation());prompt.addEventListener('cancel',e=>{e.preventDefault();if(prompt.querySelector('.tutorial-start'))finish(false);else close();});box.querySelector('button').onclick=()=>finish(false);replay.onclick=offer;
 const api={get active(){return active;},get step(){return step;},get blocking(){return prompt.open;},offer,has:name=>signals.has(name),signal:name=>{if(active)signals.add(name);},tick(){if(!active||prompt.open)return;if(config.steps[step].check(signals)){step++;if(step===config.steps.length)finish(true);else show();}}};
 if(!config.readChoice())offer();return api;
}

export {createQuickTutorial};
