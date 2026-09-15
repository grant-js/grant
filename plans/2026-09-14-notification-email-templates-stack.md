# Stack plan

## Metadata

- **Slug**: notification-email-templates
- **Story brief**: `plans/2026-09-14-notification-email-templates-brief.md`
- **Status**: in-progress
- **Story trunk**: `feat/notification-email-templates`
- **worktree_path**: current worktree

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [x] Senior Backend
- [ ] Senior Frontend
- [x] Senior QA
- [ ] Senior Security
- [x] Verifier

## Ordered slices (PRs)

| #     | Branch                                      | Base                                | Concern                                                                | Owner role | Review bar | PR  |
| ----- | ------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------- | ---------- | ---------- | --- |
| 1     | `feat/notification-email-templates-context` | `feat/notification-email-templates` | Display context names, recipient-aware renderer, skip invitation email | Backend    | light      |     |
| 2     | `feat/notification-email-templates-api`     | slice 1                             | i18n, MJML template, composer, href helper, delivery HTML, tests, docs | Backend    | light      |     |
| final | `feat/notification-email-templates`         | `main`                              | integration                                                            | Principal  | deep       |     |

No db, schema, or web slices.

## Stack setup

Root the stack on the story trunk — never the default branch.

```sh
git switch -c feat/notification-email-templates main && git push -u origin feat/notification-email-templates
gh stack init --base feat/notification-email-templates feat/notification-email-templates-context
```

## Dependencies / notes

- `SendNotificationEmailParams.html` already exists; do not change `@grantjs/email` `EmailTemplates`.
- Compose HTML at delivery from `event_log` + display context so template fixes apply on retry.
- In-app title/body stay the English read model.

## Human gates

- [x] Gate 2: Stack plan approved — no implementation until a human confirms.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
