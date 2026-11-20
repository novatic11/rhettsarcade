import {SETTINGS_KEY,readSettings} from './release-state.js';

// A hardware choice belongs to this browser, not a portable game save.
export const DEVICE_KEY='rustbound-2-device-v1';
export const DEVICE_PRESETS=Object.freeze({chromebook:Object.freeze({name:'Chromebook',quality:'performance'}),mobile:Object.freeze({name:'Mobile',quality:'mobile'}),pc:Object.freeze({name:'PC',quality:'balanced'})});
export function rememberedDevice(storage){try{const id=storage.getItem(DEVICE_KEY);return Object.hasOwn(DEVICE_PRESETS,id)?id:null;}catch{return null;}}
export function saveDeviceChoice(storage,id,remember,settings){
 if(!Object.hasOwn(DEVICE_PRESETS,id))throw Error('Choose Chromebook, Mobile, or PC.');
 const next=readSettings({...settings,quality:DEVICE_PRESETS[id].quality});
 try{storage.setItem(SETTINGS_KEY,JSON.stringify(next));if(remember)storage.setItem(DEVICE_KEY,id);else storage.removeItem(DEVICE_KEY);return {settings:next,saved:true};}
 catch{return {settings:next,saved:false};}
}

export async function chooseLaunchDevice(settings,{storage,force=false}={}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 const root=document.getElementById('device-picker'),form=root.querySelector('form'),remember=root.querySelector('#device-remember'),proceed=root.querySelector('#device-continue'),cancel=root.querySelector('#device-cancel'),notice=root.querySelector('#device-notice');
 const remembered=rememberedDevice(storage);
 if(remembered&&!force){Object.assign(settings,{quality:DEVICE_PRESETS[remembered].quality});root.hidden=true;document.body.classList.remove('choosing-device');return settings;}
 const previousFocus=document.activeElement,peers=[...document.body.children].filter(el=>el!==root&&el.tagName!=='SCRIPT').map(el=>[el,el.inert]);
 for(const [el]of peers)el.inert=true;
 root.hidden=false;document.body.classList.add('choosing-device');form.reset();notice.textContent='';cancel.hidden=!force;remember.checked=force&&!!remembered;
 let selected=force?(remembered||Object.keys(DEVICE_PRESETS).find(id=>DEVICE_PRESETS[id].quality===settings.quality)):null;
 const paint=()=>{for(const input of form.querySelectorAll('[name="device"]')){input.checked=input.value===selected;input.closest('.device-panel').classList.toggle('is-selected',input.checked);}proceed.disabled=!selected;proceed.textContent=selected?'Continue with '+DEVICE_PRESETS[selected].name:'Choose a device';};paint();
 form.onchange=event=>{if(event.target.name==='device'){selected=event.target.value;paint();}};
 return new Promise(resolve=>{
  const stopKeys=event=>{
   event.stopPropagation();
   if(event.key==='Escape'){event.preventDefault();if(force)finish(null);return;}
   if(event.key==='Tab'){const firstRadio=form.querySelector('[name="device"]'),items=[...root.querySelectorAll('input,button')].filter(el=>!el.disabled&&!el.hidden&&(el.type!=='radio'||el.checked||!selected&&el===firstRadio)),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  };
  const finish=result=>{window.removeEventListener('keydown',stopKeys,true);root.hidden=true;document.body.classList.remove('choosing-device');for(const [el,inert]of peers)el.inert=inert;form.onsubmit=null;form.onchange=null;cancel.onclick=null;if(force&&previousFocus?.isConnected)previousFocus.focus();resolve(result);};
  window.addEventListener('keydown',stopKeys,true);
  form.onsubmit=event=>{event.preventDefault();if(!selected)return;const result=saveDeviceChoice(storage,selected,remember.checked,settings);if(!result.saved&&remember.checked){remember.checked=false;notice.textContent='This browser couldn’t remember your choice. Press Continue to play without remembering it.';return;}Object.assign(settings,result.settings);finish(settings);};
  cancel.onclick=()=>finish(null);
  form.querySelector('[name="device"]'+(selected?'[value="'+selected+'"]':'')).focus({preventScroll:true});
 });
}
