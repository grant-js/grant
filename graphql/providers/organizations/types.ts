import {
  QueryOrganizationsArgs,
  MutationCreateOrganizationArgs,
  MutationUpdateOrganizationArgs,
  MutationDeleteOrganizationArgs,
  Organization,
  OrganizationPage,
} from '@/graphql/generated/types';

// Type for organization data without the resolved fields
export type OrganizationData = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type GetOrganizationsParams = QueryOrganizationsArgs;
export type GetOrganizationsResult = OrganizationPage;

export type CreateOrganizationParams = MutationCreateOrganizationArgs;
export type CreateOrganizationResult = Organization;

export type UpdateOrganizationParams = MutationUpdateOrganizationArgs;
export type UpdateOrganizationResult = Organization;

export type DeleteOrganizationParams = MutationDeleteOrganizationArgs;
export type DeleteOrganizationResult = boolean;

export interface OrganizationDataProvider {
  getOrganizations(params: GetOrganizationsParams): Promise<GetOrganizationsResult>;
  createOrganization(params: CreateOrganizationParams): Promise<CreateOrganizationResult>;
  updateOrganization(params: UpdateOrganizationParams): Promise<UpdateOrganizationResult>;
  deleteOrganization(params: DeleteOrganizationParams): Promise<DeleteOrganizationResult>;
}
