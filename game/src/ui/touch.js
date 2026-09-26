// Phone controls. Drag a thumb anywhere to walk (a floating stick appears under
// it). A quick tap on a person or object walks Mini GUARD over and uses it; a tap
// on open ground walks there. Small buttons: Hint, and BOARD / FINISH when needed.

import { VIEW_W } from '../config.js';
import { txt } from './widgets.js';
import { COLORS } from '../config.js';

const STICK_R = 56;
const DRAG_START = 14;
const TAP_MS = 400;

export function isTouch() {
  const q = new URLSearchParams(window.location.search);
  if (q.has('touch')) return true;
  if (q.has('keys')) return false;
  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
}

function roundButton(scene, x, y, r, label, onTap, size = 13) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (pressed) => {
    g.clear();
    g.fillStyle(pressed ? 0x6b4fb0 : 0x141222, pressed ? 0.85 : 0.6);
    g.fillCircle(0, 0, r);
    g.lineStyle(2, 0xe0b64a, pressed ? 1 : 0.6);
    g.strokeCircle(0, 0, r);
  };
  draw(false);
  const t = txt(scene, 0, 0, label, size, COLORS.ink, { bold: true }).setOrigin(0.5);
  c.add([g, t]);
  c.setInteractive(new Phaser.Geom.Circle(0, 0, r), Phaser.Geom.Circle.Contains);
  c.on('pointerdown', () => draw(true));
  c.on('pointerout', () => draw(false));
  c.on('pointerup', () => { draw(false); onTap(); });
  c.label = t;
  return c;
}

export function buildTouchPad(hud) {
  const pad = { vx: 0, vy: 0 };
  const tapped = new Set();
  let lastTap = null;
  const layer = hud.add.container(0, 0).setDepth(30);
  const stick = hud.add.graphics().setDepth(29);

  layer.add(roundButton(hud, VIEW_W - 36, 84, 20, '?', () => tapped.add('hint'), 16));
  const ctx = roundButton(hud, VIEW_W - 70, 440, 40, '', () => tapped.add('ctx'), 13);
  ctx.setVisible(false);
  layer.add(ctx);

  let start = null;
  let pid = null;
  let t0 = 0;
  let dragging = false;

  const drawStick = (kx, ky) => {
    stick.clear();
    stick.lineStyle(2, 0xe0b64a, 0.45).strokeCircle(start.x, start.y, STICK_R);
    stick.fillStyle(0x141222, 0.25).fillCircle(start.x, start.y, STICK_R);
    stick.fillStyle(0xe0b64a, 0.55).fillCircle(kx, ky, 18);
  };

  hud.input.on('pointerdown', (p, over) => {
    if (start || hud.busy || over.length) return;
    start = { x: p.x, y: p.y };
    pid = p.id;
    t0 = hud.time.now;
    dragging = false;
  });
  hud.input.on('pointermove', (p) => {
    if (!start || p.id !== pid) return;
    const dx = p.x - start.x;
    const dy = p.y - start.y;
    const d = Math.hypot(dx, dy);
    if (!dragging && d > DRAG_START) dragging = true;
    if (!dragging) return;
    const m = Math.min(d, STICK_R) / STICK_R;
    const k = m < 0.2 ? 0 : m;
    pad.vx = d ? (dx / d) * k : 0;
    pad.vy = d ? (dy / d) * k : 0;
    drawStick(start.x + (dx / d) * Math.min(d, STICK_R), start.y + (dy / d) * Math.min(d, STICK_R));
  });
  const end = (p) => {
    if (!start || p.id !== pid) return;
    if (!dragging && hud.time.now - t0 < TAP_MS) { lastTap = { x: p.x, y: p.y }; tapped.add('world'); }
    start = null;
    dragging = false;
    pad.vx = 0;
    pad.vy = 0;
    stick.clear();
  };
  hud.input.on('pointerup', end);
  hud.input.on('pointerupoutside', end);

  return {
    pad,
    layer,
    get dragging() { return dragging; },
    take(name) { return tapped.delete(name); },
    takeTap() { return tapped.delete('world') ? lastTap : null; },
    clear() { tapped.clear(); lastTap = null; },
    setContext(label) { ctx.setVisible(!!label); ctx.label.setText(label || ''); },
  };
}
