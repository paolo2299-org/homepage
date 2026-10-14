# pdlawson.com — Agent Context

## What this is
Personal website for `pdlawson.com`. A single static frontend served by Nginx. GitHub Actions publishes images, and the VPS pulls them independently.

## Projects
- **London Cinema Tracker** (`https://london-cinema-tracker.com`) — external site tracking movies showing in central London cinemas, with an MCP server
- **How LLMs Work** (`https://llm.pdlawson.com`) — explanation and demonstration of how LLMs work (separate site, linked from the homepage)

## Architecture & tech decisions

### Frontend
- Plain HTML + CSS + vanilla JS — no framework, no npm
- ES modules (`<script type="module">`) for splitting JS across files where needed
- [Pico CSS v2](https://picocss.com) loaded from CDN for base styling
- Deployed as a static site from an Nginx container on a VPS using host-side image polling
- Images pushed to GitHub Container Registry (`ghcr.io`)

**Rationale:** the site is purely static — no backend, no build step. A single Nginx container keeps things simple and cheap to host.

### File structure

- `frontend/` — static site assets plus Nginx/Docker deployment files
- `Makefile` — root entrypoints for local dev and prod management
- `.github/workflows/deploy.yml` — image build and publication pipeline

## Development environments

Development and CI use a worktree-local Python 3.12 environment with uv. Docker
is reserved for production images and deployment. No production credentials are
needed for setup or the tests.

From a clean retained checkout, create one environment for a task:

```bash
make worktree-create NAME=example-task
# cd to the printed worktree path
make setup
make dev-start
make test
```

The helper creates branch `codex/example-task` in
`<main-checkout-name>-worktrees/example-task`. Reuse a task's suitable worktree
across turns. Each server has its own allocated port, log, control socket and
Playwright name recorded in `.dev/session.json`. Report the name, branch, path,
URL and Playwright session when handing it to the user.

The server runs independently of the launching command and remains available
after a turn ends or the phone disconnects. Use `make dev` only for an interactive
foreground terminal. Bind addresses are restricted to loopback or Tailscale;
`DEV_HOST=127.0.0.1 make dev-start` forces local-only access. Python changes need
a stop/start; static/template edits appear on refresh.

Use `make dev-status` for the URL and `make dev-stop` to stop only this worktree.
`make dev-prune` removes stale session metadata after a crash. After stopping,
`make dev-clean` also removes the development log. Use only the recorded named
Playwright session; close it when finished and never use `close-all`.

When the user says they are finished with a named environment, close its named
browser session and, from a retained checkout, run:

```bash
make worktree-check NAME=example-task
make worktree-finish NAME=example-task
```

Finish repeats the checks, stops only that server, removes the worktree and its
disposable logs/virtualenv/caches, and retains the branch. Ending an agent turn
does not authorize cleanup. Never force removal, discard work, delete branches,
or commit/push simply to bypass a guard without the user's authorization.
Report what was removed and the retained branch.

Only helper-created environments are eligible. Cleanup refuses tracked or
untracked changes, unpublished commits, locked/detached/switched worktrees and
unexpected ignored files such as `.env` or model checkpoints. It fetches
`origin` to verify that HEAD is preserved on a remote branch; fetch failure
also refuses cleanup. Do not run competing commands in the same environment.
Other environments remain independent. See `docs/local-development.md`.

Never run development commands against production Compose stacks, containers,
credentials or writable production data.

## Project development notes

The native server serves only `frontend/` with directory indexes and 404s for
missing files. It blocks directory listings, deployment files and symlinks
outside the public directory. It applies no-cache headers so edits appear on
refresh. Production remains Nginx; edit static assets directly without a build
step. Scraper output is tracked source content and blocks cleanup until
preserved. Do not run scheduled scrapers merely to start development.

## CSS setup

All pages use [Pico CSS v2](https://picocss.com) loaded from CDN:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
```

- Content is wrapped in `<main class="container">` for Pico's centred max-width layout
- Custom CSS is kept to an absolute minimum — only add it when the page would be non-functional or noticeably hard to use without it
- Per-page custom styles go in an inline `<style>` block in the `<head>`

## Routing

Nginx uses `try_files $uri $uri/ =404`, so any new directory with an `index.html` is automatically served. No Nginx config changes are needed when adding pages.
