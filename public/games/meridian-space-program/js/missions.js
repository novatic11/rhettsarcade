'use strict';
// ---------- Missions ----------
// Objectives are checked against a vessel's flight log:
//  launch, alt{body,alt}, space{body}, orbit{body}, soi{body}, land{body}, recover, crew, eva{body,sit}, sci{sit}, dock, flag{body},
//  far{dist} (metres from the Sun), tech{tech} (researched in the Research Center; checked outside flights too)
const MISSIONS = [
  { id: 'm_first', title: 'First Light', req: [], reward: 6, brief: 'Every program starts with a single launch. Build anything that can leave the pad and fly it.', obj: [{ t: 'launch', text: 'Launch a vessel from the pad' }], tip: 'Open the Assembly Building. Try: Pebble probe core on top, Sparrow booster below, fins on the side. Then press Launch and hit Space.' },
  { id: 'm_10km', title: 'Thin Air', req: ['m_first'], reward: 10, brief: 'Push higher. Reach 10 km above Earth.', obj: [{ t: 'alt', body: 'earth', alt: 10000, text: 'Reach 10 km altitude' }] },
  { id: 'm_sci1', title: 'Sky Science', req: ['m_first'], reward: 8, brief: 'Run an experiment in flight and transmit or recover the results.', obj: [{ t: 'sci', text: 'Bank any science from a flight' }], tip: 'Fit a thermometer and an antenna, then open the Science panel during flight.' },
  { id: 'm_space', title: 'Edge of Space', req: ['m_10km'], reward: 22, brief: 'Space begins where the air ends: 70 km above Earth in this program.', obj: [{ t: 'space', body: 'earth', text: 'Reach space above Earth (70 km)' }] },
  { id: 'm_return', title: 'Coming Home', req: ['m_space'], reward: 28, brief: 'Getting up is half the job. Reach space and bring the vessel back down in one piece.', obj: [{ t: 'space', body: 'earth', text: 'Reach space' }, { t: 'recover', text: 'Land or splash down on Earth and recover the vessel' }], tip: 'A parachute on top and staging it last will do. Parachutes open on their own once the air is thick and you are below 250 m/s.' },
  { id: 'm_orbit', title: 'Orbit', req: ['m_space'], reward: 45, brief: 'Going high is not the same as going around. Reach a stable orbit: lowest point (periapsis) above 70 km.', obj: [{ t: 'orbit', body: 'earth', text: 'Reach a stable Earth orbit' }], tip: 'Climb to about 10 km, then tip gradually east (toward 90° on the navball). Push the apoapsis to ~80 km, coast to it, then burn prograde until the periapsis rises above 70 km.' },
  { id: 'm_crew', title: 'Crewed Flight', req: ['m_return'], reward: 55, brief: 'Send an astronaut to space and bring them back safely.', obj: [{ t: 'crew', text: 'Fly with crew aboard' }, { t: 'space', body: 'earth', text: 'Reach space' }, { t: 'recover', text: 'Recover the crew on Earth' }] },
  { id: 'm_eva', title: 'Spacewalk', req: ['m_crew', 'm_orbit'], reward: 80, brief: 'Step outside in orbit. Use the jetpack, then climb back in and come home.', obj: [{ t: 'eva', body: 'earth', sit: 'space', text: 'Go on EVA in space above Earth' }, { t: 'recover', text: 'Recover the vessel on Earth' }] },
  { id: 'm_moonSoi', title: 'Lunar Flyby', req: ['m_orbit'], reward: 70, brief: 'Leave Earth\'s neighbourhood and enter the Moon\'s sphere of influence.', obj: [{ t: 'soi', body: 'moon', text: 'Enter the Moon\'s sphere of influence' }], tip: 'From Earth orbit, open the Map, target the Moon, and use "Plan transfer". Then execute the node.' },
  { id: 'm_moonOrbit', title: 'Lunar Orbit', req: ['m_moonSoi'], reward: 90, brief: 'Slow down near the Moon and stay there.', obj: [{ t: 'orbit', body: 'moon', text: 'Orbit the Moon' }] },
  { id: 'm_moonLand', title: 'Moon Landing', req: ['m_moonOrbit'], reward: 140, brief: 'Touch down on the Moon. There is no air, so engines must do all the braking.', obj: [{ t: 'land', body: 'moon', text: 'Land on the Moon' }] },
  { id: 'm_dock', title: 'Rendezvous', req: ['m_eva'], reward: 120, brief: 'Bring two vessels together in orbit and dock them.', obj: [{ t: 'dock', text: 'Dock two vessels' }], tip: 'Launch a target with a docking port, then a second ship. Target the first in the Tracking Station or map, match orbits, and use RCS (H/N, I/K, J/L) for the final approach.' },
  { id: 'm_moonCrew', title: 'Footprints', req: ['m_moonLand', 'm_eva'], reward: 320, brief: 'Land astronauts on the Moon, walk on the surface, and bring everyone home.', obj: [{ t: 'crew', text: 'Fly with crew aboard' }, { t: 'land', body: 'moon', text: 'Land on the Moon' }, { t: 'eva', body: 'moon', sit: 'landed', text: 'Walk on the Moon' }, { t: 'recover', text: 'Recover on Earth' }] },
  { id: 'm_venus', title: 'Morning Star', req: ['m_moonOrbit'], reward: 160, brief: 'Travel inward to Venus.', obj: [{ t: 'soi', body: 'venus', text: 'Enter Venus\'s sphere of influence' }] },
  { id: 'm_mars', title: 'Red Planet', req: ['m_moonOrbit'], reward: 160, brief: 'Make the journey to Mars.', obj: [{ t: 'soi', body: 'mars', text: 'Enter Mars\'s sphere of influence' }] },
  { id: 'm_marsLand', title: 'Red Dust', req: ['m_mars', 'm_moonLand'], reward: 320, brief: 'Land on Mars. The air is too thin for parachutes alone: bring engines for the last part.', obj: [{ t: 'land', body: 'mars', text: 'Land on Mars' }] },
  { id: 'm_venusLand', title: 'Under the Clouds', req: ['m_venus', 'm_moonLand'], reward: 420, brief: 'Descend through Venus\'s crushing atmosphere and reach the surface.', obj: [{ t: 'land', body: 'venus', text: 'Land on Venus' }] },
  { id: 'm_mercury', title: 'Closest to the Sun', req: ['m_venus'], reward: 320, brief: 'Orbit Mercury. Getting there needs more delta-v than reaching Mars.', obj: [{ t: 'orbit', body: 'mercury', text: 'Orbit Mercury' }] },
  { id: 'm_ceres', title: 'Belt Explorer', req: ['m_mars'], reward: 320, brief: 'Visit Ceres, the largest object in the asteroid belt.', obj: [{ t: 'land', body: 'ceres', text: 'Land on Ceres' }] },
  { id: 'm_jupiter', title: 'The Giant', req: ['m_mars'], reward: 420, brief: 'Reach Jupiter. Its gravity is immense and it has no surface to land on.', obj: [{ t: 'soi', body: 'jupiter', text: 'Enter Jupiter\'s sphere of influence' }] },
  { id: 'm_europa', title: 'Ice Ocean', req: ['m_jupiter'], reward: 650, brief: 'Land on Europa\'s icy shell, above a hidden ocean.', obj: [{ t: 'land', body: 'europa', text: 'Land on Europa' }] },
  { id: 'm_galilean', title: 'Galilean Tour', req: ['m_jupiter'], reward: 700, brief: 'Visit all four large moons of Jupiter.', obj: [{ t: 'soi', body: 'io', text: 'Visit Io' }, { t: 'soi', body: 'europa', text: 'Visit Europa' }, { t: 'soi', body: 'ganymede', text: 'Visit Ganymede' }, { t: 'soi', body: 'callisto', text: 'Visit Callisto' }] },
  { id: 'm_saturn', title: 'Lord of the Rings', req: ['m_jupiter'], reward: 520, brief: 'Reach Saturn and its rings.', obj: [{ t: 'soi', body: 'saturn', text: 'Enter Saturn\'s sphere of influence' }] },
  { id: 'm_titan', title: 'Haze Moon', req: ['m_saturn'], reward: 850, brief: 'Parachute through Titan\'s thick orange atmosphere to its surface.', obj: [{ t: 'land', body: 'titan', text: 'Land on Titan' }] },
  { id: 'm_enceladus', title: 'Geyser Moon', req: ['m_saturn'], reward: 650, brief: 'Orbit Enceladus, whose south-pole geysers spray water ice into space.', obj: [{ t: 'orbit', body: 'enceladus', text: 'Orbit Enceladus' }] },
  { id: 'm_uranus', title: 'Sideways World', req: ['m_saturn'], reward: 650, brief: 'Reach the ice giant Uranus.', obj: [{ t: 'soi', body: 'uranus', text: 'Enter Uranus\'s sphere of influence' }] },
  { id: 'm_neptune', title: 'Blue Giant', req: ['m_uranus'], reward: 750, brief: 'Reach Neptune, the outermost planet.', obj: [{ t: 'soi', body: 'neptune', text: 'Enter Neptune\'s sphere of influence' }] },
  { id: 'm_triton', title: 'Retrograde Moon', req: ['m_neptune'], reward: 1100, brief: 'Land on Triton, which orbits Neptune backwards.', obj: [{ t: 'land', body: 'triton', text: 'Land on Triton' }] },
  { id: 'm_pluto', title: 'The Heart', req: ['m_neptune'], reward: 1000, brief: 'Visit Pluto and its heart-shaped nitrogen plain.', obj: [{ t: 'soi', body: 'pluto', text: 'Enter Pluto\'s sphere of influence' }] },
  { id: 'm_plutoLand', title: 'Heart Landing', req: ['m_pluto'], reward: 1600, brief: 'Land on Pluto.', obj: [{ t: 'land', body: 'pluto', text: 'Land on Pluto' }] },
  { id: 'm_kuiper', title: 'Kuiper Tour', req: ['m_pluto'], reward: 1800, brief: 'Visit the distant dwarf planets Haumea and Makemake.', obj: [{ t: 'soi', body: 'haumea', text: 'Visit Haumea' }, { t: 'soi', body: 'makemake', text: 'Visit Makemake' }] },
  // ----- interstellar: a tutorial chain from the first research to standing on Adrian -----
  { id: 'is_program', title: 'Reaching for the Stars', req: ['m_mars'], reward: 500, brief: 'The nearest star, Proxima Centauri, is hundreds of times farther away than Neptune, even in this squeezed-down galaxy. Chemical rockets will never get there. Open the Research Center, switch to the Interstellar tab and research the Interstellar Program.', obj: [{ t: 'tech', tech: 'isProgram', text: 'Research the Interstellar Program' }], tip: 'It needs Nuclear Power from the main tree first, and 2,500 science. Missions to new worlds and experiments in new situations pay the most.' },
  { id: 'is_drive', title: 'A Drive for the Stars', req: ['is_program'], reward: 600, brief: 'Efficiency is everything between stars. Chemical engines manage about 350 seconds of specific impulse (Isp); the Helios fusion drive manages 30,000, and the Daedalus pulse engine a million. Research Fusion Propulsion.', obj: [{ t: 'tech', tech: 'fusion', text: 'Research Fusion Propulsion' }], tip: 'Higher Isp means far more delta-v from the same fuel. Fusion drives cannot run inside an atmosphere: launch them on a chemical first stage.' },
  { id: 'is_power', title: 'Power for the Voyage', req: ['is_program'], reward: 500, brief: 'Starship drives need huge amounts of electricity for their magnetic fields, and they shed heat that radiators must remove. Research Starship Power.', obj: [{ t: 'tech', tech: 'isPower', text: 'Research Starship Power' }], tip: 'A Tokamak Power Core makes 600 EC/s. Add Liquid Droplet Radiators (deploy them with G) so the reactor and engines do not overheat.' },
  { id: 'is_escape', title: 'Beyond the Heliopause', req: ['is_drive'], reward: 1500, brief: 'Leave the Sun\'s bubble. Fly out past the heliopause, about 430 million km from the Sun at this game\'s scale.', obj: [{ t: 'far', dist: 4.3e11, text: 'Travel 430 million km from the Sun' }], tip: 'From Earth orbit, burn prograde until the map shows an escape from Earth, then keep burning prograde relative to the Sun. Time warp up to 10M× while coasting.' },
  { id: 'is_coast', title: 'The Long Coast', req: ['is_escape'], reward: 2500, brief: 'Interstellar journeys are mostly coasting. Once your engines are off, use the purple warp levels (100 million to 10 billion times) to cross empty space in seconds. Coast 20 billion km from the Sun.', obj: [{ t: 'far', dist: 2e13, text: 'Coast 20 billion km from the Sun' }], tip: 'Press . to raise the warp. The three purple pips on the warp bar are the interstellar speeds. Warp stops by itself when you enter a new sphere of influence.' },
  { id: 'is_proxima', title: 'Next Door', req: ['is_coast'], reward: 6000, brief: 'Reach Proxima Centauri, the closest star to the Sun: a small red dwarf 4.25 light-years away.', obj: [{ t: 'soi', body: 'proxima', text: 'Enter Proxima Centauri\'s sphere of influence' }], tip: 'Open the map, click Proxima Centauri and set it as your target. Hold Target on the navball (TGT), burn, and watch the closest-approach marker on your trajectory. Fine-tune halfway.' },
  { id: 'is_proximaB', title: 'Eyeball World', req: ['is_proxima'], reward: 8000, brief: 'Orbit Iris, catalogued as Proxima b: an Earth-mass planet in its star\'s habitable zone. Here it is imagined as an ocean under the star and ice everywhere else.', obj: [{ t: 'orbit', body: 'proxima_b', text: 'Orbit Iris (Proxima b)' }], tip: 'Arrive fast and you will need a big braking burn. Planning the capture so your trajectory passes close to the planet saves a lot of fuel.' },
  { id: 'is_barnard', title: 'The Runaway Star', req: ['is_coast'], reward: 8000, brief: 'Reach Barnard\'s Star, the fastest-moving star in our sky, with four real rocky planets hugging it closely.', obj: [{ t: 'soi', body: 'barnard', text: 'Enter Barnard\'s Star\'s sphere of influence' }] },
  { id: 'is_barnardG', title: 'Amber Giant', req: ['is_barnard'], reward: 7000, brief: 'Orbit Beacon, a gas giant lit dim orange by its red-dwarf sun, and look for its hazy moon Lantern.', obj: [{ t: 'orbit', body: 'barnard_g', text: 'Orbit Beacon' }] },
  { id: 'is_tauceti', title: 'A Sun Like Ours', req: ['is_proxima'], reward: 15000, brief: 'Tau Ceti is a Sun-like star 11.9 light-years away, almost three times farther than Proxima. Get there.', obj: [{ t: 'soi', body: 'tauceti', text: 'Enter Tau Ceti\'s sphere of influence' }], tip: 'The Beamed-Core Antimatter Drive or the Photon Mirror Drive make this trip much shorter.' },
  { id: 'is_adrian', title: 'Hail Mary', req: ['is_tauceti'], reward: 20000, brief: 'Orbit Adrian, the green super-Earth from Project Hail Mary: 1.4 g, a 91% carbon-dioxide atmosphere, and in the novel the homeworld of Astrophage.', obj: [{ t: 'orbit', body: 'adrian', text: 'Orbit Adrian' }], tip: 'A low orbit needs about 10 km/s here. Stay above its 110 km atmosphere.' },
  { id: 'is_adrianLand', title: 'Touching Adrian', req: ['is_adrian'], reward: 30000, brief: 'Land on Adrian. With 1.4 g and a thick atmosphere you will need a heat shield, big parachutes and engines for the last part.', obj: [{ t: 'land', body: 'adrian', text: 'Land on Adrian' }] },
  { id: 'm_eris', title: 'Discord', req: ['m_kuiper'], reward: 2200, brief: 'Reach Eris, the most massive known dwarf planet, far beyond Pluto.', obj: [{ t: 'soi', body: 'eris', text: 'Enter Eris\'s sphere of influence' }] },
];
const MissionById = {}; MISSIONS.forEach(m => { MissionById[m.id] = m; });

const Missions = {
  // does the log satisfy an objective?
  check(o, log) {
    switch (o.t) {
      case 'launch': return !!log.launched;
      case 'alt': return (log.maxAlt[o.body] || 0) >= o.alt;
      case 'space': return !!log.space[o.body];
      case 'orbit': return !!log.orbit[o.body];
      case 'soi': return !!log.soi[o.body];
      case 'land': return !!log.land[o.body];
      case 'recover': return !!log.recovered;
      case 'crew': return !!log.crewed;
      case 'eva': return !!(log.eva[o.body] && (o.sit === 'landed' ? log.eva[o.body].landed : log.eva[o.body].space));
      case 'sci': return !!log.sci;
      case 'dock': return !!log.docked;
      case 'flag': return !!log.flag[o.body];
      case 'far': return (log.maxSunDist || 0) >= o.dist;
      case 'tech': return !!Save.prog.tech[o.tech];
    }
    return false;
  },
  newLog() { return { launched: false, maxAlt: {}, space: {}, orbit: {}, soi: {}, land: {}, recovered: false, crewed: false, eva: {}, sci: false, docked: false, flag: {} }; },
  available(prog) {
    return MISSIONS.filter(m => !prog.missions.done[m.id] && m.req.every(r => prog.missions.done[r]));
  },
};
