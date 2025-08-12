import { MutationCreatePermissionArgs, Permission } from '@/graphql/generated/types';
import { createPermission as createPermissionInStore } from '@/graphql/providers/permissions/faker/dataStore';
export async function createPermission({
  input,
}: MutationCreatePermissionArgs): Promise<Permission> {
  return createPermissionInStore(input);
}
