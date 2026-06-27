# Citryn Fight Club - Design Plan (V1, Private Test)

## Profile
- Time: real-time. Space: continuous 2D side-view. Agency: one fighter per side.
- Conflict: vs player (local 2P) and vs system (CPU). Outcome: best-of-3 win/lose.
- Players: local versus + solo vs CPU (client-only, no server). Session: minutes.
- Engagement: execution (footsies, timing, meter payoff).

## Experience formula
The player feels like a sharp underground brawler because the game constantly rewards
spacing, timing and reads with snappy hits, rising meter, and a cinematic special payoff.

## Modes
ARCADE (1P vs CPU), VERSUS (local 2P shared keyboard), TRAINING (free practice, infinite meter).

## Controls (physical key codes)
P1: KeyA/KeyD move, KeyW jump, KeyS crouch, KeyF punch, KeyG kick, KeyR block(hold), KeyV special.
P2: ArrowLeft/ArrowRight move, ArrowUp jump, ArrowDown crouch, KeyK punch, KeyL kick, Semicolon block(hold), Quote special.
System: Enter confirm, Escape pause. Touch on-screen pads for mobile. Gamepad via Gamepad API.

## Fighters
1. BRANDON "The Brawler" - heavy street brawler (slower, higher damage). Special CONCRETE HAYMAKER:
   4-hit flurry into a launching uppercut, red impact flash, heavy shake. ~38 dmg.
2. GARET "The Breaker" - acrobatic breakdance striker (fast, lower per-hit, longer jump).
   Special CYCLONE BREAKER: headspin sweep x4 into a rising axe kick, cyan/orange trails. ~34 dmg.
Move set both: idle, walk fwd/back, jump, crouch, block, punch, kick, hit react, knockdown, KO, win, special.

## Stages
1. THE LOT - sunset parking lot of an abandoned office building (from msp1 reference). Parallax sky/building/asphalt.
2. BOILER ROOM - underground basement pit: chain-link fence, pipes, caged work light, graffiti, steam. Parallax.

## Special meter
0-100. Fills: land hit +12, take hit +8, block +5, throw attack +3. At 100 the special key fires
the cinematic finisher (slow-mo, darken vignette, big damage, shake, hit-stop), then resets to 0.

## Round/match
100 HP, 60s timer, KO or timeout (higher HP wins, tie replays). Best-of-3 (first to 2).
Banners: ROUND 1 -> FIGHT! -> K.O./TIME UP -> <NAME> WINS.

## Tech
HTML5 Canvas 2D, plain JS, fixed-timestep loop, seeded RNG. Client-only (stub logic.js).
Static pose sprites (stance/punch/kick per fighter) + heavy procedural animation: lunges,
squash-stretch, screen shake, hit-stop, motion trails, afterimages, dust/impact particles.
Hurt/knockdown/KO/block/crouch/jump/walk derived procedurally from the pose sprites.

## STYLE FORMULA (locked, byte-identical into every asset prompt)
High-detail pixel art with clean shading and bold near-black outlines in a 16-bit arcade-fighter look; solid grounded fighter silhouettes with thick dark outlines and chunky readable limbs; stages rendered in warm sunset orange and deep purple-blue concrete with charcoal shadows, fighters wearing saturated street-wear tones that pop against the backdrop, energy effects and meters marked with electric cyan and hot-orange neon; gritty underground fight-club mood with hard directional rim light against dusky shadow; high contrast between fighters and background, clean readable silhouettes, consistent flat side-view perspective across all assets.

## STYLE TOKEN
16-bit pixel-art fighter, sunset-orange & purple concrete, cyan & hot-orange neon, bold black outlines, side-view

## Performance budget
60 fps target; <16ms frame; no per-frame allocations in the hot loop; pooled particles; DPR capped 1.5.
