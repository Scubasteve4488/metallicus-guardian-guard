// Clarity Report: sort findings into the four locked categories, then the player
// picks the next step. There is no approval verdict and no score for "trust".

import { VIEW_W, VIEW_H, COLORS } from '../config.js';
import { txt, panel, button } from '../ui/widgets.js';
import { run } from '../state.js';
import { gradeReport, nextStepOptions, CATEGORY_IDS } from '../logic/report.js';

const COL_W = 228;
const COL_X0 = 12;
const COL_Y = 58;
const COL_H = 300;
const CARD_W = 214;
const CARD_H = 50;
const TRAY_Y = 372;
const TRAY_COL_W = 312;

const CAT_COLORS = { verified: 0x8fe3b0, attention: 0xffcf70, unverified: 0xff9fb0, confirm: 0x8fc8ff };

export class ClarityReportScene extends Phaser.Scene {
  constructor() { super('ClarityReport'); }

  create() {
    this.caseData = this.cache.json.get('case01');
    this.report = this.caseData.report;
    this.cameras.main.setBackgroundColor('#101019').fadeIn(250);
    this.placements = {};
    this.selected = null;
    this.graded = false;
    this.pickingNext = false;
    this.left = false;

    txt(this, 14, 12, 'CLARITY REPORT', 22, COLORS.gold, { bold: true });
    txt(this, 220, 18, 'Case 01: sort each finding into the column the evidence supports.', 14, COLORS.dim);

    // Columns
    this.cols = this.report.categories.map((cat, i) => {
      const x = COL_X0 + i * (COL_W + 8);
      const g = this.add.graphics();
      g.fillStyle(0x1b1928, 1).fillRect(x, COL_Y, COL_W, COL_H);
      g.fillStyle(CAT_COLORS[cat.id], 1).fillRect(x, COL_Y, COL_W, 4);
      g.lineStyle(2, 0x3b3552, 1).strokeRect(x, COL_Y, COL_W, COL_H);
      txt(this, x + 8, COL_Y + 10, `${i + 1}  ${cat.title}`, 15, COLORS.ink, { bold: true });
      txt(this, x + 8, COL_Y + 32, cat.help, 11, COLORS.dim, { wrap: COL_W - 16 });
      const zone = this.add.zone(x, COL_Y, COL_W, COL_H).setOrigin(0).setRectangleDropZone(COL_W, COL_H);
      zone.setData('cat', cat.id);
      zone.on('pointerup', () => { if (this.selected) this.place(this.selected, cat.id); });
      return { id: cat.id, x, zone };
    });

    // Findings tray
    panel(this, 8, TRAY_Y - 10, VIEW_W - 16, 166, { alpha: 1 });
    this.cards = {};
    this.report.findings.forEach((f, i) => {
      const home = { x: 20 + (i % 3) * TRAY_COL_W + CARD_W / 2, y: TRAY_Y + Math.floor(i / 3) * 52 + CARD_H / 2 };
      this.cards[f.id] = this.makeCard(f, home);
    });

    this.msg = txt(this, 14, VIEW_H - 22, 'Drag a finding into a column, or click it and then press 1-4.', 13, COLORS.dim);
    this.submitBtn = button(this, VIEW_W - 110, 30, 'Submit report', () => this.submit(), { w: 190, h: 34, size: 15 })
      .setEnabled(false);

    this.input.on('drop', (p, obj, zone) => this.place(obj.getData('id'), zone.getData('cat')));
    this.input.on('dragend', (p, obj, dropped) => { if (!dropped) this.layout(); });
    this.input.on('drag', (p, obj, x, y) => { obj.setPosition(x, y); });
    this.input.keyboard.on('keydown', (ev) => {
      const n = parseInt(ev.key, 10);
      if (this.selected && n >= 1 && n <= 4) this.place(this.selected, CATEGORY_IDS[n - 1]);
    });
  }

  makeCard(f, home) {
    const c = this.add.container(home.x, home.y).setDepth(10);
    const bg = this.add.graphics();
    const t = txt(this, -CARD_W / 2 + 6, -CARD_H / 2 + 4, f.text, 11, '#15131d', { wrap: CARD_W - 12, lineSpacing: 0 });
    c.add([bg, t]);
    c.setSize(CARD_W, CARD_H);
    c.setInteractive({ useHandCursor: true, draggable: true });
    c.setData('id', f.id);
    const card = { f, c, bg, home, mark: null };
    card.draw = (state) => {
      bg.clear();
      const fill = state === 'right' ? 0xd8f5e2 : state === 'wrong' ? 0xffd9d9 : 0xf1ead8;
      bg.fillStyle(fill, 1).fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
      const edge = state === 'sel' || state === 'pick' ? 0xe0b64a : state === 'wrong' ? 0xd04040 : state === 'right' ? 0x2f9a5a : 0x15131d;
      bg.lineStyle(state === 'sel' || state === 'pick' ? 4 : 2, edge, 1).strokeRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
    };
    card.draw('idle');
    c.on('pointerup', (p) => {
      // A drag also ends in pointerup; only treat a still press as a click.
      if (Phaser.Math.Distance.Between(p.downX, p.downY, p.upX, p.upY) > 6) return;
      this.onCardClick(f.id);
    });
    c.on('dragstart', () => { c.setDepth(30); this.select(null); });
    return card;
  }

  onCardClick(id) {
    if (this.pickingNext) { this.pickNext(id); return; }
    if (this.graded) { this.explain(id); return; }
    this.select(this.selected === id ? null : id);
  }

  select(id) {
    if (this.selected) this.cards[this.selected].draw('idle');
    this.selected = id;
    if (id) {
      this.cards[id].draw('sel');
      this.msg.setText('Now click a column, or press 1-4.').setColor(COLORS.violet);
    }
  }

  place(id, cat) {
    if (this.graded || !id) return;
    this.placements[id] = cat;
    this.select(null);
    this.layout();
    const all = this.report.findings.every((f) => this.placements[f.id]);
    this.submitBtn.setEnabled(all);
    this.msg.setText(all ? 'All findings placed. Submit when ready.' : `${Object.keys(this.placements).length} of ${this.report.findings.length} placed.`)
      .setColor(COLORS.dim);
  }

  layout() {
    const counts = {};
    for (const f of this.report.findings) {
      const card = this.cards[f.id];
      const cat = this.placements[f.id];
      card.c.setDepth(10);
      if (!cat) { card.c.setPosition(card.home.x, card.home.y); continue; }
      const col = this.cols.find((c) => c.id === cat);
      const n = counts[cat] = (counts[cat] || 0) + 1;
      const inCol = this.report.findings.filter((x) => this.placements[x.id] === cat).length;
      const gap = Math.min(CARD_H + 4, (COL_H - 80 - CARD_H) / Math.max(1, inCol - 1));
      card.c.setPosition(col.x + COL_W / 2, COL_Y + 72 + CARD_H / 2 + (n - 1) * gap);
      card.c.setDepth(10 + n);
    }
  }

  submit() {
    if (this.graded) return;
    const g = gradeReport(this.report, this.placements);
    if (!g.allPlaced) return;
    this.graded = true;
    run.metrics.reportAttempts += 1;
    run.metrics.reportFirstPct = g.pct;
    this.submitBtn.setVisible(false);
    // Show the result, then move any misplaced card to where the evidence puts it.
    for (const r of g.results) {
      const card = this.cards[r.id];
      this.input.setDraggable(card.c, false);
      card.draw(r.correct ? 'right' : 'wrong');
      if (!r.correct) this.placements[r.id] = r.answer;
    }
    this.time.delayedCall(900, () => this.layout());
    this.msg.setText(`${g.correct} of ${g.total} placed where the evidence supports. Red cards were moved; click any card to see why.`)
      .setColor(g.correct === g.total ? COLORS.good : COLORS.warn);
    this.time.delayedCall(1200, () => this.askNextStep());
  }

  explain(id) {
    const f = this.report.findings.find((x) => x.id === id);
    const cat = this.report.categories.find((c) => c.id === f.answer);
    this.msg.setText(`${cat.title}: ${f.why}`).setColor(COLORS.ink);
  }

  askNextStep() {
    this.pickingNext = true;
    const opts = nextStepOptions(this.report);
    for (const o of opts) this.cards[o.id].draw('pick');
    const c = this.add.container(0, 0).setDepth(40);
    c.add(panel(this, 250, 10, 700, 42));
    c.add(txt(this, 264, 22, `${this.report.nextStepPrompt} click a gold-edged card in Confirm Next.`, 13, COLORS.gold, { bold: true }));
    this.nextPanel = c;
  }

  pickNext(id) {
    const f = this.report.findings.find((x) => x.id === id);
    if (!f.nextStep) { this.explain(id); return; }
    this.pickingNext = false;
    run.metrics.nextStep = f.text;
    this.nextPanel.destroy();
    const c = this.add.container(0, 0).setDepth(60);
    c.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x07060c, 0.7).setOrigin(0));
    c.add(panel(this, 170, 140, 620, 250));
    c.add(txt(this, 196, 160, 'REPORT FILED', 18, COLORS.gold, { bold: true }));
    c.add(txt(this, 196, 196, `Your next step: ${f.text}`, 15, COLORS.ink, { wrap: 570 }));
    c.add(txt(this, 196, 260, this.report.disclaimer, 13, COLORS.dim, { wrap: 570 }));
    const go = () => {
      if (this.left) return;
      this.left = true;
      run.phase = 'restored';
      run.guardPos = { x: 300, y: 200, facing: 'down' };
      this.scene.start('Market');
    };
    c.add(button(this, 480, 350, 'Return to the market  (Enter)', go, { w: 320, h: 40 }));
    this.input.keyboard.once('keydown-ENTER', go);
  }
}
