# Rhett’s Arcade for Claude

This directory is a standalone copy of the arcade source. It includes the launcher, game builds, Playtest builds, and server code.

Open this folder in Claude Code and describe the changes you want. Edit and test changes here, then tell Rhett which files changed. Rhett can bring the updated files back to Codex for review and publication.

Run `npm ci` with Node.js 22.13 or later, then run `npm run dev` for a local preview. The project has its database schema, but online features may require local database setup or test environment values. Use your own local test values.

The source includes historical project notes and paths. If a game update points to a file outside this folder, work with the included build in `public/games/` or `playtest/games/`. Treat the historical deployment instructions as reference.
