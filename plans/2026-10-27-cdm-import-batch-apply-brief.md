# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Source: [CDM import performance diagnosis](./2026-10-27-cdm-import-performance-diagnosis.md) (2026-10-27; diagnosis only — do not re-diagnose). ADR 0002 already named the missing story: a **batch apply** path (multi-row inserts, set-based existence, no per-edge HTTP-mutation loop) while the import stays **all-or-nothing**. Stack: [2026-10-27-cdm-import-batch-apply-stack.md](./2026-10-27-cdm-import-batch-apply-stack.md). Copy both files into repo-root `plans/` with the first slice.

## Metadata

- **Slug**: `cdm-import-batch-apply`
- **Date**: 2026-10-27
- **Author** (human / PM agent): PM agent; Gate 1 approved by Alejandro
- **Status**: approved — Gate 3 passed 2026-10-27 by Alejandro; Gate 4 open

## Objective

Cut wall-clock of key-fanout CDM imports (1,124 user API keys, 1,883 `users[].roles` listings, 494 group→permission links, 11 users, 7 roles, 57 groups) without changing what the job is allowed to leave behind. Today `ProjectSyncJob.apply` walks the document like ~3,000 sequential service calls inside one transaction; this story replaces the **apply mechanism** (batch pivots/roles, then keys if we can without a security product decision, then snapshot/repeat if measure still needs it). **Counters, tenant isolation, merge/replace, and rollback-on-failure stay the same.** The import remains all-or-nothing: one transaction, savepoints, or an equivalent rollback envelope — never committing a partial permission graph.

## Acceptance criteria

- [ ] **Measure (first slice):** On current `main`, run the existing harness `pnpm --filter grant-api measure:cdm-import` (`apps/api/tests/tools/measure-cdm-import.ts`) against a disposable DB (e2e stack). Record first-pass and `--repeat` for a **key-fanout** fixture: 11 users, 7 roles, 57 groups, 494 group→permission links, 1,124 BYOK API keys, 1,883 role listings. Existing `CDM_SCALE_PROFILES` are the inverse shape (many users, 0–1 key each) and do **not** stand in for key-fanout — add a dedicated profile/generator, do not reuse `enterprise` / `entropy-bound` as the story number. Publish date, HEAD, environment, snapshot vs apply seconds, `SyncProjectResult` counters, and a short statement/round-trip sketch. **Do not invent a p95 or a new Lambda-fit target.** Diagnosis shares (~11 min first import on Lambda→RDS; bcrypt-10 at 80–200 ms/hash; 20k–30k statements) stay order-of-magnitude until this slice writes numbers. Existing tool only; no new k6/Artillery.
- [ ] **Batch pivots and roles:** User-role assignment, group→permission links, and project/user/group/role existence checks no longer require one `addUserRole` / `addGroupPermission` / full-list `get*` chain per document listing. Duplicate `users[].roles` keys (key-fanout: 1,883 listings against 7 templates × 11 users) may be collapsed at expand/apply so unique pairs are written once; **counter semantics stay today’s `SyncProjectResult`** — if e2e or locked unit tests count listings including duplicates, keep incrementing per listing and only change unit tests that encode the old sequential call shape. Merge still creates new role/group rows (do not invent upsert-by-`externalKey`). Replace teardown still removes CDM-managed rows then applies. Isolation and allow outcomes after import stay as e2e locks them.
- [ ] **Keys without a product/security decision:** If slice 2 + measure show keys still dominate, batch `createApiKeyForCdmImport` + `addProjectUserApiKey` (multi-row insert, set membership) and/or hash **outside** the open import transaction (or async/worker at **today’s bcrypt cost**, default `TOKEN_BCRYPT_ROUNDS` = 10). Every imported `clientSecret` is still hashed before persist. **Do not drop hashing. Do not switch KDF. Do not lower rounds.** A cheaper KDF for high-entropy BYOK is a **later product/security decision**, not this stack.
- [ ] **Snapshot / repeat only if still needed:** After pivots/roles (and keys if taken), if `--repeat` is still dominated by `exportProjectCdm` of the graph just written — or by merge creating another full copy — PE may add a snapshot/repeat slice (memoize list-all inside the import TX, cheaper snapshot of identities, or documented first-vs-repeat model). Skip the slice if measure after slice 2/3 already meets the wall-clock goal. Do not honor `mode.onConflict` / upsert as a stealth product change.
- [ ] **All-or-nothing + e2e lock:** A failed apply leaves **no** partial authz graph (roles without grants, keys without pivots, half a user set). The _mechanism_ may change (single TX as today, savepoints, or an equivalent rollback envelope that the worker still treats as one job). **Do not** chunk into committing partial graphs. Lambda timeout / worker abort still rolls back. End-to-end tests lock the contract; adapt the code to those tests — do not rewrite or weaken e2e to match new internals. In particular `apps/api/tests/e2e/scenarios/project-sync-jobs.e2e.test.ts` (merge/replace, snapshot, payload), `project-sync-replace-teardown.e2e.test.ts` (`docs:read` after group grant; stagger `deleted_at`), `project-sync-by-reference.e2e.test.ts`, `project-sync-email-identity.e2e.test.ts`, and `cdm-scale-import.e2e.test.ts` stay green with the same counters, isolation, and rollback-on-failure. Entity events stay suppressed during apply; one `project_sync.completed` / `failed` after the job. Audit stays on. RLS stays on. Do not raise `DB_POOL_MAX`. Do not set `SECURITY_ENABLE_RLS=false`.
- [ ] **Tests + docs:** Unit/integration that encode “one service call per edge” are updated to the batch shape — that is not an e2e rewrite. Docs that describe import atomicity (`docs/core-concepts/cdm-import-export.md`, `apps/api/src/lib/cdm/README.md`, ADR 0002 consequences if the envelope changes) match the new path. Duplicate `users[].roles` behavior is documented if expand dedupes. Patch changeset on packages touched.

**Wall-clock goal:** a **significant** cut on the key-fanout first import versus the diagnosis (~11 minutes on Lambda→RDS) and a recorded first-vs-repeat pair so a later attempt is not a surprise timeout. Slice 1 writes the baseline; later slices write the after. Do not treat ADR 0002’s 62.3 min / 28,880-entity run as the key-fanout number (inverse shape: many entities, few keys). Do not treat Fargate as the speedup.

Each slice ships Verifier-clean. Agents do not merge.

## Non-goals

- **Fargate / container runtime / `JOBS_SYNC_RUNTIME=container`** — ops and already the ADR 0002 hatch so a 11–25+ minute job can _finish_. Not a slice; does not make this apply path fast.
- **Cheaper KDF for BYOK API-key secrets** (drop bcrypt-10, switch to SHA-256 / scrypt / Argon2, or lower rounds). Product + security decision; stays out of this stack even if keys still dominate after batch insert.
- Chunking the import into multiple **committing** transactions (partial permission model)
- Skipping audit, re-enabling per-entity webhooks / `event_log` during apply
- Turning off RLS or moving tenant checks only into application `WHERE` (`SECURITY_ENABLE_RLS` stays default true)
- Raising `DB_POOL_MAX` as the fix (apply uses **one** connection)
- Raising `CDM_IMPORT_MAX_ENTITIES` as a “fix” (default 5,000 would not have refused key-fanout; it omits keys and links)
- Honoring `mode.onConflict` or upsert-by-`externalKey` so a merge skip-creates (product behavior; merge today always creates new role/group/key rows)
- Changing `countCdmEntities` / the entity cap unless PE names it as docs-only clarification
- A Rust API rewrite
- Re-doing H1–H4 (HTTP authorize / list). Those paths barely touch the worker apply loop.
- NIST IAM maturity, IAL/AAL/FAL, OIDC OP, SAML / Active Directory
- `apps/web` product work (jobs list / import-export UI already enqueue; no new screens)
- Database schema / migrations (unless PE names an index after measure — optional, not required)
- `@grantjs/schema` codegen unless a counter or input field must change — prefer not to
- Published `@grantjs/{client,server,cli}` (job envelope and `SyncProjectResult` stay)
- New load-test harness or k6/Artillery (measure uses `measure-cdm-import`)
- The queued post-#523 changeset release

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [ ] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [ ] None of the above

**Why:** Slice 2 changes how roles, groups, and project pivots are linked — a wrong batch insert or a committed half-graph is an authorization bug. Slice 3 touches BYOK `clientSecret` hashing and `api_keys` / `project_user_api_keys` writes. The job TX still `SET LOCAL` RLS; isolation must stay fail-closed. Measure is light unless it ships production code. Password hashes (already bcrypt, batched in `postApply`) are not in the key-fanout counters and stay out.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior QA, Senior Security, Verifier.

Senior Frontend stays inactive (no web). Architect stays inactive unless a new `@grantjs/core` port appears (e.g. batched `IUserRoleService` / `ICdmEntityHandler.apply` shape beyond today’s per-row services). HTTP interactive `addUserRole` / `createApiKey` stay as they are; import may grow import-only batch methods on existing ports.

## Human gate

- [x] Gate 1: Story brief approved — 2026-10-27 by Alejandro.
- [ ] Gate 4: Story → `main` — open [#618](https://github.com/grant-js/grant/pull/618); agents do not merge.
