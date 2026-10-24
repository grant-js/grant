# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-jwks-cache`
- **Base branch**: `feat/api-security-hardening-refresh-reuse` (slice 15)
- **Owner role**: Backend
- **Review bar**: light
- **worktree_path**: current checkout

## In scope

- Short-TTL cache of `getPublicKeysForJwks` payload per issuer (`JWT_JWKS_HTTP_CACHE_TTL_SECONDS`, default 30)
- In-process `kid` verification cache unchanged
- HTTP `Cache-Control` unchanged
- Tests, slice brief, patch changeset for `grant-api`

## Out of scope

- Slice 17
- Invalidating JWKS HTTP cache on rotation (TTL only, like kid cache)
- Changing JWKS document shape or routes
- Web files / UX

## Reference patterns

- `GrantService.getVerificationKey` / `VERIFICATION_KEY_CACHE_PREFIX`
- `docs/architecture/security.md` JWKS verification section

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs ([#586](https://github.com/grant-js/grant/pull/586), base slice 15 / #585)
- [x] Senior Security notified if `security-full` (not required — review bar is light)
