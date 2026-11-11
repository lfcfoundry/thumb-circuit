# Thumb Circuit: decisions log, 2026.11.09 evening

Written 2026.11.09, 8:41 PM Eastern. This adds to `DESIGN-DOC-DRAFT-2026.11.08.md`. Where the two differ, this log is newer. Everything here was asked for or accepted by the owner in the project threads on 2026.11.09. Items marked GUESS are first values chosen by the builder and not yet judged by the owner.

## What it is and how it works
A one-thumb, portrait racing game. The playable is still a single-file sample page (latest v5.26, in `play/`). It is not yet the real game build in the repo.

## Why it exists
To settle look, feel and the reward loop by playing, before the real build starts.

## Look and rendering
| Topic | Decision |
|---|---|
| View | Tilted three-quarter view. Top-down stays as a setting. |
| Renderer | WebGL2 by default with live 3D toy models, soft shadows, per-pixel headlights at dusk and bloom. Canvas fallback. Automatic step-down: render scale 3, 2, 1, then Canvas. |
| Phone speed | 60.0 FPS at render scale x3 on the owner's phone through v5.11 (phone, Chromium engine), including the full 3D world. v5.12 to v5.14 not yet reported. |
| Logo | Toy license plate ("ONE-THUMB RACING / THUMB / CIRCUIT"). Sticker-text logos rejected as too close to the other games. |
| Cars | Wheels spin and steer, brake lights, exhaust puffs, nose dip and lift, 3D boost flame. A rammed rival flips with one eased roll and lands in dust. Shoves glide, never jump. |
| World | 3D fence (not across shortcuts), grandstands with a crowd that jumps with the fans meter, fan groups, corner arrow signs, start gantry, river, lake, bridge with rails, lakeside village. |
| Bonuses | Real 3D objects so they never look stuck on fences or the bridge. Classic gold coin (owner picked it over gears, trophy, wrench, checkered token). Pink thumbs-up hand for fans. Blue nitro bottle for boost. Rare big coin worth 5. |
| Announcements | Start lights. Lap and final-lap banner is a small strip in the bottom left that slides back out left; it must never cover the race or the Boost button. Only the finish banner is big, followed by red curtains into the results card. |
| Sound | None. Vibration calls stay as short pulses; the owner's phone has haptics off, do not chase it. |

## Driving and feel
| Topic | Decision |
|---|---|
| Steering | Owner plays "slide thumb". "Drag a target" stays as a setting. |
| Road help | Follows the road's direction only. It must not pull the car to the lane center. It fades as the thumb moves and nudges back only near the road edge. |
| Rocket start | Boost flashes green for about half a second at GO; tapping then gives a head start. Tapping in the last second before green loses it. |
| Slipstream | Sitting right behind a rival gives extra speed and a little boost. |
| Track density | The owner twice said there was too much on the track. Current level (v5.14, Meadow Loop): about 49 small coins a lap, 8 fan pickups, 2 boost bottles, about 5 big coins, 5 track features in total, cones and tire stacks at every other corner. Do not add more without asking. |
| Bonus placement | Because road help no longer centers the car, some bonuses sit on the center line and some zigzag, so the player has to move. |

## Excitement (owner picked three of four on a card)
- Track thrills: jump ramps, speed pads, oil slicks, puddles. Rivals use and suffer them.
- Close racing drama: close-call bonus, final-lap hunter, slow-motion photo finish.
- Bigger crashes and stunts: flying cones and tire stacks, chain flips, double ram, drift tiers.
- Not picked: "faster and tighter feel" (higher top speed, camera zoom).
- Left out for cost: replay of the last corner.

DECIDED (owner tapped "Keep it", 2026.11.09 9:21 PM ET): the final-lap hunter gives rivals behind the player a small speed lift (5 to 11%) and slows rivals far ahead by 5%. The design doc rule "fair AI, no secret help" now allows this last-lap help.

LEVELS (owner picked "Levels and track unlocks", v5.15; every number is a first guess): XP per race = 20 + place bonus (30/20/10) + up to 20 from coins + up to 20 from stunts. Levels 1 to 10; XP needed 60 + 40 per level. Unlocks: Sedan 2, Twin Pines + Dot + upgrade level 3 to 4 at 3, Kart 4, Truck + Rex + upgrade level 5 at 5, Sports 6. Rivals get 1.2% faster per level, up to 10%. Old saves get 40 XP per past race and keep what they own.

## Game loop in the sample
| Topic | Decision or GUESS |
|---|---|
| Wallet | Race coins plus a finishing prize are kept between races. Prize 30 / 15 / 5 for first to third (GUESS). |
| Upgrades | Engine, Tires, Turbo, Body. Five levels each, costs 30, 50, 80, 120, 170 (GUESS). Shared by all cars. The design doc's six-part list (engine, tires, brakes, body, boost, fuel) is still the plan for the real game. |
| Cars | Hatch free; Sedan 150, Kart 250, Truck 350, Sports 600 (GUESS). |
| Car colors | Owner asked for it: 10 paint colors and 6 stripe colors, free. |
| Drivers | Pip (free, fans faster), Dot (200, drift fills boost faster), Rex (400, bumps barely slow, rams pay double). Prices and perks are GUESS. Rivals Blaze, Mellow, Careful have faces. Pit and repair crews are not in the sample yet. |
| Tracks | Meadow Loop and Twin Pines (about half again as long, autumn woods). Both open for testing; unlock rules not decided. |

## Not done yet
- Pit crews and repair crews, repair delays and costs.
- Experience and levels, sponsors, regions, track unlock rules.
- Firefox and WebKit checks of the sample.
- USPTO name check for "Thumb Circuit".
- The real game build in `lfcfoundry/thumb-circuit` (not approved yet).

## Update v5.23 (2026.11.10)
- Dusk is darker, with two headlight beams per car. Arrow keys steer and space is Boost on a keyboard. The sample is published as `play/` and the landing page as `index.html`.
- Still open: name check, pit and repair crews, Firefox and WebKit checks, hidden speed report and error log buttons.
