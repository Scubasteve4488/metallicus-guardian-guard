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
function padButton(scene, x, y, r, label, onDown, onUp, { square = false, size = 16 } = {}) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (pressed) => {
    g.clear();
    g.fillStyle(pressed ? 0x6b4fb0 : 0x141222, pressed ? 0.8 : 0.35);
    g.lineStyle(2, 0xe0b64a, pressed ? 0.9 : 0.45);
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

  // Compact pad: ~40px buttons on a sideways phone, kept low in the corners.
  const cx = 92;
  const cy = VIEW_H - 92;
  const s = 44;
  const r = 21;
  const dir = (name, x, y, label) => layer.add(padButton(hud, x, y, r, label,
    () => { pad[name] = true; }, () => { pad[name] = false; }, { square: true }));
  dir('up', cx, cy - s, '▲');
  dir('down', cx, cy + s, '▼');
  dir('left', cx - s, cy, '◀');
  dir('right', cx + s, cy, '▶');

  layer.add(padButton(hud, VIEW_W - 78, VIEW_H - 86, 38, 'A',
    () => { pad.action = true; tapped.add('action'); }, () => { pad.action = false; }, { size: 24 }));
  layer.add(padButton(hud, VIEW_W - 36, 84, 20, '?', () => tapped.add('hint'), null, { size: 16 }));

  const ctx = padButton(hud, VIEW_W - 170, VIEW_H - 150, 34, '', () => tapped.add('ctx'), null, { size: 12 });
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
