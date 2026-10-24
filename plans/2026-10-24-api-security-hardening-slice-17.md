# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-docs`
- **Base branch**: `feat/api-security-hardening-jwks-cache` (slice 16)
- **Owner role**: Backend
- **Review bar**: light
- **worktree_path**: current checkout

## In scope

- Security docs: revoked API keys and project-app grants leave access JWTs valid until `exp`. `Grant.getAuth` verifies signature, `type`, and claims; no `jti` denylist
- Production: set `SECURITY_TRUSTED_CLIENT_IP_HEADER` to an edge-overwritten value; do not trust leftmost XFF
- Config notes for the trusted header; pointer from self-hosting and AWS serverless
- Slice brief; patch changeset for `grant-docs`

## Out of scope

- Runtime `jti` denylist or introspection
- Changing `getClientIpFromHeaders` / XFF parser
- Gate 4 / story trunk → `main`
- Web files / UX
- OpenAPI

## Reference patterns

- `docs/architecture/security.md` JWT and rate-limit sections
- `docs/core-concepts/api-keys.md` exchange-time revoke
- `docs/deployment/aws-serverless.md` CloudFront overwrite vs XFF append
- Audit L3 / L4 in the 2026-10-24 API security and performance audit

## Done when

- [x] Implementation complete within this slice only
- [x] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable) — format PASS; type-check / lint / tests / OpenAPI SKIP (docs only)
- [x] PR opened with correct base; links stack plan + upstream/downstream PRs ([#587](https://github.com/grant-js/grant/pull/587), base slice 16 / #586)
- [x] Senior Security notified if `security-full` (not required — review bar is light)
