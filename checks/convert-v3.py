#!/usr/bin/env python3
"""Move an inner page from the old shell to the v3 shell (2026-10-28). Idempotent.

For each page given (default: every deployed page except the homepage):
  - head: drop the Google Fonts links, load the self-hosted fonts, keep site.css, add v3-pages.css after it
  - replace the old <nav id="nav"> with the v3 header and the old <footer id="site-footer"> with the v3 footer
    (both copied byte-for-byte from docs/SHELL-V3.html, so check-site keeps them identical)
  - load motion.js after site.js (reveal on scroll, menu drop-downs, current page marked)
  - add the reveal class to every section after the first
Page content is not otherwise touched.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
shell = (ROOT / "docs/SHELL-V3.html").read_text(encoding="utf-8")
HEADER = re.search(r'<header class="top">.*?</header>', shell, re.S).group(0)
FOOTER = re.search(r'<footer class="foot">.*?</footer>', shell, re.S).group(0)


def convert(path):
    t = path.read_text(encoding="utf-8")
    if '<header class="top">' in t:
        return False
    t = re.sub(r'<link rel="preconnect" href="https://fonts\.(googleapis|gstatic)\.com"[^>]*>\n', '', t)
    t = re.sub(r'<link href="https://fonts\.googleapis\.com[^>]*>\n', '', t)
    t = t.replace('<link rel="stylesheet" href="/assets/css/site.css">',
                  '<link rel="stylesheet" href="/assets/fonts/fonts.css">\n'
                  '<link rel="stylesheet" href="/assets/css/site.css">\n'
                  '<link rel="stylesheet" href="/assets/css/v3-pages.css">', 1)
    t, n1 = re.subn(r'<nav id="nav".*?</nav>', HEADER, t, count=1, flags=re.S)
    t, n2 = re.subn(r'<footer id="site-footer">.*?</footer>', FOOTER, t, count=1, flags=re.S)
    if not (n1 and n2):
        raise SystemExit("%s: old nav/footer not found" % path)
    t = t.replace('<script src="/assets/js/site.js"></script>',
                  '<script src="/assets/js/site.js"></script>\n<script src="/assets/js/motion.js"></script>', 1)
    # reveal every section after the first one inside <main>
    m0, m1 = t.find('<main'), t.find('</main>')
    main = t[m0:m1]
    count = [0]

    def add_rv(m):
        count[0] += 1
        if count[0] == 1:
            return m.group(0)
        cls = m.group(1)
        return m.group(0) if ' rv' in cls else m.group(0).replace(cls, cls + ' rv', 1)

    main = re.sub(r'<section class="([^"]*)"', add_rv, main)
    t = t[:m0] + main + t[m1:]
    path.write_text(t, encoding="utf-8")
    return True


if __name__ == "__main__":
    pages = [pathlib.Path(p) for p in sys.argv[1:]] or [
        p for p in ROOT.rglob("*.html")
        if "legacy" not in p.parts and ".git" not in p.parts and "docs" not in p.parts
        and "checks" not in p.parts and p != ROOT / "index.html"]
    done = [str(p.relative_to(ROOT)) for p in pages if convert(p)]
    print("converted %d pages" % len(done))
