import { deleteOrganizationUserByOrganizationAndUser } from '@/graphql/providers/organization-users/faker/dataStore';

import { RemoveOrganizationUserParams, RemoveOrganizationUserResult } from '../types';

export async function removeOrganizationUser({
  input,
}: RemoveOrganizationUserParams): Promise<RemoveOrganizationUserResult> {
  const deletedOrganizationUser = deleteOrganizationUserByOrganizationAndUser(
    input.organizationId,
    input.userId
  );
  return deletedOrganizationUser !== null;
}
