import type { GrantAuth } from '@grantjs/core';
import { TokenType } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
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

  it('with an entity id writes the row of that entity (an exported API-key secret), still performed by the caller', async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const db = { insert: vi.fn().mockReturnValue({ values: insert }) };
    const audit = new DrizzleAuditLogger(
      { entity: 'table' },
      'apiKeyId',
      caller as unknown as GrantAuth,
      db as never
    );
    const apiKeyId = '50000000-0000-4000-8000-000000000001';

    await audit.logExport(
      { projectId: 'p', userId: 'u', kind: 'API_KEY_SECRET' },
      undefined,
      apiKeyId
    );

    const payload = insert.mock.calls[0][0];
    expect(payload).toMatchObject({
      apiKeyId,
      action: 'export',
      oldValues: null,
      newValues: null,
      performedBy: caller.userId,
    });
    expect(JSON.parse(payload.metadata)).toEqual({
      projectId: 'p',
      userId: 'u',
      kind: 'API_KEY_SECRET',
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

describe('DrizzleAuditLogger audit actor', () => {
  const apiKeyId = 'd1bfe5e5-a05d-4e74-8e5e-5c1a64de802b';
  const memberId = '30000000-0000-4000-8000-000000000099';
  const scope = { tenant: 'organizationProject', id: 'org:project' };

  function rowFor(auth: Partial<GrantAuth> | null) {
    const insert = vi.fn().mockResolvedValue(undefined);
    const db = { insert: vi.fn().mockReturnValue({ values: insert }) };
    const audit = new DrizzleAuditLogger(
      { entity: 'table' },
      'projectUserCredentialId',
      auth as unknown as GrantAuth | null,
      db as never
    );
    return { audit, insert };
  }

  it('attributes a project-level API key (sub equals jti) to the system user and names the key', async () => {
    const { audit, insert } = rowFor({
      userId: apiKeyId,
      tokenId: apiKeyId,
      type: TokenType.ApiKey,
      scope,
    } as Partial<GrantAuth>);

    await audit.logExport({ userCount: 1 });

    const payload = insert.mock.calls[0][0];
    expect(payload.performedBy).toBe(config.system.systemUserId);
    expect(JSON.parse(payload.metadata)).toEqual({
      userCount: 1,
      actorTokenId: apiKeyId,
      actorTokenType: TokenType.ApiKey,
    });
  });

  it('applies to every audit write, not only exports', async () => {
    const { audit, insert } = rowFor({
      userId: apiKeyId,
      tokenId: apiKeyId,
      type: TokenType.ApiKey,
      scope,
    } as Partial<GrantAuth>);

    await audit.logCreate('e', { a: 1 });

    const payload = insert.mock.calls[0][0];
    expect(payload.performedBy).toBe(config.system.systemUserId);
    expect(JSON.parse(payload.metadata)).toMatchObject({ actorTokenId: apiKeyId });
  });

  it('keeps the real user for a user-scoped API key (sub differs from jti), with no token metadata', async () => {
    const { audit, insert } = rowFor({
      userId: memberId,
      tokenId: apiKeyId,
      type: TokenType.ApiKey,
      scope,
    } as Partial<GrantAuth>);

    await audit.logExport({ userCount: 1 });

    const payload = insert.mock.calls[0][0];
    expect(payload.performedBy).toBe(memberId);
    expect(JSON.parse(payload.metadata)).toEqual({ userCount: 1 });
  });

  it('leaves session auth unchanged: the user id, caller metadata only', async () => {
    const { audit, insert } = rowFor({
      userId: memberId,
      tokenId: 'session-1',
      type: TokenType.Session,
      scope,
    } as Partial<GrantAuth>);

    await audit.logExport({ userCount: 1 });

    const payload = insert.mock.calls[0][0];
    expect(payload.performedBy).toBe(memberId);
    expect(JSON.parse(payload.metadata)).toEqual({ userCount: 1 });
  });

  it('uses the system user when there is no auth', async () => {
    const { audit, insert } = rowFor(null);

    await audit.logExport({ userCount: 1 });

    expect(insert.mock.calls[0][0].performedBy).toBe(config.system.systemUserId);
  });

  it('a caller cannot overwrite the actor token fields', async () => {
    const { audit, insert } = rowFor({
      userId: apiKeyId,
      tokenId: apiKeyId,
      type: TokenType.ApiKey,
      scope,
    } as Partial<GrantAuth>);

    await audit.logExport({ actorTokenId: 'spoofed' });

    expect(JSON.parse(insert.mock.calls[0][0].metadata).actorTokenId).toBe(apiKeyId);
  });
});
