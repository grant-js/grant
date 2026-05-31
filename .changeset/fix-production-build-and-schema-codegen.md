---
'grant': patch
---

Fix GraphQL codegen duplicate schema types by splitting `schema-types` and operation outputs. Compile the API for production Docker images (replace `tsx` runtime), align REST routes and web hooks with generated types, and fix demo storage volume permissions via entrypoint.
