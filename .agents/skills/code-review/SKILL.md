---
name: code-review
description: Review code changes against Grant Platform guardrails and layer conventions. Supports light stack, deep story→main, and security-full review bars. Use when reviewing pull requests, staged changes, or when the user asks for a code review.
---

# Code Review

Review changes against the project's layer boundaries, type conventions, and patterns. Choose a **review bar** from the stack plan or PR type (see `docs/contributing/agentic-sdlc.md`).

## Review bar

| Mode              | Use when                                             | Depth                                                                               |
| ----------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **light**         | Stack PR → story trunk (default)                     | Focus on correctness, layer boundaries, and CI; async/skim OK; still flag Criticals |
| **deep**          | Story trunk → `main`                                 | Full checklist + acceptance criteria + integration across slices                    |
| **security-full** | Auth, MFA, API keys, tenancy, RLS, permissions, GDPR | Full checklist + threat/abuse cases; involve Senior Security; blocking              |

State the mode at the top of your review output.

## Review checklist

Copy and fill as you review:

```
Code Review (bar: light | deep | security-full):
- [ ] Layer boundaries
- [ ] Type reuse from @grantjs/schema
- [ ] Handler conventions
- [ ] Service conventions
- [ ] Repository conventions
- [ ] REST / OpenAPI sync
- [ ] Web patterns
- [ ] i18n
- [ ] Error handling
- [ ] Comments (no narrative blocks; behavior in docs/README)
- [ ] Stack hygiene (single concern; correct base branch; links stack plan)  # light+
- [ ] Acceptance / integration across slices                               # deep
- [ ] Auth, tenancy, permissions, secrets, audit                           # security-full
```

## What to check

### Layer boundaries

- Handlers call **services only** — never repositories or DB directly.
- Services call **repositories only** — never DB directly.
- Repositories use only **domain-related schemas** from `@grantjs/database`.
- GraphQL resolvers and REST routes call **handlers only**.

### Type reuse

- All args, inputs, and return types should come from `@grantjs/schema` codegen (used fully, extended, or partial — e.g. `Omit<QueryXArgs, 'scope'>`).
- No manual redefinitions of types that exist in the generated schema.

### Handler conventions

- Extends `CacheHandler`.
- Queries scope IDs from cache; invalidates cache on mutations.
- Mutations wrapped in `ITransactionalConnection.withTransaction()` when atomic.
- Args follow pattern: `QueryXArgs & SelectedFields<X>`.

### Service conventions

- Extends `AuditService`; logs mutations via `logCreate/logUpdate/logSoftDelete/logHardDelete`.
- Validates input and output with zod schemas (`validateInput`, `validateOutput`).
- Args follow pattern: `Omit<QueryXArgs, 'scope'> & SelectedFields<X>`.
- Only accesses domain-related repositories.

### Repository conventions

- Extends `EntityRepository` or `PivotRepository`.
- Uses only domain-related schemas from `@grantjs/database`.
- `relations` config correctly maps joined entities.

### REST and OpenAPI

- Route, zod schema, and OpenAPI spec are **all in sync**.
- Routes use `validate()` middleware, `authorizeRestRoute()`, and `requireEmailVerificationRest()` where applicable.
- Mutation variables match `@grantjs/schema` types.

### Web patterns

- Hooks use generated operation documents from `@grantjs/schema`.
- Feature modules follow toolbar / viewer / pagination / dialog / skeleton structure.
- New UI primitives added via shadcn CLI (not manually).
- State stores are per-module and isolated.

### i18n

- All new user-facing text uses `next-intl` translation keys.
- Translation keys added to `apps/web/i18n/locales/`.

### Error handling

- Shared error types from `@/lib/errors`; no swallowed errors.
- Errors logged with cause/context.

### Stack hygiene (light and above)

- PR is one concern; not a mega-diff.
- Base branch matches the stack plan (trunk or prior slice).
- PR description links stack plan and upstream/downstream PRs when stacked.

### Deep (story→main)

- Acceptance criteria from the story brief are met.
- Slices integrate cleanly; no leftover WIP on the trunk.
- Docs/changelog expectations for release are noted if applicable.

### Security-full

- Tenant scoping and permission checks present where required.
- No secrets in code; auth/MFA/AAL elevation respected.
- Fail closed on missing authorization.
- Prefer pairing with the `senior-security` subagent (`.Codex/agents/senior-security.md`).

## Feedback format

Use severity levels:

- **Critical** — Must fix: layer violation, missing validation, broken type contract, auth/tenancy hole.
- **Suggestion** — Should consider: inconsistency with existing patterns, missing audit log, missing i18n.
- **Nit** — Optional: naming, style, minor improvements.

End with an explicit **approve / request changes / block** for the stated review bar. Do not merge PRs as an agent.
