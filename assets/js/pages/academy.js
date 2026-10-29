/* /learn/academy (v3 polish, 2026-10-28): if a YouTube thumbnail can't load, show a calm placeholder instead of a broken image. */
(function () {
  'use strict';
  Array.prototype.forEach.call(document.querySelectorAll('.vthumb img'), function (img) {
    function off() { img.parentNode.classList.add('off'); }
    if (img.complete && img.naturalWidth === 0) off();
    else img.addEventListener('error', off);
  });
})();
