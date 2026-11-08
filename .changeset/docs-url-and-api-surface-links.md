---
'grant-api': minor
'grant-web': minor
---

The web header no longer links to surfaces a deployment has turned off: the API reference link shows only while `SWAGGER_ENABLED` is on, and the GraphQL link only while the Apollo Sandbox (`APOLLO_PLAYGROUND`) is on. `GET /api/config` now reports both as `apiReferenceEnabled` and `graphqlPlaygroundEnabled`, plus `docsUrl`. When `DOCS_URL` is set, every docs link in the web app (header and in-page help) points at that site, so an install can link to the public docs at `https://demo.grantjs.org/docs/` instead of hosting `/docs` itself; a trailing slash is fine. `DOCS_URL` no longer defaults to `http://localhost:5173`: left unset, the web app keeps linking to its own `/docs`.
