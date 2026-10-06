/* SignGuard, 2026-10-06 — five tabs, no camera.
 *
 * External rather than inline because the site's Content-Security-Policy sets
 * script-src 'self'. An inline script is refused outright.
 *
 * DICTIONARY — carried over unchanged in behaviour from signguard.js (2026-10-05):
 * live lookup against the Internet Archive collection "The ASL Dictionary" by
 * the Center for Accessible Technology in Sign (contributor Harley Hamilton).
 * Items are marked "Rights: Public Domain" by the uploader. Word items show a
 * real signer (checked by eye 2026-10-05 and again 2026-10-06 on museumASL).
 *
 * ONE ADDITION: the collection's 26 single-letter items (aASLASL, bASLASL,
 * dddASL ... zzzASL) are NOT a person. Frames pulled from all 26 on
 * 2026-10-06 show a computer-drawn cartoon hand beside a printed letter, the
 * same still image for the whole 3.5 s clip. The real-person rule says those
 * are never shown, so the lookup refuses their identifiers by name, and any
 * one-character lookup is sent to the Alphabet tab instead.
 *
 * ALPHABET — the letter list is plain HTML (works without script). This file
 * adds a self-check drill: show a letter, the learner makes it and judges it
 * themselves. No camera, no scoring, nothing stored. Camera recognition was
 * not built: no open-source recogniser was found whose code, weights AND
 * training data are all licensed cleanly (search recorded in the PR), and
 * writing our own handshape scoring is ruled out.
 */
(function () {
  "use strict";

  var IA_META = "https://archive.org/metadata/";
  var IA_FILE = "https://archive.org/download/";
  var IA_ITEM = "https://archive.org/details/";

  /* Words confirmed present (and a real signer) on 2026-10-05. */
  var SAMPLES = ["achieve", "basically", "crucify", "journalist",
                 "museum", "prefix", "squatter", "target", "tower"];

  /* The collection's letter items, read from archive.org 2026-10-06: rendered
   * drawings, not a person. Never played. */
  var RENDERED = {
    aASLASL: 1, bASLASL: 1, cASLASL: 1, dddASL: 1, eeeASL: 1, fffASL: 1,
    gggASL: 1, hhhASL: 1, iiiASL: 1, jjjASL: 1, kkkkASL: 1, lllASL: 1,
    mmmASL: 1, nnnASL: 1, oooASL: 1, pppASL: 1, qqqASL: 1, rrrASL: 1,
    sssASL: 1, tttASL: 1, uuuASL: 1, vvvASL: 1, wwwletterASL: 1,
    xxxASL: 1, yyyASL: 1, zzzASL: 1
  };

  function identifierFor(word) {
    return word.toLowerCase().replace(/[^a-z0-9]/g, "") + "ASL";
  }

  /* Prefer archive.org's ".ia.mp4" H.264 derivative; every browser plays it. */
  function pickVideo(files) {
    var best = null;
    for (var i = 0; i < files.length; i++) {
      var name = files[i].name || "";
      if (!/\.mp4$/i.test(name)) { continue; }
      if (/\.ia\.mp4$/i.test(name)) { return name; }
      if (!best) { best = name; }
    }
    return best;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function start() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".sg-tab"));
    var panels = Array.prototype.slice.call(document.querySelectorAll(".sg-panel"));
    var names = tabs.map(function (t) { return t.getAttribute("data-tab"); });

    /* ---- tabs ------------------------------------------------------ */
    function openTab(name, hash) {
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-tab") === name;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
      });
      panels.forEach(function (p) {
        p.hidden = p.getAttribute("data-panel") !== name;
      });
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", "#" + (hash || name));
      }
    }

    tabs.forEach(function (t) {
      t.addEventListener("click", function () { openTab(t.getAttribute("data-tab")); });
      t.addEventListener("keydown", function (e) {
        var i = tabs.indexOf(t);
        var next = null;
        if (e.key === "ArrowRight") { next = tabs[(i + 1) % tabs.length]; }
        if (e.key === "ArrowLeft") { next = tabs[(i - 1 + tabs.length) % tabs.length]; }
        if (e.key === "Home") { next = tabs[0]; }
        if (e.key === "End") { next = tabs[tabs.length - 1]; }
        if (next) { e.preventDefault(); next.focus(); openTab(next.getAttribute("data-tab")); }
      });
    });

    /* A hash may name a tab (#basics) or an anchor inside one (#film, #letters). */
    function fromHash() {
      var h = (window.location.hash || "").replace("#", "");
      if (names.indexOf(h) !== -1) { openTab(h); return; }
      var el = h ? document.getElementById(h) : null;
      var panel = el && el.closest ? el.closest(".sg-panel") : null;
      if (panel) {
        openTab(panel.getAttribute("data-panel"), h);
        el.scrollIntoView();
        return;
      }
      openTab("dictionary");
    }
    fromHash();

    /* In-page links into another tab, e.g. "Help us film it" on Coming next. */
    Array.prototype.forEach.call(document.querySelectorAll("a[data-goto]"), function (a) {
      a.addEventListener("click", function (e) {
        var target = document.getElementById((a.getAttribute("href") || "").replace("#", ""));
        e.preventDefault();
        openTab(a.getAttribute("data-goto"), target ? target.id : null);
        if (target) { target.scrollIntoView(); }
      });
    });

    setupDictionary(function () { openTab("alphabet", "letters"); var l = document.getElementById("letters"); if (l) { l.scrollIntoView(); } });
    setupDrill();
  }

  /* ---- dictionary -------------------------------------------------- */
  function setupDictionary(goAlphabet) {
    var form = document.getElementById("sg-form");
    var input = document.getElementById("sg-word");
    var stage = document.getElementById("sg-stage");
    var now = document.getElementById("sg-now");
    var video = document.getElementById("sg-video");
    var credit = document.getElementById("sg-credit");
    var status = document.getElementById("sg-status");
    var samples = document.getElementById("sg-samples");

    if (!form || !input || !video || !status) { return; }

    function say(message) {
      status.textContent = message;
      status.hidden = !message;
    }

    function look(word) {
      word = (word || "").trim();
      if (!word) { return; }

      var id = identifierFor(word);
      stage.hidden = true;
      video.removeAttribute("src");

      if (word.replace(/[^a-z0-9]/gi, "").length === 1 || RENDERED[id]) {
        say("Single letters are in the Alphabet tab. The dictionary's own letter entries are computer drawings, not a person, so they are not played here.");
        if (goAlphabet && word.replace(/[^a-z]/gi, "").length === 1) { goAlphabet(); }
        return;
      }

      say("Looking for “" + word + "”…");

      /* archive.org answers 200 with an empty object for an unknown item,
       * so an empty "files" is the real "no such word". */
      fetch(IA_META + encodeURIComponent(id))
        .then(function (r) {
          if (!r.ok) { throw new Error("archive.org returned " + r.status); }
          return r.json();
        })
        .then(function (data) {
          var files = (data && data.files) || [];
          if (!files.length) {
            say("No video for “" + word + "” in this collection. " +
                "It holds single words, so try a plain one — “run” rather than “running quickly”.");
            return;
          }
          var file = pickVideo(files);
          if (!file) {
            say("That word exists in the collection but has no playable video file.");
            return;
          }
          now.textContent = word;
          video.src = IA_FILE + encodeURIComponent(id) + "/" + encodeURIComponent(file);
          video.load();
          var p = video.play();
          if (p && typeof p.catch === "function") { p.catch(function () {}); }
          credit.href = IA_ITEM + id;
          stage.hidden = false;
          say("");
        })
        .catch(function (err) {
          say("Could not reach the Internet Archive just now. " +
              "The video lives there, not here, so this is their end or the network. (" + err.message + ")");
        });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      look(input.value);
    });

    video.addEventListener("error", function () {
      if (!video.getAttribute("src")) { return; }
      stage.hidden = true;
      say("That clip would not play. Try another word.");
    });

    SAMPLES.forEach(function (word) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sg-sample";
      b.textContent = word;
      b.addEventListener("click", function () { input.value = word; look(word); });
      samples.appendChild(b);
    });
  }

  /* ---- self-check drill -------------------------------------------- */
  function setupDrill() {
    var drill = document.getElementById("sg-drill");
    var letterEl = document.getElementById("sg-drill-letter");
    var desc = document.getElementById("sg-drill-desc");
    var show = document.getElementById("sg-drill-show");
    var got = document.getElementById("sg-drill-got");
    var again = document.getElementById("sg-drill-again");
    var count = document.getElementById("sg-drill-count");
    if (!drill || !letterEl || !desc || !show || !got || !again || !count) { return; }

    /* Read the letters from the HTML list so the drill and the list can never
     * disagree. J and Z move, so they are not drilled as still shapes. */
    var cards = Array.prototype.slice.call(document.querySelectorAll(".sg-letter"));
    var text = {};
    var still = [];
    cards.forEach(function (c) {
      var l = c.getAttribute("data-letter");
      var d = c.querySelector(".sg-desc");
      text[l] = d ? d.textContent : "";
      if (!c.getAttribute("data-moves")) { still.push(l); }
    });
    if (!still.length) { return; }

    var queue = [];
    var current = null;

    function render() {
      if (!queue.length) {
        letterEl.textContent = "✓";
        desc.hidden = true;
        show.hidden = true;
        got.textContent = "Start again";
        again.hidden = true;
        count.textContent = "All " + still.length + " still letters done. J and Z need a real clip; they are in the list below.";
        current = null;
        return;
      }
      current = queue[0];
      letterEl.textContent = current;
      desc.textContent = text[current];
      desc.hidden = true;
      show.hidden = false;
      show.setAttribute("aria-expanded", "false");
      show.textContent = "Show the description";
      got.textContent = "I made it — next";
      again.hidden = false;
      count.textContent = (still.length - queue.length) + " of " + still.length + " done";
    }

    function reset() {
      queue = shuffle(still.slice());
      render();
    }

    show.addEventListener("click", function () {
      var open = desc.hidden;
      desc.hidden = !open;
      show.setAttribute("aria-expanded", open ? "true" : "false");
      show.textContent = open ? "Hide the description" : "Show the description";
    });
    got.addEventListener("click", function () {
      if (!current) { reset(); return; }
      queue.shift();
      render();
    });
    again.addEventListener("click", function () {
      if (!current) { return; }
      /* Back into the queue a few places later, so it comes round again soon. */
      queue.shift();
      queue.splice(Math.min(3, queue.length), 0, current);
      render();
    });

    /* Clicking a letter in the list drills that letter next. */
    cards.forEach(function (c) {
      var l = c.getAttribute("data-letter");
      if (c.getAttribute("data-moves")) { return; }
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-o mt1";
      b.textContent = "Practise " + l;
      b.addEventListener("click", function () {
        if (!current) { reset(); }
        queue = queue.filter(function (x) { return x !== l; });
        queue.unshift(l);
        render();
        drill.scrollIntoView();
        got.focus();
      });
      c.appendChild(b);
    });

    drill.hidden = false;
    reset();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
