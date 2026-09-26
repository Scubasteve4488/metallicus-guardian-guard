// On-screen controls for phones and tablets: a direction pad, an action button
// (tap = E, hold = inspect), and a context button (Board / Finish) plus Hint.

import { VIEW_W, VIEW_H, COLORS } from '../config.js';
import { txt } from './widgets.js';

export function isTouch() {
  const q = new URLSearchParams(window.location.search);
  if (q.has('touch')) return true;
  if (q.has('keys')) return false;
  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
}

// A round (or square) pad button. onDown/onUp fire per finger.
function padButton(scene, x, y, r, label, onDown, onUp, { square = false, size = 22 } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (pressed) => {
    g.clear();
    g.fillStyle(pressed ? 0x6b4fb0 : 0x141222, pressed ? 0.9 : 0.55);
    g.lineStyle(3, 0xe0b64a, pressed ? 1 : 0.7);
    if (square) { g.fillRect(-r, -r, r * 2, r * 2); g.strokeRect(-r, -r, r * 2, r * 2); }
    else { g.fillCircle(0, 0, r); g.strokeCircle(0, 0, r); }
  };
  draw(false);
  const t = txt(scene, 0, 0, label, size, COLORS.ink, { bold: true }).setOrigin(0.5);
  c.add([g, t]);
  const hit = square ? new Phaser.Geom.Rectangle(-r, -r, r * 2, r * 2) : new Phaser.Geom.Circle(0, 0, r);
  c.setInteractive(hit, square ? Phaser.Geom.Rectangle.Contains : Phaser.Geom.Circle.Contains);
  const down = () => { draw(true); onDown(); };
  const up = () => { draw(false); if (onUp) onUp(); };
  c.on('pointerdown', down);
  c.on('pointerup', up);
  c.on('pointerout', up);
  c.label = t;
  return c;
}

export function buildTouchPad(hud) {
  const pad = { left: false, right: false, up: false, down: false, action: false };
  const tapped = new Set();
  const layer = hud.add.container(0, 0).setDepth(30);

  const cx = 118;
  const cy = VIEW_H - 150;
  const s = 58;
  const r = 34;
  const dir = (name, x, y, label) => layer.add(padButton(hud, x, y, r, label,
    () => { pad[name] = true; }, () => { pad[name] = false; }, { square: true }));
  dir('up', cx, cy - s, '▲');
  dir('down', cx, cy + s, '▼');
  dir('left', cx - s, cy, '◀');
  dir('right', cx + s, cy, '▶');

  layer.add(padButton(hud, VIEW_W - 110, VIEW_H - 140, 58, 'A',
    () => { pad.action = true; tapped.add('action'); }, () => { pad.action = false; }, { size: 34 }));
  layer.add(padButton(hud, VIEW_W - 60, 110, 30, '?', () => tapped.add('hint'), null, { size: 22 }));

  const ctx = padButton(hud, VIEW_W - 110, VIEW_H - 268, 48, '', () => tapped.add('ctx'), null, { size: 15 });
  ctx.setVisible(false);
  layer.add(ctx);

  return {
    pad,
    layer,
    take(name) { return tapped.delete(name); },
    clear() { tapped.clear(); },
    setContext(label) { ctx.setVisible(!!label); ctx.label.setText(label || ''); },
  };
}
