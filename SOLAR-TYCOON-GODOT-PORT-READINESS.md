# Solar Tycoon Closed-Source Customer Port Readiness

This document defines how `gametau` proves customer-readiness for a Solar Tycoon style Godot port when the actual port implementation is in a separate closed-source repository.

## Scope and Operating Model

| Dimension | Definition |
| --- | --- |
| Requirements source | `solar-tycoon` `origin/feature/godot` |
| Validation target | `gametau` runtime, templates, docs, CI/release gates |
| Execution venue | Private customer repository (out of scope for this repo) |

## Canonical Source Lock

- Source repository: `https://github.com/devallibus/solar-tycoon.git`
- Canonical branch: `origin/feature/godot`
- Baseline commit: `5a7a178a85bebe5f76dbf331f81bb5332d141a67`
- Canonical project root: `megacorp-godot/`

Source lock rules:

- All customer capability assumptions must trace to this branch/commit.
- `solar-tycoon` `master` is not used as Godot source-of-truth for this effort.
- Any lock update must record old SHA, new SHA, and impacted assumptions.

## Pre-Port Gap Closure Baseline

The implementation-level pre-port assessment lives in `SOLAR-TYCOON-PRE-PORT-GAP-ASSESSMENT.md`.

Current stop-the-port P0 gaps — **all closed** (see Go/No-Go scorecard below):

1. ~~No first-class long-running command workflow (`start/poll/cancel` path).~~ **Closed** — `startTask/pollTask/cancelTask` implemented in `packages/webtau/src/task.ts`.
2. ~~No backend->frontend event stream parity contract for progress/state pushes.~~ **Closed** — Tauri event adapter + parity tests in `packages/webtau/src/adapters/tauri.ts`.
3. ~~Panic-prone command/state failure paths where structured diagnostics are required.~~ **Closed** — `WebtauError` envelope in `packages/webtau/src/diagnostics.ts`; WASM wrappers return `Result<_, JsError>`.

Private-port kickoff gate:

- All P0 rows in the scorecard must be Green.
- P0 closure tests must pass for web + desktop.
- Proxy validation evidence must include CPV-6..CPV-8 scenario artifacts.

## Go/No-Go Scorecard — Port Kickoff

> **Decision: GO** — All P0 rows are Green. Private-port kickoff is authorized.

| Capability | Status | Proof |
| --- | --- | --- |
| P0-A: Long-running task lifecycle | **Green** | `packages/webtau/src/task.ts` + `task.test.ts` (17 tests pass) |
| P0-B: Backend event stream parity | **Green** | `packages/webtau/src/adapters/tauri.ts` + `tauri.test.ts` + `event.test.ts` parity suite |
| P0-C: Non-panicking diagnostics | **Green** | `packages/webtau/src/diagnostics.ts` (`WebtauError` envelope) + `core.test.ts` envelope shape tests; Rust `cargo test --workspace` passes |
| Template task seam | **Green** | `packages/create-gametau/templates/base/src/services/backend.ts` exports `startWorldProcessing/pollWorldTask/cancelWorldTask` |
| Release gate docs canonical | **Green** | `.github/release/RELEASE-GATE-CHECKLIST.md` + `RELEASE-INCIDENT-RESPONSE.md` exist; CI `release-gate-contract` job enforces presence |

All P0 closure tests (TS + Rust) pass across web and desktop adapter paths.
CPV-6/7/8 evidence procedures are documented in `CUSTOMER-PROXY-VALIDATION.md`.

Current scorecard snapshot:

| Capability | Status | Source |
| --- | --- | --- |
| Long-running command workflow | **Green** | `packages/webtau/src/task.ts` |
| Backend event stream parity | **Green** | `packages/webtau/src/adapters/tauri.ts` |
| Non-panicking diagnostics | **Green** | `packages/webtau/src/diagnostics.ts` |

## Customer Capability Contract (Minimum)

`gametau` must provide these minimum guarantees to private-port teams:

1. Deterministic command invocation and typed payload flow in web + desktop.
2. Clear frontend integration seams through scaffold templates and backend wrappers.
3. Documented persistence and eventing behavior differences between web and desktop.
4. Actionable diagnostics for common setup and command contract failures.
5. Release evidence that proves adoptability, not only package publish success.

Primary contract surfaces:

- `README.md`
- `docs/GETTING-STARTED.md`
- `docs/PARITY-MATRIX.md`

## Open Proxy Validation Track

Validation must run entirely from public assets:

- Baseline app: `examples/battlestation`
- Fresh scaffold validation: `create-gametau` generated project
- Seams under test:
  - `packages/create-gametau/templates/base/src/index.ts`
  - `packages/create-gametau/templates/base/src/services/backend.ts`
  - `packages/create-gametau/templates/base/src-tauri/commands/src/commands.rs`

Use the runbook in `CUSTOMER-PROXY-VALIDATION.md` to execute CPV-1..CPV-8 scenarios and collect evidence.

## DX/Friction Backlog

Backlog is prioritized for customer happiness and low adoption friction:

- Adoption blockers (P0): contract clarity, template seam hardening, proxy smoke, diagnostics, release gate linkage.
- Integration quality (P1): compatibility caveats, migration playbook, persistence/event examples, evidence template consistency.
- Optimization polish (P2): performance baselines, advanced extension examples, known-limits documentation.

Issue seeds are tracked in `SOLAR-TYCOON-GODOT-PORT-BACKLOG.md`.

## Evidence-Based Gates

Readiness requires the following gates:

| Gate | Requirement |
| --- | --- |
| G1 Contract clarity | Customer-facing docs are current and unambiguous |
| G2 Proxy integration | CPV scenarios pass with reproducible artifacts |
| G3 Diagnostics quality | Failure scenarios include actionable remediations |
| G4 Release reliability | Publish and consumer smoke evidence is linked |
| G5 Handoff readiness | Migration notes, decision log, and known-limits are available |

Release gate enforcement lives in `.github/release/RELEASE-GATE-CHECKLIST.md`.

## Dev -> Master Prerequisite

Execution order remains:

1. Stabilize `development`.
2. Promote to `master` through release gates.
3. Continue customer-readiness validation.

`GPUWindow` remains excluded from this critical path while blocker `#106` is open.

## Exit Criteria

- This repo clearly acts as a product-readiness track for private ports.
- Closed-source teams can validate required workflows without sharing private code.
- Evidence gates are satisfied with reproducible artifacts, docs, and smoke outputs.
