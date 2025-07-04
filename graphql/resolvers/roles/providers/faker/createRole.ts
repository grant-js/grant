import { CreateRoleParams, CreateRoleResult } from '../types';
import { createRole as createRoleInStore } from './dataStore';

export async function createRole({ input }: CreateRoleParams): Promise<CreateRoleResult> {
  return createRoleInStore(input);
}
