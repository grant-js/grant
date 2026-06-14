import type {
  IAuditLogger,
  IPermissionRepository,
  IRolePermissionRepository,
  IRolePermissionService,
  IRoleRepository,
} from '@grantjs/core';
import {
  AssignRolePermissionInput,
  QueryRolePermissionsInput,
  RevokeRolePermissionInput,
  RolePermission,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  assignRolePermissionInputSchema,
  queryRolePermissionsArgsSchema,
  revokeRolePermissionInputSchema,
  rolePermissionSchema,
} from './role-permissions.schemas';

export class RolePermissionService implements IRolePermissionService {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly rolePermissionRepository: IRolePermissionRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async roleExists(roleId: string, transaction?: Transaction): Promise<void> {
    const roles = await this.roleRepository.getRoles({ ids: [roleId], limit: 1 }, transaction);

    if (roles.roles.length === 0) {
      throw new NotFoundError('Role');
    }
  }

  private async permissionExists(permissionId: string, transaction?: Transaction): Promise<void> {
    const permissions = await this.permissionRepository.getPermissions(
      { ids: [permissionId], limit: 1 },
      transaction
    );

    if (permissions.permissions.length === 0) {
      throw new NotFoundError('Permission');
    }
  }

  private async roleHasPermission(
    roleId: string,
    permissionId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.roleExists(roleId, transaction);
    await this.permissionExists(permissionId, transaction);
    const existing = await this.rolePermissionRepository.getRolePermissions(
      { roleId },
      transaction
    );

    return existing.some((rp) => rp.permissionId === permissionId);
  }

  public async getRolePermissions(
    params: QueryRolePermissionsInput,
    transaction?: Transaction
  ): Promise<RolePermission[]> {
    const context = 'RolePermissionService.getRolePermissions';
    const validatedParams = validateInput(queryRolePermissionsArgsSchema, params, context);
    const { roleId, permissionId } = validatedParams;

    if (roleId) {
      await this.roleExists(roleId, transaction);
    }
    if (permissionId) {
      await this.permissionExists(permissionId, transaction);
    }

    const result = await this.rolePermissionRepository.getRolePermissions(
      validatedParams,
      transaction
    );

    return validateOutput(createDynamicSingleSchema(rolePermissionSchema).array(), result, context);
  }

  public async countRolePermissions(
    params: { roleId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.rolePermissionRepository.countRolePermissions(params, transaction);
  }

  public async assignRolePermission(
    params: AssignRolePermissionInput,
    transaction?: Transaction
  ): Promise<RolePermission> {
    const context = 'RolePermissionService.assignRolePermission';
    const validatedParams = validateInput(assignRolePermissionInputSchema, params, context);
    const { roleId, permissionId } = validatedParams;

    const hasPermission = await this.roleHasPermission(roleId, permissionId, transaction);

    if (hasPermission) {
      throw new ConflictError('Role already has this permission', 'RolePermission', 'permissionId');
    }

    const rolePermission = await this.rolePermissionRepository.addRolePermission(
      { roleId, permissionId, scope: validatedParams.scope },
      transaction
    );

    const newValues = {
      id: rolePermission.id,
      roleId: rolePermission.roleId,
      permissionId: rolePermission.permissionId,
      createdAt: rolePermission.createdAt,
      updatedAt: rolePermission.updatedAt,
    };

    await this.audit.logCreate(rolePermission.id, newValues, { context }, transaction);

    return validateOutput(createDynamicSingleSchema(rolePermissionSchema), rolePermission, context);
  }

  public async revokeRolePermission(
    params: RevokeRolePermissionInput & DeleteParams,
    transaction?: Transaction
  ): Promise<RolePermission> {
    const context = 'RolePermissionService.revokeRolePermission';
    const validatedParams = validateInput(revokeRolePermissionInputSchema, params, context);
    const { roleId, permissionId, hardDelete } = validatedParams;

    const hasPermission = await this.roleHasPermission(roleId, permissionId, transaction);

    if (!hasPermission) {
      throw new NotFoundError('Permission');
    }

    const isHardDelete = hardDelete === true;

    const rolePermission = isHardDelete
      ? await this.rolePermissionRepository.hardDeleteRolePermission(validatedParams, transaction)
      : await this.rolePermissionRepository.softDeleteRolePermission(validatedParams, transaction);

    const oldValues = {
      id: rolePermission.id,
      roleId: rolePermission.roleId,
      permissionId: rolePermission.permissionId,
      createdAt: rolePermission.createdAt,
      updatedAt: rolePermission.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: rolePermission.deletedAt,
    };

    const metadata = { context, hardDelete };

    if (isHardDelete) {
      await this.audit.logHardDelete(rolePermission.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        rolePermission.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(createDynamicSingleSchema(rolePermissionSchema), rolePermission, context);
  }
}
