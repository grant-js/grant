---
title: Weekly dependency PR
description: How Grant folds Dependabot bumps into one human-reviewed PR to main
---

# Weekly dependency PR

Dependabot is the version picker. A weekly consolidator rebases those bumps, migrates call sites, runs gates, and opens **one** chore PR to `main`. Humans merge. Do not automerge or self-merge. Do not bump `typescript` or `@typescript/typescript6` (ADR 0006).

This Grant Project will schedule the Monday consolidator after Dependabot’s 09:00 Europe/Madrid run; do not wire that Cursor Automation from a one-off PR. Until it is scheduled, run the steps below by hand.

## Monday after Dependabot (09:00 Europe/Madrid)

1. Branch `chore/weekly-deps-YYYY-MM-DD` from latest `main`.
2. Fold Dependabot’s npm group PR and GitHub Actions PR onto that branch. If those PRs are stale or missing, run `pnpm update` instead (still skip TypeScript).
3. `pnpm install`, then typecheck, lint, and `pnpm test`. Run e2e (`pnpm test:e2e`) when the lockfile or runtime deps changed and the e2e stack is up.
4. On failure, migrate call sites and re-run the gates.
5. If a major cannot be migrated: drop that package from the branch, pin or ignore it in Dependabot, and call it out in the PR body. Do not open extra PRs for dropped majors.
6. Open one PR to `main` (not a story trunk).
7. Comment `superseded by #N` on leftover Dependabot PRs and close them.
