# Stack plan

## Metadata

- **Slug**: google-oauth
- **Story brief**: `plans/2026-09-12-google-oauth-brief.md`
- **Status**: in-progress
- **Story trunk**: `feat/google-oauth`
- **worktree_path**: current worktree

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [x] Architect
- [x] Senior Backend
- [x] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

## Ordered slices (PRs)

| #     | Branch                  | Base                | Concern                                    | Owner role | Review bar           | PR  |
| ----- | ----------------------- | ------------------- | ------------------------------------------ | ---------- | -------------------- | --- |
| 1     | `feat/google-oauth-api` | `feat/google-oauth` | env, core port, Google + generic OAuth API | Backend    | security-full        |     |
| 2     | `feat/google-oauth-web` | slice 1             | web/i18n, hide unconfigured                | Frontend   | light                |     |
| final | `feat/google-oauth`     | `main`              | integration                                | Principal  | deep + security-full |     |

No db or schema slices: `google` is already on `UserAuthenticationMethodProvider`.

## Stack setup

Root the stack on the story trunk — never the default branch.

```sh
git switch -c feat/google-oauth main && git push -u origin feat/google-oauth
gh stack init --base feat/google-oauth feat/google-oauth-api
```

## Dependencies / notes

- Secret resolution for `GOOGLE_CLIENT_SECRET` follows ADR 0004 (`ISecretResolver`), same as GitHub.
- Account linking is verified-email only on OAuth auto-link paths; magic-link email lookup is unchanged.
- Google Console requires exact redirect URIs (unlike GitHub prefix match).

## Human gates

- [x] Gate 2: Stack plan approved — no implementation until a human confirms.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
