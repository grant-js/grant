# Stack plan: closed-install

- **Slug**: `closed-install`
- **Story brief**: [2026-10-07-closed-install-brief.md](./2026-10-07-closed-install-brief.md)
- **Status**: approved (Gate 2 — 2026-10-07 Alejandro) / in-progress
- **Story trunk**: `feat/closed-install`
- **Review bar**: security-full on API + web-inject slices

No database migration. Env + schema/API + web + tests.

## Active roles

- Project Manager, Principal Engineer, Senior Backend, Senior Frontend, Senior QA, Senior Security, Verifier

## Ordered slices (PRs into `feat/closed-install`)

| # | Branch | Concern | Review bar |
| - | ------ | ------- | ---------- |
| 1 | `feat/closed-install-env` | Env: `AUTH_PUBLIC_SIGNUP_ENABLED`; document origin-verify for Docker/K8s/AWS; Config app; note `SECURITY_API_KEY` unused | light |
| 2 | `feat/closed-install-schema` | Public auth policy on providers/app-info (or dedicated query): `publicSignupEnabled`, `bootstrapOpen` | light |
| 3 | `feat/closed-install-api` | Enforce signup policy + first-user exception + last-human delete; origin-verify tests for required/missing header | security-full |
| 4 | `feat/closed-install-web` | Next middleware injects `x-origin-verify` from server env on proxied paths; hide `/auth/register` unless bootstrap or invitation | security-full |
| 5 | `feat/closed-install-docs` | Docker Compose / K8s Ingress examples; AWS already-correct origin custom headers; CLI must use web origin or send the header | light |
| 6 | `feat/closed-install-tests` | Unit + e2e: 403 without header, first register, second blocked, invite allowed, project allowSignUp, last-user delete | light |
| final | `feat/closed-install` → `main` | Integration | deep + security-full |

## Slice notes

### 1 — env

- Add `AUTH_PUBLIC_SIGNUP_ENABLED` (default `true`) in [`packages/@grantjs/env/src/schema.ts`](../packages/@grantjs/env/src/schema.ts) and [`apps/api/src/config/env.config.ts`](../apps/api/src/config/env.config.ts).
- Do **not** add a second secret. Origin gate stays `ORIGIN_VERIFY_SECRET` + `SECURITY_ORIGIN_VERIFY_HEADER` + `SECURITY_ORIGIN_VERIFY_REQUIRED`.
- Web needs the secret at **server** runtime for middleware (`ORIGIN_VERIFY_SECRET`, never `NEXT_PUBLIC_`).

### 3 — api

- Shared helper: `humanUserCount` excluding system user id.
- `AuthHandler.register` and platform OAuth **create-user** paths check policy; invitation-proof register stays allowed.
- `ProjectOAuthHandler` continues to honor `app.allowSignUp`.
- `UserService.deleteUser` / privacy delete: refuse when the target is the last human user.
- Stable domain error (e.g. `ForbiddenError` / existing `AuthorizationError`) + i18n key — no raw `Error`.

### 4 — web

- Next.js middleware on Node: if `ORIGIN_VERIFY_SECRET` is set, clone the request for `/api`, `/graphql`, `/health`, `/storage`, `/.well-known` and set the header. If unset, no-op (local default).
- `next.config.ts` rewrites stay; they cannot add headers.
- Login page: register link only if `bootstrapOpen` or invitation query present.

### 5 — docs (must spell out the three fronts)

| Target | Who attaches `x-origin-verify` | API reachability |
| ------ | ------------------------------ | ---------------- |
| AWS CloudFront | Origin **custom header** on API origin (already in CDK). Not a CloudFront Function. | Function URL is public; middleware is the guard |
| Docker | Next server middleware | Do not publish API port |
| K8s | Next middleware **or** Ingress `proxy_set_header` | API ClusterIP (or Ingress-only with header) |

## Human gates

- [x] Gate 2: Stack plan approved — 2026-10-07 Alejandro
- [ ] Gate 3: Stack PRs into trunk
- [ ] Gate 4: Story → main (human merge)

## Out of this stack

Ownership transfer via invitation — new brief after this ships.
