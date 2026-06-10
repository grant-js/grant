import { describe, expect, it } from 'vitest';

import {
  AUDIT_VALUE_MAX_LENGTH,
  serializeAuditPayload,
} from '@/lib/audit/serialize-audit-payload.lib';

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

function buildProductConfigurationAuditValues(): Record<string, unknown> {
  return {
    id: '0a6f1768-0666-4088-89b9-29c96e754039',
    name: 'ProductConfiguration',
    slug: 'product-configuration',
    description: null,
    actions: PRODUCT_CONFIGURATION_ACTIONS,
    isActive: true,
    createdAt: '2026-06-10T19:21:33.000Z',
    updatedAt: '2026-06-10T19:21:33.000Z',
  };
}

function buildLargeProjectUserAuditValues(permissionCount: number): Record<string, unknown> {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    projectId: '00000000-0000-0000-0000-000000000001',
    userId: '00000000-0000-0000-0000-000000000002',
    metadata: {
      legacy: {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'user@example.com',
        phone: '+491234567890',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnop',
        description: null,
        roles: ['customer'],
        permissions: Array.from({ length: permissionCount }, (_, index) => `permission-id-${index}`),
        accessKeyId: null,
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-01T00:00:00.000Z',
      },
      cdmSource: { grantUserId: 'grant-user', legacyUserId: 'legacy-user' },
      cdmImport: {
        projectId: 'project-id',
        externalKey: 'user:abc',
        kind: 'user',
      },
    },
    createdAt: '2026-06-10T19:21:33.000Z',
    updatedAt: '2026-06-10T19:21:33.000Z',
  };
}

describe('serializeAuditPayload', () => {
  it('returns null for nullish input', () => {
    expect(serializeAuditPayload(null)).toBeNull();
    expect(serializeAuditPayload(undefined)).toBeNull();
  });

  it('passes through small payloads unchanged', () => {
    const values = { id: 'abc', name: 'Example' };
    expect(serializeAuditPayload(values)).toBe(JSON.stringify(values));
  });

  it('compacts ProductConfiguration resource CREATE payloads', () => {
    const values = buildProductConfigurationAuditValues();
    expect(JSON.stringify(values).length).toBeGreaterThan(AUDIT_VALUE_MAX_LENGTH);

    const serialized = serializeAuditPayload(values);
    expect(serialized).not.toBeNull();
    expect(serialized!.length).toBeLessThanOrEqual(AUDIT_VALUE_MAX_LENGTH);

    const parsed = JSON.parse(serialized!) as Record<string, unknown>;
    expect(parsed.actions).toEqual({
      _compact: true,
      count: PRODUCT_CONFIGURATION_ACTIONS.length,
      sample: PRODUCT_CONFIGURATION_ACTIONS.slice(0, 5),
    });
    expect(parsed.name).toBe('ProductConfiguration');
  });

  it('compacts project user metadata with many permissions', () => {
    const values = buildLargeProjectUserAuditValues(50);
    expect(JSON.stringify(values).length).toBeGreaterThan(AUDIT_VALUE_MAX_LENGTH);

    const serialized = serializeAuditPayload(values);
    expect(serialized).not.toBeNull();
    expect(serialized!.length).toBeLessThanOrEqual(AUDIT_VALUE_MAX_LENGTH);

    const parsed = JSON.parse(serialized!) as Record<string, unknown>;
    expect(parsed.metadata).toEqual({
      _compact: true,
      keys: ['legacy', 'cdmSource', 'cdmImport'],
    });
  });

  it('falls back to a truncated preview for pathological payloads', () => {
    const values = {
      id: 'x'.repeat(500),
      blob: 'y'.repeat(2000),
    };

    const serialized = serializeAuditPayload(values);
    expect(serialized).not.toBeNull();
    expect(serialized!.length).toBeLessThanOrEqual(AUDIT_VALUE_MAX_LENGTH);

    const parsed = JSON.parse(serialized!) as Record<string, unknown>;
    expect(parsed._truncated).toBe(true);
    expect(typeof parsed.originalLength).toBe('number');
    expect(typeof parsed.preview).toBe('string');
  });
});
