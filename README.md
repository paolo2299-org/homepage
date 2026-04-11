# homepage

Personal site for `pdlawson.com` with two Cloud Run services:

- `frontend/` serves the static site through Nginx
- `backend/` runs the FastAPI API

## Running locally with Docker Compose

From the repo root:

```bash
make run
```

This starts:

- frontend on `http://localhost:8080`
- backend on `http://localhost:8000`

The frontend proxies `/api/*` to the backend container automatically.

This setup is dev-oriented:

- backend Python changes auto-reload through `uvicorn --reload`
- frontend HTML, CSS, and browser JS are bind-mounted into the container, so refresh the page to see changes

If you change Python dependencies, either Dockerfile, or the Nginx config template behaviour itself, rebuild the containers:

```bash
docker-compose up --build
```

To stop everything:

```bash
make stop
```

If you prefer, the underlying Docker Compose commands still work too:

```bash
docker-compose up --build
docker-compose down
```

## Automated deploys from `main`

The repo-level `cloudbuild.yaml` builds and deploys both services from a single Cloud Build run.

Each build:

- builds `homepage-backend` and `homepage-frontend`
- tags each image with both `${SHORT_SHA}` and `latest`
- deploys the backend first, then the frontend

To create the GitHub trigger that runs this pipeline on every push to `main`:

```bash
make create-main-trigger
```

If Cloud Build returns `Repository mapping does not exist`, first connect the GitHub repository in Cloud Build:

1. Open Cloud Build Triggers in the Google Cloud Console.
2. Choose `Connect repository`.
3. Authorise GitHub for project `paul-personal-306310`.
4. Connect `paolo2299/homepage`.
5. Re-run `make create-main-trigger`.

That target runs `scripts/create-main-trigger.sh` with these defaults:

- project: `paul-personal-306310`
- trigger name: `homepage-main-deploy`
- GitHub repo: `paolo2299/homepage`
- branch pattern: `^main$`

You can override them when needed:

```bash
PROJECT_ID=paul-personal-306310 \
TRIGGER_NAME=homepage-main-deploy \
REPO_OWNER=paolo2299 \
REPO_NAME=homepage \
make create-main-trigger
```

If your Cloud Build setup uses a 2nd-gen connected repository instead of the 1st-gen GitHub integration, pass `REPOSITORY=projects/.../locations/.../connections/.../repositories/...` and a non-global `BUILD_REGION`.

## Manual combined deploy

To run the same combined pipeline manually without waiting for a merge:

```bash
gcloud builds submit --project paul-personal-306310 --config cloudbuild.yaml .
```

## Permissions to check

The trigger's build service account needs permission to deploy Cloud Run revisions. If this is the first automated deploy for the project, make sure the Cloud Build service account has the roles needed for:

- building and pushing container images
- `roles/run.admin` to deploy Cloud Run services
- `roles/iam.serviceAccountUser` on the runtime service account, if one is configured
