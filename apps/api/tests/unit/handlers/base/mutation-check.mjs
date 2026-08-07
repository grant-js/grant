// Mutation-tests the CacheHandler characterization suite: apply a behaviour
// change, confirm the suite goes red, revert. A suite that survives a mutation
// would not catch the same mistake during the slice-5 refactor.
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
    from: `        roleIds = projectRoleIds.filter((roleId) => userRoleIds.has(roleId));`,
    to: `        roleIds = projectRoleIds;`,
  },
  {
    name: 'Account scope returns organization roles instead of []',
    from: `      case Tenant.Account: {
        // Personal accounts don't have account-level roles, users, groups, permissions, or tags
        // These entities exist only at the project level for personal accounts
        roleIds = [];
        break;
      }`,
    to: `      case Tenant.Account: {
        const r = await this.scopeServices.organizationRoles.getOrganizationRoles({
          organizationId: scope.id,
        });
        roleIds = r.map((x) => x.roleId);
        break;
      }`,
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
    name: 'cache miss no longer writes the computed set back (roles)',
    from: `    await this.cache.roles.set(cacheKey, new Set(roleIds));
    return roleIds;`,
    to: `    return roleIds;`,
  },
  {
    name: 'signing-key invalidation becomes an exact-key delete',
    from: `    const keysToDelete = await this.cache.signingKeys.keys(\`\${prefix}*\`);`,
    to: `    const keysToDelete = await this.cache.signingKeys.keys(prefix);`,
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
