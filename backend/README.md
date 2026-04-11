# homepage-backend

Python/FastAPI backend for `pdlawson.com`, deployed to Google Cloud Run in `europe-west1` and intended to be mapped to `api.pdlawson.com`.

## Endpoints

- `GET /health` — health check
- `GET /tokenize?text=...` — tokenises text using tiktoken (cl100k_base / GPT-style encoding)

## Running locally

### With Docker (recommended)

```bash
docker build -t homepage-backend .
docker run -p 8080:8080 homepage-backend
```

The API will be available at `http://localhost:8080`.

### Without Docker

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

### Example request

```bash
curl "http://localhost:8080/tokenize?text=Hello world"
```

## Running tests

Use Docker as the standard, reproducible test path:

```bash
make test
```

That builds the dedicated `test` stage from the Dockerfile, so it uses a consistent environment without pulling in the production GloVe download step.

## Deploying to Cloud Run

Deploy with Cloud Build:

```bash
gcloud builds submit --project paul-personal-306310 --config cloudbuild.yaml .
```

The Cloud Build config builds the backend container, pushes it to Container Registry, and deploys `homepage-backend` to Cloud Run in `europe-west1`.

The Dockerfile pre-downloads the tiktoken encoding at build time so there is no network call on the first request at runtime.

## Domain mapping

After deployment, create the Cloud Run domain mapping:

```bash
gcloud beta run domain-mappings create \
  --service homepage-backend \
  --domain api.pdlawson.com \
  --region europe-west1
```

Then add the DNS records that Google Cloud Run shows for the mapping.
