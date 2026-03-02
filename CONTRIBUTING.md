# Contributing to gametau

Thanks for your interest in contributing!

## How the codebase is organized

gametau uses a 4-crate model that keeps game logic, command definitions, and platform bindings in separate layers.

```
core/       Pure game logic. No framework deps, no Tauri, no WASM.
commands/   Shared command definitions. #[webtau::command] generates both targets.
app/        Tauri desktop shell. Imports commands, registers with generate_handler!.
wasm/       WASM entry point. Links the commands crate (exports auto-wired).
```

**The dual-target constraint** is the key design rule: every command must work through both Tauri IPC (native desktop) and direct WASM call (browser). The `#[webtau::command]` proc macro generates both `#[tauri::command]` and `#[wasm_bindgen]` wrappers from a single function, so you write each command once in `commands/`.

If your change touches the command surface, make sure it compiles for both native and `wasm32-unknown-unknown` targets.

## Dev setup

### Prerequisites

- **Rust** (stable, minimum 1.77) with the `wasm32-unknown-unknown` target:
  ```sh
  rustup target add wasm32-unknown-unknown
  ```
- **wasm-pack** — required for WASM builds and the dev hot-reload loop
- **Bun** (recommended) or Node 18+
- **Tauri CLI** (only needed for desktop builds)

### Commands

```sh
# Install JS dependencies
bun install

# Build all packages
bun run build

# Run TypeScript tests
bun test --recursive

# Run Rust tests
cargo test --workspace

# Lint Rust (must pass with zero warnings)
cargo clippy --workspace -- -D warnings
```

### Run an example

```sh
cd examples/counter && bun run dev
```

## What we welcome

Good places to start:

- **Bug fixes** — especially in the shims (`webtau/fs`, `webtau/dialog`, `webtau/window`) where browser API coverage is still expanding
- **New shim methods** — fill gaps in `webtau/path`, `webtau/app`, `webtau/window` to improve parity with Tauri's API surface
- **New scaffolder templates** — additional renderer or framework templates alongside Three.js, PixiJS, and Canvas2D
- **Test coverage** — unit tests for edge cases in `invoke()`, `wasm_state!`, or the shims
- **Documentation improvements** — clearer examples, fixed typos, better explanations of tricky concepts

## What needs discussion first

Please open an issue before submitting a PR for:

- Breaking API changes to `invoke()` or `configure()`
- New core dependencies (npm or Cargo)
- Changes to the `#[webtau::command]` proc macro in `webtau-macros`

## Making a PR

1. Open an issue first for non-trivial changes.
2. All CI must pass — Rust clippy + tests, TypeScript tests + type checks.
3. Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, etc.
4. Keep PRs focused — one concern per PR.

## Minimum Supported Rust Version (MSRV)

The workspace MSRV is **1.77**. CI enforces this with a dedicated check job. Run `cargo +1.77 check --workspace` before bumping any dependency to verify MSRV compatibility.

## Environments and deployment

The repo uses two long-lived branches:

| Branch | Role | URL |
|---|---|---|
| `master` | Production | `gametau.devallibus.com` (Worker: `gametau-prod`) |
| `development` | Staging | `dev.gametau.devallibus.com` (Worker: `gametau-dev`) |

Feature branches target `development`. Promote from `development` to `master` only after staging smoke checks pass.

The site and API docs are deployed via Cloudflare Workers. Deploy workflows:

- `.github/workflows/deploy-workers-prod.yml`
- `.github/workflows/deploy-workers-staging.yml`

Required repository secrets for deployment: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.

## Release process

### CI publish preflight

The CI workflow includes a **Publish Preflight** job to catch release regressions before tags are pushed.

Rust checks:
- `cargo publish -p webtau-macros --dry-run`
- `cargo publish -p webtau --dry-run`

npm checks (`npm pack --dry-run` in each):
- `packages/webtau`
- `packages/webtau-vite`
- `packages/create-gametau`

Any non-zero exit or missing tarball metadata is a release blocker.

### Tagging and publishing

Full release gate requirements and sign-off checklist: [`.github/release/RELEASE-GATE-CHECKLIST.md`](.github/release/RELEASE-GATE-CHECKLIST.md).

If a release fails or partially publishes, follow the incident runbook: [`.github/release/RELEASE-INCIDENT-RESPONSE.md`](.github/release/RELEASE-INCIDENT-RESPONSE.md).

## Template dependency versioning

Templates target the current stable line by default.

- JS template reference: `packages/create-gametau/templates/base/package.json`
- Rust template reference: `packages/create-gametau/templates/base/src-tauri/commands/Cargo.toml`

During prerelease development for an upcoming release, pin template dependencies to the in-flight prerelease line for deterministic smoke coverage. Switch back to stable syntax before cutting the corresponding stable tag.

## CLA

By submitting a PR, you agree to the terms in [CLA.md](CLA.md).
