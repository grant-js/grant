# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Story brief: [2026-11-20-published-esm-types-brief.md](./2026-11-20-published-esm-types-brief.md). Gates 1–2 approved with issue #731 (Alejandro / Grant Project, 2026-11-20).

Grounded on `main` `20b4e87a`. Issue: [#731](https://github.com/grant-js/grant/issues/731).

## Metadata

- **Slug**: `published-esm-types`
- **Story brief**: `plans/2026-11-20-published-esm-types-brief.md`
- **Status**: in-progress
- **Story trunk**: `feat/published-esm-types` from `main`
- **worktree_path**: this session's worktree; one writer

## Active roles

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [x] Senior Backend
- [ ] Senior Frontend
- [x] Senior QA
- [ ] Senior Security
- [x] Verifier

## Ordered slices (PRs)

Init `gh stack` with slice 1 only; `gh stack add` each next branch when it starts. Do not PR slices to `main`.

| #     | Branch                             | Base                       | Concern                                                                                    | Owner role | Review bar | PR                                                 |
| ----- | ---------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------ | ---------- | ---------- | -------------------------------------------------- |
| 1     | `feat/published-esm-types-dts`     | `feat/published-esm-types` | A: client + server dts emit — `.js` relative specifiers, no `@grantjs/schema` path rewrite | Backend    | light      | [#770](https://github.com/grant-js/grant/pull/770) |
| 2     | `feat/published-esm-types-schema`  | prior slice                | B: schema ESM specifiers including codegen                                                 | Backend    | light      | [#771](https://github.com/grant-js/grant/pull/771) |
| 3     | `feat/published-esm-types-fixture` | prior slice                | C: packed-install nodenext fixture the current `test-install.sh` cannot catch              | QA         | light      | [#772](https://github.com/grant-js/grant/pull/772) |
| final | `feat/published-esm-types`         | `main`                     | integration                                                                                | Principal  | deep       |                                                    |

**Collapse rules:** do not fold 1 into 2 (SDK emit is reviewable apart from schema source/codegen). Do not fold 3 into 1 (the packed nodenext fixture is the regression the current install script misses). Dual TypeScript unchanged (ADR 0006). Prefer specifier hygiene over `rollupTypes: true`.

## Slice notes

### 1 — SDK dts emit (A) — GP-183

- `@grantjs/client` and `@grantjs/server` `vite.config.ts` `vite-plugin-dts`: keep `@grantjs/schema` as a package specifier in `.d.ts` (`aliasesExclude: ['@grantjs/schema']`, or equivalent). Do not emit `../../schema/src/index.ts`.
- Emit explicit `.js` extensions on relative dts specifiers (`beforeWriteFile`). Do not add `.js` in `src/` in this slice — that is emit hygiene, not a source rewrite.
- Patch changeset for `@grantjs/client` and `@grantjs/server`.
- Update the published-packages open item that records the schema path rewrite.
- In-repo coupling: the Nest example is `Node16` + `skipLibCheck: true`. After dts emit, it follows real SDK types into schema's published `.ts` barrels and fails `TS2834` until slice 2. Slice 1 temporarily uses `moduleResolution: "bundler"` on that example so the slice is husky/CI green; slice 2 reverts it to `Node16`.

### 2 — Schema ESM specifiers (B) — GP-184

- Hand-written barrels in `@grantjs/schema` (`src/index.ts`, `src/events/index.ts`, and any other relative re-exports): add `.js` extensions. Directory barrels must be `./name/index.js`, not `./name.js`.
- Codegen (`codegen.ts` + generated files): `importSchemaTypesFrom` / `add` plugin import lines use `./schema-types.js`.
- Revert the Nest example to `module` / `moduleResolution` `Node16`.
- In-repo Next apps that `transpilePackages` schema (`grant-web`, `grant-config`) need webpack `resolve.extensionAlias` for `.js` → `.ts` (Turbopack has no equivalent). `next build --webpack`.
- Patch changeset for `@grantjs/schema`.

### 3 — Packed nodenext fixture (C) — GP-185

- Packed-install type-check with `moduleResolution: "nodenext"` and `skipLibCheck: true` (`scripts/test-published-nodenext.sh`, `pnpm run test:published-nodenext`).
- Assert `const probe: symbol = GrantClient` is `TS2322`, plus `Scope` / `EventData` / `GrantModule` probes so schema re-exports and directory barrels cannot silently stay `any`. Fail on `TS2834`/`TS2835` in published `@grantjs` sources.
- Point the Nest example at the same bar (already `Node16`).
- Wired after `build` in `.husky/pre-push` and after type-check in CI. The current `test-install.sh` only `require()`s JS and cannot catch this.
- No changeset: test/CI gate only. Patch changesets for the published packages landed in slices 1–2.

## Stack setup

As the template: trunk `feat/published-esm-types` from `main`, `gh stack init --base feat/published-esm-types feat/published-esm-types-dts`, `gh stack submit --auto` + `gh stack link --base feat/published-esm-types …` after each slice, `gh stack add` before the next. Commit with `git -c core.hooksPath=.husky commit`, run `sh .husky/pre-push` and `pnpm release:check` before each push. Open/push as `grantjs-agent` via `GRANTJS_AGENT_TOKEN`. Never skip husky. Agents never merge.

## Human gates

- [x] Gate 2: Stack plan approved — issue #731 slice order (Alejandro / Grant Project, 2026-11-20).
- [ ] Gate 3: Stack PRs merged into trunk.
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
