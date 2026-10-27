# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Follow-on to [CDM import batch apply](./2026-10-27-cdm-import-batch-apply-brief.md) ([#618](https://github.com/grant-js/grant/pull/618)). Diagnosis: [CDM import performance diagnosis](./2026-10-27-cdm-import-performance-diagnosis.md) (2026-10-27; do not re-diagnose). Local key-fanout numbers: `docs/benchmarks/cdm-import-key-fanout.md`. Stack: [2026-10-27-cdm-replace-unchanged-keys-stack.md](./2026-10-27-cdm-replace-unchanged-keys-stack.md). Copy both files into repo-root `plans/` with the first slice.

This story does **not** reopen cheaper KDF, pre-hashed CDM secrets, or merge upsert-by-`externalKey`.

## Metadata

- **Slug**: `cdm-replace-unchanged-keys`
- **Date**: 2026-10-27
- **Author** (human / PM agent): PM agent; Gate 1 approved by Alejandro
- **Status**: approved

## Objective

Stop a CDM **replace** of an already-imported key-fanout project from bcrypt-hashing every BYOK `clientSecret` every night. After #618, replace still tears down all CDM keys and recreates them, so the worker hashes the full set on every run even when the secrets did not change. A second unchanged replace must hash **zero** keys; a replace that changes one secret must re-hash **one**. Job wall-clock drops by that hash-prep phase. Import stays all-or-nothing.

## Acceptance criteria

- [x] **Measure (first slice):** On the post-#618 apply path (current `main` once #618 lands; otherwise the batch-apply trunk), extend the existing harness `pnpm --filter grant-api measure:cdm-import` (`apps/api/tests/tools/measure-cdm-import.ts`) so a **replace** of the key-fanout fixture is a first-class pass, and so **hash-prep** is a recorded phase (job logs and/or the measure tool), not folded into “import seconds.” Today `--repeat` is merge-creates-again and the tool calls `importProjectCdm` **without** `withHashedCdmApiKeySecrets`, so local −74% after #617 does not describe a worker replace on ~1-vCPU Lambda. Also run a **1-CPU** (or `UV_THREADPOOL_SIZE=1`) bench of bcrypt-10 over the fixture’s secrets so the hash-prep share is not guessed from a multi-core `Promise.all`. Publish date, HEAD, environment, snapshot / hash-prep / apply / post-commit seconds, `SyncProjectResult` counters (especially `projectUserApiKeysCreated`), and a short statement that hash-prep is or is not the remaining minutes on replace. **Do not invent a p95 or a new Lambda-fit target.** Existing tool family only; no new k6/Artillery. Disposable DB only.
- [ ] **Fingerprint + skip on replace (only if measure confirms hash-prep):** On `mode.strategy = replace`, match CDM-managed project-user API keys by importer `externalKey` and a **server-side HMAC-SHA256 fingerprint** of the BYOK secret, stored on the pivot’s `metadata.cdmImport` (never under `cdmSource`). Compare with a constant-time equality check. Classification:
  - fingerprint **equal** → **keep** (no bcrypt, no delete, no insert)
  - fingerprint **different** → **rotate** (re-hash at today’s bcrypt-10, update stored secret hash)
  - existing CDM key **missing** from the document → **delete** (same hard-delete family as today’s teardown)
  - document key with no existing row → **create** (hash + insert, as today)
    Missing fingerprint on an existing CDM key (first replace after this ships) is **rotate**, not keep: write the fingerprint, pay bcrypt once. Keys **without** an importer `externalKey` do not participate in keep/rotate; they stay teardown-then-recreate. Non-CDM keys stay untouched. Merge is unchanged (still creates new key rows). **Bonus, in the same slice if cheap:** rotate/keep preserve the existing `api_keys.id` (and `clientId` when present).
- [ ] **Fingerprint is not a secret channel:** The HMAC key is server-side (env-overridable via `apps/api/src/config/env.config.ts`, resolved like other secrets). Fingerprints are **never** exported (`export` already omits `cdmImport` / `clientSecret` — keep it that way and add a lock), **never** written to job payload / snapshot / warnings, **never** audited as values, **never** logged. Importers cannot supply a fingerprint or a pre-computed `clientSecretHash` in the CDM document. `verifySecret` still uses bcrypt; the HMAC is classification-only, not a second verifier. HMAC-key rotation fail-safes to “all fingerprints miss → all keys rotate.”
- [ ] **Counters:** `SyncProjectResult` reports API-key outcomes as **created / unchanged / rotated / deleted** (names PE picks in schema; `projectUserApiKeysCreated` counts **creates only**). A second unchanged replace of the key-fanout shape is `created = 0`, `unchanged = N`, `rotated = 0`, and `deleted = 0` when the document’s key set is identical. A replace that changes one secret is `rotated = 1` (or create+delete if stable ids are not taken) and hashes **one** secret. Password counters stay the existing compare-the-stored-bcrypt-string model (`passwordsUnchanged` already skips re-hash because the document carries hashes). Do not accept pre-hashed API-key secrets in CDM to mimic passwords.
- [ ] **Wall-clock:** After the skip lands, a second unchanged replace’s job time drops by the measured hash-prep phase (order-of-magnitude **2–4 min** on ~0.6–1 vCPU at bcrypt-10 for ~1.2k keys — slice 1 writes the number). Do not treat local 4-CPU `Promise.all` hash time as the production number. Do not lower `TOKEN_BCRYPT_ROUNDS`. Do not switch KDF.
- [ ] **All-or-nothing + e2e lock:** A failed apply leaves **no** partial key set (half rotated, half deleted, new keys without pivots). Mechanism may stay one TX, savepoints, or an equivalent rollback envelope. Classify-then-hash so an unchanged replace does **not** hash 1.2k secrets inside or outside the TX. Lambda timeout / worker abort still rolls back. End-to-end tests lock the contract; adapt the code to those tests — do not rewrite or weaken e2e to hide internals. Tests that today lock “replace deletes every CDM key then creates N” are **updated to the new product contract** (keep/rotate/delete by fingerprint), not deleted. Isolation, merge-creates-again, export-omits-secrets, rollback-on-failure, and `docs:read` after group grant stay. In particular `apps/api/tests/e2e/scenarios/project-sync-jobs.e2e.test.ts`, `project-sync-replace-teardown.e2e.test.ts`, `project-sync-by-reference.e2e.test.ts`, `project-sync-email-identity.e2e.test.ts`, and `cdm-scale-import.e2e.test.ts` stay green. Entity events stay suppressed during apply; one `project_sync.completed` / `failed` after the job. Audit stays on (redact fingerprints). RLS stays on. Do not raise `DB_POOL_MAX`. Do not set `SECURITY_ENABLE_RLS=false`.
- [ ] **Optional post-commit tail:** If, after skip-unchanged, the Lambda invocation still runs on the order of **~40 s after the job is terminal**, measure what runs after `markCompleted` (`deleteImportObject`, `invalidateCachesForImportResult`, process drain). Fix only unexpected post-commit work. Skip the slice if the tail is explained and small relative to the hash-prep win. Cache invalidate stays best-effort and must not fail the job.
- [ ] **Tests + docs:** Unit/integration for classify (keep / rotate / delete / create), missing fingerprint, missing `externalKey`, HMAC-key rotation, export/payload/audit/log redaction, and mid-apply rollback. Docs (`docs/core-concepts/cdm-import-export.md`, `apps/api/src/lib/cdm/README.md`, `docs/core-concepts/api-keys.md` if rotation ids change) describe replace key identity. Patch changeset on packages touched.

Each slice ships Verifier-clean. Agents do not merge.

## Observed problem (do not re-diagnose)

#618 batched pivots/roles and hashed BYOK secrets **outside** the import TX at bcrypt-10 (`withHashedCdmApiKeySecrets` → `hashSecretAsync`). Local measure of **merge** first+repeat on a 4-CPU host dropped ~66 s → ~17 s (−74%). That number did **not** show on a subsequent **replace** of the same key-fanout shape:

| What                 | What it actually was                                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local −74%           | Merge-create into an empty / already-full project on a multi-core host. `--repeat` is not replace. The measure path hashes **inside** import seconds and parallelizes bcrypt.                                                                              |
| Production follow-on | Same document, **`mode.strategy = replace`**, worker on ~0.6 vCPU Lambda (900 s ceiling). Job ~11 min / **576 s**.                                                                                                                                         |
| Replace apply        | `ProjectUserApiKeyCdmEntity.teardown` still lists every CDM key and `deleteApiKeysForCdmImport`, then `apply` recreates the full set. Result: **1,244 keys created** though the secrets were unchanged.                                                    |
| Hash-outside-TX      | Still hashes **every** `users[].apiKeys[].clientSecret` before the TX. On one thread that is CPU-bound; diagnosis band **~2–4 min** at bcrypt-10.                                                                                                          |
| Passwords            | Already arrive as bcrypt strings. Same replace already increments `passwordsUnchanged` (observed **451**) and does not re-hash. Keys cannot compare salted bcrypt outputs, so they need a deterministic server-side fingerprint — not a CDM-supplied hash. |
| Post-commit          | Lambda invocation lingered ~**40 s** after the job row was terminal. Smaller than hash-prep; inspect only if it remains after skip-unchanged.                                                                                                              |

Do not name customer tenants or deployments in this brief, the stack, fixtures, or later PRs.

## Non-goals

- **Lowering `TOKEN_BCRYPT_ROUNDS` or switching KDF** (SHA-256 / scrypt / Argon2, “high-entropy BYOK can be cheaper”). Product + security decision; stays out even if hash-prep is still large after skip (it should not be, on an unchanged replace).
- **Accepting pre-hashed API-key secrets in the CDM document** (importer-supplied bcrypt / HMAC / `clientSecretHash`). Internal hash-outside-TX may still pass hashes through ALS / prepared rows; that is not a document field.
- **Changing merge** to skip-create or upsert-by-`externalKey` (product: merge still creates new role/group/key rows)
- Chunking the import into multiple **committing** transactions
- Skipping audit, re-enabling per-entity webhooks / `event_log` during apply
- Turning off RLS or raising `DB_POOL_MAX`
- Fargate / `JOBS_SYNC_RUNTIME=container` as the fix
- A Rust API rewrite
- Re-doing H1–H4 or the #618 batch-apply slices
- NIST IAM maturity, IAL/AAL/FAL, OIDC OP, SAML / Active Directory
- `apps/web` product work (job payload JSON will carry new counters; no new screens)
- Published `@grantjs/{client,server,cli}` contract changes beyond additive `SyncProjectResult` fields from `@grantjs/schema`
- New load-test harness or k6/Artillery
- The queued post-#523 changeset release

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [ ] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [ ] None of the above

**Why:** Slice 2 stores a secret-derived fingerprint next to API-key pivots and changes replace teardown so unchanged keys **survive**. A wrong keep leaves a stale secret in force; a leaked fingerprint + leaked HMAC key is an offline oracle on BYOK secrets; exporting or logging the fingerprint re-opens a channel #618 just closed for plaintext. RLS on the job TX and tenant-scoped pivots stay fail-closed. Measure is light unless it ships production apply code. Password import is the analog, not the work.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior QA, Senior Security, Verifier.

Senior Frontend stays inactive (no web). Architect stays inactive unless PE stores the fingerprint in a new column / port instead of `metadata.cdmImport`, or a new `@grantjs/core` secret-fingerprint port appears.

## Human gate

- [x] Gate 1: Story brief approved — 2026-10-27 by Alejandro.
- [ ] Gate 4: Story → `main` — not opened; agents do not merge.
