# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact. Requires an approved story brief.

Implementation-ready design (Grant Project store, not copied into this repo): `docs/project-oauth-per-app.md`. In-repo domain docs: `docs/core-concepts/project-oauth.md`. Brief: [2026-09-19-project-oauth-per-app-brief.md](./2026-09-19-project-oauth-per-app-brief.md).

## Metadata

- **Slug**: `project-oauth-per-app`
- **Story brief**: [plans/2026-09-19-project-oauth-per-app-brief.md](./2026-09-19-project-oauth-per-app-brief.md)
- **Status**: approved — Gate 2 passed 2026-09-20 by Alejandro
- **Story trunk**: `feat/project-oauth-per-app`
- **worktree_path**: current worktree unless another story is in flight — then `.worktrees/project-oauth-per-app` (Principal owns create/cleanup)

## Active roles

Only list roles that will run for this story:

- [x] Project Manager
- [x] Principal Engineer
- [x] Architect
- [x] Senior Backend
- [x] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

## Ordered slices (PRs)

Layer order: **database → schema → api → web**, then tests and docs. Auth-touching slices are `security-full`. Independent security review is **not** the author (`docs/contributing/agentic-sdlc.md` fan-out).

If the API PR is not human-reviewable, Principal **splits slice 3** at Gate 2 into `…-api-connections` (CRUD + encryption) then `…-api-runtime` (authorize/callback/app-info) before anyone writes code — do not declare both branches up front.

| #     | Branch                              | Base                         | Concern                                      | Owner role | Review bar             | PR  | Fan-out |
| ----- | ----------------------------------- | ---------------------------- | -------------------------------------------- | ---------- | ---------------------- | --- | ------- |
| 1     | `feat/project-oauth-per-app-db`     | `feat/project-oauth-per-app` | database                                     | Backend    | security-full          |     | Serial. Security reviews schema/ciphertext after Verifier, before Gate 3. |
| 2     | `feat/project-oauth-per-app-schema` | slice 1                      | schema/codegen                               | Backend    | light                  |     | Serial. Architect checks public types leak no secrets. |
| 3     | `feat/project-oauth-per-app-api`    | slice 2                      | API (ports, service, handler, GQL, REST)     | Backend    | security-full          |     | Serial write. Security + QA start after this PR exists (read-only). |
| 4     | `feat/project-oauth-per-app-web`    | slice 3                      | web/i18n                                     | Frontend   | security-full          |     | Serial. Hosted sign-in is auth UI. |
| 5     | `feat/project-oauth-per-app-tests`  | slice 4                      | tests                                        | QA         | security-full          |     | After slice 3, QA may **draft** cases in notes; code lands here on slice 4 tip. |
| 6     | `feat/project-oauth-per-app-docs`   | slice 5                      | in-repo docs + ADR                           | Architect  | light                  |     | Can overlap review of slice 5; one writer. |
| final | `feat/project-oauth-per-app`        | `main`                       | integration                                  | Principal  | deep + security-full   |     | After Gate 3; confirm trunk contains every slice. |

Prefer layer order: **db → schema → api → web**. Adjust if the story is narrower.

### Slice intent (in scope / out of scope)

**1 — database.** `packages/@grantjs/database/src/schemas/`: `project_oauth_connections` (+ audit table if following `project_app_audit_logs`). Migration via `pnpm --filter @grantjs/database db:generate`. Env keys in `packages/@grantjs/env/src/schema.ts` only if this slice must boot; otherwise env keys travel with API. **Out:** handlers, UI.

**2 — schema.** `packages/@grantjs/schema`: `ProjectOAuthConnection`, upsert/clear/query ops, `configuredProviders` on `ProjectAppPublicInfo` (`packages/@grantjs/schema/src/project-oauth.types.ts`). `pnpm --filter @grantjs/schema generate`. Core port stubs allowed if codegen needs them; implementations in slice 3. **Out:** runtime OAuth behavior.

**3 — API.** `IProjectOAuthConnectionService` + repo; encrypt helper (MFA pattern, new KDF salt); `ProjectOAuthHandler` credential resolver; widen `IOAuthProviderService`; GraphQL resolvers + REST/OpenAPI if project-apps have REST twins; `createServices` / `createHandlers` wiring; unit + integration tests for handler/service. **Out:** Next.js pages.

**4 — web.** Project connections card; hooks under `apps/web/hooks/`; hosted `auth/project/page.tsx` stops using `apps/web/lib/oauth-providers.ts` for this flow; i18n. **Out:** changing platform login buttons (those still use `/api/auth/providers`).

**5 — tests.** Remaining e2e scenarios from design §10; MFA/AAL non-regression not in scope unless this branch touches those guards (it should not).

**6 — docs.** `docs/core-concepts/project-oauth.md`, `docs/core-concepts/sign-in-providers.md`, `docs/architecture/security.md`, configuration/deployment env tables; `decisions/0008-…` ADR (number assigned at write time).

Each slice: Verifier (typecheck, lint, tests, layers, OpenAPI as applicable). Slice brief from `docs/contributing/templates/slice-brief.md` issued by Principal when the slice starts.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk
git switch -c feat/project-oauth-per-app main && git push -u origin feat/project-oauth-per-app

# Init with the FIRST slice branch only — never the whole list. Declaring unwritten
# branches up front pushes empty branches to origin and leaves them stranded when
# the slices below them move; `gh stack sync` skips branches with no PR and still
# reports success. See docs/contributing/agentic-sdlc.md § init-consequences.
gh stack init --base feat/project-oauth-per-app feat/project-oauth-per-app-db

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto                       # --auto is required in an agent shell or CI
gh stack link --base feat/project-oauth-per-app <pr> <pr>   # bottom to top; creates/grows the stack ON GitHub

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/project-oauth-per-app-schema

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions **before** writing a slice, not after — the branch you are about to work on must sit on the current tip of the slice below it:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking). **`--base` is not optional on `link` either** — omitted, it re-points the bottom PR at `main` and the whole stack merges past gate 4.

`gh stack submit --auto` opens PRs as **drafts**. Mark them ready when the slice is ready for its gate-3 review — `gh pr ready <pr>` — or reviewers will not be requested.

`gh stack merge` is a **human** command. Agents never self-merge. Merging slices one-by-one does not fill the trunk — confirm the trunk contains every slice before Gate 4 verification.

## Dependencies / notes

- **Gate 2 passed 2026-09-20 by Alejandro.** Slice 1 (database) may proceed; do not start schema/api/web until this slice’s PR exists.
- Depends on existing Google/GitHub `IOAuthProviderService` (`packages/@grantjs/core/src/ports/services/auth.service.port.ts`, `apps/api/src/services/github-oauth.service.ts`, `apps/api/src/services/google-oauth.service.ts`). Do not add a third HTTP client.
- Encryption follows `apps/api/src/lib/mfa.lib.ts` but **must not** reuse the MFA KDF salt.
- Platform secret resolution stays ADR 0004 (`ISecretResolver`) for env GitHub/Google secrets; BYO secrets are DB ciphertext, not Secrets Manager keys per tenant (v1).
- Hosted sign-in bug to fix on the web slice: `apps/web/app/[locale]/auth/project/page.tsx` currently calls `getSocialOAuthProviders()` → `GET /api/auth/providers`.
- Email project OAuth (`handleProjectCallbackEmailFlow`) has no connection row; do not regress `apps/api/tests/e2e/scenarios/project-oauth.e2e.test.ts`.
- CDM: project apps are not CDM entities today; do not export connection secrets if CDM grows.
- Product defaults if Gate 1 is silent: project grain, platform fallback on, `PROJECT_OAUTH_REQUIRE_BYO_SOCIAL` default false, dedicated encryption key, shared broker callback, `Project` Update permission.

## Human gates

- [x] Gate 2: Stack plan approved — 2026-09-20 by Alejandro.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
