---
title: Agentic SDLC
description: Agent roster, stacked PRs, human gates, worktrees, and multi-vendor skills for Grant development
---

# Agentic SDLC

**SDLC** = Software Development Life Cycle: brief → design → stack plan → implement slices → verify → integrate → merge to `main` → release.

Grant uses a standing **agent roster** coordinated by Project Manager + Principal Engineer. Roles are **defined** in `.cursor/agents/`; only roles listed on the stack plan are **active**. Full org-chart fan-out on every task is an anti-pattern.

This workflow keeps pull requests **human-reviewable** while still shipping **complete features** through the release pipeline.

## Goals

- Replace long-lived single branches and mega-PRs with a **story trunk** and **stacked slice PRs**.
- Make Cursor / Claude / Codex plans emit **stack plans**, not one mega-diff.
- Keep humans at four gates; agents never self-merge.

## Roster (v1)

| Role               | Agent file                             | Owns                                                     |
| ------------------ | -------------------------------------- | -------------------------------------------------------- |
| Project Manager    | `.cursor/agents/project-manager.md`    | Story brief, acceptance, phase gates, ready-for-main     |
| Principal Engineer | `.cursor/agents/principal-engineer.md` | Stack order, integration, worktrees, conflict resolution |
| Architect          | `.cursor/agents/architect.md`          | Cross-cutting design / ADR when boundaries change        |
| Senior Backend     | `.cursor/agents/senior-backend.md`     | DB → schema → API slices                                 |
| Senior Frontend    | `.cursor/agents/senior-frontend.md`    | Web / i18n slices                                        |
| Senior QA          | `.cursor/agents/senior-qa.md`          | Test plan, gaps, drive Verifier                          |
| Senior Security    | `.cursor/agents/senior-security.md`    | Auth/tenancy/threat review                               |
| Verifier           | `.cursor/agents/verifier.md`           | Typecheck, lint, tests, layers, OpenAPI sync             |

**Deferred** (promote when repeatedly needed): UI/UX designer, Platform Engineer, Data Engineer.

Other harnesses (Claude, Codex, OpenCode): read the same agent files or this doc; Cursor loads `.cursor/agents/` natively. Portable ambient context lives in root `AGENTS.md`.

## Activation matrix

| Story shape           | Active roles                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Typo / one-file fix   | Implementer + Verifier                                                                                                   |
| Pure API bug          | Backend + QA + Verifier; Security if auth/tenancy touched                                                                |
| Full vertical feature | PM → Architect (if boundaries change) → Backend + Frontend (stacked) → QA → Security (if needed) → Verifier → story→main |
| Docs-only             | PM light touch + doc owner                                                                                               |

## Merge topology

```
main
  └── feat/<story-slug>          # story trunk (integration branch)
        ├── feat/<slug>-db       # PR → trunk (or into prior slice)
        ├── feat/<slug>-schema
        ├── feat/<slug>-api
        ├── feat/<slug>-web
        └── feat/<slug>-tests    # optional
  final PR: feat/<story-slug> → main
  release pipeline ships from main
```

Naming convention:

- Story trunk: `feat/<story-slug>`
- Slices: `feat/<story-slug>-db`, `-schema`, `-api`, `-web`, `-tests`, `-docs` as needed

Prefer Grant layer order for slices: **database → schema → api → web**.

### Hard rule

For multi-file features: **no implementation without an explicit stack of human-reviewable PRs**. Plans (Cursor / Claude / Codex) must be **stack plans**, not a single month-long branch.

## Human gates

1. **Approve story brief** (PM) before stack decomposition.
2. **Approve stack plan** (Principal: branches, PR order, active roles, worktree) before implementation.
3. **Stack PRs into trunk** — light/async human review; CI green required.
4. **Story trunk → `main`** — deep human review before release pipeline.

Agents never self-merge.

## Review bars

| Bar               | When                                                           | Expectation                                                          |
| ----------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Light**         | Typical stack PR → trunk                                       | Human skim/async approve; CI green; Verifier clean                   |
| **Deep**          | Story trunk → `main`                                           | Full human review of integration, docs, acceptance                   |
| **Security-full** | Auth, MFA, sessions, API keys, tenancy, RLS, permissions, GDPR | Blocking security review (Senior Security + human); never light-only |

## Artifacts and templates

Templates:

- [Story brief](./templates/story-brief.md)
- [Stack plan](./templates/stack-plan.md)
- [Slice brief](./templates/slice-brief.md)

Store active story artifacts under repo-root `plans/`:

- `plans/YYYY-MM-DD-<slug>-brief.md`
- `plans/YYYY-MM-DD-<slug>-stack.md`

Any agent runtime can resume from those files.

## Manual GitHub stacking (v1)

No Graphite/git-spice required.

1. Create and push story trunk from `main`: `feat/<slug>`.
2. For each slice, branch from the correct base (trunk, or the previous slice branch if the slice depends on unmerged commits).
3. Open a PR with **base** = story trunk (or previous slice branch for a strict linear stack).
4. In the PR body, link the stack plan and note upstream/downstream PRs (e.g. “Depends on #123”).
5. After CI + light review, merge into the trunk (or restack after upstream merges).
6. When all slices are on the trunk and acceptance is met, open **final PR**: trunk → `main` (deep review).

Optional later: evaluate `git-spice` or Graphite for rebase ergonomics. Not required for v1.

## Git worktrees (parallel stories)

| Situation                                     | Worktree?                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Two+ stories in flight                        | **Required** — one worktree per story trunk                                           |
| One story, sequential slices                  | Optional — same checkout is fine                                                      |
| Two agents on the **same** story concurrently | Separate worktrees per concurrent slice, or serialize — never two writers in one tree |

Conventions:

- Path: sibling `../grant-platform-<slug>/` or gitignored `.worktrees/<slug>/`.
- Check out `feat/<slug>` (or the active slice branch) in that worktree.
- Record `worktree_path` on the stack plan.
- After story→main merges: `git worktree remove`, delete local branches, prune.
- **Principal Engineer** owns create/cleanup. PM does not invent git topology.
- Local Docker Postgres/Redis on fixed ports are **shared** across worktrees in v1 (no per-worktree DB stacks).

Example:

```bash
git fetch origin
git branch feat/my-story origin/main
git worktree add ../grant-platform-my-story feat/my-story
# work in ../grant-platform-my-story
# after merge to main:
git worktree remove ../grant-platform-my-story
```

## Skills and multi-vendor tooling

Grant’s SDLC must work on **Cursor, Claude Code, Codex, and similar harnesses**. Skills and plugins are layered so optional Cursor packs do not become a silent dependency.

### Agents vs skills

| Layer     | Answers                     | v1 examples                            |
| --------- | --------------------------- | -------------------------------------- |
| **Agent** | Who am I / what’s my job?   | `.cursor/agents/*`, `.claude/agents/*` |
| **Skill** | How do I run this workflow? | `add-feature`, `code-review`           |

Do **not** add one skill per role (that duplicates the agent). Skills are **verbs**. Add a new project skill only when a workflow is invoked often and templates + agents are too thin (e.g. a future `write-stack-plan` or `security-review`).

### Three layers (keep them separate)

1. **Portable process (required everywhere)** — `AGENTS.md`, this doc, `docs/contributing/templates/`, `plans/`.
2. **Project skills (in-repo, same content)** — Grant-owned `SKILL.md` workflows. Install path differs by harness; content must stay in sync.
3. **Personal / plugin packs (optional)** — e.g. Compound Engineering, Shadcn. Machine- or IDE-local unless explicitly vendored. **Never required to merge a Grant PR.**

### Project skills (v1)

| Skill         | Purpose                                            |
| ------------- | -------------------------------------------------- |
| `add-feature` | Vertical features as stacked PRs + stack-plan gate |
| `code-review` | Review bars: light / deep / security-full          |

Harness paths (same skill body; keep copies or symlinks aligned):

- Cursor: `.cursor/skills/{add-feature,code-review}/`
- Claude Code: `.claude/skills/{add-feature,code-review}/`
- Codex: prefer `.agents/skills/` or the harness’s documented skills dir when used

### Optional Cursor pack: Compound Engineering

[Compound Engineering](https://cursor.com) (and similar plugin skill packs) may be installed **locally in Cursor**. They are **not** part of this repository and are **not** available to Claude/Codex unless separately installed or vendored.

When CE is present, map it onto Grant’s SDLC as an accelerator:

| CE skill (typical)            | Grant SDLC equivalent                                            |
| ----------------------------- | ---------------------------------------------------------------- |
| `ce-brainstorm`               | Project Manager → story brief + human gate 1                     |
| `ce-plan`                     | Principal Engineer → stack plan + human gate 2                   |
| `ce-work` / `lfg`             | Specialists implement stack slices; still open reviewable PRs    |
| `ce-code-review` / PR babysit | Use with Grant `code-review` bars (light / deep / security-full) |

**Fallback when CE (or any plugin pack) is unavailable:** use the roster agents + templates under `docs/contributing/templates/` and store artifacts in `plans/`. The story must still produce a brief and a stack plan for multi-file work.

**Hard rule:** Compound Engineering is never a merge requirement. CI, humans, and non-Cursor agents only depend on the portable process and project skills.

### What each harness must support

| Capability                                  | Cursor                      | Claude / Codex / others                                               |
| ------------------------------------------- | --------------------------- | --------------------------------------------------------------------- |
| Agentic SDLC + templates + `plans/`         | Required                    | Required                                                              |
| Project skills `add-feature`, `code-review` | Required (`.cursor/skills`) | Required if that harness is used (copy/symlink into its skills path)  |
| Role agents                                 | `.cursor/agents/`           | `.claude/agents/` or read the same markdown / this doc                |
| Compound Engineering / other plugins        | Optional                    | Optional — only if installed for that harness; otherwise use fallback |

## Related

- [Development Guide](./guide.md)
- [Testing](./testing.md)
- [Security Audit](./security-audit.md)
- Root `AGENTS.md` — portable agent instructions
- Templates: [story brief](./templates/story-brief.md), [stack plan](./templates/stack-plan.md), [slice brief](./templates/slice-brief.md)
