---
'grant-api': patch
---

GHCR `:demo`, `:latest`, and `:<semver>` now ship together only when the version PR merges. Feature merges that only open `chore: version packages` no longer build or push images.
