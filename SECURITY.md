# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in gametau, please report it privately using
[GitHub Security Advisories](https://github.com/devallibus/gametau/security/advisories/new).

**Do not** open a public issue for security vulnerabilities.

We will acknowledge your report within **48 hours** and aim to release a fix for critical
vulnerabilities within **7 days**.

## Scope

The following areas are in scope for security reports:

- **WASM loading** — module integrity, loading from untrusted sources
- **IPC handling** — `invoke()` routing between Tauri and WASM, argument deserialization
- **Vite plugin file access** — `webtau-vite` file system operations during builds
- **Scaffolder (`create-gametau`)** — template extraction, file path traversal

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x (latest alpha) | Yes |
| < 0.1.0 | No |

## Disclosure

We follow coordinated disclosure. Once a fix is released, we will credit the reporter
(unless they prefer to remain anonymous) in the release notes.
