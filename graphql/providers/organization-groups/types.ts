import {
  MutationAddOrganizationGroupArgs,
  MutationRemoveOrganizationGroupArgs,
  OrganizationGroup,
  QueryOrganizationGroupsArgs,
} from '@/graphql/generated/types';

export interface OrganizationGroupDataProvider {
  getOrganizationGroups(params: QueryOrganizationGroupsArgs): Promise<OrganizationGroup[]>;
  addOrganizationGroup(params: MutationAddOrganizationGroupArgs): Promise<OrganizationGroup>;
  removeOrganizationGroup(params: MutationRemoveOrganizationGroupArgs): Promise<OrganizationGroup>;
}
