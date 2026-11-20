// Independent pointer IDs let one thumb steer while another taps Jump.
export function createMobileInput({surface,jumpButton,isPlaying,queueJump,onTouch=()=>{}}){
  let pointer=null,origin=0,steer=0;
  const clear=()=>{const previous=pointer;pointer=null;steer=0;jumpButton.classList.remove('held');if(previous!==null&&surface.hasPointerCapture?.(previous))surface.releasePointerCapture(previous);};
  surface.addEventListener('pointerdown',event=>{
    if(!isPlaying()||pointer!==null||(event.pointerType==='mouse'&&event.button!==0))return;
    event.preventDefault();if(event.pointerType!=='mouse')onTouch();
    pointer=event.pointerId;origin=event.clientX;steer=0;surface.setPointerCapture(pointer);
  });
  surface.addEventListener('pointermove',event=>{
    if(event.pointerId!==pointer)return;
    if(!isPlaying()){clear();return;}
    event.preventDefault();
    const travel=Math.max(14,Math.min(28,surface.getBoundingClientRect().width*.05)),delta=event.clientX-origin;
    steer=Math.max(-1,Math.min(1,(Math.abs(delta)<2?0:delta-Math.sign(delta)*2)/(travel-2)));
    // A floating origin makes reversing direction responsive after a long swipe.
    if(Math.abs(delta)>travel)origin=event.clientX-Math.sign(delta)*travel;
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(type,event=>{if(event.pointerId===pointer)clear();});
  jumpButton.addEventListener('pointerdown',event=>{
    if(!isPlaying()||(event.pointerType==='mouse'&&event.button!==0))return;
    event.preventDefault();event.stopPropagation();if(event.pointerType!=='mouse')onTouch();
    jumpButton.setPointerCapture(event.pointerId);jumpButton.classList.add('held');queueJump();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])jumpButton.addEventListener(type,()=>jumpButton.classList.remove('held'));
  jumpButton.addEventListener('click',event=>{if(event.detail===0&&isPlaying())queueJump();});
  return {get steer(){return steer;},clear};
}
