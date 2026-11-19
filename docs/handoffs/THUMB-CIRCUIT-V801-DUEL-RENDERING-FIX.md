# Thumb Circuit v8.01 campaign-duel rendering fix

## Scope and provenance

This handoff contains the narrowly scoped v8.01 fix for campaign duels whose race has one rival. The source is based on `b46bef4157ea1a11fa79dfcd8b079f16ce7976c1` (`Publish sample v8.01 (test build)`, parent `3c389ef6b97960ff2a208f8675e2ff1e7709b73d`). At publication preparation, GitHub `main` still pointed to that exact commit, and its `play/index.html` blob matched the audited baseline.

The original v8.01 baseline remains unchanged. This branch contains only:

- `play/index.html`
- `tests/campaign-duel-rendering-browser.mjs`
- `tests/campaign-duel-natural-play-browser.mjs`
- `docs/handoffs/THUMB-CIRCUIT-V801-DUEL-RENDERING-FIX.md`

No persistence-remediation changes or dependencies are included.

## Defect and correction

In `play/index.html`, `raStep()` loops over three arrow-indicator slots even when the race has only one rival. For unused slots `rivals[i]` is `undefined`; the old unconditional `r.raOn = 0` threw during the animation frame. The one-rival races then stopped updating/rendering and generated repeated exceptions. The correction at `play/index.html:3711` is:

```js
if (r && !on) r.raOn = 0;
```

It preserves the existing rival behavior and skips the state assignment for an absent rival.

## Verification

All browser runs used headless `Chrome/157.0.8103.78` with Puppeteer. This is automated browser testing; it is not human GUI, Android Chrome, Firefox, or WebKit qualification.

### Five-scenario rendering regression

`tests/campaign-duel-rendering-browser.mjs` checks one-rival duels at campaign indices 3, 7, and 11, with three-rival races at indices 4 and 8 as controls. It injects campaign starting progress for scenario setup and adds a draw counter to the HTTP-served response only; it does not edit the game file. The run used `TEST_PROGRESSION=0`, so it did not use the test's separate progression hook.

- Candidate: all five scenarios passed; each advanced player and rival positions and recorded 50 draw calls, with no browser errors.
- Original baseline: expected regression failure in all three one-rival duels, with `Cannot set properties of undefined (setting 'raOn')`, zero draw calls, and no observed frame advance. Both multi-rival control races rendered and advanced without errors.

### Natural campaign gameplay

`tests/campaign-duel-natural-play-browser.mjs` drove the normal campaign UI and actual game keyboard handlers. Puppeteer mouse clicks selected events and started races; keyboard events included Space for Rocket Start and ArrowLeft to verify steering response. The harness reads game state for observation and adds draw counting only to the served response. It does not seed or mutate game progress and does not call `__tc.warp`.

The campaign was completed across two runs in the same disposable browser profile. The first run began with no save and naturally completed event 0. The second resumed from that game-written save and completed events 1–7. Each race reached its normal result screen and the campaign advanced. Event 7, **Orchard duel on Orchard Ring**, completed in 50.15 seconds over two laps: the player won, earned two stars, and advanced the campaign to 8. Across 47 sampled event-7 intervals, the player, rival, and draw counter all advanced. The normal UI steering input changed the player's steering value.

After page reload, the stored campaign remained at 8 with two Orchard-duel stars and the Trike reward in the owned-car and campaign-owned records. The save recorded eight races, four wins, and 1,672 coins. The run recorded no console errors, uncaught exceptions, or failed requests. A further normal UI replay was used to capture the result card after the game's curtain transition; it also passed its reload checks.

The first natural run passed 2/2 checks, the resumed full-campaign run passed 17/17, and the result-visible replay passed 11/11. The specific evidence files are listed below. Generated QA reports and screenshots are intentionally not copied into this repository.

## Local QA artifacts

These files are outside the repository and were retained in the local investigation directory:

`$HOME/lfcfoundry/thumb-circuit-v801-race-investigation-20261116/qa/`

- `candidate-five-scenarios-final-20261117/report.json`
- `baseline-five-scenarios-final-20261117/report.json`
- `fresh-natural-campaign-20261117-5/report.json` — fresh profile and event 0
- `fresh-natural-campaign-20261117-9/report.json` — resumed events 1–7 and reload verification
- `fresh-natural-campaign-20261117-9/event-7-attempt-1.json`
- `fresh-natural-campaign-20261117-9/after-countdown.png` — both cars visible at the GO countdown
- `natural-result-visible-replay-20261117/report.json`
- `natural-result-visible-replay-20261117/natural-result-event-7-attempt-1.png` — visible “You won!” result card

The test scripts are self-contained within `tests/` except for the existing Puppeteer installation. They support `PUPPETEER_HARNESS_PACKAGE` to point at its `package.json`; no package manifest or dependency was added here.

## Review guidance for Claude

Please review the one-line `raStep()` guard and both harnesses against the v8.01 source. Rerun the rendering regression and, where the local Puppeteer/Chromium setup is available, the natural-play test. Keep the correction isolated unless further evidence demonstrates a related defect. The evidence establishes the fix in headless Chromium 157 only; it does not claim cross-browser or mobile qualification.
