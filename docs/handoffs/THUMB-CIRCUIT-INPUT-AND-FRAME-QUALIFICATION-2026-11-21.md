<!-- Copyright (c) 2026 LFC Foundry. MIT License. -->
# Thumb Circuit input and frame-pacing qualification

**Baseline:** main `037ee7a` (v8.02 sample, 2026-11-19). Read `README.md`, `docs/DESIGN.md`, `docs/DECISIONS-LOG.md`, and the two existing campaign-duel browser handoffs. Those cover different risks; this plan targets physical steering and frame cadence.

## Goal

Measure whether player steering and race progression remain predictable on portrait phones with different refresh rates and under interruption. Keep the game’s driving feel, economy, save behavior and visual settings unchanged. This is qualification and diagnosis, not permission to retune gameplay.

## Matrix

Use the public sample routes and fixed recorded input traces. Cross 320/360/390/430 CSS-pixel widths, DPR 1/2/3, 30/60/90/120 Hz where available, and low/mid/high graphics quality. Cover every publicly documented track at least once, plus a repeated representative race for paired timing. Include a clean save and a valid progressed synthetic save.

Input cases: stationary touch, slow/fast left-right drag, release at edge, pointercancel, second finger, tap/hold/release action, browser chrome/viewport resize, orientation change, tab hide/show, pause/resume, and brief main-thread stall. Run mouse/keyboard automation separately from physical one-thumb phone testing. Record input-to-steer delay, frame-gap distribution, missed frames, race-state determinism for fixed traces, and recovery delay after returning from background.

## Correctness and decision gates

No input may persist after cancellation or resume; a backgrounded page must not accumulate unbounded catch-up work. The same fixed input trace must preserve race outcomes across display refresh rates when the simulation is intended to be frame-rate independent. HUD and controls stay inside the portrait viewport; no action may become inaccessible after zoom or orientation change. Keep rendering-quality comparisons separate from steering and physics.

Reuse the existing duel natural-play and rendering browser tests as controls, then add only missing measurements in the owning test environment. Keep raw per-device runs, not pooled medians. Do not claim touch readiness from synthetic pointer events. Any change to controls, handling, race rules, size, or progression requires the owner’s explicit product decision.
