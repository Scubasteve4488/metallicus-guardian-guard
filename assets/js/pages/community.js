/* StandGuard v3: community pages.
   1) /community road map: Guard.IAN on one side, KSTO at the heart, roads to each project and down to
      XPR Network. Pick a stop: a light walks the road from Guard.IAN to it, and the card says what it is,
      how it relates to KSTO and how it relates to Guard.IAN. "Walk the road" tours every stop.
   2) Tabs and step flows on the sub-pages ([data-cm-tabs]): plain buttons, arrow keys move.
   No inline script, no third-party request. With JavaScript off the map is hidden and every panel shows. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------------- 1. road map ---------------- */
  var stage = document.querySelector('[data-cm-road]');
  if (stage) {
    // x,y: wide layout (viewBox 1000x660). tx,ty: tall layout for phones (viewBox 400x980). d / td: size in viewBox units.
    var N = {
      ian:       { label: 'Guard.IAN',     img: '/assets/img/eco/ian.webp',               x: 95,  y: 235, d: 96,  tx: 200, ty: 70,  td: 96 },
      ksto:      { label: 'KSTO',          img: '/assets/img/community/ksto.webp',        x: 410, y: 235, d: 132, tx: 200, ty: 245, td: 120, hub: true },
      snippy:    { label: 'Snippy',        img: '/assets/img/community/snippy.webp',      x: 680, y: 80,  d: 84,  tx: 72,  ty: 410, td: 74 },
      funky:     { label: 'Funkyverse',    img: '/assets/img/community/funkyverse.webp',  x: 890, y: 215, d: 80,  tx: 200, ty: 470, td: 70 },
      tokens:    { label: 'Vetted tokens', txt: '11',                                     x: 790, y: 395, d: 80,  tx: 328, ty: 410, td: 70 },
      snipverse: { label: 'Snipverse',     img: '/assets/img/community/snipverse.webp',   x: 575, y: 520, d: 78,  tx: 315, ty: 640, td: 70 },
      xpr:       { label: 'XPR Network',   img: '/assets/img/brand/XPR_Network-glyph-white.svg', x: 250, y: 480, d: 90,  tx: 110, ty: 670, td: 82 },
      cypher:    { label: 'CypherGang',    img: '/assets/img/community/cyphergang.webp',  x: 85,  y: 575, d: 76,  tx: 72,  ty: 875, td: 66 },
      vibrr:     { label: 'Vibrr',         txt: 'V',                                      x: 385, y: 585, d: 66,  tx: 250, ty: 885, td: 62 }
    };
    // a, b, label, bend (how far the road curves sideways), where the label sits along the road (0..1), on phones (optional): a bend, or exact control points [x1,y1,x2,y2]
    var E = [
      ['ian', 'ksto', "KSTO's AI agent", -.18, .5],
      ['ksto', 'snippy', 'mascot', .14, .5],
      ['ksto', 'funky', 'inside KSTO', -.1, .66],
      ['ksto', 'tokens', 'vets 11 tokens', -.12, .62],
      ['ksto', 'snipverse', 'close to KSTO', .12, .66],
      ['ian', 'xpr', 'reads it live', .2, .45, [30, 150, 140, 520]],
      ['xpr', 'ksto', 'home chain', .16, .36],
      ['xpr', 'snipverse', 'built on it', .18, .55],
      ['xpr', 'cypher', 'NFTs on it', .32, .5],
      ['xpr', 'vibrr', 'on it', .25, .55]
    ];
    var ROUTE = {
      ian: ['ian'], ksto: ['ian', 'ksto'], snippy: ['ian', 'ksto', 'snippy'], funky: ['ian', 'ksto', 'funky'],
      tokens: ['ian', 'ksto', 'tokens'], snipverse: ['ian', 'ksto', 'snipverse'], xpr: ['ian', 'xpr'],
      cypher: ['ian', 'xpr', 'cypher'], vibrr: ['ian', 'xpr', 'vibrr']
    };
    var TOUR = ['ksto', 'snippy', 'funky', 'tokens', 'snipverse', 'xpr', 'cypher', 'vibrr', 'ian'];

    var card = document.querySelector('[data-cm-card]');
    var tourBtn = document.querySelector('[data-cm-tour]');
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    stage.appendChild(svg);
    var stops = {}, paths = {}, labels = {}, spark = null, tall = false, current = 'ksto', anim = null, tourTimer = null;

    Object.keys(N).forEach(function (id) {
      var n = N[id];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cm-stop' + (n.hub ? ' cm-hub' : '');
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', n.label);
      b.innerHTML = (n.img ? '<img' + (n.img.indexOf('/brand/') > -1 ? ' class="brand-mark' + (n.img.indexOf('XPR_') > -1 ? ' cs-xpr' : '') + '"' : '') + ' src="' + n.img + '" alt="" width="160" height="160">' : '<span class="cm-txt">' + n.txt + '</span>') +
        '<span class="cm-lbl" aria-hidden="true">' + n.label + '</span>';
      b.addEventListener('click', function () { stopTour(); pick(id, true); });
      stage.appendChild(b);
      stops[id] = b;
    });

    function pt(id) { var n = N[id]; return tall ? [n.tx, n.ty] : [n.x, n.y]; }
    function key(a, b) { return a + '>' + b; }

    function layout() {
      tall = stage.clientWidth < 560;
      stage.classList.toggle('cm-tall', tall);
      var W = tall ? 400 : 1000, H = tall ? 980 : 660;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      paths = {}; labels = {};
      var gb = document.createElementNS(SVGNS, 'g'), gl = document.createElementNS(SVGNS, 'g'), gt = document.createElementNS(SVGNS, 'g');
      svg.appendChild(gb); svg.appendChild(gl); svg.appendChild(gt);
      E.forEach(function (e) {
        var p0 = pt(e[0]), p3 = pt(e[1]);
        var dx = p3[0] - p0[0], dy = p3[1] - p0[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
        var bend = tall && typeof e[5] === 'number' ? e[5] : e[3];
        var nx = -dy / len * bend * len, ny = dx / len * bend * len;
        var c1 = [p0[0] + dx / 3 + nx, p0[1] + dy / 3 + ny], c2 = [p0[0] + 2 * dx / 3 + nx, p0[1] + 2 * dy / 3 + ny];
        if (tall && e[5] && e[5].length === 4) { c1 = [e[5][0], e[5][1]]; c2 = [e[5][2], e[5][3]]; }
        var d = 'M' + p0 + ' C' + c1 + ' ' + c2 + ' ' + p3;
        var base = document.createElementNS(SVGNS, 'path');
        base.setAttribute('d', d); base.setAttribute('class', 'cm-path-base'); base.setAttribute('stroke-width', tall ? 13 : 16);
        var line = document.createElementNS(SVGNS, 'path');
        line.setAttribute('d', d); line.setAttribute('class', 'cm-path-line'); line.setAttribute('stroke-width', tall ? 2 : 2.4);
        line.setAttribute('stroke-dasharray', tall ? '7 9' : '9 11');
        gb.appendChild(base); gl.appendChild(line);
        var u = e[4] || .5, v = 1 - u;
        var mx = v * v * v * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * p3[0];
        var my = v * v * v * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * p3[1];
        var t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', mx); t.setAttribute('y', my + 6); t.setAttribute('text-anchor', 'middle');
        t.setAttribute('class', 'cm-elabel'); t.setAttribute('font-size', tall ? 17 : 19);
        t.textContent = e[2];
        gt.appendChild(t);
        paths[key(e[0], e[1])] = { base: base, line: line };
        labels[key(e[0], e[1])] = t;
      });
      spark = document.createElementNS(SVGNS, 'circle');
      spark.setAttribute('r', tall ? 7 : 8); spark.setAttribute('class', 'cm-spark');
      var s0 = pt('ian'); spark.setAttribute('cx', s0[0]); spark.setAttribute('cy', s0[1]);
      svg.appendChild(spark);
      Object.keys(N).forEach(function (id) {
        var p = pt(id), n = N[id];
        stops[id].style.left = (p[0] / W * 100) + '%';
        stops[id].style.top = (p[1] / H * 100) + '%';
        stops[id].style.setProperty('--d', ((tall ? n.td : n.d) / W * 100) + '%');
      });
      highlight(current, false);
    }

    function edgeFor(a, b) {
      if (paths[key(a, b)]) return { p: paths[key(a, b)], l: labels[key(a, b)], rev: false };
      return { p: paths[key(b, a)], l: labels[key(b, a)], rev: true };
    }

    function highlight(id, animate) {
      Object.keys(paths).forEach(function (k) { paths[k].base.classList.remove('on'); paths[k].line.classList.remove('on'); labels[k].classList.remove('on'); });
      Object.keys(stops).forEach(function (k) { stops[k].classList.remove('cm-on-route'); stops[k].setAttribute('aria-pressed', k === id ? 'true' : 'false'); });
      var r = ROUTE[id], legs = [];
      r.forEach(function (s) { stops[s].classList.add('cm-on-route'); });
      for (var i = 0; i < r.length - 1; i++) {
        var e = edgeFor(r[i], r[i + 1]);
        e.p.base.classList.add('on'); e.p.line.classList.add('on'); e.l.classList.add('on');
        legs.push(e);
      }
      if (anim) cancelAnimationFrame(anim);
      var end = pt(id);
      if (!animate || reduce || !legs.length) { spark.setAttribute('cx', end[0]); spark.setAttribute('cy', end[1]); return; }
      var lens = legs.map(function (e) { return e.p.base.getTotalLength(); });
      var total = lens.reduce(function (a, b) { return a + b; }, 0);
      var dur = 700 + total * 1.4, t0 = null;
      (function step(now) {
        if (t0 === null) t0 = now;
        var k = Math.min((now - t0) / dur, 1), ease = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var dist = ease * total, i = 0;
        while (i < legs.length - 1 && dist > lens[i]) { dist -= lens[i]; i++; }
        var L = lens[i], at = legs[i].rev ? L - Math.min(dist, L) : Math.min(dist, L);
        var q = legs[i].p.base.getPointAtLength(at);
        spark.setAttribute('cx', q.x); spark.setAttribute('cy', q.y);
        if (k < 1) anim = requestAnimationFrame(step);
      })(performance.now());
    }

    function pick(id, animate) {
      current = id;
      highlight(id, animate);
      var tpl = document.querySelector('template[data-cm-card="' + id + '"]');
      if (tpl && card) {
        card.innerHTML = '';
        var route = document.createElement('p');
        route.className = 'cm-route';
        route.textContent = ROUTE[id].map(function (s) { return N[s].label; }).join('  →  ');
        card.appendChild(route);
        card.appendChild(tpl.content.cloneNode(true));
      }
    }

    function stopTour() {
      clearTimeout(tourTimer); tourTimer = null;
      if (tourBtn) { tourBtn.setAttribute('aria-pressed', 'false'); tourBtn.textContent = 'Walk the road'; }
    }
    if (tourBtn) tourBtn.addEventListener('click', function () {
      if (tourTimer) { stopTour(); return; }
      tourBtn.setAttribute('aria-pressed', 'true'); tourBtn.textContent = 'Stop';
      var i = 0;
      (function next() {
        pick(TOUR[i], true);
        i++;
        if (i >= TOUR.length) { tourTimer = setTimeout(stopTour, 3600); return; }
        tourTimer = setTimeout(next, 3600);
      })();
    });

    var rt = null;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 120); });
    layout();
    pick('ksto', false);
  }

  /* ---------------- 2. tabs and step flows ---------------- */
  var sets = document.querySelectorAll('[data-cm-tabs]');
  Array.prototype.forEach.call(sets, function (set) {
    var tabs = set.querySelectorAll('[role="tab"]');
    function choose(tab, focus) {
      Array.prototype.forEach.call(tabs, function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
    Array.prototype.forEach.call(tabs, function (t, i) {
      t.addEventListener('click', function () { choose(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length, j = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % n;
        if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + n) % n;
        if (k === 'Home') j = 0;
        if (k === 'End') j = n - 1;
        if (j !== null) { e.preventDefault(); choose(tabs[j], true); }
      });
    });
    var start = set.querySelector('[role="tab"][aria-selected="true"]') || tabs[0];
    if (start) choose(start);
  });
})();
