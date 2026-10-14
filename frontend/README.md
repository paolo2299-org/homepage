# homepage-frontend

Static frontend for `pdlawson.com`, served by Nginx from a Docker container and deployed to a VPS.

## Running locally

```bash
make setup
make dev-start
```

These commands delegate to the repository root. The native server prints its
allocated loopback or Tailscale URL. Stop it with `make dev-stop`.
See [local development](../docs/local-development.md) for parallel worktrees and cleanup.

## Deploying

GitHub Actions publishes an image on pushes to `main`; the production VPS pulls
and deploys it independently. See `.github/workflows/deploy.yml` at the repo root.
