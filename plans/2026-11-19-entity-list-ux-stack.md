# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Story brief: [2026-11-19-entity-list-ux-brief.md](./2026-11-19-entity-list-ux-brief.md). Gates 1–2 approved by Alejandro 2026-11-19.

Grounded on `main` `a8d7ed3b` (v1.30.0).

## Metadata

- **Slug**: `entity-list-ux`
- **Story brief**: `plans/2026-11-19-entity-list-ux-brief.md`
- **Status**: approved
- **Story trunk**: `feat/entity-list-ux` from `main`
- **worktree_path**: this session's worktree; one writer

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [x] Senior Backend
- [x] Senior Frontend
- [x] Senior QA
- [ ] Senior Security
- [x] Verifier

## Ordered slices (PRs)

Init `gh stack` with slice 1 only; `gh stack add` each next branch when it starts.

| #     | Branch                                 | Base                  | Concern                                                    | Owner role | Review bar | PR  |
| ----- | -------------------------------------- | --------------------- | ---------------------------------------------------------- | ---------- | ---------- | --- |
| 1     | `feat/entity-list-ux-link-offer`       | `feat/entity-list-ux` | A: link offer only for users with no sign-in; API message  | Frontend   | light      |     |
| 2     | `feat/entity-list-ux-actions-menu`     | prior slice           | B: `Actions` loading row, empty state; 13 menus            | Frontend   | light      |     |
| 3     | `feat/entity-list-ux-user-email`       | prior slice           | C: email subtitle on user cards, Email table column        | Frontend   | light      |     |
| 4     | `feat/entity-list-ux-card-fields`      | prior slice           | D: card body field preferences (infra + users cards)       | Frontend   | light      |     |
| 5     | `feat/entity-list-ux-card-fields-all`  | prior slice           | D: the other 13 card grids adopt it                        | Frontend   | light      |     |
| 6     | `feat/entity-list-ux-relation-preview` | prior slice           | E: hover/focus previews on relationship count chips, links | Frontend   | light      |     |
| 7     | `feat/entity-list-ux-breadcrumbs`      | prior slice           | F: breadcrumbs on every route, route-tree test             | Frontend   | light      |     |
| final | `feat/entity-list-ux`                  | `main`                | integration                                                | Principal  | deep       |     |

Order: A first (smallest, closes the v1.30.0 gap); B before C–E because every card header renders a menu; D's infra before its rollout; E last (largest, independent of D). **Collapse rules:** do not fold 4 into 5 (infra reviewable apart from 13 mechanical adoptions); do not fold E into D.

## Slice notes

### 1 — Link offer (A)

- `apps/web/components/features/users/user-set-email-dialog.tsx`: offer only when `userToSetEmail.authenticationMethods` is empty (the store holds the list row, which carries them); otherwise the hook's conflict toast with a second line (`notifications.setEmailConflictHasSignIn`). `apps/api/src/services/project-user-identity-link.service.ts`: refusal message. i18n en + de. Tests: dialog test (no offer when the user has a method), service unit test message. Changesets: patch `grant-web`, patch `grant-api`.

### 2 — Actions menu (B)

- `apps/web/components/common/actions.tsx`: trigger always enabled; `isLoading` renders a loading row inside the open menu; empty `actions` after loading renders a disabled "No actions available" row (`common.actions.noneAvailable`). The 13 `*-actions.tsx`: remove the `permissionsResolved && … return null` branches; keep `enabled: hasBeenOpened` grants. Tests: `actions.test.tsx` (closed → enabled trigger; open + loading → loading row; resolved empty → empty row; resolved → items), the webhook regression test extended.

### 3 — User email (C)

- `user-cards.tsx`: `description` = the Email method's `providerId`. `user-table.tsx`: `email` column after `name`, in the column toggle. Tests: cards render the subtitle only with an Email method; table column present and togglable.

### 4 — Card field preferences, infra (D)

- `CardBody` items gain `key`; a `useCardFieldState(listId, items)` hook mirroring the table column state (visibility + order, `localStorage`, reset); the toolbar column-toggle button publishes card fields when the view is `cards` (reuse `data-table-columns.store.ts`, or a sibling store if mixing is unclear). Users cards adopt it. Tests: hook (persist, reset, unknown keys from storage ignored, new fields appended), toolbar in card mode.

### 5 — Card field preferences, rollout (D)

- The other 13 `*-cards.tsx` give their body items keys and use the hook. One commit per module is fine inside the slice. Tests: one smoke test per grid that fields can be hidden.

### 6 — Relationship previews (E)

- `@grantjs/schema` operation documents, one per relationship (users: roles, groups, permissions, tags; roles: groups, permissions, tags; groups: permissions, tags; permissions: tags), each the existing list query with `ids: [id]`, `limit: 1` and the relationship's `id name` only. Hooks in `apps/web/hooks/` (`useLazyQuery`), one `RelationshipCountChip` component in `components/common` (HoverCard/Popover, 300 ms open delay, focus and tap, loading row, "Not available" on error, up to 10 links via `getEntityDetailUrl`, "View all"). Replace the count badges at the 21 sites. Tests: chip (no fetch before hover, fetch once, links, overflow, error). Changeset: patch `@grantjs/schema` (documents only).

### 7 — Breadcrumbs (F)

- Added 2026-11-19 at Alejandro's request, after Gate 2; independent of slices 1–6, placed last so earlier branches do not move. `components/common/breadcrumb.tsx`: an `apiKeyId` rule (label from the API key store's current key: name, else client id, else the id), a `test` segment label, `branding` / `oauth-connections` / `project-apps` labels, and an account crumb for `/dashboard/accounts/[accountId]`. Prefer turning the per-id branches into one table (param, list segment, store selector, label) over adding more copies. Test: enumerate the route tree, render the generator with stub params for each path, assert every segment after `dashboard` yields a crumb with a label that is not a raw id once the entity is in its store.

## Stack setup

As the template: trunk `feat/entity-list-ux` from `main`, `gh stack init --base feat/entity-list-ux feat/entity-list-ux-link-offer`, `gh stack submit --auto` + `gh stack link --base feat/entity-list-ux …` after each slice, `gh stack add` before the next. Commit with `git -c core.hooksPath=.husky commit`, run `sh .husky/pre-push` and `pnpm release:check` before each push. Agents never merge.

## Human gates

- [x] Gate 2: Stack plan approved — Alejandro 2026-11-19.
- [ ] Gate 3: Stack PRs merged into trunk.
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
