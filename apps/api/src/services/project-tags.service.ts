import { DbSchema } from '@logusgraphics/grant-database';
import { projectTagAuditLogs } from '@logusgraphics/grant-database';
import {
  ProjectTag,
  AddProjectTagInput,
  RemoveProjectTagInput,
  UpdateProjectTagInput,
} from '@logusgraphics/grant-schema';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from './common';
import {
  getProjectTagsParamsSchema,
  projectTagSchema,
  addProjectTagInputSchema,
  removeProjectTagInputSchema,
  getProjectTagsIntersectionSchema,
  updateProjectTagInputSchema,
} from './project-tags.schemas';

import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

export class ProjectTagService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: AuthenticatedUser | null,
    readonly db: DbSchema
  ) {
    super(projectTagAuditLogs, 'projectTagId', user, db);
  }

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.repositories.projectRepository.getProjects(
      {
        ids: [projectId],
        limit: 1,
      },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new Error('Project not found');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.repositories.tagRepository.getTags(
      {
        ids: [tagId],
        limit: 1,
      },
      transaction
    );

    if (tags.tags.length === 0) {
      throw new Error('Tag not found');
    }
  }

  private async projectHasTag(
    projectId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.tagExists(tagId, transaction);
    const existingProjectTags = await this.repositories.projectTagRepository.getProjectTags(
      { projectId },
      transaction
    );

    return existingProjectTags.some((pt) => pt.tagId === tagId);
  }

  public async getProjectTags(
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<ProjectTag[]> {
    const context = 'ProjectTagService.getProjectTags';
    const validatedParams = validateInput(getProjectTagsParamsSchema, params, context);

    await this.projectExists(validatedParams.projectId);

    const result = await this.repositories.projectTagRepository.getProjectTags(
      validatedParams,
      transaction
    );
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
    const { projectId, tagId, isPrimary } = validatedParams;

    const hasTag = await this.projectHasTag(projectId, tagId, transaction);

    if (hasTag) {
      throw new Error('Project already has this tag');
    }

    const projectTag = await this.repositories.projectTagRepository.addProjectTag(
      { projectId, tagId, isPrimary },
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

  public async updateProjectTag(
    params: UpdateProjectTagInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    const context = 'ProjectTagService.updateProjectTag';
    const validatedParams = validateInput(updateProjectTagInputSchema, params, context);
    const { projectId, tagId, isPrimary } = validatedParams;

    const projectTag = await this.repositories.projectTagRepository.getProjectTag(
      { projectId, tagId },
      transaction
    );

    const updatedProjectTag = await this.repositories.projectTagRepository.updateProjectTag(
      { projectId, tagId, isPrimary },
      transaction
    );

    const oldValues = {
      id: projectTag.id,
      projectId: projectTag.projectId,
      tagId: projectTag.tagId,
      isPrimary: projectTag.isPrimary,
      createdAt: projectTag.createdAt,
      updatedAt: projectTag.updatedAt,
    };

    const newValues = {
      id: updatedProjectTag.id,
      projectId: updatedProjectTag.projectId,
      tagId: updatedProjectTag.tagId,
      isPrimary: updatedProjectTag.isPrimary,
      createdAt: updatedProjectTag.createdAt,
      updatedAt: updatedProjectTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logUpdate(updatedProjectTag.id, oldValues, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(projectTagSchema), updatedProjectTag, context);
  }

  public async removeProjectTag(
    params: RemoveProjectTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    const context = 'ProjectTagService.removeProjectTag';
    const validatedParams = validateInput(removeProjectTagInputSchema, params, context);

    const { projectId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.projectHasTag(projectId, tagId, transaction);

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
