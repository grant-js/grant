# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Stack: [2026-11-19-entity-list-ux-stack.md](./2026-11-19-entity-list-ux-stack.md).

Grounded on `main` at `a8d7ed3b` (v1.30.0). Open-source language only. One patch release for the bundle.

## Metadata

- **Slug**: `entity-list-ux`
- **Date**: 2026-11-19
- **Author** (human / PM agent): PM agent, from Alejandro's feedback on v1.30.0
- **Status**: draft

## Objective

Five dashboard improvements to the entity lists (cards and table), shipped together as one patch release: the identity-link offer appears only where it can succeed, entity menus never vanish or spin, a user's email is visible at a glance, card body fields can be shown, hidden and reordered like table columns, and relationship count chips preview what they count.

## Acceptance criteria

- [ ] **A. Identity-link offer only where it can succeed.** The set-email dialog offers the link (`linkProjectUserIdentity`) only when the target user has **no authentication method** (the list already loads `authenticationMethods`). Otherwise the conflict says, in one toast, that another user has the address and this user already has its own sign-in. `Set email` itself stays for users with an Email method: it replaces their address (`operation: changed`); it is refused only when the new address belongs to someone else. The API refusal is reworded (no "remove it instead", which does not achieve the goal): "This project user has its own sign-in, so it cannot be replaced by another identity." en + de.
- [ ] **B. Entity context menus never vanish and never spin on the trigger.** In the shared `Actions` component: the trigger is always rendered and enabled; opening it shows the menu at once with a loading row while grants resolve; forbidden actions are **hidden**; when none remain, the menu shows a disabled "No actions available" row. The 13 feature menus (`api-key`, `group`, `member`, `organization`, `permission`, `project-app`, `project-sync-job`, `project`, `resource`, `role`, `tag`, `user`, `webhook-subscription`) stop returning `null` and pass their loading state through. The `webhook-subscription-actions.test.tsx` deadlock regression stays green and gains the empty-state case. en + de.
- [ ] **C. User email visible.** Users cards show the Email method's address as the card header's second line (`CardHeader.description`), when the user has one. The users table gains an **Email** column (togglable and orderable like the others, after Name by default). Users with only GitHub/Google show nothing there; the auth-method badges stay as they are.
- [ ] **D. Card body fields: show, hide, reorder.** In card view, the toolbar's column button manages the **body** fields of the cards: same menu, same persistence (per list, per browser, `localStorage`), same reset. Header (avatar, title, subtitle, actions) and footer (audit, navigation) are fixed and not listed. `CardBody` items get a stable `key`. All 14 card grids adopt it.
- [ ] **E. Relationship previews on count chips.** Hovering (after a short delay) or focusing a relationship count chip (e.g. "3 roles") fetches that one entity's relationship and shows it in a popover: up to 10 names, each a link to its detail page, and "View all" to the entity's detail page when there are more. Lazy: nothing is fetched until hover or focus; a result is cached for the session (Apollo cache). Tap opens it on touch devices. A permission or network failure shows a short "Not available" line, never an error toast. Scope: the counts on users (roles, groups, permissions, tags), roles (groups, permissions, tags), groups (permissions, tags), permissions (tags).
- [ ] **Tests + docs + changesets.** Component tests per slice; no API change except A's message. Changesets: patch `grant-web`, patch `grant-api` (A's message), patch `@grantjs/schema` if E adds operation documents (no SDL change).

## Non-goals

- Changing the identity-link rules (a target that can sign in is still refused)
- Showing forbidden actions disabled (the menu hides them, see B)
- Eager-loading relationships in list queries
- Card header or footer customisation
- New relationship fields in the GraphQL schema (E uses the existing ones)

## Risk flags

- [ ] Auth / sessions / MFA / AAL
- [ ] API keys / tokens
- [ ] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [ ] None of the above

**Why:** B changes how every entity menu shows what the current user may do (hiding stays the rule; no action may appear that the grant check refused). E reads relationships on hover: the same scoped queries and permissions as the detail pages, nothing new exposed. C shows an address the list already loads and shows on hover.

## Suggested active roles

Project Manager, Principal Engineer, Senior Frontend, Senior Backend (A's message, E's operation documents), Senior QA, Verifier.

## Open questions for Gate 1

1. **A:** you wrote that _set password_ should not be offered for users with an Email method; we read it as the **link offer** (set-email does change an existing address). Confirm, or say if you meant hiding _Set email_ / _Set password_ too.
2. **B:** hidden forbidden actions plus "No actions available" (recommended), rather than disabled items.
3. **D:** all 14 card grids in this bundle (recommended, mechanical once the infra exists), or users first.
4. **E:** the relationship list in E's scope, hover with delay plus focus and tap (recommended), and 10 items before "View all".
5. **Release:** E's new operation documents are additive exports of `@grantjs/schema`; we propose a **patch** changeset (no SDL change) to keep the bundle one patch release. Say if you want **minor**.

## Human gate

- [ ] Gate 1: Story brief approved — stop here until a human confirms before stack planning.
