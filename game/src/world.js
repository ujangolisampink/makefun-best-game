// EMBERFALL KEEP — world.js
// Game state, wave flow, economy and win/lose. One state object is made
// by newGame() and mutated by the loop; no other file owns it.
import { START_GOLD, START_LIVES, MAX_WAVE, WAVE_CLEAR_BONUS, BOONS } from './config.js';
import { buildSpawnQueue, spawnEnemy, updateEnemies, killEnemy } from './enemies.js';
import { updateTowers } from './towers.js';
import { updateProjectiles, updateParticles } from './projectiles.js';

export function newGame(audio) {
  const state = {
    screen: 'title', // title | playing | boon | victory | defeat
    time: 0, wave: 0, gold: START_GOLD, lives: START_LIVES,
    score: 0, kills: 0, goldEarned: 0, towers: [], enemies: [], projectiles: [],
    particles: [], floats: [], spawnQueue: [], spawnTimer: 0,
    waveActive: false, betweenWaves: true, boonChoices: [],
    selectedPlot: null, selectedTower: null, buildChoice: null,
    damageBonus: 0, rangeBonus: 0, hasteBonus: 0, killGoldBonus: 0,
    speed: 1, paused: false, shake: 0, beamAngle: 0,
    banner: null, bannerTimer: 0, audio,
    bossWarn: 0, // seconds left of the red boss warning (wave 10 intro)
    onKill: (e) => killEnemy(state, e),
    stars: Array.from({ length: 90 }, () => ({
      x: Math.random() * 1280, y: Math.random() * 300,
      r: Math.random() * 1.6 + 0.4, tw: Math.random() * Math.PI * 2,
    })),
    embers: Array.from({ length: 26 }, () => ({
      x: Math.random() * 1280, y: Math.random() * 720,
      s: 0.4 + Math.random() * 0.8, drift: Math.random() * Math.PI * 2,
    })),
  };
  return state;
}

export function startWave(state) {
  if (state.wave >= MAX_WAVE || state.waveActive) return;
  state.wave += 1;
  state.spawnQueue = buildSpawnQueue(state.wave - 1);
  state.spawnTimer = 0.5;
  state.waveActive = true;
  state.betweenWaves = false;
  state.selectedPlot = null; state.selectedTower = null;
  if (state.wave === MAX_WAVE) {
    state.banner = 'FINAL WAVE — THE DREAD CAPTAIN';
    state.bossWarn = 3.0; // red vignette + portal warning while he arrives
  } else {
    state.banner = `WAVE ${state.wave} OF ${MAX_WAVE}`;
  }
  state.bannerTimer = 2.2;
  state.audio.horn();
}

function endWave(state) {
  state.waveActive = false;
  const bonus = WAVE_CLEAR_BONUS + state.wave * 5;
  state.gold += bonus;
  state.goldEarned += bonus;
  state.score += 250 * state.wave;
  state.floats.push({ x: 640, y: 120, text: `WAVE CLEAR  +${bonus}g`, color: '#ffd27f', life: 1.6, vy: -20 });
  if (state.wave >= MAX_WAVE) {
    state.screen = 'victory';
    state.audio.victory();
    return;
  }
  // Offer three random boons.
  const pool = [...BOONS];
  state.boonChoices = [];
  for (let i = 0; i < 3; i++) {
    state.boonChoices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  state.screen = 'boon';
  state.betweenWaves = true;
}

export function applyBoon(state, boon) {
  if (boon.key === 'gold') state.gold += 120;
  if (boon.key === 'repair') state.lives = Math.min(START_LIVES, state.lives + 4);
  if (boon.key === 'power') state.damageBonus += 0.15;
  if (boon.key === 'range') state.rangeBonus += 0.12;
  if (boon.key === 'haste') state.hasteBonus = Math.min(0.4, state.hasteBonus + 0.12);
  if (boon.key === 'bounty') state.killGoldBonus += 3;
  state.audio.boon();
  state.screen = 'playing';
}

export function updateWorld(state, dt) {
  state.time += dt;
  state.beamAngle += dt * 0.35;
  if (state.bannerTimer > 0) state.bannerTimer -= dt;
  if (state.bossWarn > 0) state.bossWarn -= dt;
  // Ambient drifting embers.
  for (const e of state.embers) {
    e.y -= e.s * 14 * dt;
    e.x += Math.sin(state.time * 0.7 + e.drift) * 8 * dt;
    if (e.y < -6) { e.y = 726; e.x = Math.random() * 1280; }
  }
  if (state.screen !== 'playing') { updateParticles(state, dt); return; }
  if (state.paused) return;
  const sdt = dt * state.speed;
  if (state.waveActive) {
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= sdt;
      if (state.spawnTimer <= 0) {
        spawnEnemy(state, state.spawnQueue.shift());
        state.spawnTimer = 0.85;
      }
    } else if (state.enemies.length === 0) {
      endWave(state);
      return;
    }
  }
  updateEnemies(state, sdt);
  if (state.screen !== 'playing') return; // defeat may have happened
  updateTowers(state, sdt);
  updateProjectiles(state, sdt);
  updateParticles(state, sdt);
}
