# Thumb Circuit (working name): design doc draft 1

Written 2026.11.08, 11:15 PM Eastern. Status: draft for owner review. No repo, no code. The name is a working title and still needs a trademark check. Every decision below was tapped or written by the owner in this thread; items marked OPEN are not decided.

## What it is and how it works
A top-down, one-thumb racing game for the phone in portrait. The car drives itself forward; the thumb steers. Win races to earn coins and experience, then spend them in the garage on small upgrades, new vehicles, recruited drivers and named crew chiefs. Tracks are handmade from a road-piece kit and scroll, so later tracks are longer than one screen. Everything runs offline in one HTML file with saves in the browser and a copy-paste save code.

## Why it exists
A rewarding, incremental racing loop that a player can run with one thumb, in the same cozy single-file, no-ads, no-accounts spirit as the other LFC games. Fun and rewarding upgrades come first; story is light; customization is capped.

## 1. Decisions so far
| Area | Decision |
|---|---|
| Audience, device | All ages; phone first; portrait, thumb at the bottom; track scrolls upward |
| Look | Cozy pixel art, original; chunky (~180 px wide) vs medium (~270 px wide) decided by eye in a prototype |
| Brands | All invented (parts, vehicles, tracks, sponsors, drivers, garages); nods to real brands/historic drivers only as altered names, no real logos or likenesses |
| Vehicles | Land only at first: cars, karts, trucks. Later: water shortcuts (floating), ramps with air time |
| Steering | Undecided: prototype slide-to-steer (auto-gas) and drag-a-target, owner picks by feel |
| Races | Mostly 3 laps; special and level-up races vary the length; laps early, long point-to-point routes in later regions |
| Tracks | Handmade from a piece kit; no generator in v1 |
| On-track extras | Boost, coin and ramp pickups; weather and surfaces; special sections in later races; simulated crowd that also pays small bonuses |
| Sponsors | Unlock by level; pay bonuses automatically each lap and at the finish |
| Opponents | Fair AI (no secret help) scaled by track level; named rival garages you beat to unlock the next region |
| Upgrades | Six parts: engine, tires, brakes, body, boost, fuel. Small cheap upgrades fill a tier bar; filling it gives a big jump and a new look |
| Drivers | You drive. Recruits race as a second car and cover races while yours is repaired. Stats (cornering, speed, nerve) plus a surface specialty and a perk |
| Crews | Named pit-crew and repair-crew chiefs you recruit, each with a perk; they shorten repair waits and cut repair costs |
| Damage | Repairs take a few races (car sits out), no real-time clock |
| Pacing | Fast start (unlock every 1-2 races), slowing curve later |
| Progress | Only while playing; nothing happens while closed |
| Customization | Paint color, decals, driver outfits; capped, no editor |
| Story | Light career story plus rival-garage intros; skippable |
| Saves/settings | Auto-save after every race; export/import code; few settings (vibration, steering scheme, reset behind a grown-up check) |
| Regions | Order: meadow, harbor, desert, snow, city (water shortcuts at the harbor, ice in snow) |
| Content size | Start small (about 6 vehicles, 3 brands per part), data-driven so updates add vehicles and brands without breaking saves |
| Currencies | Coins (buy everything) and experience (levels), plus fans and parts drops. Fans are earned by racing and a full crowd; they raise sponsor interest, race invites and crowd sizes. No real money, no random boxes |
| Part drops | Fixed, shown before the race (a known part for 1st, 2nd, 3rd), plus sponsor gifts of parts at level-ups. No luck, no random boxes |
| Special races | Boss garage (beat a rival garage's champion), time trial (beat a clock), long route (finish a long scrolling track); used for level-up situations |
| First minute | Short skippable tour (steer, pickups, garage), then race one. Spirit of the spots in spotlight-tour module |
| Rival garages | 3 per region (15 for five regions); beating the last garage's champion in a boss race unlocks the next region |
| Crowd meter | Rises with passes, boosts and clean driving; base crowd size comes from fans and region; a full crowd pays a coin bonus each lap |
| Recruit counts | 2 drivers and 2 crew chiefs per region (10 and 10 by the city) | 
| Price curve | Not fixed: tuned in a Node pacing simulator (pass/fail checks only, no speed numbers) against fast start, slowing curve | 
| Palette | CHOSEN 11:36 PM Eastern: warm and bright (warm ink, never black), region-tinted. Sampled all three as still pictures (palettes/palette-sheet.png, 11:35 PM Eastern; throwaway mockup, not game art) (warm and bright, bold and saturated, muted retro) in the prototype before choosing; house rule: warm ink, never black | 
| Art bar and flavor | Far better than the throwaway palette samples. An American-flavored take on cozy pixel management, plain readable mechanics only, nothing bizarre; original, no copying of any specific game | 
| American flavor | Cross-country road trip whose stops are small-town scenes (diners, fairs, farm roads, drive-ins, stadium crowds), matching the five regions | 
| Sound | None. Vibration allowed (not available on iPhone browsers) |

## 2. Game loop (draft)
Garage -> pick a race (region, track, rival) -> pick driver and car -> race (3 laps, pickups, crowd meter, sponsor lap bonuses) -> results (coins, experience, damage) -> garage (spend: part steps, tier jumps, recruits, repairs) -> repeat. Level-ups unlock sponsors, crew slots, vehicles and regions. Rival garages gate regions.

Reward moments per race (target, to tune): pickup pings during the race, a bonus at each lap, a finish bonus, a part step bought immediately after, and a tier jump every few races early on.

## 3. Reuse from our repos (verified in the cloned repos, 2026.11.08)
fx-governor (quality step-down), field-report (hidden speed report and error log buttons), save-kit (auto-save, createLarge if needed), tab-guard, frame-kit, wake-keeper, image-decode, idle-core (cost curves), grown-ups-door (reset gate), sprite-baker (optional). From Pineapple Defense: build.py/pack/release flow, picture_gate, qa-par, speed_guard, docs_check, lessons-and-inventions.md. From the KB: new-project-testing-starter.md day-one list. New and not in any module yet: track renderer from piece kit, car handling, AI, vibration wrapper.

## 4. Technical sketch (for owner review; nothing built)
- Rendering: low-resolution canvas scaled by whole-number factors (keeps pixel look, cuts fill cost, avoids pixel-ratio-squared cost). WebGL path with canvas fallback only if measurements show a gain. Draw only visible track tiles. No SVG for tracks (WebKitGTK long-path cost).
- Track data: each track is a list of kit pieces (straight, curve, ramp, water, hazard) with surface type, giving a centerline used by AI and lap counting. Hand-authored; stored as a small typed-array blob.
- Car model: simple arcade 2D (heading, speed, grip by surface), fixed 60 Hz step with an accumulator; zero garbage per frame; no main-thread task over about 8 ms.
- Airborne state: reserved in v1 so ramps can be added later without a rewrite; water surface reserved the same way.
- AI: follows the centerline with per-car skill noise; runs in the main loop (cheap); move to a worker only if measured necessary.
- Wasm: only if a measured gain appears (likely none for 2D arcade physics); WebAssembly stays the default for any heavy path per project rules, so a measurement gate is needed before skipping it. Settled 11:24 PM Eastern: measure first, use wasm if it wins, plain JS fallback.
- Saves: save-kit auto-save after each race; save code export/import; IndexedDB for crash safety (rule from H07).
- Vibration: navigator.vibrate on bump, boost, lap, cheer; off switch; silently absent on iPhone.
- Art: pixel sprites baked ahead and decoded off-thread; no characters above U+00FF in shipped files.
- Speed/QA: hidden speed report and error log buttons; three test browsers one at a time; ab-sequential for the 5% rule; picture gate at 99.5% for look-changing speed work; no Node speed numbers; phone runs for the primary-device checks via a downloadable tester page with a Copy results button.

## 5. Risks and cautions
- Crowd, sponsor and pickup rewards can overwhelm a phone screen. Mitigation: one reward ticker area, short pings, tuned in a prototype.
- Steering feel decides the game; prototype before building more.
- Balance: six parts x tiers x recruits x crews is a big economy. Mitigation: start with a spreadsheet-style cost curve using idle-core, simulate in Node (pass/fail only) before art.
- Name: "Thumb" is used by several one-thumb racers (for example Thumb Drift). Needs a fuller trademark check before a repo or public page uses it.
- iPhone has no vibration API; feature is optional.
- Weather and water add handling variants; ship surfaces in stages.

## 6. OPEN questions (cards to come)
1. (Settled 11:18 PM Eastern: meadow, harbor, desert, snow, city.)
2. (Settled 11:19 PM Eastern: start small, add with updates; exact ladder still to draft.)
3. Coin, experience and fan formulas (price curve: tune in a simulator, settled 11:30 PM Eastern); (part drops settled 11:21 PM Eastern).
4. (Settled 11:29 PM Eastern: 2 and 2 per region.)
5. (Settled 11:25 PM Eastern: 3 per region, beat the champion.)
6. (Settled 11:22 PM Eastern: boss garage, time trial, long route.)
7. (Rules settled 11:28 PM Eastern; on-screen display still to design.)
8. (Settled 11:23 PM Eastern: short tour, then race.)
9. (Settled 11:24 PM Eastern: measure first.)
10. Prototype scope and when to create the repo.
11. Name check: two web searches found no exact "Thumb Circuit" match, but several "Thumb" game names and studios exist; USPTO lookup still needed before the repo.

## 7. Next steps
1. Owner review of this draft and answers to section 6.
2. Prototype brief: two steering schemes, two pixel sizes, one scrolling track, vibration on bumps; downloadable tester page with a Copy results button.
3. Trademark check of the name; then repo creation on a card.
