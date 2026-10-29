/* Proof kit: the path map (v3, 2026-10-28).
   [data-pk-flow] holds one or more paths. Each path is an <ol class="pk-flow" data-path="..."> of stages;
   each stage is a button followed by a <p class="pk-note"> with its detail. Tabs switch paths; a stage
   shows its note in the detail box. With JavaScript off, every path and every note is plain text. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var boxes = document.querySelectorAll('[data-pk-flow]');
  for (var b = 0; b < boxes.length; b++) setup(boxes[b]);

  function setup(box) {
    var tabs = box.querySelectorAll('[data-path-tab]');
    var paths = box.querySelectorAll('ol[data-path]');
    var rails = box.querySelectorAll('[data-rails]');
    var detail = box.querySelector('[data-pk-detail]');
    var cur = null, timer = null, touched = false, idx = 0;

    function nodesOf(path) { return path.querySelectorAll('.pk-node'); }
    function choose(node) {
      var path = node.closest('ol[data-path]');
      var all = nodesOf(path);
      for (var i = 0; i < all.length; i++) {
        all[i].setAttribute('aria-pressed', all[i] === node ? 'true' : 'false');
        if (all[i] === node) idx = i;
      }
      var note = node.parentNode.querySelector('.pk-note');
      var title = node.querySelector('.pk-lbl');
      detail.innerHTML = '<h3>' + (title ? title.textContent : '') + '</h3>' + (note ? note.innerHTML : '');
    }
    function showPath(id) {
      for (var t = 0; t < tabs.length; t++) tabs[t].setAttribute('aria-pressed', tabs[t].getAttribute('data-path-tab') === id ? 'true' : 'false');
      for (var p = 0; p < paths.length; p++) {
        var on = paths[p].getAttribute('data-path') === id;
        paths[p].hidden = !on;
        if (on) cur = paths[p];
      }
      for (var r = 0; r < rails.length; r++) rails[r].hidden = rails[r].getAttribute('data-rails') !== id;
      idx = 0;
      choose(nodesOf(cur)[0]);
    }
    function tick() {
      if (touched || !cur) return;
      var all = nodesOf(cur);
      idx = (idx + 1) % all.length;
      choose(all[idx]);
    }
    function stop() { touched = true; clearInterval(timer); timer = null; }

    for (var t = 0; t < tabs.length; t++) tabs[t].addEventListener('click', function (e) { stop(); showPath(e.currentTarget.getAttribute('data-path-tab')); });
    var nodes = box.querySelectorAll('.pk-node');
    for (var n = 0; n < nodes.length; n++) nodes[n].addEventListener('click', function (e) { stop(); choose(e.currentTarget); });
    box.addEventListener('keydown', function (e) {
      if (!cur || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      if (!e.target.classList || !e.target.classList.contains('pk-node')) return;
      var all = nodesOf(cur), i = Array.prototype.indexOf.call(all, e.target);
      var next = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
      stop(); choose(next); next.focus(); e.preventDefault();
    });

    box.classList.add('pk-flow-on');
    showPath(tabs.length ? tabs[0].getAttribute('data-path-tab') : paths[0].getAttribute('data-path'));
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !touched && !timer) timer = setInterval(tick, 3800);
        else if (!es[0].isIntersecting) { clearInterval(timer); timer = null; }
      }, { threshold: 0.35 }).observe(box);
    }
  }
})();
