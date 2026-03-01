# Runtime Portability Readiness

This document defines how `gametau` proves readiness for complex game integrations using only public repository artifacts.

## Scope and Operating Model

| Dimension | Definition |
| --- | --- |
| Validation target | `gametau` runtime, templates, docs, CI/release gates |
| Evidence source | Public tests, scaffolder seams, and release workflow artifacts |
| Execution venue | Consumer projects integrating published `gametau` packages |

## Pre-Port Gap Closure Baseline

The baseline assessment and closure evidence live in this document plus `INTEGRATION-PROXY-VALIDATION.md`.

Current stop-the-port P0 gaps — **all closed** (see Go/No-Go scorecard below):

1. ~~No first-class long-running command workflow (`start/poll/cancel` path).~~ **Closed** — `startTask/pollTask/cancelTask` implemented in `packages/webtau/src/task.ts`.
2. ~~No backend->frontend event stream parity contract for progress/state pushes.~~ **Closed** — Tauri event adapter + parity tests in `packages/webtau/src/adapters/tauri.ts`.
3. ~~Panic-prone command/state failure paths where structured diagnostics are required.~~ **Closed** — `WebtauError` envelope in `packages/webtau/src/diagnostics.ts`; WASM wrappers return `Result<_, JsError>`.

Adoption kickoff gate:

- All P0 rows in the scorecard must be Green.
- P0 closure tests must pass for web + desktop.
- Proxy validation evidence must include CPV-6..CPV-8 scenario artifacts.

## Go/No-Go Scorecard — Adoption Kickoff

> **Decision: GO** — All P0 rows are Green. Integration kickoff is authorized.

| Capability | Status | Proof |
| --- | --- | --- |
| P0-A: Long-running task lifecycle | **Green** | `packages/webtau/src/task.ts` + `task.test.ts` (20 tests pass) |
| P0-B: Backend event stream parity | **Green** | `packages/webtau/src/adapters/tauri.ts` + `tauri.test.ts` + `event.test.ts` parity suite |
| P0-C: Non-panicking diagnostics | **Green** | `packages/webtau/src/diagnostics.ts` (`WebtauError` envelope) + `core.test.ts` envelope shape tests; Rust `cargo test --workspace` passes |
| Template task seam | **Green** | `packages/create-gametau/templates/base/src/services/backend.ts` exports `startWorldProcessing/pollWorldTask/cancelWorldTask` |
| Release gate docs canonical | **Green** | `.github/release/RELEASE-GATE-CHECKLIST.md` + `.github/release/RELEASE-INCIDENT-RESPONSE.md` exist; CI `release-gate-contract` job enforces presence |

All P0 closure tests (TS + Rust) pass across web and desktop adapter paths.
CPV-6/7/8 evidence procedures are documented in `INTEGRATION-PROXY-VALIDATION.md`.

Current scorecard snapshot:

| Capability | Status | Source |
| --- | --- | --- |
| Long-running command workflow | **Green** | `packages/webtau/src/task.ts` |
| Backend event stream parity | **Green** | `packages/webtau/src/adapters/tauri.ts` |
| Non-panicking diagnostics | **Green** | `packages/webtau/src/diagnostics.ts` |

## Integration Capability Contract (Minimum)

`gametau` must provide these minimum guarantees to integrators:

1. Deterministic command invocation and typed payload flow in web + desktop.
2. Clear frontend integration seams through scaffold templates and backend wrappers.
3. Documented persistence and eventing behavior differences between web and desktop.
4. Actionable diagnostics for common setup and command contract failures.
5. Release evidence that proves adoptability, not only package publish success.

Primary contract surfaces:

- `README.md`
- `INTEGRATION-PROXY-VALIDATION.md`
- `.github/release/RELEASE-GATE-CHECKLIST.md`
- `.github/release/RELEASE-INCIDENT-RESPONSE.md`

## Open Proxy Validation Track

Validation must run entirely from public assets:

- Baseline app: `examples/battlestation`
- Fresh scaffold validation: `create-gametau` generated project
- Seams under test:
  - `packages/create-gametau/templates/base/src/index.ts`
  - `packages/create-gametau/templates/base/src/services/backend.ts`
  - `packages/create-gametau/templates/base/src-tauri/commands/src/commands.rs`

Use the runbook in `INTEGRATION-PROXY-VALIDATION.md` to execute CPV-1..CPV-8 scenarios and collect evidence.

## DX/Friction Backlog

Backlog is prioritized for integrator success and low adoption friction:

- Adoption blockers (P0): contract clarity, template seam hardening, proxy smoke, diagnostics, release gate linkage.
- Integration quality (P1): compatibility caveats, migration playbook, persistence/event examples, evidence template consistency.
- Optimization polish (P2): performance baselines, advanced extension examples, known-limits documentation.

Follow-up items are tracked through the roadmap milestone and tagged GitHub issues.

## Evidence-Based Gates

Readiness requires the following gates:

| Gate | Requirement |
| --- | --- |
| G1 Contract clarity | User-facing docs are current and unambiguous |
| G2 Proxy integration | CPV scenarios pass with reproducible artifacts |
| G3 Diagnostics quality | Failure scenarios include actionable remediations |
| G4 Release reliability | Publish and consumer smoke evidence is linked |
| G5 Handoff readiness | Migration notes, decision log, and known-limits are available |

Release gate enforcement lives in `.github/release/RELEASE-GATE-CHECKLIST.md`.

## Dev -> Master Prerequisite

Execution order remains:

1. Stabilize `development`.
2. Promote to `master` through release gates.
3. Continue integration-readiness validation.

`GPUWindow` remains excluded from this critical path while blocker `#106` is open.

## Exit Criteria

- This repo clearly acts as a product-readiness track for public adoption.
- Integrators can validate required workflows from public artifacts.
- Evidence gates are satisfied with reproducible artifacts, docs, and smoke outputs.
