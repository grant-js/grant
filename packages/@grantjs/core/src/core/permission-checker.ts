import { AuthorizationReason } from '../../../schema/src';

import { ConditionEvaluator } from './condition-evaluator';

import type { Permission } from '../../../schema/src';
import type {
  AuthorizationResult,
  GrantService,
  CheckPermissionParams,
  ConditionExpression,
  ExecutionContextGroup,
  ExecutionContextRole,
  EvaluatePermissionConditionParams,
  ExecutionContext,
  PermissionConditionEvaluationResult,
  RoleGroupCombination,
} from '../types';

export class PermissionChecker {
  constructor(
    private conditionEvaluator: ConditionEvaluator,
    private authorizationService: GrantService
  ) {}

  private getRoleGroupCombinations(
    roles: ExecutionContextRole[],
    groups: ExecutionContextGroup[]
  ): Array<RoleGroupCombination> {
    const combinations: Array<RoleGroupCombination> = [];

    if (roles.length === 0 && groups.length === 0) {
      combinations.push({});
      return combinations;
    }

    if (roles.length === 0) {
      for (const group of groups) {
        combinations.push({ group });
      }
      return combinations;
    }

    if (groups.length === 0) {
      for (const role of roles) {
        combinations.push({ role });
      }
      return combinations;
    }

    for (const role of roles) {
      for (const group of groups) {
        combinations.push({
          role,
          group,
        });
      }
    }

    return combinations;
  }

  private async evaluatePermissionCondition(
    params: EvaluatePermissionConditionParams
  ): Promise<PermissionConditionEvaluationResult> {
    const { permission, user, roles, groups, scope, resolvedResource } = params;

    const roleGroupCombinations = this.getRoleGroupCombinations(roles, groups);

    for (const { role, group } of roleGroupCombinations) {
      const context: ExecutionContext = {
        user,
        role,
        group,
        scope,
        resolvedResource,
      };

      const conditionMet = await this.conditionEvaluator.evaluate(
        permission.condition as ConditionExpression,
        context
      );

      if (conditionMet) {
        return { authorized: true, context };
      }
    }

    return { authorized: false };
  }

  private permissionNotFound(): AuthorizationResult {
    return {
      authorized: false,
      reason: AuthorizationReason.NoMatchingPermissionFound,
    };
  }

  private permissionGrantedResult(permission: Permission): AuthorizationResult {
    return {
      authorized: true,
      reason: AuthorizationReason.PermissionGrantedNoCondition,
      matchedPermission: permission,
    };
  }

  private conditionMetResult(
    permission: Permission,
    context: ExecutionContext
  ): AuthorizationResult {
    return {
      authorized: true,
      reason: AuthorizationReason.PermissionGrantedConditionMet,
      matchedPermission: permission,
      matchedCondition: permission.condition as ConditionExpression,
      evaluatedContext: context,
    };
  }

  private conditionNotMetResult(permission: Permission): AuthorizationResult {
    return {
      authorized: false,
      reason: AuthorizationReason.PermissionFoundConditionNotMet,
      matchedPermission: permission,
    };
  }

  public async check(params: CheckPermissionParams): Promise<AuthorizationResult> {
    const { userId, scope, permission, context } = params;

    const resourceSlug = permission.resource;
    const resolvedResource = context.resource;
    const action = permission.action;

    const permissions = await this.authorizationService.getUserPermissions(
      userId,
      scope,
      resourceSlug,
      action
    );

    if (permissions.length === 0) {
      return this.permissionNotFound();
    }

    // Filter out permissions with no condition (null, undefined, or empty object {})
    const conditionalPermissions = permissions.filter((p) => {
      if (!p.condition) return false;
      // Treat empty objects {} the same as null (no condition)
      if (typeof p.condition === 'object' && Object.keys(p.condition).length === 0) {
        return false;
      }
      return true;
    });

    if (conditionalPermissions.length === 0) {
      return this.permissionGrantedResult(permissions[0]);
    }

    const user = await this.authorizationService.getUser(userId);
    const roles = await this.authorizationService.getUserRoles(userId, scope);
    const groups = await this.authorizationService.getUserGroups(userId, scope);

    for (const conditionalPermission of conditionalPermissions) {
      const { authorized, context } = await this.evaluatePermissionCondition({
        permission: conditionalPermission,
        user,
        roles,
        groups,
        scope,
        resolvedResource,
      });

      if (authorized && context) {
        return this.conditionMetResult(conditionalPermission, context);
      }
    }

    return this.conditionNotMetResult(permissions[0]);
  }
}
