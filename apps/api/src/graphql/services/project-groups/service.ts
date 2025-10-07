import { DbSchema } from '@logusgraphics/grant-database';
import { projectGroupAuditLogs } from '@logusgraphics/grant-database';
import {
  ProjectGroup,
  RemoveProjectGroupInput,
  AddProjectGroupInput,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  getProjectGroupsParamsSchema,
  projectGroupSchema,
  addProjectGroupInputSchema,
  removeProjectGroupInputSchema,
} from './schemas';

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
      throw new Error('Project not found');
    }
  }

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.repositories.groupRepository.getGroups(
      { ids: [groupId], limit: 1 },
      transaction
    );

    if (groups.groups.length === 0) {
      throw new Error('Group not found');
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
      throw new Error('Project already has this group');
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
      throw new Error('Project does not have this group');
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
