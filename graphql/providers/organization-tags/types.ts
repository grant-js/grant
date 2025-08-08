import {
  MutationAddOrganizationTagArgs,
  MutationRemoveOrganizationTagArgs,
  OrganizationTag,
} from '@/graphql/generated/types';

export type GetOrganizationTagsParams = { organizationId: string };
export type GetOrganizationTagsResult = OrganizationTag[];

export type AddOrganizationTagParams = MutationAddOrganizationTagArgs;
export type AddOrganizationTagResult = OrganizationTag;

export type RemoveOrganizationTagParams = MutationRemoveOrganizationTagArgs;
export type RemoveOrganizationTagResult = boolean;

export interface OrganizationTagDataProvider {
  getOrganizationTags(params: GetOrganizationTagsParams): Promise<GetOrganizationTagsResult>;
  addOrganizationTag(params: AddOrganizationTagParams): Promise<AddOrganizationTagResult>;
  removeOrganizationTag(params: RemoveOrganizationTagParams): Promise<RemoveOrganizationTagResult>;
}
