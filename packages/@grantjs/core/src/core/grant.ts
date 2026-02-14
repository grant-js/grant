import {
  AuthorizationReason,
  IsAuthorizedContextInput,
  IsAuthorizedPermissionInput,
  Scope,
  TokenType,
} from '@grantjs/schema';

import { ConditionEvaluator } from './condition-evaluator';
import { PermissionChecker } from './permission-checker';
import { TokenManager } from './token-manager';

import type { ITokenProvider } from '../ports/token.port';
import type {
  ApiKeyTokenPayload,
  AuthorizationResult,
  GrantAuth,
  GrantService,
  TokenClaims,
} from '../types';

export class Grant {
  private conditionEvaluator: ConditionEvaluator;
  private permissionChecker: PermissionChecker;
  private tokenManager: TokenManager;

  public auth: GrantAuth | null = null;

  constructor(
    private readonly grantService: GrantService,
    tokenProvider: ITokenProvider
  ) {
    this.conditionEvaluator = new ConditionEvaluator();
    this.permissionChecker = new PermissionChecker(this.conditionEvaluator, grantService);
    this.tokenManager = new TokenManager(grantService, tokenProvider);
  }

  private getBearerToken(authorizationHeader: string | null): string | null {
    if (!authorizationHeader?.startsWith('Bearer ')) {
      return null;
    }
    return authorizationHeader.substring(7);
  }

  private async getAuth(
    token: string | null,
    requestScope?: Scope | null
  ): Promise<GrantAuth | null> {
    if (!token) {
      return null;
    }
    const claims = await this.tokenManager.verifyToken(token);
    const auth = this.claimsToAuth(claims, requestScope);

    // Verify user still exists and is not soft-deleted.
    // Skip for API key tokens — they have their own lifecycle.
    if (auth.type === TokenType.Session) {
      await this.grantService.getUser(auth.userId);
    }

    return auth;
  }

  private claimsToAuth(claims: TokenClaims, requestScope?: Scope | null): GrantAuth {
    const {
      sub: userId,
      scope: tokenScope,
      type,
      exp: expiresAt,
      jti: tokenId,
      isVerified: isVerifiedClaim,
    } = claims;
    const isVerified = type === TokenType.ApiKey ? true : isVerifiedClaim;
    const scope = requestScope && type === TokenType.Session ? requestScope : tokenScope;
    return {
      userId,
      scope,
      type,
      expiresAt,
      tokenId,
      isVerified,
    };
  }

  public async authenticate(
    authorizationHeader: string | null,
    requestScope?: Scope | null
  ): Promise<void> {
    const bearerToken = this.getBearerToken(authorizationHeader);
    try {
      this.auth = await this.getAuth(bearerToken, requestScope);
    } catch {
      this.auth = null;
    }
  }

  public async signSessionToken(payload: Record<string, unknown>): Promise<string> {
    return this.tokenManager.signSessionToken(payload);
  }

  public async verifyToken(
    token: string,
    options?: { ignoreExpiration?: boolean }
  ): Promise<TokenClaims> {
    return this.tokenManager.verifyToken(token, options);
  }

  public isAuthenticated(): boolean {
    return this.auth !== null;
  }

  public getPublicKeysForJwks(
    scope: Scope | null,
    retentionCutoff: Date
  ): Promise<Array<{ kid: string; publicKeyPem: string }>> {
    return this.grantService.getPublicKeysForJwks(scope, retentionCutoff);
  }

  public async invalidateSessionSigningKeyCache(): Promise<void> {
    await this.grantService.invalidateSessionSigningKeyCache();
  }

  public async rotateSystemSigningKey(
    transaction?: unknown
  ): Promise<{ kid: string; createdAt: Date } | null> {
    return this.grantService.rotateSystemSigningKey(transaction);
  }

  public async signApiKeyToken(
    payload: ApiKeyTokenPayload,
    options?: { signingScope?: Scope; transaction?: unknown }
  ): Promise<string> {
    return this.tokenManager.signApiKeyToken(payload, options);
  }

  public async isAuthorized(
    permission: IsAuthorizedPermissionInput,
    context: IsAuthorizedContextInput,
    scopeOverride?: Scope | null
  ): Promise<AuthorizationResult> {
    if (!this.isAuthenticated()) {
      return { authorized: false, reason: AuthorizationReason.NotAuthenticated };
    }

    const { userId, scope, type } = this.auth!;

    if (!scope) {
      return { authorized: false, reason: AuthorizationReason.InvalidScope };
    }

    const effectiveScope =
      scopeOverride != null && type === TokenType.Session ? scopeOverride : scope;

    return this.permissionChecker.check({
      userId,
      scope: effectiveScope,
      permission,
      context,
    });
  }
}
