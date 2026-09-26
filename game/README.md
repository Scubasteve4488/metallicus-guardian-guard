# GUARD.IAN: SIGNALBREAK: Phase 1 gray-box prototype

A small browser prototype. It proves one full case loop in roughly 5 to 8 minutes:

**Market → 3 NPCs + 3 clues → Evidence Board → Shield containment → Key authorization → four-column Clarity Report → restored market.**

It is local, fictional and off-chain. There is no wallet, no chain call, no reward,
no price, no network request other than this page's own files, and no saved data.

## Run it locally

From the **repository root** (not from `game/`):

```sh
python3 -m http.server 8080
```

Then open <http://localhost:8080/game/>.

A server is required: the game uses ES modules and loads `data/case01.json`, so opening
`index.html` straight from disk (`file://`) will not work. Any static server works
(`npx http-server -p 8080` is another option).

## Play on a phone

Turn the phone sideways. Drag your thumb anywhere to walk; a faint stick appears
under it. Tap a person or object and Mini GUARD walks over and uses it (clues are
inspected automatically). Tap open ground to walk there. Tap anywhere to move
through dialogue. **?** gives a hint; **BOARD** / **FINISH** appear when needed.
In the Shield event, touch a lane and keep your finger down to hold the Shield up.

## Controls

| Where | Action | Input |
|---|---|---|
| Title | Start | Enter, Space, or click **Start case** |
| Market | Move | WASD or arrow keys |
| Market | Talk to a citizen | E (or Space) when the prompt shows |
| Market | Inspect a clue / the relay | Hold E (or Space) until the bar fills |
| Market | Advance dialogue | E, Space, Enter or click |
| Market | Open the Evidence Board (once everything is gathered) | B |
| Market | Hint | H |
| Market | Pick a route at the Key node | 1 / 2 / 3 or click |
| Market (restored) | Close the case | Enter |
| Evidence Board | Link two cards | Drag from one card to another, or click one card and then another |
| Evidence Board | Mark a card Uncertain | Click its **Uncertain** box |
| Evidence Board | Hint / back to market | H / Esc |
| Shield event | Change lane | ← → or A / D (mouse: press on a lane) |
| Shield event | Raise the Nebular Shield | Hold Space (mouse: hold the button). Raise it just before impact to reflect |
| Clarity Report | Place a finding | Drag it to a column, or click it and then press 1-4 (or click the column) |
| Clarity Report | Submit / choose next step | **Submit report**, then click a gold-edged Confirm Next card |

## The loop, beat by beat

1. **Alert**: the market terminal repeats a notice that looks official.
2. **Gather**: talk to Oren, Juno and Sela, and inspect the Market Terminal, the Records Board and the Signal Trail. You collect five cards across exactly three evidence types: SOURCE (terminal notice, signal trail), RECORD (Records Board) and WITNESS (Sela's statement, Juno's rumor).
3. **Link**: on the Evidence Board, expose the contradiction (the 08:40 broadcast predates the 10:00 session it claims as its source), link evidence that points to East Alley, and mark the unbacked rumor Uncertain. Any link the evidence doesn't support is still allowed: it stays on the board as a dashed UNCERTAIN link and never counts toward a goal.
4. **Contain**: a Spoof Swarm rises along two lanes while six citizens walk to shelter. The Shield blocks, or reflects when timed. Each signal that gets past stops the citizens for 2 seconds; nobody is hurt, killed or scored. In testing, citizens shelter in about 22 s with the Shield and about 47 s without it.
5. **Authorize**: at the gold node, pick a route. The Proton Key activates only for the route the evidence supports. The same Key grows from the hip, is held upright, opens the East Alley gate, and returns to the hip. A wrong route leaves it compact.
6. **Report**: sort nine findings into Verified Facts, Attention Items, Could Not Verify and Confirm Next. Misplaced cards move to the right column with the reason shown. The player then picks the next step.
7. **Restore**: the market fades from its violet, shuttered state to a lit and open one. The boarded canal-side door opens into a passage to East Alley (a real, walkable shortcut), a Case File is added, district trust rises, and citizens have new lines. A summary shows the playtest numbers.

## Files

```
game/
  index.html              page shell (shared site nav/footer, unchanged) + canvas
  css/game.css            page-only styles
  data/case01.json        all case text: dialogue, clues, cards, links, routes, report
  src/main.js             Phaser config and scene list
  src/config.js           sizes, colours, map geometry, EMBLEM_ASSET (null)
  src/state.js            one in-memory run + playtest metrics
  src/logic/board.js      Evidence Board rules (pure, unit tested)
  src/logic/containment.js Shield impact rules (pure, unit tested)
  src/logic/report.js     Clarity Report grading (pure, unit tested)
  src/art/sprites.js      gray-box pixel maps: Mini GUARD, Shield, Key, citizens
  src/art/market.js       gray-box market in two moods + props
  src/entities/guard.js   Mini GUARD rig: one Shield (left arm), one Key (right hip)
  src/ui/widgets.js       text / panel / button helpers
  src/ui/taps.js          event-based key taps
  src/scenes/BootScene.js           title card, texture build
  src/scenes/MarketScene.js         explore, talk, inspect, Key node, relay, restore
  src/scenes/HudScene.js            objectives, evidence tray, dialogue, trust, summary
  src/scenes/EvidenceBoardScene.js
  src/scenes/ContainmentScene.js
  src/scenes/ClarityReportScene.js
  assets/phaser-*.png     Phaser's own placeholder textures as files (CSP)
  vendor/phaser.min.js    Phaser 4.2.1, MIT (see vendor/VENDOR.md)
  tests/*.test.js         logic + canon-lock unit tests
  tests/e2e/playthrough.mjs  headless full playthrough under the site CSP
```

Restore is a phase of `MarketScene`, not a separate scene: it is the same market,
repainted. There is no Hub scene in Phase 1.

## Tests

```sh
cd game
node --test tests/*.test.js            # 20 logic + canon tests, no dependencies
node tests/e2e/playthrough.mjs [dir]   # needs Playwright + Chromium; optional screenshot dir
node tests/e2e/touch.mjs [dir]         # same, emulated phone held sideways, drag + tap controls
node tests/e2e/record.mjs <dir>        # records one full phone playthrough to <dir>/playthrough.webm
node tools/build-single-file.mjs out.html   # phone-friendly single-file page (needs esbuild)
```

The playthrough serves the repo with the production `Content-Security-Policy` from
`/_headers`. It plays the whole case with real keyboard and mouse input. It uses
teleports between points of interest, and a small bot aims the Shield. It fails on
any page error or CSP violation.

## Canon and scope locks this build keeps

- Exactly one Mini GUARD, one Nebular Shield (anatomical left arm) and one Proton Key (compact at the right hip).
- The Key is held upright when activated and only scales and moves. It has no rotation, swing, attack or damage. A test checks that no code rotates it.
- **Key head interior and Shield face are blank.** `EMBLEM_ASSET` in `src/config.js` is `null` until the owner supplies the canonical XPR/Proton logo file. No P, atom or stand-in symbol is drawn anywhere.
- The gold M is only on Mini GUARD's chest in the front view. A test checks the pixel maps.
- No SAFE verdict or wording. A test scans the shipped text.
- Out of scope and absent: Address Mimic, five-district map, hub world, blockchain calls, wallets, rewards and payouts.
- Water Pipe was a logic reference only (route choice). Detective Board was a mechanic reference only. No code or art was copied from either.
- Nothing is cropped from the chibi sheet. Sprites are simple placeholders drawn from pixel maps that follow its proportions.

## Known gaps (Phase 1)

- Art is gray-box placeholder only. There are no final sprites or animation sheets, and no sound.
- `Mini_GUARD_GUARDIAN_Project_Handoff.md` has been read. Placeholders still lack its purple energy accents on the armor; final art waits for the production-asset pipeline.
- Tap-to-walk has no pathfinding: Mini GUARD walks straight and stops at obstacles. Drag to walk around them.
- Held upright, a phone makes the text very small. Play sideways.
- The canonical logo is not integrated (intentionally blank).
- Touch controls are basic and there is no gamepad support. The Evidence Board and report text is small on phones held upright.
- There is no save/resume. Refreshing restarts the case.
- There is only a basic accessibility pass: no remapping, colour-blind check or screen-reader support.
- The 5 to 8 minute length is an estimate. The automated run proves the loop completes but says nothing about human pace or fun. Playtest with 5 to 8 new players against the pass criteria in the concept packet.
- Phaser's Canvas blend-mode probe (a `data:` image) logs one harmless CSP console error under the production CSP. It only affects the unused Canvas renderer.
- If this branch is deployed, `/game/` is publicly reachable but unlinked and `noindex`. It is not added to the nav or sitemap.
