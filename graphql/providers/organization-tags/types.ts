import {
  MutationAddOrganizationTagArgs,
  MutationRemoveOrganizationTagArgs,
  OrganizationTag,
  QueryOrganizationTagsArgs,
} from '@/graphql/generated/types';

export interface OrganizationTagDataProvider {
  getOrganizationTags(params: QueryOrganizationTagsArgs): Promise<OrganizationTag[]>;
  addOrganizationTag(params: MutationAddOrganizationTagArgs): Promise<OrganizationTag>;
  removeOrganizationTag(params: MutationRemoveOrganizationTagArgs): Promise<OrganizationTag>;
}
