/* /projects/pulsevm (v3, 2026-10-28): "watch the blocks get made".
   An illustration of the two rules the page states, slowed down and with made-up transactions:
   XPR Network today makes a block every half second from the active schedule, waiting transactions or not;
   PulseVM's code makes a block only when transactions are waiting, and the maker is drawn by stake.
   Nothing here is a measurement. */
(function () {
  'use strict';
  var root = document.querySelector('[data-pv]');
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var q = root.querySelector('[data-pv-q]');
  var track = root.querySelector('[data-pv-track]');
  var log = root.querySelector('[data-pv-log]');
  var who = root.querySelector('[data-pv-who]');
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-mode]'));
  var facts = Array.prototype.slice.call(root.querySelectorAll('[data-facts]'));
  var playBtn = root.querySelector('[data-pv-play]');
  var earlyBtn = root.querySelector('[data-pv-early]');
  var mode = 'xpr', height = 0, playing = !reduce, visible = false;
  var TICK = 1100;            /* one "half second" on XPR, slowed down so it can be followed */
  var tickT = null, txT = null, pulseT = null;

  /* automatic ticks update the text quietly; things the visitor does are announced */
  function say(t, quiet) { log.setAttribute('aria-live', quiet ? 'off' : 'polite'); log.textContent = t; }
  function waiting() { return Array.prototype.slice.call(q.querySelectorAll('.pv-tx:not(.early):not(.gone)')); }
  function addTx(early) {
    var d = document.createElement('i');
    d.className = 'pv-tx' + (early ? ' early' : '');
    q.appendChild(d);
    if (q.children.length > 18) q.removeChild(q.firstChild);
    return d;
  }
  function makeBlock(loud) {
    var w = waiting();
    w.forEach(function (d) { d.remove(); });
    height++;
    var li = document.createElement('li');
    li.className = 'pv-blk';
    var dots = ''; for (var i = 0; i < w.length; i++) dots += '<i></i>';
    li.innerHTML = '<span class="n">#' + height + '</span><span class="d">' + (dots || '<span class="e">empty</span>') + '</span>' +
      '<span class="w">' + (mode === 'xpr' ? 'next on schedule' : 'drawn by stake') + '</span>';
    track.appendChild(li);
    while (track.children.length > 8) track.removeChild(track.firstChild);
    say('Block #' + height + ' made' + (w.length ? ' with ' + w.length + ' transaction' + (w.length > 1 ? 's' : '') : ', empty') +
      (mode === 'xpr' ? '. On XPR Network a new block comes every half second.' : '. PulseVM made it because transactions were waiting; the maker was drawn by stake.'), !loud);
  }
  function schedulePulse() {
    if (mode !== 'pulse' || pulseT) return;
    pulseT = setTimeout(function () { pulseT = null; if (waiting().length) makeBlock(true); }, 700);
  }
  function randomTx() {
    clearTimeout(txT);
    if (!playing || !visible) return;
    txT = setTimeout(function () {
      addTx(false);
      if (mode === 'pulse') schedulePulse();
      randomTx();
    }, 900 + Math.random() * 3200);
  }
  function startTick() {
    clearInterval(tickT); tickT = null;
    if (mode === 'xpr' && playing && visible) tickT = setInterval(makeBlock, TICK);
  }
  function setMode(m) {
    mode = m;
    root.classList.toggle('pv-pulse', m === 'pulse');
    tabs.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'); });
    facts.forEach(function (f) { f.classList.toggle('is-on', f.dataset.facts === m); });
    earlyBtn.hidden = m !== 'pulse';
    who.textContent = m === 'xpr' ? '· made by the producer next in the active schedule' : '· maker drawn by stake, block by block';
    track.innerHTML = ''; q.innerHTML = ''; height = 0;
    clearTimeout(pulseT); pulseT = null;
    say(m === 'xpr' ? 'XPR Network today: a block arrives on every beat.' : 'PulseVM code: no transactions waiting, no block. Send one and watch.');
    startTick(); randomTx();
  }
  tabs.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });
  root.querySelector('[data-pv-send]').addEventListener('click', function () {
    addTx(false);
    if (mode === 'pulse') schedulePulse();
    else if (!playing) { makeBlock(true); return; }
    say('Transaction sent.' + (mode === 'pulse' ? ' The reply is only its id; the block comes when one is made.' : ' It goes into the next block.'));
  });
  earlyBtn.addEventListener('click', function () {
    var d = addTx(true);
    say('A buy sent too early: accepted into the queue...');
    setTimeout(function () {
      d.classList.add('gone');
      say('...then dropped. The sender carries a small charge on that node, which fades.');
      setTimeout(function () { d.remove(); }, 900);
    }, 1400);
  });
  playBtn.addEventListener('click', function () {
    playing = !playing;
    playBtn.textContent = playing ? 'Pause' : 'Play';
    startTick(); randomTx();
  });
  playBtn.textContent = playing ? 'Pause' : 'Play';
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; startTick(); randomTx(); }, { threshold: 0.2 }).observe(root);
  } else { visible = true; }
  setMode('xpr');
})();
