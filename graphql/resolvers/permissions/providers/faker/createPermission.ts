import { CreatePermissionParams, CreatePermissionResult } from '../types';
import { createPermission as createPermissionInStore } from './dataStore';

export async function createPermission({
  input,
}: CreatePermissionParams): Promise<CreatePermissionResult> {
  return createPermissionInStore(input);
}
