import {
  ProjectTag,
  AddProjectTagInput,
  RemoveProjectTagInput,
  UpdateProjectTagInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { validateInput, validateOutput, createDynamicSingleSchema } from './common';
import {
  getProjectTagsParamsSchema,
  projectTagSchema,
  addProjectTagInputSchema,
  removeProjectTagInputSchema,
  getProjectTagsIntersectionSchema,
  updateProjectTagInputSchema,
} from './project-tags.schemas';

import type {
  IAuditLogger,
  IProjectRepository,
  IProjectTagRepository,
  IProjectTagService,
  ITagRepository,
} from '@grantjs/core';

export class ProjectTagService implements IProjectTagService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly tagRepository: ITagRepository,
    private readonly projectTagRepository: IProjectTagRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.projectRepository.getProjects(
      {
        ids: [projectId],
        limit: 1,
      },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.tagRepository.getTags(
      {
        ids: [tagId],
        limit: 1,
      },
      transaction
    );

    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag');
    }
  }

  private async projectHasTag(
    projectId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.tagExists(tagId, transaction);
    const existingProjectTags = await this.projectTagRepository.getProjectTags(
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

    const result = await this.projectTagRepository.getProjectTags(validatedParams, transaction);
    return validateOutput(createDynamicSingleSchema(projectTagSchema).array(), result, context);
  }

  public async getProjectTagIntersection(
    projectIds: string[],
    tagIds: string[]
  ): Promise<ProjectTag[]> {
    const context = 'ProjectTagService.getProjectTagIntersection';
    validateInput(getProjectTagsIntersectionSchema, { projectIds, tagIds }, context);

    const result = await this.projectTagRepository.getProjectTagIntersection(projectIds, tagIds);
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
      throw new ConflictError('Project already has this tag', 'ProjectTag', 'tagId');
    }

    const projectTag = await this.projectTagRepository.addProjectTag(
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

    await this.audit.logCreate(projectTag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(projectTagSchema), projectTag, context);
  }

  public async updateProjectTag(
    params: UpdateProjectTagInput,
    transaction?: Transaction
  ): Promise<ProjectTag> {
    const context = 'ProjectTagService.updateProjectTag';
    const validatedParams = validateInput(updateProjectTagInputSchema, params, context);
    const { projectId, tagId, isPrimary } = validatedParams;

    const projectTag = await this.projectTagRepository.getProjectTag(
      { projectId, tagId },
      transaction
    );

    const updatedProjectTag = await this.projectTagRepository.updateProjectTag(
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

    await this.audit.logUpdate(updatedProjectTag.id, oldValues, newValues, metadata, transaction);

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
      throw new NotFoundError('Tag');
    }

    const isHardDelete = hardDelete === true;

    const projectTag = isHardDelete
      ? await this.projectTagRepository.hardDeleteProjectTag({ projectId, tagId }, transaction)
      : await this.projectTagRepository.softDeleteProjectTag({ projectId, tagId }, transaction);

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
      await this.audit.logHardDelete(projectTag.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(projectTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectTagSchema), projectTag, context);
  }
}
