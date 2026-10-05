/* SignGuard — ASL fingerspelling player.
 *
 * External rather than inline because the site's Content-Security-Policy sets
 * script-src 'self'. An inline <script> is blocked outright, which is what
 * happened on first deploy: the page rendered with no buttons at all.
 *
 * Source of every clip: StudioGalt/Sign-Language-Mocap-Archive, CC0 1.0
 * (public domain, commercial use permitted). Licence verified 2026-10-05.
 *
 * Nothing here is generated. The archive also ships FBX rigs, Poses and
 * ShapeKeys; all of it is deliberately unused. Guard.IAN plays captured
 * motion of a real signer, or he shows nothing.
 */
(function () {
  "use strict";

  // The archive's folder naming is inconsistent — "SG ASL A 2024-6-16" but
  // "SG ASL C 1 2024-6-16" and "SG ASL P2 2024-6-17". Every stem below was
  // READ from the repository listing on 2026-10-05, not constructed from a
  // pattern. Full path, verified against three real samples (A, C, 9):
  //   SG ASL Fingerspelling/<Group>/<stem> Upload/Documentation/<stem> CC.mp4
  var CDN = "https://cdn.jsdelivr.net/gh/StudioGalt/Sign-Language-Mocap-Archive@main/SG ASL Fingerspelling/";

  var LETTERS = {
    "A": "SG ASL A 2024-6-16",   "B": "SG ASL B 2024-6-16",   "C": "SG ASL C 1 2024-6-16",
    "D": "SG ASL D 2 2024-6-16", "E": "SG ASL E 2 2024-6-16", "F": "SG ASL F 2024-6-16",
    "G": "SG ASL G 2024-6-16",   "H": "SG ASL H 2024-6-16",   "I": "SG ASL I 2 2024-6-16",
    "J": "SG ASL J 2 2024-6-16", "K": "SG ASL K 1 2024-6-16", "L": "SG ASL L 2024-6-16",
    "M": "SG ASL M 2 2024-6-16", "N": "SG ASL N 2 2024-6-16", "O": "SG ASL O 2024-6-16",
    "P": "SG ASL P2 2024-6-17",  "Q": "SG ASL Q 2 2024-6-17", "R": "SG ASL R 3 2024-6-17",
    "S": "SG ASL S 2 2024-6-17", "T": "SG ASL T 2 2024-6-17", "U": "SG ASL U 2 2024-6-17",
    "V": "SG ASL V 2 2024-6-17", "W": "SG ASL W 2 2024-6-17", "X": "SG ASL X 1 2024-6-17",
    "Y": "SG ASL Y 2024-6-17",   "Z": "SG ASL Z 2 2024-6-17"
  };

  var NUMBERS = {
    "0": "SG ASL 0 2024-6-17", "1": "SG ASL 1 2024-6-15", "2": "SG ASL 2 2024-6-15",
    "3": "SG ASL 3 2024-6-15", "4": "SG ASL 4 2024-6-15", "5": "SG ASL 5 2024-6-15",
    "6": "SG ASL 6 2024-6-15", "7": "SG ASL 7 2024-6-16", "8": "SG ASL 8 2024-6-16",
    "9": "SG ASL 9 2024-6-16", "10": "SG ASL 10 2024-6-15"
  };

  function start() {
    var video = document.getElementById("sg-video");
    var now = document.getElementById("sg-now");
    var err = document.getElementById("sg-err");
    var lettersBox = document.getElementById("sg-letters");
    var numbersBox = document.getElementById("sg-numbers");

    if (!video || !now || !lettersBox || !numbersBox) { return; }

    var keys = [];

    function url(group, stem) {
      var path = group + "/" + stem + " Upload/Documentation/" + stem + " CC.mp4";
      return CDN + path.split("/").map(encodeURIComponent).join("/");
    }

    function show(label, group, stem) {
      if (err) { err.style.display = "none"; }
      now.textContent = label;
      video.src = url(group, stem);
      video.load();
      // Autoplay may be refused by the browser or by Permissions-Policy.
      // The clip still loads and the controls still work, so a refusal here
      // is not an error and must not surface as one.
      var p = video.play();
      if (p && typeof p.catch === "function") { p.catch(function () {}); }
      keys.forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-label") === label ? "true" : "false");
      });
    }

    video.addEventListener("error", function () {
      if (err) { err.style.display = "block"; }
    });

    function build(box, map, group) {
      Object.keys(map).forEach(function (label) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sg-key";
        b.textContent = label;
        b.setAttribute("data-label", label);
        b.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-label", "Show the sign for " + label);
        b.addEventListener("click", function () { show(label, group, map[label]); });
        box.appendChild(b);
        keys.push(b);
      });
    }

    build(lettersBox, LETTERS, "Letters");
    build(numbersBox, NUMBERS, "Numbers");

    show("A", "Letters", LETTERS["A"]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
