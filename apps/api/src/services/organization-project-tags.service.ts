import {
  AddOrganizationProjectTagInput,
  OrganizationProjectTag,
  QueryOrganizationProjectTagInput,
  RemoveOrganizationProjectTagInput,
  UpdateOrganizationProjectTagInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addOrganizationProjectTagInputSchema,
  getOrganizationProjectTagsIntersectionSchema,
  getOrganizationProjectTagsParamsSchema,
  organizationProjectTagSchema,
  removeOrganizationProjectTagInputSchema,
  updateOrganizationProjectTagInputSchema,
} from './organization-project-tags.schema';

import type {
  IAuditLogger,
  IOrganizationProjectTagRepository,
  IOrganizationProjectTagService,
  IOrganizationRepository,
  IProjectRepository,
  ITagRepository,
} from '@grantjs/core';

export class OrganizationProjectTagService implements IOrganizationProjectTagService {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly tagRepository: ITagRepository,
    private readonly organizationProjectTagRepository: IOrganizationProjectTagRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async organizationExists(
    organizationId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizations = await this.organizationRepository.getOrganizations(
      {
        ids: [organizationId],
        limit: 1,
      },
      transaction
    );

    if (organizations.organizations.length === 0) {
      throw new NotFoundError('Organization');
    }
  }

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

  private async projectHasOrganizationTag(
    organizationId: string,
    projectId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId, transaction);
    await this.projectExists(projectId, transaction);
    await this.tagExists(tagId, transaction);
    const existingOrganizationProjectTags =
      await this.organizationProjectTagRepository.getOrganizationProjectTags(
        { organizationId, projectId },
        transaction
      );

    return existingOrganizationProjectTags.some((opt) => opt.tagId === tagId);
  }

  public async getOrganizationProjectTags(
    params: QueryOrganizationProjectTagInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectTag[]> {
    const context = 'OrganizationProjectTagService.getOrganizationProjectTags';
    const validatedParams = validateInput(getOrganizationProjectTagsParamsSchema, params, context);

    await this.organizationExists(validatedParams.organizationId);
    await this.projectExists(validatedParams.projectId);

    const result = await this.organizationProjectTagRepository.getOrganizationProjectTags(
      validatedParams,
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(organizationProjectTagSchema).array(),
      result,
      context
    );
  }

  public async getOrganizationProjectTagIntersection(
    organizationId: string,
    projectIds: string[],
    tagIds: string[]
  ): Promise<OrganizationProjectTag[]> {
    const context = 'OrganizationProjectTagService.getOrganizationProjectTagIntersection';
    validateInput(
      getOrganizationProjectTagsIntersectionSchema,
      { organizationId, projectIds, tagIds },
      context
    );

    const result =
      await this.organizationProjectTagRepository.getOrganizationProjectTagIntersection(
        organizationId,
        projectIds,
        tagIds
      );
    return validateOutput(
      createDynamicSingleSchema(organizationProjectTagSchema).array(),
      result,
      context
    );
  }

  public async addOrganizationProjectTag(
    params: AddOrganizationProjectTagInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectTag> {
    const context = 'ProjectTagService.addProjectTag';
    const validatedParams = validateInput(addOrganizationProjectTagInputSchema, params, context);
    const { organizationId, projectId, tagId, isPrimary } = validatedParams;

    const hasTag = await this.projectHasOrganizationTag(
      organizationId,
      projectId,
      tagId,
      transaction
    );

    if (hasTag) {
      throw new ConflictError('Project already has this tag', 'ProjectTag', 'tagId');
    }

    const organizationProjectTag =
      await this.organizationProjectTagRepository.addOrganizationProjectTag(
        { organizationId, projectId, tagId, isPrimary },
        transaction
      );

    const newValues = {
      id: organizationProjectTag.id,
      organizationId: organizationProjectTag.organizationId,
      projectId: organizationProjectTag.projectId,
      tagId: organizationProjectTag.tagId,
      isPrimary: organizationProjectTag.isPrimary,
      createdAt: organizationProjectTag.createdAt,
      updatedAt: organizationProjectTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(organizationProjectTag.id, newValues, metadata, transaction);

    return validateOutput(
      createDynamicSingleSchema(organizationProjectTagSchema),
      organizationProjectTag,
      context
    );
  }

  public async updateOrganizationProjectTag(
    params: UpdateOrganizationProjectTagInput,
    transaction?: Transaction
  ): Promise<OrganizationProjectTag> {
    const context = 'OrganizationProjectTagService.updateOrganizationProjectTag';
    const validatedParams = validateInput(updateOrganizationProjectTagInputSchema, params, context);
    const { organizationId, projectId, tagId, isPrimary } = validatedParams;

    const organizationProjectTag =
      await this.organizationProjectTagRepository.getOrganizationProjectTag(
        { organizationId, projectId, tagId },
        transaction
      );

    const updatedOrganizationProjectTag =
      await this.organizationProjectTagRepository.updateOrganizationProjectTag(
        { organizationId, projectId, tagId, isPrimary },
        transaction
      );

    const oldValues = {
      id: organizationProjectTag.id,
      organizationId: organizationProjectTag.organizationId,
      projectId: organizationProjectTag.projectId,
      tagId: organizationProjectTag.tagId,
      isPrimary: organizationProjectTag.isPrimary,
      createdAt: organizationProjectTag.createdAt,
      updatedAt: organizationProjectTag.updatedAt,
    };

    const newValues = {
      id: updatedOrganizationProjectTag.id,
      organizationId: updatedOrganizationProjectTag.organizationId,
      projectId: updatedOrganizationProjectTag.projectId,
      tagId: updatedOrganizationProjectTag.tagId,
      isPrimary: updatedOrganizationProjectTag.isPrimary,
      createdAt: updatedOrganizationProjectTag.createdAt,
      updatedAt: updatedOrganizationProjectTag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logUpdate(
      updatedOrganizationProjectTag.id,
      oldValues,
      newValues,
      metadata,
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(organizationProjectTagSchema),
      updatedOrganizationProjectTag,
      context
    );
  }

  public async removeOrganizationProjectTag(
    params: RemoveOrganizationProjectTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<OrganizationProjectTag> {
    const context = 'OrganizationProjectTagService.removeOrganizationProjectTag';
    const validatedParams = validateInput(removeOrganizationProjectTagInputSchema, params, context);

    const { organizationId, projectId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.projectHasOrganizationTag(
      organizationId,
      projectId,
      tagId,
      transaction
    );

    if (!hasTag) {
      throw new NotFoundError('Tag');
    }

    const isHardDelete = hardDelete === true;

    const organizationProjectTag = isHardDelete
      ? await this.organizationProjectTagRepository.hardDeleteOrganizationProjectTag(
          { organizationId, projectId, tagId },
          transaction
        )
      : await this.organizationProjectTagRepository.softDeleteOrganizationProjectTag(
          { organizationId, projectId, tagId },
          transaction
        );

    const oldValues = {
      id: organizationProjectTag.id,
      organizationId: organizationProjectTag.organizationId,
      projectId: organizationProjectTag.projectId,
      tagId: organizationProjectTag.tagId,
      createdAt: organizationProjectTag.createdAt,
      updatedAt: organizationProjectTag.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: organizationProjectTag.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(organizationProjectTag.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(
        organizationProjectTag.id,
        oldValues,
        newValues,
        metadata,
        transaction
      );
    }

    return validateOutput(
      createDynamicSingleSchema(organizationProjectTagSchema),
      organizationProjectTag,
      context
    );
  }
}
