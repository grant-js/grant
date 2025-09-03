import { ProjectTag, AddProjectTagInput, RemoveProjectTagInput } from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { projectTagAuditLogs } from '@/graphql/repositories/project-tags/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  getProjectTagsParamsSchema,
  projectTagSchema,
  addProjectTagInputSchema,
  removeProjectTagInputSchema,
  getProjectTagsIntersectionSchema,
} from './schemas';

export class ProjectTagService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: AuthenticatedUser | null,
    readonly db: DbSchema
  ) {
    super(projectTagAuditLogs, 'projectTagId', user, db);
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

  private async tagExists(tagId: string): Promise<void> {
    const tags = await this.repositories.tagRepository.getTags({
      ids: [tagId],
      limit: 1,
    });

    if (tags.tags.length === 0) {
      throw new Error('Tag not found');
    }
  }

  private async projectHasTag(projectId: string, tagId: string): Promise<boolean> {
    await this.projectExists(projectId);
    await this.tagExists(tagId);
    const existingProjectTags = await this.repositories.projectTagRepository.getProjectTags({
      projectId,
    });

    return existingProjectTags.some((pt) => pt.tagId === tagId);
  }

  public async getProjectTags(params: { projectId: string }): Promise<ProjectTag[]> {
    const context = 'ProjectTagService.getProjectTags';
    const validatedParams = validateInput(getProjectTagsParamsSchema, params, context);

    await this.projectExists(validatedParams.projectId);

    const result = await this.repositories.projectTagRepository.getProjectTags(validatedParams);
    return validateOutput(createDynamicSingleSchema(projectTagSchema).array(), result, context);
  }

  public async getProjectTagIntersection(
    projectIds: string[],
    tagIds: string[]
  ): Promise<ProjectTag[]> {
    const context = 'ProjectTagService.getProjectTagIntersection';
    validateInput(getProjectTagsIntersectionSchema, { projectIds, tagIds }, context);

    const result = await this.repositories.projectTagRepository.getProjectTagIntersection(
      projectIds,
      tagIds
    );
    return validateOutput(createDynamicSingleSchema(projectTagSchema).array(), result, context);
  }

  public async addProjectTag(
    params: AddProjectTagInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    const context = 'ProjectTagService.addProjectTag';
    const validatedParams = validateInput(addProjectTagInputSchema, params, context);
    const { projectId, tagId } = validatedParams;

    const hasTag = await this.projectHasTag(projectId, tagId);

    if (hasTag) {
      throw new Error('Project already has this tag');
    }

    const projectTag = await this.repositories.projectTagRepository.addProjectTag(
      { projectId, tagId },
      transaction
    );

    const newValues = {
      id: projectTag.id,
      projectId: projectTag.projectId,
      tagId: projectTag.tagId,
      createdAt: projectTag.createdAt,
      updatedAt: projectTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(projectTag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(projectTagSchema), projectTag, context);
  }

  public async removeProjectTag(
    params: RemoveProjectTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    const context = 'ProjectTagService.removeProjectTag';
    const validatedParams = validateInput(removeProjectTagInputSchema, params, context);

    const { projectId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.projectHasTag(projectId, tagId);

    if (!hasTag) {
      throw new Error('Project does not have this tag');
    }

    const isHardDelete = hardDelete === true;

    const projectTag = isHardDelete
      ? await this.repositories.projectTagRepository.hardDeleteProjectTag(
          { projectId, tagId },
          transaction
        )
      : await this.repositories.projectTagRepository.softDeleteProjectTag(
          { projectId, tagId },
          transaction
        );

    const oldValues = {
      id: projectTag.id,
      projectId: projectTag.projectId,
      tagId: projectTag.tagId,
      createdAt: projectTag.createdAt,
      updatedAt: projectTag.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: projectTag.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(projectTag.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(projectTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectTagSchema), projectTag, context);
  }
}
