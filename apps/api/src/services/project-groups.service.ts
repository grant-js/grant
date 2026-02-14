import { ProjectGroup, RemoveProjectGroupInput, AddProjectGroupInput } from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { validateInput, validateOutput, createDynamicSingleSchema } from './common';
import {
  getProjectGroupsParamsSchema,
  projectGroupSchema,
  addProjectGroupInputSchema,
  removeProjectGroupInputSchema,
} from './project-groups.schemas';

import type {
  IAuditLogger,
  IGroupRepository,
  IProjectGroupRepository,
  IProjectGroupService,
  IProjectRepository,
} from '@grantjs/core';

export class ProjectGroupService implements IProjectGroupService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly projectGroupRepository: IProjectGroupRepository,
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

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.groupRepository.getGroups({ ids: [groupId], limit: 1 }, transaction);

    if (groups.groups.length === 0) {
      throw new NotFoundError('Group');
    }
  }

  private async projectHasGroup(
    projectId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.groupExists(groupId, transaction);
    const existingProjectGroups = await this.projectGroupRepository.getProjectGroups(
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

    const result = await this.projectGroupRepository.getProjectGroups(validatedParams, transaction);
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
      throw new ConflictError('Project already has this group', 'ProjectGroup', 'groupId');
    }

    const projectGroup = await this.projectGroupRepository.addProjectGroup(
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

    await this.audit.logCreate(projectGroup.id, newValues, metadata, transaction);

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
      throw new NotFoundError('Group');
    }

    const isHardDelete = hardDelete === true;

    const projectGroup = isHardDelete
      ? await this.projectGroupRepository.hardDeleteProjectGroup(
          { projectId, groupId },
          transaction
        )
      : await this.projectGroupRepository.softDeleteProjectGroup(
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
      await this.audit.logHardDelete(projectGroup.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(projectGroup.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectGroupSchema), projectGroup, context);
  }
}
