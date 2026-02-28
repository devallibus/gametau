# Electrobun Dogfood Triage Guide

This document describes how to operate and triage the recurring Electrobun
dogfood workflow introduced in issue #85.

## Triggering the Workflow

### Scheduled

The workflow runs automatically every **Monday at 06:00 UTC** via cron.

### Manual Dispatch

1. Navigate to **Actions > Electrobun Dogfood** in the GitHub repository.
2. Click **Run workflow**.
3. Optionally fill in:
   - **electrobun_ref** — an Electrobun version or Git ref to test against.
   - **verbose** — set to `true` for extra logging output.
4. Click the green **Run workflow** button.

Direct link:
`https://github.com/devallibus/gametau/actions/workflows/electrobun-dogfood.yml`

## Reading the Artifacts

Each matrix leg (`ubuntu-latest`, `macos-latest`, `windows-latest`) uploads an
artifact bundle named `dogfood-results-<os>`. Inside each bundle you will find:

| File | Contents |
|---|---|
| `webtau-test-results.log` | Full output of `bun run test` in `packages/webtau` |
| `adapter-test-results.log` | Output of adapter-specific tests (may be empty if none exist yet) |
| `electrobun-smoke-results.log` | Output of the Electrobun counter example build |
| `diagnostic-info.log` | Environment details, Bun version, and step outcome summary |

To download artifacts:

1. Open the completed workflow run.
2. Scroll to the **Artifacts** section at the bottom.
3. Click the artifact name to download the ZIP.

## Common Failure Patterns

| Symptom | Likely Cause | Action |
|---|---|---|
| `webtau-test-results.log` shows failures | Core webtau regression unrelated to Electrobun | Check the main CI workflow; file a bug if main CI is green but dogfood fails |
| `adapter-test-results.log` says "No adapter tests found" | Adapter test files have not been created yet | Expected during early development — no action needed |
| Electrobun smoke step fails with missing dependency | Electrobun tooling not available on the runner | Check `examples/electrobun-counter/package.json` for missing deps; note that native Electrobun desktop builds may not work in CI |
| Build step fails on Windows only | Path separator or shell compatibility issue | Review the failing log for backslash or `cmd` vs `bash` errors |
| Timeout on macOS runner | GitHub-hosted macOS runners can be slow | Re-run; if persistent, consider adding a timeout value to the step |
| `bun install` fails | Lock file drift or registry issue | Run `bun install` locally and commit any lock file changes |

## Escalation Path

1. **Transient / infra failures** — Re-run the workflow. If the failure persists
   across two consecutive scheduled runs, proceed to step 2.
2. **File an issue** with the label `electrobun` and include:
   - Link to the failing workflow run.
   - The relevant artifact logs (attach or paste).
   - OS matrix leg that failed.
3. **Tag maintainers** if the failure blocks other Electrobun integration work.

### Labels to Use

- `electrobun` — all Electrobun-related issues.
- `ci` — workflow or infrastructure problems.
- `bug` — confirmed regressions caught by dogfood.

## Readiness Ledger (Issue #78)

The Electrobun readiness ledger is tracked in issue #78. After each meaningful
dogfood run:

1. Add a comment to #78 with:
   - Link to the workflow run.
   - Summary of pass/fail per OS leg.
   - Any new failure patterns discovered.
2. Update the ledger table if the run changes the readiness status of any
   tracked capability.
