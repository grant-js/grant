# Code quality: `packages/@grantjs/schema`

Pass 5. Audited 2026-08-16 against `main` @ `0b2b80aa`.

- **Brief**: [`plans/2026-08-16-schema-code-quality-brief.md`](https://github.com/grant-js/grant/blob/main/plans/2026-08-16-schema-code-quality-brief.md)
- **Stack plan**: [`plans/2026-08-16-schema-code-quality-stack.md`](https://github.com/grant-js/grant/blob/main/plans/2026-08-16-schema-code-quality-stack.md) — including its [corrections log](https://github.com/grant-js/grant/blob/main/plans/2026-08-16-schema-code-quality-stack.md#corrections)

## Summary

The most-imported unit in the repo: **776 files import `@grantjs/schema`**, against 263 for `core` and 92 for `database`. Everything published here is a contract in three directions — the GraphQL schema `apps/api` serves, the TypeScript types every layer consumes, and the npm artifact (`files: ["dist/**/*", "src/**/*"]`).

It is also the first unit where the architecture is sound and the _generator configuration_ was the defect. The largest single win in the pass was not a refactor: `codegen.ts` was emitting every schema type twice, and one config change removed 3,780 lines.

|                                         | Before                      | After                                               |
| --------------------------------------- | --------------------------- | --------------------------------------------------- |
| `src/generated/resolvers.ts`            | 7,347 lines                 | 3,548                                               |
| Exported type declarations in it        | 599                         | 138                                                 |
| Resolver types reachable via the barrel | 23 (hand-curated allowlist) | 115 (`export *`)                                    |
| SDL files                               | 430                         | 425                                                 |
| Declared GraphQL types                  | 388                         | 382                                                 |
| Unreachable from `Query`/`Mutation`     | 181                         | 175                                                 |
| **Reachable from `Query`/`Mutation`**   | **207**                     | **207**                                             |
| Operation documents                     | 116                         | 115                                                 |
| Tests                                   | 0                           | 120                                                 |
| Guardrails covering this package        | 0                           | 3 (ESLint DAG, `dead-code:schema`, `codegen:check`) |

Three lenses were clean before the pass and are now locked in rather than merely noted.

## What holds {#what-holds}

| Lens                    | Result                                                                                    | Evidence                                                                                                                                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Layer integrity     | **Clean.** Zero `@grantjs/*` imports anywhere in `src/`                                   | The package sits at the bottom of the DAG with one runtime dependency, `@graphql-typed-document-node/core`. Now enforced by a `no-restricted-imports` pattern rule (`eslint.config.mjs`), proven to fire by planting a `@grantjs/core` import |
| 2 — Import discipline   | **Clean.** No deep relative paths across package boundaries; intra-package relatives only | —                                                                                                                                                                                                                                             |
| Codegen sync            | **Clean.** Committed output matched its sources exactly                                   | Now enforced by `pnpm codegen:check` in CI and pre-push, proven to fire by planting an SDL field                                                                                                                                              |
| 5 — Operation documents | **Near-clean.** 117 of 120 `*Document` exports had a real importer                        | The 3 without one were all superseded, not unbuilt — see [Tier 4](#tier-4-dead-surface)                                                                                                                                                       |

## Tier 1 — Guardrail gaps {#tier-1-guardrail-gaps}

### The guardrails did not reach this package — **Resolved** (slice 1)

`eslint.config.mjs` covered `apps/api`, `apps/web`, `core`, and `database`; `dead-code:*` likewise. Neither reached `schema`.

**The allowed set here is narrower than any predecessor, not wider.** Pass 4's carried input warns that copying `core`'s rule broke the build because `database` legitimately depends on `env` and `constants`. The inverse applies here: schema depends on _nothing_ in the workspace, so the rule is a `patterns` group banning `@grantjs/*` outright rather than a `paths` list. A pattern also covers a new workspace package on the day it is created.

### `codegen.ts` declared its plugins by accident — **Resolved** (slice 1)

`codegen.ts:26` named `typescript-operations` and `typed-document-node`; `package.json` declared neither. Both resolved only through `client-preset`'s transitive tree — a hoisting-dependent build. Declared explicitly, `client-preset` dropped, and regeneration afterwards was byte-identical, which is what proves the explicit versions are the ones that were already running.

## Tier 3 — Divergent styles {#tier-3-divergent-styles}

### 3.1 SDL as an internal declaration language — **open decision**

**36 of 54 domain folders under `src/schema/` have `inputs/` and `types/` but no `queries/` and no `mutations/`.** After this pass, **175 of 382 declared types (45.8%) cannot be reached from `Query` or `Mutation`.**

Applying rule 2 — a rule violation is not automatically a defect — that 175 is not a deletion list:

| Group                                                              | What it is                                                                                                                                                                                                      |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Junction entities and their `Add*`/`Remove*`/`Query*Input` triples | Consumed as generated **TypeScript** by `apps/api` repositories and services. `GroupPermission` even carries field resolvers (`group(scope: Scope!)`, `permission(scope: Scope!)`) for a graph edge never wired |
| 12 of the 14 `*SearchableField` enums                              | Live **runtime configuration**: repositories call `Object.values()` on them to set searchable columns (`apps/api/src/repositories/groups.repository.ts:25`)                                                     |
| The `Searchable` interface                                         | Unreferenced in SDL, but consumed as a generated type by `repositories/common/EntityRepository.ts` and `lib/cdm/cdm-internal.types.ts`                                                                          |

So the finding is not "delete half the schema." It is that **GraphQL SDL is being used as the declaration language for artifacts that are not part of the graph**, and `apps/api/src/graphql/resolvers/index.ts:36` loads the entire directory into `makeExecutableSchema` — so all 175 ship in the served schema.

Introspection defaults off in production (`apps/api/src/config/env.config.ts:358`), which keeps this a design question rather than a disclosure one. The SDL ships in the published npm package regardless of that flag.

The count is pinned by `src/sdl-contract.test.ts` so it moves deliberately. **Options and costs are in [Recorded decisions](#recorded-decisions).**

### 3.2 Operation file naming — **open decision**

**62 camelCase vs 53 kebab-case** under `src/operations/` (`updateRole.graphql` vs `update-webhook-subscription.graphql`). All 425 files under `src/schema/` are kebab-case, so the convention exists and only `src/operations/` departs from it.

### 3.3 GraphQL description coverage — **open decision**

**35 of 425 SDL files (8.2%) contain any `"""` block.** `.cursor/rules/schema.mdc:17` asks for tier-A descriptions "when the name alone is insufficient" — a judgement rule, so this is a number to set a policy against, not an automatic violation.

## Tier 4 — Dead surface {#tier-4-dead-surface}

**State `knip`'s blind spot next to its output.** `knip.json` sets `entry: ["src/index.ts"]` for `packages/@grantjs/*`. For a library package that makes every re-export "used" by definition, so knip reports **zero** unused exports here _by construction_. Its zero means "not measurable this way," not "clean." Everything below came from cross-referencing consumers instead.

Counted by the edit each implies (rule 4), all resolved in slices 4 and 5:

| Edit                                                     | Items                                                                                                                                                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SDL declarations deleted                                 | `AccountSearchableField`, `Creatable`, `OrganizationMemberSearchableField`, `RemoveAccountProjectApiKeyInput`, `RemoveOrganizationProjectApiKeyInput`, `UpdateMyUserAuthenticationMethodInput` |
| Declarations deleted (TS)                                | `NOTIFICATION_STATUSES`, `NOTIFICATION_PREFERENCE_SOURCES`, `WEBHOOK_DELIVERY_STATUSES`                                                                                                        |
| Converted to union types (runtime array was dead weight) | `EVENT_DELIVERY_CLASSES`, `AUDIENCE_PRIMITIVES`                                                                                                                                                |
| `export` keyword dropped                                 | `AudienceRule`, `EventCatalogEntry`                                                                                                                                                            |
| Files deleted                                            | `tsconfig.build.json` (build is plain `tsc`, which reads `tsconfig.json`)                                                                                                                      |
| Operations removed                                       | `GetOrganizationInvitations`, `GetRoleDirectPermissions`, `GetUserDirectPermissions`                                                                                                           |

**The three status constants were the middle of three copies.** `@grantjs/database` declares them and backs them with SQL `CHECK` constraints (`notifications.schema.ts:19`, `notification-preferences.schema.ts:15,18`, `webhook-delivery-attempts.schema.ts:21`); `apps/api` inlines the same literals a third time (`rest/schemas/webhook-subscriptions.schemas.ts:62`, `lib/notifications/notification-generator.consumer.ts:25`). The schema copies had zero importers, and the types `apps/api` actually uses (`NotificationStatus`, `WebhookDeliveryStatus`) already come from `@grantjs/database`. Deleting the unused copy is the whole fix — importing `database` from `schema` would invert the DAG, and slice 1's rule now blocks it. **`apps/api`'s third copy is an `apps/api` finding, recorded not actioned.**

**An unused operation document is ambiguous evidence** — rule 7 applies to documents as much as to validators. All three resolved to _superseded_, not _never built_:

| Document                     | Superseded by                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `GetUserDirectPermissions`   | `getUsers.graphql` already selects `userPermissions`; consumed at `apps/web/components/features/user/user-permissions.tsx:160` |
| `GetRoleDirectPermissions`   | `getRoles.graphql` already selects `rolePermissions`                                                                           |
| `GetOrganizationInvitations` | `GetOrganizationMembers` returns a unified member+invitation list (`apps/web/hooks/members/use-members.ts:60,86`)              |

Two of the three lived in files whose sibling mutations are alive. Deleting by filename would have removed `AssignUserPermission`/`RevokeUserPermission`.

## Tier 6 — Coverage {#tier-6-coverage}

### The lens does not take its usual shape here

Zero tests before the pass. But the _unit_-testable surface is genuinely near zero: 394 lines of hand-written TS, mostly `as const` arrays and interfaces, and the one piece with logic (`src/events/event-catalog.ts`) was already covered from a consumer at `apps/api/tests/unit/lib/events/event-catalog-coverage.test.ts`. Padding this package with tests for constant arrays would have produced a coverage number and no information.

The detector for a codegen package is **structural**. `src/sdl-contract.test.ts` (120 tests, 366 ms) asserts:

- the merged SDL builds — previously first proven at API boot
- all 115 operation documents validate against it
- the count of types unreachable from the root is exactly 175
- the count of operation documents is exactly 115

**Pins, not floors.** The operation count was written as `>= 116` first and passed silently when slice 5 removed a document. Both counts are now exact so a change has to be made deliberately.

**All 120 were mutation-checked** before being counted (pass 4's carried input): an added unreachable type fails the pin 176≠175, a mistyped operation field fails validation with the exact message, and unparseable SDL exits 1. That last one fails by collection error rather than assertion, so the exit code was checked specifically — otherwise the build assertion would have been vacuous in CI.

**Pass 4's barrel warning did not apply, by construction.** The fixture reads SDL off disk and never imports a generated barrel, so there is no `vi.resetModules()` cost to avoid.

## What this pass's method surfaced {#what-this-passs-method-surfaced}

Two claims in this pass's own planning documents were disproved by implementing them. Both are written up in full in the stack plan's [corrections log](https://github.com/grant-js/grant/blob/main/plans/2026-08-16-schema-code-quality-stack.md#corrections); the transferable lessons:

**C1 — check assignability before claiming a silent failure.** The brief called the `*SearchableField` ↔ column contract "the one plausible live defect" and attached a conditional `security-full` bar to it. `tsc` already enforces it: repositories assign `Object.values(XSearchableField)` to `Array<keyof XModel>`, and a planted bad value fails `grant-api`'s type-check with TS2322. This is pass 3's carried input — _when the compiler can distinguish the change, the compiler is the review_ — which the stack plan quoted approvingly one slice before failing to apply it. **Quoting a rule is not applying it.**

**C2 — a grep labelled "lower bound" is a lower bound.** The audit reported 177 unreachable declarations from SDL cross-referencing. Graph traversal said 181. The number was cited five times before it was measured.

**A third, about the shape of a fix.** The duplicate type emission was visible for a long time as _code_ — 3,800 duplicated lines and a hand-curated allowlist working around them — and invisible as _configuration_. The lens that finds it is asking, for any generated artifact, "what would the generator have to be told to stop producing this?" A hand-deletion would have been reverted by the next `pnpm generate`; the drift check added in slice 1 would have caught that, which is why the drift check landed _before_ the change that depended on it.

## Recorded decisions {#recorded-decisions}

### D1 — SDL as an internal declaration language: **open, Architect-owned**

The 175 unreachable declarations are one decision, not 175. Options:

| Option                                                                                                                                               | Cost                                                                                                    | Consequence                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Leave as is.** Record that SDL is the declaration language for internal types too                                                                  | Zero                                                                                                    | 45.8% of the served schema stays unreachable. Introspection is off in production, but the SDL ships in the npm package |
| **Split the directory.** `src/schema/` for graph SDL; a second directory for internal declarations, fed to codegen but not to `makeExecutableSchema` | Moderate — needs a loader change in `apps/api/src/graphql/resolvers/index.ts` and a codegen input split | The served schema shrinks to what is reachable. Generated TS is unchanged, so `apps/api` does not move                 |
| **Promote them to the graph.** Add the missing queries/mutations for the 36 domains                                                                  | Large, and mostly unwanted — these are junction tables                                                  | Removes the anomaly by making the graph much bigger                                                                    |
| **Move internal types out of SDL** into hand-written TS                                                                                              | Large; loses codegen for ~171 types                                                                     | Cleanest conceptually, most disruptive                                                                                 |

**Recommendation: option 2, as its own story, not now.** It gets the served-schema benefit without touching the generated TypeScript that 776 files depend on. Option 1 is a legitimate choice if the introspection default is considered sufficient — but it should be _chosen_, not inherited.

### D2 — Operation file naming: **open**

62 camelCase vs 53 kebab-case; `src/schema/` is 100% kebab-case.

**Recommendation: adopt kebab-case, in its own PR, not in this pass.** The convention already exists and only `src/operations/` departs from it. The rename is mechanical but touches every consumer import, so it wants a dedicated diff a reviewer can read as "renames only." A lint rule can then hold it.

### D3 — GraphQL description policy: **open**

35 of 425 files carry any description.

**Recommendation: keep the tiered rule as written and do not backfill.** `schema.mdc`'s tiers are a judgement standard, and 8% is what a judgement standard produces when most type names are self-describing (`UserSessionPage`, `AddGroupTagInput`). The useful change is narrower: require a description on any _new_ type whose name does not carry its meaning, and leave the existing 390 alone. Backfilling 400 files under a code-quality banner would produce noise, not documentation.

## Backlog

- **`apps/api`'s third copy of the notification/webhook status literals** — `rest/schemas/webhook-subscriptions.schemas.ts:62` and `lib/notifications/notification-generator.consumer.ts:25` inline what `@grantjs/database` already declares. Out of scope here; belongs to an `apps/api` slice.
- **`packages/@grantjs/database` leaks its test-support module into the production image.** `scripts/docker/build-api-production.mjs` compiles `src/**/*` per package; the shared `packages/@grantjs/tsconfig.build.json` excludes `*.test.ts` but not `src/test-support/`, which holds plain modules. Pass 5 fixed schema's copy in its own `tsconfig.build.json`; `database` has the identical shape and was left alone as out of scope. The durable fix is one pattern in the shared parent.
- **D1, D2, D3** above, each its own story if adopted.
