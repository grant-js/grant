import { DbSchema } from '@logusgraphics/grant-database';
import { projectGroupAuditLogs } from '@logusgraphics/grant-database';
import {
  ProjectGroup,
  RemoveProjectGroupInput,
  AddProjectGroupInput,
} from '@logusgraphics/grant-schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from './common';
import {
  getProjectGroupsParamsSchema,
  projectGroupSchema,
  addProjectGroupInputSchema,
  removeProjectGroupInputSchema,
} from './project-groups.schemas';

export class ProjectGroupService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(projectGroupAuditLogs, 'projectGroupId', user, db);
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

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.repositories.groupRepository.getGroups(
      { ids: [groupId], limit: 1 },
      transaction
    );

    if (groups.groups.length === 0) {
      throw new NotFoundError('Group not found', 'errors:notFound.group');
    }
  }

  private async projectHasGroup(
    projectId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.groupExists(groupId, transaction);
    const existingProjectGroups = await this.repositories.projectGroupRepository.getProjectGroups(
      { projectId },
      transaction
    );

    return existingProjectGroups.some((pg) => pg.groupId === groupId);
  }

  public async getProjectGroups(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<ProjectGroup[]> {
    const context = 'ProjectGroupService.getProjectGroups';
    const validatedParams = validateInput(getProjectGroupsParamsSchema, params, context);

    await this.projectExists(validatedParams.projectId, transaction);

    const result = await this.repositories.projectGroupRepository.getProjectGroups(
      validatedParams,
      transaction
    );
    return validateOutput(createDynamicSingleSchema(projectGroupSchema).array(), result, context);
  }

  public async addProjectGroup(
    params: AddProjectGroupInput,
    transaction?: Transaction
  ): Promise<ProjectGroup> {
    const context = 'ProjectGroupService.addProjectGroup';
    const validatedParams = validateInput(addProjectGroupInputSchema, params, context);

    const { projectId, groupId } = validatedParams;

    const hasGroup = await this.projectHasGroup(projectId, groupId, transaction);

    if (hasGroup) {
      throw new ConflictError('Project already has this group', 'errors:conflict.duplicateEntry', {
        resource: 'ProjectGroup',
        field: 'groupId',
      });
    }

    const projectGroup = await this.repositories.projectGroupRepository.addProjectGroup(
      { projectId, groupId },
      transaction
    );

    const newValues = {
      id: projectGroup.id,
      projectId: projectGroup.projectId,
      groupId: projectGroup.groupId,
      createdAt: projectGroup.createdAt,
      updatedAt: projectGroup.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(projectGroup.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(projectGroupSchema), projectGroup, context);
  }

  public async removeProjectGroup(
    params: RemoveProjectGroupInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectGroup> {
    const context = 'ProjectGroupService.removeProjectGroup';
    const validatedParams = validateInput(removeProjectGroupInputSchema, params, context);

    const { projectId, groupId, hardDelete } = validatedParams;

    const hasGroup = await this.projectHasGroup(projectId, groupId, transaction);

    if (!hasGroup) {
      throw new NotFoundError('Project does not have this group', 'errors:notFound.group');
    }

    const isHardDelete = hardDelete === true;

    const projectGroup = isHardDelete
      ? await this.repositories.projectGroupRepository.hardDeleteProjectGroup(
          { projectId, groupId },
          transaction
        )
      : await this.repositories.projectGroupRepository.softDeleteProjectGroup(
          { projectId, groupId },
          transaction
        );

    const oldValues = {
      id: projectGroup.id,
      projectId: projectGroup.projectId,
      groupId: projectGroup.groupId,
      createdAt: projectGroup.createdAt,
      updatedAt: projectGroup.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: projectGroup.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(projectGroup.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(projectGroup.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectGroupSchema), projectGroup, context);
  }
}
