'use strict';
// ---------- Science: experiments, situations, diminishing returns ----------
// sits: where the experiment works. biome: whether results differ by biome in those situations.
const EXPERIMENTS = {
  crew: { name: 'Crew Report', base: 5, xmit: 1.0, size: 4, sits: ['pad', 'landed', 'splashed', 'flyLow', 'flyHigh', 'spaceLow', 'spaceHigh'], biome: ['pad', 'landed', 'splashed', 'flyLow'] },
  eva: { name: 'EVA Report', base: 8, xmit: 1.0, size: 4, sits: ['landed', 'splashed', 'flyLow', 'flyHigh', 'spaceLow', 'spaceHigh'], biome: ['landed', 'splashed', 'spaceLow'] },
  sample: { name: 'Surface Sample', base: 30, xmit: 0.25, size: 40, sits: ['landed', 'splashed'], biome: ['landed', 'splashed'] },
  temp: { name: 'Temperature Scan', base: 8, xmit: 0.5, size: 6, sits: ['pad', 'landed', 'splashed', 'flyLow', 'flyHigh', 'spaceLow'], biome: ['landed', 'splashed', 'flyLow'] },
  pres: { name: 'Pressure Scan', base: 12, xmit: 0.5, size: 6, sits: ['pad', 'landed', 'splashed', 'flyLow', 'flyHigh', 'spaceLow'], biome: ['landed', 'splashed'] },
  photo: { name: 'Survey Photographs', base: 10, xmit: 1.0, size: 12, sits: ['flyLow', 'flyHigh', 'spaceLow', 'spaceHigh', 'landed'], biome: ['landed', 'flyLow'] },
  exposure: { name: 'Exposure Observation', base: 10, xmit: 0.3, size: 10, single: true, sits: ['pad', 'landed', 'splashed', 'flyLow', 'flyHigh', 'spaceLow', 'spaceHigh'], biome: ['landed'] },
  rad: { name: 'Radiation Count', base: 15, xmit: 0.6, size: 8, sits: ['spaceLow', 'spaceHigh', 'flyHigh', 'landed'], biome: [] },
  mag: { name: 'Magnetic Field Survey', base: 20, xmit: 1.0, size: 8, sits: ['spaceLow', 'spaceHigh'], biome: [] },
  seis: { name: 'Seismic Scan', base: 30, xmit: 0.5, size: 20, sits: ['landed'], biome: ['landed'] },
  atmo: { name: 'Atmosphere Analysis', base: 25, xmit: 0.6, size: 16, sits: ['flyLow', 'flyHigh', 'landed'], biome: ['landed'], needAtm: true },
  materials: { name: 'Materials Study', base: 25, xmit: 0.35, size: 25, single: true, sits: ['pad', 'landed', 'splashed', 'flyLow', 'flyHigh', 'spaceLow', 'spaceHigh'], biome: ['landed'] },
  grav: { name: 'Gravity Scan', base: 22, xmit: 0.5, size: 18, sits: ['landed', 'spaceLow', 'spaceHigh'], biome: ['landed', 'spaceLow'] },
  spec: { name: 'Infrared Spectrum', base: 30, xmit: 0.8, size: 20, sits: ['flyLow', 'flyHigh', 'spaceLow'], biome: ['spaceLow', 'flyLow'] },
  drill: { name: 'Core Sample', base: 40, xmit: 0.25, size: 30, sits: ['landed'], biome: ['landed'] },
};
const SIT_NAMES = { pad: 'on the launch pad', landed: 'landed', splashed: 'splashed down', flyLow: 'flying low', flyHigh: 'flying high', spaceLow: 'in space near', spaceHigh: 'in space high over' };
const SIT_MULT = { pad: 0.3, landed: 2.0, splashed: 1.6, flyLow: 1.4, flyHigh: 1.2, spaceLow: 1.0, spaceHigh: 0.75 };

const Science = {
  situation(body, alt, landed, splashed, nearPad) {
    if (landed || splashed) {
      if (body.id === 'earth' && nearPad) return 'pad';
      return splashed ? 'splashed' : 'landed';
    }
    if (body.atmH && alt < body.atmH) return alt < body.flyHigh ? 'flyLow' : 'flyHigh';
    return alt < body.spaceHigh ? 'spaceLow' : 'spaceHigh';
  },
  biome(body, lat, lon, h, water) {
    const alat = Math.abs(lat) / DEG;
    if (body.id === 'earth') {
      if (water) return alat > 66 ? 'Polar Seas' : 'Oceans';
      if (alat > 66) return 'Polar Ice';
      if (h > 900) return 'Mountains';
      if (alat < 23) return 'Tropics';
      return 'Temperate Lands';
    }
    if (body.id === 'moon') { if (alat > 75) return 'Poles'; return (Terrain.texBright(body, lat, lon) < 0.38) ? 'Maria' : 'Highlands'; }
    if (body.id === 'mars') { if (alat > 75) return 'Polar Ice Cap'; return lat > 0 && h < 600 ? 'Northern Lowlands' : 'Southern Highlands'; }
    if (body.id === 'pluto' && Terrain.inSputnik(lat, lon)) return 'Sputnik Planitia';
    if (body.id === 'iapetus') return Math.cos(lon) < -0.2 ? 'Cassini Regio (dark)' : 'Bright Terrain';
    if (alat > 70) return 'Poles';
    const amp = (body.terrain && body.terrain.amp) || 500;
    if (h > amp * 0.35) return 'Highlands';
    if (h < -amp * 0.25) return 'Lowlands';
    return 'Midlands';
  },
  bodyMult(body, sit) {
    if (body.id === 'earth') return { pad: 0.3, landed: 0.4, splashed: 0.5, flyLow: 0.7, flyHigh: 0.9, spaceLow: 1.0, spaceHigh: 1.5 }[sit];
    if (body.id === 'sun') return sit === 'spaceLow' ? 10 : 4;
    return (body.tier || 3) * SIT_MULT[sit];
  },
  subjectId(exp, body, sit, biome) {
    const e = EXPERIMENTS[exp];
    const b = e.biome.includes(sit) && biome ? biome : '';
    return `${exp}@${body.id}:${sit}${b ? ':' + b : ''}`;
  },
  subjectLabel(exp, body, sit, biome) {
    const e = EXPERIMENTS[exp];
    const b = e.biome.includes(sit) && biome ? ` (${biome})` : '';
    const where = sit === 'pad' ? 'on the launch pad' : sit === 'spaceLow' ? `in space near ${body.name}` : sit === 'spaceHigh' ? (body.id === 'sun' ? 'in deep space' : `in space high over ${body.name}`) : `${SIT_NAMES[sit]} on ${body.name}`.replace('flying low on', 'flying low over').replace('flying high on', 'flying high over');
    return `${e.name} ${where}${b}`;
  },
  cap(exp, body, sit) { return EXPERIMENTS[exp].base * this.bodyMult(body, sit); },
  // value if banked now (recover = 1, transmit = xmit)
  value(prog, subj, cap, factor) {
    const got = prog.subjects[subj] || 0;
    return Math.max(0, (cap - got) * 0.75 * factor);
  },
  bank(prog, subj, amount) {
    prog.subjects[subj] = (prog.subjects[subj] || 0) + amount;
    prog.science += amount;
    prog.totalScience = (prog.totalScience || 0) + amount;
  },
  canRun(exp, body, sit) {
    const e = EXPERIMENTS[exp];
    if (!e.sits.includes(sit)) return false;
    if (e.needAtm && !(body.atm && !body.atm.trace)) return false;
    if ((exp === 'seis' || exp === 'drill' || exp === 'sample') && !body.solid) return false;
    return true;
  },
  whyNot(exp, body, sit) {
    const e = EXPERIMENTS[exp];
    if (e.needAtm && !(body.atm && !body.atm.trace)) return `${body.name} has no real atmosphere to sample.`;
    const want = e.sits.map(s => SIT_NAMES[s]).join(', ');
    return `${e.name} only works when ${want}.`;
  },
  // Result text built from real body data
  resultText(exp, body, sit, biome, alt) {
    const T = Math.round(body.temp || 200);
    const p = body.press;
    const B = body.name;
    const bi = biome ? ` in the ${biome}` : '';
    const atmo = body.atm && !body.atm.trace;
    switch (exp) {
      case 'crew': return sit === 'pad' ? 'The crew reports the view of the pad is great and the coffee is not.' : sit.startsWith('fly') ? `The crew watches ${B}'s sky darken as the ground drops away.` : sit === 'landed' ? `The crew describes ${B}${bi}: ${this.flavor(body, biome)}` : `From orbit the crew watches the terminator line sweep across ${B}.`;
      case 'eva': return sit === 'landed' ? `Walking on ${B}${bi}, every step kicks up ${body.id === 'earth' ? 'grass and dust' : 'fine regolith'}. ${this.flavor(body, biome)}` : `Floating outside the spacecraft over ${B}, there is nothing between you and the stars.`;
      case 'sample': return `A scooped sample from ${B}${bi}. ${body.id === 'earth' ? 'Soil, sand and a confused beetle.' : this.flavor(body, biome)}`;
      case 'temp': return sit === 'spaceLow' ? `Instrument temperature swings with sunlight and shadow near ${B}.` : `Ambient temperature reading: about ${atmo && sit.startsWith('fly') ? Math.round(Bodies.ambientTemp(body, alt, 1.5e10)) : T} K${bi}.`;
      case 'pres': return atmo ? (sit.startsWith('fly') ? `Pressure falls off exponentially with height here: ${fmtNum(Bodies.pressureAtm(body, alt) * 101.3, 2)} kPa at ${fmtDist(alt)}.` : `Surface pressure about ${fmtNum(p, p < 1 ? 3 : 1)} kPa${body.id === 'venus' ? ' — about 92 times Earth\'s' : ''}.`) : `Vacuum. The sensor reads effectively zero pressure ${body.press ? `(trace: ${body.press * 1000} Pa)` : ''}.`;
      case 'photo': return `Images of ${B}${bi} ${sit === 'landed' ? 'from ground level' : 'from above'}. ${body.fact.split('. ')[0]}.`;
      case 'exposure': return `The canister's contents ${['shimmer', 'pulse', 'curl', 'crystallise'][strHash(body.id + sit) % 4]} when exposed ${sit === 'landed' ? 'to the surface environment of ' + B : 'near ' + B}.`;
      case 'rad': return body.id === 'jupiter' || body.parent && body.parent.id === 'jupiter' ? 'The counter saturates: Jupiter\'s radiation belts are ferocious.' : body.id === 'earth' ? 'Particle counts climb sharply as the vessel enters the Van Allen belts.' : body.id === 'sun' ? 'Steady solar-wind particle flux, with occasional bursts.' : `Background cosmic-ray flux near ${B}, ${body.atm && !body.atm.trace ? 'partly shielded by its atmosphere' : 'unshielded by any atmosphere'}.`;
      case 'mag': return ['earth', 'jupiter', 'saturn', 'uranus', 'neptune', 'ganymede', 'mercury'].includes(body.id) ? `${B} has a global magnetic field; the boom traces its field lines.` : `No global magnetic field at ${B}; only the interplanetary field and local crustal anomalies.`;
      case 'seis': return body.id === 'io' ? 'Constant rumbling: tidal flexing and eruptions.' : body.id === 'moon' ? 'Rare, faint moonquakes that ring for a long time.' : `Seismic noise at ${B}${bi} hints at its interior structure.`;
      case 'atmo': return `${B}'s atmosphere: ${{ earth: 'nitrogen 78%, oxygen 21%, argon and traces of CO₂.', venus: 'carbon dioxide 96.5%, nitrogen 3.5%, sulfuric acid droplets.', mars: 'carbon dioxide 95%, nitrogen and argon, lots of fine dust.', titan: 'nitrogen about 95%, methane about 5%, with orange organic haze.', jupiter: 'hydrogen ~90%, helium ~10%, ammonia clouds.', saturn: 'hydrogen ~96%, helium ~3%.', uranus: 'hydrogen, helium and ~2% methane.', neptune: 'hydrogen, helium and ~1.5% methane.' }[body.id] || 'trace gases.'}`;
      case 'materials': return `Material samples change subtly after exposure ${sit === 'landed' ? 'on ' + B : 'near ' + B}.`;
      case 'grav': return `Gravity ${fmtNum(body.g, 3)} m/s² with small anomalies${bi} that reveal buried mass concentrations.`;
      case 'spec': return `Infrared spectrum of ${B}${bi}: ${this.flavor(body, biome)}`;
      case 'drill': return `A core sample from ${B}${bi} shows layered material deposited over millions of years.`;
    }
    return 'Data collected.';
  },
  flavor(body, biome) {
    const f = {
      moon: biome === 'Maria' ? 'Dark basaltic plains.' : 'Bright, ancient anorthosite highlands.',
      mars: 'Rusty iron-oxide dust everywhere.', venus: 'A dim orange glow through thick clouds; the rocks are basalt.', mercury: 'Dark, crater-scarred rock.',
      io: 'Sulfur frost and fresh lava flows.', europa: 'Clean water ice cut by reddish cracks.', ganymede: 'Old dark terrain beside younger grooved ice.', callisto: 'Dark dusty ice and countless craters.',
      titan: 'Water-ice pebbles rounded by methane rivers.', enceladus: 'Fresh, blinding-white snow from the geysers.', pluto: biome === 'Sputnik Planitia' ? 'Nitrogen ice slowly churning in polygonal cells.' : 'Water-ice mountains and reddish tholins.',
      triton: 'Pinkish nitrogen frost and dark geyser streaks.', iapetus: biome && biome.startsWith('Cassini') ? 'A thin coat of very dark material.' : 'Bright water ice.', ceres: 'Dark clay-rich rock with salt deposits.',
    };
    return f[body.id] || 'Ice and rock under a black sky.';
  },
};
