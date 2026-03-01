# Integration Proxy Validation Track

Use this runbook to validate `gametau` integration readiness using only public repository assets.

## Purpose

- Validate integration workflows end-to-end using only public repo assets.
- Stress the same seams downstream games and apps will use (`commands.rs`, typed frontend wrappers, runtime bridge, persistence/eventing).
- Produce an evidence bundle that release gates can consume.

## Scope Boundaries

- Requirements are derived from public contract surfaces and shipped API behavior.
- Validation target is `gametau` products: runtime bridge, templates, docs, and release process.
- App-specific implementation details outside this repository are intentionally out of scope.

## Validation Assets

- Open showcase baseline: `examples/battlestation`
- Fresh scaffold baseline: `bunx create-gametau integration-proxy`
- Template seams under direct test:
  - `packages/create-gametau/templates/base/src/index.ts`
  - `packages/create-gametau/templates/base/src/services/backend.ts`
  - `packages/create-gametau/templates/base/src-tauri/commands/src/commands.rs`

## Scenario Matrix

| Scenario | Goal | Required evidence |
| --- | --- | --- |
| CPV-1: Scaffold boot | Fresh scaffold runs in web and desktop modes without architecture rewrites | Terminal logs/screenshots for `bun run dev` and `bun run dev:tauri` |
| CPV-2: Command extension seam | Add one new typed command from Rust to frontend UI path | Patch/diff summary, command test output, UI invocation proof |
| CPV-3: Persistence + eventing | Persist and reload state; emit/listen app event in both targets | Round-trip output logs and event callback verification |
| CPV-4: Diagnostics quality | Trigger one known failure (for example missing command export) and verify error clarity | Captured error output + remediation steps applied |
| CPV-5: Release-consumer smoke | Validate install/use from published artifacts path | Workflow links and smoke script output |
| CPV-6: Long-running task lifecycle | Validate non-blocking `start/poll/cancel` behavior for heavy operations | Task status trace, cancellation proof, UI responsiveness capture |
| CPV-7: Backend event parity | Validate ordered backend progress/state events and listener lifecycle | Ordered event log, multi-listener output, unlisten proof |
| CPV-8: Structured diagnostics envelope | Validate error payload shape for invalid args/state-init/missing command paths | Error snapshot asserting `code/runtime/command/message/hint` fields |

## Step-by-Step Procedure

### 1) Run scaffold baseline

```bash
bunx create-gametau integration-proxy
cd integration-proxy
bun install
bun run dev
bun run dev:tauri
```

Record startup logs and one screenshot per target.

### 2) Validate command extension seam

Add one command in scaffolded `src-tauri/commands/src/commands.rs`, add a typed wrapper in `src/services/backend.ts`, and call it from the UI.

Expected outcome:

- Command compiles for desktop + wasm.
- Frontend call succeeds in both web and Tauri runtime.

### 3) Validate persistence and eventing

Use `webtau/fs` + `webtau/path` to write/read a small profile payload, and `webtau/event` to emit/listen a test event.

Expected outcome:

- Data round-trips without shape drift.
- Event callback receives payload in both runtime targets.

### 4) Validate diagnostics path

Introduce one controlled failure (for example call a non-existent command) and confirm the error points to a clear fix path.

Expected outcome:

- Error includes actionable guidance.
- A corrected run succeeds without additional hidden setup.

### 5) Capture release-consumer smoke

Run consumer smoke using published artifact expectations from release workflows. Capture URLs and logs in the evidence bundle.

Expected outcome:

- Published artifacts install and run in a clean consumer environment.
- Any issue is documented with mitigation or fix-forward note.

### 6) Validate long-running task lifecycle

Run one synthetic heavy command through `start/poll/cancel` and assert:

- UI/render loop remains responsive.
- Progress moves monotonically.
- Cancellation stops further state mutation (when `startTask(..., { onCancel })` is wired to backend cancellation).

### 7) Validate backend event parity

Run one progress-emitting backend path and assert:

- Event order is preserved.
- Multiple listeners receive consistent payloads.
- Unlisten prevents further callbacks.

### 8) Validate structured diagnostics envelope

Trigger controlled failures (invalid args, missing command, uninitialized state) and assert:

- No panic crash behavior.
- Error payload contains `code`, `runtime`, `command`, `message`, and `hint`.
- Docs remediation steps resolve each failure path.

## Evidence Bundle Template

For each proxy validation run, store:

1. Run metadata: date, branch, commit SHA, operator.
2. Scenario results: CPV-1..CPV-8 pass/fail with notes.
3. Logs and screenshots links.
4. Known limits encountered and mitigations.
5. Follow-up issue links for unresolved friction.

### CPV-6 Evidence Artifacts (Long-Running Task Lifecycle)

- `task.test.ts` output confirming all 20 lifecycle tests pass.
- Cancellation proof: `cancelTask()` transitions state to "cancelled" and subsequent `pollTask()` returns `{ state: "cancelled" }`.
- UI responsiveness capture: render loop remains unblocked during a simulated heavy `startTask()` call.

### CPV-7 Evidence Artifacts (Backend Event Parity)

- `tauri.test.ts` parity contract output (ordered delivery, multi-listener, unlisten precision — all pass).
- `event.test.ts` DOM bridge parity output (same contract on web path).
- Multi-listener log showing both listeners receive identical payloads.
- Unlisten proof: listener count drops to 0 after `unlisten()`, no further callbacks.

### CPV-8 Evidence Artifacts (Structured Diagnostics Envelope)

- `core.test.ts` WebtauError envelope shape test output (all pass).
- Error snapshot asserting presence of `code`, `runtime`, `command`, `message`, `hint` for each of:
  - Missing command: `code: "UNKNOWN_COMMAND"`, `hint` lists available exports.
  - Load failure: `code: "LOAD_FAILED"`, `message` contains original error.
  - No WASM configured: `code: "NO_WASM_CONFIGURED"`, `hint` points to `configure()`.

## Pass Criteria

- CPV-1..CPV-8 pass, or open failures have accepted mitigations and owners.
- Required docs remain accurate after the run:
  - `README.md`
  - `.github/release/RELEASE-GATE-CHECKLIST.md`
  - `.github/release/RELEASE-INCIDENT-RESPONSE.md`
