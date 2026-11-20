# Automatic Rustbound updates

This workflow has been superseded by `GAME-UPDATES.md`. The existing hourly automation now covers every game. Follow that complete-library workflow for all runs; the sections below document the earlier Rustbound-only setup.

The user authorized keeping Rustbound current in Rhett’s Arcade. A local hourly heartbeat in the Launcher chat checks the saved game and publishes changes to the existing private arcade.

Source: `C:/Users/rhett/Documents/Codex/2026-10-02/i-wa/outputs/rustbound.html`.
Destination: `public/games/rustbound/index.html` in this checkout.
Rustbound chat: `01a0ff8a-9f84-7930-962c-b8022ad192fa`.
Arcade Site: `appgprj_6acafdd64da081919b06b0717c88e4fb`.

## Each run

1. Read the Rustbound chat status. If it is active or its last turn failed, defer to the next check without interrupting or messaging it. Keep the currently published version until a completed export is available.
2. Read the current Sites skill and follow its existing-Site source workflow. Get the same arcade Site and a fresh source repository write credential, then open this checkout with the source helper before edits. Preserve the Site ID, current audience, all other games, the cool launcher palette, and featured rotation every 15 minutes at :00, :15, :30, and :45. Never create a new Site.
3. Run `node scripts/sync-rustbound.mjs` from this checkout. It checks HTML completeness, inline JavaScript syntax, unchanged source metadata during validation, and exact copied bytes. If unchanged and there are no unpublished Rustbound changes or pending deployments, stop. If changed, publish the checked snapshot. If validation fails, preserve the current game and report an actionable failure.
4. Package and push through the Sites source helper, then publish its exact commit and archive through the appropriate native tool for the retained audience. Inspect pending deployments to completion. Reconcile any earlier pending or saved deployment before creating another; if a prior push was not published, retry that exact state even if the local file now matches. Do not count a copy or push as a published update.
5. Leave the game path and browser save key unchanged. Do not touch Rustbound’s source files or refresh an active game. New launches or user refreshes load the updated game. Newly built games are outside this automation’s scope.

## Windows helper setup

Use `C:/Users/rhett/.codex/plugins/cache/openai-curated-remote/sites/1.0.1/scripts/site-workflow.mjs` or the current installed Sites helper. Launch from this checkout with `--project-id appgprj_6acafdd64da081919b06b0717c88e4fb` using a retained PTY. Pass credentials only through hidden stdin, never shell arguments, disk, or logs.

In that helper process set `GIT_CONFIG_COUNT=1`, `GIT_CONFIG_KEY_0=safe.directory`, and `GIT_CONFIG_VALUE_0=C:/Users/rhett/Documents/Codex/2026-10-10/is-x20/outputs/game-library`. Prepend `C:/Program Files/Git/bin` and `C:/Program Files/Git/usr/bin` to PATH; set `TAR_OPTIONS=--force-local`. These are process-scoped settings. Use the normal runtime permission flow if network access requires it.

Open with no archivePath; package with an absolute archivePath under the task’s work directory and the complete opening result as source. No dependency install or build is needed. Keep tokens in session memory only. If source access or deployment cannot proceed, preserve the source and report the blocker.
