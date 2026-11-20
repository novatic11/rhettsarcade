'use strict';
// ---------- Part catalogue ----------
// Units: mass in tonnes, thrust in kN, Isp in s, heights/radii in metres.
// Diameters: S 0.625 m, M 1.25 m, L 2.5 m, XL 3.75 m.
const SZ = { S: 0.3125, M: 0.625, L: 1.25, XL: 1.875 };
const RES = {
  LFO: { name: 'Kerosene + LOX', short: 'LFO', color: '#e9b44c' },
  SF: { name: 'Solid fuel', short: 'Solid', color: '#c97b4a' },
  LH2: { name: 'Liquid hydrogen', short: 'LH₂', color: '#8fd3ff' },
  MP: { name: 'Monopropellant', short: 'Mono', color: '#d6e685' },
  XE: { name: 'Xenon gas', short: 'Xenon', color: '#b79cff' },
  DHE: { name: 'Deuterium–Helium-3', short: 'D-He³', color: '#ff8ad8' },
  AM: { name: 'Antimatter', short: 'AM', color: '#ff5c7a' },
  EC: { name: 'Electric charge', short: 'EC', color: '#7cf0b0' },
};
const CATS = [
  ['command', 'Command', 'Probe cores, capsules and cabins'],
  ['fuel', 'Fuel tanks', 'Propellant storage'],
  ['engine', 'Engines', 'Liquid, solid and advanced propulsion'],
  ['coupling', 'Coupling', 'Decouplers, adapters, docking ports, fairings'],
  ['aero', 'Aerodynamics', 'Nose cones and fins'],
  ['control', 'Control', 'Reaction wheels and RCS'],
  ['power', 'Power', 'Batteries, solar panels, generators, radiators'],
  ['comms', 'Antennas', 'Transmit science home'],
  ['science', 'Science', 'Experiments'],
  ['landing', 'Recovery & landing', 'Parachutes, heat shields, legs'],
  ['interstellar', 'Interstellar', 'Ultra-efficient drives and systems for travel between stars'],
];

const PARTS = {};
function P(id, o) { o.id = id; o.rb = o.rb != null ? o.rb : o.r; PARTS[id] = o; if (!o.maxTemp) o.maxTemp = 1500; if (!o.tol) o.tol = 7; }

// --- command ---
P('probe_pebble', { name: 'PB-1 Pebble Probe', cat: 'command', tech: 'start', type: 'probe', mass: 0.06, h: 0.5, r: SZ.S, ec: 15, ecUse: 0.02, torque: 0.4, maxTemp: 1300, ant: { range: 5e6, rate: 1, ecPerMit: 6 }, desc: 'A small spherical probe core with a built-in short-range antenna. It needs electricity to steer.' });
P('probe_octo', { name: 'PB-2 Octo Probe', cat: 'command', tech: 'stability', type: 'probe', mass: 0.1, h: 0.32, r: SZ.S, ec: 15, ecUse: 0.02, torque: 0.9, maxTemp: 1300, ant: { range: 5e6, rate: 1, ecPerMit: 6 }, desc: 'An octagonal probe core with a stronger built-in reaction wheel.' });
P('probe_ring', { name: 'PB-3 Ring Probe', cat: 'command', tech: 'flightControl', type: 'probe', mass: 0.2, h: 0.4, r: SZ.M, ec: 40, ecUse: 0.03, torque: 2.5, maxTemp: 1400, ant: { range: 5e6, rate: 1, ecPerMit: 6 }, desc: 'A 1.25 m toroidal probe core that fits between tanks.' });
P('probe_hex', { name: 'PB-6 Hex Probe', cat: 'command', tech: 'deepSpaceComms', type: 'probe', mass: 0.5, h: 0.6, r: SZ.L, ec: 120, ecUse: 0.05, torque: 9, maxTemp: 1500, ant: { range: 5e6, rate: 1, ecPerMit: 6 }, desc: 'A 2.5 m probe core for heavy automated missions.' });
P('pod_mk1', { name: 'Mk1 Solo Capsule', cat: 'command', tech: 'crewedFlight', type: 'pod', crew: 1, mass: 0.84, h: 1.1, r: SZ.S, rb: SZ.M, ec: 50, ecUse: 0, torque: 3, maxTemp: 1700, tol: 13, ant: { range: 5e6, rate: 1, ecPerMit: 6 }, desc: 'A one-person capsule. The crew can fly it without power, file crew reports and go on EVA.' });
P('pod_triad', { name: 'Triad Command Module', cat: 'command', tech: 'crewedAdv', type: 'pod', crew: 3, mass: 2.6, h: 2.0, r: SZ.M, rb: SZ.L, ec: 150, ecUse: 0, torque: 10, maxTemp: 1700, tol: 13, ant: { range: 5e6, rate: 1, ecPerMit: 6 }, desc: 'A three-seat command module for long missions.' });
P('pod_lander', { name: 'Wayfarer Lander Can', cat: 'command', tech: 'crewedAdv', type: 'pod', crew: 2, mass: 0.65, h: 1.2, r: SZ.M, ec: 60, ecUse: 0, torque: 2, maxTemp: 1100, tol: 9, ant: { range: 5e6, rate: 1, ecPerMit: 6 }, desc: 'A light two-seat cockpit for landers. Fragile: it does not survive re-entry heat well.' });
P('cabin_l', { name: 'Habitat Cabin', cat: 'command', tech: 'crewedAdv', type: 'cabin', crew: 4, mass: 1.8, h: 1.8, r: SZ.L, maxTemp: 1400, desc: 'Passenger seats for four. It cannot control the vessel by itself.' });

// --- fuel ---
P('tank_s1', { name: 'T-90 Mini Tank', cat: 'fuel', tech: 'start', type: 'tank', mass: 0.025, h: 0.45, r: SZ.S, res: { LFO: 0.2 } });
P('tank_s2', { name: 'T-180 Tank', cat: 'fuel', tech: 'basicRocketry', type: 'tank', mass: 0.045, h: 0.85, r: SZ.S, res: { LFO: 0.4 } });
P('tank_m1', { name: 'FL-500 Tank', cat: 'fuel', tech: 'basicRocketry', type: 'tank', mass: 0.12, h: 1.0, r: SZ.M, res: { LFO: 1.0 } });
P('tank_m2', { name: 'FL-1000 Tank', cat: 'fuel', tech: 'generalRocketry', type: 'tank', mass: 0.24, h: 1.9, r: SZ.M, res: { LFO: 2.0 } });
P('tank_m3', { name: 'FL-2000 Tank', cat: 'fuel', tech: 'advRocketry', type: 'tank', mass: 0.48, h: 3.75, r: SZ.M, res: { LFO: 4.0 } });
P('tank_l1', { name: 'XL-4 Tank', cat: 'fuel', tech: 'heavyRocketry', type: 'tank', mass: 0.9, h: 1.9, r: SZ.L, res: { LFO: 8 }, stripe: '#e07a2f' });
P('tank_l2', { name: 'XL-8 Tank', cat: 'fuel', tech: 'heavyRocketry', type: 'tank', mass: 1.8, h: 3.75, r: SZ.L, res: { LFO: 16 }, stripe: '#e07a2f' });
P('tank_l3', { name: 'XL-16 Tank', cat: 'fuel', tech: 'superHeavy', type: 'tank', mass: 3.6, h: 7.5, r: SZ.L, res: { LFO: 32 }, foam: true });
P('tank_xl1', { name: 'Titan-XL Tank', cat: 'fuel', tech: 'superHeavy', type: 'tank', mass: 4.5, h: 5, r: SZ.XL, res: { LFO: 40 }, foam: true });
P('tank_r', { name: 'Saddle Radial Tank', cat: 'fuel', tech: 'advRocketry', type: 'tank', surf: true, mass: 0.05, h: 1.2, w: 0.45, res: { LFO: 0.4 }, desc: 'Mounts on the side of a stack and feeds the engines it is connected to.' });
P('tank_mp_r', { name: 'MR-1 Monoprop Sphere', cat: 'fuel', tech: 'flightControl', type: 'tank', surf: true, mass: 0.02, h: 0.36, w: 0.36, res: { MP: 0.08 }, desc: 'Monopropellant for RCS thrusters.' });
P('tank_mp_m', { name: 'MP-400 Monoprop Tank', cat: 'fuel', tech: 'docking', type: 'tank', mass: 0.1, h: 0.5, r: SZ.M, res: { MP: 0.6 } });
P('tank_xe_s', { name: 'XT-1 Xenon Sphere', cat: 'fuel', tech: 'ionProp', type: 'tank', mass: 0.05, h: 0.55, r: SZ.S, res: { XE: 0.1 }, shape: 'sphere' });
P('tank_xe_m', { name: 'XT-8 Xenon Tank', cat: 'fuel', tech: 'ionProp', type: 'tank', mass: 0.3, h: 1.4, r: SZ.M, res: { XE: 0.7 }, shape: 'xenon' });
P('tank_lh2_m', { name: 'LH-1 Hydrogen Tank', cat: 'fuel', tech: 'nuclear', type: 'tank', mass: 0.45, h: 3.75, r: SZ.M, res: { LH2: 0.9 }, foil: true, desc: 'Hydrogen is very light, so the tanks are bulky for their mass. Hydrogen needs its own engine type: the nuclear and antimatter drives.' });
P('tank_lh2_l', { name: 'LH-4 Hydrogen Tank', cat: 'fuel', tech: 'nuclear', type: 'tank', mass: 2.4, h: 7.5, r: SZ.L, res: { LH2: 6 }, foil: true });
P('tank_dhe', { name: 'DH-3 Fusion Fuel Cryostat', cat: 'interstellar', tech: 'fusion', type: 'tank', mass: 0.9, h: 1.4, r: SZ.M, res: { DHE: 0.35 }, shape: 'cryo', desc: 'Deuterium and helium-3 for an aneutronic fusion drive.' });
P('trap_am', { name: 'Penning Antimatter Trap', cat: 'interstellar', tech: 'antimatter', type: 'tank', mass: 1.6, h: 1.0, r: SZ.M, res: { AM: 0.0006 }, ecUse: 6, shape: 'trap', desc: 'Magnetic trap holding 0.6 kg of antimatter. Containment needs 6 EC/s at all times. If power runs out, the trap fails catastrophically.' });

// --- engines ---
P('eng_spark', { name: 'Spark Engine', cat: 'engine', tech: 'start', type: 'engine', mass: 0.13, h: 0.45, r: SZ.S, eng: { thr: 20, ispV: 300, ispA: 240, fuel: { LFO: 1 }, gimbal: 3 }, desc: 'A tiny liquid engine for small probes and upper stages.' });
P('eng_swallow', { name: 'Swallow Booster Engine', cat: 'engine', tech: 'basicRocketry', type: 'engine', mass: 1.2, h: 1.1, r: SZ.M, eng: { thr: 215, ispV: 305, ispA: 270, fuel: { LFO: 1 }, gimbal: 3 }, desc: 'Strong at sea level. A good first-stage engine.' });
P('eng_hornet', { name: 'Hornet Vacuum Engine', cat: 'engine', tech: 'generalRocketry', type: 'engine', mass: 0.5, h: 0.9, r: SZ.M, eng: { thr: 60, ispV: 345, ispA: 90, fuel: { LFO: 1 }, gimbal: 4, vac: true }, desc: 'Efficient in vacuum, weak in thick air. Use it on upper stages.' });
P('eng_wren', { name: 'Wren Lander Engine', cat: 'engine', tech: 'advRocketry', type: 'engine', mass: 0.3, h: 0.55, r: SZ.M, eng: { thr: 35, ispV: 325, ispA: 160, fuel: { LFO: 1 }, gimbal: 5, vac: true }, desc: 'Short and light, so landers sit low and stable.' });
P('eng_spider', { name: 'Spider Radial Engine', cat: 'engine', tech: 'advRocketry', type: 'engine', surf: true, mass: 0.02, h: 0.3, w: 0.22, eng: { thr: 2.5, ispV: 290, ispA: 260, fuel: { LFO: 1 }, gimbal: 10 }, desc: 'A tiny engine that mounts on the side of a tank.' });
P('eng_titan', { name: 'Colossus Lifter', cat: 'engine', tech: 'heavyRocketry', type: 'engine', mass: 6, h: 2.1, r: SZ.L, eng: { thr: 1500, ispV: 310, ispA: 285, fuel: { LFO: 1 }, gimbal: 2 }, desc: 'A heavy first-stage engine.' });
P('eng_condor', { name: 'Condor Upper Stage', cat: 'engine', tech: 'heavyRocketry', type: 'engine', mass: 1.75, h: 1.3, r: SZ.L, eng: { thr: 250, ispV: 350, ispA: 90, fuel: { LFO: 1 }, gimbal: 5, vac: true } });
P('eng_mammoth', { name: 'Mammoth Cluster', cat: 'engine', tech: 'superHeavy', type: 'engine', mass: 15, h: 3.2, r: SZ.XL, eng: { thr: 4200, ispV: 315, ispA: 295, fuel: { LFO: 1 }, gimbal: 2, cluster: 4 }, desc: 'Four engines on one mount for super-heavy launchers.' });
P('srb_sparrow', { name: 'Sparrow Solid Booster', cat: 'engine', tech: 'start', type: 'srb', mass: 0.03, h: 1.1, r: SZ.S, res: { SF: 0.16 }, eng: { thr: 18, ispV: 180, ispA: 160, fuel: { SF: 1 }, srb: true }, desc: 'Solid boosters cannot be throttled or shut down once lit.' });
P('srb_hammer', { name: 'Hammer Solid Booster', cat: 'engine', tech: 'basicRocketry', type: 'srb', mass: 0.3, h: 2.0, r: SZ.M, res: { SF: 2.6 }, eng: { thr: 230, ispV: 195, ispA: 170, fuel: { SF: 1 }, srb: true } });
P('srb_thumper', { name: 'Thumper Solid Booster', cat: 'engine', tech: 'generalRocketry', type: 'srb', mass: 0.6, h: 3.8, r: SZ.M, res: { SF: 6 }, eng: { thr: 320, ispV: 210, ispA: 185, fuel: { SF: 1 }, srb: true } });
P('srb_goliath', { name: 'Goliath Solid Booster', cat: 'engine', tech: 'superHeavy', type: 'srb', mass: 3.2, h: 7.5, r: SZ.L, res: { SF: 38 }, eng: { thr: 1600, ispV: 220, ispA: 195, fuel: { SF: 1 }, srb: true } });
P('eng_ntr', { name: 'Prometheus Nuclear Thermal Rocket', cat: 'engine', tech: 'nuclear', type: 'engine', mass: 3.0, h: 2.8, r: SZ.M, eng: { thr: 65, ispV: 850, ispA: 190, fuel: { LH2: 1 }, gimbal: 2, heat: 40, vac: true }, maxTemp: 2500, desc: 'A reactor heats hydrogen to make thrust. Twice as efficient as chemical engines, but heavy, weak and it produces waste heat (40 heat units) that radiators must remove on long burns. Based on engines ground-tested in the 1960s.' });
P('eng_ion', { name: 'Dawnlight Ion Thruster', cat: 'engine', tech: 'ionProp', type: 'engine', mass: 0.25, h: 0.3, r: SZ.S, eng: { thr: 2.0, ispV: 4200, ispA: 100, fuel: { XE: 1 }, ec: 9, vac: true }, desc: 'Extremely efficient but extremely weak. Burns for hours and needs 9 EC/s at full thrust: bring big solar arrays or a reactor.' });
P('eng_fusion', { name: 'Helios D-He³ Fusion Drive', cat: 'interstellar', tech: 'fusion', type: 'engine', mass: 14, h: 4.2, r: SZ.L, eng: { thr: 350, ispV: 30000, ispA: 0, fuel: { DHE: 1 }, ec: 50, heat: 220, vac: true, noAtm: true }, maxTemp: 2800, desc: 'A direct-fusion drive. Huge efficiency, but it needs 50 EC/s for magnetic confinement, sheds 220 heat units, and cannot run inside an atmosphere.' });
P('eng_am', { name: 'Paradox Antimatter Drive', cat: 'interstellar', tech: 'antimatter', type: 'engine', mass: 22, h: 5, r: SZ.L, eng: { thr: 1400, ispV: 15000, ispA: 0, fuel: { LH2: 1, AM: 0.00004 }, ec: 120, heat: 600, vac: true, noAtm: true }, maxTemp: 3000, desc: 'Annihilation heats hydrogen reaction mass. Enormous thrust and efficiency, but it needs an antimatter trap, liquid hydrogen, 120 EC/s and radiators for 600 heat units.' });

// --- coupling & structure ---
P('dec_s', { name: 'TD-06 Decoupler', cat: 'coupling', tech: 'start', type: 'decoupler', mass: 0.01, h: 0.1, r: SZ.S, desc: 'Separates the stack. It stays attached to the part below it.' });
P('dec_m', { name: 'TD-12 Decoupler', cat: 'coupling', tech: 'basicRocketry', type: 'decoupler', mass: 0.05, h: 0.15, r: SZ.M });
P('dec_l', { name: 'TD-25 Decoupler', cat: 'coupling', tech: 'heavyRocketry', type: 'decoupler', mass: 0.35, h: 0.25, r: SZ.L });
P('dec_xl', { name: 'TD-37 Decoupler', cat: 'coupling', tech: 'superHeavy', type: 'decoupler', mass: 0.7, h: 0.3, r: SZ.XL });
P('dec_r', { name: 'TT-38 Radial Decoupler', cat: 'coupling', tech: 'generalRocketry', type: 'rdecoupler', surf: true, conn: true, mass: 0.05, h: 0.6, w: 0.18, desc: 'Drop it on the side of a stack, then attach boosters or tanks to its outer face.' });
P('adapter_sm', { name: 'S→M Adapter', cat: 'coupling', tech: 'basicRocketry', type: 'adapter', mass: 0.04, h: 0.45, r: SZ.S, rb: SZ.M });
P('adapter_ml', { name: 'M→L Adapter', cat: 'coupling', tech: 'heavyRocketry', type: 'adapter', mass: 0.15, h: 0.9, r: SZ.M, rb: SZ.L });
P('adapter_lxl', { name: 'L→XL Adapter', cat: 'coupling', tech: 'superHeavy', type: 'adapter', mass: 0.4, h: 1.2, r: SZ.L, rb: SZ.XL });
P('tube_m', { name: 'Structural Tube M', cat: 'coupling', tech: 'fairings', type: 'struct', mass: 0.08, h: 1.0, r: SZ.M });
P('fairing_m', { name: 'Payload Fairing M', cat: 'coupling', tech: 'fairings', type: 'fairing', mass: 0.12, h: 0.2, r: SZ.M, desc: 'Encloses everything stacked above it (up to the next decoupler) in a streamlined shell. Jettison it in space.' });
P('fairing_l', { name: 'Payload Fairing L', cat: 'coupling', tech: 'fairings', type: 'fairing', mass: 0.35, h: 0.3, r: SZ.L });
P('dock_s', { name: 'Clamp-S Docking Port', cat: 'coupling', tech: 'docking', type: 'dock', mass: 0.03, h: 0.2, r: SZ.S, desc: 'Docks with another port of the same size. Put it at the very top or bottom of a stack.' });
P('dock_m', { name: 'Clamp-M Docking Port', cat: 'coupling', tech: 'docking', type: 'dock', mass: 0.1, h: 0.3, r: SZ.M });

// --- aero ---
P('nose_s', { name: 'Aero Nose S', cat: 'aero', tech: 'start', type: 'nose', mass: 0.01, h: 0.5, r: 0.04, rb: SZ.S, maxTemp: 2200 });
P('nose_m', { name: 'Aero Nose M', cat: 'aero', tech: 'basicRocketry', type: 'nose', mass: 0.08, h: 1.0, r: 0.06, rb: SZ.M, maxTemp: 2200 });
P('nose_l', { name: 'Aero Nose L', cat: 'aero', tech: 'heavyRocketry', type: 'nose', mass: 0.3, h: 2.0, r: 0.1, rb: SZ.L, maxTemp: 2200 });
P('fin_basic', { name: 'Basic Fin', cat: 'aero', tech: 'start', type: 'fin', surf: true, mass: 0.015, h: 0.7, w: 0.45, stab: 1.0, maxTemp: 1800, desc: 'Keeps the rocket pointed into the airflow. Mount them near the bottom.' });
P('fin_tail', { name: 'Delta Tail Fin', cat: 'aero', tech: 'stability', type: 'fin', surf: true, mass: 0.05, h: 1.2, w: 0.8, stab: 2.4, maxTemp: 1800 });
P('fin_canard', { name: 'Steering Canard', cat: 'aero', tech: 'stability', type: 'fin', surf: true, mass: 0.03, h: 0.5, w: 0.45, stab: 0.5, ctrl: 4, maxTemp: 1800, desc: 'A moving control surface: adds steering force in the atmosphere.' });

// --- control ---
P('wheel_s', { name: 'RW-S Reaction Wheel', cat: 'control', tech: 'stability', type: 'wheel', mass: 0.05, h: 0.2, r: SZ.S, torque: 1.5, ecUse: 0.1 });
P('wheel_m', { name: 'RW-M Reaction Wheel', cat: 'control', tech: 'flightControl', type: 'wheel', mass: 0.1, h: 0.25, r: SZ.M, torque: 6, ecUse: 0.2 });
P('wheel_l', { name: 'RW-L Reaction Wheel', cat: 'control', tech: 'heavyRocketry', type: 'wheel', mass: 0.2, h: 0.3, r: SZ.L, torque: 18, ecUse: 0.4 });
P('rcs_block', { name: 'RV-4 RCS Thruster Block', cat: 'control', tech: 'flightControl', type: 'rcs', surf: true, mass: 0.05, h: 0.25, w: 0.2, rcs: 1.0, torque: 2.5, desc: 'Uses monopropellant. Adds turning force and lets you translate (H/N, I/K, J/L) for docking. Toggle with R.' });

// --- power ---
P('bat_s', { name: 'Z-50 Battery Pack', cat: 'power', tech: 'start', type: 'battery', surf: true, mass: 0.005, h: 0.2, w: 0.08, ec: 50 });
P('bat_m', { name: 'Z-400 Battery Bank', cat: 'power', tech: 'electrics', type: 'battery', mass: 0.02, h: 0.2, r: SZ.M, ec: 400 });
P('bat_l', { name: 'Z-4000 Battery Bank', cat: 'power', tech: 'advElectrics', type: 'battery', mass: 0.2, h: 0.4, r: SZ.L, ec: 4000 });
P('solar_fixed', { name: 'SP-1 Fixed Solar Panel', cat: 'power', tech: 'electrics', type: 'solar', surf: true, mass: 0.005, h: 0.6, w: 0.04, gen: 0.35, desc: 'Generates 0.35 EC/s in full sunlight at Earth\'s distance. Output falls with the square of distance from the Sun.' });
P('solar_deploy', { name: 'SP-4 Fold-out Array', cat: 'power', tech: 'advElectrics', type: 'solar', surf: true, deploy: true, mass: 0.025, h: 0.7, w: 0.12, gen: 1.6, desc: 'Must be deployed (G toggles deployables, or stage it). Breaks if deployed in thick air at speed.' });
P('solar_large', { name: 'SP-40 Gigantor Wing', cat: 'power', tech: 'ionProp', type: 'solar', surf: true, deploy: true, mass: 0.3, h: 1.2, w: 0.2, gen: 12 });
P('rtg', { name: 'Radioisotope Generator', cat: 'power', tech: 'deepSpaceComms', type: 'rtg', surf: true, mass: 0.08, h: 0.7, w: 0.3, gen: 0.75, desc: 'Steady 0.75 EC/s anywhere, even in shadow or the outer Solar System. Real technology used on deep-space probes.' });
P('fuelcell', { name: 'FC-2 Fuel Cell', cat: 'power', tech: 'advElectrics', type: 'fuelcell', surf: true, mass: 0.05, h: 0.5, w: 0.25, gen: 1.5, burn: { LFO: 0.00003 }, desc: 'Turns kerosene and oxygen into 1.5 EC/s. Runs automatically when batteries drop below 90%.' });
P('reactor', { name: 'KP-15 Fission Reactor', cat: 'power', tech: 'nuclearPower', type: 'reactor', mass: 2.2, h: 1.6, r: SZ.M, gen: 30, heat: 60, desc: 'Scaled up from real compact space-reactor prototypes. 30 EC/s, but it produces 60 heat units that radiators must remove.' });
P('radiator_s', { name: 'Fixed Radiator Panel', cat: 'power', tech: 'nuclear', type: 'radiator', surf: true, mass: 0.05, h: 1.0, w: 0.05, cool: 30, desc: 'Removes 30 units of waste heat from reactors and nuclear or fusion engines.' });
P('radiator_l', { name: 'Deployable Radiator Wing', cat: 'power', tech: 'nuclearPower', type: 'radiator', surf: true, deploy: true, mass: 0.3, h: 2.6, w: 0.08, cool: 220, desc: 'Removes 220 units of waste heat once deployed.' });

// --- comms ---
P('ant_whip', { name: 'Whip-6 Antenna', cat: 'comms', tech: 'start', type: 'antenna', surf: true, mass: 0.005, h: 0.8, w: 0.06, ant: { range: 6e7, rate: 2, ecPerMit: 4 }, desc: 'Range 60,000 km: covers Earth orbit and the Moon.' });
P('ant_dish', { name: 'DTS-M Relay Dish', cat: 'comms', tech: 'comms', type: 'antenna', surf: true, mass: 0.05, h: 0.5, w: 0.5, ant: { range: 4e10, rate: 4, ecPerMit: 5 }, desc: 'Range 40 million km: covers the inner planets.' });
P('ant_hg', { name: 'HG-88 High-Gain Dish', cat: 'comms', tech: 'deepSpaceComms', type: 'antenna', surf: true, mass: 0.12, h: 1.1, w: 1.0, ant: { range: 4e12, rate: 6, ecPerMit: 5 }, desc: 'Range 4 billion km: reaches anywhere in the system.' });

// --- science ---
P('sci_thermo', { name: 'TH-1 Thermometer', cat: 'science', tech: 'start', type: 'science', surf: true, mass: 0.005, h: 0.25, w: 0.1, exp: 'temp' });
P('sci_baro', { name: 'PB-2 Barometer', cat: 'science', tech: 'survivability', type: 'science', surf: true, mass: 0.005, h: 0.25, w: 0.12, exp: 'pres' });
P('sci_camera', { name: 'SC-1 Survey Camera', cat: 'science', tech: 'basicScience', type: 'science', surf: true, mass: 0.02, h: 0.3, w: 0.2, exp: 'photo' });
P('sci_canister', { name: 'Exposure Canister', cat: 'science', tech: 'basicScience', type: 'science', surf: true, mass: 0.05, h: 0.45, w: 0.2, exp: 'exposure' });
P('sci_geiger', { name: 'RD-3 Radiation Counter', cat: 'science', tech: 'spaceScience', type: 'science', surf: true, mass: 0.01, h: 0.3, w: 0.12, exp: 'rad' });
P('sci_mag', { name: 'MAG-1 Magnetometer Boom', cat: 'science', tech: 'spaceScience', type: 'science', surf: true, mass: 0.03, h: 0.25, w: 0.9, exp: 'mag' });
P('sci_seismo', { name: 'SE-2 Seismometer', cat: 'science', tech: 'fieldScience', type: 'science', surf: true, mass: 0.02, h: 0.35, w: 0.18, exp: 'seis' });
P('sci_atmo', { name: 'AS-5 Atmosphere Sampler', cat: 'science', tech: 'fieldScience', type: 'science', surf: true, mass: 0.03, h: 0.45, w: 0.22, exp: 'atmo' });
P('sci_materials', { name: 'Materials Study Bay', cat: 'science', tech: 'fieldScience', type: 'science', mass: 0.2, h: 0.8, r: SZ.M, exp: 'materials' });
P('sci_grav', { name: 'GG-1 Gravity Gradiometer', cat: 'science', tech: 'advScience', type: 'science', surf: true, mass: 0.05, h: 0.4, w: 0.2, exp: 'grav' });
P('sci_spectro', { name: 'IR-7 Spectrometer', cat: 'science', tech: 'advScience', type: 'science', surf: true, mass: 0.06, h: 0.5, w: 0.3, exp: 'spec' });
P('sci_drill', { name: 'CD-9 Core Drill', cat: 'science', tech: 'advScience', type: 'science', surf: true, mass: 0.25, h: 1.0, w: 0.4, exp: 'drill' });

// --- recovery & landing ---
P('chute_s', { name: 'MP-1 Mini Parachute', cat: 'landing', tech: 'survivability', type: 'chute', mass: 0.05, h: 0.3, r: SZ.S, rb: SZ.S * 0.9, chute: { area: 300 }, desc: 'Arm it with staging. It opens on its own once the air is thick enough and you are below 250 m/s.' });
P('chute_m', { name: 'MP-16 Parachute', cat: 'landing', tech: 'crewedFlight', type: 'chute', mass: 0.1, h: 0.36, r: SZ.S, rb: SZ.S, chute: { area: 750 }, desc: 'Fits on top of the Mk1 capsule.' });
P('chute_r', { name: 'RC-2 Radial Chute', cat: 'landing', tech: 'landing', type: 'chute', surf: true, mass: 0.15, h: 0.5, w: 0.25, chute: { area: 550 } });
P('chute_drogue', { name: 'DR-1 Drogue Chute', cat: 'landing', tech: 'landingAdv', type: 'chute', surf: true, mass: 0.1, h: 0.4, w: 0.22, chute: { area: 90, drogue: true }, desc: 'Opens at up to 600 m/s to slow you before the main chutes.' });
P('chute_l', { name: 'MP-35 Heavy Parachute', cat: 'landing', tech: 'crewedAdv', type: 'chute', mass: 0.3, h: 0.45, r: SZ.M, rb: SZ.M, chute: { area: 2000 } });
P('shield_m', { name: 'HS-12 Heat Shield', cat: 'landing', tech: 'survivability', type: 'shield', mass: 0.2, h: 0.2, r: SZ.M, ablator: 250, maxTemp: 3300, desc: 'Protects everything behind it when it faces the airflow. The ablator wears away as it absorbs heat.' });
P('shield_l', { name: 'HS-25 Heat Shield', cat: 'landing', tech: 'landingAdv', type: 'shield', mass: 0.8, h: 0.3, r: SZ.L, ablator: 900, maxTemp: 3300 });
P('shield_xl', { name: 'HS-37 Heat Shield', cat: 'landing', tech: 'superHeavy', type: 'shield', mass: 1.6, h: 0.4, r: SZ.XL, ablator: 1800, maxTemp: 3300 });
P('leg_s', { name: 'LT-1 Landing Leg', cat: 'landing', tech: 'landing', type: 'leg', surf: true, deploy: true, mass: 0.04, h: 0.8, w: 0.28, tol: 11, desc: 'Absorbs touchdown up to about 11 m/s. Deploy with G.' });
P('leg_m', { name: 'LT-2 Landing Strut', cat: 'landing', tech: 'landingAdv', type: 'leg', surf: true, deploy: true, mass: 0.1, h: 1.4, w: 0.45, tol: 13 });
P('leg_l', { name: 'LT-5 Heavy Leg', cat: 'landing', tech: 'landingAdv', type: 'leg', surf: true, deploy: true, mass: 0.3, h: 2.2, w: 0.7, tol: 15 });

// --- interstellar (Research Center: Interstellar tab) ---
P('is_core', { name: 'Sentinel AI Core', cat: 'interstellar', tech: 'isProgram', type: 'probe', mass: 0.8, h: 0.8, r: SZ.L, ec: 2000, ecUse: 0.05, torque: 40, maxTemp: 2200, ant: { range: 1e13, rate: 8, ecPerMit: 3 }, desc: 'A self-repairing autonomous core built to run for centuries. Huge battery, strong reaction wheels and a long-range antenna built in.' });
P('is_ark', { name: 'Ark Command Module', cat: 'interstellar', tech: 'isHab', type: 'pod', crew: 6, mass: 6, h: 3, r: SZ.L, rb: SZ.XL, ec: 3000, ecUse: 0, torque: 60, maxTemp: 2600, tol: 15, ant: { range: 1e13, rate: 8, ecPerMit: 3 }, desc: 'The flight deck of a starship: six seats, heavy shielding, a deep-space antenna and a large battery.' });
P('is_cryo', { name: 'Long Sleep Cryo Bay', cat: 'interstellar', tech: 'isHab', type: 'cabin', crew: 12, mass: 4, h: 3, r: SZ.XL, maxTemp: 2000, desc: 'Twelve hibernation berths for crossings that take decades. It cannot control the vessel by itself.' });
P('is_whipple', { name: 'Whipple Dust Shield', cat: 'interstellar', tech: 'isProgram', type: 'shield', mass: 1.2, h: 0.4, r: SZ.XL, ablator: 6000, maxTemp: 4200, desc: 'Spaced metal and ceramic layers that shatter dust grains hitting at a large fraction of light speed. Doubles as a very tough heat shield.' });
P('is_laser_comm', { name: 'Lightbridge Laser Terminal', cat: 'interstellar', tech: 'isProgram', type: 'antenna', surf: true, mass: 0.2, h: 0.8, w: 0.9, ant: { range: 1e16, rate: 20, ecPerMit: 2 }, desc: 'Optical communications: a narrow laser beam carries data across light-years. Fastest and cheapest transmitter in the game.' });
P('is_gyro', { name: 'Gyrodyne Array', cat: 'interstellar', tech: 'isProgram', type: 'wheel', mass: 1.2, h: 0.5, r: SZ.XL, torque: 300, ecUse: 1, desc: 'Control moment gyros strong enough to turn a starship. 300 kN·m of torque for 1 EC/s.' });
P('is_telescope', { name: 'Deep Field Telescope', cat: 'interstellar', tech: 'isProgram', type: 'science', surf: true, mass: 0.8, h: 1.6, w: 0.9, exp: 'spec', desc: 'A large infrared telescope for studying stars and the planets around them.' });
P('tank_dhe_l', { name: 'DH-12 Deep Cryostat', cat: 'interstellar', tech: 'fusion', type: 'tank', mass: 2.8, h: 4, r: SZ.L, res: { DHE: 3 }, shape: 'cryo', desc: 'A large insulated store of deuterium and helium-3 for fusion drives.' });
P('trap_am_l', { name: 'Grand Penning Trap', cat: 'interstellar', tech: 'antimatter', type: 'tank', mass: 5, h: 2, r: SZ.L, res: { AM: 0.01 }, ecUse: 20, shape: 'trap', desc: 'Holds 10 kg of antimatter in magnetic fields. Needs 20 EC/s at all times: if the power fails, so does the trap.' });
P('tank_lh2_xl', { name: 'LH-20 Interstellar Hydrogen Tank', cat: 'interstellar', tech: 'isStorage', type: 'tank', mass: 6, h: 10, r: SZ.XL, res: { LH2: 30 }, foil: true, desc: 'A huge, well-insulated hydrogen tank for antimatter drives.' });
P('eng_daedalus', { name: 'Daedalus Pulse Engine', cat: 'interstellar', tech: 'isPulse', type: 'engine', look: 'pulse', mass: 40, h: 6, r: SZ.XL, eng: { thr: 7000, ispV: 1000000, ispA: 0, fuel: { DHE: 1 }, ec: 200, heat: 900, vac: true, noAtm: true }, maxTemp: 3600, desc: 'Fires hundreds of fusion micro-explosions a second inside a giant reaction chamber. Enormous thrust and an Isp of a million seconds. Needs 200 EC/s and radiators for 900 heat units.' });
P('eng_beamcore', { name: 'Beamed-Core Antimatter Drive', cat: 'interstellar', tech: 'amAdv', type: 'engine', look: 'beamcore', mass: 18, h: 5, r: SZ.L, eng: { thr: 900, ispV: 3000000, ispA: 0, fuel: { AM: 1 }, ec: 150, heat: 400, vac: true, noAtm: true }, maxTemp: 3200, desc: 'Annihilation products are steered straight out of a magnetic nozzle: no reaction mass needed, only antimatter. Isp of three million seconds.' });
P('eng_photon', { name: 'Photon Mirror Drive', cat: 'interstellar', tech: 'isPhoton', type: 'engine', look: 'photon', mass: 30, h: 4, r: SZ.XL, eng: { thr: 120, ispV: 30000000, ispA: 0, fuel: { AM: 1 }, ec: 80, heat: 1200, vac: true, noAtm: true }, maxTemp: 4000, desc: 'Pure light as exhaust: annihilation gamma rays bounce off a parabolic mirror. The most efficient engine possible, with an Isp of thirty million seconds.' });
P('eng_bussard', { name: 'Bussard Ramscoop', cat: 'interstellar', tech: 'isRam', type: 'engine', look: 'ramjet', mass: 25, h: 6, r: SZ.XL, eng: { thr: 400, ispV: 100000000, ispA: 0, fuel: {}, ec: 300, heat: 500, vac: true, noAtm: true }, maxTemp: 3500, desc: 'A vast magnetic field scoops hydrogen out of space and burns it in a fusion core, so it carries no propellant at all. Needs 300 EC/s. The delta-v readout cannot count it: it never runs dry.' });
P('is_lightsail', { name: 'Starwisp Light Sail', cat: 'interstellar', tech: 'isSail', type: 'engine', look: 'sail', deploy: true, mass: 0.4, h: 1.0, r: SZ.M, eng: { thr: 3, ispV: 100000000, ispA: 0, fuel: {}, vac: true, noAtm: true }, maxTemp: 1800, desc: 'A 16-metre reflective membrane pushed by light. Gentle but free thrust forever. Stage it, then deploy it with G in space. The delta-v readout cannot count it.' });
P('is_fusion_reactor', { name: 'Tokamak Power Core', cat: 'interstellar', tech: 'isPower', type: 'reactor', mass: 12, h: 3, r: SZ.XL, gen: 600, heat: 350, desc: 'A compact fusion reactor: 600 EC/s, enough to run any interstellar drive. Produces 350 heat units that radiators must remove.' });
P('is_droplet_rad', { name: 'Liquid Droplet Radiator', cat: 'interstellar', tech: 'isPower', type: 'radiator', surf: true, deploy: true, mass: 1.5, h: 8, w: 0.15, cool: 2500, desc: 'Sprays a sheet of hot droplets across space and catches them again. Removes 2,500 heat units once deployed.' });
P('is_supercap', { name: 'Superconducting Storage Ring', cat: 'interstellar', tech: 'isPower', type: 'battery', mass: 1, h: 0.6, r: SZ.XL, ec: 100000 });

const PartUtil = {
  isCommand: p => p.type === 'probe' || p.type === 'pod',
  stageable: p => ['engine', 'srb', 'decoupler', 'rdecoupler', 'chute', 'fairing'].includes(p.type),
  sizeName(r) { const d = r * 2; return d < 0.3 ? '' : d < 0.9 ? 'S' : d < 1.8 ? 'M' : d < 3 ? 'L' : 'XL'; },
};
