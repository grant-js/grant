import { MutationDeleteOrganizationArgs, Organization } from '@/graphql/generated/types';
import { deleteOrganization as deleteOrganizationInStore } from '@/graphql/providers/organizations/faker/dataStore';
export async function deleteOrganization({
  id,
}: MutationDeleteOrganizationArgs): Promise<Organization> {
  const organizationData = deleteOrganizationInStore(id);
  if (!organizationData) {
    throw new Error('Organization not found');
  }
  return organizationData;
}
