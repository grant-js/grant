import type {
  IAuditLogger,
  IPermissionRepository,
  IProjectRepository,
  IProjectUserPermissionRepository,
  IProjectUserPermissionService,
  IUserRepository,
} from '@grantjs/core';
import {
  AddProjectUserPermissionInput,
  ProjectUserPermission,
  QueryProjectUserPermissionsInput,
  RemoveProjectUserPermissionInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addProjectUserPermissionInputSchema,
  getProjectUserPermissionsParamsSchema,
  projectUserPermissionSchema,
  removeProjectUserPermissionInputSchema,
} from './project-user-permissions.schemas';

export class ProjectUserPermissionService implements IProjectUserPermissionService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly userRepository: IUserRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly projectUserPermissionRepository: IProjectUserPermissionRepository,
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

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    const users = await this.userRepository.getUsers({ ids: [userId], limit: 1 }, transaction);

    if (users.users.length === 0) {
      throw new NotFoundError('User');
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

  private async projectHasUserPermission(
    projectId: string,
    userId: string,
    permissionId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.userExists(userId, transaction);
    await this.permissionExists(permissionId, transaction);
    const existing = await this.projectUserPermissionRepository.getProjectUserPermissions(
      { projectId, userId },
      transaction
    );

    return existing.some((row) => row.permissionId === permissionId);
  }

  public async getProjectUserPermissions(
    params: QueryProjectUserPermissionsInput,
    transaction?: Transaction
  ): Promise<ProjectUserPermission[]> {
    const context = 'ProjectUserPermissionService.getProjectUserPermissions';
    const validatedParams = validateInput(getProjectUserPermissionsParamsSchema, params, context);

    if (validatedParams.projectId) {
      await this.projectExists(validatedParams.projectId, transaction);
    }

    const result = await this.projectUserPermissionRepository.getProjectUserPermissions(
      validatedParams,
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(projectUserPermissionSchema).array(),
      result,
      context
    );
  }

  public async addProjectUserPermission(
    params: AddProjectUserPermissionInput,
    transaction?: Transaction
  ): Promise<ProjectUserPermission> {
    const context = 'ProjectUserPermissionService.addProjectUserPermission';
    const validatedParams = validateInput(addProjectUserPermissionInputSchema, params, context);
    const { projectId, userId, permissionId } = validatedParams;

    const hasRow = await this.projectHasUserPermission(
      projectId,
      userId,
      permissionId,
      transaction
    );

    if (hasRow) {
      throw new ConflictError(
        'Project already has this user permission',
        'ProjectUserPermission',
        'permissionId'
      );
    }

    const row = await this.projectUserPermissionRepository.addProjectUserPermission(
      validatedParams,
      transaction
    );

    const newValues = {
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      permissionId: row.permissionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    await this.audit.logCreate(row.id, newValues, { context }, transaction);

    return validateOutput(createDynamicSingleSchema(projectUserPermissionSchema), row, context);
  }

  public async removeProjectUserPermission(
    params: RemoveProjectUserPermissionInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectUserPermission> {
    const context = 'ProjectUserPermissionService.removeProjectUserPermission';
    const validatedParams = validateInput(removeProjectUserPermissionInputSchema, params, context);
    const { projectId, userId, permissionId, hardDelete } = validatedParams;

    const hasRow = await this.projectHasUserPermission(
      projectId,
      userId,
      permissionId,
      transaction
    );

    if (!hasRow) {
      throw new NotFoundError('Permission');
    }

    const isHardDelete = hardDelete === true;

    const row = isHardDelete
      ? await this.projectUserPermissionRepository.hardDeleteProjectUserPermission(
          validatedParams,
          transaction
        )
      : await this.projectUserPermissionRepository.softDeleteProjectUserPermission(
          validatedParams,
          transaction
        );

    const oldValues = {
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
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

    return validateOutput(createDynamicSingleSchema(projectUserPermissionSchema), row, context);
  }
}
