// Builds the phone-friendly single-file page (engine, game and case data inlined,
// no network requests). Needs esbuild:  npm i -D esbuild   (or set ESBUILD_PATH).
//   node tools/build-single-file.mjs <out.html>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let esbuild;
try { esbuild = require('esbuild'); } catch { esbuild = require(process.env.ESBUILD_PATH); }

const root = new URL('..', import.meta.url);
const out = process.argv[2] || 'signalbreak.html';
const bundle = await esbuild.build({
  entryPoints: [new URL('src/main.js', root).pathname],
  bundle: true, format: 'iife', minify: true, target: 'es2020', write: false, logLevel: 'error',
});
const esc = (s) => s.replace(/<\/script/gi, '<\\/script');
const js = esc(bundle.outputFiles[0].text);
const phaser = esc(readFileSync(new URL('vendor/phaser.min.js', root), 'utf8'));
const data = JSON.stringify(JSON.parse(readFileSync(new URL('data/case01.json', root), 'utf8'))).replace(/<\//g, '<\\/');

const html = `<title>GUARD.IAN Signalbreak</title>
<meta name="robots" content="noindex">
<style>
  :root { color-scheme: dark; --ground: #0b0a12; --ink: #ece8f5; --dim: #a39fb4; --gold: #e0b64a; --violet: #b98cff; --bad: #ff9f9f; }
  html, body { background: var(--ground); }
  body { color: var(--ink); font: 13px/1.4 "Courier New", ui-monospace, Menlo, Consolas, monospace; padding-inline: 16px; padding-block: 6px; box-sizing: border-box; }
  .bar { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: baseline; padding-block: 4px; }
  .bar b { color: var(--gold); letter-spacing: 0.04em; }
  .bar span { color: var(--dim); }
  #game-root { position: relative; width: 100%; max-width: min(100%, calc((100dvh - 24px) * 16 / 9)); aspect-ratio: 16 / 9; margin-inline: auto; background: #0b0a12; outline: 2px solid #3d2c6e; touch-action: none; }
  #game-root canvas { display: block; image-rendering: pixelated; touch-action: none; }
  #status { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; padding: 16px; color: var(--dim); }
  #status.err { color: var(--bad); }
  .turn { color: var(--violet); padding-block: 6px; }
  @media (orientation: landscape) { .turn { display: none; } }
  @media (max-height: 460px) { .bar { display: none; } }
</style>
<div class="bar"><b>GUARD.IAN: SIGNALBREAK</b><span>Phase 1 gray-box prototype · Case 01 · fictional, no wallet, no chain data</span></div>
<p class="turn">Turn your phone sideways for a bigger game and easier controls.</p>
<div id="game-root" aria-label="GUARD.IAN: SIGNALBREAK game"><div id="status">Loading the game…</div></div>
<script>
  window.SIGNALBREAK_EMBED = { case01: ${data} };
  (function () {
    function show(msg) {
      var s = document.getElementById('status');
      if (!s) { s = document.createElement('div'); s.id = 'status'; document.getElementById('game-root').appendChild(s); }
      s.className = 'err';
      s.textContent = 'The game hit an error and stopped. Send Claude this message: ' + msg;
    }
    window.addEventListener('error', function (e) { show(e.message || String(e)); });
    window.addEventListener('unhandledrejection', function (e) { show(String(e.reason)); });
    window.SIGNALBREAK_READY = function () { var s = document.getElementById('status'); if (s) s.remove(); };
  })();
</script>
<script>${phaser}</script>
<script>${js}</script>
<script>
  if (typeof Phaser === 'undefined') {
    document.getElementById('status').className = 'err';
    document.getElementById('status').textContent = 'The game engine did not load. Send Claude this message: Phaser missing.';
  }
</script>
`;
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1e6).toFixed(2)} MB)`);
