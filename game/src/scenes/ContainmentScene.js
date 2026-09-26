// Short shield containment event. Spoof signals rise out of East Alley along two
// lanes while citizens walk to shelter. The Shield blocks; raised just before
// impact it reflects. There is no attack and nothing can be destroyed or killed:
// a signal that gets past only delays the citizens.

import { VIEW_W, VIEW_H, COLORS } from '../config.js';
import { txt, panel, button } from '../ui/widgets.js';
import { Guard } from '../entities/guard.js';
import { run } from '../state.js';
import { resolveImpact, containmentSummary } from '../logic/containment.js';

const LANES = [380, 580];
const GUARD_Y = 380;
const IMPACT_Y = GUARD_Y - 30;
const SPAWN_Y = VIEW_H + 20;
const SIGNAL_SPEED = 160; // px/s
const TELEGRAPH_S = 0.9;
const SHELTER = { x: 480, y: 92 };
const CIV_SPEED = 46;
const DELAY_MS = 1500;
const SCALE = 3;

export class ContainmentScene extends Phaser.Scene {
  constructor() { super('Containment'); }

  create() {
    this.caseData = this.cache.json.get('case01');
    this.cfg = this.caseData.containment;
    this.cameras.main.setBackgroundColor('#15121c').fadeIn(250);
    this.started = false;
    this.ended = false;
    this.left = false;
    this.results = [];
    this.signals = [];
    this.spawnIdx = 0;
    this.t = 0;
    this.delayUntil = 0;
    this.lane = 0;
    this.shieldUp = false;
    this.raisedAt = -9999;

    this.drawStreet();

    // Citizens heading for shelter, staggered.
    const ids = ['c1', 'c2', 'c3', 'oren', 'juno', 'sela'];
    const starts = [[250, 250], [720, 240], [300, 190], [660, 200], [220, 150], [740, 160]];
    this.civs = ids.slice(0, this.cfg.civilians).map((id, i) => ({
      s: this.add.image(starts[i][0], starts[i][1], `citizen-${id}`).setScale(2.5).setOrigin(0.5, 1).setDepth(starts[i][1]),
      startAt: i * 2.6,
      done: false,
    }));
    this.sheltered = 0;

    this.guard = new Guard(this, LANES[0], GUARD_Y, { physics: false, scale: SCALE, facing: 'down' });

    // HUD strip
    panel(this, 0, 0, VIEW_W, 44, { alpha: 0.96 });
    txt(this, 14, 12, 'CONTAINMENT: SPOOF SWARM', 16, COLORS.gold, { bold: true });
    this.stat = txt(this, 330, 13, '', 14, COLORS.ink);
    txt(this, VIEW_W - 12, 52, '←/→ or A/D: change lane · Hold SPACE: raise Shield · Mouse: press and hold on a lane', 12, COLORS.dim).setOrigin(1, 0);
    this.popups = [];
    this.updateStat();

    const kb = this.input.keyboard;
    kb.on('keydown', (ev) => {
      if (!this.started || this.ended) return;
      if (ev.code === 'KeyA' || ev.code === 'ArrowLeft') this.setLane(0);
      if (ev.code === 'KeyD' || ev.code === 'ArrowRight') this.setLane(1);
      if (ev.code === 'Space' && !ev.repeat) this.raise(true);
    });
    kb.on('keyup', (ev) => { if (ev.code === 'Space') this.raise(false); });
    kb.addCapture('SPACE,LEFT,RIGHT');
    this.input.on('pointerdown', (p) => {
      if (!this.started || this.ended) return;
      this.setLane(p.x < VIEW_W / 2 ? 0 : 1);
      this.raise(true);
    });
    this.input.on('pointerup', () => this.raise(false));

    this.showIntro();
  }

  drawStreet() {
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0x2a2632, 1).fillRect(0, 0, VIEW_W, VIEW_H);
    // shelter building
    g.fillStyle(0x3b3542, 1).fillRect(300, 40, 360, 60);
    g.fillStyle(0x15131d, 1).fillRect(450, 56, 60, 44);
    g.fillStyle(0xffd27a, 0.8).fillRect(456, 62, 48, 38);
    txt(this, 480, 50, 'SHELTER', 12, COLORS.dim, { bold: true }).setOrigin(0.5, 0).setDepth(-9);
    // lanes out of East Alley
    for (const x of LANES) {
      g.fillStyle(0x3a3646, 1).fillRect(x - 60, 150, 120, VIEW_H - 150);
      g.lineStyle(2, 0x4d4760, 1).strokeRect(x - 60, 150, 120, VIEW_H - 150);
    }
    g.fillStyle(0x0c0b10, 1).fillRect(300, VIEW_H - 24, 360, 24);
    txt(this, 480, VIEW_H - 22, 'from East Alley', 12, '#b06bff').setOrigin(0.5, 0).setDepth(-9);
    this.teleG = this.add.graphics().setDepth(-5);
  }

  showIntro() {
    const c = this.add.container(0, 0).setDepth(100);
    c.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x07060c, 0.7).setOrigin(0));
    c.add(panel(this, 170, 130, 620, 260));
    c.add(txt(this, 196, 150, 'SHIELD CONTAINMENT', 18, COLORS.gold, { bold: true }));
    c.add(txt(this, 196, 186, this.cfg.intro, 15, COLORS.ink, { wrap: 570 }));
    c.add(txt(this, 196, 270, '←/→ or A/D: move between the two lanes\nHold SPACE: raise the Nebular Shield', 14, COLORS.violet));
    const go = () => {
      if (this.started) return;
      this.started = true;
      c.destroy();
    };
    c.add(button(this, 480, 350, 'Begin  (Enter)', go, { w: 220, h: 40 }));
    this.input.keyboard.once('keydown-ENTER', go);
  }

  setLane(i) {
    if (i === this.lane) return;
    this.lane = i;
    this.tweens.add({
      targets: this.guard.body, x: LANES[i], duration: 110,
      onUpdate: () => this.guard.sync(),
    });
    this.guard.shadow.setX(LANES[i]);
  }

  raise(up) {
    if (up && !this.shieldUp) this.raisedAt = this.time.now;
    this.shieldUp = up;
    this.guard.shieldRaised = up;
    this.guard.sync();
  }

  popup(x, y, str, color) {
    const t = txt(this, x, y, str, 14, color, { bold: true }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  updateStat() {
    const s = containmentSummary(this.results);
    this.stat.setText(`Sheltered ${this.sheltered}/${this.civs.length}    Reflected ${s.reflected}   Blocked ${s.blocked}   Got past ${s.passed}`);
  }

  update(time, dt) {
    if (!this.started || this.ended) return;
    this.t += dt / 1000;
    const pattern = this.cfg.pattern;

    // Telegraph the next signals' lanes.
    this.teleG.clear();
    for (let i = this.spawnIdx; i < pattern.length; i++) {
      const [at, lane] = pattern[i];
      if (at - this.t > TELEGRAPH_S) break;
      this.teleG.fillStyle(0xb06bff, 0.35 + 0.25 * Math.sin(time / 60)).fillRect(LANES[lane] - 58, VIEW_H - 70, 116, 46);
    }
    // Spawn
    while (this.spawnIdx < pattern.length && pattern[this.spawnIdx][0] <= this.t) {
      const lane = pattern[this.spawnIdx][1];
      const s = this.add.image(LANES[lane], SPAWN_Y, 'signal').setScale(SCALE).setDepth(400);
      this.signals.push({ s, lane, state: 'rising' });
      this.spawnIdx += 1;
    }
    // Move signals and resolve impacts.
    const step = (SIGNAL_SPEED * dt) / 1000;
    for (const sig of this.signals) {
      if (sig.state === 'rising') {
        sig.s.y -= step;
        sig.s.setAngle(sig.s.angle + dt * 0.2); // the signal spins; the Key never does
        if (sig.s.y <= IMPACT_Y) this.impact(sig, time);
      } else if (sig.state === 'reflected') {
        sig.s.y += step * 2.2;
        if (sig.s.y > VIEW_H + 30) sig.state = 'gone';
      } else if (sig.state === 'passing') {
        sig.s.y -= step;
        if (sig.s.y < 160) { sig.state = 'gone'; this.tweens.add({ targets: sig.s, alpha: 0, duration: 200 }); }
      }
    }
    this.signals = this.signals.filter((x) => x.state !== 'gone' || (x.s.destroy(), false));

    // Citizens walk to shelter unless delayed.
    const delayed = time < this.delayUntil;
    for (const c of this.civs) {
      if (c.done || this.t < c.startAt || delayed) continue;
      const dx = SHELTER.x - c.s.x;
      const dy = SHELTER.y + 8 - c.s.y;
      const d = Math.hypot(dx, dy);
      const mv = (CIV_SPEED * dt) / 1000;
      if (d <= mv) {
        c.done = true;
        this.sheltered += 1;
        this.tweens.add({ targets: c.s, alpha: 0, duration: 250 });
        this.updateStat();
      } else {
        c.s.x += (dx / d) * mv;
        c.s.y += (dy / d) * mv;
        c.s.setDepth(c.s.y);
      }
    }

    if (this.spawnIdx >= pattern.length && this.signals.length === 0 && this.sheltered === this.civs.length) {
      this.finish();
    }
  }

  impact(sig, time) {
    const r = resolveImpact({
      signalLane: sig.lane,
      guardLane: this.lane,
      shieldUp: this.shieldUp,
      msSinceRaise: time - this.raisedAt,
    });
    this.results.push(r);
    const x = LANES[sig.lane];
    if (r === 'reflected') {
      sig.state = 'reflected';
      sig.s.setTint(0xffe08a);
      this.popup(x, IMPACT_Y - 20, 'REFLECTED', COLORS.gold);
    } else if (r === 'blocked') {
      sig.state = 'gone';
      this.popup(x, IMPACT_Y - 20, 'BLOCKED', COLORS.good);
      const burst = this.add.image(x, IMPACT_Y, 'glow-violet').setScale(2).setDepth(401);
      this.tweens.add({ targets: burst, alpha: 0, scale: 3, duration: 300, onComplete: () => burst.destroy() });
    } else {
      sig.state = 'passing';
      this.delayUntil = time + DELAY_MS;
      this.popup(x, IMPACT_Y - 60, 'Citizens delayed', COLORS.warn);
    }
    this.updateStat();
  }

  finish() {
    this.ended = true;
    this.raise(false);
    const s = containmentSummary(this.results);
    run.metrics.containment = s;
    run.phase = 'authorize';
    const c = this.add.container(0, 0).setDepth(100);
    c.add(this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x07060c, 0.65).setOrigin(0));
    c.add(panel(this, 220, 150, 520, 230));
    c.add(txt(this, 246, 170, 'SWARM CONTAINED', 18, COLORS.gold, { bold: true }));
    c.add(txt(this, 246, 206,
      `All ${this.civs.length} citizens reached shelter.\n` +
      `Reflected ${s.reflected}  ·  Blocked ${s.blocked}  ·  Got past ${s.passed}\n\n` +
      'The relay in East Alley is still transmitting. Authorize the verified route.',
      15, COLORS.ink, { wrap: 470 }));
    const go = () => { if (this.left) return; this.left = true; this.scene.start('Market'); };
    c.add(button(this, 480, 345, 'Back to the market  (Enter)', go, { w: 300, h: 40 }));
    this.input.keyboard.once('keydown-ENTER', go);
  }
}
