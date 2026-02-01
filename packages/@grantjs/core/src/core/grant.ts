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

  private getAuth(token: string | null, requestScope?: Scope | null): GrantAuth | null {
    if (!token) {
      return null;
    }

    const claims = this.tokenParser.parse(token, this.jwtSecret);

    if (!this.tokenParser.validate(claims)) {
      throw new TokenValidationError('Token validation failed');
    }

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

  public authenticate(authorizationHeader: string | null, requestScope?: Scope | null) {
    const bearerToken = this.getBearerToken(authorizationHeader);
    this.auth = this.getAuth(bearerToken, requestScope);
  }

  public isAuthenticated(): boolean {
    return this.auth !== null;
  }

  public async isAuthorized(
    permission: IsAuthorizedPermissionInput,
    context: IsAuthorizedContextInput
  ): Promise<AuthorizationResult> {
    if (!this.isAuthenticated()) {
      return { authorized: false, reason: AuthorizationReason.NotAuthenticated };
    }

    const { userId, scope } = this.auth!;

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
