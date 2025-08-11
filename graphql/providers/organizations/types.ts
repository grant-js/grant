import {
  QueryOrganizationsArgs,
  MutationCreateOrganizationArgs,
  MutationUpdateOrganizationArgs,
  MutationDeleteOrganizationArgs,
  Organization,
  OrganizationPage,
} from '@/graphql/generated/types';

export interface OrganizationDataProvider {
  getOrganizations(params: QueryOrganizationsArgs): Promise<OrganizationPage>;
  createOrganization(params: MutationCreateOrganizationArgs): Promise<Organization>;
  updateOrganization(params: MutationUpdateOrganizationArgs): Promise<Organization>;
  deleteOrganization(params: MutationDeleteOrganizationArgs): Promise<Organization>;
}
