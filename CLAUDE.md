# pdlawson.com — Claude Code Context

## What this is
Personal website for `pdlawson.com`. A single static frontend served by Nginx, deployed to a VPS via GitHub Actions.

## Projects
- **London Cinema Tracker** (`https://london-cinema-tracker.com`) — external site tracking movies showing in central London cinemas, with an MCP server
- **How LLMs Work** (`https://llm.pdlawson.com`) — explanation and demonstration of how LLMs work (separate site, linked from the homepage)

## Architecture & tech decisions

### Frontend
- Plain HTML + CSS + vanilla JS — no framework, no npm
- ES modules (`<script type="module">`) for splitting JS across files where needed
- Shared `style.css` for consistent styling across pages
- Deployed as a static site from an Nginx container on a VPS (via GitHub Actions)
- Images pushed to GitHub Container Registry (`ghcr.io`)

**Rationale:** the site is purely static — no backend, no build step. A single Nginx container keeps things simple and cheap to host.

### File structure

- `frontend/` — static site assets plus Nginx/Docker deployment files
- `Makefile` — root entrypoints for local dev and prod management
- `.github/workflows/deploy.yml` — automated deploy pipeline

## Development workflow
- Primary branch: `main`
- No frontend build step — edit static files directly
- Always add a shared `style.css` link when creating new pages in the main site

## CSS setup

See `AGENTS.md` for a full description of the CSS setup. In brief:
- **Main site** (`/`, `/ai-news/`): shared `frontend/style.css` + per-page inline `<style>` blocks
- **Pico experiment** (`/pico/`, `/pico/ai-news/`): Pico CSS v2 from CDN, minimal custom CSS only
