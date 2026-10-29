/* StandGuard A+B: the live and interactive parts.
   Reads only public XPR Network RPC servers that the site's CSP already allows (the same
   four the Account Check uses). Never signs, never connects a wallet, never stores what
   you type. A read that fails is shown as "couldn't read", never as zero. */
(function () {
  'use strict';
  var RPCS = ['https://api.protonnz.com', 'https://proton.eosusa.io', 'https://proton.cryptolions.io', 'https://api-xprnetwork-main.saltant.io'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NAME_RE = /^[a-z1-5.]{1,12}$/;
  var good = 0; /* index of the last server that answered */

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function host(u) { return u.replace('https://', ''); }

  function rpc(path, body) {
    var order = RPCS.slice(good).concat(RPCS.slice(0, good));
    var i = 0;
    return new Promise(function (resolve, reject) {
      (function next() {
        if (i >= order.length) { reject(new Error('all servers failed')); return; }
        var url = order[i++];
        var ctl = window.AbortController ? new AbortController() : null;
        var t = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
        fetch(url + path, { method: 'POST', body: JSON.stringify(body || {}), signal: ctl ? ctl.signal : undefined })
          .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (j) { good = RPCS.indexOf(url); resolve({ data: j, server: url }); })
          .catch(function () { clearTimeout(t); next(); });
      })();
    });
  }
  /* Shared with page scripts (e.g. /preview/two-eyes) so every live read uses this one fallback. */
  window.SG = window.SG || {};
  window.SG.rpc = rpc;
  window.SG.host = host;

  /* ---------- 1. Live chain ticker (hero) ---------- */
  var tick = $('[data-live-chain]');
  if (tick) {
    var blockEl = $('[data-live-block]', tick), prodEl = $('[data-live-producer]', tick), srcEl = $('[data-live-src]', tick), dot = $('[data-live-dot]', tick);
    var shown = 0, timer = null, visible = true;
    var roll = function (to) {
      if (reduce || !shown || to - shown > 40 || to <= shown) { shown = to; blockEl.textContent = fmt(to); return; }
      var from = shown, start = performance.now();
      (function step(now) {
        var k = Math.min((now - start) / 900, 1);
        blockEl.textContent = fmt(Math.round(from + (to - from) * k));
        if (k < 1) requestAnimationFrame(step); else shown = to;
      })(start);
    };
    var poll = function () {
      rpc('/v1/chain/get_info').then(function (r) {
        roll(r.data.head_block_num);
        prodEl.textContent = r.data.head_block_producer;
        srcEl.textContent = host(r.server);
        dot.className = 'live-dot ok';
      }).catch(function () {
        blockEl.textContent = "couldn't read";
        prodEl.textContent = 'n/a';
        dot.className = 'live-dot bad';
      });
    };
    var start = function () { if (!timer) { poll(); timer = setInterval(poll, 3000); } };
    var stop = function () { clearInterval(timer); timer = null; };
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !document.hidden) start(); else stop(); }).observe(tick);
    } else start();
  }

  /* ---------- 2. Ask Guard.IAN: real answers, live numbers marked LIVE ---------- */
  var ask = $('[data-ask]');
  if (ask) {
    var out = $('[data-ask-out]', ask);
    var chips = $$('[data-q]', ask);
    var playing = 0;
    var line = function (html, cls) { var p = document.createElement('div'); p.className = 'al ' + (cls || ''); p.innerHTML = html; out.appendChild(p); return p; };
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); };
    var reveal = function (el) { requestAnimationFrame(function () { el.classList.add('on'); }); };
    var answers = {
      xmd: function (run) {
        line('<span class="who">You</span><b>Is XMD on xmd.token the real Metal Dollar?</b>', 'q on');
        var r1 = line('reading XPR Network\'s token registry', 'read'); reveal(r1);
        return wait(450).then(function () {
          if (run !== playing) return;
          var r2 = line('reading the XPR chain, live, from your browser', 'read'); reveal(r2);
          return rpc('/v1/chain/get_currency_stats', { code: 'xmd.token', symbol: 'XMD' }).then(function (r) {
            var s = r.data && r.data.XMD;
            if (!s) return { ok: false };
            var parts = String(s.supply).split(' ');
            return { ok: true, supply: fmt(parseFloat(parts[0]), 2) + ' ' + (parts[1] || 'XMD'), issuer: s.issuer, server: r.server };
          }).catch(function () { return { ok: false }; });
        }).then(function (live) {
          if (!live || run !== playing) return;
          var r3 = line('reading Metal X and Alcor markets', 'read'); reveal(r3);
          return wait(450).then(function () {
            if (run !== playing) return;
            var supply = live.ok ? '<span class="live">LIVE</span> On the chain right now: <b>' + esc(live.supply) + '</b> in supply, issuer <code>' + esc(live.issuer) + '</code>.' : 'The chain read failed just now, so I won\'t give a supply number.';
            var a = line('<span class="who ian">IAN</span><ul>' +
              '<li>XPR Network\'s token registry lists it as the Metallicus USD stablecoin, Metal Dollar, issued by <code>xmd.treasury</code>.</li>' +
              '<li>' + supply + '</li>' +
              '<li>Metal X lists it in 15 markets. Alcor labels it trusted (Alcor\'s own label, not a verdict).</li></ul>' +
              '<p class="cant"><b>Can\'t verify:</b> who controls the issuer\'s keys, or how deep the liquidity is.</p>' +
              '<p class="src">Registry, Metal X and Alcor: MetalXPRt\'s token check, 28 Oct 2026. ' + (live.ok ? 'Supply: read from ' + esc(host(live.server)) + ' just now.' : '') + '</p>', 'a');
            reveal(a);
          });
        });
      },
      chain: function (run) {
        line('<span class="who">You</span><b>Is XPR Network making blocks right now?</b>', 'q on');
        var r1 = line('reading the chain, live, from your browser', 'read'); reveal(r1);
        return rpc('/v1/chain/get_info').then(function (r) { return r; }).catch(function () { return null; }).then(function (r) {
          if (run !== playing) return;
          var a;
          if (!r) {
            a = line('<span class="who ian">IAN</span><p>I couldn\'t reach any of the four public XPR servers just now, so I can\'t say. That\'s a failed read, not proof the chain is down. Check the <a href="https://status.xprnetwork.org" rel="noopener">official status page</a>.</p>', 'a');
          } else {
            var d = r.data, lag = d.head_block_num - d.last_irreversible_block_num;
            a = line('<span class="who ian">IAN</span><ul>' +
              '<li><span class="live">LIVE</span> Newest block: <b>' + fmt(d.head_block_num) + '</b>, made by <code>' + esc(d.head_block_producer) + '</code>.</li>' +
              '<li>Final (can\'t be undone) up to block ' + fmt(d.last_irreversible_block_num) + ', about ' + Math.round(lag / 2) + ' seconds behind. XPR makes a block every half second.</li>' +
              '<li>So yes: blocks are being made. That says nothing about the bridge, deposits or withdrawals.</li></ul>' +
              '<p class="cant"><b>For outages:</b> the <a href="https://status.xprnetwork.org" rel="noopener">official XPR Network status page</a> is the source. MetalXPRt reads it live; this page can\'t.</p>' +
              '<p class="src">Read from ' + esc(host(r.server)) + ' just now (chain id 384da888…f437e0, XPR mainnet).</p>', 'a');
          }
          reveal(a);
        });
      },
      sdex: function (run) {
        line('<span class="who">You</span><b>How busy is SimpleDEX?</b>', 'q on');
        var r1 = line('reading the SimpleDEX indexer', 'read'); reveal(r1);
        return wait(650).then(function () {
          if (run !== playing) return;
          var a = line('<span class="who ian">IAN</span><ul>' +
            '<li><b>471</b> tokens launched, <b>393</b> of them graduated to a pool.</li>' +
            '<li><b>7,682</b> trades in the last day. The indexer counts <b>2,191</b> unique traders.</li>' +
            '<li>SimpleDEX is run by Proton NZ, not Metallicus.</li></ul>' +
            '<p class="cant"><b>Can\'t verify:</b> how much of that trading is real people rather than bots.</p>' +
            '<p class="src">Snapshot: MetalXPRt\'s <code>simpledex</code> tool, SimpleDEX indexer, 28 Oct 2026 18:51 UTC. Not live on this page.</p>', 'a');
          reveal(a);
        });
      }
    };
    var play = function (id) {
      playing++;
      var run = playing;
      out.innerHTML = '';
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-q') === id ? 'true' : 'false'); });
      answers[id](run);
    };
    chips.forEach(function (c) { c.addEventListener('click', function () { play(c.getAttribute('data-q')); }); });
    if ('IntersectionObserver' in window) {
      var once = false;
      new IntersectionObserver(function (es) { if (es[0].isIntersecting && !once) { once = true; play('xmd'); } }, { threshold: 0.3 }).observe(ask);
    } else play('xmd');
  }

  /* ---------- 3. Ecosystem map: click a logo, see what it is and how he reads it ---------- */
  var eco = $('[data-eco]');
  if (eco) {
    var nodes = $$('[data-node]', eco), card = $('[data-eco-card]', eco), beam = $('[data-beam]', eco);
    var auto = null, touched = false;
    var pick = function (n, user) {
      if (user) { touched = true; clearInterval(auto); }
      nodes.forEach(function (x) { x.setAttribute('aria-pressed', x === n ? 'true' : 'false'); });
      var d = n.dataset;
      card.innerHTML =
        '<p class="eco-who">' + esc(d.maker) + ' · <span class="st st-' + esc(d.stclass) + '">' + esc(d.status) + '</span></p>' +
        '<h3>' + esc(d.name) + '</h3><p>' + esc(d.what) + '</p>' +
        (d.tool ? '<p class="eco-tool">Guard.IAN reads it with <code>' + esc(d.tool) + '</code>' + (d.toolwhat ? ': ' + esc(d.toolwhat) : '') + '</p>' : (d.toolwhat ? '<p class="eco-tool">' + esc(d.toolwhat) + '</p>' : '')) +
        '<p class="eco-links"><a href="' + esc(d.url) + '" rel="noopener">Official site ↗</a>' + (d.learn ? ' <a href="' + esc(d.learn) + '">Learn more</a>' : '') + '</p>';
      if (beam) {
        var box = eco.querySelector('.orbit').getBoundingClientRect(), r = n.getBoundingClientRect();
        var x = r.left + r.width / 2 - box.left, y = r.top + r.height / 2 - box.top;
        beam.setAttribute('x2', x); beam.setAttribute('y2', y);
        beam.setAttribute('x1', box.width / 2); beam.setAttribute('y1', box.height / 2);
      }
    };
    nodes.forEach(function (n) {
      n.addEventListener('click', function () { pick(n, true); });
      n.addEventListener('focus', function () { pick(n, true); });
    });
    var idx = 0;
    var cycle = function () { if (touched) return; idx = (idx + 1) % nodes.length; pick(nodes[idx]); };
    pick(nodes[0]);
    window.addEventListener('resize', function () { var cur = $('[data-node][aria-pressed="true"]', eco); if (cur) pick(cur); });
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { eco.classList.add('assembled'); setTimeout(function () { var cur = $('[data-node][aria-pressed="true"]', eco); if (cur) pick(cur); }, 1300); if (!auto && !touched) auto = setInterval(cycle, 4200); }
        else { clearInterval(auto); auto = null; }
      }, { threshold: 0.35 }).observe(eco);
      eco.addEventListener('mouseenter', function () { clearInterval(auto); auto = null; });
    } else eco.classList.add('assembled');
  }

  /* ---------- 4. Mini account check inside the desk ---------- */
  var mini = $('[data-mini-check]');
  if (mini) {
    var input = $('input', mini), res = $('[data-mini-out]', mini);
    var gen = 0; // only the newest lookup may write its answer
    mini.addEventListener('submit', function (e) {
      e.preventDefault();
      var my = ++gen;
      var name = (input.value || '').trim().toLowerCase();
      if (!NAME_RE.test(name)) { res.innerHTML = '<p class="bad">That isn\'t an XPR account name (a–z, 1–5 and dots, up to 12 characters).</p>'; return; }
      res.innerHTML = '<p class="read on">reading ' + esc(name) + ' from a public XPR server…</p>';
      var bal = null;
      rpc('/v1/chain/get_account', { account_name: name }).then(function (r) {
        var a = r.data;
        if (!a || !a.account_name) throw new Error('none');
        return rpc('/v1/chain/get_currency_balance', { code: 'eosio.token', account: name, symbol: 'XPR' })
          .then(function (b) { bal = Array.isArray(b.data) ? (b.data[0] || '0 XPR') : null; return r; })
          .catch(function () { bal = null; return r; });
      }).then(function (r) {
        if (my !== gen) return;
        var a = r.data;
        var created = a.created ? new Date(a.created + 'Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'unknown';
        var perms = (a.permissions || []).map(function (p) { return p.perm_name; }).join(', ');
        res.innerHTML = '<div class="rows">' +
          '<div>Made <b>' + esc(created) + '</b></div>' +
          '<div>XPR it holds (not staked) <b>' + (bal === null ? "couldn't read" : esc(bal.replace(/^([0-9.]+)/, function (m) { return fmt(parseFloat(m), 4); }))) + '</b></div>' +
          '<div>Permission levels <b>' + esc(perms || 'none') + '</b></div></div>' +
          '<p class="src">Read from ' + esc(host(r.server)) + ' just now. Nothing you type is stored. <a href="/tools/account-check">Full check →</a></p>';
      }).catch(function (err) {
        if (my !== gen) return;
        res.innerHTML = '<p class="bad">' + (String(err && err.message) === 'none' ? 'No account with that name.' : 'Couldn\'t read it just now. That\'s a failed read, not a "no".') + '</p>';
      });
    });
  }

  /* ---------- 5. DeFi Forge taster: arithmetic only ---------- */
  var calc = $('[data-calc]');
  if (calc) {
    var amt = $('[name="amt"]', calc), apr = $('[name="apr"]', calc), days = $('[name="days"]', calc), o = $('[data-calc-out]', calc);
    var upd = function () {
      var A = +amt.value, R = +apr.value, D = +days.value;
      $('[data-v="amt"]', calc).textContent = fmt(A);
      $('[data-v="apr"]', calc).textContent = R + '%';
      $('[data-v="days"]', calc).textContent = D;
      o.textContent = fmt(A * R / 100 * D / 365, 2);
    };
    calc.addEventListener('submit', function (e) { e.preventDefault(); });
    [amt, apr, days].forEach(function (x) { x.addEventListener('input', upd); });
    upd();
  }
})();
