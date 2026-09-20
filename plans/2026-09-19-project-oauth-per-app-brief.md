# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Implementation-ready design (Grant Project store, not copied into this repo): `docs/project-oauth-per-app.md`. In-repo domain docs: `docs/core-concepts/project-oauth.md`. Stack: [2026-09-19-project-oauth-per-app-stack.md](./2026-09-19-project-oauth-per-app-stack.md).

## Metadata

- **Slug**: `project-oauth-per-app`
- **Date**: 2026-09-19
- **Author** (human / PM agent): PM agent; Gate 1 approved by Alejandro
- **Status**: approved — Gate 1 passed 2026-09-20 by Alejandro

## Objective

Project apps stop sharing one platform Google/GitHub OAuth client. Each Grant project can register its own social apps (Auth0-style connections) while Grant remains the IdP the tenant product talks to. Platform Grant sign-in/up stays on env-var credentials.

## Acceptance criteria

Trace IDs (R1–R12) match the approved design §4 (Grant Project store `docs/project-oauth-per-app.md`) and in-repo `docs/core-concepts/project-oauth.md`.

- [ ] **R1.** Grant account login, register, Settings connect, and CLI OAuth still use `GITHUB_*` / `GOOGLE_*` from env / `ISecretResolver`. Project connection rows are not consulted on `GET /api/auth/{github|google}`.
- [ ] **R2–R6.** A project owner can upsert GitHub and/or Google client id + secret on the **project**. Hosted project sign-in (`/auth/project` → `GET /api/auth/project/authorize`) uses those credentials when present. The tenant SPA still uses ProjectApp `client_id` and `redirectUris` only (`apps/api/src/handlers/project-oauth.handler.ts` allowlist). Customer origins are never registered on Google/GitHub.
- [ ] **R7.** Connection secrets are write-only, encrypted at rest, omitted from GraphQL/REST reads, logs, audit payloads, CDM, and GDPR export. Missing encryption key fails closed on persist.
- [ ] **R8.** Hosted sign-in does **not** call `GET /api/auth/providers`. Buttons follow `enabledProviders` ∩ project `configuredProviders` (including fallback policy).
- [ ] **R9.** Email magic-link, consent, branding, membership/`allowSignUp`, and project-app JWT claims stay behavior-compatible except social credential resolution.
- [ ] **R10.** `resolveUserIdFromOAuthForProject` global linking unchanged (`apps/api/src/handlers/auth.handler.ts`).
- [ ] **R12.** In-repo docs split platform vs project social setup and retract “one OAuth app serves all project-apps” as the SaaS model (`docs/architecture/security.md`, `docs/core-concepts/sign-in-providers.md`, `docs/core-concepts/project-oauth.md`).
- [ ] Fallback: with no BYO row and `PROJECT_OAUTH_REQUIRE_BYO_SOCIAL` unset/false, project social still uses platform env (migration). With the flag true, missing BYO hides/fails that provider.
- [ ] Tests listed in the design §10 exist (unit handler credential source, app-info configured providers, e2e non-regression on email consent). E2E run via repo `pnpm test:e2e` wrappers.

## Non-goals

- Microsoft, Apple, SAML, generic OIDC enterprise
- Per-ProjectApp social credential override; org-inherited connections
- Changing global users into per-project identities
- Putting tenant SPA URLs on Google/GitHub Authorized redirect lists
- Tenant-configurable GitHub/Google authorization/token URLs
- Passport or new OAuth libraries
- Config app as the store for per-project secrets

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [x] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [x] GDPR export / deletion / PII
- [ ] None of the above

**Why each is checked**

- **Auth / sessions / MFA / AAL:** project hosted OAuth and callback/token exchange. MFA guards on project-app tokens stay “skip interactive MFA” (`docs/architecture/security.md`); do not weaken that accidentally.
- **API keys / tokens:** ProjectApp JWTs (`type: projectApp`) still issued after consent; wrong OAuth client must not mint tokens. Pattern kinship with API key secrets (`docs/core-concepts/api-keys.md`).
- **Tenancy / RLS / org scoping:** connection rows are project-scoped; authorize must not read another project’s ciphertext. `project_apps` isolation model (`docs/architecture/multi-tenancy.md`).
- **Permissions / RBAC:** who may set provider secrets (`Project` Update vs a new resource). `ProjectApp` Update must not be enough to steal another project’s Google app.
- **GDPR / PII:** user auth methods remain in export; **connection secrets must stay excluded** (`docs/advanced-topics/privacy-settings.md`).

## Suggested active roles

Default for a full vertical: PM, Principal, Backend, Frontend, QA, Verifier. Add Architect / Security when needed.

Project Manager, Principal Engineer, Architect (new entity + ADR), Senior Backend, Senior Frontend, Senior QA, Senior Security, Verifier.

## Remaining product choices (Gate 1)

Defaults if Alejandro does not override: see design §5.2–5.3.

1. Platform fallback vs require-BYO on day one (`PROJECT_OAUTH_REQUIRE_BYO_SOCIAL`).
2. Connection grain: project (default) vs ProjectApp.
3. Dedicated encryption key vs reuse `AUTH_MFA_SECRET_ENCRYPTION_KEY`.
4. Shared Grant broker callback vs per-project callback path.
5. `Project` Update vs new RBAC resource for connections.

## Human gate

- [x] Gate 1: Story brief approved — 2026-09-20 by Alejandro.

**Gate 1 passed.** Gate 2 (stack plan) also passed 2026-09-20 by Alejandro. Product defaults in § Remaining product choices / design §5.2–5.3 stand (no overrides).
