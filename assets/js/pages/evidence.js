/* Evidence: watch a report come together (v3, 2026-10-28).
   Reads the five stages from this page's own list (#method ol), so the words are never written twice. Each stage adds a layer to an illustrated report sheet; the last
   one stamps it as read by a person. With JavaScript off the original lists show as they always did. */
(function () {
  'use strict';
  var host = document.querySelector('[data-ev-build]');
  var list = document.querySelector('#method ol');
  if (!host || !list) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = Array.prototype.map.call(list.querySelectorAll('li'), function (li) {
    var strong = li.querySelector('strong');
    var title = strong ? strong.textContent.replace(/\.$/, '') : '';
    var rest = li.textContent.replace(strong ? strong.textContent : '', '').trim();
    return { title: title, text: rest };
  });
  if (!items.length) return;

  var steps = host.querySelector('[data-ev-steps]');
  var sheet = host.querySelector('[data-ev-sheet]');
  var stamp = host.querySelector('[data-ev-stamp]');
  var layers = [];
  items.forEach(function (it, i) {
    var li = document.createElement('li');
    li.innerHTML = '<button type="button" class="ev-step"><span class="ev-n">' + (i + 1) + '</span><span><b></b><span class="ev-t"></span></span></button>';
    li.querySelector('b').textContent = it.title;
    li.querySelector('.ev-t').textContent = it.text;
    steps.appendChild(li);
    var last = i === items.length - 1;
    if (!last) {
      var lay = document.createElement('div');
      lay.className = 'ev-layer';
      lay.innerHTML = '<b></b><span class="ev-date">dated</span><span class="ev-lines"><i style="width:92%"></i><i style="width:78%"></i><i style="width:' + (55 + i * 9) + '%"></i></span>';
      lay.querySelector('b').textContent = it.title;
      sheet.insertBefore(lay, stamp);
      layers.push(lay);
    }
  });
  var btns = steps.querySelectorAll('.ev-step');
  var cur = -1, timer = null;
  function go(n) {
    cur = Math.max(0, Math.min(n, btns.length - 1));
    for (var i = 0; i < btns.length; i++) {
      if (i === cur) btns[i].setAttribute('aria-current', 'step'); else btns[i].removeAttribute('aria-current');
      btns[i].classList.toggle('done', i < cur);
    }
    for (var j = 0; j < layers.length; j++) layers[j].classList.toggle('on', j <= cur);
    stamp.classList.toggle('on', cur === btns.length - 1);
    host.querySelector('[data-ev-prev]').disabled = cur === 0;
    host.querySelector('[data-ev-next]').textContent = cur === btns.length - 1 ? 'Start again' : 'Next stage';
  }
  for (var b = 0; b < btns.length; b++) (function (i) { btns[i].addEventListener('click', function () { stopAuto(); go(i); }); })(b);
  host.querySelector('[data-ev-prev]').addEventListener('click', function () { stopAuto(); go(cur - 1); });
  host.querySelector('[data-ev-next]').addEventListener('click', function () { stopAuto(); go(cur === btns.length - 1 ? 0 : cur + 1); });
  function stopAuto() { clearInterval(timer); timer = null; }
  go(0);
  if (!reduce && 'IntersectionObserver' in window) {
    var started = false;
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !started) {
        started = true;
        timer = setInterval(function () { if (cur >= btns.length - 1) { stopAuto(); return; } go(cur + 1); }, 2600);
      }
    }, { threshold: 0.4 }).observe(host);
  }
  // hide the original list now that the stepper carries the same words
  list.classList.add('ev-replaced');
  list.hidden = true;

})();
