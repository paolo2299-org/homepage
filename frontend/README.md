# homepage-frontend

Static frontend for `pdlawson.com`, served by Nginx from a Docker container and deployed to a VPS.

## Running locally

```bash
make build
make run
```

The site will be available at `http://localhost:8080`.

Or use the root-level `make dev` / `make run` targets, which handle this via Docker Compose.

## Deploying

Deploys are automated via GitHub Actions on push to `main` — see `.github/workflows/deploy.yml` at the repo root.
