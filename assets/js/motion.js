/* StandGuard v3: shared motion and interaction (reveal on scroll, intro film, pinned story, desk scenes, tabs, chapter index, menu).
   No framework, no CDN, no inline script (the site CSP keeps script-src to 'self').
   Everything here is progressive: with JavaScript off, every page still reads top to bottom. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  document.documentElement.classList.add('js');
  if (reduce) document.documentElement.classList.add('reduce');

  /* Mobile menu */
  var tog = document.querySelector('[data-navtoggle]');
  var menu = document.getElementById('site-menu');
  if (tog && menu) {
    tog.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      tog.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) { menu.classList.remove('open'); tog.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* Reveal on scroll */
  var rv = document.querySelectorAll('.rv');
  if (reduce || !('IntersectionObserver' in window)) {
    for (var i = 0; i < rv.length; i++) rv[i].classList.add('in');
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    for (var j = 0; j < rv.length; j++) io.observe(rv[j]);
  }

  /* Intro video: plays muted only where it is cheap and welcome.
     Phones, data-saver and reduced-motion get the poster and a play button instead. */
  var vids = document.querySelectorAll('video[data-intro]');
  for (var v = 0; v < vids.length; v++) {
    (function (vid) {
      var small = window.innerWidth < 760;
      if (!reduce && !saveData && !small) {
        vid.muted = true;
        var p = vid.play(); if (p && p.catch) p.catch(function () {});
      }
      var btn = document.querySelector('[data-sound="' + vid.id + '"]');
      if (btn) btn.addEventListener('click', function () {
        if (vid.paused) { var q = vid.play(); if (q && q.catch) q.catch(function () {}); }
        vid.muted = !vid.muted;
        btn.setAttribute('aria-pressed', vid.muted ? 'false' : 'true');
        btn.textContent = vid.muted ? 'Sound on' : 'Sound off';
      });
    })(vids[v]);
  }

  /* Pinned horizontal story (direction A). Vertical scroll moves the frames sideways.
     Off on narrow screens and for reduced motion: CSS shows a swipe row instead. */
  var pin = document.querySelector('[data-pin]');
  if (pin && !reduce) {
    var track = pin.querySelector('[data-track]');
    var bar = pin.querySelector('[data-progress]');
    var par = pin.querySelector('[data-par]');
    var active = false;
    var size = function () {
      active = window.innerWidth >= 900;
      pin.classList.toggle('pinned', active);
      if (!active) { pin.style.height = ''; track.style.transform = ''; return; }
      var extra = track.scrollWidth - window.innerWidth + 96;
      pin.style.height = (window.innerHeight + Math.max(extra, 0)) + 'px';
      onScroll();
    };
    var onScroll = function () {
      if (!active) return;
      var r = pin.getBoundingClientRect();
      var total = pin.offsetHeight - window.innerHeight;
      var t = Math.min(Math.max(-r.top / (total || 1), 0), 1);
      var extra = track.scrollWidth - window.innerWidth + 96;
      track.style.transform = 'translate3d(' + (-t * Math.max(extra, 0)) + 'px,0,0)';
      if (bar) bar.style.transform = 'scaleX(' + t + ')';
      if (par) par.style.transform = 'translate3d(' + (-t * 14) + '%,0,0) scale(1.25)';
    };
    window.addEventListener('resize', size);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('load', size);
    size();
  }

  /* Answer console replay (direction B). Lines appear one by one; Replay starts again. */
  var con = document.querySelector('[data-console]');
  if (con) {
    var lines = con.querySelectorAll('.cl');
    var timer = null;
    var run = function () {
      clearTimeout(timer);
      for (var k = 0; k < lines.length; k++) lines[k].classList.remove('on');
      if (reduce) { for (var m = 0; m < lines.length; m++) lines[m].classList.add('on'); return; }
      var n = 0;
      var step = function () {
        if (n >= lines.length) return;
        lines[n].classList.add('on');
        var d = +(lines[n].getAttribute('data-wait') || 520);
        n++; timer = setTimeout(step, d);
      };
      step();
    };
    var rp = document.querySelector('[data-replay]');
    if (rp) rp.addEventListener('click', run);
    if ('IntersectionObserver' in window) {
      var seen = false;
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !seen) { seen = true; run(); }
      }, { threshold: 0.35 }).observe(con);
    } else { run(); }
  }

  /* Tabs (direction B "What he does", direction A tools). Plain buttons, arrow keys move. */
  var tabsets = document.querySelectorAll('[data-tabs]');
  for (var s = 0; s < tabsets.length; s++) {
    (function (set) {
      var tabs = set.querySelectorAll('[role="tab"]');
      var pick = function (tab) {
        for (var x = 0; x < tabs.length; x++) {
          var on = tabs[x] === tab;
          tabs[x].setAttribute('aria-selected', on ? 'true' : 'false');
          tabs[x].tabIndex = on ? 0 : -1;
          var panel = document.getElementById(tabs[x].getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        }
      };
      for (var y = 0; y < tabs.length; y++) {
        tabs[y].addEventListener('click', function (e) { pick(e.currentTarget); });
        tabs[y].addEventListener('keydown', function (e) {
          var idx = Array.prototype.indexOf.call(tabs, e.currentTarget);
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); var nx = tabs[(idx + 1) % tabs.length]; pick(nx); nx.focus(); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); var pv = tabs[(idx - 1 + tabs.length) % tabs.length]; pick(pv); pv.focus(); }
        });
      }
    })(tabsets[s]);
  }

  /* Chapter index (direction C): highlights the chapter you're reading. */
  var idx = document.querySelectorAll('[data-chapter-link]');
  if (idx.length && 'IntersectionObserver' in window) {
    var map = {};
    for (var c = 0; c < idx.length; c++) map[idx[c].getAttribute('href').slice(1)] = idx[c];
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          for (var z in map) map[z].removeAttribute('aria-current');
          map[e.target.id].setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    for (var key in map) { var el = document.getElementById(key); if (el) co.observe(el); }
  }

  /* The desk (direction B): as each item scrolls to the middle, the screen beside it switches scene. */
  var steps = document.querySelectorAll('[data-step]');
  if (steps.length && 'IntersectionObserver' in window) {
    var scenes = document.querySelectorAll('.screen [data-scene]');
    var show = function (id) {
      for (var a = 0; a < steps.length; a++) steps[a].classList.toggle('active', steps[a].getAttribute('data-step') === id);
      for (var b2 = 0; b2 < scenes.length; b2++) scenes[b2].classList.toggle('on', scenes[b2].getAttribute('data-scene') === id);
      var lbl = document.querySelector('[data-screen-label]');
      var cur = document.querySelector('.screen [data-scene="' + id + '"]');
      if (lbl && cur) lbl.textContent = cur.getAttribute('data-title') || '';
    };
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) show(e.target.getAttribute('data-step')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    for (var st = 0; st < steps.length; st++) so.observe(steps[st]);
    show(steps[0].getAttribute('data-step'));
  }

  /* Option switcher on every preview */
  var yr = document.getElementById('pv-year'); if (yr) yr.textContent = new Date().getFullYear();
})();

/* v3 shell: menu drop-downs. One open at a time; Escape or a click elsewhere closes them;
   the current page is marked in the menu. */
(function () {
  'use strict';
  var groups = document.querySelectorAll('.menu .dd');
  var close = function (except) { for (var g = 0; g < groups.length; g++) if (groups[g] !== except) groups[g].removeAttribute('open'); };
  for (var k = 0; k < groups.length; k++) groups[k].addEventListener('toggle', function (ev) { if (ev.target.open) close(ev.target); });
  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.menu .dd')) close(null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(null); });
  var path = window.location.pathname.replace(/\/+$/, '') || '/';
  var links = document.querySelectorAll('.menu a[href^="/"]');
  var best = null;
  for (var i = 0; i < links.length; i++) {
    var href = (links[i].getAttribute('href') || '').split('#')[0].replace(/\/+$/, '') || '/';
    if (links[i].getAttribute('href').indexOf('#') > -1) continue;
    if (href === '/' ? path === '/' : (path === href || path.indexOf(href + '/') === 0)) {
      if (!best || href.length > (best.getAttribute('href') || '').length) best = links[i];
    }
  }
  if (best) best.setAttribute('aria-current', 'page');
})();
