# BUILD_STATUS — Site rebuild Phase 1

**Branch:** `site-rebuild-phase1`
**Built:** 2026-09-21
**Base commit:** `6ff7384468daf520994edc0a2d09ed14780c9f10`
**Deploy state:** **PREVIEW ONLY.** Nothing here has been deployed to production, no DNS was touched, and the live site is unchanged.

---

## 1. What this branch does

Splits the single 703,291-byte `index.html` (10,489 lines, 19 page states, catch-all rewrite) into **32 static HTML pages plus a 404**, with shared CSS and JS, and rebuilds the site around Guard.IAN, its services, its read-only tools, evidence, the community and GUARD.

No framework was introduced. No build step was added. Cloudflare Pages still deploys the committed files as-is.

---

## 2. Structure

```
index.html                     assets/css/site.css          legacy/games/       (43 files)
404.html                       assets/js/site.js            legacy/scripts/     (10 files)
_headers                       assets/js/account-check.js   legacy/signguard/   (4 files)
_redirects                     assets/js/defi-forge.js      checks/check-site.py
robots.txt  sitemap.xml        assets/img/                  (48 images)
```

Each route is a directory containing `index.html`. Nav and footer are inlined identically in every page; `checks/check-site.py` fails if they ever drift apart. That script is a **test**, not a build step — Cloudflare never runs it.

### Routes built (32 + 404)

| Section | Routes |
|---|---|
| Core | `/` `/ian` `/services` `/tools` `/tools/account-check` `/evidence` `/guard` `/about` `/creator` `/status` |
| Services | `/services/project-shield` `/services/launch-readiness` `/services/agent-diagnostic` `/services/launch-rehearsal` `/services/agent-build` `/services/utility-forge` `/services/utility-watch` |
| Learn | `/learn` `/learn/ecosystem` `/learn/academy` `/learn/stablecoins-payments` `/learn/defi-forge` |
| Community | `/community` `/community/ksto` `/community/snippy` `/community/cyphergang` `/community/snipverse` `/community/vibrr` |
| Legal/ops | `/privacy` `/terms` `/corrections` `/contact` |

Seven-item menu on every page, in order: **Home · Guard.IAN · Services · Tools & Evidence · Learn · Community · About.**

---

## 3. What was BUILT (new)

- **Home** — copy deck per spec §16. **No "Buy GUARD" call to action anywhere on it.** Status section is a dated static statement, explicitly labelled as not a live read, because the controlled status endpoint does not exist.
- **`/ian`** — only tested capabilities listed; everything unproven pushed to Testing or Planned on `/status`. Chat is **not** embedded: it is not wired to this site, and the page says so rather than showing a box that does nothing.
- **`/services`** — seven cards, each with exactly one state, **no prices anywhere**. "Hire now" appears nowhere on the site. Plus seven individual service pages carrying the full deliverables, exclusions and acceptance criteria.
- **`/tools/account-check`** — rebuilt (see §5).
- **`/evidence`** — evidence labels, the rules, the receipt format, the source lock. Samples listed as Planned, not faked.
- **`/status`** — Live / Testing / Planned / Parked, with all 18 parked items and a Known Gaps section.
- **`/community/snippy`** — new page. Canon fixed: orange-and-white fluffy fox/dog-like mascot, big expressive eyes, cheerful face, purple headband labelled SNIPPY, purple bandana.
- **`/community/vibrr`** — new page containing only the one verified self-description sentence, the link to vibrr.ai, and the independence disclaimer. Everything else explicitly marked unverified.
- **`/privacy` `/terms` `/corrections` `/contact`** — first honest drafts, each marked **DRAFT — pending legal review** and version-dated.
- **`404.html`** — real 404 page. The catch-all `200` rewrite is gone.

## 4. What was PORTED (kept, cleaned, dated)

Ported from the pre-rework site with game, rank and shard references stripped, and an explicit "last verified 2026-08-12, carried forward 2026-09-21" banner on each:

| Content | New home |
|---|---|
| New to XPR (six steps) | `/learn#new-to-xpr` |
| New to GUARD | `/learn#new-to-guard` |
| Ecosystem cards | `/learn/ecosystem` |
| BloxProd Academy (video tracks + written guides) | `/learn/academy` |
| Stablecoins & payments | `/learn/stablecoins-payments` |
| DeFi Forge (5 simulators) | `/learn/defi-forge` |
| KSTO, CypherGang, Snipverse | `/community/*` |
| Community people | `/community` |
| GUARD lore, role, artwork | `/guard` |
| FAQ (14 entries) | `/about#faq` |

Removed during porting: the Daily Question quiz (needed the parked JS), the three shield/Arena guide entries, "Find GUARD on Snipverse" (Guardian card), the Guardian Spotlight rank line, all "unlock achievements" calls to action, and the "Why Hold GUARD?" block.

## 5. The account inspector — a real behaviour change

The old Guardian Intelligence **required a wallet connection** and loaded the Proton/WebAuth SDK from a CDN. The rebuilt `/tools/account-check`:

- takes a **public account name** instead, and reads public XPR RPC directly from the browser;
- has **no wallet connection, no signing session, no SDK, no transaction path** — the site no longer has a signing surface at all;
- reports every read as verified / not found / **could not verify**, and never prints a failed read as a zero;
- carries over the `safeScope()` all-numeric-name fix verbatim (XPR names may use digits 1–5, so `333555` is valid; passed raw to `get_table_rows` it is read as an integer and returns an empty result with HTTP 200 — a silent wrong answer).

Removing the CDN SDK is what makes `script-src 'self'` possible.

## 6. What was PARKED (preserved, never deleted)

Off the menu, out of the deploy, still in the repository under `legacy/` and in full at `archive/site-before-rework-2026-09-21` → `6ff7384468daf520994edc0a2d09ed14780c9f10`:

Guardian Arena · Siege Guard · GUARD Trials · shield ranks · shield score · shards and forging · daily plays · leaderboards and scoreboards · achievements · game dev controls · XPR Journey progression · SignGuard · on-chain ranks/badges/leaderboards · token & NFT access tiers · holder discounts · revenue sharing · wallet connection · the Vision page.

`legacy/` is listed in `.cfignore`, so it stays in git and out of the deploy. `robots.txt` disallows it.

## 7. Headers, redirects, sitemap

- **`_redirects`** — catch-all rewrite replaced by the spec §34 map, all **302 (temporary)**, plus `/*  /404.html  404`.
- **`_headers`** — CSP written from what the pages actually load, audited across every file; `nosniff`; `strict-origin-when-cross-origin`; a 19-directive Permissions-Policy; `frame-ancestors 'none'` and `X-Frame-Options: DENY`; COOP/CORP. **No HSTS** — deliberately, as instructed.
- **`sitemap.xml`** — regenerated from the live canonicals, 32 routes, `lastmod` 2026-09-21.

CSP: `script-src 'self'` with **zero inline script and zero third-party script** (the Umami analytics tag was dropped). `style-src` still allows `'unsafe-inline'` because the ported pages use inline style attributes throughout — tracked as a known gap.

---

## 8. Checks run, and what they found

`python3 checks/check-site.py` — **PASS.** 33 pages: every internal link and asset resolves; every old route has a rule or a page; nav and footer byte-identical across all 33; name/email scan clean.

HTTP smoke test (local server, all 28 primary routes + 404): **all 200.**

Headless Chromium, 320px and 768px viewports, all 28 routes:

| Check | Result |
|---|---|
| Horizontal overflow | **none** (two real bugs found and fixed — see below) |
| Exactly one `<h1>`, `lang`, non-empty `<title>` per page | pass |
| Every `<img>` has an `alt` attribute | pass |
| Keyboard tab order (home) | skip-link → brand → 7 menu items → CTA → page actions, in visual order |
| Visible focus ring on every tabbed element | pass (after fix) |
| Mobile menu opens with Enter, `aria-expanded` updates | pass |
| FAQ accordion opens with Enter, `aria-expanded` updates | pass |
| Account check rejects an invalid name with a clear message | pass |
| Account check on total RPC failure | **correctly reported every read as "could not verify"** — the exact behaviour under test |
| DeFi Forge lending calculation after the handler rewrite | pass (1,000 @ 10% → 1,105.16, +10.52%) |
| DeFi Forge instrument tab switching | pass |

**Bugs found and fixed during these checks:**
1. Horizontal overflow at 320px on `/learn/defi-forge` — grid tracks and flex children could not shrink below min-content. Fixed with `minmax(0,1fr)` tracks and `min-width:0` on the inputs and fields.
2. Horizontal overflow at 320px on `/status` — the 40-character commit SHA in a `<code>` pushed the page wide. Fixed with `overflow-wrap:anywhere` on `code`.
3. Focus ring invisible on nav links and buttons — `transition:all` was animating `outline-width` from 0. Fixed by transitioning named properties only.

Also fixed: the old `<meta viewport>` carried `user-scalable=no`, which blocks pinch zoom. The new one does not.

---

## 9. STILL UNVERIFIED — read this before trusting anything here

1. **A successful account-check lookup was never observed.** The sandbox this was built in blocks the four XPR RPC hosts, so only the *failure* path was exercised (and it behaved correctly). **The success path must be checked on the Cloudflare preview before anyone relies on it.**
2. **Agent registry figures were not re-queried.** `safeguard5`: 0 services, 0 jobs, trust 50/100, registered and active — all carried from the 2026-09-21 investigation record. Every page showing them says so. ADR-0016 requires a re-check before any public claim; that re-check has not happened.
3. **Ported Learn and Community facts are dated 2026-08-12** and were not individually re-confirmed with each project. Every affected page carries a banner saying exactly that.
4. **The CSP has not been tested against a live Cloudflare response.** It was derived from a static audit of what the files reference. A preview deploy may reveal something the audit missed.
5. **No screen-reader test was run.** Keyboard and structural checks only.
6. **Colour contrast was not measured.** The palette was carried over from the previous site unchanged.
7. **`style-src 'unsafe-inline'` is still required** by the ported inline styles.
8. **Fonts still load from Google Fonts.** Self-hosting would remove two external origins and a third-party request per page load.
9. **The evidence sub-routes in spec §14** (`/evidence/samples`, `/evidence/sources`, `/evidence/method`, `/evidence/receipts/:id`) are in-page anchors on `/evidence`, not separate routes.
10. **The legal name is still live on production** in `main`'s `index.html` (6 occurrences). This branch removes every one, but that only takes effect when it is deployed.

---

## 10. Approvals NOT granted, and not assumed

Production deploy · DNS change · live-site redirects · publishing any XPR Agents listing · any price · merging this PR · deleting or altering the archive branch · any change before 2026-09-23 has passed.
