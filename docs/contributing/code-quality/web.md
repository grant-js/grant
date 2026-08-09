# Code quality: `apps/web`

**Pass 2** · 2026-08-08 · commit `4f8d6735` · 831 files, ~67,159 lines

Method and lens definitions: [Code quality passes](./README.md). Findings below were gathered by three agents in parallel (Architect: lenses 1, 6; Senior Frontend: lenses 3, 4, 5; Senior QA: lens 7) plus a direct mechanical pass for lens 2 — legitimate fan-out per [`agentic-sdlc.md` § Fan-out](../agentic-sdlc.md#fan-out-parallelism), since none of this reads-and-reports work writes to the same file concurrently.

Two inherited items from pass 1 applied here: `apps/web` has no `src/` (top-level `app/`, `components/`, `hooks/`, `lib/`, `stores/`, `types/`, `i18n/`, `tests/` — a Next.js App Router layout, not `apps/api`'s hexagonal `src/` tree), and the guardrails (`eslint.config.mjs`'s 11 rule blocks, `dead-code:api`'s `knip` invocation) are still scoped to `apps/api/**` only — widening them is this pass's first slice, not filed as a finding here.

## Summary

**There is no written layering doc for `apps/web` the way `AGENTS.md` defines one for `apps/api`** — so, unlike pass 1, most of this document's Tier 1/3 boundary between "violates a documented rule" and "one style among several, undecided" leans toward Tier 3: the code has a real, consistent shape in practice, but nothing commits it to paper or a lint rule yet.

**The de-facto architecture mostly holds.** Of 831 files, only 7 call `useQuery`/`useMutation`/`useLazyQuery`/`useSubscription` directly, and 6 of those 7 are inside `hooks/` — the pattern "`app/`/`components/` consume `hooks/`, `hooks/` is the only place Apollo operations are wired" is real for the overwhelming majority of the surface, not just the common case. Four cross-cutting concerns (data fetching, form validation, toast notifications, i18n) are each implemented exactly one way with zero exceptions. A shared `DeleteDialog` primitive is adopted by all 20 delete flows — proof the pattern of "extract a helper, everyone opts in" already works here when it's tried.

**What drifted is the same shape pass 1 found in `apps/api`: one CRUD pattern, copied by hand ~20 times.** 13 Zustand list stores differ by 3 of 145 lines after normalizing the entity name (and those 3 lines are themselves an inconsistent enum value, not a real variant); 20 list-query hooks include a pair with **zero** semantic diff. `knip` — already configured for this workspace, unlike `apps/api` at the start of pass 1 — reports 199 raw findings, the large majority intentional shadcn primitive exports rather than real dead code.

**Three correctness bugs surfaced, one of them security-relevant**, all found by lenses that execute code rather than just read it (layer-integrity tracing and, especially, writing the first component-level test this app has ever been able to run). A fourth finding is not a bug but a blocker: **`apps/web` had zero possible component-level test coverage before this pass** — `vitest.config.ts` could not parse JSX at all, and no existing test happened to exercise a component that used real JSX, so the gap was invisible. Senior QA fixed the two-line config issue in-pass (per the rubric's lens-7 instruction to characterize-and-fix rather than only file it) and used the newly-unblocked capability to write the pass's first component test, which is what surfaced the security-relevant bug.

| Lens                                                    | Result                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| `apps/web` → `apps/api` imports                         | 0                                                                 |
| Deep relative imports (3+ levels)                       | 0                                                                 |
| Data fetching style                                     | 1 (Apollo only — no react-query/swr)                              |
| Form validation style                                   | 1 (`useForm` + `zodResolver`, 25/25 files)                        |
| Toast style                                             | 1 (`sonner`, 27 files)                                            |
| i18n hook style                                         | 1 (`useTranslations`, 404 files; 0 server-side `getTranslations`) |
| `knip` (already configured)                             | clean run, 199 raw findings, mostly intentional                   |
| Component-level test coverage possible before this pass | **0** — JSX unparseable in Vitest config                          |

---

## Tier 0 — Correctness bugs {#tier-0-correctness-bugs}

### 0.1 `SessionRestoreGate` can silently re-authenticate a user after `clearAuth()` — security-relevant

[`components/providers/session-restore-gate.tsx:65,71,128`](https://github.com/grant-js/grant/blob/main/apps/web/components/providers/session-restore-gate.tsx)

`SessionRestoreGate` is the only client-side auth gate in the app — there is no `middleware.ts` anywhere in `apps/web`, so this component alone decides whether protected page content renders. Sequence:

1. Some code path calls `useAuthStore.getState().clearAuth()` on a protected route, expecting the user to be logged out.
2. `clearAuth()` resets local state, and the gate's `restoreStatus` is reset to `'idle'` via `queueMicrotask` (`:65`).
3. That reset is a dependency of the restore-trigger effect (`:71`), so it fires `refreshSessionViaCookie()` again automatically.
4. If the HTTP-only refresh cookie is still valid — e.g. a caller forgot to revoke the session server-side first, or revoked a different session/device — the refresh succeeds and the user is transparently re-authenticated with a fresh access token, never reaching the login screen.
5. Compounding this: the render branch at `:128` (`restoreStatus === 'done' && !publicPath`) does not also require `auth` to be true, so protected content can keep rendering for at least one render pass immediately after `clearAuth()`, before the outcome of step 4 is known.

**Mitigating context, checked before filing:** every real `clearAuth()` call site today (`components/common/sidebar-account-dropdown.tsx:46`, `hooks/me/use-my-mutations.ts:318,323`, `app/[locale]/dashboard/settings/security/page.tsx:60`, `hooks/privacy/use-privacy-settings.ts:102`) calls a session-revoking mutation first (`logoutMyUser`, `revokeMyUserSession`, `deleteAccounts`), so in practice the cookie is normally already dead by the time `clearAuth()` runs. The gate does not enforce or verify that ordering itself, though — it is a real, reachable invariant gap (a future `clearAuth()` call site that forgets the revoke-first step reintroduces this silently) rather than a purely theoretical one.

Characterized with 8 tests in [`components/providers/session-restore-gate.test.tsx`](https://github.com/grant-js/grant/blob/main/apps/web/components/providers/session-restore-gate.test.tsx) (new, this pass) — including a companion test confirming the gate resolves correctly to the login screen when the cookie _has_ actually been revoked, which pins the defect as conditional on cookie state rather than universal.

**Decision needed, not fixed here:** should the gate itself call `logoutSession()` / clear the cookie whenever it observes a `clearAuth()` with no prior network activity, or is "callers must revoke server-side before calling `clearAuth()`" an acceptable documented contract that just needs to be written down and enforced by convention? Either is defensible; leaving it undocumented is not.

### 0.2 RBAC list viewers drop query errors, contradicting the documented intent next to them

[`lib/apollo-client.ts:46-59`](https://github.com/grant-js/grant/blob/main/apps/web/lib/apollo-client.ts) carries a comment naming ten RBAC list/detail operations (`GetRoles`, `GetRolesList`, `GetGroups`, `GetGroupsList`, `GetPermissions`, `GetPermissionsList`, `GetTags`, `GetProjects`, `GetUsers`, `GetUsersList`) as deliberately exempt from the global 403 → `/forbidden` redirect, because _"RBAC entity queries show inline errors on detail/list panels instead."_

None of the six primary list viewers actually destructure `error` from their query hook:

| Viewer             | Hook                 | Site                                                                                                                                                                     |
| ------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GroupViewer`      | `useGroupsList`      | [`components/features/groups/group-viewer.tsx:28`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/groups/group-viewer.tsx)                     |
| `RoleViewer`       | `useRolesList`       | [`components/features/roles/role-viewer.tsx:28`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/roles/role-viewer.tsx)                         |
| `PermissionViewer` | `usePermissionsList` | [`components/features/permissions/permission-viewer.tsx:28`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/permissions/permission-viewer.tsx) |
| `TagViewer`        | `useTags`            | [`components/features/tags/tag-viewer.tsx:27`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/tags/tag-viewer.tsx)                             |
| `UserViewer`       | `useUsersList`       | [`components/features/users/user-viewer.tsx:28`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/users/user-viewer.tsx)                         |
| `ProjectViewer`    | `useProjects`        | [`components/features/projects/project-viewer.tsx:28`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/projects/project-viewer.tsx)             |

Net effect: a permission-denied response on any of these six queries renders as a silent empty list — indistinguishable from "there is genuinely nothing here" — instead of an inline error. This is the opposite of the intended UX documented directly beside the routing logic that depends on it, and it means the exemption from the redirect currently has no compensating behavior at all.

### 0.3 `use-tags.ts` drops the server's `hasNextPage`, `use-paginated-tags.ts` recomputes it independently

[`hooks/tags/use-tags.ts:37-54`](https://github.com/grant-js/grant/blob/main/apps/web/hooks/tags/use-tags.ts) queries `GetTagsDocument` but returns only `{ tags, loading, error, totalCount, refetch }` — the server-computed `hasNextPage` is never read. Its only consumer, [`hooks/tags/use-paginated-tags.ts:47`](https://github.com/grant-js/grant/blob/main/apps/web/hooks/tags/use-paginated-tags.ts), then independently derives `const hasNextPage = useMemo(() => page * pageSize < totalCount, ...)`.

This is the same defect class `api.md` records as [0.2](./api.md#tier-0-correctness-bugs) — a next-page signal computed once, thrown away, and recomputed a second way — now also present client-side. Lower severity than the API instance (no wasted network row, no discarded repository work), but the same root cause: a value the server already computed is not propagated through the layer that touches it first.

---

## Tier 1 — Guardrail gaps {#tier-1-guardrail-gaps}

`AGENTS.md` does not yet define layering, error-handling, or logging rules for `apps/web` the way it does for `apps/api` — so most candidate "violations" below are Tier 3 (a style decision nobody has made) rather than Tier 1 (a documented rule broken). Two items are genuine Tier 1 gaps because they're gaps in the guardrail itself, not the code:

### Guardrails do not reach `apps/web` yet

Carried forward from pass 1's ["Inputs carried into later passes"](./README.md#inputs-carried-into-later-passes) table, confirmed still true: `eslint.config.mjs`'s 11 rule blocks and `dead-code:api`'s `knip --workspace apps/api` invocation are `apps/api`-scoped. `knip` is separately configured for `apps/web` already (`knip.json`, workspace entry `app/**/*.{ts,tsx}` + `middleware.ts`) and runs clean with no crashes — this pass's lens 5 used it directly rather than hand-grepping. Widening the ESLint boundary/import rules to `apps/web` is this pass's first implementation slice.

### Vitest could not parse JSX — the entire `components/` tree was categorically untestable

[`apps/web/vitest.config.ts`](https://github.com/grant-js/grant/blob/main/apps/web/vitest.config.ts) — root `tsconfig.json` sets `"jsx": "preserve"` (correct for Next's SWC build); Vitest's Vite 8 transform is oxc-based by default and reads that same tsconfig value, so any `.tsx` file containing real JSX failed to parse under test, including the component under test itself, not just a hand-written test file. Every existing `.test.tsx` in the app (e.g. `hooks/mfa/use-mfa-mutations.test.tsx`) happened to test hooks only, via `renderHook`, with zero literal JSX — so this was invisible until lens 7 tried to render an actual component.

**Fixed in-pass**, per the rubric's lens-7 instruction to characterize-and-fix rather than file a backlog item for something already blocking the pass: a scoped two-line `oxc.jsx.runtime: 'automatic'` addition to `vitest.config.ts`, verified not to touch the shared root `tsconfig.json` or the Next.js build config. Full suite after the change: 8 files, 41 tests, all passing; `tsc --noEmit` and `eslint` both clean on the touched files. This file is currently uncommitted, alongside the new characterization test it unblocked — see [Tier 6](#tier-6-coverage).

---

## Tier 2 — Abstraction opportunities {#tier-2-abstraction-opportunities}

Sized against the call site per rule 6, not against total pattern size — none of these propose a new base class, only a helper existing files would opt into.

### 2.1 Zustand list stores — 13 files, ~140 lines each, near-byte-identical

`groups.store.ts`, `roles.store.ts`, `tags.store.ts`, `resources.store.ts`, `members.store.ts`, `organizations.store.ts`, `permissions.store.ts`, `users.store.ts`, `projects.store.ts`, `api-keys.store.ts`, `project-apps.store.ts`, `webhooks.store.ts`, `project-sync-jobs.store.ts`.

Diffed with the entity name normalized out: [`stores/groups.store.ts`](https://github.com/grant-js/grant/blob/main/apps/web/stores/groups.store.ts) (145 L) vs [`stores/roles.store.ts`](https://github.com/grant-js/grant/blob/main/apps/web/stores/roles.store.ts) (145 L) — **3 of 145 lines differ**, and those 3 lines are an inconsistent enum value (`GroupView.CARDS` vs `RoleView.CARD`), not a real variation. This is the largest single block of repetition in the app, the same shape as `api.md`'s [2.1](./api.md#tier-2-abstraction-opportunities).

No generic factory exists yet to size a helper against — worth opening the two hardest instances first (per rule 3, "mechanical" is a claim to test): `tags.store.ts` lacks `selectedTagIds`/`hideSyntheticEntities` that `groups`/`roles` have, and its URL-parsing style differs (see [3.3](#33-url-param-parsing-style-two-implementations)). Detail-scoped stores (`group.store.ts` 145 L, `role.store.ts` 210 L, `user.store.ts` 371 L, `permission.store.ts`/`resource.store.ts` 80 L) vary far more and were **not** verified near-identical this pass — flagged for a follow-up rather than asserted.

### 2.2 List-query hooks — 20 files, ~65 lines each

`use-groups-list.ts`, `use-roles-list.ts`, `use-permissions-list.ts`, `use-users-list.ts`, and 16 more, one per entity domain. [`hooks/groups/use-groups-list.ts`](https://github.com/grant-js/grant/blob/main/apps/web/hooks/groups/use-groups-list.ts) vs [`hooks/roles/use-roles-list.ts`](https://github.com/grant-js/grant/blob/main/apps/web/hooks/roles/use-roles-list.ts): **0 semantic diff** — 59/59 lines, the only difference is import ordering.

### 2.3 Pagination wrapper — 14 files, sized concretely against the call site

[`components/features/groups/group-pagination.tsx`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/groups/group-pagination.tsx) vs [`.../roles/role-pagination.tsx`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/roles/role-pagination.tsx): identical 9-line body, only the store hook name differs. Current body is 6 lines (4 store-selector reads + a `Math.ceil` + return). A `usePaginationProps(useXStore)` hook collapses the call site to 2 lines:

```tsx
export function GroupPagination() {
  return <Pagination {...usePaginationProps(useGroupsStore)} />;
}
```

14 files × ~4 lines saved — a genuine reduction, unlike several of pass 1's rejected extractions.

### 2.4 Toolbar — 18 files, ~48 lines each

[`components/features/groups/group-toolbar.tsx`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/groups/group-toolbar.tsx) vs [`.../roles/role-toolbar.tsx`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/roles/role-toolbar.tsx): 48/48 lines, only the icon import differs.

### 2.5 `DeleteDialog` — already collapsed, cite as the positive counter-example

[`components/common/delete-dialog.tsx:46-118`](https://github.com/grant-js/grant/blob/main/apps/web/components/common/delete-dialog.tsx) is a shared primitive already adopted by all 20 delete-dialog wrappers, e.g. [`components/features/groups/group-delete-dialog.tsx:1-58`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/groups/group-delete-dialog.tsx). Small structural variance is real (some pass `onSuccess`, some don't) and is not a defect. This is the base-class-exists-and-is-used counter-example to 2.1–2.4 — proof the extraction pattern works here when someone does it.

---

## Tier 3 — Divergent styles {#tier-3-divergent-styles}

### 3.1 Four sites reach GraphQL directly, bypassing the de-facto hooks-only pattern

Of 831 files, 7 call `useQuery`/`useMutation`/`useLazyQuery`/`useSubscription`; 6 are inside `hooks/`. Same-directory comparison strengthens the case that this is a real, broken convention rather than an unwritten one: `app/[locale]/auth/{login,register,forgot-password}/page.tsx` all correctly import `useAuthMutations` from `@/hooks`; two sibling pages in the same tree do not.

| File                                                                                                                                                                              | What it does                                                                                                                                                                    | Assessment                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`app/[locale]/auth/mfa/page.tsx:6,8-11,35-39`](https://github.com/grant-js/grant/blob/main/apps/web/app/[locale]/auth/mfa/page.tsx)                                              | `useMutation(SetupMfaDocument)`, `useMutation(VerifyMfaDocument)`, `useMutation(VerifyMfaRecoveryCodeDocument)` called directly in a route component                            | Genuine gap — no hook wraps these 3 operations anywhere; `hooks/mfa/use-mfa-mutations.ts` wraps a _different_ set (`My*`-prefixed settings-flow mutations)                                                                                                      |
| [`app/[locale]/auth/project/email/page.tsx:60-72`](https://github.com/grant-js/grant/blob/main/apps/web/app/[locale]/auth/project/email/page.tsx)                                 | Raw `fetch()` inline for a REST call                                                                                                                                            | `lib/project-oauth-api.ts` already wraps this exact surface and is used correctly by 2 sibling pages — this one re-implements the fetch instead of adding a 5th function to the existing lib file                                                               |
| [`components/features/notifications/notification-bell.tsx:5,53-69`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/notifications/notification-bell.tsx) | `useMutation` + an imperative `client.query` via `useApolloClient()`                                                                                                            | `hooks/notifications/use-notifications.ts` exists as the list hook for the same document family; the mutation half has no justification, the imperative-query half is arguably legitimate (on-demand popover preview, not a subscribed list)                    |
| [`components/features/auth/mfa-step-up-dialog.tsx:5,21,59-63,83-87`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/auth/mfa-step-up-dialog.tsx)        | Uses a second, uncached Apollo client ([`lib/apollo-temp-client.ts`](https://github.com/grant-js/grant/blob/main/apps/web/lib/apollo-temp-client.ts)) instead of the shared one | Likely intentional — step-up re-auth must avoid the shared client's auth-refresh interceptor recursing — but that justifies a second _client_, not bypassing a hook; `useMutation(doc, { client })` accepts an explicit client and could still live in `hooks/` |

Worth locking in with a lint rule once decided (e.g. forbidding `@apollo/client` and `*Document` imports from `@grantjs/schema` outside `hooks/**` and the two sanctioned provider files) — the pattern holding everywhere else costs nothing to enforce today.

### 3.2 URL-synced pagination state — 9 of 13 list stores implement it, 4 don't

`groups`, `roles`, `tags`, `resources`, `members`, `organizations`, `permissions`, `users`, `projects` implement `initializeFromUrl`; `api-keys`, `project-apps`, `webhooks`, `project-sync-jobs` do not, despite an identical page/limit/search/sort/totalCount shape in all 13. Compare [`stores/api-keys.store.ts:11-15`](https://github.com/grant-js/grant/blob/main/apps/web/stores/api-keys.store.ts) (no `initializeFromUrl`) against [`stores/groups.store.ts:46,111-136`](https://github.com/grant-js/grant/blob/main/apps/web/stores/groups.store.ts).

### 3.3 URL param parsing style — two implementations

[`stores/tags.store.ts:105-106`](https://github.com/grant-js/grant/blob/main/apps/web/stores/tags.store.ts) uses `parseInt(params.get('page') || '1')` with `isNaN` guards; every other list store with URL sync uses `Number(params.get('page')) || 1` (e.g. [`stores/groups.store.ts:117-118`](https://github.com/grant-js/grant/blob/main/apps/web/stores/groups.store.ts)).

### 3.4 Store naming — singular+plural pairs for 6 entities, plural-only for 9

| Has both a detail and a list store                                                                                                 | List store only                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `group`/`groups`, `role`/`roles`, `user`/`users`, `resource`/`resources`, `permission`/`permissions`, `project-app`/`project-apps` | `tags`, `projects`, `organizations`, `webhooks`, `webhook-deliveries`, `signing-keys`, `api-keys`, `members`, `project-sync-jobs` |

Not a naming collision — a structural question about which entities carry client-side detail state, worth a human decision rather than a rename.

### 3.5 No app-wide convention (yet) for raw errors or console logging

30 raw `throw new Error(` sites and 80 `console.log/warn/error` sites exist in `apps/web`. `AGENTS.md`'s bans on both are currently written scoped to _"API source or runtime adapter code"_ — not a Tier 1 violation for the frontend today, but the same gap pass 1 flagged for its own guardrails: nothing says whether `apps/web` should adopt an equivalent convention (a UI-facing error type, a structured client logger/Sentry-style sink) or whether raw errors and `console.*` are an accepted frontend norm. Undecided, not wrong.

### 3.6 One direct `@grantjs/core` import, bypassing `@grantjs/schema`

[`components/features/permissions/permission-types.ts:1`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/permissions/permission-types.ts) imports `permissionConditionSchema` from `@grantjs/core` directly. `AGENTS.md`'s "types are centralized via `@grantjs/schema`" principle is written for `apps/api`'s consumers (REST routes, resolvers, handlers, services, repositories) and doesn't explicitly name `apps/web` — so this isn't a citable rule violation, but it is the only place the frontend reaches past the schema package into core, and it's worth a decision on whether that's the intended boundary for zod validation schemas that aren't GraphQL-codegen'd.

### 3.7 One dead barrel among 22 live ones — not an abandoned feature

21 of 22 `components/features/*/index.ts` barrels are imported from `app/`; `project-sync-jobs/index.ts` is the sole exception — every page importing that feature reaches individual files directly instead (e.g. [`app/[locale]/dashboard/.../import-export/page.tsx:3`](https://github.com/grant-js/grant/blob/main/apps/web/app/%5Blocale%5D/dashboard)). The feature itself is live; only the barrel entry point is unused. See [Tier 4](#tier-4-dead-surface).

---

## Tier 4 — Dead surface {#tier-4-dead-surface}

`knip` is already configured for `apps/web` and ran clean — no crashes, 2 informational config hints. Per rule 4 (count by the edit implied, not by tool issue type), 199 raw findings split into very different risk classes:

| Class                                         | Count                        | Edit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shadcn UI-primitive sub-exports               | 42                           | **None — intentional design.** The shadcn CLI generates a component's full API (e.g. `AlertDialogPortal`, `SheetFooter`, `SidebarMenuBadge`, `DropdownMenuSub`) so consumers can compose freely; unused parts are normal for a primitive library                                                                                                                                                                                                                                                                                                          |
| Module-private (drop `export`, nothing moves) | ≥1 confirmed by sampling     | `DeleteDialogEntity` ([`components/common/delete-dialog.tsx:18`](https://github.com/grant-js/grant/blob/main/apps/web/components/common/delete-dialog.tsx)) is used only within its own file                                                                                                                                                                                                                                                                                                                                                              |
| Genuinely dead — superseded duplicates        | 5 pairs, 10 exports          | `editGroupSchema`/`GroupEditFormValues`, `editRoleSchema`/`RoleEditFormValues`, `editPermissionSchema`, `editResourceSchema`, `editUserSchema` — each corresponding `*-edit-dialog.tsx` defines and uses its own local `slimEditXSchema` instead (e.g. [`components/features/groups/group-types.ts:14,25`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/groups/group-types.ts) vs [`.../group-edit-dialog.tsx:20,25`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/groups/group-edit-dialog.tsx)) |
| Genuinely dead — remainder                    | not individually re-verified | e.g. `evictAccountsCache` ([`hooks/accounts/cache.ts:3`](https://github.com/grant-js/grant/blob/main/apps/web/hooks/accounts/cache.ts)), `isRedirectInProgress`/`setRedirectInProgress` ([`lib/auth.ts:30,36`](https://github.com/grant-js/grant/blob/main/apps/web/lib/auth.ts)), `createImage`/`getRadianAngle`/`rotateSize` ([`lib/utils/image-processing.ts:13,22,26`](https://github.com/grant-js/grant/blob/main/apps/web/lib/utils/image-processing.ts))                                                                                           |

### Unused files (4)

| File                                                                                                                                                    | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`components/ui/button-group.tsx`](https://github.com/grant-js/grant/blob/main/apps/web/components/ui/button-group.tsx)                                 | Genuinely dead — 0 references anywhere                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| [`components/ui/carousel.tsx`](https://github.com/grant-js/grant/blob/main/apps/web/components/ui/carousel.tsx)                                         | Genuinely dead — 0 references; its sole dependency `embla-carousel-react` (below) is dead for the same reason                                                                                                                                                                                                                                                                                                                                                                  |
| [`components/features/project-sync-jobs/index.ts`](https://github.com/grant-js/grant/blob/main/apps/web/components/features/project-sync-jobs/index.ts) | Dead barrel, **not** an abandoned feature — see [3.7](#37-one-dead-barrel-among-22-live-ones--not-an-abandoned-feature)                                                                                                                                                                                                                                                                                                                                                        |
| [`styles/tokens.ts`](https://github.com/grant-js/grant/blob/main/apps/web/styles/tokens.ts)                                                             | Genuinely dead as an import, but not orphaned — [`tailwind.config.ts:9-149`](https://github.com/grant-js/grant/blob/main/apps/web/tailwind.config.ts) carries a hand-maintained duplicate, with a comment stating it "mirrors `styles/tokens.ts` for config load contexts where that path does not resolve." `react-and-web.mdc:38` documents `tokens.ts` as _the_ source of truth; in practice the never-imported file isn't it — the inline copy in the config is what ships |

### Unused dependencies (5) — one false positive caught

| Dependency                                | Status                                                                                                                                                                                                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@apollo/experimental-nextjs-app-support` | Genuinely unused                                                                                                                                                                                                                                                                                |
| `embla-carousel-react`                    | Dead, tied to `carousel.tsx`                                                                                                                                                                                                                                                                    |
| `js-cookie`                               | Genuinely unused (no `@types/js-cookie` either)                                                                                                                                                                                                                                                 |
| `uuid`                                    | Genuinely unused as an npm import — the only `.uuid()` calls in the codebase are zod's built-in string validator method, not the package                                                                                                                                                        |
| `tw-animate-css`                          | **False positive — knip's own documented blind spot.** Imported via `@import 'tw-animate-css'` in [`app/globals.css:2`](https://github.com/grant-js/grant/blob/main/apps/web/app/globals.css); knip's config-hints output states `.css` imports aren't followed for this project. Do not remove |

### Unused devDependencies (6)

`@eslint/eslintrc`, `@eslint/js`, `eslint-plugin-react-hooks`, `typescript-eslint` are declared in `apps/web/package.json` but consumed only by the **root** `eslint.config.mjs`, which already declares the same 4 packages itself — duplicate declarations, not phantom ones. `eslint-config-next` has zero references anywhere in the repo's flat-config setup (also duplicated in `apps/config/package.json`) — looks like a leftover from a pre-flat-config `.eslintrc`. `@testing-library/user-event` has zero references in `apps/web/tests/`.

---

## Tier 5 — Ubiquitous language {#tier-5-ubiquitous-language}

### What holds — `apps/web` did not inherit `apps/api`'s own drift

| Concept                               | `apps/api` finding (pass 1)                                                                                                         | `apps/web` behavior                                                                                                                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `member` vs `user` for org membership | Two full stacks over one table; `AGENTS.md` [§5.1](./api.md#51-member-vs-user--two-full-stacks-over-one-table)                      | 100% `member` — zero occurrences of `organizationUser`/`OrganizationUser` anywhere in `app/components/hooks/stores/lib`                                                                                                                                |
| `Tenant` as scope-kind discriminator  | `tenantId` has 0 occurrences; reads as a false cognate ([§5.3](./api.md#53-tenant-is-really-scope-kind))                            | Imported from `@grantjs/schema` and used exactly as the API defines it (`Tenant.Account`, `Tenant.Organization`, etc.) — no new spelling introduced                                                                                                    |
| `organization`, not `org`             | `orgId` (22) survives alongside `organizationId` (462), baked into a public URL ([§5.2](./api.md#52-abbreviations-in-a-public-url)) | `organizationId`: 185 occurrences. `orgId`: 2, both a local destructured alias inside one function ([`lib/notification-href.lib.ts:79-80`](https://github.com/grant-js/grant/blob/main/apps/web/lib/notification-href.lib.ts)), not a param/field name |

Web only sees the public contract, so it structurally cannot inherit the API's internal drift — but it also didn't introduce equivalent drift of its own on any of these three terms.

### `pageSize` vs `limit` — one file

Every list hook parameterizes on `limit`, matching the `QueryXArgs` contract directly — except [`hooks/tags/use-paginated-tags.ts:10-16`](https://github.com/grant-js/grant/blob/main/apps/web/hooks/tags/use-paginated-tags.ts), which takes `pageSize` and translates it back to `limit` at the call site. 5 occurrences, all in this one file. Cheap to rename — `pageSize` never reaches `@grantjs/schema`.

### "Workspace" — a deliberate UI-only synonym for `Account`

`Account` (`AccountType.Personal | Organization`) is the API's own umbrella entity. The web layer additionally surfaces **"workspace"** as its user-facing name — [`components/common/workspace-switcher.tsx`](https://github.com/grant-js/grant/blob/main/apps/web/components/common/workspace-switcher.tsx) (`WorkspaceSwitcherProps`, `currentWorkspace`), the `t('workspace')` i18n label in 4 sidebar components, and a code comment in [`stores/auth.store.ts:8`](https://github.com/grant-js/grant/blob/main/apps/web/stores/auth.store.ts) calling `currentAccountId` "last workspace." 39 total occurrences, 0 in `@grantjs/schema` or any contract surface. Not a defect — never touches the contract — but worth a one-line doc note so a future contributor doesn't wonder whether "workspace" is a queryable field.

### Aside: the i18n coverage doc is stale

[`docs/advanced-topics/internationalization.md:685-692`](/advanced-topics/internationalization) claims "~200 strings, 100% coverage (October 2025)." Running the doc's own verification command today against [`i18n/locales/en.json`](https://github.com/grant-js/grant/blob/main/apps/web/i18n/locales/en.json) vs [`de.json`](https://github.com/grant-js/grant/blob/main/apps/web/i18n/locales/de.json) reports **252 path differences**, all missing-in-German, concentrated in `group.*` and `common.tags.*`. Flagged for whoever owns that doc — not a code-quality finding, but it surfaced during the same grep pass.

---

## Tier 6 — Coverage {#tier-6-coverage}

### Before this pass: zero component-level coverage was possible, not merely absent

See [Tier 1](#vitest-could-not-parse-jsx--the-entire-components-tree-was-categorically-untestable) — `vitest.config.ts` could not parse JSX under Vite 8's default oxc transform given the root `tsconfig.json`'s `"jsx": "preserve"`. Every existing `.test.tsx` happened to avoid real JSX (hook-only tests via `renderHook`), so this was invisible to every other lens. Fixed in-pass with a scoped `vitest.config.ts` change.

### What was tested this pass

Selected the highest-risk untested shared surface using `AGENTS.md`'s blast-radius framing, scored against the alternatives:

| Candidate                                       | Lines | Call sites              | Verdict                                                                                                                                     |
| ----------------------------------------------- | ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/providers/session-restore-gate.tsx` | 135   | 1 (wraps the whole app) | **Selected** — the sole client-side auth gate; no `middleware.ts` exists anywhere in `apps/web`                                             |
| `hooks/common/use-scope-from-params.ts`         | 82    | 128                     | High blast radius, but the precedence branch it worries about can't currently collide — `accounts`/`organizations` are disjoint route trees |
| `stores/auth.store.ts`                          | 208   | wide                    | Mostly plain setters; only `setAuthData`'s target-account resolution (`:140-146`) is non-trivial                                            |
| `lib/apollo-client.ts`                          | 554   | every GraphQL request   | Next-highest-risk candidate, **not reached this pass** — see gaps below                                                                     |

Also confirmed: the app has **no client-side "can I do X" gate at all** (`hasPermission`/`canAccess`/`PermissionGate`/`isAllowed` — zero hits across `components/`, `hooks/`, `lib/`, `stores/`). Authorization is server-enforced only; worth recording since it means `SessionRestoreGate` (authentication) is genuinely the highest-leverage client-side gate that exists, not one of several.

[`components/providers/session-restore-gate.test.tsx`](https://github.com/grant-js/grant/blob/main/apps/web/components/providers/session-restore-gate.test.tsx) — 8 tests, all against the real component (only `next/navigation`, `@/i18n/navigation`, `@/lib/apollo-client`, `@/lib/refresh-session`, `@/components/common` are mocked; the real `@/stores/auth.store` Zustand store is used and reset per test). Covers: authenticated/protected happy path, unauthenticated restore success and failure, public-path behavior, an SPA-redirect self-heal mechanism (the tester's own initial hypothesis about it was wrong — the test now documents the real mechanism instead), and the [0.1](#01-sessionrestoregate-can-silently-re-authenticate-a-user-after-clearauth--security-relevant) defect plus its cookie-revoked companion case.

**Both files are currently uncommitted** (`apps/web/vitest.config.ts` modified, `session-restore-gate.test.tsx` new) — for review before landing, likely as part of this pass's first slice alongside the guardrail-widening work.

### Remaining gaps, weighted by lines at risk

| Untested surface                                                                                                                 | Lines        | Note                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/` (whole tree)                                                                                                       | 49,470       | Was categorically unrenderable until this pass; still ~100% untested now that it's _possible_                                                                                                                                         |
| `lib/apollo-client.ts`                                                                                                           | 554          | Decides token refresh vs. force-logout for every GraphQL operation (`isUnauthorizedError`, `handleUnauthorizedError`, `:146-463`) — same blast-radius shape as `SessionRestoreGate`, highest-priority candidate not reached this pass |
| `stores/` (23 files)                                                                                                             | 3,059        | Zero tests on any store; `user.store.ts` (371 L) and `role.store.ts` (210 L) are the largest                                                                                                                                          |
| `hooks/common/use-scope-from-params.ts` + siblings (`use-account-scope.ts`, `use-project-scope.ts`, `use-project-user-scope.ts`) | 158 combined | 128 call sites for the first alone, zero tests                                                                                                                                                                                        |
| `lib/auth.ts`                                                                                                                    | 88           | `isPublicPath`/`isAuthOnlyPath` feed directly into the gate's routing decisions; pure functions, cheap to characterize                                                                                                                |
| `components/providers/{apollo-provider,grant-provider,runtime-config-provider}.tsx`                                              | 31 / 56 / 74 | Each wraps the whole app exactly once; `grant-provider.tsx:34-37` has its own `onUnauthorized` handler worth cross-checking against the gate's for consistency                                                                        |
| `hooks/*` (19 domain directories)                                                                                                | 5,941        | Mostly thin Apollo wrappers, pattern already characterized once via `use-mfa-mutations.test.tsx`; lower risk than the state-machine surfaces above                                                                                    |

Before this pass, test coverage in `apps/web` was carried almost entirely by a handful of pure-function/hook tests (`lib/redirect.test.ts`, `lib/rbac-relationship-state.test.ts`, `lib/notification-href.lib.test.ts`, `hooks/common/use-infinite-scroll.test.ts`) — 793 test lines total against ~65,309 lines in `app/components/hooks/lib/stores`, and zero of it at the component level.

---

## Backlog

Story brief and stack plan: [`plans/2026-08-08-web-code-quality-brief.md`](../../plans/2026-08-08-web-code-quality-brief.md), [`plans/2026-08-08-web-code-quality-stack.md`](../../plans/2026-08-08-web-code-quality-stack.md).

---

## Pass-2 close-out — resolved counts (2026-08-09)

Re-run of the measurable lenses after all 7 slices merged into `feat/web-code-quality`, mirroring pass 1's own close-out. "Now" is measured on the merged trunk, not asserted.

| Lens                                             | Audit                                             | Now                                      | Note                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tier 0** correctness bugs                      | 3 (0.1, 0.2, 0.3)                                 | **0**                                    | All three fixed with regression tests. 0.1 took 3 rounds of independent security review — the first two fixes each closed one race but missed a sibling one; see PR #229                                                                                                                                                   |
| **L1** Hooks-only boundary bypass sites          | 4 real + 2 named exceptions                       | **0 real, 2 named exceptions**           | Enforced by `no-restricted-imports`/`no-restricted-syntax` in `eslint.config.mjs`, scoped to `apps/web/app/**` and `apps/web/components/**` (PR #232). Confirmed clean via `eslint app components` post-merge                                                                                                              |
| **L5** Dead exports (knip)                       | 199 raw findings                                  | **0**                                    | Gated in CI and pre-push via `dead-code:web` since PR #233, verified against the fully-merged trunk. ~2900 lines net removed across 27 files, plus 6 dependencies                                                                                                                                                          |
| **L7** Component-level test coverage             | **0 possible** (Vitest couldn't parse JSX at all) | **47 tests / 10 files**                  | Was a hard blocker before a single line of app code could be tested; fixed as part of slice 1. `SessionRestoreGate`'s characterization tests are what surfaced finding 0.1 in the first place                                                                                                                              |
| **L4** `usePaginationProps` sites                | 14 candidates                                     | **11 converted, 3 correctly left alone** | `project-app-pagination.tsx`, `webhook-pagination.tsx`, `webhook-deliveries-pagination.tsx` have real behavioral differences (a `\|\| 1` fallback, a `totalCount === 0` guard) — forcing them into the generic hook would have been a silent behavior change, so slice 5 left them out rather than claim a clean 14-for-14 |
| **L3** `tags.store.ts` factory question          | Open                                              | **Resolved: no factory**                 | Real variance (~25/145 lines) is almost entirely call-site key names already selected on directly by ~13 entities' feature components — a factory generic enough to preserve them outsizes what it replaces. Recorded inline in the file and in PR #235                                                                    |
| **L2** Raw errors / `console.*` in `apps/web`    | 30 / 80 sites, no written policy                  | **Unchanged, status quo affirmed**       | Deliberately not touched — see slice 7. `AGENTS.md`'s bans stay `apps/api`-scoped for now; extending them is a decision for a future pass, not implied by this one                                                                                                                                                         |
| Full repo diff, `main` → `feat/web-code-quality` | —                                                 | **141 files, +1537/−3224 lines**         | Net negative despite three new hooks, a store-level `tokenVersion` field, and ~90 new test lines — dead-surface removal outweighed everything added                                                                                                                                                                        |

### What the close-out itself surfaced

Nothing new in the sense of an undiscovered defect — but one process point worth recording: slice 4's actual diff (96 files, ~2900 lines) was far larger than the stack plan's condensed brief anticipated (5 schema pairs + 2 components), because the implementing agent re-ran `knip` itself rather than trusting the plan's numbers verbatim and found a whole superseded "Info"/"Sorter"/"PermissionsPanel" component family the original audit hadn't fully enumerated. Per rule 1 (run the tool before stating a count), that's the correct behavior — but it meant slice 4 got a heavier independent review pass than the other light-bar slices before pushing: a full-repo grep for every deleted symbol, a `pnpm install --frozen-lockfile` check on the hand-edited lockfile, and a full production build, on top of the usual tsc/lint/test loop. Recording it here so the next pass sizes review effort by what a slice's diff actually turns out to be, not by what its plan entry said it would be.

Also worth naming: this story used `gh stack` (v2) throughout, unlike pass 1, which predated its adoption. Two operational notes for the next story that uses it: `gh stack link` creates new PRs as drafts by default (needs `gh pr ready` after) and does not update local tracking when appending to an already-tracked stack (`gh stack checkout <pr>` re-adopts it cleanly, or `gh stack unstack --local` first if composition has diverged). Neither blocked anything, but both cost a round of confusion the first time each came up.
