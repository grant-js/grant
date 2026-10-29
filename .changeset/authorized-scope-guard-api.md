---
'grant-api': patch
---

Scoped operations now require the scope in the request input to match the scope the request was authorized in; `system` is no longer accepted as a request-supplied tenant.

A session request is authorized in the scope it carries (the `X-Scope-Tenant` and `X-Scope-Id` headers, else the scope in the query or body); an API key or project-app request is authorized in the scope of its token, so an input that names another scope than the key's is refused. When an operation names a scope in its input (`scope`, `input.scope`, or `scopeId` with `tenant` in a REST query), `tenant` and `id` must equal the authorized scope: otherwise GraphQL answers `Forbidden` and REST answers `403` with code `FORBIDDEN`, before any lookup or permission check. Operations that name no scope are unaffected. A scoped operation that is not mounted behind the authorization guard now fails the API's unit tests.
