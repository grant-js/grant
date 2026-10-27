# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Story brief: [2026-10-27-cdm-replace-unchanged-keys-brief.md](./2026-10-27-cdm-replace-unchanged-keys-brief.md). Prior story: [CDM import batch apply](./2026-10-27-cdm-import-batch-apply-stack.md) ([#618](https://github.com/grant-js/grant/pull/618)). Diagnosis: [CDM import performance diagnosis](./2026-10-27-cdm-import-performance-diagnosis.md) (do not re-diagnose). Local merge baseline: `docs/benchmarks/cdm-import-key-fanout.md` (first+repeat **merge** on 4 CPUs; **not** the replace number).

Gates 1–2 approved by Alejandro 2026-10-27. Copy this brief + stack into repo `plans/` on the trunk with the first slice.

## Metadata

- **Slug**: `cdm-replace-unchanged-keys`
- **Story brief**: `plans/2026-10-27-cdm-replace-unchanged-keys-brief.md` (store copy linked above; copy into repo `plans/` with the first slice)
- **Status**: approved
- **Story trunk**: `feat/cdm-replace-unchanged-keys` from `main` **after #618 lands**. If Gate 4 of batch-apply is still open, do not root this stack on `main` until that merge; do not silently stack on `feat/cdm-import-batch-apply`.
- **worktree_path**: not required unless another writer is on `main` / another story trunk in the same checkout

**Slug justification:** names the outcome — a replace of unchanged CDM API keys must not re-hash them — not a tactic (`hmac-fingerprint`, `skip-teardown`). Follows the prior story’s problem-shaped slug (`cdm-import-batch-apply`).

## Active roles

Only list roles that will run for this story:

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [x] Senior Backend
- [ ] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

Architect stays off the roster unless the fingerprint leaves `metadata.cdmImport` for a new column or a new `@grantjs/core` port. None expected: HMAC helper + import-only classify on existing `IApiKeyService` / `IProjectUserApiKeyService` / `ICdmEntityHandler`. HTTP `createApiKey` / `rotate` stay as they are. Activate Architect then, before writing that slice.

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**. `gh stack add` the next branch when that slice starts — never declare the whole list up front.

Slice 3 is **optional**: PE decides at the end of slice 2 from post-commit numbers. Cheaper KDF, pre-hashed CDM secrets, and merge upsert are **not** slices — see [Out of this stack](#out-of-this-stack).

| #     | Branch                                        | Base                              | Concern                                         | Owner role | Review bar                                            | PR  |
| ----- | --------------------------------------------- | --------------------------------- | ----------------------------------------------- | ---------- | ----------------------------------------------------- | --- |
| 1     | `feat/cdm-replace-unchanged-keys-measure`     | `feat/cdm-replace-unchanged-keys` | Replace + hash-prep baseline (1-CPU / job logs) | Backend    | light                                                 |     |
| 2     | `feat/cdm-replace-unchanged-keys-fingerprint` | prior slice                       | HMAC fingerprint + skip unchanged on replace    | Backend    | security-full                                         |     |
| 3     | `feat/cdm-replace-unchanged-keys-postcommit`  | prior slice                       | post-commit tail — **optional**                 | Backend    | light (security-full if invalidate isolation changes) |     |
| final | `feat/cdm-replace-unchanged-keys`             | `main`                            | integration                                     | Principal  | deep + security-full                                  |     |

Prefer layer order: **db → schema → api → web**. This story has **no db migration** (fingerprint lives on existing pivot `metadata.cdmImport`) and **no web**. Schema codegen for additive `SyncProjectResult` counters **folds into slice 2** (a few GraphQL fields + `pnpm --filter @grantjs/schema generate` + REST zod / OpenAPI). Do not open a standalone schema PR for three integers.

**Collapse rules:** Do not fold slice 1 into 2 (measure must exist before we store secret-derived bytes). Slice 2 may be **skipped** only if slice 1 shows hash-prep is _not_ the remaining minutes on replace — record the skip; do not silently omit. If hash-prep _is_ confirmed, slice 2 is required even if someone would rather lower bcrypt rounds (that remains out). Slice 3 may be skipped the same way when the ~40 s tail is explained or gone.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk — only after Alejandro Gate 1–2 and after #618 is on main
git switch -c feat/cdm-replace-unchanged-keys main && git push -u origin feat/cdm-replace-unchanged-keys

# Copy store plans into repo if they are not there yet:
#   plans/2026-10-27-cdm-replace-unchanged-keys-brief.md
#   plans/2026-10-27-cdm-replace-unchanged-keys-stack.md

# Init with the FIRST slice branch only — never the whole list.
gh stack init --base feat/cdm-replace-unchanged-keys feat/cdm-replace-unchanged-keys-measure

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto
gh stack link --base feat/cdm-replace-unchanged-keys <pr> <pr>   # bottom to top

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/cdm-replace-unchanged-keys-fingerprint
# later, unless skipped:
gh stack add feat/cdm-replace-unchanged-keys-postcommit

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions **before** writing a slice, not after — the branch you are about to work on must sit on the current tip of the slice below it:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking) (repo path once this file lives in `plans/`). **`--base` is not optional on `link`**. `gh stack submit --auto` opens PRs as **drafts**. Mark ready with `gh pr ready <pr>` for gate 3.

Never skip husky (`--no-verify`, `HUSKY=0`). Open PRs as `grantjs-agent` via `GRANTJS_AGENT_TOKEN` / `gh`. Agents never self-merge.

## Slice notes

### 1 — Measure (what does _replace_ hash-prep cost?)

- Owner files: `apps/api/tests/tools/measure-cdm-import.ts`, `apps/api/tests/helpers/cdm-scale-fixtures.ts` (`generateKeyFanoutCdm` — keys already carry stable `key:` / `externalKey` values), `apps/api/src/jobs/project-sync.job.ts` (log a hash-prep duration around `withHashedCdmApiKeySecrets` if that is the chosen probe; logs must not include secrets, hashes, or fingerprints), committed write-up next to the existing baseline (`docs/benchmarks/cdm-import-key-fanout.md` addendum or a sibling page — PE picks at slice start). Command family: `pnpm --filter grant-api measure:cdm-import`. Disposable DB only.
- Today: harness `--repeat` is **merge** into the same project. After #617 the local 4-CPU host reported first **17.35 s** / repeat **17.20 s** (−74% vs slice-1 65.73 s). That path does **not** call `withHashedCdmApiKeySecrets`, so bcrypt sits inside import seconds and parallelizes on libuv. Production follow-on is **replace**: teardown deletes every CDM key, apply creates **1,244**, worker hashes every secret on ~0.6 vCPU, job **576 s**. Passwords on that job already reported **unchanged** (hashes compared as stored strings).
- Outcome:
  1. Add a **replace** pass of the key-fanout fixture (import once, then import the same document with `mode.strategy = replace` + `confirmDestructive`). Keep merge `--repeat` so the two strategies are not confused.
  2. Split **hash-prep** seconds from snapshot / apply / post-commit (`markCompleted` → `invalidateCachesForImportResult` → return). Worker-shaped path (`withHashedCdmApiKeySecrets` then TX) is the number that must match job logs.
  3. Run at least one **1-CPU** or `UV_THREADPOOL_SIZE=1` hash-prep of the fixture secrets at `TOKEN_BCRYPT_ROUNDS=10`. Multi-core `Promise.all` is not the Lambda number.
  4. Record date, SHA, environment, every `SyncProjectResult` counter, and a one-line verdict: hash-prep **is** / **is not** the remaining minutes on unchanged replace. Refuse a vacuous pass.
- **Do not invent p50/p95/p99. Do not publish a new Lambda-fit SLA.** Diagnosis 2–4 min stays order-of-magnitude until this slice writes a number.
- Light review. Security is not required unless this slice ships production classify/fingerprint code (measure + logs + docs only). Structured logs: duration + counts, never secrets.
- **UX:** no web files.
- **Fan-out:** none. Serial; one writer.
- **Slice-1 start (2026-10-27):** Write-up is `docs/benchmarks/cdm-import-key-fanout-replace.md`. Worker-shaped `--replace key-fanout` on disposable PostgreSQL 16 (no Docker). One-thread hash-prep **55.80 s** (1,124 secrets, 49.6 ms/secret, bcrypt-10). Worker async hash-prep **14.04 s** of a **17.90 s** replace; apply **3.74 s**; post-commit **0.00 s**. `projectUserApiKeysCreated` **1,124** on replace. **Verdict: hash-prep is the remaining minutes on unchanged replace — slice 2 is required.** Do not lower rounds.

### 2 — Fingerprint + skip unchanged keys on replace (security-full)

- Owner files: `apps/api/src/lib/cdm/entities/project-user-api-key.cdm-entity.ts` (`teardown` today deletes all CDM ids; `apply` always creates), `apps/api/src/lib/cdm/hash-cdm-api-key-secrets.lib.ts` (today hashes **every** document secret before the TX), `apps/api/src/services/api-keys.service.ts` (`createApiKeysForCdmImport`, `deleteApiKeysForCdmImport`; rotate-in-place if the bonus is taken), `apps/api/src/services/project-import.service.ts` (replace still calls every handler `teardown` then `apply`), `apps/api/src/constants/cdm-import.constants.ts` (`buildCdmImportMetadata`, `extractProjectUserMetadataForCdmExport`), `apps/api/src/lib/token.lib.ts` (bcrypt stays; HMAC is a new helper, not a KDF substitute), `apps/api/src/config/env.config.ts` (HMAC secret). Schema: `packages/@grantjs/schema/src/schema/projects/types/sync-project-result.graphql` plus operation documents / REST zod / OpenAPI that list `projectUserApiKeysCreated`. Tests: CDM entity / registry / replace-teardown e2e listed in the brief.
- Today: replace = full key teardown + full recreate + bcrypt-10 × N. `projectUserApiKeysCreated += input.length`. Export omits `clientSecret` and `cdmImport`. Password `postApply` already increments `passwordsUnchanged` when the stored bcrypt string equals the document.
- Outcome:
  - **HMAC-SHA256** of the BYOK secret with a server-side key. Store hex/base64 digest on the pivot under `metadata.cdmImport` (field name PE picks; not `cdmSource`). Timing-safe compare. Importers cannot set it.
  - **Classify by `externalKey` before any bcrypt.** Hash **only** create + rotate. Unchanged replace hashes **0**. `withHashedCdmApiKeySecrets` must not keep hashing the whole document on replace once classify is available.
  - **Teardown/apply pairing:** key teardown can no longer delete-all-then-recreate. Either teardown deletes only missing `externalKey`s and apply keeps/rotates/creates, or key teardown becomes a no-op and apply owns the set-diff. Other handlers keep today’s replace teardown. The whole import stays one rollback envelope.
  - **Counters** (codegen in this slice): created / unchanged / rotated / deleted. `projectUserApiKeysCreated` = creates only. Additive fields — do not remove the existing created counter.
  - **Redaction lock:** fingerprint absent from export, snapshot, job payload, warnings, audit `newValues` / `oldValues`, and logs. Add tests that would fail if `extractProjectUserMetadataForCdmExport` or payload redact started passing `cdmImport` through.
  - **Bonus:** keep/rotate preserve `api_keys.id` (and existing `clientId`). If this fights the current `updateClientSecretHash` / delete-batch shape, ship skip-unchanged first and record “stable ids deferred” — do not block the hash-prep win.
  - **First replace after ship:** no fingerprints → rotate (or create+delete), write fingerprints, pay bcrypt once. Second unchanged replace: hash 0, `unchanged = N`.
  - **Keys without `externalKey`:** no keep/rotate; leftover teardown+recreate. Document it. The key-fanout fixture already has `key:` values — keep them stable across the replace pass.
- **Out of this slice:** cheaper KDF, lower rounds, CDM-supplied hashes, merge skip-create, new DB column, web UI for the new counters.
- **Atomicity:** classify, hash of the small remainder, writes, and snapshot stay in the same all-or-nothing envelope as today. Do not commit fingerprints in a transaction that can survive a failed apply. Do not set `SECURITY_ENABLE_RLS=false`. Do not raise `DB_POOL_MAX`.
- **E2e lock:** update tests that encode delete-all-then-create-N on replace to the new contract. Do **not** weaken export-omits-secrets, isolation, rollback, or merge-creates-again. Preferences: implementation adapts to locked tests; the contract change is the new expected behavior, not an internal rewrite of e2e.
- Tests: classify matrix; missing fingerprint; HMAC secret rotation (all rotate); mid-apply throw rolls back keeps/rotates/deletes already staged in the envelope; second replace hashes 0 (spy `hashSecretAsync` / `hashSecret`); one changed secret hashes 1; non-CDM keys survive; `clientId` uniqueness still fail-closed on create. Security-full review (independent Security, not the author) **before** gate 3 ([Agentic SDLC § Fan-out](../docs/contributing/agentic-sdlc.md#fan-out-parallelism)).
- **UX:** no web files. Job result JSON grows additive ints; existing UIs that only show `projectUserApiKeysCreated` will correctly show `0` on an unchanged replace.
- **Fan-out:** independent Security + Verifier on this slice after the author stops writing; they share the tree (no second worktree).

### 3 — Post-commit tail (optional)

- Owner files: `apps/api/src/jobs/project-sync.job.ts` (`markCompleted` → `deleteImportObject` → `invalidateCachesForImportResult` → return), `apps/api/src/services/project-import.service.ts` `invalidateCachesForImportResult` (sequential entity-cache deletes + optional auth-result prefix). Slice 1’s post-commit seconds are the oracle.
- Today: diagnosis called this **seconds**. Follow-on saw the Lambda **invocation** linger ~40 s after the job row was terminal. That may be cache invalidate, object delete, runtime freeze, or work _after_ `markCompleted` that the job status does not include.
- Outcome (only if still needed after slice 2): explain the tail in the measure write-up; fix only **unexpected** post-commit work (e.g. a second walk of the key set, a blocking hash, a retry loop). Do not turn cache invalidate into a second all-or-nothing TX. Failure of invalidate stays logged and must not fail the job. Adapter-correct prefix-delete (memory / Redis / DynamoDB trailing `*`) if this slice touches cache keys — preferences.
- Skip if slice 1+2 show the tail is explained (runtime drain, best-effort invalidate of ~11 members) and small next to the hash-prep win. Record the skip.
- Review: light unless invalidate isolation or which scopes are cleared changes — then security-full.
- **UX:** no web files.

## Out of this stack

These are explicit **non-slices**. Do not add them under a “while we’re here” at slice start.

| Item                                                                                 | Why it stays out                                                                                                           |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Lower bcrypt rounds / cheaper KDF / SHA-256 of the secret as the stored verifier** | Alejandro: do not. Fingerprint is classification-only. `TOKEN_BCRYPT_ROUNDS` stays 10.                                     |
| **Pre-hashed secrets in the CDM document**                                           | Passwords already work that way (ADR 0010). Keys do not. An importer-supplied hash is not a substitute for skip-unchanged. |
| **`mode.onConflict` / merge upsert-by-`externalKey`**                                | Product: merge still creates. This story is **replace only**.                                                              |
| **Fargate / `JOBS_SYNC_RUNTIME=container`**                                          | Ops hatch (ADR 0002). Does not stop nightly bcrypt of unchanged keys.                                                      |
| **RLS off / `DB_POOL_MAX` bump**                                                     | Apply holds **one** connection.                                                                                            |
| **Rust rewrite / H1–H4**                                                             | Platform rules; they barely touch this worker path.                                                                        |
| **Skipping audit / re-enabling entity webhooks**                                     | Contract. Audit must redact the new fingerprint.                                                                           |
| **Committing partial graphs**                                                        | All-or-nothing.                                                                                                            |
| **New fingerprint column / table**                                                   | User-asked store is pivot `cdmImport` metadata. A column is an Architect activation, not a silent extra slice.             |
| **Web counters UI**                                                                  | Additive JSON is enough.                                                                                                   |

## Dependencies / notes

- **Depends on #618** (batch apply + hash-outside-TX). Trunk from `main` after that Gate 4 merge.
- Slice 1 before 2 so we do not store HMAC material until hash-prep is confirmed as the remaining minutes on **replace**.
- Slice 2 before 3 — a 40 s tail is in the noise if we are still hashing ~1.2k secrets.
- Slice 3 last and optional.
- **Atomicity:** keep import all-or-nothing. Classify + remainder-hash + writes + snapshot roll back together.
- **E2e lock (preferences):** implementation adapts to locked tests; contract tests that encode delete-all-on-replace are updated, not gutted.
- **No customer tenant names** in repo plans, benchmarks, fixtures, PRs, or docs (preferences 2026-10-27). Shape language only: key-fanout replace, ~1.2k CDM keys.
- Copy this brief + stack into repo `plans/` on the trunk (or slice 1) **after** Alejandro approves Gates 1–2.
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.
- Fan-out that is free: Security and Verifier on slice 2 after the author stops writing. Do not put two writers in one tree.

## Human gates

- [x] Gate 2: Stack plan approved — 2026-10-27 by Alejandro.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep + security-full review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Remote slice branches deleted
- [ ] Remote story trunk deleted
- [ ] Stack plan status → `merged-to-main`
