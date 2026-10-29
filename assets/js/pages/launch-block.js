/* Launch block visual (v3, 2026-10-28).
   Draws the first legal block of a SimpleDEX launch, buy by buy, in packing order.
   The data is never typed into this file: it is read from the report pages' own tables
   (Place / Account / XPR rows, ours marked with .row-pass) and their summary list (dl.kv).
   - [data-lb-self]      on a /launches/<token> report: reads this page.
   - [data-lb-explorer]  on /launches: each pick fetches that launch's own report page (same site).
   STARS has no report page yet, so its pick carries the numbers from the /launches table itself. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* Read one report page (a Document) into plain data. */
  function parseReport(doc) {
    var main = doc.querySelector('main') || doc;
    var kv = {}, dl = main.querySelector('dl.kv');
    if (dl) {
      var dts = dl.querySelectorAll('dt');
      for (var i = 0; i < dts.length; i++) {
        var dd = dts[i].nextElementSibling;
        kv[txt(dts[i])] = { text: txt(dd), link: dd && dd.querySelector('a') ? dd.querySelector('a').getAttribute('href') : '' };
      }
    }
    var buys = [];
    var rows = main.querySelectorAll('table.tbl tbody tr');
    for (var r = 0; r < rows.length; r++) {
      var place = rows[r].querySelector('[data-th="Place"]');
      if (!place) continue;
      buys.push({
        place: parseInt(txt(place), 10),
        ours: rows[r].classList.contains('row-pass') || !!rows[r].querySelector('.badge.bg'),
        xpr: txt(rows[r].querySelector('[data-th="XPR"]'))
      });
    }
    var title = txt(main.querySelector('.sec-label'));
    return { kv: kv, buys: buys, label: title };
  }

  function fleetOf(kv) {
    var t = (kv['Our wallets in it'] || {}).text || '';
    var m = t.match(/(\d+)\s+of\s+(\d+)/);
    return m ? { inBlock: +m[1], fleet: +m[2] } : { inBlock: 0, fleet: 0, none: true };
  }

  function render(stage, d) {
    var kv = d.kv, buys = d.buys;
    var f = fleetOf(kv);
    var ours = buys.filter(function (b) { return b.ours; });
    var in10 = ours.filter(function (b) { return b.place <= 10; }).length;
    var test = (kv['Top-10 test'] || {}).text || '';
    var pass = /PASS/.test(test), none = f.none || /did not take part/i.test(test);
    var block = kv['First legal block'] || {};
    var sizes = ours.length ? ours[0].xpr + ' XPR per wallet' : '';
    var meta = '<p class="lb-meta">' +
      (d.name ? '<span><b>' + esc(d.name) + '</b></span>' : '') +
      (block.text ? '<span>block <a href="' + esc(block.link || ('https://explorer.xprnetwork.org/block/' + block.text)) + '" rel="noopener">' + esc(block.text) + '</a></span>' : '') +
      (kv.Stamped ? '<span>' + esc(kv.Stamped.text) + '</span>' : '') +
      (kv['Built by'] ? '<span>built by ' + esc(kv['Built by'].text.replace(/\s*\(block producer\)/, '')) + '</span>' : '') +
      '<span>' + buys.length + ' buys in the block</span></p>';
    var lane = '<div class="lb-lanewrap"><ol class="lb-lane lb-hidden" aria-label="Buys in the first legal block, in order">';
    for (var i = 0; i < buys.length; i++) {
      var b = buys[i];
      lane += '<li class="lb-slot' + (b.ours ? ' ours' : '') + '"><span class="lb-sq" title="Place ' + b.place + (b.ours ? ', Guard.IAN wallet' : ', another buyer') + (b.xpr ? ', ' + esc(b.xpr) + ' XPR' : '') + '">' + b.place + '</span>' +
        '<span class="lb-who">' + (b.ours ? 'Guard.IAN' : 'Another buyer') + '</span>' +
        (b.xpr ? '<span class="lb-xpr">' + esc(b.xpr) + '</span>' : '') + '</li>';
    }
    lane += '</ol></div>';
    var verdict = '<div class="lb-verdict">' +
      '<div><b>' + (none ? 'Not taking part' : ours.length + ' of ' + f.fleet) + '</b>his wallets in this block</div>' +
      (none ? '' : '<div><b>' + in10 + ' of ' + f.fleet + '</b>inside the fastest 10</div>') +
      '<div class="' + (none ? '' : pass ? 'lb-pass' : 'lb-fail') + '"><b>' + esc(test || '—') + '</b>the top-10 test</div>' +
      (sizes ? '<div><b>' + esc(sizes.split(' ')[0]) + ' XPR</b>per wallet in this block</div>' : '') +
      '</div>';
    var later = kv['Our later buys'] ? '<p class="lb-note">Later: ' + esc(kv['Our later buys'].text) + '.</p>' : '';
    var grad = kv.Graduated ? '<p class="lb-note">Graduated: ' + esc(kv.Graduated.text) + '.</p>' : '';
    var link = d.href ? ' <a class="pk-btn" href="' + esc(d.href) + '">Full report →</a>' : '';
    stage.innerHTML = meta + lane + verdict + later + grad +
      '<div class="lb-actions"><button type="button" class="pk-btn" data-lb-replay>Replay the block</button>' + link +
      '<span class="lb-legend"><span><i class="o"></i>Guard.IAN wallet</span><span><i></i>Another buyer</span></span></div>' +
      (d.note ? '<p class="lb-note">' + d.note + '</p>' : '');
    var laneEl = stage.querySelector('.lb-lane');
    // the dashed "fastest 10" frame around the first ten slots
    var slots = laneEl.querySelectorAll('.lb-slot');
    if (slots.length) {
      var last = slots[Math.min(10, slots.length) - 1];
      var frame = document.createElement('div');
      frame.className = 'lb-top10';
      frame.setAttribute('aria-hidden', 'true');
      frame.innerHTML = '<span>Fastest 10</span>';
      laneEl.appendChild(frame);
      var place = function () {
        frame.style.left = (slots[0].offsetLeft - 6) + 'px';
        frame.style.width = (last.offsetLeft + last.offsetWidth - slots[0].offsetLeft + 12) + 'px';
      };
      place();
      window.addEventListener('resize', place);
    }
    play(laneEl);
    stage.querySelector('[data-lb-replay]').addEventListener('click', function () { play(laneEl); });
  }

  function play(laneEl) {
    var sqs = laneEl.querySelectorAll('.lb-sq');
    if (reduce) { laneEl.classList.remove('lb-hidden'); return; }
    laneEl.classList.add('lb-hidden');
    for (var i = 0; i < sqs.length; i++) sqs[i].style.transitionDelay = (i * 110) + 'ms';
    void laneEl.offsetWidth;
    requestAnimationFrame(function () { laneEl.classList.remove('lb-hidden'); });
  }

  /* --- a report page draws its own block --- */
  var self = document.querySelector('[data-lb-self]');
  if (self) {
    var data = parseReport(document);
    if (data.buys.length) {
      data.name = self.getAttribute('data-name') || '';
      render(self, data);
    }
  }

  /* --- the explorer on /launches --- */
  var ex = document.querySelector('[data-lb-explorer]');
  if (ex) {
    var stage = ex.querySelector('[data-lb-stage]');
    var picks = ex.querySelectorAll('[data-launch]');
    var cache = {}, playTimer = null, current = 0;
    var show = function (btn) {
      for (var p = 0; p < picks.length; p++) picks[p].setAttribute('aria-pressed', picks[p] === btn ? 'true' : 'false');
      var id = btn.getAttribute('data-launch'), name = btn.getAttribute('data-name');
      if (btn.hasAttribute('data-inline')) {
        // STARS: numbers from the /launches table itself (no report page yet)
        var places = btn.getAttribute('data-ours').split(',').map(Number), total = +btn.getAttribute('data-total');
        var buys = [];
        for (var k = 1; k <= total; k++) buys.push({ place: k, ours: places.indexOf(k) > -1, xpr: places.indexOf(k) > -1 ? btn.getAttribute('data-size') : '' });
        render(stage, {
          name: name, buys: buys,
          kv: { 'First legal block': { text: btn.getAttribute('data-block') }, 'Stamped': { text: btn.getAttribute('data-date') },
                'Our wallets in it': { text: places.length + ' of ' + btn.getAttribute('data-fleet') }, 'Top-10 test': { text: btn.getAttribute('data-test') } },
          note: esc(btn.getAttribute('data-note') || '')
        });
        return;
      }
      var src = btn.getAttribute('data-src');
      if (cache[id]) { render(stage, cache[id]); return; }
      stage.innerHTML = '<p class="lb-note">Reading the ' + esc(name) + ' report…</p>';
      fetch(src, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (html) {
          var d = parseReport(new DOMParser().parseFromString(html, 'text/html'));
          d.name = name; d.href = src;
          if (btn.getAttribute('data-note')) d.note = esc(btn.getAttribute('data-note'));
          cache[id] = d;
          if (btn.getAttribute('aria-pressed') === 'true') render(stage, d);
        })
        .catch(function () { if (btn.getAttribute('aria-pressed') !== 'true') return; /* the visitor already picked another launch */ stage.innerHTML = '<p class="lb-note">Couldn\'t load the ' + esc(name) + ' report just now. The table below has every launch, and the <a href="' + esc(src) + '">full report</a> has every buy.</p>'; });
    };
    for (var q = 0; q < picks.length; q++) {
      (function (i) {
        picks[i].addEventListener('click', function () { stopPlay(); current = i; show(picks[i]); });
      })(q);
    }
    var playBtn = ex.querySelector('[data-lb-playall]');
    var stopPlay = function () { clearInterval(playTimer); playTimer = null; if (playBtn) playBtn.textContent = 'Play every launch in order'; };
    if (playBtn) playBtn.addEventListener('click', function () {
      if (playTimer) { stopPlay(); return; }
      current = 0; show(picks[0]); playBtn.textContent = 'Stop';
      playTimer = setInterval(function () {
        current++;
        if (current >= picks.length) { stopPlay(); return; }
        show(picks[current]);
      }, reduce ? 4000 : 3600);
    });
    show(picks[picks.length - 1]);
  }
})();
