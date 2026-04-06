# homepage-backend

Python/FastAPI backend for `pdlawson.com`, hosted on Google Cloud Run at `https://homepage-backend-56253706933.europe-west2.run.app` (custom domain `api.pdlawson.com` to be configured).

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

```bash
pip install -r requirements-test.txt
pytest test_main.py -v
```

## Deploying to Cloud Run

Build and push the Docker image, then deploy:

```bash
gcloud builds submit --project paul-personal-306310 --tag gcr.io/paul-personal-306310/homepage-backend

gcloud run deploy homepage-backend \
  --project paul-personal-306310 \
  --image gcr.io/paul-personal-306310/homepage-backend \
  --platform managed \
  --region europe-west2 \
  --allow-unauthenticated
```

Replace `PROJECT_ID` with your Google Cloud project ID.

The Dockerfile pre-downloads the tiktoken encoding at build time so there is no network call on the first request at runtime.
