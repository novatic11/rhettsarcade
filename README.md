# Rhett’s Arcade

A web launcher for Square Off, Neon Slip, Rustbound, The Rooms Between, Stellar Forge, and The Undercroft. All six games are built in and open inside the arcade player, with Library, Open game, and Fullscreen controls. The library supports search, genre filters, favorites, and random play.

Individual games keep their existing local save keys and behavior. The launcher can link those saves, unlocks, scores, settings, and favorites to an online password. Some games need a keyboard and mouse; the library shows controls for each title.

At the bottom, Create password checks global availability for a 2–64 character password containing only ASCII letters. The player confirms before an atomic claim attaches the current browser's complete save snapshot. Capitals matter. Load saves checks the password and previews progress before confirmation. A full snapshot replaces all registered game keys, including clearing absent saves so players do not inherit someone else's unlocks. Unrelated origin storage is excluded. IndexedDB keeps a safety backup before replacement; Undo load disconnects the device before restoring that backup. Other launcher tabs stop their running game before loading. Close standalone game tabs first.

Linked progress syncs on changes and at five-second intervals, with Save now available. Browser progress remains intact offline; syncing retries when connected. Revision checks and cross-tab locks prevent silent stale overwrites: conflicting devices must choose which copy to keep, and the other copy is backed up locally. Only progress actually saved by each game is captured. Online snapshots use the bounded, validated internal save codec with compression; the copy/paste code controls are replaced. Maximum compressed transport is 1,500,000 characters; larger saves show an error and retain local progress.

The server stores HMAC-derived password lookup keys, save payloads, revisions, hashed expiring access tokens, and short-lived rate counters in D1. It does not store plaintext passwords. SAVE_VAULT_PEPPER is a required runtime secret configured through Sites; preserve it across deployments and do not rotate it casually, because existing passwords depend on it. A save password is a bearer capability: anyone with it can load and change that save, and there is no recovery process. Production cookies are HttpOnly, Secure and SameSite=Strict. APIs reject cross-origin requests, invalid save keys and invalid passwords. Database migrations live in drizzle/; preserve applied migrations and the DB hosting binding.

The Rhett’s Choice banner rotates through the complete catalog every 15 minutes, at :00, :15, :30, and :45. Its cover, title, personal quote (`choiceQuote` in `public/games.json`), controls, and Play link update together. The selection uses the current quarter-hour clock slot, so it stays consistent across devices and reloads, and catches up when a sleeping tab becomes visible again.

The launcher uses a midnight-blue palette, refreshed SVG covers, a live next-pick countdown, a rotation progress line, and responsive game cards. Jump back in links to the last played game using the existing library save. The Your saves navigation link opens the password section. Decorative motion respects reduced-motion preferences. Keep game exports, catalog update dates and the password backend separate from visual launcher changes.

Returning to the library, using browser Back, or switching games flushes the outgoing game's existing leave handlers and immediately uploads its password-linked snapshot. Explicit saves queue after any pending background upload so the last progress cannot be skipped. The launcher confirms online success; failures retain local progress and use the existing retry and conflict flow. Loading another password skips the exit upload so old progress cannot overwrite the saves being restored.

## Adding another game

The latest game update gets a NEW UPDATE badge above its favorite button. `scripts/sync-games.mjs` records `updatedAt` and `buildSha256` in the catalog only when a validated game build changes, including recovery after an interrupted metadata write. Unchanged checks and launcher-only edits preserve the badge. When editing a bundled game directly, run the sync script against its registered source before publishing.

Put the game's complete browser build in `public/games/<game-id>/`, with its entry page named `index.html`. Keep all relative assets and module imports together. Add a cover in `public/covers/` and a record to `public/games.json`, following the existing records. Use relative hosted paths rather than local computer paths. Keep IDs and paths stable to avoid broken bookmarks. Then build and publish an update to the existing Site ID in `.openai/hosting.json`.

Neon Slip includes its Classic mode and shop. The Undercroft includes its latest randomized rooms and audio. Their save keys remain unchanged, but original-site saves stay on those original sites because browsers store progress by website address. The arcade copies maintain their own saves.

Every listed game stays current through the hourly local update check. All six synchronize completed playable builds and publish one arcade update when needed. Neon Slip uses its authoritative arcade public folder; the other games use their completed local builds or exports. Each game is deferred while its chat is working; other ready games can still update. See `GAME-UPDATES.md` and `game-sources.json`.

When adding a game, register its source and chat ID or verified live Site in `game-sources.json` as well as its catalog record. Newly built games do not appear automatically until registered.

Also register its save keys in `public/save-code.js` so its progress joins password-linked snapshots. Preserve the internal codec version and existing key registrations.

## Preview

The site uses the supported Vinext Worker starter. Launcher and game sources are in public/, with APIs in app/api/saves/ and lib/save-vault.mjs. Install with the Sites installer when inputs change, then use its build helper. The build emits dist/client, dist/server and dist/.openai deployment metadata. Apply the generated migrations to a local Wrangler DB before preview, then run npm start with a local-only SAVE_VAULT_PEPPER variable. Do not use production credentials in a preview. On Windows, if the npm command shim fails, invoke its installed JavaScript CLI entry point with Node. Run node --test tests/*.test.mjs for storage, API and update checks. Publish through the existing Sites source helper and native tools, preserving the current audience and all runtime secrets.
