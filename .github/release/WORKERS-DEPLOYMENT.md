# Workers Deployment Runbook

This runbook describes the Cloudflare Workers hosting setup for gametau.

## Topology

- Production:
  - Branch: `master`
  - Worker: `gametau-prod`
  - Domain: `gametau.devallibus.com`
  - Workflow: `.github/workflows/deploy-workers-prod.yml`
- Staging:
  - Branch: `development`
  - Worker: `gametau-dev`
  - Domain: `dev.gametau.devallibus.com`
  - Workflow: `.github/workflows/deploy-workers-staging.yml`

Both workers deploy the same static asset bundle assembled into `_site/`:

- Site shell (`/`)
- API docs (`/api/`)
- Examples (`/counter/`, `/pong/`, `/battlestation/`)

## One-time GitHub setup

Configure repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Token should allow Worker deployments for the account.

## One-time Cloudflare setup

- Ensure worker `gametau-prod` exists and is mapped to `gametau.devallibus.com`.
- Ensure worker `gametau-dev` exists and is mapped to `dev.gametau.devallibus.com`.
- Keep DNS records proxied in Cloudflare.

## Deployment flow

1. Merge feature PRs into `development`.
2. `deploy-workers-staging.yml` runs and deploys staging assets.
3. Verify staging routes and behavior.
4. Open promotion PR from `development` to `master`.
5. After merge, `deploy-workers-prod.yml` deploys production assets.

## Smoke checklist

For both staging and production hosts, verify:

- `/` (site landing)
- `/api/` (TypeDoc + rustdoc output)
- `/counter/`
- `/pong/`
- `/battlestation/`

## Troubleshooting

- If domain resolves but HTTPS is unstable, wait for Cloudflare certificate propagation and retry.
- If deploy workflow fails early, confirm both Cloudflare secrets are present.
- If assets look stale, check the latest workflow run and inspect uploaded artifact on failure.
