/* StandGuard v3, products and services pages (MetalXPRt, Services, Tools, GUARD, Projects).
   Each piece starts only if its markup is on the page. Built from the page's own content where possible,
   so with JavaScript off every page still shows all of its text.
   Chain reads use only the four public XPR servers already allowed by the site's CSP. Nothing is signed,
   no wallet is connected, nothing typed is stored. A failed read says so; it is never shown as zero. */
(function () {
  'use strict';
  var RPCS = ['https://api.protonnz.com', 'https://proton.eosusa.io', 'https://proton.cryptolions.io', 'https://api-xprnetwork-main.saltant.io'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NAME_RE = /^[a-z1-5.]{1,12}$/;
  var good = 0;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function host(u) { return u.replace('https://', ''); }
  function fmtAsset(s, d) { var p = String(s).split(' '); var n = parseFloat(p[0]); return isNaN(n) ? String(s) : fmt(n, d) + (p[1] ? ' ' + p[1] : ''); }

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

  /* Generic: a set of buttons (role=tab or aria-pressed) that each show one panel. */
  function picker(root, btnSel, show) {
    var btns = $$(btnSel, root);
    var pick = function (b, focus) {
      btns.forEach(function (x) {
        var on = x === b;
        if (x.getAttribute('role') === 'tab') { x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; }
        else x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      show(b);
      if (focus) b.focus();
    };
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { pick(b); });
      if (b.getAttribute('role') === 'tab') b.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = btns[(i + 1) % btns.length];
        if (k === 'ArrowLeft' || k === 'ArrowUp') n = btns[(i - 1 + btns.length) % btns.length];
        if (k === 'Home') n = btns[0];
        if (k === 'End') n = btns[btns.length - 1];
        if (n) { e.preventDefault(); pick(n, true); }
      });
    });
    return pick;
  }

  /* ---------- Flow diagrams (MetalXPRt question flow, Services buying flow) ---------- */
  $$('[data-px-flow]').forEach(function (flow) {
    var stages = $$('[data-stage]', flow), out = $('[data-flow-out]', flow), play = $('[data-flow-play]', flow);
    var timer = null, idx = 0;
    var show = function (b) {
      idx = stages.indexOf(b);
      flow.style.setProperty('--px-at', idx);
      stages.forEach(function (s, i) { s.classList.toggle('px-done', i < idx); });
      var tpl = document.getElementById(b.getAttribute('data-stage'));
      out.innerHTML = tpl ? tpl.innerHTML : '';
    };
    var pick = picker(flow, '[data-stage]', show);
    var stop = function () { clearInterval(timer); timer = null; if (play) { play.textContent = play.getAttribute('data-label') || 'Play it through'; play.setAttribute('aria-pressed', 'false'); } };
    if (play) {
      play.setAttribute('data-label', play.textContent);
      play.addEventListener('click', function () {
        if (timer) { stop(); return; }
        play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
        pick(stages[0]);
        timer = setInterval(function () {
          if (idx >= stages.length - 1) { stop(); return; }
          pick(stages[idx + 1]);
        }, reduce ? 3000 : 2600);
      });
    }
    stages.forEach(function (s) { s.addEventListener('click', function (e) { if (e.isTrusted) stop(); }); });
    pick(stages[0]);
  });

  /* ---------- MetalXPRt tool explorer, built from the page's own tool lists ---------- */
  var EXAMPLES = {
    xpr_network: 'Is the XPR chain making blocks right now, and who is in the producer schedule?',
    xpr_account: 'What is the public account xmd.treasury, and what does it run?',
    xpr_account_check: 'Before I pay this account, what does its public record show?',
    xpr_contract: 'Which actions and tables does the lending.loan contract have?',
    xpr_tx: 'What happened in this transaction?',
    xpr_token_check: 'Is XMD on xmd.token the real Metal Dollar?',
    simpledex: 'What launched on SimpleDEX today, and what graduated?',
    markets: 'Which Metal X and Alcor markets trade XMD?',
    loan_protocol: 'What are the borrow limits on LOAN Protocol\'s markets?',
    xpr_nfts: 'What is listed in this NFT collection?',
    metallicus_status: 'Is Metal Pay or the bridge having problems right now?',
    whats_new: 'Anything new in the ecosystem since yesterday?',
    xpr_governance: 'Which governance proposals are open, and how are the votes going?',
    xpr_agents_directory: 'Which agents are registered on XPR Agents, and what jobs are open?',
    xpr_help: 'What does the official help centre say about backing up a WebAuth wallet?',
    metal_blockchain: 'What is Metal Blockchain\'s current height and supply?',
    evm_chains: 'What is happening on Metal L2 right now?',
    outside_sources: 'Are there new XMD reserve reports or SEC filings?',
    source_fetch: 'Open the latest Metallicus quarterly report and tell me what it says.',
    xpr_testnet: 'Is the XPR testnet up?',
    guide: 'Where is the official form to apply for a Metal X listing?',
    guide_tools: 'My AI app has an older tool list. Run the token check anyway.',
    suggest_update: 'This fact is missing from the guide. Save it for review.'
  };
  var tex = $('[data-px-tools]');
  if (tex) {
    var groups = $$('.tgroup', tex.parentNode.querySelector('.tgrid') || document).map(function (g) {
      return {
        name: ($('h3', g) || {}).textContent || '',
        tools: $$('dt', g).map(function (dt) {
          var dd = dt.nextElementSibling;
          return { name: dt.textContent.trim(), what: dd ? dd.textContent.trim() : '' };
        })
      };
    }).filter(function (g) { return g.tools.length; });
    if (groups.length) {
      var total = groups.reduce(function (n, g) { return n + g.tools.length; }, 0);
      var tabs = $('[data-tabs-row]', tex), grid = $('[data-tool-grid]', tex), card = $('[data-tool-card]', tex);
      groups.forEach(function (g, gi) {
        var b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'tab'); b.className = 'px-tab';
        b.id = 'px-tab-' + gi; b.setAttribute('aria-controls', 'px-tool-grid');
        b.innerHTML = esc(g.name) + ' <span>' + g.tools.length + '</span>';
        b.setAttribute('data-g', gi);
        tabs.appendChild(b);
      });
      var showTool = function (t, gname) {
        card.innerHTML = '<p class="px-k">' + esc(gname) + '</p><h3><code>' + esc(t.name) + '</code></h3>' +
          '<p>' + esc(t.what) + '</p>' +
          (EXAMPLES[t.name] ? '<p class="px-ex"><span>Ask your AI</span>&ldquo;' + esc(EXAMPLES[t.name]) + '&rdquo;</p>' : '') +
          (t.name === 'suggest_update' ? '<p class="px-note">The only tool that writes, and only after you say yes.</p>' : '<p class="px-note">Read-only. It signs nothing and moves no money.</p>');
      };
      var showGroup = function (b) {
        var g = groups[+b.getAttribute('data-g')];
        grid.setAttribute('aria-labelledby', b.id);
        grid.innerHTML = '';
        g.tools.forEach(function (t, ti) {
          var tb = document.createElement('button');
          tb.type = 'button'; tb.className = 'px-tool'; tb.setAttribute('aria-pressed', 'false');
          tb.innerHTML = '<code>' + esc(t.name) + '</code><small>' + esc(t.what) + '</small>';
          tb.style.setProperty('--i', ti);
          tb.addEventListener('click', function () {
            $$('.px-tool', grid).forEach(function (x) { x.setAttribute('aria-pressed', x === tb ? 'true' : 'false'); });
            showTool(t, g.name);
          });
          grid.appendChild(tb);
        });
        var first = $('.px-tool', grid); if (first) first.click();
      };
      picker(tex, '.px-tab', showGroup)($('.px-tab', tex));
      var cnt = $('[data-tool-count]', tex); if (cnt) cnt.textContent = total;
      tex.hidden = false;
      var orig = tex.parentNode.querySelector('.tgrid'); if (orig) orig.classList.add('px-replaced');
    }
  }

  /* ---------- Services finder ---------- */
  var finder = $('[data-px-finder]');
  if (finder) {
    var fout = $('[data-finder-out]', finder);
    picker(finder, '[data-need]', function (b) {
      var tpl = document.getElementById(b.getAttribute('data-need'));
      fout.innerHTML = tpl ? tpl.innerHTML : '';
    })($('[data-need]', finder));
  }

  /* ---------- Show one side at a time (service pages: what you'd get / what it is not) ---------- */
  $$('[data-px-sides]').forEach(function (box) {
    var sides = $$('[data-side]', box);
    box.classList.add('px-sides-on');
    picker(box, '[data-show-side]', function (b) {
      var want = b.getAttribute('data-show-side');
      sides.forEach(function (s) { s.hidden = s.getAttribute('data-side') !== want; });
    })($('[data-show-side]', box));
  });

  /* ---------- Generic filter board (Projects) ---------- */
  $$('[data-px-filter]').forEach(function (board) {
    var items = $$('[data-state]', board);
    var live = $('[data-filter-count]', board);
    picker(board, '[data-filter]', function (b) {
      var f = b.getAttribute('data-filter'), n = 0;
      items.forEach(function (it) {
        var on = f === 'all' || it.getAttribute('data-state') === f;
        it.hidden = !on; if (on) n++;
      });
      if (live) live.textContent = n + (n === 1 ? ' project' : ' projects') + ' shown';
    })($('[data-filter]', board));
  });

  /* ---------- Step-through (shield buy test) ---------- */
  $$('[data-px-steps]').forEach(function (box) {
    var steps = $$('[data-step-btn]', box), out = $('[data-step-out]', box);
    var bar = $('[data-curve]', box), mark = $('[data-curve-val]', box), clock = $('[data-clock]', box);
    var LINE = +box.getAttribute('data-line') || 50, MAX = +box.getAttribute('data-max') || 80;
    picker(box, '[data-step-btn]', function (b) {
      var v = +b.getAttribute('data-curve-at');
      var pct = Math.max(0, Math.min(100, v / MAX * 100));
      if (bar) bar.style.height = pct + '%';
      if (mark) mark.textContent = b.getAttribute('data-curve-label');
      if (clock) { clock.textContent = b.getAttribute('data-clock-label'); clock.className = 'px-clock ' + (b.getAttribute('data-clock-state') || ''); }
      box.classList.toggle('px-above', v >= LINE);
      var tpl = document.getElementById(b.getAttribute('data-step-btn'));
      out.innerHTML = tpl ? tpl.innerHTML : '';
    })(steps[0]);
  });

  /* ---------- Tools hub desk: pick a tool on the left, use it on the screen ---------- */
  $$('[data-px-desk]').forEach(function (desk) {
    var label = $('[data-screen-label]', desk);
    picker(desk, '[role="tab"]', function (b) {
      $$('[role="tab"]', desk).forEach(function (x) {
        var panel = document.getElementById(x.getAttribute('aria-controls'));
        if (panel) panel.hidden = x !== b;
      });
      if (label) label.textContent = b.getAttribute('data-label') || '';
    })($('[role="tab"]', desk));
  });

  /* ---------- Mini Account Check (Tools hub) ---------- */
  var mini = $('[data-px-check]');
  if (mini) {
    var input = $('input', mini), res = $('[data-px-check-out]', mini);
    mini.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (input.value || '').trim().toLowerCase().replace(/^@/, '');
      if (!NAME_RE.test(name)) { res.innerHTML = '<p class="px-bad">That isn\'t an XPR account name (a–z, 1–5 and dots, up to 12 characters).</p>'; return; }
      res.innerHTML = '<p class="px-reading">reading ' + esc(name) + ' from a public XPR server…</p>';
      var bal = null;
      rpc('/v1/chain/get_account', { account_name: name }).then(function (r) {
        if (!r.data || !r.data.account_name) throw new Error('none');
        return rpc('/v1/chain/get_currency_balance', { code: 'eosio.token', account: name, symbol: 'XPR' })
          .then(function (b) { bal = Array.isArray(b.data) ? (b.data[0] || '0.0000 XPR') : null; return r; })
          .catch(function () { bal = null; return r; });
      }).then(function (r) {
        var a = r.data;
        var created = a.created ? new Date(a.created + 'Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'unknown';
        var perms = (a.permissions || []).map(function (p) { return p.perm_name; }).join(', ');
        res.innerHTML = '<div class="px-rows">' +
          '<div>Made <b>' + esc(created) + '</b></div>' +
          '<div>XPR it holds (not staked) <b>' + (bal === null ? 'couldn\'t read' : esc(fmtAsset(bal, 4))) + '</b></div>' +
          '<div>Who can act for it <b>' + esc(perms || 'none') + '</b></div></div>' +
          '<p class="px-src">Read from ' + esc(host(r.server)) + ' just now. Nothing you type is stored. <a href="/tools/account-check">The full check →</a></p>';
      }).catch(function (err) {
        res.innerHTML = '<p class="px-bad">' + (String(err && err.message) === 'none' ? 'No account with that name.' : 'Couldn\'t read it just now. That\'s a failed read, not a "no".') + '</p>';
      });
    });
  }

  /* ---------- DeFi taster (Tools hub): arithmetic only ---------- */
  var calc = $('[data-px-calc]');
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

  /* ---------- GUARD token card: live supply from the chain ---------- */
  var tok = $('[data-px-token]');
  if (tok) {
    var code = tok.getAttribute('data-code'), sym = tok.getAttribute('data-symbol');
    var setv = function (k, v) { var el = $('[data-tv="' + k + '"]', tok); if (el) el.innerHTML = v; };
    var src = $('[data-tv-src]', tok), dot = $('[data-tv-dot]', tok);
    var read = function () {
      setv('supply', '<span class="px-reading">reading…</span>');
      rpc('/v1/chain/get_currency_stats', { code: code, symbol: sym }).then(function (r) {
        var s = r.data && r.data[sym];
        if (!s) throw new Error('none');
        setv('supply', esc(fmtAsset(s.supply, 0)));
        setv('max', esc(fmtAsset(s.max_supply, 0)));
        setv('issuer', '<code>' + esc(s.issuer) + '</code>');
        var sp = parseFloat(String(s.supply)), mx = parseFloat(String(s.max_supply));
        if (mx > 0 && !isNaN(sp)) tok.style.setProperty('--px-fill', Math.min(100, sp / mx * 100).toFixed(2) + '%');
        if (src) src.textContent = 'Read by your browser from ' + host(r.server) + ' just now.';
        if (dot) dot.className = 'px-dot ok';
      }).catch(function () {
        setv('supply', 'couldn\'t read');
        setv('max', 'couldn\'t read');
        if (src) src.textContent = 'Couldn\'t reach a public XPR server just now. That\'s a failed read, not a zero.';
        if (dot) dot.className = 'px-dot bad';
      });
    };
    var again = $('[data-tv-again]', tok); if (again) again.addEventListener('click', read);
    if ('IntersectionObserver' in window) {
      var once = false;
      new IntersectionObserver(function (es) { if (es[0].isIntersecting && !once) { once = true; read(); } }, { threshold: 0.2 }).observe(tok);
    } else read();
  }
})();
