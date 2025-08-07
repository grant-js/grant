import { addOrganizationRole } from '@/graphql/providers/organization-roles/faker/addOrganizationRole';
import { getOrganizationRoles } from '@/graphql/providers/organization-roles/faker/getOrganizationRoles';
import { removeOrganizationRole } from '@/graphql/providers/organization-roles/faker/removeOrganizationRole';
import { OrganizationRoleDataProvider } from '@/graphql/providers/organization-roles/types';

export const organizationRoleFakerProvider: OrganizationRoleDataProvider = {
  getOrganizationRoles,
  addOrganizationRole,
  removeOrganizationRole,
};
