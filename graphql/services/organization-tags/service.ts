import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  QueryOrganizationTagsArgs,
  MutationAddOrganizationTagArgs,
  MutationRemoveOrganizationTagArgs,
  OrganizationTag,
} from '@/graphql/generated/types';
import { Repositories } from '@/graphql/repositories';
import { organizationTagAuditLogs } from '@/graphql/repositories/organization-tags/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IOrganizationTagService } from './interface';
import {
  getOrganizationTagsParamsSchema,
  addOrganizationTagParamsSchema,
  removeOrganizationTagParamsSchema,
  organizationTagSchema,
} from './schemas';

export class OrganizationTagService extends AuditService implements IOrganizationTagService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    private readonly db: PostgresJsDatabase
  ) {
    super(organizationTagAuditLogs, 'organizationTagId', user);
  }

  private async organizationExists(organizationId: string): Promise<void> {
    const organizations = await this.repositories.organizationRepository.getOrganizations({
      ids: [organizationId],
      limit: 1,
    });

    if (organizations.organizations.length === 0) {
      throw new Error('Organization not found');
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

  private async organizationHasTag(organizationId: string, tagId: string): Promise<boolean> {
    await this.organizationExists(organizationId);
    await this.tagExists(tagId);
    const existingOrganizationTags =
      await this.repositories.organizationTagRepository.getOrganizationTags({
        organizationId,
      });

    return existingOrganizationTags.some((ot) => ot.tagId === tagId);
  }

  public async getOrganizationTags(params: QueryOrganizationTagsArgs): Promise<OrganizationTag[]> {
    const validatedParams = validateInput(
      getOrganizationTagsParamsSchema,
      params,
      'getOrganizationTags method'
    );

    await this.organizationExists(validatedParams.organizationId);

    const result =
      await this.repositories.organizationTagRepository.getOrganizationTags(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(organizationTagSchema).array(),
      result,
      'getOrganizationTags method'
    );
  }

  public async addOrganizationTag(
    params: MutationAddOrganizationTagArgs
  ): Promise<OrganizationTag> {
    const validatedParams = validateInput(
      addOrganizationTagParamsSchema,
      params,
      'addOrganizationTag method'
    );

    const hasTag = await this.organizationHasTag(
      validatedParams.input.organizationId,
      validatedParams.input.tagId
    );

    if (hasTag) {
      throw new Error('Organization already has this tag');
    }

    const organizationTag =
      await this.repositories.organizationTagRepository.addOrganizationTag(validatedParams);

    const newValues = {
      id: organizationTag.id,
      organizationId: organizationTag.organizationId,
      tagId: organizationTag.tagId,
      createdAt: organizationTag.createdAt,
      updatedAt: organizationTag.updatedAt,
    };

    const metadata = {
      source: 'add_organization_tag_mutation',
    };

    await this.logCreate(organizationTag.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(organizationTagSchema),
      organizationTag,
      'addOrganizationTag method'
    );
  }

  public async removeOrganizationTag(
    params: MutationRemoveOrganizationTagArgs & { hardDelete?: boolean }
  ): Promise<OrganizationTag> {
    const validatedParams = validateInput(
      removeOrganizationTagParamsSchema,
      params,
      'removeOrganizationTag method'
    );

    const hasTag = await this.organizationHasTag(
      validatedParams.input.organizationId,
      validatedParams.input.tagId
    );

    if (!hasTag) {
      throw new Error('Organization does not have this tag');
    }

    const isHardDelete = params.hardDelete === true;

    const organizationTag = isHardDelete
      ? await this.repositories.organizationTagRepository.hardDeleteOrganizationTag(validatedParams)
      : await this.repositories.organizationTagRepository.softDeleteOrganizationTag(
          validatedParams
        );

    const oldValues = {
      id: organizationTag.id,
      organizationId: organizationTag.organizationId,
      tagId: organizationTag.tagId,
      createdAt: organizationTag.createdAt,
      updatedAt: organizationTag.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: organizationTag.deletedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_organization_tag_mutation',
      };
      await this.logHardDelete(organizationTag.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_organization_tag_mutation',
      };
      await this.logSoftDelete(organizationTag.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationTagSchema),
      organizationTag,
      'removeOrganizationTag method'
    );
  }
}
