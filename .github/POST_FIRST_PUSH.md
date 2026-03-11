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

## 1. Branch ruleset: required status check

- Go to **Settings → Rules → Rulesets** and edit **Protect Main**.
- Under **Require status checks to pass**, click **Add checks** and add **Lint, build, test** (the CI job name). It appears only after the CI workflow has run at least once.

## 2. Advanced Security → CodeQL

- Go to **Settings → Advanced Security**.
- In **Code scanning**, click **Set up** for CodeQL. After the first push, GitHub will detect supported languages (e.g. TypeScript/JavaScript) and you can use the default configuration.
- Optionally set **Check runs failure threshold** to **High or higher** so the check fails only for high/critical findings.

## 3. (Optional) Configure alert notifications

- **Settings → Advanced Security** → **Configure alert notifications** to choose who receives Dependabot and code scanning alerts (email, web, etc.).

---

You can delete this file once everything is configured, or keep it for future reference.
