import * as T from './vendor/three.module.js';
// Ray integration through an exponential spherical density field, rather than
// stacked transparent shells. The opaque planet bounds each viewing ray.
export function atmosphere(body){
 const material=new T.ShaderMaterial({side:T.BackSide,transparent:true,depthWrite:false,depthTest:false,
 uniforms:{sceneDepth:{value:null},resolution:{value:new T.Vector2(1,1)},cameraForward:{value:new T.Vector3()},cameraFar:{value:30000000},center:{value:new T.Vector3()},radius:{value:body.radius},outer:{value:body.radius+body.atmosphere},sunDirection:{value:new T.Vector3()},dust:{value:new T.Vector3(...(body.dust||[.28,.37,.46]))},strength:{value:body.atmosphere>40?1:.045}},
 vertexShader:`varying vec3 vWorld;void main(){vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
 fragmentShader:`precision highp float;varying vec3 vWorld;uniform sampler2D sceneDepth;uniform vec2 resolution;uniform vec3 center,sunDirection,dust,cameraForward;uniform float radius,outer,strength,cameraFar;
 vec2 sphere(vec3 o,vec3 d,float r){float b=dot(o,d),h=b*b-dot(o,o)+r*r;if(h<0.0)return vec2(1e12,-1e12);h=sqrt(h);return vec2(-b-h,-b+h);}
 void main(){vec3 eye=cameraPosition-center,ray=normalize(vWorld-cameraPosition);vec2 bounds=sphere(eye,ray,outer);float start=max(0.0,bounds.x),end=bounds.y;vec2 ground=sphere(eye,ray,radius);if(ground.x>0.0)end=min(end,ground.x);float opaqueDepth=texture2D(sceneDepth,gl_FragCoord.xy/resolution).x;if(opaqueDepth<.999999){float viewZ=exp2(opaqueDepth*log2(cameraFar+1.0))-1.0;end=min(end,viewZ/max(.001,dot(ray,cameraForward)));}if(end<=start)discard;float stepSize=(end-start)/24.0,scale=max(3.0,(outer-radius)*.23),depth=0.0;vec3 scatter=vec3(0.0);
 for(int i=0;i<24;i++){vec3 p=eye+ray*(start+(float(i)+.5)*stepSize);float height=max(0.0,length(p)-radius),density=exp(-height/scale)/scale;vec2 sunlight=sphere(p,sunDirection,outer),shadow=sphere(p,sunDirection,radius);float closest=length(p+sunDirection*max(0.0,-dot(p,sunDirection)));float lit=smoothstep(radius-14.0,radius+14.0,closest);float sunDepth=0.0;for(int j=0;j<3;j++){vec3 q=p+sunDirection*(float(j)+.5)*max(0.0,sunlight.y)/3.0;sunDepth+=exp(-max(0.0,length(q)-radius)/scale)*max(0.0,sunlight.y)/(3.0*scale);}float absorption=exp(-(depth+sunDepth)*.18);scatter+=dust*density*stepSize*absorption*lit;depth+=density*stepSize;}
 float mu=dot(ray,sunDirection),phase=.7+.3*mu*mu,alpha=(1.0-exp(-depth*.28))*strength;vec3 color=scatter*phase*.25/(max(.01,1.0-exp(-depth*.28)));gl_FragColor=vec4(color,clamp(alpha,0.0,.96));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const mesh=new T.Mesh(new T.SphereGeometry(body.radius+body.atmosphere,64,32),material);mesh.frustumCulled=false;mesh.renderOrder=8;return {mesh,update(center,sun){mesh.position.copy(center);material.uniforms.center.value.copy(center);material.uniforms.sunDirection.value.copy(sun);}};
}
