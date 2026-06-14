/**
 * Grant (authorization) repository port interface.
 * The concrete implementation (Drizzle-based) lives in apps/api.
 */
import type { Permission, Scope, TokenType } from '@grantjs/schema';

import type {
  ExecutionContextGroup,
  ExecutionContextRole,
  ExecutionContextUser,
} from '../../types';

export interface IGrantRepository {
  getUser(userId: string, scope?: Scope, transaction?: unknown): Promise<ExecutionContextUser>;

  getPermissionsByIds(
    permissionIds: string[],
    action: string,
    resourceSlug: string,
    transaction?: unknown
  ): Promise<Permission[]>;

  getUserRoles(
    userId: string,
    scope: Scope,
    transaction?: unknown,
    options?: { tokenType?: TokenType }
  ): Promise<ExecutionContextRole[]>;

  getUserGroups(
    userId: string,
    scope: Scope,
    transaction?: unknown,
    options?: { tokenType?: TokenType }
  ): Promise<ExecutionContextGroup[]>;

  getUserRoleIdsInScope(
    userId: string,
    scope: Scope,
    transaction?: unknown,
    options?: { tokenType?: TokenType }
  ): Promise<string[]>;

  getGroupIdsForRoles(roleIds: string[], transaction?: unknown): Promise<string[]>;

  getPermissionIdsForGroups(groupIds: string[], transaction?: unknown): Promise<string[]>;

  getDirectPermissionIdsForRoles(
    roleIds: string[],
    projectId?: string | null,
    transaction?: unknown
  ): Promise<string[]>;

  getDirectPermissionIdsForUser(
    userId: string,
    projectId?: string | null,
    transaction?: unknown
  ): Promise<string[]>;

  getDirectGroupIdsForUser(
    userId: string,
    projectId?: string | null,
    transaction?: unknown
  ): Promise<string[]>;
}
