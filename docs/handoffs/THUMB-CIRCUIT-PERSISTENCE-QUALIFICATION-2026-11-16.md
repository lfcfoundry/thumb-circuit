# Thumb Circuit — Persistence Remediation and Qualification Handoff

**Date:** 2026-11-16  
**Purpose:** Preserve the recovery, remediation, and independent qualification findings for Claude and future engineering work.  
**Scope:** Documentation handoff only. This branch does not contain or merge the reconstructed/remediated game implementation.

## Executive status

The reconstructed persistence implementation was remediated in an isolated checkout and passed its recorded headless Chromium suite. An independent adversarial review found no additional confirmed defect in the cooperating-tab save path. The review did, however, reproduce the known limitation that a queued save can be lost if the page or browser process is terminated before the save completes.

**Current conclusion:** the cooperating-tab persistence fixes are supported by the available Chromium evidence, but broad production readiness has not been established. Do not describe the implementation as crash-durable or cross-browser qualified.

## Recovery and implementation provenance

The recovered implementation was reconstructed in a detached checkout:

`/data/data/com.termux/files/home/thumb-circuit-save-integrity-rebuild-20261115/repo`

- Reconstructed HEAD: `b46bef4157ea1a11fa79dfcd8b079f16ce7976c1`
- Parent: `3c389ef6b97960ff2a208f8675e2ff1e7709b73d`
- Upstream `main` baseline: [`b46bef4157ea1a11fa79dfcd8b079f16ce7976c1`](https://github.com/lfcfoundry/thumb-circuit/commit/b46bef4157ea1a11fa79dfcd8b079f16ce7976c1)
- Baseline parent: [`3c389ef6b97960ff2a208f8675e2ff1e7709b73d`](https://github.com/lfcfoundry/thumb-circuit/commit/3c389ef6b97960ff2a208f8675e2ff1e7709b73d)
- Original session log: `/data/data/com.termux/files/home/thumb-circuit-save-integrity-rebuild-20261115/evidence/original-session-log.jsonl`
- Session-log SHA-256: `c05bb43b5e990955295d8214cdaa3693a4bb75636d49468bfb240893152df2f4`

The reconstruction changed only:
- `README.md`
- `play/index.html`
- `tests/persistence-browser.js`

The reconstruction's final browser output records 22/22 checks on Chromium 157 in `evidence/persistence-browser-final.log`; that file has no matching exit-code sidecar. Earlier reconstruction attempts did fail, including a recovery-download timeout in `evidence/persistence-browser-run7.log` (exit 1). Those failures are retained and are not represented as passing runs.

The save format and existing storage key `thumb-circuit-sample` were preserved. The design coordinates updated tabs using Web Locks, surfaces queued-save state, detects conflicts, reconciles uncertain writes, warns before unload, and offers a recovery download. Web Locks unavailability fails closed; it does not fall back to an uncoordinated write. Legacy tabs that do not use the lock can still bypass this coordination.

## Remediation

A separate remediation checkout was used:

`/data/data/com.termux/files/home/lfcfoundry/thumb-circuit-persistence-remediation-20261116/repo`

- Base HEAD: `b46bef4157ea1a11fa79dfcd8b079f16ce7976c1`
- Parent: `3c389ef6b97960ff2a208f8675e2ff1e7709b73d`

The remediation addressed the following audit findings:

### TC-01 — stale retry snapshot (originally P1)

A retry previously captured a save snapshot before acquiring the lock. That could persist an older state while reporting success even though newer progress existed in memory.

**Remediation:** snapshot and generation are captured under the lock; generation checks prevent an obsolete write from being reported as the latest saved state. The reported 5-to-50 coin race and repeated tests passed. Independent adversarial probes also exercised reentrant mutation during a retry write and mutation while waiting behind a normal save.

### TC-02 — duplicate retries and stale storage events

**Remediation:** concurrent retry requests share one in-flight promise, the retry control is disabled while pending, and the storage-event handler rereads the current storage value instead of trusting a potentially stale event payload.

Duplicate retry, contention, repeated-failure/recovery, and synthetic stale-event cases passed. The independent review notes that the stale event was synthetically delivered; native delayed cross-tab event ordering was not forced. A specific regression for the case where a conflict is followed by current bytes becoming this tab's own snapshot was not identified in the supplied evidence.

### TC-03 — final result mutation saved too early

The race completion path saved before results UI initialization; `almShow()` subsequently mutated `save.alm`.

**Remediation:** the final save follows result initialization and includes that mutation. The campaign finish/reload regression passed. The race completion path was reached using a diagnostic warp, not a full human-played race.

### TC-04 — storage failures misclassified as Web Locks unavailability

**Remediation:** lock failures, storage read/write failures, unknown write outcomes, serialization failures, and callback exceptions are classified separately. No uncoordinated fallback is used.

Injected failure cases passed. Genuine browser quota exhaustion and private-browsing behavior were not tested.

### TC-05 — queued save can be abandoned on termination

**Status: known limitation, not fixed.**

The pending state and beforeunload warning improve visibility, but they cannot guarantee that a queued save finishes. The independent process-termination probe demonstrated memory containing 777 coins while browser storage retained 1; after restart, the stored value (1) was loaded.

A “saved” status means the browser storage write was read back successfully. It does **not** mean data has been durably flushed to physical media or is immune to browser/process termination. Do not describe this mechanism as crash-proof or crash-durable.

## Verification evidence

### Remediation suite

The remediation report records:
- Final unfiltered suite: **34/34 checks passed**, exit code 0.
- Chromium version at that run: **157.0.8103.78**.
- Real separate same-origin pages sharing localStorage and Web Locks for concurrency cases.
- Injected Storage failures, unknown outcomes, conflict handling, retry paths, result/reward persistence, reload, and recovery-download checks.
- Recovery downloads were checked against Blob bytes and a completed browser download.
- Syntax, inline-script parsing, and whitespace checks passed.
- Concurrency lock case repeated five times; TC-01 and TC-02 repeated three times each.
- An 80-request save burst verified bounded active-plus-coalesced work.

The report and state-machine notes are in the remediation checkout:
- `evidence/remediation-report.md` — `/data/data/com.termux/files/home/lfcfoundry/thumb-circuit-persistence-remediation-20261116/repo/evidence/remediation-report.md`
- `evidence/remediation-state-machine.md` — `/data/data/com.termux/files/home/lfcfoundry/thumb-circuit-persistence-remediation-20261116/repo/evidence/remediation-state-machine.md`

The recorded final run is `evidence/remediation-final6.log`, with exit code `0` in the adjacent `remediation-final6.exit`. The recorded process-termination probe is `evidence/process-crash-remediation.log`.

### Independent adversarial qualification

The independent review supported TC-01 through TC-04 based on source inspection and recorded Chromium tests and found no new confirmed defect in the cooperating-tab save path.

Six additional adversarial probes passed in headless Chromium 157:
1. Reentrant newer generation during a retry write.
2. Retry waiting behind a normal save while progress changes.
3. Stale storage-event payload while current storage differs.
4. Lock rejection after a prior successful save.
5. Repeated write failures followed by successful recovery.
6. A 1,000-call save burst, with one active job plus one coalesced latest job and final generation persisted.

**Important qualification:** the overall adversarial run did not pass. A seventh probe intended to initialize and finish actual races in two gameplay pages timed out while the game remained in its boot state with race controls disabled. This was a test-setup/qualification failure, not evidence of a persistence defect. The log is:
`/data/data/com.termux/files/home/lfcfoundry/thumb-circuit-adversarial-qualification-20261116/evidence/adversarial-run1.log` (overall exit code `1`).

Do not summarize that run as seven passing probes or as a clean overall exit.

The independent review examined all 34 checks. Multi-tab storage and lock checks use distinct same-origin Chromium pages; storage-method failures are injected. Gameplay checks exercise the actual reward/result code but use the diagnostic warp hook instead of human driving. Recovery downloads compare Blob bytes, browser transfer/completion events, and the completed file contents. The stale-event regression injects a synthetic obsolete event payload; it does not force native browser event reordering. The full two-gameplay-page attempt is the seventh timed-out probe above.

A separate attempt to rerun the 34-check suite from the independent qualification copy did not reach the first assertion: it exited `1` after timing out waiting for Chromium's DevTools endpoint. A direct headless Chromium smoke launch did expose DevTools, so the cause of that harness startup failure remains unresolved. This attempt is recorded in `/data/data/com.termux/files/home/lfcfoundry/thumb-circuit-adversarial-qualification-20261116/evidence/independent-34.log`; it is neither a passing test run nor an application test failure. The earlier remediation run's 34/34 result remains supported by its separate complete log and exit-code sidecar.

## Coverage limits and interpretation

The available evidence is primarily headless Chromium evidence. It does not establish:
- Firefox compatibility.
- WebKit/Safari compatibility.
- Full human-played race completion and progression.
- Successful simultaneous gameplay in two tabs; the attempted two-page gameplay probe did not get past boot.
- Genuine quota exhaustion or all private-browsing storage behaviors.
- Native browser delivery of the exact delayed/out-of-order storage-event scenario.
- A dedicated conflict-to-exact-current-snapshot retry regression; source inspection shows the equality path, but the test case was not independently exercised.
- Crash durability after browser or process termination.

The project is a **browser game**. Android GUI testing is not inherently required merely because development and test tooling run in Termux on Android. Device-specific Android browser testing should be chosen only if Android/mobile browser behavior is an intended support target or a concrete platform-specific risk needs validation. Define the supported browser targets first; then prioritize actual gameplay and persistence testing in those browsers. Do not treat Android as a mandatory qualification target by default.

## Recommended project status

- Recovery/reconstruction: completed and preserved in its detached checkout.
- Persistence remediation: completed in its isolated checkout; recorded suite 34/34 passed.
- Independent adversarial review: no new confirmed cooperating-tab defect; six additional probes passed; one two-page gameplay probe did not qualify due to boot/setup timeout.
- TC-05 queued-save loss on termination: known and reproduced limitation.
- Browser compatibility beyond tested Chromium: unverified.
- Broad production readiness: not established.

## Instructions for Claude / next engineer

1. Read this handoff before making changes.
2. Treat the reconstruction and remediation checkouts as evidence-bearing work; do not overwrite or discard them.
3. Do not re-run large redundant headless suites without a specific unanswered question. The recent investigation has diminishing returns.
4. Do not change production code merely to improve a test score. First identify a reproducible defect or a clearly required supported-browser behavior.
5. Establish the intended browser support matrix before proposing device-specific qualification.
6. If further qualification is warranted, focus on real gameplay completion, progression, save/reload, and cooperating-tab behavior in the browsers the project actually intends to support.
7. Keep TC-05 explicit in documentation and UI semantics. Do not claim crash durability.
8. Preserve the existing save key and JSON format unless a separately justified migration plan is approved.
9. Do not add dependencies, alter unrelated files, rewrite project instructions, commit, push, or merge implementation changes without explicit authorization.

## Local evidence map

The source checkouts and raw logs below remain local and were not added to this documentation-only branch:

- Reconstruction: `/data/data/com.termux/files/home/thumb-circuit-save-integrity-rebuild-20261115/`; original session-log copy and 22-check output are under `evidence/`.
- Remediation: `/data/data/com.termux/files/home/lfcfoundry/thumb-circuit-persistence-remediation-20261116/repo/evidence/`; includes the report, state-machine notes, full 34/34 log and exit code, repeated concurrency runs, and process-kill probe.
- Independent qualification: `/data/data/com.termux/files/home/lfcfoundry/thumb-circuit-adversarial-qualification-20261116/evidence/`; includes the six-pass/seventh-timeout run and the separate DevTools-startup timeout.

The independent review was delivered as a review report in the preceding work session; no separate standalone Markdown report file was present in the qualification directory. This handoff records its conclusions against the preserved source and artifacts above.

This branch is a documentation handoff only; it does not merge the remediated implementation into `main`.
