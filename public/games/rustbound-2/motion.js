export const GAIT_RADIANS_PER_METER=2;
export function facingAngle(cameraYaw,forward=0,side=0){return cameraYaw+(Math.abs(forward)+Math.abs(side)>.01?Math.atan2(side,-forward):Math.PI);}
export function advanceGait(phase,distance,grounded){const next=phase+Math.max(0,distance)*GAIT_RADIANS_PER_METER;return {phase:next,planted:grounded&&Math.floor(next/Math.PI)>Math.floor(phase/Math.PI)};}
