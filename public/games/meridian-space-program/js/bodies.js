'use strict';
// ---------- The Solar System, scaled down for play ----------
// Worlds are 1/10 of their real size with real surface gravity (GM = g * R^2), so
// orbital speeds are about a third of real values. Distances are squeezed further:
// planets sit at (real AU)^0.7 times Earth's distance, so the outer planets are much
// closer, and moons sit 45% closer to their planets beyond 2.5 planet radii.
// The order and shape of every orbit is kept.
const SCALE = 0.1;
const KSC = { lat: 5.3 * DEG, lon: -53.2 * DEG, body: 'earth', alt: 28 };

// id, name, type, parent, radius km, gravity m/s2, semi-major axis km, rotation hours ('sync' = tidally locked), texture
const BODY_ROWS = [
  ['sun', 'Sun', 'star', null, 695700, 274.0, 0, 609.12, '2k_sun.jpg'],
  ['mercury', 'Mercury', 'planet', 'sun', 2439.7, 3.70, 57909050, 1407.6, '2k_mercury.jpg'],
  ['venus', 'Venus', 'planet', 'sun', 6051.8, 8.87, 108208000, -5832.6, '2k_venus_surface.jpg'],
  ['earth', 'Earth', 'planet', 'sun', 6371.0, 9.807, 149598023, 23.9345, '2k_earth_daymap.jpg'],
  ['moon', 'Moon', 'moon', 'earth', 1737.4, 1.62, 384399, 'sync', '2k_moon.jpg'],
  ['mars', 'Mars', 'planet', 'sun', 3389.5, 3.721, 227939366, 24.6229, '2k_mars.jpg'],
  ['phobos', 'Phobos', 'moon', 'mars', 11.08, 0.0057, 9376, 'sync', null],
  ['deimos', 'Deimos', 'moon', 'mars', 6.2, 0.003, 23463, 'sync', null],
  ['ceres', 'Ceres', 'dwarf', 'sun', 469.7, 0.28, 413690250, 9.074, '2k_ceres_fictional.jpg'],
  ['jupiter', 'Jupiter', 'planet', 'sun', 69911, 24.79, 778479000, 9.925, '2k_jupiter.jpg'],
  ['io', 'Io', 'moon', 'jupiter', 1821.6, 1.796, 421700, 'sync', null],
  ['europa', 'Europa', 'moon', 'jupiter', 1560.8, 1.314, 670900, 'sync', null],
  ['ganymede', 'Ganymede', 'moon', 'jupiter', 2634.1, 1.428, 1070400, 'sync', null],
  ['callisto', 'Callisto', 'moon', 'jupiter', 2410.3, 1.235, 1882700, 'sync', null],
  ['saturn', 'Saturn', 'planet', 'sun', 58232, 10.44, 1433530000, 10.561, '2k_saturn.jpg'],
  ['mimas', 'Mimas', 'moon', 'saturn', 198.2, 0.064, 185539, 'sync', null],
  ['enceladus', 'Enceladus', 'moon', 'saturn', 252.1, 0.113, 237948, 'sync', null],
  ['tethys', 'Tethys', 'moon', 'saturn', 531.1, 0.146, 294619, 'sync', null],
  ['dione', 'Dione', 'moon', 'saturn', 561.4, 0.232, 377396, 'sync', null],
  ['rhea', 'Rhea', 'moon', 'saturn', 763.8, 0.264, 527108, 'sync', null],
  ['titan', 'Titan', 'moon', 'saturn', 2574.7, 1.352, 1221870, 'sync', null],
  ['iapetus', 'Iapetus', 'moon', 'saturn', 734.5, 0.223, 3560820, 'sync', null],
  ['uranus', 'Uranus', 'planet', 'sun', 25362, 8.69, 2870972000, 17.24, '2k_uranus.jpg'],
  ['miranda', 'Miranda', 'moon', 'uranus', 235.8, 0.079, 129390, 'sync', null],
  ['ariel', 'Ariel', 'moon', 'uranus', 578.9, 0.269, 191020, 'sync', null],
  ['umbriel', 'Umbriel', 'moon', 'uranus', 584.7, 0.23, 266000, 'sync', null],
  ['titania', 'Titania', 'moon', 'uranus', 788.4, 0.37, 435910, 'sync', null],
  ['oberon', 'Oberon', 'moon', 'uranus', 761.4, 0.35, 583520, 'sync', null],
  ['neptune', 'Neptune', 'planet', 'sun', 24622, 11.15, 4498400000, 16.11, '2k_neptune.jpg'],
  ['proteus', 'Proteus', 'moon', 'neptune', 210, 0.07, 117647, 'sync', null],
  ['triton', 'Triton', 'moon', 'neptune', 1353.4, 0.779, 354759, 'sync', null],
  ['nereid', 'Nereid', 'moon', 'neptune', 178, 0.072, 5513818, 11.6, null],
  ['pluto', 'Pluto', 'dwarf', 'sun', 1188.3, 0.62, 5906380000, 153.29, null],
  ['charon', 'Charon', 'moon', 'pluto', 606, 0.288, 19591, 'sync', null],
  ['styx', 'Styx', 'moon', 'pluto', 5.5, 0.002, 42656, 76.4, null],
  ['nix', 'Nix', 'moon', 'pluto', 19, 0.004, 48694, 43.9, null],
  ['kerberos', 'Kerberos', 'moon', 'pluto', 6, 0.002, 57783, 129, null],
  ['hydra', 'Hydra', 'moon', 'pluto', 19, 0.004, 64738, 10.3, null],
  ['haumea', 'Haumea', 'dwarf', 'sun', 780, 0.44, 6452000000, 3.9155, '2k_haumea_fictional.jpg'],
  ['hiiaka', 'Hiʻiaka', 'moon', 'haumea', 160, 0.047, 49880, 9.8, null],
  ['namaka', 'Namaka', 'moon', 'haumea', 85, 0.017, 25657, 'sync', null],
  ['makemake', 'Makemake', 'dwarf', 'sun', 715, 0.40, 6796200000, 22.83, '2k_makemake_fictional.jpg'],
  ['mk2', 'MK2', 'moon', 'makemake', 87, 0.02, 22250, 'sync', null],
  ['eris', 'Eris', 'dwarf', 'sun', 1163, 0.82, 10152000000, 378.9, '2k_eris_fictional.jpg'],
  ['dysnomia', 'Dysnomia', 'moon', 'eris', 307, 0.058, 37273, 'sync', null],
  ['orcus', 'Orcus', 'candidate', 'sun', 455, 0.20, 5896946000, 13.2, null],
  ['quaoar', 'Quaoar', 'candidate', 'sun', 555, 0.26, 6535930000, 17.7, null],
  ['gonggong', 'Gonggong', 'candidate', 'sun', 615, 0.31, 10080000000, 22.4, null],
  // ----- nearby stars: real stellar properties; positions are their real directions in the sky -----
  // Planets marked "real" are confirmed (or candidate) exoplanets with their measured orbits; their
  // surfaces, and every other planet and moon in these systems, are invented for the game.
  ['proxima', 'Proxima Centauri', 'star', 'sun', 107280, 1400, 0, 1992, '2k_sun.jpg'],
  ['proxima_d', 'Nessus', 'planet', 'proxima', 5100, 3.9, 4316000, 'sync', null],
  ['proxima_b', 'Iris', 'planet', 'proxima', 6560, 9.9, 7266000, 'sync', null],
  ['proxima_c', 'Nimbus', 'planet', 'proxima', 15300, 11.9, 222750000, 19.2, null],
  ['proxima_e', 'Chiron', 'planet', 'proxima', 58000, 18.2, 538560000, 11.3, null],
  ['cinder', 'Cinder', 'moon', 'proxima_e', 1900, 1.6, 420000, 'sync', null],
  ['rime', 'Rime', 'moon', 'proxima_e', 1450, 1.2, 780000, 'sync', null],
  ['proxima_f', 'Pholus', 'dwarf', 'proxima', 1100, 0.7, 1346400000, 30.5, null],
  ['tauceti', 'Tau Ceti', 'star', 'sun', 551700, 341, 0, 816, '2k_sun.jpg'],
  ['tauceti_g', 'Charybdis', 'planet', 'tauceti', 7400, 12.8, 19900000, 'sync', null],
  ['tauceti_h', 'Shroud', 'planet', 'tauceti', 7500, 12.8, 36350000, 310, null],
  ['adrian', 'Adrian', 'planet', 'tauceti', 10703, 13.73, 82580000, 29.1, null],
  ['tauceti_f', 'Hoarfrost', 'planet', 'tauceti', 10200, 15.0, 199600000, 41.0, null],
  ['tauceti_i', 'Leviathan', 'planet', 'tauceti', 66000, 21.4, 777900000, 9.8, null],
  ['halcyon', 'Halcyon', 'moon', 'tauceti_i', 1700, 1.4, 640000, 'sync', null],
  ['sable', 'Sable', 'moon', 'tauceti_i', 2300, 1.5, 1300000, 'sync', null],
  ['tauceti_j', 'Nereus', 'planet', 'tauceti', 24000, 10.5, 2094400000, 15.4, null],
  ['barnard', 'Barnard\'s Star', 'star', 'sun', 130030, 1270, 0, 3480, '2k_sun.jpg'],
  ['barnard_d', 'Flint', 'planet', 'barnard', 4200, 5.9, 2812000, 'sync', null],
  ['barnard_b', 'Slate', 'planet', 'barnard', 4450, 6.0, 3426000, 'sync', null],
  ['barnard_c', 'Shale', 'planet', 'barnard', 4550, 6.4, 4099000, 'sync', null],
  ['barnard_e', 'Ochre', 'planet', 'barnard', 3800, 5.3, 5700000, 'sync', null],
  ['barnard_f', 'Quartz', 'planet', 'barnard', 9500, 11.0, 59840000, 52.0, null],
  ['barnard_g', 'Beacon', 'planet', 'barnard', 52000, 19.0, 388960000, 12.2, null],
  ['vigil', 'Vigil', 'moon', 'barnard_g', 1300, 1.1, 360000, 'sync', null],
  ['lantern', 'Lantern', 'moon', 'barnard_g', 2100, 1.7, 820000, 'sync', null],
  ['barnard_h', 'Halo', 'planet', 'barnard', 22000, 9.8, 1047200000, 16.3, null],
];

// Extra per-body info: facts (verified, short), temperatures, surface pressure,
// atmosphere model (h = top altitude, rho0 kg/m3, H scale height, tau = visual optical depths),
// terrain style, science tier, colors for maps and procedural textures.
const BODY_EXTRA = {
  sun: { color: '#ffcf6b', temp: 5772, tier: 6, fact: 'A G-type main-sequence star holding 99.86% of the Solar System\'s mass. Its visible surface, the photosphere, is about 5,772 K.' },
  mercury: { color: '#9a8f86', temp: 440, tier: 5, terrain: { amp: 1400, cr: 0.6, crAmp: 0.6, rough: 0.5 }, fact: 'The smallest planet and closest to the Sun. With almost no atmosphere, its surface swings from about 100 K at night to 700 K at midday. Caloris Basin is one of the largest impact basins known.' },
  venus: { color: '#e6c48a', temp: 737, press: 9200, tier: 5, farTex: '2k_venus_atmosphere.jpg',
    atm: { h: 120000, rho0: 65, H: 11000, tauR: [0.3, 0.28, 0.2], tauM: 1.2, mie: [1.0, 0.9, 0.68] },
    terrain: { amp: 900, cr: 0.04, crAmp: 0.3, rough: 0.6, volcanic: true },
    fact: 'Carbon-dioxide atmosphere about 92 times Earth\'s surface pressure, with sulfuric-acid clouds. A runaway greenhouse keeps the surface near 737 K, hotter than Mercury. It rotates backwards, very slowly.' },
  earth: { color: '#4f86c6', temp: 288, press: 101.3, tier: 1, ocean: true,
    atm: { h: 70000, rho0: 1.225, H: 7000, tauR: [0.055, 0.13, 0.31], tauM: 0.025, mie: [1, 1, 1] },
    terrain: { amp: 1400, cr: 0, rough: 0.7, earth: true },
    fact: 'The only world known to host life. Nitrogen-oxygen atmosphere at 1 bar, liquid water oceans over about 71% of the surface, and a strong magnetic field.' },
  moon: { color: '#a8a8a8', temp: 250, tier: 3, terrain: { amp: 1600, cr: 0.65, crAmp: 0.7, rough: 0.45, maria: true },
    fact: 'Dark maria are ancient basaltic lava plains; the bright highlands are anorthosite crust. The same side always faces Earth because the Moon is tidally locked.' },
  mars: { color: '#c1663c', temp: 210, press: 0.636, tier: 5,
    atm: { h: 40000, rho0: 0.02, H: 8000, tauR: [0.012, 0.012, 0.016], tauM: 0.55, mie: [1.0, 0.64, 0.4] },
    terrain: { amp: 2600, cr: 0.3, crAmp: 0.5, rough: 0.6, canyons: true },
    fact: 'A thin carbon-dioxide atmosphere under 1% of Earth\'s pressure. Home of Olympus Mons, the tallest volcano known, and the Valles Marineris canyon system. Polar caps hold water and CO2 ice.' },
  phobos: { color: '#7d7068', temp: 233, tier: 5, irregular: 0.07, terrain: { amp: 0, cr: 0.6, crAmp: 0.5, rough: 0.3 }, tex: { base: [0.42, 0.38, 0.34], v: 0.08, cr: 0.6 }, fact: 'The larger, inner moon of Mars, orbiting below synchronous altitude so it is slowly spiralling inward. Dominated by the large crater Stickney.' },
  deimos: { color: '#9b8a7b', temp: 233, tier: 5, irregular: 0.07, terrain: { amp: 0, cr: 0.4, crAmp: 0.4, rough: 0.2 }, tex: { base: [0.55, 0.5, 0.44], v: 0.06, cr: 0.4 }, fact: 'The smaller, outer moon of Mars. Its craters are softened by a thick blanket of loose regolith.' },
  ceres: { color: '#8c8780', temp: 168, tier: 7, mapNote: 'artist\'s impression map', terrain: { amp: 900, cr: 0.5, crAmp: 0.6, rough: 0.4 }, fact: 'The largest object in the asteroid belt and the only dwarf planet in the inner Solar System. Bright deposits in Occator crater are mostly sodium carbonate.' },
  jupiter: { color: '#d4a777', temp: 165, tier: 9, gas: true,
    atm: { h: 300000, rho0: 0.16, H: 27000, tauR: [0.12, 0.14, 0.2], tauM: 0.35, mie: [1, 0.92, 0.8], crush: -80000 },
    fact: 'The largest planet, a gas giant of hydrogen and helium with no solid surface. The Great Red Spot is a storm larger than Earth. Its magnetosphere traps intense radiation belts.' },
  io: { color: '#d8c35a', temp: 110, tier: 9, terrain: { amp: 800, cr: 0, rough: 0.5, volcanic: true }, tex: { style: 'io' }, fact: 'The most volcanically active body known, heated by tidal flexing from Jupiter. Sulfur compounds paint its surface yellow, orange and red.' },
  europa: { color: '#d9cbb3', temp: 102, tier: 9, terrain: { amp: 160, cr: 0.02, crAmp: 0.2, rough: 0.2, lineae: true }, tex: { style: 'europa' }, fact: 'A smooth crust of water ice crossed by reddish fractures called lineae. Strong evidence points to a salty liquid-water ocean beneath the ice.' },
  ganymede: { color: '#9c907f', temp: 110, tier: 9, terrain: { amp: 600, cr: 0.3, crAmp: 0.5, rough: 0.4, grooves: true }, tex: { style: 'ganymede' }, fact: 'The largest moon in the Solar System, bigger than Mercury, and the only moon known to generate its own magnetic field.' },
  callisto: { color: '#6e6355', temp: 134, tier: 9, terrain: { amp: 700, cr: 0.85, crAmp: 0.6, rough: 0.35 }, tex: { base: [0.32, 0.28, 0.24], v: 0.1, cr: 0.9, bright: true }, fact: 'One of the most heavily cratered surfaces known. The Valhalla impact basin is surrounded by rings of ridges up to about 1,900 km across.' },
  saturn: { color: '#e3cf9a', temp: 134, tier: 11, gas: true, rings: { inner: 74658, outer: 136775, tex: '2k_saturn_ring_alpha.png' },
    atm: { h: 330000, rho0: 0.19, H: 32000, tauR: [0.1, 0.11, 0.12], tauM: 0.35, mie: [1, 0.9, 0.66], crush: -80000 },
    fact: 'The least dense planet, less dense than water. Its bright rings are made mostly of water-ice particles and span about 280,000 km while being mostly only tens of metres thick.' },
  mimas: { color: '#bdbdb8', temp: 64, tier: 11, terrain: { amp: 1200, cr: 0.75, crAmp: 0.7, rough: 0.3, herschel: true }, tex: { base: [0.72, 0.72, 0.7], v: 0.06, cr: 0.9, herschel: true }, fact: 'Dominated by Herschel crater, about 130 km across, almost a third of Mimas\'s diameter.' },
  enceladus: { color: '#f2f6fa', temp: 75, tier: 11, terrain: { amp: 400, cr: 0.2, crAmp: 0.4, rough: 0.25, lineae: true }, tex: { style: 'enceladus' }, fact: 'Among the most reflective bodies in the Solar System. Geysers of water vapour and ice erupt from the "tiger stripe" fractures near its south pole, feeding Saturn\'s E ring.' },
  tethys: { color: '#d0d0cc', temp: 86, tier: 11, terrain: { amp: 800, cr: 0.6, crAmp: 0.6, rough: 0.3 }, tex: { base: [0.8, 0.8, 0.78], v: 0.05, cr: 0.7 }, fact: 'An icy moon with the giant Odysseus crater and the long Ithaca Chasma canyon.' },
  dione: { color: '#c7c3bb', temp: 87, tier: 11, terrain: { amp: 800, cr: 0.55, crAmp: 0.6, rough: 0.3 }, tex: { base: [0.74, 0.73, 0.7], v: 0.07, cr: 0.6, wisps: true }, fact: 'Its trailing hemisphere is crossed by bright ice cliffs called chasmata.' },
  rhea: { color: '#bcb8b0', temp: 76, tier: 11, terrain: { amp: 900, cr: 0.7, crAmp: 0.6, rough: 0.3 }, tex: { base: [0.7, 0.68, 0.65], v: 0.07, cr: 0.8 }, fact: 'Saturn\'s second-largest moon, a heavily cratered ball of water ice with a small rocky fraction.' },
  titan: { color: '#d39a4e', temp: 94, press: 146.7, tier: 11, ocean: true,
    atm: { h: 110000, rho0: 5.3, H: 16000, tauR: [0.18, 0.13, 0.07], tauM: 4.0, mie: [1.0, 0.62, 0.26] },
    terrain: { amp: 350, cr: 0.02, crAmp: 0.2, rough: 0.4, dunes: true, lakes: true }, tex: { style: 'titan' },
    fact: 'The only moon with a thick atmosphere: nitrogen at about 1.5 bar. Lakes and seas of liquid methane and ethane lie near its poles, and long dune fields circle the equator.' },
  iapetus: { color: '#8a7a68', temp: 110, tier: 11, terrain: { amp: 1500, cr: 0.6, crAmp: 0.6, rough: 0.3, ridge: true }, tex: { style: 'iapetus' }, fact: 'Strikingly two-toned: the leading hemisphere (Cassini Regio) is dark, the trailing side bright. A ridge up to about 20 km high runs along much of its equator.' },
  uranus: { color: '#a8dbe0', temp: 76, tier: 13, gas: true, rings: { inner: 41800, outer: 51200, faint: 0.12, style: 'uranus' },
    atm: { h: 250000, rho0: 0.42, H: 28000, tauR: [0.07, 0.24, 0.3], tauM: 0.12, mie: [0.8, 1, 1], crush: -80000 },
    fact: 'An ice giant that rotates on its side, with an axial tilt of about 98°. Methane in the atmosphere absorbs red light, giving its pale cyan colour.' },
  miranda: { color: '#a9a9a6', temp: 60, tier: 13, terrain: { amp: 1500, cr: 0.3, crAmp: 0.5, rough: 0.6, cliffs: true }, tex: { style: 'miranda' }, fact: 'A patchwork of strange "coronae" and Verona Rupes, among the tallest cliffs known in the Solar System.' },
  ariel: { color: '#a8a6a2', temp: 60, tier: 13, terrain: { amp: 700, cr: 0.3, crAmp: 0.5, rough: 0.4, grooves: true }, tex: { base: [0.6, 0.59, 0.57], v: 0.08, cr: 0.35 }, fact: 'The brightest and possibly youngest-looking surface of Uranus\'s major moons, cut by long canyons.' },
  umbriel: { color: '#5d5a56', temp: 75, tier: 13, terrain: { amp: 700, cr: 0.75, crAmp: 0.6, rough: 0.3 }, tex: { base: [0.3, 0.29, 0.28], v: 0.06, cr: 0.8, wunda: true }, fact: 'The darkest of Uranus\'s major moons. A bright ring sits on the floor of Wunda crater.' },
  titania: { color: '#9a938c', temp: 70, tier: 13, terrain: { amp: 800, cr: 0.5, crAmp: 0.5, rough: 0.4, grooves: true }, tex: { base: [0.55, 0.52, 0.5], v: 0.08, cr: 0.55 }, fact: 'The largest moon of Uranus, with huge fault canyons such as Messina Chasma.' },
  oberon: { color: '#8a807a', temp: 75, tier: 13, terrain: { amp: 800, cr: 0.75, crAmp: 0.6, rough: 0.3 }, tex: { base: [0.5, 0.46, 0.43], v: 0.08, cr: 0.8 }, fact: 'The outermost major moon of Uranus, old and heavily cratered, with some dark crater floors.' },
  neptune: { color: '#4b70dd', temp: 72, tier: 14, gas: true, rings: { inner: 41900, outer: 62950, faint: 0.05, style: 'neptune' },
    atm: { h: 250000, rho0: 0.45, H: 22000, tauR: [0.05, 0.15, 0.45], tauM: 0.12, mie: [0.8, 0.9, 1], crush: -80000 },
    fact: 'The windiest planet: storms reach over 2,000 km/h. Like Uranus, an ice giant rich in water, ammonia and methane.' },
  proteus: { color: '#5f5a57', temp: 51, tier: 14, irregular: 0.05, terrain: { amp: 0, cr: 0.5, crAmp: 0.5, rough: 0.3 }, tex: { base: [0.28, 0.27, 0.26], v: 0.06, cr: 0.5 }, fact: 'One of the darkest objects in the Solar System and about as large as a body can be without being pulled round by its own gravity.' },
  triton: { color: '#c9b6ae', temp: 38, press: 0.0014, tier: 14,
    atm: { trace: true, h: 30000, rho0: 6e-5, H: 14000, tauR: [0.006, 0.012, 0.025], tauM: 0.01, mie: [1, 1, 1] },
    terrain: { amp: 300, cr: 0.05, crAmp: 0.3, rough: 0.35, cantaloupe: true }, tex: { style: 'triton' },
    fact: 'Orbits Neptune backwards (retrograde), a sign it is a captured Kuiper Belt object. Nitrogen geysers and "cantaloupe terrain" mark its young surface.' },
  nereid: { color: '#8a8580', temp: 50, tier: 14, terrain: { amp: 0, cr: 0.5, crAmp: 0.5, rough: 0.3 }, tex: { base: [0.45, 0.44, 0.42], v: 0.06, cr: 0.5 }, fact: 'Has one of the most eccentric orbits of any moon (e ≈ 0.75). Its orbit is simplified to a circle here.' },
  pluto: { color: '#d8b89a', temp: 44, press: 0.001, tier: 16,
    atm: { trace: true, h: 60000, rho0: 4e-5, H: 20000, tauR: [0.012, 0.035, 0.09], tauM: 0.02, mie: [0.8, 0.9, 1] },
    terrain: { amp: 700, cr: 0.25, crAmp: 0.4, rough: 0.4, sputnik: true }, tex: { style: 'pluto' },
    fact: 'Sputnik Planitia, a vast plain of nitrogen ice, forms the western lobe of the heart-shaped Tombaugh Regio. Its thin nitrogen atmosphere has layers of blue haze.' },
  charon: { color: '#9d9590', temp: 53, tier: 16, terrain: { amp: 700, cr: 0.4, crAmp: 0.5, rough: 0.35 }, tex: { style: 'charon' }, fact: 'About half Pluto\'s diameter; the two are mutually tidally locked. A reddish cap called Mordor Macula covers its north pole.' },
  styx: { color: '#999', temp: 40, tier: 16, irregular: 0.07, terrain: { amp: 0, cr: 0.3, crAmp: 0.4, rough: 0.3 }, tex: { base: [0.6, 0.6, 0.6], v: 0.05, cr: 0.3 }, fact: 'Pluto\'s smallest known moon, only about 16 km long.' },
  nix: { color: '#b5b0aa', temp: 40, tier: 16, irregular: 0.07, terrain: { amp: 0, cr: 0.3, crAmp: 0.4, rough: 0.3 }, tex: { base: [0.72, 0.7, 0.68], v: 0.05, cr: 0.3 }, fact: 'An elongated, chaotically tumbling moon of Pluto, about 50 km long.' },
  kerberos: { color: '#888', temp: 40, tier: 16, irregular: 0.07, terrain: { amp: 0, cr: 0.3, crAmp: 0.4, rough: 0.3 }, tex: { base: [0.5, 0.5, 0.5], v: 0.05, cr: 0.3 }, fact: 'A small double-lobed moon of Pluto.' },
  hydra: { color: '#bbb', temp: 40, tier: 16, irregular: 0.07, terrain: { amp: 0, cr: 0.3, crAmp: 0.4, rough: 0.3 }, tex: { base: [0.75, 0.75, 0.74], v: 0.05, cr: 0.3 }, fact: 'Pluto\'s outermost known moon; its surface is mostly water ice.' },
  haumea: { color: '#d8d0c8', temp: 50, tier: 18, rings: { inner: 2252, outer: 2322, faint: 0.35, style: 'single' }, mapNote: 'artist\'s impression map', terrain: { amp: 500, cr: 0.3, crAmp: 0.4, rough: 0.3 }, fact: 'Spins once every 3.9 hours, which stretches it into an elongated ellipsoid about 2,300 × 1,700 × 1,000 km. It has a ring and two moons, Hiʻiaka and Namaka.' },
  hiiaka: { color: '#c8c8c8', temp: 45, tier: 18, terrain: { amp: 500, cr: 0.4, crAmp: 0.5, rough: 0.3 }, tex: { base: [0.78, 0.78, 0.78], v: 0.05, cr: 0.4 }, fact: 'The larger, outer moon of Haumea, coated in crystalline water ice.' },
  namaka: { color: '#bbbbbb', temp: 45, tier: 18, terrain: { amp: 400, cr: 0.4, crAmp: 0.5, rough: 0.3 }, tex: { base: [0.7, 0.7, 0.7], v: 0.05, cr: 0.4 }, fact: 'The smaller, inner moon of Haumea.' },
  makemake: { color: '#c99a7a', temp: 40, tier: 18, mapNote: 'artist\'s impression map', terrain: { amp: 500, cr: 0.25, crAmp: 0.4, rough: 0.3 }, fact: 'A reddish-brown dwarf planet whose surface is rich in methane ice. It has one known moon, S/2015 (136472) 1, nicknamed MK2.' },
  mk2: { color: '#3d3a38', temp: 40, tier: 18, terrain: { amp: 300, cr: 0.4, crAmp: 0.5, rough: 0.3 }, tex: { base: [0.15, 0.14, 0.14], v: 0.05, cr: 0.4 }, fact: 'Formally S/2015 (136472) 1. Very dark, unlike bright Makemake. Its exact orbit and mass are uncertain; values here are estimates.' },
  eris: { color: '#e8e6e2', temp: 30, tier: 20, mapNote: 'artist\'s impression map', terrain: { amp: 500, cr: 0.25, crAmp: 0.4, rough: 0.3 }, fact: 'The most massive known dwarf planet, about 27% more massive than Pluto though slightly smaller. Its real orbit is highly inclined (44°) and eccentric; it is simplified here.' },
  dysnomia: { color: '#555', temp: 30, tier: 20, terrain: { amp: 400, cr: 0.4, crAmp: 0.5, rough: 0.3 }, tex: { base: [0.25, 0.24, 0.24], v: 0.05, cr: 0.4 }, fact: 'Eris\'s only known moon. It is dark, and its mass was used to weigh Eris.' },
  orcus: { color: '#8f8a86', temp: 42, tier: 16, candidate: true, terrain: { amp: 400, cr: 0.35, crAmp: 0.4, rough: 0.3 }, tex: { base: [0.5, 0.49, 0.48], v: 0.06, cr: 0.35 }, fact: 'Dwarf-planet candidate (not recognised by the IAU). Orbits in a 2:3 resonance with Neptune like Pluto, and has a moon, Vanth.' },
  quaoar: { color: '#a07a62', temp: 44, tier: 18, candidate: true, terrain: { amp: 400, cr: 0.35, crAmp: 0.4, rough: 0.3 }, tex: { base: [0.52, 0.4, 0.33], v: 0.06, cr: 0.35 }, fact: 'Dwarf-planet candidate (not recognised by the IAU). Has a ring orbiting far outside its Roche limit and a moon, Weywot.' },
// ----- Proxima Centauri system -----
  proxima: { color: '#ff8a4c', temp: 3042, lum: 0.00155, tier: 40, starTint: [3.2, 1.75, 0.95], light: 0xffb486, sky: [0.42, 0.3, 0.26],
    fixed: { ra: 217.42895, dec: -62.67948, ly: 4.2465 },
    fact: 'The closest star to the Sun, 4.25 light-years away: a red dwarf (M5.5) with 12% of the Sun\'s mass, 15% of its radius and about 0.16% of its brightness. It flares violently and is the third member of the Alpha Centauri system.' },
  proxima_d: { color: '#6e5a4e', temp: 360, tier: 40, terrain: { amp: 1500, cr: 0.4, crAmp: 0.5, rough: 0.5 }, tex: { style: 'scorched', base: [0.36, 0.29, 0.25] },
    fact: 'Catalogued as Proxima d. Real planet, confirmed in 2022: at least a quarter of Earth\'s mass, orbiting every 5.1 days. It is too hot for water. Its surface here is invented.' },
  proxima_b: { color: '#9ab4c8', temp: 240, press: 82, tier: 42, ocean: true, sky: [0.5, 0.5, 0.62],
    atm: { h: 60000, rho0: 1.0, H: 7500, tauR: [0.06, 0.12, 0.26], tauM: 0.05, mie: [1, 0.85, 0.7] },
    terrain: { amp: 1600, cr: 0.03, crAmp: 0.3, rough: 0.6, continents: true, sea: 0.08 }, tex: { style: 'eyeball' },
    fact: 'Catalogued as Proxima b. Real planet, confirmed in 2016: about Earth\'s mass, in the habitable zone, orbiting every 11.2 days. It is probably tidally locked, so this version is an "eyeball world": an open ocean under the star and ice everywhere else. Its real surface is unknown.' },
  proxima_c: { color: '#7ea6c4', temp: 39, tier: 44, gas: true, sky: [0.45, 0.6, 0.8],
    atm: { h: 200000, rho0: 0.4, H: 24000, tauR: [0.05, 0.14, 0.4], tauM: 0.12, mie: [0.8, 0.9, 1], crush: -80000 },
    tex: { style: 'gas', bands: [[0.42, 0.6, 0.74], [0.55, 0.72, 0.84], [0.36, 0.52, 0.68]], turb: 0.6, n: 7 },
    fact: 'Catalogued as Proxima c. A candidate planet reported in 2020 (about 7 Earth masses, a 5.2-year orbit) that later studies question. Shown here as a small, cold ice giant.' },
  proxima_e: { color: '#c08a62', temp: 30, tier: 46, gas: true, rings: { inner: 75000, outer: 122000, faint: 0.45, style: 'icy', tint: [0.86, 0.76, 0.62] }, sky: [0.7, 0.55, 0.42],
    atm: { h: 300000, rho0: 0.18, H: 27000, tauR: [0.12, 0.13, 0.17], tauM: 0.35, mie: [1, 0.85, 0.7], crush: -80000 },
    tex: { style: 'gas', bands: [[0.78, 0.56, 0.4], [0.9, 0.78, 0.62], [0.6, 0.38, 0.27], [0.84, 0.66, 0.5]], turb: 0.9, n: 11, spot: [0.5, 0.25, 0.2] },
    fact: 'Invented for the game: a ringed gas giant far beyond the habitable zone, where Proxima is only a dim red disc.' },
  cinder: { color: '#5a3e30', temp: 140, tier: 46, terrain: { amp: 900, cr: 0.05, rough: 0.5, volcanic: true }, tex: { style: 'lava', base: [0.22, 0.16, 0.13] },
    fact: 'Invented for the game: a tidally heated volcanic moon of Chiron, its black lava plains cracked with glowing fissures.' },
  rime: { color: '#cfd8e0', temp: 60, tier: 46, terrain: { amp: 200, cr: 0.05, crAmp: 0.2, rough: 0.2, lineae: true }, tex: { style: 'europa' },
    fact: 'Invented for the game: an ice-shelled moon of Chiron with a possible ocean underneath.' },
  proxima_f: { color: '#c9d0d8', temp: 25, tier: 48, terrain: { amp: 600, cr: 0.5, crAmp: 0.5, rough: 0.35 }, tex: { base: [0.76, 0.79, 0.84], v: 0.06, cr: 0.5 },
    fact: 'Invented for the game: a small frozen world at the edge of the Proxima system.' },
  // ----- Tau Ceti system -----
  tauceti: { color: '#ffe0a8', temp: 5344, lum: 0.52, tier: 60, starTint: [3.2, 2.6, 1.85], light: 0xfff0d8, sky: [0.42, 0.6, 0.92],
    fixed: { ra: 26.01701, dec: -15.93748, ly: 11.912 },
    fact: 'A Sun-like star (G8.5) 11.9 light-years away, with 78% of the Sun\'s mass and about half its brightness. It is poor in heavy elements and is surrounded by a dusty debris disc about ten times denser than the Sun\'s Kuiper Belt.' },
  tauceti_g: { color: '#4a3028', temp: 650, tier: 60, terrain: { amp: 1200, cr: 0.05, rough: 0.5, volcanic: true }, tex: { style: 'lava', base: [0.2, 0.14, 0.12] },
    fact: 'Catalogued as Tau Ceti g. Candidate planet (reported 2017): about 1.75 Earth masses, a 20-day orbit. Far too hot for water; shown here as a lava world.' },
  tauceti_h: { color: '#d6b878', temp: 560, press: 5200, tier: 60, sky: [0.85, 0.7, 0.42],
    atm: { h: 100000, rho0: 32, H: 10000, tauR: [0.26, 0.24, 0.18], tauM: 1.0, mie: [1.0, 0.9, 0.66] },
    terrain: { amp: 900, cr: 0.03, crAmp: 0.3, rough: 0.6, volcanic: true }, tex: { style: 'venus' },
    fact: 'Catalogued as Tau Ceti h. Candidate planet (reported 2017): about 1.8 Earth masses, a 49-day orbit. Shown here as a cloud-wrapped greenhouse world like Venus.' },
  adrian: { color: '#5e8a4a', temp: 320, press: 160, tier: 80, ocean: true, sky: [0.5, 0.72, 0.45],
    atm: { h: 110000, rho0: 3.1, H: 9000, tauR: [0.06, 0.14, 0.09], tauM: 0.09, mie: [0.75, 1.0, 0.6] },
    terrain: { amp: 2400, cr: 0.02, crAmp: 0.3, rough: 0.6, continents: true, sea: 0.02 }, tex: { style: 'adrian' },
    fact: 'Tau Ceti e, named Adrian in Andy Weir\'s novel Project Hail Mary: 1.68 Earth radii, 3.93 Earth masses, 1.4 g, orbiting every 168 days at 0.552 AU. Its air is 91% carbon dioxide, 7% methane and 1% argon, and it looks green from space. In the book it is the homeworld of Astrophage and of Taumoeba, which lives in its upper atmosphere.' },
  tauceti_f: { color: '#b8c8d4', temp: 190, press: 40, tier: 62, sky: [0.5, 0.6, 0.78],
    atm: { h: 50000, rho0: 0.45, H: 8000, tauR: [0.04, 0.08, 0.18], tauM: 0.05, mie: [1, 1, 1] },
    terrain: { amp: 1500, cr: 0.15, crAmp: 0.4, rough: 0.4 }, tex: { style: 'ice' },
    fact: 'Catalogued as Tau Ceti f. Candidate planet (reported 2017): about 3.9 Earth masses, a 636-day orbit at the cold outer edge of the habitable zone. Shown here as a frozen super-Earth with a thin nitrogen atmosphere.' },
  tauceti_i: { color: '#c9a77e', temp: 110, tier: 64, gas: true, sky: [0.8, 0.7, 0.55],
    atm: { h: 300000, rho0: 0.16, H: 27000, tauR: [0.12, 0.14, 0.2], tauM: 0.35, mie: [1, 0.92, 0.8], crush: -80000 },
    tex: { style: 'gas', bands: [[0.86, 0.74, 0.58], [0.68, 0.5, 0.36], [0.94, 0.88, 0.76], [0.58, 0.42, 0.3]], turb: 1.1, n: 13, spot: [0.75, 0.4, 0.3] },
    fact: 'Invented for the game: a Jupiter-like gas giant in the gap of Tau Ceti\'s debris disc.' },
  halcyon: { color: '#d8dee6', temp: 90, tier: 64, terrain: { amp: 250, cr: 0.05, crAmp: 0.2, rough: 0.2, lineae: true }, tex: { style: 'europa' },
    fact: 'Invented for the game: an icy moon of Leviathan with a liquid ocean under its cracked shell.' },
  sable: { color: '#4a4440', temp: 105, tier: 64, terrain: { amp: 900, cr: 0.8, crAmp: 0.6, rough: 0.35 }, tex: { base: [0.27, 0.25, 0.23], v: 0.07, cr: 0.85, bright: true },
    fact: 'Invented for the game: an ancient, dark, crater-saturated moon of Leviathan.' },
  tauceti_j: { color: '#7fc0c8', temp: 55, tier: 66, gas: true, rings: { inner: 34000, outer: 48000, faint: 0.15, style: 'dusty', tint: [0.62, 0.7, 0.72] }, sky: [0.5, 0.8, 0.85],
    atm: { h: 250000, rho0: 0.42, H: 28000, tauR: [0.07, 0.24, 0.3], tauM: 0.12, mie: [0.8, 1, 1], crush: -80000 },
    tex: { style: 'gas', bands: [[0.55, 0.8, 0.84], [0.66, 0.88, 0.9], [0.48, 0.72, 0.78]], turb: 0.4, n: 6 },
    fact: 'Invented for the game: a pale ice giant orbiting inside Tau Ceti\'s debris disc.' },
  // ----- Barnard's Star system -----
  barnard: { color: '#ff9658', temp: 3195, lum: 0.0034, tier: 50, starTint: [3.2, 1.85, 1.0], light: 0xffbc90, sky: [0.45, 0.32, 0.27],
    fixed: { ra: 269.45207, dec: 4.69339, ly: 5.963 },
    fact: 'A red dwarf (M4) 5.96 light-years away, the closest single star to the Sun. It has the largest proper motion of any star in our sky, about 10.4 arcseconds a year, and is roughly 10 billion years old.' },
  barnard_d: { color: '#5c4c44', temp: 400, tier: 50, terrain: { amp: 1100, cr: 0.45, crAmp: 0.5, rough: 0.5 }, tex: { style: 'scorched', base: [0.33, 0.27, 0.24] },
    fact: 'Catalogued as Barnard d. Real planet, confirmed in 2025 as one of four small rocky worlds packed close to Barnard\'s Star: about a quarter of Earth\'s mass, orbiting every 2.3 days. Surface invented.' },
  barnard_b: { color: '#6a5446', temp: 370, tier: 50, terrain: { amp: 1200, cr: 0.5, crAmp: 0.5, rough: 0.5 }, tex: { style: 'scorched', base: [0.38, 0.3, 0.25] },
    fact: 'Catalogued as Barnard b. Real planet, announced in 2024: about a third of Earth\'s mass, orbiting every 3.15 days. Surface invented.' },
  barnard_c: { color: '#7a6250', temp: 340, tier: 50, terrain: { amp: 1300, cr: 0.5, crAmp: 0.55, rough: 0.5 }, tex: { style: 'scorched', base: [0.42, 0.33, 0.27] },
    fact: 'Catalogued as Barnard c. Real planet, confirmed in 2025: about a third of Earth\'s mass, orbiting every 4.1 days. Surface invented.' },
  barnard_e: { color: '#857060', temp: 290, tier: 52, terrain: { amp: 1200, cr: 0.55, crAmp: 0.55, rough: 0.45 }, tex: { base: [0.45, 0.38, 0.33], v: 0.08, cr: 0.6 },
    fact: 'Catalogued as Barnard e. Real planet, confirmed in 2025: the smallest of the four, about a fifth of Earth\'s mass, orbiting every 6.7 days. Surface invented.' },
  barnard_f: { color: '#d4dce2', temp: 105, tier: 54, terrain: { amp: 1400, cr: 0.3, crAmp: 0.45, rough: 0.4 }, tex: { style: 'ice' },
    fact: 'Invented for the game, placed where a "super-Earth" was reported in 2018 and later ruled out: a frozen world of ice and rock.' },
  barnard_g: { color: '#d0a070', temp: 60, tier: 56, gas: true, sky: [0.82, 0.66, 0.48],
    atm: { h: 300000, rho0: 0.17, H: 27000, tauR: [0.12, 0.13, 0.17], tauM: 0.35, mie: [1, 0.86, 0.68], crush: -80000 },
    tex: { style: 'gas', bands: [[0.84, 0.62, 0.4], [0.95, 0.82, 0.62], [0.7, 0.45, 0.3], [0.88, 0.7, 0.5]], turb: 1.0, n: 10 },
    fact: 'Invented for the game: an amber gas giant lit dimly orange by its red-dwarf sun.' },
  vigil: { color: '#8a8580', temp: 70, tier: 56, terrain: { amp: 800, cr: 0.7, crAmp: 0.6, rough: 0.35 }, tex: { base: [0.48, 0.46, 0.44], v: 0.07, cr: 0.75 },
    fact: 'Invented for the game: a grey, heavily cratered inner moon of Beacon.' },
  lantern: { color: '#c79a6a', temp: 85, press: 60, tier: 56, ocean: true, sky: [0.75, 0.55, 0.3],
    atm: { h: 70000, rho0: 1.1, H: 12000, tauR: [0.14, 0.11, 0.06], tauM: 1.6, mie: [1.0, 0.68, 0.32] },
    terrain: { amp: 400, cr: 0.02, crAmp: 0.2, rough: 0.4, dunes: true, lakes: true }, tex: { style: 'titan' },
    fact: 'Invented for the game: a hazy, Titan-like moon of Beacon with an orange nitrogen-methane sky and polar lakes of liquid methane.' },
  barnard_h: { color: '#6f8ed8', temp: 35, tier: 58, gas: true, rings: { inner: 30000, outer: 52000, faint: 0.5, style: 'icy', tint: [0.78, 0.84, 0.95] }, sky: [0.35, 0.5, 0.9],
    atm: { h: 250000, rho0: 0.45, H: 22000, tauR: [0.05, 0.15, 0.45], tauM: 0.12, mie: [0.8, 0.9, 1], crush: -80000 },
    tex: { style: 'gas', bands: [[0.35, 0.5, 0.86], [0.45, 0.62, 0.92], [0.3, 0.42, 0.78]], turb: 0.5, n: 8, spot: [0.25, 0.32, 0.6] },
    fact: 'Invented for the game: a deep-blue ringed ice giant on the cold outskirts of Barnard\'s Star.' },
  gonggong: { color: '#a5574a', temp: 30, tier: 20, candidate: true, terrain: { amp: 400, cr: 0.35, crAmp: 0.4, rough: 0.3 }, tex: { base: [0.55, 0.3, 0.25], v: 0.06, cr: 0.35 }, fact: 'Dwarf-planet candidate (not recognised by the IAU). One of the reddest large objects in the Kuiper Belt, with a moon, Xiangliu.' },
};

const Bodies = (function () {
  const list = [], byId = {};
  for (const row of BODY_ROWS) {
    const [id, name, type, parent, rkm, g, akm, rot, tex] = row;
    const ex = BODY_EXTRA[id] || {};
    const R = rkm * 1000 * SCALE;
    const b = Object.assign({ id, name, type, parentId: parent, R, g, GM: g * R * R, a: akm * 1000 * SCALE, rotH: rot, tex, children: [] }, ex);
    b.solid = !b.gas && type !== 'star';
    if (type === 'star' && b.lum == null) b.lum = 1;
    b.pos = new V3(); b.vel = new V3();
    const h = strHash(id);
    b.phase0 = (h % 3600) / 3600 * Math.PI * 2;
    list.push(b); byId[id] = b;
  }
  for (const b of list) {
    if (b.parentId) { b.parent = byId[b.parentId]; b.parent.children.push(b); }
    if (b.fixed) {
      // a nearby star: its real direction (RA/Dec -> ecliptic -> game axes) and its distance squeezed
      // with the same (AU)^0.7 rule as the planets, so the gulfs between stars stay in proportion
      const f = b.fixed, ra = f.ra * DEG, de = f.dec * DEG, eps = 23.4393 * DEG;
      const xe = Math.cos(de) * Math.cos(ra), ye = Math.cos(de) * Math.sin(ra), ze = Math.sin(de);
      const yc = ye * Math.cos(eps) + ze * Math.sin(eps), zc = -ye * Math.sin(eps) + ze * Math.cos(eps);
      const AU = 1.496e11 * SCALE, D = AU * Math.pow(f.ly * 63241.08, 0.7);
      b.fixedPos = new V3(xe, zc, -yc).multiplyScalar(D); b.a = D;
    }
    else if (b.parent && b.parent.type === 'star') { const AU = 1.496e11 * SCALE; b.a = AU * Math.pow(b.a / AU, 0.7); }
    else if (b.parent) { const k = b.parent.R * 2.5; if (b.a > k) b.a = k + (b.a - k) * 0.55; }
  }
  // Axial tilts (deg). Earth is left untilted so equatorial launches line up with the Moon.
  // Moons orbit in their planet's equatorial plane and share its tilt.
  // long axis (x, toward the parent), intermediate (z), polar (y)
  const SHAPE = { phobos: [27, 22, 18], deimos: [15, 12.2, 11], proteus: [424, 396, 390], nix: [50, 35, 33], hydra: [51, 37, 31], kerberos: [19, 10, 9], styx: [16, 9, 8], haumea: [2322, 1704, 1026] };
  const TILT = { mars: 25.19, jupiter: 3.13, saturn: 26.73, uranus: 97.77, neptune: 28.32, pluto: 122.53, proxima_e: 18, proxima_c: 9, adrian: 21, tauceti_f: 14, tauceti_i: 4, tauceti_j: 31, barnard_g: 7, barnard_h: 42 };
  for (const b of list) {
    const own = TILT[b.id] || 0;
    b.orbitQ = b.parent && b.parent.tiltQ ? b.parent.tiltQ.clone() : new Q4();
    if (b.type === "moon") b.tiltQ = b.orbitQ.clone();
    else b.tiltQ = new Q4().setFromAxisAngle(new V3(1, 0, 0), own * DEG);
    b.tiltQi = b.tiltQ.clone().invert();
    b.axis = new V3(0, 1, 0).applyQuaternion(b.tiltQ);
    b.tilt = own;
  }
  // Real orbital elements: eccentricity, inclination, longitude of ascending node, argument of
  // periapsis (deg). Planets and dwarf planets are referred to the ecliptic; moons to their
  // planet's equator. Earth's orbit defines the reference plane.
  const ORB = {
    mercury: [0.2056, 7.00, 48.33, 29.12], venus: [0.0068, 3.39, 76.68, 54.88], earth: [0.0167, 0, 0, 102.9],
    moon: [0.0549, 5.145, 125.1, 318.2], mars: [0.0934, 1.85, 49.56, 286.5], phobos: [0.0151, 1.08, 16.9, 150.1], deimos: [0.00033, 1.79, 47.2, 260.7],
    ceres: [0.0758, 10.59, 80.3, 73.6], jupiter: [0.0489, 1.30, 100.46, 273.9],
    io: [0.0041, 0.05, 43.9, 84.1], europa: [0.009, 0.47, 219.1, 88.97], ganymede: [0.0013, 0.20, 63.6, 192.4], callisto: [0.0074, 0.19, 298.8, 52.6],
    saturn: [0.0565, 2.49, 113.66, 339.4], mimas: [0.0196, 1.57, 66.2, 160.4], enceladus: [0.0047, 0.01, 0, 119.5], tethys: [0.0001, 1.12, 273.0, 335.3],
    dione: [0.0022, 0.02, 0, 116.0], rhea: [0.001, 0.35, 133.7, 44.3], titan: [0.0288, 0.35, 28.1, 180.5], iapetus: [0.0286, 15.47, 81.1, 271.6],
    uranus: [0.0457, 0.77, 74.0, 96.9], miranda: [0.0013, 4.23, 326.4, 68.3], ariel: [0.0012, 0.26, 22.4, 115.3], umbriel: [0.0039, 0.13, 33.5, 84.7],
    titania: [0.0011, 0.34, 99.8, 284.4], oberon: [0.0014, 0.06, 279.8, 104.4],
    neptune: [0.0113, 1.77, 131.8, 273.2], proteus: [0.0005, 0.08, 0, 0], triton: [0.000016, 156.9, 177.6, 0], nereid: [0.7507, 7.09, 334.8, 280.8],
    pluto: [0.2488, 17.16, 110.3, 113.8], charon: [0.0002, 0.0, 0, 0], styx: [0.0058, 0.81, 0, 0], nix: [0.002, 0.13, 0, 0], kerberos: [0.0033, 0.39, 0, 0], hydra: [0.0059, 0.24, 0, 0],
    haumea: [0.195, 28.2, 122.2, 239.0], hiiaka: [0.0513, 9.8, 26.2, 154.1], namaka: [0.249, 13.0, 205.0, 178.5],
    makemake: [0.161, 28.98, 79.6, 294.8], mk2: [0.0, 0, 0, 0], eris: [0.4407, 44.04, 35.95, 151.6], dysnomia: [0.0062, 0, 0, 0],
    orcus: [0.227, 20.57, 268.8, 72.3], quaoar: [0.0396, 7.99, 188.9, 147.5], gonggong: [0.5032, 30.87, 336.8, 207.2],
    // other systems (planets are referred to their star's equator)
    proxima_d: [0.04, 0.5, 20, 0], proxima_b: [0.02, 0.8, 60, 110], proxima_c: [0.04, 2.1, 150, 40], proxima_e: [0.05, 1.6, 230, 300], cinder: [0.004, 0.1, 0, 0], rime: [0.01, 0.4, 40, 80], proxima_f: [0.18, 9.0, 300, 20],
    tauceti_g: [0.06, 1.0, 10, 30], tauceti_h: [0.03, 1.4, 90, 200], adrian: [0.04, 0.9, 140, 250], tauceti_f: [0.07, 1.8, 200, 70], tauceti_i: [0.05, 1.2, 270, 120], halcyon: [0.005, 0.3, 0, 0], sable: [0.01, 0.6, 90, 40], tauceti_j: [0.08, 2.5, 320, 300],
    barnard_d: [0.03, 0.4, 30, 0], barnard_b: [0.03, 0.6, 80, 90], barnard_c: [0.02, 0.7, 130, 180], barnard_e: [0.04, 0.9, 200, 260], barnard_f: [0.1, 3.0, 250, 30], barnard_g: [0.06, 1.4, 300, 140], vigil: [0.003, 0.2, 0, 0], lantern: [0.02, 0.5, 60, 110], barnard_h: [0.09, 2.2, 40, 310],
  };
  for (const b of list) {
    if (b.fixedPos) {
      // fixed stars don't orbit; their sphere of influence is capped well short of the Sun's neighbourhood
      b.e = 0; b.inc = 0; b.lan = 0; b.argp = 0; b.retro = false; b.n = 0; b.period = Infinity; b.bAxis = b.a; b.qOrb = new Q4(); b.M0 = 0;
      b.soi = Math.min(b.a * Math.pow(b.GM / b.parent.GM, 0.4), b.a * 0.35);
    } else if (b.parent) {
      const o = ORB[b.id] || [0, 0, 0, 0];
      b.e = o[0]; b.inc = o[1] * DEG; b.lan = o[2] * DEG; b.argp = o[3] * DEG;
      b.retro = b.inc > Math.PI / 2;
      b.n = Math.sqrt(b.parent.GM / (b.a * b.a * b.a));
      b.period = 2 * Math.PI / b.n;
      // tiny moons get a playable sphere of influence (Phobos's real one lies inside the moon)
      b.soi = Math.max(b.a * Math.pow(b.GM / b.parent.GM, 0.4), b.R * 4);
      b.bAxis = b.a * Math.sqrt(1 - b.e * b.e);
      // perifocal -> parent frame: node longitude, inclination about the node line, then periapsis
      b.qOrb = b.orbitQ.clone()
        .multiply(new Q4().setFromAxisAngle(new V3(0, 1, 0), b.lan))
        .multiply(new Q4().setFromAxisAngle(new V3(1, 0, 0), -b.inc))
        .multiply(new Q4().setFromAxisAngle(new V3(0, 1, 0), b.argp));
      b.M0 = b.phase0;
    } else { b.n = 0; b.soi = Infinity; b.period = Infinity; }
    if (b.rotH === 'sync') {
      // tidally locked: spin at the mean motion so one face keeps pointing at the parent
      b.rotRate = b.n * (b.retro ? -1 : 1);
      const p0 = relPos(b, 0).applyQuaternion(b.orbitQ.clone().invert());
      b.rot0 = Math.atan2(-p0.z, p0.x) + Math.PI;
    }
    else { b.rotRate = 2 * Math.PI / (b.rotH * 3600 * Math.sqrt(SCALE)); b.rot0 = 0; }
    // Rotation periods are compressed like orbits (x0.316) so days and years keep their real ratio.
    b.atmH = b.atm && !b.atm.trace ? b.atm.h : 0;
    // irregular bodies: real triaxial dimensions (km), normalised to the mean radius
    if (SHAPE[b.id]) { const s3 = SHAPE[b.id], gm = Math.cbrt(s3[0] * s3[1] * s3[2]); b.shape = [s3[0] / gm, s3[1] / gm, s3[2] / gm]; }
    b.maxTerrain = b.terrain ? (b.terrain.amp || 0) * 1.3 + (b.irregular ? b.R * b.irregular : 0) + (b.shape ? b.R * (Math.max(...b.shape) - 1) : 0) + 200 : 0;
    b.flyHigh = b.atm ? b.atm.h * 0.26 : 0;
    b.spaceHigh = Math.max(b.R * 0.25, b.atmH * 3, 20000);
    if (b.id === 'sun') b.spaceHigh = 3e9;
  }
  // Start the clock in the KSC morning: rotate Earth so the Sun is ~45 degrees above the eastern horizon.
  (function () {
    const e = byId.earth;
    const p = relPos(e, 0);
    const sunLon = Math.atan2(p.z, -p.x);
    e.rot0 = sunLon - KSC.lon - 45 * DEG;
  })();

  // Kepler's equation for the eccentric anomaly
  function eccAnom(b, t) {
    const e = b.e;
    let M = (b.M0 + b.n * t) % (2 * Math.PI);
    let E = e > 0.8 ? Math.PI : M + e * Math.sin(M);
    for (let i = 0; i < 12; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-12) break; }
    return E;
  }
  function relPos(b, t, out) {
    out = out || new V3();
    if (!b.parent) return out.set(0, 0, 0);
    if (b.fixedPos) return out.copy(b.fixedPos);
    const E = eccAnom(b, t);
    return out.set(b.a * (Math.cos(E) - b.e), 0, -b.bAxis * Math.sin(E)).applyQuaternion(b.qOrb);
  }
  function relVel(b, t, out) {
    out = out || new V3();
    if (!b.parent || b.fixedPos) return out.set(0, 0, 0);
    const E = eccAnom(b, t), k = b.n / (1 - b.e * Math.cos(E));
    return out.set(-b.a * k * Math.sin(E), 0, -b.bAxis * k * Math.cos(E)).applyQuaternion(b.qOrb);
  }
  // points around a body's orbit in its parent's frame (for drawing)
  function orbitPoints(b, n) {
    const pts = [];
    if (b.fixedPos) return pts;
    for (let i = 0; i <= n; i++) { const E = i / n * Math.PI * 2; pts.push(new V3(b.a * (Math.cos(E) - b.e), 0, -b.bAxis * Math.sin(E)).applyQuaternion(b.qOrb)); }
    return pts;
  }
  // inertial (relative to body centre) <-> body-fixed rotating frame
  function toBF(b, v, t, out) { out = out || new V3(); out.copy(v).applyQuaternion(b.tiltQi); return rotY(out, -rotAngle(b, t), out); }
  function fromBF(b, v, t, out) { out = out || new V3(); rotY(v, rotAngle(b, t), out); return out.applyQuaternion(b.tiltQ); }
  function surfVel(b, r, out) { out = out || new V3(); return out.copy(b.axis).multiplyScalar(b.rotRate).cross(r); }
  const _t = new V3();
  function absPos(b, t, out) {
    out = out || new V3(); out.set(0, 0, 0);
    let c = b;
    while (c.parent) { out.add(relPos(c, t, _t)); c = c.parent; }
    return out;
  }
  function absVel(b, t, out) {
    out = out || new V3(); out.set(0, 0, 0);
    let c = b;
    while (c.parent) { out.add(relVel(c, t, _t)); c = c.parent; }
    return out;
  }
  function rotAngle(b, t) { return b.rot0 + b.rotRate * t; }
  function update(t) {
    for (const b of list) {
      if (!b.parent) { b.pos.set(0, 0, 0); b.vel.set(0, 0, 0); continue; }
      relPos(b, t, b.pos).add(b.parent.pos);
      relVel(b, t, b.vel).add(b.parent.vel);
      b.rot = rotAngle(b, t);
    }
    list[0].rot = rotAngle(list[0], t);
  }
  // Atmosphere density at altitude (kg/m3)
  function density(b, alt) {
    if (!b.atm) return 0;
    if (alt > b.atm.h) return 0;
    const d = b.atm.rho0 * Math.exp(-alt / b.atm.H);
    // fade to exactly zero at the top
    return d * smooth(b.atm.h, b.atm.h * 0.85, alt);
  }
  function pressureAtm(b, alt) {
    if (!b.atm) return 0;
    return density(b, alt) / 1.225; // relative to Earth sea level
  }
  function ambientTemp(b, alt, sunDist) {
    let space = 278 * Math.sqrt(1.496e10 / Math.max(sunDist, 1e8));
    if (!b.atm || alt > b.atm.h) return space;
    const s = clamp(alt / b.atm.h, 0, 1);
    let t = lerp(b.temp || 200, space * 0.8, s);
    if (alt < 0) t = (b.temp || 200) - alt * 0.02; // deeper is hotter inside giants
    return t;
  }
  // the star a body (or a vessel in its sphere of influence) belongs to
  function starOf(b) { while (b && b.type !== 'star') b = b.parent; return b || list[0]; }
  // unit vector from a heliocentric point toward the star that lights it
  function toStar(b, point, out) { const s = starOf(b); out = out || new V3(); out.copy(s.pos).sub(point); const l = out.length(); return l > 1 ? out.divideScalar(l) : out.set(1, 0, 0); }
  function soiChain(b) { const c = []; while (b) { c.push(b); b = b.parent; } return c; }
  return { list, byId, relPos, relVel, orbitPoints, absPos, absVel, rotAngle, update, density, pressureAtm, ambientTemp, soiChain, toBF, fromBF, surfVel, starOf, toStar };
})();
