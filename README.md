[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ujangolisampink/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ujangolisampink/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# EMBERFALL KEEP — Defend the Last Lighthouse

A tower-defense game for make.fun's "Make the best game" bounty ($1,000 in
USDC). You are the keeper of the last lighthouse. The shadow tide marches
in from the right across three lanes; build towers on the glowing plots,
survive 10 waves, and hold the light when the Dread Captain comes on
wave 10.

## How to play

- **Build:** click a glowing plot (or press 1–4) to build one of four
  towers — Ember Spout (fast flames + burn), Frost Lantern (slows),
  Spark Coil (chain lightning), Thorn Bramble (heavy splash).
- **Upgrade / sell:** click a tower, then U to upgrade (4 levels) or X
  to sell it back for 70%.
- **Waves:** press SPACE to start the next wave. Between waves, pick one
  of three boons (gold, repairs, damage, range, fire rate, bounty).
- **Win / lose:** clear wave 10 to win. If 20 light leaks past the
  lighthouse, the light fades.
- **Keys:** SPACE wave · P pause · F fast-forward · M sound · R restart.

## The boss

The Dread Captain does not just walk in. A red portal marks his arrival
and a boss health bar tracks him; every 8 seconds he raises his arms —
a red ring grows under him for 0.9 seconds — then slams the ground,
stunning nearby towers for a second. Watch the ring, not the boss.

## Files

- `game/index.html` + `game/src/` — the whole game, plain ES modules,
  no build step, no network. `config.js` holds every balance number;
  `world.js` the state and wave flow; `towers.js` / `enemies.js` /
  `projectiles.js` the simulation; `render.js` every pixel; `audio.js`
  synthesized WebAudio sound; `shots.js` deterministic screenshot
  staging (`?shot=start|play|boon|end`).
- `main.ts` — the entrypoint: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun
  library (`vendor/makefun-game.ts`, unchanged from the kit).
- `screenshots/` — 1-play (cover), 2-title, 3-boon, 4-victory, all real
  renders of the game's own code.

## Play it

```sh
node serve.ts        # then open http://localhost:8080
```

## Tests (local, Playwright + Chromium)

- All 4 staged screenshots render with zero console/page errors.
- Full auto-play bot (real UI clicks) plays waves 1–10: VICTORY in
  repeated runs (lives 14–18, score ~45k–47k, ~260 kills), matching the
  tuned balance; the boss's slam cycle (windup telegraph → slam → tower
  stun) was verified live.
- `main.ts` runs twice produce byte-identical `/output`; dossier
  579,104 bytes (cap 1.5 MiB); no `http:`/`fetch` anywhere in `game/`.
