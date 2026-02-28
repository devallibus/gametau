# Staging Deployment (Cloudflare Pages)

This guide describes the `development` -> Cloudflare staging flow.

## Deployment model

- Production:
  - Branch: `master`
  - Workflow: `.github/workflows/pages.yml`
  - Host: GitHub Pages
- Staging:
  - Branch: `development`
  - Workflow: `.github/workflows/staging-cloudflare.yml`
  - Host: Cloudflare Pages (custom domain)

## One-time Cloudflare setup

1. Create a Cloudflare Pages project (Direct Upload compatible), for example:
   - `gametau-staging`
2. Attach your custom staging domain in Cloudflare Pages project settings.
3. Ensure DNS is managed in Cloudflare for the staging hostname.

## One-time GitHub setup

Set these in the repository:

- Variable:
  - `CLOUDFLARE_PAGES_STAGING_PROJECT` = your Pages project name
- Secrets:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_API_TOKEN`

Minimum token permissions should allow Pages deployments for the target account/project.

## Runtime behavior

`staging-cloudflare.yml` builds:

- `site` with `SITE_BASE_PATH=/`
- examples with root-relative paths:
  - `/counter/`
  - `/pong/`
  - `/battlestation/`

Then it assembles `_site` and deploys with:

```bash
wrangler pages deploy _site --project-name <project> --branch development
```

## Verification checklist

- Push a no-op commit to `development`.
- Confirm `Deploy Staging to Cloudflare Pages` workflow is green.
- Open staging domain and verify:
  - `/` (site shell)
  - `/api/` (API docs)
  - `/counter/`, `/pong/`, `/battlestation/`

## Troubleshooting

- Missing project variable/secret values will fail early in workflow validation.
- If deployment succeeds but routes are broken, validate base paths and custom domain config.
- Use the uploaded `staging-site-artifact` from failed workflow runs for path/content inspection.
