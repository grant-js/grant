import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  QueryProjectGroupsArgs,
  MutationAddProjectGroupArgs,
  MutationRemoveProjectGroupArgs,
  ProjectGroup,
} from '@/graphql/generated/types';
import { Repositories } from '@/graphql/repositories';
import { projectGroupAuditLogs } from '@/graphql/repositories/project-groups/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IProjectGroupService } from './interface';
import {
  getProjectGroupsParamsSchema,
  addProjectGroupParamsSchema,
  removeProjectGroupParamsSchema,
  projectGroupSchema,
} from './schemas';

export class ProjectGroupService extends AuditService implements IProjectGroupService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    private readonly db: PostgresJsDatabase
  ) {
    super(projectGroupAuditLogs, 'projectGroupId', user);
  }

  private async projectExists(projectId: string): Promise<void> {
    const projects = await this.repositories.projectRepository.getProjects({
      ids: [projectId],
      limit: 1,
    });

    if (projects.projects.length === 0) {
      throw new Error('Project not found');
    }
  }

  private async groupExists(groupId: string): Promise<void> {
    const groups = await this.repositories.groupRepository.getGroups({
      ids: [groupId],
      limit: 1,
    });

    if (groups.groups.length === 0) {
      throw new Error('Group not found');
    }
  }

  private async projectHasGroup(projectId: string, groupId: string): Promise<boolean> {
    await this.projectExists(projectId);
    await this.groupExists(groupId);
    const existingProjectGroups = await this.repositories.projectGroupRepository.getProjectGroups({
      projectId,
    });

    return existingProjectGroups.some((pg) => pg.groupId === groupId);
  }

  public async getProjectGroups(params: QueryProjectGroupsArgs): Promise<ProjectGroup[]> {
    const validatedParams = validateInput(
      getProjectGroupsParamsSchema,
      params,
      'getProjectGroups method'
    );

    await this.projectExists(validatedParams.projectId);

    const result = await this.repositories.projectGroupRepository.getProjectGroups(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(projectGroupSchema).array(),
      result,
      'getProjectGroups method'
    );
  }

  public async addProjectGroup(params: MutationAddProjectGroupArgs): Promise<ProjectGroup> {
    const validatedParams = validateInput(
      addProjectGroupParamsSchema,
      params,
      'addProjectGroup method'
    );

    const hasGroup = await this.projectHasGroup(
      validatedParams.input.projectId,
      validatedParams.input.groupId
    );

    if (hasGroup) {
      throw new Error('Project already has this group');
    }

    const projectGroup =
      await this.repositories.projectGroupRepository.addProjectGroup(validatedParams);

    const newValues = {
      id: projectGroup.id,
      projectId: projectGroup.projectId,
      groupId: projectGroup.groupId,
      createdAt: projectGroup.createdAt,
      updatedAt: projectGroup.updatedAt,
    };

    const metadata = {
      source: 'add_project_group_mutation',
    };

    await this.logCreate(projectGroup.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(projectGroupSchema),
      projectGroup,
      'addProjectGroup method'
    );
  }

  public async removeProjectGroup(
    params: MutationRemoveProjectGroupArgs & { hardDelete?: boolean }
  ): Promise<ProjectGroup> {
    const validatedParams = validateInput(
      removeProjectGroupParamsSchema,
      params,
      'deleteProjectGroup method'
    );

    const hasGroup = await this.projectHasGroup(
      validatedParams.input.projectId,
      validatedParams.input.groupId
    );

    if (!hasGroup) {
      throw new Error('Project does not have this group');
    }

    const isHardDelete = params.hardDelete === true;

    const projectGroup = isHardDelete
      ? await this.repositories.projectGroupRepository.hardDeleteProjectGroup(validatedParams)
      : await this.repositories.projectGroupRepository.softDeleteProjectGroup(validatedParams);

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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_project_group_mutation',
      };
      await this.logHardDelete(projectGroup.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_project_group_mutation',
      };
      await this.logSoftDelete(projectGroup.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(projectGroupSchema),
      projectGroup,
      'deleteProjectGroup method'
    );
  }
}
