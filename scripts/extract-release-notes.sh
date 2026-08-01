#!/usr/bin/env bash
# Extract platform release notes for a semver version.
#
# Prefers root CHANGELOG.md when it has a section for the version.
# Otherwise aggregates human changeset entries from the fixed-group
# package changelogs (skipping dependency-only bumps).
#
# Usage:
#   scripts/extract-release-notes.sh <version> [output-file]
# Prints to stdout when output-file is omitted.
set -euo pipefail

VERSION="${1:-}"
OUT_FILE="${2:-}"

if [[ -z "$VERSION" ]]; then
  echo "usage: $0 <version> [output-file]" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

extract_section() {
  local file="$1"
  local ver="$2"
  [[ -f "$file" ]] || return 0
  awk -v ver="$ver" '
    $0 ~ "^## " ver "$" { found=1; next }
    found && /^## / { exit }
    found { print }
  ' "$file"
}

section_has_content() {
  grep -q '[[:alnum:]]' <<<"$1"
}

# Parse changelog section(s) into deduped human entries grouped by heading.
# Skips dependency-only bullets and nested package lists.
aggregate_human_entries() {
  awk '
    function flush_entry(   key) {
      if (entry == "") return
      key = entry
      sub(/^- [0-9a-f]+: /, "- ", key)
      if (seen[key]++) {
        entry = ""
        return
      }
      if (!(heading in printed_heading)) {
        if (nheadings++) out = out "\n"
        out = out heading "\n\n"
        printed_heading[heading] = 1
      }
      out = out entry "\n"
      entry = ""
    }

    /^### / {
      flush_entry()
      heading = $0
      next
    }

    # Nested dependency list
    /^[[:space:]]+- @[^[:space:]]+@/ { next }

    # Dependency-only top-level bullets
    /^- @[^[:space:]]+@[0-9]/ { flush_entry(); next }
    /^- Updated dependencies/ { flush_entry(); next }

    /^- / {
      flush_entry()
      if (heading == "") heading = "### Changes"
      entry = $0
      next
    }

    /^[[:space:]]+/ {
      if (entry != "") entry = entry "\n" $0
      next
    }

    NF == 0 {
      if (entry != "") entry = entry "\n"
      next
    }

    END {
      flush_entry()
      gsub(/^\n+/, "", out)
      gsub(/\n+$/, "", out)
      if (out != "") print out
    }
  '
}

ROOT_SECTION="$(extract_section CHANGELOG.md "$VERSION")"
if section_has_content "$ROOT_SECTION"; then
  NOTES="$ROOT_SECTION"
else
  PACKAGE_CHANGELOGS=(
    apps/api/CHANGELOG.md
    apps/web/CHANGELOG.md
    docs/CHANGELOG.md
    packages/@grantjs/schema/CHANGELOG.md
    packages/@grantjs/client/CHANGELOG.md
    packages/@grantjs/server/CHANGELOG.md
    packages/@grantjs/cli/CHANGELOG.md
  )

  AGGREGATED=""
  for file in "${PACKAGE_CHANGELOGS[@]}"; do
    section="$(extract_section "$file" "$VERSION" || true)"
    section_has_content "$section" || continue
    AGGREGATED+="$section"$'\n'
  done

  NOTES="$(printf '%s\n' "$AGGREGATED" | aggregate_human_entries || true)"
  if ! section_has_content "$NOTES"; then
    NOTES="No changeset summaries were recorded for this version."
  fi
fi

NOTES="$(printf '%s\n' "$NOTES" | sed -e '/./,$!d' | awk 'NF{p=1} p' | tac | sed -e '/./,$!d' | tac)"

BODY="$(cat <<EOF
Platform release **v${VERSION}** — apps, Docker images (\`:${VERSION}\`, \`:latest\`), and npm packages in the fixed version group.

${NOTES}
EOF
)"

if [[ -n "$OUT_FILE" ]]; then
  printf '%s\n' "$BODY" >"$OUT_FILE"
else
  printf '%s\n' "$BODY"
fi
