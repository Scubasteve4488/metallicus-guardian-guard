/* SignGuard — one page, three tabs, no wandering.
 *
 * External rather than inline because the site's Content-Security-Policy sets
 * script-src 'self'. An inline script is refused outright.
 *
 * TAB 1 — Dictionary. Live lookup against the Internet Archive collection
 * "The ASL Dictionary" by the Center for Accessible Technology in Sign
 * (contributor Harley Hamilton, contact smartsigndictionary@gmail.com). Every
 * item checked on 2026-10-05 is marked "Rights: Public Domain" on archive.org,
 * and the operator confirmed by eye that the signer is a real person.
 *
 * Identifier pattern, verified against eight items (achieve, squatter,
 * basically, museum, crucify, tower, journalist, prefix): <word>ASL.
 * Nothing is downloaded or stored here - the page asks archive.org for one
 * item's file list, then plays one file.
 *
 * TAB 2 — Alphabet. Deliberately empty. The clips that shipped on 2026-10-05
 * were Blender renders of a 3D model, not a person, and were pulled the same
 * day. Nothing goes back in this tab until there is footage of a real signer.
 * Showing nothing is correct; showing a model and calling it a person is not.
 *
 * TAB 3 — How it's made. Static text in the HTML.
 */
(function () {
  "use strict";

  var IA_META = "https://archive.org/metadata/";
  var IA_FILE = "https://archive.org/download/";
  var IA_ITEM = "https://archive.org/details/";

  /* Words confirmed present in the collection on 2026-10-05. These exist as
   * starting points so the page does something the moment it loads, rather
   * than showing an empty box and daring the visitor to guess a word. */
  var SAMPLES = ["achieve", "basically", "crucify", "journalist",
                 "museum", "prefix", "squatter", "target", "tower"];

  /* archive.org identifiers have no spaces or punctuation: "creative commons"
   * is stored as "creativecommonsASL2". Lowercase, strip everything that is
   * not a letter or digit, then append ASL. */
  function identifierFor(word) {
    return word.toLowerCase().replace(/[^a-z0-9]/g, "") + "ASL";
  }

  /* Prefer the ".ia.mp4" derivative: archive.org generates it as H.264, which
   * every browser plays. An original upload may be in a codec that some do not. */
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

  function start() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".sg-tab"));
    var panels = Array.prototype.slice.call(document.querySelectorAll(".sg-panel"));

    /* ---- tabs ------------------------------------------------------ */
    function openTab(name) {
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-tab") === name;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
      });
      panels.forEach(function (p) {
        p.hidden = p.getAttribute("data-panel") !== name;
      });
      /* Keep the tab in the URL so a visitor can send someone a link to the
       * dictionary rather than to the page and a sentence of instructions.
       * replaceState, not pushState - switching tabs should not fill up the
       * Back button. */
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", "#" + name);
      }
    }

    tabs.forEach(function (t) {
      t.addEventListener("click", function () { openTab(t.getAttribute("data-tab")); });
      t.addEventListener("keydown", function (e) {
        var i = tabs.indexOf(t);
        var next = null;
        if (e.key === "ArrowRight") { next = tabs[(i + 1) % tabs.length]; }
        if (e.key === "ArrowLeft") { next = tabs[(i - 1 + tabs.length) % tabs.length]; }
        if (next) { e.preventDefault(); next.focus(); openTab(next.getAttribute("data-tab")); }
      });
    });

    var fromUrl = (window.location.hash || "").replace("#", "");
    openTab(fromUrl === "alphabet" || fromUrl === "made" ? fromUrl : "dictionary");

    /* ---- dictionary ------------------------------------------------ */
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
      say("Looking for \u201c" + word + "\u201d\u2026");

      /* archive.org answers with the item's full file list. If the item does
       * not exist it answers 200 with an empty object, not a 404 - so an
       * empty "files" is the real "no such word", not an error. */
      fetch(IA_META + encodeURIComponent(id))
        .then(function (r) {
          if (!r.ok) { throw new Error("archive.org returned " + r.status); }
          return r.json();
        })
        .then(function (data) {
          var files = (data && data.files) || [];
          if (!files.length) {
            say("No video for \u201c" + word + "\u201d in this collection. " +
                "It holds single words, so try a plain one \u2014 \u201crun\u201d rather than \u201crunning quickly\u201d.");
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
