#!/usr/bin/env bash
# Manage the demo stack via Docker Compose.
#
# Usage:
#   ./scripts/stack-deploy.sh              # build + start (detached)
#   ./scripts/stack-deploy.sh up            # same
#   ./scripts/stack-deploy.sh update       # rebuild + recreate changed services
#   ./scripts/stack-deploy.sh down         # tear down (containers + default network)
#   ./scripts/stack-deploy.sh down -v      # tear down and remove volumes (full reset)
#   ./scripts/stack-deploy.sh logs         # tail api logs (follow)
#   ./scripts/stack-deploy.sh env          # print computed env (no deploy)
#
# From repo root: ./scripts/stack-deploy.sh [up|update|down|logs|env] [extra args]

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
cd "$REPO_ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.demo.yml}"
ENV_FILE="${ENV_FILE:-.env.demo}"

# Parse action
ACTION="${1:-up}"
shift 2>/dev/null || true

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing $COMPOSE_FILE (run from repo root)." >&2
  exit 1
fi
if [[ "$ACTION" != "env" ]] && [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy from .env.demo.example and set POSTGRES_PASSWORD, REDIS_PASSWORD." >&2
  echo "To preview computed env from the example file: ENV_FILE=.env.demo.example $0 env" >&2
  exit 1
fi

COMPOSE="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

case "$ACTION" in
  up)
    echo "Building images and starting services..."
    $COMPOSE up -d --build "$@"
    echo "Done. Services starting in background."
    echo "Logs: $0 logs"
    ;;
  update)
    echo "Rebuilding and recreating changed services..."
    $COMPOSE up -d --build --force-recreate "$@"
    ;;
  down)
    echo "Stopping services..."
    $COMPOSE down "$@"
    echo "Done."
    ;;
  logs)
    exec $COMPOSE logs -f --tail=100 api "$@"
    ;;
  env)
    echo "Computed env from $ENV_FILE:" >&2
    echo "---" >&2
    # Simple parser matching the .env.demo format
    while IFS= read -r line || [[ -n "$line" ]]; do
      line="${line%"${line##*[![:space:]]}"}"
      line="${line#"${line%%[![:space:]]*}"}"
      [[ -z "$line" ]] && continue
      [[ "$line" == \#* ]] && continue
      [[ "$line" == *\ \#* ]] && line="${line%% \#*}" && line="${line%"${line##*[![:space:]]}"}"
      [[ -z "$line" ]] && continue
      if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
        key="${BASH_REMATCH[1]}"
        value="${BASH_REMATCH[2]}"
        while [[ "$value" =~ \$\{([A-Za-z_][A-Za-z0-9_]*)\} ]]; do
          ref="${BASH_REMATCH[1]}"
          refval="${!ref:-}"
          value="${value//\$\{$ref\}/$refval}"
        done
        export "$key=$value"
        printf '%s=%s\n' "$key" "$value"
      fi
    done < "$ENV_FILE" | sort
    ;;
  *)
    echo "Usage: $0 [up|update|down|logs|env] [extra args]" >&2
    exit 1
    ;;
esac
