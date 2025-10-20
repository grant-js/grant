import { DbSchema } from '@logusgraphics/grant-database';
import { organizationGroupsAuditLogs } from '@logusgraphics/grant-database';
import {
  AddOrganizationGroupInput,
  OrganizationGroup,
  RemoveOrganizationGroupInput,
} from '@logusgraphics/grant-schema';

import { BadRequestError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  SelectedFields,
  DeleteParams,
} from './common';
import {
  getOrganizationGroupsParamsSchema,
  removeOrganizationGroupInputSchema,
  organizationGroupSchema,
  addOrganizationGroupInputSchema,
} from './organization-groups.schemas';

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
      throw new NotFoundError('Organization not found', 'errors:notFound.organization');
    }
  }

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.repositories.groupRepository.getGroups(
      { ids: [groupId], limit: 1 },
      transaction
    );

    if (groups.groups.length === 0) {
      throw new NotFoundError('Group not found', 'errors:notFound.group');
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
      throw new ValidationError('Organization ID is required', [], 'errors:validation.required', {
        field: 'organizationId',
      });
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
      throw new ConflictError(
        'Organization already has this group',
        'errors:conflict.duplicateEntry',
        { resource: 'OrganizationGroup', field: 'groupId' }
      );
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
      throw new NotFoundError('Organization does not have this group', 'errors:notFound.group');
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
      throw new BadRequestError('Failed to remove organization group', 'errors:common.badRequest');
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
