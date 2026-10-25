---
'grant-api': patch
---

Build the request handler toolbox once after authenticate. Scoped RLS requests keep SET LOCAL on the request transaction; auth uses a thin unscoped Grant bootstrap.
