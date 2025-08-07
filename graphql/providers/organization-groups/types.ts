import {
  MutationAddOrganizationGroupArgs,
  MutationRemoveOrganizationGroupArgs,
  OrganizationGroup,
} from '@/graphql/generated/types';

export type GetOrganizationGroupsParams = { organizationId: string };
export type GetOrganizationGroupsResult = OrganizationGroup[];

export type AddOrganizationGroupParams = MutationAddOrganizationGroupArgs;
export type AddOrganizationGroupResult = OrganizationGroup;

export type RemoveOrganizationGroupParams = MutationRemoveOrganizationGroupArgs;
export type RemoveOrganizationGroupResult = boolean;

export interface OrganizationGroupDataProvider {
  getOrganizationGroups(params: GetOrganizationGroupsParams): Promise<GetOrganizationGroupsResult>;
  addOrganizationGroup(params: AddOrganizationGroupParams): Promise<AddOrganizationGroupResult>;
  removeOrganizationGroup(
    params: RemoveOrganizationGroupParams
  ): Promise<RemoveOrganizationGroupResult>;
}
