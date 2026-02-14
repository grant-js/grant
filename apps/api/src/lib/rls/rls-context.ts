import { sql } from 'drizzle-orm';
import { Tenant, type Scope } from '@grantjs/schema';

import { config } from '@/config';

import type { Transaction } from '@/lib/transaction-manager.lib';

/**
 * RLS session variable values derived from a request scope.
 * Each field maps to a PostgreSQL session variable:
 *   organizationId → app.current_organization_id
 *   projectId      → app.current_project_id
 *   accountId      → app.current_account_id
 */
export interface RlsContext {
  organizationId?: string;
  projectId?: string;
  accountId?: string;
}

/**
 * Parse a request scope into RLS session variable values.
 * Handles all Tenant enum variants and composite IDs (e.g. "orgId:projectId").
 */
export function scopeToRlsContext(scope: Scope): RlsContext {
  const parts = scope.id.split(':');

  switch (scope.tenant) {
    case Tenant.System:
      return {};
    case Tenant.Organization:
      return { organizationId: parts[0] };
    case Tenant.Account:
      return { accountId: parts[0] };
    case Tenant.OrganizationProject:
      return { organizationId: parts[0], projectId: parts[1] };
    case Tenant.AccountProject:
      return { accountId: parts[0], projectId: parts[1] };
    case Tenant.ProjectUser:
      return { projectId: parts[0] };
    case Tenant.AccountProjectUser:
      return { accountId: parts[0], projectId: parts[1] };
    case Tenant.OrganizationProjectUser:
      return { organizationId: parts[0], projectId: parts[1] };
    default:
      return {};
  }
}

/** Returns true if the RLS context has at least one tenant key set. */
export function hasRlsKeys(ctx: RlsContext): boolean {
  return !!(ctx.organizationId || ctx.projectId || ctx.accountId);
}

/**
 * Set RLS session variables inside a Drizzle transaction.
 * Uses SET LOCAL so variables are transaction-scoped and automatically
 * cleaned up on COMMIT/ROLLBACK — no leaking to other requests.
 *
 * Also switches to the restricted role so RLS policies are enforced
 * (the table owner role bypasses RLS by default in PostgreSQL).
 */
export async function setRlsContext(tx: Transaction, ctx: RlsContext): Promise<void> {
  const roleName = config.security.rlsRestrictedRole;
  await tx.execute(sql.raw(`SET LOCAL ROLE ${roleName}`));

  if (ctx.organizationId) {
    await tx.execute(
      sql`SELECT set_config('app.current_organization_id', ${ctx.organizationId}, true)`
    );
  }
  if (ctx.projectId) {
    await tx.execute(sql`SELECT set_config('app.current_project_id', ${ctx.projectId}, true)`);
  }
  if (ctx.accountId) {
    await tx.execute(sql`SELECT set_config('app.current_account_id', ${ctx.accountId}, true)`);
  }
}
