// Loads case data, builds the gray-box textures, and shows the title card.

import { VIEW_W, VIEW_H, COLORS } from '../config.js';
import { buildSprites } from '../art/sprites.js';
import { paintMarket, paintProps } from '../art/market.js';
import { txt, button } from '../ui/widgets.js';
import { resetRun } from '../state.js';
import { Guard } from '../entities/guard.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.json('case01', new URL('../../data/case01.json', import.meta.url).href);
  }

  create() {
    buildSprites(this);
    paintProps(this);
    paintMarket(this, 'market-dim', 'dim');
    paintMarket(this, 'market-restored', 'restored');

    const data = this.cache.json.get('case01');
    this.started = false;
    this.cameras.main.setBackgroundColor('#0b0a12');
    txt(this, VIEW_W / 2, 70, 'GUARD.IAN: SIGNALBREAK', 34, COLORS.gold, { bold: true }).setOrigin(0.5);
    txt(this, VIEW_W / 2, 110, 'Phase 1 gray-box prototype  ·  ' + data.title, 16, COLORS.violet).setOrigin(0.5);

    new Guard(this, VIEW_W / 2, 270, { physics: false, scale: 5 });

    txt(this, VIEW_W / 2, 300,
      'Investigate a counterfeit notice in the market. Protect citizens with the Shield.\n' +
      'Authorize the verified route with the Key. File an honest Clarity Report.',
      15, COLORS.ink, { align: 'center' }).setOrigin(0.5, 0);
    txt(this, VIEW_W / 2, 350,
      'Move WASD / Arrows   ·   Talk E   ·   Inspect: hold E   ·   Hint H\n' +
      'Evidence Board & Report: mouse or touch   ·   Shield: Arrows/A-D + hold SPACE',
      13, COLORS.dim, { align: 'center' }).setOrigin(0.5, 0);
    txt(this, VIEW_W / 2, 400, data.fictionNotice, 12, COLORS.dim, { align: 'center', wrap: 760 }).setOrigin(0.5, 0);

    const start = () => {
      if (this.started) return;
      this.started = true;
      resetRun();
      this.scene.start('Market');
    };
    button(this, VIEW_W / 2, 480, 'Start case  (Enter)', start, { w: 260, h: 42 });
    this.input.keyboard.once('keydown-ENTER', start);
    this.input.keyboard.once('keydown-SPACE', start);
  }
}
