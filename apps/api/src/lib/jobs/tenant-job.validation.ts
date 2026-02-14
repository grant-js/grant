import { NotFoundError } from '@grantjs/core';
import { accounts, type DbSchema, organizations, projects } from '@grantjs/database';
import type { Scope } from '@grantjs/schema';
import { and, eq, isNull } from 'drizzle-orm';

import { scopeToRlsContext } from '@/lib/rls';

/**
 * Validates that the tenant entities referenced by scope exist and are not soft-deleted.
 * Call after validateTenantJobContext() for tenant-scoped jobs that need to verify
 * the tenant is still active before processing.
 *
 * Queries run in parallel when multiple entities need checking (e.g. org + project).
 *
 * @param scope - The job's scope (tenant type + id)
 * @param db - Drizzle database instance
 * @throws Error if any tenant entity does not exist or is soft-deleted
 */
export async function assertTenantActive(scope: Scope, db: DbSchema): Promise<void> {
  const { organizationId, projectId, accountId } = scopeToRlsContext(scope);

  // System scope (and unknown tenants) have no entity to validate.
  if (!organizationId && !projectId && !accountId) {
    return;
  }

  const checks: Promise<void>[] = [];

  if (organizationId) {
    checks.push(
      db
        .select({ id: organizations.id })
        .from(organizations)
        .where(and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)))
        .limit(1)
        .then((rows) => {
          if (rows.length === 0) {
            throw new NotFoundError('Organization', organizationId);
          }
        })
    );
  }

  if (projectId) {
    checks.push(
      db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
        .limit(1)
        .then((rows) => {
          if (rows.length === 0) {
            throw new NotFoundError('Project', projectId);
          }
        })
    );
  }

  if (accountId) {
    checks.push(
      db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.id, accountId), isNull(accounts.deletedAt)))
        .limit(1)
        .then((rows) => {
          if (rows.length === 0) {
            throw new NotFoundError('Account', accountId);
          }
        })
    );
  }

  await Promise.all(checks);
}
