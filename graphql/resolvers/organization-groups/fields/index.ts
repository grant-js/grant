import { organizationGroupGroupResolver } from './group';
import { organizationGroupOrganizationResolver } from './organization';

export const OrganizationGroup = {
  organization: organizationGroupOrganizationResolver,
  group: organizationGroupGroupResolver,
};
