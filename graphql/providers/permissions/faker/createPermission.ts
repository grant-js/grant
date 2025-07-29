import { createPermission as createPermissionInStore } from '@/graphql/providers/permissions/faker/dataStore';
import {
  CreatePermissionParams,
  CreatePermissionResult,
} from '@/graphql/providers/permissions/types';

export async function createPermission({
  input,
}: CreatePermissionParams): Promise<CreatePermissionResult> {
  return createPermissionInStore(input);
}
