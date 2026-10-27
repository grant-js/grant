import type {
  IAuditLogger,
  IPermissionRepository,
  IProjectPermissionRepository,
  IProjectPermissionService,
  IProjectRepository,
} from '@grantjs/core';
import {
  AddProjectPermissionInput,
  ProjectPermission,
  QueryProjectPermissionsInput,
  RemoveProjectPermissionInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { unboundedList } from '@/lib/pagination.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addProjectPermissionInputSchema,
  addProjectPermissionsForCdmImportParamsSchema,
  getProjectPermissionsParamsSchema,
  projectPermissionSchema,
  removeProjectPermissionInputSchema,
} from './project-permissions.schemas';

export class ProjectPermissionService implements IProjectPermissionService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly permissionRepository: IPermissionRepository,
    private readonly projectPermissionRepository: IProjectPermissionRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    if (!(await this.projectRepository.existsById(projectId, transaction))) {
      throw new NotFoundError('Project');
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

  private async projectHasPermission(
    projectId: string,
    permissionId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.permissionExists(permissionId, transaction);
    const existingProjectPermissions = await this.projectPermissionRepository.getProjectPermissions(
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

    const result = await this.projectPermissionRepository.getProjectPermissions(
      params,
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(projectPermissionSchema).array(),
      result,
      context
    );
  }

  public async getAllowedScopeSlugsForProject(
    projectId: string,
    transaction?: Transaction
  ): Promise<string[]> {
    await this.projectExists(projectId, transaction);
    return this.projectPermissionRepository.getScopeSlugsForProject(projectId, transaction);
  }

  public async getScopeSlugLabelsForProject(
    projectId: string,
    scopeSlugs: string[],
    transaction?: Transaction
  ): Promise<{ slug: string; name: string; description: string | null }[]> {
    await this.projectExists(projectId, transaction);
    return this.projectPermissionRepository.getScopeSlugLabelsForProject(
      projectId,
      scopeSlugs,
      transaction
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
        'ProjectPermission',
        'permissionId'
      );
    }

    const projectPermission = await this.projectPermissionRepository.addProjectPermission(
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

    await this.audit.logCreate(projectPermission.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(projectPermissionSchema),
      projectPermission,
      context
    );
  }

  public async addProjectPermissionsForCdmImport(
    params: { projectId: string; permissionIds: readonly string[] },
    transaction?: Transaction
  ): Promise<ProjectPermission[]> {
    const context = 'ProjectPermissionService.addProjectPermissionsForCdmImport';
    const validatedParams = validateInput(
      addProjectPermissionsForCdmImportParamsSchema,
      params,
      context
    );
    const permissionIds = [...new Set(validatedParams.permissionIds)];
    if (permissionIds.length === 0) {
      return [];
    }

    await this.projectExists(validatedParams.projectId, transaction);
    const [permissions, existing] = await Promise.all([
      this.permissionRepository.getPermissions(
        unboundedList({ ids: permissionIds, limit: -1 }),
        transaction
      ),
      this.projectPermissionRepository.getProjectPermissions(
        { projectId: validatedParams.projectId },
        transaction
      ),
    ]);
    if (permissions.permissions.length !== permissionIds.length) {
      throw new NotFoundError('Permission');
    }

    const existingIds = new Set(existing.map((row) => row.permissionId));
    const missing = permissionIds.filter((permissionId) => !existingIds.has(permissionId));
    if (missing.length === 0) {
      return [];
    }

    const created = await this.projectPermissionRepository.addProjectPermissions(
      missing.map((permissionId) => ({ projectId: validatedParams.projectId, permissionId })),
      transaction
    );
    for (const projectPermission of created) {
      await this.audit.logCreate(
        projectPermission.id,
        {
          id: projectPermission.id,
          projectId: projectPermission.projectId,
          permissionId: projectPermission.permissionId,
          createdAt: projectPermission.createdAt,
          updatedAt: projectPermission.updatedAt,
        },
        { context },
        transaction
      );
    }

    return validateOutput(
      createDynamicSingleSchema(projectPermissionSchema).array(),
      created,
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
      throw new NotFoundError('Permission');
    }

    const isHardDelete = hardDelete === true;

    const projectPermission = isHardDelete
      ? await this.projectPermissionRepository.hardDeleteProjectPermission(
          { projectId, permissionId },
          transaction
        )
      : await this.projectPermissionRepository.softDeleteProjectPermission(
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
      await this.audit.logHardDelete(projectPermission.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        projectPermission.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(
      createDynamicSingleSchema(projectPermissionSchema),
      projectPermission,
      context
    );
  }
}
