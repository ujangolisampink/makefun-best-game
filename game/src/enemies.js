// EMBERFALL KEEP — enemies.js
// Spawning, movement, burns, slows and the Dread Captain's telegraphed
// slam. A wave is a queue of enemy keys; the spawner drips them onto a
// random lane every SPAWN_GAP seconds.
import { ENEMIES, WAVES, WAVE_HP_MULT, SPAWN_GAP, SPAWN_X, GOAL_X, LANES_Y, SLAM_INTERVAL, SLAM_WINDUP, SLAM_RADIUS, SLAM_STUN } from './config.js';

export function buildSpawnQueue(waveIndex) {
  const queue = [];
  for (const [key, count] of WAVES[waveIndex]) {
    for (let i = 0; i < count; i++) queue.push(key);
  }
  // Shuffle lightly so a wave never arrives as one solid block of a type.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

export function spawnEnemy(state, key) {
  const def = ENEMIES[key];
  const hpMult = WAVE_HP_MULT[state.wave - 1] || 1;
  const lane = Math.floor(Math.random() * LANES_Y.length);
  const e = {
    key, def, lane, x: SPAWN_X + Math.random() * 120, y: LANES_Y[lane],
    hp: Math.round(def.hp * hpMult), maxHp: Math.round(def.hp * hpMult),
    speed: def.speed * (0.9 + Math.random() * 0.2),
    slowUntil: 0, slowFactor: 1, burnUntil: 0, burnDps: 0, burnTimer: 0,
    wobble: Math.random() * Math.PI * 2, dead: false, leaked: false,
    flash: 0, radius: def.radius,
    // Boss slam state: counts down to the next slam; while it is inside
    // the windup window the boss telegraphs (render draws the red ring).
    slamTimer: key === 'dread' ? SLAM_INTERVAL : 0,
    telegraph: false,
  };
  state.enemies.push(e);
  return e;
}

// The boss slam: a windup the player can see coming, then a shockwave
// that stuns nearby towers. Returns nothing; it mutates state.
function updateSlam(state, e, dt) {
  if (e.key !== 'dread' || e.dead || e.leaked) { e.telegraph = false; return; }
  e.slamTimer -= dt;
  e.telegraph = e.slamTimer <= SLAM_WINDUP && e.slamTimer > 0;
  if (e.slamTimer > 0) return;
  // Slam lands.
  e.slamTimer = SLAM_INTERVAL;
  e.telegraph = false;
  state.shake = Math.min(14, state.shake + 7);
  state.audio.slam();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    state.particles.push({
      x: e.x + Math.cos(a) * 20, y: e.y + Math.sin(a) * 20,
      vx: Math.cos(a) * 260, vy: Math.sin(a) * 160 - 60,
      life: 0.5, maxLife: 0.5, size: 3, color: '#ff5d7a', gravity: 240,
    });
  }
  state.particles.push({
    x: e.x, y: e.y, vx: 0, vy: 0, life: 0.45, maxLife: 0.45,
    size: SLAM_RADIUS, color: '#ff5d7a', gravity: 0, ring: true,
  });
  for (const t of state.towers) {
    const dx = t.plot.x - e.x, dy = t.plot.y - e.y;
    if (dx * dx + dy * dy <= SLAM_RADIUS * SLAM_RADIUS) {
      t.stun = Math.max(t.stun || 0, SLAM_STUN);
      state.floats.push({ x: t.plot.x, y: t.plot.y - 30, text: 'STUNNED!', color: '#ff8fa3', life: 0.8, vy: -30, small: true });
    }
  }
}

export function updateEnemies(state, dt) {
  const now = state.time;
  for (const e of state.enemies) {
    if (e.dead || e.leaked) continue;
    updateSlam(state, e, dt);
    // Burn damage over time. A burn kill pays out exactly like a shot
    // kill: route it through onKill so the player gets the bounty, the
    // score and the kill count (and the tower that lit the fire gets
    // the kill credit). Silently flagging the enemy dead here used to
    // swallow a third of an ember army's kills.
    if (now < e.burnUntil) {
      e.burnTimer -= dt;
      if (e.burnTimer <= 0) {
        e.burnTimer = 0.5;
        e.hp -= e.burnDps * 0.5;
        if (e.hp <= 0) {
          if (e.burnTower) e.burnTower.kills += 1;
          state.onKill(e);
          continue;
        }
      }
    }
    const slowed = now < e.slowUntil;
    const speed = e.speed * (slowed ? e.slowFactor : 1);
    e.x -= speed * dt;
    e.wobble += dt * 6;
    if (e.flash > 0) e.flash -= dt;
    if (e.x <= GOAL_X) {
      e.leaked = true;
      state.lives -= e.def.leak;
      state.shake = Math.min(14, state.shake + 8);
      state.audio.leak();
      state.floats.push({ x: GOAL_X + 40, y: e.y - 20, text: `-${e.def.leak} LIGHT`, color: '#ff5d7a', life: 1.2, vy: -40 });
      if (state.lives <= 0) {
        state.lives = 0;
        state.screen = 'defeat';
        state.audio.defeat();
      }
    }
  }
  state.enemies = state.enemies.filter((e) => !e.dead && !e.leaked);
}

export function killEnemy(state, e) {
  e.dead = true;
  state.kills += 1;
  state.score += e.def.bounty * 10 + state.wave * 5;
  const gold = e.def.bounty + state.killGoldBonus;
  state.gold += gold;
  state.goldEarned += gold;
  state.audio.coin();
  state.floats.push({ x: e.x, y: e.y - e.radius - 6, text: `+${gold}g`, color: '#ffd27f', life: 0.9, vy: -46 });
  // Burst of embers on death.
  for (let i = 0; i < 10; i++) {
    state.particles.push({
      x: e.x, y: e.y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.7) * 220,
      life: 0.5 + Math.random() * 0.4, maxLife: 0.9, size: 2 + Math.random() * 3,
      color: e.def.color, gravity: 320,
    });
  }
}
