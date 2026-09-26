// Gray-box market, painted with the Canvas 2D API into textures.
// Two moods: 'dim' (compromised by the counterfeit signal) and 'restored'.
// No emblems, logos or letters are painted anywhere in the scene.

import { WORLD_W, WORLD_H, SOLIDS, GATES, LAMPS } from '../config.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const MOODS = {
  dim: {
    floor: ['#3a3646', '#353141', '#403b4c'], grout: '#28242f',
    wall: '#2a2632', wallTop: '#211e28', wallLine: '#1a1720', window: '#1d1a26',
    water: '#18203a', waterHi: '#243056', rail: '#4a4556',
    awningA: ['#5a5560', '#46424e'], awningB: ['#55505e', '#433f4b'], awningC: ['#5d5866', '#47434f'],
    counter: '#3f3a36', shutter: '#4d4855', fountain: '#4a4656', fountainWater: '#2c2f4a',
    banner: '#4a4452', lampPost: '#2f2c36', lampHead: '#3d3a44',
    alleyFloor: '#2c2836', tint: 'rgba(90, 40, 160, 0.18)',
  },
  restored: {
    floor: ['#8a7560', '#7f6b57', '#957f68'], grout: '#5e4e3f',
    wall: '#5a4a40', wallTop: '#4a3d35', wallLine: '#3d322b', window: '#f2c56b',
    water: '#2b5d8f', waterHi: '#4b86bd', rail: '#7a6a58',
    awningA: ['#d0533f', '#f1e6d4'], awningB: ['#3f78c0', '#f1e6d4'], awningC: ['#3f9a6a', '#f1e6d4'],
    counter: '#8a5f3a', shutter: null, fountain: '#8f8a86', fountainWater: '#5fa8d8',
    banner: '#6a4fc0', lampPost: '#3b3530', lampHead: '#ffd27a',
    alleyFloor: '#766352', tint: null,
  },
};

function floor(ctx, m, r, x0, y0, w, h) {
  ctx.fillStyle = m.grout;
  ctx.fillRect(x0, y0, w, h);
  for (let y = y0; y < y0 + h; y += 6) {
    const off = ((y - y0) / 6) % 2 ? 4 : 0;
    for (let x = x0 - off; x < x0 + w; x += 8) {
      ctx.fillStyle = m.floor[Math.floor(r() * m.floor.length)];
      ctx.fillRect(Math.max(x, x0) + 1, y + 1, Math.min(7, x0 + w - x - 1), 5);
    }
  }
}

function stall(ctx, m, x, y, w, h, awning) {
  // counter
  ctx.fillStyle = '#15131d';
  ctx.fillRect(x - 1, y + 8, w + 2, h - 7);
  ctx.fillStyle = m.counter;
  ctx.fillRect(x, y + 9, w, h - 9);
  // awning stripes
  for (let i = 0; i < w; i += 8) {
    ctx.fillStyle = awning[(i / 8) % 2];
    ctx.fillRect(x + i - 2, y - 4, Math.min(8, w - i + 4), 12);
  }
  ctx.fillStyle = '#15131d';
  ctx.fillRect(x - 2, y + 8, w + 4, 1);
  if (m.shutter) {
    // closed shutters
    ctx.fillStyle = m.shutter;
    ctx.fillRect(x + 2, y + 10, w - 4, h - 12);
    ctx.fillStyle = '#35313d';
    for (let yy = y + 12; yy < y + h - 2; yy += 3) ctx.fillRect(x + 2, yy, w - 4, 1);
  } else {
    // goods
    const goods = ['#e05a47', '#f0b43c', '#7ac05a', '#e07ab0', '#f5e07a'];
    for (let i = 0; i < w - 8; i += 6) {
      ctx.fillStyle = goods[(i / 6) % goods.length];
      ctx.fillRect(x + 4 + i, y + 11, 4, 3);
    }
  }
}

export function paintMarket(scene, key, mood) {
  if (scene.textures.exists(key)) return;
  const m = MOODS[mood];
  const tex = scene.textures.createCanvas(key, WORLD_W, WORLD_H);
  const ctx = tex.getContext();
  const r = rng(7);

  floor(ctx, m, r, 0, 0, 480, 262);
  // alley
  ctx.fillStyle = '#0c0b10';
  ctx.fillRect(480, 0, 80, WORLD_H);
  floor(ctx, { ...m, floor: [m.alleyFloor, m.alleyFloor, m.floor[0]] }, r, 480, 116, 72, 56);

  // walls
  const wall = (x, y, w, h) => {
    ctx.fillStyle = m.wall;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = m.wallLine;
    for (let yy = y + 5; yy < y + h; yy += 6) ctx.fillRect(x, yy, w, 1);
  };
  wall(0, 0, 480, 44);
  ctx.fillStyle = m.wallTop;
  ctx.fillRect(0, 0, 480, 10);
  wall(0, 44, 8, 218);
  wall(468, 44, 12, 80);
  wall(468, 164, 12, 98);
  wall(480, 96, 80, 20);
  wall(480, 172, 80, 20);
  wall(552, 116, 8, 56);
  // windows on the north facade
  for (let x = 24; x < 470; x += 44) {
    if (x > 180 && x < 250) continue;
    ctx.fillStyle = '#15131d';
    ctx.fillRect(x - 1, 15, 12, 14);
    ctx.fillStyle = m.window;
    ctx.fillRect(x, 16, 10, 12);
  }
  // plain cloth banners (no symbols)
  for (const bx of [60, 290, 410]) {
    ctx.fillStyle = m.banner;
    ctx.fillRect(bx, 12, 10, 20);
    ctx.fillRect(bx + 2, 32, 6, 3);
    if (mood === 'dim') {
      ctx.fillStyle = m.wall;
      ctx.fillRect(bx + 6, 24, 4, 11); // torn corner
    } else {
      ctx.fillStyle = '#e0b64a';
      ctx.fillRect(bx, 12, 10, 2);
    }
  }
  // north stairs recess
  const n = GATES.north;
  ctx.fillStyle = '#15131d';
  ctx.fillRect(n.x - 2, n.y - 16, n.w + 4, n.h + 16);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#3b3642' : '#48424f';
    ctx.fillRect(n.x, n.y - 16 + i * 3, n.w, 3);
  }

  // canal
  ctx.fillStyle = m.water;
  ctx.fillRect(0, 262, 480, 38);
  ctx.fillStyle = m.waterHi;
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.floor(r() * 470), 266 + Math.floor(r() * 30), 6, 1);
  ctx.fillStyle = m.rail;
  ctx.fillRect(0, 258, 480, 4);
  ctx.fillStyle = '#15131d';
  for (let x = 4; x < 480; x += 12) ctx.fillRect(x, 256, 2, 6);
  // canal bridge deck
  const c = GATES.canal;
  ctx.fillStyle = mood === 'dim' ? '#4a4050' : '#8a6a4a';
  ctx.fillRect(c.x + 4, 262, c.w - 8, 38);
  ctx.fillStyle = '#15131d';
  for (let y = 264; y < 300; y += 4) ctx.fillRect(c.x + 4, y, c.w - 8, 1);

  // stalls (solids 8..10)
  stall(ctx, m, 24, 72, 64, 28, m.awningA);
  stall(ctx, m, 24, 172, 64, 28, m.awningB);
  stall(ctx, m, 120, 214, 56, 24, m.awningC);

  // fountain
  ctx.fillStyle = '#15131d';
  ctx.fillRect(217, 121, 46, 32);
  ctx.fillStyle = m.fountain;
  ctx.fillRect(218, 122, 44, 30);
  ctx.fillStyle = m.fountainWater;
  ctx.fillRect(222, 126, 36, 22);
  ctx.fillStyle = m.fountain;
  ctx.fillRect(237, 131, 6, 10);

  // lamp posts
  for (const [lx, ly] of LAMPS) {
    ctx.fillStyle = '#15131d';
    ctx.fillRect(lx - 2, ly - 12, 5, 16);
    ctx.fillStyle = m.lampPost;
    ctx.fillRect(lx - 1, ly - 8, 3, 12);
    ctx.fillStyle = m.lampHead;
    ctx.fillRect(lx - 2, ly - 13, 5, 5);
  }

  // violet cast over the compromised market
  if (m.tint) {
    ctx.fillStyle = m.tint;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }
  tex.refresh();
}

// Small props that change during the case get their own textures.
export function paintProps(scene) {
  const make = (key, w, h, draw) => {
    if (scene.textures.exists(key)) return;
    const t = scene.textures.createCanvas(key, w, h);
    draw(t.getContext());
    t.refresh();
  };
  const K = '#15131d';
  // market terminal: compromised and calm. Screens show no symbol.
  const terminal = (glitch) => (ctx) => {
    ctx.fillStyle = K; ctx.fillRect(0, 0, 26, 30);
    ctx.fillStyle = '#3b404b'; ctx.fillRect(1, 1, 24, 28);
    ctx.fillStyle = K; ctx.fillRect(3, 3, 20, 14);
    if (glitch) {
      ctx.fillStyle = '#5a1fb0'; ctx.fillRect(4, 4, 18, 12);
      ctx.fillStyle = '#c28bff';
      for (const [x, y, w] of [[5, 5, 9], [8, 8, 12], [4, 11, 6], [12, 13, 9]]) ctx.fillRect(x, y, w, 1);
      ctx.fillStyle = '#f3dcff'; ctx.fillRect(15, 6, 2, 2);
    } else {
      ctx.fillStyle = '#1f5f5a'; ctx.fillRect(4, 4, 18, 12);
      ctx.fillStyle = '#9ff0d8';
      for (const [x, y, w] of [[5, 6, 14], [5, 9, 11], [5, 12, 13]]) ctx.fillRect(x, y, w, 1);
    }
    ctx.fillStyle = '#555b68'; ctx.fillRect(6, 20, 14, 3);
    ctx.fillStyle = '#26282f'; ctx.fillRect(9, 24, 8, 5);
  };
  make('terminal-glitch', 26, 30, terminal(true));
  make('terminal-ok', 26, 30, terminal(false));

  make('records', 36, 24, (ctx) => {
    ctx.fillStyle = K; ctx.fillRect(0, 0, 36, 20);
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(1, 1, 34, 18);
    ctx.fillStyle = '#8a6238'; ctx.fillRect(3, 3, 30, 14);
    for (const [x, y] of [[5, 4], [14, 5], [23, 4], [8, 10], [19, 11]]) {
      ctx.fillStyle = '#efe6cf'; ctx.fillRect(x, y, 7, 5);
      ctx.fillStyle = '#9a917e'; ctx.fillRect(x + 1, y + 2, 5, 1);
    }
    ctx.fillStyle = K; ctx.fillRect(5, 20, 2, 4); ctx.fillRect(29, 20, 2, 4);
  });

  const bars = (w, h, vertical, open) => (ctx) => {
    ctx.fillStyle = K; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2b2733'; ctx.fillRect(1, 1, w - 2, h - 2);
    if (open) return;
    ctx.fillStyle = '#6a6f7c';
    if (vertical) for (let y = 2; y < h - 1; y += 4) ctx.fillRect(1, y, w - 2, 2);
    else for (let x = 2; x < w - 1; x += 4) ctx.fillRect(x, 1, 2, h - 2);
  };
  make('gate-east', GATES.east.w, GATES.east.h, bars(GATES.east.w, GATES.east.h, true, false));
  make('gate-north', GATES.north.w, GATES.north.h, bars(GATES.north.w, GATES.north.h, false, false));
  make('gate-canal', GATES.canal.w, GATES.canal.h, bars(GATES.canal.w, GATES.canal.h, false, false));

  make('relay-on', 14, 18, (ctx) => {
    ctx.fillStyle = K; ctx.fillRect(0, 0, 14, 18);
    ctx.fillStyle = '#34303e'; ctx.fillRect(1, 1, 12, 16);
    ctx.fillStyle = '#b06bff'; ctx.fillRect(3, 3, 3, 3); ctx.fillRect(8, 3, 3, 3);
    ctx.fillStyle = '#7a2cff'; ctx.fillRect(3, 9, 8, 6);
  });
  make('relay-off', 14, 18, (ctx) => {
    ctx.fillStyle = K; ctx.fillRect(0, 0, 14, 18);
    ctx.fillStyle = '#34303e'; ctx.fillRect(1, 1, 12, 16);
    ctx.fillStyle = '#4a4656'; ctx.fillRect(3, 3, 3, 3); ctx.fillRect(8, 3, 3, 3); ctx.fillRect(3, 9, 8, 6);
  });
  // Key authorization node: a pedestal with a square socket. No symbol.
  make('node', 16, 14, (ctx) => {
    ctx.fillStyle = K; ctx.fillRect(2, 0, 12, 14); ctx.fillRect(0, 2, 16, 10);
    ctx.fillStyle = '#555b68'; ctx.fillRect(3, 1, 10, 12); ctx.fillRect(1, 3, 14, 8);
    ctx.fillStyle = '#e0b64a'; ctx.fillRect(5, 4, 6, 6);
    ctx.fillStyle = K; ctx.fillRect(6, 5, 4, 4);
  });
  make('trail-dot', 3, 3, (ctx) => {
    ctx.fillStyle = '#b06bff'; ctx.fillRect(0, 1, 3, 1); ctx.fillRect(1, 0, 1, 3);
  });
  make('glow', 32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,220,140,0.9)');
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  });
  make('glow-violet', 32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
    g.addColorStop(0, 'rgba(190,140,255,0.9)');
    g.addColorStop(1, 'rgba(190,140,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  });
  make('shadow', 12, 4, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(1, 0, 10, 4); ctx.fillRect(0, 1, 12, 2);
  });
  // Markers: a speech bubble over people to talk to, a gold sparkle over clues.
  make('mark-talk', 9, 8, (ctx) => {
    ctx.fillStyle = K; ctx.fillRect(0, 0, 9, 6); ctx.fillRect(2, 6, 2, 2);
    ctx.fillStyle = '#f1ecff'; ctx.fillRect(1, 1, 7, 4); ctx.fillRect(2, 5, 1, 1);
    ctx.fillStyle = '#7a4fd0'; ctx.fillRect(2, 3, 1, 1); ctx.fillRect(4, 3, 1, 1); ctx.fillRect(6, 3, 1, 1);
  });
  make('mark-clue', 7, 7, (ctx) => {
    ctx.fillStyle = '#fff3c4'; ctx.fillRect(3, 0, 1, 7); ctx.fillRect(0, 3, 7, 1);
    ctx.fillStyle = '#e0b64a'; ctx.fillRect(2, 2, 3, 3);
  });
  make('px', 1, 1, (ctx) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1, 1); });
}

export { SOLIDS };
