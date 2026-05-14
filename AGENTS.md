# pdlawson.com — Agent Context

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

The site has two parallel CSS approaches:

### Main site (`/`, `/ai-news/`)
- Shared baseline: `frontend/style.css` — minimal globals (box-sizing reset, centred body, link colour, heading margin)
- Per-page styles: inline `<style>` blocks in each HTML file
- Always link `/style.css` when adding pages here

### Pico CSS experiment (`/pico/`, `/pico/ai-news/`)
- Uses [Pico CSS v2](https://picocss.com) loaded from CDN — no shared stylesheet
- Content wrapped in `<main class="container">` for centred max-width layout
- Custom CSS is kept to an absolute minimum: only add it when the page would be non-functional or very hard to use without it
- The `/pico/ai-news/` page fetches article data from `/ai-news/news.json` (shared with the original — no duplication)

## Routing

Nginx uses `try_files $uri $uri/ =404`, so any new directory with an `index.html` is automatically served. No Nginx config changes are needed when adding pages.
