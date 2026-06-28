# Citryn Fight Club - deploy record

## Live (private test, real-time multiplayer)
- Play URL: https://rosy-oak-905.higgsfield.gg/
- game_id: `949a2e4f-e3e4-4c89-9ac2-5c429aa6437c`   (pass this to deploy_game to UPDATE in place)
- mode: custom-server (server.js Durable Object detected = real-time online)
- Deployed: 2026-06-28
- Marketplace publish: NOT run (private/test only).

## Build pipeline
1. `python tools/build_dist.py`  -> downscales oversized art into `dist/`, zips to `citryn-fight-club.zip`
   (originals under assets/ are untouched; deploy must stay < 64 MiB uncompressed).
2. `media_upload` citryn-fight-club.zip -> PUT bytes -> `media_confirm` type file.
3. `deploy_game` with title/description/thumbnail/favicon/source_game + the game_id above to update.

## Zip layout (real-time tier)
server.js (DurableObject) + index.html + game.js + net.js + strings.js + assets/  (NO logic.js).

## Notes
- Fixed a case bug: SHEETS referenced mo/steven/tom (lowercase) but folders are Mo/Steven/Tom.
  Linux hosting is case-sensitive, so this is required for deploy. Now consistent.
- Online netcode V1 = delay-based lockstep. V2 = rollback (deferred).
- Higgsfield static host 404s any filename with a SPACE. Renamed the run sheets
  ("X run sprite.png" -> "X-run.png") and Garet's cutscene ("garets special-..." ->
  "garets-special-..."). build_dist.py now aborts if any asset name contains a space.
