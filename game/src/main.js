// GUARD.IAN: SIGNALBREAK, Phase 1 gray-box prototype.
// Local, fictional, off-chain: no wallet, no chain calls, no network requests
// beyond loading this page's own files.

import { VIEW_W, VIEW_H } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { MarketScene } from './scenes/MarketScene.js';
import { HudScene } from './scenes/HudScene.js';
import { EvidenceBoardScene } from './scenes/EvidenceBoardScene.js';
import { ContainmentScene } from './scenes/ContainmentScene.js';
import { ClarityReportScene } from './scenes/ClarityReportScene.js';
import { run } from './state.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0b0a12',
  pixelArt: true,
  roundPixels: true,
  physics: { default: 'arcade', arcade: { debug: false } },
  input: { activePointers: 3 },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // Phaser's built-in placeholder textures are data: URIs, which the site's
  // Content-Security-Policy (img-src 'self') blocks. Serve the same images as files.
  // (A single-file build sets SIGNALBREAK_EMBED and keeps Phaser's defaults.)
  images: window.SIGNALBREAK_EMBED ? undefined : {
    default: new URL('../assets/phaser-default.png', import.meta.url).href,
    missing: new URL('../assets/phaser-missing.png', import.meta.url).href,
    white: new URL('../assets/phaser-white.png', import.meta.url).href,
  },
  banner: false,
  scene: [BootScene, MarketScene, HudScene, EvidenceBoardScene, ContainmentScene, ClarityReportScene],
});

// Test hook for the automated playthrough only (add ?test=1 to the URL).
if (new URLSearchParams(window.location.search).has('test')) {
  window.__signalbreak = { game, run };
}
