import { addOrganizationTag } from '@/graphql/providers/organization-tags/faker/addOrganizationTag';
import { getOrganizationTags } from '@/graphql/providers/organization-tags/faker/getOrganizationTags';
import { removeOrganizationTag } from '@/graphql/providers/organization-tags/faker/removeOrganizationTag';
import { OrganizationTagDataProvider } from '@/graphql/providers/organization-tags/types';
export const organizationTagFakerProvider: OrganizationTagDataProvider = {
  getOrganizationTags,
  addOrganizationTag,
  removeOrganizationTag,
};
