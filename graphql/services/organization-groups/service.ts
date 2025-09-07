import {
  AddOrganizationGroupInput,
  OrganizationGroup,
  RemoveOrganizationGroupInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { organizationGroupsAuditLogs } from '@/graphql/repositories/organization-groups/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  SelectedFields,
  DeleteParams,
} from '../common';

import {
  getOrganizationGroupsParamsSchema,
  removeOrganizationGroupInputSchema,
  organizationGroupSchema,
  addOrganizationGroupInputSchema,
} from './schemas';

export class OrganizationGroupService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(organizationGroupsAuditLogs, 'organizationGroupId', user, db);
  }

  private async organizationExists(
    organizationId: string,
    transaction?: Transaction
  ): Promise<void> {
    const organizations = await this.repositories.organizationRepository.getOrganizations(
      { ids: [organizationId], limit: 1 },
      transaction
    );

    if (organizations.organizations.length === 0) {
      throw new Error('Organization not found');
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

  private async organizationHasGroup(
    organizationId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.organizationExists(organizationId, transaction);
    await this.groupExists(groupId, transaction);
    const existingOrganizationGroups =
      await this.repositories.organizationGroupRepository.getOrganizationGroups(
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
      throw new Error('Organization ID is required');
    }
    await this.organizationExists(organizationId, transaction);

    const result = await this.repositories.organizationGroupRepository.getOrganizationGroups(
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
      throw new Error('Organization already has this group');
    }

    const result = await this.repositories.organizationGroupRepository.addOrganizationGroup(
      organizationId,
      groupId,
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

    await this.logCreate(result.id, newValues, metadata, transaction);

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
      throw new Error('Organization does not have this group');
    }

    const isHardDelete = hardDelete === true;

    const result = isHardDelete
      ? await this.repositories.organizationGroupRepository.hardDeleteOrganizationGroup(
          organizationId,
          groupId,
          transaction
        )
      : await this.repositories.organizationGroupRepository.softDeleteOrganizationGroup(
          organizationId,
          groupId,
          transaction
        );

    if (!result) {
      throw new Error('Failed to remove organization group');
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
      await this.logHardDelete(result.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(result.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(organizationGroupSchema), result, context);
  }
}
