// EMBERFALL KEEP — towers.js
// Tower placement, targeting, firing, upgrades and selling. Towers sit
// on build plots; each level multiplies damage and slightly extends
// range. A tower stunned by the Dread Captain's slam cannot fire until
// its stun timer runs out.
import { TOWERS, TOWER_KEYS, UPGRADE_COST, UPGRADE_MULT, SELL_FRACTION, PLOT_ROWS_Y, PLOT_COLS_X } from './config.js';

export function plotAt(x, y) {
  for (const py of PLOT_ROWS_Y) {
    for (const px of PLOT_COLS_X) {
      const dx = x - px, dy = y - py;
      if (dx * dx + dy * dy <= 30 * 30) return { x: px, y: py };
    }
  }
  return null;
}

export function towerAt(state, plot) {
  return state.towers.find((t) => t.plot.x === plot.x && t.plot.y === plot.y) || null;
}

export function buildTower(state, plot, key) {
  const def = TOWERS[key];
  if (!def || state.gold < def.cost) return false;
  if (towerAt(state, plot)) return false;
  state.gold -= def.cost;
  state.towers.push({
    key, def, plot, level: 1, cooldown: 0, angle: -Math.PI / 2,
    invested: def.cost, kills: 0, flash: 0, stun: 0,
    phase: Math.random() * Math.PI * 2, // idle-bob phase, per tower
  });
  state.audio.build();
  burst(state, plot.x, plot.y, def.color, 14);
  return true;
}

export function upgradeTower(state, t) {
  if (t.level >= 4) return false;
  const cost = UPGRADE_COST[t.level - 1];
  if (state.gold < cost) return false;
  state.gold -= cost;
  t.invested += cost;
  t.level += 1;
  state.audio.upgrade();
  burst(state, t.plot.x, t.plot.y, t.def.color, 20);
  state.floats.push({ x: t.plot.x, y: t.plot.y - 34, text: `LEVEL ${t.level}!`, color: t.def.glow, life: 1.1, vy: -30 });
  return true;
}

export function sellTower(state, t) {
  const refund = Math.floor(t.invested * SELL_FRACTION);
  state.gold += refund;
  state.towers = state.towers.filter((o) => o !== t);
  state.audio.coin();
  state.floats.push({ x: t.plot.x, y: t.plot.y - 30, text: `+${refund}g`, color: '#ffd27f', life: 0.9, vy: -40 });
  return refund;
}

function burst(state, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    state.particles.push({
      x, y, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.8) * 260,
      life: 0.4 + Math.random() * 0.4, maxLife: 0.8, size: 2 + Math.random() * 3,
      color, gravity: 200,
    });
  }
}

function towerDamage(t, state) {
  return t.def.damage * Math.pow(UPGRADE_MULT, t.level - 1) * (1 + state.damageBonus);
}
function towerRange(t, state) {
  return t.def.range * (1 + 0.06 * (t.level - 1)) * (1 + state.rangeBonus);
}
function towerRate(t, state) {
  return t.def.rate * (1 - state.hasteBonus);
}

export function updateTowers(state, dt) {
  for (const t of state.towers) {
    t.cooldown -= dt;
    if (t.flash > 0) t.flash -= dt;
    if (t.stun > 0) { t.stun -= dt; continue; } // slammed: silent this tick
    const range = towerRange(t, state);
    // Target: the enemy furthest along (closest to the lighthouse) in range.
    let best = null, bestX = Infinity;
    for (const e of state.enemies) {
      const dx = e.x - t.plot.x, dy = e.y - t.plot.y;
      if (dx * dx + dy * dy <= range * range && e.x < bestX) { best = e; bestX = e.x; }
    }
    if (!best) continue;
    t.angle = Math.atan2(best.y - t.plot.y, best.x - t.plot.x);
    if (t.cooldown > 0) continue;
    t.cooldown = towerRate(t, state);
    t.flash = 0.12;
    state.audio.shoot(t.key);
    state.projectiles.push({
      x: t.plot.x, y: t.plot.y - 10, target: best, tower: t,
      speed: t.def.projSpeed, color: t.def.projColor, kind: t.key,
      damage: towerDamage(t, state), trail: [],
    });
  }
}

export function applyHit(state, proj) {
  const t = proj.tower;
  const target = proj.target;
  if (!target || target.dead || target.leaked) return;
  const def = t.def;
  if (def.key === 'spark') {
    // Chain lightning: the target plus the two nearest other foes.
    const hits = [target];
    const others = state.enemies
      .filter((e) => e !== target && !e.dead && !e.leaked)
      .map((e) => ({ e, d: (e.x - target.x) ** 2 + (e.y - target.y) ** 2 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, def.chain - 1)
      .map((o) => o.e);
    hits.push(...others);
    for (const e of hits) damageEnemy(state, e, proj.damage, t);
    return;
  }
  if (def.key === 'thorn') {
    for (const e of state.enemies) {
      const dx = e.x - target.x, dy = e.y - target.y;
      if (dx * dx + dy * dy <= def.splash * def.splash) damageEnemy(state, e, proj.damage, t);
    }
    state.shake = Math.min(10, state.shake + 2);
    burst(state, target.x, target.y, def.color, 8);
    return;
  }
  damageEnemy(state, target, proj.damage, t);
  if (def.burn) {
    target.burnUntil = state.time + def.burnTime;
    target.burnDps = def.burn * Math.pow(UPGRADE_MULT, t.level - 1);
    target.burnTower = t; // so a burn kill credits the tower that lit it
  }
  if (def.slow) {
    target.slowUntil = state.time + def.slowTime;
    target.slowFactor = 1 - def.slow;
  }
}

export function damageEnemy(state, e, dmg, t) {
  e.hp -= dmg;
  e.flash = 0.12;
  state.audio.hit();
  state.floats.push({ x: e.x + (Math.random() - 0.5) * 20, y: e.y - e.radius - 2, text: `${Math.round(dmg)}`, color: '#ffffff', life: 0.55, vy: -60, small: true });
  if (e.hp <= 0 && !e.dead) {
    t.kills += 1;
    // killEnemy lives in enemies.js; world wires it in as state.onKill.
    state.onKill(e);
  }
}

export { TOWER_KEYS };
