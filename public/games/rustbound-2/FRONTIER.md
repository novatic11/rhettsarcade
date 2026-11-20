# Rustbound Legacy — Far Horizons

Rustbound Legacy is available in the Arcade Archives. Save key: `rustbound-2-demo-v1`.

Open **Journal (H)** for the optional eight-chapter quest line, permanent research, named base flags, hull repairs, battery charging and landing practice. Quests can be accepted or paused without restricting free play; past milestones count and each reward pays once. The first fuel tutorial is optional and replayable.

Ship electricity is physical storage plus sunlight generation. Autopilot has no electricity requirement or power draw. Standby draws 0.15/s and ship experiments draw an additional 2/s. A capsule/probe has 180 energy; battery packs add 300; solar wings supply 12/s in sunlight. The original lander has 480 energy and 14/s generation. Removing a battery through staging removes its capacity. Power loss stops ship experiments; autopilot, orbital insertion, station rendezvous and landing guidance continue at zero charge, including after reloading a save. Charging at a warehouse uses actual base battery stock. Research adds capacity without filling it for free.

Landing approaches pause flight for three real-time checks: track attitude, time three braking burns, and hold against drift. Each check waits for Start; players can pause the checks. An average of at least 55% passes. A failure crash-lands at the destination, empties every fuel tank and causes 70 hull damage. Failed outcomes are saved immediately. Manual descents also trigger checks. Practice never affects the ship. Hull repairs take four seconds outside, costing two carried alloy or 40 credits near a gantry; interrupted repairs refund their cost.

## Systems and wormholes

Helios retains its original positions and flight physics; Brontes has animated cloud belts, a spiral storm and fine rings. Each outer system now has 14 nonstellar bodies: 12 landable worlds and two giants. There are 88 celestial bodies and 71 landable worlds. Existing colony, ship and wormhole identities and positions are preserved.

- **Vesper**: twilight mineral coasts, ringed Umbra and three moons, blue Nacre, tilted ice dwarfs Sleet and Cairn.
- **Amber**: broad-ringed Aureole, reef moon Loam, Boreal and three moons, sintered canyons and ivory salt dwarfs.
- **Aster**: violet Regent, jade sinkhole moon Karst, tilted Tangent and its rings, and the Drift-Mote pair.
- **Abyss**: the retained red/orange accretion disc, soot-ringed Mordant, pale relic moons, indigo Nocturne and distant ice refuges.
- **Tempest**: a rotating blue pulsar, charged Dynamo, tilted Catena, metal and crystal moons, ion-glazed ice and outer frost dwarfs.

All five wormhole connections are bidirectional:

`Helios / Brontes ↔ Vesper ↔ Abyss ↔ Tempest`

`Abyss ↔ Amber ↔ Aster`

Brontes Gate has a focus-centered ellipse, eccentricity 0.38 and inclination 0.25 radians. Mouths move continuously in game time. Select a wormhole in the system map or flight destination list, fly to its moving mouth, then press **Enter → destination** within 1,900 m. Arrival is outside the paired mouth, preventing immediate bounce-back. Wormholes require no research or transit fee. The researched stellar drive is an optional direct shortcut using 120 energy and 10% of liquid tank capacity.

New cobalt, iridium and helium-3 deposits can be mined, carried, stored and sold from the warehouse. Frontier instruments unlock magnetic, radiation and deep-ice experiments, with environment requirements. Each world has its own survey regions, relays and artifact names. Existing science custody, power, unique-location rewards and save/password integration are retained.

No new flight-planning system was added.

## Release 1.0

Optional Flight school includes the fuel line, returned science, rocket presets, electricity, safe landing practice and Brontes wormhole. The main menu includes Continue, confirmed New expedition with a reversible backup, restore, controls, volume, sensitivity, cinematic camera and three graphics presets. Performance targets Chromebook displays with lower pixel density, no shadow pass and no atmospheric composite. Distant worlds use simpler geometry; detailed terrain and surface props load only when nearby. No phone tests were performed, as requested.

Final descent uses available thrust, local gravity and a conservative braking envelope. All five presets complete Cinder–Luma round trips on natural power and fuel, with real landing checks and no hull damage in release tests. Damaged ships cannot launch below adequate thrust. Rescue is available after failed landings, power loss or low fuel, even at zero credits, with a persisted five-minute cooldown; it preserves colonies, cargo and research.

Save intents resume ordinary flight, orbit assist, wormhole approach and cleared final descent. Processing batches keep all samples through reload. Local rolling recovery and a manual previous-expedition backup use separate game-owned save keys, registered with password saves. New/restore reloads suppress the old session’s exit autosave to avoid overwriting the replacement. Save storage failures are shown to the player.

Settings also offers Wipe Rustbound Legacy save. The player must type WIPE and confirm. It creates a fresh expedition and clears both game-owned backups; settings and other games are preserved. Empty backup tombstones are included in password exports so old backup data does not silently return on import. Reset failures restore the previous local values where possible and show an error.

All surface sky and sunlight cycles are 2.5 times longer. Cinder has a 20-minute full cycle (about 10 minutes of daylight) at 1×. The same shared periods drive visible sun movement, solar production and Next dawn, without slowing rescue cooldowns, work rates or flight controls.

## Industrial frontier additions

Fresh Cinder games begin with no installed solar array and zero base battery charge. Existing saved colonies retain all their buildings and stocks. The optional eight-step guide begins by buying a solar array and wiring it to the warehouse and Science Processer. Journal pulses with a Start here cue until first opened, and remembers that across saves; reduced motion keeps a steady glow.

Fabricators make mechanical components, control electronics, cobalt-strengthened alloy or precision components. Cryo Plants turn mined ice/Helium-3 into actual propellant, piped to Refueler fuel inlets. Fusion Reactors consume real Helium-3 + ice, produce up to90 energy/s and throttle to electrical demand plus battery room. Every recipe respects ingredient/output capacity, pause and fractional power. Input pipes filter the selected recipe so product does not feed back into the wrong buffer.

Machines can receive two material-funded upgrades (+35% throughput and +20% demand per level). Four industrial supply orders consume real local warehouse stock and pay once. Shipyard offers optional local-material rollout, using alloy/components/electronics instead of credits. All choices, levels, stock, orders and generated goods persist through existing password saves.

Far Horizons adds 40 authored bodies, including 10 gas/ice giants and 30 landable moons and dwarfs. The prior outer worlds also receive authored geology, mineral palettes, nine resource seams and six survey sites. Every landable world has distinct physical footstep sequences. Journal / Stars now includes a hierarchical atlas, resource hints and landing progress. The new skybox has clustered stars, galactic dust and six system moods; Chromebook lowers texture and star budgets.

On Chromebook-sized screens, the construction palette collapses while placing a building, exposing the ground. A successful purchase exits placement to avoid duplicate charges. Pointer-down placement samples the actual click position.


## Orbital Works / 1.1

Open **Stations (K)** to browse the free 26-module showroom. Fly 650–12,000 m above a planet, giant or moon and deploy a 4,000-credit core. New stations begin with empty cargo and batteries. Build off exposed reciprocal ports in six directions, rotate parts 90° or choose material-funded assembly. The visible pressure tunnels share one station power, cooling and resource network. Limits: 12 stations, 64 modules each. Structural changes are blocked while the player's ship is attached; outer modules salvage for 65%, and loaded storage cannot be removed. A 2,700-credit starter plan builds a hub, large solar wing, dock, cargo, battery and radiator atomically.

The 26 modules include straight/corner/three-way/four-way/vertical tunnels and hubs; docking, cargo, propellant and drydock services; solar panels, large wings, cells, capacitors, fusion and radiators; habitats, greenhouses, research laboratories, observatories, refineries, fabricators, fuel plants, trade relays and antimatter farms. Per-module pause is saved. Radiator shortage throttles production. Reactor fuel, ingredients, storage room and electricity remain physical finite budgets; multiple sockets never multiply generation. Solar arrays stop during host eclipses. Exotic antimatter yields are 3× at Tempest and 20× at Abyss.

Select stations in the map, flight destination list or their space markers. Autopilot flies a safe transfer, follows a moving orbital rendezvous and compares relative velocity before capture. Near approaches skip a redundant ascent. The docking camera frames the visiting ship and station together. E undocks with retained station velocity. Docked service consumes actual station fuel/charge; cargo and returned sample custody transfer through Cargo & services. Orbital labs analyze each returned sample once for 120% value. Drydocks repair hulls using alloy and refit saved designs; a refit starts with empty fuel tanks/batteries and must be supplied. Trade Relays enable paid finite deliveries and real-stock exports. Four optional orbital milestones pay once. All station data, approach intent and docking attachments live inside the existing game save and password system.

Fourteen new surface buildings: Wind Turbine, Geothermal Plant, Large Solar Farm, Grid Battery Vault, Industrial Smelter, Electronics Foundry, Chemical Plant, Water Recovery Plant, Crystal Separator, Heavy Machine Works, Hydroponic Greenhouse, Surface Observatory, Antimatter Laboratory and Trade Terminal. Each has working ports and an original animated model with slope-adjusted foundations. Wind requires an atmosphere; geothermal works at night and doubles on volcanic ground; large solar produces 126/s; the grid vault stores 3,000 energy. Building categories and a compact scrolling catalog keep construction practical on Chromebook screens.

Six new goods—silicon, ceramics, polymers, provisions, survey records and antimatter—are recognized by warehouses, cargo, pipes, recipes and saves. Ten production recipes, five additional supply orders and four research upgrades connect them to the existing economy. New machine power/recipes, distant colony production, storage and selected exports survive reloads. Station and surface model detail is batched by material; distant station geometry is released and detailed hardware loads only nearby. Desktop and 1024×600 Chromebook checks are required; phone testing remains excluded by user preference.


## Real Solar System / 1.4

The right-hand main-menu card opens ?universe=solar before simulation modules load. It replaces the fictional catalog with the Sun, eight planets, the five recognized dwarf planets, and 32 selected moons (46 bodies, 41 landable surfaces). Orbits, parentage and general visual identities follow the real system; sizes, distances, gravity and day lengths are independently compressed for gameplay. Start on Earth, with starter bases only on Earth and the Moon. All factories, ship parts, surface resources, research and stations remain available. No fictional wormholes appear in this mode.

Helios retains rustbound-2-demo-v1 and its recovery copies. Solar uses rustbound-2-solar-v1 plus -backup and -recovery, and marks checkpoints universe: solar to reject cross-mode saves even when IDs overlap. Shared graphics settings remain shared. Both expeditions are registered in the launcher password snapshots and game-wide Save Wiper. The in-game reset clears only the active mode. Switching modes saves before navigation and stops if storage fails.

Solar reference: https://science.nasa.gov/dwarf-planets/ and NASA planet/moon pages. Earth globe uses stylized procedural continents, not a geographic map. All surface models, factories and physics use the existing game pipeline.

## Vehicle assembly and irregular Solar worlds

The original 3D hangar now supports picked-up branches, surface/stack snapping, stack insertion, mirror and 1/2/3/4/6/8-way radial symmetry, local move/rotate handles and exact inspector values. Re-root preserves the craft geometry. Catalog thumbnails render the actual original game models. Five presets, undo/redo, material rollout and orbital drydock integration remain available. Save up to twelve reusable subassemblies alongside existing saved designs.

Optional blueprint fields offset/rotation, fill, thrustLimit, crossfeed and priority round-trip through the existing expedition saves. The physical layout uses quaternions. Flight uses filled fuel mass, connected tank networks, fuel priorities, limited thrust, rotated engine vectors and persistent ignitions; stageCount retains empty stages. Surface decouplers jettison their attached branches. Existing blueprints retain their previous geometry and defaults. Engine plumes follow engines that remain ignited after later stages.

Real Solar System shapes use body.radius as the outer reference so existing orbit, route and station clearances remain conservative. body-shapes.js supplies a shared radial surface for both mesh LODs, collision, walking, rover contacts, construction and altitude. Haumea is a three-axis ellipsoid; Phobos/Deimos/Hyperion and Pluto’s small moons have stylized irregular silhouettes; Kerberos joins two overlapping lobes. Proteus has broad facets. Ceres and selected ice moons are mildly flattened. Giant globe/limb meshes have polar flattening, with rings unchanged. These are approachable procedural approximations, not surveyed shape meshes; uncertain small moons keep their existing forms rather than inventing measured outlines. Existing non-flight saves on reshaped bodies re-seat the ship on the new terrain; airborne positions stay untouched.

Shape references: [NASA Haumea](https://science.nasa.gov/dwarf-planets/haumea/), [NASA Hyperion](https://science.nasa.gov/saturn/moons/hyperion/), [NASA Deimos](https://science.nasa.gov/mars/moons/deimos/), [NASA Kerberos](https://science.nasa.gov/dwarf-planets/pluto/moons/kerberos/), [NASA Pluto small moons](https://science.nasa.gov/blogs/new-horizons/2015/10/05/plutos-small-moons-nix-and-hydra/).

## Solar surface refresh

Every solid Solar body has a dedicated surface map, geological relief and close material finish. Twenty-one locally bundled NASA/JPL/USGS mosaics cover Earth, the Moon and selected inner worlds/major moons. Twenty bodies use original maps from scripts/bake-solar-surfaces.mjs. Historical monochrome mosaics also have original fallback maps: low-variance blank regions blend into textured terrain, avoiding empty white patches. Exact image URLs and attribution are in assets/solar/sources.json and CREDITS.md; the in-game Settings panel links to the credits. The maps are visual references, not a scientific reconstruction.

solar-geology.js defines all 41 solid-body profiles and deterministic impact basins, ridges, faults, dunes and glacier fields. world.js samples this relief through the same terrainHeight function used by both mesh LODs, walking, rovers, construction and landing. Established landing pads and tutorial access stay protected. Previously landed Solar ships re-seat onto current ground while flight saves retain their trajectories.

Surface materials use body-specific roughness, detail normals and distance-filtered micrograin. Solar albedo textures are shared and reference-counted; unloaded materials release their textures. Distant worlds and Chromebook use 512×256 GPU maps, with nearby PC maps capped at 1024×512. No gameplay texture downloads from third-party hosts are required. Original planetary outlines remain independent of albedo UVs. Earth, Venus and Titan get separated moving cloud shells, which construction raycasts ignore. Jupiter, Saturn, Uranus and Neptune now use distinct cloud styles, retaining their rings and axial tilts.


## Session admin tools

Type admin outside text fields to open the paused native dialog. The ADM prefix suppresses map/inventory shortcuts; A/D retain normal movement. Escape closes the dialog. Per-session electricity/fuel/hull overrides are initialized false and never written into checkpoints. Physical refills, supplies, research and teleported positions use the current expedition’s ordinary save. Both universes share the implementation and keep separate save keys. Teleports cancel active guidance, docking, landing checks and refueling, refund reserved repair supplies, preserve processed samples and cargo, and keep giant-orbit checkpoints tied to a valid landable world. Giant surfaces are rejected.

## Explorer assist

Enabled by default and switchable in the main menu. Landing checks become optional; missed checks hand back to autopilot. Rough impacts preserve propellant and cap damage at 10 hull (minimum 25). Help & rescue offers instant, free recovery with a repaired hull and at least 40% of active tank capacity; detached stages stay detached. Camera drags and steering keys do not cancel guided flights while assisted; E or Take manual control deliberately does. The Help panel pauses simulation and explains base projects, basic movement and a first moon flight in either expedition. Full challenge keeps the original crash, fee and cooldown rules. Existing progress, cargo, saves and colonies are retained.


Solar System Scope orbital update: 17 locally bundled CC BY 4.0 maps cover 13 real worlds plus Earth night/clouds, Venus clouds and Saturn rings. The 512/1024/2048 presets share reference-counted textures across mesh detail replacements. Seam-corrected texture gradients prevent longitude filtering stripes; distance blending exposes the original playable material up close. NASA/JPL mosaics remain for other moons. Source attribution and reconstruction labels are in assets/solar/CREDITS.md and scope/sources.json. Geometry, physics and save schemas are unchanged.


## Expedition suit

astronaut-model.js replaces the old actor through the existing models.js export. All suit meshes are original custom BufferGeometry surfaces from astronaut-geometry.js: tailored lofts, swept seams/hoses/fingers and a curved optical aperture. Static hardware is batched by material while preserving named rig joints, floating knee shields and the right-hand survey socket. Shared cloth bump detail is a small local procedural canvas; no remote model or texture dependencies are introduced.

Animation preserves advanceGait distance and foot-contact timing, limits neck turn without changing the root facing, blends idle/walk/run/jump/rover/tool poses, and corrects stance height from sole samples. A dedicated dispose method releases only the actor’s owned assets once. The final suit is 69 meshes and 84,064 triangles. Both expeditions use it; physics, interaction ranges, first-person controls and save data are unchanged.
