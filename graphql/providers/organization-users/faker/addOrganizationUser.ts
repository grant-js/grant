import { OrganizationUser } from '@/graphql/generated/types';
import { addOrganizationUser as addOrganizationUserInStore } from '@/graphql/providers/organization-users/faker/dataStore';

import { AddOrganizationUserParams, AddOrganizationUserResult } from '../types';

export async function addOrganizationUser({
  input,
}: AddOrganizationUserParams): Promise<AddOrganizationUserResult> {
  const organizationUserData = addOrganizationUserInStore(input.organizationId, input.userId);
  return organizationUserData as OrganizationUser; // Convert OrganizationUserData to OrganizationUser for GraphQL
}
