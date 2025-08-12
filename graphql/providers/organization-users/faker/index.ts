import { addOrganizationUser } from '@/graphql/providers/organization-users/faker/addOrganizationUser';
import { getOrganizationUsers } from '@/graphql/providers/organization-users/faker/getOrganizationUsers';
import { removeOrganizationUser } from '@/graphql/providers/organization-users/faker/removeOrganizationUser';
import { OrganizationUserDataProvider } from '@/graphql/providers/organization-users/types';
export const organizationUserFakerProvider: OrganizationUserDataProvider = {
  getOrganizationUsers,
  addOrganizationUser,
  removeOrganizationUser,
};
