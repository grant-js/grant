import { organizationUserOrganizationResolver } from './organization';
import { organizationUserUserResolver } from './user';

export const OrganizationUser = {
  organization: organizationUserOrganizationResolver,
  user: organizationUserUserResolver,
};
