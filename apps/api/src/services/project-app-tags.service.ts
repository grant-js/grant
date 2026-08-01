import type {
  IAuditLogger,
  IProjectAppRepository,
  IProjectAppTagRepository,
  IProjectAppTagService,
  ITagRepository,
} from '@grantjs/core';
import {
  AddProjectAppTagInput,
  ProjectAppTag,
  RemoveProjectAppTagInput,
  UpdateProjectAppTagInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addProjectAppTagInputSchema,
  getProjectAppTagIntersectionInputSchema,
  getProjectAppTagsParamsSchema,
  projectAppTagSchema,
  removeProjectAppTagInputSchema,
  updateProjectAppTagInputSchema,
} from './project-app-tags.schemas';

export class ProjectAppTagService implements IProjectAppTagService {
  constructor(
    private readonly projectAppRepository: IProjectAppRepository,
    private readonly tagRepository: ITagRepository,
    private readonly projectAppTagRepository: IProjectAppTagRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async projectAppExists(projectAppId: string, transaction?: Transaction): Promise<void> {
    const app = await this.projectAppRepository.getProjectAppById(projectAppId, transaction);
    if (!app) {
      throw new NotFoundError('ProjectApp');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.tagRepository.getTags({ ids: [tagId], limit: 1 }, transaction);
    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag');
    }
  }

  private async projectAppHasTag(
    projectAppId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectAppExists(projectAppId, transaction);
    await this.tagExists(tagId, transaction);
    const existing = await this.projectAppTagRepository.getProjectAppTags(
      { projectAppId, tagId },
      transaction
    );
    return existing.length > 0;
  }

  public async getProjectAppTags(
    params: { projectAppId: string },
    transaction?: Transaction
  ): Promise<ProjectAppTag[]> {
    const context = 'ProjectAppTagService.getProjectAppTags';
    const validatedParams = validateInput(getProjectAppTagsParamsSchema, params, context);
    await this.projectAppExists(validatedParams.projectAppId, transaction);
    const result = await this.projectAppTagRepository.getProjectAppTags(
      validatedParams as { projectAppId?: string; tagId?: string },
      transaction
    );
    return validateOutput(createDynamicSingleSchema(projectAppTagSchema).array(), result, context);
  }

  public async getProjectAppTagsByProjectAppIds(
    projectAppIds: string[],
    transaction?: Transaction
  ): Promise<ProjectAppTag[]> {
    const context = 'ProjectAppTagService.getProjectAppTagsByProjectAppIds';
    const result = await this.projectAppTagRepository.getProjectAppTagsByProjectAppIds(
      projectAppIds,
      transaction
    );
    return validateOutput(createDynamicSingleSchema(projectAppTagSchema).array(), result, context);
  }

  public async getProjectAppTagIntersection(
    params: { projectAppIds: string[]; tagIds: string[] },
    transaction?: Transaction
  ): Promise<ProjectAppTag[]> {
    const context = 'ProjectAppTagService.getProjectAppTagIntersection';
    const validatedParams = validateInput(getProjectAppTagIntersectionInputSchema, params, context);
    const { projectAppIds, tagIds } = validatedParams;
    const projectAppTags = await this.projectAppTagRepository.getProjectAppTagIntersection(
      projectAppIds,
      tagIds,
      transaction
    );
    return validateOutput(projectAppTagSchema.array(), projectAppTags, context);
  }

  public async addProjectAppTag(
    params: AddProjectAppTagInput,
    transaction?: Transaction
  ): Promise<ProjectAppTag> {
    const context = 'ProjectAppTagService.addProjectAppTag';
    const validatedParams = validateInput(addProjectAppTagInputSchema, params, context);
    const { projectAppId, tagId, isPrimary } = validatedParams;

    const hasTag = await this.projectAppHasTag(projectAppId, tagId, transaction);
    if (hasTag) {
      throw new ConflictError('Project app already has this tag', 'ProjectAppTag', 'tagId');
    }

    const projectAppTag = await this.projectAppTagRepository.addProjectAppTag(
      { projectAppId, tagId, isPrimary: isPrimary ?? false },
      transaction
    );

    const newValues = {
      id: projectAppTag.id,
      projectAppId: projectAppTag.projectAppId,
      tagId: projectAppTag.tagId,
      isPrimary: projectAppTag.isPrimary,
      createdAt: projectAppTag.createdAt,
      updatedAt: projectAppTag.updatedAt,
    };
    await this.audit.logCreate(projectAppTag.id, newValues, { context }, transaction);

    return validateOutput(createDynamicSingleSchema(projectAppTagSchema), projectAppTag, context);
  }

  public async updateProjectAppTag(
    params: UpdateProjectAppTagInput,
    transaction?: Transaction
  ): Promise<ProjectAppTag> {
    const context = 'ProjectAppTagService.updateProjectAppTag';
    const validatedParams = validateInput(updateProjectAppTagInputSchema, params, context);
    const { projectAppId, tagId, isPrimary } = validatedParams;

    const existing = await this.projectAppTagRepository.getProjectAppTags(
      { projectAppId, tagId },
      transaction
    );
    if (existing.length === 0) {
      throw new NotFoundError('ProjectAppTag');
    }
    const current = existing[0];

    const updated = await this.projectAppTagRepository.updateProjectAppTag(
      { projectAppId, tagId, isPrimary },
      transaction
    );

    await this.audit.logUpdate(updated.id, current, updated, { context }, transaction);
    return validateOutput(createDynamicSingleSchema(projectAppTagSchema), updated, context);
  }

  public async removeProjectAppTag(
    params: RemoveProjectAppTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectAppTag> {
    const context = 'ProjectAppTagService.removeProjectAppTag';
    const validatedParams = validateInput(removeProjectAppTagInputSchema, params, context);
    const { projectAppId, tagId, hardDelete } = validatedParams;

    // Do not require the tag row to be live: CDM/delete can soft-delete tags while
    // leaving project_app_tags pivots, and tag sync must still be able to detach them.
    await this.projectAppExists(projectAppId, transaction);
    const existing = await this.projectAppTagRepository.getProjectAppTags(
      { projectAppId, tagId },
      transaction
    );
    if (existing.length === 0) {
      throw new NotFoundError('ProjectAppTag');
    }

    const isHardDelete = hardDelete === true;
    const projectAppTag = isHardDelete
      ? await this.projectAppTagRepository.hardDeleteProjectAppTag(validatedParams, transaction)
      : await this.projectAppTagRepository.softDeleteProjectAppTag(validatedParams, transaction);

    const oldValues = {
      id: projectAppTag.id,
      projectAppId: projectAppTag.projectAppId,
      tagId: projectAppTag.tagId,
      isPrimary: projectAppTag.isPrimary,
      createdAt: projectAppTag.createdAt,
      updatedAt: projectAppTag.updatedAt,
    };
    const newValues = { ...oldValues, deletedAt: projectAppTag.deletedAt };
    const metadata = { context, hardDelete: isHardDelete };

    if (isHardDelete) {
      await this.audit.logHardDelete(projectAppTag.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(projectAppTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectAppTagSchema), projectAppTag, context);
  }
}
