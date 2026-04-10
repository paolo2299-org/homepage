# pdlawson.com — Claude Code Context

## What this is
Personal website for `pdlawson.com`. The site frontend and backend are structured as separate services and deployed to Google Cloud Run.

## Projects
- **London Cinema Tracker** (`https://london-cinema-tracker.com`) — external site tracking movies showing in central London cinemas, with an MCP server
- **How LLMs Work** (`/llm`) — explanation and interactive demonstration of how LLMs work (in progress)

## Architecture & tech decisions

### Frontend
- Plain HTML + CSS + vanilla JS — no framework, no npm
- ES modules (`<script type="module">`) for splitting JS across files where needed
- Shared `style.css` for consistent styling across pages
- Deployed as a static site from an Nginx container on Cloud Run
- Native `fetch()` calls go through the frontend service at `/api`

**Rationale:** the site stays simple and static, but Cloud Run keeps the deployment model consistent with the backend and allows custom domain mapping on the service.

### Backend
- Complex logic (e.g. tokenisation) is handled by a separate backend API, not on the frontend
- Backend is a Python/FastAPI service hosted on **Google Cloud Run** in `europe-west1` (custom domain `api.pdlawson.com`)
- Cloud Run is serverless — scales to zero when idle (no cost for a low-traffic personal site)
- Deployed via Docker container pushed to Google Container Registry (`gcr.io`)
- The frontend proxies browser API requests to the backend via `/api`
- `tiktoken` for GPT-style tokenisation

### File structure

- `frontend/` — static site assets plus Cloud Run/Nginx deployment files
- `backend/` — Python/FastAPI service and its deployment files
- `Makefile` — root entrypoints for per-service deploy commands

## Development workflow
- Primary branch for active development: `claude/explore-repository-clf84` (or as specified per session)
- No frontend build step — edit static files directly
- Always add a shared `style.css` link when creating new pages
