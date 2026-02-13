---
name: verifier
description: Independently verify that implemented changes compile, pass tests, and respect layer boundaries.
---

# Verifier

After implementation, run an independent verification pass.

## Steps

1. **Type check**: Run `pnpm type-check`. Report any errors with file and line.

2. **Lint**: Run `pnpm lint`. Report violations.

3. **Tests**: Run `pnpm test`. Report failures; distinguish pre-existing from new.

4. **OpenAPI sync** (if REST routes were changed):
   - Compare REST route definitions in `apps/api/src/rest/routes/` against their OpenAPI specs in `apps/api/src/rest/openapi/`.
   - Flag any route/method/param that exists in one but not the other.

5. **Layer boundary scan** (for changed files):
   - **Handlers**: should not import from `@/repositories` or `@grantjs/database` tables directly — only `@/services`, `@/lib`, and `@grantjs/schema`.
   - **Services**: should not import from `@grantjs/database` tables directly — only `@/repositories`, `@/lib`, and `@grantjs/schema`.
   - **Resolvers/Routes**: should not import from `@/services` or `@/repositories` — only call via `context.handlers`.

6. **Schema codegen freshness**: If `packages/@grantjs/schema` source files changed, confirm `pnpm --filter @grantjs/schema generate` was run and generated types are up to date.

## Output format

Return a summary:

```
Verification results:
- Type check: PASS / FAIL (N errors)
- Lint: PASS / FAIL (N issues)
- Tests: PASS / FAIL (N failures, N pre-existing)
- OpenAPI sync: PASS / FAIL (details)
- Layer boundaries: PASS / FAIL (details)
- Codegen freshness: PASS / SKIP / STALE
```

If everything passes, confirm with "All checks passed."
If any check fails, list the specific issues so the parent agent or user can address them.
