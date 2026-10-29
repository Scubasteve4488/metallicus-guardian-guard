/* /preview/two-eyes: "watch a claim get checked" (IAN-CODE, 2026-10-28, prototype).
   Guard.IAN's two eyes are the only shapes that change: each eye is one SVG cubic path whose end points, width and
   colour are tweened between states. The official logos are plain <img> files, moved or faded whole by CSS.
   The live chain read uses the site's own fallback (window.SG.rpc from /assets/js/live.js). A read that fails
   breaks that beam and withdraws the answer: it never shows a zero. No scroll hijacking: native scrolling only. */
(function () {
  'use strict';
  var stage = document.querySelector('[data-te-stage]');
  var steps = Array.prototype.slice.call(document.querySelectorAll('[data-te-step]'));
  if (!stage || !steps.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TITLES = ['Ask', 'Two places', 'They agree', "When a place doesn't answer", 'Your turn'];
  var ISSUER = 'xmd.treasury'; /* what the registry names (MetalXPRt token check, 28 Oct 2026) */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- eye geometry (stage units, 1000 x 1000) ---------- */
  function seg(x0, y0, x3, y3) { return [x0, y0, x0 + (x3 - x0) / 3, y0 + (y3 - y0) / 3, x0 + 2 * (x3 - x0) / 3, y0 + 2 * (y3 - y0) / 3, x3, y3]; }
  /* first part of a cubic, up to t (de Casteljau), so a broken beam follows the same curve and stops short */
  function cut(p, t) {
    var L = function (a, b) { return a + (b - a) * t; };
    var ax = L(p[0], p[2]), ay = L(p[1], p[3]), bx = L(p[2], p[4]), by = L(p[3], p[5]), cx = L(p[4], p[6]), cy = L(p[5], p[7]);
    var dx = L(ax, bx), dy = L(ay, by), ex = L(bx, cx), ey = L(by, cy);
    return [p[0], p[1], ax, ay, dx, dy, L(dx, ex), L(dy, ey)];
  }
  /* eyes at rest: upright ovals in the visor, tops leaning outward (Guard.IAN canon) */
  var REST = { l: seg(440, 371, 450, 389), r: seg(560, 371, 550, 389) };
  /* beams end just above the XPR glyph's clear-space box (top edge y = 520) and the registry box */
  var BEAM = { l: [445, 380, 330, 392, 250, 450, 250, 510], r: [555, 380, 670, 392, 740, 450, 740, 510] };
  var BROKE = { l: cut(BEAM.l, 0.5), r: cut(BEAM.r, 0.5) };
  /* the two beams bend down and meet: one bar, the top edge of the answer card */
  var BAR = { l: [500, 520, 400, 520, 300, 520, 200, 520], r: [500, 520, 600, 520, 700, 520, 800, 520] };

  var VIOLET = [155, 92, 255], GREY = [93, 86, 107], HOT = [246, 238, 255], HOTGREY = [139, 129, 156];
  /* a pose = 8 path numbers + width + grey (0..1) */
  function pose(pts, w, grey) { return pts.concat([w, grey || 0]); }

  /* ---------- state ---------- */
  var cur = 1, mode = 'reading', demo = false, live = null;

  function targets(state) {
    var t = {};
    if (state === 1 || state === 5) { t.l = pose(REST.l, 30); t.r = pose(REST.r, 30); return t; }
    if (state === 3 && mode === 'ok') { t.l = pose(BAR.l, 10); t.r = pose(BAR.r, 10); return t; }
    var lBroken = mode === 'fail';
    var rBroken = state === 4 && demo;
    t.l = lBroken ? pose(BROKE.l, 8, 1) : pose(BEAM.l, 9);
    t.r = rBroken ? pose(BROKE.r, 8, 1) : pose(BEAM.r, 9);
    return t;
  }

  /* ---------- drawing ---------- */
  var eyes = {};
  ['l', 'r'].forEach(function (k) {
    var g = $('[data-te-eye="' + k + '"]', stage);
    eyes[k] = { glow: $('.te-glow', g), body: $('.te-body', g), core: $('.te-core', g), p: null };
  });
  function mix(a, b, k) { return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * k); }).join(',') + ')'; }
  function d(p) { return 'M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'C' + p.slice(2, 8).map(function (v) { return v.toFixed(1); }).join(' '); }
  function draw(k, p) {
    var e = eyes[k], path = d(p), w = p[8], grey = p[9];
    e.p = p;
    e.glow.setAttribute('d', path); e.body.setAttribute('d', path); e.core.setAttribute('d', path);
    e.glow.setAttribute('stroke', 'rgb(155,92,255)');
    e.glow.setAttribute('stroke-width', (w * 2.1).toFixed(1));
    e.glow.setAttribute('opacity', (0.6 * (1 - grey)).toFixed(2));
    e.body.setAttribute('stroke', mix(VIOLET, GREY, grey));
    e.body.setAttribute('stroke-width', w.toFixed(1));
    e.core.setAttribute('stroke', mix(HOT, HOTGREY, grey));
    e.core.setAttribute('stroke-width', (w * (w > 20 ? 0.42 : 0.34)).toFixed(1));
    var dash = grey > 0.5 ? '16 14' : null;
    [e.body, e.core].forEach(function (el) { if (dash) el.setAttribute('stroke-dasharray', dash); else el.removeAttribute('stroke-dasharray'); });
  }

  var raf = 0;
  function morph(to) {
    cancelAnimationFrame(raf);
    var from = { l: eyes.l.p, r: eyes.r.p };
    if (reduce || !from.l) { draw('l', to.l); draw('r', to.r); return; }
    var t0 = performance.now(), dur = 850;
    var ease = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    (function step(now) {
      var k = ease(Math.min((now - t0) / dur, 1));
      ['l', 'r'].forEach(function (s) {
        var a = from[s], b = to[s];
        var p = a.map(function (v, i) { return v + (b[i] - v) * k; });
        /* a beam breaks or mends at once; the dashes don't fade in */
        p[9] = b[9];
        draw(s, p);
      });
      if (k < 1) raf = requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- the words on the stage and in the steps ---------- */
  var mini = $('[data-te-mini]', stage), stageLive = $('[data-te-stage-live]', stage);
  var liveEl = $('[data-te-live]'), nowEl = $('[data-te-now]'), chainSrc = $('[data-te-chain-src]');
  var card3 = $('#te-3 .te-card'), retry = $('[data-te-retry]');

  function render() {
    stage.setAttribute('data-state', String(cur));
    stage.setAttribute('data-mode', mode);
    stage.setAttribute('data-demo', demo ? 'on' : 'off');
    var silent = (cur === 4 && demo) || mode === 'fail';
    mini.textContent = mode === 'reading' ? 'Reading…' : mode === 'mismatch' ? "They don't agree." : silent ? "Couldn't verify." : 'Both answered.';
    morph(targets(cur));
    steps.forEach(function (s, i) { s.classList.toggle('is-on', i + 1 === cur); });
    if (pos) pos.innerHTML = 'Step ' + cur + ' of 5<span class="te-pos-t">: ' + esc(TITLES[cur - 1]) + '</span>';
    if (prev) prev.setAttribute('aria-disabled', cur === 1 ? 'true' : 'false');
    if (next) next.setAttribute('aria-disabled', cur === 5 ? 'true' : 'false');
  }

  function showLive() {
    if (mode === 'reading') {
      stageLive.textContent = 'reading live…';
      liveEl.className = 'te-live';
      liveEl.textContent = 'Reading the chain live from a public XPR server…';
      nowEl.textContent = '';
      card3.classList.remove('withdrawn');
      if (retry) retry.hidden = true;
      return;
    }
    if (retry) retry.hidden = false;
    if (mode === 'fail') {
      stageLive.innerHTML = '<b>no answer</b><br>from 4 public servers';
      liveEl.className = 'te-live bad';
      liveEl.textContent = "Your browser couldn't reach any of the four public XPR servers just now, so there is no supply number here. That's a failed read, not a zero.";
      chainSrc.textContent = "didn't answer just now.";
      nowEl.textContent = "Right now the chain didn't answer, so this answer is withdrawn. He says what step 4 shows instead.";
      card3.classList.add('withdrawn');
      return;
    }
    var at = live.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    stageLive.innerHTML = '<b>' + esc(live.supply) + '</b><br>issuer <b>' + esc(live.issuer) + '</b><br>via ' + esc(live.server);
    liveEl.className = 'te-live';
    liveEl.innerHTML = '<span class="live">LIVE</span> Read from <b>' + esc(live.server) + '</b> at ' + esc(at) + ': <b>' + esc(live.supply) + '</b> in supply, issuer <code>' + esc(live.issuer) + '</code>.';
    chainSrc.innerHTML = 'read live in your browser from ' + esc(live.server) + ' at ' + esc(at) + ', with <code>get_currency_stats</code>.';
    if (mode === 'mismatch') {
      nowEl.textContent = 'Right now the chain names the issuer ' + live.issuer + ', not ' + ISSUER + ', so the two places disagree and he won\'t say yes.';
      card3.classList.add('withdrawn');
    } else {
      nowEl.textContent = 'Right now, live: the chain answered and both places name ' + ISSUER + '.';
      card3.classList.remove('withdrawn');
    }
  }

  var reading = 0;
  function readChain() {
    var my = ++reading;
    mode = 'reading'; showLive(); render();
    var fail = function () { if (my !== reading) return; mode = 'fail'; live = null; showLive(); render(); };
    if (!window.SG || !window.SG.rpc) { fail(); return; }
    window.SG.rpc('/v1/chain/get_currency_stats', { code: 'xmd.token', symbol: 'XMD' }).then(function (r) {
      if (my !== reading) return;
      var s = r.data && r.data.XMD;
      if (!s || !s.supply || !s.issuer) { fail(); return; }
      var parts = String(s.supply).split(' ');
      var n = parseFloat(parts[0]);
      if (!isFinite(n)) { fail(); return; }
      live = {
        supply: n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (parts[1] || 'XMD'),
        issuer: String(s.issuer), server: window.SG.host(r.server), at: new Date()
      };
      mode = live.issuer === ISSUER ? 'ok' : 'mismatch';
      showLive(); render();
    }).catch(fail);
  }

  /* ---------- Back / Next (keyboard-friendly, no scroll lock) ---------- */
  var ctl = $('[data-te-ctl]'), prev = $('[data-te-prev]'), next = $('[data-te-next]'), pos = $('[data-te-pos]');
  var lockUntil = 0;
  var narrow = function () { return window.matchMedia('(max-width: 900px)').matches; };
  function go(n) {
    if (n < 1 || n > 5 || n === cur) return;
    cur = n; render();
    var el = steps[n - 1], r = el.getBoundingClientRect(), y;
    if (narrow()) {
      var col = $('.te-col');
      y = window.pageYOffset + r.top - col.getBoundingClientRect().height - 57 - 12;
    } else {
      y = window.pageYOffset + r.top - Math.max((window.innerHeight - r.height) / 2, 90);
    }
    lockUntil = Date.now() + (reduce ? 120 : 1100);
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
  }
  ctl.hidden = false;
  prev.addEventListener('click', function () { go(cur - 1); });
  next.addEventListener('click', function () { go(cur + 1); });

  /* ---------- the demo: one place goes silent ---------- */
  var demoBtn = $('[data-te-demo]'), demoNote = $('[data-te-demo-note]');
  demoBtn.hidden = false;
  demoBtn.addEventListener('click', function () {
    demo = !demo;
    demoBtn.setAttribute('aria-pressed', demo ? 'true' : 'false');
    demoNote.textContent = demo ? 'Demo on: the registry is treated as silent, so the right beam breaks and the answer shrinks. Press again to bring it back.' : '';
    if (cur !== 4) cur = 4;
    render();
  });
  if (retry) retry.addEventListener('click', readChain);

  /* ---------- which step is being read ---------- */
  var io = null;
  function watch() {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(function (es) {
      if (Date.now() < lockUntil) return;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = +e.target.getAttribute('data-te-step');
        if (n !== cur) { cur = n; render(); }
      });
    }, { rootMargin: narrow() ? '-62% 0px -30% 0px' : '-45% 0px -45% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  }
  var wasNarrow = narrow();
  window.addEventListener('resize', function () { if (narrow() !== wasNarrow) { wasNarrow = narrow(); watch(); } });

  draw('l', targets(1).l); draw('r', targets(1).r);
  render();
  watch();
  readChain();
})();
