#!/usr/bin/env bash
# Deploy or remove the demo stack.
# Swarm has no --env-file; compose ${VAR} is interpolated from the process env, so we load
# .env.demo in a subshell (no shell pollution) then run docker stack deploy.
#
# Usage:
#   ./scripts/stack-deploy.sh              # deploy stack "grant-demo"
#   ./scripts/stack-deploy.sh up            # same
#   ./scripts/stack-deploy.sh down         # remove stack "grant-demo"
#   ./scripts/stack-deploy.sh up my-stack  # deploy stack "my-stack"
#   ./scripts/stack-deploy.sh down my-stack # remove stack "my-stack"
#   ./scripts/stack-deploy.sh grant-demo   # deploy stack "grant-demo" (backward compat)
#
# From repo root: ./scripts/stack-deploy.sh [up|down] [stack-name]

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/.."
cd "$REPO_ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.demo.yml}"
ENV_FILE="${ENV_FILE:-.env.demo}"
STACK_NAME="${STACK_NAME:-grant-demo}"

# Parse: [up|down] [stack-name] or legacy: [stack-name]
if [[ "$1" == "down" ]]; then
  ACTION="down"
  STACK_NAME="${2:-$STACK_NAME}"
elif [[ "$1" == "up" ]]; then
  ACTION="up"
  STACK_NAME="${2:-$STACK_NAME}"
elif [[ -n "$1" ]]; then
  ACTION="up"
  STACK_NAME="$1"
else
  ACTION="up"
fi

if [[ "$ACTION" == "down" ]]; then
  echo "Removing stack $STACK_NAME..."
  docker stack rm "$STACK_NAME"
  echo "Done. Services may take a few seconds to shut down."
  exit 0
fi

# Deploy: require compose and env file
if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing $COMPOSE_FILE (run from repo root)." >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy from .env.demo.example and set POSTGRES_PASSWORD, REDIS_PASSWORD." >&2
  exit 1
fi

# docker stack deploy has no --env-file; compose ${VAR} interpolation uses the process
# environment. Load env in a subshell so we don't modify the caller's shell, then deploy.
# Expand ${VAR} in values so SECURITY_FRONTEND_URL=${APP_URL} etc. resolve correctly.
echo "Loading $ENV_FILE for variable substitution (subshell)..."
(
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
      # Expand ${VAR} references in value using already-exported vars
      while [[ "$value" =~ \$\{([A-Za-z_][A-Za-z0-9_]*)\} ]]; do
        ref="${BASH_REMATCH[1]}"
        refval="${!ref:-}"
        value="${value//\$\{$ref\}/$refval}"
      done
      export "$key=$value"
    fi
  done < "$ENV_FILE"
  echo "Deploying stack $STACK_NAME..."
  exec docker stack deploy -c "$COMPOSE_FILE" "$STACK_NAME"
)
exit $?
