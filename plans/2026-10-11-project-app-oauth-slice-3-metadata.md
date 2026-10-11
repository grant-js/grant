# Slice brief

## Metadata

- **Story slug**: `project-app-oauth`
- **Slice branch**: `feat/project-app-oauth-metadata`
- **Base branch**: `feat/project-app-oauth-api`
- **Owner role**: Backend
- **Review bar**: security-full

## In scope

- RFC 8414: `GET /.well-known/oauth-authorization-server/{org|acc}/…/prj/{id}` (well-known **before** issuer path)
- Twin `GET {iss}/.well-known/openid-configuration` returning the **same JSON**
- Shared `authorization_endpoint` / `token_endpoint`; per-project `issuer` + `jwks_uri`
- Document that Grant is not an OpenID Provider (no `userinfo`, no `id_token_*`)
- OpenAPI + unit tests

## Out of scope

- Hosted UI (slice 4), docs/changeset (slice 5)
- Becoming an OP
