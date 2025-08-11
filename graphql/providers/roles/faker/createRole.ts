import { MutationCreateRoleArgs, Role } from '@/graphql/generated/types';
import { createRole as createRoleInStore } from '@/graphql/providers/roles/faker/dataStore';

export async function createRole({ input }: MutationCreateRoleArgs): Promise<Role> {
  return createRoleInStore(input);
}
