# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Follow-on to shipped **v1.23.0** project API-key scopes (story `api-key-scopes`, ADR 0014, `docs/core-concepts/api-keys.md` § Two grant kinds). Grounded on the locked product decisions below, plus the assessment and industry notes in this Project:

- [project-api-key-roles-assessment.md](./project-api-key-roles-assessment.md)
- [api-key-scoping-industry-norms.md](./api-key-scoping-industry-norms.md)

Open-source language only. Do not name customer tenants or deployments.

**Status: approved (Gate 1, Alejandro 2026-11-01).** Defaults locked: classify on the web (1A); independent search per card (2A). Another worker owns the stack plan (Gate 2). No implementation in this artifact.

## Metadata

- **Slug**: `project-api-key-picker`
- **Date**: 2026-11-01
- **Author** (human / PM agent): PM agent (for Alejandro / logusgraphics)
- **Status**: approved (Gate 1, Alejandro 2026-11-01; 1A and 2A locked)

## Objective

On project API-key create and detail, the scope picker stops mixing Grant’s seeded catalogue with project-custom permissions in one slug-sorted table. After the existing Role vs Scopes choice, Scopes becomes two cards — **Grant scopes** and **Project scopes** — and nested permission rows sit inset under their resource parent. Attenuation stays v1.23.0 containment with equality. Shared `DataTable` cells truncate instead of forcing a bottom-only horizontal scrollbar, and the shared pagination footer keeps the page counter on the left and the nav buttons on the right.

## Locked decisions (Alejandro / logusgraphics, this Project)

These are already decided. Gate 1 is approval of this brief, not a re-open.

1. **Keep v1.23.0 same-level minting.** The key’s effective permissions must be a subset of the operator’s in the key’s project scope; **equality is allowed**. Do **not** restore `canAssignRole` (or any strictly-lower rank) on keys — not on create, not on `attachableGrants`, not on manage, not in the role select. Members and invitations keep `canAssignRole`.
2. **UI-mostly.** Two cards on **create and detail**:
   - **Grant scopes** — seeded `@grantjs/constants` catalogue rows the operator may attach (containment + the existing gated machine-only attach for `ProjectUser:ExportCredentials`).
   - **Project scopes** — custom only (non-catalogue pairs the operator actually holds). **Omit the card when empty.**
3. **Role vs Scopes stays the first choice.** The role select still lists standard parent-tenant roles whose permission set the operator **covers**. Owner sees Owner. Personal-account projects keep the single account-owner role. No rank filter.
4. **Fix the accordion nest.** Nested permission rows must inset **right** under the parent resource row. Today they outdent left (group header is a `DataTable` `fullWidthRow` colSpan cell with `py-2` on top of `TableCell` `p-2` plus inner `pl-1`; child rows use `DETAIL_CHECKBOX_COLUMN` `pl-2` only).
5. **Personal-account projects are not “Organization.”** Card titles are **Grant** vs **Project** on both workspace types. Never label the first scopes card “Organization.” Prefer **Grant scopes** over **Organization scopes** even on organization workspaces: “Organization” can be read as org-wide access across projects, which a project key does not have.
6. **Privacy.** No customer tenant or deployment names in this brief, later plans, copy, fixtures, or PRs.
7. **Shared `DataTable` overflow and pagination footer (not picker-only).** Across **all** `DataTable`s, a too-wide cell must not force horizontal scroll. Today `Table` wraps in `overflow-x-auto` (`apps/web/components/ui/table.tsx`) and `TableCell` is `whitespace-nowrap`, so a long value (name, slug chip, description) widens the table; the scrollbar sits at the **bottom** of a tall table and is easy to miss. Fix in the shared table: max-width + ellipsis truncation on content cells, plus a way to read the full value (`title` and/or tooltip). Pagination footer is also broken: **page counter left**, **page nav buttons right** — fix in shared `Pagination` / `FeatureModuleCard` footer, not in each feature. Coordinator agrees (Alejandro). Screenshot on the coordinator VM: `/home/ubuntu/.cursor/projects/workspace/assets/83daa28e-659d-4154-974f-70c898ec1f17.png` (may be missing on other VMs).
8. **Classify on the web (Gate 1 question 1A).** No `standard` / `kind` field on `ApiKeyAttachablePermission`.
9. **Independent search per card (Gate 1 question 2A).** Each scopes `FeatureModuleCard` has its own toolbar.

## What ships today (problem)

Create (`ApiKeyCreateViewer`) and detail (`ApiKeyDetailViewer`) already have Role vs Scopes, a role `Select` fed by `apiKeyAttachableGrants.roles`, and one `ApiKeyScopesTable` grouped by resource slug (`apps/web/lib/api-key-scope-groups.ts` `groupScopeRows`). Attachable rows are whatever the operator holds in that project plus gated machine-only. Custom project permissions the operator holds sit in the same slug alphabet as Grant resources (`account`, `api-key`, `user`, …). That is the clutter.

The server rule is already the intended one: `ApiKeyAttenuationService.assertAttachable` / `assertCanManage` / `attachableGrants` (`apps/api/src/services/api-key-attenuation.service.ts`). This story does not change who may mint or manage a key.

Shared tables have a second, orthogonal problem: long cell content (`whitespace-nowrap` + `overflow-x-auto`) opens a horizontal scrollbar at the foot of a tall `DataTable`, and some pagination footers do not keep the page counter on the left and the nav buttons on the right. That is not a picker-only bug.

## Acceptance criteria

- [ ] **A1. Two scopes cards after Role vs Scopes.** On project-key create, choosing Scopes renders two `FeatureModuleCard`s (not one mixed table): **Grant scopes** then **Project scopes**. Same split on detail for a scope key (edit-in-place) and for a role key (read-only effective permissions). Convert-to-scopes stays one confirmed action; the resulting view uses the same two cards. Search, all/selected, column toggle, tri-state **All actions**, and the **Credentials only** badge stay on the Grant card. Project card uses the same table pattern. Do **not** flatten both into one slug-sorted list: a custom `user`-like slug must not sit between Grant `User` and `UserSession`.
- [ ] **A2. Classification is catalogue membership, not a new DB flag.** Grant = `(resource.slug, action)` is in the seeded catalogue (`ResourceSlug` + that resource’s seeded actions, including standalone `ProjectUser:ExportCredentials`). Project = everything else in the attachable (or displayed) set: a custom resource, or an extra action on a Grant resource. Rows appear only if they are already attachable / already on the key (detail may still show out-of-cohort rows disabled, as today). No `isStandard` column on `permissions` or `resources`.
- [ ] **A3. Project card omitted when empty.** Create: no Project card if the cohort has no custom rows. Detail: omit when the key (and, for edit, the attachable additions) has no custom rows. Grant card always renders on the Scopes path; empty Grant uses the existing empty state, not a hidden card.
- [ ] **A4. Labels are Grant vs Project on both workspace types.** i18n `en` + `de` under `user.apiKeys`. Personal-account create/detail must not use “Organization” (or org-only wording) on these cards. Prefer **Grant scopes** over **Organization scopes** even on organization workspaces: “Organization” can be read as org-wide access across projects, which a project key does not have. Role card copy stays “standard role / permissions you hold,” not a rank story.
- [ ] **A5. Role select unchanged in rule.** Still `apiKeyAttachableGrants.roles`. Owner sees Owner; Admin sees Admin and every standard role they cover; personal-account owner sees the account-owner role. `canAssignRole` stays out of API-key components (`api-key-create-role-card.tsx`, `api-key-actions.tsx`).
- [ ] **A6. Accordion nest inset right.** In `ApiKeyScopesTable`, permission rows (checkbox + label) sit indented under the resource group header, not left of it. Fix in the table / `fullWidthRow` / leading-column layout — do not paper over it with copy. Component test locks: a nested row’s leading cell has a strictly larger left inset than the group header’s checkbox, or the group checkbox shares the children’s column so the nest reads as children-under-parent.
- [ ] **A7. Server attenuation unchanged.** No change to `assertAttachable`, `assertCanManage`, `attachableGrants`, create, edit, rotate, revoke, or delete. Equality remains allowed; existing Owner-role / Admin-role keys stay mintable and manageable. Gate 1 locked **1A** (web classification); S2 / a cohort `standard` flag is **out**.
- [ ] **A8. Tests + docs + changeset.** Web unit/component: split (Grant vs Project, custom slug not interleaved), Project omitted when empty, accordion inset, personal-account copy has no “Organization” on those cards, Owner still listed for Owner; plus S0 table tests in A9–A10. `pnpm --filter grant-web type-check` + lint. Docs: one paragraph in `docs/core-concepts/api-keys.md` that the dashboard splits Grant vs Project scopes; do **not** rewrite ADR 0014’s equality decision. Changeset: `grant-web` **patch** (UI). No schema/API changeset (1A). Never skip husky.
- [ ] **A9. Shared `DataTable`: truncate, do not scroll sideways.** In `DataTable` / `Table` (used by every feature attach and list table, not only API-key scopes), a too-wide cell must not widen the table or show a horizontal scrollbar at the bottom of a tall body. Content cells get a max-width and ellipsis (`truncate` / `min-w-0`). The full value stays readable via native `title` and/or a tooltip (at least one; both is fine). Checkbox, icon, and actions columns stay untruncated. `table-auto w-max` / `columnWidthMode: 'min'` must not reintroduce page-level or table-container `overflow-x` for long text. Component test: a long unbreakable string in a text cell does not grow the table past its container and exposes the full string on hover/title.
- [ ] **A10. Shared pagination footer: counter left, nav right.** `Pagination` (`apps/web/components/common/pagination.tsx`) and the `FeatureModuleCard` / `CardFooter` that host it: page counter (`pagination.info`) on the **left**, previous/next on the **right**, full footer width. Fix the shared footer, not each caller. A wrapper must not shrink the pager so the two sides sit adjacent in the middle. Component test locks left/right order. Applies to every table that uses this pager (roles, groups, permissions, project apps, API keys, …).

Each slice ships Verifier-clean. Agents do not merge.

## Suggested stack slices

Web-first. Principal Engineer owns Gate 2 topology; this is the PM suggestion, not a stack plan.

| Slice    | Layer        | What                                                                                                                                                                        | When                                                         |
| -------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **S0**   | web (shared) | `DataTable` / `Table` overflow: max-width + ellipsis + title/tooltip (A9); `Pagination` + card footer: counter left, nav right (A10). All `DataTable` consumers inherit it. | Always — **before** or immediately under S1, not picker-only |
| **S1**   | web          | Split create + detail into Grant / Project cards; accordion inset; i18n `en`+`de`; classification helper; tests in A8                                                       | Always                                                       |
| **Docs** | fold into S1 | `api-keys.md` picker sentence                                                                                                                                               | Always; not its own PR unless S1 would otherwise be huge     |

No database slice. No schema/API slice (1A). No new permission, event, or route. No `canAssignRole` restoration slice.

**Recommended path:** **S0 then S1** (S0 is shared table hygiene so the picker inherits truncation and the footer; do not bury A9–A10 inside the picker PR). Web classifies from `@grantjs/constants` (1A; web already imports `machineOnlyGate` / `ResourceSlug`). Independent search per card (2A). Principal may stack S0 as `feat/<slug>-table` (or equivalent) and S1 on top; do not fold S0 into S1 unless Gate 2 explicitly collapses them and the S0 diff stays reviewable as shared table code. Another worker writes the stack plan.

## Non-goals

- **No rank restore.** Do not reintroduce `canAssignRole`, `canCarryRole`, `validateOrganizationProjectApiKeyRolePermission`, or “strictly lower than your org membership” on keys. Do not rank-filter the role select or the Grant card.
- **No project-user keys.** `projectUser` / `accountProjectUser` / `organizationProjectUser` stay as they are (`permissionIds` refused; create dialog stays).
- **No change to containment, equality, or manage.** Existing equal-rank keys are not a migration problem because rank is not coming back.
- **No `isStandard` column** and no seed/backfill job.
- **No union of role and scopes**, no convert-scopes-back-to-role, no slug scopes in the API.
- **No CDM / export / fingerprint** work; no published `@grantjs/{client,server,cli}` contract change; no `standard` / `kind` field on `ApiKeyAttachablePermission` (1A).
- **No refactor** of `RoleCreatePermissions` / `GroupCreatePermissions` / `ProjectAppCreateScopes` onto the API-key table. S0 may change shared `DataTable` / `Pagination` / cell overflow only; it does not restyle those attach tables beyond what they inherit.
- **Machine-only gate stays.** `ProjectUser:ExportCredentials` remains attachable by holders of `ProjectUser:SetPassword`; badge stays on the Grant card.

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [ ] Auth / sessions / MFA / AAL
- [x] API keys / tokens (picker for project keys; classification of attachable rows)
- [ ] Tenancy / RLS / org scoping (labels only; no scope-guard change)
- [x] Permissions / RBAC (standard vs custom split must not hide or promote the wrong rows)
- [ ] GDPR export / deletion / PII
- [ ] None of the above

**Why.** S0 is shared layout (truncation + footer). **S0: light.** S1 does not change who may mint or manage a key; a wrong split is a UX / disclosure bug, not a new grant. **S1: light**, with a Security read that custom rows cannot appear under Grant and that personal-account copy does not imply an org ladder. No S2. Gate 4 on the assembled trunk if more than one slice ships.

## Suggested active roles

Project Manager (this brief), Principal Engineer (stack plan after Gate 1), Senior Frontend (S0, S1), Senior QA, Verifier.

Senior Backend inactive (1A). Senior Security: read of S1 classification. Architect inactive: no new table, port, or attenuation rule.

## Decisions for Gate 1

Locked at approval (Alejandro, 2026-11-01):

1. **Where is Grant vs Project classified?** **A.** Web-only. Helper over attachable rows using seeded `@grantjs/constants` catalogue membership. Server stays source of truth for _what may be attached_; the UI only groups that set. No schema/API slice.
2. **Search / filter across the two cards.** **A.** Independent toolbar per card (each is already a `FeatureModuleCard`).

S0 (shared truncation + pagination footer) was already locked. Native `title` and/or tooltip both satisfy A9. Rank does not return.

## Human gate

- [x] Gate 1: Story brief approved — Alejandro, 2026-11-01: 1A (web classification), 2A (independent search per card).
- [x] Gate 2: stack plan approved — S0 implementation started.
- [ ] Gate 4: Story → `main` — not opened; agents do not merge.
