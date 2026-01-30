import { GrantService as IGrantService } from '@grantjs/core';
import { ExecutionContextGroup, ExecutionContextRole, ExecutionContextUser } from '@grantjs/core';
import { Permission, Scope } from '@grantjs/schema';

import { GrantRepository } from '@/repositories/grant.repository';

export class GrantService implements IGrantService {
  constructor(private readonly grantRepository: GrantRepository) {}

  async getUserPermissions(
    userId: string,
    scope: Scope,
    resourceSlug: string,
    action: string
  ): Promise<Permission[]> {
    const roleIds = await this.grantRepository.getUserRoleIdsInScope(userId, scope);

    if (roleIds.length === 0) {
      return [];
    }

    const groupIds = await this.grantRepository.getGroupIdsForRoles(roleIds);

    if (groupIds.length === 0) {
      return [];
    }

    const permissionIds = await this.grantRepository.getPermissionIdsForGroups(groupIds);

    if (permissionIds.length === 0) {
      return [];
    }

    return this.grantRepository.getPermissionsByIds(permissionIds, action, resourceSlug);
  }

  async getUserRoles(userId: string, scope: Scope): Promise<ExecutionContextRole[]> {
    const roleIds = await this.grantRepository.getUserRoleIdsInScope(userId, scope);

    if (roleIds.length === 0) {
      return [];
    }

    return this.grantRepository.getUserRoles(userId, scope);
  }

  async getUserGroups(userId: string, scope: Scope): Promise<ExecutionContextGroup[]> {
    const roleIds = await this.grantRepository.getUserRoleIdsInScope(userId, scope);

    if (roleIds.length === 0) {
      return [];
    }

    const groupIds = await this.grantRepository.getGroupIdsForRoles(roleIds);

    if (groupIds.length === 0) {
      return [];
    }

    return this.grantRepository.getUserGroups(userId, scope);
  }

  async getUser(userId: string, scope?: Scope): Promise<ExecutionContextUser> {
    return this.grantRepository.getUser(userId, scope);
  }
}
