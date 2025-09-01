import {
  QueryOrganizationsArgs,
  MutationCreateOrganizationArgs,
  MutationUpdateOrganizationArgs,
  MutationDeleteOrganizationArgs,
  Organization,
  OrganizationPage,
} from '@/graphql/generated/types';
import {
  EntityRepository,
  BaseCreateArgs,
  BaseUpdateArgs,
  BaseDeleteArgs,
} from '@/graphql/repositories/common';

import { OrganizationModel, organizations } from './schema';

export class OrganizationRepository extends EntityRepository<OrganizationModel, Organization> {
  protected table = organizations;
  protected schemaName = 'organizations' as const;
  protected searchFields: Array<keyof OrganizationModel> = ['name', 'slug'];
  protected defaultSortField: keyof OrganizationModel = 'createdAt';

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  public async getOrganizations(
    params: Omit<QueryOrganizationsArgs, 'scope'> & {
      requestedFields?: Array<keyof OrganizationModel>;
    }
  ): Promise<OrganizationPage> {
    const result = await this.query(params);
    return {
      organizations: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createOrganization(params: MutationCreateOrganizationArgs): Promise<Organization> {
    const baseParams: BaseCreateArgs = {
      name: params.input.name,
      slug: this.generateSlug(params.input.name),
    };

    return this.create(baseParams);
  }

  public async updateOrganization(params: MutationUpdateOrganizationArgs): Promise<Organization> {
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        slug: params.input.name ? this.generateSlug(params.input.name) : undefined,
      },
    };

    return this.update(baseParams);
  }

  public async softDeleteOrganization(
    params: MutationDeleteOrganizationArgs
  ): Promise<Organization> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams);
  }

  public async hardDeleteOrganization(
    params: MutationDeleteOrganizationArgs
  ): Promise<Organization> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams);
  }
}
