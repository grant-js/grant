# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Requires the approved brief: [2026-11-17-detail-entity-links-brief.md](./2026-11-17-detail-entity-links-brief.md).

## Metadata

- **Slug**: `detail-entity-links`
- **Story brief**: `plans/2026-11-17-detail-entity-links-brief.md`
- **Status**: in-progress
- **Story trunk**: `feat/detail-entity-links` from `main`
- **worktree_path**: the story's own Claude Code worktree
- **Release**: **patch** on `grant-web`. UI only. Each slice carries its own changeset.

## Active roles

- [ ] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [ ] Senior Backend
- [x] Senior Frontend
- [x] Senior QA
- [ ] Senior Security
- [x] Verifier

## Ordered slices (PRs)

No database, schema or API slice. Tests and i18n live in the slice they cover.

| #     | Branch                              | Base                       | Concern                                                                                                                            | Owner role | Review bar | PR  |
| ----- | ----------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | --- |
| 1     | `feat/detail-entity-links-tables`   | `feat/detail-entity-links` | Shared detail go-to column + `aria-label` i18n; user roles/groups/permissions, role groups/permissions, group permissions          | Frontend   | light      |     |
| 2     | `feat/detail-entity-links-specials` | prior slice                | Permission → resource link (project scope only); API key Project scopes rows; app scope rows (unique `resource:action` match only) | Frontend   | light      |     |
| final | `feat/detail-entity-links`          | `main`                     | integration                                                                                                                        | Principal  | deep       |     |

## Design notes

- One column factory, `detailEntityLinkColumn`, in its own module (`components/common/detail-entity-link-column.tsx`) so `detail-table-layout.tsx` keeps no dependency on Next navigation: key `navigation`, empty header, `DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH`, rendering `EntityNavigationButton` with a per-row `aria-label`. An empty header already makes a column non-toggleable and non-movable, so it stays last.
- API key: `ApiKeyScopesTable` gets an opt-in prop; only the Project scopes card of a scope-based key passes it.
- App scopes: `ScopeSlugOption` carries the permission ID when exactly one project permission matches the slug (the query already fetches `id`).
- Permission → resource: render the link only when the route has a `projectId`.

## Tests

- Vitest (jsdom): the column renders a link with the right `href` for the organization-project and account-project scopes, plus its `aria-label`; it is absent from the column picker.
- Slice 2: resource link present in project scope and absent at organization level; Project scopes rows have links and Grant scopes rows do not; app scope link only on a unique match. Extend `api-key-scopes-table.test.tsx` and `api-key-scopes.test.tsx`.
- `en`/`de` parity for the new keys.
- No web e2e exists (e2e is API-only). Manual check in the local dev server before any PR, with local test data only.

## Human gates

- [x] Gate 2: Stack plan approved — operator asked to implement and validate locally before any PR (2026-11-17).
- [ ] Gate 3: Stack PRs merged into trunk.
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
