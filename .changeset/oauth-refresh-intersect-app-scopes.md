---
'grant-api': patch
---

Project OAuth refresh now always intersects the stored grant with the current app scope allowlist. Clearing the allowlist (or leaving no overlap) fails closed instead of keeping the old grant slugs.
