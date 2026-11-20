export const LESSON=[
 {title:'Choose the right pair',text:'This train needs D, Blueport. Flip switch 1 to C · D.',target:'switch-0'},
 {title:'Choose its station',text:'Now flip switch 3 to D. The lit rails show where it will go.',target:'switch-2'},
 {title:'Give it a breather',text:'Tap the train or its letter chip to hold it for two seconds.',target:'train'},
 {title:'Buy a little time',text:'Tap Slow time, or press S. You get four seconds of breathing room.',target:'slow'},
 {title:'All aboard',text:'Watch your train reach D. In a real shift, check the next arrivals and keep crossings clear.',target:'watch'}
];
// A separate, unranked yard uses the real controls without recording a run.
export class Lesson{
 constructor(){this.step=0;this.done=false;}
 input(action,value){if(this.done)return false;
  const valid=this.step===0&&action==='flip'&&value===0||this.step===1&&action==='flip'&&value===2||this.step===2&&action==='hold'||this.step===3&&action==='slow'||this.step===4&&action==='delivery';
  if(!valid)return false;this.step++;if(this.step===LESSON.length)this.done=true;return true;
 }
 allows(action,value){return this.step===0&&action==='flip'&&value===0||this.step===1&&action==='flip'&&value===2||this.step===2&&action==='hold'||this.step===3&&action==='slow';}
}
