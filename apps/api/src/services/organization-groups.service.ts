import {
  AddOrganizationGroupInput,
  OrganizationGroup,
  RemoveOrganizationGroupInput,
} from '@grantjs/schema';

import { BadRequestError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addOrganizationGroupInputSchema,
  getOrganizationGroupsParamsSchema,
  organizationGroupSchema,
  removeOrganizationGroupInputSchema,
} from './organization-groups.schemas';

import type {
  IAuditLogger,
  IGroupRepository,
  IOrganizationGroupRepository,
  IOrganizationGroupService,
  IOrganizationRepository,
} from '@grantjs/core';

export class OrganizationGroupService implements IOrganizationGroupService {
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly organizationGroupRepository: IOrganizationGroupRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async organizationExists(
    organizationId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizations = await this.organizationRepository.getOrganizations(
      { ids: [organizationId], limit: 1 },
      transaction
    );

    if (organizations.organizations.length === 0) {
      throw new NotFoundError('Organization');
    }
  }

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.groupRepository.getGroups({ ids: [groupId], limit: 1 }, transaction);

    if (groups.groups.length === 0) {
      throw new NotFoundError('Group');
    }
  }

  private async organizationHasGroup(
    organizationId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId, transaction);
    await this.groupExists(groupId, transaction);
    const existingOrganizationGroups = await this.organizationGroupRepository.getOrganizationGroups(
      { organizationId },
      transaction
    );

    return existingOrganizationGroups.some((og) => og.groupId === groupId);
  }

  public async getOrganizationGroups(
    params: { organizationId: string } & SelectedFields<OrganizationGroup>,
    transaction?: Transaction
  ): Promise<OrganizationGroup[]> {
    const context = 'OrganizationGroupService.getOrganizationGroups';
    const validatedParams = validateInput(getOrganizationGroupsParamsSchema, params, context);

    const { organizationId } = validatedParams;

    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }
    await this.organizationExists(organizationId, transaction);

    const result = await this.organizationGroupRepository.getOrganizationGroups(
      { organizationId },
      transaction
    );
    return validateOutput(
      createDynamicSingleSchema(organizationGroupSchema).array(),
      result,
      context
    );
  }

  public async addOrganizationGroup(
    params: AddOrganizationGroupInput,
    transaction?: Transaction
  ): Promise<OrganizationGroup> {
    const context = 'OrganizationGroupService.addOrganizationGroup';
    const validatedParams = validateInput(addOrganizationGroupInputSchema, params, context);
    const { organizationId, groupId } = validatedParams;

    const hasGroup = await this.organizationHasGroup(organizationId, groupId, transaction);

    if (hasGroup) {
      throw new ConflictError(
        'Organization already has this group',
        'OrganizationGroup',
        'groupId'
      );
    }

    const result = await this.organizationGroupRepository.addOrganizationGroup(
      { organizationId, groupId },
      transaction
    );

    const newValues = {
      id: result.id,
      organizationId: result.organizationId,
      groupId: result.groupId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(result.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(organizationGroupSchema), result, context);
  }

  public async removeOrganizationGroup(
    params: RemoveOrganizationGroupInput & DeleteParams,
    transaction?: Transaction
  ): Promise<OrganizationGroup> {
    const context = 'OrganizationGroupService.removeOrganizationGroup';
    const validatedParams = validateInput(removeOrganizationGroupInputSchema, params, context);

    const { organizationId, groupId, hardDelete } = validatedParams;

    const hasGroup = await this.organizationHasGroup(organizationId, groupId, transaction);

    if (!hasGroup) {
      throw new NotFoundError('Group');
    }

    const isHardDelete = hardDelete === true;

    const result = isHardDelete
      ? await this.organizationGroupRepository.hardDeleteOrganizationGroup(
          { organizationId, groupId },
          transaction
        )
      : await this.organizationGroupRepository.softDeleteOrganizationGroup(
          { organizationId, groupId },
          transaction
        );

    if (!result) {
      throw new BadRequestError('Failed to remove organization group');
    }

    const oldValues = {
      id: result.id,
      organizationId: result.organizationId,
      groupId: result.groupId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: result.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(result.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(result.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(organizationGroupSchema), result, context);
  }
}
