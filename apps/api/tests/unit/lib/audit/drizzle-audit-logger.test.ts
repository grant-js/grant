import type { GrantAuth } from '@grantjs/core';
import { describe, expect, it, vi } from 'vitest';

import { DrizzleAuditLogger } from '@/lib/audit/drizzle-audit-logger';
import { AUDIT_VALUE_MAX_LENGTH } from '@/lib/audit/serialize-audit-payload.lib';

const PRODUCT_CONFIGURATION_ACTIONS = [
  'configurationGetProductCalculations',
  'productConfigurationCreate',
  'productConfigurationDeploy',
  'productConfigurationDownload',
  'productConfigurationDownloadLogRecord',
  'productConfigurationGet',
  'productConfigurationGetClaimQuestions',
  'productConfigurationGetDocumentTemplate',
  'productConfigurationGetDocumentVariableTemplate',
  'productConfigurationGetEmailDesign',
  'productConfigurationGetEmailTemplate',
  'productConfigurationGetEmailVariables',
  'productConfigurationGetFields',
  'productConfigurationGetLastVersion',
  'productConfigurationGetName',
  'productConfigurationGetScheduledActions',
  'productConfigurationImport',
  'productConfigurationList',
  'productConfigurationListLogRecords',
  'productConfigurationListVersions',
  'productConfigurationTest',
  'productConfigurationUpdateEmail',
  'productConfigurationUpload',
  'productHashes',
];

describe('DrizzleAuditLogger', () => {
  it('stores compacted audit values within the column limit', async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn().mockReturnValue({ values: insert }),
    };

    const audit = new DrizzleAuditLogger(
      { resourceId: 'resource_id' },
      'resourceId',
      null as GrantAuth | null,
      db as never
    );

    const actions = PRODUCT_CONFIGURATION_ACTIONS;
    await audit.logCreate(
      '00000000-0000-0000-0000-000000000001',
      {
        id: '0a6f1768-0666-4088-89b9-29c96e754039',
        name: 'ProductConfiguration',
        slug: 'product-configuration',
        description: null,
        actions,
        isActive: true,
        createdAt: '2026-06-10T19:21:33.000Z',
        updatedAt: '2026-06-10T19:21:33.000Z',
      },
      { context: 'ResourceService.createResource' }
    );

    expect(insert).toHaveBeenCalledTimes(1);
    const payload = insert.mock.calls[0][0] as {
      newValues: string;
      metadata: string;
    };

    expect(payload.newValues.length).toBeLessThanOrEqual(AUDIT_VALUE_MAX_LENGTH);
    expect(payload.metadata.length).toBeLessThanOrEqual(AUDIT_VALUE_MAX_LENGTH);
    expect(JSON.parse(payload.newValues).actions).toMatchObject({
      _compact: true,
      count: actions.length,
    });
  });
});

describe('DrizzleAuditLogger.logExport', () => {
  const caller = {
    userId: '40000000-0000-4000-8000-0000000000dd',
    scope: { tenant: 'organizationProject', id: 'org:project' },
  };

  function create(insert: ReturnType<typeof vi.fn>) {
    const db = { insert: vi.fn().mockReturnValue({ values: insert }) };
    const audit = new DrizzleAuditLogger(
      { entity: 'table' },
      'projectUserCredentialId',
      caller as unknown as GrantAuth,
      db as never
    );
    return { audit, db };
  }

  it('writes one export row: no entity id, performed by the caller, metadata as given', async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const { audit } = create(insert);

    await audit.logExport({ userCount: 2, credentialCount: 1, kinds: ['PASSWORD'] });

    expect(insert).toHaveBeenCalledTimes(1);
    const payload = insert.mock.calls[0][0];
    expect(payload).toMatchObject({
      projectUserCredentialId: null,
      action: 'export',
      oldValues: null,
      newValues: null,
      performedBy: caller.userId,
      scopeId: 'org:project',
    });
    expect(JSON.parse(payload.metadata)).toEqual({
      userCount: 2,
      credentialCount: 1,
      kinds: ['PASSWORD'],
    });
  });

  it('uses the caller transaction when given', async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const { audit, db } = create(insert);
    const txInsert = vi.fn().mockResolvedValue(undefined);
    const tx = { insert: vi.fn().mockReturnValue({ values: txInsert }) };

    await audit.logExport({ userCount: 1 }, tx);

    expect(txInsert).toHaveBeenCalledTimes(1);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('throws when the insert fails (unlike logAction), so the export fails with it', async () => {
    const { audit } = create(vi.fn().mockRejectedValue(new Error('insert failed')));

    await expect(audit.logExport({ userCount: 1 })).rejects.toThrow('insert failed');
  });

  it('logAction still swallows an insert failure', async () => {
    const { audit } = create(vi.fn().mockRejectedValue(new Error('insert failed')));

    await expect(audit.logAction({ entityId: 'e', action: 'CREATE' })).resolves.toBeUndefined();
  });
});
