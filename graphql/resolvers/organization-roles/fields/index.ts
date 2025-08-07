import { organizationRoleOrganizationResolver } from './organization';
import { organizationRoleRoleResolver } from './role';

export const OrganizationRole = {
  organization: organizationRoleOrganizationResolver,
  role: organizationRoleRoleResolver,
};
