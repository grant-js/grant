import {
  QueryOrganizationsArgs,
  MutationUpdateOrganizationArgs,
  MutationDeleteOrganizationArgs,
  Organization,
  OrganizationPage,
  OrganizationProject,
  OrganizationRole,
  OrganizationGroup,
  OrganizationPermission,
  OrganizationUser,
  OrganizationTag,
  CreateOrganizationInput,
  OrganizationSearchableField,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  EntityRepository,
  RelationsConfig,
  BaseCreateArgs,
  BaseUpdateArgs,
  BaseDeleteArgs,
} from '@/graphql/repositories/common';
import { SelectedFields } from '@/graphql/services/common';
import { slugifySafe } from '@/lib/slugify';

import { organizationGroups } from '../organization-groups/schema';
import { organizationPermissions } from '../organization-permissions/schema';
import { organizationProjects } from '../organization-projects/schema';
import { organizationRoles } from '../organization-roles/schema';
import { organizationTags } from '../organization-tags/schema';
import { organizationUsers } from '../organization-users/schema';

import { OrganizationModel, organizations } from './schema';

export class OrganizationRepository extends EntityRepository<OrganizationModel, Organization> {
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
    params: QueryOrganizationsArgs & SelectedFields<OrganizationModel>,
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
    params: CreateOrganizationInput,
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
      },
    };

    return this.update(baseParams, transaction);
  }

  public async softDeleteOrganization(
    params: MutationDeleteOrganizationArgs,
    transaction?: Transaction
  ): Promise<Organization> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams, transaction);
  }

  public async hardDeleteOrganization(
    params: MutationDeleteOrganizationArgs,
    transaction?: Transaction
  ): Promise<Organization> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams, transaction);
  }
}
