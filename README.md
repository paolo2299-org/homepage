# homepage

Personal site for `pdlawson.com` — a single static frontend served by Nginx on a VPS.
 
## Local development

Development uses Python 3.12 with uv and serves the static frontend directly.
There is no frontend build step. Docker is used for production images only.

```bash
make worktree-create NAME=example-task
# cd to the printed path
make setup
make dev-start
make test
```

The server reports its allocated loopback or Tailscale URL. Static edits appear
on refresh, and the server stays running across chat endings and disconnects.
Use `make dev-status` to find its URL and `make dev-stop` to stop it.

When finished testing, run `make worktree-finish NAME=example-task` from a
retained checkout. It refuses to remove unfinished or unpublished work and
retains the branch. See [local development](docs/local-development.md).

## Publishing images from `main`

Pushing to `main` triggers a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. Builds the frontend Docker image
2. Pushes it to GitHub Container Registry (`ghcr.io`) tagged with the commit SHA and `main`

The workflow stops after publishing the image. It has no SSH access to the VPS.
The host independently checks the public GHCR package and deploys a changed
`main` digest from its root-owned operations configuration.

## Production VPS setup

The production service joins an external Docker network called `web`, which the
host's Caddy reverse proxy uses to route traffic. Its authoritative production
Compose definition and deployment timer live in the host operations repository;
the Compose files here remain useful for local or manual operation.

To request a production deployment on the VPS manually:

```bash
sudo systemctl start app-deploy@homepage.service
```
