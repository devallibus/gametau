# Release Incident Response

Runbook for `gametau` release incidents. Use this when a release is broken
in production, a publish fails mid-flight, or a gate is discovered post-merge.

## Severity Levels

| Level | Definition | Response time |
| --- | --- | --- |
| S1 | Published artifact is broken for all consumers | Immediate — patch within 24h |
| S2 | One runtime path (web or desktop) is broken | 48h |
| S3 | Non-blocking degradation, workaround exists | Next planned release |

## S1 — Broken Published Artifact

### Detection signals
- CI consumer smoke fails on a previously green tag.
- User reports scaffolded project fails `bun install` or `bun run dev`.
- npm install of `webtau` or `create-gametau` fails or produces type errors.

### Response steps
1. Open a `severity:S1` issue referencing the broken version.
2. Pull the broken tag from npm if consumer impact is confirmed: `npm deprecate webtau@X.Y.Z "broken: see #ISSUE"`.
3. Prepare a patch on `development`, fast-track through CI.
4. Tag a `.1` patch release and publish.
5. Notify consumers via GitHub release notes.

## S2 — Single Runtime Failure

### Detection signals
- Tauri desktop path works but web/WASM path panics (or vice versa).
- A P0 gate is discovered to be Red post-release (task lifecycle, event parity, or diagnostics).

### Response steps
1. Open a `severity:S2` issue with reproduction steps and affected runtime.
2. Add a known-limits note to `SOLAR-TYCOON-GODOT-PORT-READINESS.md`.
3. Prepare a fix on `development`, gate through P0 closure tests for the affected runtime.
4. Tag a patch release after CI is Green.

## S3 — Non-Blocking Degradation

1. Open a `severity:S3` issue.
2. Add to the `SOLAR-TYCOON-GODOT-PORT-BACKLOG.md` P1 or P2 backlog.
3. Include a workaround in the issue description.

## Post-Incident Review

After each S1 or S2 incident:

1. Add a root-cause section to the issue.
2. Update the release gate checklist with a new item if the incident exposed a gap.
3. Add a regression test targeting the exact failure path.
4. Record the incident in the release notes of the fix release.

## Contacts

- Maintainer on-call: see `CODEOWNERS`.
- Escalation: open a GitHub issue tagged `severity:S1` — maintainers are notified by email.
