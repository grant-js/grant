import { organizationTagOrganizationResolver } from './organization';
import { organizationTagTagResolver } from './tag';

export const OrganizationTag = {
  organization: organizationTagOrganizationResolver,
  tag: organizationTagTagResolver,
};
