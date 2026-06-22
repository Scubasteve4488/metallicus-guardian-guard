// Part 1: Generate 5 jagged shard PNGs from each of 7 shield images
// Run: node make_shards.js
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const SHIELDS = [
  'cryptide','riftforge','helion','nebulon','protonis','keystone','aegis'
];

const MAX_SIDE = 380;

// 5 crack polylines from center outward (normalized 0–1).
// Each crack is [center, mid-jag1, mid-jag2, boundary-point].
// Crack endpoints (at image edge), clockwise from top:
//   P0=(0.48,0)  P1=(1,0.50)  P2=(0.72,1)  P3=(0.28,1)  P4=(0,0.45)
const CENTER = [0.50, 0.43];
const CRACKS = [
  // crack 0 → top  (P0)
  [[0.50,0.43],[0.53,0.28],[0.46,0.14],[0.48,0]],
  // crack 1 → upper-right (P1)
  [[0.50,0.43],[0.66,0.36],[0.80,0.28],[1,0.50]],
  // crack 2 → lower-right (P2)
  [[0.50,0.43],[0.65,0.60],[0.72,0.80],[0.72,1]],
  // crack 3 → lower-left (P3)
  [[0.50,0.43],[0.34,0.62],[0.32,0.80],[0.28,1]],
  // crack 4 → left (P4)
  [[0.50,0.43],[0.30,0.48],[0.14,0.34],[0,0.45]],
];

// Corner connections between crack endpoints (along image boundary, clockwise):
//  P0→P1: top edge → right edge
//  P1→P2: right edge down
//  P2→P3: bottom edge left
//  P3→P4: bottom edge → left edge
//  P4→P0: left edge up → top edge
const BOUNDARY_SEGS = [
  [[0.48,0],[1,0],[1,0.50]],     // P0 → P1 via top-right corner
  [[1,0.50],[1,1],[0.72,1]],      // P1 → P2 via bottom-right corner
  [[0.72,1],[0.28,1]],            // P2 → P3 (straight bottom)
  [[0.28,1],[0,1],[0,0.45]],      // P3 → P4 via bottom-left corner
  [[0,0.45],[0,0],[0.48,0]],      // P4 → P0 via top-left corner
];

// Build shard polygon: center + crack[i] + boundary_seg[i] + crack[(i+1)%5] reversed
function shardPoly(i) {
  const c = CRACKS[i].slice(1);          // crack outward points (skip center)
  const b = BOUNDARY_SEGS[i];            // boundary corners
  const nc = CRACKS[(i+1)%5].slice(1).reverse(); // next crack inward
  return [[...CENTER], ...c, ...b, ...nc];
}

function scalePoint(pt, w, h) { return [pt[0]*w, pt[1]*h]; }

async function processShield(name) {
  const src = path.join(__dirname, `shield_${name}.png`);
  if (!fs.existsSync(src)) { console.error(`Missing: ${src}`); return; }
  const img = await loadImage(src);

  // Scale down so max side = MAX_SIDE
  let sw = img.width, sh = img.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  sw = Math.round(sw * scale);
  sh = Math.round(sh * scale);

  for (let i = 0; i < 5; i++) {
    const cvs = createCanvas(sw, sh);
    const ctx = cvs.getContext('2d');

    // Build polygon scaled to canvas
    const poly = shardPoly(i).map(pt => scalePoint(pt, sw, sh));

    // Clip to polygon
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let k = 1; k < poly.length; k++) ctx.lineTo(poly[k][0], poly[k][1]);
    ctx.closePath();
    ctx.clip();

    // Draw the shield image (scaled)
    ctx.drawImage(img, 0, 0, sw, sh);

    const out = path.join(__dirname, `shard_${name}_${i+1}.png`);
    fs.writeFileSync(out, cvs.toBuffer('image/png'));
    console.log(`  saved ${path.basename(out)}  (${sw}×${sh})`);
  }
}

async function main() {
  for (const name of SHIELDS) {
    console.log(`Processing shield_${name}.png ...`);
    await processShield(name);
  }
  console.log('\nDone — 35 shard files generated.');
}
main().catch(e => { console.error(e); process.exit(1); });
