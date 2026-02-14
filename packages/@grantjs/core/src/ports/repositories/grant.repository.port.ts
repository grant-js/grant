/**
 * Grant (authorization) repository port interface.
 * The concrete implementation (Drizzle-based) lives in apps/api.
 */
import type {
  ExecutionContextGroup,
  ExecutionContextRole,
  ExecutionContextUser,
} from '../../types';
import type { Permission, Scope } from '@grantjs/schema';

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
    transaction?: unknown
  ): Promise<ExecutionContextRole[]>;

  getUserGroups(
    userId: string,
    scope: Scope,
    transaction?: unknown
  ): Promise<ExecutionContextGroup[]>;

  getUserRoleIdsInScope(userId: string, scope: Scope, transaction?: unknown): Promise<string[]>;

  getGroupIdsForRoles(roleIds: string[], transaction?: unknown): Promise<string[]>;

  getPermissionIdsForGroups(groupIds: string[], transaction?: unknown): Promise<string[]>;
}
