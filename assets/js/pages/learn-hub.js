/* /learn (v3, 2026-10-28): the learning lines.
   Pick a line; it lights up on the map, the stops on it are numbered in order, and the route shows as cards.
   Stop text comes from the destination cards on this page (data-what), so nothing new is claimed here. */
(function () {
  'use strict';
  var root = document.querySelector('[data-lm]');
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $$(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var buttons = $$('[data-route]');
  var lines = $$('.lm-line');
  var stops = $$('.lm-stop');
  var labels = $$('.lm-st');
  var why = root.querySelector('[data-lm-why]');
  var route = root.querySelector('[data-lm-route]');
  var byId = {};
  labels.forEach(function (l) { byId[l.dataset.st] = l; });
  var EXTRA = { account: ' Go straight to stop 1: your wallet and your name.', agents: ' Go straight to stop 6: XPR Agents, where Guard.IAN is one of the agents.' };

  lines.forEach(function (p) {
    var len = Math.ceil(p.getTotalLength ? p.getTotalLength() : 1000);
    p.style.setProperty('--len', len);
    p.style.strokeDasharray = len + ' ' + len;
  });

  function pick(btn) {
    var name = btn.dataset.line;
    var color = getComputedStyle(btn).getPropertyValue('--lc');
    var steps = btn.dataset.route.split(' ');
    var ids = steps.map(function (s) { return s.split('#')[0]; });
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    lines.forEach(function (p) {
      var on = p.dataset.line === name;
      p.classList.toggle('on', on);
      p.classList.remove('draw');
      if (on && !reduce) { void p.getBoundingClientRect(); p.classList.add('draw'); }
    });
    stops.forEach(function (s) { s.classList.toggle('off', ids.indexOf(s.dataset.st) < 0); });
    labels.forEach(function (l) {
      var k = ids.indexOf(l.dataset.st);
      l.classList.toggle('on', k > -1);
      l.classList.toggle('off', k < 0);
      l.style.setProperty('--lc', color);
      l.querySelector('b').textContent = k > -1 ? String(k + 1) : '';
    });
    root.style.setProperty('--lc', color);
    why.innerHTML = '<b>' + esc(btn.textContent) + ':</b> ' + esc(btn.dataset.why);
    route.innerHTML = steps.map(function (s, k) {
      var parts = s.split('#'), l = byId[parts[0]];
      var href = parts[1] ? l.getAttribute('href') + '#' + parts[1] : l.getAttribute('href');
      var title = l.querySelector('span').firstChild.textContent;
      return '<li data-n="' + (k + 1) + '" style="--k:' + k + '"><h3>' + esc(title) + '</h3><p>' + esc(l.dataset.what) + (parts[1] ? esc(EXTRA[parts[1]] || '') : '') + '</p><a href="' + esc(href) + '">Go to this stop &rarr;</a></li>';
    }).join('');
  }
  buttons.forEach(function (b, i) {
    b.addEventListener('click', function () { pick(b); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = buttons[(i + d + buttons.length) % buttons.length]; n.focus(); pick(n);
    });
  });
  pick(buttons[0]);
})();
