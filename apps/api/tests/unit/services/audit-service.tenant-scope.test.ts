import { GrantAuth } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';
import { Scope, Tenant, TokenType } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Transaction } from '@/lib/transaction-manager.lib';
import { AuditLogParams, AuditService } from '@/services/common/audit-service';

vi.mock('@/config', () => ({
  config: { system: { systemUserId: 'system-user-id' } },
}));

vi.mock('@/lib/logger', () => ({
  createModuleLogger: () => ({ debug: vi.fn(), error: vi.fn() }),
}));

class TestAuditService extends AuditService {
  public getScopeForTest(): Scope | null {
    return this.getScope();
  }

  public async logActionForTest(params: AuditLogParams, transaction?: Transaction): Promise<void> {
    return this.logAction(params, transaction);
  }
}

describe('AuditService tenant-aware scope', () => {
  const mockTable = {};
  const entityIdField = 'entityId';

  describe('getScope', () => {
    it('returns user.scope when user has scope', () => {
      const userScope: Scope = { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' };
      const user: GrantAuth = {
        userId: 'user-1',
        tokenId: 'token-1',
        expiresAt: Date.now() / 1000 + 3600,
        type: TokenType.ApiKey,
        scope: userScope,
      };
      const service = new TestAuditService(
        mockTable as Record<string, unknown>,
        entityIdField,
        user,
        {} as unknown as DbSchema
      );
      expect(service.getScopeForTest()).toEqual(userScope);
    });

    it('returns null when user has no scope', () => {
      const user: GrantAuth = {
        userId: 'user-1',
        tokenId: 'token-1',
        expiresAt: Date.now() / 1000 + 3600,
        type: TokenType.Session,
      };
      const service = new TestAuditService(
        mockTable as Record<string, unknown>,
        entityIdField,
        user,
        {} as unknown as DbSchema
      );
      expect(service.getScopeForTest()).toBeNull();
    });

    it('returns null when user is null', () => {
      const service = new TestAuditService(
        mockTable as Record<string, unknown>,
        entityIdField,
        null,
        {} as unknown as DbSchema
      );
      expect(service.getScopeForTest()).toBeNull();
    });
  });

  describe('logAction insert payload', () => {
    let mockInsert: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockInsert = vi.fn().mockResolvedValue(undefined);
    });

    it('includes scopeTenant and scopeId when scope is present from user', async () => {
      const userScope: Scope = { tenant: Tenant.Organization, id: 'org-123' };
      const user: GrantAuth = {
        userId: 'user-1',
        tokenId: 'token-1',
        expiresAt: Date.now() / 1000 + 3600,
        type: TokenType.ApiKey,
        scope: userScope,
      };
      const db = { insert: vi.fn().mockReturnValue({ values: mockInsert }) };
      const service = new TestAuditService(
        mockTable as Record<string, unknown>,
        'projectId',
        user,
        db as unknown as DbSchema
      );
      await service.logActionForTest({
        entityId: 'proj-1',
        action: 'CREATE',
        newValues: { name: 'Test' },
      });
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.scopeTenant).toBe(Tenant.Organization);
      expect(inserted.scopeId).toBe('org-123');
    });

    it('omits scopeTenant and scopeId when user has no scope', async () => {
      const db = { insert: vi.fn().mockReturnValue({ values: mockInsert }) };
      const service = new TestAuditService(
        mockTable as Record<string, unknown>,
        'projectId',
        null,
        db as unknown as DbSchema
      );
      await service.logActionForTest({
        entityId: 'proj-1',
        action: 'CREATE',
        newValues: { name: 'Test' },
      });
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted).not.toHaveProperty('scopeTenant');
      expect(inserted).not.toHaveProperty('scopeId');
    });
  });
});
