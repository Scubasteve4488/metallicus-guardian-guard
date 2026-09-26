// Records one complete playthrough on an emulated phone held sideways.
// Mini GUARD walks everywhere by real taps (no teleports). The Shield event
// is driven by a small bot that picks the lane and raises the Shield.
//   node tests/e2e/record.mjs <outDir>
import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright'));
}
const REPO = resolve(new URL('../../..', import.meta.url).pathname);
const OUT = resolve(process.argv[2] || '.');
mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  let f = join(REPO, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!f.startsWith(REPO) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const W = 844;
const H = 390;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, recordVideo: { dir: OUT, size: { width: W, height: H } } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => page.waitForTimeout(ms);
const G = (fn, arg) => page.evaluate(fn, arg);
async function waitFor(fn, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await G(fn)) return; await sleep(60); }
  throw new Error(`timeout: ${label}`);
}
let box;
const pt = (x, y) => ({ x: box.x + (x * box.width) / 960, y: box.y + (y * box.height) / 540 });
async function tap(x, y) {
  const p = pt(x, y);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] });
  await sleep(70);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(150);
}
const busy = () => G(() => window.__signalbreak.game.scene.getScene('HUD').busy);
async function readDialogue(msPerLine = 1500) {
  await sleep(300);
  for (let i = 0; i < 12 && await busy(); i++) { await sleep(msPerLine); await tap(480, 250); }
}
const guardAt = () => G(() => { const g = window.__signalbreak.game.scene.getScene('Market').guard; return [g.x, g.y]; });
async function worldTap(wx, wy) {
  const s = await G(([x, y]) => {
    const c = window.__signalbreak.game.scene.getScene('Market').cameras.main;
    return [(x - c.worldView.x) * c.zoom, (y - c.worldView.y) * c.zoom];
  }, [wx, wy]);
  await tap(s[0], s[1]);
}
async function settle() {
  await waitFor(() => { const m = window.__signalbreak.game.scene.getScene('Market'); return !m.auto && !m.guard.moving; }, 15000, 'walk');
  await sleep(150);
}
// Walk to a world point in on-screen hops.
async function walkTo(wx, wy) {
  for (let i = 0; i < 8; i++) {
    const [gx, gy] = await guardAt();
    const dx = wx - gx;
    const dy = wy - gy;
    if (Math.hypot(dx, dy) < 6) return;
    const k = Math.min(1, 130 / Math.abs(dx || 1), 70 / Math.abs(dy || 1));
    await worldTap(gx + dx * k, gy + dy * k);
    await settle();
  }
}
// Tap an object (its feet point), then read what it says.
async function use(wx, wy) {
  await worldTap(wx, wy - 8);
  await waitFor(() => window.__signalbreak.game.scene.getScene('HUD').busy, 15000, 'interaction');
  await readDialogue();
}

try {
  await page.goto(`${base}/game/?test=1`);
  await waitFor(() => window.__signalbreak && window.__signalbreak.game.scene.isActive('Boot'), 20000, 'boot');
  await G(() => document.getElementById('game-root').scrollIntoView({ block: 'center' }));
  await sleep(400);
  box = await page.locator('canvas').boundingBox();
  await sleep(2500); // title card
  await tap(480, 480);
  await waitFor(() => window.__signalbreak.game.scene.isActive('Market') && window.__signalbreak.game.scene.getScene('HUD').ready, 5000, 'market');
  await readDialogue(2200);

  // Gather: 3 citizens, 3 clues
  await walkTo(110, 150);
  await use(70, 112);             // Oren
  await use(224, 206);            // Juno
  await walkTo(290, 190);
  await use(330, 148);            // Sela
  await use(372, 118);            // Market Terminal (auto-inspect)
  await walkTo(240, 100);
  await use(118, 58);             // Records Board
  await walkTo(240, 100);
  await walkTo(345, 185);
  await use(452, 142);            // Signal Trail
  await sleep(1500);

  // Evidence Board
  await tap(960 - 70, 440);
  await waitFor(() => window.__signalbreak.game.scene.isActive('EvidenceBoard'), 4000, 'board');
  await sleep(1500);
  await tap(385, 140); await sleep(400); await tap(130, 395); await sleep(1800); // wrong link -> kept as UNCERTAIN
  await tap(130, 165); await sleep(400); await tap(385, 140); await sleep(1800); // contradiction
  await tap(130, 395); await sleep(400); await tap(385, 405); await sleep(1800); // witness + trail
  await tap(595 + 107 - 40, 275 + 66 - 14); await sleep(2500);                   // rumor: Uncertain
  await sleep(2500);
  await tap(480, 380);

  // Shield containment
  await waitFor(() => window.__signalbreak.game.scene.isActive('Containment'), 4000, 'containment');
  await sleep(2500);
  await tap(480, 350);
  await G(() => {
    const s = window.__signalbreak.game.scene.getScene('Containment');
    s.events.on('update', () => {
      const next = s.signals.filter((x) => x.state === 'rising').sort((p, q) => p.s.y - q.s.y)[0];
      if (!next) { s.raise(false); return; }
      s.setLane(next.lane);
      const d = next.s.y - 350;
      if (d < 30 && !s.shieldUp) s.raise(true);
      if (d > 60 && s.shieldUp) s.raise(false);
    });
  });
  await waitFor(() => window.__signalbreak.run.phase === 'authorize', 90000, 'containment end');
  await sleep(3000);
  await tap(480, 345);
  await waitFor(() => window.__signalbreak.game.scene.isActive('Market') && window.__signalbreak.game.scene.getScene('HUD').ready, 5000, 'market');
  await sleep(1500);

  // Key authorization: wrong route first, then the supported one
  await worldTap(420, 190);
  await waitFor(() => window.__signalbreak.game.scene.getScene('HUD').busy, 15000, 'node');
  await sleep(2000);
  await tap(480, 236); // option 1: North Stairs
  await readDialogue(2500);
  await worldTap(420, 190);
  await waitFor(() => window.__signalbreak.game.scene.getScene('HUD').busy, 15000, 'node again');
  await sleep(1500);
  await tap(480, 286); // option 2: East Alley
  await waitFor(() => window.__signalbreak.run.phase === 'relay', 8000, 'key activation');
  await sleep(1500);

  // Relay
  await walkTo(455, 146);
  await use(522, 150);
  await waitFor(() => window.__signalbreak.game.scene.isActive('ClarityReport'), 6000, 'report');
  await sleep(2000);

  // Clarity Report: tap a finding, then its column
  const colX = { verified: 12 + 114, attention: 12 + 236 + 114, unverified: 12 + 472 + 114, confirm: 12 + 708 + 114 };
  const data = await G(() => window.__signalbreak.game.cache.json.get('case01'));
  for (const f of data.report.findings) {
    const pos = await G((id) => { const c = window.__signalbreak.game.scene.getScene('ClarityReport').cards[id].c; return [c.x, c.y]; }, f.id);
    await tap(pos[0], pos[1]);
    await sleep(500);
    await tap(colX[f.id === 'f6' ? 'verified' : f.answer], 345);
    await sleep(700);
  }
  await sleep(1000);
  await tap(960 - 110, 30);
  await sleep(3500);
  const f8 = await G(() => { const c = window.__signalbreak.game.scene.getScene('ClarityReport').cards.f8.c; return [c.x, c.y]; });
  await tap(f8[0], f8[1]);
  await sleep(3500);
  await tap(480, 350);

  // Restored market + the shortcut
  await waitFor(() => window.__signalbreak.run.phase === 'restored' && window.__signalbreak.game.scene.isActive('Market'), 5000, 'restored');
  await sleep(4500);
  await use(330, 148); // Sela's new lines
  await walkTo(455, 241);
  await walkTo(505, 241);
  await walkTo(510, 150);
  await sleep(1500);
  await tap(960 - 70, 440); // FINISH
  await sleep(5000);
} catch (e) {
  errors.push(e.message);
} finally {
  await ctx.close();
  await browser.close();
  server.close();
}
const vid = readdirSync(OUT).filter((f) => f.endsWith('.webm')).map((f) => join(OUT, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (vid) renameSync(vid, join(OUT, 'playthrough.webm'));
if (errors.length) { console.log('FAIL\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('RECORDED', join(OUT, 'playthrough.webm'));
