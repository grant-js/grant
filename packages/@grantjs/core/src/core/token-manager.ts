import { type Scope, TokenType } from '@grantjs/schema';

import {
  NoSessionSigningKeyError,
  TokenExpiredError,
  TokenInvalidError,
  TokenValidationError,
} from '../errors/grant-exception';
import type { IGrantService } from '../ports/services/grant.service.port';
import type { ITokenProvider } from '../ports/token.port';
import type { ApiKeyTokenPayload, SessionSigningKey, TokenClaims } from '../types';

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
 * and verifyToken (resolve key by kid, verify, validate). Resolves keys via IGrantService.
 *
 * Delegates raw JWT codec operations (decode / verify / sign) to an injected ITokenProvider,
 * keeping the core free of any concrete JWT library dependency.
 */
export class TokenManager {
  constructor(
    private readonly grantService: IGrantService,
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
    if (
      claims.type !== TokenType.Session &&
      claims.type !== TokenType.ApiKey &&
      claims.type !== TokenType.ProjectApp
    ) {
      return false;
    }
    if (
      (claims.type === TokenType.ApiKey || claims.type === TokenType.ProjectApp) &&
      !claims.scope
    ) {
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

  /**
   * Sign a project-app scoped token (e.g. from project OAuth callback).
   * Same key resolution as API key; payload includes type ProjectApp and granted scopes.
   */
  async signProjectAppToken(
    payload: ApiKeyTokenPayload & { scopes: string[] },
    options?: SignApiKeyTokenOptions
  ): Promise<string> {
    const getKey = this.grantService.getSigningKeyForScope;
    if (!getKey) {
      throw new NoSessionSigningKeyError('Project app token signing not implemented');
    }
    const scopeForKey = options?.signingScope ?? payload.scope;
    const key = await this.grantService.getSigningKeyForScope(scopeForKey, options?.transaction);
    if (!key) {
      throw new NoSessionSigningKeyError('No signing key found for scope');
    }
    const jwtPayload = { ...payload, type: TokenType.ProjectApp, scopes: payload.scopes };
    return this.signWithKey(jwtPayload, key);
  }

  private payloadToClaims(decoded: Record<string, unknown>): TokenClaims {
    const amrRaw = decoded.amr;
    const amr = Array.isArray(amrRaw)
      ? amrRaw.filter((x): x is string => typeof x === 'string')
      : undefined;
    const acr = typeof decoded.acr === 'string' ? decoded.acr : undefined;
    const authRaw = decoded.auth_time;
    const auth_time =
      typeof authRaw === 'number'
        ? authRaw
        : typeof authRaw === 'string'
          ? Number.parseInt(authRaw, 10)
          : undefined;

    const mfaAuthRaw = decoded.mfa_auth_time;
    const mfa_auth_time =
      typeof mfaAuthRaw === 'number'
        ? mfaAuthRaw
        : typeof mfaAuthRaw === 'string'
          ? Number.parseInt(mfaAuthRaw, 10)
          : undefined;

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
      mfaVerified: decoded.mfaVerified as boolean | undefined,
      scopes: Array.isArray(decoded.scopes) ? (decoded.scopes as string[]) : undefined,
      ...(amr && amr.length > 0 ? { amr } : {}),
      ...(acr ? { acr } : {}),
      ...(auth_time !== undefined && !Number.isNaN(auth_time) ? { auth_time } : {}),
      ...(mfa_auth_time !== undefined && !Number.isNaN(mfa_auth_time) ? { mfa_auth_time } : {}),
    };
  }

  private signWithKey(payload: Record<string, unknown>, key: SessionSigningKey): string {
    return this.tokenProvider.sign(payload, key.privateKeyPem, {
      algorithm: 'RS256',
      keyid: key.kid,
    });
  }
}
