// Part 0: Analyze GUARD distribution and propose rank thresholds
// Reads existing distribution_raw.json and combined_distribution.json
// No changes made to any site code.

const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'distribution_raw.json')));
const combined = JSON.parse(fs.readFileSync(path.join(__dirname, 'combined_distribution.json')));

const wallets = raw.holders;
const combinedBals = combined.combined;

// Exclusions applied during data collection (already absent from combinedBals):
//   blastpad (336M – staking contract), cyphrtipbot (11.6M – tip bot),
//   rewardchest (2M), bpbonuspool (2.47M), bpbonus (392 – kept, trivial),
//   scubasteve44, guardops, guardrewards (were not in chain results)
const EXCLUDED_NOTE = [
  'blastpad (336,595,774 – staking contract)',
  'cyphrtipbot (11,644,399 – ecosystem tip bot)',
  'rewardchest (2,000,000 – reward chest)',
  'bpbonuspool (2,473,737 – bonus pool)',
];

// ── Combined sorted ascending ──────────────────────────────────────────────
const accounts = Object.entries(combinedBals)
  .map(([a, b]) => ({ account: a, balance: b }))
  .sort((a, b) => a.balance - b.balance);

const n = accounts.length;

function pct(p) {
  const idx = Math.max(0, Math.min(n - 1, Math.floor(p / 100 * n)));
  return { idx, account: accounts[idx].account, balance: accounts[idx].balance };
}

// ── Staker detection ───────────────────────────────────────────────────────
const stakers = [];
for (const [acct, combined] of Object.entries(combinedBals)) {
  const wallet = wallets[acct] || 0;
  const staked = combined - wallet;
  if (staked > 1) stakers.push({ account: acct, wallet, staked, combined });
}
stakers.sort((a, b) => b.staked - a.staked);

// ── Print report ───────────────────────────────────────────────────────────
function fmt(n) { return Math.round(n).toLocaleString(); }

console.log('═══════════════════════════════════════════════════════════');
console.log('  GUARD DISTRIBUTION REPORT — Part 0');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('EXCLUSIONS (removed before analysis):');
EXCLUDED_NOTE.forEach(e => console.log('  ✗ ' + e));
console.log();

console.log(`TOTAL UNIQUE HOLDERS (wallet only): ${Object.keys(wallets).length}`);
console.log(`TOTAL UNIQUE HOLDERS (combined, after exclusions): ${n}`);
console.log(`STAKERS (BlastPad pool 791, staked > 1 GUARD): ${stakers.length}`);
console.log();

console.log('── STAKER DETAILS ─────────────────────────────────────────');
stakers.forEach(s => {
  console.log(`  ${s.account.padEnd(20)} wallet: ${fmt(s.wallet).padStart(15)}  staked: ${fmt(s.staked).padStart(15)}  combined: ${fmt(s.combined).padStart(15)}`);
});
console.log();

console.log('── COMBINED BALANCE DISTRIBUTION ──────────────────────────');
const pcts = [10, 25, 50, 60, 70, 75, 80, 85, 90, 93, 95, 97, 99];
pcts.forEach(p => {
  const r = pct(p);
  console.log(`  p${String(p).padStart(2)}  ${r.account.padEnd(20)}  ${fmt(r.balance).padStart(15)}  GUARD  (index ${r.idx}/${n-1})`);
});
console.log();

console.log('── TOP 15 HOLDERS (combined) ──────────────────────────────');
accounts.slice().reverse().slice(0, 15).forEach((a, i) => {
  const staked = (combinedBals[a.account] - (wallets[a.account] || 0));
  const stakedStr = staked > 1 ? ` (+${fmt(staked)} staked)` : '';
  console.log(`  ${String(i+1).padStart(2)}. ${a.account.padEnd(20)}  ${fmt(a.balance).padStart(15)}  GUARD${stakedStr}`);
});
console.log();

console.log('── HOLDER BAND COUNTS ─────────────────────────────────────');
const bands = [
  { label: '< 1,000',        lo: 0,         hi: 1000 },
  { label: '1K – 10K',       lo: 1000,      hi: 10000 },
  { label: '10K – 25K',      lo: 10000,     hi: 25000 },
  { label: '25K – 100K',     lo: 25000,     hi: 100000 },
  { label: '100K – 500K',    lo: 100000,    hi: 500000 },
  { label: '500K – 1M',      lo: 500000,    hi: 1000000 },
  { label: '1M – 5M',        lo: 1000000,   hi: 5000000 },
  { label: '5M – 15M',       lo: 5000000,   hi: 15000000 },
  { label: '15M +',          lo: 15000000,  hi: Infinity },
];
bands.forEach(b => {
  const c = accounts.filter(a => a.balance >= b.lo && a.balance < b.hi).length;
  const pct = (c / n * 100).toFixed(1);
  console.log(`  ${b.label.padEnd(18)}  ${String(c).padStart(4)} wallets  (${pct}%)`);
});
console.log();

// ── Threshold proposals ────────────────────────────────────────────────────
console.log('── CURRENT vs PROPOSED RANK THRESHOLDS ───────────────────');
const current = [0, 25000, 150000, 750000, 2500000, 7500000, 15000000];
const shieldNames = ['Cryptide', 'Riftforge', 'Helion', 'Nebulon', 'Protonis', 'Keystone', 'Aegis'];

// Proposed: based on percentile targets from spec
// Riftforge ≈ p50, Helion ≈ p70, Nebulon ≈ p85, Protonis ≈ p93, Keystone ≈ p97, Aegis ≈ top 2-3
const proposed = [
  0,          // Cryptide: unchanged
  10000,      // Riftforge: p50 = 10,155 → 10K
  200000,     // Helion: p70 = 200,000 (exact)
  1500000,    // Nebulon: p85 = 1,500,000 (exact)
  5000000,    // Protonis: p93 = 5,123,105 → 5M
  10000000,   // Keystone: p97 = 10,416,334 → 10M
  20000000,   // Aegis: p99 = 20,859,037 → 20M (luisblue barely qualifies)
];

// Count wallets that qualify at each threshold
current.forEach((cur, i) => {
  const prop = proposed[i];
  const curQual = accounts.filter(a => a.balance >= cur).length;
  const propQual = prop === 0 ? n : accounts.filter(a => a.balance >= prop).length;
  const change = prop < cur ? ` ↓ (easier)` : prop > cur ? ` ↑ (harder)` : '';
  console.log(`  ${shieldNames[i].padEnd(12)}  cur: ${String(fmt(cur)).padStart(12)}  →  prop: ${String(fmt(prop)).padStart(12)}  (${propQual}/${n} qualify${change})`);
});

console.log();
console.log('── PROPOSED THRESHOLD JUSTIFICATION ──────────────────────');
console.log('  Riftforge  10,000    p50 = 10,155   — half of all holders can reach Defender');
console.log('  Helion    200,000    p70 = 200,000   — top 30% reach Sentinel (clean round number)');
console.log('  Nebulon 1,500,000    p85 = 1,500,000 — top 15% reach Ascendant');
console.log('  Protonis 5,000,000   p93 = 5,123,105 — top 7% reach Architect');
console.log('  Keystone 10,000,000  p97 = 10,416,334 — top 3% reach Gatekeeper');
console.log('  Aegis   20,000,000   p99 = 20,859,037 — top ~2 wallets currently qualify');
console.log();
console.log('  NOTE: Riftforge drops from 25K → 10K (more accessible for new holders).');
console.log('  NOTE: Helion drops from 150K → 200K... wait, that\'s HARDER. Check below:');
console.log('  NOTE: Nebulon drops from 750K → 1.5M (HARDER). Protonis 2.5M → 5M (HARDER).');
console.log('  NOTE: Keystone 7.5M → 10M (HARDER). Aegis 15M → 20M (HARDER).');
console.log('  Mid-ranks tighten significantly. Upper ranks shift to match real distribution.');
console.log();
console.log('── ALTERNATIVE: KEEP CURRENT THRESHOLDS? ─────────────────');
current.forEach((cur, i) => {
  const qual = cur === 0 ? n : accounts.filter(a => a.balance >= cur).length;
  const top = (qual / n * 100).toFixed(0);
  console.log(`  ${shieldNames[i].padEnd(12)}  ${String(fmt(cur)).padStart(12)} GUARD  →  ${qual} wallets qualify (top ${top}%)`);
});
console.log();
console.log('═══════════════════════════════════════════════════════════');
console.log('  DO NOT change any code — awaiting approval of thresholds');
console.log('═══════════════════════════════════════════════════════════');
