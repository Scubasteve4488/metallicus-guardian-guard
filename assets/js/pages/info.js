/* StandGuard v3: small helpers for the info pages. Nothing here moves on its own.
   1) About: find a question, open or close them all.
   2) Contact: "I'm here about..." highlights the right way in; copy the email address.
   3) Corrections: search and filter the log, open or close every entry.
   No inline script, no third-party request. With JavaScript off every answer and every entry is simply shown. */
(function () {
  'use strict';
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var norm = function (s) { return (s || '').toLowerCase().replace(/\s+/g, ' '); };

  /* ---------- 1. FAQ ---------- */
  var faq = document.querySelector('[data-in-faq]');
  if (faq) {
    var items = faq.querySelectorAll('.acc-item');
    var q = faq.querySelector('[data-in-faq-search]');
    var all = faq.querySelector('[data-in-faq-all]');
    var count = faq.querySelector('[data-in-faq-count]');
    var empty = faq.querySelector('[data-in-faq-empty]');
    var setOpen = function (item, on) {
      item.classList.toggle('open', on);
      var b = item.querySelector('.acc-q');
      if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
    };
    var visible = function () { return Array.prototype.filter.call(items, function (it) { return !it.hidden; }); };
    var label = function () {
      var v = visible();
      var anyClosed = v.some(function (it) { return !it.classList.contains('open'); });
      if (all) all.textContent = anyClosed ? 'Open all' : 'Close all';
    };
    var filter = function () {
      var term = norm(q.value).trim();
      var shown = 0;
      each(items, function (it) {
        var hit = !term || norm(it.textContent).indexOf(term) > -1;
        it.hidden = !hit;
        if (hit) shown++;
        setOpen(it, !!term && hit);
      });
      if (count) count.textContent = term ? shown + ' of ' + items.length + ' questions' : items.length + ' questions';
      if (empty) empty.classList.toggle('on', shown === 0);
      label();
    };
    if (q) q.addEventListener('input', filter);
    if (all) all.addEventListener('click', function () {
      var v = visible();
      var anyClosed = v.some(function (it) { return !it.classList.contains('open'); });
      v.forEach(function (it) { setOpen(it, anyClosed); });
      label();
    });
    // site.js toggles single questions; keep the button label honest afterwards
    faq.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.acc-q')) setTimeout(label, 0); });
    if (count) count.textContent = items.length + ' questions';
  }

  /* ---------- 2. Contact ---------- */
  var pick = document.querySelector('[data-in-pick]');
  var doors = document.querySelector('[data-in-doors]');
  if (pick && doors) {
    var chips = pick.querySelectorAll('[data-fit]');
    var hint = pick.querySelector('[data-in-hint]');
    var reset = function () {
      doors.classList.remove('in-filtering');
      each(doors.querySelectorAll('[data-door]'), function (d) { d.classList.remove('in-fit'); });
      each(chips, function (c) { c.setAttribute('aria-pressed', 'false'); });
      if (hint) hint.textContent = '';
    };
    each(chips, function (c) {
      c.addEventListener('click', function () {
        var was = c.getAttribute('aria-pressed') === 'true';
        reset();
        if (was) return;
        c.setAttribute('aria-pressed', 'true');
        var fit = (c.getAttribute('data-fit') || '').split(/\s*,\s*/);
        doors.classList.add('in-filtering');
        each(doors.querySelectorAll('[data-door]'), function (d) {
          d.classList.toggle('in-fit', fit.indexOf(d.getAttribute('data-door')) > -1);
        });
        if (hint) {
          hint.textContent = c.getAttribute('data-hint') || '';
          var href = c.getAttribute('data-link');
          if (href) {
            var a = document.createElement('a');
            a.href = href;
            a.textContent = c.getAttribute('data-link-text') || href;
            hint.appendChild(document.createTextNode(' '));
            hint.appendChild(a);
          }
        }
      });
    });
  }
  each(document.querySelectorAll('[data-in-copy]'), function (btn) {
    var status = document.querySelector('[data-in-copy-status]');
    var said = function (msg) {
      btn.textContent = msg;
      if (status) status.textContent = msg;
      setTimeout(function () { btn.textContent = 'Copy address'; if (status) status.textContent = ''; }, 2200);
    };
    var fallback = function (text) {
      var t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.position = 'absolute'; t.style.left = '-9999px';
      document.body.appendChild(t); t.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(t);
      said(ok ? 'Copied' : 'Select and copy it from the card');
    };
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-in-copy');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { said('Copied'); }, function () { fallback(text); });
      } else { fallback(text); }
    });
  });

  /* ---------- 3. Corrections log ---------- */
  var log = document.querySelector('[data-in-log]');
  if (log) {
    var entries = log.querySelectorAll('.cor-entry');
    var search = log.querySelector('[data-in-log-search]');
    var chipRow = log.querySelector('[data-in-log-topics]');
    var toggle = log.querySelector('[data-in-log-all]');
    var lcount = log.querySelector('[data-in-log-count]');
    var lempty = log.querySelector('[data-in-log-empty]');
    var topic = '';
    // topics come from the entries themselves, so new entries add their own chip
    var seen = {};
    var topics = [];
    each(entries, function (e) {
      var t = e.getAttribute('data-topic');
      var lab = e.querySelector('.cor-topic');
      if (t && !seen[t]) { seen[t] = true; topics.push([t, lab ? lab.textContent : t]); }
    });
    var mk = function (val, text) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'in-chip'; b.textContent = text;
      b.setAttribute('aria-pressed', val === topic ? 'true' : 'false');
      b.addEventListener('click', function () {
        topic = val;
        each(chipRow.querySelectorAll('.in-chip'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        apply();
      });
      chipRow.appendChild(b);
    };
    if (chipRow && topics.length > 1) {
      mk('', 'All');
      topics.forEach(function (t) { mk(t[0], t[1]); });
    }
    var shownEntries = function () { return Array.prototype.filter.call(entries, function (e) { return !e.hidden; }); };
    var tlabel = function () {
      if (!toggle) return;
      var anyClosed = shownEntries().some(function (e) { return !e.open; });
      toggle.textContent = anyClosed ? 'Open all' : 'Close all';
    };
    var apply = function () {
      var term = search ? norm(search.value).trim() : '';
      var n = 0;
      each(entries, function (e) {
        var ok = (!topic || e.getAttribute('data-topic') === topic) && (!term || norm(e.textContent).indexOf(term) > -1);
        e.hidden = !ok;
        if (ok) { n++; if (term) e.open = true; }
      });
      if (lcount) lcount.textContent = (n === entries.length ? 'All ' + n : n + ' of ' + entries.length) + (entries.length === 1 ? ' entry' : ' entries');
      if (lempty) lempty.classList.toggle('on', n === 0);
      tlabel();
    };
    if (search) search.addEventListener('input', apply);
    if (toggle) toggle.addEventListener('click', function () {
      var v = shownEntries();
      var anyClosed = v.some(function (e) { return !e.open; });
      v.forEach(function (e) { e.open = anyClosed; });
      tlabel();
    });
    each(entries, function (e) { e.addEventListener('toggle', tlabel); });
    // newest stays open; the rest fold away (all of them are open when JavaScript is off)
    var target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    each(entries, function (e, i) { e.open = target ? e === target : i === 0; });
    apply();
    // folding the entries above moved the one the link pointed at; bring it back into view
    if (target && target.classList.contains('cor-entry')) {
      try { target.scrollIntoView({ block: 'start', behavior: 'instant' }); } catch (e) { target.scrollIntoView(); }
    }
  }
})();
