import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hashProjectOAuthRefreshToken } from '@/lib/project-oauth-pkce.lib';
import { ProjectOAuthGrantService } from '@/services/project-oauth-grants.service';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    projectOAuth: {
      refreshTokenExpirationDays: 30,
      authorizationCodeTtlSeconds: 60,
    },
  },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

const grantRow = {
  id: 'grant-1',
  projectAppId: 'app-1',
  userId: 'user-1',
  scopeTenant: 'organizationProject',
  scopeId: 'org:project',
  scopes: ['read'],
  expiresAt: new Date('2026-11-10T00:00:00.000Z'),
  lastUsedAt: new Date('2026-10-11T00:00:00.000Z'),
  userAgent: null,
  ipAddress: null,
  createdAt: new Date('2026-10-11T00:00:00.000Z'),
  updatedAt: new Date('2026-10-11T00:00:00.000Z'),
  deletedAt: null,
};

describe('ProjectOAuthGrantService', () => {
  const grants = {
    createGrant: vi.fn(),
    findActiveByTokenHash: vi.fn(),
    rotateGrant: vi.fn(),
    softDeleteGrant: vi.fn(),
    softDeleteActiveGrantsForUserInProject: vi.fn(),
  };
  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    grants.createGrant.mockImplementation(async (params: { tokenHash: string }) => ({
      ...grantRow,
      tokenHash: params.tokenHash,
    }));
    grants.rotateGrant.mockResolvedValue(grantRow);
    grants.findActiveByTokenHash.mockResolvedValue(grantRow);
    audit.logCreate.mockResolvedValue(undefined);
    audit.logUpdate.mockResolvedValue(undefined);
    audit.logSoftDelete.mockResolvedValue(undefined);
  });

  function createService() {
    return new ProjectOAuthGrantService(grants as never, audit as never);
  }

  it('persists a SHA-256 hex of the refresh token, not the plaintext', async () => {
    const service = createService();
    const issued = await service.createGrant({
      projectAppId: 'app-1',
      userId: 'user-1',
      scopeTenant: 'organizationProject',
      scopeId: 'org:project',
      scopes: ['read'],
    });
    expect(issued.refreshToken).toBeTruthy();
    expect(grants.createGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: hashProjectOAuthRefreshToken(issued.refreshToken),
      }),
      undefined
    );
    expect(grants.createGrant.mock.calls[0][0].tokenHash).not.toBe(issued.refreshToken);
    expect(JSON.stringify(audit.logCreate.mock.calls[0])).not.toContain(issued.refreshToken);
    expect(JSON.stringify(audit.logCreate.mock.calls[0])).not.toContain(
      hashProjectOAuthRefreshToken(issued.refreshToken)
    );
  });

  it('looks up the active grant by hashing the presented refresh token', async () => {
    const service = createService();
    const presented = 'presented-refresh-token-value-32bytes!!';
    await service.rotateByRefreshToken(presented);
    expect(grants.findActiveByTokenHash).toHaveBeenCalledWith(
      hashProjectOAuthRefreshToken(presented),
      undefined
    );
  });

  it('returns null when the refresh token is unknown or already rotated', async () => {
    grants.findActiveByTokenHash.mockResolvedValue(null);
    const service = createService();
    await expect(service.rotateByRefreshToken('old-token')).resolves.toBeNull();
    expect(grants.rotateGrant).not.toHaveBeenCalled();
  });

  describe('revokeAllForUserInProject', () => {
    it('revokes through one repository call scoped to the project and the user, and audits each grant', async () => {
      grants.softDeleteActiveGrantsForUserInProject.mockResolvedValue(['grant-1', 'grant-2']);
      const service = createService();

      await expect(
        service.revokeAllForUserInProject('project-1', 'user-1', 'tx' as never)
      ).resolves.toBe(2);

      expect(grants.softDeleteActiveGrantsForUserInProject).toHaveBeenCalledWith(
        'project-1',
        'user-1',
        'tx'
      );
      expect(audit.logSoftDelete).toHaveBeenCalledTimes(2);
      expect(audit.logSoftDelete.mock.calls.map((call) => call[0])).toEqual(['grant-1', 'grant-2']);
      expect(audit.logSoftDelete.mock.calls[0][3]).toEqual({
        context: 'revokeAllForUserInProject',
      });
    });

    it('returns 0 and audits nothing when the user holds no grants there', async () => {
      grants.softDeleteActiveGrantsForUserInProject.mockResolvedValue([]);
      const service = createService();

      await expect(service.revokeAllForUserInProject('project-1', 'user-1')).resolves.toBe(0);
      expect(audit.logSoftDelete).not.toHaveBeenCalled();
    });

    it.each([
      ['project', { projectId: '', userId: 'user-1' }],
      ['user', { projectId: 'project-1', userId: '' }],
    ])('refuses an empty %s id without revoking anything', async (_label, ids) => {
      const service = createService();

      await expect(service.revokeAllForUserInProject(ids.projectId, ids.userId)).rejects.toThrow();
      expect(grants.softDeleteActiveGrantsForUserInProject).not.toHaveBeenCalled();
    });
  });
});
