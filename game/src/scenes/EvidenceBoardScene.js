// Evidence Board: link cards to expose the contradiction, find where the evidence
// points, and mark what nobody can verify. Mechanic adapted in spirit from
// stefankober/detective-board (MIT); no code or visuals copied.

import { VIEW_W, VIEW_H, COLORS } from '../config.js';
import { txt, panel, button } from '../ui/widgets.js';
import { run } from '../state.js';
import { evaluateLink, boardObjectives, boardComplete, pairKey } from '../logic/board.js';

const CARD_W = 214;
const CARD_H = 132;
const TYPE_COLORS = { SOURCE: 0x8fc8ff, RECORD: 0x8fe3b0, WITNESS: 0xffcf70, TRAIL: 0xc79bff, CLAIM: 0xff9fb0 };
const LINK_COLORS = { contradiction: 0xff8f5a, supports: 0x8fe3b0 };

export class EvidenceBoardScene extends Phaser.Scene {
  constructor() { super('EvidenceBoard'); }

  create() {
    this.caseData = this.cache.json.get('case01');
    this.cameras.main.setBackgroundColor('#1a1420').fadeIn(250);
    this.selected = null;
    this.dragFrom = null;
    this.finished = false;

    // Cork-ish board
    const g = this.add.graphics();
    g.fillStyle(0x3a2a22, 1).fillRect(10, 50, 690, 480);
    g.lineStyle(3, 0x6b4a2b, 1).strokeRect(10, 50, 690, 480);
    txt(this, 20, 14, 'EVIDENCE BOARD', 22, COLORS.gold, { bold: true });
    txt(this, 250, 20, 'Case 01: The Counterfeit Signal', 15, COLORS.dim);

    this.linkLayer = this.add.graphics().setDepth(1);
    this.tempLine = this.add.graphics().setDepth(20);
    this.linkLabels = [];

    this.cards = {};
    for (const id of run.cards) this.cards[id] = this.makeCard(id);
    // Redraw links that already exist (e.g. after returning with Esc).
    for (const l of run.board.links) this.drawLink(l);

    // Side panel
    panel(this, 710, 50, 240, 480);
    txt(this, 724, 62,
      'Drag from one card to another to link them, or click two cards in turn.\n\n' +
      "Use a card's Uncertain box when nothing backs it up.",
      13, COLORS.ink, { wrap: 214 });
    txt(this, 724, 190, 'GOALS', 13, COLORS.violet, { bold: true });
    this.objTexts = this.caseData.boardObjectives.map((o, i) =>
      txt(this, 724, 212 + i * 42, '', 13, COLORS.ink, { wrap: 214 }));
    txt(this, 724, 344, 'LAST LINK', 13, COLORS.violet, { bold: true });
    this.feedback = txt(this, 724, 364, 'No links yet.', 13, COLORS.dim, { wrap: 214 });
    button(this, 770, 500, 'Hint (H)', () => this.hint(), { w: 110, h: 32, size: 14 });
    button(this, 890, 500, 'Back (Esc)', () => this.back(), { w: 110, h: 32, size: 14 });

    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerup', (p) => this.onUp(p));
    this.input.keyboard.on('keydown-H', () => this.hint());
    this.input.keyboard.on('keydown-ESC', () => this.back());
    this.refreshObjectives();
  }

  makeCard(id) {
    const d = this.caseData.cards[id];
    const c = this.add.container(d.x, d.y).setDepth(5);
    const bg = this.add.graphics();
    const col = TYPE_COLORS[d.type];
    const draw = (hi) => {
      bg.clear();
      bg.fillStyle(0xf1ead8, 1).fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      bg.fillStyle(col, 1).fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 22);
      bg.lineStyle(hi ? 4 : 2, hi ? 0xe0b64a : 0x15131d, 1).strokeRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
    };
    draw(false);
    const type = txt(this, -CARD_W / 2 + 8, -CARD_H / 2 + 3, d.type, 13, '#15131d', { bold: true });
    const title = txt(this, -CARD_W / 2 + 8, -CARD_H / 2 + 26, d.title, 14, '#15131d', { bold: true });
    const body = txt(this, -CARD_W / 2 + 8, -CARD_H / 2 + 46, d.body, 12, '#2c2838', { wrap: CARD_W - 16, lineSpacing: 1 });
    const unc = txt(this, CARD_W / 2 - 8, CARD_H / 2 - 6, '', 12, '#5b3fa0', { bold: true })
      .setOrigin(1, 1).setBackgroundColor('#e3dcf5').setPadding(4, 2, 4, 2);
    unc.setInteractive({ useHandCursor: true });
    unc.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); });
    unc.on('pointerup', (p, lx, ly, ev) => { ev.stopPropagation(); this.toggleUncertain(id); });
    c.add([bg, type, title, body, unc]);
    c.setSize(CARD_W, CARD_H);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', (p) => { this.dragFrom = id; this.downAt = { x: p.x, y: p.y }; });
    const card = { id, c, draw, unc, x: d.x, y: d.y };
    this.setUncLabel(card);
    return card;
  }

  setUncLabel(card) {
    const on = run.board.uncertain.has(card.id);
    card.unc.setText(on ? '☑ Uncertain' : '☐ Uncertain');
  }

  cardAt(x, y) {
    for (const card of Object.values(this.cards)) {
      if (Math.abs(x - card.x) <= CARD_W / 2 && Math.abs(y - card.y) <= CARD_H / 2) return card.id;
    }
    return null;
  }

  onMove(p) {
    this.tempLine.clear();
    if (!this.dragFrom || !p.isDown) return;
    const a = this.cards[this.dragFrom];
    this.tempLine.lineStyle(3, 0xe0b64a, 0.9).lineBetween(a.x, a.y, p.x, p.y);
  }

  onUp(p) {
    this.tempLine.clear();
    if (this.finished) return;
    const from = this.dragFrom;
    this.dragFrom = null;
    if (!from) return;
    const to = this.cardAt(p.x, p.y);
    const moved = Phaser.Math.Distance.Between(this.downAt.x, this.downAt.y, p.x, p.y) > 12;
    if (to && to !== from) { this.clearSelection(); this.tryLink(from, to); return; }
    if (to === from && !moved) {
      // Click-to-link: first click selects, second click on another card links.
      if (this.selected && this.selected !== from) {
        const a = this.selected;
        this.clearSelection();
        this.tryLink(a, from);
      } else if (this.selected === from) {
        this.clearSelection();
      } else {
        this.selected = from;
        this.cards[from].draw(true);
      }
    }
  }

  clearSelection() {
    if (this.selected) this.cards[this.selected].draw(false);
    this.selected = null;
  }

  tryLink(a, b) {
    const key = pairKey(a, b);
    if (run.board.links.some((l) => pairKey(l.a, l.b) === key)) {
      this.showFeedback('Those two are already linked.', COLORS.dim);
      return;
    }
    const r = evaluateLink(this.caseData, a, b);
    if (r.kind === 'contradiction' || r.kind === 'supports') {
      const link = { a, b, kind: r.kind, route: r.route, text: r.text };
      run.board.links.push(link);
      this.drawLink(link);
      this.showFeedback(r.text, r.kind === 'contradiction' ? '#ffb38a' : COLORS.good);
    } else {
      if (r.kind === 'unrelated') run.metrics.unrelatedLinks += 1;
      this.flashBadLink(a, b);
      this.showFeedback(r.text, COLORS.bad);
    }
    this.refreshObjectives();
  }

  drawLink(l) {
    const A = this.cards[l.a];
    const B = this.cards[l.b];
    if (!A || !B) return;
    this.linkLayer.lineStyle(4, LINK_COLORS[l.kind], 1).lineBetween(A.x, A.y, B.x, B.y);
    const label = txt(this, (A.x + B.x) / 2, (A.y + B.y) / 2, l.kind === 'contradiction' ? 'CONTRADICTION' : 'SUPPORTS',
      11, '#15131d', { bold: true }).setOrigin(0.5).setDepth(8)
      .setBackgroundColor(l.kind === 'contradiction' ? '#ff9f6a' : '#8fe3b0').setPadding(4, 2, 4, 2);
    this.linkLabels.push(label);
  }

  flashBadLink(a, b) {
    const A = this.cards[a];
    const B = this.cards[b];
    const g = this.add.graphics().setDepth(2);
    g.lineStyle(3, 0xff6f6f, 1).lineBetween(A.x, A.y, B.x, B.y);
    this.tweens.add({ targets: g, alpha: 0, duration: 900, onComplete: () => g.destroy() });
  }

  toggleUncertain(id) {
    if (this.finished) return;
    const set = run.board.uncertain;
    if (set.has(id)) set.delete(id); else set.add(id);
    this.setUncLabel(this.cards[id]);
    if (set.has(id) && !this.caseData.uncertainCorrect.includes(id)) {
      this.showFeedback(this.caseData.uncertainWrongText[id], COLORS.warn);
    } else if (set.has(id)) {
      this.showFeedback('Marked Uncertain. Nothing on the board can confirm it.', COLORS.good);
    }
    this.refreshObjectives();
  }

  showFeedback(t, color) {
    this.feedback.setText(t).setColor(color);
  }

  refreshObjectives() {
    const o = boardObjectives(this.caseData, run.board);
    this.caseData.boardObjectives.forEach((obj, i) => {
      const done = o[obj.id];
      this.objTexts[i].setText(`${done ? '☑' : '☐'} ${obj.text}`).setColor(done ? COLORS.good : COLORS.ink);
    });
    if (boardComplete(this.caseData, run.board) && !this.finished) {
      this.finished = true;
      this.time.delayedCall(700, () => this.conclude());
    }
  }

  hint() {
    if (this.finished) return;
    run.metrics.hints += 1;
    const o = boardObjectives(this.caseData, run.board);
    const idx = this.caseData.boardObjectives.findIndex((x) => !o[x.id]);
    if (idx >= 0) this.showFeedback(`Hint: ${this.caseData.boardHints[idx]}`, COLORS.violet);
  }

  back() {
    if (this.finished) return;
    this.scene.start('Market');
  }

  conclude() {
    const c = this.add.container(0, 0).setDepth(50);
    c.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x07060c, 0.75).setOrigin(0));
    c.add(panel(this, 150, 120, 660, 300));
    c.add(txt(this, 176, 140, 'WHAT THE EVIDENCE SHOWS', 18, COLORS.gold, { bold: true }));
    c.add(txt(this, 176, 176, this.caseData.conclusion.join('\n\n'), 16, COLORS.ink, { wrap: 610 }));
    const go = () => { run.phase = 'contain'; this.scene.start('Containment'); };
    c.add(button(this, 480, 380, 'Raise the Shield  (Enter)', go, { w: 300, h: 40 }));
    this.input.keyboard.once('keydown-ENTER', go);
  }
}
