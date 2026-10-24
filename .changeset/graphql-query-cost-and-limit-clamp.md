---
'grant-api': patch
---

GraphQL queries now have depth and complexity limits, and list `limit` is clamped to the configured max page size. Public `-1` is no longer an unbounded scan.
