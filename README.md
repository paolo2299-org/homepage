# homepage

Personal site for `pdlawson.com` — a single static frontend served by Nginx and deployed to a VPS.
 
## Running locally with Docker Compose

From the repo root:

```bash
make dev
```

This starts the frontend on `http://localhost:8080`. HTML, CSS, and JS are bind-mounted into the container, so a page refresh picks up changes immediately. If you change the Dockerfile or Nginx config, rebuild first:

```bash
make run
```

To stop:

```bash
make down
```

## Automated deploys from `main`

Pushing to `main` triggers a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. Builds the frontend Docker image
2. Pushes it to GitHub Container Registry (`ghcr.io`) tagged with the commit SHA and `main`
3. SSHs into the production VPS and runs `docker compose pull && docker compose up -d`

The workflow needs these secrets/variables configured in GitHub:

| Name | Type | Description |
|---|---|---|
| `DEPLOY_SSH_KEY` | secret | Private SSH key for the VPS |
| `DEPLOY_PORT` | secret | SSH port (defaults to 22) |
| `GHCR_USERNAME` | secret | GitHub username for GHCR login |
| `GHCR_TOKEN` | secret | Personal access token with `read:packages` |
| `DEPLOY_HOST` | var | Hostname or IP of the VPS |
| `DEPLOY_USER` | var | SSH user on the VPS |

## Production VPS setup

The production compose stack uses `compose.yml` + `compose.prod.yml`. The `homepage` service joins an external Docker network called `web`, which a reverse proxy (e.g. Traefik) uses to route traffic.

The expected working directory on the VPS is `/srv/homepage/app/homepage`.

To start or restart the service on the VPS manually:

```bash
make prod-start    # start (detached)
make prod-stop     # stop
make prod-restart  # restart
```
