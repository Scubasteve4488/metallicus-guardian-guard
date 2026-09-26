// Gray-box pixel sprites, drawn from character maps at runtime. No image files.
//
// These are PLACEHOLDERS built from the canon locks (concept packet p.15): compact
// sealed helmet, violet eyes, dark gunmetal armor, worn gold/bronze trim, gold M
// on the chest only. Proportions follow the approved chibi sheet (big helmet,
// short body). They are not final sprites and nothing is cropped from concept art.
//
// EMBLEM AREAS ARE INTENTIONALLY BLANK. The Key head interior and the Shield face
// carry no symbol until the owner supplies the canonical XPR/Proton logo file.
// See EMBLEM_ASSET in ../config.js. Do not draw a P, an atom or any stand-in here.

export const PALETTE = {
  K: '#15131d', // outline
  D: '#262a33', // dark gunmetal
  G: '#3b404b', // gunmetal
  g: '#555b68', // gunmetal light
  h: '#7a8191', // highlight
  V: '#0b0a12', // visor
  E: '#d6a6ff', // eye core (violet)
  e: '#9b5cff', // eye glow (violet)
  B: '#9a7433', // worn bronze trim
  Y: '#e0b64a', // gold
  M: '#f3cf55', // chest M (gold) - only ever used in Mini GUARD's chest rows
  R: '#fff0b8', // rivet
  N: '#4b2a8f', // nebula violet
  n: '#27479e', // nebula blue
  S: '#e9e2ff', // star
  X: '#7a2cff', // spoof signal
  x: '#b06bff',
  W: '#f3dcff',
  // citizens (palette-swapped per NPC)
  H: '#6b4a2b', s: '#e8b98f', C: '#3f7fbf', P: '#394257',
};

// Mini GUARD, facing the camera (down). 16 x 19.
const GUARD_DOWN = [
  '....KKKKKKKK....',
  '...KhgggggggK...',
  '..KhgggggggggK..',
  '.KBgggggggggGBK.',
  '.KBVVVVVVVVVVBK.',
  '.KBVEeVVVVeEVBK.',
  '.KGVVVVVVVVVVGK.',
  '..KGggggggggGK..',
  '...KKKKKKKKKK...',
  '.KBBGggggggGBBK.',
  '.KGGgMggggMgGGK.',
  '.KGGgMMggMMgGGK.',
  '.KGGgMgMMgMgGGK.',
  '.KgKBBBBBBBBKgK.',
  '..KKGGGGGGGGKK..',
  '...KGGGKKGGGK...',
  '...KGgGKKGgGK...',
  '..KDDDDKKDDDDK..',
  '..KKKKK..KKKKK..',
];
const GUARD_DOWN_STEP = GUARD_DOWN.slice(0, 15).concat([
  '...KGGGKKGGGK...',
  '...KDDDKKGgGK...',
  '...KKKKKKDDDDK..',
  '.........KKKKK..',
]);

// Facing away (up). No visor, no M: the M is on the chest, not the back.
const GUARD_UP = [
  '....KKKKKKKK....',
  '...KhgggggggK...',
  '..KhgggggggggK..',
  '.KBgggggggggGBK.',
  '.KBggggggggggBK.',
  '.KBhgggggggggBK.',
  '.KGggggggggggGK.',
  '..KGggggggggGK..',
  '...KKKKKKKKKK...',
  '.KBBGggggggGBBK.',
  '.KGGgDDDDDDgGGK.',
  '.KGGgDggggDgGGK.',
  '.KGGgDDDDDDgGGK.',
  '.KgKBBBBBBBBKgK.',
  '..KKGGGGGGGGKK..',
  '...KGGGKKGGGK...',
  '...KGgGKKGgGK...',
  '..KDDDDKKDDDDK..',
  '..KKKKK..KKKKK..',
];
const GUARD_UP_STEP = GUARD_UP.slice(0, 15).concat(GUARD_DOWN_STEP.slice(15));

// Facing right (profile). Left-facing is this mirrored.
const GUARD_RIGHT = [
  '....KKKKKKKK....',
  '...KhgggggggK...',
  '..KhgggggggggK..',
  '..KgggggggggVK..',
  '..KgBBgggVVVVK..',
  '..KgBBggVVVEeK..',
  '..KGgggggVVVVK..',
  '...KGgggggggGK..',
  '....KKKKKKKKK...',
  '....KGggggggK...',
  '....KGgggggggK..',
  '....KGgggggggK..',
  '....KGgggggggK..',
  '....KBBBBBBBBK..',
  '....KGGGGGGGGK..',
  '.....KGGKGGGK...',
  '.....KGgKGgGK...',
  '.....KDDKDDDDK..',
  '.....KKKKKKKKK..',
];
const GUARD_RIGHT_STEP = GUARD_RIGHT.slice(0, 15).concat([
  '.....KGGKGGGK...',
  '....KDDKKKGgGK..',
  '....KKK..KDDDDK.',
  '.........KKKKKK.',
]);

// Nebular Shield, face side. Heater shape: flat top, riveted gold frame,
// violet/blue nebula face. Emblem area left blank on purpose.
const SHIELD_FACE = [
  'KKKKKKKKKK',
  'KYRYYYYRYK',
  'KYNNnNNNYK',
  'KRNnnNNNRK',
  'KYNNnNNnYK',
  'KYNNNNnnYK',
  'KRNNNnNNRK',
  'KYNnNNNSYK',
  '.KYNNnNYK.',
  '.KYNnNNYK.',
  '..KYNNYK..',
  '...KYYK...',
  '....KK....',
];
// Back of the shield (Mini GUARD facing away): dark metal, gold frame.
const SHIELD_BACK = [
  'KKKKKKKKKK',
  'KYRYYYYRYK',
  'KYDDDDDDYK',
  'KRDGGGGDRK',
  'KYDGDDGDYK',
  'KYDGDDGDYK',
  'KRDGGGGDRK',
  'KYDDDDDDYK',
  '.KYDDDDYK.',
  '.KYDDDDYK.',
  '..KYDDYK..',
  '...KYYK...',
  '....KK....',
];
// Seen edge-on from behind (Mini GUARD facing right, shield on the far arm).
const SHIELD_EDGE = [
  'KKK', 'KYK', 'KDK', 'KDK', 'KDK', 'KDK', 'KDK', 'KDK', 'KYK', 'KDK', '.K.', '.K.',
];

// Proton Key. Rounded cap, square framed head, segmented shaft, symmetrical
// teeth. The 3x3 head interior (D) is the reserved, BLANK emblem area.
// One Key only: compact at the waist, the same sprite scales up when activated.
const KEY = [
  '..KKK..',
  '.KYYYK.',
  'KKKKKKK',
  'KYYYYYK',
  'KYDDDYK',
  'KYDDDYK',
  'KYDDDYK',
  'KYYYYYK',
  'KKKYKKK',
  '..KYK..',
  '..KBK..',
  '..KYK..',
  '..KBK..',
  '..KYK..',
  'KKKYKKK',
  'KYKYKYK',
  'KKK.KKK',
];

// Citizen (palette-swapped per NPC). 12 x 15. No M, no emblem.
const CITIZEN = [
  '...KKKKKK...',
  '..KHHHHHHK..',
  '.KHHHHHHHHK.',
  '.KHssssssHK.',
  '.KsKssssKsK.',
  '.KssssssssK.',
  '..KssssssK..',
  '...KKKKKK...',
  '..KCCCCCCK..',
  '.KsCCCCCCsK.',
  '.KsCCCCCCsK.',
  '..KCCCCCCK..',
  '..KPPPPPPK..',
  '..KPPKKPPK..',
  '..KKK..KKK..',
];

const SIGNAL = [
  '...X...',
  '..XxX..',
  '.XxWxX.',
  'XxWWWxX',
  '.XxWxX.',
  '..XxX..',
  '...X...',
];

export const CITIZEN_PALETTES = {
  oren: { H: '#7a4e25', s: '#d9a07a', C: '#c0553a', P: '#3d4458' },
  juno: { H: '#2d2240', s: '#f0c49b', C: '#6a4fc0', P: '#2e3a52' },
  sela: { H: '#b8b0a0', s: '#b87a55', C: '#3f8f6f', P: '#403a4e' },
  c1: { H: '#402818', s: '#e3b08a', C: '#b88a2e', P: '#333a4a' },
  c2: { H: '#1f1f26', s: '#c98e66', C: '#3b77a8', P: '#39324a' },
  c3: { H: '#8a5a2a', s: '#f2c9a4', C: '#8c3f6a', P: '#2f3b4a' },
};

export const SPRITE_MAPS = {
  GUARD_DOWN, GUARD_DOWN_STEP, GUARD_UP, GUARD_UP_STEP, GUARD_RIGHT, GUARD_RIGHT_STEP,
  SHIELD_FACE, SHIELD_BACK, SHIELD_EDGE, KEY, CITIZEN, SIGNAL,
};

// Draw a character map into a new canvas texture.
export function makeTexture(scene, key, rows, overrides = {}, flip = false) {
  if (scene.textures.exists(key)) return;
  const w = rows[0].length;
  const h = rows.length;
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  const pal = { ...PALETTE, ...overrides };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][flip ? w - 1 - x : x];
      if (ch === '.') continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  tex.refresh();
}

export function buildSprites(scene) {
  makeTexture(scene, 'guard-down-0', GUARD_DOWN);
  makeTexture(scene, 'guard-down-1', GUARD_DOWN_STEP);
  makeTexture(scene, 'guard-up-0', GUARD_UP);
  makeTexture(scene, 'guard-up-1', GUARD_UP_STEP);
  makeTexture(scene, 'guard-right-0', GUARD_RIGHT);
  makeTexture(scene, 'guard-right-1', GUARD_RIGHT_STEP);
  makeTexture(scene, 'guard-left-0', GUARD_RIGHT, {}, true);
  makeTexture(scene, 'guard-left-1', GUARD_RIGHT_STEP, {}, true);
  makeTexture(scene, 'shield-face', SHIELD_FACE);
  makeTexture(scene, 'shield-back', SHIELD_BACK);
  makeTexture(scene, 'shield-edge', SHIELD_EDGE);
  makeTexture(scene, 'key', KEY);
  makeTexture(scene, 'signal', SIGNAL);
  for (const [id, pal] of Object.entries(CITIZEN_PALETTES)) {
    makeTexture(scene, `citizen-${id}`, CITIZEN, pal);
  }
}
