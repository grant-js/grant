import {
  MutationAddOrganizationGroupArgs,
  MutationRemoveOrganizationGroupArgs,
  OrganizationGroup,
  QueryOrganizationGroupsArgs,
} from '@/graphql/generated/types';
import {
  IOrganizationGroupRepository,
  IOrganizationRepository,
  IGroupRepository,
} from '@/graphql/repositories';
import { organizationGroupsAuditLogs } from '@/graphql/repositories/organization-groups/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IOrganizationGroupService } from './interface';
import {
  getOrganizationGroupsParamsSchema,
  addOrganizationGroupParamsSchema,
  removeOrganizationGroupParamsSchema,
  organizationGroupSchema,
} from './schemas';

export class OrganizationGroupService extends AuditService implements IOrganizationGroupService {
  constructor(
    private readonly organizationGroupRepository: IOrganizationGroupRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly groupRepository: IGroupRepository,
    user: AuthenticatedUser | null
  ) {
    super(organizationGroupsAuditLogs, 'organizationGroupId', user);
  }

  private async organizationExists(organizationId: string): Promise<void> {
    const organizations = await this.organizationRepository.getOrganizations({
      ids: [organizationId],
      limit: 1,
    });

    if (organizations.organizations.length === 0) {
      throw new Error('Organization not found');
    }
  }

  private async groupExists(groupId: string): Promise<void> {
    const groups = await this.groupRepository.getGroups({
      ids: [groupId],
      limit: 1,
    });

    if (groups.groups.length === 0) {
      throw new Error('Group not found');
    }
  }

  private async organizationHasGroup(organizationId: string, groupId: string): Promise<boolean> {
    await this.organizationExists(organizationId);
    await this.groupExists(groupId);
    const existingOrganizationGroups = await this.organizationGroupRepository.getOrganizationGroups(
      {
        organizationId,
      }
    );

    return existingOrganizationGroups.some((og) => og.groupId === groupId);
  }

  public async getOrganizationGroups(
    params: Omit<QueryOrganizationGroupsArgs, 'scope'>
  ): Promise<OrganizationGroup[]> {
    const validatedParams = validateInput(
      getOrganizationGroupsParamsSchema,
      params,
      'getOrganizationGroups method'
    );

    if (!validatedParams.organizationId) {
      throw new Error('Organization ID is required');
    }
    await this.organizationExists(validatedParams.organizationId);

    const result = await this.organizationGroupRepository.getOrganizationGroups(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(organizationGroupSchema).array(),
      result,
      'getOrganizationGroups method'
    );
  }

  public async addOrganizationGroup(
    params: MutationAddOrganizationGroupArgs
  ): Promise<OrganizationGroup> {
    const validatedParams = validateInput(
      addOrganizationGroupParamsSchema,
      params,
      'addOrganizationGroup method'
    );

    const hasGroup = await this.organizationHasGroup(
      validatedParams.input.organizationId,
      validatedParams.input.groupId
    );

    if (hasGroup) {
      throw new Error('Organization already has this group');
    }

    const result = await this.organizationGroupRepository.addOrganizationGroup(
      validatedParams.input.organizationId,
      validatedParams.input.groupId
    );

    const newValues = {
      id: result.id,
      organizationId: result.organizationId,
      groupId: result.groupId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    const metadata = {
      source: 'add_organization_group_mutation',
    };

    await this.logCreate(result.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(organizationGroupSchema),
      result,
      'addOrganizationGroup method'
    );
  }

  public async removeOrganizationGroup(
    params: MutationRemoveOrganizationGroupArgs & { hardDelete?: boolean }
  ): Promise<OrganizationGroup> {
    const validatedParams = validateInput(
      removeOrganizationGroupParamsSchema,
      params,
      'removeOrganizationGroup method'
    );

    const hasGroup = await this.organizationHasGroup(
      validatedParams.input.organizationId,
      validatedParams.input.groupId
    );

    if (!hasGroup) {
      throw new Error('Organization does not have this group');
    }

    const isHardDelete = params.hardDelete === true;

    const result = isHardDelete
      ? await this.organizationGroupRepository.hardDeleteOrganizationGroup(
          validatedParams.input.organizationId,
          validatedParams.input.groupId
        )
      : await this.organizationGroupRepository.softDeleteOrganizationGroup(
          validatedParams.input.organizationId,
          validatedParams.input.groupId
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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_organization_group_mutation',
      };
      await this.logHardDelete(result.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_organization_group_mutation',
      };
      await this.logSoftDelete(result.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(organizationGroupSchema),
      result,
      'removeOrganizationGroup method'
    );
  }
}
