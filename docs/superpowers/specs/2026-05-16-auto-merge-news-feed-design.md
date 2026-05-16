# Auto-merge "Update AI news feed" PRs

**Date:** 2026-05-16
**Status:** Approved

## Problem

A scheduled job creates a PR each day titled "Update AI news feed". These PRs are currently merged manually. Multiple PRs can accumulate if the job runs more than once (e.g. retries, manual triggers), leaving stale duplicates open.

## Solution

A new GitHub Actions workflow that triggers whenever a PR is opened, reopened, or synchronized. If the PR title matches "Update AI news feed", it closes any older open duplicates and merges the current PR automatically.

## Workflow design

**File:** `.github/workflows/auto-merge-news-feed.yml`

**Trigger:**
```yaml
on:
  pull_request:
    types: [opened, reopened, synchronize]
    branches: [main]
```

**Permissions:**
```yaml
permissions:
  pull-requests: write
  contents: write
```

**Job steps:**

1. **Title check** — exit early (`if: github.event.pull_request.title == 'Update AI news feed'`) so the workflow is a complete no-op for all other PRs.
2. **Close duplicates** — `gh pr list --state open --search "Update AI news feed in:title"`, filter out the current PR number, close each remaining one with `gh pr close`.
3. **Merge current PR** — `gh pr merge <number> --merge --auto`. The `--auto` flag means GitHub will wait for any required status checks before completing the merge, so this stays safe if CI checks are added later.

**Authentication:** `GITHUB_TOKEN` (already available, no new secrets).

**Error behaviour:** Workflow fails visibly in the Actions tab if the merge fails (e.g. merge conflict). No silent suppression.

## Out of scope

- Posting comments on closed/merged PRs (they are bot-created, no notification needed)
- Adding CI checks on PRs (separate concern)
- Changing the branch naming convention used by the news feed job
