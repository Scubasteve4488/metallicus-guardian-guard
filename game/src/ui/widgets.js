// Small UI helpers shared by the 1x (unzoomed) scenes.

import { FONT, COLORS } from '../config.js';

export function txt(scene, x, y, str, size = 16, color = COLORS.ink, opts = {}) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
    align: opts.align || 'left',
    lineSpacing: opts.lineSpacing ?? 3,
    fontStyle: opts.bold ? 'bold' : 'normal',
  });
}

export function panel(scene, x, y, w, h, { fill = COLORS.panel, edge = COLORS.panelEdge, alpha = 0.94 } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRect(x, y, w, h);
  g.lineStyle(2, edge, 1);
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);
  return g;
}

// A clickable text button. Returns a container with .setEnabled(bool).
export function button(scene, x, y, label, onClick, { w = 200, h = 36, size = 16 } = {}) {
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const t = txt(scene, 0, 0, label, size, COLORS.ink, { bold: true }).setOrigin(0.5);
  const draw = (state) => {
    bg.clear();
    const fill = state === 'off' ? 0x2a2733 : state === 'hover' ? 0x5b3fa0 : 0x3d2c6e;
    bg.fillStyle(fill, 1);
    bg.fillRect(-w / 2, -h / 2, w, h);
    bg.lineStyle(2, state === 'off' ? 0x4a4656 : 0xe0b64a, 1);
    bg.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
    t.setColor(state === 'off' ? '#6f6b7c' : COLORS.ink);
  };
  c.add([bg, t]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.enabled = true;
  c.label = t;
  draw('on');
  c.on('pointerover', () => c.enabled && draw('hover'));
  c.on('pointerout', () => draw(c.enabled ? 'on' : 'off'));
  c.on('pointerup', () => { if (c.enabled) onClick(); });
  c.setEnabled = (on) => { c.enabled = on; draw(on ? 'on' : 'off'); return c; };
  return c;
}
