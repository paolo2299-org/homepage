# homepage-frontend

Static frontend for `pdlawson.com`, served by Nginx from a Docker container and deployed to Google Cloud Run in `europe-west1`.

## Running locally

### With Docker

```bash
docker build -t homepage-frontend .
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e BACKEND_ORIGIN=https://api.pdlawson.com \
  homepage-frontend
```

The site will be available at `http://localhost:8080`.

To test against a different backend during rollout, set `BACKEND_ORIGIN` to the backend service URL instead of the final custom domain.

## Deploying to Cloud Run

Deploy with Cloud Build:

```bash
gcloud builds submit --project paul-personal-306310 \
  --config cloudbuild.yaml \
  --substitutions _BACKEND_ORIGIN=https://api.pdlawson.com \
  .
```

The Cloud Build config builds the frontend container, pushes it to Container Registry, and deploys `homepage-frontend` to Cloud Run in `europe-west1`.

The Nginx container serves the static site and proxies `/api/*` requests to `BACKEND_ORIGIN`.

## Domain mapping

After deployment, create the Cloud Run domain mapping:

```bash
gcloud beta run domain-mappings create \
  --service homepage-frontend \
  --domain pdlawson.com \
  --region europe-west1
```

Then add the DNS records that Google Cloud Run shows for the mapping.
