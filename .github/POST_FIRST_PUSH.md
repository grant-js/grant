# Pre- and post–first-push checklist

## Before you push

- [ ] **GitHub repo** exists at `github.com/logusgraphics/grant` and default branch is `main`.
- [ ] **Secrets:** In **Settings → Secrets and variables → Actions**, add `NPM_TOKEN` (npm token with publish access to `@grantjs`).
- [ ] **Self-hosted runner** is connected and idle (CI and release workflows use `runs-on: self-hosted`).
- [ ] **Remote:** `git remote set-url origin https://github.com/logusgraphics/grant.git` (or your SSH URL), then `git push -u origin main`.

---

## After you push

### If CI or Release failed

- Open the failed run in **Actions** and check which step failed (e.g. Build, Test, Gitleaks).
- Common causes: self-hosted runner offline or busy; missing **NPM_TOKEN** (needed by Release for publishing); real test or build failure. Fix and re-run or push a new commit.

### Publishing npm packages (@grantjs/client, @grantjs/server, @grantjs/cli)

- There is **one** workflow that publishes: **Release**. It does not appear as separate “Publish client” / “Publish server” jobs.
- Flow: add changesets → open a “Version packages” PR → merge it to `main` → the **Release** run triggered by that merge runs `pnpm release` and publishes all versioned packages to npm. If the first Release run failed, it never reached the publish step; fix the failure first.

---

Complete the following so CI and security work as intended.

## How to protect your branches (Rulesets)

Use one ruleset that applies to your default branch (e.g. `main`). Go to **Settings → Rules → Rulesets**. Create a new ruleset or edit **Protect Main**, then:

| What                       | Where in ruleset | Suggested value                                                                       |
| -------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| **Target branches**        | Ruleset scope    | Include by name: `main` (add others like `release/*` if you use them).                |
| **Require a pull request** | Pull request     | On. Required approvals: **1** (increase when you have more reviewers).                |
| **Require status checks**  | Status checks    | Add **Lint, build, test** (your CI job). Only appears after CI has run at least once. |
| **Bypass list**            | Bypass list      | Add **Repository Admin** so you can merge your own PRs when you’re the only one.      |
| **Restrict pushes**        | (optional)       | Leave off unless you want only certain people/teams to push to `main`.                |
| **Block force pushes**     | (optional)       | On for `main` to prevent `--force` overwriting history.                               |
| **Require linear history** | (optional)       | On if you use squash/rebase-only; keeps history linear.                               |

Save the ruleset. Result: merges to `main` require a PR, passing CI, and (for non-bypass users) one approval; you can still merge as admin.

## 1. Branch ruleset: required status check

- Go to **Settings → Rules → Rulesets** and edit **Protect Main** (or the ruleset that targets `main`).
- Under **Require status checks to pass**, click **Add checks** and add **Lint, build, test** (the CI job name). It appears only after the CI workflow has run at least once.

## 2. Advanced Security → CodeQL

- Go to **Settings → Advanced Security**.
- In **Code scanning**, click **Set up** for CodeQL. After the first push, GitHub will detect supported languages (e.g. TypeScript/JavaScript) and you can use the default configuration.
- Optionally set **Check runs failure threshold** to **High or higher** so the check fails only for high/critical findings.

## 3. (Optional) Configure alert notifications

- **Settings → Advanced Security** → **Configure alert notifications** to choose who receives Dependabot and code scanning alerts (email, web, etc.).

## 4. Pull request approvals and default merge method

### Required reviews (with bypass for sole owner)

GitHub does not allow approving your own PR. As the only contributor you can still enforce “PR + approval” for future contributors by using a ruleset and giving yourself **bypass** so you can merge without approval when you’re alone.

- Go to **Settings → Rules → Rulesets** and edit **Protect Main** (or create a ruleset that applies to `main`).
- Under **Pull request** (or equivalent):
  - Enable **Require a pull request before merging**.
  - Set **Required approvals** to **1** (or more when you have more reviewers).
- Under **Bypass list** (or **Allow specified actors to bypass**):
  - Add **your user** (or a team that includes you). Only users in this list can merge without waiting for an approval; everyone else must get the required reviews.
- Save the ruleset.

Result: you can merge your own PRs (bypass), while the rule stays in place for others.

### Default to squash merge

- Go to **Settings** → in the left sidebar under **Code and automation** open **General** (or **Pull Requests**).
- Scroll to **Merge button** / **Pull Requests**.
- Enable **Allow squash merging** if needed, then set **Default merge method** to **Squash and merge**.
- Save.

---

You can delete this file once everything is configured, or keep it for future reference.
