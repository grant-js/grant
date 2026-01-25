import { AuthorizationReason, Tenant, TokenType } from '@grantjs/schema';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';

import { TokenValidationError } from '../errors/grant-exception';
import { ComparisonOperator, type GrantService, type Permission } from '../types';

import { Grant } from './grant';

describe('Grant', () => {
  const secret = 'test-secret-key';

  const createMockGrantService = (): GrantService => ({
    getUserPermissions: vi.fn(),
    getUserRoles: vi.fn(),
    getUserGroups: vi.fn(),
    getUser: vi.fn(),
  });

  const createValidToken = (
    type: TokenType = TokenType.Session,
    scope?: { tenant: Tenant; id: string }
  ) => {
    const payload = {
      sub: 'user-123',
      aud: 'https://api.example.com',
      iss: 'https://auth.example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      jti: 'token-456',
      type,
      ...(scope && { scope }),
    };

    return jwt.sign(payload, secret);
  };

  describe('constructor', () => {
    it('should initialize with config', () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      expect(grant.auth).toBeNull();
    });
  });

  describe('authenticate', () => {
    it('should authenticate with valid Bearer token', () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      const token = createValidToken();
      grant.authenticate(`Bearer ${token}`);

      expect(grant.isAuthenticated()).toBe(true);
      expect(grant.auth).not.toBeNull();
      expect(grant.auth?.userId).toBe('user-123');
      expect(grant.auth?.tokenId).toBe('token-456');
    });

    it('should not authenticate with missing header', () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      grant.authenticate(null);

      expect(grant.isAuthenticated()).toBe(false);
      expect(grant.auth).toBeNull();
    });

    it('should not authenticate with invalid Bearer format', () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      grant.authenticate('InvalidToken');

      expect(grant.isAuthenticated()).toBe(false);
      expect(grant.auth).toBeNull();
    });

    it('should not authenticate with invalid token', () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      expect(() => grant.authenticate('Bearer invalid.token')).toThrow();
      expect(grant.isAuthenticated()).toBe(false);
    });

    it('should not authenticate with expired token', () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      const expiredPayload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) - 3600,
        iat: Math.floor(Date.now() / 1000) - 7200,
        jti: 'token-456',
        type: TokenType.Session,
      };

      const expiredToken = jwt.sign(expiredPayload, secret);

      expect(() => grant.authenticate(`Bearer ${expiredToken}`)).toThrow();
      expect(grant.isAuthenticated()).toBe(false);
    });

    it('should authenticate with API key token and scope', () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      const scope = {
        tenant: Tenant.OrganizationProject,
        id: 'project-123',
      };

      const token = createValidToken(TokenType.ApiKey, scope);
      grant.authenticate(`Bearer ${token}`);

      expect(grant.isAuthenticated()).toBe(true);
      expect(grant.auth?.type).toBe(TokenType.ApiKey);
      expect(grant.auth?.scope).toEqual(scope);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      expect(grant.isAuthenticated()).toBe(false);
    });

    it('should return true when authenticated', () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      const token = createValidToken();
      grant.authenticate(`Bearer ${token}`);

      expect(grant.isAuthenticated()).toBe(true);
    });
  });

  describe('isAuthorized', () => {
    it('should return NotAuthenticated when not authenticated', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      const result = await grant.isAuthorized(
        { resource: 'projects', action: 'read' },
        { resource: null }
      );

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe(AuthorizationReason.NotAuthenticated);
    });

    it('should return InvalidScope when token has no scope', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      // Create token without scope (session token without scope)
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'token-456',
        type: TokenType.Session,
        // No scope
      };

      const token = jwt.sign(payload, secret);
      grant.authenticate(`Bearer ${token}`);

      const result = await grant.isAuthorized(
        { resource: 'projects', action: 'read' },
        { resource: null }
      );

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe(AuthorizationReason.InvalidScope);
    });

    it('should authorize when permission is granted', async () => {
      const permission: Permission = {
        id: 'perm-1',
        name: 'Read Projects',
        action: 'read',
        resourceId: 'resource-1',
        condition: null,
      } as Permission;

      const mockService = createMockGrantService();
      mockService.getUserPermissions = vi.fn().mockResolvedValue([permission]);

      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      const scope = {
        tenant: Tenant.OrganizationProject,
        id: 'project-123',
      };

      const token = createValidToken(TokenType.Session, scope);
      grant.authenticate(`Bearer ${token}`);

      const result = await grant.isAuthorized(
        { resource: 'projects', action: 'read' },
        { resource: null }
      );

      expect(result.authorized).toBe(true);
      expect(result.reason).toBe(AuthorizationReason.PermissionGrantedNoCondition);
    });

    it('should use token scope when no override provided', async () => {
      const permission: Permission = {
        id: 'perm-1',
        name: 'Read Projects',
        action: 'read',
        resourceId: 'resource-1',
        condition: null,
      } as Permission;

      const mockService = createMockGrantService();
      mockService.getUserPermissions = vi.fn().mockResolvedValue([permission]);

      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      const tokenScope = {
        tenant: Tenant.OrganizationProject,
        id: 'project-123',
      };

      const token = createValidToken(TokenType.Session, tokenScope);
      grant.authenticate(`Bearer ${token}`);

      await grant.isAuthorized({ resource: 'projects', action: 'read' }, { resource: null });

      expect(mockService.getUserPermissions).toHaveBeenCalledWith(
        'user-123',
        tokenScope,
        'projects',
        'read'
      );
    });

    it('should allow scope override for session tokens', async () => {
      const permission: Permission = {
        id: 'perm-1',
        name: 'Read Projects',
        action: 'read',
        resourceId: 'resource-1',
        condition: null,
      } as Permission;

      const mockService = createMockGrantService();
      mockService.getUserPermissions = vi.fn().mockResolvedValue([permission]);

      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      const tokenScope = {
        tenant: Tenant.OrganizationProject,
        id: 'project-123',
      };

      const overrideScope = {
        tenant: Tenant.OrganizationProject,
        id: 'project-456',
      };

      const token = createValidToken(TokenType.Session, tokenScope);
      grant.authenticate(`Bearer ${token}`);

      await grant.isAuthorized(
        { resource: 'projects', action: 'read' },
        { resource: null },
        overrideScope
      );

      expect(mockService.getUserPermissions).toHaveBeenCalledWith(
        'user-123',
        overrideScope,
        'projects',
        'read'
      );
    });

    it('should not allow scope override for API key tokens', async () => {
      const permission: Permission = {
        id: 'perm-1',
        name: 'Read Projects',
        action: 'read',
        resourceId: 'resource-1',
        condition: null,
      } as Permission;

      const mockService = createMockGrantService();
      mockService.getUserPermissions = vi.fn().mockResolvedValue([permission]);

      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      const tokenScope = {
        tenant: Tenant.OrganizationProject,
        id: 'project-123',
      };

      const overrideScope = {
        tenant: Tenant.OrganizationProject,
        id: 'project-456',
      };

      const token = createValidToken(TokenType.ApiKey, tokenScope);
      grant.authenticate(`Bearer ${token}`);

      await grant.isAuthorized(
        { resource: 'projects', action: 'read' },
        { resource: null },
        overrideScope
      );

      // Should use token scope, not override
      expect(mockService.getUserPermissions).toHaveBeenCalledWith(
        'user-123',
        tokenScope,
        'projects',
        'read'
      );
    });

    it('should authorize when condition is met', async () => {
      const permission: Permission = {
        id: 'perm-1',
        name: 'Read Projects',
        action: 'read',
        resourceId: 'resource-1',
        condition: {
          [ComparisonOperator.Equals]: {
            'user.metadata.department': 'sales',
          },
        },
      } as Permission;

      const mockService = createMockGrantService();
      mockService.getUserPermissions = vi.fn().mockResolvedValue([permission]);
      mockService.getUser = vi.fn().mockResolvedValue({
        id: 'user-123',
        metadata: { department: 'sales', region: 'us-east' },
      });
      mockService.getUserRoles = vi.fn().mockResolvedValue([]);
      mockService.getUserGroups = vi.fn().mockResolvedValue([]);

      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      const scope = {
        tenant: Tenant.OrganizationProject,
        id: 'project-123',
      };

      const token = createValidToken(TokenType.Session, scope);
      grant.authenticate(`Bearer ${token}`);

      const result = await grant.isAuthorized(
        { resource: 'projects', action: 'read' },
        { resource: null }
      );

      expect(result.authorized).toBe(true);
      expect(result.reason).toBe(AuthorizationReason.PermissionGrantedConditionMet);
    });

    it('should deny when condition is not met', async () => {
      const permission: Permission = {
        id: 'perm-1',
        name: 'Read Projects',
        action: 'read',
        resourceId: 'resource-1',
        condition: {
          [ComparisonOperator.Equals]: {
            'user.metadata.department': 'engineering',
          },
        },
      } as Permission;

      const mockService = createMockGrantService();
      mockService.getUserPermissions = vi.fn().mockResolvedValue([permission]);
      mockService.getUser = vi.fn().mockResolvedValue({
        id: 'user-123',
        metadata: { department: 'sales', region: 'us-east' },
      });
      mockService.getUserRoles = vi.fn().mockResolvedValue([]);
      mockService.getUserGroups = vi.fn().mockResolvedValue([]);

      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      const scope = {
        tenant: Tenant.OrganizationProject,
        id: 'project-123',
      };

      const token = createValidToken(TokenType.Session, scope);
      grant.authenticate(`Bearer ${token}`);

      const result = await grant.isAuthorized(
        { resource: 'projects', action: 'read' },
        { resource: null }
      );

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe(AuthorizationReason.PermissionFoundConditionNotMet);
    });

    it('should throw TokenValidationError when token validation fails', () => {
      const mockService = createMockGrantService();
      const grant = new Grant({
        jwtSecret: secret,
        grantService: mockService,
      });

      // Create token with missing required claims
      const invalidPayload = {
        sub: 'user-123',
        // Missing required claims
      };

      const invalidToken = jwt.sign(invalidPayload, secret);

      expect(() => grant.authenticate(`Bearer ${invalidToken}`)).toThrow(TokenValidationError);
    });
  });
});
