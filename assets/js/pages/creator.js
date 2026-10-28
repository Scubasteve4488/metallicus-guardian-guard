/* Creator: the build journey (v3, 2026-10-28).
   Builds a scroll-lit road from this page's own text: the jobs before (intro), when he started (intro),
   how he works (the checklist), what came out of it (the door cards), his tools (the tools paragraph) and
   what is next (the "Work with him" band). Nothing is typed in here, so the road always matches the page.
   With JavaScript off the journey is hidden and the sections below carry the same words. */
(function () {
  'use strict';
  var host = document.querySelector('[data-cj]');
  if (!host) return;
  var path = host.querySelector('[data-cj-path]');
  var reduce = document.documentElement.classList.contains('reduce') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function sectionBy(re) {
    var hs = document.querySelectorAll('main h2');
    for (var i = 0; i < hs.length; i++) if (re.test(txt(hs[i]))) return hs[i].closest('section');
    return null;
  }

  var stops = [];
  // intro: the jobs before, and when he started
  var leads = document.querySelectorAll('main section:first-of-type .lead'), intro = '';
  for (var l = 0; l < leads.length; l++) if (/Before that/.test(txt(leads[l]))) intro = txt(leads[l]);
  var jobs = intro.match(/worked in ([^.]+)\./);
  if (jobs) stops.push({ when: 'Before', title: 'Real-world work', chips: jobs[1].split(/,\s*|\s+and\s+/).filter(Boolean) });
  var start = intro.match(/^([^.]*?in (early \d{4})[^.]*\.)/);
  var how = intro.match(/(Everything on this site[^.]*\.)/);
  if (start) stops.push({ when: start[2], title: 'Started building with AI', text: start[1] + (how ? ' ' + how[1] : '') });

  var hw = sectionBy(/^How he works/);
  if (hw) stops.push({ when: 'Every step', title: 'How he works', chips: Array.prototype.map.call(hw.querySelectorAll('li strong'), function (s) { return txt(s).replace(/\.$/, ''); }) });

  var built = sectionBy(/^What he has built/);
  if (built) stops.push({ when: 'So far', title: 'What came out of it', links: Array.prototype.map.call(built.querySelectorAll('a.door'), function (a) { return { t: txt(a.querySelector('.door-t')), href: a.getAttribute('href') }; }) });

  var tools = sectionBy(/^Tools he uses/);
  if (tools) {
    var tt = txt(tools.querySelector('.lead')).replace(/\s*\([^)]*\)/g, '').replace(/For video and 3D:/, ',');
    // split on commas; "A and B" splits too, unless the last word is shared ("Telegram and X bots" stays one)
    var chips = [];
    tt.split(/,\s*|\.\s*/).forEach(function (s) {
      s = s.trim();
      if (!s) return;
      if (/\sand\s/.test(s) && !/\bbots$/.test(s)) chips.push.apply(chips, s.split(/\s+and\s+/));
      else chips.push(s);
    });
    stops.push({ when: 'Toolbox', title: 'Tools he uses', chips: chips });
  }

  var band = document.querySelector('main .builder-band');
  if (band) {
    var lead = txt(band.querySelector('.lead')).match(/^[^.]*\./);
    var link = band.querySelector('a.btn');
    stops.push({ when: 'Next', title: txt(band.querySelector('h2')), text: lead ? lead[0] : '', links: link ? [{ t: txt(link), href: link.getAttribute('href') }] : [], next: true });
  }
  if (stops.length < 3) return;

  stops.forEach(function (s) {
    var li = document.createElement('li');
    li.className = 'cj-stop' + (s.next ? ' cj-next' : '');
    li.innerHTML = '<span class="cj-when"></span><h3></h3>';
    li.querySelector('.cj-when').textContent = s.when;
    li.querySelector('h3').textContent = s.title;
    if (s.text) { var p = document.createElement('p'); p.textContent = s.text; li.appendChild(p); }
    var items = s.chips || s.links;
    if (items && items.length) {
      var ul = document.createElement('ul');
      ul.className = 'cj-chips';
      items.forEach(function (it, i) {
        var c = document.createElement('li');
        c.style.transitionDelay = reduce ? '0s' : (i * 70) + 'ms';
        if (typeof it === 'string') c.textContent = it;
        else {
          var a = document.createElement('a');
          a.href = it.href; a.textContent = it.t;
          if (/^https?:/.test(it.href)) a.rel = 'noopener';
          c.appendChild(a);
        }
        ul.appendChild(c);
      });
      li.appendChild(ul);
    }
    path.appendChild(li);
  });

  var els = path.querySelectorAll('.cj-stop');
  var fill = host.querySelector('.cj-fill'), orb = host.querySelector('.cj-orb');
  if (reduce) { for (var r = 0; r < els.length; r++) els[r].classList.add('lit'); orb.style.top = '100%'; return; }
  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight, line = vh * 0.62;
    var box = path.getBoundingClientRect();
    var p = Math.max(0, Math.min(1, (line - box.top) / box.height));
    fill.style.height = (p * 100) + '%';
    orb.style.top = (p * 100) + '%';
    for (var i = 0; i < els.length; i++) {
      var b = els[i].getBoundingClientRect();
      els[i].classList.toggle('lit', b.top + 12 < line);
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
