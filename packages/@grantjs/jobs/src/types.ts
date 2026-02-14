import type { Scope } from '@grantjs/schema';

/**
 * Tenant context for background jobs (Phase 3: Background Job Tenant Context).
 * Ensures async jobs that act on tenant-scoped data always receive and validate
 * scope from authenticated context—never from client input.
 */

/**
 * Payload contract for jobs that operate on tenant-scoped data.
 * When enqueueing from request handlers, always pass scope from
 * authenticated context (e.g. req.context.scope), never from client-only input.
 */
export interface TenantJobPayload<T = unknown> {
  jobType: string;
  /** Required for tenant-scoped jobs. Pass from auth context only. Scope is tenant (type + id). */
  scope?: Scope;
  payload: T;
}

/**
 * Asserts that job context has valid scope when the job requires it.
 * Call this at the start of execute() for jobs that act on tenant-scoped data.
 * @param context - Job execution context (may include scope from enqueue payload)
 * @param requireTenant - If true, throws when scope is missing or invalid
 * @throws Error when requireTenant is true and scope is missing or invalid
 */
export function validateTenantJobContext(context: { scope?: Scope }, requireTenant: boolean): void {
  if (!requireTenant) return;

  const { scope } = context;
  if (!scope || typeof scope !== 'object') {
    throw new Error('Tenant-scoped job requires scope in context; missing or invalid.');
  }
  const tenant = scope.tenant as string | undefined;
  if (tenant == null || typeof scope.id !== 'string') {
    throw new Error('Tenant-scoped job requires scope.tenant and scope.id.');
  }
  if (String(tenant).trim() === '' || scope.id.trim() === '') {
    throw new Error('Tenant-scoped job scope.tenant and scope.id must be non-empty.');
  }
}
