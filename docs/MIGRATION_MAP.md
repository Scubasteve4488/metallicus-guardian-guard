# MIGRATION_MAP — where everything went

**Branch:** `site-rebuild-phase1` · **Built:** 2026-09-21
**Everything below is preserved in full at** `archive/site-before-rework-2026-09-21` → `6ff7384468daf520994edc0a2d09ed14780c9f10`.
Nothing was deleted. Parking is not deletion.

---

## 1. Route map

| Old route | New route | Mode | What happened to the content |
|---|---|---|---|
| `/` | `/` | rewritten | New copy deck. "Stand Guard. Earn Your Shield.", the wallet-connect hero, the live GUARD price ticker, the eco-stats bar and the Buy GUARD CTA are all gone. |
| `/guard` | `/guard` | same route, rewritten | Lore, artwork and token facts kept. "Why Hold GUARD?", holder benefits, the Arena promo and the live-supply widget removed. Boundary paragraph added verbatim. |
| `/start-here` | `/learn` | 302 | Six steps ported into the Learn hub. Steps that existed only to connect a wallet or reach the Arena were rewritten. |
| `/new-to-guard` | `/learn#new-to-guard` | 302 | Rewritten. The six steps ended at "check your shield rank" and "play the Arena"; it is now a plain statement of what GUARD is and is not. |
| `/ecosystem` | `/learn/ecosystem` | 302 | Ported as-is, dated. |
| `/academy` | `/learn/academy` | 302 | Video tracks and written guides ported. Daily Question quiz and three shield/Arena guides removed. |
| `/stablecoins-payments` | `/learn/stablecoins-payments` | 302 | Ported as-is, dated. |
| `/defi-forge` | `/learn/defi-forge` | 302 | All five simulators ported, behaviour unchanged. Inline handlers converted to delegated events so the CSP can keep `script-src 'self'`. |
| `/guardian-intelligence` | `/tools/account-check` | 302 | **Rebuilt.** Wallet-connect replaced by a public account-name lookup. See §3. |
| `/faq` | `/about#faq` | 302 | All 14 entries ported into About. The legal name in the first answer was replaced with @Scubasteve4488. |
| `/vision` | `/status` | 302 | Replaced. Its promises are now Live / Testing / Planned / Parked rows. |
| `/creator` | `/creator` | same route | Under-construction notice. Existing prose preserved in a non-rendered block with the legal name removed. |
| `/community` | `/community` | same route, rewritten | Reordered: KSTO first, then Snippy, the vetted tokens including GUARD, CypherGang, Snipverse, Vibrr. Nomination form and Guardian Spotlight rank line removed. |
| `/community/ksto` | `/community/ksto` | same route | Ported, dated. Achievements CTA removed. |
| `/community/cyphergang` | `/community/cyphergang` | same route | Ported, dated. Achievements CTA removed. |
| `/community/snipverse` | `/community/snipverse` | same route | Ported, dated. "Find GUARD on Snipverse" (Guardian card) removed. |
| `/shields` | `/status#parked` | 302 | Parked. |
| `/arena` | `/status#parked` | 302 | Parked. |
| `/xpr-journey` | `/status#parked` | 302 | Progression parked; the education it carried lives on in `/learn`. |
| `/signguard`, `/signguard/*` | `/status#parked` | 302 | Parked. Files moved to `legacy/signguard/`. |
| *(anything else)* | `/404.html` | **404** | The old catch-all `200` rewrite is gone — a wrong URL now 404s instead of silently serving the home page. |

**All redirects are 302 (temporary).** They become 301 only after each destination is validated in preview and the operator approves — a 301 is cached hard and is painful to reverse.

### New routes with no predecessor

`/ian` · `/services` (+7 service pages) · `/tools` · `/evidence` · `/community/snippy` · `/community/vibrr` · `/about` · `/status` · `/privacy` · `/terms` · `/corrections` · `/contact` · `/404.html`

---

## 2. File moves

| From | To | Why |
|---|---|---|
| 35 `shard_*.png`, 5 `shield_*.png`, `keystone.png`, `Aegis shield.png`, `guardian_fly.png` | `legacy/games/` | Game and shield-rank assets. Parked. |
| `make_shards.js`, `make-card.js` | `legacy/scripts/` | Generated game/card assets. |
| `analyze_distribution.js`, `fetch_distribution.js`, `blastpad_*`, `combined_*`, `dist_progress.txt`, `distribution_raw.json` | `legacy/scripts/` | One-off distribution tooling; never part of the site. |
| `signguard/*` | `legacy/signguard/` | SignGuard concept demo. Parked. |
| 48 images at repo root | `assets/img/` | Tidied. Filenames with spaces hyphenated (`Metal Pay.jpg` → `Metal-Pay.jpg`) so URLs need no `%20`. |
| `index.html` (703 KB, all 19 pages) | replaced | Split into 32 route pages + 404. The original is intact in the archive branch. |

`legacy/` is in `.cfignore` (stays in git, out of the deploy) and disallowed in `robots.txt`.

---

## 3. Behaviour changes worth knowing

1. **The site no longer connects a wallet.** No Proton/WebAuth SDK, no signing session, no seed-phrase field, no transaction path. The account check reads a public account name from public RPC, the way a block explorer does. This is what allows `script-src 'self'`.
2. **Analytics removed.** The Umami tag is gone. The privacy page can now honestly say the site collects nothing.
3. **`Cache-Control: no-store`** on the document replaced by `max-age=0, must-revalidate`, with sensible caching for assets.
4. **`user-scalable=no` removed** from the viewport meta — pinch zoom was previously blocked.
5. **Inline event handlers eliminated.** The DeFi Forge's 17 `onclick`/`onchange` attributes and the FAQ's 14 `onclick`s became data attributes with delegated listeners; FAQ rows became real `<button>`s with `aria-expanded`.

---

## 4. Claims removed, and why

| Removed | Reason |
|---|---|
| "Stand Guard. Earn Your Shield." | Leads with a parked product. |
| "Buy GUARD" as the primary site action | Now a secondary link on `/guard` only; absent from Home entirely. |
| "GUARD holders receive exclusive benefits… game rewards coming with smart contract deployment" | A promise of an unbuilt thing, tied to parked features. |
| "Why Hold GUARD?" (5 cards) | Rank-, Arena- and benefit-based reasons for holding. |
| "Guardians Standing" live counter, eco-stats bar, price ticker | Live figures with no shown freshness or failure state. |
| "3 Free Plays Daily", daily-plays overlay | Parked. |
| Guardian Spotlight "Aegis Rank" line, nomination form | Rank reference; the form posted to X. |
| "Unlock your CypherGang / KSTO Guardian achievements" | Parked achievements. |
| The Vision page's on-chain ranks, badges, leaderboard and Unified Guardian Points sections | Promises with no implementation; now Planned/Parked rows on `/status`. |
| The operator's legal name (6 occurrences) | Standing rule: the only public name is **@Scubasteve4488**. |

---

## 5. Name and email scan (STEP 5 result)

`checks/check-site.py` scans every `.html`, `.css`, `.js`, `.xml`, `.txt`, `.json` and `.md` file in the repository for the operator's legal surname, a personal first name used as a name (word-boundary matched, so `verbatim` does not trip it), and any email address.

**Result on this branch: clean.** Zero hits, in deployed files and in `legacy/` alike.

For completeness: those 6 occurrences still exist on `main` and in the archive branch — that is the historical record, and the archive is meant to hold it. They are live on production until this branch is deployed.

---

## 6. Still to do (not in Phase 1)

Self-host fonts and drop both Google origins · remove inline styles so `style-src` can drop `'unsafe-inline'` · build `/evidence/*` as real routes · produce the three evidence samples from real timed runs · re-query the agent registry · wire the chat · machine-readable `/health` (agent lane, not this repo) · re-verify every ported 2026-08-12 fact with its project · flip 302s to 301s after preview validation · screen-reader and contrast audits.
