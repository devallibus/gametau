# Release Incident Response Checklist

Use this checklist when a tag-triggered `Publish` workflow fails or when release artifacts are partially published.
For normal release gating before/after tag cut, use `docs/RELEASE-GATE-CHECKLIST.md`.

## 1) Freeze and Capture Evidence

- Do not force-push, retag, or rewrite history for the failed release tag.
- Capture the failing run URL and job/step names.
- Post the run URL in the relevant issue/roadmap tracker before making changes.

## 2) Identify the Failing Stage

Current `Publish` workflow stages:

- `ci` (baseline validation)
- `publish-npm` (npm publish)
- `publish-crate` (crates.io publish)
- `verify-publish` (registry installability/importability checks)
- `consumer-smoke` (scaffold/install/build end-user flow)

Treat the first failing stage as the primary fault domain, but check downstream stages for secondary regressions.

## 3) Choose the Corrective Strategy

- **No artifacts published:** fix forward on `master`, then publish next patch release.
- **Partial artifacts published:** fix forward on `master`, bump patch version, publish next patch release, then deprecate superseded npm versions if needed.
- **Never retag an existing release version.** Always issue a new patch tag (`vX.Y.Z+1` in semantic terms).

## 4) Implement the Hotfix

- Keep changes minimal and scoped to the failing stage.
- Add or strengthen CI coverage so the same class of failure is caught before tag-time publish.
- Validate locally where practical (build/tests/scaffold paths).
- Commit with explicit intent (`fix(...)`, then `chore(release): prepare vX.Y.Z`).

## 5) Publish the Corrective Release

- Push hotfix commits to `master`.
- Create and push a new tag.
- Create a GitHub release for the new tag with clear incident/fix notes.

## 6) npm Deprecation for Superseded Versions

If broken npm artifacts were already published, deprecate those versions with an upgrade message:

```sh
npm deprecate "create-gametau@<broken-version>" "Superseded by create-gametau@<fixed-version>. Please upgrade."
```

Apply this to each superseded version that should no longer be installed by users.

## 7) Verification Checklist Before Next Tag

- `CI` on `master` is green.
- `Publish Preflight` checks pass (`cargo publish --dry-run`, `npm pack --dry-run`).
- `docs/RELEASE-GATE-CHECKLIST.md` pre-tag items are complete.
- Release tracking issues are updated with:
  - failing run reference
  - fix commits
  - successful corrective run reference
- Registry verification confirms expected published versions for npm and crates.io.
- Roadmap/incident issues are closed or moved with explicit next actions.
