/* Launcher themes. Loaded in <head> without defer so the saved theme applies before first paint.
   The choice stays on this browser (it is not part of the save password). Games keep their own look. */
(()=>{
  if(window.arcadeThemes)return;
  const KEY='rhetts-arcade-theme-v1',DEFAULT='blue';
  const THEMES=[
    {id:'dark',name:'Basic Dark',note:'Neutral charcoal that lets the game art do the talking.',color:'#0d0d10'},
    {id:'blue',name:'Basic Blue',note:'Deep navy with a cool blue glow. The classic arcade look.',color:'#0a1020'},
    {id:'purple',name:'Basic Purple',note:'Midnight violet with soft lavender highlights.',color:'#110c1e'},
    {id:'xp',name:'Windows XP',note:'Luna blue title bars, green Play buttons and rolling hills.',color:'#0a4fd6'},
    {id:'aero',name:'Frutiger Aero',note:'Glossy glass, bright skies and floating bubbles.',color:'#3eb6f2'},
    {id:'retro',name:'Retro',note:'Neon pixels, scanlines and an 80s arcade glow.',color:'#12002a'}
  ];
  const valid=id=>THEMES.some(theme=>theme.id===id)?id:DEFAULT;
  let current=DEFAULT;
  try{current=valid(localStorage.getItem(KEY));}catch{}

  function loadFonts(id){
    // Only Retro needs web fonts; it falls back to the system monospace font if they are blocked.
    if(id!=='retro'||document.getElementById('arcade-retro-fonts'))return;
    const link=document.createElement('link');
    link.id='arcade-retro-fonts';link.rel='stylesheet';
    link.href='https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap';
    document.head.append(link);
  }
  function apply(id){
    current=valid(id);
    const root=document.documentElement;
    root.dataset.theme=current;
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=THEMES.find(theme=>theme.id===current).color;
    loadFonts(current);
    window.dispatchEvent(new CustomEvent('arcade-theme-changed',{detail:current}));
  }
  function set(id){
    apply(id);
    try{localStorage.setItem(KEY,current);return true;}catch{return false;}
  }
  window.arcadeThemes={KEY,DEFAULT,list:()=>THEMES.map(theme=>({...theme})),get:()=>current,set};
  window.addEventListener('storage',event=>{if(event.key===KEY)apply(event.newValue);});
  apply(current);
})();
