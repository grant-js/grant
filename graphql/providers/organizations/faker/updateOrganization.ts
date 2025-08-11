import { MutationUpdateOrganizationArgs, Organization } from '@/graphql/generated/types';
import { updateOrganization as updateOrganizationInStore } from '@/graphql/providers/organizations/faker/dataStore';

export async function updateOrganization({
  id,
  input,
}: MutationUpdateOrganizationArgs): Promise<Organization> {
  const organizationData = updateOrganizationInStore(id, input);
  if (!organizationData) {
    throw new Error('Organization not found');
  }
  return organizationData;
}
