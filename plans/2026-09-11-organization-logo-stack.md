# Stack plan

## Metadata

- **Slug**: `organization-logo`
- **Story brief**: `plans/2026-09-11-organization-logo-brief.md`
- **Status**: in-progress
- **Story trunk**: `feat/organization-logo`
- **worktree_path**: `/home/logus/.cursor/worktrees/grant-platform/nc6p`

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [x] Senior Backend
- [x] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

## Ordered slices (PRs)

| #     | Branch                          | Base                     | Concern        | Owner role | Review bar    | PR  |
| ----- | ------------------------------- | ------------------------ | -------------- | ---------- | ------------- | --- |
| 1     | `feat/organization-logo-db`     | `feat/organization-logo` | database       | Backend    | light         |     |
| 2     | `feat/organization-logo-schema` | prior slice              | schema/codegen | Backend    | light         |     |
| 3     | `feat/organization-logo-api`    | prior slice              | API            | Backend    | security-full |     |
| 4     | `feat/organization-logo-web`    | prior slice              | web/i18n       | Frontend   | light         |     |
| final | `feat/organization-logo`        | `main`                   | integration    | Principal  | deep          |     |

## Stack setup

Root the stack on the story trunk — never the default branch.

## Dependencies / notes

- Mirror user `pictureUrl` + `uploadUserPicture` / `uploadMyUserPicture`.
- Do not add `pictureUrl` to `UpdateOrganizationInput`; upload is the only write path.
- Existing deployments need `db:seed` so `Organization:UploadPicture` is inserted.
- Tests live in the API slice (handler + service); no separate tests PR.

## Human gates

- [x] Gate 2: Stack plan approved — plan approved 2026-09-11.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
