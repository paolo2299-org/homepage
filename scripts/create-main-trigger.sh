#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-paul-personal-306310}"
TRIGGER_NAME="${TRIGGER_NAME:-homepage-main-deploy}"
BUILD_CONFIG="${BUILD_CONFIG:-cloudbuild.yaml}"
BRANCH_PATTERN="${BRANCH_PATTERN:-^main$}"
DESCRIPTION="${DESCRIPTION:-Deploy frontend and backend to Cloud Run on pushes to main}"
BUILD_REGION="${BUILD_REGION:-global}"

cmd=(
  gcloud builds triggers create github
  --project "$PROJECT_ID"
  --name "$TRIGGER_NAME"
  --branch-pattern "$BRANCH_PATTERN"
  --build-config "$BUILD_CONFIG"
  --description "$DESCRIPTION"
  --include-logs-with-status
)

if [[ -n "${REPOSITORY:-}" ]]; then
  cmd+=(
    --region "$BUILD_REGION"
    --repository "$REPOSITORY"
  )
else
  REPO_OWNER="${REPO_OWNER:-paolo2299}"
  REPO_NAME="${REPO_NAME:-homepage}"
  cmd+=(
    --repo-owner "$REPO_OWNER"
    --repo-name "$REPO_NAME"
  )
fi

if [[ -n "${BUILD_SERVICE_ACCOUNT:-}" ]]; then
  cmd+=(
    --service-account "$BUILD_SERVICE_ACCOUNT"
  )
fi

printf "Creating trigger '%s' for branch pattern '%s' using %s\n" \
  "$TRIGGER_NAME" \
  "$BRANCH_PATTERN" \
  "$BUILD_CONFIG"

"${cmd[@]}"
