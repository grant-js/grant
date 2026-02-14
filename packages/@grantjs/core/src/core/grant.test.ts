import crypto from 'node:crypto';

import { AuthorizationReason, Permission, Tenant, TokenType } from '@grantjs/schema';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';

import { TokenExpiredError, TokenInvalidError } from '../errors/grant-exception';
import { type GrantService } from '../types';

import { Grant } from './grant';

import type {
  ITokenProvider,
  TokenDecodeResult,
  TokenSignOptions,
  TokenVerifyOptions,
} from '../ports/token.port';

const TEST_KID = 'test-kid';
const { publicKey: publicKeyPem, privateKey: privateKeyPem } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

/** Real jwt-backed ITokenProvider for tests */
const jwtTokenProvider: ITokenProvider = {
  decode(token: string): TokenDecodeResult | null {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') return null;
    return {
      header: decoded.header as TokenDecodeResult['header'],
      payload: decoded.payload as Record<string, unknown>,
    };
  },
  verify(token: string, publicKey: string, options?: TokenVerifyOptions): Record<string, unknown> {
    return jwt.verify(token, publicKey, {
      ...(options?.algorithms && { algorithms: options.algorithms as jwt.Algorithm[] }),
      ...(options?.ignoreExpiration !== undefined && {
        ignoreExpiration: options.ignoreExpiration,
      }),
    }) as Record<string, unknown>;
  },
  sign(payload: Record<string, unknown>, privateKey: string, options?: TokenSignOptions): string {
    return jwt.sign(payload, privateKey, {
      ...(options?.algorithm && { algorithm: options.algorithm as jwt.Algorithm }),
      ...(options?.keyid && { keyid: options.keyid }),
    });
  },
};

function createMockGrantService(): GrantService {
  return {
    getUserPermissions: vi.fn(),
    getUserRoles: vi.fn(),
    getUserGroups: vi.fn(),
    getUser: vi.fn(),
    getSessionSigningKey: vi.fn().mockResolvedValue({ kid: TEST_KID, privateKeyPem }),
    getVerificationKey: vi
      .fn()
      .mockImplementation((kid: string) =>
        kid === TEST_KID ? Promise.resolve(publicKeyPem) : Promise.resolve(null)
      ),
    getPublicKeysForJwks: vi.fn().mockResolvedValue([{ kid: TEST_KID, publicKeyPem }]),
    getSigningKeyForScope: vi.fn().mockResolvedValue({ kid: TEST_KID, privateKeyPem }),
    invalidateSessionSigningKeyCache: vi.fn().mockResolvedValue(undefined),
    rotateSystemSigningKey: vi.fn().mockResolvedValue({ kid: TEST_KID, createdAt: new Date() }),
  };
}

function createValidToken(
  type: TokenType = TokenType.Session,
  scope?: { tenant: Tenant; id: string },
  isVerified?: boolean
): string {
  const payload = {
    sub: 'user-123',
    aud: 'https://api.example.com',
    iss: 'https://auth.example.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    jti: 'token-456',
    type,
    ...(scope && { scope }),
    ...(isVerified !== undefined && { isVerified }),
  };
  return jwt.sign(payload, privateKeyPem, { algorithm: 'RS256', keyid: TEST_KID });
}

describe('Grant', () => {
  describe('constructor', () => {
    it('should initialize with grantService', () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);
      expect(grant.auth).toBeNull();
    });
  });

  describe('authenticate', () => {
    it('should authenticate with valid Bearer token', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      const token = createValidToken();
      await grant.authenticate(`Bearer ${token}`);

      expect(grant.isAuthenticated()).toBe(true);
      expect(grant.auth).not.toBeNull();
      expect(grant.auth?.userId).toBe('user-123');
      expect(grant.auth?.tokenId).toBe('token-456');
    });

    it('should not authenticate with missing header', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      await grant.authenticate(null);

      expect(grant.isAuthenticated()).toBe(false);
      expect(grant.auth).toBeNull();
    });

    it('should not authenticate with invalid Bearer format', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      await grant.authenticate('InvalidToken');

      expect(grant.isAuthenticated()).toBe(false);
      expect(grant.auth).toBeNull();
    });

    it('should not authenticate with invalid token', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      await grant.authenticate('Bearer invalid.token');

      expect(grant.isAuthenticated()).toBe(false);
    });

    it('should not authenticate with expired token', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      const expiredPayload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) - 3600,
        iat: Math.floor(Date.now() / 1000) - 7200,
        jti: 'token-456',
        type: TokenType.Session,
      };
      const expiredToken = jwt.sign(expiredPayload, privateKeyPem, {
        algorithm: 'RS256',
        keyid: TEST_KID,
      });

      await grant.authenticate(`Bearer ${expiredToken}`);

      expect(grant.isAuthenticated()).toBe(false);
    });

    it('should authenticate with API key token and scope', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      const scope = {
        tenant: Tenant.OrganizationProject,
        id: 'project-123',
      };

      const token = createValidToken(TokenType.ApiKey, scope);
      await grant.authenticate(`Bearer ${token}`);

      expect(grant.isAuthenticated()).toBe(true);
      expect(grant.auth?.type).toBe(TokenType.ApiKey);
      expect(grant.auth?.scope).toEqual(scope);
    });

    it('should not authenticate when token has no kid', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'token-456',
        type: TokenType.Session,
      };
      const tokenNoKid = jwt.sign(payload, privateKeyPem, { algorithm: 'RS256' }); // no keyid

      await grant.authenticate(`Bearer ${tokenNoKid}`);

      expect(grant.isAuthenticated()).toBe(false);
      expect(grant.auth).toBeNull();
    });

    it('should not authenticate when verification key cannot be resolved for kid', async () => {
      const mockService = createMockGrantService();
      mockService.getVerificationKey = vi.fn().mockResolvedValue(null); // unknown kid

      const grant = new Grant(mockService, jwtTokenProvider);
      const token = createValidToken();

      await grant.authenticate(`Bearer ${token}`);

      expect(grant.isAuthenticated()).toBe(false);
      expect(grant.auth).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);
      expect(grant.isAuthenticated()).toBe(false);
    });

    it('should return true when authenticated', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      const token = createValidToken();
      await grant.authenticate(`Bearer ${token}`);

      expect(grant.isAuthenticated()).toBe(true);
    });
  });

  describe('verifyToken', () => {
    it('should return claims for valid token', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);
      const token = createValidToken();

      const claims = await grant.verifyToken(token);

      expect(claims.sub).toBe('user-123');
      expect(claims.jti).toBe('token-456');
      expect(claims.type).toBe(TokenType.Session);
    });

    it('should throw when token has no kid', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'token-456',
        type: TokenType.Session,
      };
      const tokenNoKid = jwt.sign(payload, privateKeyPem, { algorithm: 'RS256' });

      await expect(grant.verifyToken(tokenNoKid)).rejects.toThrow(TokenInvalidError);
      await expect(grant.verifyToken(tokenNoKid)).rejects.toThrow(
        'Cannot resolve verification key for token'
      );
    });

    it('should throw when getVerificationKey returns null for kid', async () => {
      const mockService = createMockGrantService();
      mockService.getVerificationKey = vi.fn().mockResolvedValue(null);

      const grant = new Grant(mockService, jwtTokenProvider);
      const token = createValidToken();

      await expect(grant.verifyToken(token)).rejects.toThrow(TokenInvalidError);
      await expect(grant.verifyToken(token)).rejects.toThrow(
        'Cannot resolve verification key for token'
      );
    });

    it('should throw for invalid token', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      await expect(grant.verifyToken('invalid.token.here')).rejects.toThrow(TokenInvalidError);
    });

    it('should throw when token is expired', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      const expiredPayload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) - 3600,
        iat: Math.floor(Date.now() / 1000) - 7200,
        jti: 'token-456',
        type: TokenType.Session,
      };
      const expiredToken = jwt.sign(expiredPayload, privateKeyPem, {
        algorithm: 'RS256',
        keyid: TEST_KID,
      });

      await expect(grant.verifyToken(expiredToken)).rejects.toThrow(TokenExpiredError);
    });

    it('should return claims for expired token when ignoreExpiration is true', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      const expiredPayload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) - 3600,
        iat: Math.floor(Date.now() / 1000) - 7200,
        jti: 'token-456',
        type: TokenType.Session,
      };
      const expiredToken = jwt.sign(expiredPayload, privateKeyPem, {
        algorithm: 'RS256',
        keyid: TEST_KID,
      });

      const claims = await grant.verifyToken(expiredToken, { ignoreExpiration: true });

      expect(claims.sub).toBe('user-123');
    });
  });

  describe('signSessionToken', () => {
    it('should sign payload with key from getSessionSigningKey', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-789',
        type: TokenType.Session,
      };

      const token = await grant.signSessionToken(payload);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
      const decoded = jwt.decode(token, { complete: true }) as {
        header: { kid?: string };
        payload: Record<string, unknown>;
      };
      expect(decoded.header.kid).toBe(TEST_KID);
      expect(decoded.payload.sub).toBe('user-123');
    });
  });

  describe('isAuthorized', () => {
    it('should return NotAuthenticated when not authenticated', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      const result = await grant.isAuthorized(
        { resource: 'projects', action: 'read' },
        { resource: null }
      );

      expect(result.authorized).toBe(false);
      expect(result.reason).toBe(AuthorizationReason.NotAuthenticated);
    });

    it('should return InvalidScope when token has no scope', async () => {
      const mockService = createMockGrantService();
      const grant = new Grant(mockService, jwtTokenProvider);

      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'token-456',
        type: TokenType.Session,
      };
      const token = jwt.sign(payload, privateKeyPem, { algorithm: 'RS256', keyid: TEST_KID });
      await grant.authenticate(`Bearer ${token}`);

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

      const grant = new Grant(mockService, jwtTokenProvider);

      const scope = {
        tenant: Tenant.OrganizationProject,
        id: 'project-123',
      };

      const token = createValidToken(TokenType.Session, scope);
      await grant.authenticate(`Bearer ${token}`);

      const result = await grant.isAuthorized(
        { resource: 'projects', action: 'read' },
        { resource: null }
      );

      expect(result.authorized).toBe(true);
      expect(result.reason).toBe(AuthorizationReason.PermissionGrantedNoCondition);
    });
  });
});
