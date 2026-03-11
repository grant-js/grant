#!/usr/bin/env bash
# =============================================================================
# Grant Platform – E2E Test Runner
# =============================================================================
# Starts the E2E Docker Compose stack (Postgres, Redis, API), runs migrations
# and seed, waits for the API to be healthy, then executes the E2E test suite.
#
# Environment: This script does NOT load any .env file. It sets E2E_API_BASE_URL
# and E2E_DB_URL with defaults below and passes them when running migrate, seed,
# and tests. Override by exporting those vars before running (e.g. in CI).
#
# Usage:
#   ./scripts/e2e.sh          # full run (start → migrate → seed → test → stop)
#   ./scripts/e2e.sh --up     # start stack + migrate + seed only (no tests)
#   ./scripts/e2e.sh --down   # tear down stack only
#   ./scripts/e2e.sh --test   # run tests only (stack must be up)
#   ./scripts/e2e.sh --report # run tests with JSON reporter + generate badges
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE_FILE="docker-compose.e2e.yml"
PROJECT_NAME="grant-e2e"

# Host-side URLs (exposed ports from docker-compose.e2e.yml). No .env required.
E2E_API_BASE_URL="${E2E_API_BASE_URL:-http://localhost:4000}"
E2E_DB_URL="${E2E_DB_URL:-postgresql://grant_user:grant_password@localhost:5433/grant_e2e}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[e2e]${NC} $*"; }
warn() { echo -e "${YELLOW}[e2e]${NC} $*"; }
err()  { echo -e "${RED}[e2e]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

start_stack() {
  log "Starting E2E stack (postgres + redis)..."
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d postgres redis

  log "Waiting for Postgres to be healthy..."
  wait_for_service "grant-e2e-postgres"

  log "Waiting for Redis to be healthy..."
  wait_for_service "grant-e2e-redis"

  log "Running database migrations..."
  DB_URL="$E2E_DB_URL" pnpm --filter @grantjs/database db:migrate

  log "Running database seed..."
  DB_URL="$E2E_DB_URL" pnpm --filter @grantjs/database db:seed

  log "Building and starting API container..."
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --build api

  log "Waiting for API health endpoint..."
  wait_for_health "$E2E_API_BASE_URL/health" 60
}

stop_stack() {
  log "Tearing down E2E stack..."
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down -v --remove-orphans 2>/dev/null || true
  log "Stack stopped."
}

run_tests() {
  log "Running E2E tests..."
  E2E_API_BASE_URL="$E2E_API_BASE_URL" \
  E2E_DB_URL="$E2E_DB_URL" \
  pnpm --filter grant-api test:e2e
}

run_report() {
  log "Running E2E tests with JSON reporter..."
  E2E_API_BASE_URL="$E2E_API_BASE_URL" \
  E2E_DB_URL="$E2E_DB_URL" \
  pnpm --filter grant-api test:e2e:report

  log "Generating compliance badges..."
  pnpm exec tsx scripts/compliance-badges.ts
}

wait_for_service() {
  local container_name="$1"
  local retries=30
  local i=0
  while [ $i -lt $retries ]; do
    local health
    health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "not_found")
    if [ "$health" = "healthy" ]; then
      log "$container_name is healthy."
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  err "$container_name did not become healthy after $((retries * 2))s."
  exit 1
}

wait_for_health() {
  local url="$1"
  local retries="${2:-30}"
  local i=0
  while [ $i -lt $retries ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      log "API is healthy at $url"
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  err "API at $url did not become healthy after $((retries * 2))s."
  docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs api --tail 50
  exit 1
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

case "${1:-}" in
  --up)
    start_stack
    log "Stack is ready. Run tests with: ./scripts/e2e.sh --test"
    ;;
  --down)
    stop_stack
    ;;
  --test)
    run_tests
    ;;
  --report)
    run_report
    ;;
  *)
    # Full run: start → test → stop
    trap stop_stack EXIT
    start_stack
    run_tests
    log "✅ E2E tests completed successfully."
    ;;
esac
