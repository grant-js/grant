import {
  ProjectPermission,
  RemoveProjectPermissionInput,
  AddProjectPermissionInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { projectPermissionsAuditLogs } from '@/graphql/repositories/project-permissions/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  getProjectPermissionsParamsSchema,
  projectPermissionSchema,
  addProjectPermissionInputSchema,
  removeProjectPermissionInputSchema,
} from './schemas';

export class ProjectPermissionService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
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
      throw new Error('Project not found');
    }
  }

  private async permissionExists(permissionId: string, transaction?: Transaction): Promise<void> {
    const permissions = await this.repositories.permissionRepository.getPermissions(
      { ids: [permissionId], limit: 1 },
      transaction
    );

    if (permissions.permissions.length === 0) {
      throw new Error('Permission not found');
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
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<ProjectPermission[]> {
    const context = 'ProjectPermissionService.getProjectPermissions';
    const validatedParams = validateInput(getProjectPermissionsParamsSchema, params, context);

    await this.projectExists(validatedParams.projectId, transaction);

    const result = await this.repositories.projectPermissionRepository.getProjectPermissions(
      validatedParams,
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
      throw new Error('Project already has this permission');
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
      throw new Error('Project does not have this permission');
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
