# pdlawson.com — Claude Code Context

## What this is
Personal website hosted on GitHub Pages at `pdlawson.com`. It serves as an index for various projects, some hosted here, others at external domains.

## Projects
- **London Cinema Tracker** (`https://london-cinema-tracker.com`) — external site tracking movies showing in central London cinemas, with an MCP server
- **How LLMs Work** (`/llm`) — explanation and interactive demonstration of how LLMs work (in progress)

## Architecture & tech decisions

### Frontend
- Plain HTML + CSS + vanilla JS — no framework, no build step, no npm
- ES modules (`<script type="module">`) for splitting JS across files where needed
- Shared `style.css` for consistent styling across pages
- Native `fetch()` for all backend service calls

**Rationale:** GitHub Pages is static hosting. A build pipeline would require CI or local tooling, which is friction when working via Claude Code mobile / Anthropic remote servers. Files are edited and pushed directly — GitHub Pages serves them immediately.

### Backend
- Complex logic (e.g. tokenisation) is handled by a separate backend API, not on the frontend
- Backend is a Python/FastAPI service hosted on **Google Cloud Run**, at `api.pdlawson.com`
- Cloud Run is serverless — scales to zero when idle (no cost for a low-traffic personal site)
- Deployed via Docker container pushed to Google Artifact Registry
- FastAPI CORS middleware must allow requests from `pdlawson.com`
- `tiktoken` for GPT-style tokenisation

### File structure
```
paolo2299.github.io/
├── CLAUDE.md
├── CNAME          ← custom domain: pdlawson.com
├── style.css      ← shared styles
├── index.html     ← project index / landing page
└── llm/
    ├── index.html
    └── llm.js
```

## Development workflow
- Primary branch for active development: `claude/explore-repository-clf84` (or as specified per session)
- No local build step — edit files, commit, push, done
- Always add a shared `style.css` link when creating new pages
