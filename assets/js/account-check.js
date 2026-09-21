/* StandGuard — Account Check (read-only public XPR account inspector)
   ---------------------------------------------------------------------------
   Migrated from the pre-rework "Guardian Intelligence" page, with two changes:

   1. It no longer connects a wallet. There is no signing session, no wallet
      SDK, and no transaction path anywhere in this file. You type a public
      account name; the browser reads public XPR Network RPC nodes, exactly as
      a block explorer does.
   2. Every read reports one of three outcomes: a value, "not found" (a real
      answer meaning none), or "could not verify" (every endpoint failed). A
      failed read is NEVER rendered as zero. That distinction is the product.

   Carried over verbatim from the old code because it is a correctness fix, not
   a style choice: XPR account names may use digits 1-5, so an all-numeric name
   such as "333555" is valid. get_table_rows reads an all-digit scope as a raw
   integer rather than a base32 name, returns an empty result with HTTP 200, and
   the caller then states "no positions" as fact. safeScope() encodes the name
   first. Documented in the XPR Network developer skill, rpc-queries.md.
   --------------------------------------------------------------------------- */
(function () {
  'use strict';

  var RPCS = [
    'https://proton.eosusa.io',
    'https://api.protonnz.com',
    'https://proton.cryptolions.io',
    'https://api-xprnetwork-main.saltant.io'
  ];

  /* XPR account names: 1-12 chars from a-z and 1-5, plus '.' */
  var NAME_RE = /^[a-z1-5.]{1,12}$/;

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fetchTimeout(url, opts, ms) {
    return Promise.race([
      fetch(url, opts),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })
    ]);
  }

  /* Base32 name -> u64, for scopes that would otherwise be misread as integers. */
  function xprNameToU64(name) {
    var charmap = '.12345abcdefghijklmnopqrstuvwxyz';
    var value = BigInt(0);
    for (var i = 0; i <= 12; i++) {
      var c = BigInt(0);
      if (i < name.length) {
        var idx = charmap.indexOf(name[i]);
        c = BigInt(idx < 0 ? 0 : idx);
      }
      if (i < 12) { c &= BigInt(0x1f); c <<= BigInt(64 - 5 * (i + 1)); } else { c &= BigInt(0x0f); }
      value |= c;
    }
    return value.toString();
  }
  function safeScope(name) {
    return /^[0-9]+$/.test(String(name)) ? xprNameToU64(String(name)) : name;
  }
  function safeBound(name) {
    return /^[0-9]+$/.test(String(name)) ? String(name) + '.' : name;
  }

  /* Every network read funnels through here so the source and the outcome are
     recorded together. Resolves { ok, data, host, notFound } — never throws. */
  function rpcPost(sources, pathname, body, label) {
    var attempt = 0;
    function next() {
      if (attempt >= RPCS.length) {
        sources.push({ label: label, host: null, outcome: 'failed' });
        return Promise.resolve({ ok: false });
      }
      var host = RPCS[attempt++];
      return fetchTimeout(host + pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }, 7000).then(function (r) {
        if (r.status === 500 || r.status === 404) {
          /* Antelope returns 500 for "account does not exist". That is a real
             answer from a reachable node, not an endpoint failure. */
          return r.json().catch(function () { return null; }).then(function (j) {
            var msg = j && j.error && j.error.what ? String(j.error.what) : '';
            if (/unknown key|does not exist/i.test(msg) || /unknown key/i.test(JSON.stringify(j || ''))) {
              sources.push({ label: label, host: host, outcome: 'not-found' });
              return { ok: false, notFound: true };
            }
            return next();
          });
        }
        if (!r.ok) return next();
        return r.json().then(function (data) {
          sources.push({ label: label, host: host, outcome: 'ok' });
          return { ok: true, data: data, host: host };
        });
      }).catch(function () { return next(); });
    }
    return next();
  }

  function rpcGet(sources, url, label) {
    var attempt = 0;
    function next() {
      if (attempt >= RPCS.length) {
        sources.push({ label: label, host: null, outcome: 'failed' });
        return Promise.resolve({ ok: false });
      }
      var host = RPCS[attempt++];
      return fetchTimeout(host + url, {}, 7000).then(function (r) {
        if (!r.ok) return next();
        return r.json().then(function (data) {
          sources.push({ label: label, host: host, outcome: 'ok' });
          return { ok: true, data: data, host: host };
        });
      }).catch(function () { return next(); });
    }
    return next();
  }

  function assetNum(q) {
    if (q == null) return 0;
    return parseFloat(String(q).trim().split(' ')[0]) || 0;
  }
  function fmt(n, dp) {
    if (n == null || !isFinite(n)) return '—';
    return Number(n).toLocaleString(undefined, {
      minimumFractionDigits: dp == null ? 0 : dp,
      maximumFractionDigits: dp == null ? 4 : dp
    });
  }

  /* ── The check ─────────────────────────────────────────────────────────── */
  function run(account) {
    var started = new Date();
    var sources = [];
    var verified = [];
    var attention = [];
    var unverified = [];

    var results = el('ac-results');
    results.hidden = false;
    results.innerHTML = '<p class="ac-busy">Reading public XPR Network nodes…</p>';

    var jobs = [];

    /* 1 — account: creation date, resources, voting */
    jobs.push(
      rpcPost(sources, '/v1/chain/get_account', { account_name: account }, 'get_account')
        .then(function (res) {
          if (res.notFound) {
            verified.push(['Account exists', 'No — no account by this name on XPR Network mainnet']);
            return 'absent';
          }
          if (!res.ok) {
            unverified.push('Whether this account exists, when it was created, its resources, and its voting — every RPC node failed for get_account.');
            return null;
          }
          var d = res.data;
          verified.push(['Account exists', 'Yes']);
          try {
            var created = new Date(d.created);
            var days = Math.floor((Date.now() - created.getTime()) / 86400000);
            verified.push(['Created (UTC)', created.toISOString().slice(0, 10) + '  (' + fmt(days, 0) + ' days ago)']);
          } catch (e) {
            unverified.push('Account creation date — the node returned a value this page could not parse.');
          }
          var vi = d.voter_info;
          if (vi) {
            var producers = Array.isArray(vi.producers) ? vi.producers : [];
            verified.push(['Staked XPR (voting)', fmt(Math.floor(parseInt(String(vi.staked || 0), 10) / 10000), 0) + ' XPR']);
            verified.push(['Block producers voted for', String(producers.length) + (producers.length ? ' — ' + producers.join(', ') : '')]);
            if (vi.proxy) verified.push(['Voting through proxy', String(vi.proxy)]);
            if (producers.length === 0 && !vi.proxy) {
              attention.push('This account holds staked XPR but is voting for no block producer and uses no proxy.');
            }
          } else {
            verified.push(['Staked XPR (voting)', 'None recorded']);
          }
          if (d.refund_request) {
            attention.push('An unstaking refund is pending (requested ' + esc(String(d.refund_request.request_time)) + ').');
          }
          try {
            var cpu = d.cpu_limit, net = d.net_limit;
            if (cpu && cpu.max > 0) {
              var cpuPct = Math.round((cpu.used / cpu.max) * 100);
              verified.push(['CPU used', cpuPct + '% of available']);
              if (cpuPct >= 90) attention.push('CPU is at ' + cpuPct + '% of this account’s limit — transactions may start failing.');
            }
            if (net && net.max > 0) {
              var netPct = Math.round((net.used / net.max) * 100);
              verified.push(['NET used', netPct + '% of available']);
            }
            if (d.ram_quota > 0) {
              var ramPct = Math.round((d.ram_usage / d.ram_quota) * 100);
              verified.push(['RAM used', fmt(d.ram_usage, 0) + ' / ' + fmt(d.ram_quota, 0) + ' bytes (' + ramPct + '%)']);
              if (ramPct >= 95) attention.push('RAM is at ' + ramPct + '% of quota — this account cannot take on much new on-chain state.');
            }
          } catch (e) { /* resource block is optional detail, not a failure */ }

          /* Permissions: who can act for this account. */
          try {
            var perms = Array.isArray(d.permissions) ? d.permissions : [];
            var delegated = [];
            perms.forEach(function (p) {
              var auth = p.required_auth || {};
              (auth.accounts || []).forEach(function (a) {
                if (a.permission && a.permission.actor && a.permission.actor !== account) {
                  delegated.push(a.permission.actor + '@' + a.permission.permission + ' → ' + p.perm_name);
                }
              });
            });
            verified.push(['Permissions defined', perms.map(function (p) { return p.perm_name; }).join(', ') || 'none returned']);
            if (delegated.length) {
              attention.push('Another account can act for this one: ' + delegated.join('; ') + '. That is a deliberate delegation, not necessarily a problem — but whoever holds it can sign within that permission.');
            }
          } catch (e) { /* optional */ }
          return 'present';
        })
    );

    /* 2 — liquid XPR */
    jobs.push(
      rpcPost(sources, '/v1/chain/get_currency_balance',
        { code: 'eosio.token', account: account, symbol: 'XPR' }, 'get_currency_balance (XPR)')
        .then(function (res) {
          if (!res.ok) {
            unverified.push('Liquid XPR balance — every RPC node failed. This is not a statement that the balance is zero.');
            return;
          }
          var row = res.data && res.data[0];
          verified.push(['Liquid XPR', row ? fmt(assetNum(row), 4) + ' XPR' : '0 XPR (no balance row — a real answer, not a failure)']);
        })
    );

    /* 3 — other tokens held (v2 state endpoint; not all nodes carry it) */
    jobs.push(
      rpcGet(sources, '/v2/state/get_tokens?account=' + encodeURIComponent(account), 'get_tokens (v2 state)')
        .then(function (res) {
          if (!res.ok) {
            unverified.push('The full token list for this account — no node answered the v2 state endpoint. Tokens beyond XPR are unknown, not absent.');
            return;
          }
          var toks = (res.data && Array.isArray(res.data.tokens)) ? res.data.tokens.filter(function (t) { return t.amount > 0; }) : [];
          verified.push(['Tokens held (excluding XPR)', toks.length ? toks.map(function (t) { return t.symbol; }).join(', ') : 'none returned']);
        })
    );

    /* 4 — SimpleDEX LP positions */
    jobs.push(
      rpcPost(sources, '/v1/chain/get_table_rows',
        { json: true, code: 'simpledex', scope: safeScope(account), table: 'lp', limit: 20 }, 'simpledex lp table')
        .then(function (res) {
          if (!res.ok) {
            unverified.push('SimpleDEX liquidity positions — the table read failed on every node.');
            return;
          }
          var rows = (res.data && Array.isArray(res.data.rows)) ? res.data.rows : [];
          verified.push(['SimpleDEX LP positions', rows.length ? String(rows.length) : 'none']);
          if (res.data && res.data.more) {
            attention.push('The SimpleDEX LP table reported more rows than this page requested. The count above is a floor, not a total.');
          }
        })
    );

    /* 5 — LOAN Protocol supplied position */
    jobs.push(
      rpcPost(sources, '/v1/chain/get_table_rows', {
        json: true, code: 'lending.loan', scope: 'lending.loan', table: 'shares',
        lower_bound: safeBound(account), upper_bound: safeBound(account),
        key_type: 'name', index_position: '1', limit: 1
      }, 'lending.loan shares table')
        .then(function (res) {
          if (!res.ok) {
            unverified.push('LOAN Protocol lending position — the table read failed on every node.');
            return;
          }
          var row = res.data && Array.isArray(res.data.rows) && res.data.rows[0];
          var has = !!(row && Array.isArray(row.tokens) && row.tokens.some(function (t) {
            var v = t && t.value;
            return (typeof v === 'number' ? v : parseFloat(v || 0)) > 0;
          }));
          verified.push(['LOAN Protocol supplied position', has ? 'Yes' : 'None']);
        })
    );

    Promise.all(jobs).then(function () {
      render(account, started, verified, attention, unverified, sources);
    });
  }

  function render(account, started, verified, attention, unverified, sources) {
    var finished = new Date();
    var h = [];

    h.push('<h2 class="sec-title">Report for <code>' + esc(account) + '</code></h2>');
    h.push('<p class="muted mb3">Read ' + esc(started.toISOString()) +
      ' — finished ' + esc(finished.toISOString()) +
      '. Every figure below came from a public XPR Network node at that moment and may have changed since.</p>');

    h.push('<div class="ac-block ac-verified"><h3>What was verified</h3>');
    if (verified.length) {
      verified.forEach(function (row) {
        h.push('<div class="ac-row"><span>' + esc(row[0]) + '</span><span>' + esc(row[1]) + '</span></div>');
      });
    } else {
      h.push('<p class="muted">Nothing could be verified — see "Could not verify" below.</p>');
    }
    h.push('</div>');

    h.push('<div class="ac-block ac-attention"><h3>What deserves attention</h3>');
    if (attention.length) {
      h.push('<ul class="ac-list">');
      attention.forEach(function (a) { h.push('<li>' + esc(a) + '</li>'); });
      h.push('</ul>');
    } else {
      h.push('<p class="muted">Nothing in the reads above raised an attention item. That is not the same as "this account is safe" — see the limits below.</p>');
    }
    h.push('</div>');

    h.push('<div class="ac-block ac-unverified"><h3>What could not be verified</h3>');
    h.push('<ul class="ac-list">');
    unverified.forEach(function (u) { h.push('<li>' + esc(u) + '</li>'); });
    h.push('<li>Who controls this account in the real world, and whether they are honest. Nothing on-chain answers that.</li>');
    h.push('<li>Whether any token this account holds is legitimate. A token appearing here is not an endorsement of it.</li>');
    h.push('<li>The account’s full transaction history. This page reads current state, not history.</li>');
    h.push('<li>Anything held on another chain, in a custodial account, or off-chain.</li>');
    h.push('</ul>');
    h.push('<p class="muted mt2">What would confirm the unknowns: read the account directly on <a href="https://explorer.xprnetwork.org" rel="noopener">explorer.xprnetwork.org</a>, and ask the account’s operator for the identifiers behind any claim they make.</p>');
    h.push('</div>');

    h.push('<div class="ac-block ac-sources"><h3>Sources and outcomes</h3>');
    h.push('<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Read</th><th>Node that answered</th><th>Outcome</th></tr></thead><tbody>');
    sources.forEach(function (s) {
      var outcome = s.outcome === 'ok' ? 'answered'
        : s.outcome === 'not-found' ? 'answered: no such account'
        : 'every node failed';
      h.push('<tr><td>' + esc(s.label) + '</td><td>' + esc(s.host || '—') + '</td><td>' + esc(outcome) + '</td></tr>');
    });
    h.push('</tbody></table></div>');
    h.push('<p class="muted mt2">Nodes tried, in order: ' + RPCS.map(esc).join(', ') + '.</p>');
    h.push('</div>');

    h.push('<div class="boundary">This report describes public on-chain state. It is not a safety rating, a verdict about any person, or financial advice. GUARD never says safe — GUARD gives clarity.</div>');

    el('ac-results').innerHTML = h.join('');
  }

  /* ── Wiring ────────────────────────────────────────────────────────────── */
  var form = el('ac-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = el('ac-account');
    var errBox = el('ac-error');
    var raw = String(input.value || '').trim().toLowerCase().replace(/^@/, '');
    errBox.textContent = '';

    if (!raw) {
      errBox.textContent = 'Enter an XPR Network account name.';
      input.focus();
      return;
    }
    if (!NAME_RE.test(raw)) {
      errBox.textContent = 'That is not a valid XPR Network account name. Names are 1–12 characters using a–z, digits 1–5, and "." only.';
      input.focus();
      return;
    }
    run(raw);
  });
})();
