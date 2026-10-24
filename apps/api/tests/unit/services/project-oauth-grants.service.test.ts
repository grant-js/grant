import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hashProjectOAuthRefreshToken } from '@/lib/project-oauth-pkce.lib';
import { ProjectOAuthGrantService } from '@/services/project-oauth-grants.service';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    app: { isDevelopment: false },
    logging: { level: 'silent', prettyPrint: false },
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
  familyId: 'family-1',
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
    findFamilyIdByPreviousTokenHash: vi.fn(),
    listActiveGrantIdsInFamily: vi.fn(),
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
    grants.findFamilyIdByPreviousTokenHash.mockResolvedValue(null);
    grants.listActiveGrantIdsInFamily.mockResolvedValue([]);
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

  it('rotates the current secret and does not revoke the family', async () => {
    const service = createService();
    const presented = 'current-refresh-token-value-32bytes!!';
    const issued = await service.rotateByRefreshToken(presented);
    expect(issued?.refreshToken).toBeTruthy();
    expect(issued?.refreshToken).not.toBe(presented);
    expect(grants.rotateGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'grant-1',
        expectedTokenHash: hashProjectOAuthRefreshToken(presented),
      }),
      undefined
    );
    expect(grants.softDeleteGrant).not.toHaveBeenCalled();
  });

  it('revokes every live grant in the family when a rotated secret is reused', async () => {
    grants.findActiveByTokenHash.mockResolvedValue(null);
    grants.findFamilyIdByPreviousTokenHash.mockResolvedValue('family-1');
    grants.listActiveGrantIdsInFamily.mockResolvedValue(['grant-1', 'grant-sibling']);
    const service = createService();

    await expect(service.rotateByRefreshToken('old-token')).resolves.toBeNull();
    expect(grants.rotateGrant).not.toHaveBeenCalled();
    expect(grants.listActiveGrantIdsInFamily).toHaveBeenCalledWith('family-1', undefined);
    expect(grants.softDeleteGrant).toHaveBeenCalledTimes(2);
    expect(grants.softDeleteGrant).toHaveBeenCalledWith('grant-1', undefined);
    expect(grants.softDeleteGrant).toHaveBeenCalledWith('grant-sibling', undefined);
  });

  it('revokes the family when concurrent rotation loses the CAS', async () => {
    grants.rotateGrant.mockResolvedValue(null);
    grants.listActiveGrantIdsInFamily.mockResolvedValue(['grant-1']);
    const service = createService();

    await expect(service.rotateByRefreshToken('current-token')).resolves.toBeNull();
    expect(grants.listActiveGrantIdsInFamily).toHaveBeenCalledWith('family-1', undefined);
    expect(grants.softDeleteGrant).toHaveBeenCalledWith('grant-1', undefined);
  });

  it('returns null when the refresh token is unknown', async () => {
    grants.findActiveByTokenHash.mockResolvedValue(null);
    const service = createService();
    await expect(service.rotateByRefreshToken('old-token')).resolves.toBeNull();
    expect(grants.rotateGrant).not.toHaveBeenCalled();
    expect(grants.softDeleteGrant).not.toHaveBeenCalled();
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
