import {
  QueryProjectPermissionsArgs,
  MutationAddProjectPermissionArgs,
  MutationRemoveProjectPermissionArgs,
  ProjectPermission,
} from '@/graphql/generated/types';
import {
  IProjectPermissionRepository,
  IProjectRepository,
  IPermissionRepository,
} from '@/graphql/repositories';
import { projectPermissionsAuditLogs } from '@/graphql/repositories/project-permissions/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IProjectPermissionService } from './interface';
import {
  getProjectPermissionsParamsSchema,
  addProjectPermissionParamsSchema,
  removeProjectPermissionParamsSchema,
  projectPermissionSchema,
} from './schemas';

export class ProjectPermissionService extends AuditService implements IProjectPermissionService {
  constructor(
    private readonly projectPermissionRepository: IProjectPermissionRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly permissionRepository: IPermissionRepository,
    user: AuthenticatedUser | null
  ) {
    super(projectPermissionsAuditLogs, 'projectPermissionId', user);
  }

  private async projectExists(projectId: string): Promise<void> {
    const projects = await this.projectRepository.getProjects({
      ids: [projectId],
      limit: 1,
    });

    if (projects.projects.length === 0) {
      throw new Error('Project not found');
    }
  }

  private async permissionExists(permissionId: string): Promise<void> {
    const permissions = await this.permissionRepository.getPermissions({
      ids: [permissionId],
      limit: 1,
    });

    if (permissions.permissions.length === 0) {
      throw new Error('Permission not found');
    }
  }

  private async projectHasPermission(projectId: string, permissionId: string): Promise<boolean> {
    await this.projectExists(projectId);
    await this.permissionExists(permissionId);
    const existingProjectPermissions = await this.projectPermissionRepository.getProjectPermissions(
      {
        projectId,
      }
    );

    return existingProjectPermissions.some((pp) => pp.permissionId === permissionId);
  }

  public async getProjectPermissions(
    params: QueryProjectPermissionsArgs
  ): Promise<ProjectPermission[]> {
    const validatedParams = validateInput(
      getProjectPermissionsParamsSchema,
      params,
      'getProjectPermissions method'
    );

    await this.projectExists(validatedParams.projectId);

    const result = await this.projectPermissionRepository.getProjectPermissions(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(projectPermissionSchema).array(),
      result,
      'getProjectPermissions method'
    );
  }

  public async addProjectPermission(
    params: MutationAddProjectPermissionArgs
  ): Promise<ProjectPermission> {
    const validatedParams = validateInput(
      addProjectPermissionParamsSchema,
      params,
      'addProjectPermission method'
    );

    const hasPermission = await this.projectHasPermission(
      validatedParams.input.projectId,
      validatedParams.input.permissionId
    );

    if (hasPermission) {
      throw new Error('Project already has this permission');
    }

    const projectPermission =
      await this.projectPermissionRepository.addProjectPermission(validatedParams);

    const newValues = {
      id: projectPermission.id,
      projectId: projectPermission.projectId,
      permissionId: projectPermission.permissionId,
      createdAt: projectPermission.createdAt,
      updatedAt: projectPermission.updatedAt,
    };

    const metadata = {
      source: 'add_project_permission_mutation',
    };

    await this.logCreate(projectPermission.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(projectPermissionSchema),
      projectPermission,
      'addProjectPermission method'
    );
  }

  public async removeProjectPermission(
    params: MutationRemoveProjectPermissionArgs & { hardDelete?: boolean }
  ): Promise<ProjectPermission> {
    const validatedParams = validateInput(
      removeProjectPermissionParamsSchema,
      params,
      'deleteProjectPermission method'
    );

    const hasPermission = await this.projectHasPermission(
      validatedParams.input.projectId,
      validatedParams.input.permissionId
    );

    if (!hasPermission) {
      throw new Error('Project does not have this permission');
    }

    const isHardDelete = params.hardDelete === true;

    const projectPermission = isHardDelete
      ? await this.projectPermissionRepository.hardDeleteProjectPermission(validatedParams)
      : await this.projectPermissionRepository.softDeleteProjectPermission(validatedParams);

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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_project_permission_mutation',
      };
      await this.logHardDelete(projectPermission.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_project_permission_mutation',
      };
      await this.logSoftDelete(projectPermission.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(projectPermissionSchema),
      projectPermission,
      'deleteProjectPermission method'
    );
  }
}
