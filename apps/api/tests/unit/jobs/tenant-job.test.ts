import { DbSchema } from '@grantjs/database';
import { validateTenantJobContext } from '@grantjs/jobs';
import { Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { assertTenantActive } from '@/lib/jobs/tenant-job.validation';

// ---------------------------------------------------------------------------
// Helpers: mock a Drizzle-like query builder chain
// ---------------------------------------------------------------------------

function createMockDb(resolvedRows: { id: string }[] = [{ id: 'found' }]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((cb: (rows: { id: string }[]) => void) => {
      return Promise.resolve(cb(resolvedRows));
    }),
  };
  const select = vi.fn().mockReturnValue(chain);
  return { db: { select } as unknown as DbSchema, select, chain };
}

// ---------------------------------------------------------------------------
// validateTenantJobContext (synchronous structural validation)
// ---------------------------------------------------------------------------

describe('validateTenantJobContext', () => {
  it('does nothing when requireTenant is false', () => {
    expect(() => validateTenantJobContext({}, false)).not.toThrow();
  });

  it('throws when scope is missing and requireTenant is true', () => {
    expect(() => validateTenantJobContext({}, true)).toThrow('missing or invalid');
  });

  it('throws when scope.tenant is null', () => {
    expect(() =>
      validateTenantJobContext({ scope: { tenant: null as never, id: 'x' } }, true)
    ).toThrow('scope.tenant and scope.id');
  });

  it('throws when scope.id is not a string', () => {
    expect(() =>
      validateTenantJobContext(
        { scope: { tenant: Tenant.Organization, id: 123 as unknown as string } },
        true
      )
    ).toThrow('scope.tenant and scope.id');
  });

  it('throws when scope.tenant is empty string', () => {
    expect(() =>
      validateTenantJobContext({ scope: { tenant: '' as Tenant, id: 'org-1' } }, true)
    ).toThrow('must be non-empty');
  });

  it('throws when scope.id is empty string', () => {
    expect(() =>
      validateTenantJobContext({ scope: { tenant: Tenant.Organization, id: '  ' } }, true)
    ).toThrow('must be non-empty');
  });

  it('passes for valid scope', () => {
    expect(() =>
      validateTenantJobContext({ scope: { tenant: Tenant.Organization, id: 'org-123' } }, true)
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// assertTenantActive (async DB validation)
// ---------------------------------------------------------------------------

describe('assertTenantActive', () => {
  describe('system scope', () => {
    it('resolves without querying DB', async () => {
      const { db, select } = createMockDb();
      await assertTenantActive({ tenant: Tenant.System, id: 'any' }, db);
      expect(select).not.toHaveBeenCalled();
    });
  });

  describe('organization scope', () => {
    it('resolves when organization exists and is active', async () => {
      const { db } = createMockDb([{ id: 'org-1' }]);
      await expect(
        assertTenantActive({ tenant: Tenant.Organization, id: 'org-1' }, db)
      ).resolves.toBeUndefined();
    });

    it('throws when organization is not found or soft-deleted', async () => {
      const { db } = createMockDb([]);
      await expect(
        assertTenantActive({ tenant: Tenant.Organization, id: 'org-gone' }, db)
      ).rejects.toThrow("Organization 'org-gone' not found");
    });
  });

  describe('account scope', () => {
    it('resolves when account exists and is active', async () => {
      const { db } = createMockDb([{ id: 'acc-1' }]);
      await expect(
        assertTenantActive({ tenant: Tenant.Account, id: 'acc-1' }, db)
      ).resolves.toBeUndefined();
    });

    it('throws when account is not found or soft-deleted', async () => {
      const { db } = createMockDb([]);
      await expect(
        assertTenantActive({ tenant: Tenant.Account, id: 'acc-gone' }, db)
      ).rejects.toThrow("Account 'acc-gone' not found");
    });
  });

  describe('organizationProject scope', () => {
    it('resolves when both org and project exist', async () => {
      const { db } = createMockDb([{ id: 'found' }]);
      await expect(
        assertTenantActive({ tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' }, db)
      ).resolves.toBeUndefined();
    });

    it('throws when either org or project is missing', async () => {
      const { db } = createMockDb([]);
      await expect(
        assertTenantActive({ tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' }, db)
      ).rejects.toThrow('not found');
    });
  });

  describe('accountProject scope', () => {
    it('resolves when both account and project exist', async () => {
      const { db } = createMockDb([{ id: 'found' }]);
      await expect(
        assertTenantActive({ tenant: Tenant.AccountProject, id: 'acc-1:proj-1' }, db)
      ).resolves.toBeUndefined();
    });

    it('throws when either account or project is missing', async () => {
      const { db } = createMockDb([]);
      await expect(
        assertTenantActive({ tenant: Tenant.AccountProject, id: 'acc-1:proj-1' }, db)
      ).rejects.toThrow('not found');
    });
  });

  describe('projectUser scope', () => {
    it('resolves when project exists', async () => {
      const { db } = createMockDb([{ id: 'proj-1' }]);
      await expect(
        assertTenantActive({ tenant: Tenant.ProjectUser, id: 'proj-1:user-1' }, db)
      ).resolves.toBeUndefined();
    });

    it('throws when project is missing', async () => {
      const { db } = createMockDb([]);
      await expect(
        assertTenantActive({ tenant: Tenant.ProjectUser, id: 'proj-gone:user-1' }, db)
      ).rejects.toThrow("Project 'proj-gone' not found");
    });
  });

  describe('accountProjectUser scope', () => {
    it('resolves when account and project exist', async () => {
      const { db } = createMockDb([{ id: 'found' }]);
      await expect(
        assertTenantActive({ tenant: Tenant.AccountProjectUser, id: 'acc-1:proj-1:user-1' }, db)
      ).resolves.toBeUndefined();
    });

    it('throws when either is missing', async () => {
      const { db } = createMockDb([]);
      await expect(
        assertTenantActive({ tenant: Tenant.AccountProjectUser, id: 'acc-1:proj-1:user-1' }, db)
      ).rejects.toThrow('not found');
    });
  });

  describe('organizationProjectUser scope', () => {
    it('resolves when org and project exist', async () => {
      const { db } = createMockDb([{ id: 'found' }]);
      await expect(
        assertTenantActive(
          { tenant: Tenant.OrganizationProjectUser, id: 'org-1:proj-1:user-1' },
          db
        )
      ).resolves.toBeUndefined();
    });

    it('throws when either is missing', async () => {
      const { db } = createMockDb([]);
      await expect(
        assertTenantActive(
          { tenant: Tenant.OrganizationProjectUser, id: 'org-1:proj-1:user-1' },
          db
        )
      ).rejects.toThrow('not found');
    });
  });
});
