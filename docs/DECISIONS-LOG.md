# Thumb-controlled racing game: research and open questions

Written 2026.11.08, 10:55 PM Eastern. Status: research and idea collection only. No repo, no code, no name yet.

## What the owner asked for (2026.11.08, 10:52 PM Eastern)
Top-down racing game, one thumb on a phone screen. Upgrade equipment step by step, buy better vehicles with winnings and experience. Cozy pixel "management" look and feel (original, nothing copied). Tracks need not fit one screen as new levels unlock. Recruit drivers, pit crews and repair crews (faster repairs, cheaper repairs). No sound; vibration is fine.

## Standing rules that apply (from project rules and the catalog)
- Offline single file, no ads, accounts, network, microtransactions; single player; MIT, "Copyright (c) 2026 LFC Foundry"; no offline service worker; no pinch zoom; no sound.
- Speed: GPU drawing with canvas fallback, heavy work in workers, wasm where measured to help, zero garbage per frame, no main-thread task over ~8 ms, first screen first, compile wasm early, decode images off-thread, typed arrays.
- Every game gets a hidden speed-report button and hidden error-log button (field-report module).
- fx-governor is the only low-end-phone accommodation. No further low-end tuning.
- Kids-game promises on page/README if this is a kids game. Device names never public.
- Testing: three test browsers one at a time from the `browsers` branch, warm-browsers.sh at session start, ab-sequential for the 5% rule, strict paired runs for gates, no Node speed numbers, long runs detached with log and done marker, no chars above U+00FF, save into IndexedDB not only localStorage.
- Name must be offered on a card first. Games: no sounds, no offline service worker, no pinch zoom.

## What we can lend from existing work
| Need | Source | Fit |
|---|---|---|
| Quality step-down when FPS drops | JS-modules fx-governor 1.1.1 | direct; already used in Pineapple |
| Hidden speed report + error log | field-report 1.1.1 | direct |
| Safe saves (garage, money, unlocks) | save-kit 2.5.0 (createLarge over IndexedDB) | direct; survives browser kill |
| Two tabs overwriting a save | tab-guard 1.1.1 | direct |
| Frame loop helpers | frame-kit 1.2.1 | direct |
| Baked glossy sprites | sprite-baker 1.11.0 | optional; pixel look may not need it |
| Decode art off the main thread | image-decode 1.2.2 | direct |
| Keep screen awake during a race | wake-keeper 1.1.0 | direct |
| Settings/reset gate for kids | grown-ups-door 1.0.1 | if kids game |
| Idle/upgrade cost curves | idle-core 1.2.0 | probably yes: price curves, income math |
| Gamepad/keyboard menus | pad-nav | laptop secondary |
| Soft glow/blur | gpu-blur | only if look needs it |
| Single-file build, picture gate, docs-check, qa-par, release.py, speed_guard | pineapple-defense tools/ (bake_sprites.py, picture_gate.py, release.py, check_play.py) | copy patterns |
| Lessons and agreements | pineapple-defense docs/lessons-and-inventions.md, qa-process.md | read first on day one |
| Day-one testing | knowledge-base catalog/new-project-testing-starter.md | follow all 15 lines |

Not found in modules: vibration helper (tiny, plain navigator.vibrate wrapper, needs a settings toggle), a track/spline renderer, a car physics module, AI opponents. These would be new, possibly new JS-modules candidates later.

## Design thinking (draft, for questions)
**One-thumb control.** Candidates: (a) thumb steers by sliding left/right on a strip while the car auto-accelerates; (b) thumb drags a target point and the car chases it; (c) hold to drift, release to straighten, with auto-throttle; (d) thumb on the car itself, left/right of it steers, up/down brakes/boosts. Auto-throttle with a brake/boost only when the player chooses is the simplest for kids.
**Scrolling tracks.** Top-down camera follows the car; tracks are a centerline spline built from a small tile/segment kit so tracks can be long, looped, or point-to-point. Draw only visible tiles to a canvas (or WebGL); cap path segments (WebKitGTK paints long SVG paths badly, so no SVG for the track).
**Pixel look.** Low-res canvas (for example 180x320 logical pixels) scaled by integer factors keeps pixel look and cuts fill cost (pixel ratio squared lesson, H13). Small chunky characters, warm palette, no black.
**Management layer (cozy loop).** Garage screen: upgrade parts (engine, tires, brakes, body, fuel/boost), buy better vehicles, pit crew and repair crew hires, driver recruitment. Race gives winnings plus experience; damage creates a repair wait and cost; crews cut both. Everything bought with in-game coin only, no real money, no random prize boxes.
**Drivers.** Recruitable drivers with traits (cornering, boost, luck-free stats); the player drives, hired drivers could race a second entry, or give passive bonuses, or run "sponsored" races on their own while the player is away (offline progress is a clicker-style risk: ask).
**Tracks and levels.** Regions that unlock by level; each region has a new surface and hazard (dirt, ice, city, harbor).
**Opponents.** AI cars following the centerline with noise; rubber-banding is optional.
**Damage and repair.** Bumps and walls cause damage; repair takes time (the wait) and money; crews shorten both. Danger: waiting timers feel like dark patterns. Kids rules say no timers, no streaks: need an owner call.
**Vibration.** navigator.vibrate on bump, boost, finish; off switch; does not work on iOS Safari (no Vibration API), note for scope.

## Open questions (cards posted in order of importance)
1. Is this a kids game (phone primary) or general (laptop/tablet first)? 
2. Control scheme preference.
3. Race format (laps, point-to-point, one at a time vs many opponents).
4. How repair delays work (real-time waits vs instant-with-cost vs "next race" delay).
5. Drivers: only recruit and hire, or race against them?
6. Offline progress while the game is closed: yes/no.
7. Pixel size and screen orientation (portrait vs landscape).
8. Vehicle types (cars only, or karts/trucks/bikes/boats?).
9. Tracks: handmade set or generated tracks, or both; track editor?
10. Name options (after theme settled).
11. Phone browsers/iOS support for vibration scope.
12. Weather/day-night, collectibles, fuel?

## Next steps after answers
Write a design doc, then a small prototype brief (track renderer + one car + thumb control) for the owner to try on the phone before a repo is created. Repo and name wait on cards.

## Added 2026.11.08, 10:56 PM Eastern (owner)
Car parts, vehicle models, tracks, sponsors, driver names and competitor garages all need brands. Read as: a made-up brand system across the whole game. Real brands are a trademark risk and conflict with "original, nothing copied", so card asked. Decisions so far: all ages, phone first.

## Decisions log
- 2026.11.08 10:55 PM Eastern: all ages, phone first.
- 2026.11.08 10:55 PM Eastern: steering undecided; owner wants a tiny phone prototype with two schemes (slide-to-steer with auto-gas, and drag-a-target) and will pick by feel. Prototype is a later step, no repo yet.
- 2026.11.08 10:56 PM Eastern: brands are all invented (parts, vehicles, tracks, sponsors, drivers, garages); check names against real trademarks before use.
- 2026.11.08 10:56 PM Eastern: race format = laps early, long scrolling point-to-point routes in later regions.
- 2026.11.08 10:57 PM Eastern (owner amendment): nods to real brands and historical drivers are OK too. Working rule until he says otherwise: nods only, never real logos, exact names or likenesses of real brands; historical drivers as clearly altered names or "legend" characters, and only long-passed people. Card asked to confirm the line.
- 2026.11.08 10:57 PM Eastern: repairs take a few races (car sits out), no real-time clock; crews shorten the wait and lower cost.
- 2026.11.08 10:58 PM Eastern: nods to real brands/historic drivers = altered names only, no real logos or likenesses (confirmed).
- 2026.11.08 10:58 PM Eastern: drivers = you drive; recruits race as a second car in your garage and cover races while your car is in repair.
- 2026.11.08 10:58 PM Eastern: portrait orientation, thumb at the bottom, track scrolls upward.
- 2026.11.08 10:58 PM Eastern: no offline progress; nothing happens while the game is closed.
- 2026.11.08 10:58 PM Eastern: vehicle types = cars, karts and trucks (land only).
- 2026.11.08 10:59 PM Eastern (owner): land vehicles only for now; later special track features: floating across water shortcuts, ramp boosts with air time. Design implication: keep track pieces and car physics open to surface types (water, ramps) and a short airborne state, even if v1 ships without them.
- 2026.11.08 11:00 PM Eastern: tracks = handmade set built from a road-piece kit (no generator in v1).
- 2026.11.08 11:00 PM Eastern: pixel size undecided; prototype shows chunky (~180 px wide) and medium (~270 px wide) side by side, owner picks by eye.
## Still open
Name (card posted), weather/hazards/collectibles, iOS vibration scope, prototype go-ahead, whether repo creation waits for prototype.
- 2026.11.08 11:02 PM Eastern (owner priorities): addictive, rewarding incremental mechanics and fun gameplay above all else. Story unimportant (a light story mode is fine). Customization only to a limit; no excess formatting/settings. Single player, in-browser, with saves. Read "not formatting everything in excess" as: few settings, no heavy skinning or editor.
- 2026.11.08 11:03 PM Eastern: working name "Thumb Circuit" chosen by owner (working title only; no repo yet). One quick web search found no game with that exact name. Close neighbors with "Thumb" names: Thumb Drift (SMG Studio, one-thumb car racing, 2016), Thumb.Run, Thumb Formula Racing. Needs a fuller trademark check before the repo or public pages use it.
- 2026.11.08 11:04 PM Eastern: customization = paint color, decals, driver outfits (capped, no editor).
- 2026.11.08 11:05 PM Eastern (owner, in words): race extras = boost/coin/ramp pickups AND weather/surfaces, plus special sections in later races (read "layer" as "later"), a simulated crowd, and sponsors that gift bonuses each lap and at the finish. Most races are 3 laps; special races and level-up situations vary the length.
- 2026.11.08 11:06 PM Eastern: upgrade loop = small cheap upgrades fill a part's tier bar; completing it unlocks a big jump and a new look.
- 2026.11.08 11:06 PM Eastern: sponsors unlock with level only and pay bonuses automatically each lap and at the finish; no choosing.
- 2026.11.08 11:07 PM Eastern: opponents = fair AI (no secret help) scaled by track level, plus named rival garages with own cars/brands that you beat to unlock the next region.
- 2026.11.08 11:07 PM Eastern: crowd is visual and also pays small bonuses (crowd meter built from clean driving, boosts, passes); vibration on cheers.
- 2026.11.08 11:07 PM Eastern: pacing = fast start (unlock every 1-2 races), slowing curve as regions unlock.
- 2026.11.08 11:08 PM Eastern: six upgradeable parts: engine, tires, brakes, body, boost, fuel (each with a tier bar and branded gear).
- 2026.11.08 11:08 PM Eastern: recruited drivers have stats (cornering, speed, nerve) plus a surface specialty (dirt, ice, water, etc.) and a perk.
- 2026.11.08 11:09 PM Eastern: pit crew and repair crew = named crew chiefs you recruit, each with a perk and brand (same card design as drivers); they shorten repair waits and cut repair costs.
- 2026.11.08 11:09 PM Eastern: auto-save after every race (save-kit) plus export/import save code; few settings (vibration, steering scheme, reset behind a grown-up check).
- 2026.11.08 11:27 PM Eastern: second web search for "Thumb Circuit" (game, app, trademark) found no exact match. Neighbors: ThumbRun (Three Innovations racing app), Thumb Drift, Thumb Grooves and Flat Thumb Interactive (game studios with trademarks), dead marks Thumbopoly and Thumbplay. Limit: this is a general web search, not the USPTO database; a real clearance needs a USPTO TSDR lookup (owner or counsel). Crowd meter question open.
- 2026.11.08 11:31 PM Eastern (owner): wants to sample all three palette moods (warm and bright; bold and saturated; muted retro) before choosing. Fold into the prototype page: palette switch next to the two steering schemes and two pixel sizes.
- 2026.11.08 11:36 PM Eastern: palette = warm and bright (left sample).
- 2026.11.08 11:38 PM Eastern (owner): final graphics must be far better than the palette samples (those are throwaway mockups). Style target: an "American version" of the cozy pixel management genre, without bizarre gameplay mechanics (keep mechanics plain and readable). Still original; no copying of any specific game.
- 2026.11.08 11:26 PM Eastern: race HUD = info along the top, one boost button low at one side by the thumb; steering works anywhere on screen.
- 2026.11.08 11:27 PM Eastern: garage = home tab with large car and six part cards (one tap buys a step); other tabs for Drivers, Crew, Shop.
- 2026.11.08 11:28 PM Eastern: cars = chunky and readable on track; high-detail pixel portrait in the garage where brand badges and upgrade looks show.
