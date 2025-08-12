import { addOrganizationGroup } from '@/graphql/providers/organization-groups/faker/addOrganizationGroup';
import { getOrganizationGroups } from '@/graphql/providers/organization-groups/faker/getOrganizationGroups';
import { removeOrganizationGroup } from '@/graphql/providers/organization-groups/faker/removeOrganizationGroup';
import { OrganizationGroupDataProvider } from '@/graphql/providers/organization-groups/types';
export const organizationGroupFakerProvider: OrganizationGroupDataProvider = {
  getOrganizationGroups,
  addOrganizationGroup,
  removeOrganizationGroup,
};
