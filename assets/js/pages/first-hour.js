/* /learn/first-hour (v3, 2026-10-28): walk the six stops.
   Lights the stop you're reading, lets you tick stops off (kept only in this browser, never sent anywhere),
   and adds a "next stop" link at the end of each one. */
(function () {
  'use strict';
  var trail = document.querySelector('[data-fh]');
  if (!trail) return;
  var KEY = 'sg-first-hour-v1';
  var links = Array.prototype.slice.call(trail.querySelectorAll('[data-stop]'));
  var ids = links.map(function (a) { return a.dataset.stop; });
  var names = links.map(function (a) { return a.querySelector('.fh-l').textContent; });
  var sections = ids.map(function (id) { return document.getElementById(id); });
  var fill = trail.querySelector('.fh-fill');
  var count = trail.querySelector('[data-fh-count]');
  var now = trail.querySelector('[data-fh-now]');
  var done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { done = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) { /* storage off: ticks last this visit only */ } }

  var buttons = [];
  sections.forEach(function (sec, i) {
    if (!sec) return;
    var h = sec.querySelector('h2');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'fh-done';
    b.setAttribute('aria-pressed', done[ids[i]] ? 'true' : 'false');
    b.textContent = done[ids[i]] ? 'Stop ' + (i + 1) + ' done' : 'Mark stop ' + (i + 1) + ' as done';
    b.addEventListener('click', function () {
      done[ids[i]] = !done[ids[i]]; if (!done[ids[i]]) delete done[ids[i]];
      save(); paint();
    });
    h.insertAdjacentElement('afterend', b);
    buttons[i] = b;
    var foot = document.createElement('p');
    foot.className = 'mt2';
    if (i < ids.length - 1) {
      foot.innerHTML = '<a class="fh-next" href="#' + ids[i + 1] + '">Next stop: ' + names[i + 1] + ' &darr;</a>';
    } else {
      foot.innerHTML = '<a class="fh-next" href="#' + ids[0] + '">Back to stop 1 &uarr;</a>';
    }
    sec.appendChild(foot);
  });

  var current = 0;
  function paint() {
    var n = 0;
    links.forEach(function (a, i) {
      var d = !!done[ids[i]]; if (d) n++;
      a.classList.toggle('is-done', d);
      a.classList.toggle('is-now', i === current);
      if (i === current) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      a.setAttribute('aria-label', 'Stop ' + (i + 1) + ': ' + names[i] + (d ? ', done' : ''));
      var b = buttons[i];
      if (b) { b.setAttribute('aria-pressed', d ? 'true' : 'false'); b.textContent = d ? 'Stop ' + (i + 1) + ' done' : 'Mark stop ' + (i + 1) + ' as done'; }
    });
    fill.style.width = 'calc((100% - 100% / 6) * ' + (current / (ids.length - 1)) + ')';
    count.innerHTML = '<b>' + n + ' of ' + ids.length + '</b> stops done' + (n === ids.length ? ' &middot; that\'s your first hour' : '');
    now.textContent = 'Now: ' + (current + 1) + '. ' + names[current];
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { var i = sections.indexOf(e.target); if (i > -1 && i !== current) { current = i; paint(); } }
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    sections.forEach(function (s) { if (s) io.observe(s); });
  }
  trail.querySelector('[data-fh-reset]').addEventListener('click', function () { done = {}; save(); paint(); });
  paint();
})();
