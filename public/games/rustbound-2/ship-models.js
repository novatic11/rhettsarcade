import * as T from './vendor/three.module.js';

// Original modular flight hardware. Every part is centered on its attachment axis,
// with its nose toward +Y. Raised trim is separate solid geometry, never a decal.
const Y = new T.Vector3(0, 1, 0);
const TAU = Math.PI * 2;
const DIMS = {
  radialSeparator: [.25,.65], capsule: [.9, 1.8], probe: [.65, .6], tank: [.9, 1.8],
  longTank: [.9, 3], wideTank: [1.35, 2.4], engine: [.8, 1.25],
  vacuumEngine: [.95, 1.6], booster: [.48, 3.4], separator: [.92, .22],
  adapter: [1.35, .8], legs: [.9, 1.5], fin: [.55, 1.4],
  solar: [.5, .5], cargo: [.9, 1.25], experiment: [.6, .65],
  seismometer: [.6, .65], atmosphere: [.6, .65], battery: [.45, .6],
  advancedEngine: [.95, 1.6], fieldScanner: [.6, .65]
};

function palette() {
  return {
    white: new T.MeshStandardMaterial({color: '#dbe4e8', roughness: .48, metalness: .14}),
    pale: new T.MeshStandardMaterial({color: '#a9bac4', roughness: .43, metalness: .48}),
    metal: new T.MeshStandardMaterial({color: '#667c8b', roughness: .27, metalness: .88}),
    dark: new T.MeshStandardMaterial({color: '#152733', roughness: .48, metalness: .65}),
    rubber: new T.MeshStandardMaterial({color: '#101a24', roughness: .87, metalness: .03}),
    amber: new T.MeshStandardMaterial({color: '#d6a25d', roughness: .45, metalness: .2}),
    foil: new T.MeshStandardMaterial({color: '#a87c57', roughness: .36, metalness: .82}),
    glass: new T.MeshStandardMaterial({color: '#061c35', roughness: .065, metalness: .92, envMapIntensity: 1.3}),
    solar: new T.MeshStandardMaterial({color: '#163b63', roughness: .22, metalness: .75}),
    lamp: new T.MeshStandardMaterial({color: '#c3e0ee', emissive: '#8eb6cf', emissiveIntensity: .35, roughness: .3, metalness: .1})
  };
}

function mesh(parent, geometry, material, position = [0, 0, 0]) {
  const result = new T.Mesh(geometry, material);
  result.position.set(...position);
  result.castShadow = result.receiveShadow = true;
  parent.add(result);
  return result;
}
function cylinder(parent, top, bottom, height, position, material, segments = 40) {
  return mesh(parent, new T.CylinderGeometry(top, bottom, height, segments), material, position);
}
function box(parent, dimensions, position, material) {
  return mesh(parent, new T.BoxGeometry(...dimensions), material, position);
}
function sphere(parent, radius, position, material, segments = 20) {
  return mesh(parent, new T.SphereGeometry(radius, segments, 14), material, position);
}
function ring(parent, radius, thickness, y, material) {
  const result = mesh(parent, new T.TorusGeometry(radius, thickness, 8, 48), material, [0, y, 0]);
  result.rotation.x = Math.PI / 2;
  return result;
}
function beam(parent, a, b, radius, material) {
  const start = new T.Vector3(...a), end = new T.Vector3(...b);
  const result = cylinder(parent, radius, radius, start.distanceTo(end), start.clone().add(end).multiplyScalar(.5).toArray(), material, 10);
  result.quaternion.setFromUnitVectors(Y, end.sub(start).normalize());
  return result;
}
function lathe(parent, points, material, segments = 48) {
  return mesh(parent, new T.LatheGeometry(points.map(p => new T.Vector2(...p)), segments), material);
}
function boltRing(parent, radius, y, p, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = i / count * TAU;
    cylinder(parent, .022, .022, .025, [Math.sin(angle) * radius, y, Math.cos(angle) * radius], p.dark, 6);
  }
}
function connector(parent, radius, y, p, direction) {
  const cap = new T.Group();
  cap.name = direction > 0 ? 'exposed-top-fitting' : 'exposed-bottom-fitting';
  cap.userData.attachmentEnd = direction;
  parent.add(cap);
  ring(cap, radius * .96, .022, y, p.metal);
  // The socket sits proud of the tank's cap, so adjacent hardware has a readable seam.
  cylinder(cap, radius * .77, radius * .77, .026, [0, y + direction * .012, 0], p.dark);
  boltRing(cap, radius * .87, y + direction * .018, p);
  return cap;
}
function tank(parent, radius, height, p, variant) {
  cylinder(parent, radius, radius, height - .09, [0, 0, 0], p.white);
  for (const side of [-1, 1]) {
    const end = side * (height / 2 - .052);
    ring(parent, radius + .004, .025, end, p.metal).userData.attachmentEnd = side;
    connector(parent, radius, side * (height / 2 - .025), p, side);
  }
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + .2;
    const brace = box(parent, [.075, height * .57, .038], [Math.sin(angle) * (radius + .013), 0, Math.cos(angle) * (radius + .013)], p.pale);
    brace.rotation.y = angle;
  }
  // Short corrugations around the skirt are individual structural ribs. Their
  // inner edge penetrates the shell slightly; no faces share a depth plane.
  for (let i = 0; i < 20; i++) {
    const angle = i / 20 * TAU;
    const rib = box(parent, [.022, Math.min(.32, height * .15), .025], [Math.sin(angle) * (radius + .005), -height * .35, Math.cos(angle) * (radius + .005)], p.pale);
    rib.rotation.y = angle;
  }
  // A raised, narrow fuel band and service plate create identity without a texture.
  ring(parent, radius + .012, .024, -height * .24, p.amber);
  const plate = box(parent, [.25, .34, .035], [0, .07, radius + .016], p.dark);
  for (let i = 0; i < 3; i++) box(parent, [.16, .022, .012], [0, .15 - i * .07, radius + .04], i ? p.pale : p.amber);
  if (variant === 'wideTank') {
    for (const y of [-.7, .7]) ring(parent, radius + .014, .032, y, p.pale);
    beam(parent, [radius + .035, -.74, 0], [radius + .035, .74, 0], .028, p.metal);
  }
  if (variant === 'longTank') for (const y of [-.9, .9]) ring(parent, radius + .006, .018, y, p.pale);
  plate.userData.servicePanel = true;
}

function exhaust(parent, mouthY, radius, length) {
  const result = new T.Group();
  result.name = 'engine-exhaust';
  result.userData.ignoreBounds = true;
  result.position.y = mouthY - .015;
  result.visible = false;
  parent.add(result);
  for (const [r, h, color, opacity] of [[radius, length, '#65ace4', .18], [radius * .53, length * .76, '#c8e8ff', .44], [radius * .24, length * .43, '#edf6ff', .8]]) {
    const flame = mesh(result, new T.ConeGeometry(r, h, 24, 1), new T.MeshBasicMaterial({color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false}), [0, -h / 2, 0]);
    flame.rotation.z = Math.PI;
    flame.castShadow = flame.receiveShadow = false;
    flame.renderOrder = 2;
  }
  return result;
}

function engine(parent, radius, height, p, vacuum = false) {
  // Nozzle has actual wall thickness and an open mouth, rather than coincident
  // double-sided bells. The engine's fixed upper frame carries the gimbal pivot.
  const top = height / 2;
  cylinder(parent, radius * .78, radius * .78, .1, [0, top - .05, 0], p.pale);
  connector(parent, radius * .84, top - .024, p, 1);
  cylinder(parent, radius * .33, radius * .44, .26, [0, top - .21, 0], p.dark);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    beam(parent, [Math.sin(a) * radius * .64, top - .08, Math.cos(a) * radius * .64], [Math.sin(a) * radius * .29, top - .4, Math.cos(a) * radius * .29], .031, p.metal);
  }
  const nozzle = new T.Group();
  nozzle.position.y = top - .34;
  parent.add(nozzle);
  sphere(nozzle, radius * .2, [0, .015, 0], p.metal);
  const bellHeight = height - .36, mouth = radius * (vacuum ? .95 : .85), neck = radius * .23;
  lathe(nozzle, [[neck, -.03], [neck * 1.03, -.12], [neck * 1.45, -bellHeight * .45], [mouth * .67, -bellHeight * .78], [mouth, -bellHeight], [mouth - .026, -bellHeight], [mouth * .67 - .024, -bellHeight * .78], [neck * 1.45 - .022, -bellHeight * .45], [neck - .02, -.12], [neck - .02, -.03], [neck, -.03]], p.metal);
  ring(nozzle, mouth - .007, .02, -bellHeight + .003, p.pale);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, s = Math.sin(a), c = Math.cos(a);
    beam(nozzle, [s * neck * 1.1, -.13, c * neck * 1.1], [s * mouth * .91, -bellHeight * .93, c * mouth * .91], .012, p.foil);
  }
  const pump = cylinder(parent, .105, .105, .34, [radius * .56, top - .24, 0], p.foil, 16);
  pump.rotation.z = Math.PI / 2;
  beam(parent, [radius * .53, top - .34, 0], [radius * .23, top - .39, 0], .035, p.metal);
  const flame = exhaust(nozzle, -bellHeight, mouth * .86, vacuum ? 5 : 3.6);
  parent.userData.nozzle = nozzle;
  parent.userData.exhaust = flame;
}

function capsule(parent, p) {
  lathe(parent, [[0, -.9], [.82, -.9], [.9, -.79], [.9, -.57], [.77, .03], [.54, .63], [.36, .83], [.12, .9], [0, .9]], p.white);
  ring(parent, .9, .028, -.74, p.dark).userData.attachmentEnd = -1;
  connector(parent, .89, -.875, p, -1);
  cylinder(parent, .18, .29, .09, [0, .83, 0], p.pale);
  // A separate opaque glazed porthole has visible framing and real depth.
  const window = new T.Group();
  window.position.set(0, .06, .75);
  window.rotation.x = -.44;
  parent.add(window);
  const frame = cylinder(window, .245, .245, .065, [0, 0, 0], p.metal, 32);
  frame.rotation.x = Math.PI / 2;
  const pane = cylinder(window, .203, .203, .019, [0, 0, .043], p.glass, 32);
  pane.rotation.x = Math.PI / 2;
  const hatch = box(parent, [.38, .4, .08], [0, -.35, -.86], p.pale);
  hatch.rotation.x = .08;
  box(parent, [.12, .027, .035], [0, -.29, -.915], p.amber);
  for (let i = 0; i < 5; i++) box(parent, [.34, .027, .055], [0, -.53 + i * .07, -.91], p.metal);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, pod = new T.Group();
    pod.position.set(Math.sin(a) * .67, .14, Math.cos(a) * .67); pod.rotation.y = a;
    parent.add(pod);
    box(pod, [.16, .21, .12], [0, 0, 0], p.pale);
    const jet = cylinder(pod, .032, .022, .08, [0, .035, .09], p.dark, 12); jet.rotation.x = Math.PI / 2;
    cylinder(pod, .03, .02, .07, [0, .13, 0], p.dark, 12);
  }
  beam(parent, [.23, .61, -.13], [.36, 1.02, -.19], .012, p.metal);
  sphere(parent, .028, [.36, 1.02, -.19], p.lamp, 10);
}

function legs(parent, p) {
  cylinder(parent, .43, .43, .18, [0, .62, 0], p.dark);
  for (let i = 0; i < 4; i++) {
    const g = new T.Group(); g.rotation.y = i * Math.PI / 2 + Math.PI / 4; parent.add(g);
    sphere(g, .075, [0, .55, .44], p.metal, 12);
    beam(g, [0, .55, .44], [0, -.62, .79], .045, p.metal);
    beam(g, [0, .16, .4], [0, -.51, .75], .032, p.pale);
    beam(g, [0, .36, .5], [0, -.2, .65], .065, p.dark);
    cylinder(g, .13, .17, .06, [0, -.7, .79], p.dark, 20);
    cylinder(g, .095, .095, .035, [0, -.65, .79], p.metal, 16);
  }
}

function fin(parent, p) {
  // Four diagonally swept fins are thick prisms, not overlapping planes.
  for (let i = 0; i < 4; i++) {
    const shape = new T.Shape(); shape.moveTo(.08, .7); shape.lineTo(.48, -.42); shape.lineTo(.55, -.7); shape.lineTo(.08, -.52); shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, {depth: .055, bevelEnabled: false}); geo.translate(0, 0, -.0275);
    const result = mesh(parent, geo, p.pale); result.rotation.y = i * Math.PI / 2;
    const brace = new T.Group(); brace.rotation.y = i * Math.PI / 2; parent.add(brace);
    beam(brace, [.1, .58, .032], [.46, -.48, .032], .018, p.amber);
  }
}

export function partModel(type) {
  if(type==='radialSeparator'){const root=new T.Group(),p=palette();for(const z of [-.16,.16])box(root,[.42,.58,.09],[0,0,z],z>0?p.pale:p.dark);for(const y of [-.2,.2]){beam(root,[-.13,y,-.16],[.13,y,.16],.045,p.metal);box(root,[.45,.07,.025],[0,y,.215],p.amber);}box(root,[.22,.16,.06],[0,0,.23],p.dark);sphere(root,.045,[0,0,.272],p.lamp);root.userData.hardwareBounds={radius:.25,height:.65,minY:-.325,maxY:.325};return root;}

  if(type==='advancedEngine'||type==='fieldScanner'){
    const root=partModel(type==='advancedEngine'?'vacuumEngine':'experiment');
    root.name=`part:${type}`;root.userData.partType=type;return root;
  }
  if(type==='battery'){const root=new T.Group(),p=palette();box(root,[.72,.5,.38],[0,0,0],p.dark);for(const x of [-.27,0,.27]){cylinder(root,.1,.1,.44,[x,0,.12],p.metal,16);box(root,[.16,.04,.02],[x,.25,.18],p.amber);}for(const y of [-.27,.27])box(root,[.8,.035,.44],[0,y,0],p.pale);for(const x of [-.34,.34])for(const y of [-.2,.2])sphere(root,.027,[x,y,.22],p.metal);box(root,[.24,.08,.025],[0,0,.23],p.lamp);root.name=`part:${type}`;root.userData.partType=type;root.userData.dimensions={radius:.45,height:.6};root.userData.hardwareBounds={radius:.45,height:.6,minY:-.3,maxY:.3};return root;}

  if (!Object.hasOwn(DIMS, type)) throw new Error(`Unknown Rustbound ship part: ${type}`);
  const root = new T.Group(), p = palette(), [radius, height] = DIMS[type];
  root.name = `part:${type}`; root.userData.partType = type; root.userData.dimensions = {radius, height};
  if (type === 'capsule') capsule(root, p);
  else if (['tank', 'longTank', 'wideTank'].includes(type)) tank(root, radius, height, p, type);
  else if (type === 'engine' || type === 'vacuumEngine') engine(root, radius, height, p, type === 'vacuumEngine');
  else if (type === 'legs') legs(root, p);
  else if (type === 'fin') fin(root, p);
  else if (type === 'booster') {
    cylinder(root, .43, .43, 2.55, [0, .02, 0], p.white);
    lathe(root, [[.43, 1.295], [.35, 1.5], [.08, 1.7], [0, 1.7]], p.pale);
    for (const y of [-.95, .8]) ring(root, .438, .026, y, p.amber);
    const nozzle = new T.Group(); nozzle.position.y = -1.21; root.add(nozzle);
    lathe(nozzle, [[.13, 0], [.17, -.16], [.31, -.47], [.285, -.47], [.15, -.16], [.11, 0], [.13, 0]], p.metal);
    ring(nozzle, .298, .018, -.465, p.pale);
    root.userData.nozzle = nozzle; root.userData.exhaust = exhaust(nozzle, -.47, .26, 4.5);
    for (const y of [-.65, .55]) box(root, [.22, .22, .16], [0, y, -.43], p.dark);
  } else if (type === 'separator') {
    cylinder(root, radius, radius, .16, [0, 0, 0], p.amber);
    for (const y of [-.083, .083]) ring(root, .9, .025, y, p.metal);
    boltRing(root, .79, .093, p, 16);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; const block = box(root, [.12, .1, .07], [Math.sin(a) * .91, 0, Math.cos(a) * .91], p.dark); block.rotation.y = a; }
  } else if (type === 'adapter') {
    cylinder(root, .9, 1.35, .72, [0, 0, 0], p.white);
    connector(root, .9, .37, p, 1); connector(root, 1.35, -.37, p, -1);
    ring(root, 1.31, .022, -.32, p.pale);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; beam(root, [Math.sin(a) * .93, .3, Math.cos(a) * .93], [Math.sin(a) * 1.32, -.32, Math.cos(a) * 1.32], .017, p.pale); }
  } else if (type === 'probe') {
    cylinder(root, .62, .62, .44, [0, -.025, 0], p.dark, 12);
    cylinder(root, .65, .65, .06, [0, -.27, 0], p.metal, 12);
    cylinder(root, .65, .65, .055, [0, .225, 0], p.pale, 12);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; const plate = box(root, [.3, .23, .035], [Math.sin(a) * .615, -.015, Math.cos(a) * .615], i % 2 ? p.foil : p.solar); plate.rotation.y = a; }
    sphere(root, .09, [0, .26, 0], p.amber);
    for (const x of [-.42, .42]) beam(root, [x, .25, 0], [x, .3, .3], .014, p.metal);
  } else if (type === 'cargo') {
    cylinder(root, radius, radius, 1.15, [0, 0, 0], p.dark);
    for (const side of [-1, 1]) connector(root, radius, side * .599, p, side);
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; const panel = box(root, [.58, .92, .11], [Math.sin(a) * .82, 0, Math.cos(a) * .82], p.pale); panel.rotation.y = a; box(panel, [.38, .16, .035], [0, .1, .074], p.white); box(panel, [.1, .05, .02], [0, -.22, .076], p.amber); }
  } else if (type === 'solar') {
    box(root, [.28, .5, .2], [0, 0, 0], p.dark);
    for (const x of [-.29, .29]) { box(root, [.24, .4, .14], [x, 0, 0], p.metal); box(root, [.19, .35, .015], [x, 0, .083], p.solar); for (let j = 0; j < 4; j++) box(root, [.18, .008, .006], [x, -.13 + j * .087, .094], p.pale); }
    cylinder(root, .08, .08, .1, [0, 0, -.14], p.pale, 16).rotation.x = Math.PI / 2;
  } else if (type === 'experiment') {
    cylinder(root, .57, .57, .48, [0, -.015, 0], p.white, 16);
    connector(root, .6, -.29, p, -1);
    cylinder(root, .59, .59, .055, [0, .255, 0], p.dark, 16);
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3, x = Math.sin(a), z = Math.cos(a); cylinder(root, .09, .09, .2, [x * .32, .22, z * .32], p.foil, 16); sphere(root, .055, [x * .32, .32, z * .32], p.glass, 12); }
    box(root, [.25, .2, .065], [0, -.04, .57], p.dark); box(root, [.17, .085, .018], [0, -.02, .612], p.lamp);
  } else if (type === 'seismometer') {
    // A self-contained vibration sensor pod held inside a breakaway mounting
    // cradle. Raised corrugations and the feet are physical, separated hardware.
    cylinder(root, .52, .52, .065, [0, -.275, 0], p.dark, 32);
    connector(root, .55, -.3, p, -1);
    cylinder(root, .34, .36, .34, [0, -.035, 0], p.white, 40);
    cylinder(root, .36, .36, .035, [0, .153, 0], p.metal, 40);
    cylinder(root, .30, .30, .038, [0, .19, 0], p.pale, 32);
    ring(root, .347, .018, -.17, p.amber);
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU;
      const rib = box(root, [.018, .255, .02], [Math.sin(a) * .35, -.035, Math.cos(a) * .35], p.pale);
      rib.rotation.y = a;
    }
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3, s = Math.sin(a), c = Math.cos(a);
      beam(root, [s * .31, .015, c * .31], [s * .49, -.24, c * .49], .027, p.metal);
      cylinder(root, .067, .083, .055, [s * .49, -.27, c * .49], p.rubber, 16);
      cylinder(root, .046, .046, .035, [s * .49, -.22, c * .49], p.foil, 16);
      const clip = box(root, [.085, .075, .055], [s * .36, .055, c * .36], p.amber);
      clip.rotation.y = a;
    }
    const sensor = sphere(root, .13, [0, .205, 0], p.dark, 24);
    sensor.scale.y = .62;
    cylinder(root, .045, .045, .065, [0, .275, 0], p.metal, 16);
    box(root, [.2, .1, .045], [0, -.035, .377], p.dark);
    box(root, [.13, .04, .013], [0, -.02, .409], p.lamp);
    // Visible flex cable bridges the isolated sensor cradle and its socket.
    const cable = new T.CatmullRomCurve3([[.23,.1,.18],[.37,.11,.27],[.43,-.08,.25],[.35,-.21,.28]].map(v => new T.Vector3(...v)));
    mesh(root, new T.TubeGeometry(cable, 18, .012, 7, false), p.dark);
  } else if (type === 'atmosphere') {
    cylinder(root, .49, .49, .065, [0, -.285, 0], p.pale, 32);
    connector(root, .53, -.3, p, -1);
    box(root, [.68, .23, .44], [0, -.13, 0], p.white);
    for (const x of [-.285, .285]) {
      box(root, [.065, .25, .475], [x, -.13, 0], p.metal);
      for (let i = 0; i < 4; i++) box(root, [.018, .075, .022], [x, -.105, .252 - i * .06], p.dark);
    }
    // Twin sampling horns have open mouths with real thickness; a recessed
    // absorber inside each horn keeps the tubes readable from every angle.
    for (const x of [-.22, .22]) {
      const horn = new T.Group(); horn.position.set(x, -.005, 0); root.add(horn);
      lathe(horn, [[.045,0],[.047,.16],[.095,.285],[.08,.285],[.032,.16],[.03,0],[.045,0]], p.metal, 32);
      cylinder(horn, .027, .027, .015, [0, .155, 0], p.dark, 20);
      ring(horn, .05, .013, .03, p.foil);
      ring(horn, .089, .012, .281, p.pale);
      beam(root, [x, -.09, .14], [x, .12, .14], .013, p.foil);
    }
    const vane = new T.Group(); vane.position.set(0, -.005, -.25); root.add(vane);
    beam(vane, [0,0,0], [0,.28,0], .012, p.metal);
    sphere(vane, .027, [0, .28, 0], p.dark, 12);
    box(vane, [.31, .045, .018], [0, .28, 0], p.foil);
    box(vane, [.018, .045, .25], [0, .28, 0], p.pale);
    box(root, [.24, .12, .04], [0, -.12, .245], p.dark);
    box(root, [.16, .047, .012], [0, -.105, .272], p.lamp);
    for (let i = 0; i < 3; i++) box(root, [.038, .017, .015], [-.07 + i * .07, -.155, .272], i ? p.metal : p.amber);
  }
  root.userData.hardwareBounds = {
    radius,
    height,
    // Exhaust is intentionally omitted from the attachment / editor envelope.
    minY: -height / 2,
    maxY: height / 2
  };
  return root;
}

const STACK_HULLS = new Set(['capsule','probe','tank','longTank','wideTank','cargo','adapter','separator','engine','vacuumEngine','advancedEngine','booster']);
function interpolateRadius(profile,y) {
  if(y<=profile[0][0])return profile[0][1];
  for(let i=1;i<profile.length;i++)if(y<=profile[i][0]){
    const [a,ar]=profile[i-1],[z,zr]=profile[i];
    return T.MathUtils.lerp(ar,zr,(y-a)/(z-a));
  }
  return profile.at(-1)[1];
}
function hullRadius(type,y) {
  const [r,h]=DIMS[type]||[.6,.65];
  if(type==='capsule')return interpolateRadius([[-.9,.82],[-.79,.9],[-.57,.9],[.03,.77],[.63,.54],[.83,.36],[.9,.12]],y);
  if(type==='adapter')return T.MathUtils.lerp(1.35,.9,T.MathUtils.clamp((y+.4)/.8,0,1));
  if(type==='engine'||type==='vacuumEngine'||type==='advancedEngine')return interpolateRadius([[-h/2,r*.85],[h/2-.36,r*.55],[h/2-.1,r*.78],[h/2,r*.78]],y);
  if(type==='booster')return interpolateRadius([[-1.7,.3],[-1.21,.43],[1.295,.43],[1.5,.35],[1.7,.015]],y);
  return type==='experiment'||type==='fieldScanner'?.57:type==='seismometer'?.35:type==='atmosphere'?.49:type==='legs'?.43:type==='fin'?.13:r;
}
function hideJoinedEnd(model,side) {
  model.traverse(o=>{if(o.userData.attachmentEnd===side)o.visible=false;});
  model.userData.joinedEnds ||= [];
  if(!model.userData.joinedEnds.includes(side))model.userData.joinedEnds.push(side);
}
function hullSkinMaterial() {
  // Every skin belongs to one selectable part; highlighting it cannot tint
  // another part, and ordinary assembly disposal owns the complete resource.
  return new T.MeshStandardMaterial({color:'#dbe4e8',roughness:.48,metalness:.14});
}
function joinGroup(model,kind,parentId) {
  const group=new T.Group();group.name=`continuous-hull-${kind}`;
  group.userData.hullJoin=kind;group.userData.partId=model.userData.partId;
  group.userData.connectsTo=parentId;model.add(group);return group;
}

function stackHullJoin(child,parent,childModel,parentModel) {
  if(!STACK_HULLS.has(child.type)||!STACK_HULLS.has(parent.type))return false;
  if(Math.hypot(child.x-parent.x,child.z-parent.z)>.04)return false;
  const lower=child.y<parent.y?child:parent,upper=lower===child?parent:child;
  const lowerHeight=DIMS[lower.type][1],upperHeight=DIMS[upper.type][1];
  const lowEdge=lower.y+lowerHeight/2,highEdge=upper.y-upperHeight/2;
  if(highEdge-lowEdge<-.08||highEdge-lowEdge>.18)return false;
  const lowOverlap=Math.min(.26,lowerHeight*.22),highOverlap=Math.min(.26,upperHeight*.22);
  const start=lowEdge-lowOverlap,end=highEdge+highOverlap;
  const group=joinGroup(childModel,'stack',parent.id),material=hullSkinMaterial(),points=[];
  for(let i=0;i<=12;i++){
    const t=i/12,y=T.MathUtils.lerp(start,end,t),smooth=t*t*(3-2*t);
    const r0=hullRadius(lower.type,start-lower.y),r1=hullRadius(upper.type,end-upper.y);
    let radius=T.MathUtils.lerp(r0,r1,smooth);
    // The cover enters each vessel at its endpoint. Its exposed skin is offset
    // outward between them, hiding caps and leaving no coincident hull faces.
    const lip=Math.sin(Math.PI*t)*.021-.012*Math.pow(Math.abs(t-.5)*2,8);
    radius=Math.max(.025,radius+lip);
    points.push(new T.Vector2(radius,y-child.y));
  }
  mesh(group,new T.LatheGeometry(points,48),material);
  hideJoinedEnd(childModel,child.y<parent.y?1:-1);
  hideJoinedEnd(parentModel,child.y<parent.y?-1:1);
  return true;
}

function radialHullJoin(child,parent,childModel) {
  const dx=child.x-parent.x,dz=child.z-parent.z,distance=Math.hypot(dx,dz);
  if(distance<.15||distance>5)return false;
  const [logicalRadius]=DIMS[parent.type]||[.9];
  const special={solar:{rx:.31,ry:.21,back:.19},battery:{rx:.3,ry:.24,back:.20},legs:{rx:.27,ry:.075,back:.43,y:.62},fin:{rx:.13,ry:.48,back:.09},booster:{rx:.3,ry:.82,back:.43},seismometer:{rx:.28,ry:.14,back:.35,y:-.035},atmosphere:{rx:.29,ry:.1,back:.22,y:-.13}};
  const fit=special[child.type]||{rx:.35,ry:.23,back:hullRadius(child.type,0)};
  const group=joinGroup(childModel,'radial',parent.id);
  group.rotation.y=Math.atan2(dx,dz)-(child.rotation||0);
  group.position.y=fit.y||0;
  const material=hullSkinMaterial();
  if(child.type==='fin')box(group,[.34,1.15,.18],[0,0,0],material);
  const positions=[],indices=[],segments=32,layers=7;
  for(let layer=0;layer<layers;layer++){
    const t=layer/(layers-1),ease=t*t*(3-2*t),flare=1.12-.25*Math.sin(Math.PI*t);
    for(let i=0;i<=segments;i++){
      const a=i/segments*TAU,x=Math.cos(a)*fit.rx*flare,y=Math.sin(a)*fit.ry*flare;
      const pr=hullRadius(parent.type,child.y-parent.y+(fit.y||0)+y);
      // Both borders follow the real curved hull rather than stopping at a
      // nominal radius. They penetrate the vessels by 2 cm to close the joint.
      const from=-distance+Math.sqrt(Math.max(.01,pr*pr-x*x))-.02;
      const curved=!['solar','battery','fin','legs','atmosphere'].includes(child.type);
      const to=curved?-Math.sqrt(Math.max(.01,fit.back*fit.back-x*x))+.025:-fit.back+.025;
      const z=T.MathUtils.lerp(from,to,ease);
      positions.push(x,y,z);
      if(layer<layers-1&&i<segments){const at=layer*(segments+1)+i,next=at+segments+1;indices.push(at,at+1,next,at+1,next+1,next);}
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  mesh(group,geometry,material);
  group.userData.parentRadius=logicalRadius;
  return true;
}

export function builtShipModel(assembly) {
  const root = new T.Group(), engines = [],models=new Map(),parts=new Map(assembly.map(part=>[part.id,part]));
  root.name = 'assembled-rustbound-rocket';
  for (const part of assembly) {
    const model = partModel(part.type);
    model.position.set(part.x || 0, part.y || 0, part.z || 0);
    if(part.quaternion)model.quaternion.fromArray(part.quaternion);else model.rotation.y = part.rotation || 0;
    model.userData.partId = part.id;
    models.set(part.id,model);
    root.add(model);
    if (model.userData.nozzle) engines.push({nozzle: model.userData.nozzle, exhaust: model.userData.exhaust, x: 0, z: 0, burn: 0, solid: part.type === 'booster'});
  }
  let joined=0;
  for(const child of assembly){
    let parent=parts.get(child.parent);
    // Positional callers remain supported; explicit blueprint relationships
    // take priority and missing staged parents never acquire a false bridge.
    if(!parent&&!Object.hasOwn(child,'parent'))parent=assembly.find(other=>other!==child&&other.y>child.y&&Math.hypot(other.x-child.x,other.z-child.z)<.03&&Math.abs(other.y-child.y-(DIMS[other.type][1]+DIMS[child.type][1])*.5-.035)<.07);
    if(!parent)continue;
    if([child,parent].some(p=>p.quaternion&&(Math.abs(p.quaternion[0])+Math.abs(p.quaternion[2])>.001))||child.offset?.some(v=>Math.abs(v)>.05))continue;
    const childModel=models.get(child.id),parentModel=models.get(parent.id);
    const radial=child.node==='radial'||Math.hypot(child.x-parent.x,child.z-parent.z)>.1;
    if(radial?radialHullJoin(child,parent,childModel):stackHullJoin(child,parent,childModel,parentModel))joined++;
  }
  root.userData.hullJoins=joined;
  let disposed = false;
  return {
    root,
    update(dt, {burn = 0, gimbal = [0, 0], time = 0} = {}) {
      const alpha = 1 - Math.exp(-Math.max(0, dt) * 11);
      for (const e of engines) {
        e.x += (T.MathUtils.clamp(gimbal[0] || 0, -.06, .06) - e.x) * alpha;
        e.z += (T.MathUtils.clamp(gimbal[1] || 0, -.06, .06) - e.z) * alpha;
        e.burn += (T.MathUtils.clamp(burn, 0, 1) - e.burn) * alpha;
        // Solid booster hardware has no thrust-vectoring joint.
        if (!e.solid) e.nozzle.rotation.set(e.z, 0, -e.x);
        e.exhaust.visible = e.burn > .015;
        const flicker = 1 + .035 * Math.sin(time * 53) + .016 * Math.sin(time * 83);
        e.exhaust.scale.set(.78 + e.burn * .22, Math.max(.025, e.burn * flicker), .78 + e.burn * .22);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const geometries = new Set(), materials = new Set();
      root.traverse(o => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
      });
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      root.removeFromParent();
    }
  };
}
