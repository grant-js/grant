#!/usr/bin/env bash
# Run DB migrate and seed for the demo stack (Swarm). Execs into a running API task.
# Usage: ./scripts/stack-demo-migrate-seed.sh [stack-name]
# From repo root: ./scripts/stack-demo-migrate-seed.sh grant-demo
# Requires: stack already deployed (postgres + at least one API task running).

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."
STACK_NAME="${1:-grant-demo}"
CONTAINER_NAME_FILTER="${STACK_NAME}_api"
CONFIG_PATH="/app/packages/@grantjs/database/drizzle.config.cjs"

# Find an API container that has the migrate config (new image). After a rebuild, old tasks may still be running.
find_api_container_with_config() {
  for cid in $(docker ps -q --filter "name=${CONTAINER_NAME_FILTER}"); do
    if docker exec "$cid" test -f "$CONFIG_PATH" 2>/dev/null; then
      echo "$cid"
      return
    fi
  done
  echo ""
}

API_CONTAINER=$(find_api_container_with_config)
if [[ -z "$API_CONTAINER" ]]; then
  echo "No API task has $CONFIG_PATH yet (stack may be running an older image)."
  echo "Forcing API service update so new tasks use the current image..."
  docker service update --force "${STACK_NAME}_api" >/dev/null 2>&1
  echo "Waiting for API tasks to roll out (45s)..."
  sleep 45
  API_CONTAINER=$(find_api_container_with_config)
fi

if [[ -z "$API_CONTAINER" ]]; then
  echo "API image is missing drizzle.config.cjs. Rebuild without cache:" >&2
  echo "  docker compose -f docker-compose.demo.yml build --no-cache api" >&2
  echo "Then run: docker service update --force ${STACK_NAME}_api" >&2
  echo "Wait for rollout, then run this script again." >&2
  exit 1
fi

echo "Using API container: $API_CONTAINER"
echo "Running migrate..."
docker exec "$API_CONTAINER" sh -c 'cd /app/packages/@grantjs/database && ./node_modules/.bin/drizzle-kit migrate --config=drizzle.config.cjs'

echo ""
echo "Running seed..."
if ! docker exec "$API_CONTAINER" sh -c 'cd /app/packages/@grantjs/database && ./node_modules/.bin/tsx src/scripts/seed.ts'; then
  echo "" >&2
  echo "If the error is 'Cannot find package @/...', the API image is missing the database package tsconfig.json. Rebuild and roll out:" >&2
  echo "  docker compose -f docker-compose.demo.yml build api && docker service update --force ${STACK_NAME}_api" >&2
  echo "Then run this script again." >&2
  exit 1
fi

echo ""
echo "Done. Migrate and seed completed for stack $STACK_NAME."
