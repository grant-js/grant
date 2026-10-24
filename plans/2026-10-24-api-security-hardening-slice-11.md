# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-org-members`
- **Base branch**: `feat/api-security-hardening-gql-cost` (slice 10)
- **Owner role**: Backend
- **Review bar**: light
- **worktree_path**: current checkout

## In scope

- `OrganizationMemberRepository.getOrganizationMembers`: page members ∪ invitations in SQL (union + order + limit/offset)
- Batch-load users, roles, and invitations for the page only
- Disallow `limit: -1` on public REST and service schemas; repository still clamps as defense
- Preserve list semantics (members always included; status filters invitations only, default pending; same search; same error types)
- Tests, slice brief, patch changeset for `grant-api`

## Out of scope

- Slices 12–17
- Tenant-list materialization (slice 12 / M9)
- `getOrganizationMember` singular load
- Changing authorization outcomes
- Web files / UX

## Reference patterns

- Slice 10 `clampPageLimit` / `hasNextPageByCount`
- Webhook delivery list over-fetch page (same repository mock shape)
- Existing org-member search/status/sort contract in `organization-members.repository.ts`

## Done when

- [ ] Implementation complete within this slice only
- [ ] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified if `security-full`
