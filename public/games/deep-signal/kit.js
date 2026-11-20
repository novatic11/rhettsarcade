export function box(c,x,y,w,h,r=8){c.beginPath();c.roundRect(x,y,w,h,r);}
export function label(c,text,x,y,size=14,color='#dce8ee',align='left'){c.fillStyle=color;c.font=`${size>=20?650:500} ${size}px system-ui,sans-serif`;c.textAlign=align;c.fillText(text,x,y);c.textAlign='left';}
