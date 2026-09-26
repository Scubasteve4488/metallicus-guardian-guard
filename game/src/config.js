// Shared constants. World units are native pixels; the market camera zooms 3x.

export const VIEW_W = 960;
export const VIEW_H = 540;
export const ZOOM = 3;

export const WORLD_W = 560;
export const WORLD_H = 300;

// Canonical XPR/Proton emblem for the Key head and the Shield face.
// NULL ON PURPOSE: the owner has not supplied the canonical logo file yet, so
// both emblem areas render blank. When the file arrives, load it in BootScene
// and place it exactly as supplied. Never redraw it, and never substitute a
// letter P, a generic atom or an invented symbol.
export const EMBLEM_ASSET = null;

export const FONT = '"Courier New", ui-monospace, Menlo, Consolas, monospace';

export const COLORS = {
  ink: '#ece8f5',
  dim: '#a39fb4',
  violet: '#b98cff',
  gold: '#e0b64a',
  panel: 0x141222,
  panelEdge: 0x6b4fb0,
  good: '#8fe3b0',
  warn: '#ffcf70',
  bad: '#ff8f8f',
};

// Solid areas the player collides with: [x, y, w, h].
export const SOLIDS = [
  [0, 0, 480, 44],       // north wall (North Stairs gate is set into it)
  [0, 44, 8, 218],       // west wall
  [468, 44, 12, 80],     // east wall above the alley gate
  [468, 164, 12, 98],    // east wall below the alley gate
  [480, 0, 80, 116],     // alley north block
  [480, 172, 80, 128],   // alley south block
  [552, 116, 8, 56],     // alley end wall
  [0, 262, 480, 38],     // canal
  [24, 72, 64, 28],      // stall A
  [24, 172, 64, 28],     // stall B
  [120, 214, 56, 24],    // stall C
  [218, 124, 44, 28],    // fountain
  [360, 98, 26, 16],     // market terminal
  [100, 44, 36, 6],      // records board
];

export const GATES = {
  north: { x: 196, y: 26, w: 40, h: 18, label: 'North Stairs' },
  east: { x: 468, y: 124, w: 12, h: 40, label: 'East Alley' },
  canal: { x: 300, y: 250, w: 40, h: 12, label: 'Canal Bridge' },
};

export const NODE = { x: 420, y: 200 };
export const RELAY = { x: 536, y: 144, inspectX: 518, inspectY: 146 };
export const START = { x: 240, y: 240 };

export const LAMPS = [[160, 46], [300, 46], [440, 52], [168, 254], [420, 254], [520, 118]];

// Signal trail from the terminal to the east gate and on to the relay.
export const TRAIL = [
  [382, 122], [392, 128], [402, 132], [412, 136], [422, 138], [432, 140],
  [442, 141], [452, 142], [462, 143], [472, 144], [484, 144], [496, 144], [508, 145], [520, 145],
];
