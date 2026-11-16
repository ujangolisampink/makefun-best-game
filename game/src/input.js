// EMBERFALL KEEP — input.js
// Mouse and keyboard input, translated into the game's 1280x720 logical
// coordinates no matter how the canvas is scaled on the page.
import { VIEW_W, VIEW_H } from './config.js';

export function createInput(canvas, hooks) {
  const pointer = { x: 0, y: 0, inside: false };

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    const scale = Math.min(r.width / VIEW_W, r.height / VIEW_H);
    const offX = r.left + (r.width - VIEW_W * scale) / 2;
    const offY = r.top + (r.height - VIEW_H * scale) / 2;
    return { x: (e.clientX - offX) / scale, y: (e.clientY - offY) / scale };
  }

  canvas.addEventListener('mousemove', (e) => {
    const p = toLogical(e);
    pointer.x = p.x; pointer.y = p.y; pointer.inside = true;
    hooks.onMove(p.x, p.y);
  });
  canvas.addEventListener('mouseleave', () => { pointer.inside = false; });
  canvas.addEventListener('click', (e) => {
    const p = toLogical(e);
    hooks.onClick(p.x, p.y);
  });
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    hooks.onKey(e.key.toLowerCase());
  });
  return pointer;
}
