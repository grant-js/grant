# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Story brief: [2026-11-01-project-api-key-picker-brief.md](./2026-11-01-project-api-key-picker-brief.md). Gates 1–2 approved by Alejandro / logusgraphics (2026-11-01).

Grounded on `origin/main` `65e2e426` (**v1.23.0**, `chore: version packages` #687). Follow-on to shipped story `api-key-scopes` (ADR 0014). Open-source language only — do not name customer tenants or deployments.

**Status: in-progress.** Gate 2 confirmed. Slice 1 (S0, `feat/project-api-key-picker-table`) is the active writer. Agents do not merge.

## Metadata

- **Slug**: `project-api-key-picker`
- **Story brief**: `plans/2026-11-01-project-api-key-picker-brief.md` (Project store copy: `docs/2026-11-01-project-api-key-picker-brief.md`)
- **Status**: in-progress
- **Story trunk**: `feat/project-api-key-picker` from `main` **after v1.23.0**
- **worktree_path**: not required unless another writer is on `main` / another story trunk in the same checkout. If a second story is already checked out here, Principal creates `../grant-platform-project-api-key-picker` (or `.worktrees/project-api-key-picker`) and records it before slice 1 starts.
- **Release**: **patch** on `grant-web` (and `grant-docs` for the one-paragraph `api-keys.md` note). UI + docs only. The fixed changeset group still moves together at release time; this story does not justify a minor. Each slice carries its own changeset.

**Slug justification:** names the dashboard surface (the project API-key scope picker), not a tactic (`scope-cards`, `table-hygiene`).

## Gate 1 answers (locked — do not re-open)

These close the brief’s remaining questions. Gate 2 does not invent a third option.

| Brief question                           | Answer                                                                                                                                                                     | Effect on this stack                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1. Where is Grant vs Project classified? | **A — web-only.** Helper over attachable / displayed rows using seeded `@grantjs/constants` catalogue membership. Server stays source of truth for _what may be attached_. | **No S2.** No `standard` / `kind` on `ApiKeyAttachablePermission`. No schema, OpenAPI, or API slice.     |
| 2. Search / filter across the two cards  | **A — independent toolbar per card.** Each card is already a `FeatureModuleCard` with its own search state.                                                                | Do not lift search to a shared parent. Do not add a single filter that drives both tables.               |
| Attenuation                              | Keep **v1.23.0 equality**. Do **not** restore `canAssignRole` on keys.                                                                                                     | No backend slice. `api-key-create-role-card.tsx` and `api-key-actions.tsx` stay free of `canAssignRole`. |
| S0                                       | Locked: shared `DataTable` ellipsis + `title`/tooltip; pagination footer counter left / nav right.                                                                         | Own PR **before** the picker. Do not bury A9–A10 inside S1.                                              |
| Labels                                   | **Grant scopes** / **Project scopes** on both workspace types. Never “Organization scopes.”                                                                                | i18n `en` + `de` under `user.apiKeys`.                                                                   |
| Privacy                                  | No customer tenant or deployment names.                                                                                                                                    | Plans, fixtures, copy, PRs.                                                                              |

## Active roles

Only list roles that will run for this story:

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [ ] Senior Backend
- [x] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

Architect stays off: no new table, port, or attenuation rule. Senior Backend stays off: S2 is not in this stack. Senior Security is a **read** of S1 classification and copy (custom rows cannot appear under Grant; personal-account cards do not say “Organization”); not a blocking `security-full` bar. QA drives test shape; Frontend writes the tests with the slice.

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**. `gh stack add` the next branch when that slice starts — never declare the whole list up front.

No database slice. No schema/codegen slice. No API slice. No standalone tests/docs slice: S0 tests live on S0; S1 tests, i18n, and the `api-keys.md` sentence live on S1.

| #     | Branch                              | Base                          | Concern                                                                                                | Owner role | Review bar              | PR  |
| ----- | ----------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ | ---------- | ----------------------- | --- |
| 1     | `feat/project-api-key-picker-table` | `feat/project-api-key-picker` | S0: shared `DataTable` / `Table` truncate + `title`/tooltip (A9); pager counter left / nav right (A10) | Frontend   | light                   |     |
| 2     | `feat/project-api-key-picker-web`   | prior slice                   | S1: Grant / Project cards; web catalogue helper; accordion inset; i18n; docs; picker tests (A1–A8)     | Frontend   | light (+ Security read) |     |
| final | `feat/project-api-key-picker`       | `main`                        | integration                                                                                            | Principal  | deep                    |     |

Prefer layer order: **db → schema → api → web**. This story is **web-only**. S0 is shared table hygiene so S1 inherits truncation and the footer; it is not picker-only and must stay reviewable as shared table code.

**Collapse rules:** Do not fold 1 into 2 (A9–A10 are every-`DataTable` layout, not picker chrome). Do not add S2. Do not add a db / schema / api PR. Do not add a third tests or docs PR. Do not restore `canAssignRole` under a “while we’re here.”

**Fan-out.** Slices 1 → 2 are sequential by dependency: one writer at a time in this worktree. Within a slice: Verifier after the author stops. Security reads slice 2 after the author stops and **before** that slice’s gate 3 — not folded into gate 4. QA can draft fixture lists against the brief during slice 1 (read-only; no second writer).

Two slices ship, so Gate 4 runs on the assembled trunk (integration + the combination a single-slice reviewer cannot see). Agents never self-merge. Alejandro merges.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk — Gate 2 approved. S0 is another worker's slice.
git switch -c feat/project-api-key-picker main && git push -u origin feat/project-api-key-picker

# Init with the FIRST slice branch only — never the whole list.
gh stack init --base feat/project-api-key-picker feat/project-api-key-picker-table

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto
gh stack link --base feat/project-api-key-picker <pr> <pr>   # bottom to top

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/project-api-key-picker-web

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions **before** writing a slice, not after — the branch you are about to work on must sit on the current tip of the slice below it:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

Prove the stack exists with `gh pr view <bottom-pr> --json baseRefName` — must be `feat/project-api-key-picker`, never `main`. Stacking rules: Grant repo `docs/contributing/agentic-sdlc.md` § GitHub stacking. **`--base` is not optional on `link`**. `gh stack submit --auto` opens PRs as **drafts**. Mark ready with `gh pr ready <pr>` for gate 3.

Never skip husky (`--no-verify`, `HUSKY=0`). Open PRs as `grantjs-agent` via `GRANTJS_AGENT_TOKEN` / `gh`, not the Cursor GitHub MCP or `ManagePullRequest`. Agents never self-merge. Alejandro APPROVE / merge from `logusgraphics`.

## Named contracts (do not rename in a slice)

| Kind               | Name                                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card titles        | **Grant scopes** / **Project scopes** (`user.apiKeys` i18n). Never “Organization scopes.”                                                                                           |
| Classification     | Catalogue membership: `(resource.slug, action)` is a seeded `@grantjs/constants` pair. No `isStandard` column. No cohort `standard` / `kind` field.                                 |
| Helper (suggested) | `isGrantCataloguePermission` + `partitionApiKeyScopeRows` in `apps/web/lib/` (next to `api-key-scope-groups.ts`). Web-only.                                                         |
| Catalogue sources  | `ResourceSlug` + `getResourceDefinition(slug).actions` + `STANDALONE_PERMISSIONS` (`ProjectUser:ExportCredentials`). Same package the picker already imports for `machineOnlyGate`. |
| Role select        | Still `apiKeyAttachableGrants.roles`. No `canAssignRole`.                                                                                                                           |
| Attenuation        | Unchanged: `assertAttachable` / `assertCanManage` / `attachableGrants`. Equality allowed.                                                                                           |
| Changesets         | `grant-web` **patch** on each slice. S1 also `grant-docs` **patch** for the `api-keys.md` sentence.                                                                                 |

Slug/action matching must survive the two spellings already in the tree: seeded / API slugs are PascalCase (`User`, `ProjectUser`, `ExportCredentials`); existing web tests and `toCamelCaseSlug` use kebab (`user`, `project-user`, `export-credentials`). Normalize the same way `machineOnlyGate` already does (trim + case-insensitive), and treat hyphenated slugs as the matching `ResourceSlug` (`project-user` → `ProjectUser`). Do not require the API to change casing.

## Slice notes

### 1 — Shared table + pager (S0, light)

- Owner files: `apps/web/components/common/data-table.tsx`, `apps/web/components/ui/table.tsx`, `apps/web/components/common/pagination.tsx`, `apps/web/components/common/feature-module-card.tsx`, `apps/web/components/ui/card.tsx` (`CardFooter` only if the shared footer is the shrink wrapper), `apps/web/components/layout/dashboard-layout.tsx` (list-page sticky footer hosts the same `Pagination`). New component tests next to those files (none exist today). Patch changeset on `grant-web`.
- Today:
  - `Table` wraps in `overflow-x-auto`. `TableCell` / `TableHead` are `whitespace-nowrap`. `DETAIL_TEXT_COLUMN` is `columnWidthMode: 'min'`, which makes `DataTable` use `table-auto w-max min-w-full`. A long name, slug chip, or description widens the table; the horizontal scrollbar sits at the **bottom** of a tall body.
  - `Pagination` already lays out `pagination.info` then prev/next with `flex w-full … justify-between`. Wrappers shrink it: `FeatureModuleCard` / `CardFooter` is `flex items-center` without forcing the child to the full footer width; `ApiKeyScopesTable` currently wraps the pager in an inner `<div>{pager}</div>` inside a `flex-wrap` row; a shrink-wrapped pager puts counter and nav **adjacent in the middle**.
- Outcome (A9–A10):
  - Content cells in shared `DataTable` / `Table`: max-width + ellipsis (`truncate` / `min-w-0`). Full value readable via native `title` and/or tooltip (at least one; both is fine).
  - Checkbox, icon, and actions columns stay untruncated (`DETAIL_CHECKBOX_COLUMN`, `DETAIL_ICON_*`, `DETAIL_LOADING_COLUMN`, `actionsColumn`).
  - `table-auto w-max` / `columnWidthMode: 'min'` must not reintroduce page-level or table-container `overflow-x` for long **text**. Do not “fix” A9 by hiding the scrollbar while the table still grows past its container.
  - Pagination footer: page counter **left**, previous/next **right**, full footer width. Fix `Pagination` + the `FeatureModuleCard` / `CardFooter` (and the dashboard sticky footer if it is a shrink wrapper), not each `*-pagination.tsx`. A wrapper must not shrink the pager.
- **Out of this slice:** picker split, accordion inset, i18n card titles, classification helper, `api-keys.md`, any `apps/api` file. Do not restyle `RoleCreatePermissions` / `GroupCreatePermissions` / `ProjectAppCreateScopes` beyond what they inherit from the shared table.
- Tests (QA drives shape; Frontend writes):
  - Long unbreakable string in a text cell does not grow the table past its container; the full string is on `title` and/or tooltip.
  - Footer: counter is the left-hand node, nav buttons the right-hand node, across the full width (not adjacent in the middle). A FeatureModuleCard-hosted pager and a dashboard-footer pager both lock this.
  - Existing attach-table tests stay green without per-feature edits.
- **UX:** every `DataTable` consumer inherits this (roles, groups, permissions, project apps, API keys, …). That is the point of shipping S0 first.
- **Fan-out:** Verifier after the author. Security not required (layout only).

### 2 — Grant / Project picker (S1, light + Security read)

- Owner files: `apps/web/lib/api-key-scope-kind.ts` (new; name may vary) + unit test; `apps/web/components/features/api-key/api-key-create-scopes.tsx`; `apps/web/components/features/api-key/api-key-scopes.tsx`; `apps/web/components/features/api-key/api-key-scopes-table.tsx` (accordion inset + optional title props already present); `apps/web/components/features/api-key/api-key-detail-viewer.tsx` (skeleton card count if the scopes path now has two cards); `apps/web/components/features/api-keys/api-key-create-viewer.test.tsx`; `apps/web/components/features/api-key/api-key-scopes-table.test.tsx`; `apps/web/components/features/api-key/api-key-scopes.test.tsx`; `apps/web/i18n/locales/{en,de}.json` under `user.apiKeys`; `docs/core-concepts/api-keys.md` (one paragraph). Patch changesets on `grant-web` and `grant-docs`.
- Today: one mixed `ApiKeyScopesTable` after Role vs Scopes. `groupScopeRows` sorts every resource slug together, so a custom `user`-like slug sits between Grant `User` and `UserSession`. Group header is a `fullWidthRow` colSpan cell (`py-2` on top of `TableCell` `p-2` plus inner `pl-1`); child rows use `DETAIL_CHECKBOX_COLUMN` `pl-2` only — nested rows outdent left.
- Outcome (A1–A8, A6):
  - After Role vs Scopes, **two** `FeatureModuleCard`s: **Grant scopes** then **Project scopes**. Same split on detail for a scope key (edit-in-place) and a role key (read-only effective permissions). Convert-to-scopes stays one confirmed action; the resulting view uses the same two cards.
  - Grant card: seeded catalogue rows the operator may attach (containment + existing gated machine-only attach for `ProjectUser:ExportCredentials`). Search, all/selected, column toggle, tri-state **All actions**, and the **Credentials only** badge stay here.
  - Project card: custom only — a non-catalogue resource, or an extra action on a Grant resource. Same table pattern. **Omit when empty** (create: no custom rows in the cohort; detail: none on the key and, for edit, none in attachable additions). Grant card always renders on the Scopes path; empty Grant uses the existing empty state.
  - Classification is catalogue membership, not a DB flag. Helper over the rows already attachable / already displayed. `ProjectUser:ExportCredentials` is Grant (standalone + `ProjectUser.actions`). An extra action on `User` is Project. Rows the caller may not attach stay out of create; detail may still show out-of-cohort rows disabled, as today.
  - Independent search: two table instances, each keeps its own `search` / all-selected state. Do not share one query string.
  - Accordion nest inset **right**: a nested row’s leading cell has a strictly larger left inset than the group header’s checkbox, **or** the group checkbox shares the children’s column so the nest reads as children-under-parent. Fix in the table / `fullWidthRow` / leading-column layout — do not paper over it with copy.
  - Labels: Grant vs Project on organization **and** personal-account projects. Role card copy stays “standard role / permissions you hold.”
  - Role select unchanged: `apiKeyAttachableGrants.roles`. Owner sees Owner. `canAssignRole` stays out of API-key components.
  - Docs: one paragraph under the two-grant-kinds / attachable-grants section that the dashboard splits Grant vs Project scopes. **Do not rewrite ADR 0014’s equality decision.**
- **Out of this slice:** `apps/api`, `@grantjs/schema`, `canAssignRole`, S0 table primitives (already on slice 1). Do not flatten both cards into one slug-sorted list.
- Tests (A8; QA drives shape; Frontend writes):
  - Helper: Grant pair (`User`/`user` + `Query`/`query`) is Grant; `ProjectUser` + `ExportCredentials` / `export-credentials` is Grant; custom resource slug is Project; extra action on a Grant resource is Project; kebab vs Pascal match.
  - Create + detail: two cards; a custom `user`-like slug is **not** between Grant `User` and `UserSession`.
  - Project card omitted when empty; Grant card still there.
  - Accordion: nested leading cell inset strictly greater than the group header checkbox (or shared column).
  - Personal-account create/detail: those card titles/descriptions contain no “Organization” (or org-only wording). Fixture tenant `AccountProject`; no customer names.
  - Owner still listed for Owner (existing role-card path; do not regress).
  - `pnpm --filter grant-web type-check` + lint. Never skip husky.
- **UX:** this is the only slice that ships picker chrome. S0 truncation/footer should already be under it.
- **Fan-out:** Verifier after the author. Security **read** after the author stops, before gate 3: (1) no custom row under Grant, (2) no Grant catalogue row hidden into Project, (3) personal-account copy does not imply an org ladder, (4) attachability unchanged (no new client-side filter that drops an attachable row). A wrong split is a UX / disclosure bug, not a new grant — bar stays **light**.

## Out of this stack

These are explicit **non-slices**. Do not add them under a “while we’re here” at slice start.

| Item                                                                            | Why it stays out                                                           |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **S2 `standard` / `kind` on `ApiKeyAttachablePermission`**                      | Gate 1 picked web classification. Re-open only with a new brief amendment. |
| **`canAssignRole` / rank filter on keys**                                       | v1.23.0 equality stays. Members and invitations keep `canAssignRole`.      |
| **`assertAttachable` / `assertCanManage` / `attachableGrants` behavior change** | Server rule is already the intended one.                                   |
| **`isStandard` column / seed / backfill**                                       | Classification is catalogue membership.                                    |
| **Database / schema / API / OpenAPI**                                           | UI-only.                                                                   |
| **Project-user keys**                                                           | `permissionIds` refused; create dialog stays.                              |
| **Union of role and scopes, convert-back-to-role, slug scopes**                 | v1.23.0 non-goals.                                                         |
| **CDM / export / fingerprint**                                                  | Unrelated.                                                                 |
| **Published `@grantjs/{client,server,cli}`**                                    | No contract change.                                                        |
| **Restyle of role / group / project-app attach tables**                         | They inherit S0 only.                                                      |
| **ADR 0014 rewrite**                                                            | One dashboard sentence in `api-keys.md`. Equality decision stays.          |

## Dependencies / notes

- **Depends on v1.23.0 on `main`** (`65e2e426`). Trunk from current `origin/main` after Gate 2.
- Slice 1 before 2 so the picker inherits truncation and the footer; reviewers see A9–A10 as shared table code.
- Slice 2 classification reads `@grantjs/constants` only. No API wait.
- **No customer tenant names** in repo plans, fixtures, PRs, or docs.
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.
- Fan-out that is free: Verifier on both slices; Security read on slice 2 after the author stops. Do not put two writers in one tree.

## Human gates

- [x] Gate 1: Story brief approved — Alejandro / logusgraphics, 2026-11-01.
- [x] Gate 2: Stack plan approved — Alejandro / logusgraphics, 2026-11-01. S0 in progress.
- [ ] Gate 3: Stack PRs merged into trunk (light as listed; Security read on slice 2).
- [ ] Gate 4: Story → `main` deep review complete. Agents do not merge.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Remote slice branches deleted
- [ ] Remote story trunk deleted
- [ ] Stack plan status → `merged-to-main`
