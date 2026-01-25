import jwt from 'jsonwebtoken';

import { type Scope, TokenType } from '../../../schema/src';
import { TokenExpiredError, TokenInvalidError } from '../errors/grant-exception';

import type { TokenClaims } from '../types';

export class TokenParser {
  parse(token: string, secret: string): TokenClaims {
    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    } catch (error) {
      const err = error as Error & { name?: string; expiredAt?: Date };
      if (err.name === 'TokenExpiredError') {
        throw new TokenExpiredError('Token has expired', err.expiredAt, err);
      }
      if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
        throw new TokenInvalidError('Invalid token', err);
      }
      throw error;
    }

    if (!decoded) {
      throw new TokenInvalidError('Invalid token');
    }

    return {
      sub: decoded.sub as string,
      aud: decoded.aud as string,
      iss: decoded.iss as string,
      exp: decoded.exp as number,
      iat: decoded.iat as number,
      jti: decoded.jti as string,
      type: decoded.type as TokenType, // Extract token type (TokenType.Session or TokenType.ApiKey)
      scope: decoded.scope as Scope | undefined, // Optional scope
    };
  }

  validate(claims: TokenClaims): boolean {
    // Required claims
    if (!claims.exp || !claims.sub || !claims.aud || !claims.iss || !claims.jti || !claims.type) {
      return false;
    }

    // Check expiration
    if (claims.exp && Date.now() >= claims.exp * 1000) {
      return false;
    }

    // Validate token type
    if (claims.type !== TokenType.Session && claims.type !== TokenType.ApiKey) {
      return false;
    }

    // Scope is required for API key tokens, optional for session tokens
    if (claims.type === TokenType.ApiKey && !claims.scope) {
      return false;
    }

    return true;
  }

  extractFromBearerToken(authHeader: string | null, secret: string): TokenClaims | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    try {
      return this.parse(token, secret);
    } catch {
      return null;
    }
  }

  extractFromCookie(
    cookieHeader: string | undefined,
    cookieName: string,
    secret: string
  ): TokenClaims | null {
    if (!cookieHeader) {
      return null;
    }

    const cookies = this.parseCookies(cookieHeader);
    const accessToken = cookies[cookieName];

    if (!accessToken) {
      return null;
    }

    try {
      return this.parse(accessToken, secret);
    } catch {
      return null;
    }
  }

  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((cookie) => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name && rest.length > 0) {
        try {
          cookies[name] = decodeURIComponent(rest.join('='));
        } catch {
          cookies[name] = rest.join('=');
        }
      }
    });

    return cookies;
  }
}
