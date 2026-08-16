# Story brief — `@grantjs/schema` code quality remediation

## Metadata

- **Slug**: `schema-code-quality`
- **Date**: 2026-08-16
- **Author**: PM agent (audit pass 5)
- **Status**: approved (2026-08-16, Ale Heredia)
- **Findings**: `docs/contributing/code-quality/schema.md` — **not yet written**; the evidence below is the assessment it will be built from (see § Note on how this brief was produced)

## Objective

Act on the pass-5 assessment of `packages/@grantjs/schema`: widen the guardrails to this package and lock in the two lenses that currently pass clean, turn the one-off audit queries into standing structural checks, correct a codegen dependency declaration that only works by hoisting accident, remove the small genuinely-dead surface, collapse a 3,800-line duplicate type emission **by reconfiguring the generator rather than editing its output** — and get a **recorded human decision** on the one large finding (46% of the SDL is declared but never reachable from `Query`/`Mutation`) without acting on it in this pass.

`@grantjs/schema` has **776 importing files** — more than any other unit audited so far (`core` 263, `database` 92). Everything published here is a contract in three directions at once: the GraphQL schema `apps/api` serves, the TypeScript types every layer consumes, and the npm artifact (`files: ["dist/**/*", "src/**/*"]`). That is why the large finding is scoped to a decision, not a deletion.

## What the assessment found

### What holds (lock these in — this is the highest-value output)

| Lens                | Result                                                              | Evidence                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Layer integrity | **Clean.** Zero `@grantjs/*` imports anywhere in `src/`             | `grep -rn "@grantjs/" src --include="*.ts"` (excl. `generated/`) → 0 hits. Schema sits at the bottom of the DAG with one runtime dep, `@graphql-typed-document-node/core`        |
| Codegen sync        | **Clean.** Committed generated output matches its sources exactly   | `pnpm --filter @grantjs/schema generate` → `git diff --stat` empty                                                                                                               |
| 5 — Dead documents  | **Near-clean.** 117 of 120 `*Document` exports have a real importer | Only `GetOrganizationInvitationsDocument`, `GetRoleDirectPermissionsDocument`, `GetUserDirectPermissionsDocument` have none (remaining `grep` hits are `.next/` build artifacts) |

Both green results are cheap to make permanent and expensive to rediscover. Per the rubric: _"Locking in a lens that currently passes costs nothing and is the highest-value output of a pass."_

### The large finding — SDL as an internal declaration language (Tier 3, decision only)

**36 of 54 domain folders under `src/schema/` contain `inputs/` and `types/` but no `queries/` and no `mutations/`.** By declaration count, 177 of 382 GraphQL type declarations are never referenced by any other SDL file or operation document — **and graph traversal, which slice 2 later measured, puts the real figure at 181 of 388 (46.6%)**. The grep below was a lower bound; cite 181 (stack plan correction C2).

Applying rule 2 (_a rule violation is not automatically a defect_), those 177 split cleanly:

| Group                                                | Count | What it actually is                                                                                                                                                                                                          |
| ---------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Used as generated **TypeScript** types by `apps/api` | 171   | Junction entities and their `Add*`/`Remove*`/`Query*Input` triples — e.g. `GroupPermission` + `AddGroupPermissionInput` + `RemoveGroupPermissionInput` + `QueryGroupPermissionsInput`, consumed by repositories and services |
| Genuinely unreferenced in SDL **and** in all TS      | 6     | `AccountSearchableField`, `Creatable`, `OrganizationMemberSearchableField`, `RemoveAccountProjectApiKeyInput`, `RemoveOrganizationProjectApiKeyInput`, `UpdateMyUserAuthenticationMethodInput`                               |

A sub-case worth stating separately, because it looks identical to dead code and is not: **all 14 `*SearchableField` enums have zero SDL references**, yet 12 are live _runtime values_ — repositories call `Object.values(...)` on them to configure column search (`apps/api/src/repositories/groups.repository.ts:25`, `resources.repository.ts:26`, `project-apps.repository.ts:53`, `users.repository.ts:32`). They are configuration expressed in SDL.

So the finding is not "delete 177 types." It is: **the package uses GraphQL SDL as the declaration language for artifacts that are not part of the graph**, and `apps/api/src/graphql/resolvers/index.ts:36` loads the whole directory into `makeExecutableSchema`, so every one of them ships in the served, introspectable schema. `GroupPermission` even carries field resolvers (`group(scope: Scope!)`, `permission(scope: Scope!)`) for a graph edge that was never wired.

Blast-radius note: introspection defaults off in production (`apps/api/src/config/env.config.ts:358`, `env.APOLLO_INTROSPECTION ?? !APP_CONFIG.isProduction`), which downgrades this from a disclosure issue to a design decision. The SDL still ships in the published package regardless of that flag.

### Tier 1 — rules already written, currently violated

- **`src/schema/me/` has both an `input/` and an `inputs/` directory** — 10 files in the typo'd one (`change-my-password.graphql`, `update-my-user.graphql`, …), 4 in the correct one (the MFA inputs). It works only because `loadFilesSync` recurses. Of the 54 domains, 50 have an inputs directory and every one of them spells it `inputs/`; `me` is the only domain carrying both spellings.
- **Codegen dependencies are declared wrong.** `knip --workspace packages/@grantjs/schema` reports `@graphql-codegen/client-preset` as an unused devDependency and `@graphql-codegen/typescript-operations` + `@graphql-codegen/typed-document-node` as _unlisted_ — `codegen.ts:26` names both plugins but neither is in `package.json`. They resolve today only through `client-preset`'s transitive tree. This is a real hoisting-dependent build.

### Tier 3 — drift

- **Operation file naming: 63 camelCase vs 53 kebab-case** (`src/operations/roles/updateRole.graphql` vs `src/operations/webhooks/update-webhook-subscription.graphql`). All 430 files under `src/schema/` are kebab-case, so the convention exists and only `src/operations/` departs from it.
- **Three copies of every schema type ship in the build — and the cause is the codegen configuration, not the code.** `codegen.ts:34` runs the `typescript` plugin alongside `typescript-resolvers`, so `src/generated/resolvers.ts` (7,347 lines) re-emits **463 of the 464** type names already in `src/generated/schema-types.ts` (3,812 lines). `src/index.ts:4-27` works around the resulting collision with a hand-curated 23-name export list — which is itself drift-prone: 116 `*Resolvers` types exist, 23 are exported, 11 are used.

  **The fix has to be in `codegen.ts`, and the precedent is eight lines above the problem.** The operations output already solves exactly this: `codegen.ts:25-31` sets `importSchemaTypesFrom: './src/generated/schema-types'` so `graphql.ts` imports the shared types (`import type * as Types from './schema-types'`) instead of re-emitting them — and the comment at `codegen.ts:24` records that someone already hit this failure mode once and worked around it there. The same treatment was never applied to the resolvers output. Deleting the duplicate declarations by hand would be undone by the next `pnpm generate`; changing the generator is what makes the deletion stick, and it also dissolves the `index.ts` workaround, since with no colliding identifiers the resolvers output can be re-exported normally rather than through a curated allowlist.

- **Status constants declared twice with zero consumers on the schema side.** `WEBHOOK_DELIVERY_STATUSES`, `NOTIFICATION_STATUSES`, `NOTIFICATION_PREFERENCE_SOURCES` duplicate `packages/@grantjs/database/src/schemas/notifications.schema.ts:19`, `notification-preferences.schema.ts:15,18` and `webhook-delivery-attempts.schema.ts:21` (which also back them with SQL `CHECK` constraints), while `apps/api` inlines the same literals a third time (`rest/schemas/webhook-subscriptions.schemas.ts:62`, `lib/notifications/notification-generator.consumer.ts:25`). The schema copies are the middle copy: **zero external importers.**
- **GraphQL descriptions: 35 of 430 SDL files contain any `"""` block (8%).** `.cursor/rules/schema.mdc:17` asks for tier-A descriptions "when the name alone is insufficient" — a judgement rule, so this is a number to decide a policy against, not an automatic violation.

### Tier 4 — dead surface (small, and knip cannot see it)

`knip` reports no unused exports here because `knip.json` sets `entry: ["src/index.ts"]` for `packages/@grantjs/*` — for a library package every re-export is "used" by definition. **State that blind spot next to the number** (rule 5). Measured by consumer cross-reference instead, the hand-written surface (35 exports across 8 files, 394 lines) has 8 with no external importer, and rule 4 says count them by the edit they imply:

| Edit                                           | Symbols                                                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Drop the `export` keyword (file still uses it) | `AUDIENCE_PRIMITIVES`, `AudienceRule`, `EventCatalogEntry`, `EVENT_DELIVERY_CLASSES`                                        |
| Delete the declaration                         | `NOTIFICATION_STATUSES`, `NOTIFICATION_PREFERENCE_SOURCES`, `WEBHOOK_DELIVERY_STATUSES` (see the duplication finding above) |
| Leave alone                                    | `ProjectAppScopeInfo`, `ProjectConsentInfoUser` — field types of exported interfaces                                        |

Plus: `tsconfig.build.json` is never referenced (`build` is plain `tsc`, which reads `tsconfig.json`), and `README.md` documents a `pnpm generate:watch` script that does not exist (it is `dev`) and a `src/` layout with `generated/types.ts`, `generated/operations.ts` and a `types/` directory, none of which are real.

### Lens 7 — coverage

The package has **no `test` script, no vitest, and no tests**. The rubric says run this lens as a detector, but the honest reading here is that the _unit_-testable surface is close to zero: 394 lines of hand-written TS, mostly `as const` arrays and interfaces, and the one piece with logic (`src/events/event-catalog.ts`, 214 lines) is already covered from a consumer at `apps/api/tests/unit/lib/events/event-catalog-coverage.test.ts` — the coverage claim in its header comment (`event-catalog.ts:7-8`) is accurate.

The detector for a codegen package is **structural**, not unit: build the merged SDL and assert things about it. That is where the acceptance criteria below put the effort, and it is what turns the 177-number and the 14-enum question from one-off greps into standing checks.

## Acceptance criteria

- [ ] **Findings document `docs/contributing/code-quality/schema.md` written**, evidence-first with `file:line` citations, and the pass table in `docs/contributing/code-quality/README.md:167` moved to Done. Every number in this brief is re-derived by the implementing agent rather than copied — pass 2's carried input: a brief's counts are a starting estimate, not a ceiling
- [ ] `eslint.config.mjs` gains a `packages/@grantjs/schema/src/**/*.ts` scope forbidding **all** `@grantjs/*` imports (the package has none and one runtime dep). Derive the allowed set from this package's own `package.json`, not by copying `core`'s or `database`'s rule — pass 4's carried input, where copying `core`'s verbatim broke the build. **Prove the rule fires by planting a violation**, not by a green run
- [ ] `dead-code:schema` script added and wired into `.github/workflows/ci.yml` (alongside lines 104–113) and `.husky/pre-push`. To land it green, fix the dependency declarations: drop `@graphql-codegen/client-preset`, add `@graphql-codegen/typescript-operations` and `@graphql-codegen/typed-document-node` explicitly. Re-run `pnpm --filter @grantjs/schema generate` afterwards and confirm zero diff — the plugins must still resolve without the hoisting accident
- [ ] **Codegen drift check in CI**: regenerate and fail on any diff under `src/generated/`. Verified clean today, so it lands green — and it is the only thing standing between an edited `.graphql` file and a stale committed type. Prove it fires by editing one SDL field and confirming red
- [ ] **Generated-type duplication removed at its source, in `codegen.ts`.** `src/generated/**` is never hand-edited: any de-duplication that is not expressed as a generator change is undone by the next `pnpm generate`, and the drift check added above will (correctly) fail on it. Configure the resolvers output to import the shared types from `./schema-types` rather than re-emitting them, mirroring what `codegen.ts:25-31` already does for the operations output. Then:
  - **Acceptance is a clean regeneration, not a clean diff review**: after the config change, `pnpm --filter @grantjs/schema generate` run twice must be idempotent and the drift check green, with `resolvers.ts` no longer declaring the 463 names that `schema-types.ts` owns
  - `src/index.ts:4-27`'s hand-curated 23-name resolver export list is a symptom, not a policy — with the collision gone, replace it with a normal re-export and confirm no consumer breaks. This _widens_ the exported surface (116 `*Resolvers` types vs 23 today); if that is not wanted, say so explicitly in `schema.md` and keep an allowlist deliberately rather than by accident
  - If the plugin combination cannot express this in codegen v7 (`import-types` preset, `importTypesNamespace`, or equivalent — **validate, do not assume**), that is the finding: record what was tried and why it failed, keep the current output, and leave the duplication in place. A hand-deletion is not the fallback
  - `pnpm --filter grant-api exec tsc --noEmit` is the real gate here — `apps/api` is the only consumer of the resolver types
- [ ] **Structural test suite for the package** (the coverage lens, done in the shape this unit actually takes). Requires adding `vitest` + a `test` script; keep `vi.mock` in reach for the generated barrels — pass 4's carried input on `vi.resetModules()` + large barrel imports applies here more than anywhere, this package _is_ barrel-shaped. Minimum:
  - the merged SDL from `src/schema/**` builds (`buildSchema` / `makeExecutableSchema`) — today this is only proven at API boot
  - all 116 documents under `src/operations/**` validate against it
  - ~~**every `*SortableField` and `*SearchableField` enum value is a real field on its entity type** — the live-defect detector~~ **Withdrawn during slice 2: `tsc` already enforces this.** `Array<keyof XModel> = Object.values(XSearchableField)` makes every value assignability-checked against the Drizzle model, and a planted bad value fails `pnpm --filter grant-api exec tsc --noEmit`. See correction C1 in the stack plan
  - a reachability report from `Query`/`Mutation` that pins the current unreachable count, so the Tier 3 decision below has a number that moves
  - **Mutation-check every test before counting it** — pass 4's carried input: a characterization test that has never failed characterizes nothing. Include `vi.clearAllMocks()` in `beforeEach` if any spy is used
- [ ] `src/schema/me/input/` merged into `src/schema/me/inputs/` (10 files). **The merged schema must be byte-identical afterwards** — verify with the codegen drift check, not by inspection
- [ ] Tier 4 deletions applied, split by edit type as tabled above: 4 `export` keywords dropped, 3 duplicate status constants deleted, 6 dead SDL declarations removed, `tsconfig.build.json` deleted (confirm no build path reads it first — "no references" is weak evidence for a config file, pass 4's `drizzle.config.cjs` lesson), `README.md` corrected
- [ ] The 3 unimported `*Document` exports **resolved, not assumed**. Rule 7's ambiguity applies to operation documents as well as validators: an unused document means either "superseded" or "the UI was never built." Frontend confirms which before anything is deleted
- [ ] **Tier 3 decisions recorded, code change out of scope** (each gets a paragraph in `schema.md` and, where it is a naming question, a `CONCEPTS.md` entry):
  1. The 36 graph-less domains — is SDL the right declaration language for internal junction types and repository search config, given they ship in the served schema? Options to state and cost, not to execute
  2. Operation file naming (63 camelCase / 53 kebab) — pick one, document it. Renaming 63 files is mechanical but touches every consumer import, so it is its own slice if approved
  3. GraphQL description policy at 8% coverage — decide the bar, do not backfill 400 files

  (`resolvers.ts`'s duplicate emission was a Tier 3 candidate and has been **promoted to in-scope work** above, on the condition that it is achieved through `codegen.ts`. The remaining decision inside it — whether to keep an export allowlist once the collision is gone — is folded into that criterion.)

- [ ] `pnpm --filter @grantjs/schema type-check`, lint, `dead-code:schema` and the new tests green at every slice; `pnpm --filter grant-api exec tsc --noEmit` and `pnpm --filter grant-web exec tsc --noEmit` re-checked on any slice touching exports or SDL — 776 files import this package

## Non-goals

- **Acting on the 36 graph-less domains.** This is 46% of the SDL and the largest single question in the package. It gets a decision and a number in this story; restructuring it is its own story with its own risk assessment. Deciding and acting in the same pass is exactly what Tier 3 exists to prevent.
- **Any rename that reaches a consumer** (Tier 5): `Query*Input` vs `Get*Input` (37 vs 2), `member`/`user`, or any type in the generated barrel. Glossary first.
- **Backfilling GraphQL descriptions.** Decide the policy; do not write 400 `"""` blocks under a code-quality banner.
- **Auditing — or editing — the content of `src/generated/**` (21,802 lines).** It is codegen output. Reading it line by line is not a lens, and _changing_ it is only ever done by changing `codegen.ts` or the SDL it reads. Every Tier 4 deletion in this story is therefore against one of two places: the hand-written TS (`src/events/`, `src/notifications/`, `src/webhooks/`, `src/cdm/`, `src/project-oauth.types.ts` — 394 lines total) or the `.graphql` sources. The drift check is what enforces the boundary.
- **Widening guardrails to the adapter packages** — pass 6's first slice.
- **Rewriting `apps/api/src/graphql/resolvers/index.ts`.** Its `process.cwd()`-relative `dist/schema` → `src/schema` fallback (lines 21–34) is brittle and its first candidate can never exist (`tsc` does not copy `.graphql`), but it is `apps/api` code. Recorded as owed back to pass 1's unit.

## Risk flags

- [ ] Auth / sessions / MFA / AAL — not blocking, but the `me/input` → `me/inputs` merge moves MFA input SDL. The control is the byte-identical-schema check, not a review
- [ ] API keys / tokens — two of the six dead SDL declarations are `Remove*ProjectApiKeyInput`. Confirmed unreferenced in SDL and in all TS
- [ ] Tenancy / RLS / org scoping
- [ ] Permissions / RBAC — not blocking; permission and role types are defined here but this story changes no semantics
- [ ] GDPR export / deletion / PII

**The bar is set by contract surface, not by the checklist above.** `apps/api` serves every SDL file in the directory, so _any slice that deletes or moves SDL_ changes the schema the running API exposes and carries **security-full**, independent of author. Slices touching only `eslint.config.mjs`, CI wiring, docs, or tests are `light`. The story→main gate is `deep` — 776 importers.

## Suggested active roles

- Project Manager, Principal Engineer
- **Senior Backend** — guardrails, codegen dependency fix, drift check, SDL moves and deletions, and the `codegen.ts` de-duplication. Sequence matters: the drift check lands _before_ the codegen change, so the regeneration is verified by a check that was already proven to fire rather than by the same slice that introduces it
- **Senior QA — load-bearing again.** Owns the structural test suite. Note this is the first pass where lens 7 is _not_ a unit-test assignment; the value is in the schema-level assertions — the merged SDL building, all 116 operation documents validating, and reachability pinned. ~~especially the `*SearchableField` ↔ entity-field check, which is the one plausible live defect in the package~~ — that claim was disproved in slice 2 (stack plan correction C1); the compiler already blocks it
- **Architect** — owns Tier 3 decision 1 (SDL as internal declaration language). Also owns the `AGENTS.md` DAG gap flagged below
- **Senior Frontend — advisory, blocking on one item.** Confirms the 3 unimported operation documents before deletion; `apps/web` is the primary consumer of `src/operations/**`
- **Senior Security** — any slice deleting or moving SDL
- Verifier — after each slice

## Discovered out of scope — flag for a human

**`AGENTS.md`'s package dependency graph lists 11 packages; the repo has 19.** Undocumented: `analytics` (2 importers), `cli` (0), `client` (**117**), `i18n` (17), `platform` (0), `server` (1), `telemetry` (2), `webhooks` (3). Pass 4 corrected the same document for `@grantjs/env` and the `database → constants` edge; this is the same class of finding and considerably larger — `@grantjs/client` alone has more importers than `@grantjs/database`.

Consequently `docs/contributing/code-quality/README.md:168` under-scopes pass 6: "adapter packages (`cache`, `storage`, `email`, `jobs`, `logger`, `errors`)" omits eight packages, two of which (`cli`, `platform`) have zero importers and may be dead units rather than audit targets.

Neither belongs in a `@grantjs/schema` story. Both should be a short Architect-owned doc story before pass 6 is planned.

## Note on how this brief was produced

Pass 5's lenses were run inline against `packages/@grantjs/schema` before writing this brief, and the counts above are measured, not estimated — including the codegen regeneration (clean) and the `knip` run (3 dependency findings, 0 export findings). **The findings document does not exist yet**; writing it is acceptance criterion 1 rather than a precondition, because the assessment that would fill it is what this brief summarises.

Two rubric caveats are load-bearing here and should survive into `schema.md`:

1. **`knip` is structurally blind on this package.** `entry: ["src/index.ts"]` makes every re-export "used." Its zero-unused-exports result means "not measurable this way," not "clean." The 8 findings above came from consumer cross-reference.
2. **The 177 number is a lower bound and a misleading headline.** It counts declarations unreferenced by other SDL; true unreachability from `Query`/`Mutation` is at least that — **slice 2 measured it at 181 of 388**. But 171 are live TypeScript, and 12 of the 14 `*SearchableField` enums are live runtime configuration. Reported flat, it reads as "delete half the schema," which would be wrong. `src/sdl-contract.test.ts` now pins 181, replacing the grep with a number that means something and that has to move deliberately.

## Human gate

- [x] Gate 1: Story brief approved — 2026-08-16, Ale Heredia. Stack planning may proceed.
