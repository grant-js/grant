# Stack plan

Copy into `plans/YYYY-MM-DD-<slug>-stack.md`. Principal Engineer owns this artifact. Requires an approved story brief.

## Metadata

- **Slug**:
- **Story brief**: `plans/YYYY-MM-DD-<slug>-brief.md`
- **Status**: draft | approved | in-progress | integrated | merged-to-main
- **Story trunk**: `feat/<slug>`
- **worktree_path**: (required if another story is in flight) e.g. `../grant-platform-<slug>` or `.worktrees/<slug>`

## Active roles

Only list roles that will run for this story:

- [ ] Project Manager
- [ ] Principal Engineer
- [ ] Architect
- [ ] Senior Backend
- [ ] Senior Frontend
- [ ] Senior QA
- [ ] Senior Security
- [ ] Verifier

## Ordered slices (PRs)

| #     | Branch               | Base                         | Concern        | Owner role | Review bar             | PR  |
| ----- | -------------------- | ---------------------------- | -------------- | ---------- | ---------------------- | --- |
| 1     | `feat/<slug>-db`     | `feat/<slug>`                | database       | Backend    | light                  |     |
| 2     | `feat/<slug>-schema` | `feat/<slug>` or prior slice | schema/codegen | Backend    | light                  |     |
| 3     | `feat/<slug>-api`    | …                            | API            | Backend    | light or security-full |     |
| 4     | `feat/<slug>-web`    | …                            | web/i18n       | Frontend   | light                  |     |
| 5     | `feat/<slug>-tests`  | …                            | tests          | QA         | light                  |     |
| final | `feat/<slug>`        | `main`                       | integration    | Principal  | deep                   |     |

Prefer layer order: **db → schema → api → web**. Adjust if the story is narrower.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
git switch -c feat/<slug> main && git push -u origin feat/<slug>
gh stack init --base feat/<slug> feat/<slug>-db feat/<slug>-schema feat/<slug>-api
gh stack submit     # opens the linked PRs
gh stack sync       # restack after an upstream slice merges
```

See [Agentic SDLC § GitHub stacking](../agentic-sdlc.md#github-stacking). If a story predates `gh stack`, adopt its existing PRs with `gh stack link <pr> <pr> …` rather than restructuring branches mid-flight.

## Dependencies / notes

-

## Human gates

- [ ] Gate 2: Stack plan approved — no implementation until a human confirms.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
