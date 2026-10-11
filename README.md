# homepage

Personal site for `pdlawson.com` — a single static frontend served by Nginx on a VPS.
 
## Running locally with Docker Compose

From the repo root:

```bash
make dev
```

This starts the frontend on `http://localhost:18082`. HTML, CSS, and JS are bind-mounted into the container, so a page refresh picks up changes immediately. If you change the Dockerfile or Nginx config, rebuild first:

```bash
make run
```

To stop:

```bash
make down
```

The source checkout always uses the `homepage-dev` Compose project and binds
only to the host loopback interface, so it cannot replace the production
container or expose a development server publicly. Set `DEV_PORT` in an
ignored `.env` file to override the default.

When developing on the VPS, forward the port from your Mac:

```bash
ssh -N -L 18082:127.0.0.1:18082 deploy@hetzner
```

Then open `http://localhost:18082` locally.

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
