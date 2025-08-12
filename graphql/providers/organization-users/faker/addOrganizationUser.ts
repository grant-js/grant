import { MutationAddOrganizationUserArgs, OrganizationUser } from '@/graphql/generated/types';
import { addOrganizationUser as addOrganizationUserInStore } from '@/graphql/providers/organization-users/faker/dataStore';
export async function addOrganizationUser({
  input,
}: MutationAddOrganizationUserArgs): Promise<OrganizationUser> {
  const organizationUserData = addOrganizationUserInStore(input.organizationId, input.userId);
  return organizationUserData;
}
