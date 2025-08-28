import {
  QueryUserRolesArgs,
  MutationAddUserRoleArgs,
  MutationRemoveUserRoleArgs,
  UserRole,
} from '@/graphql/generated/types';
import { IUserRepository, IRoleRepository } from '@/graphql/repositories';
import { IUserRoleRepository } from '@/graphql/repositories/user-roles/interface';
import { userRolesAuditLogs } from '@/graphql/repositories/user-roles/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IUserRoleService } from './interface';
import {
  getUserRolesParamsSchema,
  addUserRoleParamsSchema,
  removeUserRoleParamsSchema,
  userRoleSchema,
} from './schemas';

export class UserRoleService extends AuditService implements IUserRoleService {
  constructor(
    private readonly userRoleRepository: IUserRoleRepository,
    private readonly userRepository: IUserRepository,
    private readonly roleRepository: IRoleRepository,
    user: AuthenticatedUser | null
  ) {
    super(userRolesAuditLogs, 'userRoleId', user);
  }

  private async userExists(userId: string): Promise<void> {
    const users = await this.userRepository.getUsers({
      ids: [userId],
      limit: 1,
    });

    if (users.users.length === 0) {
      throw new Error('User not found');
    }
  }

  private async roleExists(roleId: string): Promise<void> {
    const roles = await this.roleRepository.getRoles({
      ids: [roleId],
      limit: 1,
    });

    if (roles.roles.length === 0) {
      throw new Error('Role not found');
    }
  }

  private async userHasRole(userId: string, roleId: string): Promise<boolean> {
    await this.userExists(userId);
    await this.roleExists(roleId);
    const existingUserRoles = await this.userRoleRepository.getUserRoles({
      userId,
    });

    return existingUserRoles.some((ur) => ur.roleId === roleId);
  }

  public async getUserRoles(params: Omit<QueryUserRolesArgs, 'scope'>): Promise<UserRole[]> {
    const validatedParams = validateInput(getUserRolesParamsSchema, params, 'getUserRoles method');

    await this.userExists(validatedParams.userId);

    const result = await this.userRoleRepository.getUserRoles({ userId: validatedParams.userId });
    return validateOutput(
      createDynamicSingleSchema(userRoleSchema).array(),
      result,
      'getUserRoles method'
    );
  }

  public async addUserRole(params: MutationAddUserRoleArgs): Promise<UserRole> {
    const validatedParams = validateInput(addUserRoleParamsSchema, params, 'addUserRole method');

    const hasRole = await this.userHasRole(
      validatedParams.input.userId,
      validatedParams.input.roleId
    );

    if (hasRole) {
      throw new Error('User already has this role');
    }

    const userRole = await this.userRoleRepository.addUserRole(validatedParams);

    const newValues = {
      id: userRole.id,
      userId: userRole.userId,
      roleId: userRole.roleId,
      createdAt: userRole.createdAt,
      updatedAt: userRole.updatedAt,
    };

    const metadata = {
      source: 'add_user_role_mutation',
    };

    await this.logCreate(userRole.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(userRoleSchema),
      userRole,
      'addUserRole method'
    );
  }

  public async removeUserRole(
    params: MutationRemoveUserRoleArgs & { hardDelete?: boolean }
  ): Promise<UserRole> {
    const validatedParams = validateInput(
      removeUserRoleParamsSchema,
      params,
      'removeUserRole method'
    );

    const hasRole = await this.userHasRole(
      validatedParams.input.userId,
      validatedParams.input.roleId
    );

    if (!hasRole) {
      throw new Error('User does not have this role');
    }

    const isHardDelete = params.hardDelete === true;

    const userRole = isHardDelete
      ? await this.userRoleRepository.hardDeleteUserRole(validatedParams)
      : await this.userRoleRepository.softDeleteUserRole(validatedParams);

    const oldValues = {
      id: userRole.id,
      userId: userRole.userId,
      roleId: userRole.roleId,
      createdAt: userRole.createdAt,
      updatedAt: userRole.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: userRole.deletedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_user_role_mutation',
      };
      await this.logHardDelete(userRole.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_user_role_mutation',
      };
      await this.logSoftDelete(userRole.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(userRoleSchema),
      userRole,
      'removeUserRole method'
    );
  }
}
