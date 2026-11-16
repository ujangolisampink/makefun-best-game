// EMBERFALL KEEP — projectiles.js
// Flying shots, particles and floating combat text. Projectiles home in
// on their target; when it dies mid-flight they fizzle harmlessly.
import { applyHit } from './towers.js';

export function updateProjectiles(state, dt) {
  for (const p of state.projectiles) {
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 6) p.trail.shift();
    const tgt = p.target;
    if (!tgt || tgt.dead || tgt.leaked) { p.done = true; continue; }
    const dx = tgt.x - p.x, dy = tgt.y - p.y;
    const dist = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (dist <= Math.max(step, tgt.radius)) {
      applyHit(state, p);
      p.done = true;
      state.particles.push({
        x: tgt.x, y: tgt.y, vx: 0, vy: 0, life: 0.25, maxLife: 0.25,
        size: 10, color: p.color, gravity: 0, ring: true,
      });
    } else {
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
    }
  }
  state.projectiles = state.projectiles.filter((p) => !p.done);
}

export function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.gravity || 0) * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floats) {
    f.life -= dt;
    f.y += f.vy * dt;
  }
  state.floats = state.floats.filter((f) => f.life > 0);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
}
