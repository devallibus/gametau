# Release Gate Checklist

Use this as the canonical gate artifact for `0.3.0+` releases. It complements
`docs/RELEASE-INCIDENT-RESPONSE.md` by defining what must be true *before* and
*after* tagging.

## 1) Pre-Tag Gate (On `master`)

- [ ] Candidate was promoted from `development` after successful staging deploy (`gametau-dev`) and smoke checks.
- [ ] Scope issues are closed (or explicitly deferred with notes).
- [ ] `CI` run on `master` is green (`MSRV`, `Rust`, `TypeScript`, `API Docs`, `Scaffold & Build Smoke`, `Publish Preflight`).
- [ ] `create-gametau` template architecture checks pass (service seams + scaffold tests).
- [ ] `CHANGELOG.md`, `README.md`, and docs reflect the release narrative and compatibility notes.
- [ ] Version manifests are aligned across workspace crates, npm packages, and templates.
- [ ] Local working tree is clean: `git status` shows no untracked generated artifacts (`.playwright-mcp/`, `**/src-tauri/app/gen/`)

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

Record sign-off in the release tracking thread:

- [ ] Engineering sign-off
- [ ] CI/release gate sign-off
- [ ] Roadmap state sign-off
