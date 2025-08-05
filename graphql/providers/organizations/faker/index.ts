import { createOrganization } from '@/graphql/providers/organizations/faker/createOrganization';
import { deleteOrganization } from '@/graphql/providers/organizations/faker/deleteOrganization';
import { getOrganizations } from '@/graphql/providers/organizations/faker/getOrganizations';
import { updateOrganization } from '@/graphql/providers/organizations/faker/updateOrganization';
import { OrganizationDataProvider } from '@/graphql/providers/organizations/types';

export const organizationFakerProvider: OrganizationDataProvider = {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
};
