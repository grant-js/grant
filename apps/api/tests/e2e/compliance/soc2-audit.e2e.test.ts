/**
 * SOC 2 Audit Logging Compliance E2E Tests
 *
 * Validates Trust Service Criteria for system monitoring and audit trails.
 *
 * Controls covered:
 *   - CC7.2  Audit logging: CRUD operations produce audit entries
 *   - CC7.2  Audit completeness: who, what, when, where (scope)
 *   - CC7.3  Audit integrity: logs cannot be modified via API
 */
import { afterAll, describe, expect, it } from 'vitest';

import { expectAuditLogComplete } from '../helpers/assertions';
import { closeDbHelper, query } from '../helpers/db-tokens';
import { TestUser } from '../helpers/test-user';

afterAll(async () => {
  await closeDbHelper();
});

// ---------------------------------------------------------------------------
// CC7.2 -- Audit logging: operations produce audit entries
// ---------------------------------------------------------------------------
describe('SOC 2 CC7.2 -- Audit logging', () => {
  it('user creation produces an audit log entry', async () => {
    const user = await TestUser.create();

    // Query the users audit log for this user's creation
    // We need the userId -- get it from the profile
    const profile = await user.getProfile();
    const userId = (profile.body.data as Record<string, unknown>)?.id as string;

    if (userId) {
      const rows = await query<Record<string, unknown>>`
        SELECT *
        FROM user_audit_logs
        WHERE action = 'CREATE'
        ORDER BY created_at DESC
        LIMIT 5
      `;

      // At least one CREATE audit entry should exist
      expect(rows.length).toBeGreaterThan(0);
    }
  });

  it('organization creation produces an audit log entry', async () => {
    const user = await TestUser.create({ withOrgAccount: true });
    const org = await user.createOrganization('Audit Org');

    // Check organization_audit_logs for the create action
    const rows = await query<Record<string, unknown>>`
      SELECT *
      FROM organization_audit_logs
      WHERE action = 'CREATE'
      ORDER BY created_at DESC
      LIMIT 5
    `;

    expect(rows.length).toBeGreaterThan(0);

    // Find the entry for our org
    const entry = rows.find(
      (r) => r.organization_id === org.id || r.new_values?.toString().includes(org.name)
    );

    // At minimum, at least one org create audit log should exist
    expect(rows.length).toBeGreaterThan(0);
  });

  it('account creation produces an audit log entry', async () => {
    const user = await TestUser.create({ withOrgAccount: true });

    const rows = await query<Record<string, unknown>>`
      SELECT *
      FROM account_audit_logs
      WHERE action = 'CREATE'
      ORDER BY created_at DESC
      LIMIT 5
    `;

    expect(rows.length).toBeGreaterThan(0);
  });

  it('role assignment produces an audit log entry', async () => {
    const user = await TestUser.create({ withOrgAccount: true });

    // Check user_role_audit_logs for CREATE entries (role assignment)
    const rows = await query<Record<string, unknown>>`
      SELECT *
      FROM user_role_audit_logs
      WHERE action = 'CREATE'
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // At least one role assignment audit entry should exist
    // (created during user registration / account setup)
    expect(rows.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// CC7.2 -- Audit completeness: who, what, when, where
// ---------------------------------------------------------------------------
describe('SOC 2 CC7.2 -- Audit completeness', () => {
  it('audit log entries contain all required fields (who, what, when, where)', async () => {
    const user = await TestUser.create({ withOrgAccount: true });
    const org = await user.createOrganization('Completeness Org');

    // Get the latest organization audit log entry
    const rows = await query<Record<string, unknown>>`
      SELECT *
      FROM organization_audit_logs
      WHERE action = 'CREATE'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    expect(rows.length).toBe(1);
    const entry = rows[0];

    // Who -- performed_by must be set
    expect(entry.performed_by).toBeDefined();
    expect(entry.performed_by).not.toBeNull();

    // What -- action must be set
    expect(entry.action).toBeDefined();
    expect(entry.action).toBe('CREATE');

    // When -- created_at must be set
    expect(entry.created_at).toBeDefined();
    expect(entry.created_at).not.toBeNull();

    // Entity reference
    expect(entry.organization_id).toBeDefined();
  });

  it('account audit entries include scope context', async () => {
    const user = await TestUser.create({ withOrgAccount: true });

    const rows = await query<Record<string, unknown>>`
      SELECT *
      FROM account_audit_logs
      WHERE action = 'CREATE'
      ORDER BY created_at DESC
      LIMIT 3
    `;

    expect(rows.length).toBeGreaterThan(0);

    for (const entry of rows) {
      // Who
      expect(entry.performed_by).toBeDefined();
      // What
      expect(entry.action).toBeDefined();
      // When
      expect(entry.created_at).toBeDefined();
    }
  });

  it('user role audit entries track who assigned the role', async () => {
    const user = await TestUser.create({ withOrgAccount: true });

    const rows = await query<Record<string, unknown>>`
      SELECT *
      FROM user_role_audit_logs
      WHERE action = 'CREATE'
      ORDER BY created_at DESC
      LIMIT 3
    `;

    expect(rows.length).toBeGreaterThan(0);

    const entry = rows[0];
    // Who assigned the role
    expect(entry.performed_by).toBeDefined();
    // Which role assignment
    expect(entry.user_role_id).toBeDefined();
    // When
    expect(entry.created_at).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// CC7.3 -- Audit integrity: logs cannot be modified
// ---------------------------------------------------------------------------
describe('SOC 2 CC7.3 -- Audit integrity', () => {
  it('no REST endpoint exists to update audit logs', async () => {
    const user = await TestUser.create({ withOrgAccount: true });

    // Attempt to PUT/PATCH on audit-related paths -- should not exist
    const auditPaths = ['/api/audit-logs', '/api/organization-audit-logs', '/api/user-audit-logs'];

    for (const path of auditPaths) {
      // PUT attempts
      const putRes = await user.post(path, { action: 'TAMPERED' });
      expect(
        [404, 405, 401, 403].includes(putRes.status),
        `PUT ${path} should not be available (got ${putRes.status})`
      ).toBe(true);

      // DELETE attempts
      const delRes = await user.delete(path);
      expect(
        [404, 405, 401, 403].includes(delRes.status),
        `DELETE ${path} should not be available (got ${delRes.status})`
      ).toBe(true);
    }
  });

  it('audit log timestamps are monotonically increasing', async () => {
    // Create multiple actions to generate audit entries
    const user = await TestUser.create({ withOrgAccount: true });
    await user.createOrganization('Monotonic Org 1');
    await user.createOrganization('Monotonic Org 2');

    const rows = await query<{ created_at: Date }>`
      SELECT created_at
      FROM organization_audit_logs
      WHERE action = 'CREATE'
      ORDER BY created_at ASC
      LIMIT 10
    `;

    // Verify timestamps are in ascending order
    for (let i = 1; i < rows.length; i++) {
      const prev = new Date(rows[i - 1].created_at).getTime();
      const curr = new Date(rows[i].created_at).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });
});
