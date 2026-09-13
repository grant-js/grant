# Slice 17 — store the object key, derive the URL (F-3)

**Status**: `ready` — gate 2 taken in conversation 2026-09-13, Ale Heredia, who chose
"all three columns, merge `main` first". The merge is done (`a09f1d07`); the trunk is
**0 behind `main`**.

This document is written to be executed by an agent with **no access to the conversation
that produced it**. Everything needed is here or at a named `file:line`.

## Metadata

- **Story slug**: `aws-followups-closeout`
- **Parent stack plan**: `plans/2026-09-09-aws-followups-closeout-stack.md` (follow-on 14)
- **Measurements / evidence**: `plans/2026-09-09-aws-followups-closeout-measurements.md`
  § "F-3. Picture uploads cannot complete on S3"
- **Story trunk / base branch**: `feat/aws-followups-closeout`
- **Slice branches**: `cursor/picture-storage-keys-7203` (17a, #440),
  `cursor/organization-direct-upload-7203` (17b). Grant names
  `feat/picture-storage-keys` / `feat/organization-direct-upload` remain the
  intended stack identity.
- **Pickup**: `origin/feat/aws-followups-closeout` — the Ale worktree
  `/home/logus/Sites/logusgraphics/grant-aws-followups` is **not** on the
  executing VM.
- **Owner role**: Backend (17a), Frontend + Backend (17b)
- **Review bar**: **deep** for 17a — it changes a persisted column's meaning on three
  tables and both transports. Light for 17b.
- **Blocks**: the story→main PR. Do not open gate 4 with 17a unmerged.

## The defect, and why it is not what the column width suggests

`IFileStorageService.getUrl()` on the S3 adapter returns a **presigned GET** —
`packages/@grantjs/storage/src/s3/index.ts:250`, `expiresIn: 3600`. Measured length on a
real deploy: **1275 characters**. Every picture column is `varchar(500)`:

| Table           | Column        | Definition                                                          |
| --------------- | ------------- | ------------------------------------------------------------------- |
| `users`         | `picture_url` | `packages/@grantjs/database/src/schemas/users.schema.ts:9`          |
| `project_users` | `picture_url` | `packages/@grantjs/database/src/schemas/project-users.schema.ts:31` |
| `organizations` | `picture_url` | `packages/@grantjs/database/src/schemas/organizations.schema.ts:10` |

So the insert fails and **no picture upload can complete on S3**. Proven against real S3
on 2026-09-12; see the measurements file. It is **not** caused by the direct-upload work
in part D — the base64 path fails identically, because `upload()` falls through to the
same `getUrl()` at `packages/@grantjs/storage/src/s3/index.ts:191` whenever
`STORAGE_S3_PUBLIC_URL` is unset.

**`organizations` is broken on `main` today**, independently of this story, via #431.

### Two remedies were considered and rejected. Do not re-propose them.

**Widening the column does not fix it, it hides it.** The URL expires in 3600 s. A wider
column converts a hard insert failure into an image that works for an hour and then 403s,
with nothing in the row to regenerate it from. Strictly worse than the current failure.

**Setting `STORAGE_S3_PUBLIC_URL` is not available.** It would make `getUrl()` return
`${publicUrl}/${path}` — short and stable — but it requires the uploads bucket to be
publicly readable. That bucket also carries CDM payloads, and part D deliberately kept it
off CloudFront. It cannot be made safe without splitting buckets first, which is a larger
change than this one.

## The insight that shapes the design

`picture_url` already holds **two different kinds of fact**, and only one of them is a URL
the platform owns:

1. **Externally supplied URLs** — IdP avatars from OAuth sign-in. See
   `apps/api/src/lib/oauth-picture.lib.ts`. Note `USER_PICTURE_URL_MAX_LENGTH = 500` at
   line 1: **that caller already knows about the limit and returns `null` rather than
   overflow it.** Clients can also set `pictureUrl` directly through `updateUser`
   (`apps/api/src/handlers/users.handler.ts:384`, `:476`) and profile update
   (`apps/api/src/handlers/me.handler.ts:627`).
2. **A rendered projection of an object this platform stores.** Not a durable fact at all
   — it is recomputable from the key, and on S3 it is deliberately short-lived.

The upload path is the _only_ caller that writes kind 2 into a column sized for kind 1,
and the only one without a length guard. So the fix is not to stretch the column; it is to
store the durable fact for kind 2 and keep kind 1 exactly as it is.

This is why the change is **additive**: `picture_url` keeps its meaning, a new column
carries the key, and readers prefer the key when present.

## Design

Add a nullable `picture_path` to each of the three tables. Nothing is removed or renamed.

- **Write** (uploads only): set `picture_path = <storage key>`. Leave `picture_url`
  untouched — do **not** write the presigned URL into it.
- **Read**: `effectivePictureUrl = picture_path ? await storage.getUrl(picture_path) : picture_url`.
- **Legacy rows and IdP avatars**: `picture_path` is null, so they fall through to
  `picture_url` unchanged. **No backfill migration.** Existing local-adapter rows hold a
  working `/storage/...` URL and keep working.
- Column width: `varchar(1024)`. Keys are short (`users/<uuid>/picture.jpg`); 1024 is
  headroom, not a prediction.

### Consequence to state in the PR body, not discover in review

Presigned URLs differ on every read, so a derived `pictureUrl` is **not cacheable** by
`next/image` or the browser, and it changes between two reads of the same row. Operators
who want stable URLs can set `STORAGE_S3_PUBLIC_URL`, which `getUrl()` already prefers
(`packages/@grantjs/storage/src/s3/index.ts:251`) — the derivation works unchanged in that case and yields a stable URL.
The `local` adapter is stable already (`packages/@grantjs/storage/src/local/index.ts:139`). This is a real regression in
cacheability, accepted because the alternative is a feature that does not work.

## Slice 17a — the fix

### Write sites (7). Each must store the key instead of the URL.

| #   | Site                                                                                      | Target column                        |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | `apps/api/src/handlers/me.handler.ts:235` `confirmMyUserPictureUpload`                    | `users`                              |
| 2   | `apps/api/src/handlers/me.handler.ts:261` `uploadMyUserPicture` (base64)                  | `users`                              |
| 3   | `apps/api/src/handlers/me.handler.ts:720` `confirmMyProjectMembershipPictureUpload`       | `project_users`                      |
| 4   | `apps/api/src/handlers/me.handler.ts:751` `uploadMyProjectMembershipPicture` (base64)     | `project_users`                      |
| 5   | `apps/api/src/handlers/users.handler.ts:959`–`:964` `confirmUserPictureUpload`            | `project_users` or `users`, by scope |
| 6   | `apps/api/src/handlers/users.handler.ts:995`–`:1000` `uploadUserPicture` (base64)         | `project_users` or `users`, by scope |
| 7   | `apps/api/src/handlers/organizations.handler.ts:255` `uploadOrganizationPicture` (base64) | `organizations`                      |

All seven still **return** a URL to the caller (`{ url, path }`) — that is a response
field, not a stored one, and should keep working. Derive it for the response from the key.

### Read sites

`mergeEffectiveUserProfileForProject` is the pivot-over-global rule, but it is **not**
a sufficient single hydrate point. These paths bypass it and must call
`effectivePictureUrl` / `hydratePictureUrl` themselves:

- `apps/api/src/services/me.service.ts` `getMe` → `userRepository.getUsers` →
  `accounts.owner.pictureUrl` (Me query)
- `apps/api/src/handlers/project-oauth.handler.ts` consent display (via
  `UserService.getUsers`)
- `apps/api/src/services/organizations.service.ts` `getOrganizations` /
  `validatedOrganization` — hydrate **after** `validatePage` / `validateOutput`
  of the stored row
- `apps/api/src/handlers/me.handler.ts` `toMyProjectMembership` — memberships
  are hydrated in `ProjectUserService.getUserProjectMemberships`

**Output-schema trap:** `organizationSchema.pictureUrl` is `z.string().max(500)`
for the **stored** column. Hydrate after that check. REST **response**
`pictureUrl` is `max(2048)` (`DERIVED_PICTURE_URL_MAX_LENGTH`). Request/stored
URL stays 500. `userSchema` does not include `pictureUrl`; do not add
`max(500)` to user output after derivation.

`FileStorageService` is constructed in the services factory at
`apps/api/src/services/index.ts:262`, so the storage port is already available to the
service layer. Do **not** reach for it from a repository: repositories are database access
only (`AGENTS.md` § API app layer boundaries).

`getSignedUrl` is local signing with no network round trip, so per-row derivation is
CPU-cheap — but it is still per-row work on list endpoints. If a list of N users each
derive a URL, measure it before assuming it is free; `apps/api/src/handlers/users.handler.ts:160` already gates
on `wantsPicture`, and that gate should be preserved.

### Also in 17a

- One Drizzle migration. Generate it, never hand-write:
  `pnpm --filter @grantjs/database db:generate`, then `db:migrate`.
- Three `*.schema.ts` files.
- Repository/service parameter plumbing for `picturePath`.
- `@grantjs/schema`: `pictureUrl` **stays the public field name** so no client changes are
  needed. Only add a field if the plan reviewer asks for one. If any `.graphql` document
  changes, the pinned document count in
  `packages/@grantjs/schema/src/sdl-contract.test.ts` must be updated — it is **124**
  after 17b (`request`/`confirm` organization operations). 17a preferred zero document
  changes.
- REST schemas and OpenAPI: shape unchanged if `pictureUrl` keeps its name. Verify, don't assume.

### Out of scope for 17a

- Organizations' direct-upload pair (that is 17b).
- Splitting the uploads bucket, or anything about CloudFront.
- Follow-on 10 (`confirm` can change the picture before it is recorded) — related, still open.
- Any change to `oauth-picture.lib.ts`'s 500-char guard. It is correct for its input.

## Slice 17b — organizations get the direct-upload pair

Organizations are the only upload target with no `request`/`confirm` pair; the other three
got one in part D (slices 9–11). Because of that, `main`'s org dialog had to be adapted
across the merge with a `Blob`→data-URL bridge, which exists **only** to preserve #431's
behaviour:

`apps/web/components/features/organizations/organization-picture-upload-dialog.tsx`,
`toDataUrl`. **Deleting that helper is how you know 17b is done.**

Mirror the existing pattern exactly rather than inventing one:

- Port capability and ADR: `decisions/0007-*.md`.
- Reference implementation: `requestMyUserPictureUploadUrl` / `confirmMyUserPictureUpload`
  at `apps/api/src/handlers/me.handler.ts:197` and `:221`.
- Frontend reference: `handleUploadPicture` in
  `apps/web/components/features/user/user-general-card.tsx:171`, and
  `apps/web/lib/direct-upload.ts` (`runDirectUpload`, `DirectUploadBody`,
  `DirectUploadError`).
- Failure copy: `apps/web/hooks/common/use-direct-upload-message.ts` is a
  `Record<DirectUploadFailure, string>` **on purpose** — a new failure kind is a type
  error, not a missing string. Keep it exhaustive.

## Verification standard

This story's bar is **"close findings with mutations"**: "fixed" is not a disposition. For
each claim below, name the mutation that now fails. A test that passes before and after
your change has proved nothing.

Required mutations, at minimum:

1. **Revert one write site to store `url` instead of the key** → a test must fail. Do this
   for all seven, or write one table-driven test that covers all seven.
2. **Make the read derivation prefer `picture_url` over `picture_path`** → a test must fail.
3. **Drop the `picture_path` null fallback** (always derive) → a test asserting that an
   IdP-avatar row still returns its external URL must fail.
4. **Set the presign expiry to something long** — this must _not_ make any test pass that
   was failing, i.e. no test may depend on expiry. If one does, it is testing the clock.

Beyond mutations:

- `pnpm --filter @grantjs/database db:generate` must produce **no** second migration when
  run twice (idempotence).
- An e2e test that a >500-character derived URL round-trips. **Run e2e from the repo root
  with the wrapper** — `pnpm test:e2e` — never `pnpm --filter grant-api test:e2e` unless
  the stack is already up (`AGENTS.md` § Testing).
- The pre-push gauntlet runs on `git push` and takes **~8–10 minutes**. Budget for it;
  do not background-kill it.

### The real proof is a deploy, and it is cheap now

F-3 was found on AWS and cannot be fully closed on LocalStack: **LocalStack community does
not verify SigV4 at all** (ADR 0007 divergence index entry 9), so a local presigned URL
proves nothing about length or expiry. The account is at baseline and the deploy path is
known-good; a single cycle confirming one upload completing end to end is the closing
evidence. Deploy authorisation for this account was given for this story on 2026-09-11
("If we need to deploy to AWS via CDK that's perfectly fine in order to measure and gather
evidence") — **re-confirmed 2026-09-13** ("Let's now deploy the AWS stack and prove it
works"). The confirming Cloud Agent run had no `grant-cdk` credentials and could not
place onto `logusgraphics-ubuntu`; see measurements F-3. Run the recipe below on that
worker.

Deploy recipe that worked, from `deploy/aws/`:

```
AWS_PROFILE=grant-cdk pnpm exec cdk deploy --all \
  -c appUrl=https://proof.grantjs.org -c zoneName=grantjs.org \
  -c hostedZoneId=Z0558018P345EAI1WA8P -c account=972374872669 \
  -c region=eu-central-1 -c ephemeral=true -c syncRuntime=container
```

## Traps this story actually hit. Read before starting.

- **`eslint --fix` silently rewrites `import type` into a value import.** That shipped a
  CI-only `ERR_MODULE_NOT_FOUND` once. After any commit (lint-staged runs `--fix`),
  re-check type-only imports — especially for optional peer deps.
- **`process.env` is lint-forbidden in `apps/api/src`.** Route configuration through
  `@grantjs/env`'s schema and `apps/api/src/config/env.config.ts`.
- **Git's auto-merge produced a clean merge that did not compile** (the org dialog above).
  After any merge, run `pnpm type-check` — conflict markers are not the only conflicts.
- **`/tmp` is a 31 GB tmpfs and CDK tests stage into it.** Leftover `grant-cdk-tests*`
  dirs once filled it and 30 deploy tests failed with `EDQUOT`/`error -122`, which looks
  exactly like a code regression. Check `df -h /tmp` before believing a deploy-test failure.
- **`aws logs describe-log-groups --query 'length(logGroups)'` returns one number per
  page.** Any count from it is wrong unless you paginate. Same class of error for any
  `length()` over a paginated AWS list.
- **Verify greps with a positive control.** A `grep AUTH_MFA .env` check once matched a
  comment line and reported a false negative. Pin with `^KEY=` and include a value you
  know is present so "0 matches" means something.
- **zsh does not word-split unquoted variables**, so `set -- $pair` in a loop does not do
  what it does in bash.

## Done when

- [x] 17a: all seven write sites store the key; derivation covers users, project_users and
      organizations on **both** GraphQL and REST
- [x] 17a: every mutation in § Verification standard named and failing
- [ ] 17a: migration idempotent; `pnpm codegen:check` clean; full gauntlet green
- [x] 17a: PR based on `feat/aws-followups-closeout`, links this plan, **deep** review bar (#440)
- [x] 17b: organizations have `request`/`confirm`; `toDataUrl` deleted (#441)
- [x] F-3b: do not cache-bust SigV4 `pictureUrl` (#442)
- [x] Parent stack plan updated: 17a/17b/F-3b **merged to trunk**; follow-on 14 closed
- [x] Measurements file: F-3 closed on unit/e2e; Cycle 3 deploy proved confirm + display
- [x] Cacheability consequence stated in the 17a PR body

## Open questions for whoever picks this up

1. **Is `pictureUrl` in a GraphQL list query allowed to cost a signature per row?**
   `apps/api/src/handlers/users.handler.ts:160` gates on `wantsPicture`, so the cost is opt-in — but a client
   requesting `pictureUrl` over 500 users now does 500 signings. Measure; if it matters,
   memoise per request or add a batch derive.
2. **Should `updateUser({ pictureUrl })` clear `picture_path`?** Setting an external URL
   while a stored object remains referenced is ambiguous. Current recommendation: yes,
   clear it, because the client's explicit URL should win — but this is a product call and
   it is not obvious. Whatever is chosen, assert it.
3. **Does any client depend on `pictureUrl` being stable across two reads?**
   `apps/web` stores it in zustand stores and patches it after upload
   (`organization-picture-upload-dialog.tsx`). Rotating URLs may cause visible re-fetches.
