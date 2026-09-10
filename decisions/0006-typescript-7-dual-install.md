# 0006 — TypeScript 7 dual-install until 7.1 ships a JS API

- **Status**: Accepted
- **Date**: 2026-09-10
- **Context**: TypeScript 7.0 has no programmatic API; eslint and
  `vite-plugin-dts` still import `typescript`. Dependabot PR #399 pinned
  `typescript@7.0.2` as `typescript` and broke `pnpm run build`.
- **Supersedes**: nothing.

## Context

TypeScript 7.0 ships a native `tsc` and no JavaScript compiler API. The API is
expected in 7.1. Until then, tools that `import 'typescript'` — notably
`typescript-eslint` (peer `>=4.8.4 <6.1.0`) and `unplugin-dts` — fail if the
package named `typescript` is 7.0.

Microsoft's [7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)
publishes `@typescript/typescript6` for that gap and recommends npm aliases so
`tsc` is 7 while `import 'typescript'` stays 6.

## Decision

Install both compilers side by side:

| Package name         | Resolves to                         | Role                                      |
| -------------------- | ----------------------------------- | ----------------------------------------- |
| `typescript`         | `npm:@typescript/typescript6@6.0.x` | JS compiler API (`tsc6`, eslint, dts)     |
| `@typescript/native` | `npm:typescript@7.0.x`              | Native `tsc` used by type-check and build |

The root `pnpm.overrides.typescript` pin is the wrapper, not 7, so a transitive
dep cannot silently put 7 on the `typescript` name.

`scripts/docker/build-api-production.mjs` resolves `@typescript/native/bin/tsc`
and spawns that bin directly rather than `node …/typescript/bin/tsc`.

Do not set `typescript.tsdk` to `node_modules/typescript` — the wrapper has no
`tsserver`. Editors keep using the bundled language service or
`ms-vscode.vscode-typescript-next`.

Next.js 16 defaults `experimental.useTypeScriptCli` to true and looks for
`typescript/bin/tsc`, which the wrapper does not ship. Next apps in this repo
set that flag to `false` so Next typechecks through the 6.x JS API; Turbo
`type-check` still runs native `tsc` 7.

## Removal trigger

Collapse back to a single `typescript` dependency when **all** of these are true:

1. TypeScript 7.1 (or later) ships a stable JS API.
2. `typescript-eslint` and `vite-plugin-dts` / `unplugin-dts` declare support
   for that API.
3. A clean install, lint, published-package build, and type-check pass with
   `typescript` pointing at 7 and `@typescript/native` removed.
