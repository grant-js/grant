import { MutationRemoveOrganizationUserArgs, OrganizationUser } from '@/graphql/generated/types';
import { deleteOrganizationUserByOrganizationAndUser } from '@/graphql/providers/organization-users/faker/dataStore';
export async function removeOrganizationUser({
  input,
}: MutationRemoveOrganizationUserArgs): Promise<OrganizationUser> {
  const deletedOrganizationUser = deleteOrganizationUserByOrganizationAndUser(
    input.organizationId,
    input.userId
  );
  if (!deletedOrganizationUser) {
    throw new Error('Organization user relationship not found');
  }
  return deletedOrganizationUser;
}
