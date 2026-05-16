# Auto-merge AI news feed PRs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions workflow that automatically closes stale duplicate "Update AI news feed" PRs and merges the newest one when it opens.

**Architecture:** A single event-driven workflow triggered by `pull_request` events. An `if:` condition on the job skips execution for all PRs whose title doesn't match, keeping the workflow a no-op for normal development PRs. The job uses `gh` CLI (pre-installed on `ubuntu-latest`) with `GITHUB_TOKEN` — no new secrets required.

**Tech Stack:** GitHub Actions, `gh` CLI, `GITHUB_TOKEN`

---

### Task 1: Create the auto-merge workflow

**Files:**
- Create: `.github/workflows/auto-merge-news-feed.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/auto-merge-news-feed.yml` with the following content:

```yaml
name: Auto-merge AI news feed PRs

on:
  pull_request:
    types: [opened, reopened, synchronize]
    branches: [main]

permissions:
  pull-requests: write
  contents: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.event.pull_request.title == 'Update AI news feed'
    steps:
      - name: Close duplicate PRs
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CURRENT_PR: ${{ github.event.pull_request.number }}
        run: |
          gh pr list \
            --repo "${{ github.repository }}" \
            --state open \
            --search "Update AI news feed in:title" \
            --json number \
            --jq '.[].number' \
          | while read -r number; do
              if [ "$number" != "$CURRENT_PR" ]; then
                echo "Closing duplicate PR #$number"
                gh pr close "$number" --repo "${{ github.repository }}"
              fi
            done

      - name: Merge PR
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr merge "${{ github.event.pull_request.number }}" \
            --repo "${{ github.repository }}" \
            --merge
```

- [ ] **Step 2: Verify the YAML is well-formed**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/auto-merge-news-feed.yml'))" && echo "YAML OK"
```

Expected output: `YAML OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/auto-merge-news-feed.yml docs/superpowers/specs/2026-05-16-auto-merge-news-feed-design.md docs/superpowers/plans/2026-05-16-auto-merge-news-feed.md
git commit -m "Add auto-merge workflow for AI news feed PRs"
```

---

### Task 2: Smoke-test via GitHub

No automated test framework applies here — the real test is observing the workflow run on GitHub Actions.

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Trigger a test run**

Open a PR against `main` with the title `Update AI news feed` (can be a trivial whitespace change to `frontend/ai-news/news.json`). Navigate to the Actions tab on GitHub and confirm:
- The `Auto-merge AI news feed PRs` workflow appears and runs
- The job completes successfully
- The PR is merged

- [ ] **Step 3: Verify duplicate-closing works (optional)**

If a second open PR with the same title exists when the workflow runs, confirm it is closed automatically in the "Close duplicate PRs" step logs.
