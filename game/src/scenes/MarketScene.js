// The market: exploration, NPCs, clues, the Key authorization node, the relay,
// and (phase 'restored') the visibly restored district.

import { WORLD_W, WORLD_H, ZOOM, SOLIDS, GATES, NODE, RELAY, LAMPS, TRAIL, COLORS } from '../config.js';
import { Guard } from '../entities/guard.js';
import { run, addCard, resetRun } from '../state.js';
import { supportedRoute } from '../logic/board.js';
import { tapTracker } from '../ui/taps.js';

const INTERACT_RANGE = 20;
const INSPECT_HOLD_MS = 700;

export class MarketScene extends Phaser.Scene {
  constructor() { super('Market'); }

  create() {
    this.caseData = this.cache.json.get('case01');
    const restored = run.phase === 'restored' || run.phase === 'done';
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    this.bg = this.add.image(0, 0, restored ? 'market-restored' : 'market-dim').setOrigin(0).setDepth(-1000);

    // Solids
    this.solids = this.physics.add.staticGroup();
    for (const [x, y, w, h] of SOLIDS) this.addSolid(x, y, w, h);

    // Gates. East opens once the Key authorizes it and stays open as the shortcut.
    this.gates = {};
    for (const [id, g] of Object.entries(GATES)) {
      const img = this.add.image(g.x, g.y, `gate-${id}`).setOrigin(0).setDepth(g.y + g.h);
      const open = id === 'east' && ['relay', 'report', 'restored', 'done'].includes(run.phase);
      const solid = id === 'north' ? null : this.addSolid(g.x, g.y, g.w, g.h);
      this.gates[id] = { img, solid };
      if (open) this.openGate('east', true);
    }

    // Props
    this.terminal = this.add.image(360, 86, restored ? 'terminal-ok' : 'terminal-glitch').setOrigin(0).setDepth(116);
    this.add.image(100, 30, 'records').setOrigin(0).setDepth(54);
    this.relay = this.add.image(RELAY.x, RELAY.y, restored || run.phase === 'report' ? 'relay-off' : 'relay-on')
      .setOrigin(0.5, 1).setDepth(RELAY.y);
    this.addSolid(RELAY.x - 7, RELAY.y - 6, 14, 6);

    this.trail = [];
    if (!restored) {
      for (const [x, y] of TRAIL) this.trail.push(this.add.image(x, y, 'trail-dot').setDepth(1));
      this.tweens.add({ targets: this.trail, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: this.terminal, alpha: 0.75, duration: 90, yoyo: true, repeat: -1, repeatDelay: 1400 });
    }

    this.node = this.add.image(NODE.x, NODE.y, 'node').setOrigin(0.5, 1).setDepth(NODE.y)
      .setVisible(run.phase === 'authorize');
    if (run.phase === 'authorize') {
      this.nodeGlow = this.add.image(NODE.x, NODE.y - 7, 'glow').setScale(1.2).setDepth(NODE.y - 1);
      this.tweens.add({ targets: this.nodeGlow, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
      this.nodeSolid = this.addSolid(NODE.x - 6, NODE.y - 5, 12, 5);
    }

    // Lamps light up in the restored market.
    this.lampGlows = LAMPS.map(([x, y]) => this.add.image(x, y - 11, 'glow').setScale(1.4)
      .setDepth(2000).setBlendMode(Phaser.BlendModes.ADD).setAlpha(restored ? 0.8 : 0));

    // NPCs
    this.npcs = this.caseData.npcs.map((n) => {
      const s = this.add.image(n.x, n.y, `citizen-${n.palette}`).setOrigin(0.5, 1).setDepth(n.y);
      this.add.image(n.x, n.y, 'shadow').setDepth(n.y - 2);
      this.addSolid(n.x - 5, n.y - 4, 10, 4);
      const mark = this.add.image(n.x, n.y - 20, 'mark-talk').setDepth(3000)
        .setVisible(!restored && !run.talked.has(n.id));
      this.tweens.add({ targets: mark, y: n.y - 23, duration: 500, yoyo: true, repeat: -1 });
      return { ...n, sprite: s, mark };
    });

    // Clue markers
    this.clueMarks = {};
    for (const c of this.caseData.clues) {
      const m = this.add.image(c.x, c.y - 22, 'mark-clue').setDepth(3000)
        .setVisible(run.phase === 'investigate' && !run.clues.has(c.id));
      this.tweens.add({ targets: m, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
      this.clueMarks[c.id] = m;
    }

    // Mini GUARD
    const p = run.guardPos;
    this.guard = new Guard(this, p.x, p.y, { facing: p.facing });
    this.physics.add.collider(this.guard.body, this.solids);

    const cam = this.cameras.main;
    cam.setZoom(ZOOM).setBounds(0, 0, WORLD_W, WORLD_H).startFollow(this.guard.body, true, 0.15, 0.15);
    cam.setRoundPixels(true);
    cam.setBackgroundColor('#0b0a12');
    cam.fadeIn(350);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE');
    this.taps = tapTracker(this);
    this.holdMs = 0;

    // HUD
    this.hud = this.scene.get('HUD');
    if (!this.scene.isActive('HUD')) {
      this.hud.ready = false;
      this.scene.launch('HUD');
    }
    this.scene.bringToTop('HUD');
    // The HUD runs create() on the next step; wait for it.
    if (this.hud.ready) this.enterPhase();
    else this.hud.events.once('create', () => this.enterPhase());
  }

  addSolid(x, y, w, h) {
    const z = this.add.zone(x + w / 2, y + h / 2, w, h);
    this.physics.add.existing(z, true);
    this.solids.add(z);
    return z;
  }

  openGate(id, instant = false) {
    const g = this.gates[id];
    if (g.solid) { g.solid.destroy(); g.solid = null; }
    if (instant) g.img.setAlpha(0.15);
    else this.tweens.add({ targets: g.img, alpha: 0.15, y: g.img.y - 6, duration: 700 });
  }

  // --- phases ------------------------------------------------------------------------
  enterPhase() {
    this.hud.refreshTray();
    if (run.phase === 'investigate' && !run.introShown) {
      run.introShown = true;
      this.hud.dialogue(this.caseData.intro);
    }
    if (run.phase === 'authorize') {
      this.hud.toast('The swarm is contained. The relay is still transmitting.');
    }
    if (run.phase === 'restored') this.playRestore();
    this.refreshObjectives();
  }

  refreshObjectives() {
    const o = {
      investigate: [
        `Talk to market citizens (${run.talked.size}/3)`,
        this.hud.touch ? `Inspect clues: tap the gold sparkles (${run.clues.size}/3)` : `Inspect clues, hold E (${run.clues.size}/3)`,
      ],
      board: [this.hud.touch ? 'Evidence gathered. Tap BOARD to open the Evidence Board.' : 'Evidence gathered. Press B to open the Evidence Board.'],
      authorize: ['Go to the gold authorization node and use the Proton Key.'],
      relay: [this.hud.touch ? 'Follow the trail into East Alley and tap the relay.' : 'Follow the trail into East Alley and inspect the relay (hold E).'],
      restored: ['Walk the restored market and talk to people.', this.hud.touch ? 'Tap FINISH to close the case.' : 'Press Enter to close the case.'],
      done: ['Case closed.'],
    }[run.phase] || [];
    this.hud.setObjectives(o);
    if (this.hud.pad) this.hud.pad.setContext({ board: 'BOARD', restored: 'FINISH' }[run.phase] || null);
  }

  checkGathered() {
    if (run.phase === 'investigate' && run.talked.size >= 3 && run.clues.size >= 3) {
      run.phase = 'board';
      this.hud.toast(this.hud.touch ? 'All evidence gathered. Tap BOARD.' : 'All evidence gathered. Press B for the Evidence Board.', COLORS.violet);
    }
    this.refreshObjectives();
  }

  playRestore() {
    const r = this.caseData.restore;
    // Fade the compromised market away to reveal the restored one.
    const dim = this.add.image(0, 0, 'market-dim').setOrigin(0).setDepth(-999);
    const term = this.add.image(360, 86, 'terminal-glitch').setOrigin(0).setDepth(117);
    this.lampGlows.forEach((l) => l.setAlpha(0));
    this.guard.frozen = true;
    this.tweens.add({ targets: [dim, term], alpha: 0, duration: 2600, delay: 400, onComplete: () => { dim.destroy(); term.destroy(); } });
    this.tweens.add({ targets: this.lampGlows, alpha: 0.8, duration: 1200, delay: 1600 });
    this.time.delayedCall(1200, () => this.hud.toast(r.toast));
    this.time.delayedCall(2200, () => this.hud.toast(r.shortcut, COLORS.good));
    this.time.delayedCall(1400, () => this.hud.animateTrust(r.trustAfter));
    this.time.delayedCall(3000, () => { this.guard.frozen = false; });
  }

  // --- interactables -------------------------------------------------------------------
  interactables() {
    const list = [];
    const inv = run.phase === 'investigate' || run.phase === 'board';
    for (const n of this.npcs) list.push({ kind: 'npc', id: n.id, x: n.x, y: n.y, label: this.hud.actLabel(`Talk to ${n.name}`), ref: n });
    if (inv) {
      for (const c of this.caseData.clues) {
        if (!run.clues.has(c.id)) list.push({ kind: 'clue', id: c.id, x: c.x, y: c.y, label: this.hud.actLabel(`Inspect ${c.name}`, true), ref: c });
      }
    }
    if (run.phase === 'authorize') list.push({ kind: 'node', id: 'node', x: NODE.x, y: NODE.y + 4, label: this.hud.actLabel('Use the Proton Key') });
    if (run.phase === 'relay') list.push({ kind: 'relay', id: 'relay', x: RELAY.inspectX, y: RELAY.inspectY, label: this.hud.actLabel('Inspect the relay', true) });
    return list;
  }

  nearest() {
    let best = null;
    let bestD = INTERACT_RANGE;
    for (const it of this.interactables()) {
      const d = Phaser.Math.Distance.Between(this.guard.x, this.guard.y, it.x, it.y);
      if (d < bestD) { bestD = d; best = it; }
    }
    return best;
  }

  // A quick tap on the screen (HUD coords == screen coords).
  onWorldTap(sx, sy) {
    const wp = this.cameras.main.getWorldPoint(sx, sy);
    let best = null;
    let bestD = 16;
    for (const it of this.interactables()) {
      // People and props stand above their feet point; aim at their middle.
      const d = Phaser.Math.Distance.Between(wp.x, wp.y, it.x, it.y - 8);
      if (d < bestD) { bestD = d; best = it; }
    }
    this.auto = best ? { x: best.x, y: best.y, it: best } : { x: wp.x, y: wp.y };
    this.autoLast = { x: this.guard.x, y: this.guard.y, t: this.time.now };
  }

  // Direction for auto-walk this frame, or null. Gives up if blocked.
  stepAuto(time) {
    const a = this.auto;
    if (!a) return null;
    const dx = a.x - this.guard.x;
    const dy = a.y - this.guard.y;
    const d = Math.hypot(dx, dy);
    const near = a.it ? INTERACT_RANGE - 6 : 3;
    if (d <= near) { if (!a.it) this.auto = null; return null; }
    if (time - this.autoLast.t > 450) {
      const moved = Phaser.Math.Distance.Between(this.guard.x, this.guard.y, this.autoLast.x, this.autoLast.y);
      if (moved < 2) { this.auto = null; return null; }
      this.autoLast = { x: this.guard.x, y: this.guard.y, t: time };
    }
    return { x: dx / d, y: dy / d };
  }

  async interact(it) {
    const hud = this.hud;
    if (it.kind === 'npc') {
      const n = it.ref;
      const restored = run.phase === 'restored' || run.phase === 'done';
      const lines = (restored ? n.restoredLines : n.lines).map((text) => ({ name: n.name, text }));
      await hud.dialogue(lines);
      if (!restored && !run.talked.has(n.id)) {
        run.talked.add(n.id);
        n.mark.setVisible(false);
        if (n.gives) {
          addCard(n.gives);
          hud.refreshTray();
          const card = this.caseData.cards[n.gives];
          hud.toast(`Evidence added: ${card.title} (${card.type})`);
        }
        this.checkGathered();
      }
    } else if (it.kind === 'clue') {
      const c = it.ref;
      await hud.dialogue(c.inspectLines.map((text) => ({ name: c.name, text })));
      run.clues.add(c.id);
      this.clueMarks[c.id].setVisible(false);
      addCard(c.gives);
      hud.refreshTray();
      const card = this.caseData.cards[c.gives];
      hud.toast(`Evidence added: ${card.title} (${card.type})`);
      this.checkGathered();
    } else if (it.kind === 'node') {
      await this.authorize();
    } else if (it.kind === 'relay') {
      await hud.dialogue(this.caseData.relay.inspectLines.map((text) => ({ name: this.caseData.relay.name, text })));
      this.relay.setTexture('relay-off');
      this.tweens.add({ targets: this.trail, alpha: 0, duration: 800 });
      run.phase = 'report';
      this.guard.frozen = true;
      this.time.delayedCall(900, () => this.goTo('ClarityReport'));
    }
  }

  async authorize() {
    const a = this.caseData.authorize;
    const routes = this.caseData.routes.map((r) => ({ id: r.id, label: r.name }));
    const pick = await this.hud.choice(a.prompt, routes);
    const supported = supportedRoute(run.board);
    if (pick !== supported) {
      // The Key does not activate. It stays compact at the hip.
      run.metrics.wrongRoutes += 1;
      await this.hud.dialogue([{ name: 'Proton Key', text: a.withheld }]);
      return;
    }
    await this.guard.activateKey(() => {
      this.openGate('east');
      if (this.nodeGlow) this.nodeGlow.destroy();
      if (this.nodeSolid) { this.nodeSolid.destroy(); this.nodeSolid = null; }
    });
    run.phase = 'relay';
    this.hud.toast(a.granted, COLORS.good);
    this.refreshObjectives();
  }

  goTo(sceneKey) {
    run.guardPos = { x: this.guard.x, y: this.guard.y, facing: this.guard.facing };
    this.hud.setPrompt(null);
    this.hud.setProgress(0);
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('HUD');
      this.scene.start(sceneKey);
    });
  }

  hint() {
    run.metrics.hints += 1;
    const t = {
      investigate: run.talked.size < 3
        ? (this.hud.touch ? 'People with a speech bubble have something to tell you. Tap them.' : 'Citizens with a speech bubble have something to tell you. Walk up and press E.')
        : (this.hud.touch ? 'Gold sparkles mark clues. Tap one and Mini GUARD will go and inspect it.' : 'Gold markers show clues. Stand next to one and hold E until the bar fills.'),
      board: this.hud.touch ? 'Tap BOARD to lay out your evidence.' : 'Press B to lay out your evidence and reason it through.',
      authorize: 'The gold pedestal is east of the fountain. Pick the route your linked evidence points to.',
      relay: 'The violet dots lead through the open East Alley gate. The relay is at the end.',
      restored: this.hud.touch ? 'Everything is back to normal. Tap FINISH when you are done.' : 'Everything is back to normal. Press Enter when you are done looking around.',
    }[run.phase];
    if (t) this.hud.dialogue([{ name: 'Hint', text: t }]);
  }

  update(time, dt) {
    const k = this.keys;
    const hud = this.hud;
    if (!hud || !hud.ready) return;
    const locked = hud.busy || this.guard.frozen || time - hud.closedAt < 150;
    const pad = hud.pad ? hud.pad.pad : {};
    const take = (name) => !!hud.pad && hud.pad.take(name);

    const keysMove = k.A.isDown || k.LEFT.isDown || k.D.isDown || k.RIGHT.isDown
      || k.W.isDown || k.UP.isDown || k.S.isDown || k.DOWN.isDown;
    if (!locked && hud.pad) {
      const t = hud.pad.takeTap();
      if (t) this.onWorldTap(t.x, t.y);
    }
    if (keysMove || pad.vx || pad.vy) { this.auto = null; this.autoHold = false; }
    const autoVec = locked ? null : this.stepAuto(time);

    this.guard.updateMovement(locked ? {} : {
      left: k.A.isDown || k.LEFT.isDown,
      right: k.D.isDown || k.RIGHT.isDown,
      up: k.W.isDown || k.UP.isDown,
      down: k.S.isDown || k.DOWN.isDown,
      vx: pad.vx || (autoVec ? autoVec.x : 0),
      vy: pad.vy || (autoVec ? autoVec.y : 0),
    }, dt);
    if (locked) {
      hud.setPrompt(null); hud.setProgress(0); this.holdMs = 0; this.taps.clear();
      this.autoHold = false;
      if (hud.pad) { hud.pad.clear(); hud.pad.tapPrompt = false; }
      return;
    }

    if (this.taps.take('KeyH') || take('hint')) { this.hint(); return; }
    const ctx = take('ctx');
    if (run.phase === 'board' && (this.taps.take('KeyB') || ctx)) { this.goTo('EvidenceBoard'); return; }
    if (run.phase === 'restored' && (this.taps.take('Enter') || ctx)) {
      run.phase = 'done';
      run.metrics.finishedAt = Date.now();
      this.refreshObjectives();
      hud.showSummary(() => { resetRun(); this.scene.stop('HUD'); this.scene.start('Boot'); });
      return;
    }

    let tapped = this.taps.take('KeyE', 'Space');
    if (hud.pad && hud.pad.tapPrompt) { hud.pad.tapPrompt = false; tapped = true; }
    const it = this.nearest();
    hud.setPrompt(it ? it.label : null);
    // Arrived at a tapped object: use it.
    if (it && this.auto && this.auto.it && this.auto.it.id === it.id) {
      this.auto = null;
      tapped = true;
    }
    const needsHoldNow = it && (it.kind === 'clue' || it.kind === 'relay');
    if (tapped && needsHoldNow) this.autoHold = true;
    const interactDown = k.E.isDown || k.SPACE.isDown || this.autoHold;
    if (!it) { this.holdMs = 0; this.autoHold = false; hud.setProgress(0); return; }

    const needsHold = it.kind === 'clue' || it.kind === 'relay';
    if (needsHold) {
      this.holdMs = interactDown ? this.holdMs + dt : 0;
      hud.setProgress(this.holdMs / INSPECT_HOLD_MS);
      if (this.holdMs >= INSPECT_HOLD_MS) {
        this.holdMs = 0;
        this.autoHold = false;
        hud.setProgress(0);
        this.interact(it);
      }
    } else if (tapped) {
      this.interact(it);
    }
  }
}
