/* IAN report: the launch clock (v3, 2026-10-28).
   Reads every moment from this page's own timeline list (the <ul> after the "Timeline" heading):
   each item starts with a UTC time or a time range in bold. Nothing is typed in here.
   A slider and markers scrub through the launch; ranges (the reset loop) show as a band. */
(function () {
  'use strict';
  var host = document.querySelector('[data-rc]');
  if (!host) return;
  var heading = null, hs = document.querySelectorAll('main h2');
  for (var h = 0; h < hs.length; h++) if (/^Timeline/.test(hs[h].textContent.trim())) heading = hs[h];
  var list = heading && heading.parentNode.querySelector('ul');
  if (!list) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function secs(s) { var p = s.split(':').map(Number); return p[0] * 3600 + p[1] * 60 + (p[2] || 0); }
  function clock(t) { var hh = Math.floor(t / 3600), mm = Math.floor(t % 3600 / 60), ss = t % 60; return [hh, mm, ss].map(function (n) { return n < 10 ? '0' + n : '' + n; }).join(':'); }

  var events = [];
  Array.prototype.forEach.call(list.querySelectorAll('li'), function (li) {
    var strong = li.querySelector('strong');
    if (!strong) return;
    var m = strong.textContent.match(/^(\d{2}:\d{2}(?::\d{2})?)(?:\s*[–-]\s*(\d{2}:\d{2}(?::\d{2})?))?\s*[—-]\s*(.*)$/);
    if (!m) return;
    var title = m[3].replace(/[.,]\s*$/, '');
    var rest = li.textContent.replace(strong.textContent, '').trim();
    events.push({ t: secs(m[1]), end: m[2] ? secs(m[2]) : null, title: title, text: rest });
  });
  if (events.length < 2) return;
  var t0 = events[0].t, t1 = events[events.length - 1].t, span = t1 - t0;
  var track = host.querySelector('[data-rc-track]'), range = host.querySelector('[data-rc-range]');
  var timeEl = host.querySelector('[data-rc-time]'), tEl = host.querySelector('[data-rc-t]'), card = host.querySelector('[data-rc-card]');
  var fill = track.querySelector('.rc-fill');
  host.querySelector('[data-rc-start]').textContent = clock(t0) + ' UTC';
  host.querySelector('[data-rc-end]').textContent = clock(t1) + ' UTC';
  range.min = 0; range.max = span; range.step = 1; range.value = 0;
  function pct(t) { return ((t - t0) / span * 100); }

  var marks = [];
  events.forEach(function (ev, i) {
    if (ev.end) {
      var band = document.createElement('div');
      band.className = 'rc-band';
      band.style.left = pct(ev.t) + '%';
      band.style.width = (pct(ev.end) - pct(ev.t)) + '%';
      band.innerHTML = '<span></span>';
      band.querySelector('span').textContent = ev.title;
      track.appendChild(band);
    }
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'rc-mark';
    b.style.left = pct(ev.t) + '%';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', clock(ev.t) + ': ' + ev.title);
    b.addEventListener('click', function () { stop(); go(i); });
    track.appendChild(b);
    marks.push(b);
  });

  var cur = 0, timer = null;
  function show(t) {
    var idx = 0;
    for (var i = 0; i < events.length; i++) if (events[i].t <= t) idx = i;
    cur = idx;
    var ev = events[idx];
    timeEl.textContent = clock(t);
    var since = t - t0;
    tEl.textContent = 't+' + Math.floor(since / 60) + ' min ' + (since % 60) + ' s after the token was created';
    fill.style.width = pct(t) + '%';
    for (var k = 0; k < marks.length; k++) {
      marks[k].classList.toggle('past', events[k].t <= t);
      marks[k].setAttribute('aria-pressed', k === idx ? 'true' : 'false');
    }
    card.innerHTML = '<h3></h3><p></p>';
    card.querySelector('h3').textContent = clock(ev.t) + (ev.end ? '–' + clock(ev.end) : '') + ' · ' + ev.title;
    card.querySelector('p').textContent = ev.text;
  }
  function go(i) { var t = events[i].t; range.value = t - t0; show(t); }
  range.addEventListener('input', function () { stop(); show(t0 + (+range.value)); });
  host.querySelector('[data-rc-prev]').addEventListener('click', function () { stop(); go(Math.max(0, cur - 1)); });
  host.querySelector('[data-rc-next]').addEventListener('click', function () { stop(); go(Math.min(events.length - 1, cur + 1)); });
  var playBtn = host.querySelector('[data-rc-play]');
  function stop() { clearInterval(timer); timer = null; playBtn.textContent = 'Play the launch'; }
  playBtn.addEventListener('click', function () {
    if (timer) { stop(); return; }
    if (cur >= events.length - 1) go(0);
    playBtn.textContent = 'Pause';
    timer = setInterval(function () {
      if (cur >= events.length - 1) { stop(); return; }
      go(cur + 1);
    }, reduce ? 3000 : 2200);
  });
  go(0);
})();
