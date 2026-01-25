import { Tenant, TokenType } from '@grantjs/schema';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { TokenExpiredError, TokenInvalidError } from '../errors/grant-exception';
import { TokenClaims } from '../types';

import { TokenParser } from './token-parser';

describe('TokenParser', () => {
  const parser = new TokenParser();
  const secret = 'test-secret-key';

  describe('parse', () => {
    it('should parse valid session token', () => {
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      const token = jwt.sign(payload, secret);
      const claims = parser.parse(token, secret);

      expect(claims.sub).toBe('user-123');
      expect(claims.aud).toBe('https://api.example.com');
      expect(claims.iss).toBe('https://auth.example.com');
      expect(claims.jti).toBe('session-456');
      expect(claims.type).toBe(TokenType.Session);
      expect(claims.scope).toBeUndefined();
    });

    it('should parse valid API key token with scope', () => {
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'api-key-789',
        type: TokenType.ApiKey,
        scope: {
          tenant: Tenant.OrganizationProject,
          id: 'project-123',
        },
      };

      const token = jwt.sign(payload, secret);
      const claims = parser.parse(token, secret);

      expect(claims.sub).toBe('user-123');
      expect(claims.type).toBe(TokenType.ApiKey);
      expect(claims.scope).toEqual({
        tenant: Tenant.OrganizationProject,
        id: 'project-123',
      });
    });

    it('should throw TokenExpiredError for expired token', () => {
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
        jti: 'session-456',
        type: TokenType.Session,
      };

      const token = jwt.sign(payload, secret);

      expect(() => parser.parse(token, secret)).toThrow(TokenExpiredError);
    });

    it('should throw TokenInvalidError for invalid signature', () => {
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      const token = jwt.sign(payload, 'wrong-secret');

      expect(() => parser.parse(token, secret)).toThrow(TokenInvalidError);
    });

    it('should throw TokenInvalidError for malformed token', () => {
      const malformedToken = 'not.a.valid.jwt.token';

      expect(() => parser.parse(malformedToken, secret)).toThrow(TokenInvalidError);
    });

    it('should throw TokenInvalidError for empty token', () => {
      expect(() => parser.parse('', secret)).toThrow(TokenInvalidError);
    });
  });

  describe('validate', () => {
    it('should validate valid session token claims', () => {
      const claims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      expect(parser.validate(claims)).toBe(true);
    });

    it('should validate valid API key token claims with scope', () => {
      const claims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'api-key-789',
        type: TokenType.ApiKey,
        scope: {
          tenant: Tenant.OrganizationProject,
          id: 'project-123',
        },
      };

      expect(parser.validate(claims)).toBe(true);
    });

    it('should reject claims missing sub', () => {
      const claims = {
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      expect(parser.validate(claims as TokenClaims)).toBe(false);
    });

    it('should reject claims missing aud', () => {
      const claims = {
        sub: 'user-123',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      expect(parser.validate(claims as TokenClaims)).toBe(false);
    });

    it('should reject claims missing iss', () => {
      const claims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      expect(parser.validate(claims as TokenClaims)).toBe(false);
    });

    it('should reject claims missing exp', () => {
      const claims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      expect(parser.validate(claims as TokenClaims)).toBe(false);
    });

    it('should reject claims missing jti', () => {
      const claims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        type: TokenType.Session,
      };

      expect(parser.validate(claims as TokenClaims)).toBe(false);
    });

    it('should reject claims missing type', () => {
      const claims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
      };

      expect(parser.validate(claims as TokenClaims)).toBe(false);
    });

    it('should reject expired claims', () => {
      const claims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) - 1, // Expired
        iat: Math.floor(Date.now() / 1000) - 3600,
        jti: 'session-456',
        type: TokenType.Session,
      };

      expect(parser.validate(claims)).toBe(false);
    });

    it('should reject invalid token type', () => {
      const claims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: 'InvalidType' as TokenType,
      };

      expect(parser.validate(claims)).toBe(false);
    });

    it('should reject API key token without scope', () => {
      const claims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'api-key-789',
        type: TokenType.ApiKey,
      };

      expect(parser.validate(claims)).toBe(false);
    });

    it('should accept session token without scope', () => {
      const claims = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      expect(parser.validate(claims)).toBe(true);
    });
  });

  describe('extractFromBearerToken', () => {
    it('should extract token from valid Bearer header', () => {
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      const token = jwt.sign(payload, secret);
      const authHeader = `Bearer ${token}`;

      const claims = parser.extractFromBearerToken(authHeader, secret);

      expect(claims).not.toBeNull();
      expect(claims?.sub).toBe('user-123');
      expect(claims?.jti).toBe('session-456');
    });

    it('should return null for missing header', () => {
      const claims = parser.extractFromBearerToken(null, secret);
      expect(claims).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      const claims = parser.extractFromBearerToken('InvalidToken', secret);
      expect(claims).toBeNull();
    });

    it('should return null for invalid token', () => {
      const authHeader = 'Bearer invalid.token.here';
      const claims = parser.extractFromBearerToken(authHeader, secret);
      expect(claims).toBeNull();
    });

    it('should return null for expired token', () => {
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) - 3600,
        iat: Math.floor(Date.now() / 1000) - 7200,
        jti: 'session-456',
        type: TokenType.Session,
      };

      const token = jwt.sign(payload, secret);
      const authHeader = `Bearer ${token}`;

      const claims = parser.extractFromBearerToken(authHeader, secret);
      expect(claims).toBeNull();
    });
  });

  describe('extractFromCookie', () => {
    it('should extract token from cookie', () => {
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      const token = jwt.sign(payload, secret);
      const cookieHeader = `accessToken=${token}; otherCookie=value`;

      const claims = parser.extractFromCookie(cookieHeader, 'accessToken', secret);

      expect(claims).not.toBeNull();
      expect(claims?.sub).toBe('user-123');
      expect(claims?.jti).toBe('session-456');
    });

    it('should return null for missing cookie header', () => {
      const claims = parser.extractFromCookie(undefined, 'accessToken', secret);
      expect(claims).toBeNull();
    });

    it('should return null for missing cookie name', () => {
      const cookieHeader = 'otherCookie=value';
      const claims = parser.extractFromCookie(cookieHeader, 'accessToken', secret);
      expect(claims).toBeNull();
    });

    it('should return null for invalid token in cookie', () => {
      const cookieHeader = 'accessToken=invalid.token.here';
      const claims = parser.extractFromCookie(cookieHeader, 'accessToken', secret);
      expect(claims).toBeNull();
    });

    it('should handle URL-encoded cookie values', () => {
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      const token = jwt.sign(payload, secret);
      const encodedToken = encodeURIComponent(token);
      const cookieHeader = `accessToken=${encodedToken}`;

      const claims = parser.extractFromCookie(cookieHeader, 'accessToken', secret);

      expect(claims).not.toBeNull();
      expect(claims?.sub).toBe('user-123');
    });

    it('should handle multiple cookies', () => {
      const payload = {
        sub: 'user-123',
        aud: 'https://api.example.com',
        iss: 'https://auth.example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'session-456',
        type: TokenType.Session,
      };

      const token = jwt.sign(payload, secret);
      const cookieHeader = `sessionId=abc123; accessToken=${token}; theme=dark`;

      const claims = parser.extractFromCookie(cookieHeader, 'accessToken', secret);

      expect(claims).not.toBeNull();
      expect(claims?.sub).toBe('user-123');
    });
  });
});
