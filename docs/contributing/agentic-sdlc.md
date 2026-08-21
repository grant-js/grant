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

Create and manage this shape with [`gh stack`](#github-stacking) rooted on the story trunk (`--base feat/<slug>`), not on `main`.

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
| **Deep**          | Story trunk → `main`                                           | Confirm the assembled result, not re-review the diff                 |
| **Security-full** | Auth, MFA, sessions, API keys, tenancy, RLS, permissions, GDPR | Blocking security review (Senior Security + human); never light-only |

**Gate 4 is not a second code review.** Every line in the trunk → `main` diff was already reviewed once, on its own slice PR — re-reading it is redundant with the light-bar review each slice already got. What gate 4 actually buys, and what it should be spent on:

- **Integration verification on the assembled trunk** — re-run the full check suite (typecheck, tests, lint, build, dead-code) against the merged trunk, not just per-slice. Slices can each pass in isolation and still combine badly; this is where that surfaces.
- **A story-level review pass an author of any single slice couldn't do** — a vulnerability or design issue that only exists in the combination of slices, not in any one of them. This is not hypothetical: pass 1's slice 10 finding was exactly this — a security review of the assembled trunk caught something no individual slice's reviewer had grounds to flag.
- **Release-pipeline batching** — `release.yml` runs on every push to `main`; the trunk turns however many slices a story took into one push, one release-pipeline run, one point of truth for "is this story out."

If a story is small enough that none of the above adds anything over what the slice reviews already covered, that's a signal the story didn't need multiple slices — not a reason to skip the trunk on a story that does.

## Artifacts and templates

Templates:

- [Story brief](./templates/story-brief.md)
- [Stack plan](./templates/stack-plan.md)
- [Slice brief](./templates/slice-brief.md)

Store active story artifacts under repo-root `plans/`:

- `plans/YYYY-MM-DD-<slug>-brief.md`
- `plans/YYYY-MM-DD-<slug>-stack.md`

Any agent runtime can resume from those files.

## GitHub stacking (v2 — `gh stack`) {#github-stacking}

Stacked PRs are now first-class on GitHub. The [`gh stack`](https://github.com/github/gh-stack) CLI extension automates the base-branch chaining, restacking, and cross-linking that v1 did by hand.

```sh
gh extension install github/gh-stack
```

**Grant roots every stack on the story trunk, not on `main`.** The stack's bottom branch bases on `feat/<slug>`, so the trunk → `main` deep review (gate 4) survives and `main` still takes one merge per story — which matters because `release.yml` runs on every push to `main`.

```sh
# 1. Create and push the story trunk from main
git switch -c feat/<slug> main && git push -u origin feat/<slug>

# 2. Init with the FIRST slice branch only. Root on the trunk — NOT the default branch.
gh stack init --base feat/<slug> feat/<slug>-db

# 3. Work the slice, commit, then publish. Both commands, every time:
gh stack submit --auto                       # pushes; creates PRs for branches that have commits
gh stack link --base feat/<slug> <pr> <pr>   # bottom to top; creates/grows the stack ON GitHub

# 4. Verify — see "Prove the stack exists" below. Do not skip; nothing warns you.

# 5. Grow the stack ONE SLICE AT A TIME, immediately before writing that slice.
#    `add` creates the branch on top of the current tip and checks it out. It
#    pushes nothing, so no empty branch reaches the remote.
gh stack add feat/<slug>-schema
# ... work, commit, submit, link. Repeat per slice.

# 6. Restack after ANY history rewrite below a branch — a merge, rebase, or amend.
gh stack sync
```

**Add each slice branch when you start that slice — never all up front.** This is the
tool's own documented model (`gh stack --help`: _"Make changes and commit, then add a
branch to the stack"_), and it is what keeps the two failure modes below from happening
at all.

### Why not declare all branches up front {#init-consequences}

Passes 6 and 7 both ran `gh stack init` with every slice branch named at once. It works,
and it costs two things — the second is not cosmetic. **Pass 7 changed the guidance above
to `gh stack add` per slice, which removes both.**

- **Empty slice branches reach origin and clutter the PR list.** `gh stack submit --auto`
  and `gh stack sync` push _every_ branch in the stack, so branches for unwritten slices
  appear on the remote with zero commits and GitHub shows a "Compare & pull request"
  banner for each. No PR can be created from them — the compare view reports "there isn't
  anything to compare" — so each banner is a dead end a reviewer has to rule out.
- **`gh stack sync` does not restack a branch that has no PR — and still reports success.**
  This is the one that bites, and the earlier version of this document prescribed `sync` as
  the remedy for it. `sync` advances branches that have PRs; branches with no commits are
  reported (`⚠ <branch> has no PR`) and left where `init` first pointed them. So after
  slices 3 and 4 land, slices 5…M are still sitting on slice 2's tip. `✓ Pushed and synced
8 branches` is printed either way.

  Pass 7 wrote an entire slice against a base missing its two predecessors this way, and
  caught it only because a test count came back 31 where the previous slice had just made
  it 61. Pass 6 had four branches stranded for the same reason.

**If you inherit a stack built the old way**, remove the unwritten branches rather than
living with them — deleting the remote branch alone is not enough, because the local
metadata re-pushes it:

```sh
# 1. drop them from .git/gh-stack (JSON; the entry per stack lists its branches)
# 2. then delete local + remote
git push origin --delete feat/<slug>-<unwritten>
git branch -D feat/<slug>-<unwritten>
```

Verify with `gh stack sync` afterwards: it should report pushing only the branches that
have PRs, and the deleted ones must not reappear.

**Whichever model you use, verify positions before writing a slice, not after:**

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

The branch you are about to work on must sit on the current tip of the slice below it.
Recovery for a branch with no commits yet is a branch move, not a rebase:
`git stash && git switch -C <slice-n> <slice-n-1> && git stash pop`.

Then, as in v1: slices merge into the trunk under their review bar, and when acceptance is met the trunk opens the **final PR** → `main` for deep review.

### Three commands that look interchangeable and are not {#three-commands}

Pass 6 lost an afternoon to this, so it is spelled out rather than implied.

| Command                     | What it actually does                                                                                                                                    | When                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `gh stack init [branches…]` | Adopts existing branches **and creates missing ones**, bottom to top. Refuses to re-run once any named branch belongs to a stack.                        | **Once**, with the **first** slice branch only                                   |
| `gh stack add <branch>`     | Creates a **new** branch on top of the current stack and checks it out. **Pushes nothing.** Cannot adopt a branch you already made with `git switch -c`. | **Before every slice after the first** — this is the normal path, not a fallback |
| `gh stack submit`           | Pushes branches, creates PRs for branches **that have commits**, chains bases. **Does not create the GitHub stack when every PR already exists.**        | After every slice                                                                |
| `gh stack link`             | Creates or grows the stack **on GitHub** from PR numbers. No local state needed. Never removes PRs.                                                      | After every slice, alongside `submit`                                            |

**`gh stack submit` needs `--auto` in any agent shell or CI job.** Without it the command opens a single-screen interactive editor and simply hangs until it is killed — there is no error and no prompt in the captured output. `--auto` skips the editor, creates new PRs as drafts, and silently skips branches with no commits, which is what makes it safe to run after every slice on a partially built stack.

**`submit --auto` alone will leave you with no stack.** When each branch already has an open PR it prints `PR #N … is up to date` and exits 0 having created nothing on GitHub. Attaching already-open PRs to a stack is the interactive editor's `Ctrl+B` action, and `--auto` has no equivalent for it. `gh stack link` is the only non-interactive way to create or grow the stack, which is why step 3 runs both.

### Prove the stack exists {#prove-the-stack}

**`gh stack view` is not the check.** It renders the tree from local tracking state (`.git/gh-stack`) and looks identical whether or not a stack exists on GitHub. Pass 6 read a correct-looking tree from `gh stack view` while `/pulls` showed no stacking at all.

```sh
gh pr view <bottom-pr> --json baseRefName   # must be feat/<slug>, never main
```

Then open `/pulls` — or trust `gh stack link`'s own `✓ Created stack with N PRs (stack #NNN)`, which is the only output that confirms the remote object.

One diagnostic worth knowing: if `gh stack unstack` prints `Stack has no remote ID — skipping server-side unstack`, **no GitHub stack ever existed** — an earlier `submit` created the PRs and never stacked them.

### What changes from v1

| v1 (manual)                                   | v2 (`gh stack`)                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| Branch each slice from the right base by hand | `gh stack init`, with every slice branch named up front                  |
| Set PR base to trunk or prior slice           | `gh stack submit --auto`                                                 |
| Write “Depends on #123” in the PR body        | GitHub Stack object links them                                           |
| Rebase each downstream branch after a merge   | `gh stack sync` (switches to `--onto` automatically when a PR is merged) |
| Resolve the same conflict on every restack    | `git rerere`, enabled by `gh stack init`                                 |

What does **not** change: story briefs, stack plans, human gates, review bars, the role roster, and worktrees. `gh stack` replaces the plumbing, not the planning.

### Rules

- **Always pass `--base feat/<slug>` — to `init` _and_ to `link`.** Both default to the repository default branch, and both re-root the stack silently. `gh stack link 258 259 …` prints one line, `✓ Updated base branch for PR #258 to main`, and from then on merging the stack lands every slice directly in `main`, bypassing gate 4. This has already happened once on the database follow-ups story.
- **Fixing a wrong root means unstacking first.** GitHub refuses a base change while a PR belongs to a stack — `Cannot change the base branch because the pull request is part of a stack` — so `gh pr edit --base` and a corrected `gh stack link` both fail with `HTTP 422: PullRequest.base is invalid` until the stack is gone. The recovery is `gh stack unstack <n>` → `gh pr edit <bottom-pr> --base feat/<slug>` → `gh stack link --base feat/<slug> …`, which creates a **new** stack number. Check the bottom PR's base after any `link`; it is the only one that can be wrong, and nothing else warns you.
- **`gh stack merge` is a human command.** It merges the stack up to a chosen PR atomically. Agents never self-merge — this does not become an exception. It cannot bypass branch protection ("Bypassing merge requirements is not supported for stacks"), but the gate is about who decides, not what is enforceable.
- **Stack metadata is local and uncommitted** (`.git/gh-stack`). It does not survive a fresh clone or transfer between agents — the stack plan in `plans/` remains the durable artifact. Use `gh stack checkout <stack-or-pr-number>` to adopt a stack elsewhere.
- **`gh stack link` is routine, not a fallback.** `gh stack link --base feat/<slug> <pr> <pr> ...` builds the Stack on GitHub from PRs you already opened, without local tracking state, arguments bottom to top. It is **the** non-interactive way to create or grow the stack — run it after every slice, not only when adopting a story started before v2 or coming from jj / Sapling / git-town. Re-running it with the full PR list is safe: existing PRs are never removed.
- **Read `--help` before concluding the tool cannot do something — and read it far enough.** Pass 6 declared "`gh stack` cannot grow a stack one slice at a time" into a stack plan on the strength of two error messages, when `gh stack init --help` states plainly that it adopts existing branches and creates missing ones. Two refusals formed a coherent story and the story was wrong. **Pass 7 then found the correction was itself half-right**: `init`-with-everything works, but `gh stack add` is the tool's actual incremental model, stated in `gh stack --help`'s own example block (_"Make changes and commit, then add a branch to the stack"_). The first reading fixed the verdict and kept the wrong workflow. `gh stack` is v0.1.0 and its help is more current than this document.
- **Merging the slices one at a time does not fill the trunk.** Each slice PR's base is the slice below it, so merging bottom-up lands every slice's content in its own base and stops — the content accumulates on the **topmost** slice branch, and the trunk still points at slice 1. Pass 4 hit this: five PRs merged, gate 3 looked complete, and the trunk held one slice out of five. Either merge the stack atomically with `gh stack merge` (a human command), or merge the top slice branch into the trunk explicitly before opening the gate-4 PR. **Confirm the trunk contains every slice before running gate-4 verification** — otherwise a green run is green for the wrong reason.

### Caveats

`gh stack` is **v0.1.0** — early. Prefer it, but fall back to the v1 manual steps (still valid: branch from the correct base, set the PR base explicitly, note dependencies in the body) if it misbehaves, and don't let it block a story.

GitHub also publishes an agent skill for the extension at [`skills/gh-stack/SKILL.md`](https://github.com/github/gh-stack/tree/main/skills/gh-stack). Its documented installer (`gh skill install github/gh-stack`) requires a `gh` version that ships the `skill` command — not available as of `gh` 2.88.1. Until then, read it upstream rather than vendoring a copy that will drift.

## Fan-out (parallelism)

Fan-out has **two independent axes**, and conflating them is what makes teams default to serial work:

| Axis               | Question                                             | Needs a worktree?                                        |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------------- |
| **Across slices**  | Can slices 3 and 4 be built at the same time?        | Yes — two writers, two branches                          |
| **Within a slice** | Can a reviewer, a verifier, or QA work on one slice? | **No** — they read the same tree; only the author writes |

The second axis is the one that gets skipped. A security review, an independent verification, or a test-strategy pass on an already-written slice is pure fan-out at zero git cost, because those roles do not write source.

**The stack plan must state the fan-out decision per slice**, not leave it implied. A plan that lists dependencies but never says who runs a slice defaults to serial, and the default goes unexamined — as it did on the `apps/api` code-quality story, where every slice ran serially because the plan's recommendation said so and nothing prompted a re-read.

Two rules from that story:

- **A `security-full` bar requires a reviewer who is not the author.** Evidence the author gathers about their own change — however thorough — does not satisfy it. On slice 5 the author's own review reported 10/10 mutations killed; an independent pass on the same commit found a reachable fail-open. See [code-quality/api.md correction 19](./code-quality/api.md#corrections).
- **Schedule the independent pass before the gate, not as part of it.** Folding it into the story→main review means a BLOCK verdict arrives when the whole stack is already assembled.

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
