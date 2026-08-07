import { type Scope, Tenant } from '@grantjs/schema';
import { sql } from 'drizzle-orm';

import { config } from '@/config';
import { ConfigurationError } from '@/lib/errors';
import type { Transaction } from '@/lib/transaction-manager.lib';

/** Unquoted PostgreSQL identifier: [a-zA-Z_][a-zA-Z0-9_]*, max 63 (server limit). */
const PG_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertSafePostgresIdentifier(name: string, settingName: string): string {
  if (name.length === 0 || name.length > 63 || !PG_IDENTIFIER_RE.test(name)) {
    throw new ConfigurationError(
      `${settingName} must be a valid PostgreSQL identifier (1–63 characters; [a-zA-Z_][a-zA-Z0-9_]*)`
    );
  }
  return name;
}

let cachedValidatedRlsRole: string | null = null;

function getValidatedRlsRestrictedRole(): string {
  if (cachedValidatedRlsRole) {
    return cachedValidatedRlsRole;
  }
  cachedValidatedRlsRole = assertSafePostgresIdentifier(
    config.security.rlsRestrictedRole,
    'SECURITY_RLS_ROLE'
  );
  return cachedValidatedRlsRole;
}

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
 * Always sets all three variables so that unused ones are explicitly cleared
 * (empty string). Policies use NULLIF(..., '') IS NULL to treat empty as
 * "no filter", so clearing avoids stale values from connection pool reuse
 * that could hide rows (e.g. account-scoped request seeing project_permissions
 * only for a previously set project_id).
 *
 * Also switches to the restricted role so RLS policies are enforced
 * (the table owner role bypasses RLS by default in PostgreSQL).
 */
export async function setRlsContext(tx: Transaction, ctx: RlsContext): Promise<void> {
  const roleName = getValidatedRlsRestrictedRole();
  await tx.execute(sql.raw(`SET LOCAL ROLE ${roleName}`));

  const orgVal = ctx.organizationId ?? '';
  const projectVal = ctx.projectId ?? '';
  const accountVal = ctx.accountId ?? '';

  await tx.execute(sql`SELECT set_config('app.current_organization_id', ${orgVal}, true)`);
  await tx.execute(sql`SELECT set_config('app.current_project_id', ${projectVal}, true)`);
  await tx.execute(sql`SELECT set_config('app.current_account_id', ${accountVal}, true)`);
}
