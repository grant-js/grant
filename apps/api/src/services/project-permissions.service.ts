import { GrantAuth } from '@grantjs/core';
import { DbSchema } from '@grantjs/database';
import { projectPermissionsAuditLogs } from '@grantjs/database';
import {
  ProjectPermission,
  RemoveProjectPermissionInput,
  AddProjectPermissionInput,
  QueryProjectPermissionsInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from './common';
import {
  getProjectPermissionsParamsSchema,
  projectPermissionSchema,
  addProjectPermissionInputSchema,
  removeProjectPermissionInputSchema,
} from './project-permissions.schemas';

export class ProjectPermissionService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: GrantAuth | null,
    db: DbSchema
  ) {
    super(projectPermissionsAuditLogs, 'projectPermissionId', user, db);
  }

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.repositories.projectRepository.getProjects(
      { ids: [projectId], limit: 1 },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project not found', 'errors:notFound.project');
    }
  }

  private async permissionExists(permissionId: string, transaction?: Transaction): Promise<void> {
    const permissions = await this.repositories.permissionRepository.getPermissions(
      { ids: [permissionId], limit: 1 },
      transaction
    );

    if (permissions.permissions.length === 0) {
      throw new NotFoundError('Permission not found', 'errors:notFound.permission');
    }
  }

  private async projectHasPermission(
    projectId: string,
    permissionId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.permissionExists(permissionId, transaction);
    const existingProjectPermissions =
      await this.repositories.projectPermissionRepository.getProjectPermissions(
        { projectId },
        transaction
      );

    return existingProjectPermissions.some((pp) => pp.permissionId === permissionId);
  }

  public async getProjectPermissions(
    params: QueryProjectPermissionsInput,
    transaction?: Transaction
  ): Promise<ProjectPermission[]> {
    const context = 'ProjectPermissionService.getProjectPermissions';

    if (params.projectId) {
      const validatedParams = validateInput(getProjectPermissionsParamsSchema, params, context);
      await this.projectExists(validatedParams.projectId, transaction);
    }

    const result = await this.repositories.projectPermissionRepository.getProjectPermissions(
      params,
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(projectPermissionSchema).array(),
      result,
      context
    );
  }

  public async addProjectPermission(
    params: AddProjectPermissionInput,
    transaction?: Transaction
  ): Promise<ProjectPermission> {
    const context = 'ProjectPermissionService.addProjectPermission';
    const validatedParams = validateInput(addProjectPermissionInputSchema, params, context);
    const { projectId, permissionId } = validatedParams;

    const hasPermission = await this.projectHasPermission(projectId, permissionId, transaction);

    if (hasPermission) {
      throw new ConflictError(
        'Project already has this permission',
        'errors:conflict.duplicateEntry',
        { resource: 'ProjectPermission', field: 'permissionId' }
      );
    }

    const projectPermission =
      await this.repositories.projectPermissionRepository.addProjectPermission(
        { projectId, permissionId },
        transaction
      );

    const newValues = {
      id: projectPermission.id,
      projectId: projectPermission.projectId,
      permissionId: projectPermission.permissionId,
      createdAt: projectPermission.createdAt,
      updatedAt: projectPermission.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(projectPermission.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(projectPermissionSchema),
      projectPermission,
      context
    );
  }

  public async removeProjectPermission(
    params: RemoveProjectPermissionInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectPermission> {
    const context = 'ProjectPermissionService.removeProjectPermission';
    const validatedParams = validateInput(removeProjectPermissionInputSchema, params, context);

    const { projectId, permissionId, hardDelete } = validatedParams;

    const hasPermission = await this.projectHasPermission(projectId, permissionId, transaction);

    if (!hasPermission) {
      throw new NotFoundError(
        'Project does not have this permission',
        'errors:notFound.permission'
      );
    }

    const isHardDelete = hardDelete === true;

    const projectPermission = isHardDelete
      ? await this.repositories.projectPermissionRepository.hardDeleteProjectPermission(
          { projectId, permissionId },
          transaction
        )
      : await this.repositories.projectPermissionRepository.softDeleteProjectPermission(
          { projectId, permissionId },
          transaction
        );

    const oldValues = {
      id: projectPermission.id,
      projectId: projectPermission.projectId,
      permissionId: projectPermission.permissionId,
      createdAt: projectPermission.createdAt,
      updatedAt: projectPermission.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: projectPermission.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(projectPermission.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(projectPermission.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(
      createDynamicSingleSchema(projectPermissionSchema),
      projectPermission,
      context
    );
  }
}
