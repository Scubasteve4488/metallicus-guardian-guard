// Touch smoke test: emulated phone in landscape, real touch events on the
// on-screen pad. Checks movement, talk, hold-to-inspect, the BOARD button,
// the Shield by touch and the FINISH button.
//   node tests/e2e/touch.mjs [screenshotDir]
import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright'));
}
const REPO = resolve(new URL('../../..', import.meta.url).pathname);
const SHOTS = process.argv[2] || null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
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

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const sleep = (ms) => page.waitForTimeout(ms);
const G = (fn, arg) => page.evaluate(fn, arg);
const shot = async (n) => { if (SHOTS) await page.locator('canvas').screenshot({ path: join(SHOTS, `touch-${n}.png`) }); };
function check(c, m) { if (!c) throw new Error(`CHECK FAILED: ${m}`); console.log(`  ok  ${m}`); }
async function waitFor(fn, ms = 8000, label = 'condition') {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await G(fn)) return; await sleep(50); }
  throw new Error(`timeout: ${label}`);
}
async function pt(x, y) {
  const b = await page.locator('canvas').boundingBox();
  return { x: b.x + (x * b.width) / 960, y: b.y + (y * b.height) / 540 };
}
async function touchDown(x, y) { const p = await pt(x, y); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] }); }
async function touchUp() { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
async function tap(x, y) { await touchDown(x, y); await sleep(80); await touchUp(); await sleep(200); }
async function hold(x, y, ms) { await touchDown(x, y); await sleep(ms); await touchUp(); await sleep(200); }
const A = [960 - 78, 540 - 86];
const hud = () => window.__signalbreak.game.scene.getScene('HUD');
const market = () => window.__signalbreak.game.scene.getScene('Market');

try {
  await page.goto(`${base}/game/?test=1`);
  await waitFor(() => window.__signalbreak && window.__signalbreak.game.scene.isActive('Boot'), 15000, 'boot');
  await G(() => document.getElementById('game-root').scrollIntoView({ block: 'center' }));
  await sleep(300);
  const box = await page.locator('canvas').boundingBox();
  check(box.y >= 0 && box.y + box.height <= 390 + 1, `whole game fits a sideways phone screen (${Math.round(box.width)}x${Math.round(box.height)} at y=${Math.round(box.y)})`);
  await sleep(500);
  await shot('01-title');
  await tap(480, 480);
  await waitFor(() => window.__signalbreak.game.scene.isActive('Market') && window.__signalbreak.game.scene.getScene('HUD').ready, 5000, 'market');
  await sleep(1200);
  check(await G(() => window.__signalbreak.game.scene.getScene('HUD').touch), 'touch device detected, on-screen pad shown');
  for (let i = 0; i < 8 && await G(() => window.__signalbreak.game.scene.getScene('HUD').busy); i++) await tap(480, 300);
  check(!(await G(() => window.__signalbreak.game.scene.getScene('HUD').busy)), 'tapping the screen advances dialogue');
  await shot('02-market');
  const x0 = await G(() => window.__signalbreak.game.scene.getScene('Market').guard.x);
  await hold(92 + 44, 540 - 92, 600);
  const x1 = await G(() => window.__signalbreak.game.scene.getScene('Market').guard.x);
  check(x1 > x0 + 10, `right arrow on the pad moves Mini GUARD (${x0.toFixed(0)} -> ${x1.toFixed(0)})`);
  const y0 = await G(() => window.__signalbreak.game.scene.getScene('Market').guard.y);
  await hold(92, 540 - 92 - 44, 400);
  check(await G(() => window.__signalbreak.game.scene.getScene('Market').guard.y) < y0 - 5, 'up arrow on the pad moves Mini GUARD');

  const data = await G(() => window.__signalbreak.game.cache.json.get('case01'));
  for (const n of data.npcs) {
    await G(([x, y]) => window.__signalbreak.game.scene.getScene('Market').guard.setPosition(x, y), [n.x, n.y + 10]);
    await sleep(150);
    await tap(...A);
    check(await G(() => window.__signalbreak.game.scene.getScene('HUD').busy), `tap A talks to ${n.name}`);
    for (let i = 0; i < 6 && await G(() => window.__signalbreak.game.scene.getScene('HUD').busy); i++) await tap(480, 300);
  }
  for (const c of data.clues) {
    await G(([x, y]) => window.__signalbreak.game.scene.getScene('Market').guard.setPosition(x, y), [c.x, c.y + 8]);
    await sleep(150);
    await hold(...A, 1000);
    check(await G(() => window.__signalbreak.game.scene.getScene('HUD').busy), `hold A inspects ${c.name}`);
    for (let i = 0; i < 6 && await G(() => window.__signalbreak.game.scene.getScene('HUD').busy); i++) await tap(480, 300);
  }
  check(await G(() => window.__signalbreak.run.phase) === 'board', 'all evidence gathered by touch');
  await sleep(300);
  await shot('03-board-button');
  await tap(960 - 170, 540 - 150);
  await waitFor(() => window.__signalbreak.game.scene.isActive('EvidenceBoard'), 3000, 'BOARD button opens the board');
  check(true, 'BOARD button opens the Evidence Board');
  await tap(130, 165); await tap(385, 140);   // source + record
  await tap(130, 395); await tap(385, 405);   // witness + trail
  await tap(595 + 107 - 40, 275 + 66 - 14);   // rumor uncertain
  await sleep(1000);
  check(await G(() => window.__signalbreak.game.scene.getScene('EvidenceBoard').finished), 'board solved by tapping');
  await tap(480, 380);
  await waitFor(() => window.__signalbreak.game.scene.isActive('Containment'), 3000, 'containment');
  await sleep(200);
  await shot('04-shield-intro');
  await tap(480, 350);
  await sleep(200);
  await touchDown(580, 300); await sleep(200);
  const s = await G(() => { const c = window.__signalbreak.game.scene.getScene('Containment'); return { lane: c.lane, up: c.shieldUp }; });
  check(s.lane === 1 && s.up, 'touching the right lane moves there and raises the Shield');
  await touchUp(); await sleep(150);
  check(!(await G(() => window.__signalbreak.game.scene.getScene('Containment').shieldUp)), 'lifting the finger lowers the Shield');
  await waitFor(() => window.__signalbreak.run.phase === 'authorize', 60000, 'containment end');
  check(true, 'Shield event finishes (signals that got past only delay citizens)');
  await sleep(300);
  await tap(480, 345);
  await waitFor(() => window.__signalbreak.game.scene.isActive('Market') && window.__signalbreak.game.scene.getScene('HUD').ready, 3000, 'market');
  // Skip ahead to the restored market to test FINISH.
  await G(() => { const r = window.__signalbreak.run; r.phase = 'restored'; window.__signalbreak.game.scene.getScene('Market').scene.restart(); });
  await sleep(4000);
  await shot('05-restored');
  await tap(960 - 170, 540 - 150);
  await sleep(400);
  check(await G(() => window.__signalbreak.run.phase) === 'done', 'FINISH button closes the case');
  await shot('06-summary');
} catch (e) {
  errors.push(e.message);
  await shot('zz-failure').catch(() => {});
} finally {
  await browser.close();
  server.close();
}
if (errors.length) { console.log('FAIL\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('PASS: touch controls');
