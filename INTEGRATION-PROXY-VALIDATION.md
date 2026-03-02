# Integration Validation Runbook

Use this runbook to validate that gametau's core workflows function end-to-end using only public repository assets. Run it before a release or when onboarding a new integration.

## What this covers

- Scaffold boot and project structure
- Adding new commands and calling them from the frontend
- Persistence, events, task lifecycle, and diagnostics
- Installing and using published artifacts in a clean consumer environment

Validation is intentionally limited to gametau's own products (runtime bridge, templates, docs) using the public repo. App-specific code in downstream projects is out of scope.

## Validation assets

- Showcase baseline: `examples/battlestation`
- Fresh scaffold baseline: `bunx create-gametau integration-proxy`
- Template seams under test:
  - `packages/create-gametau/templates/base/src/index.ts`
  - `packages/create-gametau/templates/base/src/services/backend.ts`
  - `packages/create-gametau/templates/base/src-tauri/commands/src/commands.rs`

## Scenario matrix

| Scenario | Goal | Required evidence |
| --- | --- | --- |
| CPV-1: Scaffold boot | A freshly scaffolded project starts in both web and Tauri modes without any changes to the generated structure | Startup logs and one screenshot per target |
| CPV-2: Command extension | Add one typed command in Rust and call it from the TypeScript frontend — proving the seam works end-to-end | Diff, command test output, UI invocation screenshot |
| CPV-3: Persistence + eventing | Write and reload a small state payload with `webtau/fs`; emit and receive an event with `webtau/event` — both in web and desktop | Round-trip logs, event callback output |
| CPV-4: Diagnostics quality | Trigger a controlled failure (for example, call a missing command) and confirm the error output points clearly to a fix | Captured error output plus corrected re-run |
| CPV-5: Release consumer smoke | Install and use gametau from published npm/crates.io artifacts in a clean environment | Workflow links and smoke script output |
| CPV-6: Long-running task lifecycle | Use `startTask`/`pollTask`/`cancelTask` for a slow operation and verify the UI stays responsive throughout | Task status trace, cancellation proof, responsiveness capture |
| CPV-7: Backend event parity | Emit ordered progress events from the backend and verify delivery order, multi-listener behavior, and clean unlisten | Ordered event log, multi-listener output, unlisten proof |
| CPV-8: Structured diagnostics envelope | Trigger three failure modes (invalid args, missing command, uninitialized state) and assert the full error shape | Error snapshots asserting `code`, `runtime`, `command`, `message`, `hint` |

## Step-by-step procedure

### 1. Run the scaffold baseline (CPV-1)

```bash
bunx create-gametau integration-proxy
cd integration-proxy
bun install
bun run dev
bun run dev:tauri
```

Record startup logs and one screenshot per target.

### 2. Extend with a new command (CPV-2)

Add one command to `src-tauri/commands/src/commands.rs`, a typed wrapper to `src/services/backend.ts`, and call it from the UI.

Expected: the command compiles for both desktop and `wasm32`, and the frontend call resolves in both runtimes.

### 3. Validate persistence and eventing (CPV-3)

Use `webtau/fs` and `webtau/path` to write and read a small profile payload. Use `webtau/event` to emit a test event and receive it in a listener.

Expected: data survives a round-trip without shape drift; the event callback fires in both web and Tauri.

### 4. Validate diagnostics (CPV-4)

Call a command that does not exist. Confirm the error output includes a clear remediation (for example, a list of available exports or a `configure()` call pattern).

Expected: error is actionable; a corrected run succeeds without additional hidden setup.

### 5. Validate published artifacts (CPV-5)

Install `webtau` and `create-gametau` from the published npm/crates.io artifacts in a clean directory (not the monorepo). Scaffold a project and confirm it builds.

Expected: published artifacts install and run; any issue is documented with a mitigation.

### 6. Validate task lifecycle (CPV-6)

Start a synthetic slow command with `startTask`, poll with `pollTask`, and cancel with `cancelTask`. Assert:

- The UI render loop stays responsive while the task is running.
- Progress increments monotonically.
- Cancellation stops further state mutation when `startTask(..., { onCancel })` is wired to backend logic.

### 7. Validate backend event parity (CPV-7)

Run a backend path that emits ordered progress events. Assert:

- Events arrive in order.
- Two independent listeners receive consistent payloads.
- After `unlisten()`, no further callbacks fire.

### 8. Validate diagnostics envelope shape (CPV-8)

Trigger three controlled failures and assert each error payload contains `code`, `runtime`, `command`, `message`, and `hint`:

| Failure | Expected `code` | Expected `hint` |
|---|---|---|
| Call a missing command | `UNKNOWN_COMMAND` | Lists available exports |
| WASM module load failure | `LOAD_FAILED` | Contains the original error message |
| `invoke()` before `configure()` | `NO_WASM_CONFIGURED` | Shows the correct `configure()` call pattern |

## Evidence bundle

For each validation run, record:

1. Run metadata: date, branch, commit SHA, and who ran it.
2. CPV-1..CPV-8 results: pass or fail, with notes on any failures.
3. Links to logs, screenshots, or CI run output.
4. Known gaps or friction encountered, with mitigations or follow-up issues.

### CPV-6 artifacts

- `task.test.ts` output confirming all lifecycle tests pass.
- Cancellation proof: `cancelTask()` transitions state to `"cancelled"`; subsequent `pollTask()` returns `{ state: "cancelled" }`.
- Evidence that the render loop was not blocked during a simulated heavy task.

### CPV-7 artifacts

- `tauri.test.ts` parity contract output (ordered delivery, multi-listener, unlisten precision).
- `event.test.ts` DOM bridge parity output (same contract on web).
- Multi-listener log showing both listeners received identical payloads.
- Unlisten proof: listener count drops to zero; no further callbacks.

### CPV-8 artifacts

- `core.test.ts` `WebtauError` envelope shape test output (all passing).
- Error snapshots for each of the three failure modes above, asserting all five envelope fields are present.

## Pass criteria

- CPV-1..CPV-8 pass, or any failures have documented mitigations and assigned owners.
- These docs remain accurate after the run: `README.md`, `.github/release/RELEASE-GATE-CHECKLIST.md`, `.github/release/RELEASE-INCIDENT-RESPONSE.md`.
