# Automatic updates for every game

Testing preference: keep desktop and small Chromebook screen checks. Do not test phone layouts unless Rhett explicitly requests phone testing.

Save Wiper in Your saves uses the registered game save groups, includes Archives, and requires a separate named confirmation. Preserve its progress-only key filtering, backup-before-delete behavior, game preferences, and password sync conflict checks. Its safety backup uses the separate `last-wipe` slot; it must not replace Undo load’s `last-import` backup. Register new game progress and recovery keys in `public/save-code.js` so wipes and password snapshots remain consistent.

The user authorized hourly automatic updates for every game in Rhett’s Arcade. The existing `keep-rustbound-current` local heartbeat has been expanded to cover the complete library; do not create duplicate automations.

Site ID: `appgprj_6acafdd64da081919b06b0717c88e4fb`.
Checkout: `C:/Users/rhett/Documents/Codex/2026-10-10/is-x20/outputs/game-library`.
Source registrations and game chat IDs: `game-sources.json`.

## Each run

1. Read `public/games.json`, `public/junkyard-games.json`, `public/secret-games.json`, and `game-sources.json`. Cover the main collection, Archives, and secret prototypes. Keep secret games in the admin tab and out of Rhett’s Choice. Keep Archives entries in their own catalog and out of Rhett’s Choice; never restore them to the main collection. Each added game must have an update source registration. Preserve existing game addresses and save keys, the cool launcher palette, the collection, and daily featured rotation at 12:00 AM America/Chicago (Central Time), including daylight saving changes.
2. For each bundled game, read its registered chat status and latest turn. If active, failed, or unavailable, defer that game without interrupting or messaging its chat. Continue checks for the other games. Treat notLoaded with a completed successful latest turn as ready. Collect the ready bundled game IDs, then check the live games too.
3. All registered games run inside the arcade. Read the catalogs for the current collection; Cargo Swing and Pocket Heist are released in the main library, while Laserline is in Archives. Neon Slip’s Arcade edition is developed directly in public/games/neon-slip. Its registered original source Site is retained for provenance; do not overwrite the Arcade obstacle engine with that separate build. The Undercroft uses its completed local HTML export. Rustbound 2, Car Spleef, Arcade Tycoon, Ducks vs Dogs, Switchyard, and the arcade version of Frontier are developed directly in their registered arcade public folders; source and destination are intentionally identical. Validate their current files and update their fingerprints; never restore an older external copy. If future games are registered as live links, verify their Site URLs without moving existing bundled games to another origin.
4. Read the current Sites skill and follow its existing-Site workflow. Get the arcade Site and a fresh source repository write credential and open this checkout through the source helper before edits. Preserve the Site ID and current audience returned by get_site. Never create another Site. Reconcile any pending or saved deployment from an earlier run before making another one.
5. Run `node scripts/sync-games.mjs <ready-bundled-id> ...` from this checkout. Explicitly list ready IDs if any game is deferred; no arguments means all games. If none are ready, skip this script. It checks complete HTML, script syntax, referenced local assets and module imports, stable source content during validation, safe destination paths, and exact copied bytes. It updates whole playable builds and removes obsolete files only within the registered game folder. On validation failure, retain that game’s existing copy, continue successful games, and report the specific actionable failure. Never publish partial files from an interrupted copy; rerun and verify the complete game snapshot first.
6. If no catalog links or bundled builds changed, and local HEAD matches the successfully deployed saved version with no unpublished changes or pending deployment, stop without publishing or notifying. Check the existing publication state rather than assuming that a local matching copy has been published. Reuse the known successful deployment when unchanged; do not repeatedly poll terminal deployments. If a previous push was not published, retry the exact saved/pushed state as appropriate.
7. If there are changes, package and push through the Sites source helper and deploy its exact commit and archive with the native tool for the retained audience. Inspect non-terminal deployments to completion. Publish successful game changes together in one arcade update. Do not change original game projects, expose credentials, create duplicate versions on retry, or refresh an active game. New launches and user refreshes load the current game.
8. Stay quiet when unchanged or deferred. Notify only after a published update or an actionable failure or required user input. Name the updated games briefly; do not claim game behavior tests beyond actual validation.

## Windows helper setup

Use the current installed Sites helper, currently `C:/Users/rhett/.codex/plugins/cache/openai-curated-remote/sites/1.0.1/scripts/site-workflow.mjs`. Launch from this checkout with `--project-id appgprj_6acafdd64da081919b06b0717c88e4fb` in a retained PTY. Credentials belong only in session memory and hidden stdin, never shell arguments, files, or logs.

In that process set `GIT_CONFIG_COUNT=1`, `GIT_CONFIG_KEY_0=safe.directory`, and `GIT_CONFIG_VALUE_0=C:/Users/rhett/Documents/Codex/2026-10-10/is-x20/outputs/game-library`. Prepend `C:/Program Files/Git/bin` and `C:/Program Files/Git/usr/bin` to PATH; set `TAR_OPTIONS=--force-local`. Use process-scoped settings and the normal runtime permission flow for network access.

Neon Slip uses its authoritative Arcade folder. Only the arcade’s source is packaged and deployed by this automation.

Open without archivePath. Package with the complete opening result as source, `commands: []` after successful checks, and an absolute archivePath in this task’s work directory. Run the Sites build helper before packaging; the arcade now uses a Worker and D1 for password-linked saves. Never replace the hosting manifest with a static-only configuration. Preserve SAVE_VAULT_PEPPER and database migrations. `.gitattributes` preserves exact exported bytes for bundled games on Windows. Source errors or unavailable access must not replace working games.

## Latest update badge

The launcher shows one badge on the game with the most recent updatedAt in public/games.json. If releasedAt equals updatedAt, the badge says NEW GAME; subsequent updates say NEW UPDATE. Preserve releasedAt when syncing updates; never reset a game’s release date. The sync script maintains updatedAt and buildSha256 from validated builds and recovers an interrupted metadata write on retry. Preserve these fields during launcher-only edits; never stamp every game with the publication time. If a game build is edited directly, synchronize its registered source with this script before publishing. Keep the other catalog fields, including Rhett's Choice quotes.


Junkyard saves use the existing password service and exit autosave. Preserve all game-owned keys in public/save-code.js, including frontier-save-v1. public/junkyard-games.json stores all archived game records. The sync script writes catalog metadata separately, preserving the main collection and its featured pool.


## Launcher hub and shared settings

The launcher now includes What’s New, detail panels for every main and Archives game, portable time/achievement stats, and browser-local shared settings. Keep public/game-info.json and public/game-previews.json current when games are added or materially changed. Add concise, factual entries to public/updates.json for user-facing updates; preserve earlier notes. Never invent change descriptions from a changed fingerprint alone.

Build through the package build command. scripts/build-arcade.mjs runs the normal Worker build, then scripts/arcade-pages.mjs installs the early shared settings bridge in built HTML and applies the 3D performance adapters to built JavaScript. Game source exports and their fingerprints stay untouched by launcher-only settings changes. Do not copy undecorated public game HTML over dist/client after building. Settings apply to embedded and standalone built-in games; preserve game-owned sound choices, saved settings, and save keys. Hardware settings stay local. rhetts-arcade-stats-v1 belongs to the portable library save group. Archives favorites share rhetts-arcade and remain outside the normal library and Rhett’s Choice pool.

What’s New shows launcher updates and main-library games only. Exclude Archives and admin/secret games from that feed even when their builds are updated. Their detail panels and save support remain available in their own collections.

Rustbound 2 now has two independent expeditions. Preserve ?universe=solar, its Earth/Moon starter bases, and rustbound-2-solar-v1 with -backup/-recovery. Helios keeps its original keys and six systems. Both expeditions belong to the same launcher save group; in-game resets target only the active mode.

## Requests and Admin Tab

Keep Request directly below Settings and keep its name field above the letter, with the Request submit button beneath. /api/requests stores letters in the existing D1 binding in its own arcade_requests table; schema/index creation is idempotent and never alters save tables. Sender cookies are signed using SAVE_VAULT_PEPPER. Sending has an atomic two-minute cooldown and an additional IP-hash rate limit. Never store raw IP addresses or expose the inbox publicly.

REQUEST_ADMIN_EMAILS is an owner-email allowlist supplied as a runtime secret. Inbox/read actions require the Sites trusted authenticated user ID and a matching trusted email. The owner signs in through the normal /signin-with-chatgpt link; do not put credentials or admin tokens in public JavaScript. Preserve both secrets when updating environment variables. The Admin Tab remains separate from main-library games and Rhett’s Choice; its existing browser-local personal panels are unchanged.

Rustbound 2 Solar surface textures are bundled in assets/solar. Preserve sources.json and CREDITS.md when copying its export. Original maps can be rebuilt with scripts/bake-solar-surfaces.mjs from the registered body profiles; do not replace observed mosaics with blank placeholder images. Source files and fingerprints include all assets. Keep Chromebook texture limits and existing expedition save keys intact.


Rustbound 2 now includes Solar System Scope / INOVE CC BY 4.0 imagery in public/games/rustbound-2/assets/solar/scope/. Preserve attribution, exact source provenance, and fictional-reconstruction labels in the Solar credits. Scope maps affect only the Real Solar System; do not replace fictional-world materials or the other moons’ NASA/JPL maps. Keep texture sharing/disposal, longitude filtering and distance-to-terrain blending when updating rendering.


Rustbound 2’s astronaut is now exported through models.js from astronaut-model.js, with custom surface helpers in astronaut-geometry.js. Preserve this export, all named rig joints, distance-based footfall timing, grounded stance correction and smooth rover/tool poses. Keep the character’s original custom geometry and shared-material batching when updating it.


## Prototype collections and polish

Odd Hours, Parcel Panic and Ricochet Club are released in games.json with default main source collection. Their choiceQuote fields now contain the user’s supplied quotes, so all three participate in Rhett’s Choice; never invent a quote or substitute the description. The rotation only includes games with a nonempty choiceQuote. Bridgewright, Cloudkeeper and Starball have moved to junkyard-games.json with collection junkyard at the user’s request. All six keep their original game URLs, <game-id>-prototype-v1 progress and <game-id>-settings-v1 preferences. Never restore archived games or promote Admin games automatically.

The three newly released games have individual art, effects and synthesized Studio audio. Preserve the runtime’s pause/mute/exit gating and bounded voices. Ricochet Club retains twelve opening tables and generates endless deterministic rooms after that, with fixed-step physics and target routes built from valid trajectories. Keep unlimited-room progression and the bounded unlocked-room selector; do not restore the old twelve-level cap. Odd Hours has forty distinct reportable anomalies and five shifts. Parcel Panic retains its original van snapshot schema; visual effects are transient.

The original six-game setup scripts now initialize missing assets only and preserve later edits and Archives moves. Edit each existing game in place. Do not regenerate its art or replace updated gameplay with the original prototype templates.


Requests use a single persistent production D1 arcade_requests table shared by all senders and all owner browsers. Signed sender cookies identify cooldowns, retry receipts, and the sender’s private request history/notifications; never filter the owner inbox by sender, IP, save password or browser storage. Reading a request changes its shared read state, not its delivery or visibility. The private summary endpoint checks for arrivals even while the owner reads or paginates; new mail must be announced without discarding the open letter. Shared networks allow independent senders, with a 300/hour aggregate abuse ceiling and an exact retry deadline. Preserve this database and owner authentication across deployments.

Car Spleef 3D is released immediately after Car Spleef, with the user’s quote. Its authoritative build is public/games/car-spleef-3d; keep its locally bundled Three.js r128 and license. Preserve rhettsArcade.carSpleef3d and the separate car-spleef-3d-settings-v1 preference mirror. Its stats remain independent of the original Car Spleef.

Crazy Sort is released in the main library with the user’s exact quote. Preserve crazysort.v1, its best-score-based difficulty unlocks, and crazy-sort-settings-v1, which keeps sound/music preferences when progress is wiped. Its authoritative build is public/games/crazy-sort.

Requests use ?view=requests, with the existing compose form above the sender’s own history. Owner replies and status changes (Unread / In Progress / Released) are append-only events in the migration-owned arcade_request_events table. Preserve the original arcade_requests rows and their signed sender hashes. Notification counts are per unseen event, scoped to that sender cookie, and are acknowledged only when the sender opens a request, up to the latest event actually loaded. Owner read state is separate from request status. Preserve reply idempotency, draft recovery, private owner authorization and additive migrations.

Slide Between is released in the fourth library slot (start of the second row in the standard layout). It has no choiceQuote and must stay out of Rhett’s Choice until the user provides one. Preserve sb.best, sb.course, sb.diff, sb.sound and sb.music. sb.gfx is a browser-local hardware preference. Its authoritative build is public/games/slide-between; preserve bundled Three.js 0.160.0, postprocessing dependencies and license.

Meridian Space Program is released at the start of the second row in games.json, with its original card ID, artwork and supplied choiceQuote retained. Its authoritative build is public/games/meridian-space-program, registered as bundled. Preserve meridian_space_program_v1, meridian_space_program_quick_v1 and meridian_space_program_settings_v1. The program and quicksave belong to password saves; Save Wiper keeps its separate preference mirror. Preserve its provided texture files, README credits, and fictional-world labels. It now participates in Rhett’s Choice.

The supplied October 30 Meridian update adds per-world cloud profiles and interstellar display names. Body IDs, mission IDs, saved references and save keys remain unchanged. Keep the arcade adapters in index.html, js/main.js and js/save.js when importing future exports.

Ducks vs. Dogs 2 is released immediately after Ducks vs Dogs, using the supplied folder and its cover/preview. Preserve ducks-vs-dogs-2-save-v1 and the arcade preference mirror ducks-vs-dogs-2-settings-v1. The original game stays separate. js/save.js mirrors preferences, js/main.js flushes on arcade exit, and js/gfx.js honors the shared Chromebook profile without rewriting the saved graphics choice. Its authoritative update source is its arcade public folder; retain originalSource when checking the supplied Claude folder for updates.

Square Off 2 is an Admin Tab placeholder only (status coming-soon, source mode pending). It has no game URL or playable file and must stay outside the main collection, Rhett’s Choice, public updates and save groups until released. Preserve the exact choiceQuote: "A sequel to Square Off, with more upgrades, fun, and chaos." When the user supplies and releases the game, insert it immediately after square-off in public/games.json, retaining its card ID, quote and cover. releaseAfter in the pending catalog/source records this placement.

Your Stats now uses stats-dashboard.js, stats-dashboard-model.js and stats-dashboard.css, with the achievement catalog in achievements.js (re-exported from arcade-model.js). Preserve the existing rhetts-arcade-stats-v1 schema, all 17 original achievement IDs, recognized unlock timestamps and password portability. The 76 milestones read existing save fields without altering game progress. Overview totals and genre shares include only released main/Archives catalog games. Never invent earlier playtime, daily history or streaks. Meridian designs are a name-keyed object, its start technology is not researched, Switchyard delivered is cumulative, and Ducks vs. Dogs 2 campaign goals exclude bonus levels. Future achievements need verified save fields and bounded progress. Pending Admin cards remain excluded.

## Square Off 2 release — 2026-11-04
The owner supplied and released Square Off 2. It now follows square-off immediately in public/games.json and is removed from the Admin Tab. This supersedes the earlier pending-only instructions. Preserve its exact choiceQuote and existing cover. The complete validated game build is bundled in public/games/square-off-2; the source registration points to this shared workspace. Its sole key square-off-2-save-v1 joins password snapshots without touching original Square Off keys.

Square Off 2 music update: imported the user-supplied revised music.js on 2026-11-04. Longer loop selections and updated quiet-gap handling; game identity and square-off-2-save-v1 remain unchanged.

Teasers is a public news feed at ?view=teasers with owner-only publishing via /api/teasers/publish, sharing the trusted REQUEST_ADMIN_EMAILS authorization check with Requests. arcade_teasers and arcade_teaser_images are additive D1 tables initialized idempotently. Never expose request letters or credentials in this public feed. Posts have UUID retry keys and atomic image writes; snapshots are served as bounded JPEG/PNG/WebP images with nosniff. Drafts use rhetts-teaser-draft-v1, separate from game/password saves. Keep the sidebar entry and Admin manage link.


Neon Slip’s Arcade edition is now developed in public/games/neon-slip, including its November 5 obstacle rebuild and November 8 expansion to ten encounters. This folder is the authoritative bundled source. Preserve originalSourceProjectId/originalSource for provenance; do not overwrite the Arcade edition from the separate original Site. Classic and existing save keys remain unchanged.

Neon Slip polish uses flight-fx.js for presentation and its fixed 120 Hz clock, plus flight.css for the main game's flight console. Keep this clock, the 0.1-second catch-up bound, 20 Hz cached HUD, bounded rings/particles/trails, responsive key reversal, and reduced-motion/Chromebook adaptations. Ship banking and effects do not alter collision geometry. Classic remains separate.

Neon Slip’s Warden encounters are implemented in public/games/neon-slip/boss.js. Roll exactly once with probability .25 at each positive multiple of 1,000 score, including score gained during a fight; successful rolls queue until normal hazards clear. Bosses draw four unique modules from eight weapons and one temporary player gun from three. The gun auto-fires only during active combat; all modules must fall before core damage. Preserve the three-point temporary combat hull, existing shield priority, Dash phasing, telegraphs, projectile limits, safe arrival/victory transitions, pause/restart cleanup, and +60/module plus +400/core rewards. Destroying a rail module cancels its beam; already deployed other attacks remain until cleared or victory. Classic is unchanged.


## Playtest tab

Admin is for the request inbox and publishing teasers. Place future unfinished hosted builds under `playtest/games/<id>/`, outside `public/`. Add cards to `playtest/catalog.json`: use `id`, `title`, `description`, and optional `controls`, `cover` and `url`. Point covers and launch URLs to `/api/playtest/game/<id>/<filename>`, including `index.html` explicitly. Use relative links for game assets. Builds are embedded in the Worker, so use this for small builds and choose private object storage for larger ones. Unfinished builds stay out of public game catalogs and updates. Keep the shared password in the `PLAYTEST_PASSWORD` runtime secret; sessions use a signed, eight-hour cookie. Existing personal links remain browser-local and are shown after unlocking.
