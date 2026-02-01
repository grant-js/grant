import { Grant, GrantAuth } from '@grantjs/core';
import { AuthorizationResult, IsAuthorizedInput } from '@grantjs/schema';

import { createModuleLogger } from '@/lib/logger';

import { authorizationResultSchema, isAuthorizedInputSchema } from './auth.schemas';
import { validateInput, validateOutput } from './common';

export class AuthService {
  private readonly logger = createModuleLogger('AuthService');

  constructor(private readonly grant: Grant) {}

  public async isAuthorized(
    input: IsAuthorizedInput,
    userId: string
  ): Promise<AuthorizationResult> {
    const context = 'AuthService.isAuthorized';
    const validatedInput = validateInput(isAuthorizedInputSchema, input, context);

    const { permission, context: authContext } = validatedInput;

    this.logger.debug(
      {
        userId,
        permission: {
          resource: permission.resource,
          action: permission.action,
        },
        context: authContext?.resource ? { hasResource: true } : { hasResource: false },
      },
      'Evaluating authorization'
    );

    const startTime = Date.now();
    const result = await this.grant.isAuthorized(permission, authContext || {});
    const duration = Date.now() - startTime;

    const logData = {
      userId,
      permission: {
        resource: permission.resource,
        action: permission.action,
      },
      authorized: result.authorized,
      reason: result.reason,
      matchedPermissionId: result.matchedPermission?.id,
      hasMatchedCondition: !!result.matchedCondition,
      hasEvaluatedContext: !!result.evaluatedContext,
      duration,
      cached: false,
    };

    if (result.authorized) {
      this.logger.info(logData, 'Authorization granted');
    } else {
      this.logger.warn(logData, 'Authorization denied');
    }

    const output = {
      authorized: result.authorized,
      reason: result.reason,
      matchedPermission: result.matchedPermission,
      matchedCondition: result.matchedCondition as Record<string, unknown> | null | undefined,
      evaluatedContext: result.evaluatedContext as Record<string, unknown> | null | undefined,
    };

    return validateOutput(authorizationResultSchema, output, context) as AuthorizationResult;
  }

  public isAuthenticated(): boolean {
    return this.grant.isAuthenticated();
  }

  public getAuth(): GrantAuth | null {
    if (!this.grant.isAuthenticated()) {
      return null;
    }

    const auth = this.grant.auth;
    if (!auth?.userId || !auth?.type) {
      return null;
    }

    return auth;
  }
}
