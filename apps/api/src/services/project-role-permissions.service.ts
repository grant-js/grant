import type {
  IAuditLogger,
  IPermissionRepository,
  IProjectRepository,
  IProjectRolePermissionRepository,
  IProjectRolePermissionService,
  IRoleRepository,
} from '@grantjs/core';
import {
  AddProjectRolePermissionInput,
  ProjectRolePermission,
  QueryProjectRolePermissionsInput,
  RemoveProjectRolePermissionInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addProjectRolePermissionInputSchema,
  getProjectRolePermissionsParamsSchema,
  projectRolePermissionSchema,
  removeProjectRolePermissionInputSchema,
} from './project-role-permissions.schemas';

export class ProjectRolePermissionService implements IProjectRolePermissionService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly roleRepository: IRoleRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly projectRolePermissionRepository: IProjectRolePermissionRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.projectRepository.getProjects(
      { ids: [projectId], limit: 1 },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project');
    }
  }

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

  private async projectHasRolePermission(
    projectId: string,
    roleId: string,
    permissionId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.roleExists(roleId, transaction);
    await this.permissionExists(permissionId, transaction);
    const existing = await this.projectRolePermissionRepository.getProjectRolePermissions(
      { projectId, roleId },
      transaction
    );

    return existing.some((row) => row.permissionId === permissionId);
  }

  public async getProjectRolePermissions(
    params: QueryProjectRolePermissionsInput,
    transaction?: Transaction
  ): Promise<ProjectRolePermission[]> {
    const context = 'ProjectRolePermissionService.getProjectRolePermissions';
    const validatedParams = validateInput(getProjectRolePermissionsParamsSchema, params, context);

    if (validatedParams.projectId) {
      await this.projectExists(validatedParams.projectId, transaction);
    }

    const result = await this.projectRolePermissionRepository.getProjectRolePermissions(
      validatedParams,
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(projectRolePermissionSchema).array(),
      result,
      context
    );
  }

  public async addProjectRolePermission(
    params: AddProjectRolePermissionInput,
    transaction?: Transaction
  ): Promise<ProjectRolePermission> {
    const context = 'ProjectRolePermissionService.addProjectRolePermission';
    const validatedParams = validateInput(addProjectRolePermissionInputSchema, params, context);
    const { projectId, roleId, permissionId } = validatedParams;

    const hasRow = await this.projectHasRolePermission(
      projectId,
      roleId,
      permissionId,
      transaction
    );

    if (hasRow) {
      throw new ConflictError(
        'Project already has this role permission',
        'ProjectRolePermission',
        'permissionId'
      );
    }

    const row = await this.projectRolePermissionRepository.addProjectRolePermission(
      validatedParams,
      transaction
    );

    const newValues = {
      id: row.id,
      projectId: row.projectId,
      roleId: row.roleId,
      permissionId: row.permissionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    await this.audit.logCreate(row.id, newValues, { context }, transaction);

    return validateOutput(createDynamicSingleSchema(projectRolePermissionSchema), row, context);
  }

  public async removeProjectRolePermission(
    params: RemoveProjectRolePermissionInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectRolePermission> {
    const context = 'ProjectRolePermissionService.removeProjectRolePermission';
    const validatedParams = validateInput(removeProjectRolePermissionInputSchema, params, context);
    const { projectId, roleId, permissionId, hardDelete } = validatedParams;

    const hasRow = await this.projectHasRolePermission(
      projectId,
      roleId,
      permissionId,
      transaction
    );

    if (!hasRow) {
      throw new NotFoundError('Permission');
    }

    const isHardDelete = hardDelete === true;

    const row = isHardDelete
      ? await this.projectRolePermissionRepository.hardDeleteProjectRolePermission(
          validatedParams,
          transaction
        )
      : await this.projectRolePermissionRepository.softDeleteProjectRolePermission(
          validatedParams,
          transaction
        );

    const oldValues = {
      id: row.id,
      projectId: row.projectId,
      roleId: row.roleId,
      permissionId: row.permissionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    const newValues = { ...oldValues, deletedAt: row.deletedAt };
    const metadata = { context, hardDelete };

    if (isHardDelete) {
      await this.audit.logHardDelete(row.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(row.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectRolePermissionSchema), row, context);
  }
}
