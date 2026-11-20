import * as T from './vendor/three.module.js';
const SKIES={earth:['#224e76','#acc9cb'],dust:['#243446','#b18977'],verdigris:['#233b46','#9ea99b'],haze:['#354052','#baaa94'],volcanic:['#211e31','#92665d'],crystal:['#1a3547','#a6c8cd']};

// A single inexpensive sky draw gives Performance mode a real horizon without
// adding the ray-marched atmosphere cost to a Chromebook.
export function skyBackdrop(){
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,toneMapped:true,
  uniforms:{up:{value:new T.Vector3(0,1,0)},sun:{value:new T.Vector3(0,1,0)},zenith:{value:new T.Color()},horizon:{value:new T.Color()},light:{value:1}},
  vertexShader:'varying vec3 skyRay;void main(){skyRay=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec3 skyRay;uniform vec3 up,sun;uniform vec3 zenith,horizon;uniform float light;
  void main(){vec3 ray=normalize(skyRay);float elevation=max(0.,dot(ray,up));float haze=pow(1.-elevation,3.);float glow=pow(max(0.,dot(ray,sun)),32.);vec3 day=mix(zenith,horizon,haze)+vec3(.14,.11,.08)*glow;vec3 night=mix(vec3(.004,.008,.018),horizon*.035,haze);gl_FragColor=vec4(mix(night,day,smoothstep(0.,.5,light)),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`});
 const mesh=new T.Mesh(new T.SphereGeometry(50,24,14),material);mesh.renderOrder=-100;mesh.frustumCulled=false;mesh.visible=false;
 return {mesh,update({body,altitude,light,up,sun,camera,enabled}){mesh.visible=enabled&&body.atmosphere>40&&altitude<body.atmosphere*.8;if(!mesh.visible)return;const colors=SKIES[body.theme]||['#26394c','#a9b5bb'];material.uniforms.zenith.value.set(colors[0]);material.uniforms.horizon.value.set(colors[1]);material.uniforms.up.value.copy(up);material.uniforms.sun.value.copy(sun);material.uniforms.light.value=light;mesh.position.copy(camera.position);},dispose(){mesh.geometry.dispose();material.dispose();}};
}
