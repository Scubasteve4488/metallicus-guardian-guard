/* StandGuard — shared behaviour.
   Deliberately small. No framework, no CDN, no wallet connection, no analytics.
   Every handler is bound here so the pages need no inline script and the CSP can
   keep script-src to 'self'. */
(function () {
  'use strict';

  /* Mobile navigation toggle */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* Mark the current route in the menu. Compares the path only, so
     /community/ksto highlights Community without a hand-written flag per page. */
  var path = window.location.pathname.replace(/\/+$/, '') || '/';
  var navLinks = document.querySelectorAll('#nav-links .nav-link');
  var best = null;
  for (var i = 0; i < navLinks.length; i++) {
    var href = navLinks[i].getAttribute('href') || '';
    if (href === '/' ? path === '/' : (path === href || path.indexOf(href + '/') === 0)) {
      if (!best || href.length > (best.getAttribute('href') || '').length) best = navLinks[i];
    }
  }
  if (best) best.setAttribute('aria-current', 'page');

  /* FAQ / question accordions. Buttons carry .acc-q inside an .acc-item. */
  document.addEventListener('click', function (e) {
    var q = e.target.closest ? e.target.closest('.acc-q') : null;
    if (!q) return;
    var item = q.closest('.acc-item');
    if (!item) return;
    var open = item.classList.toggle('open');
    q.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* Footer year */
  var y = document.getElementById('foot-year');
  if (y) y.textContent = String(new Date().getUTCFullYear());
})();
