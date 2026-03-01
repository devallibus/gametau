# Release Gate Checklist

Use this as the canonical gate artifact for `0.3.0+` releases. It complements
`.github/release/RELEASE-INCIDENT-RESPONSE.md` by defining what must be true
*before* and *after* tagging.

## P0 Technical Gates (All must be Green)

### G-P0-A: Long-Running Task Lifecycle
- [ ] `startTask/pollTask/cancelTask` API exists in `packages/webtau/src/task.ts`
- [ ] Task lifecycle tests pass: `bun test src/task.test.ts` (0 failures)
- [ ] CPV-6 evidence collected (task status trace, cancellation proof)
- [ ] Scaffold template includes typed task seam (`src/services/backend.ts`)

### G-P0-B: Backend Event Stream Parity
- [ ] `createTauriEventAdapter()` exists in `packages/webtau/src/adapters/tauri.ts`
- [ ] Parity tests pass: `bun test src/adapters/tauri.test.ts` (0 failures)
- [ ] Parity tests pass: `bun test src/event.test.ts` (0 failures)
- [ ] CPV-7 evidence collected (ordered event log, multi-listener output, unlisten proof)

### G-P0-C: Non-Panicking Diagnostics
- [ ] `WebtauError` envelope exists in `packages/webtau/src/diagnostics.ts`
- [ ] All `invoke()` failure paths throw `WebtauError` (not plain `Error`)
- [ ] WASM macro wrappers return `Result<_, JsError>` (no `unwrap()` panics)
- [ ] `try_with_state` / `try_with_state_mut` exist in `wasm_state!` macro
- [ ] Envelope shape tests pass: `bun test src/core.test.ts` (0 failures)
- [ ] Rust crate tests pass: `cargo test --workspace` (0 failures)
- [ ] CPV-8 evidence collected (error snapshot asserting all 5 envelope fields)

## 1) Pre-Tag Gate (On `master`)

- [ ] Candidate was promoted from `development` after successful staging deploy (`gametau-dev`) and smoke checks.
- [ ] Scope issues are closed (or explicitly deferred with notes).
- [ ] `CI` run on `master` is green (`MSRV`, `Rust`, `TypeScript`, `API Docs`, `Scaffold & Build Smoke`, `Publish Preflight`).
- [ ] `create-gametau` template architecture checks pass (service seams + scaffold tests).
- [ ] `CHANGELOG.md`, `README.md`, and docs reflect the release narrative and compatibility notes.
- [ ] Version manifests are aligned across workspace crates, npm packages, and templates.
- [ ] Local working tree is clean: `git status` shows no untracked generated artifacts (`.playwright-mcp/`, `**/src-tauri/app/gen/`)

### G1: Contract Clarity
- [ ] `README.md` is current with new task/event/diagnostics API surface
- [ ] `packages/webtau/package.json` exports include `./task` and `./adapters/tauri`
- [ ] All scaffold templates free of `{{PROJECT_NAME}}` placeholders

### G2: Proxy Integration
- [ ] CPV-1 through CPV-8 pass or have accepted mitigations with owners
- [ ] Evidence bundle is attached to the release notes or linked issue

### G3: Diagnostics Quality
- [ ] CPV-4 and CPV-8 evidence demonstrates actionable remediation for each failure path
- [ ] No panic-first behavior in public API surface

### G4: Release Reliability
- [ ] `cargo publish --dry-run` succeeds for `webtau-macros` and `webtau`
- [ ] `npm pack --dry-run` succeeds for `webtau`, `webtau-vite`, `create-gametau`
- [ ] CI `publish-preflight` job is Green on the release commit

### G5: Handoff Readiness
- [ ] `SOLAR-TYCOON-GODOT-PORT-READINESS.md` scorecard is all-Green
- [ ] `SOLAR-TYCOON-PRE-PORT-GAP-ASSESSMENT.md` P0 rows are all closed
- [ ] `SOLAR-TYCOON-GODOT-PORT-BACKLOG.md` P0 blockers are resolved or deferred

## 2) Tag + Publish Gate

- [ ] Tag is created once (`vX.Y.Z`) and never rewritten.
- [ ] GitHub release is created with summary + migration/adoption notes.
- [ ] `Publish` workflow completes `publish-npm` and `publish-crate` successfully.
- [ ] `Verify Published Artifacts` job confirms npm + crates installability.
- [ ] `Consumer Smoke Test` passes using published registry artifacts.

## 3) Evidence Bundle (Required Links)

For each release, capture these links in the release issue/roadmap update:

- [ ] Merge PR(s) used for release preparation
- [ ] Tag URL
- [ ] GitHub release URL
- [ ] `Publish` workflow run URL
- [ ] Registry verification job URL
- [ ] Consumer smoke job URL
- [ ] Any follow-up risk/mitigation notes

## 4) Post-Publish Gate

- [ ] Roadmap/release tracking issue updated with: decision log, implementation evidence, adoption guidance, risk note.
- [ ] If any artifact is superseded/broken, publish a fix-forward patch and deprecate affected npm versions.
- [ ] Roadmap umbrella issue remains open until all planned workstreams are complete.

## 5) Sign-Off

To release, a maintainer must:
1. Complete all checklist items above.
2. Add a sign-off comment to the release PR: `RELEASE-GATE: all gates satisfied, Go`.
3. Tag the release only after the PR merges with CI Green.

Record sign-off in the release tracking thread:

- [ ] Engineering sign-off
- [ ] CI/release gate sign-off
- [ ] Roadmap state sign-off

## CI Enforcement

The `release-gate-contract` job in `.github/workflows/ci.yml` verifies:
- This file exists at `.github/release/RELEASE-GATE-CHECKLIST.md`
- `RELEASE-INCIDENT-RESPONSE.md` exists at `.github/release/RELEASE-INCIDENT-RESPONSE.md`

Both files must be present on every commit to `master` and `development`.
