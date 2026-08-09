import {
  AuthorizationReason,
  IsAuthorizedContextInput,
  IsAuthorizedPermissionInput,
  Scope,
  TokenType,
} from '@grantjs/schema';

import type { IGrantService } from '../ports/services/grant.service.port';
import type { ITokenProvider } from '../ports/token.port';
import type { ApiKeyTokenPayload, AuthorizationResult, GrantAuth, TokenClaims } from '../types';
import { getAalFromTokenClaims } from './aal';
import { ConditionEvaluator } from './condition-evaluator';
import { PermissionChecker } from './permission-checker';
import { TokenManager } from './token-manager';

export class Grant {
  private conditionEvaluator: ConditionEvaluator;
  private permissionChecker: PermissionChecker;
  private tokenManager: TokenManager;

  public auth: GrantAuth | null = null;

  constructor(
    private readonly grantService: IGrantService,
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
      mfaVerified: mfaVerifiedClaim,
      scopes: grantedScopes,
      amr,
      acr,
      auth_time: authTimeClaim,
      mfa_auth_time: mfaAuthTimeClaim,
    } = claims;
    const isVerified =
      type === TokenType.ApiKey || type === TokenType.ProjectApp ? true : isVerifiedClaim;
    const mfaVerified =
      type === TokenType.ApiKey || type === TokenType.ProjectApp ? true : mfaVerifiedClaim;
    const scope = requestScope && type === TokenType.Session ? requestScope : tokenScope;
    const aal = type === TokenType.Session ? getAalFromTokenClaims(claims) : undefined;
    const authTime =
      type === TokenType.Session && typeof authTimeClaim === 'number' ? authTimeClaim : undefined;
    const mfaAuthTime =
      type === TokenType.Session && typeof mfaAuthTimeClaim === 'number'
        ? mfaAuthTimeClaim
        : undefined;
    return {
      userId,
      scope,
      type,
      expiresAt,
      tokenId,
      isVerified,
      mfaVerified,
      grantedScopes: type === TokenType.ProjectApp ? grantedScopes : undefined,
      ...(type === TokenType.Session && {
        aal,
        ...(Array.isArray(amr) ? { amr: amr as string[] } : {}),
        ...(typeof acr === 'string' ? { acr } : {}),
        ...(authTime !== undefined ? { authTime } : {}),
        ...(mfaAuthTime !== undefined ? { mfaAuthTime } : {}),
      }),
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

  public async signProjectAppToken(
    payload: ApiKeyTokenPayload & { scopes: string[] },
    options?: { signingScope?: Scope; transaction?: unknown }
  ): Promise<string> {
    return this.tokenManager.signProjectAppToken(payload, options);
  }

  /**
   * Return which of the candidate scope slugs (resource:action) the user is granted in the given scope.
   * Used for project-app token scope intersection.
   */
  public async getGrantedScopeSlugs(
    userId: string,
    scope: Scope,
    candidateSlugs: string[]
  ): Promise<string[]> {
    return this.grantService.getGrantedScopeSlugs(userId, scope, candidateSlugs);
  }

  public async isAuthorized(
    permission: IsAuthorizedPermissionInput,
    context: IsAuthorizedContextInput,
    scopeOverride?: Scope | null
  ): Promise<AuthorizationResult> {
    if (!this.isAuthenticated()) {
      return { authorized: false, reason: AuthorizationReason.NotAuthenticated };
    }

    const { userId, scope, type, grantedScopes } = this.auth!;

    if (!scope) {
      return { authorized: false, reason: AuthorizationReason.InvalidScope };
    }

    // Project-app tokens: cap effective permissions by the token's granted scopes (resource:action).
    // Compare case-insensitively so "Document:Create" matches granted "document:create" from DB slugs.
    if (type === TokenType.ProjectApp && grantedScopes && grantedScopes.length > 0) {
      const slug = `${permission.resource}:${permission.action}`;
      const slugLower = slug.toLowerCase();
      const hasScope = grantedScopes.some((s) => (s ?? '').toLowerCase() === slugLower);
      if (!hasScope) {
        return { authorized: false, reason: AuthorizationReason.ScopeNotGranted };
      }
    }

    const effectiveScope =
      scopeOverride != null && type === TokenType.Session ? scopeOverride : scope;

    return this.permissionChecker.check({
      userId,
      scope: effectiveScope,
      permission,
      context,
      tokenType: type,
    });
  }
}
