# Stack plan

## Metadata

- **Slug**: `project-branding`
- **Story brief**: `plans/2026-09-13-project-branding-brief.md`
- **Status**: in-progress
- **Story trunk**: `feat/project-branding`
- **worktree_path**: `/home/logus/.cursor/worktrees/grant-platform/tinb`

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

| #     | Branch                         | Base                    | Concern        | Owner role | Review bar    | PR  |
| ----- | ------------------------------ | ----------------------- | -------------- | ---------- | ------------- | --- |
| 1     | `feat/project-branding-db`     | `feat/project-branding` | database       | Backend    | light         |     |
| 2     | `feat/project-branding-schema` | prior slice             | schema/codegen | Backend    | light         |     |
| 3     | `feat/project-branding-api`    | prior slice             | API            | Backend    | security-full |     |
| 4     | `feat/project-branding-web`    | prior slice             | web/i18n       | Frontend   | light         |     |
| final | `feat/project-branding`        | `main`                  | integration    | Principal  | deep          |     |

Tests live in the API and web slices (no separate tests PR).

## Stack setup

Root the stack on the story trunk — never the default branch.

## Dependencies / notes

- Mirror organization picture upload (mint / confirm / base64) plus a clear/remove action.
- Do not add `pictureUrl` to `UpdateProjectInput` / `UpdateProjectAppInput`.
- Theme fields (`primaryColor`, `showHelpPanel`) belong on those Update inputs (null = reset).
- Authorize picture and theme writes with `Update`, not `UploadPicture`.
- Public OAuth app-info / consent-info return **resolved** branding only.

## Human gates

- [x] Gate 2: Stack plan approved — implement-the-plan 2026-09-13.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
