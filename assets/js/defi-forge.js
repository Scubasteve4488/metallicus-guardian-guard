/* StandGuard — DeFi Forge simulators.
   Ported unchanged (behaviour-wise) from the pre-rework single-file site
   (archive/site-before-rework-2026-09-21 @ 6ff7384). The only edits are:
     - inline onclick/onchange attributes replaced by data-fx / data-fxchange
       plus the delegation shim at the bottom, so the page needs no inline
       script and the CSP can keep script-src to 'self';
     - wrapped so the helpers stay off the global object.
   Every figure this file produces is a simulation of numbers the visitor typed.
   It reads no chain, holds no funds, and signs nothing. */
(function(){
'use strict';
var _DL = {
  mode: 'fixed',
  segments: [{apy: 5, duration: 6, unit: 'months'}],
  _lastP: 0,
  _lastN: 365,
  _lastMode: 'fixed',
  _lastApy: 5,
  _lastSegments: null,
  _lastTotalYears: 0
};

// Convert a duration + unit string to fractional years
function dlToYears(val, unit) {
  val = parseFloat(val) || 0;
  if (unit === 'days')   return val / 365;
  if (unit === 'weeks')  return val / 52;
  if (unit === 'months') return val / 12;
  return val; // 'years'
}

// Core compound formula: P × (1 + r/n)^(n×t)
// P = principal, r = annual rate (decimal), n = compounds/year, t = years
// n === 0 → continuous compounding: P × e^(r×t)
function dlCompound(P, r, n, t) {
  if (t <= 0) return P;
  if (n === 0) return P * Math.exp(r * t);
  return P * Math.pow(1 + r / n, n * t);
}

// Map frequency string to compounds per year
function dlFreqToN(freq) {
  var map = {daily: 365, weekly: 52, monthly: 12, quarterly: 4, annual: 1, continuous: 0};
  return (freq in map) ? map[freq] : 365;
}

// Format a number with commas and 2 decimal places
function dlFmt(n) {
  if (isNaN(n) || !isFinite(n)) return '—';
  return n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// Format fractional years into a human-readable string
function dlFmtYears(y) {
  if (y < (1/52 - 0.0001)) return (y * 365).toFixed(1) + ' days';
  if (y < (1/12 - 0.0001)) return (y * 52).toFixed(1) + ' weeks';
  if (y < (1 - 0.0001))    return (y * 12).toFixed(1) + ' months';
  return y.toFixed(2) + ' years';
}

// Switch between fixed and variable APY modes
function dlSetMode(m) {
  _DL.mode = m;
  var isFixed = (m === 'fixed');
  document.getElementById('dl-fixed').style.display       = isFixed ? '' : 'none';
  document.getElementById('dl-variable').style.display    = isFixed ? 'none' : '';
  document.getElementById('dl-time-fixed').style.display  = isFixed ? '' : 'none';
  document.getElementById('dl-mode-hint').textContent     = isFixed
    ? 'One constant APY for the whole period.'
    : 'Define up to 6 time segments, each with a different APY.';
  document.querySelectorAll('.dl-mode-btn').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-mode') === m);
  });
  if (!isFixed) dlRenderSegments();
}

// Render the variable-mode segment inputs
function dlRenderSegments() {
  var html = '';
  _DL.segments.forEach(function(s, i) {
    html += '<div class="dl-seg">';
    html += '<div style="flex:0 0 auto;font-size:.7rem;color:var(--text3);font-weight:600;min-width:44px;padding-top:.4rem;">Seg&nbsp;' + (i + 1) + '</div>';
    html += '<div style="flex:1;display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;">';
    html += '<input type="number" class="dl-input" style="width:68px;" placeholder="APY%" value="' + s.apy + '" min="0" max="9999" step="0.1" oninput="_DL.segments[' + i + '].apy=this.value" aria-label="APY%">';
    html += '<span style="font-size:.72rem;color:var(--text3);flex-shrink:0;">%&nbsp;for</span>';
    html += '<input type="number" class="dl-input" style="width:64px;" placeholder="Dur" value="' + s.duration + '" min="0.001" step="any" oninput="_DL.segments[' + i + '].duration=this.value" aria-label="Dur">';
    html += '<select class="dl-select" style="flex:1;min-width:70px;" oninput="_DL.segments[' + i + '].unit=this.value">';
    ['days','weeks','months','years'].forEach(function(u) {
      html += '<option value="' + u + '"' + (s.unit === u ? ' selected' : '') + '>' + u + '</option>';
    });
    html += '</select>';
    if (_DL.segments.length > 1) {
      html += '<button data-fx="dlRemoveSeg" data-arg="' + i + '" style="background:none;border:1px solid rgba(239,68,68,0.3);color:#f87171;border-radius:5px;padding:.2rem .5rem;cursor:pointer;font-size:.7rem;flex-shrink:0;">✕</button>';
    }
    html += '</div></div>';
  });
  document.getElementById('dl-segs').innerHTML = html;
}

function dlAddSeg() {
  if (_DL.segments.length >= 6) return;
  _DL.segments.push({apy: 5, duration: 3, unit: 'months'});
  dlRenderSegments();
}

function dlRemoveSeg(i) {
  _DL.segments.splice(i, 1);
  dlRenderSegments();
}

function dlShowError(msg) {
  var el = document.getElementById('dl-error');
  if (el) { el.textContent = msg; el.style.display = ''; }
  var r = document.getElementById('dl-results');
  var emp = document.getElementById('dl-empty');
  if (r) r.style.display = 'none';
  if (emp) emp.style.display = '';
}

// Main calculation — runs the compound math and updates the results panel
function dlCalc() {
  var P = parseFloat(document.getElementById('dl-principal').value);
  if (!P || P <= 0) { dlShowError('Enter an amount greater than 0.'); return; }

  var freq = document.getElementById('dl-freq').value;
  var n    = dlFreqToN(freq);
  var tokenName = (document.getElementById('dl-token').value || 'Example Token').trim();

  var totalYears, totalBalance;
  var segRows = [];

  if (_DL.mode === 'fixed') {
    var apy = parseFloat(document.getElementById('dl-apy-fixed').value);
    if (isNaN(apy) || apy < 0) { dlShowError('Enter a valid APY (0 or greater).'); return; }
    var durVal  = parseFloat(document.getElementById('dl-dur-val').value);
    var durUnit = document.getElementById('dl-dur-unit').value;
    if (!durVal || durVal <= 0) { dlShowError('Enter a time period greater than 0.'); return; }
    totalYears  = dlToYears(durVal, durUnit);
    totalBalance = dlCompound(P, apy / 100, n, totalYears);
  } else {
    var segs = _DL.segments;
    if (!segs.length) { dlShowError('Add at least one segment.'); return; }
    var bal = P;
    totalYears = 0;
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      var sa = parseFloat(s.apy);
      var sd = parseFloat(s.duration);
      if (isNaN(sa) || sa < 0 || isNaN(sd) || sd <= 0) {
        dlShowError('Segment ' + (i + 1) + ': APY and duration must be valid positive numbers.');
        return;
      }
      var sy  = dlToYears(sd, s.unit);
      var eb  = dlCompound(bal, sa / 100, n, sy);
      segRows.push({label: 'Seg ' + (i + 1) + ': ' + sa + '% APY · ' + dlFmtYears(sy), start: bal, end: eb});
      bal = eb;
      totalYears += sy;
    }
    totalBalance = bal;
  }

  var interest  = totalBalance - P;
  var growthPct = P > 0 ? (interest / P * 100) : 0;

  // Persist state for Time Jump
  _DL._lastP          = P;
  _DL._lastN          = n;
  _DL._lastMode       = _DL.mode;
  _DL._lastApy        = (_DL.mode === 'fixed') ? parseFloat(document.getElementById('dl-apy-fixed').value) : null;
  _DL._lastSegments   = JSON.parse(JSON.stringify(_DL.segments));
  _DL._lastTotalYears = totalYears;

  // Populate results
  document.getElementById('dl-res-total').textContent    = dlFmt(totalBalance);
  document.getElementById('dl-res-token-lbl').textContent = tokenName;
  document.getElementById('dl-res-principal').textContent = dlFmt(P);
  document.getElementById('dl-res-interest').textContent  = dlFmt(interest);
  document.getElementById('dl-res-time').textContent      = dlFmtYears(totalYears);
  document.getElementById('dl-res-growth').textContent    = (growthPct >= 0 ? '+' : '') + growthPct.toFixed(2) + '% total growth';

  // Segment breakdown (variable mode only)
  var bdEl = document.getElementById('dl-seg-breakdown');
  if (segRows.length > 0) {
    bdEl.innerHTML = segRows.map(function(r) {
      return '<div class="dl-row">' +
        '<span class="dl-row-label">' + r.label + '</span>' +
        '<span class="dl-row-val" style="color:var(--pur-g);">' + dlFmt(r.start) + ' → ' + dlFmt(r.end) + '</span>' +
        '</div>';
    }).join('');
    bdEl.style.display = '';
  } else {
    bdEl.style.display = 'none';
  }

  document.getElementById('dl-results').style.display = '';
  document.getElementById('dl-empty').style.display   = 'none';
  document.getElementById('dl-error').style.display   = 'none';
  document.getElementById('dl-jump-result').style.display = 'none';
}

// Time Jump — show balance at a user-specified point in time
function dlTimeJump() {
  if (!_DL._lastP) { dlShowError('Run a calculation first, then use Time Jump.'); return; }
  var jVal  = parseFloat(document.getElementById('dl-jump-val').value);
  var jUnit = document.getElementById('dl-jump-unit').value;
  if (!jVal || jVal <= 0) {
    document.getElementById('dl-jump-result').style.display = 'none';
    return;
  }
  var jYears = dlToYears(jVal, jUnit);
  var P = _DL._lastP;
  var n = _DL._lastN;
  var bal;

  if (_DL._lastMode === 'fixed') {
    bal = dlCompound(P, _DL._lastApy / 100, n, jYears);
  } else {
    // Walk through segments up to jYears; continue last segment's rate if time exceeds all segments
    var remaining = jYears;
    bal = P;
    var segs = _DL._lastSegments;
    for (var i = 0; i < segs.length; i++) {
      if (remaining <= 0) break;
      var sy = dlToYears(parseFloat(segs[i].duration), segs[i].unit);
      var use = Math.min(remaining, sy);
      bal = dlCompound(bal, parseFloat(segs[i].apy) / 100, n, use);
      remaining -= use;
    }
    if (remaining > 0 && segs.length > 0) {
      var last = segs[segs.length - 1];
      bal = dlCompound(bal, parseFloat(last.apy) / 100, n, remaining);
    }
  }

  var interest  = bal - P;
  var growthPct = P > 0 ? (interest / P * 100) : 0;
  var el = document.getElementById('dl-jump-result');
  el.innerHTML =
    'At <strong>' + dlFmtYears(jYears) + '</strong>: ' +
    '<span style="color:var(--gold-l);font-family:\'Cinzel\',serif;font-size:1rem;">' + dlFmt(bal) + '</span>' +
    ' &nbsp;|&nbsp; +' + dlFmt(interest) + ' interest &nbsp;|&nbsp; +' + growthPct.toFixed(2) + '%';
  el.style.display = '';
}

// ── DEFI LAB: Instrument tab switching ────────────────────────────────────
function dlSetInstrument(name) {
  ['lending','lp','farming','borrowing','staking'].forEach(function(id) {
    var el = document.getElementById('dl-panel-' + id);
    if (el) el.style.display = (id === name) ? '' : 'none';
  });
  document.querySelectorAll('.dl-tab-btn').forEach(function(b) {
    b.classList.toggle('dl-tab-active', b.getAttribute('data-instrument') === name);
  });
}

// ── DEFI LAB: LP (Liquidity Pool) Instrument ──────────────────────────────
function lpToggleFee(on) {
  document.getElementById('lp-fee-section').style.display = on ? '' : 'none';
}

function lpShowError(msg) {
  var el  = document.getElementById('lp-error');
  if (el) { el.textContent = msg; el.style.display = ''; }
  var r   = document.getElementById('lp-results');
  var emp = document.getElementById('lp-empty');
  if (r)   r.style.display   = 'none';
  if (emp) emp.style.display = '';
}

function lpFmtQty(n) {
  if (isNaN(n) || !isFinite(n)) return '—';
  if (n >= 100) return n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  if (n >= 1)   return n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:4});
  return n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:6});
}

function lpCalc() {
  var deposit = parseFloat(document.getElementById('lp-deposit').value);
  if (!deposit || deposit <= 0) { lpShowError('Enter a total deposit amount greater than 0.'); return; }

  var tokenA = (document.getElementById('lp-token-a').value || 'Token A').trim();
  var tokenB = (document.getElementById('lp-token-b').value || 'Token B').trim();

  var priceA = parseFloat(document.getElementById('lp-price-a').value);
  var priceB = parseFloat(document.getElementById('lp-price-b').value);
  if (!priceA || priceA <= 0) { lpShowError('Token A starting price must be greater than 0.'); return; }
  if (!priceB || priceB <= 0) { lpShowError('Token B starting price must be greater than 0.'); return; }

  var newPriceA = parseFloat(document.getElementById('lp-new-price-a').value);
  var newPriceB = parseFloat(document.getElementById('lp-new-price-b').value);
  if (!newPriceA || newPriceA <= 0) { lpShowError("Token A's new price must be greater than 0."); return; }
  if (!newPriceB || newPriceB <= 0) { lpShowError("Token B's new price must be greater than 0."); return; }

  // Starting quantities — 50/50 split by value
  var qtyA = deposit / 2 / priceA;
  var qtyB = deposit / 2 / priceB;
  var k    = qtyA * qtyB; // constant product (x * y = k)

  // Pool rebalances to new price ratio while maintaining x * y = k
  var newQtyA = Math.sqrt(k * newPriceB / newPriceA);
  var newQtyB = Math.sqrt(k * newPriceA / newPriceB);

  var lpVal   = newQtyA * newPriceA + newQtyB * newPriceB;
  var hodlVal = qtyA * newPriceA + qtyB * newPriceB;

  // IL via closed-form formula: IL = (2√r)/(1+r) − 1
  // r = relative price ratio change = (newA/newB) / (A/B)
  var priceRatio = (newPriceA / newPriceB) / (priceA / priceB);
  var ilFrac = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  var ilPct  = ilFrac * 100;
  var ilAmt  = ilFrac * hodlVal; // equivalent to lpVal - hodlVal

  // Optional fee income — APR applied to LP position value (not initial deposit)
  var feeOn = document.getElementById('lp-fee-toggle').checked;
  var feeIncome = 0, feeYears = 0, feeAprVal = 0;
  if (feeOn) {
    feeAprVal = parseFloat(document.getElementById('lp-fee-apr').value) || 0;
    var feeDur  = parseFloat(document.getElementById('lp-fee-dur').value) || 0;
    var feeUnit = document.getElementById('lp-fee-unit').value;
    feeYears  = dlToYears(feeDur, feeUnit);
    feeIncome = (feeYears > 0 && feeAprVal > 0) ? lpVal * (feeAprVal / 100) * feeYears : 0;
  }

  // ── Populate results ──────────────────────────────────────────────────────

  // Starting position
  document.getElementById('lp-res-a-start-lbl').textContent = tokenA + ' deposited';
  document.getElementById('lp-res-b-start-lbl').textContent = tokenB + ' deposited';
  document.getElementById('lp-res-a-start').textContent =
    lpFmtQty(qtyA) + ' @ $' + dlFmt(priceA) + ' = $' + dlFmt(deposit / 2);
  document.getElementById('lp-res-b-start').textContent =
    lpFmtQty(qtyB) + ' @ $' + dlFmt(priceB) + ' = $' + dlFmt(deposit / 2);
  document.getElementById('lp-res-deposit').textContent = '$' + dlFmt(deposit);

  // LP position after price change
  document.getElementById('lp-res-a-lp-lbl').textContent = tokenA + ' (rebalanced)';
  document.getElementById('lp-res-b-lp-lbl').textContent = tokenB + ' (rebalanced)';
  document.getElementById('lp-res-a-lp').textContent =
    lpFmtQty(newQtyA) + ' @ $' + dlFmt(newPriceA) + ' = $' + dlFmt(newQtyA * newPriceA);
  document.getElementById('lp-res-b-lp').textContent =
    lpFmtQty(newQtyB) + ' @ $' + dlFmt(newPriceB) + ' = $' + dlFmt(newQtyB * newPriceB);
  document.getElementById('lp-res-lp-val').textContent = '$' + dlFmt(lpVal);

  // HODL comparison
  document.getElementById('lp-res-a-hodl-lbl').textContent = tokenA + ' (held)';
  document.getElementById('lp-res-b-hodl-lbl').textContent = tokenB + ' (held)';
  document.getElementById('lp-res-a-hodl').textContent =
    lpFmtQty(qtyA) + ' @ $' + dlFmt(newPriceA) + ' = $' + dlFmt(qtyA * newPriceA);
  document.getElementById('lp-res-b-hodl').textContent =
    lpFmtQty(qtyB) + ' @ $' + dlFmt(newPriceB) + ' = $' + dlFmt(qtyB * newPriceB);
  document.getElementById('lp-res-hodl-val').textContent = '$' + dlFmt(hodlVal);

  // IL hero
  var isZero  = Math.abs(ilPct) < 0.0001;
  var ilColor = isZero ? 'var(--text2)' : '#f87171';
  document.getElementById('lp-res-il-pct').textContent =
    isZero ? '0.00%' : ilPct.toFixed(4) + '%';
  document.getElementById('lp-res-il-pct').style.color = ilColor;
  document.getElementById('lp-res-il-amt').textContent = isZero
    ? 'No impermanent loss'
    : '$' + dlFmt(Math.abs(ilAmt)) + ' less than HODL';
  document.getElementById('lp-res-il-note').textContent = isZero
    ? 'Prices unchanged relative to each other — LP and HODL values match exactly.'
    : 'The pool auto-rebalanced to the new price ratio, giving you a different token mix than if you\'d held. This gap is impermanent loss.';

  // Fee income
  if (feeOn && feeIncome > 0) {
    var netDiff = lpVal + feeIncome - hodlVal;
    document.getElementById('lp-res-fee-apr').textContent = dlFmt(feeAprVal) + '% APR (simple estimate)';
    document.getElementById('lp-res-fee-dur').textContent = dlFmtYears(feeYears);
    document.getElementById('lp-res-fee-income').textContent = '+$' + dlFmt(feeIncome);
    var netEl = document.getElementById('lp-res-net');
    netEl.textContent = (netDiff >= 0 ? '+' : '') + '$' + dlFmt(Math.abs(netDiff)) +
      (netDiff >= 0 ? ' ahead of HODL' : ' behind HODL');
    netEl.style.color = netDiff >= 0 ? 'var(--pur-g)' : '#f87171';
    document.getElementById('lp-fee-result').style.display = '';
  } else {
    document.getElementById('lp-fee-result').style.display = 'none';
  }

  document.getElementById('lp-results').style.display = '';
  document.getElementById('lp-empty').style.display   = 'none';
  document.getElementById('lp-error').style.display   = 'none';
}

// ── DEFI LAB: Farming Instrument ──────────────────────────────────────────
function farmToggleRewardPrice(on) {
  document.getElementById('farm-reward-price-section').style.display = on ? '' : 'none';
}

function farmShowError(msg) {
  var el  = document.getElementById('farm-error');
  if (el) { el.textContent = msg; el.style.display = ''; }
  var r   = document.getElementById('farm-results');
  var emp = document.getElementById('farm-empty');
  if (r)   r.style.display   = 'none';
  if (emp) emp.style.display = '';
}

function farmCalc() {
  // ── Validate inputs ────────────────────────────────────────────────────
  var deposit = parseFloat(document.getElementById('farm-deposit').value);
  if (!deposit || deposit <= 0) { farmShowError('Enter a total deposit amount greater than 0.'); return; }

  var tokenA = (document.getElementById('farm-token-a').value || 'Token A').trim();
  var tokenB = (document.getElementById('farm-token-b').value || 'Token B').trim();

  var priceA = parseFloat(document.getElementById('farm-price-a').value);
  var priceB = parseFloat(document.getElementById('farm-price-b').value);
  if (!priceA || priceA <= 0) { farmShowError('Token A starting price must be greater than 0.'); return; }
  if (!priceB || priceB <= 0) { farmShowError('Token B starting price must be greater than 0.'); return; }

  var newPriceA = parseFloat(document.getElementById('farm-new-price-a').value);
  var newPriceB = parseFloat(document.getElementById('farm-new-price-b').value);
  if (!newPriceA || newPriceA <= 0) { farmShowError("Token A's new price must be greater than 0."); return; }
  if (!newPriceB || newPriceB <= 0) { farmShowError("Token B's new price must be greater than 0."); return; }

  var lpFeeApr = parseFloat(document.getElementById('farm-lp-fee-apr').value);
  if (isNaN(lpFeeApr) || lpFeeApr < 0) { farmShowError('LP fee APR must be 0 or greater.'); return; }

  var farmApr = parseFloat(document.getElementById('farm-reward-apr').value);
  if (isNaN(farmApr) || farmApr < 0) { farmShowError('Farm reward APR must be 0 or greater.'); return; }

  var durVal  = parseFloat(document.getElementById('farm-dur-val').value);
  var durUnit = document.getElementById('farm-dur-unit').value;
  if (!durVal || durVal <= 0) { farmShowError('Time period must be greater than 0.'); return; }
  var years = dlToYears(durVal, durUnit);

  var rewardToken     = (document.getElementById('farm-reward-token').value || 'Reward Token').trim();
  var showRwdPrice    = document.getElementById('farm-reward-price-toggle').checked;
  var rewardTokenPrice = showRwdPrice ? (parseFloat(document.getElementById('farm-reward-price').value) || 0) : 0;

  // ── LP Math — exact same verified formula as Stage 2 ──────────────────
  var qtyA = deposit / 2 / priceA;
  var qtyB = deposit / 2 / priceB;
  var k    = qtyA * qtyB; // constant product x * y = k

  var newQtyA = Math.sqrt(k * newPriceB / newPriceA);
  var newQtyB = Math.sqrt(k * newPriceA / newPriceB);

  var lpVal   = newQtyA * newPriceA + newQtyB * newPriceB;
  var hodlVal = qtyA * newPriceA + qtyB * newPriceB;

  // IL = (2√r)/(1+r) − 1  where r = relative price ratio change
  var priceRatio = (newPriceA / newPriceB) / (priceA / priceB);
  var ilFrac = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  var ilPct  = ilFrac * 100;
  var ilAmt  = ilFrac * hodlVal; // always ≤ 0

  // ── Income — APR applied to LP position value (not original deposit) ───
  // Fee and farm income accrue on the rebalanced LP position's USD value,
  // proportional to pool share — not on the static entry deposit.
  var lpFeeIncome = lpVal * (lpFeeApr / 100) * years;
  var farmIncome  = lpVal * (farmApr / 100) * years;
  var rewardUnits = (showRwdPrice && rewardTokenPrice > 0) ? farmIncome / rewardTokenPrice : 0;
  var totalIncome = lpFeeIncome + farmIncome;

  // ── Net result: IL drag + LP fees + farm rewards ───────────────────────
  // netDiff = (lpVal + lpFeeIncome + farmIncome) - hodlVal
  //         = ilAmt + lpFeeIncome + farmIncome  (since lpVal - hodlVal = ilAmt)
  var netDiff = ilAmt + lpFeeIncome + farmIncome;
  var netPct  = hodlVal > 0 ? (netDiff / hodlVal * 100) : 0;

  // ── Populate results ──────────────────────────────────────────────────

  // Starting position
  document.getElementById('farm-res-a-start-lbl').textContent = tokenA + ' deposited';
  document.getElementById('farm-res-b-start-lbl').textContent = tokenB + ' deposited';
  document.getElementById('farm-res-a-start').textContent =
    lpFmtQty(qtyA) + ' @ $' + dlFmt(priceA) + ' = $' + dlFmt(deposit / 2);
  document.getElementById('farm-res-b-start').textContent =
    lpFmtQty(qtyB) + ' @ $' + dlFmt(priceB) + ' = $' + dlFmt(deposit / 2);
  document.getElementById('farm-res-deposit').textContent = '$' + dlFmt(deposit);

  // LP after price change
  document.getElementById('farm-res-a-lp-lbl').textContent = tokenA + ' (rebalanced)';
  document.getElementById('farm-res-b-lp-lbl').textContent = tokenB + ' (rebalanced)';
  document.getElementById('farm-res-a-lp').textContent =
    lpFmtQty(newQtyA) + ' @ $' + dlFmt(newPriceA) + ' = $' + dlFmt(newQtyA * newPriceA);
  document.getElementById('farm-res-b-lp').textContent =
    lpFmtQty(newQtyB) + ' @ $' + dlFmt(newPriceB) + ' = $' + dlFmt(newQtyB * newPriceB);
  document.getElementById('farm-res-lp-val').textContent  = '$' + dlFmt(lpVal);
  document.getElementById('farm-res-hodl-val').textContent = '$' + dlFmt(hodlVal);

  var isILZero = Math.abs(ilPct) < 0.0001;
  var ilEl = document.getElementById('farm-res-il');
  ilEl.textContent = isILZero
    ? '0.00% — no impermanent loss'
    : ilPct.toFixed(4) + '% (−$' + dlFmt(Math.abs(ilAmt)) + ' drag)';
  ilEl.style.color = isILZero ? 'var(--text2)' : '#f87171';

  // Income
  document.getElementById('farm-res-lp-fees').textContent =
    '+$' + dlFmt(lpFeeIncome) + '  (' + lpFeeApr.toFixed(2) + '% APR · ' + dlFmtYears(years) + ')';
  document.getElementById('farm-res-farm-income').textContent =
    '+$' + dlFmt(farmIncome) + '  (' + farmApr.toFixed(2) + '% APR · ' + dlFmtYears(years) + ')';
  document.getElementById('farm-res-total-income').textContent = '+$' + dlFmt(totalIncome);

  // Reward token quantity (if price set)
  if (showRwdPrice && rewardTokenPrice > 0 && rewardUnits > 0) {
    document.getElementById('farm-res-units-lbl').textContent = rewardToken + ' earned';
    document.getElementById('farm-res-units').textContent =
      lpFmtQty(rewardUnits) + ' ' + rewardToken + ' @ $' + dlFmt(rewardTokenPrice) + '/token';
    document.getElementById('farm-res-units-row').style.display = '';
  } else {
    document.getElementById('farm-res-units-row').style.display = 'none';
  }

  // Net result hero
  var netIsPos = netDiff > 0.005;
  var netIsNeg = netDiff < -0.005;
  var netColor = netIsPos ? 'var(--pur-g)' : (netIsNeg ? '#f87171' : 'var(--text2)');
  document.getElementById('farm-res-net-pct').textContent =
    (netIsPos ? '+' : '') + netPct.toFixed(2) + '%';
  document.getElementById('farm-res-net-pct').style.color = netColor;
  var netAmtStr = (netIsPos ? '+' : (netIsNeg ? '−' : '')) + '$' + dlFmt(Math.abs(netDiff)) +
    (netIsPos ? ' ahead of HODL' : (netIsNeg ? ' behind HODL' : ' vs HODL'));
  document.getElementById('farm-res-net-amt').textContent = netAmtStr;
  document.getElementById('farm-res-net-amt').style.color = netColor;

  // Breakdown (multi-line for mobile readability)
  var ilLine = isILZero
    ? '<span>IL: </span><span style="color:var(--text2);">none</span>'
    : '<span>IL drag: </span><span style="color:#f87171;">−$' + dlFmt(Math.abs(ilAmt)) + '</span>';
  var feeLine  = '<span>LP fees: </span><span style="color:var(--pur-g);">+$' + dlFmt(lpFeeIncome) + '</span>';
  var farmLine = '<span>Farm rewards: </span><span style="color:var(--pur-g);">+$' + dlFmt(farmIncome) + '</span>';
  var netLine  = '<span>Net: </span><span style="color:' + netColor + ';font-weight:600;">' +
    (netIsPos ? '+' : (netIsNeg ? '−' : '')) + '$' + dlFmt(Math.abs(netDiff)) + '</span>';
  document.getElementById('farm-res-breakdown').innerHTML =
    ilLine + '<br>' + feeLine + '<br>' + farmLine +
    '<div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:.35rem;padding-top:.35rem;">' + netLine + '</div>';

  document.getElementById('farm-results').style.display = '';
  document.getElementById('farm-empty').style.display   = 'none';
  document.getElementById('farm-error').style.display   = 'none';
}

// ── DEFI LAB: Borrowing Instrument ────────────────────────────────────────
function borrowShowError(msg) {
  var el  = document.getElementById('borrow-error');
  if (el) { el.textContent = msg; el.style.display = ''; }
  var r   = document.getElementById('borrow-results');
  var emp = document.getElementById('borrow-empty');
  if (r)   r.style.display   = 'none';
  if (emp) emp.style.display = '';
}

function borrowFillMax() {
  var c   = parseFloat(document.getElementById('borrow-collateral').value) || 0;
  var ltv = parseFloat(document.getElementById('borrow-max-ltv').value)    || 60;
  if (c <= 0 || ltv <= 0) return;
  document.getElementById('borrow-amount').value = (c * ltv / 100).toFixed(2);
}

function borrowHealthColor(h) {
  if (h < 10)  return '#f87171';
  if (h < 25)  return '#f97316';
  if (h < 50)  return 'var(--gold-l)';
  return 'var(--pur-g)';
}

function borrowCalc() {
  var collTokenLabel = (document.getElementById('borrow-collateral-token').value || 'Example Token').trim();
  var collateral     = parseFloat(document.getElementById('borrow-collateral').value);
  var maxLTV         = parseFloat(document.getElementById('borrow-max-ltv').value);
  var borrowAmt      = parseFloat(document.getElementById('borrow-amount').value);
  var borrowApr      = parseFloat(document.getElementById('borrow-apr').value);
  var durVal         = parseFloat(document.getElementById('borrow-dur-val').value);
  var durUnit        = document.getElementById('borrow-dur-unit').value;
  var priceChangePct = parseFloat(document.getElementById('borrow-price-change').value);

  if (!collateral || collateral <= 0)             { borrowShowError('Enter a collateral value greater than 0.'); return; }
  if (isNaN(maxLTV) || maxLTV <= 0 || maxLTV >= 100) { borrowShowError('Max LTV must be between 1 and 99.'); return; }
  if (!borrowAmt || borrowAmt <= 0)               { borrowShowError('Enter a borrow amount greater than 0.'); return; }
  if (isNaN(borrowApr) || borrowApr < 0)          { borrowShowError('Borrow APY must be 0 or greater.'); return; }
  if (!durVal || durVal <= 0)                     { borrowShowError('Time period must be greater than 0.'); return; }
  if (isNaN(priceChangePct))                      { borrowShowError('Enter a valid price change (e.g. -20 for a 20% drop).'); return; }

  var years     = dlToYears(durVal, durUnit);
  var maxBorrow = collateral * (maxLTV / 100);

  if (borrowAmt > maxBorrow + 0.001) {
    borrowShowError('Borrow amount ($' + dlFmt(borrowAmt) + ') exceeds the max allowed at ' +
      maxLTV.toFixed(1) + '% LTV ($' + dlFmt(maxBorrow) + '). Use "Borrow Max" to fill the cap, or reduce the amount.');
    return;
  }

  // Core math
  var currentLTV   = (borrowAmt / collateral) * 100;
  var loanHealth   = (1 - currentLTV / maxLTV) * 100;
  var borrowRoom   = maxBorrow - borrowAmt;
  var liqFloor     = borrowAmt / (maxLTV / 100);          // $ collateral value at which liquidation triggers
  var dropToLiq    = ((liqFloor - collateral) / collateral) * 100; // negative %

  // Interest
  var interestOwed = borrowAmt * (borrowApr / 100) * years;
  var totalRepay   = borrowAmt + interestOwed;

  // Price scenario
  var newCollateral = collateral * (1 + priceChangePct / 100);
  var newLTV        = newCollateral > 0 ? (borrowAmt / newCollateral) * 100 : Infinity;
  var newLoanHealth = (1 - newLTV / maxLTV) * 100;
  var isLiquidated  = newCollateral <= liqFloor || newLTV >= maxLTV;

  // Position card
  document.getElementById('borrow-res-coll-lbl').textContent   = collTokenLabel + ' locked as collateral';
  document.getElementById('borrow-res-collateral').textContent  = '$' + dlFmt(collateral);
  document.getElementById('borrow-res-max-ltv-label').textContent = maxLTV.toFixed(1) + '%';
  document.getElementById('borrow-res-max-borrow').textContent  = '$' + dlFmt(maxBorrow);
  document.getElementById('borrow-res-borrowed').textContent    = '$' + dlFmt(borrowAmt);
  document.getElementById('borrow-res-room').textContent        = '$' + dlFmt(borrowRoom) + ' available';
  document.getElementById('borrow-res-ltv').textContent         = currentLTV.toFixed(2) + '%';

  // Loan health card
  var hColor = borrowHealthColor(loanHealth);
  var hPct   = Math.max(0, Math.min(100, loanHealth));
  document.getElementById('borrow-health-fill').style.width      = hPct + '%';
  document.getElementById('borrow-health-fill').style.background = hColor;
  document.getElementById('borrow-health-pct').textContent       = loanHealth.toFixed(1) + '%';
  document.getElementById('borrow-health-pct').style.color       = hColor;
  var healthLabel = loanHealth >= 50 ? 'Safe'
    : loanHealth >= 25 ? 'Moderate — monitor your position'
    : loanHealth >= 10 ? 'Low — consider adding collateral'
    : loanHealth > 0   ? 'Very Low — high liquidation risk'
    : 'At limit — liquidation can trigger';
  document.getElementById('borrow-health-status').textContent = healthLabel;
  document.getElementById('borrow-health-status').style.color = hColor;
  document.getElementById('borrow-res-ltv2').textContent =
    currentLTV.toFixed(2) + '% of ' + maxLTV.toFixed(1) + '% limit';
  document.getElementById('borrow-res-drop-room').textContent =
    Math.abs(dropToLiq).toFixed(2) + '% ($' + dlFmt(Math.abs(collateral - liqFloor)) + ')';
  document.getElementById('borrow-res-liq-floor').textContent =
    '$' + dlFmt(liqFloor) + ' collateral value';

  // Price scenario card
  var pcSign = priceChangePct >= 0 ? '+' : '';
  document.getElementById('borrow-res-price-change').textContent = pcSign + priceChangePct.toFixed(1) + '%';
  document.getElementById('borrow-res-new-coll').textContent     = '$' + dlFmt(newCollateral);
  var newLTVEl    = document.getElementById('borrow-res-new-ltv');
  var newHealthEl = document.getElementById('borrow-res-new-health');
  if (isLiquidated) {
    newLTVEl.textContent    = '≥ ' + maxLTV.toFixed(1) + '% — at or above limit';
    newLTVEl.style.color    = '#f87171';
    newHealthEl.textContent = '0% — liquidation triggered';
    newHealthEl.style.color = '#f87171';
  } else {
    var nhColor = borrowHealthColor(newLoanHealth);
    newLTVEl.textContent    = newLTV.toFixed(2) + '% (limit: ' + maxLTV.toFixed(1) + '%)';
    newLTVEl.style.color    = '';
    newHealthEl.textContent = newLoanHealth.toFixed(2) + '%';
    newHealthEl.style.color = nhColor;
  }
  document.getElementById('borrow-liq-warning').style.display = isLiquidated ? '' : 'none';
  document.getElementById('borrow-safe-msg').style.display    = (!isLiquidated && priceChangePct < 0) ? '' : 'none';

  // Interest card
  document.getElementById('borrow-res-apr').textContent      = borrowApr.toFixed(2) + '% APY (variable — your assumption)';
  document.getElementById('borrow-res-time').textContent     = dlFmtYears(years);
  document.getElementById('borrow-res-interest').textContent = '−$' + dlFmt(interestOwed);
  document.getElementById('borrow-res-repay').textContent    = '$' + dlFmt(totalRepay) + ' (principal + interest)';

  document.getElementById('borrow-results').style.display = '';
  document.getElementById('borrow-empty').style.display   = 'none';
  document.getElementById('borrow-error').style.display   = 'none';
}

// ── DEFI LAB: Staking Instrument ──────────────────────────────────────────
var _STAKE = {mode: 'compound'};

function stakeShowError(msg) {
  var el  = document.getElementById('stake-error');
  if (el) { el.textContent = msg; el.style.display = ''; }
  var r   = document.getElementById('stake-results');
  var emp = document.getElementById('stake-empty');
  if (r)   r.style.display   = 'none';
  if (emp) emp.style.display = '';
}

function stakeSetMode(mode) {
  _STAKE.mode = mode;
  document.querySelectorAll('.dl-mode-btn[onclick*="stakeSetMode"]').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-mode') === mode);
  });
  var freqWrap = document.getElementById('stake-freq-wrap');
  if (freqWrap) freqWrap.style.display = mode === 'compound' ? '' : 'none';
  var hint = document.getElementById('stake-mode-hint');
  if (hint) hint.textContent = mode === 'compound'
    ? 'Rewards are restaked, compounding over time.'
    : 'Rewards are paid out, not restaked — simple linear growth.';
}

function stakeCalc() {
  var token      = (document.getElementById('stake-token').value || 'Example Token').trim();
  var P          = parseFloat(document.getElementById('stake-principal').value);
  var rate       = parseFloat(document.getElementById('stake-rate').value);
  var durVal     = parseFloat(document.getElementById('stake-dur-val').value);
  var durUnit    = document.getElementById('stake-dur-unit').value;
  var isCompound = _STAKE.mode === 'compound';

  if (!P || P <= 0)             { stakeShowError('Enter a stake amount greater than 0.'); return; }
  if (isNaN(rate) || rate < 0)  { stakeShowError('Annual reward rate must be 0 or greater.'); return; }
  if (!durVal || durVal <= 0)   { stakeShowError('Time period must be greater than 0.'); return; }

  var years = dlToYears(durVal, durUnit);
  var total, rewards, rateLabel;

  if (isCompound) {
    var freq = document.getElementById('stake-freq').value;
    var n    = dlFreqToN(freq);
    total   = dlCompound(P, rate / 100, n, years);
    rewards = total - P;
    var effectiveAPY = years > 0.001 ? (Math.pow(total / P, 1 / years) - 1) * 100 : rate;
    rateLabel = rate.toFixed(2) + '% APR, compounded ' + freq
      + ' → ' + effectiveAPY.toFixed(3) + '% effective APY';
  } else {
    rewards   = P * (rate / 100) * years;
    total     = P + rewards;
    rateLabel = rate.toFixed(2) + '% APR — simple, rewards paid out';
  }

  var growthPct = P > 0 ? (rewards / P) * 100 : 0;

  // Hero
  document.getElementById('stake-res-total').textContent     = dlFmt(total);
  document.getElementById('stake-res-token-sub').textContent = token;
  document.getElementById('stake-res-growth').textContent    = '+' + growthPct.toFixed(2) + '% growth';

  // Breakdown
  document.getElementById('stake-res-staked-lbl').textContent  = token + ' staked';
  document.getElementById('stake-res-principal').textContent   = dlFmt(P);
  document.getElementById('stake-res-rewards-lbl').textContent = isCompound
    ? 'Staking rewards (restaked — compounded)' : 'Staking rewards (paid out)';
  document.getElementById('stake-res-rewards').textContent     = '+' + dlFmt(rewards);
  document.getElementById('stake-res-total2').textContent      = dlFmt(total) + ' ' + token;
  document.getElementById('stake-res-time').textContent        = dlFmtYears(years);
  document.getElementById('stake-res-rate').textContent        = rateLabel;

  document.getElementById('stake-results').style.display = '';
  document.getElementById('stake-empty').style.display   = 'none';
  document.getElementById('stake-error').style.display   = 'none';
}

/* ── Event delegation, replacing the inline handlers ──────────────────────── */
var FX = {
  dlSetInstrument: dlSetInstrument, dlSetMode: dlSetMode, dlAddSeg: dlAddSeg,
  dlRemoveSeg: dlRemoveSeg, dlCalc: dlCalc, dlTimeJump: dlTimeJump,
  lpCalc: lpCalc, farmCalc: farmCalc, borrowCalc: borrowCalc,
  borrowFillMax: borrowFillMax, stakeCalc: stakeCalc, stakeSetMode: stakeSetMode
};
var FXC = { lpToggleFee: lpToggleFee, farmToggleRewardPrice: farmToggleRewardPrice };

document.addEventListener('click', function(e){
  var t = e.target.closest ? e.target.closest('[data-fx]') : null;
  if (!t) return;
  var fn = FX[t.getAttribute('data-fx')];
  if (!fn) return;
  var arg = t.getAttribute('data-arg');
  e.preventDefault();
  if (arg === null) fn(); else fn(isNaN(arg) || arg === '' ? arg : Number(arg));
});

document.addEventListener('change', function(e){
  var t = e.target.closest ? e.target.closest('[data-fxchange]') : null;
  if (!t) return;
  var fn = FXC[t.getAttribute('data-fxchange')];
  if (fn) fn(t.checked);
});

/* The segment editor is rendered on load in the original page's boot sequence. */
if (typeof dlRenderSegments === 'function') { try { dlRenderSegments(); } catch(e){} }
})();
