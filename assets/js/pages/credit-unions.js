/* /learn/credit-unions (v3, 2026-10-28).
   1) Where your dollar sits: pick a question, see how each of three places answers it.
   2) Warning-sign checker: tick what a message does; see which official signs match and the steps from section 8.
   All wording lives in the HTML, so the page reads the same with JavaScript off. */
(function () {
  'use strict';
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* 1. where your dollar sits */
  var where = document.querySelector('[data-cu-where]');
  if (where) {
    var qs = $$('.cu-qs button', where);
    var rows = $$('.cu-col dl > div', where);
    function show(q) {
      qs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.q === q ? 'true' : 'false'); });
      rows.forEach(function (r) { r.classList.toggle('is-on', r.dataset.q === q); });
    }
    where.classList.add('cu-on');
    qs.forEach(function (b, i) {
      b.addEventListener('click', function () { show(b.dataset.q); });
      b.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!k) return;
        e.preventDefault();
        var n = qs[(i + k + qs.length) % qs.length]; n.focus(); show(n.dataset.q);
      });
    });
    show('insured');
  }

  /* 2. warning-sign checker */
  var check = document.querySelector('[data-cu-check]');
  if (!check) return;
  var flags = $$('.cu-flag', check);
  var out = check.querySelector('[data-cu-out]');
  var idle = out.innerHTML;
  function render() {
    var on = flags.filter(function (f) { return f.getAttribute('aria-pressed') === 'true'; });
    out.classList.toggle('hot', on.length > 0);
    if (!on.length) { out.innerHTML = idle; return; }
    var meter = flags.map(function (f, i) { return '<i' + (i < on.length ? ' class="on"' : '') + '></i>'; }).join('');
    var says = on.map(function (f) {
      return '<li>' + esc(f.dataset.say) + '<a href="' + esc(f.dataset.ref) + '">read &sect;' + esc(sec(f.dataset.ref)) + '</a></li>';
    }).join('');
    out.innerHTML =
      '<p class="cu-score"><b>' + on.length + ' of ' + flags.length + ' official warning signs match.</b> ' +
      (on.length === 1 ? 'One is enough to stop and check.' : 'Stop and check before you do anything else.') + '</p>' +
      '<div class="cu-meter" aria-hidden="true">' + meter + '</div>' +
      '<ul class="cu-says">' + says + '</ul>' +
      '<h3>What the official pages say to do</h3>' +
      '<ol class="cu-do">' +
      '<li>Stop, and don\'t send anything more.</li>' +
      '<li>Call your credit union on the number you already trust: the one on your card or statement.</li>' +
      '<li>If you already paid through a crypto exchange or crypto ATM, contact that company right away, say it was fraud, and ask it to reverse the payment.</li>' +
      '<li>Report it at <a href="https://reportfraud.ftc.gov" rel="noopener">ReportFraud.ftc.gov</a> and <a href="https://www.ic3.gov" rel="noopener">ic3.gov</a>.</li>' +
      '</ol>' +
      '<button type="button" class="cu-reset" data-cu-reset>Clear the ticks</button>';
  }
  var SEC = { '#scams': '7', '#protect': '15', '#key': '6', '#interest': '12', '#help': '8' };
  function sec(ref) { return SEC[ref] || ''; }
  flags.forEach(function (f) {
    f.addEventListener('click', function () {
      f.setAttribute('aria-pressed', f.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      render();
    });
  });
  out.addEventListener('click', function (e) {
    if (!e.target.closest('[data-cu-reset]')) return;
    flags.forEach(function (f) { f.setAttribute('aria-pressed', 'false'); });
    render();
    if (flags[0]) flags[0].focus();
  });
})();
