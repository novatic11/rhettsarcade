# Ducks vs. Dogs 2 — The Great Pond Defense

A cartoony 3D lane-defense sequel. Open `index.html` to play.

## Running it
- **Locally:** double-click `index.html`. It uses plain scripts, so it works from `file://` as well as from a web host.
- **Web host / arcade:** upload the whole `ducks-vs-dogs-2` folder. Nothing needs building.
- Fonts (Bangers, Fredoka) load from Google Fonts when online; offline, it falls back to system fonts.
- Three.js r128 (MIT) is included in `lib/`.

## Adding it to Rhett's Arcade
1. Copy this folder to `games/ducks-vs-dogs-2/`.
2. Copy `cover.svg` to `covers/ducks-vs-dogs-2.svg` and `preview.png` to `previews/ducks-vs-dogs-2.png`.
3. Add an entry to `games.json` (next to the original `ducks-vs-dogs`):

```json
{
  "id": "ducks-vs-dogs-2",
  "title": "Ducks vs Dogs 2",
  "genre": "Strategy",
  "description": "The pond is back under siege! Collect 34 ducks, unlock five shops, pick your team and defend six worlds in 3D.",
  "controls": "Mouse / touch · pick a team, place ducks · 1–8 cards, R remove, Q Quack Power",
  "color": "#ffd23f",
  "accent": "#7cc8ff",
  "url": "games/ducks-vs-dogs-2/index.html",
  "cover": "covers/ducks-vs-dogs-2.svg"
}
```

4. Optional: to include it in the arcade's save-code export, add
   `{id:'ducks-vs-dogs-2',title:'Ducks vs Dogs 2',keys:['ducks-vs-dogs-2-save-v1']}` to the list in `save-code.js`.

## Saves
Progress saves automatically in the browser's `localStorage` under its own key,
**`ducks-vs-dogs-2-save-v1`**. The original game uses `ducks-vs-dogs-save-v1`, so the two can never overwrite each other.
Saved: campaign progress, objectives, coins, owned ducks, shop purchases, duck upgrades, loadout capacity,
your last team, cosmetics, settings (music, sound, graphics, speed) and Endless records.

## What's inside (v1.1 — "The Haunted Kennel" update)
- **6 worlds × 8 levels** (each ending in a boss with readable, telegraphed phases) plus **6 optional bonus challenges**.
  World 6, the Haunted Kennel, adds bone piles that dogs pop out of, colour-matched portals, a Bonk-a-Pup tap level
  and the vampire boss Count Barkula.
- **34 ducks**: 2 starters, 24 from campaign levels, 7 from shops and 1 from a challenge. Each has a role, cost,
  cooldown and its own **Quack Power**. New in 1.1: Piggybank Pintail (earns coins), Boomerang Bufflehead,
  Shiny Shelduck (reflects throws), Syrup Smew, Twisty Teal (shoots both ways), Squeaky Rubber Duck,
  Spade Scaup (digs pits and bone piles), Decoy Drake (lures dogs between lanes), Sizzle Scoter (fire) and
  Copycat Canvasback (copies the duck behind it, Quack Power included).
- **22 dog types and 6 bosses**. New in 1.1: Phantom Pups float through ducks, Mummy Mastiffs shrug off water but hate fire,
  Werewoofs transform at half health, and Balloon Beagles fly over straight shots.
- **Elements and combos**: water soaks (Zappy deals double), fire burns, but soaked dogs only steam.
- **Team Huddle loadout**: start with 5 slots. Three permanent expansions take it to 6, 7 and 8, and 8 is the hard maximum.
  Special levels (offered team, supply belt) and snacks never change your duck capacity.
- **Five shops**, each unlocked at a campaign milestone: the Traveling Duck Cart (1-4), the Tinkerer's Workshop (2-4),
  the Curious Egg Emporium (3-4), **Chef Brioche's Snack Bar** (4-2: one-level snacks) and the
  **Starlight Observatory** (5-2: spends ★ stars earned from bonus objectives).
- **Trophy Shelf** with 28 trophies that pay out coins, **Boss Rumble** (all six bosses back to back, unlocked after 6-8),
  and **Endless Pond** (unlocks after 2-8) with six arenas and a separate record for each.
- Level variety: fog, hidden dogs, canals and currents, ice, blizzards, bone piles, portals, fixed crumb budgets,
  protecting ducklings or tiles, timed rushes, offered teams, supply belts and tap-to-bonk.
- The **Duck & Dog Field Guide**, tutorials, normal/fast speed, pause and restart, a remove tool, sound and music controls,
  and **High/Low graphics** (Low suits Chromebooks).

Existing saves upgrade automatically: if you already beat a level that now awards a new duck, you get that duck on load.

## Files
```
index.html      entry point
css/style.css   cartoon UI
js/data.js      ducks, dogs, bosses, worlds, levels, shops, upgrades
js/data2.js     v1.1 expansion: new ducks, dogs, world 6, shops, snacks, trophies
js/save.js      save system
js/audio.js     synthesized sound effects and music
js/gfx.js       3D renderer, toy-like models, environments, 2D effects
js/gfx2.js      v1.1 models: new ducks and dogs, Count Barkula, new shopkeepers, haunted scenery
js/battle.js    battle engine
js/ui.js        menus, map, team select, shops, results, guide
js/main.js      boot and input
lib/three.min.js
cover.svg, preview.png   arcade art
```
