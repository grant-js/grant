# Story brief

## Metadata

- **Slug**: google-oauth
- **Date**: 2026-09-12
- **Author**: PM agent
- **Status**: in-progress

## Objective

Organizations can sign in with Google the same way they sign in with GitHub: platform login/register, settings connect, CLI callback, and Project App OAuth. Unconfigured providers are hidden. A verified email that already exists links to that user instead of creating a second account.

## Acceptance criteria

- [ ] Google OAuth authorization-code flow works for login, register, connect, CLI callback, and Project App OAuth when `GOOGLE_CLIENT_ID`, secret, and callback URL are configured.
- [ ] GitHub and Google share the same configure → initiate → callback → login/link/register pattern (`GET /api/auth/:provider`, `GET /api/auth/:provider/callback`, `GET /api/auth/providers`).
- [ ] Login, register, settings connect, and Project App entry hide providers that are not fully configured.
- [ ] Signing in with Google or GitHub using a verified email that matches an existing verified email or OAuth method links to that user.
- [ ] An unverified email method with the same address does not auto-link and does not create a second user; callback fails with `emailUnverified`.
- [ ] Operator docs cover Google Cloud Console OAuth client setup (exact redirect URIs).
- [ ] Config app exposes Google OAuth vars and a credential smoke test.

## Non-goals

- Microsoft, Apple, or other additional IdPs
- Passport / OIDC libraries
- Changing GitHub’s single-callback prefix trick
- GraphQL mutations to start OAuth
- Live Google e2e against a real Google Cloud project

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [x] Auth / sessions / MFA / AAL
- [ ] API keys / tokens
- [ ] Tenancy / RLS / org scoping
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [ ] None of the above

## Suggested active roles

Project Manager, Principal Engineer, Architect, Senior Backend, Senior Frontend, Senior QA, Senior Security, Verifier.

## Human gate

- [x] Gate 1: Story brief approved — stop here until a human confirms before stack planning.
