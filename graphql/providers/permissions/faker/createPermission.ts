import {
  CreatePermissionParams,
  CreatePermissionResult,
} from '@/graphql/providers/permissions/types';
import { createPermission as createPermissionInStore } from '@/graphql/providers/permissions/faker/dataStore';

export async function createPermission({
  input,
}: CreatePermissionParams): Promise<CreatePermissionResult> {
  return createPermissionInStore(input);
}
