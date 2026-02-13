/**
 * Reusable assertion helpers for E2E tests.
 *
 * Provides semantic assertions that map to compliance control requirements
 * (e.g. "response must not leak sensitive fields" for GDPR Art. 25).
 */
import { expect } from 'vitest';

// ---------------------------------------------------------------------------
// Response shape assertions
// ---------------------------------------------------------------------------

/** Assert that a response follows the standard success envelope. */
export function expectSuccessResponse(
  res: { status: number; body: Record<string, unknown> },
  expectedStatus = 200
): void {
  expect(res.status).toBe(expectedStatus);
  expect(res.body.success).toBe(true);
  expect(res.body.data).toBeDefined();
}

/** Assert that a response is an error with the expected status code. */
export function expectErrorResponse(
  res: { status: number; body: Record<string, unknown> },
  expectedStatus: number
): void {
  expect(res.status).toBe(expectedStatus);
  expect(res.body.success).toBeFalsy();
}

/** Assert that a response is 401 Unauthorized. */
export function expectUnauthorized(res: { status: number; body: Record<string, unknown> }): void {
  expect(res.status).toBe(401);
}

/** Assert that a response is 403 Forbidden. */
export function expectForbidden(res: { status: number; body: Record<string, unknown> }): void {
  expect(res.status).toBe(403);
}

// ---------------------------------------------------------------------------
// Data sensitivity assertions (GDPR Art. 25 -- data minimization)
// ---------------------------------------------------------------------------

/** Fields that must NEVER appear in API responses. */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'password_hash',
  'hashedPassword',
  'hashed_password',
  'secret',
  'privateKey',
  'private_key',
];

/**
 * Assert that a response body does not contain sensitive fields.
 * Recursively checks nested objects and arrays.
 * Maps to GDPR Art. 25 (data minimization / data protection by design).
 */
export function expectNoSensitiveFields(obj: unknown, path = 'root'): void {
  if (obj === null || obj === undefined) return;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => expectNoSensitiveFields(item, `${path}[${i}]`));
    return;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const fullPath = `${path}.${key}`;
      expect(SENSITIVE_FIELDS.includes(key), `Sensitive field "${key}" found at ${fullPath}`).toBe(
        false
      );
      expectNoSensitiveFields(value, fullPath);
    }
  }
}

// ---------------------------------------------------------------------------
// Audit log assertions (SOC 2 CC7.2)
// ---------------------------------------------------------------------------

/**
 * Assert that an audit log entry has the required completeness fields.
 * Maps to SOC 2 CC7.2 (audit completeness).
 */
export function expectAuditLogComplete(auditEntry: Record<string, unknown>): void {
  // Who
  expect(auditEntry.performed_by ?? auditEntry.performedBy).toBeDefined();
  // What
  expect(auditEntry.action).toBeDefined();
  // When
  expect(auditEntry.created_at ?? auditEntry.createdAt).toBeDefined();
  // Where (scope)
  expect(auditEntry.scope_tenant ?? auditEntry.scopeTenant).toBeDefined();
  expect(auditEntry.scope_id ?? auditEntry.scopeId).toBeDefined();
}

// ---------------------------------------------------------------------------
// Data export assertions (GDPR Art. 15/20)
// ---------------------------------------------------------------------------

/** Required top-level sections in a GDPR data export. */
const EXPORT_REQUIRED_SECTIONS = [
  'user',
  'accounts',
  'authenticationMethods',
  'sessions',
  'organizationMemberships',
  'projectMemberships',
  'exportedAt',
];

/**
 * Assert that a data export response contains all required sections.
 * Maps to GDPR Art. 15 (right of access) and Art. 20 (data portability).
 */
export function expectCompleteDataExport(exportData: Record<string, unknown>): void {
  for (const section of EXPORT_REQUIRED_SECTIONS) {
    expect(exportData[section], `Export missing required section: "${section}"`).toBeDefined();
  }

  // Machine-readable: must be a plain object (JSON-serializable)
  expect(typeof exportData).toBe('object');

  // Must include a timestamp
  expect(exportData.exportedAt).toBeDefined();
}

// ---------------------------------------------------------------------------
// Tenant isolation assertions (SOC 2 CC6.1)
// ---------------------------------------------------------------------------

/**
 * Assert that a list response contains no items from another tenant.
 * Used for cross-tenant isolation tests.
 */
export function expectNoItemsFromTenant(
  items: Array<Record<string, unknown>>,
  foreignOrgId: string,
  orgIdField = 'organizationId'
): void {
  for (const item of items) {
    expect(item[orgIdField], `Item leaked from foreign tenant ${foreignOrgId}`).not.toBe(
      foreignOrgId
    );
  }
}
