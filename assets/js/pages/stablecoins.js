/* /learn/stablecoins-payments (v3, 2026-10-28)
   1) Follow one dollar: step through minting and redeeming Metal Dollar (XMD).
   2) The treasury, live: reads the xmd.treasury `tokens` table, the treasury's balance of each reserve token,
      and the XMD supply, straight from public XPR servers (the four the site's CSP allows). Read-only.
      A failed read says so; it is never shown as zero. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  /* ---------- 1. follow one dollar ---------- */
  var flow = $('[data-sc-flow]');
  if (flow) {
    var stations = $$('[data-st]', flow);           /* left to right: reserve, treasury, xmd */
    var coin = $('.sc-coin', flow);
    var say = $('[data-sc-say]');
    var tabs = $$('[data-mode]');
    var prev = $('[data-sc-prev]'), next = $('[data-sc-next]'), play = $('[data-sc-play]');
    var SCRIPT = {
      mint: [
        { at: 0, xmd: false, t: 'You hold a reserve stablecoin on XPR Network, for example USDC, which lives on XPR as the X-token XUSDC.', s: 'The basket also takes PYUSD (PayPal) and USDP (Paxos).' },
        { at: 1, xmd: false, t: 'You deposit it with the Metal Dollar treasury, the contract xmd.treasury, through Metal X. The protocol rate is fixed: one for one.', s: 'Minting is not buying. Buying XMD on a market is a separate trade, at the market price.' },
        { at: 2, xmd: true, t: 'The treasury mints the same number of XMD to your wallet. XMD is the token on the contract xmd.token.', s: 'Availability, account verification and network support still apply.' }
      ],
      redeem: [
        { at: 2, xmd: true, t: 'You hold XMD and want dollars-in-crypto back.', s: 'Redeeming is not selling on a market; it goes to the treasury.' },
        { at: 1, xmd: true, t: 'You return the XMD to the Metal Dollar treasury, xmd.treasury.', s: 'The rate is the same fixed one for one.' },
        { at: 0, xmd: false, t: 'You get an available reserve stablecoin back, one for one.', s: 'Which reserves are available can change; the live readout below shows which ones have minting and redemption switched on in the treasury table.' }
      ]
    };
    var mode = 'mint', step = 0, timer = null;
    var narrow = window.matchMedia('(max-width: 700px)');
    function place(i) {
      var st = stations[i], ring = st.querySelector('.ring');
      if (narrow.matches) {
        coin.style.left = '';
        coin.style.setProperty('--cy', (st.offsetTop + ring.offsetTop + ring.offsetHeight / 2 - 19) + 'px');
      } else {
        coin.style.left = (st.offsetLeft + ring.offsetLeft + ring.offsetWidth / 2 - 19) + 'px';
      }
    }
    function render() {
      var s = SCRIPT[mode][step];
      place(s.at);
      coin.classList.toggle('xmd', s.xmd);
      coin.textContent = s.xmd ? 'XMD' : '$';
      stations.forEach(function (x, i) { if (i === s.at) x.setAttribute('aria-current', 'step'); else x.removeAttribute('aria-current'); });
      say.innerHTML = '<p><b>Step ' + (step + 1) + ' of 3.</b> ' + esc(s.t) + '</p><small>' + esc(s.s) + '</small>';
      prev.disabled = step === 0; next.disabled = step === 2;
    }
    function setMode(m) {
      mode = m; step = 0; stop();
      tabs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'); });
      render();
    }
    function stop() { clearInterval(timer); timer = null; play.textContent = 'Play'; }
    function run() {
      if (timer) { stop(); return; }
      step = 0; render(); play.textContent = 'Pause';
      timer = setInterval(function () { if (step >= 2) { stop(); return; } step++; render(); }, reduce ? 2600 : 1900);
    }
    tabs.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });
    prev.addEventListener('click', function () { stop(); if (step > 0) { step--; render(); } });
    next.addEventListener('click', function () { stop(); if (step < 2) { step++; render(); } });
    play.addEventListener('click', run);
    stations.forEach(function (st, i) {
      st.addEventListener('click', function () {
        stop();
        var k = SCRIPT[mode].map(function (s) { return s.at; }).indexOf(i);
        if (k > -1) { step = k; render(); }
      });
    });
    window.addEventListener('resize', function () { place(SCRIPT[mode][step].at); });
    render();
    if (!reduce && 'IntersectionObserver' in window) {
      var once = false;
      new IntersectionObserver(function (es) { if (es[0].isIntersecting && !once) { once = true; run(); } }, { threshold: 0.5 }).observe(flow);
    }
  }

  /* ---------- 2. the treasury, live ---------- */
  var live = $('[data-sc-live]');
  if (!live) return;
  var RPCS = ['https://api.protonnz.com', 'https://proton.eosusa.io', 'https://proton.cryptolions.io', 'https://api-xprnetwork-main.saltant.io'];
  var good = 0;
  function rpc(path, body) {
    var order = RPCS.slice(good).concat(RPCS.slice(0, good)), i = 0;
    return new Promise(function (resolve, reject) {
      (function nextHost() {
        if (i >= order.length) { reject(new Error('all servers failed')); return; }
        var url = order[i++];
        var ctl = window.AbortController ? new AbortController() : null;
        var t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
        fetch(url + path, { method: 'POST', body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
          .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (j) { good = RPCS.indexOf(url); resolve({ data: j, host: url.replace('https://', '') }); })
          .catch(function () { clearTimeout(t); nextHost(); });
      })();
    });
  }
  /* What each reserve is, from MetalXPRt's guide (ECOSYSTEM.md §1c, checked 2026-10-25). */
  var NAMES = {
    'XUSDC@xtokens': ['USDC', 'Circle\'s dollar stablecoin, on XPR as the X-token XUSDC.', '#f2c25b'],
    'XPYUSD@xtokens': ['PYUSD', 'PayPal\'s dollar stablecoin, on XPR as XPYUSD.', '#9b5cff'],
    'XPAX@xtokens': ['USDP', 'Paxos\'s dollar stablecoin. It keeps USDP\'s old name, Paxos Standard (PAX), so on XPR it is XPAX.', '#7dd3fc'],
    'MPD@mpd.token': ['MPD', 'Metal Pay Dollar. Metallicus\'s Q2 2025 report calls it an internal prototype, held only by Metallicus wallets during a controlled rollout. Newer reports don\'t mention it.', '#f0a6c0']
  };
  var EXTRA = ['#ffdf94', '#c7a6ff', '#a7f3d0', '#fca5a5'];
  var donut = $('[data-sc-donut]', live), rows = $('[data-sc-rows]', live), mid = $('[data-sc-mid]', live), sum = $('[data-sc-sum]', live), note = $('[data-sc-note]', live);

  function load() {
    rows.innerHTML = '<li><i></i><span>Reading the treasury from a public XPR server…</span><span></span></li>';
    mid.innerHTML = '<b>…</b><span>XMD in supply</span>';
    var hosts = {};
    rpc('/v1/chain/get_table_rows', { code: 'xmd.treasury', scope: 'xmd.treasury', table: 'tokens', json: true, limit: 50 })
      .then(function (r) {
        hosts[r.host] = 1;
        var list = (r.data && r.data.rows) || [];
        if (!list.length) throw new Error('empty');
        return Promise.all(list.map(function (row) {
          var code = String(row.symbol.sym).split(',')[1], contract = row.symbol.contract;
          return rpc('/v1/chain/get_currency_balance', { code: contract, account: 'xmd.treasury', symbol: code })
            .then(function (b) { hosts[b.host] = 1; var v = Array.isArray(b.data) && b.data[0] ? parseFloat(b.data[0]) : 0; return { row: row, code: code, contract: contract, bal: v, ok: true }; })
            .catch(function () { return { row: row, code: code, contract: contract, bal: null, ok: false }; });
        })).then(function (items) {
          return rpc('/v1/chain/get_currency_stats', { code: 'xmd.token', symbol: 'XMD' })
            .then(function (s) { hosts[s.host] = 1; return { items: items, supply: s.data && s.data.XMD ? parseFloat(s.data.XMD.supply) : null }; })
            .catch(function () { return { items: items, supply: null }; });
        });
      })
      .then(function (res) { draw(res, Object.keys(hosts)); })
      .catch(function () {
        rows.innerHTML = '<li><i></i><span class="sc-bad">Couldn\'t read the chain just now. That is a failed read, not an empty treasury.</span><span></span></li>';
        mid.innerHTML = '<b>—</b><span>couldn\'t read</span>';
        donut.querySelectorAll('.seg').forEach(function (s) { s.remove(); });
        sum.innerHTML = '';
      });
  }

  function draw(res, hosts) {
    var items = res.items, k = 0;
    var total = items.reduce(function (a, it) { return a + (it.ok ? it.bal : 0); }, 0);
    var missed = items.filter(function (it) { return !it.ok; }).length;
    var ofWhat = missed ? '% of what was read' : '% of holdings';
    function pct(s) { var v = s * 100; return v > 0 && v < 0.1 ? 'under 0.1' : fmt(v, 1); }
    var C = 2 * Math.PI * 42, acc = 0;
    donut.querySelectorAll('.seg').forEach(function (s) { s.remove(); });
    rows.innerHTML = '';
    items.sort(function (a, b) { return (b.bal || 0) - (a.bal || 0); }).forEach(function (it) {
      var key = it.code + '@' + it.contract, info = NAMES[key] || [it.code, it.code + ' on ' + it.contract + '.', EXTRA[k++ % EXTRA.length]];
      var share = it.ok && total > 0 ? it.bal / total : 0;
      if (it.ok && share > 0) {
        var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('class', 'seg'); c.setAttribute('cx', 50); c.setAttribute('cy', 50); c.setAttribute('r', 42);
        c.setAttribute('stroke', info[2]);
        c.setAttribute('stroke-dasharray', (share * C) + ' ' + C);
        c.setAttribute('stroke-dashoffset', String(-acc * C));
        donut.querySelector('svg').appendChild(c);
        acc += share;
      }
      // these are the table's switches, not proof that a mint or redemption will go through
      var flags = (+it.row.isMintEnabled ? 'minting switched on' : 'minting switched off') + ' · ' + (+it.row.isRedeemEnabled ? 'redemption switched on' : 'redemption switched off') + ' (table setting)';
      var mf = parseFloat(it.row.mintFee), rf = parseFloat(it.row.redemptionFee);
      flags += (mf === 0 && rf === 0) ? ' · no mint or redemption fee set' : ' · fees in the table: mint ' + it.row.mintFee + ', redeem ' + it.row.redemptionFee;
      var cap = parseFloat(it.row.maxTreasuryPercent);
      var li = document.createElement('li');
      li.innerHTML = '<i style="background:' + info[2] + '"></i>' +
        '<span><b>' + esc(info[0]) + '</b> <code>' + esc(key) + '</code><small>' + esc(info[1]) + '</small><small>' + esc(flags) + ' · configured limit ' + fmt(cap, 0) + '% (a setting; this page can\'t show if or how it is enforced)</small></span>' +
        '<span class="amt">' + (it.ok ? fmt(it.bal, 2) + '<small>' + (total > 0 ? pct(share) + ofWhat : '') + '</small>' : '<span class="sc-bad">couldn\'t read</span>') + '</span>';
      rows.appendChild(li);
    });
    mid.innerHTML = res.supply === null ? '<b>—</b><span>XMD supply: couldn\'t read</span>' : '<b>' + fmt(res.supply, 0) + '</b><span>XMD in supply</span>';
    var when = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    sum.innerHTML = '<span><span class="sc-live-tag">LIVE</span>read at ' + esc(when) + ' from ' + esc(hosts.join(', ')) + '</span>' +
      (missed ? '<span class="sc-bad">' + missed + ' of ' + items.length + ' reserve balances couldn\'t be read, so no total is shown.</span>'
        : '<span>Reserve tokens held by xmd.treasury: <b>' + fmt(total, 2) + '</b></span>') +
      (res.supply === null ? '' : '<span>XMD in supply: <b>' + fmt(res.supply, 2) + '</b></span>');
  }

  $('[data-sc-refresh]', live).addEventListener('click', load);
  if ('IntersectionObserver' in window) {
    var started = false;
    new IntersectionObserver(function (es) { if (es[0].isIntersecting && !started) { started = true; load(); } }, { rootMargin: '200px' }).observe(live);
  } else load();
})();
