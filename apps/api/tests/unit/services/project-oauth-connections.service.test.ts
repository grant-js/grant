import type {
  IAuditLogger,
  IProjectOAuthConnectionRepository,
  ProjectOAuthConnectionSecretRecord,
} from '@grantjs/core';
import { type ProjectOAuthConnection, ProjectOAuthConnectionProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfigurationError, NotFoundError } from '@/lib/errors';
import { encryptProjectOAuthConnectionSecret } from '@/lib/project-oauth-connection.lib';
import { ProjectOAuthConnectionService } from '@/services/project-oauth-connections.service';

const projectId = '10000000-0000-4000-8000-000000000001';
const connectionId = '10000000-0000-4000-8000-000000000002';
const encryptionKey = 'test-project-oauth-connection-encryption-key';

function publicConnection(overrides: Partial<ProjectOAuthConnection> = {}): ProjectOAuthConnection {
  return {
    id: connectionId,
    projectId,
    provider: ProjectOAuthConnectionProvider.Github,
    clientId: 'byo-github-client',
    isConfigured: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function secretRecord(
  overrides: Partial<ProjectOAuthConnectionSecretRecord> = {}
): ProjectOAuthConnectionSecretRecord {
  const encrypted = encryptProjectOAuthConnectionSecret('byo-github-secret', encryptionKey);
  return {
    id: connectionId,
    projectId,
    provider: ProjectOAuthConnectionProvider.Github,
    clientId: 'byo-github-client',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...encrypted,
    ...overrides,
  };
}

function buildService(
  repositoryOverrides: Partial<IProjectOAuthConnectionRepository> = {},
  secretValue: string | undefined = encryptionKey
) {
  const connections = {
    listByProject: vi.fn().mockResolvedValue([]),
    getSecretByProjectAndProvider: vi.fn().mockResolvedValue(null),
    upsertConnection: vi.fn().mockResolvedValue(publicConnection()),
    hardDeleteById: vi.fn().mockResolvedValue(undefined),
    ...repositoryOverrides,
  } satisfies IProjectOAuthConnectionRepository;

  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
    logAction: vi.fn(),
  } as unknown as IAuditLogger;

  const service = new ProjectOAuthConnectionService(connections, audit, {
    resolve: vi.fn().mockResolvedValue(secretValue),
  });

  return { service, connections, audit };
}

describe('ProjectOAuthConnectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts client id and omits secret from the returned DTO and audit payload', async () => {
    const { service, connections, audit } = buildService();
    const result = await service.upsert({
      projectId,
      provider: ProjectOAuthConnectionProvider.Github,
      clientId: 'byo-github-client',
      clientSecret: 'byo-github-secret',
    });

    expect(result.clientId).toBe('byo-github-client');
    expect(result.isConfigured).toBe(true);
    expect(result).not.toHaveProperty('clientSecret');
    expect(result).not.toHaveProperty('encryptedSecret');
    expect(connections.upsertConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        provider: ProjectOAuthConnectionProvider.Github,
        clientId: 'byo-github-client',
        encryptedSecret: expect.any(String),
        secretIv: expect.any(String),
        secretTag: expect.any(String),
      }),
      undefined
    );
    expect(audit.logCreate).toHaveBeenCalledWith(
      connectionId,
      {
        id: connectionId,
        projectId,
        provider: ProjectOAuthConnectionProvider.Github,
        clientId: 'byo-github-client',
        isConfigured: true,
      },
      { action: 'UPSERT_PROJECT_OAUTH_CONNECTION' },
      undefined
    );
    const auditPayload = vi.mocked(audit.logCreate).mock.calls[0]![1];
    expect(JSON.stringify(auditPayload)).not.toMatch(/byo-github-secret|encryptedSecret|secretIv/);
  });

  it('refuses to persist when the encryption key is missing', async () => {
    const { service, connections } = buildService({}, '');
    await expect(
      service.upsert({
        projectId,
        provider: ProjectOAuthConnectionProvider.Github,
        clientId: 'byo-github-client',
        clientSecret: 'byo-github-secret',
      })
    ).rejects.toThrow(ConfigurationError);
    expect(connections.upsertConnection).not.toHaveBeenCalled();
  });

  it('hard-deletes ciphertext on clear and audits without secret material', async () => {
    const existing = secretRecord();
    const { service, connections, audit } = buildService({
      getSecretByProjectAndProvider: vi.fn().mockResolvedValue(existing),
    });

    await expect(
      service.clear({ projectId, provider: ProjectOAuthConnectionProvider.Github })
    ).resolves.toBe(true);

    expect(connections.hardDeleteById).toHaveBeenCalledWith(connectionId, undefined);
    expect(audit.logHardDelete).toHaveBeenCalledWith(
      connectionId,
      {
        id: connectionId,
        projectId,
        provider: ProjectOAuthConnectionProvider.Github,
        clientId: 'byo-github-client',
        isConfigured: false,
      },
      { action: 'CLEAR_PROJECT_OAUTH_CONNECTION' },
      undefined
    );
    const oldValues = vi.mocked(audit.logHardDelete).mock.calls[0]![1];
    expect(JSON.stringify(oldValues)).not.toMatch(
      /encryptedSecret|secretIv|secretTag|byo-github-secret/
    );
  });

  it('audits an update without secret material when the connection already exists', async () => {
    const existing = secretRecord();
    const { service, audit } = buildService({
      getSecretByProjectAndProvider: vi.fn().mockResolvedValue(existing),
    });

    await service.upsert({
      projectId,
      provider: ProjectOAuthConnectionProvider.Github,
      clientId: 'byo-github-client-2',
      clientSecret: 'byo-github-secret-rotated',
    });

    expect(audit.logUpdate).toHaveBeenCalled();
    expect(audit.logCreate).not.toHaveBeenCalled();
    const [, oldValues, newValues] = vi.mocked(audit.logUpdate).mock.calls[0]!;
    expect(JSON.stringify(oldValues)).not.toMatch(
      /encryptedSecret|secretIv|secretTag|byo-github-secret/
    );
    expect(JSON.stringify(newValues)).not.toMatch(
      /encryptedSecret|secretIv|secretTag|byo-github-secret/
    );
  });

  it('throws NotFoundError when clearing a missing connection', async () => {
    const { service } = buildService();
    await expect(
      service.clear({ projectId, provider: ProjectOAuthConnectionProvider.Google })
    ).rejects.toThrow(NotFoundError);
  });

  it('decrypts stored credentials for authorize/callback', async () => {
    const { service } = buildService({
      getSecretByProjectAndProvider: vi.fn().mockResolvedValue(secretRecord()),
    });
    await expect(
      service.getDecryptedCredentials(projectId, ProjectOAuthConnectionProvider.Github)
    ).resolves.toEqual({
      clientId: 'byo-github-client',
      clientSecret: 'byo-github-secret',
    });
  });

  it('fails closed when stored ciphertext cannot be decrypted', async () => {
    const { service } = buildService({
      getSecretByProjectAndProvider: vi
        .fn()
        .mockResolvedValue(secretRecord({ encryptedSecret: 'not-valid-ciphertext' })),
    });
    await expect(
      service.getDecryptedCredentials(projectId, ProjectOAuthConnectionProvider.Github)
    ).rejects.toThrow(ConfigurationError);
  });
});
