#!/usr/bin/env python3
"""StandGuard site checks. Run from the repository root:  python3 tools/check-site.py

This is a test, not a build step — Cloudflare Pages deploys the committed HTML
as-is and never runs this. It checks four things that are easy to break:

  1. every internal link and every redirect destination resolves to a real file
  2. every old route in the redirect map has a rule
  3. the shared nav and footer are byte-identical across every page
  4. no page carries the operator's legal name, a bare personal first name used
     as a name, or a personal email address

Exit code 1 if anything fails.
"""
import re
import sys
import pathlib
import collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
FAILS = []
NOTES = []

PAGES = [p for p in ROOT.rglob("*.html") if "legacy" not in p.parts and ".git" not in p.parts]

# Routes the pre-rework site served, from its own ROUTES table at 6ff7384.
OLD_ROUTES = [
    "/", "/guard", "/start-here", "/new-to-guard", "/ecosystem", "/academy",
    "/shields", "/arena", "/defi-forge", "/xpr-journey", "/guardian-intelligence",
    "/stablecoins-payments", "/vision", "/creator", "/faq", "/community",
    "/community/ksto", "/community/cyphergang", "/community/snipverse",
    "/signguard",
]

# Patterns that must not appear on any public page. Kept as regexes so a
# word-boundary match does not trip on "verbatim" or similar.
FORBIDDEN = [
    (r"(?i)\brangel\b", "operator's legal surname"),
    (r"(?i)\bTim\s+[A-Z][a-z]+", "a personal first name used as a name"),
    (r"(?i)[a-z0-9._%+-]+@(?!usernames|username\b)[a-z0-9.-]+\.[a-z]{2,}", "an email address"),
]


def route_exists(route):
    route = route.split("#")[0].split("?")[0]
    if route in ("/", ""):
        return (ROOT / "index.html").exists()
    p = ROOT / route.lstrip("/")
    return (p / "index.html").exists() or p.with_suffix(".html").exists() or p.exists()


def check_links():
    for page in PAGES:
        text = page.read_text(encoding="utf-8")
        for href in re.findall(r'href="(/[^"]*)"', text):
            if href.startswith("/assets/"):
                if not (ROOT / href.lstrip("/")).exists():
                    FAILS.append("%s: missing asset %s" % (page.relative_to(ROOT), href))
                continue
            if not route_exists(href):
                FAILS.append("%s: dead internal link %s" % (page.relative_to(ROOT), href))
        for src in re.findall(r'src="(/[^"]*)"', text):
            if not (ROOT / src.lstrip("/")).exists():
                FAILS.append("%s: missing file %s" % (page.relative_to(ROOT), src))


def check_redirects():
    rules = []
    for line in (ROOT / "_redirects").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) >= 2:
            rules.append((parts[0], parts[1]))

    mapped = {src: dst for src, dst in rules}
    for old in OLD_ROUTES:
        if old in mapped:
            if not route_exists(mapped[old]):
                FAILS.append("_redirects: %s -> %s, but the destination does not exist" % (old, mapped[old]))
        elif route_exists(old):
            NOTES.append("%s kept its address (no redirect needed)" % old)
        else:
            FAILS.append("_redirects: old route %s has no rule and no page" % old)

    for src, dst in rules:
        if src == "/*":
            continue
        if not dst.startswith("/"):
            continue
        if not route_exists(dst):
            FAILS.append("_redirects: destination %s does not exist" % dst)


def check_shell():
    navs, foots = collections.defaultdict(list), collections.defaultdict(list)
    for page in PAGES:
        text = page.read_text(encoding="utf-8")
        nav = re.search(r'<nav id="nav".*?</nav>', text, re.S)
        foot = re.search(r'<footer id="site-footer">.*?</footer>', text, re.S)
        if not nav or not foot:
            FAILS.append("%s: missing shared nav or footer" % page.relative_to(ROOT))
            continue
        navs[nav.group(0)].append(page)
        foots[foot.group(0)].append(page)
    if len(navs) > 1:
        FAILS.append("nav differs across pages (%d variants)" % len(navs))
    if len(foots) > 1:
        FAILS.append("footer differs across pages (%d variants)" % len(foots))


def check_forbidden():
    targets = [p for p in ROOT.rglob("*") if p.is_file()
               and ".git" not in p.parts
               and p.suffix in (".html", ".css", ".js", ".xml", ".txt", ".json", ".md")]
    for f in targets:
        try:
            text = f.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for pattern, label in FORBIDDEN:
            for m in re.finditer(pattern, text):
                where = "legacy/ (not deployed)" if "legacy" in f.parts else "PUBLIC PAGE"
                line = text[:m.start()].count("\n") + 1
                msg = "%s:%d contains %s: %r  [%s]" % (
                    f.relative_to(ROOT), line, label, m.group(0)[:60], where)
                if "legacy" in f.parts:
                    NOTES.append(msg)
                else:
                    FAILS.append(msg)


def main():
    check_links()
    check_redirects()
    check_shell()
    check_forbidden()

    print("Checked %d pages." % len(PAGES))
    for n in NOTES:
        print("  note: %s" % n)
    if FAILS:
        print("\nFAIL (%d):" % len(FAILS))
        for f in FAILS:
            print("  - %s" % f)
        return 1
    print("\nPASS — links, redirects, shared shell and name/email scan all clean.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
