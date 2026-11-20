'use strict';
// ---------- EVA: astronauts with a jetpack, walking on any solid world ----------
// Controls follow the classic EVA scheme:
//   W/S/A/D move (relative to the camera), Shift up / Ctrl down (jetpack), Q/E roll,
//   R toggle jetpack, Space jump (or let go), F grab/let go of a nearby vessel, B board.
const Eva = (function () {
  // the jetpack has no fuel limit: fly as long as you like (PROP_MAX stays for old saves and the admin refill)
  const JET_ACC = 1.7, PROP_MAX = 5;
  function create(ship, crewName, t) {
    const pod = ship.parts.find(p => p.crew && p.crew.includes(crewName));
    const P = PARTS[pod.pid];
    const pr = Phys.getProps(ship);
    // hatch on the pod's +Z side
    const out = new V3(0, 0, 1);
    if (pod.q) out.applyQuaternion(new Q4().fromArray(pod.q));
    const local = pod.pos.clone().addScaledVector(out, Math.max(P.r, P.rb) + 0.7);
    const w = local.clone().applyQuaternion(ship.q).add(ship.r);
    const dirW = out.clone().applyQuaternion(ship.q);
    pod.crew = pod.crew.filter(n => n !== crewName);
    const v = {
      id: Game.newVesselId(), name: crewName, type: 'eva', crewName, parts: [], links: [], root: null, stages: [], stageIdx: 0,
      body: ship.body, r: w, v: ship.v.clone().addScaledVector(dirW, 0.3), q: ship.q.clone(), w: new V3(),
      landed: false, throttle: 0, sas: false, sasMode: 'stab', rcs: false, jetpack: !ship.landed, prop: PROP_MAX,
      log: ship.log, data: [], situation: '', fromShip: ship.id, walkPhase: 0,
    };
    if (ship.landed) {
      // step down beside the vessel
      const B = Bodies.byId[ship.body];
      const up = w.clone().normalize();
      const s = Terrain.surface(B, w, t);
      v.r.copy(up).multiplyScalar(B.R + s.h + 0.95);
      v.landed = true;
      v.q.setFromUnitVectors(new V3(0, 1, 0), up);
      Phys.setLandedFrame(v, t);
    }
    return v;
  }
  const _a = new V3(), _b = new V3();
  function step(v, t, dt, ctl, events) {
    const B = Bodies.byId[v.body];
    const e = Phys.env(v, t);
    const up = e.up;
    if (v.grab) {
      const o = Game.vessels.find(x => x.id === v.grab.id);
      if (!o || o.dead) v.grab = null;
      else { v.r.copy(v.grab.local).applyQuaternion(o.q).add(o.r); v.v.copy(o.v); if (ctl.jump) { v.grab = null; v.v.addScaledVector(up, 0.5); } return events; }
    }
    if (v.landed) {
      const fq = Phys.frameQ(B, t), fqi = fq.clone().invert();
      // Stay planted: ride along with the ground as the world turns. (Without this the planet rotated
      // out from under a standing astronaut, which looked like sliding: ~1.5 m/s on the Moon, more elsewhere.)
      if (v.landedBF) { v.r.copy(v.landedBF).applyQuaternion(fq); if (v.landedQ) v.q.copy(fq).multiply(v.landedQ); }
      // walking: horizontal move relative to the camera, with momentum kept in the ground's own frame
      // (astronauts you aren't controlling get no camera, so they just stand)
      const mv = new V3();
      if (ctl.camFwd) {
        const fwd = ctl.camFwd.clone().addScaledVector(up, -ctl.camFwd.dot(up));
        if (fwd.lengthSq() < 1e-6) fwd.copy(ctl.camUp).addScaledVector(up, -ctl.camUp.dot(up));
        fwd.normalize();
        const right = new V3().crossVectors(fwd, up).normalize();
        mv.addScaledVector(fwd, ctl.move.z).addScaledVector(right, ctl.move.x);
      }
      const low = B.g < 2;
      const swim = !!v.splashed;
      const speed = swim ? (ctl.run ? 1.1 : 0.7) : (ctl.run && !v.jetpack ? 3.2 : 1.5) * (low ? 0.8 : 1);
      if (mv.lengthSq() > 0) mv.normalize();
      if (!v.walkBF) v.walkBF = new V3();
      const targetBF = mv.clone().multiplyScalar(speed).applyQuaternion(fqi);
      // traction: quick to start and stop on firm ground, a little floatier in low gravity
      v.walkBF.lerp(targetBF, Math.min(1, dt * (low ? 3.5 : 7)));
      if (mv.lengthSq() === 0 && v.walkBF.lengthSq() < 0.0025) v.walkBF.set(0, 0, 0);
      const walkW = v.walkBF.clone().applyQuaternion(fq);
      walkW.addScaledVector(up, -walkW.dot(up));
      const sp = walkW.length();
      v.walkSpeed = sp;
      if (sp > 0) v.r.addScaledVector(walkW, dt);
      v.walkPhase += dt * sp * (low ? 2.4 : 3.6);
      // turn smoothly toward the walking direction
      if (sp > 0.15) {
        const tq = new Q4().setFromRotationMatrix(new THREE.Matrix4().lookAt(new V3(), walkW.clone().normalize(), up));
        v.q.slerp(tq, Math.min(1, dt * 7));
      }
      // keep the suit upright and the boots on the ground
      v.q.premultiply(new Q4().setFromUnitVectors(new V3(0, 1, 0).applyQuaternion(v.q), up));
      const s = Terrain.surface(B, v.r, t);
      // standing on the ground, or floating chest-deep in a sea or lake
      v.r.copy(v.r.clone().normalize().multiplyScalar(B.R + s.h + (s.water ? 0.25 : 0.95)));
      v.splashed = s.water;
      v.v.copy(Bodies.surfVel(B, v.r, new V3())).add(walkW);
      v.landedBF = v.r.clone().applyQuaternion(fqi); v.landedQ = fqi.clone().multiply(v.q);
      const jump = ctl.jump || (v.jetpack && ctl.up > 0);
      if (jump) {
        v.landed = false; v.walkBF.set(0, 0, 0); v.walkSpeed = 0;
        const js = ctl.jump ? Math.min(4, Math.sqrt(2 * B.g * 0.6) + (low ? 1 : 0)) : 1.5;
        v.v.addScaledVector(up, js);
      }
      return events;
    }
    // flying / floating
    const rl = v.r.length();
    const acc = new V3().addScaledVector(v.r, -B.GM / (rl * rl * rl));
    if (e.rho > 0) acc.addScaledVector(e.vAir, -0.5 * e.rho * e.vAir.length() * 0.8 / (0.094 * 1000));
    let thrusting = 0;
    if (v.jetpack && ctl.camFwd) {
      const j = new V3().addScaledVector(ctl.camFwd, ctl.move.z).addScaledVector(ctl.camRight, ctl.move.x).addScaledVector(ctl.camUp, ctl.up);
      if (j.lengthSq() > 0) { j.normalize(); acc.addScaledVector(j, JET_ACC); thrusting = 1; v.jetDir = j; }
    }
    v.thrusting = thrusting;
    v.v.addScaledVector(acc, dt);
    v.r.addScaledVector(v.v, dt);
    // orient to the camera while jetpacking (like the classic EVA), upright otherwise
    if (v.jetpack && ctl.camQ) v.q.slerp(ctl.camQ, Math.min(1, dt * 3));
    else { const tq = new Q4().setFromUnitVectors(new V3(0, 1, 0).applyQuaternion(v.q), up).multiply(v.q); v.q.slerp(tq, Math.min(1, dt * 2)); }
    if (ctl.roll) v.rollOff = (v.rollOff || 0) + ctl.roll * dt * 1.2;
    // ground
    if (B.solid && rl - B.R < B.maxTerrain + 10) {
      const s = Terrain.surface(B, v.r, t);
      const agl = rl - (B.R + s.h) - 0.95;
      v.agl = agl;
      if (agl <= 0) {
        const vRel = v.v.clone().sub(e.sv);
        const imp = vRel.length();
        if (imp > 14) { events.push({ kind: 'destroy', msg: `${v.crewName} hit the ground at ${fmtNum(imp, 1)} m/s. Astronauts survive about 14 m/s.` }); return events; }
        v.r.copy(up).multiplyScalar(B.R + s.h + 0.95);
        v.landed = true;
        const fqi = Phys.frameQ(B, t).invert();
        v.q.setFromUnitVectors(new V3(0, 1, 0), up);
        v.landedBF = v.r.clone().applyQuaternion(fqi); v.landedQ = fqi.clone().multiply(v.q);
        if (imp > 3) Sound.fx.thud();
      }
    } else v.agl = rl - B.R;
    if (!B.solid && B.atm && rl - B.R < B.atm.crush) events.push({ kind: 'destroy', msg: `${v.crewName} was lost in ${B.name}'s crushing atmosphere.` });
    const s = Phys.soiCheck(v, t);
    if (s) events.push({ kind: 'soi', dir: s });
    return events;
  }
  // ---------- model ----------
  // A bulky extravehicular suit: rounded helmet with a big black-mirrored visor, white hard upper torso,
  // padded fabric arms and legs with sealed bearings and wrinkle folds, a large life-support backpack
  // framed by grey jetpack rails, chest control module with hoses, gloves with fingers, and lunar boots.
  // Rig: root > rig (bobs while walking) > hips/knees and shoulders/elbows pivots, all animated in animate().
  let mats = null;
  function suitMats() {
    if (mats) return mats;
    const D = MatKit.D;
    const fabric = MatKit.make('suitfabric2', {
      w: 256, h: 256, normal: 1.4, rep: [2, 2],
      color: (g, w, h) => { D.fill(g, w, h, '#f1efe9'); D.tint(g, w, h, 6000, [240, 237, 230], 10, 0.3, 1.5); D.blotch(g, w, h, 8, 'rgba(150,140,120,0.05)', 20, 70); },
      height: (g, w, h) => { g.fillStyle = 'rgba(165,165,165,0.55)'; for (let x = 0; x < w; x += 3) g.fillRect(x, 0, 1.5, h); g.fillStyle = 'rgba(95,95,95,0.35)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1); D.lumps(g, w, h, 50, 12, 36, 0.22); },
      rough: (g, w, h) => D.fill(g, w, h, 'rgb(240,240,240)'),
    });
    const env = World.env;
    const sm = (o) => new THREE.MeshStandardMaterial(Object.assign({ envMap: env, envMapIntensity: 0.6 }, o));
    mats = {
      suit: MatKit.mat(fabric, { roughness: 1, metalness: 0 }),
      hard: sm({ color: 0xf1f1ee, roughness: 0.38, metalness: 0.05 }),
      grey: sm({ color: 0x9a9ea5, roughness: 0.55, metalness: 0.35 }),
      metal: sm({ color: 0xc7cbd0, roughness: 0.25, metalness: 0.95, envMapIntensity: 1 }),
      dark: sm({ color: 0x2a2c30, roughness: 0.75, metalness: 0.15 }),
      sole: sm({ color: 0x55585e, roughness: 0.95 }),
      glove: sm({ color: 0xdcdcd6, roughness: 0.9 }),
      palm: sm({ color: 0x6d7076, roughness: 0.95 }),
      red: sm({ color: 0xc12a2c, roughness: 0.6 }),
      blue: sm({ color: 0x2b6cb0, roughness: 0.5, metalness: 0.2 }),
      visor: sm({ color: 0x08090c, roughness: 0.04, metalness: 0.9, envMapIntensity: 1.8 }),
      gold: sm({ color: 0xd9a046, roughness: 0.2, metalness: 1, envMapIntensity: 1.4 }),
      lamp: new THREE.MeshBasicMaterial({ color: 0xfff4dc }),
    };
    return mats;
  }
  const T = THREE;
  const mesh = (geo, mat, x, y, z) => { const o = new T.Mesh(geo, mat); o.position.set(x || 0, y || 0, z || 0); return o; };
  const ringY = (r, t, mat, y) => { const o = new T.Mesh(new T.TorusGeometry(r, t, 10, 28), mat); o.rotation.x = Math.PI / 2; o.position.y = y || 0; return o; };
  // rounded box, centred
  function rbox(w, h, d, rr, mat) {
    rr = Math.min(rr, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
    const P = new T.Shape(); const a = w / 2 - rr * 0.5, b = h / 2 - rr * 0.5, q = rr * 0.5;
    P.moveTo(-a + q, -b); P.lineTo(a - q, -b); P.quadraticCurveTo(a, -b, a, -b + q); P.lineTo(a, b - q); P.quadraticCurveTo(a, b, a - q, b); P.lineTo(-a + q, b); P.quadraticCurveTo(-a, b, -a, b - q); P.lineTo(-a, -b + q); P.quadraticCurveTo(-a, -b, -a + q, -b);
    const geo = new T.ExtrudeGeometry(P, { depth: d - rr, bevelEnabled: true, bevelThickness: rr * 0.5, bevelSize: rr * 0.5, bevelSegments: 3, curveSegments: 6 });
    geo.translate(0, 0, -(d - rr) / 2);
    return new T.Mesh(geo, mat);
  }
  // padded limb segment hanging down from its joint: tapering, puffed in the middle, with wrinkle folds
  function limb(len, r0, r1, puff, folds, mat) {
    const pts = [], N = 22;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      let r = r0 + (r1 - r0) * t;
      r *= 1 + puff * Math.sin(Math.PI * t);
      // soft wrinkle folds near the joints, where fabric bunches up
      if (folds) r *= 1 + 0.025 * Math.sin(t * Math.PI * (4 + folds * 2)) * Math.max(0, 1 - Math.min(t, 1 - t) * 4);
      // only the very ends close in, tucked inside the joint spheres and bearings
      const e = Math.min(t, 1 - t) / 0.06, cap = e >= 1 ? 1 : 0.55 + 0.45 * Math.sin(e * Math.PI / 2);
      pts.push(new T.Vector2(Math.max(0.004, r * cap), -len * t));
    }
    return new T.Mesh(new T.LatheGeometry(pts, 20), mat);
  }
  // cold-gas plume: narrow at the nozzle, widening and fading outward along local -y (rotated to its nozzle)
  let plumeGeo = null, plumeMat = null;
  function plume(dir) {
    if (!plumeGeo) {
      // a soft cone: bright at the nozzle, fading along its length and toward its silhouette, rippling slightly
      plumeGeo = new T.CylinderGeometry(0.012, 0.13, 0.6, 18, 6, true); plumeGeo.translate(0, -0.3, 0);
      plumeMat = new T.ShaderMaterial({
        uniforms: { uI: { value: 0.5 }, uT: { value: 0 } },
        vertexShader: `varying float vAlong; varying vec3 vN; varying vec3 vV;
          #include <common>
          #include <logdepthbuf_pars_vertex>
          void main(){ vAlong = -position.y / 0.6; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;
          #include <logdepthbuf_vertex>
          }`,
        fragmentShader: `uniform float uI; uniform float uT; varying float vAlong; varying vec3 vN; varying vec3 vV;
          #include <logdepthbuf_pars_fragment>
          void main(){
          #include <logdepthbuf_fragment>
            float face = pow(abs(dot(normalize(vN), vV)), 1.6);
            float a = pow(1.0 - clamp(vAlong, 0.0, 1.0), 2.2) * face * uI * (0.85 + 0.15 * sin(vAlong * 40.0 - uT * 60.0));
            gl_FragColor = vec4(vec3(0.82, 0.9, 1.0) * a * 1.6, a); }`,
        transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      });
    }
    const m = new T.Mesh(plumeGeo, plumeMat.clone());
    m.quaternion.setFromUnitVectors(new V3(0, -1, 0), dir);
    m.userData.dir = dir.clone(); m.visible = false; m.renderOrder = 23;
    return m;
  }
  function model() {
    const m = suitMats();
    const g = new T.Group(), rig = new T.Group(); g.add(rig);
    // ---- torso ----
    const hut = mesh(new T.SphereGeometry(0.26, 32, 22), m.hard, 0, 0.27, -0.01); hut.scale.set(1.08, 1.02, 0.78); rig.add(hut);
    rig.add(mesh(new T.CylinderGeometry(0.2, 0.185, 0.18, 28), m.suit, 0, 0.0, 0));           // waist fabric
    rig.add(ringY(0.19, 0.022, m.metal, 0.07));                                                  // waist bearing
    rig.add(ringY(0.186, 0.012, m.grey, -0.07));
    const brief = mesh(new T.SphereGeometry(0.2, 26, 18), m.suit, 0, -0.12, 0); brief.scale.set(1.0, 0.72, 0.85); rig.add(brief);
    // chest display-and-control module with knobs, a small screen and the umbilical hoses
    const dcm = rbox(0.28, 0.12, 0.1, 0.03, m.hard); dcm.position.set(0, 0.13, -0.235); dcm.rotation.x = 0.28; rig.add(dcm);
    const scr = mesh(new T.PlaneGeometry(0.1, 0.045), m.dark, 0.04, 0.155, -0.292); scr.rotation.y = Math.PI; scr.rotateX(-0.28); rig.add(scr);
    for (const [x, mat] of [[-0.09, m.blue], [-0.05, m.red], [0.1, m.dark]]) { const k = mesh(new T.CylinderGeometry(0.017, 0.017, 0.035, 14), mat, x, 0.11, -0.295); k.rotation.x = Math.PI / 2 - 0.28; rig.add(k); }
    for (const s of [-1, 1]) {
      const c = new T.CatmullRomCurve3([new V3(s * 0.12, 0.1, -0.27), new V3(s * 0.22, 0.02, -0.2), new V3(s * 0.27, 0.12, 0.05), new V3(s * 0.25, 0.25, 0.18)]);
      rig.add(new T.Mesh(new T.TubeGeometry(c, 20, 0.018, 8, false), s < 0 ? m.blue : m.hard));
    }
    // ---- life-support backpack, grey jetpack frame and the jet unit underneath ----
    const pack = rbox(0.5, 0.66, 0.24, 0.07, m.hard); pack.position.set(0, 0.3, 0.3); rig.add(pack);
    for (const y of [0.52, 0.3, 0.08]) rig.add(mesh(new T.BoxGeometry(0.42, 0.012, 0.01), m.grey, 0, y, 0.425));
    const flag = mesh(new T.PlaneGeometry(0.12, 0.07), m.blue, 0.13, 0.58, 0.425); flag.rotation.y = 0; rig.add(flag);
    for (const s of [-1, 1]) {
      const rail = rbox(0.05, 0.78, 0.06, 0.02, m.grey); rail.position.set(s * 0.275, 0.26, 0.3); rig.add(rail);
      for (const y of [0.55, 0.0]) { const arm = rbox(0.05, 0.05, 0.2, 0.015, m.grey); arm.position.set(s * 0.275, y, 0.22); rig.add(arm); }
    }
    const jet = rbox(0.56, 0.15, 0.3, 0.04, m.grey); jet.position.set(0, -0.11, 0.3); rig.add(jet);
    // nozzles + plumes: clusters on each face, so thrust in any direction has a jet pushing the other way
    const plumes = [];
    const nozzles = [
      [new V3(1, 0, 0), [[0.3, 0.55, 0.3], [0.3, -0.11, 0.3]]], [new V3(-1, 0, 0), [[-0.3, 0.55, 0.3], [-0.3, -0.11, 0.3]]],
      [new V3(0, 1, 0), [[0.22, 0.66, 0.38], [-0.22, 0.66, 0.38]]], [new V3(0, -1, 0), [[0.24, -0.19, 0.3], [-0.24, -0.19, 0.3]]],
      [new V3(0, 0, 1), [[0.22, 0.6, 0.44], [-0.22, 0.6, 0.44], [0.24, -0.11, 0.46], [-0.24, -0.11, 0.46]]], [new V3(0, 0, -1), [[0.29, 0.6, 0.16], [-0.29, 0.6, 0.16]]],
    ];
    for (const [dir, list] of nozzles) for (const [x, y, z] of list) {
      const nz = mesh(new T.CylinderGeometry(0.008, 0.016, 0.025, 10), m.dark, x, y, z); nz.quaternion.setFromUnitVectors(new V3(0, -1, 0), dir); rig.add(nz);
      const pl = plume(dir); pl.position.set(x, y, z).addScaledVector(dir, 0.012); rig.add(pl); plumes.push(pl);
    }
    // ---- helmet: neck ring, shell, big black visor, visor-assembly rim, lamps and camera ----
    rig.add(ringY(0.14, 0.03, m.metal, 0.5));
    rig.add(mesh(new T.CylinderGeometry(0.13, 0.15, 0.06, 24), m.hard, 0, 0.53, 0));
    const HY = 0.69, HR = 0.19;
    rig.add(mesh(new T.SphereGeometry(HR, 40, 28, Math.PI * 1.85, Math.PI * 1.3, 0, Math.PI * 0.7), m.hard, 0, HY, 0));       // back and sides
    rig.add(mesh(new T.SphereGeometry(HR, 40, 10, Math.PI * 1.15, Math.PI * 0.7, 0, Math.PI * 0.16), m.hard, 0, HY, 0));       // brow
    const vis = mesh(new T.SphereGeometry(HR * 1.005, 40, 24, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.16, Math.PI * 0.52), m.visor, 0, HY, 0); vis.rotation.y = Math.PI; rig.add(vis);
    rig.add(mesh(new T.SphereGeometry(HR, 40, 6, Math.PI * 1.15, Math.PI * 0.7, Math.PI * 0.66, Math.PI * 0.14), m.hard, 0, HY, 0));       // chin
    for (const s of [-1, 1]) {
      const lamp = mesh(new T.CylinderGeometry(0.03, 0.034, 0.08, 16), m.hard, s * 0.19, HY + 0.05, -0.03); lamp.rotation.x = Math.PI / 2; rig.add(lamp);
      const lens = mesh(new T.CircleGeometry(0.026, 16), m.lamp, s * 0.19, HY + 0.05, -0.071); lens.rotation.y = Math.PI; rig.add(lens);
    }
    rig.add(mesh(new T.BoxGeometry(0.05, 0.04, 0.07), m.dark, -0.12, HY + 0.17, -0.02));
    // ---- legs: hip bearing, padded thigh, folded knee, shin, ankle bearing, boot ----
    const legs = [], knees = [], boots = [];
    for (const s of [-1, 1]) {
      const hip = new T.Group(); hip.position.set(s * 0.1, -0.12, 0); rig.add(hip);
      hip.add(ringY(0.088, 0.015, m.metal, -0.03));
      hip.add(limb(0.4, 0.092, 0.08, 0.06, 2, m.suit).translateY(-0.02));
      const knee = new T.Group(); knee.position.set(0, -0.4, 0); hip.add(knee);
      knee.add(mesh(new T.SphereGeometry(0.078, 18, 14), m.suit, 0, 0, -0.008));
      for (const y of [0.03, -0.03]) knee.add(ringY(0.079, 0.012, m.suit, y));
      knee.add(limb(0.33, 0.078, 0.068, 0.05, 1, m.suit));
      knee.add(ringY(0.07, 0.012, m.metal, -0.33));
      const boot = new T.Group(); boot.position.set(0, -0.43, 0); knee.add(boot);
      const up = rbox(0.14, 0.12, 0.22, 0.05, m.hard); up.position.set(0, 0.005, -0.03); boot.add(up);
      const sole = rbox(0.15, 0.04, 0.27, 0.02, m.sole); sole.position.set(0, -0.05, -0.04); boot.add(sole);
      legs.push(hip); knees.push(knee); boots.push(boot);
    }
    // ---- arms: shoulder bearing, padded upper arm, elbow, forearm, colour-coded wrist ring, glove ----
    const arms = [], elbows = [];
    for (const s of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(s * 0.3, 0.42, 0); rig.add(sh);
      sh.add(mesh(new T.SphereGeometry(0.095, 22, 16), m.hard, 0, 0, 0));
      const sb = new T.Mesh(new T.TorusGeometry(0.075, 0.014, 8, 24), m.metal); sb.rotation.z = Math.PI / 2; sb.position.x = s * 0.045; sb.position.y = -0.04; sh.add(sb);
      sh.add(limb(0.28, 0.076, 0.064, 0.08, 2, m.suit).translateY(-0.04));
      const el = new T.Group(); el.position.set(0, -0.31, 0); sh.add(el);
      el.add(mesh(new T.SphereGeometry(0.062, 16, 12), m.suit));
      el.add(limb(0.24, 0.062, 0.054, 0.05, 1, m.suit));
      el.add(ringY(0.056, 0.013, s < 0 ? m.red : m.blue, -0.245));
      const hand = new T.Group(); hand.position.set(0, -0.3, 0); el.add(hand);
      const palm = mesh(new T.SphereGeometry(0.052, 16, 12), m.glove); palm.scale.set(0.85, 1.05, 0.6); hand.add(palm);
      const pd = mesh(new T.SphereGeometry(0.046, 14, 10), m.palm, 0, -0.005, -0.012); pd.scale.set(0.8, 0.95, 0.4); hand.add(pd);
      for (let f = 0; f < 4; f++) { const fg = new T.Mesh(new T.CapsuleGeometry(0.011, 0.045, 4, 8), m.glove); fg.position.set((f - 1.5) * 0.022, -0.075, -0.01); fg.rotation.x = 0.25; hand.add(fg); }
      const th = new T.Mesh(new T.CapsuleGeometry(0.012, 0.035, 4, 8), m.glove); th.position.set(-s * 0.04, -0.03, -0.03); th.rotation.z = -s * 0.7; hand.add(th);
      arms.push(sh); elbows.push(el);
    }
    // mission patch
    const patch = mesh(new T.CircleGeometry(0.035, 20), m.blue, -0.087, -0.14, 0); patch.rotation.y = -Math.PI / 2; arms[0].add(patch);
    g.traverse(o => { if (o.isMesh && o.material !== plumeMat && !(o.material && o.material.blending === T.AdditiveBlending)) { o.castShadow = true; o.receiveShadow = true; } });
    g.userData = { rig, legs, knees, boots, arms, elbows, plumes, t: Math.random() * 10 };
    return g;
  }
  // Walk cycle (with a loping bounce in low gravity), idle breathing, jetpack pose and the thruster plumes.
  const _jl = new V3(), _qi = new Q4();
  function animate(g, v, dt) {
    const u = g.userData; if (!u.legs) return;
    u.t += dt;
    const B = Bodies.byId[v.body], lowG = B && B.g < 2;
    const ph = v.walkPhase || 0, spd = v.walkSpeed || 0, walk = v.landed ? clamp(spd / 1.6, 0, 1.4) : 0;
    const swing = Math.sin(ph) * 0.55 * walk;
    u.legs[0].rotation.x = swing; u.legs[1].rotation.x = -swing;
    u.knees[0].rotation.x = -Math.max(0, Math.sin(ph + 1.2)) * 0.7 * walk - (v.landed ? 0.04 : 0.35);
    u.knees[1].rotation.x = -Math.max(0, Math.sin(ph + 1.2 + Math.PI)) * 0.7 * walk - (v.landed ? 0.04 : 0.35);
    u.boots.forEach((b, i) => b.rotation.x = -u.knees[i].rotation.x * 0.3 - (i ? -swing : swing) * 0.3);
    u.arms[0].rotation.x = -swing * 0.6; u.arms[1].rotation.x = swing * 0.6;
    const floatPose = !v.landed;
    u.arms[0].rotation.z = floatPose ? -0.35 : -0.12; u.arms[1].rotation.z = floatPose ? 0.35 : 0.12;
    u.elbows[0].rotation.x = u.elbows[1].rotation.x = -(floatPose ? 0.7 : 0.35 + 0.2 * walk);
    // body bob: a long lope on the Moon, a short step bounce elsewhere, gentle breathing when idle
    const bob = v.landed ? (lowG ? Math.abs(Math.sin(ph)) * 0.12 * walk : Math.abs(Math.sin(ph)) * 0.03 * walk) + Math.sin(u.t * 1.6) * 0.004 : 0;
    u.rig.position.y = bob;
    u.rig.rotation.x = v.landed ? -0.08 * walk : 0;
    // plumes fire on the faces that push the astronaut in the commanded direction
    const firing = v.thrusting && v.jetDir;
    if (firing) _jl.copy(v.jetDir).applyQuaternion(_qi.copy(v.q).invert());
    for (const p of u.plumes) {
      const on = firing && p.userData.dir.dot(_jl) < -0.35;
      p.visible = !!on;
      if (on) { const k = 0.8 + Math.random() * 0.4; p.scale.set(1, k, 1); p.material.uniforms.uI.value = 0.45 + Math.random() * 0.2; p.material.uniforms.uT.value = u.t; }
    }
  }
  function flagModel() {
    const g = new THREE.Group();
    const m = suitMats();
    // pole with a top crossbar (it holds the cloth out where there is no wind) and a gold finial
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 2.4, 10), m.metal); pole.position.y = 0.25; g.add(pole);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.26, 8), m.metal); bar.rotation.z = Math.PI / 2; bar.position.set(0.62, 1.43, 0); g.add(bar);
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), m.gold); fin.position.y = 1.47; g.add(fin);
    const tex = PartMesh.canvasTex(512, 320, (c, w, h) => {
      c.fillStyle = '#123a6e'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#f2c230'; c.lineWidth = 12; c.beginPath(); c.ellipse(w / 2, h / 2, 140, 60, -0.4, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#f2f2ee'; c.beginPath(); c.arc(w / 2, h / 2, 44, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f2f2ee'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.fillText('MERIDIAN', w / 2, h - 28);
    }, 'flagtex2');
    // cloth hangs from the crossbar with soft folds
    const geo = new THREE.PlaneGeometry(1.2, 0.75, 24, 8), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 9 + 0.6) * 0.03 * (0.4 + (x + 0.6)) + Math.sin(x * 3.1) * 0.02 - (0.375 - y) * 0.02); }
    geo.computeVertexNormals();
    const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.85, envMap: World.env, envMapIntensity: 0.3 }));
    cloth.position.set(0.62, 1.05, 0); g.add(cloth);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  return { create, step, model, animate, flagModel, PROP_MAX };
})();
