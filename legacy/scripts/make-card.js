const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const W = 1200, H = 630;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// ── Colors (matching site theme) ──
const BG      = '#0d0f1a';
const BG2     = '#161828';
const GOLD    = '#c9922a';
const GOLD_L  = '#e8d5a3';
const PURPLE  = '#7c3aed';
const TEXT2   = '#b0b8cc';
const TEXT3   = '#6b7280';
const BORDER  = 'rgba(201,146,42,0.3)';

// ── Background ──
ctx.fillStyle = BG;
ctx.fillRect(0, 0, W, H);

// Subtle radial glow top-left (purple)
const glowL = ctx.createRadialGradient(200, 200, 0, 200, 200, 380);
glowL.addColorStop(0, 'rgba(124,58,237,0.18)');
glowL.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = glowL;
ctx.fillRect(0, 0, W, H);

// Subtle radial glow right (gold)
const glowR = ctx.createRadialGradient(950, 420, 0, 950, 420, 320);
glowR.addColorStop(0, 'rgba(201,146,42,0.10)');
glowR.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = glowR;
ctx.fillRect(0, 0, W, H);

// ── Gold border frame ──
ctx.strokeStyle = GOLD;
ctx.lineWidth = 2.5;
ctx.strokeRect(14, 14, W - 28, H - 28);

// Inner subtle border
ctx.strokeStyle = 'rgba(201,146,42,0.18)';
ctx.lineWidth = 1;
ctx.strokeRect(22, 22, W - 44, H - 44);

// ── Left panel: coin image ──
const IMG_X = 48, IMG_Y = 80, IMG_SIZE = 440;
(async () => {
  try {
    const coin = await loadImage(path.join(__dirname, 'g_token.jpg'));
    // Circular clip
    ctx.save();
    ctx.beginPath();
    const cx = IMG_X + IMG_SIZE / 2;
    const cy = IMG_Y + IMG_SIZE / 2;
    const r  = IMG_SIZE / 2;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    // Glow ring
    ctx.shadowColor = PURPLE;
    ctx.shadowBlur  = 48;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth   = 3;
    ctx.stroke();
    ctx.clip();
    ctx.shadowBlur = 0;
    ctx.drawImage(coin, IMG_X, IMG_Y, IMG_SIZE, IMG_SIZE);
    ctx.restore();

    // Second glow ring outside clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(201,146,42,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  } catch(e) {
    // Fallback: gold circle placeholder
    ctx.beginPath();
    ctx.arc(IMG_X + IMG_SIZE/2, IMG_Y + IMG_SIZE/2, IMG_SIZE/2, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(201,146,42,0.15)';
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // ── Vertical divider ──
  const divX = 548;
  const grad = ctx.createLinearGradient(divX, 40, divX, H - 40);
  grad.addColorStop(0,   'rgba(201,146,42,0)');
  grad.addColorStop(0.2, 'rgba(201,146,42,0.5)');
  grad.addColorStop(0.8, 'rgba(201,146,42,0.5)');
  grad.addColorStop(1,   'rgba(201,146,42,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divX, 40);
  ctx.lineTo(divX, H - 40);
  ctx.stroke();

  // ── Right panel text ──
  const RX = 588;   // text left edge
  const RW = W - RX - 40; // usable width
  let y = 100;

  // 'GUARD' — big gold title
  ctx.fillStyle = GOLD_L;
  ctx.font = 'bold 96px Georgia, "Times New Roman", serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('GUARD', RX, y);
  y += 12;

  // 'Metallicus Guardian Token'
  ctx.fillStyle = TEXT2;
  ctx.font = '500 22px "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('Metallicus Guardian Token', RX, y + 30);
  y += 72;

  // Horizontal divider
  drawHRule(ctx, RX, y, RW, GOLD, 0.45);
  y += 28;

  // Taglines
  ctx.fillStyle = TEXT2;
  ctx.font = '400 20px "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '0px';
  ctx.fillText('Protector of the WebAuth Wallet.', RX, y);
  y += 34;
  ctx.fillText('Forged in the fires of XPR Network.', RX, y);
  y += 52;

  // Value pillars
  ctx.fillStyle = '#a78bfa'; // softer purple for readability
  ctx.font = '600 17px "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '1.5px';
  ctx.fillText('LOYALTY  ·  BUILD  ·  SECURITY  ·  EMPOWER  ·  NETWORK', RX, y);
  y += 50;

  // Gold divider
  drawHRule(ctx, RX, y, RW, GOLD, 0.55);
  y += 36;

  // CTA line
  ctx.fillStyle = GOLD_L;
  ctx.font = 'bold 21px "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('STAND GUARD. BUILD TODAY. PROTECT TOMORROW.', RX, y);
  y += 56;

  // URL — bottom
  ctx.fillStyle = TEXT3;
  ctx.font = '400 17px "Segoe UI", Arial, sans-serif';
  ctx.letterSpacing = '0.5px';
  ctx.fillText('standguard.net', RX, y);

  // ── Save ──
  const out = path.join(__dirname, 'guard-card-v6.png');
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log('Saved:', out);
})();

function drawHRule(ctx, x, y, w, color, opacity) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0,    `rgba(201,146,42,${opacity})`);
  g.addColorStop(0.7,  `rgba(201,146,42,${opacity * 0.6})`);
  g.addColorStop(1,    'rgba(201,146,42,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}
