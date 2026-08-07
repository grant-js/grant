/**
 * Mutation-tests the CacheHandler characterization suite: apply a behaviour
 * change, confirm the suite goes red, revert. A suite that survives a mutation
 * would not catch the same mistake during the slice-5 refactor.
 *
 * Run from the repo root:
 *   node apps/api/tests/unit/handlers/base/mutation-check.mjs
 *
 * Exits non-zero if any mutation survives. Not wired into CI — it rewrites a
 * source file while it runs, so it is a deliberate local check, not a gate.
 * Re-run it after slice 5 to confirm the collapsed implementation is still
 * covered: same 8 mutations, expressed against the new shape.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const FILE = 'apps/api/src/handlers/base/cache-handler.ts';
const original = fs.readFileSync(FILE, 'utf8');

const mutations = [
  {
    name: 'namespace swap: addRoleIdToScopeCache writes to users',
    from: `  async addRoleIdToScopeCache(scope: Scope, roleId: string): Promise<void> {
    await this.addIdToCache(this.cache.roles, scope, roleId);`,
    to: `  async addRoleIdToScopeCache(scope: Scope, roleId: string): Promise<void> {
    await this.addIdToCache(this.cache.users, scope, roleId);`,
  },
  {
    name: 'privilege escalation: ProjectUser returns all project roles unfiltered',
    from: `            return projectRoles.map((pr) => pr.roleId).filter((roleId) => userRoleIds.has(roleId));`,
    to: `            return projectRoles.map((pr) => pr.roleId);`,
  },
  {
    // Replaces the first occurrence, which is the `roles` descriptor.
    name: 'Account scope returns organization roles instead of []',
    from: `          [Tenant.Account]: noneAtAccountLevel,`,
    to: `          [Tenant.Account]: async (scope) =>
            (await s.organizationRoles.getOrganizationRoles({ organizationId: scope.id })).map(
              (or) => or.roleId
            ),`,
  },
  {
    name: 'projectApps guard caches its empty result',
    from: `    if (!projectIds.includes(projectId)) {
      return [];
    }`,
    to: `    if (!projectIds.includes(projectId)) {
      await this.cache.projectApps.set(cacheKey, new Set<string>());
      return [];
    }`,
  },
  {
    name: 'addIdToCache drops the exists guard',
    from: `    const cacheKey = this.createCacheKey(scope);
    const exists = await cacheAdapter.has(cacheKey);

    if (exists) {
      const idsSet = await cacheAdapter.get(cacheKey);
      if (idsSet && !idsSet.has(id)) {
        idsSet.add(id);
        await cacheAdapter.set(cacheKey, idsSet);
      }
    }
  }`,
    to: `    const cacheKey = this.createCacheKey(scope);
    const idsSet = (await cacheAdapter.get(cacheKey)) ?? new Set<string>();
    idsSet.add(id);
    await cacheAdapter.set(cacheKey, idsSet);
  }`,
  },
  {
    name: 'auth cache key ignores grantedScopes',
    from: `    const grantedPart =
      grantedScopes && grantedScopes.length > 0`,
    to: `    const grantedPart =
      false && grantedScopes && grantedScopes.length > 0`,
  },
  {
    // Now one shared write-back, so this should fail far more tests than the
    // per-method version it replaced.
    name: 'cache miss no longer writes the computed set back (all namespaces)',
    from: `    await adapter?.set(cacheKey, new Set(ids));
    return ids;`,
    to: `    return ids;`,
  },
  {
    name: 'signing-key invalidation becomes an exact-key delete',
    from: `    const keysToDelete = await this.cache.signingKeys.keys(\`\${this.createCacheKey(scope)}*\`);`,
    to: `    const keysToDelete = await this.cache.signingKeys.keys(this.createCacheKey(scope));`,
  },
  {
    // New with the descriptor table: a wrong namespace on one entry silently
    // serves another entity's id set. This shape did not exist before.
    name: 'descriptor namespace swap: roles descriptor points at users',
    from: `      roles: {
        namespace: 'roles',`,
    to: `      roles: {
        namespace: 'users',`,
  },
  {
    // The table's other new failure mode: dropping a tenant entry turns a
    // supported scope into a BadRequestError.
    name: 'descriptor moves the ProjectUser entry to the wrong tenant',
    from: `          [Tenant.ProjectUser]: async (scope) => {
            const { projectId, userId } = projectUserFromScopeOrThrow(scope);`,
    to: `          [Tenant.System]: async (scope) => {
            const { projectId, userId } = projectUserFromScopeOrThrow(scope);`,
  },
];

const results = [];
for (const m of mutations) {
  if (!original.includes(m.from)) {
    results.push({ name: m.name, status: 'ANCHOR NOT FOUND' });
    continue;
  }
  fs.writeFileSync(FILE, original.replace(m.from, m.to));
  let status;
  try {
    execSync(
      'CI=1 pnpm --filter grant-api exec vitest run tests/unit/handlers/base/ 2>&1',
      { encoding: 'utf8', stdio: 'pipe' }
    );
    status = 'SURVIVED (suite is blind to this)';
  } catch (e) {
    const out = String(e.stdout || '');
    const m2 = out.match(/Tests\s+(\d+) failed/);
    status = `killed (${m2 ? m2[1] : '?'} tests failed)`;
  }
  results.push({ name: m.name, status });
  fs.writeFileSync(FILE, original);
}

fs.writeFileSync(FILE, original);
console.log('\nmutation                                                          result');
console.log('-'.repeat(96));
for (const r of results) console.log(r.name.padEnd(64), r.status);
const survived = results.filter((r) => r.status.startsWith('SURVIVED') || r.status === 'ANCHOR NOT FOUND');
console.log(`\n${results.length - survived.length}/${results.length} mutations killed`);
process.exit(survived.length ? 1 : 0);
