import { MutationRemoveOrganizationUserArgs } from '@/graphql/generated/types';
import { deleteOrganizationUserByOrganizationAndUser } from '@/graphql/providers/organization-users/faker/dataStore';

export async function removeOrganizationUser({
  input,
}: MutationRemoveOrganizationUserArgs): Promise<boolean> {
  const deletedOrganizationUser = deleteOrganizationUserByOrganizationAndUser(
    input.organizationId,
    input.userId
  );
  return deletedOrganizationUser !== null;
}
