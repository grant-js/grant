import type { IOrganizationRepository } from '@grantjs/core';
import {
  organizationGroups,
  OrganizationModel,
  organizationPermissions,
  organizationProjects,
  organizationRoles,
  organizations,
  organizationTags,
  organizationUsers,
} from '@grantjs/database';
import {
  CreateOrganizationInput,
  MutationDeleteOrganizationArgs,
  MutationUpdateOrganizationArgs,
  Organization,
  OrganizationGroup,
  OrganizationPage,
  OrganizationPermission,
  OrganizationProject,
  OrganizationRole,
  OrganizationSearchableField,
  OrganizationTag,
  OrganizationUser,
  QueryOrganizationsArgs,
} from '@grantjs/schema';

import { slugifySafe } from '@/lib/slugify.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import {
  BaseCreateArgs,
  BaseDeleteArgs,
  BaseUpdateArgs,
  EntityRepository,
  RelationsConfig,
} from '@/repositories/common';
import { SelectedFields } from '@/types';

export class OrganizationRepository
  extends EntityRepository<OrganizationModel, Organization>
  implements IOrganizationRepository
{
  protected table = organizations;
  protected schemaName = 'organizations' as const;
  protected searchFields: Array<keyof OrganizationModel> = Object.values(
    OrganizationSearchableField
  );
  protected defaultSortField: keyof OrganizationModel = 'createdAt';
  protected relations: RelationsConfig<Organization> = {
    projects: {
      field: 'project',
      table: organizationProjects,
      extract: (v: OrganizationProject[]) => v.map(({ project }) => project),
    },
    roles: {
      field: 'role',
      table: organizationRoles,
      extract: (v: OrganizationRole[]) => v.map(({ role }) => role),
    },
    groups: {
      field: 'group',
      table: organizationGroups,
      extract: (v: OrganizationGroup[]) => v.map(({ group }) => group),
    },
    permissions: {
      field: 'permission',
      table: organizationPermissions,
      extract: (v: OrganizationPermission[]) => v.map(({ permission }) => permission),
    },
    users: {
      field: 'user',
      table: organizationUsers,
      extract: (v: OrganizationUser[]) => v.map(({ user }) => user),
    },
    tags: {
      field: 'tag',
      table: organizationTags,
      extract: (v: OrganizationTag[]) => v.map(({ tag, isPrimary }) => ({ ...tag, isPrimary })),
    },
  };

  private generateSlug(name: string): string {
    return slugifySafe(name);
  }

  public async getOrganizations(
    params: Omit<QueryOrganizationsArgs, 'scope'> & SelectedFields<Organization>,
    transaction?: Transaction
  ): Promise<OrganizationPage> {
    const result = await this.query(params, transaction);
    return {
      organizations: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createOrganization(
    params: Omit<CreateOrganizationInput, 'scope'>,
    transaction?: Transaction
  ): Promise<Organization> {
    const baseParams: BaseCreateArgs = {
      name: params.name,
      slug: this.generateSlug(params.name),
    };

    return this.create(baseParams, transaction);
  }

  public async updateOrganization(
    params: MutationUpdateOrganizationArgs,
    transaction?: Transaction
  ): Promise<Organization> {
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        slug: params.input.name ? this.generateSlug(params.input.name) : undefined,
        requireMfaForSensitiveActions: params.input.requireMfaForSensitiveActions,
      },
    };

    return this.update(baseParams, transaction);
  }

  public async softDeleteOrganization(
    params: Omit<MutationDeleteOrganizationArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Organization> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams, transaction);
  }

  public async hardDeleteOrganization(
    params: Omit<MutationDeleteOrganizationArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Organization> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams, transaction);
  }
}
