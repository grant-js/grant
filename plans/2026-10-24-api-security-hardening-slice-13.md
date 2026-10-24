# Slice brief

Principal Engineer issues one per active stack PR. Implementer stays inside this scope.

## Metadata

- **Story slug**: `api-security-hardening`
- **Stack plan**: `plans/2026-10-24-api-security-hardening-stack.md`
- **Slice branch**: `feat/api-security-hardening-cascade-chunk`
- **Base branch**: `feat/api-security-hardening-tenant-lists` (slice 12)
- **Owner role**: Backend
- **Review bar**: security-full
- **worktree_path**: current checkout

## In scope

- `IEventPublisher.publishMany` + `DrizzleEventPublisher` batched `event_log` insert
- `runWithOutboxBatch` so cascade `publish()` calls flush as one (chunked) insert
- `runInChunks` on `GroupHandler.deleteGroup`, `RoleHandler.deleteRole`, `PermissionHandler.deletePermission` fans
- `IAM_CASCADE_CHUNK_SIZE` (default 50)
- Keep one event per subject; do not drop events
- Tests, slice brief, patch changeset for `grant-api`

## Out of scope

- Slices 14–17
- Changing revoke payload / collapsing to a single `*.deleted`
- Cross-transaction cascade (still one transaction)
- Web files / UX

## Reference patterns

- `runWithEventSuppression` ALS
- Existing group/role/permission delete-cascade tests
- `docs/core-concepts/events-webhooks-notifications.md` cascade volume note

## Done when

- [ ] Implementation complete within this slice only
- [ ] Verifier run (typecheck / lint / tests / layers / OpenAPI as applicable)
- [ ] PR opened with correct base; links stack plan + upstream/downstream PRs
- [ ] Senior Security notified if `security-full`
