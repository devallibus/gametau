# Release Incident Response

Runbook for `gametau` release incidents. Use this when a release is broken
in production, a publish fails mid-flight, or a gate is discovered post-merge.

For normal release gating before/after tag cut, use `.github/release/RELEASE-GATE-CHECKLIST.md`.

## Severity Levels

| Level | Definition | Response time |
| --- | --- | --- |
| S1 | Published artifact is broken for all consumers | Immediate — patch within 24h |
| S2 | One runtime path (web or desktop) is broken | 48h |
| S3 | Non-blocking degradation, workaround exists | Next planned release |

## S1 — Broken Published Artifact

### Detection signals (S1)

- CI consumer smoke fails on a previously green tag.
- User reports scaffolded project fails `bun install` or `bun run dev`.
- npm install of `webtau` or `create-gametau` fails or produces type errors.

### Response steps (S1)

1. Open a `severity:S1` issue referencing the broken version.
2. Pull the broken tag from npm if consumer impact is confirmed: `npm deprecate webtau@X.Y.Z "broken: see #ISSUE"`.
3. Prepare a patch on `development`, fast-track through CI.
4. Tag a `.1` patch release and publish.
5. Notify consumers via GitHub release notes.

## S2 — Single Runtime Failure

### Detection signals (S2)

- Tauri desktop path works but web/WASM path panics (or vice versa).
- A P0 gate is discovered to be Red post-release (task lifecycle, event parity, or diagnostics).

### Response steps (S2)

1. Open a `severity:S2` issue with reproduction steps and affected runtime.
2. Add a known-limits note to the runtime portability readiness document (`RUNTIME-PORTABILITY-READINESS.md`).
3. Prepare a fix on `development`, gate through P0 closure tests for the affected runtime.
4. Tag a patch release after CI is Green.

## S3 — Non-Blocking Degradation

1. Open a `severity:S3` issue.
2. Add to the roadmap tracking issue/milestone P1 or P2 backlog.
3. Include a workaround in the issue description.

## Publish Workflow Stages

Current `Publish` workflow stages:

- `ci` (baseline validation; skipped for `workflow_dispatch`)
- `publish-npm` (npm publish)
- `publish-crate` (crates.io publish)
- `verify-publish` (registry installability/importability checks)
- `consumer-smoke` (scaffold/install/build end-user flow)
- `release-evidence` (evidence bundle artifact + run summary)

Treat the first failing stage as the primary fault domain, but check downstream stages for secondary regressions.

## Corrective Strategy

- **No artifacts published:** fix forward on `master`, then publish next patch release.
- **Partial artifacts published:** fix forward on `master`, bump patch version, publish next patch release, then deprecate superseded npm versions if needed.
- **Never retag an existing release version.** Always issue a new patch tag (`vX.Y.Z+1` in semantic terms).

## Implementing the Hotfix

- Keep changes minimal and scoped to the failing stage.
- Add or strengthen CI coverage so the same class of failure is caught before tag-time publish.
- Validate locally where practical (build/tests/scaffold paths).
- Commit with explicit intent (`fix(...)`, then `chore(release): prepare vX.Y.Z`).

## Publishing the Corrective Release

- Push hotfix commits to `master`.
- Create and push a new tag.
- Create a GitHub release for the new tag with clear incident/fix notes.

## npm Deprecation for Superseded Versions

If broken npm artifacts were already published, deprecate those versions with an upgrade message:

```sh
npm deprecate "create-gametau@<broken-version>" "Superseded by create-gametau@<fixed-version>. Please upgrade."
```

Apply this to each superseded version that should no longer be installed by users.

## Post-Incident Review

After each S1 or S2 incident:

1. Add a root-cause section to the issue.
2. Update the release gate checklist with a new item if the incident exposed a gap.
3. Add a regression test targeting the exact failure path.
4. Record the incident in the release notes of the fix release.

### Latest Incident Reference (S1)

- Incident: `webtau@0.5.0` Node ESM import failure (`ERR_MODULE_NOT_FOUND`) tracked in [#109](https://github.com/devallibus/gametau/issues/109).
- Fix-forward release: `v0.5.1` with explicit `.js` internal ESM specifiers.
- Corrective publish run (Green): [actions run](https://github.com/devallibus/gametau/actions/runs/22550637914)

## Verification Checklist Before Next Tag

- `CI` on `master` is green.
- `Publish Preflight` checks pass (`cargo publish --dry-run` for `webtau-macros`; `webtau` dry-run or CI-approved fallback `cargo check -p webtau`; `npm pack --dry-run` for npm packages).
- `.github/release/RELEASE-GATE-CHECKLIST.md` pre-tag items are complete.
- Release tracking issues are updated with:
  - failing run reference
  - fix commits
  - successful corrective run reference
- Registry verification confirms expected published versions for npm and crates.io.
- Roadmap/incident issues are closed or moved with explicit next actions.

## Contacts

- Maintainer on-call: release PR assignee or latest release author.
- Escalation: open a GitHub issue tagged `severity:S1` — maintainers are notified by email.
