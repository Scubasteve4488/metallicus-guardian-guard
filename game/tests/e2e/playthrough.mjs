// Automated end-to-end playthrough in headless Chromium.
// Serves the repository root with the production Content-Security-Policy from
// ../_headers, plays the whole case, and fails on any console/page/CSP error.
//
//   node tests/e2e/playthrough.mjs [screenshotDir]
//
// Needs Playwright (npm i -g playwright, or set PLAYWRIGHT_PATH to its folder).

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
const CSP = readFileSync(join(REPO, '_headers'), 'utf8').match(/Content-Security-Policy: (.*)/)[1];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(REPO, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!f.startsWith(REPO) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Content-Security-Policy': CSP });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const errors = [];
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const sleep = (ms) => page.waitForTimeout(ms);
const G = (fn, arg) => page.evaluate(fn, arg);
const phase = () => G(() => window.__signalbreak.run.phase);
const shot = async (name) => { await scanText(); if (SHOTS) await page.locator('canvas').screenshot({ path: join(SHOTS, `${name}.png`) }); };
function check(cond, msg) { if (!cond) throw new Error(`CHECK FAILED: ${msg}`); console.log(`  ok  ${msg}`); }
async function waitFor(fn, arg, ms = 8000, label = 'condition') {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await G(fn, arg)) return; await sleep(50); }
  throw new Error(`timeout waiting for ${label}`);
}
async function canvasPoint(x, y) {
  const b = await page.locator('canvas').boundingBox();
  return { x: b.x + (x * b.width) / 960, y: b.y + (y * b.height) / 540 };
}
async function click(x, y) { const p = await canvasPoint(x, y); await page.mouse.click(p.x, p.y); await sleep(120); }
async function key(k, n = 1) { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(160); } }
// Every text object currently in any running scene (containers included).
const allText = () => G(() => {
  const out = [];
  const walk = (list) => { for (const o of list) { if (o.type === 'Text') out.push(o.text); if (o.list) walk(o.list); } };
  for (const s of window.__signalbreak.game.scene.getScenes(true)) walk(s.children.list);
  return out;
});
const seenText = new Set();
async function scanText() { for (const t of await allText()) seenText.add(t); }
const hudBusy = () => G(() => window.__signalbreak.game.scene.getScene('HUD').busy);
async function closeDialogue() { for (let i = 0; i < 12 && await hudBusy(); i++) await key('e'); }
async function teleport(x, y) {
  await G(([x, y]) => { const m = window.__signalbreak.game.scene.getScene('Market'); m.guard.setPosition(x, y); }, [x, y]);
  await sleep(150);
}
async function holdE(ms = 900) { await page.keyboard.down('e'); await sleep(ms); await page.keyboard.up('e'); await sleep(200); }

try {
  const t0 = Date.now();
  await page.goto(`${base}/game/?test=1`);
  await waitFor(() => window.__signalbreak && window.__signalbreak.game.scene.isActive('Boot'), null, 15000, 'boot');
  await sleep(600);
  await shot('01-title');
  await key('Enter');
  await waitFor(() => window.__signalbreak.game.scene.isActive('Market') && window.__signalbreak.game.scene.getScene('HUD').ready, null, 5000, 'market');
  await sleep(500);
  await shot('02-market-intro');
  await closeDialogue();
  check(await phase() === 'investigate', 'case starts in investigate phase');

  // Real keyboard movement
  const before = await G(() => window.__signalbreak.game.scene.getScene('Market').guard.x);
  await page.keyboard.down('ArrowRight'); await sleep(500); await page.keyboard.up('ArrowRight');
  const after = await G(() => window.__signalbreak.game.scene.getScene('Market').guard.x);
  check(after > before + 10, `arrow keys move Mini GUARD (${before.toFixed(0)} -> ${after.toFixed(0)})`);

  const data = await G(() => window.__signalbreak.game.cache.json.get('case01'));
  for (const n of data.npcs) {
    await teleport(n.x, n.y + 10);
    await key('e');
    await sleep(200);
    check(await hudBusy(), `talking to ${n.name} opens dialogue`);
    if (n.id === 'sela') await shot('03-dialogue');
    await closeDialogue();
  }
  for (const c of data.clues) {
    await teleport(c.x, c.y + 8);
    await page.keyboard.down('e'); await sleep(350);
    if (c.id === 'terminal') await shot('04-inspect-hold');
    await sleep(550); await page.keyboard.up('e'); await sleep(250);
    check(await hudBusy(), `holding E inspects ${c.name}`);
    await closeDialogue();
  }
  check(await G(() => window.__signalbreak.run.cards.length) === 5, '5 evidence cards collected');
  const types = await G(() => [...new Set(window.__signalbreak.run.cards.map((id) => window.__signalbreak.game.cache.json.get('case01').cards[id].type))].sort());
  check(types.join(',') === 'RECORD,SOURCE,WITNESS', `exactly three evidence types gathered: ${types.join(', ')}`);
  check(await phase() === 'board', 'phase advances to board after 3 NPCs + 3 clues');
  await shot('05-market-gathered');

  await key('b');
  await waitFor(() => window.__signalbreak.game.scene.isActive('EvidenceBoard'), null, 3000, 'board scene');
  await sleep(400);
  // Unrelated link (record -> witness) is rejected and counted.
  let a = await canvasPoint(385, 140), b = await canvasPoint(130, 395);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up(); await sleep(200);
  const kept = await G(() => window.__signalbreak.run.board.links.map((l) => l.kind));
  check(kept.length === 1 && kept[0] === 'uncertain', 'incorrect link is allowed, kept on the board and marked UNCERTAIN');
  check(await G(() => window.__signalbreak.run.metrics.unrelatedLinks) === 1, 'incorrect link lowers evidence quality');
  check((await allText()).includes('UNCERTAIN'), 'board shows the UNCERTAIN label on that link');
  // Drag-link: source -> record (contradiction)
  a = await canvasPoint(130, 165); b = await canvasPoint(385, 140);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up(); await sleep(200);
  // Click-link: witness then trail
  await click(130, 395); await click(385, 405);
  // Mark rumor uncertain (button at card bottom-right)
  await click(595 + 107 - 40, 275 + 66 - 14);
  const links = await G(() => window.__signalbreak.run.board.links.map((l) => l.kind));
  check(links.includes('contradiction') && links.includes('supports'), `board links made: ${links.join(', ')}`);
  const contra = await G(() => window.__signalbreak.run.board.links.find((l) => l.kind === 'contradiction'));
  check([contra.a, contra.b].sort().join('+') === 'record+source' && /08:40/.test(contra.text) && /10:00/.test(contra.text),
    'the contradiction found is the 08:40 broadcast predating its claimed 10:00 source');
  check(await G(() => window.__signalbreak.run.board.uncertain.has('rumor')), 'rumor marked Uncertain');
  await sleep(900);
  await shot('06-board-complete');
  await key('Enter');
  await waitFor(() => window.__signalbreak.game.scene.isActive('Containment'), null, 3000, 'containment scene');
  await sleep(300);
  await shot('07-containment-intro');
  await key('Enter');
  // Real keys: change lane and raise the shield.
  await key('d');
  check(await G(() => window.__signalbreak.game.scene.getScene('Containment').lane) === 1, 'D moves to lane 2');
  await page.keyboard.down(' '); await sleep(150);
  check(await G(() => window.__signalbreak.game.scene.getScene('Containment').shieldUp), 'holding Space raises the Shield');
  await page.keyboard.up(' ');
  await key('a');
  // Bot: move to each incoming signal's lane and raise the shield just before impact.
  await G(() => {
    const s = window.__signalbreak.game.scene.getScene('Containment');
    window.__bot = (time) => {
      const next = s.signals.filter((x) => x.state === 'rising').sort((p, q) => p.s.y - q.s.y)[0];
      if (!next) { s.raise(false); return; }
      s.setLane(next.lane);
      const d = next.s.y - 350;
      if (d < 30 && !s.shieldUp) s.raise(true);
      if (d > 60 && s.shieldUp) s.raise(false);
    };
    s.events.on('update', window.__bot);
  });
  await sleep(9000);
  await shot('08-containment-play');
  await waitFor(() => window.__signalbreak.run.phase === 'authorize', null, 45000, 'containment finished');
  await G(() => window.__signalbreak.game.scene.getScene('Containment').events.off('update', window.__bot));
  const cs = await G(() => window.__signalbreak.run.metrics.containment);
  check(cs.total === data.containment.pattern.length, `every signal resolved (reflected ${cs.reflected}, blocked ${cs.blocked}, passed ${cs.passed})`);
  check(cs.delaySeconds === 0, `with the Shield, citizens lost no time and sheltered in ${cs.shelterSeconds}s`);
  const shieldShelter = cs.shelterSeconds;
  await sleep(300);
  await shot('09-containment-done');
  await key('Enter');
  await waitFor(() => window.__signalbreak.game.scene.isActive('Market') && window.__signalbreak.game.scene.getScene('HUD').ready, null, 3000, 'market again');
  await sleep(600);

  // Wrong route: Key stays compact.
  await teleport(420, 214);
  await key('e');
  await sleep(250);
  await shot('10-route-choice');
  await key('1');
  await sleep(200);
  check(await G(() => window.__signalbreak.run.metrics.wrongRoutes) === 1, 'wrong route is refused');
  check(await G(() => !window.__signalbreak.game.scene.getScene('Market').guard.keyActive), 'Key does not activate for an unsupported route');
  await closeDialogue();
  // Supported route: Key activates, held upright, never rotated.
  await key('e'); await sleep(250); await key('2');
  const angles = [];
  const scales = [];
  for (let i = 0; i < 20; i++) {
    const k = await G(() => { const k = window.__signalbreak.game.scene.getScene('Market').guard.key; return [k.angle, k.scaleY]; });
    angles.push(k[0]); scales.push(k[1]);
    if (i === 9) await shot('11-key-activated');
    await sleep(120);
  }
  check(angles.every((x) => x === 0), 'Key angle stays 0 throughout activation (held upright, no swing)');
  check(Math.max(...scales) > 1.2, `the same Key object expands (max scale ${Math.max(...scales).toFixed(2)})`);
  await waitFor(() => window.__signalbreak.run.phase === 'relay', null, 5000, 'relay phase');
  await sleep(700);
  check(await G(() => window.__signalbreak.game.scene.getScene('Market').guard.key.scaleY) < 0.5, 'Key returns to compact at the hip');
  check(await G(() => !window.__signalbreak.game.scene.getScene('Market').gates.east.solid), 'East Alley gate is open');

  // Walk through the open gate for real, then inspect the relay.
  await teleport(455, 146);
  await page.keyboard.down('ArrowRight'); await sleep(900); await page.keyboard.up('ArrowRight');
  check(await G(() => window.__signalbreak.game.scene.getScene('Market').guard.x) > 480, 'Mini GUARD walks through the open gate into the alley');
  await teleport(518, 150);
  await holdE();
  await closeDialogue();
  await waitFor(() => window.__signalbreak.game.scene.isActive('ClarityReport'), null, 4000, 'report scene');
  await sleep(400);
  await shot('12-report-empty');

  // Report: place every finding, one deliberately wrong.
  const ids = ['verified', 'attention', 'unverified', 'confirm'];
  for (const f of data.report.findings) {
    const pos = await G((id) => { const c = window.__signalbreak.game.scene.getScene('ClarityReport').cards[id].c; return [c.x, c.y]; }, f.id);
    await click(pos[0], pos[1]);
    const n = f.id === 'f6' ? 1 : ids.indexOf(f.answer) + 1;
    await key(String(n));
  }
  // Also test drag-and-drop: move f1 out of column into tray area would be complex; drag f4 to its own column.
  await shot('13-report-sorted');
  await click(960 - 110, 30);
  await sleep(1600);
  check(await G(() => window.__signalbreak.run.metrics.reportFirstPct) === 89, 'report graded (8/9 on first attempt)');
  await shot('14-report-graded');
  const f8 = await G(() => { const c = window.__signalbreak.game.scene.getScene('ClarityReport').cards.f8.c; return [c.x, c.y]; });
  await click(f8[0], f8[1]);
  check(!!(await G(() => window.__signalbreak.run.metrics.nextStep)), 'player picks the next step');
  await sleep(300);
  await shot('15-report-filed');
  await key('Enter');
  await waitFor(() => window.__signalbreak.run.phase === 'restored' && window.__signalbreak.game.scene.isActive('Market'), null, 3000, 'restored market');
  await sleep(1200);
  await shot('16-restoring');
  await sleep(2600);
  await shot('17-restored');
  check(await G(() => window.__signalbreak.game.scene.getScene('Market').bg.texture.key) === 'market-restored', 'market shows the restored art');
  check(await G(() => window.__signalbreak.game.scene.getScene('Market').terminal.texture.key) === 'terminal-ok', 'terminal shows its calm screen');
  check(await G(() => window.__signalbreak.game.scene.getScene('Market').lampGlows.every((l) => l.alpha > 0.5)), 'market lamps are lit');
  // Walk through the new shortcut: from the canal walk east through the door into the passage, then up into the alley.
  await teleport(455, 241);
  await page.keyboard.down('ArrowRight'); await sleep(900); await page.keyboard.up('ArrowRight');
  check(await G(() => window.__signalbreak.game.scene.getScene('Market').guard.x) > 495, 'shortcut door is open: Mini GUARD walks through it');
  await page.keyboard.down('ArrowUp'); await sleep(1600); await page.keyboard.up('ArrowUp');
  check(await G(() => window.__signalbreak.game.scene.getScene('Market').guard.y) < 172, 'the passage leads into East Alley');
  await shot('17b-shortcut');
  await sleep(200);
  await key('Enter');
  await sleep(400);
  check(await phase() === 'done', 'case closes');
  const safeHits = [...seenText].filter((t) => /\bsafe/i.test(t));
  check(safeHits.length === 0, `no on-screen text contains "safe" (${seenText.size} distinct strings scanned across every screen)`);
  await shot('18-summary');
  await click(480, 440);
  await waitFor(() => window.__signalbreak.game.scene.isActive('Boot'), null, 4000, 'title after Play again');
  await sleep(300);
  await key('Enter');
  await waitFor(() => window.__signalbreak.game.scene.isActive('Market') && window.__signalbreak.run.phase === 'investigate' && window.__signalbreak.run.cards.length === 0, null, 4000, 'fresh run');
  check(true, 'Play again starts a fresh case');

  // Missed shield: jump straight to the containment event and never raise the Shield.
  await G(() => {
    const sb = window.__signalbreak;
    sb.run.phase = 'contain';
    sb.game.scene.getScenes(true).forEach((s) => s.scene.stop());
    sb.game.scene.start('Containment');
  });
  await waitFor(() => window.__signalbreak.game.scene.isActive('Containment'), null, 3000, 'containment (miss run)');
  await sleep(300);
  await key('Enter');
  const tStart = Date.now();
  await waitFor(() => window.__signalbreak.run.phase === 'authorize', null, 90000, 'containment ends with no shield');
  const miss = await G(() => window.__signalbreak.run.metrics.containment);
  const civ = await G(() => { const c = window.__signalbreak.game.scene.getScene('Containment'); return { sheltered: c.sheltered, total: c.civs.length }; });
  check(miss.passed > 0 && miss.reflected === 0 && miss.blocked === 0, `with no shield, ${miss.passed} signals got past`);
  check(civ.sheltered === civ.total, `all ${civ.total} citizens still reach shelter; nobody is lost`);
  check(miss.shelterSeconds >= shieldShelter + 10 && miss.delaySeconds >= 10, `without the Shield they lose ${miss.delaySeconds}s and shelter in ${miss.shelterSeconds}s (vs ${shieldShelter}s with it)`);
  const missText = (await allText()).join(' ');
  check(!/kill|killed|dead|death|died|damage|score/i.test(missText), 'no death, kill, damage or score wording on screen');
  await shot('19-no-shield-summary');
  console.log(`  playthrough wall time (bot, with teleports): ${((Date.now() - t0) / 1000).toFixed(1)}s`);
} catch (e) {
  errors.push(e.message);
  await shot('zz-failure').catch(() => {});
} finally {
  await browser.close();
  server.close();
}

// Known, harmless: headless GPU notices; Google Fonts certificate errors inside
// this sandbox's proxy; and Phaser's Canvas blend-mode probe (a data: image in
// CanvasFeatures.js) which the CSP refuses; it only affects the unused Canvas renderer.
const PROBE = 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAABAQMAAADD8p2OAAAAA1BMVEX/';
const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|ERR_CERT_AUTHORITY_INVALID/i.test(e) && !e.includes(PROBE));
if (errors.length) console.log('console notes:\n  ' + errors.join('\n  '));
if (real.length) { console.log(`FAIL (${real.length})`); process.exit(1); }
console.log('PASS: full case playthrough, no page errors, no CSP violations');
