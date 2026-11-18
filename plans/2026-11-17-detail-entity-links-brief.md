# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Open-source language only — no customer tenants, deployments or data.

## Metadata

- **Slug**: `detail-entity-links`
- **Date**: 2026-11-17
- **Author** (human / PM agent): requested by an operator; drafted by agent
- **Status**: approved (gate 1, 2026-11-17)

## Objective

On every dashboard detail page, a related entity that has its own detail page gets a go-to link, so operators move user → role → permission → resource without going back to a list and searching.

## Starting point

- `EntityNavigationButton` (`apps/web/components/common/entity-navigation-button.tsx`) and `getEntityDetailUrl` (`apps/web/lib/entity-detail-url.ts`) already build scope-aware detail links (organization project, personal-account project, organization).
- Every list table puts that button in a trailing `navigation` column (`DATA_TABLE_OPEN_BUTTON_COLUMN_WIDTH`). One detail card already does: the API keys card on the user detail page (`components/features/api-keys/api-key-viewer.tsx`).
- The organization and account route trees render the same `*DetailViewer` components, so each change lands once.

## Acceptance criteria

- [ ] **User detail**: Roles, Groups and Permissions tables have a trailing go-to column linking to that role, group or permission.
- [ ] **Role detail**: Groups and Permissions tables have the column (project and organization level).
- [ ] **Group detail**: Permissions table has the column (project and organization level).
- [ ] **Permission detail**: the resource in the general card links to the resource detail page, in project scope only (resources have no organization-level route).
- [ ] **API key detail**: rows in the **Project scopes** card link to the project permission. The **Grant scopes** card (seeded catalogue) and role-based keys' permissions get no link.
- [ ] **App detail**: a scope row links to its project permission when exactly one project permission has that `resource:action`; otherwise it shows no button.
- [ ] The go-to sits on every row (attached or not), last, and cannot be hidden or moved by the column picker.
- [ ] It is a real link: keyboard-focusable, Enter opens it, Cmd/Ctrl-click and middle-click open a new tab. Nothing forces `target=_blank`.
- [ ] Each link has an `aria-label` naming the entity type and the row's name, in `en` and `de`.
- [ ] Create views (`*-create-*`) do not get links: they would navigate away from an unsaved form.

## Non-goals

- Tags: they have no detail page. A tag detail page is a separate story.
- The "Source" column (via role / via group) stays plain text.
- The per-entity list wrappers (`RoleNavigationButton`, …) and their labels are not changed.
- No schema, API or database change.

## Risk flags

- [ ] Auth / sessions / MFA / AAL
- [ ] API keys / tokens — UI links only; no change to what a key may hold
- [ ] Tenancy / RLS / org scoping — links reuse the existing scope-aware URL helper
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [x] None of the above

## Suggested active roles

Principal Engineer, Senior Frontend, Senior QA, Verifier.

## Human gate

- [x] Gate 1: Story brief approved (2026-11-17).
