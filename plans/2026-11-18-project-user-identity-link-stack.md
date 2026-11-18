# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Story brief: [2026-11-18-project-user-identity-link-brief.md](./2026-11-18-project-user-identity-link-brief.md). Draft, presented with the brief; Gate 2 is not passed until Alejandro approves both.

Grounded on `main` `94faabf6` (v1.29.1). Open-source language only — do not name customer tenants.

## Metadata

- **Slug**: `project-user-identity-link`
- **Story brief**: `plans/2026-11-18-project-user-identity-link-brief.md`
- **Status**: draft
- **Story trunk**: `feat/project-user-identity-link` from `main`
- **worktree_path**: one worktree for the story; never two writers in it

**Slug justification:** names the operator outcome (link a project user to the identity that holds the address), not a tactic (`user-merge`, `reassign-pivots`).

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

Init `gh stack` with **slice 1 only**; `gh stack add` each next branch when it starts.

| #     | Branch                                      | Base                              | Concern                                                     | Owner role | Review bar           | PR  |
| ----- | ------------------------------------------- | --------------------------------- | ----------------------------------------------------------- | ---------- | -------------------- | --- |
| 1     | `feat/project-user-identity-link-constants` | `feat/project-user-identity-link` | `LinkIdentity` action, seed mappings, RBAC docs             | Backend    | security-full        |     |
| 2     | `feat/project-user-identity-link-schema`    | prior slice                       | GraphQL input/mutation, event type, codegen                 | Backend    | security-full        |     |
| 3     | `feat/project-user-identity-link-service`   | prior slice                       | Link service + repository moves, port, Postgres integration | Backend    | security-full        |     |
| 4     | `feat/project-user-identity-link-api`       | prior slice                       | Handler, GraphQL resolver, REST + OpenAPI, rate limit, e2e  | Backend    | security-full        |     |
| 5     | `feat/project-user-identity-link-web`       | prior slice                       | Set-email dialog link step, clearer conflict message, i18n  | Frontend   | light                |     |
| final | `feat/project-user-identity-link`           | `main`                            | integration                                                 | Principal  | deep + security-full |     |

No db slice (no migration, see brief). **Collapse rules:** do not fold 3 into 4 (the moves and the CDM re-import proof are the risky part and must be reviewable apart from transport); do not fold 1 into 2 (the RBAC grant is its own review); do not add a separate tests/docs PR — tests and docs ship with the slice that introduces the behaviour.

## Stack setup

```sh
# Trunk — only after Alejandro Gates 1–2
git switch -c feat/project-user-identity-link main && git push -u origin feat/project-user-identity-link

gh stack init --base feat/project-user-identity-link feat/project-user-identity-link-constants

# After each slice: commit, then BOTH, every time.
gh stack submit --auto
gh stack link --base feat/project-user-identity-link <pr> <pr>   # bottom to top

# Before the NEXT slice:
gh stack add feat/project-user-identity-link-schema
gh stack add feat/project-user-identity-link-service
gh stack add feat/project-user-identity-link-api
gh stack add feat/project-user-identity-link-web

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions before writing a slice: `git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads`. Hooks are not wired in this repository: commit with `git -c core.hooksPath=.husky commit …`, and run `sh .husky/pre-push` and `pnpm release:check` by hand before each push. `gh stack submit --auto` opens drafts; `gh pr ready <pr>` for gate 3. Agents never merge.

## Named contracts (do not rename in a slice)

| Kind       | Name                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Permission | `ResourceAction.LinkIdentity` on `ResourceSlug.ProjectUser`                                      |
| Mutation   | `linkProjectUserIdentity(input: LinkProjectUserIdentityInput!): User!`                           |
| REST       | `POST /api/users/:id/link-identity` (`scope`, `email`)                                           |
| Event      | `project.user_identity_linked` (`webhookOnly` membership; `{ projectId, fromUserId, toUserId }`) |
| Audit      | `metadata.operation: 'link-identity'`                                                            |

## Slice notes

### 1 — Constants / permission seed (security-full)

- Files: `packages/@grantjs/constants/src/permissions/resources.ts` (`ResourceAction.LinkIdentity`; add to `ProjectUser.actions`), `groups.ts` (`ProjectUserOwner` / `ProjectUserAdmin` += `LinkIdentity`), `permissions.ts`, `docs/architecture/rbac.md`, `docs/core-concepts/resources.md`. Seed characterization (`seed-permissions.test.ts`) stays green from constants. Patch changeset `@grantjs/constants`.
- Pattern: exactly how `SetEmail` was added (`plans/2026-10-28-operator-set-email-stack.md` slice 1). Existing deployments get it through `seedAll` (ADR 0001).

### 2 — Schema / codegen (security-full)

- Files: `packages/@grantjs/schema/src/schema/users/` (mutation + `LinkProjectUserIdentityInput`), operation document for web, `packages/@grantjs/schema/src/events/event-catalog.ts` (`project.user_identity_linked` → `webhookOnly('membership')`), `pnpm --filter @grantjs/schema generate`. Lockstep: `apps/api/src/lib/notifications/notification-email-families.ts` and the `webhookOnly` list in `apps/api/tests/unit/lib/events/event-catalog-coverage.test.ts`. Minor changeset `@grantjs/schema`.
- Descriptions: OrganizationProject only; moves this project's membership only; the event carries ids only.

### 3 — Link service + repository moves (security-full)

- Files: new `ProjectUserIdentityLinkService` (or a `linkIdentity` method on `ProjectUserService`; pick the one that keeps the file under the repo's size norms) with zod schemas; repository methods that re-point `user_id` for one project on `project_users`, `project_user_groups`, `project_user_permissions`, `project_user_api_keys`, `project_user_credentials`, and on `user_roles` / `user_groups` / `user_permissions` / `user_tags` filtered to targets owned by the project; revoke X's `project_oauth_grants` and delete password resets and lockouts for the project; strip X's global `cdmImport` marker when it names the project; soft-delete X when no live membership remains. Port in `packages/@grantjs/core/src/ports/services/`. `createServices` wiring. Patch `grant-api`, `@grantjs/core`.
- Preconditions exactly as the brief, in the service, before any write: membership of X, live holder Y ≠ X, Y in the project's organization, Y not a member, X an identity shell (no auth method, no platform credential, no active MFA, no live session).
- Events: publish only `project.user_identity_linked`. The moves call repositories directly (or run inside `event-suppression.lib` for any reused service write path) so that no `project.user_removed`, `project.user_added`, `user.deleted` or pivot event escapes. A test asserts the outbox holds exactly one event for the link.
- Unique-index traps to handle in code: `project_users_project_id_user_id_unique`, `project_user_credentials_project_id_user_id_unique`, `project_user_api_keys_api_key_project_user_unique`, `user_roles_user_id_role_id_unique` and siblings — a soft-deleted row of Y never blocks (partial indexes); when Y already has a live row on the same target as X (a stale pivot from an earlier membership), keep Y's and soft-delete X's.
- Tests (Postgres integration; QA shapes them):
  - happy path: every pivot moved, X retired, Y untouched outside the project, one audit row, one event with ids only (sentinel address absent from event, webhook payload and logs);
  - each precondition refuses and writes nothing (outbox and audit empty);
  - X with a membership in another project: only this project moves, X stays live, global marker stripped only if it names this project;
  - **CDM next import**: `findBy: key` with X's key → `reuse-keyed` to Y, no membership for X, no user created; `findBy: email` → Y, marker rewritten to the address; `replace` removes nothing; no row in `cdm_import_tombstones`;
  - permission cache: Y's project permissions resolve to X's former roles right after the link.

### 4 — API transport (security-full)

- Files: `apps/api/src/handlers/users.handler.ts` (`linkProjectUserIdentity`, scope check, post-commit notice to Y if Gate 1 says yes), `apps/api/src/graphql/resolvers/users/mutations/` + `mutations.ts` (`requireEmailThenMfaGraphQL`, `ProjectUser` + `LinkIdentity`), `apps/api/src/rest/routes/users.routes.ts` / `schemas` / `openapi` (`POST /api/users/:id/link-identity`), `apps/api/src/lib/graphql-auth-rate-limit.lib.ts` and `middleware/rate-limit.middleware.ts` (count in the set-email bucket), docs `events-webhooks-notifications.md`, `cdm-import-export.md`, `security.md` (rate-limit table). Patch `grant-api`.
- e2e (`pnpm test:e2e`): Owner/Admin allowed; Dev/Viewer denied; Dev allowed once granted; non-member target 404; out-of-organization holder gives the same conflict as set-email; REST and GraphQL parity; the 21st attempt in the window is 429.

### 5 — Web (light)

- Files: `apps/web/hooks/users/use-user-mutations.ts` (`linkProjectUserIdentity`), `apps/web/components/features/users/user-set-email-dialog.tsx` (on `CONFLICT`, a confirm step gated by `useGrant(ProjectUser, LinkIdentity)`; otherwise a clearer message), i18n `en` + `de` (`users` namespace and the permission picker label). Hooks only; components never call Apollo directly.
- Check in the running app (`run` skill): conflict → link → the project list shows one row, with the address, roles and display name of the former row.

## Dependencies / notes

- **Legacy mirror (importer repository), separate PR after slice 4 merges to the trunk:** treat `project.user_identity_linked` as re-pairing `fromUserId` → `toUserId`; never offboard. Before it ships, a link is still safe (no removal event; the next state read pairs Y through the moved marker), but the mirror's baseline will show the Grant id change as a diff to verify on a dev project first.
- **Rollout:** link on a dev project first; confirm the next forward import and mirror run are no-ops for the linked person.
- **Follow-up stories (not here):** a read-only finder for duplicate identities per organization; importer prevention for invalid or shared source addresses.

## Human gates

- [ ] Gate 2: Stack plan approved — no implementation until a human confirms.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
