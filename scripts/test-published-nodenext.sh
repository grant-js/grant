#!/usr/bin/env bash
# Packed-install type-check for published ESM types (issue #731).
#
# packages/@grantjs/client/scripts/test-install.sh only require()s JS. It cannot
# see .d.ts that collapse to `any` under moduleResolution nodenext + skipLibCheck.
# This fixture packs schema/client/server, installs the tarballs in a throwaway
# project, and type-checks probes that error (TS2322) when types are real and
# silently succeed when they have become `any`.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURE_DIR="$SCRIPT_DIR/published-nodenext-fixture"

CLIENT_DTS="$REPO_ROOT/packages/@grantjs/client/dist/index.d.ts"
SERVER_DTS="$REPO_ROOT/packages/@grantjs/server/dist/index.d.ts"

if [[ ! -f "$CLIENT_DTS" || ! -f "$SERVER_DTS" ]]; then
  echo "error: client/server dist is missing; run pnpm run build first" >&2
  exit 1
fi

WORK="$(mktemp -d)"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

PACK="$WORK/pack"
PROJ="$WORK/proj"
mkdir -p "$PACK" "$PROJ"

echo "packing @grantjs/schema, @grantjs/client, @grantjs/server"
# pnpm --filter … pack injects --recursive, which pnpm 8 pack rejects.
(cd "$REPO_ROOT/packages/@grantjs/schema" && pnpm pack --pack-destination "$PACK" >/dev/null)
(cd "$REPO_ROOT/packages/@grantjs/client" && pnpm pack --pack-destination "$PACK" >/dev/null)
(cd "$REPO_ROOT/packages/@grantjs/server" && pnpm pack --pack-destination "$PACK" >/dev/null)

shopt -s nullglob
TARBALLS=( "$PACK"/*.tgz )
if [[ ${#TARBALLS[@]} -ne 3 ]]; then
  echo "error: expected 3 packed tarballs, found ${#TARBALLS[@]}" >&2
  ls -la "$PACK" >&2
  exit 1
fi

cd "$PROJ"
npm init -y >/dev/null

# Consumer-like compiler: the issue was reported on TypeScript 5.9.3 with nodenext.
# Nest peers resolve @grantjs/server/nest; they are not in the packed tarballs.
echo "installing packed tarballs and typescript@5.9.3"
npm install --no-package-lock --ignore-scripts \
  "${TARBALLS[@]}" \
  typescript@5.9.3 \
  @types/node@22 \
  @nestjs/common@12 \
  @nestjs/core@12 \
  reflect-metadata \
  rxjs >/dev/null

cp "$FIXTURE_DIR/tsconfig.json" "$PROJ/tsconfig.json"
cp "$FIXTURE_DIR/probe.ts" "$PROJ/probe.ts"

TSC="$PROJ/node_modules/typescript/bin/tsc"
if [[ ! -x "$TSC" ]]; then
  echo "error: fixture typescript compiler missing at $TSC" >&2
  exit 1
fi

set +e
OUTPUT="$("$TSC" --pretty false -p "$PROJ/tsconfig.json" 2>&1)"
STATUS=$?
set -e

printf '%s\n' "$OUTPUT"

fail() {
  echo "error: $*" >&2
  exit 1
}

if [[ "$STATUS" -eq 0 ]]; then
  fail "tsc exited 0 under nodenext + skipLibCheck; published types collapsed to any (issue #731). test-install.sh cannot catch this."
fi

assert_ts2322() {
  local expected="$1"
  if ! printf '%s\n' "$OUTPUT" | grep -F -q "$expected"; then
    fail "expected TS2322 ($expected)"
  fi
}

assert_ts2322 "Type 'typeof GrantClient' is not assignable to type 'symbol'"
assert_ts2322 "Type 'Scope' is not assignable to type 'symbol'"
assert_ts2322 "Type 'EventData' is not assignable to type 'symbol'"
assert_ts2322 "Type 'typeof GrantModule' is not assignable to type 'symbol'"

# skipLibCheck hides this in .d.ts; schema publishes .ts, so extensionless
# relative specifiers (including directory barrels as ./name instead of
# ./name/index.js) still surface here.
if printf '%s\n' "$OUTPUT" | grep -E -q 'node_modules/@grantjs/[^:]+:.*error TS283[45]:'; then
  fail "published @grantjs types have extensionless relative specifiers (TS2834/TS2835)"
fi

echo "packed-install nodenext fixture passed (GrantClient, Scope, EventData, GrantModule are real types)"
