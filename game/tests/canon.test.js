// Canon and honesty locks, checked mechanically.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SPRITE_MAPS, PALETTE, CITIZEN_PALETTES } from '../src/art/sprites.js';
import { EMBLEM_ASSET } from '../src/config.js';

const root = new URL('..', import.meta.url).pathname;
function files(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p, exts));
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}
const shipped = [...files(join(root, 'src'), ['.js']), ...files(join(root, 'data'), ['.json']), join(root, 'index.html')];

test('sprite maps are rectangular and use only palette characters', () => {
  for (const [name, rows] of Object.entries(SPRITE_MAPS)) {
    const w = rows[0].length;
    rows.forEach((r, i) => {
      assert.equal(r.length, w, `${name} row ${i} width ${r.length} != ${w}`);
      for (const ch of r) assert.ok(ch === '.' || ch in PALETTE, `${name} row ${i} has unknown '${ch}'`);
    });
  }
});

test('the gold M appears only on Mini GUARD\'s chest (front view, torso rows)', () => {
  for (const [name, rows] of Object.entries(SPRITE_MAPS)) {
    rows.forEach((r, i) => {
      if (!r.includes('M')) return;
      assert.ok(name.startsWith('GUARD_DOWN'), `M found in ${name}`);
      assert.ok(i >= 9 && i <= 12, `M outside chest rows in ${name} row ${i}`);
    });
  }
  for (const pal of Object.values(CITIZEN_PALETTES)) assert.ok(!('M' in pal));
});

test('Key head interior and Shield face carry no emblem (blank until canonical asset)', () => {
  assert.equal(EMBLEM_ASSET, null);
  const key = SPRITE_MAPS.KEY;
  for (let y = 4; y <= 6; y++) assert.equal(key[y].slice(2, 5), 'DDD', `Key head row ${y} not blank`);
  // Shield face interior uses only nebula colours and scattered stars, no gold/letter pixels.
  const face = SPRITE_MAPS.SHIELD_FACE;
  for (let y = 2; y <= 7; y++) {
    const inner = face[y].slice(2, 8);
    assert.match(inner, /^[Nn S]+$/, `Shield face row ${y} has non-nebula pixels: ${inner}`);
  }
});

test('the Key is never rotated in code', () => {
  const src = readFileSync(join(root, 'src/entities/guard.js'), 'utf8');
  assert.ok(!/key[^\n]*(setAngle|setRotation|angle:|rotation:)/i.test(src));
  for (const f of files(join(root, 'src'), ['.js'])) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!/\.key\.(setAngle|setRotation|angle|rotation)/.test(s), `Key rotation in ${f}`);
  }
});

test('no SAFE verdict wording anywhere in shipped game text', () => {
  for (const f of shipped) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!/\bsafe(ly|ty)?\b/i.test(s), `"safe" found in ${f}`);
  }
});

test('no wallet, chain, token, price or network calls in game code', () => {
  const banned = /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|wallet|webauth|proton-web-sdk|eosjs|price|payout|airdrop|staking|yield)\b/i;
  for (const f of files(join(root, 'src'), ['.js'])) {
    const s = readFileSync(f, 'utf8');
    const lines = s.split('\n').filter((l) => !l.trim().startsWith('//'));
    for (const l of lines) assert.ok(!banned.test(l), `${f}: ${l.trim()}`);
  }
});

test('case content is marked fictional', () => {
  const data = JSON.parse(readFileSync(join(root, 'data/case01.json'), 'utf8'));
  assert.match(data.fictionNotice, /fictional/i);
});
