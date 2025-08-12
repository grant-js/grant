import { MutationCreateOrganizationArgs, Organization } from '@/graphql/generated/types';
import { createOrganization as createOrganizationInStore } from '@/graphql/providers/organizations/faker/dataStore';
export async function createOrganization({
  input,
}: MutationCreateOrganizationArgs): Promise<Organization> {
  const organizationData = await createOrganizationInStore(input);
  return organizationData;
}
