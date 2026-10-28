/* /learn/ecosystem: the ecosystem explorer (v3, 2026-10-28).
   Three rings (Metallicus products, institution and new-chain work, community-built), filters, and
   connection lines drawn from the chosen project to the projects it is documented to work with.
   Content lives in the HTML (data-* on each button) so the page reads the same with JavaScript off. */
(function () {
  'use strict';
  var root = document.querySelector('[data-ex]');
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nodes = Array.prototype.slice.call(root.querySelectorAll('[data-node]'));
  var core = root.querySelector('[data-core]');
  var card = root.querySelector('[data-card]');
  var svg = root.querySelector('.ex-svg');
  var map = root.querySelector('.ex-map');
  var filters = Array.prototype.slice.call(root.querySelectorAll('[data-filter]'));
  var count = root.querySelector('[data-count]');
  var byId = {};
  nodes.forEach(function (n) { byId[n.dataset.id] = n; });
  if (core) byId[core.dataset.id] = core;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* place nodes evenly around their ring */
  ['r1', 'r2', 'r3'].forEach(function (ring, k) {
    var list = nodes.filter(function (n) { return n.classList.contains(ring); });
    var offset = [-90, -54, -80][k];
    list.forEach(function (n, i) {
      n.style.setProperty('--a', (offset + 360 * i / list.length) + 'deg');
      n.style.setProperty('--i', String(i + k * 4));
    });
  });

  var wide = window.matchMedia('(min-width: 720px)');
  function mode() { root.classList.toggle('ex-orbit-on', wide.matches); draw(); }

  function centre(el) {
    var box = map.getBoundingClientRect();
    var t = el.querySelector('.ex-ic') || el.querySelector('img') || el;
    var r = t.getBoundingClientRect();
    return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
  }

  var current = null;
  function draw() {
    if (!svg) return;
    while (svg.lastChild) svg.removeChild(svg.lastChild);
    if (!current || !root.classList.contains('ex-orbit-on')) return;
    var from = centre(current);
    var links = (current.dataset.links || '').split(' ').filter(Boolean);
    links.forEach(function (id) {
      var to = byId[id];
      if (!to || to.classList.contains('is-off')) return;
      var p = centre(to);
      var l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', from.x); l.setAttribute('y1', from.y);
      l.setAttribute('x2', p.x); l.setAttribute('y2', p.y);
      svg.appendChild(l);
    });
  }

  function pick(n, user) {
    if (user) { stopAuto(); }
    current = n;
    nodes.concat(core ? [core] : []).forEach(function (x) { x.setAttribute('aria-pressed', x === n ? 'true' : 'false'); });
    var d = n.dataset;
    var links = (d.links || '').split(' ').filter(Boolean).map(function (id) {
      var t = byId[id]; return t ? '<button type="button" class="ex-jump" data-jump="' + esc(id) + '">' + esc(t.dataset.name) + '</button>' : '';
    }).join('');
    var stClass = d.stclass ? ' ' + esc(d.stclass) : '';
    card.innerHTML =
      '<p class="ex-who">' + esc(d.maker) + ' · <span class="ex-st' + stClass + '">' + esc(d.status) + '</span></p>' +
      '<h3>' + esc(d.name) + '</h3>' +
      '<p>' + esc(d.what) + '</p>' +
      (d.tool ? '<p class="ex-tool">Guard.IAN reads it with <code>' + esc(d.tool) + '</code>' + (d.toolwhat ? ': ' + esc(d.toolwhat) : '') + '</p>' : (d.toolwhat ? '<p class="ex-tool">' + esc(d.toolwhat) + '</p>' : '')) +
      (links ? '<p class="ex-con"><span>Connected to</span>' + links + '</p>' : '') +
      '<p class="ex-links"><a href="' + esc(d.url) + '" rel="noopener">Official site ↗</a>' + (d.learn ? ' <a href="' + esc(d.learn) + '">More on this site</a>' : '') + '</p>' +
      '<p class="ex-src">' + esc(d.src || '') + '</p>';
    draw();
  }

  card.addEventListener('click', function (e) {
    var b = e.target.closest('[data-jump]');
    if (!b) return;
    var t = byId[b.getAttribute('data-jump')];
    if (t) { pick(t, true); if (t.focus) t.focus({ preventScroll: true }); }
  });
  nodes.concat(core ? [core] : []).forEach(function (n) {
    n.addEventListener('click', function () { pick(n, true); });
  });

  /* filters dim the projects outside the chosen group and take them out of the tab order */
  function filter(tag) {
    var shown = 0;
    nodes.forEach(function (n) {
      var on = tag === 'all' || (' ' + n.dataset.tags + ' ').indexOf(' ' + tag + ' ') > -1;
      n.classList.toggle('is-off', !on);
      n.tabIndex = on ? 0 : -1;
      n.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (on) shown++;
    });
    filters.forEach(function (f) { f.setAttribute('aria-pressed', f.dataset.filter === tag ? 'true' : 'false'); });
    if (count) count.textContent = shown + ' of ' + nodes.length + ' projects shown';
    if (current && current.classList.contains('is-off')) {
      var first = nodes.filter(function (n) { return !n.classList.contains('is-off'); })[0];
      if (first) pick(first);
    } else draw();
  }
  filters.forEach(function (f) { f.addEventListener('click', function () { stopAuto(); filter(f.dataset.filter); }); });

  /* gentle tour until someone touches it */
  var auto = null, idx = 0, touched = false;
  function stopAuto() { touched = true; clearInterval(auto); auto = null; }
  function tour() {
    if (touched) return;
    var live = nodes.filter(function (n) { return !n.classList.contains('is-off'); });
    idx = (idx + 1) % live.length; pick(live[idx]);
  }

  wide.addEventListener ? wide.addEventListener('change', mode) : wide.addListener(mode);
  window.addEventListener('resize', draw);
  mode();
  filter('all');
  pick(core || nodes[0]);

  if (!reduce && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) {
        root.classList.add('ex-in');
        setTimeout(draw, 1200);
        if (!auto && !touched) auto = setInterval(tour, 5200);
      } else { clearInterval(auto); auto = null; }
    }, { threshold: 0.3 }).observe(map);
    map.addEventListener('mouseenter', stopAuto);
    map.addEventListener('focusin', stopAuto);
  } else root.classList.add('ex-in');
})();
