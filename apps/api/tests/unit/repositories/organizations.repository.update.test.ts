/**
 * The organization edit dialog sends the name only. A field left out of an update must leave its
 * column untouched, so saving the dialog can never reset `require_mfa_for_sensitive_actions`.
 */
import type { DbSchema } from '@grantjs/database';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { OrganizationRepository } from '@/repositories/organizations.repository';

const organizationId = '20000000-0000-4000-8000-000000000042';
const scope = { tenant: Tenant.Organization, id: organizationId };

function fakeDb() {
  const captured: { set?: Record<string, unknown> } = {};
  const builder = {
    set: vi.fn((values: Record<string, unknown>) => {
      captured.set = values;
      return builder;
    }),
    where: vi.fn(() => builder),
    returning: vi.fn(async () => [{ id: organizationId }]),
  };
  const db = { update: vi.fn(() => builder) } as unknown as DbSchema;
  return { db, captured };
}

describe('OrganizationRepository.updateOrganization', () => {
  it('does not write require_mfa_for_sensitive_actions when the input omits it', async () => {
    const { db, captured } = fakeDb();

    await new OrganizationRepository(db).updateOrganization({
      id: organizationId,
      input: { scope, name: 'Renamed' },
    });

    expect(captured.set).toMatchObject({ name: 'Renamed', slug: 'renamed' });
    expect(captured.set).not.toHaveProperty('requireMfaForSensitiveActions');
  });

  it('writes only the MFA flag when the input carries it and no name', async () => {
    const { db, captured } = fakeDb();

    await new OrganizationRepository(db).updateOrganization({
      id: organizationId,
      input: { scope, requireMfaForSensitiveActions: true },
    });

    expect(captured.set).toMatchObject({ requireMfaForSensitiveActions: true });
    expect(captured.set).not.toHaveProperty('name');
    expect(captured.set).not.toHaveProperty('slug');
  });

  it('writes an explicit false, which is a change and not an omission', async () => {
    const { db, captured } = fakeDb();

    await new OrganizationRepository(db).updateOrganization({
      id: organizationId,
      input: { scope, requireMfaForSensitiveActions: false },
    });

    expect(captured.set).toMatchObject({ requireMfaForSensitiveActions: false });
  });
});
