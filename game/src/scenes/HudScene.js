// HUD overlay for the market: objectives, evidence tray, prompts, dialogue,
// route choice, toasts, district trust and the end-of-case summary.

import { VIEW_W, VIEW_H, COLORS } from '../config.js';
import { txt, panel, button } from '../ui/widgets.js';
import { run, evidenceQuality } from '../state.js';
import { typesCollected } from '../logic/board.js';
import { tapTracker } from '../ui/taps.js';
import { isTouch, buildTouchPad } from '../ui/touch.js';

const TYPE_COLORS = { SOURCE: '#8fc8ff', RECORD: '#8fe3b0', WITNESS: '#ffcf70' };

export class HudScene extends Phaser.Scene {
  constructor() { super('HUD'); }

  init() { this.ready = false; this.dlgActive = false; this.busy = false; }

  create() {
    this.caseData = this.cache.json.get('case01');
    this.busy = false;
    this.closedAt = 0;

    // Objectives (top left)
    this.objBg = panel(this, 8, 8, 330, 84);
    this.objTitle = txt(this, 18, 14, 'CASE 01: COUNTERFEIT SIGNAL', 14, COLORS.violet, { bold: true });
    this.objText = txt(this, 18, 34, '', 14, COLORS.ink, { wrap: 310 });

    this.touch = isTouch();
    // Evidence tray (bottom left; shifted right on touch to clear the d-pad)
    this.trayX = 8;
    this.trayBg = panel(this, this.trayX, VIEW_H - 50, 470, 42);
    this.trayLabel = txt(this, this.trayX + 10, VIEW_H - 38, 'EVIDENCE 0', 13, COLORS.gold, { bold: true });
    this.trayChips = [];

    // Trust meter (top right)
    this.trustBg = panel(this, VIEW_W - 218, 8, 210, 44);
    this.trustLabel = txt(this, VIEW_W - 208, 13, 'DISTRICT TRUST', 12, COLORS.dim, { bold: true });
    this.trustBar = this.add.graphics();
    this.trust = this.caseData.restore.trustBefore;
    this.drawTrust(this.trust);

    // Controls reminder (bottom right)
    this.help = txt(this, VIEW_W - 12, VIEW_H - 12,
      'Move: WASD/Arrows   Talk/Inspect: E (hold to inspect)   Hint: H', 12, COLORS.dim).setOrigin(1, 1)
      .setVisible(!this.touch);

    // Interaction prompt (above Mini GUARD, centre screen)
    this.prompt = txt(this, VIEW_W / 2, VIEW_H / 2 + 44, '', 15, COLORS.ink, { bold: true, align: 'center' })
      .setOrigin(0.5).setBackgroundColor('#141222').setPadding(8, 4, 8, 4).setVisible(false);
    this.progress = this.add.graphics();
    if (this.touch) {
      this.prompt.setInteractive({ useHandCursor: true });
      this.prompt.on('pointerup', () => { if (this.pad) this.pad.tapPrompt = true; });
    }

    // Toasts
    this.toasts = [];

    // Dialogue box
    this.dlg = this.add.container(0, 0).setVisible(false).setDepth(50);
    const dBg = panel(this, 120, VIEW_H - 170, VIEW_W - 240, 118);
    this.dlgName = txt(this, 140, VIEW_H - 160, '', 15, COLORS.gold, { bold: true });
    this.dlgText = txt(this, 140, VIEW_H - 136, '', 16, COLORS.ink, { wrap: VIEW_W - 290 });
    this.dlgMore = txt(this, VIEW_W - 135, VIEW_H - 62, this.touch ? 'tap ▸' : 'E ▸', 14, COLORS.dim).setOrigin(1, 1);
    this.dlg.add([dBg, this.dlgName, this.dlgText, this.dlgMore]);

    this.taps = tapTracker(this);
    this.input.on('pointerup', () => { if (this.dlgActive) this.advance(); });
    this.pad = this.touch ? buildTouchPad(this) : null;
    this.refreshTray();
    this.ready = true;
  }

  // Prompt text for an interaction: "E  Talk to Oren" or, on touch, "Tap: talk to Oren".
  actLabel(verb, hold = false) {
    if (this.touch) return `Tap: ${verb.charAt(0).toLowerCase()}${verb.slice(1)}`;
    return `${hold ? 'Hold E' : 'E'}  ${verb}`;
  }

  update() {
    if (this.pad) this.pad.layer.setVisible(!this.busy);
    if (!this.dlgActive) { this.taps.clear(); return; }
    if (this.taps.take('KeyE', 'Space', 'Enter')) this.advance();
  }

  // --- objectives / tray / trust ---------------------------------------------------
  setObjectives(lines) {
    this.objText.setText(lines.map((l) => `▸ ${l}`).join('\n'));
    const h = Math.max(60, this.objText.height + 36);
    this.objBg.clear();
    this.objBg.fillStyle(COLORS.panel, 0.94).fillRect(8, 8, 330, h);
    this.objBg.lineStyle(2, COLORS.panelEdge, 1).strokeRect(9, 9, 328, h - 2);
  }

  refreshTray() {
    this.trayChips.forEach((c) => c.destroy());
    this.trayChips = [];
    const types = typesCollected(this.caseData, run.cards);
    const n = types.filter((t) => t.have).length;
    this.trayLabel.setText(`EVIDENCE ${n}/${types.length}`);
    let x = this.trayX + 112;
    for (const t of types) {
      const count = run.cards.filter((id) => this.caseData.cards[id].type === t.type).length;
      const chip = txt(this, x, VIEW_H - 38, `${t.have ? '☑' : '☐'} ${t.type}${count > 1 ? ' ×' + count : ''}`, 13,
        t.have ? TYPE_COLORS[t.type] : COLORS.dim, { bold: true })
        .setBackgroundColor('#221f33').setPadding(6, 3, 6, 3);
      this.trayChips.push(chip);
      x += chip.width + 8;
    }
  }

  drawTrust(v) {
    this.trustBar.clear();
    this.trustBar.fillStyle(0x2a2733, 1).fillRect(VIEW_W - 208, 32, 190, 10);
    this.trustBar.fillStyle(v > 40 ? 0x8fe3b0 : 0xb98cff, 1).fillRect(VIEW_W - 208, 32, (190 * v) / 100, 10);
    this.trustLabel.setText(`DISTRICT TRUST  ${Math.round(v)}%`);
  }

  animateTrust(to) {
    const o = { v: this.trust };
    this.tweens.add({ targets: o, v: to, duration: 1800, ease: 'Sine.InOut', onUpdate: () => this.drawTrust(o.v) });
    this.trust = to;
  }

  // --- prompt / hold progress -------------------------------------------------------
  setPrompt(str) {
    this.prompt.setVisible(!!str && !this.busy);
    if (str) this.prompt.setText(str);
  }

  setProgress(p) {
    this.progress.clear();
    if (p <= 0) return;
    const x = VIEW_W / 2 - 60;
    const y = VIEW_H / 2 + 62;
    this.progress.fillStyle(0x2a2733, 1).fillRect(x, y, 120, 6);
    this.progress.fillStyle(0xe0b64a, 1).fillRect(x, y, 120 * Math.min(1, p), 6);
  }

  toast(str, color = COLORS.gold) {
    const y = 110 + this.toasts.length * 34;
    const t = txt(this, VIEW_W / 2, y, str, 15, color, { bold: true, align: 'center' })
      .setOrigin(0.5).setBackgroundColor('#141222').setPadding(10, 6, 10, 6).setAlpha(0).setDepth(40);
    this.toasts.push(t);
    this.tweens.add({ targets: t, alpha: 1, duration: 200 });
    this.time.delayedCall(2800, () => {
      this.tweens.add({
        targets: t, alpha: 0, duration: 400,
        onComplete: () => { t.destroy(); this.toasts = this.toasts.filter((x) => x !== t); },
      });
    });
  }

  // --- dialogue -----------------------------------------------------------------------
  // lines: [{ name, text }]. Resolves when the last line is dismissed.
  dialogue(lines) {
    this.busy = true;
    this.setPrompt(null);
    this.dlgQueue = lines.slice();
    this.dlg.setVisible(true);
    return new Promise((resolve) => {
      this.dlgResolve = resolve;
      this.showNextLine();
      // Ignore the key press that opened the dialogue.
      this.time.delayedCall(120, () => { this.dlgActive = true; });
    });
  }

  showNextLine() {
    const l = this.dlgQueue.shift();
    this.dlgName.setText(l.name || '');
    this.dlgText.setText(l.text);
  }

  advance() {
    if (this.dlgQueue.length) { this.showNextLine(); return; }
    this.dlgActive = false;
    this.dlg.setVisible(false);
    this.busy = false;
    this.closedAt = this.time.now;
    const r = this.dlgResolve;
    this.dlgResolve = null;
    if (r) r();
  }

  // --- route choice at the Key node --------------------------------------------------
  choice(promptText, options) {
    this.busy = true;
    this.setPrompt(null);
    const c = this.add.container(0, 0).setDepth(60);
    const h = 110 + options.length * 50;
    const y0 = VIEW_H / 2 - h / 2;
    c.add(panel(this, VIEW_W / 2 - 280, y0, 560, h));
    c.add(txt(this, VIEW_W / 2 - 260, y0 + 16, promptText, 15, COLORS.ink, { wrap: 520 }));
    return new Promise((resolve) => {
      const done = (id) => {
        c.destroy();
        this.input.keyboard.off('keydown', onKey);
        this.busy = false;
        this.closedAt = this.time.now;
        resolve(id);
      };
      options.forEach((o, i) => {
        const b = button(this, VIEW_W / 2, y0 + 96 + i * 50, `${i + 1}  ${o.label}`, () => done(o.id), { w: 460, h: 40 });
        c.add(b);
      });
      const onKey = (ev) => {
        const n = parseInt(ev.key, 10);
        if (n >= 1 && n <= options.length) done(options[n - 1].id);
      };
      this.time.delayedCall(120, () => this.input.keyboard.on('keydown', onKey));
    });
  }

  // --- end of case --------------------------------------------------------------------
  showSummary(onReplay) {
    this.busy = true;
    const m = run.metrics;
    const secs = Math.round((m.finishedAt - m.startedAt) / 1000);
    const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const cs = m.containment || { protectedPct: 0, reflected: 0, blocked: 0, passed: 0 };
    const lines = [
      `Time to close the case: ${mmss}`,
      `Evidence quality: ${evidenceQuality()} / 100`,
      `Unsupported links tried: ${m.unrelatedLinks}`,
      `Wrong routes tried: ${m.wrongRoutes}`,
      `Shield: reflected ${cs.reflected}, blocked ${cs.blocked}, got past ${cs.passed} (citizens lost ${cs.delaySeconds || 0}s)`,
      `Report, first attempt: ${m.reportFirstPct}% placed as evidence supports`,
      `Hints used: ${m.hints}`,
      `Your chosen next step: ${m.nextStep || '-'}`,
    ];
    const c = this.add.container(0, 0).setDepth(70);
    c.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x07060c, 0.72).setOrigin(0));
    c.add(panel(this, 130, 60, 700, 420));
    c.add(txt(this, 160, 80, 'CASE 01 CLOSED', 22, COLORS.gold, { bold: true }));
    c.add(txt(this, 160, 112, 'The market is open again. A Case File was added to the Casebook.', 15, COLORS.ink, { wrap: 640 }));
    c.add(txt(this, 160, 150, lines.join('\n'), 15, COLORS.ink, { wrap: 640, lineSpacing: 6 }));
    c.add(txt(this, 160, 350, this.caseData.report.disclaimer, 13, COLORS.dim, { wrap: 640 }));
    c.add(txt(this, 160, 388, 'Phase 1 gray-box prototype. Fictional case. Local only.', 13, COLORS.dim));
    c.add(button(this, 480, 440, 'Play again', onReplay, { w: 220, h: 40 }));
  }
}
