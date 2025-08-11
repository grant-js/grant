import {
  MutationAddOrganizationProjectArgs,
  MutationRemoveOrganizationProjectArgs,
  OrganizationProject,
  QueryOrganizationProjectsArgs,
} from '@/graphql/generated/types';

export interface OrganizationProjectDataProvider {
  getOrganizationProjects(params: QueryOrganizationProjectsArgs): Promise<OrganizationProject[]>;
  addOrganizationProject(params: MutationAddOrganizationProjectArgs): Promise<OrganizationProject>;
  removeOrganizationProject(
    params: MutationRemoveOrganizationProjectArgs
  ): Promise<OrganizationProject>;
}
