const STEPS=[
 ['Your first attraction','Choose a Classic cabinet from Attractions. It’s affordable, reliable, and ready from day one.','[data-type="cabinet"]'],
 ['Give it a home','Click a floor tile, or use “Place in first free spot.” Keep the tile in front clear.','[data-tutorial="place"]'],
 ['Let them in','Open your doors. Customers will walk to a machine or join its queue.','#doors'],
 ['The first quarters','Watch a customer finish a game. You get paid after the play. Favorites make people happier; snacks keep hunger down.','#floor'],
 ['Make it better','Upgrade your cabinet. It earns more per play. From here, unlock attractions, claim goals, and grow your location.','[data-tutorial="upgrade"]']
];
export class Tutorial{
 constructor(api){this.api=api;this.key='';this.target=null;document.querySelector('#tutorial-start').onclick=()=>this.start();document.querySelector('#tutorial-skip').onclick=()=>this.skip();document.querySelector('#coach-skip').onclick=()=>this.skip();document.querySelector('#replay-tutorial').onclick=()=>{document.querySelector('#help-dialog').close();this.start();};document.querySelector('#tutorial-dialog').addEventListener('cancel',e=>{e.preventDefault();this.skip();});addEventListener('resize',()=>this.position());}
 init(){if(this.api.game().tutorial.status==='new')document.querySelector('#tutorial-dialog').showModal();else this.tick();}
 start(){this.api.game().tutorial={status:'active',step:0};document.querySelector('#tutorial-dialog').close();this.key='';this.api.save();this.tick();}
 skip(){this.api.game().tutorial.status='skipped';document.querySelector('#tutorial-dialog').close();this.clear();this.api.save();}
 clear(){this.target?.classList.remove('tutorial-target');this.target=null;document.querySelector('#tutorial-coach').hidden=true;}
 tick(){const g=this.api.game(),t=g.tutorial;if(t.status!=='active'){this.clear();return;}if(t.step===0&&g.games.length)t.step=2;else if(t.step===0&&this.api.tool()==='cabinet')t.step=1;if(t.step===1&&g.games.length)t.step=2;if(t.step===2&&g.open)t.step=3;if(t.step===3&&g.plays>0)t.step=4;if(t.step===4&&g.games.some(i=>i.level>1)){t.status='done';t.step=5;this.clear();this.api.save();this.api.done();return;}
  if(t.step===4&&!g.games.some(i=>i.id===this.api.selected()))this.api.select(g.games[0]?.id);
  const [title,copy,selector]=STEPS[t.step],key=t.step+':'+selector;let target=document.querySelector(selector);if(!target){if(t.step===4){this.api.select(g.games.find(i=>i.level<3)?.id);target=document.querySelector(selector);}if(!target)return;}
  if(key!==this.key||target!==this.target){this.target?.classList.remove('tutorial-target');this.key=key;this.target=target;target.classList.add('tutorial-target');document.querySelector('#coach-title').textContent=title;document.querySelector('#coach-copy').textContent=copy;document.querySelector('#coach-step').textContent='QUICK START · '+(t.step+1)+' / 5';document.querySelector('#tutorial-coach').hidden=false;if(key!==this.lastScroll){this.lastScroll=key;target.scrollIntoView({block:'center',behavior:'smooth'});}this.api.save();}this.position();
 }
 position(){if(!this.target)return;const r=this.target.getBoundingClientRect(),box=document.querySelector('#tutorial-coach'),width=Math.min(290,innerWidth-24);box.style.width=width+'px';box.style.left=Math.max(12,Math.min(innerWidth-width-12,r.x+r.width/2-width/2))+'px';const height=box.offsetHeight;box.style.top=(r.y>height+18?Math.max(8,r.y-height-12):Math.min(innerHeight-height-12,r.bottom+12))+'px';}
}
