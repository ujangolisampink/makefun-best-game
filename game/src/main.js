// EMBERFALL KEEP — main.js
// Game loop, screen flow and click/keyboard wiring. The loop runs on
// requestAnimationFrame; updateWorld owns the simulation, render owns
// the pixels. A `?shot=` query stages a deterministic screenshot scene.
import { VIEW_W, VIEW_H, TOWER_KEYS, PLOT_ROWS_Y, PLOT_COLS_X } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { newGame, startWave, applyBoon, updateWorld } from './world.js';
import { render } from './render.js';
import { plotAt, towerAt, buildTower, upgradeTower, sellTower } from './towers.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

const audio = createAudio();
let state = newGame(audio);
const mouse = { x: 0, y: 0, inside: false };

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function restart() {
  state = newGame(audio);
  state.screen = 'playing';
  setStatus('Emberfall Keep. Build towers, then press Space to start wave 1.');
}

function beginFromTitle() {
  audio.unlock();
  state.screen = 'playing';
  setStatus('Build towers on the glowing plots, then press Space to start wave 1.');
}

function handleClick(x, y) {
  audio.unlock();
  if (state.screen === 'title') { beginFromTitle(); return; }
  if (state.screen === 'victory' || state.screen === 'defeat') { restart(); return; }
  if (state.screen === 'boon') {
    state.boonChoices.forEach((b, i) => {
      const bx = 280 + i * 260;
      if (x >= bx && x <= bx + 230 && y >= 280 && y <= 450) applyBoon(state, b);
    });
    return;
  }
  if (state.screen !== 'playing' || state.paused) return;
  // Build-menu buttons.
  if (state.selectedPlot && !state.selectedTower) {
    const p = state.selectedPlot;
    const bw = 560;
    const bx = Math.max(170, Math.min(VIEW_W - bw - 10, p.x - bw / 2));
    const by = Math.max(150, p.y - 118);
    for (let i = 0; i < TOWER_KEYS.length; i++) {
      const cx = bx + 14 + i * 136;
      if (x >= cx && x <= cx + 126 && y >= by + 30 && y <= by + 76) {
        if (buildTower(state, p, TOWER_KEYS[i])) state.selectedPlot = null;
        return;
      }
    }
  }
  // Click a tower to select it, a plot to open the build menu, anywhere
  // else to clear the selection.
  const plot = plotAt(x, y);
  if (plot) {
    const t = towerAt(state, plot);
    state.selectedTower = t;
    state.selectedPlot = t ? null : plot;
    return;
  }
  state.selectedPlot = null;
  state.selectedTower = null;
}

function handleKey(key) {
  if (key === 'm') { const m = audio.toggleMute(); setStatus(m ? 'Sound off.' : 'Sound on.'); return; }
  if (state.screen === 'title' && (key === ' ' || key === 'enter')) { beginFromTitle(); return; }
  if ((state.screen === 'victory' || state.screen === 'defeat') && (key === 'r' || key === ' ' || key === 'enter')) { restart(); return; }
  if (state.screen === 'boon' && ['1', '2', '3'].includes(key)) {
    const b = state.boonChoices[Number(key) - 1];
    if (b) applyBoon(state, b);
    return;
  }
  if (state.screen !== 'playing') return;
  if (key === 'p') { state.paused = !state.paused; return; }
  if (key === 'f') { state.speed = state.speed === 1 ? 2 : 1; return; }
  if (key === 'r') { restart(); return; }
  if (key === ' ') {
    if (!state.waveActive && !state.paused) startWave(state);
    return;
  }
  if (state.selectedPlot && ['1', '2', '3', '4'].includes(key)) {
    const k = TOWER_KEYS[Number(key) - 1];
    if (buildTower(state, state.selectedPlot, k)) state.selectedPlot = null;
    return;
  }
  if (state.selectedTower && key === 'u') { upgradeTower(state, state.selectedTower); return; }
  if (state.selectedTower && key === 'x') {
    sellTower(state, state.selectedTower);
    state.selectedTower = null;
  }
}

createInput(canvas, {
  onMove: (x, y) => { mouse.x = x; mouse.y = y; mouse.inside = true; },
  onClick: handleClick,
  onKey: handleKey,
});

// Deterministic screenshot staging: ?shot=start|play|boon|end
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) stageShot(state, shot, audio);

// Exposed for local play-testing only (never read by the game itself).
window.__emberfall = { get state() { return state; }, restart, startWave: () => startWave(state), step: (dt) => updateWorld(state, dt) };

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  updateWorld(state, dt);
  render(ctx, state, mouse);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
