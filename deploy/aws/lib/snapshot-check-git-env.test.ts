import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

/**
 * Why `scripts/snapshot-template.mjs` strips `GIT_DIR` before shelling out.
 *
 * `synth:check` decides whether the committed templates are stale by running
 * `git status --porcelain -- cdk.snapshot` from `deploy/aws`. Git exports `GIT_DIR`
 * to every hook it runs; in a **git worktree** that value is absolute, git honours
 * it, takes the current directory as the top of the work tree, and reports a clean
 * `cdk.snapshot/` as untracked. The check fails closed, so `synth:check` then
 * refuses every push made from a story worktree — the workflow AGENTS.md prescribes.
 *
 * This reproduces the git behaviour on a throwaway repository rather than asserting
 * on the script's source, so it holds for whatever git is installed rather than for
 * the one line that happens to fix it today.
 */
const repo = mkdtempSync(join(tmpdir(), 'grant-snapshot-gitenv-'));
const packageRoot = join(repo, 'deploy', 'aws');
const snapshotDir = join(packageRoot, 'cdk.snapshot');

const git = (args: string[], options: { cwd: string; env?: NodeJS.ProcessEnv }) =>
  execFileSync('git', args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env ?? process.env,
  });

mkdirSync(snapshotDir, { recursive: true });
writeFileSync(join(snapshotDir, 'GrantPlatform.template.json'), '{}\n');
git(['init', '--quiet', '--initial-branch', 'main'], { cwd: repo });
git(['config', 'user.email', 'test@example.invalid'], { cwd: repo });
git(['config', 'user.name', 'Snapshot Check Test'], { cwd: repo });
git(['add', '.'], { cwd: repo });
git(['commit', '--quiet', '-m', 'committed templates'], { cwd: repo });

/** The absolute form git exports to hooks run inside a worktree. */
const hookEnv: NodeJS.ProcessEnv = { ...process.env, GIT_DIR: join(repo, '.git') };

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('synth:check and the environment git hands its hooks', () => {
  it('is clean for a committed snapshot, with no ambient GIT_DIR', () => {
    const status = git(['status', '--porcelain', '--', 'cdk.snapshot'], { cwd: packageRoot });

    expect(status).toBe('');
  });

  it('reports the clean snapshot as untracked when GIT_DIR is inherited', () => {
    // The defect, pinned. If a future git stops honouring an absolute GIT_DIR this
    // way, this assertion fails and the stripping can be reconsidered — which is
    // better than the stripping quietly becoming cargo.
    const status = git(['status', '--porcelain', '--', 'cdk.snapshot'], {
      cwd: packageRoot,
      env: hookEnv,
    });

    expect(status).toContain('?? cdk.snapshot/');
  });

  it('is clean again once GIT_DIR and GIT_WORK_TREE are stripped', () => {
    // Exactly what the script does before shelling out.
    const { GIT_DIR: _gitDir, GIT_WORK_TREE: _gitWorkTree, ...stripped } = hookEnv;

    const status = git(['status', '--porcelain', '--', 'cdk.snapshot'], {
      cwd: packageRoot,
      env: stripped,
    });

    expect(status).toBe('');
  });
});
