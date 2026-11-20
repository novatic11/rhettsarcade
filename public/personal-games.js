export const PANEL_KEY='rhetts-arcade-personal-games-v1';
export function normalizePanel(value){
 if(!value||typeof value.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(value.id))throw Error('Invalid game panel.');
 const title=typeof value.title==='string'?value.title.trim():'';
 if(!title||title.length>60)throw Error('Give your game a name (up to 60 characters).');
 let url;try{url=new URL(value.url);}catch{throw Error('Enter a complete game address starting with https:// or http://.');}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.href.length>2048)throw Error('Use an http:// or https:// game address without a username or password.');
 return {id:value.id,title,url:url.href,description:String(value.description||'').slice(0,200),status:value.status==='private'?'private':'development'};
}
export function readPanels(storage){try{const values=JSON.parse(storage.getItem(PANEL_KEY)||'[]');if(!Array.isArray(values))return [];const seen=new Set();return values.slice(0,50).flatMap(value=>{try{const panel=normalizePanel(value);if(seen.has(panel.id))return [];seen.add(panel.id);return [panel];}catch{return [];}});}catch{return [];}}
export function writePanels(storage,panels){if(panels.length>50)throw Error('You can keep up to 50 personal game panels.');const safe=panels.map(normalizePanel);try{storage.setItem(PANEL_KEY,JSON.stringify(safe));}catch{throw Error('This browser couldn’t save the panel. Free some storage or allow site storage, then try again.');}}
