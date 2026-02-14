import crypto from 'node:crypto';

import { Tenant, TokenType } from '@grantjs/schema';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';

import {
  NoSessionSigningKeyError,
  TokenExpiredError,
  TokenInvalidError,
} from '../errors/grant-exception';
import { TokenClaims } from '../types';

import { TokenManager } from './token-manager';

import type {
  ITokenProvider,
  TokenDecodeResult,
  TokenSignOptions,
  TokenVerifyOptions,
} from '../ports/token.port';
import type { GrantService } from '../types';

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

function createRs256Token(payload: Record<string, unknown>, kid: string = TEST_KID): string {
  return jwt.sign(payload, privateKeyPem, { algorithm: 'RS256', keyid: kid });
}

function createMockGrantService(overrides?: Partial<GrantService>): GrantService {
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
    ...overrides,
  };
}

describe('TokenManager', () => {
  describe('getKidFromToken', () => {
    it('should return kid from token header', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      const token = createRs256Token(
        { sub: 'u', aud: 'a', iss: 'i', exp: 1, iat: 1, jti: 'j', type: TokenType.Session },
        'my-kid'
      );
      expect(manager.getKidFromToken(token)).toBe('my-kid');
    });

    it('should return null when token has no kid', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };
      const token = jwt.sign(payload, privateKeyPem, { algorithm: 'RS256' });
      expect(manager.getKidFromToken(token)).toBeNull();
    });

    it('should return null for invalid token', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      expect(manager.getKidFromToken('not.a.jwt')).toBeNull();
    });
  });

  describe('verify', () => {
    it('should verify valid RS256 token when given public key', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };
      const token = createRs256Token(payload);

      const claims = manager.verify(token, publicKeyPem);

      expect(claims.sub).toBe('user-123');
      expect(claims.aud).toBe('https://api.example.com');
      expect(claims.jti).toBe('session-456');
      expect(claims.type).toBe(TokenType.Session);
    });

    it('should parse token with scope and isVerified', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      const scope = { tenant: Tenant.System, id: 'sys-1' };
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
        scope,
        isVerified: true,
      };
      const token = createRs256Token(payload);

      const claims = manager.verify(token, publicKeyPem);

      expect(claims.scope).toEqual(scope);
      expect(claims.isVerified).toBe(true);
    });

    it('should throw when token is expired', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) - 3600,
        iat: Math.floor(Date.now() / 1000) - 7200,
        jti: 'session-456',
        type: TokenType.Session,
      };
      const token = createRs256Token(payload);

      expect(() => manager.verify(token, publicKeyPem)).toThrow(TokenExpiredError);
    });

    it('should accept expired token when ignoreExpiration is true', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) - 3600,
        iat: Math.floor(Date.now() / 1000) - 7200,
        jti: 'session-456',
        type: TokenType.Session,
      };
      const token = createRs256Token(payload);

      const claims = manager.verify(token, publicKeyPem, { ignoreExpiration: true });

      expect(claims.sub).toBe('user-123');
    });

    it('should throw for invalid token', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      expect(() => manager.verify('invalid.token.here', publicKeyPem)).toThrow(TokenInvalidError);
    });
  });

  describe('verifyToken', () => {
    it('should resolve key by kid, verify and validate', async () => {
      const mockService = createMockGrantService();
      const manager = new TokenManager(mockService, jwtTokenProvider);
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };
      const token = createRs256Token(payload);

      const claims = await manager.verifyToken(token);

      expect(claims.sub).toBe('user-123');
      expect(mockService.getVerificationKey).toHaveBeenCalledWith(TEST_KID);
    });

    it('should throw when kid is missing', async () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };
      const token = jwt.sign(payload, privateKeyPem, { algorithm: 'RS256' }); // no keyid

      await expect(manager.verifyToken(token)).rejects.toThrow(TokenInvalidError);
    });

    it('should throw when key cannot be resolved for kid', async () => {
      const mockService = createMockGrantService({
        getVerificationKey: vi.fn().mockResolvedValue(null),
      });
      const manager = new TokenManager(mockService, jwtTokenProvider);
      const token = createRs256Token({
        sub: 'u',
        aud: 'a',
        iss: 'i',
        exp: 1,
        iat: 1,
        jti: 'j',
        type: TokenType.Session,
      });

      await expect(manager.verifyToken(token)).rejects.toThrow(TokenInvalidError);
    });

    it('should accept expired token when ignoreExpiration is true', async () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) - 3600,
        iat: Math.floor(Date.now() / 1000) - 7200,
        jti: 'session-456',
        type: TokenType.Session,
      };
      const token = createRs256Token(payload);

      const claims = await manager.verifyToken(token, { ignoreExpiration: true });

      expect(claims.sub).toBe('user-123');
    });
  });

  describe('validate', () => {
    it('should accept valid session claims', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      const claims: TokenClaims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };
      expect(manager.validate(claims)).toBe(true);
    });

    it('should reject claims missing required fields', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      expect(
        manager.validate({
          sub: 'user-123',
          aud: 'https://api.example.com',
          iss: 'https://auth.example.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          jti: 'session-456',
          type: TokenType.Session,
        } as TokenClaims)
      ).toBe(true);
      const missingJti = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        type: TokenType.Session,
      };
      expect(manager.validate(missingJti as TokenClaims)).toBe(false);
    });

    it('should reject expired claims', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      const claims: TokenClaims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) - 1,
        iat: Math.floor(Date.now() / 1000) - 3600,
        jti: 'session-456',
        type: TokenType.Session,
      };
      expect(manager.validate(claims)).toBe(false);
    });

    it('should reject API key token without scope', () => {
      const manager = new TokenManager(createMockGrantService(), jwtTokenProvider);
      const claims: TokenClaims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'api-key-789',
        type: TokenType.ApiKey,
      };
      expect(manager.validate(claims)).toBe(false);
    });
  });

  describe('signSessionToken', () => {
    it('should sign with session key from GrantService', async () => {
      const mockService = createMockGrantService();
      const manager = new TokenManager(mockService, jwtTokenProvider);
      const payload = {
        sub: 'user-1',
        aud: 'https://api.example.com',
        iss: 'https://api.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-1',
        type: TokenType.Session,
      };

      const token = await manager.signSessionToken(payload);

      expect(mockService.getSessionSigningKey).toHaveBeenCalled();
      const claims = manager.verify(token, publicKeyPem);
      expect(claims.sub).toBe('user-1');
      expect(claims.jti).toBe('session-1');
    });

    it('should throw when no session signing key', async () => {
      const manager = new TokenManager(
        createMockGrantService({ getSessionSigningKey: vi.fn().mockResolvedValue(null) }),
        jwtTokenProvider
      );

      await expect(manager.signSessionToken({ sub: 'u', jti: 'j' })).rejects.toThrow(
        NoSessionSigningKeyError
      );
    });
  });

  describe('signApiKeyToken', () => {
    it('should sign with scope key from GrantService', async () => {
      const mockService = createMockGrantService();
      const manager = new TokenManager(mockService, jwtTokenProvider);
      const scope = { tenant: Tenant.Organization, id: 'org-1' };
      const payload = {
        sub: 'user-1',
        aud: 'https://api.example.com',
        iss: 'https://api.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'apikey-1',
        scope,
      };

      const token = await manager.signApiKeyToken(payload);

      expect(mockService.getSigningKeyForScope).toHaveBeenCalledWith(scope, undefined);
      const claims = manager.verify(token, publicKeyPem);
      expect(claims.type).toBe(TokenType.ApiKey);
      expect(claims.scope).toEqual(scope);
    });

    it('should throw when getSigningKeyForScope is not implemented', async () => {
      const manager = new TokenManager(
        createMockGrantService({ getSigningKeyForScope: undefined }),
        jwtTokenProvider
      );

      await expect(
        manager.signApiKeyToken({
          sub: 'u',
          aud: 'a',
          iss: 'i',
          exp: 1,
          iat: 1,
          jti: 'j',
          scope: { tenant: Tenant.Organization, id: 'org-1' },
        })
      ).rejects.toThrow(NoSessionSigningKeyError);
    });

    it('should throw when no key returned for scope', async () => {
      const manager = new TokenManager(
        createMockGrantService({ getSigningKeyForScope: vi.fn().mockResolvedValue(null) }),
        jwtTokenProvider
      );

      await expect(
        manager.signApiKeyToken({
          sub: 'u',
          aud: 'a',
          iss: 'i',
          exp: 1,
          iat: 1,
          jti: 'j',
          scope: { tenant: Tenant.Organization, id: 'org-1' },
        })
      ).rejects.toThrow(NoSessionSigningKeyError);
    });
  });
});
