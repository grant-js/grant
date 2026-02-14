import { type Scope, TokenType } from '@grantjs/schema';

import {
  NoSessionSigningKeyError,
  TokenExpiredError,
  TokenInvalidError,
  TokenValidationError,
} from '../errors/grant-exception';

import type { ITokenProvider } from '../ports/token.port';
import type { ApiKeyTokenPayload, GrantService, SessionSigningKey, TokenClaims } from '../types';

export interface VerifyOptions {
  /** If true, do not reject expired tokens (e.g. for refresh flow) */
  ignoreExpiration?: boolean;
}

export interface SignApiKeyTokenOptions {
  signingScope?: Scope;
  transaction?: unknown;
}

/**
 * Single entry point for JWT operations: parse (kid, verify, validate), sign (session, API key),
 * and verifyToken (resolve key by kid, verify, validate). Resolves keys via GrantService.
 *
 * Delegates raw JWT codec operations (decode / verify / sign) to an injected ITokenProvider,
 * keeping the core free of any concrete JWT library dependency.
 */
export class TokenManager {
  constructor(
    private readonly grantService: GrantService,
    private readonly tokenProvider: ITokenProvider
  ) {}

  /**
   * Decode token header and return the key id (kid). Returns null if token is invalid or has no kid.
   */
  getKidFromToken(token: string): string | null {
    const decoded = this.tokenProvider.decode(token);
    return decoded?.header?.kid ?? null;
  }

  /**
   * Verify token with the given public key PEM (RS256). Returns claims or throws.
   */
  verify(token: string, publicKeyPem: string, options?: VerifyOptions): TokenClaims {
    let payload: Record<string, unknown>;
    try {
      payload = this.tokenProvider.verify(token, publicKeyPem, {
        algorithms: ['RS256'],
        ...(options?.ignoreExpiration !== undefined && {
          ignoreExpiration: options.ignoreExpiration,
        }),
      });
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

    return this.payloadToClaims(payload);
  }

  /**
   * Resolve key by kid, verify and validate token. Single path used by getAuth and verifyToken.
   */
  async verifyToken(token: string, options?: VerifyOptions): Promise<TokenClaims> {
    const kid = this.getKidFromToken(token);
    if (!kid) {
      throw new TokenInvalidError('Cannot resolve verification key for token');
    }
    const publicKeyPem = await this.grantService.getVerificationKey(kid);
    if (!publicKeyPem) {
      throw new TokenInvalidError('Cannot resolve verification key for token');
    }
    const claims = this.verify(token, publicKeyPem, options);
    if (!this.validate(claims, options)) {
      throw new TokenValidationError('Token validation failed');
    }
    return claims;
  }

  private validate(claims: TokenClaims, options?: { ignoreExpiration?: boolean }): boolean {
    if (!claims.exp || !claims.sub || !claims.aud || !claims.iss || !claims.jti || !claims.type) {
      return false;
    }
    if (!options?.ignoreExpiration && claims.exp && Date.now() >= claims.exp * 1000) {
      return false;
    }
    if (claims.type !== TokenType.Session && claims.type !== TokenType.ApiKey) {
      return false;
    }
    if (claims.type === TokenType.ApiKey && !claims.scope) {
      return false;
    }
    return true;
  }

  async signSessionToken(payload: Record<string, unknown>): Promise<string> {
    const key = await this.grantService.getSessionSigningKey();
    if (!key) {
      throw new NoSessionSigningKeyError('No session signing key found');
    }
    return this.signWithKey(payload, key);
  }

  async signApiKeyToken(
    payload: ApiKeyTokenPayload,
    options?: SignApiKeyTokenOptions
  ): Promise<string> {
    const getKey = this.grantService.getSigningKeyForScope;
    if (!getKey) {
      throw new NoSessionSigningKeyError('API key token signing not implemented');
    }
    const scopeForKey = options?.signingScope ?? payload.scope;
    const key = await this.grantService.getSigningKeyForScope(scopeForKey, options?.transaction);
    if (!key) {
      throw new NoSessionSigningKeyError('No signing key found for scope');
    }
    const jwtPayload = { ...payload, type: TokenType.ApiKey };
    return this.signWithKey(jwtPayload, key);
  }

  private payloadToClaims(decoded: Record<string, unknown>): TokenClaims {
    return {
      sub: decoded.sub as string,
      aud: decoded.aud as string,
      iss: decoded.iss as string,
      exp: decoded.exp as number,
      iat: decoded.iat as number,
      jti: decoded.jti as string,
      type: decoded.type as TokenType,
      scope: decoded.scope as Scope | undefined,
      isVerified: decoded.isVerified as boolean | undefined,
    };
  }

  private signWithKey(payload: Record<string, unknown>, key: SessionSigningKey): string {
    return this.tokenProvider.sign(payload, key.privateKeyPem, {
      algorithm: 'RS256',
      keyid: key.kid,
    });
  }
}
