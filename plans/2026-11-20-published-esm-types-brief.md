# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Stack: [2026-11-20-published-esm-types-stack.md](./2026-11-20-published-esm-types-stack.md).

Grounded on `main` at `20b4e87a` (v1.30.4 plus Dependabot #752). Diagnosis: GitHub issue [#731](https://github.com/grant-js/grant/issues/731).

## Metadata

- **Slug**: `published-esm-types`
- **Date**: 2026-11-20
- **Author** (human / PM agent): PM agent, from issue #731 (reporter [trackoor](https://github.com/trackoor); credit [UCSB PLSE](https://ucsbplse.github.io/))
- **Status**: in-progress
- **Issue**: [#731](https://github.com/grant-js/grant/issues/731)

## Objective

Published `@grantjs/client`, `@grantjs/server`, and `@grantjs/schema` type entry points resolve under `moduleResolution: "nodenext"` / `"node16"`. Consumers with `skipLibCheck: true` (NestJS default, Node’s recommended `nodenext`) type-check against real SDK types, not `any`.

## Acceptance criteria

- [ ] **A. Client and server published `.d.ts` use ESM relative specifiers.** Every relative import/export in `@grantjs/client` and `@grantjs/server` `dist/**/*.d.ts` has an explicit `.js` extension. No published declaration rewrites `@grantjs/schema` to `../../schema/src/index.ts`. Runtime JS is unchanged.
- [ ] **B. Schema published types use ESM relative specifiers.** Hand-written barrels and graphql-codegen output in `@grantjs/schema` use explicit `.js` specifiers (directory barrels as `./name/index.js`, not `./name.js`). Dual TypeScript (ADR 0006) is unchanged.
- [ ] **C. Packed-install nodenext fixture.** A fixture the current `test-install.sh` cannot catch (`require()` of JS only) type-checks a packed install with `moduleResolution: "nodenext"` and `skipLibCheck: true`, and asserts `const probe: symbol = GrantClient` is `TS2322`, plus `Scope` / `GrantModule` probes so schema re-exports cannot silently stay `any`. The Nest example stays on `Node16` and is held to the same bar.
- [ ] **D. Patch changesets** for `@grantjs/client`, `@grantjs/server`, and `@grantjs/schema`. No runtime API change.

## Non-goals

- Changing dual TypeScript (ADR 0006)
- Bundling declarations (`rollupTypes`) or switching schema off publishing `src/`
- Runtime JS / CJS emit, `exports` map shape, or a major version
- Piggybacking onto unrelated dependency PRs

## Risk flags

- [ ] Auth / sessions / MFA / AAL
- [ ] API keys / tokens
- [ ] Tenancy / RLS / org scoping
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [x] None of the above

**Why:** Types-only. Published contract hygiene. No auth, tenancy, or permission-check behavior changes.

## Suggested active roles

- Project Manager
- Principal Engineer
- Senior Backend (published-package dts / schema emit)
- Senior QA (nodenext fixture)
- Verifier

## Human gate

- [x] Gate 1: Story brief approved — stack and slice order given with issue #731 (Alejandro / Grant Project, 2026-11-20).
