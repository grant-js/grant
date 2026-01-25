import {
  AuthorizationReason,
  IsAuthorizedContextInput,
  IsAuthorizedPermissionInput,
  Scope,
  TokenType,
} from '@grantjs/schema';

import { TokenValidationError } from '../errors/grant-exception';

import { ConditionEvaluator } from './condition-evaluator';
import { PermissionChecker } from './permission-checker';
import { TokenParser } from './token-parser';

import type { AuthorizationResult, GrantAuth, GrantConfig } from '../types';

export class Grant {
  private tokenParser: TokenParser;
  private conditionEvaluator: ConditionEvaluator;
  private permissionChecker: PermissionChecker;
  private jwtSecret: string;

  public auth: GrantAuth | null = null;

  constructor(config: GrantConfig) {
    this.jwtSecret = config.jwtSecret;
    this.tokenParser = new TokenParser();
    this.conditionEvaluator = new ConditionEvaluator();
    this.permissionChecker = new PermissionChecker(this.conditionEvaluator, config.grantService);
  }

  private getBearerToken(authorizationHeader: string | null): string | null {
    if (!authorizationHeader) {
      return null;
    }

    if (!authorizationHeader.startsWith('Bearer ')) {
      return null;
    }
    return authorizationHeader.substring(7);
  }

  private getAuth(token: string | null): GrantAuth | null {
    if (!token) {
      return null;
    }

    const claims = this.tokenParser.parse(token, this.jwtSecret);

    if (!this.tokenParser.validate(claims)) {
      throw new TokenValidationError('Token validation failed');
    }

    const { sub: userId, scope, type, exp: expiresAt, jti: tokenId } = claims;

    return { userId, scope, type, expiresAt, tokenId };
  }

  public authenticate(authorizationHeader: string | null) {
    const bearerToken = this.getBearerToken(authorizationHeader);
    this.auth = this.getAuth(bearerToken);
  }

  public isAuthenticated(): boolean {
    return this.auth !== null;
  }

  public async isAuthorized(
    permission: IsAuthorizedPermissionInput,
    context: IsAuthorizedContextInput,
    scopeOverride?: Scope // Optional scope override (only allowed for session tokens)
  ): Promise<AuthorizationResult> {
    if (!this.isAuthenticated()) {
      return { authorized: false, reason: AuthorizationReason.NotAuthenticated };
    }

    const { userId, scope: tokenScope, type: tokenType } = this.auth!;

    // Determine which scope to use
    let scope: Scope | undefined;

    if (scopeOverride) {
      // Only allow scope override for session tokens
      if (tokenType !== TokenType.Session) {
        // API key tokens have fixed scope - override not allowed
        scope = tokenScope;
      } else {
        // Session tokens can use scope override (dynamic scope)
        scope = scopeOverride;
      }
    } else {
      // No override provided - use token scope
      scope = tokenScope;
    }

    if (!scope) {
      return { authorized: false, reason: AuthorizationReason.InvalidScope };
    }

    return this.permissionChecker.check({
      userId,
      scope,
      permission,
      context,
    });
  }
}
