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
