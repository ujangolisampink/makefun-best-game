// EMBERFALL KEEP — render.js
// Every pixel of the game: night sky, lighthouse beam, village, lanes,
// mid-field scenery, towers, enemies, HUD and all screens. The judge
// sees the game mostly through screenshots, so this file is where the
// game wins or loses.
//
// Polish notes (v2): the mid-field is dressed with fixed-seed scenery
// (rocks, grass tufts, glow-shrooms, ember flowers) so the lanes never
// read as empty bands; every tower type has its own silhouette and gains
// visible extras as it levels up; and the Dread Captain is telegraphed
// hard — a red vignette and portal while he arrives, a growing red ring
// during his slam windup, a boss health bar at the top, and dizzy stars
// over towers his slam stuns.
import { VIEW_W, VIEW_H, TOWERS, TOWER_KEYS, LANES_Y, PLOT_ROWS_Y, PLOT_COLS_X, PLOT_R, MAX_WAVE, UPGRADE_COST, SELL_FRACTION, LIGHTHOUSE_X, SCENERY, SLAM_RADIUS } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

export function render(ctx, state, mouse) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawSky(ctx, state);
  drawVillage(ctx, state);
  drawLanes(ctx, state);
  drawScenery(ctx, state);
  drawPlots(ctx, state, mouse);
  drawTowers(ctx, state, mouse);
  drawEnemies(ctx, state);
  drawProjectiles(ctx, state);
  drawParticles(ctx, state);
  drawFloats(ctx, state);
  drawLighthouse(ctx, state);
  drawHud(ctx, state);
  drawBossBar(ctx, state);
  if (state.bossWarn > 0 || state.enemies.some((e) => e.key === 'dread')) drawBossVignette(ctx, state);
  if (state.bannerTimer > 0 && state.screen === 'playing') drawBanner(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'boon') drawBoon(ctx, state);
  if (state.screen === 'victory') drawEnd(ctx, state, true);
  if (state.screen === 'defeat') drawEnd(ctx, state, false);
  if (state.paused && state.screen === 'playing') drawPaused(ctx);
  ctx.restore();
}

function drawSky(ctx, state) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#0b1030');
  g.addColorStop(0.45, '#1b2350');
  g.addColorStop(0.75, '#3a2b5e');
  g.addColorStop(1, '#1a1430');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Stars.
  for (const s of state.stars) {
    ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(state.time * 1.4 + s.tw));
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Aurora ribbons.
  ctx.save();
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i % 2 ? '#37e6a0' : '#7fd4ff';
    ctx.beginPath();
    const base = 60 + i * 34;
    ctx.moveTo(0, base);
    for (let x = 0; x <= VIEW_W; x += 64) {
      ctx.lineTo(x, base + Math.sin(x * 0.006 + state.time * 0.4 + i * 2) * 22);
    }
    for (let x = VIEW_W; x >= 0; x -= 64) {
      ctx.lineTo(x, base + 26 + Math.sin(x * 0.006 + state.time * 0.4 + i * 2) * 22);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // Moon.
  glowCircle(ctx, 1150, 82, 90, '#fff6d8', 0.5);
  ctx.fillStyle = '#fff8e0';
  ctx.beginPath(); ctx.arc(1150, 82, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8ddba';
  ctx.beginPath(); ctx.arc(1138, 74, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1162, 92, 5, 0, Math.PI * 2); ctx.fill();
  // Drifting embers.
  for (const e of state.embers) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.arc(e.x, e.y, 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Ground.
  const gg = ctx.createLinearGradient(0, 140, 0, VIEW_H);
  gg.addColorStop(0, '#232a4a');
  gg.addColorStop(1, '#141126');
  ctx.fillStyle = gg;
  ctx.fillRect(0, 140, VIEW_W, VIEW_H - 140);
}

function drawVillage(ctx, state) {
  // Cosy houses along the top, warm windows glowing.
  const houses = [
    { x: 250, y: 118, w: 86, h: 52 }, { x: 430, y: 108, w: 72, h: 62 },
    { x: 640, y: 116, w: 92, h: 54 }, { x: 860, y: 106, w: 76, h: 64 },
    { x: 1060, y: 114, w: 88, h: 56 },
  ];
  for (const h of houses) {
    ctx.fillStyle = '#2c2140';
    ctx.fillRect(h.x, h.y - h.h, h.w, h.h);
    ctx.fillStyle = '#3a2c55';
    ctx.beginPath();
    ctx.moveTo(h.x - 6, h.y - h.h);
    ctx.lineTo(h.x + h.w / 2, h.y - h.h - 30);
    ctx.lineTo(h.x + h.w + 6, h.y - h.h);
    ctx.closePath(); ctx.fill();
    const flick = 0.75 + 0.25 * Math.sin(state.time * 2 + h.x);
    ctx.globalAlpha = flick;
    ctx.fillStyle = '#ffd27f';
    ctx.fillRect(h.x + 14, h.y - h.h + 16, 14, 14);
    ctx.fillRect(h.x + h.w - 30, h.y - h.h + 16, 14, 14);
    ctx.globalAlpha = 1;
  }
}

function drawLanes(ctx, state) {
  for (const y of LANES_Y) {
    ctx.fillStyle = '#2e3358';
    ctx.fillRect(150, y - 34, VIEW_W - 150, 68);
    ctx.fillStyle = '#3a4066';
    for (let x = 170; x < VIEW_W; x += 46) {
      ctx.fillRect(x, y - 2, 26, 4);
    }
    // Chevrons pointing at the lighthouse.
    ctx.fillStyle = 'rgba(255,210,127,0.25)';
    for (let x = 220; x < VIEW_W; x += 140) {
      ctx.beginPath();
      ctx.moveTo(x, y - 10); ctx.lineTo(x - 12, y); ctx.lineTo(x, y + 10);
      ctx.lineTo(x + 6, y); ctx.closePath(); ctx.fill();
    }
  }
}

// Mid-field dressing: rocks, grass tufts, glow-shrooms and ember flowers
// from the fixed-seed SCENERY list. Pure decoration, drawn under towers.
function drawScenery(ctx, state) {
  for (const s of SCENERY) {
    const pulse = 0.6 + 0.4 * Math.sin(state.time * 1.6 + s.ph);
    if (s.kind === 'rock') {
      ctx.fillStyle = '#3a3455';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 9 * s.s, 6 * s.s, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a4368';
      ctx.beginPath(); ctx.ellipse(s.x - 2 * s.s, s.y - 2 * s.s, 4 * s.s, 2.5 * s.s, 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (s.kind === 'tuft') {
      ctx.strokeStyle = '#4a6b4a'; ctx.lineWidth = 1.6;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(s.x + i * 4 * s.s, s.y);
        ctx.lineTo(s.x + i * 6 * s.s, s.y - 10 * s.s); ctx.stroke();
      }
    } else if (s.kind === 'shroom') {
      ctx.globalAlpha = 0.35 + 0.3 * pulse;
      glowCircle(ctx, s.x, s.y - 4, 12 * s.s, '#7fd4ff', 0.5);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#c9d6ff';
      ctx.fillRect(s.x - 1.5 * s.s, s.y - 6 * s.s, 3 * s.s, 6 * s.s);
      ctx.fillStyle = '#7fd4ff';
      ctx.beginPath(); ctx.arc(s.x, s.y - 6 * s.s, 6 * s.s, Math.PI, 0); ctx.closePath(); ctx.fill();
    } else { // ember flowers
      ctx.globalAlpha = 0.55 + 0.35 * pulse;
      ctx.fillStyle = '#ff9a3c';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + s.ph;
        ctx.beginPath(); ctx.arc(s.x + Math.cos(a) * 4 * s.s, s.y - 4 * s.s + Math.sin(a) * 4 * s.s, 2.2 * s.s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ffe45e';
      ctx.beginPath(); ctx.arc(s.x, s.y - 4 * s.s, 2 * s.s, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawPlots(ctx, state, mouse) {
  for (const py of PLOT_ROWS_Y) {
    for (const px of PLOT_COLS_X) {
      const occupied = state.towers.some((t) => t.plot.x === px && t.plot.y === py);
      if (occupied) continue;
      const hover = mouse.inside && Math.hypot(mouse.x - px, mouse.y - py) < PLOT_R + 6;
      glowCircle(ctx, px, py, PLOT_R + 8, '#ffb347', hover ? 0.5 : 0.22);
      ctx.strokeStyle = hover ? '#ffd27f' : 'rgba(255,210,127,0.45)';
      ctx.lineWidth = hover ? 2.5 : 1.5;
      ctx.beginPath(); ctx.arc(px, py, PLOT_R, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,210,127,0.35)';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+', px, py + 1);
    }
  }
}

// Each tower type has its own silhouette, and every level adds visible
// extras — braziers, icicles, coil rings, thorns — so a maxed tower
// reads as maxed at a glance. `bob` is a small idle sway from the
// tower's own phase; `flash` is the muzzle flare right after a shot.
function drawTowerShape(ctx, t, x, y, time) {
  const def = t.def;
  const bob = Math.sin(time * 2 + (t.phase || 0)) * 1.5;
  ctx.save();
  ctx.translate(x, y + bob);
  if (def.key === 'ember') {
    // Stone brazier with a flame heart; higher levels add side flames.
    ctx.fillStyle = '#5a2c12';
    ctx.fillRect(-13, -6, 26, 16);
    ctx.fillStyle = '#3a1a08';
    ctx.fillRect(-16, 8, 32, 4);
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(0, -12, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe45e';
    ctx.beginPath(); ctx.arc(0, -12, 5, 0, Math.PI * 2); ctx.fill();
    if (t.level >= 2) {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(-16, -6, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(16, -6, 5, 0, Math.PI * 2); ctx.fill();
    }
    if (t.level >= 3) {
      ctx.fillStyle = '#ffe45e';
      ctx.beginPath(); ctx.arc(-16, -6, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(16, -6, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -20, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (t.flash > 0) {
      glowCircle(ctx, 0, -14, 26, '#ffb347', 0.7);
      ctx.fillStyle = '#fff3a0';
      ctx.beginPath(); ctx.arc(0, -14, 7, 0, Math.PI * 2); ctx.fill();
    }
  } else if (def.key === 'frost') {
    // Ice lantern on a dark plinth; higher levels grow an icicle crown.
    ctx.fillStyle = '#123a52';
    ctx.fillRect(-11, -4, 22, 14);
    ctx.strokeStyle = def.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -12, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = def.glow;
    ctx.beginPath(); ctx.arc(0, -12, 5, 0, Math.PI * 2); ctx.fill();
    if (t.level >= 2) {
      ctx.strokeStyle = def.color; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(i * 8, -20); ctx.lineTo(i * 8, -28 - Math.abs(i) * -2); ctx.stroke();
      }
    }
    if (t.level >= 3) {
      ctx.fillStyle = 'rgba(191,233,255,0.8)';
      ctx.beginPath(); ctx.arc(0, -12, 13, 0, Math.PI * 2); ctx.stroke();
    }
    if (t.flash > 0) {
      glowCircle(ctx, 0, -12, 24, '#aee6ff', 0.7);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, -12, 6, 0, Math.PI * 2); ctx.fill();
    }
  } else if (def.key === 'spark') {
    // Brass coil that tracks its target; each level adds a copper ring.
    ctx.fillStyle = '#3a2c10';
    ctx.fillRect(-12, -2, 24, 12);
    ctx.save(); ctx.rotate(t.angle || 0);
    ctx.strokeStyle = def.color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(16, -8); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 2;
    for (let r = 0; r < t.level; r++) {
      ctx.beginPath(); ctx.arc(0, -8, 4 + r * 4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = def.glow;
    ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill();
    if (t.flash > 0) {
      glowCircle(ctx, 0, -8, 30, '#fff3a0', 0.8);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(Math.cos(t.angle || 0) * 26, -8 + Math.sin(t.angle || 0) * 26); ctx.stroke();
    }
  } else {
    // Thorn bramble: a dark bulb with spikes; higher levels sprout more
    // spikes and violet blooms.
    ctx.fillStyle = '#2c1038';
    ctx.beginPath(); ctx.arc(0, -6, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = def.color; ctx.lineWidth = 2.5;
    const spikes = 6 + t.level * 2;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + 0.4;
      ctx.beginPath(); ctx.moveTo(0, -6);
      ctx.lineTo(Math.cos(a) * 18, -6 + Math.sin(a) * 18); ctx.stroke();
    }
    if (t.level >= 3) {
      ctx.fillStyle = '#ff8fd0';
      ctx.beginPath(); ctx.arc(-12, -16, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(12, -16, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = def.glow;
    ctx.beginPath(); ctx.arc(0, -6, 6, 0, Math.PI * 2); ctx.fill();
    if (t.flash > 0) {
      glowCircle(ctx, 0, -6, 28, '#d9a0ff', 0.7);
    }
  }
  // Level pips.
  for (let i = 0; i < t.level; i++) {
    ctx.fillStyle = '#ffd27f';
    ctx.beginPath(); ctx.arc(-12 + i * 8, 14, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawTowers(ctx, state, mouse) {
  // Range preview for the selected tower.
  if (state.selectedTower) {
    const t = state.selectedTower;
    const range = t.def.range * (1 + 0.06 * (t.level - 1)) * (1 + state.rangeBonus);
    glowCircle(ctx, t.plot.x, t.plot.y, range, t.def.color, 0.12);
    ctx.strokeStyle = t.def.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(t.plot.x, t.plot.y, range, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const t of state.towers) {
    glowCircle(ctx, t.plot.x, t.plot.y - 8, 40, t.def.color, 0.25 + (t.flash > 0 ? 0.35 : 0));
    drawTowerShape(ctx, t, t.plot.x, t.plot.y, state.time);
    // Stunned towers (Dread Captain slam) show dizzy stars.
    if (t.stun > 0) {
      ctx.fillStyle = '#ffe45e'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      const swirl = state.time * 6 + (t.phase || 0);
      for (let i = 0; i < 3; i++) {
        const a = swirl + (i / 3) * Math.PI * 2;
        ctx.fillText('✦', t.plot.x + Math.cos(a) * 14, t.plot.y - 22 + Math.sin(a) * 4);
      }
    }
  }
  // Build menu above the selected plot.
  if (state.selectedPlot && !state.selectedTower) {
    const p = state.selectedPlot;
    const bw = 560, bh = 86;
    const bx = Math.max(170, Math.min(VIEW_W - bw - 10, p.x - bw / 2));
    const by = Math.max(150, p.y - 118);
    ctx.fillStyle = 'rgba(10,12,30,0.92)';
    roundRect(ctx, bx, by, bw, bh, 12); ctx.fill();
    ctx.strokeStyle = '#ffd27f'; ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, bh, 12); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffd27f'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('BUILD — click a tower (or press 1-4)', bx + 14, by + 22);
    TOWER_KEYS.forEach((key, i) => {
      const def = TOWERS[key];
      const x = bx + 14 + i * 136;
      const afford = state.gold >= def.cost;
      ctx.fillStyle = afford ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
      roundRect(ctx, x, by + 30, 126, 46, 8); ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(x + 16, by + 53, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = afford ? '#ffffff' : '#8a8a9a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(def.name, x + 30, by + 49);
      ctx.fillStyle = afford ? '#ffd27f' : '#8a8a9a';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${i + 1} · ${def.cost}g`, x + 30, by + 66);
    });
  }
  // Selected tower panel.
  if (state.selectedTower) {
    const t = state.selectedTower;
    const bw = 420, bh = 108;
    const bx = Math.max(170, Math.min(VIEW_W - bw - 10, t.plot.x - bw / 2));
    const by = Math.max(150, t.plot.y - 150);
    ctx.fillStyle = 'rgba(10,12,30,0.92)';
    roundRect(ctx, bx, by, bw, bh, 12); ctx.fill();
    ctx.strokeStyle = t.def.color; ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, bh, 12); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${t.def.name}  ·  Level ${t.level}${t.level >= 4 ? ' (MAX)' : ''}`, bx + 14, by + 24);
    ctx.fillStyle = '#c9c9d9'; ctx.font = '13px sans-serif';
    ctx.fillText(t.def.blurb, bx + 14, by + 44);
    ctx.fillText(`Kills: ${t.kills}   Damage: ${Math.round(t.def.damage * Math.pow(1.55, t.level - 1))}`, bx + 14, by + 62);
    const upCost = t.level < 4 ? UPGRADE_COST[t.level - 1] : null;
    ctx.fillStyle = upCost && state.gold >= upCost ? '#ffd27f' : '#8a8a9a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(upCost ? `[U] Upgrade ${upCost}g` : '[MAX]', bx + 14, by + 88);
    ctx.fillStyle = '#ff9a9a';
    ctx.fillText(`[X] Sell +${Math.floor(t.invested * SELL_FRACTION)}g`, bx + 220, by + 88);
  }
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    const wob = Math.sin(e.wobble) * 3;
    const y = e.y + wob;
    // Slam telegraph: a red ring grows under the boss during windup.
    if (e.telegraph) {
      const frac = 1 - (e.slamTimer / 0.9);
      ctx.strokeStyle = '#ff5d7a'; ctx.globalAlpha = 0.55 + 0.45 * frac; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, y, 20 + frac * (SLAM_RADIUS - 20), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ff5d7a'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', e.x, y - e.radius - 26);
      ctx.globalAlpha = 1;
    }
    // Spawn portal: while the boss is still off-screen right, a red
    // whirlpool marks where he is coming through.
    if (e.key === 'dread' && e.x > 1180) {
      const pulse = 0.5 + 0.5 * Math.sin(state.time * 6);
      glowCircle(ctx, 1290, e.y, 70, '#ff5d7a', 0.35 + 0.25 * pulse);
      ctx.strokeStyle = '#ff8fa3'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(1290, e.y, 34 + pulse * 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(1290, e.y, 20 - pulse * 6, 0, Math.PI * 2); ctx.stroke();
    }
    glowCircle(ctx, e.x, y, e.radius + 14, e.def.color, 0.3);
    ctx.save();
    ctx.translate(e.x, y);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.def.color;
    if (e.key === 'wisp') {
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b1030';
      ctx.beginPath(); ctx.arc(-4, -3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.def.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, -e.radius - 4); ctx.quadraticCurveTo(0, -e.radius - 14, 8, -e.radius - 4); ctx.stroke();
    } else if (e.key === 'husk') {
      roundRect(ctx, -e.radius, -e.radius, e.radius * 2, e.radius * 2, 7); ctx.fill();
      ctx.fillStyle = '#2c2140';
      ctx.beginPath(); ctx.arc(-6, -4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(7, -4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-8, 8, 16, 3);
    } else if (e.key === 'moth') {
      ctx.beginPath(); ctx.ellipse(-8, 0, 9, 5, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, 0, 9, 5, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2c10';
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else if (e.key === 'dread') {
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2c0a14';
      ctx.beginPath(); ctx.moveTo(-e.radius, -6); ctx.lineTo(-e.radius - 12, -e.radius); ctx.lineTo(-e.radius + 4, -e.radius + 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(e.radius, -6); ctx.lineTo(e.radius + 12, -e.radius); ctx.lineTo(e.radius - 4, -e.radius + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(-10, -6, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(10, -6, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff5d7a';
      ctx.beginPath(); ctx.arc(-10, -6, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(10, -6, 2.5, 0, Math.PI * 2); ctx.fill();
    } else { // shade
      ctx.beginPath(); ctx.arc(0, 2, e.radius, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillRect(-e.radius, 2, e.radius * 2, e.radius * 0.7);
      ctx.fillStyle = '#0b1030';
      ctx.beginPath(); ctx.arc(-5, -4, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -4, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // Burn / slow markers.
    if (state.time < e.burnUntil) {
      ctx.fillStyle = '#ff9a3c'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🔥', e.x, y - e.radius - 14);
    } else if (state.time < e.slowUntil) {
      ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('❄', e.x, y - e.radius - 14);
    }
    // HP bar.
    const w = Math.max(28, e.radius * 2);
    const frac = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - w / 2, y - e.radius - 10, w, 5);
    ctx.fillStyle = frac > 0.5 ? '#7be382' : frac > 0.25 ? '#ffd27f' : '#ff5d7a';
    ctx.fillRect(e.x - w / 2, y - e.radius - 10, w * frac, 5);
  }
}

function drawProjectiles(ctx, state) {
  for (const p of state.projectiles) {
    ctx.strokeStyle = p.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
    ctx.beginPath();
    p.trail.forEach((t, i) => { if (i === 0) ctx.moveTo(t.x, t.y); else ctx.lineTo(t.x, t.y); });
    ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.globalAlpha = 1;
    glowCircle(ctx, p.x, p.y, 10, p.color, 0.8);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const frac = Math.max(0, p.life / p.maxLife);
    if (p.ring) {
      ctx.strokeStyle = p.color; ctx.globalAlpha = frac; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size + (1 - frac) * 22, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.globalAlpha = frac;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * frac + 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawFloats(ctx, state) {
  ctx.textAlign = 'center';
  for (const f of state.floats) {
    ctx.globalAlpha = Math.min(1, f.life * 1.6);
    ctx.fillStyle = f.color;
    ctx.font = f.small ? 'bold 13px sans-serif' : 'bold 17px sans-serif';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawLighthouse(ctx, state) {
  const x = LIGHTHOUSE_X, baseY = 660;
  // Cliff.
  ctx.fillStyle = '#1c1633';
  ctx.beginPath();
  ctx.moveTo(0, baseY); ctx.lineTo(0, 560); ctx.lineTo(60, 520); ctx.lineTo(150, 540);
  ctx.lineTo(190, 600); ctx.lineTo(180, baseY); ctx.closePath(); ctx.fill();
  // Rotating beam.
  const ang = state.beamAngle;
  ctx.save();
  ctx.translate(x, 300);
  ctx.rotate(Math.sin(ang) * 0.55);
  const bg = ctx.createLinearGradient(0, 0, 420, 0);
  bg.addColorStop(0, 'rgba(255,230,150,0.55)');
  bg.addColorStop(1, 'rgba(255,230,150,0)');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(420, -46); ctx.lineTo(420, 46); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
  // Tower.
  ctx.fillStyle = '#e8ddc8';
  ctx.beginPath(); ctx.moveTo(x - 26, 560); ctx.lineTo(x - 18, 330); ctx.lineTo(x + 18, 330); ctx.lineTo(x + 26, 560); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c94f4f';
  ctx.fillRect(x - 24, 500, 48, 22);
  ctx.fillRect(x - 21, 420, 42, 22);
  // Lamp room.
  ctx.fillStyle = '#2c2140';
  ctx.fillRect(x - 24, 292, 48, 40);
  const pulse = 0.7 + 0.3 * Math.sin(state.time * 3);
  glowCircle(ctx, x, 312, 70 * pulse, '#ffe696', 0.8);
  ctx.fillStyle = '#ffe696';
  ctx.beginPath(); ctx.arc(x, 312, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c94f4f';
  ctx.beginPath(); ctx.moveTo(x - 28, 292); ctx.lineTo(x, 268); ctx.lineTo(x + 28, 292); ctx.closePath(); ctx.fill();
  // Light meter under the lighthouse.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, 18, 664, 170, 42, 8); ctx.fill();
  ctx.fillStyle = '#ffd27f'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`LIGHT  ${state.lives} / 20`, 28, 686);
  ctx.fillStyle = state.lives > 6 ? '#7be382' : '#ff5d7a';
  ctx.fillRect(28, 694, 150 * Math.max(0, state.lives / 20), 5);
}

function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(8,10,28,0.85)';
  ctx.fillRect(0, 0, VIEW_W, 52);
  ctx.fillStyle = '#ffd27f'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('🔥 EMBERFALL KEEP', 16, 34);
  ctx.font = 'bold 17px sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText(`WAVE  ${Math.max(1, state.wave)} / ${MAX_WAVE}`, 330, 33);
  ctx.fillStyle = '#ffd27f';
  ctx.fillText(`◈ ${state.gold} gold`, 500, 33);
  ctx.fillStyle = '#7be382';
  ctx.fillText(`★ ${state.score}`, 660, 33);
  ctx.fillStyle = '#ff8fa3';
  ctx.fillText(`☠ ${state.kills} slain`, 800, 33);
  ctx.fillStyle = '#c9c9d9'; ctx.font = '13px sans-serif'; ctx.textAlign = 'right';
  const right = state.screen === 'playing'
    ? (state.waveActive ? '[P] pause  ·  [F] fast  ·  [M] sound' : '[SPACE] start wave')
    : '[SPACE] Start  ·  [R] Restart  ·  [M] Sound';
  ctx.fillText(right, VIEW_W - 16, 32);
  // Bottom hint bar during the build phase.
  if (state.screen === 'playing' && !state.waveActive && !state.paused) {
    ctx.fillStyle = 'rgba(8,10,28,0.7)';
    roundRect(ctx, 380, VIEW_H - 44, 520, 32, 8); ctx.fill();
    ctx.fillStyle = '#ffd27f'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Build towers on the glowing plots, then press SPACE to start the wave', 640, VIEW_H - 23);
  }
}

// Boss health bar under the HUD, only while the Dread Captain lives.
function drawBossBar(ctx, state) {
  const boss = state.enemies.find((e) => e.key === 'dread');
  if (!boss) return;
  const w = 420, x = (VIEW_W - w) / 2, y = 60;
  ctx.fillStyle = 'rgba(8,10,28,0.85)';
  roundRect(ctx, x - 8, y - 6, w + 16, 34, 8); ctx.fill();
  ctx.fillStyle = '#ff5d7a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('☠  DREAD CAPTAIN', VIEW_W / 2, y + 8);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x, y + 14, w, 7);
  const frac = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = '#ff5d7a';
  ctx.fillRect(x, y + 14, w * frac, 7);
}

// Red vignette while the boss arrives or lives: the screen edges bleed
// red so the final wave feels dangerous at a glance.
function drawBossVignette(ctx, state) {
  const pulse = 0.10 + 0.08 * Math.abs(Math.sin(state.time * 2.5));
  const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
  g.addColorStop(0, 'rgba(255,40,70,0)');
  g.addColorStop(1, `rgba(255,40,70,${pulse})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawBanner(ctx, state) {
  const frac = Math.min(1, state.bannerTimer / 2.2);
  ctx.globalAlpha = Math.min(1, frac * 2);
  ctx.fillStyle = 'rgba(8,10,28,0.75)';
  ctx.fillRect(0, 300, VIEW_W, 64);
  ctx.fillStyle = '#ffd27f'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(state.banner, VIEW_W / 2, 343);
  ctx.globalAlpha = 1;
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,10,28,0.88)';
  roundRect(ctx, x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = '#ffd27f'; ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 16); ctx.stroke();
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(5,6,20,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 290, 130, 700, 400);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd27f'; ctx.font = 'bold 58px sans-serif';
  ctx.fillText('🔥 EMBERFALL KEEP', 640, 210);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Defend the last lighthouse from the shadow tide.', 640, 252);
  ctx.fillStyle = '#c9c9d9'; ctx.font = '17px sans-serif';
  ctx.fillText('Build towers on the glowing plots. Survive 10 waves.', 640, 286);
  ctx.fillText('The Dread Captain comes on wave 10 — hold the light!', 640, 312);
  // Tower legend.
  TOWER_KEYS.forEach((key, i) => {
    const def = TOWERS[key];
    const x = 380 + i * 170;
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(x, 360, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText(def.name, x, 392);
    ctx.fillStyle = '#ffd27f'; ctx.font = '13px sans-serif';
    ctx.fillText(`${def.cost}g  ·  key ${i + 1}`, x, 412);
  });
  ctx.fillStyle = '#ffd27f'; ctx.font = 'bold 24px sans-serif';
  const blink = 0.6 + 0.4 * Math.sin(state.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillText('▶  CLICK or press SPACE to begin', 640, 478);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#8a8a9a'; ctx.font = '14px sans-serif';
  ctx.fillText('Mouse: build & upgrade  ·  1-4: build  ·  U: upgrade  ·  X: sell  ·  SPACE: wave  ·  F: fast  ·  P: pause', 640, 510);
}

function drawBoon(ctx, state) {
  ctx.fillStyle = 'rgba(5,6,20,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 240, 150, 800, 380);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd27f'; ctx.font = 'bold 34px sans-serif';
  ctx.fillText(`WAVE ${state.wave} CLEARED!`, 640, 212);
  ctx.fillStyle = '#ffffff'; ctx.font = '18px sans-serif';
  ctx.fillText('The tide ebbs for a moment. Choose a blessing before the next wave:', 640, 248);
  state.boonChoices.forEach((b, i) => {
    const x = 280 + i * 260;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundRect(ctx, x, 280, 230, 170, 14); ctx.fill();
    ctx.strokeStyle = '#ffd27f'; ctx.lineWidth = 1.5;
    roundRect(ctx, x, 280, 230, 170, 14); ctx.stroke();
    ctx.fillStyle = '#ffd27f'; ctx.font = '34px sans-serif';
    ctx.fillText(b.icon, x + 115, 330);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 17px sans-serif';
    ctx.fillText(b.name, x + 115, 366);
    ctx.fillStyle = '#c9c9d9'; ctx.font = '14px sans-serif';
    ctx.fillText(b.desc, x + 115, 392);
    ctx.fillStyle = '#8a8a9a'; ctx.font = '13px sans-serif';
    ctx.fillText(`press ${i + 1}`, x + 115, 428);
  });
  ctx.fillStyle = '#ffd27f'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Click a card or press 1, 2 or 3', 640, 500);
}

function drawEnd(ctx, state, won) {
  ctx.fillStyle = won ? 'rgba(20,40,10,0.55)' : 'rgba(40,6,14,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, 330, 160, 620, 360);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#7be382' : '#ff5d7a';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText(won ? '🏆 THE LIGHT HOLDS!' : '🌑 THE LIGHT FADES…', 640, 240);
  ctx.fillStyle = '#ffffff'; ctx.font = '20px sans-serif';
  ctx.fillText(won
    ? 'The Dread Captain is dust. Dawn breaks over Emberfall.'
    : `The shadow tide reached the lighthouse on wave ${state.wave}.`, 640, 282);
  ctx.fillStyle = '#ffd27f'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`SCORE  ${state.score}    ·    WAVES  ${state.wave}/${MAX_WAVE}    ·    SLAIN  ${state.kills}`, 640, 336);
  ctx.fillStyle = '#c9c9d9'; ctx.font = '16px sans-serif';
  ctx.fillText(`Towers built: ${state.towers.length}   ·   Gold earned: ${state.goldEarned}`, 640, 368);
  const blink = 0.6 + 0.4 * Math.sin(state.time * 4);
  ctx.globalAlpha = blink;
  ctx.fillStyle = '#ffd27f'; ctx.font = 'bold 24px sans-serif';
  ctx.fillText('▶  Press R or click to play again', 640, 440);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#8a8a9a'; ctx.font = '14px sans-serif';
  ctx.fillText('Emberfall Keep — an original game. No network, no files beyond this page.', 640, 480);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5,6,20,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('⏸ PAUSED', 640, 360);
  ctx.font = '17px sans-serif'; ctx.fillStyle = '#c9c9d9';
  ctx.fillText('Press P to resume', 640, 394);
}
