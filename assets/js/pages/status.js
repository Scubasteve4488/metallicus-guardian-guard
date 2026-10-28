/* Status board (v3, 2026-10-28). Counts are read from the cards on this page, never typed in.
   Chips and meter segments filter the lists below; parked items fold to their name.
   With JavaScript off the page is the plain list it always was. */
(function () {
  'use strict';
  var board = document.querySelector('[data-st-board]');
  if (!board) return;
  var groups = [
    { id: 'live', label: 'Live', cls: 'st-live' },
    { id: 'testing', label: 'Built, not proven', cls: 'st-testing' },
    { id: 'off', label: 'Off for now', cls: 'st-off' },
    { id: 'parked', label: 'Parked', cls: 'st-parked' }
  ];
  var total = 0;
  groups.forEach(function (g) {
    g.sec = document.getElementById(g.id);
    g.n = g.sec ? g.sec.querySelectorAll('.card').length : 0;
    total += g.n;
  });

  /* meter */
  var meter = board.querySelector('[data-st-meter]');
  var legend = board.querySelector('[data-st-legend]');
  meter.classList.add('st-zero');
  groups.forEach(function (g) {
    if (!g.n) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'st-seg ' + g.cls;
    b.style.flexGrow = g.n;
    b.setAttribute('aria-label', g.label + ': ' + g.n + ' of ' + total + '. Show only these.');
    b.innerHTML = '<span>' + g.n + '</span>';
    b.addEventListener('click', function () { pick(g.id); });
    meter.appendChild(b);
    legend.insertAdjacentHTML('beforeend', '<span><i class="' + g.cls + '"></i>' + g.label + ' · ' + g.n + '</span>');
  });
  requestAnimationFrame(function () { requestAnimationFrame(function () { meter.classList.remove('st-zero'); }); });

  /* chips */
  var chips = board.querySelectorAll('[data-st-filter]');
  var summary = board.querySelector('[data-st-summary]');
  for (var c = 0; c < chips.length; c++) {
    var id = chips[c].getAttribute('data-st-filter');
    var g = groups.filter(function (x) { return x.id === id; })[0];
    var n = chips[c].querySelector('.pk-n');
    if (n) n.textContent = id === 'all' ? total : (g ? g.n : 0);
    chips[c].addEventListener('click', function (e) { pick(e.currentTarget.getAttribute('data-st-filter')); });
  }
  function pick(id) {
    for (var i = 0; i < chips.length; i++) chips[i].setAttribute('aria-pressed', chips[i].getAttribute('data-st-filter') === id ? 'true' : 'false');
    groups.forEach(function (g) {
      if (!g.sec) return;
      var hide = id !== 'all' && g.id !== id;
      g.sec.classList.toggle('st-hidden', hide);
      var prev = g.sec.previousElementSibling;
      if (prev && /\bdiv(-g)?\b/.test(prev.className)) prev.classList.toggle('st-hidden', hide);
      if (!hide) g.sec.classList.add('in');
    });
    var gg = groups.filter(function (x) { return x.id === id; })[0];
    summary.textContent = id === 'all'
      ? 'Showing all ' + total + ' parts of the project.'
      : 'Showing ' + gg.n + ' of ' + total + ': ' + gg.label.toLowerCase() + '.';
  }
  pick('all');

  /* parked items fold to their name */
  var parked = document.getElementById('parked');
  if (parked) {
    var cards = parked.querySelectorAll('.card');
    for (var k = 0; k < cards.length; k++) {
      var h = cards[k].querySelector('h3'), body = cards[k].querySelector('p');
      if (!h || !body) continue;
      var bid = 'st-p-' + k;
      body.id = bid;
      body.classList.add('st-body');
      body.hidden = true;
      cards[k].classList.add('st-fold');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'st-fold-btn';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', bid);
      btn.textContent = h.textContent;
      h.textContent = '';
      h.appendChild(btn);
      btn.addEventListener('click', function (e) {
        var b2 = e.currentTarget, p = document.getElementById(b2.getAttribute('aria-controls'));
        var open = b2.getAttribute('aria-expanded') !== 'true';
        b2.setAttribute('aria-expanded', open ? 'true' : 'false');
        p.hidden = !open;
      });
    }
  }
})();
