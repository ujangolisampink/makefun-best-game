// EMBERFALL KEEP — render.js
// Every pixel of the game, drawn fresh each frame on the 2D canvas.
// The renderer owns no game logic: it reads the state the simulation
// modules own and turns it into the dusk-lit field the player sees —
// the night sky and the moon, the lighthouse and its sweeping beam,
// the three lanes, the build plots, the four tower kinds with their
// level extras, the five enemy kinds, projectiles, particles and
// floating combat text, plus the HUD, the build menu, the boon cards
// and the title / victory / defeat panels. Nothing here mutates state.
import {
  VIEW_W, VIEW_H, TOWERS, TOWER_KEYS, ENEMIES, WAVES, LANES_Y,
  PLOT_ROWS_Y, PLOT_COLS_X, PLOT_R, LIGHTHOUSE_X, GOAL_X,
  START_LIVES, MAX_WAVE, UPGRADE_COST, UPGRADE_MULT, SELL_FRACTION,
  SLAM_RADIUS, SLAM_WINDUP, SCENERY,
} from './config.js';

const GOLD = '#f5c86e';
const INK = '#e8eaf6';
const DIM = '#9aa3c7';

// ---------- small canvas helpers ----------

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function disc(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function text(ctx, str, x, y, font, color, align = 'center', alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  ctx.restore();
}

// A soft radial glow: a bright core fading out to nothing.
function glow(ctx, x, y, r, color, peak = 0.55) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.globalAlpha = peak;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ---------- the frame ----------

export function render(ctx, state, mouse) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawSky(ctx, state);
  drawLanes(ctx);
  drawScenery(ctx, state);
  drawPlots(ctx, state, mouse);
  drawLighthouse(ctx, state);
  for (const t of state.towers) drawTower(ctx, state, t);
  for (const e of state.enemies) drawEnemy(ctx, state, e);
  drawProjectiles(ctx, state);
  drawParticles(ctx, state);
  drawFloats(ctx, state);
  drawBeam(ctx, state);
  ctx.restore();

  drawBossBar(ctx, state);
  drawHud(ctx, state);
  drawHintBar(ctx, state);
  drawLightMeter(ctx, state);
  drawVignette(ctx, state);
  if (state.screen === 'playing') {
    if (state.paused) drawPaused(ctx);
    drawBuildMenu(ctx, state);
    drawTowerPanel(ctx, state);
  }
  drawBanner(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, state);
  else if (state.screen === 'boon') drawBoon(ctx, state);
  else if (state.screen === 'victory') drawVictory(ctx, state);
  else if (state.screen === 'defeat') drawDefeat(ctx, state);
}

// ---------- sky, moon, houses ----------

function drawSky(ctx, state) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  sky.addColorStop(0, '#0d1233');
  sky.addColorStop(0.45, '#141b40');
  sky.addColorStop(1, '#0a0e26');
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);

  // Slow teal ribbons of cloud drifting across the night sky.
  const bands = [
    { y: 62, amp: 16, color: 'rgba(46, 98, 116, 0.28)' },
    { y: 108, amp: 20, color: 'rgba(38, 66, 116, 0.22)' },
    { y: 152, amp: 12, color: 'rgba(66, 46, 116, 0.16)' },
  ];
  for (const b of bands) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(-20, b.y - 26);
    for (let x = -20; x <= VIEW_W + 20; x += 40) {
      ctx.lineTo(x, b.y + Math.sin(x * 0.006 + state.time * 0.08) * b.amp - 14);
    }
    for (let x = VIEW_W + 20; x >= -20; x -= 40) {
      ctx.lineTo(x, b.y + Math.sin(x * 0.006 + state.time * 0.08) * b.amp + 14);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Stars, twinkling on their own slow rhythm.
  for (const s of state.stars) {
    const a = 0.25 + 0.65 * Math.abs(Math.sin(state.time * 1.4 + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#dfe6ff';
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  // The moon, high on the right, with a soft halo and two craters.
  glow(ctx, 1212, 88, 78, 'rgba(240, 235, 210, 0.35)', 0.5);
  ctx.fillStyle = '#efe9d2';
  disc(ctx, 1212, 88, 38);
  ctx.fill();
  ctx.fillStyle = 'rgba(198, 188, 158, 0.55)';
  disc(ctx, 1200, 78, 6);
  ctx.fill();
  disc(ctx, 1224, 100, 4);
  ctx.fill();

  // Rooftops of the town behind the field, windows lit warm.
  const houses = [
    { x: 270, w: 118, h: 76 }, { x: 465, w: 104, h: 66 },
    { x: 655, w: 122, h: 80 }, { x: 845, w: 108, h: 70 },
    { x: 1055, w: 116, h: 74 },
  ];
  for (const h of houses) {
    const top = 118 - h.h;
    ctx.fillStyle = '#241d4e';
    ctx.fillRect(h.x - h.w / 2, top + 14, h.w, h.h - 14);
    ctx.fillStyle = '#1a1438';
    ctx.beginPath();
    ctx.moveTo(h.x - h.w / 2 - 6, top + 16);
    ctx.lineTo(h.x, top - 8);
    ctx.lineTo(h.x + h.w / 2 + 6, top + 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 210, 127, 0.9)';
    ctx.fillRect(h.x - h.w / 2 + 16, top + 34, 13, 15);
    ctx.fillRect(h.x + h.w / 2 - 29, top + 34, 13, 15);
  }

  // Drifting embers rising off the field.
  for (const e of state.embers) {
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(state.time * 2 + e.drift);
    ctx.fillStyle = '#ffb347';
    disc(ctx, e.x, e.y, e.s * 2.2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- lanes and scenery ----------

function drawLanes(ctx) {
  for (const ly of LANES_Y) {
    ctx.fillStyle = 'rgba(38, 48, 96, 0.35)';
    ctx.fillRect(GOAL_X, ly - 44, VIEW_W - GOAL_X, 88);
    ctx.strokeStyle = 'rgba(200, 210, 240, 0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 18]);
    ctx.beginPath();
    ctx.moveTo(GOAL_X + 8, ly);
    ctx.lineTo(VIEW_W - 8, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    // Small diamonds marching down the middle of each lane.
    ctx.fillStyle = 'rgba(200, 210, 240, 0.16)';
    for (let x = 220; x < VIEW_W - 20; x += 110) {
      ctx.save();
      ctx.translate(x, ly);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
  }
  // The goal line the tide must not cross.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(GOAL_X, 120);
  ctx.lineTo(GOAL_X, 664);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawScenery(ctx, state) {
  for (const s of SCENERY) {
    const sway = Math.sin(state.time * 1.5 + s.ph) * 2;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.s, s.s);
    if (s.kind === 'rock') {
      ctx.fillStyle = '#3a4266';
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.ellipse(-3, -2, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.kind === 'tuft') {
      ctx.strokeStyle = '#4a7a55';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 4, 0);
        ctx.quadraticCurveTo(i * 4 + sway, -8, i * 6 + sway, -13);
        ctx.stroke();
      }
    } else if (s.kind === 'shroom') {
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(-2, -2, 4, 7);
      ctx.fillStyle = '#7fd4ff';
      ctx.beginPath();
      ctx.arc(0, -2, 7, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      disc(ctx, -3, -5, 1.4);
      ctx.fill();
      disc(ctx, 3, -6, 1.2);
      ctx.fill();
    } else {
      // Ember flowers: four orange petals around a gold heart.
      ctx.fillStyle = '#ff9a3c';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + s.ph;
        disc(ctx, Math.cos(a) * 4, Math.sin(a) * 4, 2.6);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd27f';
      disc(ctx, 0, 0, 2.2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- build plots ----------

function plotOccupied(state, px, py) {
  return state.towers.some((t) => t.plot.x === px && t.plot.y === py);
}

function drawPlots(ctx, state, mouse) {
  const hovered = state.screen === 'playing' && mouse.inside
    ? nearestPlot(mouse.x, mouse.y) : null;
  for (const py of PLOT_ROWS_Y) {
    for (const px of PLOT_COLS_X) {
      if (plotOccupied(state, px, py)) continue;
      const isSel = state.selectedPlot && state.selectedPlot.x === px && state.selectedPlot.y === py;
      const isHov = hovered && hovered.x === px && hovered.y === py;
      const pulse = 0.5 + 0.3 * Math.sin(state.time * 2.4 + px * 0.01);
      ctx.fillStyle = 'rgba(20, 26, 54, 0.55)';
      disc(ctx, px, py, PLOT_R);
      ctx.fill();
      ctx.strokeStyle = isSel ? GOLD : `rgba(201, 168, 106, ${isHov ? 0.95 : 0.55 + pulse * 0.2})`;
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      disc(ctx, px, py, PLOT_R);
      ctx.stroke();
      if (isSel) {
        ctx.strokeStyle = `rgba(245, 200, 110, ${0.4 + 0.35 * Math.sin(state.time * 4)})`;
        ctx.lineWidth = 2;
        disc(ctx, px, py, PLOT_R + 5);
        ctx.stroke();
      }
      // The little plus that says "build here".
      ctx.strokeStyle = isHov || isSel ? GOLD : 'rgba(201, 168, 106, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - 7, py);
      ctx.lineTo(px + 7, py);
      ctx.moveTo(px, py - 7);
      ctx.lineTo(px, py + 7);
      ctx.stroke();
    }
  }
}

function nearestPlot(x, y) {
  for (const py of PLOT_ROWS_Y) {
    for (const px of PLOT_COLS_X) {
      const dx = x - px, dy = y - py;
      if (dx * dx + dy * dy <= 30 * 30) return { x: px, y: py };
    }
  }
  return null;
}

// ---------- the lighthouse and its beam ----------

function drawLighthouse(ctx, state) {
  const x = LIGHTHOUSE_X;
  // The dark cliff the keep stands on.
  ctx.fillStyle = '#0c1128';
  ctx.beginPath();
  ctx.ellipse(x, 668, 132, 96, 0, Math.PI, 0);
  ctx.fill();
  // Striped tower body.
  const body = ctx.createLinearGradient(x - 28, 0, x + 28, 0);
  body.addColorStop(0, '#d8cbb0');
  body.addColorStop(0.5, '#f2ead8');
  body.addColorStop(1, '#d8cbb0');
  ctx.fillStyle = body;
  ctx.fillRect(x - 28, 330, 56, 232);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 28, 330, 56, 232);
  // Two red bands around the tower.
  ctx.fillStyle = '#d84a5a';
  ctx.fillRect(x - 28, 415, 56, 25);
  ctx.fillRect(x - 28, 490, 56, 25);
  // The red cap roof.
  ctx.fillStyle = '#c23a4a';
  ctx.beginPath();
  ctx.moveTo(x - 34, 332);
  ctx.lineTo(x, 272);
  ctx.lineTo(x + 34, 332);
  ctx.closePath();
  ctx.fill();
  // The lamp room: a warm glow that never goes out.
  glow(ctx, x, 305, 46, 'rgba(255, 220, 120, 0.6)', 0.7);
  ctx.fillStyle = '#ffe9a8';
  disc(ctx, x, 305, 13);
  ctx.fill();
  ctx.fillStyle = '#fffbe8';
  disc(ctx, x, 305, 6);
  ctx.fill();
}

// The beam sweeps the field from the lamp, washing softly over lanes,
// towers and enemies alike. Drawn after the field so it lights them.
// The beam never spins all the way around: it sways gently around a
// low rightward aim, so the light always falls on the field.
function drawBeam(ctx, state) {
  const x = LIGHTHOUSE_X, y = 305;
  const a = 0.32 + 0.28 * Math.sin(state.beamAngle);
  const len = 780;
  for (const [spread, alpha] of [[0.13, 0.10], [0.05, 0.10]]) {
    const g = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.addColorStop(0, `rgba(255, 230, 150, ${alpha})`);
    g.addColorStop(1, 'rgba(255, 230, 150, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - spread) * len, y + Math.sin(a - spread) * len);
    ctx.lineTo(x + Math.cos(a + spread) * len, y + Math.sin(a + spread) * len);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------- towers ----------

function towerStats(t, state) {
  const range = Math.round(t.def.range * (1 + 0.06 * (t.level - 1)) * (1 + state.rangeBonus));
  const dmg = Math.round(t.def.damage * Math.pow(UPGRADE_MULT, t.level - 1) * (1 + state.damageBonus));
  return { range, dmg };
}

function drawTower(ctx, state, t) {
  const { x, y } = t.plot;
  const bob = Math.sin(state.time * 2 + t.phase) * 1.5;

  // Aiming barrel, pointing at the tower's current target.
  ctx.save();
  ctx.translate(x, y - 8 + bob);
  ctx.rotate(t.angle);
  ctx.strokeStyle = '#2a3358';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(16, 0);
  ctx.stroke();
  ctx.restore();

  // Stone base.
  ctx.fillStyle = '#1c2340';
  disc(ctx, x, y + 4, 21);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.lineWidth = 1.5;
  disc(ctx, x, y + 4, 21);
  ctx.stroke();

  glow(ctx, x, y - 6 + bob, 30, t.def.glow, t.flash > 0 ? 0.85 : 0.3);
  const flick = Math.sin(state.time * 7 + t.phase) * 2;

  if (t.key === 'ember') {
    // A brazier bowl with a live flame tongue on top.
    ctx.fillStyle = '#8a4a1a';
    ctx.beginPath();
    ctx.ellipse(x, y + 2 + bob, 15, 9, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#ff9a3c';
    disc(ctx, x, y - 6 + bob, 12);
    ctx.fill();
    ctx.fillStyle = '#ffd27f';
    ctx.beginPath();
    ctx.moveTo(x, y - 22 - flick + bob);
    ctx.quadraticCurveTo(x + 7, y - 12 + bob, x + 3, y - 4 + bob);
    ctx.quadraticCurveTo(x, y - 8 + bob, x - 3, y - 4 + bob);
    ctx.quadraticCurveTo(x - 7, y - 12 + bob, x, y - 22 - flick + bob);
    ctx.fill();
    if (t.level >= 2) {
      ctx.fillStyle = '#ffb347';
      disc(ctx, x - 13, y - 2 + bob, 3.5);
      ctx.fill();
      disc(ctx, x + 13, y - 2 + bob, 3.5);
      ctx.fill();
    }
    if (t.level >= 3) {
      ctx.fillStyle = '#ffe9a8';
      disc(ctx, x - 6, y - 16 + bob, 2);
      ctx.fill();
      disc(ctx, x + 7, y - 14 + bob, 2);
      ctx.fill();
    }
  } else if (t.key === 'frost') {
    // A hanging lantern, cold blue, icicles growing with level.
    ctx.fillStyle = '#3f9fd8';
    rr(ctx, x - 11, y - 18 + bob, 22, 22, 5);
    ctx.fill();
    ctx.fillStyle = '#bfe9ff';
    disc(ctx, x, y - 7 + bob, 6.5);
    ctx.fill();
    ctx.strokeStyle = '#7fd4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 18 + bob);
    ctx.lineTo(x + 11, y - 18 + bob);
    ctx.stroke();
    if (t.level >= 2) {
      ctx.fillStyle = '#d8f2ff';
      for (const dx of [-8, 0, 8]) {
        ctx.beginPath();
        ctx.moveTo(x + dx - 3, y + 4 + bob);
        ctx.lineTo(x + dx + 3, y + 4 + bob);
        ctx.lineTo(x + dx, y + 12 + bob);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (t.level >= 3) {
      ctx.fillStyle = '#eaf8ff';
      for (const dx of [-13, 13]) {
        ctx.beginPath();
        ctx.moveTo(x + dx - 3, y - 16 + bob);
        ctx.lineTo(x + dx + 3, y - 16 + bob);
        ctx.lineTo(x + dx, y - 6 + bob);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (t.key === 'spark') {
    // A coil ball with a live lightning zigzag across it.
    ctx.fillStyle = '#d9a400';
    disc(ctx, x, y - 6 + bob, 13);
    ctx.fill();
    ctx.fillStyle = '#ffe45e';
    disc(ctx, x, y - 6 + bob, 9);
    ctx.fill();
    const j = Math.sin(state.time * 9 + t.phase) * 3;
    ctx.strokeStyle = '#7a5c00';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 12 + bob);
    ctx.lineTo(x - 2, y - 6 + bob + j);
    ctx.lineTo(x + 3, y - 8 + bob);
    ctx.lineTo(x + 8, y - 2 + bob);
    ctx.stroke();
    if (t.level >= 2) {
      ctx.strokeStyle = 'rgba(255, 243, 160, 0.9)';
      ctx.lineWidth = 1.5;
      disc(ctx, x, y - 6 + bob, 18);
      ctx.stroke();
    }
    if (t.level >= 3) {
      ctx.strokeStyle = 'rgba(255, 243, 160, 0.55)';
      disc(ctx, x, y - 6 + bob, 23);
      ctx.stroke();
    }
  } else {
    // Thorn bramble: purple spikes radiating from a bright heart.
    ctx.fillStyle = '#8a3fd8';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t.phase * 0.1;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a - 0.22) * 8, y - 6 + bob + Math.sin(a - 0.22) * 8);
      ctx.lineTo(x + Math.cos(a) * 20, y - 6 + bob + Math.sin(a) * 20);
      ctx.lineTo(x + Math.cos(a + 0.22) * 8, y - 6 + bob + Math.sin(a + 0.22) * 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#e3b8ff';
    disc(ctx, x, y - 6 + bob, 8);
    ctx.fill();
    if (t.level >= 2) {
      ctx.fillStyle = '#c98cff';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        disc(ctx, x + Math.cos(a) * 15, y - 6 + bob + Math.sin(a) * 15, 2.5);
        ctx.fill();
      }
    }
    if (t.level >= 3) {
      ctx.strokeStyle = 'rgba(201, 140, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      disc(ctx, x, y - 6 + bob, 24);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Muzzle flash right after a shot.
  if (t.flash > 0) {
    ctx.globalAlpha = (t.flash / 0.12) * 0.8;
    ctx.fillStyle = '#ffffff';
    disc(ctx, x + Math.cos(t.angle) * 18, y - 8 + bob + Math.sin(t.angle) * 18, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Stunned by the Captain's slam: circling stars and a greyed body.
  if (t.stun > 0) {
    ctx.fillStyle = 'rgba(120, 130, 170, 0.35)';
    disc(ctx, x, y - 6 + bob, 16);
    ctx.fill();
    ctx.fillStyle = '#ffe45e';
    for (let i = 0; i < 3; i++) {
      const a = state.time * 5 + (i / 3) * Math.PI * 2;
      disc(ctx, x + Math.cos(a) * 14, y - 20 + bob + Math.sin(a) * 4, 2.2);
      ctx.fill();
    }
  }

  // Level pips under the base.
  for (let i = 0; i < t.level; i++) {
    ctx.fillStyle = GOLD;
    disc(ctx, x + (i - (t.level - 1) / 2) * 9, y + 28, 2.6);
    ctx.fill();
  }
}

// ---------- enemies ----------

function drawEnemy(ctx, state, e) {
  const bob = Math.sin(e.wobble) * 2;
  const x = e.x, y = e.y + bob;
  const r = e.radius;

  // The Captain's telegraph: the slam zone glows faintly red, and a
  // ring grows under him through the windup so the player can see
  // exactly when the slam lands.
  if (e.telegraph) {
    const progress = 1 - e.slamTimer / SLAM_WINDUP;
    ctx.fillStyle = 'rgba(255, 93, 122, 0.06)';
    disc(ctx, x, e.y, SLAM_RADIUS);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 93, 122, ${0.55 + 0.35 * Math.sin(state.time * 10)})`;
    ctx.lineWidth = 3;
    disc(ctx, x, e.y, Math.max(6, SLAM_RADIUS * progress));
    ctx.stroke();
  }

  // Body: a rounded shadow-ghost, with a lighter crown on top.
  const grad = ctx.createLinearGradient(x, y - r, x, y + r);
  grad.addColorStop(0, e.def.color);
  grad.addColorStop(1, '#2a2350');
  ctx.fillStyle = grad;
  if (e.key === 'dread') {
    disc(ctx, x, y, r);
    ctx.fill();
    // Horns.
    ctx.fillStyle = '#c23a4a';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * (r - 12), y - r + 10);
      ctx.lineTo(x + s * (r - 2), y - r - 12);
      ctx.lineTo(x + s * (r - 18), y - r + 2);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    rr(ctx, x - r, y - r * 0.92, r * 2, r * 1.84, r * 0.55);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = 1.5;
  if (e.key === 'dread') { disc(ctx, x, y, r); ctx.stroke(); }
  else { rr(ctx, x - r, y - r * 0.92, r * 2, r * 1.84, r * 0.55); ctx.stroke(); }

  // Moth wings, fluttering.
  if (e.key === 'moth') {
    const flap = 0.5 + 0.5 * Math.sin(state.time * 14 + e.wobble);
    ctx.fillStyle = `rgba(255, 210, 127, ${0.35 + 0.4 * flap})`;
    ctx.beginPath();
    ctx.ellipse(x - r - 2, y - 4, 7, 4 + 3 * flap, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + r + 2, y - 4, 7, 4 + 3 * flap, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes, looking toward the lighthouse they march on.
  const er = Math.max(2.5, r * 0.26);
  const ex = r * 0.36, ey = -r * 0.12;
  ctx.fillStyle = '#ffffff';
  disc(ctx, x - ex, y + ey, er);
  ctx.fill();
  disc(ctx, x + ex, y + ey, er);
  ctx.fill();
  ctx.fillStyle = '#1a1438';
  disc(ctx, x - ex - er * 0.3, y + ey, er * 0.5);
  ctx.fill();
  disc(ctx, x + ex - er * 0.3, y + ey, er * 0.5);
  ctx.fill();

  // Hit flash: a white sheet over the body for a blink.
  if (e.flash > 0) {
    ctx.globalAlpha = (e.flash / 0.12) * 0.7;
    ctx.fillStyle = '#ffffff';
    if (e.key === 'dread') { disc(ctx, x, y, r); ctx.fill(); }
    else { rr(ctx, x - r, y - r * 0.92, r * 2, r * 1.84, r * 0.55); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  // Health bar above the head.
  const bw = r * 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x - bw / 2, y - r - 12, bw, 4);
  ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#7ee081' : '#e8b64c';
  ctx.fillRect(x - bw / 2, y - r - 12, bw * clamp(e.hp / e.maxHp, 0, 1), 4);

  // Burning and chilled markers, so the player sees the tower effects.
  if (state.time < e.burnUntil) {
    text(ctx, '🔥', x + r - 2, y - r - 20, '12px sans-serif', '#ffffff', 'center');
  }
  if (state.time < e.slowUntil) {
    text(ctx, '❄', x - r + 2, y - r - 20, '12px sans-serif', '#aee6ff', 'center');
  }
}

// ---------- projectiles, particles, floating text ----------

function drawProjectiles(ctx, state) {
  for (const p of state.projectiles) {
    if (p.trail.length > 1) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (const tp of p.trail) ctx.lineTo(tp.x, tp.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    glow(ctx, p.x, p.y, 10, p.color, 0.8);
    ctx.fillStyle = '#ffffff';
    disc(ctx, p.x, p.y, 2.2);
    ctx.fill();
  }
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const life = clamp(p.life / p.maxLife, 0, 1);
    if (p.ring) {
      // A shockwave ring that grows as it fades.
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = life * 0.8;
      ctx.lineWidth = 3;
      disc(ctx, p.x, p.y, Math.max(2, p.size * (1 - life)));
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = life;
      ctx.fillStyle = p.color;
      disc(ctx, p.x, p.y, p.size);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawFloats(ctx, state) {
  for (const f of state.floats) {
    const a = clamp(f.life, 0, 1);
    text(ctx, f.text, f.x, f.y, f.small ? 'bold 12px sans-serif' : 'bold 15px sans-serif', f.color, 'center', a);
  }
}

// ---------- boss bar, HUD, hint bar, light meter ----------

function drawBossBar(ctx, state) {
  const boss = state.enemies.find((e) => e.key === 'dread' && !e.dead && !e.leaked);
  if (!boss) return;
  text(ctx, '☠ DREAD CAPTAIN', VIEW_W / 2, 62, 'bold 13px sans-serif', '#ff8fa3', 'center');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  rr(ctx, VIEW_W / 2 - 300, 70, 600, 14, 7);
  ctx.fill();
  const frac = clamp(boss.hp / boss.maxHp, 0, 1);
  const fill = ctx.createLinearGradient(VIEW_W / 2 - 300, 0, VIEW_W / 2 + 300, 0);
  fill.addColorStop(0, '#ff5d7a');
  fill.addColorStop(1, '#ff8fa3');
  ctx.fillStyle = fill;
  rr(ctx, VIEW_W / 2 - 300, 70, 600 * frac, 14, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 93, 122, 0.4)';
  ctx.lineWidth = 1.5;
  rr(ctx, VIEW_W / 2 - 300, 70, 600, 14, 7);
  ctx.stroke();
}

function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(5, 8, 24, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, 46);
  text(ctx, '🔥 EMBERFALL KEEP', 20, 31, 'bold 22px sans-serif', GOLD, 'left');
  text(ctx, `WAVE ${Math.max(1, state.wave)} / ${MAX_WAVE}`, 280, 31, 'bold 17px sans-serif', INK, 'left');
  text(ctx, `◆ ${state.gold} gold`, 460, 31, 'bold 17px sans-serif', '#ffd27f', 'left');
  text(ctx, `★ ${state.score}`, 575, 31, 'bold 17px sans-serif', '#7ee081', 'left');
  text(ctx, `☠ ${state.kills} slain`, 685, 31, 'bold 17px sans-serif', '#ff8fa3', 'left');
  let hints = '[P] pause · [F] fast · [M] sound';
  if (state.screen !== 'playing') hints = '[SPACE] Start · [R] Restart · [M] Sound';
  else if (!state.waveActive) hints = '[SPACE] start wave';
  if (state.speed === 2) hints += ' · 2×';
  text(ctx, hints, VIEW_W - 20, 31, '13px sans-serif', DIM, 'right');
}

function nextWaveText(state) {
  const idx = state.wave; // waves cleared so far; the next one is index wave
  if (idx >= WAVES.length) return '';
  const parts = WAVES[idx].map(([key, n]) => `${n} ${ENEMIES[key].name}`);
  return `NEXT — WAVE ${idx + 1}: ${parts.join(' · ')}`;
}

function drawHintBar(ctx, state) {
  if (state.screen !== 'playing' || state.waveActive || state.paused) return;
  const line1 = 'Build towers on the glowing plots, then press SPACE to start the wave';
  const line2 = nextWaveText(state);
  ctx.font = 'bold 16px sans-serif';
  const w1 = ctx.measureText(line1).width;
  ctx.font = '14px sans-serif';
  const w2 = ctx.measureText(line2).width;
  const pw = Math.max(w1, w2) + 48;
  const px = (VIEW_W - pw) / 2, py = 640;
  ctx.fillStyle = 'rgba(8, 12, 30, 0.78)';
  rr(ctx, px, py, pw, 56, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 200, 110, 0.35)';
  ctx.lineWidth = 1.5;
  rr(ctx, px, py, pw, 56, 12);
  ctx.stroke();
  text(ctx, line1, VIEW_W / 2, py + 18, 'bold 16px sans-serif', GOLD, 'center');
  if (line2) text(ctx, line2, VIEW_W / 2, py + 42, '14px sans-serif', DIM, 'center');
}

function drawLightMeter(ctx, state) {
  const ratio = clamp(state.lives / START_LIVES, 0, 1);
  ctx.fillStyle = 'rgba(8, 12, 30, 0.7)';
  rr(ctx, 16, 640, 148, 58, 10);
  ctx.fill();
  const col = ratio > 0.5 ? '#ffd27f' : ratio > 0.25 ? '#e8b64c' : '#ff5d7a';
  text(ctx, `LIGHT  ${state.lives} / ${START_LIVES}`, 30, 662, 'bold 14px sans-serif', col, 'left');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  rr(ctx, 30, 672, 120, 8, 4);
  ctx.fill();
  ctx.fillStyle = ratio > 0.5 ? '#7ee081' : ratio > 0.25 ? '#e8b64c' : '#ff5d7a';
  if (ratio > 0) {
    rr(ctx, 30, 672, 120 * ratio, 8, 4);
    ctx.fill();
  }
}

// The Captain's arrival tints the whole field blood-red at the edges.
function drawVignette(ctx, state) {
  let strength = 0;
  if (state.bossWarn > 0) strength = Math.max(strength, 0.22 * (state.bossWarn / 3));
  if (state.enemies.some((e) => e.telegraph)) strength = Math.max(strength, 0.16 + 0.06 * Math.sin(state.time * 8));
  if (strength <= 0) return;
  const g = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95,
  );
  g.addColorStop(0, 'rgba(255, 40, 70, 0)');
  g.addColorStop(1, `rgba(255, 40, 70, ${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(8, 12, 30, 0.8)';
  rr(ctx, VIEW_W / 2 - 190, 320, 380, 52, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 200, 110, 0.5)';
  ctx.lineWidth = 1.5;
  rr(ctx, VIEW_W / 2 - 190, 320, 380, 52, 12);
  ctx.stroke();
  text(ctx, 'PAUSED — press P to resume', VIEW_W / 2, 347, 'bold 18px sans-serif', GOLD, 'center');
}

function drawBanner(ctx, state) {
  if (!state.banner || state.bannerTimer <= 0) return;
  const a = clamp(state.bannerTimer, 0, 1);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12;
  text(ctx, state.banner, VIEW_W / 2, 120, 'bold 30px sans-serif', GOLD, 'center', a);
  ctx.restore();
}

// ---------- build menu and tower panel ----------

// The build menu's hit areas live in main.js; these are the same
// numbers, so every button the player sees is one they can click.
function menuGeometry(plot) {
  const bw = 560;
  const bx = Math.max(170, Math.min(VIEW_W - bw - 10, plot.x - bw / 2));
  const by = Math.max(150, plot.y - 118);
  return { bx, by, bw };
}

function drawBuildMenu(ctx, state) {
  const plot = state.selectedPlot;
  if (!plot || state.selectedTower || state.screen !== 'playing') return;
  const { bx, by, bw } = menuGeometry(plot);
  ctx.fillStyle = 'rgba(10, 14, 36, 0.95)';
  rr(ctx, bx, by, bw, 92, 12);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  rr(ctx, bx, by, bw, 92, 12);
  ctx.stroke();
  text(ctx, 'Build a tower', bx + 14, by + 16, 'bold 14px sans-serif', GOLD, 'left');
  for (let i = 0; i < TOWER_KEYS.length; i++) {
    const key = TOWER_KEYS[i];
    const def = TOWERS[key];
    const cx = bx + 14 + i * 136;
    const afford = state.gold >= def.cost;
    ctx.fillStyle = afford ? 'rgba(28, 34, 64, 0.9)' : 'rgba(20, 24, 44, 0.7)';
    rr(ctx, cx, by + 30, 126, 46, 8);
    ctx.fill();
    ctx.strokeStyle = afford ? def.color : 'rgba(120, 125, 150, 0.5)';
    ctx.lineWidth = 1.5;
    rr(ctx, cx, by + 30, 126, 46, 8);
    ctx.stroke();
    ctx.fillStyle = def.color;
    disc(ctx, cx + 13, by + 46, 7);
    ctx.fill();
    text(ctx, def.name, cx + 26, by + 46, 'bold 13px sans-serif', afford ? INK : DIM, 'left');
    text(ctx, `${def.cost}g · key ${i + 1}`, cx + 63, by + 66, '11px sans-serif', afford ? GOLD : DIM, 'center');
  }
}

function drawTowerPanel(ctx, state) {
  const t = state.selectedTower;
  if (!t || state.screen !== 'playing') return;
  const { range, dmg } = towerStats(t, state);
  // Range ring on the field, so the player sees what the tower covers.
  ctx.fillStyle = 'rgba(245, 200, 110, 0.05)';
  disc(ctx, t.plot.x, t.plot.y, range);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 200, 110, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  disc(ctx, t.plot.x, t.plot.y, range);
  ctx.stroke();
  ctx.setLineDash([]);

  // Info panel, anchored above the tower (or below it near the top).
  const pw = 216, ph = 108;
  let px = clamp(t.plot.x - pw / 2, 10, VIEW_W - pw - 10);
  let py = t.plot.y - 150;
  if (py < 56) py = t.plot.y + 44;
  ctx.fillStyle = 'rgba(10, 14, 36, 0.95)';
  rr(ctx, px, py, pw, ph, 10);
  ctx.fill();
  ctx.strokeStyle = t.def.color;
  ctx.lineWidth = 1.5;
  rr(ctx, px, py, pw, ph, 10);
  ctx.stroke();
  text(ctx, `${t.def.name}  ·  Lv ${t.level}`, px + 12, py + 16, 'bold 14px sans-serif', INK, 'left');
  text(ctx, `Damage ${dmg}  ·  Range ${range}  ·  ${t.kills} slain`, px + 12, py + 38, '12px sans-serif', DIM, 'left');
  if (t.stun > 0) {
    text(ctx, 'STUNNED!', px + 12, py + 58, 'bold 13px sans-serif', '#ff8fa3', 'left');
  } else if (t.level < 4) {
    const cost = UPGRADE_COST[t.level - 1];
    const afford = state.gold >= cost;
    text(ctx, `U: upgrade — ${cost}g`, px + 12, py + 58, '13px sans-serif', afford ? GOLD : DIM, 'left');
  } else {
    text(ctx, 'MAX LEVEL', px + 12, py + 58, 'bold 13px sans-serif', GOLD, 'left');
  }
  const refund = Math.floor(t.invested * SELL_FRACTION);
  text(ctx, `X: sell — +${refund}g`, px + 12, py + 80, '13px sans-serif', DIM, 'left');
}

// ---------- full-screen panels ----------

function dimField(ctx, alpha = 0.66) {
  ctx.fillStyle = `rgba(6, 8, 26, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawTitle(ctx, state) {
  dimField(ctx, 0.66);
  const px = 235, py = 128, pw = 810, ph = 402;
  ctx.fillStyle = 'rgba(10, 14, 36, 0.94)';
  rr(ctx, px, py, pw, ph, 18);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  rr(ctx, px, py, pw, ph, 18);
  ctx.stroke();
  text(ctx, '🔥 EMBERFALL KEEP', VIEW_W / 2, 228, 'bold 62px sans-serif', GOLD, 'center');
  text(ctx, 'Defend the last lighthouse from the shadow tide.', VIEW_W / 2, 264, 'bold 23px sans-serif', INK, 'center');
  text(ctx, 'Build towers on the glowing plots. Survive 10 waves.', VIEW_W / 2, 300, '17px sans-serif', DIM, 'center');
  text(ctx, 'The Dread Captain comes on wave 10 — hold the light!', VIEW_W / 2, 326, '17px sans-serif', DIM, 'center');
  for (let i = 0; i < TOWER_KEYS.length; i++) {
    const def = TOWERS[TOWER_KEYS[i]];
    const cx = 355 + i * 200;
    ctx.fillStyle = def.color;
    disc(ctx, cx, 372, 11);
    ctx.fill();
    text(ctx, def.name, cx, 402, 'bold 17px sans-serif', INK, 'center');
    text(ctx, `${def.cost}g · key ${i + 1}`, cx, 426, '14px sans-serif', GOLD, 'center');
  }
  const pulse = 0.85 + 0.15 * Math.sin(state.time * 3);
  text(ctx, '▶  CLICK or press SPACE to begin', VIEW_W / 2, 478, 'bold 26px sans-serif', GOLD, 'center', pulse);
  text(ctx, 'Mouse: build & upgrade  ·  1-4: build  ·  U: upgrade  ·  X: sell  ·  SPACE: wave  ·  F: fast  ·  P: pause', VIEW_W / 2, 508, '14px sans-serif', DIM, 'center');
}

function drawBoon(ctx, state) {
  dimField(ctx, 0.62);
  const px = 205, py = 148, pw = 870, ph = 384;
  ctx.fillStyle = 'rgba(10, 14, 36, 0.94)';
  rr(ctx, px, py, pw, ph, 18);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  rr(ctx, px, py, pw, ph, 18);
  ctx.stroke();
  text(ctx, `WAVE ${state.wave} CLEARED!`, VIEW_W / 2, 216, 'bold 40px sans-serif', GOLD, 'center');
  text(ctx, 'The tide ebbs for a moment. Choose a blessing before the next wave:', VIEW_W / 2, 252, '19px sans-serif', INK, 'center');
  state.boonChoices.forEach((b, i) => {
    const bx = 280 + i * 260;
    ctx.fillStyle = 'rgba(16, 20, 44, 0.95)';
    rr(ctx, bx, 280, 230, 170, 12);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    rr(ctx, bx, 280, 230, 170, 12);
    ctx.stroke();
    text(ctx, b.icon, bx + 115, 332, '38px sans-serif', GOLD, 'center');
    text(ctx, b.name, bx + 115, 372, 'bold 19px sans-serif', INK, 'center');
    text(ctx, b.desc, bx + 115, 398, '14px sans-serif', DIM, 'center');
    text(ctx, `press ${i + 1}`, bx + 115, 432, '12px sans-serif', DIM, 'center');
  });
  text(ctx, 'Click a card or press 1, 2 or 3', VIEW_W / 2, 500, 'bold 19px sans-serif', GOLD, 'center');
}

function drawVictory(ctx, state) {
  dimField(ctx, 0.6);
  // A dawn-green wash over the field behind the panel.
  ctx.fillStyle = 'rgba(40, 90, 60, 0.12)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const px = 305, py = 164, pw = 670, ph = 362;
  ctx.fillStyle = 'rgba(10, 14, 36, 0.94)';
  rr(ctx, px, py, pw, ph, 18);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  rr(ctx, px, py, pw, ph, 18);
  ctx.stroke();
  text(ctx, '🏆 THE LIGHT HOLDS!', VIEW_W / 2, 246, 'bold 44px sans-serif', '#7ee081', 'center');
  text(ctx, 'The Dread Captain is dust. Dawn breaks over Emberfall.', VIEW_W / 2, 284, '19px sans-serif', INK, 'center');
  text(ctx, `SCORE  ${state.score}   ·   WAVES  10/10   ·   SLAIN  ${state.kills}`, VIEW_W / 2, 338, 'bold 21px sans-serif', GOLD, 'center');
  text(ctx, `Towers built: ${state.towers.length}   ·   Gold earned: ${state.goldEarned}`, VIEW_W / 2, 368, '15px sans-serif', DIM, 'center');
  const pulse = 0.85 + 0.15 * Math.sin(state.time * 3);
  text(ctx, '▶  Press R or click to play again', VIEW_W / 2, 444, 'bold 23px sans-serif', GOLD, 'center', pulse);
  text(ctx, 'Emberfall Keep — an original game. No network, no files beyond this page.', VIEW_W / 2, 484, '13px sans-serif', DIM, 'center');
}

function drawDefeat(ctx, state) {
  dimField(ctx, 0.68);
  ctx.fillStyle = 'rgba(90, 20, 40, 0.14)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const px = 305, py = 164, pw = 670, ph = 362;
  ctx.fillStyle = 'rgba(10, 14, 36, 0.94)';
  rr(ctx, px, py, pw, ph, 18);
  ctx.fill();
  ctx.strokeStyle = '#ff5d7a';
  ctx.lineWidth = 2;
  rr(ctx, px, py, pw, ph, 18);
  ctx.stroke();
  text(ctx, '💀 THE LIGHT FALLS', VIEW_W / 2, 246, 'bold 44px sans-serif', '#ff5d7a', 'center');
  text(ctx, 'The shadow tide takes Emberfall. The lighthouse goes dark.', VIEW_W / 2, 284, '19px sans-serif', INK, 'center');
  text(ctx, `SCORE  ${state.score}   ·   WAVES  ${state.wave}/10   ·   SLAIN  ${state.kills}`, VIEW_W / 2, 338, 'bold 21px sans-serif', GOLD, 'center');
  text(ctx, `Towers built: ${state.towers.length}   ·   Gold earned: ${state.goldEarned}`, VIEW_W / 2, 368, '15px sans-serif', DIM, 'center');
  const pulse = 0.85 + 0.15 * Math.sin(state.time * 3);
  text(ctx, '▶  Press R or click to try again', VIEW_W / 2, 444, 'bold 23px sans-serif', GOLD, 'center', pulse);
  text(ctx, 'Emberfall Keep — an original game. No network, no files beyond this page.', VIEW_W / 2, 484, '13px sans-serif', DIM, 'center');
}
